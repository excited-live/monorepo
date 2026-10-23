# Waitlist → Twenty CRM

The landing page form POSTs to `https://leads.fromsukong.com/waitlist`
(Cloudflare Worker `excited-waitlist`; the Worker source lives in
`leadgen/worker/waitlist` on hs1, not in this repo).

Each signup becomes a **Person** in Twenty CRM with:

- `leadSource`: `waitlist_<source>_<lang>` (e.g. `waitlist_hero_th`)
- `leadStatus`: `WAITLIST`
- `leadScore`: `70` (inbound intent outranks cold open-data leads)
- `leadDedupeKey`: `waitlist:<lowercased email>` — resubmits return
  `{ "ok": true, "duplicate": true }` and write nothing
- `jobTitle`: the page path from the payload (Twenty has no dedicated page
  field, so the Worker stores it there)
- `leadSignals`: the optional `context` string, truncated to 160 chars, or null

If the Worker is unreachable the form keeps the email in the visitor's
`localStorage` (`exl-waitlist-local`) and shows an error. That list is a local
record only — nothing re-sends it automatically.

## Endpoint contract

`POST /waitlist` — JSON body:

```json
{
  "email": "user@example.com",
  "lang": "en",
  "source": "hero",
  "page": "/",
  "context": "optional free text"
}
```

`sentAt` is ignored by the Worker; the form does not send it. `source` is
truncated to 24 chars, `lang` to 4, `page` to 120, `context` to 160.

- `200 { "ok": true }` — stored
- `200 { "ok": true, "duplicate": true }` — already on the list
- `400 { "ok": false, "error": "invalid_email" }` — bad address (also
  `bad_json` for an unparseable body)
- `405 { "ok": false, "error": "method_not_allowed" }` — not a POST
- `502 { "ok": false, "error": "crm_unavailable", "detail": "…" }` — Twenty
  rejected the write

The form maps `400 invalid_email` to its inline validation message; `502` and
network failures fall back to the on-device record.

CORS allowlist: `excited.live`, `www.excited.live`, `prelive.excited.live`, the
production landing project (`excited-live-landing.pages.dev`), the landing
prelive project (`excited-live-landing-prelive.pages.dev`), PR previews
(`<branch>.excited-live-landing.pages.dev` and
`<branch>.excited-live-landing-preview.pages.dev`), and `localhost:4321`.

## Env

`PUBLIC_WAITLIST_WEBHOOK_URL` overrides the endpoint at build time. No landing
workflow sets it today, so every environment uses the default above. An empty
value is ignored (`||`, not `??`), so a blank override cannot POST to nowhere.

## Notes

- Honeypot field (`company_website`) is filled by bots only; the form ignores
  submissions that fill it client-side, so it never reaches the Worker.
- The retired n8n workflow JSON was removed from this folder when n8n was shut
  down (2026-10-19); it stays in git history only.
