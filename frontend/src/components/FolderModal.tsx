import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Save,
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

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2 text-primary">
            <Folder className="shrink-0" size={18} />
            <h3 className="whitespace-nowrap text-sm font-bold leading-none tracking-tight">
              {mode === 'create' ? t('folders.createNew') : t('folders.rename')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40">
              {t('folders.folderName')}
            </label>
            <input
              ref={nameInputRef}
              autoFocus
              type="text"
              value={name}
              onChange={handleChange}
              onContextMenu={onContextMenu}
              placeholder="e.g. Work Projects"
              className="w-full rounded-xl border border-border bg-background/50 p-3 text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-white/40">
                  {t('folders.iconLabel')}
                </label>
                <p className="text-[11px] text-muted-foreground/50">
                  {t('folders.iconHelper')}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-2 py-0.5">
                {selectedIcon &&
                  IconMap[selectedIcon] &&
                  React.createElement(IconMap[selectedIcon], {
                    size: 14,
                    style: { color: selectedColor || undefined },
                  })}
                <span className="max-w-[120px] truncate font-mono text-[10px] text-white/60">
                  {name.trim() || selectedIcon}
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
                          ? 'border-cyan-500/50 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'border-white/5 bg-white/5 hover:border-white/20'
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
                          ? 'border-white/40 bg-white/20'
                          : 'border-white/5 bg-white/5 text-white/60 hover:border-white/20'
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
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-white/5"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(name, selectedIcon, selectedColor)}
            disabled={!name.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === 'create' ? <Check size={14} /> : <Save size={14} />}
            {mode === 'create' ? t('common.create') : t('common.save')}
          </button>
        </div>
      </div>

      {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} options={options} onClose={closeMenu} />}
    </div>
  );
};
