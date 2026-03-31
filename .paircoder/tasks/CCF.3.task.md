---
id: CCF.3
title: "Quality + DX Fixes"
plan: plan-2026-03-cc-fix
type: bugfix
priority: P1
complexity: 10
status: pending
sprint: "CC-FIX"
depends_on: []
---

# Objective

Fix remaining quality issues: zero test coverage, security headers, dead code, Dockerfile.

# Acceptance Criteria

- [ ] Remove unused react-resizable-panels dependency
- [ ] Remove dead --font-sans CSS variable referencing undefined --font-geist-sans
- [ ] Add .dockerignore (node_modules, .git, .next)
- [ ] Anthropic model name from env var COMPUTER_MODEL with default
- [ ] Extract shared formatTime/formatDate into src/app/lib/format.ts
- [ ] Add rehype-sanitize plugin to ReactMarkdown in ComputerChat.tsx
- [ ] Add security headers in next.config.ts: CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy
- [ ] Add vitest config and tests: middleware auth tests, /api/computer input validation tests, formatTime unit tests
- [ ] README updated with project description, env vars, deployment
