# Architecture: model resources (DeepSeek V4.1 Flash and the `clef` decision model)

> **Status**: 2026-10-25, Ada (Tech Lead), from Prame's direction relayed by Srettha. This note covers planning, specs, PRs and copy. It does not change the 10-31 launch scope (#75, #65): nothing below ships before launch unless an issue says so.

## 1. What we have

| Resource | What it is | Limits we know | Status |
|---|---|---|---|
| **DeepSeek V4.1 Flash** (OpenCode Go, `opencode-go/deepseek-v4.1-flash#max`) | General chat/coding LLM | Close to unlimited, up to ~25M tokens/min. Not rationed. | In daily use as the OpenCode subagent pin (AGENTS.md rule 8) |
| **`clef` / `clef-flash`** (Experiential Labs, "decision model" tab in the Maus app) | A **decision model, not a chat model**. `POST https://api.experientiallabs.ai/v1/systemone` with `model`, a `state` (context text) and typed questions | ~32k input tokens and up to 32 questions per call; 30–120 req/min; near-free | Tested and working by Prame |

`clef` question types:

- `noul`: yes/no, returns a probability (e.g. "Is this transaction unusual for this user?").
- `choice`: picks one option from a criteria map (e.g. which expense category).
- `score`: rates the state against criteria (e.g. budget health 0–1).

## 2. Rules

1. **Deterministic engines stay the source of truth.** Money, tax and simulation math lives in `packages/*` and is never decided by a model (PRD layer 2). Models *suggest* labels, flags and next steps; engines compute numbers.
2. **Model output is a probability, not a fact.** Every decision call has a threshold, a fallback, and a user-visible "suggested" state until the user (or their agent) confirms. Nothing a model returns writes to tax fields or ledger amounts without confirmation.
3. **Server-side only.** `clef` is called from `apps/api` (Workers), never from webapp, iam, biz-mobile or the landing page. Its key is a Worker secret (`wrangler secret put`, Infra owns it); configs name the variable, never the value (AGENTS.md rule 2).
4. **Always degrade.** A timeout, 4xx/5xx, rate limit or low-confidence answer returns the non-AI path (no suggestion, the rule-based default, or "uncategorised"). A decision call must never make a request fail.
5. **Batch questions.** One call carries up to 32 questions, so ask everything about one state together instead of one call per question. That keeps us well inside 30–120 req/min.
6. **Don't ration DeepSeek.** Use it freely for build-time work: extra review and test passes, parallel exploration agents, evals, synthetic Thai test data, EN/TH copy drafts and translation checks.
7. **User data leaves our boundary only with consent.** Sending a user's transactions to a third-party model is a privacy decision (Thai PDPA). Before the first production feature that sends user data to `clef` or DeepSeek, the privacy policy and consent copy must cover it. Send the minimum fields (amount, date, merchant text, existing category list), never names, account numbers or slip images.
8. **Reversible by design.** Product code talks to an internal `DecisionClient` interface, not the vendor API, so we can swap `clef` for another model or a rule set without touching features.

## 3. Where a decision call helps (candidates, ranked)

| # | Feature | Question type | Why a model beats rules here | Deterministic fallback | Start threshold |
|---|---|---|---|---|---|
| 1 | **Expense category suggestion** on create via REST/MCP/slip (`category` is free text today) | `choice` over the user's own categories plus defaults | Thai merchant strings are messy; a rule table won't keep up | Keep the agent's or user's value; else "uncategorised" | auto-fill as *suggested* at p ≥ 0.8, never overwrite a given value |
| 2 | **Income tax-type hint** (`taxCategory` 40(1)–40(8)) | `choice` | Users don't know which 40(x) applies | No hint | Show as a hint only, at p ≥ 0.9. Never applied silently: it changes tax math |
| 3 | **Unusual-transaction / normality check** (duplicate slip, outlier amount, recurring bill counted twice) | `noul` | Context-dependent ("normal for this user?") | An exact-match rule (same amount, date and merchant) | Flag at p ≥ 0.7, as a question to the user, not a block |
| 4 | **Budget / runway health** in the command center | `score` against stated criteria | Gives a readable "how am I doing" next to the engine's numbers | Engine metrics only (runway months, burn) | Display the band, not the raw number; the engine number stays primary |
| 5 | **Next-best-action** after onboarding is complete | `choice` among allowed actions | Picks among several valid next steps from the user's state | The fixed onboarding order | Only after the 6 fixed onboarding steps; the onboarding order itself stays deterministic (`get_onboarding_status`) |
| 6 | **Agent-write safety check** on MCP writes (does this staged action match what the user asked?) | `noul` | Second opinion on BYOA writes | Existing scope checks | Advisory log first, enforce only after evals |

**Not a fit:** anything computed (balances, tax, simulation, depreciation), auth or permission decisions, and the 6-step onboarding order. Rules already answer those exactly.

**Note on BYOA:** the user's own agent is the first-class client, and it usually already has an LLM. Server-side `clef` calls add value where *we* hold context the agent doesn't (the user's full history, our category set, tax rules), and where a cheap, consistent answer beats asking the agent to reason every time.

## 4. Shape of the integration (for the first feature that needs it)

- `apps/api/src/modules/decision/`: `DecisionClient` interface plus a `clef` implementation with a hard timeout (start at 1.5 s), no retries on the request path, and a per-isolate circuit breaker after repeated failures. Every result returns `{ answer, probability, source: "clef" | "fallback", reason? }`.
- Pure parts (question builders, threshold policy, mapping answers to our enums) go in a `packages/*` module with no network (AGENTS.md rule 3) and are unit-tested.
- Prompt/state builders are versioned (`v1`, `v2`) so evals compare like with like.
- Log the probability and source (not the user data) so thresholds can be tuned from real traffic.
- A test double that returns fixed probabilities, so the API tests never hit the network.

## 5. Test expectations (every decision-backed feature)

- Above threshold → the suggestion shows as *suggested*. Below threshold → the fallback path.
- Timeout, 5xx, 429 and malformed responses → fallback, and the request still succeeds.
- A user-given value is never overwritten.
- Tax- and money-affecting suggestions need explicit confirmation.
- An offline eval set (synthetic Thai transactions, generated freely with DeepSeek, labelled once by a human) with a target accuracy before the threshold is lowered.

## 6. Open items

- **DeepSeek at product runtime.** Our access is through OpenCode Go, which we use as a coding-agent harness. Whether we may call it from `apps/api` for user-facing features (endpoint, terms, uptime) is not confirmed. Until it is, DeepSeek is a build-time resource, and runtime AI features use `clef` or the user's own agent.
- **`clef` production terms and data retention**: confirm before user data is sent (rule 7).
- **Secret**: the `clef` key needs to be a Gitea/Worker secret owned by Infra before any feature work starts.
