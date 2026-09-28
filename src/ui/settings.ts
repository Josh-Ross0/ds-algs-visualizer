import { useState } from 'react';
import type { Question } from '../engine/trace';

export type Settings = { predict: boolean; disabledTypes: string[]; speedMs: number };
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };

export const SPEED_OPTIONS: { ms: number; label: string }[] = [
  { ms: 1200, label: 'Slow' },
  { ms: 600, label: 'Normal' },
  { ms: 250, label: 'Fast' },
];

export const DEFAULT_SETTINGS: Settings = { predict: true, disabledTypes: [], speedMs: 600 };
const KEY = 'dsalgs.settings.v1';

function browserStorage(): KV | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function sanitize(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const r = raw as Record<string, unknown>;
  const types = r.disabledTypes;
  return {
    predict: typeof r.predict === 'boolean' ? r.predict : DEFAULT_SETTINGS.predict,
    disabledTypes:
      Array.isArray(types) && types.every((t) => typeof t === 'string')
        ? (types as string[])
        : DEFAULT_SETTINGS.disabledTypes,
    speedMs:
      typeof r.speedMs === 'number' && SPEED_OPTIONS.some((o) => o.ms === r.speedMs)
        ? r.speedMs
        : DEFAULT_SETTINGS.speedMs,
  };
}

export function loadSettings(storage: KV | undefined = browserStorage()): Settings {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings, storage: KV | undefined = browserStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: settings last for this page view only.
  }
}

export function isAsked(s: Settings, q: Question): boolean {
  return s.predict && !s.disabledTypes.includes(q.type);
}

export function useSettings(): [Settings, (s: Settings) => void] {
  const [settings, setSettings] = useState(() => loadSettings());
  const update = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };
  return [settings, update];
}
