import Phaser from 'phaser';
import type { StagePlatform } from '../stages';

const TEX = {
  skyGradient: 'muyue-sky-gradient',
  moonGlow: 'muyue-moon-glow',
  player: 'muyue-player',
  enemy: 'muyue-enemy',
  enemyCaster: 'muyue-enemy-caster',
  boss: 'muyue-boss',
  bossPhase2: 'muyue-boss-phase2',
  playerSheet: 'muyue-player-sheet',
  enemySheet: 'muyue-enemy-sheet',
  enemyCasterSheet: 'muyue-enemy-caster-sheet',
  bossSheet: 'muyue-boss-sheet',
  bossPhase2Sheet: 'muyue-boss-phase2-sheet',
  savePoint: 'muyue-save-point',
  savePointGlow: 'muyue-save-point-glow',
  slash: 'muyue-slash',
  healGlow: 'muyue-heal-glow',
};

export const ART_TEX = TEX;

export const CHARACTER_ANIM = {
  player: {
    idle: 'muyue-player-idle',
    run: 'muyue-player-run',
    jump: 'muyue-player-jump',
    fall: 'muyue-player-fall',
    attack: 'muyue-player-attack',
    dash: 'muyue-player-dash',
    heal: 'muyue-player-heal',
    hurt: 'muyue-player-hurt',
    death: 'muyue-player-death',
  },
  enemy: {
    idle: 'muyue-enemy-idle',
    move: 'muyue-enemy-move',
    attack: 'muyue-enemy-attack',
    hurt: 'muyue-enemy-hurt',
    death: 'muyue-enemy-death',
  },
  caster: {
    idle: 'muyue-caster-idle',
    move: 'muyue-caster-move',
    windup: 'muyue-caster-windup',
    release: 'muyue-caster-release',
    hurt: 'muyue-caster-hurt',
    death: 'muyue-caster-death',
  },
  boss1: bossAnimations('muyue-boss-p1'),
  boss2: bossAnimations('muyue-boss-p2'),
};

function bossAnimations(prefix: string) {
  return {
    idle: `${prefix}-idle`,
    walk: `${prefix}-walk`,
    lungeWindup: `${prefix}-lunge-windup`,
    lungeActive: `${prefix}-lunge-active`,
    slamRise: `${prefix}-slam-rise`,
    slamFall: `${prefix}-slam-fall`,
    slamLand: `${prefix}-slam-land`,
    slamRecover: `${prefix}-slam-recover`,
    hurt: `${prefix}-hurt`,
    death: `${prefix}-death`,
  };
}

export const ART_COLORS = {
  sky: 0x050811,
  sky2: 0x111a2a,
  moon: 0xeadcad,
  gold: 0xd8bd72,
  cyan: 0x718ba3,
  jade: 0x8bc7b4,
  rose: 0xff5c7a,
  violet: 0x9b86d8,
  ink: 0x060810,
  platform: 0x182230,
  platformTop: 0x425265,
};

export function preloadCharacterTextures(scene: Phaser.Scene) {
  const base = 'assets/characters/';
  scene.load.image(TEX.player, `${base}player.png`);
  scene.load.image(TEX.enemy, `${base}enemy.png`);
  scene.load.image(TEX.enemyCaster, `${base}enemy-caster.png`);
  scene.load.image(TEX.boss, `${base}boss.png`);
  scene.load.image(TEX.bossPhase2, `${base}boss-phase2.png`);
  scene.load.spritesheet(TEX.playerSheet, `${base}animated/player-sheet.png`, {
    frameWidth: 230,
    frameHeight: 192,
  });
  scene.load.spritesheet(TEX.enemySheet, `${base}animated/enemy-sheet.png`, {
    frameWidth: 216,
    frameHeight: 192,
  });
  scene.load.spritesheet(
    TEX.enemyCasterSheet,
    `${base}animated/enemy-caster-sheet.png`,
    { frameWidth: 216, frameHeight: 192 },
  );
  scene.load.spritesheet(TEX.bossSheet, `${base}animated/boss-sheet.png`, {
    frameWidth: 336,
    frameHeight: 224,
  });
  scene.load.spritesheet(
    TEX.bossPhase2Sheet,
    `${base}animated/boss-phase2-sheet.png`,
    { frameWidth: 336, frameHeight: 224 },
  );
}

