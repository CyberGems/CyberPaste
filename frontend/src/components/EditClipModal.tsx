import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Save, Copy, Check, Eraser, WrapText, FileCode, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContextMenu } from './ContextMenu';
import { useTextFieldContextMenu } from '../hooks/useTextFieldContextMenu';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

interface EditClipModalProps {
  isOpen: boolean;
  content: string;
  clipType: string;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

export const EditClipModal: React.FC<EditClipModalProps> = ({
  isOpen,
  content,
  clipType,
  onClose,
  onSave,
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const { t } = useTranslation();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const { menuPos, options, closeMenu, onContextMenu, handleChange, resetHistory } =
    useTextFieldContextMenu(textareaRef, editedContent, setEditedContent);

  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const pos = textareaRef.current.selectionStart || 0;
    const linesBefore = text.slice(0, pos).split('\n');
    const line = linesBefore.length;
    const col = linesBefore[linesBefore.length - 1].length + 1;
    setCursorPos({ line, col });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEditedContent(content);
      resetHistory(content);
      setCopied(false);
      setCursorPos({ line: 1, col: 1 });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(0, 0);
          updateCursorPosition();
        }
      }, 50);
    }
  }, [isOpen, content, resetHistory, updateCursorPosition]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+S or Ctrl+Enter to save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault();
        e.stopPropagation();
        onSave(editedContent);
        return;
      }

      // Tab key indentation support (inserts 2 spaces)
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setEditedContent(newValue);

        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 2;
            textareaRef.current.selectionEnd = start + 2;
            updateCursorPosition();
          }
        });
      }
    },
    [editedContent, onSave, updateCursorPosition]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (menuPos) {
          closeMenu();
          return;
        }
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleGlobalKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isOpen, onClose, menuPos, closeMenu]);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  const handleClear = () => {
    setEditedContent('');
    setCursorPos({ line: 1, col: 1 });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const lines = useMemo(() => {
    return editedContent.split('\n');
  }, [editedContent]);

  const wordCount = useMemo(() => {
    const trimmed = editedContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [editedContent]);

  if (!isOpen) return null;

  const isCode = clipType === 'code' || clipType === 'html' || clipType === 'rtf';
  const typeLabel = t(`clipType.${clipType}`, { defaultValue: t('clipType.text') });

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm duration-200 sm:p-4">
      <div
        className="animate-in zoom-in-95 flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.18),0_20px_50px_rgba(0,0,0,0.6)] duration-300 sm:max-h-[min(90vh,540px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editor Window Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]">
              {isCode ? <FileCode size={15} /> : <FileText size={15} />}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
                {t('settings.editClip', { type: typeLabel })}
              </h3>
              <span className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                {typeLabel.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Mini-toolbar */}
          <div className="flex items-center gap-1">
            <Tooltip label={t('editor.wordWrap')} placement="bottom">
              <button
                onClick={() => setWordWrap(!wordWrap)}
                className={clsx(
                  'flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-all',
                  wordWrap
                    ? 'border-primary/30 bg-primary/15 font-semibold text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <WrapText size={13} />
                <span className="hidden text-[10px] sm:inline">{t('editor.wordWrap')}</span>
              </button>
            </Tooltip>

            <Tooltip label={copied ? t('editor.copied') : t('editor.copyAll')} placement="bottom">
              <button
                onClick={handleCopyAll}
                className={clsx(
                  'flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-all',
                  copied
                    ? 'border-emerald-500/30 bg-emerald-500/15 font-semibold text-emerald-400'
                    : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span className="hidden text-[10px] sm:inline">
                  {copied ? t('editor.copied') : t('editor.copyAll')}
                </span>
              </button>
            </Tooltip>

            {editedContent.length > 0 && (
              <Tooltip label={t('editor.clearText')} placement="bottom">
                <button
                  onClick={handleClear}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-all hover:border-amber-500/30 hover:bg-amber-500/15 hover:text-amber-400 active:scale-95"
                >
                  <Eraser size={14} />
                </button>
              </Tooltip>
            )}

            <div className="mx-1 h-4 w-px bg-border/60" />

            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Editor Main Canvas & Gutter */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0b0f19]/90 dark:bg-[#070a12]/95">
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="no-scrollbar w-12 flex-shrink-0 select-none overflow-y-hidden border-r border-border/40 bg-black/25 py-3 pr-2.5 text-right font-mono text-[12px] leading-[22px] text-muted-foreground/35"
              aria-hidden="true"
            >
              {lines.map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    'transition-colors',
                    i + 1 === cursorPos.line && 'font-bold text-primary/80'
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code / Text Area */}
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => {
                handleChange(e);
                updateCursorPosition();
              }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onSelect={updateCursorPosition}
              onClick={updateCursorPosition}
              onKeyUp={updateCursorPosition}
              onContextMenu={onContextMenu}
              wrap={wordWrap ? 'soft' : 'off'}
              spellCheck={false}
              autoFocus
              className="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-[22px] text-foreground transition-all placeholder:text-muted-foreground/40 focus:outline-none"
              placeholder={t('common.typeHere', { defaultValue: '...' })}
            />
          </div>

          {/* IDE Status Bar */}
          <div className="flex flex-shrink-0 select-none items-center justify-between border-t border-border/50 bg-black/35 px-3 py-1.5 font-mono text-[11px] text-muted-foreground/75">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-semibold text-primary/90">
                {t('editor.line')} {cursorPos.line}, {t('editor.col')} {cursorPos.col}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                {lines.length} {t('editor.lines')}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                {editedContent.length} {t('editor.chars')}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                {wordCount} {t('editor.words')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground/60">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">UTF-8</span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
          <span className="hidden font-mono text-[11px] text-muted-foreground/60 sm:inline-block">
            {t('editor.saveShortcutHint')}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => onSave(editedContent)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/35 active:scale-[0.98]"
            >
              <Save size={14} />
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>

      {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} options={options} onClose={closeMenu} />}
    </div>
  );
};
