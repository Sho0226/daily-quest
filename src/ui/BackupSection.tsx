import { useRef, useState } from 'react';
import { backupFilename, shouldRemindExport, type Backup } from '../domain/backup';
import { useDailyQuestStore } from '../store/useDailyQuestStore';
import { NotificationWindow } from './NotificationWindow';

export function BackupSection() {
  const lastExportAt = useDailyQuestStore((s) => s.lastExportAt);
  const exportBackup = useDailyQuestStore((s) => s.exportBackup);
  const importBackup = useDailyQuestStore((s) => s.importBackup);

  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);

  const remind = shouldRemindExport(lastExportAt, new Date());

  function handleExport() {
    const backup = exportBackup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename(backup.exportedAt);
    a.click();
    URL.revokeObjectURL(url);

    setStatus({ tone: 'ok', message: '記録を書き出しました。' });
  }

  async function handleCopy() {
    const backup = exportBackup();
    try {
      await navigator.clipboard.writeText(JSON.stringify(backup));
      setStatus({ tone: 'ok', message: '記録をクリップボードにコピーしました。' });
    } catch {
      setStatus({ tone: 'error', message: 'コピーできませんでした。書き出しをお使いください。' });
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    // Validation is the only thing that needs zod, so it loads on demand.
    const { parseBackup } = await import('../domain/backupSchema');
    const result = parseBackup(text);
    if (!result.ok) {
      setStatus({ tone: 'error', message: result.error });
      return;
    }
    setStatus(null);
    setPendingImport(result.backup);
  }

  const importedDayCount = pendingImport ? Object.keys(pendingImport.days).length : 0;

  return (
    <section className="setting-group">
      <h2 className="setting-heading">記録の書き出しと読み込み</h2>
      <p className="setting-note">
        端末のストレージは消えることがあります。月に一度の書き出しをおすすめします。
      </p>

      {remind && (
        <div className="banner hold backup-reminder">
          {lastExportAt
            ? '前回の書き出しから1か月以上経過しています。'
            : 'まだ一度も書き出していません。'}
        </div>
      )}

      <div className="backup-actions">
        <button type="button" className="btn" onClick={handleExport}>
          書き出す
        </button>
        <button type="button" className="btn" onClick={handleCopy}>
          コピー
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          読み込む
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      {lastExportAt && (
        <p className="setting-note backup-last mono">
          最終書き出し {lastExportAt.slice(0, 10)}
        </p>
      )}

      {status && <p className={`backup-status ${status.tone}`}>{status.message}</p>}

      {pendingImport && (
        <NotificationWindow
          notification={{
            kind: 'confirm',
            tone: 'caution',
            title: '記録を読み込みます',
            body: '現在の記録は全て置き換えられます。この操作は取り消せません。よろしいですか？',
            detail: `${importedDayCount}日分 / 第${pendingImport.week}週 / 書き出し日 ${pendingImport.exportedAt.slice(0, 10)}`,
            confirmLabel: '読み込む',
          }}
          onConfirm={() => {
            importBackup(pendingImport);
            setPendingImport(null);
            setStatus({ tone: 'ok', message: '記録を読み込みました。' });
          }}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </section>
  );
}
