<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section with the ACTUAL release notes for this specific version before tagging. NEVER leave or copy previous version notes! Use 25-45 words, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
Pause notifications from the tray with flexible durations, a unified Code category that absorbs HTML clips with their rich behavior intact, a visor that opens cleanly maximized, transparency that survives sleep, and a fully localized tray menu headline this release.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and configurable AI actions.

---

### ✨ Key Features & Highlights

- 🔕 **Pause Notifications from the Tray**:
  - **Flexible durations**: Pause for 1, 6, 12, or 24 hours (the suggested default) or until you turn them back on. The amber tray item shows the resume time and re-enables with one click.
  - **Synced with Settings**: A banner in Settings > Notifications mirrors the pause with a "Resume now" button, and the state survives restarts.
  - **True silence**: Capture, duplicate, and startup sounds are muted while paused; error alerts still come through.

- 🗂️ **One Code Category (HTML included)**:
  - **HTML joins Code**: Structural HTML captures now live in the single Code category with HTML syntax highlighting; the separate HTML type is gone from filters, stats, toasts, and achievements.
  - **Rich behavior intact**: Pasting still restores styled HTML, the visor keeps its rendered/source toggle, and Save As still exports `.html` files.
  - **Automatic migration**: Existing history converts on first launch, and the all-types achievement is now actually reachable.

- 🖥️ **Visor & Tray Polish**:
  - **Cleaner visor opens**: The viewer opens maximized at work-area size with a dark first frame and no blank flash.
  - **Calmer tray menu**: The Quit item behaves exactly like every other item, the card shadow turns dark and 30% softer without the cyan glow, and icon glows are toned down.

- 🛠️ **Fixes**:
  - **Working update check**: "Check for Update..." from the tray now starts the search even when the About window has to open fresh.
  - **No more black blocks**: Transparent windows (tray menu, toasts) regain their transparency automatically after sleep/resume.
  - **History that behaves**: Clipboard order survives restarts, pasting a history image saves it as a file in Explorer, and mixed CyberSnap copies prefer the image.

- ⌨️ **Hints & Localization**:
  - **One hint source**: The Full mode HUD, Compact footer, and emoji hints all draw from a single shared module; hotkeys interpolate from shared constants and the HUD pill centers on the titlebar.
  - **Fully localized tray**: The tray menu is completely translated in English and Spanish (including "Lock now"), guarded by a new `i18n:check` audit that fails on missing keys.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

<!-- Maintainer: Traduce el resumen y los puntos clave de arriba al español en cada release. -->

### 🚀 Novedades de esta versión

Pausa notificaciones desde el tray con duraciones flexibles, una categoría Código unificada que absorbe los clips HTML conservando su comportamiento enriquecido, un visor que abre maximizado sin parpadeos, transparencia que sobrevive a la suspensión y un tray totalmente traducido encabezan esta versión.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA configurables.

---

### ✨ Novedades destacadas

- 🔕 **Pausa notificaciones desde el tray**:
  - **Duraciones flexibles**: Pausa por 1, 6, 12 o 24 horas (la opción sugerida) o hasta que las reactives. El ítem ámbar del tray muestra la hora de reanudación y las reactiva con un clic.
  - **Sincronizado con Configuración**: Un banner en Configuración > Notificaciones refleja la pausa con botón "Reanudar ahora", y el estado sobrevive a los reinicios.
  - **Silencio real**: Los sonidos de captura, duplicado y bienvenida también se silencian; las alertas de error siguen llegando.

- 🗂️ **Una sola categoría Código (HTML incluido)**:
  - **HTML pasa a Código**: Las capturas de HTML estructural viven ahora en la única categoría Código con resaltado de sintaxis HTML; el tipo HTML separado desaparece de filtros, estadísticas, toasts y logros.
  - **Comportamiento rico intacto**: Pegar sigue restaurando el HTML con estilo, el visor conserva su alternancia renderizado/fuente y Guardar como sigue exportando `.html`.
  - **Migración automática**: El historial existente se convierte al primer arranque, y el logro de todos los tipos ahora sí es alcanzable.

- 🖥️ **Pulido del visor y del tray**:
  - **Aperturas limpias del visor**: El visor abre maximizado al tamaño del área de trabajo, con primer fotograma oscuro y sin flash en blanco.
  - **Tray más calmado**: El ítem Salir se comporta exactamente igual que los demás, la sombra pasa a oscura y un 30% más suave sin el glow cian, y los glows de los iconos bajan de intensidad.

- 🛠️ **Correcciones**:
  - **Búsqueda de actualizaciones funcional**: "Buscar actualizaciones..." desde el tray lanza la búsqueda aunque la ventana About tenga que abrirse de cero.
  - **Adiós a los bloques negros**: Las ventanas transparentes (menú del tray, toasts) recuperan su transparencia automáticamente tras suspender/reanudar.
  - **Un historial que se porta bien**: El orden del portapapeles sobrevive a los reinicios, pegar una imagen del historial la guarda como archivo en el Explorador y las copias mixtas de CyberSnap prefieren la imagen.

- ⌨️ **Hints y localización**:
  - **Una sola fuente de hints**: El HUD de Pantalla Completa, el footer Compacto y los hints de emojis salen de un módulo compartido; los atajos se interpolan desde constantes compartidas y la píldora del HUD se centra en la titlebar.
  - **Tray totalmente traducido**: El menú del tray está completamente traducido en inglés y español (incluido "Bloquear ahora"), con una nueva auditoría `i18n:check` que falla si falta una clave.



---

### 📦 Downloads & Packages

> ⬇️ **Direct download:** click a file name to download it now. Same files as in **Assets** at the bottom of this page.

| File | Description | Platform |
| :--- | :--- | :--- |
| **[`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/CyberPaste_{{VERSION_NUM}}_x64-setup.exe)** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu, Desktop & Startup options) | Windows 10 / 11 (x64) |
| **[`CyberPaste_{{VERSION_NUM}}_x64-portable.zip`](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/CyberPaste_{{VERSION_NUM}}_x64-portable.zip)** | 📦 **Portable Build** (no installation; shares the user profile with the installed version) | Windows 10 / 11 (x64) |

---

### 🔐 VirusTotal and SHA256

> 🛡️ The report opens on VirusTotal in a new tab and does not download anything.

**Installer**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})

```text
{{INSTALLER_HASH}}
```

**Portable edition**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{PORTABLE_HASH}})

```text
{{PORTABLE_HASH}}
```
{{MSI_BLOCK}}
---

*Crafted with precision by [CyberGems](https://cybergems.org)*
