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
