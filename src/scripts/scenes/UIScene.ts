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

  private static firstPlay = true;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.tutorialShown = false;

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

    if (UIScene.firstPlay) {
      UIScene.firstPlay = false;
      this.showTutorial();
    }
  }

  showTutorial() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.tutorialContainer = this.add.container(0, 0).setDepth(300);

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.tutorialContainer.add(bg);

    const title = this.add.text(width / 2, 30, 'Hormon!', {
      fontSize: '42px',
      color: '#44dd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tutorialContainer.add(title);

    const subtitle = this.add.text(width / 2, 72, '腸内で生き延びる大腸菌ローグライク', {
      fontSize: '16px',
      color: '#88ff88'
    }).setOrigin(0.5);
    this.tutorialContainer.add(subtitle);

    const instructions = [
      { icon: 'WASD/矢印', desc: '腸内を移動する' },
      { icon: '目標', desc: 'コロニーを育てつつ、宿主を安定に保つ' },
      { icon: '自動攻撃', desc: '近くの競合菌・病原菌を自動でバクテリオシンで攻撃' },
      { icon: '体当たり', desc: '競合菌にぶつかると互いにダメージ（倒すとXP＋吸収）' },
      { icon: '免疫細胞', desc: '好中球(青)・マクロファージ(水色)は接触でコロニー減少' },
      { icon: '蠕動', desc: '20秒ごとに腸が動き、接着力が低いと右に流される' },
      { icon: '1/2/3キー', desc: 'スキル: バイオフィルム / 代謝物 / 毒素 放出' },
      { icon: 'レベルアップ', desc: '経験値が溜まると遺伝子変異を選択できる' },
    ];

    const panelY = 105;
    instructions.forEach((inst, i) => {
      const yy = panelY + i * 32;

      const iconText = this.add.text(width / 2 - 280, yy, inst.icon, {
        fontSize: '13px',
        color: '#ffdd44',
        fontStyle: 'bold',
        backgroundColor: '#334433',
        padding: { x: 6, y: 3 }
      }).setOrigin(0, 0);
      this.tutorialContainer.add(iconText);

      const descText = this.add.text(width / 2 - 130, yy + 2, inst.desc, {
        fontSize: '13px',
        color: '#ccddcc'
      }).setOrigin(0, 0);
      this.tutorialContainer.add(descText);
    });

    // Entity legend
    const legendY = panelY + instructions.length * 32 + 10;
    const legends = [
      { color: 0x44dd44, label: '自分（大腸菌）' },
      { color: 0xddaa44, label: '競合菌（バクテロイデス）' },
      { color: 0xdd4444, label: '病原菌（C.ディフィシル）' },
      { color: 0x4488dd, label: '好中球（免疫）' },
      { color: 0x44dddd, label: 'マクロファージ（免疫）' },
    ];

    const legendTitle = this.add.text(width / 2, legendY, '-- 登場する生物 --', {
      fontSize: '12px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.tutorialContainer.add(legendTitle);

    legends.forEach((leg, i) => {
      const lx = width / 2 - 240 + (i % 3) * 200;
      const ly = legendY + 18 + Math.floor(i / 3) * 24;

      const swatch = this.add.rectangle(lx, ly + 7, 12, 12, leg.color);
      this.tutorialContainer.add(swatch);

      const label = this.add.text(lx + 12, ly, leg.label, {
        fontSize: '12px',
        color: '#cccccc'
      });
      this.tutorialContainer.add(label);
    });

    // Game over conditions
    const goY = legendY + 72;
    const goTitle = this.add.text(width / 2, goY, '-- ゲームオーバー条件 --', {
      fontSize: '12px',
      color: '#ff8888'
    }).setOrigin(0.5);
    this.tutorialContainer.add(goTitle);

    const goLines = [
      'コロニーが0になる（全滅）',
      '宿主安定度が下がりすぎる（炎症暴走）'
    ];
    goLines.forEach((line, i) => {
      const t = this.add.text(width / 2, goY + 18 + i * 20, line, {
        fontSize: '12px',
        color: '#ffaaaa'
      }).setOrigin(0.5);
      this.tutorialContainer.add(t);
    });

    // Start button
    const startBtn = this.add.text(width / 2, height - 35, '[ クリック or キー押下 でスタート ]', {
      fontSize: '22px',
      color: '#44dd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tutorialContainer.add(startBtn);

    this.tweens.add({
      targets: startBtn,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    const gs = this.scene.get('GameScene');
    gs.scene.pause();

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
