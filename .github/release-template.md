<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section with the ACTUAL release notes for this specific version before tagging. NEVER leave or copy previous version notes! Use 25-45 words, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
A dedicated Clipboard settings tab now groups limits and pasting behaviors, alongside pixel-aligned theme cards and expanded folder lists. An unboxed titlebar update button, console update preview, full-mode peek polish, and copyable checksums complete this release.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and configurable AI actions.

---

### ✨ Key Features & Highlights

- ⚙️ **Dedicated Clipboard Settings & Layout Reorganization**:
  - **New "Clipboard" tab**: Capturing limits, retention quotas, and pasting behaviors now have their own dedicated settings tab, decluttering the General panel.
  - **Structured sections**: Organized into "Limits & Storage" (clip limits, retention days, text/image sizes, storage quota) and "Behavior & Pasting" (monitoring, auto-paste, instant search, external image editor).
  - **Intuitive tab hierarchy**: Reordered settings navigation placing Notifications near the top and grouping view mode settings cleanly.
  - **Streamlined General tab**: Grouped window animation and blur behavior into an organized "Other" category.

- 🎨 **Pixel-Perfect Theme Cards & Folder Air**:
  - **Pixel-aligned theme previews**: Stabalized frame geometry and border sizing to eliminate subpixel rounding jitter and keep all theme cards perfectly aligned.
  - **Expanded folder management**: Tuned folder container height to cleanly display up to 7 folders simultaneously, with a direct pencil edit icon for intuitive renaming.
  - **Titlebar menu polish**: Removed redundant double divider in the "More" menu.

- 🔔 **Titlebar Update Button Redesign & Live Preview**:
  - **Seamless update button**: Removed the heavy pill wrapper in favor of a sleek, standardized 32x32 button with a gentle, non-distracting LED pulse.
  - **Interactive preview helper**: Added console function `__CYBERPASTE_SHOW_UPDATE_PREVIEW__()` to inspect release dialogs directly during development.
  - **About modal scroll**: Fixed release notes container height and scrollbar overflow in the update dialog.

- 🔍 **Peek Preview & Interaction Polish**:
  - **Full mode peek restoration**: Re-enabled and tuned hover peek preview with balanced mouse-leave sensitivity to prevent premature closing.
  - **Type icon tooltips**: Added contextual type tooltips in Full mode for complete parity with Compact mode.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

<!-- Maintainer: Traduce el resumen y los puntos clave de arriba al español en cada release. -->

### 🚀 Novedades de esta versión

Una nueva pestaña Portapapeles organiza límites y pegado, junto a tarjetas de tema milimétricas y lista de carpetas ampliada. Botón de actualización sin caja en la barra de título, vista previa de notas, peek perfeccionado y checksums copiables completan este lanzamiento.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA configurables.

---

### ✨ Novedades destacadas

- ⚙️ **Nueva Pestaña Portapapeles y Reorganización de Configuración**:
  - **Pestaña dedicada "Portapapeles"**: Los límites de captura, cuotas de retención y opciones de pegado se trasladan a una pestaña propia, aligerando el panel General.
  - **Secciones estructuradas**: Organizado en "Límites y Almacenamiento" (historial, días de retención, tamaños máximos, cuota de disco) y "Comportamiento y Pegado" (monitoreo, auto-pegado, búsqueda al tipear, editor de imagen externo).
  - **Jerarquía intuitiva**: Pestaña Notificaciones reubicada al segundo lugar y modos de vista agrupados lógicamente.
  - **Panel General optimizado**: Opciones de animación de título y ocultación agrupadas limpiamente bajo la categoría "Otros".

- 🎨 **Tarjetas de Tema Milimétricas y Mayor Espacio en Carpetas**:
  - **Previsualización de temas precisa**: Geometría y bordes estandarizados a 90x62px para eliminar desalineaciones subpíxel y mantener todas las tarjetas en perfecto balance visual.
  - **Gestor de carpetas ampliado**: Altura ajustada para mostrar hasta 7 carpetas simultáneas sin scroll innecesario, incorporando icono de lápiz para renombrar.
  - **Menú "Más" pulido**: Eliminado el doble separador tras el botón de donación.

- 🔔 **Rediseño del Botón de Actualización y Previsualización en Vivo**:
  - **Botón integrado sin caja**: Eliminada la envoltura tipo píldora, adaptando un botón de 32x32px estandarizado con animación suave del indicador led.
  - **Función de vista previa**: Comando de consola `__CYBERPASTE_SHOW_UPDATE_PREVIEW__()` para revisar el diálogo de notas en cualquier momento.
  - **Desplazamiento en ventana Acerca de**: Corregida la altura máxima y el scroll del contenedor de notas de versión.

- 🔍 **Peek Preview y Detalles de Interacción**:
  - **Peek en modo Completo optimizado**: Reactivado el hover peek con sensibilidad balanceada al mover el cursor para evitar cierres accidentales.
  - **Tooltips en iconos de tipo**: Tooltips contextuales incorporados en modo Completo en total paridad con el modo Compacto.

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

- **`CyberPaste_{{VERSION_NUM}}_x64-setup.exe`** — SHA256:
  ```text
  {{INSTALLER_HASH}}
  ```

- **`CyberPaste_{{VERSION_NUM}}_x64-portable.zip`** — SHA256:
  ```text
  {{PORTABLE_HASH}}
  ```
{{MSI_BLOCK}}
---

*Crafted with precision by [CyberGems](https://cybergems.org)*
