# Available Scripts

Shell scripts in `~/code/scripts/` (public) and `~/code/wpromote/scripts/` (Wpromote-internal) provide deterministic, tested operations.
Prefer calling these over reimplementing their logic in prompts.

## Layout

- **`~/code/scripts/agent/`** — opencode-coupled tools (data retrieval for skills, helpers for commands).
- **`~/code/scripts/lib/`** — sourced helpers shared by agent/ and shell/ scripts.
- **`~/code/scripts/shell/`** — interactive-shell setup (sourced by `.zshrc`); not directly invoked.
- **`~/code/scripts/personal/`** — personal utilities not used by opencode.
- **`~/code/wpromote/scripts/`** — Wpromote-internal (cluster names, project IDs, etc.).

## Utilities (`agent/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `~/code/scripts/agent/branch-to-ticket.sh` | Extract Jira ticket ID from branch name | `branch-to-ticket.sh [branch]` |
| `~/code/scripts/agent/gh-current-pr.sh` | Get PR number for current branch | `gh-current-pr.sh [--json]` |
| `~/code/scripts/agent/chrome_mcp.sh` | Launch Chrome for DevTools MCP | `chrome_mcp.sh [--url URL]` |

## Data Retrieval (`agent/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `~/code/scripts/agent/gh-pr-comments.sh` | Fetch PR review comments as JSON | `gh-pr-comments.sh [PR_REF]` |
| `~/code/scripts/agent/sonar-pr-issues.sh` | Fetch SonarCloud issues as JSON | `sonar-pr-issues.sh [--severity LEVEL] [PR_NUMBER]` |
| `~/code/scripts/agent/jira-fetch-ticket.sh` | Fetch Jira ticket data as JSON | `jira-fetch-ticket.sh [--all] TICKET-ID` |
| `~/code/scripts/agent/opencode-deps-check.sh` | Check OpenCode config deps (`package.json` + `opencode.json`) for outdated/unpinned versions | `opencode-deps-check.sh [--human\|--json]` |

## Wpromote-internal (`~/code/wpromote/scripts/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `~/code/wpromote/scripts/gke-logs.sh` | Read GKE container logs for a Wpromote service (dev/test) | `gke-logs.sh <repo> <env> [--freshness 1h] [--container NAME] [--filter EXPR]` |

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
