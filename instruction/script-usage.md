# Available Scripts

Shell scripts in `~/code/scripts/` (public) and `~/code/wpromote/scripts/` (Wpromote-internal) provide deterministic, tested operations.
Prefer calling these over reimplementing their logic in prompts.

## Layout

- **`~/code/scripts/agent/`** — opencode-coupled tools (data retrieval for skills, helpers for commands).
- **`~/code/scripts/lib/`** — sourced helpers shared by agent/ and shell/ scripts.
- **`~/code/scripts/shell/`** — interactive-shell setup, sourced via the three-barrel init: `init_env.zsh` from `.zshenv`, `init_profile.zsh` from `.zprofile`, `init_rc.zsh` from `.zshrc`. Not directly invoked.
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
| `~/code/wpromote/scripts/agent/gke-logs.sh` | Read GKE container logs for a Wpromote service (dev/test) | `gke-logs.sh <repo> <env> [--freshness 1h] [--container NAME] [--filter EXPR]` |
| `~/code/wpromote/scripts/agent/jira-qa-render.sh` | Render a Jira QA-subtask description (ADF + plain text) from AC/source/steps/notes inputs, using the vendored team template | `jira-qa-render.sh --ac-file PATH --source URL --steps-file PATH [--notes-file PATH] [--no-scope] [--no-input] [--keep-helpers] [--format adf\|text\|both]` |
| `~/code/wpromote/scripts/agent/jira-create-subtask.sh` | Create a Jira subtask via `acli` from a render envelope (or bare ADF doc). Pure mutation — pair with `jira-qa-render.sh` | `jira-create-subtask.sh --parent KEY --summary TEXT --description-file PATH [--type NAME] [--project KEY] [--dry-run]` |
| `~/code/wpromote/scripts/agent/jira-find-qa-subtask.sh` | List QA child subtasks of a parent story; flags each with `is_template:bool` (auto-template default state vs. human-filled) | `jira-find-qa-subtask.sh --parent KEY [--type NAME] [--skip-template-check]` |
| `~/code/wpromote/scripts/agent/jira-update-subtask.sh` | Update an existing QA subtask's description (and optionally summary) via `acli edit --from-json`. Refuses non-template descriptions without `--force` (exit 6). Pair with `jira-qa-render.sh` | `jira-update-subtask.sh --ticket KEY --description-file PATH [--summary TEXT] [--type NAME] [--force] [--dry-run]` |

## Library (`~/code/scripts/lib/`)

| File | Contents |
|------|----------|
| `common.sh` | `die()` (exit 1), `die_usage()` (2), `die_missing_dep()` (3), `die_unauthed()` (4), `die_upstream()` (5); `warn()`, `info()`, `debug()`; `require_cmd()`, `require_auth()`, `json_error()`. See `docs/EXIT-CODES.md` for the full convention. |
| `keychain.sh` | `keychain_get()`, `keychain_set()`, `keychain_exists()` |
| `detect.sh` | `detect_branch()`, `detect_ticket_from_branch()`, `detect_pr_number()`, `detect_owner_repo()`, `detect_repo_name()`, `detect_owner()`, `parse_pr_ref()` |

## Conventions

- All scripts accept `-h`/`--help` for usage.
- All scripts exit non-zero on error with a clear message to stderr (see `~/code/scripts/docs/EXIT-CODES.md` for the categorized convention).
- Data scripts output JSON to stdout.
- Scripts never commit, push, deploy, delete, or mutate remote systems.
- Scripts check their own dependencies and report missing tools clearly.

## Where does a new agent script go?

A script lives in **public `~/code/scripts/agent/`** if its source is publishable as-is — i.e. no Wpromote-specific identifiers (cluster names, project IDs, internal endpoints, repo→resource maps). It lives in **private `~/code/wpromote/scripts/agent/`** if the body itself encodes Wpromote infrastructure inventory. Wrappers are not used. Skills reference both repos by absolute path; visibility doesn't constrain agent-callability.
