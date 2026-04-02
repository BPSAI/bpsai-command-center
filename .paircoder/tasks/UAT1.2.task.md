---
id: UAT1.2
title: CC Auth Contract Tests
plan: plan-sprint-UAT-CC-engage
type: feature
priority: P0
complexity: 10
status: in_progress
sprint: UAT-CC
depends_on: []
---

# CC Auth Contract Tests

Verify CC correctly implements OAuth PKCE, stores tokens securely, auto-refreshes, forwards JWTs to A2A, and enforces org/operator scoping in the UI layer.

# Acceptance Criteria

- [ ] Fixture: mock support /auth/portal-session response (portal JWT with org_id, license_id, operator, tier claims)
- [ ] Fixture: mock support /auth/portal-refresh response
- [ ] Fixture: mock A2A responses for session catalog (org-scoped)
- [ ] Test: OAuth callback exchanges code via POST (not GET)
- [ ] Test: portal JWT stored in httpOnly secure cookie with correct maxAge (30min)
- [ ] Test: refresh token stored separately with 12hr maxAge
- [ ] Test: middleware auto-refreshes when token within 2min of expiry
- [ ] Test: all API proxy routes forward Bearer token from cookie to A2A
- [ ] Test: /api/sessions scoped by org_id from JWT (client query param override blocked)
- [ ] Test: resume blocked for non-owner (403)
- [ ] Test: missing license_id in JWT triggers link prompt (cc_has_license cookie absent)
- [ ] Test: license link calls support with raw zoho_sub (not zoho: prefixed)
- [ ] Test: unauthenticated request to protected route redirected to /login
- [ ] Test: /api/auth/login, /api/auth/callback, /api/auth/logout are in PUBLIC_PATHS