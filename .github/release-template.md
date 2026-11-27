<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberPaste/main/frontend/public/logo.png" width="120" alt="CyberPaste">
</p>

## 📋 CyberPaste {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. Keep the Spanish mirror inside the details block in sync: translate the summary and rewrite the highlights. -->
<!-- COVERAGE: list every commit since the previous tag before drafting. Give every user-facing change at least one highlight and group related commits into one. Skip internal refactors, CI, tests and dependency bumps with no visible effect; keep small visible fixes such as copy, tooltips, shortcuts, themes, icons, spacing, stability and perceptible performance. Review the draft if 15+ user-facing commits produce fewer than 6 highlights, or 40+ total commits fewer than 8. Patch releases may have 1-3 highlights or a plain maintenance-only note. -->
<!-- changelog-summary:start -->
Adds a reactive, layout-integrated Full-mode details panel with persistent preview settings, centered image zoom and pan, clearer bulk selection, predictable Explorer filenames, and polished tray branding, alongside refreshed bilingual privacy guidance.
<!-- changelog-summary:end -->

> **New to CyberPaste?** A fast, privacy-first Windows clipboard manager with history, folders, OCR, and optional AI actions.

---

### ✨ Key Features & Highlights

- **Reactive details in their own space**: Full mode gains a live clip preview, selected count, stacked-card bulk indicator, disabled Copy for multiple clips, previous/next navigation, and a dedicated layout column that never covers cards.
- **Persistent, flexible previews**: Panel visibility and text zoom survive restarts, titles show the clip slot, text starts larger, images zoom independently, and deleting clips leaves the panel open.
- **Centered image zoom and pan**: Scale images from 100% to 300% around the viewport center, then drag with grab/grabbing cursors to inspect any area.
- **Clearer bulk selection**: Marquee drags highlight only the selected cards, even when the previously active clip is outside the selection.
- **Predictable Explorer filenames**: Pasted history images use `Clipboard_image.png`, followed by `Clipboard_image(01).png`, `Clipboard_image(02).png`, and so on.
- **More lively tray branding**: CyberPaste and CyberGems brand marks brighten together on hover, with a subtle zoom on both icons.
- **Refreshed privacy guidance**: Bilingual documentation clarifies local storage paths, optional AI and update connections, installer names, and keyboard shortcuts.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

Añade un panel de detalles reactivo e integrado en Pantalla Completa, con ajustes persistentes, zoom centrado y paneo de imágenes, selección múltiple más clara, nombres predecibles en el Explorador y marca del tray pulida, además de documentación de privacidad bilingüe actualizada.

> **¿Nuevo en CyberPaste?** Un gestor de portapapeles rápido y privado para Windows, con historial, carpetas, OCR y acciones de IA opcionales.

---

### ✨ Novedades destacadas

- **Detalles reactivos en su propio espacio**: Pantalla Completa gana vista previa en vivo, contador de selección, indicador de tarjetas apiladas, Copiar desactivado para varios clips, navegación anterior/siguiente y una columna propia que nunca tapa las tarjetas.
- **Vistas previas persistentes y flexibles**: La visibilidad del panel y el zoom del texto sobreviven a los reinicios, el título muestra la ranura, el texto empieza más grande, las imágenes tienen zoom independiente y borrar clips deja el panel abierto.
- **Zoom centrado y paneo de imágenes**: Escala imágenes entre 100% y 300% desde el centro del visor y arrástralas con cursores de agarre para inspeccionar cualquier zona.
- **Selección múltiple más clara**: El arrastre resalta solo las tarjetas elegidas, aunque el clip activo anterior quede fuera de la selección.
- **Nombres predecibles en el Explorador**: Las imágenes pegadas desde el historial usan `Clipboard_image.png`, después `Clipboard_image(01).png`, `Clipboard_image(02).png`, etc.
- **Marca del tray más viva**: Las marcas CyberPaste y CyberGems se iluminan juntas al pasar el cursor, con un zoom sutil en ambos iconos.
- **Privacidad mejor documentada**: La documentación bilingüe aclara rutas locales, conexiones opcionales de IA y actualizaciones, nombres del instalador y atajos de teclado.

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

> 🛡️ The report opens on VirusTotal and does not download anything. Sometimes one or two antivirus providers flag a safe file while the rest clear it; that is usually a false alarm. Our software is threat-free and the source code is public, so anyone can check it. Compare the SHA-256 below with your download and use only the links on this page.
> 🛡️ El informe se abre en VirusTotal y no descarga nada. A veces uno o dos proveedores de antivirus marcan un archivo seguro mientras los demás lo dan por limpio; suele ser una falsa alarma. Nuestro software está libre de amenazas y el código es público, cualquiera puede comprobarlo. Compara el SHA-256 de abajo con tu descarga y usa solo los enlaces de esta página.

**Installer**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})

```text
{{INSTALLER_HASH}}
```

**Portable**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{PORTABLE_HASH}})

```text
{{PORTABLE_HASH}}
```
{{MSI_BLOCK}}
The checksums are also available as a downloadable [SHA256SUMS.txt](https://github.com/CyberGems/CyberPaste/releases/download/{{VERSION}}/SHA256SUMS.txt).

---

📜 **Full changelog:** browse every version in [CHANGELOG.md](https://github.com/CyberGems/CyberPaste/blob/main/CHANGELOG.md).

*Crafted with precision by [CyberGems](https://cybergems.org)*
