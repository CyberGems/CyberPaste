import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Award,
  CalendarDays,
  ShieldCheck,
  Trophy,
  Flame,
  FileText,
  Code,
  Image as ImageIcon,
  Link,
  File as LucideFile,
  Copy,
  Search,
  FolderPlus,
  Pin,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Settings, ProgressData } from '../types';
import { Switch } from './ui/Switch';

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

function getDaysSince(value: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
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

        {(() => {
          const firstUsedAt = progress?.first_used_at ?? settings.first_used_at ?? null;
          const totalDays = getDaysSince(firstUsedAt);

          return (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('settings.progressInstalledOn')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/90">
                        {formatDate(firstUsedAt, locale)}
                      </span>
                      {totalDays !== null && (
                        <>
                          <span className="opacity-30">•</span>
                          <span className="font-mono font-medium tabular-nums text-primary">
                            {t('settings.progressTotalDays', {
                              count: totalDays,
                              defaultValue: `${formatNumber(totalDays, locale)} días totales`,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 max-w-[480px] text-[11px] leading-relaxed text-muted-foreground/75">
                      {t('settings.progressInstalledOnDesc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 sm:self-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                    <Flame size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t('settings.progressCurrentStreak')}
                    </p>
                    <p className="font-mono text-base font-bold tabular-nums text-foreground">
                      {formatNumber(progress?.current_streak ?? 0, locale)}{' '}
                      <span className="font-sans text-xs font-normal text-muted-foreground">
                        {t('settings.progressDays')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {progress &&
        (() => {
          const actionItems = [
            {
              key: 'copies',
              label: t('settings.progressCopies'),
              value: Number(progress.totals.copies || 0),
              icon: Copy,
              color: 'text-cyan-400',
              bg: 'bg-cyan-500/10 border-cyan-500/20',
            },
            {
              key: 'searches',
              label: t('settings.progressSearches'),
              value: Number(progress.totals.searches || 0),
              icon: Search,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10 border-indigo-500/20',
            },
            {
              key: 'folders',
              label: t('settings.progressFolders'),
              value: Number(progress.totals.folders_created || 0),
              icon: FolderPlus,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              key: 'pins',
              label: t('settings.progressPins'),
              value: Number(progress.totals.pins || 0),
              icon: Pin,
              color: 'text-rose-400',
              bg: 'bg-rose-500/10 border-rose-500/20',
            },
            {
              key: 'ai_actions',
              label: t('settings.progressAiActions'),
              value: Number(progress.totals.ai_actions || 0),
              icon: Sparkles,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
          ];

          return (
            <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {actionItems.map(({ key, label, value, icon: Icon, color, bg }) => (
                <div
                  key={key}
                  className="flex flex-col justify-between rounded-xl border border-border/70 bg-card/75 p-3.5 transition-all hover:border-border hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={clsx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                        bg,
                        color
                      )}
                    >
                      <Icon size={14} />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                      {formatNumber(value, locale)}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground/80">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          );
        })()}

      {progress &&
        (() => {
          const typeItems = [
            {
              type: 'text',
              label: t('clipType.text'),
              count: Number(progress.totals.captured_text || 0),
              icon: FileText,
              color: 'text-sky-400',
              bg: 'bg-sky-500/10 border-sky-500/20',
              bar: 'bg-sky-400',
            },
            {
              type: 'code',
              label: t('clipType.code'),
              count: Number(progress.totals.captured_code || 0),
              icon: Code,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 border-purple-500/20',
              bar: 'bg-purple-400',
            },
            {
              type: 'image',
              label: t('clipType.image'),
              count: Number(progress.totals.captured_image || 0),
              icon: ImageIcon,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
              bar: 'bg-emerald-400',
            },
            {
              type: 'url',
              label: t('clipType.url'),
              count: Number(progress.totals.captured_url || 0),
              icon: Link,
              color: 'text-cyan-400',
              bg: 'bg-cyan-500/10 border-cyan-500/20',
              bar: 'bg-cyan-400',
            },
            {
              type: 'file',
              label: t('clipType.file'),
              count: Number(progress.totals.captured_file || 0),
              icon: LucideFile,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
              bar: 'bg-amber-400',
            },
          ];

          const totalCaptured = typeItems.reduce((acc, item) => acc + item.count, 0);

          return (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-primary/80">
                  {t('settings.progressTypeBreakdown')}
                </h3>
                {totalCaptured > 0 && (
                  <span className="font-mono text-[11px] text-muted-foreground/80">
                    {t('settings.progressTotalCaptured', {
                      count: totalCaptured,
                      defaultValue: `${formatNumber(totalCaptured, locale)} clips capturados`,
                    })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {typeItems.map(({ type, label, count, icon: Icon, color, bg, bar }) => {
                  const pct = totalCaptured > 0 ? Math.round((count / totalCaptured) * 100) : 0;
                  return (
                    <div
                      key={type}
                      className="flex flex-col justify-between rounded-xl border border-border/70 bg-card/75 p-3.5 transition-all hover:border-border hover:bg-card"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={clsx(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                              bg,
                              color
                            )}
                          >
                            <Icon size={14} />
                          </div>
                          <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground/75">
                            {pct}%
                          </span>
                        </div>
                        <p className="mt-2 truncate text-xs font-medium text-foreground/85">
                          {label}
                        </p>
                        <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">
                          {formatNumber(count, locale)}
                        </p>
                      </div>

                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-500', bar)}
                          style={{ width: `${count > 0 ? Math.max(pct, 4) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

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
            <Switch
              checked={settings.achievements_enabled ?? true}
              onChange={(val) => onUpdate('achievements_enabled', val)}
              aria-label={t('settings.enableAchievements')}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[4px] border border-border bg-secondary p-3">
            <div>
              <p className="text-sm font-medium">{t('settings.achievementNotifications')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('settings.achievementNotificationsDesc')}
              </p>
            </div>
            <Switch
              checked={settings.achievement_notifications_enabled ?? true}
              onChange={(val) => onUpdate('achievement_notifications_enabled', val)}
              aria-label={t('settings.achievementNotifications')}
            />
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
