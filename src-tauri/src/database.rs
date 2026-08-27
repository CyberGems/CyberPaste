use sqlx::SqlitePool;

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct ListClip {
    uuid: String,
    is_pinned: bool,
}

/// Put `uuid` in visual slot 1. Pinned clips keep their indices; other unpinned
/// clips cascade through the remaining holes.
fn parking_insert_live(visual: &[ListClip], uuid: &str) -> Vec<String> {
    let in_list = visual.iter().any(|c| c.uuid == uuid);
    let mut unpinned_queue = vec![uuid.to_string()];
    for c in visual {
        if !c.is_pinned && c.uuid != uuid {
            unpinned_queue.push(c.uuid.clone());
        }
    }

    let mut result = Vec::new();
    let mut ui = 0usize;
    for c in visual {
        if c.is_pinned && c.uuid != uuid {
            result.push(c.uuid.clone());
        } else {
            result.push(unpinned_queue[ui].clone());
            ui += 1;
        }
    }
    if !in_list {
        while ui < unpinned_queue.len() {
            result.push(unpinned_queue[ui].clone());
            ui += 1;
        }
    }
    result
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

impl Database {
    pub async fn new(db_path: &str) -> Self {
        let options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

        let pool = SqlitePool::connect_with(options).await.unwrap();

        Self { pool }
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

    async fn load_list_clips(&self, folder_id: Option<i64>) -> Result<Vec<ListClip>, sqlx::Error> {
        let rows: Vec<(String, bool)> = match folder_id {
            Some(fid) => {
                sqlx::query_as(
                    r#"
                    SELECT uuid, is_pinned FROM clips
                    WHERE is_deleted = 0 AND folder_id = ?
                    ORDER BY sort_order ASC, created_at DESC
                    "#,
                )
                .bind(fid)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as(
                    r#"
                    SELECT uuid, is_pinned FROM clips
                    WHERE is_deleted = 0 AND folder_id IS NULL
                    ORDER BY sort_order ASC, created_at DESC
                    "#,
                )
                .fetch_all(&self.pool)
                .await?
            }
        };
        Ok(rows
            .into_iter()
            .map(|(uuid, is_pinned)| ListClip { uuid, is_pinned })
            .collect())
    }

    async fn apply_list_order(&self, uuids: &[String]) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;
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

        let visual = self.load_list_clips(None).await?;
        let mut order: Vec<String> = visual
            .into_iter()
            .filter(|c| c.uuid != uuid)
            .map(|c| c.uuid)
            .collect();
        let at = if order.is_empty() { 0 } else { 1 };
        order.insert(at.min(order.len()), uuid.to_string());
        self.apply_list_order(&order).await
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
        let new_order = if clip_pinned {
            let ids: Vec<String> = visual.iter().map(|c| c.uuid.clone()).collect();
            move_item(&ids, clip_uuid, target_uuid, before)
        } else if target_pinned {
            visual.into_iter().map(|c| c.uuid).collect()
        } else {
            reorder_unpinned_in_holes(&visual, clip_uuid, target_uuid, before)
        };
        self.apply_list_order(&new_order).await
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

        add_column_if_missing(
            &self.pool,
            "ALTER TABLE clips ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
        )
        .await?;

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

        // Backfill: assign sort_order based on current row id for existing clips
        sqlx::query(
            r#"
            UPDATE clips SET sort_order = id WHERE sort_order = 0
            "#,
        )
        .execute(&self.pool)
        .await?;

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

async fn add_column_if_missing(pool: &SqlitePool, sql: &str) -> Result<(), sqlx::Error> {
    match sqlx::query(sql).execute(pool).await {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string().to_lowercase();
            if msg.contains("duplicate column name") {
                Ok(())
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
        }
    }

    #[test]
    fn new_clip_flows_around_pinned_slots() {
        let visual = vec![
            lc("A", false),
            lc("B", true),
            lc("C", false),
            lc("D", true),
        ];
        assert_eq!(
            parking_insert_live(&visual, "F"),
            vec!["F", "B", "A", "D", "C"]
        );
    }

    #[test]
    fn bump_existing_unpinned_keeps_pins() {
        let visual = vec![lc("A", false), lc("B", true), lc("C", false)];
        assert_eq!(parking_insert_live(&visual, "C"), vec!["C", "B", "A"]);
        assert_eq!(parking_insert_live(&visual, "A"), vec!["A", "B", "C"]);
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
}
