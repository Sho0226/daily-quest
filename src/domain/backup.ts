import type { DayRecord, Targets } from './quests';
import type { TestResult } from './progression';
import type { StatBlock } from './stats';
import type { Settings } from '../store/settings';

/** Bump alongside the store's SCHEMA_VERSION whenever the persisted shape changes. */
export const BACKUP_SCHEMA_VERSION = 4;

export type Backup = {
  schemaVersion: number;
  exportedAt: string;
  startedAt: string | null;
  dayBoundaryHour: number;
  testDayOfWeek: number;
  week: number;
  initialTest: TestResult | null;
  targets: Targets;
  days: Record<string, DayRecord>;
  tests: TestResult[];
  allocated: StatBlock;
  titles: string[];
  settings: Settings;
};

export type ImportResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function backupFilename(exportedAt: string): string {
  return `daily-quest-${exportedAt.slice(0, 10)}.json`;
}

export const EXPORT_REMINDER_DAYS = 30;

/** Storage can be evicted, so a monthly export is the real safety net. */
export function shouldRemindExport(lastExportAt: string | null, now: Date): boolean {
  if (!lastExportAt) return true;
  const elapsed = now.getTime() - new Date(lastExportAt).getTime();
  return elapsed > EXPORT_REMINDER_DAYS * 86_400_000;
}
