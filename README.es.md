<p align="center">
  <a href="./README.md">English</a> · Español
</p>

<p align="center">
  <a href="https://cybergems.org/apps/cyberpaste/">
    <img src="https://cybergems.org/banners/es/cyberpaste.png" alt="CyberPaste: recupera texto, código, imágenes y archivos con un historial de portapapeles privado y local" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/CyberGems/CyberPaste/releases/latest"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FCyberGems%2FCyberPaste%2Fmain%2Fpackage.json&query=%24.version&prefix=%20Descargar%20CyberPaste%20v&suffix=%20&style=for-the-badge&label=&labelColor=0891B2&color=0891B2" alt="Descargar la última versión" /><img src="https://img.shields.io/badge/Windows_10%2F11_(64--bit)-2563EB?style=for-the-badge" alt="Windows 10/11 (64 bits)" /></a>
  &nbsp;<a href="https://github.com/CyberGems/CyberPaste/releases"><img src="https://img.shields.io/badge/Todas_las_versiones-30363D?style=for-the-badge&logo=github&logoColor=white" alt="Todas las versiones" /><img src="https://img.shields.io/badge/Notas_de_la_versi%C3%B3n-475569?style=for-the-badge" alt="Notas de la versión" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Licencia-GPL--3.0-1F2428.svg?style=flat-square&color=334155" alt="Licencia" />&nbsp;
  <img src="https://img.shields.io/badge/Plataforma-Windows_10%2F11-1F2428.svg?style=flat-square&color=334155" alt="Plataforma" />&nbsp;
  <img src="https://img.shields.io/badge/Tauri-2.x-1F2428.svg?style=flat-square&logo=tauri&logoColor=white&color=334155" alt="Tauri" />&nbsp;
  <a href="https://github.com/CyberGems/CyberPaste/wiki"><img src="https://img.shields.io/badge/Wiki-Documentaci%C3%B3n-1F2428?style=flat-square&logo=gitbook&logoColor=white&color=334155" alt="Wiki" /></a>
</p>

---

## ¿Qué es CyberPaste?

CyberPaste es un elegante **gestor de historial de portapapeles** centrado en la privacidad para Windows que hace que todo lo que copias sea fácil de encontrar y reutilizar. Almacena texto, código, imágenes, archivos, enlaces, HTML y RTF en una base de datos SQLite local, con búsqueda instantánea, carpetas, favoritos, anclaje, edición, OCR y acciones de pegado directo. Las herramientas de IA opcionales pueden resumir o transformar el contenido seleccionado, mientras que las copias de seguridad automáticas, la retención configurable, los logros y un bloqueo con PIN o contraseña mantienen la experiencia práctica y personal. Construido con **Tauri 2** y **React**.

*Gratuito y de código abierto (GPLv3): sin anuncios, sin analíticas de red, sin telemetría y sin recogida en la nube. Los logros y el progreso opcionales se quedan en tu equipo.*

---

## 📋 ¿Por qué CyberPaste?

La mayoría de los gestores de portapapeles envían tus datos a la nube o son demasiado básicos para ser útiles. CyberPaste te da **lo mejor de ambos mundos**: soporte de contenido enriquecido, asistencia de IA opcional y una privacidad local-first robusta, todo en una app Tauri ligera con una estética moderna y neón. Tu historial de portapapeles se queda en tu máquina salvo que elijas un proveedor de IA o exportes una copia de seguridad.

| Necesidad | Solución |
|---|---|
| Recupera cualquier cosa que hayas copiado | Historial completo del portapapeles con búsqueda instantánea y filtros por tipo |
| Mantén los datos sensibles privados | Solo SQLite local, cero analíticas de red, cero telemetría, sin sincronización en la nube |
| Trabaja con contenido enriquecido | Texto, código (con resaltado de sintaxis), imágenes (con OCR), HTML, RTF, archivos, URLs |
| Procesa clips con IA | Resume, traduce, explica código, corrige gramática; funciona con cualquier proveedor compatible con OpenAI |
| Mantente organizado | Carpetas, favoritos, gestión por lotes, dos modos de vista |
| Accede desde cualquier lugar | Atajo global, compatible con múltiples monitores, inyección de pegado automático |

---

## ✨ Funciones principales

