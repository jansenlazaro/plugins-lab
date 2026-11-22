// What the mod asks the model, and how it reads the replies.
// The questioning follows the "grilling" method: a design tree, a frontier
// of open decisions, a recommended answer for each, asked in Rounds.

import type { Answered, Question, Run } from '../types'

export const MAX_ROUNDS = 3
const MAX_QUESTIONS = 3
const MAX_OPTIONS = 4
const MAX_ADDED = 6

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

const SHAPE = `Shape: for a small, single-step ask, write a few plain, direct sentences. For a bigger task, use short labeled sections (Goal, Context, Constraints, Output, Done when), keeping only the ones that have something to say. Write it in the person's voice, addressed to Claude, the way they would type it. Make it as short as it can be while still complete.

Reply with the prompt text first: no preamble, no code fence, no commentary. Then a line holding only ${ADDED_MARK}, then up to ${MAX_ADDED} lines, each starting with "- ", naming one thing the prompt now says that the seed did not, in at most eight words (for example "- Set the goal as more online orders").`

export function writePrompt(run: Run, withContext: boolean): string {
  const from = withContext ? 'the seed, the answers and the conversation' : 'the seed and the answers'
  return `${frame(withContext)}

Write the refined prompt the person will send to Claude, from ${from}. Leave out what they skipped.

${SHAPE}

${seedBlock(run)}

${answersBlock(run.answered)}`
}

export function redoPrompt(run: Run, withContext: boolean): string {
  const note = run.note.trim()
  const change = note
    ? `<change>\n${note}\n</change>\n\nRewrite the prompt with this change.`
    : 'The person wants another take on it. Rewrite it so it reads better and misses nothing.'
  return `${frame(withContext)}

You wrote a refined prompt for the person from their seed and answers. ${change}

${SHAPE}

${seedBlock(run)}

${answersBlock(run.answered)}

<previous>
${run.refined}
</previous>`
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

/** Splits a write reply into the Refined prompt and the list of what it adds. */
export function parseRefined(text: string): { refined: string; added: string[] } {
  const mark = ADDED_LINE.exec(text)
  if (!mark) return { refined: cleanPrompt(text), added: [] }
  const added = text
    .slice(mark.index + mark[0].length)
    .split('\n')
    .map(line => line.replace(/^\s*[-+*•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, MAX_ADDED)
  return { refined: cleanPrompt(text.slice(0, mark.index)), added }
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
