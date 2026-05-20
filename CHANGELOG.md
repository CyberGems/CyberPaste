# Changelog

All notable changes to CyberPaste will be documented in this file.

## v1.2.1

### Fixed
- **CI Release Build**: Fixed an issue where the updater plugin configuration was wiped out during CI builds when `TAURI_PRIVATE_KEY` was not set, causing the application to crash on startup.
- **Disk Cleanup**: Cleaned up non-essential files and synchronized local changes.

### 修复
- **CI 构建**: 修复了在未设置 `TAURI_PRIVATE_KEY` 时构建发布版导致更新器配置被清空，从而引起程序启动崩溃的问题。
- **磁盘清理**: 清理了非必要文件并同步本地更改。

## v1.2.0

### Added
- **Expanded AI Providers**: Added full support for Kimi (Moonshot) and Gemini (OpenAI-compatible) AI providers.
- **Model Preset Dropdowns**: Introduced model selection presets for all AI providers alongside support for completely custom model strings.
- **Text Input Shortcut Protection**: Added smart focus guards to disable global application hotkeys (like Delete, P, Enter, and Arrow keys) while editing clip contents or typing in settings forms, preventing unintended deletion of items.
- **Escape Key Interception**: Configured modal overlays (Edit Clip, AI Result, Settings) to intercept Escape keys in the capture phase to gracefully close only the active modal instead of hiding the main application.
- **HTML Tag Stripping**: Integrated automatic HTML tag removal for clipboard items sent to the AI, ensuring readable plain text results and optimized token usage.
- **Premium Scrollbars**: Styled scrollable settings panes and dialog content with custom semi-transparent webkit scrollbars.
- **Dialog Aesthetics**: Enhanced the AI result dialog with a glowing cyber neon header border and custom styling.

### Fixed
- **API Key Whitespace**: Automatically sanitizes whitespaces and newlines from API keys to prevent authentication errors.
- **AI Window Title Localization**: Fixed localization keys to correctly render localized headers for grammar correction actions.
- **Kimi URL Migration**: Automatically migrates old Moonshot AI URLs to the newer global platform endpoint (`https://api.moonshot.ai/v1`).

## v1.1.1

### Added
- **Cyber HUD Redesign**: Implemented a pixel-perfect, perfectly symmetric HUD Status Strip with enhanced typography and "Cylon eye" animated scan lines.
- **Compact View Polish**: Added a subtle, slower version of the HUD scan animation to the compact view header for cohesive design.

### Fixed
- **Window Stability**: Fixed window repositioning logic and layout toggle commands to guarantee perfect geometry preservation across view modes.

### 新增
- **赛博 HUD 重设**: 实现了像素级完美对称的 HUD 状态栏，优化了排版并新增了“赛博之眼”动态扫描线动画。
- **精简视图优化**: 为精简视图顶栏添加了更加柔和、缓慢的扫描动画，保持整体设计风格的一致性。

### 修复
- **窗口稳定性**: 修复了窗口重新定位逻辑和布局切换命令，确保在不同视图模式下完美保留窗口几何尺寸。

## v1.1.0

### Added
- **Image Viewer**: Integrated a new Image Viewer for previewing graphical clipboard entries.
- **Toast Notifications**: Added a new in-app toast notification system for instant feedback on user actions.
- **AI Refinements**: Improved AI processing logic for clipboard items.
- **Navigation Improvements**: Enhanced overall navigation within the app interface.

### 新增
- **图片查看器**: 集成了全新的图片查看器，用于预览图形剪贴板内容。
- **吐司通知**: 新增了应用内吐司通知系统，为用户操作提供即时反馈。
- **AI 优化**: 改进了针对剪贴板内容的 AI 处理逻辑。
- **导航改进**: 增强了应用界面内的整体导航体验。


## v1.0.2

### Added
- **Folder Navigation**: Added left/right arrow key navigation to switch between folders in Compact view.
- **Layout Toggle**: Added a dedicated header button to quickly switch between horizontal and vertical folder layouts in Compact mode.
- **Premium UI**: Redesigned toolbar buttons with a streamlined "ghost" style and a premium glowing gradient pill for the main view toggle.

### Fixed
- **Input Focus**: Prevented folder navigation shortcuts from firing while typing in the search bar.

