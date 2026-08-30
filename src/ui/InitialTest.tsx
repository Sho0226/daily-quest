import { useState } from 'react';
import { initialTargetFor } from '../domain/progression';
import { useDailyQuestStore } from '../store/useDailyQuestStore';

const FIELDS = [
  { key: 'maxPushups', tag: 'PUSH', label: '腕立て伏せ' },
  { key: 'maxSitups', tag: 'SIT', label: '腹筋' },
  { key: 'maxSquats', tag: 'SQUAT', label: 'スクワット' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export function InitialTest() {
  const completeInitialTest = useDailyQuestStore((s) => s.completeInitialTest);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    maxPushups: '',
    maxSitups: '',
    maxSquats: '',
  });

  const parsed = {
    maxPushups: parseInt(values.maxPushups, 10),
    maxSitups: parseInt(values.maxSitups, 10),
    maxSquats: parseInt(values.maxSquats, 10),
  };
  const complete = FIELDS.every((f) => Number.isFinite(parsed[f.key]) && parsed[f.key] >= 0);

  return (
    <div className="stage">
      <div className="window">
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <div className="window-head">
          <p className="window-title">初期測定</p>
          <p className="window-sub mono">CALIBRATION</p>
        </div>

        <p className="system-message">
          システムがあなたの現在値を測定します。各種目を限界まで連続で行い、その回数を入力してください。
          初期の目標はこの60%に設定されます。
        </p>

        <div className="test-fields">
          {FIELDS.map((field) => {
            const value = parsed[field.key];
            const preview = Number.isFinite(value) && value >= 0 ? initialTargetFor(value) : null;
            return (
              <label key={field.key} className="test-field">
                <span className="test-field-name">
                  <span className="quest-tag">{field.tag}</span>
                  <span className="quest-jp">{field.label}</span>
                </span>
                <span className="test-field-entry">
                  <input
                    className="test-input mono"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="0"
                    value={values[field.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                  <span className="test-unit">回</span>
                </span>
                <span className="test-preview mono">{preview === null ? '—' : `目標 ${preview}回`}</span>
              </label>
            );
          })}
        </div>

        <p className="system-note">
          ランニングは第2週から解放されます。今は測定不要です。
        </p>

        <div className="window-foot">
          <button
            type="button"
            className="btn achieve full"
            disabled={!complete}
            onClick={() =>
              completeInitialTest({
                maxPushups: parsed.maxPushups,
                maxSitups: parsed.maxSitups,
                maxSquats: parsed.maxSquats,
              })
            }
          >
            測定を完了する
          </button>
        </div>
      </div>
    </div>
  );
}
