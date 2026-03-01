import { PlayerState } from '../models/PlayerState';
import { GameMap } from '../models/GameMap';
import { HUD } from '../ui/HUD';
import { Minimap } from '../ui/Minimap';
import { SkillBar } from '../ui/SkillBar';
import { LevelUpUI } from '../ui/LevelUpUI';

export default class UIScene extends Phaser.Scene {
  hud!: HUD;
  minimap!: Minimap;
  skillBar!: SkillBar;
  levelUpUI!: LevelUpUI;
  tutorialContainer!: Phaser.GameObjects.Container;
  tutorialShown = false;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const gameScene = this.scene.get('GameScene');

    this.hud = new HUD(this);
    this.minimap = new Minimap(this);
    this.skillBar = new SkillBar(this, gameScene);
    this.levelUpUI = new LevelUpUI(this, gameScene);

    gameScene.events.on('game-update', (playerState: PlayerState, gameMap: GameMap, elapsed: number) => {
      this.hud.update(playerState, gameMap, elapsed);
      this.minimap.update(gameMap, playerState);
    });

    gameScene.events.on('level-up', (playerState: PlayerState) => {
      this.levelUpUI.show(playerState);
    });

    gameScene.events.on('peristalsis-warning', (secondsLeft: number) => {
      this.hud.showPeristalsisWarning(secondsLeft);
    });

    gameScene.events.on('event-notification', (message: string) => {
      this.hud.showNotification(message);
    });

    // Show tutorial on first launch
    this.showTutorial();
  }

  showTutorial() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.tutorialContainer = this.add.container(0, 0).setDepth(300);

    // Semi-transparent overlay
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    this.tutorialContainer.add(bg);

    // Title
    const title = this.add.text(width / 2, 40, 'Hormon!', {
      fontSize: '42px',
      color: '#44dd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tutorialContainer.add(title);

    const subtitle = this.add.text(width / 2, 82, 'Survive as E. coli in the gut', {
      fontSize: '18px',
      color: '#88ff88'
    }).setOrigin(0.5);
    this.tutorialContainer.add(subtitle);

    // Instructions panel
    const instructions = [
      { icon: 'WASD/Arrows', desc: 'Move your colony through the intestine' },
      { icon: 'Goal', desc: 'Grow your colony while keeping the host stable' },
      { icon: 'Danger', desc: 'Immune cells (blue) attack on contact' },
      { icon: 'Warning', desc: 'Peristalsis pushes you right every 20s' },
      { icon: '1 / 2 / 3', desc: 'Skills: Biofilm / Metabolite / Toxin' },
      { icon: 'Level Up', desc: 'Gain XP, choose gene mutations on level up' },
      { icon: 'Game Over', desc: 'Colony dies (N=0) or host destabilized' },
    ];

    const panelY = 115;
    instructions.forEach((inst, i) => {
      const yy = panelY + i * 36;

      const iconText = this.add.text(width / 2 - 260, yy, inst.icon, {
        fontSize: '14px',
        color: '#ffdd44',
        fontStyle: 'bold',
        backgroundColor: '#334433',
        padding: { x: 6, y: 3 }
      }).setOrigin(0, 0);
      this.tutorialContainer.add(iconText);

      const descText = this.add.text(width / 2 - 110, yy + 2, inst.desc, {
        fontSize: '14px',
        color: '#ccddcc'
      }).setOrigin(0, 0);
      this.tutorialContainer.add(descText);
    });

    // Legend
    const legendY = panelY + instructions.length * 36 + 15;
    const legends = [
      { color: 0x44dd44, label: 'You (E. coli)' },
      { color: 0xddaa44, label: 'Competitor (Bacteroides)' },
      { color: 0xdd4444, label: 'Pathogen (C. difficile)' },
      { color: 0x4488dd, label: 'Neutrophil (immune)' },
      { color: 0x44dddd, label: 'Macrophage (immune)' },
    ];

    const legendTitle = this.add.text(width / 2, legendY, '-- Entities --', {
      fontSize: '13px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.tutorialContainer.add(legendTitle);

    legends.forEach((leg, i) => {
      const lx = width / 2 - 220 + (i % 3) * 180;
      const ly = legendY + 20 + Math.floor(i / 3) * 26;

      const swatch = this.add.rectangle(lx, ly + 7, 12, 12, leg.color);
      this.tutorialContainer.add(swatch);

      const label = this.add.text(lx + 12, ly, leg.label, {
        fontSize: '12px',
        color: '#cccccc'
      });
      this.tutorialContainer.add(label);
    });

    // Tile layer guide
    const tileY = legendY + 78;
    const tileTitle = this.add.text(width / 2, tileY, '-- Map Layers (top to bottom) --', {
      fontSize: '13px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.tutorialContainer.add(tileTitle);

    const layers = [
      { color: 0x6b3a5e, label: 'Epithelial - More O2, lower capacity' },
      { color: 0x4a3066, label: 'Mucus - High capacity, rich nutrients' },
      { color: 0x2d1b4e, label: 'Lumen - Main gut interior' },
    ];

    layers.forEach((l, i) => {
      const ly = tileY + 18 + i * 24;
      const swatch = this.add.rectangle(width / 2 - 200, ly + 7, 16, 12, l.color);
      this.tutorialContainer.add(swatch);
      const label = this.add.text(width / 2 - 180, ly, l.label, {
        fontSize: '12px',
        color: '#cccccc'
      });
      this.tutorialContainer.add(label);
    });

    // Start button
    const startBtn = this.add.text(width / 2, height - 40, '[ Click or press any key to start ]', {
      fontSize: '22px',
      color: '#44dd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tutorialContainer.add(startBtn);

    // Blink the start text
    this.tweens.add({
      targets: startBtn,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    // Pause game while tutorial is showing
    const gs = this.scene.get('GameScene');
    gs.scene.pause();

    // Dismiss on click or keypress
    const dismiss = () => {
      if (this.tutorialShown) return;
      this.tutorialShown = true;
      this.tutorialContainer.destroy();
      gs.scene.resume();
    };

    this.input.once('pointerdown', dismiss);
    this.input.keyboard!.once('keydown', dismiss);
  }
}
