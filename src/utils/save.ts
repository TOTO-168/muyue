const KEY = 'muyue-saves-v1';
const LEGACY_KEY = 'muyue-save-v1';

export const MAX_SAVE_SLOTS = 3;

export type SaveSlot = {
  stage: number;
  x: number;
  y: number;
  hp?: number;
  hits?: number;
  deaths: number;
  updatedAt: number;
};

type SavesData = {
  slots: (SaveSlot | null)[];
};

function emptySaves(): SavesData {
  return { slots: Array(MAX_SAVE_SLOTS).fill(null) };
}

function migrateLegacy(): boolean {
  try {
    if (localStorage.getItem(KEY)) return false;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return false;
    const old = JSON.parse(raw);
    if (
      old &&
      typeof old.stage === 'number' &&
      typeof old.x === 'number' &&
      typeof old.y === 'number'
    ) {
      const saves = emptySaves();
      saves.slots[0] = {
        stage: old.stage,
        x: old.x,
        y: old.y,
        deaths: 0,
        updatedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(saves));
    }
    localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}

function readRaw(): SavesData {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.slots)) {
        const slots: (SaveSlot | null)[] = [];
        for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
          const s = parsed.slots[i];
          if (
            s &&
            typeof s.stage === 'number' &&
            typeof s.x === 'number' &&
            typeof s.y === 'number'
          ) {
            slots.push({
              stage: s.stage,
              x: s.x,
              y: s.y,
              hp: typeof s.hp === 'number' ? s.hp : undefined,
              hits: typeof s.hits === 'number' ? s.hits : undefined,
              deaths: typeof s.deaths === 'number' ? s.deaths : 0,
              updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : 0,
            });
          } else {
            slots.push(null);
          }
        }
        return { slots };
      }
    }
  } catch {}
  return emptySaves();
}

function writeRaw(data: SavesData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function loadSlots(): (SaveSlot | null)[] {
  return readRaw().slots;
}

export function loadSlot(slot: number): SaveSlot | null {
  if (slot < 0 || slot >= MAX_SAVE_SLOTS) return null;
  return readRaw().slots[slot];
}

export function writeSlot(
  slot: number,
  data: { stage: number; x: number; y: number; hp?: number; hits?: number },
) {
  if (slot < 0 || slot >= MAX_SAVE_SLOTS) return;
  const saves = readRaw();
  const prev = saves.slots[slot];
  saves.slots[slot] = {
    ...data,
    deaths: prev?.deaths ?? 0,
    updatedAt: Date.now(),
  };
  writeRaw(saves);
}

export function recordDeath(slot: number) {
  if (slot < 0 || slot >= MAX_SAVE_SLOTS) return;
  const saves = readRaw();
  const prev = saves.slots[slot];
  if (!prev) return;
  saves.slots[slot] = {
    ...prev,
    deaths: prev.deaths + 1,
    updatedAt: Date.now(),
  };
  writeRaw(saves);
}

export function clearSlot(slot: number) {
  if (slot < 0 || slot >= MAX_SAVE_SLOTS) return;
  const saves = readRaw();
  saves.slots[slot] = null;
  writeRaw(saves);
}

export function hasAnySave(): boolean {
  return readRaw().slots.some((s) => s !== null);
}
