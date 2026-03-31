---
id: CCSF.2
title: Test Coverage + Cleanup
plan: plan-sprint-CC-S4-FIX-engage
type: feature
priority: P1
complexity: 10
status: in_progress
sprint: CC-S4-FIX
depends_on: []
---

# Test Coverage + Cleanup

Verify test files exist (or recreate), fix duplicated code, add missing coverage.

# Acceptance Criteria

- [ ] Verify tests/ directory exists with vitest tests (if missing, recreate from CCF.3 + T2.x driver output)
- [ ] Remove duplicate getOperator in page.tsx, import from lib/use-operator
- [ ] Extract A2A_BASE_URL to shared src/lib/config.ts (currently duplicated in 6 files)
- [ ] SessionCatalog: read operator via useState+useEffect instead of render-time cookie read
- [ ] CSP: evaluate removing unsafe-inline/unsafe-eval or document why they're needed for Next.js
- [ ] localStorage: add QuotaExceededError handling in chat-storage.ts
- [ ] Tests cover: timingSafeEqual with different-length passwords, operator scoping enforcement, resume authorization, chat-storage round-trips, feed message mapping