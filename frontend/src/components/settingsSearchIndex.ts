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
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Indexed in Spanish and English regardless of the UI language, so users can
// type in either language (CyberSnap-style search only matches the active one).
const tEs = i18n.getFixedT('es');
const tEn = i18n.getFixedT('en');

interface IndexedEntry {
  entry: SettingsSearchEntry;
  labels: string[];
  descs: string[];
  sections: string[];
  extras: string[];
}

const INDEX: IndexedEntry[] = SETTINGS_SEARCH_ENTRIES.map((entry) => ({
  entry,
  labels: [normalizeForSearch(tEs(entry.labelKey)), normalizeForSearch(tEn(entry.labelKey))],
  descs: entry.descKey
    ? [normalizeForSearch(tEs(entry.descKey)), normalizeForSearch(tEn(entry.descKey))]
    : [],
  sections: entry.sectionKey
    ? [normalizeForSearch(tEs(entry.sectionKey)), normalizeForSearch(tEn(entry.sectionKey))]
    : [],
  extras: (entry.extraKeys ?? []).flatMap((k) => [
    normalizeForSearch(tEs(k)),
    normalizeForSearch(tEn(k)),
  ]),
}));

/**
 * Every entry matching the query. Tokens are matched against labels
 * (weight 3, prefix +7, whole-token equality +10), section titles (+2),
 * descriptions (+1) and extra option texts (+2). With no direct hits and a
 * query of 3+ characters it falls back to a span-bounded subsequence match
 * over the label only with a tight span budget (dense acronyms like "fnm" ->
  // "File name" qualify, sparse junk like "rws" -> "folders with mouse wheel" does
  // not), so loose
 * garbage cannot surface from long description texts.
 */
export const matchSettings = (rawQuery: string): SettingsSearchEntry[] => {
  const query = normalizeForSearch(rawQuery.trim());
  if (!query) return [];
  const tokens = query.split(/\s+/).filter(Boolean);

  const scored: { entry: SettingsSearchEntry; score: number }[] = [];
  for (const indexed of INDEX) {
    const label = indexed.labels.join(' ');
    const desc = indexed.descs.join(' ');
    const section = indexed.sections.join(' ');
    const extras = indexed.extras.join(' ');
    let score = 0;
    for (const token of tokens) {
      if (indexed.labels.some((l) => l === token)) score += 10;
      else if (indexed.labels.some((l) => l.startsWith(token))) score += 7;
      else if (label.includes(token)) score += 3;
      if (section.includes(token)) score += 2;
      if (extras.includes(token)) score += 2;
      if (desc.includes(token)) score += 1;
    }
    if (label === query) score += 10;
    if (score > 0) scored.push({ entry: indexed.entry, score });
  }

  if (scored.length === 0 && query.length >= 3) {
    const maxSpan = query.length * 3;
    for (const indexed of INDEX) {
      let best = Number.POSITIVE_INFINITY;
      for (const label of indexed.labels) {
        for (const token of tokens) {
          let at = label.indexOf(token[0]);
          while (at !== -1) {
            // try to match the token as an in-order subsequence starting here
            let cursor = at;
            let matched = true;
            for (const char of token) {
              cursor = label.indexOf(char, cursor);
              if (cursor === -1) {
                matched = false;
                break;
              }
              cursor += 1;
            }
            if (matched) {
              const span = cursor - at;
              if (span <= maxSpan) best = Math.min(best, span);
              break;
            }
            at = label.indexOf(token[0], at + 1);
          }
        }
      }
      if (Number.isFinite(best)) {
        scored.push({ entry: indexed.entry, score: 100 - best / maxSpan });
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.entry);
};

/**
 * Label texts (deaccented) that identify a matched entry in the rendered
 * panel: Spanish, English and the current UI language variants.
 */
export const matchedLabelTexts = (
  entries: SettingsSearchEntry[],
  currentLabel: (key: string) => string
): Set<string> => {
  const texts = new Set<string>();
  for (const entry of entries) {
    texts.add(normalizeForSearch(tEs(entry.labelKey)));
    texts.add(normalizeForSearch(tEn(entry.labelKey)));
    texts.add(normalizeForSearch(currentLabel(entry.labelKey)));
  }
  return texts;
};
