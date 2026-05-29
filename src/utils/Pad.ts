import Phaser from 'phaser';

export type ReadablePad = Phaser.Input.Gamepad.Gamepad | Gamepad;

type MaybeGamepadPlugin = Phaser.Input.Gamepad.GamepadPlugin & {
  refreshPads?: () => void;
  getAll?: () => Phaser.Input.Gamepad.Gamepad[];
};

export function getActivePad(scene: Phaser.Scene): ReadablePad | undefined {
  // Prefer the native snapshot. Phaser's Gamepad.update() guards on
  // `pad.timestamp < this._created` and silently skips state syncs — on Safari
  // a Bluetooth Xbox pad whose last activity predates the scene start gets
  // stuck with buttons[].pressed = false forever. Reading navigator directly
  // sidesteps that guard.
  try {
    const nativePads = navigator.getGamepads?.();
    if (nativePads) {
      for (const p of nativePads) if (p?.connected) return p;
    }
  } catch {
    // Some browsers expose Gamepad API only after a button press or secure-context checks.
  }

  const gp = scene.input.gamepad;
  if (gp) {
    const plugin = gp as MaybeGamepadPlugin;
    plugin.refreshPads?.();
    const list = plugin.getAll?.() ?? (plugin.gamepads ?? []);
    for (const p of list) if (p && p.connected) return p;
  }

  return undefined;
}

export function readStick(pad: ReadablePad): { x: number; y: number } {
  const axes = pad.axes ?? [];
  const x = axisValue(axes[0]) ?? phaserStickValue(pad, 'x') ?? 0;
  const y = axisValue(axes[1]) ?? phaserStickValue(pad, 'y') ?? 0;
  return { x, y };
}

export function padBtn(pad: ReadablePad, i: number): boolean {
  const button = pad.buttons?.[i] as { pressed?: boolean; value?: number } | undefined;
  return button?.pressed === true || (button?.value ?? 0) >= 0.5;
}

export function padButtonCount(pad: ReadablePad): number {
  return pad.buttons?.length ?? 0;
}

export function padButtonsPressed(pad: ReadablePad): boolean[] {
  const count = padButtonCount(pad);
  const out: boolean[] = [];
  for (let i = 0; i < count; i++) out.push(padBtn(pad, i));
  return out;
}

function axisValue(axis: unknown): number | undefined {
  if (typeof axis === 'number') return axis;
  const maybeAxis = axis as { getValue?: () => number } | undefined;
  return maybeAxis?.getValue?.();
}

function phaserStickValue(pad: ReadablePad, axis: 'x' | 'y'): number | undefined {
  return (pad as Phaser.Input.Gamepad.Gamepad).leftStick?.[axis];
}

/**
 * Edge tracker with optional sync window. The sync window is used by scenes
 * that go through scene.restart with potentially-held buttons (GameScene), to
 * avoid the first sample's "{} -> pressed" diff firing every justDown at once.
 * Menu scenes that never restart should pass 0 to get the first-press-counts
 * behavior players expect.
 */
export class PadEdgeTracker {
  private prev: Record<string, boolean> = {};
  private now: Record<string, boolean> = {};
  private hadPad = false;
  private syncFrames = 0;

  constructor(private readonly syncOnReappear: number = 0) {}

  reset() {
    this.prev = {};
    this.now = {};
    this.hadPad = false;
    this.syncFrames = 0;
  }

  sample(state: Record<string, boolean>, hasPad: boolean) {
    if (hasPad && !this.hadPad && this.syncOnReappear > 0) {
      this.syncFrames = this.syncOnReappear;
    }
    this.hadPad = hasPad;
    if (this.syncFrames > 0) {
      this.prev = state;
      this.syncFrames--;
    } else {
      this.prev = this.now;
    }
    this.now = state;
  }

  held(k: string): boolean {
    return this.now[k] === true;
  }

  justDown(k: string): boolean {
    return this.now[k] === true && this.prev[k] !== true;
  }

  justUp(k: string): boolean {
    return this.now[k] !== true && this.prev[k] === true;
  }
}
