import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { ModelCompleteResult, ModelForkResult, On } from 'claude-code'

const USAGE = {
  input_tokens: 1,
  output_tokens: 1,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}

const PANE = {
  plugin: 'improve-prompt',
  component: 'Pane',
  requestId: 'improve-prompt',
  props: {
    title: 'Improve prompt',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const ROUND_ONE = JSON.stringify({
  done: false,
  questions: [
    { question: 'Where should the toggle live, the settings page?', options: ['In settings', 'In the header'] },
    { question: 'Which theme should it start in?', options: ['Follow the system', 'Light', 'Dark'] },
  ],
})
const DONE = JSON.stringify({ done: true })
const REFINED = 'Add a dark mode toggle to the settings page. Follow the system theme by default.'
const WRITTEN = `${REFINED}\n===ADDED===\n- Put the toggle in settings\n- Follow the system theme`

const answered = (text: string): ModelCompleteResult => ({ isAnswered: true, text, usage: USAGE })

/** Runs `/improve-prompt <args>` as the person typing it would. */
function run($: Engine, args: string) {
  return $.command.run({
    command: 'improve-prompt',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
}

/**
 * Stands in for the engine: answers the mod's calls on `$` and records the
 * prompts each model call was sent and what reached the prompt box.
 */
type Setup = {
  /** The session's model, as `$.session.model()` answers. Not one with a reference by default. */
  model?: string
  /** False makes every read of a reference doc fail. */
  docs?: boolean
}

function engine(
  on: On,
  replies: { fork?: (ModelForkResult | Promise<ModelForkResult>)[]; complete?: ModelCompleteResult[] },
  setup: Setup = {},
) {
  const seen = { model: setup.model ?? 'claude-opus-4-6', reads: [] as string[], fork: [] as string[], complete: [] as { model: string; prompt: string }[], filled: [] as string[], submitted: [] as string[], copied: [] as string[], closed: 0 }
  on('command.register', () => ({ value: { command: 'improve-prompt' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.focus', () => ({}))
  on('ui.close', () => {
    seen.closed += 1
    return { value: undefined }
  })
  on('ui.copy', (_, e) => {
    seen.copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('session.model', () => ({ value: seen.model }))
  // Each reference doc answers with its own file name, so a prompt shows which were read.
  on('fs.read', (_, e) => {
    seen.reads.push(e.path)
    if (setup.docs === false) throw new Error('no such file')
    return { value: `RULES-FROM-${e.path.split('/').pop()}` }
  })
  on('model.fork', async (_, e) => {
    seen.fork.push(e.prompt)
    return { value: await (replies.fork?.shift() ?? answered(DONE)) }
  })
  on('model.complete', (_, e) => {
    seen.complete.push({ model: e.model, prompt: e.prompt })
    return { value: replies.complete?.shift() ?? answered(DONE) }
  })
  on('prompt.fill', (_, e) => {
    seen.filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  on('prompt.submit', (_, e) => {
    seen.submitted.push(e.text)
    return { text: e.text }
  })
  return seen
}

type Surface = 'terminal' | 'desktop'

/** Starts a session, runs the command and mounts the pane. */
async function start(
  $: Engine,
  on: On,
  replies: Parameters<typeof engine>[1],
  { surface = 'terminal', seed = 'add dark mode', ...setup }: { surface?: Surface; seed?: string } & Setup = {},
) {
  const seen = engine(on, replies, setup)
  await $.session.start({ cwd: '/', surface, isInteractive: true })
  await run($, seed)
  const ui = await $.ui.mount({ ...PANE, surface })
  return { seen, ui }
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`seed, a round, the refined prompt, then the prompt box (${surface})`, async ($, on) => {
    const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(DONE), answered(WRITTEN)] }, { surface })

    expect(await ui.find({ type: 'Text', text: /A FEW QUICK QUESTIONS/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Round 1 of up to 3/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /of 2 answered/ }))?.text).toContain('2 of 2')
    expect(await ui.find({ type: 'Text', text: /settings page/ })).toBeDefined()
    expect(seen.fork[0]).toContain('add dark mode')

    // The first answer is typed under "Other", the second picked.
    await ui.press({ key: 'other-0' })
    // An empty "Other" field takes away the Recommended answer.
    expect((await ui.find({ type: 'Text', text: /of 2 answered/ }))?.text).toContain('1 of 2')
    await ui.input({ key: 'answer-0', text: 'In the sidebar.' })
    await ui.press({ key: 'pick-1-0' })
    expect((await ui.find({ type: 'Text', text: /of 2 answered/ }))?.text).toContain('2 of 2')
    await ui.press({ key: 'next' })

    expect(seen.fork[1]).toContain('Answer: In the sidebar.')
    expect(seen.fork[1]).toContain('Answer: Follow the system')
    expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2 details added/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Put the toggle in settings/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /===ADDED===/ })).toBeUndefined()

    await ui.press({ key: 'copy' })
    expect(seen.copied).toEqual([REFINED])

    await ui.press({ key: 'fill' })
    expect(seen.filled).toEqual([REFINED])
    expect(seen.closed).toBe(1)
    expect(seen.complete).toEqual([])
    await ui.unmount()
  })

  test(`"Write it now" ends the rounds early (${surface})`, async ($, on) => {
    const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] }, { surface })

    await ui.press({ key: 'write-now' })
    expect(seen.fork.length).toBe(2)
    expect(seen.fork[1]).toContain('Write the refined prompt')

    await ui.press({ key: 'send' })
    expect(seen.submitted).toEqual([REFINED])
    expect(seen.filled).toEqual([])
    await ui.unmount()
  })

  test(`Skip leaves a question out (${surface})`, async ($, on) => {
    const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] }, { surface })

    await ui.press({ key: 'skip-1' })
    expect(await ui.find({ type: 'Text', text: /^Skipped$/ })).toBeDefined()
    await ui.press({ key: 'write-now' })
    expect(seen.fork[1]).toContain('Skipped: leave this out of the prompt.')
    await ui.unmount()
  })

  test(`a failed call keeps the answers and Retry tries again (${surface})`, async ($, on) => {
    const failed: ModelForkResult = { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: USAGE } as ModelForkResult
    const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), failed, answered(WRITTEN)] }, { surface })

    await ui.press({ key: 'other-0' })
    await ui.input({ key: 'answer-0', text: 'In the header.', kind: 'change' })
    await ui.press({ key: 'write-now' })
    expect(await ui.find({ type: 'Text', text: /Something went wrong/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /529/ })).toBeDefined()

    await ui.press({ key: 'retry' })
    expect(seen.fork.length).toBe(3)
    expect(seen.fork[2]).toContain('In the header.')
    expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
    await ui.unmount()
  })
}

