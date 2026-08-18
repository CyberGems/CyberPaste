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

use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::atomic::{AtomicU64, AtomicBool, Ordering};

static LAST_CUT_TIMESTAMP: AtomicU64 = AtomicU64::new(0);
pub static CLIPBOARD_MONITORING_PAUSED: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
static mut CTRL_DOWN: bool = false;
#[cfg(target_os = "windows")]
static mut SHIFT_DOWN: bool = false;

#[cfg(target_os = "windows")]
unsafe extern "system" fn keyboard_proc(code: i32, wparam: windows::Win32::Foundation::WPARAM, lparam: windows::Win32::Foundation::LPARAM) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP, KBDLLHOOKSTRUCT,
    };
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        VK_CONTROL, VK_LCONTROL, VK_RCONTROL, VK_SHIFT, VK_LSHIFT, VK_RSHIFT,
    };

    if code >= 0 {
        let kb = unsafe { *(lparam.0 as *const KBDLLHOOKSTRUCT) };
        let vk = kb.vkCode;

        let is_down = wparam.0 == WM_KEYDOWN as usize || wparam.0 == WM_SYSKEYDOWN as usize;
        let is_up = wparam.0 == WM_KEYUP as usize || wparam.0 == WM_SYSKEYUP as usize;

        if vk == VK_CONTROL.0 as u32 || vk == VK_LCONTROL.0 as u32 || vk == VK_RCONTROL.0 as u32 {
            if is_down {
                CTRL_DOWN = true;
            } else if is_up {
                CTRL_DOWN = false;
            }
        } else if vk == VK_SHIFT.0 as u32 || vk == VK_LSHIFT.0 as u32 || vk == VK_RSHIFT.0 as u32 {
            if is_down {
                SHIFT_DOWN = true;
            } else if is_up {
                SHIFT_DOWN = false;
            }
        } else if vk == 0x58 { // 'X'
            if is_down && CTRL_DOWN {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                LAST_CUT_TIMESTAMP.store(now, Ordering::SeqCst);
                log::info!("CLIPBOARD: Global hook detected Cut (Ctrl+X) at timestamp {}", now);
            }
        } else if vk == 0x2E { // 'Delete'
            if is_down && SHIFT_DOWN {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                LAST_CUT_TIMESTAMP.store(now, Ordering::SeqCst);
                log::info!("CLIPBOARD: Global hook detected Cut (Shift+Delete) at timestamp {}", now);
            }
        }
    }

    CallNextHookEx(None, code, wparam, lparam)
}

#[cfg(target_os = "windows")]
fn start_cut_detection_thread() {
    log::info!("CLIPBOARD: Spawning cut detection thread with global hook...");
    std::thread::spawn(|| {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetMessageW, MSG, SetWindowsHookExW, WH_KEYBOARD_LL,
        };

        unsafe {
            let hook = SetWindowsHookExW(
                WH_KEYBOARD_LL,
                Some(keyboard_proc),
                None,
                0,
            );

            match hook {
                Ok(h) => {
                    log::info!("CLIPBOARD: Global keyboard hook registered successfully!");
                    let mut msg = MSG::default();
                    while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                        // Pump messages
                    }
                    let _ = windows::Win32::UI::WindowsAndMessaging::UnhookWindowsHookEx(h);
                }
                Err(e) => {
                    log::error!("CLIPBOARD: Failed to register global keyboard hook: {:?}", e);
                }
            }
        }
    });
}

#[cfg(target_os = "windows")]
fn detect_if_cut_key_pressed() -> bool {
    let last_cut = LAST_CUT_TIMESTAMP.load(Ordering::SeqCst);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    let diff = now.saturating_sub(last_cut);
    let is_cut = diff < 600;
    log::info!("CLIPBOARD: detect_if_cut_key_pressed: now={}, last_cut={}, diff={}ms, is_cut={}", now, last_cut, diff, is_cut);
    is_cut
}

#[cfg(not(target_os = "windows"))]
fn start_cut_detection_thread() {}

