import { recentDayKeys } from './date';
import { dailyLoad } from './load';
import type { DayRecord } from './quests';

export const ACUTE_DAYS = 7;
export const CHRONIC_DAYS = 28;

export type FatigueZone = 'easy' | 'normal' | 'caution' | 'danger';

/** Above this, the weekly target bump is withheld. */
export const CAUTION_THRESHOLD = 130;
export const DANGER_THRESHOLD = 150;

export function fatigueZone(fatigue: number): FatigueZone {
  if (fatigue >= DANGER_THRESHOLD) return 'danger';
  if (fatigue >= CAUTION_THRESHOLD) return 'caution';
  if (fatigue >= 80) return 'normal';
  return 'easy';
}

export const ZONE_LABELS: Record<FatigueZone, string> = {
  easy: '余裕',
  normal: '適正',
  caution: '警戒',
  danger: '危険',
};

/**
 * Acute-to-chronic load ratio, as a percentage.
 *
 * Missing days inside the 28-day window are filled with the recent daily mean rather
 * than counted as zero: an empty history would otherwise shrink `chronic` and make the
 * ratio spike, firing warnings at someone who simply hasn't logged much yet.
 */
export function computeFatigue(days: Record<string, DayRecord>, todayKey: string): number {
  const acuteKeys = recentDayKeys(todayKey, ACUTE_DAYS);
  const chronicKeys = recentDayKeys(todayKey, CHRONIC_DAYS);

  const acute = acuteKeys.reduce((sum, key) => sum + dailyLoad(days[key]), 0);

  const recorded = chronicKeys.filter((key) => days[key] !== undefined);
  const fillValue = recorded.length
    ? recorded.reduce((sum, key) => sum + dailyLoad(days[key]), 0) / recorded.length
    : 0;

  const chronicTotal = chronicKeys.reduce(
    (sum, key) => sum + (days[key] !== undefined ? dailyLoad(days[key]) : fillValue),
    0,
  );
  const chronic = chronicTotal / 4;

  if (chronic === 0) return 100;
  return Math.round((acute / chronic) * 100);
}
