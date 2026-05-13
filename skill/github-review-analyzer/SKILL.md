---
name: github-review-analyzer
description: >-
  Analyze GitHub pull request review comments with deep codebase understanding
  and produce a tiered action plan. Fetches all review threads (including
  pending/draft and outdated), assesses each comment against the actual code,
  traces imports and callers for context, checks codebase conventions, and
  classifies feedback as Critical, Recommended, Optional, or Declined. Use when a
  user wants to understand which review comments matter, create a plan from PR
  feedback, assess review validity against the codebase, triage PR comments, or
  decide what to fix first.
---

# GitHub PR Review Analyzer

Analyze PR review comments with deep codebase context and produce a tiered plan
for Gandalf's orchestration workflow.

## Executor ownership

This skill is read-only analysis. **Legolas** fetches PR comments via the
`gh-fetch-pr-comments` skill/script and explores the relevant codebase. The
invoking agent or Gandalf applies the analysis rubric and synthesizes action
items. For non-trivial work, implementation routes through Gandalf's workflow:
plan → Saruman pre-impl review → user approval → Aragorn execution → post-impl
audit.

## Core insight

A review comment's value depends on the code it references, not just the words in
the comment. A suggestion that sounds reasonable might contradict established
patterns. A nitpick might reveal a real bug. The only way to know is to read the
code deeply before judging.

## Inputs

Accept PR references in any of these forms:

| Format | Example |
|--------|---------|
| PR number (current repo) | `#123` or `123` |
| Owner/repo with number | `owner/repo#123` |
| Full URL | `https://github.com/owner/repo/pull/123` |
| No reference | Auto-detect from current branch's open PR |

Optional flags:

| Flag | Purpose |
|------|---------|
| `--ticket <TICKET-ID>` | Cross-reference Jira acceptance criteria during analysis. |
| `--pattern-ref <directory>` | Scan a directory for codebase conventions to use as a pattern guide. |

## Gandalf workflow for `/review-plan`

1. **PR feedback retrieval:** Legolas uses `gh-fetch-pr-comments` /
   `~/code/scripts/agent/gh-pr-comments.sh` to fetch all review comments,
   including resolved, outdated, and pending/draft threads.
2. **Codebase context:** Legolas explores referenced files, changed files,
   related tests, imports/callers, and convention sources.
3. **Analysis:** `github-review-analyzer` assesses comments against the actual
   code and classifies each item.
4. **Executable plan synthesis:** Gandalf turns Critical + Recommended items into
   executable action items via `plan-author` (chat-first if the plan still needs
   Saruman review).
5. **Saruman review:** Saruman reviews only Critical + Recommended items as the
   executable plan. The full analysis, including Optional and Declined items, is
   attached as context so Saruman can challenge misclassification.
6. **User approval:** Gandalf surfaces Saruman's verdict and waits for explicit
   user approval.
7. **Implementation:** Aragorn implements the approved plan.

## Preflight

1. Verify `gh auth status` works.
2. Resolve owner/repo from git remote if not specified.
3. Confirm the PR exists and is accessible.
4. If `--ticket` is provided, fetch Jira context with:
   ```bash
   ~/code/scripts/agent/jira-fetch-ticket.sh --all <TICKET-ID>
   ```

If any preflight check fails, stop and report the error clearly. If Jira context
is unavailable, warn and proceed without AC traceability.

## Phase 1: Data retrieval

Follow the `gh-fetch-pr-comments` skill workflow. The data must include:

- PR metadata: title, state, author, branches, description
- All reviews, including pending/draft
- All review threads with resolution and outdated state
- Full comment chains within each thread
- Changed file list
- PR diff
- Commit history

Do not filter comments during retrieval. Filtering belongs in analysis.

## Phase 2: Thread preprocessing

For each thread:

1. **Read the full thread chain** before assessment. Replies may narrow, soften,
   or withdraw the original concern.
2. **Resolution state:** skip genuinely resolved or effectively resolved threads,
   but count them in filtered totals.
3. **Outdated threads:** read current code at the referenced file/region. Keep
   outdated comments when the concern still applies.
4. **Target classification:** tag each item as `[your change]` or
   `[pre-existing code]` by comparing against the PR diff.
5. **Author classification:** keep human and AI-reviewer comments; filter CI-only
   status comments.
6. **Feedback loop detection:** compare unresolved suggestions with earlier
   resolved feedback and commit history. If a suggestion would revert a prior
   review-driven change, tag it as `[feedback loop detected]` and look for a
   third approach rather than oscillating.

## Phase 3: Codebase analysis

For each surviving comment:

1. Read the referenced file in full.
2. Trace imports and callers deeply enough to understand ripple effects. If the
   impact appears broad, dispatch Legolas for focused call-path exploration.
3. Read related tests and test conventions.
4. Check sibling files and local patterns. If `--pattern-ref` was provided,
   dispatch Legolas to summarize conventions in that directory.
5. If `--ticket` was provided, map the comment to acceptance criteria where
   applicable and identify AC gaps.

## Phase 4: Assessment dimensions

Evaluate each item on:

