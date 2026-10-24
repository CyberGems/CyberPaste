import { useState, useEffect, useLayoutEffect, useRef, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode, MouseEvent as ReactMouseEvent, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  label: ReactNode;
  placement?: Placement;
  children: ReactElement;
  disabled?: boolean;
  delay?: number;
}

const VIEWPORT_MARGIN = 8; // separación mínima respecto al borde de la ventana
const GAP = 8; // separación respecto al elemento ancla

function clamp(value: number, min: number, max: number) {
  if (max < min) return min; // el tooltip es más grande que el espacio: prioriza el margen
  return Math.max(min, Math.min(value, max));
}

const SHORTCUT_PATTERN =
  /(?:(?:Control|Ctrl|Alt|Shift|Mayús|Win|Meta)(?:\+(?:Control|Ctrl|Alt|Shift|Mayús|Win|Meta))*\+(?:F\d{1,2}|Enter|Space|Espacio|Supr|Delete|Del|Backspace|Tab|Escape|Esc|[A-Z0-9]|,|(?:\s*[←→↑↓/]+\s*)|[←→↑↓/]+|\.)(?![A-Za-z0-9]))|\b(?:F\d{1,2}|Enter|Space|Espacio|Supr|Backspace|Tab|Escape|Esc)\b|[←→↑↓/]+/i;

export function TooltipShortcut({ children }: { children: ReactNode }) {
  return <kbd className="tooltip-shortcut-key">{children}</kbd>;
}

export function formatTooltipLabel(label: ReactNode): ReactNode {
  if (typeof label !== 'string') return label;

  // Elimina los paréntesis que solo envuelven la combinación (y conserva los
  // detalles adicionales, como el número de vista, fuera del chip).
  const normalized = label.replace(/\(([^()]*)\)/g, (group, contents: string) => {
    const text = contents.trim();
    const match = SHORTCUT_PATTERN.exec(text);
    return match?.index === 0 ? text : group;
  });
  const matcher = new RegExp(SHORTCUT_PATTERN.source, 'gi');
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(normalized)) !== null) {
    const prefix = normalized.slice(cursor, match.index);
    if (prefix) parts.push(<span key={`text-${cursor}`}>{prefix.trimEnd()}</span>);
    parts.push(<TooltipShortcut key={`shortcut-${match.index}`}>{match[0]}</TooltipShortcut>);
    cursor = matcher.lastIndex;
  }

  if (cursor === 0) return label;
  if (cursor < normalized.length) {
    parts.push(<span key={`text-${cursor}`}>{normalized.slice(cursor)}</span>);
  }
  return <span className="tooltip-label-with-shortcuts">{parts}</span>;
}

export function dismissAllTooltips() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cyberpaste:hide-all-tooltips'));
  }
}

function isElementBlockedByMenuOrModal(el: HTMLElement | null): boolean {
  if (typeof document === 'undefined') return false;
  if (
    document.body.dataset.titlebarMenuOpen === 'true' ||
    document.body.dataset.searchHistoryOpen === 'true'
  ) {
    return true;
  }
  if (document.body.dataset.contextMenuOpen === 'true') {
    if (!el || !el.closest('[role="menu"]')) {
      return true;
    }
  }
  const openModal = document.querySelector('[role="dialog"], [aria-modal="true"]');
  if (openModal) {
    if (!el || !el.closest('[role="dialog"], [aria-modal="true"]')) {
      return true;
    }
  }
  const openMenu = document.querySelector('[role="menu"]');
  if (openMenu) {
    if (!el || !el.closest('[role="menu"]')) {
      return true;
    }
  }
  return false;
}

if (typeof window !== 'undefined') {
  const menuOrModalObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.getAttribute('role') === 'dialog' ||
              node.getAttribute('role') === 'menu' ||
              node.getAttribute('aria-modal') === 'true' ||
              node.querySelector?.('[role="dialog"], [aria-modal="true"], [role="menu"]')
            ) {
              dismissAllTooltips();
              return;
            }
          }
        }
      }
    }
  });

  const initObserver = () => {
    if (document.body) {
      menuOrModalObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }

  // Dismiss tooltips immediately on any right click / contextmenu event
  window.addEventListener('contextmenu', () => dismissAllTooltips(), true);
  window.addEventListener('cyberpaste:context-menu', (event: Event) => {
    const detail = (event as CustomEvent<{ open?: boolean }>).detail;
    if (detail?.open) dismissAllTooltips();
  });
  window.addEventListener('cyberpaste:titlebar-menu-open', () => dismissAllTooltips());
}

