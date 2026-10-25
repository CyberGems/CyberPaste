import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  Flame,
  Star,
  Leaf,
  Droplets,
  Cloud,
  Moon,
  Music,
  Shield,
  Cpu,
  Database,
  Globe,
  Lock,
  Terminal,
  Code,
  Command,
  Compass,
  HardDrive,
  Ghost,
  Activity,
  Folder,
  FolderHeart,
  FolderSync,
  FolderOpen,
  FolderLock,
  Archive,
  Briefcase,
  Bookmark,
  Tag,
  Inbox,
  Layers,
  Layout,
  Library,
  Package,
  Paperclip,
  Puzzle,
  Settings,
  Share2,
  Smile,
  Sun,
} from 'lucide-react';
import { FOLDER_ICONS } from '../constants';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { ContextMenu } from './ContextMenu';
import { useTextFieldContextMenu } from '../hooks/useTextFieldContextMenu';
import { EnterGlyph, EscGlyph, useModalKeys } from './ModalActions';
import Tooltip from './Tooltip';

const IconMap: Record<string, any> = {
  Zap,
  Flame,
  Star,
  Leaf,
  Droplets,
  Cloud,
  Moon,
  Music,
  Shield,
  Cpu,
  Database,
  Globe,
  Lock,
  Terminal,
  Code,
  Command,
  Compass,
  HardDrive,
  Ghost,
  Activity,
  Folder,
  FolderHeart,
  FolderSync,
  FolderOpen,
  FolderLock,
  Archive,
  Briefcase,
  Bookmark,
  Tag,
  Inbox,
  Layers,
  Layout,
  Library,
  Package,
  Paperclip,
  Puzzle,
  Settings,
  Share2,
  Smile,
  Sun,
};

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon?: string, color?: string) => void;
  initialName?: string;
  initialIcon?: string;
  initialColor?: string;
  mode: 'create' | 'rename';
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialIcon = 'Folder',
  initialColor = '',
  mode,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { menuPos, options, closeMenu, onContextMenu, handleChange, resetHistory } =
    useTextFieldContextMenu(nameInputRef, name, setName);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      resetHistory(initialName);
      setSelectedIcon(initialIcon || 'Folder');
      setSelectedColor(initialColor || '');
    }
  }, [isOpen, initialName, initialIcon, initialColor, resetHistory]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    onSave(name, selectedIcon, selectedColor);
  }, [name, onSave, selectedColor, selectedIcon]);

  useModalKeys({
    enabled: isOpen,
    onEsc: onClose,
    onEnter: handleSave,
  });

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in xs:p-2 fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-1.5 backdrop-blur-sm duration-200 sm:p-4">
      <div
        className="animate-in zoom-in-95 flex max-h-[calc(100vh-12px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-primary/20 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] duration-300 sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 text-primary">
            <Folder className="shrink-0" size={16} />
            <h3 className="truncate text-xs font-bold leading-none tracking-tight sm:text-sm">
              {mode === 'create' ? t('folders.createNew') : t('folders.rename')}
            </h3>
          </div>
          <Tooltip label={t('common.close')} placement="bottom">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:p-1.5"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-3.5 sm:space-y-6 sm:p-5">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">
              {t('folders.folderName')}
            </label>
            <input
              ref={nameInputRef}
              autoFocus
              type="text"
              value={name}
              onChange={handleChange}
              onContextMenu={onContextMenu}
              placeholder={t('folders.folderNamePlaceholder')}
              className="w-full rounded-xl border border-border bg-background p-3 text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-muted-foreground">
                  {t('folders.iconLabel')}
                </label>
                <p className="text-[11px] text-muted-foreground">{t('folders.iconHelper')}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1">
                {selectedIcon &&
                  IconMap[selectedIcon] &&
                  React.createElement(IconMap[selectedIcon], {
                    size: 14,
                    style: { color: selectedColor || undefined },
                  })}
                <span className="max-w-[120px] truncate font-mono text-[10px] text-foreground/80">
                  {name.trim() ||
                    (selectedIcon === 'Folder' ? t('folders.defaultIcon') : selectedIcon)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Icons Grid - Cyber */}
              <div className="grid grid-cols-10 gap-2">
                {FOLDER_ICONS.cyber.map((item, i) => {
                  const Icon = IconMap[item.id] || Zap;
                  return (
                    <button
                      key={`cyber-${i}`}
                      onClick={() => {
                        setSelectedIcon(item.id);
                        setSelectedColor(item.color);
                      }}
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:scale-110',
                        selectedIcon === item.id && selectedColor === item.color
                          ? 'border-cyan-500/60 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                          : 'border-border/60 bg-muted/40 hover:border-primary/40 hover:bg-muted'
                      )}
                    >
                      <Icon size={16} style={{ color: item.color }} />
                    </button>
                  );
                })}
              </div>

              {/* Icons Grid - Mono */}
              <div className="grid grid-cols-10 gap-2">
                {FOLDER_ICONS.mono.map((iconName) => {
                  const Icon = IconMap[iconName] || Folder;
                  return (
                    <button
                      key={`mono-${iconName}`}
                      onClick={() => {
                        setSelectedIcon(iconName);
                        setSelectedColor('');
                      }}
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:scale-110',
                        selectedIcon === iconName && !selectedColor
                          ? 'border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
                          : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            {t('common.cancel')}
            <EscGlyph />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === 'create' ? t('common.create') : t('common.save')}
            <EnterGlyph />
          </button>
        </div>
      </div>

      {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} options={options} onClose={closeMenu} />}
    </div>
  );
};
