---
id: CCD.2
title: Dispatch results in Activity Feed
plan: plan-sprint-0-engage
type: feature
priority: P1
complexity: 5
status: in_progress
sprint: '0'
depends_on:
- CCD.1
---

# Dispatch results in Activity Feed

Verify and enhance dispatch result visibility in the Activity Feed. The feed already polls A2A `/messages/feed` every 3 seconds. Dispatch results (posted by daemon as `type: "dispatch-result"`) should render with agent name, target repo, outcome (success/failure), and a summary. Add visual distinction for dispatch events vs regular messages.

# Acceptance Criteria

- [ ] Dispatch result messages (`type: "dispatch-result"`) render in Activity Feed with agent name, repo, and outcome
- [ ] Visual distinction: dispatch events have a different icon or color than regular messages
- [ ] Dispatch-in-progress messages (`type: "dispatch-ack"`) show as "running" state
- [ ] Feed poll includes auth headers (portal JWT) for org-scoped reads
- [ ] Tests: dispatch result rendering, in-progress state, message type filtering