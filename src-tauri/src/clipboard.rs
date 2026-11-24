use tauri::{AppHandle, Emitter, Listener};
// Import functions directly from the crate root
use crate::database::Database;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use clipboard_rs::common::RustImage;
use clipboard_rs::{Clipboard, ClipboardContent, ClipboardContext, ContentFormat};
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
static IGNORE_HASH: Lazy<parking_lot::Mutex<Option<(String, std::time::Instant)>>> =
    Lazy::new(|| parking_lot::Mutex::new(None));
static LAST_STABLE_HASH: Lazy<parking_lot::Mutex<Option<(String, std::time::Instant)>>> =
    Lazy::new(|| parking_lot::Mutex::new(None));
pub static CLIPBOARD_SYNC: Lazy<Arc<tokio::sync::Mutex<()>>> =
    Lazy::new(|| Arc::new(tokio::sync::Mutex::new(())));

static DEBOUNCE_COUNTER: AtomicU64 = AtomicU64::new(0);

pub fn set_ignore_hash(hash: String) {
    let mut lock = IGNORE_HASH.lock();
    *lock = Some((hash, std::time::Instant::now()));
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
        if crate::app_lock::should_skip_capture() {
            log::info!("CLIPBOARD: App lock is pausing capture, ignoring event.");
            return;
        }
        let app = app_clone.clone();
        let db = db_clone.clone();
        let is_cut = detect_if_cut_key_pressed();

        // DEBOUNCE LOGIC:
        let current_count = DEBOUNCE_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;
        let source_snapshot = capture_clipboard_source_snapshot();

        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(150)).await;

            if DEBOUNCE_COUNTER.load(Ordering::SeqCst) != current_count {
                log::debug!(
                    "CLIPBOARD: Debounce: Aborting older event, current_count:{}",
                    current_count
                );
                return;
            }

            let source_app_info = tauri::async_runtime::spawn_blocking(move || {
                resolve_clipboard_source_snapshot(&source_snapshot)
            })
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

enum ClipboardImageReadError {
    Limit(crate::content_limits::ImageLimitExceeded),
    Other(String),
}

fn should_read_clipboard_image(
    source: &SourceAppInfo,
    is_cut: bool,
    has: impl Fn(ContentFormat) -> bool,
) -> bool {
    let (_, _, exe_name, _, is_explicit_owner) = source;
    !has(ContentFormat::Files)
        || (!is_cut
            && (has(ContentFormat::Other(HISTORY_IMAGE_FORMAT.into()))
                || (*is_explicit_owner
                    && exe_name
                        .as_deref()
                        .is_some_and(|name| name.eq_ignore_ascii_case("CyberSnap.exe"))))
            && has(ContentFormat::Other("PNG".into())))
}

pub fn normalize_file_path(p: &str) -> String {
    let trimmed = p.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let path = std::path::Path::new(trimmed);
    if let Ok(canonical) = std::fs::canonicalize(path) {
        let mut s = canonical.to_string_lossy().to_string();
        if let Some(stripped) = s.strip_prefix(r"\\?\") {
            s = stripped.to_string();
        }
        return s;
    }
    let normalized = trimmed.replace('/', "\\");
    if normalized.len() >= 2 && normalized.as_bytes()[1] == b':' {
        let drive = normalized.chars().next().unwrap().to_ascii_uppercase();
        format!("{}{}", drive, &normalized[1..])
    } else {
        normalized
    }
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
    max_image_bytes: i64,
) -> Result<ClipboardImageRead, ClipboardImageReadError> {
    let ctx = ClipboardContext::new().map_err(|e| ClipboardImageReadError::Other(e.to_string()))?;
    let image = ctx
        .get_image()
        .map_err(|e| ClipboardImageReadError::Other(e.to_string()))?;
    let (width, height) = image.get_size();
    crate::content_limits::validate_image_dimensions(width, height)
        .map_err(ClipboardImageReadError::Limit)?;

    let png_bytes = image
        .to_png()
        .map_err(|e| ClipboardImageReadError::Other(e.to_string()))?
        .get_bytes()
        .to_vec();

    crate::content_limits::validate_image_bytes(
        width,
        height,
        &png_bytes,
        max_image_bytes,
    )
    .map_err(ClipboardImageReadError::Limit)?;

    let rgba_image = image
        .to_rgba8()
        .map_err(|e| ClipboardImageReadError::Other(e.to_string()))?;
    let (width, height, rgba) = validated_rgba8(width, height, rgba_image.into_raw())
        .map_err(ClipboardImageReadError::Other)?;
    let raw_hash = calculate_image_hash(width, height, &rgba);

    Ok(ClipboardImageRead {
        png_bytes,
        width,
        height,
        raw_hash,
        decode_ms: 0,
        source_type,
    })
}

