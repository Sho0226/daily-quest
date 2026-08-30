import { describe, expect, it } from 'vitest';
import {
  capFor,
  clampValue,
  isDayCleared,
  isDayRecorded,
  isQuestCapped,
  isQuestCleared,
} from '../quests';

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

describe('isDayRecorded / isDayCleared', () => {
  const targets = { pushups: 50, situps: 50, squats: 50, run: 5 };

  it('a day with all zeros is not recorded', () => {
    expect(isDayRecorded({ pushups: 0, situps: 0, squats: 0, run: 0 })).toBe(false);
  });

  it('a day with any nonzero value is recorded', () => {
    expect(isDayRecorded({ pushups: 0, situps: 0, squats: 0, run: 0.5 })).toBe(true);
  });

  it('undefined day is not recorded', () => {
    expect(isDayRecorded(undefined)).toBe(false);
  });

  it('is cleared only when every quest meets its target', () => {
    expect(isDayCleared({ pushups: 50, situps: 50, squats: 50, run: 4.9 }, targets)).toBe(false);
    expect(isDayCleared({ pushups: 50, situps: 50, squats: 50, run: 5 }, targets)).toBe(true);
  });
});
