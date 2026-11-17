<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. Keep the Spanish mirror inside the details block in sync: translate the summary and rewrite the highlights. -->
<!-- changelog-summary:start -->
Pasting lands next to the right caret thanks to three-layer detection and Smart positioning, toasts no longer steal focus or block clicks, and focus races after the global hotkey are gone. Table selections and clip metadata persist, uninstall metadata gains the website, and releases ship winget manifests.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and optional AI actions.

---

### ✨ Key Features & Highlights

- 🎯 **Smarter paste positioning**:
  - Three-layer caret detection across UIA, MSAA and cached carets finds the right insertion point, and Smart positioning follows the caret of the active window.
  - Cached MSAA carets are ignored when the UIA focus is not on an editable control.

- 🔇 **Toasts that never interrupt**:
  - Notification toasts appear without activating or stealing focus, and hiding one forces the window off-screen.
  - Empty transparent toast windows no longer linger invisibly and block clicks.

- 🪟 **Focus races fixed**:
  - Showing the window via the global hotkey no longer hides it immediately, view transitions force the foreground, and the blur watcher debounces after idle wake.

- 🧹 **Data, uninstall and maintenance**:
  - Single-cell table selections stay text, HTML clip metadata persists, and the active app filter text size aligns with a reserved clip card footer.
  - The Windows uninstall entry shows the website and description, the update modal skips "Before you install", 15 npm and 20 cargo dependencies are refreshed, and every release ships winget manifests.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

El pegado cae junto al cursor correcto gracias a la detección en tres capas y al posicionamiento Smart, las notificaciones ya no roban el foco ni bloquean clics, y desaparecen las carreras de foco tras el atajo global. Las selecciones de tabla de una celda y los metadatos de clips se conservan, la entrada de desinstalación suma la web y los releases publican manifiestos winget.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA opcionales.

---

### ✨ Novedades destacadas

- 🎯 **Posicionado de pegado más inteligente**:
  - La detección de cursor en tres capas sobre UIA, MSAA y cursores cacheados encuentra el punto de inserción correcto, y el posicionamiento Smart sigue el cursor de la ventana activa.
  - Los cursores MSAA cacheados se ignoran cuando el foco UIA no está sobre un control editable.

- 🔇 **Toasts que nunca interrumpen**:
  - Las notificaciones toast aparecen sin activarse ni robar el foco, y al ocultarlas la ventana se retira de la pantalla.
  - Las ventanas toast transparentes y vacías ya no permanecen invisibles bloqueando clics.

- 🪟 **Carreras de foco resueltas**:
  - Abrir la ventana con el atajo global ya no la oculta de inmediato, los cambios de vista fuerzan el primer plano y el vigilador de desenfoque se amortigua tras despertar de la inactividad.

- 🧹 **Datos, desinstalación y mantenimiento**:
  - Las selecciones de una sola celda de tabla se conservan como texto, los metadatos HTML de los clips persisten, y el tamaño del filtro de app activa se alinea con el pie reservado de las tarjetas de clip.
  - La entrada de desinstalación de Windows muestra el sitio web y la descripción, el modal de actualización omite «Antes de instalar», se renuevan 15 dependencias de npm y 20 de cargo, y cada release publica manifiestos winget.

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
