import { PlayerState } from '../models/PlayerState';
import { GameMap } from '../models/GameMap';

const ZONE_DISPLAY_NAMES: Record<string, string> = {
  small_intestine: '小腸',
  ileum: '回腸',
  cecum: '盲腸',
  colon_ascending: '上行結腸',
  colon_transverse: '横行結腸',
  colon_descending: '下行結腸',
  rectum: '直腸'
};

export class HUD {
  scene: Phaser.Scene;

  statsText!: Phaser.GameObjects.Text;
  stabilityBar!: Phaser.GameObjects.Graphics;
  stabilityLabel!: Phaser.GameObjects.Text;
  zoneLabel!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  tileInfoText!: Phaser.GameObjects.Text;
  notificationText!: Phaser.GameObjects.Text;
  peristalsisWarning!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = scene.cameras.main.width;

    this.statsText = scene.add.text(10, 10, '', {
      fontSize: '13px',
      color: '#ccffcc',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 6 }
    }).setDepth(100).setScrollFactor(0);

    this.tileInfoText = scene.add.text(10, 120, '', {
      fontSize: '11px',
      color: '#aabbcc',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 4 }
    }).setDepth(100).setScrollFactor(0);

    this.stabilityBar = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.stabilityLabel = scene.add.text(width / 2, 10, '宿主安定度', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    this.zoneLabel = scene.add.text(width / 2, 50, '', {
      fontSize: '13px',
      color: '#aaddff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    this.timerText = scene.add.text(width - 10, 10, '', {
      fontSize: '13px',
      color: '#aaccff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 6 }
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    this.notificationText = scene.add.text(width / 2, 80, '', {
      fontSize: '20px',
      color: '#ffdd44',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);

    this.peristalsisWarning = scene.add.text(width / 2, 110, '', {
      fontSize: '16px',
      color: '#ff8844',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);
  }

  update(player: PlayerState, gameMap: GameMap, elapsed: number) {
    const statsLines = [
      `コロニー: ${Math.floor(player.colonySize)}`,
      `Lv.${player.level}  経験値: ${Math.floor(player.xp)}/${player.xpToNext}`,
      `毒素: ${player.gene.toxin.toFixed(2)}  接着: ${player.gene.adhesion.toFixed(2)}`,
      `膜: ${player.gene.biofilm.toFixed(2)}  制御: ${player.gene.regulator.toFixed(2)}`,
      `${player.virulent ? '[毒性化]' : ''}`
    ];
    this.statsText.setText(statsLines.join('\n'));

    const currentTile = gameMap.getTile(player.tileX, player.tileY);
    if (currentTile) {
      const tileLines = [
        `酸素: ${currentTile.oxygen.toFixed(2)}  pH: ${currentTile.pH.toFixed(1)}  栄養: ${currentTile.nutrient.toFixed(2)}`,
        `胆汁: ${currentTile.bile.toFixed(2)}  容量: ${Math.floor(currentTile.capacityK)}  炎症: ${currentTile.inflammation_local.toFixed(3)}`,
        `層: ${currentTile.layer === 'lumen' ? '管腔' : currentTile.layer === 'mucus' ? '粘膜' : '上皮'}`
      ];
      this.tileInfoText.setText(tileLines.join('\n'));

      const displayName = ZONE_DISPLAY_NAMES[currentTile.zoneName] || currentTile.zoneName;
      this.zoneLabel.setText(displayName);
    }

    const allTiles = gameMap.getAllTiles();
    const avgInflammation = allTiles.reduce((s, t) => s + t.inflammation_local, 0) / Math.max(1, allTiles.length);
    const stability = Math.exp(-avgInflammation / 5.0);
    this.drawStabilityBar(stability);

    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    this.timerText.setText(`時間: ${minutes}:${seconds.toString().padStart(2, '0')}`);

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
    this.stabilityBar.fillStyle(0x333333, 0.8);
    this.stabilityBar.fillRect(x, y, barWidth, barHeight);

    let color: number;
    if (stability > 0.7) color = 0x44cc44;
    else if (stability > 0.4) color = 0xcccc44;
    else if (stability > 0.2) color = 0xcc8844;
    else color = 0xcc2222;

    this.stabilityBar.fillStyle(color, 1);
    this.stabilityBar.fillRect(x, y, barWidth * stability, barHeight);
    this.stabilityBar.lineStyle(1, 0xffffff, 0.5);
    this.stabilityBar.strokeRect(x, y, barWidth, barHeight);

    this.stabilityLabel.setText(`宿主安定度: ${Math.floor(stability * 100)}%`);
  }

  showPeristalsisWarning(secondsLeft: number) {
    this.peristalsisWarning.setText(`蠕動まで ${Math.ceil(secondsLeft)}秒！`);
    this.peristalsisWarning.setAlpha(1);
  }

  showNotification(message: string) {
    this.notificationText.setText(message);
    this.notificationText.setAlpha(1);
  }
}
