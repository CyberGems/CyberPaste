<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. Keep the Spanish mirror inside the details block in sync: translate the summary and rewrite the highlights. -->
<!-- changelog-summary:start -->
Adds configurable update notices, smoother startup and window handling, focused search history, and native-feeling folder wheel scrolling, while improving clipboard source icons, Help navigation, sample content, and bilingual privacy disclosures.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and optional AI actions.

---

### ✨ Key Features & Highlights

- **One update experience everywhere**: A shared floating notice brings localized release notes, background downloads, cancellation, version skipping, and restart-to-install controls to both window modes. Automatic notices are opt-in, while manual checks remain in About.
- **Faster, calmer search and folder navigation**: Search history opens beneath the focused field in Full and Compact, with clearer focus behavior and shared styled field menus. Folder tabs scroll smoothly with normalized wheel distance and no hover churn.
- **More recognizable clipboard sources**: Windows UWP apps resolve their real source behind service hosts and show packaged logos, with a one-time icon backfill for eligible historical clips. Legacy PNG records are repaired automatically.
- **Cleaner windows from startup onward**: The main window waits for its UI before appearing, startup flashes are suppressed, and About/Settings borders, native shortcuts, toast focus, and tray warmup are more consistent.
- **Helpful polish and clearer disclosure**: Help links move into an accessible submenu, tray tooltips and the pin-tip checkbox are refined, starter samples are leaner, and bilingual AI/privacy documentation explains optional processing and update requests.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

Añade avisos de actualización configurables, un arranque y manejo de ventanas más suaves, historial de búsqueda al enfocar y desplazamiento natural de carpetas con rueda, además de mejorar iconos de origen, navegación de Ayuda, contenido inicial y divulgación bilingüe de privacidad.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA opcionales.

---

### ✨ Novedades destacadas

- **Una sola experiencia de actualización**: Un aviso flotante común reúne notas localizadas, descargas en segundo plano, cancelación, omisión de versiones y reinicio para instalar en ambos modos. Los avisos automáticos son opcionales y las comprobaciones manuales siguen en Acerca de.
- **Búsqueda y navegación más ágiles**: El historial se abre bajo el campo enfocado en Completo y Compacto, con mejor comportamiento del enfoque y menús compartidos. Las pestañas de carpeta se desplazan suavemente con distancia normalizada y sin efectos hover molestos.
- **Orígenes del portapapeles más reconocibles**: Las apps UWP de Windows resuelven su origen real detrás de servicios y muestran logotipos de paquete, con una migración de iconos para clips históricos elegibles. Los PNG antiguos se reparan automáticamente.
- **Ventanas más limpias desde el inicio**: La ventana principal espera a renderizar su interfaz, se suprimen los destellos y los bordes de Acerca de/Ajustes, atajos nativos, foco de avisos y precalentamiento de bandeja son más coherentes.
- **Ayuda, bandeja y divulgación más claras**: Los enlaces de ayuda pasan a un submenú accesible, se refinan los textos del tray y la casilla del aviso, las muestras iniciales son más concisas y la documentación bilingüe explica el procesamiento opcional y las solicitudes de actualización.

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
