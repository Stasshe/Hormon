import { GameConfig } from '../config/gameConfig';
import { Enemy, createEnemy, EnemyType } from '../models/Enemy';
import { GameMap } from '../models/GameMap';

export class ImmuneSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  update(hostInflammation: number, gameMap: GameMap, dt: number): Enemy[] {
    const cfg = this.config.immune;
    const newEnemies: Enemy[] = [];

    const spawnProb = (cfg.base_spawn + cfg.k_infl * hostInflammation) * dt;

    if (Math.random() < spawnProb) {
      const type = this.chooseImmuneType(hostInflammation);
      const spawnTile = this.findInflammedTile(gameMap);

      if (spawnTile) {
        const enemy = createEnemy(type, spawnTile.x, spawnTile.y);
        enemy.speed = type === 'neutrophil' ? cfg.neutrophil_speed : cfg.macrophage_speed;
        newEnemies.push(enemy);
      }
    }

    return newEnemies;
  }

  private chooseImmuneType(hostInflammation: number): EnemyType {
    if (hostInflammation > 2.0) {
      return Math.random() < 0.4 ? 'macrophage' : 'neutrophil';
    } else if (hostInflammation > 0.5) {
      return Math.random() < 0.2 ? 'macrophage' : 'neutrophil';
    }
    return 'neutrophil';
  }

  private findInflammedTile(gameMap: GameMap): { x: number; y: number } | null {
    const allTiles = gameMap.getAllTiles();
    // Weight by inflammation
    const weighted = allTiles
      .filter(t => t.inflammation_local > 0.01)
      .sort((a, b) => b.inflammation_local - a.inflammation_local);

    if (weighted.length > 0) {
      // Pick from top inflamed tiles with some randomness
      const idx = Math.floor(Math.random() * Math.min(5, weighted.length));
      return { x: weighted[idx].x, y: weighted[idx].y };
    }

    // Random tile if no inflammation
    return {
      x: Math.floor(Math.random() * gameMap.gridWidth),
      y: Math.floor(Math.random() * gameMap.gridHeight)
    };
  }
}
