import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelCompleteResult, ModelForkResult, Register } from 'claude-code'

import type { Answered, Call, Phase, Reply, Run } from '../types'
import { EMPTY_REPLY, focusAfter, hasAnswer, isSettled } from './answers'
import {
  MAX_ROUNDS,
  askPrompt,
  countWords,
  parseQuestions,
  parseRefined,
  recommended,
  redoPrompt,
  writePrompt,
} from './prompts'
import { loadTuning } from './tuning'
import type { Tuning } from './tuning'

const PANE = 'improve-prompt'
// The model used when the run does not read the session.
const ALONE_MODEL = 'sonnet'
const NO_CONVERSATION = 'No conversation yet, so this run works from your text alone.'
const STEPS = ['Your prompt', 'Questions', 'Rewrite', 'Review'] as const
const DOING: Record<Call, string> = {
  ask: 'Checking what would make this better',
  write: 'Writing your refined prompt',
  redo: 'Rewriting your refined prompt',
}

// Change the tag when Run's fields change: a value an earlier version stored
// is then read as no run at all.
const runState = atom({ plugin: 'improve-prompt', key: 'run' } as const, null as Run | null, {
  shape: 'run-4',
})
// Run ids never repeat, even after a close clears the run: a model call still
// out from a closed run must not match the next one.
const lastId = atom({ plugin: 'improve-prompt', key: 'lastId' } as const, 0)
// The permission mode the last prompt was sent in. Only `opusplan` needs it,
// to tell whether the session is on Opus (plan mode) or on Sonnet.
const permissionMode = atom({ plugin: 'improve-prompt', key: 'permissionMode' } as const, '')

type $ = EngineInterface
/** A change folded into the patch that starts a model call. */
type Prep = (run: Run) => Run
const same: Prep = run => run

function newRun(id: number, seed: string, useContext: boolean): Run {
  return {
    id,
    seed,
    useContext,
    phase: seed ? 'thinking' : 'seed',
    busy: 'ask',
    round: 0,
    questions: [],
    replies: [],
    answered: [],
    refined: '',
    added: [],
    tunedFor: '',
    tweaks: [],
    note: '',
    error: '',
    notice: '',
  }
}

/** Run `id`, or undefined once a newer run (or none) has replaced it. */
async function current($: $, id: number): Promise<Run | undefined> {
  const run = await read($, runState)
  return run?.id === id ? run : undefined
}

/** Changes run `id`, and nothing once a newer run (or none) has replaced it. */
async function patch($: $, id: number, fn: (run: Run) => Run): Promise<Run | undefined> {
  const run = await update($, runState, r => (r && r.id === id ? fn(r) : r))
  return run?.id === id ? run : undefined
}

// ----- model calls -----

type Answer = { isOk: true; text: string } | { isOk: false; error: string }

function whyNot(r: ModelCompleteResult | ModelForkResult): string {
  if (r.isAnswered) return ''
  switch (r.reason) {
    case 'api-error':
      return r.status
        ? `The model call failed (HTTP ${r.status}, ${r.error}).`
        : `The model call failed (${r.error}).`
    case 'empty-reply':
      return 'Claude replied with nothing.'
    case 'aborted':
      return 'The model call was cut short.'
    default:
      return `The model call did not answer (${r.reason}).`
  }
}

async function callModel($: $, run: Run, build: (run: Run, withContext: boolean) => string): Promise<Answer> {
  if (run.useContext) {
    const forked = await $.model.fork({ prompt: build(run, true) })
    if (forked.isAnswered) return { isOk: true, text: forked.text }
    if (forked.reason !== 'nothing-to-fork') return { isOk: false, error: whyNot(forked) }
    await patch($, run.id, r => ({ ...r, notice: NO_CONVERSATION }))
  }
  const done = await $.model.complete({
    model: ALONE_MODEL,
    prompt: build(run, false),
    maxTokens: 4000,
    timeoutMs: 180_000,
  })
  return done.isAnswered ? { isOk: true, text: done.text } : { isOk: false, error: whyNot(done) }
}

