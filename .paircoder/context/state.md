# Current State

> Last updated: 2026-04-01

## Status: UA-P2 Complete — 212 Tests

## Active Plan

**Plan:** plan-2026-04-ua-phase2 — Unified Auth Phase 2
**Type:** feature
**Current Sprint:** UA-P2
**Tasks:**
- [x] UA2.1 — OAuth Login Flow (P0, 65cx) — done
- [x] UA2.2 — License Link Prompt (P0, 40cx, depends: UA2.1) — done
- [x] UA2.3 — Portal JWT for A2A Calls (P0, 40cx, depends: UA2.1) — done

**Trello:** 3 cards synced to Planned/Ready

## What Was Just Done

- **UA2.3 done** (auto-updated by hook)

- **UA2.3 Portal JWT for A2A Calls COMPLETE** (211→212 tests, +8 new, -7 removed) (2026-04-01)
  - Rewrote `src/lib/a2a-auth.ts` — replaced operator-token fetch with synchronous portal JWT forwarding
  - New: `getProxyAuth(request)` helper reads `cc_access_token` cookie, returns auth headers or 401
  - Updated all 7 A2A proxy routes (feed, agents, metis, ack, sessions, sessions/[id], sessions/[id]/resume)
  - Removed: `PAIRCODER_API_URL` and `LICENSE_ID` from `src/lib/config.ts`
  - Production: 401 if no portal JWT cookie; Dev: proceeds with warning (no Bearer header)
  - New test file: `tests/portal-jwt-proxy.test.ts` — JWT forwarding, 401 enforcement, dev fallback

- **UA2.2 License Link Prompt COMPLETE** (184→211 tests, +27 new) (2026-04-01)
  - New: `src/lib/license.ts` — `hasLicenseInJwt()`, `getLicenseStatusFromCookie()`, `linkLicense()`
  - New: `POST /api/license/link` — proxies license key to bpsai-support `/users/me/license`
  - New: `POST /api/auth/refresh-session` — force-refresh JWT and update all cookies
  - New: `LicenseLinkModal` component — modal with license key input, submit, skip, error display
  - Updated: middleware sets `cc_has_license` cookie on every auth'd request
  - Updated: callback route sets `cc_has_license` after OAuth login
  - Updated: logout clears `cc_has_license` cookie
  - Updated: `page.tsx` shows LicenseLinkModal when no license_id in JWT

- **UA2.1 done** (auto-updated by hook) (2026-04-01)

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

1. UA-P2 Sprint complete — all 3 tasks done (OAuth, License Link, Portal JWT)
2. Ready for branch merge / PR creation

