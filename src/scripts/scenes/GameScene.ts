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
  elapsedTime = 0;

  isPaused = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const config = getConfig();

    // Create map
    this.gameMap = new GameMap(config);
    this.gameMap.generate();

    // Render tiles
    this.tileRenderer = new TileRenderer(this, this.gameMap, config.map.tileSize);
    this.tileRenderer.render();

    // Create player
    this.playerState = createInitialPlayerState(config);
    this.player = new Player(this, this.playerState, this.gameMap, config);

    // Enemy group
    this.enemyGroup = this.physics.add.group();

    // Init systems
    this.growthSystem = new GrowthSystem(config);
    this.inflammationSystem = new InflammationSystem(config);
    this.peristalsisSystem = new PeristalsisSystem(config);
    this.immuneSystem = new ImmuneSystem(config);
    this.enemyAI = new EnemyAI(config);
    this.eventSystem = new EventSystem(config);
    this.skillSystem = new SkillSystem(config);

    // Camera follows player
    const mapWidthPx = config.map.gridWidth * config.map.tileSize;
    const mapHeightPx = config.map.gridHeight * config.map.tileSize;
    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Physics world bounds
    this.physics.world.setBounds(0, 0, mapWidthPx, mapHeightPx);

    // Collision: player vs enemies
    this.physics.add.overlap(this.player.sprite, this.enemyGroup, this.handlePlayerEnemyCollision, undefined, this);

    // Pause key
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.launch('PauseScene');
      this.scene.pause();
    });

    // Emit ready event for UI
    this.events.emit('game-ready', this.playerState, this.gameMap);

    // Spawn initial competitors in various zones
    this.spawnInitialEnemies();
  }

  spawnInitialEnemies() {
    const config = getConfig();
    // Spawn a few competitors and one pathogen
    const competitorPositions = [
      { x: 30, y: 5 }, { x: 35, y: 8 }, { x: 45, y: 6 },
      { x: 50, y: 10 }, { x: 60, y: 7 }
    ];
    for (const pos of competitorPositions) {
      if (pos.x < config.map.gridWidth && pos.y < config.map.gridHeight) {
        const enemy = createEnemy('competitor', pos.x, pos.y);
        this.spawnEnemy(enemy);
      }
    }
    // One pathogen in the colon
    const pathogen = createEnemy('pathogen', 40, 8);
    this.spawnEnemy(pathogen);
  }

  update(time: number, delta: number) {
    if (this.isPaused) return;

    const dt = delta / 1000;
    const config = getConfig();
    this.elapsedTime += dt;

    // Player movement
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

      // Check game over
      const stability = this.inflammationSystem.getHostStability(this.gameMap);
      if (stability < config.inflammation.defeat_threshold) {
        this.gameOver('Host destabilized!');
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

    // Enemy AI tick
    this.enemyAITimer += delta;
    if (this.enemyAITimer >= config.ticks.enemy_ai_interval_ms) {
      this.enemyAI.update(this.enemies, this.gameMap, this.playerState, this.enemyAITimer / 1000);
      this.enemyAITimer = 0;
    }

    // Peristalsis
    const peristalsisTimeBefore = this.peristalsisSystem.getTimeUntilNext();
    this.peristalsisSystem.update(dt, this.playerState, this.enemies, this.gameMap);
    const peristalsisTimeAfter = this.peristalsisSystem.getTimeUntilNext();

    // Peristalsis warning
    if (this.peristalsisSystem.isWarning()) {
      this.events.emit('peristalsis-warning', this.peristalsisSystem.getTimeUntilNext());
    }

    // Peristalsis visual (triggered when timer resets)
    if (peristalsisTimeAfter > peristalsisTimeBefore) {
      this.triggerPeristalsisVisual();
    }

    // Events
    const wasPlasmid = this.playerState.virulent;
    const wasAntibiotic = this.eventSystem.isAntibioticActive();
    this.eventSystem.update(dt, this.playerState, this.enemies);

    // Event notifications
    if (!wasPlasmid && this.playerState.virulent) {
      this.events.emit('event-notification', 'Plasmid acquired! Virulence increased!');
    }
    if (!wasAntibiotic && this.eventSystem.isAntibioticActive()) {
      this.events.emit('event-notification', 'Antibiotics detected! Colony under pressure!');
    }

    // Skills / XP
    this.skillSystem.updateXP(this.playerState, dt);
    this.skillSystem.updateCooldowns(this.playerState, dt);
    if (this.skillSystem.checkLevelUp(this.playerState)) {
      this.events.emit('level-up', this.playerState);
    }

    // Update enemy sprites
    this.updateEnemySprites();

    // Update tile renderer (inflammation visual)
    this.tileRenderer.updateInflammation(this.gameMap);

    // Emit update for UI
    this.events.emit('game-update', this.playerState, this.gameMap, this.elapsedTime);

    // Remove dead enemies
    this.cleanupDeadEnemies();

    // Check colony death
    if (this.playerState.colonySize <= 0) {
      this.gameOver('Colony extinct!');
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
    } else if (enemy.type === 'macrophage') {
      this.playerState.colonySize -= config.immune.macrophage_attack;
      this.playerState.gene.biofilm = Math.max(0, this.playerState.gene.biofilm - 0.1);
    }

    enemy.hp = 0; // Immune cell dies after attack
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

  // Called from peristalsis for visual
  triggerPeristalsisVisual() {
    this.tileRenderer.flashPeristalsis();
  }
}
