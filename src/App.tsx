import { useState } from 'react';
import { useDailyQuestStore } from './store/useDailyQuestStore';
import { InitialTest } from './ui/InitialTest';
import { QuestWindow } from './ui/QuestWindow';
import { StatusWindow } from './ui/StatusWindow';
import { TabBar, type TabKey } from './ui/TabBar';

function App() {
  const initialTest = useDailyQuestStore((s) => s.initialTest);
  const [tab, setTab] = useState<TabKey>('quest');

  if (!initialTest) return <InitialTest />;

  return (
    <div className="app">
      <main className="app-main">{tab === 'quest' ? <QuestWindow /> : <StatusWindow />}</main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
