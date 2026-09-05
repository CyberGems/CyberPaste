import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Heart, Globe, Tag, Github, Info, Book } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

const DONATE_URL = 'https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate';
const WIKI_URL = 'https://github.com/CyberGems/CyberPaste/wiki';
const WEBSITE_URL = 'https://cybergems.org';
const CHANGELOG_URL = 'https://github.com/CyberGems/CyberPaste/releases';
const GITHUB_URL = 'https://github.com/CyberGems/CyberPaste';

export function TitleBarMenu({ iconSize = 14 }: { iconSize?: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const isInside = (target: EventTarget | null) => {
      if (!target || !(target instanceof Node)) return false;
      return !!(wrapRef.current?.contains(target) || menuRef.current?.contains(target));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isInside(e.target)) return;
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const eatClick = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        };
        window.addEventListener('click', eatClick, true);
        const pointerId = e.pointerId;
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          window.removeEventListener('pointerup', onUp, true);
          window.setTimeout(() => window.removeEventListener('click', eatClick, true), 0);
        };
        window.addEventListener('pointerup', onUp, true);
      }
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const closeAnd = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const itemClass =
    'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-foreground';
  const iconClass = 'shrink-0 text-muted-foreground transition-colors group-hover:text-primary';

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <Tooltip label={t('common.moreActions')} placement="bottom" disabled={open}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={t('common.moreActions')}
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
            open
              ? 'border-primary/40 bg-primary/20 text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]'
              : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80'
          )}
        >
          <MoreVertical size={iconSize} className="pointer-events-none" />
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[300] flex w-56 flex-col gap-0.5 rounded-lg border border-border bg-popover p-[5px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.3)]"
            style={{
              top: pos.top,
              right: pos.right,
              animation: 'titlebarMenuFade 0.12s ease-out',
            }}
          >
            <style>{`
              @keyframes titlebarMenuFade {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() =>
                closeAnd(() => {
                  openUrl(DONATE_URL).catch(console.error);
                })
              }
            >
              <Heart
                size={14}
                className="shrink-0 text-[#00D8F1] group-hover:drop-shadow-[0_0_4px_rgba(0,216,241,0.6)]"
              />
              <span>{t('common.donate')}</span>
            </button>

            <div className="mx-1.5 my-1 h-px bg-border" />

            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() =>
                closeAnd(() => {
                  openUrl(WIKI_URL).catch(console.error);
                })
              }
            >
              <Book size={14} className={iconClass} />
              <span>{t('titleBar.moreMenu.docs')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() =>
                closeAnd(() => {
                  openUrl(WEBSITE_URL).catch(console.error);
                })
              }
            >
              <Globe size={14} className={iconClass} />
              <span>{t('titleBar.moreMenu.website')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() =>
                closeAnd(() => {
                  openUrl(CHANGELOG_URL).catch(console.error);
                })
              }
            >
              <Tag size={14} className={iconClass} />
              <span>{t('titleBar.moreMenu.changelog')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() =>
                closeAnd(() => {
                  openUrl(GITHUB_URL).catch(console.error);
                })
              }
            >
              <Github size={14} className={iconClass} />
              <span>{t('titleBar.moreMenu.github')}</span>
            </button>

            <div className="mx-1.5 my-1 h-px bg-border" />

            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() =>
                closeAnd(() => {
                  invoke('open_about').catch(console.error);
                })
              }
            >
              <Info size={14} className={iconClass} />
              <span>{t('titleBar.moreMenu.about')}</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
