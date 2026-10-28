# OpenCode Config

Personal, self-contained OpenCode configuration. LOTR-themed agents, dynamic context pruning, and a tuned set of skills/commands for Wpromote engineering work.

> **Recent shift:** This config used to layer on top of the `@wpro-eng/opencode-config` team plugin. That dependency has been removed — everything below is now defined locally in `~/.config/opencode/`.

## Directory Layout

OpenCode V2 reads global assets from the standard plural roots under
`~/.config/opencode/`. This directory is the source of truth for global config.

```
~/.config/opencode/
├── opencode.jsonc                # Model, instructions, hidden agents, permissions, npm plugins
├── dcp.jsonc                    # Dynamic Context Pruning config (autonomous mode)
├── package.json                 # npm deps (@opencode-ai/plugin), engines, package manager
├── package-lock.json            # tracked for reproducible installs
├── .nvmrc                       # pins Node version
├── agents/                      # Global agent definitions (LOTR-named)
│   ├── gandalf.md               # Primary orchestrator
│   ├── legolas.md               # Codebase exploration subagent
│   ├── radagast.md              # External docs/OSS research subagent
│   ├── aragorn.md               # Implementation subagent (sole writer)
│   └── saruman.md               # Adversarial reviewer subagent
├── commands/                    # Global slash commands that drive skills
│   ├── jira-ticket.md, jira-plan.md, plan-author.md
│   ├── jira-ac-quality.md, jira-add-imp-plan.md, jira-qa-results.md, jira-qa-subtask.md
│   ├── review.md, review-plan.md, sonar.md, bug-hunt.md
│   └── scripts-doctor.md, update-opencode-deps.md
├── skills/                      # Global skill library (30 tracked skills)
│   ├── bug-hunter/, chrome-devtools/, diagnose/, figma/
│   ├── gh-fetch-pr-comments/, github-review-analyzer/, grill-me/, grill-with-docs/
│   ├── improve-codebase-architecture/, jira-enhance/, jira-qa-results/, jira-ticket/, plan-author/
│   ├── post-impl-audit/, pr-review/, prototype/, jira-qa-subtask/, sonarcloud/, tdd/
│   └── jira-plan/
├── instruction/                 # Auto-loaded into every agent's context
│   ├── repo-context.md, script-usage.md
│   ├── agent-defaults.md
│   ├── wpromote-context.md      # Read only under ~/code/wpromote/, as directed by AGENTS.md
├── bin/                         # Direct-binary link and legacy V1 installer
│   ├── opencode                 # points to the pinned native V2 binary
│   └── install-wrapper.sh       # legacy V1 installer; do not run
├── docs/                        # Reference documentation (skill authoring, etc.)
├── mcp/                         # Reference-only per-server JSON snippets (NOT auto-loaded)
│   ├── chrome-devtools/, context7/, exa/, figma/  # source-of-truth lives in opencode.jsonc
├── plugins/                     # Local TypeScript plugins
│   └── src/                     # Plugin source and colocated tests
│       └── vision-tool.ts       # Large-image / PDF / video vision via Gemini
└── logs/                        # DCP debug logs (gitignored)
```

## Agents

All agents are defined locally under `agents/`. The default OpenCode `build`, `plan`, and `general` agents are explicitly hidden in `opencode.jsonc` so the LOTR roster is the surface area.

| Name | Mode | Model | Role |
|------|------|-------|------|
| **gandalf** | primary | `github-copilot/claude-opus-5.5#medium` | Orchestrator — intent classification, planning, delegation |
| **legolas** | subagent | `github-copilot/gpt-6-luna#medium` | Codebase exploration & call-path discovery |
| **radagast** | subagent | `github-copilot/gpt-6-luna#high` | External docs / OSS research |
| **aragorn** | subagent | `github-copilot/gpt-6-luna#high` | Autonomous end-to-end implementation; the only writer in the roster |
| **saruman** | subagent | `github-copilot/gpt-6-luna#high` | Adversarial reviewer; finds what is wrong with plans and implementations before they cost real time |

**Model choices:** All agents use GitHub Copilot. Gandalf uses Claude Opus 5.5 for orchestration; the other roles use GPT-6 Luna. Per-agent effort is encoded in the `provider/model#variant` frontmatter value.

