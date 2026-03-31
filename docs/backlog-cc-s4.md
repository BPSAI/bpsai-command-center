# Command Center S4 — Auth Identity + Chat Persistence + Session Monitoring

> **Budget:** ~60cx
> **Depends on:** CC-S3 complete (all panels live), CD1 complete (daemon operational)
> **Repo:** bpsai-command-center
> **Sprint ID:** CC-S4

---

## Context

S1-S3 shipped the full 5-panel layout with real-time feeds, agent grid, Computer Chat, notifications, and standup view. All panels are functional but anonymous — no operator identity, no chat persistence, and no visibility into dispatched daemon sessions.

S4 adds the identity layer (who is using this), persistence (conversations survive refresh), and session monitoring (see what the daemon is doing). This makes Command Center operational for daily use rather than just a demo.

### Cross-Repo Dependencies

- **bpsai-a2a:** T2.3 adds a `computer_sessions` table — this lives in A2A's database since it's shared state across Command Center and Computer daemon
- **bpsai-computer (CD2):** T2.4 requires CD2 session lifecycle messages. T2.4 can stub the A2A contract and be validated once CD2 ships.

---

## Phase 1: Auth + Persistence

### T2.1 — Per-User Basic Auth with Operator Identity | Cx: 10 | P0

**Description:** Add HTTP Basic Auth middleware that extracts the username as operator identity. All downstream API calls include `x-operator` header. This is the simplest auth that establishes identity — OAuth/Entra comes later.

**AC:**
- [ ] Next.js middleware intercepts all routes except `/api/health`
- [ ] Basic Auth challenge on unauthenticated requests
- [ ] Credentials checked against env var `AUTHORIZED_USERS` (comma-separated `user:pass` pairs)
- [ ] Authenticated username stored in session/cookie, passed as `x-operator` header on all API calls
- [ ] Activity feed and agent grid API calls include operator context
- [ ] Logout button in header
- [ ] Tests: middleware blocks unauthenticated, passes authenticated, extracts username

### T2.2 — Computer Chat localStorage Persistence | Cx: 10 | P0

**Description:** Save and restore Computer Chat conversations in localStorage, keyed by operator. Add session list sidebar showing past conversations with timestamps.

**Depends on:** T2.1

**AC:**
- [ ] Conversations saved to localStorage on each message (keyed by `chat:{operator}:{session_id}`)
- [ ] Session list sidebar showing all conversations for current operator
- [ ] Click session to restore conversation
- [ ] "New Chat" button creates fresh session
- [ ] "Clear" button deletes current session from storage
- [ ] Conversations survive page refresh
- [ ] Different operators see only their own conversations
- [ ] Tests: save/restore round-trip, operator isolation, new/clear actions

---

## Phase 2: Session Monitoring

### T2.3 — A2A Session Catalog Endpoint | Cx: 15 | P0

**Description:** Add `computer_sessions` table and API endpoints to A2A for tracking daemon-dispatched Claude Code sessions. This is the shared state between Command Center (reads) and Computer daemon (writes).

**Note:** This task modifies bpsai-a2a, not bpsai-command-center. Include in CC-S4 because it's driven by CC requirements.

**AC:**
- [ ] `computer_sessions` table: session_id, operator, machine, workspace, status (started/running/complete/failed), command, created_at, completed_at
- [ ] `POST /sessions` — daemon registers new session
- [ ] `GET /sessions` — list sessions (filterable by operator, status, machine)
- [ ] `GET /sessions/{session_id}` — session detail
- [ ] `PATCH /sessions/{session_id}` — update status (daemon posts completion)
- [ ] Operator scoping: sessions filtered by operator when `x-operator` header present
- [ ] Tests: CRUD operations, operator filtering, status transitions

### T2.4 — Session Catalog UI Panel | Cx: 10 | P0

**Description:** Add a session catalog view to Command Center showing dispatched daemon sessions with status, timing, and operator info.

**Depends on:** T2.3

**AC:**
- [ ] Session list component fetching from `GET /sessions`
- [ ] Status badges (started=yellow, running=blue, complete=green, failed=red)
- [ ] Auto-refresh on interval (30s) or SSE when available
- [ ] Click session to see detail (command, timing, output summary)
- [ ] Filter by operator (auto-filtered to current user by default)
- [ ] Responsive layout — fits in existing panel grid or as modal overlay

### T2.5 — Resume Dispatch from Command Center | Cx: 15 | P1

**Description:** Allow operator to resume a completed/failed daemon session from Command Center. Sends resume command to daemon via A2A, daemon runs `claude --resume {session_id}`.

**Depends on:** T2.3, T2.4

**AC:**
- [ ] "Resume" button on session detail (visible for complete/failed sessions)
- [ ] Posts resume command to A2A dispatch channel with session_id and operator
- [ ] Operator scoping enforced — can only resume own sessions
- [ ] UI shows "resume pending" state while daemon picks up command
- [ ] Error handling: daemon offline, session not resumable
- [ ] Tests: resume command posting, operator scoping, error states

---

## Summary

| Task | Title | Cx | Priority | Phase |
|------|-------|----|----------|-------|
| T2.1 | Per-User Basic Auth with Operator Identity | 10 | P0 | 1 |
| T2.2 | Computer Chat localStorage Persistence | 10 | P0 | 1 |
| T2.3 | A2A Session Catalog Endpoint | 15 | P0 | 2 |
| T2.4 | Session Catalog UI Panel | 10 | P0 | 2 |
| T2.5 | Resume Dispatch from Command Center | 15 | P1 | 2 |
| **Total** | | **60** | | |

### Execution Order

```
Phase 1 (sequential):
  T2.1 (auth + operator identity)
  T2.2 (chat persistence) — depends on T2.1

Phase 2 (after Phase 1):
  T2.3 (A2A session catalog — runs in bpsai-a2a repo)
  T2.4 (session catalog UI) — depends on T2.3
  T2.5 (resume dispatch) — depends on T2.3, T2.4
```

---

## Validation

After this sprint:
1. Log in to command.paircoder.ai with credentials — see operator name in header
2. Have a Computer Chat conversation, refresh page — conversation restored
3. Switch users — see different conversation history
4. Daemon dispatches a session — session appears in Command Center catalog
5. Click session to see detail, click Resume to re-dispatch
