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

  // Visuals
  attackCircle!: Phaser.GameObjects.Graphics;
  particleGraphics!: Phaser.GameObjects.Graphics;
  overexpressFlash!: Phaser.GameObjects.Rectangle;
  biofilmGraphics!: Phaser.GameObjects.Graphics;

  // Overexpress visual state
  overexpressRing = 0;
  overexpressActive = false;

  // Attack particles
  attackParticles: Array<{ x: number; y: number; tx: number; ty: number; life: number; color: number }> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    this.enemies = [];
    this.enemySprites = new Map();
    this.growthTimer = 0;
    this.inflammationTimer = 0;
    this.immuneTimer = 0;
    this.enemyAITimer = 0;
    this.competitorSpawnTimer = 0;
    this.autoAttackTimer = 0;
    this.elapsedTime = 0;
    this.isPaused = false;
    this.attackParticles = [];
    this.overexpressRing = 0;
    this.overexpressActive = false;
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

    // Visual layers
    this.biofilmGraphics = this.add.graphics().setDepth(3);
    this.attackCircle = this.add.graphics().setDepth(5);
    this.particleGraphics = this.add.graphics().setDepth(12);
    this.overexpressFlash = this.add.rectangle(
      config.map.gridWidth * config.map.tileSize / 2,
      config.map.gridHeight * config.map.tileSize / 2,
      config.map.gridWidth * config.map.tileSize,
      config.map.gridHeight * config.map.tileSize,
      0xff4444, 0
    ).setDepth(50);

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

    // Overexpress key (SPACE)
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.triggerOverexpress();
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

    // Colony regen from symbiosis skills
    if (this.playerState.regenRate > 0) {
      this.playerState.colonySize += this.playerState.regenRate * dt;
    }

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

      // Apply symbiosis inflammation decay bonus
      if (this.playerState.inflammationDecayBonus > 0) {
        const nearbyTiles = this.gameMap.getTilesInRange(
          this.playerState.tileX, this.playerState.tileY, this.playerState.attackRange
        );
        for (const tile of nearbyTiles) {
          tile.inflammation_local = Math.max(0,
            tile.inflammation_local - this.playerState.inflammationDecayBonus * (this.inflammationTimer / 1000)
          );
        }
      }

      // Apply capacity bonus
      if (this.playerState.capacityBonus > 0) {
        const nearbyTiles = this.gameMap.getTilesInRange(
          this.playerState.tileX, this.playerState.tileY, 2
        );
        for (const tile of nearbyTiles) {
          tile.capacityK = Math.max(tile.capacityK, tile.capacityK + this.playerState.capacityBonus * 0.01);
        }
      }

      this.inflammationTimer = 0;

      const stability = this.inflammationSystem.getHostStability(this.gameMap);
      const adaptCount = this.playerState.skillCounts.get('host_adapt') || 0;
      const threshold = Math.max(0.02, config.inflammation.defeat_threshold - adaptCount * 0.02);
      if (stability < threshold) {
        this.gameOver('host_destabilized');
      }
    }

    // Immune spawn tick (tier-based)
    this.immuneTimer += delta;
    if (this.immuneTimer >= config.ticks.immune_check_interval_ms) {
      const hostInflammation = this.inflammationSystem.getHostInflammation(this.gameMap);
      const newEnemies = this.immuneSystem.update(hostInflammation, this.gameMap, this.immuneTimer / 1000);
      for (const enemy of newEnemies) {
        this.spawnEnemy(enemy);
      }
      this.immuneTimer = 0;

      // Purge event at extreme inflammation
      if (hostInflammation > 5.0) {
        this.triggerPurgeEvent();
      }
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

    // === SCALED AUTO-ATTACK ===
    this.autoAttackTimer += delta;
    if (this.autoAttackTimer >= 500) {
      this.autoAttackTimer = 0;
      this.performAutoAttack();
    }

    // === OVEREXPRESS VISUAL ===
    if (this.overexpressActive) {
      this.overexpressRing += dt * 300;
      if (this.overexpressRing > this.playerState.attackRange * config.map.tileSize * 2) {
        this.overexpressActive = false;
      }
    }

    this.drawAttackVisuals();
    this.updateParticles(dt);
    this.drawBiofilm();

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

    // XP from nutrients (with multiplier)
    const currentTile = this.gameMap.getTile(this.playerState.tileX, this.playerState.tileY);
    if (currentTile) {
      this.playerState.xp += currentTile.nutrient * config.player.xp_per_nutrient * dt * this.playerState.nutrientMultiplier;
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

  // === OVEREXPRESS: the big gamble button ===
  triggerOverexpress() {
    if (this.playerState.overexpressCooldown > 0) return;

    const config = getConfig();
    const tileSize = config.map.tileSize;
    const range = this.playerState.attackRange + 2;
    const baseDamage = this.playerState.colonySize * 0.5 * this.playerState.overexpressPower;

    // Damage all enemies in range
    let killCount = 0;
    for (const enemy of this.enemies) {
      const dx = Math.abs(enemy.pos.tileX - this.playerState.tileX);
      const dy = Math.abs(enemy.pos.tileY - this.playerState.tileY);
      if (dx <= range && dy <= range) {
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const damage = baseDamage / dist;
        enemy.hp -= damage;
        enemy.colonySize = Math.max(0, enemy.colonySize - damage);
        if (enemy.hp <= 0) killCount++;

        // Spawn attack particles toward enemy
        const ex = enemy.pos.tileX * tileSize + tileSize / 2;
        const ey = enemy.pos.tileY * tileSize + tileSize / 2;
        for (let p = 0; p < 3; p++) {
          this.attackParticles.push({
            x: this.player.sprite.x + (Math.random() - 0.5) * 20,
            y: this.player.sprite.y + (Math.random() - 0.5) * 20,
            tx: ex, ty: ey,
            life: 0.5,
            color: 0xff2222
          });
        }
      }
    }

    // Inflammation spike
    const nearbyTiles = this.gameMap.getTilesInRange(
      this.playerState.tileX, this.playerState.tileY, range
    );
    for (const tile of nearbyTiles) {
      tile.inflammation_local += 1.5;
    }
    const centerTile = this.gameMap.getTile(this.playerState.tileX, this.playerState.tileY);
    if (centerTile) {
      centerTile.inflammation_local += 3.0;
    }

    // Spawn immune response
    for (let i = 0; i < 2; i++) {
      const sx = this.playerState.tileX + Math.floor((Math.random() - 0.5) * range * 2);
      const sy = this.playerState.tileY + Math.floor((Math.random() - 0.5) * range * 2);
      const type = Math.random() < 0.3 ? 'macrophage' : 'neutrophil';
      this.spawnEnemy(createEnemy(type as any,
        Math.max(0, Math.min(config.map.gridWidth - 1, sx)),
        Math.max(0, Math.min(config.map.gridHeight - 1, sy))
      ));
    }

    // XP reward
    this.playerState.xp += killCount * 10;

    // Set cooldown
    this.playerState.overexpressCooldown = this.playerState.overexpressMaxCooldown;

    // Visual effects
    this.overexpressActive = true;
    this.overexpressRing = 0;
    this.overexpressFlash.setAlpha(0.4);
    this.tweens.add({
      targets: this.overexpressFlash,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.Out'
    });

    // Camera shake
    this.cameras.main.shake(300, 0.01);

    this.events.emit('event-notification', `毒素暴走！ ${killCount}体に壊滅的ダメージ！`);
  }

  // Auto-attack: scales with level and skills
  performAutoAttack() {
    const range = this.playerState.attackRange;
    const baseDamage = this.playerState.colonySize * 0.05 * this.playerState.attackDamage;
    const tileSize = getConfig().map.tileSize;
    let hitAny = false;

    for (const enemy of this.enemies) {
      if (enemy.type === 'neutrophil' || enemy.type === 'macrophage') continue;
      const dx = Math.abs(enemy.pos.tileX - this.playerState.tileX);
      const dy = Math.abs(enemy.pos.tileY - this.playerState.tileY);
      if (dx <= range && dy <= range) {
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const damage = baseDamage / dist;
        enemy.hp -= damage;
        enemy.colonySize = Math.max(0, enemy.colonySize - damage);
        hitAny = true;

        // XP from fighting
        this.playerState.xp += damage * 0.1 * this.playerState.nutrientMultiplier;

        // Spawn attack particle toward enemy
        const ex = enemy.pos.tileX * tileSize + tileSize / 2;
        const ey = enemy.pos.tileY * tileSize + tileSize / 2;
        this.attackParticles.push({
          x: this.player.sprite.x + (Math.random() - 0.5) * 10,
          y: this.player.sprite.y + (Math.random() - 0.5) * 10,
          tx: ex, ty: ey,
          life: 0.3,
          color: 0x88ff44
        });
      }
    }

    if (hitAny) {
      this.attackCircle.setAlpha(0.5);
    }
  }

  drawAttackVisuals() {
    this.attackCircle.clear();
    const tileSize = getConfig().map.tileSize;
    const radius = this.playerState.attackRange * tileSize;
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    // Attack range circle - gets more visible as attacks get stronger
    const intensity = Math.min(0.4, 0.1 + this.playerState.attackDamage * 0.05);
    this.attackCircle.lineStyle(1 + Math.floor(this.playerState.attackDamage), 0x88ff88, intensity);
    this.attackCircle.strokeCircle(px, py, radius);

    // Overexpress expanding ring
    if (this.overexpressActive) {
      const ringAlpha = Math.max(0, 0.6 - this.overexpressRing / (radius * 2));
      this.attackCircle.lineStyle(3, 0xff4444, ringAlpha);
      this.attackCircle.strokeCircle(px, py, this.overexpressRing);
    }

    // Fade
    if (this.attackCircle.alpha > 0.1) {
      this.attackCircle.alpha -= 0.02;
    } else {
      this.attackCircle.alpha = 0.1;
    }
  }

  updateParticles(dt: number) {
    this.particleGraphics.clear();

    this.attackParticles = this.attackParticles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;

      // Move toward target
      const speed = 400;
      const ddx = p.tx - p.x;
      const ddy = p.ty - p.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist > 2) {
        p.x += (ddx / dist) * speed * dt;
        p.y += (ddy / dist) * speed * dt;
      }

      const alpha = Math.min(1, p.life * 3);
      const size = 2 + (1 - p.life) * 3;
      this.particleGraphics.fillStyle(p.color, alpha);
      this.particleGraphics.fillCircle(p.x, p.y, size);
      return true;
    });
  }

  drawBiofilm() {
    this.biofilmGraphics.clear();
    if (this.playerState.gene.biofilm < 0.15) return;

    const tileSize = getConfig().map.tileSize;
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const bioRadius = tileSize * (1 + this.playerState.gene.biofilm * 2);
    const alpha = this.playerState.gene.biofilm * 0.2;

    this.biofilmGraphics.fillStyle(0x44aa88, alpha);
    this.biofilmGraphics.fillCircle(px, py, bioRadius);
    this.biofilmGraphics.lineStyle(1, 0x66ccaa, alpha * 1.5);
    this.biofilmGraphics.strokeCircle(px, py, bioRadius);
  }

  triggerPurgeEvent() {
    const config = getConfig();
    const gw = config.map.gridWidth;
    const gh = config.map.gridHeight;

    // Spawn a wave of immune cells
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * gw);
      const y = Math.floor(Math.random() * gh);
      const type = Math.random() < 0.4 ? 'macrophage' : 'neutrophil';
      this.spawnEnemy(createEnemy(type as any, x, y));
    }
    this.events.emit('event-notification', '免疫掃討開始！炎症が危険レベル！');
    this.cameras.main.shake(500, 0.005);
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
    const killXpMultiplier = 1 + (this.playerState.skillCounts.get('kill_xp') || 0);

    for (const enemy of toRemove) {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        // Death particle burst
        const tileSize = getConfig().map.tileSize;
        const ex = enemy.pos.tileX * tileSize + tileSize / 2;
        const ey = enemy.pos.tileY * tileSize + tileSize / 2;
        for (let i = 0; i < 4; i++) {
          this.attackParticles.push({
            x: ex, y: ey,
            tx: ex + (Math.random() - 0.5) * 60,
            ty: ey + (Math.random() - 0.5) * 60,
            life: 0.4,
            color: enemy.type === 'pathogen' ? 0xff4444 : 0xddaa44
          });
        }
        sprite.destroy();
        this.enemySprites.delete(enemy.id);
      }
      // XP reward (scaled by kill_xp skill)
      this.playerState.xp += 5 * killXpMultiplier;
      this.playerState.colonySize += enemy.colonySize * 0.1;
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

    const fortifyCount = this.playerState.skillCounts.get('fortify') || 0;
    const damageReduction = 1 - Math.min(0.7, fortifyCount * 0.3);

    if (enemy.type === 'neutrophil') {
      this.playerState.colonySize -= config.immune.neutrophil_attack * damageReduction;
      enemy.hp = 0;
    } else if (enemy.type === 'macrophage') {
      this.playerState.colonySize -= config.immune.macrophage_attack * damageReduction;
      this.playerState.gene.biofilm = Math.max(0, this.playerState.gene.biofilm - 0.1);
      enemy.hp = 0;
    } else if (enemy.type === 'competitor' || enemy.type === 'pathogen') {
      const playerDamage = this.playerState.colonySize * 0.15 * this.playerState.attackDamage;
      const enemyDamage = enemy.colonySize * 0.1 * damageReduction;
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
