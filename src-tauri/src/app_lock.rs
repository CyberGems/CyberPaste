use crate::models::AppSettings;
use crate::settings_manager::SettingsManager;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

pub const ERR_LOCKED: &str = "APP_LOCKED";
pub const ERR_INVALID: &str = "APP_LOCK_INVALID_SECRET";
pub const ERR_RATE_LIMITED: &str = "APP_LOCK_RATE_LIMITED";
pub const ERR_NOT_ENABLED: &str = "APP_LOCK_NOT_ENABLED";
pub const ERR_ALREADY_ENABLED: &str = "APP_LOCK_ALREADY_ENABLED";
pub const ERR_WEAK: &str = "APP_LOCK_WEAK_SECRET";
pub const ERR_MISMATCH: &str = "APP_LOCK_CONFIRM_MISMATCH";
pub const ERR_NO_RECOVERY_KEY: &str = "APP_LOCK_NO_RECOVERY_KEY";

const RECOVERY_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_KEY_LEN: usize = 16;

const MAX_PIN_LEN: usize = 8;
const MIN_PIN_LEN: usize = 4;
const MIN_PASSWORD_LEN: usize = 6;
const RATE_LIMIT_AFTER: u32 = 5;
const RATE_LIMIT_BASE_SECS: u64 = 15;
const RATE_LIMIT_MAX_SECS: u64 = 300;

#[derive(Debug, Clone, Serialize)]
pub struct AppLockStatus {
    pub enabled: bool,
    pub locked: bool,
    pub mode: String,
    pub lockout_remaining_ms: u64,
    pub failed_attempts: u32,
    pub on_hide: bool,
    pub on_windows_lock: bool,
    pub idle_seconds: i64,
    pub pause_capture: bool,
    pub has_recovery_key: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct AppLockKeyResult {
    pub status: AppLockStatus,
    pub recovery_key: String,
}

struct Inner {
    enabled: bool,
    unlocked: bool,
    mode: String,
    on_hide: bool,
    on_windows_lock: bool,
    idle_seconds: i64,
    pause_capture: bool,
    failed_attempts: u32,
    lockout_until: Option<Instant>,
    last_activity: Instant,
}

pub struct AppLock {
    inner: Mutex<Inner>,
}

static LOCK: OnceLock<Arc<AppLock>> = OnceLock::new();

fn global() -> &'static AppLock {
    LOCK.get().expect("app lock not initialized")
}

pub fn init(settings: &AppSettings) {
    let enabled = settings.app_lock_enabled && !settings.app_lock_hash.is_empty();
    let lock = Arc::new(AppLock {
        inner: Mutex::new(Inner {
            enabled,
            unlocked: !enabled,
            mode: normalize_mode(&settings.app_lock_mode),
            on_hide: settings.app_lock_on_hide,
            on_windows_lock: settings.app_lock_on_windows_lock,
            idle_seconds: settings.app_lock_idle_seconds.max(0),
            pause_capture: settings.app_lock_pause_capture,
            failed_attempts: 0,
            lockout_until: None,
            last_activity: Instant::now(),
        }),
    });
    let _ = LOCK.set(lock);
}

pub fn sync_options(settings: &AppSettings) {
    let Some(lock) = LOCK.get() else {
        return;
    };
    let mut inner = lock.inner.lock();
    inner.enabled = settings.app_lock_enabled && !settings.app_lock_hash.is_empty();
    inner.mode = normalize_mode(&settings.app_lock_mode);
    inner.on_hide = settings.app_lock_on_hide;
    inner.on_windows_lock = settings.app_lock_on_windows_lock;
    inner.idle_seconds = settings.app_lock_idle_seconds.max(0);
    inner.pause_capture = settings.app_lock_pause_capture;
    if !inner.enabled {
        inner.unlocked = true;
        inner.failed_attempts = 0;
        inner.lockout_until = None;
    }
}

pub fn require_unlocked() -> Result<(), String> {
    if is_locked() {
        Err(ERR_LOCKED.to_string())
    } else {
        touch_activity();
        Ok(())
    }
}

