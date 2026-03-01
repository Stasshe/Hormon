import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../models/PlayerState';

export interface SkillChoice {
  id: string;
  name: string;
  description: string;
}

const ALL_PASSIVE_SKILLS: SkillChoice[] = [
  { id: 'regulator_up', name: 'レギュレーター強化', description: '制御遺伝子を強化し、毒素発現を抑制する' },
  { id: 'adhesion_up', name: '接着力強化', description: '接着力を上げ、蠕動に耐える' },
  { id: 'biofilm_up', name: 'バイオフィルム強化', description: 'バイオフィルムを増やし、流れと免疫に耐える' },
  { id: 'metabolic_efficiency_up', name: '代謝効率化', description: '遺伝子発現のエネルギーコストを削減' },
  { id: 'quorum_suppression', name: 'クオラム抑制', description: 'クオラム信号の感度を下げる' }
];

export class SkillSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  updateXP(player: PlayerState, dt: number) {
    player.xp += this.config.player.xp_per_second * dt;
  }

  checkLevelUp(player: PlayerState): boolean {
    return player.xp >= player.xpToNext;
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
        player.energy = Math.min(1, player.energy + 0.1);
        break;
      case 'quorum_suppression':
        player.gene.regulator = Math.min(1, player.gene.regulator + 0.1);
        break;
    }
  }

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
