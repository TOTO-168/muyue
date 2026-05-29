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

const SLOT_LABEL_HEIGHT = 130;

export class SlotPickerScene extends Phaser.Scene {
  private mode: Mode = 'load';
  private slots: (SaveSlot | null)[] = [];
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor = 0;
  private confirmOverwriteSlot = -1;
  private confirmDeleteSlot = -1;
  private confirmOverlay?: Phaser.GameObjects.Text;
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
    this.cards = [];
    this.labels = [];
    this.confirmOverlay = undefined;
    this.pad.reset();

    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a0a14');
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(220, 0, 0, 0);
    createMoonlitBackdrop(this, w, h);

    this.add
      .text(w / 2, 120, this.mode === 'load' ? '繼續遊戲' : '新遊戲', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '76px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffe680', 12, true, true);

    this.add
      .text(
        w / 2,
        200,
        this.mode === 'load' ? '選擇存檔' : '選擇要使用的存檔位置（已存在的會被覆蓋）',
        { fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif', fontSize: '24px', color: '#9999bb' },
      )
      .setOrigin(0.5);

    const startY = 320;
    const cardW = Math.min(900, w * 0.7);
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const y = startY + i * SLOT_LABEL_HEIGHT;
      const card = this.add
        .rectangle(w / 2, y, cardW, SLOT_LABEL_HEIGHT - 24, 0x121827, 0.78)
        .setStrokeStyle(2, 0x7dd3fc, 0.28);
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
      this.cards.push(card);

      const label = this.add
        .text(w / 2, y, this.labelFor(i), {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '28px',
          color: '#e8e8f0',
          align: 'center',
        })
        .setOrigin(0.5);
      if (!this.isUsable(i)) {
        card.setAlpha(0.35);
        label.setColor('#6a6a82');
      }
      this.labels.push(label);
    }

    this.add
      .text(
        w / 2,
        h - 60,
        '↑↓ / W S 選擇 · Enter / A 確定 · X / □ 刪除 · ESC / B 返回',
        { fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif', fontSize: '22px', color: '#6b6b88' },
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

  private labelFor(i: number): string {
    const slot = this.slots[i];
    if (!slot) {
      return `存檔 ${i + 1}\n（空）`;
    }
    const stageName = STAGES[slot.stage % STAGES.length]?.name ?? '?';
    const time = new Date(slot.updatedAt).toLocaleString('zh-TW', {
      hour12: false,
    });
    const deaths = slot.deaths > 0 ? ` · 死亡 ${slot.deaths}` : '';
    return `存檔 ${i + 1}  ·  ${stageName}${deaths}\n${time}`;
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
      const card = this.cards[idx];
      const label = this.labels[idx];
      if (!this.isUsable(idx)) continue;
      if (idx === i) {
        card.setStrokeStyle(3, 0xffe680);
        label.setColor('#ffe680');
        label.setScale(1.04);
      } else {
        card.setStrokeStyle(2, 0x55557a);
        label.setColor('#e8e8f0');
        label.setScale(1);
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
    this.confirmOverlay = this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 130,
        '刪除這個存檔？\n再按 Enter / A 確認，ESC / B 取消',
        {
          fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
          fontSize: '28px',
          color: '#ff8888',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }

  private applyDelete() {
    const slot = this.confirmDeleteSlot;
    clearSlot(slot);
    this.slots = loadSlots();
    this.confirmDeleteSlot = -1;
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      this.labels[i]?.setText(this.labelFor(i));
      if (!this.isUsable(i)) {
        this.cards[i]?.setAlpha(0.35);
        this.cards[i]?.setStrokeStyle(2, 0x55557a);
        this.labels[i]?.setColor('#6a6a82');
        this.labels[i]?.setScale(1);
      } else {
        this.cards[i]?.setAlpha(1);
      }
    }
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
      this.confirmOverlay = this.add
        .text(
          this.scale.width / 2,
          this.scale.height - 130,
          '覆蓋這個存檔？\n再按 Enter / A 確認，ESC / B 取消',
          {
            fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
            fontSize: '28px',
            color: '#ff8888',
            align: 'center',
          },
        )
        .setOrigin(0.5);
      return;
    }
    this.startGame(this.cursor);
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
