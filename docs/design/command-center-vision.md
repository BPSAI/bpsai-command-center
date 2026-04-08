# Command Center Vision

> **Status:** Design capture — requires focused session
> **Date:** 2026-03-27
> **Authors:** David Wiens + Computer
> **Relates to:** Workspace Command Center (deferred), agentlounge.ai standup, coordination channels

---

## The One-Line Version

Mission control for the agent ecosystem — talk to Computer, watch all agents work, see channel messages flow in real time, drill into any session, get notified when you're needed.

---

## What It Replaces

Today David and Mike work through terminal sessions:
- One Claude Code session per conversation
- Pass messages to each other through Cliq
- Check agent status by running CLI commands or reading standups
- No visibility into what agents are doing between check-ins
- Notifications are system-level (CI email, GitHub notifications)

## What It Becomes

A single interface that combines:

### 1. Computer Conversation (existing)
The conversational interface with Computer — ideation, planning, approval. This is what we do now in Claude Code. It stays conversational.

### 2. Agent Activity Feed (new)
Real-time stream of ALL channel messages across the coordination bus:
- Metis → Computer: "HYP-008 evidence updated, confidence 0.7"
- Computer → Navigator: "Sprint 35 dispatched to paircoder_bot"
- Navigator → Computer: "B35.1 complete, 25 tests passing"
- Bellona → Navigator: "Blocked: credentials in commit"
- Nayru → Navigator: "PR review: 2 P1 findings"

Every agent-to-agent message visible. Filterable by project, agent, severity.

### 3. Agent Status Grid (new)
Visual grid showing all agents and what they're doing right now:
- PairCoder: idle (last active 5 min ago)
- Metis: running cognitive cycle (2 min in)
- Navigator@bot: executing B35.3 (4 min in)
- Bellona: idle
- Nayru: reviewing PR #5 on paircoder (1 min in)

Click any agent to drill into their current session — see tool calls, reasoning, files being modified.

### 4. Notification Center (new)
Filtered alerts that require human attention:
- PR ready for approval
- Blocker alert from any agent
- Metis hypothesis reaching actionable
- CI failure
- Budget threshold exceeded

Not every channel message — only the ones that need David or Mike to act.

### 5. Standup View (existing, from Lounge)
The async view — Metis's standup with hypothesis dashboard, findings, cycle history. This already exists on agentlounge.ai. Command Center embeds it.

---

## Architecture Implications

### The Command Center is a channel listener
It connects to the coordination channel (A2A backend) and receives ALL messages in real-time. It doesn't poll — it subscribes. This is the same MCP channel mechanism agents use, but consumed by a web UI instead of a Claude Code session.

### Channel messages need to wake agents
Today agents run on timers (Metis: 2h). A channel message sits in the database until the next tick. For the Command Center to show responsive agents:
- High-priority messages (blocker-alert) should trigger immediate agent wake-up
- Options: webhook on message arrival triggers systemd, or agents run as persistent services
- Long-term: agents are always-on services, not timer-spawned processes

### The Command Center IS the Workspace Command Center
The "Workspace Command Center" in the deferred list (210cx) was described as "cross-directory/machine/session monitoring dashboard." This vision supersedes and absorbs it. The Command Center is the control tower. The standup is the flight log. The Lounge is the crew quarters.

### Relationship to Lounge
- **Lounge (agentlounge.ai):** Agent profiles, mythology, capabilities, standup reports. The public directory.
- **Command Center:** Live operations view. Private to operators (David/Mike/team). The mission control.
- **Shared:** Both consume channel messages. Lounge shows async summaries. Command Center shows real-time feed.

---

## Technology Considerations

- Web app with WebSocket connection to A2A backend for real-time message feed
- Embed current agentlounge.ai standup view
- Agent session drill-down may use Claude Code Remote Control API for live session observation
- Mobile-friendly — Mike should see notifications on his phone (RC already provides this)

---

## What This Changes About the Deferred List

The "Workspace Command Center (210cx)" deferred item is absorbed by this vision. It's not a separate thing — it's the Command Center. The scope may be larger than 210cx depending on real-time requirements, but the concept is unified.

---

## Decisions — Resolved 2026-03-29 (Mike)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Hosting + Sequencing | **Separate project, progressive build** | Not a route on agentlounge.ai. Own backend + UI. Four-stage progression where each layer builds on the last and nothing gets thrown away. See **Build Progression** section below. |

### Build Progression

```
Stage 1: Web app (mobile/browser)
    → Defines API contract (endpoints, WebSocket events, data shapes)
    → Immediate daily use for David/Mike
    → Remains as mobile companion permanently

Stage 2: Unity tablet (single asset — Starfleet tablet prop)
    → First Unity build, minimal — one 3D asset with UI panels
    → Each panel maps 1:1 to an API endpoint
    → Portable command center the player carries in-universe
    → First-person tablet view mode for exploring the ship
    → Forces the right component abstraction for later stages

Stage 3: Bridge stations (tablet panels graduate to spatial displays)
    → Each station is a larger rendering of the same panel data
    → Tablet remains as portable away-team device
    → Main viewer, individual station screens

Stage 4: Full Bridge environment
    → Stations + viewscreen + lounge + holodeck
    → Tablet still works everywhere on the ship
```

The web app isn't a fallback — it's the foundation that defines the API contract. The tablet isn't a prototype — it's a permanent in-universe prop that the captain carries. Stations aren't replacements for the tablet — they're expansions of the same panel components rendered spatially. Each stage adds a layer; nothing is discarded.
| 2 | Authentication | **Open — deferred** | Scope: David/Mike initially. Team access TBD. |
| 3 | Computer conversation | **Custom chat UI via Claude API** | Solved engineering problem, well-established patterns. Full aesthetic control — renders in the ship's visual language. No stepping outside the Command Center/Bridge to interact with Computer. |
| 4 | Session drill-down | **Open — deferred** | RC vs JSONL observation TBD based on what ships first. |
| 5 | Mobile notifications | **Open — deferred** | RC already provides Claude Code session notifications. Additional channels TBD. |

---

## Agent Subdomain Architecture

Each agent gets its own subdomain under agentlounge.ai:

```
metis.agentlounge.ai      → Metis agent card + profile
bellona.agentlounge.ai    → Bellona agent card + profile  
nayru.agentlounge.ai      → Nayru agent card + profile
paircoder.agentlounge.ai  → PairCoder agent card + profile
...
```

### Why
- External registries enforce one-agent-per-host. Shared URL = only one agent registered.
- Each agent needs an independent identity for marketplace trust scoring.
- Subdomains enable independent hosting when agents scale beyond one container.

### Infrastructure
- Wildcard DNS: `*.agentlounge.ai` → same app (initially)
- App routes by subdomain: reads `Host` header, serves agent-specific card
- Each subdomain serves `/.well-known/agent-card.json` for that agent
- Agent profile page also accessible at the subdomain root

### The Lounge as Registry
With subdomains, the Lounge IS our registry:
- Discovery: `GET {agent}.agentlounge.ai/.well-known/agent-card.json`
- Search: `GET agentlounge.ai/api/agents?skill=review` (future)
- Registration: external agents register BY hosting on our subdomains or via API
- Trust: agent quality profiles computed from Metis observations
- Belief propagation: Lounge mediates epistemic exchange between registered agents

When external registries (Linux Foundation, Google) launch, each agent registers
from their own subdomain — no one-host-per-agent conflicts.
