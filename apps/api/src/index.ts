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

// Dev fallback: if running dev server and BETTER_AUTH_SECRET is not configured, provide a dev secret
if (!process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
	process.env.BETTER_AUTH_SECRET = "excited-live-dev-secret-better-auth-solopreneur-2026"
	console.log("[excited-live-api] BETTER_AUTH_SECRET not set; configured default dev secret.")
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
