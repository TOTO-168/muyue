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
  accent: Phaser.GameObjects.Rectangle;
  valuePlate?: Phaser.GameObjects.Rectangle;
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

    const centerX = w / 2;
    this.add
      .rectangle(centerX + 14, h / 2 + 12, 880, h - 70, 0x02040a, 0.42)
      .setStrokeStyle(1, 0x000000, 0);
    this.add
      .rectangle(centerX, h / 2, 880, h - 70, 0x080c15, 0.91)
      .setStrokeStyle(1, 0xd9c88f, 0.24);

    const frame = this.add.graphics();
    frame.lineStyle(1, 0xd9c88f, 0.38);
    frame.lineBetween(centerX - 408, 58, centerX - 330, 58);
    frame.lineBetween(centerX - 408, 58, centerX - 408, 136);
    frame.lineBetween(centerX + 408, 58, centerX + 330, 58);
    frame.lineBetween(centerX + 408, 58, centerX + 408, 136);
    frame.lineBetween(centerX - 408, h - 58, centerX - 330, h - 58);
    frame.lineBetween(centerX - 408, h - 58, centerX - 408, h - 136);
    frame.lineBetween(centerX + 408, h - 58, centerX + 330, h - 58);
    frame.lineBetween(centerX + 408, h - 58, centerX + 408, h - 136);

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
        fontSize: '60px',
        color: '#e7d7ac',
      })
      .setOrigin(0.5)
      .setLetterSpacing(8)
      .setShadow(0, 0, '#d9c88f', 10, true, true);

    this.add
      .text(w / 2, 126, 'CONTROLS & AUDIO', {
        fontFamily: '"Cinzel", "Noto Sans TC", system-ui, sans-serif',
        fontSize: '15px',
        color: '#718ba3',
      })
      .setOrigin(0.5)
      .setLetterSpacing(6);

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

    const labelX = centerX - 72;
    const valueX = centerX + 105;
    const rowH = 38;
    const kbHeaderY = 151;
    const startY = 184;
    const padHeaderOffset = 50;
    const audioHeaderOffset = 50;
    const actionBlockOffset = 22;
    const sectionHeaderInset = 15;

    const sectionRules = this.add.graphics();
    const drawSectionRule = (y: number) => {
      sectionRules.lineStyle(1, 0xd9c88f, 0.28);
      sectionRules.lineBetween(centerX - 330, y, centerX - 70, y);
      sectionRules.lineBetween(centerX + 70, y, centerX + 330, y);
      sectionRules.fillStyle(0xe7d7ac, 0.7);
      sectionRules.fillCircle(centerX, y, 3);
    };
    drawSectionRule(kbHeaderY);
    drawSectionRule(startY + kbSeparatorIdx * rowH + sectionHeaderInset);
    drawSectionRule(
      startY + audioSeparatorIdx * rowH + padHeaderOffset + sectionHeaderInset,
    );

    this.add
      .text(centerX, kbHeaderY, '鍵盤', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '19px',
        color: '#aeb8c4',
      })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setBackgroundColor('#080c15');

    this.add
      .text(centerX, startY + kbSeparatorIdx * rowH + sectionHeaderInset, '搖桿', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '19px',
        color: '#aeb8c4',
      })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setBackgroundColor('#080c15');

    this.add
      .text(
        centerX,
        startY + audioSeparatorIdx * rowH + padHeaderOffset + sectionHeaderInset,
        '音訊',
        {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '19px',
          color: '#aeb8c4',
        },
      )
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setBackgroundColor('#080c15');

    this.rowVisuals = this.rows.map((row, i) => {
      let y = startY + i * rowH;
      if (i >= kbSeparatorIdx) y += padHeaderOffset;
      if (i >= audioSeparatorIdx) y += audioHeaderOffset;
      if (row.kind === 'reset' || row.kind === 'back') y += actionBlockOffset;

      const visual: RowVisual = {
        hit: this.add
          .rectangle(centerX, y, 680, rowH - 3, 0x0d1420, 0.2)
          .setStrokeStyle(1, 0x718ba3, 0.08)
          .setOrigin(0.5),
        accent: this.add
          .rectangle(centerX - 331, y, 3, rowH - 12, 0xd9c88f, 0.85)
          .setVisible(false),
      };

      if (row.kind === 'keyboard' || row.kind === 'gamepad' || row.kind === 'audio') {
        visual.valuePlate = this.add
          .rectangle(centerX + 216, y, 220, rowH - 10, 0x070b13, 0.72)
          .setStrokeStyle(1, 0x718ba3, 0.24);
        visual.label = this.add
          .text(labelX, y, this.labelText(row), {
            fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
            fontSize: '21px',
            color: '#cbd2da',
          })
          .setOrigin(1, 0.5);
        visual.value = this.add
          .text(valueX, y, this.valueText(row), {
            fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
            fontSize: '19px',
            color: '#aeb8c4',
          })
          .setOrigin(0, 0.5);
      } else {
        visual.single = this.add
          .text(centerX, y, this.singleText(row), {
            fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
            fontSize: '20px',
            color: '#8290a1',
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
      .text(centerX, h - 40, '↑↓  選擇     Enter / A  修改     ESC / B  取消或返回', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '17px',
        color: '#657080',
        backgroundColor: '#080c15cc',
        padding: { left: 18, right: 18, top: 6, bottom: 6 },
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
      else if (selected) color = '#e7d7ac';
      else if (row.kind === 'reset' || row.kind === 'back') color = '#8290a1';
      else color = '#cbd2da';

      v.label?.setColor(color);
      v.value?.setColor(rebindingThis ? '#ff8eae' : selected ? '#e7d7ac' : '#aeb8c4');
      v.single?.setColor(color);
      v.hit.setFillStyle(
        rebindingThis ? 0x351522 : selected ? 0x172234 : 0x0d1420,
        rebindingThis || selected ? 0.92 : 0.2,
      );
      v.hit.setStrokeStyle(
        selected ? 1 : 1,
        rebindingThis ? 0xff6b9a : selected ? 0xd9c88f : 0x718ba3,
        rebindingThis || selected ? 0.68 : 0.08,
      );
      v.accent
        .setVisible(selected)
        .setFillStyle(rebindingThis ? 0xff6b9a : 0xd9c88f, 0.9);
      v.valuePlate?.setFillStyle(selected ? 0x0b111d : 0x070b13, selected ? 0.94 : 0.72);
      v.valuePlate?.setStrokeStyle(
        1,
        rebindingThis ? 0xff6b9a : selected ? 0xd9c88f : 0x718ba3,
        rebindingThis || selected ? 0.52 : 0.24,
      );
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
