# CC Phase C Hardening — UX + Drill-Down

> **Budget:** ~60cx
> **Repo:** bpsai-command-center
> **Sprint ID:** CCH
> **Source:** Mike's post-E2E notes from first working dispatch round-trip (2026-04-09)

---

## Context

The CC → daemon dispatch round-trip works end-to-end. First real dispatch from browser → Computer Prime daemon → Claude Code execution → result in Activity Feed completed 2026-04-09. Now we need to harden the UX and add drill-down capabilities across all panels.

---

### Phase 1: Activity Feed UX Polish

### CCH.1 — Results hover box persistence | Cx: 5 | P0

**Description:** The results hover popup disappears when the cursor moves to it, preventing users from scrolling through long results. Fix: either keep the popup visible until clicked off, OR make results clickable to open a persistent modal (with X button and click-outside-to-close).

**AC:**
- [ ] Hover popup stays visible while cursor is over it
- [ ] Alternative: click result row to open persistent modal with full details
- [ ] Modal has visible X close button
- [ ] Click outside modal closes it
- [ ] Escape key closes modal
- [ ] Scroll works inside popup/modal

### CCH.2 — Custom cursor default state | Cx: 3 | P1

**Description:** The custom sci-fi reticle cursor renders as just a white cross in the default state; only shows properly on hover of clickable elements. Fix the default SVG to be visible/styled correctly.

**AC:**
- [ ] Default cursor shows the full reticle design (crosshair + ring + dot)
- [ ] Cyan accent color visible in default state
- [ ] Hover state still glows brighter
- [ ] Works in Chrome, Firefox, Safari

---

### Phase 2: Computer Chat Intent Recognition

### CCH.3 — Improve dispatch intent recognition | Cx: 10 | P0

**Description:** Computer Chat requires overly explicit phrasing to recognize dispatch intents. Users saying "dispatch to computer" or "what's next for the command center?" should trigger dispatch confirmation without multiple back-and-forth clarifications. Update the system prompt and tool use handling to recognize:
- Implicit dispatch requests ("what's next for X", "check on Y")
- Follow-up context from recent chat history
- Direct action verbs ("run", "check", "audit", "review", "fix")

**AC:**
- [ ] System prompt explicitly guides Computer to dispatch on action verbs
- [ ] Computer infers dispatch intent from conversational context without requiring "dispatch to"
- [ ] "Dispatch to computer" + preceding question auto-dispatches that question
- [ ] Confirmation still required for ambiguous intents (good UX)
- [ ] Test with recorded examples from session notes
- [ ] No regression on non-dispatch conversations (Computer can just chat)

---

### Phase 3: Agent Grid Drill-Down

### CCH.4 — Clickable agent details panel | Cx: 15 | P0

**Description:** Agent Grid cards are currently read-only status displays. Add click handler to open a detail panel showing the agent's AgentCard info, current status, active session output (if running), and run history.

**AC:**
- [ ] Click agent card opens detail panel (modal or side drawer)
- [ ] Detail panel shows AgentCard data: name, description, skills, tags, tier requirements
- [ ] If agent is running: show current task, elapsed time, streaming output
- [ ] Run history: last N dispatches for this agent (success/failure, duration)
- [ ] Close button + click-outside-to-close
- [ ] Reads from A2A `/agents/{name}/card` and `/messages/feed` with agent filter

### CCH.5 — Session drill-down from Activity Feed | Cx: 15 | P0

**Description:** Activity Feed shows `session-started` and `session-complete` messages but users can't drill into a session to see the full execution. Add click-to-open session detail view showing: dispatch intent, current/final output, duration, exit code, related signals, and ability to resume if session is still active.

**AC:**
- [ ] Click session message opens detail view
- [ ] Shows full dispatch intent (not truncated)
- [ ] Streaming output view for active sessions
- [ ] Final output summary for completed sessions
- [ ] Exit code, duration, operator, workspace metadata
- [ ] "Resume session" button for active sessions (calls daemon via A2A)
- [ ] Related signals and dispatch-result in same view

