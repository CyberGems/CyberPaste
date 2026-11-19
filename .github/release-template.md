<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. Keep the Spanish mirror inside the details block in sync: translate the summary and rewrite the highlights. -->
<!-- changelog-summary:start -->
Fixes system tray menu positioning, mixed-DPI scaling, vertical taskbar anchoring, and painted reveal across multi-monitor setups so menus open cleanly without jumps or flicker, and adds an Exit option to the titlebar More menu.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and optional AI actions.

---

### ✨ Key Features & Highlights

- 🪟 **Accurate multi-monitor and mixed-DPI tray placement**: Reworked tray positioning in physical coordinates with per-monitor DPI handling and painted reveal so the menu opens flush beside vertical or horizontal taskbars without jumping or flickering.
- 🚪 **Exit from the titlebar menu**: Added an `Exit CyberPaste` item to the titlebar More menu for quick full shutdown without using the system tray.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

Corrige el posicionamiento del menú de bandeja, el escalado en monitores con DPI mixto, el anclaje en barras verticales y el revelado pintado para abrir sin saltos ni parpadeos, y añade la opción Salir al menú Más de la barra de título.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA opcionales.

---

### ✨ Novedades destacadas

- 🪟 **Posicionamiento preciso en multimonitor y DPI mixto**: Se rehizo el cálculo de la bandeja en píxeles físicos con soporte DPI por monitor y revelado tras pintar, evitando saltos y parpadeos junto a barras verticales u horizontales.
- 🚪 **Opción Salir en la barra de título**: Se agregó `Salir de CyberPaste` al menú Más de la barra de título para cerrar la aplicación por completo sin pasar por la bandeja del sistema.

### ℹ️ Antes de instalar

- **Windows:** esta versión aún no está firmada digitalmente. SmartScreen puede avisar antes de ejecutarla: **Más información › Ejecutar de todas formas**. Cuando Smart App Control está activado, Windows rechaza programas sin firmar; consulta la [política de firma de código](https://github.com/CyberGems/.github/blob/main/CODE_SIGNING.md). Verifica la descarga con los checksums SHA256 que aparecen más abajo.

</details>

---

### ℹ️ Before you install

- **Windows:** this release is not code-signed yet. SmartScreen may ask before it runs: **More info › Run anyway**. Where Smart App Control is on, Windows refuses unsigned programs; see the [code signing policy](https://github.com/CyberGems/.github/blob/main/CODE_SIGNING.md). Verify the download with the SHA256 checksums below.

---

### 📦 Downloads & Packages

> ⬇️ **Direct download:** click a file name to download it now. Same files as in **Assets** at the bottom of this page.

| File | Description | Platform |
| :--- | :--- | :--- |
| **[`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/CyberPaste_{{VERSION_NUM}}_x64-setup.exe)** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu, Desktop & Startup options) | Windows 10 / 11 (x64) |
| **[`CyberPaste_{{VERSION_NUM}}_x64-portable.zip`](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/CyberPaste_{{VERSION_NUM}}_x64-portable.zip)** | 📦 **Portable Build** (no installation; shares the user profile with the installed version) | Windows 10 / 11 (x64) |

---

### 🔐 VirusTotal and SHA256

> 🛡️ The report opens on VirusTotal and does not download anything.

**Installer**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})

```text
{{INSTALLER_HASH}}
```

**Portable**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{PORTABLE_HASH}})

```text
{{PORTABLE_HASH}}
```
{{MSI_BLOCK}}
---

📜 **Full changelog:** browse every version in [CHANGELOG.md](https://github.com/CyberGems/CyberPaste/blob/main/CHANGELOG.md).

*Crafted with precision by [CyberGems](https://cybergems.org)*
