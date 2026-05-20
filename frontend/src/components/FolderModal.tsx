import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
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

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setSelectedIcon(initialIcon || 'Folder');
      setSelectedColor(initialColor || '');
    }
  }, [isOpen, initialName, initialIcon, initialColor]);

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50 duration-200">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 bg-white/5 p-4">
          <h3 className="text-lg font-bold text-white">
            {mode === 'create' ? t('folders.createNew') : t('folders.rename')}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">
              {t('folders.folderName')}
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Projects"
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                Select Identity
              </label>
              <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-2 py-0.5">
                {selectedIcon &&
                  IconMap[selectedIcon] &&
                  React.createElement(IconMap[selectedIcon], {
                    size: 14,
                    style: { color: selectedColor || undefined },
                  })}
                <span className="font-mono text-[10px] text-white/60">{selectedIcon}</span>
              </div>
            </div>

            {/* Icons Grid - Cyber */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-tight text-cyan-400">
                Cyber Gradients
              </span>
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
            </div>

            {/* Icons Grid - Mono */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-tight text-white/30">
                Minimalist Mono
              </span>
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
        <div className="flex items-center justify-end gap-3 border-t border-white/5 bg-white/5 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(name, selectedIcon, selectedColor)}
            disabled={!name.trim()}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 transition-all hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />
            {mode === 'create' ? t('common.create') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
