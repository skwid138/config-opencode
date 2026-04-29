---
name: ticket-plan
description: >-
  Fetch a Jira ticket, explore relevant codebases, and produce a comprehensive
  implementation plan. Use this skill when a user says "plan this ticket",
  "plan BIXB-123", "create a plan for this ticket", "how should I implement
  this ticket", "break down this ticket", or any request to turn a Jira ticket
  into an actionable engineering plan — even if they don't explicitly say "plan."
  This skill orchestrates exploration across multiple codebases and synthesizes
  findings into a structured plan for engineer review.
---

# Ticket Plan

Fetch a Jira ticket, explore the relevant codebases in depth, and produce a
comprehensive implementation plan for engineer review before any code is written.

> **Core insight:** A good plan requires two things — deep understanding of the
> ticket requirements AND deep understanding of the code that will change. This
> skill separates information gathering (delegated to explorer agents) from
> synthesis (delegated to the planner agent) to keep context clean and plans
> high-quality.

## When to use this skill

- "Plan BIXB-18835"
- "Create a plan for this ticket"
- "How should I implement BIXB-18835?"
- "Break down this ticket"
- "What's the plan for BIXB-18835?"
- Any request to turn a Jira ticket into an implementation plan

Do **not** use this skill for:
- Just viewing a ticket (use `jira-ticket` skill)
- Auditing AC quality (use `jira-enhance` skill, ac-audit mode)
- Reviewing code changes (use `pr-review` skill)
- Implementing the ticket (use this skill first, then hand off to an
  implementation agent)

## Input parsing

| Format | Example | Handling |
|--------|---------|---------|
| Ticket ID | `BIXB-18835` | Use directly |
| URL | `https://wpromote.atlassian.net/browse/BIXB-18835` | Extract ID from path |
| No argument | `/plan` | Detect from branch name |
| With flags | `BIXB-18835 --post-jira` | Parse flags separately |

**Branch to ticket conversion:**
- Branch: `bixb_18835` or `bixb-18835-some-description` -> Ticket: `BIXB-18835`
- Pattern: uppercase project prefix, extract numeric ID

If the branch doesn't match and no ticket ID provided, ask the user.

**Optional flags:**

| Flag | Default | Purpose |
|------|---------|---------|
| `--post-jira` | off | Also post the plan as a Jira comment after displaying in chat |
| `--quick` | off | Lighter plan: skip companion codebase exploration, produce AC + files + risks only |

## Preflight

1. **Verify acli:**
   ```bash
   which acli && acli auth status
   ```
   If unavailable or unauthenticated, stop and instruct: "Install acli and run
   `acli auth login`."

