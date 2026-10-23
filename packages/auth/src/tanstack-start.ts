/**
 * TanStack Start cookie integration, on its own subpath.
 *
 * `better-auth/tanstack-start` reaches into `@tanstack/react-start-server` and
 * TanStack Start's virtual modules (`#tanstack-start-entry`,
 * `tanstack-start-manifest:v`), which only exist inside a Vite build. Keeping
 * it on a subpath means only the webapp pulls it in: the `tokens` mount
 * (`apps/api`, bundled for the Workers runtime) never sees TanStack at all.
 *
 * Usage (webapp only):
 *
 *   import { createAuth } from "@excited-live/auth"
 *   import { tanstackStartCookies } from "@excited-live/auth/tanstack-start"
 *
 *   createAuth({ mount: "cookies", cookiesPlugin: tanstackStartCookies(), … })
 */
export { tanstackStartCookies } from "better-auth/tanstack-start"
