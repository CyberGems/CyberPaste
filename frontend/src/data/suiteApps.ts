export interface SuiteApp {
  slug: string;
  name: string;
  site: string;
  icon: string;
  short: {
    en: string;
    es: string;
  };
  tagline: {
    en: string;
    es: string;
  };
}

// Local catalog, adapted from CyberNotes' CyberGems suite recommendations.
// Keeping it in the bundle avoids network requests while rendering About/tray.
export const SUITE_APPS: SuiteApp[] = [
  {
    slug: 'cyberclock',
    name: 'CyberClock',
    site: 'https://cybergems.org/apps/cyberclock/',
    icon: '/suite/cyberclock.png',
    short: { en: 'Desktop Clock', es: 'Reloj de escritorio' },
    tagline: {
      en: 'Clock, calendar, timer, stopwatch, relaxation, and compact floating time tools for Windows.',
      es: 'Reloj, calendario, temporizador, cronómetro, relajación y herramientas flotantes compactas para Windows.',
    },
  },
  {
    slug: 'cyberfeeds',
    name: 'CyberFeeds',
    site: 'https://cybergems.org/apps/cyberfeeds/',
    icon: '/suite/cyberfeeds.png',
    short: { en: 'RSS Reader', es: 'Lector RSS' },
    tagline: {
      en: 'A local-first RSS and Atom reader built for speed, privacy and clean reading.',
      es: 'Un lector RSS y Atom local-first creado para la velocidad, la privacidad y la lectura limpia.',
    },
  },
  {
    slug: 'cyberlauncher',
    name: 'CyberLauncher',
    site: 'https://cybergems.org/apps/cyberlauncher/',
    icon: '/suite/cyberlauncher.png',
    short: { en: 'App Launcher', es: 'Lanzador de apps' },
    tagline: {
      en: 'Windows application launcher with hot corners, scheduler, system monitor, glassmorphic UI and integrated terminal.',
      es: 'Lanzador de aplicaciones con esquinas activas, programador, monitor del sistema, interfaz glassmórfica y terminal integrada.',
    },
  },
  {
    slug: 'cybermanager',
    name: 'CyberManager',
    site: 'https://cybergems.org/apps/cybermanager/',
    icon: '/suite/cybermanager.png',
    short: { en: 'Task Manager', es: 'Administrador de tareas' },
    tagline: {
      en: 'Lightweight, high-capacity virtualized task manager with instant search and compact mode.',
      es: 'Gestor de tareas ligero y virtualizado de alta capacidad, con búsqueda instantánea y modo compacto.',
    },
  },
  {
    slug: 'cybernotes',
    name: 'CyberNotes',
    site: 'https://cybergems.org/apps/cybernotes/',
    icon: '/suite/cybernotes.png',
    short: { en: 'Note Taking', es: 'Notas' },
    tagline: {
      en: 'Privacy-focused note-taking app with rich text, folders, tabs and floating notes.',
      es: 'App de notas centrada en la privacidad con texto enriquecido, carpetas, pestañas y notas flotantes.',
    },
  },
  {
    slug: 'cyberpaste',
    name: 'CyberPaste',
    site: 'https://cybergems.org/apps/cyberpaste/',
    icon: '/suite/cyberpaste.png',
    short: { en: 'Clipboard Manager', es: 'Portapapeles' },
    tagline: {
      en: 'Recall anything you have ever copied: text, code, images and files, 100% local.',
      es: 'Recupera todo lo que hayas copiado: texto, código, imágenes y archivos, 100% local.',
    },
  },
  {
    slug: 'cybersnap',
    name: 'CyberSnap',
    site: 'https://cybergems.org/apps/cybersnap/',
    icon: '/suite/cybersnap.png',
    short: { en: 'Screen Capture', es: 'Captura de pantalla' },
    tagline: {
      en: 'Screen capture and annotation suite with vector tools, high-speed OCR, screen recording and color picker.',
      es: 'Suite de captura y anotación con herramientas vectoriales, OCR de alta velocidad, grabación de pantalla y selector de color.',
    },
  },
  {
    slug: 'cybertray',
    name: 'CyberTray',
    site: 'https://cybergems.org/apps/cybertray/',
    icon: '/suite/cybertray.png',
    short: { en: 'Shortcut Manager', es: 'Accesos directos' },
    tagline: {
      en: 'High-performance tray launcher with hotspots, system monitoring, process manager and PIN-protected file vault.',
      es: 'Lanzador en bandeja de alto rendimiento con zonas activas, monitor del sistema, gestor de procesos y bóveda con PIN.',
    },
  },
  {
    slug: 'cyberviewer',
    name: 'CyberViewer',
    site: 'https://cybergems.org/apps/cyberviewer/',
    icon: '/suite/cyberviewer.png',
    short: { en: 'Image Viewer', es: 'Visor de imágenes' },
    tagline: {
      en: 'A fast, lightweight image viewer with the essential editing tools built in.',
      es: 'Un visor de imágenes rápido y ligero con las herramientas de edición esenciales integradas.',
    },
  },
  {
    slug: 'cyberwall',
    name: 'CyberWall',
    site: 'https://cybergems.org/apps/cyberwall/',
    icon: '/suite/cyberwall.png',
    short: { en: 'Firewall', es: 'Firewall' },
    tagline: {
      en: 'A per-application firewall powered by the WFP kernel engine. Default deny, real-time prompts.',
      es: 'Un firewall por aplicación impulsado por el motor kernel WFP. Denegación por defecto, avisos en tiempo real.',
    },
  },
];

export const RECOMMENDED_SUITE_APPS = SUITE_APPS.filter((app) => app.slug !== 'cyberpaste');

export function suiteLanguage(language?: string): 'en' | 'es' {
  return language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function suiteInitial(name: string): string {
  return name.replace(/^Cyber/, '').slice(0, 1) || name.slice(0, 1);
}
