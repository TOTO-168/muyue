import Phaser from 'phaser';
import { EV } from '../events';
import { ART_TEX, ensureArtTextures } from '../utils/art';

const WIDTH = 52;
const HEIGHT = 84;

const MOVE_SPEED = 440;
const AIR_CONTROL = 0.78;
const JUMP_VELOCITY = -1120;
const JUMP_CUT_MULT = 0.4;

const DASH_SPEED = 1240;
const DASH_DURATION = 180;
const DASH_COOLDOWN = 520;

const COYOTE_MS = 110;
const JUMP_BUFFER_MS = 130;

const ATTACK_DURATION = 160;
const ATTACK_COOLDOWN = 260;
const ATTACK_REACH = 92;
const ATTACK_HEIGHT = 88;

const INVINCIBLE_MS = 900;
const HURT_KNOCK_X = 480;
const HURT_KNOCK_Y = -560;

const POGO_BOUNCE_VY = -880;

const ATTACK_RECOIL_VX = 240;
const ATTACK_RECOIL_MS = 120;

const HEAL_TIME_MS = 700;
const HEAL_HP_GAIN = 1;
const HITS_PER_ENERGY = 3;

export const ATTACK_KNOCK_X = 560;
export const PLAYER_MAX_HP = 3;
export const PLAYER_MAX_ENERGY = 3;
const MAX_HITS = PLAYER_MAX_ENERGY * HITS_PER_ENERGY;
const HEAL_COST_HITS = HITS_PER_ENERGY;

export type PlayerKeys = {
  left: () => boolean;
  right: () => boolean;
  up: () => boolean;
  down: () => boolean;
  jumpDown: () => boolean;
  jumpJustDown: () => boolean;
  jumpJustUp: () => boolean;
  attackJustDown: () => boolean;
  dashJustDown: () => boolean;
  healDown: () => boolean;
};

export type AttackDir = 'forward' | 'up' | 'down';

export class Player {
  scene: Phaser.Scene;
  obj: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  visual: Phaser.GameObjects.Sprite;

  hp = PLAYER_MAX_HP;
  hits = 0;
  facing: 1 | -1 = 1;
  isDead = false;
  healing = false;

  get energy(): number {
    return this.hits / HITS_PER_ENERGY;
  }

  private keys: PlayerKeys;

  private coyoteUntil = 0;
  private jumpBufferUntil = 0;
  private jumpCutAvailable = false;

  private dashUntil = 0;
  private dashReadyAt = 0;

  private attackUntil = 0;
  private attackReadyAt = 0;
  private attackHitbox!: Phaser.GameObjects.Rectangle;
  private attackHitboxActive = false;
  private attackFlash: Phaser.GameObjects.Sprite;
  attackDir: AttackDir = 'forward';

  private recoilUntil = 0;
  private invincibleUntil = 0;

