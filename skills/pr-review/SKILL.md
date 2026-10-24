---
name: pr-review
description: >-
  Review code changes (diff from main branch) for quality, security, and
  acceptance criteria compliance. Use this skill whenever a user asks to review
  their PR, check their code changes, review a diff, verify acceptance criteria
  are met by their code, "does my code satisfy the AC", "review my changes",
  "check my PR", "am I done with this ticket", or any request to evaluate local
  code changes against quality standards or Jira ticket requirements.
---

# PR Review

Review local code changes against quality standards and Jira acceptance criteria.
Produces a structured review with code quality findings, AC compliance mapping,
and actionable suggestions.

## Executor ownership

The invoking agent executes this read-only review. It may dispatch **Legolas** for
focused codebase exploration if the diff requires broader context. This skill
does not modify code, create PRs, push changes, or mutate Jira. It is distinct
from `post-impl-audit`: `pr-review` is a PR reviewer perspective; post-impl audit
is Saruman's plan-compliance check after Aragorn implements.

## When to use this skill

- "Review my PR"
- "Review my changes"
- "Check my diff"
- "Does my code meet the AC?"
- "Am I done with this ticket?"
- "What's left to do on BIXB-18835?"
- "Review the code for BIXB-18835"
- Any request to evaluate uncommitted or branch-level changes

Do **not** use this skill for analyzing review comments on GitHub (use
`github-review-analyzer`) or for writing code (route implementation through
Gandalf to Aragorn).

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **full** (default) | "review my PR", "review my changes" | Code quality + AC compliance + suggestions |
| **code-only** | "just review the code", "code review only" | Code quality review without Jira interaction |
| **ac-compliance** | "check the AC", "does my code meet the AC" | AC compliance check only, minimal code quality |

If intent is ambiguous, default to **full** mode.

## Input parsing

| Input | Example | Handling |
|-------|---------|---------|
| No arguments | `/review` | Auto-detect branch + ticket from branch name |
| Ticket ID | `/review BIXB-18835` | Use provided ticket ID |
| File focus | `/review src/components/` | Limit diff to specified path(s) |
| Ticket + path | `/review BIXB-18835 src/api/` | Both overrides |

## Preflight

1. Verify git context:
   ```bash
   git rev-parse --is-inside-work-tree
   ```
2. Verify there are changes from main:
   ```bash
   git diff main...HEAD --stat
   ```
   If no changes exist, report that there is nothing to review relative to main.
3. For full/ac-compliance modes, detect the ticket with the wrapper:
   ```bash
   ~/code/scripts/agent/branch-to-ticket.sh
   ```
   If detection fails and no ticket was provided, ask for the ticket ID. In
   code-only mode, skip ticket detection.
4. Fetch Jira context with the wrapper, not raw `acli`:
   ```bash
   ~/code/scripts/agent/jira-fetch-ticket.sh --all <TICKET-ID>
   ```
   If unavailable, fall back to code-only mode and explain why.

## Workflow

### Step 1: Gather the diff

Use git to collect:

```bash
git diff main...HEAD --stat
git diff main...HEAD
git log main..HEAD --oneline
git branch --show-current
```

If the user specified paths, scope the diff to those paths. If the diff is very
large, start from the stat and changed-file list, then read changed files
selectively.

### Step 2: Parse acceptance criteria

For full and ac-compliance modes, parse Jira description and relevant comments
for:

- Acceptance criteria
- Business value
- Implementation details or constraints
- Explicit out-of-scope/deferred work

If AC are unclear or missing, flag that as a review risk rather than inventing
requirements.

### Step 3: Code quality analysis

Review the diff and surrounding code for:

**Critical:** security vulnerabilities, data loss risks, logic errors, crashes,
auth bypasses, unsafe migrations, or correctness failures.

**Important:** missing error handling, performance issues, boundary validation
gaps, race conditions, missing tests for changed behavior, or pattern violations
that create maintainability risk.

**Suggestions:** low-risk clarity, consistency, naming, or cleanup improvements.

For each finding, include file/location, issue, consequence, and concrete
recommendation. Do not flag stylistic preferences without a codebase convention
or correctness impact.

### Step 4: SonarCloud cross-reference

When static-analysis context is relevant, invoke the `sonarcloud` skill. Do not
duplicate SonarCloud CLI logic here; the `sonarcloud` skill and
`~/code/scripts/agent/sonar-pr-issues.sh` wrapper are authoritative. Incorporate
results as supporting evidence or additional findings.

### Step 5: AC compliance mapping

For each acceptance criterion, classify the diff:

| Status | Meaning |
|--------|---------|
| ✅ Met | The diff clearly implements this criterion |
| ⚠️ Partial | Some aspects addressed, but gaps remain |
| ❌ Not addressed | No changes related to this criterion found |
| 🔍 Manual verification | Cannot determine from code alone |

Explain the evidence for each criterion with file paths or state what is missing.

### Step 6: Prioritized next steps

Group recommendations as:

1. **Must do before merging** — critical findings and unmet AC.
2. **Should do** — important findings, partial AC, missing tests.
3. **Consider** — optional suggestions or follow-up cleanup.

## Output format

### Full mode

```markdown
## PR Review: <branch-name>

**Ticket:** <TICKET-ID> — <summary>
**Branch:** <branch-name> → main
**Changed files:** <count> files, +<additions> -<deletions>
**Commits:** <count> commits

### Code Quality Findings

#### Critical
<findings or "None found">

#### Important
<findings or "None found">

#### Suggestions
<findings or "None — looks clean">

### SonarCloud Findings
<Omit when not applicable; otherwise summarize sonarcloud skill output.>

### Acceptance Criteria Compliance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | <AC text> | ✅/⚠️/❌/🔍 | <brief explanation> |

**Overall:** <X of Y criteria met>

### Summary & Next Steps

**Verdict:** <Ready to merge / Needs work / Major gaps>

**Must do:**
- <item>

**Should do:**
- <item>

**Consider:**
- <item>
```

### Code-only mode

Use the full-mode structure but omit Jira ticket and AC compliance sections.

### AC-compliance mode

```markdown
## AC Compliance Check: <branch-name>

**Ticket:** <TICKET-ID> — <summary>
**Branch:** <branch-name> → main

### Acceptance Criteria Compliance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | <AC text> | ✅/⚠️/❌/🔍 | <brief explanation> |

**Overall:** <X of Y criteria met>

### Gaps
<For any ❌ or ⚠️ items, describe what is missing and suggest what to implement>
```

## Guardrails

- **Be specific.** Findings need concrete file paths and consequences.
- **Read surrounding code.** Do not review the diff in isolation.
- **Respect codebase style.** Only flag style when a convention exists or the
  issue affects clarity/correctness.
- **Do not over-flag.** Prioritize correctness, security, and requirements.
- **Stay read-only.** This skill reviews code; it does not modify code, create
  PRs, push changes, or mutate Jira.
- **Route fixes correctly.** For non-trivial work, implementation routes through
  Gandalf's workflow: plan → Saruman pre-impl review → user approval → Aragorn
  execution → post-impl audit.
