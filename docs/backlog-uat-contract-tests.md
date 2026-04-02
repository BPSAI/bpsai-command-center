# CC Auth Contract Tests

> **Budget:** ~10cx
> **Repo:** bpsai-command-center
> **Sprint ID:** UAT-CC
> **Blocks:** Production deployment of unified auth
> **Design doc:** bpsai-framework/docs/design/unified-auth-architecture.md

---

## Context

Contract tests verify CC's OAuth flow produces correct requests to support and passes correct JWTs to A2A. Mock support and A2A responses with contract fixtures matching the agreed schemas.

---

### Phase 1: Contract Tests

### UAT1.2 — CC Auth Contract Tests | Cx: 10 | P0

**Description:** Verify CC correctly implements OAuth PKCE, stores tokens securely, auto-refreshes, forwards JWTs to A2A, and enforces org/operator scoping in the UI layer.

**AC:**
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
