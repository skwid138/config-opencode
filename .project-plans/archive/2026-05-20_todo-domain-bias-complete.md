# OpenCode Config — Completed Todo Snapshot

> Archived 2026-05-20 after all active items were completed. This preserves the
> completed todo state before a fresh `.project-plans/todo.md` was created.

## Active Items

### HIGH

- [x] ~~**Fix Saruman auto-ticket-context.sh ask/deny loop**~~ — ✅ 2026-05-20 — Fixed by council permission ruleset injection (catch-all deny replaces catch-all ask in child sessions).
- [x] ~~**Harden `plan` agent bash permissions**~~ — Cancelled — agent is hidden/unused; not worth the maintenance.

### MEDIUM

- [x] ~~**bug-hunter skill: address React/RTK-Query specificity**~~ — ✅ 2026-05-20 — Rewritten to be fully language-agnostic (Python, shell, Go, etc.), not just framework-agnostic.
- [x] ~~**Shell T4.1: Fix version field doc/reality mismatch**~~ — ✅ 2026-05-20 — Added `version: 1` to gh-pr-comments.sh, sonar-pr-issues.sh, jira-fetch-ticket.sh.
- [x] ~~**Shell T4.2: Add `counts` fields to data scripts**~~ — ✅ 2026-05-20 — Added counts object to gh-pr-comments.sh and sonar-pr-issues.sh.
- [x] ~~**Council plugin: add tests + session.abort() cleanup**~~ — ✅ 2026-05-20 — Tests added (15 passing), session.abort() cleanup implemented, permission ruleset injection added.

### LOW

- [x] ~~**Shell T4.3-T4.5: Cosmetic polish**~~ — ✅ 2026-05-20 — Verified N/A: scripts repo's own EXECUTION-PLAN.md (2026-04-29) supersedes SHELL-LAYER-PLAN; all items resolved in prior sessions.
- [x] ~~**Audit skills for domain-bias**~~ — ✅ 2026-05-20 — Scanned all 22 skills; targeted cleanup applied to `diagnose`, `prototype`, and `style-audit`; intentionally Wpromote/script-specific skills left alone.

## Completed

_(migrated from previous todo — see `archive/2026-05-20_todo.md` for full history)_

- ✅ 2026-05-19 — Council-review plugin (council-tool.ts, elrond.md, opencode.json config)
- ✅ 2026-05-12 — Shell layer plan T1-T3 (critical fixes, reliability, new scripts)
- ✅ 2026-05-20 — Council permission fix (explicit permission ruleset injection into councillor sessions, opencode.json bash rules)
- ✅ 2026-05-20 — Council plugin tests + session.abort() cleanup
- ✅ 2026-05-20 — Saruman ask/deny loop fix (via council permission ruleset injection)
- ✅ 2026-05-20 — bug-hunter skill rewritten language-agnostic
- ✅ 2026-05-20 — Shell T4.1 version field added to 3 data scripts
- ✅ 2026-05-20 — Shell T4.2 counts fields added to gh-pr-comments + sonar-pr-issues
- ✅ 2026-05-20 — Shell T4.3-T4.5 verified N/A (superseded by scripts repo execution plan)
- ✅ 2026-05-20 — Domain-bias audit completed across all 22 skills; targeted cleanup applied to diagnose/prototype/style-audit
