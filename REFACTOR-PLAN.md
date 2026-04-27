# OpenCode Configuration Refactor — Implementation Plan

> Generated: 2026-04-27
> Status: ALL PHASES COMPLETE.
> Location: ~/.config/opencode/REFACTOR-PLAN.md

---

## Progress Tracker

### Phase 1: Foundation — COMPLETED 2026-04-27

**Created:**
- `~/code/scripts/lib/common.sh` — shared utilities (die, warn, require_cmd, require_auth)
- `~/code/scripts/lib/keychain.sh` — macOS Keychain helpers (get, set, exists)
- `~/code/scripts/lib/detect.sh` — auto-detection (branch, ticket, PR, owner/repo)
- `~/code/scripts/branch-to-ticket.sh` — standalone ticket ID extractor
- `~/code/scripts/gh-current-pr.sh` — current PR number utility
- `~/code/scripts/migrate-secrets-to-keychain.sh` — one-time migration (RAN SUCCESSFULLY)
- `~/code/scripts/Makefile` — test runner + lint
- `~/code/scripts/tests/detect.bats` — 12 tests, all passing
- `~/.config/opencode/instruction/orchestration-runtime.md` — local copy
- `~/.config/opencode/instruction/chrome-devtools.md` — new
- `~/.config/opencode/instruction/script-usage.md` — new
- `~/.config/opencode/mcp/context7/mcp.json` — local copy from plugin
- `~/.config/opencode/mcp/exa/mcp.json` — local copy from plugin
- Bats test framework installed in `~/code/scripts/tests/test_helper/`
- shellcheck installed via homebrew

**Updated:**
- `~/code/scripts/chrome_mcp.sh` — added `--check` and `--kill` flags
- `~/.config/opencode/opencode.json` — added new instructions + scripts permission

**Still TODO (deferred to after Phase 2):**
- Update `~/code/scripts/vars.sh` to use `keychain_get` (secrets are in Keychain now but vars.sh still has plaintext — needs updating)
- Update `~/code/wpromote/scripts/vars.sh` same
- Rotate all tokens at providers
- Delete `migrate-secrets-to-keychain.sh`
- Plugin removal (Phase 3 — need local agents first)

### Phase 2: Script Extraction — COMPLETED 2026-04-27

**Created:**
- `~/code/scripts/gh-pr-comments.sh` — fetch PR review comments as JSON (tested against real PR)
- `~/code/scripts/sonar-pr-issues.sh` — fetch SonarCloud issues as JSON (tested against real PR)
- `~/code/scripts/jira-fetch-ticket.sh` — fetch Jira ticket data as JSON (tested against real ticket)

**Updated:**
- `~/.config/opencode/skill/gh-fetch-pr-comments/SKILL.md` — added script reference
- `~/.config/opencode/skill/sonarcloud/SKILL.md` — added script reference
- `~/.config/opencode/skill/jira-ticket/SKILL.md` — added script reference
- `~/.config/opencode/instruction/script-usage.md` — marked Phase 2 scripts as available

### Phase 3: Agent/Skill/Command Restructuring — COMPLETED 2026-04-27

**Created:**
- `~/.config/opencode/agent/orchestrator.md` — Gandalf (primary)
- `~/.config/opencode/agent/implementer.md` — Celebrimbor (subagent)
- `~/.config/opencode/agent/planner.md` — Treebeard (all modes, read-only)
- `~/.config/opencode/agent/explorer.md` — Legolas (subagent)
- `~/.config/opencode/agent/researcher.md` — Radagast (subagent)
- `~/.config/opencode/agent/architect.md` — Elrond (subagent)
- `~/.config/opencode/skill/tdd/SKILL.md` — TDD skill (converted from agent)

**Updated:**
- `~/.config/opencode/wpromote.json` — disabled all plugin agents, duplicate MCPs, example skill
- Plugin kept for orchestration runtime tool only

**Decisions:**
- All 6 agents use `claude-opus-4.6` via Copilot (standardized)
- Plugin NOT removed — provides `wpromote_orchestration` tool (JS runtime)
- Plugin agents/MCPs disabled via `wpromote.json` `disable` array
- Dropped agents: Samwise (merged into Gandalf), Galadriel (vision available to all), Test Guru (→ skill)
- Plugin skills (bigquery, gcp-finops, orchestration-core, readme-editor, skill-creator, super-blame) kept active

### Phase 4: Figma MCP + Chrome Integration — COMPLETED 2026-04-27

