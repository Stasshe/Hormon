import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../models/PlayerState';
import { GameMap } from '../models/GameMap';
import { Enemy } from '../models/Enemy';
import { Tile } from '../models/Tile';

export class GrowthSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  update(player: PlayerState, gameMap: GameMap, enemies: Enemy[], dt: number) {
    // Player growth
    const tile = gameMap.getTile(player.tileX, player.tileY);
    if (tile) {
      this.updatePlayerGrowth(player, tile, gameMap, dt);
    }

    // Enemy bacteria growth
    for (const enemy of enemies) {
      if (enemy.type === 'competitor' || enemy.type === 'pathogen') {
        const eTile = gameMap.getTile(enemy.pos.tileX, enemy.pos.tileY);
        if (eTile) {
          this.updateEnemyGrowth(enemy, eTile, dt);
        }
      }
    }

    // Compute toxin expression
    this.updateToxinExpression(player, gameMap);
  }

  private updatePlayerGrowth(player: PlayerState, tile: Tile, gameMap: GameMap, dt: number) {
    const cfg = this.config.growth;

    const f_oxygen = Math.max(0, Math.min(1, 1 - tile.oxygen * cfg.oxygen_sensitivity));
    const f_nutrient = tile.nutrient;
    const f_pH = this.gaussianPH(tile.pH, cfg.optimal_pH, cfg.pH_sigma);

    const energyCost = cfg.c_toxin * player.gene.toxin + cfg.c_biofilm * player.gene.biofilm;
    const r_eff = cfg.r_base * f_oxygen * f_nutrient * f_pH - energyCost;

    const N = player.colonySize;
    const K = tile.capacityK;

    // Logistic growth: dN/dt = r_eff * N * (1 - N/K)
    const dN = r_eff * N * (1 - N / K) * dt;
    player.colonySize = Math.max(0, N + dN);

    // Energy
    player.energy = Math.max(0, Math.min(1, player.energy + f_nutrient * 0.01 * dt - energyCost * dt));

    // Consume nutrients slightly
    tile.nutrient = Math.max(0, tile.nutrient - 0.001 * N / K * dt);

    // Regenerate nutrients slowly
    const neighbors = gameMap.getNeighborTiles(tile.x, tile.y);
    const avgNutrient = neighbors.reduce((s, t) => s + t.nutrient, 0) / Math.max(1, neighbors.length);
    tile.nutrient = Math.min(1, tile.nutrient + (avgNutrient - tile.nutrient) * 0.01 * dt);
  }

  private updateEnemyGrowth(enemy: Enemy, tile: Tile, dt: number) {
    if (enemy.colonySize <= 0) return;

    const cfg = this.config.growth;
    // Simplified growth for enemies
    const r = cfg.r_base * 0.8; // slightly slower
    const f_nutrient = tile.nutrient;
    const K = tile.capacityK * 0.5; // share capacity

    const dN = r * f_nutrient * enemy.colonySize * (1 - enemy.colonySize / K) * dt;
    enemy.colonySize = Math.max(0, enemy.colonySize + dN);

    // Consume nutrients
    tile.nutrient = Math.max(0, tile.nutrient - 0.0005 * enemy.colonySize / K * dt);
  }

  private updateToxinExpression(player: PlayerState, gameMap: GameMap) {
    const tile = gameMap.getTile(player.tileX, player.tileY);
    if (!tile) return;

    // Quorum sensing
    const neighbors = gameMap.getNeighborTiles(player.tileX, player.tileY);
    const N_local = player.colonySize;

    const quorumSignal = Math.log(1 + N_local);
    const qc = this.config.quorum;

    // Toxin expression via sigmoid
    const x = qc.w_q * quorumSignal + qc.w_infl * tile.inflammation_local - qc.w_reg * player.gene.regulator;
    player.gene.toxin = this.sigmoid(x);

    // Stress response based on hostile environment
    player.gene.stress = Math.max(0, Math.min(1,
      tile.bile * 0.5 + (1 - this.gaussianPH(tile.pH, this.config.growth.optimal_pH, this.config.growth.pH_sigma)) * 0.5
    ));
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private gaussianPH(pH: number, optimal: number, sigma: number): number {
    const diff = pH - optimal;
    return Math.exp(-(diff * diff) / (2 * sigma * sigma));
  }
}