#[cfg(not(target_os = "windows"))]
fn detect_if_cut_key_pressed() -> bool {
    false
}
#[cfg(target_os = "windows")]
use windows::Win32::UI::Shell::{
    SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON, SHGFI_USEFILEATTRIBUTES,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    DestroyIcon, DrawIconEx, GetIconInfo, DI_NORMAL, ICONINFO,
};

// GLOBAL STATE: Store the hash of the clip we just pasted ourselves.
// If the next clipboard change matches this hash, we ignore it (don't update timestamp).
static IGNORE_HASH: Lazy<parking_lot::Mutex<Option<String>>> =
    Lazy::new(|| parking_lot::Mutex::new(None));
static LAST_STABLE_HASH: Lazy<parking_lot::Mutex<Option<(String, std::time::Instant)>>> =
    Lazy::new(|| parking_lot::Mutex::new(None));
pub static CLIPBOARD_SYNC: Lazy<Arc<tokio::sync::Mutex<()>>> =
    Lazy::new(|| Arc::new(tokio::sync::Mutex::new(())));

static DEBOUNCE_COUNTER: AtomicU64 = AtomicU64::new(0);

pub fn set_ignore_hash(hash: String) {
    let mut lock = IGNORE_HASH.lock();
    *lock = Some(hash);
}

