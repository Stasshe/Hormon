import { getConfig } from '../config/gameConfig';
import { GameMap } from '../models/GameMap';
import { PlayerState, createInitialPlayerState } from '../models/PlayerState';
import { Player } from '../objects/Player';
import { TileRenderer } from '../objects/TileRenderer';
import { GrowthSystem } from '../systems/GrowthSystem';
import { InflammationSystem } from '../systems/InflammationSystem';
import { PeristalsisSystem } from '../systems/PeristalsisSystem';
import { ImmuneSystem } from '../systems/ImmuneSystem';
import { EnemyAI } from '../systems/EnemyAI';
import { EventSystem } from '../systems/EventSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { EnemySprite } from '../objects/EnemySprite';
import { Enemy, createEnemy } from '../models/Enemy';

export default class GameScene extends Phaser.Scene {
  gameMap!: GameMap;
  playerState!: PlayerState;
  player!: Player;
  tileRenderer!: TileRenderer;

  growthSystem!: GrowthSystem;
  inflammationSystem!: InflammationSystem;
  peristalsisSystem!: PeristalsisSystem;
  immuneSystem!: ImmuneSystem;
  enemyAI!: EnemyAI;
  eventSystem!: EventSystem;
  skillSystem!: SkillSystem;

  enemies: Enemy[] = [];
  enemySprites: Map<string, EnemySprite> = new Map();
  enemyGroup!: Phaser.Physics.Arcade.Group;

  growthTimer = 0;
  inflammationTimer = 0;
  immuneTimer = 0;
  enemyAITimer = 0;
  competitorSpawnTimer = 0;
  autoAttackTimer = 0;
  elapsedTime = 0;

  isPaused = false;

  // Auto-attack visuals
  attackCircle!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const config = getConfig();

    this.gameMap = new GameMap(config);
    this.gameMap.generate();

    this.tileRenderer = new TileRenderer(this, this.gameMap, config.map.tileSize);
    this.tileRenderer.render();

    this.playerState = createInitialPlayerState(config);
    this.player = new Player(this, this.playerState, this.gameMap, config);

    this.enemyGroup = this.physics.add.group();

    // Auto-attack range indicator
    this.attackCircle = this.add.graphics().setDepth(5);

    this.growthSystem = new GrowthSystem(config);
    this.inflammationSystem = new InflammationSystem(config);
    this.peristalsisSystem = new PeristalsisSystem(config);
    this.immuneSystem = new ImmuneSystem(config);
    this.enemyAI = new EnemyAI(config);
    this.eventSystem = new EventSystem(config);
    this.skillSystem = new SkillSystem(config);

    const mapWidthPx = config.map.gridWidth * config.map.tileSize;
    const mapHeightPx = config.map.gridHeight * config.map.tileSize;
    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.physics.world.setBounds(0, 0, mapWidthPx, mapHeightPx);

