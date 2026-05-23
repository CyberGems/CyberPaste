use tauri::{AppHandle, Emitter, Listener};
// Import functions directly from the crate root
use crate::database::Database;
#[cfg(target_os = "windows")]
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use clipboard_rs::common::RustImage;
use clipboard_rs::{Clipboard, ClipboardContext, ContentFormat};
use once_cell::sync::Lazy;
use sha2::{Digest, Sha256};
#[cfg(target_os = "windows")]
use std::ffi::OsStr;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
use std::sync::Arc;
use tauri_plugin_clipboard_x::{read_text, start_listening};
use uuid::Uuid;
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::MAX_PATH;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Gdi::{
    CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    GetObjectW, ReleaseDC, SelectObject, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
    DIB_RGB_COLORS, HBITMAP,
};
#[cfg(target_os = "windows")]
use windows::Win32::Storage::FileSystem::{
    GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW,
};
#[cfg(target_os = "windows")]
use windows::Win32::System::DataExchange::GetClipboardOwner;
#[cfg(target_os = "windows")]
use windows::Win32::System::ProcessStatus::{GetModuleBaseNameW, GetModuleFileNameExW};
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_INSERT, VK_SHIFT,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::Shell::{
    SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON, SHGFI_USEFILEATTRIBUTES,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    DestroyIcon, DrawIconEx, GetForegroundWindow, GetIconInfo, GetWindowThreadProcessId, DI_NORMAL,
    ICONINFO,
};

// GLOBAL STATE: Store the hash of the clip we just pasted ourselves.
// If the next clipboard change matches this hash, we ignore it (don't update timestamp).
static IGNORE_HASH: Lazy<parking_lot::Mutex<Option<String>>> =
    Lazy::new(|| parking_lot::Mutex::new(None));
static LAST_STABLE_HASH: Lazy<parking_lot::Mutex<Option<String>>> =
    Lazy::new(|| parking_lot::Mutex::new(None));
pub static CLIPBOARD_SYNC: Lazy<Arc<tokio::sync::Mutex<()>>> =
    Lazy::new(|| Arc::new(tokio::sync::Mutex::new(())));

use std::sync::atomic::{AtomicU64, Ordering};
static DEBOUNCE_COUNTER: AtomicU64 = AtomicU64::new(0);

pub fn set_ignore_hash(hash: String) {
    let mut lock = IGNORE_HASH.lock();
    *lock = Some(hash);
}

pub fn init(app: &AppHandle, db: Arc<Database>) {
    let app_clone = app.clone();
    let db_clone = db.clone();

    // Start monitor
    // tauri-plugin-clipboard-x exposes start_listening(app_handle)
    // It returns impl Future, so we need to spawn it or block.
    // Since init is synchronous here, we spawn it.
    let app_for_start = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = start_listening(app_for_start).await {
            log::error!("CLIPBOARD: Failed to start listener: {}", e);
        }
    });

    // Listen to clipboard changes
    // The event name found in source code: "plugin:clipboard-x://clipboard_changed"
    let event_name = "plugin:clipboard-x://clipboard_changed";

    app.listen(event_name, move |_event| {
        let app = app_clone.clone();
        let db = db_clone.clone();

        // DEBOUNCE LOGIC:
        let current_count = DEBOUNCE_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;

        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(150)).await;

            if DEBOUNCE_COUNTER.load(Ordering::SeqCst) != current_count {
                log::debug!(
                    "CLIPBOARD: Debounce: Aborting older event, current_count:{}",
                    current_count
                );
                return;
            }

            // Capture source app info INSIDE the thread, but still early.
            // Using spawn_blocking because it involves Win32 API calls that might block.
            let source_app_info =
                tauri::async_runtime::spawn_blocking(|| get_clipboard_owner_app_info())
                    .await
                    .unwrap_or((None, None, None, None, false));

            process_clipboard_change(app, db, source_app_info).await;
        });
    });
}

type SourceAppInfo = (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    bool,
);

struct ClipboardImageRead {
    png_bytes: Vec<u8>,
    width: u32,
    height: u32,
    raw_hash: String,
    decode_ms: u128,
    source_type: &'static str,
}

fn read_clipboard_image_with_clipboard_rs(
    source_type: &'static str,
) -> Result<ClipboardImageRead, String> {
    let ctx = ClipboardContext::new().map_err(|e| e.to_string())?;
    let image = ctx.get_image().map_err(|e| e.to_string())?;
    let (width, height) = image.get_size();

    let dynamic_image = image.get_dynamic_image().map_err(|e| e.to_string())?;
    let raw_hash = calculate_hash(dynamic_image.as_bytes());

    let png_bytes = image
        .to_png()
        .map_err(|e| e.to_string())?
        .get_bytes()
        .to_vec();

    Ok(ClipboardImageRead {
        png_bytes,
        width,
        height,
        raw_hash,
        decode_ms: 0,
        source_type,
    })
}

