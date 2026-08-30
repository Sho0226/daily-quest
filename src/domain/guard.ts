import { recentDayKeys } from './date';
import type { DayRecord, DomsLevel } from './quests';

/** At or above this, the day is swapped for a recovery quest. */
export const RECOVERY_DOMS = 3;

/** Consecutive high-soreness days that warrant seeing a doctor. */
export const MEDICAL_DOMS_STREAK = 3;

/**
 * The system decides to swap the day out, rather than offering a "rest" button —
 * pressing rest yourself reads as losing, and that is what stops people coming back.
 */
export function shouldSwapForRecovery(doms: DomsLevel | null): boolean {
  return doms !== null && doms >= RECOVERY_DOMS;
}

/** High soreness on 2+ of the last 7 days freezes target progression. */
export function highDomsDaysInWindow(
  days: Record<string, DayRecord>,
  todayKey: string,
  window: number,
): number {
  return recentDayKeys(todayKey, window).filter((key) => {
    const doms = days[key]?.doms;
    return doms !== null && doms !== undefined && doms >= RECOVERY_DOMS;
  }).length;
}

/** Fraction of the last `window` days that have any record at all. */
export function recordRate(
  days: Record<string, DayRecord>,
  todayKey: string,
  window: number,
  isRecorded: (record: DayRecord | undefined) => boolean,
): number {
  const keys = recentDayKeys(todayKey, window);
  const recorded = keys.filter((key) => isRecorded(days[key])).length;
  return recorded / keys.length;
}

export type MedicalFlag = {
  advise: boolean;
  reason: 'domsStreak' | 'sharpPain' | null;
};

/**
 * Pain is the primary signal, not the load numbers: a normal fatigue reading never
 * overrides what the body is reporting here.
 */
export function medicalFlag(days: Record<string, DayRecord>, todayKey: string): MedicalFlag {
  const recent = recentDayKeys(todayKey, 14);

  if (recent.some((key) => days[key]?.sharpPain)) {
    return { advise: true, reason: 'sharpPain' };
  }

  let streak = 0;
  for (const key of recent) {
    const doms = days[key]?.doms;
    if (doms !== null && doms !== undefined && doms >= RECOVERY_DOMS) {
      streak++;
      if (streak >= MEDICAL_DOMS_STREAK) return { advise: true, reason: 'domsStreak' };
    } else {
      streak = 0;
    }
  }

  return { advise: false, reason: null };
}
