import i18n from '../i18n/config';

/**
 * Static registry of every searchable settings row, mirroring the rows
 * rendered in SettingsPanel.tsx. Labels and descriptions are resolved
 * through i18n at search time, so the index follows the locales without
 * duplicating strings here.
 *
 * Maintenance note: when adding a settings row to SettingsPanel, add one
 * entry here (tab + labelKey + optional descKey/sectionKey/extraKeys).
 * Rows rendered with dynamic t(`settings.${key}`) maps (e.g. the Full
 * Screen Mode visibility toggles) are listed explicitly below.
 */

type SettingsSearchTab =
  | 'general'
  | 'clipboard'
  | 'notifications'
  | 'compact'
  | 'full'
  | 'security'
  | 'folders'
  | 'ai'
  | 'maintenance'
  | 'achievements';

export interface SettingsSearchEntry {
  tab: SettingsSearchTab;
  labelKey: string;
  descKey?: string;
  sectionKey?: string;
  /** Extra searchable text keys (e.g. a Select option label). */
  extraKeys?: string[];
}

export const SETTINGS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  // General
  {
    tab: 'general',
    labelKey: 'settings.languageTitle',
    descKey: 'settings.languageDesc',
    sectionKey: 'settings.appearanceSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.themeTitle',
    descKey: 'settings.themeDesc',
    sectionKey: 'settings.appearanceSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.startupWithWindows',
    descKey: 'settings.startupWithWindowsDesc',
    sectionKey: 'settings.appearanceSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.hideOnBlur',
    descKey: 'settings.hideOnBlurDesc',
    sectionKey: 'settings.appearanceSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.titleBarAnimation',
    descKey: 'settings.titleBarAnimationDesc',
    sectionKey: 'settings.appearanceSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.clipboardSound',
    descKey: 'settings.clipboardSoundDesc',
    sectionKey: 'settings.soundsSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.startupSound',
    descKey: 'settings.startupSoundDesc',
    sectionKey: 'settings.soundsSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.hotkey',
    descKey: 'settings.hotkeyDesc',
    sectionKey: 'settings.shortcuts',
  },
  {
    tab: 'general',
    labelKey: 'settings.viewModeHotkey',
    descKey: 'settings.viewModeHotkeyDesc',
    sectionKey: 'settings.shortcuts',
  },
  {
    tab: 'general',
    labelKey: 'settings.keepVisibleInTray',
    descKey: 'settings.keepVisibleInTrayDesc',
    sectionKey: 'settings.otherSection',
  },
  {
    tab: 'general',
    labelKey: 'settings.showAppRecommendations',
    descKey: 'settings.showAppRecommendationsDesc',
    sectionKey: 'settings.otherSection',
  },
  // Clipboard
  {
    tab: 'clipboard',
    labelKey: 'settings.historyLimit',
    descKey: 'settings.historyLimitDesc',
    sectionKey: 'settings.clipboardLimitsSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.autoDeleteHistory',
    descKey: 'settings.autoDeleteHistoryDesc',
    sectionKey: 'settings.clipboardLimitsSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.clipboardTextLimit',
    descKey: 'settings.clipboardTextLimitDesc',
    sectionKey: 'settings.clipboardLimitsSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.clipboardImageLimit',
    descKey: 'settings.clipboardImageLimitDesc',
    sectionKey: 'settings.clipboardLimitsSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.storageQuota',
    descKey: 'settings.storageQuotaDesc',
    sectionKey: 'settings.clipboardLimitsSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.pauseMonitoring',
    descKey: 'settings.pauseMonitoringDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.singleClickPaste',
    descKey: 'settings.singleClickPasteDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.autoPaste',
    descKey: 'settings.autoPasteDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.autoInjectPaste',
    descKey: 'settings.autoInjectPasteDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.typeToSearch',
    descKey: 'settings.typeToSearchDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.resetViewOnPaste',
    descKey: 'settings.resetViewOnPasteDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  {
    tab: 'clipboard',
    labelKey: 'settings.externalImageEditor',
    descKey: 'settings.externalImageEditorDesc',
    sectionKey: 'settings.clipboardBehaviorSection',
  },
  // Security
  {
    tab: 'security',
    labelKey: 'settings.appLock',
    descKey: 'settings.appLockDesc',
    sectionKey: 'settings.appLock',
  },
  // Folders
  {
    tab: 'folders',
    labelKey: 'settings.wheelFolderNavigation',
    descKey: 'settings.wheelFolderNavigationDesc',
    sectionKey: 'settings.appearanceBehavior',
  },
  // Full Screen Mode
  {
    tab: 'full',
    labelKey: 'settings.fullGridScale',
    descKey: 'settings.fullGridScaleDesc',
    sectionKey: 'settings.fullLayout',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullCardFormat',
    descKey: 'settings.fullCardFormatDesc',
    sectionKey: 'settings.fullLayout',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullGridColumns',
    descKey: 'settings.fullGridColumnsDesc',
    sectionKey: 'settings.fullLayout',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullPeekEnabled',
    descKey: 'settings.fullPeekEnabledDesc',
    sectionKey: 'settings.fullVisibility',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullShowHud',
    descKey: 'settings.fullShowHudDesc',
    sectionKey: 'settings.fullVisibility',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullShowSourceIcon',
    descKey: 'settings.fullShowSourceIconDesc',
    sectionKey: 'settings.fullVisibility',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullShowTime',
    descKey: 'settings.fullShowTimeDesc',
    sectionKey: 'settings.fullVisibility',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullShowTypeIcon',
    descKey: 'settings.fullShowTypeIconDesc',
    sectionKey: 'settings.fullVisibility',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullShowNumber',
    descKey: 'settings.fullShowNumberDesc',
    sectionKey: 'settings.fullVisibility',
  },
  {
    tab: 'full',
    labelKey: 'settings.fullShowScrollbar',
    descKey: 'settings.fullShowScrollbarDesc',
    sectionKey: 'settings.fullVisibility',
  },
  // Compact Mode
  {
    tab: 'compact',
    labelKey: 'settings.compactFolderLayout',
    descKey: 'settings.compactFolderLayoutDesc',
    sectionKey: 'settings.layoutNavigation',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactSidebarCollapsed',
    descKey: 'settings.compactSidebarCollapsedDesc',
    sectionKey: 'settings.layoutNavigation',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactViewPosition',
    descKey: 'settings.compactViewPositionDesc',
    sectionKey: 'settings.layoutNavigation',
    extraKeys: ['settings.positionCursor', 'settings.positionCaret'],
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactPeekEnabled',
    descKey: 'settings.compactPeekEnabledDesc',
    sectionKey: 'settings.layoutNavigation',
  },
  {
    tab: 'compact',
    labelKey: 'settings.clipNumbering',
    descKey: 'settings.clipNumberingDesc',
    sectionKey: 'settings.layoutNavigation',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactShowSourceIcon',
    descKey: 'settings.compactShowSourceIconDesc',
    sectionKey: 'settings.compactVisibility',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactShowTime',
    descKey: 'settings.compactShowTimeDesc',
    sectionKey: 'settings.compactVisibility',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactShowTypeIcon',
    descKey: 'settings.compactShowTypeIconDesc',
    sectionKey: 'settings.compactVisibility',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactShowNumber',
    descKey: 'settings.compactShowNumberDesc',
    sectionKey: 'settings.compactVisibility',
  },
  {
    tab: 'compact',
    labelKey: 'settings.compactShowScrollbar',
    descKey: 'settings.compactShowScrollbarDesc',
    sectionKey: 'settings.compactVisibility',
  },
  // AI
  { tab: 'ai', labelKey: 'settings.provider', sectionKey: 'settings.aiConfiguration' },
  { tab: 'ai', labelKey: 'settings.apiKey', sectionKey: 'settings.aiConfiguration' },
  { tab: 'ai', labelKey: 'settings.model', sectionKey: 'settings.aiConfiguration' },
  { tab: 'ai', labelKey: 'settings.baseUrl', sectionKey: 'settings.aiConfiguration' },
  // Notifications
  {
    tab: 'notifications',
    labelKey: 'settings.enableToasts',
    descKey: 'settings.enableToastsDesc',
    sectionKey: 'settings.toasts',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.duplicateToasts',
    descKey: 'settings.duplicateToastsDesc',
    sectionKey: 'settings.toasts',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.showActionMessages',
    descKey: 'settings.showActionMessagesDesc',
    sectionKey: 'settings.toasts',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.quietHoursTitle',
    descKey: 'settings.quietHoursDesc',
    sectionKey: 'settings.toasts',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.quietHoursSchedule',
    descKey: 'settings.quietHoursScheduleDesc',
    sectionKey: 'settings.toasts',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.toastClickAction',
    descKey: 'settings.toastClickActionDesc',
    sectionKey: 'settings.toasts',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.toastPositionTitle',
    descKey: 'settings.toastPositionDesc',
    sectionKey: 'settings.locationSection',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.toastMonitorTitle',
    descKey: 'settings.toastMonitorDesc',
    sectionKey: 'settings.locationSection',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.toastDurationTitle',
    descKey: 'settings.toastDurationDesc',
    sectionKey: 'settings.locationSection',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.testNotificationTitle',
    descKey: 'settings.testNotificationDesc',
    sectionKey: 'settings.locationSection',
  },
  // Maintenance
  {
    tab: 'maintenance',
    labelKey: 'settings.storageUsage',
    descKey: 'settings.storageUsageDesc',
    sectionKey: 'settings.systemDebug',
  },
  {
    tab: 'maintenance',
    labelKey: 'settings.storageImages',
    descKey: 'settings.storageImagesDesc',
    sectionKey: 'settings.systemDebug',
  },
  {
    tab: 'maintenance',
    labelKey: 'settings.autoBackupTitle',
    sectionKey: 'settings.backupRestore',
  },
  {
    tab: 'maintenance',
    labelKey: 'settings.autoBackupFolder',
    sectionKey: 'settings.backupRestore',
  },
  {
    tab: 'maintenance',
    labelKey: 'settings.autoBackupRetention',
    descKey: 'settings.autoBackupRetentionDesc',
    sectionKey: 'settings.backupRestore',
  },
];

