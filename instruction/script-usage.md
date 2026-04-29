# Available Scripts

Shell scripts in `~/code/scripts/` provide deterministic, tested operations.
Prefer calling these over reimplementing their logic in prompts.

## Utilities

| Script | Purpose | Usage |
|--------|---------|-------|
| `branch-to-ticket.sh` | Extract Jira ticket ID from branch name | `branch-to-ticket.sh [branch]` |
| `gh-current-pr.sh` | Get PR number for current branch | `gh-current-pr.sh [--json]` |
| `chrome_mcp.sh` | Launch Chrome for DevTools MCP | `chrome_mcp.sh [--url URL]` |

## Data Retrieval

| Script | Purpose | Usage |
|--------|---------|-------|
| `gh-pr-comments.sh` | Fetch PR review comments as JSON | `gh-pr-comments.sh [PR_REF]` |
| `sonar-pr-issues.sh` | Fetch SonarCloud issues as JSON | `sonar-pr-issues.sh [--severity LEVEL] [PR_NUMBER]` |
| `jira-fetch-ticket.sh` | Fetch Jira ticket data as JSON | `jira-fetch-ticket.sh [--all] TICKET-ID` |
| `gke-logs.sh` | Read GKE container logs for a Wpromote service (dev/test) | `gke-logs.sh <repo> <env> [--freshness 1h] [--container NAME] [--filter EXPR]` |
| `opencode-deps-check.sh` | Check OpenCode config deps (package.json + opencode.json) for outdated/unpinned versions | `opencode-deps-check.sh [--human\|--json]` |

## Library (`~/code/scripts/lib/`)

| File | Contents |
|------|----------|
| `common.sh` | `die()`, `warn()`, `info()`, `require_cmd()`, `require_auth()` |
| `keychain.sh` | `keychain_get()`, `keychain_set()`, `keychain_exists()` |
| `detect.sh` | `detect_branch()`, `detect_ticket_from_branch()`, `detect_pr_number()`, `detect_owner_repo()`, `detect_repo_name()` |

## Conventions

- All scripts accept `-h`/`--help` for usage.
- All scripts exit non-zero on error with a clear message to stderr.
- Data scripts output JSON to stdout.
- Scripts never commit, push, deploy, delete, or mutate remote systems.
- Scripts check their own dependencies and report missing tools clearly.
