# Waitlist → Twenty CRM

The landing page form POSTs to `https://leads.fromsukong.com/waitlist`
(Cloudflare Worker `excited-waitlist`, source in the `leadgen` repo).

Each signup becomes a **Person** in Twenty CRM with:

- `leadSource`: `waitlist_<source>_<lang>` (e.g. `waitlist_hero_th`)
- `leadStatus`: `WAITLIST`
- `leadScore`: `70` (inbound intent outranks cold open-data leads)
- `leadDedupeKey`: `waitlist:<lowercased email>` — resubmits are ignored

If the Worker is unreachable the form keeps the email in the visitor's
`localStorage` (`exl-waitlist-local`) and shows an error. Nothing re-sends that
entry automatically — it is a local record only.

## Endpoint contract

`POST /waitlist` — JSON body:

```json
{
  "email": "user@example.com",
  "lang": "en",
  "source": "hero",
  "page": "/",
  "sentAt": "2026-10-07T12:00:00.000Z"
}
```

- `200 { "ok": true }` — stored, or already on the list
- `400 { "ok": false, "error": "invalid_email" }` — bad address
- `502 { "ok": false, "error": "crm_unavailable" }` — Twenty rejected the write

CORS allowlist: `excited.live`, `www.excited.live`, `prelive.excited.live`,
`excited-live-landing.pages.dev` (production landing project), and
`localhost:4321`. The PR-preview project
(`<branch>.excited-live-landing-preview.pages.dev`) and the landing prelive
project (`excited-live-landing-prelive.pages.dev`) are **not** on the Worker
allowlist yet, so form posts from those origins fail CORS.

## Env

`PUBLIC_WAITLIST_WEBHOOK_URL` overrides the endpoint at build time. No landing
workflow sets it today, so every environment uses the default above.
`PUBLIC_N8N_WAITLIST_WEBHOOK` is still read as a second fallback for old build
environments — leave it unset so signups never route to the retired n8n
webhook.

## Notes

- `waitlist-workflow.json` in this folder is the retired n8n workflow, kept for
  history only; nothing reads it.
- Honeypot field (`company_website`) is filled by bots only; the form ignores
  submissions that fill it client-side, so it never reaches the Worker.
