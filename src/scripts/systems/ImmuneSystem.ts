import { GameConfig } from '../config/gameConfig';
import { Enemy, createEnemy, EnemyType } from '../models/Enemy';
import { GameMap } from '../models/GameMap';

export class ImmuneSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  update(hostInflammation: number, gameMap: GameMap, dt: number): Enemy[] {
    const newEnemies: Enemy[] = [];

    // Tier-based spawning - immune is a CONSEQUENCE of inflammation
    // Tier 0: inflammation < 0.5 → no spawns (safe zone)
    // Tier 1: 0.5-1.5 → neutrophils only, slow
    // Tier 2: 1.5-3.0 → neutrophils frequent + rare macrophage
    // Tier 3: 3.0-5.0 → both frequent
    // Tier 4: > 5.0 → handled by purge event in GameScene

    if (hostInflammation < 0.5) {
      return newEnemies; // Peace - no immune activity
    }

    let spawnProb: number;
    let macrophageChance: number;
    let spawnCount: number;

    if (hostInflammation < 1.5) {
      // Tier 1: Light response
      spawnProb = 0.15 * dt;
      macrophageChance = 0;
      spawnCount = 1;
    } else if (hostInflammation < 3.0) {
      // Tier 2: Moderate response
      spawnProb = 0.3 * dt;
      macrophageChance = 0.15;
      spawnCount = 1;
    } else {
      // Tier 3: Heavy response
      spawnProb = 0.5 * dt;
      macrophageChance = 0.35;
      spawnCount = 2;
    }

    for (let i = 0; i < spawnCount; i++) {
      if (Math.random() < spawnProb) {
        const type: EnemyType = Math.random() < macrophageChance ? 'macrophage' : 'neutrophil';
        const spawnTile = this.findInflammedTile(gameMap);

        if (spawnTile) {
          const cfg = this.config.immune;
          const enemy = createEnemy(type, spawnTile.x, spawnTile.y);
          enemy.speed = type === 'neutrophil' ? cfg.neutrophil_speed : cfg.macrophage_speed;
          newEnemies.push(enemy);
        }
      }
    }

    return newEnemies;
  }

  private findInflammedTile(gameMap: GameMap): { x: number; y: number } | null {
    const allTiles = gameMap.getAllTiles();
    const weighted = allTiles
      .filter(t => t.inflammation_local > 0.01)
      .sort((a, b) => b.inflammation_local - a.inflammation_local);

    if (weighted.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(5, weighted.length));
      return { x: weighted[idx].x, y: weighted[idx].y };
    }

    return {
      x: Math.floor(Math.random() * gameMap.gridWidth),
      y: Math.floor(Math.random() * gameMap.gridHeight)
    };
  }
}
