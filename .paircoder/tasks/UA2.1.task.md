---
id: UA2.1
title: OAuth Login Flow
plan: plan-sprint-UA-P2-engage
type: feature
priority: P0
complexity: 20
status: in_progress
sprint: UA-P2
depends_on: []
---

# OAuth Login Flow

Replace Basic Auth with Zoho/MSAL OAuth login in CC. Adapt the Support Portal React login flow to Next.js. After login, CC exchanges the IdP token for a portal session JWT via bpsai-support.

# Acceptance Criteria

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