import { useState } from 'react';
import { useDailyQuestStore } from '../store/useDailyQuestStore';
import { NotificationWindow } from './NotificationWindow';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const BOUNDARY_HOURS = [0, 2, 3, 4, 5, 6];

export function SettingsWindow() {
  const settings = useDailyQuestStore((s) => s.settings);
  const dayBoundaryHour = useDailyQuestStore((s) => s.dayBoundaryHour);
  const testDayOfWeek = useDailyQuestStore((s) => s.testDayOfWeek);
  const updateSettings = useDailyQuestStore((s) => s.updateSettings);
  const setDayBoundaryHour = useDailyQuestStore((s) => s.setDayBoundaryHour);
  const setTestDayOfWeek = useDailyQuestStore((s) => s.setTestDayOfWeek);
  const reset = useDailyQuestStore((s) => s.reset);

  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="stage">
      <div className="window">
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <div className="window-head">
          <p className="window-title">設定</p>
          <p className="window-sub mono">SETTINGS</p>
        </div>

        <section className="setting-group">
          <h2 className="setting-heading">1日の区切り</h2>
          <p className="setting-note">
            深夜に実施しても、この時刻より前なら前日の記録として扱います。
          </p>
          <div className="chip-row">
            {BOUNDARY_HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                className={`chip mono${dayBoundaryHour === hour ? ' selected' : ''}`}
                onClick={() => setDayBoundaryHour(hour)}
              >
                {String(hour).padStart(2, '0')}:00
              </button>
            ))}
          </div>
        </section>

        <section className="setting-group">
          <h2 className="setting-heading">テスト曜日</h2>
          <p className="setting-note">この曜日に測定と目標の見直しを行います。</p>
          <div className="chip-row">
            {WEEKDAYS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`chip${testDayOfWeek === index ? ' selected' : ''}`}
                onClick={() => setTestDayOfWeek(index)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="setting-group">
          <h2 className="setting-heading">表示と音</h2>
          <div className="toggle-list">
            <Toggle
              label="演出"
              detail="システムウィンドウの起動アニメーション"
              checked={settings.animations}
              onChange={(v) => updateSettings({ animations: v })}
            />
            <Toggle
              label="通知音"
              detail="システムウィンドウを開いたときの音"
              checked={settings.sound}
              onChange={(v) => updateSettings({ sound: v })}
            />
            <Toggle
              label="高コントラスト"
              detail="屋外の直射日光下での視認性を上げます"
              checked={settings.highContrast}
              onChange={(v) => updateSettings({ highContrast: v })}
            />
          </div>
        </section>

        <section className="setting-group">
          <h2 className="setting-heading">データ</h2>
          <button
            type="button"
            className="btn full danger-btn"
            onClick={() => setConfirmingReset(true)}
          >
            全データを削除
          </button>
        </section>
      </div>

      {confirmingReset && (
        <NotificationWindow
          notification={{
            kind: 'confirm',
            tone: 'caution',
            title: '全データを削除します',
            body: '記録、レベル、目標の全てが失われます。この操作は取り消せません。よろしいですか？',
            confirmLabel: '削除する',
          }}
          onConfirm={() => {
            reset();
            setConfirmingReset(false);
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}

function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        <span className="toggle-detail">{detail}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-switch" aria-hidden="true" />
    </label>
  );
}
