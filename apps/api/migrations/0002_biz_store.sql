-- 0002_biz_store.sql — Excited.Biz solopreneur data store

CREATE TABLE IF NOT EXISTS biz_snapshots (
	user_id TEXT PRIMARY KEY,
	accounts_json TEXT NOT NULL,
	subscriptions_json TEXT NOT NULL,
	hardware_json TEXT NOT NULL,
	revenues_json TEXT NOT NULL,
	transfers_json TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
