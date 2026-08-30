import { useEffect, useState } from 'react';
import { dayKey, formatCountdown, nextBoundary } from '../domain/date';
import { medicalFlag } from '../domain/guard';
import { isRunUnlocked, SKIP_MESSAGES } from '../domain/progression';
import { emptyDayRecord, isDayCleared, QUEST_DEFS } from '../domain/quests';
import { computeStreak } from '../domain/streak';
import { useDailyQuestStore } from '../store/useDailyQuestStore';
import { DomsInput } from './DomsInput';
import { QuestRow } from './QuestRow';
import { RecoveryQuest } from './RecoveryQuest';

export function QuestWindow() {
  const dayBoundaryHour = useDailyQuestStore((s) => s.dayBoundaryHour);
  const targets = useDailyQuestStore((s) => s.targets);
  const days = useDailyQuestStore((s) => s.days);
  const week = useDailyQuestStore((s) => s.week);
  const undoStack = useDailyQuestStore((s) => s.undoStack);
  const lastSkipReason = useDailyQuestStore((s) => s.lastSkipReason);
  const increment = useDailyQuestStore((s) => s.increment);
  const achieve = useDailyQuestStore((s) => s.achieve);
  const setValue = useDailyQuestStore((s) => s.setValue);
  const setDoms = useDailyQuestStore((s) => s.setDoms);
  const setSharpPain = useDailyQuestStore((s) => s.setSharpPain);
  const completeRecovery = useDailyQuestStore((s) => s.completeRecovery);
  const runProgressionCheck = useDailyQuestStore((s) => s.runProgressionCheck);
  const undo = useDailyQuestStore((s) => s.undo);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayKey = dayKey(now, dayBoundaryHour);

  // Re-checked whenever the day rolls over, so the weekly bump lands without a reload.
  useEffect(() => {
    runProgressionCheck();
  }, [todayKey, runProgressionCheck]);

  const today = days[todayKey] ?? emptyDayRecord();
  const runUnlocked = isRunUnlocked(week);
  const streak = computeStreak(days, todayKey);
  const allCleared = isDayCleared(today, targets, runUnlocked);
  const remainingMs = nextBoundary(now, dayBoundaryHour).getTime() - now.getTime();
  const medical = medicalFlag(days, todayKey);

  return (
    <div className="stage">
      <div className="window">
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <div className="window-head">
          <p className="window-title">デイリークエスト</p>
          <p className="window-sub mono">
            DAILY QUEST — {todayKey} · WEEK {week}
          </p>
        </div>

        {medical.advise && (
          <div className="banner medical">
            {medical.reason === 'sharpPain'
              ? '鋭い痛みが報告されています。トレーニングを中止し、医療機関の受診を検討してください。'
              : '強い筋肉痛が3日以上続いています。トレーニングを中止し、医療機関の受診を検討してください。'}
            <span className="banner-sub">目標の自動更新は停止しています</span>
          </div>
        )}

        {lastSkipReason && !medical.advise && (
          <div className="banner hold">{SKIP_MESSAGES[lastSkipReason]}</div>
        )}

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

        {today.recovery ? (
          <RecoveryQuest done={today.recoveryDone} onComplete={completeRecovery} />
        ) : (
          <div className="quest-list">
            {QUEST_DEFS.map((def) => (
              <QuestRow
                key={def.key}
                def={def}
                value={today[def.key]}
                target={targets[def.key]}
                locked={def.key === 'run' && !runUnlocked}
                onIncrement={(amount) => increment(def.key, amount)}
                onAchieve={() => achieve(def.key)}
                onSetValue={(value) => setValue(def.key, value)}
              />
            ))}
          </div>
        )}

        <DomsInput
          value={today.doms}
          sharpPain={today.sharpPain}
          onChange={setDoms}
          onSharpPainChange={setSharpPain}
        />

        <div className="window-foot">
          <div className={`banner-all-clear${allCleared ? ' show' : ''}`}>
            {today.recovery
              ? '回復クエストを完了しました'
              : '全てのデイリークエストをクリアしました'}
          </div>
          {!today.recovery && (
            <div className="undo-row">
              <button
                type="button"
                className="undo-btn"
                disabled={undoStack.length === 0}
                onClick={undo}
              >
                元に戻す (UNDO)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
