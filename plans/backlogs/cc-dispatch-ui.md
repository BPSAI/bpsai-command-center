# CC Dispatch UI — Computer Chat Tool Use

> **Budget:** ~20cx
> **Repo:** bpsai-command-center
> **Sprint ID:** CCD
> **Depends on:** CD3 (operator identity in JWT)
> **Design ref:** bpsai-framework/docs/design/computer-daemon-plan.md (architecture section)

---

## Context

The Computer Chat panel currently proxies to Claude API as a vanilla conversation — no tool use, no A2A integration. The user can talk to Computer but can't actually dispatch agents.

This sprint gives Computer a `dispatch` tool so users can send work to their Computer Prime instances (daemons running on local machines or VMs) conversationally. CC is the link to Computer Prime — it doesn't dispatch to agents directly. The daemon receives the dispatch message, decides how to orchestrate (which agent, enforcement mode, etc.), and executes locally.

The dispatch flow:
```
User types in Computer Chat: "audit bpsai-a2a for security issues"
  → /api/computer sends to Claude with dispatch tool definition
  → Claude calls dispatch tool: { operator: "mike-a3k9x2m1", workspace: "bpsai", intent: "audit bpsai-a2a for security issues" }
  → Tool handler POSTs dispatch message to A2A with operator from user's JWT
  → Claude responds: "Dispatch sent to your Computer instance."
  → Computer Prime daemon (operator=mike-a3k9x2m1) picks up dispatch from A2A
  → Daemon orchestrates: selects agent, target repo, enforcement mode
  → Result posted to A2A → appears in Activity Feed
```

---

### Phase 1: Tool Use Backend

### CCD.1 — Add dispatch tool to Computer Chat | Cx: 10 | P0

**Description:** Extend `/api/computer` route to use Claude's tool_use capability. Define a `dispatch` tool with parameters: intent (string — natural language description of the work), workspace (string — target workspace, defaults to configured default). CC dispatches to Computer Prime instances, not directly to agents. The daemon on the target machine decides orchestration details (agent selection, repo targeting, enforcement mode). The operator field comes from the user's portal JWT cookie, routing the dispatch to their Computer instance.

**AC:**
- [ ] `/api/computer` route sends tool definitions to Claude API in the messages request
- [ ] `dispatch` tool defined with parameters: intent (required, string), workspace (optional, defaults to configured workspace)
- [ ] Tool handler extracts operator from portal JWT cookie (same auth as other CC routes)
- [ ] Tool handler POSTs dispatch message to A2A: `{ type: "dispatch", operator, workspace, intent }`
- [ ] A2A URL configurable via env var `A2A_BASE_URL`
- [ ] Tool result returned to Claude for conversational response ("Dispatch sent to your Computer instance.")
- [ ] Streaming still works — tool_use and tool_result events handled in SSE proxy
- [ ] Error handling: A2A unreachable returns tool error, Claude responds gracefully
- [ ] Tests: tool definition included in request, dispatch message format, auth extraction, A2A error handling

### CCD.2 — Dispatch results in Activity Feed | Cx: 5 | P1

**Description:** Verify and enhance dispatch result visibility in the Activity Feed. The feed already polls A2A `/messages/feed` every 3 seconds. Dispatch results (posted by daemon as `type: "dispatch-result"`) should render with agent name, target repo, outcome (success/failure), and a summary. Add visual distinction for dispatch events vs regular messages.

**Depends on:** CCD.1

**AC:**
- [ ] Dispatch result messages (`type: "dispatch-result"`) render in Activity Feed with agent name, repo, and outcome
- [ ] Visual distinction: dispatch events have a different icon or color than regular messages
- [ ] Dispatch-in-progress messages (`type: "dispatch-ack"`) show as "running" state
- [ ] Feed poll includes auth headers (portal JWT) for org-scoped reads
- [ ] Tests: dispatch result rendering, in-progress state, message type filtering

### Phase 2: Context + Polish

### CCD.3 — Computer system prompt with fleet awareness | Cx: 5 | P1

**Description:** Enhance Computer's system prompt with awareness of dispatch capabilities and the Computer Prime architecture. Computer should understand that it dispatches work to the user's daemon, not directly to agents. It should guide users through natural language dispatch and confirm intent before sending. Include workspace context from configuration.

**Depends on:** CCD.1

**AC:**
- [ ] System prompt explains dispatch: "I send work to your Computer Prime instance, which orchestrates execution locally"
- [ ] System prompt includes workspace context (from env var or configuration)
- [ ] Computer guides users: "Tell me what you need done — I'll dispatch it to your Computer instance"
- [ ] Computer confirms dispatch intent before calling tool: "I'll send this to your Computer instance: 'audit bpsai-a2a for security issues'. Send it?"
- [ ] Tests: system prompt contains dispatch guidance, confirmation flow works

---

## Summary

| Task | Title | Cx | Priority |
|------|-------|----|----------|
| CCD.1 | Add dispatch tool to Computer Chat | 10 | P0 |
| CCD.2 | Dispatch results in Activity Feed | 5 | P1 |
| CCD.3 | Computer system prompt with fleet awareness | 5 | P1 |
| **Total** | | **20** | |

## Execution Order

```
CCD.1 (dispatch tool) → CCD.2 (feed results) + CCD.3 (system prompt) parallel
```
