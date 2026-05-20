# Skill Domain-Bias Cleanup Closeout

Date: 2026-05-20

## Summary

- Audited all 22 OpenCode skills for framework/domain-specific wording that should
  be generalized or explicitly scoped.
- Rewrote `bug-hunter` to be language-agnostic while keeping concrete examples.
- Applied targeted domain-bias cleanup to `diagnose`, `prototype`, and
  `style-audit`.
- Left intentionally Wpromote/script-specific skills alone where the specificity
  is part of their contract.

## Script metadata work

- T4.1: `gh-pr-comments.sh`, `sonar-pr-issues.sh`, and `jira-fetch-ticket.sh`
  now emit top-level `version: 1`.
- T4.2: `gh-pr-comments.sh` and `sonar-pr-issues.sh` now emit top-level
  `counts`; SonarCloud total moved from top-level `total` to `counts.total`.
- Updated wrapper help/docs and OpenCode skill output contracts to match the new
  data-script JSON shapes.

## T4.3-T4.5 closure

- Verified N/A for this closeout: the scripts repo's own `EXECUTION-PLAN.md`
  dated 2026-04-29 supersedes the older `SHELL-LAYER-PLAN`; remaining cosmetic
  polish items were already resolved or no longer applicable.

## Current state

- Active todo items are complete.
- Previous completed todo state is archived at
  `.project-plans/archive/2026-05-20_todo-domain-bias-complete.md`.
- Fresh `.project-plans/todo.md` contains no active items and points to the
  archive for history.