### 📋 Motor del portapapeles
- **Soporte de contenido enriquecido**: captura automáticamente texto con formato, código (con resaltado de sintaxis e insignias de lenguaje), HTML, RTF, imágenes (con visor de alta resolución y extracción de texto por OCR), URLs y archivos
- **Monitorización inteligente**: detecta las operaciones de cortar (Ctrl+X, Mayús+Supr) mediante ganchos globales de teclado y suprime los eventos duplicados
- **Búsqueda instantánea**: búsqueda de texto completo en tiempo real con filtros rápidos (Texto, Código, Imágenes, Enlaces, Archivos) y contadores de la base de datos en vivo

### 🗂️ Organización
- **Carpetas**: organiza los clips en carpetas personalizadas con arrastrar y soltar y auto-desplazamiento en los bordes
- **Favoritos y anclaje**: fija los clips de uso frecuente para que permanezcan arriba
- **Gestión por lotes**: `Ctrl+Clic` / `Mayús+Clic` para selección múltiple y `Ctrl+A` para seleccionar todos los clips visibles
- **Dos modos de vista**: Modo Completo (cuadrícula multicolumna con zoom) o Modo Compacto (lista de alta densidad con vista previa al pasar el cursor)

### 🤖 Acciones de IA
- **Acciones inteligentes**: resume, traduce, explica código o corrige gramática
- **Soporte de proveedores**: OpenAI, DeepSeek, Kimi, Gemini, Grok y Meta, además de cualquier endpoint personalizado compatible con OpenAI como Ollama, Groq u OpenRouter
- **Totalmente personalizable**: prompts y nombres de acción personalizados para cada operación de IA

### 🔔 Notificaciones y retroalimentación
- **Avisos HUD inteligentes**: notificaciones en la esquina con barras de cuenta regresiva, detección de duplicados y detección de operaciones de cortar
- **Efectos de sonido**: efectos sintetizados o personalizados para la captura del portapapeles, los duplicados y la activación

### 🔒 Privacidad y seguridad
- **100 % local-first**: almacenamiento SQLite en modo WAL con índices rápidos. Sin analíticas de red ni telemetría. Los logros y el progreso opcionales permanecen en local
- **Bloqueo de la app opcional**: oculta la interfaz detrás de un PIN o contraseña, con clave de recuperación, bloqueo al ocultar y bloqueo de sesión de Windows. Protege la interfaz; no cifra los datos del portapapeles en disco
- **Copias de seguridad automáticas**: crea una copia JSON al día mientras CyberPaste está en ejecución, elige la carpeta y la retención, o crea copias bajo demanda
- **Logros y progreso**: hitos locales opcionales para el uso a largo plazo, incluidos en las copias manuales y automáticas. Consulta [la guía de logros](docs/ACHIEVEMENTS.md)
- **Excepciones de privacidad**: ignora apps sensibles (gestores de contraseñas, herramientas bancarias) por nombre de proceso o por ruta completa del ejecutable

### 🖥️ Integración con escritorio
- **Atajo global**: alterna la ventana del portapapeles (predeterminado: `Ctrl+Shift+V`)
- **Consciente de múltiples pantallas**: se abre automáticamente en el monitor activo según la posición del cursor
- **Ecosistema de ventanas modulares**: ventanas optimizadas y separadas para el Portapapeles principal, el menú de la bandeja del sistema, Configuración con varias pestañas, el Visor de imágenes y OCR, y las notificaciones emergentes
- **Inyección de pegado automático**: pega los clips seleccionados directamente en la aplicación activa

### 🎨 Personalización
- **4 opciones de tema:** CyberPaste, Oscuro, Claro y Sistema (sigue a Windows)
- **Efectos Mica**: vibrancias nativas de Windows Mica y Mica-Alt con radios de esquina personalizados
- **6 idiomas + automático**: inglés, español, alemán, francés, japonés y chino, con detección automática del idioma del sistema. Las traducciones de alemán, francés, japonés y chino están en proceso de actualización
---

## 🚀 Primeros pasos

### Instalación (recomendada)

