import { useDailyQuestStore } from './store/useDailyQuestStore';
import { InitialTest } from './ui/InitialTest';
import { QuestWindow } from './ui/QuestWindow';

function App() {
  const initialTest = useDailyQuestStore((s) => s.initialTest);
  return initialTest ? <QuestWindow /> : <InitialTest />;
}

export default App;