test('with session context off it uses Sonnet and never the session', { options: { useSessionContext: false } }, async ($, on) => {
  const { seen, ui } = await start($, on, { complete: [answered(ROUND_ONE), answered(WRITTEN)] })

  expect((await ui.find({ key: 'context' }))?.text).toContain('[ ] Use session context')
  await ui.press({ key: 'write-now' })
  expect(seen.fork).toEqual([])
  expect(seen.complete.map(c => c.model)).toEqual(['sonnet', 'sonnet'])
  expect(seen.complete[0]?.prompt).toContain('add dark mode')
  await ui.unmount()
})

test('with no conversation yet it falls back to Sonnet and says so', async ($, on) => {
  const nothing: ModelForkResult = { isAnswered: false, reason: 'nothing-to-fork', usage: USAGE } as ModelForkResult
  const { seen, ui } = await start($, on, { fork: [nothing], complete: [answered(ROUND_ONE)] })

  expect(seen.complete.map(c => c.model)).toEqual(['sonnet'])
  expect(await ui.find({ type: 'Text', text: /No conversation yet/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /A FEW QUICK QUESTIONS/ })).toBeDefined()
  await ui.unmount()
})

test('with no seed it asks what to do first', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE)] }, { seed: '' })

  expect(await ui.find({ type: 'Text', text: /What do you want Claude to do/ })).toBeDefined()
  expect(seen.fork).toEqual([])
  await ui.input({ key: 'seed', text: 'add dark mode' })
  expect(seen.fork[0]).toContain('add dark mode')
  expect(await ui.find({ type: 'Text', text: /A FEW QUICK QUESTIONS/ })).toBeDefined()
  await ui.unmount()
})

