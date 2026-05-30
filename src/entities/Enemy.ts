import Phaser from 'phaser';
import { EV } from '../events';
import { ART_TEX, ensureArtTextures } from '../utils/art';

const WIDTH = 60;
const HEIGHT = 64;
const PATROL_SPEED = 140;
const CHASE_SPEED = 230;
const SIGHT_RANGE = 380;
const GIVE_UP_RANGE = 560;
const HIT_IMMUNE_MS = 220;
const STUN_MS = 200;
const MAX_HP = 4;

const ATTACK_RANGE = 520;
const ATTACK_TELEGRAPH_MS = 320;
const ATTACK_ACTIVE_MS = 180;
const ATTACK_COOLDOWN_MS = 1100;
const PROJECTILE_SPEED = 540;
const PROJECTILE_LIFE_MS = 1500;
const PROJECTILE_RADIUS = 16;

type AggroState = 'patrol' | 'chase' | 'return';

export class Enemy {
  scene: Phaser.Scene;
  obj: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  visual: Phaser.GameObjects.Sprite;

  hp = MAX_HP;
  isDead = false;
  dir: 1 | -1 = 1;
  canAttack: boolean;

  private homeX: number;
  private minX: number;
  private maxX: number;
  private hitImmuneUntil = 0;
  private stunUntil = 0;
  private state: AggroState = 'patrol';

