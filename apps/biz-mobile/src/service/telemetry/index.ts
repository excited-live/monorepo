/**
 * Telemetry — the one client helper for the week-one loop (#102, amendment 2 R6).
 *
 * The metric this exists for (Week-1 Return Rate) is unmeasurable without these
 * events, but the sink is not built yet: the published API has no events path.
 * So the helper ships dark and every surface calls `track()` normally.
 *
 * Rules of record:
 *  - Exactly one client helper. No surface imports an SDK or calls `fetch`.
 *  - Event names and properties are the design contract. Renaming one is a
 *    break; adding one is a design change (spec §6).
 *  - Nothing here may throw into a render path: telemetry never costs a tap.
 *
 * The endpoint is `POST {endpoint}` with `{ events: [...] }`, one authenticated
 * batch, matching amendment 1 §3. Enable it by setting `VITE_EVENTS_ENDPOINT`.
 */

export type TelemetryEventName =
	| "app_open"
	| "week_strip_view"
	| "projection_refresh"
	| "decision_view"
	| "decision_accept"
	| "decision_adjust"
	| "decision_dismiss"
	| "checkin_submit"
	| "recap_view"
	| "notification_sent"
	| "notification_open";

export type TelemetryProperties = Record<string, string | number | boolean | null>;

export interface TelemetryEvent {
	name: TelemetryEventName;
	props: TelemetryProperties;
	/** ISO timestamp, stamped when the event happened, not when it was sent. */
	at: string;
}

/** Small enough to flush on the next open, large enough to be one request. */
const MAX_BATCH = 25;

let endpoint: string | null = readEndpoint();
let queue: TelemetryEvent[] = [];

function readEndpoint(): string | null {
	// `import.meta.env` is Vite's compile-time environment. Unset → dark.
	const configured = import.meta.env.VITE_EVENTS_ENDPOINT;
	return typeof configured === "string" && configured.length > 0 ? configured : null;
}

/** Test/entry-point seam; also lets a future shell point at a different sink. */
export function configureTelemetry(options: { endpoint: string | null }): void {
	endpoint = options.endpoint;
	if (!endpoint) queue = [];
}

/** True when events are actually being collected — never used to gate UI. */
export function isTelemetryEnabled(): boolean {
	return endpoint !== null;
}

/**
 * Record one event. Safe to call from an event handler or an effect: it never
 * throws and never awaits, so a dropped batch cannot break the surface.
 */
export function track(name: TelemetryEventName, props: TelemetryProperties = {}): void {
	if (!endpoint) return;
	queue.push({ name, props, at: new Date().toISOString() });
	if (queue.length >= MAX_BATCH) void flushTelemetry();
}

/** Send what is queued. Failures drop the batch rather than retry forever. */
export async function flushTelemetry(): Promise<void> {
	if (!endpoint || queue.length === 0) return;
	const batch = queue;
	queue = [];
	try {
		await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ events: batch }),
			keepalive: true,
		});
	} catch {
		// Deliberately silent: a network failure must not surface to the person.
	}
}

/** Test-only: drop anything queued without sending it. */
export function resetTelemetryForTest(): void {
	queue = [];
	endpoint = null;
}
