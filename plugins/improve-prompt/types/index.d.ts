/**
 * One Clarifying question and the Options the person picks from. The first
 * Option is the Recommended answer.
 */
export type Question = { text: string; options: string[] }

/** What the person has done with one question of the current Round so far. */
export type Reply = {
  /** The answer chosen: an Option, or what they typed. Empty while open. */
  choice: string
  /** True when `choice` was typed rather than picked. */
  isTyped: boolean
  isSkipped: boolean
  /** True while the "Other" field is open. */
  isTyping: boolean
  /** The "Other" field as typed. */
  text: string
}

/** A question from an earlier Round, settled. */
export type Answered = {
  question: string
  kind: 'picked' | 'typed' | 'skipped'
  text: string
}

/**
 * seed: waiting for the person to say what they want (no Seed was given).
 * asking: a Round is on screen. thinking: a model call is running.
 * result: the Refined prompt is on screen. error: the last call failed.
 */
export type Phase = 'seed' | 'asking' | 'thinking' | 'result' | 'error'

/** A model call: the one running, or after a failure the one Retry repeats. */
export type Call = 'ask' | 'write' | 'redo'

export type Run = {
  id: number
  seed: string
  useContext: boolean
  phase: Phase
  /** The call running while thinking, or the one that failed. */
  busy: Call
  /** Rounds asked so far, the one on screen included. */
  round: number
  questions: Question[]
  /** Same order as `questions`. */
  replies: Reply[]
  answered: Answered[]
  refined: string
  /** What the Refined prompt adds to the Seed, one short line each. */
  added: string[]
  /** The Redo note as typed. */
  note: string
  error: string
  /** A one-line remark under the Seed, such as a context fallback. */
  notice: string
}

declare module 'claude-code' {
  interface PluginState {
    'improve-prompt': { run: Shaped<Run | null>; lastId: number }
  }
}
