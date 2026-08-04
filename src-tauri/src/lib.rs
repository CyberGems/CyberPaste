#![allow(non_snake_case)] // crate name CyberPaste is intentional
use std::fs;
use std::str::FromStr;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Arc;
use tauri::{
    image::Image,
    tray::{TrayIcon, TrayIconBuilder},
    Emitter, Manager,
};
#[cfg(not(feature = "app-store"))]
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

static IS_ANIMATING: AtomicBool = AtomicBool::new(false);
static LAST_SHOW_TIME: AtomicI64 = AtomicI64::new(0);
static TARGET_FOREGROUND_HND: std::sync::atomic::AtomicPtr<()> =
    std::sync::atomic::AtomicPtr::new(std::ptr::null_mut());

mod ai;
mod clipboard;
mod commands;
mod constants;
mod database;
mod highlight;
mod models;
mod ocr;
mod settings_commands;
mod settings_manager;

/// Force Win11 immersive dark popup menus (rounded corners, soft chrome).
/// Kept for any remaining native menus; tray uses a custom HTML popup.
#[cfg(target_os = "windows")]
fn setup_menu_theme() {
    use windows::core::PCSTR;
    use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryA};
    use windows::core::s;

    unsafe {
        let Ok(uxtheme) = LoadLibraryA(s!("uxtheme.dll")) else {
            return;
        };

        // Ordinal 135: SetPreferredAppMode (Win10 1903+) — 2 = ForceDark
        type SetPreferredAppMode = unsafe extern "system" fn(i32) -> i32;
        if let Some(ptr) = GetProcAddress(uxtheme, PCSTR::from_raw(135usize as *const u8)) {
            let f: SetPreferredAppMode = std::mem::transmute(ptr);
            f(2);
        }

        // Ordinal 136: FlushMenuThemes — drop cached classic menu chrome
        type FlushMenuThemes = unsafe extern "system" fn();
        if let Some(ptr) = GetProcAddress(uxtheme, PCSTR::from_raw(136usize as *const u8)) {
            let f: FlushMenuThemes = std::mem::transmute(ptr);
            f();
        }

        // Ordinal 104: RefreshImmersiveColorPolicyState
        type RefreshImmersive = unsafe extern "system" fn();
        if let Some(ptr) = GetProcAddress(uxtheme, PCSTR::from_raw(104usize as *const u8)) {
            let f: RefreshImmersive = std::mem::transmute(ptr);
            f();
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn setup_menu_theme() {}

use database::Database;
use models::get_runtime;
use settings_manager::SettingsManager;

pub fn run_app() {
    #[cfg(target_os = "windows")]
    setup_menu_theme();

    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir).ok();
    let db_path = data_dir.join("cyber_paste.db");
    let db_path_str = db_path.to_str().unwrap_or("cyber_paste.db").to_string();

    let rt = get_runtime().expect("Failed to get global tokio runtime");
    let _guard = rt.enter();

    let db = rt.block_on(async { Database::new(&db_path_str).await });

    rt.block_on(async {
        db.migrate().await.ok();
    });

    let db_arc = Arc::new(db);

    let mut log_builder = tauri_plugin_log::Builder::default()
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{}][{}][{}] {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                record.target(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Debug)
        .level_for("sqlx", log::LevelFilter::Warn);

    #[cfg(debug_assertions)]
    {
        log_builder = log_builder.targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ]);
    }

    #[cfg(not(debug_assertions))]
    {
        log_builder = log_builder.targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ]);
    }

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(not(feature = "app-store"))]
    {
        builder = builder
            .plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"]),
            ))
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .plugin(log_builder.build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            log::info!("Second instance detected. Sending notification and exiting.");
            use tauri_plugin_notification::NotificationExt;
            if let Err(e) = app.notification()
                .builder()
                .title("CyberPaste")
                .body("CyberPaste is already running")
                .show() {
                log::error!("Failed to send notification: {:?}", e);
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_x::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new()
            .with_state_flags(
                tauri_plugin_window_state::StateFlags::POSITION | tauri_plugin_window_state::StateFlags::MAXIMIZED
            )
            .build()
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .manage(db_arc.clone())
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::ThemeChanged(theme) => {
                    log::info!("THEME:System theme changed to: {:?}, win.theme(): {:?}", theme, window.theme());
                    let label = window.label().to_string();
                    let app_handle = window.app_handle().clone();
                    let theme_ = theme.clone();

                    if let Some(tray) = app_handle.tray_by_id("main") {
                        update_tray_icon(&tray, &theme_);
                    }

                    let manager = window.state::<Arc<SettingsManager>>();
                    let settings = manager.get();

                    tauri::async_runtime::spawn(async move {
                        let current_theme = settings.theme;
                        let mica_effect = crate::effect_for_theme(&current_theme).to_string();
                        let round_corners = settings.round_corners;

                        if current_theme == "system" {
                            if let Some(webview_win) = app_handle.get_webview_window(&label) {
                                crate::apply_window_effect(&webview_win, &mica_effect, &theme_, round_corners);
                            }
                        }
                    });
                }
                tauri::WindowEvent::Focused(focused) => {
                    if !focused {
                        let label = window.label();
                        if label == "main" {
                            if window.app_handle().get_webview_window("settings").is_some() {
                                return;
                            }

                            let last_show = LAST_SHOW_TIME.load(Ordering::SeqCst);
                            let now = chrono::Local::now().timestamp_millis();
                            let debounce_ms = 500;
                            if now - last_show < debounce_ms {
                                return;
                            }

                            if let Some(win) = window.app_handle().get_webview_window(label) {
                                 let win_clone = win.clone();
                                 std::thread::spawn(move || {
                                     let is_pinned = {
                                         let manager = win_clone.state::<Arc<crate::settings_manager::SettingsManager>>();
                                         manager.get().pinned
                                     };

                                     // NEW SAFETY: If cursor is inside/near window bounds and left mouse button is down, don't hide (fixes dragging/resizing)
                                     let is_inside_and_dragging_or_resizing = if let (Ok(pos), Ok(size)) = (win_clone.outer_position(), win_clone.outer_size()) {
                                         use windows::Win32::Foundation::POINT;
                                         use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
                                         use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
                                         let mut point = POINT { x: 0, y: 0 };
                                         let has_cursor = unsafe { GetCursorPos(&mut point).is_ok() };
                                         if has_cursor {
                                             // Allow a 10px margin around the window to capture resize borders
                                             let cursor_inside_or_near = point.x >= pos.x - 10 && point.x <= pos.x + size.width as i32 + 10 &&
                                                 point.y >= pos.y - 10 && point.y <= pos.y + size.height as i32 + 10;
                                             let lbutton_down = (unsafe { GetAsyncKeyState(VK_LBUTTON.0 as i32) } as u16 & 0x8000) != 0;
                                             cursor_inside_or_near && lbutton_down
                                         } else {
                                             false
                                         }
                                     } else {
                                         false
                                     };

                                     if is_pinned || is_inside_and_dragging_or_resizing {
                                         log::info!("Auto-hide skipped: pinned={} dragging_or_resizing={}", is_pinned, is_inside_and_dragging_or_resizing);
                                         return;
                                     }

                                     if IS_ANIMATING.load(Ordering::SeqCst) || !win_clone.is_visible().unwrap_or(false) {
                                         return;
                                     }

                                     let current_monitor = win_clone.current_monitor().ok().flatten();
                                     let cursor_monitor = get_monitor_at_cursor(&win_clone);

                                     let mut moved_screens = false;
                                     if let (Some(cm), Some(crm)) = (&current_monitor, &cursor_monitor) {
                                         if cm.position().x != crm.position().x || cm.position().y != crm.position().y {
                                             moved_screens = true;
                                         }
                                     }

                                      if moved_screens {
                                          // Only reposition to new monitor if window is pinned
                                          let manager = win_clone.state::<Arc<SettingsManager>>();
                                          let is_pinned = manager.get().pinned;
                                          if is_pinned {
                                              position_window_at_bottom(&win_clone);
                                              let _ = win_clone.show();
                                              let _ = win_clone.set_focus();
                                          } else {
                                              crate::animate_window_hide(&win_clone, None);
                                          }
                                      } else {
                                          if win_clone.is_visible().unwrap_or(false) {
                                              crate::animate_window_hide(&win_clone, None);
                                          }
                                      }
                                 });
                            }
                        }
                    }
                }
                _ => {}
            }
        })
        .setup(move |app| {
            log::info!("CyberPaste starting...");

            let db_for_settings = db_arc.clone();
            let settings_manager = get_runtime().unwrap().block_on(async {
                SettingsManager::new(app.handle(), &db_for_settings).await
            });
            app.manage(Arc::new(settings_manager));

            let handle = app.handle().clone();
            let db_for_clipboard = db_arc.clone();

            let is_dark = dark_light::detect().map(|m| m == dark_light::Mode::Dark).unwrap_or(false);
            let icon_data: &[u8] = if is_dark {
                include_bytes!("../icons/tray_white.png")
            } else {
                include_bytes!("../icons/tray.png")
            };
            let icon = Image::from_bytes(icon_data).expect("Failed to load icon");

            let tray_builder = TrayIconBuilder::with_id("main")
                .icon(icon)
                .show_menu_on_left_click(false);

            let _tray = tray_builder
                .tooltip("CyberPaste")
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};

                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            let app = tray.app_handle().clone();
                            // Dismiss HTML tray popup before toggling the main window
                            tauri::async_runtime::spawn(async move {
                                let _ = commands::hide_tray_menu(app).await;
                            });
                            if let Some(win) = tray.app_handle().get_webview_window("main") {
                                if win.is_visible().unwrap_or(false)
                                    && win.is_focused().unwrap_or(false)
                                {
                                    crate::animate_window_hide(&win, None);
                                } else {
                                    position_window_at_bottom(&win);
                                }
                            }
                        }
                        TrayIconEvent::Click {
                            button: MouseButton::Right,
                            button_state: MouseButtonState::Up,
                            position,
                            rect,
                            ..
                        } => {
                            let app = tray.app_handle().clone();
                            // Prefer tray-icon rect (top-center); fall back to cursor
                            let (x, y) = {
                                use tauri::{Position, Size};
                                match (rect.position, rect.size) {
                                    (Position::Physical(p), Size::Physical(s)) => {
                                        (p.x + (s.width as i32) / 2, p.y)
                                    }
                                    (Position::Logical(p), Size::Logical(s)) => {
                                        // PhysicalPosition from click is more reliable if scale unknown
                                        let _ = (p, s);
                                        (position.x.round() as i32, position.y.round() as i32)
                                    }
                                    _ => (position.x.round() as i32, position.y.round() as i32),
                                }
                            };
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = commands::show_tray_menu_at(app, x, y).await {
                                    log::error!("show_tray_menu_at failed: {e}");
                                }
                            });
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            rebuild_tray_menu(app.handle())?;

            // Pre-create the tray menu webview (hidden) so the first right-click opens instantly
            // instead of paying the WebView2 creation cost (~300-800ms).
            {
                let app_warm = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
                    if let Err(e) = commands::warm_tray_menu(app_warm).await {
                        log::error!("warm_tray_menu failed: {e}");
                    }
                });
            }

            let app_handle = handle.clone();
            let win = app_handle.get_webview_window("main").unwrap();

            {
                let app_handle_clone = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    if let Some(win) = app_handle_clone.get_webview_window("main") {
                        let manager = win.state::<Arc<SettingsManager>>();
                        let settings = manager.get();
                        let mica_effect = crate::effect_for_theme(&settings.theme).to_string();
                        let theme = crate::normalize_theme(&settings.theme).to_string();
                        let round_corners = settings.round_corners;

                        let current_theme = if theme == "light" {
                            tauri::Theme::Light
                        } else if theme == "dark" || theme == "cyberpaste" {
                            tauri::Theme::Dark
                        } else {
                            win.theme().unwrap_or(tauri::Theme::Light)
                        };

                        crate::apply_window_effect(&win, &mica_effect, &current_theme, round_corners);
                    }
                });
            }

            let manager = app_handle.state::<Arc<SettingsManager>>();
            let saved_hotkey = manager.get().hotkey;
            log::info!("Attempting to register hotkey: {}", saved_hotkey);

            // Unregister any leftover hotkeys from previous instances
            if let Err(e) = app_handle.global_shortcut().unregister_all() {
                log::debug!("No existing shortcuts to unregister: {:?}", e);
            }

            // Give OS time to release the registration
            std::thread::sleep(std::time::Duration::from_millis(100));

            if let Ok(shortcut) = Shortcut::from_str(&saved_hotkey) {
                let win_clone = win.clone();
                match app_handle.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if win_clone.is_visible().unwrap_or(false) && win_clone.is_focused().unwrap_or(false) {
                            crate::animate_window_hide(&win_clone, None);
                        } else {
                            // Capture the foreground window before showing CyberPaste
                            unsafe {
                                let fg = windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow();
                                TARGET_FOREGROUND_HND.store(fg.0 as *mut (), std::sync::atomic::Ordering::Relaxed);
                            }
                            position_window_at_bottom(&win_clone);
                        }
                    }
                }) {
                    Ok(()) => log::info!("Global hotkey registered: {}", saved_hotkey),
                    Err(e) => {
                        log::warn!("Hotkey '{}' conflict: {:?}. Change it in Settings.", saved_hotkey, e);
                    }
                }
            } else {
                log::error!("Failed to parse hotkey string: {}", saved_hotkey);
            }

            let handle_for_clip = app_handle.clone();
            let db_for_clip = db_for_clipboard.clone();
            clipboard::init(&handle_for_clip, db_for_clip);

            let db_for_migration = db_for_clipboard.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = commands::migrate_images_to_files(&db_for_migration.pool).await {
                    log::error!("Background image migration failed: {}", e);
                }
            });

            let handle_for_toast = app_handle.clone();
            let saved_hotkey_clone = saved_hotkey.clone();
            tauri::async_runtime::spawn(async move {
                // Wait 5 seconds for the app environment/windows to fully boot
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;

                // Ensure activation sound is generated on startup if enabled
                let manager = handle_for_toast.state::<Arc<SettingsManager>>();
                let settings = manager.get();
                if settings.clipboard_sound_enabled {
                    let data_dir = get_data_dir();
                    let activation_sound_path = data_dir.join("activation_sound.wav");
                    if !activation_sound_path.exists() {
                        let wav_bytes = generate_activation_sound_wav();
                        let _ = std::fs::write(&activation_sound_path, wav_bytes);
                    }
                }

                let lang = settings.language.as_str();
                let msg = if lang == "es" {
                    format!("{} para abrir", saved_hotkey_clone)
                } else {
                    format!("{} to open", saved_hotkey_clone)
                };
                let _ = commands::show_toast(
                    handle_for_toast,
                    msg,
                    "info".to_string(),
                    Some("welcome".to_string()),
                    None,
                    None,
                    None,
                    None,
                )
                .await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::get_clips,
            commands::get_clip,
            commands::get_clip_detail,
            commands::paste_clip,
            commands::delete_clip,
            commands::delete_clips,
            commands::move_clips_to_folder,
            commands::toggle_clip_pin,
            commands::move_to_folder,
            commands::reorder_clip,
            commands::reorder_folder,
            commands::create_folder,
            commands::rename_folder,
            commands::delete_folder,
            commands::search_clips,
            commands::get_folders,
            settings_commands::get_settings,
            settings_commands::save_settings,
            commands::hide_window,
            commands::get_clipboard_history_size,
            commands::get_clip_stats,
            commands::get_db_size,
            commands::clear_clipboard_history,
            commands::clear_all_clips,
            commands::remove_duplicate_clips,
            commands::register_global_shortcut,
            commands::show_window,
            settings_commands::add_ignored_app,
            settings_commands::remove_ignored_app,
            settings_commands::get_ignored_apps,
            commands::pick_file,
            commands::get_layout_config,
            commands::test_log,
            commands::ai_process_clip,
            commands::focus_window,
            commands::refresh_window,
            commands::toggle_view_mode,
            commands::export_backup,
            commands::import_backup,
            commands::export_backup_to_file,
            commands::import_backup_from_file,
            commands::open_devtools,
            commands::get_data_dir_path,
            commands::show_item_in_folder,
            commands::update_clip_content,
            commands::read_clipboard_text,
            commands::write_clipboard_text,
            commands::copy_clip_text,
            commands::get_highlighted_clip,
            commands::open_with,
            commands::reset_window_size,
            commands::center_window,
            commands::play_clipboard_sound,
            commands::simulate_ctrl_v,
            commands::show_toast,
            commands::hide_toast,
            commands::click_toast,
            commands::set_toast_position,
            commands::toast_ready,
            commands::open_image_viewer,
            commands::run_ocr_for_clip,
            commands::update_ocr_text,
            commands::toggle_clipboard_monitoring,
            commands::is_clipboard_monitoring_paused,
            commands::get_tray_menu_state,
            commands::hide_tray_menu,
            commands::tray_menu_ready,
            commands::tray_menu_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn position_window_at_bottom(window: &tauri::WebviewWindow) {
    animate_window_show(window);
}

/// Smooth morph between compact ↔ full while the window stays visible.
/// Uses Win32 SetWindowPos (size+pos in one call) with time-based ease-out (~200ms).
/// Compact target stays centered on the current window (no cursor jump).
/// Runs synchronously — call from a blocking thread / spawn_blocking.
pub fn animate_view_mode_transition(window: &tauri::WebviewWindow) {
    struct AnimationGuard;
    impl Drop for AnimationGuard {
        fn drop(&mut self) {
            IS_ANIMATING.store(false, Ordering::SeqCst);
        }
    }

    let mut retries = 0;
    let mut acquired = false;
    while retries < 50 {
        if IS_ANIMATING
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
        {
            acquired = true;
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
        retries += 1;
    }
    if !acquired {
        log::warn!("Animation lock acquire timeout in view-mode transition, forcing lock");
        IS_ANIMATING.store(true, Ordering::SeqCst);
    }
    let _guard = AnimationGuard;

    let (side_margin, bottom_margin, float_above_taskbar, view_mode, saved_width, saved_height) = {
        let manager = window.state::<Arc<crate::settings_manager::SettingsManager>>();
        let s = manager.get();
        let is_mica = crate::effect_for_theme(&s.theme) == "mica";
        let no_corners = !s.round_corners;
        let side = if is_mica && no_corners {
            0.0
        } else {
            constants::WINDOW_MARGIN
        };
        let bottom = if is_mica && no_corners {
            0.0
        } else {
            constants::WINDOW_MARGIN
        };
        (
            side,
            bottom,
            s.float_above_taskbar,
            s.view_mode,
            s.window_width,
            s.window_height,
        )
    };

    let Some(monitor) = window.current_monitor().ok().flatten() else {
        log::warn!("No monitor in view-mode transition; applying size without morph");
        return;
    };

    let scale_factor = monitor.scale_factor();
    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let work_area = monitor.work_area();

    let start_size = window.outer_size().ok();
    let start_pos = window.outer_position().ok();
    let (Some(start_size), Some(start_pos)) = (start_size, start_pos) else {
        log::warn!("Could not read window rect for view-mode transition");
        return;
    };

    let (target_w, target_h, target_x, target_y) = if view_mode == "compact" {
        let logical_w = if saved_width > 100.0 {
            saved_width
        } else {
            constants::COMPACT_WIDTH
        };
        let logical_h = if saved_height > 100.0 {
            saved_height
        } else {
            constants::COMPACT_HEIGHT
        };
        let tw = (logical_w * scale_factor) as u32;
        let th = (logical_h * scale_factor) as u32;

        // Shrink toward the center of the current window — avoid jumping to cursor.
        let center_x = start_pos.x + (start_size.width as i32) / 2;
        let center_y = start_pos.y + (start_size.height as i32) / 2;
        let tx = (center_x - (tw as i32) / 2).clamp(
            monitor_pos.x,
            monitor_pos.x + monitor_size.width as i32 - tw as i32,
        );
        let ty = (center_y - (th as i32) / 2).clamp(
            monitor_pos.y,
            monitor_pos.y + monitor_size.height as i32 - th as i32,
        );
        (tw, th, tx, ty)
    } else {
        let side_margin_px = (side_margin * scale_factor) as i32;
        let bottom_margin_px = (bottom_margin * scale_factor) as i32;
        let reference_bottom = if float_above_taskbar {
            monitor_pos.y + monitor_size.height as i32
        } else {
            work_area.position.y + work_area.size.height as i32
        };
        let logical_h = if saved_height > 100.0 {
            saved_height
        } else {
            constants::FULL_HEIGHT
        };
        let tw = work_area.size.width - (side_margin_px as u32 * 2);
        let th = (logical_h * scale_factor) as u32;
        let tx = work_area.position.x + side_margin_px;
        let ty = reference_bottom - th as i32 - bottom_margin_px;
        (tw, th, tx, ty)
    };

    let start_w = start_size.width as f64;
    let start_h = start_size.height as f64;
    let start_x = start_pos.x as f64;
    let start_y = start_pos.y as f64;
    let end_w = target_w as f64;
    let end_h = target_h as f64;
    let end_x = target_x as f64;
    let end_y = target_y as f64;

    // Skip morph if already at target (within 2px).
    let already_there = (start_w - end_w).abs() < 2.0
        && (start_h - end_h).abs() < 2.0
        && (start_x - end_x).abs() < 2.0
        && (start_y - end_y).abs() < 2.0;

    // One Win32 call per frame (size+pos together) — avoids double DWM redraw stutter.
    let set_rect = |x: i32, y: i32, w: u32, h: u32| {
        if let Ok(handle) = window.hwnd() {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                SetWindowPos, SWP_NOACTIVATE, SWP_NOCOPYBITS, SWP_NOZORDER,
            };
            let hwnd = HWND(handle.0 as _);
            unsafe {
                let _ = SetWindowPos(
                    hwnd,
                    None,
                    x,
                    y,
                    w as i32,
                    h as i32,
                    SWP_NOZORDER | SWP_NOACTIVATE | SWP_NOCOPYBITS,
                );
            }
        } else {
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: w,
                height: h,
            }));
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x,
                y,
            }));
        }
    };

    if !already_there {
        // Time-based: real ~200ms regardless of how long each SetWindowPos takes.
        // Cap frame sleep so slow DWM frames don't stack artificial delays on top.
        const DURATION_MS: f64 = 200.0;
        const FRAME_MS: f64 = 8.0; // ~120Hz max; DWM coalesces anyway
        let anim_start = std::time::Instant::now();

        loop {
            let elapsed_ms = anim_start.elapsed().as_secs_f64() * 1000.0;
            let t = (elapsed_ms / DURATION_MS).min(1.0);
            // Ease-out cubic — fast start, soft landing
            let e = 1.0 - (1.0 - t).powi(3);
            let w = (start_w + (end_w - start_w) * e).round().max(1.0) as u32;
            let h = (start_h + (end_h - start_h) * e).round().max(1.0) as u32;
            let x = (start_x + (end_x - start_x) * e).round() as i32;
            let y = (start_y + (end_y - start_y) * e).round() as i32;
            set_rect(x, y, w, h);

            if t >= 1.0 {
                break;
            }

            // Only sleep the remainder of the frame budget (never add delay on top of slow frames)
            let frame_elapsed = anim_start.elapsed().as_secs_f64() * 1000.0 - elapsed_ms;
            let remaining = FRAME_MS - frame_elapsed;
            if remaining > 0.5 {
                std::thread::sleep(std::time::Duration::from_secs_f64(remaining / 1000.0));
            }
        }
    }

    set_rect(target_x, target_y, target_w, target_h);

    if float_above_taskbar {
        let _ = window.set_always_on_top(true);
    }

    let _ = window.set_focus();
}