  private healStartT = 0;
  private healLockUntil = 0;
  private healAura?: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, keys: PlayerKeys) {
    this.scene = scene;
    this.keys = keys;
    ensureArtTextures(scene);
    this.shadow = scene.add
      .ellipse(x, y + HEIGHT / 2 - 2, WIDTH * 0.72, 10, 0x000000, 0.24)
      .setDepth(24);
    this.obj = scene.add.rectangle(x, y, WIDTH, HEIGHT, 0xffffff, 0.001);
    this.obj.setStrokeStyle(0, 0x000000, 0);
    this.visual = scene.add.sprite(x, y, ART_TEX.player).setDepth(32);
    scene.physics.add.existing(this.obj);
    this.body = this.obj.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(1600, 2800);
    this.attackHitbox = scene.add
      .rectangle(0, 0, ATTACK_REACH, ATTACK_HEIGHT, 0xfff0b0, 0)
      .setVisible(false);
    this.attackFlash = scene.add
      .sprite(0, 0, ART_TEX.slash)
      .setDepth(45)
      .setVisible(false)
      .setAlpha(0);
  }

  getAttackHitbox(): Phaser.GameObjects.Rectangle | undefined {
    return this.attackHitboxActive ? this.attackHitbox : undefined;
  }

  dashCooldownProgress(t: number): number {
    const remaining = this.dashReadyAt - t;
    if (remaining <= 0) return 1;
    return Math.max(0, 1 - remaining / DASH_COOLDOWN);
  }

  takeHit(t: number, fromX: number): boolean {
    if (this.isDead || t < this.invincibleUntil) return false;
    if (this.healing) this.cancelHeal();
    this.healLockUntil = t + 240;
    this.hp -= 1;
    this.invincibleUntil = t + INVINCIBLE_MS;
    const dir = this.obj.x < fromX ? -1 : 1;
    this.body.setVelocityX(dir * HURT_KNOCK_X);
    this.body.setVelocityY(HURT_KNOCK_Y);
    this.scene.cameras.main.shake(140, 0.012);
    this.scene.tweens.add({
      targets: this.visual,
      tint: 0xff7a9a,
      duration: 60,
      yoyo: true,
      onComplete: () => this.visual.clearTint(),
    });
    this.scene.events.emit(EV.playerHp, this.hp);
    if (this.hp <= 0) this.die();
    return true;
  }

  private die() {
    this.isDead = true;
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    if (this.healing) this.cancelHeal();
    this.scene.events.emit(EV.playerDead);
    this.scene.tweens.add({
      targets: [this.visual, this.shadow],
      alpha: 0,
      angle: 90,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 300,
      ease: 'Cubic.Out',
    });
  }

  applyHitGain() {
    if (this.hits >= MAX_HITS) return;
    this.hits = Math.min(MAX_HITS, this.hits + 1);
    this.scene.events.emit(EV.playerEnergy, this.energy);
  }

  applyAttackRecoil(t: number) {
    if (this.attackDir !== 'forward') return;
    if (this.body.blocked.down) {
      this.body.setVelocityX(-this.facing * ATTACK_RECOIL_VX);
      this.recoilUntil = t + ATTACK_RECOIL_MS;
    } else {
      this.body.setVelocityX(this.body.velocity.x - this.facing * ATTACK_RECOIL_VX * 0.4);
    }
  }

  private tryAttack(t: number) {
    if (t < this.attackReadyAt) return;
    this.attackUntil = t + ATTACK_DURATION;
    this.attackReadyAt = t + ATTACK_COOLDOWN;
    if (this.keys.down()) this.attackDir = 'down';
    else if (this.keys.up()) this.attackDir = 'up';
    else this.attackDir = 'forward';
    const r = this.attackHitboxRect();
    this.attackHitbox.setSize(r.w, r.h);
    this.attackHitbox.setPosition(r.x, r.y);
    this.attackHitbox.setVisible(true);
    this.attackHitboxActive = true;
    this.showSlash(r);
    this.scene.events.emit(EV.playerAttack);
  }

  private attackHitboxRect() {
    if (this.attackDir === 'down') {
      return {
        x: this.obj.x,
        y: this.obj.y + HEIGHT / 2 + ATTACK_REACH / 2,
        w: ATTACK_HEIGHT,
        h: ATTACK_REACH,
      };
    }
    if (this.attackDir === 'up') {
      return {
        x: this.obj.x,
        y: this.obj.y - HEIGHT / 2 - ATTACK_REACH / 2,
        w: ATTACK_HEIGHT,
        h: ATTACK_REACH,
      };
    }
    return {
      x: this.obj.x + this.facing * (WIDTH / 2 + ATTACK_REACH / 2),
      y: this.obj.y,
      w: ATTACK_REACH,
      h: ATTACK_HEIGHT,
    };
  }

  private showSlash(r: { x: number; y: number; w: number; h: number }) {
    const offset = { x: 0, y: 0 };
    this.attackFlash
      .setPosition(r.x + offset.x, r.y + offset.y)
      .setVisible(true)
      .setAlpha(0.95)
      .setScale(this.attackDir === 'forward' ? 0.62 : 0.5)
      .setFlipX(this.attackDir === 'forward' && this.facing < 0)
      .setData('ox', offset.x)
      .setData('oy', offset.y);
    this.attackFlash.angle =
      this.attackDir === 'up' ? -90 : this.attackDir === 'down' ? 90 : 0;
    this.scene.tweens.killTweensOf(this.attackFlash);
    this.scene.tweens.add({
      targets: this.attackFlash,
      alpha: 0,
      scaleX: this.attackFlash.scaleX * 1.18,
      scaleY: this.attackFlash.scaleY * 1.18,
      duration: ATTACK_DURATION,
      ease: 'Cubic.Out',
      onComplete: () => this.attackFlash.setVisible(false),
    });
  }

  pogoBounce() {
    if (this.body.blocked.down) return;
    this.body.setVelocityY(POGO_BOUNCE_VY);
    this.jumpCutAvailable = false;
  }

  private startHeal(t: number) {
    this.healing = true;
    this.healStartT = t;
    this.body.setVelocityX(0);
    if (!this.healAura) {
      const targetSize = Math.max(WIDTH, HEIGHT) + 56;
      this.healAura = this.scene.add
        .sprite(this.obj.x, this.obj.y, ART_TEX.healGlow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(22)
        .setScale(targetSize / 256);
    }
    const baseScale = (Math.max(WIDTH, HEIGHT) + 56) / 256;
    this.healAura.setVisible(true);
    this.healAura.setAlpha(0);
    this.healAura.setScale(baseScale * 0.55);
    this.healAura.setRotation(0);
    this.scene.tweens.killTweensOf(this.healAura);
    this.scene.tweens.add({
      targets: this.healAura,
      alpha: 0.95,
      scaleX: baseScale * 1.1,
      scaleY: baseScale * 1.1,
      duration: HEAL_TIME_MS,
      ease: 'Cubic.Out',
    });
    this.scene.tweens.add({
      targets: this.healAura,
      rotation: Math.PI * 0.6,
      duration: HEAL_TIME_MS,
      ease: 'Sine.InOut',
    });
    this.scene.events.emit(EV.playerHealStart);
  }

  private cancelHeal() {
    if (!this.healing) return;
    this.healing = false;
    if (this.healAura) {
      this.scene.tweens.killTweensOf(this.healAura);
      this.healAura.setVisible(false);
    }
    this.scene.events.emit(EV.playerHealCancel);
  }

  private completeHeal() {
    this.healing = false;
    this.hits = Math.max(0, this.hits - HEAL_COST_HITS);
    this.hp = Math.min(PLAYER_MAX_HP, this.hp + HEAL_HP_GAIN);
    if (this.healAura) {
      const baseScale = (Math.max(WIDTH, HEIGHT) + 56) / 256;
      this.scene.tweens.killTweensOf(this.healAura);
      this.scene.tweens.add({
        targets: this.healAura,
        alpha: 0,
        scaleX: baseScale * 1.7,
        scaleY: baseScale * 1.7,
        duration: 320,
        ease: 'Cubic.Out',
        onComplete: () => this.healAura?.setVisible(false),
      });
    }
    this.scene.events.emit(EV.playerHp, this.hp, true);
    this.scene.events.emit(EV.playerEnergy, this.energy);
    this.scene.events.emit(EV.playerHeal);
  }

  update(t: number, _dt: number) {
    this.updateVisual(t);
    if (this.isDead) return;

    const onGround = this.body.blocked.down;
    if (onGround) {
      this.coyoteUntil = t + COYOTE_MS;
      this.jumpCutAvailable = false;
    }

    const healHeld = this.keys.healDown();

    if (this.healing) {
      const valid =
        healHeld && onGround && this.hits >= HEAL_COST_HITS && this.hp < PLAYER_MAX_HP;
      if (!valid) {
        this.cancelHeal();
      } else {
        this.body.setVelocityX(0);
        if (this.healAura) this.healAura.setPosition(this.obj.x, this.obj.y);
        if (t - this.healStartT >= HEAL_TIME_MS) {
          this.completeHeal();
        }
      }
    } else if (
      healHeld &&
      onGround &&
      this.hits >= HEAL_COST_HITS &&
      this.hp < PLAYER_MAX_HP &&
      t >= this.attackUntil &&
      t >= this.dashUntil &&
      t >= this.healLockUntil
    ) {
      this.startHeal(t);
    }

    if (this.healing) {
      this.body.setVelocityX(0);
      this.updateInvincibleFlash(t);
      this.updateVisual(t);
      return;
    }

    const dashing = t < this.dashUntil;
    const recoiling = t < this.recoilUntil;

    if (!dashing && !recoiling) {
      const speed = onGround ? MOVE_SPEED : MOVE_SPEED * AIR_CONTROL;
      let vx = 0;
      if (this.keys.left()) {
        vx -= speed;
        this.facing = -1;
      }
      if (this.keys.right()) {
        vx += speed;
        this.facing = 1;
      }
      this.body.setVelocityX(vx);
    }

    if (this.keys.jumpJustDown()) {
      this.jumpBufferUntil = t + JUMP_BUFFER_MS;
    }
    if (t < this.jumpBufferUntil && t < this.coyoteUntil) {
      this.body.setVelocityY(JUMP_VELOCITY);
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
      this.jumpCutAvailable = true;
      this.scene.events.emit(EV.playerJump);
    }
    if (
      this.keys.jumpJustUp() &&
      this.jumpCutAvailable &&
      this.body.velocity.y < 0
    ) {
      this.body.setVelocityY(this.body.velocity.y * JUMP_CUT_MULT);
      this.jumpCutAvailable = false;
    }

    if (this.keys.dashJustDown() && t >= this.dashReadyAt) {
      this.dashUntil = t + DASH_DURATION;
      this.dashReadyAt = t + DASH_COOLDOWN;
      this.body.setVelocityX(this.facing * DASH_SPEED);
      this.body.setVelocityY(0);
      this.body.setAllowGravity(false);
      this.invincibleUntil = Math.max(this.invincibleUntil, t + DASH_DURATION + 30);
      this.scene.events.emit(EV.playerDash);
      this.scene.tweens.add({
        targets: this.obj,
        scaleX: 1.35,
        scaleY: 0.7,
        duration: 80,
        yoyo: true,
      });
    }
    if (!dashing && !this.body.allowGravity) {
      this.body.setAllowGravity(true);
    }

    if (this.keys.attackJustDown()) {
      this.tryAttack(t);
    }
    if (this.attackHitboxActive) {
      const r = this.attackHitboxRect();
      this.attackHitbox.setPosition(r.x, r.y);
      if (this.attackFlash.visible) {
        const ox = this.attackFlash.getData('ox') ?? 0;
        const oy = this.attackFlash.getData('oy') ?? 0;
        this.attackFlash.setPosition(r.x + ox, r.y + oy);
      }
      if (t > this.attackUntil) {
        this.attackHitbox.setVisible(false);
        this.attackHitboxActive = false;
      }
    }

    this.updateInvincibleFlash(t);
    this.updateVisual(t);
  }

  private updateInvincibleFlash(t: number) {
    if (t < this.invincibleUntil) {
      this.visual.alpha = Math.floor(t / 60) % 2 === 0 ? 0.42 : 1;
    } else if (this.visual.alpha !== 1) {
      this.visual.alpha = 1;
    }
  }

  private updateVisual(t: number) {
    if (this.isDead) return;
    this.visual.setPosition(this.obj.x, this.obj.y - 5);
    this.visual.setFlipX(this.facing < 0);
    this.visual.setRotation(Phaser.Math.DegToRad(this.body.velocity.x * 0.006));
    const bob = this.body.blocked.down ? Math.sin(t / 120) * 1.3 : 0;
    this.visual.y += bob;
    const airborne = Phaser.Math.Clamp(Math.abs(this.body.velocity.y) / 1400, 0, 1);
    this.shadow.setPosition(this.obj.x, this.obj.y + HEIGHT / 2 - 2);
    this.shadow.setScale(1 - airborne * 0.35, 1);
    this.shadow.setAlpha(0.24 - airborne * 0.1);
  }
}
