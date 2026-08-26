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

        let sample_clips = [
            (
                "text",
                "✨ ¡Bienvenido a CyberPaste! / Welcome to CyberPaste!\n\nAtajos de teclado esenciales / Essential shortcuts:\n• Ctrl+Shift+V : Alternar ventana / Toggle window\n• Ctrl+M       : Vista Completa / Compacta (Full & Compact modes)\n• Escribe...   : Búsqueda instantánea / Type to search\n• Enter        : Pegar clip seleccionado / Paste selected\n• Ctrl+Enter   : Copiar como texto plano / Copy plain text\n• P            : Fijar o desfijar clip / Pin or unpin\n• Supr         : Eliminar clip / Delete clip",
                "✨ ¡Bienvenido a CyberPaste! / Welcome to CyberPaste!",
                "CyberPaste.exe",
            ),
            (
                "text",
                "🎨 Paleta CyberNeon (Detección de colores):\n#00f2fe  Cyan Glow\n#4facfe  Electric Blue\n#a855f7  Neon Purple\n#ec4899  Cyber Pink\n#10b981  Emerald Bright",
                "🎨 Paleta CyberNeon: #00f2fe #4facfe #a855f7 #ec4899 #10b981",
                "Figma.exe",
            ),
            (
                "code",
                "// 🚀 CyberPaste: Modern Clipboard Manager\nexport interface ClipboardClip {\n  id: string;\n  type: 'text' | 'image' | 'code' | 'url';\n  content: string;\n  isPinned: boolean;\n  createdAt: Date;\n}",
                "// 🚀 CyberPaste: Modern Clipboard Manager",
                "Code.exe",
            ),
            (
                "url",
                "https://github.com/CyberGems/CyberPaste",
                "https://github.com/CyberGems/CyberPaste",
                "chrome.exe",
            ),
            (
                "text",
                "# 💎 CyberPaste — Productividad sin límites\n\n- ⚡ **Ultra-rápido**: Motor nativo en Rust + SQLite local\n- 🔒 **100% Privado**: Tus datos nunca salen de tu equipo\n- 📁 **Carpetas**: Organiza clips arrastrando o con menús\n- 👁️ **Peek Popover**: Pasa el cursor en modo compacto para previsualizar\n- 🤖 **Acciones IA**: Resume, traduce o analiza código localmente",
                "# 💎 CyberPaste — Productividad sin límites",
                "Obsidian.exe",
            ),
            (
                "code",
                "{\n  \"app\": \"CyberPaste\",\n  \"version\": \"1.14.0\",\n  \"theme\": \"cyberpaste\",\n  \"storage\": \"sqlite_local\",\n  \"offline_first\": true\n}",
                "{\n  \"app\": \"CyberPaste\",\n  \"version\": \"1.14.0\"...",
                "Code.exe",
            ),
            (
                "code",
                "# CyberPaste: Modern & Lightweight Clipboard Tool\nnpm run dev",
                "# CyberPaste: Modern & Lightweight Clipboard Tool",
                "WindowsTerminal.exe",
            ),
        ];

        for (idx, (clip_type, content, preview, source_app)) in sample_clips.iter().enumerate() {
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
                VALUES (?, ?, ?, ?, ?, NULL, 0, 0, ?, NULL, NULL, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#,
            )
            .bind(&clip_uuid)
            .bind(clip_type)
            .bind(content_bytes)
            .bind(preview)
            .bind(&hash)
            .bind(source_app)
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
