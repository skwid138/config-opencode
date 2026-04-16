---
name: jira-ticket
description: >-
  Fetches Jira ticket data using the Atlassian CLI (acli) and provides structured
  context for estimation, implementation, and test planning. Use this skill
  whenever a user mentions a Jira ticket ID (like PROJ-123, BIXB-18835), a Jira
  URL, or asks to estimate, implement, build, scope, or write tests for a ticket.
  Also use when the user says "pull up the ticket", "what does the ticket say",
  "get the acceptance criteria", "what's the scope of this work", or references
  any Atlassian issue key in conversation — even if they don't explicitly say
  "Jira." This skill is the bridge between Jira requirements and engineering
  action.
---

# Jira Ticket

Fetch Jira ticket data via the Atlassian CLI and transform it into actionable
engineering context — whether the goal is estimation, implementation, or testing.

> **Core insight:** Ticket descriptions and acceptance criteria are the
> requirements contract. Extracting and structuring them correctly is the first
> step of any engineering task. This skill does that extraction, then adapts its
> output based on what the user needs next.

## When to use this skill

- User provides a ticket ID: `BIXB-18835`, `PROJ-123`
- User provides a Jira URL: `https://wpromote.atlassian.net/browse/BIXB-18835`
- "Estimate BIXB-18835"
- "Implement the feature in PROJ-456"
- "Write tests for BIXB-18835"
- "What's in ticket PROJ-789?"
- "Pull up the acceptance criteria for BIXB-18835"
- "Scope this work: PROJ-123"
- "What does the ticket say?"
- Any mention of an Atlassian issue key pattern (`[A-Z]+-\d+`)

Do **not** use this skill for creating or modifying Jira tickets, transitioning
ticket status, or any write operations. This skill is strictly **read-only**.

## Input parsing

Accept ticket references in any of these forms:

| Format | Example | Extraction |
|--------|---------|------------|
| Bare ticket ID | `BIXB-18835` | Use directly |
| URL | `https://wpromote.atlassian.net/browse/BIXB-18835` | Extract ID from path |
| Conversational | "ticket 18835 in BIXB" | Assemble `BIXB-18835` |
| Multiple | `BIXB-18835, BIXB-18871` | Process each sequentially |

If the user provides only a number without a project prefix, ask which project.

## Preflight

Before fetching any data:

1. Verify `acli` is available: `which acli`
2. Verify authentication: `acli auth status`
3. If either fails, stop and tell the user:
   - Not installed: "The Atlassian CLI (acli) is not installed. Install it and run `acli auth login` to authenticate."
   - Not authenticated: "Run `acli auth login` to authenticate with your Atlassian account."
4. Stay **read-only** throughout. Never create, edit, transition, or comment on tickets.

## Core workflow

### Step 1: Fetch the ticket

Use the plain-text view for readable output:

```bash
acli jira workitem view <TICKET-ID>
```

This returns: key, type, summary, status, assignee, and description (including
acceptance criteria, implementation details, business value, and any embedded
content).

### Step 2: Fetch supplementary data

Gather additional context in parallel where possible:

**Comments** — often contain clarifications, scope changes, and decisions:
```bash
acli jira workitem comment list --key <TICKET-ID>
```

**Linked issues** — reveal dependencies and blocked/blocking relationships:
```bash
acli jira workitem link list --key <TICKET-ID>
```

**Attachments** — list metadata (names, sizes) for awareness:
```bash
acli jira workitem attachment list --key <TICKET-ID>
```

### Step 3: Fetch structured fields (when deeper context is needed)

For estimation and implementation, fetch the full JSON to extract structured
fields:

```bash
acli jira workitem view <TICKET-ID> --fields '*all' --json
```

Extract these key fields from the JSON response:

| Field | JSON Path | Purpose |
|-------|-----------|---------|
| Type | `fields.issuetype.name` | Story, Bug, Task, etc. |
| Priority | `fields.priority.name` | Urgency signal |
| Story Points | `fields.customfield_10004` | Existing team estimate |
| Components | `fields.components[].name` | Maps to codebases |
| Epic | `fields.customfield_10008` | Parent epic key |
| Parent | `fields.parent.key` + `fields.parent.fields.summary` | Parent issue context |
| Sprint | `fields.customfield_10007[].name` | Current sprint |
| Status | `fields.status.name` | Workflow state |
| Labels | `fields.labels` | Tags and categories |
| Assignee | `fields.assignee.displayName` | Who's working on it |
| Created | `fields.created` | When the ticket was filed |

### Step 4: Parse the description

The description from the plain-text view typically contains structured sections.
Extract and label each section:

- **Business Value and Impact** — the "why" behind the work
- **Acceptance Criteria** — the concrete requirements checklist
- **UI / Diagrams / Notes** — visual and interaction specifications
- **Implementation Details & Additional Resources** — technical guidance, API
  references, caveats
