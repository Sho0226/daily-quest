import { RECOVERY_MESSAGE, RECOVERY_TASKS } from '../domain/recovery';

type RecoveryQuestProps = {
  done: boolean;
  onComplete: () => void;
};

export function RecoveryQuest({ done, onComplete }: RecoveryQuestProps) {
  return (
    <div className={`recovery${done ? ' cleared' : ''}`}>
      <div className="recovery-head">
        <span className="quest-tag recovery-tag">RECOVERY</span>
        <span className="quest-jp">回復クエスト</span>
        {done && <span className="quest-clear-mark recovery-mark">CLEAR</span>}
      </div>

      <p className="system-message">{RECOVERY_MESSAGE}</p>

      <ul className="recovery-tasks">
        {RECOVERY_TASKS.map((task) => (
          <li key={task.id}>
            <span className="recovery-task-label">{task.label}</span>
            <span className="recovery-task-detail">{task.detail}</span>
          </li>
        ))}
      </ul>

      <button type="button" className="btn recovery-btn full" disabled={done} onClick={onComplete}>
        {done ? '完了済み' : '完了'}
      </button>
    </div>
  );
}
