import { serve } from "@hono/node-server"
import { createApp } from "./app"
import { getDb } from "./db"

// Load local environment files if present
if (typeof process.loadEnvFile === "function") {
	try {
		process.loadEnvFile()
	} catch {
		// Ignore if no .env in cwd
	}
	try {
		const envPath = new URL("../.env", import.meta.url)
		process.loadEnvFile(envPath)
	} catch {
		// Ignore if no .env in package dir
	}
}

// No fallback secret, ever. Until 2026-10-24 this file filled in a hardcoded
// development secret that is committed to this public repository, so a process
// that forgot the env var silently signed sessions with a string anyone could
// read (#140). A missing secret now fails at boot instead.
//
// Local development gets it from apps/api/.env (git-ignored; see
// .env.example, `openssl rand -base64 32`). Tests set it per case.
if (!process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV !== "test") {
	console.error(
		"[excited-live-api] BETTER_AUTH_SECRET is not set. Refusing to start: sessions and OAuth grants must never be signed with a built-in default. Copy apps/api/.env.example to apps/api/.env and set a unique secret.",
	)
	process.exit(1)
}

const app = createApp()

const port = Number(process.env.PORT) || 8000

if (process.env.NODE_ENV !== "test") {
	try {
		// Open (and migrate) the database before accepting traffic: a broken
		// database should fail loudly at boot, not silently serve volatile data.
		const db = await getDb()
		console.log(`[excited-live-api] persistence: ${db.mode} (${db.location})`)
		if (db.migrations.length > 0) {
			console.log(`[excited-live-api] migrations applied: ${db.migrations.join(", ")}`)
		}
	} catch (error) {
		console.error("[excited-live-api] persistence unavailable:", error)
		console.error(
			"[excited-live-api] set EXCITED_API_DB_PATH to a writable file, or bind a D1 database to DB.",
		)
		process.exit(1)
	}

	console.log(`[excited-live-api] Running on http://localhost:${port}`)
	serve({
		fetch: app.fetch,
		port,
	})
}

export default app
