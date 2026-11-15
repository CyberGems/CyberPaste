# Changelog

All notable changes to CyberPaste are documented here.

## [1.31.0] - 2026-11-12

### 🇺🇸 English

- **New tray item with flexible durations**: pause notifications for 1, 6, 12, or 24 hours (the suggested default) or until you turn them back on. While paused, the amber item shows the resume time and re-enables with one click.
- **Synced with Settings**: a banner in Settings > Notifications mirrors the pause with a "Resume now" button; the state persists across restarts.
- **True silence**: capture, duplicate, and startup sounds are muted while paused; error alerts still come through.
- **HTML joins Code**: structural HTML captures now live in the single Code category with HTML syntax highlighting. The separate HTML type is gone from filters, stats, toasts, and achievements.
- **Rich behavior intact**: pasting still restores styled HTML, the visor keeps its rendered/source toggle, and Save As still exports `.html` files.
- **Automatic migration**: existing history converts on first launch. The achievements breakdown shows the five final types, and the all-types achievement is now actually reachable.
- **Cleaner visor opens**: the viewer opens maximized at work-area size with a dark first frame and no blank flash.
- **Calmer tray menu**: the Quit item behaves exactly like every other item, the card shadow turns dark and 30% softer without the cyan glow, and icon glows are toned down to match.
- **Working update check**: "Check for Update..." from the tray now starts the search even when the About window has to open fresh.
- **No more black blocks**: transparent windows (tray menu, toasts) regain their transparency automatically after sleep/resume.
- **History that behaves**: clipboard order survives restarts, pasting a history image saves it as a file in Explorer, and mixed CyberSnap copies prefer the image.
- **One hint source**: the Full mode HUD, Compact footer, and emoji hints all draw from a single shared module with a shared rotation hook; hotkeys interpolate from shared constants and the HUD pill centers on the titlebar while fitting its widest entry.
- **Fully localized tray**: the tray menu is completely translated in English and Spanish (including "Lock now"), guarded by a new `i18n:check` audit that fails when a referenced key is missing.

### 🇪🇸 Español

- **Nuevo ítem del tray con duraciones flexibles**: pausa las notificaciones por 1, 6, 12 o 24 horas (la opción sugerida) o hasta que las reactives tú. En pausa, el ítem ámbar muestra la hora de reanudación y se reactiva con un clic.
- **Sincronizado con Ajustes**: un banner en Ajustes > Notificaciones refleja la pausa con un botón "Reanudar ahora"; el estado sobrevive a los reinicios.
- **Silencio real**: los sonidos de captura, duplicado y de inicio se silencian mientras está en pausa; las alertas de error siguen llegando.
- **HTML pasa a Código**: las capturas de HTML estructural viven ahora en la única categoría Código con resaltado de sintaxis HTML. El tipo HTML separado desaparece de filtros, estadísticas, toasts y logros.
- **Comportamiento rico intacto**: pegar sigue restaurando el HTML con estilo, el visor conserva su alternancia renderizado/fuente y Guardar como sigue exportando `.html`.
- **Migración automática**: el historial existente se convierte al primer arranque. El desglose de logros muestra los cinco tipos finales y el logro de todos los tipos ahora sí es alcanzable.
- **Aperturas limpias del visor**: el visor abre maximizado al tamaño del área de trabajo, con primer fotograma oscuro y sin flash en blanco.
- **Tray más calmado**: el ítem Salir se comporta exactamente igual que los demás, la sombra de la tarjeta pasa a oscura y un 30% más suave sin el glow cian, y los glows de los iconos bajan de intensidad para igualar.
- **Búsqueda de actualizaciones funcional**: "Buscar actualizaciones..." desde el tray lanza la búsqueda aunque la ventana About tenga que abrirse de cero.
- **Adiós a los bloques negros**: las ventanas transparentes (menú del tray, toasts) recuperan su transparencia automáticamente tras suspender/reanudar.
- **Un historial que se porta bien**: el orden del portapapeles sobrevive a los reinicios, pegar una imagen del historial la guarda como archivo en el Explorador y las copias mixtas de CyberSnap prefieren la imagen.
- **Una sola fuente de hints**: el HUD de Pantalla Completa, el footer Compacto y los hints de emojis salen de un único módulo compartido con un hook de rotación compartido; los atajos se interpolan desde constantes compartidas y la píldora del HUD se centra en la titlebar ajustándose a su entrada más ancha.
- **Tray totalmente traducido**: el menú del tray está completamente traducido en inglés y español (incluido "Bloquear ahora"), con una nueva auditoría `i18n:check` que falla si falta una clave referenciada.

## [1.30.0] - 2026-11-09

### 🇺🇸 English

- **`Alt+L` locks the app now** and **`Ctrl+K` pauses/resumes clipboard monitoring**, working in both Full Screen and Compact modes.
- The HUD hint cycle and the Compact footer hints advertise both shortcuts, and titlebar tooltips show hotkey badges ("Bloquear ahora (Alt+L)").
- The More menu no longer duplicates actions that have a visible titlebar button: "Lock now" and "Pause monitoring" were removed from it.
- Fixed the HUD advertising the old `Ctrl+P` clip pin; it now cycles `Alt+P`.
- The "Copy to folder" dialog now hides the folder you are browsing and only offers the main clipboard when inside a folder, matching the bulk action bar's behavior.
- Clip selection uses a desaturated steel-teal accent across borders, tint, and glow in the default theme, with a refined silver in the monochrome dark theme; the light theme is untouched.
- The compact window border trades the neon primary for the same steel-teal, and the selected row's left accent bar fades out with a vertical gradient.
- The compact header rhythm is even: folder pills now share the search bar's exact height and the folders-to-clips spacing matches the search-to-folders gap.
- The installer header now shows a branded 150x57 banner instead of the distorted icon that default NSIS drew at scaled DPI.
- Release notes link both artifacts to their VirusTotal reports, and the release workflow submits them automatically.
- The tray menu logo idles at 40% saturation instead of full grayscale.
- The vendor bundle is split into stable chunks (React, motion, i18n, vendor), so app updates no longer invalidate the third-party cache.

### 🇪🇸 Español

- **`Alt+L` bloquea la app ahora** y **`Ctrl+K` pausa/reanuda el monitoreo del portapapeles**, en Modo Pantalla Completa y Compacto por igual.
- El ciclo de hints del HUD y los hints del footer compacto anuncian ambos atajos, y los tooltips de la titlebar muestran badges de atajos ("Bloquear ahora (Alt+L)").
- El menú More ya no duplica acciones que tienen botón visible en la titlebar: "Bloquear ahora" y "Pausar monitoreo" salieron de él.
- Corregido el HUD que anunciaba el viejo fijado de clips con `Ctrl+P`; ahora cicla `Alt+P`.
- El diálogo "Copiar a carpeta" oculta la carpeta en la que estás y solo ofrece el portapapeles principal cuando navegas una carpeta, igual que la barra de acciones en masa.
- La selección de clips usa un acento teal acero desaturado en borde, tinte y glow en el tema por defecto, con una plata refinada en el tema oscuro monocromo; el tema claro queda intacto.
- El borde de la ventana compacta cambia el neón primario por el mismo teal acero, y la barra de acento izquierda de la fila seleccionada se desvanece con un degradado vertical.
- El ritmo del header compacto es parejo: las pills de carpeta comparten la altura exacta del buscador y el espacio carpetas→clips coincide con el de buscador→carpetas.
- El encabezado del instalador muestra un banner con marca de 150x57 en lugar del icono distorsionado que el NSIS por defecto dibujaba con DPI escalado.
- Las notas de la versión enlazan ambos artefactos a sus reportes de VirusTotal, y el workflow de release los envía automáticamente.
- El logo del menú del tray reposa al 40% de saturación en vez de escala de grises total.
- El bundle de vendor se divide en chunks estables (React, motion, i18n, vendor), así las actualizaciones de la app ya no invalidan la caché de terceros.

## [1.29.0] - 2026-11-08

### 🇺🇸 English

- **In-place results view**: A search bar in the settings sidebar filters settings across all tabs into a results view, jumping straight to the matching row.
- **Reveal-path filtering**: Matches are scoped to their tab region with strong/weak signal scoring, accent-insensitive matching, and highlighting of the matched text.
- **UI-language awareness**: Settings search matches the interface language with strong and weak signals and syncs with filtering.
- **RTF/HTML flavors captured**: Styled copies from Word, browsers, and editors keep bold, font sizes, and colors across captures.
- **Faithful re-paste**: Pasting writes text, HTML, and RTF together so rich targets restore the original look while plain targets keep plain text.
- **Classification fix**: Closed a file-branch nesting bug so text/HTML/RTF classification actually runs for captures without files.
- **Clipboard lock retry**: Retries clipboard context creation so captures during Word's internal clipboard hold no longer lose rich flavors.
- **Settings toggle**: "Preserve rich formatting when copying and pasting" in Settings > Clipboard turns it off.
- **Elegant "Saved" block**: Replaces per-control toasts with an inline saved indicator with a polished layout.
- **Stable settings states**: Reveal the App Lock card reliably and stabilize the empty search state.
- **Locked visual slots**: Pinned clips keep their slot number while normal clips flow around them on captures and deletes.
- **Accordion behavior**: If deletions shorten the list below a pinned slot, the pin sits at the end without gaps and expands back into its slot as new clips arrive.
- **Drag protection**: Dropping unpinned clips onto pinned cards shows a forbidden cursor; dragging a pinned clip repositions its anchor.
- **Instant renumbering**: Display slots recompute immediately after deletes.
- **Work-area fullscreen**: The main window fills the monitor work area instead of a docked strip, respecting taskbars on any edge with square corners and a fixed size.
- **Renamed & simplified**: "Full Mode" is now "Full Screen Mode" in both languages (Spanish unified as "Modo Pantalla Completa"), and the redundant Automatic (Smart) compact position option was removed.
- **Morph polish**: The view-mode loader stays still during the window morph and the dim backdrop fades in and out.
- **Labeled quick actions**: Header buttons show icon + label (Copy, Paste, Pin, Delete) with uniform hover, visible separators, and refined shortcut badges.
- **Keyboard-first**: Bidirectional keyboard navigation across header actions, mnemonic single-key hints, `Alt+P` to pin the selected clip, and `Ctrl+P` to pin the window.
- **Edit promoted**: "Edit" leads the options list; actions renamed ("Quick view", "Filter clips from…", "Open in Viewer…").
- **Softer highlights**: Hover tints softened and border glows removed across clips, the filter dropdown, the undo button, and full/compact highlight layers.
- **Unified toolbar spacing**: Consistent toolbar button spacing, cleaner full-mode action buttons, and dialog text is no longer selectable.
- **Hover collision fix**: Eliminated stationary hover collision when opening menus and refined global scrollbars.
- **Nearest clip selection**: Deleting a clip keeps the selection on the nearest neighbor instead of jumping to the first clip.
- **Bulk bar docking**: The bulk action bar docks above the status bar with corrected centering, scrollbar, and selection hints.
- **Stale selection**: Reopening the window selects the newest clip.
- **Installer paths**: Updates keep the remembered install path, and uninstall clears it from both registry hives.

### 🇪🇸 Español

