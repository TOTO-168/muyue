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

const ATTACK_RANGE = 140;
const ATTACK_TELEGRAPH_MS = 220;
const ATTACK_ACTIVE_MS = 180;
const ATTACK_COOLDOWN_MS = 1000;
const ATTACK_REACH = 96;
const ATTACK_HEIGHT = 80;

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

  private attackHitbox?: Phaser.GameObjects.Rectangle;
  private telegraph?: Phaser.GameObjects.Sprite;
  private attackFlash?: Phaser.GameObjects.Sprite;
  private attackActive = false;
  private attackActiveUntil = 0;
  private attackReadyAt = 0;
  private attackWindupUntil = 0;
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
      this.attackHitbox = scene.add
        .rectangle(0, 0, ATTACK_REACH, ATTACK_HEIGHT, 0xffffff, 0)
        .setVisible(false);
      this.telegraph = scene.add
        .sprite(0, 0, ART_TEX.slash)
        .setTint(0xff7aa0)
        .setAlpha(0)
        .setDepth(29)
        .setVisible(false);
      this.attackFlash = scene.add
        .sprite(0, 0, ART_TEX.slash)
        .setTint(0xffb0d0)
        .setDepth(46)
        .setVisible(false)
        .setAlpha(0);
    }
  }

  getAttackHitbox(): Phaser.GameObjects.Rectangle | undefined {
    return this.attackActive ? this.attackHitbox : undefined;
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
      this.attackHitbox?.setVisible(false);
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
    this.attackHitbox?.setVisible(false);
    this.attackHitbox?.destroy();
    this.attackHitbox = undefined;
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

  update(t: number, _dt: number, playerX: number, playerY: number) {
    if (this.isDead) return;
    this.updateVisual(t);
    this.updateHealthBar(t);
    if (this.attackActive) {
      this.positionAttackHitbox();
      if (t >= this.attackActiveUntil) {
        this.attackActive = false;
        this.attackHitbox?.setVisible(false);
      }
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
      if (this.attackHitbox) {
        this.attackHitbox.setVisible(true);
        this.positionAttackHitbox();
      }
      this.playAttackFlash();
    }

    if (this.attackActive) {
      this.positionAttackHitbox();
      if (t >= this.attackActiveUntil) {
        this.attackActive = false;
        this.attackHitbox?.setVisible(false);
      }
    }
  }

  private startTelegraph() {
    if (!this.telegraph) return;
    const reach = WIDTH / 2 + ATTACK_REACH / 2;
    this.telegraph.setPosition(this.obj.x + this.dir * reach, this.obj.y);
    this.telegraph.setFlipX(this.dir < 0);
    this.telegraph.setAngle(this.dir < 0 ? -10 : 10);
    this.telegraph.setScale(0.6, 0.55);
    this.telegraph.setVisible(true);
    this.scene.tweens.killTweensOf(this.telegraph);
    this.scene.tweens.add({
      targets: this.telegraph,
      alpha: { from: 0, to: 0.42 },
      scaleX: 0.9,
      scaleY: 0.7,
      duration: ATTACK_TELEGRAPH_MS,
      ease: 'Sine.Out',
      onComplete: () => {
        this.telegraph?.setVisible(false);
        if (this.telegraph) this.telegraph.alpha = 0;
      },
    });
  }

  private playAttackFlash() {
    if (!this.attackFlash) return;
    const reach = WIDTH / 2 + ATTACK_REACH / 2;
    this.attackFlash.setPosition(this.obj.x + this.dir * reach, this.obj.y);
    this.attackFlash.setFlipX(this.dir < 0);
    this.attackFlash.setAngle(this.dir < 0 ? -18 : 18);
    this.attackFlash.setScale(0.95, 0.85);
    this.attackFlash.setAlpha(0.95);
    this.attackFlash.setVisible(true);
    this.scene.tweens.killTweensOf(this.attackFlash);
    this.scene.tweens.add({
      targets: this.attackFlash,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.0,
      duration: 220,
      ease: 'Cubic.Out',
      onComplete: () => this.attackFlash?.setVisible(false),
    });
  }

  private positionAttackHitbox() {
    if (!this.attackHitbox) return;
    const x = this.obj.x + this.dir * (WIDTH / 2 + ATTACK_REACH / 2);
    this.attackHitbox.setPosition(x, this.obj.y);
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
