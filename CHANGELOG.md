# Changelog

All notable changes to CyberPaste are documented here.

## [1.16.0] — 2026-08-26

### 🚀 The Ultimate Polish — Defaults, Persistence & Light Theme

- **✨ New Title — The Ultimate Clipboard Manager**: Updated README header from `Clipboard History Manager` → `The Ultimate Clipboard Manager` with centered 128px logo glory! 💎
- **🎨 Icon Glow-Up — Crispy Everywhere**: Regenerated all `src-tauri/icons` masters from `artifacts/icon.png` (1024px LANCZOS), high-res `tray.png/tray_white.png` (128px razor-sharp, no bilinear blur at 125%/150%/200% DPI), `icon.ico` (11-entry), `logo.png` (512px) + touched `build.rs` for clean rebuild! ✨
- **⚡ Autostart ON by Default — Installer Ready**: `startup_with_windows` now `true` by default, auto-enables `tauri_plugin_autostart` on first run, NSIS `installMode: both` + `downloadBootstrapper` silent — no more manual toggle! 🔋
- **🌗 CyberPaste Theme by Default**: `theme: "cyberpaste"` + `mica` default instead of `system` — signature neon on fresh installs! 🌌
- **🌍 Auto Language — System Speaks**: `language: "auto"` with `navigator.language` resolver (`de/en/es/fr/ja/zh` → `en` fallback), new `Auto (System language)` selector, bilingual `EN → ES` ordering! 🗣️
- **🐛 Fixed — Settings Vanish Bug**: Fresh installs wiped all settings on config close (stale `settingsRef` overwrite). Now `SettingsWindow` + `App:persistWindow` fetch fresh `get_settings()` before saving geometry — theme & all prefs survive! 🛡️
- **📝 Editor Light Theme Rescue**: Light mode was stuck on `bg-[#0b0f19]` midnight canvas! Now `bg-background` / `bg-muted/40` / `bg-muted/50` with `text-foreground` — pure, readable bliss in Light ☀️ / Dark 🌙!
- **💎 Starter Clips Reborn**: Removed useless `🎨 Palette CyberNeon` demo, promoted `EN primary → ES secondary`, translated `Limitless Productivity` to English, `Modern → The Ultimate Clipboard Manager` — clean bilingual showcase! 📋
- **👁️ Demo Peek — Still Gorgeous**: Kept `generateImage` gradients for `CyberNeon UI` & `Compact Peek` (400×240) — press `Load demo clips` to admire, not seeded on fresh DB!
- **🧪 Demo Button — One Click Away**: New `Load demo clips` button right beside `Clear History` in `Backup & Data` — `emit('load-demo-data')` alive in production, instant `toast.success`! 🎬
- **🔔 Settings Persistence — Full Coverage**: Window size/pos saves no longer stomp theme/language — fresh installs stay exactly as you left them! ✅

## [1.15.0] — 2026-08-26

### 🎨 Brand New Official Application Icon & High-DPI Tray
- **Refreshed Official Icon**: Beautiful, updated brand icon assets across Windows `.ico`, taskbar, app headers, and installers.
- **Razor-Sharp System Tray Icons**: Upgraded tray icon assets to high-resolution 128×128px masters, eliminating bilinear blurriness on Windows displays with 125%, 150%, or 200% DPI scaling.

### 📝 Text Editor Facelift (IDE-Like Experience)
- **Synchronized Line Numbers Gutter**: Added an integrated line numbers sidebar with active line highlighting and synchronized scrolling.
- **Live IDE Status Bar**: Real-time cursor position tracking (`Ln X, Col Y`), character count, line count, word count, and `UTF-8` encoding indicator.
- **Productivity Toolbar**:
  - Interactive **Word Wrap** toggle with responsive styling.
  - One-click **Copy All** button with animated confirmation feedback.
  - Dedicated **Clear Text** eraser action.
- **Fast Keyboard Navigation**:
  - `Tab` key indentation support (inserts 2 spaces without losing focus).
  - Quick save with `Ctrl+S` or `Ctrl+Enter`.
  - Cancel with `Esc`.
- **Responsive Viewport Fitting**: Dynamic flexbox containment guarantees the status bar and action buttons remain visible and comfortably proportioned without vertical clipping across all window dimensions.

### ⚡ Inline Deletion Visual Feedback
- **Seamless inline deletion**: Replaced distant toast popups with modern inline fade-and-collapse animations directly on deleted cards in both Full and Compact modes.

### 🗂️ Compact Mode & Navigation Upgrades
- **Unified Peek Popover Borders**: Connected the compact popover container styling with the card neon hover border for visual consistency.
- **Enlarged Action Button Hit Area**: Expanded the vertical "..." options button clickable area on compact cards to eliminate missclicks.
- **Search Keyboard Hint**: Added localized `"TYPE TO SEARCH"` / `"ESCRIBE PARA BUSCAR"` reminder to the center of the compact footer bar when browsing the main clipboard list.
- **Extended Keyboard Navigation**: Added full support for `PageUp`, `PageDown`, `Home` (Start/First), and `End` (Last) keys with smooth automatic scrolling across both view modes.

