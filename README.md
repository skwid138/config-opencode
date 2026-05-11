# OpenCode Config

Personal, self-contained OpenCode configuration. LOTR-themed agents, dynamic context pruning, and a tuned set of skills/commands for Wpromote engineering work.

> **Recent shift:** This config used to layer on top of the `@wpro-eng/opencode-config` team plugin. That dependency has been removed — everything below is now defined locally in `~/.config/opencode/`.

## Directory Layout

```
~/.config/opencode/
├── opencode.json                # Model, instructions, hidden agents, permissions, npm plugins
├── dcp.jsonc                    # Dynamic Context Pruning config (currently in trial/manual mode)
├── package.json                 # npm deps (@opencode-ai/plugin) — Node 24+, npm 11.x
├── package-lock.json            # tracked for reproducible installs
├── .nvmrc                       # pins Node version (24)
├── agent/                       # Local agent definitions (LOTR-named)
│   ├── gandalf.md               # Primary orchestrator
│   ├── legolas.md               # Codebase exploration subagent
│   ├── radagast.md              # External docs/OSS research subagent (GPT-5.5)
│   ├── treebeard.md             # Read-only planner/reviewer subagent
│   ├── aragorn.md               # Implementation subagent (sole writer)
│   └── saruman.md               # Adversarial plan reviewer subagent
├── command/                     # Slash commands that drive skills
│   ├── ticket.md, plan.md, ac-quality.md, impl-plan.md
│   ├── review.md, check-ac.md, review-plan.md, sonar.md
│   ├── bug-hunt.md
│   └── update-opencode-deps.md  # check & update opencode config deps
├── skill/                       # Local skill library (17 skills)
│   ├── bug-hunter/, chrome-devtools/, diagnose/, figma/
│   ├── gh-fetch-pr-comments/, github-review-analyzer/, grill-me/, grill-with-docs/
│   ├── improve-codebase-architecture/, jira-enhance/, jira-ticket/, pr-review/
│   ├── qa-subtask/, sonarcloud/, tdd/, ticket-plan/
├── instruction/                 # Auto-loaded into every agent's context
│   ├── repo-context.md, script-usage.md
│   ├── agent-defaults.md
│   ├── wpromote-context.md      # Loaded CONDITIONALLY by bin/opencode wrapper (only when $PWD is under ~/code/wpromote/)
├── bin/                         # Launcher infrastructure
│   ├── opencode -> ~/code/scripts/personal/opencode-wrapper.sh  # symlink, intercepts `opencode` via PATH
│   └── install-wrapper.sh       # idempotent bootstrap for the symlink
├── docs/                        # Reference documentation (skill authoring, etc.)
├── mcp/                         # Reference-only per-server JSON snippets (NOT auto-loaded)
│   ├── chrome-devtools/, context7/, exa/, figma/  # source-of-truth lives in opencode.json
├── plugins/                     # Local TypeScript plugins
│   └── vision-tool.ts           # Large-image / PDF / video vision via Gemini
└── logs/                        # DCP debug logs (gitignored)
```

## Agents

All agents are defined locally under `agent/`. The default OpenCode `build` and `plan` agents are explicitly hidden in `opencode.json` so the LOTR roster is the surface area.

| Name | Mode | Model | Role |
|------|------|-------|------|
| **gandalf** | primary | claude-opus-6 | Orchestrator — intent classification, planning, delegation |
| **legolas** | subagent | **gpt-5.5 (xhigh reasoning)** | Codebase exploration & call-path discovery |
| **radagast** | subagent | **gpt-5.5 (xhigh reasoning)** | External docs / OSS research |
| **treebeard** | subagent | **gpt-5.5 (xhigh reasoning)** | Pre-planning, plan review, read-only analysis |
| **aragorn** | subagent | claude-opus-4.6 | Autonomous end-to-end implementation; the only writer in the roster |
| **saruman** | subagent | claude-opus-4.6 | Adversarial plan review; mandatory before any aragorn dispatch |

