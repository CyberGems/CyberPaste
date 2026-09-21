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
  max_clipboard_text_bytes?: number;
  max_clipboard_image_bytes?: number;
  storage_quota_bytes?: number;
  auto_delete_days: number;
  startup_with_windows: boolean;
  show_in_taskbar: boolean;
  hotkey: string;
  view_mode_hotkey?: string;
  theme: string;
  language?: string;
  mica_effect?: string;
  round_corners?: boolean;
  view_mode?: 'full' | 'compact';
  scroll_direction?: 'horizontal' | 'vertical';
  compact_folder_layout?: 'horizontal' | 'vertical';
  compact_sidebar_collapsed?: boolean;
  clipboard_sound_enabled?: boolean;
  clipboard_sound_path?: string;
  startup_sound_enabled?: boolean;
  startup_sound_path?: string;
  auto_inject_paste?: boolean;
  pinned?: boolean;
  auto_paste: boolean;
  single_click_paste?: boolean;
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
  toast_enabled?: boolean;
  duplicate_toast_enabled?: boolean;
  toast_monitor?: string;
  toast_click_action?: 'none' | 'close' | 'open' | 'system_viewer' | 'toggle_pin';
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  auto_backup_enabled?: boolean;
  auto_backup_folder?: string;
  auto_backup_retention?: number;
  compact_view_position_mode?: 'cursor' | 'caret' | 'auto';
  viewer_window_width?: number;
  viewer_window_height?: number;
  viewer_window_x?: number | null;
  viewer_window_y?: number | null;
  viewer_window_maximized?: boolean;
  show_action_messages?: boolean;
  type_to_search?: boolean;
  clip_numbering?: 'positional' | 'countdown';
  auto_check_updates?: boolean;
  show_app_recommendations?: boolean;
  full_show_hud?: boolean;
  full_grid_scale?: number;
  full_grid_columns?: number; // 0 = automatic
  full_scroll_direction?: 'horizontal' | 'vertical';
  full_show_scrollbar?: boolean;
  full_peek_enabled?: boolean;
  full_show_source_icon?: boolean;
  full_show_time?: boolean;
  full_show_type_icon?: boolean;
  full_show_number?: boolean;
  full_type_filter?: string; // 'all' | 'text' | 'code' | 'image' | 'url' | 'file'
  compact_row_height?: number; // 36 | 44 | 52
  compact_type_filter?: string; // 'all' | 'text' | 'code' | 'image' | 'url' | 'file'
  compact_last_position_x?: number | null;
  compact_last_position_y?: number | null;
  compact_auto_height?: boolean;
  compact_peek_enabled?: boolean;
  compact_show_source_icon?: boolean;
  compact_show_time?: boolean;
  compact_show_type_icon?: boolean;
  compact_show_number?: boolean;
  compact_show_scrollbar?: boolean;
  settings_window_width?: number | null;
  settings_window_height?: number | null;
  settings_window_x?: number | null;
  settings_window_y?: number | null;
  about_window_width?: number | null;
  about_window_height?: number | null;
  about_window_x?: number | null;
  about_window_y?: number | null;
  wheel_folder_navigation?: boolean;
  title_bar_animation_enabled?: boolean;
  has_seen_tray_pin_tip?: boolean;
  app_lock_enabled?: boolean;
  app_lock_mode?: 'pin' | 'password' | string;
  app_lock_on_hide?: boolean;
  app_lock_on_windows_lock?: boolean;
  app_lock_idle_seconds?: number;
  app_lock_pause_capture?: boolean;
  ai_api_key_configured?: boolean;
  achievements_enabled?: boolean;
  achievement_notifications_enabled?: boolean;
  first_used_at?: string | null;
  recent_searches?: string[];
}

export interface UsageTotals {
  clips_captured: number;
  captured_text: number;
  captured_image: number;
  captured_code: number;
  captured_url: number;
  captured_file: number;
  captured_html: number;
  captured_rtf: number;
  pastes: number;
  copies: number;
  searches: number;
  folders_created: number;
  pins: number;
  ai_actions: number;
}

export interface AchievementProgress {
  id: string;
  target: number;
  value: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface ProgressData {
  first_used_at: string | null;
  totals: UsageTotals;
  active_days: number;
  current_streak: number;
  achievements: AchievementProgress[];
}

export interface AppLockStatus {
  enabled: boolean;
  locked: boolean;
  mode: string;
  lockout_remaining_ms: number;
  failed_attempts: number;
  on_hide: boolean;
  on_windows_lock: boolean;
  idle_seconds: number;
  pause_capture: boolean;
  has_recovery_key?: boolean;
}

export interface AppLockKeyResult {
  status: AppLockStatus;
  recovery_key: string;
}

export type ClipType = 'text' | 'image' | 'html' | 'rtf' | 'file' | 'url' | 'code';

export const CLIP_TYPE_LABELS: Record<ClipType, string> = {
  text: 'Text',
  image: 'Image',
  html: 'HTML',
  rtf: 'Rich Text',
  file: 'File',
  url: 'URL',
  code: 'Code',
};

export const CLIP_TYPE_ICONS: Record<ClipType, string> = {
  text: 'FileText',
  image: 'Image',
  html: 'Code',
  rtf: 'Type',
  file: 'File',
  url: 'Link',
  code: 'Braces',
};