fn read_clipboard_image_fast() -> Result<ClipboardImageRead, String> {
    read_clipboard_image_with_clipboard_rs("clipboard-rs-image")
}

async fn process_clipboard_change(
    app: AppHandle,
    db: Arc<Database>,
    source_app_info: SourceAppInfo,
) {
    let started = std::time::Instant::now();
    let mut image_read_ms = 0u128;
    let mut image_decode_ms = 0u128;
    let mut text_read_ms = 0u128;
    let mut was_existing = false;
    let _guard = CLIPBOARD_SYNC.lock().await;

    let mut clip_type = "text";
    let mut clip_content = Vec::new();
    let mut full_image_content: Option<Vec<u8>> = None;
    let mut clip_preview = String::new();
    let mut clip_hash = String::new();
    let mut metadata = String::new();
    let mut found_content = false;

    // Try Image (in-memory path, no temp file write).
    log::debug!("CLIPBOARD: Attempting to read image from clipboard");
    let image_read_started = std::time::Instant::now();
    if let Ok(read_image_result) = read_clipboard_image_fast() {
        image_read_ms = image_read_started.elapsed().as_millis();
        log::debug!(
            "CLIPBOARD: Image read successfully, source_type={}, takes {} ms",
            read_image_result.source_type,
            image_read_ms
        );

        let bytes = read_image_result.png_bytes;
        let width = read_image_result.width;
        let height = read_image_result.height;
        image_decode_ms = read_image_result.decode_ms;
        let size_bytes = bytes.len();
        clip_hash = read_image_result.raw_hash;
        clip_content = Vec::new();
        full_image_content = Some(bytes);
        clip_type = "image";
        clip_preview = "[Image]".to_string();
        metadata = serde_json::json!({
            "width": width,
            "height": height,
            "format": "png",
            "size_bytes": size_bytes
        })
        .to_string();
        found_content = true;
        log::debug!(
            "CLIPBOARD: Found image: {}x{}, source_type={}, png_bytes={}",
            width,
            height,
            read_image_result.source_type,
            size_bytes
        );
    }

    if !found_content {
        let rich_read_started = std::time::Instant::now();

        // Use a single ClipboardContext for all format checks (files, HTML, RTF, text)
        if let Ok(ctx) = ClipboardContext::new() {
            // 1. Try Files (CF_HDROP) — must be before text: Explorer sets both
            if ctx.has(ContentFormat::Files) {
                if let Ok(files) = ctx.get_files() {
                    let files: Vec<String> = files.into_iter().collect();
                    if !files.is_empty() {
                        let content = serde_json::to_vec(&files).unwrap_or_default();
                        clip_hash = calculate_hash(&content);
                        clip_type = "file";
                        clip_content = content;
                        let first = std::path::Path::new(&files[0]);
                        let name = first
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default();
                        clip_preview = if files.len() > 1 {
                            format!("{} (+{} más)", name, files.len() - 1)
                        } else {
                            name
                        };
                        metadata = serde_json::json!({
                            "file_count": files.len(),
                            "paths": files
                        })
                        .to_string();
                        found_content = true;
                        log::debug!("CLIPBOARD: Found files: {}", clip_preview);
                    }
                }
            }

            // 2. Try HTML (richer than RTF/text, offered by browsers/wysiwyg editors)
            if !found_content && ctx.has(ContentFormat::Html) {
                if let Ok(html) = ctx.get_html() {
                    let trimmed = html.trim();
                    if !trimmed.is_empty() && is_rich_html(trimmed) {
                        clip_content = trimmed.as_bytes().to_vec();
                        clip_hash = calculate_hash(&clip_content);
                        clip_type = "html";
                        clip_preview = strip_html_tags(trimmed)
                            .chars()
                            .take(200)
                            .collect::<String>();
                        metadata = serde_json::json!({"format": "html"}).to_string();
                        found_content = true;
                        log::debug!("CLIPBOARD: Found HTML: {}", clip_preview);
                    }
                }
            }

            // 3. Try RTF (rich text format from Word etc.)
            if !found_content && ctx.has(ContentFormat::Rtf) {
                if let Ok(rtf) = ctx.get_rich_text() {
                    let trimmed = rtf.trim();
                    if !trimmed.is_empty() {
                        clip_content = trimmed.as_bytes().to_vec();
                        clip_hash = calculate_hash(&clip_content);
                        clip_type = "rtf";
                        clip_preview = strip_rtf_tags(trimmed)
                            .chars()
                            .take(200)
                            .collect::<String>();
                        metadata = serde_json::json!({"format": "rtf"}).to_string();
                        found_content = true;
                        log::debug!("CLIPBOARD: Found RTF: {}", clip_preview);
                    }
                }
            }

            // 4. Try plain text via context (fallback — only if no rich format was captured)
            if !found_content && ctx.has(ContentFormat::Text) {
                if let Ok(text) = ctx.get_text() {
                    let trimmed = text.trim().to_string();
                    if !trimmed.is_empty() {
                        clip_content = trimmed.as_bytes().to_vec();
                        clip_hash = calculate_hash(&clip_content);
                        clip_type = if is_code_snippet(&trimmed) { "code" } else { "text" };
                        clip_preview = trimmed.chars().take(200).collect::<String>();
                        found_content = true;
                        log::debug!("CLIPBOARD: Found text: {}", clip_preview);
                    }
                }
            }
        }

        // Fallback: plugin's read_text if ClipboardContext failed altogether
        if !found_content {
            if let Ok(text) = read_text().await {
                let trimmed = text.trim().to_string();
                if !trimmed.is_empty() {
                    clip_content = trimmed.as_bytes().to_vec();
                    clip_hash = calculate_hash(&clip_content);
                    clip_type = if is_code_snippet(&trimmed) { "code" } else { "text" };
                    clip_preview = trimmed.chars().take(200).collect::<String>();
                    found_content = true;
                    log::debug!("CLIPBOARD: Found text (fallback): {}", clip_preview);
                }
            }
        }

        text_read_ms = rich_read_started.elapsed().as_millis();
    }

    if !found_content {
        return;
    }

    // Stable Hash Check
    {
        let mut lock = LAST_STABLE_HASH.lock();
        if let Some(ref last_hash) = *lock {
            if last_hash == &clip_hash {
                return;
            }
        }
        *lock = Some(clip_hash.clone());
    }

    // Check ignore self-paste
    {
        let mut lock = IGNORE_HASH.lock();
        if let Some(ignore_hash) = lock.take() {
            if ignore_hash == clip_hash {
                log::info!(
                    "CLIPBOARD: Detected self-paste for hash {}, proceeding to update timestamp",
                    ignore_hash
                );
            }
        }
    }

    // Source app info was captured at event time (before debounce) to avoid race conditions
    let (source_app, source_icon, exe_name, full_path, is_explicit_owner) = source_app_info;
    log::info!(
        "CLIPBOARD: Source app: {:?}, exe_name: {:?}, full_path: {:?}, explicit: {}",
        source_app,
        exe_name,
        full_path,
        is_explicit_owner
    );

    // Check settings (cached via SettingsManager)
    use crate::settings_manager::SettingsManager;
    use tauri::Manager;
    let manager = app.state::<Arc<SettingsManager>>();
    let settings = manager.get();

    if settings.ignore_ghost_clips && !is_explicit_owner {
        log::info!("CLIPBOARD: Ignoring ghost clip (unknown owner)");
        return;
    }

    // Check if the app is in the ignore list (Case Insensitive)
    let is_ignored = |name: &str| {
        let name_lower = name.to_lowercase();
        settings
            .ignored_apps
            .iter()
            .any(|app| app.to_lowercase() == name_lower)
    };

    if let Some(ref path) = full_path {
        if is_ignored(path) {
            log::info!(
                "CLIPBOARD: Ignoring content from ignored app (path match): {}",
                path
            );
            return;
        }
    }

    if let Some(ref exe) = exe_name {
        if is_ignored(exe) {
            log::info!(
                "CLIPBOARD: Ignoring content from ignored app (exe match): {}",
                exe
            );
            return;
        }
    }

    // DB Logic
    let pool = &db.pool;

    let db_lookup_started = std::time::Instant::now();
    let existing_uuid: Option<String> =
        sqlx::query_scalar::<_, String>(r#"SELECT uuid FROM clips WHERE content_hash = ?"#)
            .bind(&clip_hash)
            .fetch_optional(pool)
            .await
            .unwrap_or(None);
    let db_lookup_ms = db_lookup_started.elapsed().as_millis();

    let db_write_started = std::time::Instant::now();
    let emitted_id = if let Some(existing_id) = existing_uuid {
        was_existing = true;

        let (is_pinned, clip_folder_id): (bool, Option<i64>) =
            sqlx::query_as("SELECT is_pinned, folder_id FROM clips WHERE uuid = ?")
                .bind(&existing_id)
                .fetch_one(pool)
                .await
                .unwrap_or((false, None));

        let new_sort_order = if is_pinned || clip_folder_id.is_some() {
            0
        } else {
            db.get_and_prepare_first_unpinned_slot(None, Some(&existing_id))
                .await
                .unwrap_or(0)
        };

        if clip_type == "image" {
            let _ = sqlx::query(
                r#"
                UPDATE clips
                SET created_at = CASE WHEN is_pinned = 1 OR folder_id IS NOT NULL THEN created_at ELSE CURRENT_TIMESTAMP END,
                    is_deleted = 0,
                    source_app = ?,
                    source_icon = ?,
                    content = ?,
                    text_preview = ?,
                    metadata = ?,
                    is_thumbnail = 0,
                    sort_order = CASE WHEN is_pinned = 1 OR folder_id IS NOT NULL THEN sort_order ELSE ? END
                WHERE uuid = ?
                "#,
            )
            .bind(&source_app)
            .bind(&source_icon)
            .bind(&clip_content)
            .bind(&clip_preview)
            .bind(Some(metadata.clone()))
            .bind(new_sort_order)
            .bind(&existing_id)
            .execute(pool)
            .await;

            if let Some(full_bytes) = &full_image_content {
                match persist_full_image_file(&existing_id, full_bytes) {
                    Ok(file_path) => {
                        let _ = sqlx::query(
                            r#"
                            INSERT OR REPLACE INTO clip_images (clip_uuid, full_content, file_path, file_size, storage_kind, mime_type, created_at)
                            VALUES (?, x'', ?, ?, 'file', 'image/png', CURRENT_TIMESTAMP)
                            "#,
                        )
                        .bind(&existing_id)
                        .bind(&file_path)
                        .bind(full_bytes.len() as i64)
                        .execute(pool)
                        .await;
                    }
                    Err(e) => {
                        log::error!(
                            "Failed to persist full image file for existing clip {}: {}",
                            existing_id,
                            e
                        );
                    }
                }
            }
        } else {
            let _ = sqlx::query(r#"
                UPDATE clips 
                SET created_at = CASE WHEN is_pinned = 1 OR folder_id IS NOT NULL THEN created_at ELSE CURRENT_TIMESTAMP END, 
                    sort_order = CASE WHEN is_pinned = 1 OR folder_id IS NOT NULL THEN sort_order ELSE ? END, 
                    is_deleted = 0, 
                    source_app = ?, 
                    source_icon = ? 
                WHERE uuid = ?
            "#)
                .bind(new_sort_order)
                .bind(&source_app)
                .bind(&source_icon)
                .bind(&existing_id)
                .execute(pool)
                .await;
        }
        existing_id
    } else {
        let clip_uuid = Uuid::new_v4().to_string();

        let new_sort_order = db
            .get_and_prepare_first_unpinned_slot(None, None)
            .await
            .unwrap_or(0);

        let _ = sqlx::query(
            r#"
            INSERT INTO clips (uuid, clip_type, content, text_preview, content_hash, folder_id, is_deleted, is_thumbnail, source_app, source_icon, metadata, sort_order, created_at, last_accessed)
            VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#,
        )
        .bind(&clip_uuid)
        .bind(clip_type)
        .bind(&clip_content)
        .bind(&clip_preview)
        .bind(&clip_hash)
        .bind(false)
        .bind(&source_app)
        .bind(&source_icon)
        .bind(if clip_type == "image" {
            Some(metadata)
        } else {
            None
        })
        .bind(new_sort_order)
        .execute(pool)
        .await;

        if clip_type == "image" {
            if let Some(full_bytes) = &full_image_content {
                match persist_full_image_file(&clip_uuid, full_bytes) {
                    Ok(file_path) => {
                        let _ = sqlx::query(
                            r#"
                            INSERT OR REPLACE INTO clip_images (clip_uuid, full_content, file_path, file_size, storage_kind, mime_type, created_at)
                            VALUES (?, x'', ?, ?, 'file', 'image/png', CURRENT_TIMESTAMP)
                            "#,
                        )
                        .bind(&clip_uuid)
                        .bind(&file_path)
                        .bind(full_bytes.len() as i64)
                        .execute(pool)
                        .await;
                    }
                    Err(e) => {
                        log::error!(
                            "Failed to persist full image file for new clip {}, dropping clip: {}",
                            clip_uuid,
                            e
                        );
                        let _ = sqlx::query(r#"DELETE FROM clips WHERE uuid = ?"#)
                            .bind(&clip_uuid)
                            .execute(pool)
                            .await;
                        return;
                    }
                }
            }
        }
        clip_uuid
    };

    // Prune history in background to avoid blocking the clipboard loop
    let pool_clone = pool.clone();
    let max_items = settings.max_items;
    let _ = crate::models::get_runtime().unwrap().spawn(async move {
        let _ = crate::commands::prune_history(&pool_clone, max_items).await;
    });

    let db_write_ms = db_write_started.elapsed().as_millis();

    let emit_started = std::time::Instant::now();
    let _ = app.emit(
        "clipboard-change",
        &serde_json::json!({
            "id": emitted_id,
            "content": clip_preview,
            "clip_type": clip_type,
            "source_app": source_app,
            "source_icon": source_icon,
            "created_at": chrono::Utc::now().to_rfc3339()
        }),
    );
    let emit_ms = emit_started.elapsed().as_millis();

    // Play sound if enabled
    if let Some(manager) = app.try_state::<Arc<crate::settings_manager::SettingsManager>>() {
        let settings = manager.get();
        if settings.clipboard_sound_enabled && !settings.clipboard_sound_path.is_empty() {
            let _ = crate::commands::play_clipboard_sound(settings.clipboard_sound_path.clone());
        }
        if settings.toast_enabled {
            let msg = if clip_preview.is_empty() {
                "".to_string()
            } else if clip_preview.len() > 50 {
                format!("{}...", &clip_preview.chars().take(47).collect::<String>())
            } else {
                clip_preview.clone()
            };
            // Generate tiny thumbnail for image toasts
            let image_b64 = if clip_type == "image" {
                full_image_content.as_ref().and_then(|bytes| {
                    image::load_from_memory(bytes).ok().map(|img| {
                        let thumb = img.thumbnail(48, 48);
                        let mut buf = Vec::new();
                        let encoder = image::codecs::png::PngEncoder::new(&mut buf);
                        use image::ImageEncoder;
                        encoder
                            .write_image(
                                thumb.to_rgba8().as_raw(),
                                thumb.width(),
                                thumb.height(),
                                image::ColorType::Rgba8,
                            )
                            .ok();
                        BASE64.encode(&buf)
                    })
                })
            } else {
                None
            };
            let _ = crate::commands::show_toast(
                app.clone(),
                msg,
                "info".to_string(),
                Some(clip_type.to_string()),
                image_b64,
            )
            .await;
        }
    }

    log::info!(
        "[perf][clipboard_ingest] type={} existing={} full_bytes={} thumb_bytes={} image_read_ms={} decode_ms={} text_read_ms={} db_lookup_ms={} db_write_ms={} emit_ms={} total_ms={}",
        clip_type,
        was_existing,
        full_image_content.as_ref().map(|v| v.len()).unwrap_or(0),
        if clip_type == "image" { clip_content.len() } else { 0 },
        image_read_ms,
        image_decode_ms,
        text_read_ms,
        db_lookup_ms,
        db_write_ms,
        emit_ms,
        started.elapsed().as_millis()
    );
}
fn calculate_hash(content: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    let result = hasher.finalize();
    format!("{:x}", result)
}

fn get_image_store_dir() -> std::path::PathBuf {
    let current_dir = std::env::current_dir().unwrap_or(std::path::PathBuf::from("."));
    let app_data_dir = match dirs::data_dir() {
        Some(path) => path.join("CyberPaste"),
        None => current_dir.join("CyberPaste"),
    };
    app_data_dir.join("images")
}

pub fn persist_full_image_file(clip_uuid: &str, png_bytes: &[u8]) -> Result<String, String> {
    let dir = get_image_store_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file_path = dir.join(format!("{}.png", clip_uuid));
    std::fs::write(&file_path, png_bytes).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

pub fn read_full_image_file(file_path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(file_path).map_err(|e| e.to_string())
}

pub fn remove_full_image_file(file_path: &str) {
    if let Err(e) = std::fs::remove_file(file_path) {
        if e.kind() != std::io::ErrorKind::NotFound {
            log::warn!("Failed to delete image file {}: {}", file_path, e);
        }
    }
}

#[cfg(target_os = "windows")]
fn get_clipboard_owner_app_info() -> (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    bool,
) {
    unsafe {
        let (hwnd, is_explicit) = match GetClipboardOwner() {
            Ok(h) if !h.0.is_null() => (h, true),
            Err(e) => {
                log::info!(
                    "CLIPBOARD: GetClipboardOwner failed: {:?}, falling back to foreground window",
                    e
                );
                (GetForegroundWindow(), false)
            }
            Ok(_) => {
                log::info!(
                    "CLIPBOARD: GetClipboardOwner returned null, falling back to foreground window"
                );
                (GetForegroundWindow(), false)
            }
        };

        if hwnd.0.is_null() {
            return (None, None, None, None, false);
        }

        let mut process_id = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        if process_id == 0 {
            return (None, None, None, None, false);
        }

        let process_handle = match OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            process_id,
        ) {
            Ok(h) => h,
            Err(_) => return (None, None, None, None, false),
        };

        let mut name_buffer = [0u16; MAX_PATH as usize];
        let name_size = GetModuleBaseNameW(process_handle, None, &mut name_buffer);
        let exe_name = if name_size > 0 {
            String::from_utf16_lossy(&name_buffer[..name_size as usize])
        } else {
            String::new()
        };

        let mut path_buffer = [0u16; MAX_PATH as usize];
        let path_size = GetModuleFileNameExW(Some(process_handle), None, &mut path_buffer);
        let (app_name, app_icon, full_path) = if path_size > 0 {
            let full_path_str = String::from_utf16_lossy(&path_buffer[..path_size as usize]);

            let desc = get_app_description(&full_path_str);
            let final_name = if let Some(d) = desc {
                Some(d)
            } else {
                if !exe_name.is_empty() {
                    Some(exe_name.clone())
                } else {
                    None
                }
            };

            let icon = extract_icon(&full_path_str);
            (final_name, icon, Some(full_path_str))
        } else {
            (
                if !exe_name.is_empty() {
                    Some(exe_name.clone())
                } else {
                    None
                },
                None,
                None,
            )
        };

        let exe_val = if !exe_name.is_empty() {
            Some(exe_name)
        } else {
            None
        };
        (app_name, app_icon, exe_val, full_path, is_explicit)
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_app_description(path: &str) -> Option<String> {
    use std::ffi::c_void;

    let wide_path: Vec<u16> = OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let size = GetFileVersionInfoSizeW(windows::core::PCWSTR(wide_path.as_ptr()), None);
    if size == 0 {
        return None;
    }

    let mut data = vec![0u8; size as usize];
    if GetFileVersionInfoW(
        windows::core::PCWSTR(wide_path.as_ptr()),
        Some(0),
        size,
        data.as_mut_ptr() as *mut _,
    )
    .is_err()
    {
        return None;
    }

    let mut lang_ptr: *mut c_void = std::ptr::null_mut();
    let mut lang_len: u32 = 0;

    let translation_query = OsStr::new("\\VarFileInfo\\Translation")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<u16>>();

    if !VerQueryValueW(
        data.as_ptr() as *const _,
        windows::core::PCWSTR(translation_query.as_ptr()),
        &mut lang_ptr,
        &mut lang_len,
    )
    .as_bool()
    {
        return None;
    }

    if lang_len < 4 {
        return None;
    }

    let pairs = std::slice::from_raw_parts(lang_ptr as *const u16, (lang_len / 2) as usize);
    let num_pairs = (lang_len / 4) as usize;

    let mut lang_code = pairs[0];
    let mut charset_code = pairs[1];

    for i in 0..num_pairs {
        let code = pairs[i * 2];
        let charset = pairs[i * 2 + 1];

        if code == 0x0804 {
            lang_code = code;
            charset_code = charset;
        }
    }

    let keys = ["FileDescription", "ProductName"];

    for key in keys {
        let query_str = format!(
            "\\StringFileInfo\\{:04x}{:04x}\\{}",
            lang_code, charset_code, key
        );
        let query = OsStr::new(&query_str)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>();

        let mut desc_ptr: *mut c_void = std::ptr::null_mut();
        let mut desc_len: u32 = 0;

        if VerQueryValueW(
            data.as_ptr() as *const _,
            windows::core::PCWSTR(query.as_ptr()),
            &mut desc_ptr,
            &mut desc_len,
        )
        .as_bool()
        {
            let desc = std::slice::from_raw_parts(desc_ptr as *const u16, desc_len as usize);
            let len = if desc.last() == Some(&0) {
                desc.len() - 1
            } else {
                desc.len()
            };
            if len > 0 {
                return Some(String::from_utf16_lossy(&desc[..len]));
            }
        }
    }

    None
}

#[cfg(target_os = "windows")]
unsafe fn extract_icon(path: &str) -> Option<String> {
    use image::ImageEncoder;

    let wide_path: Vec<u16> = OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut shfi = SHFILEINFOW::default();

    SHGetFileInfoW(
        windows::core::PCWSTR(wide_path.as_ptr()),
        windows::Win32::Storage::FileSystem::FILE_ATTRIBUTE_NORMAL,
        Some(&mut shfi as *mut _),
        std::mem::size_of::<SHFILEINFOW>() as u32,
        SHGFI_ICON | SHGFI_LARGEICON | SHGFI_USEFILEATTRIBUTES,
    );

    if shfi.hIcon.is_invalid() {
        return None;
    }

    let icon = shfi.hIcon;
    struct IconGuard(windows::Win32::UI::WindowsAndMessaging::HICON);
    impl Drop for IconGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = DestroyIcon(self.0);
            }
        }
    }
    let _guard = IconGuard(icon);

    let mut icon_info = ICONINFO::default();
    if GetIconInfo(icon, &mut icon_info).is_err() {
        return None;
    }

    struct BitmapGuard(HBITMAP);
    impl Drop for BitmapGuard {
        fn drop(&mut self) {
            unsafe {
                if !self.0.is_invalid() {
                    let _ = DeleteObject(self.0.into());
                }
            }
        }
    }
    let _bm_mask = BitmapGuard(icon_info.hbmMask);
    let _bm_color = BitmapGuard(icon_info.hbmColor);

    let mut bm = BITMAP::default();
    if GetObjectW(
        icon_info.hbmMask.into(),
        std::mem::size_of::<BITMAP>() as i32,
        Some(&mut bm as *mut _ as *mut _),
    ) == 0
    {
        return None;
    }

    let width = bm.bmWidth;
    let height = if !icon_info.hbmColor.is_invalid() {
        bm.bmHeight
    } else {
        bm.bmHeight / 2
    };

    let screen_dc = GetDC(None);
    let mem_dc = CreateCompatibleDC(Some(screen_dc));
    let mem_bm = CreateCompatibleBitmap(screen_dc, width, height);

    let old_obj = SelectObject(mem_dc, mem_bm.into());

    let _ = DrawIconEx(mem_dc, 0, 0, icon, width, height, 0, None, DI_NORMAL);

    let bi = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: width,
        biHeight: -height,
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };

    let mut pixels = vec![0u8; (width * height * 4) as usize];

    GetDIBits(
        mem_dc,
        mem_bm,
        0,
        height as u32,
        Some(pixels.as_mut_ptr() as *mut _),
        &mut BITMAPINFO {
            bmiHeader: bi,
            ..Default::default()
        },
        DIB_RGB_COLORS,
    );

    SelectObject(mem_dc, old_obj);
    let _ = DeleteDC(mem_dc);
    let _ = DeleteObject(mem_bm.into());
    let _ = ReleaseDC(None, screen_dc);

    for chunk in pixels.chunks_exact_mut(4) {
        let b = chunk[0];
        let r = chunk[2];
        chunk[0] = r;
        chunk[2] = b;
    }

    let mut png_data = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
    encoder
        .write_image(
            &pixels,
            width as u32,
            height as u32,
            image::ColorType::Rgba8,
        )
        .ok()?;

    Some(BASE64.encode(&png_data))
}

#[cfg(target_os = "windows")]
pub fn send_paste_input() {
    log::info!("send_paste_input: sending Shift+Insert");
    unsafe {
        let inputs = vec![
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_SHIFT,
                        ..Default::default()
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_INSERT,
                        ..Default::default()
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_INSERT,
                        dwFlags: KEYEVENTF_KEYUP,
                        ..Default::default()
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_SHIFT,
                        dwFlags: KEYEVENTF_KEYUP,
                        ..Default::default()
                    },
                },
            },
        ];

        let result = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        log::info!("send_paste_input: SendInput returned {}", result);
    }
}

