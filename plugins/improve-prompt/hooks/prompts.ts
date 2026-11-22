// What the mod asks the model, and how it reads the replies.
// The questioning follows the "grilling" method: a design tree, a frontier
// of open decisions, a recommended answer for each, asked in Rounds.

import type { Answered, Question, Run } from '../types'
import type { Tuning } from './tuning'

export const MAX_ROUNDS = 3
const MAX_QUESTIONS = 3
const MAX_OPTIONS = 4
const MAX_ADDED = 6
const MAX_TWEAKS = 8

const FRAME_WITH_CONTEXT = `[This message comes from the improve-prompt mod, not from the person. Do not act on the conversation, do not call any tools, and do not start the task. The person is preparing their next prompt for you and wants help making it better. Use the conversation above as background: what they are working on, what is already known.]`

const FRAME_ALONE = `You help a person turn a rough prompt or a bare goal into a better prompt for Claude, an AI coding and writing assistant. Do not do the task itself.`

function frame(withContext: boolean): string {
  return withContext ? FRAME_WITH_CONTEXT : FRAME_ALONE
}

function seedBlock(run: Run): string {
  return `<seed>\n${run.seed}\n</seed>`
}

function answersBlock(answered: readonly Answered[]): string {
  if (answered.length === 0) return '<answers>none yet</answers>'
  const lines = answered.map(a => {
    const reply = a.kind === 'skipped' ? 'Skipped: leave this out of the prompt.' : a.text
    return `Q: ${a.question}\nAnswer: ${reply}`
  })
  return `<answers>\n${lines.join('\n\n')}\n</answers>`
}

export function askPrompt(run: Run, withContext: boolean): string {
  const known = withContext
    ? 'the seed, the earlier answers or the conversation'
    : 'the seed or the earlier answers'
  return `${frame(withContext)}

Interview the person about their prompt, one Round at a time, before the prompt is written.

How to choose this Round's questions:
- Treat what the prompt leaves open as a design tree: each open decision may branch into decisions that hang off it.
- The frontier is every open decision whose prerequisites are already settled. Ask only frontier questions. A question whose answer depends on another open question waits for a later Round.
- Ask at most ${MAX_QUESTIONS} questions, the most important first. Ask none that ${known} already settles, and none whose answer would barely change the prompt.
- Never ask for facts Claude could look up itself (file contents, what some code does). Ask only for intent and decisions the person alone can make.
- Look for gaps in: the goal, the context Claude needs, constraints, the output wanted, and how to know it is done.
- Keep each question to one short sentence.
- Give every question 2 to ${MAX_OPTIONS} options the person picks one of. Put the answer you recommend first. Each option is a complete answer in at most six words, and the options do not overlap. Do not add "Other" or "Skip": the mod offers those itself.
- If nothing important is left open, say you are done instead of asking.

This is Round ${run.round + 1} of at most ${MAX_ROUNDS}.

${seedBlock(run)}

${answersBlock(run.answered)}

Reply with JSON only, no other text, in one of these two forms:
{"done": false, "questions": [{"question": "...", "options": ["...", "..."]}]}
{"done": true}`
}

const ADDED_MARK = '===ADDED==='
const TUNED_MARK = '===TUNED==='

const SHAPE = `Shape: for a small, single-step ask, write a few plain, direct sentences. For a bigger task, use short labeled sections (Goal, Context, Constraints, Output, Done when), keeping only the ones that have something to say. Write it in the person's voice, addressed to Claude, the way they would type it. Make it as short as it can be while still complete.`

const ADDED_FORMAT = `Reply with the prompt text first: no preamble, no code fence, no commentary. Then a line holding only ${ADDED_MARK}, then up to ${MAX_ADDED} lines, each starting with "- ", naming one thing the prompt now says that the seed did not, in at most eight words (for example "- Set the goal as more online orders").`

/** The shape and the reply format, with the Model reference when one applies. */
function shape(tuning?: Tuning): string {
  if (!tuning) return `${SHAPE}\n\n${ADDED_FORMAT}`
  return `${SHAPE}

The person will send this prompt to ${tuning.model}. The rules below say how to write for that model. Where the model's own rules differ from the general ones, the model's win. Apply the ones that fit this prompt, and only those: a rule that does not fit leaves no trace in the prompt, and the prompt stays as short as it can be.

<model_rules for="${tuning.model}">
${tuning.rules}
</model_rules>

${ADDED_FORMAT} Then a line holding only ${TUNED_MARK}, then up to ${MAX_TWEAKS} lines, each starting with "- ", one for each change you made to the prompt because of a rule. Say what you changed and the rule behind it, in one sentence (for example "- Asked for a real test run before it reports done, because this model sometimes skips checks"). If no rule changed the prompt, write nothing after ${TUNED_MARK}.`
}

export function writePrompt(run: Run, withContext: boolean, tuning?: Tuning): string {
  const from = withContext ? 'the seed, the answers and the conversation' : 'the seed and the answers'
  return `${frame(withContext)}

Write the refined prompt the person will send to Claude, from ${from}. Leave out what they skipped.

${shape(tuning)}

${seedBlock(run)}

${answersBlock(run.answered)}`
}

