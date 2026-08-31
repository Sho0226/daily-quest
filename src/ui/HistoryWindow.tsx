import { dayKey, recentDayKeys } from '../domain/date';
import { isRunUnlocked } from '../domain/progression';
import { isDayCleared, isDayRecorded, type DayRecord, type Targets } from '../domain/quests';
import { useDailyQuestStore } from '../store/useDailyQuestStore';

type DayState = 'cleared' | 'recovery' | 'recorded' | 'empty';

const STATE_LABELS: Record<DayState, string> = {
  cleared: '達成',
  recovery: '回復クエスト',
  recorded: '記録のみ',
  empty: '未記録',
};

function dayState(
  record: DayRecord | undefined,
  targets: Targets,
  runUnlocked: boolean,
): DayState {
  if (!isDayRecorded(record)) return 'empty';
  if (record!.recovery) return record!.recoveryDone ? 'recovery' : 'recorded';
  return isDayCleared(record, targets, runUnlocked) ? 'cleared' : 'recorded';
}

export function HistoryWindow() {
  const dayBoundaryHour = useDailyQuestStore((s) => s.dayBoundaryHour);
  const days = useDailyQuestStore((s) => s.days);
  const targets = useDailyQuestStore((s) => s.targets);
  const week = useDailyQuestStore((s) => s.week);

  const todayKey = dayKey(new Date(), dayBoundaryHour);
  const runUnlocked = isRunUnlocked(week);
  const recent = recentDayKeys(todayKey, 14);

  const counts = recent.reduce<Record<DayState, number>>(
    (acc, key) => {
      acc[dayState(days[key], targets, runUnlocked)]++;
      return acc;
    },
    { cleared: 0, recovery: 0, recorded: 0, empty: 0 },
  );

  return (
    <div className="stage">
      <div className="window">
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <div className="window-head">
          <p className="window-title">履歴</p>
          <p className="window-sub mono">HISTORY</p>
        </div>

        <section className="setting-group">
          <h2 className="setting-heading">直近14日</h2>
          <div className="history-grid">
            {recent.map((key) => {
              const state = dayState(days[key], targets, runUnlocked);
              return (
                <div
                  key={key}
                  className={`history-cell state-${state}`}
                  title={`${key} — ${STATE_LABELS[state]}`}
                >
                  <span className="history-day mono">{key.slice(8)}</span>
                </div>
              );
            })}
          </div>

          <ul className="history-legend">
            {(Object.keys(STATE_LABELS) as DayState[]).map((state) => (
              <li key={state}>
                <span className={`legend-swatch state-${state}`} />
                <span className="legend-label">{STATE_LABELS[state]}</span>
                <span className="legend-count mono">{counts[state]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="setting-group">
          <h2 className="setting-heading">月別の達成日数</h2>
          <MonthlySummary days={days} targets={targets} runUnlocked={runUnlocked} />
        </section>
      </div>
    </div>
  );
}

function MonthlySummary({
  days,
  targets,
  runUnlocked,
}: {
  days: Record<string, DayRecord>;
  targets: Targets;
  runUnlocked: boolean;
}) {
  const byMonth = new Map<string, { cleared: number; recorded: number }>();

  for (const [key, record] of Object.entries(days)) {
    if (!isDayRecorded(record)) continue;
    const month = key.slice(0, 7);
    const entry = byMonth.get(month) ?? { cleared: 0, recorded: 0 };
    entry.recorded++;
    if (record.recovery ? record.recoveryDone : isDayCleared(record, targets, runUnlocked)) {
      entry.cleared++;
    }
    byMonth.set(month, entry);
  }

  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  if (months.length === 0) {
    return <p className="setting-note">まだ記録がありません。</p>;
  }

  const max = Math.max(...months.map(([, v]) => v.recorded));

  return (
    <div className="month-list">
      {months.map(([month, { cleared, recorded }]) => (
        <div key={month} className="month-row">
          <span className="month-label mono">{month.replace('-', '.')}</span>
          <div className="month-bar-track">
            <div
              className="month-bar-recorded"
              style={{ width: `${(recorded / max) * 100}%` }}
            />
            <div className="month-bar-cleared" style={{ width: `${(cleared / max) * 100}%` }} />
          </div>
          <span className="month-count mono">
            {cleared}
            <span className="month-sep">/</span>
            {recorded}
          </span>
        </div>
      ))}
      <p className="setting-note month-note">達成日数 / 記録日数</p>
    </div>
  );
}
