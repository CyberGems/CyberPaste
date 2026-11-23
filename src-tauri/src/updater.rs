use std::sync::Mutex;
use std::time::{Duration, Instant};

#[cfg(not(any(feature = "app-store", feature = "portable")))]
use crate::settings_manager::SettingsManager;
use log::error;
use serde::{Deserialize, Serialize};
#[cfg(not(any(feature = "app-store", feature = "portable")))]
use std::sync::Arc;
use tauri::async_runtime::Mutex as AsyncMutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::Update;
#[cfg(not(any(feature = "app-store", feature = "portable")))]
use tauri_plugin_updater::UpdaterExt;
use tokio::task::AbortHandle;
use tokio::time::timeout;

#[derive(Default)]
pub struct UpdaterState {
    pending: Mutex<Option<PendingUpdate>>,
    check: AsyncMutex<()>,
}

struct PendingUpdate {
    update: Update,
    status: UpdateStatusPayload,
    abort: Option<AbortHandle>,
    bytes: Option<Vec<u8>>,
}

#[derive(Clone, Copy, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Available,
    Downloading,
    Downloaded,
    Installing,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusPayload {
    state: Phase,
    version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    release_notes: Option<String>,
    transferred: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    total: Option<u64>,
    cancelling: bool,
    failed: bool,
    manual: bool,
    dismissed: bool,
    open_request: u32,
}

fn lock_or_recover<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn emit_status(app: &AppHandle, status: Option<&UpdateStatusPayload>) {
    let _ = app.emit("update:status", status);
}

#[tauri::command]
pub fn get_update_status(app: AppHandle) -> Option<UpdateStatusPayload> {
    let state = app.state::<UpdaterState>();
    let pending = lock_or_recover(&state.pending);
    pending.as_ref().map(|p| p.status.clone())
}

pub fn tray_update_available(app: &AppHandle, automatic: bool, skipped: Option<&str>) -> bool {
    let state = app.state::<UpdaterState>();
    let pending = lock_or_recover(&state.pending);
    pending.as_ref().is_some_and(|p| {
        p.status.state != Phase::Available
            || p.status.manual
            || (automatic && skipped != Some(p.status.version.as_str()))
    })
}

pub fn hide_skipped_version(app: &AppHandle, version: &str) {
    let state = app.state::<UpdaterState>();
    let mut pending = lock_or_recover(&state.pending);
    if let Some(pending) = pending
        .as_mut()
        .filter(|p| p.status.version == version && p.status.state == Phase::Available)
    {
        pending.status.manual = false;
        pending.status.dismissed = true;
        emit_status(app, Some(&pending.status));
    }
}

#[tauri::command]
pub fn open_update_notice(app: AppHandle) -> Result<(), String> {
    {
        let state = app.state::<UpdaterState>();
        let mut pending = lock_or_recover(&state.pending);
        let pending = pending.as_mut().ok_or("No update is pending.")?;
        pending.status.manual = true;
        pending.status.dismissed = false;
        pending.status.open_request = pending.status.open_request.wrapping_add(1);
        emit_status(&app, Some(&pending.status));
    }
    if !crate::app_lock::is_locked() {
        let main = app
            .get_webview_window("main")
            .ok_or("Main window is unavailable.")?;
        if main.is_visible().unwrap_or(false) && !main.is_minimized().unwrap_or(false) {
            crate::force_window_foreground(&main);
        } else {
            crate::position_window_at_bottom(&main);
        }
    }
    crate::rebuild_tray_menu(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn dismiss_update_notice(app: AppHandle, version: String, phase: Phase) {
    let state = app.state::<UpdaterState>();
    let mut pending = lock_or_recover(&state.pending);
    if let Some(pending) = pending.as_mut().filter(|p| {
        p.status.version == version && p.status.state == phase && phase != Phase::Installing
    }) {
        pending.status.dismissed = true;
        emit_status(&app, Some(&pending.status));
    }
}

#[derive(Serialize)]
pub struct CheckResult {
    available: bool,
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle, background: bool) -> Result<CheckResult, String> {
    timed_check(&app, background).await.inspect_err(|message| {
        error!("Updater: check failed: {message}");
    })
}

async fn timed_check(app: &AppHandle, background: bool) -> Result<CheckResult, String> {
    timeout(Duration::from_secs(15), perform_check(app, background))
        .await
        .map_err(|_| "Update check timed out".to_string())?
}

#[cfg(any(feature = "app-store", feature = "portable"))]
async fn perform_check(_app: &AppHandle, _background: bool) -> Result<CheckResult, String> {
    Err("In-app updates are unavailable for this edition.".into())
}

#[cfg(not(any(feature = "app-store", feature = "portable")))]
async fn perform_check(app: &AppHandle, background: bool) -> Result<CheckResult, String> {
    let state = app.state::<UpdaterState>();
    let _check = state.check.lock().await;
    if lock_or_recover(&state.pending)
        .as_ref()
        .is_some_and(|p| p.status.state != Phase::Available)
    {
        return Ok(CheckResult { available: true });
    }

    let updater = app.updater().map_err(|error| error.to_string())?;
    let release = updater.check().await.map_err(|error| error.to_string())?;
    let mut pending = lock_or_recover(&state.pending);
    if background && !app.state::<Arc<SettingsManager>>().get().auto_check_updates {
        return Ok(CheckResult {
            available: pending.is_some(),
        });
    }

    if let Some(update) = release {
        if pending
            .as_ref()
            .is_some_and(|p| p.status.version == update.version)
        {
            return Ok(CheckResult { available: true });
        }
        let status = UpdateStatusPayload {
            state: Phase::Available,
            version: update.version.clone(),
            release_notes: update.body.clone(),
            transferred: 0,
            total: None,
            cancelling: false,
            failed: false,
            manual: false,
            dismissed: false,
            open_request: 0,
        };
        emit_status(app, Some(&status));
        *pending = Some(PendingUpdate {
            update,
            status,
            abort: None,
            bytes: None,
        });
    } else if pending.take().is_some() {
        emit_status(app, None);
    }
    let available = pending.is_some();
    drop(pending);
    let _ = crate::rebuild_tray_menu(app);
    Ok(CheckResult { available })
}

#[tauri::command]
pub async fn download_update(app: AppHandle, version: String) -> Result<(), String> {
    crate::app_lock::require_unlocked()?;
    if cfg!(any(feature = "app-store", feature = "portable")) {
        return Err("In-app downloads are unavailable for this edition.".into());
    }

    let state = app.state::<UpdaterState>();
    let _check = state.check.lock().await;
    let mut pending = lock_or_recover(&state.pending);
    let pending = pending
        .as_mut()
        .filter(|p| p.status.version == version && p.status.state == Phase::Available)
        .ok_or("This update is no longer available to download.")?;

    let update = pending.update.clone();
    let progress_app = app.clone();
    let progress_version = version.clone();
    let download = tauri::async_runtime::spawn(async move {
        let mut transferred = 0_u64;
        let mut last_tick = None::<Instant>;
        update
            .download(
                move |chunk, total| {
                    transferred = transferred.saturating_add(chunk as u64);
                    let now = Instant::now();
                    if last_tick
                        .is_some_and(|tick| now.duration_since(tick) < Duration::from_millis(120))
                        && total != Some(transferred)
                    {
                        return;
                    }
                    last_tick = Some(now);
                    let state = progress_app.state::<UpdaterState>();
                    let mut pending = lock_or_recover(&state.pending);
                    if let Some(p) = pending.as_mut().filter(|p| {
                        p.status.version == progress_version
                            && p.status.state == Phase::Downloading
                            && !p.status.cancelling
                    }) {
                        p.status.transferred = transferred;
                        p.status.total = total;
                        emit_status(&progress_app, Some(&p.status));
                    }
                },
                || {},
            )
            .await
            .map_err(|error| error.to_string())
    });

    pending.status.state = Phase::Downloading;
    pending.status.failed = false;
    pending.status.manual = true;
    pending.status.dismissed = false;
    pending.status.transferred = 0;
    pending.status.total = None;
    pending.abort = Some(download.inner().abort_handle());
    emit_status(&app, Some(&pending.status));

    // Keep the completion task independent of the webview. Full Mode can be
    // unloaded while the download continues in the background.
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = download
            .await
            .map_err(|error| error.to_string())
            .and_then(|result| result);
        finish_download(&app, &version, result);
        let _ = crate::rebuild_tray_menu(&app);
    });
    Ok(())
}

