import type { DayRecord } from './quests';

/**
 * Puts reps and kilometres on one arbitrary scale so a week's work can be summed.
 * Only ratios of this number are ever used — the absolute value means nothing.
 */
export function dailyLoad(record: DayRecord | undefined): number {
  if (!record) return 0;
  return (record.pushups + record.situps + record.squats) / 10 + record.run * 2;
}