// ----- the flow -----

/**
 * Shows the thinking screen for `call`, after applying `prep`, if the run is
 * still in phase `from`. A second press before the redraw so starts nothing.
 */
async function begin($: $, id: number, call: Call, from: Phase, prep: Prep): Promise<Run | undefined> {
  let isStarted = false
  const run = await patch($, id, r => {
    isStarted = r.phase === from
    return isStarted ? { ...prep(r), phase: 'thinking', busy: call, error: '' } : r
  })
  return isStarted ? run : undefined
}

async function fail($: $, id: number, error: string): Promise<void> {
  await patch($, id, run => ({ ...run, phase: 'error', error }))
}

async function askRound($: $, id: number, from: Phase, prep: Prep = same): Promise<void> {
  const run = await begin($, id, 'ask', from, prep)
  if (!run) return
  const answer = await callModel($, run, askPrompt)
  if (!answer.isOk) return fail($, id, answer.error)
  const questions = parseQuestions(answer.text)
  if (!questions) return fail($, id, "Claude's questions came back in a form the mod couldn't read.")
  if (questions.length === 0) return rewrite($, id, 'write', 'thinking')
  await patch($, id, r => ({
    ...r,
    phase: 'asking',
    round: r.round + 1,
    questions,
    replies: questions.map(() => EMPTY_REPLY),
  }))
}

const BUILD = { write: writePrompt, redo: redoPrompt }

/** The Tuning for the session's model now, or none. Read at each write, so a `/model` switch counts. */
async function tuningNow($: $): Promise<Tuning | undefined> {
  return loadTuning($, (await read($, permissionMode)) === 'plan')
}

/** Writes the Refined prompt, or rewrites it from the Redo note. */
async function rewrite($: $, id: number, call: 'write' | 'redo', from: Phase, prep: Prep = same): Promise<void> {
  const run = await begin($, id, call, from, prep)
  if (!run) return
  const tuning = await tuningNow($)
  const answer = await callModel($, run, (r, withContext) => BUILD[call](r, withContext, tuning))
  if (!answer.isOk) return fail($, id, answer.error)
  const { refined, added, tweaks } = parseRefined(answer.text)
  if (!refined) return fail($, id, 'Claude replied with an empty prompt.')
  // Tweaks only count when a Model reference was sent to be applied.
  const kept = tuning ? tweaks : []
  await patch($, id, r => ({
    ...r,
    phase: 'result',
    refined,
    added,
    tunedFor: kept.length > 0 && tuning ? tuning.model : '',
    tweaks: kept,
    note: '',
  }))
}

/**
 * Settles the Round on screen: a question left as it was takes its Recommended
 * answer, and one left with no answer is skipped.
 */
function settle(run: Run): Run {
  const answered: Answered[] = run.questions.map((q, i) => {
    const reply = run.replies[i] ?? EMPTY_REPLY
    // An "Other" field typed in but not entered still counts.
    const typing = reply.isTyping ? reply.text.trim() : ''
    if (reply.isSkipped) return { question: q.text, kind: 'skipped', text: '' }
    if (typing) return { question: q.text, kind: 'typed', text: typing }
    if (reply.choice) return { question: q.text, kind: reply.isTyped ? 'typed' : 'picked', text: reply.choice }
    // Left as it was: the Recommended answer stands, unless an empty "Other" field is open.
    const standing = reply.isTyping ? undefined : recommended(q)
    return standing ? { question: q.text, kind: 'picked', text: standing } : { question: q.text, kind: 'skipped', text: '' }
  })
  return { ...run, answered: [...run.answered, ...answered], questions: [], replies: [] }
}

async function submitRound($: $, id: number, isLast: boolean): Promise<void> {
  const run = await current($, id)
  if (!run) return
  if (isLast || run.round >= MAX_ROUNDS) return rewrite($, id, 'write', 'asking', settle)
  return askRound($, id, 'asking', settle)
}

