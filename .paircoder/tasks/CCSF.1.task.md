---
id: CCSF.1
title: Auth + Proxy Security Fixes
plan: plan-sprint-CC-S4-FIX-engage
type: feature
priority: P0
complexity: 10
status: in_progress
sprint: CC-S4-FIX
depends_on: []
---

# Auth + Proxy Security Fixes

Fix the timing-safe comparison, operator scoping bypass, and proxy issues.

# Acceptance Criteria

- [ ] timingSafeEqual uses crypto.timingSafeEqual with HMAC hashing (hash both values to fixed length, then compare -- eliminates length leak)
- [ ] /api/sessions operator scoping: x-operator from middleware is authoritative, ignore client-supplied ?operator query param
- [ ] session_id path param wrapped with encodeURIComponent before interpolation in upstream fetch URLs (both sessions route and resume route)
- [ ] PATCH /api/sessions only forwards allowed fields (status) to upstream, not arbitrary body
- [ ] Remove x-operator header from Anthropic API request in /api/computer
- [ ] Ack route maps non-404 upstream errors to 502 (consistent with other routes)
- [ ] SSE feed route: add export const dynamic = "force-dynamic"
- [ ] SSE :ok comment sent before first poll, not after
- [ ] Tests: operator query param override blocked, session_id encoding, PATCH field allowlist