2. **Verify git:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```

3. **Identify the current working directory's repository** to determine which
   codebase is primary.

## Architecture: Gather then Synthesize

This skill uses a three-phase agent pipeline to keep context windows clean and
plan quality high:

1. **Gandalf (orchestrator)** receives the command, fetches the ticket, parses
   it, and dispatches exploration tasks
2. **Legolas (explorer)** agents run in parallel across relevant codebases,
   returning structured summaries — not raw file contents
3. **Treebeard (planner)** receives the condensed exploration results plus
   parsed ticket data and synthesizes the final plan

This separation is critical. Explorer agents handle the "dirty" work of reading
files and tracing code paths in their own context windows. The planner agent
receives only structured summaries, keeping its context clean for high-quality
analytical thinking.

---

## Phase 1: Fetch and Parse the Ticket

### Step 1: Fetch the ticket

```bash
acli jira workitem view <TICKET-ID>
acli jira workitem view <TICKET-ID> --fields '*all' --json
acli jira workitem comment list --key <TICKET-ID>
acli jira workitem link list --key <TICKET-ID>
```

### Step 2: Parse the description into sections

The ticket description typically contains these sections in order:

1. **Business Value / Context** — a text block at the top describing what the
   ticket is for and why it matters. Extract this as-is.

2. **Acceptance Criteria** — usually a table or numbered list of concrete
   requirements. Often includes links to Figma designs. Extract each criterion
   individually and note any Figma links.

3. **Implementation Details / Additional Resources** — technical guidance below
   the AC. May include specific files to modify, API endpoints to use, patterns
   to follow, or even exact changes that would satisfy the ticket. Extract
   this section carefully — it accelerates planning significantly.

If sections aren't clearly labeled, use content patterns to identify them:
- Tables with "criteria" or "requirement" columns -> AC
- URLs containing "figma.com" -> Figma links
- Mentions of file paths, function names, or code patterns -> Implementation details
- Narrative text about user value or business impact -> Business value

### Step 3: Extract structured fields from JSON

| Field | JSON Path | Purpose |
|-------|-----------|---------|
| Type | `fields.issuetype.name` | Story, Bug, Task |
| Priority | `fields.priority.name` | Urgency signal |
| Components | `fields.components[].name` | Maps to codebases |
| Epic | `fields.customfield_10008` | Parent epic context |
| Labels | `fields.labels` | Tags and categories |
| Status | `fields.status.name` | Workflow state |

### Step 4: Determine affected codebases

Use the Jira Component to Repository mapping from the `codebase-map.md`
instruction (already in context). The codebase topology and cross-repo
dependency patterns are defined there — reference them, do not duplicate.

If no Jira component is set, infer from the AC and description content:
- UI, page, component, button, React -> polaris-web
- Endpoint, API, backend, serializer, view -> polaris-api
- Query, metric, dimension -> cube
- Pipeline, ETL -> kraken

Identify:
- **Primary codebase** — the current working directory's repo
- **Companion codebases** — repos that the primary depends on or that depend
  on it (per the codebase topology)

---

## Phase 2: Explore Codebases (Delegate to Legolas)

Dispatch exploration tasks to legolas (explorer) agents. Run explorations for
independent codebases in parallel.

**Critical rule:** Each explorer must return a **structured summary**, not raw
file contents. The summary is what gets passed to the planner. Keep summaries
focused and bounded.

### Primary codebase exploration

Delegate to legolas with this prompt structure:

> Explore the codebase at `<repo-path>` to gather context for implementing
> Jira ticket `<TICKET-ID>`. The acceptance criteria are:
>
> <list each AC>
>
> The implementation details from the ticket mention:
>
> <implementation details section>
>
> Search for and return a structured summary covering:
>
> 1. **Relevant existing files** — files that will likely need modification
>    based on the AC. Include file paths and a 1-sentence description of each
>    file's purpose.
> 2. **Patterns and conventions** — how does the codebase handle similar
>    features? What patterns should the implementation follow? Check sibling
>    files and the project's AGENTS.md / .agents/skills/ for conventions.
> 3. **Feature flags** — search for feature flag patterns in the codebase
>    (e.g., `featureFlag`, `useFeatureFlag`, `isFeatureEnabled`, `LaunchDarkly`,
>    or similar). Note the pattern used and whether this ticket likely needs
>    a feature flag.
> 4. **Route definitions** — if the AC involves new pages or navigation changes,
>    find the router configuration and existing route patterns.
> 5. **Existing tests** — find test files related to the areas that will change.
>    Note the testing framework, patterns, and file naming conventions used.
> 6. **Type definitions** — find relevant TypeScript types, interfaces, or
>    schemas that will need updating or that new code will need to use.
>
> Return ONLY a structured summary with these sections. Do not return raw file
> contents — summarize what you find. Include file paths so the planner can
> reference them.

### Companion codebase exploration (for cross-repo tickets)

For frontend tickets (polaris-web, client-portal), the most important companion
exploration is **polaris-api**. Delegate to legolas:

> Explore `~/code/wpromote/polaris-api` to understand the backend support for
> Jira ticket `<TICKET-ID>`. The frontend acceptance criteria are:
>
> <list each AC>
>
> Search for and return a structured summary covering:
>
> 1. **API endpoints** — find the Django URL configs, views, and serializers
>    that serve the data the frontend will need. Check if endpoints already
>    exist or need to be created/modified.
> 2. **Response shapes** — for each relevant endpoint, describe the serializer
>    fields and response structure. This will be used to build TypeScript types
>    on the frontend.
> 3. **Models** — find the Django models involved. Note field names, types,
>    and relationships that are relevant to the AC.
> 4. **Permissions** — check if the views have permission classes. Note what
>    permissions are required.
> 5. **API readiness assessment** — based on the AC, does the backend appear
>    to already support what the frontend needs? Flag any gaps where:
>    - An endpoint doesn't exist yet
>    - An endpoint exists but doesn't return the needed fields
>    - A model is missing fields the AC requires
>    - Permissions may need updating
>
> Return ONLY a structured summary. Include file paths and specific field
> names so the frontend plan can reference them precisely.

For backend tickets that affect frontend consumers, reverse the direction —
explore the frontend to understand what will break or need updating.

For analytics tickets, explore cube for semantic layer definitions.

### Quick mode

If `--quick` is specified, skip companion codebase exploration entirely. Only
explore the primary codebase, and limit the exploration to relevant files and
existing tests.

---

## Phase 2.5: SonarCloud Issues (Optional)

If the primary codebase is one of the 4 SonarCloud-enabled repositories
(client-portal, kraken, polaris-api, polaris-web), and a PR exists for the
current branch, fetch SonarCloud issues to include in the plan.

### Step 1: Check if applicable

1. Determine the repo name from `git remote get-url origin`.
2. Check if it maps to a SonarCloud project:
   - `client-portal` → `wpromote_client-portal`
   - `kraken` → `wpromote_kraken`
   - `polaris-api` → `wpromote_polaris-api`
   - `polaris-web` → `wpromote_polaris-web`
3. Check if a PR exists:
   ```bash
   ~/code/scripts/agent/gh-current-pr.sh
   ```

If the repo isn't SonarCloud-enabled or no PR exists, skip this phase silently.
Note in the plan metadata: "SonarCloud: skipped (no PR)" or "SonarCloud: N/A
(repo not configured)".

### Step 2: Check CI freshness

```bash
gh pr checks --json name,status,conclusion | cat
```

Look for a check with "sonar" in the name. If it's still running or hasn't run,
note the staleness warning — but still proceed to fetch whatever exists.

### Step 3: Fetch issues

```bash
sonar list issues -p <project-key> --pull-request <pr-number> --format json
```

Filter to issues where `issueStatus` is `OPEN` or `CONFIRMED`. Strip the
project key prefix from component paths for readability.

### Step 4: Format for planner

Structure the results as a section to pass to treebeard:

```
### SonarCloud Findings

