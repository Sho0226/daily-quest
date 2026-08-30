import { useEffect, useRef, useState } from 'react';
import {
  capFor,
  isQuestCapped,
  isQuestCleared,
  type QuestDef,
} from '../domain/quests';

function fmt(value: number, decimals: 0 | 1): string {
  return decimals ? value.toFixed(decimals) : String(value);
}

type QuestRowProps = {
  def: QuestDef;
  value: number;
  target: number;
  locked?: boolean;
  onIncrement: (amount: number) => void;
  onAchieve: () => void;
  onSetValue: (value: number) => void;
};

export function QuestRow({
  def,
  value,
  target,
  locked = false,
  onIncrement,
  onAchieve,
  onSetValue,
}: QuestRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cleared = isQuestCleared(value, target);
  const capped = isQuestCapped(value, target, def.decimals);
  const cap = capFor(target, def.decimals);
  const pct = Math.min(value / cap, 1) * 100;
  const overTarget = value > target;

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
  }

  function commit() {
    const parsed = parseFloat(draft);
    if (!Number.isNaN(parsed)) {
      onSetValue(parsed);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (locked) {
    return (
      <div className="quest locked">
        <div className="quest-top">
          <div className="quest-name">
            <span className="quest-tag">{def.tag}</span>
            <span className="quest-jp">{def.label}</span>
          </div>
          <div className="quest-locked-mark mono">未解放</div>
        </div>
        <p className="quest-locked-note">第2週から解放されます</p>
      </div>
    );
  }

  return (
    <div className={`quest${cleared ? ' cleared' : ''}`}>
      <div className="quest-top">
        <div className="quest-name">
          <span className="quest-tag">{def.tag}</span>
          <span className="quest-jp">{def.label}</span>
          {cleared && <span className="quest-clear-mark">CLEAR</span>}
        </div>
        <div className="quest-numbers mono">
          {editing ? (
            <input
              ref={inputRef}
              className="cur-input mono"
              type="number"
              inputMode="decimal"
              min={0}
              max={cap}
              step={def.decimals ? 0.1 : 1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  cancel();
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="cur-edit"
              aria-label={`${def.label}の記録を直接入力`}
              onClick={startEdit}
            >
              <span className="cur">{fmt(value, def.decimals)}</span>
            </button>
          )}
          <span className="sep">/</span>
          <span className="tgt">{fmt(target, def.decimals)}</span>
          <span className="unit">{def.unit}</span>
        </div>
      </div>
      <div className="cap-line mono">
        上限 {fmt(cap, def.decimals)}
        {def.unit}
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill${overTarget ? ' over-target' : ''}${capped ? ' capped' : ''}`}
          style={{ width: `${pct}%` }}
        />
        <div className={`bar-tick${cleared ? ' hit' : ''}`} />
      </div>
      <div className="quest-actions">
        <button type="button" className="btn" disabled={capped} onClick={() => onIncrement(def.steps[0])}>
          +{def.steps[0]}
        </button>
        <button type="button" className="btn" disabled={capped} onClick={() => onIncrement(def.steps[1])}>
          +{def.steps[1]}
        </button>
        <button type="button" className="btn achieve" disabled={cleared} onClick={onAchieve}>
          達成
        </button>
        {capped && <span className="cap-flag">上限</span>}
      </div>
    </div>
  );
}
