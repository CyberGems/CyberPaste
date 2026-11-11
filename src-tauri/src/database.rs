use sqlx::SqlitePool;
use std::path::PathBuf;

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
    pub path: PathBuf,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ListClip {
    pub uuid: String,
    pub is_pinned: bool,
    pub pinned_slot: Option<i64>,
}

/// Compute the visual layout sequence of clips preserving pinned slots.
/// - In the main list (`is_main = true`), slot 1 (index 0) is reserved for the live clipboard
///   so pinned clips cannot occupy index 0 (minimum slot is 2, index 1).
/// - In folders (`is_main = false`), pinned clips can occupy any slot starting from 1 (index 0).
/// - Pinned clips target their preferred `pinned_slot`. If the list shrinks so N < pinned_slot,
///   they sit at the nearest available slot towards the end without leaving gaps.
/// - Unpinned clips flow in their existing order through the remaining slots.
pub fn layout_clips(clips: &[ListClip], is_main: bool) -> Vec<String> {
    let n = clips.len();
    if n == 0 {
        return Vec::new();
    }
    if n == 1 {
        return vec![clips[0].uuid.clone()];
    }

    let min_pinned_idx = if is_main { 1 } else { 0 };

    let mut pinned: Vec<(usize, &ListClip, usize)> = Vec::new();
    let mut unpinned: Vec<&ListClip> = Vec::new();

    for (orig_idx, clip) in clips.iter().enumerate() {
        if clip.is_pinned {
            let desired = match clip.pinned_slot {
                Some(s) if s >= 1 => ((s - 1) as usize).max(min_pinned_idx),
                _ => orig_idx.max(min_pinned_idx),
            };
            pinned.push((orig_idx, clip, desired));
        } else {
            unpinned.push(clip);
        }
    }

    // Sort pinned clips by desired slot, breaking ties by their original sequence
    pinned.sort_by_key(|&(orig_idx, _, desired)| (desired, orig_idx));

    let mut slots: Vec<Option<String>> = vec![None; n];

    // Place pinned clips into slots
    for (_, clip, desired) in pinned {
        let start_pos = desired.min(n - 1);
        let mut placed = false;

        // Try exact position, then search downwards down to min_pinned_idx
        for pos in (min_pinned_idx..=start_pos).rev() {
            if slots[pos].is_none() {
                slots[pos] = Some(clip.uuid.clone());
                placed = true;
                break;
            }
        }

        // If not placed, search upwards
        if !placed {
            for pos in (start_pos + 1)..n {
                if slots[pos].is_none() {
                    slots[pos] = Some(clip.uuid.clone());
                    placed = true;
                    break;
                }
            }
        }

        // Fallback: slot 0 if nothing else is free (e.g. all clips pinned in main list)
        if !placed && slots[0].is_none() {
            slots[0] = Some(clip.uuid.clone());
        }
    }

    // Fill remaining empty slots with unpinned clips in their relative order
    let mut unpinned_iter = unpinned.into_iter();
    for slot in slots.iter_mut() {
        if slot.is_none() {
            if let Some(u) = unpinned_iter.next() {
                *slot = Some(u.uuid.clone());
            }
        }
    }

    slots.into_iter().flatten().collect()
}

/// Put `uuid` in visual slot 1. Pinned clips keep their indices; other unpinned
/// clips cascade through the remaining holes.
fn parking_insert_live(visual: &[ListClip], uuid: &str) -> Vec<String> {
    let mut ordered: Vec<ListClip> = Vec::with_capacity(visual.len() + 1);
    let existing = visual.iter().find(|c| c.uuid == uuid).cloned();
    let live_clip = existing.unwrap_or_else(|| ListClip {
        uuid: uuid.to_string(),
        is_pinned: false,
        pinned_slot: None,
    });
    // Live unpinned clip sits first in the unpinned flow
    ordered.push(live_clip);
    for c in visual {
        if c.uuid != uuid {
            ordered.push(c.clone());
        }
    }
    layout_clips(&ordered, true)
}

fn move_item(order: &[String], clip: &str, target: &str, before: bool) -> Vec<String> {
    let mut v: Vec<String> = order.iter().filter(|u| u.as_str() != clip).cloned().collect();
    if let Some(idx) = v.iter().position(|u| u == target) {
        let at = if before { idx } else { idx + 1 };
        v.insert(at, clip.to_string());
    } else {
        v.push(clip.to_string());
    }
    v
}

fn reorder_unpinned_in_holes(
    visual: &[ListClip],
    clip: &str,
    target: &str,
    before: bool,
) -> Vec<String> {
    let mut unpinned: Vec<String> = visual
        .iter()
        .filter(|c| !c.is_pinned)
        .map(|c| c.uuid.clone())
        .collect();
    unpinned.retain(|u| u != clip);
    if let Some(tidx) = unpinned.iter().position(|u| u == target) {
        let at = if before { tidx } else { tidx + 1 };
        unpinned.insert(at, clip.to_string());
    } else {
        unpinned.push(clip.to_string());
    }

    let mut ui = 0usize;
    let mut result = Vec::with_capacity(visual.len());
    for c in visual {
        if c.is_pinned {
            result.push(c.uuid.clone());
        } else {
            result.push(unpinned[ui].clone());
            ui += 1;
        }
    }
    result
}

