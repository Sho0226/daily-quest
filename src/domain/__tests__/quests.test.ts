import { describe, expect, it } from 'vitest';
import {
  activeQuests,
  capFor,
  clampValue,
  emptyDayRecord,
  isDayCleared,
  isDayRecorded,
  isQuestCapped,
  isQuestCleared,
  type DayRecord,
} from '../quests';

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

describe('capFor', () => {
  it('is 1.5x target for whole-number quests, floored', () => {
    expect(capFor(50, 0)).toBe(75);
    expect(capFor(21, 0)).toBe(31); // floor(31.5)
  });

  it('is 1.5x target for decimal quests, rounded to one place', () => {
    expect(capFor(5, 1)).toBe(7.5);
  });
});

describe('clampValue', () => {
  it('clamps below zero up to zero', () => {
    expect(clampValue(-3, 50, 0)).toBe(0);
  });

  it('clamps above the cap down to the cap', () => {
    expect(clampValue(999, 50, 0)).toBe(75);
  });

  it('passes through in-range values', () => {
    expect(clampValue(32, 50, 0)).toBe(32);
  });
});

describe('isQuestCleared / isQuestCapped', () => {
  it('cleared once value reaches target', () => {
    expect(isQuestCleared(49, 50)).toBe(false);
    expect(isQuestCleared(50, 50)).toBe(true);
  });

  it('capped once value reaches the 1.5x cap', () => {
    expect(isQuestCapped(74, 50, 0)).toBe(false);
    expect(isQuestCapped(75, 50, 0)).toBe(true);
  });
});

describe('isDayRecorded', () => {
  it('a day with all zeros and no soreness answer is not recorded', () => {
    expect(isDayRecorded(emptyDayRecord())).toBe(false);
  });

  it('a day with any nonzero quest value is recorded', () => {
    expect(isDayRecorded(day({ run: 0.5 }))).toBe(true);
  });

  it('answering soreness alone counts as recorded, even at level 0', () => {
    expect(isDayRecorded(day({ doms: 0 }))).toBe(true);
  });

  it('a completed recovery quest counts as recorded', () => {
    expect(isDayRecorded(day({ recovery: true, recoveryDone: true }))).toBe(true);
  });

  it('undefined day is not recorded', () => {
    expect(isDayRecorded(undefined)).toBe(false);
  });
});

describe('activeQuests', () => {
  it('excludes running until it is unlocked', () => {
    expect(activeQuests(false).map((q) => q.key)).toEqual(['pushups', 'situps', 'squats']);
    expect(activeQuests(true)).toHaveLength(4);
  });
});

describe('isDayCleared', () => {
  const targets = { pushups: 50, situps: 50, squats: 50, run: 5 };

  it('requires every unlocked quest to meet its target', () => {
    expect(isDayCleared(day({ pushups: 50, situps: 50, squats: 50, run: 4.9 }), targets, true)).toBe(false);
    expect(isDayCleared(day({ pushups: 50, situps: 50, squats: 50, run: 5 }), targets, true)).toBe(true);
  });

  it('ignores running while it is still locked', () => {
    expect(isDayCleared(day({ pushups: 50, situps: 50, squats: 50, run: 0 }), targets, false)).toBe(true);
  });

  it('on a recovery day, clearing means finishing the recovery quest', () => {
    expect(isDayCleared(day({ recovery: true, recoveryDone: false }), targets, true)).toBe(false);
    expect(isDayCleared(day({ recovery: true, recoveryDone: true }), targets, true)).toBe(true);
  });
});