- **Vista de resultados integrada**: Una barra de búsqueda en el sidebar de ajustes filtra los ajustes de todas las pestañas en una vista de resultados que salta directo a la fila del ajuste.
- **Filtrado con ruta de coincidencia**: Las coincidencias se acotan a su región de pestaña con puntuación de señal fuerte/débil, comparación sin distinción de acentos y resaltado del texto coincidente.
- **Conciencia del idioma de la interfaz**: La búsqueda de ajustes matchea el idioma de la interfaz con señales fuertes y débiles y se sincroniza con el filtrado.
- **Sabores RTF/HTML capturados**: Las copias con estilo desde Word, navegadores y editores mantienen negrita, tamaños y colores en las capturas.
- **Re-pegado fiel**: Pegar escribe texto, HTML y RTF juntos, así los destinos ricos restauran el aspecto original y los planos reciben texto plano.
- **Clasificación corregida**: Cerrado un bug de anidamiento en la rama de archivos para que la clasificación texto/HTML/RTF se ejecute de verdad en capturas sin archivos.
- **Reintento del candado del portapapeles**: Se reintenta la creación del contexto del portapapeles, así las capturas durante el bloqueo interno de Word ya no pierden los sabores ricos.
- **Toggle en Ajustes**: "Conservar formato enriquecido al copiar y pegar" en Ajustes > Portapapeles lo desactiva.
- **Elegante bloque "Guardado"**: Sustituye los toasts por control con un indicador de guardado inline de diseño pulido.
- **Estados de ajustes estables**: La tarjeta de App Lock se muestra de forma fiable y el estado de búsqueda vacía queda estabilizado.
- **Slots visuales bloqueados**: Los clips anclados conservan su número de slot mientras los clips normales fluyen a su alrededor en capturas y borrados.
- **Efecto acordeón**: Si los borrados acortan la lista por debajo de un slot anclado, el anclado se sitúa al final sin dejar huecos y vuelve a su slot al llegar nuevos clips.
- **Protección al arrastrar**: Soltar clips no anclados sobre tarjetas ancladas muestra cursor de prohibido; arrastrar un anclado reubica su ancla.
- **Renumeración instantánea**: Los slots mostrados se recalculan justo después de los borrados.
- **Pantalla completa del área de trabajo**: La ventana principal llena el área de trabajo del monitor en lugar de una tira acoplada, respetando las barras de tareas en cualquier borde, con esquinas rectas y tamaño fijo.
- **Renombrado y simplificado**: "Full Mode" pasa a "Full Screen Mode" en ambos idiomas (unificado en español como "Modo Pantalla Completa") y se eliminó la opción redundante de posición compacta Automática (Inteligente).
- **Pulido del morph**: El loader de vistas permanece quieto durante el morph de la ventana y el fondo atenuado aparece y desaparece con fundido.
- **Acciones rápidas etiquetadas**: Los botones del encabezado muestran icono + etiqueta (Copiar, Pegar, Fijar, Eliminar) con hover uniforme, separadores visibles y badges de atajos refinados.
- **Teclado primero**: Navegación por teclado bidireccional entre las acciones del encabezado, hints mnemónicos de una tecla, `Alt+P` fija el clip seleccionado y `Ctrl+P` fija la ventana.
- **Editar promovido**: "Editar" encabeza la lista de opciones; acciones renombradas ("Vista rápida", "Filtrar clips de…", "Abrir en Visor…").
- **Resaltes más suaves**: Tonos de hover suavizados y glows de borde eliminados en clips, el desplegable de filtros, el botón de deshacer y las capas de resalte de Completo/Compacto.
- **Espaciado de toolbar unificado**: Espaciado consistente en los botones de la toolbar, botones de acción del modo Completo más limpios y el texto de los diálogos ya no es seleccionable.
- **Colisión de hover corregida**: Eliminada la colisión de hover estático al abrir menús y scrollbars globales refinados.
- **Selección del clip más cercano**: Eliminar un clip mantiene la selección en el vecino más cercano en lugar de saltar al primer clip.
- **Barra masiva anclada**: La barra de acciones en masa se ancla sobre la barra de estado con centrado, scrollbar y pistas de selección corregidos.
- **Selección obsoleta**: Reabrir la ventana selecciona el clip más reciente.
- **Rutas del instalador**: Las actualizaciones conservan la ruta de instalación recordada y la desinstalación la limpia de ambas colmenas del registro.

## [1.28.0] - 2026-10-25

### 🇺🇸 English

- **New "Clipboard" tab**: Capturing limits, retention quotas, and pasting behaviors now reside in their own dedicated settings tab, decluttering the General panel.
- **Structured sub-sections**: Organized into "Limits & Storage" (clip limits, retention days, text/image sizes, storage quota) and "Behavior & Pasting" (monitoring, auto-paste, instant search, external image editor).
- **Settings tab hierarchy**: Reordered navigation putting Notifications second, followed by Full/Compact view mode tabs.
- **Streamlined General tab**: Grouped window animation and blur behavior into an organized "Other" category.
- **Pixel-aligned theme previews**: Standardized card frame geometry (90x62px) and constant border widths, eliminating subpixel jitter and ensuring all theme cards align flush with header text.
- **Expanded folder management**: Adjusted folder list height to display up to 7 folders simultaneously without scrolling, adding an inline pencil edit icon for quick renaming.
- **Titlebar menu divider fix**: Removed redundant double divider after the Donate option in the More menu.
- **Seamless titlebar update button**: Removed the bulky pill container in favor of a sleek, unboxed 32x32 button matching standard titlebar icons, with softened pulse animation.
- **Interactive release preview helper**: Added console function `__CYBERPASTE_SHOW_UPDATE_PREVIEW__()` to inspect update dialogs and release notes layout anytime during development.
- **About modal scroll**: Fixed release notes container height and scrollbar overflow in the update dialog.
- **Full mode peek restoration**: Re-enabled and tuned hover peek preview with balanced mouse-leave sensitivity to prevent premature closing.
- **Type icon tooltips**: Added contextual type tooltips in Full mode for complete parity with Compact mode.
- **Copyable release checksums**: Formatted installer and portable hashes in fenced code blocks for instant one-click copying.

### 🇪🇸 Español

- **Nueva pestaña "Portapapeles"**: Los límites de captura, las cuotas de retención y los comportamientos de pegado viven ahora en una pestaña de ajustes dedicada, aligerando el panel General.
- **Subsecciones estructuradas**: Organizada en "Límites y Almacenamiento" (límites de clips, días de retención, tamaños de texto/imagen, cuota de almacenamiento) y "Comportamiento y Pegado" (monitoreo, auto-pegado, búsqueda al tipear, editor de imágenes externo).
- **Jerarquía de pestañas de ajustes**: Navegación reordenada con Notificaciones en segundo lugar, seguida por las pestañas de los modos de vista Completo/Compacto.
- **Panel General optimizado**: Las opciones de animación de ventana y desenfoque agrupadas en una categoría "Otros" organizada.
- **Previsualizaciones de tema milimétricas**: Geometría del marco de las tarjetas estandarizada (90x62px) y anchos de borde constantes, eliminando el jitter subpíxel y asegurando que todas las tarjetas de tema queden alineadas con el texto del encabezado.
- **Gestión de carpetas ampliada**: Altura de la lista de carpetas ajustada para mostrar hasta 7 carpetas a la vez sin scroll, con un icono de lápiz inline para renombrar rápido.
- **Separador del menú de la titlebar corregido**: Eliminado el doble separador redundante tras la opción Donar en el menú More.
- **Botón de actualización sin caja en la titlebar**: Eliminada la envoltura tipo píldora a favor de un botón de 32x32 limpio, igual que los iconos estándar de la titlebar, con animación de pulso suavizada.
- **Ayuda interactiva de vista previa de releases**: Añadida la función de consola `__CYBERPASTE_SHOW_UPDATE_PREVIEW__()` para inspeccionar los diálogos de actualización y el diseño de las notas en cualquier momento del desarrollo.
- **Scroll del modal Acerca de**: Corregida la altura del contenedor de notas de la versión y el desbordamiento del scrollbar en el diálogo de actualización.
- **Peek del modo Completo restaurado**: Reactivado y calibrado el hover peek preview con una sensibilidad balanceada al salir el cursor para evitar cierres prematuros.
- **Tooltips de iconos de tipo**: Añadidos tooltips contextuales de tipo en el modo Completo, en total paridad con el modo Compacto.
- **Checksums del release copiables**: Hashes del instalador y del portable formateados en bloques de código para copiarlos al instante con un clic.

## [1.27.0] - 2026-10-25

### 🇺🇸 English

- **Keyboard range selection**: Use `Shift + Arrow` keys (Down/Up in Compact, Left/Right in Full) to initiate range-based bulk selection of clips, matching Windows Explorer behavior.
- **Marquee rectangle drag**: Drag a selection box over multiple clips with the mouse (or `Shift + Drag` across card faces) to select or toggle bulk items.
- **Unified multi-selection style**: Full mode and Compact mode share identical selection highlight rings, background tints, and active state styles.
- **Footer action buttons**: Quick action buttons (`Copy` and `Paste`) are relocated to the bottom footer on card hover, centered and non-intrusive, keeping clip content unobstructed.
- **Peek popup isolation**: Peek previews now trigger strictly when hovering over the central content area, preventing unwanted popups over headers, footers, and buttons.
- **Card title marquee & hover highlight**: Card headers instantly highlight in primary cyan upon card hover, and long titles marquee back and forth on hover for easy inspection.
- **Refined action tooltips**: Clear, descriptive tooltips without confusing shortcut badges on simulated click actions.
- **Comprehensive metrics facelift**: Captured clip types and action statistics now feature dedicated dashboard cards with distinct colored badges, counts, and proportional progress bars.
- **Activity start & total days**: Streamlined history tracking showing initial activity date alongside total elapsed days, without confusing profile terminology.
- **Direct menu access**: Added a direct shortcut to Achievements in the TitleBar "More" menu across both Full and Compact modes.
- **Emoji tooltips**: Emoji picker now utilizes the app's custom glassmorphism tooltips, replacing default browser tooltips.
- **Tooltip shortcut regex fix**: Punctuation slashes in text descriptions no longer generate false keyboard shortcut key badges.
- **Clip number legibility**: Increased positional index opacity in Full mode for effortless readability.
- **Filter count baseline alignment**: Category counters now match text baselines and proportional type styling across all filter pills.
- **Selection flicker fix**: Eliminated initial selection blink when opening the window by preserving selection during view resets.

### 🇪🇸 Español

- **Selección por rango con teclado**: Usa `Shift + Flechas` (Abajo/Arriba en Compacto, Izquierda/Derecha en Completo) para iniciar una selección múltiple por rangos al estilo del Explorador de Windows.
- **Recuadro de arrastre (marquee)**: Arrastra un marco de selección con el ratón sobre varios clips (o `Shift + Arrastre` sobre las caras de las tarjetas) para seleccionar o alternar elementos en lote.
- **Estilo de multiselección unificado**: Modo Completo y Compacto comparten anillos de resalte de selección, tonos de fondo y estilos de estado activo idénticos.
- **Botones de acción en el pie**: Los botones rápidos (`Copiar` y `Pegar`) se reubican en el footer inferior al hacer hover sobre la tarjeta, centrados y sin estorbar, dejando el contenido del clip despejado.
- **Aislamiento del popup de peek**: Las previsualizaciones peek se activan solo al pasar el cursor por el área central de contenido, evitando popups no deseados sobre encabezados, footers y botones.
- **Marquee en títulos de tarjetas y resalte al hover**: Los encabezados de las tarjetas se resaltan al instante en cian primario al hacer hover, y los títulos largos se desplazan en marquee hacia adelante y atrás para inspeccionarlos con facilidad.
- **Tooltips de acción refinados**: Tooltips claros y descriptivos, sin badges de atajos confusos en las acciones que simulan clics.
- **Renovación completa de métricas**: Los tipos de clips capturados y las estadísticas de acciones estrenan tarjetas de panel dedicadas con insignias de colores distintivas, contadores y barras de progreso proporcionales.
- **Inicio de actividad y días totales**: Seguimiento de historial simplificado que muestra la fecha de primera actividad junto al total de días transcurridos, sin terminología de perfil confusa.
- **Acceso directo en el menú**: Añadido un acceso directo a Logros en el menú "More" de la barra de título tanto en modo Completo como en Compacto.
- **Tooltips de emojis**: El selector de emojis usa ahora los tooltips glassmórficos de la app, en lugar de los tooltips por defecto del navegador.
- **Regex de atajos en tooltips corregido**: Las barras de puntuación en las descripciones de texto ya no generan badges falsos de atajos de teclado.
- **Legibilidad de los números de clip**: Mayor opacidad del índice de posición en modo Completo para una lectura sin esfuerzo.
- **Alineación de contadores de filtro**: Los contadores de categoría se alinean con la línea base del texto y el tamaño tipográfico proporcional en todas las pills de filtro.
- **Parpadeo de selección corregido**: Eliminado el parpadeo inicial de selección al abrir la ventana conservando la selección durante los resets de vista.

## [1.26.0] - 2026-10-14

### 🇺🇸 English

- **Hover quick actions**: Clip cards now feature distinct hover buttons to copy to clipboard or paste directly into the active application.
- **Context menu separation**: Separate context menu options for "Copy" (places clip on system clipboard) and "Paste" (pastes directly into target app).
- **Keyboard copy shortcut**: Pressing `Ctrl+C` with a clip selected copies it to the clipboard without auto-pasting (when not typing or selecting text).
- **Longer security intervals**: Added extended idle auto-lock options for 2 hours, 4 hours, 8 hours, and 12 hours in settings.
- **Suppressed self-alerts**: Prevents duplicate sound cues and toast notifications when copying or pasting items within CyberPaste.
- **Preserved source metadata**: Self-copy and self-paste operations maintain original source application metadata and icons.
- **Pre-armed clip ignore**: Arms clip hash suppression before write operations to prevent duplicate history records and notifications.
- **Settings text clarity**: Clarified mouse wheel folder navigation setting title and description in English and Spanish.

### 🇪🇸 Español

