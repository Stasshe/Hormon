import { GameConfig } from '../config/gameConfig';
import { Enemy } from '../models/Enemy';
import { GameMap } from '../models/GameMap';
import { PlayerState } from '../models/PlayerState';

export class EnemyAI {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  update(enemies: Enemy[], gameMap: GameMap, player: PlayerState, dt: number) {
    for (const enemy of enemies) {
      switch (enemy.type) {
        case 'competitor':
          this.updateCompetitor(enemy, gameMap, player, dt);
          break;
        case 'pathogen':
          this.updatePathogen(enemy, gameMap, dt);
          break;
        case 'neutrophil':
          this.updateNeutrophil(enemy, gameMap, player, dt);
          break;
        case 'macrophage':
          this.updateMacrophage(enemy, gameMap, player, dt);
          break;
      }
    }
  }

  private updateCompetitor(enemy: Enemy, gameMap: GameMap, player: PlayerState, dt: number) {
    enemy.behaviorState.moveCooldown -= dt;
    if (enemy.behaviorState.moveCooldown > 0) return;
    enemy.behaviorState.moveCooldown = 1.0 + Math.random();

    // Move toward nutrient-rich tiles
    const neighbors = gameMap.getNeighborTiles(enemy.pos.tileX, enemy.pos.tileY);
    if (neighbors.length === 0) return;

    let bestTile = neighbors[0];
    let bestScore = -Infinity;

    for (const tile of neighbors) {
      const score = tile.nutrient * 2 - tile.inflammation_local;
      if (score > bestScore) {
        bestScore = score;
        bestTile = tile;
      }
    }

    enemy.pos.tileX = bestTile.x;
    enemy.pos.tileY = bestTile.y;

    // Bacteriocin: reduce player colony if in same tile
    if (enemy.pos.tileX === player.tileX && enemy.pos.tileY === player.tileY) {
      player.colonySize -= enemy.colonySize * 0.01 * dt;
      player.colonySize = Math.max(0, player.colonySize);
    }
  }

  private updatePathogen(enemy: Enemy, gameMap: GameMap, dt: number) {
    enemy.behaviorState.moveCooldown -= dt;
    if (enemy.behaviorState.moveCooldown > 0) return;
    enemy.behaviorState.moveCooldown = 2.0 + Math.random() * 2;

    // Move randomly, prefer low-oxygen areas
    const neighbors = gameMap.getNeighborTiles(enemy.pos.tileX, enemy.pos.tileY);
    if (neighbors.length === 0) return;

    const sorted = [...neighbors].sort((a, b) => a.oxygen - b.oxygen);
    const pick = Math.random() < 0.7 ? sorted[0] : sorted[Math.floor(Math.random() * sorted.length)];

    enemy.pos.tileX = pick.x;
    enemy.pos.tileY = pick.y;

    // High toxin output when colony is large
    enemy.behaviorState.toxinOutput = enemy.colonySize > 100 ? 0.8 : 0.3;
  }

  private updateNeutrophil(enemy: Enemy, gameMap: GameMap, player: PlayerState, dt: number) {
    // Move directly toward player (high inflammation source)
    const dx = player.tileX - enemy.pos.tileX;
    const dy = player.tileY - enemy.pos.tileY;

    if (dx !== 0 || dy !== 0) {
      // Move one tile toward player each tick
      if (Math.abs(dx) >= Math.abs(dy)) {
        enemy.pos.tileX += dx > 0 ? 1 : -1;
      } else {
        enemy.pos.tileY += dy > 0 ? 1 : -1;
      }

      // Clamp
      enemy.pos.tileX = Math.max(0, Math.min(gameMap.gridWidth - 1, enemy.pos.tileX));
      enemy.pos.tileY = Math.max(0, Math.min(gameMap.gridHeight - 1, enemy.pos.tileY));
    }
  }

  private updateMacrophage(enemy: Enemy, gameMap: GameMap, player: PlayerState, dt: number) {
    enemy.behaviorState.moveCooldown -= dt;
    if (enemy.behaviorState.moveCooldown > 0) return;
    enemy.behaviorState.moveCooldown = 0.5;

    // Move toward highest inflammation
    const neighbors = gameMap.getNeighborTiles(enemy.pos.tileX, enemy.pos.tileY);
    const currentTile = gameMap.getTile(enemy.pos.tileX, enemy.pos.tileY);

    if (neighbors.length === 0) return;

    let bestTile = currentTile;
    let bestInflammation = currentTile ? currentTile.inflammation_local : 0;

    for (const tile of neighbors) {
      if (tile.inflammation_local > bestInflammation) {
        bestInflammation = tile.inflammation_local;
        bestTile = tile;
      }
    }

    if (bestTile && bestTile !== currentTile) {
      enemy.pos.tileX = bestTile.x;
      enemy.pos.tileY = bestTile.y;
    }

    // Area suppression: reduce inflammation on current tile
    if (currentTile) {
      currentTile.inflammation_local *= 0.95;
    }
  }
}
