---
name: pr-review
description: >-
  Review code changes (diff from main branch) for quality, security, and
  acceptance criteria compliance. Use this skill whenever a user asks to review
  their PR, check their code changes, review a diff, verify acceptance criteria
  are met by their code, "does my code satisfy the AC", "review my changes",
  "check my PR", "am I done with this ticket", or any request to evaluate local
  code changes against quality standards or Jira ticket requirements — even if
  they don't explicitly say "PR review."
---

# PR Review

Review local code changes against quality standards and Jira acceptance criteria.
Produces a structured review with code quality findings, AC compliance mapping,
and actionable suggestions.

## When to use this skill

- "Review my PR"
- "Review my changes"
- "Check my diff"
- "Does my code meet the AC?"
- "Am I done with this ticket?"
- "What's left to do on BIXB-18835?"
- "Review the code for BIXB-18835"
- Any request to evaluate uncommitted or branch-level changes

Do **not** use this skill for reviewing other people's PRs on GitHub (use the
github-review-analyzer skill for that), or for writing code.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **full** (default) | "review my PR", "review my changes" | Code quality + AC compliance + suggestions |
| **code-only** | "just review the code", "code review only" | Code quality review without Jira interaction |
| **ac-compliance** | "check the AC", "does my code meet the AC" | AC compliance check only, minimal code quality |

If the user's intent is ambiguous, default to **full** mode.

## Input parsing

The user may provide:

| Input | Example | Handling |
|-------|---------|---------|
| No arguments | `/review` | Auto-detect branch + ticket from branch name |
| Ticket ID | `/review BIXB-18835` | Use provided ticket ID |
| File focus | `/review src/components/` | Limit diff to specified path(s) |
| Ticket + path | `/review BIXB-18835 src/api/` | Both overrides |

## Preflight

Before starting the review:

1. **Verify git context:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```
2. **Verify there are changes from main:**
   ```bash
   git diff main...HEAD --stat
   ```
   If no changes, inform the user: "No changes found relative to main. Make sure
   you're on a feature branch with commits."
3. **For AC modes — verify acli:**
   ```bash
   which acli && acli auth status
   ```
   If unavailable or unauthenticated, fall back to code-only mode and inform the
   user.

## Core workflow

### Step 1: Gather the diff

Get the full diff and a summary of changed files:

```bash
# File-level overview
git diff main...HEAD --stat

# Full diff content (for analysis)
git diff main...HEAD

# If user specified paths, scope the diff:
git diff main...HEAD -- <path1> <path2>
```

If the diff is very large (>3000 lines), focus on the `--stat` overview first,
then read individual changed files selectively. Prioritize files with the most
changes.

Also gather context about what was changed:

```bash
# List of commits on this branch
git log main..HEAD --oneline

# Current branch name
git branch --show-current
```

### Step 2: Detect the ticket ID

Parse the current branch name to extract the Jira ticket ID:

```bash
git branch --show-current
```

**Branch → Ticket conversion:**
- Branch: `bixb_18835` → Ticket: `BIXB-18835`
- Pattern: take the branch name, uppercase the project prefix, replace `_` with `-`
- Regex: `^([a-z]+)_(\d+)` → `\1-\2` uppercased

If the branch name doesn't match this pattern and the user didn't provide a
ticket ID, ask for it (in full and ac-compliance modes). In code-only mode, skip
ticket detection entirely.

If the user provided a ticket ID as an argument, use that instead of branch
detection.

### Step 3: Fetch the ticket (full and ac-compliance modes)

Use the Atlassian CLI to fetch ticket data:

```bash
acli jira workitem view <TICKET-ID>
```

Parse the description to extract:
- **Acceptance Criteria** — the numbered/bulleted checklist of requirements
- **Business Value** — context for why the changes matter
- **Implementation Details** — any technical guidance or constraints

Look for AC under headings like "Acceptance Criteria", "AC", or numbered lists
describing expected behavior. If AC are not clearly labeled, look for
bullet/numbered lists that describe expected behavior or conditions.

### Step 4: Code quality analysis

Review the diff for these categories, ordered by severity:

**Critical (must fix):**
- Security vulnerabilities (injection, XSS, auth bypass, exposed secrets)
- Data loss risks (unguarded deletes, missing transactions)
- Logic errors that produce incorrect results

**Important (should fix):**
- Missing error handling for likely failure modes
- Performance issues (N+1 queries, unbounded loops, missing pagination)
- Missing input validation at system boundaries
- Race conditions or concurrency issues

**Suggestions (nice to have):**
- Code style inconsistencies with the surrounding codebase
- Opportunities to simplify or reduce duplication
- Missing tests for new behavior or changed logic
- Variable/function naming that could be clearer

For each finding, provide:
1. The file and approximate location
2. What the issue is
3. Why it matters
4. A concrete suggestion for fixing it

**Do not flag:**
- Stylistic preferences that don't affect correctness
- Missing comments or documentation unless the code is genuinely unclear
- Minor formatting (these should be caught by linters)

### Step 5: SonarCloud cross-reference (all modes)

If the current repository is one of the 4 SonarCloud-enabled repos
(client-portal, kraken, polaris-api, polaris-web) and a PR exists for the
current branch, fetch SonarCloud issues to cross-reference with the code
quality findings from Step 4.

#### Detection

1. Get repo name from `git remote get-url origin`.
2. Check if it maps to a SonarCloud project key:
   - `client-portal` → `wpromote_client-portal`
   - `kraken` → `wpromote_kraken`
   - `polaris-api` → `wpromote_polaris-api`
   - `polaris-web` → `wpromote_polaris-web`
3. Check for a PR: `gh pr view --json number --jq '.number'`

If the repo isn't SonarCloud-enabled or no PR exists, skip this step silently.

#### Fetch

```bash
sonar list issues -p <project-key> --pull-request <pr-number> --format json
```

Filter to `issueStatus` of `OPEN` or `CONFIRMED` only.

Check CI freshness first:
```bash
gh pr checks --json name,status,conclusion | cat
```
If the SonarCloud check is still running or hasn't run, note the staleness.

#### Cross-reference

Compare SonarCloud issues against the code quality findings from Step 4:

- **Confirmed by both:** Issues found by both the manual review and SonarCloud.
  Note the SonarCloud rule as supporting evidence in the existing finding.
- **SonarCloud-only:** Issues found by SonarCloud but not in the manual review.
  Add these to the appropriate severity tier in the output (BLOCKER/CRITICAL →
  Critical, MAJOR → Important, MINOR/INFO → Suggestions).
- **Review-only:** Issues found by the manual review but not by SonarCloud.
  Keep as-is — no change needed.

Strip the project key prefix from component paths for readability.

#### Output

Add a "SonarCloud" subsection to the report, after the Code Quality Findings:

```
### SonarCloud Findings