**Agent frontmatter uses V2 syntax:** `model` includes the reasoning variant as `provider/model#variant`, and `permissions` is an ordered list of action/resource/effect rules. Read-only agents deny edit and restrict shell access; Aragorn is the sole writer. The global posture (in `opencode.jsonc`) is `ask`-by-default with a small denylist for catastrophic operations (`rm -rf /*`, `sudo *`, `git push --force*`).

## Commands

Commands live in `commands/*.md` and are thin wrappers around skills.

### Jira / ticket workflow
Jira-facing commands intentionally use a `jira-` prefix so ticket reads,
planning, Jira comments, and QA subtask generation are visibly separated.

| Command | Skill | What it does |
|---------|-------|-------------|
| `/jira-ticket <ID>` | jira-ticket | Fetch and summarize a ticket (auto-detects from branch if no ID); supports estimation |
| `/jira-plan [--post]` | jira-plan | Chat-first plan: fetch ticket → Legolas explores → Gandalf synthesizes → Saruman reviews → user approves → Aragorn persists/implements |
| `/plan-author [slug]` | plan-author | Persist reviewed and approved gathered context into a plan document |
| `/jira-ac-quality [--post]` | jira-enhance | Preview AC quality audit; `--post` requests gated Jira comment |
| `/jira-add-imp-plan [--post]` | jira-enhance | Preview implementation details from codebase; `--post` requests gated Jira comment |

### PR / code review
| Command | Skill | What it does |
|---------|-------|-------------|
| `/review` | pr-review | Code quality + AC compliance review of current branch diff |
| `/review-plan [--ticket ID]` | gh-fetch-pr-comments + github-review-analyzer | Analyze PR comments, synthesize Critical + Recommended into a Gandalf-reviewed execution plan |
| `/sonar [--severity LEVEL]` | sonarcloud | Fetch SonarCloud issues for the current PR |

### QA
| Command | Skill | What it does |
|---------|-------|-------------|
| `/jira-qa-results` | jira-qa-results | Prepare a Jira ADF comment preview from completed QA evidence; publishing is gated and not the default |
| `/jira-qa-subtask [ticket] [--push]` | jira-qa-subtask | Generate a Jira QA subtask description from ticket AC + PR/code context; previews by default with a local render envelope and gates Jira mutations |
| `/release-deploy-checks [ticket...]` | release-deploy-checks | Draft pasteable per-ticket prod deploy-check blurbs (chat only) from read-only ticket, git, and live tst/prod evidence; lists sprint tickets for selection when no keys are given |

### Defensive analysis
| Command | Skill | What it does |
|---------|-------|-------------|
| `/bug-hunt <scope> [--mode boundary\|trace]` | bug-hunter | Read-only scan for null/guard gaps at system boundaries |

### Config maintenance
| Command | Backed by | What it does |
|---------|-----------|-------------|
| `/scripts-doctor` | `~/code/scripts/agent/scripts-doctor.sh` | Audit local shell-scripts repos against project conventions and report issues |
| `/update-opencode-deps` | `~/code/scripts/agent/opencode-deps-check.sh` | Audit and update OpenCode config dependencies (`package.json`, `opencode.jsonc` plugins, MCP package refs) |

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
| `github-review-analyzer` | "triage PR comments", deep PR review analysis with codebase context and Gandalf action-plan handoff |
| `jira-enhance` | "improve AC", "flesh out ticket", AC-quality audits |
| `jira-ticket` | Any Jira ticket ID or URL for summary/scope/estimate; implementation routes to jira-plan/Aragorn |
| `jira-qa-results` | Report completed QA evidence or prepare a Jira comment preview; does not execute QA |
| `pr-review` | "review my PR", "does my code satisfy the AC" |
| `prototype` | "prototype this", "let me play with it", "try a few designs", sanity-check data models or UI options |
| `sonarcloud` | "what did sonar find", static-analysis triage |
| `tdd` | "write tests first", "TDD this", red-green-refactor flow |
| `jira-plan` | "plan this ticket", chat-first multi-codebase implementation planning |
| `plan-author` | "write a plan", "structure this into a plan", plan document from gathered context |
| `post-impl-audit` | "audit the implementation", "check Aragorn's work", post-Aragorn implementation audit against a plan |
| `diagnose` | "diagnose this", "debug this", disciplined bug/regression investigation loop |
| `grill-me` | "grill me", "stress-test this plan", one-question-at-a-time interrogation |
| `grill-with-docs` | "stress-test against the glossary", grilling + routes CONTEXT.md/ADR writes through Aragorn |
| `improve-codebase-architecture` | "review the architecture", system-level deepening-opportunity scan |
| `jira-qa-subtask` | "write QA steps", "create a QA subtask", generate QA instructions from AC + PR |
| `release-deploy-checks` | "deploy checks", "deploy-check blurbs", "prod verification blurbs" for the release page |

