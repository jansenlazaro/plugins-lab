// Finds the Session model and loads the Model reference for it.
// Anything unknown or unreadable means no tuning, and no word about it.

import type { EngineInterface } from 'claude-code'

import { GENERAL_DOC, MODELS } from '../references/map'
import type { ModelRef } from '../references/map'

/** The rules a Refined prompt is tuned with, and the model they are for. */
export type Tuning = { model: string; rules: string }

/**
 * The Model reference a Session model maps to, or undefined when it has none.
 * `opusplan` is Opus while planning and Sonnet otherwise.
 */
export function detectModel(raw: string, isPlanMode: boolean): ModelRef | undefined {
  const id = raw
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]*\]$/, '') // "[1m]"
    .replace(/^(?:[a-z]{2}\.)?anthropic\./, '') // "us.anthropic."
    .replace(/@.*$/, '') // "@20251001"
    .replace(/-v\d+:\d+$/, '') // "-v1:0"
    .replace(/-\d{8}$/, '') // "-20251001"
  const name = id === 'opusplan' ? (isPlanMode ? 'opus' : 'sonnet') : id
  return MODELS.find(m => m.ids.includes(name) || m.aliases.includes(name))
}

/** The Tuning for the session's model, or undefined for none. Never throws. */
export async function loadTuning($: EngineInterface, isPlanMode: boolean): Promise<Tuning | undefined> {
  try {
    const ref = detectModel(await $.session.model(), isPlanMode)
    if (!ref) return undefined
    const folder = `${$.plugin.root}/references`
    const [general, specific] = await Promise.all([
      $.fs.read(`${folder}/${GENERAL_DOC}`),
      $.fs.read(`${folder}/${ref.key}.md`),
    ])
    if (typeof general !== 'string' || typeof specific !== 'string') return undefined
    return { model: ref.name, rules: `${general.trim()}\n\n${specific.trim()}` }
  } catch {
    return undefined
  }
}