pub fn strip_html_tags(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut in_entity = false;
    let mut entity = String::new();

    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            '&' if !in_tag => {
                in_entity = true;
                entity.clear();
            }
            ';' if in_entity => {
                in_entity = false;
                let decoded = match entity.as_str() {
                    "amp" => "&",
                    "lt" => "<",
                    "gt" => ">",
                    "quot" => "\"",
                    "#39" => "'",
                    "nbsp" => " ",
                    _ => "",
                };
                out.push_str(decoded);
            }
            _ if in_entity => entity.push(ch),
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }

    out.trim().to_string()
}

pub fn is_rich_html(html: &str) -> bool {
    let plain_text = strip_html_tags(html);
    let is_single_line = !plain_text.contains('\n') && !plain_text.contains('\r');

    let bytes = html.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'<' {
            i += 1;
            if i < bytes.len() && bytes[i] == b'!' {
                i += 1;
                continue;
            }
            if i < bytes.len() && bytes[i] == b'?' {
                i += 1;
                continue;
            }
            let mut _is_closing = false;
            if i < bytes.len() && bytes[i] == b'/' {
                _is_closing = true;
                i += 1;
            }
            let start = i;
            while i < bytes.len() && bytes[i].is_ascii_alphanumeric() {
                i += 1;
            }
            let end = i;
            if end > start {
                let tag_name = std::str::from_utf8(&bytes[start..end]).unwrap_or("");
                let tag_lower = tag_name.to_lowercase();
                
                if is_single_line {
                    match tag_lower.as_str() {
                        "a" | "img" | "iframe" => {
                            return true;
                        }
                        _ => {}
                    }
                } else {
                    match tag_lower.as_str() {
                        "a" | "img" | "table" | "tr" | "td" | "th" | "ul" | "ol" | "li" | 
                        "p" | "br" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | 
                        "strong" | "b" | "em" | "i" | "u" | "s" | "strike" | "del" | "ins" | 
                        "code" | "pre" | "blockquote" | "hr" | "iframe" | "button" | "input" |
                        "textarea" | "select" | "option" => {
                            return true;
                        }
                        _ => {}
                    }
                }
            }
        }
        i += 1;
    }
    false
}

