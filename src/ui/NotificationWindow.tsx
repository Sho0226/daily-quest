import { useEffect, useRef } from 'react';
import { useDailyQuestStore } from '../store/useDailyQuestStore';
import { playNotification } from './sound';

export type NotificationKind = 'confirm' | 'announce';

export type Notification = {
  kind: NotificationKind;
  title: string;
  body: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'normal' | 'caution';
};

type NotificationWindowProps = {
  notification: Notification;
  onConfirm: () => void;
  onCancel: () => void;
};

export function NotificationWindow({ notification, onConfirm, onCancel }: NotificationWindowProps) {
  const animations = useDailyQuestStore((s) => s.settings.animations);
  const sound = useDailyQuestStore((s) => s.settings.sound);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isConfirm = notification.kind === 'confirm';

  useEffect(() => {
    playNotification(sound);
    confirmRef.current?.focus();
  }, [sound, notification.title]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isConfirm) onCancel();
        else onConfirm();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isConfirm, onCancel, onConfirm]);

  return (
    <div className="notify-overlay" role="presentation">
      <div
        className={`notify${animations ? ' animate' : ''}${
          notification.tone === 'caution' ? ' caution' : ''
        }`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notify-title"
        aria-describedby="notify-body"
      >
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />

        <p className="notify-eyebrow mono">SYSTEM</p>
        <p className="notify-title" id="notify-title">
          {notification.title}
        </p>
        <p className="notify-body" id="notify-body">
          {notification.body}
        </p>
        {notification.detail && <p className="notify-detail mono">{notification.detail}</p>}

        <div className="notify-actions">
          {isConfirm && (
            <button type="button" className="btn notify-btn" onClick={onCancel}>
              {notification.cancelLabel ?? 'いいえ'}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className="btn achieve notify-btn"
            onClick={onConfirm}
          >
            {notification.confirmLabel ?? (isConfirm ? 'はい' : '確認')}
          </button>
        </div>
      </div>
    </div>
  );
}
