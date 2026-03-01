import { PlayerState } from '../models/PlayerState';
import { SkillSystem, SkillChoice, SkillPath } from '../systems/SkillSystem';

const PATH_LABELS: Record<SkillPath, string> = {
  virulence: '毒性',
  symbiosis: '共生',
  colonization: '定着'
};

const PATH_BG: Record<SkillPath, number> = {
  virulence: 0x442222,
  symbiosis: 0x222244,
  colonization: 0x443322
};

const PATH_BORDER: Record<SkillPath, number> = {
  virulence: 0xff4444,
  symbiosis: 0x4488ff,
  colonization: 0xddaa22
};

export class LevelUpUI {
  scene: Phaser.Scene;
  gameScene: Phaser.Scene;
  container!: Phaser.GameObjects.Container;
  isShowing: boolean = false;

  constructor(scene: Phaser.Scene, gameScene: Phaser.Scene) {
    this.scene = scene;
    this.gameScene = gameScene;
  }

  show(player: PlayerState) {
    if (this.isShowing) return;
    this.isShowing = true;

    this.gameScene.scene.pause();

    const gs = this.gameScene as any;
    const skillSystem: SkillSystem = gs.skillSystem;
    skillSystem.performLevelUp(player);

    const choices = skillSystem.getRandomChoices(3);
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0).setDepth(200);

    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    this.container.add(overlay);

    // Level up flash
    const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xffdd44, 0.15);
    this.container.add(flash);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.Out'
    });

    const title = this.scene.add.text(width / 2, 80, `レベルアップ！ Lv.${player.level}`, {
      fontSize: '40px',
      color: '#ffdd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(width / 2, 130, '遺伝子変異を選択:', {
      fontSize: '18px',
      color: '#cccccc'
    }).setOrigin(0.5);
    this.container.add(subtitle);

    const cardWidth = 240;
    const cardHeight = 260;
    const spacing = 30;
    const totalWidth = cardWidth * 3 + spacing * 2;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    choices.forEach((choice, i) => {
      const cx = startX + i * (cardWidth + spacing);
      const cy = height / 2 + 30;

      // Card background
      const bg = this.scene.add.rectangle(cx, cy, cardWidth, cardHeight, PATH_BG[choice.path], 1)
        .setStrokeStyle(3, PATH_BORDER[choice.path])
        .setInteractive({ useHandCursor: true });
      this.container.add(bg);

      // Path label
      const pathLabel = this.scene.add.text(cx, cy - 100, PATH_LABELS[choice.path], {
        fontSize: '12px',
        color: '#' + PATH_BORDER[choice.path].toString(16).padStart(6, '0'),
        fontStyle: 'bold',
        backgroundColor: '#00000088',
        padding: { x: 8, y: 3 }
      }).setOrigin(0.5);
      this.container.add(pathLabel);

      // Skill name
      const nameText = this.scene.add.text(cx, cy - 55, choice.name, {
        fontSize: '20px',
        color: '#' + choice.color.toString(16).padStart(6, '0'),
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(nameText);

      // Stack count
      const currentCount = player.skillCounts.get(choice.id) || 0;
      if (currentCount > 0) {
        const stackText = this.scene.add.text(cx, cy - 25, `現在: x${currentCount} → x${currentCount + 1}`, {
          fontSize: '13px',
          color: '#aaffaa'
        }).setOrigin(0.5);
        this.container.add(stackText);
      }

      // Description
      const descText = this.scene.add.text(cx, cy + 15, choice.description, {
        fontSize: '14px',
        color: '#ccccdd',
        wordWrap: { width: cardWidth - 30 },
        align: 'center'
      }).setOrigin(0.5);
      this.container.add(descText);

      // Key hint
      const keyHint = this.scene.add.text(cx, cy + 90, `[${i + 1}]`, {
        fontSize: '24px',
        color: '#888888',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(keyHint);

      // Hover effects
      bg.on('pointerover', () => {
        bg.setFillStyle(PATH_BORDER[choice.path], 0.3);
        bg.setScale(1.05);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(PATH_BG[choice.path], 1);
        bg.setScale(1);
      });
      bg.on('pointerdown', () => {
        this.selectChoice(player, choice, skillSystem);
      });

      // Keyboard selection
      this.scene.input.keyboard!.once(`keydown-${i + 1}`, () => {
        if (this.isShowing) {
          this.selectChoice(player, choice, skillSystem);
        }
      });
    });
  }

  private selectChoice(player: PlayerState, choice: SkillChoice, skillSystem: SkillSystem) {
    skillSystem.applySkill(player, choice.id);
    this.hide();
  }

  private hide() {
    this.isShowing = false;
    if (this.container) {
      this.container.destroy();
    }
    this.gameScene.scene.resume();
  }
}
