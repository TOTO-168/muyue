const KEY = 'muyue-audio-v1';

export type VolumeLevel = 0 | 1 | 2 | 3;

export const VOLUME_LABELS: Record<VolumeLevel, string> = {
  0: '關',
  1: '低',
  2: '中',
  3: '高',
};

const FACTORS: Record<VolumeLevel, number> = {
  0: 0,
  1: 0.35,
  2: 0.7,
  3: 1,
};

let current: VolumeLevel = 2;
let loaded = false;
const listeners = new Set<(v: VolumeLevel) => void>();

function load(): VolumeLevel {
  if (loaded) return current;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (n === 0 || n === 1 || n === 2 || n === 3) current = n as VolumeLevel;
    }
  } catch {}
  return current;
}

export function getVolume(): VolumeLevel {
  return load();
}

export function getVolumeFactor(): number {
  return FACTORS[load()];
}

export function cycleVolume(): VolumeLevel {
  load();
  current = (((current + 1) % 4) as VolumeLevel);
  try {
    localStorage.setItem(KEY, String(current));
  } catch {}
  for (const l of listeners) l(current);
  return current;
}

export function subscribeVolume(fn: (v: VolumeLevel) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
