import type { Graph } from './graph';
import { checkAnswer, formatAnswer, formatValue, treeEdgesFromPi, type Question } from './trace';

test('formatValue', () => {
  expect(formatValue(undefined)).toBe('');
  expect(formatValue(null)).toBe('NIL');
  expect(formatValue(Infinity)).toBe('∞');
  expect(formatValue(3)).toBe('3');
  expect(formatValue('gray')).toBe('gray');
});

test('formatAnswer', () => {
  expect(formatAnswer({ kind: 'vertex', value: 'v1' })).toBe('v1');
  expect(formatAnswer({ kind: 'number', value: Infinity })).toBe('∞');
  expect(formatAnswer({ kind: 'yesno', value: true })).toBe('yes');
});

test('checkAnswer compares kind and value', () => {
  const q: Question = { type: 't', prompt: 'p', answer: { kind: 'number', value: 2 }, explain: 'e' };
  expect(checkAnswer(q, { kind: 'number', value: 2 })).toBe(true);
  expect(checkAnswer(q, { kind: 'number', value: 3 })).toBe(false);
  expect(checkAnswer(q, { kind: 'vertex', value: '2' })).toBe(false);
});

test('treeEdgesFromPi', () => {
  const g: Graph = {
    directed: false,
    vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c', x: 0, y: 0 }],
    edges: [{ u: 'a', v: 'b' }, { u: 'b', v: 'c' }],
    adjOrder: {},
  };
  expect(treeEdgesFromPi(g, { a: { pi: null }, b: { pi: 'a' }, c: {} })).toEqual(['a--b']);
});

test('choice answers compare by value and format as the value', () => {
  const q: Question = {
    type: 't', prompt: 'p', explain: 'e',
    answer: { kind: 'choice', value: 'back', options: ['tree', 'back'] },
  };
  expect(checkAnswer(q, { kind: 'choice', value: 'back', options: ['tree', 'back'] })).toBe(true);
  expect(checkAnswer(q, { kind: 'choice', value: 'tree', options: ['tree', 'back'] })).toBe(false);
  expect(formatAnswer(q.answer)).toBe('back');
});
