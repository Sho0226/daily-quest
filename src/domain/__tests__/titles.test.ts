import { describe, expect, it } from 'vitest';
import { recentDayKeys } from '../date';
import { emptyDayRecord, type DayRecord, type Targets } from '../quests';
import { buildTitleContext, earnedTitles, longestStreak, TITLE_DEFS } from '../titles';

const today = '2026-08-31';
const targets: Targets = { pushups: 20, situps: 20, squats: 20, run: 3 };

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

const baseContext = {
  streak: 0,
  longestStreak: 0,
  totalRecordedDays: 0,
  totalClearedDays: 0,
  totalRunKm: 0,
  totalReps: 0,
  recoveryCompleted: 0,
  domsAnsweredRate28: 0,
  daysAtHardCap: 0,
};

describe('longestStreak', () => {
  it('is 0 with no records', () => {
    expect(longestStreak({})).toBe(0);
  });

  it('finds the longest consecutive run, not the current one', () => {
    const days = {
      '2026-08-01': day({ pushups: 10 }),
      '2026-08-02': day({ pushups: 10 }),
      '2026-08-03': day({ pushups: 10 }),
      // gap
      '2026-08-20': day({ pushups: 10 }),
    };
    expect(longestStreak(days)).toBe(3);
  });

  it('ignores days that were touched but left empty', () => {
    const days = {
      '2026-08-01': day({ pushups: 10 }),
      '2026-08-02': emptyDayRecord(),
      '2026-08-03': day({ pushups: 10 }),
    };
    expect(longestStreak(days)).toBe(1);
  });
});

describe('buildTitleContext', () => {
  it('totals reps, distance, and completed recovery days', () => {
    const days = {
      '2026-08-30': day({ pushups: 20, situps: 20, squats: 20, run: 3 }),
      '2026-08-31': day({ doms: 3, recovery: true, recoveryDone: true }),
    };
    const ctx = buildTitleContext({ days, todayKey: today, targets, runUnlocked: true, daysAtHardCap: 0 });

    expect(ctx.totalReps).toBe(60);
    expect(ctx.totalRunKm).toBe(3);
    expect(ctx.recoveryCompleted).toBe(1);
    expect(ctx.totalRecordedDays).toBe(2);
  });

  it('measures the soreness answer rate over the last 28 days', () => {
    const days: Record<string, DayRecord> = {};
    for (const key of recentDayKeys(today, 28)) {
      days[key] = day({ doms: 0 });
    }
    const ctx = buildTitleContext({ days, todayKey: today, targets, runUnlocked: true, daysAtHardCap: 0 });
    expect(ctx.domsAnsweredRate28).toBe(1);
  });
});

describe('earnedTitles', () => {
  it('awards nothing at the start', () => {
    expect(earnedTitles(baseContext)).toEqual([]);
  });

  it('awards the streak titles cumulatively', () => {
    const ids = earnedTitles({ ...baseContext, longestStreak: 30 }).map((t) => t.id);
    expect(ids).toContain('week');
    expect(ids).toContain('month');
    expect(ids).not.toContain('hundred');
  });

  it('rewards completed recovery days', () => {
    const ids = earnedTitles({ ...baseContext, recoveryCompleted: 5 }).map((t) => t.id);
    expect(ids).toContain('self-aware');
  });

  it('cannot be earned by exceeding a target on a single day', () => {
    // A huge single session moves totals but earns nothing on its own.
    const ids = earnedTitles({ ...baseContext, totalReps: 500, totalRunKm: 20 }).map((t) => t.id);
    expect(ids).toEqual([]);
  });
});

describe('TITLE_DEFS', () => {
  it('has unique ids', () => {
    const ids = TITLE_DEFS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('documents a requirement for every title', () => {
    expect(TITLE_DEFS.every((t) => t.requirement.length > 0)).toBe(true);
  });
});