/// Resolve a top/bottom jump. `before` is true when the clip should sit in
/// front of the returned uuid. Main-list unpinned "top" is the live slot
/// (visual 0 when that hole is free). Bottom still skips the live slot so
/// drag-adjacent history order is unchanged.
fn edge_target(
    visual: &[ListClip],
    clip: &str,
    edge: &str,
    is_main: bool,
) -> Option<(String, bool)> {
    let clip_pinned = visual.iter().find(|c| c.uuid == clip)?.is_pinned;
    let to_top = edge == "top";

    if clip_pinned {
        if to_top {
            let first = visual.first()?;
            if first.uuid == clip {
                return None;
            }
            Some((first.uuid.clone(), true))
        } else {
            let last = visual.last()?;
            if last.uuid == clip {
                return None;
            }
            Some((last.uuid.clone(), false))
        }
    } else {
        let unpinned: Vec<&ListClip> = visual
            .iter()
            .enumerate()
            .filter(|(i, c)| !c.is_pinned && !(is_main && !to_top && *i == 0))
            .map(|(_, c)| c)
            .collect();
        if to_top {
            let first = unpinned.first()?;
            if first.uuid == clip {
                return None;
            }
            Some((first.uuid.clone(), true))
        } else {
            let last = unpinned.last()?;
            if last.uuid == clip {
                return None;
            }
            Some((last.uuid.clone(), false))
        }
    }
}

impl Database {
    pub async fn new(db_path: &str) -> Self {
        let options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

        let pool = SqlitePool::connect_with(options).await.unwrap();

        Self {
            pool,
            path: PathBuf::from(db_path),
        }
    }

    pub async fn get_and_prepare_first_unpinned_slot(
        &self,
        folder_id: Option<i64>,
        exclude_uuid: Option<&str>,
    ) -> Result<i64, sqlx::Error> {
        let pool = &self.pool;
        
        let first_unpinned_sort: Option<i64> = match (folder_id, exclude_uuid) {
            (Some(fid), Some(uuid)) => {
                sqlx::query_scalar(
                    r#"
                    SELECT sort_order FROM clips 
                    WHERE is_deleted = 0 AND folder_id = ? AND is_pinned = 0 AND uuid != ?
                    ORDER BY sort_order ASC, created_at DESC
                    LIMIT 1
                    "#
                )
                .bind(fid)
                .bind(uuid)
                .fetch_optional(pool)
                .await?
            }
            (Some(fid), None) => {
                sqlx::query_scalar(
                    r#"
                    SELECT sort_order FROM clips 
                    WHERE is_deleted = 0 AND folder_id = ? AND is_pinned = 0
                    ORDER BY sort_order ASC, created_at DESC
                    LIMIT 1
                    "#
                )
                .bind(fid)
                .fetch_optional(pool)
                .await?
            }
            (None, Some(uuid)) => {
                sqlx::query_scalar(
                    r#"
                    SELECT sort_order FROM clips 
                    WHERE is_deleted = 0 AND folder_id IS NULL AND is_pinned = 0 AND uuid != ?
                    ORDER BY sort_order ASC, created_at DESC
                    LIMIT 1
                    "#
                )
                .bind(uuid)
                .fetch_optional(pool)
                .await?
            }
            (None, None) => {
                sqlx::query_scalar(
                    r#"
                    SELECT sort_order FROM clips 
                    WHERE is_deleted = 0 AND folder_id IS NULL AND is_pinned = 0
                    ORDER BY sort_order ASC, created_at DESC
                    LIMIT 1
                    "#
                )
                .fetch_optional(pool)
                .await?
            }
        };

        if let Some(sort_order) = first_unpinned_sort {
            match (folder_id, exclude_uuid) {
                (Some(fid), Some(uuid)) => {
                    sqlx::query(
                        r#"
                        UPDATE clips 
                        SET sort_order = sort_order + 1 
                        WHERE is_deleted = 0 AND folder_id = ? AND is_pinned = 0 AND uuid != ? AND sort_order >= ?
                        "#
                    )
                    .bind(fid)
                    .bind(uuid)
                    .bind(sort_order)
                    .execute(pool)
                    .await?;
                }
                (Some(fid), None) => {
                    sqlx::query(
                        r#"
                        UPDATE clips 
                        SET sort_order = sort_order + 1 
                        WHERE is_deleted = 0 AND folder_id = ? AND is_pinned = 0 AND sort_order >= ?
                        "#
                    )
                    .bind(fid)
                    .bind(sort_order)
                    .execute(pool)
                    .await?;
                }
                (None, Some(uuid)) => {
                    sqlx::query(
                        r#"
                        UPDATE clips 
                        SET sort_order = sort_order + 1 
                        WHERE is_deleted = 0 AND folder_id IS NULL AND is_pinned = 0 AND uuid != ? AND sort_order >= ?
                        "#
                    )
                    .bind(uuid)
                    .bind(sort_order)
                    .execute(pool)
                    .await?;
                }
                (None, None) => {
                    sqlx::query(
                        r#"
                        UPDATE clips 
                        SET sort_order = sort_order + 1 
                        WHERE is_deleted = 0 AND folder_id IS NULL AND is_pinned = 0 AND sort_order >= ?
                        "#
                    )
                    .bind(sort_order)
                    .execute(pool)
                    .await?;
                }
            }
            Ok(sort_order)
        } else {
            let max_sort: Option<i64> = match folder_id {
                Some(fid) => {
                    sqlx::query_scalar(
                        r#"
                        SELECT MAX(sort_order) FROM clips 
                        WHERE is_deleted = 0 AND folder_id = ?
                        "#
                    )
                    .bind(fid)
                    .fetch_optional(pool)
                    .await?
                }
                None => {
                    sqlx::query_scalar(
                        r#"
                        SELECT MAX(sort_order) FROM clips 
                        WHERE is_deleted = 0 AND folder_id IS NULL
                        "#
                    )
                    .fetch_optional(pool)
                    .await?
                }
            };
            Ok(max_sort.unwrap_or(0) + 1)
        }
    }

