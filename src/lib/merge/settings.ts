/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: settings serialize/parse
 *
 * ゲーム設定の直列化・復元を担う純粋関数群。
 * localStorage への読み書きは UI 層が行い、ここでは副作用を持たない。
 * 不正な値は型ごとにデフォルト値へフォールバックし、例外を投げない。
 * ========================================================================== */

/* ---------------------------------------------------------------- 設定型 */

export type TargetModeName = 'first' | 'last' | 'strong' | 'weak' | 'near';
export type DifficultyName = 'gentle' | 'standard' | 'harsh';

export interface Settings {
  muted: boolean;
  targetMode: TargetModeName;
  difficulty: DifficultyName;
}

/* ---------------------------------------------------------------- 定数 */

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  targetMode: 'first',
  difficulty: 'standard',
};

const TARGET_MODE_VALUES: readonly TargetModeName[] = ['first', 'last', 'strong', 'weak', 'near'];
const DIFFICULTY_VALUES: readonly DifficultyName[] = ['gentle', 'standard', 'harsh'];

/* ---------------------------------------------------------------- 直列化 */

/** Settings を JSON 文字列に変換する。 */
export function serializeSettings(s: Settings): string {
  return JSON.stringify(s);
}

/* ---------------------------------------------------------------- 復元 */

/** JSON 文字列（または null）を Settings に変換する。
 *  null・不正 JSON・型不正のフィールドはデフォルト値へフォールバックする。
 *  例外を投げない。
 */
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return { ...DEFAULT_SETTINGS };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ...DEFAULT_SETTINGS };
  }

  const obj = parsed as Record<string, unknown>;

  const muted: boolean =
    typeof obj['muted'] === 'boolean' ? obj['muted'] : DEFAULT_SETTINGS.muted;

  const targetModeRaw = obj['targetMode'];
  const targetMode: TargetModeName =
    typeof targetModeRaw === 'string' &&
    (TARGET_MODE_VALUES as readonly string[]).includes(targetModeRaw)
      ? (targetModeRaw as TargetModeName)
      : DEFAULT_SETTINGS.targetMode;

  const difficultyRaw = obj['difficulty'];
  const difficulty: DifficultyName =
    typeof difficultyRaw === 'string' &&
    (DIFFICULTY_VALUES as readonly string[]).includes(difficultyRaw)
      ? (difficultyRaw as DifficultyName)
      : DEFAULT_SETTINGS.difficulty;

  return { muted, targetMode, difficulty };
}
