<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section with the ACTUAL release notes for this specific version before tagging. NEVER leave or copy previous version notes! Use 25-45 words, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
Settings search, rich formatting preserved end to end, fixed pin slots with accordion memory, Full Screen Mode, and a rebuilt context menu with real hotkeys headline this release, alongside an inline Saved indicator and installer path fixes.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and configurable AI actions.

---

### ✨ Key Features & Highlights

- 🔍 **Settings Search Bar**:
  - **Find any setting instantly**: The sidebar search matches labels across all tabs and jumps straight to the setting — even inside long tabs.
  - **Consistent scoring**: Strong label matches outrank description hints, with accent-insensitive matching.

- 💾 **Saved Indicator & Sidebar Close**:
  - **Elegant "Saved" LED**: Every settings change lights a green LED badge with a "Saved" label for five seconds, then fades out.
  - **One-click Close**: A permanent Close button lives at the bottom of the settings sidebar.

- 🧲 **Rich Formatting Preserved End-to-End**:
  - **RTF/HTML flavors captured**: Styled copies from Word, browsers and editors keep their bold, font sizes and colors.
  - **Faithful re-paste**: Pasting later writes text, HTML and RTF together — rich targets restore the original look, plain targets keep plain text.
  - **Settings toggle**: "Preserve rich formatting when copying and pasting" in Settings > Clipboard turns it off.

- 📌 **Fixed Pin Slots & Accordion Memory**:
  - **Locked visual slots**: Pinned clips maintain their slot number while normal clips flow around them on captures and deletes.
  - **Accordion behavior**: If deletions reduce the list below a pinned slot, the pin moves to the end without gaps, expanding back to its slot when new clips arrive.
  - **Live clipboard safety**: Slot #1 in the main list remains reserved for incoming clips.
  - **Drag protection**: Dropping unpinned clips onto pinned cards displays a forbidden cursor; dragging a pinned clip repositions its anchor.

- 🖥️ **Full Screen Mode**:
  - **Work-area fullscreen**: The main window fills the monitor work area, respecting taskbars on any edge, with square corners and a fixed size (CyberClock/CyberLauncher style).

- 🖱️ **Context Menu Overhaul**:
  - **Labeled quick-actions**: The header buttons now show icon + label (Copy, Paste, Pin, Delete) with visible separators and uniform hover.
  - **Edit promoted**: "Edit" leads the options list; renamed actions ("Quick view", "Filter clips from…", "Open in Viewer…").
  - **Real hotkeys**: Alt+P pins the selected clip; Ctrl+P pins the window; right-click selects the clip.

- 🐛 **Notable Fixes**:
  - **Rich capture classification**: Fixed a pre-existing nesting bug that bypassed the text/HTML/RTF format reader for captures without files.
  - **Word clipboard lock**: Retried context creation so captures during Word's internal clipboard hold keep their rich flavors.
  - **Stale selection**: Reopening the window now selects the newest clip.
  - **Nearest clip selection**: Deleting a clip keeps the selection on the nearest neighbor instead of jumping to the first clip.
  - **Bulk bar docking**: The bulk selection bar docks above the status bar with corrected centering, scrollbar, and selection hints.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

<!-- Maintainer: Traduce el resumen y los puntos clave de arriba al español en cada release. -->

### 🚀 Novedades de esta versión

Barra de búsqueda de ajustes, indicador de guardado con cierre de un clic, formato enriquecido conservado de extremo a extremo y una ventana principal a pantalla completa encabezan esta versión.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA configurables.

---

### ✨ Novedades destacadas

- 🔍 **Barra de búsqueda de ajustes**:
  - **Encuentra cualquier ajuste al instante**: La búsqueda del sidebar matchea etiquetas de todas las pestañas y salta directo al ajuste, incluso en pestañas largas.

- 💾 **Indicador de Guardado y Cierre en el Sidebar**:
  - **LED elegante de "Guardado"**: Cada cambio enciende un LED verde con la etiqueta "Guardado" durante cinco segundos y se desvanece.
  - **Cierre de un clic**: Un botón permanente de "Cerrar" vive en la parte inferior del sidebar de ajustes.

- 🧲 **Formato enriquecido conservado de extremo a extremo**:
  - **Sabores RTF/HTML capturados**: Las copias con estilo desde Word, navegadores y editores mantienen negrita, tamaños y colores.
  - **Re-pegado fiel**: Pegar después escribe texto, HTML y RTF juntos — los destinos ricos restauran el aspecto original y los planos reciben texto plano.
  - **Toggle en Ajustes**: "Conservar formato enriquecido al copiar y pegar" en Ajustes > Portapapeles lo desactiva.

- 📌 **Slots Fijos para Clips Anclados y Memoria Acordeón**:
  - **Slots visuales bloqueados**: Los clips anclados conservan su número de slot mientras los clips normales fluyen a su alrededor en capturas y borrados.
  - **Efecto acordeón**: Si los borrados acortan la lista por debajo del slot anclado, el clip se sitúa al final sin dejar huecos y vuelve a su slot al llegar nuevos clips.
  - **Seguridad en slot #1**: El slot #1 de la lista principal permanece reservado para las capturas en vivo.
  - **Protección al arrastrar**: Soltar clips no anclados sobre clips anclados muestra cursor de prohibido; arrastrar un anclado reubica su slot ancla.

- 🖥️ **Modo Pantalla Completa**:
  - **Pantalla completa del área de trabajo**: La ventana principal llena el área de trabajo del monitor respetando las barras de tareas, con esquinas rectas y tamaño fijo (estilo CyberClock/CyberLauncher).

- 🖱️ **Menú contextual renovado**:
  - **Acciones rápidas etiquetadas**: Los botones del encabezado muestran icono + etiqueta (Copiar, Pegar, Fijar, Eliminar) con separadores visibles y hover uniforme.
  - **Editar promovido**: "Editar" encabeza la lista de opciones; acciones renombradas ("Vista rápida", "Filtrar clips de…", "Abrir en Visor…").
  - **Atajos reales**: Alt+P fija el clip seleccionado; Ctrl+P fija la ventana; el clic derecho selecciona el clip.

- 🐛 **Correcciones destacadas**:
  - **Clasificación de capturas enriquecidas**: Corregido un bug de anidamiento pre-existente que bypassaba el lector de formatos texto/HTML/RTF en capturas sin archivos.
  - **Candado de Word**: Reintentos en la creación del contexto para que las capturas durante el bloqueo interno de Word conserven sus sabores ricos.
  - **Selección obsoleta**: Reabrir la ventana selecciona ahora el clip más reciente.
  - **Selección del clip más cercano**: Eliminar un clip mantiene la selección en el vecino más cercano en lugar de saltar al primer clip.
  - **Barra masiva anclada**: La barra de selección múltiple se ancla sobre la barra de estado con centrado, scrollbar y pistas de selección corregidos.



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