<count> open issues on PR #<pr-number>
CI Status: <completed/running/not found>

BLOCKER (<count>):
- <file>:<line> — <message> [rule: <rule>]

CRITICAL (<count>):
- <file>:<line> — <message> [rule: <rule>]

MAJOR (<count>):
- <file>:<line> — <message> [rule: <rule>]

MINOR (<count>):
- <file>:<line> — <message> [rule: <rule>]

INFO (<count>):
- <file>:<line> — <message> [rule: <rule>]
```

If zero issues remain after filtering, pass:
```
### SonarCloud Findings

No open SonarCloud issues on PR #<pr-number>.
```

The planner should incorporate SonarCloud findings into:
- **Risks and Open Questions** — for BLOCKER and CRITICAL issues
- **Implementation Steps** — for MAJOR issues that should be fixed as part of
  the ticket work
- **Cleanup (In-Scope Only)** — for MINOR/INFO issues in files already being
  modified

---

## Phase 3: Synthesize the Plan (Delegate to Treebeard)

Once all exploration summaries are collected, delegate to treebeard (planner)
with the following structured input:

> Create a comprehensive implementation plan for Jira ticket `<TICKET-ID>`.
>
> ## Ticket Context
>
> **Summary:** <ticket summary>
> **Type:** <type> | **Priority:** <priority> | **Status:** <status>
> **Components:** <components>
>
> ### Business Value
> <business value section from ticket>
>
> ### Acceptance Criteria
> <numbered list of each AC>
>
> ### Figma References
> <list of figma links, or "none">
>
> ### Implementation Details from Ticket
> <implementation details section, or "none provided">
>
> ### Comments Summary
> <brief summary of relevant comments, or "no comments">
>
> ## Codebase Exploration Results
>
> ### Primary Codebase: <repo-name>
> <structured summary from legolas>
>
> ### Companion Codebase: <repo-name>
> <structured summary from legolas, or "not explored">
>
> ### SonarCloud Findings
> <structured summary from Phase 2.5, or "not applicable">
>
> ## Plan Requirements
>
> Produce a plan with the sections listed below. Follow these rules:
>
> - **Stay in scope.** Only plan work required by the acceptance criteria.
>   Do not add unrelated improvements, refactors, or tech debt cleanup.
> - **Improve what you touch.** If a file that must be modified for the AC
>   has clear opportunities to improve patterns, test coverage, or code
>   quality, include those improvements. But only for files already in scope.
> - **Be concrete.** Reference specific file paths, function names, type
>   names, and endpoint paths from the exploration results. Do not use
>   vague references like "update the API" — say which view, which
>   serializer, which URL pattern.
> - **Flag API gaps prominently.** If the backend doesn't appear to support
>   what the frontend AC requires, call this out clearly in the Risks
>   section with specific details about what's missing.
> - **Order by dependency.** Implementation steps should be ordered so that
>   each step can be completed given the previous steps are done.

### Plan output sections

The plan MUST include these sections (omit a section only if genuinely not
applicable, and note why):

```
## Plan: <TICKET-ID> — <Summary>

**Type:** <type> | **Priority:** <priority>
**Primary Codebase:** <repo>
**Companion Codebases:** <repos explored, or "none">
**Figma:** <links, or "none">

---

### 1. Summary and Business Value

<2-3 sentences: what this ticket accomplishes and why it matters>

### 2. Acceptance Criteria Breakdown

For each AC:
- **AC N:** <criterion text>
  - **Approach:** <1-3 sentences on how to implement this>
  - **Files:** <specific files to modify or create>
  - **Depends on:** <other ACs or prerequisites, if any>

### 3. API Routes and Contracts

<For frontend tickets: endpoints the frontend will call, HTTP methods,
request/response shapes based on the Django serializers found.
For backend tickets: endpoints being created or modified.
Include the specific view, serializer, and URL config file paths.>

