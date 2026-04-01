# Unified Auth Phase 2 — OAuth Login + License Link + Portal JWT

> **Budget:** ~40cx
> **Repo:** bpsai-command-center
> **Sprint ID:** UA-P2
> **Design doc:** bpsai-framework/docs/design/unified-auth-architecture.md
> **Depends on:** UA-P1 (bpsai-support: org model, link API, JWT claims)

---

## Context

Phase 1 shipped the org model and JWT claims in bpsai-support. This phase replaces CC Basic Auth with Zoho/MSAL OAuth, adds the license link prompt for first-time users, and wires portal JWTs for all A2A calls.

Reference: Support Portal React login flow (bpsai-support-team-portal_react) has the OAuth PKCE pattern. Adapt to Next.js.

---

### Phase 1: OAuth Login

### UA2.1 — OAuth Login Flow | Cx: 20 | P0

**Description:** Replace Basic Auth with Zoho/MSAL OAuth login in CC. Adapt the Support Portal React login flow to Next.js. After login, CC exchanges the IdP token for a portal session JWT via bpsai-support.

**AC:**
- [ ] Login page with Zoho OAuth button (PKCE flow)
- [ ] OAuth callback handler exchanges auth code for tokens via bpsai-support /auth/token
- [ ] Portal session obtained via POST bpsai-support/auth/portal-session with IdP token
- [ ] Access token (30min) stored in httpOnly secure cookie
- [ ] Refresh token (12hr) stored in httpOnly secure cookie
- [ ] Auto-refresh: middleware checks access token expiry, refreshes via /auth/portal-refresh before it expires
- [ ] Logout: calls /auth/portal-revoke, clears cookies, redirects to login
- [ ] Operator name extracted from JWT claims and displayed in header
- [ ] Remove Basic Auth middleware entirely
- [ ] Remove AUTHORIZED_USERS env var dependency
- [ ] Environment vars: ZOHO_CLIENT_ID, SUPPORT_API_URL
- [ ] Tests: login redirect, callback token exchange, cookie setting, auto-refresh, logout

### Phase 2: License Link + JWT Wiring

### UA2.2 — License Link Prompt | Cx: 10 | P0

**Description:** When a user logs in and their JWT has no license_id claim, show a prompt to link their PairCoder license. Calls bpsai-support to link, then re-fetches JWT with license claims.

**Depends on:** UA2.1

**AC:**
- [ ] After login, check JWT for license_id claim
- [ ] If missing, show modal: Link your PairCoder License with license key input field
- [ ] On submit, POST to bpsai-support /users/me/license via CC backend proxy
- [ ] On success, refresh the portal session (new JWT includes license_id)
- [ ] On failure, show error (invalid key, already linked, etc.)
- [ ] Dismiss option: user can skip and use CC without A2A features (chat only, no sessions)
- [ ] Link status persisted in JWT, prompt only shows when license_id is absent
- [ ] Tests: prompt appears when no license, disappears after successful link, error display, skip behavior

### UA2.3 — Portal JWT for A2A Calls | Cx: 10 | P0

**Description:** Swap all API proxy routes from using operator-token JWT to using the portal session JWT as Bearer for A2A calls. The portal JWT carries org_id and operator, which A2A uses for scoping.

**Depends on:** UA2.1

**AC:**
- [ ] All API routes (feed, agents, metis, ack, sessions, sessions/[id], sessions/[id]/resume) read portal JWT from cookie
- [ ] Forward as Authorization: Bearer header to A2A
- [ ] Remove paircoder_api operator-token fetch (src/lib/a2a-auth.ts)
- [ ] Remove LICENSE_ID and PAIRCODER_API_URL env vars (no longer needed for token minting)
- [ ] Fallback: if no JWT cookie (dev mode without OAuth), skip Bearer header and log warning
- [ ] Tests: portal JWT forwarded as Bearer, missing cookie returns 401, dev fallback works

---

## Summary

| Task | Title | Cx | Priority | Phase |
|------|-------|----|----------|-------|
| UA2.1 | OAuth Login Flow | 20 | P0 | 1 |
| UA2.2 | License Link Prompt | 10 | P0 | 2 |
| UA2.3 | Portal JWT for A2A Calls | 10 | P0 | 2 |
| **Total** | | **40** | | |

## Validation

After this sprint:
1. Visit command.paircoder.ai, see Zoho login button (no more Basic Auth challenge)
2. Log in via Zoho, operator name shown in header
3. First login without linked license shows link prompt
4. Enter license key, prompt disappears, session catalog loads
5. All A2A calls use portal JWT (check Network tab for Bearer header)
6. Close browser, reopen within 12hrs, auto-logged in (refresh token)
7. After 12hrs, redirected to login page
