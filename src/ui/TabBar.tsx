export type TabKey = 'quest' | 'status';

const TABS: readonly { key: TabKey; label: string; tag: string }[] = [
  { key: 'quest', label: 'クエスト', tag: 'QUEST' },
  { key: 'status', label: 'ステータス', tag: 'STATUS' },
];

type TabBarProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tab${active === tab.key ? ' active' : ''}`}
          aria-current={active === tab.key ? 'page' : undefined}
          onClick={() => onChange(tab.key)}
        >
          <span className="tab-tag mono">{tab.tag}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