- **Acciones rápidas al hover**: Las tarjetas de clips estrenan botones al hover para copiar al portapapeles o pegar directamente en la aplicación activa.
- **Separación en el menú contextual**: Opciones de menú contextual diferenciadas para "Copiar" (coloca el clip en el portapapeles del sistema) y "Pegar" (pega directamente en la app destino).
- **Atajo de teclado para copiar**: Pulsar `Ctrl+C` con un clip seleccionado lo copia al portapapeles sin auto-pegado (cuando no estás escribiendo ni seleccionando texto).
- **Intervalos de seguridad más largos**: Nuevas opciones de auto-bloqueo por inactividad de 2, 4, 8 y 12 horas en ajustes.
- **Avisos propios suprimidos**: Evita señales de sonido y toasts duplicados al copiar o pegar elementos dentro de la propia CyberPaste.
- **Metadatos de origen conservados**: Las operaciones de auto-copia y auto-pegado mantienen los metadatos e iconos de la aplicación de origen original.
- **Ignora de clips pre-armado**: Arma la supresión de hashes de clips antes de las operaciones de escritura para evitar registros e notificaciones duplicadas en el historial.
- **Claridad en el texto de ajustes**: Título y descripción de la navegación de carpetas con la rueda del ratón clarificados en inglés y español.

## [1.25.0] - 2026-10-14

### 🇺🇸 English

- **Dedicated Emoji Mode**: Access an extensive, categorized emoji collection via titlebar toggle or global hotkey with instant click or Enter paste into target apps.
- **Bilingual emoji search**: Search emojis naturally in English or Spanish by name, aliases, and keywords.
- **Continuous injection when pinned**: When the window is pinned, selecting emojis repeatedly pastes them directly into the active application without closing.
- **Session-stable recents**: Order of recent emojis remains frozen during active selection sessions to prevent accidental misclicks.
- **Isolated search history**: Dedicated emoji search history completely separate from normal clipboard search history.
- **Keyboard-first navigation**: Auto-focuses the search input upon opening; press Arrow Down from the search bar to browse the grid, and press Arrow Up on the top row to return to the search bar.
- **Search focus retention**: Backspacing to empty search input keeps focus and cursor inside the bar without unexpected blur.
- **Zero-result safety**: Pressing Arrow Down when a search yields no results preserves search input focus, avoiding unneeded mouse interaction.
- **Two-stage Escape**: First Escape dismisses active search or blurs the search field; second Escape hides the window or exits emoji mode.
- **Arrow Up return for clips**: Pressing Arrow Up on the first clip (Compact view) or top row (Full view) returns focus to the search bar and selects the search query.
- **Single-toast system**: Toast alerts and banners no longer stack, smoothly replacing previous notifications with unselectable text.
- **Marquee footer hints**: Compact view footer tips scroll cleanly via marquee animation with optimal margins.
- **NSIS installer sidebar**: Fixed aspect ratio (164x314), expanded right safe margin, and smoothed background blend for high-DPI Windows installer wizard displays.
- **Update modal clean-up**: Removed redundant button tooltips and unified action button styles.

### 🇪🇸 Español

- **Modo Emojis dedicado**: Accede a una extensa colección de emojis categorizada desde el toggle de la titlebar o un atajo global, con pegado instantáneo por clic o Enter en las apps destino.
- **Búsqueda bilingüe de emojis**: Busca emojis de forma natural en inglés o español por nombre, alias y palabras clave.
- **Inyección continua al estar anclado**: Con la ventana anclada, seleccionar emojis los pega repetidamente en la aplicación activa sin cerrarla.
- **Recientes estables por sesión**: El orden de los emojis recientes queda congelado durante las sesiones de selección activas para evitar clics accidentales.
- **Historial de búsqueda aislado**: Historial de búsqueda de emojis dedicado, totalmente separado del historial de búsqueda normal del portapapeles.
- **Navegación por teclado primero**: El buscador recibe el foco al abrir; pulsa Flecha Abajo desde la barra para recorrer la cuadrícula y Flecha Arriba en la fila superior para volver a la barra.
- **Foco de búsqueda retenido**: Borrar con Backspace hasta dejar la barra vacía mantiene el foco y el cursor dentro sin desenfoques inesperados.
- **Seguridad sin resultados**: Pulsar Flecha Abajo cuando la búsqueda no da resultados preserva el foco del buscador, evitando interacciones innecesarias con el ratón.
- **Escape en dos fases**: El primer Escape descarta la búsqueda activa o desenfoca el campo; el segundo oculta la ventana o sale del modo emojis.
- **Flecha Arriba de regreso a los clips**: Pulsar Flecha Arriba en el primer clip (vista Compacta) o la fila superior (vista Completa) devuelve el foco a la barra de búsqueda y selecciona la consulta.
- **Sistema de un solo toast**: Los toasts y banners ya no se apilan; reemplazan suavemente a la notificación anterior con texto no seleccionable.
- **Hints del footer en marquee**: Los consejos del pie de la vista Compacta se desplazan limpiamente con animación de marquesina y márgenes óptimos.
- **Banner lateral del instalador NSIS**: Proporción corregida (164x314), margen seguro derecho ampliado y fusión de fondo suavizada en las pantallas de alta DPI del asistente de instalación de Windows.
- **Limpieza del modal de actualización**: Eliminados tooltips redundantes de botones y estilos de botones de acción unificados.

## [1.24.0] - 2026-10-13

### 🇺🇸 English

- **Adaptive universal visor**: Converted the image viewer into a universal media inspector supporting all clip types (images, text, code, rich text, HTML, and file paths) with a VISOR badge, zoom/pan controls, and metadata footer.
- **Flash-free window opening**: Viewer windows initialize hidden and reveal only after stylesheets and theme tokens apply, eliminating white or empty flashes.
- **Positioning and theme polish**: Prevents off-screen positioning, polishes header responsive layout, and refines Light and Gray theme contrast.
- **Origin app filtering**: Added quick search and filtering of clips by source application across Full and Compact modes, including unknown app detection and fallback labels.
- **1-click filter integration**: Type filter chips integrate with app filters, showing combined filter status in footer and auto-closing reset dropdowns.
- **Panoramic card format**: Added a panoramic layout option and quick toggle button for Full mode cards.
- **Marquee drag multi-selection**: Drag from layout empty spaces to select multiple cards simultaneously.
- **Multi-card deletion**: Context menu supports deleting all selected items when multiple cards are highlighted.
- **Keyboard focus clarity**: Clearly distinguishes actively selected items from hovered items in compact view.
- **Horizontal folder navigation**: Added scroll chevrons and fast wheel scrolling for compact folders, with edge disabling and folder deletion confirmation.
- **Automatic history retention**: Configurable background auto-deletion policy to safely purge older clips.
- **Quick controls**: Added clipboard monitoring toggle button to titlebars, custom NSIS installer graphics, and documented `Ctrl+Wheel` density zoom.

### 🇪🇸 Español

- **Visor universal adaptable**: El visor de imágenes se convierte en un inspector multimedia universal para todos los tipos de clips (imágenes, texto, código, texto enriquecido, HTML y rutas de archivos) con badge VISOR, controles de zoom/paneo y pie con metadatos.
- **Aperturas sin destellos**: Las ventanas del visor se inician ocultas y se revelan solo tras aplicar las hojas de estilo y los tokens del tema, eliminando destellos blancos o vacíos.
- **Pulido de posicionamiento y tema**: Evita el posicionamiento fuera de pantalla, afina el diseño responsivo del encabezado y refina el contraste de los temas Claro y Gris.
- **Filtro por app de origen**: Búsqueda y filtrado rápido de clips por aplicación de origen en los modos Completo y Compacto, con detección de apps desconocidas y etiquetas de respaldo.
- **Integración de filtros a 1 clic**: Los chips de filtro de tipo se combinan con los filtros de app, mostrando el estado combinado en el footer y cerrando automáticamente los desplegables de reset.
- **Formato de tarjeta panorámica**: Nueva opción de diseño panorámico y botón de alternancia rápida para las tarjetas del modo Completo.
- **Multiselección por arrastre**: Arrastra desde las zonas vacías del diseño para seleccionar varias tarjetas a la vez.
- **Borrado multi-tarjeta**: El menú contextual permite eliminar todos los elementos seleccionados cuando varias tarjetas están resaltadas.
- **Foco de teclado claro**: Distingue con claridad los elementos seleccionados activamente de los resaltados por el cursor en la vista compacta.
- **Navegación horizontal de carpetas**: Flechas de scroll y rueda rápida para las carpetas compactas, con desactivación en los extremos y confirmación de borrado de carpetas.
- **Retención automática del historial**: Política configurable de auto-borrado en segundo plano para depurar con seguridad los clips más antiguos.
- **Controles rápidos**: Botón de monitoreo del portapapeles en las titlebars, gráficos NSIS propios del instalador y documentado el zoom de densidad con `Ctrl+Rueda`.

## [1.23.0] - 2026-09-25

### 🇺🇸 English

- **Focus loss**: Clicking the desktop or another app hides CyberPaste again in both Full and Compact, including when the window stays above other windows.
- **Setting label**: The hide-on-blur toggle now shows its proper name in the confirmation toast.
- **Styled fragments**: Clipboard HTML that is only a styled sentence, such as a colored span from another app, is stored as plain text. Tables and other real HTML stay HTML.
- **Search field**: The history button sits inside the field, and the search tooltip mentions type-to-search plus `Ctrl+F`, which always focuses the bar.
- **Folder hints**: Full-mode tabs show `Ctrl+←/→`. Compact tabs show `←/→`. Compact folder changes use a short, quiet highlight, and the footer slowly rotates search, folder, and peek hints in the same muted style.
- **View button**: The mode switch stays a plain icon until hover.
- **Update dialog**: Notes scroll on their own, and Skip, Later, and Update stay below them. Skip is labeled “Saltar versión” in Spanish.

### 🇪🇸 Español

- **Pérdida de foco**: Hacer clic en el escritorio o en otra app vuelve a ocultar CyberPaste en Completo y Compacto por igual, incluso cuando la ventana permanece sobre las demás.
- **Etiqueta del ajuste**: El toggle de ocultar al perder foco muestra ahora su nombre correcto en el toast de confirmación.
- **Fragmentos con estilo**: El HTML del portapapeles que es solo una frase con estilo, como un span coloreado de otra app, se guarda como texto plano. Las tablas y el HTML real siguen siendo HTML.
- **Campo de búsqueda**: El botón de historial vive dentro del campo, y el tooltip de búsqueda menciona escribir para buscar más `Ctrl+F`, que siempre enfoca la barra.
- **Hints de carpetas**: Las pestañas del modo Completo muestran `Ctrl+←/→`. Las del Compacto muestran `←/→`. Los cambios de carpeta en Compacto usan un resalte breve y discreto, y el footer rota lentamente los hints de búsqueda, carpetas y peek en el mismo estilo apagado.
- **Botón de vista**: El cambio de modo permanece como icono plano hasta el hover.
- **Diálogo de actualización**: Las notas hacen scroll por su cuenta y Saltar, Más tarde y Actualizar quedan por debajo. Saltar se llama "Saltar versión" en español.

## [1.22.0] - 2026-09-24

### 🇺🇸 English

- **Keyboard-first history**: `Ctrl+H` opens search history with the first item selected, while arrow keys and Enter provide predictable navigation in Full and Compact modes.
- **History isolation**: Search history now suppresses competing tooltips and peek previews while it is open, and pointer hover does not steal the initial keyboard selection.
- **Unified shortcuts**: Title-bar actions now use the same single-modifier `Ctrl` convention, including peek, reset size, More, maximize, and Compact layout.
- **Adaptive More menu**: The menu repositions, fits the available height, exposes scrolling when needed, and includes Reset window size above Clear history.
- **Peek controls**: Peek toggles sit with the relevant filters/search controls and remain visually neutral when enabled.
- **Close-flow cleanup**: Pending close dialogs disappear when the main window is hidden through another route, and startup focus handling is more resilient when secondary windows appear.
- **About focus**: The About window stays above the main window when opened from More.
- **Update feedback**: About now shows a clearer success card with a dismiss button, while its original logo identity is preserved without the experimental glass background.
- **CyberGems apps**: About presents five randomized companion apps with a compact “See more...” action.
- **Diagnostics**: Added a footer action to copy useful diagnostic information for bug reports.
- **Bilingual refinement**: Improved update text, tooltips, keyboard hints, and close-dialog spacing in English and Spanish.

### 🇪🇸 Español