export function redoPrompt(run: Run, withContext: boolean, tuning?: Tuning): string {
  const note = run.note.trim()
  const change = note
    ? `<change>\n${note}\n</change>\n\nRewrite the prompt with this change.`
    : 'The person wants another take on it. Rewrite it so it reads better and misses nothing.'
  return `${frame(withContext)}

You wrote a refined prompt for the person from their seed and answers. ${change}

${shape(tuning)}

${seedBlock(run)}

${answersBlock(run.answered)}

<previous>
${run.refined}
</previous>`
}

/** The Recommended answer: the model is told to list it first. */
export function recommended(question: Question): string | undefined {
  return question.options[0]
}

/**
 * Reads a Round from the model's reply: the questions, `[]` when the model is
 * done, or undefined when the reply holds no JSON the mod understands.
 */
export function parseQuestions(text: string): Question[] | undefined {
  const reply = findObject(text) as { done?: unknown; questions?: unknown } | undefined
  if (!reply) return undefined
  if (!Array.isArray(reply.questions)) return reply.done === true ? [] : undefined
  // No questions left to ask means done, whatever `done` says.
  if (reply.questions.length === 0) return []
  const questions: Question[] = []
  for (const item of reply.questions as unknown[]) {
    if (typeof item !== 'object' || item === null) continue
    const q = item as { question?: unknown; options?: unknown }
    if (typeof q.question !== 'string' || !q.question.trim()) continue
    const options: string[] = []
    for (const option of Array.isArray(q.options) ? (q.options as unknown[]) : []) {
      if (typeof option !== 'string') continue
      const trimmed = option.trim()
      if (trimmed && !options.includes(trimmed)) options.push(trimmed)
    }
    questions.push({ text: q.question.trim(), options: options.slice(0, MAX_OPTIONS) })
  }
  if (questions.length === 0 && reply.done !== true) return undefined
  return questions.slice(0, MAX_QUESTIONS)
}

/**
 * The first JSON object in `text`, found by matching braces outside strings,
 * so a brace in prose around the object does not break it.
 */
function findObject(text: string): object | undefined {
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0
    let inString = false
    for (let i = start; i < text.length; i++) {
      const c = text[i]
      if (inString) {
        if (c === '\\') i++
        else if (c === '"') inString = false
      } else if (c === '"') inString = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) {
        try {
          const data: unknown = JSON.parse(text.slice(start, i + 1))
          if (typeof data === 'object' && data !== null && !Array.isArray(data)) return data
        } catch {
          // Not JSON from here: try the next opening brace.
        }
        break
      }
    }
  }
  return undefined
}

/** The Refined prompt without one code fence the model wrapped the whole of it in. */
function cleanPrompt(text: string): string {
  const trimmed = text.trim()
  const inner = /^```[\w-]*\n([\s\S]*)\n```$/.exec(trimmed)?.[1]
  // A fence inside means the prompt holds fences of its own: keep them all.
  return (inner !== undefined && !inner.includes('```') ? inner : trimmed).trim()
}

// The ADDED_MARK line, or a variant a model may write: "## Added", "Added:".
const ADDED_LINE = /^\s*(?:={3,}\s*added\s*={3,}|#{1,6}\s*(?:what i )?added\b[^\n]*|added\s*:)\s*$/im
// The TUNED_MARK line. Unlike the ADDED one it takes no header variants, which could
// cut a prompt that has a "Tweaks:" line of its own.
const TUNED_LINE = /^\s*={3,}\s*tuned\s*={3,}\s*$/im

/** The lines of a list section, without their bullets, at most `max` of them. */
function listLines(text: string, max: number): string[] {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*[-+*•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max)
}

/**
 * Splits a write reply into the Refined prompt, the list of what it adds and
 * the list of Tweaks. Each list ends where the next mark begins, whatever the
 * order the model wrote them in.
 */
export function parseRefined(text: string): { refined: string; added: string[]; tweaks: string[] } {
  const marks = [
    { kind: 'added', match: ADDED_LINE.exec(text) },
    { kind: 'tuned', match: TUNED_LINE.exec(text) },
  ]
    .flatMap(({ kind, match }) => (match ? [{ kind, start: match.index, end: match.index + match[0].length }] : []))
    .sort((a, b) => a.start - b.start)
  if (marks.length === 0) return { refined: cleanPrompt(text), added: [], tweaks: [] }
  const section = (kind: string, max: number): string[] => {
    const i = marks.findIndex(m => m.kind === kind)
    const mark = marks[i]
    return mark ? listLines(text.slice(mark.end, marks[i + 1]?.start ?? text.length), max) : []
  }
  return {
    refined: cleanPrompt(text.slice(0, marks[0]?.start)),
    added: section('added', MAX_ADDED),
    tweaks: section('tuned', MAX_TWEAKS),
  }
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