/** Sidebar tab label keys are irregular; map them once. */
export const SETTINGS_TAB_LABEL_KEYS: Record<SettingsSearchTab, string> = {
  general: 'settings.general',
  clipboard: 'settings.clipboardTab',
  notifications: 'settings.toasts',
  compact: 'settings.compactTab',
  full: 'settings.fullTab',
  security: 'settings.security',
  folders: 'settings.folders',
  ai: 'settings.ai',
  maintenance: 'settings.maintenance',
  achievements: 'settings.achievements',
};

/** Lowercase and strip diacritics so "seccion" matches "Sección". */
export const normalizeForSearch = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface IndexedEntry {
  entry: SettingsSearchEntry;
  label: string;
  desc: string;
  section: string;
  extras: string[];
}

// The index is built over the CURRENT UI language only (CyberSnap style):
// every revealed row must carry a visible match, otherwise results would
// appear unexplained. Rebuilt when the user changes the language.
let cachedLanguage = '';
let cachedIndex: IndexedEntry[] = [];

const getIndex = (): IndexedEntry[] => {
  const language = i18n.language || 'en';
  if (language === cachedLanguage) return cachedIndex;
  cachedLanguage = language;
  const translate = (key: string) => normalizeForSearch(i18n.t(key));
  cachedIndex = SETTINGS_SEARCH_ENTRIES.map((entry) => ({
    entry,
    label: translate(entry.labelKey),
    desc: entry.descKey ? translate(entry.descKey) : '',
    section: entry.sectionKey ? translate(entry.sectionKey) : '',
    extras: (entry.extraKeys ?? []).map(translate),
  }));
  return cachedIndex;
};

