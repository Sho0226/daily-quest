import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayKey, dayOfWeek, daysBetween, recentDayKeys } from '../domain/date';
import { computeFatigue } from '../domain/fatigue';
import { shouldSwapForRecovery } from '../domain/guard';
import {
  evaluateProgression,
  initialTargets,
  isRunUnlocked,
  targetsForWeek,
  type SkipReason,
  type TestResult,
} from '../domain/progression';
import {
  clampValue,
  emptyDayRecord,
  QUEST_DEFS,
  type DayRecord,
  type DomsLevel,
  type QuestKey,
  type Targets,
} from '../domain/quests';
import {
  detectLevelUp,
  emptyStatBlock,
  levelFromExp,
  spentPoints,
  totalExp,
  type StatBlock,
  type StatKey,
} from '../domain/stats';
import { BACKUP_SCHEMA_VERSION, type Backup } from '../domain/backup';
import { buildTitleContext, earnedTitles } from '../domain/titles';
import { isAtHardCap } from '../domain/progression';
import { DEFAULT_SETTINGS, type Settings } from './settings';

const STORAGE_KEY = 'daily-quest-v1';
const SCHEMA_VERSION = 7;

type UndoEntry = {
  dayKey: string;
  questKey: QuestKey;
  prevValue: number;
};

/** A target bump waiting on the user's confirmation in the notification window. */
export type PendingProgression = {
  week: number;
  targets: Targets;
};

/** A recovery swap the system has made and is announcing. */
export type PendingRecoveryNotice = {
  dayKey: string;
};

export type PendingLevelUp = {
  from: number;
  to: number;
  gainedPoints: number;
};

type PersistedState = {
  schemaVersion: number;
  /** Shown at the top of the status window, as in the source material. */
  name: string;
  startedAt: string | null;
  dayBoundaryHour: number;
  testDayOfWeek: number;
  /** Tutorial week, 1-indexed. Only advances on a test day that passes the guards. */
  week: number;
  initialTest: TestResult | null;
  targets: Targets;
  days: Record<string, DayRecord>;
  /** Every weekly test, newest last. The initial test is the first entry. */
  tests: TestResult[];
  /** Manually assigned stat points, on top of the derived values. */
  allocated: StatBlock;
  titles: string[];
  settings: Settings;
  /** Days spent at the 50/50/50 · 5km cap, counted toward the final-goal unlock. */
  daysAtHardCap: number;
  lastHardCapKey: string | null;
  lastExportAt: string | null;
  /**
   * Highest level already shown to the user. null means never initialised, which
   * suppresses a spurious announcement on first run and after a migration.
   */
  acknowledgedLevel: number | null;
  /** Day key of the last progression evaluation, so it runs once per test day. */
  lastProgressionKey: string | null;
  lastSkipReason: SkipReason;
};

type DailyQuestStore = PersistedState & {
  undoStack: UndoEntry[];
  pendingProgression: PendingProgression | null;
  pendingRecoveryNotice: PendingRecoveryNotice | null;
  pendingLevelUp: PendingLevelUp | null;
  completeInitialTest: (name: string, test: Omit<TestResult, 'date'>) => void;
  setName: (name: string) => void;
  recordTest: (test: Omit<TestResult, 'date'>) => void;
  increment: (questKey: QuestKey, amount: number) => void;
  achieve: (questKey: QuestKey) => void;
  setValue: (questKey: QuestKey, value: number) => void;
  setDoms: (level: DomsLevel) => void;
  setSharpPain: (value: boolean) => void;
  completeRecovery: () => void;
  runProgressionCheck: () => void;
  acceptProgression: () => void;
  declineProgression: () => void;
  dismissRecoveryNotice: () => void;
  syncLevel: () => void;
  dismissLevelUp: () => void;
  allocatePoint: (stat: StatKey) => void;
  resetAllocation: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setDayBoundaryHour: (hour: number) => void;
  setTestDayOfWeek: (day: number) => void;
  syncTitles: () => void;
  exportBackup: () => Backup;
  importBackup: (backup: Backup) => void;
  undo: () => void;
  reset: () => void;
  /** Dev only: fatigue and ability scores need 28 days before they mean anything. */
  seedDummyHistory: (days: number) => void;
};

const INITIAL_TARGETS: Targets = { pushups: 0, situps: 0, squats: 0, run: 0 };

