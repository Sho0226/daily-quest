import { describe, expect, it } from 'vitest';
import { computeFatigue, fatigueZone } from '../fatigue';
import { emptyDayRecord, type DayRecord } from '../quests';
import { recentDayKeys } from '../date';

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

/** Builds `count` days ending at todayKey, all with the same load. */
function evenHistory(todayKey: string, count: number, pushups: number): Record<string, DayRecord> {
  const days: Record<string, DayRecord> = {};
  for (const key of recentDayKeys(todayKey, count)) {
    days[key] = day({ pushups });
  }
  return days;
}

describe('computeFatigue', () => {
  const today = '2026-08-31';

  it('returns 100 when there is no history at all', () => {
    expect(computeFatigue({}, today)).toBe(100);
  });

  it('returns ~100 when recent load matches the longer-term average', () => {
    const days = evenHistory(today, 28, 100);
    expect(computeFatigue(days, today)).toBe(100);
  });

  it('rises when the last week is heavier than the baseline', () => {
    const days = evenHistory(today, 28, 100);
    for (const key of recentDayKeys(today, 7)) {
      days[key] = day({ pushups: 200 });
    }
    expect(computeFatigue(days, today)).toBeGreaterThan(130);
  });

  it('falls when the last week is lighter than the baseline', () => {
    const days = evenHistory(today, 28, 100);
    for (const key of recentDayKeys(today, 7)) {
      days[key] = day({ pushups: 20 });
    }
    expect(computeFatigue(days, today)).toBeLessThan(80);
  });

  it('does not spike on a short history, because gaps are filled with the mean', () => {
    // Only 5 days logged; treating the other 23 as zero would inflate the ratio.
    const days: Record<string, DayRecord> = {};
    for (const key of recentDayKeys(today, 5)) {
      days[key] = day({ pushups: 100 });
    }
    expect(computeFatigue(days, today)).toBeLessThan(130);
  });
});

describe('fatigueZone', () => {
  it('maps the documented thresholds', () => {
    expect(fatigueZone(79)).toBe('easy');
    expect(fatigueZone(80)).toBe('normal');
    expect(fatigueZone(129)).toBe('normal');
    expect(fatigueZone(130)).toBe('caution');
    expect(fatigueZone(149)).toBe('caution');
    expect(fatigueZone(150)).toBe('danger');
  });
});
