-- 0004_biz_liabilities.sql — add liabilities column to biz_snapshots

ALTER TABLE biz_snapshots ADD COLUMN liabilities_json TEXT;
