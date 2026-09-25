<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- Maintainer: Rewrite the marked paragraph for every release. Use 25-45 words, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
Outside clicks hide the window again, styled clipboard HTML is stored as plain text, and the update dialog keeps its actions below the notes. Search and folder hints are clearer, with a quieter compact footer that rotates the useful shortcuts.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and configurable AI actions.

---

### ✨ Key Features & Highlights

- 🪟 **Hide on Outside Click**:
  - Clicking the desktop or another app hides the window again in Full and Compact, even when it stays above other windows.
  - The hide-on-blur setting shows its proper name in the confirmation toast.

- 📋 **Clipboard Text**:
  - Styled HTML that is only a sentence, such as a colored span from another app, is stored as plain text.
  - Tables and other structural HTML stay HTML.

- 🔎 **Search, Folders & Updates**:
  - Search history sits inside the field. The tooltip mentions type-to-search, and `Ctrl+F` always focuses the bar.
  - Full-mode folders use `Ctrl+←/→`. Compact folders use `←/→`, with a short quiet highlight and a slow footer rotation of search, folder, and peek hints.
  - The update dialog keeps Skip, Later, and Update below the notes. Spanish Skip reads “Saltar versión”.

---

### 📦 Downloads & Packages

> ⬇️ **Direct download:** click a file name to download it now. Same files as in **Assets** at the bottom of this page.

| File | Description | Platform |
| :--- | :--- | :--- |
| **[`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/CyberPaste_{{VERSION_NUM}}_x64-setup.exe)** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu, Desktop & Startup options) | Windows 10 / 11 (x64) |
| **[`CyberPaste_{{VERSION_NUM}}_x64-portable.zip`](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/CyberPaste_{{VERSION_NUM}}_x64-portable.zip)** | 📦 **Portable Build** (no installation; shares the user profile with the installed version) | Windows 10 / 11 (x64) |

---

### 🔐 Checksums

- **`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`** — SHA256: `{{INSTALLER_HASH}}`
- **`CyberPaste_{{VERSION_NUM}}_x64-portable.zip`** — SHA256: `{{PORTABLE_HASH}}`
{{MSI_BLOCK}}
---

*Crafted with precision by [CyberGems](https://cybergems.org)*
