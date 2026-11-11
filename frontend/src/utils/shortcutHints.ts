import type { TFunction } from 'i18next';
import { TITLEBAR_HOTKEYS } from '../hooks/useKeyboard';

export interface ShortcutHint {
  /** Key combination shown in the kbd badge, e.g. "Ctrl+F" */
  keys: string;
  /** Action label, already translated */
  label: string;
}

export interface ShortcutHints {
  search: ShortcutHint;
  paste: ShortcutHint;
  delete: ShortcutHint;
  pinClip: ShortcutHint;
  pinWindow: ShortcutHint;
  unpinWindow: ShortcutHint;
  pauseMonitoring: ShortcutHint;
  resumeMonitoring: ShortcutHint;
  lockNow: ShortcutHint;
  zoom: ShortcutHint;
  clipDetails: ShortcutHint;
  settings: ShortcutHint;
  closeWindow: ShortcutHint;
}

/**
 * Single source of truth for the Full window shortcut hints.
 * Feeds both the rotating HUD in the title bar (ControlBar) and the fixed
 * button tooltips, so the two can never drift apart again.
 */
export const buildShortcutHints = (t: TFunction): ShortcutHints => ({
  search: { keys: 'Ctrl+F', label: t('common.search') },
  paste: { keys: 'Enter', label: t('contextMenu.paste') },
  delete: { keys: 'Del', label: t('common.delete') },
  pinClip: { keys: TITLEBAR_HOTKEYS.pin, label: t('contextMenu.pin') },
  pinWindow: { keys: TITLEBAR_HOTKEYS.windowPin, label: t('common.pinWindow') },
  unpinWindow: { keys: TITLEBAR_HOTKEYS.windowPin, label: t('common.unpinWindow') },
  pauseMonitoring: { keys: TITLEBAR_HOTKEYS.pauseMonitoring, label: t('common.pauseMonitoring') },
  resumeMonitoring: { keys: TITLEBAR_HOTKEYS.pauseMonitoring, label: t('common.resumeMonitoring') },
  lockNow: { keys: TITLEBAR_HOTKEYS.lock, label: t('common.lockNow') },
  zoom: { keys: t('common.ctrlWheelHint', 'Ctrl+Wheel'), label: t('common.zoomShort', 'Zoom') },
  clipDetails: { keys: 'I', label: t('detailPanel.title') },
  settings: { keys: TITLEBAR_HOTKEYS.settings, label: t('settings.title') },
  closeWindow: { keys: 'Esc', label: t('common.closeWindow') },
});

/** Order the rotating HUD hint cycles through. */
export const HUD_HINT_ORDER: readonly (keyof ShortcutHints)[] = [
  'search',
  'paste',
  'delete',
  'pinClip',
  'pinWindow',
  'pauseMonitoring',
  'lockNow',
  'zoom',
  'clipDetails',
  'closeWindow',
];

/** Formats a hint as a button tooltip label: "{{label}} ({{hotkey}})". */
export const hintWithHotkey = (t: TFunction, hint: ShortcutHint): string =>
  t('common.tooltipWithHotkey', { label: hint.label, hotkey: hint.keys });