- **Historial por teclado primero**: `Ctrl+H` abre el historial de búsqueda con el primer elemento seleccionado, y las flechas y Enter ofrecen una navegación predecible en los modos Completo y Compacto.
- **Historial aislado**: El historial de búsqueda suprime ahora los tooltips y peek previews competidores mientras está abierto, y el hover del ratón no roba la selección inicial de teclado.
- **Atajos unificados**: Las acciones de la barra de título usan la misma convención `Ctrl` de un solo modificador, incluidos peek, restablecer tamaño, More, maximizar y el layout Compacto.
- **Menú More adaptable**: El menú se reposiciona, se ajusta a la altura disponible, muestra scroll cuando hace falta e incluye Restablecer tamaño de ventana sobre Vaciar historial.
- **Controles de peek**: Los toggles de peek viven junto a los filtros y controles de búsqueda correspondientes y siguen siendo visualmente neutros cuando están activos.
- **Limpieza del flujo de cierre**: Los diálogos de cierre pendientes desaparecen cuando la ventana principal se oculta por otra vía, y el manejo del foco al arrancar es más resiliente cuando aparecen ventanas secundarias.
- **Foco de About**: La ventana Acerca de permanece sobre la ventana principal al abrirla desde More.
- **Feedback de actualización**: About muestra ahora una tarjeta de éxito más clara con botón de descarte, conservando la identidad original del logo sin el fondo de cristal experimental.
- **Apps de CyberGems**: About presenta cinco apps compañeras aleatorias con una acción compacta "Ver más...".
- **Diagnósticos**: Añadida una acción en el pie para copiar información de diagnóstico útil en los reportes de bugs.
- **Refinamiento bilingüe**: Mejorados los textos de actualización, tooltips, hints de teclado y espaciado del diálogo de cierre en inglés y español.

## [1.21.0] - 2026-09-22

### 🇺🇸 English

- **Local Usage Progress**: Added optional, local-only usage statistics with long-term achievements, active-day tracking, profile start date, and a 25,000-clip milestone.
- **Backup-Safe Progress**: Backups now include lifetime totals, daily activity, unlocked achievements, and the original profile date while preserving compatibility with older backups.
- **Quiet Hours**: Added configurable notification quiet hours that also suppress associated sounds while preserving critical alerts.
- **Save As**: Added native export actions for clips and content windows, including images, text, HTML, RTF, URLs, original files, and multi-file clips.
- **Context Menu Export**: Clips can be saved directly from their context menus without opening a separate viewer.
- **Search History**: Added persistent MRU search history with case-insensitive deduplication, keyboard commit, clear controls, and literal `%` / `_` search handling.
- **Clearer Empty States**: Search failures now show a dedicated “No results” message instead of the default empty-history message.
- **Lock Screen Focus**: Wrong PIN attempts clear the field and return the caret to the input for the next attempt.
- **Native Dialog Stability**: Save and import dialogs remain attached to the active window without hiding the main app.
- **Tray Guidance**: Added contextual tray visibility guidance with CyberPaste branding, overflow visuals, and bilingual controls.
- **Modal and Layout Polish**: Refined lock-screen glass, modal icon styling, full-mode counts, search popup bounds, and related bilingual settings interfaces.

### 🇪🇸 Español

- **Progreso de uso local**: Añadidas estadísticas de uso opcionales y solo locales con logros a largo plazo, seguimiento de días activos, fecha de inicio del perfil y un hito de 25.000 clips.
- **Progreso seguro en los respaldos**: Los respaldos incluyen ahora los totales históricos, la actividad diaria, los logros desbloqueados y la fecha original del perfil, manteniendo la compatibilidad con respaldos anteriores.
- **Horario silencioso**: Añadidas horas de silencio configurables para las notificaciones que también suprimen los sonidos asociados conservando las alertas críticas.
- **Guardar como**: Añadidas acciones de exportación nativas para clips y ventanas de contenido, incluidas imágenes, texto, HTML, RTF, URLs, archivos originales y clips con varios archivos.
- **Exportar desde el menú contextual**: Los clips se guardan directamente desde sus menús contextuales sin abrir un visor aparte.
- **Historial de búsqueda**: Añadido historial de búsqueda persistente tipo MRU con deduplicación sin distinción de mayúsculas, confirmación por teclado, controles de limpieza y manejo literal de `%` y `_` en las búsquedas.
- **Estados vacíos más claros**: Los fallos de búsqueda muestran ahora un mensaje dedicado de "Sin resultados" en lugar del mensaje de historial vacío por defecto.
- **Foco en la pantalla de bloqueo**: Los intentos de PIN incorrectos limpian el campo y devuelven el cursor al input para el siguiente intento.
- **Estabilidad de diálogos nativos**: Los diálogos de guardar e importar permanecen adjuntos a la ventana activa sin ocultar la app principal.
- **Guía del tray**: Añadida una guía contextual de visibilidad del tray con la marca de CyberPaste, visuales del overflow y controles bilingües.
- **Pulido de modales y layout**: Refinados el cristal de la pantalla de bloqueo, el estilo de iconos de modales, los conteos del modo Completo, los límites del popup de búsqueda y las interfaces de ajustes bilingües relacionadas.

## [1.20.0] - 2026-09-07

### 🇺🇸 English

- **Meta (Muse Spark)**: Added Meta's Muse Spark provider to the AI provider list.
- **Prompt Editor UX**: Added prompt rename/reset controls, descriptions, truthful default placeholders, and Enter-to-confirm field editing.
- **Translation Defaults**: Improved bidirectional translation defaults and refreshed default AI models, including Grok.
- **Keyboard Navigation**: Added Space-to-open the selected clip's action menu and improved keyboard navigation so it does not fight hover state.
- **Move to Top/Bottom**: Clips can now be promoted directly to either end of the live clipboard list.
- **Clear History**: Added Clear History to the title-bar menu.
- **History Limit**: The history cap now correctly counts pinned items.
- **Window Menus**: Added more menus across the main and image viewer windows, with corrected image viewer title-bar behavior.
- **About Window**: Window branding can open About directly; the dialog remembers its monitor and shows Check Now status.
- **Grid Measurement**: The full clipboard grid is remeasured after the window is shown for more reliable layout.

### 🇪🇸 Español

- **Meta (Muse Spark)**: Añadido el proveedor Muse Spark de Meta a la lista de proveedores de IA.
- **UX del editor de prompts**: Añadidos controles de renombrar/restablecer prompts, descripciones, placeholders por defecto honestos y edición de campos con Enter para confirmar.
- **Defaults de traducción**: Mejoradas las traducciones bidireccionales por defecto y actualizados los modelos de IA predeterminados, incluido Grok.
- **Navegación por teclado**: Añadido abrir con Espacio el menú de acciones del clip seleccionado y mejorada la navegación por teclado para que no pelee con el estado de hover.
- **Mover al inicio/final**: Los clips pueden promoverse directamente a cualquiera de los dos extremos de la lista del portapapeles en vivo.
- **Vaciar historial**: Añadido Vaciar historial al menú de la barra de título.
- **Límite del historial**: El tope del historial cuenta ahora correctamente los elementos anclados.
- **Menús de ventana**: Añadidos menús More en las ventanas principal y del visor de imágenes, con el comportamiento de la titlebar del visor de imágenes corregido.
- **Ventana Acerca de**: La marca de la ventana abre Acerca de directamente; el diálogo recuerda su monitor y muestra el estado de Buscar ahora.
- **Medición de la cuadrícula**: La cuadrícula completa del portapapeles se remide tras mostrar la ventana para un layout más fiable.

## [1.19.1] - 2026-09-06

### 🇺🇸 English

- **Quoted Run command**: Explorer now launches CyberPaste at logon from `C:\Program Files\...` - the unquoted path plus leftover `--flag1 --flag2` example args never started, even with the toggle ON! 🔋

### 🇪🇸 Español

- **Comando de Ejecutar entre comillas**: El Explorador ahora lanza CyberPaste al iniciar sesión desde `C:\Program Files\...`; la ruta sin comillas más los argumentos de ejemplo sobrantes `--flag1 --flag2` nunca arrancaban, ¡ni siquiera con el toggle activado! 🔋

## [1.19.0] - 2026-09-06

### 🇺🇸 English

- **CyberWall-Style Pill**: A dynamic update control appears to the left of the window buttons when a newer version is available! ⬆️
- **Hover Expand**: Collapsed arrow in rest; hover reveals **Update** / **Actualizar**! 🖱️
- **Shared Signal**: Stays in sync with About and the tray LED, and opens the existing update modal! 🔄
- **Title-Bar Overflow**: Documentation & Wiki, website, changelog, GitHub, and About - matching the CyberFeeds help menu! 📚
- **Tray Help**: Wiki, FAQ, changelog, website, and donate from the tray! 🖱️
- **Pin-Tip First Run**: Explains how to keep CyberPaste visible in the Windows tray overflow! 📌
- **About Footer, CyberWall Icon Row**: Same Order & Heart: Globe, docs, GitHub, issues, releases, then a filled rose heart (`#F43F5E`) for donate! 🩷
- **Centered Type Filters**: Full-mode chips sit in the middle with a clear-filter control; selected folders drop the glow border! 🎛️
- **Aligned Compact Rows**: Reserved timestamp column so type and source icons stay lined up! 📐
- **Safer Menus**: Tighter compact row-menu hit target; dismissing a context menu no longer pastes! 🛡️
- **Still-Cursor Peek**: The compact peek no longer opens when the window appears under an unmoved cursor! 👁️
- **Lucide Startup Crash**: `HelpCircle` (lucide 0.294) replaces the missing `CircleHelp` import! 🚑

### 🇪🇸 Español

- **Píldora estilo CyberWall**: ¡Un control de actualización dinámico aparece a la izquierda de los botones de la ventana cuando hay una versión más nueva disponible! ⬆️
- **Expansión al hover**: Flecha colapsada en reposo; ¡el hover revela **Update** / **Actualizar**! 🖱️
- **Señal compartida**: ¡Se mantiene sincronizado con Acerca de y el LED del tray, y abre el modal de actualización existente! 🔄
- **Overflow de la barra de título**: ¡Documentación y Wiki, web, changelog, GitHub y Acerca de, igual que el menú de ayuda de CyberFeeds! 📚
- **Ayuda del tray**: ¡Wiki, FAQ, changelog, web y donar desde el tray! 🖱️
- **Consejo de anclaje en el primer arranque**: ¡Explica cómo mantener CyberPaste visible en el overflow del tray de Windows! 📌
- **Pie de Acerca de, fila de iconos estilo CyberWall**: ¡Mismo orden y corazón: globo, docs, GitHub, issues, releases y un corazón rosa relleno (`#F43F5E`) para donar! 🩷
- **Filtros de tipo centrados**: ¡Los chips del modo Completo se sitúan en el centro con un control de limpiar filtros; las carpetas seleccionadas pierden el borde con glow! 🎛️
- **Filas compactas alineadas**: ¡Columna de timestamp reservada para que los iconos de tipo y origen queden en línea! 📐
- **Menús más seguros**: ¡Área de clic más ajustada en el menú de fila compacta; descartar un menú contextual ya no pega! 🛡️
- **Peek con cursor quieto**: ¡El peek compacto ya no se abre cuando la ventana aparece bajo un cursor sin mover! 👁️
- **Crash de arranque de Lucide**: ¡`HelpCircle` (lucide 0.294) reemplaza el import `CircleHelp` que faltaba! 🚑

## [1.18.0] - 2026-08-31

### 🇺🇸 English

- **Full-Spectrum High-Res Previews**: Instant expanded hover peek for image cards, formatted code, and rich text without opening full editor windows! 🖼️
- **Dynamic Aspect Ratio Calibration**: Automatically scales up to 1280×800px fitting the natural dimensions of images without large empty checkerboard borders! 📐
- **Strict 4-Sided Viewport Clamping**: Perfectly centers on cards with safety bounds to guarantee zero clipping on top, bottom, or side window edges! 🛡️
- **Fluid Dismissal Mechanics**: Instant dismissal on cursor movement (>6px), scroll wheel, or mouse click without moving across card boundaries! 🖱️
- **Redundant Peek Suppression**: Filtered single-file clips and short snippets across both Full and Compact views! 📁
- **Dedicated Settings Toggle**: Added full peek toggle with bilingual localization under *Modo Completo* settings! ⚙️
- **Animated Transition Overlay**: Glowing holographic spinning scanline ring with pulsing cyan aura and logo branding during Compact ↔ Full window resizing! 🌀
- **Eliminated Window Flash & Double Renders**: Synchronized React view mounting with Rust morph transitions and prevented redundant Win32 DWM vibrancy re-applications! ⚡
- **Zero Background Bleed-Through**: Switched to native Win32 hardware Acrylic blur (`apply_acrylic`) for genuine desktop Gaussian blur behind windows! 💎
- **Dry Click Engine**: Replaced high-pitch alert beep with a dry, tactile mechanical click (320Hz → 140Hz) for duplicate clipboard copy events! 🔔
- **Clean Plain-Text Extraction**: Web copy operations (e.g. copying text on GitHub in Firefox) now prioritize clean plain text over internal browser HTML tags and markdown link wraps! 🛡️
- **High-Clarity System Tray**: Regenerated official icon suite with Lanczos 32×32px downsampling for razor-sharp system tray display! 🚀

