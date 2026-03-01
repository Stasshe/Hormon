export type EnemyType = 'competitor' | 'pathogen' | 'neutrophil' | 'macrophage';

export interface Enemy {
  id: string;
  type: EnemyType;
  pos: { tileX: number; tileY: number };
  hp: number;
  colonySize: number;  // for bacteria types
  speed: number;
  behaviorState: {
    target?: { x: number; y: number };
    moveCooldown: number;
    toxinOutput: number;
  };
}

let enemyIdCounter = 0;

export function createEnemy(type: EnemyType, tileX: number, tileY: number): Enemy {
  enemyIdCounter++;
  const id = `enemy_${enemyIdCounter}`;

  const defaults: Record<EnemyType, Partial<Enemy>> = {
    competitor: { hp: 100, colonySize: 50, speed: 30 },
    pathogen: { hp: 150, colonySize: 30, speed: 20 },
    neutrophil: { hp: 60, colonySize: 0, speed: 80 },
    macrophage: { hp: 120, colonySize: 0, speed: 40 }
  };

  const d = defaults[type];

  return {
    id,
    type,
    pos: { tileX, tileY },
    hp: d.hp || 100,
    colonySize: d.colonySize || 0,
    speed: d.speed || 40,
    behaviorState: {
      moveCooldown: 0,
      toxinOutput: type === 'pathogen' ? 0.5 : 0
    }
  };
}