## MCPs

MCP servers are defined inline in `opencode.jsonc` under the top-level `mcp` key; that is the only location OpenCode reads. The `mcp/<name>/mcp.json` files are reference snippets only. All four current MCP entries are disabled in `opencode.jsonc`; this cleanup leaves that state unchanged.

| MCP | Type | Notes |
|-----|------|-------|
| `chrome-devtools` | local (npx) | Connects to Chrome on `127.0.0.1:9222`. Launch with `~/code/scripts/agent/chrome_mcp.sh` |
| `context7` | remote | `mcp.context7.com` — free, no key |
| `exa` | remote | `mcp.exa.ai` — free tier; add `headers["x-api-key"]` for higher limits |
| `figma` | remote | `127.0.0.1:3845` — requires Figma desktop app with Dev Mode + MCP enabled |

Chrome and Figma both require local processes. The `chrome-devtools` skill teaches the launch/check workflow on demand (auto-running `~/code/scripts/agent/chrome_mcp.sh` when needed); the `figma` skill prefers the desktop MCP and falls back to navigating Figma in Chrome.

Verify registration after edits with `opencode mcp list`.

## Plugins

Two plugins are enabled in the current config. Optional Council and Vision entries remain in `opencode.jsonc` as commented-out experiments and are not loaded.

### `@tarquinen/opencode-dcp` (npm)
Dynamic Context Pruning, pinned at 3.2.0 and enabled. Configured via `dcp.jsonc` — see next section for current settings.

### `@skwid138/opencode-command-normalizer` (npm)
Pinned at 0.3.0 and enabled. Normalizes safe shell argv0 home forms before permission evaluation so anchored absolute script rules match `~/` and `$HOME/` command forms without unsafe wildcard suffixes.

### `@skwid138/opencode-council` (npm)
The commented-out config entry retains the multi-model `council_review` experiment. It is currently disabled.

### `plugins/src/vision-tool.ts` (local)
The commented-out config entry retains the Gemini-backed media `vision` tool experiment. It is currently disabled.

## Dynamic Context Pruning (DCP) — Autonomous Configuration

Currently running in **autonomous mode**. Current notable settings in `dcp.jsonc`:

| Setting | Current value | Notes |
|---------|---------------|-------|
| `enabled` | `true` | DCP is active |
| `manualMode.enabled` | `false` | DCP may compress autonomously |
| `manualMode.automaticStrategies` | `true` | Deduplication and error-purge strategies remain available as a safety net |
| `debug` | `false` | Re-enable only when debugging DCP behavior |
| `pruneNotification` | `"minimal"` | Chat notifications stay low-noise |
| `autoUpdate` | `false` | Version pinned in `opencode.jsonc` (currently 3.2.0); upgrade via `/update-opencode-deps` |
| `turnProtection` | `enabled: true, turns: 2` | Most recent turns protected from pruning |
| `compress.showCompression` | `false` | Compression summaries hidden to reduce noise |
| `compress.protectTags` | `true` | Tagged content protected from compression |
| `experimental.allowSubAgents` | `false` | Subagent compression remains off |
| `experimental.customPrompts` | `false` | Custom DCP prompts remain off |