export function ensureCharacterAnimations(scene: Phaser.Scene) {
  const add = (
    key: string,
    texture: string,
    frames: number[],
    frameRate = 8,
    repeat = 0,
  ) => {
    if (scene.anims.exists(key) || !scene.textures.exists(texture)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, { frames }),
      frameRate,
      repeat,
    });
  };

  const p = CHARACTER_ANIM.player;
  add(p.idle, TEX.playerSheet, [0, 1, 2, 1], 5, -1);
  add(p.run, TEX.playerSheet, [5, 6, 7, 8], 12, -1);
  add(p.jump, TEX.playerSheet, [13], 1, -1);
  add(p.fall, TEX.playerSheet, [14], 1, -1);
  add(p.attack, TEX.playerSheet, [10, 11, 12], 18);
  add(p.dash, TEX.playerSheet, [15, 16], 12, -1);
  add(p.heal, TEX.playerSheet, [17, 18], 4, -1);
  add(p.hurt, TEX.playerSheet, [3], 1, -1);
  add(p.death, TEX.playerSheet, [4, 9, 19], 7);

  const e = CHARACTER_ANIM.enemy;
  add(e.idle, TEX.enemySheet, [0, 1, 2, 1], 5, -1);
  add(e.move, TEX.enemySheet, [4, 5, 6, 7], 10, -1);
  add(e.attack, TEX.enemySheet, [8, 9], 12);
  add(e.hurt, TEX.enemySheet, [3], 1, -1);
  add(e.death, TEX.enemySheet, [10, 11], 5);

  const c = CHARACTER_ANIM.caster;
  add(c.idle, TEX.enemyCasterSheet, [0, 1, 2, 1], 5, -1);
  add(c.move, TEX.enemyCasterSheet, [4, 5, 6, 7], 8, -1);
  add(c.windup, TEX.enemyCasterSheet, [8, 9], 7, -1);
  add(c.release, TEX.enemyCasterSheet, [10], 1, -1);
  add(c.hurt, TEX.enemyCasterSheet, [3], 1, -1);
  add(c.death, TEX.enemyCasterSheet, [3, 11], 5);

  const addBoss = (
    anim: ReturnType<typeof bossAnimations>,
    texture: string,
  ) => {
    add(anim.idle, texture, [0, 1], 4, -1);
    add(anim.walk, texture, [2, 3, 4], 7, -1);
    add(anim.lungeWindup, texture, [5, 6], 5, -1);
    add(anim.lungeActive, texture, [7], 1, -1);
    add(anim.slamRise, texture, [8, 9], 6, -1);
    add(anim.slamFall, texture, [10], 1, -1);
    add(anim.slamLand, texture, [11], 1, -1);
    add(anim.slamRecover, texture, [12], 1, -1);
    add(anim.hurt, texture, [13], 1, -1);
    add(anim.death, texture, [14, 15], 4);
  };
  addBoss(CHARACTER_ANIM.boss1, TEX.bossSheet);
  addBoss(CHARACTER_ANIM.boss2, TEX.bossPhase2Sheet);
}

export function ensureArtTextures(scene: Phaser.Scene) {
  const exists = (key: string) => scene.textures.exists(key);
  if (!exists(TEX.skyGradient)) createSkyGradient(scene);
  if (!exists(TEX.moonGlow)) createMoonGlow(scene);
  if (!exists(TEX.player)) createPlayer(scene);
  if (!exists(TEX.enemy)) createEnemy(scene, TEX.enemy, 0xb7425f, 0xffd9df, false);
  if (!exists(TEX.enemyCaster)) {
    createEnemy(scene, TEX.enemyCaster, 0x68529f, 0xeadfff, true);
  }
  if (!exists(TEX.boss)) createBoss(scene, TEX.boss, 0xc86b3f, 0xffd59a);
  if (!exists(TEX.bossPhase2)) {
    createBoss(scene, TEX.bossPhase2, 0xff3858, 0xffccd6);
  }
  if (!exists(TEX.savePoint)) createSavePoint(scene);
  if (!exists(TEX.savePointGlow)) createSavePointGlow(scene);
  if (!exists(TEX.slash)) createSlash(scene);
  if (!exists(TEX.healGlow)) createHealGlow(scene);
}

