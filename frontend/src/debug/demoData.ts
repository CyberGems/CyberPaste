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
        '✨ Welcome to CyberPaste! / ¡Bienvenido a CyberPaste!\n\nEssential shortcuts / Atajos esenciales:\n• Ctrl+Shift+V : Toggle window / Alternar ventana\n• Ctrl+M       : Full & Compact modes / Vista Completa o Compacta\n• Type...      : Instant search / Búsqueda instantánea\n• Enter        : Paste selected clip / Pegar clip seleccionado\n• Ctrl+Enter   : Copy as plain text / Copiar como texto plano\n• P            : Pin or unpin clip / Fijar o desfijar clip\n• Del          : Delete clip / Eliminar clip\n• PgUp/PgDn    : Page navigation / Navegar por páginas\n• Home/End     : First & Last clip / Primer / Último clip\n\n# 💎 CyberPaste — Limitless Productivity\n\n- ⚡ **Ultra-fast**: Native Rust engine + local SQLite\n- 🔒 **100% Private**: Your data never leaves your device\n- 📁 **Folders**: Organize clips via drag & drop or menus\n- 👁️ **Peek Popover**: Hover in compact mode to preview\n- 🤖 **AI Actions**: Summarize, translate or analyze code locally',
      preview: '✨ Welcome to CyberPaste! / ¡Bienvenido a CyberPaste! — Limitless Productivity',
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
      metadata: JSON.stringify({ size_bytes: 196608, width: 400, height: 240 }),
      image_path: null,
    },
    {
      id: 'demo-3',
      clip_type: 'code',
      content: `// 🚀 CyberPaste: The Ultimate Clipboard Manager\nexport interface ClipboardClip {\n  id: string;\n  type: 'text' | 'image' | 'code' | 'url';\n  content: string;\n  isPinned: boolean;\n  createdAt: Date;\n}`,
      preview: '// 🚀 CyberPaste: The Ultimate Clipboard Manager',
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
      id: 'demo-8',
      clip_type: 'code',
      content: `{\n  "app": "CyberPaste",\n  "version": "1.17.0",\n  "theme": "cyberpaste",\n  "storage": "sqlite_local",\n  "offline_first": true\n}`,
      preview: '{\n  "app": "CyberPaste",\n  "version": "1.17.0"...',
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
  ].map((clip) => ({
    ...clip,
    content_length: clip.clip_type === 'image' ? 0 : clip.content.length,
  })) as ClipboardItem[];
}