function questDef(key: QuestKey) {
  const def = QUEST_DEFS.find((q) => q.key === key);
  if (!def) throw new Error(`unknown quest key: ${key}`);
  return def;
}

function todayKeyOf(state: Pick<DailyQuestStore, 'dayBoundaryHour'>): string {
  return dayKey(new Date(), state.dayBoundaryHour);
}

function recordFor(state: Pick<DailyQuestStore, 'days'>, key: string): DayRecord {
  return state.days[key] ?? emptyDayRecord();
}

function applyValue(
  state: Pick<DailyQuestStore, 'days' | 'targets' | 'dayBoundaryHour' | 'undoStack'>,
  questKey: QuestKey,
  nextValue: number,
): Pick<DailyQuestStore, 'days' | 'undoStack'> {
  const key = todayKeyOf(state);
  const def = questDef(questKey);
  const record = recordFor(state, key);
  const prevValue = record[questKey];
  const clamped = clampValue(nextValue, state.targets[questKey], def.decimals);

  if (clamped === prevValue) {
    return { days: state.days, undoStack: state.undoStack };
  }

  const nextUndoStack = [...state.undoStack, { dayKey: key, questKey, prevValue }].slice(-10);

  return {
    days: { ...state.days, [key]: { ...record, [questKey]: clamped } },
    undoStack: nextUndoStack,
  };
}

const initialState: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  name: '',
  startedAt: null,
  dayBoundaryHour: 4,
  testDayOfWeek: 0,
  week: 1,
  initialTest: null,
  targets: INITIAL_TARGETS,
  days: {},
  tests: [],
  allocated: emptyStatBlock(),
  titles: [],
  settings: DEFAULT_SETTINGS,
  daysAtHardCap: 0,
  lastHardCapKey: null,
  lastExportAt: null,
  acknowledgedLevel: null,
  lastProgressionKey: null,
  lastSkipReason: null,
};