### CCH.6 — Sessions panel population | Cx: 10 | P1

**Description:** Sessions panel shows "0 sessions" even when the daemon is actively executing dispatches. The panel should subscribe to session-started/session-complete messages and show active + recent sessions.

**AC:**
- [ ] Panel reads session messages from A2A feed
- [ ] Active sessions show first with "RUNNING" indicator
- [ ] Recent completed sessions below (last 20)
- [ ] Filter: ALL / ACTIVE / COMPLETED
- [ ] Click session row opens detail view (CCH.5)
- [ ] Session count in header reflects active count

---

### Phase 4: Notifications + Multi-Operator Disambiguation

### CCH.7 — Notifications panel routing | Cx: 8 | P1

**Description:** Notifications panel is empty. Define what counts as a notification (high-severity signals, gate blocks, test failures, review findings, errors) and route appropriate A2A messages to the panel.

**AC:**
- [ ] Notifications reads from A2A with severity filter (`high`, `critical`)
- [ ] Gate blocks, test failures, review findings with P0/P1 appear
- [ ] Click notification opens full detail
- [ ] Mark-as-read functionality (persisted in user session)
- [ ] Badge count in panel header

### CCH.8 — Multi-operator agent disambiguation | Cx: 10 | P1

**Description:** When multiple Computer Prime instances run (Mike's machine, David's machine, a cloud VM), they all show as "bpsai-computer" in the Agent Grid. Need operator-scoped identities like "bpsai-computer (mike)" or separate cards per operator.

**AC:**
- [ ] Agent Grid shows one card per `(agent_name, operator)` combination
- [ ] Card title includes operator ID
- [ ] Heartbeat messages route to the correct card
- [ ] Can filter Activity Feed by operator

---

### Phase 5: Workspace Selection

### CCH.9 — Workspace selector in header | Cx: 8 | P1

**Description:** Currently `DEFAULT_WORKSPACE` env var dictates which workspace CC dispatches to. Users with multiple workspaces (bpsai, aurora, danhil) need a selector to switch between them. The selected workspace flows through to dispatch messages.

**AC:**
- [ ] Workspace dropdown in header next to operator ID
- [ ] List populated from user's accessible workspaces (via JWT claim or config)
- [ ] Selection persists in cookie
- [ ] Dispatch tool uses selected workspace instead of env var
- [ ] Activity Feed filtered by selected workspace
- [ ] Agent Grid filtered by selected workspace

---

## Summary

| Task | Title | Cx | Priority | Phase |
|------|-------|----|----------|-------|
| CCH.1 | Results hover box persistence | 5 | P0 | 1 |
| CCH.2 | Custom cursor default state | 3 | P1 | 1 |
| CCH.3 | Dispatch intent recognition | 10 | P0 | 2 |
| CCH.4 | Clickable agent details | 15 | P0 | 3 |
| CCH.5 | Session drill-down from feed | 15 | P0 | 3 |
| CCH.6 | Sessions panel population | 10 | P1 | 3 |
| CCH.7 | Notifications panel routing | 8 | P1 | 4 |
| CCH.8 | Multi-operator disambiguation | 10 | P1 | 4 |
| CCH.9 | Workspace selector | 8 | P1 | 5 |
| **Total** | | **84** | | |

## Execution Order

```
Phase 1 (UX polish) — CCH.1, CCH.2 parallel
Phase 2 (Chat) — CCH.3
Phase 3 (Drill-down) — CCH.4, CCH.5, CCH.6
Phase 4 (Notifications + Multi-op) — CCH.7, CCH.8
Phase 5 (Workspace) — CCH.9
```

## Notes

- Session resume capability is a dependency on CCH.5 — the daemon needs a session-resume endpoint
- Multi-operator disambiguation (CCH.8) is important once David's machine also runs a daemon
- Workspace selector (CCH.9) unblocks aurora + danhil workspace testing
