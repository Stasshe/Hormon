Hormon!
というローグライクゲームです。

了解。では Phaser（Web）向けにそのままエージェントへ渡せる「実装可能な完全仕様書」を、体系的かつ洗練された日本語でまとめます。必要な数式は英語表記にし、設計は実装工数を最小化しつつ医学的構造を維持するよう具体的なパラメータと擬似コードまで含めます。無駄な比喩は省き、直接的に記述します。

概要（Purpose）

ターン要素のないリアルタイム・ローグライク（ヴァンサバ系）をPhaserで実装する。
プレイヤーは常在株の大腸菌（主人公）を操作し、増殖・遺伝子表現・定着・毒性制御などを通じて「宿主を壊さずに長期共生」を目指す。見た目はポップ、内部ロジックは実データに寄せる。

Key biological entities (一度だけ明示)
	•	Escherichia coli (player)
	•	Bacteroides fragilis (competitor example)
	•	Clostridioides difficile (pathogen example)
	•	好中球 (immune fast attacker)
	•	マクロファージ (immune area control)

以降は上記の固有名詞を繰り返さずに「主人公」「競合菌」「病原菌」「好中球」「マクロファージ」と書きます。

アーキテクチャ（Phaser 実装概要）
	•	Phaser バージョン: Phaser 3.x（推奨）
	•	Scenes:
	1.	BootScene — アセット読み込み
	2.	UIScene — HUD / メニュー（独立して重ねる）
	3.	GameScene — メイン（map, entities, update loop）
	4.	PauseScene / ResultScene
	•	Physics: Arcade Physics（軽量、当たり判定と簡易移動に十分）
	•	Map: タイルベース（断面2D）。Tilemapまたは同等のグリッド実装。
	•	Entity Component System（簡易）：各生物エンティティに data + behavior functions を持たせる（状態・増殖・移動・AI）。
	•	Save: localStorage に JSON スナップショット。

画面構成 / UI
	•	ビューは固定カメラ（ある程度ズーム可）。マップは横方向（腸の流れ）に長い。
	•	HUD（UIScene）:
	•	Top-left: Player status（colony_size, gene regulator value, adhesion, biofilm）
	•	Top-center: Host Stability Bar（宿主安定度） → 緑→赤、炎症が上がると減少
	•	Top-right: Global timers / events（次の蠕動まで、抗生物質ランダムなど）
	•	Bottom-left: Skill buttons（regulator, adhesion boost, biofilm burst, metabolite burst）
	•	Bottom-right: Minimap（小さな断面表示）
	•	Tooltips: 各パラメータに短い説明を必ず表示。

マップ設計（データモデル）

マップはグリッド（tileWidth × tileHeight）。各タイルは次を持つ:

Tile {
  x:int, y:int,
  oxygen: float (0..1),
  pH: float (e.g. 5.5..8.0),
  nutrient: float (0..1),
  bile: float (0..1),
  inflammation_local: float (>=0),
  capacity_K: float (>0),
  layer: enum {lumen, mucus, epithelial}
}

フロアの流れ（left → right）:
	•	Zones: small_intestine, ileum, cecum, colon_ascending, colon_transverse, colon_descending, rectum
各Zoneは tile-level の environmental gradients を持つ。ゲーム開始時に zone に合わせ tile を初期化。

プレイヤー表現（内部モデル）

プレイヤーは「1 個のセル的な操作ユニット」＋「現在タイルのcolony_size」パラメータを持つ。

PlayerState:

Player {
  pos: {tileX, tileY},
  colony_size: float (N),
  gene_expression: {
    toxin: float (0..1),
    adhesion: float (0..1),
    biofilm: float (0..1),
    stress_response: float (0..1),
    regulator: float (0..1)   // skill-controlled
  },
  virulent: bool, // plasmid取得で true
  energy_reserve: float,
  skills: {list of unlocked skill ids}
}

コア数理モデル（実装用式：英語表記）

すべての式は continuous の近似で、各ゲームフレームで dt を使って数値更新する（dt in seconds）。

	1.	Logistic growth per tile

r_eff = r_base * f_oxygen * f_nutrient * f_pH - energy_cost
dN/dt = r_eff * N * (1 - N / K)

	•	r_base: base growth rate (e.g., 0.02 per second)
	•	f_oxygen = clamp(1 - oxygen * oxygen_sensitivity, 0, 1) （E. coli は通性嫌気なので moderate sensitivity）
	•	f_nutrient = nutrient (0..1)
	•	f_pH = gaussian(pH, optimal_pH=7.0, sigma=0.6) normalized 0..1
	•	energy_cost = c_toxin * toxin + c_biofilm * biofilm (linear cost of expression)

	2.	Quorum sensing (local)

