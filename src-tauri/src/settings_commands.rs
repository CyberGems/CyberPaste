use crate::settings_manager::SettingsManager;
use dark_light::Mode;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

const MAX_RECENT_SEARCHES: usize = 10;

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<serde_json::Value, String> {
    let manager = app.state::<Arc<SettingsManager>>();
    let mut value = manager.frontend_value();

    #[cfg(not(any(feature = "app-store", feature = "portable")))]
    {
        use tauri_plugin_autostart::ManagerExt;
        if let Ok(is_enabled) = app.autolaunch().is_enabled() {
            if let Some(obj) = value.as_object_mut() {
                obj.insert(
                    "startup_with_windows".to_string(),
                    serde_json::json!(is_enabled),
                );
            }
        }
    }

    #[cfg(feature = "portable")]
    if let Some(obj) = value.as_object_mut() {
        obj.insert("startup_with_windows".to_string(), serde_json::json!(false));
    }

    Ok(value)
}

#[tauri::command]
pub async fn record_search_history(app: AppHandle, query: String) -> Result<Vec<String>, String> {
    crate::app_lock::require_unlocked()?;
    let manager = app.state::<Arc<SettingsManager>>();
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(manager.get().recent_searches);
    }

    let mut current = manager.get();
    let normalized = trimmed.to_lowercase();
    let mut recent = vec![trimmed.to_string()];
    for entry in current.recent_searches.drain(..) {
        let entry = entry.trim().to_string();
        if entry.is_empty()
            || entry.to_lowercase() == normalized
            || recent
                .iter()
                .any(|existing| existing.to_lowercase() == entry.to_lowercase())
        {
            continue;
        }
        recent.push(entry);
        if recent.len() >= MAX_RECENT_SEARCHES {
            break;
        }
    }
    current.recent_searches = recent.clone();
    manager.save(current)?;
    crate::settings_manager::emit_changed(&app);
    Ok(recent)
}