1. Descarga el instalador más reciente o la build portable desde [GitHub Releases](https://github.com/CyberGems/CyberPaste/releases)
2. Ejecuta el instalador o el ejecutable portable
3. Inicia CyberPaste. No necesitas ningún otro requisito: **no** necesitas Node.js ni Rust

> **WinGet:** se tiene previsto darle soporte, pero `CyberGems.CyberPaste` aún no se ha publicado en la fuente comunitaria oficial de WinGet. El comando `winget install CyberGems.CyberPaste` aún no está disponible.

### 🛡️ Windows SmartScreen

Windows puede mostrar un aviso de SmartScreen la primera vez que ejecutas el instalador de CyberPaste: esta es una app de hobby sin firmar, así que Windows aún no ha construido reputación para el archivo. Esto es esperado; el código fuente es público para que puedas inspeccionar exactamente qué hace. Lo mismo puede ocurrir al lanzar la versión portable.

Para continuar:

<details>
<summary><strong>Cómo ejecutar el instalador (paso a paso)</strong></summary>

Windows muestra este aviso para cualquier instalador sin un certificado de firma de código de pago; no significa que el archivo sea inseguro. No hagas clic en "No ejecutar":

1. Ejecuta el instalador. Windows puede mostrar el diálogo azul "Windows protegió tu PC".

![Aviso de Windows SmartScreen](https://cybergems.org/branding/smartscreen-warning.svg)

2. Haz clic en el pequeño enlace **Más información**.

![Diálogo de SmartScreen tras Más información](https://cybergems.org/branding/smartscreen-runanyway.svg)

3. Haz clic en **Ejecutar de todos modos**. El instalador arranca con normalidad.

Puedes verificar el archivo de forma independiente: compara el SHA con el release de GitHub, escanéalo en VirusTotal o compila desde el código fuente. Más detalles: [guía de SmartScreen en el sitio web](https://cybergems.org/download#smartscreen).

</details>
---

## 🛠️ Stack tecnológico y arquitectura

- **Plataforma:** Windows 10 / 11
- **Backend:** Rust + Tauri 2.x
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Base de datos:** SQLite (modo WAL)
- **Gestor de paquetes:** npm

```
CyberPaste/
├── src-tauri/               Backend en Rust y configuración de Tauri
│   ├── src/
│   │   ├── main.rs          Punto de entrada
│   │   ├── lib.rs           Inicialización de la app, atajos y gestores de ventana
│   │   ├── commands.rs      Manejadores de comandos IPC y avisos
│   │   ├── clipboard.rs     Monitorización del portapapeles y motor de captura
│   │   ├── database.rs      Esquema SQLite y persistencia
│   │   ├── models.rs        Estructuras de datos y definiciones de configuración
│   │   ├── ai.rs            Integración de IA (API compatible con OpenAI)
│   │   ├── highlight.rs     Resaltado de sintaxis
│   │   ├── ocr.rs           Extracción de texto por OCR
│   │   └── settings_manager.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── frontend/                Frontend React + TypeScript
│   ├── src/
│   │   ├── components/      Componentes de UI (ClipCard, ClipList, ControlBar, Modales)
│   │   ├── windows/         Vistas de ventana dedicadas (Toast, Viewer, About, TrayMenu)
│   │   ├── hooks/           Custom hooks de React (tema, idioma, teclado)
│   │   ├── i18n/            Internacionalización (6 idiomas + detección automática)
│   │   ├── types/           Definiciones TypeScript
│   │   ├── utils/           Utilidades auxiliares
│   │   └── App.tsx          Aplicación de la ventana principal
│   └── package.json
└── README.md
```

### Compilar desde el código fuente (desarrolladores)

Solo necesario si quieres modificar CyberPaste o compilarlo tú mismo; los usuarios normales pueden omitir esta sección.

#### Desarrollo

**Requisitos previos:** Node.js 18+, Rust 1.77+, npm

```bash
npm install
npm run tauri dev
```

#### Compilación

```bash
npm run tauri build
```
---

## ⌨️ Atajos de teclado

### Global

| Tecla | Acción |
|---|---|
| `Ctrl+Shift+V` | Alternar la ventana del portapapeles (personalizable) |
| `Ctrl+M` | Alternar el modo de vista Completo / Compacto (personalizable) |

### Navegación

| Tecla | Acción |
|---|---|
| `↑` `↓` | Navegar por los clips (dirección de la lista) |
| `←` `→` | Moverse entre tarjetas (Modo Completo) o cambiar de carpeta (Modo Compacto) |
| `Ctrl+←` / `Ctrl+→` | Cambiar de carpeta (Modo Completo) |
| `Intro` | Pegar el clip seleccionado (con inyección de pegado automático) |
| `Ctrl+Intro` | Copiar el clip seleccionado como texto plano (sin pegar) |
| `Mayús+Intro` | Abrir la vista previa a pantalla completa del clip seleccionado |
| `RePág` / `AvPág` / `Inicio` / `Fin` | Navegación extendida con auto-desplazamiento |

### Acciones

| Tecla | Acción |
|---|---|
| `Espacio` | Abrir el menú de acciones del clip seleccionado (flechas + Intro para elegir) |
| `I` | Alternar el panel de detalle del clip |
| `Ctrl+P` | Fijar / desfijar el elemento seleccionado |
| `Ctrl+Z` | Deshacer el borrado |
| `Ctrl+F` | Enfocar el campo de búsqueda |
| `Ctrl+A` | Seleccionar todos los clips visibles (modo por lotes) |
| `Ctrl+1` … `Ctrl+9` | Pegar directamente el clip n.º N (Modo Compacto) |
| `Mayús+F10` / tecla Menú contextual | Abrir el menú contextual del clip seleccionado |
| `Supr` | Eliminar el elemento seleccionado |
| `Escape` | Limpiar la búsqueda / cerrar la ventana o el modal |
| `Ctrl+Rueda` | Ajustar el zoom de la cuadrícula en el Modo Completo (0,6x – 1,75x) |

### Editor

| Tecla | Acción |
|---|---|
| `Tab` | Insertar 2 espacios |
| `Ctrl+S` / `Ctrl+Intro` | Guardar |
| `Escape` | Cancelar |

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Abre un issue describiendo el cambio antes de empezar trabajos grandes y envía pull requests contra la rama principal.

## 🙏 Agradecimientos

Originalmente hace un fork de [PastePaw](https://github.com/XueshiQiao/PastePaw) de [XueshiQiao](https://github.com/XueshiQiao). Desde entonces, CyberPaste ha sido reescrito y ampliado extensamente por [CyberGems](https://cybergems.org/).

Este proyecto también se construye sobre componentes de código abierto como Tauri, React, SQLite y Rust, gracias a sus autores y mantenedores.

---

## ❤️ Donar

Tras incontables horas construyendo y perfeccionando **CyberPaste** para mi propio uso, decidí recientemente compartirlo con el mundo junto a mis otras herramientas de código abierto en [CyberGems](https://github.com/CyberGems#-all-apps--repositories).

Si te gustaría apoyar las futuras actualizaciones, te lo agradecería de verdad. Tu donación ayuda a mantener el desarrollo, lanzar nuevas funciones, acelerar la resolución de actualizaciones y errores, y mejorar la calidad de la documentación. También puedes mostrar tu apoyo [poniendo una estrella al repo en GitHub](https://github.com/CyberGems/CyberPaste). ¡Gracias! 🙏

<p align="center">
  <a href="https://www.paypal.com/donate/?hosted_button_id=M4PY3UPJA5Y6Q"><img src="https://img.shields.io/badge/Donar-PayPal-0070BA?style=for-the-badge&logo=paypal" alt="Donar con PayPal" /></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/cybergems"><img src="https://img.shields.io/badge/Apóyame_en_Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Apóyame en Ko-fi" /></a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/cybergems"><img src="https://img.shields.io/badge/Invítame_a_un_café-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Invítame a un café" /></a>
</p>

<div align="center">

<details>
<summary><b>Donaciones cripto (BTC, ETH, USDT, LTC): haz clic para ver las direcciones</b></summary>

| Activo | Dirección | QR |
|---|---|---|
| **BTC** | <pre><code>bc1q5mxzz05nmvsheqzx7970euswta3fksxzcfzag4</code></pre> | <img src="docs/donate/qr-btc.png" width="90" height="90" alt="QR de BTC" /> |
| **ETH** | <pre><code>0x79b703Ec0f77493679Fcd280aF3b983E20c580B8</code></pre> | <img src="docs/donate/qr-eth.png" width="90" height="90" alt="QR de ETH" /> |
| **USDT (ERC20 / BEP20)** | <pre><code>0x79b703Ec0f77493679Fcd280aF3b983E20c580B8</code></pre> | <img src="docs/donate/qr-eth.png" width="90" height="90" alt="QR de USDT" /> |
| **USDT (TRC20)** | <pre><code>TSVbSk1HSyZ1NprCnAYiw56ECwXgH887mD</code></pre> | <img src="docs/donate/qr-usdt-tron.png" width="90" height="90" alt="QR de USDT TRC20" /> |
| **LTC** | <pre><code>LWGnEHgcFCE2BRkzLnsdPDD8Y8ZeDK577X</code></pre> | <img src="docs/donate/qr-ltc.png" width="90" height="90" alt="QR de LTC" /> |

> ⚠️ Envía solo el activo seleccionado en la red indicada. Usar la red incorrecta provocará la pérdida permanente de fondos.

</details>

</div>
---

## 📄 Licencia

CyberPaste se distribuye bajo los términos de la Licencia Pública General GNU v3.0. Consulta [LICENSE](LICENSE) para el texto completo de la licencia.

Copyright (C) 2026 CyberGems

---

## ❓ Preguntas frecuentes

Para preguntas frecuentes, guías de solución de problemas e instrucciones detalladas de configuración, visita las [Preguntas frecuentes](https://github.com/CyberGems/CyberPaste/wiki/FAQ) o la [documentación en línea](https://cybergems.org/docs/cyberpaste/FAQ).

---

<div align="center" style="background:#0D0F17; border:1px solid rgba(0,255,255,0.12); border-radius:12px; padding:28px 20px; margin-top:32px;">

### ¡Gracias por usar CyberPaste! 🎉

Creado por [**CyberGems**](https://cybergems.org)

</div>
<p align="center">
  <a href="https://www.reddit.com/submit?url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcyberpaste%2F&title=CyberPaste%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows"><img src="https://img.shields.io/badge/Compartir_en_Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Compartir en Reddit" /></a>
  &nbsp;<a href="https://twitter.com/intent/tweet?text=CyberPaste%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows&url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcyberpaste%2F"><img src="https://img.shields.io/badge/Compartir_en_X-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="Compartir en X" /></a>
  &nbsp;<a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcybergems.org%2Fapps%2Fcyberpaste%2F"><img src="https://img.shields.io/badge/Compartir_en_Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Compartir en Facebook" /></a>
  &nbsp;<a href="mailto:?subject=CyberPaste%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows&body=CyberPaste%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows%20https%3A%2F%2Fcybergems.org%2Fapps%2Fcyberpaste%2F"><img src="https://img.shields.io/badge/Compartir_por_Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Compartir por correo" /></a>
  &nbsp;<a href="https://t.me/share/url?url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcyberpaste%2F&text=CyberPaste%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows"><img src="https://img.shields.io/badge/Compartir_en_Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Compartir en Telegram" /></a>
  &nbsp;<a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcyberpaste%2F"><img src="https://img.shields.io/badge/Compartir_en_LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="Compartir en LinkedIn" /></a>
</p>

---

## 🔗 Ver también

Más aplicaciones gratuitas, de código abierto y con la privacidad primero de [**CyberGems**](https://github.com/CyberGems):

| App | Descripción |
|:---:|---|
| 🕐&nbsp;[**CyberClock**](https://github.com/CyberGems/CyberClock#readme) | Reloj de escritorio con analógico y digital, calendario, temporizador, cronómetro y módulo de relajación. |
| 📢&nbsp;[**CyberFeeds**](https://github.com/CyberGems/CyberFeeds#readme) | Lector RSS y Atom de alto rendimiento y local-first, creado para la velocidad, la privacidad y la lectura limpia. |
| 🚀&nbsp;[**CyberLauncher**](https://github.com/CyberGems/CyberLauncher#readme) | Lanzador de aplicaciones de Windows con esquinas calientes, programador, monitor de sistema y terminal integrada. |
| 💻&nbsp;[**CyberManager**](https://github.com/CyberGems/CyberManager#readme) | Gestor de tareas ligero y de alto rendimiento, virtualizado y nativo de NT, una potente alternativa al Administrador de Tareas. |
| 📝&nbsp;[**CyberNotes**](https://github.com/CyberGems/CyberNotes#readme) | App de notas centrada en la privacidad con texto enriquecido, carpetas, pestañas y almacenamiento local protegido con bcrypt. |
| 📸&nbsp;[**CyberSnap**](https://github.com/CyberGems/CyberSnap#readme) | Suite de captura y anotación de pantalla con herramientas vectoriales, OCR de alta velocidad, grabación de pantalla y selector de color. |
| ⭐&nbsp;[**CyberTray**](https://github.com/CyberGems/CyberTray#readme) | Lanzador de bandeja de alto rendimiento con hotspots, monitoreo de sistema, gestor de procesos y bóveda de archivos protegida con PIN. |
| 💫&nbsp;[**CyberViewer**](https://github.com/CyberGems/CyberViewer#readme) | Visor y editor de imágenes completo diseñado para usuarios casuales y avanzados. |
| 🛡️&nbsp;[**CyberWall**](https://github.com/CyberGems/CyberWall#readme) | Cortafuegos de Windows fácil de usar con reglas por aplicación en tiempo real gracias al motor kernel WFP. |

➡️ **[Todas las aplicaciones en cybergems.org](https://cybergems.org)**