quorum_signal = log(1 + N_local) // local: tile or radius

	•	N_local: colony_size in tile or neighborhood sum
	•	quorum_threshold (configurable) when surpassed increases propensity to express toxin.

	3.	Toxin expression function

toxin_expression = sigmoid( w_q * quorum_signal + w_infl * inflammation_local - w_reg * regulator )

	•	sigmoid(x) = 1 / (1 + exp(-x))
	•	weights tuned (w_q > 0, w_infl > 0, w_reg > 0)

	4.	Inflammation dynamics (global + local)
Local inflammation per tile:

dInflammation_local/dt = alpha_toxin * toxin_expression * N_local - gamma_benefit * beneficial_metabolites_local - delta_infl * inflammation_local

Global inflammation is average or max of local inflammation; host stability depends on a smooth aggregation:

host_inflammation = weighted_mean(inflammation_local over map)
host_stability = exp( - host_inflammation / stability_scale )

If host_stability drops below defeat_threshold → game over.
	5.	Immune spawn probability

immune_spawn_prob_per_second = base_spawn + k_infl * host_inflammation

When spawn occurs, choose type by inflammation level:
	•	low: neutrophil only (fast)
	•	med: neutrophil + macrophage
	•	high: include larger adaptive-like events (special boss).

	6.	Peristalsis (蠕動)

	•	Occurs every T_peristalsis seconds (configurable).
	•	On event: shift fluid flow to right by flow_strength tiles (fractional movement simulated).
	•	For each colony: if adhesion < adhesion_threshold, a fraction flow_fraction of N is moved right (tile → tile+dx). If tile boundary off-map, those cells are lost (reduce N).
	•	Adhesion has metabolic cost.

	7.	Plasmid (virulence) event

	•	Random chance per time; probability increases with exposure to mobile genetic element events (e.g., antibiotics event increases chance).
	•	On plasmid acquisition:
	•	virulent = true
	•	toxin_max increased
	•	short-term growth_bonus may be applied
	•	long-term immune_detection multiplier increases

	8.	Antibiotics event

	•	Large global negative multiplier on N for susceptible species; selection pressure increases probability of plasmid acquisition and niche replacement.

AI / Enemy behaviors
	•	競合菌 (generic competitor):
	•	movement: random-walk biased to nutrient-rich tiles
	•	reproduction: same logistic model but with different r_base and K
	•	interactions: bacteriocin may reduce neighbor N
	•	病原菌 (C. difficile-like):
	•	slower growth, high toxin when triggered, raises inflammation strongly
	•	好中球:
	•	spawn at random tile with high inflammation, move directly to nearest high-inflammation tile, collide with player colony → reduce N by attack_rate
	•	マクロファージ:
	•	slower, area-of-effect suppression, can reduce biofilm locally

Skills / Progression
	•	Passive leveling: experience points from survival time and nutrient acquisition.
	•	On level-up, present 3-choice skill picks:
	•	regulator_up (increase regulator → reduces toxin expression)
	•	adhesion_up (increase adhesion)
	•	biofilm_up
	•	metabolic_efficiency_up (reduce energy_cost)
	•	quorum_suppression (reduce quorum weight)
	•	Active skills (cooldowns):
	•	biofilm_burst: temporarily increase local K and reduce flow loss
	•	metabolite_shot: produce beneficial metabolite locally to reduce inflammation
	•	toxin_release: targeted toxin (if virulent) — immediate but large inflammation penalty

Balancing: default numeric suggestions (starting point; tune in playtest)
	•	tile K: 1000 (mucus higher e.g., 5000)
	•	r_base (player): 0.02 /s
	•	c_toxin: 0.005
	•	quorum_threshold: log(1 + 200) ≈ 5.3 (use numeric)
	•	alpha_toxin: 0.0005
	•	gamma_benefit: 0.0008
	•	peristalsis interval T_peristalsis: 20s
	•	flow_strength: 1 tile equivalent; flow_fraction per event: 0.3 for adhesion=0
	•	antibiotic_event chance: 0.01 per minute

（注）実数はプレイテストで洗練。ここは開始パラメータ。

Data structures / network model for agent

Suggested TypeScript interfaces for Phaser code:
```typescript
interface Tile {
  x: number; y: number;
  oxygen: number; pH: number; nutrient: number; bile: number;
  inflammation_local: number; capacityK: number; layer: string;
}

interface PlayerState {
  tileX: number; tileY: number;
  colonySize: number;
  gene: { toxin:number; adhesion:number; biofilm:number; regulator:number; stress:number; };
  virulent: boolean;
  energy: number;
  skills: Set<string>;
}

interface Enemy {
  id: string;
  type: 'competitor'|'pathogen'|'neutrophil'|'macrophage';
  pos: {tileX:number, tileY:number};
  hp:number;
  behaviorState: any;
}
```

