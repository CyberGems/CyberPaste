use serde::Serialize;

pub const DEFAULT_MAX_CLIPBOARD_TEXT_BYTES: i64 = 5 * 1024 * 1024;
pub const MIN_MAX_CLIPBOARD_TEXT_BYTES: i64 = 1024 * 1024;
pub const MAX_MAX_CLIPBOARD_TEXT_BYTES: i64 = 100 * 1024 * 1024;

pub fn default_max_clipboard_text_bytes() -> i64 {
    DEFAULT_MAX_CLIPBOARD_TEXT_BYTES
}

pub fn normalize_max_clipboard_text_bytes(value: i64) -> i64 {
    value.clamp(MIN_MAX_CLIPBOARD_TEXT_BYTES, MAX_MAX_CLIPBOARD_TEXT_BYTES)
}

pub fn is_text_clip_type(clip_type: &str) -> bool {
    matches!(clip_type, "text" | "url" | "code" | "html" | "rtf")
}

#[derive(Debug, Clone, Serialize)]
pub struct ContentLimitExceeded {
    pub code: &'static str,
    pub clip_type: String,
    pub content_bytes: usize,
    pub limit_bytes: usize,
}

pub fn validate_text_content(
    clip_type: &str,
    content: &[u8],
    configured_limit: i64,
) -> Result<(), ContentLimitExceeded> {
    if !is_text_clip_type(clip_type) {
        return Ok(());
    }

    let limit_bytes = normalize_max_clipboard_text_bytes(configured_limit) as usize;
    if content.len() <= limit_bytes {
        return Ok(());
    }

    Err(ContentLimitExceeded {
        code: "content_limit_exceeded",
        clip_type: clip_type.to_string(),
        content_bytes: content.len(),
        limit_bytes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_limit_is_five_megabytes() {
        assert_eq!(default_max_clipboard_text_bytes(), 5 * 1024 * 1024);
    }

    #[test]
    fn configured_limits_are_clamped_to_safe_bounds() {
        assert_eq!(
            normalize_max_clipboard_text_bytes(0),
            MIN_MAX_CLIPBOARD_TEXT_BYTES
        );
        assert_eq!(
            normalize_max_clipboard_text_bytes(i64::MAX),
            MAX_MAX_CLIPBOARD_TEXT_BYTES
        );
    }

    #[test]
    fn content_at_the_limit_is_allowed_but_the_next_byte_is_rejected() {
        let limit = MIN_MAX_CLIPBOARD_TEXT_BYTES;
        let allowed = vec![b'a'; limit as usize];
        let exceeded = vec![b'a'; limit as usize + 1];

        assert!(validate_text_content("text", &allowed, limit).is_ok());
        let error = validate_text_content("text", &exceeded, limit).unwrap_err();
        assert_eq!(error.code, "content_limit_exceeded");
        assert_eq!(error.content_bytes, limit as usize + 1);
    }

    #[test]
    fn limit_is_measured_in_utf8_bytes() {
        let limit = MIN_MAX_CLIPBOARD_TEXT_BYTES as usize;
        let mut content_at_limit = vec![b'a'; limit - 2];
        content_at_limit.extend_from_slice("á".as_bytes());
        assert_eq!(content_at_limit.len(), limit);
        assert!(
            validate_text_content("text", &content_at_limit, MIN_MAX_CLIPBOARD_TEXT_BYTES).is_ok()
        );

        content_at_limit.push(b'a');
        assert!(
            validate_text_content("text", &content_at_limit, MIN_MAX_CLIPBOARD_TEXT_BYTES).is_err()
        );
    }

    #[test]
    fn images_and_files_are_not_subject_to_text_limit() {
        let content = vec![b'a'; (MAX_MAX_CLIPBOARD_TEXT_BYTES + 1) as usize];

        assert!(validate_text_content("image", &content, MIN_MAX_CLIPBOARD_TEXT_BYTES).is_ok());
        assert!(validate_text_content("file", &content, MIN_MAX_CLIPBOARD_TEXT_BYTES).is_ok());
    }
}
