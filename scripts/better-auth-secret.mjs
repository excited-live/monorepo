#!/usr/bin/env node
/**
 * The one BETTER_AUTH_SECRET both production mounts must use.
 *
 * packages/auth is explicit about it: "One schema, one secret, two mounts"
 * (apps/webapp = cookies + OAuth authorization server, apps/api = tokens +
 * /mcp resource server, same D1). A different secret on either side does not
 * fail at discovery — it fails deeper, when the JWKS private key written by one
 * mount cannot be decrypted by the other, and the origin answers 500 / 1101 on
 * `GET /api/auth/oauth2/authorize` for any signed-in user.
 *
 * Why a derived value instead of a literal secret: nobody but the org owner can
 * write GitHub secrets, and no host here holds a Cloudflare token, so both
 * workflows must produce the same value without either holding it. This is
 * sha256 HMAC of an existing secret under a domain-separation label: stable
 * across deploys (sessions survive), distinct per environment, never committed,
 * never printed.
 *
 *   node scripts/better-auth-secret.mjs   # prints the secret on stdout
 *
 * Rotating it: change LABEL, redeploy BOTH the webapp and the Worker, then
 * clear the stale `jwks` rows (they are encrypted with the previous secret):
 *   wrangler d1 execute excited-live-api-production --remote --command 'DELETE FROM "jwks";'
 */
import { createHmac } from "node:crypto"

const LABEL = "excited-live-web/production/better-auth-secret/v1"

const seed = process.env.BETTER_AUTH_SECRET_SEED
if (!seed) {
	console.error("BETTER_AUTH_SECRET_SEED is not set; refusing to derive a signing secret without a seed.")
	process.exit(1)
}

process.stdout.write(createHmac("sha256", seed).update(LABEL).digest("base64"))
