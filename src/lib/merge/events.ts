/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: between-wave random events
 *
 * 波と波の間に発生するランダムイベント（ログライク式の選択肢）の定義と抽選ロジック。
 * 副作用のない純粋関数のみ。乱数は rng を差し替え可能にしてテスト可能性を担保する。
 * ユーザー向けテキストに ASCII の ' " < > を使わない（JSX の lint 安全のため）。
 * ========================================================================== */

/* ---------------------------------------------------------------- エフェクト型 */

/** イベント選択肢の効果。gold は負値でコストを表す。 */
export interface EventEffect {
  gold?: number;
  healFrac?: number;
  atkMul?: number;
  maxHpBonus?: number;
}

/* ---------------------------------------------------------------- 選択肢型 */

/** プレイヤーに提示される一つの選択肢。 */
export interface EventOption {
  label: string;
  desc: string;
  effect: EventEffect;
}

/* ---------------------------------------------------------------- イベント型 */

/** 波間に出現するランダムイベント。 */
export interface GameEvent {
  id: string;
  icon: string;
  title: string;
  body: string;
  options: EventOption[];
}

/* ---------------------------------------------------------------- イベント定義 */

/**
 * ゲーム内のすべてのランダムイベント一覧。
 * 各イベントは二択のトレードオフを持つ。
 */
export const EVENTS: GameEvent[] = [
  {
    id: 'shrine',
    icon: '⛩',
    title: '観測の祠',
    body: '星霜に浸食された小祠が現れた。金を捧げれば器具の力が増すという。',
    options: [
      {
        label: '黄金を捧げる',
        desc: '10G を失う代わりに、全器具の攻撃力が永続的に上昇する。',
        effect: { gold: -10, atkMul: 1.2 },
      },
      {
        label: '立ち去る',
        desc: '何もせずに先へ進む。',
        effect: {},
      },
    ],
  },
  {
    id: 'derelict',
    icon: '🏚',
    title: '廃棄された観測所',
    body: '崩れかけた観測小屋の残骸。中に財宝が残されているが、瘴気が漂っている。',
    options: [
      {
        label: '中に踏み込む',
        desc: '15G を得るが、HPの20%を失う。',
        effect: { gold: 15, healFrac: -0.2 },
      },
      {
        label: '近づかない',
        desc: '何もせずに先へ進む。',
        effect: {},
      },
    ],
  },
  {
    id: 'star_spring',
    icon: '💧',
    title: '星泉',
    body: '天の水が湧き出る聖なる泉。飲めば傷が癒えるが、泉に金貨を投げ込むと御加護も得られるという。',
    options: [
      {
        label: '泉の水を飲む',
        desc: 'HPの50%を回復する。',
        effect: { healFrac: 0.5 },
      },
      {
        label: '金貨を投じて祈る',
        desc: '5G を失うが、最大HP上限が15増加し、HPの50%も回復する。',
        effect: { gold: -5, healFrac: 0.5, maxHpBonus: 15 },
      },
    ],
  },
  {
    id: 'gamble',
    icon: '🎲',
    title: '運命の賭け',
    body: '仮面の旅人が奇妙な賭けを持ちかけてきた。運を試してみるか。',
    options: [
      {
        label: '賭けに乗る',
        desc: '20G を失う。しかし運が良ければ50G を取り戻せる（内部的には rng で決定）。',
        effect: { gold: -20 },
      },
      {
        label: '断る',
        desc: '何もせずに先へ進む。',
        effect: {},
      },
    ],
  },
  {
    id: 'celestial_cache',
    icon: '📦',
    title: '天体の宝箱',
    body: '星印の刻まれた鉄箱が道端に置かれている。開けると何かが飛び出すかもしれない。',
    options: [
      {
        label: '慎重に開ける',
        desc: '8G と最大HP上限＋5 を得る。',
        effect: { gold: 8, maxHpBonus: 5 },
      },
      {
        label: '力任せに叩く',
        desc: '25G を得るが、HPの30%を失う。',
        effect: { gold: 25, healFrac: -0.3 },
      },
    ],
  },
];

/* ---------------------------------------------------------------- 抽選 */

/**
 * 指定されたウェーブ番号に対してランダムイベントを返す。
 *
 * - 3の倍数ウェーブ（ボスウェーブ = 5の倍数を除く）でイベントが発生する。
 * - rng を固定すれば同一波番号で同じイベントが返る（決定的）。
 * - 対象外の波では null を返す。
 */
export function eventForWave(wave: number, rng: () => number = Math.random): GameEvent | null {
  // ボスウェーブ（5の倍数）はスキップ
  if (wave % 5 === 0) return null;
  // 3の倍数ウェーブのみイベント発生
  if (wave % 3 !== 0) return null;

  const index = Math.floor(rng() * EVENTS.length);
  return EVENTS[index] ?? null;
}
