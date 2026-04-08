---
title: "Command Center Phase 0 -- Web App Plan"
status: "Approved (2026-03-29, Mike)"
budget: 120cx
repo: bpsai-command-center (BPSAI org)
domain: command.paircoder.ai
---

# Command Center Phase 0 -- Web App Plan

## Technology Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Real-time:** SSE (polling A2A backend, upgrade path to WebSocket)
- **Computer Chat:** Claude API via Next.js API route proxy (Tier B: advisory + live data. Tier C dispatch deferred to CC-S4)
- **Hosting:** Azure Container Apps (same pattern as A2A)
- **DNS:** command.paircoder.ai

## Architecture Decision: Dispatch Routing (Architecture C)

Computer conversation runs as Claude API call in the Command Center backend. Dispatch commands route through A2A coordination channels. A local daemon on each operator's machine polls for dispatch messages scoped to their operator ID and executes via Claude Code.

### Flow

1. User types request in Command Center
2. Computer (Claude API) understands intent
3. Computer POSTs dispatch message to A2A: `{type: "dispatch", operator: "<user>", ...}`
4. User's local daemon polls `GET /messages?type=dispatch&operator=<user>&unacknowledged_only=true`
5. Daemon launches appropriate Claude Code command
6. Results flow back through A2A channels
7. Command Center activity feed shows results in real-time

### Key Constraint

Dispatch messages include an `operator` field. Each daemon only consumes messages for its operator. This enables:

- **User-scoped dispatch** -- Mike's commands go to Mike's machine only
- **VM execution** -- a cloud VM with repos cloned can run a daemon
- **Team scaling** -- new team member = new daemon + operator ID

## A2A Backend Changes Required

1. **GET /messages/feed** -- firehose endpoint (all messages, cursor pagination, optional filters) -- 15cx
2. **GET /agents/status + POST /agents/{name}/heartbeat** -- agent status grid support -- 15cx
3. **`operator` field on ChannelMessage model** -- user-scoped dispatch routing -- 5cx
4. **CORS update for command.paircoder.ai** -- trivial

## Sprint Backlog

### Sprint CC-S1 (~55cx, parallel work)

| Task | Description | Budget |
|------|-------------|--------|
| T1.1 | Project scaffolding -- repo, Next.js, Dockerfile, CI/CD, deploy to command.paircoder.ai | 10cx |
| T1.2 | A2A feed endpoint + CORS (on bpsai-a2a repo) | 15cx |
| T1.3 | A2A heartbeat/status + operator field (on bpsai-a2a repo) | 15cx |
| T1.9 | Panel layout + ship theme | 10cx |

### Sprint CC-S2 (~45cx)

| Task | Description | Budget |
|------|-------------|--------|
| T1.4 | Activity Feed panel -- SSE, real-time messages, filters | 20cx |
| T1.5 | Agent Status Grid panel -- live agent cards | 15cx |
| T1.8 | Standup View panel -- Metis standup data | 10cx |

### Sprint CC-S3 (~35cx)

| Task | Description | Budget |
|------|-------------|--------|
| T1.6 | Computer Conversation panel -- Claude API streaming, chat UI | 25cx |
| T1.7 | Notification Center panel -- filtered alerts, acknowledge | 10cx |

### Future (CC-S4, not in Phase 0 budget)

- Dispatch daemon for local execution (~20cx)
- Computer Tier C: dispatch via A2A channels (~10cx)

## Decisions Resolved

| ID | Decision |
|----|----------|
| CC-1 | Azure provisioning by Claude (same pattern as A2A) |
| CC-2 | Claude API key (not Max plan -- need API key from console.anthropic.com) |
| CC-3 | Tier B (advisory + live data) for Phase 0. Tier C (dispatch) deferred. |
| CC-4 | Repo name: bpsai-command-center |
