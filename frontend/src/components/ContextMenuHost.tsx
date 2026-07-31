import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { ContextMenu, ContextMenuOption } from './ContextMenu';
import { dispatchContextMenuEvent } from '../utils/contextMenuEvents';

export interface ContextMenuOpenPayload {
  x: number;
  y: number;
  options: ContextMenuOption[];
  /** Clip/folder id to keep hover-highlighted while the menu is open */
  highlightId?: string | null;
}

export interface ContextMenuHostHandle {
  open: (payload: ContextMenuOpenPayload) => void;
  close: () => void;
}

/**
 * Owns context-menu state in an isolated subtree so opening the menu does NOT
 * re-render App / CompactView / the full clip list (critical for Compact lag).
 */
export const ContextMenuHost = forwardRef<ContextMenuHostHandle>(
  function ContextMenuHost(_props, ref) {
    const [menu, setMenu] = useState<ContextMenuOpenPayload | null>(null);

    const close = useCallback(() => {
      setMenu((prev) => {
        if (prev) {
          dispatchContextMenuEvent({ open: false, highlightId: null });
        }
        return null;
      });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: (payload: ContextMenuOpenPayload) => {
          dispatchContextMenuEvent({
            open: true,
            highlightId: payload.highlightId ?? null,
          });
          setMenu(payload);
        },
        close,
      }),
      [close]
    );

    if (!menu) return null;

    return <ContextMenu x={menu.x} y={menu.y} options={menu.options} onClose={close} />;
  }
);
