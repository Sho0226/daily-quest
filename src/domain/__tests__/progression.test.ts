import { describe, expect, it } from 'vitest';
import {
  evaluateProgression,
  initialTargetFor,
  initialTargets,
  isRunUnlocked,
  runTargetForWeek,
  targetsForWeek,
  type TestResult,
} from '../progression';
import { emptyDayRecord, type DayRecord } from '../quests';
import { recentDayKeys } from '../date';

const test1: TestResult = {
  date: '2026-08-31',
  maxPushups: 20,
  maxSitups: 30,
  maxSquats: 40,
};

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

/** A clean 7-day history: recorded every day, no soreness. */
function healthyWeek(todayKey: string): Record<string, DayRecord> {
  const days: Record<string, DayRecord> = {};
  for (const key of recentDayKeys(todayKey, 7)) {
    days[key] = day({ pushups: 20, doms: 0 });
  }
  return days;
}

describe('initialTargetFor', () => {
  it('is 60% of a maximal set, floored', () => {
    expect(initialTargetFor(20)).toBe(12);
    expect(initialTargetFor(33)).toBe(19); // floor(19.8)
  });

  it('never starts below 5', () => {
    expect(initialTargetFor(3)).toBe(5);
    expect(initialTargetFor(0)).toBe(5);
  });
});

describe('initialTargets', () => {
  it('leaves running locked at zero', () => {
    expect(initialTargets(test1)).toEqual({ pushups: 12, situps: 18, squats: 24, run: 0 });
  });
});

describe('runTargetForWeek', () => {
  it('follows the unlock table and then holds at 5km', () => {
    expect(runTargetForWeek(1)).toBe(0);
    expect(runTargetForWeek(2)).toBe(3);
    expect(runTargetForWeek(3)).toBe(4);
    expect(runTargetForWeek(4)).toBe(5);
    expect(runTargetForWeek(9)).toBe(5);
  });
});

describe('isRunUnlocked', () => {
  it('unlocks from week 2', () => {
    expect(isRunUnlocked(1)).toBe(false);
    expect(isRunUnlocked(2)).toBe(true);
  });
});

describe('targetsForWeek', () => {
  it('adds 10 reps per week', () => {
    expect(targetsForWeek(test1, 2)).toEqual({ pushups: 22, situps: 28, squats: 34, run: 3 });
  });

  it('stops strength at the 50 hard cap', () => {
    const t = targetsForWeek(test1, 10);
    expect(t.pushups).toBe(50);
    expect(t.situps).toBe(50);
    expect(t.squats).toBe(50);
    expect(t.run).toBe(5);
  });
});

describe('evaluateProgression', () => {
  const today = '2026-08-31';

  it('advances on a clean week at normal fatigue', () => {
    expect(evaluateProgression({ days: healthyWeek(today), todayKey: today, fatigue: 100 })).toEqual({
      advance: true,
      reason: null,
    });
  });

  it('holds when fatigue is in the caution zone', () => {
    expect(evaluateProgression({ days: healthyWeek(today), todayKey: today, fatigue: 130 })).toEqual({
      advance: false,
      reason: 'fatigue',
    });
  });

  it('holds when two of the last seven days had high soreness', () => {
    const days = healthyWeek(today);
    days['2026-08-31'] = day({ pushups: 20, doms: 3 });
    days['2026-08-30'] = day({ pushups: 20, doms: 3 });
    expect(evaluateProgression({ days, todayKey: today, fatigue: 100 }).reason).toBe('doms');
  });

  it('holds when the week was mostly unrecorded', () => {
    const days = { [today]: day({ pushups: 20, doms: 0 }) };
    expect(evaluateProgression({ days, todayKey: today, fatigue: 100 }).reason).toBe('lowRecordRate');
  });

  it('holds on sharp pain even when everything else looks fine', () => {
    const days = healthyWeek(today);
    days['2026-08-29'] = day({ pushups: 20, doms: 0, sharpPain: true });
    expect(evaluateProgression({ days, todayKey: today, fatigue: 100 }).reason).toBe('medical');
  });
});