    pub async fn load_list_clips_pool(
        pool: &SqlitePool,
        folder_id: Option<i64>,
    ) -> Result<Vec<ListClip>, sqlx::Error> {
        let rows: Vec<(String, bool, Option<i64>)> = match folder_id {
            Some(fid) => {
                sqlx::query_as(
                    r#"
                    SELECT uuid, is_pinned, pinned_slot FROM clips
                    WHERE is_deleted = 0 AND folder_id = ?
                    ORDER BY sort_order ASC, created_at DESC
                    "#,
                )
                .bind(fid)
                .fetch_all(pool)
                .await?
            }
            None => {
                sqlx::query_as(
                    r#"
                    SELECT uuid, is_pinned, pinned_slot FROM clips
                    WHERE is_deleted = 0 AND folder_id IS NULL
                    ORDER BY sort_order ASC, created_at DESC
                    "#,
                )
                .fetch_all(pool)
                .await?
            }
        };
        let is_main = folder_id.is_none();
        let min_slot = if is_main { 2 } else { 1 };
        Ok(rows
            .into_iter()
            .enumerate()
            .map(|(idx, (uuid, is_pinned, pinned_slot))| {
                let slot = if is_pinned {
                    pinned_slot.or_else(|| Some((idx as i64 + 1).max(min_slot)))
                } else {
                    None
                };
                ListClip {
                    uuid,
                    is_pinned,
                    pinned_slot: slot,
                }
            })
            .collect())
    }

    pub async fn load_list_clips(&self, folder_id: Option<i64>) -> Result<Vec<ListClip>, sqlx::Error> {
        Self::load_list_clips_pool(&self.pool, folder_id).await
    }

    pub async fn apply_list_order_pool(
        pool: &SqlitePool,
        uuids: &[String],
    ) -> Result<(), sqlx::Error> {
        let mut tx = pool.begin().await?;
        for (i, uuid) in uuids.iter().enumerate() {
            sqlx::query("UPDATE clips SET sort_order = ? WHERE uuid = ?")
                .bind(i as i64)
                .bind(uuid)
                .execute(&mut *tx)
                .await?;
        }
        tx.commit().await?;
        Ok(())
    }

    pub async fn apply_list_order(&self, uuids: &[String]) -> Result<(), sqlx::Error> {
        Self::apply_list_order_pool(&self.pool, uuids).await
    }

    pub async fn reconcile_list_order(&self, folder_id: Option<i64>) -> Result<(), sqlx::Error> {
        Self::reconcile_list_order_pool(&self.pool, folder_id).await
    }

    pub async fn reconcile_list_order_pool(
        pool: &SqlitePool,
        folder_id: Option<i64>,
    ) -> Result<(), sqlx::Error> {
        let visual = Self::load_list_clips_pool(pool, folder_id).await?;
        let is_main = folder_id.is_none();
        let new_order = layout_clips(&visual, is_main);
        Self::apply_list_order_pool(pool, &new_order).await
    }

    /// Put an unpinned main-list clip in slot 1. Pinned clips keep their visual slots;
    /// other unpinned clips flow through the remaining holes. No-op for pinned or folder clips.
    pub async fn place_at_live_slot(&self, uuid: &str) -> Result<(), sqlx::Error> {
        let meta: Option<(bool, Option<i64>)> =
            sqlx::query_as("SELECT is_pinned, folder_id FROM clips WHERE uuid = ?")
                .bind(uuid)
                .fetch_optional(&self.pool)
                .await?;

        let Some((is_pinned, folder_id)) = meta else {
            return Ok(());
        };
        if is_pinned || folder_id.is_some() {
            return Ok(());
        }

        let visual = self.load_list_clips(None).await?;
        let new_order = parking_insert_live(&visual, uuid);
        self.apply_list_order(&new_order).await
    }

    /// Move a clip that just landed on the main list into a valid visual slot.
    /// Unpinned → live slot (flowing around pins). Pinned → slot 2 when possible.
    pub async fn place_in_main_list(&self, uuid: &str) -> Result<(), sqlx::Error> {
        let is_pinned: bool = sqlx::query_scalar("SELECT is_pinned FROM clips WHERE uuid = ?")
            .bind(uuid)
            .fetch_optional(&self.pool)
            .await?
            .unwrap_or(false);

        if !is_pinned {
            return self.place_at_live_slot(uuid).await;
        }

        // Pinned clip landing on main list: ensure pinned_slot >= 2 (slot 1 is reserved for live capture)
        sqlx::query("UPDATE clips SET pinned_slot = MAX(COALESCE(pinned_slot, 2), 2) WHERE uuid = ?")
            .bind(uuid)
            .execute(&self.pool)
            .await?;
        self.reconcile_list_order(None).await
    }

