import { getConfig } from '../config/gameConfig';
import { SkillSystem } from '../systems/SkillSystem';

export class SkillBar {
  scene: Phaser.Scene;
  gameScene: Phaser.Scene;
  buttons: Phaser.GameObjects.Text[] = [];

  private skills = [
    { id: 'biofilm_burst', label: 'バイオフィルム\n放出', key: '1' },
    { id: 'metabolite_shot', label: '代謝物\n放出', key: '2' },
    { id: 'toxin_release', label: '毒素\n放出', key: '3' }
  ];

  constructor(scene: Phaser.Scene, gameScene: Phaser.Scene) {
    this.scene = scene;
    this.gameScene = gameScene;

    const y = scene.cameras.main.height - 60;
    const startX = 10;

    this.skills.forEach((skill, i) => {
      const btn = scene.add.text(startX + i * 120, y, `[${skill.key}] ${skill.label}`, {
        fontSize: '11px',
        color: '#cccccc',
        backgroundColor: '#333355',
        padding: { x: 8, y: 8 },
        align: 'center'
      }).setDepth(100).setScrollFactor(0).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.activateSkill(skill.id);
      });

      this.buttons.push(btn);

      scene.input.keyboard!.on(`keydown-${skill.key}`, () => {
        this.activateSkill(skill.id);
      });
    });
  }

  private activateSkill(skillId: string) {
    const gs = this.gameScene as any;
    if (gs.skillSystem && gs.playerState) {
      const success = gs.skillSystem.useActiveSkill(gs.playerState, skillId);
      if (success) {
        if (skillId === 'metabolite_shot' && gs.gameMap) {
          const tile = gs.gameMap.getTile(gs.playerState.tileX, gs.playerState.tileY);
          if (tile) {
            tile.inflammation_local = Math.max(0, tile.inflammation_local - getConfig().skills.metabolite_shot_strength);
          }
        }
        if (skillId === 'toxin_release' && gs.gameMap) {
          for (const enemy of gs.enemies) {
            const dx = Math.abs(enemy.pos.tileX - gs.playerState.tileX);
            const dy = Math.abs(enemy.pos.tileY - gs.playerState.tileY);
            if (dx <= 2 && dy <= 2) {
              enemy.hp -= getConfig().skills.toxin_release_damage;
              enemy.colonySize -= getConfig().skills.toxin_release_damage;
            }
          }
          const tile = gs.gameMap.getTile(gs.playerState.tileX, gs.playerState.tileY);
          if (tile) {
            tile.inflammation_local += 1.0;
          }
        }

        const idx = this.skills.findIndex(s => s.id === skillId);
        if (idx >= 0 && this.buttons[idx]) {
          this.buttons[idx].setColor('#88ff88');
          this.scene.time.delayedCall(200, () => {
            if (this.buttons[idx]) this.buttons[idx].setColor('#cccccc');
          });
        }
      }
    }
  }
}
