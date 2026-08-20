# Changelog

All notable changes to CyberPaste are documented here.

## [1.12.0] — 2026-08-20

### ✨ Detail Panel & Interaction Improvements
- **Restored Full-mode details**: Added a dedicated details-panel toggle beside grid zoom and an equivalent context-menu action.
- **Faster clip switching**: Detail-panel content now updates instantly without replaying the slide animation for every selected clip.
- **Image-aware actions**: The detail panel only shows the image preview action for image clips.
- **Compact clip menus**: Replaced the compact delete shortcut with a contextual three-dot menu and added keyboard access through Shift+F10 and the Context Menu key.
- **Independent scrollbars**: Added discreet, independently configurable Full and Compact mode scrollbars while removing unwanted horizontal scrolling in Full mode.
- **About and maintenance polish**: Detached About into its own window, improved tray access, and reorganized maintenance tools under Backup & Data.
- **HUD polish**: Added the details-panel shortcut to the rotating Full-mode hints and slowed the title-bar sweep to better match Compact mode.

## [1.11.1] — 2026-08-19

### 🎨 Settings & Full-mode Polish
- **Cleaner Full-mode controls**: Removed the redundant title-bar button for toggling the information display; the setting remains available in Settings.
- **Clearer HUD setting**: Updated the label and helper text to describe the keyboard shortcut hints and database size shown in the title bar.
- **Less redundant settings copy**: Simplified Full and Compact mode labels and helper text where the selected settings tab already provides the context.

## [1.11.0] — 2026-08-18

### 🎨 Full Mode Polish
- **Refined Full-mode chrome**: Simplified the top bar, moved window controls into the header, and aligned its styling with Compact mode.
- **Improved type filters**: Moved grid zoom beside the filters, improved spacing and count alignment, and fixed URL counts to use database totals.
- **Pin feedback**: Added a brief visual flash when clips are pinned or unpinned in both views.
- **Context-menu focus**: Preserved the active clip highlight and disabled unrelated card hover effects while a context menu is open.
- **Window sizing**: Increased the default Full-mode height and improved reset positioning around the Windows work area.

## [1.10.5] — 2026-08-12

### ✨ Toast Polish
- **Shorter context-menu hint**: Simplified the toast tooltip text to reduce visual clutter.

## [1.10.4] — 2026-08-12

### 🎨 Branding Polish
- **Updated application icons**: Refreshed the app, taskbar, tray, and platform icon resources.
- **About logo glow**: Added back a subtle glow while allowing the logo's own frame to remain visible.

## [1.10.3] — 2026-08-11

### ✨ Compact View & Polish
- **Image Peek Trigger**: Restructured the compact image hover logic so that the detailed metadata preview popover is only displayed when hovering over the image thumbnail itself, not the entire row.

## [1.10.2] — 2026-08-11

### 🔄 Updates
- **Reliable Update Checks on Windows**: Switched the updater HTTP/TLS stack to Windows native TLS (Schannel) to fix instant connection failures against GitHub Releases.

## [1.10.1] — 2026-08-11

### 🔄 Updates & Branding
- **Clearer Update Errors**: Update checks now show the real backend error in toasts and Settings, with copy support for diagnostics.
- **Brand Consistency**: Replaced remaining Ciber-CR references with CyberGems across docs and product pages.

## [1.10.0] — 2026-08-11

### ✨ Editing & Contextual Actions
- **Type-aware editing**: Edit modal titles now identify Text, HTML, Code, URL, Rich Text, and File clips.
- **Live character counts**: Edit modal title bars show the current character count while typing.
- **Context menu clarity**: Clip and toast context menus now use type-specific Edit actions.
- **Toast discoverability**: Toast tooltips now hint that right-click opens the context menu.
- **Modal polish**: Improved title alignment and removed forced uppercase styling from modal titles.

## [1.9.3] — 2026-08-10

### 🔔 Update Notifications
- **Clearer Update Toasts**: Improved update messages, prevented truncation, and ensured update alerts remain visible independently of general action-message settings.
- **Tray Update Indicator**: Added a glowing LED beside the CyberPaste branding when a new version is available.
- **Tray Branding**: Prevented the text caret cursor from appearing over the tray menu branding.

## [1.9.2] — 2026-08-10

### 🔄 Updates & Reliability
- **Signed Automatic Updates**: Enabled reliable updater artifacts and release signatures so the application can detect and install new versions safely.
- **Update Feedback**: Improved unavailable-update messaging and clarified the GitHub Releases fallback.
- **Settings Controls**: Removed the mouse-click focus outline from configuration buttons while preserving keyboard focus visibility.

