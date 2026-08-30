import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayKey } from '../domain/date';
import {
  clampValue,
  emptyDayRecord,
  QUEST_DEFS,
  type DayRecord,
  type QuestKey,
} from '../domain/quests';

const STORAGE_KEY = 'daily-quest-v1';
const SCHEMA_VERSION = 1;

const DEFAULT_TARGETS: Record<QuestKey, number> = {
  pushups: 20,
  situps: 20,
  squats: 20,
  run: 3,
};

type UndoEntry = {
  dayKey: string;
  questKey: QuestKey;
  prevValue: number;
};

type PersistedState = {
  schemaVersion: number;
  dayBoundaryHour: number;
  targets: Record<QuestKey, number>;
  days: Record<string, DayRecord>;
};

type DailyQuestStore = PersistedState & {
  undoStack: UndoEntry[];
  increment: (questKey: QuestKey, amount: number) => void;
  achieve: (questKey: QuestKey) => void;
  setValue: (questKey: QuestKey, value: number) => void;
  undo: () => void;
};

function questDef(key: QuestKey) {
  const def = QUEST_DEFS.find((q) => q.key === key);
  if (!def) throw new Error(`unknown quest key: ${key}`);
  return def;
}

function applyValue(
  state: Pick<DailyQuestStore, 'days' | 'targets' | 'dayBoundaryHour' | 'undoStack'>,
  questKey: QuestKey,
  nextValue: number,
): Pick<DailyQuestStore, 'days' | 'undoStack'> {
  const key = dayKey(new Date(), state.dayBoundaryHour);
  const def = questDef(questKey);
  const record = state.days[key] ?? emptyDayRecord();
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

export const useDailyQuestStore = create<DailyQuestStore>()(
  persist(
    (set) => ({
      schemaVersion: SCHEMA_VERSION,
      dayBoundaryHour: 4,
      targets: DEFAULT_TARGETS,
      days: {},
      undoStack: [],

      increment: (questKey, amount) =>
        set((state) => {
          const key = dayKey(new Date(), state.dayBoundaryHour);
          const current = state.days[key]?.[questKey] ?? 0;
          return applyValue(state, questKey, current + amount);
        }),

      achieve: (questKey) =>
        set((state) => {
          const key = dayKey(new Date(), state.dayBoundaryHour);
          const current = state.days[key]?.[questKey] ?? 0;
          return applyValue(state, questKey, Math.max(current, state.targets[questKey]));
        }),

      setValue: (questKey, value) => set((state) => applyValue(state, questKey, value)),

      undo: () =>
        set((state) => {
          const last = state.undoStack.at(-1);
          if (!last) return state;
          const record = state.days[last.dayKey] ?? emptyDayRecord();
          return {
            days: { ...state.days, [last.dayKey]: { ...record, [last.questKey]: last.prevValue } },
            undoStack: state.undoStack.slice(0, -1),
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedState => ({
        schemaVersion: state.schemaVersion,
        dayBoundaryHour: state.dayBoundaryHour,
        targets: state.targets,
        days: state.days,
      }),
    },
  ),
);
