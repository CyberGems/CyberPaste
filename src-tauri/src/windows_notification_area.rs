//! Opens the Windows tray-icon settings page and locates the notification area
//! so first-run UI can point at it. Apps cannot pin a NotifyIcon themselves.
//!
//! Do **not** launch the legacy Control Panel CLSID (`{05d7b0f4-…}`): that
//! applet is hosted by explorer.exe and can crash Explorer on Windows 10.

use serde::Serialize;
use windows::core::{w, BSTR, BOOL, PCWSTR};
use windows::Win32::Foundation::{HWND, LPARAM, POINT, RECT};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
};
use windows::Win32::System::Threading::GetCurrentProcessId;
use windows::Win32::System::Variant::VARIANT;
use windows::Win32::UI::Accessibility::{
    CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationInvokePattern,
    TreeScope_Descendants, UIA_ButtonControlTypeId, UIA_ControlTypePropertyId,
    UIA_HyperlinkControlTypeId, UIA_InvokePatternId,
};
use windows::Win32::UI::Shell::{
    ShellExecuteW, SHAppBarMessage, ABE_LEFT, ABE_RIGHT, ABE_TOP, ABM_GETTASKBARPOS, APPBARDATA,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, GetClassNameW, GetCursorPos, GetWindowRect,
    GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible, SW_SHOWNORMAL,
};

const TASKBAR_SETTINGS_URI: windows::core::PCWSTR = w!("ms-settings:taskbar");

/// Win10 Taskbar settings has no ms-settings URI for the nested icon list.
/// After opening the parent page we invoke this hyperlink via UI Automation.
const ICON_LIST_LINK_FRAGMENTS: &[&str] = &[
    "icons appear on the taskbar",
    "iconos que aparecen",
    "iconos que aparecer",
    "symbole in der taskleiste",
    "icônes qui s'affichent",
    "icones qui s'affichent",
    "タスク",
    "选择哪些图标",
    "選擇哪些圖示",
];

const ICON_LIST_PAGE_FRAGMENTS: &[&str] = &[
    "always show all icons in the notification area",
    "mostrar siempre todos los iconos",
    "alle symbole im infobereich",
    "toujours afficher toutes les icônes",
    "toujours afficher toutes les icones",
    "通知領域",
    "始终在通知区域",
    "始終在通知區域",
];

const SETTINGS_WINDOW_TITLES: &[&str] = &[
    "Settings",
    "Configuración",
    "Einstellungen",
    "Paramètres",
    "設定",
    "设置",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskbarEdge {
    Bottom,
    Top,
    Left,
    Right,
}

#[derive(Debug, Clone, Copy)]
pub struct PhysicalRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl PhysicalRect {
    pub fn center(&self) -> (i32, i32) {
        (self.x + self.width / 2, self.y + self.height / 2)
    }

    fn is_valid(&self) -> bool {
        self.width > 0 && self.height > 0
    }
}

/// Open Taskbar settings. On Windows 10, also invoke the nested
/// "Select which icons appear on the taskbar" hyperlink via UI Automation.
pub fn open_icon_settings() {
    if !try_start_uri() {
        log::warn!("tray.open-icon-settings: failed to launch ms-settings:taskbar");
        return;
    }
    // Always try the nested page. On Win11 the hyperlink is absent and this no-ops.
    // Dedicated STA thread: UWP Settings Invoke is unreliable from a random worker pool.
    let _ = std::thread::Builder::new()
        .name("tray-icon-settings".into())
        .spawn(|| {
            if let Err(e) = try_open_icon_list_page() {
                log::warn!("tray.open-icon-list: {e}");
            }
        });
}

fn try_start_uri() -> bool {
    let result = unsafe {
        ShellExecuteW(
            None,
            w!("open"),
            TASKBAR_SETTINGS_URI,
            None,
            None,
            SW_SHOWNORMAL,
        )
    };
    result.0 as usize > 32
}

fn try_open_icon_list_page() -> Result<(), String> {
    let hr = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    if hr.is_err() && hr.0 != 0x80010106u32 as i32 {
        // RPC_E_CHANGED_MODE: already initialized.
        log::debug!("tray.open-icon-list: CoInitializeEx {:?}", hr);
    }

    let automation: IUIAutomation = unsafe {
        CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
            .map_err(|e| format!("CUIAutomation: {e}"))?
    };

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(12);
    while std::time::Instant::now() < deadline {
        if let Some(window) = find_settings_window(&automation) {
            if has_named_fragment(&automation, &window, ICON_LIST_PAGE_FRAGMENTS) {
                return Ok(());
            }
            if try_invoke_icon_list_link(&automation, &window) {
                return Ok(());
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    log::warn!("tray.open-icon-list: nested icon-list link was not found");
    Ok(())
}

fn find_settings_window(automation: &IUIAutomation) -> Option<IUIAutomationElement> {
    let hwnd = find_system_settings_hwnd()?;
    // The XAML tree (hyperlinks) lives on the CoreWindow hosted inside the frame.
    if let Ok(core) =
        unsafe { FindWindowExW(Some(hwnd), None, w!("Windows.UI.Core.CoreWindow"), PCWSTR::null()) }
    {
        if let Ok(el) = unsafe { automation.ElementFromHandle(core) } {
            return Some(el);
        }
    }
    unsafe { automation.ElementFromHandle(hwnd) }.ok()
}

/// Windows Settings lives in `ApplicationFrameWindow`. Matching by title alone
/// would hit CyberPaste's own settings webview, which is also named "Settings".
fn find_system_settings_hwnd() -> Option<HWND> {
    let own_pid = unsafe { GetCurrentProcessId() };
    for title in SETTINGS_WINDOW_TITLES {
        let wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
        if let Ok(hwnd) =
            unsafe { FindWindowW(w!("ApplicationFrameWindow"), PCWSTR::from_raw(wide.as_ptr())) }
        {
            if hwnd_is_candidate(hwnd, own_pid) {
                return Some(hwnd);
            }
        }
    }
    enum_system_settings_hwnd(own_pid)
}

struct EnumState {
    own_pid: u32,
    found: HWND,
}

fn enum_system_settings_hwnd(own_pid: u32) -> Option<HWND> {
    let mut state = EnumState {
        own_pid,
        found: HWND::default(),
    };
    let _ = unsafe { EnumWindows(Some(enum_settings_proc), LPARAM(&mut state as *mut _ as isize)) };
    if state.found.is_invalid() {
        None
    } else {
        Some(state.found)
    }
}

unsafe extern "system" fn enum_settings_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let state = unsafe { &mut *(lparam.0 as *mut EnumState) };
    if !hwnd_is_candidate(hwnd, state.own_pid) {
        return BOOL(1);
    }
    let class_name = window_class(hwnd);
    if class_name != "ApplicationFrameWindow" {
        return BOOL(1);
    }
    let title = window_title(hwnd);
    if SETTINGS_WINDOW_TITLES
        .iter()
        .any(|t| title.eq_ignore_ascii_case(t))
    {
        state.found = hwnd;
        return BOOL(0);
    }
    BOOL(1)
}

fn hwnd_is_candidate(hwnd: HWND, own_pid: u32) -> bool {
    if hwnd.is_invalid() {
        return false;
    }
    if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
        return false;
    }
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    pid != 0 && pid != own_pid
}

fn window_class(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) };
    if len <= 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buf[..len as usize])
}