pub fn animate_window_show(window: &tauri::WebviewWindow) {
    let _ = window.emit("window-visibility", true);
    let _ = rebuild_tray_menu(window.app_handle());
    // Safety guard to ensure IS_ANIMATING is always reset even on panic
    struct AnimationGuard;
    impl Drop for AnimationGuard {
        fn drop(&mut self) {
            IS_ANIMATING.store(false, Ordering::SeqCst);
        }
    }

    LAST_SHOW_TIME.store(chrono::Local::now().timestamp_millis(), Ordering::SeqCst);
    let window = window.clone();

    std::thread::spawn(move || {
        let mut retries = 0;
        let mut acquired = false;
        while retries < 50 {
            if IS_ANIMATING
                .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                .is_ok()
            {
                acquired = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(10));
            retries += 1;
        }
        if !acquired {
            log::warn!("Animation lock acquire timeout in show, forcing lock");
            IS_ANIMATING.store(true, Ordering::SeqCst);
        }

        let _guard = AnimationGuard;
        let (
            side_margin,
            bottom_margin,
            float_above_taskbar,
            view_mode,
            saved_width,
            saved_height,
            compact_pos_mode,
            mica_effect,
            theme_str,
            round_corners,
            compact_last_x,
            compact_last_y,
        ) = {
            let manager = window.state::<Arc<crate::settings_manager::SettingsManager>>();
            let s = manager.get();
            let is_mica = crate::effect_for_theme(&s.theme) == "mica";
            let no_corners = !s.round_corners;
            let side = if is_mica && no_corners {
                0.0
            } else {
                constants::WINDOW_MARGIN
            };
            let bottom = if is_mica && no_corners {
                0.0
            } else {
                constants::WINDOW_MARGIN
            };
            (
                side,
                bottom,
                s.float_above_taskbar,
                s.view_mode,
                s.window_width,
                s.window_height,
                s.compact_view_position_mode.clone(),
                s.mica_effect.clone(),
                s.theme.clone(),
                s.round_corners,
                s.compact_last_position_x,
                s.compact_last_position_y,
            )
        };

        let (target_pos, monitor) = {
            use windows::Win32::Foundation::POINT;
            use windows::Win32::Graphics::Gdi::ClientToScreen;
            use windows::Win32::UI::WindowsAndMessaging::{
                GetCursorPos, GetForegroundWindow, GetGUIThreadInfo, GetWindowThreadProcessId,
                GUITHREADINFO,
            };

            let mut point = POINT { x: 0, y: 0 };
            let mut found = false;

            if view_mode == "compact" {
                if compact_pos_mode == "caret" || compact_pos_mode == "auto" {
                    let mut info = GUITHREADINFO::default();
                    info.cbSize = std::mem::size_of::<GUITHREADINFO>() as u32;
                    let hwnd = unsafe { GetForegroundWindow() };
                    let thread_id = unsafe { GetWindowThreadProcessId(hwnd, None) };

                    if unsafe { GetGUIThreadInfo(thread_id, &mut info).is_ok() }
                        && !info.hwndCaret.is_invalid()
                    {
                        let mut caret_pt = POINT {
                            x: info.rcCaret.left,
                            y: info.rcCaret.bottom,
                        };
                        if unsafe { ClientToScreen(info.hwndCaret, &mut caret_pt).as_bool() } {
                            point = caret_pt;
                            found = true;
                        }
                    }
                }
            }


            if !found {
                if unsafe { GetCursorPos(&mut point).is_ok() } {
                    found = true;
                }
            }

            if found {
                (point, get_monitor_at_point(&window, point))
            } else {
                let mon = window
                    .primary_monitor()
                    .ok()
                    .flatten()
                    .or_else(|| window.current_monitor().ok().flatten());
                let pt = if let Some(ref m) = mon {
                    let pos = m.position();
                    let size = m.size();
                    POINT {
                        x: pos.x + (size.width / 2) as i32,
                        y: pos.y + (size.height / 2) as i32,
                    }
                } else {
                    POINT { x: 0, y: 0 }
                };
                (pt, mon)
            }
        };

        if let Some(monitor) = monitor {
            let scale_factor = monitor.scale_factor();
            let monitor_pos = monitor.position();
            let monitor_size = monitor.size();
            let work_area = monitor.work_area();

            log::info!(
                "Showing window on monitor: pos={:?}, size={:?}, work_area={:?}",
                monitor_pos,
                monitor_size,
                work_area
            );

            if view_mode == "compact" {
                let logical_w = if saved_width > 100.0 {
                    saved_width
                } else {
                    constants::COMPACT_WIDTH
                };
                let logical_h = if saved_height > 100.0 {
                    saved_height
                } else {
                    constants::COMPACT_HEIGHT
                };
                let window_width_px = (logical_w * scale_factor) as u32;
                let window_height_px = (logical_h * scale_factor) as u32;
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window_width_px,
                    height: window_height_px,
                }));

                let target_x = (target_pos.x - (window_width_px / 2) as i32).clamp(
                    monitor_pos.x,
                    monitor_pos.x + monitor_size.width as i32 - window_width_px as i32,
                );
                let target_y = (target_pos.y - (window_height_px / 4) as i32).clamp(
                    monitor_pos.y,
                    monitor_pos.y + monitor_size.height as i32 - window_height_px as i32,
                );

                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: target_x,
                    y: target_y,
                }));
                let current_theme = if theme_str == "light" {
                    tauri::Theme::Light
                } else if theme_str == "dark" || theme_str == "cyberpaste" {
                    tauri::Theme::Dark
                } else {
                    window.theme().unwrap_or(tauri::Theme::Light)
                };
                crate::apply_window_effect(&window, &mica_effect, &current_theme, round_corners);
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();

                // Re-apply size after show — webview may have stale DPI scale factor
                std::thread::sleep(std::time::Duration::from_millis(50));
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window_width_px,
                    height: window_height_px,
                }));

                if float_above_taskbar {
                    let _ = window.set_always_on_top(true);
                }
            } else {
                let side_margin_px = (side_margin * scale_factor) as i32;
                let bottom_margin_px = (bottom_margin * scale_factor) as i32;

                let reference_bottom = if float_above_taskbar {
                    monitor_pos.y + monitor_size.height as i32
                } else {
                    work_area.position.y + work_area.size.height as i32
                };

                // Work in physical pixels to avoid webview DPI scale issues
                let logical_window_height = if saved_height > 100.0 {
                    saved_height
                } else {
                    constants::FULL_HEIGHT
                };
                let window_width_px = work_area.size.width - (side_margin_px as u32 * 2);
                let window_height_px = (logical_window_height * scale_factor) as u32;

                let target_x = work_area.position.x + side_margin_px;
                let target_y = reference_bottom - window_height_px as i32 - bottom_margin_px;
                let start_y = reference_bottom;

                // Set physical size before positioning
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window_width_px,
                    height: window_height_px,
                }));
                std::thread::sleep(std::time::Duration::from_millis(60));

                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: target_x,
                    y: start_y,
                }));

                log::debug!(
                    "Animation coords: start_y={}, target_y={}, phys_w={}",
                    start_y,
                    target_y,
                    window_width_px
                );

                let current_theme = if theme_str == "light" {
                    tauri::Theme::Light
                } else if theme_str == "dark" || theme_str == "cyberpaste" {
                    tauri::Theme::Dark
                } else {
                    window.theme().unwrap_or(tauri::Theme::Light)
                };
                crate::apply_window_effect(&window, &mica_effect, &current_theme, round_corners);
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();

                // Re-apply physical size after show to fix stale webview DPI
                std::thread::sleep(std::time::Duration::from_millis(50));
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window_width_px,
                    height: window_height_px,
                }));

                let steps = 12;
                let duration = std::time::Duration::from_millis(8);
                let dy = (target_y - start_y) as f64 / steps as f64;

                for i in 1..=steps {
                    let current_y = start_y as f64 + dy * i as f64;
                    let _ =
                        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                            x: target_x,
                            y: current_y as i32,
                        }));
                    std::thread::sleep(duration);
                }

                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: target_x,
                    y: target_y,
                }));
                let _ = window.set_focus();

                // Final size apply after animation — ensures full width overrides window-state plugin
                std::thread::sleep(std::time::Duration::from_millis(50));
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window_width_px,
                    height: window_height_px,
                }));

                if float_above_taskbar {
                    let _ = window.set_always_on_top(true);
                }
            }
        } else {
            let current_theme = if theme_str == "light" {
                tauri::Theme::Light
            } else if theme_str == "dark" || theme_str == "cyberpaste" {
                tauri::Theme::Dark
            } else {
                window.theme().unwrap_or(tauri::Theme::Light)
            };
            crate::apply_window_effect(&window, &mica_effect, &current_theme, round_corners);
            let _ = window.show();
            let _ = window.unminimize();
        }
    });
}

