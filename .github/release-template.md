<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section with the ACTUAL release notes for this specific version before tagging. NEVER leave or copy previous version notes! Use 25-45 words, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
Multi-selection now supports Shift+Arrow ranges and marquee drag selection across clips. Relocated hover action buttons, title marquee, peek preview isolation, an achievements metrics dashboard, and polished filter alignment complete this release.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and configurable AI actions.

---

### ✨ Key Features & Highlights

- 🔲 **Multi-Selection & Bulk Actions**:
  - **Keyboard range selection**: Use `Shift + Arrow` keys (Down/Up in Compact, Left/Right in Full) for Windows Explorer-style range selection.
  - **Marquee drag box**: Drag a selection rectangle over clips with the mouse (or `Shift + Drag` across card faces) to select or toggle bulk items.
  - **Unified selection styling**: Consistent focus rings, background tints, and checkmark indicators across Full and Compact views.

- 🎯 **Card Layout & Quick Actions Redesign**:
  - **Centered footer action buttons**: Copy and Paste buttons now appear cleanly centered in the card footer on hover without obstructing clip content.
  - **Peek preview isolation**: Hover previews now trigger strictly within the central clip content area, avoiding unwanted popups over headers and buttons.
  - **Card title marquee**: Headers highlight in cyan on card hover and automatically marquee back and forth on long titles.
  - **Refined tooltips**: Descriptive tooltips without confusing shortcut badges on simulated click actions.

- 🏆 **Achievements Dashboard Facelift & Quick Access**:
  - **Metrics dashboard facelift**: Clip types and activity statistics feature dedicated cards with colored badges, counts, and proportional progress bars.
  - **Activity start & total days**: Streamlined history tracking showing initial activity date alongside total elapsed days.
  - **Direct menu shortcut**: Direct access to Achievements in the TitleBar "More" menu across both Full and Compact modes.

- 🎨 **Visual Consistency & Polish**:
  - **Glassmorphic emoji tooltips**: Emoji picker now utilizes custom glassmorphism tooltips, with slashes no longer generating false shortcut badges.
  - **Enhanced clip index legibility**: Increased index number opacity in Full mode for effortless readability.
  - **Baseline filter alignment**: Category count badges match typography baselines and styling across all filter pills.
  - **Selection flicker fix**: Eliminated initial selection blink when opening the window.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

<!-- Maintainer: Traduce el resumen y los puntos clave de arriba al español en cada release. -->

### 🚀 Novedades de esta versión

La multiselección ahora admite rangos con Shift+Flechas y arrastre de recuadro entre clips. Botones flotantes reubicados, marquee en títulos, aislamiento del peek preview, rediseño métrico en logros y alineación en filtros completan esta versión.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA configurables.

---

### ✨ Novedades destacadas

- 🔲 **Multiselección y Acciones por Lote**:
  - **Selección por rango con teclado**: Usa `Shift + Flechas` (Arriba/Abajo en Compacto, Izquierda/Derecha en Completo) al estilo del Explorador de Windows.
  - **Recuadro de arrastre (Marquee)**: Arrastra un marco de selección con el ratón (o `Shift + Arrastre` sobre las tarjetas) para seleccionar o alternar múltiples clips.
  - **Estilo de selección unificado**: Anillos de enfoque, tonos de fondo e indicadores de selección consistentes entre ambos modos.

- 🎯 **Rediseño de Tarjetas y Acciones Rápidas**:
  - **Botones de acción centrados en el pie**: Los botones Copiar y Pegar se muestran centrados en el footer al pasar el cursor sin tapar el contenido.
  - **Aislamiento de vista previa (Peek)**: Las previsualizaciones ahora se activan estrictamente dentro del cuerpo del clip, evitando popups molestos sobre encabezados o botones.
  - **Marquee en títulos de tarjetas**: Los encabezados se resaltan en cian al hacer hover y desplazan el texto automáticamente hacia adelante y atrás en títulos largos.
  - **Tooltips refinados**: Mensajes descriptivos sin badges confusos de atajos en acciones que simulan clics.

- 🏆 **Renovación del Panel de Logros y Acceso Directo**:
  - **Dashboard de métricas renovado**: Tipos de clips y estadísticas con tarjetas dedicadas, insignias de color, contadores y barras de progreso proporcionales.
  - **Fecha de inicio y días totales**: Se reemplazó la confusa etiqueta de perfil por la fecha de primera actividad y el contador total de días transcurridos.
  - **Acceso directo en menús**: Acceso inmediato a Logros desde el menú "Más" de la barra de título tanto en modo Completo como Compacto.

- 🎨 **Consistencia Visual y Ajustes Finos**:
  - **Tooltips glassmórficos en emojis**: El selector de emojis adopta los tooltips de la app, corrigiendo falsos badges de atajos en barras diagonales.
  - **Mayor legibilidad en números de clip**: Mayor opacidad en la numeración en modo Completo para una lectura cómoda.
  - **Alineación de contadores de filtro**: Los números de categoría se alinean a la línea base del texto de cada etiqueta.
  - **Apertura sin parpadeos**: Eliminado el parpadeo de selección inicial al abrir la ventana.

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
