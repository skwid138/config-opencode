# OpenCode Config

Personal, self-contained OpenCode configuration. LOTR-themed agents, custom orchestration runtime, dynamic context pruning, and a tuned set of skills/commands for Wpromote engineering work.

> **Recent shift:** This config used to layer on top of the `@wpro-eng/opencode-config` team plugin. That dependency has been removed — everything below is now defined locally in `~/.config/opencode/`.

## Directory Layout

```
~/.config/opencode/
├── opencode.json                # Model, instructions, hidden agents, permissions, npm plugins
├── dcp.jsonc                    # Dynamic Context Pruning config (currently in trial/manual mode)
├── package.json                 # npm deps (@opencode-ai/plugin)
├── agent/                       # Local agent definitions (LOTR-named)
│   ├── gandalf.md               # Primary orchestrator
│   ├── legolas.md               # Codebase exploration subagent
│   ├── radagast.md              # External docs/OSS research subagent (GPT-5.5)
│   ├── treebeard.md             # Read-only planner/reviewer subagent
│   ├── celebrimbor.md           # Implementation subagent
│   └── elrond.md                # Architecture/tradeoff advisor subagent
├── command/                     # Slash commands that drive skills
│   ├── ticket.md, plan.md, ac-quality.md, impl-plan.md
│   ├── review.md, check-ac.md, review-plan.md, sonar.md
│   └── bug-hunt.md
├── skill/                       # Local skill library (10 skills)
│   ├── bug-hunter/, figma/, gh-fetch-pr-comments/, github-review-analyzer/
│   ├── jira-enhance/, jira-ticket/, pr-review/, sonarcloud/
│   ├── tdd/, ticket-plan/
├── instruction/                 # Auto-loaded into every agent's context
│   ├── repo-context.md, codebase-map.md, orchestration-runtime.md
│   ├── chrome-devtools.md, script-usage.md
├── mcp/                         # MCP server definitions
│   ├── chrome-devtools/, context7/, exa/, figma/
├── plugins/                     # Local TypeScript plugins
│   ├── orchestration.ts         # Task tracking + runtime commands
│   └── vision-tool.ts           # Large-image / PDF / video vision via Gemini
└── logs/                        # DCP debug logs (gitignored)
```

## Agents

All agents are defined locally under `agent/`. The default OpenCode `build` and `plan` agents are explicitly hidden in `opencode.json` so the LOTR roster is the surface area.

| Name | Mode | Model | Role |
|------|------|-------|------|
| **gandalf** | primary | claude-opus-4.7 | Orchestrator — intent classification, planning, delegation |
| **legolas** | subagent | claude-opus-4.7 | Codebase exploration & call-path discovery |
| **radagast** | subagent | **gpt-5.5 (xhigh reasoning)** | External docs / OSS research |
| **treebeard** | subagent | claude-opus-4.7 | Pre-planning, plan review, read-only analysis |
| **celebrimbor** | subagent | claude-opus-4.7 | Autonomous end-to-end implementation |
| **elrond** | subagent | claude-opus-4.7 | Architecture & tradeoff consultation |

**Why Radagast uses a different model:** GPT-5.5 with xhigh reasoning effort has been stronger in practice for web research and synthesizing external docs across many fetched pages. Every other agent stays on Claude Opus 4.7 for code-centric reasoning consistency. This is the only intentional model split — revisit if/when a Claude release closes the research-quality gap.

**Treebeard is locked down:** `permission` denies `write` and `edit`, and bash is `ask` by default with only `git diff`, `git log`, and `grep` whitelisted. He's the safety-rails agent — never runs anything destructive.

## Commands

Commands live in `command/*.md` and are thin wrappers around skills.

### Jira / ticket workflow
| Command | Skill | What it does |
|---------|-------|-------------|
| `/ticket <ID>` | jira-ticket | Fetch and summarize a ticket (auto-detects from branch if no ID) |
| `/plan [--quick] [--post-jira]` | ticket-plan | Full implementation plan: fetch ticket → explore codebases → synthesize plan |
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

### Orchestration runtime (provided by `plugins/orchestration.ts`)
| Command | What it does |
|---------|-------------|
| `/tasks` | List active/recent subagent tasks |
| `/task <id>` | Show one task record |
| `/diagnostics` | Orchestration health check |
| `/continue` | Sustained orchestration loop |
| `/stop` | Halt loop and queued work |

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
| `figma` | Figma URLs, design implementation, design-token extraction |
| `gh-fetch-pr-comments` | Raw PR review comment retrieval (data layer for analyzer) |
| `github-review-analyzer` | "triage PR comments", deep PR review analysis with codebase context |
| `jira-enhance` | "improve AC", "flesh out ticket", AC-quality audits |
| `jira-ticket` | Any Jira ticket ID or URL — adapts to summary/estimate/implement/test intents |
| `pr-review` | "review my PR", "does my code satisfy the AC" |
| `sonarcloud` | "what did sonar find", static-analysis triage |
| `tdd` | "write tests first", "TDD this", red-green-refactor flow |
| `ticket-plan` | "plan this ticket", multi-codebase implementation planning |

## MCPs