async function retry($: $, id: number): Promise<void> {
  const run = await current($, id)
  if (!run) return
  return run.busy === 'ask' ? askRound($, id, 'error') : rewrite($, id, run.busy, 'error')
}

async function beginWithSeed($: $, id: number, value: string): Promise<void> {
  const seed = value.trim()
  if (seed) return askRound($, id, 'seed', r => ({ ...r, seed }))
}

/**
 * Closes the pane and ends the run. The mod's own `ui.close` hook is skipped
 * for a close the mod makes, so the run is cleared here too.
 */
async function closePane($: $): Promise<void> {
  await $.ui.close({ id: PANE })
  await update($, runState, () => null)
}

/** Moves the pane's focus ring. A surface that cannot is no failure. */
async function focus($: $, key: string): Promise<void> {
  try {
    await $.ui.focus({ requestId: PANE, key })
  } catch {
    // The ring stays where it was.
  }
}

/**
 * Settles one question, then moves the focus to the next one with no answer,
 * or to Continue once every question has one.
 */
async function answer($: $, id: number, index: number, change: Partial<Reply>): Promise<void> {
  const run = await patch($, id, r => setReply(r, index, { ...EMPTY_REPLY, ...change }))
  if (run) await focus($, focusAfter(run, index))
}

async function openOther($: $, id: number, index: number): Promise<void> {
  const run = await patch($, id, r => setReply(r, index, { ...EMPTY_REPLY, isTyping: true }))
  if (run) await focus($, `answer-${index}`)
}

function setReply(run: Run, index: number, change: Partial<Reply>): Run {
  return {
    ...run,
    replies: run.replies.map((reply, i) => (i === index ? { ...reply, ...change } : reply)),
  }
}

async function usePrompt($: $, id: number, how: 'fill' | 'send'): Promise<void> {
  const run = await current($, id)
  if (!run?.refined) return
  const text = run.refined
  if (how === 'fill') {
    const filled = await $.prompt.fill({ text, mode: 'replace' })
    if (!filled.isFilled) {
      $.ui.toast("Couldn't reach the prompt box. The prompt is still in the pane.")
      return
    }
    await closePane($)
    return
  }
  await closePane($)
  await $.prompt.submit({ text, asUser: true })
}

async function copyPrompt($: $, id: number, surface: Parameters<$['ui']['copy']>[0]['surface']): Promise<void> {
  const run = await current($, id)
  if (!run?.refined) return
  const copied = await $.ui.copy({ text: run.refined, surface })
  $.ui.toast(copied.isCopied ? 'Refined prompt copied.' : "Couldn't copy it. The prompt is still in the pane.")
}

/** A button's work, with a failure shown as a toast rather than lost. */
function act(work: Promise<unknown>, $: $): void {
  work.catch((error: unknown) => {
    $.ui.toast(`improve-prompt: ${error instanceof Error ? error.message : String(error)}`)
  })
}

/** Where the run stands, for the step bar and the status in the corner. */
function progress(run: Run, answered: number): { step: number; status: string } {
  const isAsk = run.busy === 'ask'
  switch (run.phase) {
    case 'seed':
      return { step: 0, status: 'Start here' }
    case 'asking':
      return { step: 1, status: `${answered} of ${run.questions.length} answered` }
    case 'result':
      return { step: 3, status: 'Ready to use' }
    case 'error':
      return { step: isAsk ? 1 : 2, status: 'Stopped' }
    case 'thinking':
      return { step: isAsk ? 1 : 2, status: isAsk ? 'Reading your prompt' : 'Almost there' }
  }
}

// ----- registration -----

