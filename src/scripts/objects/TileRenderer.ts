import { GameMap } from '../models/GameMap';
import { Tile } from '../models/Tile';

export class TileRenderer {
  scene: Phaser.Scene;
  gameMap: GameMap;
  tileSize: number;
  graphics!: Phaser.GameObjects.Graphics;
  inflammationGraphics!: Phaser.GameObjects.Graphics;

  private layerColors: Record<string, number> = {
    lumen: 0x2d1b4e,
    mucus: 0x4a3066,
    epithelial: 0x6b3a5e
  };

  constructor(scene: Phaser.Scene, gameMap: GameMap, tileSize: number) {
    this.scene = scene;
    this.gameMap = gameMap;
    this.tileSize = tileSize;
    this.graphics = scene.add.graphics();
    this.inflammationGraphics = scene.add.graphics();
    this.inflammationGraphics.setDepth(1);
  }

  render() {
    this.graphics.clear();

    for (let y = 0; y < this.gameMap.gridHeight; y++) {
      for (let x = 0; x < this.gameMap.gridWidth; x++) {
        const tile = this.gameMap.tiles[y][x];
        this.drawTile(tile);
      }
    }
  }

  private drawTile(tile: Tile) {
    const px = tile.x * this.tileSize;
    const py = tile.y * this.tileSize;

    // Base color from layer
    let baseColor = this.layerColors[tile.layer] || 0x2d1b4e;

    // Modulate by nutrient (brighter = more nutrient)
    const nutrientBoost = Math.floor(tile.nutrient * 40);
    const r = ((baseColor >> 16) & 0xff) + nutrientBoost;
    const g = ((baseColor >> 8) & 0xff) + Math.floor(tile.nutrient * 25);
    const b = (baseColor & 0xff) + nutrientBoost;

    const finalColor = (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);

    this.graphics.fillStyle(finalColor, 1);
    this.graphics.fillRect(px, py, this.tileSize - 1, this.tileSize - 1);

    // Zone border hints (subtle grid lines)
    this.graphics.lineStyle(1, 0x333355, 0.3);
    this.graphics.strokeRect(px, py, this.tileSize - 1, this.tileSize - 1);
  }

  updateInflammation(gameMap: GameMap) {
    this.inflammationGraphics.clear();

    for (let y = 0; y < gameMap.gridHeight; y++) {
      for (let x = 0; x < gameMap.gridWidth; x++) {
        const tile = gameMap.tiles[y][x];
        if (tile.inflammation_local > 0.01) {
          const px = tile.x * this.tileSize;
          const py = tile.y * this.tileSize;
          const alpha = Math.min(0.6, tile.inflammation_local * 0.3);
          this.inflammationGraphics.fillStyle(0xff2222, alpha);
          this.inflammationGraphics.fillRect(px, py, this.tileSize - 1, this.tileSize - 1);
        }
      }
    }
  }

  flashPeristalsis() {
    const flash = this.scene.add.graphics();
    flash.setDepth(5);

    // Create a wave effect from left to right
    let waveX = 0;
    const mapWidth = this.gameMap.gridWidth * this.tileSize;
    const mapHeight = this.gameMap.gridHeight * this.tileSize;

    const timer = this.scene.time.addEvent({
      delay: 16,
      repeat: 60,
      callback: () => {
        flash.clear();
        flash.fillStyle(0x4488ff, 0.3);
        flash.fillRect(waveX, 0, 80, mapHeight);
        waveX += mapWidth / 60;
        if (timer.getRepeatCount() === 0) {
          flash.destroy();
        }
      }
    });
  }
}
