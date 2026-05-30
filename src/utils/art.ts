import Phaser from 'phaser';
import type { StagePlatform } from '../stages';

const TEX = {
  player: 'muyue-player',
  enemy: 'muyue-enemy',
  enemyCaster: 'muyue-enemy-caster',
  boss: 'muyue-boss',
  bossPhase2: 'muyue-boss-phase2',
  savePoint: 'muyue-save-point',
  slash: 'muyue-slash',
  healGlow: 'muyue-heal-glow',
};

export const ART_TEX = TEX;

export const ART_COLORS = {
  sky: 0x080912,
  sky2: 0x10162b,
  moon: 0xffedb0,
  gold: 0xffd977,
  cyan: 0x7dd3fc,
  jade: 0x8fffd2,
  rose: 0xff5c7a,
  violet: 0xa78bfa,
  ink: 0x090a10,
  platform: 0x222a38,
  platformTop: 0x39475f,
};

export function ensureArtTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(TEX.player)) return;
  createPlayer(scene);
  createEnemy(scene, TEX.enemy, 0xff5c7a, 0xffc2d0);
  createEnemy(scene, TEX.enemyCaster, 0xa78bfa, 0xf0d6ff);
  createBoss(scene, TEX.boss, 0xc86b3f, 0xffd59a);
  createBoss(scene, TEX.bossPhase2, 0xff3858, 0xffccd6);
  createSavePoint(scene);
  createSlash(scene);
  createHealGlow(scene);
}

