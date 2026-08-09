import { Settings, FolderItem } from '../types';
import {
  X,
  Trash2,
  Plus,
  FolderOpen,
  Settings as SettingsIcon,
  BrainCircuit,
  Folder as FolderIcon,
  MoreHorizontal,
  Eye,
  EyeOff,
  Maximize2,
  Square,
  Info,
  ExternalLink,
  Terminal,
  Heart,
  RotateCcw,
  Volume2,
  Clipboard,
  Layout,
  Command,
  Lock,
  Database,
  Bell,
  Layers,
  Monitor,
  Clock,
  Send,
  Languages,
  Palette,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { Wrench } from 'lucide-react';
import { getCurrentWindow, availableMonitors } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check } from '@tauri-apps/plugin-updater';
import { systemToast as toast } from '../utils/toast';
import { ConfirmDialog } from './ConfirmDialog';
import { UpdateModal } from './UpdateModal';
import { Select } from './ui/Select';
import { ThemeCard, ThemeMode } from './ThemeCard';
import { useShortcutRecorder } from 'use-shortcut-recorder';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';


interface SettingsPanelProps {
  settings: Settings;
  onClose: () => void;
}

type Tab = 'general' | 'folders' | 'full' | 'compact' | 'ai' | 'notifications' | 'maintenance' | 'about';

function PromptEditor({
  label,
  value,
  titleValue,
  placeholder,
  onSave,
  onSaveTitle,
}: {
  label: string;
  value: string;
  titleValue?: string;
  placeholder: string;
  onSave: (val: string) => void;
  onSaveTitle?: (val: string) => void;
}) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(value);
  const [localTitle, setLocalTitle] = useState(titleValue || label);

  // Sync with prop if it changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    setLocalTitle(titleValue || label);
  }, [titleValue, label]);

  return (
    <div className="space-y-2 rounded-[4px] border border-border bg-secondary p-3">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={() => {
            if (onSaveTitle && localTitle !== (titleValue || label)) {
              onSaveTitle(localTitle);
            }
          }}
          className="bg-transparent text-xs font-semibold text-foreground/70 outline-none transition-colors focus:text-primary"
          title={t('settings.clickToRename')}
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {t('settings.actionName')}
        </span>
      </div>
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) {
            onSave(localValue);
          }
        }}
        placeholder={placeholder}
        className="min-h-[60px] w-full resize-none rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground transition-all placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
      />
    </div>
  );
}

