import { PlayerState } from '../models/PlayerState';
import { GameMap } from '../models/GameMap';
import { GameConfig } from '../config/gameConfig';

export class Player {
  scene: Phaser.Scene;
  state: PlayerState;
  gameMap: GameMap;
  config: GameConfig;
  sprite!: Phaser.Physics.Arcade.Sprite;
  colonyText!: Phaser.GameObjects.Text;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  tileHighlight!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, state: PlayerState, gameMap: GameMap, config: GameConfig) {
    this.scene = scene;
    this.state = state;
    this.gameMap = gameMap;
    this.config = config;

    const tileSize = config.map.tileSize;
    const startX = state.tileX * tileSize + tileSize / 2;
    const startY = state.tileY * tileSize + tileSize / 2;

    const gfx = scene.add.graphics();
    gfx.fillStyle(0x44dd44, 1);
    gfx.fillCircle(16, 16, 14);
    gfx.lineStyle(2, 0x88ff88, 1);
    gfx.strokeCircle(16, 16, 14);
    gfx.fillStyle(0x66ff66, 0.6);
    gfx.fillCircle(12, 12, 5);
    gfx.generateTexture('player', 32, 32);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(startX, startY, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setDisplaySize(tileSize * 0.8, tileSize * 0.8);

    this.tileHighlight = scene.add.graphics();
    this.tileHighlight.setDepth(2);

    this.colonyText = scene.add.text(startX, startY - tileSize * 0.6, '', {
      fontSize: '12px',
      color: '#88ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(11);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: scene.input.keyboard!.addKey('W'),
      A: scene.input.keyboard!.addKey('A'),
      S: scene.input.keyboard!.addKey('S'),
      D: scene.input.keyboard!.addKey('D')
    };
  }

  update(dt: number) {
    // Speed scales with moveSpeedBonus
    const speed = this.config.player.move_speed * (1 + this.state.moveSpeedBonus);
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.sprite.setVelocity(vx, vy);

    const tileSize = this.config.map.tileSize;
    this.state.tileX = Math.floor(this.sprite.x / tileSize);
    this.state.tileY = Math.floor(this.sprite.y / tileSize);

    this.state.tileX = Math.max(0, Math.min(this.gameMap.gridWidth - 1, this.state.tileX));
    this.state.tileY = Math.max(0, Math.min(this.gameMap.gridHeight - 1, this.state.tileY));

    this.tileHighlight.clear();
    this.tileHighlight.lineStyle(2, 0x88ff88, 0.6);
    this.tileHighlight.strokeRect(
      this.state.tileX * tileSize,
      this.state.tileY * tileSize,
      tileSize,
      tileSize
    );

    this.colonyText.setPosition(this.sprite.x, this.sprite.y - tileSize * 0.6);
    this.colonyText.setText(`N: ${Math.floor(this.state.colonySize)}`);

    // Visual scaling: sprite grows with colony size
    const sizeScale = 0.8 + Math.min(0.7, this.state.colonySize / 1500);
    const pulse = 1 + 0.05 * Math.sin(this.scene.time.now / 400);
    this.sprite.setDisplaySize(tileSize * sizeScale * pulse, tileSize * sizeScale * pulse);

    // Tint gets more vibrant with level
    if (this.state.level >= 5) {
      this.sprite.setTint(0x66ff66);
    } else if (this.state.level >= 3) {
      this.sprite.setTint(0x55ee55);
    }
  }
}
