import { PlayerState } from '../models/PlayerState';

export class SkillBar {
  scene: Phaser.Scene;
  gameScene: Phaser.Scene;
  overexpressBtn!: Phaser.GameObjects.Text;
  overexpressCooldownBar!: Phaser.GameObjects.Graphics;
  attackInfo!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, gameScene: Phaser.Scene) {
    this.scene = scene;
    this.gameScene = gameScene;

    const width = scene.cameras.main.width;
    const y = scene.cameras.main.height - 55;

    // Overexpress button (center-bottom)
    this.overexpressBtn = scene.add.text(width / 2, y, '[SPACE] 毒素暴走', {
      fontSize: '16px',
      color: '#ff4444',
      fontStyle: 'bold',
      backgroundColor: '#442222',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.overexpressBtn.on('pointerdown', () => {
      const gs = this.gameScene as any;
      if (gs.triggerOverexpress) {
        gs.triggerOverexpress();
      }
    });

    // Cooldown bar under button
    this.overexpressCooldownBar = scene.add.graphics().setDepth(100).setScrollFactor(0);

    // Attack info (left of overexpress)
    this.attackInfo = scene.add.text(width / 2 - 180, y, '', {
      fontSize: '11px',
      color: '#88ff88',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 }
    }).setOrigin(0, 0.5).setDepth(100).setScrollFactor(0);
  }

  update(player: PlayerState) {
    // Update overexpress button state
    if (player.overexpressCooldown > 0) {
      const cd = Math.ceil(player.overexpressCooldown);
      this.overexpressBtn.setText(`[SPACE] 毒素暴走 (${cd}s)`);
      this.overexpressBtn.setColor('#666666');
      this.overexpressBtn.setBackgroundColor('#222222');

      // Draw cooldown bar
      const width = this.scene.cameras.main.width;
      const barWidth = 140;
      const barX = width / 2 - barWidth / 2;
      const barY = this.scene.cameras.main.height - 30;
      const ratio = player.overexpressCooldown / player.overexpressMaxCooldown;

      this.overexpressCooldownBar.clear();
      this.overexpressCooldownBar.fillStyle(0x333333, 0.8);
      this.overexpressCooldownBar.fillRect(barX, barY, barWidth, 6);
      this.overexpressCooldownBar.fillStyle(0xff4444, 0.8);
      this.overexpressCooldownBar.fillRect(barX, barY, barWidth * (1 - ratio), 6);
    } else {
      this.overexpressBtn.setText('[SPACE] 毒素暴走');
      this.overexpressBtn.setColor('#ff4444');
      this.overexpressBtn.setBackgroundColor('#442222');
      this.overexpressCooldownBar.clear();
    }

    // Attack stats
    const dmg = (player.attackDamage * 100).toFixed(0);
    const rng = player.attackRange;
    this.attackInfo.setText(`攻撃力: ${dmg}%  範囲: ${rng}`);
  }
}
