import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { CARDS, LEVELS, STRINGS } from '../data';
import { TOKENS, hex } from '../ui/tokens';

/** Phase 0 placeholder: proves the build, the data load and the deploy on a phone. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      points.push(Math.cos(a) * 150, Math.sin(a) * 150);
    }
    const portal = this.add.polygon(cx, cy - 140, points, TOKENS.color.surface).setOrigin(0);
    portal.setStrokeStyle(8, TOKENS.color.accent);
    this.tweens.add({
      targets: portal,
      angle: 60,
      duration: 2400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(cx, cy + 90, GAME_CONFIG.gameName, {
        fontFamily: TOKENS.font.display,
        fontSize: '84px',
        fontStyle: 'bold',
        color: hex(TOKENS.color.ink),
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 170, STRINGS.boot.tagline, {
        fontFamily: TOKENS.font.body,
        fontSize: '32px',
        color: hex(TOKENS.color.muted),
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height - 80, `${STRINGS.boot.build} · ${CARDS.length} cartas · ${LEVELS.length} niveles`, {
        fontFamily: TOKENS.font.body,
        fontSize: '24px',
        color: hex(TOKENS.color.muted),
      })
      .setOrigin(0.5);
  }
}
