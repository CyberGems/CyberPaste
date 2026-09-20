use crate::models::AppSettings;
use serde_json::json;

/// Frontend sentinel: "keep the stored key, this save did not change it."
pub const API_KEY_UNCHANGED: &str = "__CYBERPASTE_API_KEY_UNCHANGED__";
/// Frontend sentinel: user explicitly cleared the key.
pub const API_KEY_CLEAR: &str = "__CYBERPASTE_API_KEY_CLEAR__";

const DPAPI_PREFIX: &str = "dpapi:";

/// Encrypt a secret for the current Windows user (DPAPI).
pub fn protect_api_key(plain: &str) -> Result<String, String> {
    if plain.is_empty() {
        return Ok(String::new());
    }
    #[cfg(target_os = "windows")]
    {
        let encrypted = dpapi_protect(plain.as_bytes())?;
        Ok(format!(
            "{}{}",
            DPAPI_PREFIX,
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, encrypted)
        ))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(plain.to_string())
    }
}

/// Decrypt a stored AI key. Legacy plaintext values are returned as-is.
pub fn resolve_api_key(stored: &str) -> String {
    if stored.is_empty() {
        return String::new();
    }
    let Some(encoded) = stored.strip_prefix(DPAPI_PREFIX) else {
        return stored.to_string();
    };
    #[cfg(target_os = "windows")]
    {
        let Ok(bytes) = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            encoded,
        ) else {
            log::warn!("AI API key DPAPI blob is not valid base64");
            return String::new();
        };
        match dpapi_unprotect(&bytes) {
            Ok(plain) => String::from_utf8(plain).unwrap_or_default(),
            Err(e) => {
                log::warn!("Failed to decrypt AI API key with DPAPI: {e}");
                String::new()
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = encoded;
        stored.to_string()
    }
}

pub fn is_api_key_configured(stored: &str) -> bool {
    !stored.is_empty()
}

/// Apply an incoming frontend `ai_api_key` field onto `target`, preserving or
/// protecting the in-memory/current value as needed.
pub fn apply_incoming_api_key(
    target: &mut AppSettings,
    current_stored: &str,
    incoming: Option<&str>,
) -> Result<(), String> {
    match incoming {
        None | Some(API_KEY_UNCHANGED) => {
            target.ai_api_key = current_stored.to_string();
        }
        Some("") => {
            // Empty from a settings round-trip (window size, theme, etc.): keep.
            target.ai_api_key = current_stored.to_string();
        }
        Some(API_KEY_CLEAR) => {
            target.ai_api_key.clear();
        }
        Some(plain) => {
            target.ai_api_key = protect_api_key(plain)?;
        }
    }
    Ok(())
}

/// JSON the webviews are allowed to see: no lock hash, no API key material.
pub fn settings_for_frontend(settings: &AppSettings) -> serde_json::Value {
    let mut value = serde_json::to_value(settings).unwrap_or_else(|_| json!({}));
    if let Some(obj) = value.as_object_mut() {
        obj.remove("app_lock_hash");
        obj.remove("app_lock_recovery_hash");
        let configured = is_api_key_configured(&settings.ai_api_key);
        obj.insert("ai_api_key_configured".into(), json!(configured));
        obj.insert("ai_api_key".into(), json!(""));
    }
    value
}

pub fn migrate_plain_api_key(settings: &mut AppSettings) -> bool {
    if settings.ai_api_key.is_empty() || settings.ai_api_key.starts_with(DPAPI_PREFIX) {
        return false;
    }
    match protect_api_key(&settings.ai_api_key) {
        Ok(protected) => {
            settings.ai_api_key = protected;
            true
        }
        Err(e) => {
            log::warn!("Could not DPAPI-protect AI API key: {e}");
            false
        }
    }
}

#[cfg(target_os = "windows")]
fn dpapi_protect(plain: &[u8]) -> Result<Vec<u8>, String> {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
    };

    let mut input = CRYPT_INTEGER_BLOB {
        cbData: plain.len() as u32,
        pbData: plain.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let descr: Vec<u16> = "CyberPaste AI API key\0".encode_utf16().collect();

    unsafe {
        CryptProtectData(
            &mut input,
            PCWSTR(descr.as_ptr()),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|e| format!("CryptProtectData failed: {e}"))?;

        if output.pbData.is_null() || output.cbData == 0 {
            return Err("CryptProtectData returned an empty blob".into());
        }
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData as _)));
        Ok(bytes)
    }
}

#[cfg(target_os = "windows")]
fn dpapi_unprotect(blob: &[u8]) -> Result<Vec<u8>, String> {
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
    };

    let mut input = CRYPT_INTEGER_BLOB {
        cbData: blob.len() as u32,
        pbData: blob.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    unsafe {
        CryptUnprotectData(
            &mut input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|e| format!("CryptUnprotectData failed: {e}"))?;

        if output.pbData.is_null() || output.cbData == 0 {
            return Err("CryptUnprotectData returned an empty blob".into());
        }
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData as _)));
        Ok(bytes)
    }
}
