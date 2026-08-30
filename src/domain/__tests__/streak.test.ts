import { describe, expect, it } from 'vitest';
import { computeStreak } from '../streak';
import { emptyDayRecord, type DayRecord } from '../quests';

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

describe('computeStreak', () => {
  it('is 0 with no history and today unrecorded', () => {
    expect(computeStreak({}, '2026-08-31')).toBe(0);
  });

  it('counts today if already recorded', () => {
    const days = { '2026-08-31': day({ pushups: 10 }) };
    expect(computeStreak(days, '2026-08-31')).toBe(1);
  });

  it('does not break the streak just because today has no record yet', () => {
    const days = {
      '2026-08-29': day({ pushups: 10 }),
      '2026-08-30': day({ pushups: 10 }),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(2);
  });

  it('stops counting at the first gap day before today', () => {
    const days = {
      '2026-08-27': day({ pushups: 10 }),
      '2026-08-29': day({ pushups: 10 }),
      '2026-08-30': day({ pushups: 10 }),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(2);
  });

  it('a day touched with all zeros and no soreness answer does not count', () => {
    const days = {
      '2026-08-30': emptyDayRecord(),
      '2026-08-31': day({ pushups: 5 }),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(1);
  });

  it('a recovery day keeps the streak alive', () => {
    const days = {
      '2026-08-29': day({ pushups: 10 }),
      '2026-08-30': day({ recovery: true, recoveryDone: true, doms: 3 }),
      '2026-08-31': day({ pushups: 10 }),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(3);
  });
});
