import { setConfig } from '../config/gameConfig';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.json('gameConfig', 'assets/config/gameConfig.json');

    // Progress bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barWidth = 320;
    const barHeight = 20;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - barWidth / 2, height / 2 - barHeight / 2, barWidth, barHeight);

    const progressBar = this.add.graphics();
    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x44cc44, 1);
      progressBar.fillRect(width / 2 - barWidth / 2 + 4, height / 2 - barHeight / 2 + 4, (barWidth - 8) * value, barHeight - 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create() {
    const config = this.cache.json.get('gameConfig');
    setConfig(config);

    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }
}
