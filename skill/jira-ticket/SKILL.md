---
name: jira-ticket
description: >-
  Fetches Jira ticket data using the standard wrapper script and provides
  structured context for summary, scope, and estimation. Use this skill whenever
  a user mentions a Jira ticket ID (like PROJ-123, BIXB-18835), a Jira URL, or
  asks to fetch, summarize, scope, or estimate a ticket. Implementation planning
  routes to jira-plan; code execution routes to Aragorn.
---

# Jira Ticket

Fetch Jira ticket data and transform it into concise engineering context for
summary or estimation. This skill is strictly read-only.

## Executor ownership

The invoking agent executes this read-only fetch/summarize workflow. If deeper
codebase mapping is needed for estimation, Gandalf may dispatch **Legolas** for
focused exploration. Do not create, edit, transition, or comment on Jira issues.
If the user asks to implement, build, or write tests for a ticket, route to
`jira-plan`, the `tdd` skill, or Aragorn as appropriate. For non-trivial work,
implementation routes through Gandalf's workflow: plan → Saruman pre-impl review
→ user approval → Aragorn execution → post-impl audit.

## Script

**Always use the script for data retrieval:**

```bash
~/code/scripts/agent/jira-fetch-ticket.sh BIXB-18835
~/code/scripts/agent/jira-fetch-ticket.sh --all BIXB-18835
~/code/scripts/agent/jira-fetch-ticket.sh --json-fields BIXB-18835
```

The script outputs JSON with keys: `version`, `ticket_id`, `plain_view`,
`description`, `fields`, `comments`, `links`, `attachments`. Use `jq` to extract
what you need.

## When to use this skill

- User provides a ticket ID: `BIXB-18835`, `PROJ-123`
- User provides a Jira URL: `https://wpromote.atlassian.net/browse/BIXB-18835`
- "What's in ticket PROJ-789?"
- "Pull up the acceptance criteria for BIXB-18835"
- "Scope this work: PROJ-123"
- "Estimate BIXB-18835"
- "What does the ticket say?"
- Any mention of an Atlassian issue key pattern (`[A-Z]+-\d+`) where the user is
  asking for ticket context rather than implementation

Do **not** use this skill for creating or modifying Jira tickets, transitioning
ticket status, writing Jira comments, implementation planning, implementation,
or test writing.

## Input parsing

| Format | Example | Extraction |
|--------|---------|------------|
| Bare ticket ID | `BIXB-18835` | Use directly |
| URL | `https://wpromote.atlassian.net/browse/BIXB-18835` | Extract ID from path |
| Conversational | "ticket 18835 in BIXB" | Assemble `BIXB-18835` |
| Multiple | `BIXB-18835, BIXB-18871` | Process each sequentially |

If the user provides only a number without a project prefix, ask which project.

## Preflight

Before fetching any data:

1. Verify the wrapper is available:
   ```bash
   ~/code/scripts/agent/jira-fetch-ticket.sh --help
   ```
2. Let the wrapper handle `acli`, `jq`, and auth checks. If it fails, surface its
   error verbatim.
3. Stay **read-only** throughout.

## Core workflow

### Step 1: Fetch the ticket

Use the wrapper:

```bash
~/code/scripts/agent/jira-fetch-ticket.sh --all <TICKET-ID>
```

Use `--json-fields` only when estimation requires structured fields that are not
already present.

### Step 2: Parse the description

Extract and label each section when present:

- **Business Value and Impact** — why the work matters
- **Acceptance Criteria** — concrete requirements checklist
- **UI / Diagrams / Notes** — visual and interaction specifications
- **Implementation Details & Additional Resources** — technical notes, API
  references, caveats
