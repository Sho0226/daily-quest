import { describe, expect, it } from 'vitest';
import { backupFilename, shouldRemindExport, type Backup } from '../backup';
import { parseBackup } from '../backupSchema';

const valid: Backup = {
  schemaVersion: 5,
  exportedAt: '2026-08-31T04:00:00.000Z',
  name: '山田 太郎',
  startedAt: '2026-08-01',
  dayBoundaryHour: 4,
  testDayOfWeek: 0,
  week: 3,
  initialTest: { date: '2026-08-01', maxPushups: 20, maxSitups: 30, maxSquats: 40 },
  targets: { pushups: 32, situps: 38, squats: 44, run: 4 },
  days: {
    '2026-08-30': {
      pushups: 32,
      situps: 38,
      squats: 44,
      run: 4,
      doms: 1,
      recovery: false,
      recoveryDone: false,
      sharpPain: false,
    },
  },
  tests: [{ date: '2026-08-01', maxPushups: 20, maxSitups: 30, maxSquats: 40 }],
  allocated: { str: 1, vit: 0, agi: 0, sen: 0, int: 2 },
  titles: ['week'],
  settings: { animations: true, sound: true, highContrast: false },
};

describe('parseBackup', () => {
  it('accepts a well-formed export', () => {
    const result = parseBackup(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.week).toBe(3);
  });

  it('rejects text that is not JSON', () => {
    const result = parseBackup('not json at all');
    expect(result.ok).toBe(false);
  });

  it('rejects JSON that is missing required fields', () => {
    const result = parseBackup(JSON.stringify({ schemaVersion: 4 }));
    expect(result.ok).toBe(false);
  });

  it('names the offending field so the message is actionable', () => {
    const broken = { ...valid, targets: { ...valid.targets, pushups: 'twenty' } };
    const result = parseBackup(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('targets.pushups');
  });

  it('rejects a negative count rather than storing it', () => {
    const broken = {
      ...valid,
      days: { '2026-08-30': { ...valid.days['2026-08-30'], pushups: -5 } },
    };
    expect(parseBackup(JSON.stringify(broken)).ok).toBe(false);
  });

  it('refuses a file written by a newer version', () => {
    const future = { ...valid, schemaVersion: 99 };
    const result = parseBackup(JSON.stringify(future));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('新しいバージョン');
  });

  it('accepts an older schema version', () => {
    expect(parseBackup(JSON.stringify({ ...valid, schemaVersion: 3 })).ok).toBe(true);
  });

  it('accepts an export written before names existed', () => {
    const { name, ...withoutName } = valid;
    void name;
    const result = parseBackup(JSON.stringify({ ...withoutName, schemaVersion: 4 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.name).toBeUndefined();
  });

  it('keeps the name on a round trip', () => {
    const result = parseBackup(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.name).toBe('山田 太郎');
  });
});

describe('backupFilename', () => {
  it('names the file by export date', () => {
    expect(backupFilename('2026-08-31T04:00:00.000Z')).toBe('daily-quest-2026-08-31.json');
  });
});

describe('shouldRemindExport', () => {
  const now = new Date('2026-08-31T12:00:00Z');

  it('reminds when nothing has ever been exported', () => {
    expect(shouldRemindExport(null, now)).toBe(true);
  });

  it('stays quiet just after an export', () => {
    expect(shouldRemindExport('2026-08-25T12:00:00Z', now)).toBe(false);
  });

  it('reminds again after a month', () => {
    expect(shouldRemindExport('2026-07-01T12:00:00Z', now)).toBe(true);
  });
});
