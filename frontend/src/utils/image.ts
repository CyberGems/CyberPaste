import { convertFileSrc } from '@tauri-apps/api/core';

export function resolveImageSrc(content: string): string {
  if (!content) return '';
  const isAbsolutePath = content.startsWith('/') || /^[A-Za-z]:[\\/]/.test(content);
  if (
    content.startsWith('data:') ||
    content.startsWith('http://') ||
    content.startsWith('https://') ||
    content.startsWith('asset:') ||
    content.startsWith('tauri://')
  ) {
    return content;
  }
  if (isAbsolutePath) {
    return convertFileSrc(content);
  }
  return `data:image/png;base64,${content}`;
}
