<p align="center">
  <img src="frontend/public/logo.png" alt="CyberPaste" width="128" height="128" />
</p>

<h1 align="center">
    CyberPaste - The Ultimate Clipboard Manager
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/platform-Windows%2010%2B-0078D4.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/Tauri-2.x-24C8DB.svg" alt="Tauri" />
  <img src="https://img.shields.io/badge/version-1.15.0-green.svg" alt="Version" />
</p>

<p align="center">
  <a href="https://github.com/CyberGems/CyberPaste/releases/latest">
    <img src="https://img.shields.io/badge/⚡_Download_Latest_Release-(Windows_64--bit)-00F2FF?style=for-the-badge&logo=windows&logoColor=000000" alt="Download Latest Release" />
  </a>
  <a href="https://github.com/CyberGems/CyberPaste/releases">
    <img src="https://img.shields.io/badge/All_Releases-Changelog-18181B?style=for-the-badge&logo=github&logoColor=white" alt="All Releases" />
  </a>
</p>

CyberPaste stores everything you copy to your clipboard locally, so you can recall any specific clip at any time. It’s the easiest way to save, organize, search, pin, edit, and preview almost everything you copy on Windows and paste it instantly.

*Free and open source (GPLv3) — no ads, no tracking, and no data collection. Just enjoy it.*