Context limits (absolute token counts — never percentages, since e.g. `80%` of a 1M window would mean 800K):
- `maxContextLimit: 80000` / `minContextLimit: 40000` — global fallback for any model not listed below; strong compression nudges above max, no reminder nudges below min
- `modelMaxLimits` / `modelMinLimits` — exact `providerID/modelID` keys at **200000 / 100000** for `github-copilot/claude-opus-5.5`, `github-copilot/claude-sonnet-5.5`, and `github-copilot/gpt-6.1-sol`. Copilot was verified to exceed 128K through OpenCode on 2026-10-01 (a Gandalf session on claude-opus-5.5 reached 134.8K tokens = 13%). 200K/100K is a conservative operating band chosen over the full 1M window because of context rot (Anthropic context-engineering guidance) and credit cost
- `lmstudio/local/qwen3.8-27b` — **65536 / 49152** (the key is the full `providerID/modelID`, with `lmstudio` as provider). Qwen runs at OpenCode `limit.context` 131072 / `limit.output` 8192, so OpenCode 1.18.35 native compaction triggers around 131072 − 8192 = **122880** usable tokens. DCP's 65536 base max leaves a nominal **57344** tokens of runway before native compaction, less whatever active summaries and new content consume. The other three local models (32768 context) stay on the 80000/40000 global fallback, which is above their window, so native compaction is their effective limit
- How the thresholds behave (DCP 3.2.0): at or above **min**, turn/iteration compression reminders become eligible (it is not a minimum for the compress tool). Above **max**, DCP injects an urgent compress nudge — it never compresses on its own; the session model must act. `summaryBuffer: true` adds tokens held in active DCP summaries to the effective max. These are soft budgets, not guarantees
- DCP compression is separate from OpenCode's native compaction: DCP asks the session model to summarize ranges in place; native compaction rewrites the whole history using `agent.compaction` (`github-copilot/gpt-6-luna`), even for Qwen sessions
- `nudgeFrequency: 5`, `iterationNudgeThreshold: 15`, `nudgeForce: "soft"`
- `protectUserMessages: false` — allows compression of large pasted content

## Instructions (auto-loaded into every agent)

`opencode.jsonc` lists the global, always-on instruction files. The root `AGENTS.md` directs agents to read `instruction/wpromote-context.md` only when working under `~/code/wpromote/`; do not load it elsewhere.

| File | Loaded | What it injects |
|------|--------|-----------------|
| `repo-context.md` | always | "Read the project's `AGENTS.md` and `.agents/skills/` if present" — silently no-ops when absent |
| `script-usage.md` | always | Reference for `~/code/scripts/` utilities — `agent/` (`branch-to-ticket.sh`, `gh-current-pr.sh`, `gh-pr-comments.sh`, `sonar-pr-issues.sh`, `jira-fetch-ticket.sh`) and `lib/` helpers. Mentions that wpromote-internal scripts are documented separately |
| `agent-defaults.md` | always | Standing engineering defaults — TDD posture, planning conversation routing, bug investigation routing, post-implementation audit routing, architecture review routing, long-running command discipline (Stryker, full test suites, broad scans), honest-disagreement posture |
| `wpromote-context.md` | read only under `~/code/wpromote/` | The root `AGENTS.md` is the conditional gate. The file contains Wpromote repo topology, GCP/GKE guidance, and internal scripts; do not open it for work outside that tree |

## Native OpenCode V2

Use the pinned native binary directly: `~/.local/opt/opencode-v2-2.1.4/bin/opencode`. The global configuration and its `agents/`, `commands/`, and `skills/` roots live here, under `~/.config/opencode/`; `opencode.jsonc` is the source of truth for runtime settings, plugin registrations, MCPs, and always-on instructions.

OpenCode V2 watches config and asset files for live reload. If a running session has not picked up a change, use `/reload` in the session or run `opencode reload`. Do not restart the service just to apply config edits.

> **Do not run `bin/install-wrapper.sh`.** It is a legacy V1 bootstrap and can replace `bin/opencode` with an obsolete PATH wrapper. Leave the V1 installer and daemon-wrapper infrastructure untouched.

Web access and Tailscale integration are deferred. This cleanup does not configure remote access or start a server.

## Configuration Choices

**Default model:** `github-copilot/claude-sonnet-5.5` (fallback for hidden build/plan/general). `small_model` and `agent.title` use `github-copilot/gpt-6-luna` (title at variant `low`); `agent.compaction` uses `github-copilot/gpt-6-luna`. No auto-update — run `opencode models` and edit `opencode.jsonc` when a better default ships.

**Hidden built-in agents:** `build`, `plan`, and `general` are hidden via `opencode.jsonc`. The LOTR roster covers their roles (aragorn for build, plan-author skill for planning, Gandalf for general orchestration).

**External directory permissions:** `opencode.jsonc` allowlists `~/.config/opencode/*`, `~/code/dotfiles/*`, `~/code/scripts/*`, and `~/code/wpromote/*` so agents can operate across this config, dotfiles, shared scripts, and team repos without per-call prompts.

