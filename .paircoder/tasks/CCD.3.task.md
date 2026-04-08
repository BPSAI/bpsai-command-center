---
id: CCD.3
title: Computer system prompt with fleet awareness
plan: plan-sprint-0-engage
type: feature
priority: P1
complexity: 5
status: pending
sprint: '0'
depends_on:
- CCD.1
---

# Computer system prompt with fleet awareness

Enhance Computer's system prompt with awareness of dispatch capabilities and the Computer Prime architecture. Computer should understand that it dispatches work to the user's daemon, not directly to agents. It should guide users through natural language dispatch and confirm intent before sending. Include workspace context from configuration.

# Acceptance Criteria

- [ ] System prompt explains dispatch: "I send work to your Computer Prime instance, which orchestrates execution locally"
- [ ] System prompt includes workspace context (from env var or configuration)
- [ ] Computer guides users: "Tell me what you need done — I'll dispatch it to your Computer instance"
- [ ] Computer confirms dispatch intent before calling tool: "I'll send this to your Computer instance: 'audit bpsai-a2a for security issues'. Send it?"
- [ ] Tests: system prompt contains dispatch guidance, confirmation flow works