fn window_title(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
    if len <= 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buf[..len as usize])
}

fn try_invoke_icon_list_link(automation: &IUIAutomation, window: &IUIAutomationElement) -> bool {
    for control_type in [UIA_HyperlinkControlTypeId.0, UIA_ButtonControlTypeId.0] {
        if invoke_matching(automation, window, Some(control_type)) {
            return true;
        }
    }
    invoke_matching(automation, window, None)
}

fn invoke_matching(
    automation: &IUIAutomation,
    window: &IUIAutomationElement,
    control_type: Option<i32>,
) -> bool {
    let condition = if let Some(ct) = control_type {
        let type_var = VARIANT::from(ct);
        match unsafe { automation.CreatePropertyCondition(UIA_ControlTypePropertyId, &type_var) } {
            Ok(c) => c,
            Err(_) => return false,
        }
    } else {
        match unsafe { automation.CreateTrueCondition() } {
            Ok(c) => c,
            Err(_) => return false,
        }
    };
    let Ok(nodes) = (unsafe { window.FindAll(TreeScope_Descendants, &condition) }) else {
        return false;
    };
    let Ok(count) = (unsafe { nodes.Length() }) else {
        return false;
    };
    for i in 0..count {
        let Ok(node) = (unsafe { nodes.GetElement(i) }) else {
            continue;
        };
        let name = unsafe { node.CurrentName() }
            .map(|n: BSTR| n.to_string())
            .unwrap_or_default();
        if name.is_empty() || !contains_any(&name, ICON_LIST_LINK_FRAGMENTS) {
            continue;
        }
        if let Ok(invoke) =
            unsafe { node.GetCurrentPatternAs::<IUIAutomationInvokePattern>(UIA_InvokePatternId) }
        {
            if unsafe { invoke.Invoke() }.is_ok() {
                log::info!("tray.open-icon-list: invoked '{name}'");
                return true;
            }
        }
    }
    false
}

fn has_named_fragment(
    automation: &IUIAutomation,
    window: &IUIAutomationElement,
    fragments: &[&str],
) -> bool {
    let Ok(true_cond) = (unsafe { automation.CreateTrueCondition() }) else {
        return false;
    };
    let Ok(nodes) = (unsafe { window.FindAll(TreeScope_Descendants, &true_cond) }) else {
        return false;
    };
    let Ok(count) = (unsafe { nodes.Length() }) else {
        return false;
    };
    for i in 0..count {
        let Ok(node) = (unsafe { nodes.GetElement(i) }) else {
            continue;
        };
        let name = unsafe { node.CurrentName() }
            .map(|n: BSTR| n.to_string())
            .unwrap_or_default();
        if !name.is_empty() && contains_any(&name, fragments) {
            return true;
        }
    }
    false
}

