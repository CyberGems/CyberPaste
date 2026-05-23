use sqlx::SqlitePool;

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn new(db_path: &str) -> Self {
        let options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true);

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
