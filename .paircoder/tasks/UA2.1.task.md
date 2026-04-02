---
id: UA2.1
title: OAuth Login Flow
plan: plan-sprint-UA-P2-engage
type: feature
priority: P0
complexity: 20
status: done
sprint: UA-P2
depends_on: []
completed_at: '2026-04-01T16:31:54.779688'
---

# OAuth Login Flow

Replace Basic Auth with Zoho/MSAL OAuth login in CC. Adapt the Support Portal React login flow to Next.js. After login, CC exchanges the IdP token for a portal session JWT via bpsai-support.

# Acceptance Criteria

- [x] Login page with Zoho OAuth button (PKCE flow)
- [x] OAuth callback handler exchanges auth code for tokens via bpsai-support /auth/token
- [x] Portal session obtained via POST bpsai-support/auth/portal-session with IdP token
- [x] Access token (30min) stored in httpOnly secure cookie
- [x] Refresh token (12hr) stored in httpOnly secure cookie
- [x] Auto-refresh: middleware checks access token expiry, refreshes via /auth/portal-refresh before it expires
- [x] Logout: calls /auth/portal-revoke, clears cookies, redirects to login
- [x] Operator name extracted from JWT claims and displayed in header
- [x] Remove Basic Auth middleware entirely
- [x] Remove AUTHORIZED_USERS env var dependency
- [x] Environment vars: ZOHO_CLIENT_ID, SUPPORT_API_URL
- [x] Tests: login redirect, callback token exchange, cookie setting, auto-refresh, logout