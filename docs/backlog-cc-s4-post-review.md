# Command Center S4 Post-Review Fixes

> **Budget:** ~20cx
> **Depends on:** CC-S4 complete, code review + security audit findings
> **Repo:** bpsai-command-center
> **Sprint ID:** CC-S4-FIX

---

## Context

Code review and security audit of CC-FIX + CC-S4 found 2 P0s and several P1s. The timing-safe comparison leaks password length, tests didn't land (zero test files despite driver claiming 116 tests), and the session proxy has an operator bypass via query param.

---

### CCSF.1 — Auth + Proxy Security Fixes | Cx: 10 | P0

**Description:** Fix the timing-safe comparison, operator scoping bypass, and proxy issues.

**AC:**
- [ ] timingSafeEqual uses crypto.timingSafeEqual with HMAC hashing (hash both values to fixed length, then compare -- eliminates length leak)
- [ ] /api/sessions operator scoping: x-operator from middleware is authoritative, ignore client-supplied ?operator query param
- [ ] session_id path param wrapped with encodeURIComponent before interpolation in upstream fetch URLs (both sessions route and resume route)
- [ ] PATCH /api/sessions only forwards allowed fields (status) to upstream, not arbitrary body
- [ ] Remove x-operator header from Anthropic API request in /api/computer
- [ ] Ack route maps non-404 upstream errors to 502 (consistent with other routes)
- [ ] SSE feed route: add export const dynamic = "force-dynamic"
- [ ] SSE :ok comment sent before first poll, not after
- [ ] Tests: operator query param override blocked, session_id encoding, PATCH field allowlist

### CCSF.2 — Test Coverage + Cleanup | Cx: 10 | P1

**Description:** Verify test files exist (or recreate), fix duplicated code, add missing coverage.

**Note:** The CC-FIX driver reported 116 tests but the post-review found zero test files. Need to check if tests were committed or lost.

**AC:**
- [ ] Verify tests/ directory exists with vitest tests (if missing, recreate from CCF.3 + T2.x driver output)
- [ ] Remove duplicate getOperator in page.tsx, import from lib/use-operator
- [ ] Extract A2A_BASE_URL to shared src/lib/config.ts (currently duplicated in 6 files)
- [ ] SessionCatalog: read operator via useState+useEffect instead of render-time cookie read
- [ ] CSP: evaluate removing unsafe-inline/unsafe-eval or document why they're needed for Next.js
- [ ] localStorage: add QuotaExceededError handling in chat-storage.ts
- [ ] Tests cover: timingSafeEqual with different-length passwords, operator scoping enforcement, resume authorization, chat-storage round-trips, feed message mapping

---

## Summary

| Task | Title | Cx | Priority |
|------|-------|----|----------|
| CCSF.1 | Auth + Proxy Security Fixes | 10 | P0 |
| CCSF.2 | Test Coverage + Cleanup | 10 | P1 |
| **Total** | | **20** | |

### Execution Order

```
CCSF.1 first (security fixes)
CCSF.2 after (tests + cleanup)
```
