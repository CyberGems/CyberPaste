//! First-run balloon pointing at the tray overflow (^).
//! Shown once, ~1.5s after the tray icon exists. Windows hides new icons there.

use crate::settings_manager::SettingsManager;
use crate::windows_notification_area::{
    cursor_rect, get_taskbar_edge, open_icon_settings, try_get_notification_area_rect, PhysicalRect,
    TaskbarEdge,
};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Position, Size};

const WINDOW_LABEL: &str = "tray_pin_tip";
/// Logical card width (must match TrayPinTipWindow.tsx).
const CARD_WIDTH: f64 = 340.0;
/// Transparent bleed around the card for CSS box-shadow.
const SHADOW_PAD: f64 = 20.0;
/// Speech-bubble tail pointing at the tray.
const TAIL: f64 = 10.0;
/// Estimated logical height of the card body before the webview measures.
const EST_CARD_HEIGHT: f64 = 210.0;

static PENDING_SHOW: AtomicBool = AtomicBool::new(false);
static LAST_EDGE: Mutex<TaskbarEdge> = Mutex::new(TaskbarEdge::Bottom);

#[derive(Clone, Serialize)]
struct TrayPinTipShow {
    edge: TaskbarEdge,
}

pub async fn show_if_needed(app: AppHandle) -> Result<(), String> {
    let manager = app.state::<Arc<SettingsManager>>();
    if manager.get().has_seen_tray_pin_tip {
        return Ok(());
    }
    if app.get_webview_window(WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let (anchor, edge) = resolve_anchor_and_edge(&app);
    if let Ok(mut lock) = LAST_EDGE.lock() {
        *lock = edge;
    }

    let est_w = CARD_WIDTH + 2.0 * SHADOW_PAD + TAIL;
    let est_h = EST_CARD_HEIGHT + 2.0 * SHADOW_PAD + TAIL;

    let win = tauri::WebviewWindowBuilder::new(
        &app,
        WINDOW_LABEL,
        tauri::WebviewUrl::App("index.html?window=tray_pin_tip".into()),
    )
    .title("CyberPaste")
    .inner_size(est_w, est_h)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .shadow(false)
    .focused(false)
    .visible(false)
    .build()
    .map_err(|e| format!("Failed to create tray pin tip: {e}"))?;

    apply_geometry(&win, &anchor, edge, est_w, est_h);
    PENDING_SHOW.store(true, Ordering::SeqCst);
    let _ = win.show();
    let _ = app.emit("tray-pin-tip-show", TrayPinTipShow { edge });

    let app_retry = app.clone();
    tauri::async_runtime::spawn(async move {
        for delay_ms in [150u64, 400, 800] {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
            if !PENDING_SHOW.load(Ordering::SeqCst) {
                break;
            }
            if let Some(w) = app_retry.get_webview_window(WINDOW_LABEL) {
                let _ = w.show();
            } else {
                break;
            }
        }
    });

    Ok(())
}

fn resolve_anchor_and_edge(app: &AppHandle) -> (PhysicalRect, TaskbarEdge) {
    let mut anchor = tray_icon_rect(app)
        .or_else(try_get_notification_area_rect)
        .unwrap_or_else(cursor_rect);
    if !anchor_is_valid(&anchor) {
        anchor = cursor_rect();
    }
    let edge = get_taskbar_edge(anchor);
    (anchor, edge)
}

fn anchor_is_valid(r: &PhysicalRect) -> bool {
    r.width > 0 && r.height > 0
}

fn tray_icon_rect(app: &AppHandle) -> Option<PhysicalRect> {
    let tray = app.tray_by_id("main")?;
    let rect = tray.rect().ok().flatten()?;
    match (rect.position, rect.size) {
        (Position::Physical(p), Size::Physical(s)) if s.width > 0 && s.height > 0 => {
            Some(PhysicalRect {
                x: p.x,
                y: p.y,
                width: s.width as i32,
                height: s.height as i32,
            })
        }
        (Position::Logical(p), Size::Logical(s)) if s.width > 0.0 && s.height > 0.0 => {
            Some(PhysicalRect {
                x: p.x.round() as i32,
                y: p.y.round() as i32,
                width: s.width.round() as i32,
                height: s.height.round() as i32,
            })
        }
        _ => None,
    }
}

fn apply_geometry(
    win: &tauri::WebviewWindow,
    anchor: &PhysicalRect,
    edge: TaskbarEdge,
    logical_w: f64,
    logical_h: f64,
) {
    let scale = win.scale_factor().unwrap_or(1.0);
    let width_px = (logical_w * scale).round() as i32;
    let height_px = (logical_h * scale).round() as i32;
    let gap = (6.0 * scale).round() as i32;
    let shadow = (SHADOW_PAD * scale).round() as i32;

    let (ax, ay) = anchor.center();
    let (mut left, mut top) = match edge {
        TaskbarEdge::Top => (
            ax - width_px / 2,
            anchor.y + anchor.height + gap - shadow,
        ),
        TaskbarEdge::Left => (
            anchor.x + anchor.width + gap - shadow,
            ay - height_px / 2,
        ),
        TaskbarEdge::Right => (
            anchor.x - width_px - gap + shadow,
            ay - height_px / 2,
        ),
        TaskbarEdge::Bottom => (
            ax - width_px / 2,
            anchor.y - height_px - gap + shadow,
        ),
    };

    let monitor = win
        .available_monitors()
        .unwrap_or_default()
        .into_iter()
        .find(|m| {
            let pos = m.position();
            let size = m.size();
            ax >= pos.x
                && ax < pos.x + size.width as i32
                && ay >= pos.y
                && ay < pos.y + size.height as i32
        })
        .or_else(|| win.primary_monitor().ok().flatten());

    if let Some(monitor) = monitor {
        let work = monitor.work_area();
        let min_x = work.position.x + 8;
        let min_y = work.position.y + 8;
        let max_x = work.position.x + work.size.width as i32 - width_px - 8;
        let max_y = work.position.y + work.size.height as i32 - height_px - 8;
        if max_x >= min_x {
            left = left.clamp(min_x, max_x);
        } else {
            left = work.position.x + (work.size.width as i32 - width_px) / 2;
        }
        if max_y >= min_y {
            top = top.clamp(min_y, max_y);
        } else {
            top = work.position.y + (work.size.height as i32 - height_px) / 2;
        }
    }

    let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: width_px.max(1) as u32,
        height: height_px.max(1) as u32,
    }));
    let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: left,
        y: top,
    }));
}