pub fn animate_window_hide(
    window: &tauri::WebviewWindow,
    on_done: Option<Box<dyn FnOnce() + Send>>,
) {
    let _ = window.emit("window-visibility", false);
    let _ = rebuild_tray_menu(window.app_handle());
    // Safety guard to ensure IS_ANIMATING is always reset
    struct AnimationGuard;
    impl Drop for AnimationGuard {
        fn drop(&mut self) {
            IS_ANIMATING.store(false, Ordering::SeqCst);
        }
    }

    let window = window.clone();
    std::thread::spawn(move || {
        let mut retries = 0;
        let mut acquired = false;
        while retries < 50 {
            if IS_ANIMATING
                .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                .is_ok()
            {
                acquired = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(10));
            retries += 1;
        }
        if !acquired {
            log::warn!("Animation lock acquire timeout in hide, forcing hide");
            let _ = window.hide();
            if let Some(callback) = on_done {
                callback();
            }
            return;
        }

        let _guard = AnimationGuard;
        let (side_margin, bottom_margin, float_above_taskbar, view_mode, saved_height) = {
            let manager = window.state::<Arc<crate::settings_manager::SettingsManager>>();
            let s = manager.get();
            let is_mica = crate::effect_for_theme(&s.theme) == "mica";
            let no_corners = !s.round_corners;
            let side = if is_mica && no_corners {
                0.0
            } else {
                constants::WINDOW_MARGIN
            };
            let bottom = if is_mica && no_corners {
                0.0
            } else {
                constants::WINDOW_MARGIN
            };
            (
                side,
                bottom,
                s.float_above_taskbar,
                s.view_mode,
                s.window_height,
            )
        };
        if view_mode == "compact" {
            // Save last position for potential reuse
            if let Ok(pos) = window.outer_position() {
                let manager = window.state::<Arc<crate::settings_manager::SettingsManager>>();
                let mut s = manager.get();
                s.compact_last_position_x = Some(pos.x);
                s.compact_last_position_y = Some(pos.y);
                let _ = manager.save(s);
            }
            let _ = window.hide();
        } else {
            if let Some(monitor) = window.current_monitor().ok().flatten() {
                let scale_factor = monitor.scale_factor();
                let monitor_pos = monitor.position();
                let monitor_size = monitor.size();
                let work_area = monitor.work_area();
                let logical_window_height = if saved_height > 100.0 {
                    saved_height
                } else {
                    constants::FULL_HEIGHT
                };
                let window_height_px = (logical_window_height * scale_factor) as u32;
                let side_margin_px = (side_margin * scale_factor) as i32;
                let bottom_margin_px = (bottom_margin * scale_factor) as i32;
                let reference_bottom = if float_above_taskbar {
                    monitor_pos.y + monitor_size.height as i32
                } else {
                    work_area.position.y + work_area.size.height as i32
                };
                let start_y = reference_bottom - window_height_px as i32 - bottom_margin_px;
                let target_y = reference_bottom;
                let steps = 15;
                let duration = std::time::Duration::from_millis(10);
                let dy = (target_y - start_y) as f64 / steps as f64;
                for i in 1..=steps {
                    let current_y = start_y as f64 + dy * i as f64;
                    let _ =
                        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                            x: work_area.position.x + side_margin_px,
                            y: current_y as i32,
                        }));
                    std::thread::sleep(duration);
                }
                let _ = window.hide();
            } else {
                log::warn!("current_monitor returned None in animate_window_hide, forcing hide");
                let _ = window.hide();
            }
        }
        if let Some(callback) = on_done {
            callback();
        }
    });
}

