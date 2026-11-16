//! Smart, caret, and active-monitor positioning for Compact and Full windows.
//!
//! Classic Win32 `GetGUIThreadInfo` caret detection fails in most modern apps
//! (Word, Chromium, Electron, WebView2, WinUI 3). On Windows we probe caret
//! bounds in three layers on a dedicated STA worker thread with a tight
//! timeout: UI Automation (`TextPattern2::GetCaretRange` / `TextPattern::GetSelection`),
//! MSAA (`OBJID_CARET`), and Win32 `GetGUIThreadInfo` + `ClientToScreen`.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CaretRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl CaretRect {
    pub fn center_x(&self) -> i32 {
        (self.left + self.right) / 2
    }

    pub fn center_y(&self) -> i32 {
        (self.top + self.bottom) / 2
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnchorSource {
    Caret(CaretRect),
    Cursor,
    ForegroundWindow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ResolvedTarget {
    pub point: (i32, i32),
    pub monitor_point: (i32, i32),
    pub source: AnchorSource,
}

pub fn normalize_position_mode(mode: &str) -> &'static str {
    match mode {
        "smart" => "smart",
        "cursor" => "cursor",
        "caret" => "caret",
        _ => "smart",
    }
}

pub fn validate_caret_rect(
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
    fg_bounds: Option<(i32, i32, i32, i32)>,
) -> Option<CaretRect> {
    let height = bottom - top;
    let width = right - left;
    // A real caret has line height (2..=400 px) and is not a degenerate (0,0,0,0) rect.
    if !(2..=400).contains(&height) || width < 0 || width > 2000 {
        return None;
    }
    if left == 0 && top == 0 && width <= 1 {
        return None;
    }
    let normalized_right = if width == 0 { left + 1 } else { right };
    let rect = CaretRect {
        left,
        top,
        right: normalized_right,
        bottom,
    };

    if let Some((fg_l, fg_t, fg_r, fg_b)) = fg_bounds {
        const MARGIN: i32 = 32;
        if rect.center_x() < fg_l - MARGIN
            || rect.center_x() > fg_r + MARGIN
            || rect.center_y() < fg_t - MARGIN
            || rect.center_y() > fg_b + MARGIN
        {
            return None;
        }
    }

    Some(rect)
}

/// Pure anchor decision shared across platforms and covered by unit tests.
pub fn choose_compact_anchor(
    mode: &str,
    caret: Option<CaretRect>,
    cursor: Option<(i32, i32)>,
    fg_center: Option<(i32, i32)>,
) -> Option<ResolvedTarget> {
    match normalize_position_mode(mode) {
        "cursor" => cursor
            .map(|pt| ResolvedTarget {
                point: pt,
                monitor_point: pt,
                source: AnchorSource::Cursor,
            })
            .or_else(|| {
                fg_center.map(|pt| ResolvedTarget {
                    point: pt,
                    monitor_point: pt,
                    source: AnchorSource::ForegroundWindow,
                })
            }),
        "caret" => {
            if let Some(rect) = caret {
                return Some(ResolvedTarget {
                    point: (rect.center_x(), rect.bottom),
                    monitor_point: (rect.center_x(), rect.center_y()),
                    source: AnchorSource::Caret(rect),
                });
            }
            if let Some(pt) = fg_center {
                return Some(ResolvedTarget {
                    point: pt,
                    monitor_point: pt,
                    source: AnchorSource::ForegroundWindow,
                });
            }
            cursor.map(|pt| ResolvedTarget {
                point: pt,
                monitor_point: pt,
                source: AnchorSource::Cursor,
            })
        }
        // "smart": anchor to active typing caret (across monitors) when one exists,
        // otherwise follow the mouse cursor rather than snapping back to a window without a caret.
        _ => {
            if let Some(rect) = caret {
                return Some(ResolvedTarget {
                    point: (rect.center_x(), rect.bottom),
                    monitor_point: (rect.center_x(), rect.center_y()),
                    source: AnchorSource::Caret(rect),
                });
            }
            cursor
                .map(|c| ResolvedTarget {
                    point: c,
                    monitor_point: c,
                    source: AnchorSource::Cursor,
                })
                .or_else(|| {
                    fg_center.map(|fg| ResolvedTarget {
                        point: fg,
                        monitor_point: fg,
                        source: AnchorSource::ForegroundWindow,
                    })
                })
        }
    }
}

/// Compute preferred (unclamped) top-left physical coordinates for Compact mode.
pub fn compute_compact_preferred_origin(
    target: &ResolvedTarget,
    window_w: u32,
    window_h: u32,
    work_top: i32,
    work_bottom: i32,
    scale_factor: f64,
) -> (i32, i32) {
    let w = window_w as i32;
    let h = window_h as i32;
    match target.source {
        AnchorSource::Caret(rect) => {
            let gap = (8.0 * scale_factor).round() as i32;
            let preferred_x = rect.center_x() - (w / 2);
            let below_y = rect.bottom + gap;
            let above_y = rect.top - gap - h;
            let preferred_y = if below_y + h <= work_bottom || above_y < work_top {
                below_y
            } else {
                above_y
            };
            (preferred_x, preferred_y)
        }
        AnchorSource::ForegroundWindow => (target.point.0 - (w / 2), target.point.1 - (h / 2)),
        AnchorSource::Cursor => (target.point.0 - (w / 2), target.point.1 - (h / 4)),
    }
}

#[cfg(target_os = "windows")]
mod win32 {
    use super::*;
    use std::sync::{mpsc, OnceLock};
    use std::time::Duration;
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::Graphics::Gdi::ClientToScreen;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::System::Ole::{
        SafeArrayAccessData, SafeArrayDestroy, SafeArrayGetLBound, SafeArrayGetUBound,
        SafeArrayUnaccessData,
    };
    use windows::Win32::System::Threading::GetCurrentProcessId;
    use windows::Win32::System::Variant::{VARIANT, VARIANT_0, VARIANT_0_0, VARIANT_0_0_0, VT_I4};
    use windows::Win32::UI::Accessibility::{
        AccessibleObjectFromWindow, CUIAutomation, IAccessible, IUIAutomation,
        IUIAutomationTextPattern, IUIAutomationTextPattern2, IUIAutomationTextRange,
        TextPatternRangeEndpoint_End, TextPatternRangeEndpoint_Start, UIA_TextPattern2Id,
        UIA_TextPatternId,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetCursorPos, GetForegroundWindow, GetGUIThreadInfo, GetWindowRect,
        GetWindowThreadProcessId, IsIconic, IsWindow, IsWindowVisible, CHILDID_SELF, GUITHREADINFO,
        OBJID_CARET,
    };

    const CARET_PROBE_TIMEOUT_MS: u64 = 120;

    struct CaretProbeRequest {
        fg_hwnd_raw: isize,
        fg_bounds: Option<(i32, i32, i32, i32)>,
        reply: mpsc::SyncSender<Option<(CaretRect, &'static str)>>,
    }

    fn caret_probe_sender() -> &'static mpsc::SyncSender<CaretProbeRequest> {
        static SENDER: OnceLock<mpsc::SyncSender<CaretProbeRequest>> = OnceLock::new();
        SENDER.get_or_init(|| {
            let (tx, rx) = mpsc::sync_channel::<CaretProbeRequest>(1);
            let _ = std::thread::Builder::new()
                .name("caret-probe".into())
                .spawn(move || {
                    let _ = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
                    let automation: Option<IUIAutomation> =
                        unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) }.ok();

                    while let Ok(req) = rx.recv() {
                        let hwnd = HWND(req.fg_hwnd_raw as *mut core::ffi::c_void);
                        let detected = probe_caret_on_sta(automation.as_ref(), hwnd, req.fg_bounds);
                        let _ = req.reply.try_send(detected);
                    }
                });
            tx
        })
    }

    fn is_non_app_shell_class(hwnd: HWND) -> bool {
        let mut buf = [0u16; 64];
        let len = unsafe { GetClassNameW(hwnd, &mut buf) };
        if len <= 0 {
            return false;
        }
        let class = String::from_utf16_lossy(&buf[..len as usize]);
        matches!(
            class.as_str(),
            "Progman"
                | "WorkerW"
                | "Shell_TrayWnd"
                | "Shell_SecondaryTrayWnd"
                | "NotifyIconOverflowWindow"
                | "TopLevelWindowForOverflowXamlIsland"
        )
    }

    fn usable_foreground_window(candidate: Option<HWND>) -> Option<(HWND, (i32, i32, i32, i32))> {
        let hwnd = candidate.unwrap_or_else(|| unsafe { GetForegroundWindow() });
        if hwnd.0.is_null()
            || unsafe { !IsWindow(Some(hwnd)).as_bool() }
            || unsafe { !IsWindowVisible(hwnd).as_bool() }
            || unsafe { IsIconic(hwnd).as_bool() }
        {
            return None;
        }

        let mut pid: u32 = 0;
        unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
        if pid == 0 || pid == unsafe { GetCurrentProcessId() } {
            return None;
        }
        if is_non_app_shell_class(hwnd) {
            return None;
        }

        let mut rect = RECT::default();
        if unsafe { GetWindowRect(hwnd, &mut rect).is_err() } {
            return None;
        }
        if rect.right - rect.left < 40 || rect.bottom - rect.top < 40 {
            return None;
        }
        Some((hwnd, (rect.left, rect.top, rect.right, rect.bottom)))
    }

    unsafe fn rect_from_text_range(
        range: &IUIAutomationTextRange,
        fg_bounds: Option<(i32, i32, i32, i32)>,
    ) -> Option<CaretRect> {
        let psa = range.GetBoundingRectangles().ok()?;
        if psa.is_null() {
            return None;
        }
        struct SafeArrayGuard(*const windows::Win32::System::Com::SAFEARRAY);
        impl Drop for SafeArrayGuard {
            fn drop(&mut self) {
                unsafe {
                    let _ = SafeArrayDestroy(self.0);
                }
            }
        }
        let _sa_guard = SafeArrayGuard(psa);

        let lbound = SafeArrayGetLBound(psa, 1).ok()?;
        let ubound = SafeArrayGetUBound(psa, 1).ok()?;
        let count = ubound - lbound + 1;
        if count < 4 {
            return None;
        }

        let mut data_ptr: *mut core::ffi::c_void = core::ptr::null_mut();
        SafeArrayAccessData(psa, &mut data_ptr).ok()?;
        struct AccessGuard(*const windows::Win32::System::Com::SAFEARRAY);
        impl Drop for AccessGuard {
            fn drop(&mut self) {
                unsafe {
                    let _ = SafeArrayUnaccessData(self.0);
                }
            }
        }
        let _access_guard = AccessGuard(psa);
        if data_ptr.is_null() {
            return None;
        }

        let coords = core::slice::from_raw_parts(data_ptr as *const f64, count as usize);
        let left = coords[0].round() as i32;
        let top = coords[1].round() as i32;
        let width = coords[2].round() as i32;
        let height = coords[3].round() as i32;
        validate_caret_rect(left, top, left + width.max(1), top + height, fg_bounds)
    }

    fn probe_uia_caret(
        automation: &IUIAutomation,
        _fg_hwnd: HWND,
        fg_bounds: Option<(i32, i32, i32, i32)>,
    ) -> Option<(CaretRect, &'static str)> {
        let focused = unsafe { automation.GetFocusedElement() }.ok()?;
        let self_pid = unsafe { GetCurrentProcessId() };
        // Allow hosted child processes (UWP/WebView2/Chrome OOP iframes) as long as
        // it is not CyberPaste itself and the resulting rect sits inside fg_bounds.
        if let Ok(elem_pid) = unsafe { focused.CurrentProcessId() } {
            if elem_pid as u32 == self_pid {
                return None;
            }
        }

        if let Ok(tp2) =
            unsafe { focused.GetCurrentPatternAs::<IUIAutomationTextPattern2>(UIA_TextPattern2Id) }
        {
            let mut is_active = BOOL(0);
            if let Ok(range) = unsafe { tp2.GetCaretRange(&mut is_active) } {
                if is_active.as_bool() {
                    if let Some(rect) = unsafe { rect_from_text_range(&range, fg_bounds) } {
                        return Some((rect, "uia-text2"));
                    }
                }
            }
        }

        if let Ok(tp) =
            unsafe { focused.GetCurrentPatternAs::<IUIAutomationTextPattern>(UIA_TextPatternId) }
        {
            if let Ok(sel) = unsafe { tp.GetSelection() } {
                if let Ok(len) = unsafe { sel.Length() } {
                    if len > 0 {
                        if let Ok(range) = unsafe { sel.GetElement(0) } {
                            let is_collapsed = unsafe {
                                range.CompareEndpoints(
                                    TextPatternRangeEndpoint_Start,
                                    &range,
                                    TextPatternRangeEndpoint_End,
                                )
                            }
                            .is_ok_and(|cmp| cmp == 0);
                            if is_collapsed {
                                if let Some(rect) = unsafe { rect_from_text_range(&range, fg_bounds) }
                                {
                                    return Some((rect, "uia-selection"));
                                }
                            }
                        }
                    }
                }
            }
        }

        None
    }

    fn probe_msaa_caret(
        target_hwnd: HWND,
        fg_bounds: Option<(i32, i32, i32, i32)>,
    ) -> Option<CaretRect> {
        if target_hwnd.0.is_null() {
            return None;
        }
        let mut ptr: *mut core::ffi::c_void = core::ptr::null_mut();
        unsafe {
            AccessibleObjectFromWindow(
                target_hwnd,
                OBJID_CARET.0 as u32,
                &<IAccessible as windows::core::Interface>::IID,
                &mut ptr,
            )
            .ok()?;
        }
        if ptr.is_null() {
            return None;
        }
        let acc = unsafe { <IAccessible as windows::core::Interface>::from_raw(ptr) };
        let var_child = VARIANT {
            Anonymous: VARIANT_0 {
                Anonymous: core::mem::ManuallyDrop::new(VARIANT_0_0 {
                    vt: VT_I4,
                    Anonymous: VARIANT_0_0_0 {
                        lVal: CHILDID_SELF as i32,
                    },
                    ..Default::default()
                }),
            },
        };
        let (mut left, mut top, mut width, mut height) = (0i32, 0i32, 0i32, 0i32);
        unsafe {
            acc.accLocation(&mut left, &mut top, &mut width, &mut height, &var_child)
                .ok()?;
        }
        validate_caret_rect(left, top, left + width.max(1), top + height, fg_bounds)
    }

    fn probe_win32_gui_caret(
        info: &GUITHREADINFO,
        fg_bounds: Option<(i32, i32, i32, i32)>,
    ) -> Option<CaretRect> {
        if info.hwndCaret.is_invalid() {
            return None;
        }
        let mut top_left = POINT {
            x: info.rcCaret.left,
            y: info.rcCaret.top,
        };
        let mut bottom_right = POINT {
            x: info.rcCaret.right,
            y: info.rcCaret.bottom,
        };
        unsafe {
            if !ClientToScreen(info.hwndCaret, &mut top_left).as_bool() {
                return None;
            }
            if !ClientToScreen(info.hwndCaret, &mut bottom_right).as_bool() {
                return None;
            }
        }
        validate_caret_rect(
            top_left.x,
            top_left.y,
            bottom_right.x,
            bottom_right.y,
            fg_bounds,
        )
    }

    fn probe_caret_on_sta(
        automation: Option<&IUIAutomation>,
        fg_hwnd: HWND,
        fg_bounds: Option<(i32, i32, i32, i32)>,
    ) -> Option<(CaretRect, &'static str)> {
        if let Some(uia) = automation {
            if let Some(hit) = probe_uia_caret(uia, fg_hwnd, fg_bounds) {
                return Some(hit);
            }
        }

        let thread_id = unsafe { GetWindowThreadProcessId(fg_hwnd, None) };
        let mut info = GUITHREADINFO {
            cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
            ..Default::default()
        };
        let has_gui_info = thread_id != 0 && unsafe { GetGUIThreadInfo(thread_id, &mut info).is_ok() };

        let mut msaa_candidates = Vec::with_capacity(3);
        if has_gui_info {
            if !info.hwndFocus.is_invalid() {
                msaa_candidates.push(info.hwndFocus);
            }
            if !info.hwndCaret.is_invalid() && !msaa_candidates.contains(&info.hwndCaret) {
                msaa_candidates.push(info.hwndCaret);
            }
        }
        if !msaa_candidates.contains(&fg_hwnd) {
            msaa_candidates.push(fg_hwnd);
        }
        for candidate in msaa_candidates {
            if let Some(rect) = probe_msaa_caret(candidate, fg_bounds) {
                return Some((rect, "msaa"));
            }
        }

        if has_gui_info {
            if let Some(rect) = probe_win32_gui_caret(&info, fg_bounds) {
                return Some((rect, "win32-gui"));
            }
        }

        None
    }

    fn probe_caret_with_timeout(
        fg_hwnd: HWND,
        fg_bounds: Option<(i32, i32, i32, i32)>,
    ) -> Option<CaretRect> {
        let (reply_tx, reply_rx) = mpsc::sync_channel(1);
        let req = CaretProbeRequest {
            fg_hwnd_raw: fg_hwnd.0 as isize,
            fg_bounds,
            reply: reply_tx,
        };
        if caret_probe_sender().try_send(req).is_err() {
            log::debug!("position.caret-probe: worker busy, skipping");
            return None;
        }
        match reply_rx.recv_timeout(Duration::from_millis(CARET_PROBE_TIMEOUT_MS)) {
            Ok(Some((rect, layer))) => {
                log::debug!(
                    "position.caret-probe: hit layer={} rect=({},{},{},{})",
                    layer,
                    rect.left,
                    rect.top,
                    rect.right,
                    rect.bottom
                );
                Some(rect)
            }
            Ok(None) => None,
            Err(_) => {
                log::debug!("position.caret-probe: timeout after {}ms", CARET_PROBE_TIMEOUT_MS);
                None
            }
        }
    }

    pub fn resolve_target(mode: &str, initial_fg: Option<HWND>) -> Option<ResolvedTarget> {
        let normalized = normalize_position_mode(mode);

        let mut cursor_pt = POINT { x: 0, y: 0 };
        let cursor = if unsafe { GetCursorPos(&mut cursor_pt).is_ok() } {
            Some((cursor_pt.x, cursor_pt.y))
        } else {
            None
        };

        let fg = usable_foreground_window(initial_fg);
        let fg_center = fg.map(|(_, (l, t, r, b))| ((l + r) / 2, (t + b) / 2));

        let caret = if normalized == "cursor" {
            None
        } else if let Some((fg_hwnd, fg_bounds)) = fg {
            probe_caret_with_timeout(fg_hwnd, Some(fg_bounds))
        } else {
            None
        };

        choose_compact_anchor(normalized, caret, cursor, fg_center)
    }
}

