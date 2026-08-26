import { ClipboardItem } from '../types';

function generateImage(label: string, color1: string, color2: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 240;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 400, 240);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 240);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(320, 60, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 200, 125);

  return canvas.toDataURL('image/png');
}

export function generateDemoClips(): ClipboardItem[] {
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

  return [
    {
      id: 'demo-1',
      clip_type: 'text',
      content:
        '✨ ¡Bienvenido a CyberPaste! / Welcome to CyberPaste!\n\nAtajos de teclado esenciales / Essential shortcuts:\n• Ctrl+Shift+V : Alternar ventana / Toggle window\n• Ctrl+M       : Vista Completa o Compacta / Full & Compact modes\n• Escribe...   : Búsqueda instantánea / Type to search\n• Enter        : Pegar clip seleccionado / Paste selected\n• Ctrl+Enter   : Copiar como texto plano / Copy plain text\n• P            : Fijar o desfijar clip / Pin or unpin\n• Supr         : Eliminar clip / Delete clip\n• RePág/AvPág  : Navegar por páginas / Page navigation\n• Inicio/Fin   : Primer / Último clip / First & Last clip',
      preview: '✨ ¡Bienvenido a CyberPaste! / Welcome to CyberPaste!',
      folder_id: null,
      created_at: ago(1),
      source_app: 'CyberPaste.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-2',
      clip_type: 'image',
      content: generateImage('CyberPaste — CyberNeon UI', '#0f172a', '#0891b2'),
      preview: '',
      folder_id: null,
      created_at: ago(3),
      source_app: 'Figma.exe',
      source_icon: null,
      metadata: JSON.stringify({ size_bytes: 196608 }),
      image_path: null,
    },
    {
      id: 'demo-3',
      clip_type: 'text',
      content:
        '🎨 Paleta CyberNeon (Detección de colores):\n#00f2fe  Cyan Glow\n#4facfe  Electric Blue\n#a855f7  Neon Purple\n#ec4899  Cyber Pink\n#10b981  Emerald Bright',
      preview: '🎨 Paleta CyberNeon: #00f2fe #4facfe #a855f7 #ec4899 #10b981',
      folder_id: null,
      created_at: ago(5),
      source_app: 'Figma.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-4',
      clip_type: 'code',
      content: `// 🚀 CyberPaste: Modern Clipboard Manager\nexport interface ClipboardClip {\n  id: string;\n  type: 'text' | 'image' | 'code' | 'url';\n  content: string;\n  isPinned: boolean;\n  createdAt: Date;\n}`,
      preview: '// 🚀 CyberPaste: Modern Clipboard Manager',
      folder_id: null,
      created_at: ago(8),
      source_app: 'Code.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-5',
      clip_type: 'url',
      content: 'https://github.com/CyberGems/CyberPaste',
      preview: 'https://github.com/CyberGems/CyberPaste',
      folder_id: null,
      created_at: ago(12),
      source_app: 'chrome.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-6',
      clip_type: 'text',
      content: `# 💎 CyberPaste — Productividad sin límites\n\n- ⚡ **Ultra-rápido**: Motor nativo en Rust + SQLite local\n- 🔒 **100% Privado**: Tus datos nunca salen de tu equipo\n- 📁 **Carpetas**: Organiza clips arrastrando o con menús\n- 👁️ **Peek Popover**: Pasa el cursor en modo compacto para previsualizar\n- 🤖 **Acciones IA**: Resume, traduce o analiza código localmente`,
      preview: '# 💎 CyberPaste — Productividad sin límites',
      folder_id: null,
      created_at: ago(15),
      source_app: 'Obsidian.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-7',
      clip_type: 'image',
      content: generateImage('CyberPaste — Compact Peek View', '#1e1b4b', '#4338ca'),
      preview: '',
      folder_id: null,
      created_at: ago(20),
      source_app: 'Photoshop.exe',
      source_icon: null,
      metadata: JSON.stringify({ size_bytes: 224000 }),
      image_path: null,
    },
    {
      id: 'demo-8',
      clip_type: 'code',
      content: `{\n  "app": "CyberPaste",\n  "version": "1.14.0",\n  "theme": "cyberpaste",\n  "storage": "sqlite_local",\n  "offline_first": true\n}`,
      preview: '{\n  "app": "CyberPaste",\n  "version": "1.14.0"...',
      folder_id: null,
      created_at: ago(25),
      source_app: 'Code.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-9',
      clip_type: 'code',
      content: `# CyberPaste: Modern & Lightweight Clipboard Tool\nnpm run dev\ncargo tauri dev`,
      preview: '# CyberPaste: Modern & Lightweight Clipboard Tool',
      folder_id: null,
      created_at: ago(30),
      source_app: 'WindowsTerminal.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
    {
      id: 'demo-10',
      clip_type: 'text',
      content:
        'All clipboard data is stored locally in a SQLite database on your machine. CyberPaste never uploads your data to any remote server.',
      preview: 'All clipboard data is stored locally in a SQLite database on your machine...',
      folder_id: null,
      created_at: ago(35),
      source_app: 'chrome.exe',
      source_icon: null,
      metadata: null,
      image_path: null,
    },
  ].map((clip) => ({
    ...clip,
    content_length: clip.clip_type === 'image' ? 0 : clip.content.length,
  })) as ClipboardItem[];
}