| MCP | Type | Notes |
|-----|------|-------|
| `chrome-devtools` | local (npx) | Connects to Chrome on `127.0.0.1:9222`. Launch with `~/code/scripts/chrome_mcp.sh` |
| `context7` | remote | `mcp.context7.com` — free, no key |
| `exa` | remote | `mcp.exa.ai` — free tier; add `headers.x-api-key` for higher limits |
| `figma` | remote | `127.0.0.1:3845` — requires Figma desktop app with Dev Mode + MCP enabled |

Chrome and Figma both require local processes. The `chrome-devtools.md` instruction file teaches every agent the launch/check workflow; the `figma` skill prefers the desktop MCP and falls back to navigating Figma in Chrome.

## Plugins

Three plugins are loaded — two local TypeScript files and one npm package.

### `plugins/orchestration.ts` (local)
Lightweight task tracking and timeout enforcement for subagent work. Provides the `/tasks`, `/task`, `/diagnostics`, `/continue`, `/stop` runtime commands. Configuration is inline in the file:
- `TASK_TIMEOUT_MS = 180_000` (3 minutes per subagent task)
- `MAX_TRACKED_TASKS = 50` (in-memory ring buffer)

This is a stripped-down replacement for the old Wpromote orchestration plugin — intentionally omits tmux integration, persistent storage, provider fallback, and notification buffering. Add back as needed.

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

| File | What it injects |
|------|-----------------|
| `repo-context.md` | "Read the project's `AGENTS.md` and `.agents/skills/` if present" — silently no-ops when absent |
| `codebase-map.md` | Wpromote repo topology: `polaris-web`, `client-portal`, `polaris-api`, `cube`, `kraken`, `polaris-apps`, `wp-sdk`. Frontend → API → Cube/Kraken/BigQuery dependency map and Jira component → repo mapping |
| `orchestration-runtime.md` | `/continue`/`/stop` semantics, delegation discipline, long-running command policy (Stryker, full test suites) |
| `chrome-devtools.md` | When to launch Chrome via `chrome_mcp.sh`, Figma fallback workflow |
| `script-usage.md` | Reference for `~/code/scripts/` utilities (`branch-to-ticket.sh`, `gh-current-pr.sh`, `gh-pr-comments.sh`, `sonar-pr-issues.sh`, `jira-fetch-ticket.sh`, plus the `lib/` helpers) |

## Configuration Choices

**Default model:** `github-copilot/claude-opus-4.7`. No auto-update — run `opencode models` and edit `opencode.json` when a newer Opus ships.

**Hidden built-in agents:** `build` and `plan` are hidden via `opencode.json`. The LOTR roster covers their roles (celebrimbor for build, treebeard for plan).

**External directory permissions:** `opencode.json` allowlists `~/code/wpromote/*` and `~/code/scripts/*` so agents can operate across all team repos and the shared scripts dir without per-call prompts.

**LOTR identity in prompts:** Each agent's system prompt opens with both names ("You are Gandalf, the orchestrator") so the role is unmistakable regardless of how the agent is invoked.

**Skill/agent activation cost:** All assets are enabled at all times; skills only inject context when triggered, and agents only consume tokens when invoked. Keeping the full set on has no idle cost.

## Maintenance

| Task | Command |
|------|---------|
| Bump default model | `opencode models` → edit `opencode.json` |
| Update DCP plugin | `npm update @tarquinen/opencode-dcp` |
| Update OpenCode plugin SDK | `npm update @opencode-ai/plugin` |
| Add a provider | `opencode auth login` |
| Tail DCP logs | `tail -f ~/.config/opencode/logs/dcp/*.log` |
| Inspect tasks | `/tasks`, then `/task <id>` |
| Health check | `/diagnostics` |

## Roadmap / Open Threads

Things that are intentionally pending or under iteration:

- **DCP trial graduation** — see checklist above. Currently running ~1–2 weeks of validation in manual mode before flipping to autonomous.
- **Shell-layer hardening** — bolster `~/code/scripts/` with tests and stronger error handling. Plan tracked locally (gitignored).
- **Radagast model parity** — re-evaluate whether Claude Opus catches up to GPT-5.5 xhigh on web-research quality; consolidate to a single model if so.
- **Orchestration plugin features** — tmux integration, persistent task storage, provider fallback, and notification buffering were intentionally stripped from the local rewrite. Re-add only if a real need surfaces.
- **Subagent context pruning** — `experimental.allowSubAgents` is off until DCP behavior on the primary thread is fully trusted.
- **MCP key rotation** — Exa is currently on the free tier; add an API key via `mcp/exa/mcp.json` `headers.x-api-key` if rate limits start hurting.

## Adding Personal Assets

| Asset | Path | Notes |
|-------|------|-------|
| Skill | `skill/<name>/SKILL.md` | Frontmatter description must be sharp — that's what triggers auto-invocation |
| Command | `command/<name>.md` | Frontmatter `description` is shown in the slash menu; body is the prompt |
| Agent | `agent/<name>.md` | Frontmatter: `model`, `description`, `temperature`, `mode` (`primary`/`subagent`), optional `permission` |
| Instruction | `instruction/<name>.md` + entry in `opencode.json` `instructions[]` | Loaded into every agent's context — keep them short and high-signal |
| MCP | `mcp/<name>/mcp.json` | `type: "local"` (with `command`) or `"remote"` (with `url`) |
| Plugin | `plugins/<name>.ts` | Import from `@opencode-ai/plugin`; export default a Plugin function |

Per-project overrides go in `<repo>/.opencode/` and "local wins" — a local skill/command of the same name supersedes the global one.
