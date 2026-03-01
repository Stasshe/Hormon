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

  // Auto-attack scaling
  attackRange: number;
  attackDamage: number;

  // Overexpress
  overexpressCooldown: number;
  overexpressMaxCooldown: number;
  overexpressPower: number;

  // Symbiosis bonuses
  regenRate: number;
  inflammationDecayBonus: number;
  nutrientMultiplier: number;

  // Colonization bonuses
  moveSpeedBonus: number;
  capacityBonus: number;

  // Skill pick counts (for stacking display)
  skillCounts: Map<string, number>;
}

export function createInitialPlayerState(config: GameConfig): PlayerState {
  return {
    tileX: 20,
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
    xpToNext: config.player.base_level_xp,

    attackRange: 3,
    attackDamage: 1.0,

    overexpressCooldown: 0,
    overexpressMaxCooldown: 30,
    overexpressPower: 1.0,

    regenRate: 0,
    inflammationDecayBonus: 0,
    nutrientMultiplier: 1.0,

    moveSpeedBonus: 0,
    capacityBonus: 0,

    skillCounts: new Map<string, number>()
  };
}