## [1.9.1] — 2026-08-10

### ✨ UI Enhancements
- **Compact Peek Focus**: Added a focused background blur that keeps the title bar and source clip row clear while making surrounding clip text less distracting.
- **Peek Interactions**: Synchronized peek visibility with selection styling and dismiss the peek immediately when hovering over folders.
- **Peek Styling**: Refined peek badges with a neutral visual treatment and softened the background effect for a smoother transition.

### 🐛 Bug Fixes & Settings
- **Settings Window Stability**: Improved minimize and restore handling to prevent window-state deadlocks.
- **Settings Controls**: Added a minimize button to the Settings window.

## [1.9.0] — 2026-08-09

### 🚀 Features
- **Folders Tab in Settings**: Added a new Folders tab in Settings and made wheel folder navigation optional.
- **Separate Window Maximization**: Decoupled window maximization status from view modes.
- **Enhanced Toast Notifications**: Added a custom context menu for toasts, system viewer action, and self-duplication debouncing.
- **Configurable Duplicate Notifications**: Allowed enabling/disabling of duplicate toast popups.
- **Premium Tooltips**: Replaced native tooltips with premium styled Tooltip component throughout the application.
- **Settings Redesign**: Redesigned the Location and Appearance sections to match the CyberSnap layout cards structure.

### 🐛 Bug Fixes & Styling
- **Toast Optimization**: Removed toast transparency across themes and resolved inactive dots contrast.
- **Window Corner Issue**: Disabled native Tauri window acrylic blur on the toast window to fix corner rendering issues on Windows.
- **Layout Alignment**: Aligned settings panel structure to match CyberSnap aesthetics, removed centered max-width constraint for full-width layout, and optimized layout breakpoints.
- **Toast Margins**: Adjusted positioning margins and cleaned up the toast position grid.
- **Duplicate Debouncing**: Improved duplicate detection alerts with updated titles and description copy.

## [1.8.0] — 2026-08-08

### 🚀 Features
- **Automatic Updates & Safety**: Implemented automatic updates check, window boundary clamping, and cleaned up debug/panic UI.

### ⚙️ CI/CD
- **Optimized Releases**: Removed arm64 and msi build targets to generate only x64 NSIS installers.

## [1.7.0] — 2026-08-07

### 🚀 Features

- **New Brand Identity**:
  - Replaced official application logo and system tray icons with the new brand icon.
- **2D Keyboard Navigation**:
  - Implemented true 2D grid navigation using arrow keys (`↑/↓` jump rows, `←/→` move between adjacent cards).

### 🐛 Bug Fixes & UI Enhancements

- **Light Theme Polish**:
  - Extensively redesigned title bars, action buttons, and control structures for clean contrast.
  - Redesigned image card overlays to clear metadata and ensure 100% legibility on any image background.
  - Made the context menu and full-screen image preview modal fully theme-aware.
  - Standardized LED indicator lights to use theme-based accent color (removing yellow lights).
  - Adjusted Light theme toast notifications (header, program name, and progress bar) for perfect readability.
- **Context Menu & Multiselect**:
  - Hidden AI actions for non-textual (image/file) clips in the context menu.
  - Enlarged multi-select checkbox click targets to prevent accidental window closure.

## [1.6.0] — 2026-08-01

### 🚀 Features

- **Full-mode overhaul**
  - Type filter chip row (all/text/code/image/url/file) with SQL-backed filtering and counter badges
  - Adaptive grid columns that scale with window width (2–12 columns) and persistent zoom (Ctrl+Wheel / ControlBar buttons, 0.6x–1.75x)
  - Keyboard grid navigation: `←/→` move between cards, `Ctrl+←/→` switches folders, `Ctrl+Enter` copies as plain text, `Shift+Enter` opens preview
  - Full-screen clip preview modal with syntect syntax highlighting (LRU cache, language detection)
  - Bulk selection via `Ctrl+Click` / `Shift+Click` with an action bar (move to folder / delete)
  - Collapsible HUD info strip and clip-details side panel (toggle with `i` or the PanelTop button)
  - Inline OCR shortcut on image cards when text has been cached
- Context menu: "Copy as Plain Text" action (backed by new `copy_clip_text` command)
- i18n: added `clipType.*`, `bulk.*`, `detailPanel.*` keys across all six supported locales

### 🐛 Bug Fixes

- Remove dead `SearchBar` component
- Fix selected card scale transform that caused visual jump when navigating between clips
- Fix `hasMore` pagination guard to use the actual page size instead of a hardcoded 20
- Add `'code'` to the `ClipType` union (the backend already produced this value)
