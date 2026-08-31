import { z } from 'zod';
import { BACKUP_SCHEMA_VERSION, type ImportResult } from './backup';

// Loaded on demand: validation only runs when a file is actually imported, so zod
// stays out of the startup bundle.

const domsLevel = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const dayRecordSchema = z.object({
  pushups: z.number().min(0),
  situps: z.number().min(0),
  squats: z.number().min(0),
  run: z.number().min(0),
  doms: domsLevel.nullable(),
  recovery: z.boolean(),
  recoveryDone: z.boolean(),
  sharpPain: z.boolean(),
});

const targetsSchema = z.object({
  pushups: z.number().min(0),
  situps: z.number().min(0),
  squats: z.number().min(0),
  run: z.number().min(0),
});

const testResultSchema = z.object({
  date: z.string(),
  maxPushups: z.number().min(0),
  maxSitups: z.number().min(0),
  maxSquats: z.number().min(0),
  fiveKmMinutes: z.number().min(0).optional(),
});

const statBlockSchema = z.object({
  str: z.number().min(0),
  vit: z.number().min(0),
  agi: z.number().min(0),
  sen: z.number().min(0),
  int: z.number().min(0),
});

export const backupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  // Optional so exports written before names existed still import.
  name: z.string().optional(),
  startedAt: z.string().nullable(),
  dayBoundaryHour: z.number().min(0).max(23),
  testDayOfWeek: z.number().min(0).max(6),
  week: z.number().min(1),
  initialTest: testResultSchema.nullable(),
  targets: targetsSchema,
  days: z.record(z.string(), dayRecordSchema),
  tests: z.array(testResultSchema),
  allocated: statBlockSchema,
  titles: z.array(z.string()),
  settings: z.object({
    animations: z.boolean(),
    sound: z.boolean(),
    highContrast: z.boolean(),
  }),
});

/** Everything crossing the app boundary is validated — a bad file must not corrupt state. */
export function parseBackup(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'ファイルを読み取れませんでした。JSON形式ではありません。' };
  }

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') || '不明な項目';
    return { ok: false, error: `記録の形式が正しくありません（${where}）。` };
  }

  if (parsed.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'より新しいバージョンの記録です。アプリを更新してから読み込んでください。',
    };
  }

  return { ok: true, backup: parsed.data };
}
