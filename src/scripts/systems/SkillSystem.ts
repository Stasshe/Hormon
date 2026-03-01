import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../models/PlayerState';

export type SkillPath = 'virulence' | 'symbiosis' | 'colonization';

export interface SkillChoice {
  id: string;
  path: SkillPath;
  name: string;
  description: string;
  color: number;
}

// 毒性パス (赤) - 火力 + リスク
// 共生パス (青) - 安全 + 持続
// 定着パス (黄) - 領土 + 耐久
const SKILL_POOL: SkillChoice[] = [
  // === Virulence (赤) ===
  { id: 'toxin_boost', path: 'virulence', name: '毒素強化',
    description: '自動攻撃ダメージ +30%', color: 0xff4444 },
  { id: 'attack_range', path: 'virulence', name: 'バクテリオシン拡散',
    description: '攻撃範囲 +1タイル', color: 0xff4444 },
  { id: 'rapid_division', path: 'virulence', name: '加速分裂',
    description: 'コロニー増殖速度 +20%', color: 0xff4444 },
  { id: 'overexpress_power', path: 'virulence', name: '暴走強化',
    description: '暴走ダメージ x1.5、クールダウン -5秒', color: 0xff4444 },
  { id: 'kill_xp', path: 'virulence', name: '捕食者の直感',
    description: '敵撃破XP +100%', color: 0xff4444 },

  // === Symbiosis (青) ===
  { id: 'metabolite_heal', path: 'symbiosis', name: '有益代謝',
    description: '周囲の炎症を毎秒減少させる', color: 0x4488ff },
  { id: 'host_adapt', path: 'symbiosis', name: '宿主適応',
    description: '宿主安定度のゲームオーバー閾値を下げる', color: 0x4488ff },
  { id: 'nutrient_eff', path: 'symbiosis', name: '栄養効率',
    description: 'XP獲得量 +50%', color: 0x4488ff },
  { id: 'regulator_boost', path: 'symbiosis', name: 'レギュレーター強化',
    description: '制御遺伝子+0.15、炎症上昇を抑制', color: 0x4488ff },
  { id: 'colony_regen', path: 'symbiosis', name: 'コロニー再生',
    description: 'コロニーが毎秒2ずつ回復', color: 0x4488ff },

  // === Colonization (黄) ===
  { id: 'adhesion_up', path: 'colonization', name: '接着強化',
    description: '接着力+0.15、蠕動耐性アップ', color: 0xddaa22 },
  { id: 'biofilm_up', path: 'colonization', name: 'バイオフィルム強化',
    description: 'バイオフィルム+0.15、免疫耐性アップ', color: 0xddaa22 },
  { id: 'capacity_up', path: 'colonization', name: '領域拡大',
    description: '周囲タイルの収容力+500', color: 0xddaa22 },
  { id: 'speed_up', path: 'colonization', name: '移動速度強化',
    description: '移動速度 +20%', color: 0xddaa22 },
  { id: 'fortify', path: 'colonization', name: '要塞化',
    description: '接触ダメージを-30%軽減', color: 0xddaa22 },
];

export class SkillSystem {
  config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  updateXP(player: PlayerState, dt: number) {
    player.xp += this.config.player.xp_per_second * dt * player.nutrientMultiplier;
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
    // Pick one from each path to guarantee variety
    const paths: SkillPath[] = ['virulence', 'symbiosis', 'colonization'];
    const choices: SkillChoice[] = [];

    for (const path of paths) {
      const pool = SKILL_POOL.filter(s => s.path === path);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      choices.push(pick);
    }

    return choices.slice(0, count);
  }

  applySkill(player: PlayerState, skillId: string) {
    player.skills.add(skillId);
    const count = (player.skillCounts.get(skillId) || 0) + 1;
    player.skillCounts.set(skillId, count);

    switch (skillId) {
      // === Virulence ===
      case 'toxin_boost':
        player.attackDamage += 0.3;
        break;
      case 'attack_range':
        player.attackRange += 1;
        break;
      case 'rapid_division':
        player.gene.toxin = Math.min(1, player.gene.toxin + 0.1);
        break;
      case 'overexpress_power':
        player.overexpressPower *= 1.5;
        player.overexpressMaxCooldown = Math.max(10, player.overexpressMaxCooldown - 5);
        break;
      case 'kill_xp':
        // Handled in cleanupDeadEnemies via skillCounts
        break;

      // === Symbiosis ===
      case 'metabolite_heal':
        player.inflammationDecayBonus += 0.01;
        break;
      case 'host_adapt':
        // Handled in inflammation check via skillCounts
        break;
      case 'nutrient_eff':
        player.nutrientMultiplier += 0.5;
        break;
      case 'regulator_boost':
        player.gene.regulator = Math.min(1, player.gene.regulator + 0.15);
        break;
      case 'colony_regen':
        player.regenRate += 2;
        break;

      // === Colonization ===
      case 'adhesion_up':
        player.gene.adhesion = Math.min(1, player.gene.adhesion + 0.15);
        break;
      case 'biofilm_up':
        player.gene.biofilm = Math.min(1, player.gene.biofilm + 0.15);
        break;
      case 'capacity_up':
        player.capacityBonus += 500;
        break;
      case 'speed_up':
        player.moveSpeedBonus += 0.2;
        break;
      case 'fortify':
        // Handled in collision via skillCounts
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
    // Overexpress cooldown
    if (player.overexpressCooldown > 0) {
      player.overexpressCooldown = Math.max(0, player.overexpressCooldown - dt);
    }
  }
}
