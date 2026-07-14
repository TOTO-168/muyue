import Phaser from 'phaser';
import {
  loadSlots,
  loadSlot,
  clearSlot,
  writeSlot,
  MAX_SAVE_SLOTS,
  type SaveSlot,
} from '../utils/save';
import { STAGES } from '../stages';
import { PadEdgeTracker, getActivePad, padBtn, readStick } from '../utils/Pad';
import { createMoonlitBackdrop } from '../utils/art';

type Mode = 'load' | 'new';

type SlotVisual = {
  shadow: Phaser.GameObjects.Rectangle;
  card: Phaser.GameObjects.Rectangle;
  number: Phaser.GameObjects.Text;
  caption: Phaser.GameObjects.Text;
  stage: Phaser.GameObjects.Text;
  meta: Phaser.GameObjects.Text;
  rule: Phaser.GameObjects.Rectangle;
  seal: Phaser.GameObjects.Arc;
  sealText: Phaser.GameObjects.Text;
};

const SLOT_LABEL_HEIGHT = 164;

export class SlotPickerScene extends Phaser.Scene {
  private mode: Mode = 'load';
  private slots: (SaveSlot | null)[] = [];
  private slotVisuals: SlotVisual[] = [];
  private cursor = 0;
  private confirmOverwriteSlot = -1;
  private confirmDeleteSlot = -1;
  private confirmOverlay?: Phaser.GameObjects.Container;
  private pad = new PadEdgeTracker(0);
  private kUp!: Phaser.Input.Keyboard.Key;
  private kDown!: Phaser.Input.Keyboard.Key;
  private kW!: Phaser.Input.Keyboard.Key;
  private kS!: Phaser.Input.Keyboard.Key;
  private kEnter!: Phaser.Input.Keyboard.Key;
  private kSpace!: Phaser.Input.Keyboard.Key;
  private kEsc!: Phaser.Input.Keyboard.Key;
  private kDelete!: Phaser.Input.Keyboard.Key;
  private kBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('SlotPickerScene');
  }

  init(data: { mode?: Mode }) {
    this.mode = data?.mode ?? 'load';
  }

  create() {
    this.slots = loadSlots();
    this.confirmOverwriteSlot = -1;
    this.confirmDeleteSlot = -1;
    this.slotVisuals = [];
    this.confirmOverlay = undefined;
    this.pad.reset();

    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a0a14');
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(220, 0, 0, 0);
    createMoonlitBackdrop(this, w, h);

    this.add
      .rectangle(w / 2 + 14, h / 2 + 24, 1250, 820, 0x02040a, 0.38)
      .setStrokeStyle(1, 0x000000, 0);
    this.add
      .rectangle(w / 2, h / 2 + 10, 1250, 820, 0x080c15, 0.86)
      .setStrokeStyle(1, 0xd9c88f, 0.24);

    const headerRule = this.add.graphics();
    headerRule.lineStyle(1, 0xd9c88f, 0.42);
    headerRule.lineBetween(w / 2 - 470, 230, w / 2 - 110, 230);
    headerRule.lineBetween(w / 2 + 110, 230, w / 2 + 470, 230);
    headerRule.fillStyle(0xe7d7ac, 0.85);
    headerRule.fillCircle(w / 2, 230, 4);

    this.add
      .text(w / 2, 116, this.mode === 'load' ? '繼續遊戲' : '新遊戲', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '68px',
        color: '#e7d7ac',
      })
      .setOrigin(0.5)
      .setLetterSpacing(8)
      .setShadow(0, 0, '#d9c88f', 12, true, true);

    this.add
      .text(
        w / 2,
        184,
        this.mode === 'load' ? '選擇一方月碑，續寫旅程' : '選擇一方月碑，刻下新的旅程',
        {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '21px',
          color: '#8290a1',
        },
      )
      .setOrigin(0.5);

    const startY = 342;
    const cardW = Math.min(1050, w * 0.72);
    const cardH = 138;
    const cardLeft = w / 2 - cardW / 2;
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const y = startY + i * SLOT_LABEL_HEIGHT;
      const shadow = this.add
        .rectangle(w / 2 + 8, y + 9, cardW, cardH, 0x000000, 0.32)
        .setStrokeStyle(1, 0x000000, 0);
      const card = this.add
        .rectangle(w / 2, y, cardW, cardH, 0x101725, 0.92)
        .setStrokeStyle(1, 0x718ba3, 0.28);
      card.setInteractive({ useHandCursor: this.isUsable(i) });
      card.on('pointerover', () => {
        if (this.isUsable(i)) this.setCursor(i);
      });
      card.on('pointerdown', () => {
        if (this.isUsable(i)) {
          this.setCursor(i);
          this.confirm();
        }
      });
      const number = this.add
        .text(cardLeft + 80, y - 12, ['I', 'II', 'III'][i] ?? String(i + 1), {
          fontFamily: '"Cinzel", Georgia, serif',
          fontSize: '42px',
          color: '#d9c88f',
        })
        .setOrigin(0.5);
      const caption = this.add
        .text(cardLeft + 80, y + 32, `月碑 0${i + 1}`, {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '15px',
          color: '#718ba3',
        })
        .setOrigin(0.5)
        .setLetterSpacing(3);
      const rule = this.add
        .rectangle(cardLeft + 166, y, 1, cardH - 34, 0xd9c88f, 0.28)
        .setOrigin(0.5);
      const stage = this.add
        .text(cardLeft + 218, y - 22, this.stageLabelFor(i), {
          fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
          fontSize: '34px',
          color: '#d7dce3',
        })
        .setOrigin(0, 0.5)
        .setLetterSpacing(4);
      const meta = this.add
        .text(cardLeft + 220, y + 31, this.metaLabelFor(i), {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '19px',
          color: '#8290a1',
        })
        .setOrigin(0, 0.5);
      const seal = this.add
        .circle(cardLeft + cardW - 70, y, 31, 0x0a0f19, 0.9)
        .setStrokeStyle(2, 0xd9c88f, 0.36);
      const sealText = this.add
        .text(cardLeft + cardW - 70, y, this.slots[i] ? '月' : '○', {
          fontFamily: '"Noto Serif TC", Georgia, serif',
          fontSize: this.slots[i] ? '23px' : '20px',
          color: '#d9c88f',
        })
        .setOrigin(0.5);

      this.slotVisuals.push({
        shadow,
        card,
        number,
        caption,
        stage,
        meta,
        rule,
        seal,
        sealText,
      });
    }

    this.add
      .text(
        w / 2,
        h - 72,
        '↑↓ / W S  選擇     Enter / A  確定     X / □  刪除     ESC / B  返回',
        {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '19px',
          color: '#657080',
        },
      )
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.addCapture('UP,DOWN,W,S,ENTER,SPACE,ESC,X,BACKSPACE,DELETE');
    this.kUp = kb.addKey('UP');
    this.kDown = kb.addKey('DOWN');
    this.kW = kb.addKey('W');
    this.kS = kb.addKey('S');
    this.kEnter = kb.addKey('ENTER');
    this.kSpace = kb.addKey('SPACE');
    this.kEsc = kb.addKey('ESC');
    this.kDelete = kb.addKey('X');
    this.kBackspace = kb.addKey('BACKSPACE');

    this.setCursor(this.firstUsable());
  }

  private stageLabelFor(i: number): string {
    const slot = this.slots[i];
    if (!slot) return '尚未刻錄';
    const stageName = STAGES[slot.stage % STAGES.length]?.name ?? '?';
    return `第 ${slot.stage + 1} 幕 · ${stageName}`;
  }

  private metaLabelFor(i: number): string {
    const slot = this.slots[i];
    if (!slot) return '等待新的旅程';
    const time = new Date(slot.updatedAt).toLocaleString('zh-TW', {
      hour12: false,
    });
    const deaths = slot.deaths > 0 ? `   ·   戰歿 ${slot.deaths}` : '';
    return `最後記錄  ${time}${deaths}`;
  }

  private isUsable(i: number): boolean {
    if (this.mode === 'load') return this.slots[i] !== null;
    return true;
  }

  private firstUsable(): number {
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) if (this.isUsable(i)) return i;
    return 0;
  }

  private setCursor(i: number) {
    if (!this.isUsable(i)) return;
    this.cursor = i;
    for (let idx = 0; idx < MAX_SAVE_SLOTS; idx++) {
      const visual = this.slotVisuals[idx];
      if (!visual) continue;
      const usable = this.isUsable(idx);
      const selected = usable && idx === i;
      const alpha = usable ? 1 : 0.34;
      visual.shadow.setAlpha(usable ? 0.32 : 0.12);
      visual.card.setAlpha(alpha);
      visual.number.setAlpha(alpha);
      visual.caption.setAlpha(alpha);
      visual.stage.setAlpha(alpha);
      visual.meta.setAlpha(alpha);
      visual.rule.setAlpha(alpha);
      visual.seal.setAlpha(alpha);
      visual.sealText.setAlpha(alpha);
      if (selected) {
        visual.card.setFillStyle(0x172234, 0.98);
        visual.card.setStrokeStyle(2, 0xd9c88f, 0.86);
        visual.stage.setColor('#e7d7ac');
        visual.meta.setColor('#a9b4c0');
        visual.number.setColor('#e7d7ac');
        visual.rule.setFillStyle(0xd9c88f, 0.72);
        visual.seal.setFillStyle(0x182335, 1).setStrokeStyle(2, 0xe7d7ac, 0.9);
        visual.sealText.setColor('#e7d7ac');
      } else {
        visual.card.setFillStyle(0x101725, 0.92);
        visual.card.setStrokeStyle(1, 0x718ba3, usable ? 0.28 : 0.14);
        visual.stage.setColor(usable ? '#d7dce3' : '#718094');
        visual.meta.setColor('#8290a1');
        visual.number.setColor('#d9c88f');
        visual.rule.setFillStyle(0xd9c88f, 0.28);
        visual.seal.setFillStyle(0x0a0f19, 0.9).setStrokeStyle(2, 0xd9c88f, 0.36);
        visual.sealText.setColor('#d9c88f');
      }
    }
  }

  private moveCursor(delta: number) {
    if (this.confirmOverwriteSlot >= 0 || this.confirmDeleteSlot >= 0) return;
    let next = this.cursor;
    for (let attempts = 0; attempts < MAX_SAVE_SLOTS; attempts++) {
      next = (((next + delta) % MAX_SAVE_SLOTS) + MAX_SAVE_SLOTS) % MAX_SAVE_SLOTS;
      if (this.isUsable(next)) {
        this.setCursor(next);
        return;
      }
    }
  }

  private requestDelete() {
    if (this.confirmOverwriteSlot >= 0 || this.confirmDeleteSlot >= 0) return;
    if (!this.slots[this.cursor]) return;
    this.confirmDeleteSlot = this.cursor;
    this.confirmOverlay?.destroy();
    this.showConfirmOverlay('抹除此方月碑？', '再按 Enter / A 確認   ·   ESC / B 取消');
  }

  private applyDelete() {
    const slot = this.confirmDeleteSlot;
    clearSlot(slot);
    this.slots = loadSlots();
    this.confirmDeleteSlot = -1;
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) this.refreshSlotText(i);
    if (this.mode === 'load' && this.slots.every((s) => s === null)) {
      this.cancel();
      return;
    }
    if (!this.isUsable(this.cursor)) {
      this.setCursor(this.firstUsable());
    } else {
      this.setCursor(this.cursor);
    }
  }

  private confirm() {
    if (this.confirmDeleteSlot >= 0) {
      this.applyDelete();
      return;
    }
    if (this.confirmOverwriteSlot >= 0) {
      const slot = this.confirmOverwriteSlot;
      clearSlot(slot);
      this.confirmOverwriteSlot = -1;
      this.confirmOverlay?.destroy();
      this.confirmOverlay = undefined;
      this.startGame(slot);
      return;
    }
    if (!this.isUsable(this.cursor)) return;
    if (this.mode === 'load') {
      this.startGame(this.cursor);
      return;
    }
    if (this.slots[this.cursor]) {
      this.confirmOverwriteSlot = this.cursor;
      this.showConfirmOverlay(
        '覆寫此方月碑？',
        '舊有記憶將被抹除   ·   Enter / A 確認   ·   ESC / B 取消',
      );
      return;
    }
    this.startGame(this.cursor);
  }

  private refreshSlotText(i: number) {
    const visual = this.slotVisuals[i];
    if (!visual) return;
    visual.stage.setText(this.stageLabelFor(i));
    visual.meta.setText(this.metaLabelFor(i));
    visual.sealText
      .setText(this.slots[i] ? '月' : '○')
      .setFontSize(this.slots[i] ? 23 : 20);
  }

  private showConfirmOverlay(title: string, detail: string) {
    this.confirmOverlay?.destroy();
    const w = this.scale.width;
    const h = this.scale.height;
    const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x02040a, 0.7);
    const shadow = this.add.rectangle(w / 2 + 12, h / 2 + 12, 760, 250, 0x000000, 0.42);
    const panel = this.add
      .rectangle(w / 2, h / 2, 760, 250, 0x0a0f19, 0.98)
      .setStrokeStyle(2, 0xb96a78, 0.72);
    const seal = this.add
      .circle(w / 2, h / 2 - 72, 24, 0x30151e, 0.9)
      .setStrokeStyle(1, 0xd08a95, 0.7);
    const sealText = this.add
      .text(w / 2, h / 2 - 72, '蝕', {
        fontFamily: '"Noto Serif TC", Georgia, serif',
        fontSize: '17px',
        color: '#e7b6bd',
      })
      .setOrigin(0.5);
    const titleText = this.add
      .text(w / 2, h / 2 - 18, title, {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '34px',
        color: '#e7b6bd',
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);
    const detailText = this.add
      .text(w / 2, h / 2 + 50, detail, {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '19px',
        color: '#9ca7b5',
      })
      .setOrigin(0.5);
    this.confirmOverlay = this.add
      .container(0, 0, [shade, shadow, panel, seal, sealText, titleText, detailText])
      .setDepth(200);
  }

  private cancel() {
    if (this.confirmOverwriteSlot >= 0) {
      this.confirmOverwriteSlot = -1;
      this.confirmOverlay?.destroy();
      this.confirmOverlay = undefined;
      return;
    }
    if (this.confirmDeleteSlot >= 0) {
      this.confirmDeleteSlot = -1;
      this.confirmOverlay?.destroy();
      this.confirmOverlay = undefined;
      return;
    }
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(260, () => this.scene.start('TitleScene'));
  }

  private startGame(slot: number) {
    const data = loadSlot(slot);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(340, () => {
      if (data) {
        this.scene.start('GameScene', {
          stage: data.stage,
          from: 'save',
          slot,
        });
      } else {
        const start = STAGES[0].playerStart;
        writeSlot(slot, { stage: 0, x: start.x, y: start.y + 40 });
        this.scene.start('GameScene', { stage: 0, from: 'start', slot });
      }
    });
  }

  update() {
    this.samplePad();
    if (
      Phaser.Input.Keyboard.JustDown(this.kUp) ||
      Phaser.Input.Keyboard.JustDown(this.kW) ||
      this.pad.justDown('up')
    ) {
      this.moveCursor(-1);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.kDown) ||
      Phaser.Input.Keyboard.JustDown(this.kS) ||
      this.pad.justDown('down')
    ) {
      this.moveCursor(1);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.kEnter) ||
      Phaser.Input.Keyboard.JustDown(this.kSpace) ||
      this.pad.justDown('confirm')
    ) {
      this.confirm();
    } else if (
      Phaser.Input.Keyboard.JustDown(this.kEsc) ||
      this.pad.justDown('cancel')
    ) {
      this.cancel();
    } else if (
      Phaser.Input.Keyboard.JustDown(this.kDelete) ||
      Phaser.Input.Keyboard.JustDown(this.kBackspace) ||
      this.pad.justDown('delete')
    ) {
      this.requestDelete();
    }
  }

  private samplePad() {
    const out: Record<string, boolean> = {};
    const pad = getActivePad(this);
    if (pad) {
      const DZ = 0.4;
      const { y: stickY } = readStick(pad);
      out.up = padBtn(pad, 12) || stickY < -DZ;
      out.down = padBtn(pad, 13) || stickY > DZ;
      out.confirm = padBtn(pad, 0) || padBtn(pad, 9);
      out.cancel = padBtn(pad, 1);
      out.delete = padBtn(pad, 2);
    }
    this.pad.sample(out, !!pad);
  }
}
