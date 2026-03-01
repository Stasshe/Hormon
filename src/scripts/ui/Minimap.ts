import { GameMap } from '../models/GameMap';
import { PlayerState } from '../models/PlayerState';

export class Minimap {
  scene: Phaser.Scene;
  graphics!: Phaser.GameObjects.Graphics;
  width: number;
  height: number;
  x: number;
  y: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.width = 180;
    this.height = 50;
    this.x = scene.cameras.main.width - this.width - 10;
    this.y = scene.cameras.main.height - this.height - 10;

    this.graphics = scene.add.graphics().setDepth(100).setScrollFactor(0);
  }

  update(gameMap: GameMap, player: PlayerState) {
    this.graphics.clear();

    // Background
    this.graphics.fillStyle(0x000000, 0.7);
    this.graphics.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);

    const scaleX = this.width / gameMap.gridWidth;
    const scaleY = this.height / gameMap.gridHeight;

    // Draw tiles
    for (let y = 0; y < gameMap.gridHeight; y++) {
      for (let x = 0; x < gameMap.gridWidth; x++) {
        const tile = gameMap.tiles[y][x];

        // Color based on combined factors
        let r = Math.floor(tile.inflammation_local * 200);
        let g = Math.floor(tile.nutrient * 100 + 30);
        let b = Math.floor((1 - tile.oxygen) * 80 + 40);
        r = Math.min(255, r);
        g = Math.min(255, g);
        b = Math.min(255, b);

        const color = (r << 16) | (g << 8) | b;
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(
          this.x + x * scaleX,
          this.y + y * scaleY,
          Math.max(1, scaleX),
          Math.max(1, scaleY)
        );
      }
    }

    // Player position indicator
    this.graphics.fillStyle(0x44ff44, 1);
    this.graphics.fillRect(
      this.x + player.tileX * scaleX - 1,
      this.y + player.tileY * scaleY - 1,
      3,
      3
    );

    // Border
    this.graphics.lineStyle(1, 0xffffff, 0.5);
    this.graphics.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
  }
}