pub fn is_locked() -> bool {
    let Some(lock) = LOCK.get() else {
        return false;
    };
    let inner = lock.inner.lock();
    inner.enabled && !inner.unlocked
}

pub fn is_enabled() -> bool {
    let Some(lock) = LOCK.get() else {
        return false;
    };
    lock.inner.lock().enabled
}

pub fn should_skip_capture() -> bool {
    let Some(lock) = LOCK.get() else {
        return false;
    };
    let inner = lock.inner.lock();
    inner.enabled && !inner.unlocked && inner.pause_capture
}

pub fn touch_activity() {
    if let Some(lock) = LOCK.get() {
        lock.inner.lock().last_activity = Instant::now();
    }
}

pub fn status_from_settings(settings: &AppSettings) -> AppLockStatus {
    let Some(lock) = LOCK.get() else {
        return AppLockStatus {
            enabled: false,
            locked: false,
            mode: "pin".into(),
            lockout_remaining_ms: 0,
            failed_attempts: 0,
            on_hide: true,
            on_windows_lock: true,
            idle_seconds: 0,
            pause_capture: false,
            has_recovery_key: !settings.app_lock_recovery_hash.is_empty(),
        };
    };
    let inner = lock.inner.lock();
    AppLockStatus {
        enabled: inner.enabled,
        locked: inner.enabled && !inner.unlocked,
        mode: inner.mode.clone(),
        lockout_remaining_ms: remaining_ms(inner.lockout_until),
        failed_attempts: inner.failed_attempts,
        on_hide: inner.on_hide,
        on_windows_lock: inner.on_windows_lock,
        idle_seconds: inner.idle_seconds,
        pause_capture: inner.pause_capture,
        has_recovery_key: !settings.app_lock_recovery_hash.is_empty(),
    }
    .with_settings_fallback(settings)
}

impl AppLockStatus {
    fn with_settings_fallback(mut self, settings: &AppSettings) -> Self {
        if self.mode.is_empty() {
            self.mode = normalize_mode(&settings.app_lock_mode);
        }
        self
    }
}

