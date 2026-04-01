# Current State

> Last updated: 2026-04-01

## Status: UA-P2 In Progress — 184 Tests

## Active Plan

**Plan:** plan-2026-04-ua-phase2 — Unified Auth Phase 2
**Type:** feature
**Current Sprint:** UA-P2
**Tasks:**
- [x] UA2.1 — OAuth Login Flow (P0, 65cx) — done
- [ ] UA2.2 — License Link Prompt (P0, 40cx, depends: UA2.1) — pending
- [ ] UA2.3 — Portal JWT for A2A Calls (P0, 40cx, depends: UA2.1) — pending

**Trello:** 3 cards synced to Planned/Ready

## What Was Just Done (2026-04-01)

- **UA2.1 OAuth Login Flow COMPLETE** (153→184 tests, +31 new)
  - Replaced Basic Auth middleware with Zoho OAuth PKCE + portal JWT session cookies
  - New: `src/lib/oauth.ts`, `src/lib/auth-middleware.ts`, `src/lib/auth-handlers.ts`
  - Login page `/login`, callback `/auth/callback`, logout `/api/auth/logout`
  - httpOnly secure cookies: access token (30min) + refresh token (12hr)
  - Auto-refresh in middleware when token ≤2min from expiry
  - Operator name from JWT `display_name` claim in header
  - Removed: Basic Auth middleware, `AUTHORIZED_USERS` env var
  - New env vars: `ZOHO_CLIENT_ID`, `SUPPORT_API_URL`

- **UA-P2 Plan Created** — Unified Auth Phase 2: OAuth Login + License Link + Portal JWT

## What Was Just Done (2026-03-31)

- **CC-FIX Sprint COMPLETE** (3/3 tasks, 0->21 tests)
  - CCF.1: Auth colon-in-password fix, timing-safe comparison, production guard, ack proxy, input validation on Anthropic endpoint, A2A_BASE_URL env var, limit param validation
  - CCF.2: SSE interval leak fix, shared useFeedMessages hook, max connection duration, keepalive
  - CCF.3: vitest setup + 21 tests, security headers, rehype-sanitize on ReactMarkdown, .dockerignore, shared formatTime, README

- **CC-S4 Sprint COMPLETE** (5/5 tasks, 21->116 tests)
  - T2.1: Per-user basic auth with AUTHORIZED_USERS env var, operator cookie, x-operator header propagation, logout
  - T2.2: localStorage chat persistence keyed by operator, session sidebar, new/clear/restore
  - T2.3: A2A session catalog endpoint (POST/GET/PATCH /sessions) — shipped in bpsai-a2a
  - T2.4: Session catalog UI panel with status badges, auto-refresh, detail view, operator filtering
  - T2.5: Resume dispatch — resume button, operator ownership check, resumability validation, error handling

- **CC-S4-FIX Sprint COMPLETE** (2/2 tasks, 116->153 tests, via bpsai-pair engage)
  - CCSF.1: crypto.timingSafeEqual with HMAC, operator scoping enforcement, session_id encoding, PATCH allowlist, remove x-operator from Anthropic, SSE force-dynamic
  - CCSF.2: Shared config.ts, deduplicated getOperator, useState+useEffect for cookies, QuotaExceededError handling, CSP documented

## What's Next

1. UA2.2: License Link Prompt + UA2.3: Portal JWT for A2A Calls (can run in parallel)

