import { Enemy } from '../models/Enemy';

export class EnemySprite {
  scene: Phaser.Scene;
  sprite!: Phaser.Physics.Arcade.Sprite;
  nameText!: Phaser.GameObjects.Text;

  private static texturesCreated = new Set<string>();

  private colorMap: Record<string, number> = {
    competitor: 0xddaa44,
    pathogen: 0xdd4444,
    neutrophil: 0x4488dd,
    macrophage: 0x44dddd
  };

  constructor(scene: Phaser.Scene, enemy: Enemy, tileSize: number) {
    this.scene = scene;

    const textureKey = `enemy_${enemy.type}`;
    if (!EnemySprite.texturesCreated.has(textureKey)) {
      const gfx = scene.add.graphics();
      const color = this.colorMap[enemy.type] || 0xffffff;

      if (enemy.type === 'neutrophil' || enemy.type === 'macrophage') {
        gfx.fillStyle(color, 1);
        gfx.fillCircle(16, 16, enemy.type === 'macrophage' ? 15 : 12);
        gfx.lineStyle(2, 0xffffff, 0.5);
        gfx.strokeCircle(16, 16, enemy.type === 'macrophage' ? 15 : 12);
      } else {
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(4, 8, 24, 16, 8);
        gfx.lineStyle(1, 0xffffff, 0.4);
        gfx.strokeRoundedRect(4, 8, 24, 16, 8);
      }

      gfx.generateTexture(textureKey, 32, 32);
      gfx.destroy();
      EnemySprite.texturesCreated.add(textureKey);
    }

    const px = enemy.pos.tileX * tileSize + tileSize / 2;
    const py = enemy.pos.tileY * tileSize + tileSize / 2;

    this.sprite = scene.physics.add.sprite(px, py, textureKey);
    this.sprite.setDepth(8);
    this.sprite.setDisplaySize(tileSize * 0.7, tileSize * 0.7);

    const labels: Record<string, string> = {
      competitor: '競合菌',
      pathogen: '病原菌',
      neutrophil: '好中球',
      macrophage: 'マクロファージ'
    };
    this.nameText = scene.add.text(px, py - tileSize * 0.5, labels[enemy.type] || '', {
      fontSize: '9px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(9);
  }

  updatePosition(enemy: Enemy, tileSize: number) {
    const targetX = enemy.pos.tileX * tileSize + tileSize / 2;
    const targetY = enemy.pos.tileY * tileSize + tileSize / 2;

    this.sprite.x += (targetX - this.sprite.x) * 0.15;
    this.sprite.y += (targetY - this.sprite.y) * 0.15;

    this.nameText.setPosition(this.sprite.x, this.sprite.y - tileSize * 0.5);
  }

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
