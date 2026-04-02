---
id: UA2.2
title: License Link Prompt
plan: plan-sprint-UA-P2-engage
type: feature
priority: P0
complexity: 10
status: done
sprint: UA-P2
depends_on:
- UA2.1
---

# License Link Prompt

When a user logs in and their JWT has no license_id claim, show a prompt to link their PairCoder license. Calls bpsai-support to link, then re-fetches JWT with license claims.

# Acceptance Criteria

- [ ] After login, check JWT for license_id claim
- [ ] If missing, show modal: Link your PairCoder License with license key input field
- [ ] On submit, POST to bpsai-support /users/me/license via CC backend proxy
- [ ] On success, refresh the portal session (new JWT includes license_id)
- [ ] On failure, show error (invalid key, already linked, etc.)
- [ ] Dismiss option: user can skip and use CC without A2A features (chat only, no sessions)
- [ ] Link status persisted in JWT, prompt only shows when license_id is absent
- [ ] Tests: prompt appears when no license, disappears after successful link, error display, skip behavior