**Why the model split:** GPT-5.5 with xhigh reasoning effort (Legolas, Radagast, Treebeard) has been stronger in practice for web research, codebase exploration, and plan review. Gandalf uses Claude Opus 6 for orchestration. Aragorn and Saruman use Claude Opus 4.6 for code-centric implementation and adversarial review. Revisit if/when model capabilities shift.

**All read-only agents are locked down:** every agent except Aragorn has an explicit `permission` block denying `write` and `edit`, with bash restricted to a read-only allowlist. Aragorn is the sole writer. The global posture (in `opencode.json`) is `ask`-by-default with a small denylist for catastrophic operations (`rm -rf /*`, `sudo *`, `git push --force*`).

## Commands

Commands live in `command/*.md` and are thin wrappers around skills.

### Jira / ticket workflow
| Command | Skill | What it does |
|---------|-------|-------------|
| `/ticket <ID>` | jira-ticket | Fetch and summarize a ticket (auto-detects from branch if no ID) |
| `/plan [--quick] [--post-jira]` | ticket-plan | Full implementation plan: fetch ticket → explore codebases → synthesize plan |
| `/plan-author [slug]` | plan-author | Structure gathered context into a .project-plans/ plan document |
| `/ac-quality` | jira-enhance | Audit AC quality, post improvements as Jira comment |
| `/impl-plan` | jira-enhance | Generate implementation details from codebase, post to Jira |

### PR / code review
| Command | Skill | What it does |
|---------|-------|-------------|
| `/review` | pr-review | Code quality + AC compliance review of current branch diff |
| `/check-ac` | pr-review | AC-compliance only |
| `/review-plan [--quick] [--jira ID]` | gh-fetch-pr-comments + github-review-analyzer | Tiered change plan from PR review comments |
| `/sonar [--severity LEVEL]` | sonarcloud | Fetch SonarCloud issues for the current PR |

### Defensive analysis
| Command | Skill | What it does |
|---------|-------|-------------|
| `/bug-hunt <scope> [--mode boundary\|trace]` | bug-hunter | Read-only scan for null/guard gaps at system boundaries |

### Config maintenance
| Command | Backed by | What it does |
|---------|-----------|-------------|
| `/update-opencode-deps` | `~/code/scripts/agent/opencode-deps-check.sh` | Audit and update OpenCode config dependencies (`package.json`, `opencode.json` plugins, MCP package refs) |

### Dynamic Context Pruning (provided by `@tarquinen/opencode-dcp`)
| Command | What it does |
|---------|-------------|
| `/dcp context` | Show current context budget usage |
| `/dcp stats` | Pruning statistics |
| `/dcp compress` | Manually compress conversation ranges |
| `/dcp sweep` | Run automatic strategies (dedup, error purge) on demand |

## Skills

| Skill | Triggers on |
|-------|-------------|
| `bug-hunter` | "hunt for bugs", null-safety audits, defensive coding scans |
| `chrome-devtools` | "open the page", UI debugging, browser-driven inspection, Lighthouse, Figma-in-browser fallback |
| `figma` | Figma URLs, design implementation, design-token extraction |
| `gh-fetch-pr-comments` | Raw PR review comment retrieval (data layer for analyzer) |
| `github-review-analyzer` | "triage PR comments", deep PR review analysis with codebase context |
| `jira-enhance` | "improve AC", "flesh out ticket", AC-quality audits |
| `jira-ticket` | Any Jira ticket ID or URL — adapts to summary/estimate/implement/test intents |
| `pr-review` | "review my PR", "does my code satisfy the AC" |
| `sonarcloud` | "what did sonar find", static-analysis triage |
| `tdd` | "write tests first", "TDD this", red-green-refactor flow |
| `ticket-plan` | "plan this ticket", multi-codebase implementation planning |
| `plan-author` | "write a plan", "structure this into a plan", plan document from gathered context |
| `diagnose` | "diagnose this", "debug this", disciplined bug/regression investigation loop |
| `grill-me` | "grill me", "stress-test this plan", one-question-at-a-time interrogation |
| `grill-with-docs` | "stress-test against the glossary", grilling + CONTEXT.md/ADR persistence |
| `improve-codebase-architecture` | "review the architecture", system-level deepening-opportunity scan |
| `qa-subtask` | "write QA steps", "create a QA subtask", generate QA instructions from AC + PR |

