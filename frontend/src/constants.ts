export const FOLDER_ICONS = {
  cyber: [
    { id: 'Zap', color: '#f87171' }, // Red
    { id: 'Flame', color: '#fb923c' }, // Orange
    { id: 'Star', color: '#fbbf24' }, // Amber
    { id: 'Leaf', color: '#4ade80' }, // Green
    { id: 'Droplets', color: '#2dd4bf' }, // Teal
    { id: 'Cloud', color: '#22d3ee' }, // Cyan
    { id: 'Moon', color: '#818cf8' }, // Indigo
    { id: 'Music', color: '#f472b6' }, // Pink
    { id: 'Shield', color: '#38bdf8' }, // Sky
    { id: 'Cpu', color: '#4ade80' },
    { id: 'Database', color: '#fb923c' },
    { id: 'Globe', color: '#60a5fa' },
    { id: 'Lock', color: '#f87171' },
    { id: 'Terminal', color: '#a78bfa' },
    { id: 'Code', color: '#2dd4bf' },
    { id: 'Command', color: '#94a3b8' },
    { id: 'Compass', color: '#fbbf24' },
    { id: 'HardDrive', color: '#4ade80' },
    { id: 'Ghost', color: '#c084fc' },
    { id: 'Activity', color: '#2dd4bf' },
  ],
  mono: [
    'Folder',
    'FolderHeart',
    'FolderStar',
    'FolderCode',
    'FolderLock',
    'Archive',
    'Briefcase',
    'Bookmark',
    'Tag',
    'Inbox',
    'Layers',
    'Layout',
    'Library',
    'Package',
    'Paperclip',
    'Puzzle',
    'Settings',
    'Share2',
    'Smile',
    'Sun',
  ],
};

export const LAYOUT = {
  WINDOW_HEIGHT: 500,
  COMPACT_WIDTH: 550,
  COMPACT_HEIGHT: 350,
  FULL_HEIGHT: 320,
  CONTROL_BAR_HEIGHT: 76,
  CARD_WIDTH: 230,
  CARD_GAP: 12,
  SIDE_PADDING: 16,
  CARD_VERTICAL_PADDING: 8,
  PADDING_OPACITY: 0.2,
  WINDOW_PADDING: 8,
  BLUR_AMOUNT: '8px',
};

export const CLIP_LIST_HEIGHT = LAYOUT.WINDOW_HEIGHT - LAYOUT.CONTROL_BAR_HEIGHT;
// Width of each virtual grid column cell = card width + gap between cards
export const COLUMN_WIDTH = LAYOUT.CARD_WIDTH + LAYOUT.CARD_GAP;
export const PREVIEW_CHAR_LIMIT = 300;
