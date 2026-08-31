import { describe, expect, it } from 'vitest';
import { recentDayKeys } from '../date';
import type { TestResult } from '../progression';
import { emptyDayRecord, type DayRecord, type Targets } from '../quests';
import {
  detectLevelUp,
  computeAgi,
  computeInt,
  computeSen,
  computeStr,
  computeVit,
  expForDay,
  isOvershot,
  levelFromExp,
  spentPoints,
  totalExp,
  totalStats,
} from '../stats';

const today = '2026-08-31';
const targets: Targets = { pushups: 20, situps: 20, squats: 20, run: 3 };

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

const test1: TestResult = {
  date: today,
  maxPushups: 20,
  maxSitups: 30,
  maxSquats: 40,
};

describe('computeStr', () => {
  it('is the sum of maximal sets over 6', () => {
    expect(computeStr(test1)).toBe(15); // floor(90/6)
  });

  it('is 0 before any test', () => {
    expect(computeStr(null)).toBe(0);
  });
});

describe('computeVit', () => {
  it('accumulates the 28-day load', () => {
    const days: Record<string, DayRecord> = {};
    for (const key of recentDayKeys(today, 28)) {
      days[key] = day({ pushups: 20, situps: 20, squats: 20 }); // load 6/day
    }
    expect(computeVit(days, today)).toBe(16); // floor(168/10)
  });

  it('is 0 with no history', () => {
    expect(computeVit({}, today)).toBe(0);
  });
});

describe('computeAgi', () => {
  it('is 0 while the 5km test is unmeasured', () => {
    expect(computeAgi(undefined)).toBe(0);
  });

  it('rises as pace drops below 8 min/km', () => {
    expect(computeAgi(35)).toBe(10); // 7:00/km
    expect(computeAgi(30)).toBe(20); // 6:00/km
  });

  it('never goes negative for a slow pace', () => {
    expect(computeAgi(50)).toBe(0); // 10:00/km
  });
});

describe('computeSen', () => {
  it('scales with how often soreness was answered', () => {
    const days: Record<string, DayRecord> = {};
    for (const key of recentDayKeys(today, 28)) {
      days[key] = day({ doms: 0 });
    }
    expect(computeSen(days, today)).toBe(30);
  });

  it('counts a 0 answer, since answering is the point', () => {
    const days = { [today]: day({ doms: 0 }) };
    expect(computeSen(days, today)).toBe(1); // floor(1/28 * 30)
  });

  it('is 0 when nothing was answered', () => {
    expect(computeSen({}, today)).toBe(0);
  });
});

describe('isOvershot', () => {
  it('allows up to 1.2x the target', () => {
    expect(isOvershot(day({ pushups: 24, situps: 20, squats: 20 }), targets, false)).toBe(false);
  });

  it('flags going well past the target', () => {
    expect(isOvershot(day({ pushups: 40, situps: 20, squats: 20 }), targets, false)).toBe(true);
  });

  it('ignores running while it is locked', () => {
    expect(isOvershot(day({ run: 10 }), targets, false)).toBe(false);
    expect(isOvershot(day({ run: 10 }), targets, true)).toBe(true);
  });
});

describe('computeInt', () => {
  it('counts recorded days that stayed near the target', () => {
    const days = { [today]: day({ pushups: 20, situps: 20, squats: 20 }) };
    expect(computeInt(days, today, targets, false)).toBe(1); // floor(1/28 * 30)
  });

  it('does not count a day that overshot', () => {
    const days = { [today]: day({ pushups: 60, situps: 20, squats: 20 }) };
    expect(computeInt(days, today, targets, false)).toBe(0);
  });

  it('counts a recovery day as compliant', () => {
    const days = { [today]: day({ doms: 3, recovery: true, recoveryDone: true }) };
    expect(computeInt(days, today, targets, false)).toBe(1);
  });
});

