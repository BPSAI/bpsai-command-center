---
id: CCF.1
title: "Auth + API Security Fixes"
plan: plan-2026-03-cc-fix
type: bugfix
priority: P0
complexity: 10
status: pending
sprint: "CC-FIX"
depends_on: []
---

# Objective

Fix critical auth and API security issues from code review and security audit.

# Acceptance Criteria

- [ ] Basic auth password parsing uses indexOf to split on first colon only, not split(":")
- [ ] NotificationCenter ack call routed through new /api/ack server-side proxy endpoint (not direct to a2a.paircoder.ai from browser)
- [ ] /api/computer validates messages array: max 50 messages, max 32KB content per message, role must be "user" or "assistant"
- [ ] /api/computer returns 400 for malformed JSON body (try/catch on request.json())
- [ ] A2A_BASE_URL extracted to single env var, used across all API routes (feed, agents, metis, ack)
- [ ] Auth guard: return 500 if BASIC_AUTH_PASS is empty when NODE_ENV=production
- [ ] Validate limit param in /api/metis as integer, clamp to 1-100 range
- [ ] Use URLSearchParams to build upstream URLs in metis route instead of string interpolation
- [ ] Strip or omit details field from 502 response in /api/computer
- [ ] Use crypto.timingSafeEqual for credential comparison instead of ===
- [ ] Remove default username "captain" fallback, require BASIC_AUTH_USER env var
- [ ] Tests: auth with colon-in-password, ack proxied server-side, invalid messages rejected, production auth guard, limit validation
