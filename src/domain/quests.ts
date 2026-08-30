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

export type DayRecord = Record<QuestKey, number>;

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

export function isDayRecorded(record: DayRecord | undefined): boolean {
  if (!record) return false;
  return QUEST_DEFS.some((q) => (record[q.key] ?? 0) > 0);
}

export function isDayCleared(record: DayRecord | undefined, targets: Record<QuestKey, number>): boolean {
  if (!record) return false;
  return QUEST_DEFS.every((q) => isQuestCleared(record[q.key] ?? 0, targets[q.key]));
}

export function emptyDayRecord(): DayRecord {
  return { pushups: 0, situps: 0, squats: 0, run: 0 };
}
