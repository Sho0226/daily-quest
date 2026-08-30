import { describe, expect, it } from 'vitest';
import { dayKey, formatCountdown, nextBoundary, previousDayKey } from '../date';

describe('dayKey', () => {
  it('keeps the calendar date when after the boundary hour', () => {
    expect(dayKey(new Date('2026-08-31T10:00:00'), 4)).toBe('2026-08-31');
  });

  it('rolls back to the previous day when before the boundary hour', () => {
    expect(dayKey(new Date('2026-08-31T02:30:00'), 4)).toBe('2026-08-30');
  });

  it('treats exactly the boundary hour as the new day', () => {
    expect(dayKey(new Date('2026-08-31T04:00:00'), 4)).toBe('2026-08-31');
  });
});

describe('previousDayKey', () => {
  it('subtracts one day', () => {
    expect(previousDayKey('2026-08-31')).toBe('2026-08-30');
  });

  it('crosses a month boundary', () => {
    expect(previousDayKey('2026-09-01')).toBe('2026-08-31');
  });
});

describe('nextBoundary', () => {
  it('returns today boundary when still before it', () => {
    const b = nextBoundary(new Date('2026-08-31T02:00:00'), 4);
    expect(b.toISOString().slice(0, 16)).toBe(new Date('2026-08-31T04:00:00').toISOString().slice(0, 16));
  });

  it('returns tomorrow boundary when already past it', () => {
    const b = nextBoundary(new Date('2026-08-31T10:00:00'), 4);
    expect(b.getDate()).toBe(1);
  });
});

describe('formatCountdown', () => {
  it('formats hours, minutes, seconds', () => {
    expect(formatCountdown(3661_000)).toBe('01:01:01');
  });

  it('floors negative/zero remaining to 00:00:00', () => {
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });
});