export const useDailyQuestStore = create<DailyQuestStore>()(
  persist(
    (set) => ({
      ...initialState,
      undoStack: [],
      pendingProgression: null,
      pendingRecoveryNotice: null,
      pendingLevelUp: null,

      completeInitialTest: (name, test) =>
        set((state) => {
          const key = todayKeyOf(state);
          const result: TestResult = { date: key, ...test };
          return {
            name: name.trim(),
            startedAt: key,
            initialTest: result,
            tests: [result],
            week: 1,
            targets: initialTargets(result),
            lastProgressionKey: key,
            lastSkipReason: null,
          };
        }),

      recordTest: (test) =>
        set((state) => {
          const key = todayKeyOf(state);
          const result: TestResult = { date: key, ...test };
          // One test per day: re-measuring replaces the day's entry.
          const tests = [...state.tests.filter((t) => t.date !== key), result];
          return { tests };
        }),

      increment: (questKey, amount) =>
        set((state) => {
          const key = todayKeyOf(state);
          const current = state.days[key]?.[questKey] ?? 0;
          return applyValue(state, questKey, current + amount);
        }),

      achieve: (questKey) =>
        set((state) => {
          const key = todayKeyOf(state);
          const current = state.days[key]?.[questKey] ?? 0;
          return applyValue(state, questKey, Math.max(current, state.targets[questKey]));
        }),

      setValue: (questKey, value) => set((state) => applyValue(state, questKey, value)),

      setDoms: (level) =>
        set((state) => {
          const key = todayKeyOf(state);
          const record = recordFor(state, key);
          // The system swaps the day out itself; the user never presses a "rest" button.
          const swapping = !record.recovery && shouldSwapForRecovery(level);
          const recovery = record.recovery || swapping;
          return {
            days: { ...state.days, [key]: { ...record, doms: level, recovery } },
            // Announced, not asked — declining would mean training through it.
            pendingRecoveryNotice: swapping ? { dayKey: key } : state.pendingRecoveryNotice,
          };
        }),

      setSharpPain: (value) =>
        set((state) => {
          const key = todayKeyOf(state);
          const record = recordFor(state, key);
          return { days: { ...state.days, [key]: { ...record, sharpPain: value } } };
        }),

      completeRecovery: () =>
        set((state) => {
          const key = todayKeyOf(state);
          const record = recordFor(state, key);
          return { days: { ...state.days, [key]: { ...record, recoveryDone: true } } };
        }),

      runProgressionCheck: () =>
        set((state) => {
          if (!state.initialTest) return state;

          const key = todayKeyOf(state);
          if (state.lastProgressionKey === key) return state;
          if (dayOfWeek(key) !== state.testDayOfWeek) return state;
          // Don't evaluate before a full week has passed since the initial test.
          if (state.startedAt && daysBetween(state.startedAt, key) < 7) return state;

          const fatigue = computeFatigue(state.days, key);
          const decision = evaluateProgression({ days: state.days, todayKey: key, fatigue });

          if (!decision.advance) {
            return { lastProgressionKey: key, lastSkipReason: decision.reason };
          }

          // Queued rather than applied: the notification window asks first.
          const nextWeek = state.week + 1;
          return {
            pendingProgression: {
              week: nextWeek,
              targets: targetsForWeek(state.initialTest, nextWeek),
            },
            lastProgressionKey: key,
            lastSkipReason: null,
          };
        }),

      acceptProgression: () =>
        set((state) => {
          const pending = state.pendingProgression;
          if (!pending) return state;
          return {
            week: pending.week,
            targets: pending.targets,
            pendingProgression: null,
          };
        }),

      declineProgression: () => set({ pendingProgression: null }),

      dismissRecoveryNotice: () => set({ pendingRecoveryNotice: null }),

      /** Level is derived from experience, so a level-up is detected rather than fired. */
      syncLevel: () =>
        set((state) => {
          if (!state.initialTest) return state;

          const exp = totalExp({
            days: state.days,
            targets: state.targets,
            runUnlocked: isRunUnlocked(state.week),
            testDates: state.tests.map((t) => t.date),
          });
          const { level } = levelFromExp(exp, spentPoints(state.allocated));
          const { event, adopt } = detectLevelUp(state.acknowledgedLevel, level);

          if (adopt !== null) return { acknowledgedLevel: adopt };
          if (!event) return state;
          return { pendingLevelUp: event };
        }),

      dismissLevelUp: () =>
        set((state) =>
          state.pendingLevelUp
            ? { acknowledgedLevel: state.pendingLevelUp.to, pendingLevelUp: null }
            : state,
        ),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      setName: (name) => set({ name: name.trim() }),

      setDayBoundaryHour: (hour) => set({ dayBoundaryHour: hour }),

      setTestDayOfWeek: (day) => set({ testDayOfWeek: day }),

      /** Titles are derived, but persisted so an earned one is never taken back. */
      syncTitles: () =>
        set((state) => {
          const key = todayKeyOf(state);
          const runUnlocked = isRunUnlocked(state.week);

          // Count one day per calendar day spent at the hard cap.
          const atCap = isAtHardCap(state.targets);
          const countedToday = state.lastHardCapKey === key;
          const daysAtHardCap =
            atCap && !countedToday ? state.daysAtHardCap + 1 : state.daysAtHardCap;
          const lastHardCapKey = atCap ? key : state.lastHardCapKey;

          const context = buildTitleContext({
            days: state.days,
            todayKey: key,
            targets: state.targets,
            runUnlocked,
            daysAtHardCap,
          });
          const earned = earnedTitles(context).map((t) => t.id);
          const titles = [...new Set([...state.titles, ...earned])];

          return { titles, daysAtHardCap, lastHardCapKey };
        }),

      exportBackup: () => {
        const state = useDailyQuestStore.getState();
        const exportedAt = new Date().toISOString();
        const backup: Backup = {
          schemaVersion: BACKUP_SCHEMA_VERSION,
          exportedAt,
          name: state.name,
          startedAt: state.startedAt,
          dayBoundaryHour: state.dayBoundaryHour,
          testDayOfWeek: state.testDayOfWeek,
          week: state.week,
          initialTest: state.initialTest,
          targets: state.targets,
          days: state.days,
          tests: state.tests,
          allocated: state.allocated,
          titles: state.titles,
          settings: state.settings,
        };
        set({ lastExportAt: exportedAt });
        return backup;
      },

      importBackup: (backup) =>
        set(() => ({
          name: backup.name ?? '',
          startedAt: backup.startedAt,
          dayBoundaryHour: backup.dayBoundaryHour,
          testDayOfWeek: backup.testDayOfWeek,
          week: backup.week,
          initialTest: backup.initialTest,
          targets: backup.targets,
          days: backup.days,
          tests: backup.tests,
          allocated: backup.allocated,
          titles: backup.titles,
          settings: backup.settings,
          undoStack: [],
          pendingProgression: null,
          pendingRecoveryNotice: null,
          pendingLevelUp: null,
          acknowledgedLevel: null,
        })),

      allocatePoint: (stat) =>
        set((state) => ({
          allocated: { ...state.allocated, [stat]: state.allocated[stat] + 1 },
        })),

      resetAllocation: () => set({ allocated: emptyStatBlock() }),

      undo: () =>
        set((state) => {
          const last = state.undoStack.at(-1);
          if (!last) return state;
          const record = recordFor(state, last.dayKey);
          return {
            days: { ...state.days, [last.dayKey]: { ...record, [last.questKey]: last.prevValue } },
            undoStack: state.undoStack.slice(0, -1),
          };
        }),

      reset: () =>
        set({
          ...initialState,
          undoStack: [],
          pendingProgression: null,
          pendingRecoveryNotice: null,
          pendingLevelUp: null,
        }),

      seedDummyHistory: (count) =>
        set((state) => {
          const key = todayKeyOf(state);
          const days = { ...state.days };
          // Skip today so the current day stays yours to log.
          for (const dk of recentDayKeys(key, count + 1).slice(0, -1)) {
            if (days[dk]) continue;
            const missed = Math.random() < 0.15;
            if (missed) continue;
            const sore = Math.random() < 0.1;
            days[dk] = {
              ...emptyDayRecord(),
              pushups: Math.round(state.targets.pushups * (0.7 + Math.random() * 0.5)),
              situps: Math.round(state.targets.situps * (0.7 + Math.random() * 0.5)),
              squats: Math.round(state.targets.squats * (0.7 + Math.random() * 0.5)),
              run: Math.round(state.targets.run * Math.random() * 10) / 10,
              doms: (sore ? 3 : Math.floor(Math.random() * 3)) as DomsLevel,
              recovery: sore,
              recoveryDone: sore,
            };
          }
          return { days };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (state): PersistedState => ({
        schemaVersion: state.schemaVersion,
        name: state.name,
        startedAt: state.startedAt,
        dayBoundaryHour: state.dayBoundaryHour,
        testDayOfWeek: state.testDayOfWeek,
        week: state.week,
        initialTest: state.initialTest,
        targets: state.targets,
        days: state.days,
        tests: state.tests,
        allocated: state.allocated,
        titles: state.titles,
        settings: state.settings,
        daysAtHardCap: state.daysAtHardCap,
        lastHardCapKey: state.lastHardCapKey,
        lastExportAt: state.lastExportAt,
        acknowledgedLevel: state.acknowledgedLevel,
        lastProgressionKey: state.lastProgressionKey,
        lastSkipReason: state.lastSkipReason,
      }),
      migrate: (persisted, version) => {
        // v1 stored only quest counts per day and had no tutorial state.
        if (version < 2) {
          const old = persisted as Partial<PersistedState> & {
            days?: Record<string, Partial<DayRecord>>;
          };
          const days: Record<string, DayRecord> = {};
          for (const [key, record] of Object.entries(old.days ?? {})) {
            days[key] = { ...emptyDayRecord(), ...record };
          }
          return { ...initialState, days };
        }
        // v2 had no stat allocation or test history.
        if (version < 3) {
          const old = persisted as PersistedState;
          return {
            ...initialState,
            ...old,
            tests: old.initialTest ? [old.initialTest] : [],
            allocated: emptyStatBlock(),
            titles: [],
          };
        }
        // v3 had no settings block.
        if (version < 4) {
          const old = persisted as PersistedState;
          return { ...initialState, ...old, settings: initialState.settings };
        }
        // v6 tracked no acknowledged level; null makes syncLevel adopt it silently.
        if (version < 7) {
          const old = persisted as PersistedState;
          return { ...initialState, ...old, acknowledgedLevel: null };
        }
        // v5 had no name.
        if (version < 6) {
          const old = persisted as PersistedState;
          return { ...initialState, ...old, name: old.name ?? '' };
        }
        // v4 had no titles tracking or export timestamp.
        if (version < 5) {
          const old = persisted as PersistedState;
          return {
            ...initialState,
            ...old,
            daysAtHardCap: 0,
            lastHardCapKey: null,
            lastExportAt: null,
          };
        }
        return persisted as PersistedState;
      },
    },
  ),
);

export function selectRunUnlocked(state: DailyQuestStore): boolean {
  return isRunUnlocked(state.week);
}
