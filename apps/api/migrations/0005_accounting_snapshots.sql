-- 0005_accounting_snapshots.sql — clean accounting data store with optimistic versioning

CREATE TABLE IF NOT EXISTS accounting_snapshots (
	user_id TEXT PRIMARY KEY,
	snapshot_json TEXT NOT NULL,
	version INTEGER NOT NULL DEFAULT 1,
	updated_at TEXT NOT NULL
);
