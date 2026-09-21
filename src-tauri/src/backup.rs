use crate::clipboard;
use crate::models::{AppSettings, BackupData, Clip, ClipImage, Folder};
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime};
use sqlx::SqlitePool;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::time::{self, Duration};

pub const BACKUP_VERSION: &str = "1.1.0";
const BACKUP_PREFIX: &str = "CyberPaste Backup ";
const BACKUP_TIMESTAMP_FORMAT: &str = "%Y-%m-%d_%H-%M-%S";
const MIN_RETENTION: i64 = 1;
const MAX_RETENTION: i64 = 20;
static AUTOMATIC_BACKUP_RUNNING: AtomicBool = AtomicBool::new(false);

pub fn default_backup_dir() -> PathBuf {
    crate::get_data_dir().join("Backups")
}

pub fn resolve_backup_dir(settings: &AppSettings) -> PathBuf {
    let configured = settings.auto_backup_folder.trim();
    if configured.is_empty() {
        default_backup_dir()
    } else {
        PathBuf::from(configured)
    }
}

pub fn normalize_retention(value: i64) -> usize {
    value.clamp(MIN_RETENTION, MAX_RETENTION) as usize
}

pub fn backup_file_name(now: DateTime<Local>) -> String {
    format!(
        "{}{}.json",
        BACKUP_PREFIX,
        now.format(BACKUP_TIMESTAMP_FORMAT)
    )
}

fn backup_timestamp_from_name(name: &str) -> Option<NaiveDateTime> {
    let stem = name.strip_suffix(".json")?;
    let timestamp = stem.strip_prefix(BACKUP_PREFIX)?;
    if timestamp.len() < 19 {
        return None;
    }

    let parsed = NaiveDateTime::parse_from_str(&timestamp[..19], BACKUP_TIMESTAMP_FORMAT).ok()?;
    let suffix = &timestamp[19..];
    if suffix.is_empty()
        || (suffix.len() >= 4
            && suffix.starts_with(" (")
            && suffix.ends_with(')')
            && suffix[2..suffix.len() - 1]
                .chars()
                .all(|character| character.is_ascii_digit()))
    {
        Some(parsed)
    } else {
        None
    }
}

pub fn is_automatic_backup_file(path: &Path) -> bool {
    path.is_file()
        && path
            .file_name()
            .and_then(|name| name.to_str())
            .and_then(backup_timestamp_from_name)
            .is_some()
}

fn next_backup_path(directory: &Path, now: DateTime<Local>) -> PathBuf {
    let base_name = backup_file_name(now);
    let base_path = directory.join(&base_name);
    if !base_path.exists() {
        return base_path;
    }

    for suffix in 1..=999 {
        let candidate = directory.join(format!(
            "{}{} ({suffix}).json",
            BACKUP_PREFIX,
            now.format(BACKUP_TIMESTAMP_FORMAT)
        ));
        if !candidate.exists() {
            return candidate;
        }
    }

    directory.join(format!(
        "{}{} ({}).json",
        BACKUP_PREFIX,
        now.format(BACKUP_TIMESTAMP_FORMAT),
        1000_u64 + u64::from(std::process::id())
    ))
}

pub fn latest_automatic_backup_date(directory: &Path) -> Result<Option<NaiveDate>, String> {
    if !directory.exists() {
        return Ok(None);
    }

    let mut latest = None;
    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !is_automatic_backup_file(&path) {
            continue;
        }

        if let Some(timestamp) = path
            .file_name()
            .and_then(|name| name.to_str())
            .and_then(backup_timestamp_from_name)
        {
            let date = timestamp.date();
            if latest.map_or(true, |current| date > current) {
                latest = Some(date);
            }
        }
    }

    Ok(latest)
}

pub fn is_backup_due(directory: &Path, now: DateTime<Local>) -> Result<bool, String> {
    Ok(latest_automatic_backup_date(directory)? != Some(now.date_naive()))
}

pub fn prune_automatic_backups(directory: &Path, retention: usize) -> Result<usize, String> {
    let mut backups = Vec::new();
    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if let Some(timestamp) = path
            .file_name()
            .and_then(|name| name.to_str())
            .and_then(backup_timestamp_from_name)
        {
            backups.push((timestamp, path));
        }
    }

    backups.sort_by(|left, right| right.0.cmp(&left.0));
    let mut removed = 0;
    for (_, path) in backups.into_iter().skip(retention) {
        fs::remove_file(path).map_err(|error| error.to_string())?;
        removed += 1;
    }
    Ok(removed)
}

