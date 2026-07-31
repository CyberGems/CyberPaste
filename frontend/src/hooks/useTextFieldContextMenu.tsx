import { useCallback, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import type { ContextMenuOption } from '../components/ContextMenu';

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

interface HistoryState {
  stack: string[];
  index: number;
}

interface SelectionSnapshot {
  start: number;
  end: number;
  selected: string;
  current: string;
}

async function clipboardWrite(text: string) {
  try {
    await invoke('write_clipboard_text', { text });
  } catch {
    await navigator.clipboard.writeText(text);
  }
}

async function clipboardRead(): Promise<string> {
  try {
    return await invoke<string>('read_clipboard_text');
  } catch {
    return await navigator.clipboard.readText();
  }
}

export function useTextFieldContextMenu(
  fieldRef: RefObject<TextFieldElement | null>,
  value: string,
  setValue: (next: string) => void
) {
  const { t } = useTranslation();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<SelectionSnapshot | null>(null);
  const historyRef = useRef<HistoryState>({ stack: [value], index: 0 });

  const resetHistory = useCallback((initial: string) => {
    historyRef.current = { stack: [initial], index: 0 };
  }, []);

  const commit = useCallback(
    (next: string, recordHistory: boolean) => {
      if (recordHistory) {
        const h = historyRef.current;
        const truncated = h.stack.slice(0, h.index + 1);
        if (truncated[truncated.length - 1] !== next) {
          truncated.push(next);
          if (truncated.length > 120) truncated.shift();
          h.stack = truncated;
          h.index = truncated.length - 1;
        }
      }
      setValue(next);
    },
    [setValue]
  );

  const restoreSelection = useCallback(
    (start: number, end: number) => {
      requestAnimationFrame(() => {
        const el = fieldRef.current;
        if (!el) return;
        el.focus();
        try {
          el.setSelectionRange(start, end);
        } catch {
          /* some input types reject selection */
        }
      });
    },
    [fieldRef]
  );

  const replaceRange = useCallback(
    (start: number, end: number, insertion: string, current: string) => {
      const next = current.slice(0, start) + insertion + current.slice(end);
      commit(next, true);
      const caret = start + insertion.length;
      restoreSelection(caret, caret);
    },
    [commit, restoreSelection]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<TextFieldElement>) => {
      commit(e.target.value, true);
    },
    [commit]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = fieldRef.current;
      const current = el?.value ?? value;
      const start = el?.selectionStart ?? 0;
      const end = el?.selectionEnd ?? 0;
      setSnapshot({
        start,
        end,
        selected: current.slice(start, end),
        current,
      });
      setMenuPos({ x: e.clientX, y: e.clientY });
    },
    [fieldRef, value]
  );

  const closeMenu = useCallback(() => {
    setMenuPos(null);
    setSnapshot(null);
  }, []);

  const options: ContextMenuOption[] = (() => {
    if (!snapshot) return [];
    const { start, end, selected, current } = snapshot;
    const hasSelection = end > start;
    const h = historyRef.current;
    const canUndo = h.index > 0;
    const canRedo = h.index < h.stack.length - 1;

    return [
      {
        label: t('contextMenu.undo'),
        disabled: !canUndo,
        onClick: () => {
          if (!canUndo) return;
          h.index -= 1;
          const prev = h.stack[h.index];
          commit(prev, false);
          restoreSelection(prev.length, prev.length);
        },
      },
      {
        label: t('contextMenu.redo'),
        disabled: !canRedo,
        onClick: () => {
          if (!canRedo) return;
          h.index += 1;
          const next = h.stack[h.index];
          commit(next, false);
          restoreSelection(next.length, next.length);
        },
      },
      {
        label: t('contextMenu.copy'),
        disabled: !hasSelection,
        onClick: async () => {
          if (!hasSelection) return;
          try {
            await clipboardWrite(selected);
          } catch {
            /* ignore */
          }
        },
      },
      {
        label: t('contextMenu.cut'),
        disabled: !hasSelection,
        onClick: async () => {
          if (!hasSelection) return;
          try {
            await clipboardWrite(selected);
          } catch {
            /* still delete selection locally */
          }
          replaceRange(start, end, '', current);
        },
      },
      {
        label: t('contextMenu.paste'),
        onClick: async () => {
          try {
            const text = await clipboardRead();
            replaceRange(start, end, text, current);
          } catch {
            /* clipboard read failed */
          }
        },
      },
      {
        label: t('contextMenu.selectAll'),
        disabled: current.length === 0,
        onClick: () => {
          restoreSelection(0, current.length);
        },
      },
      {
        label: t('contextMenu.delete'),
        danger: true,
        disabled: !hasSelection,
        onClick: () => {
          if (!hasSelection) return;
          replaceRange(start, end, '', current);
        },
      },
    ];
  })();

  return {
    menuPos,
    options,
    closeMenu,
    onContextMenu,
    handleChange,
    resetHistory,
  };
}
