---
id: CCD.1
title: Add dispatch tool to Computer Chat
plan: plan-sprint-0-engage
type: feature
priority: P0
complexity: 10
status: pending
sprint: '0'
depends_on: []
---

# Add dispatch tool to Computer Chat

Extend `/api/computer` route to use Claude's tool_use capability. Define a `dispatch` tool with parameters: intent (string — natural language description of the work), workspace (string — target workspace, defaults to configured default). CC dispatches to Computer Prime instances, not directly to agents. The daemon on the target machine decides orchestration details (agent selection, repo targeting, enforcement mode). The operator field comes from the user's portal JWT cookie, routing the dispatch to their Computer instance.

# Acceptance Criteria

- [ ] `/api/computer` route sends tool definitions to Claude API in the messages request
- [ ] `dispatch` tool defined with parameters: intent (required, string), workspace (optional, defaults to configured workspace)
- [ ] Tool handler extracts operator from portal JWT cookie (same auth as other CC routes)
- [ ] Tool handler POSTs dispatch message to A2A: `{ type: "dispatch", operator, workspace, intent }`
- [ ] A2A URL configurable via env var `A2A_BASE_URL`
- [ ] Tool result returned to Claude for conversational response ("Dispatch sent to your Computer instance.")
- [ ] Streaming still works — tool_use and tool_result events handled in SSE proxy
- [ ] Error handling: A2A unreachable returns tool error, Claude responds gracefully
- [ ] Tests: tool definition included in request, dispatch message format, auth extraction, A2A error handling
