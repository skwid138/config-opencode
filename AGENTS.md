# AGENTS.md — OpenCode Personal Config

## Agent Roster

| Agent | Role | Model | Write Access |
|-------|------|-------|-------------|
| **gandalf** | Primary orchestrator — intent classification, planning, delegation | claude-opus-4.6 (copilot) | no |
| **legolas** | Codebase exploration & call-path discovery | gpt-5.5 (xhigh) | no |
| **radagast** | External docs / OSS research | gpt-5.5 (xhigh) | no |
| **aragorn** | Autonomous end-to-end implementation; sole writer | gpt-5.5 (xhigh) | **yes** |
| **saruman** | Adversarial plan review; mandatory before aragorn dispatch | gpt-5.5 (xhigh) | no |

## Skills (17)

| Skill | Description |
|-------|-------------|
| `bug-hunter` | Read-only scan for null/guard gaps at system boundaries |
| `chrome-devtools` | Browser-driven UI debugging, Lighthouse, network/console inspection |
| `diagnose` | Disciplined read-only diagnosis loop for hard bugs and regressions |
| `figma` | Extract design context from Figma files for implementation |
| `gh-fetch-pr-comments` | Raw PR review comment retrieval (data layer) |
| `github-review-analyzer` | Deep PR review analysis with codebase context, tiered change plan |
| `grill-me` | One-question-at-a-time interrogation to stress-test plans |
| `grill-with-docs` | Grilling + persistence to CONTEXT.md and ADR docs |
| `improve-codebase-architecture` | System-level architecture review and deepening-opportunity scan |
| `jira-enhance` | Audit and improve Jira acceptance criteria quality |
| `jira-ticket` | Fetch and summarize Jira tickets for estimation/implementation |
| `plan-author` | Structure gathered context into a .project-plans/ plan document |
| `pr-review` | Code quality + AC compliance review of branch diff |
| `qa-subtask` | Generate QA subtask descriptions from AC + implementing PR |
| `sonarcloud` | Fetch and analyze SonarCloud issues for a PR |
| `tdd` | Test-driven development: red-green-refactor cycle |
| `ticket-plan` | Multi-codebase implementation planning from Jira tickets |

Skills live in `skill/<name>/SKILL.md`. They inject context only when triggered.

## Coding Conventions

- **TDD by default** for executable code changes (see `instruction/agent-defaults.md`).
- **Honest disagreement** — state objections directly, once, with reasoning. No sycophancy.
- **Long-running command discipline** — explain, show command, estimate cost, ask before running expensive operations.
- Refer to `instruction/agent-defaults.md` for full standing defaults.
- Refer to `instruction/script-usage.md` for available shell scripts and conventions.

## Git Workflow

- Only commit when explicitly asked.
- Never force-push, hard-reset past own commits, or skip hooks without explicit user request.
- Never amend commits that have been pushed to remote.
- Follow the repository's existing commit message style.

## File Boundaries — Do Not Modify

- `~/code/scripts/` — managed separately; read-only from this config's perspective.
- `opencode.json` — only modify when explicitly asked (model bumps, MCP changes).
- Agent frontmatter `permission` blocks — only modify when explicitly asked.
- `.project-plans/` — do not create or modify.
- `docs/` — reference documentation; do not modify without explicit ask.

## Testing

- Tests are required for executable code changes.
- Prefer TDD (red-green-refactor) using the `tdd` skill.
- Tests describe behavior through public interfaces, not implementation details.
- See `instruction/agent-defaults.md` for full testing policy.

## Project Structure

```
~/.config/opencode/
├── opencode.json          # Model, MCPs, plugins, permissions
├── agent/                 # Agent definitions (frontmatter + system prompt)
├── command/               # Slash commands (thin wrappers around skills)
├── skill/                 # Skill library (16 skills)
├── instruction/           # Auto-loaded context for all agents
├── plugins/               # Local TypeScript plugins
├── bin/                   # Launcher wrapper infrastructure
├── mcp/                   # Reference-only MCP snippets
├── docs/                  # Reference documentation (skill authoring, etc.)
└── dcp.jsonc              # Dynamic Context Pruning config
```
