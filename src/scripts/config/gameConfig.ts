export interface ZoneConfig {
  name: string;
  startX: number;
  endX: number;
  oxygen: number;
  pH: number;
  nutrient: number;
  bile: number;
  baseK: number;
}

export interface GameConfig {
  growth: {
    r_base: number;
    c_toxin: number;
    c_biofilm: number;
    oxygen_sensitivity: number;
    optimal_pH: number;
    pH_sigma: number;
  };
  quorum: {
    w_q: number;
    w_infl: number;
    w_reg: number;
    threshold: number;
  };
  peristalsis: {
    interval: number;
    flow_fraction: number;
    adhesion_threshold: number;
    flow_strength: number;
  };
  inflammation: {
    alpha_toxin: number;
    gamma_benefit: number;
    delta: number;
    stability_scale: number;
    defeat_threshold: number;
  };
  immune: {
    base_spawn: number;
    k_infl: number;
    neutrophil_speed: number;
    neutrophil_attack: number;
    macrophage_speed: number;
    macrophage_attack: number;
    macrophage_aoe_radius: number;
  };
  events: {
    antibiotic_chance_per_min: number;
    plasmid_base_chance: number;
    plasmid_growth_bonus: number;
    plasmid_immune_multiplier: number;
  };
  player: {
    initial_colony_size: number;
    initial_energy: number;
    move_speed: number;
    xp_per_second: number;
    xp_per_nutrient: number;
    base_level_xp: number;
    level_xp_multiplier: number;
  };
  skills: {
    biofilm_burst_cooldown: number;
    biofilm_burst_duration: number;
    metabolite_shot_cooldown: number;
    metabolite_shot_strength: number;
    toxin_release_cooldown: number;
    toxin_release_damage: number;
  };
  map: {
    tileSize: number;
    gridWidth: number;
    gridHeight: number;
    zones: ZoneConfig[];
  };
  ticks: {
    growth_interval_ms: number;
    inflammation_interval_ms: number;
    immune_check_interval_ms: number;
    enemy_ai_interval_ms: number;
  };
}

let cachedConfig: GameConfig | null = null;

export function setConfig(config: GameConfig) {
  cachedConfig = config;
}

export function getConfig(): GameConfig {
  if (!cachedConfig) {
    throw new Error('Game config not loaded yet. Call setConfig first.');
  }
  return cachedConfig;
}