/**
 * Every entry matching the query, in the current UI language. Tokens hit the
 * label strongly (whole token +10, word-start +7, substring +3) and option
 * extras (+2); descriptions and section titles only add weak word signals
 * (+2 whole word, +1 word-start). An entry is included when it has a strong
 * signal or two weak ones, so incidental substrings inside unrelated words
 * (e.g. "app" inside "Appearance") cannot surface on their own. With no
 * direct hits and a query of 3+ characters containing at least two distinct
 * characters, a span-bounded subsequence match over the label runs (dense
 * acronyms like "fnm" -> "File name" qualify, sparse junk does not).
 */
export const matchSettings = (rawQuery: string): SettingsSearchEntry[] => {
  const query = normalizeForSearch(rawQuery.trim());
  if (!query) return [];
  const tokens = query.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const scored: { entry: SettingsSearchEntry; score: number }[] = [];
  for (const indexed of getIndex()) {
    let strong = 0;
    let weak = 0;
    for (const token of tokens) {
      if (indexed.label === token) strong += 10;
      else if (indexed.label.startsWith(token)) strong += 7;
      else if (indexed.label.includes(token)) strong += 3;
      if (indexed.extras.some((x) => x.includes(token))) strong += 2;
      const words = (indexed.desc + ' ' + indexed.section).split(/[^a-z0-9]+/);
      weak += words.some((w) => w === token) ? 2 : words.some((w) => w.startsWith(token)) ? 1 : 0;
    }
    if (indexed.label === query) strong += 10;
    const score = strong + weak;
    if (strong >= 2 || weak >= 2) scored.push({ entry: indexed.entry, score });
  }

  if (scored.length === 0 && query.length >= 3 && new Set(query).size >= 2) {
    const maxSpan = query.length * 3;
    for (const indexed of getIndex()) {
      let best = Number.POSITIVE_INFINITY;
      let at = indexed.label.indexOf(query[0]);
      while (at !== -1) {
        let cursor = at;
        let matched = true;
        for (const char of query) {
          cursor = indexed.label.indexOf(char, cursor);
          if (cursor === -1) {
            matched = false;
            break;
          }
          cursor += 1;
        }
        if (matched) {
          const span = cursor - at;
          if (span <= maxSpan) best = Math.min(best, span);
        }
        at = indexed.label.indexOf(query[0], at + 1);
      }
      if (Number.isFinite(best)) {
        scored.push({ entry: indexed.entry, score: 100 - best / maxSpan });
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.entry);
};
