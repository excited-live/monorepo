-- RFC 8628 device authorization (Better Auth deviceAuthorization plugin) for
-- the agent sign-in link. Apps/api/migrations/0001_init.sql already ships the
-- table for fresh databases via packages/auth gen:schema; this migration adds
-- it to databases created before the plugin was enabled (the 0001 block is
-- recorded as applied and is never re-run). IF NOT EXISTS makes it a no-op on
-- fresh databases.
create table if not exists "deviceCode" ("id" text not null primary key, "deviceCode" text not null, "userCode" text not null, "userId" text, "expiresAt" date not null, "status" text not null, "lastPolledAt" date, "pollingInterval" integer, "clientId" text, "scope" text);

create unique index if not exists "deviceCode_deviceCode_uidx" on "deviceCode" ("deviceCode");

create unique index if not exists "deviceCode_userCode_uidx" on "deviceCode" ("userCode");
