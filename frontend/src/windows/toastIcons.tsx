import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Image,
  Type,
  FileText,
  Code,
  FolderOpen,
  Link,
  Scissors,
} from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Clip-type icon for the toast. `accent` is the theme's accent colour, keeping
 * iconography in sync with the active theme (CyberPaste cyan, Dark cyan-ish,
 * Light Windows accent).
 */
export function getClipIcon(
  clipType?: string | null,
  toastType?: string,
  accent: string = '#00F2FF'
): ReactNode {
  const cls = 'h-5 w-5';
  const pink = '#FF00D0';

  if (toastType === 'cut') {
    return (
      <span style={{ color: pink }}>
        <Scissors className={cls} />
      </span>
    );
  }
  if (!clipType) {
    const Cmp =
      toastType === 'success' ? CheckCircle2 : toastType === 'error' ? AlertTriangle : Info;
    const color = toastType === 'error' ? pink : accent;
    return (
      <span style={{ color }}>
        <Cmp className={cls} />
      </span>
    );
  }
  let Cmp: typeof CheckCircle2;
  switch (clipType) {
    case 'welcome':
      Cmp = CheckCircle2;
      break;
    case 'image':
      Cmp = Image;
      break;
    case 'text':
      Cmp = Type;
      break;
    case 'code':
    case 'html':
      Cmp = Code;
      break;
    case 'rtf':
      Cmp = FileText;
      break;
    case 'file':
      Cmp = FolderOpen;
      break;
    case 'url':
      Cmp = Link;
      break;
    default:
      Cmp = CheckCircle2;
  }
  return (
    <span style={{ color: accent }}>
      <Cmp className={cls} />
    </span>
  );
}