export const register: Register = (on, options) => {
  const useContextByDefault = options.useSessionContext !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'improve-prompt',
      description: 'Answer a few quick questions and get a better prompt',
      argumentHint: '[rough prompt or goal]',
      immediate: true,
    })
    return next(e)
  })

  // Remember the mode each prompt was sent in. The hook only watches.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    await update($, permissionMode, () => e.permission_mode ?? '')
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'improve-prompt' }, async ($, e) => {
    const seed = e.args.trim()
    const id = await update($, lastId, n => n + 1)
    await update($, runState, () => newRun(id, seed, useContextByDefault))
    const opened = await $.ui.open({ id: PANE, title: 'Improve prompt', focus: true, closeOnEscape: true })
    if (!opened.isPlaced) {
      // No call starts, so a pane drawn later would sit on "thinking": end the run.
      await update($, runState, run => (run?.id === id ? null : run))
      return { text: `The improve-prompt pane couldn't open: ${opened.reason}` }
    }
    if (seed) void askRound($, id, 'thinking')
    return {}
  })

  // Closing the pane by Esc or its mark ends the run (a button uses closePane).
  // A model call still out finds no run when it returns and is dropped.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, runState, () => null)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>Answer these questions in the terminal or the desktop app.</Text>
    }
    const run = await read($, runState)
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    if (!run) return <Text dimColor>Run /improve-prompt to start.</Text>
    const id = run.id
    const close = () => void closePane($)

    // ----- the parts every screen shares -----

    const answered = run.questions.filter((_, i) => hasAnswer(run, i)).length
    const { step, status } = progress(run, answered)

    const stepMark = (i: number) =>
      i < step ? (
        <Text key={`step-${i}`} color="success">✓ {STEPS[i]}</Text>
      ) : i === step ? (
        <Text key={`step-${i}`} color="warning" bold>
          ● {STEPS[i]}
        </Text>
      ) : (
        <Text key={`step-${i}`} dimColor>○ {STEPS[i]}</Text>
      )
    const stepLine = (i: number) =>
      i < step ? <Text key={`line-${i}`} color="success">──</Text> : <Text key={`line-${i}`} dimColor>──</Text>
    const top = (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>IMPROVE PROMPT</Text>
          <Text dimColor>{status}</Text>
        </Box>
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          {STEPS.flatMap((_, i) => (i === 0 ? [stepMark(0)] : [stepLine(i - 1), stepMark(i)]))}
        </Box>
      </Box>
    )
    const seedBox = (
      <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
        <Text dimColor>YOUR PROMPT</Text>
        <Text maxLines={4}>{run.seed}</Text>
      </Box>
    )
    const notice = run.notice ? <Text dimColor>{run.notice}</Text> : null
    const contextToggle = (
      <Button
        key="context"
        plain
        dimColor
        onPress={() => void patch($, id, r => ({ ...r, useContext: !r.useContext }))}
      >
        {run.useContext ? '[x]' : '[ ]'} Use session context (this run)
      </Button>
    )
    const cancel = <Button key="cancel" plain dimColor role="dismiss" label="Cancel" onPress={close} />

    // ----- the screens -----

    if (run.phase === 'seed') {
      return (
        <Box flexDirection="column" gap={1}>
          {top}
          <Text bold>What do you want Claude to do?</Text>
          <Input
            key="seed"
            autoFocus
            rows={3}
            placeholder="A rough prompt or just a goal"
            submitLabel="start"
            value={run.seed}
            onInput={value => void patch($, id, r => ({ ...r, seed: value }))}
            onSubmit={value => void beginWithSeed($, id, value)}
          />
          {contextToggle}
        </Box>
      )
    }

    if (run.phase === 'thinking') {
      const doing = run.busy === 'ask' && run.round > 0 ? 'Checking what is still open' : DOING[run.busy]
      return (
        <Box flexDirection="column" gap={1}>
          {top}
          {seedBox}
          {notice}
          <Box flexDirection="column">
            <Text bold>
              <Text color="warning">◆</Text> {doing}
            </Text>
            <Text dimColor>This usually takes a few seconds.</Text>
          </Box>
          {cancel}
        </Box>
      )
    }

    if (run.phase === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          {top}
          {seedBox}
          <Box flexDirection="column">
            <Text bold>
              <Text color="error">◆</Text> Something went wrong
            </Text>
            <Text>{run.error}</Text>
            <Text dimColor>Your answers so far are kept.</Text>
          </Box>
          <Box flexDirection="row" columnGap={3}>
            <Button key="retry" variant="primary" autoFocus label="Retry" onPress={() => void retry($, id)} />
            <Button key="close" plain dimColor role="dismiss" label="Close" onPress={close} />
          </Box>
          {contextToggle}
        </Box>
      )
    }

    if (run.phase === 'result') {
      const columns = e.props.bodyColumns
      const isWide = columns >= 90
      const before = countWords(run.seed)
      const after = countWords(run.refined)
      return (
        <Box flexDirection="column" gap={1}>
          {top}
          <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
            <Text dimColor>
              {before} {before === 1 ? 'word' : 'words'} →
            </Text>
            <Text color="warning" bold>
              {after} words
            </Text>
            {run.added.length > 0 && (
              <Text color="success">
                {run.added.length} {run.added.length === 1 ? 'detail' : 'details'} added
              </Text>
            )}
            {run.tweaks.length > 0 && (
              <Text color="success">
                {run.tweaks.length} model {run.tweaks.length === 1 ? 'tweak' : 'tweaks'}
              </Text>
            )}
          </Box>
          <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
            <Button
              key="send"
              variant="primary"
              autoFocus
              hotkey="r"
              label="▶ Run it"
              onPress={() => act(usePrompt($, id, 'send'), $)}
            />
            <Button key="fill" plain hotkey="e" label="Edit" onPress={() => act(usePrompt($, id, 'fill'), $)} />
            <Button key="copy" plain hotkey="c" label="Copy" onPress={press => act(copyPrompt($, id, press.surface), $)} />
            {cancel}
          </Box>
          {run.added.length > 0 && (
            <Box flexDirection="column">
              <Text dimColor>WHAT I ADDED</Text>
              {run.added.map((line, i) => (
                <Box key={`added-${i}`} flexDirection="row" columnGap={1}>
                  <Text color="success">+</Text>
                  <Text>{line}</Text>
                </Box>
              ))}
            </Box>
          )}
          {run.tweaks.length > 0 && (
            <Box flexDirection="column">
              <Text dimColor>TUNED FOR {run.tunedFor.toUpperCase()}</Text>
              {run.tweaks.map((line, i) => (
                <Box key={`tweak-${i}`} flexDirection="row" columnGap={1}>
                  <Text color="success">~</Text>
                  <Text>{line}</Text>
                </Box>
              ))}
            </Box>
          )}
          {notice}
          <Box
            flexDirection={isWide ? 'row' : 'column'}
            columnGap={1}
            alignItems={isWide ? 'flex-start' : undefined}
          >
            <Box
              flexDirection="column"
              borderStyle="round"
              borderDimColor
              paddingX={1}
              width={isWide ? Math.floor(columns * 0.36) : undefined}
            >
              <Text dimColor>YOUR PROMPT</Text>
              <Text>{run.seed}</Text>
            </Box>
            <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1} flexGrow={1}>
              <Text color="warning" bold>
                ✦ REFINED
              </Text>
              <Text>{run.refined}</Text>
            </Box>
          </Box>
          <Input
            key="note"
            label="Change:"
            placeholder="What should change? Enter rewrites it"
            submitLabel="redo"
            value={run.note}
            onInput={value => void patch($, id, r => ({ ...r, note: value }))}
            onSubmit={value => void rewrite($, id, 'redo', 'result', r => ({ ...r, note: value }))}
          />
        </Box>
      )
    }

    // asking
    const isLastRound = run.round >= MAX_ROUNDS
    const isAllAnswered = answered === run.questions.length
    const rule = <Text dimColor>{'─'.repeat(Math.max(10, Math.min(e.props.bodyColumns - 2, 100)))}</Text>
    return (
      <Box flexDirection="column" gap={1}>
        {top}
        {seedBox}
        {notice}
        <Box flexDirection="column">
          <Text color="warning" bold>
            Round {run.round} of up to {MAX_ROUNDS}
            {isLastRound && <Text dimColor> · last round, then the prompt is written</Text>}
          </Text>
          <Box flexDirection="row" justifyContent="space-between">
            <Text dimColor bold>
              A FEW QUICK QUESTIONS
            </Text>
            <Text dimColor>recommended answers start picked</Text>
          </Box>
          {rule}
        </Box>
        {run.questions.map((question, i) => {
          const reply = run.replies[i] ?? EMPTY_REPLY
          const reopen = () => void patch($, id, r => setReply(r, i, EMPTY_REPLY))
          return (
            <Box key={`question-${i}`} flexDirection="column" gap={0}>
              <Box flexDirection="row" columnGap={1}>
                {hasAnswer(run, i) ? (
                  <Text backgroundColor="success" color="inverseText" bold>
                    {' ✓ '}
                  </Text>
                ) : (
                  <Text backgroundColor="warning" color="inverseText" bold>
                    {` ${i + 1} `}
                  </Text>
                )}
                <Text bold>{question.text}</Text>
              </Box>
              {isSettled(reply) ? (
                <Box flexDirection="row" columnGap={3} paddingLeft={5}>
                  {reply.isSkipped ? (
                    <Text dimColor italic>
                      Skipped
                    </Text>
                  ) : (
                    <Text color="success">→ {reply.choice}</Text>
                  )}
                  <Button key={`change-${i}`} plain dimColor label="change" onPress={reopen} />
                </Box>
              ) : reply.isTyping ? (
                <Box flexDirection="column" paddingLeft={5}>
                  <Input
                    key={`answer-${i}`}
                    label="›"
                    autoFocus
                    placeholder="Type your answer, then Enter"
                    submitLabel="use"
                    value={reply.text}
                    onInput={value => void patch($, id, r => setReply(r, i, { text: value }))}
                    onSubmit={value =>
                      value.trim() ? void answer($, id, i, { choice: value.trim(), isTyped: true }) : reopen()
                    }
                  />
                  <Button key={`back-${i}`} plain dimColor label="back to the options" onPress={reopen} />
                </Box>
              ) : (
                <Box flexDirection="column" alignItems="flex-start" paddingLeft={5} paddingTop={0}>
                  {question.options.map((option, j) => (
                    <Button
                      key={`pick-${i}-${j}`}
                      plain
                      autoFocus={i === 0 && j === 0 ? true : undefined}
                      // Unsettled, so the Recommended answer (the first) stands as picked.
                      label={j === 0 ? `●  ${option}  · recommended` : `○  ${option}`}
                      onPress={() => void answer($, id, i, { choice: option })}
                    />
                  ))}
                  <Button key={`other-${i}`} plain label="✎  Other (type it)" onPress={() => void openOther($, id, i)} />
                  <Button key={`skip-${i}`} plain dimColor label="–  Skip" onPress={() => void answer($, id, i, { isSkipped: true })} />
                </Box>
              )}
            </Box>
          )
        })}
        {rule}
        <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
          {isAllAnswered && (
            <Button
              key="next"
              variant="primary"
              label={isLastRound ? 'Write it now' : 'Continue'}
              onPress={() => void submitRound($, id, false)}
            />
          )}
          {!(isAllAnswered && isLastRound) && (
            <Button
              key="write-now"
              variant={isAllAnswered ? undefined : 'primary'}
              label="Write it now"
              onPress={() => void submitRound($, id, true)}
            />
          )}
          {cancel}
        </Box>
        {contextToggle}
      </Box>
    )
  })
}
