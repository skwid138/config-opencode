# OpenCode Config

Personal OpenCode configuration using the Wpromote team plugin with LOTR-themed agents and full orchestration.

## Setup

```
~/.config/opencode/
├── opencode.json                    # Plugin, default model, instruction refs
├── wpromote.json                    # Plugin settings (LOTR names, orchestration)
├── instruction/repo-context.md      # Tells agents to read repo AGENTS.md if present
├── instruction/codebase-map.md      # Wpromote repo topology and dependencies
├── skill/jira-ticket/SKILL.md       # Personal: Jira ticket fetching via acli
├── command/ticket.md                # Personal: /ticket <ID> command
└── node_modules/@wpro-eng/opencode-config/  # Team plugin (npm)
```

## What the plugin provides

9 agents, 13 commands, 8 skills, 3 MCPs, 2 plugins, 3 instructions — all via `@wpro-eng/opencode-config`.

### Agents (LOTR names)

| Name | Role | Use for |
|------|------|---------|
| gandalf | orchestrator | Planning, delegation, coordination |
| legolas | explorer | Codebase search |
| radagast | researcher | External docs, OSS research |
| treebeard | planner | Risk analysis, pre-planning |
| celebrimbor | implementer | Autonomous code execution |
| elrond | architect | Design decisions, architecture review |
| galadriel | analyst | Images, PDFs, visual analysis |
| aragorn | tdd | Test-driven development |
| samwise | deepwork | Long-running intensive work |

### Key commands

| Command | What it does |
|---------|-------------|
| `/continue` | Start autonomous orchestration loop |
| `/stop` | Halt orchestration |
| `/tasks` | List active/recent subagent tasks |
| `/task` | Show details for one task |
| `/diagnostics` | Full orchestration health check |
| `/doctor` | Deep health check with remediation |
| `/ticket` | Fetch Jira ticket summary (personal) |
| `/wpromote-status` | Plugin version, loaded assets |
| `/wpromote-list` | List all installed team assets |

## Configuration choices

**Default model**: `github-copilot/claude-opus-4.6` — set in `opencode.json`. No auto-update; check `opencode models` periodically for newer versions.

**LOTR agent names**: Each agent's system prompt includes both names (e.g., "You are Gandalf, the orchestrator") so the role is always clear.

**All assets enabled**: Skills/agents only activate when invoked — no cost for unused ones.

**Repo-level context**: A custom instruction tells agents to read `AGENTS.md` and `.agents/skills/` from any project root. No repo modifications needed — works silently when files exist, skips when they don't.

**Orchestration**: Full features enabled (delegation, continuous loop, vision, self-healing). 3 concurrent subagents, 2 retries, 25 max iterations. Copilot primary with native fallback.

## Maintenance reminders

- **Update default model**: Run `opencode models` and update `model` in `opencode.json` when a newer Claude Opus is available
- **Update plugin**: `cd ~/.config/opencode && npm update @wpro-eng/opencode-config`
- **MCP notes**: Context7 (free, no key needed) and Exa (free tier, optional API key for higher rate limits via `headers.x-api-key` in MCP config) work out of the box. Chrome DevTools MCP works without a key
- **Add providers**: `opencode providers login` to add Anthropic, OpenAI, or other providers alongside Copilot

## Personal assets

Personal skills, commands, and instructions live alongside team assets ("local wins" — local overrides team if same name):

### Codebase topology instruction

`instruction/codebase-map.md` — Injected into every agent's context. Maps all Wpromote repos under `~/code/wpromote/`, their dependencies (frontends → polaris-api → cube/kraken/BigQuery), and cross-repo change patterns. Used by the Jira skill for component→repo mapping and by all agents for multi-repo coordination.

### Jira ticket skill

`skill/jira-ticket/SKILL.md` — Fetches Jira ticket data via `acli` (Atlassian CLI). Triggers automatically when any agent sees a ticket ID (e.g., `BIXB-18835`). Adapts output based on intent:

| Intent | Trigger phrases | Output |
|--------|----------------|--------|
| Summary | "what's in BIXB-18835", `/ticket BIXB-18835` | Full structured overview |
| Estimation | "estimate BIXB-18835", "scope this" | Scope signals, complexity, effort estimate |
| Implementation | "implement BIXB-18835", "build this" | Requirements checklist, API contracts, codebase targets |
| Testing | "write tests for BIXB-18835" | Test scenarios from acceptance criteria |

**Prerequisite**: `acli` installed and authenticated (`acli auth login`).

### Adding more personal assets

- **Personal skills**: `~/.config/opencode/skill/<name>/SKILL.md`
- **Personal commands**: `~/.config/opencode/command/<name>.md`
- **Personal agents**: Add to `agent` key in `opencode.json`
- **Per-project overrides**: `<repo>/.opencode/wpromote.json` for project-specific plugin settings
