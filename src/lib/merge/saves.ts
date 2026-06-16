/* ============================================================================
 * GRID STELLA — セーブデータ管理: エクスポート / インポート / リセット
 *
 * localStorage のキー群を読み書きするコールバックを受け取り、副作用のない
 * 純粋ロジックとして セーブ blob の生成・検証・マイグレーションを行う。
 * window / localStorage には直接アクセスしない。呼び出し側が注入する。
 *
 * バージョン戦略:
 *   SAVE_VERSION が 1 の間は migrate は事実上の恒等変換だが、
 *   switch 文で将来の v2+ への変換パスを追加できる構造にしておく。
 *   未知キーは常にドロップし、新キーが追加された際は remove で消えるのを期待する。
 * ========================================================================== */

/** セーブ blob のスキーマバージョン（整数）。変更時は migrate を拡張する。 */
export const SAVE_VERSION = 1;

/** ゲームが使用する localStorage キーの安定した順序リスト（14 件）。 */
export const SAVE_KEYS: readonly string[] = [
  'gs-best-wave',
  'gs-runs',
  'gs-ach',
  'gs-settings',
  'gs-meta',
  'gs-collection',
  'gs-relics',
  'gs-stages',
  'gs-trials',
  'gs-idle',
  'gs-reserve',
  'gs-equip',
  'gs-regalia',
  'gs-gemsown',
] as const;

/** エクスポート / インポートで使う JSON ブロブの型。 */
export interface SaveBlob {
  version: number;
  data: Record<string, string>;
}

/* ------------------------------------------------------------------ エクスポート */

/**
 * read コールバックで各キーの値を取得し、null でない（存在する）ものだけを
 * data に詰めた SaveBlob を JSON 文字列として返す。
 */
export function exportSave(read: (key: string) => string | null): string {
  const data: Record<string, string> = {};
  for (const key of SAVE_KEYS) {
    const val = read(key);
    if (val !== null) {
      data[key] = val;
    }
  }
  const blob: SaveBlob = { version: SAVE_VERSION, data };
  return JSON.stringify(blob);
}

/* ------------------------------------------------------------------ パース */

/**
 * JSON 文字列を安全にパースし、SaveBlob として妥当ならそれを返す。
 * 以下のいずれかの場合は null を返し、例外を投げない:
 *   - JSON パース失敗
 *   - オブジェクトでない / null
 *   - version が数値でない
 *   - data がオブジェクトでない / null
 *   - data の値に string 以外が含まれる
 */
export function parseSave(raw: string): SaveBlob | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['version'] !== 'number') {
    return null;
  }

  if (typeof obj['data'] !== 'object' || obj['data'] === null || Array.isArray(obj['data'])) {
    return null;
  }

  const data = obj['data'] as Record<string, unknown>;
  for (const val of Object.values(data)) {
    if (typeof val !== 'string') {
      return null;
    }
  }

  return {
    version: obj['version'] as number,
    data: data as Record<string, string>,
  };
}

/* ------------------------------------------------------------------ マイグレーション */

/**
 * 古いバージョンの SaveBlob を現行の SAVE_VERSION に変換する。
 * - 未知のキーは常にドロップする（SAVE_KEYS のみ保持）。
 * - 将来の v2+ は case 1: case 2: ... と順番に積み上げる。
 * - 副作用なし（新しいオブジェクトを返す）。
 */
export function migrate(blob: SaveBlob): SaveBlob {
  let current = { ...blob, data: { ...blob.data } };

  switch (current.version) {
    case 1:
      // v1 は現行バージョン。変換は不要。フォールスルーして後処理へ。
      break;
    default:
      // 未知のバージョン（将来の blob を古いクライアントで読んだ場合など）は
      // そのままデータを引き継ぎ、バージョンを上書きする。
      break;
  }

  // 常に: version を最新に固定し、SAVE_KEYS にないキーを除去する。
  const allowedSet = new Set<string>(SAVE_KEYS);
  const filteredData: Record<string, string> = {};
  for (const key of Object.keys(current.data)) {
    if (allowedSet.has(key)) {
      filteredData[key] = current.data[key];
    }
  }

  return { version: SAVE_VERSION, data: filteredData };
}

/* ------------------------------------------------------------------ インポート */

/**
 * 生 JSON 文字列からセーブデータを復元する。
 *   1. parseSave で検証。失敗したら false を返す。
 *   2. migrate で現行バージョンに変換。
 *   3. SAVE_KEYS を走査: blob.data にキーがあれば write、なければ remove。
 *   4. 成功したら true を返す。
 */
export function importSave(
  raw: string,
  write: (key: string, value: string) => void,
  remove: (key: string) => void,
): boolean {
  const blob = parseSave(raw);
  if (blob === null) {
    return false;
  }

  const migrated = migrate(blob);

  for (const key of SAVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(migrated.data, key)) {
      write(key, migrated.data[key]);
    } else {
      remove(key);
    }
  }

  return true;
}

/* ------------------------------------------------------------------ リセット */

/**
 * SAVE_KEYS の全エントリを remove コールバックで削除する。
 */
export function resetSave(remove: (key: string) => void): void {
  for (const key of SAVE_KEYS) {
    remove(key);
  }
}