fn read_clipboard_image_fast(
    max_image_bytes: i64,
) -> Result<ClipboardImageRead, ClipboardImageReadError> {
    read_clipboard_image_with_clipboard_rs("clipboard-rs-image", max_image_bytes)
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
    // Rich clipboard flavors (RTF/HTML) captured alongside the plain text —
    // stored as an invisible side channel and written back on paste.
    let mut rich_rtf_candidate: Option<String> = None;
    let mut rich_html_candidate: Option<String> = None;
    let max_image_bytes = app
        .try_state::<Arc<crate::settings_manager::SettingsManager>>()
        .map(|manager| manager.get().max_clipboard_image_bytes)
        .unwrap_or_else(crate::content_limits::default_max_clipboard_image_bytes);

    // Explorer and Office can attach a thumbnail to a file copy. CyberSnap's
    // explicit PNG, on the other hand, is the actual capture alongside the file.
    let read_image = ClipboardContext::new()
        .map(|ctx| should_read_clipboard_image(&source_app_info, is_cut, |format| ctx.has(format)))
        .unwrap_or(true);
    log::debug!("CLIPBOARD: Attempting to read image from clipboard");
    let image_read_started = std::time::Instant::now();
    if read_image {
        match read_clipboard_image_fast(max_image_bytes) {
            Ok(read_image_result) => {
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
            Err(ClipboardImageReadError::Limit(limit_error)) => {
                log::warn!(
                    "CLIPBOARD: Skipping image because it exceeded the {} limit",
                    limit_error.reason
                );
                let _ = crate::commands::show_image_limit_toast(app.clone(), limit_error).await;
                return;
            }
            Err(ClipboardImageReadError::Other(error)) => {
                log::debug!("CLIPBOARD: Image format unavailable: {}", error);
            }
        }
    }

    if !found_content {
        let rich_read_started = std::time::Instant::now();

        // Use a single ClipboardContext for all format checks (files, HTML, RTF, text)
        if let Ok(ctx) = ClipboardContext::new() {
            // 1. Try Files (CF_HDROP) — must be before text: Explorer sets both
            if ctx.has(ContentFormat::Files) {
                if let Ok(files) = ctx.get_files() {
                    let mut files: Vec<String> = files
                        .into_iter()
                        .map(|f| normalize_file_path(&f))
                        .filter(|f| !f.is_empty())
                        .collect();
                    files.sort();
                    files.dedup();
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

            // 2. Text / HTML format evaluation
            // When a user copies on the web or in applications, browsers place BOTH text/plain and text/html on the clipboard.
            // Almost always, the user intends to copy the visible text, NOT the internal HTML DOM wrapper.
            // Rich flavor candidates for the invisible side channel (text-family
            // clips only; structural html clips already carry their own flavor).
            rich_rtf_candidate = if ctx.has(ContentFormat::Rtf) {
                ctx.get_rich_text()
                    .ok()
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty())
            } else {
                None
            };
            rich_html_candidate = if ctx.has(ContentFormat::Html) {
                ctx.get_html()
                    .ok()
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty())
            } else {
                None
            };
            log::debug!(
                "CLIPBOARD: Rich candidates read: rtf_some={} rtf_len={} html_some={} html_len={}",
                rich_rtf_candidate.is_some(),
                rich_rtf_candidate.as_ref().map(|t| t.len()).unwrap_or(0),
                rich_html_candidate.is_some(),
                rich_html_candidate.as_ref().map(|t| t.len()).unwrap_or(0)
            );

            // We only classify as HTML if:
            //   a) HTML contains structural rich elements (table, img, iframe, etc.) that cannot be represented as text, OR
            //   b) No plain text was provided and HTML is present.
            if !found_content {
                let maybe_html = if ctx.has(ContentFormat::Html) {
                    ctx.get_html().ok().map(|h| h.trim().to_string()).filter(|h| !h.is_empty())
                } else {
                    None
                };

                let maybe_text = if ctx.has(ContentFormat::Text) {
                    ctx.get_text().ok().map(|t| t.trim().to_string()).filter(|t| !t.is_empty())
                } else {
                    None
                };

                if let Some(text) = maybe_text {
                    let looks_like_rtf = text.starts_with("{\\rtf");
                    if looks_like_rtf {
                        let plain = strip_rtf_tags(&text);
                        if is_trivial_rtf_plain(&text, &plain) {
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
                        // Check if HTML is present AND has actual structural richness (e.g. table, img)
                        let is_structural_html = maybe_html.as_deref().map(is_structural_rich_html).unwrap_or(false);

                        if is_structural_html {
                            let html = maybe_html.unwrap();
                            clip_content = html.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = "code";
                            clip_preview = strip_html_tags(&html)
                                .chars()
                                .take(200)
                                .collect::<String>();
                            metadata =
                                serde_json::json!({"format": "html", "language": "html"}).to_string();
                            found_content = true;
                            log::debug!("CLIPBOARD: Found structural rich HTML: {}", clip_preview);
                        } else {
                            clip_content = text.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = if is_url(&text) {
                                "url"
                            } else if is_code_snippet(&text) {
                                "code"
                            } else {
                                "text"
                            };
                            clip_preview = text.chars().take(200).collect::<String>();
                            found_content = true;
                            log::debug!(
                                "CLIPBOARD: Found text: {} (type={})",
                                clip_preview,
                                clip_type
                            );
                        }
                    }
                } else if let Some(html) = maybe_html {
                    // HTML available but NO plain text was offered
                    if is_rich_html(&html) {
                        clip_content = html.as_bytes().to_vec();
                        clip_hash = calculate_hash(&clip_content);
                        clip_type = "code";
                        clip_preview = strip_html_tags(&html)
                            .chars()
                            .take(200)
                            .collect::<String>();
                        metadata =
                            serde_json::json!({"format": "html", "language": "html"}).to_string();
                        found_content = true;
                        log::debug!("CLIPBOARD: Found standalone HTML: {}", clip_preview);
                    } else {
                        let plain = strip_html_tags(&html);
                        let trimmed = plain.trim();
                        if !trimmed.is_empty() {
                            clip_content = trimmed.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = if is_url(trimmed) {
                                "url"
                            } else if is_code_snippet(trimmed) {
                                "code"
                            } else {
                                "text"
                            };
                            clip_preview = trimmed.chars().take(200).collect::<String>();
                            found_content = true;
                            log::debug!("CLIPBOARD: Converted HTML to text: {}", clip_preview);
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
                            clip_content = stripped.as_bytes().to_vec();
                            clip_hash = calculate_hash(&clip_content);
                            clip_type = if is_url(&stripped) {
                                "url"
                            } else {
                                "text"
                            };
                            clip_preview = stripped.chars().take(200).collect::<String>();
                            metadata =
                                serde_json::json!({"format": "rtf", "converted": true}).to_string();
                            found_content = true;
                            log::debug!(
                                "CLIPBOARD: Found RTF converted to text: {} (type={})",
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

    // Apps such as OpenCode put a styled HTML wrapper on the clipboard for a
    // plain sentence. Keep that sentence, not the stylesheet.
    if let Some((plain, kind, preview)) =
        collapse_presentation_html(clip_type, &clip_content)
    {
        clip_content = plain.into_bytes();
        clip_hash = calculate_hash(&clip_content);
        clip_type = kind;
        clip_preview = preview;
        metadata = String::new();
    }

    let max_text_bytes = app
        .try_state::<Arc<crate::settings_manager::SettingsManager>>()
        .map(|manager| manager.get().max_clipboard_text_bytes)
        .unwrap_or_else(crate::content_limits::default_max_clipboard_text_bytes);
    if let Err(limit_error) =
        crate::content_limits::validate_text_content(clip_type, &clip_content, max_text_bytes)
    {
        log::warn!(
            "CLIPBOARD: Skipping {} payload of {} bytes because it exceeds the {} byte limit",
            limit_error.clip_type,
            limit_error.content_bytes,
            limit_error.limit_bytes
        );
        let _ = crate::commands::show_content_limit_toast(app.clone(), limit_error).await;
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
    let mut is_self_paste = false;
    {
        let lock = IGNORE_HASH.lock();
        if let Some((ref ignore_hash, timestamp)) = *lock {
            if ignore_hash == &clip_hash && timestamp.elapsed() < std::time::Duration::from_millis(4000) {
                log::info!(
                    "CLIPBOARD: Detected self-paste/self-copy for hash {}",
                    ignore_hash
                );
                is_self_paste = true;
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

    let is_cyberpaste_name = |name: &str| {
        let n = name.trim().to_lowercase();
        n == "cyberpaste" || n == "cyberpaste.exe" || n.starts_with("cyberpaste")
    };
    let is_self_app = is_self_paste
        || source_app.as_deref().map(is_cyberpaste_name).unwrap_or(false)
        || exe_name.as_deref().map(is_cyberpaste_name).unwrap_or(false)
        || full_path.as_deref().map(|p| p.to_lowercase().contains("cyberpaste")).unwrap_or(false);

    // Check settings (cached via SettingsManager)
    use crate::settings_manager::SettingsManager;
    use tauri::Manager;
    let manager = app.state::<Arc<SettingsManager>>();
    let settings = manager.get();

    // Rich clipboard flavors (RTF/HTML) for text-family clips: stored as an
    // invisible side channel and written back on paste so rich targets
    // (Word, browsers) restore the original formatting.
    let mut rich_rtf: Option<String> = None;
    let mut rich_html: Option<String> = None;
    if settings.preserve_rich_clipboard
        && (clip_type == "text" || clip_type == "url" || clip_type == "code")
    {
        if let Some(rtf) = &rich_rtf_candidate {
            let stripped = strip_rtf_tags(rtf);
            let trivial = is_trivial_rtf_plain(rtf, &stripped);
            let formatted = rtf_has_formatting(rtf);
            log::debug!(
                "CLIPBOARD: RTF gate: trivial={} formatted={} len={}",
                trivial,
                formatted,
                rtf.len()
            );
            if !trivial && formatted && (rtf.len() as i64) <= settings.max_clipboard_text_bytes {
                rich_rtf = Some(rtf.clone());
            }
        }
        if let Some(html) = &rich_html_candidate {
            let plain = String::from_utf8_lossy(&clip_content);
            if html.contains('<') && html.contains('>') && *html != plain {
                if (html.len() as i64) <= settings.max_clipboard_text_bytes {
                    rich_html = Some(html.clone());
                }
            }
        }
    }

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
                    source_app = CASE WHEN ? THEN source_app ELSE ? END,
                    source_icon = CASE WHEN ? THEN source_icon ELSE ? END,
                    content = ?,
                    text_preview = ?,
                    metadata = ?,
                    is_thumbnail = 0
                WHERE uuid = ?
                "#,
            )
            .bind(is_self_app)
            .bind(&source_app)
            .bind(is_self_app)
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
            let metadata_opt = if metadata.is_empty() {
                None
            } else {
                Some(metadata.clone())
            };
            let _ = sqlx::query(r#"
                UPDATE clips 
                SET created_at = CASE WHEN is_pinned = 1 THEN created_at ELSE CURRENT_TIMESTAMP END, 
                    is_deleted = 0, 
                    folder_id = NULL,
                    source_app = CASE WHEN ? THEN source_app ELSE ? END, 
                    source_icon = CASE WHEN ? THEN source_icon ELSE ? END,
                    metadata = COALESCE(NULLIF(metadata, ''), ?)
                WHERE uuid = ?
            "#)
                .bind(is_self_app)
                .bind(&source_app)
                .bind(is_self_app)
                .bind(&source_icon)
                .bind(metadata_opt)
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

        let metadata_opt = if metadata.is_empty() {
            None
        } else {
            Some(metadata.clone())
        };
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
        .bind(metadata_opt)
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

    // Persist (or clear) the rich flavor side channel for text-family clips.
    // The latest capture always wins: re-copying the same text without
    // formatting clears the stored flavor.
    if clip_type == "text" || clip_type == "url" || clip_type == "code" {
        log::debug!(
            "CLIPBOARD: Persisting rich side channel: rtf={} html={}",
            rich_rtf.is_some(),
            rich_html.is_some()
        );
        if settings.preserve_rich_clipboard {
            let _ = sqlx::query(
                r#"
                INSERT OR REPLACE INTO clip_rich (clip_uuid, rtf, html, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                "#,
            )
            .bind(&emitted_id)
            .bind(rich_rtf.as_deref().map(|s| s.as_bytes()))
            .bind(rich_html.as_deref().map(|s| s.as_bytes()))
            .execute(&db.pool)
            .await;
        } else {
            let _ =
                sqlx::query("DELETE FROM clip_rich WHERE clip_uuid = ?")
                    .bind(&emitted_id)
                    .execute(&db.pool)
                    .await;
        }
    }

    if let Err(e) = db.place_at_live_slot(&emitted_id).await {
        log::warn!("place_at_live_slot failed for {}: {}", emitted_id, e);
    }

    if !was_existing {
        crate::progress::record_event_for_app(
            &app,
            &db.pool,
            crate::progress::ProgressEvent::ClipCaptured {
                clip_type: clip_type.to_string(),
            },
        )
        .await;
    }

    // If max_items limit is active, prune oldest unpinned clips before emitting
    // so the database count never exceeds max_items and frontend counts stay perfectly in sync.
    if settings.max_items > 0 {
        let _ = crate::commands::prune_history(&db.pool, settings.max_items).await;
    }

    // Enforce background expiration and storage quota policies
    let app_for_policy = app.clone();
    let database_for_policy = db.clone();
    let settings_for_policy = settings.clone();
    let _ = crate::models::get_runtime().unwrap().spawn(async move {
        let _ = crate::commands::enforce_storage_policy(
            app_for_policy,
            database_for_policy,
            settings_for_policy,
        )
        .await;
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
            && !crate::quiet_hours::is_active(&settings)
            && !settings.notifications_paused()
            && (!was_existing || settings.duplicate_toast_enabled)
            && !(was_existing && is_self_app)
        {
            let sound_path = if was_existing {
                "default_duplicate".to_string()
            } else {
                settings.clipboard_sound_path.clone()
            };
            let _ = crate::commands::play_clipboard_sound(sound_path);
        }
        let should_show_toast = if is_self_app {
            false
        } else if was_existing {
            settings.duplicate_toast_enabled
        } else {
            settings.toast_enabled
        };
        if should_show_toast {
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
                None,
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
struct ClipboardSourceSnapshot {
    owner: Option<WindowSnapshot>,
    foreground: Option<WindowSnapshot>,
}

#[cfg(target_os = "windows")]
struct WindowSnapshot {
    process_id: u32,
    title: String,
    class_name: String,
    focus_process_id: u32,
}

#[cfg(target_os = "windows")]
struct ProcessAppInfo {
    app_name: Option<String>,
    app_icon: Option<String>,
    exe_name: Option<String>,
    full_path: Option<String>,
}

#[cfg(target_os = "windows")]
impl ProcessAppInfo {
    fn into_source_app_info(self, is_explicit: bool) -> SourceAppInfo {
        (
            self.app_name,
            self.app_icon,
            self.exe_name,
            self.full_path,
            is_explicit,
        )
    }
}

fn is_windows_service_host(exe_name: Option<&str>) -> bool {
    exe_name.is_some_and(|name| name.eq_ignore_ascii_case("svchost.exe"))
}

fn is_application_frame_host(exe_name: Option<&str>, class_name: &str) -> bool {
    exe_name.is_some_and(|name| name.eq_ignore_ascii_case("ApplicationFrameHost.exe"))
        || class_name.eq_ignore_ascii_case("ApplicationFrameWindow")
}

fn frame_app_name(title: &str, fallback: Option<String>) -> Option<String> {
    if title.trim().is_empty() {
        fallback
    } else {
        Some(title.trim().to_owned())
    }
}

#[cfg(target_os = "windows")]
fn snapshot_window(hwnd: windows::Win32::Foundation::HWND) -> Option<WindowSnapshot> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetGUIThreadInfo, GetWindowTextW, GetWindowThreadProcessId, GUITHREADINFO,
    };

    unsafe {
        if hwnd.is_invalid() {
            return None;
        }

        let mut process_id = 0;
        let thread_id = GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        if process_id == 0 {
            return None;
        }

        let mut title_buffer = [0u16; 512];
        let title_size = GetWindowTextW(hwnd, &mut title_buffer);
        let title = if title_size > 0 {
            String::from_utf16_lossy(&title_buffer[..title_size as usize])
        } else {
            String::new()
        };

        let mut class_buffer = [0u16; 256];
        let class_size = GetClassNameW(hwnd, &mut class_buffer);
        let class_name = if class_size > 0 {
            String::from_utf16_lossy(&class_buffer[..class_size as usize])
        } else {
            String::new()
        };

        let mut focus_process_id = 0;
        if class_name.eq_ignore_ascii_case("ApplicationFrameWindow") && thread_id != 0 {
            let mut info = GUITHREADINFO {
                cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
                ..Default::default()
            };
            if GetGUIThreadInfo(thread_id, &mut info).is_ok() && !info.hwndFocus.is_invalid() {
                let mut focus_pid = 0;
                GetWindowThreadProcessId(info.hwndFocus, Some(&mut focus_pid));
                if focus_pid != 0 && focus_pid != process_id {
                    focus_process_id = focus_pid;
                }
            }
        }

        Some(WindowSnapshot {
            process_id,
            title,
            class_name,
            focus_process_id,
        })
    }
}

#[cfg(target_os = "windows")]
fn capture_clipboard_source_snapshot() -> ClipboardSourceSnapshot {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    unsafe {
        let owner_hwnd = GetClipboardOwner().unwrap_or_default();
        ClipboardSourceSnapshot {
            owner: snapshot_window(owner_hwnd),
            foreground: snapshot_window(GetForegroundWindow()),
        }
    }
}

#[cfg(not(target_os = "windows"))]
struct ClipboardSourceSnapshot;

#[cfg(not(target_os = "windows"))]
fn capture_clipboard_source_snapshot() -> ClipboardSourceSnapshot {
    ClipboardSourceSnapshot
}

#[cfg(target_os = "windows")]
fn get_process_app_info(process_id: u32) -> Option<ProcessAppInfo> {
    use windows::Win32::Foundation::CloseHandle;

    unsafe {
        let process_handle = match OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            process_id,
        ) {
            Ok(handle) => handle,
            Err(_) => return None,
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
            let final_name = if let Some(description) = desc {
                Some(description)
            } else if !exe_name.is_empty() {
                Some(exe_name.clone())
            } else {
                None
            };
            let icon = get_app_icon(&full_path_str);
            (final_name, icon, Some(full_path_str))
        } else if !exe_name.is_empty() {
            (Some(exe_name.clone()), None, None)
        } else {
            (None, None, None)
        };

        let is_webview = exe_name.eq_ignore_ascii_case("msedgewebview2.exe")
            || app_name
                .as_deref()
                .unwrap_or("")
                .to_lowercase()
                .contains("webview2");

        if is_webview {
            if let Some(parent_pid) = get_parent_pid(process_handle) {
                if let Ok(parent_handle) = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                    false,
                    parent_pid,
                ) {
                    let mut parent_name_buffer = [0u16; MAX_PATH as usize];
                    let parent_name_size =
                        GetModuleBaseNameW(parent_handle, None, &mut parent_name_buffer);
                    if parent_name_size > 0 {
                        let parent_exe =
                            String::from_utf16_lossy(&parent_name_buffer[..parent_name_size as usize]);
                        let mut parent_path_buffer = [0u16; MAX_PATH as usize];
                        let parent_path_size =
                            GetModuleFileNameExW(Some(parent_handle), None, &mut parent_path_buffer);
                        if parent_path_size > 0 {
                            let parent_path_str =
                                String::from_utf16_lossy(&parent_path_buffer[..parent_path_size as usize]);
                            let parent_desc = get_app_description(&parent_path_str);
                            exe_name = parent_exe;
                            app_name = if let Some(description) = parent_desc {
                                Some(description)
                            } else {
                                Some(exe_name.clone())
                            };
                            app_icon = get_app_icon(&parent_path_str);
                            full_path = Some(parent_path_str);
                        }
                    }
                    let _ = CloseHandle(parent_handle);
                }
            }
        }

        let _ = CloseHandle(process_handle);
        Some(ProcessAppInfo {
            app_name,
            app_icon,
            exe_name: if exe_name.is_empty() {
                None
            } else {
                Some(exe_name)
            },
            full_path,
        })
    }
}

#[cfg(target_os = "windows")]
fn get_window_app_info(window: &WindowSnapshot) -> Option<ProcessAppInfo> {
    let mut process_info = get_process_app_info(window.process_id)?;
    if is_application_frame_host(process_info.exe_name.as_deref(), &window.class_name) {
        if window.focus_process_id != 0 {
            if let Some(mut focused_info) = get_process_app_info(window.focus_process_id) {
                focused_info.app_name =
                    frame_app_name(&window.title, focused_info.app_name.take());
                return Some(focused_info);
            }
        }
        process_info.app_name = frame_app_name(&window.title, process_info.app_name.take());
    }
    Some(process_info)
}

#[cfg(target_os = "windows")]
fn resolve_clipboard_source_snapshot(snapshot: &ClipboardSourceSnapshot) -> SourceAppInfo {
    let foreground_info = || snapshot.foreground.as_ref().and_then(get_window_app_info);
    let Some(owner_window) = snapshot.owner.as_ref() else {
        return foreground_info()
            .map(|info| info.into_source_app_info(false))
            .unwrap_or((None, None, None, None, false));
    };
    let Some(owner_info) = get_process_app_info(owner_window.process_id) else {
        return foreground_info()
            .map(|info| info.into_source_app_info(false))
            .unwrap_or((None, None, None, None, false));
    };

    if is_windows_service_host(owner_info.exe_name.as_deref()) {
        log::info!(
            "CLIPBOARD: Owner {:?} is a Windows service host; using foreground {:?}",
            owner_info.exe_name,
            snapshot
                .foreground
                .as_ref()
                .map(|window| (&window.title, window.process_id))
        );
        return foreground_info()
            .map(|info| info.into_source_app_info(true))
            .unwrap_or((None, None, None, None, false));
    }

    let source_info =
        if is_application_frame_host(owner_info.exe_name.as_deref(), &owner_window.class_name) {
            get_window_app_info(owner_window)
        } else {
            Some(owner_info)
        };
    source_info
        .map(|info| info.into_source_app_info(true))
        .unwrap_or((None, None, None, None, false))
}

#[cfg(not(target_os = "windows"))]
fn resolve_clipboard_source_snapshot(_snapshot: &ClipboardSourceSnapshot) -> SourceAppInfo {
    (None, None, None, None, false)
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

fn visual_elements_logo(element: &quick_xml::events::BytesStart) -> Option<String> {
    let mut fallback = None;
    for attribute in element.attributes().filter_map(Result::ok) {
        let key = attribute.key.local_name();
        if !matches!(key.as_ref(), b"Square44x44Logo" | b"Square150x150Logo") {
            continue;
        }
        let value = attribute.unescape_value().ok()?.into_owned();
        if key.as_ref() == b"Square44x44Logo" {
            return Some(value);
        }
        fallback.get_or_insert(value);
    }
    fallback
}

#[derive(Default)]
struct PackageApplicationManifest {
    executable: String,
    aliases: Vec<String>,
    logo: Option<String>,
}

#[derive(Default)]
struct PackageManifest {
    identity_name: Option<String>,
    display_name: Option<String>,
    applications: Vec<PackageApplicationManifest>,
}

fn manifest_attribute(
    element: &quick_xml::events::BytesStart,
    name: &str,
) -> Option<String> {
    element
        .attributes()
        .filter_map(Result::ok)
        .find(|attribute| attribute.key.local_name().as_ref() == name.as_bytes())
        .and_then(|attribute| attribute.unescape_value().ok())
        .map(|value| value.into_owned())
}

fn push_manifest_application(
    manifest: &mut PackageManifest,
    element: &quick_xml::events::BytesStart,
) -> usize {
    let executable = manifest_attribute(element, "Executable").unwrap_or_default();
    let mut aliases = Vec::new();
    if !executable.is_empty() {
        aliases.push(executable.clone());
    }
    manifest.applications.push(PackageApplicationManifest {
        executable,
        aliases,
        logo: None,
    });
    manifest.applications.len() - 1
}

fn add_visual_elements(
    manifest: &mut PackageManifest,
    application: usize,
    element: &quick_xml::events::BytesStart,
) {
    let application = &mut manifest.applications[application];
    if let Some(display_name) = manifest_attribute(element, "DisplayName") {
        application.aliases.push(display_name);
    }
    application.logo = visual_elements_logo(element);
}

fn parse_package_manifest(source: &str) -> Option<PackageManifest> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(source);
    let mut buffer = Vec::new();
    let mut manifest = PackageManifest::default();
    let mut application = None;
    let mut in_properties = false;
    let mut in_display_name = false;

    loop {
        match reader.read_event_into(&mut buffer).ok()? {
            Event::Start(element) => match element.name().local_name().as_ref() {
                b"Identity" => {
                    manifest.identity_name = manifest_attribute(&element, "Name");
                }
                b"Properties" => in_properties = true,
                b"DisplayName" if in_properties => in_display_name = true,
                b"Application" => application = Some(push_manifest_application(&mut manifest, &element)),
                b"VisualElements" if application.is_some() => {
                    add_visual_elements(&mut manifest, application.unwrap(), &element);
                }
                b"DefaultTile" if application.is_some() => {
                    if let Some(short_name) = manifest_attribute(&element, "ShortName") {
                        manifest.applications[application.unwrap()]
                            .aliases
                            .push(short_name);
                    }
                }
                _ => {}
            },
            Event::Empty(element) => match element.name().local_name().as_ref() {
                b"Identity" => {
                    manifest.identity_name = manifest_attribute(&element, "Name");
                }
                b"Application" => {
                    application = Some(push_manifest_application(&mut manifest, &element));
                }
                b"VisualElements" if application.is_some() => {
                    add_visual_elements(&mut manifest, application.unwrap(), &element);
                }
                b"DefaultTile" if application.is_some() => {
                    if let Some(short_name) = manifest_attribute(&element, "ShortName") {
                        manifest.applications[application.unwrap()]
                            .aliases
                            .push(short_name);
                    }
                }
                _ => {}
            },
            Event::Text(text) if in_properties && in_display_name => {
                let value = text.decode().ok()?.into_owned();
                if !value.trim().is_empty() {
                    manifest.display_name = Some(value.trim().to_string());
                }
            }
            Event::End(element) => match element.name().local_name().as_ref() {
                b"Application" => application = None,
                b"DisplayName" if in_properties => in_display_name = false,
                b"Properties" => {
                    in_properties = false;
                    in_display_name = false;
                }
                _ => {}
            },
            Event::Eof => break,
            _ => {}
        }
        buffer.clear();
    }

    Some(manifest)
}

fn package_logo_from_manifest(manifest: &str, executable: &str) -> Option<String> {
    parse_package_manifest(manifest)?.applications.into_iter().find_map(|application| {
        application
            .executable
            .eq_ignore_ascii_case(executable)
            .then_some(application.logo)
            .flatten()
    })
}

fn canonical_package_file(
    package_dir: &std::path::Path,
    candidate: &std::path::Path,
) -> Option<std::path::PathBuf> {
    if !candidate.is_file() {
        return None;
    }
    let root = package_dir.canonicalize().ok()?;
    let resolved = candidate.canonicalize().ok()?;
    resolved.starts_with(root).then_some(resolved)
}

fn resolve_package_asset(
    package_dir: &std::path::Path,
    logo: &str,
) -> Option<std::path::PathBuf> {
    use std::path::{Component, Path};

    let normalized = logo.replace('\\', "/");
    let relative = Path::new(&normalized);
    if normalized.contains(':')
        || relative.is_absolute()
        || relative
            .components()
            .any(|component| {
                matches!(component, Component::ParentDir | Component::Prefix(_))
            })
    {
        return None;
    }
    let base = package_dir.join(relative);
    if let Some(path) = canonical_package_file(package_dir, &base) {
        return Some(path);
    }

    let parent = base.parent()?;
    let file_name = base.file_name()?.to_string_lossy();
    let (stem, extension) = file_name.rsplit_once('.')?;
    let stem = stem.to_ascii_lowercase();
    let extension = extension.to_ascii_lowercase();
    let prefix = format!("{stem}.");

    for allow_altform in [false, true] {
        let mut best: Option<((u64, bool), std::path::PathBuf)> = None;
        for entry in std::fs::read_dir(parent).ok()?.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
            if name.contains("contrast-")
                || name.contains("altform-") != allow_altform
            {
                continue;
            }
            let Some((candidate_stem, candidate_extension)) = name.rsplit_once('.') else {
                continue;
            };
            if candidate_extension != extension || !candidate_stem.starts_with(&prefix) {
                continue;
            }
            let Ok((width, height)) = image::image_dimensions(&path) else {
                continue;
            };
            if width == 0 || height == 0 || width > 1024 || height > 1024 {
                continue;
            }
            let score = (
                u64::from(width) * u64::from(height),
                name.contains("targetsize"),
            );
            if best
                .as_ref()
                .map_or(true, |(best_score, _)| score > *best_score)
            {
                best = Some((score, path));
            }
        }
        if let Some((_, path)) = best {
            if let Some(resolved) = canonical_package_file(package_dir, &path) {
                return Some(resolved);
            }
        }
    }

    None
}

fn encode_package_logo(package_dir: &std::path::Path, logo: &str) -> Option<String> {
    use image::ImageEncoder;

    let asset = resolve_package_asset(package_dir, logo)?;
    let (width, height) = image::image_dimensions(&asset).ok()?;
    if width == 0 || height == 0 || width > 1024 || height > 1024 {
        return None;
    }

    let icon = image::open(&asset)
        .ok()?
        .resize_exact(32, 32, image::imageops::FilterType::Lanczos3)
        .to_rgba8();
    let mut png_data = Vec::new();
    image::codecs::png::PngEncoder::new(&mut png_data)
        .write_image(icon.as_raw(), 32, 32, image::ColorType::Rgba8)
        .ok()?;
    Some(BASE64.encode(png_data))
}

fn extract_package_icon(path: &str) -> Option<String> {
    use std::fs;
    use std::path::Path;

    let executable_path = Path::new(path);
    let package_dir = executable_path.parent()?;
    let manifest = fs::read_to_string(package_dir.join("AppxManifest.xml")).ok()?;
    let executable = executable_path.file_name()?.to_string_lossy();
    let logo = package_logo_from_manifest(&manifest, &executable)?;
    encode_package_logo(package_dir, &logo)
}

#[cfg(target_os = "windows")]
fn get_app_icon(path: &str) -> Option<String> {
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::OnceLock;

    static ICON_CACHE: OnceLock<parking_lot::Mutex<HashMap<PathBuf, Option<String>>>> =
        OnceLock::new();
    let key = PathBuf::from(path);
    let cache = ICON_CACHE.get_or_init(|| parking_lot::Mutex::new(HashMap::new()));
    {
        let cache = cache.lock();
        if let Some(icon) = cache.get(&key) {
            return icon.clone();
        }
    }

    let package_icon = extract_package_icon(path);
    let uses_package_icon = package_icon.is_some();
    let icon = package_icon.or_else(|| unsafe { extract_icon(path) });
    if uses_package_icon {
        log::info!("CLIPBOARD: Using packaged app icon for {}", path);
    }
    cache.lock().insert(key, icon.clone());
    icon
}

mod source_icon_backfill {
    use super::*;
    use std::path::PathBuf;
    use std::time::Instant;

    const SETTINGS_KEY: &str = "source_icon_backfill_version";
    const SETTINGS_VALUE: &str = "uwp-package-icons-v1";
    const MAX_PACKAGES: u32 = 1024;
    const MAX_MANIFEST_BYTES: u64 = 1024 * 1024;

    struct PackageIconTarget {
        package_dir: PathBuf,
        executable: String,
        package_aliases: Vec<String>,
        application_aliases: Vec<String>,
        logo: String,
    }

    fn normalize_alias(value: &str) -> String {
        value
            .chars()
            .map(|character| {
                if matches!(character, '\u{2013}' | '\u{2014}') {
                    '-'
                } else {
                    character
                }
            })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase()
    }

    fn usable_alias(value: &str) -> Option<String> {
        let alias = normalize_alias(value);
        (alias.chars().count() >= 3 && !alias.starts_with("ms-resource:")).then_some(alias)
    }

    fn targets_from_manifest(
        package_dir: &std::path::Path,
        manifest: PackageManifest,
    ) -> Vec<PackageIconTarget> {
        let package_aliases: Vec<String> = [manifest.identity_name, manifest.display_name]
            .into_iter()
            .flatten()
            .filter_map(|alias| usable_alias(&alias))
            .collect();
        manifest
            .applications
            .into_iter()
            .filter_map(|application| {
                let logo = application.logo?;
                let application_aliases = application
                    .aliases
                    .iter()
                    .filter_map(|alias| usable_alias(alias))
                    .collect();
                Some(PackageIconTarget {
                    package_dir: package_dir.to_path_buf(),
                    executable: application.executable,
                    package_aliases: package_aliases.clone(),
                    application_aliases,
                    logo,
                })
            })
            .collect()
    }

    fn alias_match_strength(source: &str, aliases: &[String]) -> u8 {
        if aliases.iter().any(|alias| alias == source) {
            return 2;
        }
        if aliases.iter().any(|alias| {
            source
                .strip_prefix(alias)
                .is_some_and(|suffix| suffix.starts_with(" - "))
        }) {
            return 1;
        }
        0
    }

    fn target_match_strength(source: &str, target: &PackageIconTarget) -> u8 {
        if alias_match_strength(source, &target.application_aliases) == 2 {
            return 3;
        }
        let package_match = alias_match_strength(source, &target.package_aliases);
        if package_match == 2 {
            return 2;
        }
        u8::from(alias_match_strength(source, &target.application_aliases) == 1)
    }

    fn select_target<'a>(
        source: &str,
        targets: &'a [PackageIconTarget],
    ) -> Option<&'a PackageIconTarget> {
        let source = normalize_alias(source);
        let mut best_strength = 0;
        let mut best_target = None;
        let mut ambiguous = false;

        for target in targets {
            let strength = target_match_strength(&source, target);
            if strength > best_strength {
                best_strength = strength;
                best_target = Some(target);
                ambiguous = false;
            } else if strength > 0 && strength == best_strength {
                ambiguous = true;
            }
        }

        (!ambiguous).then_some(best_target).flatten()
    }

    #[cfg(target_os = "windows")]
    struct RegistryKey(windows::Win32::System::Registry::HKEY);

    #[cfg(target_os = "windows")]
    impl Drop for RegistryKey {
        fn drop(&mut self) {
            unsafe {
                let _ = windows::Win32::System::Registry::RegCloseKey(self.0);
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn installed_package_path(full_name: &str) -> Option<PathBuf> {
        use windows::core::{HSTRING, PWSTR};
        use windows::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, WIN32_ERROR};
        use windows::Win32::Storage::Packaging::Appx::GetPackagePathByFullName;

        let full_name = HSTRING::from(full_name);
        let mut length = 0u32;
        let status = unsafe { GetPackagePathByFullName(&full_name, &mut length, None) };
        if status.0 != ERROR_INSUFFICIENT_BUFFER.0 || length == 0 || length > 32768 {
            return None;
        }

        let mut buffer = vec![0u16; length as usize];
        let status = unsafe {
            GetPackagePathByFullName(
                &full_name,
                &mut length,
                Some(PWSTR(buffer.as_mut_ptr())),
            )
        };
        if status != WIN32_ERROR(0) {
            return None;
        }
        let end = buffer
            .iter()
            .position(|character| *character == 0)
            .unwrap_or(buffer.len());
        let path = String::from_utf16_lossy(&buffer[..end]);
        std::path::PathBuf::from(path).canonicalize().ok()
    }

    #[cfg(target_os = "windows")]
    fn installed_package_targets() -> Option<Vec<PackageIconTarget>> {
        use std::collections::HashSet;
        use windows::Win32::Foundation::{ERROR_MORE_DATA, ERROR_NO_MORE_ITEMS};
        use windows::Win32::System::Registry::{
            RegEnumKeyW, RegOpenKeyExW, HKEY_CURRENT_USER, KEY_READ,
        };

        let mut key = windows::Win32::System::Registry::HKEY::default();
        let status = unsafe {
            RegOpenKeyExW(
                HKEY_CURRENT_USER,
                windows::core::w!("Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages"),
                None,
                KEY_READ,
                &mut key,
            )
        };
        if !status.is_ok() {
            log::debug!("Source icon backfill: package repository unavailable");
            return None;
        }
        let key = RegistryKey(key);
        let mut targets = Vec::new();
        let mut visited = HashSet::new();

        for index in 0..MAX_PACKAGES {
            let mut name_buffer = [0u16; 1024];
            let status = unsafe { RegEnumKeyW(key.0, index, Some(&mut name_buffer)) };
            if status.0 == ERROR_NO_MORE_ITEMS.0 {
                break;
            }
            if status.0 == ERROR_MORE_DATA.0 {
                log::debug!("Source icon backfill: package name exceeded enumeration buffer");
                return None;
            }
            if !status.is_ok() {
                log::debug!("Source icon backfill: package enumeration stopped: {:?}", status);
                return None;
            }
            let end = name_buffer
                .iter()
                .position(|character| *character == 0)
                .unwrap_or(name_buffer.len());
            let full_name = String::from_utf16_lossy(&name_buffer[..end]);
            let Some(package_dir) = installed_package_path(&full_name) else {
                continue;
            };
            if !visited.insert(package_dir.clone()) {
                continue;
            }
            let manifest_path = package_dir.join("AppxManifest.xml");
            let Ok(metadata) = std::fs::metadata(&manifest_path) else {
                continue;
            };
            if metadata.len() > MAX_MANIFEST_BYTES {
                continue;
            }
            let Ok(source) = std::fs::read_to_string(&manifest_path) else {
                continue;
            };
            let Some(manifest) = parse_package_manifest(&source) else {
                continue;
            };
            targets.extend(targets_from_manifest(&package_dir, manifest));
        }

        Some(targets)
    }

    fn package_icon_replacements(sources: Vec<String>) -> Option<Vec<(String, String)>> {
        #[cfg(target_os = "windows")]
        {
            let targets = installed_package_targets()?;
            log::debug!(
                "Source icon backfill: indexed {} package applications",
                targets.len()
            );
            Some(
                sources
                    .into_iter()
                    .filter_map(|source| {
                        let target = select_target(&source, &targets)?;
                        let icon = encode_package_logo(&target.package_dir, &target.logo)?;
                        log::debug!(
                            "Source icon backfill: matched {} to {}\\{}",
                            source,
                            target.package_dir.display(),
                            target.executable
                        );
                        Some((source, icon))
                    })
                    .collect(),
            )
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = sources;
            Some(Vec::new())
        }
    }

    async fn backfill_completed(pool: &sqlx::SqlitePool) -> Result<bool, sqlx::Error> {
        let value: Option<String> = sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
            .bind(SETTINGS_KEY)
            .fetch_optional(pool)
            .await?;
        Ok(value.as_deref() == Some(SETTINGS_VALUE))
    }

    async fn apply_backfill(
        pool: &sqlx::SqlitePool,
        replacements: Vec<(String, String)>,
    ) -> Result<u64, sqlx::Error> {
        if backfill_completed(pool).await? {
            return Ok(0);
        }

        let mut transaction = pool.begin().await?;
        let mut updated = 0u64;
        for (source_app, icon) in replacements {
            let result = sqlx::query(
                "UPDATE clips SET source_icon = ? WHERE source_app = ? AND source_icon IS NOT ?",
            )
            .bind(&icon)
            .bind(&source_app)
            .bind(&icon)
            .execute(&mut *transaction)
            .await?;
            updated += result.rows_affected();
        }
        sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(SETTINGS_KEY)
            .bind(SETTINGS_VALUE)
            .execute(&mut *transaction)
            .await?;
        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn backfill_source_icons(app: AppHandle, database: Arc<Database>) {
        let started = Instant::now();
        let result = backfill_source_icons_inner(&database.pool).await;
        match result {
            Ok(0) => {
                log::debug!("Source icon backfill: nothing to update");
            }
            Ok(updated) => {
                log::info!("Source icon backfill: updated {} clips", updated);
                let _ = app.emit("clipboard-change", ());
            }
            Err(error) => {
                log::warn!("Source icon backfill failed: {}", error);
            }
        }
        log::debug!(
            "Source icon backfill: finished in {} ms",
            started.elapsed().as_millis()
        );
    }

    async fn backfill_source_icons_inner(pool: &sqlx::SqlitePool) -> Result<u64, sqlx::Error> {
        if backfill_completed(pool).await? {
            return Ok(0);
        }

        let sources: Vec<String> = sqlx::query_scalar(
            "SELECT DISTINCT source_app FROM clips WHERE source_app IS NOT NULL AND source_icon IS NOT NULL",
        )
        .fetch_all(pool)
        .await?;
        if sources.is_empty() {
            return apply_backfill(pool, Vec::new()).await;
        }

        let replacements = tauri::async_runtime::spawn_blocking(move || {
            package_icon_replacements(sources)
        })
        .await
        .map_err(|error| sqlx::Error::Protocol(error.to_string()))?;
        let Some(replacements) = replacements else {
            return Err(sqlx::Error::Protocol(
                "Installed package enumeration failed".into(),
            ));
        };
        apply_backfill(pool, replacements).await
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn target(package_aliases: &[&str], application_aliases: &[&str]) -> PackageIconTarget {
            PackageIconTarget {
                package_dir: PathBuf::from("package"),
                executable: "App.exe".into(),
                package_aliases: package_aliases
                    .iter()
                    .filter_map(|alias| usable_alias(alias))
                    .collect(),
                application_aliases: application_aliases
                    .iter()
                    .filter_map(|alias| usable_alias(alias))
                    .collect(),
                logo: "Assets\\Logo.png".into(),
            }
        }

        #[test]
        fn package_aliases_match_short_names_with_localized_suffixes() {
            let manifest = parse_package_manifest(
                r#"<Package><Identity Name="Publisher.2Fast" /><Properties><DisplayName>2fast – Two Factor Authenticator</DisplayName></Properties><Applications><Application Executable="Project2FA.UWP.exe"><VisualElements DisplayName="ms-resource:ApplicationName" Square44x44Logo="Assets\Logo.png" /><DefaultTile ShortName="2fast" /></Application></Applications></Package>"#,
            )
            .unwrap();
            let targets = targets_from_manifest(std::path::Path::new("package"), manifest);
            assert_eq!(targets.len(), 1);
            assert!(select_target("2fast - autenticador de doble factor", &targets).is_some());
            assert!(select_target("2fast – autenticador de doble factor", &targets).is_some());
            assert!(select_target("2fastware", &targets).is_none());
        }

        #[test]
        fn package_matching_prefers_specific_apps_and_rejects_ambiguity() {
            let targets = vec![
                target(&["Example Package"], &["Helper"]),
                target(&["Example Package"], &["Example App"]),
            ];
            assert!(select_target("Example App", &targets).is_some());
            assert!(select_target("Example Package", &targets).is_none());

            let ambiguous = vec![
                target(&[], &["Shared App"]),
                target(&[], &["Shared App"]),
            ];
            assert!(select_target("Shared App", &ambiguous).is_none());
        }

        #[tokio::test]
        async fn icon_backfill_updates_rows_once_and_records_completion() {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            sqlx::query("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("CREATE TABLE clips (id INTEGER PRIMARY KEY, source_app TEXT, source_icon TEXT)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO clips (source_app, source_icon) VALUES ('2fast', 'generic'), ('2fast', 'generic'), ('2fast', 'package')")
                .execute(&pool)
                .await
                .unwrap();

            let updated = apply_backfill(&pool, vec![("2fast".into(), "package".into())])
                .await
                .unwrap();
            assert_eq!(updated, 2);
            assert!(backfill_completed(&pool).await.unwrap());
            let generic: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM clips WHERE source_icon = 'generic'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(generic, 0);

            let repeated = apply_backfill(&pool, vec![("2fast".into(), "different".into())])
                .await
                .unwrap();
            assert_eq!(repeated, 0);
            let icons: Vec<String> = sqlx::query_scalar("SELECT source_icon FROM clips")
                .fetch_all(&pool)
                .await
                .unwrap();
            assert!(icons.iter().all(|icon| icon == "package"));
            pool.close().await;
        }
    }
}

pub use source_icon_backfill::backfill_source_icons;

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

/// Styled spans from Electron apps (OpenCode and others) are not a document the
/// user copied. Return the visible sentence so it is stored as plain text.
pub fn collapse_presentation_html(
    clip_type: &str,
    content: &[u8],
) -> Option<(String, &'static str, String)> {
    if !matches!(clip_type, "code" | "text" | "rtf") {
        return None;
    }
    let raw = String::from_utf8_lossy(content);
    let trimmed = raw.trim();
    let looks_like_html =
        trimmed.contains("StartFragment") || (trimmed.contains('<') && trimmed.contains("</"));
    if !looks_like_html || is_structural_rich_html(trimmed) {
        return None;
    }
    let plain = strip_html_tags(trimmed);
    let plain = plain.trim();
    if plain.is_empty() || plain == trimmed {
        return None;
    }
    let kind = if is_url(plain) {
        "url"
    } else if is_code_snippet(plain) {
        "code"
    } else {
        "text"
    };
    let preview = plain.chars().take(200).collect();
    Some((plain.to_string(), kind, preview))
}

pub fn is_structural_rich_html(html: &str) -> bool {
    let bytes = html.as_bytes();
    let mut i = 0;
    let mut tr_count = 0usize;
    let mut cell_count = 0usize;
    while i < bytes.len() {
        if bytes[i] == b'<' {
            i += 1;
            if i < bytes.len() && bytes[i] == b'!' {
                // Skip HTML comments (e.g. <!--StartFragment-->) so tags inside comments are ignored.
                if bytes[i..].starts_with(b"!--") {
                    if let Some(rel_end) = html[i + 3..].find("-->") {
                        i = i + 3 + rel_end + 3;
                        continue;
                    }
                }
                i += 1;
                continue;
            }
            if i < bytes.len() && bytes[i] == b'?' {
                i += 1;
                continue;
            }
            let is_closing = i < bytes.len() && bytes[i] == b'/';
            if is_closing {
                i += 1;
            }
            let start = i;
            while i < bytes.len() && bytes[i].is_ascii_alphanumeric() {
                i += 1;
            }
            let end = i;
            if !is_closing && end > start {
                let tag_name = std::str::from_utf8(&bytes[start..end]).unwrap_or("");
                let tag_lower = tag_name.to_ascii_lowercase();
                match tag_lower.as_str() {
                    "img" | "iframe" | "svg" | "canvas" | "video" | "audio" => {
                        return true;
                    }
                    // Browsers/Electron wrap a single-cell text selection in
                    // <table><tbody><tr><td>...</td></tr></tbody></table>; require
                    // at least two rows or two cells before treating a table as structural.
                    "tr" => {
                        tr_count += 1;
                        if tr_count >= 2 {
                            return true;
                        }
                    }
                    "td" | "th" => {
                        cell_count += 1;
                        if cell_count >= 2 {
                            return true;
                        }
                    }
                    _ => {}
                }
            }
        }
        i += 1;
    }
    false
}

pub fn is_rich_html(html: &str) -> bool {
    let plain_text = strip_html_tags(html);
    if plain_text.trim().is_empty() {
        return false;
    }
    is_structural_rich_html(html)
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

/// Detects RTF payloads carrying real formatting (bold, size, colors,
/// tables, pictures) as opposed to bare font-table envelopes.
pub fn rtf_has_formatting(rtf: &str) -> bool {
    let markers = ["\\b0", "\\b1", "\\i0", "\\i1", "\\ul", "\\fs", "\\cf", "\\highlight", "\\trowd", "\\pict", "\\embo", "\\scaps", "\\strike", "\\sub", "\\super"];
    markers.iter().any(|m| rtf.contains(m))
}

/// Wrap an HTML fragment or document with the Windows CF_HTML header when
/// needed (`clipboard-rs` omits this header inside `ClipboardContext::set`).
#[cfg(target_os = "windows")]
pub fn to_cf_html(html: &str) -> String {
    if html.trim_start().starts_with("Version:") {
        return html.to_string();
    }

    const PLACEHOLDER: &str = "0000000000";
    let mut buffer = format!(
        "Version:0.9\r\nStartHTML:{p}\r\nEndHTML:{p}\r\nStartFragment:{p}\r\nEndFragment:{p}\r\n",
        p = PLACEHOLDER
    );

    let start_html = buffer.len();
    let lower = html.to_ascii_lowercase();
    if lower.contains("<html") {
        buffer.push_str(html);
    } else {
        buffer.push_str("<html>\r\n<body>\r\n<!--StartFragment-->");
        buffer.push_str(html);
        buffer.push_str("<!--EndFragment-->\r\n</body>\r\n</html>");
    }
    let end_html = buffer.len();

    const START_MARKER: &str = "<!--StartFragment-->";
    const END_MARKER: &str = "<!--EndFragment-->";
    let html_slice = &buffer[start_html..end_html];
    let start_fragment = html_slice
        .find(START_MARKER)
        .map(|idx| start_html + idx + START_MARKER.len())
        .unwrap_or(start_html);
    let end_fragment = html_slice
        .find(END_MARKER)
        .map(|idx| start_html + idx)
        .filter(|&end| end >= start_fragment)
        .unwrap_or(end_html);

    let header = format!(
        "Version:0.9\r\nStartHTML:{:010}\r\nEndHTML:{:010}\r\nStartFragment:{:010}\r\nEndFragment:{:010}\r\n",
        start_html, end_html, start_fragment, end_fragment
    );
    buffer.replace_range(..start_html, &header);
    buffer
}

fn prepare_clipboard_html(html: String) -> String {
    #[cfg(target_os = "windows")]
    {
        to_cf_html(&html)
    }
    #[cfg(not(target_os = "windows"))]
    {
        html
    }
}

/// Write plain text plus HTML so rich targets restore the HTML formatting while
/// plain targets fall back to the text.
pub async fn write_html(plain: String, html: String) -> Result<(), String> {
    write_rich(plain, Some(html), None).await
}

/// Write plain text plus optional rich flavors (HTML and/or RTF) so rich
/// targets restore the original formatting while plain targets fall back
/// to the text.
pub async fn write_rich(
    plain: String,
    html: Option<String>,
    rtf: Option<String>,
) -> Result<(), String> {
    let mut contents = vec![ClipboardContent::Text(plain)];
    if let Some(html) = html {
        contents.push(ClipboardContent::Html(prepare_clipboard_html(html)));
    }
    if let Some(rtf) = rtf {
        contents.push(ClipboardContent::Rtf(rtf));
    }
    ClipboardContext::new()
        .map_err(|e| e.to_string())?
        .set(contents)
        .map_err(|e| e.to_string())
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

/// Identifies an image copied by CyberPaste that also carries a shell file.
const HISTORY_IMAGE_FORMAT: &str = "CyberPaste.HistoryImage";

pub async fn write_history_image(bytes: Vec<u8>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let image = clipboard_rs::common::RustImageData::from_bytes(&bytes)
            .map_err(|e| e.to_string())?;
        #[cfg(target_os = "windows")]
        {
            write_windows_history_image(image)
        }
        #[cfg(not(target_os = "windows"))]
        {
            ClipboardContext::new()
                .map_err(|e| e.to_string())?
                .set_image(image)
                .map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(target_os = "windows")]
fn write_windows_history_image(image: clipboard_rs::common::RustImageData) -> Result<(), String> {
    use clipboard_win::{formats, options, raw, register_format, Clipboard};

    let png = image.to_png().map_err(|e| e.to_string())?;
    let bmp = image.to_bitmap().map_err(|e| e.to_string())?;
    let dib = history_image_dib_v5(bmp.get_bytes())
        .ok_or_else(|| "Invalid clipboard bitmap header".to_string())?;
    let png_format = register_format("PNG").ok_or_else(|| "Could not register PNG".to_string())?;
    let copy_format = register_format("Preferred DropEffect")
        .ok_or_else(|| "Could not register the clipboard drop effect".to_string())?;
    let history_format = register_format(HISTORY_IMAGE_FORMAT)
        .ok_or_else(|| "Could not register the history image format".to_string())?;

    let dir = std::env::temp_dir().join("CyberPaste").join("clipboard-images");
    let path = save_history_image_png(&dir, png.get_bytes()).map_err(|e| e.to_string())?;
    let result = (|| {
        let _open = Clipboard::new_attempts(10)?;
        raw::empty()?;
        raw::set_without_clear(png_format.get(), png.get_bytes())?;
        raw::set_without_clear(formats::CF_DIBV5, &dib)?;
        raw::set_without_clear(history_format.get(), &[1])?;
        raw::set_without_clear(copy_format.get(), &1u32.to_le_bytes())?; // DROPEFFECT_COPY
        raw::set_file_list_with(&[path.to_string_lossy()], options::NoClear)
    })();

    if let Err(error) = result {
        let _ = std::fs::remove_file(path);
        return Err(format!("Failed to set clipboard image: {error}"));
    }
    prune_history_image_copies(&dir);
    Ok(())
}

#[cfg(target_os = "windows")]
fn history_image_dib_v5(bmp: &[u8]) -> Option<Vec<u8>> {
    const BMP_FILE_HEADER_SIZE: usize = 14;
    const V4_HEADER_SIZE: usize = 108;
    const V5_HEADER_SIZE: usize = 124;
    const LCS_GM_IMAGES: u32 = 4;

    let dib = bmp.get(BMP_FILE_HEADER_SIZE..)?;
    let header_size = u32::from_le_bytes(dib.get(..4)?.try_into().ok()?) as usize;
    if header_size == V5_HEADER_SIZE {
        return dib.get(..V5_HEADER_SIZE).map(|_| dib.to_vec());
    }
    if header_size != V4_HEADER_SIZE {
        return None;
    }

    // The RGBA BMP encoder uses V4. Extend its header for CF_DIBV5, preserving the pixels.
    let mut upgraded = Vec::with_capacity(dib.len() + V5_HEADER_SIZE - V4_HEADER_SIZE);
    upgraded.extend_from_slice(&(V5_HEADER_SIZE as u32).to_le_bytes());
    upgraded.extend_from_slice(dib.get(4..V4_HEADER_SIZE)?);
    upgraded.extend_from_slice(&LCS_GM_IMAGES.to_le_bytes());
    upgraded.extend_from_slice(&[0; 12]); // Profile offset, profile size and reserved.
    upgraded.extend_from_slice(&dib[V4_HEADER_SIZE..]);
    Some(upgraded)
}

#[cfg(target_os = "windows")]
fn save_history_image_png(dir: &std::path::Path, png: &[u8]) -> std::io::Result<std::path::PathBuf> {
    use std::io::Write;

    std::fs::create_dir_all(dir)?;
    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    let id = Uuid::new_v4().simple().to_string();
    let path = dir.join(format!("CyberPaste-{timestamp}-{}.png", &id[..8]));
    let mut file = std::fs::File::create_new(&path)?;
    if let Err(error) = file.write_all(png) {
        drop(file);
        let _ = std::fs::remove_file(&path);
        return Err(error);
    }
    Ok(path)
}

#[cfg(target_os = "windows")]
fn prune_history_image_copies(dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(dir) else { return; };
    let retention = std::time::Duration::from_secs(24 * 60 * 60);
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("CyberPaste-")
            && name.ends_with(".png")
            && entry.file_type().is_ok_and(|kind| kind.is_file())
            && entry.metadata().and_then(|metadata| metadata.modified())
                .is_ok_and(|modified| modified.elapsed().is_ok_and(|age| age > retention))
        {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn windows_service_hosts_are_not_source_apps() {
        assert!(is_windows_service_host(Some("svchost.exe")));
        assert!(is_windows_service_host(Some("SVCHOST.EXE")));
        assert!(!is_windows_service_host(Some("firefox.exe")));
        assert!(!is_windows_service_host(None));
    }

    #[test]
    fn application_frame_hosts_are_detected_by_process_or_window_class() {
        assert!(is_application_frame_host(
            Some("ApplicationFrameHost.exe"),
            ""
        ));
        assert!(is_application_frame_host(None, "ApplicationFrameWindow"));
        assert!(!is_application_frame_host(Some("firefox.exe"), "MozillaWindowClass"));
    }

    #[test]
    fn application_frame_title_replaces_generic_process_name() {
        assert_eq!(
            frame_app_name(
                "2fast - autenticador de doble factor",
                Some("Project2FA.UWP".into())
            ),
            Some("2fast - autenticador de doble factor".into())
        );
        assert_eq!(
            frame_app_name("  ", Some("Project2FA.UWP".into())),
            Some("Project2FA.UWP".into())
        );
        assert_eq!(frame_app_name("", None), None);
    }

    #[test]
    fn package_manifest_logo_matches_executable_and_prefers_square44() {
        let manifest = r#"
            <Package xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10">
              <Applications>
                <Application Executable="Other.exe">
                  <uap:VisualElements Square44x44Logo="Assets\Other.png" />
                </Application>
                <Application Executable="Project2FA.UWP.exe">
                  <uap:VisualElements
                    Square150x150Logo="Assets\Large.png"
                    Square44x44Logo="Assets\App.png" />
                </Application>
              </Applications>
            </Package>
        "#;

        assert_eq!(
            package_logo_from_manifest(manifest, "project2fa.uwp.exe"),
            Some("Assets\\App.png".into())
        );
        assert_eq!(package_logo_from_manifest(manifest, "missing.exe"), None);
    }

    #[test]
    fn package_manifest_uses_square150_logo_as_fallback() {
        let manifest = r#"
            <Package>
              <Applications>
                <Application Executable="App.exe">
                  <VisualElements Square150x150Logo="Assets\Large.png" />
                </Application>
              </Applications>
            </Package>
        "#;

        assert_eq!(
            package_logo_from_manifest(manifest, "App.exe"),
            Some("Assets\\Large.png".into())
        );
    }

    fn write_test_logo(path: &std::path::Path, width: u32, height: u32) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        image::RgbaImage::from_pixel(width, height, image::Rgba([20, 120, 220, 180]))
            .save(path)
            .unwrap();
    }

    #[test]
    fn package_asset_resolution_prefers_largest_regular_qualifier() {
        let dir = std::env::temp_dir().join(format!("cyberpaste-logo-test-{}", Uuid::new_v4()));
        write_test_logo(&dir.join("Assets/Logo.scale-200.png"), 88, 88);
        write_test_logo(&dir.join("Assets/Logo.targetsize-256.png"), 256, 256);
        write_test_logo(
            &dir.join("Assets/Logo.altform-unplated_targetsize-512.png"),
            512,
            512,
        );

        let resolved = resolve_package_asset(&dir, r"Assets\Logo.png").unwrap();
        assert_eq!(
            resolved.file_name().unwrap().to_string_lossy(),
            "Logo.targetsize-256.png"
        );
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn package_asset_resolution_rejects_paths_outside_the_package() {
        let dir = std::env::temp_dir().join(format!("cyberpaste-path-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let outside = std::env::temp_dir().join(format!("cyberpaste-outside-{}.png", Uuid::new_v4()));
        write_test_logo(&outside, 32, 32);

        assert!(resolve_package_asset(&dir, "../outside.png").is_none());
        assert!(resolve_package_asset(&dir, &outside.to_string_lossy()).is_none());
        assert!(resolve_package_asset(&dir, "ms-resource:/Logo.png").is_none());

        std::fs::remove_file(outside).unwrap();
        std::fs::remove_dir(dir).unwrap();
    }

    #[test]
    fn package_icon_extraction_resizes_logo_to_ui_size() {
        let dir = std::env::temp_dir().join(format!("cyberpaste-icon-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            dir.join("AppxManifest.xml"),
            r#"<Package><Applications><Application Executable="App.exe"><VisualElements Square44x44Logo="Assets\Logo.png" /></Application></Applications></Package>"#,
        )
        .unwrap();
        write_test_logo(&dir.join("Assets/Logo.png"), 64, 64);

        let icon = extract_package_icon(&dir.join("App.exe").to_string_lossy()).unwrap();
        let png = BASE64.decode(icon).unwrap();
        let decoded = image::load_from_memory(&png).unwrap().to_rgba8();
        assert_eq!(decoded.dimensions(), (32, 32));
        assert_eq!(decoded.get_pixel(16, 16).0, [20, 120, 220, 180]);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn prefers_image_for_cybersnap_captures_with_a_file() {
        let read_image = |exe: Option<&str>, explicit, is_cut, files, png| {
            let source = (None, None, exe.map(str::to_owned), None, explicit);
            should_read_clipboard_image(&source, is_cut, |format| match format {
                ContentFormat::Files => files,
                ContentFormat::Other(name) => png && name == "PNG",
                _ => false,
            })
        };

        assert!(read_image(Some("CYBERSNAP.EXE"), true, false, true, true));
        assert!(!read_image(Some("CyberSnap.exe"), true, false, true, false));
        assert!(!read_image(Some("CyberSnap.exe"), true, true, true, true));
        assert!(!read_image(Some("CyberSnap.exe"), false, false, true, true));
        assert!(!read_image(Some("explorer.exe"), true, false, true, true));
        assert!(!read_image(Some("WINWORD.EXE"), true, false, true, true));
        assert!(read_image(None, false, false, false, false));
    }

    #[test]
    fn history_image_marker_keeps_hybrid_copies_in_the_image_flow() {
        let source = (None, None, None, None, false);
        let formats = |format| match format {
            ContentFormat::Files => true,
            ContentFormat::Other(name) => name == HISTORY_IMAGE_FORMAT || name == "PNG",
            _ => false,
        };
        assert!(should_read_clipboard_image(&source, false, formats));
        assert!(!should_read_clipboard_image(&source, true, formats));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn history_image_dib_v5_preserves_rgba_pixels() {
        let pixels = vec![40, 120, 220, 150, 210, 30, 90, 50];
        let rgba = image::RgbaImage::from_raw(1, 2, pixels.clone()).unwrap();
        let mut png = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(rgba)
            .write_to(&mut png, image::ImageOutputFormat::Png)
            .unwrap();
        let image = clipboard_rs::common::RustImageData::from_bytes(png.get_ref()).unwrap();
        let bitmap = image.to_bitmap().unwrap();
        let dib = history_image_dib_v5(bitmap.get_bytes()).unwrap();
        assert_eq!(&dib[..4], &124u32.to_le_bytes());

        let decoder = image::codecs::bmp::BmpDecoder::new_without_file_header(
            std::io::Cursor::new(dib),
        )
        .unwrap();
        let decoded = image::DynamicImage::from_decoder(decoder).unwrap();
        assert_eq!(decoded.to_rgba8().into_raw(), pixels);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn history_image_file_keeps_pixels_and_uses_a_distinct_png_path() {
        let dir = std::env::temp_dir().join(format!("cyberpaste-image-test-{}", Uuid::new_v4()));
        let image = image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(
            2, 3, image::Rgba([40, 120, 220, 150]),
        ));
        let mut png = std::io::Cursor::new(Vec::new());
        image.write_to(&mut png, image::ImageOutputFormat::Png).unwrap();
        let first = save_history_image_png(&dir, png.get_ref()).unwrap();
        let second = save_history_image_png(&dir, png.get_ref()).unwrap();
        assert_ne!(first, second);
        assert_eq!(first.extension().unwrap(), "png");
        assert_eq!(std::fs::read(&first).unwrap(), *png.get_ref());
        assert_eq!(image::open(&second).unwrap().to_rgba8(), image.to_rgba8());
        std::fs::remove_file(first).unwrap();
        std::fs::remove_file(second).unwrap();
        std::fs::remove_dir(dir).unwrap();
    }

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
    fn styled_html_fragment_collapses_to_plain_text() {
        let html = r#"<html><body><!--StartFragment--><span style="color: rgb(237, 237, 237); font-family: Segoe UI;">Continúa por favor</span><!--EndFragment--></body></html>"#;
        let (plain, kind, preview) =
            collapse_presentation_html("code", html.as_bytes()).expect("should collapse");
        assert_eq!(plain, "Continúa por favor");
        assert_eq!(kind, "text");
        assert_eq!(preview, "Continúa por favor");
    }

    #[test]
    fn structural_html_is_kept() {
        let html = "<table><tr><td>A</td><td>B</td></tr></table>";
        assert!(collapse_presentation_html("code", html.as_bytes()).is_none());
        assert!(is_structural_rich_html(
            "<table><tr><td>A</td></tr><tr><td>B</td></tr></table>"
        ));
        assert!(is_structural_rich_html(
            "<table><tr><td><img src=\"x.png\"></td></tr></table>"
        ));
    }

    #[test]
    fn single_cell_table_wrapper_collapses_to_plain_text() {
        let html = "<html>\n<body>\n<!--StartFragment--><table><tbody><tr><td><code>privacy-first</code></td></tr></tbody></table><!--EndFragment-->\n</body>\n</html>";
        assert!(!is_structural_rich_html(html));
        assert!(!is_rich_html(html));
        let (plain, kind, preview) =
            collapse_presentation_html("code", html.as_bytes()).expect("should collapse");
        assert_eq!(plain, "privacy-first");
        assert_eq!(kind, "text");
        assert_eq!(preview, "privacy-first");
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn to_cf_html_adds_valid_byte_offsets() {
        let doc = "<html>\n<body>\n<!--StartFragment--><table><tr><td>A</td><td>B</td></tr></table><!--EndFragment-->\n</body>\n</html>";
        let cf = to_cf_html(doc);
        assert!(cf.starts_with("Version:0.9\r\n"));
        let parse = |key: &str| -> usize {
            cf.lines()
                .find_map(|line| line.strip_prefix(&format!("{key}:")))
                .unwrap()
                .parse()
                .unwrap()
        };
        let sh = parse("StartHTML");
        let eh = parse("EndHTML");
        let sf = parse("StartFragment");
        let ef = parse("EndFragment");
        assert_eq!(&cf.as_bytes()[sh..eh], doc.as_bytes());
        assert_eq!(
            &cf.as_bytes()[sf..ef],
            b"<table><tr><td>A</td><td>B</td></tr></table>"
        );
        // Already-prefixed payloads stay untouched
        assert_eq!(to_cf_html(&cf), cf);
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

    #[test]
    fn normalize_file_path_handles_casing_and_slashes() {
        let p1 = normalize_file_path("c:/test/folder/file.txt");
        let p2 = normalize_file_path("C:\\test\\folder\\file.txt");
        assert_eq!(p1, "C:\\test\\folder\\file.txt");
        assert_eq!(p1, p2);
    }

    #[test]
    fn file_hash_is_deterministic_regardless_of_order() {
        let list1 = vec![
            normalize_file_path("C:/path/b.txt"),
            normalize_file_path("C:/path/a.txt"),
        ];
        let mut sorted1 = list1.clone();
        sorted1.sort();

        let list2 = vec![
            normalize_file_path("c:\\path\\a.txt"),
            normalize_file_path("c:\\path\\b.txt"),
        ];
        let mut sorted2 = list2.clone();
        sorted2.sort();

        let content1 = serde_json::to_vec(&sorted1).unwrap();
        let content2 = serde_json::to_vec(&sorted2).unwrap();
        assert_eq!(calculate_hash(&content1), calculate_hash(&content2));
    }
}
