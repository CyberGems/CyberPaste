import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, X } from 'lucide-react';
import type { AppLockStatus } from '../types';
import { formatRecoveryKeyInput } from '../utils/appLock';
import Tooltip from './Tooltip';

function errorMessage(err: unknown, t: (key: string) => string, recovery: boolean): string {
  const text = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
  if (text.includes('APP_LOCK_RATE_LIMITED')) return t('appLock.errors.rateLimited');
  if (text.includes('APP_LOCK_NO_RECOVERY_KEY')) return t('appLock.errors.noRecoveryKey');
  if (text.includes('APP_LOCK_INVALID_SECRET')) {
    return recovery ? t('appLock.errors.invalidRecovery') : t('appLock.errors.invalid');
  }
  if (text.includes('APP_LOCK_WEAK_SECRET')) return t('appLock.errors.weak');
  if (text.includes('APP_LOCK_CONFIRM_MISMATCH') || text.includes('APP_LOCK_MISMATCH')) {
    return t('appLock.errors.mismatch');
  }
  if (text.includes('APP_LOCK_NOT_ENABLED')) return t('appLock.errors.notEnabled');
  return t('appLock.errors.generic');
}

export function AppLockScreen({
  status,
  onUnlocked,
}: {
  status: AppLockStatus;
  onUnlocked: (next: AppLockStatus) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lockoutMs, setLockoutMs] = useState(status.lockout_remaining_ms);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newConfirm, setNewConfirm] = useState('');

  const isPin = status.mode !== 'password';
  const lockedOut = lockoutMs > 0;
  const lockoutSecs = Math.ceil(lockoutMs / 1000);

  useEffect(() => {
    setLockoutMs(status.lockout_remaining_ms);
  }, [status.lockout_remaining_ms]);

  useEffect(() => {
    if (lockoutMs <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutMs((prev) => Math.max(0, prev - 250));
    }, 250);
    return () => window.clearInterval(timer);
  }, [lockoutMs > 0]);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input || input.disabled) return;
    input.focus({ preventScroll: true });
    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
  }, []);

  useEffect(() => {
    const ids = [0, 80, 240, 500].map((delay) => window.setTimeout(focusInput, delay));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [focusInput, showForgot, status.mode]);

  useEffect(() => {
    const focusAfterActivation = () => {
      focusInput();
      window.setTimeout(focusInput, 80);
    };
    const unlisten = listen('tauri://focus', focusAfterActivation);
    window.addEventListener('focus', focusAfterActivation);
    document.addEventListener('visibilitychange', focusAfterActivation);
    return () => {
      unlisten.then((cleanup) => cleanup());
      window.removeEventListener('focus', focusAfterActivation);
      document.removeEventListener('visibilitychange', focusAfterActivation);
    };
  }, [focusInput]);

  useEffect(() => {
    if (showForgot || busy || lockedOut || !error) return;
    const ids = [0, 80].map((delay) => window.setTimeout(focusInput, delay));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [busy, error, focusInput, lockedOut, showForgot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      invoke('hide_window').catch(console.error);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const submitUnlock = async () => {
    if (busy || lockedOut || !secret.trim()) return;
    setBusy(true);
    setError('');
    try {
      const next = await invoke<AppLockStatus>('unlock_app', { secret });
      setSecret('');
      onUnlocked(next);
    } catch (err) {
      setSecret('');
      setError(errorMessage(err, t, false));
      try {
        const latest = await invoke<AppLockStatus>('get_app_lock_status');
        setLockoutMs(latest.lockout_remaining_ms);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  const submitRecover = async () => {
    if (busy || lockedOut || !recoveryKey.trim() || !newSecret.trim()) return;
    setBusy(true);
    setError('');
    try {
      const next = await invoke<AppLockStatus>('recover_app_lock', {
        recoveryKey,
        newSecret,
        confirm: newConfirm,
        mode: status.mode,
      });
      setRecoveryKey('');
      setNewSecret('');
      setNewConfirm('');
      setShowForgot(false);
      onUnlocked(next);
    } catch (err) {
      setError(errorMessage(err, t, true));
      try {
        const latest = await invoke<AppLockStatus>('get_app_lock_status');
        setLockoutMs(latest.lockout_remaining_ms);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[220] flex select-none flex-col bg-background/[0.80] backdrop-blur-xl"
      onCopy={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('input, textarea')) return;
        e.preventDefault();
      }}
    >
      <Tooltip label={t('appLock.close')} placement="bottom">
        <button
          type="button"
          onClick={() => invoke('hide_window').catch(console.error)}
          aria-label={t('appLock.close')}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <X size={17} />
        </button>
      </Tooltip>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_24px_rgba(var(--primary-rgb),0.28)]">
          <Lock size={22} className="text-primary" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {showForgot ? t('appLock.forgotTitle') : t('appLock.unlockTitle')}
        </h1>
        <p className="mt-1.5 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
          {showForgot ? t('appLock.forgotBody') : t('appLock.unlockSubtitle')}
        </p>

        {showForgot ? (
          <form
            className="mt-6 w-full max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              void submitRecover();
            }}
          >
            <label className="sr-only" htmlFor="app-lock-recovery">
              {t('appLock.recoveryKey')}
            </label>
            <input
              id="app-lock-recovery"
              ref={inputRef}
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={recoveryKey}
              disabled={busy || lockedOut}
              onChange={(e) => {
                setRecoveryKey(formatRecoveryKeyInput(e.target.value));
                setError('');
              }}
              placeholder={t('appLock.recoveryKeyPlaceholder')}
              className="w-full select-text rounded-lg border border-border bg-input px-3 py-2.5 text-center font-mono text-sm tracking-wide text-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t('appLock.setNewSecret')}
            </p>
            <input
              type={showSecret ? 'text' : 'password'}
              inputMode={isPin ? 'numeric' : 'text'}
              autoComplete="off"
              spellCheck={false}
              value={newSecret}
              disabled={busy || lockedOut}
              onChange={(e) => {
                const next = isPin ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value;
                setNewSecret(next);
                setError('');
              }}
              placeholder={isPin ? t('appLock.pinPlaceholder') : t('appLock.passwordPlaceholder')}
              className="mt-2 w-full select-text rounded-lg border border-border bg-input px-3 py-2 text-center text-sm text-foreground focus:border-ring focus:outline-none"
            />
            <input
              type={showSecret ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={newConfirm}
              disabled={busy || lockedOut}
              onChange={(e) => {
                const next = isPin ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value;
                setNewConfirm(next);
                setError('');
              }}
              placeholder={t('settings.appLockConfirmSecret')}
              className="mt-2 w-full select-text rounded-lg border border-border bg-input px-3 py-2 text-center text-sm text-foreground focus:border-ring focus:outline-none"
            />

            {lockedOut ? (
              <p className="mt-3 text-center text-xs text-amber-400">
                {t('appLock.tryAgainIn', { seconds: lockoutSecs })}
              </p>
            ) : error ? (
              <p className="mt-3 text-center text-xs text-destructive">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={
                busy ||
                lockedOut ||
                !recoveryKey.trim() ||
                !newSecret.trim() ||
                newSecret !== newConfirm
              }
              className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t('appLock.recovering') : t('appLock.recover')}
            </button>
            <button
              type="button"
              className="mt-3 w-full text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowForgot(false);
                setError('');
                setRecoveryKey('');
                setNewSecret('');
                setNewConfirm('');
              }}
            >
              {t('appLock.forgotBack')}
            </button>
          </form>
        ) : (
          <form
            className="mt-6 w-full max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              void submitUnlock();
            }}
          >
            <label className="sr-only" htmlFor="app-lock-secret">
              {isPin ? t('appLock.pin') : t('appLock.password')}
            </label>
            <div className="relative">
              <input
                id="app-lock-secret"
                ref={inputRef}
                type={showSecret ? 'text' : 'password'}
                inputMode={isPin ? 'numeric' : 'text'}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={secret}
                disabled={busy || lockedOut}
                onChange={(e) => {
                  const next = isPin ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value;
                  setSecret(next);
                  setError('');
                }}
                placeholder={isPin ? t('appLock.pinPlaceholder') : t('appLock.passwordPlaceholder')}
                className="w-full select-text rounded-lg border border-border bg-input py-2.5 pl-3 pr-10 text-center text-sm tracking-[0.18em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground focus:border-ring focus:outline-none [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 text-foreground/75 hover:text-foreground"
                tabIndex={-1}
                aria-label={showSecret ? t('appLock.hideSecret') : t('appLock.showSecret')}
              >
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {lockedOut ? (
              <p className="mt-3 text-center text-xs text-amber-400">
                {t('appLock.tryAgainIn', { seconds: lockoutSecs })}
              </p>
            ) : error ? (
              <p className="mt-3 text-center text-xs text-destructive">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy || lockedOut || !secret.trim()}
              className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t('appLock.unlocking') : t('appLock.unlock')}
            </button>
          </form>
        )}

        {!showForgot && (
          <button
            type="button"
            className="mt-4 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => {
              setShowForgot(true);
              setError('');
              setSecret('');
            }}
          >
            {t('appLock.forgotSecret')}
          </button>
        )}
      </div>
    </div>
  );
}