- **Figma links** — design reference URLs (note them but don't fetch)
- **API references** — endpoint paths and expected schemas

If acceptance criteria are not clearly labeled, look for bullet/numbered lists in
the description that describe expected behavior.

### Step 3: Extract useful structured fields

| Field | JSON Path | Purpose |
|-------|-----------|---------|
| Type | `fields.issuetype.name` | Story, Bug, Task, etc. |
| Priority | `fields.priority.name` | Urgency signal |
| Story Points | team-specific story point field, if present | Existing estimate |
| Components | `fields.components[].name` | Maps to likely codebases |
| Epic / Parent | epic or parent fields, if present | Broader context |
| Sprint | sprint field, if present | Current planning context |
| Status | `fields.status.name` | Workflow state |
| Labels | `fields.labels` | Tags and categories |
| Assignee | `fields.assignee.displayName` | Owner context |

## Output modes

Adapt output based on the user's intent. If intent is ambiguous, default to
**Summary mode** and ask if they want estimation detail.

### Summary mode (default)

Use when the user asks "what's in this ticket", "pull up PROJ-123", or uses the
`/jira-ticket` command.

```markdown
## <TICKET-ID>: <Summary>

**Type:** <type> | **Priority:** <priority> | **Status:** <status>
**Assignee:** <name> | **Sprint:** <sprint name>
**Story Points:** <points> | **Epic/Parent:** <key> — <summary>
**Components:** <component list>

### Business Value
<1-2 sentence summary of why this work matters>

### Acceptance Criteria
<Numbered list of each acceptance criterion, cleaned up and formatted>

### Technical Notes
<API references, implementation guidance, caveats from the description>

### Supplementary
- **Comments (<count>):** <Brief summary of comment themes>
- **Linked Issues:** <List of linked ticket IDs and relationship types>
- **Attachments:** <List of attachment names>
```

### Estimation mode

Use when the user says "estimate", "scope", "how hard", "how long",
"difficulty", "effort", "size", or "points".

Build on Summary mode, then add:

```markdown
### Estimation Analysis

**Scope Signals:**
- Acceptance criteria count: <N items>
- API endpoints involved: <list>
- Components touched: <list with codebase mapping>
- Linked/blocking issues: <count and summary>
- Ambiguity markers: <any vague or undefined requirements>

**Complexity Factors:**
- <Specific technical complexities from the AC and description>
- <Any new patterns, APIs, or UI components needed>
- <Cross-component or cross-repo work>

**Codebase Mapping:**
<Map components to likely repos. When under ~/code/wpromote/, use
instruction/wpromote-context.md if it is loaded; otherwise state that the mapping
is inferred.>

**Effort Estimate:**
- **Tiny** (<1h): <if applicable, why>
- **Small** (1-4h): <if applicable, why>
- **Medium** (1-2d): <if applicable, why>
- **Large** (3d+): <if applicable, why>
- **Recommended:** <one of the above with justification>

**Risks & Open Questions:**
- <Items that could change the estimate>
- <Ambiguities that need PM/design clarification>
```

## Codebase mapping

Use `instruction/wpromote-context.md` for Wpromote component-to-repo mapping and
cross-repo dependency relationships when it has been conditionally loaded under
`~/code/wpromote/`. Do not duplicate that topology here. Outside that context,
infer conservatively and state the uncertainty.

## Error handling

| Error | Action |
|-------|--------|
| Wrapper missing | `Error: ~/code/scripts/agent/jira-fetch-ticket.sh missing. Check the public scripts checkout.` |
| Auth failure / unauthorized | Surface the wrapper's auth error and tell the user to run `acli auth login`. |
| Ticket not found | `Ticket <ID> not found. Verify the ticket ID and that you have access to the project.` |
| Network error | `Could not reach Jira. Check your network connection.` |
| Empty description | Note that the description is empty and report only metadata fields. |
| Malformed ticket ID | `Could not parse a ticket ID from your input. Expected format: PROJ-123` |

## Guardrails

1. **Read-only.** Never create, edit, transition, comment on, or modify tickets.
2. **Quote sources.** Attribute information to the description, comments, or
   structured fields.
3. **Don't fabricate.** If a field is empty or unavailable, say so.
4. **Flag ambiguity.** If AC are vague or contradictory, call it out rather than
   guessing intent.
5. **Respect scope boundaries.** When the ticket says "separate ticket", mark
   that item as out of scope.
6. **Route implementation correctly.** Implementation plans belong in
   `jira-plan`; implementation execution belongs to Aragorn.