test('each round shows its number, and the third round writes the prompt', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(ROUND_ONE), answered(ROUND_ONE), answered(WRITTEN)] })

  for (const round of [1, 2, 3]) {
    expect((await ui.find({ type: 'Text', text: /Round \d of up to 3/ }))?.text).toContain(`Round ${round} of up to 3`)
    await ui.press({ key: 'pick-0-0' })
    await ui.press({ key: 'pick-1-0' })
    await ui.press({ key: 'next' })
  }

  // No fourth round is asked for: the fourth call writes the prompt.
  expect(seen.fork.length).toBe(4)
  expect(seen.fork[3]).toContain('Write the refined prompt')
  expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
  await ui.unmount()
})

test('a reply that comes back after Cancel never reaches the next run', async ($, on) => {
  let release!: (reply: ModelForkResult) => void
  const late = new Promise<ModelForkResult>(resolve => (release = resolve))
  const roundTwo = JSON.stringify({ done: false, questions: [{ question: 'Who is it for?', options: ['Me', 'My team'] }] })
  const clock = mock.clock(on)
  const { seen, ui } = await start($, on, { fork: [late, answered(roundTwo)] })

  await ui.press({ key: 'cancel' })
  await run($, 'write release notes')
  release(answered(ROUND_ONE))
  await clock.settle()

  expect(seen.fork.length).toBe(2)
  expect(await ui.find({ type: 'Text', text: /Who is it for/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /settings page/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Round 1 of up to 3/ })).toBeDefined()
  await ui.unmount()
})

test('a pane that cannot open leaves no run behind', async ($, on) => {
  on('command.register', () => ({ value: { command: 'improve-prompt' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'no-room' } }))
  const seen: string[] = []
  on('model.fork', (_, e) => {
    seen.push(e.prompt)
    return { value: answered(DONE) }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const result = await run($, 'add dark mode')
  expect(JSON.stringify(result)).toContain("couldn't open")
  expect(seen).toEqual([])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Run \/improve-prompt to start/ })).toBeDefined()
  await ui.unmount()
})

test('each question starts with its Recommended answer picked and marked', async ($, on) => {
  const { ui } = await start($, on, { fork: [answered(ROUND_ONE)] })

  expect((await ui.find({ key: 'pick-0-0' }))?.text).toContain('●  In settings  · recommended')
  expect((await ui.find({ key: 'pick-0-1' }))?.text).toContain('○  In the header')
  expect((await ui.find({ key: 'pick-0-1' }))?.text).not.toContain('recommended')
  // Every question already has an answer: the count, badges and Continue agree.
  expect(await ui.find({ key: 'next' })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /of 2 answered/ }))?.text).toContain('2 of 2')
  expect(await ui.find({ type: 'Text', text: /^ 1 $/ })).toBeUndefined()
  await ui.unmount()
})

test('text typed under Other but not entered keeps Continue and is sent', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(DONE), answered(WRITTEN)] })

  await ui.press({ key: 'other-0' })
  expect(await ui.find({ key: 'next' })).toBeUndefined()
  await ui.input({ key: 'answer-0', text: 'In the sidebar.', kind: 'change' })
  expect(await ui.find({ key: 'next' })).toBeDefined()
  await ui.press({ key: 'next' })
  expect(seen.fork[1]).toContain('Answer: In the sidebar.')
  await ui.unmount()
})

