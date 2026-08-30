import { describe, expect, it } from 'vitest';
import { computeStreak } from '../streak';
import type { DayRecord } from '../quests';

const rec = (pushups: number): DayRecord => ({ pushups, situps: 0, squats: 0, run: 0 });

describe('computeStreak', () => {
  it('is 0 with no history and today unrecorded', () => {
    expect(computeStreak({}, '2026-08-31')).toBe(0);
  });

  it('counts today if already recorded', () => {
    const days = { '2026-08-31': rec(10) };
    expect(computeStreak(days, '2026-08-31')).toBe(1);
  });

  it('does not break the streak just because today has no record yet', () => {
    const days = {
      '2026-08-29': rec(10),
      '2026-08-30': rec(10),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(2);
  });

  it('stops counting at the first gap day before today', () => {
    const days = {
      '2026-08-27': rec(10),
      '2026-08-29': rec(10),
      '2026-08-30': rec(10),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(2);
  });

  it('a day recorded with all zeros does not count', () => {
    const days = {
      '2026-08-30': rec(0),
      '2026-08-31': rec(5),
    };
    expect(computeStreak(days, '2026-08-31')).toBe(1);
  });
});
