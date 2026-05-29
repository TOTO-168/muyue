import Phaser from 'phaser';
import { hasAnySave } from '../utils/save';
import { PadEdgeTracker, getActivePad, padBtn, readStick } from '../utils/Pad';
import { createMoonlitBackdrop, ensureArtTextures } from '../utils/art';

type MenuItem = { label: string; onSelect: () => void };

export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private cursor = 0;
  private pad = new PadEdgeTracker(0);

  private kUp!: Phaser.Input.Keyboard.Key;
  private kW!: Phaser.Input.Keyboard.Key;
  private kDown!: Phaser.Input.Keyboard.Key;
  private kS!: Phaser.Input.Keyboard.Key;
  private kEnter!: Phaser.Input.Keyboard.Key;
  private kSpace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TitleScene');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.pad.reset();
    ensureArtTextures(this);

    this.cameras.main.setBackgroundColor('#0a0a14');
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    createMoonlitBackdrop(this, w, h);

    this.add
      .text(w / 2, h / 2 - 220, '沐月', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '160px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffe680', 18, true, true);

    this.add
      .text(w / 2, h / 2 - 80, 'MOONLIT', {
        fontFamily: '"Cinzel", "Noto Serif TC", Georgia, serif',
        fontSize: '40px',
        color: '#9999bb',
        fontStyle: '500',
      })
      .setOrigin(0.5)
      .setLetterSpacing(12)
      .setShadow(0, 0, '#7dd3fc', 8);

    this.items = [];
    if (hasAnySave()) {
      this.items.push({
        label: '繼續',
        onSelect: () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.time.delayedCall(340, () =>
            this.scene.start('SlotPickerScene', { mode: 'load' }),
          );
        },
      });
    }
    this.items.push({
      label: '新遊戲',
      onSelect: () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(340, () =>
          this.scene.start('SlotPickerScene', { mode: 'new' }),
        );
      },
    });
    this.items.push({
      label: '設定',
      onSelect: () => {
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.time.delayedCall(260, () => this.scene.start('SettingsScene'));
      },
    });

    this.texts = this.items.map((item, i) =>
      this.add
        .text(w / 2, h / 2 + 40 + i * 80, item.label, {
          fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
          fontSize: '52px',
          color: '#e8e8f0',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.setCursor(i))
        .on('pointerdown', () => this.confirm()),
    );

    this.add
      .text(
        w / 2,
        h - 60,
        '↑↓ / W S / 搖桿 選擇 · Enter / Space / A 確定',
        { fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif', fontSize: '22px', color: '#6b6b88' },
      )
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.addCapture('UP,DOWN,W,S,SPACE,ENTER,ESC');
    this.kUp = kb.addKey('UP');
    this.kW = kb.addKey('W');
    this.kDown = kb.addKey('DOWN');
    this.kS = kb.addKey('S');
    this.kEnter = kb.addKey('ENTER');
    this.kSpace = kb.addKey('SPACE');

    this.setCursor(0);
  }

  private setCursor(i: number) {
    this.cursor = i;
    this.texts.forEach((t, idx) => {
      if (idx === i) {
        t.setColor('#ffe680');
        t.setScale(1.08);
      } else {
        t.setColor('#e8e8f0');
        t.setScale(1);
      }
    });
  }

  private confirm() {
    this.items[this.cursor]?.onSelect();
  }

  update() {
    this.samplePad();
    if (
      Phaser.Input.Keyboard.JustDown(this.kUp) ||
      Phaser.Input.Keyboard.JustDown(this.kW) ||
      this.pad.justDown('up')
    ) {
      this.setCursor((this.cursor - 1 + this.items.length) % this.items.length);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.kDown) ||
      Phaser.Input.Keyboard.JustDown(this.kS) ||
      this.pad.justDown('down')
    ) {
      this.setCursor((this.cursor + 1) % this.items.length);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.kEnter) ||
      Phaser.Input.Keyboard.JustDown(this.kSpace) ||
      this.pad.justDown('confirm')
    ) {
      this.confirm();
    }
  }

  private samplePad() {
    const out: Record<string, boolean> = {};
    const pad = getActivePad(this);
    if (pad) {
      const DZ = 0.4;
      const { y: stickY } = readStick(pad);
      const DU = padBtn(pad, 12);
      const DD = padBtn(pad, 13);
      out.up = DU || stickY < -DZ;
      out.down = DD || stickY > DZ;
      out.confirm = padBtn(pad, 0) || padBtn(pad, 9);
    }
    this.pad.sample(out, !!pad);
  }
}
