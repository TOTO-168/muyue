export type StagePlatform = {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: number;
};

export type StageEnemy = {
  x: number;
  y: number;
  range: number;
};

export type StageSavePoint = {
  x: number;
  y: number;
};

export type StageBoss = {
  x: number;
  y: number;
};

export type StageConfig = {
  name: string;
  worldW: number;
  worldH: number;
  playerStart: { x: number; y: number };
  platforms: StagePlatform[];
  enemies: StageEnemy[];
  savePoints?: StageSavePoint[];
  boss?: StageBoss;
  noLeftDoor?: boolean;
  noRightDoor?: boolean;
};

const FLOOR = 0x171728;

const stage1: StageConfig = {
  name: '甦醒',
  worldW: 4400,
  worldH: 1080,
  playerStart: { x: 240, y: 880 },
  platforms: [
    { x: 2200, y: 1040, w: 4400, h: 80, color: FLOOR },
    { x: 720, y: 820, w: 360, h: 36 },
    { x: 1280, y: 660, w: 320, h: 36 },
    { x: 1800, y: 500, w: 400, h: 36 },
    { x: 2480, y: 680, w: 400, h: 36 },
    { x: 3040, y: 840, w: 440, h: 36 },
    { x: 3660, y: 640, w: 360, h: 36 },
  ],
  enemies: [
    { x: 1200, y: 920, range: 260 },
    { x: 2200, y: 920, range: 240 },
    { x: 3400, y: 920, range: 300 },
    { x: 1800, y: 440, range: 140 },
  ],
  noLeftDoor: true,
};

const stage2: StageConfig = {
  name: '攀登',
  worldW: 2400,
  worldH: 2000,
  playerStart: { x: 240, y: 1800 },
  platforms: [
    { x: 1200, y: 1960, w: 2400, h: 80, color: FLOOR },
    { x: 600, y: 1740, w: 320, h: 36 },
    { x: 1000, y: 1560, w: 320, h: 36 },
    { x: 1400, y: 1380, w: 320, h: 36 },
    { x: 1800, y: 1200, w: 320, h: 36 },
    { x: 1400, y: 1020, w: 320, h: 36 },
    { x: 1000, y: 840, w: 320, h: 36 },
    { x: 600, y: 660, w: 320, h: 36 },
    { x: 1200, y: 480, w: 600, h: 36 },
  ],
  enemies: [
    { x: 1200, y: 1880, range: 700 },
    { x: 1400, y: 1320, range: 100 },
    { x: 1400, y: 960, range: 100 },
    { x: 600, y: 600, range: 100 },
    { x: 1200, y: 420, range: 200 },
  ],
  savePoints: [{ x: 380, y: 1884 }],
};

const stage3: StageConfig = {
  name: '集結',
  worldW: 5600,
  worldH: 1080,
  playerStart: { x: 240, y: 880 },
  platforms: [
    { x: 2800, y: 1040, w: 5600, h: 80, color: FLOOR },
    { x: 500, y: 820, w: 320, h: 36 },
    { x: 1000, y: 660, w: 280, h: 36 },
    { x: 1500, y: 820, w: 280, h: 36 },
    { x: 2000, y: 660, w: 280, h: 36 },
    { x: 2500, y: 480, w: 320, h: 36 },
    { x: 3100, y: 320, w: 280, h: 36 },
    { x: 3600, y: 480, w: 280, h: 36 },
    { x: 4100, y: 660, w: 320, h: 36 },
    { x: 4700, y: 820, w: 360, h: 36 },
    { x: 5200, y: 660, w: 280, h: 36 },
  ],
  enemies: [
    { x: 1200, y: 920, range: 400 },
    { x: 1000, y: 600, range: 100 },
    { x: 2300, y: 920, range: 300 },
    { x: 2500, y: 420, range: 130 },
    { x: 3100, y: 260, range: 100 },
    { x: 4100, y: 600, range: 110 },
    { x: 4500, y: 920, range: 350 },
    { x: 5200, y: 600, range: 110 },
  ],
  savePoints: [{ x: 3100, y: 266 }],
};

const stage4: StageConfig = {
  name: '臨月',
  worldW: 2400,
  worldH: 1080,
  playerStart: { x: 240, y: 880 },
  platforms: [
    { x: 1200, y: 1040, w: 2400, h: 80, color: FLOOR },
    { x: 540, y: 860, w: 280, h: 28 },
    { x: 1860, y: 860, w: 280, h: 28 },
  ],
  enemies: [],
  savePoints: [{ x: 380, y: 964 }],
  boss: { x: 1700, y: 920 },
  noRightDoor: true,
};

export const STAGES: StageConfig[] = [stage1, stage2, stage3, stage4];
