import { expect, test } from 'claude-code/testing'

import { parseQuestions, parseRefined } from '../hooks/prompts'

test('questions: an empty list means done', () => {
  expect(parseQuestions('{"done": false, "questions": []}')).toEqual([])
  expect(parseQuestions('{"done": true}')).toEqual([])
})

test('questions: braces in the prose around the JSON are passed over', () => {
  const text = 'A note on {scope} first.\n{"done": false, "questions": [{"question": "Which {file}?", "options": ["a.ts", "b.ts"]}]}\nDone {here}.'
  expect(parseQuestions(text)).toEqual([{ text: 'Which {file}?', options: ['a.ts', 'b.ts'] }])
})

test('questions: no JSON, or only malformed questions, cannot be read', () => {
  expect(parseQuestions('I have no questions.')).toBeUndefined()
  expect(parseQuestions('{"done": false, "questions": [{"options": ["a"]}]}')).toBeUndefined()
})

test('refined: one wrapping fence is removed', () => {
  expect(parseRefined('```markdown\nDo the thing.\n```').refined).toBe('Do the thing.')
})

test('refined: a prompt with fences of its own keeps them', () => {
  const prompt = '```ts\nconst a = 1\n```\nRename it.\n```ts\nconst b = 1\n```'
  expect(parseRefined(prompt).refined).toBe(prompt)
})

for (const mark of ['===ADDED===', '=== Added ===', '## Added', '## What I added', 'Added:']) {
  test(`refined: "${mark}" splits off the list of additions`, () => {
    const { refined, added } = parseRefined(`Do the thing.\n${mark}\n- One\n* Two`)
    expect(refined).toBe('Do the thing.')
    expect(added).toEqual(['One', 'Two'])
  })
}

for (const mark of ['===TUNED===', '=== Tuned ===']) {
  test(`refined: "${mark}" splits off the list of tweaks`, () => {
    const { refined, added, tweaks } = parseRefined(`Do the thing.\n===ADDED===\n- One\n${mark}\n- Ran a real check, because it skips them\n* Two`)
    expect(refined).toBe('Do the thing.')
    expect(added).toEqual(['One'])
    expect(tweaks).toEqual(['Ran a real check, because it skips them', 'Two'])
  })
}

test('refined: a tweak list with no list of additions is still read', () => {
  const { refined, added, tweaks } = parseRefined('Do the thing.\n===TUNED===\n- Asked for a check')
  expect(refined).toBe('Do the thing.')
  expect(added).toEqual([])
  expect(tweaks).toEqual(['Asked for a check'])
})

test('refined: lists written in the other order are each kept to their own', () => {
  const { refined, added, tweaks } = parseRefined('Do the thing.\n===TUNED===\n- T1\n===ADDED===\n- A1')
  expect(refined).toBe('Do the thing.')
  expect(added).toEqual(['A1'])
  expect(tweaks).toEqual(['T1'])
})

test('refined: a heading that only looks like a tweak list is part of the prompt', () => {
  const prompt = 'Do the thing.\n## Tweaks\nKeep it short.'
  expect(parseRefined(prompt)).toEqual({ refined: prompt, added: [], tweaks: [] })
})

test('refined: a reply with no tweak list has no tweaks', () => {
  expect(parseRefined('Do the thing.\n===ADDED===\n- One').tweaks).toEqual([])
  expect(parseRefined('Do the thing.').tweaks).toEqual([])
})

test('refined: at most eight tweaks are kept', () => {
  const lines = Array.from({ length: 12 }, (_, i) => `- T${i}`).join('\n')
  expect(parseRefined(`Do it.\n===TUNED===\n${lines}`).tweaks.length).toBe(8)
})
