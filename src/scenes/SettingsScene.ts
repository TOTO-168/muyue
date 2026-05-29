import Phaser from 'phaser';
import {
  getBindings,
  setKeyboardBinding,
  setGamepadBinding,
  resetBindings,
  gamepadButtonName,
  KEYBOARD_ACTION_LABELS,
  GAMEPAD_ACTION_LABELS,
  KeyboardAction,
  GamepadAction,
} from '../utils/KeyBindings';
import { getVolume, cycleVolume, VOLUME_LABELS } from '../utils/audio';
import {
  getActivePad,
  padBtn,
  padButtonCount,
  padButtonsPressed,
  readStick,
  type ReadablePad,
} from '../utils/Pad';
import { createMoonlitBackdrop } from '../utils/art';

type Row =
  | { kind: 'audio' }
  | { kind: 'keyboard'; action: KeyboardAction }
  | { kind: 'gamepad'; action: GamepadAction }
  | { kind: 'reset' }
  | { kind: 'back' };

type RowVisual = {
  label?: Phaser.GameObjects.Text;
  value?: Phaser.GameObjects.Text;
  single?: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
};

export class SettingsScene extends Phaser.Scene {
  private rows: Row[] = [];
  private rowVisuals: RowVisual[] = [];
  private cursor = 0;
  private rebinding: Row | null = null;
  private hint!: Phaser.GameObjects.Text;
  private padPrevButtons: boolean[] = [];
  private padNavPrev: Record<string, boolean> = {};
  private padNavNow: Record<string, boolean> = {};
  private hadPadLastSample = false;
  private padSyncFrames = 0;
  private firstFrame = true;
  private fromGame = false;

  constructor() {
    super('SettingsScene');
  }

  init(data?: { fromGame?: boolean }) {
    this.fromGame = data?.fromGame ?? false;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor('#0a0a14');
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(220, 0, 0, 0);
    createMoonlitBackdrop(this, w, h);

    this.rebinding = null;
    this.firstFrame = true;
    this.padPrevButtons = [];
    this.padNavPrev = {};
    this.padNavNow = {};
    this.hadPadLastSample = false;
    this.padSyncFrames = 0;

    this.add
      .text(w / 2, 80, '設定', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '72px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffe680', 10, true, true);

    this.rows = [];
    (Object.keys(KEYBOARD_ACTION_LABELS) as KeyboardAction[]).forEach((a) => {
      this.rows.push({ kind: 'keyboard', action: a });
    });
    const kbSeparatorIdx = this.rows.length;
    (Object.keys(GAMEPAD_ACTION_LABELS) as GamepadAction[]).forEach((a) => {
      this.rows.push({ kind: 'gamepad', action: a });
    });
    const audioSeparatorIdx = this.rows.length;
    this.rows.push({ kind: 'audio' });
    this.rows.push({ kind: 'reset' });
    this.rows.push({ kind: 'back' });

    const centerX = w / 2;
    const gap = 40;
    const labelX = centerX - gap;
    const valueX = centerX + gap;
    const rowH = 40;
    const kbHeaderY = 125;
    const startY = 170;
    const padHeaderOffset = 50;
    const audioHeaderOffset = 50;
    const actionBlockOffset = 30;
    const sectionHeaderInset = 15;

    this.add
      .text(centerX, kbHeaderY, '鍵盤', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '28px',
        color: '#9999bb',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, startY + kbSeparatorIdx * rowH + sectionHeaderInset, '搖桿', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '28px',
        color: '#9999bb',
      })
      .setOrigin(0.5);

    this.add
      .text(
        centerX,
        startY + audioSeparatorIdx * rowH + padHeaderOffset + sectionHeaderInset,
        '音訊',
        {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '28px',
          color: '#9999bb',
        },
      )
      .setOrigin(0.5);