## MCPs

MCP servers are defined inline in `opencode.json` under the top-level `mcp` key — that is the only location OpenCode reads. The `mcp/<name>/mcp.json` files in this repo are **reference snippets only** (kept for diffability and as paste-ready blocks); they are not auto-discovered. Any change must be made in `opencode.json` to take effect.

| MCP | Type | Notes |
|-----|------|-------|
| `chrome-devtools` | local (npx) | Connects to Chrome on `127.0.0.1:9222`. Launch with `~/code/scripts/agent/chrome_mcp.sh` |
| `context7` | remote | `mcp.context7.com` — free, no key |
| `exa` | remote | `mcp.exa.ai` — free tier; add `headers["x-api-key"]` for higher limits |
| `figma` | remote | `127.0.0.1:3845` — requires Figma desktop app with Dev Mode + MCP enabled |

Chrome and Figma both require local processes. The `chrome-devtools` skill teaches the launch/check workflow on demand (auto-running `~/code/scripts/agent/chrome_mcp.sh` when needed); the `figma` skill prefers the desktop MCP and falls back to navigating Figma in Chrome.

Verify registration after edits with `opencode mcp list`.

## Plugins

Two plugins are loaded — one local TypeScript file and one npm package.

### `plugins/vision-tool.ts` (local)
Exposes a `vision` tool that bypasses Claude's 8000px image limit by routing files to a Gemini agent. Supports JPEG/PNG/GIF/WebP/HEIC/BMP, PDFs, MP4/MOV/AVI/WebM, and WAV/MP3/OGG. Use it instead of `read` for any media file.

### `@tarquinen/opencode-dcp` (npm)
Dynamic Context Pruning. Configured via `dcp.jsonc` — see next section for trial details.

## Dynamic Context Pruning (DCP) — Trial Configuration

Currently running in **trial / manual mode** while behavior is validated. Settings in `dcp.jsonc`:

| Setting | Trial value | Steady-state target |
|---------|-------------|---------------------|
| `manualMode.enabled` | `true` | `false` (let DCP autonomously compress) |
| `manualMode.automaticStrategies` | `true` | `true` (keep dedup + error-purge running) |
| `debug` | `true` (logs to `logs/dcp/`) | `false` |
| `pruneNotification` | `"detailed"` in chat | `"summary"` or off |
| `compress.showCompression` | `true` (audit summaries inline) | `false` |
| `experimental.allowSubAgents` | `false` | revisit after trial |
| `experimental.customPrompts` | `false` | revisit after trial |

Tuned for GitHub Copilot's ~128K effective context (defaults assume 200K+):
- `maxContextLimit: 80000` — strong compression nudges above this
- `minContextLimit: 40000` — no nudges below this
- `nudgeFrequency: 5`, `iterationNudgeThreshold: 15`, `nudgeForce: "soft"`
- `protectUserMessages: false` — allows compression of large pasted content

**Trial graduation checklist (post-validation):**
1. Flip `manualMode.enabled` → `false`.
2. Flip `debug` → `false`.
3. Soften `pruneNotification` (or move to `pruneNotificationType: "log"`).
4. Set `compress.showCompression` → `false`.
5. Revisit `experimental.allowSubAgents` and `experimental.customPrompts`.
6. Consider raising `maxContextLimit` if Copilot effective window grows.

## Instructions (auto-loaded into every agent)

`opencode.json` lists the global, always-on instruction files. `wpromote-context.md` is **not** in that list — it's injected by the launcher wrapper at `bin/opencode` only when `$PWD` is under `~/code/wpromote/` (see "Conditional Wpromote Context" below).

