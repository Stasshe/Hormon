import { GameConfig } from '../config/gameConfig';
import { GameMap } from '../models/GameMap';
import { PlayerState } from '../models/PlayerState';
import { Enemy } from '../models/Enemy';

export class InflammationSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  update(gameMap: GameMap, player: PlayerState, enemies: Enemy[], dt: number) {
    const cfg = this.config.inflammation;

    // Update inflammation on player tile
    const playerTile = gameMap.getTile(player.tileX, player.tileY);
    if (playerTile) {
      const toxinContribution = cfg.alpha_toxin * player.gene.toxin * player.colonySize;
      const beneficialReduction = cfg.gamma_benefit * (1 - player.gene.toxin) * player.colonySize * 0.01;
      const decay = cfg.delta * playerTile.inflammation_local;

      playerTile.inflammation_local += (toxinContribution - beneficialReduction - decay) * dt;
      playerTile.inflammation_local = Math.max(0, playerTile.inflammation_local);
    }

    // Enemy contributions
    for (const enemy of enemies) {
      if (enemy.type === 'pathogen' && enemy.colonySize > 0) {
        const tile = gameMap.getTile(enemy.pos.tileX, enemy.pos.tileY);
        if (tile) {
          const toxinContrib = cfg.alpha_toxin * enemy.behaviorState.toxinOutput * enemy.colonySize * 3;
          tile.inflammation_local += toxinContrib * dt;
        }
      }
    }

    // Diffuse inflammation to neighbors and decay globally
    const allTiles = gameMap.getAllTiles();
    for (const tile of allTiles) {
      // Decay
      tile.inflammation_local -= cfg.delta * tile.inflammation_local * dt * 0.5;
      tile.inflammation_local = Math.max(0, tile.inflammation_local);
    }

    // Diffusion pass
    const inflCopy: number[][] = [];
    for (let y = 0; y < gameMap.gridHeight; y++) {
      inflCopy[y] = [];
      for (let x = 0; x < gameMap.gridWidth; x++) {
        inflCopy[y][x] = gameMap.tiles[y][x].inflammation_local;
      }
    }

    for (let y = 0; y < gameMap.gridHeight; y++) {
      for (let x = 0; x < gameMap.gridWidth; x++) {
        const neighbors = gameMap.getNeighborTiles(x, y);
        if (neighbors.length > 0) {
          const avg = neighbors.reduce((s, t) => s + inflCopy[t.y][t.x], 0) / neighbors.length;
          const current = inflCopy[y][x];
          gameMap.tiles[y][x].inflammation_local += (avg - current) * 0.05 * dt;
        }
      }
    }
  }

  getHostInflammation(gameMap: GameMap): number {
    const allTiles = gameMap.getAllTiles();
    if (allTiles.length === 0) return 0;
    const total = allTiles.reduce((s, t) => s + t.inflammation_local, 0);
    return total / allTiles.length;
  }

  getHostStability(gameMap: GameMap): number {
    const hostInflammation = this.getHostInflammation(gameMap);
    return Math.exp(-hostInflammation / this.config.inflammation.stability_scale);
  }
}