    pub async fn reorder_clip_visual(
        &self,
        clip_uuid: &str,
        target_uuid: &str,
        position: &str,
    ) -> Result<(), sqlx::Error> {
        let folder_id: Option<i64> =
            sqlx::query_scalar("SELECT folder_id FROM clips WHERE uuid = ?")
                .bind(clip_uuid)
                .fetch_one(&self.pool)
                .await?;

        let is_main = folder_id.is_none();
        let visual = self.load_list_clips(folder_id).await?;
        let clip_pinned = visual.iter().find(|c| c.uuid == clip_uuid).map(|c| c.is_pinned);
        let target_pinned = visual
            .iter()
            .find(|c| c.uuid == target_uuid)
            .map(|c| c.is_pinned);
        let (Some(clip_pinned), Some(target_pinned)) = (clip_pinned, target_pinned) else {
            return Ok(());
        };

        let before = position == "before";

        if clip_pinned {
            // Dragging a PINNED clip: user is explicitly moving its pinned anchor!
            let ids: Vec<String> = visual.iter().map(|c| c.uuid.clone()).collect();
            let new_order = move_item(&ids, clip_uuid, target_uuid, before);
            let new_idx = new_order.iter().position(|u| u == clip_uuid).unwrap_or(0);
            let new_slot = if is_main {
                (new_idx as i64 + 1).max(2)
            } else {
                (new_idx as i64 + 1).max(1)
            };
            sqlx::query("UPDATE clips SET pinned_slot = ? WHERE uuid = ?")
                .bind(new_slot)
                .bind(clip_uuid)
                .execute(&self.pool)
                .await?;
            self.reconcile_list_order(folder_id).await
        } else if target_pinned {
            // Dragging an UNPINNED clip onto a PINNED clip: forbidden / no-op
            Ok(())
        } else {
            // Dragging an UNPINNED clip around other unpinned clips
            let new_order = reorder_unpinned_in_holes(&visual, clip_uuid, target_uuid, before);
            self.apply_list_order(&new_order).await
        }
    }

