import { expect, test } from 'claude-code/testing'

import { GENERAL_DOC, MODELS } from '../references/map'
import { redoPrompt, writePrompt } from '../hooks/prompts'
import { detectModel } from '../hooks/tuning'
import type { Run } from '../types'

const keyOf = (raw: string, isPlanMode = false) => detectModel(raw, isPlanMode)?.key

// ----- model detection -----

for (const [raw, key] of [
  ['claude-opus-5-5', 'opus-5-5'],
  ['claude-opus-5-5[1m]', 'opus-5-5'],
  ['claude-opus-5-5-20260301', 'opus-5-5'],
  ['us.anthropic.claude-opus-5-5-v1:0', 'opus-5-5'],
  ['anthropic.claude-sonnet-5-5', 'sonnet-5-5'],
  ['global.anthropic.claude-opus-5-5-v1:0', 'opus-5-5'],
  ['apac.anthropic.claude-haiku-5-5-v1:0', 'haiku-5-5'],
  ['us-gov.anthropic.claude-sonnet-5-5-v1:0', 'sonnet-5-5'],
  ['claude-sonnet-5-5@20260301', 'sonnet-5-5'],
  ['  Claude-Haiku-5-5  ', 'haiku-5-5'],
  ['claude-fable-5-2', 'fable-5-2'],
  ['claude-mythos-5-2', 'fable-5-2'],
  ['opus', 'opus-5-5'],
  ['sonnet', 'sonnet-5-5'],
  ['haiku', 'haiku-5-5'],
  ['fable', 'fable-5-2'],
] as const) {
  test(`model detection: "${raw}" is ${key}`, () => {
    expect(keyOf(raw)).toBe(key)
  })
}

test('model detection: opusplan is Opus in plan mode and Sonnet otherwise', () => {
  expect(keyOf('opusplan', true)).toBe('opus-5-5')
  expect(keyOf('opusplan', false)).toBe('sonnet-5-5')
})

for (const raw of ['claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5', 'gpt-5', '', 'default']) {
  test(`model detection: "${raw}" has no reference`, () => {
    expect(detectModel(raw, false)).toBeUndefined()
  })
}

// ----- the reference map -----

test('reference map: every model has its own key, and none can clash with the general doc', () => {
  expect(GENERAL_DOC).toBe('general.md')
  expect(new Set(MODELS.map(m => m.key)).size).toBe(MODELS.length)
  for (const model of MODELS) expect(`${model.key}.md`).not.toBe(GENERAL_DOC)
})

test('reference map: a model name or id belongs to one model only', () => {
  const names = MODELS.flatMap(m => [...m.ids, ...m.aliases])
  expect(new Set(names).size).toBe(names.length)
})

// ----- what the model is asked -----

const RUN = {
  id: 1,
  seed: 'add dark mode',
  useContext: false,
  answered: [],
  note: '',
  refined: 'Add dark mode.',
} as unknown as Run
const TUNING = { model: 'Claude Opus 5.5', rules: 'RULES-GO-HERE' }

for (const [name, build] of [
  ['write', writePrompt],
  ['redo', redoPrompt],
] as const) {
  test(`${name} prompt: with a reference it holds the rules and asks for the tweak list`, () => {
    const prompt = build(RUN, false, TUNING)
    expect(prompt).toContain('<model_rules for="Claude Opus 5.5">')
    expect(prompt).toContain('RULES-GO-HERE')
    expect(prompt).toContain('===TUNED===')
    expect(prompt).toContain('===ADDED===')
  })

  test(`${name} prompt: without a reference it is exactly the plain prompt`, () => {
    const prompt = build(RUN, false)
    expect(prompt).not.toContain('model_rules')
    expect(prompt).not.toContain('TUNED')
    expect(prompt).toContain('===ADDED===')
  })
}
