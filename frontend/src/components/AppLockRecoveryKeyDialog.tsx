import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Shield } from 'lucide-react';

export function AppLockRecoveryKeyDialog({
  recoveryKey,
  onClose,
}: {
  recoveryKey: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    try {
      await invoke('write_clipboard_text', { text: recoveryKey });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(recoveryKey);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Shield size={16} />
          </div>
          <h3 className="text-lg font-semibold">{t('settings.appLockRecoveryKeyTitle')}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('settings.appLockRecoveryKeyBody')}
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2.5">
          <code className="min-w-0 flex-1 select-all font-mono text-sm tracking-wide text-foreground">
            {recoveryKey}
          </code>
          <button
            type="button"
            onClick={() => void copyKey()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t('common.copied') : t('common.copy')}
          </button>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5"
          />
          <span>{t('settings.appLockRecoveryKeySaved')}</span>
        </label>
        <button
          type="button"
          disabled={!saved}
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t('settings.appLockRecoveryKeyContinue')}
        </button>
      </div>
    </div>
  );
}
