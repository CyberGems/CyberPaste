//! Restores webview transparency after the system wakes from sleep or hibernation.
//!
//! On Windows, transparent WebView2 windows can permanently lose their
//! per-pixel alpha when the GPU stack is reset by power transitions: every
//! transparent pixel of the affected windows (tray menu, toasts) then paints
//! as an opaque black block. The window itself stays healthy, so instead of
//! recreating anything we listen for the resume broadcast and reapply the
//! creation-time DWM setup tao uses for transparent windows (blur-behind with
//! an empty region), which makes DWM rebuild the redirection surface with its
//! alpha channel restored.

/// Every window whose webview is created with `transparent(true)`. The viewer
/// window is opaque and needs no repair.
#[cfg(target_os = "windows")]
const TRANSPARENT_WINDOWS: &[&str] = &[
    "main",
    "toast",
    "tray_menu",
    "about",
    "settings",
    "tray_pin_tip",
];

/// Starts the background listener that repairs transparency on system resume.
pub fn start_power_resume_listener(app: tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    {
        let spawned = std::thread::Builder::new()
            .name("power-resume".into())
            .spawn(move || {
                if let Err(e) = run_power_resume_loop(app) {
                    log::error!("power_resume: listener exited: {e}");
                }
            });
        if let Err(e) = spawned {
            log::error!("power_resume: failed to spawn listener thread: {e}");
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
    }
}

#[cfg(target_os = "windows")]
fn run_power_resume_loop(app: tauri::AppHandle) -> Result<(), String> {
    use parking_lot::Mutex;
    use windows::core::{w, PCWSTR};
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, RegisterClassExW,
        TranslateMessage, CS_HREDRAW, CS_VREDRAW, CW_USEDEFAULT, MSG, PBT_APMRESUMEAUTOMATIC,
        WM_DESTROY, WM_POWERBROADCAST, WNDCLASSEXW,
    };

    static APP: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);
    *APP.lock() = Some(app);

    unsafe extern "system" fn wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if msg == WM_POWERBROADCAST && wparam.0 == PBT_APMRESUMEAUTOMATIC as usize {
            if let Some(app) = APP.lock().clone() {
                // Give the GPU stack a moment to come back before repairing.
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(400)).await;
                    restore_transparency(&app);
                });
            }
            return LRESULT(0);
        }
        if msg == WM_DESTROY {
            return LRESULT(0);
        }
        unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) }
    }

    unsafe {
        let hinstance = GetModuleHandleW(None).map_err(|e| e.to_string())?;
        let class_name = w!("CyberPastePowerResume");
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
        // A plain hidden top-level window: message-only windows never receive
        // the WM_POWERBROADCAST broadcast.
        CreateWindowExW(
            Default::default(),
            class_name,
            PCWSTR::null(),
            Default::default(),
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            None,
            None,
            Some(hinstance.into()),
            None,
        )
        .map_err(|e| e.to_string())?;

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn restore_transparency(app: &tauri::AppHandle) {
    use tauri::Manager;

    for label in TRANSPARENT_WINDOWS {
        let Some(win) = app.get_webview_window(label) else {
            continue;
        };
        reapply_dwm_transparency(&win);
    }
}

/// Reapplies tao's creation-time transparency setup for a transparent window:
/// blur-behind with an empty region, a frame-changed nudge and a repaint.
/// Safe on visible windows (no visibility change, so no flicker) and on
/// hidden ones (the attribute applies regardless of visibility).
#[cfg(target_os = "windows")]
pub fn reapply_dwm_transparency(window: &tauri::WebviewWindow) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmEnableBlurBehindWindow, DWM_BB_BLURREGION, DWM_BB_ENABLE, DWM_BLURBEHIND,
    };
    use windows::Win32::Graphics::Gdi::{CreateRectRgn, DeleteObject, InvalidateRect};
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
    };

    if let Ok(handle) = window.hwnd() {
        let hwnd = HWND(handle.0 as _);
        unsafe {
            // Empty region => fully transparent surface (same as window creation).
            let region = CreateRectRgn(0, 0, -1, -1);
            let bb = DWM_BLURBEHIND {
                dwFlags: DWM_BB_ENABLE | DWM_BB_BLURREGION,
                fEnable: true.into(),
                hRgnBlur: region,
                fTransitionOnMaximized: false.into(),
            };
            let _ = DwmEnableBlurBehindWindow(hwnd, &bb);
            let _ = DeleteObject(region.into());
            let _ = SetWindowPos(
                hwnd,
                None,
                0,
                0,
                0,
                0,
                SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            );
            let _ = InvalidateRect(Some(hwnd), None, false);
        }
    }
}
