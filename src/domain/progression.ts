import { CAUTION_THRESHOLD } from './fatigue';
import { highDomsDaysInWindow, medicalFlag, recordRate } from './guard';
import { isDayRecorded, type DayRecord, type Targets } from './quests';

export type TestResult = {
  date: string;
  maxPushups: number;
  maxSitups: number;
  maxSquats: number;
  fiveKmMinutes?: number;
};

/** Halved from the manga's 100/100/100 · 10km, which is not a daily dose. */
export const STRENGTH_HARD_CAP = 50;
export const RUN_HARD_CAP = 5;

export const STRENGTH_STEP = 10;
export const MIN_INITIAL_TARGET = 5;

/** Start at 60% of a maximal set so the first week is repeatable, not a one-off effort. */
export function initialTargetFor(maxReps: number): number {
  return Math.max(MIN_INITIAL_TARGET, Math.floor(maxReps * 0.6));
}

export function initialTargets(test: TestResult): Targets {
  return {
    pushups: initialTargetFor(test.maxPushups),
    situps: initialTargetFor(test.maxSitups),
    squats: initialTargetFor(test.maxSquats),
    run: 0,
  };
}

/**
 * Running grows by frequency, not distance: week 2 unlocks 3km, then 4km, then 5km,
 * and it stays there. Weeks are 1-indexed; week 1 is the initial test result.
 */
export function runTargetForWeek(week: number): number {
  if (week <= 1) return 0;
  if (week === 2) return 3;
  if (week === 3) return 4;
  return RUN_HARD_CAP;
}

export function isRunUnlocked(week: number): boolean {
  return week >= 2;
}

export function targetsForWeek(test: TestResult, week: number): Targets {
  const base = initialTargets(test);
  const bump = (week - 1) * STRENGTH_STEP;
  return {
    pushups: Math.min(base.pushups + bump, STRENGTH_HARD_CAP),
    situps: Math.min(base.situps + bump, STRENGTH_HARD_CAP),
    squats: Math.min(base.squats + bump, STRENGTH_HARD_CAP),
    run: runTargetForWeek(week),
  };
}

export type SkipReason = 'fatigue' | 'doms' | 'lowRecordRate' | 'medical' | null;

export type ProgressionDecision = {
  advance: boolean;
  reason: SkipReason;
};

/**
 * Evaluated on the weekly test day. Every skip leaves targets exactly where they are —
 * nothing is carried over or owed, because making up a missed week is how people get hurt.
 */
export function evaluateProgression(args: {
  days: Record<string, DayRecord>;
  todayKey: string;
  fatigue: number;
}): ProgressionDecision {
  const { days, todayKey, fatigue } = args;

  if (medicalFlag(days, todayKey).advise) {
    return { advance: false, reason: 'medical' };
  }
  if (fatigue >= CAUTION_THRESHOLD) {
    return { advance: false, reason: 'fatigue' };
  }
  if (highDomsDaysInWindow(days, todayKey, 7) >= 2) {
    return { advance: false, reason: 'doms' };
  }
  if (recordRate(days, todayKey, 7, isDayRecorded) < 0.7) {
    return { advance: false, reason: 'lowRecordRate' };
  }

  return { advance: true, reason: null };
}

export const SKIP_MESSAGES: Record<Exclude<SkipReason, null>, string> = {
  fatigue: '疲労度が高いため、システムがクエストの更新を保留しました',
  doms: '筋肉痛が続いているため、システムがクエストの更新を保留しました',
  lowRecordRate: '記録の途切れが多いため、システムがクエストの更新を保留しました',
  medical: '痛みの報告があるため、システムがクエストの更新を保留しました',
};

/** True once targets have reached the hard cap and can go no further without unlocking. */
export function isAtHardCap(targets: Targets): boolean {
  return (
    targets.pushups >= STRENGTH_HARD_CAP &&
    targets.situps >= STRENGTH_HARD_CAP &&
    targets.squats >= STRENGTH_HARD_CAP &&
    targets.run >= RUN_HARD_CAP
  );
}
