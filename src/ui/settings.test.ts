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
  saveSettings({ predict: false, disabledTypes: ['x'], speedMs: 300 }, m);
  expect(loadSettings(m)).toEqual({ predict: false, disabledTypes: ['x'], speedMs: 300 });
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
