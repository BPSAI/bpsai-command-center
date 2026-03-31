# Command Center Post-Review Fixes — Security + Quality

> **Budget:** ~30cx
> **Depends on:** CC-S1/S2/S3 complete, code review findings
> **Repo:** bpsai-command-center
> **Sprint ID:** CC-FIX

---

## Context

Two independent code reviews identified 3 P0 blockers and 7 P1 issues. The P0s are an auth bypass (colon in password), a client-side direct API call leaking the upstream URL, and an SSE interval leak. These must be fixed before CC-S4 adds more functionality on top.

---

### CCF.1 — Auth + API Security Fixes | Cx: 10 | P0

**Description:** Fix the auth parsing bug, move the direct external API call behind a server-side proxy, and add input validation on the Anthropic chat endpoint.

**Findings addressed:** P0-1 (colon split), P0-2 (direct external ack call), P1-5 (no input validation on /api/computer)

**AC:**
- [ ] Basic auth password parsing uses indexOf to split on first colon only, not split(":")
- [ ] NotificationCenter ack call routed through new /api/ack server-side proxy endpoint (not direct to a2a.paircoder.ai from browser)
- [ ] /api/computer validates messages array: max 50 messages, max 32KB content per message, role must be "user" or "assistant"
- [ ] /api/computer returns 400 for malformed JSON body (try/catch on request.json())
- [ ] A2A_BASE_URL extracted to single env var, used across all 3 API routes (feed, agents, metis) + new ack route
- [ ] Auth guard: throw/return 500 if BASIC_AUTH_PASS is empty when NODE_ENV=production (never silently disable auth in prod)
- [ ] Validate limit param in /api/metis as integer, clamp to 1-100 range (prevent param injection to upstream)
- [ ] Strip or omit details field from 502 response in /api/computer (don't forward raw Anthropic error bodies)
- [ ] Use crypto.timingSafeEqual for credential comparison instead of === (SEC-003)
- [ ] Remove default username "captain" fallback — require BASIC_AUTH_USER env var (SEC-008)
- [ ] Use URLSearchParams to build upstream URLs in metis route instead of string interpolation (prevent query injection)
- [ ] Tests: auth with colon-in-password works, ack proxied server-side, invalid messages rejected with 400, production auth guard, limit validation

### CCF.2 — SSE Stream Fixes | Cx: 10 | P0

**Description:** Fix the SSE interval leak on early client disconnect, deduplicate SSE logic between ActivityFeed and NotificationCenter.

**Findings addressed:** P0-3 (interval leak), P1-4 (duplicated SSE), P1-6 (unbounded polling), P1-8 (SSE never terminates)

**AC:**
- [ ] SSE cleanup uses closure variable for intervalId instead of monkey-patching stream object
- [ ] SSE stream has max connection duration (5 minutes) with periodic keepalive comments
- [ ] Shared useFeedMessages hook extracted — single EventSource for both ActivityFeed and NotificationCenter
- [ ] FeedMessage interface and severity mapping defined once in shared module
- [ ] Tests: SSE cleanup fires on early disconnect, max duration terminates stream

### CCF.3 — Quality + DX Fixes | Cx: 10 | P1

**Description:** Fix remaining P1/P2 quality issues: zero test coverage, dead code, Dockerfile, hardcoded model.

**Findings addressed:** P1-9 (zero tests), P2 items (unused dep, dead CSS, Dockerfile, hardcoded model, README)

**AC:**
- [ ] Remove unused react-resizable-panels dependency
- [ ] Remove dead --font-sans CSS variable referencing undefined --font-geist-sans
- [ ] Add .dockerignore (node_modules, .git, .next)
- [ ] Anthropic model name from env var COMPUTER_MODEL with default
- [ ] Extract shared formatTime/formatDate into src/app/lib/format.ts
- [ ] Add vitest config and at least: middleware auth tests, /api/computer input validation tests, formatTime unit tests
- [ ] Add rehype-sanitize plugin to ReactMarkdown in ComputerChat.tsx (SEC-005)
- [ ] Add security headers in next.config.ts: CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy (SEC-007)
- [ ] README updated with project description, env vars, deployment

---

## Summary

| Task | Title | Cx | Priority | Phase |
|------|-------|----|----------|-------|
| CCF.1 | Auth + API Security Fixes | 10 | P0 | 1 |
| CCF.2 | SSE Stream Fixes | 10 | P0 | 1 |
| CCF.3 | Quality + DX Fixes | 10 | P1 | 1 |
| **Total** | | **30** | | |

### Execution Order

```
Phase 1 (all parallel):
  CCF.1 (auth + API security)
  CCF.2 (SSE fixes)
  CCF.3 (quality + tests)
```

---

## Validation

After this sprint:
1. Login with password containing colon -> works
2. Notification ack -> no direct browser call to a2a.paircoder.ai (check Network tab)
3. POST /api/computer with 100 messages -> 400 rejected
4. Open two tabs -> single SSE connection shared (check server logs)
5. SSE connection -> auto-terminates after 5 minutes
6. npm test -> vitest suite passes