| File | Loaded | What it injects |
|------|--------|-----------------|
| `repo-context.md` | always | "Read the project's `AGENTS.md` and `.agents/skills/` if present" — silently no-ops when absent |
| `script-usage.md` | always | Reference for `~/code/scripts/` utilities — `agent/` (`branch-to-ticket.sh`, `gh-current-pr.sh`, `gh-pr-comments.sh`, `sonar-pr-issues.sh`, `jira-fetch-ticket.sh`) and `lib/` helpers. Mentions that wpromote-internal scripts are documented separately |
| `agent-defaults.md` | always | Standing engineering defaults — TDD posture, planning conversation routing, bug investigation routing, architecture review routing, long-running command discipline (Stryker, full test suites, broad scans), honest-disagreement posture |
| `wpromote-context.md` | conditional (under `~/code/wpromote/`) | Wpromote repo topology incl. local dev URLs (`polaris.local`, `polarisiq.local`, `api.polaris.local`): `polaris-web`, `client-portal`, `polaris-api`, `cube`, `kraken`, `polaris-apps`, `wp-sdk`. Frontend → API → Cube/Kraken/BigQuery dependency map, Jira component → repo mapping, GCP/GKE gotchas, and the `~/code/wpromote/scripts/agent/` script catalog |

## Conditional Wpromote Context (launcher)

OpenCode has no native `if cwd contains X then load Y` mechanism for instruction files — the agent's directive file list is fixed at session start. To load wpromote-specific context **only inside wpromote work**, this config uses a launcher wrapper that intercepts the `opencode` binary via `PATH` and conditionally injects the file via the documented `OPENCODE_CONFIG_CONTENT` env var.

**Components:**

- **`bin/opencode`** — symlink to `~/code/scripts/personal/opencode-wrapper.sh`. The shell scripts repo prepends `$HOME/.config/opencode/bin` to `PATH` (in `shell/env/paths.zsh`), so a bare `opencode` invocation hits the wrapper before the real binary at `/opt/homebrew/bin/opencode`. The wrapper itself is the source of truth (lives in `~/code/scripts/personal/`) so it's audited by `scripts-doctor`, has bats coverage (`tests/opencode-wrapper.bats`), and follows the standard script conventions (`-h`/`--help`, `set -uo pipefail`, sources `lib/common.sh`).
- **`bin/install-wrapper.sh`** — idempotent bootstrap. Creates the `bin/opencode` symlink (or repairs it on drift). Run once per machine; rerun if `scripts-doctor` reports the symlink is missing or drifted.
  - `--check` exits 0 (healthy) / 1 (drift or missing) for CI / health-check use.
  - `--force` overwrites a regular file at the symlink path; refuses to overwrite a directory.
- **`scripts-doctor` integration** — audits that `bin/opencode` is a symlink resolving to `personal/opencode-wrapper.sh` in the scripts repo. Surfaces `missing — run install-wrapper.sh` if the bootstrap hasn't been run.

> Note: `bin/opencode` will appear as **untracked** in `git status` after running `install-wrapper.sh`. This is expected — it's a per-machine symlink (the target is an absolute path on this machine), not a tracked artifact. If it ever shows up as a regular file rather than a symlink, re-run `install-wrapper.sh` to repair.

**Behavior:**

The wrapper inspects `$PWD` and, when it's under `~/code/wpromote/`, sets `OPENCODE_CONFIG_CONTENT` to a JSON document that adds `instruction/wpromote-context.md` to the instruction list, then `exec`s the real `opencode` with the same argv. Outside the wpromote tree, it `exec`s through unmodified — zero overhead, no injection.

Carve-outs:
- **`opencode web` and `opencode attach`** pass through unmodified. `web` freezes config at boot (already-running daemon), and `attach` is a TUI client that doesn't need the conditional context.
- **`--help`** is handled by the wrapper itself (not passed through), to satisfy `scripts-doctor`'s `--help` audit and prevent wrapper-vs-binary recursion edge cases.
- **`--no-conditional`** is a manual escape hatch that bypasses injection regardless of `$PWD`.

Verbose mode: `OPENCODE_WRAPPER_VERBOSE=1` prints a one-line stderr notice when injection happens. Off by default to keep `opencode` invocations quiet.

**Bootstrap on a fresh box:**

```bash
~/.config/opencode/bin/install-wrapper.sh
which opencode    # should resolve to ~/.config/opencode/bin/opencode
~/code/scripts/agent/scripts-doctor.sh | grep wrapper  # should be ✓
```

