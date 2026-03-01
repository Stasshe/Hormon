import { PlayerState } from '../models/PlayerState';
import { GameMap } from '../models/GameMap';

export class HUD {
  scene: Phaser.Scene;

  // Top-left: Player stats
  statsText!: Phaser.GameObjects.Text;
  // Top-center: Host Stability
  stabilityBar!: Phaser.GameObjects.Graphics;
  stabilityLabel!: Phaser.GameObjects.Text;
  // Top-right: Timers
  timerText!: Phaser.GameObjects.Text;
  // Notifications
  notificationText!: Phaser.GameObjects.Text;
  notificationTimer: number = 0;

  // Peristalsis warning
  peristalsisWarning!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = scene.cameras.main.width;

    // Top-left: player stats
    this.statsText = scene.add.text(10, 10, '', {
      fontSize: '13px',
      color: '#ccffcc',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 6 }
    }).setDepth(100).setScrollFactor(0);

    // Top-center: stability bar
    this.stabilityBar = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.stabilityLabel = scene.add.text(width / 2, 10, 'Host Stability', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    // Top-right: timers
    this.timerText = scene.add.text(width - 10, 10, '', {
      fontSize: '13px',
      color: '#aaccff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 6 }
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    // Notification (center)
    this.notificationText = scene.add.text(width / 2, 80, '', {
      fontSize: '20px',
      color: '#ffdd44',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);

    // Peristalsis warning
    this.peristalsisWarning = scene.add.text(width / 2, 120, '', {
      fontSize: '16px',
      color: '#ff8844',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);
  }

  update(player: PlayerState, gameMap: GameMap, elapsed: number) {
    // Stats
    const statsLines = [
      `Colony: ${Math.floor(player.colonySize)}`,
      `Level: ${player.level}  XP: ${Math.floor(player.xp)}/${player.xpToNext}`,
      `Toxin: ${player.gene.toxin.toFixed(2)}  Adhesion: ${player.gene.adhesion.toFixed(2)}`,
      `Biofilm: ${player.gene.biofilm.toFixed(2)}  Regulator: ${player.gene.regulator.toFixed(2)}`,
      `Energy: ${player.energy.toFixed(2)}  ${player.virulent ? '[VIRULENT]' : ''}`
    ];
    this.statsText.setText(statsLines.join('\n'));

    // Stability bar
    const allTiles = gameMap.getAllTiles();
    const avgInflammation = allTiles.reduce((s, t) => s + t.inflammation_local, 0) / Math.max(1, allTiles.length);
    const stability = Math.exp(-avgInflammation / 5.0);

    this.drawStabilityBar(stability);

    // Timer
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    this.timerText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Fade notifications
    if (this.notificationText.alpha > 0) {
      this.notificationText.alpha -= 0.005;
    }
    if (this.peristalsisWarning.alpha > 0) {
      this.peristalsisWarning.alpha -= 0.01;
    }
  }

  private drawStabilityBar(stability: number) {
    const width = this.scene.cameras.main.width;
    const barWidth = 200;
    const barHeight = 16;
    const x = width / 2 - barWidth / 2;
    const y = 28;

    this.stabilityBar.clear();

    // Background
    this.stabilityBar.fillStyle(0x333333, 0.8);
    this.stabilityBar.fillRect(x, y, barWidth, barHeight);

    // Fill color based on stability
    let color: number;
    if (stability > 0.7) color = 0x44cc44;
    else if (stability > 0.4) color = 0xcccc44;
    else if (stability > 0.2) color = 0xcc8844;
    else color = 0xcc2222;

    this.stabilityBar.fillStyle(color, 1);
    this.stabilityBar.fillRect(x, y, barWidth * stability, barHeight);

    // Border
    this.stabilityBar.lineStyle(1, 0xffffff, 0.5);
    this.stabilityBar.strokeRect(x, y, barWidth, barHeight);

    // Percentage
    this.stabilityLabel.setText(`Host Stability: ${Math.floor(stability * 100)}%`);
  }

  showPeristalsisWarning(secondsLeft: number) {
    this.peristalsisWarning.setText(`Peristalsis in ${Math.ceil(secondsLeft)}s!`);
    this.peristalsisWarning.setAlpha(1);
  }

  showNotification(message: string) {
    this.notificationText.setText(message);
    this.notificationText.setAlpha(1);
  }
}