    pub async fn move_clip_to_edge(&self, clip_uuid: &str, edge: &str) -> Result<(), sqlx::Error> {
        let folder_id: Option<i64> =
            sqlx::query_scalar("SELECT folder_id FROM clips WHERE uuid = ?")
                .bind(clip_uuid)
                .fetch_one(&self.pool)
                .await?;

        let is_main = folder_id.is_none();
        let visual = self.load_list_clips(folder_id).await?;
        let clip_pinned = visual
            .iter()
            .find(|c| c.uuid == clip_uuid)
            .map(|c| c.is_pinned)
            .unwrap_or(false);

        if clip_pinned {
            let new_slot = if edge == "top" {
                if is_main { 2 } else { 1 }
            } else {
                visual.len() as i64
            };
            sqlx::query("UPDATE clips SET pinned_slot = ? WHERE uuid = ?")
                .bind(new_slot)
                .bind(clip_uuid)
                .execute(&self.pool)
                .await?;
            self.reconcile_list_order(folder_id).await
        } else {
            if is_main && edge == "top" {
                return self.place_at_live_slot(clip_uuid).await;
            }
            let Some((target_uuid, before)) = edge_target(&visual, clip_uuid, edge, is_main) else {
                return Ok(());
            };
            let position = if before { "before" } else { "after" };
            self.reorder_clip_visual(clip_uuid, &target_uuid, position)
                .await
        }
    }

    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                icon TEXT,
                color TEXT,
                is_system INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT NOT NULL UNIQUE,
                clip_type TEXT NOT NULL,
                content BLOB NOT NULL,
                text_preview TEXT,
                content_hash TEXT NOT NULL,
                folder_id INTEGER REFERENCES folders(id),
                is_deleted INTEGER DEFAULT 0,
                is_thumbnail INTEGER NOT NULL DEFAULT 0,
                source_app TEXT,
                source_icon TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_clips_hash ON clips(content_hash);
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_clips_folder ON clips(folder_id);
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at);
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_clips_source_app ON clips(source_app);
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS ignored_apps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_name TEXT NOT NULL UNIQUE
            )
        "#,
        )
        .execute(&self.pool)
        .await?;

        // Backward-compatible schema updates.
        add_column_if_missing(
            &self.pool,
            "ALTER TABLE clips ADD COLUMN is_thumbnail INTEGER NOT NULL DEFAULT 0",
        )
        .await?;

        add_column_if_missing(&self.pool, "ALTER TABLE folders ADD COLUMN icon TEXT").await?;

        add_column_if_missing(&self.pool, "ALTER TABLE folders ADD COLUMN color TEXT").await?;

        // Position zero is valid. Initialize the order only when upgrading a legacy schema.
        let mut order_migration = self.pool.begin().await?;
        if add_column_if_missing(
            &mut *order_migration,
            "ALTER TABLE clips ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
        )
        .await?
        {
            sqlx::query("UPDATE clips SET sort_order = id")
                .execute(&mut *order_migration)
                .await?;
        }
        order_migration.commit().await?;

        add_column_if_missing(
            &self.pool,
            "ALTER TABLE clips ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
        )
        .await?;

        add_column_if_missing(
            &self.pool,
            "ALTER TABLE clips ADD COLUMN pinned_at DATETIME",
        )
        .await?;

        add_column_if_missing(
            &self.pool,
            "ALTER TABLE clips ADD COLUMN pinned_slot INTEGER",
        )
        .await?;

        add_column_if_missing(
            &self.pool,
            "ALTER TABLE folders ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
        )
        .await?;

        // Backfill: assign sort_order based on current row id for existing folders
        sqlx::query(
            r#"
            UPDATE folders SET sort_order = id WHERE sort_order = 0
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Backfill pinned_slot for existing pinned clips that don't have one
        let _ = sqlx::query(
            r#"
            UPDATE clips 
            SET pinned_slot = CASE 
                WHEN folder_id IS NULL THEN MAX(sort_order + 1, 2)
                ELSE MAX(sort_order + 1, 1)
            END
            WHERE is_pinned = 1 AND (pinned_slot IS NULL OR pinned_slot <= 0)
            "#,
        )
        .execute(&self.pool)
        .await;

        // Startup reconciliation to ensure contiguous sort_order
        let _ = Self::reconcile_list_order_pool(&self.pool, None).await;

        // Normalize any legacy RTF clips to text
        let _ = sqlx::query(
            r#"
            UPDATE clips SET clip_type = 'text' WHERE clip_type = 'rtf'
            "#,
        )
        .execute(&self.pool)
        .await;

        // Normalize any legacy HTML clips to code (HTML lives in the code category)
        let _ = sqlx::query(
            r#"
            UPDATE clips SET clip_type = 'code' WHERE clip_type = 'html'
            "#,
        )
        .execute(&self.pool)
        .await;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clip_images (
                clip_uuid TEXT PRIMARY KEY,
                full_content BLOB NOT NULL,
                file_path TEXT,
                file_size INTEGER,
                storage_kind TEXT NOT NULL DEFAULT 'db',
                mime_type TEXT NOT NULL DEFAULT 'image/png',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (clip_uuid) REFERENCES clips(uuid) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_clip_images_storage ON clip_images(storage_kind);
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Rich clipboard flavors (RTF/HTML) stored as an invisible side channel
        // for text clips, so re-pasting into rich targets restores formatting.
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clip_rich (
                clip_uuid TEXT PRIMARY KEY,
                rtf BLOB,
                html BLOB,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (clip_uuid) REFERENCES clips(uuid) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        crate::progress::migrate(&self.pool).await?;

        // Seed initial sample clips for brand new installations if database is empty
        let clip_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM clips")
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0);

        if clip_count == 0 {
            let _ = self.seed_initial_clips().await;
        }

        Ok(())
    }

    pub async fn seed_initial_clips(&self) -> Result<(), sqlx::Error> {
        use sha2::{Digest, Sha256};

        let sample_clips: Vec<(&str, String, String, &str, Option<String>)> = vec![
            (
                "text",
                "✨ Welcome to CyberPaste! / ¡Bienvenido a CyberPaste!\n\nEssential shortcuts / Atajos esenciales:\n• Ctrl+Shift+V : Toggle window / Alternar ventana\n• Ctrl+M       : Full & Compact modes / Vista Completa / Compacta\n• Type...      : Instant search / Búsqueda instantánea\n• Enter        : Paste selected clip / Pegar clip seleccionado\n• Ctrl+Enter   : Copy as plain text / Copiar como texto plano\n• P            : Pin or unpin clip / Fijar o desfijar clip\n• Del          : Delete clip / Eliminar clip".to_string(),
                "✨ Welcome to CyberPaste! / ¡Bienvenido a CyberPaste!".to_string(),
                "CyberPaste.exe",
                None,
            ),
            (
                "image",
                "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zxPNMrFWBAv3nLv6j8b16mR9edHbHk1bmdBnwKI3r1z7d35+fu3Hqz/1xOOnL15RSsv39siXj9u5OVFOZ9epy2/l5jg0R6uG9e/8kZaXl5fv8dz/HtadTU1patf4gbs/PJ3+7tH49q2VUgNXvN06pt7Qzm17tW42aKXvLQ+nw9F1zupbObkOh9aqQV3r1KqAMXSWUppr2VizF2It+qwt3g+hORMsxJvu8MnY9/tJr3atEukdunu0+XHBhlJq+9ETs/v1eP/E5wWfOiMcHZ/+oVKq2zPNj3x29viZC11aNlFKdWgek9y9fZlHs3m9Ojv++GmVKGdUpPOR6KrvTR760dlL8cs2d2zW0PtydGgOTTt+9qsuP2nk3WeTHyTHtrPmM2QM9Z78okitQo9TQvjs+EPW92o/cXTRxGs3bn5z4z8j0n0vwcxjJ+bF90rZtLvg09s5OS+1apbYtf11l3vIso1Vo6KWDP51XMdnc/Pyh60o+1Wbsf/YwWkJn126eiPbfTsn93cn/3xo2nCHwzF75/tKqWNfXNya3Ddx3c4l/XvEPd8yNz9/2Gq/fyhlpTGGzfaOWkvHqDCmz9x851w+tINVIe3RWjG+2f3OxF7ihu+Xsjbunwkf3ij9IYo8VvE78fi3k6Av2I+deAL5qgNbcEV34nsBlLDgJ2vWSB/e+8XJaX4+Vvm+fD8X7AnN66qCT1PYNkufuTk0//mXuMGEhdL8skXjCa90Gbz4LQ5TKYzX53hHrSWjw+co6TM2VeZgVYgJiwmrjAmrxA0mrOIGAddim2dLn+G93iUY5ytMWIDZjOHzvCeJi0cp29Gnb1QmDFVFcEoIBJ8xfJ5H07LTku1xcPVpb5lyAvgwggWESnTCfKWU6Gzp0zZYoVOFCBYQWtGJqd5sLfLjR1xYgT51g5VK5UOwgMrK1p23n7MXjrTyEdenvHnvchnrIVhApYoesaDg22TZC0ZY59DrKetC/bdqgoJgAeaIHrmw8ILk7NQEExYweW3Bo9+9dFwAggWYLzoprfDbcNnzh4fwgSat8X6wxrf8AkCwAGuJHrX44esws+cO83s/EzNKu8JTJoIFCBA9ZllAF47bDT9eBoAYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAGAQLgBgEC4AYBAuAkuL/iJ2ThMaBhcIAAAAASUVORK5CYII=".to_string(),
                "".to_string(),
                "Figma.exe",
                Some(r#"{"size_bytes":196608,"width":400,"height":240}"#.to_string()),
            ),
            (
                "code",
                "// 🚀 CyberPaste: The Ultimate Clipboard Manager\nexport interface ClipboardClip {\n  id: string;\n  type: 'text' | 'image' | 'code' | 'url';\n  content: string;\n  isPinned: boolean;\n  createdAt: Date;\n}".to_string(),
                "// 🚀 CyberPaste: The Ultimate Clipboard Manager".to_string(),
                "Code.exe",
                None,
            ),
            (
                "url",
                "https://github.com/CyberGems/CyberPaste".to_string(),
                "https://github.com/CyberGems/CyberPaste".to_string(),
                "chrome.exe",
                None,
            ),
            (
                "text",
                "# 💎 CyberPaste — Limitless Productivity\n\n- ⚡ **Ultra-fast**: Native Rust engine + local SQLite\n- 🔒 **100% Private**: Your data never leaves your device\n- 📁 **Folders**: Organize clips via drag & drop or menus\n- 👁️ **Peek Popover**: Hover in compact mode to preview\n- 🤖 **AI Actions**: Summarize, translate or analyze code locally".to_string(),
                "# 💎 CyberPaste — Limitless Productivity".to_string(),
                "Obsidian.exe",
                None,
            ),
            (
                "code",
                "{\n  \"app\": \"CyberPaste\",\n  \"version\": \"1.17.0\",\n  \"theme\": \"cyberpaste\",\n  \"storage\": \"sqlite_local\",\n  \"offline_first\": true\n}".to_string(),
                "{\n  \"app\": \"CyberPaste\",\n  \"version\": \"1.17.0\"...".to_string(),
                "Code.exe",
                None,
            ),
            (
                "code",
                "# CyberPaste: Modern & Lightweight Clipboard Tool\nnpm run dev".to_string(),
                "# CyberPaste: Modern & Lightweight Clipboard Tool".to_string(),
                "WindowsTerminal.exe",
                None,
            ),
        ];

        for (idx, (clip_type, content, preview, source_app, metadata)) in sample_clips.iter().enumerate() {
            let clip_uuid = uuid::Uuid::new_v4().to_string();
            let content_bytes = content.as_bytes();
            let mut hasher = Sha256::new();
            hasher.update(content_bytes);
            let hash = format!("{:x}", hasher.finalize());
            let sort_order = (idx + 1) as i64;

            let _ = sqlx::query(
                r#"
                INSERT INTO clips (
                    uuid, clip_type, content, text_preview, content_hash,
                    folder_id, is_deleted, is_thumbnail, source_app, source_icon,
                    metadata, sort_order, is_pinned, created_at, last_accessed
                )
                VALUES (?, ?, ?, ?, ?, NULL, 0, 0, ?, NULL, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#,
            )
            .bind(&clip_uuid)
            .bind(clip_type)
            .bind(content_bytes)
            .bind(preview)
            .bind(&hash)
            .bind(source_app)
            .bind(metadata)
            .bind(sort_order)
            .execute(&self.pool)
            .await;
        }

        Ok(())
    }
}

async fn add_column_if_missing<'e>(
    executor: impl sqlx::Executor<'e, Database = sqlx::Sqlite>,
    sql: &str,
) -> Result<bool, sqlx::Error> {
    match sqlx::query(sql).execute(executor).await {
        Ok(_) => Ok(true),
        Err(e) => {
            let msg = e.to_string().to_lowercase();
            if msg.contains("duplicate column name") {
                Ok(false)
            } else {
                Err(e)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lc(uuid: &str, is_pinned: bool) -> ListClip {
        ListClip {
            uuid: uuid.to_string(),
            is_pinned,
            pinned_slot: None,
        }
    }

    fn lcs(uuid: &str, is_pinned: bool, slot: Option<i64>) -> ListClip {
        ListClip {
            uuid: uuid.to_string(),
            is_pinned,
            pinned_slot: slot,
        }
    }

    #[tokio::test]
    async fn startup_preserves_the_clip_copied_to_the_live_slot() {
        let path = std::env::temp_dir().join(format!("cyberpaste-order-{}.db", uuid::Uuid::new_v4()));
        let db = Database::new(path.to_str().unwrap()).await;
        db.migrate().await.unwrap();

        // Simulate a database created before clip order was persisted.
        sqlx::query("ALTER TABLE clips DROP COLUMN sort_order")
            .execute(&db.pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO clips (uuid, clip_type, content, content_hash, created_at)
             VALUES ('white', 'image', x'', 'white', '2025-01-01'),
                    ('black', 'image', x'', 'black', '2025-01-02')",
        )
        .execute(&db.pool)
        .await
        .unwrap();

        db.migrate().await.unwrap();
        let legacy_order = db.load_list_clips(None).await.unwrap();
        let legacy_images = &legacy_order[legacy_order.len() - 2..];
        assert_eq!(legacy_images[0].uuid, "white");
        assert_eq!(legacy_images[1].uuid, "black");

        db.place_at_live_slot("black").await.unwrap();
        db.place_at_live_slot("white").await.unwrap();
        let before_restart = db.load_list_clips(None).await.unwrap();
        assert_eq!(before_restart[0].uuid, "white");
        assert_eq!(before_restart[1].uuid, "black");
        db.pool.close().await;

        let reopened = Database::new(path.to_str().unwrap()).await;
        reopened.migrate().await.unwrap();
        let after_restart = reopened.load_list_clips(None).await.unwrap();
        reopened.pool.close().await;
        drop(reopened);
        drop(db);

        // Allow Windows to release the temporary database before deleting it.
        let mut retries = 20;
        loop {
            match std::fs::remove_file(&path) {
                Err(error) if cfg!(windows) && error.raw_os_error() == Some(32) && retries > 0 => {
                    retries -= 1;
                    tokio::time::sleep(std::time::Duration::from_millis(25)).await;
                }
                result => {
                    result.unwrap();
                    break;
                }
            }
        }
        assert_eq!(after_restart, before_restart);
    }

    #[test]
    fn new_clip_flows_around_pinned_slots() {
        let visual = vec![
            lcs("A", false, None),
            lcs("B", true, Some(2)),
            lcs("C", false, None),
            lcs("D", true, Some(4)),
        ];
        assert_eq!(
            parking_insert_live(&visual, "F"),
            vec!["F", "B", "A", "D", "C"]
        );
    }

    #[test]
    fn bump_existing_unpinned_keeps_pins() {
        let visual = vec![
            lcs("A", false, None),
            lcs("B", true, Some(2)),
            lcs("C", false, None),
        ];
        assert_eq!(parking_insert_live(&visual, "C"), vec!["C", "B", "A"]);
        assert_eq!(parking_insert_live(&visual, "A"), vec!["A", "B", "C"]);
    }

    #[test]
    fn pinned_clip_stays_at_slot_10_when_clips_above_are_deleted() {
        // 15 clips: U1..U9, P10 (pinned at slot 10), U11..U15
        let mut visual = Vec::new();
        for i in 1..=9 {
            visual.push(lc(&format!("U{}", i), false));
        }
        visual.push(lcs("P10", true, Some(10)));
        for i in 11..=15 {
            visual.push(lc(&format!("U{}", i), false));
        }

        // Delete U3 -> remaining 14 clips
        visual.retain(|c| c.uuid != "U3");
        let order = layout_clips(&visual, true);
        assert_eq!(order.len(), 14);
        // P10 must still be at index 9 (slot 10)
        assert_eq!(order[9], "P10");
        // U9 shifted to index 7, and U11 moved up to index 8 (slot 9)
        assert_eq!(order[7], "U9");
        assert_eq!(order[8], "U11");
        assert_eq!(order[10], "U12");
    }

    #[test]
    fn accordion_shrinks_and_expands_back_to_slot_10() {
        // 10 clips: U1..U9, P10 (slot 10)
        let mut visual = Vec::new();
        for i in 1..=9 {
            visual.push(lc(&format!("U{}", i), false));
        }
        visual.push(lcs("P10", true, Some(10)));

        // Delete 2 clips -> total 8 clips left
        visual.retain(|c| c.uuid != "U2" && c.uuid != "U4");
        let order_8 = layout_clips(&visual, true);
        assert_eq!(order_8.len(), 8);
        // P10 moves to last available slot (index 7, slot 8)
        assert_eq!(order_8[7], "P10");

        // Now 2 new captures arrive -> total 10 clips
        let mut expanded = vec![
            lc("NEW_2", false),
            lc("NEW_1", false),
        ];
        expanded.extend(visual);
        let order_10 = layout_clips(&expanded, true);
        assert_eq!(order_10.len(), 10);
        // P10 expands back to index 9 (slot 10)!
        assert_eq!(order_10[9], "P10");
    }

    #[test]
    fn multiple_pins_stay_locked() {
        let mut visual = Vec::new();
        visual.push(lc("U1", false));
        visual.push(lc("U2", false));
        visual.push(lcs("P3", true, Some(3)));
        visual.push(lc("U4", false));
        visual.push(lc("U5", false));
        visual.push(lc("U6", false));
        visual.push(lcs("P7", true, Some(7)));
        visual.push(lc("U8", false));
        visual.push(lc("U9", false));
        visual.push(lc("U10", false));

        // Delete U1 (before P3)
        visual.retain(|c| c.uuid != "U1");
        let order = layout_clips(&visual, true);
        assert_eq!(order.len(), 9);
        // Both P3 (index 2) and P7 (index 6) stay locked
        assert_eq!(order[2], "P3");
        assert_eq!(order[6], "P7");
    }

    #[test]
    fn two_consecutive_pins_stay_locked_on_capture_and_delete() {
        // Main list with U1, P2 (pinned slot 2), P3 (pinned slot 3), U4, U5
        let mut visual = vec![
            lc("U1", false),
            lcs("P2", true, Some(2)),
            lcs("P3", true, Some(3)),
            lc("U4", false),
            lc("U5", false),
        ];

        // 1. Delete clip U1 (above the two pins)
        visual.retain(|c| c.uuid != "U1");
        let order_after_delete = layout_clips(&visual, true);
        assert_eq!(order_after_delete.len(), 4);
        // P2 must be at slot 2 (index 1), P3 must be at slot 3 (index 2)
        assert_eq!(order_after_delete[0], "U4"); // U4 flows into slot 1
        assert_eq!(order_after_delete[1], "P2"); // P2 locked at slot 2
        assert_eq!(order_after_delete[2], "P3"); // P3 locked at slot 3
        assert_eq!(order_after_delete[3], "U5"); // U5 at slot 4

        // 2. New capture arrives
        let visual_current = vec![
            lc("U4", false),
            lcs("P2", true, Some(2)),
            lcs("P3", true, Some(3)),
            lc("U5", false),
        ];
        let order_after_capture = parking_insert_live(&visual_current, "NEW");
        assert_eq!(order_after_capture.len(), 5);
        assert_eq!(order_after_capture[0], "NEW"); // Live at slot 1
        assert_eq!(order_after_capture[1], "P2");  // P2 locked at slot 2
        assert_eq!(order_after_capture[2], "P3");  // P3 locked at slot 3
        assert_eq!(order_after_capture[3], "U4");  // U4 flows into slot 4
        assert_eq!(order_after_capture[4], "U5");  // U5 flows into slot 5
    }

    #[test]
    fn main_list_slot_1_is_never_pinned() {
        let visual = vec![
            lcs("P1", true, Some(1)),
            lc("U2", false),
            lc("U3", false),
        ];
        let order = layout_clips(&visual, true);
        // On main list, slot 1 (index 0) is reserved for live capture, so P1 moves to index 1 (slot 2)
        assert_eq!(order[0], "U2");
        assert_eq!(order[1], "P1");
        assert_eq!(order[2], "U3");
    }

    #[test]
    fn reorder_unpinned_leaves_pinned_indices() {
        let visual = vec![
            lc("A", false),
            lc("B", true),
            lc("C", false),
            lc("D", false),
        ];
        assert_eq!(
            reorder_unpinned_in_holes(&visual, "D", "A", false),
            vec!["A", "B", "D", "C"]
        );
        assert_eq!(
            reorder_unpinned_in_holes(&visual, "C", "D", false),
            vec!["A", "B", "D", "C"]
        );
    }

    #[test]
    fn edge_target_unpinned_top_uses_live_slot_on_main_list() {
        let visual = vec![
            lc("A", false),
            lc("B", true),
            lc("C", false),
            lc("D", false),
        ];
        assert_eq!(
            edge_target(&visual, "D", "top", true),
            Some(("A".to_string(), true))
        );
        assert_eq!(edge_target(&visual, "A", "top", true), None);
        assert_eq!(
            edge_target(&visual, "C", "bottom", true),
            Some(("D".to_string(), false))
        );
        assert_eq!(edge_target(&visual, "D", "bottom", true), None);
    }

    #[test]
    fn edge_target_unpinned_top_uses_first_free_hole_when_live_pinned() {
        let visual = vec![
            lc("P", true),
            lc("A", false),
            lc("D", false),
        ];
        assert_eq!(
            edge_target(&visual, "D", "top", true),
            Some(("A".to_string(), true))
        );
        assert_eq!(edge_target(&visual, "A", "top", true), None);
    }

    #[test]
    fn edge_target_folder_uses_first_unpinned() {
        let visual = vec![
            lc("A", false),
            lc("B", true),
            lc("C", false),
            lc("D", false),
        ];
        assert_eq!(
            edge_target(&visual, "D", "top", false),
            Some(("A".to_string(), true))
        );
        assert_eq!(
            edge_target(&visual, "A", "bottom", false),
            Some(("D".to_string(), false))
        );
    }

    #[test]
    fn edge_target_pinned_uses_visual_ends() {
        let visual = vec![
            lc("A", false),
            lc("B", true),
            lc("C", false),
        ];
        assert_eq!(
            edge_target(&visual, "B", "top", true),
            Some(("A".to_string(), true))
        );
        assert_eq!(
            edge_target(&visual, "B", "bottom", true),
            Some(("C".to_string(), false))
        );
    }
}
