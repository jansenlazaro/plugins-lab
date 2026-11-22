// Whether each question of the Round on screen has an answer, and where the
// focus goes next. Plain functions of the Run, so the tests can call them.

import type { Reply, Run } from '../types'
import { recommended } from './prompts'

export const EMPTY_REPLY: Reply = { choice: '', isTyped: false, isSkipped: false, isTyping: false, text: '' }

/** True when the person has settled the question themselves. */
export function isSettled(reply: Reply): boolean {
  return reply.isSkipped || reply.choice !== ''
}

/**
 * True when question `i` would send an answer now, as `settle` reads it: one
 * the person settled, text typed in an open "Other" field, or else the
 * Recommended answer, which stands while no "Other" field is open.
 */
export function hasAnswer(run: Run, i: number): boolean {
  const reply = run.replies[i] ?? EMPTY_REPLY
  if (isSettled(reply)) return true
  if (reply.isTyping) return reply.text.trim() !== ''
  const question = run.questions[i]
  return question !== undefined && recommended(question) !== undefined
}

/**
 * The key to focus once question `index` is answered: the next question with
 * no answer, or Continue (`next`) once every question has one.
 */
export function focusAfter(run: Run, index: number): string {
  const count = run.questions.length
  for (let step = 1; step < count; step++) {
    const i = (index + step) % count
    // A question with no answer has an empty "Other" field open, or no Options.
    if (!hasAnswer(run, i)) return run.replies[i]?.isTyping ? `answer-${i}` : `other-${i}`
  }
  return 'next'
}
