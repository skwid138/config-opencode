# OpenCode Personal Configuration

Personal OpenCode configuration defining the agent roster, skill library, and orchestration workflow for AI-assisted development.

## Language

### Agents

**Agent**:
A named persona with a model, mode, and permission set that fills one role in the orchestration workflow.
_Avoid_: bot, assistant

**Gandalf**:
The primary orchestrator agent — the single entry point for all user intent.

**Legolas**:
The read-only codebase exploration agent.

**Radagast**:
The read-only external research agent.

**Aragorn**:
The sole write-capable agent in the roster.

**Saruman**:
The adversarial reviewer agent — the mandatory gate before and after non-trivial implementation.

### Workflow Concepts

**Skill**:
An on-demand workflow package loaded only when its trigger conditions match.
_Avoid_: template, runbook

**Command**:
A user-facing slash-command that invokes exactly one skill or script.
_Avoid_: alias

**Instruction**:
An always-loaded policy document that applies to all agents unconditionally.

**DCP**:
Dynamic Context Pruning — the autonomous context-compression subsystem.
_Avoid_: compaction

### Process Terms

**Triage**:
The classification of incoming work as trivial or non-trivial, determining whether the full plan cycle applies.

**Post-implementation audit**:
Saruman's mandatory review of Aragorn's changes against the approved plan.
_Avoid_: post-mortem, retrospective

**Render envelope**:
A local preview artifact containing formatted output for review before any remote mutation occurs.

## Relationships

- **Gandalf** delegates to **Legolas**, **Radagast**, **Aragorn**, and **Saruman**.
- **Saruman** gates **Aragorn** — reviews before writes (plan review) and after writes (post-implementation audit).
- A **Command** invokes exactly one **Skill** or script.
- **Gandalf** may dispatch multiple **Agents** while executing a **Skill**.
- **Instructions** are always loaded; **Skills** are loaded on demand.

## Example dialogue

> **Dev:** "I want to implement this Jira ticket."
> **Gandalf:** "I'll load the **jira-plan** skill, dispatch **Legolas** for exploration, and synthesize a plan for **Saruman** to review."
> **Dev:** "Saruman approved. Go ahead."
> **Gandalf:** "Dispatching **Aragorn**. Once done, **Saruman** runs the **post-implementation audit** before I verify."

## Flagged ambiguities

- "config" — in this repo refers to the OpenCode configuration itself (`~/.config/opencode/`), not application configuration in target projects. Use "project config" for the latter.
- "wrapper" — refers to the OpenCode launcher wrapper that enables conditional context injection, not a code wrapper/decorator pattern.

### Council Review

**Council:**
A parallel multi-model adversarial review where 3-4 frontier models independently review the same artifact, then an aggregator synthesizes findings.
_Avoid_: ensemble, swarm

**Councillor:**
One reviewer session in a council — the existing reviewer agent (default: Saruman) prompted with a specific model override.
_Avoid_: reviewer instance, agent clone

**Aggregator**:
The council aggregator — either the bundled `council-plugin-aggregator` (default) or a user-specified agent. Performs lightweight structural synthesis (dedup, agreement counting, grouping) without making judgment calls. Final verdict authority stays with Gandalf.
_Avoid_: council master, synthesizer, arbiter

**Council Fallback:**
When fewer than 2 councillors return valid responses, the council fails and Gandalf falls back to solo Saruman review.
_Avoid_: degraded council

### Permission Philosophy

**Read-allow by default**:
All read-only commands and safe external directories are allowed globally so every agent (including council child sessions) can access them. Council sessions treat `ask` as effectively `deny` due to the upstream permission-prompt bug (opencode#28037), so any command an agent legitimately needs must be explicitly allowed.

**Deny rules serve three purposes**:
1. Block destructive operations (rm, force-push, sudo, sed -i)
2. Guard against hallucinated paths that would hang council sessions
3. Prevent council/plugin-spawned agents from getting stuck on prompts (requires full terminal close to recover — can't even exit the TUI)

**Last-match-wins ordering**:
`"*": "ask"` must be first (lowest priority). Specific allow/deny rules after it override. Agent-level permissions layer on top of global rules additively.
