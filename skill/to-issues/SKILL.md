---
name: to-issues
description: Convert a plan into vertical-slice GitHub issues. GitHub-only; Jira work routes through jira-plan.
---

# To Issues

Use this skill when the user wants to convert an implementation plan into GitHub issues.

This skill is GitHub-only. Do not use it for Jira planning or ticket creation; route Jira work through `jira-plan`.

## Repository scope

Before any mutation, validate the repository scope for the repo that will actually be mutated. Resolve the target repo in this order:

1. The explicit `owner/repo` the work targets.
2. The current working directory's default remote as a last resort.

There is no issue-URL tier here; that tier applies only to `triage`.

Discover the authoritative owner with `gh repo view <owner/repo> --json owner --jq .owner.login`, then compare it case-insensitively to `skwid138` by lowercasing both sides. A current working directory path containing `wpromote` is a non-blocking advisory heads-up only; it never overrides a passing owner check and is never the sole basis for refusal.

If the owner is `Wpromote`, refuse and redirect the user to the `jira-plan` skill. If the owner is any other account besides `skwid138`, refuse and ask the user to choose a personal `skwid138` repository. If `gh repo view` fails, fail closed: refuse, explain that ownership could not be determined, and ask for an explicit personal `owner/repo` before retrying. After validation, use explicit `-R owner/repo` on every `gh` call.

## Label dependency

GitHub label names, colors, descriptions, and migrations live in `/Users/hunter/code/scripts/data/github-labels.yml`. Treat that manifest as the source of truth; never embed or duplicate its contents in this skill.

Before drafting issues, read and parse the manifest. Degrade to **no label automation** for the entire run when the manifest is absent, unreadable, unparseable, or when these required anchors cannot all be extracted from it:

- A non-empty `type` axis.
- `priority/normal`.
- `status/accepted`.

When label automation is unavailable:

- State prominently that label automation is unavailable and explain the manifest or anchor problem.
- Do not guess label names.
- Do not apply partial labels.
- Continue drafting issues for user review, but each draft must show `labels: automation unavailable`.

## Workflow

1. Read the plan and identify vertical slices: each issue should be independently deliverable and reviewable.
2. Draft the GitHub issues in chat first. Stay read-only by default.
3. Include an AFK classification on each issue:
   - `AFK: yes` — can likely be completed autonomously without human input.
   - `AFK: no` — needs human input, product judgment, credentials, environment access, or external coordination.
4. Show the drafts to the user and ask for explicit approval before creating anything.
5. Only after approval, Aragorn may create the approved drafts in the validated repo:
   - Create each issue first, non-interactively, without labels: `gh issue create -R owner/repo --title "..." --body "..."`.
   - Capture the returned issue URL.
   - When label automation is available, apply labels after creation with the resolved manifest strings: `gh issue edit <url> -R owner/repo --add-label <resolved-type> --add-label <resolved-priority> --add-label status/accepted`.
   - On label failure, report the exact failed label names plus the `gh` error text. Do not emit a blanket "unsynced" blame. If labels are missing on the repo, tell the user to run `gh-label-sync.sh` against that repo and then re-apply.
   - In multi-issue batches, a create failure or label failure does not abort the batch. Continue creating the remaining approved issues, then emit a consolidated end-of-batch summary with one entry per failure containing `{issue URL or create-failed/no-URL, failed op (create|label), exact labels attempted, gh error text}` plus a retry instruction.

## Issue shape

Each draft should include:

- Title.
- Goal / user-visible outcome.
- Scope and non-goals.
- Acceptance criteria.
- Implementation notes and relevant file paths.
- Dependencies or ordering constraints.
- AFK classification and reason.
- Proposed baseline labels for user approval before creation: one `type/*`, one `priority/*`, and `status/accepted`, all resolved from the manifest at runtime.

Baseline label selection rules:

- Pick the `type/*` label whose manifest description best matches the issue. If multiple type labels plausibly match, surface the tie and ask the user to choose at the approval gate.
- Pick `priority/*` with a light urgency heuristic: plan text saying critical or urgent -> `priority/critical`; plan text saying high -> `priority/high`; otherwise default to `priority/normal`. Surface priority ambiguity at the approval gate.
- Use `status/accepted` for every newly-created issue.
- Treat the manifest as authoritative. If a required anchor was renamed or removed, label automation degrades for the entire run as described above.
- When label automation is unavailable, show `labels: automation unavailable` instead of proposed label names.

Prefer fewer, complete vertical slices over many horizontal technical chores.
