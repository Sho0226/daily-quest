import { describe, expect, it } from 'vitest';
import { highDomsDaysInWindow, medicalFlag, recordRate, shouldSwapForRecovery } from '../guard';
import { emptyDayRecord, isDayRecorded, type DayRecord, type DomsLevel } from '../quests';

function day(partial: Partial<DayRecord>): DayRecord {
  return { ...emptyDayRecord(), ...partial };
}

describe('shouldSwapForRecovery', () => {
  it('swaps at DOMS 3 and above', () => {
    expect(shouldSwapForRecovery(2)).toBe(false);
    expect(shouldSwapForRecovery(3)).toBe(true);
    expect(shouldSwapForRecovery(4)).toBe(true);
  });

  it('does not swap when soreness has not been answered', () => {
    expect(shouldSwapForRecovery(null)).toBe(false);
  });
});

describe('highDomsDaysInWindow', () => {
  it('counts only days at or above the recovery threshold', () => {
    const days = {
      '2026-08-31': day({ doms: 4 }),
      '2026-08-30': day({ doms: 2 }),
      '2026-08-29': day({ doms: 3 }),
    };
    expect(highDomsDaysInWindow(days, '2026-08-31', 7)).toBe(2);
  });

  it('ignores days outside the window', () => {
    const days = {
      '2026-08-31': day({ doms: 3 }),
      '2026-08-20': day({ doms: 4 }),
    };
    expect(highDomsDaysInWindow(days, '2026-08-31', 7)).toBe(1);
  });
});

describe('recordRate', () => {
  it('is the fraction of days with any record', () => {
    const days = {
      '2026-08-31': day({ pushups: 10 }),
      '2026-08-30': day({ doms: 0 }),
      '2026-08-29': day({ pushups: 5 }),
    };
    expect(recordRate(days, '2026-08-31', 7, isDayRecorded)).toBeCloseTo(3 / 7);
  });
});

describe('medicalFlag', () => {
  it('is clear on an ordinary history', () => {
    const days = { '2026-08-31': day({ doms: 1 }) };
    expect(medicalFlag(days, '2026-08-31').advise).toBe(false);
  });

  it('advises after three consecutive high-soreness days', () => {
    const days = {
      '2026-08-31': day({ doms: 3 }),
      '2026-08-30': day({ doms: 3 }),
      '2026-08-29': day({ doms: 4 }),
    };
    expect(medicalFlag(days, '2026-08-31')).toEqual({ advise: true, reason: 'domsStreak' });
  });

  it('does not advise when high-soreness days are not consecutive', () => {
    const days = {
      '2026-08-31': day({ doms: 3 }),
      '2026-08-30': day({ doms: 1 }),
      '2026-08-29': day({ doms: 3 }),
      '2026-08-28': day({ doms: 3 }),
    };
    expect(medicalFlag(days, '2026-08-31').advise).toBe(false);
  });

  it('advises immediately on sharp pain, regardless of soreness level', () => {
    const days = { '2026-08-30': day({ doms: 0, sharpPain: true }) };
    expect(medicalFlag(days, '2026-08-31')).toEqual({ advise: true, reason: 'sharpPain' });
  });
});

describe('DomsLevel typing', () => {
  it('accepts the documented range', () => {
    const levels: DomsLevel[] = [0, 1, 2, 3, 4];
    expect(levels).toHaveLength(5);
  });
});
