---
name: jira-plan
description: >-
  Fetch a Jira ticket, explore relevant codebases, and synthesize an executable
  implementation plan in chat before any file is written. Use this skill when a
  user says "plan this ticket", "plan BIXB-123", "create a plan for this
  ticket", "how should I implement this ticket", "break down this ticket", or
  any request to turn a Jira ticket into an actionable engineering plan.
---

# Jira Plan

Fetch a Jira ticket, explore the relevant codebases, and produce a comprehensive
implementation plan for review before any code or plan file is written.

## Executor ownership

Gandalf orchestrates this workflow. **Legolas** performs codebase exploration and
returns structured summaries. Gandalf synthesizes the plan content in chat,
Saruman reviews it, the user approves it, and **Aragorn** persists the approved
plan via `plan-author` or executes later implementation. This skill itself is
read-only. For non-trivial work, implementation routes through Gandalf's
workflow: plan → Saruman pre-impl review → user approval → Aragorn execution →
post-impl audit.

## When to use this skill

- "Plan BIXB-18835"
- "Create a plan for this ticket"
- "How should I implement BIXB-18835?"
- "Break down this ticket"
- "What's the plan for BIXB-18835?"
- Any request to turn a Jira ticket into an implementation plan

Do **not** use this skill for:
- Just viewing a ticket (use `jira-ticket`)
- Auditing AC quality (use `jira-enhance` ac-audit mode)
- Reviewing code changes (use `pr-review`)
- Writing code (Aragorn executes after the approved workflow)

## Input parsing

| Format | Example | Handling |
|--------|---------|---------|
| Ticket ID | `BIXB-18835` | Use directly |
| URL | `https://wpromote.atlassian.net/browse/BIXB-18835` | Extract ID from path |
| No argument | `/jira-plan` | Detect from branch name |
| With flags | `BIXB-18835 --post` | Parse flags separately |

When no ticket ID or URL is provided, run:

```bash
~/code/scripts/agent/branch-to-ticket.sh
```

Optional flags:

| Flag | Purpose |
|------|---------|
| `--post` | Request posting the approved plan as a Jira comment. Posting still requires Saruman review, user approval, and Aragorn execution. |

## Preflight

1. Verify ticket fetch wrapper:
   ```bash
   ~/code/scripts/agent/jira-fetch-ticket.sh --help
   ```
2. Verify git context:
   ```bash
   git rev-parse --is-inside-work-tree
   ```
3. Identify the current repository as the primary codebase.

## Workflow

### Phase 1: Fetch and parse the ticket

Fetch through the wrapper, not raw `acli`:

```bash
~/code/scripts/agent/jira-fetch-ticket.sh --all <TICKET-ID>
```

Parse:
- Business value / context
- Acceptance criteria, each numbered for traceability
- Implementation details / additional resources
- Figma links
- Comments, linked issues, attachments
- Structured fields: type, priority, components, labels, status, epic/parent

Determine affected codebases using `instruction/wpromote-context.md` when it has
been conditionally loaded under `~/code/wpromote/`. If it is unavailable, infer
from ticket components and AC content and state the uncertainty.

### Phase 2: Explore codebases with Legolas

Dispatch Legolas for each relevant codebase. Independent codebases may be
explored in parallel. Each exploration must return a structured summary, not raw
file contents.

Primary exploration prompt shape:

```markdown
Explore `<repo-path>` for Jira ticket `<TICKET-ID>`.

Acceptance criteria:
<numbered AC>

Implementation details:
<ticket implementation details>

Return a structured summary covering:
1. Relevant existing files and why they matter.
2. Patterns and conventions to follow, including AGENTS.md / .agents/skills/.
3. Feature flag patterns and whether this ticket needs one.
4. Route definitions or navigation patterns, if relevant.
5. Existing tests, framework, naming, and likely test seams.
6. Types, schemas, serializers, models, or contracts involved.
7. Risks, ambiguous areas, and missing information.

Return only the summary with file paths and line numbers where useful.
```

For cross-repo work, dispatch companion explorations for API readiness,
frontend consumers, semantic-layer definitions, or data pipelines as required by
the AC. Do not skip API readiness, testing strategy, feature-flag decisions, or
cross-repo coordination when they are relevant.

### Phase 2.5: Static-analysis context

If SonarCloud context is relevant, invoke the `sonarcloud` skill. The
`sonar-pr-issues.sh` wrapper is authoritative for fetching issues; raw Sonar CLI
details belong in the sonarcloud skill as reference only.