#[cfg(target_os = "windows")]
pub fn resolve_window_target(
    mode: &str,
    initial_fg: Option<windows::Win32::Foundation::HWND>,
) -> Option<ResolvedTarget> {
    win32::resolve_target(mode, initial_fg)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_caret() -> CaretRect {
        CaretRect {
            left: 300,
            top: 200,
            right: 302,
            bottom: 222,
        }
    }

    #[test]
    fn smart_prefers_caret_when_available() {
        let caret = sample_caret();
        let target = choose_compact_anchor("smart", Some(caret), Some((2500, 400)), Some((500, 400)))
            .expect("target should resolve");
        assert_eq!(target.source, AnchorSource::Caret(caret));
        assert_eq!(target.monitor_point, (301, 211));
    }

    #[test]
    fn smart_uses_cursor_when_no_caret_even_across_monitors() {
        // Focused window on monitor A without an active caret should still open at mouse cursor on monitor B
        let target = choose_compact_anchor("smart", None, Some((2500, 400)), Some((500, 400)))
            .expect("target should resolve");
        assert_eq!(target.source, AnchorSource::Cursor);
        assert_eq!(target.point, (2500, 400));
        assert_eq!(target.monitor_point, (2500, 400));
    }

    #[test]
    fn caret_mode_falls_back_to_foreground_window_before_other_monitor_cursor() {
        let target = choose_compact_anchor("caret", None, Some((2500, 400)), Some((500, 400)))
            .expect("target should resolve");
        assert_eq!(target.source, AnchorSource::ForegroundWindow);
        assert_eq!(target.monitor_point, (500, 400));
    }

    #[test]
    fn cursor_mode_strictly_follows_mouse_cursor() {
        let caret = sample_caret();
        let target = choose_compact_anchor("cursor", Some(caret), Some((2500, 400)), Some((500, 400)))
            .expect("target should resolve");
        assert_eq!(target.source, AnchorSource::Cursor);
        assert_eq!(target.point, (2500, 400));
    }

    #[test]
    fn caret_origin_places_below_or_flips_above_near_bottom() {
        let caret = CaretRect {
            left: 500,
            top: 900,
            right: 502,
            bottom: 920,
        };
        let target = ResolvedTarget {
            point: (501, 920),
            monitor_point: (501, 910),
            source: AnchorSource::Caret(caret),
        };
        // Window height 400 doesn't fit below bottom 920 within work_bottom 1040 -> flips above
        let (x, y) = compute_compact_preferred_origin(&target, 420, 400, 0, 1040, 1.0);
        assert_eq!(x, 501 - 210);
        assert_eq!(y, 900 - 8 - 400);
    }

    #[test]
    fn caret_validation_rejects_empty_or_out_of_bounds_rects() {
        assert!(validate_caret_rect(0, 0, 0, 0, None).is_none());
        assert!(validate_caret_rect(100, 100, 100, 101, None).is_none());
        assert!(validate_caret_rect(100, 100, 102, 700, None).is_none());
        assert!(validate_caret_rect(10, 10, 12, 30, Some((500, 500, 1200, 900))).is_none());
        assert!(validate_caret_rect(600, 600, 600, 622, Some((500, 500, 1200, 900))).is_some());
    }
}