**API Readiness:** <Does the backend already support what the frontend needs?
If not, what specific gaps exist? This is the most important cross-repo
finding — be explicit about what exists vs what's missing.>

### 4. Types and Models

<TypeScript interfaces/types that need creating or updating, based on the
API response shapes. Django models involved and any field changes needed.
Reference the specific serializer fields that map to TS type properties.>

### 5. Feature Flags

<Feature flags involved — existing flags to check, new flags to create.
Note the pattern used in the codebase. If no feature flag is needed,
state why (e.g., "modification to existing behavior, no new surface area").>

### 6. Implementation Steps

<Ordered list of concrete steps. Each step should reference specific files
and describe what changes. Order by dependency — backend before frontend
if both are needed, shared types before consumers, etc.>

1. <Step with specific files and changes>
2. <Step with specific files and changes>
...

### 7. Testing Strategy

<Break down by test type, following the patterns found in the codebase:>

- **Unit tests:** <what to test, which test files to create or modify,
  patterns to follow from existing tests>
- **Component tests:** <if applicable — React component tests>
- **Integration tests:** <if applicable — API integration, cross-component>
- **What existing tests to update:** <tests that may break or need updating
  due to the changes>

### 8. Cleanup (In-Scope Only)

<Improvements to make ONLY in files already being modified for the AC.
Examples: removing dead code in a file you're editing, improving test
coverage for a component you're changing, updating patterns in a file
you're touching. If nothing qualifies, state "No in-scope cleanup
identified.">

### 9. Cross-Repo Coordination

<If multiple repos are involved: which PRs to create, what order to merge
them, any deployment sequencing. If single-repo, state "Single-repo
change — no coordination needed.">

### 10. Risks and Open Questions

<Items that could affect the plan:>
- **API gaps:** <specific backend gaps that need investigation or
  implementation before frontend work can proceed>
- **Ambiguous AC:** <acceptance criteria that are vague or could be
  interpreted multiple ways>
- **Missing information:** <things not in the ticket that an engineer
  would need to know>
- **Dependencies:** <blocked by other tickets, waiting on design, etc.>
```

---

## Phase 4: Output

### Default: Chat only

Display the full plan in the chat using markdown formatting. Do NOT post to
Jira unless the `--post-jira` flag was provided.

### With --post-jira flag

After displaying in chat, also post as a Jira comment:

```bash
acli jira workitem comment create --key <TICKET-ID> --body "<content>"
```

Format the comment as plain text (no markdown — Jira doesn't render it).
Prefix the comment with:

```
Implementation Plan (automated — generated by analyzing the codebase)

This plan supplements any existing content under "Implementation Details &
Additional Resources" in the ticket description.

---

<plan content in plain text>
```

### Quick mode output

If `--quick` was specified, produce a shorter plan with only:
- Summary and Business Value
- Acceptance Criteria Breakdown (approach + files only)
- Implementation Steps (condensed)
- Risks and Open Questions

Skip: API Routes, Types/Models, Feature Flags, Testing Strategy, Cleanup,
Cross-Repo Coordination.

---

## Figma References

When Figma links are found in the ticket, include them in the plan output
under the Figma field. Do not attempt to fetch or analyze Figma designs
automatically.

Future enhancement: use the chrome-devtools MCP to open Figma designs in a
browser tab and use the `vision` tool to analyze screenshots or exported images.

---

## Error Handling

| Error | Action |
|-------|--------|
| `acli` not found | "Install acli and run `acli auth login`." |
| Auth failure | "Run `acli auth login` to re-authenticate." |
| Ticket not found | "Ticket <ID> not found. Verify the ID and your access." |
| Companion repo not found on disk | Note it in the plan: "Companion repo <name> not found at <path>. Cross-repo analysis skipped." |
| Explorer agent returns empty results | Note the gap in the plan and flag it as a risk. |
| Branch doesn't match ticket pattern | Ask the user for the ticket ID. |

## Guardrails

1. **Read-only throughout.** This skill never modifies code, creates files,
   or runs destructive commands. It only reads codebases and produces a plan.
2. **Stay in scope.** The plan must only cover work required by the ticket's
   acceptance criteria. Do not add unrelated improvements or tech debt.
3. **Improve what you touch.** In-scope files with clear improvement
   opportunities should be noted, but only in the Cleanup section and only
   for files already being modified.
4. **Don't fabricate.** If exploration didn't find something, say so. Don't
   invent file paths, endpoint shapes, or type definitions.
5. **Flag API gaps prominently.** The most valuable cross-repo finding is
   whether the backend supports what the frontend needs. Always be explicit.
6. **Quote sources.** When referencing ticket content, attribute it (e.g.,
   "per AC #3", "from the implementation details section").
7. **No auto-posting.** Never post to Jira unless `--post-jira` was
   explicitly provided.