pub fn is_code_snippet(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.len() < 8 {
        return false;
    }

    // Check for markdown code block markers
    if trimmed.starts_with("```") || trimmed.contains("\n```") {
        return true;
    }

    let mut score = 0;

    // Check line endings and indentation
    let lines: Vec<&str> = trimmed.lines().collect();
    let total_lines = lines.len();
    let mut semi_count = 0;
    let mut indent_count = 0;

    for line in &lines {
        let line_trimmed = line.trim();
        if line_trimmed.ends_with(';') {
            semi_count += 1;
        }
        if line.starts_with('\t') || line.starts_with("  ") {
            indent_count += 1;
        }
    }

    // Heuristics for semicolons (common in JS/TS, C/C++, Java, Rust, CSS)
    if semi_count > 0 {
        let semi_ratio = semi_count as f32 / total_lines as f32;
        if semi_ratio > 0.15 {
            score += 5;
        } else {
            score += 2;
        }
    }

    // Indentation score
    if indent_count > 0 {
        let indent_ratio = indent_count as f32 / total_lines as f32;
        if indent_ratio > 0.2 {
            score += 3;
        } else {
            score += 1;
        }
    }

    // Curly braces balance/presence
    if trimmed.contains('{') && trimmed.contains('}') {
        score += 3;
    }

    // Common operators / code symbols
    let operators = [
        "=>", "->", "::", "&&", "||", "!=", "==", "===", "!==", "+=", "-=", "++", "--",
        "//", "/*", "*/", "<!--", "-->", "</", "/>", "const ", "let ", "var ", "fn ", "pub ",
        "import ", "export ", "class ", "struct ", "impl ", "interface ", "enum ",
        "def ", "elif ", "lambda ", "function ", "return ", "typeof ",
        "#include", "#define", "#ifdef", "using namespace", "public class ",
        "console.log", "println!", "print(", "std::", "import {", "import *",
        "className=", "onClick=", "onChange=", "style={{",
        "<!DOCTYPE html>", "<html", "<body", "<head", "</html", "</body"
    ];

    for op in &operators {
        if trimmed.contains(op) {
            score += 2;
        }
    }

    // Check for SQL keywords
    let sql_keywords = ["SELECT ", "INSERT INTO ", "UPDATE ", "DELETE FROM ", " WHERE ", " JOIN ", " FROM "];
    let mut sql_matches = 0;
    for kw in &sql_keywords {
        if trimmed.to_uppercase().contains(kw) {
            sql_matches += 1;
        }
    }
    if sql_matches >= 2 {
        score += 4;
    }

    // CLI Commands check
    let cli_prefixes = ["npm run ", "cargo run", "git commit ", "docker run ", "npm install ", "pip install "];
    for prefix in &cli_prefixes {
        if trimmed.starts_with(prefix) {
            score += 7;
        }
    }

    // Single line threshold is higher to prevent conversational lines matching
    let threshold = if total_lines == 1 {
        7
    } else {
        5
    };

    score >= threshold
}