const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'gpt-4o (Most Capable)' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Fast & Cheap)' },
    { value: 'o1', label: 'o1 (Reasoning)' },
    { value: 'o1-mini', label: 'o1-mini (Reasoning)' },
    { value: 'o3-mini', label: 'o3-mini (Recent Reasoning)' },
    { value: 'custom', label: 'Custom Model...' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'deepseek-chat (V3 / R1)' },
    { value: 'deepseek-reasoner', label: 'deepseek-reasoner (R1)' },
    { value: 'custom', label: 'Custom Model...' },
  ],
  kimi: [
    { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k' },
    { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k' },
    { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k' },
    { value: 'custom', label: 'Custom Model...' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'custom', label: 'Custom Model...' },
  ],
  custom: [{ value: 'custom', label: 'Custom Model...' }],
};

export function SettingsPanel({ settings: initialSettings, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as Tab;
      if (
        ['general', 'full', 'compact', 'ai', 'notifications', 'maintenance', 'about'].includes(
          tabParam
        )
      ) {
        return tabParam;
      }
    }
    return 'general';
  });
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [_historySize, setHistorySize] = useState<number>(0);
  const [recordingTarget, setRecordingTarget] = useState<'hotkey' | 'view_mode_hotkey' | null>(
    null
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [monitorList, setMonitorList] = useState<{ name: string; index: number }[]>([]);

  useEffect(() => {
    getVersion().then(setAppVersion);
    availableMonitors()
      .then((monitors: any[]) => {
        setMonitorList(
          monitors.map((m: any, i: number) => ({
            name: m.name || `Monitor ${i + 1}`,
            index: i + 1,
          }))
        );
      })
      .catch(console.error);

    // Initial pause state
    invoke<boolean>('is_clipboard_monitoring_paused').then(setIsPaused).catch(console.error);
  }, []);

  useEffect(() => {
    const unlisten = listen<string>('open-tab', (event) => {
      const tab = event.payload as Tab;
      if (
        ['general', 'folders', 'full', 'compact', 'ai', 'notifications', 'maintenance', 'about'].includes(tab)
      ) {
        setActiveTab(tab);
      }
    });
    const unlistenPause = listen<boolean>('clipboard-pause-changed', (event) => {
      setIsPaused(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
      unlistenPause.then((f) => f());
    };
  }, []);

  const openDataDir = async () => {
    try {
      const dataDir = await invoke<string>('get_data_dir_path');
      await invoke('show_item_in_folder', { path: dataDir });
    } catch (e) {
      console.error('Failed to open data dir:', e);
      toast.error(t('settings.failedToOpenDataDir'));
    }
  };

  const openConsole = async () => {
    try {
      await invoke('open_devtools');
    } catch (e) {
      console.error('Failed to open console:', e);
      toast.error(t('settings.failedToOpenConsole'));
    }
  };
  const [localApiKey, setLocalApiKey] = useState(initialSettings.ai_api_key || '');
  const [localBaseUrl, setLocalBaseUrl] = useState(initialSettings.ai_base_url || '');
  const [localModel, setLocalModel] = useState(initialSettings.ai_model || 'gpt-3.5-turbo');
  const [isCustomModel, setIsCustomModel] = useState(() => {
    const provider = initialSettings.ai_provider || 'openai';
    const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.custom;
    return !models.some((m) => m.value === initialSettings.ai_model);
  });
  // Folder Management State
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMaximize = async () => {
    const win = getCurrentWindow();
    await win.toggleMaximize();
    const maximized = await win.isMaximized();
    setIsMaximized(maximized);
  };

  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized);

    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Apply theme immediately when settings.theme changes
  useTheme(settings.theme);

  // i18n hook
  const { i18n, t } = useTranslation();

  const handleTogglePause = () => {
    invoke('toggle_clipboard_monitoring').catch(console.error);
  };

  // Generic handler for immediate settings updates
  const updateSettings = async (updates: Partial<Settings>) => {
    // Determine the next state before updating React state
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };

      // Schedule async actions - we use newSettings which is local to this scope
      // This avoids race conditions with 'settings' variable
      (async () => {
        try {
          await invoke('save_settings', { settings: newSettings });
          await emit('settings-changed', newSettings);

          if (updates.hotkey) {
            await invoke('register_global_shortcut', { hotkey: updates.hotkey });
          }
          if ('round_corners' in updates || 'theme' in updates) {
            await invoke('refresh_window');
          }
        } catch (error) {
          console.error(`Failed to save settings:`, error);
          toast.error(t('settings.failedToSave'));
        }
      })();

      // Feedback for changes
      const SETTING_LABELS: Record<string, string> = {
        startup_with_windows: 'settings.startupWithWindows',
        ignore_ghost_clips: 'settings.ignoreGhostClips',
        clipboard_sound_enabled: 'settings.clipboardSound',
        auto_paste: 'settings.autoPaste',
        auto_inject_paste: 'settings.autoInjectPaste',
        reset_view_on_paste: 'settings.resetViewOnPaste',
        compact_sidebar_collapsed: 'settings.compactSidebarCollapsed',
        type_to_search: 'settings.typeToSearch',
        compact_peek_enabled: 'settings.compactPeekEnabled',
        compact_show_source_icon: 'settings.compactShowSourceIcon',
        compact_show_time: 'settings.compactShowTime',
        compact_show_type_icon: 'settings.compactShowTypeIcon',
        compact_show_number: 'settings.compactShowNumber',
        full_show_hud: 'settings.fullShowHud',
        full_grid_scale: 'settings.fullGridScale',
        full_grid_columns: 'settings.fullGridColumns',
        full_scroll_direction: 'settings.fullScrollDirection',
        full_show_source_icon: 'settings.fullShowSourceIcon',
        full_show_time: 'settings.fullShowTime',
        full_show_type_icon: 'settings.fullShowTypeIcon',
        full_show_number: 'settings.fullShowNumber',
        full_type_filter: 'settings.fullTypeFilter',
        toast_enabled: 'settings.toastEnabled',
        duplicate_toast_enabled: 'settings.duplicateToasts',
        show_action_messages: 'settings.showActionMessages',
        auto_check_updates: 'settings.autoCheckUpdates',
        round_corners: 'settings.roundCorners',
        max_items: 'settings.historyLimit',
        scroll_direction: 'settings.scrollDirection',
        compact_folder_layout: 'settings.compactFolderLayout',
        compact_view_position_mode: 'settings.compactViewPosition',
        clip_numbering: 'settings.clipNumbering',
        language: 'settings.language',
        image_editor_path: 'settings.externalImageEditor',
        clipboard_sound_path: 'settings.clipboardSound',
        startup_sound_enabled: 'settings.startupSound',
        startup_sound_path: 'settings.startupSound',
        toast_monitor: 'settings.toastMonitor',
        toast_position: 'settings.toastPosition',
        toast_duration: 'settings.toastDuration',
        toast_click_action: 'settings.toastClickAction',
        wheel_folder_navigation: 'settings.wheelFolderNavigation',
      };

      const keys = Object.keys(updates);
      if (keys.length === 1) {
        const key = keys[0] as keyof Settings;
        const value = updates[key];
        if (key !== 'theme') {
          const translationKey = SETTING_LABELS[key];
          const label = translationKey ? t(translationKey) : key;
          if (typeof value === 'boolean') {
            toast.success(`${label}: ${value ? t('common.enabled') : t('common.disabled')}`);
          } else {
            toast.success(`${label} ${t('common.updated')}`);
          }
        }
      } else if (keys.length > 1) {
        toast.success(t('settings.layoutRestored'));
      }

      return newSettings;
    });
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    updateSettings({ [key]: value });
  };

  const handleThemeChange = (newTheme: string) => {
    updateSetting('theme', newTheme);
  };

  const handleLanguageChange = (newLanguage: string) => {
    updateSetting('language', newLanguage);
    // Change language immediately
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('cyberpaste_language', newLanguage);
  };

  // Use use-shortcut-recorder for recording (shows current keys held in real-time)
  const {
    shortcut,
    savedShortcut,
    startRecording: startRecordingLib,
    stopRecording: stopRecordingLib,
    clearLastRecording,
  } = useShortcutRecorder({
    minModKeys: 1, // Require at least one modifier
  });

  // Start recording mode
  const handleStartRecording = (target: 'hotkey' | 'view_mode_hotkey') => {
    setRecordingTarget(target);
    startRecordingLib();
  };

  const [ignoredApps, setIgnoredApps] = useState<string[]>([]);
  const [newIgnoredApp, setNewIgnoredApp] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const loadFolders = async () => {
    try {
      const data = await invoke<FolderItem[]>('get_folders');
      setFolders(data);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  useEffect(() => {
    invoke<number>('get_clipboard_history_size').then(setHistorySize).catch(console.error);
    invoke<string[]>('get_ignored_apps').then(setIgnoredApps).catch(console.error);
    loadFolders();

    // Auto-migrate Kimi legacy base URL from .cn to .ai if currently set
    if (
      initialSettings.ai_provider === 'kimi' &&
      initialSettings.ai_base_url === 'https://api.moonshot.cn/v1'
    ) {
      updateSettings({
        ai_base_url: 'https://api.moonshot.ai/v1',
      });
      setLocalBaseUrl('https://api.moonshot.ai/v1');
    }
  }, []);

  const handleAddIgnoredApp = async () => {
    if (!newIgnoredApp.trim()) return;
    try {
      await invoke('add_ignored_app', { appName: newIgnoredApp.trim() });
      setIgnoredApps((prev) => [...prev, newIgnoredApp.trim()].sort());
      setNewIgnoredApp('');
      toast.success(t('settings.addedToIgnored', { name: newIgnoredApp.trim() }));
    } catch (e) {
      toast.error(t('settings.failedToAddIgnored', { error: e }));
      console.error(e);
    }
  };

  const handleBrowseFile = async () => {
    try {
      const path = await invoke<string>('pick_file', {
        filterName: 'Executables',
        extensions: ['exe', 'app'],
      });
      const filename = path.split(/[\\/]/).pop() || path;
      setNewIgnoredApp(filename);
    } catch (e) {
      console.log('File picker cancelled or failed', e);
    }
  };

  const handleRemoveIgnoredApp = async (app: string) => {
    try {
      await invoke('remove_ignored_app', { appName: app });
      setIgnoredApps((prev) => prev.filter((a) => a !== app));
      toast.success(t('settings.removedFromIgnored', { app }));
    } catch (e) {
      toast.error(t('settings.failedToRemoveIgnored', { error: e }));
      console.error(e);
    }
  };

  const confirmClearHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: t('settings.clearHistory'),
      message: t('settings.clearHistoryMessage'),
      action: async () => {
        try {
          await invoke('clear_all_clips');
          await emit('clipboard-change');
          setHistorySize(0);
          toast.success(t('settings.clearHistorySuccess'));
        } catch (error) {
          console.error('Failed to clear history:', error);
          toast.error(t('settings.failedToClearHistory', { error }));
        }
      },
    });
  };

  // Folder Management Functions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await invoke('create_folder', { name: newFolderName.trim(), icon: null, color: null });
      setNewFolderName('');
      await loadFolders();
      toast.success(t('settings.folderCreatedToast'));
    } catch (e) {
      toast.error(t('settings.failedToCreateFolder', { error: e }));
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await invoke('delete_folder', { id });
      await loadFolders();
      toast.success(t('settings.folderDeletedToast'));
    } catch (e) {
      toast.error(t('settings.failedToDeleteFolder', { error: e }));
    }
  };

  const startRenameFolder = (folder: FolderItem) => {
    setEditingFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const saveRenameFolder = async () => {
    if (!editingFolderId || !renameValue.trim()) return;
    try {
      await invoke('rename_folder', { id: editingFolderId, name: renameValue.trim() });
      setEditingFolderId(null);
      setRenameValue('');
      await loadFolders();
      toast.success(t('settings.folderRenamedToast'));
    } catch (e) {
      toast.error(t('settings.failedToRenameFolder', { error: e }));
    }
  };

  // Format shortcut array into Tauri-compatible string
  const formatHotkey = (keys: string[]): string => {
    return keys
      .map((k) => {
        if (k === 'Control') return 'Ctrl';
        if (k === 'Alt') return 'Alt';
        if (k === 'Shift') return 'Shift';
        if (k === 'Meta') return 'Cmd';
        if (k.startsWith('Key')) return k.slice(3);
        if (k.startsWith('Digit')) return k.slice(5);
        return k;
      })
      .join('+');
  };

  const handleSaveHotkey = async () => {
    if (savedShortcut.length > 0 && recordingTarget) {
      const newHotkey = formatHotkey(savedShortcut);
      await updateSetting(recordingTarget, newHotkey);
    }
    stopRecordingLib();
    setRecordingTarget(null);
  };

  const handleCancelRecording = () => {
    stopRecordingLib();
    clearLastRecording();
    setRecordingTarget(null);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
      <div className="flex h-full select-none flex-col bg-background text-foreground">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex cursor-default items-center justify-between border-b border-border bg-transparent px-4 py-3"
        >
          <div data-tauri-drag-region className="pointer-events-none flex items-center gap-3">
            <img src="/logo.png" alt="CyberPaste" className="h-5 w-5 object-contain" />
            <h2 className="text-[18px] font-bold tracking-tight text-foreground">CyberPaste</h2>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip label={isMaximized ? t('common.restore') : t('common.maximize')} placement="bottom">
              <button
                onClick={toggleMaximize}
                className="icon-button flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent/50"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isMaximized ? (
                  <Square size={14} className="opacity-70" />
                ) : (
                  <Maximize2 size={14} className="opacity-70" />
                )}
              </button>
            </Tooltip>
            <button
              onClick={onClose}
              className="icon-button flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-destructive/20 hover:text-destructive"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[150px] flex-shrink-0 border-r border-border bg-transparent px-2.5 py-3.5">
            <div className="mb-4 px-2.5">
              <h1 className="text-[14px] font-bold tracking-tight text-foreground">
                {t('settings.title')}
              </h1>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab('general')}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'general'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <SettingsIcon size={14} />
                {t('settings.general')}
              </button>
              <button
                onClick={() => setActiveTab('folders')}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'folders'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <FolderIcon size={14} />
                {t('settings.folders')}
              </button>
              <button
                onClick={() => setActiveTab('full')}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'full'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Maximize2 size={14} />
                {t('settings.fullTab')}
              </button>
              <button
                onClick={() => setActiveTab('compact')}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'compact'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Layers size={14} />
                {t('settings.compactTab')}
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={clsx(
                  'flex items-center gap-2 rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'ai'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <BrainCircuit size={14} />
                {t('settings.ai')}
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={clsx(
                  'flex items-center gap-2 rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'notifications'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Bell size={14} />
                {t('settings.toasts')}
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={clsx(
                  'flex items-center gap-2 rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                  activeTab === 'maintenance'
                    ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Wrench size={14} />
                {t('settings.maintenance')}
              </button>
              <div className="mt-auto border-t border-border pt-4">
                <button
                  onClick={() => setActiveTab('about')}
                  className={clsx(
                    'flex items-center gap-2 rounded-[4px] px-[9px] py-2 text-[12px] font-medium transition-all duration-150',
                    activeTab === 'about'
                      ? 'border-l-[3px] border-primary bg-primary/10 text-primary shadow-none'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Info size={14} />
                  {t('settings.about')}
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
            <div className="w-full space-y-8">
              {/* --- GENERAL TAB --- */}
              {activeTab === 'general' && (
                <>
                  {/* Appearance */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <SettingsIcon size={14} /> {t('settings.appearanceSection')}
                    </h3>
                    <div className="rounded-xl border border-border bg-card divide-y divide-border">
                      {/* Row 1: Language */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                        <div className="flex gap-3">
                          <Languages className="h-5 w-5 text-muted-foreground/80 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium block text-foreground">{t('settings.languageTitle')}</span>
                            <span className="text-xs text-muted-foreground block mt-0.5">{t('settings.languageDesc')}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-[200px]">
                          <Select
                            value={settings.language || 'en'}
                            onChange={handleLanguageChange}
                            options={[
                              { value: 'de', label: 'Deutsch' },
                              { value: 'en', label: 'English' },
                              { value: 'es', label: 'Español' },
                              { value: 'fr', label: 'Francais' },
                              { value: 'ja', label: '日本語' },
                              { value: 'zh', label: '中文' },
                            ]}
                          />
                        </div>
                      </div>

                      {/* Row 2: Theme */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4">
                        <div className="flex gap-3">
                          <Palette className="h-5 w-5 text-muted-foreground/80 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium block text-foreground">{t('settings.themeTitle')}</span>
                            <span className="text-xs text-muted-foreground block mt-0.5">{t('settings.themeDesc')}</span>
                          </div>
                        </div>
                        <div role="radiogroup" className="flex flex-wrap gap-4 pt-1 flex-shrink-0">
                          {(['cyberpaste', 'dark', 'light', 'system'] as ThemeMode[]).map(
                            (mode) => (
                              <ThemeCard
                                key={mode}
                                mode={mode}
                                caption={
                                  mode === 'cyberpaste'
                                    ? 'CyberPaste'
                                    : t(
                                        `settings.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`
                                      )
                                }
                                selected={settings.theme === mode}
                                onSelect={(m) => handleThemeChange(m)}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div>
                      <span className="text-sm font-medium">
                        {t('settings.startupWithWindows')}
                      </span>
                      <p className="text-sm text-muted-foreground/80">
                        {t('settings.startupWithWindowsDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSetting('startup_with_windows', !settings.startup_with_windows)
                      }
                      className={`h-6 w-11 rounded-full transition-colors ${settings.startup_with_windows ? 'bg-primary' : 'bg-white/10'}`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings.startup_with_windows ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>

                  {/* Clipboard & Capture */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Clipboard size={14} /> {t('settings.clipboardCapture')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-sm font-medium">{t('settings.historyLimit')}</span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.historyLimitDesc')}
                          </p>
                        </label>
                        <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-accent/10 p-3">
                          <input
                            type="range"
                            min="50"
                            max="1000"
                            step="50"
                            value={settings.max_items || 300}
                            onChange={(e) => updateSetting('max_items', parseInt(e.target.value))}
                            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-accent accent-primary"
                          />
                          <span className="min-w-[3rem] rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-center font-mono text-sm font-bold text-primary shadow-sm">
                            {settings.max_items || 300}
                          </span>
                        </div>
                      </div>
                      <div className="border-b border-border/60 pb-4">
                        <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                          <div>
                            <span className="text-sm font-medium">
                              {t('settings.pauseMonitoring')}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {t('settings.pauseMonitoringDesc')}
                            </p>
                          </div>
                          <button
                            onClick={handleTogglePause}
                            className={`h-6 w-11 rounded-full transition-colors ${isPaused ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <div
                              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isPaused ? 'translate-x-5' : 'translate-x-0.5'}`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div>
                          <span className="text-sm font-medium">{t('settings.autoPaste')}</span>
                          <p className="text-sm text-muted-foreground/80">
                            {t('settings.autoPasteDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const enabled = !settings.auto_paste;
                            updateSettings({
                              auto_paste: enabled,
                              ...(!enabled ? { auto_inject_paste: false } : {}),
                            });
                          }}
                          className={`h-6 w-11 rounded-full transition-colors ${settings.auto_paste ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings.auto_paste ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                      <div className="ml-4 flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div className="min-w-0 flex-1 pr-4">
                          <span className="text-sm font-medium">
                            {t('settings.autoInjectPaste')}
                          </span>
                          <p className="text-sm text-muted-foreground/80">
                            {t('settings.autoInjectPasteDesc')}
                          </p>
                        </div>
                        <button
                          disabled={!settings.auto_paste}
                          onClick={() =>
                            updateSetting('auto_inject_paste', !settings.auto_inject_paste)
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${
                            !settings.auto_paste
                              ? 'cursor-not-allowed bg-white/5 opacity-40'
                              : settings.auto_inject_paste
                                ? 'bg-primary'
                                : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              settings.auto_paste && settings.auto_inject_paste
                                ? 'translate-x-5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div>
                          <span className="text-sm font-medium">{t('settings.typeToSearch')}</span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.typeToSearchDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting('type_to_search', !(settings.type_to_search ?? true))
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${(settings.type_to_search ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.type_to_search ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div className="min-w-0 flex-1 pr-4">
                          <span className="text-sm font-medium">
                            {t('settings.resetViewOnPaste')}
                          </span>
                          <p className="text-sm text-muted-foreground/80">
                            {t('settings.resetViewOnPasteDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting('reset_view_on_paste', !settings.reset_view_on_paste)
                          }
                          className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${settings.reset_view_on_paste ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings.reset_view_on_paste ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-sm font-medium">
                            {t('settings.externalImageEditor')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.externalImageEditorDesc')}
                          </p>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={settings.image_editor_path || ''}
                            onChange={(e) => updateSetting('image_editor_path', e.target.value)}
                            placeholder={t('settings.externalViewerPlaceholder')}
                            className="flex-1 rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                          />
                          <button
                            onClick={async () => {
                              try {
                                const path = await invoke<string>('pick_file', {
                                  filterName: 'Executables',
                                  extensions: ['exe', 'app'],
                                });
                                if (path) updateSetting('image_editor_path', path);
                              } catch (e) {}
                            }}
                            className="rounded-[4px] bg-accent px-3 py-2 text-sm font-medium transition-all hover:bg-accent/80"
                          >
                            {t('common.browse')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Sounds */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Volume2 size={14} /> {t('settings.soundsSection')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      {/* Clipboard Sound Group */}
                      <div className="flex flex-col gap-2 rounded-[4px] border border-border bg-secondary p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              {t('settings.clipboardSound')}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {t('settings.clipboardSoundDesc')}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              updateSetting(
                                'clipboard_sound_enabled',
                                !(settings.clipboard_sound_enabled ?? false)
                              )
                            }
                            className={`h-6 w-11 rounded-full transition-colors ${(settings.clipboard_sound_enabled ?? false) ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <span
                              className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.clipboard_sound_enabled ?? false) ? 'translate-x-5' : 'translate-x-0.5'}`}
                            />
                          </button>
                        </div>
                        {(settings.clipboard_sound_enabled ?? false) && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={settings.clipboard_sound_path || ''}
                              onChange={(e) =>
                                updateSetting('clipboard_sound_path', e.target.value)
                              }
                              placeholder={t('settings.soundPathPlaceholder')}
                              className="h-8 flex-1 rounded-[4px] border border-border bg-input px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  const path = await invoke<string>('pick_file', {
                                    filterName: 'Sound Files',
                                    extensions: ['wav', 'mp3'],
                                  });
                                  if (path) updateSetting('clipboard_sound_path', path);
                                } catch (e) {
                                  if (e !== 'No file selected') console.error(e);
                                }
                              }}
                              className="flex h-8 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent px-3 text-xs font-medium transition-all hover:bg-accent/80"
                            >
                              {t('common.browse')}
                            </button>
                            {settings.clipboard_sound_path && (
                              <Tooltip label={t('common.reset', { defaultValue: 'Reset to default' })} placement="top">
                                <button
                                  onClick={() => updateSetting('clipboard_sound_path', '')}
                                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent text-foreground transition-all hover:bg-accent/80"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip label={t('settings.previewSound')} placement="top">
                              <button
                                onClick={async () => {
                                  try {
                                    await invoke('play_clipboard_sound', {
                                      soundPath: settings.clipboard_sound_path || 'default_capture',
                                    });
                                  } catch (e) {
                                    console.error('Sound preview failed:', e);
                                  }
                                }}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent text-foreground transition-all hover:bg-accent/80"
                              >
                                <Volume2 size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </div>

                      {/* Startup Sound Group */}
                      <div className="flex flex-col gap-2 rounded-[4px] border border-border bg-secondary p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              {t('settings.startupSound')}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {t('settings.startupSoundDesc')}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              updateSetting(
                                'startup_sound_enabled',
                                !(settings.startup_sound_enabled ?? false)
                              )
                            }
                            className={`h-6 w-11 rounded-full transition-colors ${(settings.startup_sound_enabled ?? false) ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <span
                              className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.startup_sound_enabled ?? false) ? 'translate-x-5' : 'translate-x-0.5'}`}
                            />
                          </button>
                        </div>
                        {(settings.startup_sound_enabled ?? false) && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={settings.startup_sound_path || ''}
                              onChange={(e) => updateSetting('startup_sound_path', e.target.value)}
                              placeholder={t('settings.soundPathPlaceholder')}
                              className="h-8 flex-1 rounded-[4px] border border-border bg-input px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  const path = await invoke<string>('pick_file', {
                                    filterName: 'Sound Files',
                                    extensions: ['wav', 'mp3'],
                                  });
                                  if (path) updateSetting('startup_sound_path', path);
                                } catch (e) {
                                  if (e !== 'No file selected') console.error(e);
                                }
                              }}
                              className="flex h-8 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent px-3 text-xs font-medium transition-all hover:bg-accent/80"
                            >
                              {t('common.browse')}
                            </button>
                            {settings.startup_sound_path && (
                              <Tooltip label={t('common.reset', { defaultValue: 'Reset to default' })} placement="top">
                                <button
                                  onClick={() => updateSetting('startup_sound_path', '')}
                                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent text-foreground transition-all hover:bg-accent/80"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip label={t('settings.previewSound')} placement="top">
                              <button
                                onClick={async () => {
                                  try {
                                    await invoke('play_clipboard_sound', {
                                      soundPath: settings.startup_sound_path || 'default_startup',
                                    });
                                  } catch (e) {
                                    console.error('Sound preview failed:', e);
                                  }
                                }}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[4px] bg-accent text-foreground transition-all hover:bg-accent/80"
                              >
                                <Volume2 size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Shortcuts */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Command size={14} /> {t('settings.shortcuts')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-sm font-medium">{t('settings.hotkey')}</span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.hotkeyDesc')}
                          </p>
                        </label>
                        {recordingTarget === 'hotkey' ? (
                          <div className="space-y-2">
                            <div className="flex w-full items-center gap-2 rounded-[4px] border border-primary bg-input px-2.5 py-1.5 text-[12px] text-foreground ring-2 ring-primary">
                              <span className="animate-pulse font-mono text-primary">
                                {shortcut.length > 0
                                  ? formatHotkey(shortcut)
                                  : savedShortcut.length > 0
                                    ? formatHotkey(savedShortcut)
                                    : t('settings.hotkeyRecording')}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveHotkey}
                                disabled={savedShortcut.length === 0}
                                className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
                              >
                                {t('common.save')}
                              </button>
                              <button
                                onClick={handleCancelRecording}
                                className="rounded bg-muted px-3 py-1 text-xs text-muted-foreground"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartRecording('hotkey')}
                            className="group flex w-full items-center gap-2 rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground transition-colors hover:border-ring focus:border-ring focus:outline-none focus:ring-0"
                          >
                            <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-medium transition-colors group-hover:text-primary">
                              {settings.hotkey}
                            </span>
                            <span className="ml-auto text-[10px] italic text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                              {t('settings.hotkeyPlaceholder')}
                            </span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-sm font-medium">
                            {t('settings.viewModeHotkey')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.viewModeHotkeyDesc')}
                          </p>
                        </label>
                        {recordingTarget === 'view_mode_hotkey' ? (
                          <div className="space-y-2">
                            <div className="flex w-full items-center gap-2 rounded-[4px] border border-primary bg-input px-2.5 py-1.5 text-[12px] text-foreground ring-2 ring-primary">
                              <span className="animate-pulse font-mono text-primary">
                                {shortcut.length > 0
                                  ? formatHotkey(shortcut)
                                  : savedShortcut.length > 0
                                    ? formatHotkey(savedShortcut)
                                    : t('settings.hotkeyRecording')}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveHotkey}
                                disabled={savedShortcut.length === 0}
                                className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
                              >
                                {t('common.save')}
                              </button>
                              <button
                                onClick={handleCancelRecording}
                                className="rounded bg-muted px-3 py-1 text-xs text-muted-foreground"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartRecording('view_mode_hotkey')}
                            className="group flex w-full items-center gap-2 rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground transition-colors hover:border-ring focus:border-ring focus:outline-none focus:ring-0"
                          >
                            <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-medium transition-colors group-hover:text-primary">
                              {settings.view_mode_hotkey || 'Ctrl+M'}
                            </span>
                            <span className="ml-auto text-[10px] italic text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                              {t('settings.hotkeyPlaceholder')}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Privacy */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Lock size={14} /> {t('settings.privacy')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <label className="block">
                        <span className="text-sm font-medium">{t('settings.ignoredApps')}</span>
                        <p className="text-sm text-muted-foreground/80">
                          {t('settings.ignoredAppsDesc')}
                        </p>
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newIgnoredApp}
                          onChange={(e) => setNewIgnoredApp(e.target.value)}
                          placeholder={t('settings.ignoredAppPlaceholder')}
                          className="flex-1 rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddIgnoredApp()}
                        />
                        <Tooltip label={t('settings.browseExecutable')} placement="top">
                          <button
                            onClick={handleBrowseFile}
                            className="btn btn-secondary rounded-[4px] px-3"
                          >
                            <FolderOpen size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip label={t('settings.addToList')} placement="top">
                          <button
                            onClick={handleAddIgnoredApp}
                            disabled={!newIgnoredApp.trim()}
                            className="btn btn-secondary rounded-[4px] px-3"
                          >
                            <Plus size={16} />
                          </button>
                        </Tooltip>
                      </div>

                      <div className="custom-scrollbar max-h-40 space-y-1 overflow-y-auto pr-1">
                        {ignoredApps.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-4 text-center">
                            <p className="text-sm text-muted-foreground/80">
                              {t('settings.noIgnoredApps')}
                            </p>
                          </div>
                        ) : (
                          ignoredApps.map((app) => (
                            <div
                              key={app}
                              className="group flex items-center justify-between rounded-md border border-transparent bg-accent/30 px-3 py-2 text-sm hover:border-border hover:bg-accent/50"
                            >
                              <span className="font-mono text-xs">{app}</span>
                              <button
                                onClick={() => handleRemoveIgnoredApp(app)}
                                className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* --- FOLDERS TAB --- */}
              {activeTab === 'folders' && (
                <>
                  {/* Folders Management */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <FolderIcon size={14} /> {t('settings.manageFolders')}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder={t('settings.newFolderPlaceholder')}
                          className="flex-1 rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        />
                        <button
                          onClick={handleCreateFolder}
                          disabled={!newFolderName.trim()}
                          className="btn btn-secondary flex items-center gap-1 rounded-[4px] px-3 py-1.5 text-xs"
                        >
                          <Plus size={14} />
                          {t('settings.add')}
                        </button>
                      </div>

                      <div className="custom-scrollbar max-h-40 space-y-1.5 overflow-y-auto pr-1">
                        {folders.filter((f) => !f.is_system).length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border py-3 text-center text-xs text-muted-foreground">
                            {t('settings.noFolders')}
                          </p>
                        ) : (
                          folders
                            .filter((f) => !f.is_system)
                            .map((folder) => (
                              <div
                                key={folder.id}
                                className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 px-3 py-1.5 text-xs transition-colors hover:border-border hover:bg-card/50"
                              >
                                {editingFolderId === folder.id ? (
                                  <div className="flex flex-1 items-center gap-2">
                                    <input
                                      type="text"
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      className="flex-1 rounded border border-input bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveRenameFolder();
                                        if (e.key === 'Escape') setEditingFolderId(null);
                                      }}
                                    />
                                    <button
                                      onClick={saveRenameFolder}
                                      className="text-xs font-semibold text-primary hover:underline"
                                    >
                                      {t('common.save')}
                                    </button>
                                    <button
                                      onClick={() => setEditingFolderId(null)}
                                      className="text-xs text-muted-foreground hover:underline"
                                    >
                                      {t('common.cancel')}
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                      <FolderIcon
                                        size={14}
                                        className="flex-shrink-0 text-blue-400"
                                      />
                                      <span className="truncate font-medium">{folder.name}</span>
                                      <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                                        {t('folders.itemCount', { count: folder.item_count })}
                                      </span>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-1">
                                      <Tooltip label={t('folders.rename')} placement="top">
                                        <button
                                          onClick={() => startRenameFolder(folder)}
                                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        >
                                          <MoreHorizontal size={13} />
                                        </button>
                                      </Tooltip>
                                      <Tooltip label={t('common.delete')} placement="top">
                                        <button
                                          onClick={() => handleDeleteFolder(folder.id)}
                                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </Tooltip>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Wheel Folder Navigation Option */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Layers size={14} /> {t('settings.appearanceBehavior')}
                    </h3>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                      <div>
                        <span className="text-sm font-medium">
                          {t('settings.wheelFolderNavigation')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('settings.wheelFolderNavigationDesc')}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateSetting('wheel_folder_navigation', !(settings.wheel_folder_navigation ?? false))
                        }
                        className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${(settings.wheel_folder_navigation ?? false) ? 'bg-primary' : 'bg-white/10'}`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.wheel_folder_navigation ?? false) ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>
                  </section>
                </>
              )}

              {/* --- FULL MODE TAB --- */}
              {activeTab === 'full' && (
                <>
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Layout size={14} /> {t('settings.fullLayout')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-base font-medium">
                            {t('settings.fullGridScale')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.fullGridScaleDesc')}
                          </p>
                        </label>
                        <Select
                          value={String(settings.full_grid_scale ?? 1)}
                          onChange={(value) => updateSetting('full_grid_scale', Number(value))}
                          options={[
                            { value: '0.6', label: '60%' },
                            { value: '0.75', label: '75%' },
                            { value: '1', label: '100%' },
                            { value: '1.25', label: '125%' },
                            { value: '1.5', label: '150%' },
                            { value: '1.75', label: '175%' },
                          ]}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-base font-medium">
                            {t('settings.fullGridColumns')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.fullGridColumnsDesc')}
                          </p>
                        </label>
                        <Select
                          value={String(settings.full_grid_columns ?? 0)}
                          onChange={(value) => updateSetting('full_grid_columns', Number(value))}
                          options={[
                            { value: '0', label: t('settings.fullGridColumnsAuto') },
                            ...[2, 3, 4, 5, 6, 7, 8].map((count) => ({
                              value: String(count),
                              label: t('settings.fullGridColumnsCount', { count }),
                            })),
                          ]}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-base font-medium">
                            {t('settings.fullScrollDirection')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.fullScrollDirectionDesc')}
                          </p>
                        </label>
                        <Select
                          value={settings.full_scroll_direction || 'vertical'}
                          onChange={(value) => updateSetting('full_scroll_direction', value)}
                          options={[
                            { value: 'vertical', label: t('settings.scrollVertical') },
                            { value: 'horizontal', label: t('settings.scrollHorizontal') },
                          ]}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Eye size={14} /> {t('settings.fullVisibility')}
                    </h3>
                    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                      {(
                        [
                          ['full_show_hud', 'fullShowHud'],
                          ['full_show_source_icon', 'fullShowSourceIcon'],
                          ['full_show_time', 'fullShowTime'],
                          ['full_show_type_icon', 'fullShowTypeIcon'],
                          ['full_show_number', 'fullShowNumber'],
                        ] as const
                      ).map(([key, translationKey]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3"
                        >
                          <div>
                            <span className="text-sm font-medium">
                              {t(`settings.${translationKey}`)}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {t(`settings.${translationKey}Desc`)}
                            </p>
                          </div>
                          <button
                            onClick={() => updateSetting(key, !(settings[key] ?? true))}
                            className={`h-6 w-11 rounded-full transition-colors ${(settings[key] ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                            aria-label={t(`settings.${translationKey}`)}
                          >
                            <span
                              className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings[key] ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* --- COMPACT MODE TAB --- */}
              {activeTab === 'compact' && (
                <>
                  {/* Layout & Navigation */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Layout size={14} /> {t('settings.layoutNavigation')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <div className="space-y-3 border-b border-border/60 pb-4">
                        <label className="block">
                          <span className="text-base font-medium">
                            {t('settings.compactFolderLayout')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactFolderLayoutDesc')}
                          </p>
                        </label>
                        <Select
                          value={settings.compact_folder_layout || 'vertical'}
                          onChange={(val) => updateSetting('compact_folder_layout', val)}
                          options={[
                            { value: 'horizontal', label: t('settings.scrollHorizontal') },
                            { value: 'vertical', label: t('settings.scrollVertical') },
                          ]}
                        />
                        {(settings.compact_folder_layout || 'vertical') === 'vertical' && (
                          <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                            <div>
                              <span className="text-sm font-medium">
                                {t('settings.compactSidebarCollapsed')}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {t('settings.compactSidebarCollapsedDesc')}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                updateSetting(
                                  'compact_sidebar_collapsed',
                                  !(settings.compact_sidebar_collapsed ?? false)
                                )
                              }
                              className={`h-6 w-11 rounded-full transition-colors ${(settings.compact_sidebar_collapsed ?? false) ? 'bg-primary' : 'bg-white/10'}`}
                            >
                              <span
                                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.compact_sidebar_collapsed ?? false) ? 'translate-x-5' : 'translate-x-0.5'}`}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 border-b border-border/60 pb-4">
                        <label className="block">
                          <span className="text-base font-medium">
                            {t('settings.compactViewPosition')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactViewPositionDesc')}
                          </p>
                        </label>
                        <Select
                          value={settings.compact_view_position_mode || 'auto'}
                          onChange={(val) => updateSetting('compact_view_position_mode', val)}
                          options={[
                            { value: 'auto', label: t('settings.positionAuto') },
                            { value: 'cursor', label: t('settings.positionCursor') },
                            { value: 'caret', label: t('settings.positionCaret') },
                          ]}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-[4px] border border-b border-border border-border/60 bg-secondary p-3 pb-4">
                        <div>
                          <span className="text-sm font-medium">
                            {t('settings.compactPeekEnabled')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactPeekEnabledDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting(
                              'compact_peek_enabled',
                              !(settings.compact_peek_enabled ?? true)
                            )
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${(settings.compact_peek_enabled ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.compact_peek_enabled ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-base font-medium">
                            {t('settings.clipNumbering')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.clipNumberingDesc')}
                          </p>
                        </label>
                        <Select
                          value={settings.clip_numbering || 'positional'}
                          onChange={(val) => updateSetting('clip_numbering', val)}
                          options={[
                            { value: 'positional', label: t('settings.clipNumberingPositional') },
                            { value: 'countdown', label: t('settings.clipNumberingCountdown') },
                          ]}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Visibility Toggles */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <Layers size={14} /> {t('settings.compactVisibility')}
                    </h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      {/* Show Source Icon */}
                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div>
                          <span className="text-sm font-medium">
                            {t('settings.compactShowSourceIcon')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactShowSourceIconDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting(
                              'compact_show_source_icon',
                              !(settings.compact_show_source_icon ?? true)
                            )
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${(settings.compact_show_source_icon ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.compact_show_source_icon ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>

                      {/* Show Capture Time */}
                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div>
                          <span className="text-sm font-medium">
                            {t('settings.compactShowTime')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactShowTimeDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting(
                              'compact_show_time',
                              !(settings.compact_show_time ?? true)
                            )
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${(settings.compact_show_time ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.compact_show_time ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>

                      {/* Show Type Icon */}
                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div>
                          <span className="text-sm font-medium">
                            {t('settings.compactShowTypeIcon')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactShowTypeIconDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting(
                              'compact_show_type_icon',
                              !(settings.compact_show_type_icon ?? true)
                            )
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${(settings.compact_show_type_icon ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.compact_show_type_icon ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>

                      {/* Show Clip Number */}
                      <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                        <div>
                          <span className="text-sm font-medium">
                            {t('settings.compactShowNumber')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.compactShowNumberDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSetting(
                              'compact_show_number',
                              !(settings.compact_show_number ?? true)
                            )
                          }
                          className={`h-6 w-11 rounded-full transition-colors ${(settings.compact_show_number ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.compact_show_number ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* --- AI PROCESSING TAB --- */}
              {activeTab === 'ai' &&
                (() => {
                  const currentProvider = settings.ai_provider || 'openai';
                  const modelsForProvider =
                    PROVIDER_MODELS[currentProvider] || PROVIDER_MODELS.custom;
                  const isPredefinedModel = modelsForProvider.some(
                    (m) => m.value === settings.ai_model
                  );
                  const selectedModelValue = isPredefinedModel ? settings.ai_model || '' : 'custom';

                  return (
                    <>
                      <section className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {t('settings.aiConfiguration')}
                        </h3>

                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-sm font-medium">{t('settings.provider')}</span>
                          </label>
                          <Select
                            value={settings.ai_provider || 'openai'}
                            onChange={(newProvider) => {
                              const updates: Partial<Settings> = { ai_provider: newProvider };

                              // Auto-fill Base URL and Model based on provider
                              if (newProvider === 'openai') {
                                updates.ai_base_url = 'https://api.openai.com/v1';
                                updates.ai_model = 'gpt-4o-mini';
                                setLocalBaseUrl('https://api.openai.com/v1');
                                setLocalModel('gpt-4o-mini');
                                setIsCustomModel(false);
                              } else if (newProvider === 'deepseek') {
                                updates.ai_base_url = 'https://api.deepseek.com';
                                updates.ai_model = 'deepseek-chat';
                                setLocalBaseUrl('https://api.deepseek.com');
                                setLocalModel('deepseek-chat');
                                setIsCustomModel(false);
                              } else if (newProvider === 'kimi') {
                                updates.ai_base_url = 'https://api.moonshot.ai/v1';
                                updates.ai_model = 'moonshot-v1-8k';
                                setLocalBaseUrl('https://api.moonshot.ai/v1');
                                setLocalModel('moonshot-v1-8k');
                                setIsCustomModel(false);
                              } else if (newProvider === 'gemini') {
                                updates.ai_base_url =
                                  'https://generativelanguage.googleapis.com/v1beta/openai';
                                updates.ai_model = 'gemini-2.5-flash';
                                setLocalBaseUrl(
                                  'https://generativelanguage.googleapis.com/v1beta/openai'
                                );
                                setLocalModel('gemini-2.5-flash');
                                setIsCustomModel(false);
                              } else {
                                setIsCustomModel(true);
                              }

                              updateSettings(updates);
                            }}
                            options={[
                              { value: 'openai', label: t('settings.providerOpenAI') },
                              { value: 'deepseek', label: t('settings.providerDeepSeek') },
                              { value: 'kimi', label: t('settings.providerKimi') },
                              { value: 'gemini', label: t('settings.providerGemini') },
                              { value: 'custom', label: t('settings.providerCustom') },
                            ]}
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-sm font-medium">{t('settings.apiKey')}</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              value={localApiKey}
                              onChange={(e) => setLocalApiKey(e.target.value)}
                              onBlur={() => {
                                const trimmed = localApiKey.trim();
                                setLocalApiKey(trimmed);
                                updateSetting('ai_api_key', trimmed);
                              }}
                              placeholder={t('settings.apiKeyPlaceholder')}
                              className="w-full rounded-[4px] border border-border bg-input py-1.5 pl-2.5 pr-10 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-sm font-medium">{t('settings.model')}</span>
                          </label>
                          <Select
                            value={isCustomModel ? 'custom' : selectedModelValue}
                            onChange={(val) => {
                              if (val === 'custom') {
                                setIsCustomModel(true);
                              } else {
                                setIsCustomModel(false);
                                updateSetting('ai_model', val);
                                setLocalModel(val);
                              }
                            }}
                            options={modelsForProvider}
                          />
                          {(isCustomModel || currentProvider === 'custom') && (
                            <input
                              type="text"
                              value={localModel}
                              onChange={(e) => setLocalModel(e.target.value)}
                              onBlur={() => updateSetting('ai_model', localModel)}
                              placeholder={t('settings.modelPlaceholder')}
                              className="mt-2 w-full rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                            />
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-sm font-medium">{t('settings.baseUrl')}</span>
                          </label>
                          <input
                            type="text"
                            value={localBaseUrl}
                            onChange={(e) => setLocalBaseUrl(e.target.value)}
                            onBlur={() => updateSetting('ai_base_url', localBaseUrl)}
                            placeholder={t('settings.baseUrlPlaceholder')}
                            className="w-full rounded-[4px] border border-border bg-input px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
                          />
                        </div>
                      </section>

                      <section className="space-y-4 border-t border-border pt-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {t('settings.customPrompts')}
                        </h3>
                        <p className="text-xs italic text-muted-foreground">
                          {t('settings.customPromptsDesc')}
                        </p>

                        <div className="space-y-4">
                          <PromptEditor
                            label={t('settings.aiSummarize')}
                            value={settings.ai_prompt_summarize || ''}
                            titleValue={settings.ai_title_summarize}
                            onSave={(val) => updateSetting('ai_prompt_summarize', val)}
                            onSaveTitle={(val) => updateSetting('ai_title_summarize', val)}
                            placeholder={t('settings.aiSummarizePlaceholder')}
                          />

                          <PromptEditor
                            label={t('settings.aiTranslate')}
                            value={settings.ai_prompt_translate || ''}
                            titleValue={settings.ai_title_translate}
                            onSave={(val) => updateSetting('ai_prompt_translate', val)}
                            onSaveTitle={(val) => updateSetting('ai_title_translate', val)}
                            placeholder={t('settings.aiTranslatePlaceholder')}
                          />

                          <PromptEditor
                            label={t('settings.aiExplainCode')}
                            value={settings.ai_prompt_explain_code || ''}
                            titleValue={settings.ai_title_explain_code}
                            onSave={(val) => updateSetting('ai_prompt_explain_code', val)}
                            onSaveTitle={(val) => updateSetting('ai_title_explain_code', val)}
                            placeholder={t('settings.aiExplainCodePlaceholder')}
                          />

                          <PromptEditor
                            label={t('settings.aiFixGrammar')}
                            value={settings.ai_prompt_fix_grammar || ''}
                            titleValue={settings.ai_title_fix_grammar}
                            onSave={(val) => updateSetting('ai_prompt_fix_grammar', val)}
                            onSaveTitle={(val) => updateSetting('ai_title_fix_grammar', val)}
                            placeholder={t('settings.aiFixGrammarPlaceholder')}
                          />
                        </div>
                      </section>
                    </>
                  );
                })()}

              {/* --- NOTIFICATIONS TAB --- */}
              {activeTab === 'notifications' && (
                <section className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('settings.toasts')}
                  </h3>

                  <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                    <div>
                      <span className="text-base font-semibold">{t('settings.enableToasts')}</span>
                      <p className="text-sm text-muted-foreground/80">
                        {t('settings.enableToastsDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSetting('toast_enabled', !(settings.toast_enabled ?? true))
                      }
                      className={`h-6 w-11 rounded-full transition-colors ${(settings.toast_enabled ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.toast_enabled ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                    <div>
                      <span className="text-base font-semibold">
                        {t('settings.duplicateToasts')}
                      </span>
                      <p className="text-sm text-muted-foreground/80">
                        {t('settings.duplicateToastsDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSetting(
                          'duplicate_toast_enabled',
                          !(settings.duplicate_toast_enabled ?? true)
                        )
                      }
                      className={`h-6 w-11 rounded-full transition-colors ${(settings.duplicate_toast_enabled ?? true) ? 'bg-primary' : 'bg-white/10'}`}
                      aria-label={t('settings.duplicateToasts')}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.duplicate_toast_enabled ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                    <div>
                      <span className="text-base font-semibold">
                        {t('settings.showActionMessages')}
                      </span>
                      <p className="text-sm text-muted-foreground/80">
                        {t('settings.showActionMessagesDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSetting('show_action_messages', !settings.show_action_messages)
                      }
                      className={`h-6 w-11 rounded-full transition-colors ${settings.show_action_messages ? 'bg-primary' : 'bg-white/10'}`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings.show_action_messages ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                    <div>
                      <span className="text-base font-semibold">
                        {t('settings.toastClickAction')}
                      </span>
                      <p className="text-sm text-muted-foreground/80">
                        {t('settings.toastClickActionDesc')}
                      </p>
                    </div>
                    <div className="w-[180px] flex-shrink-0">
                      <Select
                        value={settings.toast_click_action || 'close'}
                        onChange={(val) => updateSetting('toast_click_action', val)}
                        options={[
                          { value: 'none', label: t('settings.toastClickActionNone') },
                          { value: 'close', label: t('settings.toastClickActionClose') },
                          { value: 'open', label: t('settings.toastClickActionOpen') },
                          { value: 'system_viewer', label: t('settings.toastClickActionSystemViewer') },
                        ]}
                      />
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t('settings.locationSection')}
                  </h3>

                  <div className="rounded-xl border border-border bg-card p-4 divide-y divide-border/60">
                    {/* Row 1: Posición de notificación */}
                    <div className="flex items-start justify-between py-4 first:pt-0 last:pb-0 gap-4">
                      <div className="flex gap-3">
                        <Layout className="h-5 w-5 text-muted-foreground/80 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-semibold block text-foreground">
                            {t('settings.toastPositionTitle')}
                          </span>
                          <p className="text-xs text-muted-foreground/80 mt-1 max-w-[420px]">
                            {t('settings.toastPositionDesc')}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="flex h-[80px] w-[130px] flex-col justify-between rounded-lg border border-border dark:bg-secondary/40 bg-secondary/80 p-1.5">
                          <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1">
                            {[
                              {
                                value: 'top-left',
                                label: t('settings.posTopLeft'),
                                dotClass: 'top-0.5 left-0.5',
                              },
                              {
                                value: 'top-center',
                                label: t('settings.posTopCenter'),
                                dotClass: 'top-0.5 left-1/2 -translate-x-1/2',
                              },
                              {
                                value: 'top-right',
                                label: t('settings.posTopRight'),
                                dotClass: 'top-0.5 right-0.5',
                              },
                              {
                                value: 'center-left',
                                label: t('settings.posCenterLeft'),
                                dotClass: 'top-1/2 -translate-y-1/2 left-0.5',
                              },
                              { value: 'center', label: '', isCenter: true },
                              {
                                value: 'center-right',
                                label: t('settings.posCenterRight'),
                                dotClass: 'top-1/2 -translate-y-1/2 right-0.5',
                              },
                              {
                                value: 'bottom-left',
                                label: t('settings.posBottomLeft'),
                                dotClass: 'bottom-0.5 left-0.5',
                              },
                              {
                                value: 'bottom-center',
                                label: t('settings.posBottomCenter'),
                                dotClass: 'bottom-0.5 left-1/2 -translate-x-1/2',
                              },
                              {
                                value: 'bottom-right',
                                label: t('settings.posBottomRight'),
                                dotClass: 'bottom-0.5 right-0.5',
                              },
                            ].map((pos, idx) => {
                              if (pos.isCenter) {
                                return (
                                  <div
                                    key={idx}
                                    className="pointer-events-none flex items-center justify-center opacity-20"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-[2px] bg-white/40" />
                                  </div>
                                );
                              }
                              const activePosition = settings.toast_position || 'bottom-right';
                              const isActive = activePosition === pos.value;
                              return (
                                <Tooltip key={pos.value} label={pos.label} placement="top">
                                  <button
                                    type="button"
                                    onClick={() => updateSetting('toast_position', pos.value)}
                                    className={`relative rounded-[4px] transition-all hover:bg-accent focus:outline-none ${isActive ? 'border border-primary bg-primary/10' : 'border border-transparent'}`}
                                  >
                                    <span
                                      className={`absolute h-2 w-2 rounded-[2px] transition-colors ${pos.dotClass} ${isActive ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'dark:bg-white/20 bg-neutral-400'}`}
                                    />
                                  </button>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Monitor de notificación */}
                    <div className="flex items-center justify-between py-4 gap-4">
                      <div className="flex gap-3">
                        <Monitor className="h-5 w-5 text-muted-foreground/80 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-semibold block text-foreground">
                            {t('settings.toastMonitorTitle')}
                          </span>
                          <p className="text-xs text-muted-foreground/80 mt-1 max-w-[420px]">
                            {t('settings.toastMonitorDesc')}
                          </p>
                        </div>
                      </div>
                      <div className="w-[180px] flex-shrink-0">
                        <Select
                          value={settings.toast_monitor || 'primary'}
                          onChange={(val) => updateSetting('toast_monitor', val)}
                          options={[
                            { value: 'primary', label: t('settings.toastMonitorPrimary') },
                            ...monitorList.map((m) => ({
                              value: m.index.toString(),
                              label: m.name,
                            })),
                          ]}
                        />
                      </div>
                    </div>

                    {/* Row 3: Duración de notificación */}
                    <div className="flex items-center justify-between py-4 gap-4">
                      <div className="flex gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground/80 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-semibold block text-foreground">
                            {t('settings.toastDurationTitle')}
                          </span>
                          <p className="text-xs text-muted-foreground/80 mt-1 max-w-[420px]">
                            {t('settings.toastDurationDesc')}
                          </p>
                        </div>
                      </div>
                      <div className="w-[180px] flex-shrink-0">
                        <Select
                          value={(settings.toast_duration || 3000).toString()}
                          onChange={(val) => updateSetting('toast_duration', parseInt(val))}
                          options={[
                            { value: '1500', label: t('settings.durationShort') },
                            { value: '3000', label: t('settings.durationNormal') },
                            { value: '5000', label: t('settings.durationLong') },
                            { value: '8000', label: t('settings.durationVeryLong') },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Row 4: Probar notificación */}
                    <div className="flex items-center justify-between py-4 last:pb-0 gap-4">
                      <div className="flex gap-3">
                        <Send className="h-5 w-5 text-muted-foreground/80 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-semibold block text-foreground">
                            {t('settings.testNotificationTitle')}
                          </span>
                          <p className="text-xs text-muted-foreground/80 mt-1 max-w-[420px]">
                            {t('settings.testNotificationDesc')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          import('../utils/toast').then((m) =>
                            m.systemToast.success(t('settings.testToastMsg'))
                          );
                        }}
                        className="btn btn-primary px-5 py-1.5 text-xs font-semibold rounded-[4px] border border-border flex-shrink-0"
                      >
                        {t('settings.testToast')}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* --- MAINTENANCE TAB --- */}
              {activeTab === 'maintenance' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
                  {/* Check for Updates */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                      <RotateCcw size={14} /> {t('settings.updates')}
                    </h3>
                    <div className="flex items-center justify-between rounded-[4px] border border-border bg-secondary p-3">
                      <div>
                        <span className="text-sm font-medium">
                          {t('settings.autoCheckUpdates')}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.autoCheckUpdatesDesc')}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateSetting(
                            'auto_check_updates',
                            !(settings.auto_check_updates ?? false)
                          )
                        }
                        className={`h-6 w-11 rounded-full transition-colors ${(settings.auto_check_updates ?? false) ? 'bg-primary' : 'bg-white/10'}`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(settings.auto_check_updates ?? false) ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        const loadingToast = toast.loading(t('settings.checkingUpdates'));
                        try {
                          const update = await check({ timeout: 15000 });
                          toast.dismiss(loadingToast);
                          if (update) {
                            setUpdateAvailable(update);
                            setShowUpdateModal(true);
                          } else {
                            toast.info(t('settings.noUpdates'));
                          }
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          const raw = typeof err === 'string' ? err : err?.message || String(err);
                          const msg = raw.length > 80 ? raw.slice(0, 80) + '...' : raw;
                          if (/fetch|network|connect|timeout|404|not found/i.test(raw)) {
                            toast.info(t('settings.updateNotReachable'));
                          } else {
                            toast.error(`${t('settings.updateError')}: ${msg}`);
                          }
                          console.error('Update check failed:', err);
                        }
                      }}
                      className="btn w-full rounded-[4px] border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <RotateCcw size={16} className="mr-2" />
                      {t('settings.checkForUpdates')}
                    </button>
                  </section>

                  {/* Data Management */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-rose-400/80">
                      <Database size={14} /> {t('settings.dataManagement')}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={confirmClearHistory}
                        className="btn w-full rounded-[4px] border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 size={16} className="mr-2" />
                        {t('settings.clearHistory')}
                      </button>
                    </div>
                  </section>

                  {/* Backup & Restore */}
                  <section className="space-y-4">
                    <h3 className="text-[13px] font-semibold text-primary/80">
                      {t('settings.backupRestore')}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={async () => {
                          const id = toast.loading(t('settings.generatingBackup'));
                          try {
                            await invoke('export_backup_to_file');
                            toast.success(t('settings.backupSaved'), { id });
                          } catch (error) {
                            if (error === 'Export cancelled') {
                              toast.dismiss(id);
                            } else {
                              toast.error(t('settings.exportFailed', { error }), { id });
                            }
                          }
                        }}
                        className="btn rounded-[4px] border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        <FolderOpen size={16} className="mr-2" />
                        {t('settings.exportBackup')}
                      </button>

                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: t('settings.importBackupTitle'),
                            message: t('settings.importBackupMessage'),
                            action: async () => {
                              const id = toast.loading(t('settings.generatingBackup'));
                              try {
                                await invoke('import_backup_from_file');
                                toast.success(t('settings.restoreComplete'), {
                                  id,
                                });
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (error) {
                                if (error === 'Import cancelled') {
                                  toast.dismiss(id);
                                } else {
                                  toast.error(t('settings.importFailed', { error }), { id });
                                }
                              }
                            },
                          });
                        }}
                        className="btn rounded-[4px] border border-orange-500/20 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                      >
                        <Plus size={16} className="mr-2" />
                        {t('settings.importBackup')}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {t('settings.backupDesc')}
                    </p>
                  </section>
                </div>
              )}

              {/* --- ABOUT TAB --- */}
              {activeTab === 'about' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
                  <div className="flex flex-col items-center space-y-4 py-6 text-center">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-primary/20 bg-primary/10 shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)]">
                      <img
                        src="/logo.png"
                        alt="CyberPaste Logo"
                        className="animate-in fade-in zoom-in h-28 w-28 object-contain duration-1000"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">CyberPaste</h3>
                      <p className="text-muted-foreground">Version {appVersion || '1.0.1'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-4 rounded-[4px] border border-border bg-secondary p-6">
                      <div className="flex items-center gap-3 text-primary">
                        <Terminal size={20} />
                        <h4 className="text-sm font-semibold uppercase tracking-wider">
                          {t('settings.systemDebug')}
                        </h4>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground/80">
                        {t('settings.systemDebugDesc')}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={openDataDir}
                          className="flex items-center gap-2 rounded-[4px] border border-border bg-input px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                        >
                          <FolderOpen size={16} />
                          {t('settings.dataDirectory')}
                        </button>
                        <button
                          onClick={openConsole}
                          className="flex items-center gap-2 rounded-[4px] border border-border bg-input px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                        >
                          <Terminal size={16} />
                          {t('settings.developerConsole')}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[4px] border border-border bg-secondary p-6">
                      <div className="flex items-center gap-3 text-primary">
                        <Heart size={20} />
                        <h4 className="text-sm font-semibold uppercase tracking-wider">
                          {t('settings.openSource')}
                        </h4>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground/80">
                        {t('settings.openSourceDesc')}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() =>
                            openUrl('https://github.com/CyberGems/CyberPaste').catch(console.error)
                          }
                          className="flex items-center gap-2 rounded-[4px] border border-border bg-input px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                        >
                          <ExternalLink size={16} />
                          {t('settings.gitHubRepository')}
                        </button>
                        <button
                          onClick={() =>
                            openUrl(
                              'https://github.com/CyberGems/CyberPaste/blob/main/LICENSE'
                            ).catch(console.error)
                          }
                          className="flex items-center gap-2 rounded-[4px] border border-border bg-input px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                        >
                          <Info size={16} />
                          {t('settings.licenseGpl')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-1 border-t border-border bg-background px-4 py-3 text-center">
          <button
            onClick={() => openUrl('https://github.com/CyberGems/CyberPaste').catch(console.error)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            CyberPaste {appVersion || '...'}
          </button>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>© 2026 CyberGems</span>
          </div>
        </div>
      </div>

      <UpdateModal
        isOpen={showUpdateModal}
        update={updateAvailable}
        onClose={() => setShowUpdateModal(false)}
      />
    </>
  );
}