### Phase 3: Synthesize the plan in chat

Gandalf synthesizes the plan content in chat. Do **not** write a plan file yet.
Use this structure:

```markdown
## Plan: <TICKET-ID> — <Summary>

**Type:** <type> | **Priority:** <priority>
**Primary Codebase:** <repo>
**Companion Codebases:** <repos explored, or "none">
**Figma:** <links, or "none">

### 1. Summary and business value
<2-3 sentences>

### 2. Acceptance criteria breakdown
For each AC:
- **AC N:** <criterion text>
  - **Approach:** <implementation approach>
  - **Files:** <specific files>
  - **Verification:** <test/manual verification proving this AC>
  - **Depends on:** <dependencies, if any>

### 3. API readiness / contracts
<Routes, methods, request/response shapes, serializers/views/models, and whether
the backend already supports the frontend needs. State explicit gaps.>

### 4. Types, models, and data shapes
<TypeScript types, schemas, models, migrations, serializer fields, or payloads.>

### 5. Feature flag decisions
<Existing/new feature flags and rationale, or why none is needed.>

### 6. Implementation steps
<Ordered concrete steps with file paths, dependencies, and ownership.>

### 7. Testing strategy
<Unit/component/integration/manual verification, following existing patterns and
the tdd skill for executable changes.>

### 8. Cleanup scope
<Only cleanup in files already touched for the AC, or "No in-scope cleanup identified.">

### 9. Cross-repo coordination
<Repo order, PR sequencing, deploy sequencing, and blockers; or single-repo note.>

### 10. Risks and open questions
<API gaps, ambiguous AC, missing information, dependencies, rollout risks.>
```

### Phase 4: Saruman review

Dispatch Saruman with:
- The chat plan text
- Ticket context and AC
- Legolas exploration summaries
- SonarCloud context, if any
- Open questions and assumptions

Saruman reviews the plan before implementation or persistence. Material plan
changes after review require another Saruman pass.

### Phase 5: User approval

Surface the reviewed plan and Saruman verdict. Wait for explicit user approval
before any mutation: code changes, plan-file persistence, or Jira comments.

### Phase 6: Persist the approved plan

After approval, dispatch Aragorn with the approved plan content and ask it to use
`plan-author` to write the plan. Use `.project-plans/` if it exists; otherwise
write the plan at the repository root. The persisted plan must be a semantic copy
of the approved chat plan. Never commit unless the user explicitly asks.

### Phase 7: Optional Jira post (`--post`)

Without `--post`, do not post to Jira. With `--post`, render a plain-text Jira
comment body from the approved plan, then:

1. Surface the exact comment body for Saruman review.
2. Wait for Saruman approval.
3. Ask the user for explicit approval to post.
4. Dispatch Aragorn to execute:
   ```bash
   acli jira workitem comment create --key <TICKET-ID> --body "<content>"
   ```

## Figma references

When Figma links are found, include them in the plan. Do not fetch or analyze
Figma designs automatically; use the `figma` skill when design extraction is
needed.

## Error handling

| Error | Action |
|-------|--------|
| Wrapper missing | `Error: ~/code/scripts/agent/jira-fetch-ticket.sh missing. Check the public scripts checkout.` |
| Auth failure | Surface wrapper error and tell the user to run `acli auth login`. |
| Ticket not found | `Ticket <ID> not found. Verify the ID and your access.` |
| Companion repo not found | Note the skipped exploration as a plan risk. |
| Legolas returns empty results | Note the gap and flag it as a risk. |
| Branch doesn't match ticket pattern | Ask for the ticket ID. |

## Guardrails

1. **Chat-first planning.** Never write a plan file before Saruman review and
   user approval.
2. **Read-only until approved.** This skill reads codebases and produces plan
   content; Aragorn owns writes.
3. **Stay in scope.** Plan only work required by the ticket's AC.
4. **No shortcuts.** Do not skip testing strategy, API readiness, feature flags,
   cleanup scope, or cross-repo coordination when relevant.
5. **Don't fabricate.** If exploration didn't find something, say so.
6. **Flag API gaps prominently.** Explicitly distinguish existing support from
   missing backend/API work.
7. **Quote sources.** Attribute ticket claims to AC, comments, or implementation
   details.
8. **No auto-posting.** Jira comments require `--post`, Saruman review, user
   approval, and Aragorn execution.