- **Figma links** — design reference URLs (note them but don't fetch)
- **API references** — endpoint paths and expected schemas

If acceptance criteria are not clearly labeled, look for bullet/numbered lists in
the description that describe expected behavior.

## Output modes

Adapt output based on the user's intent. If intent is ambiguous, default to
**Summary mode** and ask if they want estimation, implementation, or testing
detail.

---

### Summary mode (default)

Use when: user asks "what's in this ticket", "pull up PROJ-123", or uses the
`/ticket` command.

**Output format:**

```
## <TICKET-ID>: <Summary>

**Type:** <type> | **Priority:** <priority> | **Status:** <status>
**Assignee:** <name> | **Sprint:** <sprint name>
**Story Points:** <points> | **Epic:** <epic-key> — <epic summary>
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

---

### Estimation mode

Use when: user says "estimate", "scope", "how hard", "how long", "difficulty",
"effort", "size", "points".

**Output format:**

Build on the Summary mode output, then add:

```
### Estimation Analysis

**Scope Signals:**
- Acceptance criteria count: <N items>
- API endpoints involved: <list>
- Components touched: <list with codebase mapping>
- Linked/blocking issues: <count and summary>
- Ambiguity markers: <any vague or undefined requirements>

**Complexity Factors:**
- <List specific technical complexities from the AC and description>
- <Note any new patterns, APIs, or UI components needed>
- <Flag any cross-component or cross-repo work>

**Codebase Mapping:**
<Map components to likely repos — see reference section below>

**Effort Estimate:**
- **Quick** (<1h): <if applicable, why>
- **Short** (1-4h): <if applicable, why>
- **Medium** (1-2d): <if applicable, why>
- **Large** (3d+): <if applicable, why>
- **Recommended:** <one of the above with justification>

**Risks & Open Questions:**
- <Items that could change the estimate>
- <Ambiguities that need PM/design clarification>
```

Note: Effort tags align with the architect agent's framework. If the user is
working with the architect agent, this output feeds directly into its analysis.

---

### Implementation mode

Use when: user says "implement", "build", "create", "develop", "code this",
"work on this ticket".

**Output format:**

Build on the Summary mode output, then add:

```
### Implementation Brief

**Requirements Checklist:**
- [ ] <Each acceptance criterion as a checkable item>
- [ ] <Include sub-items for complex criteria>

**API Contract:**
<Endpoint paths, request/response schemas from the ticket>

**Codebase Targets:**
<Component → repo mapping with specific areas to modify>

**Technical Constraints:**
- <From implementation details section>
- <From comments with technical decisions>
- <Known limitations or deferred items ("separate ticket" references)>

**Deferred Scope (explicitly out of bounds):**
- <Items the ticket says to handle in separate tickets>

**Suggested Approach:**
1. <High-level implementation steps based on the AC>
2. <Order based on dependencies>
```

Note: This output is designed to feed into the implementer agent. The checklist
format lets it track progress through each acceptance criterion.

---

### Testing mode

Use when: user says "test", "write tests", "test plan", "QA", "acceptance
tests", "integration tests", "unit tests".

**Output format:**

Build on the Summary mode output, then add:

```
### Test Plan

**Scenarios from Acceptance Criteria:**
For each acceptance criterion, derive test scenarios:

#### AC: <acceptance criterion text>
- **Happy path:** <expected behavior test>
- **Edge case:** <boundary/unusual input test>
- **Negative:** <what should NOT happen>

**API Test Scenarios:**
- <For each API endpoint: valid request, invalid request, auth, edge cases>

**UI/Interaction Test Scenarios:**
- <For each UI behavior: render, interaction, state changes>

**Integration Boundaries:**
- <Cross-component interactions to verify>
- <Data flow between frontend and API>

**Test Taxonomy Recommendation:**
- **Unit tests:** <what to test at unit level>
- **Component tests:** <what to test at component level>
- **Integration tests:** <what to test at integration level>
```

Note: Test taxonomy aligns with the TDD agent's framework. If the user is
working with the TDD agent, this output feeds directly into its Red-Green-Refactor
cycle.

## Codebase mapping

Use the Wpromote Codebase Topology instruction (already in context) for
component-to-repo mapping and cross-repo dependency relationships. Do not
duplicate that information here.

## Error handling

| Error | Action |
|-------|--------|
| `acli` not found | "The Atlassian CLI (acli) is not installed. See: https://developer.atlassian.com/cli" |
| Auth failure / unauthorized | "Run `acli auth login` to re-authenticate." |
| Ticket not found | "Ticket <ID> not found. Verify the ticket ID and that you have access to the project." |
| Network error | "Could not reach Jira. Check your network connection." |
| Empty description | Note that the description is empty and report only the metadata fields. |
| Malformed ticket ID | "Could not parse a ticket ID from your input. Expected format: PROJ-123" |

## Guardrails

1. **Read-only.** Never create, edit, transition, comment on, or modify tickets.
2. **Quote sources.** When presenting information, attribute it (e.g., "from the
   ticket description", "from comment by <author>").
3. **Don't fabricate.** If a field is empty or unavailable, say so. Don't invent
   acceptance criteria or requirements.
4. **Flag ambiguity.** If acceptance criteria are vague or contradictory,
   explicitly call it out rather than guessing intent.
5. **Respect scope boundaries.** When the ticket says "separate ticket", mark
   that item as out of scope — don't include it in implementation or test plans.
