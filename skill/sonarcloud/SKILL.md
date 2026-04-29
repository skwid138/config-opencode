---
name: sonarcloud
description: >-
  Fetch and analyze SonarCloud issues for a pull request. Use this skill whenever
  a user asks about SonarCloud issues, sonar findings, code quality issues from
  SonarCloud, "what did sonar find", "sonar issues for this PR", "check sonar",
  or any request to retrieve or analyze SonarCloud results — even if they don't
  explicitly say "SonarCloud." Also used internally by ticket-plan and pr-review
  skills to incorporate static analysis findings.
---

# SonarCloud Issues

Fetch SonarCloud issues for a pull request and present them as a structured
report. Can be used standalone or as a data source for other skills
(ticket-plan, pr-review).

## Script

**Always use the script for data retrieval:**

```bash
~/code/scripts/agent/sonar-pr-issues.sh [PR_NUMBER]
~/code/scripts/agent/sonar-pr-issues.sh --severity MAJOR 275
~/code/scripts/agent/sonar-pr-issues.sh --project wpromote_polaris-web 280
```

The script outputs JSON with keys: `project`, `pr`, `ci_status`, `total`, `issues`.
Use `jq` to filter/format. The rest of this skill describes presentation and context.

## When to use this skill

- "Check sonar for this PR"
- "What did SonarCloud find?"
- "Sonar issues for PR 275"
- "Any sonar blockers?"
- `/sonar`
- Called internally by ticket-plan and pr-review skills

