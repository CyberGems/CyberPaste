## 📋 CyberPaste {{VERSION}} — Release Notes

Welcome to the official **CyberPaste {{VERSION}}** release! CyberPaste is a lightning-fast, privacy-first clipboard history manager with smart AI actions, folders, and native Windows acrylic desktop integration.

---

### ✨ Key Features & Highlights

- 🐛 **Windows Autostart Fix**:
  - The “Start with Windows” toggle now actually launches CyberPaste at logon.
  - The Run command is quoted so Explorer can start `C:\Program Files\CyberPaste\CyberPaste.exe`.
  - Removed leftover `--flag1 --flag2` example args from the Tauri autostart plugin.

- ⬆️ **Title-Bar Update Button** (from 1.19.0):
  - Dynamic CyberWall-style pill appears to the left of the window controls when a newer version is available.
  - Collapsed arrow in rest; hover expands to **Update** / **Actualizar**.

- 📚 **Title-Bar & Tray Help Menus** (from 1.19.0):
  - CyberFeeds-style overflow menu with Documentation & Wiki, website, changelog, GitHub, and About.

---

### 📦 Downloads & Packages

| File | Description | Platform |
| :--- | :--- | :--- |
| **`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu, Desktop & Startup options) | Windows 10 / 11 (x64) |

---

### 🔐 Checksums

- **`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`** — SHA256: `{{INSTALLER_HASH}}`
{{MSI_BLOCK}}
---

*Crafted with precision by [CyberGems](https://cybergems.org)*