    this.rowVisuals = this.rows.map((row, i) => {
      let y = startY + i * rowH;
      if (i >= kbSeparatorIdx) y += padHeaderOffset;
      if (i >= audioSeparatorIdx) y += audioHeaderOffset;
      if (row.kind === 'reset' || row.kind === 'back') y += actionBlockOffset;

      const visual: RowVisual = {
        hit: this.add
          .rectangle(centerX, y, 520, rowH - 4, 0x000000, 0)
          .setOrigin(0.5),
      };

      if (row.kind === 'keyboard' || row.kind === 'gamepad' || row.kind === 'audio') {
        visual.label = this.add
          .text(labelX, y, this.labelText(row), {
            fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
            fontSize: '26px',
            color: '#e8e8f0',
          })
          .setOrigin(1, 0.5);
        visual.value = this.add
          .text(valueX, y, this.valueText(row), {
            fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
            fontSize: '26px',
            color: '#e8e8f0',
          })
          .setOrigin(0, 0.5);
      } else {
        visual.single = this.add
          .text(centerX, y, this.singleText(row), {
            fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
            fontSize: '26px',
            color: '#9999bb',
          })
          .setOrigin(0.5);
      }

      visual.hit
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (!this.rebinding) this.setCursor(i);
        })
        .on('pointerdown', () => {
          if (!this.rebinding) {
            this.setCursor(i);
            this.confirm();
          }
        });
      return visual;
    });

    this.hint = this.add
      .text(centerX, h - 50, '↑↓ 選擇 · Enter / A 鍵 修改 · ESC / B 取消或返回', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '22px',
        color: '#6b6b88',
      })
      .setOrigin(0.5);

    this.input.keyboard?.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER,ESC,SHIFT,J,R,P');
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onKeyDown, this);
    });

    this.setCursor(0);
  }

  private labelText(row: Row): string {
    if (row.kind === 'keyboard') return KEYBOARD_ACTION_LABELS[row.action];
    if (row.kind === 'gamepad') return GAMEPAD_ACTION_LABELS[row.action];
    if (row.kind === 'audio') return '音效音量';
    return '';
  }

  private valueText(row: Row): string {
    const b = getBindings();
    if (row.kind === 'keyboard') return b.keyboard[row.action];
    if (row.kind === 'gamepad') return gamepadButtonName(b.gamepad[row.action]);
    if (row.kind === 'audio') return VOLUME_LABELS[getVolume()];
    return '';
  }

  private singleText(row: Row): string {
    if (row.kind === 'reset') return '⟳  還原預設';
    if (row.kind === 'back') return '◀  返回';
    return '';
  }

  private refreshLabels() {
    this.rowVisuals.forEach((v, i) => {
      const row = this.rows[i];
      v.label?.setText(this.labelText(row));
      v.value?.setText(this.valueText(row));
      v.single?.setText(this.singleText(row));
    });
  }

  private setCursor(i: number) {
    this.cursor = i;
    this.rowVisuals.forEach((v, idx) => {
      const row = this.rows[idx];
      const selected = idx === i;
      const rebindingThis = this.rebinding && idx === i;
      let color: string;
      if (rebindingThis) color = '#ff6b9a';
      else if (selected) color = '#ffe680';
      else if (row.kind === 'reset' || row.kind === 'back') color = '#9999bb';
      else color = '#e8e8f0';

      v.label?.setColor(color);
      v.value?.setColor(color);
      v.single?.setColor(color);

      const scale = selected ? 1.05 : 1;
      v.label?.setScale(scale);
      v.value?.setScale(scale);
      v.single?.setScale(scale);
    });
  }

  private confirm() {
    const row = this.rows[this.cursor];
    if (row.kind === 'audio') {
      cycleVolume();
      this.refreshLabels();
      return;
    }
    if (row.kind === 'reset') {
      resetBindings();
      this.refreshLabels();
      return;
    }
    if (row.kind === 'back') {
      this.goBack();
      return;
    }
    this.rebinding = row;
    this.hint.setText(
      row.kind === 'keyboard'
        ? '請按下要綁定的鍵盤按鍵... (ESC 取消)'
        : '請按下要綁定的搖桿按鈕... (ESC / B 取消)',
    );
    this.setCursor(this.cursor);
  }

  private cancelRebinding() {
    this.rebinding = null;
    this.hint.setText('↑↓ 選擇 · Enter / A 鍵 修改 · ESC / B 取消或返回');
    this.setCursor(this.cursor);
  }

  private goBack() {
    if (this.fromGame) {
      this.scene.stop();
      this.scene.resume('GameScene');
      return;
    }
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(260, () => this.scene.start('TitleScene'));
  }

  private onKeyDown(ev: KeyboardEvent) {
    if (this.firstFrame) return;
    if (this.rebinding) {
      if (ev.code === 'Escape') {
        this.cancelRebinding();
        return;
      }
      if (this.rebinding.kind === 'keyboard') {
        const keyName = normalizeKeyName(ev);
        if (keyName) {
          setKeyboardBinding(this.rebinding.action, keyName);
          this.rebinding = null;
          this.refreshLabels();
          this.hint.setText('↑↓ 選擇 · Enter / A 鍵 修改 · ESC / B 取消或返回');
          this.setCursor(this.cursor);
        }
      }
      ev.preventDefault?.();
      return;
    }
    if (ev.code === 'ArrowUp' || ev.code === 'KeyW') {
      this.setCursor((this.cursor - 1 + this.rows.length) % this.rows.length);
    } else if (ev.code === 'ArrowDown' || ev.code === 'KeyS') {
      this.setCursor((this.cursor + 1) % this.rows.length);
    } else if (ev.code === 'Enter' || ev.code === 'Space') {
      this.confirm();
    } else if (ev.code === 'Escape') {
      this.goBack();
    }
  }

  update() {
    if (this.firstFrame) {
      this.firstFrame = false;
      return;
    }
    this.samplePad();
    const pad = this.getActivePad();

    if (this.rebinding?.kind === 'gamepad') {
      if (pad) {
        for (let i = 0; i < padButtonCount(pad); i++) {
          const pressed = padBtn(pad, i);
          const wasPressed = this.padPrevButtons[i] === true;
          if (pressed && !wasPressed && this.padSyncFrames === 0) {
            if (i === 1) {
              this.cancelRebinding();
              this.padPrevButtons = padButtonsPressed(pad);
              return;
            }
            setGamepadBinding(this.rebinding!.action as GamepadAction, i);
            this.rebinding = null;
            this.refreshLabels();
            this.hint.setText('↑↓ 選擇 · Enter / A 鍵 修改 · ESC / B 取消或返回');
            this.setCursor(this.cursor);
            this.padPrevButtons = padButtonsPressed(pad);
            return;
          }
        }
        this.padPrevButtons = padButtonsPressed(pad);
      }
      return;
    }

    if (this.padJustNav('up')) {
      this.setCursor((this.cursor - 1 + this.rows.length) % this.rows.length);
    } else if (this.padJustNav('down')) {
      this.setCursor((this.cursor + 1) % this.rows.length);
    } else if (this.padJustNav('confirm')) {
      this.confirm();
    } else if (this.padJustNav('back')) {
      this.goBack();
    }

    if (pad) {
      this.padPrevButtons = padButtonsPressed(pad);
    } else {
      this.padPrevButtons = [];
    }
  }

  private samplePad() {
    const out: Record<string, boolean> = {};
    const pad = this.getActivePad();
    if (pad) {
      const DZ = 0.4;
      const { y: stickY } = readStick(pad);
      const btn = (i: number) => padBtn(pad, i);
      out.up = btn(12) || stickY < -DZ;
      out.down = btn(13) || stickY > DZ;
      out.confirm = btn(0);
      out.back = btn(1);
    }
    const hasPad = !!pad;
    if (hasPad && !this.hadPadLastSample) this.padSyncFrames = 8;
    this.hadPadLastSample = hasPad;
    if (this.padSyncFrames > 0) {
      this.padNavPrev = out;
      this.padSyncFrames--;
    } else {
      this.padNavPrev = this.padNavNow;
    }
    this.padNavNow = out;
  }

  private padJustNav(k: string): boolean {
    return this.padNavNow[k] === true && this.padNavPrev[k] !== true;
  }

  private getActivePad(): ReadablePad | undefined {
    return getActivePad(this);
  }
}