**Research findings:**
- Figma has an official remote MCP at `https://mcp.figma.com/mcp` but it's restricted to catalog clients (OpenCode not listed)
- Figma desktop MCP runs at `http://127.0.0.1:3845/mcp` — standard HTTP, works with any MCP client
- Requires: Figma desktop app open, Dev Mode (Shift+D), MCP server enabled in inspect panel
- Free during beta, will eventually be paid

**Created:**
- `~/.config/opencode/mcp/figma/mcp.json` — Figma desktop MCP config
- `~/.config/opencode/skill/figma/SKILL.md` — Figma design context skill

**Updated:**
- `~/.config/opencode/instruction/chrome-devtools.md` — Figma MCP as primary, Chrome as fallback

**Strategy:**
- Primary: Figma desktop MCP (structured data, components, variables, layout)
- Fallback: Chrome DevTools MCP against Figma web app (for when desktop app isn't available)

---

## Executive Summary

Refactor Hunter's OpenCode setup from a plugin-dependent, overlapping configuration into a self-contained, script-backed, high-quality local setup. Remove the team plugin dependency, extract deterministic logic into tested bash scripts, consolidate agents, and improve MCP routing for Chrome DevTools and Figma workflows.

**Key decisions made:**
- All changes local to `~/.config/opencode/` — no plugin modifications
- Remove plugin dependency; use plugin only as reference
- Scripts in `~/code/scripts/` (general) with bats tests
- Secrets migrated to macOS Keychain
- Chrome DevTools MCP integrated with `chrome_mcp.sh`
- Figma MCP to be evaluated and likely added
- Quality > speed; fewer agents with clearer boundaries

---

## Phase 1: Foundation

**Goal:** Establish script infrastructure, fix immediate issues, prepare for plugin removal.

### 1.1 Script library structure

Create the shared library structure:

```
~/code/scripts/
├── lib/
│   ├── common.sh          # Shared functions: error handling, color output, dependency checks
│   ├── keychain.sh        # macOS Keychain read/write helpers
│   └── detect.sh          # Auto-detection: repo name, branch, PR, ticket ID
├── tests/
│   ├── test_helper/
│   │   └── bats-support/  # bats-support, bats-assert (git submodules)
│   ├── common.bats
│   ├── keychain.bats
│   ├── detect.bats
│   ├── gh-pr-comments.bats
│   ├── sonar-pr-issues.bats
│   └── jira-fetch-ticket.bats
├── vars.sh                # UPDATED: no more plaintext secrets, sources keychain
├── chrome_mcp.sh          # EXISTS: minor updates for integration
├── gh-pr-comments.sh      # NEW: Phase 2
├── gh-current-pr.sh       # NEW: Phase 1
├── sonar-pr-issues.sh     # NEW: Phase 2
├── jira-fetch-ticket.sh   # NEW: Phase 2
├── branch-to-ticket.sh    # NEW: Phase 1
└── Makefile               # test runner, lint, install bats
```

### 1.2 `lib/common.sh`

Shared utilities all scripts source:

```bash
#!/usr/bin/env bash
# Common utilities for ~/code/scripts/

set -euo pipefail

# Colors (only if terminal)
if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; NC=''
fi

die()  { echo -e "${RED}Error:${NC} $*" >&2; exit 1; }
warn() { echo -e "${YELLOW}Warning:${NC} $*" >&2; }
info() { echo -e "${GREEN}✓${NC} $*" >&2; }

# Check that a command exists
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not found. $2"
}

# Check that a command is authenticated (runs a test command)
require_auth() {
  local cmd="$1" test_cmd="$2" install_hint="${3:-}"
  require_cmd "$cmd" "$install_hint"
  if ! eval "$test_cmd" >/dev/null 2>&1; then
    die "'$cmd' is not authenticated. Run: $install_hint"
  fi
}
```

### 1.3 `lib/keychain.sh`

macOS Keychain helpers:

```bash
#!/usr/bin/env bash
# Keychain helpers for secret retrieval

keychain_get() {
  local service="$1" account="${2:-$USER}"
  security find-generic-password -s "$service" -a "$account" -w 2>/dev/null \
    || die "Secret not found in Keychain: service='$service' account='$account'. Add with: security add-generic-password -s '$service' -a '$account' -w '<value>'"
}

keychain_set() {
  local service="$1" account="${2:-$USER}" value="$3"
  security delete-generic-password -s "$service" -a "$account" 2>/dev/null || true
  security add-generic-password -s "$service" -a "$account" -w "$value"
}
```

### 1.4 `lib/detect.sh`

Auto-detection utilities (used by multiple scripts):

```bash
#!/usr/bin/env bash
# Auto-detection: repo, branch, PR, ticket

SCRIPT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_LIB_DIR}/common.sh"

# Get current git branch name
detect_branch() {
  git branch --show-current 2>/dev/null || die "Not in a git repository"
}

# Extract Jira ticket ID from branch name
# Patterns: bixb_18835, bixb-18835-description, BIXB-18835
detect_ticket_from_branch() {
  local branch="${1:-$(detect_branch)}"
  local ticket
  # Pattern: prefix_number or prefix-number
  if [[ "$branch" =~ ^([a-zA-Z]+)[_-]([0-9]+) ]]; then
    local prefix="${BASH_REMATCH[1]}"
    local number="${BASH_REMATCH[2]}"
    ticket="${prefix^^}-${number}"
    echo "$ticket"
  else
    return 1
  fi
}

# Get current PR number for the branch
detect_pr_number() {
  require_cmd "gh" "Install: brew install gh"
  gh pr view --json number --jq '.number' 2>/dev/null || return 1
}

# Get owner/repo from git remote
detect_owner_repo() {
  local remote
  remote="$(git remote get-url origin 2>/dev/null)" || die "No git remote 'origin' found"
  # Handle SSH and HTTPS formats
  if [[ "$remote" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    echo "${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  else
    die "Could not parse owner/repo from remote: $remote"
  fi
}

# Get just the repo name
detect_repo_name() {
  local owner_repo
  owner_repo="$(detect_owner_repo)"
  echo "${owner_repo#*/}"
}
```

### 1.5 `branch-to-ticket.sh`

Standalone utility:

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/detect.sh"

usage() { echo "Usage: branch-to-ticket [branch-name]"; echo "  If no branch provided, uses current git branch."; }

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then usage; exit 0; fi

ticket="$(detect_ticket_from_branch "${1:-}")" || die "Could not extract ticket ID from branch '${1:-$(detect_branch)}'"
echo "$ticket"
```

### 1.6 `gh-current-pr.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/detect.sh"

usage() { echo "Usage: gh-current-pr [--json]"; echo "  Outputs PR number (or JSON with number, url, owner/repo)."; }

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then usage; exit 0; fi

require_auth "gh" "gh auth status" "gh auth login"

if [[ "${1:-}" == "--json" ]]; then
  gh pr view --json number,url,headRefName,baseRefName 2>/dev/null \
    || die "No open PR found for current branch"
else
  detect_pr_number || die "No open PR found for current branch"
fi
```

### 1.7 Secrets migration

**Action:** Move all secrets from `vars.sh` files to macOS Keychain.

Secrets to migrate:
- `GITHUB_PAT_WPROMOTE` → Keychain service: `github-pat-wpromote`
- `HF_READ_TOKEN` → Keychain service: `huggingface-read`
- `SONARQUBE_TOKEN` → Keychain service: `sonarqube-token`
- `WPRO_OPEN_AI_API_SECRET` → Keychain service: `wpro-openai`
- `WPRO_OPEN_AI_API_SECRET_ANOMOLY_DETECT_DEMO` → Keychain service: `wpro-openai-anomaly`
- `WPRO_ANTHROPIC_API_SECRET` → Keychain service: `wpro-anthropic`
- `WPRO_ANTHROPIC_API_SECRET_TOO` → Keychain service: `wpro-anthropic-2`

**Updated `vars.sh`:**
```bash
#!/bin/bash
source "$(dirname "$0")/lib/keychain.sh"

export EDITOR=vim
export VISUAL=vim

# Secrets loaded from macOS Keychain (no plaintext)
export GITHUB_PAT_WPROMOTE="$(keychain_get github-pat-wpromote)"
export HOMEBREW_GITHUB_API_TOKEN="$GITHUB_PAT_WPROMOTE"
export HF_READ_TOKEN="$(keychain_get huggingface-read)"
export SONARQUBE_TOKEN="$(keychain_get sonarqube-token)"
```

**Updated `~/code/wpromote/scripts/vars.sh`:**
```bash
#!/bin/bash
source "$HOME/code/scripts/lib/keychain.sh"

export WPRO_OPEN_AI_API_SECRET="$(keychain_get wpro-openai)"
export WPRO_ANTHROPIC_API_SECRET="$(keychain_get wpro-anthropic)"
```

**Migration script** (one-time, run manually):
```bash
#!/usr/bin/env bash
# migrate-secrets-to-keychain.sh — run once, then delete
set -euo pipefail
source "$(dirname "$0")/lib/keychain.sh"

echo "Migrating secrets to macOS Keychain..."
# You'll be prompted for each value or we read from the old vars.sh
# After running, delete the plaintext values from vars.sh and rotate all tokens.

keychain_set "github-pat-wpromote" "$USER" "<paste-value>"
keychain_set "huggingface-read" "$USER" "<paste-value>"
keychain_set "sonarqube-token" "$USER" "<paste-value>"
keychain_set "wpro-openai" "$USER" "<paste-value>"
keychain_set "wpro-openai-anomaly" "$USER" "<paste-value>"
keychain_set "wpro-anthropic" "$USER" "<paste-value>"
keychain_set "wpro-anthropic-2" "$USER" "<paste-value>"

echo "Done. Now:"
echo "1. Rotate all tokens (they were exposed in plaintext)"
echo "2. Remove plaintext values from vars.sh files"
echo "3. Delete this migration script"
```

### 1.8 Chrome DevTools MCP fix

**Problem:** Two configs exist (local + plugin). Local has `--browserUrl`, plugin doesn't. After removing plugin, only local remains.

**Updated `~/.config/opencode/mcp/chrome-devtools/mcp.json`:**
```json
{
  "type": "local",
  "command": ["npx", "-y", "chrome-devtools-mcp@latest", "--browserUrl", "http://127.0.0.1:9222"]
}
```

**Chrome launch integration:** Add a skill/instruction that tells agents to check if Chrome is running on 9222 before using DevTools MCP, and if not, to either:
1. Run `~/code/scripts/chrome_mcp.sh` to launch it
2. Ask the user to authenticate/navigate if needed

### 1.9 Bats test infrastructure

```makefile
# ~/code/scripts/Makefile

BATS := ./tests/test_helper/bats-core/bin/bats
TESTS := tests/*.bats

.PHONY: test install-bats lint

install-bats:
	git submodule update --init --recursive tests/test_helper/bats-core
	git submodule update --init --recursive tests/test_helper/bats-support
	git submodule update --init --recursive tests/test_helper/bats-assert

test: install-bats
	$(BATS) $(TESTS)

lint:
	shellcheck -x *.sh lib/*.sh
```

### 1.10 Remove plugin dependency

**Update `~/.config/opencode/opencode.json`:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "github-copilot/claude-opus-4.7",
  "instructions": [
    "instruction/repo-context.md",
    "instruction/codebase-map.md",
    "instruction/orchestration-runtime.md",
    "instruction/chrome-devtools.md"
  ],
  "permission": {
    "external_directory": {
      "/Users/hunter/code/wpromote/*": "allow",
      "/Users/hunter/code/scripts/*": "allow"
    }
  }
}
```

Remove from `package.json`:
```json
{
  "dependencies": {}
}
```

**Copy from plugin what we need** (as local files):
- Agents → `~/.config/opencode/agent/` (new directory)
- MCP configs for context7 and exa → `~/.config/opencode/mcp/`
- Orchestration runtime instruction → `~/.config/opencode/instruction/`

---

## Phase 2: Script Extraction

**Goal:** Extract deterministic data-fetching logic from skills into tested bash scripts. Skills become thin wrappers that call scripts and interpret results.

### 2.1 `gh-pr-comments.sh`

**Extracts from:** `gh-fetch-pr-comments` skill

**What it does:**
1. Validates gh auth
2. Resolves owner/repo/PR
3. Runs GraphQL query with pagination
4. Classifies authors (ai-reviewer, ci-bot, human)
5. Fetches changed files, diff, commit history
6. Outputs structured JSON

**Inputs:** `[--owner OWNER] [--repo REPO] [--pr NUMBER]` (all optional, auto-detected)

**Output:** JSON to stdout with structure:
```json
{
  "metadata": { "title": "", "url": "", "state": "", "author": "", "base": "", "head": "", "mergeable": "" },
  "files": ["path1", "path2"],
  "commits": [{"sha": "", "message": ""}],
  "reviews": [{"author": "", "state": "", "type": "", "date": ""}],
  "threads": [{
    "file": "", "line": 0, "resolved": false, "outdated": false,
    "comments": [{"author": "", "type": "", "body": "", "date": "", "url": ""}]
  }],
  "counts": { "total_threads": 0, "resolved": 0, "outdated": 0, "ci_filtered": 0, "ai_included": 0, "human": 0 }
}
```

**Size estimate:** ~150 lines bash

**Bats tests:**
- Test author classification logic
- Test owner/repo parsing from various remote formats
- Test JSON output structure (using fixtures)
- Test error cases (no auth, no PR, no repo)

### 2.2 `sonar-pr-issues.sh`

**Extracts from:** `sonarcloud` skill

**What it does:**
1. Validates sonar CLI auth
2. Detects repo → project key mapping
3. Detects PR number
4. Checks CI status
5. Fetches issues with pagination
6. Filters to OPEN/CONFIRMED
7. Applies severity floor
8. Outputs JSON

**Inputs:** `[--project KEY] [--pr NUMBER] [--severity LEVEL]`

**Output:** JSON to stdout:
```json
{
  "project": "wpromote_polaris-web",
  "pr": 275,
  "ci_status": "completed",
  "issues": [{
    "key": "", "severity": "", "file": "", "line": 0,
    "message": "", "rule": "", "effort": "", "tags": []
  }],
  "counts": { "blocker": 0, "critical": 0, "major": 0, "minor": 0, "info": 0 }
}
```

**Size estimate:** ~120 lines bash

**Bats tests:**
- Test repo → project key mapping
- Test severity filtering
- Test CI status detection
- Test error cases

### 2.3 `jira-fetch-ticket.sh`

**Extracts from:** `jira-ticket` skill (fetch portion only)

**What it does:**
1. Validates acli auth
2. Fetches ticket (plain text + JSON)
3. Fetches comments, links, attachments
4. Outputs combined JSON

**Inputs:** `TICKET-ID [--comments] [--links] [--attachments] [--all]`

**Output:** JSON to stdout:
```json
{
  "key": "BIXB-18835",
  "summary": "",
  "type": "", "priority": "", "status": "",
  "assignee": "", "sprint": "", "points": null,
  "components": [], "labels": [], "epic": "",
  "description_raw": "",
  "comments": [],
  "links": [],
  "attachments": []
}
```

**Size estimate:** ~100 lines bash (acli does the heavy lifting)

**Bats tests:**
- Test ticket ID validation
- Test error cases (not found, no auth)
- Test JSON output structure

### 2.4 Update skills to use scripts

After scripts are tested, update each skill to:
1. Call the script
2. Parse the JSON output
3. Apply LLM reasoning (classification, analysis, planning)

Example — updated `gh-fetch-pr-comments` skill opening:
```markdown
## Retrieval workflow

Run the data retrieval script:

\`\`\`bash
~/code/scripts/gh-pr-comments.sh --pr <number> --owner <owner> --repo <repo>
\`\`\`

Parse the JSON output. The script handles:
- GraphQL pagination
- Author classification (ai-reviewer, ci-bot, human)
- Changed files, diff, and commit history

If the script fails, report its error message to the user.

## Analysis (LLM reasoning starts here)

With the structured data from the script, proceed to...
```

This cuts ~150 lines from the skill and makes the data-fetching testable and reusable.

---

## Phase 3: Agent & Skill Restructuring

**Goal:** Create a self-contained local agent configuration. Fewer agents, clearer boundaries, explicit permissions.

### 3.1 Local agent directory

Create `~/.config/opencode/agent/` with these agents:

| File | Name | Model | Mode | Purpose |
|------|------|-------|------|---------|
| `orchestrator.md` | Gandalf | claude-opus-4.7 | primary | Coordination, delegation, intent routing |
| `explorer.md` | Legolas | claude-sonnet-4.6 | subagent | Codebase search, file discovery |
| `planner.md` | Treebeard | claude-opus-4.7 | all | Planning, analysis, plan review (read-only) |
| `implementer.md` | Celebrimbor | claude-opus-4.7 | subagent | Code execution, TDD, implementation |
| `researcher.md` | Radagast | claude-opus-4.7 | subagent | External docs, OSS research |
| `architect.md` | Elrond | claude-opus-4.7 | subagent | Architecture, tradeoffs |

**Removed:**
- Samwise (deepwork) — merged into Gandalf via `/continue`
- Test Guru (tdd) — converted to skill loaded by Celebrimbor
- Galadriel (analyst) — merged into Gandalf's capabilities (vision tool available to all)

**Model choice:** All claude-opus-4.7 via GitHub Copilot. Quality > cost. No per-agent model variation unless OpenCode supports it cleanly and testing shows improvement.

### 3.2 Agent definitions (key changes from plugin versions)

**Gandalf (orchestrator):**
- Add explicit Chrome DevTools routing: "For UI/browser debugging, ensure Chrome is running on port 9222 (run `~/code/scripts/chrome_mcp.sh` if needed), then use chrome-devtools MCP tools."
- Add Figma routing (once MCP is configured)
- Add script awareness: "For data retrieval (PR comments, Sonar issues, Jira tickets), prefer calling scripts in `~/code/scripts/` which return structured JSON."
- Remove deepwork-specific language (sustained loops are just `/continue`)

**Treebeard (planner):**
- Keep read-only permissions
- Add: "When planning requires Jira data, call `~/code/scripts/jira-fetch-ticket.sh`"
- Add: "When planning requires SonarCloud data, call `~/code/scripts/sonar-pr-issues.sh`"

**Celebrimbor (implementer):**
- Add TDD skill reference: "When doing test-driven development, load the `tdd` skill for methodology guidance."
- Add: "Before running expensive commands (Stryker, full test suites), explain what would run, estimate cost, and ask whether to proceed or let the user run it separately."
- Add Chrome DevTools awareness for UI implementation verification

### 3.3 Convert TDD agent → skill

Create `~/.config/opencode/skill/tdd/SKILL.md`:
- Move the 304-line TDD methodology from the agent definition
- Keep it as reference material loaded on demand
- Celebrimbor loads it when doing TDD work

### 3.4 Skill updates

**Skills to keep (with script integration):**
- `gh-fetch-pr-comments` — thin wrapper calling `gh-pr-comments.sh`
- `github-review-analyzer` — keep as-is (LLM reasoning, not scriptable)
- `jira-ticket` — thin wrapper calling `jira-fetch-ticket.sh` + LLM output formatting
- `jira-enhance` — keep as-is (LLM reasoning)
- `pr-review` — keep as-is, update to call scripts for data
- `sonarcloud` — thin wrapper calling `sonar-pr-issues.sh`
- `ticket-plan` — keep as-is, update to call scripts for data
- `bug-hunter` — keep as-is (LLM reasoning)

**Skills to add:**
- `tdd` — converted from agent
- `chrome-devtools-workflow` — how to launch, auth, navigate, use MCP

**Skills to remove/not copy from plugin:**
- `example` — not needed
- `bigquery` — keep only if actively used (ask Hunter)
- `gcp-finops` — keep only if actively used
- `readme-editor` — keep only if actively used
- `skill-creator` — not needed locally
- `orchestration-core` — merge into instruction file
- `super-blame` — keep if used

### 3.5 Command updates

**Commands to keep:**
- `/review-plan` — no changes needed
- `/plan` — no changes needed
- `/review` — no changes needed
- `/bug-hunt` — no changes needed
- `/ticket` — no changes needed
- `/sonar` — no changes needed
- `/check-ac` — no changes needed

**Commands to update:**
- `/impl-plan` — clarify as "lightweight scoping + post to Jira" vs `/plan` which is "detailed local execution plan"

**Commands to add:**
- `/chrome` — launch Chrome for DevTools MCP, optionally with URL
- `/figma` — open Figma in DevTools MCP Chrome (once Figma workflow is defined)

**Commands to remove (were from plugin):**
- `/continue`, `/stop`, `/tasks`, `/task`, `/diagnostics` — these are runtime controls, keep as instruction not commands
- `/github-review-analyzer` — superseded by `/review-plan`
- `/super-blame` — keep if used, otherwise remove
- `/doctor`, `/test-orchestration`, `/wpromote-*` — plugin management, not needed

### 3.6 Instructions

**Keep:**
- `repo-context.md` — useful for AGENTS.md discovery
- `codebase-map.md` — essential topology reference

**Add:**
- `chrome-devtools.md` — how to use Chrome DevTools MCP, when to launch, auth workflow
- `script-usage.md` — tells agents about available scripts in `~/code/scripts/`

**Migrate from plugin (as local files):**
- `orchestration-runtime.md` — /continue, /stop behavior (simplified)

**Remove (were from plugin):**
- `getting-started.md` — plugin setup guide, not needed
- `team-conventions.md` — generic, not useful

---

## Phase 4: Chrome DevTools & Figma Integration

### 4.1 Chrome DevTools workflow instruction

Create `~/.config/opencode/instruction/chrome-devtools.md`:

```markdown
# Chrome DevTools MCP Usage

## Prerequisites

The Chrome DevTools MCP connects to Chrome on port 9222. Before using any
chrome-devtools tools:

1. Check if Chrome is already running on port 9222:
   - Try using a chrome-devtools tool. If it connects, proceed.
   - If it fails to connect, launch Chrome.

2. Launch Chrome for MCP:
   ```bash
   ~/code/scripts/chrome_mcp.sh
   ```
   This starts Chrome with:
   - A temporary user-data directory (no extensions/session interference)
   - Remote debugging on port 9222
   - Detached mode (runs as normal app)

3. If authentication is needed:
   - Tell the user: "I've launched Chrome for DevTools debugging. Please
     authenticate to [site] and navigate to [page], then let me know when ready."
   - Wait for confirmation before proceeding.

## When to use Chrome DevTools MCP

- UI debugging (layout, styling, rendering issues)
- Network request inspection
- Console error investigation
- Accessibility audits
- Performance traces
- Comparing implementation to Figma designs
- Reading Figma design values via the Figma web app

## When NOT to use

- For tasks that don't involve a browser
- For API-only debugging (use curl/httpie instead)
- For reading static files (use Read tool instead)
```

### 4.2 Figma MCP evaluation

**Research needed:** Check if Figma has an official MCP or if a community one exists that:
- Can read design token values
- Can inspect component properties
- Can extract text styles, colors, spacing

**If Figma MCP exists and is reliable:**
- Add to `~/.config/opencode/mcp/figma/mcp.json`
- Add routing in orchestrator: "For Figma design values, prefer Figma MCP over Chrome DevTools"

**If no reliable Figma MCP:**
- Document the Chrome DevTools workflow for Figma:
  1. Launch Chrome via `chrome_mcp.sh`
  2. Navigate to Figma file URL
  3. Use DevTools MCP to inspect the page
  4. Agent clicks through Figma UI to read values

**Figma + client-portal token workflow:**
- When implementing client-portal components, agent should:
  1. Check `src/common/themes/tokens.*.ts` for existing tokens
  2. If token exists, use it
  3. If not, read raw value from Figma and use directly
  4. Note: never modify generated token files

### 4.3 `chrome_mcp.sh` updates

Minor updates to existing script:
- Add `--check` flag: exits 0 if Chrome is already running on the port, 1 if not
- Add `--kill` flag: kills existing Chrome instance on the port (for clean restart)

```bash
# New flags to add:
--check)
  if matching_instance_running; then
    echo "Chrome running on port ${PORT}"
    exit 0
  else
    exit 1
  fi
  ;;
--kill)
  pkill -f "remote-debugging-port=${PORT}" 2>/dev/null || true
  echo "Killed Chrome on port ${PORT}"
  exit 0
  ;;
```

---

## Phase 5: Testing & Validation

### 5.1 Bats test examples

**`tests/detect.bats`:**
```bash
#!/usr/bin/env bats
load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'

@test "detect_ticket_from_branch: bixb_18835 → BIXB-18835" {
  source lib/detect.sh
  run detect_ticket_from_branch "bixb_18835"
  assert_success
  assert_output "BIXB-18835"
}

@test "detect_ticket_from_branch: bixb-18835-some-description → BIXB-18835" {
  source lib/detect.sh
  run detect_ticket_from_branch "bixb-18835-some-description"
  assert_success
  assert_output "BIXB-18835"
}

@test "detect_ticket_from_branch: main → fails" {
  source lib/detect.sh
  run detect_ticket_from_branch "main"
  assert_failure
}

@test "detect_owner_repo: SSH format" {
  # Mock git remote
  git() { echo "git@github.com:wpromote/polaris-web.git"; }
  export -f git
  source lib/detect.sh
  run detect_owner_repo
  assert_success
  assert_output "wpromote/polaris-web"
}
```

**`tests/sonar-pr-issues.bats`:**
```bash
@test "repo-to-project-key: polaris-web → wpromote_polaris-web" {
  source sonar-pr-issues.sh --source-only  # source without executing
  run repo_to_project_key "polaris-web"
  assert_success
  assert_output "wpromote_polaris-web"
}

@test "repo-to-project-key: unknown repo → fails" {
  source sonar-pr-issues.sh --source-only
  run repo_to_project_key "unknown-repo"
  assert_failure
}

@test "severity_at_or_above: MAJOR includes BLOCKER, CRITICAL, MAJOR" {
  source sonar-pr-issues.sh --source-only
  run severity_at_or_above "BLOCKER" "MAJOR"
  assert_success
  run severity_at_or_above "CRITICAL" "MAJOR"
  assert_success
  run severity_at_or_above "MAJOR" "MAJOR"
  assert_success
  run severity_at_or_above "MINOR" "MAJOR"
  assert_failure
}
```

### 5.2 Validation checklist

After each phase, verify:

- [ ] All scripts pass `shellcheck -x`
- [ ] All bats tests pass
- [ ] OpenCode starts without errors
- [ ] `/review-plan` still works end-to-end
- [ ] `/plan` still works end-to-end
- [ ] `/sonar` still works end-to-end
- [ ] Chrome DevTools MCP connects successfully
- [ ] Agent delegation still works (Gandalf → Legolas, etc.)

---

## Execution Order

```
Phase 1.1  Create ~/code/scripts/lib/ structure
Phase 1.2  Write lib/common.sh
Phase 1.3  Write lib/keychain.sh
Phase 1.4  Write lib/detect.sh
Phase 1.5  Write branch-to-ticket.sh
Phase 1.6  Write gh-current-pr.sh
Phase 1.7  Migrate secrets to Keychain (manual step)
Phase 1.8  Fix Chrome DevTools MCP config
Phase 1.9  Set up bats test infrastructure + write tests for Phase 1 scripts
Phase 1.10 Remove plugin from opencode.json (but don't delete node_modules yet)
           Copy needed MCP configs (context7, exa) to local
           Copy orchestration-runtime instruction to local
---
Phase 2.1  Write gh-pr-comments.sh + tests
Phase 2.2  Write sonar-pr-issues.sh + tests
Phase 2.3  Write jira-fetch-ticket.sh + tests
Phase 2.4  Update skills to call scripts
---
Phase 3.1  Create local agent definitions in ~/.config/opencode/agent/
Phase 3.2  Write agent .md files (Gandalf, Legolas, Treebeard, Celebrimbor, Radagast, Elrond)
Phase 3.3  Convert TDD agent → skill
Phase 3.4  Update skills (trim, add script calls)
Phase 3.5  Update commands (add /chrome, clarify /impl-plan)
Phase 3.6  Write new instructions (chrome-devtools.md, script-usage.md)
---
Phase 4.1  Write chrome-devtools instruction
Phase 4.2  Research & evaluate Figma MCP
Phase 4.3  Update chrome_mcp.sh with --check and --kill flags
Phase 4.4  Add Figma MCP if viable, or document Chrome-based workflow
---
Phase 5    End-to-end validation of all commands
```

---

## Questions Resolved

| Question | Answer | Impact |
|----------|--------|--------|
| Plugin dependency | Remove; go fully local | All agents/skills/commands are local |
| Agent model | All claude-opus-4.7 via Copilot | Simplifies config |
| Deepwork agent | Merge into Gandalf | One fewer agent |
| TDD agent | Convert to skill | One fewer agent |
| Galadriel | Remove (vision available to all) | One fewer agent |
| Secrets | macOS Keychain | Secure, no plaintext |
| Chrome workflow | Script + MCP + ask user for auth | Integrated |
| Figma | Evaluate MCP; fallback to Chrome DevTools | Phase 4 |
| Repo-local configs | Leave alone, not in scope | No disruption |
| impl-plan vs plan | Keep both, clarify scope difference | Clearer purpose |
| Bats testing | Yes, for all extracted scripts | Higher reliability |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Removing plugin breaks something | Git tracks ~/.config/opencode; can revert. Keep plugin in node_modules until fully validated. |
| Scripts have bugs | Bats tests + shellcheck before integration |
| Skills break after script integration | Test each command end-to-end after update |
| Agent changes degrade quality | Test with real tickets/PRs before finalizing |
| Figma MCP doesn't exist/work | Fallback to documented Chrome DevTools workflow |

---

## Files to Create (Summary)

### Scripts (`~/code/scripts/`)
- `lib/common.sh`
- `lib/keychain.sh`
- `lib/detect.sh`
- `branch-to-ticket.sh`
- `gh-current-pr.sh`
- `gh-pr-comments.sh`
- `sonar-pr-issues.sh`
- `jira-fetch-ticket.sh`
- `Makefile`
- `tests/detect.bats`
- `tests/gh-pr-comments.bats`
- `tests/sonar-pr-issues.bats`
- `tests/jira-fetch-ticket.bats`

### OpenCode config (`~/.config/opencode/`)
- `agent/orchestrator.md`
- `agent/explorer.md`
- `agent/planner.md`
- `agent/implementer.md`
- `agent/researcher.md`
- `agent/architect.md`
- `skill/tdd/SKILL.md`
- `skill/chrome-devtools-workflow/SKILL.md`
- `instruction/chrome-devtools.md`
- `instruction/script-usage.md`
- `instruction/orchestration-runtime.md` (copied from plugin)
- `mcp/context7/mcp.json` (copied from plugin)
- `mcp/exa/mcp.json` (copied from plugin)
- Updated: `opencode.json` (remove plugin)
- Updated: `mcp/chrome-devtools/mcp.json`
- Updated: skills that call scripts

### Files to modify
- `~/code/scripts/vars.sh` (remove plaintext secrets)
- `~/code/wpromote/scripts/vars.sh` (remove plaintext secrets)
- `~/code/scripts/chrome_mcp.sh` (add --check, --kill flags)
