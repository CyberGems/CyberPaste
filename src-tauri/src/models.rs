use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::OnceLock;

use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub theme: String,
    pub mica_effect: String,
    pub language: String,
    pub max_items: i64,
    pub auto_delete_days: i64,
    pub hotkey: String,
    pub view_mode_hotkey: String,
    pub auto_paste: bool,
    pub ignore_ghost_clips: bool,
    pub startup_with_windows: bool,
    pub round_corners: bool,
    pub float_above_taskbar: bool,
    pub view_mode: String,             // "full" or "compact"
    pub scroll_direction: String,      // "horizontal" or "vertical"
    pub compact_folder_layout: String, // "horizontal" or "vertical"
    pub compact_sidebar_collapsed: bool,
    pub clipboard_sound_enabled: bool,
    pub clipboard_sound_path: String,
    pub auto_inject_paste: bool,
    pub pinned: bool,
    pub reset_view_on_paste: bool,
    pub image_editor_path: String,

    // AI
    pub ai_provider: String,
    pub ai_api_key: String,
    pub ai_model: String,
    pub ai_base_url: String,
    pub ai_prompt_summarize: String,
    pub ai_prompt_translate: String,
    pub ai_prompt_explain_code: String,
    pub ai_prompt_fix_grammar: String,
    pub ai_title_summarize: String,
    pub ai_title_translate: String,
    pub ai_title_explain_code: String,
    pub ai_title_fix_grammar: String,

    pub window_width: f64,
    pub window_height: f64,
    pub full_window_width: f64,
    pub full_window_height: f64,
    pub compact_window_width: f64,
    pub compact_window_height: f64,
    pub ignored_apps: HashSet<String>,
    pub toast_position: String,
    pub toast_duration: i64,
    pub toast_style: String,
    pub toast_enabled: bool,
    pub toast_monitor: String,
    pub compact_view_position_mode: String, // "cursor" or "caret"
    pub viewer_window_width: f64,
    pub viewer_window_height: f64,
    pub viewer_window_x: Option<i32>,
    pub viewer_window_y: Option<i32>,
    pub show_action_messages: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            mica_effect: "clear".to_string(),
            language: "en".to_string(),
            max_items: 300,
            auto_delete_days: 30,
            hotkey: "Ctrl+Shift+V".to_string(),
            view_mode_hotkey: "Ctrl+M".to_string(),
            auto_paste: false,
            ignore_ghost_clips: false,
            startup_with_windows: false,
            round_corners: false,
            float_above_taskbar: true,
            view_mode: "compact".to_string(),
            scroll_direction: "vertical".to_string(),
            compact_folder_layout: "horizontal".to_string(),
            compact_sidebar_collapsed: false,
            clipboard_sound_enabled: false,
            clipboard_sound_path: "".to_string(),
            auto_inject_paste: false,
            pinned: false,
            reset_view_on_paste: false,
            image_editor_path: "".to_string(),

            ai_provider: "openai".to_string(),
            ai_api_key: "".to_string(),
            ai_model: "gpt-4o-mini".to_string(),
            ai_base_url: "https://api.openai.com/v1".to_string(),

            ai_prompt_summarize: "Summarize this content concisely.".to_string(),
            ai_prompt_translate: "Translate this to English (or user language).".to_string(),
            ai_prompt_explain_code: "Explain this code snippet.".to_string(),
            ai_prompt_fix_grammar: "Fix grammar and spelling.".to_string(),

            ai_title_summarize: "Summarize".to_string(),
            ai_title_translate: "Translate".to_string(),
            ai_title_explain_code: "Explain Code".to_string(),
            ai_title_fix_grammar: "Fix Grammar".to_string(),

            window_width: 550.0,
            window_height: crate::constants::FULL_HEIGHT,
            full_window_width: 550.0,
            full_window_height: crate::constants::FULL_HEIGHT,
            compact_window_width: crate::constants::COMPACT_WIDTH,
            compact_window_height: crate::constants::COMPACT_HEIGHT,
            ignored_apps: HashSet::new(),
            toast_position: "bottom-center".to_string(),
            toast_duration: 3000,
            toast_style: "cyber".to_string(),
            toast_enabled: true,
            toast_monitor: "primary".to_string(),
            compact_view_position_mode: "auto".to_string(),
            viewer_window_width: 800.0,
            viewer_window_height: 600.0,
            viewer_window_x: None,
            viewer_window_y: None,
            show_action_messages: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(default)]
pub struct Clip {
    pub id: i64,
    pub uuid: String,
    pub clip_type: String,
    pub content: Vec<u8>,
    pub text_preview: String,
    pub content_hash: String,
    pub folder_id: Option<i64>,
    pub is_deleted: bool,
    pub is_thumbnail: bool,
    pub source_app: Option<String>,
    pub source_icon: Option<String>,
    pub metadata: Option<String>,
    pub sort_order: i64,
    pub is_pinned: bool,
    pub pinned_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_accessed: chrono::DateTime<chrono::Utc>,
}

impl Default for Clip {
    fn default() -> Self {
        Self {
            id: 0,
            uuid: String::new(),
            clip_type: String::new(),
            content: Vec::new(),
            text_preview: String::new(),
            content_hash: String::new(),
            folder_id: None,
            is_deleted: false,
            is_thumbnail: false,
            source_app: None,
            source_icon: None,
            metadata: None,
            sort_order: 0,
            is_pinned: false,
            pinned_at: None,
            created_at: chrono::DateTime::default(),
            last_accessed: chrono::DateTime::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Folder {
    pub id: i64,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_system: bool,
    pub sort_order: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

static RUNTIME: OnceLock<tokio::runtime::Runtime> = OnceLock::new();

pub fn get_runtime() -> Result<&'static tokio::runtime::Runtime, String> {
    if let Some(rt) = RUNTIME.get() {
        return Ok(rt);
    }

    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;

    RUNTIME.set(rt).ok();
    Ok(RUNTIME.get().unwrap())
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ClipImage {
    pub clip_uuid: String,
    pub full_content: Vec<u8>,
    pub file_path: Option<String>,
    pub file_size: i64,
    pub storage_kind: String,
    pub mime_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupData {
    pub version: String,
    pub clips: Vec<Clip>,
    pub folders: Vec<Folder>,
    pub clip_images: Vec<ClipImage>,
    pub settings: AppSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: String,
    pub clip_type: String,
    pub content: String,
    pub preview: String,
    pub content_length: usize,
    pub folder_id: Option<String>,
    pub created_at: String,
    pub source_app: Option<String>,
    pub source_icon: Option<String>,
    pub metadata: Option<String>,
    pub image_path: Option<String>,
    pub is_pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderItem {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_system: bool,
    pub item_count: i64,
}