**LOTR identity in prompts:** Each agent's system prompt opens with both names ("You are Gandalf, the orchestrator") so the role is unmistakable regardless of how the agent is invoked.

**Skill/agent activation cost:** All assets are enabled at all times; skills only inject context when triggered, and agents only consume tokens when invoked. Keeping the full set on has no idle cost.

## Maintenance

| Task | Command |
|------|---------|
| Bump default model | `opencode models` → edit `opencode.jsonc` |
| Audit & update all config deps | `/update-opencode-deps` (or `~/code/scripts/agent/opencode-deps-check.sh` for read-only check) |
| Add a provider | `opencode auth login` |
| Verify LM Studio local models | `~/code/scripts/personal/local-models.sh verify` (may start the LM Studio server; see below) |
| Tail DCP logs | `tail -f ~/.config/opencode/logs/dcp/*.log` |
| Inspect tasks | `/tasks`, then `/task <id>` |
| Health check | `opencode mcp list` (verify MCPs), `opencode models` (verify model) |

### LM Studio local models

Design rationale lives in [`docs/adr/0002-lm-studio-local-models.md`](docs/adr/0002-lm-studio-local-models.md). That ADR is a historical record; this section describes the maintenance process as it works today.

**Two places own the roster, and they must match exactly:**

- `opencode.jsonc` → `provider.lmstudio.models` is a **static picker list**. OpenCode does not discover LM Studio models; every key listed there (e.g. `local/gpt-oss-120b`) shows up in the model picker whether or not the model is installed or loaded.
- `~/code/scripts/personal/local-models.sh` maps each **alias** → LM Studio **source model key** → stable **`local/...` identifier**. The stable identifiers must equal the `provider.lmstudio.models` keys exactly; `verify` fails on any missing or extra key and on limits that differ from the helper's per-alias default: `131072`/`8192` for `local/qwen3.8-27b`, `32768`/`8192` for the other three.
- The source model key is LM Studio's installed model key (`modelKey` in `lms ls --json`). It is **not** the API identifier — `load` attaches the stable `local/...` identifier via `--identifier`, and that is what OpenCode requests.

**Configured is not the same as available.** A model can be listed in `opencode.jsonc` and in the script mapping while its source model is absent from LM Studio. It still appears in the picker but cannot be loaded or used, and `verify` reports it as a missing installed source model.