- **Technical validity:** Is the comment factually correct about current code?
- **Codebase alignment:** Does the suggestion match existing patterns?
- **Impact:** correctness, security, data integrity, performance,
  maintainability, readability, style.
- **Solution quality:** Does the proposed fix solve the right problem without
  introducing worse tradeoffs?
- **Traceability:** classify the action as one or more of:
  - `AC-gap` — needed to satisfy or protect a Jira acceptance criterion.
  - `code-quality` — correctness, safety, maintainability, performance, or test
    quality independent of AC.
  - `reviewer-preference` — style/readability preference with limited objective
    impact.
- **Pre-existing code awareness:** flag issues outside the PR's introduced
  changes.
- **Feedback-loop awareness:** avoid planning a plain revert loop.

## Tier definitions

### Critical

Blocking issues: correctness, security, data integrity, crash/error conditions,
or clear AC gaps that make the PR incomplete. Critical items are part of the
executable plan sent to Saruman.

### Recommended

Worth doing before merge: maintainability, performance, error handling,
missing tests, convention-backed consistency, or low-risk improvements with
clear objective value. Recommended items are part of the executable plan sent to
Saruman.

### Optional

Style/readability/DX improvements, reviewer preferences, or low-impact cleanup
that may be useful but should not block the implementation plan. Optional items
are attached as context for Saruman, not part of the executable plan by default.

### Declined

Incorrect, harmful, contradictory, redundant, out-of-scope, or unjustified
suggestions. Include evidence so Saruman and the user can challenge the
classification.

## Output format

```markdown
# PR Review Analysis: <PR title> (#<number>)

**PR:** <owner/repo>#<number>
**Status:** <open/merged/closed>
**Author:** @<author>
**Base:** <base> <- <head>
**Jira ticket:** <ticket-id or "not provided">
**Pattern reference:** <directory or "none">

**Threads analyzed:** N of M total
**Filtered:** X resolved/effectively resolved · Y CI-only · Z outdated no longer applicable
**Outdated re-evaluated:** A still applicable · B no longer relevant
**Feedback loops detected:** N

---

## Executable Plan Candidates

> Gandalf feeds Critical + Recommended items into plan-author. Saruman reviews
> this executable subset with the full analysis attached as context.

### Critical Changes (N)

#### 1. [<file>] <what should change>
**Triggered by:** @<reviewer> — "<quoted comment excerpt>"
**Traceability:** AC-gap | code-quality | reviewer-preference
**Comment targets:** your change | pre-existing code
**Thread status:** current | outdated but still applicable | feedback loop detected
**Why this is critical:** <concrete consequence>
**Suggested approach:** <implementation direction, not a patch>
**Tests/verification:** <what proves the fix>
**AC relevance:** <AC id/text if --ticket was provided, otherwise omit>

### Recommended Changes (N)

<same shape as Critical, with "Why recommended" instead of "Why critical">

---

## Context Only

### Optional Improvements (N)

<Items with rationale, traceability, and suggested action if the user chooses.>

### Declined Suggestions (N)

#### 1. [<file>] <what was suggested>
**Triggered by:** @<reviewer> — "<quoted comment excerpt>"
**Confidence:** High | Medium | Low
**Why declined:** <assessment>
**Evidence:** <specific codebase evidence>
**Risk if implemented:** <what breaks or degrades>
**What would change this assessment:** <additional context that could flip it>

---

## Filtered Out

- X resolved threads
- Y effectively resolved threads
- Z CI/tooling comments
- W outdated threads no longer applicable
```

If no comments survive filtering, output an "All Clear" report with counts and
the evidence checked.

## Plan handoff rules

- Only Critical + Recommended items become executable action items by default.
- Preserve traceability on every action: `AC-gap`, `code-quality`, and/or
  `reviewer-preference`.
- Attach Optional and Declined items to the Saruman review context so Saruman can
  challenge under- or over-inclusion.
- If Saruman challenges a classification, revise the action set and re-review
  before user approval.

## Guardrails

- **Read-only.** Never modify code, push, approve, dismiss, or resolve
  conversations.
- **Never fabricate.** Quote original comments and cite code evidence.
- **No shortcut triage.** Read referenced code and relevant context before
  classifying an item.
- **Never plan a revert loop.** Resolve the underlying tension or decline with
  evidence.
- **Evidence-proportional disagreement.** High-confidence disagreement requires
  codebase evidence; low-confidence disagreement must say so.
- **Pre-existing code honesty.** Always flag when a comment targets code the PR
  author did not change.

## Error handling

| Condition | Response |
|-----------|----------|
| `gh` not authenticated | `Error: gh CLI is not authenticated. Run gh auth login to authenticate.` |
| PR not found / no access | `Error: Could not access PR <reference>. Verify the PR exists and you have access.` |
| No review comments | `This PR has no review comments.` |
| Jira unavailable with `--ticket` | Warn that Jira context is unavailable; proceed without AC traceability. |
| Pattern ref directory not found | Warn that pattern reference is unavailable; proceed with local conventions. |
| Ambiguous PR reference | Ask one concise clarifying question. |
