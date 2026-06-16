/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: instrument collection model
 *
 * プレイヤーが永続的に解放した器具と、開始ロードアウトに選ぶお気に入りを管理する。
 * 副作用のない純粋関数のみ。シリアライズ/パースは JSON を使い、不正値は安全に弾く。
 * ========================================================================== */

import { TypeId, TYPES } from './engine';

/* ---------------------------------------------------------------- 定数 */

/** お気に入りに登録できる器具の最大数 */
export const MAX_FAVORITES = 3;

/** 有効な TypeId の集合（バリデーション用） */
const VALID_TYPE_IDS: ReadonlySet<TypeId> = new Set(Object.keys(TYPES) as TypeId[]);

/** TypeId かどうかを型ガードで判定する */
function isTypeId(v: unknown): v is TypeId {
  return typeof v === 'string' && VALID_TYPE_IDS.has(v as TypeId);
}

/* ---------------------------------------------------------------- コレクション型 */

export interface Collection {
  /** 永続的に解放済みの器具 ID リスト（重複なし） */
  unlocked: TypeId[];
  /** 開始ロードアウトに選んだ器具 ID リスト（MAX_FAVORITES 以下） */
  favorites: TypeId[];
}

/* ---------------------------------------------------------------- 初期値 */

/** ゲーム開始時から使用可能な器具 */
export const STARTER_UNLOCKS: TypeId[] = ['needle', 'hourglass', 'compass'];

/** デフォルトのコレクション状態 */
export const DEFAULT_COLLECTION: Collection = {
  unlocked: STARTER_UNLOCKS,
  favorites: [],
};

/* ---------------------------------------------------------------- シリアライズ */

/** Collection を JSON 文字列にシリアライズする */
export function serializeCollection(c: Collection): string {
  return JSON.stringify({ unlocked: c.unlocked, favorites: c.favorites });
}

/**
 * JSON 文字列から Collection を復元する。
 * - null または不正な文字列の場合は DEFAULT_COLLECTION を返す
 * - 未知の TypeId はフィルタアウトする
 * - favorites は unlocked のサブセットかつ MAX_FAVORITES 以下に制限する
 * - 例外は一切投げない
 */
export function parseCollection(raw: string | null): Collection {
  if (raw === null) return DEFAULT_COLLECTION;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_COLLECTION;
    }

    const obj = parsed as Record<string, unknown>;

    // unlocked を検証・フィルタ
    const rawUnlocked = obj['unlocked'];
    if (!Array.isArray(rawUnlocked)) return DEFAULT_COLLECTION;
    const unlocked: TypeId[] = rawUnlocked.filter(isTypeId);

    // favorites を検証・フィルタ（unlocked のサブセット、MAX_FAVORITES 以下）
    const rawFavorites = obj['favorites'];
    if (!Array.isArray(rawFavorites)) return DEFAULT_COLLECTION;
    const unlockedSet = new Set(unlocked);
    const favorites: TypeId[] = rawFavorites
      .filter(isTypeId)
      .filter((id) => unlockedSet.has(id))
      .slice(0, MAX_FAVORITES);

    return { unlocked, favorites };
  } catch {
    return DEFAULT_COLLECTION;
  }
}

/* ---------------------------------------------------------------- クエリ */

/** 指定した器具が解放済みかどうかを返す */
export function isUnlocked(c: Collection, t: TypeId): boolean {
  return c.unlocked.includes(t);
}

/** まだ解放されていない器具の TypeId 一覧を返す */
export function lockedTypes(c: Collection): TypeId[] {
  const unlockedSet = new Set(c.unlocked);
  return (Object.keys(TYPES) as TypeId[]).filter((id) => !unlockedSet.has(id));
}

/* ---------------------------------------------------------------- 更新（イミュータブル） */

/**
 * 器具を解放する（既に解放済みなら変更なし）。
 * 元のコレクションは変更しない。
 */
export function unlock(c: Collection, t: TypeId): Collection {
  if (c.unlocked.includes(t)) return c;
  return { ...c, unlocked: [...c.unlocked, t] };
}

/**
 * お気に入りの登録・解除を切り替える。
 * - 未解放の器具は無視する
 * - 追加時に MAX_FAVORITES に達していれば無視する
 * - 元のコレクションは変更しない
 */
export function toggleFavorite(c: Collection, t: TypeId): Collection {
  if (!c.unlocked.includes(t)) return c;

  if (c.favorites.includes(t)) {
    // お気に入りから削除
    return { ...c, favorites: c.favorites.filter((id) => id !== t) };
  }

  // お気に入りに追加（上限チェック）
  if (c.favorites.length >= MAX_FAVORITES) return c;
  return { ...c, favorites: [...c.favorites, t] };
}
