import { expect, test } from 'claude-code/testing'

import type { Question, Reply, Run } from '../types'
import { EMPTY_REPLY, focusAfter, hasAnswer } from '../hooks/answers'

const WITH_OPTIONS: Question = { text: 'Which theme?', options: ['Follow the system', 'Light'] }
const NO_OPTIONS: Question = { text: 'What should it be called?', options: [] }

function round(questions: Question[], replies: Partial<Reply>[] = []): Run {
  return {
    id: 1,
    seed: 'add dark mode',
    useContext: false,
    phase: 'asking',
    busy: 'ask',
    round: 1,
    questions,
    replies: questions.map((_, i) => ({ ...EMPTY_REPLY, ...replies[i] })),
    answered: [],
    refined: '',
    added: [],
    tuned: null,
    note: '',
    error: '',
    notice: '',
  }
}

test('an untouched question with Options has its Recommended answer', () => {
  expect(hasAnswer(round([WITH_OPTIONS]), 0)).toBe(true)
})

test('an untouched question with no Options has no answer', () => {
  expect(hasAnswer(round([NO_OPTIONS]), 0)).toBe(false)
})

test('an open Other field has an answer only once something is typed', () => {
  expect(hasAnswer(round([WITH_OPTIONS], [{ isTyping: true }]), 0)).toBe(false)
  expect(hasAnswer(round([WITH_OPTIONS], [{ isTyping: true, text: '  ' }]), 0)).toBe(false)
  expect(hasAnswer(round([WITH_OPTIONS], [{ isTyping: true, text: 'Dark' }]), 0)).toBe(true)
})

test('focus goes to Continue when every other question has an answer', () => {
  expect(focusAfter(round([WITH_OPTIONS, WITH_OPTIONS], [{}, { choice: 'Light' }]), 1)).toBe('next')
})

test('focus goes to a question with no Options, or to an empty Other field', () => {
  expect(focusAfter(round([NO_OPTIONS, WITH_OPTIONS], [{}, { choice: 'Light' }]), 1)).toBe('other-0')
  expect(focusAfter(round([WITH_OPTIONS, WITH_OPTIONS], [{ isTyping: true }, { choice: 'Light' }]), 1)).toBe('answer-0')
})
