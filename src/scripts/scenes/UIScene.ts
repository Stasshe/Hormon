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
      this.skillBar.update(playerState);
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

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    this.tutorialContainer.add(bg);

    const title = this.add.text(width / 2, 25, 'Hormon!', {
      fontSize: '42px',
      color: '#44dd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tutorialContainer.add(title);

    const subtitle = this.add.text(width / 2, 65, '腸内で生き延びる大腸菌ローグライク', {
      fontSize: '16px',
      color: '#88ff88'
    }).setOrigin(0.5);
    this.tutorialContainer.add(subtitle);

    const instructions = [
      { icon: 'WASD/矢印', desc: '腸内を移動する' },
      { icon: '自動攻撃', desc: '近くの敵菌をバクテリオシンで自動攻撃（レベルで強化）' },
      { icon: 'SPACE', desc: '毒素暴走 — 大ダメージだが炎症急上昇！ジレンマ。' },
      { icon: 'レベルアップ', desc: '毒性/共生/定着の3つのパスから選択してビルド' },
      { icon: '蠕動', desc: '定期的に腸が動く。接着力が低いと流される' },
      { icon: '免疫', desc: '炎症が上がると免疫細胞出現。暴走しすぎると掃討イベント' },
    ];

    const panelY = 100;
    instructions.forEach((inst, i) => {
      const yy = panelY + i * 34;
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

    // Build paths explanation
    const pathY = panelY + instructions.length * 34 + 10;
    const pathTitle = this.add.text(width / 2, pathY, '-- 3つのビルドパス --', {
      fontSize: '13px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.tutorialContainer.add(pathTitle);

    const paths = [
      { name: '毒性', color: '#ff4444', desc: '攻撃力・範囲・暴走強化' },
      { name: '共生', color: '#4488ff', desc: '回復・炎症抑制・XP効率' },
      { name: '定着', color: '#ddaa22', desc: '接着・バイオフィルム・速度' },
    ];

    paths.forEach((p, i) => {
      const px = width / 2 - 200 + i * 200;
      const py = pathY + 22;
      const pt = this.add.text(px, py, `${p.name}: ${p.desc}`, {
        fontSize: '11px',
        color: p.color
      }).setOrigin(0.5);
      this.tutorialContainer.add(pt);
    });

    // Entity legend
    const legendY = pathY + 50;
    const legends = [
      { color: 0x44dd44, label: '自分（大腸菌）' },
      { color: 0xddaa44, label: '競合菌' },
      { color: 0xdd4444, label: '病原菌' },
      { color: 0x4488dd, label: '好中球' },
      { color: 0x44dddd, label: 'マクロファージ' },
    ];

    legends.forEach((leg, i) => {
      const lx = width / 2 - 240 + (i % 3) * 200;
      const ly = legendY + Math.floor(i / 3) * 24;
      const swatch = this.add.rectangle(lx, ly + 7, 12, 12, leg.color);
      this.tutorialContainer.add(swatch);
      const label = this.add.text(lx + 12, ly, leg.label, {
        fontSize: '12px',
        color: '#cccccc'
      });
      this.tutorialContainer.add(label);
    });

    // Game over
    const goY = legendY + 55;
    const goLines = this.add.text(width / 2, goY, 'ゲームオーバー: コロニー全滅 or 宿主安定度崩壊', {
      fontSize: '12px',
      color: '#ff8888'
    }).setOrigin(0.5);
    this.tutorialContainer.add(goLines);

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