test('"Write it now" skips an empty Other field and keeps the other Recommended answers', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] })

  await ui.press({ key: 'other-0' })
  expect((await ui.find({ key: 'write-now' }))?.text).toBe('Write it now')
  await ui.press({ key: 'write-now' })
  expect(seen.fork[1]).toContain('Skipped: leave this out of the prompt.')
  expect(seen.fork[1]).toContain('Answer: Follow the system')
  await ui.unmount()
})

test('a question with no Options has no answer until the person gives one', async ($, on) => {
  const noOptions = JSON.stringify({
    done: false,
    questions: [
      { question: 'What should the toggle be called?', options: [] },
      { question: 'Which theme should it start in?', options: ['Follow the system', 'Light'] },
    ],
  })
  const { seen, ui } = await start($, on, { fork: [answered(noOptions), answered(WRITTEN)] })

  expect((await ui.find({ type: 'Text', text: /of 2 answered/ }))?.text).toContain('1 of 2')
  expect(await ui.find({ key: 'next' })).toBeUndefined()
  await ui.press({ key: 'pick-1-1' })
  await ui.press({ key: 'write-now' })
  expect(seen.fork[1]).toContain('Skipped: leave this out of the prompt.')
  expect(seen.fork[1]).toContain('Answer: Light')
  await ui.unmount()
})

test('a question left untouched sends its Recommended answer', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] })

  await ui.press({ key: 'pick-0-1' })
  await ui.press({ key: 'write-now' })
  expect(seen.fork[1]).toContain('Answer: In the header')
  expect(seen.fork[1]).toContain('Answer: Follow the system')
  expect(seen.fork[1]).not.toContain('Skipped')
  await ui.unmount()
})

test('change reopens a question with its Recommended answer picked again', async ($, on) => {
  const { ui } = await start($, on, { fork: [answered(ROUND_ONE)] })

  await ui.press({ key: 'skip-0' })
  expect(await ui.find({ type: 'Text', text: /^Skipped$/ })).toBeDefined()
  await ui.press({ key: 'change-0' })
  expect((await ui.find({ key: 'pick-0-0' }))?.text).toContain('●  In settings')

// ----- tuning for the session model -----

const TUNED = `${REFINED}\n===ADDED===\n- Put the toggle in settings\n===TUNED===\n- Asked for a real check before it reports done, because Sonnet 5.5 sometimes skips one\n- Said what is out of scope, because it adds unrequested extras`

test('tuning: only the session model\'s docs are read, and only for writing', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(TUNED)] }, { model: 'claude-sonnet-5-5[1m]' })

  // The questions are asked before any doc is read.
  expect(seen.reads).toEqual([])
  expect(seen.fork[0]).not.toContain('RULES-FROM')

  await ui.press({ key: 'write-now' })
  const root = seen.reads[0]?.replace(/\/references\/.*$/, '') ?? ''
  expect(root).not.toBe('')
  expect(seen.reads).toEqual([`${root}/references/general.md`, `${root}/references/sonnet-5-5.md`])
  expect(seen.fork[1]).toContain('<model_rules for="Claude Sonnet 5.5">')
  expect(seen.fork[1]).toContain('RULES-FROM-general.md')
  expect(seen.fork[1]).toContain('RULES-FROM-sonnet-5-5.md')
  expect(seen.fork[1]).not.toContain('opus')
  await ui.unmount()
})

test('tuning: the tweak list shows each tweak and stays out of the prompt', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(TUNED)] }, { model: 'claude-sonnet-5-5' })

  await ui.press({ key: 'write-now' })
  expect(await ui.find({ type: 'Text', text: /TUNED FOR CLAUDE SONNET 5\.5/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 model tweaks/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /real check before it reports done, because Sonnet 5.5 sometimes skips one/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Said what is out of scope/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /===TUNED===/ })).toBeUndefined()

  await ui.press({ key: 'send' })
  expect(seen.submitted).toEqual([REFINED])
  await ui.unmount()
})