Phaser-specific implementation notes
	•	Use tilemap layer for collisions only for obstacles; biological entities ignore collision with walls (unless you design mucus as semi-blocking).
	•	Rendering: use particle emitters for toxin particles / metabolites for visual feedback (no physics).
	•	Use groups: playerGroup, bacteriaGroup, immuneGroup.
	•	Update loop: in update(time, dt), run:
	1.	process input & player movement
	2.	update local growth for tile under player and neighboring tiles every growthTick (e.g., 0.5s)
	3.	compute quorum, gene expression, toxin emission visuals
	4.	check peristalsis timers
	5.	spawn immune units based on inflammation
	6.	resolve collisions (immune vs colony) and apply damage
	•	Keep heavy numeric updates on slower ticks (not every frame) to reduce CPU: e.g., growth tick = 500ms, inflammation update tick = 250ms.

Events / Timeline / Randomness
	•	Seeded RNG for reproducibility.
	•	Deterministic major events per seed: plasmid event timing, antibiotic event timing, big waves.
	•	Minor randomness for enemy spawn positions.

Audio / Art / UX
	•	Art: pop, rounded shapes, bright palette. Icons for skills with concise text.
	•	Animations: small pulse on colony growth, red glow for inflammation.
	•	Accessibility: color-blind-friendly palette.
	•	Sound: light chimes for level-up, harsher alarms for inflammation spikes.

Playtesting checklist (必ず行うテスト)
	1.	Stable population growth: monitor N over 5 minutes across tile types.
	2.	Verify quorum → toxin trigger at intended thresholds.
	3.	Peristalsis: check adhesion prevents expected loss.
	4.	Immune spawn curve: ensure not overwhelming at early stage.
	5.	Plasmid event: verify correct stat changes and UI warnings.
	6.	Skill balance: each level-up choice is meaningful.
	7.	Game over triggers: host_stability threshold reliable and communicated.

Metrics to log (for tuning)
	•	time, seed
	•	host_inflammation timeline
	•	player average colony_size
	•	number of immune spawns and types
	•	plasmid events happened (boolean), time
	•	skill choices

Save / Replay
	•	Save current PlayerState + map seed + time for short replay / resume.
	•	Allow playback of last N seconds for debugging.

Minimal prototyping steps for agent (milestones)
	1.	Skeleton Phaser project + tilemap and player movement (1 day)
	2.	Tile environmental model + display values (1 day)
	3.	Implement logistic growth per tile & simple colony_size display (1–2 days)
	4.	Quorum + toxin expression + visual particles (1–2 days)
	5.	Peristalsis event + adhesion mechanic (1 day)
	6.	Immune spawn & basic AI (2 days)
	7.	Skill/pick system + level up UI (1–2 days)
	8.	Plasmid & antibiotic events + balancing (2 days)
	9.	Polish visuals, audio, analytics (2–4 days)

（上は個人差あり。目安として提示）

Deliverables to hand to artist / sound designer
	•	PNG sprite sheet (64×64 per organism) + vector svg for scaling
	•	Particle presets: toxin (small purple particles), metabolite (small blue), inflammation aura (red halo)
	•	UI assets: buttons, bars, icons (regulator, adhesion, biofilm)
	•	SFX: level-up chime, alarm for high inflammation, peristalsis rumble

Debugging shortcuts for development
	•	Toggle god-mode: freeze inflammation, disable immune spawn
	•	Inspector overlay: show per-tile values (oxygen, nutrient, K, inflammation)
	•	Spawn commands for enemies and plasmid events

API / Config (single JSON)

Provide a gameConfig.json that contains all tunables:
```json
{
  "growth": {"r_base":0.02, "c_toxin":0.005, "c_biofilm":0.002},
  "peristalsis": {"interval":20, "flow_fraction":0.3, "adhesion_threshold":0.5},
  "inflammation": {"alpha_toxin":0.0005, "gamma_benefit":0.0008, "delta":0.01},
  "immune": {"base_spawn":0.001, "k_infl":0.05},
  "events": {"antibiotic_chance_per_min":0.01, "plasmid_base_chance":0.0001}
}
```
Load this at BootScene so designers can tweak without code changes.

文書化（Agentへ渡すポイント）
	•	すべての数値は gameConfig.json で変更可能にすること。
	•	主要なロジック（growth, quorum, toxin, inflammation, immune spawn, peristalsis）にはユニットテストを用意すること（deterministic seed）。
	•	UI は常に「原因と結果」を示す（プレイヤーが毒素を上げた → 即座に炎症バーの増加を可視化）。
	•	プレイヤー体験を最優先にし、ハードシミュレーションは「プレイ感」に悪影響を与えない範囲に抽象化すること。

⸻

必要なら、この仕様をベースに「最小実装（MVP）のコード骨格（Phaser TypeScript）」「gameConfigの初期値チューニング表」「ユニットテストケース」のいずれかをそのまま生成します。どれから出しましょうか。