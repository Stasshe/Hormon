import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../models/PlayerState';
import { Enemy } from '../models/Enemy';
import { GameMap } from '../models/GameMap';

export class PeristalsisSystem {
  config: GameConfig;
  timer: number = 0;
  warningEmitted: boolean = false;

  constructor(config: GameConfig) {
    this.config = config;
    this.timer = 0;
  }

  update(dt: number, player: PlayerState, enemies: Enemy[], gameMap: GameMap) {
    const cfg = this.config.peristalsis;
    this.timer += dt;

    // Warning at 5 seconds before
    if (!this.warningEmitted && this.timer >= cfg.interval - 5) {
      this.warningEmitted = true;
      // Scene will listen for this via event
    }

    if (this.timer >= cfg.interval) {
      this.trigger(player, enemies, gameMap);
      this.timer = 0;
      this.warningEmitted = false;
    }
  }

  getTimeUntilNext(): number {
    return Math.max(0, this.config.peristalsis.interval - this.timer);
  }

  isWarning(): boolean {
    return this.timer >= this.config.peristalsis.interval - 5;
  }

  private trigger(player: PlayerState, enemies: Enemy[], gameMap: GameMap) {
    const cfg = this.config.peristalsis;

    // Player: if adhesion < threshold, lose cells
    if (player.gene.adhesion < cfg.adhesion_threshold) {
      const lossRatio = cfg.flow_fraction * (1 - player.gene.adhesion / cfg.adhesion_threshold);
      const biofilmProtection = player.gene.biofilm * 0.5;
      const effectiveLoss = lossRatio * (1 - biofilmProtection);

      player.colonySize -= player.colonySize * effectiveLoss;
      player.colonySize = Math.max(0, player.colonySize);

      // Push player sprite position right
      const newTileX = Math.min(gameMap.gridWidth - 1, player.tileX + cfg.flow_strength);
      player.tileX = newTileX;
    }

    // Enemies: same logic but simpler
    for (const enemy of enemies) {
      if (enemy.type === 'competitor' || enemy.type === 'pathogen') {
        const lossRatio = cfg.flow_fraction * 0.8; // enemies have some innate adhesion
        enemy.colonySize -= enemy.colonySize * lossRatio;

        // Move right
        enemy.pos.tileX = Math.min(gameMap.gridWidth - 1, enemy.pos.tileX + cfg.flow_strength);

        // If pushed off map edge, kill
        if (enemy.pos.tileX >= gameMap.gridWidth - 1) {
          enemy.colonySize = 0;
          enemy.hp = 0;
        }
      }
    }
  }
}
