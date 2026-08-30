export type QuestKey = 'pushups' | 'situps' | 'squats' | 'run';

export type QuestDef = {
  key: QuestKey;
  tag: string;
  label: string;
  unit: string;
  decimals: 0 | 1;
  steps: readonly [number, number];
};

export const QUEST_DEFS: readonly QuestDef[] = [
  { key: 'pushups', tag: 'PUSH', label: '腕立て伏せ', unit: '回', decimals: 0, steps: [1, 10] },
  { key: 'situps', tag: 'SIT', label: '腹筋', unit: '回', decimals: 0, steps: [1, 10] },
  { key: 'squats', tag: 'SQUAT', label: 'スクワット', unit: '回', decimals: 0, steps: [1, 10] },
  { key: 'run', tag: 'RUN', label: 'ランニング', unit: 'km', decimals: 1, steps: [0.5, 1] },
];

export const STRENGTH_KEYS = ['pushups', 'situps', 'squats'] as const;

/** 0=なし 1=こわばり 2=動かすと痛い 3=日常動作でつらい 4=常時痛い */
export type DomsLevel = 0 | 1 | 2 | 3 | 4;

export const DOMS_LABELS: Record<DomsLevel, string> = {
  0: 'なし',
  1: 'こわばり',
  2: '動かすと痛い',
  3: '日常動作でつらい',
  4: '常時痛い',
};

export type Targets = Record<QuestKey, number>;

export type DayRecord = {
  pushups: number;
  situps: number;
  squats: number;
  run: number;
  /** null means the user hasn't answered yet — distinct from 0 ("no soreness"). */
  doms: DomsLevel | null;
  /** the system swapped this day out for a recovery quest */
  recovery: boolean;
  /** the recovery quest was completed */
  recoveryDone: boolean;
  /** pain along a bone, or sharp pain on one side only */
  sharpPain: boolean;
};

export const CAP_MULTIPLIER = 1.5;

export function capFor(target: number, decimals: 0 | 1): number {
  const raw = target * CAP_MULTIPLIER;
  return decimals ? Math.round(raw * 10) / 10 : Math.floor(raw);
}

export function roundToStep(value: number, decimals: 0 | 1): number {
  return decimals ? Math.round(value * 10) / 10 : Math.round(value);
}

export function clampValue(value: number, target: number, decimals: 0 | 1): number {
  const max = capFor(target, decimals);
  return roundToStep(Math.max(0, Math.min(value, max)), decimals);
}

export function isQuestCleared(value: number, target: number): boolean {
  return value >= target;
}

export function isQuestCapped(value: number, target: number, decimals: 0 | 1): boolean {
  return value >= capFor(target, decimals);
}

export function emptyDayRecord(): DayRecord {
  return {
    pushups: 0,
    situps: 0,
    squats: 0,
    run: 0,
    doms: null,
    recovery: false,
    recoveryDone: false,
    sharpPain: false,
  };
}

/**
 * A day counts as "recorded" if the user interacted with it at all — logging reps,
 * answering the soreness prompt, or finishing a recovery quest. Streaks are built on
 * this, not on clearing, so nobody has to overtrain to keep a streak alive.
 */
export function isDayRecorded(record: DayRecord | undefined): boolean {
  if (!record) return false;
  if (record.doms !== null) return true;
  if (record.recoveryDone) return true;
  return QUEST_DEFS.some((q) => (record[q.key] ?? 0) > 0);
}

/** Quests that count toward clearing today — the run is excluded until it unlocks. */
export function activeQuests(runUnlocked: boolean): readonly QuestDef[] {
  return runUnlocked ? QUEST_DEFS : QUEST_DEFS.filter((q) => q.key !== 'run');
}

export function isDayCleared(
  record: DayRecord | undefined,
  targets: Targets,
  runUnlocked: boolean,
): boolean {
  if (!record) return false;
  if (record.recovery) return record.recoveryDone;
  return activeQuests(runUnlocked).every((q) => isQuestCleared(record[q.key] ?? 0, targets[q.key]));
}