### ⚙️ Settings & Starter Content Improvements
- **Title Bar Animations Toggle**: Added an optional setting toggle to enable/disable HUD scan sweep animations on title bars (enabled by default).
- **Settings Hierarchy Polish**: Reorganized general settings under priority sections and removed developer console buttons from the backup panel.
- **Modern Starter & Demo Clips**: Added automated SQLite database seeding on fresh installations with modern, bilingual starter clips showcasing shortcuts, TypeScript snippets, CyberNeon color palettes, and markdown notes.

## [1.14.0] — 2026-08-26

### 🎯 Edge Auto-Scrolling & Drag Reordering
- **Smooth edge auto-scrolling**: Dragging a clip near the viewport boundaries (top/bottom in vertical mode, left/right in horizontal mode) now smoothly auto-scrolls the list with speed proportional to edge proximity.
- **Dynamic drop targeting**: Target clip slots are evaluated live in real-time under the cursor during auto-scrolling, enabling seamless reordering to clips initially outside the viewport.
- **Smart folder drop detection**: Dragging over folder buttons automatically pauses auto-scrolling, hides list insertion lines, and highlights the target folder for an intuitive drop.

### 🔔 Toast Coordination & Queueing System
- **Non-colliding startup banners**: Fixed race conditions between the Welcome Banner and the Update Available notification by sequencing them cleanly with a dedicated queue.
- **Polished toast lifecycle**: Update toasts wait for any active welcome animation to complete before presenting themselves, preventing abrupt cutoffs.

### 📁 Copy-to-Folder & Visual Feedback
- **Copy with duplicate detection**: Dragging or moving clips into folders duplicates them safely, accompanied by duplicate-detection toasts and animated double-pulse illumination (`folder-double-flash`) on folder tabs.
- **Enhanced compact peek previews**: Redesigned image peek with full-bleed popovers, checkerboard transparency grids, and calibrated hover timing.

### 📖 Documentation & Direct Download Badges
- **1-Click download buttons**: Added prominent hero download buttons in the README header pointing directly to the latest Windows installer.
- **Vector crypto donation support**: Replaced placeholder icons with crisp official SVG cryptocurrency logos and interactive toggles across the CyberGems project suite.
- **Cleaned architecture documentation**: Modernized project descriptions and removed legacy fork sections.

## [1.13.0] — 2026-08-26

### 📁 Copy to Folder & Double-Flash Feedback
- **Copy instead of move**: Dragging or moving clips into folders now duplicates them into the destination folder while preserving the original clip in the main clipboard and latest position.
- **Double-flash visual feedback**: Added an animated double-pulse illumination (`folder-double-flash`) on folder tabs and sidebar buttons when clips are copied.
- **Dedicated duplicate toast**: Friendly amber "Duplicate" toast notification when copying a clip that already exists in the target folder.

### 🖼️ Compact Image Peek Facelift
- **Maximized image area**: Removed the inner card padding and border, allowing previews to utilize the full popover area.
- **Checkerboard background**: Added a sleek transparency grid pattern for transparent PNG/WebP images in both Light and Dark themes.
- **Dynamic aspect-ratio fitting**: Previews now hug the exact height of the image without empty vertical margins.
- **Streamlined header**: Removed redundant action buttons to keep the hover peek focused and minimal.
- **Calibrated hover delay**: Adjusted peek activation delay to 750ms for a smoother, non-intrusive experience.

### 🐛 Bug Fixes & UX Polish
- **Clip deletion view wipeout fix**: Fixed a state issue where deleting a clip from the context menu could blank the active folder view until refresh.
- **Compact menu spacing**: Narrowed the three-dot button width and eliminated layout shifting on hover.
- **Hidden detail panel in compact**: Context menus in Compact mode now hide the Full-mode-only "Expand Details Panel" action.
- **Startup dev stability**: Added pre-dev cleanup lifecycle script to prevent orphaned background processes.

## [1.12.1] — 2026-08-25

### 🚀 Updater & Compact Mode Polish
- **Silent startup update checks**: Silenced background update errors when launching offline, preventing intrusive error toasts from obstructing the welcome notification.
- **Friendly updater notifications**: Simplified update error toasts to clear, non-technical advice ("Check your internet connection").
- **Clean About maintenance UI**: Redesigned the update error panel with a calmer, non-alarmist appearance and collapsible technical details.
- **Natural compact peek dismiss**: Moving the cursor or scrolling now immediately and smoothly dismisses the compact row hover peek.
- **Bilingual and localization updates**: Added full translations across all supported languages (English, Spanish, German, French, Japanese, Simplified Chinese).

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
