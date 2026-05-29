import Phaser from 'phaser';

export function spawnHitParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 6,
  size = 6,
) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6 - 0.3;
    const speed = 140 + Math.random() * 140;
    const dx = Math.cos(angle) * speed * 0.3;
    const dy = Math.sin(angle) * speed * 0.3 - 30;
    const p = scene.add.rectangle(x, y, size, size, color).setDepth(50);
    scene.tweens.add({
      targets: p,
      x: x + dx,
      y: y + dy,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => p.destroy(),
    });
  }
}