**PR:** #<number> | **CI Status:** <completed/running/not found>
**Open issues:** <count>

| Severity | File | Line | Message | Rule | In Review? |
|----------|------|------|---------|------|------------|
| <severity> | <file> | <line> | <message> | <rule> | ✅ / ➕ New |
```

Mark issues already caught in Step 4 as "✅" (confirmed) and SonarCloud-only
issues as "➕ New". If no SonarCloud issues exist, show:

```
### SonarCloud Findings

No open SonarCloud issues on PR #<number>.
```

If SonarCloud is not applicable (wrong repo or no PR), omit this section
entirely.

### Step 6: AC compliance mapping (full and ac-compliance modes)

For each acceptance criterion from the ticket, assess whether the diff addresses
it. Use this classification:

| Status | Meaning |
|--------|---------|
| ✅ Met | The diff clearly implements this criterion |
| ⚠️ Partial | Some aspects addressed, but gaps remain |
| ❌ Not addressed | No changes related to this criterion found in the diff |
| 🔍 Manual verification | Cannot determine from code alone (UI behavior, visual design, etc.) |

For each criterion, explain your reasoning briefly — which files/changes satisfy
it, or what's missing.

### Step 7: Generate suggestions

Based on the review, provide prioritized next steps:

1. **Must do before merging** — critical and important findings
2. **Should do** — incomplete AC items, missing tests
3. **Consider** — suggestions, improvements for a follow-up

## Output format

### Full mode output

```
## PR Review: <branch-name>

**Ticket:** <TICKET-ID> — <summary>
**Branch:** <branch-name> → main
**Changed files:** <count> files, +<additions> -<deletions>
**Commits:** <count> commits

---

### Code Quality Findings

#### Critical
<findings or "None found">

#### Important
<findings or "None found">

#### Suggestions
<findings or "None — looks clean">

---

### Acceptance Criteria Compliance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | <AC text> | ✅/⚠️/❌/🔍 | <brief explanation> |
| 2 | <AC text> | ✅/⚠️/❌/🔍 | <brief explanation> |

**Overall:** <X of Y criteria met>

---

### Summary & Next Steps

**Verdict:** <Ready to merge / Needs work / Major gaps>

**Must do:**
- <item>

**Should do:**
- <item>

**Consider:**
- <item>
```

### Code-only mode output

Same as full mode but omit the "Acceptance Criteria Compliance" section entirely.

### AC-compliance mode output

```
## AC Compliance Check: <branch-name>

**Ticket:** <TICKET-ID> — <summary>
**Branch:** <branch-name> → main

### Acceptance Criteria Compliance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | <AC text> | ✅/⚠️/❌/🔍 | <brief explanation> |

**Overall:** <X of Y criteria met>

### Gaps
<For any ❌ or ⚠️ items, describe what's missing and suggest what to implement>
```

## Important guidelines

- **Be specific, not vague.** "This function might have issues" is useless.
  "Line 42 in `api/handler.ts`: the `userId` parameter is used in a SQL query
  without parameterization" is actionable.
- **Respect the codebase style.** If the project uses a particular pattern, don't
  flag it as wrong just because you'd do it differently.
- **Don't over-flag.** A review with 30 nitpicks is noise. Focus on what
  actually matters for correctness, security, and meeting requirements.
- **Read surrounding code.** Don't review the diff in isolation. Read the files
  being modified to understand the existing patterns and context.
- **Stay read-only.** This skill reviews code — it does not modify code, create
  PRs, or push changes.