fn get_data_dir() -> std::path::PathBuf {
    let current_dir = std::env::current_dir().unwrap_or(std::path::PathBuf::from("."));
    match dirs::data_dir() {
        Some(path) => path.join("CyberPaste"),
        None => current_dir.join("CyberPaste"),
    }
}

pub fn get_monitor_at_point(
    window: &tauri::WebviewWindow,
    point: windows::Win32::Foundation::POINT,
) -> Option<tauri::Monitor> {
    if let Ok(monitors) = window.available_monitors() {
        for m in monitors {
            let pos = m.position();
            let size = m.size();
            if point.x >= pos.x
                && point.x < pos.x + size.width as i32
                && point.y >= pos.y
                && point.y < pos.y + size.height as i32
            {
                return Some(m);
            }
        }
    }
    window.current_monitor().ok().flatten()
}

pub fn get_monitor_at_cursor(window: &tauri::WebviewWindow) -> Option<tauri::Monitor> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut point = POINT { x: 0, y: 0 };
    if unsafe { GetCursorPos(&mut point).is_ok() } {
        get_monitor_at_point(window, point)
    } else {
        window.current_monitor().ok().flatten()
    }
}

/// Canonical theme id. Maps legacy values and unknowns to the supported set.
pub fn normalize_theme(theme: &str) -> &str {
    match theme {
        "cyberpaste" => "cyberpaste",
        "dark" => "dark",
        "light" => "light",
        "system" => "system",
        _ => "cyberpaste",
    }
}

