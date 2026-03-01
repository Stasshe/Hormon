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

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const gameScene = this.scene.get('GameScene');

    this.hud = new HUD(this);
    this.minimap = new Minimap(this);
    this.skillBar = new SkillBar(this, gameScene);
    this.levelUpUI = new LevelUpUI(this, gameScene);

    gameScene.events.on('game-update', (playerState: PlayerState, gameMap: GameMap, elapsed: number) => {
      this.hud.update(playerState, gameMap, elapsed);
      this.minimap.update(gameMap, playerState);
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
  }
}