#[tauri::command]
pub fn open_tray_icon_settings() {
    open_icon_settings();
}

#[tauri::command]
pub fn get_tray_pin_tip_edge() -> String {
    LAST_EDGE
        .lock()
        .map(|e| format!("{e:?}").to_lowercase())
        .unwrap_or_else(|_| "bottom".into())
}

#[tauri::command]
pub async fn tray_pin_tip_ready(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let Some(win) = app.get_webview_window(WINDOW_LABEL) else {
        return Ok(());
    };
    let (anchor, edge) = resolve_anchor_and_edge(&app);
    apply_geometry(&win, &anchor, edge, width, height);
    PENDING_SHOW.store(false, Ordering::SeqCst);
    let _ = win.show();
    let _ = app.emit("tray-pin-tip-show", TrayPinTipShow { edge });
    Ok(())
}

#[tauri::command]
pub async fn dismiss_tray_pin_tip(app: AppHandle, mark_seen: bool) -> Result<(), String> {
    if mark_seen {
        mark_tray_pin_tip_seen(&app);
    }
    if let Some(win) = app.get_webview_window(WINDOW_LABEL) {
        let _ = win.hide();
        let _ = win.close();
    }
    Ok(())
}

fn mark_tray_pin_tip_seen(app: &AppHandle) {
    let manager = app.state::<Arc<SettingsManager>>();
    let mut settings = manager.get();
    if settings.has_seen_tray_pin_tip {
        return;
    }
    settings.has_seen_tray_pin_tip = true;
    if let Err(e) = manager.save(settings) {
        log::warn!("tray.pin-tip.save: {e}");
        return;
    }
    let _ = app.emit("settings-changed", manager.get());
}
