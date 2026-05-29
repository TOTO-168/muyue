export const EV = {
  playerHp: 'player-hp',
  playerEnergy: 'player-energy',
  playerJump: 'player-jump',
  playerAttack: 'player-attack',
  playerDash: 'player-dash',
  playerHeal: 'player-heal',
  playerHealStart: 'player-heal-start',
  playerHealCancel: 'player-heal-cancel',
  playerDead: 'player-dead',
  enemyHit: 'enemy-hit',
  enemyDied: 'enemy-died',
  bossLunge: 'boss-lunge',
  bossSlam: 'boss-slam',
  bossTelegraph: 'boss-telegraph',
  bossDied: 'boss-died',
  saveRegistered: 'save-registered',
} as const;

export type EventName = (typeof EV)[keyof typeof EV];