for (const model of ['claude-opus-5', '']) {
  test(`tuning: "${model}" has no reference, so nothing is read, said or changed`, async ($, on) => {
    const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] }, { model })

    await ui.press({ key: 'write-now' })
    expect(seen.reads).toEqual([])
    expect(seen.fork[1]).not.toContain('model_rules')
    expect(seen.fork[1]).not.toContain('TUNED')
    expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /tuned|tweak|model rules/i })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /2 details added/ })).toBeDefined()
    await ui.unmount()
  })
}

test('tuning: a model with no reference ignores a tweak list the reply holds anyway', async ($, on) => {
  const { ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(TUNED)] }, { model: 'claude-opus-4-6' })

  await ui.press({ key: 'write-now' })
  expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /tweak|tuned/i })).toBeUndefined()
  await ui.unmount()
})

test('tuning: a doc that cannot be read falls back silently and the run reaches Review', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] }, { model: 'claude-opus-5-5', docs: false })

  await ui.press({ key: 'write-now' })
  expect(seen.reads.length).toBeGreaterThan(0)
  expect(seen.fork[1]).not.toContain('model_rules')
  expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Something went wrong/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /tuned|tweak|couldn.t/i })).toBeUndefined()
  await ui.unmount()
})

test('tuning: with a reference but no tweaks, nothing about tuning is shown', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(WRITTEN)] }, { model: 'claude-haiku-5-5' })

  await ui.press({ key: 'write-now' })
  expect(seen.fork[1]).toContain('<model_rules for="Claude Haiku 5.5">')
  expect(await ui.find({ type: 'Text', text: /dark mode toggle/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /TUNED FOR|model tweak/ })).toBeUndefined()
  await ui.unmount()
})

test('tuning: opusplan outside plan mode reads the Sonnet doc', async ($, on) => {
  const { seen, ui } = await start($, on, { fork: [answered(ROUND_ONE), answered(TUNED)] }, { model: 'opusplan' })
  await ui.press({ key: 'write-now' })
  expect(seen.reads.map(path => path.split('/').pop())).toEqual(['general.md', 'sonnet-5-5.md'])
  await ui.unmount()
})

test('tuning: opusplan in plan mode reads the Opus doc', async ($, on) => {
  const seen = engine(on, { fork: [answered(ROUND_ONE), answered(TUNED)] }, { model: 'opusplan' })
  on('classic.UserPromptSubmit', () => ({ value: {} }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.classic.UserPromptSubmit({ prompt: 'plan the work', permission_mode: 'plan' })
  await run($, 'add dark mode')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'write-now' })
  expect(seen.reads.map(path => path.split('/').pop())).toEqual(['general.md', 'opus-5-5.md'])
  expect(await ui.find({ type: 'Text', text: /TUNED FOR CLAUDE OPUS 5\.5/ })).toBeDefined()
  await ui.unmount()
})

test('tuning: a rewrite reads the model again and replaces the tweak list', async ($, on) => {
  const second = `${REFINED} Keep it short.\n===TUNED===\n- Cut the prompt down, because Haiku 5.5 does best with short prompts`
  const { seen, ui } = await start(
    $,
    on,
    { fork: [answered(ROUND_ONE), answered(TUNED), answered(second)] },
    { model: 'claude-sonnet-5-5' },
  )

  await ui.press({ key: 'write-now' })
  expect(await ui.find({ type: 'Text', text: /TUNED FOR CLAUDE SONNET 5\.5/ })).toBeDefined()

  seen.model = 'claude-haiku-5-5'
  await ui.input({ key: 'note', text: 'shorter' })
  expect(seen.reads.map(path => path.split('/').pop())).toEqual(['general.md', 'sonnet-5-5.md', 'general.md', 'haiku-5-5.md'])
  expect(seen.fork[2]).toContain('<model_rules for="Claude Haiku 5.5">')
  expect(await ui.find({ type: 'Text', text: /TUNED FOR CLAUDE HAIKU 5\.5/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Cut the prompt down/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Said what is out of scope/ })).toBeUndefined()
  await ui.unmount()
})
