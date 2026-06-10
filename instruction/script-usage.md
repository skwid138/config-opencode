# Available Scripts

Shell scripts in `/Users/hunter/code/scripts/` provide deterministic, tested
operations. Prefer calling these over reimplementing their logic in prompts.
Invoke agent scripts by direct absolute path, without a `bash ` prefix (for
example, `/Users/hunter/code/scripts/agent/gh-current-pr.sh --json`). Exotic
interpreter prefixes still prompt, which is safe. Avoid the `${HOME}` brace
form; `@skwid138/opencode-command-normalizer` intentionally leaves it off by
default to match opencode's own pattern expansion behavior.

When working under `~/code/wpromote/`, additional Wpromote-internal scripts
under `~/code/wpromote/scripts/` are documented in `wpromote-context.md`,
which is loaded conditionally by the OpenCode launcher wrapper.

## Layout

- **`~/code/scripts/agent/`** — opencode-coupled tools (data retrieval for skills, helpers for commands).
- **`~/code/scripts/data/`** — declarative manifests/templates consumed by agent scripts.
- **`~/code/scripts/lib/`** — sourced helpers shared by agent/ and shell/ scripts.
- **`~/code/scripts/shell/`** — interactive-shell setup, sourced via the three-barrel init: `init_env.zsh` from `.zshenv`, `init_profile.zsh` from `.zprofile`, `init_rc.zsh` from `.zshrc`. Not directly invoked.
- **`~/code/scripts/personal/`** — personal utilities not used by opencode.

## Utilities (`agent/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `/Users/hunter/code/scripts/agent/branch-to-ticket.sh` | Extract Jira ticket ID from branch name | `/Users/hunter/code/scripts/agent/branch-to-ticket.sh [branch]` |
| `/Users/hunter/code/scripts/agent/gh-current-pr.sh` | Get PR number for current branch | `/Users/hunter/code/scripts/agent/gh-current-pr.sh [--json]` |
| `/Users/hunter/code/scripts/agent/chrome_mcp.sh` | Launch Chrome for DevTools MCP | `/Users/hunter/code/scripts/agent/chrome_mcp.sh [--url URL]` |

## Data Retrieval (`agent/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `/Users/hunter/code/scripts/agent/gh-pr-comments.sh` | Fetch PR review comments as JSON | `/Users/hunter/code/scripts/agent/gh-pr-comments.sh [PR_REF]` |
| `/Users/hunter/code/scripts/agent/gh-label-sync.sh` | Converge GitHub labels on `skwid138`-owned repos to `/Users/hunter/code/scripts/data/github-labels.yml`; dry-run by default, `--apply` mutates; rejects non-`skwid138` owners; outputs `{version:1,repos:[...]}` JSON. Override manifest with `GH_LABEL_SYNC_MANIFEST`. | `/Users/hunter/code/scripts/agent/gh-label-sync.sh [--apply] skwid138/repo [skwid138/repo2 ...]` |
| `/Users/hunter/code/scripts/agent/sonar-pr-issues.sh` | Fetch SonarCloud issues as JSON | `/Users/hunter/code/scripts/agent/sonar-pr-issues.sh [--severity LEVEL] [PR_NUMBER]` |
| `/Users/hunter/code/scripts/agent/jira-fetch-ticket.sh` | Fetch Jira ticket data as JSON | `/Users/hunter/code/scripts/agent/jira-fetch-ticket.sh [--all] TICKET-ID` |
| `/Users/hunter/code/scripts/agent/opencode-deps-check.sh` | Check OpenCode config deps (`package.json` + `opencode.json`) for outdated/unpinned versions | `/Users/hunter/code/scripts/agent/opencode-deps-check.sh [--human\|--json]` |

## Library (`~/code/scripts/lib/`)

| File | Contents |
|------|----------|
| `common.sh` | `die()` (exit 1), `die_usage()` (2), `die_missing_dep()` (3), `die_unauthed()` (4), `die_upstream()` (5); `warn()`, `info()`, `debug()`; `require_cmd()`, `require_auth()`, `json_error()`. See `/Users/hunter/code/scripts/docs/EXIT-CODES.md` for the full convention. |
| `keychain.sh` | `keychain_get()`, `keychain_set()`, `keychain_exists()` |
| `detect.sh` | `detect_branch()`, `detect_ticket_from_branch()`, `detect_pr_number()`, `detect_owner_repo()`, `detect_repo_name()`, `detect_owner()`, `parse_pr_ref()` |

## Conventions

- All scripts accept `-h`/`--help` for usage.
- All scripts exit non-zero on error with a clear message to stderr (see `/Users/hunter/code/scripts/docs/EXIT-CODES.md` for the categorized convention).
- Data scripts output JSON to stdout.
- Scripts are read-only with respect to remote systems unless you pass an explicit, off-by-default opt-in flag (e.g. `--apply`, `--post-jira`); see `/Users/hunter/code/scripts/docs/CONVENTIONS.md`.
- Scripts check their own dependencies and report missing tools clearly.

## Where does a new agent script go?

A script lives in **public `~/code/scripts/agent/`** if its source is publishable as-is — i.e. no Wpromote-specific identifiers (cluster names, project IDs, internal endpoints, repo→resource maps). It lives in **private `~/code/wpromote/scripts/agent/`** if the body itself encodes Wpromote infrastructure inventory. Wrappers are not used. Skills reference both repos by absolute path; visibility doesn't constrain agent-callability.
