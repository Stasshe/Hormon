import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../models/PlayerState';
import { Enemy, createEnemy } from '../models/Enemy';

export class EventSystem {
  config: GameConfig;
  antibioticTimer: number = 0;
  plasmidTimer: number = 0;
  antibioticActive: boolean = false;
  antibioticDuration: number = 0;

  constructor(config: GameConfig) {
    this.config = config;
  }

  update(dt: number, player: PlayerState, enemies: Enemy[]) {
    this.updateAntibioticEvent(dt, player, enemies);
    this.updatePlasmidEvent(dt, player);
  }

  private updateAntibioticEvent(dt: number, player: PlayerState, enemies: Enemy[]) {
    const cfg = this.config.events;

    if (this.antibioticActive) {
      this.antibioticDuration -= dt;

      // Apply antibiotic damage
      if (!player.virulent) {
        player.colonySize *= (1 - 0.1 * dt);
      }

      for (const enemy of enemies) {
        if (enemy.type === 'competitor' || enemy.type === 'pathogen') {
          enemy.colonySize *= (1 - 0.15 * dt); // enemies more susceptible
        }
      }

      if (this.antibioticDuration <= 0) {
        this.antibioticActive = false;
      }
      return;
    }

    this.antibioticTimer += dt;
    if (this.antibioticTimer >= 60) {
      if (Math.random() < cfg.antibiotic_chance_per_min) {
        this.antibioticActive = true;
        this.antibioticDuration = 10; // 10 seconds duration
      }
      this.antibioticTimer = 0;
    }
  }

  private updatePlasmidEvent(dt: number, player: PlayerState) {
    if (player.virulent) return; // Already has plasmid

    const cfg = this.config.events;
    this.plasmidTimer += dt;

    let chance = cfg.plasmid_base_chance * dt;
    // Higher chance during antibiotics
    if (this.antibioticActive) {
      chance *= 10;
    }

    if (Math.random() < chance) {
      this.acquirePlasmid(player);
    }
  }

  private acquirePlasmid(player: PlayerState) {
    player.virulent = true;
    // Temporary growth bonus handled in growth system
  }

  isAntibioticActive(): boolean {
    return this.antibioticActive;
  }

  getAntibioticTimeLeft(): number {
    return this.antibioticActive ? this.antibioticDuration : 0;
  }
}
