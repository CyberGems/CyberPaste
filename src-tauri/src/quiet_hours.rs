use chrono::{Local, NaiveTime};

use crate::models::AppSettings;

pub const DEFAULT_START: &str = "22:00";
pub const DEFAULT_END: &str = "07:00";

pub fn is_active(settings: &AppSettings) -> bool {
    if !settings.quiet_hours_enabled {
        return false;
    }

    is_in_window(
        Local::now().time(),
        &settings.quiet_hours_start,
        &settings.quiet_hours_end,
    )
}

pub fn is_in_window(now: NaiveTime, start: &str, end: &str) -> bool {
    let start = parse_or_default(start, DEFAULT_START);
    let end = parse_or_default(end, DEFAULT_END);

    if start == end {
        return false;
    }

    if start < end {
        now >= start && now < end
    } else {
        // Overnight ranges such as 22:00 to 07:00.
        now >= start || now < end
    }
}

fn parse_or_default(value: &str, fallback: &str) -> NaiveTime {
    parse(value)
        .or_else(|| parse(fallback))
        .unwrap_or_else(|| NaiveTime::from_hms_opt(22, 0, 0).expect("valid default time"))
}

fn parse(value: &str) -> Option<NaiveTime> {
    let (hour, minute) = value.trim().split_once(':')?;
    if minute.contains(':') {
        return None;
    }
    let hour = hour.parse::<u32>().ok()?;
    let minute = minute.parse::<u32>().ok()?;
    NaiveTime::from_hms_opt(hour, minute, 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn time(hour: u32, minute: u32) -> NaiveTime {
        NaiveTime::from_hms_opt(hour, minute, 0).unwrap()
    }

    #[test]
    fn supports_overnight_windows() {
        assert!(is_in_window(time(22, 0), "22:00", "07:00"));
        assert!(is_in_window(time(6, 59), "22:00", "07:00"));
        assert!(!is_in_window(time(7, 0), "22:00", "07:00"));
        assert!(!is_in_window(time(12, 0), "22:00", "07:00"));
    }

    #[test]
    fn equal_bounds_disable_the_window() {
        assert!(!is_in_window(time(22, 0), "22:00", "22:00"));
    }
}