fn finish_download(app: &AppHandle, version: &str, result: Result<Vec<u8>, String>) {
    let state = app.state::<UpdaterState>();
    let mut pending = lock_or_recover(&state.pending);
    let Some(pending) = pending
        .as_mut()
        .filter(|p| p.status.version == version && p.status.state == Phase::Downloading)
    else {
        return;
    };
    let cancelled = pending.status.cancelling;
    pending.abort = None;
    pending.status.cancelling = false;
    pending.status.state = Phase::Available;
    pending.status.dismissed = false;
    if !cancelled {
        match result {
            Ok(bytes) => {
                pending.bytes = Some(bytes);
                pending.status.state = Phase::Downloaded;
            }
            Err(message) => {
                pending.status.failed = true;
                error!("Updater: download failed: {message}");
            }
        }
    }
    emit_status(app, Some(&pending.status));
}

#[tauri::command]
pub fn cancel_update_download(app: AppHandle, version: String) -> Result<(), String> {
    crate::app_lock::require_unlocked()?;
    let state = app.state::<UpdaterState>();
    let mut pending = lock_or_recover(&state.pending);
    let pending = pending
        .as_mut()
        .filter(|p| p.status.version == version)
        .ok_or("This update is no longer downloading.")?;
    let abort = pending
        .abort
        .as_ref()
        .ok_or("This update is no longer downloading.")?;
    pending.status.cancelling = true;
    emit_status(&app, Some(&pending.status));
    abort.abort();
    Ok(())
}

#[tauri::command]
pub async fn install_update(app: AppHandle, version: String) -> Result<(), String> {
    crate::app_lock::require_unlocked()?;
    if cfg!(any(feature = "app-store", feature = "portable")) {
        return Err("In-app installation is unavailable for this edition.".into());
    }

    let (update, bytes) = {
        let state = app.state::<UpdaterState>();
        let mut pending = lock_or_recover(&state.pending);
        let pending = pending
            .as_mut()
            .filter(|p| p.status.version == version && p.status.state == Phase::Downloaded)
            .ok_or("This update is not ready to install.")?;
        let bytes = pending
            .bytes
            .take()
            .ok_or("The verified package is missing.")?;
        pending.status.state = Phase::Installing;
        pending.status.failed = false;
        emit_status(&app, Some(&pending.status));
        (pending.update.clone(), bytes)
    };

    // On Windows the verified installer closes the app and handles relaunch.
    if let Err(error) = update.install(&bytes) {
        let state = app.state::<UpdaterState>();
        let mut pending = lock_or_recover(&state.pending);
        if let Some(pending) = pending.as_mut() {
            pending.bytes = Some(bytes);
            pending.status.state = Phase::Downloaded;
            pending.status.failed = true;
            emit_status(&app, Some(&pending.status));
        }
        let message = error.to_string();
        error!("Updater: installation failed: {message}");
        return Err(message);
    }

    app.request_restart();
    Ok(())
}
