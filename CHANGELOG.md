# Changelog

All notable changes to CyberPaste are documented here.

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
