import { DOMS_LABELS, type DomsLevel } from '../domain/quests';

const LEVELS: DomsLevel[] = [0, 1, 2, 3, 4];

type DomsInputProps = {
  value: DomsLevel | null;
  sharpPain: boolean;
  onChange: (level: DomsLevel) => void;
  onSharpPainChange: (value: boolean) => void;
};

export function DomsInput({ value, sharpPain, onChange, onSharpPainChange }: DomsInputProps) {
  return (
    <div className="doms">
      <div className="doms-head">
        <span className="doms-label">筋肉痛の程度</span>
        <span className="doms-current">{value === null ? '未入力' : DOMS_LABELS[value]}</span>
      </div>
      <div className="doms-scale">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={`doms-btn mono${value === level ? ' selected' : ''}`}
            aria-label={`${level} ${DOMS_LABELS[level]}`}
            aria-pressed={value === level}
            onClick={() => onChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
      <label className="sharp-pain">
        <input
          type="checkbox"
          checked={sharpPain}
          onChange={(e) => onSharpPainChange(e.target.checked)}
        />
        <span>骨に沿う痛み／片側だけの鋭い痛みがある</span>
      </label>
    </div>
  );
}