pub fn init(app: &AppHandle, db: Arc<Database>) {
    start_cut_detection_thread();
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
        if CLIPBOARD_MONITORING_PAUSED.load(Ordering::SeqCst) {
            log::info!("CLIPBOARD: Monitoring is paused, ignoring event.");
            return;
        }
        let app = app_clone.clone();
        let db = db_clone.clone();
        let is_cut = detect_if_cut_key_pressed();

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

            process_clipboard_change(app, db, source_app_info, is_cut).await;
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

fn clipboard_has_files() -> bool {
    ClipboardContext::new()
        .ok()
        .map(|ctx| ctx.has(ContentFormat::Files))
        .unwrap_or(false)
}

/// Canonical pixel identity: version prefix + width + height + RGBA8.
/// `DynamicImage::as_bytes()` is not unique across color types or dimensions
/// (e.g. 100×100 RGB and 50×200 RGB with the same byte sequence collide).
fn validated_rgba8(width: u32, height: u32, rgba: Vec<u8>) -> Result<(u32, u32, Vec<u8>), String> {
    let expected_len = (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
        .ok_or_else(|| "image dimensions overflow".to_string())?;
    if width == 0 || height == 0 || rgba.len() != expected_len {
        return Err("invalid clipboard image buffer".to_string());
    }
    Ok((width, height, rgba))
}

const IMAGE_HASH_VERSION: &[u8] = b"cp-img-v1";

fn calculate_image_hash(width: u32, height: u32, rgba: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(IMAGE_HASH_VERSION);
    hasher.update(width.to_le_bytes());
    hasher.update(height.to_le_bytes());
    hasher.update(rgba);
    format!("{:x}", hasher.finalize())
}

fn read_clipboard_image_with_clipboard_rs(
    source_type: &'static str,
) -> Result<ClipboardImageRead, String> {
    let ctx = ClipboardContext::new().map_err(|e| e.to_string())?;
    let image = ctx.get_image().map_err(|e| e.to_string())?;

    let rgba_image = image.to_rgba8().map_err(|e| e.to_string())?;
    let (width, height, rgba) =
        validated_rgba8(rgba_image.width(), rgba_image.height(), rgba_image.into_raw())?;
    let raw_hash = calculate_image_hash(width, height, &rgba);

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
    is_cut: bool,
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

    // Files (CF_HDROP) before image: Explorer/Office often attach a CF_DIB
    // thumbnail or file-type icon that would otherwise collapse distinct copies
    // into one "duplicate image".
    log::debug!("CLIPBOARD: Attempting to read image from clipboard");
    let image_read_started = std::time::Instant::now();
    if !clipboard_has_files() {
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

            // 3. Prefer plain text when available.
            // Terminals/editors often put RTF+TEXT together; TEXT is the real snippet.
            // Word/rich docs usually also offer HTML (handled above).
            // Also handle CF_TEXT that is itself an RTF document (e.g. re-copied from edit modal).
            if !found_content && ctx.has(ContentFormat::Text) {
                if let Ok(text) = ctx.get_text() {
                    let trimmed = text.trim().to_string();
                    if !trimmed.is_empty() {
                        let looks_like_rtf = trimmed.starts_with("{\\rtf");
                        if looks_like_rtf {
                            let plain = strip_rtf_tags(&trimmed);
                            if is_trivial_rtf_plain(&trimmed, &plain) {
                                // Empty/noise RTF body (e.g. fonttbl + a stray quote) — skip
                                log::debug!(
                                    "CLIPBOARD: Skipping trivial RTF-as-text (stripped={:?})",
                                    plain
                                );
                            } else {
                                clip_content = plain.as_bytes().to_vec();
                                clip_hash = calculate_hash(&clip_content);
                                clip_type = if is_url(&plain) {
                                    "url"
                                } else if is_code_snippet(&plain) {
                                    "code"
                                } else {
                                    "text"
                                };
                                clip_preview = plain.chars().take(200).collect::<String>();
                                metadata = serde_json::json!({"format": "rtf", "converted": true})
                                    .to_string();
                                found_content = true;
                                log::debug!(
                                    "CLIPBOARD: Found text from RTF: {} (type={})",
                                    clip_preview,
                                    clip_type
                                );
                            }
                        } else {
                            clip_content = trimmed.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = if is_url(&trimmed) {
                                "url"
                            } else if is_code_snippet(&trimmed) {
                                "code"
                            } else {
                                "text"
                            };
                            clip_preview = trimmed.chars().take(200).collect::<String>();
                            found_content = true;
                            log::debug!(
                                "CLIPBOARD: Found text: {} (type={})",
                                clip_preview,
                                clip_type
                            );
                        }
                    }
                }
            }

            // 4. RTF only when no plain text was available
            if !found_content && ctx.has(ContentFormat::Rtf) {
                if let Ok(rtf) = ctx.get_rich_text() {
                    let trimmed = rtf.trim();
                    if !trimmed.is_empty() {
                        let stripped = strip_rtf_tags(trimmed);
                        if is_trivial_rtf_plain(trimmed, &stripped) {
                            log::debug!(
                                "CLIPBOARD: Skipping trivial RTF clip (stripped={:?})",
                                stripped
                            );
                        } else if is_code_snippet(&stripped) {
                            // Code that arrived as RTF-only — store the readable snippet
                            clip_content = stripped.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = "code";
                            clip_preview = stripped.chars().take(200).collect::<String>();
                            metadata =
                                serde_json::json!({"format": "rtf", "converted": true}).to_string();
                            found_content = true;
                            log::debug!(
                                "CLIPBOARD: Found RTF code: {} (type={})",
                                clip_preview,
                                clip_type
                            );
                        } else {
                            clip_content = trimmed.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = "rtf";
                            clip_preview = stripped.chars().take(200).collect::<String>();
                            metadata = serde_json::json!({"format": "rtf"}).to_string();
                            found_content = true;
                            log::debug!(
                                "CLIPBOARD: Found RTF: {} (type={})",
                                clip_preview,
                                clip_type
                            );
                        }
                    }
                }
            }
        }

        // Fallback: plugin's read_text if ClipboardContext failed altogether
        if !found_content {
            if let Ok(text) = read_text().await {
                let trimmed = text.trim().to_string();
                if !trimmed.is_empty() {
                    let looks_like_rtf = trimmed.starts_with("{\\rtf");
                    let usable = if looks_like_rtf {
                        let plain = strip_rtf_tags(&trimmed);
                        if is_trivial_rtf_plain(&trimmed, &plain) {
                            String::new()
                        } else {
                            plain
                        }
                    } else {
                        trimmed
                    };
                    if !usable.is_empty() {
                        clip_content = usable.as_bytes().to_vec();
                        clip_hash = calculate_hash(&clip_content);
                        clip_type = if is_url(&usable) {
                            "url"
                        } else if is_code_snippet(&usable) {
                            "code"
                        } else {
                            "text"
                        };
                        clip_preview = usable.chars().take(200).collect::<String>();
                        found_content = true;
                        log::debug!(
                            "CLIPBOARD: Found text (fallback): {} (type={})",
                            clip_preview,
                            clip_type
                        );
                    }
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
        if let Some((ref last_hash, last_time)) = *lock {
            if last_hash == &clip_hash && last_time.elapsed() < std::time::Duration::from_millis(2000) {
                log::info!(
                    "CLIPBOARD: Ignoring duplicate clipboard event within debounce window for hash {}",
                    clip_hash
                );
                return;
            }
        }
        *lock = Some((clip_hash.clone(), std::time::Instant::now()));
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
        sqlx::query_scalar::<_, String>(r#"SELECT uuid FROM clips WHERE content_hash = ? AND folder_id IS NULL AND clip_type = ?"#)
            .bind(&clip_hash)
            .bind(clip_type)
            .fetch_optional(pool)
            .await
            .unwrap_or(None);
    let db_lookup_ms = db_lookup_started.elapsed().as_millis();

    let db_write_started = std::time::Instant::now();
    let emitted_id = if let Some(existing_id) = existing_uuid {
        was_existing = true;

        if clip_type == "image" {
            let _ = sqlx::query(
                r#"
                UPDATE clips
                SET created_at = CASE WHEN is_pinned = 1 THEN created_at ELSE CURRENT_TIMESTAMP END,
                    is_deleted = 0,
                    folder_id = NULL,
                    source_app = ?,
                    source_icon = ?,
                    content = ?,
                    text_preview = ?,
                    metadata = ?,
                    is_thumbnail = 0
                WHERE uuid = ?
                "#,
            )
            .bind(&source_app)
            .bind(&source_icon)
            .bind(&clip_content)
            .bind(&clip_preview)
            .bind(Some(metadata.clone()))
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
                SET created_at = CASE WHEN is_pinned = 1 THEN created_at ELSE CURRENT_TIMESTAMP END, 
                    is_deleted = 0, 
                    folder_id = NULL,
                    source_app = ?, 
                    source_icon = ? 
                WHERE uuid = ?
            "#)
                .bind(&source_app)
                .bind(&source_icon)
                .bind(&existing_id)
                .execute(pool)
                .await;
        }
        existing_id
    } else {
        let clip_uuid = Uuid::new_v4().to_string();

        let new_sort_order = sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM clips WHERE is_deleted = 0 AND folder_id IS NULL",
        )
            .fetch_one(pool)
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

    if let Err(e) = db.place_at_live_slot(&emitted_id).await {
        log::warn!("place_at_live_slot failed for {}: {}", emitted_id, e);
    }

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
            "source_app": source_app.clone(),
            "source_icon": source_icon.clone(),
            "created_at": chrono::Utc::now().to_rfc3339()
        }),
    );
    let emit_ms = emit_started.elapsed().as_millis();

    // Play sound if enabled
    if let Some(manager) = app.try_state::<Arc<crate::settings_manager::SettingsManager>>() {
        let settings = manager.get();
        if settings.clipboard_sound_enabled
            && (!was_existing || settings.duplicate_toast_enabled)
        {
            let sound_path = if was_existing {
                "default_duplicate".to_string()
            } else {
                settings.clipboard_sound_path.clone()
            };
            let _ = crate::commands::play_clipboard_sound(sound_path);
        }
        if settings.toast_enabled && (!was_existing || settings.duplicate_toast_enabled) {
            let msg = if clip_preview.is_empty() {
                "".to_string()
            } else if clip_preview.len() > 50 {
                format!("{}...", &clip_preview.chars().take(47).collect::<String>())
            } else {
                clip_preview.clone()
            };
            // Generate tiny thumbnail for image toasts
            let image_b64 = if clip_type == "image" {
                if let Some(bytes) = full_image_content.clone() {
                    tauri::async_runtime::spawn_blocking(move || {
                        image::load_from_memory(&bytes).ok().map(|img| {
                            let thumb = img.thumbnail(128, 128);
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
                    .await
                    .unwrap_or(None)
                } else {
                    None
                }
            } else {
                None
            };
            let toast_type_str = if was_existing {
                "duplicate".to_string()
            } else if is_cut {
                "cut".to_string()
            } else {
                "info".to_string()
            };
            let _ = crate::commands::show_toast(
                app.clone(),
                msg,
                toast_type_str,
                Some(clip_type.to_string()),
                image_b64,
                Some(emitted_id),
                source_app,
                source_icon,
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
unsafe fn get_parent_pid(process_handle: windows::Win32::Foundation::HANDLE) -> Option<u32> {
    type NtQueryInformationProcessFn = unsafe extern "system" fn(
        windows::Win32::Foundation::HANDLE,
        u32,
        *mut std::ffi::c_void,
        u32,
        *mut u32,
    ) -> i32;

    if let Ok(lib) = libloading::Library::new("ntdll.dll") {
        if let Ok(func) = lib.get::<NtQueryInformationProcessFn>(b"NtQueryInformationProcess") {
            #[repr(C)]
            struct PROCESS_BASIC_INFORMATION {
                exit_status: i32,
                peb_base_address: *mut std::ffi::c_void,
                affinity_mask: usize,
                base_priority: i32,
                unique_process_id: usize,
                inherited_from_unique_process_id: usize,
            }
            let mut pbi = std::mem::zeroed::<PROCESS_BASIC_INFORMATION>();
            let mut return_len = 0;
            let status = func(
                process_handle,
                0, // ProcessBasicInformation
                &mut pbi as *mut _ as *mut std::ffi::c_void,
                std::mem::size_of::<PROCESS_BASIC_INFORMATION>() as u32,
                &mut return_len,
            );
            if status >= 0 {
                return Some(pbi.inherited_from_unique_process_id as u32);
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn get_clipboard_owner_app_info() -> (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    bool,
) {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    use windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
    use windows::Win32::Foundation::CloseHandle;

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
        let mut exe_name = if name_size > 0 {
            String::from_utf16_lossy(&name_buffer[..name_size as usize])
        } else {
            String::new()
        };

        let mut path_buffer = [0u16; MAX_PATH as usize];
        let path_size = GetModuleFileNameExW(Some(process_handle), None, &mut path_buffer);
        let (mut app_name, mut app_icon, mut full_path) = if path_size > 0 {
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

        // If the process is Microsoft Edge WebView2, resolve its parent process (the host app) instead
        let is_webview = exe_name.to_lowercase() == "msedgewebview2.exe"
            || app_name.as_deref().unwrap_or("").to_lowercase().contains("webview2");

        if is_webview {
            if let Some(parent_pid) = get_parent_pid(process_handle) {
                if let Ok(parent_handle) = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                    false,
                    parent_pid,
                ) {
                    let mut p_name_buffer = [0u16; MAX_PATH as usize];
                    let p_name_size = GetModuleBaseNameW(parent_handle, None, &mut p_name_buffer);
                    if p_name_size > 0 {
                        let parent_exe = String::from_utf16_lossy(&p_name_buffer[..p_name_size as usize]);
                        
                        let mut p_path_buffer = [0u16; MAX_PATH as usize];
                        let p_path_size = GetModuleFileNameExW(Some(parent_handle), None, &mut p_path_buffer);
                        if p_path_size > 0 {
                            let parent_path_str = String::from_utf16_lossy(&p_path_buffer[..p_path_size as usize]);
                            let parent_desc = get_app_description(&parent_path_str);
                            
                            exe_name = parent_exe;
                            app_name = if let Some(d) = parent_desc {
                                Some(d)
                            } else {
                                Some(exe_name.clone())
                            };
                            app_icon = extract_icon(&parent_path_str);
                            full_path = Some(parent_path_str);
                        }
                    }
                    let _ = CloseHandle(parent_handle);
                }
            }
        }

        let _ = CloseHandle(process_handle);

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

/// Cheap URL detector. Recognises a single absolute URL (http/https/ftp/ftps/file)
/// with no whitespace. Designed to be O(n) and avoid allocations.
pub fn is_url(text: &str) -> bool {
    if text.is_empty() || text.len() > 2048 {
        return false;
    }
    // Whitespace or control chars ⇒ not a single URL
    if text.bytes().any(|b| b.is_ascii_whitespace() || b == 0) {
        return false;
    }
    const PREFIXES: &[&[u8]] = &[
        b"http://", b"https://", b"ftp://", b"ftps://", b"file://",
    ];
    let bytes = text.as_bytes();
    for prefix in PREFIXES {
        if bytes.len() > prefix.len() && bytes[..prefix.len()].eq_ignore_ascii_case(prefix) {
            return true;
        }
    }
    false
}

/// True when an RTF blob strips down to empty/noise (e.g. font table + a stray quote).
pub fn is_trivial_rtf_plain(original_rtf: &str, stripped: &str) -> bool {
    let t = stripped.trim();
    if t.is_empty() {
        return true;
    }
    let chars = t.chars().count();
    // Fat RTF envelope with almost no readable body
    if original_rtf.len() > 40 && chars <= 2 {
        return true;
    }
    // Tiny non-alphanumeric residue
    if chars < 8 && !t.chars().any(|c| c.is_alphanumeric()) {
        return true;
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

    // Shebang / PowerShell / common shell markers
    if trimmed.starts_with("#!")
        || trimmed.starts_with("$ ")
        || trimmed.starts_with("PS ")
        || trimmed.contains("$env:")
        || trimmed.contains("$_")
    {
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

    // Square brackets with quotes often indicate JSON / config
    if trimmed.contains("\":") || trimmed.contains("\": ") {
        score += 2;
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
        "<!DOCTYPE html>", "<html", "<body", "<head", "</html", "</body",
        "Get-", "Write-Host", "New-Object", "Invoke-",
    ];

    for op in &operators {
        if trimmed.contains(op) {
            score += 2;
        }
    }

    // Check for SQL keywords (uppercase once)
    let upper = trimmed.to_uppercase();
    let sql_keywords = ["SELECT ", "INSERT INTO ", "UPDATE ", "DELETE FROM ", " WHERE ", " JOIN ", " FROM "];
    let mut sql_matches = 0;
    for kw in &sql_keywords {
        if upper.contains(kw) {
            sql_matches += 1;
        }
    }
    if sql_matches >= 2 {
        score += 4;
    }

    // CLI Commands check
    let cli_prefixes = [
        "npm run ", "cargo run", "git commit ", "docker run ", "npm install ", "pip install ",
        "pnpm ", "yarn ", "kubectl ", "aws ", "gh ",
    ];
    for prefix in &cli_prefixes {
        if trimmed.starts_with(prefix) {
            score += 7;
        }
    }

    // Single line threshold is higher to prevent conversational lines matching
    let threshold = if total_lines == 1 { 7 } else { 5 };

    score >= threshold
}

/// Skip an RTF group starting at `i` (which must point at `{`), respecting nesting.
fn skip_rtf_group(bytes: &[u8], i: &mut usize) {
    if *i >= bytes.len() || bytes[*i] != b'{' {
        return;
    }
    let mut depth = 0usize;
    while *i < bytes.len() {
        match bytes[*i] {
            b'\\' => {
                *i += 1;
                if *i < bytes.len() {
                    // Skip escaped char or \'hh
                    if bytes[*i] == b'\'' && *i + 2 < bytes.len() {
                        *i += 3;
                    } else {
                        *i += 1;
                    }
                }
            }
            b'{' => {
                depth += 1;
                *i += 1;
            }
            b'}' => {
                *i += 1;
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    return;
                }
            }
            _ => *i += 1,
        }
    }
}

fn rtf_destination_at(bytes: &[u8], i: usize) -> bool {
    // i points at '{'
    if i + 1 >= bytes.len() {
        return false;
    }
    // {\* ...} — ignorable destination
    if bytes[i + 1] == b'\\' && i + 2 < bytes.len() && bytes[i + 2] == b'*' {
        return true;
    }
    if bytes[i + 1] != b'\\' {
        return false;
    }
    let mut j = i + 2;
    while j < bytes.len() && bytes[j].is_ascii_alphabetic() {
        j += 1;
    }
    let word = std::str::from_utf8(&bytes[i + 2..j]).unwrap_or("").to_ascii_lowercase();
    matches!(
        word.as_str(),
        "fonttbl"
            | "colortbl"
            | "stylesheet"
            | "info"
            | "pict"
            | "object"
            | "xe"
            | "tc"
            | "header"
            | "footer"
            | "footnote"
            | "annotation"
            | "field"
            | "fldinst"
            | "datafield"
            | "listtable"
            | "listoverridetable"
            | "rsidtbl"
            | "generator"
            | "themedata"
            | "colorschememapping"
            | "latentstyles"
            | "datastore"
            | "filetbl"
    )
}

pub fn strip_rtf_tags(rtf: &str) -> String {
    let mut out = String::new();
    let bytes = rtf.as_bytes();
    let mut i = 0;
    let mut last_was_space = true;

    let push_char = |out: &mut String, last_was_space: &mut bool, ch: char| {
        if ch == '\r' {
            return;
        }
        if ch == '\n' || ch == '\t' {
            if !*last_was_space && !out.is_empty() {
                out.push('\n');
                *last_was_space = true;
            }
            return;
        }
        if ch.is_whitespace() {
            if !*last_was_space {
                out.push(' ');
                *last_was_space = true;
            }
            return;
        }
        out.push(ch);
        *last_was_space = false;
    };

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
                            let ch = if code >= 32 && code != 127 {
                                code as char
                            } else {
                                ' '
                            };
                            push_char(&mut out, &mut last_was_space, ch);
                        }
                        i += 3;
                    }
                    b'\'' => {
                        i += 1;
                    }
                    b'\\' | b'{' | b'}' => {
                        push_char(&mut out, &mut last_was_space, bytes[i] as char);
                        i += 1;
                    }
                    b'~' => {
                        push_char(&mut out, &mut last_was_space, ' ');
                        i += 1;
                    }
                    b'_' => {
                        push_char(&mut out, &mut last_was_space, '-');
                        i += 1;
                    }
                    b'*' => {
                        i += 1;
                    }
                    b'\n' | b'\r' => {
                        // Soft line break in RTF source — ignore
                        i += 1;
                    }
                    _ if bytes[i].is_ascii_alphabetic() => {
                        let start = i;
                        i += 1;
                        while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
                            i += 1;
                        }
                        let word =
                            std::str::from_utf8(&bytes[start..i]).unwrap_or("").to_ascii_lowercase();
                        // Numeric argument
                        while i < bytes.len() && (bytes[i] == b'-' || bytes[i].is_ascii_digit()) {
                            i += 1;
                        }
                        // Control-word delimiter space
                        if i < bytes.len() && bytes[i] == b' ' {
                            i += 1;
                        }
                        // Paragraph / line breaks become newlines in plain text
                        if matches!(word.as_str(), "par" | "line" | "softline") {
                            push_char(&mut out, &mut last_was_space, '\n');
                        } else if word == "tab" {
                            push_char(&mut out, &mut last_was_space, '\t');
                        }
                    }
                    _ => {
                        i += 1;
                    }
                }
            }
            b'{' => {
                if rtf_destination_at(bytes, i) {
                    skip_rtf_group(bytes, &mut i);
                } else {
                    i += 1;
                }
            }
            b'}' => {
                i += 1;
            }
            b'\r' => {
                i += 1;
            }
            b'\n' => {
                i += 1;
            }
            _ => {
                push_char(&mut out, &mut last_was_space, bytes[i] as char);
                i += 1;
            }
        }
    }

    // Collapse runs of blank lines
    let cleaned: String = out
        .lines()
        .map(str::trim_end)
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    cleaned.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_rtf_skips_font_table() {
        let rtf = r#"{\rtf1\ansi\deff0{\fonttbl{\f0\fmodern\fprq1 Lucida Console;}}\f0\fs18{\colortbl;\red191\green191\blue191;\red0\green0\blue0;}\cf2 \highlight1 fn main() {\par     println!("hi");\par }}"#;
        let plain = strip_rtf_tags(rtf);
        assert!(!plain.contains("Lucida Console"), "got: {plain}");
        assert!(plain.contains("fn main"), "got: {plain}");
        assert!(plain.contains("println"), "got: {plain}");
    }

    #[test]
    fn strip_rtf_empty_font_only() {
        let rtf = r#"{\rtf1\ansi\deff0{\fonttbl{\f0\fmodern\fprq1 Lucida Console;}}\f0\fs18}"#;
        let plain = strip_rtf_tags(rtf);
        assert!(!plain.contains("Lucida"), "got: {plain}");
    }

    #[test]
    fn detects_rust_snippet() {
        assert!(is_code_snippet("fn main() {\n    println!(\"hi\");\n}"));
    }

    #[test]
    fn rejects_short_prose() {
        assert!(!is_code_snippet("Hello there"));
    }

    #[test]
    fn trivial_rtf_quote_only_is_skipped() {
        let rtf = r#"{\rtf1\ansi\deff0{\fonttbl{\f0\fmodern\fprq1 Lucida Console;}}\f0\fs18{\colortbl;\red191\green191\blue191;\red0\green0\blue0;}\cf2 \highlight1 "}"#;
        let plain = strip_rtf_tags(rtf);
        assert!(is_trivial_rtf_plain(rtf, &plain), "plain={plain:?}");
    }

    #[test]
    fn strip_rtf_user_fonttbl_garbage() {
        let rtf = r#"{\rtf1\ansi\deff0{\fonttbl{\f0\fmodern\fprq1 Lucida Console;}}\f0\fs18{\colortbl;\red191\green191\blue191;\red0\green0\blue0;}\cf2 \highlight1 "}"#;
        let plain = strip_rtf_tags(rtf);
        assert!(!plain.contains("Lucida Console"), "got: {plain}");
        assert!(!plain.contains("fonttbl"), "got: {plain}");
    }

    #[test]
    fn rtf_markup_as_plain_text_is_stripped_before_classify() {
        let rtf = r#"{\rtf1\ansi\deff0{\fonttbl{\f0\fmodern Lucida Console;}}\f0 fn main() {\par     println!("x");\par }}"#;
        assert!(rtf.starts_with("{\\rtf"));
        let plain = strip_rtf_tags(rtf);
        assert!(is_code_snippet(&plain), "plain={plain}");
    }

    fn solid_rgba(width: u32, height: u32, pixel: [u8; 4]) -> Vec<u8> {
        pixel
            .iter()
            .cycle()
            .take((width * height * 4) as usize)
            .copied()
            .collect()
    }

    #[test]
    fn image_hash_includes_dimensions() {
        let red = [255, 0, 0, 255];
        let a = calculate_image_hash(100, 100, &solid_rgba(100, 100, red));
        let b = calculate_image_hash(50, 200, &solid_rgba(50, 200, red));
        assert_ne!(
            a, b,
            "same pixel bytes at different sizes must not collide"
        );
    }

    #[test]
    fn image_hash_distinguishes_pixels_at_same_size() {
        let a = calculate_image_hash(16, 16, &solid_rgba(16, 16, [10, 20, 30, 255]));
        let b = calculate_image_hash(16, 16, &solid_rgba(16, 16, [10, 20, 31, 255]));
        assert_ne!(a, b);
    }

    #[test]
    fn image_hash_is_stable_for_identical_rgba() {
        let pixels = solid_rgba(8, 8, [1, 2, 3, 255]);
        assert_eq!(
            calculate_image_hash(8, 8, &pixels),
            calculate_image_hash(8, 8, &pixels)
        );
    }

    #[test]
    fn validated_rgba8_rejects_empty_image() {
        assert!(validated_rgba8(0, 0, vec![]).is_err());
        assert!(validated_rgba8(2, 2, vec![0; 3]).is_err());
    }

    #[test]
    fn validated_rgba8_accepts_matching_buffer() {
        let (w, h, bytes) = validated_rgba8(1, 1, vec![1, 2, 3, 255]).expect("valid");
        assert_eq!((w, h), (1, 1));
        assert_eq!(bytes, vec![1, 2, 3, 255]);
    }
}
