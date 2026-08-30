import { useEffect, useState } from 'react';
import { dayKey, formatCountdown, nextBoundary } from '../domain/date';
import { isDayCleared, QUEST_DEFS, emptyDayRecord } from '../domain/quests';
import { computeStreak } from '../domain/streak';
import { useDailyQuestStore } from '../store/useDailyQuestStore';
import { QuestRow } from './QuestRow';

export function QuestWindow() {
  const dayBoundaryHour = useDailyQuestStore((s) => s.dayBoundaryHour);
  const targets = useDailyQuestStore((s) => s.targets);
  const days = useDailyQuestStore((s) => s.days);
  const undoStack = useDailyQuestStore((s) => s.undoStack);
  const increment = useDailyQuestStore((s) => s.increment);
  const achieve = useDailyQuestStore((s) => s.achieve);
  const setValue = useDailyQuestStore((s) => s.setValue);
  const undo = useDailyQuestStore((s) => s.undo);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayKey = dayKey(now, dayBoundaryHour);
  const today = days[todayKey] ?? emptyDayRecord();
  const streak = computeStreak(days, todayKey);
  const allCleared = isDayCleared(today, targets);
  const remainingMs = nextBoundary(now, dayBoundaryHour).getTime() - now.getTime();

  return (
    <div className="stage">
      <div className="window">
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <div className="window-head">
          <p className="window-title">デイリークエスト</p>
          <p className="window-sub mono">DAILY QUEST — {todayKey}</p>
        </div>

        <div className="status-strip">
          <div className="status-cell active">
            <div className="status-label">残り時間</div>
            <div className="status-value mono">{formatCountdown(remainingMs)}</div>
          </div>
          <div className="status-cell">
            <div className="status-label">連続記録</div>
            <div className="status-value streak mono">
              {streak} <span style={{ fontSize: 12 }}>日</span>
            </div>
          </div>
        </div>

        <div className="quest-list">
          {QUEST_DEFS.map((def) => (
            <QuestRow
              key={def.key}
              def={def}
              value={today[def.key]}
              target={targets[def.key]}
              onIncrement={(amount) => increment(def.key, amount)}
              onAchieve={() => achieve(def.key)}
              onSetValue={(value) => setValue(def.key, value)}
            />
          ))}
        </div>

        <div className="window-foot">
          <div className={`banner-all-clear${allCleared ? ' show' : ''}`}>
            全てのデイリークエストをクリアしました
          </div>
          <div className="undo-row">
            <button type="button" className="undo-btn" disabled={undoStack.length === 0} onClick={undo}>
              元に戻す (UNDO)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