const RESERVED_KEYS = new Set(['Escape', 'Tab', 'F5', 'F11', 'F12']);

function normalizeKeyName(ev: KeyboardEvent): string | null {
  if (RESERVED_KEYS.has(ev.code)) return null;
  if (ev.code.startsWith('Key')) return ev.code.slice(3);
  if (ev.code.startsWith('Digit')) return ev.code.slice(5);
  if (ev.code.startsWith('Arrow')) return ev.code.slice(5).toUpperCase();
  const map: Record<string, string> = {
    Space: 'SPACE',
    Enter: 'ENTER',
    ShiftLeft: 'SHIFT',
    ShiftRight: 'SHIFT',
    ControlLeft: 'CTRL',
    ControlRight: 'CTRL',
    AltLeft: 'ALT',
    AltRight: 'ALT',
    Backquote: 'BACKTICK',
    Minus: 'MINUS',
    Equal: 'EQUALS',
    BracketLeft: 'LEFT_BRACKET',
    BracketRight: 'RIGHT_BRACKET',
    Backslash: 'BACKSLASH',
    Semicolon: 'SEMICOLON',
    Quote: 'QUOTES',
    Comma: 'COMMA',
    Period: 'PERIOD',
    Slash: 'FORWARD_SLASH',
  };
  return map[ev.code] ?? ev.code.toUpperCase();
}
