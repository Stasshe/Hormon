import { setConfig } from '../config/gameConfig';
import gameConfigData from '../../assets/config/gameConfig.json';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barWidth = 320;
    const barHeight = 20;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - barWidth / 2, height / 2 - barHeight / 2, barWidth, barHeight);

    const progressBar = this.add.graphics();
    const loadingText = this.add.text(width / 2, height / 2 - 30, '読み込み中...', {
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
    setConfig(gameConfigData as any);

    // Stop any leftover scenes before starting fresh
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.stop('PauseScene');
    this.scene.stop('ResultScene');

    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }
}