**Adding or removing a model is a coordinated two-repo change.** In `~/code/scripts/personal/local-models.sh`, update `all_aliases`, `model_source`, `model_identifier`, `model_context_length` (the alias's default load context, which is also the `limit.context` that `verify` expects), and the alias table in `usage`; update the fixtures and expectations in `tests/local-models.bats` and the roster table in `docs/local-models.md`. In this repo, update `provider.lmstudio.models` in `opencode.jsonc` and any docs that list the roster. Neither side is complete on its own.

**If maintenance is interrupted and validation fails,** recover by finishing or reverting only the intended mapping edits in each repo (`git diff` the specific files involved). Do not reset, stash, or clean the whole worktree — both repos may carry unrelated in-progress changes that must be preserved.

**Runtime commands have side effects.** None of these run automatically when config changes; run them by hand when you are ready:

- `local-models.sh verify` calls `start` first, so it may start the LM Studio server. It never loads a model.
- `local-models.sh load <alias>` loads a model into memory (estimate first; may prompt).
- OpenCode V2 reads the provider roster from `opencode.jsonc` and watches config changes. If a running session has not picked up an edit, use `/reload` or `opencode reload`; do not restart the service just to reload provider config.

**Current state:** `opencode.jsonc` and the script mapping list four models: `gpt-oss-120b` (`local/gpt-oss-120b`), `qwen3.5-122b-a10b` (`local/qwen3.5-122b-a10b`), `qwen3.8-27b` (`local/qwen3.8-27b`, MLX 8-bit), and `qwen3-coder-next` (`local/qwen3-coder-next`, MLX 6-bit). The earlier `ministral-3b`, `qwen3-vl-8b`, and `qwen3-vl-30b` entries have been removed from both repos.

**Context windows:** `local/qwen3.8-27b` is configured at `limit.context` **131072** / `limit.output` **8192**; the other three stay at **32768** / **8192**. `local-models.sh load <alias>` defaults to the same per-alias context that `verify` expects in `opencode.jsonc` (one lookup in the script, `model_context_length`), so a default load matches OpenCode. `--context-length N` overrides only that load and never edits config; a runtime context **lower** than OpenCode's `limit.context` leaves OpenCode budgeting for a window the loaded model does not have. DCP budgets for Qwen are described in the DCP section above (`lmstudio/local/qwen3.8-27b` 65536/49152).

**Reloading Qwen at 131072** (manual; nothing runs automatically): `local-models.sh unload qwen3.8-27b`, then `local-models.sh load qwen3.8-27b` (defaults to 131072; read the estimate and confirm — LM Studio's estimate can show identical memory at every context size with `LOW` confidence, so it does not reflect the KV-cache peak). If OpenCode has not picked up a provider/config edit, use `/reload` or `opencode reload`. Memory and speed at 128K are still to be validated in use.

## Runtime and package versions

The current runtime is pinned to OpenCode V2.1.4 at
`~/.local/opt/opencode-v2-2.1.4/bin/opencode`; invoke that binary directly.
The native runtime does not need the V1 PATH wrapper. Do not run
`bin/install-wrapper.sh`.

The tracked npm manifests pin local plugin-development dependencies. They do
not replace the native binary or define the global configuration roots.

### Pinned vs floating versions

All external packages are pinned to exact versions:
- `package.json` → `@opencode-ai/plugin` (the plugin SDK)
- `opencode.jsonc` → `@tarquinen/opencode-dcp` (DCP plugin)
- `opencode.jsonc` → `chrome-devtools-mcp` (in the MCP `command` array)

Floating `@latest` references were intentionally removed — historical Bun-era issues (e.g. cache-induced stale resolution of `@latest`) and current Arborist install failures are both avoided by pinning. To check for and apply updates use `/update-opencode-deps`.

### Known upstream advisories

`npm audit` currently flags moderate severity vulnerabilities transitively from `@opencode-ai/plugin` (`uuid`, via `effect`). The `audit fix --force` path downgrades the plugin SDK to an older release, which is worse than current. Leave as-is until upstream publishes a patched plugin release.

## Roadmap / Open Threads

Things that are intentionally pending or under iteration:

- **Shell-layer hardening** — bolster `~/code/scripts/` with tests and stronger error handling. Plan tracked locally (gitignored).
- **Radagast model parity** — re-evaluate whether the external-research model split should remain; consolidate if research quality equalizes.
- **Orchestration plugin features** — tmux integration, persistent task storage, provider fallback, and notification buffering were intentionally stripped from the local rewrite. Re-add only if a real need surfaces.
- **Subagent context pruning** — DCP is autonomous on the primary thread, but `experimental.allowSubAgents` remains off until subagent compression behavior is trusted.
- **MCP key rotation** — Exa is currently on the free tier; add an API key via `opencode.jsonc` → `mcp.exa.headers["x-api-key"]` if rate limits start hurting.

## Adding Personal Assets

| Asset | Path | Notes |
|-------|------|-------|
| Skill | `skills/<name>/SKILL.md` | Frontmatter description must be sharp — that's what triggers auto-invocation. See [`docs/skill-authoring.md`](docs/skill-authoring.md) for the authoring rubric |
| Command | `commands/<name>.md` | Frontmatter `description` is shown in the slash menu; body is the prompt |
| Agent | `agents/<name>.md` | Frontmatter: `model: provider/model#variant`, `description`, `mode` (`primary`/`subagent`), and optional ordered `permissions` rules. Keep the reasoning variant in `model`; do not add a separate `variant` field. Don't set `temperature` for models that do not support it. |
| Instruction | `instruction/<name>.md` + entry in `opencode.jsonc` `instructions[]` | Loaded into every agent's context — keep them short and high-signal |
| MCP | `opencode.jsonc` `mcp.<name>` | Add inline under the `mcp` key. `type: "local"` (with `command`) or `"remote"` (with `url`). Optionally drop a reference snippet at `mcp/<name>/mcp.json` for diffability — but the inline entry is what OpenCode actually loads. |
| Plugin | `plugins/<name>.ts` | Import from `@opencode-ai/plugin`; export default a Plugin function |

Per-project overrides go in `<repo>/.opencode/` and "local wins" — project-local assets can supersede global assets of the same name.
