import Phaser from 'phaser';
import { Player, PlayerKeys, PLAYER_MAX_HP, PLAYER_MAX_ENERGY, ATTACK_KNOCK_X } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { SavePoint } from '../entities/SavePoint';
import { sfx } from '../utils/Sfx';
import { STAGES, StageConfig } from '../stages';
import { gamepadButtonName, getBindings } from '../utils/KeyBindings';
import { loadSlot, recordDeath, writeSlot } from '../utils/save';
import { EV } from '../events';
import { spawnHitParticles } from '../utils/particles';
import { getActivePad, padBtn, readStick, type ReadablePad } from '../utils/Pad';
import { createMoonlitBackdrop, drawPlatformVisual, ensureArtTextures } from '../utils/art';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private boss?: Boss;
  private savePoints: SavePoint[] = [];
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private hpBoxes: Phaser.GameObjects.Arc[] = [];
  private energyFills: Phaser.GameObjects.Rectangle[] = [];
  private killText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private dashFill?: Phaser.GameObjects.Rectangle;
  private lastDashReady = true;
  private lowHpOverlay?: Phaser.GameObjects.Rectangle;
  private enemyTotal = 0;
  private enemiesKilled = 0;
  private stageCleared = false;
  private victoryShown = false;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private menuUpKey!: Phaser.Input.Keyboard.Key;
  private menuDownKey!: Phaser.Input.Keyboard.Key;
  private menuConfirmKey!: Phaser.Input.Keyboard.Key;
  private menuConfirmKey2!: Phaser.Input.Keyboard.Key;
  private menuState: 'none' | 'pause' | 'death' = 'none';
  private menuItems: Array<{ label: string; onSelect: () => void }> = [];
  private menuCursor = 0;
  private menuOverlayDom?: HTMLDivElement;

  private stageIndex = 0;
  private stage!: StageConfig;
  private worldW = 0;
  private worldH = 0;
  private transitioning = false;
  private entryFrom: 'left' | 'right' | 'start' | 'save' = 'start';

  private leftDoor?: Phaser.GameObjects.Rectangle;
  private rightDoor?: Phaser.GameObjects.Rectangle;
  private leftDoorArrow?: Phaser.GameObjects.Text;
  private doorIgnoreUntil = 0;
  private bossDoorLocked = false;
  private bossDoorBumpAt = 0;

  private bossHpBg?: Phaser.GameObjects.Rectangle;
  private bossHpFill?: Phaser.GameObjects.Rectangle;
  private bossHpFrame?: Phaser.GameObjects.Rectangle;
  private bossHpLabel?: Phaser.GameObjects.Text;
  private bossHpTargetWidth = 0;
  private bossIntroShown = false;
  private bossEntrancePending = false;
  private bossEntranceState: 'idle' | 'hovering' | 'falling' | 'done' = 'idle';
  private bossLandingWatcher?: Phaser.Time.TimerEvent;

  private hitStopActive = false;

  private padPrev: Record<string, boolean> = {};
  private padNow: Record<string, boolean> = {};
  private padAttackQueued = false;
  private hadPadLastSample = false;
  private padSyncFrames = 0;

  constructor() {
    super('GameScene');
  }

  private carriedHp: number | undefined;
  private carriedHits: number | undefined;
  private currentSlot = -1;

  init(data?: {
    stage?: number;
    from?: 'left' | 'right' | 'start' | 'save';
    hp?: number;
    hits?: number;
    slot?: number;
  }) {
    const idx = data?.stage ?? 0;
    this.stageIndex = ((idx % STAGES.length) + STAGES.length) % STAGES.length;
    this.stage = STAGES[this.stageIndex];
    this.worldW = this.stage.worldW;
    this.worldH = this.stage.worldH;
    this.entryFrom = data?.from ?? 'start';
    this.carriedHp = data?.hp;
    this.carriedHits = data?.hits;
    this.currentSlot = typeof data?.slot === 'number' ? data.slot : -1;
  }

  create() {
    this.enemies = [];
    this.savePoints = [];
    this.boss = undefined;
    this.hpBoxes = [];
    this.energyFills = [];
    this.dashFill = undefined;
    this.lastDashReady = true;
    this.lowHpOverlay = undefined;
    this.enemiesKilled = 0;
    this.stageCleared = false;
    this.victoryShown = false;
    this.menuState = 'none';
    this.menuItems = [];
    this.menuCursor = 0;
    if (this.menuOverlayDom) {
      this.menuOverlayDom.remove();
      this.menuOverlayDom = undefined;
    }
    this.removeMenuBlurBg();
    this.transitioning = false;
    this.bossHpBg = undefined;
    this.bossHpFill = undefined;
    this.bossHpFrame = undefined;
    this.bossHpLabel = undefined;
    this.bossHpTargetWidth = 0;
    this.bossIntroShown = false;
    this.bossEntrancePending = false;
    this.bossEntranceState = 'idle';
    this.bossLandingWatcher?.remove(false);
    this.bossLandingWatcher = undefined;
    this.bossDoorLocked = false;
    this.bossDoorBumpAt = 0;
    this.leftDoorArrow = undefined;
    this.hitStopActive = false;

    this.setupWorld();
    this.setupPlatforms();
    const keys = this.setupInput();
    this.spawnPlayerAndEnemies(keys);
    this.setupSavePoints();
    this.setupBoss();
    this.setupDoors();
    this.setupCamera();
    this.setupHUD();
    this.setupEvents();
    this.maybeShowIntroTutorial();
    this.doorIgnoreUntil = this.time.now + 600;
  }

  private setupWorld() {
    const w = this.worldW;
    const h = this.worldH;
    ensureArtTextures(this);
    this.physics.world.setBounds(0, 0, w, this.getGroundTop());
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    createMoonlitBackdrop(this, w, h);

    this.spawnParallaxLayer(0.18, 130, 0x111827, 0.42, -52);
    this.spawnParallaxLayer(0.38, 92, 0x172033, 0.76, -48);
    this.spawnParallaxLayer(0.66, 56, 0x202a3d, 0.68, -44);
  }

  private spawnParallaxLayer(
    scrollFactor: number,
    silhouetteWidth: number,
    color: number,
    alpha: number,
    depth: number,
  ) {
    const w = this.worldW;
    const h = this.worldH;
    const span = Math.ceil(w / 220);
    const yRange = Math.max(1, h - 600);
    const seed = Math.floor(scrollFactor * 100);
    const g = this.add
      .graphics()
      .setScrollFactor(scrollFactor)
      .setDepth(depth);
    g.fillStyle(color, alpha);
    for (let i = 0; i < span; i++) {
      const x = 160 + i * 220 + ((i + seed) * 53) % 60;
      const ph = 320 + (((i + seed) * 37) % 240) * 2;
      const baseY = (((i + seed) * 113) % yRange) + 40;
      const half = silhouetteWidth / 2;
      const peakSkew = (((i + seed) * 29) % 40) - 20;
      const shoulder = Math.min(ph * 0.45, 120 + ((i + seed) * 17) % 80);
      const bottomY = baseY + ph;
      g.beginPath();
      g.moveTo(x - half, bottomY);
      g.lineTo(x - half * 0.78, baseY + shoulder);
      g.lineTo(x + peakSkew, baseY);
      g.lineTo(x + half * 0.78, baseY + shoulder * 0.85);
      g.lineTo(x + half, bottomY);
      g.closePath();
      g.fillPath();
    }
  }

  private setupPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    const mainFloorThreshold = this.worldW * 0.9;
    for (const p of this.stage.platforms) {
      const isWall = p.h > p.w;
      const isMainFloor = p.w >= mainFloorThreshold;
      drawPlatformVisual(this, p, isMainFloor);
      const r = this.add.rectangle(p.x, p.y, p.w, p.h, 0xffffff, 0.001);
      r.setStrokeStyle(0, 0x000000, 0);
      if (!isWall && !isMainFloor) {
        this.physics.add.existing(r, true);
        this.platforms.add(r);
      }
    }
  }

  private setupInput(): PlayerKeys {
    const kb = this.input.keyboard!;
    const bindings = getBindings().keyboard;
    const captureList = [
      ...new Set([
        ...Object.values(bindings),
        'ESC',
        'ENTER',
      ]),
    ].join(',');
    kb.addCapture(captureList);
    this.input.mouse?.disableContextMenu();
    let mouseAttackQueued = false;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.menuState !== 'none' || this.transitioning) return;
      if (this.player?.isDead) return;
      if (pointer.leftButtonDown()) mouseAttackQueued = true;
    });
    const onBlur = () => {
      kb.resetKeys();
      if (
        this.menuState === 'none' &&
        !this.stageCleared &&
        !this.transitioning &&
        this.player &&
        !this.player.isDead
      ) {
        this.openPauseMenu();
      }
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.game.canvas.style.cursor = 'none';
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.game.canvas.style.cursor = '';
    });
    this.pauseKey = kb.addKey(bindings.pause);
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.menuUpKey = kb.addKey(bindings.up);
    this.menuDownKey = kb.addKey(bindings.down);
    this.menuConfirmKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.menuConfirmKey2 = kb.addKey(bindings.jump);

    const kbLeft = kb.addKey(bindings.left);
    const kbRight = kb.addKey(bindings.right);
    const kbUp = kb.addKey(bindings.up);
    const kbDown = kb.addKey(bindings.down);
    const kbJump = kb.addKey(bindings.jump);
    const kbAttack = kb.addKey(bindings.attack);
    const kbDash = kb.addKey(bindings.dash);
    const kbHeal = kb.addKey(bindings.heal);

    this.padPrev = {};
    this.padNow = {};
    this.padAttackQueued = false;
    this.hadPadLastSample = false;
    this.padSyncFrames = 0;

    return {
      left: () => kbLeft.isDown || this.padHeld('left'),
      right: () => kbRight.isDown || this.padHeld('right'),
      up: () => kbUp.isDown || this.padHeld('up'),
      down: () => kbDown.isDown || this.padHeld('down'),
      jumpDown: () => kbJump.isDown || this.padHeld('jump'),
      jumpJustDown: () =>
        Phaser.Input.Keyboard.JustDown(kbJump) || this.padJustDown('jump'),
      jumpJustUp: () =>
        Phaser.Input.Keyboard.JustUp(kbJump) || this.padJustUp('jump'),
      attackJustDown: () => {
        if (mouseAttackQueued) {
          mouseAttackQueued = false;
          return true;
        }
        if (Phaser.Input.Keyboard.JustDown(kbAttack)) return true;
        if (this.padAttackQueued) {
          this.padAttackQueued = false;
          return true;
        }
        return false;
      },
      dashJustDown: () =>
        Phaser.Input.Keyboard.JustDown(kbDash) || this.padJustDown('dash'),
      healDown: () => kbHeal.isDown || this.padHeld('heal'),
    };
  }

  private samplePad() {
    const out: Record<string, boolean> = {};
    const pad = this.getActivePad();
    if (pad) {
      const DZ = 0.3;
      const { x: stickX, y: stickY } = readStick(pad);
      const btn = (i: number) => padBtn(pad, i);
      const gp = getBindings().gamepad;
      const DU = btn(12), DD = btn(13), DL = btn(14), DR = btn(15);
      out.left = DL || stickX < -DZ;
      out.right = DR || stickX > DZ;
      out.up = DU || stickY < -DZ;
      out.down = DD || stickY > DZ;
      out.jump = btn(gp.jump);
      out.attack = btn(gp.attack);
      out.dash = btn(gp.dash);
      out.heal = btn(gp.heal);
      out.pause = btn(gp.pause);
    }
    const hasPad = !!pad;
    if (hasPad && !this.hadPadLastSample) {
      // Pad just (re)appeared. Phaser's Gamepad.update skips the first sync until
      // pad.timestamp > _created, so button states populate one frame late. Hold a
      // grace window where we keep padPrev synced to current so held buttons never
      // register as just-down across that gap.
      this.padSyncFrames = 8;
    }
    this.hadPadLastSample = hasPad;
    if (this.padSyncFrames > 0) {
      this.padPrev = out;
      this.padSyncFrames--;
    } else {
      this.padPrev = this.padNow;
    }
    this.padNow = out;
    if (out.attack && !this.padPrev.attack) {
      if (
        this.menuState === 'none' &&
        !this.transitioning &&
        this.player &&
        !this.player.isDead
      ) {
        this.padAttackQueued = true;
      }
    }
  }

  private getActivePad(): ReadablePad | undefined {
    return getActivePad(this);
  }

  private padHeld(k: string): boolean {
    return this.padNow[k] === true;
  }

  private padJustDown(k: string): boolean {
    return this.padNow[k] === true && this.padPrev[k] !== true;
  }

  private padJustUp(k: string): boolean {
    return this.padNow[k] !== true && this.padPrev[k] === true;
  }

  private spawnPlayerAndEnemies(keys: PlayerKeys) {
    const groundTop = this.getGroundTop();
    let sx = this.stage.playerStart.x;
    let sy = this.stage.playerStart.y;
    let checkpointHp: number | undefined;
    let checkpointHits: number | undefined;
    if (this.entryFrom === 'left') {
      sx = this.getLeftDoorX() + 120;
      sy = groundTop - 120;
    } else if (this.entryFrom === 'right') {
      sx = this.getRightDoorX() - 120;
      sy = groundTop - 120;
    } else if (this.entryFrom === 'save') {
      const save = this.currentSlot >= 0 ? loadSlot(this.currentSlot) : null;
      if (save && save.stage === this.stageIndex) {
        sx = save.x;
        sy = save.y - 40;
        checkpointHp = save.hp;
        checkpointHits = save.hits;
      }
    }
    this.player = new Player(this, sx, sy, keys);
    if (this.carriedHp !== undefined) {
      this.player.hp = Math.max(1, Math.min(this.carriedHp, this.player.hp));
    } else if (checkpointHp !== undefined) {
      this.player.hp = Math.max(1, Math.min(checkpointHp, PLAYER_MAX_HP));
    }
    if (this.carriedHits !== undefined) {
      this.player.hits = Math.max(0, Math.min(PLAYER_MAX_ENERGY * 3, this.carriedHits));
    } else if (checkpointHits !== undefined) {
      this.player.hits = Math.max(0, Math.min(PLAYER_MAX_ENERGY * 3, checkpointHits));
    }
    this.physics.add.collider(this.player.obj, this.platforms);
    for (const cfg of this.stage.enemies) {
      const e = new Enemy(this, cfg.x, cfg.y, cfg.range);
      this.enemies.push(e);
      this.physics.add.collider(e.obj, this.platforms);
    }
    const attackerCount = Math.floor(this.stage.enemies.length / 2);
    for (let i = 0; i < attackerCount; i++) {
      const base = this.stage.enemies[i];
      const offset = Math.max(80, Math.min(base.range, 160));
      const ax = Phaser.Math.Clamp(base.x + offset, 120, this.worldW - 120);
      const e = new Enemy(this, ax, base.y, base.range, true);
      this.enemies.push(e);
      this.physics.add.collider(e.obj, this.platforms);
    }
    this.enemyTotal = this.enemies.length;
  }

  private getGroundTop(): number {
    return this.getGroundTopForStage(this.stage);
  }

  private getGroundTopForStage(stage: StageConfig): number {
    let top = stage.worldH;
    for (const p of stage.platforms) {
      if (p.w >= stage.worldW * 0.9) {
        const t = p.y - p.h / 2;
        if (t < top) top = t;
      }
    }
    return top;
  }

  private normalizeStageIndex(idx: number): number {
    return ((idx % STAGES.length) + STAGES.length) % STAGES.length;
  }

  private checkpointForStageEntry(
    stageIndex: number,
    from: 'left' | 'right' | 'start' | 'save' = 'start',
  ) {
    const normalized = this.normalizeStageIndex(stageIndex);
    const stage = STAGES[normalized];
    const groundTop = this.getGroundTopForStage(stage);
    let x = stage.playerStart.x;
    let y = stage.playerStart.y;
    if (from === 'left') {
      x = 50 + 120;
      y = groundTop - 120;
    } else if (from === 'right') {
      x = stage.worldW - 50 - 120;
      y = groundTop - 120;
    }
    return { stage: normalized, x, y: y + 40 };
  }

  private getLeftDoorX(): number {
    return 140;
  }

  private getRightDoorX(): number {
    return this.worldW - 140;
  }

  private setupDoors() {
    const groundTop = this.getGroundTop();
    const w = 80;
    const h = 150;
    const ly = groundTop - h / 2;
    const arrowStyle = { fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif', fontSize: '34px', color: '#ffe680' };
    const pulse: Phaser.GameObjects.Rectangle[] = [];
    if (!this.stage.noLeftDoor) {
      const lx = this.getLeftDoorX();
      this.leftDoor = this.add
        .rectangle(lx, ly, w, h, 0x2a2a52, 0.85)
        .setStrokeStyle(3, 0xffe680);
      this.leftDoorArrow = this.add.text(lx, ly, '<', arrowStyle).setOrigin(0.5);
      pulse.push(this.leftDoor);
    }
    if (!this.stage.noRightDoor) {
      const rx = this.getRightDoorX();
      this.rightDoor = this.add
        .rectangle(rx, ly, w, h, 0x2a2a52, 0.85)
        .setStrokeStyle(3, 0xffe680);
      this.add.text(rx, ly, '>', arrowStyle).setOrigin(0.5);
      pulse.push(this.rightDoor);
    }
    if (pulse.length) {
      this.tweens.add({
        targets: pulse,
        alpha: 0.55,
        yoyo: true,
        repeat: -1,
        duration: 900,
        ease: 'Sine.InOut',
      });
    }
    if ((this.bossEntrancePending || this.boss) && this.leftDoor) {
      this.lockBossDoor();
    }
  }

  private lockBossDoor() {
    if (!this.leftDoor || this.bossDoorLocked) return;
    this.bossDoorLocked = true;
    this.tweens.killTweensOf(this.leftDoor);
    this.leftDoor.setFillStyle(0x3a141e, 0.9);
    this.leftDoor.setStrokeStyle(3, 0xff4d6d);
    this.leftDoor.setAlpha(0.95);
    this.leftDoorArrow?.setText('✕');
    this.leftDoorArrow?.setColor('#ff4d6d');
  }

  private unlockBossDoor() {
    if (!this.leftDoor || !this.bossDoorLocked) return;
    this.bossDoorLocked = false;
    this.leftDoor.setFillStyle(0x2a2a52, 0.85);
    this.leftDoor.setStrokeStyle(3, 0xffe680);
    this.leftDoorArrow?.setText('<');
    this.leftDoorArrow?.setColor('#ffe680');
    this.tweens.add({
      targets: this.leftDoor,
      alpha: 0.55,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.InOut',
    });
  }

  private bumpBossDoor() {
    if (!this.leftDoor) return;
    const now = this.time.now;
    if (now - this.bossDoorBumpAt < 220) return;
    this.bossDoorBumpAt = now;
    sfx.doorLocked();
    this.tweens.killTweensOf(this.leftDoor);
    const baseX = this.getLeftDoorX();
    this.leftDoor.x = baseX;
    this.tweens.add({
      targets: this.leftDoor,
      x: baseX - 6,
      yoyo: true,
      repeat: 2,
      duration: 50,
      onComplete: () => {
        if (this.leftDoor) this.leftDoor.x = baseX;
      },
    });
  }

  private setupSavePoints() {
    const groundTop = this.getGroundTop();
    for (const sp of this.stage.savePoints ?? []) {
      const y = Math.min(sp.y, groundTop - 36);
      this.savePoints.push(new SavePoint(this, sp.x, y));
    }
  }

  private setupBoss() {
    if (!this.stage.boss) return;
    // Boss spawns from the sky once the player reaches the centre of the stage.
    this.bossEntrancePending = true;
  }

  private checkDoors() {
    if (this.transitioning) return;
    if (this.time.now < this.doorIgnoreUntil) return;
    if (this.player.isDead) return;
    if (this.boss?.isDead) return;
    const px = this.player.obj.x;
    const vx = this.player.body.velocity.x;
    const DOOR_BAND = 32;
    const nearLeft = !this.stage.noLeftDoor && Math.abs(px - this.getLeftDoorX()) < DOOR_BAND;
    if (nearLeft && vx < -10) {
      if (this.bossDoorLocked) {
        this.bumpBossDoor();
      } else {
        this.enterDoor('left');
      }
    } else if (
      !this.stage.noRightDoor &&
      Math.abs(px - this.getRightDoorX()) < DOOR_BAND &&
      vx > 10
    ) {
      this.enterDoor('right');
    }
  }

  private enterDoor(side: 'left' | 'right') {
    if (this.transitioning) return;
    const nextIdx =
      side === 'right' ? this.stageIndex + 1 : this.stageIndex - 1;
    const arriveFrom: 'left' | 'right' = side === 'right' ? 'left' : 'right';
    this.writeCheckpoint(nextIdx, arriveFrom, this.player.hp, this.player.hits);
    this.startTransition({
      stage: nextIdx,
      from: arriveFrom,
      hp: this.player.hp,
      hits: this.player.hits,
      duration: 400,
    });
  }

  private writeCheckpoint(
    stage: number,
    from: 'left' | 'right' | 'start' | 'save',
    hp: number,
    hits: number,
  ) {
    if (this.currentSlot < 0) return;
    writeSlot(this.currentSlot, {
      ...this.checkpointForStageEntry(stage, from),
      hp,
      hits,
    });
    this.showHudToast('自動記錄');
  }

  private startTransition(opts: {
    stage: number;
    from?: 'left' | 'right' | 'start' | 'save';
    hp?: number;
    hits?: number;
    duration: number;
  }) {
    if (this.transitioning) return;
    this.transitioning = true;
    let restarted = false;
    const doRestart = () => {
      if (restarted) return;
      restarted = true;
      this.scene.restart({
        stage: opts.stage,
        from: opts.from,
        hp: opts.hp,
        hits: opts.hits,
        slot: this.currentSlot,
      });
    };
    this.cameras.main.fadeOut(opts.duration, 0, 0, 0);
    this.time.delayedCall(opts.duration + 40, doRestart);
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player.obj, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(280, 180);
  }

  private setupHUD() {
    const hpStartX = 90;
    for (let i = 0; i < PLAYER_MAX_HP; i++) {
      this.add
        .circle(hpStartX + i * 60, 52, 25, 0x0a0a14, 0.7)
        .setStrokeStyle(2, 0xffd6e0, 0.28)
        .setScrollFactor(0)
        .setDepth(99);
      const r = this.add
        .circle(hpStartX + i * 60, 52, 17, 0xff4d6d, 0.95)
        .setStrokeStyle(3, 0xffccd6, 0.9)
        .setScrollFactor(0)
        .setDepth(100);
      r.setVisible(i < this.player.hp);
      this.hpBoxes.push(r);
    }
    const hudLeftX = 65;
    const energyW = 26;
    const energyH = 14;
    const energyStartX = hudLeftX + energyW / 2;
    for (let i = 0; i < PLAYER_MAX_ENERGY; i++) {
      const cx = energyStartX + i * 34;
      this.add
        .rectangle(cx, 100, energyW, energyH)
        .setStrokeStyle(2, 0xffffff, 0.45)
        .setScrollFactor(0)
        .setDepth(100);
      const fill = this.add
        .rectangle(cx - energyW / 2 + 1, 100, energyW - 2, energyH - 2, 0x88ffcc, 0.9)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(101);
      fill.scaleX = Math.max(0, Math.min(1, this.player.energy - i));
      this.energyFills.push(fill);
    }
    this.add
      .rectangle(hudLeftX, 132, 96, 12, 0x0a0a14, 0.75)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(100);
    this.dashFill = this.add
      .rectangle(hudLeftX + 1, 132, 94, 10, 0x88aaff, 0.9)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);
    this.killText = this.add
      .text(this.scale.width - 48, 52, '', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '28px',
        color: '#c0c0d8',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setShadow(0, 0, '#000000', 8);
    this.add
      .text(
        this.scale.width / 2,
        52,
        `${this.stage.name} · STAGE ${this.stageIndex + 1} / ${STAGES.length}`,
        { fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif', fontSize: '28px', color: '#c0c0d8' },
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setShadow(0, 0, '#000000', 8);
    this.objectiveText = this.add
      .text(this.scale.width / 2, 92, '', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '22px',
        color: '#8f8faa',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.lowHpOverlay = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x4a0018, 0)
      .setScrollFactor(0)
      .setDepth(90);
    this.updateKillText();
    this.updateObjectiveText();
    this.setupBossHud();
  }

  private setupBossHud() {
    if (!this.stage.boss) return;
    const cx = this.scale.width / 2;
    const y = this.scale.height - 64;
    const w = 720;
    const h = 22;
    this.bossHpLabel = this.add
      .text(cx, y - 28, this.stage.name, {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '26px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);
    this.bossHpBg = this.add
      .rectangle(cx, y, w, h, 0x14141e, 0.85)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);
    this.bossHpFill = this.add
      .rectangle(cx - w / 2 + 2, y, w - 4, h - 4, 0xff3858)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setAlpha(0);
    this.bossHpTargetWidth = 1;
    this.bossHpFrame = this.add
      .rectangle(cx, y, w, h)
      .setStrokeStyle(2, 0xffe680, 0.9)
      .setScrollFactor(0)
      .setDepth(102)
      .setAlpha(0);
  }

  private revealBossHud() {
    const targets: Phaser.GameObjects.GameObject[] = [];
    if (this.bossHpBg) targets.push(this.bossHpBg);
    if (this.bossHpFill) targets.push(this.bossHpFill);
    if (this.bossHpFrame) targets.push(this.bossHpFrame);
    if (this.bossHpLabel) targets.push(this.bossHpLabel);
    if (targets.length === 0) return;
    this.tweens.add({ targets, alpha: 1, duration: 480, ease: 'Cubic.Out' });
  }

  private triggerBossEntrance() {
    if (!this.stage.boss || this.bossEntranceState !== 'idle') return;
    try {
      this.bossEntrancePending = false;
      this.bossEntranceState = 'hovering';
      this.bossIntroShown = true;
      this.transitioning = true;

      const bx = this.stage.boss.x;
      const by = this.stage.boss.y;
      const skyY = Math.max(60, by - 720);

      const boss = new Boss(this, bx, skyY);
      this.boss = boss;
      this.physics.add.collider(boss.obj, this.platforms);
      boss.body.setAllowGravity(false);
      boss.body.setVelocity(0, 0);
      boss.visual.setAlpha(0);

      // Freeze the player in place for the duration of the cutscene so they
      // don't drift under leftover velocity / gravity and "teleport" when the
      // camera returns.
      this.player.body.setVelocity(0, 0);
      this.player.body.setAcceleration(0, 0);
      this.player.body.setAllowGravity(false);

      const cam = this.cameras.main;
      cam.stopFollow();
      cam.pan(bx, skyY, 900, 'Sine.easeInOut');
      cam.zoomTo(1.4, 900, 'Sine.easeInOut');
      this.tweens.add({
        targets: boss.visual,
        alpha: 1,
        duration: 700,
        ease: 'Cubic.Out',
      });

      const HOVER_MS = 3000;
      this.time.delayedCall(900, () => {
        if (!this.boss || this.bossEntranceState !== 'hovering') return;
        cam.shake(HOVER_MS, 0.009);
        this.spawnBossAura(bx, skyY);
        this.tweens.add({
          targets: this.boss.visual,
          y: this.boss.visual.y - 22,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        this.tweens.add({
          targets: this.boss.visual,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        this.showBossEntranceTitle();
      });

      this.time.delayedCall(900 + HOVER_MS, () => this.dropBoss());
      // Fail-safe: if landing watcher never fires, force complete after 8s.
      this.time.delayedCall(900 + HOVER_MS + 4000, () => {
        if (this.bossEntranceState !== 'done') this.onBossLanded();
      });
    } catch (err) {
      console.error('boss entrance failed', err);
      this.transitioning = false;
      this.bossEntranceState = 'done';
      this.player.body.setAllowGravity(true);
      this.cameras.main.zoomTo(1.0, 0);
      this.cameras.main.startFollow(this.player.obj, true, 0.12, 0.12);
    }
  }

  private spawnBossAura(x: number, y: number) {
    const g = this.add.graphics().setDepth(29).setPosition(x, y);
    g.fillStyle(0xff5577, 0.28);
    g.fillCircle(0, 0, 160);
    g.fillStyle(0xff8aa8, 0.22);
    g.fillCircle(0, 0, 100);
    g.fillStyle(0xffd6e0, 0.34);
    g.fillCircle(0, 0, 50);
    this.tweens.add({
      targets: g,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.55,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => g.destroy());
    this.time.delayedCall(3000, () => {
      this.tweens.killTweensOf(g);
      this.tweens.add({
        targets: g,
        alpha: 0,
        duration: 320,
        onComplete: () => g.destroy(),
      });
    });
  }

  private showBossEntranceTitle() {
    const w = this.scale.width;
    const h = this.scale.height;
    const name = this.stage.name;
    const titleText = this.add
      .text(w / 2, h / 2 - 30, name, {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '140px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0)
      .setShadow(0, 0, '#ff8aa8', 26, true, true);
    const subText = this.add
      .text(w / 2, h / 2 + 90, '臨於此', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '40px',
        color: '#f3d6dd',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({
      targets: [titleText, subText],
      alpha: 1,
      duration: 520,
      ease: 'Cubic.Out',
    });
    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: [titleText, subText],
        alpha: 0,
        duration: 520,
        onComplete: () => {
          titleText.destroy();
          subText.destroy();
        },
      });
    });
  }

  private dropBoss() {
    if (!this.boss || this.bossEntranceState !== 'hovering') return;
    this.bossEntranceState = 'falling';
    this.tweens.killTweensOf(this.boss.visual);
    this.boss.visual.setScale(1, 1);
    this.boss.visual.setPosition(this.boss.obj.x, this.boss.obj.y - 8);
    this.boss.body.setAllowGravity(true);
    this.boss.body.setVelocityY(200);
    this.bossLandingWatcher?.remove(false);
    this.bossLandingWatcher = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        if (!this.boss || this.bossEntranceState !== 'falling') {
          this.bossLandingWatcher?.remove(false);
          this.bossLandingWatcher = undefined;
          return;
        }
        if (this.boss.body.blocked.down) {
          this.bossLandingWatcher?.remove(false);
          this.bossLandingWatcher = undefined;
          this.onBossLanded();
        }
      },
    });
  }

  private onBossLanded() {
    if (this.bossEntranceState === 'done') return;
    this.bossEntranceState = 'done';
    this.bossLandingWatcher?.remove(false);
    this.bossLandingWatcher = undefined;
    if (!this.boss) {
      this.cameras.main.zoomTo(1.0, 400, 'Sine.easeInOut');
      this.player.body.setAllowGravity(true);
      this.transitioning = false;
      this.cameras.main.startFollow(this.player.obj, true, 0.12, 0.12);
      return;
    }
    const cam = this.cameras.main;
    cam.shake(320, 0.026);
    this.boss.triggerLandingShockwave();
    this.tweens.add({
      targets: this.boss.visual,
      scaleX: 1.25,
      scaleY: 0.85,
      duration: 90,
      yoyo: true,
      ease: 'Cubic.Out',
    });
    cam.pan(this.player.obj.x, this.player.obj.y, 600, 'Sine.easeInOut');
    cam.zoomTo(1.0, 600, 'Sine.easeInOut');
    this.time.delayedCall(640, () => {
      cam.startFollow(this.player.obj, true, 0.12, 0.12);
      cam.setDeadzone(280, 180);
      this.player.body.setAllowGravity(true);
      this.transitioning = false;
      this.revealBossHud();
    });
  }

  private updateBossHud() {
    if (!this.boss || !this.bossHpFill) return;
    const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
    if (Math.abs(ratio - this.bossHpTargetWidth) < 0.001) return;
    this.bossHpTargetWidth = ratio;
    this.tweens.killTweensOf(this.bossHpFill);
    this.tweens.add({
      targets: this.bossHpFill,
      scaleX: ratio,
      duration: 280,
      ease: 'Cubic.Out',
    });
  }

  private setupEvents() {
    for (const e of Object.values(EV)) this.events.off(e);
    this.events.on(EV.playerHp, (hp: number, healed?: boolean) => {
      this.hpBoxes.forEach((b, i) => b.setVisible(i < hp));
      this.updateLowHpOverlay();
      if (!healed) sfx.playerHurt();
    });
    this.events.on(EV.playerEnergy, (e: number) => {
      this.energyFills.forEach((b, i) => {
        const target = Math.max(0, Math.min(1, e - i));
        this.tweens.killTweensOf(b);
        this.tweens.add({
          targets: b,
          scaleX: target,
          duration: 160,
          ease: 'Cubic.Out',
        });
      });
    });
    this.events.on(EV.playerHeal, () => sfx.save());
    this.events.on(EV.playerHealStart, () => sfx.dash());
    this.events.on(EV.enemyDied, () => sfx.enemyDie());
    this.events.on(EV.enemyHit, () => sfx.hitEnemy());
    this.events.on(EV.playerJump, () => sfx.jump());
    this.events.on(EV.playerAttack, () => sfx.attack());
    this.events.on(EV.playerDash, () => sfx.dash());
    this.events.on(EV.bossLunge, () => sfx.attack());
    this.events.on(EV.bossSlam, () => sfx.bossSlam());
    this.events.on(EV.bossTelegraph, () => sfx.bossTelegraph());
    this.events.on(EV.saveRegistered, () => sfx.save());
    this.events.on(EV.bossDied, () => {
      sfx.stageClear();
      this.unlockBossDoor();
      this.updateObjectiveText();
      this.time.delayedCall(900, () => this.showVictory());
    });
    this.events.on(EV.playerDead, () => {
      this.time.delayedCall(120, () => this.openDeathMenu());
    });
  }

  private updateKillText() {
    this.killText.setText(`敵 ${this.enemiesKilled} / ${this.enemyTotal}`);
    this.updateObjectiveText();
  }

  private updateObjectiveText() {
    if (!this.objectiveText) return;
    if (this.boss) {
      this.objectiveText.setText(
        this.boss.isDead ? '目標  返回出口' : `目標  討伐 ${this.stage.name}`,
      );
      return;
    }
    if (this.enemyTotal === 0) {
      this.objectiveText.setText('目標  前往出口');
      return;
    }
    if (this.enemiesKilled >= this.enemyTotal) {
      this.objectiveText.setText('目標  前往下一處');
      return;
    }
    this.objectiveText.setText(`目標  擊破敵人 ${this.enemiesKilled}/${this.enemyTotal}`);
  }

  private updateDashHud(t: number) {
    if (!this.dashFill) return;
    const progress = this.player.dashCooldownProgress(t);
    this.dashFill.scaleX = progress;
    this.dashFill.fillColor = progress >= 1 ? 0x88aaff : 0x4e5d88;
    if (!this.lastDashReady && progress >= 1) {
      this.tweens.add({
        targets: this.dashFill,
        alpha: 0.35,
        yoyo: true,
        duration: 120,
      });
    }
    this.lastDashReady = progress >= 1;
  }

  private updateLowHpOverlay() {
    if (!this.lowHpOverlay) return;
    const target = this.player.hp <= 1 && !this.player.isDead ? 0.18 : 0;
    if (Math.abs(this.lowHpOverlay.alpha - target) < 0.01) return;
    this.tweens.killTweensOf(this.lowHpOverlay);
    this.tweens.add({
      targets: this.lowHpOverlay,
      alpha: target,
      duration: 180,
      ease: 'Sine.Out',
    });
  }

  private showStageClear() {
    if (this.stageCleared) return;
    this.stageCleared = true;
    this.updateObjectiveText();
    sfx.stageClear();
    const w = this.scale.width;
    const h = this.scale.height;
    const txt = this.add
      .text(w / 2, h / 2 - 40, '本關清空', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '72px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    const sub = this.add
      .text(w / 2, h / 2 + 36, '前進到下一處', {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '24px',
        color: '#c0c0d8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    this.tweens.add({
      targets: [txt, sub],
      alpha: 1,
      duration: 360,
      yoyo: true,
      hold: 1100,
      onComplete: () => {
        txt.destroy();
        sub.destroy();
      },
    });
  }

  private showVictory() {
    if (this.victoryShown) return;
    this.victoryShown = true;
    const w = this.scale.width;
    const h = this.scale.height;
    this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(199);
    const txt = this.add
      .text(w / 2, h / 2 - 30, '終', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '180px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
    const sub = this.add
      .text(w / 2, h / 2 + 110, '月臨於此', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '36px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({ targets: [txt, sub], alpha: 1, duration: 900 });
    this.time.delayedCall(3200, () => {
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.time.delayedCall(760, () => this.scene.start('TitleScene'));
    });
  }

  private registerSave(sp: SavePoint) {
    sp.activate();
    if (this.player.hp < PLAYER_MAX_HP) {
      this.player.hp = PLAYER_MAX_HP;
      this.events.emit(EV.playerHp, this.player.hp, true);
    }
    if (this.currentSlot >= 0) {
      writeSlot(this.currentSlot, {
        stage: this.stageIndex,
        x: sp.x,
        y: sp.y,
        hp: this.player.hp,
        hits: this.player.hits,
      });
    }
    this.events.emit(EV.saveRegistered);
    this.showSaveToast(sp.x, sp.y);
    this.maybeShowHealTutorial();
  }

  private showHudToast(text: string) {
    const toast = this.add
      .text(this.scale.width - 48, 96, text, {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffe680',
        backgroundColor: '#0a0a14cc',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(160)
      .setAlpha(0);
    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 180,
      yoyo: true,
      hold: 900,
      onComplete: () => toast.destroy(),
    });
  }

  private showSaveToast(x: number, y: number) {
    const txt = this.add
      .text(x, y - 60, '已記錄', {
        fontFamily: '"Noto Serif TC", "Cinzel", Georgia, serif',
        fontSize: '32px',
        color: '#ffe680',
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0);
    this.tweens.add({
      targets: txt,
      alpha: 1,
      y: y - 80,
      duration: 280,
      ease: 'Cubic.Out',
    });
    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: y - 120,
      delay: 900,
      duration: 600,
      onComplete: () => txt.destroy(),
    });
  }

  private maybeShowIntroTutorial() {
    if (this.stageIndex !== 0 || this.entryFrom !== 'start') return;
    try {
      if (localStorage.getItem('muyue-tutorial-intro-v2')) return;
      localStorage.setItem('muyue-tutorial-intro-v2', '1');
    } catch {
      return;
    }
    const bindings = getBindings();
    const kb = bindings.keyboard;
    const gp = bindings.gamepad;
    const lines = [
      `${kb.left}/${kb.right} 移動 · ${kb.jump} 跳躍 · ${kb.dash} 衝刺`,
      `${kb.attack} 或滑鼠左鍵攻擊 · ${kb.up}/${kb.down} 調整斬擊方向`,
      `手把 ${gamepadButtonName(gp.jump)} 跳 · ${gamepadButtonName(gp.attack)} 攻擊 · ${gamepadButtonName(gp.dash)} 衝刺`,
    ];
    const hint = this.add
      .text(this.scale.width / 2, this.scale.height - 150, lines.join('\n'), {
        fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffe680',
        align: 'center',
        backgroundColor: '#0a0a14dd',
        padding: { left: 20, right: 20, top: 14, bottom: 14 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(160)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 1,
      duration: 360,
      hold: 5200,
      yoyo: true,
      onComplete: () => hint.destroy(),
    });
  }

  private maybeShowHealTutorial() {
    try {
      if (localStorage.getItem('muyue-tutorial-heal-v1')) return;
      localStorage.setItem('muyue-tutorial-heal-v1', '1');
    } catch {
      return;
    }
    const w = this.scale.width;
    const h = this.scale.height;
    const bindings = getBindings();
    const kb = bindings.keyboard.heal;
    const gp = bindings.gamepad.heal;
    const hint = this.add
      .text(
        w / 2,
        h - 200,
        `集滿能量後長按 ${kb} 或手把 ${gamepadButtonName(gp)} 可消耗一格能量回 1 顆心`,
        {
          fontFamily: '"Noto Sans TC", "Inter", system-ui, sans-serif',
          fontSize: '22px',
          color: '#ffe680',
          backgroundColor: '#0a0a14cc',
          padding: { left: 18, right: 18, top: 12, bottom: 12 },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 1,
      duration: 360,
      hold: 4200,
      yoyo: true,
      onComplete: () => hint.destroy(),
    });
  }

  private buildMenu(
    title: string,
    items: Array<{ label: string; onSelect: () => void }>,
    titleColor: string,
  ) {
    this.destroyMenu();
    this.menuItems = items;

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(5, 6, 12, 0.5)',
      'z-index:1000',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'font-family:"Noto Serif TC","Cinzel",Georgia,serif',
      'color:#e8e8f0',
      'user-select:none',
      '-webkit-user-select:none',
      'opacity:0',
      'transition:opacity 220ms ease-out',
      'cursor:default',
    ].join(';');

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = [
      `font-size:clamp(56px, 6vw, 96px)`,
      `color:${titleColor}`,
      `text-shadow:0 0 18px ${titleColor}aa`,
      `margin-bottom:64px`,
      `letter-spacing:0.08em`,
      `font-weight:700`,
    ].join(';');
    overlay.appendChild(titleEl);

    items.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.textContent = items[i].label;
      btn.dataset.idx = String(i);
      btn.style.cssText = [
        'background:none',
        'border:none',
        'font-family:inherit',
        'font-weight:700',
        'font-size:clamp(24px, 2.4vw, 40px)',
        'color:#e8e8f0',
        'cursor:pointer',
        'padding:12px 32px',
        'margin:4px 0',
        'transition:color 160ms ease, transform 160ms ease, text-shadow 160ms ease',
        'outline:none',
      ].join(';');
      btn.addEventListener('mouseenter', () => {
        this.menuCursor = i;
        this.refreshMenuCursor();
      });
      btn.addEventListener('click', () => {
        this.menuCursor = i;
        this.confirmMenu();
      });
      overlay.appendChild(btn);
    });

    document.body.appendChild(overlay);
    this.menuOverlayDom = overlay;
    requestAnimationFrame(() => {
      if (this.menuOverlayDom === overlay) overlay.style.opacity = '1';
    });

    this.menuCursor = 0;
    this.refreshMenuCursor();
  }

  private refreshMenuCursor() {
    if (!this.menuOverlayDom) return;
    const buttons = this.menuOverlayDom.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((btn, i) => {
      if (i === this.menuCursor) {
        btn.style.color = '#ffe680';
        btn.style.transform = 'scale(1.08)';
        btn.style.textShadow = '0 0 14px rgba(255, 230, 128, 0.55)';
      } else {
        btn.style.color = '#e8e8f0';
        btn.style.transform = 'scale(1)';
        btn.style.textShadow = '0 0 8px rgba(0, 0, 0, 0.45)';
      }
    });
  }

  private moveMenuCursor(delta: number) {
    if (this.menuItems.length === 0) return;
    this.menuCursor =
      (((this.menuCursor + delta) % this.menuItems.length) +
        this.menuItems.length) %
      this.menuItems.length;
    this.refreshMenuCursor();
  }

  private confirmMenu() {
    this.menuItems[this.menuCursor]?.onSelect();
  }

  private destroyMenu() {
    this.removeMenuBlurBg();
    if (this.menuOverlayDom) {
      this.menuOverlayDom.remove();
      this.menuOverlayDom = undefined;
    }
    this.menuItems = [];
    this.menuCursor = 0;
  }

  private addMenuBlurBg() {
    if (this.menuState === 'none') return;
    const canvas = this.game.canvas;
    if (!canvas) return;
    canvas.style.transition = 'filter 220ms ease-out';
    canvas.style.filter = 'blur(10px)';
  }

  private removeMenuBlurBg() {
    const canvas = this.game.canvas;
    if (!canvas) return;
    canvas.style.filter = '';
  }

  private openPauseMenu() {
    if (this.menuState !== 'none') return;
    this.menuState = 'pause';
    this.physics.pause();
    this.addMenuBlurBg();
    this.buildMenu(
      'PAUSED',
      [
        { label: '繼續', onSelect: () => this.closePauseMenu() },
        { label: '設定', onSelect: () => this.openSettingsOverlay() },
        { label: '回主選單', onSelect: () => this.quitToTitle() },
      ],
      '#e8e8f0',
    );
  }

  private closePauseMenu() {
    if (this.menuState !== 'pause') return;
    this.destroyMenu();
    this.menuState = 'none';
    if (!this.hitStopActive) this.physics.resume();
    this.game.canvas.style.cursor = 'none';
  }

  private openDeathMenu() {
    if (this.menuState !== 'none') return;
    this.menuState = 'death';
    if (this.currentSlot >= 0) recordDeath(this.currentSlot);
    this.physics.pause();
    this.addMenuBlurBg();
    this.buildMenu(
      'YOU DIED',
      [
        {
          label: '重試',
          onSelect: () => {
            this.destroyMenu();
            this.menuState = 'none';
            const save = this.currentSlot >= 0 ? loadSlot(this.currentSlot) : null;
            if (save) {
              this.startTransition({ stage: save.stage, from: 'save', duration: 120 });
            } else {
              this.startTransition({ stage: this.stageIndex, duration: 120 });
            }
          },
        },
        { label: '回主選單', onSelect: () => this.quitToTitle() },
      ],
      '#ff5577',
    );
  }

  private quitToTitle() {
    this.destroyMenu();
    this.menuState = 'none';
    this.game.canvas.style.cursor = '';
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(340, () => this.scene.start('TitleScene'));
  }

  private openSettingsOverlay() {
    const wasPaused = this.menuState === 'pause';
    if (wasPaused) {
      if (this.menuOverlayDom) this.menuOverlayDom.style.display = 'none';
      this.removeMenuBlurBg();
    }
    this.scene.launch('SettingsScene', { fromGame: true });
    this.scene.bringToTop('SettingsScene');
    this.scene.pause();
    this.events.once(Phaser.Scenes.Events.RESUME, () => {
      if (this.menuState === 'pause') {
        if (this.menuOverlayDom) this.menuOverlayDom.style.display = 'flex';
        this.addMenuBlurBg();
      }
    });
  }

  update(t: number, dt: number) {
    this.samplePad();
    if (this.bossEntranceState === 'falling') {
      if (this.boss) {
        this.boss.visual.setPosition(this.boss.obj.x, this.boss.obj.y - 8);
        this.boss.visual.setRotation(0);
      }
      return;
    }
    if (this.bossEntranceState === 'hovering') return;
    if (this.transitioning) return;
    if (this.menuState !== 'none') {
      this.handleMenuInput();
      return;
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.escKey) ||
      Phaser.Input.Keyboard.JustDown(this.pauseKey) ||
      this.padJustDown('pause')
    ) {
      this.openPauseMenu();
      return;
    }
    this.player.update(t, dt);
    this.updateDashHud(t);
    this.updateLowHpOverlay();
    this.handleAttackCollisions(t);
    this.cleanupDeadEnemies();
    this.handleEnemyCollisions(t, dt);
    this.handleBoss(t, dt);
    this.handleSavePoints();
    if (
      !this.stageCleared &&
      !this.boss &&
      this.enemyTotal > 0 &&
      this.enemiesKilled >= this.enemyTotal
    ) {
      this.showStageClear();
    }
    this.checkDoors();
  }

  private handleMenuInput() {
    if (
      Phaser.Input.Keyboard.JustDown(this.menuUpKey) ||
      this.padJustDown('up')
    ) {
      this.moveMenuCursor(-1);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.menuDownKey) ||
      this.padJustDown('down')
    ) {
      this.moveMenuCursor(1);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.menuConfirmKey) ||
      Phaser.Input.Keyboard.JustDown(this.menuConfirmKey2) ||
      this.padJustDown('jump')
    ) {
      this.confirmMenu();
    } else if (
      this.menuState === 'pause' &&
      (Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.pauseKey) ||
        this.padJustDown('pause'))
    ) {
      this.closePauseMenu();
    }
  }

  private handleBoss(t: number, dt: number) {
    if (
      this.bossEntrancePending &&
      this.player.obj.x >= this.worldW / 2
    ) {
      this.triggerBossEntrance();
    }
    const boss = this.boss;
    if (!boss) return;
    if (this.bossEntranceState === 'hovering') return;
    if (this.bossEntranceState === 'falling') {
      boss.visual.setPosition(boss.obj.x, boss.obj.y - 8);
      boss.visual.setRotation(0);
      return;
    }
    if (!boss.isDead) {
      boss.update(t, dt, this.player.obj.x, this.player.obj.y);
      const playerBounds = this.player.obj.getBounds();
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          playerBounds,
          boss.obj.getBounds(),
        )
      ) {
        this.player.takeHit(t, boss.obj.x);
      } else {
        const bhb = boss.getAttackHitbox();
        if (
          bhb &&
          Phaser.Geom.Intersects.RectangleToRectangle(
            playerBounds,
            bhb.getBounds(),
          )
        ) {
          this.player.takeHit(t, boss.obj.x);
        }
      }
    }
    this.updateBossHud();
  }

  private handleSavePoints() {
    if (!this.savePoints.length) return;
    if (this.player.isDead) return;
    const playerBounds = this.player.obj.getBounds();
    for (const sp of this.savePoints) {
      if (sp.activated) continue;
      if (sp.overlapsPlayer(playerBounds)) {
        this.registerSave(sp);
      }
    }
  }

  private handleAttackCollisions(t: number) {
    const hb = this.player.getAttackHitbox();
    if (!hb) return;
    const hbRect = hb.getBounds();
    const dir = this.player.attackDir;
    let landed = false;
    for (const e of this.enemies) {
      if (e.isDead) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(hbRect, e.obj.getBounds())) continue;
      const knock = dir === 'forward' ? this.player.facing * ATTACK_KNOCK_X : 0;
      const hit = e.takeHit(t, knock);
      if (hit) {
        landed = true;
        this.cameras.main.shake(80, 0.006);
        spawnHitParticles(this, e.obj.x, e.obj.y, 0xffe680, 6, 6);
        this.player.applyHitGain();
        if (dir === 'down') this.player.pogoBounce();
      }
    }
    if (this.boss && !this.boss.isDead) {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          hbRect,
          this.boss.obj.getBounds(),
        )
      ) {
        const knock = dir === 'forward' ? this.player.facing * ATTACK_KNOCK_X : 0;
        const hit = this.boss.takeHit(t, knock);
        if (hit) {
          landed = true;
          this.cameras.main.shake(110, 0.008);
          spawnHitParticles(this, this.boss.obj.x, this.boss.obj.y, 0xffd6ff, 9, 7);
          this.player.applyHitGain();
          if (dir === 'down') this.player.pogoBounce();
        }
      }
    }
    if (landed) {
      this.player.applyAttackRecoil(t);
      this.triggerHitStop(60);
    }
  }

  private triggerHitStop(ms: number) {
    if (this.hitStopActive || this.menuState !== 'none' || this.transitioning) return;
    this.hitStopActive = true;
    this.physics.pause();
    this.time.delayedCall(ms, () => {
      this.hitStopActive = false;
      if (this.menuState === 'none' && !this.transitioning) this.physics.resume();
    });
  }

  private cleanupDeadEnemies() {
    this.enemies = this.enemies.filter((e) => e.obj.active);
    const alive = this.enemies.filter((e) => !e.isDead).length;
    const killed = this.enemyTotal - alive;
    if (killed !== this.enemiesKilled) {
      this.enemiesKilled = killed;
      this.updateKillText();
    }
  }

  private handleEnemyCollisions(t: number, dt: number) {
    const px = this.player.obj.x;
    const py = this.player.obj.y;
    const playerBounds = this.player.obj.getBounds();
    for (const e of this.enemies) {
      e.update(t, dt, px, py);
      if (e.isDead) continue;
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          playerBounds,
          e.obj.getBounds(),
        )
      ) {
        this.player.takeHit(t, e.obj.x);
        continue;
      }
      const ehb = e.getAttackHitbox();
      if (
        ehb &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          playerBounds,
          ehb.getBounds(),
        )
      ) {
        this.player.takeHit(t, e.obj.x);
      }
    }
  }

}