pub async fn collect_backup_data(
    pool: &SqlitePool,
    settings: &AppSettings,
) -> Result<BackupData, String> {
    let mut transaction = pool.begin().await.map_err(|error| error.to_string())?;

    let clips: Vec<Clip> = sqlx::query_as("SELECT * FROM clips")
        .fetch_all(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

    let folders: Vec<Folder> = sqlx::query_as("SELECT * FROM folders")
        .fetch_all(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

    let mut clip_images: Vec<ClipImage> = sqlx::query_as("SELECT * FROM clip_images")
        .fetch_all(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

    for image in &mut clip_images {
        if image.storage_kind == "file" {
            if let Some(path) = &image.file_path {
                image.full_content = clipboard::read_full_image_file(path).map_err(|error| {
                    format!("Could not read image {} for backup: {}", path, error)
                })?;
            } else {
                return Err(format!(
                    "Image {} is marked as file-backed but has no file path",
                    image.clip_uuid
                ));
            }
        }
    }

    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;

    let progress = crate::progress::snapshot(pool)
        .await
        .map_err(|error| error.to_string())?;

    Ok(BackupData {
        version: BACKUP_VERSION.to_string(),
        clips,
        folders,
        clip_images,
        settings: settings.clone(),
        progress: Some(progress),
    })
}

fn write_json_atomically(path: &Path, json: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Backup path has no parent directory".to_string())?;
    let temp_path = parent.join(format!(
        ".{}.tmp-{}",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("backup.json"),
        format!(
            "{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|duration| duration.as_nanos())
                .unwrap_or_default()
        )
    ));

    let result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
            .map_err(|error| error.to_string())?;
        file.write_all(json).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
        fs::rename(&temp_path, path).map_err(|error| error.to_string())?;
        Ok(())
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    result
}

pub async fn create_automatic_backup(
    pool: &SqlitePool,
    settings: &AppSettings,
) -> Result<PathBuf, String> {
    let directory = resolve_backup_dir(settings);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;

    let data = collect_backup_data(pool, settings).await?;
    let json = serde_json::to_vec_pretty(&data).map_err(|error| error.to_string())?;
    let path = next_backup_path(&directory, Local::now());

    write_json_atomically(&path, &json)?;
    prune_automatic_backups(
        &directory,
        normalize_retention(settings.auto_backup_retention),
    )?;

    Ok(path)
}

pub async fn run_automatic_backup(
    pool: &SqlitePool,
    settings: &AppSettings,
) -> Result<PathBuf, String> {
    if AUTOMATIC_BACKUP_RUNNING.swap(true, Ordering::AcqRel) {
        return Err("An automatic backup is already in progress".to_string());
    }

    let result = create_automatic_backup(pool, settings).await;
    AUTOMATIC_BACKUP_RUNNING.store(false, Ordering::Release);
    result
}

pub async fn run_scheduler(app: AppHandle, database: Arc<crate::database::Database>) {
    let mut interval = time::interval(Duration::from_secs(15 * 60));
    interval.set_missed_tick_behavior(time::MissedTickBehavior::Skip);

    loop {
        interval.tick().await;

        let manager = app.state::<Arc<crate::settings_manager::SettingsManager>>();
        let settings = manager.get();
        if !settings.auto_backup_enabled {
            continue;
        }

        let directory = resolve_backup_dir(&settings);
        match is_backup_due(&directory, Local::now()) {
            Ok(true) => match run_automatic_backup(&database.pool, &settings).await {
                Ok(path) => log::info!("Automatic backup created at {}", path.display()),
                Err(error) => log::error!("Automatic backup failed: {}", error),
            },
            Ok(false) => {}
            Err(error) => log::warn!(
                "Could not inspect automatic backup directory {}: {}",
                directory.display(),
                error
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_directory() -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!("cyberpaste-backup-test-{stamp}"))
    }

    #[test]
    fn backup_names_are_windows_safe_and_sortable() {
        let name = backup_file_name(
            chrono::NaiveDate::from_ymd_opt(2026, 9, 19)
                .unwrap()
                .and_hms_opt(7, 20, 0)
                .unwrap()
                .and_local_timezone(Local)
                .unwrap(),
        );
        assert_eq!(name, "CyberPaste Backup 2026-09-19_07-20-00.json");
        assert!(!name.contains(':'));
    }

    #[test]
    fn retention_values_are_clamped_to_a_safe_range() {
        assert_eq!(normalize_retention(0), 1);
        assert_eq!(normalize_retention(3), 3);
        assert_eq!(normalize_retention(999), 20);
    }

    #[test]
    fn backup_file_matching_rejects_unrelated_names() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        let valid = directory.join("CyberPaste Backup 2026-09-19_07-20-00.json");
        let collision = directory.join("CyberPaste Backup 2026-09-19_07-20-00-123.json");
        fs::write(&valid, b"backup").unwrap();
        fs::write(&collision, b"not a managed backup").unwrap();

        assert!(is_automatic_backup_file(&valid));
        assert!(!is_automatic_backup_file(&collision));

        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn retention_only_removes_matching_automatic_backups() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        fs::write(
            directory.join("CyberPaste Backup 2026-09-17_07-20-00.json"),
            b"old",
        )
        .unwrap();
        fs::write(
            directory.join("CyberPaste Backup 2026-09-18_07-20-00.json"),
            b"newer",
        )
        .unwrap();
        fs::write(directory.join("notes.json"), b"keep").unwrap();

        let removed = prune_automatic_backups(&directory, 1).unwrap();
        assert_eq!(removed, 1);
        assert!(!directory
            .join("CyberPaste Backup 2026-09-17_07-20-00.json")
            .exists());
        assert!(directory
            .join("CyberPaste Backup 2026-09-18_07-20-00.json")
            .exists());
        assert!(directory.join("notes.json").exists());

        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn older_backup_without_progress_remains_importable() {
        let data = BackupData {
            version: "1.0.1".to_string(),
            clips: Vec::new(),
            folders: Vec::new(),
            clip_images: Vec::new(),
            settings: AppSettings::default(),
            progress: Some(crate::progress::ProgressSnapshot::default()),
        };
        let mut value = serde_json::to_value(data).unwrap();
        value
            .as_object_mut()
            .expect("backup should serialize as an object")
            .remove("progress");

        let restored: BackupData = serde_json::from_value(value).unwrap();
        assert!(restored.progress.is_none());
    }
}