Do **not** use this skill for running SonarQube scans (that's `sonar-scanner`),
managing SonarCloud project settings, or resolving/accepting issues in
SonarCloud.

## Supported repositories

Only these 4 repositories have SonarCloud projects:

| Repository | SonarCloud Project Key |
|------------|----------------------|
| client-portal | `wpromote_client-portal` |
| kraken | `wpromote_kraken` |
| polaris-api | `wpromote_polaris-api` |
| polaris-web | `wpromote_polaris-web` |

## Input parsing

| Input | Example | Handling |
|-------|---------|---------|
| No arguments | `/sonar` | Auto-detect repo + PR from git context |
| PR number | `/sonar 275` | Auto-detect repo, use provided PR number |
| Project + PR | `/sonar wpromote_polaris-web 275` | Use both directly |
| Severity floor | `/sonar --severity MAJOR` | Filter to MAJOR and above |
| Format override | `/sonar --format toon` | Pass format to CLI |

### Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--severity <level>` | _(none — all severities)_ | Severity floor. Only show issues at this level or higher. Levels from highest to lowest: `BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `INFO` |
| `--format <format>` | `json` (standalone) | Output format passed to CLI. Options: `json`, `toon`. When called by other skills, always `json` regardless of this flag |

## Preflight

### Step 1: Verify the sonar CLI

```bash
sonar auth status
```

If the command is not found, instruct:
"Install the SonarQube CLI: `curl -o- https://raw.githubusercontent.com/SonarSource/sonarqube-cli/refs/heads/master/user-scripts/install.sh | bash`
Then authenticate: `sonar auth login -o wpromote --with-token <YOUR_TOKEN>`"

If the command exists but auth fails, instruct:
"Run `sonar auth login -o wpromote --with-token <YOUR_TOKEN>` to authenticate."

### Step 2: Detect the project key

Determine the SonarCloud project key from the current git repository:

```bash
git remote get-url origin
```

Extract the repository name from the remote URL:
- `git@github.com:wpromote/polaris-web.git` -> `polaris-web`
- `https://github.com/wpromote/polaris-web.git` -> `polaris-web`

Map to project key using the lookup table:
- `client-portal` -> `wpromote_client-portal`
- `kraken` -> `wpromote_kraken`
- `polaris-api` -> `wpromote_polaris-api`
- `polaris-web` -> `wpromote_polaris-web`

If the repository is not in the lookup table, stop and inform the user:
"This repository does not have a SonarCloud project configured. Supported
repos: client-portal, kraken, polaris-api, polaris-web."

If the user provided a project key explicitly, use that instead.

### Step 3: Detect the PR number

If no PR number was provided:

```bash
~/code/scripts/agent/gh-current-pr.sh
```

If this fails (no PR for the current branch), stop and inform the user:
"No open PR found for the current branch. Provide a PR number explicitly:
`/sonar 275`"

### Step 4: Check CI status

Before fetching issues, check whether SonarCloud analysis has run on the PR:

```bash
~/code/scripts/agent/gh-pr-checks-summary.sh --filter sonar --status
```

The script prints a single status word. Map it to action:

| Output       | Meaning                              | Action |
|--------------|--------------------------------------|--------|
| `passed`     | SonarCloud check completed successfully | Proceed normally |
| `failed`     | SonarCloud check completed with failure | Proceed, but note: "SonarCloud analysis completed with failures — results may be incomplete" |
| `running`    | SonarCloud check still running        | Warn: "SonarCloud analysis is still running — results may not reflect the latest push" |
| `not_found`  | No sonar check exists on the PR       | Warn: "No SonarCloud check found on this PR — analysis may not have run yet" |
| `unknown`    | Could not determine state             | Treat the same as `not_found` |

Do not block on CI status. Always proceed to fetch whatever issues exist, but
include the warning in the output so the user knows the data freshness.

## Core workflow

### Step 1: Fetch issues

```bash
sonar list issues -p <project-key> --pull-request <pr-number> --format json
```

### Step 2: Filter issues

From the JSON response, filter to only issues where:
- `issueStatus` is `OPEN` or `CONFIRMED`

Discard issues with `issueStatus` of `FIXED`, `ACCEPTED`, or any other status.

### Step 3: Apply severity floor (if specified)

The severity hierarchy from highest to lowest:

1. `BLOCKER`
2. `CRITICAL`
3. `MAJOR`
4. `MINOR`
5. `INFO`

If `--severity <level>` was specified, keep only issues at that level or higher.
For example, `--severity MAJOR` keeps BLOCKER, CRITICAL, and MAJOR issues.

Use the `severity` field from the issue JSON (legacy severity values).

### Step 4: Handle pagination

Check the response's `paging.total` against `paging.pageSize`. If there are
more issues than one page:

```bash
sonar list issues -p <project-key> --pull-request <pr-number> --format json --page 2
```

Continue until all pages are collected. Merge all issues into a single list
before filtering and formatting.

## Output format

### Standalone mode (called directly via /sonar or skill trigger)

If the user specified `--format toon`, re-fetch with that format and display
the raw CLI output.

Otherwise, produce a structured markdown report:

```markdown
# SonarCloud Issues: <repo-name> PR #<pr-number>

**Project:** <project-key>
**PR:** #<pr-number>
**Total open issues:** <count after filtering>
**CI Status:** <status from preflight step 4>

---

## BLOCKER (<count>)

### 1. <file-path>:<line>
**Rule:** <rule> | **Effort:** <effort>
**Message:** <message>
**Tags:** <tags>
[View in SonarCloud](<link>)

---

## CRITICAL (<count>)
...

## MAJOR (<count>)
...

## MINOR (<count>)
...

## INFO (<count>)
...
```

Omit severity sections that have zero issues. If no issues remain after
filtering, report:

```markdown
# SonarCloud Issues: <repo-name> PR #<pr-number>

**Project:** <project-key>
**PR:** #<pr-number>

## All Clear

No open SonarCloud issues found for this PR.
```

The SonarCloud link for each issue is:
`https://sonarcloud.io/project/issues?id=<project-key>&open=<issue-key>&pullRequest=<pr-number>`

### Integration mode (called by ticket-plan or pr-review)

When this skill is invoked by another skill, return structured data — not the
markdown report. The calling skill will specify that it needs integration-mode
output.

Return a structured summary:

```
SonarCloud: <count> open issues on PR #<pr-number> (<CI status note if applicable>)

BLOCKER (<count>):
- <file>:<line> — <message> [rule: <rule>]

CRITICAL (<count>):
- <file>:<line> — <message> [rule: <rule>]

MAJOR (<count>):
- <file>:<line> — <message> [rule: <rule>]

MINOR (<count>):
- <file>:<line> — <message> [rule: <rule>]

INFO (<count>):
- <file>:<line> — <message> [rule: <rule>]
```

Strip the project key prefix from component paths for readability:
- `wpromote_polaris-web:src/features/foo.tsx` -> `src/features/foo.tsx`

## Error handling

| Error | Action |
|-------|--------|
| `sonar` not found | "Install the SonarQube CLI — see preflight instructions above." |
| Auth failure | "Run `sonar auth login -o wpromote --with-token <TOKEN>`." |
| Repo not in lookup table | "This repo doesn't have SonarCloud. Supported: client-portal, kraken, polaris-api, polaris-web." |
| No PR for branch | "No open PR found. Provide a PR number: `/sonar 275`" |
| API error from CLI | Report the error message verbatim. |
| Zero issues after filtering | Report "All Clear" (not an error). |

## Guardrails

- **Read-only.** Never modify, accept, or resolve SonarCloud issues.
- **Don't fabricate.** Only report issues actually returned by the API.
- **Warn about staleness.** Always check CI status and include freshness
  warnings when applicable.
- **Strip noise.** Only show OPEN and CONFIRMED issues. ACCEPTED and FIXED
  issues are intentionally excluded.
- **Respect the floor.** When a severity floor is set, never include issues
  below it.
