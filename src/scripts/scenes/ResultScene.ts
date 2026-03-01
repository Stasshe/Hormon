export default class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: { reason: string; elapsedTime: number; colonySize: number; level: number }) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0a0a);

    this.add.text(width / 2, 100, 'GAME OVER', {
      fontSize: '56px',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 180, data.reason || 'Unknown cause', {
      fontSize: '24px',
      color: '#ffaaaa'
    }).setOrigin(0.5);

    const minutes = Math.floor((data.elapsedTime || 0) / 60);
    const seconds = Math.floor((data.elapsedTime || 0) % 60);

    const statsLines = [
      `Survival Time: ${minutes}m ${seconds}s`,
      `Final Colony Size: ${Math.floor(data.colonySize || 0)}`,
      `Level Reached: ${data.level || 1}`
    ];

    statsLines.forEach((line, i) => {
      this.add.text(width / 2, 260 + i * 40, line, {
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5);
    });

    // Retry button
    const retryBtn = this.add.text(width / 2, height - 120, '[ Retry ]', {
      fontSize: '32px',
      color: '#44cc44',
      backgroundColor: '#222222',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      this.scene.start('BootScene');
    });

    retryBtn.on('pointerover', () => retryBtn.setColor('#88ff88'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#44cc44'));
  }
}