fn remaining_ms(until: Option<Instant>) -> u64 {
    until
        .and_then(|t| t.checked_duration_since(Instant::now()))
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn normalize_mode(mode: &str) -> String {
    match mode {
        "password" => "password".into(),
        _ => "pin".into(),
    }
}

pub fn validate_secret(mode: &str, secret: &str) -> Result<(), String> {
    let secret = secret.trim();
    match normalize_mode(mode).as_str() {
        "pin" => {
            if secret.len() < MIN_PIN_LEN || secret.len() > MAX_PIN_LEN {
                return Err(ERR_WEAK.into());
            }
            if !secret.chars().all(|c| c.is_ascii_digit()) {
                return Err(ERR_WEAK.into());
            }
            Ok(())
        }
        _ => {
            if secret.len() < MIN_PASSWORD_LEN {
                return Err(ERR_WEAK.into());
            }
            Ok(())
        }
    }
}

pub fn hash_secret(secret: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    Argon2::default()
        .hash_password(secret.trim().as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| e.to_string())
}

fn verify_secret(secret: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(secret.trim().as_bytes(), &parsed)
        .is_ok()
}

fn generate_recovery_key() -> String {
    use argon2::password_hash::rand_core::{OsRng, RngCore};
    let mut raw = [0u8; RECOVERY_KEY_LEN];
    OsRng.fill_bytes(&mut raw);
    let chars: String = raw
        .iter()
        .map(|b| char::from(RECOVERY_ALPHABET[(*b as usize) % RECOVERY_ALPHABET.len()]))
        .collect();
    format_recovery_key(&chars)
}

fn format_recovery_key(normalized: &str) -> String {
    normalized
        .as_bytes()
        .chunks(4)
        .filter_map(|chunk| std::str::from_utf8(chunk).ok())
        .collect::<Vec<_>>()
        .join("-")
}

fn normalize_recovery_key(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .filter(|c| RECOVERY_ALPHABET.contains(&(*c as u8)))
        .collect()
}

fn hash_recovery_key(displayed: &str) -> Result<String, String> {
    let normalized = normalize_recovery_key(displayed);
    if normalized.len() != RECOVERY_KEY_LEN {
        return Err(ERR_INVALID.into());
    }
    hash_secret(&normalized)
}

fn verify_recovery_key(input: &str, hash: &str) -> bool {
    let normalized = normalize_recovery_key(input);
    if normalized.len() != RECOVERY_KEY_LEN || hash.is_empty() {
        return false;
    }
    verify_secret(&normalized, hash)
}

fn check_rate_limit(inner: &Inner) -> Result<(), String> {
    if remaining_ms(inner.lockout_until) > 0 {
        Err(ERR_RATE_LIMITED.into())
    } else {
        Ok(())
    }
}

fn register_failure(inner: &mut Inner) {
    inner.failed_attempts = inner.failed_attempts.saturating_add(1);
    if inner.failed_attempts >= RATE_LIMIT_AFTER {
        let extra = inner.failed_attempts.saturating_sub(RATE_LIMIT_AFTER);
        let secs = (RATE_LIMIT_BASE_SECS.saturating_mul(1u64 << extra.min(4)))
            .min(RATE_LIMIT_MAX_SECS);
        inner.lockout_until = Some(Instant::now() + Duration::from_secs(secs));
    }
}

fn register_success(inner: &mut Inner) {
    inner.failed_attempts = 0;
    inner.lockout_until = None;
    inner.unlocked = true;
    inner.last_activity = Instant::now();
}

pub fn lock_now(app: &AppHandle) {
    let Some(lock) = LOCK.get() else {
        return;
    };
    {
        let mut inner = lock.inner.lock();
        if !inner.enabled {
            return;
        }
        if !inner.unlocked {
            return;
        }
        inner.unlocked = false;
    }
    apply_lock_side_effects(app);
}

pub fn lock_on_hide(app: &AppHandle) {
    let Some(lock) = LOCK.get() else {
        return;
    };
    let should = {
        let inner = lock.inner.lock();
        inner.enabled && inner.unlocked && inner.on_hide
    };
    if should {
        lock_now(app);
    }
}

pub fn lock_on_windows_session(app: &AppHandle) {
    let Some(lock) = LOCK.get() else {
        return;
    };
    let should = {
        let inner = lock.inner.lock();
        inner.enabled && inner.unlocked && inner.on_windows_lock
    };
    if should {
        lock_now(app);
    }
}

pub fn check_idle_timeout(app: &AppHandle) {
    let Some(lock) = LOCK.get() else {
        return;
    };
    let should = {
        let inner = lock.inner.lock();
        if !inner.enabled || !inner.unlocked || inner.idle_seconds <= 0 {
            false
        } else {
            inner.last_activity.elapsed() >= Duration::from_secs(inner.idle_seconds as u64)
        }
    };
    if should {
        lock_now(app);
    }
}

fn apply_lock_side_effects(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.close();
    }
    if let Some(win) = app.get_webview_window("image_viewer") {
        let _ = win.close();
    }
    if let Some(win) = app.get_webview_window("toast") {
        let _ = win.hide();
    }
    let _ = crate::rebuild_tray_menu(app);
    emit_status(app);
}

fn emit_status(app: &AppHandle) {
    let manager = app.state::<Arc<SettingsManager>>();
    let settings = manager.get();
    let _ = app.emit("app-lock-changed", status_from_settings(&settings));
}

pub fn apply_from_restored_settings(app: &AppHandle, settings: &AppSettings) {
    sync_options(settings);
    if settings.app_lock_enabled && !settings.app_lock_hash.is_empty() {
        if let Some(lock) = LOCK.get() {
            lock.inner.lock().unlocked = false;
        }
        apply_lock_side_effects(app);
    } else if let Some(lock) = LOCK.get() {
        lock.inner.lock().unlocked = true;
        emit_status(app);
    }
}