/// Window material derived from the theme — no longer user-selectable.
/// Dark is the only Mica-backed theme; everything else is `clear` (opaque).
pub fn effect_for_theme(theme: &str) -> &'static str {
    match normalize_theme(theme) {
        "dark" => "mica",
        _ => "clear",
    }
}

pub fn apply_window_effect(
    window: &tauri::WebviewWindow,
    effect: &str,
    theme: &tauri::Theme,
    round_corners: bool,
) {
    use window_vibrancy::{apply_mica, clear_mica};
    match effect {
        "mica" => {
            let _ = clear_mica(window);
            let _ = apply_mica(window, Some(matches!(theme, tauri::Theme::Dark)));
        }
        "clear" | _ => {
            let _ = clear_mica(window);
        }
    }
    let use_rounded = effect == "clear" || round_corners;
    if let Ok(handle) = window.hwnd() {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Dwm::{
            DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND, DWMWCP_ROUND,
        };
        let hwnd = HWND(handle.0 as _);
        let corner_pref = if use_rounded {
            DWMWCP_ROUND.0
        } else {
            DWMWCP_DONOTROUND.0
        };
        unsafe {
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &corner_pref as *const _ as *const _,
                std::mem::size_of::<u32>() as u32,
            );
        }
    }
}

pub fn update_tray_icon(tray: &TrayIcon, theme: &tauri::Theme) {
    let icon_data: &[u8] = match theme {
        tauri::Theme::Dark => include_bytes!("../icons/tray_white.png"),
        _ => include_bytes!("../icons/tray.png"),
    };
    if let Ok(icon) = Image::from_bytes(icon_data) {
        let _ = tray.set_icon(Some(icon));
    }
}

