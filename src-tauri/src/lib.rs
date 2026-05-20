#![allow(non_snake_case)] // crate name CyberPaste is intentional
use std::fs;
use std::str::FromStr;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
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
mod models;
mod settings_commands;
mod settings_manager;

use database::Database;
use models::get_runtime;
use settings_manager::SettingsManager;

pub fn run_app() {
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
                        let mica_effect = settings.mica_effect;
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

                                     // NEW SAFETY: If cursor is inside window, don't hide (fixes dragging)
                                     let is_inside = if let (Ok(pos), Ok(size)) = (win_clone.outer_position(), win_clone.outer_size()) {
                                         use windows::Win32::Foundation::POINT;
                                         use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
                                         let mut point = POINT { x: 0, y: 0 };
                                         let has_cursor = unsafe { GetCursorPos(&mut point).is_ok() };
                                         if has_cursor {
                                             point.x >= pos.x && point.x <= pos.x + size.width as i32 &&
                                             point.y >= pos.y && point.y <= pos.y + size.height as i32
                                         } else {
                                             false
                                         }
                                     } else {
                                         false
                                     };

                                     if is_pinned || is_inside {
                                         log::info!("Auto-hide skipped: pinned={} inside={}", is_pinned, is_inside);
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

            let version = env!("CARGO_PKG_VERSION");
            let title = format!("v{}", version);
            let title_i = MenuItem::with_id(app, "title", &title, false, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit CyberPaste", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let separator_i = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&title_i, &show_i, &settings_i, &separator_i, &quit_i])?;

            let is_dark = dark_light::detect().map(|m| m == dark_light::Mode::Dark).unwrap_or(false);
            let icon_data: &[u8] = if is_dark {
                include_bytes!("../icons/tray_white.png")
            } else {
                include_bytes!("../icons/tray.png")
            };
            let icon = Image::from_bytes(icon_data).expect("Failed to load icon");

            let tray_builder = TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false);

            let _tray = tray_builder
                .tooltip("CyberPaste")
                .on_menu_event(move |app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    } else if event.id.as_ref() == "show" {
                        if let Some(win) = app.get_webview_window("main") {
                            position_window_at_bottom(&win);
                        }
                    } else if event.id.as_ref() == "settings" {
                        // Open settings window directly without showing the main window
                        if let Some(settings_win) = app.get_webview_window("settings") {
                            let _ = settings_win.unminimize();
                            let _ = settings_win.show();
                            let _ = settings_win.set_focus();
                        } else {
                            let _ = tauri::WebviewWindowBuilder::new(
                                app,
                                "settings",
                                tauri::WebviewUrl::App("index.html?window=settings".into()),
                            )
                            .title("Settings")
                            .inner_size(800.0, 700.0)
                            .resizable(true)
                            .maximizable(true)
                            .decorations(false)
                            .transparent(false)
                            .center()
                            .build();
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        if let Some(win) = tray.app_handle().get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) && win.is_focused().unwrap_or(false) {
                                crate::animate_window_hide(&win, None);
                            } else {
                                position_window_at_bottom(&win);
                            }
                        }
                    }
                })
                .build(app)?;

            let app_handle = handle.clone();
            let win = app_handle.get_webview_window("main").unwrap();

            {
                let manager = app_handle.state::<Arc<SettingsManager>>();
                let settings = manager.get();
                let mica_effect = settings.mica_effect;
                let theme = settings.theme;
                let round_corners = settings.round_corners;

                let current_theme = if theme == "light" {
                    tauri::Theme::Light
                } else if theme == "dark" {
                    tauri::Theme::Dark
                } else {
                    win.theme().unwrap_or(tauri::Theme::Light)
                };

                crate::apply_window_effect(&win, &mica_effect, &current_theme, round_corners);
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::get_clips,
            commands::get_clip,
            commands::get_clip_detail,
            commands::paste_clip,
            commands::delete_clip,
            commands::toggle_clip_pin,
            commands::move_to_folder,
            commands::reorder_clip,
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
            commands::open_with,
            commands::reset_window_size,
            commands::center_window,
            commands::play_clipboard_sound,
            commands::simulate_ctrl_v,
            commands::show_toast,
            commands::hide_toast,
            commands::set_toast_position,
            commands::open_image_viewer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn position_window_at_bottom(window: &tauri::WebviewWindow) {
    animate_window_show(window);
}

pub fn animate_window_show(window: &tauri::WebviewWindow) {
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
        ) = {
            let manager = window.state::<Arc<crate::settings_manager::SettingsManager>>();
            let s = manager.get();
            let is_mica = s.mica_effect != "clear";
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
            let _ = window.show();
            let _ = window.unminimize();
        }
    });
}

pub fn animate_window_hide(
    window: &tauri::WebviewWindow,
    on_done: Option<Box<dyn FnOnce() + Send>>,
) {
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
            let is_mica = s.mica_effect != "clear";
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

pub fn apply_window_effect(
    window: &tauri::WebviewWindow,
    effect: &str,
    theme: &tauri::Theme,
    round_corners: bool,
) {
    use window_vibrancy::{apply_mica, apply_tabbed, clear_mica};
    match effect {
        "clear" => {
            let _ = clear_mica(window);
        }
        "mica" | "dark" => {
            let _ = clear_mica(window);
            let _ = apply_mica(window, Some(matches!(theme, tauri::Theme::Dark)));
        }
        "mica_alt" | "auto" | _ => {
            let _ = clear_mica(window);
            let _ = apply_tabbed(window, Some(matches!(theme, tauri::Theme::Dark)));
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
