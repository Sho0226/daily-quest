import { recentDayKeys } from './date';
import { CHRONIC_DAYS } from './fatigue';
import { dailyLoad } from './load';
import { isDayCleared, isDayRecorded, type DayRecord, type Targets } from './quests';
import type { TestResult } from './progression';

export type StatKey = 'str' | 'vit' | 'agi' | 'sen' | 'int';

export type StatBlock = Record<StatKey, number>;

export const STAT_DEFS: readonly { key: StatKey; label: string; tag: string }[] = [
  { key: 'str', label: '筋力', tag: 'STR' },
  { key: 'vit', label: '体力', tag: 'VIT' },
  { key: 'agi', label: '敏捷性', tag: 'AGI' },
  { key: 'sen', label: '知覚', tag: 'SEN' },
  { key: 'int', label: '知力', tag: 'INT' },
];

export const emptyStatBlock = (): StatBlock => ({ str: 0, vit: 0, agi: 0, sen: 0, int: 0 });

/** Pace at which AGI starts accruing, in minutes per km. */
const AGI_BASE_PACE = 8;

export function computeStr(test: TestResult | null): number {
  if (!test) return 0;
  return Math.floor((test.maxPushups + test.maxSitups + test.maxSquats) / 6);
}

export function computeVit(days: Record<string, DayRecord>, todayKey: string): number {
  const total = recentDayKeys(todayKey, CHRONIC_DAYS).reduce(
    (sum, key) => sum + dailyLoad(days[key]),
    0,
  );
  return Math.floor(total / 10);
}

export function computeAgi(fiveKmMinutes: number | undefined): number {
  if (fiveKmMinutes === undefined) return 0;
  const pace = fiveKmMinutes / 5;
  return Math.floor(Math.max(0, AGI_BASE_PACE - pace) * 10);
}

/** Rewards answering the soreness prompt — the signal the injury guards depend on. */
export function computeSen(days: Record<string, DayRecord>, todayKey: string): number {
  const keys = recentDayKeys(todayKey, CHRONIC_DAYS);
  const answered = keys.filter((key) => days[key]?.doms != null).length;
  return Math.floor((answered / keys.length) * 30);
}

/**
 * Compliance, not volume: a day counts only if it was recorded *and* not overshot.
 * Going far past the target lowers this, so "I felt good so I doubled it" is not rewarded.
 */
export function computeInt(
  days: Record<string, DayRecord>,
  todayKey: string,
  targets: Targets,
  runUnlocked: boolean,
): number {
  const keys = recentDayKeys(todayKey, CHRONIC_DAYS);
  const compliant = keys.filter((key) => {
    const record = days[key];
    if (!isDayRecorded(record)) return false;
    if (record!.recovery) return true;
    return !isOvershot(record!, targets, runUnlocked);
  }).length;
  return Math.floor((compliant / keys.length) * 30);
}

/** Overshooting means exceeding 1.2x the target on any quest. */
export function isOvershot(record: DayRecord, targets: Targets, runUnlocked: boolean): boolean {
  const checks: [number, number][] = [
    [record.pushups, targets.pushups],
    [record.situps, targets.situps],
    [record.squats, targets.squats],
  ];
  if (runUnlocked) checks.push([record.run, targets.run]);
  return checks.some(([value, target]) => target > 0 && value > target * 1.2);
}

export function computeBaseStats(args: {
  days: Record<string, DayRecord>;
  todayKey: string;
  targets: Targets;
  runUnlocked: boolean;
  latestTest: TestResult | null;
}): StatBlock {
  const { days, todayKey, targets, runUnlocked, latestTest } = args;
  return {
    str: computeStr(latestTest),
    vit: computeVit(days, todayKey),
    agi: computeAgi(latestTest?.fiveKmMinutes),
    sen: computeSen(days, todayKey),
    int: computeInt(days, todayKey, targets, runUnlocked),
  };
}

export function totalStats(base: StatBlock, allocated: StatBlock): StatBlock {
  return {
    str: base.str + allocated.str,
    vit: base.vit + allocated.vit,
    agi: base.agi + allocated.agi,
    sen: base.sen + allocated.sen,
    int: base.int + allocated.int,
  };
}

// --- level & experience ---

export const EXP_CLEARED = 100;
export const EXP_RECORDED_ONLY = 20;
export const EXP_TEST_DAY = 50;
/** A recovery day is worth a cleared day, so resting never costs progress. */
export const EXP_RECOVERY = 100;

export const POINTS_PER_LEVEL = 3;

export function expForDay(
  record: DayRecord | undefined,
  targets: Targets,
  runUnlocked: boolean,
): number {
  if (!isDayRecorded(record)) return 0;
  if (record!.recovery) return record!.recoveryDone ? EXP_RECOVERY : EXP_RECORDED_ONLY;
  return isDayCleared(record, targets, runUnlocked) ? EXP_CLEARED : EXP_RECORDED_ONLY;
}

export function totalExp(args: {
  days: Record<string, DayRecord>;
  targets: Targets;
  runUnlocked: boolean;
  testDates: string[];
}): number {
  const { days, targets, runUnlocked, testDates } = args;
  const fromDays = Object.values(days).reduce(
    (sum, record) => sum + expForDay(record, targets, runUnlocked),
    0,
  );
  return fromDays + testDates.length * EXP_TEST_DAY;
}

export const expToNextLevel = (level: number): number => 100 * level;

export type LevelState = {
  level: number;
  expIntoLevel: number;
  expForNext: number;
  unspentPoints: number;
};

export function levelFromExp(exp: number, spentPoints: number): LevelState {
  let level = 1;
  let remaining = exp;
  while (remaining >= expToNextLevel(level)) {
    remaining -= expToNextLevel(level);
    level++;
  }
  const earnedPoints = (level - 1) * POINTS_PER_LEVEL;
  return {
    level,
    expIntoLevel: remaining,
    expForNext: expToNextLevel(level),
    unspentPoints: Math.max(0, earnedPoints - spentPoints),
  };
}

export function spentPoints(allocated: StatBlock): number {
  return allocated.str + allocated.vit + allocated.agi + allocated.sen + allocated.int;
}
