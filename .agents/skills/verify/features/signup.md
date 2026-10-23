# Sign up

## Sub-features

- Email and password account creation with the terms checkbox.
- Session token stored in the browser and accepted by the API.

## How to get to it (user POV)

Open the app signed out. The sign-in screen shows "Sign In" and "Create Account" tabs. Pick "Create Account", fill name, email, password, tick the terms, press "Create Cloud Account". The app lands on Home ("Consolidated Wealth", "Let's get started").

## Driving it with Playwright

`node .agents/skills/verify/scripts/drive.mjs signup`

Selectors: `getByRole("button", { name: "Create Account" })`, `getByLabel("Full Name or Business Name" | "Email" | "Password")`, `getByRole("checkbox")`, `getByRole("button", { name: "Create Cloud Account" })`. Done when the Email field detaches.

End state checked: a token is in browser storage, and `GET /api/v1/settings` with it returns 200.

## Gotchas

- The API enforces auth in dev (a default dev `BETTER_AUTH_SECRET` is set in `apps/api/src/index.ts`), so every journey needs a real signed-up user. There is no `x-user-id` shortcut.
