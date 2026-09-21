import { invoke } from '@tauri-apps/api/core';

export async function exportClip(
  clipId: string,
  dialogTitle: string,
  suggestedFileName?: string
): Promise<string> {
  return invoke<string>('export_clip', {
    clipId,
    dialogTitle,
    suggestedFileName: suggestedFileName ?? null,
  });
}

export async function saveTextToFile(
  content: string,
  dialogTitle: string,
  suggestedFileName: string
): Promise<string> {
  return invoke<string>('save_text_to_file', {
    content,
    dialogTitle,
    suggestedFileName,
  });
}

export function isExportCancelled(error: unknown): boolean {
  const message = typeof error === 'string' ? error : String(error);
  return message.includes('Export cancelled');
}
