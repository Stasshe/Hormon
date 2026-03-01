import { Tile, TileLayer, createTile } from './Tile';
import { GameConfig } from '../config/gameConfig';

export class GameMap {
  gridWidth: number;
  gridHeight: number;
  tiles: Tile[][];
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    this.gridWidth = config.map.gridWidth;
    this.gridHeight = config.map.gridHeight;
    this.tiles = [];
  }

  generate() {
    const zones = this.config.map.zones;

    for (let y = 0; y < this.gridHeight; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Determine layer by y position
        const layerRatio = y / this.gridHeight;
        let layer: TileLayer;
        if (layerRatio < 0.3) {
          layer = 'epithelial';
        } else if (layerRatio < 0.6) {
          layer = 'mucus';
        } else {
          layer = 'lumen';
        }

        // Find zone
        const zone = zones.find(z => x >= z.startX && x < z.endX);
        const zoneName = zone ? zone.name : 'colon_transverse';

        const tile = createTile(x, y, layer, zoneName);

        if (zone) {
          // Add slight variation
          const noise = (Math.random() - 0.5) * 0.1;
          tile.oxygen = Math.max(0, Math.min(1, zone.oxygen + noise));
          tile.pH = zone.pH + (Math.random() - 0.5) * 0.3;
          tile.nutrient = Math.max(0, Math.min(1, zone.nutrient + noise));
          tile.bile = Math.max(0, Math.min(1, zone.bile + noise));

          // Layer modifiers
          if (layer === 'mucus') {
            tile.capacityK = zone.baseK * 2.5; // mucus has higher K
            tile.nutrient = Math.min(1, tile.nutrient * 1.3);
          } else if (layer === 'epithelial') {
            tile.capacityK = zone.baseK * 0.5;
            tile.oxygen = Math.min(1, tile.oxygen * 1.5); // closer to blood supply
          } else {
            tile.capacityK = zone.baseK;
          }
        }

        this.tiles[y][x] = tile;
      }
    }
  }

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return null;
    }
    return this.tiles[y][x];
  }

  getNeighborTiles(x: number, y: number, radius: number = 1): Tile[] {
    const tiles: Tile[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tile = this.getTile(x + dx, y + dy);
        if (tile) tiles.push(tile);
      }
    }
    return tiles;
  }

  getAllTiles(): Tile[] {
    const all: Tile[] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        all.push(this.tiles[y][x]);
      }
    }
    return all;
  }
}
