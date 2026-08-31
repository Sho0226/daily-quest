import { useEffect, useState } from 'react';
import { QUEST_DEFS } from './domain/quests';
import { useDailyQuestStore } from './store/useDailyQuestStore';
import { HistoryWindow } from './ui/HistoryWindow';
import { InitialTest } from './ui/InitialTest';
import { NotificationWindow } from './ui/NotificationWindow';
import { QuestWindow } from './ui/QuestWindow';
import { SettingsWindow } from './ui/SettingsWindow';
import { StatusWindow } from './ui/StatusWindow';
import { TabBar, type TabKey } from './ui/TabBar';

function App() {
  const initialTest = useDailyQuestStore((s) => s.initialTest);
  const highContrast = useDailyQuestStore((s) => s.settings.highContrast);
  const days = useDailyQuestStore((s) => s.days);
  const syncTitles = useDailyQuestStore((s) => s.syncTitles);
  const syncLevel = useDailyQuestStore((s) => s.syncLevel);
  const [tab, setTab] = useState<TabKey>('quest');

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal';
  }, [highContrast]);

  // Titles and level are derived from history, so re-check whenever a record changes.
  useEffect(() => {
    if (!initialTest) return;
    syncTitles();
    syncLevel();
  }, [days, initialTest, syncTitles, syncLevel]);

  if (!initialTest) return <InitialTest />;

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'quest' && <QuestWindow />}
        {tab === 'status' && <StatusWindow />}
        {tab === 'history' && <HistoryWindow />}
        {tab === 'settings' && <SettingsWindow />}
      </main>
      <TabBar active={tab} onChange={setTab} />
      <SystemNotifications />
    </div>
  );
}

/** The system's own announcements: a target update to confirm, or a recovery swap to report. */
function SystemNotifications() {
  const pendingProgression = useDailyQuestStore((s) => s.pendingProgression);
  const pendingRecoveryNotice = useDailyQuestStore((s) => s.pendingRecoveryNotice);
  const pendingLevelUp = useDailyQuestStore((s) => s.pendingLevelUp);
  const acceptProgression = useDailyQuestStore((s) => s.acceptProgression);
  const declineProgression = useDailyQuestStore((s) => s.declineProgression);
  const dismissRecoveryNotice = useDailyQuestStore((s) => s.dismissRecoveryNotice);
  const dismissLevelUp = useDailyQuestStore((s) => s.dismissLevelUp);

  // Safety first, then the reward, then anything asking for a decision.
  if (pendingRecoveryNotice) {
    return (
      <NotificationWindow
        notification={{
          kind: 'announce',
          title: '回復クエストに差し替えました',
          body: 'システムが本日のクエストを回復クエストに差し替えました。ストレッチと20分の歩行で完了となり、連続記録は維持されます。',
        }}
        onConfirm={dismissRecoveryNotice}
        onCancel={dismissRecoveryNotice}
      />
    );
  }

  if (pendingLevelUp) {
    const levels =
      pendingLevelUp.to - pendingLevelUp.from > 1
        ? `LEVEL ${pendingLevelUp.from} → ${pendingLevelUp.to}`
        : `LEVEL ${pendingLevelUp.to}`;
    return (
      <NotificationWindow
        notification={{
          kind: 'announce',
          tone: 'levelup',
          title: 'レベルが上がりました',
          body: `ステータスポイントを${pendingLevelUp.gainedPoints}獲得しました。ステータス画面から振り分けられます。`,
          detail: levels,
          confirmLabel: '確認',
        }}
        onConfirm={dismissLevelUp}
        onCancel={dismissLevelUp}
      />
    );
  }

  if (pendingProgression) {
    const detail = QUEST_DEFS.map((def) => {
      const value = pendingProgression.targets[def.key];
      if (def.key === 'run' && value === 0) return null;
      return `${def.label} ${def.decimals ? value.toFixed(1) : value}${def.unit}`;
    })
      .filter(Boolean)
      .join(' / ');

    return (
      <NotificationWindow
        notification={{
          kind: 'confirm',
          title: 'デイリークエストが更新されます',
          body: `第${pendingProgression.week}週の目標に更新します。よろしいですか？`,
          detail,
        }}
        onConfirm={acceptProgression}
        onCancel={declineProgression}
      />
    );
  }

  return null;
}

export default App;