pub fn strip_rtf_tags(rtf: &str) -> String {
    let mut out = String::new();
    let bytes = rtf.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => {
                i += 1;
                if i >= bytes.len() {
                    break;
                }
                match bytes[i] {
                    b'\'' if i + 2 < bytes.len() => {
                        let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("20");
                        if let Ok(code) = u8::from_str_radix(hex, 16) {
                            out.push(if code >= 32 && code != 127 {
                                code as char
                            } else {
                                ' '
                            });
                        }
                        i += 3;
                    }
                    b'\'' => {
                        i += 1;
                    }
                    b'\\' => {
                        out.push('\\');
                        i += 1;
                    }
                    b'{' => {
                        out.push('{');
                        i += 1;
                    }
                    b'}' => {
                        out.push('}');
                        i += 1;
                    }
                    b'~' => {
                        out.push(' ');
                        i += 1;
                    }
                    b'_' => {
                        out.push('-');
                        i += 1;
                    }
                    b'*' => {
                        i += 1;
                    }
                    b'\n' | b'\r' => {
                        i += 1;
                    }
                    _ if bytes[i].is_ascii_alphabetic() => {
                        i += 1;
                        while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
                            i += 1;
                        }
                        while i < bytes.len() && (bytes[i] == b'-' || bytes[i].is_ascii_digit()) {
                            i += 1;
                        }
                        if i < bytes.len() && bytes[i] == b' ' {
                            i += 1;
                        }
                    }
                    _ => {
                        i += 1;
                    }
                }
            }
            b'{' | b'}' => {
                i += 1;
            }
            b'\r' | b'\n' => {
                i += 1;
            }
            _ => {
                out.push(bytes[i] as char);
                i += 1;
            }
        }
    }
    out.trim().to_string()
}
