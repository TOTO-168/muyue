export type KeyboardAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'dash'
  | 'heal'
  | 'pause';

export type GamepadAction = 'jump' | 'attack' | 'dash' | 'heal' | 'pause';

export type KeyBindings = {
  keyboard: Record<KeyboardAction, string>;
  gamepad: Record<GamepadAction, number>;
};

export const DEFAULT_BINDINGS: KeyBindings = {
  keyboard: {
    left: 'A',
    right: 'D',
    up: 'W',
    down: 'S',
    jump: 'SPACE',
    attack: 'J',
    dash: 'SHIFT',
    heal: 'F',
    pause: 'ESC',
  },
  gamepad: {
    jump: 0,
    attack: 2,
    dash: 5,
    heal: 1,
    pause: 9,
  },
};

export const KEYBOARD_ACTION_LABELS: Record<KeyboardAction, string> = {
  left: '左移',
  right: '右移',
  up: '上 / 上砍',
  down: '下 / 下砍',
  jump: '跳',
  attack: '攻擊',
  dash: '衝刺',
  heal: '回血（長按）',
  pause: '暫停',
};

export const GAMEPAD_ACTION_LABELS: Record<GamepadAction, string> = {
  jump: '跳',
  attack: '攻擊',
  dash: '衝刺',
  heal: '回血（長按）',
  pause: '暫停',
};

export const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: 'A / ✕',
  1: 'B / ○',
  2: 'X / □',
  3: 'Y / △',
  4: 'LB / L1',
  5: 'RB / R1',
  6: 'LT / L2',
  7: 'RT / R2',
  8: 'Select / Share',
  9: 'Start / Options',
  10: 'L3',
  11: 'R3',
  12: 'D-Pad ↑',
  13: 'D-Pad ↓',
  14: 'D-Pad ←',
  15: 'D-Pad →',
};

export function gamepadButtonName(idx: number): string {
  return GAMEPAD_BUTTON_NAMES[idx] ?? `按鈕 ${idx}`;
}

const STORAGE_KEY = 'muyue.keybindings.v1';

function cloneDefaults(): KeyBindings {
  return {
    keyboard: { ...DEFAULT_BINDINGS.keyboard },
    gamepad: { ...DEFAULT_BINDINGS.gamepad },
  };
}

let current: KeyBindings = cloneDefaults();
let loaded = false;
const listeners = new Set<(b: KeyBindings) => void>();

function emit() {
  for (const l of listeners) l(current);
}

export function loadBindings(): KeyBindings {
  if (loaded) return current;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KeyBindings>;
      current = {
        keyboard: { ...DEFAULT_BINDINGS.keyboard, ...(parsed.keyboard ?? {}) },
        gamepad: { ...DEFAULT_BINDINGS.gamepad, ...(parsed.gamepad ?? {}) },
      };
    }
  } catch {
    current = cloneDefaults();
  }
  return current;
}

export function getBindings(): KeyBindings {
  if (!loaded) loadBindings();
  return current;
}

export function setKeyboardBinding(action: KeyboardAction, key: string) {
  current.keyboard[action] = key;
  persist();
  emit();
}

export function setGamepadBinding(action: GamepadAction, button: number) {
  current.gamepad[action] = button;
  persist();
  emit();
}

export function resetBindings() {
  current = cloneDefaults();
  persist();
  emit();
}

export function subscribeBindings(fn: (b: KeyBindings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore quota / private-mode errors
  }
}
