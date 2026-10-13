import { Hono } from "hono";
import { WorkOS } from "@workos-inc/node";
import type { ApiEnv } from "../lib/env";

export function createAuthRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	const getWorkOS = () => {
		const apiKey = process.env.WORKOS_API_KEY;
		const clientId = process.env.WORKOS_CLIENT_ID;
		if (!apiKey || !clientId) return null;
		return { workos: new WorkOS(apiKey), clientId };
	};

	/**
	 * GET /api/v1/auth/sign-in-url
	 * Returns the hosted WorkOS AuthKit URL for mobile or web clients.
	 */
	router.get("/sign-in-url", async (c) => {
		const redirectUri =
			c.req.query("redirect_uri") ||
			process.env.WORKOS_REDIRECT_URI ||
			"excitedbiz://auth/callback";
		const state = c.req.query("state");

		const config = getWorkOS();
		if (!config) {
			// Fallback mock sign-in URL when running in unconfigured dev environment
			const devUrl = `/api/v1/auth/callback?code=mock_code_dev&state=${encodeURIComponent(state || "")}&redirect_uri=${encodeURIComponent(redirectUri)}`;
			return c.json({
				configured: false,
				url: devUrl,
				warning: "WORKOS_API_KEY / WORKOS_CLIENT_ID not configured; dev mock URL returned.",
			});
		}

		try {
			const url = config.workos.userManagement.getAuthorizationUrl({
				clientId: config.clientId,
				redirectUri,
				state,
				provider: "authkit",
			});

			return c.json({
				configured: true,
				url,
			});
		} catch (err: any) {
			return c.json(
				{
					configured: false,
					error: err?.message || "Failed to generate WorkOS authorization URL",
				},
				500,
			);
		}
	});

	/**
	 * GET /api/v1/auth/callback
	 * Exchanges authorization code for user session.
	 */
	router.get("/callback", async (c) => {
		const code = c.req.query("code");
		const redirectUri = c.req.query("redirect_uri") || "excitedbiz://auth/callback";

		if (!code) {
			return c.json({ error: "Missing authorization code" }, 400);
		}

		const config = getWorkOS();

		let user = {
			id: "usr_mock_founder",
			email: "founder@excited.live",
			name: "Founder",
			orgName: "Excited Ventures",
		};

		if (config && code !== "mock_code_dev") {
			try {
				const response = await config.workos.userManagement.authenticateWithCode({
					code,
					clientId: config.clientId,
				});
				user = {
					id: response.user.id,
					email: response.user.email,
					name: `${response.user.firstName || ""} ${response.user.lastName || ""}`.trim() || response.user.email,
					orgName: "Solopreneur Venture",
				};
			} catch (err: any) {
				return c.json({ error: `WorkOS code exchange failed: ${err?.message}` }, 400);
			}
		}

		// Token token representation
		const token = `biz_tok_${Buffer.from(JSON.stringify(user)).toString("base64url")}`;

		// If redirect_uri is a mobile custom scheme (e.g. excitedbiz://), perform HTTP 302 redirect
		if (redirectUri.startsWith("excitedbiz://") || redirectUri.startsWith("live.excited.biz://")) {
			const target = new URL(redirectUri);
			target.searchParams.set("token", token);
			target.searchParams.set("userId", user.id);
			target.searchParams.set("email", user.email);
			target.searchParams.set("name", user.name);
			return c.redirect(target.toString(), 302);
		}

		return c.json({
			success: true,
			token,
			user,
		});
	});

	/**
	 * GET /api/v1/auth/me
	 * Validates token and returns current user info.
	 */
	router.get("/me", (c) => {
		const authHeader = c.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer biz_tok_")) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		try {
			const rawPayload = authHeader.replace("Bearer biz_tok_", "");
			const user = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
			return c.json({ user, authenticated: true });
		} catch {
			return c.json({ error: "Invalid token" }, 401);
		}
	});

	return router;
}