describe('totalStats', () => {
  it('adds manually allocated points on top of the base', () => {
    const base = { str: 10, vit: 5, agi: 0, sen: 3, int: 2 };
    const allocated = { str: 2, vit: 0, agi: 4, sen: 0, int: 0 };
    expect(totalStats(base, allocated)).toEqual({ str: 12, vit: 5, agi: 4, sen: 3, int: 2 });
  });
});

describe('expForDay', () => {
  const cleared = day({ pushups: 20, situps: 20, squats: 20 });

  it('gives a full award for a cleared day', () => {
    expect(expForDay(cleared, targets, false)).toBe(100);
  });

  it('gives a partial award for a recorded but unfinished day', () => {
    expect(expForDay(day({ pushups: 5 }), targets, false)).toBe(20);
  });

  it('gives nothing for an untouched day', () => {
    expect(expForDay(undefined, targets, false)).toBe(0);
    expect(expForDay(emptyDayRecord(), targets, false)).toBe(0);
  });

  it('pays a completed recovery day the same as a cleared day', () => {
    const recovery = day({ doms: 3, recovery: true, recoveryDone: true });
    expect(expForDay(recovery, targets, false)).toBe(100);
  });

  it('pays an unfinished recovery day the recorded-only award', () => {
    const recovery = day({ doms: 3, recovery: true, recoveryDone: false });
    expect(expForDay(recovery, targets, false)).toBe(20);
  });
});

describe('totalExp', () => {
  it('sums day awards and test-day bonuses', () => {
    const days = {
      '2026-08-30': day({ pushups: 20, situps: 20, squats: 20 }), // 100
      '2026-08-31': day({ pushups: 5 }), // 20
    };
    expect(totalExp({ days, targets, runUnlocked: false, testDates: ['2026-08-24'] })).toBe(170);
  });
});

describe('levelFromExp', () => {
  it('starts at level 1', () => {
    expect(levelFromExp(0, 0)).toEqual({
      level: 1,
      expIntoLevel: 0,
      expForNext: 100,
      unspentPoints: 0,
    });
  });

  it('levels up every 100*level exp', () => {
    expect(levelFromExp(100, 0).level).toBe(2); // 100 clears level 1
    expect(levelFromExp(299, 0).level).toBe(2); // needs 200 more for level 3
    expect(levelFromExp(300, 0).level).toBe(3);
  });

  it('grants 3 points per level gained', () => {
    expect(levelFromExp(300, 0).unspentPoints).toBe(6); // levels 2 and 3
  });

  it('subtracts points already spent', () => {
    expect(levelFromExp(300, 4).unspentPoints).toBe(2);
  });

  it('never reports negative unspent points', () => {
    expect(levelFromExp(100, 99).unspentPoints).toBe(0);
  });
});

describe('spentPoints', () => {
  it('totals the allocation block', () => {
    expect(spentPoints({ str: 1, vit: 2, agi: 3, sen: 0, int: 4 })).toBe(10);
  });
});

describe('detectLevelUp', () => {
  it('adopts silently the first time, so a fresh install does not celebrate', () => {
    expect(detectLevelUp(null, 1)).toEqual({ event: null, adopt: 1 });
  });

  it('adopts silently after a migration, whatever the level already is', () => {
    expect(detectLevelUp(null, 14)).toEqual({ event: null, adopt: 14 });
  });

  it('says nothing when the level has not moved', () => {
    expect(detectLevelUp(7, 7)).toEqual({ event: null, adopt: null });
  });

  it('announces a single level gained, with its points', () => {
    expect(detectLevelUp(7, 8)).toEqual({
      event: { from: 7, to: 8, gainedPoints: 3 },
      adopt: null,
    });
  });

  it('announces several levels at once as one event', () => {
    expect(detectLevelUp(7, 10)).toEqual({
      event: { from: 7, to: 10, gainedPoints: 9 },
      adopt: null,
    });
  });

  it('follows the level down without announcing, after an undo or an import', () => {
    expect(detectLevelUp(9, 6)).toEqual({ event: null, adopt: 6 });
  });
});
