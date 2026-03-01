import { PlayerState } from '../models/PlayerState';
import { SkillSystem, SkillChoice } from '../systems/SkillSystem';

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

    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.container.add(overlay);

    const title = this.scene.add.text(width / 2, 120, `レベルアップ！（Lv.${player.level}）`, {
      fontSize: '36px',
      color: '#ffdd44',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(width / 2, 165, '遺伝子変異を選択してください:', {
      fontSize: '18px',
      color: '#cccccc'
    }).setOrigin(0.5);
    this.container.add(subtitle);

    choices.forEach((choice, i) => {
      const cx = width / 2 - 200 + i * 200;
      const cy = height / 2 + 20;

      const bg = this.scene.add.rectangle(cx, cy, 170, 160, 0x334466, 1)
        .setStrokeStyle(2, 0x6688aa)
        .setInteractive({ useHandCursor: true });
      this.container.add(bg);

      const nameText = this.scene.add.text(cx, cy - 40, choice.name, {
        fontSize: '14px',
        color: '#88ddff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(nameText);

      const descText = this.scene.add.text(cx, cy + 10, choice.description, {
        fontSize: '11px',
        color: '#aaaacc',
        wordWrap: { width: 150 },
        align: 'center'
      }).setOrigin(0.5);
      this.container.add(descText);

      bg.on('pointerdown', () => {
        this.selectChoice(player, choice, skillSystem);
      });
      bg.on('pointerover', () => bg.setFillStyle(0x446688));
      bg.on('pointerout', () => bg.setFillStyle(0x334466));
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
