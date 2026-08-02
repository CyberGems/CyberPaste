# Changelog

All notable changes to CyberPaste are documented here.

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