fn generate_activation_sound_wav() -> Vec<u8> {
    let p = 1.0;
    let c = 0.45;
    let v = 0.28;

    let sr = 44100;
    let duration_ms = 90;
    let n = sr * duration_ms / 1000;

    let data_size = n * 2;
    let mut wav = Vec::with_capacity(44 + data_size);

    // Write WAV header
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&((36 + data_size) as u32).to_le_bytes());
    wav.extend_from_slice(b"WAVE");
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&(16u32).to_le_bytes());
    wav.extend_from_slice(&(1u16).to_le_bytes()); // PCM
    wav.extend_from_slice(&(1u16).to_le_bytes()); // Mono
    wav.extend_from_slice(&(sr as u32).to_le_bytes()); // Sample rate
    wav.extend_from_slice(&((sr * 2) as u32).to_le_bytes()); // Byte rate
    wav.extend_from_slice(&(2u16).to_le_bytes()); // Block align
    wav.extend_from_slice(&(16u16).to_le_bytes()); // Bits per sample
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&(data_size as u32).to_le_bytes());

    // Helpers
    fn soft_clip(x: f64) -> f64 {
        (x * 1.2).tanh() / 1.2f64.tanh()
    }

    fn env(t: f64, attack_ms: f64, decay_rate: f64) -> f64 {
        let a = attack_ms / 1000.0;
        let atk = if t < a {
            (std::f64::consts::PI * 0.5 * t / a).sin()
        } else {
            1.0
        };
        atk * (-t * decay_rate).exp()
    }

    // Deterministic random generator for the noise transient
    let mut state: u32 = 42;
    let mut next_double = |state: &mut u32| -> f64 {
        *state = state.wrapping_mul(1664525).wrapping_add(1013904223);
        (*state as f64) / (u32::MAX as f64)
    };

    for i in 0..n {
        let t = (i as f64) / (sr as f64);

        // Gentle noise transient
        let noise_val = next_double(&mut state) * 2.0 - 1.0;
        let noise = noise_val * (-t * 400.0).exp() * 0.06;

        // Warm fundamental with slow chirp settling
        let f0 = (720.0 + 20.0 * (-t * 80.0).exp()) * p;
        let fund = (2.0 * std::f64::consts::PI * f0 * t).sin() * env(t, 4.0, 32.0) * 0.30;

        // Soft harmonic
        let h2 = (2.0 * std::f64::consts::PI * f0 * 2.0 * t).sin() * env(t, 4.0, 55.0) * (0.08 + c * 0.06);

        // Sub body
        let sub = (2.0 * std::f64::consts::PI * 260.0 * p * t).sin() * env(t, 6.0, 25.0) * 0.12;

        let sample = soft_clip(noise + fund + h2 + sub) * v;

        let sample_clamped = sample.clamp(-1.0, 1.0);
        let sample_i16 = (sample_clamped * (i16::MAX as f64)) as i16;
        wav.extend_from_slice(&sample_i16.to_le_bytes());
    }

    wav
}

/// Refresh tray tooltip + push state to the HTML tray popup (no native Win32 menu).
pub fn rebuild_tray_menu(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    let state = commands::collect_tray_menu_state(app);
    if let Some(tray) = app.tray_by_id("main") {
        // Ensure no native context menu is attached — we own the right-click popup.
        let _ = tray.set_menu(None::<tauri::menu::Menu<tauri::Wry>>);
        let _ = tray.set_tooltip(Some(format!("CyberPaste v{}", state.version)));
    }
    let _ = app.emit("tray-menu-state", &state);
    Ok(())
}
