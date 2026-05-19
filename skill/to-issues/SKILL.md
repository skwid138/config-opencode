---
name: to-issues
description: Convert a plan into vertical-slice GitHub issues. GitHub-only; Jira work routes through jira-plan.
---

# To Issues

Use this skill when the user wants to convert an implementation plan into GitHub issues.

This skill is GitHub-only. Do not use it for Jira planning or ticket creation; route Jira work through `jira-plan`.

## Workflow

1. Read the plan and identify vertical slices: each issue should be independently deliverable and reviewable.
2. Draft the GitHub issues in chat first. Stay read-only by default.
3. Include an AFK classification on each issue:
   - `AFK: yes` — can likely be completed autonomously without human input.
   - `AFK: no` — needs human input, product judgment, credentials, environment access, or external coordination.
4. Show the drafts to the user and ask for explicit approval before creating anything.
5. Only after approval, Aragorn may run `gh issue create` for the approved drafts.

## Issue shape

Each draft should include:

- Title.
- Goal / user-visible outcome.
- Scope and non-goals.
- Acceptance criteria.
- Implementation notes and relevant file paths.
- Dependencies or ordering constraints.
- AFK classification and reason.

Prefer fewer, complete vertical slices over many horizontal technical chores.
