---
id: UA2.3
title: Portal JWT for A2A Calls
plan: plan-sprint-UA-P2-engage
type: feature
priority: P0
complexity: 10
status: done
sprint: UA-P2
depends_on:
- UA2.1
completed_at: '2026-04-01T16:49:25.350323'
---

# Portal JWT for A2A Calls

Swap all API proxy routes from using operator-token JWT to using the portal session JWT as Bearer for A2A calls. The portal JWT carries org_id and operator, which A2A uses for scoping.

# Acceptance Criteria

- [x] All API routes (feed, agents, metis, ack, sessions, sessions/[id], sessions/[id]/resume) read portal JWT from cookie
- [x] Forward as Authorization: Bearer header to A2A
- [x] Remove paircoder_api operator-token fetch (src/lib/a2a-auth.ts)
- [x] Remove LICENSE_ID and PAIRCODER_API_URL env vars (no longer needed for token minting)
- [x] Fallback: if no JWT cookie (dev mode without OAuth), skip Bearer header and log warning
- [x] Tests: portal JWT forwarded as Bearer, missing cookie returns 401, dev fallback works