### 🇪🇸 Español

- **Previsualizaciones de alta resolución de todo el espectro**: ¡Peek expandido instantáneo al hover para tarjetas de imagen, código formateado y texto enriquecido, sin abrir ventanas de edición completas! 🖼️
- **Calibración dinámica de proporción**: ¡Escala automáticamente hasta 1280×800px ajustándose a las dimensiones naturales de las imágenes, sin grandes bordes de cuadrícula vacíos! 📐
- **Sujeción estricta del viewport por los 4 lados**: ¡Centra perfectamente sobre las tarjetas con márgenes de seguridad que garantizan cero recortes en los bordes superior, inferior o laterales de la ventana! 🛡️
- **Mecánica de cierre fluida**: ¡Cierre instantáneo al mover el cursor (>6px), girar la rueda o hacer clic, sin cruzar los límites de la tarjeta! 🖱️
- **Supresión de peeks redundantes**: ¡Peeks filtrados para clips de un solo archivo y fragmentos cortos en las vistas Completo y Compacto! 📁
- **Toggle dedicado en Ajustes**: ¡Añadido un toggle de peek completo con localización bilingüe en los ajustes de *Modo Completo*! ⚙️
- **Overlay de transición animado**: ¡Anillo de scanline giratorio holográfico con aura cian pulsante y marca del logo durante el redimensionado Compacto ↔ Completo! 🌀
- **Adiós al flash de ventana y a los dobles renders**: ¡Montaje de vistas React sincronizado con las transiciones morph de Rust y re-aplicaciones redundantes de vibrancy de Win32 DWM eliminadas! ⚡
- **Cero transparencia del fondo**: ¡Cambio al desenfoque Acrylic nativo por hardware de Win32 (`apply_acrylic`) para un blur gaussiano real del escritorio tras las ventanas! 💎
- **Motor de clic seco**: ¡El pitido agudo de alerta deja paso a un clic mecánico seco y táctil (320Hz → 140Hz) para los eventos de copia duplicada del portapapeles! 🔔
- **Extracción de texto plano limpio**: ¡Las copias web (p. ej. copiar texto en GitHub desde Firefox) priorizan ahora el texto plano limpio sobre las etiquetas HTML internas del navegador y los envoltorios de enlaces markdown! 🛡️
- **Bandeja del sistema de alta nitidez**: ¡Suite de iconos oficial regenerada con downsampling Lanczos de 32×32px para una bandeja del sistema con nitidez absoluta! 🚀

## [1.17.2] - 2026-08-28

### 🇺🇸 English

- **Precision Grid Reorder Detection**: Calibrated vertical sensitivity and row affinity thresholds for drag-and-drop card reordering across both Full and Compact views! 🎯
- **Silky Smooth Drop Indicators**: Optimized adjacent card swap detection and eliminated no-op false drop indicators when dragging over adjacent cards! 💫
- **Documentation & Donation Links**: Updated official community donation links! ☕

### 🇪🇸 Español

- **Detección de reordenación de cuadrícula de precisión**: ¡Sensibilidad vertical y umbrales de afinidad de fila calibrados para el reordenamiento de tarjetas por arrastrar y soltar en las vistas Completo y Compacto! 🎯
- **Indicadores de soltado suaves como la seda**: ¡Detección de intercambio de tarjetas adyacentes optimizada y eliminados los indicadores falsos de soltado sin efecto al arrastrar sobre tarjetas contiguas! 💫
- **Enlaces de documentación y donaciones**: ¡Enlaces oficiales de donación de la comunidad actualizados! ☕

## [1.17.1] - 2026-08-27

### 🇺🇸 English

- **Same icon Dark & Light**: `tray.png` + `tray_white.png` now identical `128px` desaturated new icon - no more more-saturated old vs new mismatch! ✨

### 🇪🇸 Español

- **Mismo icono en oscuro y claro**: `tray.png` + `tray_white.png` son ahora el mismo nuevo icono desaturado de `128px`; ¡se acabó el desfase entre el viejo más saturado y el nuevo! ✨

## [1.17.0] - 2026-08-27

### 🇺🇸 English

- **Tray & Toasts now fully bilingual**: `auto` → `navigator.language` resolver + `sys-locale` Rust detection for welcome toast - Spanish stays Spanish! 🇪🇸
- **Fixed selective English**: `TrayMenuWindow` & `ToastWindow` now `resolveLanguage()` before `i18n.changeLanguage`, live `settings-changed` sync!
- **Auto-Paste ON by default**: `auto_paste: true` + `auto_inject_paste: true` - fresh installs paste instantly with `Ctrl+V` injection! No more OFF surprise.
- **React #300 crash gone (sidebar collapse)**: `useFolderFlash(null)` inside IIFE violated hooks order when collapsing. Moved to top-level `isClipboardFlashing` - toggle now silky smooth!
- **Slimmer**: `SIDEBAR_EXPANDED_W 160 → 148px` + dashed placeholder `No folders yet - drag clips to organize` when `folders.length===0` + `compact_sidebar_collapsed: true` by default - more room for clips, zero wasted void!
- **1 Fantasy Image Fixed**: Seeded 6 clips - valid 400×240 PNG (base64 3KB) with `{"size_bytes":196608,"width":400,"height":240}` fantasy metadata, no broken icon! 🖼️
- **Fused Texts**: `Welcome` + `Limitless Productivity` merged into 1 clip → no clip hidden off-screen on fresh install!
- **Demo = Fresh**: `generateDemoClips` trimmed from 9 → 6 (removed extra image + local text), single `CyberNeon UI` gradient + same 6-clip lineup - demo now mirrors fresh install!
- **Button**: `Load 20 demo clips` → `Load sample clips` / `Cargar clips de ejemplo` + all locales 🌐
- **Confirmation**: `ConfirmDialog` with `loadDemoClipsTitle/Message` - explains *temporarily* shows 6 examples, real clips NOT deleted, return on restart/restore. No more silent replace confusion!
- **README Footer**: New dark `Thanks for using CyberPaste! 🎉 - Made by CyberGems` footer (adapted from DEX example)!
- **Fixed 5500-image bloat**: `prune_history` now deletes `clip_images` + on-disk files + orphan cleanup (soft-deleted & dangling `images/`) - `max_items` now truly caps storage!
- **Auto-prune**: Runs on `save_settings(max_items)` and startup (1.8s) - existing 5422 PNGs trim to ~400 on next launch!

### 🇪🇸 Español

- **Tray y toasts totalmente bilingües**: resolver `auto` → `navigator.language` + detección Rust `sys-locale` para el toast de bienvenida; ¡el español se queda en español! 🇪🇸
- **Inglés selectivo corregido**: `TrayMenuWindow` y `ToastWindow` ahora llaman a `resolveLanguage()` antes de `i18n.changeLanguage`, con sincronización en vivo de `settings-changed`!
- **Auto-pegado activado por defecto**: `auto_paste: true` + `auto_inject_paste: true`; ¡las instalaciones nuevas pegan al instante con inyección `Ctrl+V`! Se acabó la sorpresa del OFF.
- **Adiós al crash de React #300 (colapso del sidebar)**: `useFolderFlash(null)` dentro de una IIFE violaba el orden de hooks al colapsar. Movido a `isClipboardFlashing` de nivel superior; ¡el toggle ahora va como la seda!
- **Más esbelto**: `SIDEBAR_EXPANDED_W 160 → 148px` + placeholder punteado `No folders yet - drag clips to organize` con `folders.length===0` + `compact_sidebar_collapsed: true` por defecto; ¡más espacio para clips y cero vacío desperdiciado!
- **1 imagen de fantasía corregida**: 6 clips sembrados con un PNG 400×240 válido (base64 3KB) con metadatos de fantasía `{"size_bytes":196608,"width":400,"height":240}`, ¡sin icono roto! 🖼️
- **Textos fusionados**: `Welcome` + `Limitless Productivity` se unen en 1 clip → ningún clip oculto fuera de pantalla en la instalación nueva!
- **Demo = instalación nueva**: `generateDemoClips` recortado de 9 → 6 (sin imagen extra ni texto local), un único degradado `CyberNeon UI` y la misma alineación de 6 clips; ¡la demo ahora refleja la instalación nueva!
- **Botón**: `Load 20 demo clips` → `Load sample clips` / `Cargar clips de ejemplo` + todos los idiomas 🌐
- **Confirmación**: `ConfirmDialog` con `loadDemoClipsTitle/Message`; explica que muestra *temporalmente* 6 ejemplos, los clips reales NO se borran y vuelven al reiniciar/restaurar. ¡Se acabó la confusión del reemplazo silencioso!
- **Pie del README**: Nuevo pie oscuro `Thanks for using CyberPaste! 🎉 - Made by CyberGems` (adaptado del ejemplo de DEX)!
- **Adiós a la inflación de 5500 imágenes**: `prune_history` ahora borra `clip_images` + archivos en disco + limpieza de huérfanos (borrado suave y `images/` colgantes); ¡`max_items` de verdad limita el almacenamiento!
- **Auto-poda**: Se ejecuta al guardar `save_settings(max_items)` y al arrancar (1.8s); ¡los 5422 PNG existentes se recortan a ~400 en el próximo arranque!

## [1.16.0] - 2026-08-27

### 🇺🇸 English

- **✨ New Title - The Ultimate Clipboard Manager**: Updated README header from `Clipboard History Manager` → `The Ultimate Clipboard Manager` with centered 128px logo glory! 💎
- **🎨 Icon Glow-Up - Crispy Everywhere**: Regenerated all `src-tauri/icons` masters from `artifacts/icon.png` (1024px LANCZOS), high-res `tray.png/tray_white.png` (128px razor-sharp, no bilinear blur at 125%/150%/200% DPI), `icon.ico` (11-entry), `logo.png` (512px) + touched `build.rs` for clean rebuild! ✨
- **⚡ Autostart ON by Default - Installer Ready**: `startup_with_windows` now `true` by default, auto-enables `tauri_plugin_autostart` on first run, NSIS `installMode: both` + `downloadBootstrapper` silent - no more manual toggle! 🔋
- **🌗 CyberPaste Theme by Default**: `theme: "cyberpaste"` + `mica` default instead of `system` - signature neon on fresh installs! 🌌
- **🌍 Auto Language - System Speaks**: `language: "auto"` with `navigator.language` resolver (`de/en/es/fr/ja/zh` → `en` fallback), new `Auto (System language)` selector, bilingual `EN → ES` ordering! 🗣️
- **🐛 Fixed - Settings Vanish Bug**: Fresh installs wiped all settings on config close (stale `settingsRef` overwrite). Now `SettingsWindow` + `App:persistWindow` fetch fresh `get_settings()` before saving geometry - theme & all prefs survive! 🛡️
- **📝 Editor Light Theme Rescue**: Light mode was stuck on `bg-[#0b0f19]` midnight canvas! Now `bg-background` / `bg-muted/40` / `bg-muted/50` with `text-foreground` - pure, readable bliss in Light ☀️ / Dark 🌙!
- **💎 Starter Clips Reborn**: Removed useless `🎨 Palette CyberNeon` demo, promoted `EN primary → ES secondary`, translated `Limitless Productivity` to English, `Modern → The Ultimate Clipboard Manager` - clean bilingual showcase! 📋
- **👁️ Demo Peek - Still Gorgeous**: Kept `generateImage` gradients for `CyberNeon UI` & `Compact Peek` (400×240) - press `Load demo clips` to admire, not seeded on fresh DB!
- **🧪 Demo Button - One Click Away**: New `Load demo clips` button right beside `Clear History` in `Backup & Data` - `emit('load-demo-data')` alive in production, instant `toast.success`! 🎬
- **🔔 Settings Persistence - Full Coverage**: Window size/pos saves no longer stomp theme/language - fresh installs stay exactly as you left them! ✅

### 🇪🇸 Español

