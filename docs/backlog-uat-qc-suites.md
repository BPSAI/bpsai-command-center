# Command Center Auth QC Suites (Divona)

> **Budget:** ~10cx
> **Repo:** bpsai-command-center
> **Sprint ID:** UAT-QC
> **Depends on:** UAT-CC (contract tests), unified auth deployed
> **First Divona QC suite for Command Center

---

## Context

Browser-based QC test suites using Divona YAML format. Tests the actual UI flows a user would experience — login, license linking, session catalog, responsive layout. Sets the pattern for future CC UI testing.

---

### Phase 1: QC Suites

### UAT4.1 — Command Center Auth QC Suite | Cx: 10 | P1

**Description:** Divona YAML test suites for Command Center browser flows. Covers auth flow, session catalog, and responsive layout.

**AC:**
- [ ] .qc.yaml suite: cc-auth-flow
  - Scenario: visit command.paircoder.ai, redirected to /login
  - Scenario: login page has Zoho OAuth button
  - Scenario: after login, operator name visible in header
  - Scenario: session catalog panel visible and loading
  - Scenario: license link modal appears for unlinked users
  - Scenario: license link modal accepts key input and submits
  - Scenario: logout button clears session and returns to login
- [ ] .qc.yaml suite: cc-session-catalog
  - Scenario: session list shows status badges (started/running/complete/failed)
  - Scenario: click session shows detail view with command and timing
  - Scenario: resume button visible only for own complete/failed sessions
  - Scenario: resume button hidden for teammate sessions
  - Scenario: auto-refresh updates session list
- [ ] .qc.yaml suite: cc-responsive
  - Scenario: mobile viewport shows tabbed navigation
  - Scenario: desktop viewport shows grid layout
- [ ] Suites committed to .qc/ directory
- [ ] Can run via /run-qc skill
