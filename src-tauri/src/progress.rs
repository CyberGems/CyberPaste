use chrono::{Duration, Local, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Sqlite, SqlitePool, Transaction};
use std::collections::HashSet;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{AppHandle, Emitter, Manager};

use crate::settings_manager::SettingsManager;

pub const PROGRESS_SNAPSHOT_VERSION: i64 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UsageTotals {
    pub clips_captured: i64,
    pub captured_text: i64,
    pub captured_image: i64,
    pub captured_code: i64,
    pub captured_url: i64,
    pub captured_file: i64,
    pub captured_html: i64,
    pub captured_rtf: i64,
    pub pastes: i64,
    pub copies: i64,
    pub searches: i64,
    pub folders_created: i64,
    pub pins: i64,
    pub ai_actions: i64,
}

impl Default for UsageTotals {
    fn default() -> Self {
        Self {
            clips_captured: 0,
            captured_text: 0,
            captured_image: 0,
            captured_code: 0,
            captured_url: 0,
            captured_file: 0,
            captured_html: 0,
            captured_rtf: 0,
            pastes: 0,
            copies: 0,
            searches: 0,
            folders_created: 0,
            pins: 0,
            ai_actions: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageDay {
    pub activity_date: String,
    pub active_actions: i64,
    pub clips_captured: i64,
    pub pastes: i64,
    pub copies: i64,
    pub searches: i64,
    pub folders_created: i64,
    pub pins: i64,
    pub ai_actions: i64,
    pub captured_text: i64,
    pub captured_image: i64,
    pub captured_code: i64,
    pub captured_url: i64,
    pub captured_file: i64,
    pub captured_html: i64,
    pub captured_rtf: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UnlockedAchievement {
    pub achievement_id: String,
    pub unlocked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressSnapshot {
    #[serde(default = "default_snapshot_version")]
    pub version: i64,
    #[serde(default)]
    pub totals: UsageTotals,
    #[serde(default)]
    pub daily: Vec<UsageDay>,
    #[serde(default)]
    pub unlocked: Vec<UnlockedAchievement>,
}

impl Default for ProgressSnapshot {
    fn default() -> Self {
        Self {
            version: PROGRESS_SNAPSHOT_VERSION,
            totals: UsageTotals::default(),
            daily: Vec::new(),
            unlocked: Vec::new(),
        }
    }
}

fn default_snapshot_version() -> i64 {
    PROGRESS_SNAPSHOT_VERSION
}

#[derive(Debug, Clone, Serialize)]
pub struct AchievementProgress {
    pub id: String,
    pub target: i64,
    pub value: i64,
    pub unlocked: bool,
    pub unlocked_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProgressData {
    pub first_used_at: Option<String>,
    pub totals: UsageTotals,
    pub active_days: i64,
    pub current_streak: i64,
    pub achievements: Vec<AchievementProgress>,
}

#[derive(Debug, Clone)]
pub enum ProgressEvent {
    ClipCaptured { clip_type: String },
    Pasted,
    Copied,
    Searched,
    FolderCreated,
    Pinned,
    AiAction,
}

#[derive(Debug, Clone, Copy)]
enum AchievementMetric {
    ClipsCaptured,
    Pastes,
    Searches,
    FoldersCreated,
    Pins,
    AiActions,
    ActiveDays,
    AllTypes,
}

#[derive(Debug, Clone, Copy)]
struct AchievementDefinition {
    id: &'static str,
    metric: AchievementMetric,
    target: i64,
}

const ACHIEVEMENTS: &[AchievementDefinition] = &[
    AchievementDefinition {
        id: "first_clip",
        metric: AchievementMetric::ClipsCaptured,
        target: 1,
    },
    AchievementDefinition {
        id: "first_paste",
        metric: AchievementMetric::Pastes,
        target: 1,
    },
    AchievementDefinition {
        id: "clips_1000",
        metric: AchievementMetric::ClipsCaptured,
        target: 1_000,
    },
    AchievementDefinition {
        id: "clips_5000",
        metric: AchievementMetric::ClipsCaptured,
        target: 5_000,
    },
    AchievementDefinition {
        id: "clips_10000",
        metric: AchievementMetric::ClipsCaptured,
        target: 10_000,
    },
    AchievementDefinition {
        id: "clips_25000",
        metric: AchievementMetric::ClipsCaptured,
        target: 25_000,
    },
    AchievementDefinition {
        id: "pastes_100",
        metric: AchievementMetric::Pastes,
        target: 100,
    },
    AchievementDefinition {
        id: "pastes_1000",
        metric: AchievementMetric::Pastes,
        target: 1_000,
    },
    AchievementDefinition {
        id: "searches_100",
        metric: AchievementMetric::Searches,
        target: 100,
    },
    AchievementDefinition {
        id: "folders_5",
        metric: AchievementMetric::FoldersCreated,
        target: 5,
    },
    AchievementDefinition {
        id: "pins_25",
        metric: AchievementMetric::Pins,
        target: 25,
    },
    AchievementDefinition {
        id: "ai_10",
        metric: AchievementMetric::AiActions,
        target: 10,
    },
    AchievementDefinition {
        id: "active_days_7",
        metric: AchievementMetric::ActiveDays,
        target: 7,
    },
    AchievementDefinition {
        id: "active_days_30",
        metric: AchievementMetric::ActiveDays,
        target: 30,
    },
    AchievementDefinition {
        id: "active_days_100",
        metric: AchievementMetric::ActiveDays,
        target: 100,
    },
    AchievementDefinition {
        id: "active_days_365",
        metric: AchievementMetric::ActiveDays,
        target: 365,
    },
    AchievementDefinition {
        id: "all_types",
        metric: AchievementMetric::AllTypes,
        target: 7,
    },
];

#[derive(Debug, Clone, FromRow)]
struct UsageDayRow {
    activity_date: String,
    active_actions: i64,
    clips_captured: i64,
    pastes: i64,
    copies: i64,
    searches: i64,
    folders_created: i64,
    pins: i64,
    ai_actions: i64,
    captured_text: i64,
    captured_image: i64,
    captured_code: i64,
    captured_url: i64,
    captured_file: i64,
    captured_html: i64,
    captured_rtf: i64,
}

static SEARCH_THROTTLE: OnceLock<Mutex<Option<(String, std::time::Instant)>>> = OnceLock::new();

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS usage_totals (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            clips_captured INTEGER NOT NULL DEFAULT 0,
            captured_text INTEGER NOT NULL DEFAULT 0,
            captured_image INTEGER NOT NULL DEFAULT 0,
            captured_code INTEGER NOT NULL DEFAULT 0,
            captured_url INTEGER NOT NULL DEFAULT 0,
            captured_file INTEGER NOT NULL DEFAULT 0,
            captured_html INTEGER NOT NULL DEFAULT 0,
            captured_rtf INTEGER NOT NULL DEFAULT 0,
            pastes INTEGER NOT NULL DEFAULT 0,
            copies INTEGER NOT NULL DEFAULT 0,
            searches INTEGER NOT NULL DEFAULT 0,
            folders_created INTEGER NOT NULL DEFAULT 0,
            pins INTEGER NOT NULL DEFAULT 0,
            ai_actions INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("INSERT OR IGNORE INTO usage_totals (id) VALUES (1)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS usage_daily (
            activity_date TEXT PRIMARY KEY,
            active_actions INTEGER NOT NULL DEFAULT 0,
            clips_captured INTEGER NOT NULL DEFAULT 0,
            pastes INTEGER NOT NULL DEFAULT 0,
            copies INTEGER NOT NULL DEFAULT 0,
            searches INTEGER NOT NULL DEFAULT 0,
            folders_created INTEGER NOT NULL DEFAULT 0,
            pins INTEGER NOT NULL DEFAULT 0,
            ai_actions INTEGER NOT NULL DEFAULT 0,
            captured_text INTEGER NOT NULL DEFAULT 0,
            captured_image INTEGER NOT NULL DEFAULT 0,
            captured_code INTEGER NOT NULL DEFAULT 0,
            captured_url INTEGER NOT NULL DEFAULT 0,
            captured_file INTEGER NOT NULL DEFAULT 0,
            captured_html INTEGER NOT NULL DEFAULT 0,
            captured_rtf INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS achievement_unlocks (
            achievement_id TEXT PRIMARY KEY,
            unlocked_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn record_event(
    pool: &SqlitePool,
    event: ProgressEvent,
) -> Result<Vec<UnlockedAchievement>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let today = Local::now().date_naive().to_string();

    sqlx::query(
        r#"
        INSERT INTO usage_daily (activity_date, active_actions)
        VALUES (?, 1)
        ON CONFLICT(activity_date) DO UPDATE SET active_actions = active_actions + 1
        "#,
    )
    .bind(&today)
    .execute(&mut *tx)
    .await?;

    match event {
        ProgressEvent::ClipCaptured { clip_type } => {
            bump_column(&mut tx, "usage_totals", "clips_captured").await?;
            bump_column(&mut tx, "usage_daily", "clips_captured").await?;
            if let Some(column) = captured_type_column(&clip_type) {
                bump_column(&mut tx, "usage_totals", column).await?;
                bump_column(&mut tx, "usage_daily", column).await?;
            }
        }
        ProgressEvent::Pasted => {
            bump_metric(&mut tx, "pastes").await?;
        }
        ProgressEvent::Copied => {
            bump_metric(&mut tx, "copies").await?;
        }
        ProgressEvent::Searched => {
            bump_metric(&mut tx, "searches").await?;
        }
        ProgressEvent::FolderCreated => {
            bump_metric(&mut tx, "folders_created").await?;
        }
        ProgressEvent::Pinned => {
            bump_metric(&mut tx, "pins").await?;
        }
        ProgressEvent::AiAction => {
            bump_metric(&mut tx, "ai_actions").await?;
        }
    }

    let unlocked = unlock_achievements(&mut tx).await?;
    tx.commit().await?;
    Ok(unlocked)
}

async fn bump_metric(tx: &mut Transaction<'_, Sqlite>, column: &str) -> Result<(), sqlx::Error> {
    bump_column(tx, "usage_totals", column).await?;
    bump_column(tx, "usage_daily", column).await
}

async fn bump_column(
    tx: &mut Transaction<'_, Sqlite>,
    table: &str,
    column: &str,
) -> Result<(), sqlx::Error> {
    let query = format!("UPDATE {table} SET {column} = {column} + 1 WHERE ");
    let query = if table == "usage_totals" {
        format!("{query}id = 1")
    } else {
        format!("{query}activity_date = ?")
    };
    let mut statement = sqlx::query(&query);
    if table == "usage_daily" {
        statement = statement.bind(Local::now().date_naive().to_string());
    }
    statement.execute(&mut **tx).await?;
    Ok(())
}

fn captured_type_column(clip_type: &str) -> Option<&'static str> {
    match clip_type {
        "text" => Some("captured_text"),
        "image" => Some("captured_image"),
        "code" => Some("captured_code"),
        "url" => Some("captured_url"),
        "file" => Some("captured_file"),
        "html" => Some("captured_html"),
        "rtf" => Some("captured_rtf"),
        _ => None,
    }
}

async fn load_totals<'e, E>(executor: E) -> Result<UsageTotals, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = Sqlite>,
{
    sqlx::query_as::<_, UsageTotals>("SELECT clips_captured, captured_text, captured_image, captured_code, captured_url, captured_file, captured_html, captured_rtf, pastes, copies, searches, folders_created, pins, ai_actions FROM usage_totals WHERE id = 1")
        .fetch_one(executor)
        .await
}

async fn unlock_achievements(
    tx: &mut Transaction<'_, Sqlite>,
) -> Result<Vec<UnlockedAchievement>, sqlx::Error> {
    let totals = load_totals(&mut **tx).await?;
    let active_days: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM usage_daily WHERE active_actions > 0")
            .fetch_one(&mut **tx)
            .await?;
    let existing: HashSet<String> =
        sqlx::query_scalar("SELECT achievement_id FROM achievement_unlocks")
            .fetch_all(&mut **tx)
            .await?
            .into_iter()
            .collect();
    let all_types = [
        totals.captured_text,
        totals.captured_image,
        totals.captured_code,
        totals.captured_url,
        totals.captured_file,
        totals.captured_html,
        totals.captured_rtf,
    ]
    .iter()
    .filter(|count| **count > 0)
    .count() as i64;

    let mut unlocked = Vec::new();
    for definition in ACHIEVEMENTS {
        if existing.contains(definition.id) {
            continue;
        }
        let value = achievement_value(definition.metric, &totals, active_days, all_types);
        if value < definition.target {
            continue;
        }
        let unlocked_at = Utc::now().to_rfc3339();
        let result = sqlx::query(
            "INSERT OR IGNORE INTO achievement_unlocks (achievement_id, unlocked_at) VALUES (?, ?)",
        )
        .bind(definition.id)
        .bind(&unlocked_at)
        .execute(&mut **tx)
        .await?;
        if result.rows_affected() > 0 {
            unlocked.push(UnlockedAchievement {
                achievement_id: definition.id.to_string(),
                unlocked_at,
            });
        }
    }
    Ok(unlocked)
}

fn achievement_value(
    metric: AchievementMetric,
    totals: &UsageTotals,
    active_days: i64,
    all_types: i64,
) -> i64 {
    match metric {
        AchievementMetric::ClipsCaptured => totals.clips_captured,
        AchievementMetric::Pastes => totals.pastes,
        AchievementMetric::Searches => totals.searches,
        AchievementMetric::FoldersCreated => totals.folders_created,
        AchievementMetric::Pins => totals.pins,
        AchievementMetric::AiActions => totals.ai_actions,
        AchievementMetric::ActiveDays => active_days,
        AchievementMetric::AllTypes => all_types,
    }
}

pub async fn snapshot(pool: &SqlitePool) -> Result<ProgressSnapshot, sqlx::Error> {
    let totals = load_totals(pool).await?;
    let daily_rows: Vec<UsageDayRow> = sqlx::query_as(
        r#"
        SELECT activity_date, active_actions, clips_captured, pastes, copies,
               searches, folders_created, pins, ai_actions,
               captured_text, captured_image, captured_code, captured_url,
               captured_file, captured_html, captured_rtf
        FROM usage_daily
        ORDER BY activity_date ASC
        "#,
    )
    .fetch_all(pool)
    .await?;
    let unlocked = sqlx::query_as::<_, UnlockedAchievement>(
        "SELECT achievement_id, unlocked_at FROM achievement_unlocks ORDER BY unlocked_at ASC",
    )
    .fetch_all(pool)
    .await?;

    Ok(ProgressSnapshot {
        version: PROGRESS_SNAPSHOT_VERSION,
        totals,
        daily: daily_rows
            .into_iter()
            .map(|row| UsageDay {
                activity_date: row.activity_date,
                active_actions: row.active_actions,
                clips_captured: row.clips_captured,
                pastes: row.pastes,
                copies: row.copies,
                searches: row.searches,
                folders_created: row.folders_created,
                pins: row.pins,
                ai_actions: row.ai_actions,
                captured_text: row.captured_text,
                captured_image: row.captured_image,
                captured_code: row.captured_code,
                captured_url: row.captured_url,
                captured_file: row.captured_file,
                captured_html: row.captured_html,
                captured_rtf: row.captured_rtf,
            })
            .collect(),
        unlocked,
    })
}

pub async fn progress_data(
    pool: &SqlitePool,
    first_used_at: Option<String>,
) -> Result<ProgressData, sqlx::Error> {
    let snapshot = snapshot(pool).await?;
    let active_days = snapshot
        .daily
        .iter()
        .filter(|day| day.active_actions > 0)
        .count() as i64;
    let current_streak = calculate_current_streak(&snapshot.daily);
    let unlocked_by_id: std::collections::HashMap<_, _> = snapshot
        .unlocked
        .iter()
        .map(|item| (item.achievement_id.as_str(), item.unlocked_at.clone()))
        .collect();
    let all_types = [
        snapshot.totals.captured_text,
        snapshot.totals.captured_image,
        snapshot.totals.captured_code,
        snapshot.totals.captured_url,
        snapshot.totals.captured_file,
        snapshot.totals.captured_html,
        snapshot.totals.captured_rtf,
    ]
    .iter()
    .filter(|count| **count > 0)
    .count() as i64;

    let achievements = ACHIEVEMENTS
        .iter()
        .map(|definition| {
            let value =
                achievement_value(definition.metric, &snapshot.totals, active_days, all_types);
            AchievementProgress {
                id: definition.id.to_string(),
                target: definition.target,
                value,
                unlocked: unlocked_by_id.contains_key(definition.id),
                unlocked_at: unlocked_by_id.get(definition.id).cloned(),
            }
        })
        .collect();

    Ok(ProgressData {
        first_used_at,
        totals: snapshot.totals,
        active_days,
        current_streak,
        achievements,
    })
}

fn calculate_current_streak(days: &[UsageDay]) -> i64 {
    let active: HashSet<String> = days
        .iter()
        .filter(|day| day.active_actions > 0)
        .map(|day| day.activity_date.clone())
        .collect();
    let today = Local::now().date_naive();
    let mut cursor = today;
    if !active.contains(&cursor.to_string()) {
        cursor -= Duration::days(1);
    }

    let mut streak = 0;
    while active.contains(&cursor.to_string()) {
        streak += 1;
        cursor -= Duration::days(1);
    }
    streak
}

pub async fn reset(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE usage_totals SET
            clips_captured = 0,
            captured_text = 0,
            captured_image = 0,
            captured_code = 0,
            captured_url = 0,
            captured_file = 0,
            captured_html = 0,
            captured_rtf = 0,
            pastes = 0,
            copies = 0,
            searches = 0,
            folders_created = 0,
            pins = 0,
            ai_actions = 0
        WHERE id = 1
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query("DELETE FROM usage_daily").execute(pool).await?;
    sqlx::query("DELETE FROM achievement_unlocks")
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn restore_snapshot(
    tx: &mut Transaction<'_, Sqlite>,
    snapshot: &ProgressSnapshot,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE usage_totals SET
            clips_captured = ?,
            captured_text = ?,
            captured_image = ?,
            captured_code = ?,
            captured_url = ?,
            captured_file = ?,
            captured_html = ?,
            captured_rtf = ?,
            pastes = ?,
            copies = ?,
            searches = ?,
            folders_created = ?,
            pins = ?,
            ai_actions = ?
        WHERE id = 1
        "#,
    )
    .bind(snapshot.totals.clips_captured)
    .bind(snapshot.totals.captured_text)
    .bind(snapshot.totals.captured_image)
    .bind(snapshot.totals.captured_code)
    .bind(snapshot.totals.captured_url)
    .bind(snapshot.totals.captured_file)
    .bind(snapshot.totals.captured_html)
    .bind(snapshot.totals.captured_rtf)
    .bind(snapshot.totals.pastes)
    .bind(snapshot.totals.copies)
    .bind(snapshot.totals.searches)
    .bind(snapshot.totals.folders_created)
    .bind(snapshot.totals.pins)
    .bind(snapshot.totals.ai_actions)
    .execute(&mut **tx)
    .await?;

    sqlx::query("DELETE FROM usage_daily")
        .execute(&mut **tx)
        .await?;
    sqlx::query("DELETE FROM achievement_unlocks")
        .execute(&mut **tx)
        .await?;

    for day in &snapshot.daily {
        sqlx::query(
            r#"
            INSERT INTO usage_daily (
                activity_date, active_actions, clips_captured, pastes, copies,
                searches, folders_created, pins, ai_actions,
                captured_text, captured_image, captured_code, captured_url,
                captured_file, captured_html, captured_rtf
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&day.activity_date)
        .bind(day.active_actions)
        .bind(day.clips_captured)
        .bind(day.pastes)
        .bind(day.copies)
        .bind(day.searches)
        .bind(day.folders_created)
        .bind(day.pins)
        .bind(day.ai_actions)
        .bind(day.captured_text)
        .bind(day.captured_image)
        .bind(day.captured_code)
        .bind(day.captured_url)
        .bind(day.captured_file)
        .bind(day.captured_html)
        .bind(day.captured_rtf)
        .execute(&mut **tx)
        .await?;
    }

    for unlock in &snapshot.unlocked {
        sqlx::query("INSERT INTO achievement_unlocks (achievement_id, unlocked_at) VALUES (?, ?)")
            .bind(&unlock.achievement_id)
            .bind(&unlock.unlocked_at)
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

pub async fn record_event_for_app(app: &AppHandle, pool: &SqlitePool, event: ProgressEvent) {
    let enabled = app
        .try_state::<Arc<SettingsManager>>()
        .map(|manager| manager.get().achievements_enabled)
        .unwrap_or(true);
    if !enabled {
        return;
    }

    match record_event(pool, event).await {
        Ok(unlocked) => {
            let _ = app.emit("achievements-updated", unlocked);
        }
        Err(error) => log::warn!("Could not record local progress: {error}"),
    }
}

pub async fn record_search_for_app(app: &AppHandle, pool: &SqlitePool) {
    let throttle = SEARCH_THROTTLE.get_or_init(|| Mutex::new(None));
    let should_record = {
        let mut last = throttle
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let now = std::time::Instant::now();
        let should = last
            .as_ref()
            .map(|(_, timestamp)| now.duration_since(*timestamp).as_millis() >= 1200)
            .unwrap_or(true);
        if should {
            *last = Some(("search".to_string(), now));
        }
        should
    };

    if should_record {
        record_event_for_app(app, pool, ProgressEvent::Searched).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn test_pool() -> SqlitePool {
        SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory SQLite should connect")
    }

    #[tokio::test]
    async fn records_unlocks_and_restores_progress() {
        let pool = test_pool().await;
        migrate(&pool)
            .await
            .expect("progress schema should migrate");

        let unlocked = record_event(
            &pool,
            ProgressEvent::ClipCaptured {
                clip_type: "text".to_string(),
            },
        )
        .await
        .expect("capture should be recorded");
        assert!(unlocked
            .iter()
            .any(|item| item.achievement_id == "first_clip"));

        record_event(&pool, ProgressEvent::Pasted)
            .await
            .expect("paste should be recorded");
        record_event(&pool, ProgressEvent::Pasted)
            .await
            .expect("second paste should be recorded");
        let snapshot_before = snapshot(&pool).await.expect("snapshot should load");
        assert_eq!(snapshot_before.totals.clips_captured, 1);
        assert_eq!(snapshot_before.totals.pastes, 2);
        assert_eq!(snapshot_before.totals.captured_text, 1);
        assert_eq!(snapshot_before.daily.len(), 1);

        reset(&pool).await.expect("progress should reset");
        let mut tx = pool.begin().await.expect("transaction should start");
        restore_snapshot(&mut tx, &snapshot_before)
            .await
            .expect("snapshot should restore");
        tx.commit().await.expect("transaction should commit");

        let restored = progress_data(&pool, Some("2026-09-20T00:00:00Z".to_string()))
            .await
            .expect("progress should load");
        assert_eq!(restored.totals.clips_captured, 1);
        assert_eq!(restored.totals.pastes, 2);
        assert_eq!(
            restored.first_used_at.as_deref(),
            Some("2026-09-20T00:00:00Z")
        );
    }
}