- **✨ Nuevo título - The Ultimate Clipboard Manager**: Cabecera del README actualizada de `Clipboard History Manager` → `The Ultimate Clipboard Manager` con la gloria del logo de 128px centrado! 💎
- **🎨 Iconos renovados - nítidos en todo lado**: Todos los masters de `src-tauri/icons` regenerados desde `artifacts/icon.png` (LANCZOS 1024px), `tray.png/tray_white.png` en alta resolución (128px afilados, sin blur bilineal a 125%/150%/200% de DPI), `icon.ico` (11 entradas), `logo.png` (512px) + `build.rs` tocado para un rebuild limpio! ✨
- **⚡ Autoarranque activado por defecto - instalador listo**: `startup_with_windows` ahora `true` por defecto, habilita `tauri_plugin_autostart` solo en el primer arranque, NSIS `installMode: both` + `downloadBootstrapper` silencioso; ¡se acabó el toggle manual! 🔋
- **🌗 Tema CyberPaste por defecto**: `theme: "cyberpaste"` + `mica` por defecto en lugar de `system`; ¡neón de la casa en las instalaciones nuevas! 🌌
- **🌍 Idioma automático - habla tu sistema**: `language: "auto"` con resolver `navigator.language` (fallback `de/en/es/fr/ja/zh` → `en`), nuevo selector `Auto (System language)` y orden bilingüe `EN → ES`! 🗣️
- **🐛 Corregido - bug de ajustes que desaparecían**: Las instalaciones nuevas borraban todos los ajustes al cerrar la config (sobrescritura de un `settingsRef` obsoleto). Ahora `SettingsWindow` + `App:persistWindow` traen un `get_settings()` fresco antes de guardar la geometría; ¡el tema y todas las preferencias sobreviven! 🛡️
- **📝 Rescate del editor en tema claro**: ¡El modo claro estaba atrapado en el lienzo medianoche `bg-[#0b0f19]`! Ahora `bg-background` / `bg-muted/40` / `bg-muted/50` con `text-foreground`; ¡pureza legible en Claro ☀️ / Oscuro 🌙!
- **💎 Clips iniciales renacidos**: Eliminada la demo inútil `🎨 Palette CyberNeon`, promovido `EN primario → ES secundario`, `Limitless Productivity` traducido al inglés, `Modern → The Ultimate Clipboard Manager`; ¡vitrina bilingüe limpia! 📋
- **👁️ Peek de la demo - sigue precioso**: Se conservan los degradados `generateImage` para `CyberNeon UI` y `Compact Peek` (400×240); pulsa `Load demo clips` para admirarlos, sin sembrarlos en la BD nueva!
- **🧪 Botón de demo - a un clic**: Nuevo botón `Load demo clips` justo al lado de `Clear History` en `Backup & Data`; `emit('load-demo-data')` vivo en producción y `toast.success` al instante! 🎬
- **🔔 Persistencia de ajustes - cobertura total**: Guardar tamaño/posición de ventana ya no pisa tema/idioma; ¡las instalaciones nuevas se quedan exactamente como las dejaste! ✅

## [1.15.0] - 2026-08-26

### 🇺🇸 English

- **Refreshed Official Icon**: Beautiful, updated brand icon assets across Windows `.ico`, taskbar, app headers, and installers.
- **Razor-Sharp System Tray Icons**: Upgraded tray icon assets to high-resolution 128×128px masters, eliminating bilinear blurriness on Windows displays with 125%, 150%, or 200% DPI scaling.
- **Text Editor Facelift (IDE-Like Experience)**:
  - **Synchronized Line Numbers Gutter**: Added an integrated line numbers sidebar with active line highlighting and synchronized scrolling.
  - **Live IDE Status Bar**: Real-time cursor position tracking (`Ln X, Col Y`), character count, line count, word count, and `UTF-8` encoding indicator.
  - **Productivity Toolbar**:
    - Interactive **Word Wrap** toggle with responsive styling.
    - One-click **Copy All** button with animated confirmation feedback.
    - Dedicated **Clear Text** eraser action.
  - **Fast Keyboard Navigation**:
    - `Tab` key indentation support (inserts 2 spaces without losing focus).
    - Quick save with `Ctrl+S` or `Ctrl+Enter`.
    - Cancel with `Esc`.
  - **Responsive Viewport Fitting**: Dynamic flexbox containment guarantees the status bar and action buttons remain visible and comfortably proportioned without vertical clipping across all window dimensions.
- **Seamless inline deletion**: Replaced distant toast popups with modern inline fade-and-collapse animations directly on deleted cards in both Full and Compact modes.
- **Unified Peek Popover Borders**: Connected the compact popover container styling with the card neon hover border for visual consistency.
- **Enlarged Action Button Hit Area**: Expanded the vertical "..." options button clickable area on compact cards to eliminate missclicks.
- **Search Keyboard Hint**: Added localized `"TYPE TO SEARCH"` / `"ESCRIBE PARA BUSCAR"` reminder to the center of the compact footer bar when browsing the main clipboard list.
- **Extended Keyboard Navigation**: Added full support for `PageUp`, `PageDown`, `Home` (Start/First), and `End` (Last) keys with smooth automatic scrolling across both view modes.
- **Title Bar Animations Toggle**: Added an optional setting toggle to enable/disable HUD scan sweep animations on title bars (enabled by default).
- **Settings Hierarchy Polish**: Reorganized general settings under priority sections and removed developer console buttons from the backup panel.
- **Modern Starter & Demo Clips**: Added automated SQLite database seeding on fresh installations with modern, bilingual starter clips showcasing shortcuts, TypeScript snippets, CyberNeon color palettes, and markdown notes.

### 🇪🇸 Español

- **Icono oficial renovado**: Preciosos assets de icono de marca actualizados en el `.ico` de Windows, la barra de tareas, las cabeceras de la app y los instaladores.
- **Iconos del tray con nitidez**: Assets del icono del tray actualizados a masters de 128×128px de alta resolución, eliminando el desenfoque bilineal en pantallas Windows con escalado de 125%, 150% o 200% de DPI.
- **Cara nueva del editor de texto (experiencia tipo IDE)**:
  - **Gutter de números de línea sincronizado**: Barra lateral de números de línea integrada con resalte de la línea activa y scroll sincronizado.
  - **Barra de estado IDE en vivo**: Seguimiento de la posición del cursor en tiempo real (`Ln X, Col Y`), conteo de caracteres, de líneas, de palabras e indicador de codificación `UTF-8`.
  - **Barra de productividad**:
    - Toggle interactivo de **ajuste de línea** (word wrap) con estilo responsivo.
    - Botón **Copiar todo** a un clic con confirmación animada.
    - Acción específica de **borrar texto** con icono de goma.
  - **Navegación rápida por teclado**:
    - Indentación con la tecla `Tab` (inserta 2 espacios sin perder el foco).
    - Guardado rápido con `Ctrl+S` o `Ctrl+Enter`.
    - Cancelar con `Esc`.
  - **Encaje responsivo del viewport**: Un contenedor flexbox dinámico garantiza que la barra de estado y los botones de acción sigan visibles y bien proporcionados, sin recortes verticales en ninguna dimensión de ventana.
- **Borrado inline fluido**: Los toasts lejanos dejan paso a modernas animaciones inline de fundido y colapso directamente sobre las tarjetas borradas en los modos Completo y Compacto.
- **Bordes del popover de peek unificados**: El estilo del contenedor del popover compacto conecta con el borde neón de hover de la tarjeta para dar consistencia visual.
- **Área de clic del botón de acciones ampliada**: La zona clicable vertical del botón "..." en las tarjetas compactas crece para eliminar los fallos de puntería.
- **Hint de teclado para buscar**: Recordatorio localizado `"TYPE TO SEARCH"` / `"ESCRIBE PARA BUSCAR"` en el centro de la barra inferior compacta al navegar la lista principal del portapapeles.
- **Navegación por teclado extendida**: Soporte completo de `PageUp`, `PageDown`, `Home` (inicio/primero) y `End` (último) con scroll automático suave en ambos modos de vista.
- **Toggle de animaciones de la barra de título**: Ajuste opcional para activar/desactivar las animaciones de barrido del HUD en las barras de título (activado por defecto).
- **Jerarquía de ajustes pulida**: Ajustes generales reorganizados por secciones prioritarias y botones de consola de desarrollador eliminados del panel de respaldo.
- **Clips iniciales y de demo modernos**: Siembra automática de la base de datos SQLite en instalaciones nuevas con clips iniciales bilingües y modernos que lucen atajos, snippets de TypeScript, paletas de colores CyberNeon y notas markdown.

## [1.14.0] - 2026-08-26

### 🇺🇸 English

- **Smooth edge auto-scrolling**: Dragging a clip near the viewport boundaries (top/bottom in vertical mode, left/right in horizontal mode) now smoothly auto-scrolls the list with speed proportional to edge proximity.
- **Dynamic drop targeting**: Target clip slots are evaluated live in real-time under the cursor during auto-scrolling, enabling seamless reordering to clips initially outside the viewport.
- **Smart folder drop detection**: Dragging over folder buttons automatically pauses auto-scrolling, hides list insertion lines, and highlights the target folder for an intuitive drop.
- **Non-colliding startup banners**: Fixed race conditions between the Welcome Banner and the Update Available notification by sequencing them cleanly with a dedicated queue.
- **Polished toast lifecycle**: Update toasts wait for any active welcome animation to complete before presenting themselves, preventing abrupt cutoffs.
- **Copy with duplicate detection**: Dragging or moving clips into folders duplicates them safely, accompanied by duplicate-detection toasts and animated double-pulse illumination (`folder-double-flash`) on folder tabs.
- **Enhanced compact peek previews**: Redesigned image peek with full-bleed popovers, checkerboard transparency grids, and calibrated hover timing.
- **1-Click download buttons**: Added prominent hero download buttons in the README header pointing directly to the latest Windows installer.
- **Vector crypto donation support**: Replaced placeholder icons with crisp official SVG cryptocurrency logos and interactive toggles across the CyberGems project suite.
- **Cleaned architecture documentation**: Modernized project descriptions and removed legacy fork sections.

### 🇪🇸 Español

- **Auto-scroll suave en los bordes**: Arrastrar un clip cerca de los límites del viewport (arriba/abajo en modo vertical, izquierda/derecha en horizontal) hace scroll automático de la lista con velocidad proporcional a la cercanía del borde.
- **Destino de soltado dinámico**: Las ranuras destino se evalúan en vivo y en tiempo real bajo el cursor durante el auto-scroll, permitiendo reordenar sin costuras hacia clips que al principio quedaban fuera del viewport.
- **Detección inteligente de soltado en carpetas**: Arrastrar sobre los botones de carpeta pausa el auto-scroll, oculta las líneas de inserción de la lista y resalta la carpeta destino para un soltado intuitivo.
- **Banners de arranque sin colisiones**: Corregidas las condiciones de carrera entre el banner de bienvenida y el aviso de actualización disponible secuenciándolos limpiamente con una cola dedicada.
- **Ciclo de toasts pulido**: Los toasts de actualización esperan a que termine la animación de bienvenida activa antes de aparecer, evitando cortes bruscos.
- **Copiar con detección de duplicados**: Arrastrar o mover clips a carpetas los duplica de forma segura, con toasts de detección de duplicados e iluminación animada de doble pulso (`folder-double-flash`) en las pestañas de carpeta.
- **Peeks compactos de imagen mejorados**: Peek de imagen rediseñado con popovers a sangre completa, cuadrículas de transparencia a cuadros y temporización de hover calibrada.
- **Botones de descarga a 1 clic**: Botones de descarga protagonistas en la cabecera del README que apuntan directamente al último instalador de Windows.
- **Donaciones cripto vectoriales**: Los iconos de relleno dejan paso a logos SVG oficiales nítidos de criptomonedas con toggles interactivos en toda la suite de proyectos CyberGems.
- **Documentación de arquitectura limpia**: Descripciones de los proyectos modernizadas y secciones heredadas del fork eliminadas.

## [1.13.0] - 2026-08-26

### 🇺🇸 English

- **Copy instead of move**: Dragging or moving clips into folders now duplicates them into the destination folder while preserving the original clip in the main clipboard and latest position.
- **Double-flash visual feedback**: Added an animated double-pulse illumination (`folder-double-flash`) on folder tabs and sidebar buttons when clips are copied.
- **Dedicated duplicate toast**: Friendly amber "Duplicate" toast notification when copying a clip that already exists in the target folder.
- **Maximized image area**: Removed the inner card padding and border, allowing previews to utilize the full popover area.
- **Checkerboard background**: Added a sleek transparency grid pattern for transparent PNG/WebP images in both Light and Dark themes.
- **Dynamic aspect-ratio fitting**: Previews now hug the exact height of the image without empty vertical margins.
- **Streamlined header**: Removed redundant action buttons to keep the hover peek focused and minimal.
- **Calibrated hover delay**: Adjusted peek activation delay to 750ms for a smoother, non-intrusive experience.
- **Clip deletion view wipeout fix**: Fixed a state issue where deleting a clip from the context menu could blank the active folder view until refresh.
- **Compact menu spacing**: Narrowed the three-dot button width and eliminated layout shifting on hover.
- **Hidden detail panel in compact**: Context menus in Compact mode now hide the Full-mode-only "Expand Details Panel" action.
- **Startup dev stability**: Added pre-dev cleanup lifecycle script to prevent orphaned background processes.

