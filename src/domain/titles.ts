import { recentDayKeys } from './date';
import { isDayCleared, isDayRecorded, type DayRecord, type Targets } from './quests';
import { computeStreak } from './streak';

export type TitleDef = {
  id: string;
  name: string;
  requirement: string;
  earned: (s: TitleContext) => boolean;
};

export type TitleContext = {
  streak: number;
  longestStreak: number;
  totalRecordedDays: number;
  totalClearedDays: number;
  totalRunKm: number;
  totalReps: number;
  recoveryCompleted: number;
  domsAnsweredRate28: number;
  daysAtHardCap: number;
};

/**
 * Conditions reward showing up and reading your own body, not big single days —
 * the same order of priority the training design uses. Nothing here can be earned
 * by exceeding a target, and resting properly is worth a title of its own.
 */
export const TITLE_DEFS: readonly TitleDef[] = [
  {
    id: 'first-step',
    name: '始めた者',
    requirement: '初めて1日をクリアする',
    earned: (s) => s.totalClearedDays >= 1,
  },
  {
    id: 'week',
    name: '継続する者',
    requirement: '7日連続で記録する',
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: 'month',
    name: '習慣の主',
    requirement: '30日連続で記録する',
    earned: (s) => s.longestStreak >= 30,
  },
  {
    id: 'hundred',
    name: '不屈',
    requirement: '100日連続で記録する',
    earned: (s) => s.longestStreak >= 100,
  },
  {
    id: 'year',
    name: '一年を歩いた者',
    requirement: '365日連続で記録する',
    earned: (s) => s.longestStreak >= 365,
  },
  {
    id: 'self-aware',
    name: '己を知る者',
    requirement: '回復クエストを5回完了する',
    earned: (s) => s.recoveryCompleted >= 5,
  },
  {
    id: 'observer',
    name: '観測者',
    requirement: '直近28日の9割以上で筋肉痛を記録する',
    earned: (s) => s.domsAnsweredRate28 >= 0.9,
  },
  {
    id: 'runner-50',
    name: '踏破者',
    requirement: '累計50kmを走る',
    earned: (s) => s.totalRunKm >= 50,
  },
  {
    id: 'runner-200',
    name: '長距離走者',
    requirement: '累計200kmを走る',
    earned: (s) => s.totalRunKm >= 200,
  },
  {
    id: 'reps-10000',
    name: '一万の反復',
    requirement: '累計10,000回をこなす',
    earned: (s) => s.totalReps >= 10_000,
  },
  {
    id: 'hard-cap',
    name: '上限に至る者',
    requirement: '50/50/50・5kmの目標を90日維持する',
    earned: (s) => s.daysAtHardCap >= 90,
  },
];

export function buildTitleContext(args: {
  days: Record<string, DayRecord>;
  todayKey: string;
  targets: Targets;
  runUnlocked: boolean;
  daysAtHardCap: number;
}): TitleContext {
  const { days, todayKey, targets, runUnlocked, daysAtHardCap } = args;
  const entries = Object.entries(days);

  let totalRecordedDays = 0;
  let totalClearedDays = 0;
  let totalRunKm = 0;
  let totalReps = 0;
  let recoveryCompleted = 0;

  for (const [, record] of entries) {
    if (!isDayRecorded(record)) continue;
    totalRecordedDays++;
    if (isDayCleared(record, targets, runUnlocked)) totalClearedDays++;
    totalRunKm += record.run;
    totalReps += record.pushups + record.situps + record.squats;
    if (record.recovery && record.recoveryDone) recoveryCompleted++;
  }

  const window28 = recentDayKeys(todayKey, 28);
  const answered = window28.filter((key) => days[key]?.doms != null).length;

  return {
    streak: computeStreak(days, todayKey),
    longestStreak: longestStreak(days),
    totalRecordedDays,
    totalClearedDays,
    totalRunKm: Math.round(totalRunKm * 10) / 10,
    totalReps,
    recoveryCompleted,
    domsAnsweredRate28: answered / window28.length,
    daysAtHardCap,
  };
}

/** Longest run of consecutive recorded days anywhere in the history. */
export function longestStreak(days: Record<string, DayRecord>): number {
  const keys = Object.keys(days)
    .filter((key) => isDayRecorded(days[key]))
    .sort();
  if (keys.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(`${keys[i - 1]}T00:00:00`).getTime();
    const curr = new Date(`${keys[i]}T00:00:00`).getTime();
    if (Math.round((curr - prev) / 86_400_000) === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function earnedTitles(context: TitleContext): TitleDef[] {
  return TITLE_DEFS.filter((title) => title.earned(context));
}