fn contains_any(text: &str, fragments: &[&str]) -> bool {
    let lower = text.to_lowercase();
    fragments.iter().any(|f| lower.contains(&f.to_lowercase()))
}

pub fn get_taskbar_edge(fallback_anchor: PhysicalRect) -> TaskbarEdge {
    if let Some(edge) = taskbar_edge_from_appbar() {
        return edge;
    }
    taskbar_edge_from_work_area(fallback_anchor)
}

fn taskbar_edge_from_appbar() -> Option<TaskbarEdge> {
    let mut data = APPBARDATA {
        cbSize: std::mem::size_of::<APPBARDATA>() as u32,
        ..Default::default()
    };
    let result = unsafe { SHAppBarMessage(ABM_GETTASKBARPOS, &mut data) };
    if result == 0 {
        return None;
    }
    Some(match data.uEdge {
        ABE_TOP => TaskbarEdge::Top,
        ABE_LEFT => TaskbarEdge::Left,
        ABE_RIGHT => TaskbarEdge::Right,
        _ => TaskbarEdge::Bottom,
    })
}

fn taskbar_edge_from_work_area(anchor: PhysicalRect) -> TaskbarEdge {
    // Best-effort: compare monitor work area vs full bounds via the tray window.
    let tray = unsafe { FindWindowW(w!("Shell_TrayWnd"), PCWSTR::null()) }.ok();
    if let Some(hwnd) = tray {
        if let Some(bar) = window_rect(hwnd) {
            let (ax, ay) = anchor.center();
            let dist_top = (ay - bar.y).abs();
            let dist_bottom = (ay - (bar.y + bar.height)).abs();
            let dist_left = (ax - bar.x).abs();
            let dist_right = (ax - (bar.x + bar.width)).abs();
            let min = dist_top.min(dist_bottom).min(dist_left).min(dist_right);
            if min == dist_top && bar.height < bar.width {
                return TaskbarEdge::Top;
            }
            if min == dist_left && bar.width < bar.height {
                return TaskbarEdge::Left;
            }
            if min == dist_right && bar.width < bar.height {
                return TaskbarEdge::Right;
            }
            return TaskbarEdge::Bottom;
        }
    }
    TaskbarEdge::Bottom
}

pub fn try_get_notification_area_rect() -> Option<PhysicalRect> {
    if let Some(rect) = tray_notify_wnd_rect() {
        return Some(rect);
    }
    taskbar_corner_rect()
}

fn tray_notify_wnd_rect() -> Option<PhysicalRect> {
    let tray = unsafe { FindWindowW(w!("Shell_TrayWnd"), PCWSTR::null()) }.ok()?;
    let notify =
        unsafe { FindWindowExW(Some(tray), None, w!("TrayNotifyWnd"), PCWSTR::null()) }.ok()?;
    let rect = window_rect(notify)?;
    if rect.is_valid() {
        Some(rect)
    } else {
        None
    }
}

fn taskbar_corner_rect() -> Option<PhysicalRect> {
    let mut data = APPBARDATA {
        cbSize: std::mem::size_of::<APPBARDATA>() as u32,
        ..Default::default()
    };
    let result = unsafe { SHAppBarMessage(ABM_GETTASKBARPOS, &mut data) };
    if result == 0 {
        return None;
    }
    let bar = data.rc;
    let rect = match data.uEdge {
        ABE_LEFT | ABE_RIGHT => PhysicalRect {
            x: bar.left,
            y: bar.bottom - 72,
            width: bar.right - bar.left,
            height: 72,
        },
        _ => PhysicalRect {
            x: bar.right - 72,
            y: bar.top,
            width: 72,
            height: bar.bottom - bar.top,
        },
    };
    if rect.is_valid() {
        Some(rect)
    } else {
        None
    }
}

pub fn cursor_rect() -> PhysicalRect {
    let mut pt = POINT::default();
    unsafe {
        let _ = GetCursorPos(&mut pt);
    }
    PhysicalRect {
        x: pt.x,
        y: pt.y,
        width: 16,
        height: 16,
    }
}

fn window_rect(hwnd: HWND) -> Option<PhysicalRect> {
    let mut native = RECT::default();
    unsafe { GetWindowRect(hwnd, &mut native) }.ok()?;
    let width = native.right - native.left;
    let height = native.bottom - native.top;
    if width <= 0 || height <= 0 {
        return None;
    }
    Some(PhysicalRect {
        x: native.left,
        y: native.top,
        width,
        height,
    })
}
