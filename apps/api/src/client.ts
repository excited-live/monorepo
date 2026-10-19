/**
 * Export AppType and module routers for client RPC type sharing (Hono RPC hc<Type>).
 * Mobile app or other frontends can import these types strictly as `import type { ... } from ...`
 */
export type { AppType } from "./app";
export type { AccountingRouter } from "./modules/accounting/route/accounting.routes";
export type { UserOnboarding } from "./routes/onboarding";
