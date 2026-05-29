import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SlotPickerScene } from './scenes/SlotPickerScene';
import { loadBindings } from './utils/KeyBindings';

loadBindings();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'app',
  backgroundColor: '#0a0a14',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 2800 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
  },
  scene: [TitleScene, SettingsScene, SlotPickerScene, GameScene],
};

new Phaser.Game(config);
