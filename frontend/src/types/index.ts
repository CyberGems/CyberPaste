export interface ClipboardItem {
  id: string;
  clip_type: string;
  content: string;
  preview: string;
  content_length: number;
  folder_id: string | null;
  created_at: string;
  source_app: string | null;
  source_icon: string | null;
  metadata: string | null;
  image_path: string | null;
  sort_order?: number;
  is_pinned?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  item_count: number;
}

export interface Settings {
  max_items: number;
  auto_delete_days: number;
  startup_with_windows: boolean;
  show_in_taskbar: boolean;
  hotkey: string;
  view_mode_hotkey?: string;
  theme: string;
  language?: string;
  mica_effect?: string;
  round_corners?: boolean;
  float_above_taskbar?: boolean;
  view_mode?: 'full' | 'compact';
  scroll_direction?: 'horizontal' | 'vertical';
  compact_folder_layout?: 'horizontal' | 'vertical';
  compact_sidebar_collapsed?: boolean;
  clipboard_sound_enabled?: boolean;
  clipboard_sound_path?: string;
  auto_inject_paste?: boolean;
  pinned?: boolean;
  auto_paste: boolean;
  ignore_ghost_clips: boolean;
  reset_view_on_paste?: boolean;
  image_editor_path?: string;
  window_width?: number;
  window_height?: number;
  ai_provider?: string;
  ai_api_key?: string;
  ai_model?: string;
  ai_base_url?: string;
  ai_prompt_summarize?: string;
  ai_prompt_translate?: string;
  ai_prompt_explain_code?: string;
  ai_prompt_fix_grammar?: string;
  ai_title_summarize?: string;
  ai_title_translate?: string;
  ai_title_explain_code?: string;
  ai_title_fix_grammar?: string;
  toast_position?: string;
  toast_duration?: number;
  toast_style?: string;
  toast_enabled?: boolean;
  toast_monitor?: string;
  compact_view_position_mode?: 'cursor' | 'caret' | 'auto';
  viewer_window_width?: number;
  viewer_window_height?: number;
  viewer_window_x?: number | null;
  viewer_window_y?: number | null;
  show_action_messages?: boolean;
}

export type ClipType = 'text' | 'image' | 'html' | 'rtf' | 'file' | 'url';

export const CLIP_TYPE_LABELS: Record<ClipType, string> = {
  text: 'Text',
  image: 'Image',
  html: 'HTML',
  rtf: 'Rich Text',
  file: 'File',
  url: 'URL',
};

export const CLIP_TYPE_ICONS: Record<ClipType, string> = {
  text: 'FileText',
  image: 'Image',
  html: 'Code',
  rtf: 'Type',
  file: 'File',
  url: 'Link',
};
