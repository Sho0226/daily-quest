import { dayKey } from '../domain/date';
import { computeFatigue, fatigueZone, ZONE_LABELS } from '../domain/fatigue';
import { isRunUnlocked } from '../domain/progression';
import {
  computeBaseStats,
  levelFromExp,
  spentPoints,
  STAT_DEFS,
  totalExp,
  totalStats,
} from '../domain/stats';
import { TITLE_DEFS } from '../domain/titles';
import { useDailyQuestStore } from '../store/useDailyQuestStore';

const JOB = '無職';

export function StatusWindow() {
  const dayBoundaryHour = useDailyQuestStore((s) => s.dayBoundaryHour);
  const days = useDailyQuestStore((s) => s.days);
  const targets = useDailyQuestStore((s) => s.targets);
  const week = useDailyQuestStore((s) => s.week);
  const tests = useDailyQuestStore((s) => s.tests);
  const allocated = useDailyQuestStore((s) => s.allocated);
  const titles = useDailyQuestStore((s) => s.titles);
  const allocatePoint = useDailyQuestStore((s) => s.allocatePoint);

  const todayKey = dayKey(new Date(), dayBoundaryHour);
  const runUnlocked = isRunUnlocked(week);
  const latestTest = tests.at(-1) ?? null;

  const exp = totalExp({
    days,
    targets,
    runUnlocked,
    testDates: tests.map((t) => t.date),
  });
  const level = levelFromExp(exp, spentPoints(allocated));
  const base = computeBaseStats({ days, todayKey, targets, runUnlocked, latestTest });
  const stats = totalStats(base, allocated);

  const fatigue = computeFatigue(days, todayKey);
  const zone = fatigueZone(fatigue);
  const expPct = (level.expIntoLevel / level.expForNext) * 100;

  const earnedNames = TITLE_DEFS.filter((t) => titles.includes(t.id)).map((t) => t.name);
  const lockedTitles = TITLE_DEFS.filter((t) => !titles.includes(t.id));

  return (
    <div className="stage">
      <div className="window">
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <div className="window-head">
          <p className="window-title">ステータス</p>
          <p className="window-sub mono">STATUS</p>
        </div>

        <div className="level-block">
          <div className="level-row">
            <span className="level-label">LEVEL</span>
            <span className="level-value mono">{level.level}</span>
          </div>
          <div className="exp-track">
            <div className="exp-fill" style={{ width: `${expPct}%` }} />
          </div>
          <div className="exp-numbers mono">
            {level.expIntoLevel} / {level.expForNext} EXP
          </div>
        </div>

        <dl className="identity">
          <div className="identity-row">
            <dt>職業</dt>
            <dd>{JOB}</dd>
          </div>
          <div className="identity-row">
            <dt>称号</dt>
            <dd>{earnedNames.length ? earnedNames.join('、') : 'なし'}</dd>
          </div>
          <div className="identity-row">
            <dt>疲労度</dt>
            <dd>
              <span className={`fatigue mono zone-${zone}`}>{fatigue}</span>
              <span className={`fatigue-zone zone-${zone}`}>{ZONE_LABELS[zone]}</span>
            </dd>
          </div>
        </dl>

        <div className="stat-block">
          <div className="stat-head">
            <span className="stat-head-label">能力値</span>
            <span className={`points mono${level.unspentPoints > 0 ? ' available' : ''}`}>
              残ポイント {level.unspentPoints}
            </span>
          </div>

          <div className="stat-list">
            {STAT_DEFS.map((def) => (
              <div key={def.key} className="stat-row">
                <span className="stat-tag mono">{def.tag}</span>
                <span className="stat-name">{def.label}</span>
                <span className="stat-value mono">
                  {stats[def.key]}
                  {allocated[def.key] > 0 && (
                    <span className="stat-bonus">+{allocated[def.key]}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="stat-add"
                  aria-label={`${def.label}にポイントを振る`}
                  disabled={level.unspentPoints === 0}
                  onClick={() => allocatePoint(def.key)}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        {latestTest?.fiveKmMinutes === undefined && (
          <p className="system-note">
            敏捷性は5kmのタイムを計測すると加算されます。
          </p>
        )}

        <section className="title-block">
          <div className="stat-head">
            <span className="stat-head-label">称号</span>
            <span className="points mono">
              {earnedNames.length} / {TITLE_DEFS.length}
            </span>
          </div>
          <ul className="title-list">
            {TITLE_DEFS.filter((t) => titles.includes(t.id)).map((title) => (
              <li key={title.id} className="title-item earned">
                <span className="title-name">{title.name}</span>
                <span className="title-req">{title.requirement}</span>
              </li>
            ))}
            {lockedTitles.map((title) => (
              <li key={title.id} className="title-item">
                <span className="title-name">???</span>
                <span className="title-req">{title.requirement}</span>
              </li>
            ))}
          </ul>
        </section>

        {import.meta.env.DEV && <DevPanel />}
      </div>
    </div>
  );
}

/** Fatigue and ability scores need 28 days of history before they read as anything. */
function DevPanel() {
  const seedDummyHistory = useDailyQuestStore((s) => s.seedDummyHistory);
  const resetAllocation = useDailyQuestStore((s) => s.resetAllocation);
  const reset = useDailyQuestStore((s) => s.reset);

  return (
    <div className="dev-panel">
      <span className="dev-label mono">DEV</span>
      <div className="dev-actions">
        <button type="button" className="dev-btn" onClick={() => seedDummyHistory(30)}>
          ダミー履歴を30日生成
        </button>
        <button type="button" className="dev-btn" onClick={resetAllocation}>
          振り分けをリセット
        </button>
        <button
          type="button"
          className="dev-btn danger"
          onClick={() => {
            if (confirm('全データを削除して初期測定からやり直します。よろしいですか？')) reset();
          }}
        >
          全データ削除
        </button>
      </div>
    </div>
  );
}