// Tooltip elegante y reutilizable (mismo estilo que las pestañas del editor).
// Clona al hijo y le añade los handlers de hover sin envolverlo en otro nodo,
// de modo que no altera los layouts flex existentes. Se reposiciona para no
// salirse de la pantalla y la flecha se re-ancla al centro del elemento.
export default function Tooltip({
  label,
  placement = 'bottom',
  children,
  disabled = false,
  delay = 300,
}: TooltipProps) {
  // Se guarda el ELEMENTO ancla (no un rect congelado): la posición se mide
  // en vivo al mostrar, así un scroll durante el retardo no deja el tooltip
  // flotando lejos del ancla.
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: CSSProperties } | null>(null);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useRef(`tip-${Math.random()}`);

  useEffect(() => {
    const hideMe = () => {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      setAnchorEl(null);
    };

    const onOtherTooltipActive = (event: Event) => {
      const activeId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (activeId !== tooltipId.current) {
        hideMe();
      }
    };

    window.addEventListener('cyberpaste:hide-all-tooltips', hideMe);
    window.addEventListener('cyberpaste:tooltip-active', onOtherTooltipActive);
    return () => {
      window.removeEventListener('cyberpaste:hide-all-tooltips', hideMe);
      window.removeEventListener('cyberpaste:tooltip-active', onOtherTooltipActive);
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setAnchorEl(null);
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
    }
  }, [disabled]);

  // Medimos el tooltip ya renderizado y el ancla EN VIVO (el layout puede
  // haber cambiado durante el retardo de aparición) y calculamos la posición.
  useLayoutEffect(() => {
    if (!anchorEl || !cardRef.current) {
      setPos(null);
      return;
    }
    const anchor = anchorEl.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = anchor.left + anchor.width / 2;
    const cy = anchor.top + anchor.height / 2;
    let left = 0;
    let top = 0;
    let arrow: CSSProperties = {};

    const borderStyle = '1px solid rgba(255, 255, 255, 0.1)';

    if (placement === 'top' || placement === 'bottom') {
      let actualPlacement = placement;
      if (placement === 'top' && anchor.top - GAP - card.height < VIEWPORT_MARGIN) {
        if (anchor.bottom + GAP + card.height <= vh - VIEWPORT_MARGIN) {
          actualPlacement = 'bottom';
        }
      } else if (
        placement === 'bottom' &&
        anchor.bottom + GAP + card.height > vh - VIEWPORT_MARGIN
      ) {
        if (anchor.top - GAP - card.height >= VIEWPORT_MARGIN) {
          actualPlacement = 'top';
        }
      }

      left = clamp(cx - card.width / 2, VIEWPORT_MARGIN, vw - card.width - VIEWPORT_MARGIN);
      top = actualPlacement === 'bottom' ? anchor.bottom + GAP : anchor.top - GAP - card.height;
      const ax = clamp(cx - left, 12, card.width - 12); // flecha alineada al centro del ancla
      arrow =
        actualPlacement === 'bottom'
          ? {
              top: -4,
              left: ax,
              marginLeft: -4,
              borderTop: borderStyle,
              borderLeft: borderStyle,
            }
          : {
              bottom: -4,
              left: ax,
              marginLeft: -4,
              borderBottom: borderStyle,
              borderRight: borderStyle,
            };
    } else {
      top = clamp(cy - card.height / 2, VIEWPORT_MARGIN, vh - card.height - VIEWPORT_MARGIN);
      left = placement === 'right' ? anchor.right + GAP : anchor.left - GAP - card.width;
      const ay = clamp(cy - top, 12, card.height - 12);
      arrow =
        placement === 'right'
          ? {
              left: -4,
              top: ay,
              marginTop: -4,
              borderBottom: borderStyle,
              borderLeft: borderStyle,
            }
          : {
              right: -4,
              top: ay,
              marginTop: -4,
              borderTop: borderStyle,
              borderRight: borderStyle,
            };
    }
    setPos({ left, top, arrow });
    // Nota: no dependemos de `label` para evitar recálculos en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, placement]);

  // Ocultar al hacer scroll o redimensionar para que el tooltip no quede "flotando".
  useEffect(() => {
    if (!anchorEl) return;
    const hide = () => setAnchorEl(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('wheel', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('wheel', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [anchorEl]);

  // A titlebar menu or context menu is rendered in a portal/overlay and must suppress every tooltip
  // behind it, not only the tooltip attached to the trigger button.
  useEffect(() => {
    const hideForMenuOrModal = () => {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      setAnchorEl(null);
    };
    const onContextMenuEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      if (detail?.open) hideForMenuOrModal();
    };

    window.addEventListener('cyberpaste:titlebar-menu-open', hideForMenuOrModal);
    window.addEventListener('cyberpaste:context-menu', onContextMenuEvent);
    window.addEventListener('contextmenu', hideForMenuOrModal, true);
    return () => {
      window.removeEventListener('cyberpaste:titlebar-menu-open', hideForMenuOrModal);
      window.removeEventListener('cyberpaste:context-menu', onContextMenuEvent);
      window.removeEventListener('contextmenu', hideForMenuOrModal, true);
    };
  }, []);

  // Search history is a modal-like portal. Suppress tooltips behind it and
  // prevent a tooltip from reopening while the pointer remains in place.
  useEffect(() => {
    const hideForSearchHistory = (event: Event) => {
      const isOpen = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      if (!isOpen) return;
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      setAnchorEl(null);
    };

    window.addEventListener('cyberpaste:search-history', hideForSearchHistory);
    return () => window.removeEventListener('cyberpaste:search-history', hideForSearchHistory);
  }, []);

  // Cancelar un show pendiente si hay scroll durante el retardo: sin esto el
  // tooltip aparecería con la posición del layout anterior, despegado del ancla.
  useEffect(() => {
    const cancelPending = () => {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
    };
    window.addEventListener('scroll', cancelPending, true);
    window.addEventListener('wheel', cancelPending, true);
    return () => {
      window.removeEventListener('scroll', cancelPending, true);
      window.removeEventListener('wheel', cancelPending, true);
    };
  }, []);

  // Limpiar temporizadores de retardo al desmontar
  useEffect(() => {
    return () => {
      if (delayTimer.current) clearTimeout(delayTimer.current);
    };
  }, []);

  if (disabled) return children;
  if (!isValidElement(children)) return children;
  const child = children as ReactElement<any>;

  const show = (e: ReactMouseEvent<HTMLElement>): void => {
    child.props.onMouseEnter?.(e);
    if (isElementBlockedByMenuOrModal(e.currentTarget)) {
      setAnchorEl(null);
      return;
    }
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }

    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    const closestTooltipEl = target.closest('[data-has-tooltip="true"]');
    const closestInteractive = target.closest('button, a, [role="button"]');
    // Solo se suprime si el ancestro interactivo tiene su propio tooltip
    // (evita apilar dos tooltips). Un input con tooltip dentro de una fila
    // clicable sin tooltip debe mostrar el suyo.
    const ancestorHasOwnTooltip =
      !!closestInteractive &&
      closestInteractive !== currentTarget &&
      closestInteractive.hasAttribute('data-has-tooltip');
    if ((closestTooltipEl && closestTooltipEl !== currentTarget) || ancestorHasOwnTooltip) {
      setAnchorEl(null);
    } else if (label) {
      delayTimer.current = setTimeout(() => {
        if (isElementBlockedByMenuOrModal(currentTarget)) {
          setAnchorEl(null);
          return;
        }
        window.dispatchEvent(
          new CustomEvent('cyberpaste:tooltip-active', { detail: { id: tooltipId.current } })
        );
        setAnchorEl(currentTarget);
      }, delay);
    }
  };
  const hide = (e: ReactMouseEvent<HTMLElement>): void => {
    child.props.onMouseLeave?.(e);
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    setAnchorEl(null);
  };
  const clickHide = (e: ReactMouseEvent<HTMLElement>): void => {
    child.props.onClick?.(e);
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    setAnchorEl(null);
  };
  const handleMouseMove = (e: ReactMouseEvent<HTMLElement>): void => {
    child.props.onMouseMove?.(e);
    if (isElementBlockedByMenuOrModal(e.currentTarget)) {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      setAnchorEl(null);
      return;
    }
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    const closestTooltipEl = target.closest('[data-has-tooltip="true"]');
    const closestInteractive = target.closest('button, a, [role="button"]');
    const ancestorHasOwnTooltip =
      !!closestInteractive &&
      closestInteractive !== currentTarget &&
      closestInteractive.hasAttribute('data-has-tooltip');
    if ((closestTooltipEl && closestTooltipEl !== currentTarget) || ancestorHasOwnTooltip) {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      setAnchorEl(null);
    } else if (label) {
      if (!anchorEl && !delayTimer.current) {
        delayTimer.current = setTimeout(() => {
          if (isElementBlockedByMenuOrModal(currentTarget)) {
            setAnchorEl(null);
            return;
          }
          window.dispatchEvent(
            new CustomEvent('cyberpaste:tooltip-active', { detail: { id: tooltipId.current } })
          );
          setAnchorEl(currentTarget);
        }, delay);
      }
    }
  };

  // eslint-disable-next-line react-hooks/refs
  const cloned = cloneElement(child, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onClick: clickHide,
    onMouseMove: handleMouseMove,
    'data-has-tooltip': 'true',
  });

  return (
    <>
      {cloned}
      {anchorEl &&
        label &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: pos ? pos.left : -9999,
              top: pos ? pos.top : -9999,
              zIndex: 1000001,
              pointerEvents: 'none',
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            <div
              ref={cardRef}
              className="premium-tooltip glass-effect"
              style={{
                position: 'relative',
                background: 'rgba(15, 15, 20, 0.97)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(var(--primary-rgb, 0, 120, 215), 0.18)',
                boxShadow:
                  '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 5px rgba(var(--primary-rgb, 0, 120, 215), 0.2)',
                borderRadius: 8,
                padding: '6px 10px',
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: 11,
                fontWeight: 600,
                maxWidth: 'calc(100vw - 16px)',
                boxSizing: 'border-box',
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                animation: 'tooltipPop 0.14s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {formatTooltipLabel(label)}
              <div
                style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  background: 'rgba(15, 15, 20, 0.97)',
                  transform: 'rotate(45deg)',
                  ...(pos?.arrow || {}),
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
