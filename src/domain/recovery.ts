export const RECOVERY_TASKS = [
  { id: 'stretch', label: 'ストレッチ', detail: '痛む部位を中心に、反動をつけずに' },
  { id: 'walk', label: '20分の歩行', detail: 'ペースは問わない' },
] as const;

export const RECOVERY_MESSAGE =
  'システムが本日のクエストを回復クエストに差し替えました';

/** Cleared recovery is worth the same as a cleared day, so resting never costs progress. */
export const RECOVERY_EXP = 100;
