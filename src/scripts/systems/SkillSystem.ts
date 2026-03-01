import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../models/PlayerState';

export interface SkillChoice {
  id: string;
  name: string;
  description: string;
}

const ALL_PASSIVE_SKILLS: SkillChoice[] = [
  { id: 'regulator_up', name: 'Regulator+', description: 'Increase regulator expression, reducing toxin' },
  { id: 'adhesion_up', name: 'Adhesion+', description: 'Increase adhesion, resist peristalsis' },
  { id: 'biofilm_up', name: 'Biofilm+', description: 'Increase biofilm, resist flow and immune' },
  { id: 'metabolic_efficiency_up', name: 'Efficiency+', description: 'Reduce energy cost of gene expression' },
  { id: 'quorum_suppression', name: 'Quorum Suppress', description: 'Reduce quorum signal sensitivity' }
];

export class SkillSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  updateXP(player: PlayerState, dt: number) {
    const cfg = this.config.player;
    // XP from survival time
    player.xp += cfg.xp_per_second * dt;

    // XP from being on nutrient-rich tiles is handled elsewhere
  }

  checkLevelUp(player: PlayerState): boolean {
    if (player.xp >= player.xpToNext) {
      return true;
    }
    return false;
  }

  performLevelUp(player: PlayerState) {
    player.level++;
    player.xp -= player.xpToNext;
    player.xpToNext = Math.floor(player.xpToNext * this.config.player.level_xp_multiplier);
  }

  getRandomChoices(count: number = 3): SkillChoice[] {
    const shuffled = [...ALL_PASSIVE_SKILLS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  applySkill(player: PlayerState, skillId: string) {
    player.skills.add(skillId);

    switch (skillId) {
      case 'regulator_up':
        player.gene.regulator = Math.min(1, player.gene.regulator + 0.15);
        break;
      case 'adhesion_up':
        player.gene.adhesion = Math.min(1, player.gene.adhesion + 0.15);
        break;
      case 'biofilm_up':
        player.gene.biofilm = Math.min(1, player.gene.biofilm + 0.15);
        break;
      case 'metabolic_efficiency_up':
        // Reduce cost multipliers (handled in growth system via player state)
        player.energy = Math.min(1, player.energy + 0.1);
        break;
      case 'quorum_suppression':
        // Reduce regulator effect of quorum (stored in gene for simplicity)
        player.gene.regulator = Math.min(1, player.gene.regulator + 0.1);
        break;
    }
  }

  // Active skills
  useActiveSkill(player: PlayerState, skillId: string): boolean {
    const cooldown = player.activeSkillCooldowns.get(skillId);
    if (cooldown && cooldown > 0) return false;

    const cfg = this.config.skills;

    switch (skillId) {
      case 'biofilm_burst':
        player.activeSkillCooldowns.set(skillId, cfg.biofilm_burst_cooldown);
        player.gene.biofilm = Math.min(1, player.gene.biofilm + 0.4);
        return true;
      case 'metabolite_shot':
        player.activeSkillCooldowns.set(skillId, cfg.metabolite_shot_cooldown);
        return true;
      case 'toxin_release':
        if (!player.virulent) return false;
        player.activeSkillCooldowns.set(skillId, cfg.toxin_release_cooldown);
        return true;
    }
    return false;
  }

  updateCooldowns(player: PlayerState, dt: number) {
    for (const [key, value] of player.activeSkillCooldowns) {
      player.activeSkillCooldowns.set(key, Math.max(0, value - dt));
    }
  }
}