### 新增
- **文件夹导航**: 精简视图下新增左右方向键切换文件夹功能。
- **布局切换**: 顶栏新增专用按钮，可在水平和垂直布局间快速切换。
- **高级 UI**: 重新设计了工具栏按钮，采用简约的“幽灵”风格，并为视图切换主按钮增加了高级霓虹渐变发光效果。

### 修复
- **输入焦点**: 修复了在搜索栏输入时文件夹导航快捷键被误触发的问题。

## v1.0.1

### Fixed
- **Drag & Drop**: Fixed clips not being draggable to folders by replacing the native drag system with a custom simulated one that works in both Full and Compact views.

### 修复
- **拖放功能**: 修复了剪贴项无法拖入文件夹的问题。通过自定义模拟拖拽系统替代原生系统，现在该功能在完整视图和精简视图中均可正常使用。


## v1.0.0

### Added
- **Dynamic Identity**: Support for custom icons and colors for folders, persisted in the database.
- **Cyber Search**: New overlay search bar with "Searching in [Folder]" context and smooth transitions.
- **Snap Scrolling**: "Silicon Valley" touch magnetic scroll for the clip list with high-precision alignment.
- **Neon Aesthetic**: Refined vibrant neon styles for buttons and minimalist frames for folder tabs.
- **Stability**: Debounced window auto-hide and multi-monitor support refinement.

### 新增
- **动态识别**: 支持文件夹自定义图标和颜色，并持久化保存至数据库。
- **赛博搜索**: 全新的覆盖式搜索栏，支持“正在搜索 [文件夹]”上下文及平滑过渡。
- **吸附滚动**: 剪贴板列表实现“硅谷级”磁性滚动，具有高精度对齐效果。
- **霓虹美学**: 优化了按钮的霓虹视觉效果，以及文件夹选项卡的极简框架设计。
- **稳定性**: 优化了窗口自动隐藏的防抖逻辑及多显示器支持。


## v1.3.7

### Improved
- Winget release pipeline: hash verification step added before publishing to winget-pkgs to prevent stale-hash mismatches; release tag now explicitly pinned

### 优化
- Winget 发布流程：在发布至 winget-pkgs 前增加哈希值校验步骤，防止哈希不匹配问题；发布时明确指定 release tag

## v1.3.6

### Added
- Support floating window above the taskbar (toggle in Settings)
- Every release is now automatically scanned with VirusTotal (70+ antivirus engines) — scan results are linked in the release notes

### 新增
- 窗口支持浮动在任务栏上层（可在设置中开启/关闭）
- 每次发布版本现在会自动通过 VirusTotal（70+ 款杀毒引擎）进行安全扫描，扫描结果链接附在 Release 说明中

## v1.3.5

### Added
- Native rounded corners support for all window effects (Mica, Mica Alt, Clear) using Windows 11 DWM — toggle on/off in Settings

### Fixed
- Fixed TypeScript build error caused by missing Vite client types (`import.meta.env`)

### 新增
- 所有窗口效果（Mica、Mica Alt、Clear）均支持原生圆角，通过 Windows 11 DWM 实现，可在设置中开启/关闭

### 修复
- 修复因缺少 Vite 客户端类型导致的 TypeScript 构建错误（`import.meta.env`）

## v1.3.4

### Added
- Brand new native style look with Windows Mica and Mica-Alt window effects for a seamless, beautiful appearance that blends with your desktop

### 新增
- 全新原生风格外观，支持 Windows Mica 和 Mica-Alt 窗口效果，与桌面完美融合，带来更精美的视觉体验

## v1.3.3

### Changed
- Refined UI layout: reduced window height, tightened card spacing, fixed control bar height, and removed CSS shadow in Clear window effect mode

### 变更
- 优化界面布局：减小窗口高度、收紧卡片间距、固定控制栏高度，并在"无效果"窗口模式下移除 CSS 阴影

## v1.3.2

### Fixed
- Fixed hotkey toggle broken after changing hotkey in settings (issue #6)
- Fixed winget package missing arm64 installer by switching to NSIS setup.exe for architecture detection (issue #7)

## v1.3.1

### Fixed
- Removed white/alpha border around settings window in dark mode

