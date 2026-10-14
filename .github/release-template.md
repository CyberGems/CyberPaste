<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- Maintainer: Rewrite the marked paragraph for every release. Use 25-45 words, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
Dedicated hover buttons and context menu options now cleanly separate copy from direct paste. Extended idle lock options up to 12 hours, refined mouse wheel settings, and duplicate alert suppression for internal actions complete this release.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and configurable AI actions.

---

### ✨ Key Features & Highlights

- 📋 **Independent Copy & Paste Actions**:
  - Quick hover buttons on clip cards to Copy to clipboard or Paste directly into the active application.
  - Dedicated context menu options distinguishing clipboard copying from direct pasting.
  - Keyboard shortcut `Ctrl+C` to copy the selected clip to clipboard without triggering auto-paste.

- 🔒 **Extended Idle Auto-Lock**:
  - Added extended security timeout intervals: 2, 4, 8, and 12 hours for flexible unattended workstation protection.

- 🔇 **Internal Action Alert Suppression**:
  - Automatically suppresses duplicate audio chimes and toast notifications when copying or pasting clips within the app.
  - Preserves original application source metadata when items are reused internally.
  - Pre-arms clip ignore hash on internal copy and paste to ensure clean database state.

- ⚙️ **Settings Polish**:
  - Clarified mouse wheel folder navigation title and description in English and Spanish.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

<!-- Maintainer: Traduce el resumen y los puntos clave de arriba al español en cada release. -->

### 🚀 Novedades de esta versión

Botones flotantes y opciones de menú contextual separan claramente la acción de copiar del pegado directo. Nuevas opciones de bloqueo por inactividad de hasta 12 horas, ajustes clarificados para la rueda del ratón y supresión de avisos duplicados completan esta versión.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA configurables.

---

### ✨ Novedades destacadas

- 📋 **Acciones Separadas de Copiar y Pegar**:
  - Botones flotantes rápidos en las tarjetas de clip para copiar al portapapeles o pegar directamente en la aplicación activa.
  - Opciones de menú contextual diferenciadas para copiar al portapapeles frente a pegar directamente.
  - Atajo de teclado `Ctrl+C` para copiar el clip seleccionado al portapapeles sin activar el pegado automático.

- 🔒 **Bloqueo por Inactividad Extendido**:
  - Nuevos intervalos de tiempo de espera: 2, 4, 8 y 12 horas para mayor flexibilidad y seguridad.

- 🔇 **Supresión de Avisos en Acciones Propias**:
  - Silencia automáticamente avisos sonoros y notificaciones emergentes al copiar o pegar elementos dentro de la propia aplicación.
  - Conserva los metadatos de la aplicación de origen al reutilizar elementos internamente.
  - Prepara la supresión de hash antes de escribir para mantener el historial limpio.

- ⚙️ **Claridad en Configuración**:
  - Título y descripción clarificados para la navegación por carpetas con la rueda del ratón en inglés y español.

</details>

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