function createSkyGradient(scene: Phaser.Scene) {
  const tex = scene.textures.createCanvas(TEX.skyGradient, 32, 512);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#040711');
  grad.addColorStop(0.44, '#0b1322');
  grad.addColorStop(0.78, '#10192a');
  grad.addColorStop(1, '#050812');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 512);
  tex.refresh();
}

function createMoonGlow(scene: Phaser.Scene) {
  const size = 512;
  const tex = scene.textures.createCanvas(TEX.moonGlow, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(256, 256, 16, 256, 256, 250);
  grad.addColorStop(0, 'rgba(241, 222, 164, .42)');
  grad.addColorStop(0.24, 'rgba(216, 189, 114, .18)');
  grad.addColorStop(0.58, 'rgba(113, 139, 163, .07)');
  grad.addColorStop(1, 'rgba(48, 62, 86, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function createSavePointGlow(scene: Phaser.Scene) {
  const size = 256;
  const tex = scene.textures.createCanvas(TEX.savePointGlow, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0, 'rgba(220, 200, 255, 0.65)');
  grad.addColorStop(0.25, 'rgba(200, 176, 255, 0.32)');
  grad.addColorStop(0.55, 'rgba(160, 130, 240, 0.12)');
  grad.addColorStop(1, 'rgba(140, 110, 230, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export function createMoonlitBackdrop(
  scene: Phaser.Scene,
  worldW: number,
  worldH: number,
  mood = 0,
) {
  ensureArtTextures(scene);
  const h = worldH;
  scene.add
    .image(worldW / 2, h / 2, TEX.skyGradient)
    .setDisplaySize(worldW, h)
    .setDepth(-80);
  const moodWash = [0x132035, 0x13263a, 0x21182d, 0x35131d][mood % 4];
  scene.add
    .rectangle(worldW / 2, h * 0.45, worldW, h * 0.9, moodWash, 0.2)
    .setDepth(-79)
    .setScrollFactor(0.18);

  const moonX = Math.min(worldW - 260, Math.max(520, scene.scale.width * 0.72));
  const moonY = Math.min(260, h * 0.18);
  scene.add
    .image(moonX, moonY, TEX.moonGlow)
    .setDisplaySize(mood === 3 ? 660 : 540, mood === 3 ? 660 : 540)
    .setDepth(-77)
    .setScrollFactor(0.08)
    .setBlendMode(Phaser.BlendModes.ADD);
  if (mood === 3) {
    scene.add
      .circle(moonX, moonY, 126, 0xc75b68, 0.52)
      .setStrokeStyle(7, 0xe7b38e, 0.46)
      .setDepth(-75)
      .setScrollFactor(0.08);
    scene.add
      .circle(moonX, moonY, 103, 0x090a11, 0.98)
      .setDepth(-74)
      .setScrollFactor(0.08);
  } else {
    scene.add
      .circle(moonX, moonY, 104 + mood * 7, ART_COLORS.moon, 0.88)
      .setDepth(-75)
      .setScrollFactor(0.08);
    scene.add
      .circle(moonX - 38 + mood * 9, moonY - 22, 101 + mood * 7, ART_COLORS.sky, 0.96)
      .setDepth(-74)
      .setScrollFactor(0.08);
  }

  for (let i = 0; i < Math.ceil(worldW / 130); i++) {
    const x = 90 + i * 180 + ((i * 47) % 70);
    const y = 70 + ((i * 97) % Math.max(120, h * 0.45));
    const r = 0.8 + (i % 3) * 0.7;
    scene.add
      .circle(x, y, r, 0xe7eefc, 0.22 + (i % 4) * 0.07)
      .setDepth(-73)
      .setScrollFactor(0.12);
  }

  drawMountainLayer(scene, worldW, h, h - 430, 0x0b1120, 0.48, -58);
  drawMountainLayer(scene, worldW, h, h - 330, 0x111b2a, 0.72, -54);

  const ruins = scene.add.graphics().setDepth(-50).setScrollFactor(0.2);
  const ruinCount = Math.ceil(worldW / 620) + 1;
  for (let i = 0; i < ruinCount; i++) {
    const x = i * 620 + 120 + ((i * 97) % 170);
    const baseY = h - 170 + ((i * 31) % 60);
    const towerH = 190 + ((i * 73) % 210);
    const towerW = 82 + ((i * 29) % 54);
    ruins.fillStyle(0x111827, 0.92);
    ruins.fillRect(x - towerW / 2, baseY - towerH, towerW, towerH);
    ruins.fillTriangle(
      x - towerW / 2 - 18,
      baseY - towerH,
      x + towerW / 2 + 18,
      baseY - towerH,
      x + ((i % 3) - 1) * 18,
      baseY - towerH - 86,
    );
    ruins.fillStyle(0x060a12, 0.9);
    ruins.fillRoundedRect(x - 17, baseY - towerH + 60, 34, 90, 16);
    ruins.lineStyle(2, ART_COLORS.gold, 0.1 + mood * 0.025);
    ruins.lineBetween(x - towerW / 2, baseY - towerH + 14, x + towerW / 2, baseY - towerH + 14);
  }

  drawMountainLayer(scene, worldW, h, h - 225, 0x182334, 0.88, -46);

  const beamCount = Math.ceil(worldW / 760);
  for (let i = 0; i < beamCount; i++) {
    const x = i * 760 + 220;
    scene.add
      .rectangle(x, h * 0.42, 130, h * 0.9, ART_COLORS.moon, 0.018 + mood * 0.004)
      .setDepth(-45)
      .setScrollFactor(0.28)
      .setAngle(((i % 2) * 2 - 1) * 7);
  }

  for (let i = 0; i < Math.ceil(worldW / 720) + 1; i++) {
    const fog = scene.add
      .ellipse(i * 720 + 140, h - 105 - ((i * 37) % 80), 760, 105, 0x718ba3, 0.055)
      .setDepth(-42)
      .setScrollFactor(0.42);
    scene.tweens.add({
      targets: fog,
      x: fog.x + 80,
      alpha: 0.025,
      yoyo: true,
      repeat: -1,
      duration: 5200 + i * 330,
      ease: 'Sine.InOut',
    });
  }
}

export function drawPlatformVisual(
  scene: Phaser.Scene,
  platform: StagePlatform,
  isMainFloor: boolean,
) {
  const { x, y, w, h } = platform;
  const g = scene.add.graphics().setDepth(2);
  const base = platform.color ?? ART_COLORS.platform;
  const left = x - w / 2;
  const top = y - h / 2;
  g.fillStyle(0x02040a, 0.5);
  g.fillRect(left + 8, top + 15, w, h + 8);
  g.fillStyle(base, 1);
  g.fillRect(left, top + 6, w, Math.max(1, h - 6));
  g.fillStyle(0x0b111d, 0.76);
  g.fillRect(left, top + Math.min(22, h * 0.45), w, Math.max(1, h - 22));
  g.fillStyle(ART_COLORS.platformTop, 0.98);
  g.fillRect(left, top, w, Math.min(10, h * 0.36));
  g.fillStyle(0x65788a, 0.38);
  g.fillRect(left + 12, top + 2, Math.max(1, w - 24), 2);
  g.fillStyle(0x0c1220, 1);
  g.fillTriangle(left, top, left + 22, top, left, top + 18);
  g.fillTriangle(left + w, top, left + w - 17, top, left + w, top + 14);
  if (!isMainFloor && h <= 48) {
    const shardCount = Math.min(5, Math.max(2, Math.floor(w / 110)));
    for (let i = 0; i < shardCount; i++) {
      const sx = left + 38 + ((i * 97 + Math.floor(x)) % Math.max(50, w - 76));
      const sh = 10 + ((i * 13) % 24);
      g.fillStyle(0x0a101b, 0.92);
      g.fillTriangle(sx - 10, top + h - 2, sx + 12, top + h - 2, sx + 2, top + h + sh);
    }
  }
  g.lineStyle(1.4, ART_COLORS.gold, isMainFloor ? 0.09 : 0.18);
  g.lineBetween(left + 26, top + 4, left + w - 26, top + 4);
  g.lineStyle(1.2, 0x070a10, 0.62);
  const crackCount = Math.min(10, Math.max(2, Math.floor(w / 260)));
  for (let i = 0; i < crackCount; i++) {
    const cx = left + 40 + ((i * 151 + Math.floor(x)) % Math.max(60, w - 80));
    const cy = top + 14 + ((i * 37 + Math.floor(y)) % Math.max(8, h - 24));
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + 9, cy + 5);
    g.lineTo(cx + 19 + (i % 3) * 6, cy + 2);
    g.strokePath();
  }
  return g;
}

function drawMountainLayer(
  scene: Phaser.Scene,
  worldW: number,
  worldH: number,
  baseY: number,
  color: number,
  alpha: number,
  depth: number,
) {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(depth < -50 ? 0.14 : 0.24);
  g.fillStyle(color, alpha);
  const points: Phaser.Geom.Point[] = [new Phaser.Geom.Point(0, worldH)];
  const step = 360;
  for (let x = -step; x <= worldW + step; x += step) {
    const peakY = baseY - 100 - ((Math.floor(x / step) * 83) % 160);
    points.push(new Phaser.Geom.Point(x, baseY));
    points.push(new Phaser.Geom.Point(x + step * 0.45, peakY));
    points.push(new Phaser.Geom.Point(x + step, baseY + ((Math.floor(x) * 17) % 50)));
  }
  points.push(new Phaser.Geom.Point(worldW, worldH));
  g.fillPoints(points, true);
}

function createPlayer(scene: Phaser.Scene) {
  const W = 64;
  const H = 96;
  const cx = W / 2;
  const g = scene.add.graphics().setVisible(false);

  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(cx, 90, 32, 7);

  g.fillStyle(0x141b2e, 1);
  g.beginPath();
  g.moveTo(cx - 2, 10);
  g.lineTo(cx + 2, 10);
  g.lineTo(cx + 13, 22);
  g.lineTo(cx + 19, 44);
  g.lineTo(cx + 23, 70);
  g.lineTo(cx + 25, 86);
  g.lineTo(cx - 25, 86);
  g.lineTo(cx - 23, 70);
  g.lineTo(cx - 19, 44);
  g.lineTo(cx - 13, 22);
  g.closePath();
  g.fillPath();

  g.fillStyle(0x1f2945, 0.9);
  g.beginPath();
  g.moveTo(cx + 4, 42);
  g.lineTo(cx + 19, 46);
  g.lineTo(cx + 23, 72);
  g.lineTo(cx + 8, 84);
  g.closePath();
  g.fillPath();

  g.fillStyle(0x080b18, 1);
  g.fillEllipse(cx, 26, 22, 24);

  g.fillStyle(0xeaeeff, 1);
  g.fillEllipse(cx, 27, 14, 18);

  g.fillStyle(0x9aaee0, 0.32);
  g.fillEllipse(cx + 3, 29, 8, 13);

  g.fillStyle(0x10182a, 1);
  g.fillEllipse(cx + 1, 27, 1.8, 2.4);

  g.fillStyle(ART_COLORS.gold, 0.95);
  g.fillCircle(cx, 58, 5);
  g.fillStyle(0x141b2e, 1);
  g.fillCircle(cx + 2.4, 57, 4.4);

  g.fillStyle(0xe6ecff, 0.95);
  g.fillRect(cx + 17, 36, 2, 24);
  g.fillTriangle(cx + 17, 36, cx + 19, 36, cx + 18, 28);

  g.fillStyle(ART_COLORS.gold, 0.92);
  g.fillRect(cx + 13, 60, 10, 2.4);
  g.fillCircle(cx + 18, 65, 2.4);

  g.fillStyle(0x3a2614, 1);
  g.fillRect(cx + 17, 62, 2, 4);

  g.generateTexture(TEX.player, W, H);
  g.destroy();
}

function createEnemy(
  scene: Phaser.Scene,
  key: string,
  body: number,
  eye: number,
  caster: boolean,
) {
  const g = scene.add.graphics().setVisible(false);
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(36, 63, 52, 12);
  if (caster) {
    g.fillStyle(0x11111f, 1);
    g.fillTriangle(15, 28, 28, 3, 33, 30);
    g.fillTriangle(57, 28, 44, 3, 39, 30);
    g.fillStyle(body, 0.94);
    g.fillTriangle(36, 13, 63, 61, 9, 61);
    g.fillStyle(0x171020, 0.92);
    g.fillTriangle(36, 23, 54, 57, 18, 57);
    g.fillStyle(eye, 0.96);
    g.fillCircle(36, 34, 6);
    g.fillStyle(0x5d4c86, 1);
    g.fillCircle(38, 33, 3.6);
    g.lineStyle(2, eye, 0.42);
    g.strokeTriangle(36, 13, 63, 61, 9, 61);
    g.lineBetween(25, 54, 47, 54);
  } else {
    g.fillStyle(0x111522, 1);
    g.fillTriangle(17, 23, 26, 5, 33, 25);
    g.fillTriangle(55, 23, 46, 5, 39, 25);
    g.fillStyle(body, 0.96);
    g.fillEllipse(36, 40, 52, 45);
    g.fillStyle(0x170e17, 0.9);
    g.fillEllipse(36, 43, 39, 30);
    g.fillStyle(eye, 1);
    g.fillTriangle(23, 34, 32, 37, 24, 40);
    g.fillTriangle(49, 34, 40, 37, 48, 40);
    g.fillStyle(0x080a10, 0.9);
    g.fillTriangle(30, 48, 36, 53, 42, 48);
    g.lineStyle(3, eye, 0.28);
    g.strokeEllipse(36, 39, 55, 49);
  }
  g.generateTexture(key, 72, 72);
  g.destroy();
}

function createBoss(scene: Phaser.Scene, key: string, body: number, glow: number) {
  const g = scene.add.graphics().setVisible(false);
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(64, 130, 92, 18);
  g.fillStyle(0x110a11, 1);
  g.fillTriangle(16, 51, 44, 19, 51, 63);
  g.fillTriangle(112, 51, 84, 19, 77, 63);
  g.lineStyle(7, 0x160c13, 1);
  g.beginPath();
  g.moveTo(48, 39);
  g.lineTo(30, 14);
  g.lineTo(18, 6);
  g.moveTo(38, 27);
  g.lineTo(23, 25);
  g.moveTo(80, 39);
  g.lineTo(98, 14);
  g.lineTo(110, 6);
  g.moveTo(90, 27);
  g.lineTo(105, 25);
  g.strokePath();
  g.fillStyle(body, 0.96);
  g.fillTriangle(64, 23, 105, 124, 23, 124);
  g.fillStyle(0x1d1018, 0.94);
  g.fillRoundedRect(38, 44, 52, 64, 18);
  g.fillStyle(0xe6d8bd, 0.9);
  g.fillEllipse(64, 48, 31, 24);
  g.fillStyle(0x170d14, 1);
  g.fillTriangle(54, 47, 62, 50, 55, 53);
  g.fillTriangle(74, 47, 66, 50, 73, 53);
  g.fillStyle(glow, 0.26);
  g.fillCircle(64, 82, 18);
  g.fillStyle(glow, 1);
  g.fillCircle(64, 82, 8);
  g.fillStyle(0x180e16, 1);
  g.fillCircle(67, 80, 7);
  g.lineStyle(3, glow, 0.34);
  g.strokeTriangle(64, 23, 105, 124, 23, 124);
  g.lineStyle(2, 0xeadcad, 0.5);
  g.lineBetween(41, 108, 87, 108);
  g.generateTexture(key, 128, 144);
  g.destroy();
}

function createSavePoint(scene: Phaser.Scene) {
  const W = 80;
  const H = 96;
  const cx = W / 2;
  const cy = H / 2;
  const g = scene.add.graphics().setVisible(false);

  g.fillStyle(ART_COLORS.violet, 0.10);
  g.fillCircle(cx, cy, 36);
  g.fillStyle(ART_COLORS.violet, 0.18);
  g.fillCircle(cx, cy, 22);

  const top = { x: cx, y: cy - 28 };
  const right = { x: cx + 18, y: cy };
  const bottom = { x: cx, y: cy + 28 };
  const left = { x: cx - 18, y: cy };

  g.fillStyle(0x1a1430, 1);
  g.beginPath();
  g.moveTo(top.x, top.y);
  g.lineTo(right.x, right.y);
  g.lineTo(bottom.x, bottom.y);
  g.lineTo(left.x, left.y);
  g.closePath();
  g.fillPath();

  const facet = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    color: number,
    alpha: number,
  ) => {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.lineTo(cx, cy);
    g.closePath();
    g.fillPath();
  };
  facet(top, left, 0x9f7dff, 0.88);
  facet(top, right, 0xc8b0ff, 0.95);
  facet(right, bottom, 0x7b5cf0, 0.88);
  facet(bottom, left, 0x5b3fc8, 0.82);

  g.lineStyle(2, 0xe8dcff, 0.92);
  g.beginPath();
  g.moveTo(top.x, top.y);
  g.lineTo(right.x, right.y);
  g.lineTo(bottom.x, bottom.y);
  g.lineTo(left.x, left.y);
  g.closePath();
  g.strokePath();

  g.lineStyle(1, 0xe0d2ff, 0.55);
  g.lineBetween(top.x, top.y, bottom.x, bottom.y);
  g.lineBetween(left.x, left.y, right.x, right.y);

  g.lineStyle(1.4, 0xfff8e0, 0.85);
  g.beginPath();
  g.moveTo(cx - 6, cy - 18);
  g.lineTo(cx - 2, cy - 10);
  g.lineTo(cx - 8, cy - 4);
  g.lineTo(cx - 3, cy + 4);
  g.lineTo(cx - 9, cy + 12);
  g.strokePath();

  g.lineStyle(1.2, 0xfff8e0, 0.7);
  g.beginPath();
  g.moveTo(cx + 4, cy - 14);
  g.lineTo(cx + 10, cy - 6);
  g.lineTo(cx + 6, cy + 3);
  g.strokePath();

  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(cx - 5, cy - 14, 2);
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(cx + 6, cy - 4, 1.4);

  const shard = (
    pts: Array<[number, number]>,
    color: number,
    alpha: number,
  ) => {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fillPath();
  };
  shard(
    [
      [cx - 28, cy - 12],
      [cx - 22, cy - 18],
      [cx - 19, cy - 13],
      [cx - 25, cy - 9],
    ],
    0xc8b0ff,
    0.78,
  );
  shard(
    [
      [cx + 22, cy + 10],
      [cx + 28, cy + 12],
      [cx + 24, cy + 18],
      [cx + 20, cy + 14],
    ],
    0x9f7dff,
    0.72,
  );
  shard(
    [
      [cx + 19, cy - 22],
      [cx + 24, cy - 24],
      [cx + 26, cy - 18],
      [cx + 21, cy - 17],
    ],
    0xc8b0ff,
    0.65,
  );
  shard(
    [
      [cx - 24, cy + 14],
      [cx - 19, cy + 16],
      [cx - 21, cy + 22],
      [cx - 26, cy + 19],
    ],
    0x7b5cf0,
    0.6,
  );

  g.generateTexture(TEX.savePoint, W, H);
  g.destroy();
}

function createHealGlow(scene: Phaser.Scene) {
  const size = 256;
  const cx = size / 2;
  const cy = size / 2;
  const g = scene.add.graphics().setVisible(false);
  for (let i = 18; i >= 0; i--) {
    const radius = (cx - 8) * (i / 18);
    const a = 0.02 + (18 - i) * 0.012;
    g.fillStyle(0x88ffcc, a);
    g.fillCircle(cx, cy, radius);
  }
  g.fillStyle(0xb8ffe0, 0.35);
  g.fillCircle(cx, cy, cx * 0.16);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(cx, cy, cx * 0.06);
  for (let k = 0; k < 6; k++) {
    const angle = (Math.PI * 2 * k) / 6 + Math.PI / 12;
    const r1 = cx * 0.22;
    const r2 = cx * 0.6;
    g.lineStyle(2, 0xc8ffe6, 0.55 - k * 0.04);
    g.beginPath();
    g.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    g.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    g.strokePath();
  }
  g.generateTexture(TEX.healGlow, size, size);
  g.destroy();
}

function createSlash(scene: Phaser.Scene) {
  const g = scene.add.graphics().setVisible(false);
  const W = 220;
  const H = 160;
  const px = 60;
  const py = H / 2;
  const radius = 104;
  const deg = (d: number) => Phaser.Math.DegToRad(d);

  const spike = (
    ang: number,
    len: number,
    width: number,
    alpha: number,
    cx: number = px,
    cy: number = py,
  ) => {
    const tipX = cx + Math.cos(deg(ang)) * len;
    const tipY = cy + Math.sin(deg(ang)) * len;
    const perp = ang + 90;
    g.fillStyle(0xffffff, alpha);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(cx + Math.cos(deg(perp)) * width, cy + Math.sin(deg(perp)) * width);
    g.lineTo(cx - Math.cos(deg(perp)) * width, cy - Math.sin(deg(perp)) * width);
    g.closePath();
    g.fillPath();
  };

  spike(196, 60, 4, 0.85);
  spike(206, 78, 5, 0.92);
  spike(216, 92, 5, 0.95);
  spike(226, 82, 4, 0.9);
  spike(236, 68, 4, 0.86);
  spike(248, 50, 3, 0.78);
  spike(188, 38, 2.5, 0.7);
  spike(200, 30, 1.6, 0.6);
  spike(212, 24, 1.4, 0.55);
  spike(224, 46, 2, 0.7);
  spike(232, 36, 1.6, 0.6);
  spike(244, 28, 1.4, 0.55);

  g.fillStyle(0xffffff, 0.18);
  g.fillCircle(px, py, 28);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(px, py, 14);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(px, py, 6);
  for (let k = 0; k < 10; k++) {
    const ang = (k * 360) / 10;
    spike(ang, 26 + (k % 2) * 6, 2.2, 0.95);
  }

  g.fillStyle(0xffffff, 0.16);
  g.beginPath();
  g.arc(px, py, radius + 20, deg(-58), deg(58), false);
  g.arc(px, py, radius - 20, deg(58), deg(-58), true);
  g.closePath();
  g.fillPath();

  g.lineStyle(15, 0xffffff, 0.92);
  g.beginPath();
  g.arc(px, py, radius, deg(-50), deg(50), false);
  g.strokePath();

  g.lineStyle(5, 0xffffff, 1);
  g.beginPath();
  g.arc(px, py, radius, deg(-44), deg(44), false);
  g.strokePath();

  g.lineStyle(3.5, 0xffffff, 0.78);
  g.beginPath();
  g.arc(px, py, radius - 24, deg(-40), deg(40), false);
  g.strokePath();
  g.lineStyle(2.6, 0xffffff, 0.62);
  g.beginPath();
  g.arc(px, py, radius + 22, deg(-46), deg(38), false);
  g.strokePath();
  g.lineStyle(1.6, 0xffffff, 0.5);
  g.beginPath();
  g.arc(px, py, radius - 42, deg(-30), deg(32), false);
  g.strokePath();

  const arcTip = (angDeg: number, outerExt: number, innerExt: number, taper: number) => {
    const tip = {
      x: px + Math.cos(deg(angDeg)) * (radius + outerExt),
      y: py + Math.sin(deg(angDeg)) * (radius + outerExt),
    };
    const back1 = {
      x: px + Math.cos(deg(angDeg - taper)) * (radius - innerExt),
      y: py + Math.sin(deg(angDeg - taper)) * (radius - innerExt),
    };
    const back2 = {
      x: px + Math.cos(deg(angDeg + taper)) * (radius + 4),
      y: py + Math.sin(deg(angDeg + taper)) * (radius + 4),
    };
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(tip.x, tip.y);
    g.lineTo(back1.x, back1.y);
    g.lineTo(back2.x, back2.y);
    g.closePath();
    g.fillPath();
  };
  arcTip(-52, 30, 16, 6);
  arcTip(52, 30, 16, 6);
  arcTip(-44, 14, 6, 4);
  arcTip(44, 14, 6, 4);

  const sparkles: Array<[number, number, number]> = [
    [-38, 10, 4],
    [-22, -10, 3],
    [-6, 14, 3.2],
    [8, -10, 3.4],
    [24, 8, 3.8],
    [40, -6, 3],
    [-52, 32, 3],
    [52, 32, 3],
    [-30, -22, 2.4],
    [30, -22, 2.6],
  ];
  for (const [ang, off, sz] of sparkles) {
    const r = radius + off;
    const x = px + Math.cos(deg(ang)) * r;
    const y = py + Math.sin(deg(ang)) * r;
    g.fillStyle(0xffffff, 0.92);
    g.beginPath();
    g.moveTo(x, y - sz);
    g.lineTo(x + sz, y);
    g.lineTo(x, y + sz);
    g.lineTo(x - sz, y);
    g.closePath();
    g.fillPath();
  }

  g.generateTexture(TEX.slash, W, H);
  g.destroy();
}