If `which opencode` resolves to `/opt/homebrew/bin/opencode` instead, `~/.config/opencode/bin` isn't on `PATH` ahead of Homebrew. The shell scripts repo's `shell/env/paths.zsh` handles this via `_path_prepend "$HOME/.config/opencode/bin"`; ensure the env-tier init (`init_env.zsh` from `.zshenv`) is wired up.

## OpenCode daemon and the wrapper quartet

`opencode web` starts a long-lived HTTP daemon that **freezes the entire config tree at boot** — `opencode.json`, all instructions, all agent files, all skill `SKILL.md` files. Edits made after the daemon starts have no effect on attached sessions until the daemon is restarted. This caused a recurring class of bug ("I edited the agent prompt, why is the old behavior still happening?") because nothing surfaced the staleness.

Four wrappers in `~/code/scripts/personal/` cooperate to make this safe:

| Wrapper | Alias | Purpose |
|---------|-------|---------|
| `opensession.sh` | `opensession` | **Daily driver.** Ensures a daemon is running on the port, then attaches. No daemon → background-spawns `openweb`, waits for the listener with identity verification, exec's `openattach`. Fresh daemon → attaches silently. Stale daemon → delegates the prompt to `openattach`. `--restart` calls `openweb --restart`; `--force` passes through to `openattach --force`. |
| `opencode-web.sh` | `openweb` | Starts the daemon. If a daemon is already running on the port, exits with guidance to re-invoke with `--restart` (kill + respawn) or `--force` (kill any holder, including foreign listeners). On start, writes a sidecar file recording the SHA-256 hash of the config tree at boot. |
| `opencode-attach.sh` | `openattach` | TUI client. Before exec'ing into the daemon, compares the current config-tree hash against the sidecar. If they differ ("stale daemon"), warns and prompts on a real TTY; aborts non-interactively with exit 5 and bypass instructions. |
| `opencode-wrapper.sh` | (PATH shim) | The conditional-context wrapper above. Web/attach pass through unmodified. |

**Sidecar file:** `~/.local/share/opencode/daemon-config-hash-<port>-<pid>` — written atomically when `openweb` starts. Records the port, pid, ISO 8601 start time, and SHA-256 over the sorted file list of `~/.config/opencode/` (with symlink targets included via `readlink`). Cleaned up on graceful exit; orphan sidecars are filtered out by a `ps` identity check on the recorded pid (`comm == opencode`, no `pgrep -f` matches against arbitrary command lines).

**Bypass:** `openattach --force` (or `OPENCODE_ATTACH_FORCE=1 openattach`) skips the staleness check. Use when you know the config drift is intentional and irrelevant to the current session (e.g. you edited an unrelated skill).

**Shared helper:** `~/code/scripts/lib/opencode-daemon.sh` is sourced by both `openweb` and `openattach`. It owns the hash function, sidecar I/O, and identity verification — the wrappers stay declarative.

**Coverage:** `tests/opencode-daemon.bats` (43 tests on the helper), `tests/opencode-web.bats` (28 tests, 3-phase lsof stub model for pre-flight detection), `tests/opencode-attach.bats` (29 tests including a real-pty test via BSD `script(1)` for the TTY prompt branch), `tests/opensession.bats` (19 tests covering spawn / fresh / stale / foreign-listener / race / timeout / `--restart` / `--force` / bash-3.2 regression).

## Configuration Choices

**Default model:** `github-copilot/claude-opus-4.6`. No auto-update — run `opencode models` and edit `opencode.json` when a newer Opus ships.

**Hidden built-in agents:** `build` and `plan` are hidden via `opencode.json`. The LOTR roster covers their roles (aragorn for build, treebeard for plan).

**External directory permissions:** `opencode.json` allowlists `~/code/wpromote/*` and `~/code/scripts/*` so agents can operate across all team repos and the shared scripts dir without per-call prompts.

**LOTR identity in prompts:** Each agent's system prompt opens with both names ("You are Gandalf, the orchestrator") so the role is unmistakable regardless of how the agent is invoked.

**Skill/agent activation cost:** All assets are enabled at all times; skills only inject context when triggered, and agents only consume tokens when invoked. Keeping the full set on has no idle cost.

## Maintenance

