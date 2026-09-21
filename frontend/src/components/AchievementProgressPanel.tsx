import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { Activity, Award, CalendarDays, ShieldCheck, Trophy } from 'lucide-react';
import { Settings, ProgressData } from '../types';

interface AchievementProgressPanelProps {
  settings: Settings;
  onUpdate: (key: keyof Settings, value: unknown) => void;
  onRequestReset: () => void;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale || undefined).format(value);
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: 'long',
  }).format(date);
}

export function AchievementProgressPanel({
  settings,
  onUpdate,
  onRequestReset,
}: AchievementProgressPanelProps) {
  const { t, i18n } = useTranslation();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const latestRequestRef = useRef(0);
  const locale = i18n.language || 'en';

  const loadProgress = async () => {
    const requestId = ++latestRequestRef.current;
    try {
      const value = await invoke<ProgressData>('get_achievement_progress');
      if (requestId !== latestRequestRef.current) return;
      setProgress(value);
    } catch (error) {
      console.error('Failed to load achievement progress:', error);
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProgress();
    const unlisten = listen('achievements-updated', loadProgress);
    return () => {
      unlisten.then((cleanup) => cleanup());
    };
  }, []);

  const unlockedCount = useMemo(
    () => progress?.achievements.filter((achievement) => achievement.unlocked).length ?? 0,
    [progress]
  );

  const summary = progress
    ? [
        {
          label: t('settings.progressClipsCaptured'),
          value: progress.totals.clips_captured,
          icon: Trophy,
          color: 'text-primary',
        },
        {
          label: t('settings.progressPastes'),
          value: progress.totals.pastes,
          icon: Activity,
          color: 'text-cyan-400',
        },
        {
          label: t('settings.progressActiveDays'),
          value: progress.active_days,
          icon: CalendarDays,
          color: 'text-amber-400',
        },
        {
          label: t('settings.progressUnlocked'),
          value: unlockedCount,
          icon: Award,
          color: 'text-emerald-400',
        },
      ]
    : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <section className="space-y-3">
        <div>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
            <Trophy size={14} /> {t('settings.achievementsSection')}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t('settings.achievementsSectionDesc')}
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('settings.achievementsLocalOnly')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('settings.achievementsLocalOnlyDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <Icon className={`mb-3 h-5 w-5 ${color}`} />
              <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                {formatNumber(value, locale)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('settings.progressInstalledOn')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(progress?.first_used_at ?? settings.first_used_at ?? null, locale)}
              </p>
              <p className="mt-1 max-w-[420px] text-[10px] leading-relaxed text-muted-foreground/70">
                {t('settings.progressInstalledOnDesc')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-medium text-foreground">
                {t('settings.progressCurrentStreak')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNumber(progress?.current_streak ?? 0, locale)}{' '}
                {t('settings.progressDays')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {progress && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            [t('settings.progressCopies'), progress.totals.copies],
            [t('settings.progressSearches'), progress.totals.searches],
            [t('settings.progressFolders'), progress.totals.folders_created],
            [t('settings.progressPins'), progress.totals.pins],
            [t('settings.progressAiActions'), progress.totals.ai_actions],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="font-mono text-base font-semibold tabular-nums text-foreground">
                {formatNumber(Number(value), locale)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>
      )}

      {progress && (
        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold text-primary/80">
            {t('settings.progressTypeBreakdown')}
          </h3>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4">
            {[
              ['text', progress.totals.captured_text],
              ['code', progress.totals.captured_code],
              ['image', progress.totals.captured_image],
              ['url', progress.totals.captured_url],
              ['file', progress.totals.captured_file],
              ['html', progress.totals.captured_html],
              ['rtf', progress.totals.captured_rtf],
            ].map(([type, value]) => (
              <div key={String(type)} className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="text-xs text-muted-foreground">
                  {t(`clipType.${type}`)}
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {formatNumber(Number(value), locale)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
          <Award size={14} /> {t('settings.achievementsList')}
        </h3>
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            {t('settings.achievementsLoading')}
          </div>
        ) : !progress ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            {t('settings.achievementsUnavailable')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {progress.achievements.map((achievement) => {
              const percentage = Math.min(
                100,
                Math.round((achievement.value / Math.max(achievement.target, 1)) * 100)
              );
              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    achievement.unlocked
                      ? 'border-primary/35 bg-primary/[0.06]'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t(`settings.achievement.${achievement.id}.title`)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t(`settings.achievement.${achievement.id}.desc`)}
                      </p>
                    </div>
                    {achievement.unlocked && (
                      <span className="flex-shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        {t('settings.achievementUnlocked')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          achievement.unlocked ? 'bg-emerald-400' : 'bg-primary'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="min-w-[74px] text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatNumber(Math.min(achievement.value, achievement.target), locale)} /{' '}
                      {formatNumber(achievement.target, locale)}
                    </span>
                  </div>
                  {achievement.unlocked && achievement.unlocked_at && (
                    <p className="mt-2 text-[10px] text-emerald-400/80">
                      {t('settings.achievementUnlockedOn', {
                        date: formatDate(achievement.unlocked_at, locale),
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
          <ShieldCheck size={14} /> {t('settings.achievementsControls')}
        </h3>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4 rounded-[4px] border border-border bg-secondary p-3">
            <div>
              <p className="text-sm font-medium">{t('settings.enableAchievements')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('settings.enableAchievementsDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdate('achievements_enabled', !(settings.achievements_enabled ?? true))
              }
              className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                (settings.achievements_enabled ?? true) ? 'bg-primary' : 'bg-white/10'
              }`}
              aria-label={t('settings.enableAchievements')}
              aria-pressed={settings.achievements_enabled ?? true}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  (settings.achievements_enabled ?? true) ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[4px] border border-border bg-secondary p-3">
            <div>
              <p className="text-sm font-medium">{t('settings.achievementNotifications')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('settings.achievementNotificationsDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdate(
                  'achievement_notifications_enabled',
                  !(settings.achievement_notifications_enabled ?? true)
                )
              }
              className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                (settings.achievement_notifications_enabled ?? true)
                  ? 'bg-primary'
                  : 'bg-white/10'
              }`}
              aria-label={t('settings.achievementNotifications')}
              aria-pressed={settings.achievement_notifications_enabled ?? true}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  (settings.achievement_notifications_enabled ?? true)
                    ? 'translate-x-5'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('settings.resetProgressDesc')}
            </p>
            <button
              type="button"
              onClick={onRequestReset}
              className="btn flex-shrink-0 rounded-[4px] border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              {t('settings.resetProgress')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