#[tauri::command]
pub async fn clear_search_history(app: AppHandle) -> Result<Vec<String>, String> {
    crate::app_lock::require_unlocked()?;
    let manager = app.state::<Arc<SettingsManager>>();
    let mut current = manager.get();
    current.recent_searches.clear();
    manager.save(current)?;
    crate::settings_manager::emit_changed(&app);
    Ok(Vec::new())
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: serde_json::Value) -> Result<(), String> {
    crate::app_lock::require_unlocked()?;
    let manager = app.state::<Arc<SettingsManager>>();

    // Deserialize incoming settings (Frontend sends full object except ignored_apps)
    let incoming_has_tray_pin_tip = settings.get("has_seen_tray_pin_tip").is_some();
    let incoming_has_first_used_at = settings.get("first_used_at").is_some();
    let incoming_api_key = settings
        .get("ai_api_key")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let mut new_settings: crate::models::AppSettings =
        serde_json::from_value(settings).map_err(|e| e.to_string())?;
    new_settings.max_clipboard_text_bytes =
        crate::content_limits::normalize_max_clipboard_text_bytes(
            new_settings.max_clipboard_text_bytes,
        );
    new_settings.max_clipboard_image_bytes =
        crate::content_limits::normalize_max_clipboard_image_bytes(
            new_settings.max_clipboard_image_bytes,
        );
    new_settings.storage_quota_bytes =
        crate::content_limits::normalize_storage_quota_bytes(new_settings.storage_quota_bytes);

    // Preserve ignored_apps from current state (as frontend doesn't send it in this call)
    let current = manager.get();
    new_settings.ignored_apps = current.ignored_apps;
    #[cfg(feature = "portable")]
    {
        // Portable builds share the profile with the installed build, but must
        // never change the installed build's Windows autostart preference.
        new_settings.startup_with_windows = current.startup_with_windows;
    }
    if !incoming_has_tray_pin_tip {
        new_settings.has_seen_tray_pin_tip = current.has_seen_tray_pin_tip;
    }
    if !incoming_has_first_used_at {
        new_settings.first_used_at = current.first_used_at.clone();
    }
    // Search history is managed by dedicated commands so stale settings round-trips cannot
    // overwrite a newer query committed by another window.
    new_settings.recent_searches = current.recent_searches.clone();

    // Lock core is only changed via dedicated commands.
    new_settings.app_lock_enabled = current.app_lock_enabled;
    new_settings.app_lock_mode = current.app_lock_mode.clone();
    new_settings.app_lock_hash = current.app_lock_hash.clone();
    new_settings.app_lock_recovery_hash = current.app_lock_recovery_hash.clone();

    crate::secrets::apply_incoming_api_key(
        &mut new_settings,
        &current.ai_api_key,
        incoming_api_key.as_deref(),
    )?;

    // Window effect: only re-apply DWM vibrancy if theme or round_corners actually changed
    let theme_str = crate::normalize_theme(&new_settings.theme).to_string();
    new_settings.theme = theme_str.clone();
    let mica_effect = crate::effect_for_theme(&theme_str).to_string();
    new_settings.mica_effect = mica_effect.clone();
    let round_corners = new_settings.round_corners;

    let theme_changed = current.theme != new_settings.theme
        || current.round_corners != new_settings.round_corners;

    if theme_changed {
        log::info!(
            "save_settings: theme changed ({} -> {}), applying window effect: {}",
            current.theme,
            theme_str,
            mica_effect
        );
        match app.get_webview_window("main") {
            Some(win) => {
                let current_theme = if theme_str == "light" {
                    tauri::Theme::Light
                } else if theme_str == "dark" || theme_str == "cyberpaste" {
                    tauri::Theme::Dark
                } else {
                    let mode = dark_light::detect().map_err(|e| {
                        log::error!("save_settings: dark_light::detect() failed: {:?}", e);
                        e.to_string()
                    })?;
                    match mode {
                        Mode::Dark => tauri::Theme::Dark,
                        _ => tauri::Theme::Light,
                    }
                };
                crate::apply_window_effect(&win, &mica_effect, &current_theme, round_corners);
            }
            None => {
                log::warn!("save_settings: main window not found, skipping window effect");
            }
        }
    }

    #[cfg(not(any(feature = "app-store", feature = "portable")))]
    {
        use tauri_plugin_autostart::ManagerExt;
        let startup = new_settings.startup_with_windows;
        let current_state = app.autolaunch().is_enabled().unwrap_or(false);
        if startup != current_state {
            crate::apply_autostart(&app, startup);
        }
    }
    log::info!(
        "save_settings: auto_paste={}, language={}, theme={}, max_items={}, compact_sidebar_collapsed={}",
        new_settings.auto_paste,
        new_settings.language,
        new_settings.theme,
        new_settings.max_items,
        new_settings.compact_sidebar_collapsed
    );
    manager.save(new_settings)?;
    let _ = crate::rebuild_tray_menu(&app);
    crate::settings_manager::emit_changed(&app);
    if let Some(db) = app.try_state::<std::sync::Arc<crate::database::Database>>() {
        let _ = crate::commands::enforce_storage_policy(
            app.clone(),
            db.inner().clone(),
            manager.get(),
        )
        .await;
    }
    Ok(())
}

#[tauri::command]
pub async fn add_ignored_app(app_name: String, app: AppHandle) -> Result<(), String> {
    let manager = app.state::<Arc<SettingsManager>>();
    let mut current = manager.get();
    if current.ignored_apps.insert(app_name) {
        manager.save(current)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn remove_ignored_app(app_name: String, app: AppHandle) -> Result<(), String> {
    let manager = app.state::<Arc<SettingsManager>>();
    let mut current = manager.get();
    if current.ignored_apps.remove(&app_name) {
        manager.save(current)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_ignored_apps(app: AppHandle) -> Result<Vec<String>, String> {
    let manager = app.state::<Arc<SettingsManager>>();
    let mut apps: Vec<String> = manager.get().ignored_apps.into_iter().collect();
    apps.sort();
    Ok(apps)
}
