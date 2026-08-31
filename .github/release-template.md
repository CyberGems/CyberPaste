## 📋 CyberPaste {{VERSION}} — Release Notes

Welcome to the official **CyberPaste {{VERSION}}** release! CyberPaste is a lightning-fast, privacy-first, cyberpunk-themed clipboard history manager with smart AI actions, folders, and native Windows acrylic desktop integration.

---

### ✨ Key Features & Highlights

- 👁️ **Adaptive Full Mode Hover Peek**:
  - Instant high-resolution preview popover for image cards and expanded scrollable monospace views for code & text.
  - Automatic aspect-ratio calibration expanding up to **1280×800px** without empty letterbox padding.
  - Smart 4-sided viewport bounds clamping preventing any screen edge cutoffs.
  - Instant dismissal on subtle cursor movement, scroll wheel, or mouse click.
  - Redundant peek suppression for single-file clips and short snippets across both Full and Compact modes.
  - Dedicated toggle setting under *Modo Completo* in Settings.

- 🌀 **Seamless View Mode Morph & Cyberpunk Transition Loader**:
  - Redesigned window resizing animation between Compact and Full modes with real-time UI masking.
  - Holographic spinning scanline ring with pulsing cyan glow and official logo branding during mode morphs.
  - Eradicated all post-toggle background flashes and double renders by preventing redundant Win32 DWM vibrancy re-applications.

- 🪟 **True Hardware Acrylic Gaussian Blur**:
  - Replaced legacy backdrop with native Win32 hardware Acrylic blur (`apply_acrylic`), eliminating background desktop bleed-through.

- 🔊 **Refined Tactile Duplicate Sound**:
  - Replaced high-pitch alert beep with a dry, tactile mechanical click (320Hz → 140Hz) for duplicate clipboard copy events.

- 📋 **Smart HTML Web Clipboard Sanitization**:
  - Web copy operations (e.g. copying text on GitHub in Firefox) now prioritize clean plain text over internal browser HTML tags and markdown link wraps.

- 🎨 **App Icon Suite & Razor-Sharp System Tray**:
  - Refreshed official brand icon suite with Lanczos 32×32px downsampling for crystal-clear system tray rendering.

---

### 📦 Downloads & Packages

| File | Description | Platform |
| :--- | :--- | :--- |
| **`CyberPaste_{{VERSION}}_x64-setup.exe`** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu, Desktop & Startup options) | Windows 10 / 11 (x64) |
| **`CyberPaste_{{VERSION}}_x64_en-US.msi`** | 💼 **Enterprise MSI Package** (Standard Windows Installer package) | Windows 10 / 11 (x64) |

---

### 🔍 VirusTotal Scan Results (70+ Antivirus Engines)

- 🛡️ **Setup Installer**: [View VirusTotal Inspection Report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})  
  *(SHA256: `{{INSTALLER_HASH}}`)*
- 💼 **MSI Installer**: [View VirusTotal Inspection Report](https://www.virustotal.com/gui/file/{{MSI_HASH}})  
  *(SHA256: `{{MSI_HASH}}`)*

---

*Crafted with precision by [CyberGems](https://cybergems.org)*
