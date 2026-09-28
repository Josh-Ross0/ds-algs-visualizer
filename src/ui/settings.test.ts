import { DEFAULT_SETTINGS, isAsked, loadSettings, saveSettings } from './settings';

function memory() {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

test('round-trips settings', () => {
  const m = memory();
  saveSettings({ predict: false, disabledTypes: ['x'], speedMs: 1200 }, m);
  expect(loadSettings(m)).toEqual({ predict: false, disabledTypes: ['x'], speedMs: 1200 });
});

test('falls back to defaults on missing, corrupt or throwing storage', () => {
  expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
  const bad = memory();
  bad.setItem('dsalgs.settings.v1', '{not json');
  expect(loadSettings(bad)).toEqual(DEFAULT_SETTINGS);
  const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
  expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
});

test('isAsked respects predict switch and disabled types', () => {
  const q = { type: 'bfs.dequeue', prompt: '', explain: '', answer: { kind: 'vertex' as const, value: 'a' } };
  expect(isAsked(DEFAULT_SETTINGS, q)).toBe(true);
  expect(isAsked({ ...DEFAULT_SETTINGS, predict: false }, q)).toBe(false);
  expect(isAsked({ ...DEFAULT_SETTINGS, disabledTypes: ['bfs.dequeue'] }, q)).toBe(false);
});

test('malformed stored fields fall back to defaults field by field', () => {
  const m = memory();
  m.setItem('dsalgs.settings.v1', JSON.stringify({ predict: false, disabledTypes: null, speedMs: -5 }));
  expect(loadSettings(m)).toEqual({ ...DEFAULT_SETTINGS, predict: false });
  m.setItem('dsalgs.settings.v1', JSON.stringify({ predict: 'yes', disabledTypes: ['a', 3], speedMs: 250 }));
  expect(loadSettings(m)).toEqual({ ...DEFAULT_SETTINGS, speedMs: 250 });
  // Only the offered speeds are valid; a stray value like 1 (ms) must not survive.
  m.setItem('dsalgs.settings.v1', JSON.stringify({ predict: false, disabledTypes: [], speedMs: 1 }));
  expect(loadSettings(m)).toEqual({ ...DEFAULT_SETTINGS, predict: false });
  m.setItem('dsalgs.settings.v1', '42');
  expect(loadSettings(m)).toEqual(DEFAULT_SETTINGS);
  m.setItem('dsalgs.settings.v1', 'null');
  expect(loadSettings(m)).toEqual(DEFAULT_SETTINGS);
});
