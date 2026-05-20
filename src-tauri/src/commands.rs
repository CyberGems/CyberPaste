use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_x::{
    start_listening, stop_listening, write_files, write_html, write_rtf, write_text,
};

use crate::ai::{self, AiAction, AiConfig};
use crate::database::Database;
use crate::models::{Clip, ClipboardItem, Folder, FolderItem};
use crate::settings_manager::SettingsManager;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Instant;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

#[tauri::command]
pub async fn ai_process_clip(
    app: AppHandle,
    clip_id: String,
    action: String,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<String, String> {
    let pool = &db.pool;

    // 1. Get Clip
    let clip: Clip = sqlx::query_as(r#"SELECT * FROM clips WHERE uuid = ?"#)
        .bind(&clip_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Clip not found")?;

    let text_content =
        if clip.clip_type == "text" || clip.clip_type == "url" {
            String::from_utf8_lossy(&clip.content).to_string()
        } else if clip.clip_type == "html" {
            crate::clipboard::strip_html_tags(&String::from_utf8_lossy(&clip.content))
        } else if clip.clip_type == "rtf" {
            crate::clipboard::strip_rtf_tags(&String::from_utf8_lossy(&clip.content))
        } else {
            return Err("AI processing only supported for text content".to_string());
        };

    // 2. Get AI Config
    let manager = app.state::<Arc<SettingsManager>>();
    let settings = manager.get();

    let key_preview = if settings.ai_api_key.len() > 8 {
        format!("{}...{}", &settings.ai_api_key[..4], &settings.ai_api_key[settings.ai_api_key.len()-4..])
    } else {
        "too_short".to_string()
    };
    log::info!("AI Process: provider={}, model={}, base_url={}, key_preview={}", settings.ai_provider, settings.ai_model, settings.ai_base_url, key_preview);

    if settings.ai_api_key.is_empty() {
        return Err("AI API Key is missing in settings".to_string());
    }

    let config = AiConfig {
        provider: settings.ai_provider,
        api_key: settings.ai_api_key,
        model: settings.ai_model,
        base_url: if settings.ai_base_url.is_empty() {
            None
        } else {
            Some(settings.ai_base_url)
        },
    };

    let ai_action = match action.as_str() {
        "summarize" => AiAction::Summarize,
        "translate" => AiAction::Translate,
        "explain_code" => AiAction::ExplainCode,
        "fix_grammar" => AiAction::FixGrammar,
        _ => return Err("Invalid AI action".to_string()),
    };

    let custom_prompt = match ai_action {
        AiAction::Summarize => Some(settings.ai_prompt_summarize),
        AiAction::Translate => Some(settings.ai_prompt_translate),
        AiAction::ExplainCode => Some(settings.ai_prompt_explain_code),
        AiAction::FixGrammar => Some(settings.ai_prompt_fix_grammar),
    };

    // 3. Call AI
    let result = ai::process_text(&text_content, ai_action.clone(), &config, custom_prompt)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Update Metadata
    let mut metadata: serde_json::Value = if let Some(meta_str) = &clip.metadata {
        serde_json::from_str(meta_str).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let key = match ai_action {
        AiAction::Summarize => "ai_summary",
        AiAction::Translate => "ai_translation",
        AiAction::ExplainCode => "ai_explanation",
        AiAction::FixGrammar => "ai_grammar_fix",
    };

    metadata[key] = serde_json::json!(result);
    let new_metadata_str = metadata.to_string();

    sqlx::query("UPDATE clips SET metadata = ? WHERE uuid = ?")
        .bind(&new_metadata_str)
        .bind(&clip_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

fn clip_to_list_item(clip: &Clip, image_path: Option<&str>, preview_only: bool) -> ClipboardItem {
    let content_str = if clip.clip_type == "image" {
        image_path.unwrap_or_default().to_string()
    } else if preview_only {
        // Optimization: don't send full content for previews to save IPC/CPU
        String::new()
    } else {
        String::from_utf8_lossy(&clip.content).to_string()
    };

    let content_length = String::from_utf8_lossy(&clip.content).chars().count();

    ClipboardItem {
        id: clip.uuid.clone(),
        clip_type: clip.clip_type.clone(),
        content: content_str,
        preview: clip.text_preview.clone(),
        content_length,
        folder_id: clip.folder_id.map(|id| id.to_string()),
        created_at: clip.created_at.to_rfc3339(),
        source_app: clip.source_app.clone(),
        source_icon: clip.source_icon.clone(),
        metadata: clip.metadata.clone(),
        image_path: image_path.map(|s| s.to_string()),
        is_pinned: clip.is_pinned,
    }
}

fn clip_to_detail_item(
    clip: &Clip,
    full_image_content: Option<&[u8]>,
    image_path: Option<String>,
) -> ClipboardItem {
    let content_str = if clip.clip_type == "image" {
        BASE64.encode(full_image_content.unwrap_or(&clip.content))
    } else {
        String::from_utf8_lossy(&clip.content).to_string()
    };

    ClipboardItem {
        id: clip.uuid.clone(),
        clip_type: clip.clip_type.clone(),
        content: content_str,
        preview: clip.text_preview.clone(),
        content_length: String::from_utf8_lossy(&clip.content).chars().count(),
        folder_id: clip.folder_id.map(|id| id.to_string()),
        created_at: clip.created_at.to_rfc3339(),
        source_app: clip.source_app.clone(),
        source_icon: clip.source_icon.clone(),
        metadata: clip.metadata.clone(),
        image_path,
        is_pinned: clip.is_pinned,
    }
}

async fn delete_clip_image_file_by_uuid(pool: &SqlitePool, clip_uuid: &str) -> Result<(), String> {
    let file_path: Option<String> =
        sqlx::query_scalar(r#"SELECT file_path FROM clip_images WHERE clip_uuid = ?"#)
            .bind(clip_uuid)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    if let Some(path) = file_path {
        if !path.is_empty() {
            crate::clipboard::remove_full_image_file(&path);
        }
    }

    Ok(())
}

async fn cleanup_orphan_clip_image_files(pool: &SqlitePool) -> Result<(), String> {
    let orphan_paths: Vec<Option<String>> = sqlx::query_scalar(
        r#"
        SELECT file_path
        FROM clip_images
        WHERE clip_uuid NOT IN (SELECT uuid FROM clips)
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    for path in orphan_paths.into_iter().flatten() {
        if !path.is_empty() {
            crate::clipboard::remove_full_image_file(&path);
        }
    }

    sqlx::query(r#"DELETE FROM clip_images WHERE clip_uuid NOT IN (SELECT uuid FROM clips)"#)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn prune_history(pool: &SqlitePool, max_items: i64) -> Result<(), String> {
    // 1. Get count of clips NOT in folders and NOT pinned
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM clips WHERE folder_id IS NULL AND is_deleted = 0 AND is_pinned = 0",
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    if count > max_items {
        let to_delete = count - max_items;
        // 2. Delete the oldest 'to_delete' clips that are NOT in folders and NOT pinned
        sqlx::query(
            r#"
            DELETE FROM clips 
            WHERE uuid IN (
                SELECT uuid FROM clips 
                WHERE folder_id IS NULL AND is_deleted = 0 AND is_pinned = 0
                ORDER BY created_at ASC 
                LIMIT ?
            )
        "#,
        )
        .bind(to_delete)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

async fn cleanup_all_clip_image_files(pool: &SqlitePool) -> Result<(), String> {
    let all_paths: Vec<Option<String>> = sqlx::query_scalar(r#"SELECT file_path FROM clip_images"#)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    for path in all_paths.into_iter().flatten() {
        if !path.is_empty() {
            crate::clipboard::remove_full_image_file(&path);
        }
    }

    Ok(())
}

pub async fn migrate_images_to_files(pool: &SqlitePool) -> Result<(), String> {
    log::info!("Checking for legacy images to migrate...");

    // 1. Migrate legacy clips (content in 'clips' table)
    let legacy_clips: Vec<(String, Vec<u8>)> = sqlx::query_as(
        r#"SELECT uuid, content FROM clips WHERE clip_type = 'image' AND length(content) > 0"#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if !legacy_clips.is_empty() {
        log::info!(
            "Migrating {} legacy image clips to files...",
            legacy_clips.len()
        );
        for (uuid, full_bytes) in legacy_clips {
            match crate::clipboard::persist_full_image_file(&uuid, &full_bytes) {
                Ok(file_path) => {
                    let _ = sqlx::query(
                        r#"
                        INSERT OR REPLACE INTO clip_images (clip_uuid, full_content, file_path, file_size, storage_kind, mime_type, created_at)
                        VALUES (?, x'', ?, ?, 'file', 'image/png', CURRENT_TIMESTAMP)
                        "#,
                    )
                    .bind(&uuid)
                    .bind(&file_path)
                    .bind(full_bytes.len() as i64)
                    .execute(pool)
                    .await;

                    let _ = sqlx::query(
                        r#"UPDATE clips SET content = x'', is_thumbnail = 0 WHERE uuid = ?"#,
                    )
                    .bind(&uuid)
                    .execute(pool)
                    .await;
                }
                Err(e) => {
                    log::error!("Failed to migrate legacy clip {}: {}", uuid, e);
                }
            }
        }
    }

    // 2. Migrate DB-stored images in 'clip_images'
    let db_images: Vec<(String, Vec<u8>)> = sqlx::query_as(
        r#"SELECT clip_uuid, full_content FROM clip_images WHERE storage_kind = 'db' AND length(full_content) > 0"#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if !db_images.is_empty() {
        log::info!("Migrating {} DB-stored images to files...", db_images.len());
        for (uuid, content) in db_images {
            match crate::clipboard::persist_full_image_file(&uuid, &content) {
                Ok(file_path) => {
                    let _ = sqlx::query(
                        r#"
                        UPDATE clip_images
                        SET full_content = x'', file_path = ?, storage_kind = 'file'
                        WHERE clip_uuid = ?
                        "#,
                    )
                    .bind(&file_path)
                    .bind(&uuid)
                    .execute(pool)
                    .await;
                }
                Err(e) => {
                    log::error!("Failed to migrate DB image for clip {}: {}", uuid, e);
                }
            }
        }
    }

    log::info!("Background image migration process finished.");
    Ok(())
}

async fn load_full_image_content(pool: &SqlitePool, clip: &mut Clip) -> Result<Vec<u8>, String> {
    if clip.clip_type != "image" {
        return Err("Clip is not an image".to_string());
    }

    // 1. Try fetching from file path in DB
    let file_path: Option<String> =
        sqlx::query_scalar(r#"SELECT file_path FROM clip_images WHERE clip_uuid = ?"#)
            .bind(&clip.uuid)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    if let Some(path) = file_path {
        if !path.is_empty() {
            // If file exists, return it
            if let Ok(bytes) = crate::clipboard::read_full_image_file(&path) {
                return Ok(bytes);
            }
            // If file missing, try fallbacks below
            log::warn!("Image file missing at {}, checking DB backups...", path);
        }
    }

    // 2. Try DB blob (migration not done or failed)
    let full_content: Option<Vec<u8>> =
        sqlx::query_scalar(r#"SELECT full_content FROM clip_images WHERE clip_uuid = ?"#)
            .bind(&clip.uuid)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    if let Some(content) = full_content {
        if !content.is_empty() {
            return Ok(content);
        }
    }

    // 3. Legacy content in clips table
    if !clip.content.is_empty() {
        return Ok(clip.content.clone());
    }

    Err("Image content missing".to_string())
}

#[tauri::command]
pub async fn get_clips(
    filter_id: Option<String>,
    limit: i64,
    offset: i64,
    preview_only: Option<bool>,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<Vec<ClipboardItem>, String> {
    let pool = &db.pool;
    let preview_only = preview_only.unwrap_or(false);
    let started = Instant::now();

    log::info!(
        "get_clips called with filter_id: {:?}, preview_only: {}",
        filter_id,
        preview_only
    );

    let sql_started = Instant::now();
    let clips: Vec<Clip> = match filter_id.as_deref() {
        Some(id) => {
            let folder_id_num = id.parse::<i64>().ok();
            if let Some(numeric_id) = folder_id_num {
                log::info!("Querying for folder_id: {}", numeric_id);
                sqlx::query_as(
                    r#"
                    SELECT * FROM clips WHERE is_deleted = 0 AND folder_id = ?
                    ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?
                "#,
                )
                .bind(numeric_id)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?
            } else {
                log::info!("Unknown folder_id, returning empty");
                Vec::new()
            }
        }
        None => {
            log::info!("Querying for items, offset: {}, limit: {}", offset, limit);
            sqlx::query_as(
                r#"
                SELECT * FROM clips WHERE is_deleted = 0 AND folder_id IS NULL
                ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?
            "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?
        }
    };
    let sql_ms = sql_started.elapsed().as_millis();

    log::info!("DB: Found {} clips", clips.len());

    // Batch fetch image paths
    let mut image_path_map: HashMap<String, String> = HashMap::new();
    let image_uuids: Vec<String> = clips
        .iter()
        .filter(|c| c.clip_type == "image")
        .map(|c| c.uuid.clone())
        .collect();

    if !image_uuids.is_empty() {
        // Construct query: SELECT clip_uuid, file_path FROM clip_images WHERE clip_uuid IN (?, ?, ...)
        let placeholders: Vec<String> = image_uuids.iter().map(|_| "?".to_string()).collect();
        let query = format!(
            "SELECT clip_uuid, file_path FROM clip_images WHERE clip_uuid IN ({})",
            placeholders.join(",")
        );

        let mut query_builder = sqlx::query_as::<_, (String, Option<String>)>(&query);
        for uuid in &image_uuids {
            query_builder = query_builder.bind(uuid);
        }

        let results = query_builder
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;
        for (uuid, path) in results {
            if let Some(p) = path {
                if !p.is_empty() {
                    image_path_map.insert(uuid, p);
                }
            }
        }
    }

    let image_rows = image_uuids.len();
    let raw_bytes: usize = clips.iter().map(|clip| clip.content.len()).sum();
    let map_started = Instant::now();
    let items: Vec<ClipboardItem> = clips
        .iter()
        .enumerate()
        .map(|(idx, clip)| {
            let item = clip_to_list_item(
                clip,
                image_path_map.get(&clip.uuid).map(|s| s.as_str()),
                preview_only,
            );
            // Only log first 10 clips to reduce noise
            if idx < 10 {
                log::trace!(
                    "{} Clip {}: type='{}', content_len={}",
                    idx,
                    clip.uuid,
                    clip.clip_type,
                    item.content.len()
                );
            }
            item
        })
        .collect();
    let map_ms = map_started.elapsed().as_millis();
    let total_ms = started.elapsed().as_millis();
    log::info!(
        "[perf][get_clips] sql_ms={} map_ms={} total_ms={} rows={} images={} raw_bytes={} preview_only={} filter_id={:?} offset={} limit={}",
        sql_ms,
        map_ms,
        total_ms,
        clips.len(),
        image_rows,
        raw_bytes,
        preview_only,
        filter_id,
        offset,
        limit
    );

    Ok(items)
}

#[tauri::command]
pub async fn get_clip(
    clip_id: String,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<ClipboardItem, String> {
    let pool = &db.pool;

    let clip: Option<Clip> = sqlx::query_as(r#"SELECT * FROM clips WHERE uuid = ?"#)
        .bind(&clip_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    match clip {
        Some(mut clip) => {
            if clip.clip_type == "image" {
                let mut file_path: Option<String> =
                    sqlx::query_scalar(r#"SELECT file_path FROM clip_images WHERE clip_uuid = ?"#)
                        .bind(&clip.uuid)
                        .fetch_optional(pool)
                        .await
                        .map_err(|e| e.to_string())?;

                let full = load_full_image_content(pool, &mut clip).await?;

                // JIT Migration: If no file path exists, create one now so the viewer can use it for 'Edit'
                if file_path.is_none() || file_path.as_ref().map(|s| s.is_empty()).unwrap_or(true) {
                    if let Ok(path) = crate::clipboard::persist_full_image_file(&clip.uuid, &full) {
                        let _ = sqlx::query("UPDATE clip_images SET file_path = ?, storage_kind = 'file' WHERE clip_uuid = ?")
                            .bind(&path)
                            .bind(&clip.uuid)
                            .execute(pool)
                            .await;
                        file_path = Some(path);
                    }
                }

                Ok(clip_to_detail_item(&clip, Some(&full), file_path))
            } else {
                Ok(clip_to_detail_item(&clip, None, None))
            }
        }
        None => Err("Clip not found".to_string()),
    }
}

// TODO(xueshi) get_clip is same as get_clip_detail???
#[tauri::command]
pub async fn get_clip_detail(
    id: String,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<ClipboardItem, String> {
    get_clip(id, db).await
}

#[tauri::command]
pub async fn paste_clip(
    id: String,
    app: AppHandle,
    window: tauri::WebviewWindow,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<(), String> {
    let pool = &db.pool;

    let clip: Option<Clip> = sqlx::query_as(r#"SELECT * FROM clips WHERE uuid = ?"#)
        .bind(&id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    match clip {
        Some(clip) => {
            // Synchronize clipboard access across the app
            let _guard = crate::clipboard::CLIPBOARD_SYNC.lock().await;

            let content_hash = clip.content_hash.clone();
            let uuid = clip.uuid.clone();

            // Stop monitor
            if let Err(e) = stop_listening().await {
                log::error!("Failed to stop listener: {}", e);
            }

            let mut final_res = Ok(());

            if clip.clip_type == "image" {
                crate::clipboard::set_ignore_hash(content_hash.clone());
                // Frontend writes image via navigator.clipboard API.
            } else if clip.clip_type == "file" {
                let paths: Vec<String> = serde_json::from_slice(&clip.content).unwrap_or_default();
                crate::clipboard::set_ignore_hash(content_hash.clone());

                let mut last_err = String::new();
                for i in 0..5 {
                    match write_files(paths.clone()).await {
                        Ok(_) => {
                            last_err.clear();
                            break;
                        }
                        Err(e) => {
                            last_err = e.to_string();
                            log::warn!(
                                "Clipboard write (files) attempt {} failed: {}. Retrying...",
                                i + 1,
                                last_err
                            );
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        }
                    }
                }
                if !last_err.is_empty() {
                    final_res = Err(format!("Failed to set clipboard files: {}", last_err));
                }
            } else if clip.clip_type == "html" {
                let html_content = String::from_utf8_lossy(&clip.content).to_string();
                let plain_text = crate::clipboard::strip_html_tags(&html_content);
                crate::clipboard::set_ignore_hash(content_hash.clone());

                let mut last_err = String::new();
                for i in 0..5 {
                    match write_html(plain_text.clone(), html_content.clone()).await {
                        Ok(_) => {
                            last_err.clear();
                            break;
                        }
                        Err(e) => {
                            last_err = e.to_string();
                            log::warn!(
                                "Clipboard write (html) attempt {} failed: {}. Retrying...",
                                i + 1,
                                last_err
                            );
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        }
                    }
                }
                if !last_err.is_empty() {
                    final_res = Err(format!("Failed to set clipboard html: {}", last_err));
                }
            } else if clip.clip_type == "rtf" {
                let rtf_content = String::from_utf8_lossy(&clip.content).to_string();
                let plain_text = crate::clipboard::strip_rtf_tags(&rtf_content);
                crate::clipboard::set_ignore_hash(content_hash.clone());

                let mut last_err = String::new();
                for i in 0..5 {
                    match write_rtf(plain_text.clone(), rtf_content.clone()).await {
                        Ok(_) => {
                            last_err.clear();
                            break;
                        }
                        Err(e) => {
                            last_err = e.to_string();
                            log::warn!(
                                "Clipboard write (rtf) attempt {} failed: {}. Retrying...",
                                i + 1,
                                last_err
                            );
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        }
                    }
                }
                if !last_err.is_empty() {
                    final_res = Err(format!("Failed to set clipboard rtf: {}", last_err));
                }
            } else {
                let content_str = String::from_utf8_lossy(&clip.content).to_string();
                crate::clipboard::set_ignore_hash(content_hash.clone());

                let mut last_err = String::new();
                for i in 0..5 {
                    match write_text(content_str.clone()).await {
                        Ok(_) => {
                            last_err.clear();
                            break;
                        }
                        Err(e) => {
                            last_err = e.to_string();
                            log::warn!(
                                "Clipboard write (text) attempt {} failed: {}. Retrying...",
                                i + 1,
                                last_err
                            );
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        }
                    }
                }
                if !last_err.is_empty() {
                    final_res = Err(format!("Failed to set clipboard text: {}", last_err));
                }
            }

            // Manually perform the LRU bump (update created_at and sort_order unless pinned or in folder)
            let _ =
                sqlx::query(r#"
                    UPDATE clips 
                    SET created_at = CASE WHEN is_pinned = 1 OR folder_id IS NOT NULL THEN created_at ELSE CURRENT_TIMESTAMP END, 
                        sort_order = CASE WHEN is_pinned = 1 OR folder_id IS NOT NULL THEN sort_order ELSE (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM clips) END 
                    WHERE uuid = ?
                "#)
                    .bind(&uuid)
                    .execute(pool)
                    .await;

            // If reset_view_on_paste is enabled and the clip is in a folder, copy it to the main clipboard
            let manager = app.state::<Arc<SettingsManager>>();
            let settings = manager.get();
            if settings.reset_view_on_paste && clip.folder_id.is_some() {
                let existing_history_uuid: Option<String> = sqlx::query_scalar(
                    "SELECT uuid FROM clips WHERE content_hash = ? AND folder_id IS NULL AND is_deleted = 0"
                )
                .bind(&content_hash)
                .fetch_optional(pool)
                .await
                .unwrap_or(None);

                if let Some(hist_uuid) = existing_history_uuid {
                    let _ = sqlx::query(
                        r#"
                        UPDATE clips 
                        SET created_at = CURRENT_TIMESTAMP, 
                            sort_order = (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM clips) 
                        WHERE uuid = ?
                        "#
                    )
                    .bind(hist_uuid)
                    .execute(pool)
                    .await;
                } else {
                    let new_uuid = uuid::Uuid::new_v4().to_string();
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO clips (
                            uuid, clip_type, content, text_preview, content_hash, 
                            folder_id, is_deleted, is_thumbnail, source_app, 
                            source_icon, metadata, sort_order, created_at, last_accessed
                        )
                        VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM clips), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        "#
                    )
                    .bind(&new_uuid)
                    .bind(&clip.clip_type)
                    .bind(&clip.content)
                    .bind(&clip.text_preview)
                    .bind(&clip.content_hash)
                    .bind(clip.is_thumbnail)
                    .bind(&clip.source_app)
                    .bind(&clip.source_icon)
                    .bind(&clip.metadata)
                    .execute(pool)
                    .await;

                    if clip.clip_type == "image" {
                        use sqlx::Row;
                        if let Ok(Some(r)) = sqlx::query(
                            "SELECT file_path, file_size, storage_kind, mime_type FROM clip_images WHERE clip_uuid = ?"
                        )
                        .bind(&uuid)
                        .fetch_optional(pool)
                        .await
                        {
                            let file_path: Option<String> = r.get(0);
                            let file_size: i64 = r.get(1);
                            let storage_kind: String = r.get(2);
                            let mime_type: String = r.get(3);
                            
                            let _ = sqlx::query(
                                r#"
                                INSERT OR REPLACE INTO clip_images (clip_uuid, full_content, file_path, file_size, storage_kind, mime_type, created_at)
                                VALUES (?, x'', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                "#
                            )
                            .bind(&new_uuid)
                            .bind(file_path)
                            .bind(file_size)
                            .bind(storage_kind)
                            .bind(mime_type)
                            .execute(pool)
                            .await;
                        }
                    }
                }
            }

            // Notify frontend to refresh list (standard trigger)
            let _ = app.emit("clipboard-change", ());
            let _ = window.emit("clipboard-change", ());

            // Restart monitor
            let app_clone = app.clone();
            if let Err(e) = start_listening(app_clone).await {
                log::error!("Failed to restart listener: {}", e);
            }

            if final_res.is_ok() {
                let content = if clip.clip_type == "image" {
                    "[Image]".to_string()
                } else if clip.clip_type == "file"
                    || clip.clip_type == "html"
                    || clip.clip_type == "rtf"
                {
                    clip.text_preview.clone()
                } else {
                    String::from_utf8_lossy(&clip.content).to_string()
                };
                let _ = window.emit("clipboard-write", &content);

                // Check settings
                let manager = app.state::<Arc<SettingsManager>>();
                let settings = manager.get();
                let auto_paste = settings.auto_paste;
                let auto_inject = settings.auto_inject_paste;
                log::info!(
                    "paste_clip: auto_paste={}, auto_inject={}",
                    auto_paste,
                    auto_inject
                );

                if settings.pinned {
                    if auto_paste || auto_inject {
                        // If pinned and auto-paste/auto-inject is on, paste without hiding
                        let target_hwnd = if auto_inject {
                            unsafe {
                                let fg =
                                    windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow();
                                fg.0 as isize
                            }
                        } else {
                            0
                        };
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(150));
                            if auto_inject {
                                simulate_ctrl_v_with_target(target_hwnd);
                            } else {
                                crate::clipboard::send_paste_input();
                            }
                        });
                    }
                    // If pinned and not auto-pasting, just stay open (don't hide)
                } else if auto_inject {
                    // Capture target window before hiding
                    let target_hwnd = crate::TARGET_FOREGROUND_HND
                        .load(std::sync::atomic::Ordering::Relaxed)
                        as isize;
                    crate::animate_window_hide(
                        &window,
                        Some(Box::new(move || {
                            std::thread::sleep(std::time::Duration::from_millis(100));
                            simulate_ctrl_v_with_target(target_hwnd);
                        })),
                    );
                } else if auto_paste {
                    // Auto-Paste Logic (Normal - hide then paste)
                    crate::animate_window_hide(
                        &window,
                        Some(Box::new(move || {
                            std::thread::sleep(std::time::Duration::from_millis(200));
                            crate::clipboard::send_paste_input();
                        })),
                    );
                } else {
                    // Normal behavior (hide after selection)
                    crate::animate_window_hide(&window, None);
                }
            }
            final_res
        }
        None => Err("Clip not found".to_string()),
    }
}

#[tauri::command]
pub async fn delete_clip(
    id: String,
    hard_delete: bool,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<(), String> {
    let pool = &db.pool;

    if hard_delete {
        delete_clip_image_file_by_uuid(pool, &id).await?;

        sqlx::query(r#"DELETE FROM clip_images WHERE clip_uuid = ?"#)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query(r#"DELETE FROM clips WHERE uuid = ?"#)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        sqlx::query(r#"UPDATE clips SET is_deleted = 1 WHERE uuid = ?"#)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn toggle_clip_pin(
    uuid: String,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<bool, String> {
    let pool = &db.pool;

    // Toggle the value of is_pinned in database
    let result = sqlx::query(
        r#"
        UPDATE clips 
        SET is_pinned = 1 - is_pinned,
            pinned_at = CASE WHEN is_pinned = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE uuid = ?
    "#,
    )
    .bind(&uuid)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("Clip not found".to_string());
    }

    // Return the new state
    let is_pinned: bool = sqlx::query_scalar(
        r#"
        SELECT is_pinned FROM clips WHERE uuid = ?
    "#,
    )
    .bind(&uuid)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(is_pinned)
}

#[tauri::command]
pub async fn move_to_folder(
    clip_id: String,
    folder_id: Option<String>,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<(), String> {
    let pool = &db.pool;

    // First check if clip exists and what type it is
    let clip_info: Option<(String, String)> =
        sqlx::query_as("SELECT uuid, clip_type FROM clips WHERE uuid = ?")
            .bind(&clip_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    log::info!(
        "move_to_folder: clip_id={}, folder_id={:?}, info={:?}",
        clip_id,
        folder_id,
        clip_info
    );

    let folder_id_parsed = match folder_id {
        Some(id) if id == "null" => None, // Handle edge case where "null" string is passed
        Some(id) => Some(
            id.parse::<i64>()
                .map_err(|e| format!("Invalid folder ID '{}': {}", id, e))?,
        ),
        None => None,
    };

    let result = sqlx::query(r#"UPDATE clips SET folder_id = ? WHERE uuid = ?"#)
        .bind(folder_id_parsed)
        .bind(&clip_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        log::warn!("move_to_folder: No clip found with uuid={}", clip_id);
        return Err("Clip not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn reorder_clip(
    clip_uuid: String,
    target_uuid: String,
    position: String,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<(), String> {
    let pool = &db.pool;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let (clip_sort, target_sort): (i64, i64) = sqlx::query_as(
        r#"
        SELECT c.sort_order, t.sort_order FROM clips c
        JOIN clips t ON t.uuid = ?
        WHERE c.uuid = ?
        "#,
    )
    .bind(&target_uuid)
    .bind(&clip_uuid)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Clip or target not found")?;

    let folder_sub = format!(
        "folder_id = (SELECT folder_id FROM clips WHERE uuid = '{}') AND is_deleted = 0",
        target_uuid.replace('\'', "''")
    );

    if position == "before" {
        if clip_sort < target_sort {
            // Moving clip forward: shift (clip_sort, target_sort) down by 1
            sqlx::query(&format!(
                "UPDATE clips SET sort_order = sort_order - 1 WHERE {} AND sort_order > {} AND sort_order < {}",
                folder_sub, clip_sort, target_sort
            ))
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query("UPDATE clips SET sort_order = ? WHERE uuid = ?")
                .bind(target_sort - 1)
                .bind(&clip_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            // Moving clip backward: shift [target_sort, clip_sort) up by 1
            sqlx::query(&format!(
                "UPDATE clips SET sort_order = sort_order + 1 WHERE {} AND sort_order >= {} AND sort_order < {}",
                folder_sub, target_sort, clip_sort
            ))
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query("UPDATE clips SET sort_order = ? WHERE uuid = ?")
                .bind(target_sort)
                .bind(&clip_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    } else {
        // position == "after"
        if clip_sort > target_sort {
            // Moving clip backward: shift (target_sort, clip_sort) up by 1
            sqlx::query(&format!(
                "UPDATE clips SET sort_order = sort_order + 1 WHERE {} AND sort_order > {} AND sort_order < {}",
                folder_sub, target_sort, clip_sort
            ))
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query("UPDATE clips SET sort_order = ? WHERE uuid = ?")
                .bind(target_sort + 1)
                .bind(&clip_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            // Moving clip forward: shift (target_sort, clip_sort] down by 1, then shift (target_sort, ∞) up...
            // Actually: shift everything > target_sort up by 1, then set clip to target_sort + 1
            // But we need to account for the clip's old position being vacated
            // Simplest: shift (target_sort, ∞) up by 1, set clip to target_sort + 1
            sqlx::query(&format!(
                "UPDATE clips SET sort_order = sort_order + 1 WHERE {} AND sort_order > {}",
                folder_sub, target_sort
            ))
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
            sqlx::query("UPDATE clips SET sort_order = ? WHERE uuid = ?")
                .bind(target_sort + 1)
                .bind(&clip_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn create_folder(
    name: String,
    icon: Option<String>,
    color: Option<String>,
    db: tauri::State<'_, Arc<Database>>,
    window: tauri::WebviewWindow,
) -> Result<FolderItem, String> {
    let pool = &db.pool;

    // Check if folder with same name exists (excluding system folders if we wanted, but name uniqueness is good generally)
    let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM folders WHERE name = ?")
        .bind(&name)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if exists.is_some() {
        return Err("A folder with this name already exists".to_string());
    }

    let id = sqlx::query(r#"INSERT INTO folders (name, icon, color) VALUES (?, ?, ?)"#)
        .bind(&name)
        .bind(icon.as_ref())
        .bind(color.as_ref())
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    let _ = window.emit("clipboard-change", ());

    Ok(FolderItem {
        id: id.to_string(),
        name,
        icon,
        color,
        is_system: false,
        item_count: 0,
    })
}

#[tauri::command]
pub async fn delete_folder(
    id: String,
    db: tauri::State<'_, Arc<Database>>,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    let pool = &db.pool;

    let folder_id: i64 = id.parse().map_err(|_| "Invalid folder ID")?;
    sqlx::query(r#"DELETE FROM folders WHERE id = ?"#)
        .bind(folder_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    let _ = window.emit("clipboard-change", ());
    Ok(())
}

#[tauri::command]
pub async fn rename_folder(
    id: String,
    name: String,
    icon: Option<String>,
    color: Option<String>,
    db: tauri::State<'_, Arc<Database>>,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    let pool = &db.pool;

    let folder_id: i64 = id.parse().map_err(|_| "Invalid folder ID")?;

    // Check availability
    let exists: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM folders WHERE name = ? AND id != ?")
            .bind(&name)
            .bind(folder_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    if exists.is_some() {
        return Err("A folder with this name already exists".to_string());
    }

    sqlx::query(r#"UPDATE folders SET name = ?, icon = ?, color = ? WHERE id = ?"#)
        .bind(name)
        .bind(icon)
        .bind(color)
        .bind(folder_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Emit event so main window knows to refresh
    let _ = window.emit("clipboard-change", ());
    Ok(())
}

#[tauri::command]
pub async fn search_clips(
    query: String,
    filter_id: Option<String>,
    limit: i64,
    offset: i64,
    db: tauri::State<'_, Arc<Database>>,
) -> Result<Vec<ClipboardItem>, String> {
    let pool = &db.pool;
    let started = Instant::now();

    let search_pattern = format!("%{}%", query);

    let sql_started = Instant::now();
    let clips: Vec<Clip> = match filter_id.as_deref() {
        Some(id) => {
            let folder_id_num = id.parse::<i64>().ok();
            if let Some(numeric_id) = folder_id_num {
                sqlx::query_as(r#"
                    SELECT * FROM clips WHERE is_deleted = 0 AND folder_id = ? AND (text_preview LIKE ? OR content LIKE ?)
                    ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?
                "#)
                .bind(numeric_id)
                .bind(&search_pattern)
                .bind(&search_pattern)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool).await.map_err(|e| e.to_string())?
            } else {
                Vec::new()
            }
        }
        None => sqlx::query_as(
            r#"
                SELECT * FROM clips WHERE is_deleted = 0 AND folder_id IS NULL AND (text_preview LIKE ? OR content LIKE ?)
                ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?
            "#,
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?,
    };
    let sql_ms = sql_started.elapsed().as_millis();

    // Batch fetch image paths
    let mut image_path_map: HashMap<String, String> = HashMap::new();
    let image_uuids: Vec<String> = clips
        .iter()
        .filter(|c| c.clip_type == "image")
        .map(|c| c.uuid.clone())
        .collect();

    if !image_uuids.is_empty() {
        let placeholders: Vec<String> = image_uuids.iter().map(|_| "?".to_string()).collect();
        let query = format!(
            "SELECT clip_uuid, file_path FROM clip_images WHERE clip_uuid IN ({})",
            placeholders.join(",")
        );

        let mut query_builder = sqlx::query_as::<_, (String, Option<String>)>(&query);
        for uuid in &image_uuids {
            query_builder = query_builder.bind(uuid);
        }

        let results = query_builder
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;
        for (uuid, path) in results {
            if let Some(p) = path {
                if !p.is_empty() {
                    image_path_map.insert(uuid, p);
                }
            }
        }
    }

    let image_rows = image_uuids.len();
    let raw_bytes: usize = clips.iter().map(|clip| clip.content.len()).sum();
    let map_started = Instant::now();
    let items: Vec<ClipboardItem> = clips
        .iter()
        .map(|clip| {
            clip_to_list_item(
                clip,
                image_path_map.get(&clip.uuid).map(|s| s.as_str()),
                true,
            )
        })
        .collect();
    let map_ms = map_started.elapsed().as_millis();
    let total_ms = started.elapsed().as_millis();
    log::info!(
        "[perf][search_clips] sql_ms={} map_ms={} total_ms={} rows={} images={} raw_bytes={} filter_id={:?} offset={} limit={}",
        sql_ms,
        map_ms,
        total_ms,
        clips.len(),
        image_rows,
        raw_bytes,
        filter_id,
        offset,
        limit
    );

    Ok(items)
}

#[tauri::command]
pub async fn get_folders(db: tauri::State<'_, Arc<Database>>) -> Result<Vec<FolderItem>, String> {
    let pool = &db.pool;

    let folders: Vec<Folder> = sqlx::query_as(r#"SELECT * FROM folders ORDER BY created_at"#)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Get counts for all folders in one query
    let counts: Vec<(i64, i64)> = sqlx::query_as(
        r#"
        SELECT folder_id, COUNT(*) as count
        FROM clips
        WHERE is_deleted = 0 AND folder_id IS NOT NULL
        GROUP BY folder_id
    "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Create a map for easier lookup
    let count_map: HashMap<i64, i64> = counts.into_iter().collect();

    let items: Vec<FolderItem> = folders
        .iter()
        .map(|folder| FolderItem {
            id: folder.id.to_string(),
            name: folder.name.clone(),
            icon: folder.icon.clone(),
            color: folder.color.clone(),
            is_system: folder.is_system,
            item_count: *count_map.get(&folder.id).unwrap_or(&0),
        })
        .collect();

    //println!("folder items: {:#?}", items);

    Ok(items)
}

#[tauri::command]
pub fn hide_window(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() == "main" {
        crate::animate_window_hide(&window, None);
        Ok(())
    } else {
        window.hide().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn ping() -> Result<String, String> {
    Ok("pong".to_string())
}

#[tauri::command]
pub fn test_log() -> Result<String, String> {
    log::trace!("[TEST] Trace level log");
    log::debug!("[TEST] Debug level log");
    log::info!("[TEST] Info level log");
    log::warn!("[TEST] Warn level log");
    log::error!("[TEST] Error level log");
    Ok("Logs emitted - check console".to_string())
}

#[tauri::command]
pub async fn get_clipboard_history_size(
    db: tauri::State<'_, Arc<Database>>,
) -> Result<i64, String> {
    let pool = &db.pool;

    let count: i64 =
        sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM clips WHERE is_deleted = 0 AND folder_id IS NULL"#)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub async fn get_db_size(db: tauri::State<'_, Arc<Database>>) -> Result<i64, String> {
    let pool = &db.pool;
    let page_count: i64 = sqlx::query_scalar::<_, i64>("PRAGMA page_count")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    let page_size: i64 = sqlx::query_scalar::<_, i64>("PRAGMA page_size")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(page_count * page_size)
}

#[tauri::command]
pub async fn get_clip_stats(
    db: tauri::State<'_, Arc<Database>>,
) -> Result<serde_json::Value, String> {
    let pool = &db.pool;

    let row = sqlx::query(
        r#"SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN clip_type = 'image' THEN 1 ELSE 0 END) as images,
            SUM(CASE WHEN clip_type = 'text' THEN 1 ELSE 0 END) as text,
            SUM(CASE WHEN clip_type = 'file' THEN 1 ELSE 0 END) as files,
            SUM(CASE WHEN clip_type = 'html' THEN 1 ELSE 0 END) as html,
            SUM(CASE WHEN clip_type = 'rtf' THEN 1 ELSE 0 END) as rtf
         FROM clips WHERE is_deleted = 0 AND folder_id IS NULL"#,
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let total: i64 = row.get(0);
    let images: i64 = row.get(1);
    let text: i64 = row.get(2);
    let files: i64 = row.get(3);
    let html: i64 = row.get(4);
    let rtf: i64 = row.get(5);

    Ok(serde_json::json!({
        "total": total,
        "images": images,
        "text": text,
        "files": files,
        "html": html,
        "rtf": rtf
    }))
}

#[tauri::command]
pub async fn clear_clipboard_history(db: tauri::State<'_, Arc<Database>>) -> Result<(), String> {
    let pool = &db.pool;

    sqlx::query(r#"DELETE FROM clips WHERE is_deleted = 1"#)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    cleanup_orphan_clip_image_files(pool).await?;
    Ok(())
}

#[tauri::command]
pub async fn clear_all_clips(db: tauri::State<'_, Arc<Database>>) -> Result<(), String> {
    let pool = &db.pool;

    // Only delete clips NOT in folders - folders are always safe
    let orphan_uuids: Vec<String> =
        sqlx::query_scalar(r#"SELECT uuid FROM clips WHERE folder_id IS NULL"#)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    // Clean up image files for orphan clips
    for uuid in &orphan_uuids {
        delete_clip_image_file_by_uuid(pool, uuid).await?;
    }

    // Delete clip_images for orphan clips
    if !orphan_uuids.is_empty() {
        let placeholders: Vec<String> = orphan_uuids.iter().map(|_| "?".to_string()).collect();
        let query = format!(
            "DELETE FROM clip_images WHERE clip_uuid IN ({})",
            placeholders.join(",")
        );
        let mut qb = sqlx::query(&query);
        for uuid in &orphan_uuids {
            qb = qb.bind(uuid);
        }
        qb.execute(pool).await.map_err(|e| e.to_string())?;
    }

    // Delete orphan clips
    sqlx::query(r#"DELETE FROM clips WHERE folder_id IS NULL"#)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_duplicate_clips(db: tauri::State<'_, Arc<Database>>) -> Result<i64, String> {
    let pool = &db.pool;

    let result = sqlx::query(
        r#"
        DELETE FROM clips
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM clips
            GROUP BY content_hash
        )
    "#,
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    cleanup_orphan_clip_image_files(pool).await?;

    Ok(result.rows_affected() as i64)
}

#[tauri::command]
pub async fn register_global_shortcut(
    hotkey: String,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::ShortcutState;

    let app = window.app_handle();
    let shortcut = Shortcut::from_str(&hotkey).map_err(|e| format!("Invalid hotkey: {:?}", e))?;

    if let Err(e) = app.global_shortcut().unregister_all() {
        log::warn!("Failed to unregister existing shortcuts: {:?}", e);
    }

    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let win_clone = main_window.clone();
    if let Err(e) = app
        .global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if win_clone.is_visible().unwrap_or(false)
                    && win_clone.is_focused().unwrap_or(false)
                {
                    crate::animate_window_hide(&win_clone, None);
                } else {
                    // Capture the foreground window before showing CyberPaste
                    unsafe {
                        let fg = windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow();
                        crate::TARGET_FOREGROUND_HND
                            .store(fg.0 as *mut (), std::sync::atomic::Ordering::Relaxed);
                    }
                    crate::position_window_at_bottom(&win_clone);
                }
            }
        })
    {
        return Err(format!("Failed to register hotkey: {:?}", e));
    }

    log::info!("Registered global shortcut: {}", hotkey);
    Ok(())
}

#[tauri::command]
pub async fn refresh_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let win_for_show = win.clone();
        crate::animate_window_hide(
            &win,
            Some(Box::new(move || {
                crate::position_window_at_bottom(&win_for_show);
            })),
        );
    }
    Ok(())
}

#[tauri::command]
pub async fn focus_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        if let Err(e) = window.unminimize() {
            log::warn!("Failed to unminimize window {}: {:?}", label, e);
        }
        if let Err(e) = window.show() {
            log::warn!("Failed to show window {}: {:?}", label, e);
        }
        if let Err(e) = window.set_focus() {
            log::warn!("Failed to focus window {}: {:?}", label, e);
        }

        Ok(())
    } else {
        Err(format!("Window {} not found", label))
    }
}

#[tauri::command]
pub fn show_window(window: tauri::WebviewWindow) -> Result<(), String> {
    crate::position_window_at_bottom(&window);
    Ok(())
}

#[tauri::command]
pub async fn pick_file(
    app: AppHandle,
    filter_name: Option<String>,
    extensions: Option<Vec<String>>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();

    if let (Some(name), Some(exts)) = (filter_name, extensions) {
        if !exts.is_empty() {
            let ext_refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&name, &ext_refs);
        }
    } else {
        // Default: all files
        dialog = dialog.add_filter("All Files", &["*"]);
    }

    let file_path = dialog.blocking_pick_file();

    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
pub fn get_layout_config() -> serde_json::Value {
    serde_json::json!({
        "window_height": crate::constants::WINDOW_HEIGHT,
    })
}

#[tauri::command]
pub async fn toggle_view_mode(
    app: AppHandle,
    window: tauri::WebviewWindow,
) -> Result<String, String> {
    let manager = app.state::<Arc<SettingsManager>>();
    let mut settings = manager.get();

    let current_mode = settings.view_mode.clone();
    let cur_w = settings.window_width;
    let cur_h = settings.window_height;

    let new_mode = if current_mode == "full" {
        // Save current size as full view size
        settings.full_window_width = if cur_w > 100.0 { cur_w } else { 550.0 };
        settings.full_window_height = if cur_h > 100.0 {
            cur_h
        } else {
            crate::constants::FULL_HEIGHT
        };

        // Restore compact view size
        settings.window_width = if settings.compact_window_width > 100.0 {
            settings.compact_window_width
        } else {
            crate::constants::COMPACT_WIDTH
        };
        settings.window_height = if settings.compact_window_height > 100.0 {
            settings.compact_window_height
        } else {
            crate::constants::COMPACT_HEIGHT
        };
        "compact".to_string()
    } else {
        // Save current size as compact view size
        settings.compact_window_width = if cur_w > 100.0 {
            cur_w
        } else {
            crate::constants::COMPACT_WIDTH
        };
        settings.compact_window_height = if cur_h > 100.0 {
            cur_h
        } else {
            crate::constants::COMPACT_HEIGHT
        };

        // Restore full view size
        settings.window_width = if settings.full_window_width > 100.0 {
            settings.full_window_width
        } else {
            550.0
        };
        settings.window_height = if settings.full_window_height > 100.0 {
            settings.full_window_height
        } else {
            crate::constants::FULL_HEIGHT
        };
        "full".to_string()
    };

    settings.view_mode = new_mode.clone();
    manager.save(settings.clone())?;

    // Reposition window based on new mode
    crate::animate_window_show(&window);

    // Notify frontend that settings changed
    let _ = app.emit("settings-changed", manager.get());

    Ok(new_mode)
}

#[tauri::command]
pub async fn reset_window_size(app: AppHandle, window: tauri::WebviewWindow) -> Result<(), String> {
    let manager = app.state::<Arc<SettingsManager>>();
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .ok_or("No monitor found")?;
    let scale_factor = monitor.scale_factor();
    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let work_area = monitor.work_area();

    let settings = manager.get();
    let is_full = settings.view_mode == "full";
    let is_mica = settings.mica_effect != "clear";
    let no_corners = !settings.round_corners;
    let side_margin = if is_mica && no_corners {
        0.0
    } else {
        crate::constants::WINDOW_MARGIN
    };
    let bottom_margin = if is_mica && no_corners {
        0.0
    } else {
        crate::constants::WINDOW_MARGIN
    };
    let float_above_taskbar = settings.float_above_taskbar;

    let (default_w, default_h) = if is_full {
        let logical_wa_width = work_area.size.width as f64 / scale_factor;
        (
            logical_wa_width - side_margin * 2.0,
            crate::constants::FULL_HEIGHT,
        )
    } else {
        (
            crate::constants::COMPACT_WIDTH,
            crate::constants::COMPACT_HEIGHT,
        )
    };

    manager
        .update(|s| {
            s.window_width = default_w;
            s.window_height = default_h;
            if is_full {
                s.full_window_width = default_w;
                s.full_window_height = default_h;
            } else {
                s.compact_window_width = default_w;
                s.compact_window_height = default_h;
            }
        })
        .await?;

    if is_full {
        let new_height_px = (default_h * scale_factor) as u32;
        let new_width_px = work_area.size.width - ((side_margin * scale_factor) as u32 * 2);
        let side_margin_px = (side_margin * scale_factor) as i32;
        let bottom_margin_px = (bottom_margin * scale_factor) as i32;

        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: new_width_px,
            height: new_height_px,
        }));

        let reference_bottom = if float_above_taskbar {
            monitor_pos.y + monitor_size.height as i32
        } else {
            work_area.position.y + work_area.size.height as i32
        };

        let target_x = work_area.position.x + side_margin_px;
        let target_y = reference_bottom - new_height_px as i32 - bottom_margin_px;

        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: target_x,
            y: target_y,
        }));
    } else {
        let new_width_px = (default_w * scale_factor) as u32;
        let new_height_px = (default_h * scale_factor) as u32;

        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: new_width_px,
            height: new_height_px,
        }));

        // Center on monitor, clamped to monitor borders
        let target_x = (monitor_pos.x + (monitor_size.width as i32 - new_width_px as i32) / 2)
            .clamp(
                monitor_pos.x,
                monitor_pos.x + monitor_size.width as i32 - new_width_px as i32,
            );
        let target_y = (monitor_pos.y + (monitor_size.height as i32 - new_height_px as i32) / 2)
            .clamp(
                monitor_pos.y,
                monitor_pos.y + monitor_size.height as i32 - new_height_px as i32,
            );

        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: target_x,
            y: target_y,
        }));
    }

    Ok(())
}
#[tauri::command]
pub async fn export_backup(
    db: tauri::State<'_, Arc<Database>>,
    app: AppHandle,
) -> Result<crate::models::BackupData, String> {
    let pool = &db.pool;

    let clips: Vec<crate::models::Clip> = sqlx::query_as("SELECT * FROM clips")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let folders: Vec<crate::models::Folder> = sqlx::query_as("SELECT * FROM folders")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut clip_images: Vec<crate::models::ClipImage> =
        sqlx::query_as("SELECT * FROM clip_images")
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    // Physically read image files to make the backup portable
    for img in &mut clip_images {
        if img.storage_kind == "file" {
            if let Some(path) = &img.file_path {
                if let Ok(bytes) = crate::clipboard::read_full_image_file(path) {
                    img.full_content = bytes;
                }
            }
        }
    }

    let manager = app.state::<Arc<SettingsManager>>();
    let settings = manager.get();

    Ok(crate::models::BackupData {
        version: "1.0.1".to_string(),
        clips,
        folders,
        clip_images,
        settings,
    })
}

#[tauri::command]
pub async fn import_backup(
    data: crate::models::BackupData,
    db: tauri::State<'_, Arc<Database>>,
    app: AppHandle,
) -> Result<(), String> {
    let pool = &db.pool;

    // Use a transaction for maximum safety
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Clear current data
    sqlx::query("DELETE FROM clips")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM folders")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM clip_images")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 2. Restore Folders
    for folder in data.folders {
        sqlx::query("INSERT INTO folders (id, name, icon, color, is_system, created_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(folder.id)
            .bind(folder.name)
            .bind(folder.icon)
            .bind(folder.color)
            .bind(folder.is_system)
            .bind(folder.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // 3. Restore Clips
    for clip in data.clips {
        sqlx::query("INSERT INTO clips (uuid, clip_type, content, text_preview, content_hash, folder_id, is_deleted, is_thumbnail, source_app, source_icon, metadata, sort_order, created_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(clip.uuid)
            .bind(clip.clip_type)
            .bind(clip.content)
            .bind(clip.text_preview)
            .bind(clip.content_hash)
            .bind(clip.folder_id)
            .bind(clip.is_deleted)
            .bind(clip.is_thumbnail)
            .bind(clip.source_app)
            .bind(clip.source_icon)
            .bind(clip.metadata)
            .bind(clip.sort_order)
            .bind(clip.created_at)
            .bind(clip.last_accessed)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // 4. Restore Images (Save them back to files to keep the optimization)
    for img in data.clip_images {
        let mut final_storage_kind = img.storage_kind.clone();
        let mut final_file_path = img.file_path.clone();

        if !img.full_content.is_empty() {
            // Re-persist to file if it was originally a file
            if let Ok(path) =
                crate::clipboard::persist_full_image_file(&img.clip_uuid, &img.full_content)
            {
                final_file_path = Some(path);
                final_storage_kind = "file".to_string();
            }
        }

        sqlx::query("INSERT INTO clip_images (clip_uuid, full_content, file_path, file_size, storage_kind, mime_type, created_at) VALUES (?, x'', ?, ?, ?, ?, ?)")
            .bind(img.clip_uuid)
            .bind(final_file_path)
            .bind(img.file_size)
            .bind(final_storage_kind)
            .bind(img.mime_type)
            .bind(img.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    // 5. Restore Settings
    let manager = app.state::<Arc<SettingsManager>>();
    manager.save(data.settings).map_err(|e| e.to_string())?;

    // 6. Notify main window to refresh
    let _ = app.emit("clipboard-change", ());
    let _ = app.emit("settings-changed", manager.get());

    Ok(())
}

#[tauri::command]
pub async fn export_backup_to_file(
    db: tauri::State<'_, Arc<Database>>,
    app: AppHandle,
) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;

    // 1. Get Backup Data
    let data = export_backup(db, app.clone()).await?;

    // 2. Open Save Dialog
    let file_path = app
        .dialog()
        .file()
        .set_title("Save CyberPaste Backup")
        .add_filter("CyberPaste Backup", &["json"])
        .set_file_name("cyberpaste_backup.json")
        .blocking_save_file();

    if let Some(path) = file_path {
        let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
        std::fs::write(path.to_string(), json).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Export cancelled".to_string())
    }
}

#[tauri::command]
pub async fn import_backup_from_file(
    db: tauri::State<'_, Arc<Database>>,
    app: AppHandle,
) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;

    // 1. Open File Dialog
    let file_path = app
        .dialog()
        .file()
        .set_title("Select CyberPaste Backup")
        .add_filter("CyberPaste Backup", &["json"])
        .blocking_pick_file();

    if let Some(path) = file_path {
        let json = std::fs::read_to_string(path.to_string()).map_err(|e| e.to_string())?;
        let data: crate::models::BackupData =
            serde_json::from_str(&json).map_err(|e| e.to_string())?;

        import_backup(data, db, app).await?;
        Ok(())
    } else {
        Err("Import cancelled".to_string())
    }
}

#[tauri::command]
pub fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

#[tauri::command]
pub fn get_data_dir_path() -> Result<String, String> {
    let current_dir = std::env::current_dir().unwrap_or(std::path::PathBuf::from("."));
    match dirs::data_dir() {
        Some(path) => Ok(path.join("CyberPaste").to_string_lossy().to_string()),
        None => Ok(current_dir.join("CyberPaste").to_string_lossy().to_string()),
    }
}

#[tauri::command]
pub fn open_with(app_path: String, file_path: String) -> Result<(), String> {
    log::info!(
        "open_with called: editor='{}', file='{}'",
        app_path,
        file_path
    );
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new(app_path).arg(file_path).spawn().map_err(|e| {
            log::error!("Failed to spawn editor: {}", e);
            e.to_string()
        })?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Not supported on this OS".to_string())
    }
}

#[tauri::command]
pub fn show_item_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Not supported on this OS".to_string())
    }
}

#[tauri::command]
pub async fn update_clip_content(
    db: tauri::State<'_, Arc<Database>>,
    clip_id: String,
    new_content: String,
) -> Result<(), String> {
    let pool = &db.pool;

    // Update both content and text_preview
    sqlx::query("UPDATE clips SET content = ?, text_preview = ? WHERE uuid = ?")
        .bind(new_content.as_bytes())
        .bind(new_content.chars().take(200).collect::<String>())
        .bind(&clip_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn center_window(window: tauri::WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .ok_or("No monitor found")?;
    let _scale_factor = monitor.scale_factor();
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    let window_size = window.inner_size().map_err(|e| e.to_string())?;

    let x = monitor_pos.x + (monitor_size.width as i32 - window_size.width as i32) / 2;
    // Keep current y
    let current_pos = window.outer_position().map_err(|e| e.to_string())?;

    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x,
        y: current_pos.y,
    }));
    Ok(())
}

#[tauri::command]
pub fn play_clipboard_sound(sound_path: String) -> Result<(), String> {
    if sound_path.is_empty() {
        return Ok(());
    }

    // Use mciSendString for reliable playback of WAV and MP3
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::Media::Multimedia::mciSendStringW;

    let alias = "cyberpaste_sound";

    // Close any previous instance
    let close_cmd = format!("close {}", alias);
    let wide_close: Vec<u16> = OsStr::new(&close_cmd)
        .encode_wide()
        .chain(Some(0))
        .collect();
    unsafe {
        let _ = mciSendStringW(windows::core::PCWSTR(wide_close.as_ptr()), None, None);
    }

    let escaped_path = format!("\"{}\"", sound_path.replace('"', "\"\""));

    // Open the file with mci
    let open_cmd = format!("open {} alias {}", escaped_path, alias);
    let wide_open: Vec<u16> = OsStr::new(&open_cmd).encode_wide().chain(Some(0)).collect();
    unsafe {
        let _ = mciSendStringW(windows::core::PCWSTR(wide_open.as_ptr()), None, None);
    }

    // Play asynchronously
    let play_cmd = format!("play {} notify", alias);
    let wide_play: Vec<u16> = OsStr::new(&play_cmd).encode_wide().chain(Some(0)).collect();
    unsafe {
        let _ = mciSendStringW(windows::core::PCWSTR(wide_play.as_ptr()), None, None);
    }

    Ok(())
}

#[tauri::command]
pub fn simulate_ctrl_v() -> Result<(), String> {
    simulate_ctrl_v_internal(None);
    Ok(())
}

pub fn simulate_ctrl_v_with_target(target_hwnd: isize) {
    simulate_ctrl_v_internal(Some(target_hwnd));
}

fn simulate_ctrl_v_internal(target_hwnd: Option<isize>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VK_CONTROL, VK_V,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        IsIconic, IsWindowVisible, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOWNA,
    };

    // Restore the target window to foreground
    if let Some(hwnd_val) = target_hwnd {
        let hwnd = HWND(hwnd_val as _);
        if !hwnd.0.is_null() {
            unsafe {
                // Only change visibility if needed — don't touch maximized windows
                if IsIconic(hwnd).as_bool() {
                    let _ = ShowWindow(hwnd, SW_RESTORE);
                } else if !IsWindowVisible(hwnd).as_bool() {
                    let _ = ShowWindow(hwnd, SW_SHOWNA);
                }
                let _ = SetForegroundWindow(hwnd);
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    }

    // Small delay to ensure clipboard is ready
    std::thread::sleep(std::time::Duration::from_millis(50));

    let inputs: [INPUT; 4] = [
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_CONTROL,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: std::ptr::null::<()>() as _,
                },
            },
        },
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_V,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: std::ptr::null::<()>() as _,
                },
            },
        },
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_V,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: std::ptr::null::<()>() as _,
                },
            },
        },
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_CONTROL,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: std::ptr::null::<()>() as _,
                },
            },
        },
    ];

    unsafe {
        let _ = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

#[tauri::command]
pub async fn show_toast(
    app: AppHandle,
    message: String,
    toast_type: String,            // "success", "error", "info"
    clip_type: Option<String>,     // "text", "image", "html", "rtf", "file", "url"
    image_preview: Option<String>, // base64 encoded tiny thumbnail for images
) -> Result<(), String> {
    use crate::settings_manager::SettingsManager;
    use std::sync::Arc;
    let manager = app.state::<Arc<SettingsManager>>();
    if !manager.get().toast_enabled {
        return Ok(());
    }

    let window_label = "toast";

    // Check if toast window exists, if not create it
    let toast_window = if let Some(win) = app.get_webview_window(window_label) {
        let _ = win.set_focusable(false);
        win
    } else {
        tauri::WebviewWindowBuilder::new(
            &app,
            window_label,
            tauri::WebviewUrl::App("index.html?window=toast".into()),
        )
        .title("CyberPaste Toast")
        .inner_size(240.0, 100.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .focused(false)
        .focusable(false)
        .visible(false) // hidden until positioned
        .build()
        .map_err(|e| format!("Failed to create toast window: {}", e))?
    };

    // Emit event to update content
    #[derive(serde::Serialize, Clone)]
    struct ToastPayload {
        message: String,
        toast_type: String,
        clip_type: Option<String>,
        image_preview: Option<String>,
    }

    toast_window
        .emit(
            "update-toast",
            ToastPayload {
                message,
                toast_type,
                clip_type,
                image_preview,
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn hide_toast(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("toast") {
        let _ = win.hide();
    }
    Ok(())
}

#[tauri::command]
pub async fn set_toast_position(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("toast") {
        let manager = app.state::<Arc<SettingsManager>>();
        let position_setting = manager.get().toast_position;
        let monitor_setting = manager.get().toast_monitor;

        let available_monitors = win.available_monitors().unwrap_or_default();
        let monitor = if monitor_setting == "primary" {
            win.primary_monitor()
                .ok()
                .flatten()
                .or_else(|| win.current_monitor().ok().flatten())
        } else if let Ok(idx) = monitor_setting.parse::<usize>() {
            // "1" -> index 0, "2" -> index 1, etc.
            let zero_idx = idx.saturating_sub(1);
            available_monitors
                .get(zero_idx)
                .cloned()
                .or_else(|| win.primary_monitor().ok().flatten())
        } else {
            win.primary_monitor().ok().flatten()
        };

        if let Some(monitor) = monitor {
            let scale_factor = monitor.scale_factor();
            let work_area = monitor.work_area();

            let w_px = (width * scale_factor) as u32;
            let h_px = (height * scale_factor) as u32;
            let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: w_px,
                height: h_px,
            }));

            let margin = (24.0 * scale_factor) as i32;

            let (target_x, target_y) = match position_setting.as_str() {
                "top-right" => (
                    work_area.position.x + work_area.size.width as i32 - w_px as i32 - margin,
                    work_area.position.y + margin,
                ),
                "top-left" => (work_area.position.x + margin, work_area.position.y + margin),
                "bottom-center" => (
                    work_area.position.x + (work_area.size.width as i32 - w_px as i32) / 2,
                    work_area.position.y + work_area.size.height as i32 - h_px as i32 - margin,
                ),
                "bottom-left" => (
                    work_area.position.x + margin,
                    work_area.position.y + work_area.size.height as i32 - h_px as i32 - margin,
                ),
                "center-right" => (
                    work_area.position.x + work_area.size.width as i32 - w_px as i32 - margin,
                    work_area.position.y + (work_area.size.height as i32 - h_px as i32) / 2,
                ),
                "center-left" => (
                    work_area.position.x + margin,
                    work_area.position.y + (work_area.size.height as i32 - h_px as i32) / 2,
                ),
                // default to bottom-right
                _ => (
                    work_area.position.x + work_area.size.width as i32 - w_px as i32 - margin,
                    work_area.position.y + work_area.size.height as i32 - h_px as i32 - margin,
                ),
            };
            let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: target_x,
                y: target_y,
            }));
            let _ = win.show();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn open_image_viewer(app: AppHandle, clip_id: String) -> Result<(), String> {
    log::info!("open_image_viewer called for clip_id: {}", clip_id);
    let window_label = "image_viewer";
    if let Some(win) = app.get_webview_window(window_label) {
        log::info!("Reusing existing image-viewer window");
        win.emit("update-viewer-clip", clip_id).ok();
        win.unminimize().ok();
        win.show().ok();
        win.set_focus().ok();
        win.set_always_on_top(true).ok();
        return Ok(());
    }

    log::info!("Creating new image-viewer window");
    let manager = app.state::<Arc<crate::settings_manager::SettingsManager>>();
    let settings = manager.get();

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::App(format!("index.html?clip_id={}", clip_id).into()),
    )
    .title("CyberPaste Viewer")
    .inner_size(settings.viewer_window_width, settings.viewer_window_height)
    .min_inner_size(300.0, 200.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .shadow(true)
    .visible(false);

    if let (Some(x), Some(y)) = (settings.viewer_window_x, settings.viewer_window_y) {
        builder = builder.position(x as f64, y as f64);
    }

    let win = builder.build().map_err(|e| {
        log::error!("Failed to build image-viewer window: {}", e);
        e.to_string()
    })?;

    // Apply theme and effects immediately to avoid white flash
    let mica_effect = settings.mica_effect.clone();
    let current_theme = if settings.theme == "dark" {
        tauri::Theme::Dark
    } else if settings.theme == "light" {
        tauri::Theme::Light
    } else {
        // Default to dark for the viewer if system theme is uncertain during build
        tauri::Theme::Dark
    };
    let round_corners = settings.round_corners;
    crate::apply_window_effect(&win, &mica_effect, &current_theme, round_corners);

    // Fail-safe: Show window from Rust side after a small delay to ensure it appears
    // even if JS fails to call show() on the first boot.
    let win_clone = win.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        let _ = win_clone.show();
        let _ = win_clone.set_focus();
    });

    Ok(())
}