| Task | Command |
|------|---------|
| Bump default model | `opencode models` → edit `opencode.json` |
| Audit & update all config deps | `/update-opencode-deps` (or `~/code/scripts/agent/opencode-deps-check.sh` for read-only check) |
| Add a provider | `opencode auth login` |
| Tail DCP logs | `tail -f ~/.config/opencode/logs/dcp/*.log` |
| Inspect tasks | `/tasks`, then `/task <id>` |
| Health check | `opencode mcp list` (verify MCPs), `opencode models` (verify model) |

## Setup (fresh machine)

This config uses **npm** (not Bun) and pins all dependency versions for reproducibility. Recent OpenCode versions install plugin/config dependencies via npm/Arborist internally, so npm is the right tool here.

```bash
# 1. Install Node 24 (LTS) via nvm
nvm install --lts          # installs 24
cd ~/.config/opencode
nvm use                    # picks up .nvmrc

# 2. Enable Corepack (one-time, system-level) so the packageManager field takes effect
corepack enable

# 3. Install dependencies
npm install
```

`engines.node` requires Node 24+ and `packageManager` pins npm to `11.12.1`. Corepack will shim the right npm version automatically once enabled.

### Pinned vs floating versions

All external packages are pinned to exact versions:
- `package.json` → `@opencode-ai/plugin` (the plugin SDK)
- `opencode.json` → `@tarquinen/opencode-dcp` (DCP plugin)
- `opencode.json` → `chrome-devtools-mcp` (in the MCP `command` array)

Floating `@latest` references were intentionally removed — historical Bun-era issues (e.g. cache-induced stale resolution of `@latest`) and current Arborist install failures are both avoided by pinning. To check for and apply updates use `/update-opencode-deps`.

### Known upstream advisories

`npm audit` currently flags 3 moderate severity vulnerabilities transitively from `@opencode-ai/plugin` (`uuid` < 14, via `effect`). The `audit fix --force` path downgrades the plugin to a pre-1.4.5 release, which is worse than current. Leave as-is until upstream publishes a patched plugin release.

## Roadmap / Open Threads

Things that are intentionally pending or under iteration:

- **DCP trial graduation** — see checklist above. Currently running ~1–2 weeks of validation in manual mode before flipping to autonomous.
- **Shell-layer hardening** — bolster `~/code/scripts/` with tests and stronger error handling. Plan tracked locally (gitignored).
- **Radagast model parity** — re-evaluate whether Claude Opus catches up to GPT-5.5 xhigh on web-research quality; consolidate to a single model if so.
- **Orchestration plugin features** — tmux integration, persistent task storage, provider fallback, and notification buffering were intentionally stripped from the local rewrite. Re-add only if a real need surfaces.
- **Subagent context pruning** — `experimental.allowSubAgents` is off until DCP behavior on the primary thread is fully trusted.
- **MCP key rotation** — Exa is currently on the free tier; add an API key via `opencode.json` → `mcp.exa.headers["x-api-key"]` if rate limits start hurting.

## Adding Personal Assets

| Asset | Path | Notes |
|-------|------|-------|
| Skill | `skill/<name>/SKILL.md` | Frontmatter description must be sharp — that's what triggers auto-invocation. See [`docs/skill-authoring.md`](docs/skill-authoring.md) for the authoring rubric |
| Command | `command/<name>.md` | Frontmatter `description` is shown in the slash menu; body is the prompt |
| Agent | `agent/<name>.md` | Frontmatter: `model`, `description`, `temperature`, `mode` (`primary`/`subagent`), optional `permission` |
| Instruction | `instruction/<name>.md` + entry in `opencode.json` `instructions[]` | Loaded into every agent's context — keep them short and high-signal |
| MCP | `opencode.json` `mcp.<name>` | Add inline under the `mcp` key. `type: "local"` (with `command`) or `"remote"` (with `url`). Optionally drop a reference snippet at `mcp/<name>/mcp.json` for diffability — but the inline entry is what OpenCode actually loads. |
| Plugin | `plugins/<name>.ts` | Import from `@opencode-ai/plugin`; export default a Plugin function |

Per-project overrides go in `<repo>/.opencode/` and "local wins" — a local skill/command of the same name supersedes the global one.