  private telegraph?: Phaser.GameObjects.Arc;
  private attackFlash?: Phaser.GameObjects.Arc;
  private attackActive = false;
  private attackActiveUntil = 0;
  private attackReadyAt = 0;
  private attackWindupUntil = 0;
  private projectiles: Array<{
    obj: Phaser.GameObjects.Arc;
    halo: Phaser.GameObjects.Arc;
    vx: number;
    expireAt: number;
  }> = [];
  private hpBg: Phaser.GameObjects.Rectangle;
  private hpFill: Phaser.GameObjects.Rectangle;
  private hpVisibleUntil = 0;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    range = 100,
    canAttack = false,
  ) {
    this.scene = scene;
    this.canAttack = canAttack;
    ensureArtTextures(scene);
    this.shadow = scene.add
      .ellipse(x, y + HEIGHT / 2 - 2, WIDTH * 0.78, 10, 0x000000, 0.24)
      .setDepth(19);
    this.obj = scene.add.rectangle(x, y, WIDTH, HEIGHT, 0xffffff, 0.001);
    this.obj.setStrokeStyle(0, 0x000000, 0);
    this.visual = scene.add
      .sprite(x, y, canAttack ? ART_TEX.enemyCaster : ART_TEX.enemy)
      .setDepth(28);
    this.hpBg = scene.add
      .rectangle(x, y - HEIGHT / 2 - 16, WIDTH, 7, 0x0a0a14, 0.72)
      .setStrokeStyle(1, 0xffffff, 0.28)
      .setDepth(20)
      .setVisible(false);
    this.hpFill = scene.add
      .rectangle(x - WIDTH / 2 + 2, y - HEIGHT / 2 - 16, WIDTH - 4, 5, 0xffe680, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setVisible(false);
    scene.physics.add.existing(this.obj);
    this.body = this.obj.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.homeX = x;
    this.minX = x - range;
    this.maxX = x + range;
    if (canAttack) {
      this.telegraph = scene.add
        .circle(0, 0, 18, 0xc4b0ff, 0)
        .setStrokeStyle(2, 0xf0d6ff, 0)
        .setDepth(29)
        .setVisible(false);
      this.attackFlash = scene.add
        .circle(0, 0, 28, 0xf0d6ff, 0)
        .setDepth(46)
        .setVisible(false);
    }
  }

  getAttackHitbox(): Phaser.GameObjects.Rectangle | undefined {
    return undefined;
  }

  takeHit(t: number, knockX: number): boolean {
    if (this.isDead || t < this.hitImmuneUntil) return false;
    this.hitImmuneUntil = t + HIT_IMMUNE_MS;
    this.stunUntil = t + STUN_MS;
    this.hp -= 1;
    this.hpVisibleUntil = t + 3200;
    this.updateHealthBar(t);
    this.body.setVelocityX(knockX);
    this.body.setVelocityY(-320);
    if (this.attackActive || this.attackWindupUntil > 0) {
      this.attackActive = false;
      this.attackWindupUntil = 0;
      if (this.telegraph) {
        this.scene.tweens.killTweensOf(this.telegraph);
        this.telegraph.setVisible(false);
      }
      this.attackReadyAt = Math.max(this.attackReadyAt, t + ATTACK_COOLDOWN_MS);
    }
    this.visual.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => this.visual.clearTint());
    this.scene.tweens.add({ targets: this.visual, alpha: 0.35, duration: 60, yoyo: true });
    if (this.hp <= 0) this.die();
    else this.scene.events.emit(EV.enemyHit);
    return true;
  }

  private die() {
    this.isDead = true;
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.attackActive = false;
    if (this.telegraph) {
      this.scene.tweens.killTweensOf(this.telegraph);
      this.telegraph.destroy();
      this.telegraph = undefined;
    }
    if (this.attackFlash) {
      this.scene.tweens.killTweensOf(this.attackFlash);
      this.attackFlash.destroy();
      this.attackFlash = undefined;
    }
    for (const p of this.projectiles) {
      this.scene.tweens.killTweensOf(p.obj);
      this.scene.tweens.killTweensOf(p.halo);
      p.obj.destroy();
      p.halo.destroy();
    }
    this.projectiles = [];
    this.hpBg.setVisible(false);
    this.hpFill.setVisible(false);
    this.scene.events.emit(EV.enemyDied);
    this.scene.tweens.add({
      targets: [this.visual, this.shadow],
      alpha: 0,
      scaleX: 1.6,
      scaleY: 0.2,
      angle: 30,
      duration: 260,
      onComplete: () => {
        this.visual.destroy();
        this.shadow.destroy();
        this.hpBg.destroy();
        this.hpFill.destroy();
        this.obj.destroy();
      },
    });
  }

  update(t: number, dt: number, playerX: number, playerY: number) {
    this.updateProjectiles(t, dt);
    if (this.isDead) return;
    this.updateVisual(t);
    this.updateHealthBar(t);
    if (this.attackActive && t >= this.attackActiveUntil) {
      this.attackActive = false;
    }
    if (t < this.stunUntil) return;
    if (!this.body.blocked.down) return;

    const dx = playerX - this.obj.x;
    const dy = playerY - this.obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.state === 'patrol' && dist < SIGHT_RANGE) {
      this.state = 'chase';
    } else if (this.state === 'chase' && dist > GIVE_UP_RANGE) {
      this.state = 'return';
    } else if (this.state === 'return') {
      if (dist < SIGHT_RANGE) {
        this.state = 'chase';
      } else if (Math.abs(this.obj.x - this.homeX) < 24) {
        this.state = 'patrol';
      }
    }

    const inWindup = this.attackWindupUntil > 0;
    const inActive = this.attackActive;
    const attackBusy = inWindup || inActive;

    if (attackBusy) {
      this.body.setVelocityX(0);
      this.visual.setTint(inActive ? 0xffd6ff : 0xffffff);
    } else if (this.state === 'chase') {
      this.dir = dx >= 0 ? 1 : -1;
      this.body.setVelocityX(CHASE_SPEED * this.dir);
      this.visual.setTint(this.canAttack ? 0xf3d8ff : 0xffd0b8);
    } else if (this.state === 'return') {
      this.dir = this.homeX - this.obj.x >= 0 ? 1 : -1;
      this.body.setVelocityX(PATROL_SPEED * this.dir);
      this.visual.clearTint();
    } else {
      if (this.obj.x <= this.minX) this.dir = 1;
      else if (this.obj.x >= this.maxX) this.dir = -1;
      this.body.setVelocityX(PATROL_SPEED * this.dir);
      this.visual.clearTint();
    }

    if (!this.canAttack) return;

    if (
      !attackBusy &&
      this.state === 'chase' &&
      t >= this.attackReadyAt &&
      dist < ATTACK_RANGE
    ) {
      this.dir = dx >= 0 ? 1 : -1;
      this.attackWindupUntil = t + ATTACK_TELEGRAPH_MS;
      this.body.setVelocityX(0);
      this.startTelegraph();
    }

    if (inWindup && t >= this.attackWindupUntil) {
      this.attackWindupUntil = 0;
      this.attackActive = true;
      this.attackActiveUntil = t + ATTACK_ACTIVE_MS;
      this.attackReadyAt = t + ATTACK_ACTIVE_MS + ATTACK_COOLDOWN_MS;
      this.playAttackFlash();
      this.spawnProjectile(t);
    }
  }

  private startTelegraph() {
    if (!this.telegraph) return;
    const reach = WIDTH / 2 + 14;
    this.telegraph.setPosition(this.obj.x + this.dir * reach, this.obj.y - 4);
    this.telegraph.setVisible(true);
    this.telegraph.setScale(0.4);
    this.telegraph.fillAlpha = 0;
    this.telegraph.setStrokeStyle(2, 0xf0d6ff, 0);
    this.scene.tweens.killTweensOf(this.telegraph);
    this.scene.tweens.add({
      targets: this.telegraph,
      fillAlpha: 0.55,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: ATTACK_TELEGRAPH_MS,
      ease: 'Sine.Out',
      onUpdate: (tw) => {
        const v = (tw.progress * 0.85);
        this.telegraph?.setStrokeStyle(2, 0xf0d6ff, v);
      },
      onComplete: () => {
        this.telegraph?.setVisible(false);
        if (this.telegraph) this.telegraph.fillAlpha = 0;
      },
    });
  }

  private playAttackFlash() {
    if (!this.attackFlash) return;
    const reach = WIDTH / 2 + 14;
    this.attackFlash.setPosition(this.obj.x + this.dir * reach, this.obj.y - 4);
    this.attackFlash.setScale(0.5);
    this.attackFlash.fillAlpha = 0.9;
    this.attackFlash.setVisible(true);
    this.scene.tweens.killTweensOf(this.attackFlash);
    this.scene.tweens.add({
      targets: this.attackFlash,
      fillAlpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 280,
      ease: 'Cubic.Out',
      onComplete: () => this.attackFlash?.setVisible(false),
    });
  }

  private spawnProjectile(t: number) {
    const reach = WIDTH / 2 + 18;
    const x = this.obj.x + this.dir * reach;
    const y = this.obj.y - 4;
    const halo = this.scene.add
      .circle(x, y, PROJECTILE_RADIUS + 8, 0xc4b0ff, 0.28)
      .setDepth(44);
    const core = this.scene.add
      .circle(x, y, PROJECTILE_RADIUS, 0xf0d6ff, 0.96)
      .setStrokeStyle(3, 0xb39bff, 0.7)
      .setDepth(45);
    this.scene.tweens.add({
      targets: [core, halo],
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.projectiles.push({
      obj: core,
      halo,
      vx: PROJECTILE_SPEED * this.dir,
      expireAt: t + PROJECTILE_LIFE_MS,
    });
  }

  private updateProjectiles(t: number, dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const step = (dt / 1000) * p.vx;
      p.obj.x += step;
      p.halo.x = p.obj.x;
      p.halo.y = p.obj.y;
      if (t >= p.expireAt) {
        this.scene.tweens.killTweensOf(p.obj);
        this.scene.tweens.killTweensOf(p.halo);
        this.scene.tweens.add({
          targets: [p.obj, p.halo],
          alpha: 0,
          scaleX: 1.6,
          scaleY: 1.6,
          duration: 200,
          onComplete: () => {
            p.obj.destroy();
            p.halo.destroy();
          },
        });
        this.projectiles.splice(i, 1);
      }
    }
  }

  getProjectiles() {
    return this.projectiles;
  }

  consumeProjectile(p: { obj: Phaser.GameObjects.Arc; halo: Phaser.GameObjects.Arc }) {
    const idx = this.projectiles.findIndex((q) => q === p);
    if (idx < 0) return;
    this.scene.tweens.killTweensOf(p.obj);
    this.scene.tweens.killTweensOf(p.halo);
    this.scene.tweens.add({
      targets: [p.obj, p.halo],
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 180,
      onComplete: () => {
        p.obj.destroy();
        p.halo.destroy();
      },
    });
    this.projectiles.splice(idx, 1);
  }

  private updateHealthBar(t: number) {
    const y = this.obj.y - HEIGHT / 2 - 16;
    this.hpBg.setPosition(this.obj.x, y);
    this.hpFill.setPosition(this.obj.x - WIDTH / 2 + 2, y);
    this.hpFill.scaleX = Math.max(0, this.hp / MAX_HP);
    this.hpFill.fillColor = this.hp <= 1 ? 0xff4d6d : 0xffe680;
    const visible = this.hp < MAX_HP || this.state === 'chase' || t < this.hpVisibleUntil;
    this.hpBg.setVisible(visible);
    this.hpFill.setVisible(visible);
  }

  private updateVisual(t: number) {
    this.visual.setPosition(this.obj.x, this.obj.y - 4 + Math.sin(t / 180 + this.homeX) * 1.2);
    this.visual.setFlipX(this.dir < 0);
    this.visual.setRotation(Phaser.Math.DegToRad(this.body.velocity.x * 0.006));
    this.shadow.setPosition(this.obj.x, this.obj.y + HEIGHT / 2 - 2);
  }
}
