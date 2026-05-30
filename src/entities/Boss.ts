import Phaser from 'phaser';
import { EV } from '../events';
import { ART_TEX, ensureArtTextures } from '../utils/art';

const WIDTH = 100;
const HEIGHT = 120;
const MAX_HP = 14;

const HIT_IMMUNE_MS = 200;
const STUN_MS = 120;
const PHASE2_HP = Math.floor(MAX_HP / 2);

const LUNGE_WINDUP_MS = 460;
const LUNGE_ACTIVE_MS = 340;
const LUNGE_RECOVER_MS = 520;
const LUNGE_SPEED = 760;
const LUNGE_REACH = 140;
const LUNGE_HEIGHT = 116;

const SLAM_RISE_MS = 360;
const SLAM_LAND_MS = 260;
const SLAM_RECOVER_MS = 420;
const SLAM_JUMP_VY = -1180;
const SLAM_FALL_VY = 1700;
const SLAM_SHOCKWAVE_W = 420;
const SLAM_SHOCKWAVE_H = 76;

const APPROACH_SPEED = 170;
const APPROACH_RANGE = 380;
const POST_ATTACK_DELAY_MS = 500;

type State =
  | 'approach'
  | 'lunge_windup'
  | 'lunge_active'
  | 'lunge_recover'
  | 'slam_rise'
  | 'slam_fall'
  | 'slam_land'
  | 'slam_recover';

export class Boss {
  scene: Phaser.Scene;
  obj: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  visual: Phaser.GameObjects.Sprite;

  hp = MAX_HP;
  maxHp = MAX_HP;
  isDead = false;
  dir: 1 | -1 = -1;
  phase: 1 | 2 = 1;

  private state: State = 'approach';
  private stateUntil = 0;
  private nextActionAt = 0;
  private hitImmuneUntil = 0;
  private stunUntil = 0;

  private attackHitbox: Phaser.GameObjects.Rectangle;
  private attackActive = false;
  private telegraph: Phaser.GameObjects.Sprite;
  private attackFlash: Phaser.GameObjects.Sprite;
  private shockwaveGfx?: Phaser.GameObjects.Graphics;
  private entranceShockwaveHitbox?: Phaser.GameObjects.Rectangle;
  private entranceShockwaveUntil = 0;