### 🇪🇸 Español

- **Copiar en lugar de mover**: Arrastrar o mover clips a carpetas ahora los duplica en la carpeta destino conservando el clip original en el portapapeles principal y su última posición.
- **Feedback visual de doble destello**: Iluminación animada de doble pulso (`folder-double-flash`) en las pestañas de carpeta y los botones del sidebar al copiar clips.
- **Toast de duplicado dedicado**: Toast ámbar y amistoso de "Duplicado" al copiar un clip que ya existe en la carpeta destino.
- **Área de imagen maximizada**: Padding interior y borde de la tarjeta eliminados, así las previsualizaciones aprovechan todo el área del popover.
- **Fondo a cuadros**: Elegante patrón de cuadrícula de transparencia para imágenes PNG/WebP transparentes en los temas Claro y Oscuro.
- **Encaje dinámico de proporción**: Las previsualizaciones se ajustan a la altura exacta de la imagen sin márgenes verticales vacíos.
- **Cabecera simplificada**: Botones de acción redundantes eliminados para un peek de hover enfocado y mínimo.
- **Retardo de hover calibrado**: Activación del peek ajustada a 750ms para una experiencia más suave y nada intrusiva.
- **Corregido el borrado que vaciaba la vista**: Arreglado un problema de estado por el que borrar un clip desde el menú contextual podía dejar en blanco la vista de carpeta activa hasta refrescar.
- **Espaciado del menú compacto**: Botón de tres puntos más estrecho y sin desplazamientos de layout al hover.
- **Panel de detalles oculto en compacto**: Los menús contextuales del modo Compacto ocultan ahora la acción "Expandir panel de detalles", exclusiva del modo Completo.
- **Estabilidad al arrancar en desarrollo**: Script de limpieza pre-dev en el ciclo de vida para evitar procesos huérfanos en segundo plano.

## [1.12.1] - 2026-08-25

### 🇺🇸 English

- **Silent startup update checks**: Silenced background update errors when launching offline, preventing intrusive error toasts from obstructing the welcome notification.
- **Friendly updater notifications**: Simplified update error toasts to clear, non-technical advice ("Check your internet connection").
- **Clean About maintenance UI**: Redesigned the update error panel with a calmer, non-alarmist appearance and collapsible technical details.
- **Natural compact peek dismiss**: Moving the cursor or scrolling now immediately and smoothly dismisses the compact row hover peek.
- **Bilingual and localization updates**: Added full translations across all supported languages (English, Spanish, German, French, Japanese, Simplified Chinese).

### 🇪🇸 Español

- **Comprobaciones de actualización silenciosas al arrancar**: Errores de actualización en segundo plano silenciados al lanzar sin conexión, para que los toasts de error no estorben a la notificación de bienvenida.
- **Notificaciones del updater amistosas**: Los toasts de error de actualización se simplifican a consejos claros y no técnicos ("Comprueba tu conexión a internet").
- **UI de mantenimiento de Acerca de limpia**: Panel de errores de actualización rediseñado con un aspecto más calmado y no alarmista, y detalles técnicos colapsables.
- **Cierre natural del peek compacto**: Mover el cursor o hacer scroll descarta de inmediato y con suavidad el peek de la fila compacta al hover.
- **Actualizaciones bilingües y de localización**: Traducciones completas añadidas para todos los idiomas soportados (inglés, español, alemán, francés, japonés y chino simplificado).

## [1.12.0] - 2026-08-26

### 🇺🇸 English

- **Restored Full-mode details**: Added a dedicated details-panel toggle beside grid zoom and an equivalent context-menu action.
- **Faster clip switching**: Detail-panel content now updates instantly without replaying the slide animation for every selected clip.
- **Image-aware actions**: The detail panel only shows the image preview action for image clips.
- **Compact clip menus**: Replaced the compact delete shortcut with a contextual three-dot menu and added keyboard access through Shift+F10 and the Context Menu key.
- **Independent scrollbars**: Added discreet, independently configurable Full and Compact mode scrollbars while removing unwanted horizontal scrolling in Full mode.
- **About and maintenance polish**: Detached About into its own window, improved tray access, and reorganized maintenance tools under Backup & Data.
- **HUD polish**: Added the details-panel shortcut to the rotating Full-mode hints and slowed the title-bar sweep to better match Compact mode.

### 🇪🇸 Español

- **Detalles del modo Completo restaurados**: Toggle dedicado del panel de detalles junto al zoom de la cuadrícula y una acción equivalente en el menú contextual.
- **Cambio de clip más rápido**: El contenido del panel de detalles se actualiza al instante sin repetir la animación de deslizamiento por cada clip seleccionado.
- **Acciones conscientes del tipo**: El panel de detalles solo muestra la acción de previsualización de imagen en los clips de imagen.
- **Menús de clip compactos**: El atajo de borrado compacto deja paso a un menú contextual de tres puntos, con acceso por teclado vía Shift+F10 y la tecla de Menú Contextual.
- **Scrollbars independientes**: Scrollbars discretos e independientes para los modos Completo y Compacto, eliminando el scroll horizontal no deseado en Completo.
- **Pulido de Acerca de y mantenimiento**: Acerca de se separa en su propia ventana, con mejor acceso desde el tray, y las herramientas de mantenimiento se reorganizan en Copia de seguridad y datos.
- **HUD pulido**: El atajo del panel de detalles se suma a los hints rotativos del modo Completo y el barrido de la barra de título va más despacio para igualar al Compacto.

## [1.11.1] - 2026-08-19

### 🇺🇸 English

- **Cleaner Full-mode controls**: Removed the redundant title-bar button for toggling the information display; the setting remains available in Settings.
- **Clearer HUD setting**: Updated the label and helper text to describe the keyboard shortcut hints and database size shown in the title bar.
- **Less redundant settings copy**: Simplified Full and Compact mode labels and helper text where the selected settings tab already provides the context.

### 🇪🇸 Español

- **Controles del modo Completo más limpios**: Eliminado el botón redundante de la barra de título para alternar la pantalla de información; el ajuste sigue disponible en Ajustes.
- **Ajuste del HUD más claro**: Etiqueta y texto de ayuda actualizados para describir los hints de atajos de teclado y el tamaño de la base de datos que muestra la barra de título.
- **Textos de ajustes menos redundantes**: Etiquetas y textos de ayuda de los modos Completo y Compacto simplificados donde la pestaña de ajustes seleccionada ya aporta el contexto.

## [1.11.0] - 2026-08-19

### 🇺🇸 English

- **Refined Full-mode chrome**: Simplified the top bar, moved window controls into the header, and aligned its styling with Compact mode.
- **Improved type filters**: Moved grid zoom beside the filters, improved spacing and count alignment, and fixed URL counts to use database totals.
- **Pin feedback**: Added a brief visual flash when clips are pinned or unpinned in both views.
- **Context-menu focus**: Preserved the active clip highlight and disabled unrelated card hover effects while a context menu is open.
- **Window sizing**: Increased the default Full-mode height and improved reset positioning around the Windows work area.

### 🇪🇸 Español

- **Marco del modo Completo refinado**: Barra superior simplificada, controles de ventana dentro de la cabecera y estilo alineado con el modo Compacto.
- **Filtros de tipo mejorados**: Zoom de la cuadrícula junto a los filtros, espaciado y alineación de contadores mejorados, y conteos de URLs corregidos para usar los totales de la base de datos.
- **Feedback al anclar**: Breve destello visual al fijar o desfijar clips en ambas vistas.
- **Foco del menú contextual**: El resalte del clip activo se conserva y los efectos hover de tarjetas ajenas se desactivan mientras hay un menú contextual abierto.
- **Tamaño de la ventana**: Mayor altura por defecto del modo Completo y mejor posicionamiento del reset alrededor del área de trabajo de Windows.

## [1.10.5] - 2026-08-12

### 🇺🇸 English

- **Shorter context-menu hint**: Simplified the toast tooltip text to reduce visual clutter.

### 🇪🇸 Español

- **Hint del menú contextual más corto**: Texto del tooltip del toast simplificado para reducir el ruido visual.

## [1.10.4] - 2026-08-12

### 🇺🇸 English

- **Updated application icons**: Refreshed the app, taskbar, tray, and platform icon resources.
- **About logo glow**: Added back a subtle glow while allowing the logo's own frame to remain visible.

### 🇪🇸 Español

- **Iconos de la app actualizados**: Recursos de icono renovados para la app, la barra de tareas, el tray y las plataformas.
- **Glow del logo de Acerca de**: Un glow sutil vuelve, dejando visible el marco propio del logo.

## [1.10.3] - 2026-08-12

### 🇺🇸 English

- **Image Peek Trigger**: Restructured the compact image hover logic so that the detailed metadata preview popover is only displayed when hovering over the image thumbnail itself, not the entire row.

### 🇪🇸 Español

- **Activación del peek de imagen**: Lógica de hover de imagen compacta reestructurada para que el popover con la previsualización y metadatos detallados solo aparezca al pasar el cursor sobre la miniatura de la imagen, no sobre toda la fila.

## [1.10.2] - 2026-08-11

### 🇺🇸 English

- **Reliable Update Checks on Windows**: Switched the updater HTTP/TLS stack to Windows native TLS (Schannel) to fix instant connection failures against GitHub Releases.

### 🇪🇸 Español

- **Comprobaciones de actualización fiables en Windows**: La pila HTTP/TLS del updater pasa al TLS nativo de Windows (Schannel) para arreglar los fallos de conexión instantáneos contra GitHub Releases.

## [1.10.1] - 2026-08-11

### 🇺🇸 English

- **Clearer Update Errors**: Update checks now show the real backend error in toasts and Settings, with copy support for diagnostics.
- **Brand Consistency**: Replaced remaining Ciber-CR references with CyberGems across docs and product pages.

### 🇪🇸 Español

- **Errores de actualización más claros**: Las comprobaciones de actualización muestran ahora el error real del backend en toasts y Ajustes, con copia al portapapeles para diagnóstico.
- **Consistencia de marca**: Las referencias restantes de Ciber-CR se sustituyen por CyberGems en docs y páginas de producto.

## [1.10.0] - 2026-08-11

### 🇺🇸 English

- **Type-aware editing**: Edit modal titles now identify Text, HTML, Code, URL, Rich Text, and File clips.
- **Live character counts**: Edit modal title bars show the current character count while typing.
- **Context menu clarity**: Clip and toast context menus now use type-specific Edit actions.
- **Toast discoverability**: Toast tooltips now hint that right-click opens the context menu.
- **Modal polish**: Improved title alignment and removed forced uppercase styling from modal titles.

### 🇪🇸 Español

- **Edición consciente del tipo**: Los títulos del modal de edición identifican ahora los clips de Texto, HTML, Código, URL, Texto enriquecido y Archivo.
- **Conteo de caracteres en vivo**: Las barras de título del modal de edición muestran el conteo de caracteres actual mientras escribes.
- **Menús contextuales claros**: Los menús contextuales de clips y toasts usan acciones de Edición específicas por tipo.
- **Toasts más descubribles**: Los tooltips de los toasts insinúan ahora que el clic derecho abre el menú contextual.
- **Pulido de modales**: Alineación de títulos mejorada y mayúsculas forzadas eliminadas de los títulos de los modales.

## [1.9.3] - 2026-08-11

### 🇺🇸 English

- **Clearer Update Toasts**: Improved update messages, prevented truncation, and ensured update alerts remain visible independently of general action-message settings.
- **Tray Update Indicator**: Added a glowing LED beside the CyberPaste branding when a new version is available.
- **Tray Branding**: Prevented the text caret cursor from appearing over the tray menu branding.

### 🇪🇸 Español

- **Toasts de actualización más claros**: Mensajes de actualización mejorados, sin truncamientos, y avisos de actualización siempre visibles independientemente de los ajustes generales de mensajes de acción.
- **Indicador de actualización en el tray**: Un LED brillante junto a la marca CyberPaste cuando hay una versión nueva disponible.
- **Marca del tray**: El cursor de texto ya no aparece sobre la marca del menú del tray.

## [1.9.2] - 2026-08-11

### 🇺🇸 English

- **Signed Automatic Updates**: Enabled reliable updater artifacts and release signatures so the application can detect and install new versions safely.
- **Update Feedback**: Improved unavailable-update messaging and clarified the GitHub Releases fallback.
- **Settings Controls**: Removed the mouse-click focus outline from configuration buttons while preserving keyboard focus visibility.

