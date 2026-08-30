import { previousDayKey } from './date';
import { isDayRecorded, type DayRecord } from './quests';

/**
 * Streak counts *recorded* days, not *cleared* days — logging a partial day keeps
 * the streak alive so users aren't pushed to overtrain just to avoid breaking it.
 */
export function computeStreak(days: Record<string, DayRecord>, todayKey: string): number {
  let count = 0;
  let cursor = todayKey;
  let isToday = true;

  for (;;) {
    const recorded = isDayRecorded(days[cursor]);
    if (recorded) {
      count++;
    } else if (!isToday) {
      break;
    }
    isToday = false;
    cursor = previousDayKey(cursor);

    // safety bound: never scan more than a few years back
    if (count > 3650) break;
  }

  return count;
}