fn settings_manager(app: &AppHandle) -> Arc<SettingsManager> {
    app.state::<Arc<SettingsManager>>().inner().clone()
}

#[tauri::command]
pub fn get_app_lock_status(app: AppHandle) -> AppLockStatus {
    let manager = app.state::<Arc<SettingsManager>>();
    status_from_settings(&manager.get())
}

#[tauri::command]
pub fn app_lock_ping() {
    if !is_locked() {
        touch_activity();
    }
}

#[tauri::command]
pub fn lock_app(app: AppHandle) -> Result<AppLockStatus, String> {
    if !is_enabled() {
        return Err(ERR_NOT_ENABLED.into());
    }
    lock_now(&app);
    Ok(get_app_lock_status(app))
}

#[tauri::command]
pub async fn unlock_app(app: AppHandle, secret: String) -> Result<AppLockStatus, String> {
    let manager = settings_manager(&app);
    let settings = manager.get();
    if !settings.app_lock_enabled || settings.app_lock_hash.is_empty() {
        return Err(ERR_NOT_ENABLED.into());
    }

    let hash = settings.app_lock_hash.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let lock = global();
        {
            let inner = lock.inner.lock();
            check_rate_limit(&inner)?;
        }
        let ok = verify_secret(&secret, &hash);
        let mut inner = lock.inner.lock();
        if ok {
            register_success(&mut inner);
            Ok(())
        } else {
            register_failure(&mut inner);
            Err(ERR_INVALID.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    result?;
    let _ = crate::rebuild_tray_menu(&app);
    emit_status(&app);
    Ok(get_app_lock_status(app))
}

#[tauri::command]
pub async fn enable_app_lock(
    app: AppHandle,
    mode: String,
    secret: String,
    confirm: String,
) -> Result<AppLockKeyResult, String> {
    if is_locked() {
        return Err(ERR_LOCKED.into());
    }
    let manager = settings_manager(&app);
    let current = manager.get();
    if current.app_lock_enabled && !current.app_lock_hash.is_empty() {
        return Err(ERR_ALREADY_ENABLED.into());
    }
    let mode = normalize_mode(&mode);
    if secret.trim() != confirm.trim() {
        return Err(ERR_MISMATCH.into());
    }
    validate_secret(&mode, &secret)?;
    let secret_for_hash = secret.clone();
    let (hash, recovery_key, recovery_hash) =
        tauri::async_runtime::spawn_blocking(move || {
            let hash = hash_secret(&secret_for_hash)?;
            let recovery_key = generate_recovery_key();
            let recovery_hash = hash_recovery_key(&recovery_key)?;
            Ok::<_, String>((hash, recovery_key, recovery_hash))
        })
        .await
        .map_err(|e| e.to_string())??;

    manager.update_sync(|s| {
        s.app_lock_enabled = true;
        s.app_lock_mode = mode.clone();
        s.app_lock_hash = hash;
        s.app_lock_recovery_hash = recovery_hash;
    })?;
    sync_options(&manager.get());
    if let Some(lock) = LOCK.get() {
        let mut inner = lock.inner.lock();
        inner.enabled = true;
        inner.unlocked = true;
        inner.mode = mode;
        register_success(&mut inner);
    }
    crate::settings_manager::emit_changed(&app);
    let _ = crate::rebuild_tray_menu(&app);
    emit_status(&app);
    Ok(AppLockKeyResult {
        status: get_app_lock_status(app),
        recovery_key,
    })
}

#[tauri::command]
pub async fn disable_app_lock(app: AppHandle, secret: String) -> Result<AppLockStatus, String> {
    let manager = settings_manager(&app);
    let settings = manager.get();
    if !settings.app_lock_enabled || settings.app_lock_hash.is_empty() {
        return Err(ERR_NOT_ENABLED.into());
    }
    let hash = settings.app_lock_hash.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let lock = global();
        {
            let inner = lock.inner.lock();
            check_rate_limit(&inner)?;
        }
        if !verify_secret(&secret, &hash) {
            let mut inner = lock.inner.lock();
            register_failure(&mut inner);
            return Err(ERR_INVALID.to_string());
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())??;

    manager.update_sync(|s| {
        s.app_lock_enabled = false;
        s.app_lock_hash.clear();
        s.app_lock_recovery_hash.clear();
    })?;
    sync_options(&manager.get());
    crate::settings_manager::emit_changed(&app);
    let _ = crate::rebuild_tray_menu(&app);
    emit_status(&app);
    Ok(get_app_lock_status(app))
}

#[tauri::command]
pub async fn change_app_lock_secret(
    app: AppHandle,
    current_secret: String,
    new_secret: String,
    confirm: String,
    mode: String,
) -> Result<AppLockStatus, String> {
    if is_locked() {
        return Err(ERR_LOCKED.into());
    }
    let manager = settings_manager(&app);
    let settings = manager.get();
    if !settings.app_lock_enabled || settings.app_lock_hash.is_empty() {
        return Err(ERR_NOT_ENABLED.into());
    }
    if new_secret.trim() != confirm.trim() {
        return Err(ERR_MISMATCH.into());
    }
    let mode = normalize_mode(&mode);
    validate_secret(&mode, &new_secret)?;
    let hash = settings.app_lock_hash.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !verify_secret(&current_secret, &hash) {
            Err(ERR_INVALID.to_string())
        } else {
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    let new_hash = tauri::async_runtime::spawn_blocking(move || hash_secret(&new_secret))
        .await
        .map_err(|e| e.to_string())??;

    manager.update_sync(|s| {
        s.app_lock_mode = mode.clone();
        s.app_lock_hash = new_hash;
    })?;
    sync_options(&manager.get());
    crate::settings_manager::emit_changed(&app);
    emit_status(&app);
    Ok(get_app_lock_status(app))
}

#[tauri::command]
pub async fn recover_app_lock(
    app: AppHandle,
    recovery_key: String,
    new_secret: String,
    confirm: String,
    mode: String,
) -> Result<AppLockStatus, String> {
    let manager = settings_manager(&app);
    let settings = manager.get();
    if !settings.app_lock_enabled || settings.app_lock_hash.is_empty() {
        return Err(ERR_NOT_ENABLED.into());
    }
    if settings.app_lock_recovery_hash.is_empty() {
        return Err(ERR_NO_RECOVERY_KEY.into());
    }
    if new_secret.trim() != confirm.trim() {
        return Err(ERR_MISMATCH.into());
    }
    let mode = normalize_mode(&mode);
    validate_secret(&mode, &new_secret)?;

    let recovery_hash = settings.app_lock_recovery_hash.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let lock = global();
        {
            let inner = lock.inner.lock();
            check_rate_limit(&inner)?;
        }
        if !verify_recovery_key(&recovery_key, &recovery_hash) {
            let mut inner = lock.inner.lock();
            register_failure(&mut inner);
            return Err(ERR_INVALID.to_string());
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())??;

    let new_hash = tauri::async_runtime::spawn_blocking(move || hash_secret(&new_secret))
        .await
        .map_err(|e| e.to_string())??;

    manager.update_sync(|s| {
        s.app_lock_mode = mode.clone();
        s.app_lock_hash = new_hash;
    })?;
    sync_options(&manager.get());
    if let Some(lock) = LOCK.get() {
        let mut inner = lock.inner.lock();
        inner.mode = mode;
        register_success(&mut inner);
    }
    crate::settings_manager::emit_changed(&app);
    let _ = crate::rebuild_tray_menu(&app);
    emit_status(&app);
    Ok(get_app_lock_status(app))
}

#[tauri::command]
pub async fn rotate_app_lock_recovery_key(
    app: AppHandle,
    secret: String,
) -> Result<AppLockKeyResult, String> {
    if is_locked() {
        return Err(ERR_LOCKED.into());
    }
    let manager = settings_manager(&app);
    let settings = manager.get();
    if !settings.app_lock_enabled || settings.app_lock_hash.is_empty() {
        return Err(ERR_NOT_ENABLED.into());
    }
    let hash = settings.app_lock_hash.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !verify_secret(&secret, &hash) {
            Err(ERR_INVALID.to_string())
        } else {
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    let (recovery_key, recovery_hash) = tauri::async_runtime::spawn_blocking(|| {
        let recovery_key = generate_recovery_key();
        let recovery_hash = hash_recovery_key(&recovery_key)?;
        Ok::<_, String>((recovery_key, recovery_hash))
    })
    .await
    .map_err(|e| e.to_string())??;

    manager.update_sync(|s| {
        s.app_lock_recovery_hash = recovery_hash;
    })?;
    crate::settings_manager::emit_changed(&app);
    emit_status(&app);
    Ok(AppLockKeyResult {
        status: get_app_lock_status(app),
        recovery_key,
    })
}

pub fn reset_lock_from_cli(manager: &SettingsManager) {
    let settings = manager.get();
    if !settings.app_lock_enabled && settings.app_lock_hash.is_empty() {
        return;
    }
    let _ = manager.update_sync(|s| {
        s.app_lock_enabled = false;
        s.app_lock_hash.clear();
        s.app_lock_recovery_hash.clear();
    });
    log::warn!("App lock disabled via --reset-lock");
}

#[cfg(target_os = "windows")]
pub fn start_session_lock_watcher(app: AppHandle) {
    std::thread::Builder::new()
        .name("session-lock-watch".into())
        .spawn(move || {
            if let Err(e) = run_session_lock_loop(app) {
                log::warn!("Windows session-lock watcher failed: {e}");
            }
        })
        .ok();
}

#[cfg(not(target_os = "windows"))]
pub fn start_session_lock_watcher(_app: AppHandle) {}

#[cfg(target_os = "windows")]
fn run_session_lock_loop(app: AppHandle) -> Result<(), String> {
    use windows::core::{w, PCWSTR};
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::System::RemoteDesktop::{
        WTSRegisterSessionNotification, WTSUnRegisterSessionNotification, NOTIFY_FOR_THIS_SESSION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, RegisterClassExW,
        TranslateMessage, CS_HREDRAW, CS_VREDRAW, CW_USEDEFAULT, HWND_MESSAGE, MSG,
        WM_DESTROY, WM_WTSSESSION_CHANGE, WNDCLASSEXW, WTS_SESSION_LOCK,
    };

    static APP: Mutex<Option<AppHandle>> = Mutex::new(None);
    *APP.lock() = Some(app);

    unsafe extern "system" fn wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if msg == WM_WTSSESSION_CHANGE && wparam.0 == WTS_SESSION_LOCK as usize {
            if let Some(app) = APP.lock().clone() {
                lock_on_windows_session(&app);
            }
            return LRESULT(0);
        }
        if msg == WM_DESTROY {
            let _ = WTSUnRegisterSessionNotification(hwnd);
        }
        unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) }
    }

    unsafe {
        let hinstance = GetModuleHandleW(None).map_err(|e| e.to_string())?;
        let class_name = w!("CyberPasteSessionLock");
        let wc = WNDCLASSEXW {
            cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(wnd_proc),
            hInstance: hinstance.into(),
            lpszClassName: class_name,
            ..Default::default()
        };
        if RegisterClassExW(&wc) == 0 {
            // Already registered in this process is fine.
        }
        let hwnd = CreateWindowExW(
            Default::default(),
            class_name,
            PCWSTR::null(),
            Default::default(),
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            Some(HWND_MESSAGE),
            None,
            Some(hinstance.into()),
            None,
        )
        .map_err(|e| e.to_string())?;

        WTSRegisterSessionNotification(hwnd, NOTIFY_FOR_THIS_SESSION)
            .map_err(|e| e.to_string())?;

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
    Ok(())
}
