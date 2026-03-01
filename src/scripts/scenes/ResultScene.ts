export default class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: { reason: string; elapsedTime: number; colonySize: number; level: number }) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0a0a);

    this.add.text(width / 2, 100, 'ゲームオーバー', {
      fontSize: '52px',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const reasons: Record<string, string> = {
      'host_destabilized': '宿主が不安定化！炎症で崩壊しました',
      'colony_extinct': 'コロニーが全滅しました！'
    };
    const reasonText = reasons[data.reason] || data.reason || '不明な原因';

    this.add.text(width / 2, 180, reasonText, {
      fontSize: '22px',
      color: '#ffaaaa'
    }).setOrigin(0.5);

    const minutes = Math.floor((data.elapsedTime || 0) / 60);
    const seconds = Math.floor((data.elapsedTime || 0) % 60);

    const statsLines = [
      `生存時間: ${minutes}分${seconds}秒`,
      `最終コロニーサイズ: ${Math.floor(data.colonySize || 0)}`,
      `到達レベル: ${data.level || 1}`
    ];

    statsLines.forEach((line, i) => {
      this.add.text(width / 2, 260 + i * 40, line, {
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5);
    });

    const retryBtn = this.add.text(width / 2, height - 120, '[ リトライ ]', {
      fontSize: '32px',
      color: '#44cc44',
      backgroundColor: '#222222',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => this.restart());
    retryBtn.on('pointerover', () => retryBtn.setColor('#88ff88'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#44cc44'));

    this.input.keyboard!.on('keydown-SPACE', () => this.restart());
    this.input.keyboard!.on('keydown-ENTER', () => this.restart());

    this.add.text(width / 2, height - 60, 'Space / Enter / クリック でリトライ', {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);
  }

  private restart() {
    this.scene.start('BootScene');
  }
}
