# OpenCode Config — Outstanding Work

> Convention: append-only. Don't edit past entries; mark done with ✅ and date. Add new items at the bottom of the relevant priority section.

## Active Items

### HIGH

- [ ] **Fix Saruman auto-ticket-context.sh ask/deny loop** — Make the "mandatory first step" in `agent/saruman.md` conditional: only run when in a git repo with a branch matching a ticket pattern; skip otherwise. This is a behavioral contract change, not just a doc edit. (Effort: XS)
- [ ] **Harden `plan` agent bash permissions** — Add a permission block to the `plan` agent config in `opencode.json` restricting bash access. Currently has no permission block at all. (Effort: XS)

### MEDIUM

- [ ] **`bug-hunter` skill: address React/RTK-Query specificity** — The skill references React hooks, selectors, RTK-Query patterns without noting this is framework-specific. Either add a specificity note to the description or generalize the language. (Effort: XS)
- [ ] **Shell T4.1: Fix version field doc/reality mismatch** — `~/code/scripts/README.md` already documents `"version":1` in example output for `gh-pr-comments.sh`, `sonar-pr-issues.sh`, `jira-fetch-ticket.sh`, but the scripts don't actually emit it. Make reality match docs. Check if any consumers already parse for this field. (Effort: S — 3 files)
- [ ] **Shell T4.2: Add `counts` fields to data scripts** — Add summary count fields to JSON output of data retrieval scripts per SHELL-LAYER-PLAN T4.2. (Effort: S)
- [x] ~~**Council plugin: add tests + session.abort() cleanup**~~ — ✅ 2026-05-20 — Tests added (15 passing), session.abort() cleanup implemented, permission ruleset injection added.

### LOW

- [ ] **Shell T4.3-T4.5: Cosmetic polish** — Minor items from SHELL-LAYER-PLAN T4 (scope TBD, review archived plan for details). (Effort: ?)
- [ ] **Audit skills for domain-bias** — Scan all 22 skills for framework/domain-specific language that should be noted or generalized. (Effort: M)

## Completed

_(migrated from previous todo — see `archive/2026-05-20_todo.md` for full history)_

- ✅ 2026-05-19 — Council-review plugin (council-tool.ts, elrond.md, opencode.json config)
- ✅ 2026-05-12 — Shell layer plan T1-T3 (critical fixes, reliability, new scripts)
- ✅ 2026-05-20 — Council permission fix (explicit permission ruleset injection into councillor sessions, opencode.json bash rules)
- ✅ 2026-05-20 — Council plugin tests + session.abort() cleanup