    this.physics.add.overlap(this.player.sprite, this.enemyGroup, this.handlePlayerEnemyCollision, undefined, this);

    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.launch('PauseScene');
      this.scene.pause();
    });

    this.events.emit('game-ready', this.playerState, this.gameMap);
    this.spawnInitialEnemies();
  }

  spawnInitialEnemies() {
    const config = getConfig();
    const gw = config.map.gridWidth;
    const gh = config.map.gridHeight;

    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * gw);
      const y = Math.floor(Math.random() * gh);
      if (Math.abs(x - this.playerState.tileX) < 3 && Math.abs(y - this.playerState.tileY) < 3) continue;
      this.spawnEnemy(createEnemy('competitor', x, y));
    }

    const pathogenXs = [30, 45, 60];
    for (const px of pathogenXs) {
      const py = Math.floor(Math.random() * gh);
      this.spawnEnemy(createEnemy('pathogen', px, py));
    }

    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * gw);
      const y = Math.floor(Math.random() * gh);
      this.spawnEnemy(createEnemy('neutrophil', x, y));
    }
    this.spawnEnemy(createEnemy('macrophage', Math.floor(gw / 2), Math.floor(gh / 2)));
  }

  update(time: number, delta: number) {
    if (this.isPaused) return;

    const dt = delta / 1000;
    const config = getConfig();
    this.elapsedTime += dt;

    this.player.update(dt);

    // Growth tick
    this.growthTimer += delta;
    if (this.growthTimer >= config.ticks.growth_interval_ms) {
      this.growthSystem.update(this.playerState, this.gameMap, this.enemies, this.growthTimer / 1000);
      this.growthTimer = 0;
    }

    // Inflammation tick
    this.inflammationTimer += delta;
    if (this.inflammationTimer >= config.ticks.inflammation_interval_ms) {
      this.inflammationSystem.update(this.gameMap, this.playerState, this.enemies, this.inflammationTimer / 1000);
      this.inflammationTimer = 0;

      const stability = this.inflammationSystem.getHostStability(this.gameMap);
      if (stability < config.inflammation.defeat_threshold) {
        this.gameOver('host_destabilized');
      }
    }

    // Immune spawn tick
    this.immuneTimer += delta;
    if (this.immuneTimer >= config.ticks.immune_check_interval_ms) {
      const hostInflammation = this.inflammationSystem.getHostInflammation(this.gameMap);
      const newEnemies = this.immuneSystem.update(hostInflammation, this.gameMap, this.immuneTimer / 1000);
      for (const enemy of newEnemies) {
        this.spawnEnemy(enemy);
      }
      this.immuneTimer = 0;
    }

    // Competitor respawn
    this.competitorSpawnTimer += dt;
    if (this.competitorSpawnTimer >= 8) {
      this.competitorSpawnTimer = 0;
      const bacteriaCount = this.enemies.filter(e => e.type === 'competitor' || e.type === 'pathogen').length;
      if (bacteriaCount < 15) {
        const gw = config.map.gridWidth;
        const gh = config.map.gridHeight;
        for (let i = 0; i < 3; i++) {
          const x = Math.floor(Math.random() * gw);
          const y = Math.floor(Math.random() * gh);
          const type = Math.random() < 0.2 ? 'pathogen' : 'competitor';
          this.spawnEnemy(createEnemy(type as any, x, y));
        }
      }
    }

    // Enemy AI tick
    this.enemyAITimer += delta;
    if (this.enemyAITimer >= config.ticks.enemy_ai_interval_ms) {
      this.enemyAI.update(this.enemies, this.gameMap, this.playerState, this.enemyAITimer / 1000);
      this.enemyAITimer = 0;
    }

    // === AUTO-ATTACK (bacteriocin) ===
    this.autoAttackTimer += delta;
    if (this.autoAttackTimer >= 500) {
      this.autoAttackTimer = 0;
      this.performAutoAttack();
    }
    this.drawAttackRange();

    // Peristalsis
    const peristalsisTimeBefore = this.peristalsisSystem.getTimeUntilNext();
    this.peristalsisSystem.update(dt, this.playerState, this.enemies, this.gameMap);
    const peristalsisTimeAfter = this.peristalsisSystem.getTimeUntilNext();

    if (this.peristalsisSystem.isWarning()) {
      this.events.emit('peristalsis-warning', this.peristalsisSystem.getTimeUntilNext());
    }
    if (peristalsisTimeAfter > peristalsisTimeBefore) {
      this.triggerPeristalsisVisual();
    }

    // Events
    const wasPlasmid = this.playerState.virulent;
    const wasAntibiotic = this.eventSystem.isAntibioticActive();
    this.eventSystem.update(dt, this.playerState, this.enemies);

    if (!wasPlasmid && this.playerState.virulent) {
      this.events.emit('event-notification', 'プラスミド獲得！毒性が上昇！');
    }
    if (!wasAntibiotic && this.eventSystem.isAntibioticActive()) {
      this.events.emit('event-notification', '抗生物質検知！コロニーに圧力！');
    }

    // Skills / XP
    this.skillSystem.updateXP(this.playerState, dt);
    this.skillSystem.updateCooldowns(this.playerState, dt);

    // XP from nutrients
    const currentTile = this.gameMap.getTile(this.playerState.tileX, this.playerState.tileY);
    if (currentTile) {
      this.playerState.xp += currentTile.nutrient * config.player.xp_per_nutrient * dt;
    }

    if (this.skillSystem.checkLevelUp(this.playerState)) {
      this.events.emit('level-up', this.playerState);
    }

    this.updateEnemySprites();
    this.tileRenderer.updateInflammation(this.gameMap);
    this.events.emit('game-update', this.playerState, this.gameMap, this.elapsedTime);
    this.cleanupDeadEnemies();

    if (this.playerState.colonySize <= 0) {
      this.gameOver('colony_extinct');
    }
  }

  // Auto-attack: player colony releases bacteriocin, damaging nearby bacteria
  performAutoAttack() {
    const attackRange = 3; // tiles
    const baseDamage = this.playerState.colonySize * 0.05;
    const tileSize = getConfig().map.tileSize;
    let hitAny = false;

    for (const enemy of this.enemies) {
      if (enemy.type === 'neutrophil' || enemy.type === 'macrophage') continue; // don't auto-attack immune
      const dx = Math.abs(enemy.pos.tileX - this.playerState.tileX);
      const dy = Math.abs(enemy.pos.tileY - this.playerState.tileY);
      if (dx <= attackRange && dy <= attackRange) {
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const damage = baseDamage / dist;
        enemy.hp -= damage;
        enemy.colonySize = Math.max(0, enemy.colonySize - damage);
        hitAny = true;

        // XP from fighting
        this.playerState.xp += damage * 0.1;
      }
    }

    // Visual flash on attack
    if (hitAny) {
      this.attackCircle.setAlpha(0.4);
    }
  }

  drawAttackRange() {
    this.attackCircle.clear();
    const tileSize = getConfig().map.tileSize;
    const radius = 3 * tileSize;

    this.attackCircle.lineStyle(1, 0x88ff88, 0.15);
    this.attackCircle.strokeCircle(this.player.sprite.x, this.player.sprite.y, radius);

    // Fade out
    if (this.attackCircle.alpha > 0.1) {
      this.attackCircle.alpha -= 0.02;
    } else {
      this.attackCircle.alpha = 0.1;
    }
  }

  spawnEnemy(enemy: Enemy) {
    this.enemies.push(enemy);
    const tileSize = getConfig().map.tileSize;
    const sprite = new EnemySprite(this, enemy, tileSize);
    this.enemySprites.set(enemy.id, sprite);
    this.enemyGroup.add(sprite.sprite);
  }

  updateEnemySprites() {
    const tileSize = getConfig().map.tileSize;
    for (const enemy of this.enemies) {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        sprite.updatePosition(enemy, tileSize);
      }
    }
  }

  cleanupDeadEnemies() {
    const toRemove = this.enemies.filter(e => e.hp <= 0);
    for (const enemy of toRemove) {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        sprite.destroy();
        this.enemySprites.delete(enemy.id);
      }
      // XP reward for kills
      this.playerState.xp += 5;
      this.playerState.colonySize += enemy.colonySize * 0.1; // absorb some resources
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  handlePlayerEnemyCollision(_playerSprite: any, enemySpriteObj: any) {
    const config = getConfig();
    const enemy = this.enemies.find(e => {
      const sprite = this.enemySprites.get(e.id);
      return sprite && sprite.sprite === enemySpriteObj;
    });
    if (!enemy) return;

    if (enemy.type === 'neutrophil') {
      this.playerState.colonySize -= config.immune.neutrophil_attack;
      enemy.hp = 0;
    } else if (enemy.type === 'macrophage') {
      this.playerState.colonySize -= config.immune.macrophage_attack;
      this.playerState.gene.biofilm = Math.max(0, this.playerState.gene.biofilm - 0.1);
      enemy.hp = 0;
    } else if (enemy.type === 'competitor' || enemy.type === 'pathogen') {
      // Mutual combat: both take damage
      const playerDamage = this.playerState.colonySize * 0.15;
      const enemyDamage = enemy.colonySize * 0.1;
      enemy.hp -= playerDamage;
      enemy.colonySize = Math.max(0, enemy.colonySize - playerDamage);
      this.playerState.colonySize -= enemyDamage;
    }
  }

  gameOver(reason: string) {
    this.scene.stop('UIScene');
    this.scene.start('ResultScene', {
      reason,
      elapsedTime: this.elapsedTime,
      colonySize: this.playerState.colonySize,
      level: this.playerState.level
    });
    this.scene.stop();
  }

  triggerPeristalsisVisual() {
    this.tileRenderer.flashPeristalsis();
  }
}
