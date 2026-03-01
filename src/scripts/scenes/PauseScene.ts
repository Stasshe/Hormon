export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    this.add.text(width / 2, height / 2 - 60, 'ポーズ', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const resumeBtn = this.add.text(width / 2, height / 2 + 20, '[ 再開 ]', {
      fontSize: '28px',
      color: '#44cc44',
      backgroundColor: '#222222',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerdown', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    });
    resumeBtn.on('pointerover', () => resumeBtn.setColor('#88ff88'));
    resumeBtn.on('pointerout', () => resumeBtn.setColor('#44cc44'));

    const quitBtn = this.add.text(width / 2, height / 2 + 80, '[ やめる ]', {
      fontSize: '28px',
      color: '#cc4444',
      backgroundColor: '#222222',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    quitBtn.on('pointerdown', () => {
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('BootScene');
      this.scene.stop();
    });
    quitBtn.on('pointerover', () => quitBtn.setColor('#ff8888'));
    quitBtn.on('pointerout', () => quitBtn.setColor('#cc4444'));

    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }
}
