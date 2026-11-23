import Phaser from 'phaser';
import { setupPwa } from './pwa';
import { BootScene } from './scenes/BootScene';
import { TOKENS } from './ui/tokens';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: TOKENS.color.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: TOKENS.screen.width,
    height: TOKENS.screen.height,
  },
  scene: [BootScene],
});

setupPwa();
