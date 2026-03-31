---
id: CCF.2
title: "SSE Stream Fixes"
plan: plan-2026-03-cc-fix
type: bugfix
priority: P0
complexity: 10
status: pending
sprint: "CC-FIX"
depends_on: []
---

# Objective

Fix SSE interval leak on early client disconnect and deduplicate SSE logic.

# Acceptance Criteria

- [ ] SSE cleanup uses closure variable for intervalId instead of monkey-patching stream object
- [ ] SSE stream has max connection duration (5 minutes) with periodic keepalive comments
- [ ] Shared useFeedMessages hook extracted -- single EventSource for both ActivityFeed and NotificationCenter
- [ ] FeedMessage interface and severity mapping defined once in shared module
- [ ] Tests: SSE cleanup fires on early disconnect, max duration terminates stream