  private shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    ensureArtTextures(scene);
    this.shadow = scene.add
      .ellipse(x, y + HEIGHT / 2 - 2, WIDTH * 0.9, 18, 0x000000, 0.3)
      .setDepth(21);
    this.obj = scene.add.rectangle(x, y, WIDTH, HEIGHT, 0xffffff, 0.001);
    this.obj.setStrokeStyle(0, 0x000000, 0);
    this.visual = scene.add.sprite(x, y - 8, ART_TEX.boss).setDepth(30);
    scene.physics.add.existing(this.obj);
    this.body = this.obj.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(1000, 2800);
    this.attackHitbox = scene.add
      .rectangle(0, 0, LUNGE_REACH, LUNGE_HEIGHT, 0xffffff, 0)
      .setVisible(false);
    this.telegraph = scene.add
      .sprite(0, 0, ART_TEX.slash)
      .setTint(0xff5577)
      .setDepth(29)
      .setAlpha(0)
      .setVisible(false);
    this.attackFlash = scene.add
      .sprite(0, 0, ART_TEX.slash)
      .setTint(0xfff0b0)
      .setDepth(48)
      .setAlpha(0)
      .setVisible(false);
  }

  getAttackHitbox(): Phaser.GameObjects.Rectangle | undefined {
    return this.attackActive ? this.attackHitbox : undefined;
  }

  takeHit(t: number, knockX: number): boolean {
    if (this.isDead || t < this.hitImmuneUntil) return false;
    this.hitImmuneUntil = t + HIT_IMMUNE_MS;
    this.stunUntil = t + STUN_MS;
    this.hp -= 1;
    this.body.setVelocityX(knockX * 0.22);
    if (this.body.blocked.down) this.body.setVelocityY(-180);
    this.scene.tweens.add({ targets: this.visual, alpha: 0.35, duration: 60, yoyo: true });
    if (this.hp <= PHASE2_HP && this.phase === 1) this.enterPhase2();
    if (this.hp <= 0) {
      this.die();
    } else {
      this.scene.events.emit(EV.enemyHit);
    }
    return true;
  }

  private enterPhase2() {
    this.phase = 2;
    this.visual.setTexture(ART_TEX.bossPhase2);
    this.scene.cameras.main.shake(260, 0.012);
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: 1.15,
      scaleY: 1.15,
      yoyo: true,
      duration: 240,
    });
  }

  private die() {
    this.isDead = true;
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.attackActive = false;
    this.attackHitbox.setVisible(false);
    this.scene.tweens.killTweensOf(this.telegraph);
    this.telegraph.setVisible(false);
    this.scene.tweens.killTweensOf(this.attackFlash);
    this.attackFlash.setVisible(false);
    if (this.shockwaveGfx) {
      this.scene.tweens.killTweensOf(this.shockwaveGfx);
      this.shockwaveGfx.destroy();
      this.shockwaveGfx = undefined;
    }
    if (this.entranceShockwaveHitbox) {
      this.entranceShockwaveHitbox.destroy();
      this.entranceShockwaveHitbox = undefined;
    }
    this.entranceShockwaveUntil = 0;
    this.scene.events.emit(EV.bossDied);
    this.scene.tweens.add({
      targets: [this.visual, this.shadow],
      alpha: 0,
      scaleX: 1.6,
      scaleY: 0.2,
      angle: 30,
      duration: 700,
      onComplete: () => {
        this.visual.destroy();
        this.shadow.destroy();
        this.obj.destroy();
        this.attackHitbox.destroy();
        this.telegraph.destroy();
        this.attackFlash.destroy();
      },
    });
  }

  private speedMul(): number {
    return this.phase === 2 ? 1.3 : 1;
  }

  private cooldownMul(): number {
    return this.phase === 2 ? 0.7 : 1;
  }

  update(t: number, _dt: number, playerX: number, _playerY: number) {
    if (this.isDead) return;
    this.updateVisual(t);
    if (t < this.stunUntil) return;

    const dx = playerX - this.obj.x;
    const onGround = this.body.blocked.down;

    switch (this.state) {
      case 'approach': {
        if (!onGround) {
          this.body.setVelocityX(0);
          return;
        }
        this.dir = dx >= 0 ? 1 : -1;
        const dist = Math.abs(dx);
        if (t >= this.nextActionAt && dist < APPROACH_RANGE) {
          this.choosePattern(t, dx);
        } else if (dist > APPROACH_RANGE * 0.7) {
          this.body.setVelocityX(APPROACH_SPEED * this.speedMul() * this.dir);
        } else {
          this.body.setVelocityX(0);
        }
        break;
      }
      case 'lunge_windup': {
        this.body.setVelocityX(0);
        this.positionTelegraph();
        if (t >= this.stateUntil) {
          this.telegraph.setVisible(false);
          this.startLungeActive(t);
        }
        break;
      }
      case 'lunge_active': {
        this.positionAttackHitbox();
        const hitWall =
          (this.dir === 1 && this.body.blocked.right) ||
          (this.dir === -1 && this.body.blocked.left);
        if (hitWall || t >= this.stateUntil) {
          this.body.setVelocityX(0);
          this.attackActive = false;
          this.attackHitbox.setVisible(false);
          this.state = 'lunge_recover';
          this.stateUntil = t + LUNGE_RECOVER_MS;
        }
        break;
      }
      case 'lunge_recover': {
        this.body.setVelocityX(0);
        if (t >= this.stateUntil) {
          this.state = 'approach';
          this.nextActionAt = t + POST_ATTACK_DELAY_MS * this.cooldownMul();
        }
        break;
      }
      case 'slam_rise': {
        const targetVx = Phaser.Math.Clamp(dx * 3, -320, 320);
        this.body.setVelocityX(targetVx);
        if (this.body.velocity.y >= -50 || t >= this.stateUntil) {
          this.state = 'slam_fall';
          this.stateUntil = t + 900;
          this.body.setVelocityY(SLAM_FALL_VY);
        }
        break;
      }
      case 'slam_fall': {
        const targetVx = Phaser.Math.Clamp(dx * 2, -200, 200);
        this.body.setVelocityX(targetVx);
        if (onGround) {
          this.state = 'slam_land';
          this.stateUntil = t + SLAM_LAND_MS;
          this.body.setVelocityX(0);
          this.attackActive = true;
          this.attackHitbox.setSize(SLAM_SHOCKWAVE_W, SLAM_SHOCKWAVE_H);
          this.attackHitbox.setVisible(true);
          this.positionSlamHitbox();
          this.spawnShockwave();
          this.scene.cameras.main.shake(240, 0.016);
          this.scene.events.emit(EV.bossSlam);
        }
        break;
      }
      case 'slam_land': {
        this.body.setVelocityX(0);
        this.positionSlamHitbox();
        if (t >= this.stateUntil) {
          this.attackActive = false;
          this.attackHitbox.setVisible(false);
          this.state = 'slam_recover';
          this.stateUntil = t + SLAM_RECOVER_MS;
        }
        break;
      }
      case 'slam_recover': {
        this.body.setVelocityX(0);
        if (t >= this.stateUntil) {
          this.state = 'approach';
          this.nextActionAt = t + POST_ATTACK_DELAY_MS * this.cooldownMul();
        }
        break;
      }
    }
  }

  private choosePattern(t: number, dx: number) {
    const r = Math.random();
    const dist = Math.abs(dx);
    if (dist < 200) {
      this.startLungeWindup(t);
      return;
    }
    if (this.phase === 1) {
      if (r < 0.55) this.startLungeWindup(t);
      else this.startSlam(t);
    } else {
      if (r < 0.4) this.startLungeWindup(t);
      else this.startSlam(t);
    }
  }

  private startLungeWindup(t: number) {
    this.state = 'lunge_windup';
    const windup = LUNGE_WINDUP_MS * this.cooldownMul();
    this.stateUntil = t + windup;
    this.body.setVelocityX(0);
    this.attackHitbox.setSize(LUNGE_REACH, LUNGE_HEIGHT);
    this.telegraph.setScale(LUNGE_REACH / 128, (LUNGE_HEIGHT / 96) * 0.7);
    this.telegraph.setFlipX(this.dir < 0);
    this.telegraph.setAngle(this.dir < 0 ? -8 : 8);
    this.telegraph.setAlpha(0);
    this.telegraph.setVisible(true);
    this.positionTelegraph();
    this.scene.tweens.killTweensOf(this.telegraph);
    this.scene.tweens.add({
      targets: this.telegraph,
      alpha: 0.55,
      duration: windup,
      ease: 'Sine.Out',
    });
    this.scene.events.emit(EV.bossTelegraph);
  }

  private startLungeActive(t: number) {
    this.state = 'lunge_active';
    this.stateUntil = t + LUNGE_ACTIVE_MS;
    this.attackActive = true;
    this.attackHitbox.setVisible(true);
    this.scene.tweens.killTweensOf(this.telegraph);
    this.telegraph.setVisible(false);
    this.playAttackFlash(LUNGE_REACH, LUNGE_HEIGHT);
    this.body.setVelocityX(LUNGE_SPEED * this.speedMul() * this.dir);
    this.scene.events.emit(EV.bossLunge);
  }

  private playAttackFlash(reach: number, height: number) {
    const x = this.obj.x + this.dir * (WIDTH / 2 + reach / 2);
    this.attackFlash.setPosition(x, this.obj.y);
    const sx = reach / 128;
    const sy = height / 96;
    this.attackFlash.setScale(sx, sy);
    this.attackFlash.setFlipX(this.dir < 0);
    this.attackFlash.setAngle(this.dir < 0 ? -14 : 14);
    this.attackFlash.setAlpha(0.95);
    this.attackFlash.setVisible(true);
    this.scene.tweens.killTweensOf(this.attackFlash);
    this.scene.tweens.add({
      targets: this.attackFlash,
      alpha: 0,
      scaleX: sx * 1.25,
      scaleY: sy,
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => this.attackFlash.setVisible(false),
    });
  }

  triggerLandingShockwave() {
    this.spawnShockwave();
  }

  triggerEntranceShockwave(worldW: number, groundY: number) {
    const t = this.scene.time.now;
    const damageH = 36;
    const damageY = groundY - damageH / 2;
    if (!this.entranceShockwaveHitbox) {
      this.entranceShockwaveHitbox = this.scene.add
        .rectangle(worldW / 2, damageY, worldW, damageH, 0xffffff, 0)
        .setVisible(false);
    } else {
      this.entranceShockwaveHitbox.setPosition(worldW / 2, damageY);
      this.entranceShockwaveHitbox.setSize(worldW, damageH);
    }
    this.entranceShockwaveUntil = t + 340;
    this.spawnShockwave();
    this.spawnGroundWave(this.obj.x, groundY, -1, worldW);
    this.spawnGroundWave(this.obj.x, groundY, 1, worldW);
  }

  private spawnGroundWave(cx: number, groundY: number, dir: 1 | -1, worldW: number) {
    const baseY = groundY - 22;
    const wave = this.scene.add.graphics().setDepth(46).setPosition(cx, baseY);
    wave.fillStyle(0xfff0b0, 0.55);
    wave.fillEllipse(0, 0, 90, 38);
    wave.lineStyle(4, 0xffd977, 0.85);
    wave.strokeEllipse(0, 0, 90, 38);
    wave.lineStyle(2, 0xffffff, 0.6);
    wave.strokeEllipse(0, 0, 54, 22);
    const target = cx + dir * worldW;
    this.scene.tweens.add({
      targets: wave,
      x: target,
      scaleX: 2.0,
      scaleY: 0.55,
      alpha: 0,
      duration: 560,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
  }

  getEntranceShockwaveHitbox(): Phaser.GameObjects.Rectangle | undefined {
    if (this.scene.time.now < this.entranceShockwaveUntil) {
      return this.entranceShockwaveHitbox;
    }
    return undefined;
  }

  private spawnShockwave() {
    if (this.shockwaveGfx) {
      this.scene.tweens.killTweensOf(this.shockwaveGfx);
      this.shockwaveGfx.destroy();
    }
    const cx = this.obj.x;
    const cy = this.obj.y + HEIGHT / 2;
    const g = this.scene.add.graphics().setDepth(47).setPosition(cx, cy);
    g.fillStyle(0xfff0b0, 0.45);
    g.fillEllipse(0, 0, SLAM_SHOCKWAVE_W * 0.42, SLAM_SHOCKWAVE_H * 0.7);
    g.lineStyle(4, 0xffd977, 0.78);
    g.strokeEllipse(0, 0, SLAM_SHOCKWAVE_W * 0.42, SLAM_SHOCKWAVE_H * 0.7);
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokeEllipse(0, 0, SLAM_SHOCKWAVE_W * 0.28, SLAM_SHOCKWAVE_H * 0.5);
    this.shockwaveGfx = g;
    this.scene.tweens.add({
      targets: g,
      scaleX: 2.4,
      scaleY: 1.0,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.Out',
      onComplete: () => {
        g.destroy();
        if (this.shockwaveGfx === g) this.shockwaveGfx = undefined;
      },
    });
  }

  private startSlam(t: number) {
    this.state = 'slam_rise';
    this.stateUntil = t + SLAM_RISE_MS;
    this.body.setVelocityY(SLAM_JUMP_VY);
    this.scene.events.emit(EV.bossTelegraph);
  }

  private positionTelegraph() {
    const x = this.obj.x + this.dir * (WIDTH / 2 + LUNGE_REACH / 2);
    this.telegraph.setPosition(x, this.obj.y);
  }

  private positionAttackHitbox() {
    const x = this.obj.x + this.dir * (WIDTH / 2 + LUNGE_REACH / 2);
    this.attackHitbox.setPosition(x, this.obj.y);
  }

  private positionSlamHitbox() {
    this.attackHitbox.setPosition(
      this.obj.x,
      this.obj.y + HEIGHT / 2 + SLAM_SHOCKWAVE_H / 2,
    );
  }

  private updateVisual(t: number) {
    this.visual.setPosition(this.obj.x, this.obj.y - 8 + Math.sin(t / 180) * 1.6);
    this.visual.setFlipX(this.dir < 0);
    this.visual.setRotation(Phaser.Math.DegToRad(this.body.velocity.x * 0.004));
    this.shadow.setPosition(this.obj.x, this.obj.y + HEIGHT / 2 - 2);
    const airborne = Phaser.Math.Clamp(Math.abs(this.body.velocity.y) / 1600, 0, 1);
    this.shadow.setScale(1 - airborne * 0.28, 1);
    this.shadow.setAlpha(0.3 - airborne * 0.12);
  }
}