> Official site: [cybergems.org](https://cybergems.org/) · Source: [github.com/CyberGems/CyberPaste](https://github.com/CyberGems/CyberPaste)

## Features

- 🔒 **100% Private & Local-First** - SQLite storage running locally in WAL mode with fast indexes. Zero analytics, zero telemetry, no cloud required.
- 🎨 **Polished CyberGems UI** - Dark, Light, CyberPaste (with signature glow and neon accents), and System themes with native Windows Mica & Mica-Alt vibrancies, custom corner radiuses, and smooth animations.
- 🗂️ **Dual View Modes**:
  - **Full Mode**: Responsive multi-column grid with live zoom scaling, 2D keyboard navigation, and vertical or horizontal layout options.
  - **Compact Mode**: High-density list with quick-access tabs, sidebar or horizontal folder bar, and hover peek preview.
- 📋 **Rich Content Support** - Automatically captures formatted Text, Code (with syntax highlighting and language badges), HTML, RTF, Images (with high-res viewer & OCR text extraction), URLs, and Files.
- 🔍 **Instant Search & Type Filtering** - Real-time full-text search with quick filter chips (Text, Code, Images, Links, Files) and live database counters.
- 📁 **Folders & Organization** - Organize clips into custom folders, drag & drop clips with edge auto-scrolling, pin favorites, and bulk manage clips with `Ctrl+Click` / `Shift+Click`.
- 🔔 **Smart HUD Notifications & Sounds** - Corner toasts with countdown timer bars, duplicate detection, cut detection, and synthesized or custom sound effects.
- 🤖 **Integrated AI Assistant** - Summarize, translate, explain code, or fix grammar via OpenAI, DeepSeek, Ollama, Groq, OpenRouter, or any OpenAI-compatible provider with fully customizable prompts and action names.
- 🔤 **Bilingual Localization** - Complete native English and Spanish interface across all windows, settings, and dialogs.
- 🚫 **Privacy Exceptions** - Ignore sensitive apps (e.g., password managers, banking tools) by process name or full executable path.
- 🖥️ **Multi-Display Aware** - Automatically detects cursor position and presents the clipboard window on the active monitor.
- ⚙️ **Modular Window Ecosystem** - Separate optimized windows for Main Clipboard, System Tray Menu, Multi-tab Settings, Image Viewer & OCR, and Toast Notifications.

## Installation Guide

### 1. Install via Winget

```bash
winget install CyberGems.CyberPaste
```

### 2. Download from GitHub Releases (Windows)

Download the latest installer directly from:
[https://github.com/CyberGems/CyberPaste/releases](https://github.com/CyberGems/CyberPaste/releases)

> **Downloads:** [github.com/CyberGems/CyberPaste/releases](https://github.com/CyberGems/CyberPaste/releases)

## Keyboard Shortcuts

### Global
- **Toggle Window**: `Ctrl+Shift+V` (Default, customizable in Settings)

### In-App
- `↑ / ↓ / ← / →` - 2D grid and list navigation
- `Enter` - Paste selected clip (with auto-paste injection)
- `Space` - Open full preview / detail panel
- `Ctrl + C` - Copy selected clip to clipboard
- `Ctrl + F` - Focus search input
- `Ctrl + A` - Select all visible clips (bulk selection mode)
- `P` - Pin / unpin selected item
- `Delete` - Delete selected item
- `Escape` - Clear search / close modal or window

## Application Exceptions (Ignored Apps)

CyberPaste allows you to exclude specific applications from being recorded in the clipboard history. This is useful for privacy-sensitive applications like password managers or banking tools.

**Logic & Behavior:**
- **How to manage:** Go to Settings -> Ignored Applications. You can browse for an executable (`.exe`) or type its process name.
- **Privacy Protection:** When content is copied, CyberPaste verifies the source application against your ignore list before saving.
- **Robust Matching:** The system checks against **both**:
    1. **Executable Name** (e.g., `notepad.exe`) - Matches any instance of this app regardless of location.
    2. **Full File Path** (e.g., `C:\Windows\System32\notepad.exe`) - Matches only the specific installed instance.
- **Case Insensitive:** Matching is case-insensitive to ensure reliable detection on Windows.

## AI Features

CyberPaste integrates powerful AI capabilities to help you process your clipboard content efficiently.

- **Actions:** Right-click any clip or use the detail panel to access AI actions:
    - **Summarize:** Get a concise summary of long texts.
    - **Translate:** Translate content to your preferred language.
    - **Explain Code:** Understand complex code snippets instantly.
    - **Fix Grammar:** Polish your writing with professional grammar checks.
- **Full Customization:**
    - **Custom Names:** Rename AI actions in Settings (e.g., change "Translate" to "To Spanish").
    - **Custom Prompts:** Override default system prompts to tailor the AI's behavior and output style.
    - **Provider Support:** Support for OpenAI, DeepSeek, Ollama, Groq, OpenRouter, and other OpenAI-compatible APIs.

*(An API key from your preferred provider is required for AI features).*

## Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Database**: SQLite (WAL mode)
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.77+
- pnpm

### Dev commands

```bash
# Install dependencies
pnpm install

# Run development build
pnpm tauri dev
```

### Building

```bash
# Build for production
pnpm tauri build
```

## Project Structure

```text
CyberPaste/
├── src-tauri/               # Rust backend & Tauri configuration
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   ├── lib.rs           # App initialization, shortcuts & window managers
│   │   ├── commands.rs      # IPC command handlers & toasts
│   │   ├── clipboard.rs     # Clipboard monitoring & capture engine
│   │   ├── database.rs      # SQLite schema & persistence
│   │   ├── models.rs        # Data structures & settings definitions
│   │   └── settings_manager.rs # Thread-safe settings manager
│   ├── Cargo.toml
│   └── tauri.conf.json
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # UI components (ClipCard, ClipList, ControlBar, Modals)
│   │   ├── windows/         # Dedicated window views (Toast, Viewer, About, TrayMenu)
│   │   ├── hooks/           # Custom React hooks (theme, language, keyboard)
│   │   ├── i18n/            # Internationalization (English & Spanish locales)
│   │   ├── types/           # TypeScript definitions
│   │   ├── utils/           # Helper utilities
│   │   └── App.tsx          # Main window application
│   └── package.json
└── README.md
```

## Privacy and Security

- **Local storage only** - All clipboard history and settings are stored locally in SQLite. No data is sent externally except to the AI provider you explicitly configure.
- **Ignored apps** - Content from sensitive applications is never recorded.

## Contributing

Contributions are welcome. Please open an issue describing the change before starting large work, and submit pull requests against the main branch.

## Acknowledgments

Originally forked from [PastePaw](https://github.com/XueshiQiao/PastePaw) by [XueshiQiao](https://github.com/XueshiQiao). CyberPaste has since been extensively rewritten and expanded by [CyberGems](https://cybergems.org/).

This project also builds on open-source components including Tauri, React, SQLite, and Rust — thanks to their authors and maintainers.

## Donate

**CyberPaste** is a personal open-source project within the **CyberGems** suite. I've spent thousands of hours building and refining it — both for my own use and to share premium-quality software with the world for free.

If you'd like to support this work, a donation would mean a lot. Thank you! 🙏

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-0070BA?style=for-the-badge&logo=paypal)](https://paypal.me/CyberGems) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/cybergems)

<details>
<summary><b>Crypto donations (BTC, ETH, USDT, LTC) — choose the correct network</b></summary>

| Asset | Network | Address | QR |
|---|---|---|---|
| <img src="docs/donate/btc.svg" width="18" height="18" valign="middle" alt="BTC" /> **BTC** | Bitcoin | `bc1q5mxzz05nmvsheqzx7970euswta3fksxzcfzag4` | ![BTC QR](docs/donate/qr-btc.png) |
| <img src="docs/donate/eth.svg" width="18" height="18" valign="middle" alt="ETH" /> **ETH** | Ethereum (ERC20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![ETH QR](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | Ethereum (ERC20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![USDT ERC20 QR](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | BNB Smart Chain (BEP20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![USDT BEP20 QR](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | Tron (TRC20) | `TSVbSk1HSyZ1NprCnAYiw56ECwXgH887mD` | ![USDT TRC20 QR](docs/donate/qr-usdt-tron.png) |
| <img src="docs/donate/ltc.svg" width="18" height="18" valign="middle" alt="LTC" /> **LTC** | Litecoin | `LWGnEHgcFCE2BRkzLnsdPDD8Y8ZeDK577X` | ![LTC QR](docs/donate/qr-ltc.png) |

> ⚠️ Send only the selected asset on the indicated network. Using the wrong network will result in permanent loss of funds.

</details>

## License

CyberPaste is distributed under the terms of the **GNU General Public License v3.0**. See [`LICENSE`](LICENSE) for the full license text.