### 🇪🇸 Español

- **Actualizaciones automáticas firmadas**: Artefactos del updater y firmas de release fiables para que la aplicación detecte e instale versiones nuevas de forma segura.
- **Feedback de actualización**: Mensajes de actualización no disponible mejorados y el fallback de GitHub Releases aclarado.
- **Controles de ajustes**: El contorno de foco al hacer clic desaparece de los botones de configuración conservando la visibilidad del foco por teclado.

## [1.9.1] - 2026-08-10

### 🇺🇸 English

- **Compact Peek Focus**: Added a focused background blur that keeps the title bar and source clip row clear while making surrounding clip text less distracting.
- **Peek Interactions**: Synchronized peek visibility with selection styling and dismiss the peek immediately when hovering over folders.
- **Peek Styling**: Refined peek badges with a neutral visual treatment and softened the background effect for a smoother transition.
- **Settings Window Stability**: Improved minimize and restore handling to prevent window-state deadlocks.
- **Settings Controls**: Added a minimize button to the Settings window.

### 🇪🇸 Español

- **Foco del peek compacto**: Blur de fondo enfocado que mantiene despejadas la barra de título y la fila del clip de origen, mientras el texto de los clips cercanos distrae menos.
- **Interacciones del peek**: Visibilidad del peek sincronizada con el estilo de selección y cierre inmediato del peek al pasar el cursor sobre las carpetas.
- **Estilo del peek**: Badges del peek refinados con un tratamiento visual neutro y efecto de fondo suavizado para una transición más fluida.
- **Estabilidad de la ventana de Ajustes**: Manejo de minimizar y restaurar mejorado para evitar bloqueos de estado de la ventana.
- **Controles de Ajustes**: Botón de minimizar añadido a la ventana de Ajustes.

## [1.9.0] - 2026-08-10

### 🇺🇸 English

- **Folders Tab in Settings**: Added a new Folders tab in Settings and made wheel folder navigation optional.
- **Separate Window Maximization**: Decoupled window maximization status from view modes.
- **Enhanced Toast Notifications**: Added a custom context menu for toasts, system viewer action, and self-duplication debouncing.
- **Configurable Duplicate Notifications**: Allowed enabling/disabling of duplicate toast popups.
- **Premium Tooltips**: Replaced native tooltips with premium styled Tooltip component throughout the application.
- **Settings Redesign**: Redesigned the Location and Appearance sections to match the CyberSnap layout cards structure.
- **Toast Optimization**: Removed toast transparency across themes and resolved inactive dots contrast.
- **Window Corner Issue**: Disabled native Tauri window acrylic blur on the toast window to fix corner rendering issues on Windows.
- **Layout Alignment**: Aligned settings panel structure to match CyberSnap aesthetics, removed centered max-width constraint for full-width layout, and optimized layout breakpoints.
- **Toast Margins**: Adjusted positioning margins and cleaned up the toast position grid.
- **Duplicate Debouncing**: Improved duplicate detection alerts with updated titles and description copy.

### 🇪🇸 Español

- **Pestaña de Carpetas en Ajustes**: Nueva pestaña de Carpetas en Ajustes y navegación de carpetas con la rueda ahora opcional.
- **Maximización de ventana independiente**: El estado de maximización de la ventana se desacopla de los modos de vista.
- **Notificaciones toast mejoradas**: Menú contextual propio para los toasts, acción de visor del sistema y debounce de la auto-duplicación.
- **Notificaciones de duplicados configurables**: Los toasts de duplicados se pueden activar y desactivar.
- **Tooltips premium**: Los tooltips nativos dejan paso a un componente Tooltip de estilo premium en toda la aplicación.
- **Rediseño de Ajustes**: Secciones de Ubicación y Apariencia rediseñadas siguiendo la estructura de tarjetas de layout de CyberSnap.
- **Optimización de toasts**: Transparencia de los toasts eliminada en todos los temas y contraste de los puntos inactivos resuelto.
- **Esquinas de la ventana**: Blur acrílico nativo de la ventana Tauri desactivado en la ventana de toasts para arreglar el renderizado de esquinas en Windows.
- **Alineación del layout**: Estructura del panel de ajustes alineada con la estética CyberSnap, restricción de ancho máximo centrado eliminada para un layout a todo lo ancho y breakpoints optimizados.
- **Márgenes de toasts**: Márgenes de posicionamiento ajustados y cuadrícula de posiciones de toasts limpia.
- **Debounce de duplicados**: Alertas de detección de duplicados mejoradas con títulos y descripciones renovados.

## [1.8.0] - 2026-08-07

### 🇺🇸 English

- **Automatic Updates & Safety**: Implemented automatic updates check, window boundary clamping, and cleaned up debug/panic UI.

- **Optimized Releases**: Removed arm64 and msi build targets to generate only x64 NSIS installers.

### 🇪🇸 Español

- **Actualizaciones automáticas y seguridad**: Comprobación automática de actualizaciones implementada, sujeción de la ventana a los límites de pantalla y limpieza de la UI de debug/panic.

- **Releases optimizados**: Objetivos de build arm64 y msi eliminados para generar solo instaladores NSIS x64.

## [1.7.0] - 2026-08-07

### 🇺🇸 English

- **New Brand Identity**:
  - Replaced official application logo and system tray icons with the new brand icon.
- **2D Keyboard Navigation**:
  - Implemented true 2D grid navigation using arrow keys (`↑/↓` jump rows, `←/→` move between adjacent cards).
- **Light Theme Polish**:
  - Extensively redesigned title bars, action buttons, and control structures for clean contrast.
  - Redesigned image card overlays to clear metadata and ensure 100% legibility on any image background.
  - Made the context menu and full-screen image preview modal fully theme-aware.
  - Standardized LED indicator lights to use theme-based accent color (removing yellow lights).
  - Adjusted Light theme toast notifications (header, program name, and progress bar) for perfect readability.
- **Context Menu & Multiselect**:
  - Hidden AI actions for non-textual (image/file) clips in the context menu.
  - Enlarged multi-select checkbox click targets to prevent accidental window closure.

### 🇪🇸 Español

- **Nueva identidad de marca**:
  - Logo oficial de la aplicación e iconos de la bandeja del sistema sustituidos por el nuevo icono de marca.
- **Navegación 2D por teclado**:
  - Navegación de cuadrícula 2D real con las flechas (`↑/↓` saltan filas, `←/→` se mueven entre tarjetas adyacentes).
- **Pulido del tema claro**:
  - Barras de título, botones de acción y estructuras de control rediseñados a fondo para un contraste limpio.
  - Overlays de las tarjetas de imagen rediseñados para despejar los metadatos y garantizar legibilidad total sobre cualquier fondo de imagen.
  - El menú contextual y el modal de previsualización de imagen a pantalla completa son totalmente conscientes del tema.
  - Los LED indicadores estandarizados al color de acento del tema (sin luces amarillas).
  - Toasts del tema claro ajustados (cabecera, nombre del programa y barra de progreso) para una lectura perfecta.
- **Menú contextual y multiselección**:
  - Acciones de IA ocultas para clips no textuales (imagen/archivo) en el menú contextual.
  - Objetivos de clic del checkbox de multiselección ampliados para evitar cierres accidentales de la ventana.

## [1.5.1] - 2026-05-30

### 🇺🇸 English

- **Global Keyboard Hook for Cut Detection**: Implemented a low-level global Win32 hook (`WH_KEYBOARD_LL`) to accurately identify `Ctrl+X` and `Shift+Delete` cut events even when the main window is hidden in the background, updating the toast notifications to show "Cortado" / "Imagen cortada" with a custom Scissors icon.
- **Dynamic Type Filter Option Counts**: Added real-time item counts next to each format filter (All, Text, Code, Image, URL, File) inside the type selector dropdown in Compact View.
- **Toast Notification Click Navigation**: Enabled clicking on toast notifications to immediately open CyberPaste, navigate to the main Clipboard list, select the corresponding clip, and bring the window to the foreground.
- **Main List Clip Reordering**: Restored and enabled clip reordering by dragging and dropping items within the main clipboard list.
- **Symmetric Folder Drop Highlights**: Polished and resolved conflicting hover and selection styling on the main Clipboard tab and folders during clip drag-and-drop operations, preventing flickering and selection state resets.
- **Move to Folder Context Option**: Added a three-dot menu option "Move to Folder..." inside the clip card menu for quick folder migrations.

### 🇪🇸 Español

- **Hook global de teclado para detectar cortes**: Implementado un hook global Win32 de bajo nivel (`WH_KEYBOARD_LL`) que identifica con precisión los cortes con `Ctrl+X` y `Shift+Delete` aunque la ventana principal esté oculta en segundo plano, con toasts que muestran "Cortado" / "Imagen cortada" y un icono de tijeras propio.
- **Conteos dinámicos en los filtros de tipo**: Conteo de elementos en tiempo real junto a cada filtro de formato (Todos, Texto, Código, Imagen, URL, Archivo) dentro del desplegable selector de tipos de la vista Compacta.
- **Navegación al hacer clic en los toasts**: Hacer clic en una notificación toast abre CyberPaste al instante, navega a la lista principal del portapapeles, selecciona el clip correspondiente y trae la ventana al frente.
- **Reordenación de clips en la lista principal**: Reordenar clips arrastrando y soltando elementos dentro de la lista principal del portapapeles vuelve a estar disponible.
- **Resaltes de soltado simétricos en carpetas**: Estilos de hover y selección conflictivos en la pestaña principal del portapapeles y las carpetas pulidos durante las operaciones de arrastrar y soltar, evitando parpadeos y reinicios del estado de selección.
- **Opción "Mover a carpeta" en el menú contextual**: Nueva opción "Mover a carpeta..." en el menú de tres puntos de la tarjeta del clip para migraciones rápidas de carpeta.

## [1.2.0] - 2026-05-19

### 🇺🇸 English

- **Writing Focus Guard**: Global shortcuts (like the `Delete` key to remove clips, `P` to pin them, or `Enter` to paste) are disabled while the cursor is positioned within any text box (`textarea`, `input`, or editable). This completely solves the bug that deleted background clips when trying to delete letters in the editing window.
- **Search Exception**: The search bar retains smooth navigation with arrows (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`), blocking only character writing keys.
- **AI HTML Sanitization**: Automatic cleaning of code and HTML tags (`strip_html_tags`) in queries sent to the AI model has been implemented.
- **Readable Responses**: Translations and explanations of copied browser text are displayed in clean and readable text immediately, significantly optimizing token usage.
- **Cyber Edge and Glow**: The AI results panel now features a blurred semi-transparent edge with a neon glow effect and a 2px top accent line with a cyan-purple gradient.
- **Custom Scroll Bars**: Integration of minimalist and transparent scroll bars (`custom-scrollbar`) in containers with scroll in Settings and AI.
- **Escape Control**: Modals now capture the `Escape` key in isolation, closing only the floating window instead of completely hiding the CyberPaste application.
- **Localization Correction**: The correct translation for "Grammar Check" has been linked in all language locales, replacing the raw internal key that was displayed.

### 🇪🇸 Español

- **Guardián de enfoque de escritura**: Los atajos globales (como `Delete` para borrar clips, `P` para fijarlos o `Enter` para pegar) se desactivan mientras el cursor está dentro de cualquier cuadro de texto (`textarea`, `input` o editable). Esto resuelve por completo el bug que borraba clips en segundo plano al intentar borrar letras en la ventana de edición.
- **Excepción de búsqueda**: La barra de búsqueda conserva la navegación fluida con flechas (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`), bloqueando solo las teclas de escritura de caracteres.
- **Sanitización de HTML para la IA**: Implementada la limpieza automática de etiquetas de código y HTML (`strip_html_tags`) en las consultas enviadas al modelo de IA.
- **Respuestas legibles**: Las traducciones y explicaciones del texto copiado del navegador se muestran en texto limpio y legible al instante, optimizando notablemente el uso de tokens.
- **Borde y glow cyber**: El panel de resultados de IA luce ahora un borde semitransparente difuminado con efecto glow neón y una línea de acento superior de 2px con degradado cian-morado.
- **Scrollbars propios**: Integración de scrollbars minimalistas y transparentes (`custom-scrollbar`) en los contenedores con scroll de Ajustes e IA.
- **Control de Escape**: Los modales capturan ahora la tecla `Escape` de forma aislada, cerrando solo la ventana flotante en lugar de ocultar por completo la aplicación CyberPaste.
- **Corrección de localización**: La traducción correcta de "Grammar Check" (Revisión gramatical) queda enlazada en todos los idiomas, sustituyendo la clave interna cruda que se mostraba.
