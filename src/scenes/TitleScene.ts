import Phaser from 'phaser';
import { hasAnySave } from '../utils/save';
import { PadEdgeTracker, getActivePad, padBtn, readStick } from '../utils/Pad';
import {
  createMoonlitBackdrop,
  ensureArtTextures,
  preloadCharacterTextures,
} from '../utils/art';

type MenuItem = { label: string; onSelect: () => void };

export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private menuRows: Phaser.GameObjects.Rectangle[] = [];
  private menuMarks: Phaser.GameObjects.Text[] = [];
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

  preload() {
    preloadCharacterTextures(this);
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

    const panelX = 160;
    const panelY = 70;
    const panelW = 820;
    const panelH = h - 140;
    const titleX = 300;

    this.add
      .rectangle(panelX + panelW / 2 + 18, h / 2 + 18, panelW, panelH, 0x02040a, 0.38)
      .setStrokeStyle(1, 0x000000, 0);
    this.add
      .rectangle(panelX + panelW / 2, h / 2, panelW, panelH, 0x080c15, 0.82)
      .setStrokeStyle(1, 0xd9c88f, 0.22);

    const ornament = this.add.graphics();
    ornament.lineStyle(2, 0xd9c88f, 0.46);
    ornament.lineBetween(panelX + 72, panelY + 70, panelX + 72, panelY + panelH - 70);
    ornament.lineStyle(1, 0x718ba3, 0.24);
    ornament.lineBetween(panelX + 88, panelY + 70, panelX + 88, panelY + panelH - 70);
    ornament.fillStyle(0xe7d7ac, 0.9);
    ornament.fillCircle(panelX + 72, panelY + 70, 5);
    ornament.fillCircle(panelX + 72, panelY + panelH - 70, 5);

    const moonX = w - 350;
    const moonY = h / 2 - 20;
    for (let i = 0; i < 3; i++) {
      this.add
        .circle(moonX, moonY, 142 + i * 42, 0xe7d7ac, 0.025 - i * 0.005)
        .setStrokeStyle(1, 0x718ba3, 0.08);
    }
    this.add
      .circle(moonX, moonY, 106, 0xe7d7ac, 0.08)
      .setStrokeStyle(2, 0xe7d7ac, 0.22);
    this.add.circle(moonX - 38, moonY - 20, 104, 0x080b14, 0.96);
    this.add
      .text(moonX + 18, moonY + 138, '循月而行', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '24px',
        color: '#718ba3',
      })
      .setOrigin(0.5)
      .setLetterSpacing(8);

    this.add
      .text(titleX, 280, '沐月', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '152px',
        color: '#e7d7ac',
      })
      .setOrigin(0, 0.5)
      .setLetterSpacing(18)
      .setShadow(0, 0, '#d9c88f', 16, true, true);

    this.add
      .text(titleX + 8, 390, 'M O O N L I T', {
        fontFamily: '"Cinzel", "Noto Serif TC", Georgia, serif',
        fontSize: '24px',
        color: '#718ba3',
        fontStyle: '500',
      })
      .setOrigin(0, 0.5)
      .setLetterSpacing(5);

    this.add
      .text(titleX + 8, 438, '於無光之境，循月而行', {
        fontFamily: '"Noto Serif TC", Georgia, serif',
        fontSize: '22px',
        color: '#9ca7b5',
      })
      .setOrigin(0, 0.5)
      .setLetterSpacing(4);

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

    this.texts = [];
    this.menuRows = [];
    this.menuMarks = [];
    const menuX = titleX;
    const menuY = 570;
    this.items.forEach((item, i) => {
      const y = menuY + i * 82;
      const row = this.add
        .rectangle(menuX, y, 520, 64, 0x111827, 0.28)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x718ba3, 0.16)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.setCursor(i))
        .on('pointerdown', () => this.confirm());
      const mark = this.add
        .text(menuX + 28, y, '◐', {
          fontFamily: 'Georgia, serif',
          fontSize: '24px',
          color: '#e7d7ac',
        })
        .setOrigin(0.5)
        .setVisible(false);
      const text = this.add
        .text(menuX + 66, y, item.label, {
          fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
          fontSize: '38px',
          color: '#c8cdd5',
        })
        .setOrigin(0, 0.5)
        .setLetterSpacing(6);
      this.menuRows.push(row);
      this.menuMarks.push(mark);
      this.texts.push(text);
    });

    this.add
      .text(
        titleX,
        h - 105,
        '↑↓ / W S / 搖桿   選擇      Enter / Space / A   確定',
        {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '18px',
          color: '#657080',
        },
      )
      .setOrigin(0, 0.5);

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
      const rowX = this.menuRows[idx]?.x ?? 300;
      if (idx === i) {
        t.setColor('#e7d7ac');
        t.setX(rowX + 74);
        this.menuRows[idx]?.setFillStyle(0x182335, 0.82);
        this.menuRows[idx]?.setStrokeStyle(2, 0xd9c88f, 0.68);
        this.menuMarks[idx]?.setVisible(true);
      } else {
        t.setColor('#c8cdd5');
        t.setX(rowX + 66);
        this.menuRows[idx]?.setFillStyle(0x111827, 0.28);
        this.menuRows[idx]?.setStrokeStyle(1, 0x718ba3, 0.16);
        this.menuMarks[idx]?.setVisible(false);
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