export function createMoonlitBackdrop(scene: Phaser.Scene, worldW: number, worldH: number) {
  const h = worldH;
  scene.add.rectangle(worldW / 2, h / 2, worldW, h, ART_COLORS.sky).setDepth(-80);
  scene.add
    .rectangle(worldW / 2, h * 0.45, worldW, h * 0.9, ART_COLORS.sky2, 0.55)
    .setDepth(-79)
    .setScrollFactor(0.18);

  const moonX = Math.min(worldW - 260, Math.max(520, worldW * 0.72));
  const moonY = Math.min(260, h * 0.18);
  for (let i = 0; i < 5; i++) {
    scene.add
      .circle(moonX, moonY, 105 + i * 34, ART_COLORS.moon, 0.06 - i * 0.008)
      .setDepth(-76)
      .setScrollFactor(0.08);
  }
  scene.add.circle(moonX, moonY, 96, ART_COLORS.moon, 0.78).setDepth(-75).setScrollFactor(0.08);
  scene.add.circle(moonX - 36, moonY - 20, 94, ART_COLORS.sky, 0.82).setDepth(-74).setScrollFactor(0.08);

  for (let i = 0; i < Math.ceil(worldW / 180); i++) {
    const x = 90 + i * 180 + ((i * 47) % 70);
    const y = 70 + ((i * 97) % Math.max(120, h * 0.45));
    const r = 1 + (i % 3);
    scene.add.circle(x, y, r, 0xe7eefc, 0.28 + (i % 4) * 0.08).setDepth(-73).setScrollFactor(0.12);
  }

  drawMountainLayer(scene, worldW, h, h - 430, 0x0e1320, 0.25, -54);
  drawMountainLayer(scene, worldW, h, h - 330, 0x121a2b, 0.42, -50);
  drawMountainLayer(scene, worldW, h, h - 240, 0x182033, 0.65, -46);

  for (let i = 0; i < Math.ceil(worldW / 420); i++) {
    const x = i * 420 + 160;
    scene.add
      .rectangle(x, h * 0.5, 160, h, 0x9bdcff, 0.025)
      .setDepth(-45)
      .setScrollFactor(0.28)
      .setAngle(((i % 2) * 2 - 1) * 4);
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
  g.fillStyle(0x02030a, 0.34);
  g.fillRoundedRect(x - w / 2 + 8, y - h / 2 + 12, w, h, 8);
  g.fillStyle(base, isMainFloor ? 0.98 : 0.94);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  g.fillStyle(ART_COLORS.platformTop, 0.9);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, Math.min(12, h * 0.4), 8);
  g.lineStyle(2, 0x7dd3fc, isMainFloor ? 0.14 : 0.24);
  g.lineBetween(x - w / 2 + 10, y - h / 2 + 4, x + w / 2 - 10, y - h / 2 + 4);
  g.lineStyle(1, 0x010207, 0.25);
  const crackCount = Math.min(10, Math.max(2, Math.floor(w / 260)));
  for (let i = 0; i < crackCount; i++) {
    const cx = x - w / 2 + 40 + ((i * 151 + Math.floor(x)) % Math.max(60, w - 80));
    const cy = y - h / 2 + 18 + ((i * 37 + Math.floor(y)) % Math.max(8, h - 28));
    g.lineBetween(cx, cy, cx + 16 + (i % 3) * 7, cy + 2 + (i % 2) * 5);
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
  const g = scene.add.graphics().setVisible(false);
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(32, 86, 42, 10);
  g.fillStyle(0x172033, 1);
  g.fillTriangle(20, 35, 48, 35, 56, 82);
  g.fillTriangle(19, 35, 8, 82, 36, 74);
  g.fillStyle(0x26344f, 1);
  g.fillRoundedRect(18, 25, 28, 48, 10);
  g.fillStyle(0xeef2ff, 1);
  g.fillCircle(32, 19, 13);
  g.fillStyle(ART_COLORS.moon, 0.95);
  g.fillCircle(36, 17, 4);
  g.lineStyle(3, 0x8fb6ff, 0.55);
  g.strokeRoundedRect(18, 25, 28, 48, 10);
  g.lineStyle(4, ART_COLORS.gold, 0.9);
  g.lineBetween(47, 33, 58, 39);
  g.generateTexture(TEX.player, 64, 96);
  g.destroy();
}

function createEnemy(scene: Phaser.Scene, key: string, body: number, eye: number) {
  const g = scene.add.graphics().setVisible(false);
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(36, 63, 52, 12);
  g.fillStyle(0x111522, 1);
  g.fillTriangle(20, 18, 30, 5, 34, 24);
  g.fillTriangle(52, 18, 42, 5, 38, 24);
  g.fillStyle(body, 0.95);
  g.fillEllipse(36, 38, 48, 48);
  g.fillStyle(0x1a0e20, 0.86);
  g.fillEllipse(36, 42, 35, 34);
  g.fillStyle(eye, 1);
  g.fillCircle(27, 34, 4);
  g.fillCircle(45, 34, 4);
  g.lineStyle(3, eye, 0.35);
  g.strokeEllipse(36, 38, 52, 52);
  g.generateTexture(key, 72, 72);
  g.destroy();
}

function createBoss(scene: Phaser.Scene, key: string, body: number, glow: number) {
  const g = scene.add.graphics().setVisible(false);
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(64, 130, 92, 18);
  g.fillStyle(0x170d14, 1);
  g.fillTriangle(20, 45, 48, 6, 55, 56);
  g.fillTriangle(108, 45, 80, 6, 73, 56);
  g.fillStyle(body, 0.96);
  g.fillRoundedRect(28, 32, 72, 92, 22);
  g.fillStyle(0x26131a, 0.72);
  g.fillRoundedRect(39, 48, 50, 58, 18);
  g.fillStyle(glow, 1);
  g.fillCircle(49, 58, 6);
  g.fillCircle(79, 58, 6);
  g.lineStyle(5, glow, 0.32);
  g.strokeRoundedRect(28, 32, 72, 92, 22);
  g.lineStyle(4, 0xfff0b0, 0.72);
  g.lineBetween(42, 90, 86, 90);
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
  const W = 128;
  const H = 96;
  const cx = W * 0.16;
  const cy = H / 2;
  const radius = 80;
  const deg = (d: number) => Phaser.Math.DegToRad(d);

  g.fillStyle(ART_COLORS.gold, 0.18);
  g.beginPath();
  g.arc(cx, cy, radius + 14, deg(-56), deg(56), false);
  g.arc(cx, cy, radius - 14, deg(56), deg(-56), true);
  g.closePath();
  g.fillPath();

  g.lineStyle(18, 0xfff0b0, 0.92);
  g.beginPath();
  g.arc(cx, cy, radius, deg(-50), deg(50), false);
  g.strokePath();

  g.lineStyle(7, 0xffffff, 0.96);
  g.beginPath();
  g.arc(cx, cy, radius, deg(-42), deg(42), false);
  g.strokePath();

  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(cx + Math.cos(deg(-50)) * radius, cy + Math.sin(deg(-50)) * radius, 3);
  g.fillCircle(cx + Math.cos(deg(50)) * radius, cy + Math.sin(deg(50)) * radius, 3);

  g.generateTexture(TEX.slash, W, H);
  g.destroy();
}
