import Phaser from 'phaser';
import { ART_TEX, ensureArtTextures } from '../utils/art';

const WIDTH = 46;
const HEIGHT = 72;

export class SavePoint {
  scene: Phaser.Scene;
  obj: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Ellipse;
  sprite: Phaser.GameObjects.Sprite;
  activated = false;
  x: number;
  y: number;
  private spriteBaseY: number;
  private glowBaseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    ensureArtTextures(scene);
    this.glow = scene.add
      .ellipse(x, y - 8, WIDTH + 40, HEIGHT + 24, 0xc8b0ff, 0.14)
      .setStrokeStyle(2, 0xc8b0ff, 0.22)
      .setDepth(18);
    this.obj = scene.add
      .rectangle(x, y, WIDTH, HEIGHT, 0xffffff, 0.001)
      .setStrokeStyle(0, 0x000000, 0);
    this.sprite = scene.add.sprite(x, y - 10, ART_TEX.savePoint).setDepth(25);
    this.spriteBaseY = this.sprite.y;
    this.glowBaseY = this.glow.y;
    this.startIdleTweens();
  }

  private startIdleTweens() {
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      alpha: '+=0.18',
      yoyo: true,
      repeat: -1,
      duration: 1600,
      ease: 'Sine.InOut',
    });
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.spriteBaseY - 5,
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.InOut',
    });
    this.scene.tweens.add({
      targets: this.glow,
      y: this.glowBaseY - 3,
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.InOut',
    });
  }

  overlapsPlayer(playerBounds: Phaser.Geom.Rectangle): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, this.obj.getBounds());
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    this.scene.tweens.killTweensOf([this.sprite, this.glow]);
    this.sprite.setY(this.spriteBaseY);
    this.glow.setY(this.glowBaseY);
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.5,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 320,
      yoyo: true,
      onComplete: () => this.startIdleTweens(),
    });
  }
}
