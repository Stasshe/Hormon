import { GameConfig } from '../config/gameConfig';

export interface GeneExpression {
  toxin: number;
  adhesion: number;
  biofilm: number;
  stress: number;
  regulator: number;
}

export interface PlayerState {
  tileX: number;
  tileY: number;
  colonySize: number;
  gene: GeneExpression;
  virulent: boolean;
  energy: number;
  skills: Set<string>;
  activeSkillCooldowns: Map<string, number>;
  xp: number;
  level: number;
  xpToNext: number;
}

export function createInitialPlayerState(config: GameConfig): PlayerState {
  return {
    tileX: 20,  // Start in cecum area
    tileY: Math.floor(config.map.gridHeight / 2),
    colonySize: config.player.initial_colony_size,
    gene: {
      toxin: 0,
      adhesion: 0.2,
      biofilm: 0.1,
      stress: 0,
      regulator: 0.3
    },
    virulent: false,
    energy: config.player.initial_energy,
    skills: new Set<string>(),
    activeSkillCooldowns: new Map<string, number>(),
    xp: 0,
    level: 1,
    xpToNext: config.player.base_level_xp
  };
}
