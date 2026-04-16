---
name: jira-enhance
description: >-
  Audit Jira acceptance criteria quality, suggest improvements, and generate
  implementation details for a ticket by analyzing the codebase. Use this skill
  when a user asks to review AC quality, improve acceptance criteria, check if AC
  are complete, "are the AC good enough", "what's missing from the AC", "flesh
  out implementation details", "add technical details to the ticket", "plan the
  implementation for BIXB-18835", or any request to evaluate or enhance Jira
  ticket content — even if they don't explicitly say "Jira" or "acceptance
  criteria." Also use when the user wants to prepare a ticket for development by
  adding technical implementation context.
---

# Jira Enhance

Evaluate Jira ticket acceptance criteria for quality and completeness, and
generate implementation details by analyzing the actual codebases involved.
Posts results as Jira comments for team visibility.

## When to use this skill

- "Are the AC complete for BIXB-18835?"
- "Improve the acceptance criteria"
- "What's missing from this ticket?"
- "Flesh out the implementation details"
- "Add technical context to BIXB-18835"
- "Plan the implementation for this ticket"
- "What would it take to implement BIXB-18835?"
- "Prepare BIXB-18835 for development"
- "Is this ticket ready for dev?"

Do **not** use this skill for fetching/viewing tickets (use the jira-ticket
skill), reviewing code changes (use pr-review), or transitioning ticket status.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **ac-audit** | "check the AC", "are AC complete", "improve AC" | Evaluate AC quality, suggest additions |
| **impl-plan** | "implementation details", "plan the impl", "flesh out" | Generate technical implementation plan |

If the user's intent is ambiguous, ask which mode they want.

## Input parsing

| Input | Example | Handling |
|-------|---------|---------|
| Ticket ID | `BIXB-18835` | Use directly |
| No argument | `/ac-quality` | Detect from branch name |
| URL | `https://wpromote.atlassian.net/browse/BIXB-18835` | Extract ID from path |

**Branch → Ticket conversion:**
- Branch: `bixb_18835` → Ticket: `BIXB-18835`
- Pattern: uppercase project prefix, replace `_` with `-`

If the branch doesn't match and no ticket ID provided, ask the user.

## Preflight

1. **Verify acli:**
   ```bash
   which acli && acli auth status
   ```
   If unavailable or unauthenticated, stop and instruct: "Install acli and run
   `acli auth login`."

2. **For impl-plan mode — verify git:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```

## Shared: Fetch the ticket

Fetch the ticket data for both modes:

```bash
# Plain text view for human-readable content
acli jira workitem view <TICKET-ID>

# Full JSON for structured fields
acli jira workitem view <TICKET-ID> --fields '*all' --json
```

Parse the description to extract:
- **Business Value and Impact**
- **Acceptance Criteria** — numbered/bulleted requirements
- **Implementation Details & Additional Resources** — existing technical context
- **Components** — from `fields.components[].name`

---

## Mode: AC Audit

### Step 1: Parse acceptance criteria

Extract each individual acceptance criterion from the ticket description. Number
them for reference.

### Step 2: Evaluate each criterion

Score each AC against these quality dimensions:

| Dimension | Good | Bad |
|-----------|------|-----|
| **Specific** | "Filter dropdown shows options A, B, C" | "Filtering should work" |
| **Measurable** | "Page loads in under 2 seconds" | "Page should be fast" |
| **Testable** | "Clicking Save returns 200 and persists to DB" | "Save should work correctly" |
| **Complete** | Covers happy path + error + edge cases | Only covers happy path |
| **Unambiguous** | "Date format: YYYY-MM-DD" | "Dates should be formatted properly" |

### Step 3: Identify gaps

Check for common missing AC patterns:

- **Error states:** What happens when the API returns 4xx/5xx? When the network
  is down? When required fields are empty?
- **Empty states:** What does the UI show when there's no data? First-time user
  experience?
- **Edge cases:** Pagination boundaries, maximum lengths, special characters,
  concurrent edits, timezone handling?
- **Permissions:** Who can/cannot perform this action? What happens when
  unauthorized?
- **Loading states:** What does the user see while data is loading?
- **Validation:** What input validation rules apply? What are the error messages?
- **Backwards compatibility:** Does this change affect existing behavior? Data
  migration needed?
- **Accessibility:** Keyboard navigation, screen reader, color contrast
  requirements?
- **Mobile/responsive:** Different behavior on smaller screens?

### Step 4: Generate recommendations

For each gap found, write a concrete, specific AC suggestion. Follow the same
style as the existing AC in the ticket.

### Step 5: Post as Jira comment

Format the output and post as a comment on the ticket:

```bash
acli jira workitem comment create --key <TICKET-ID> --body "<content>"
```

**Comment format (plain text for Jira):**

```
AC Quality Review (automated)

Current AC Assessment:
1. [AC text] - GOOD / NEEDS IMPROVEMENT
   [If needs improvement: what's wrong and suggested rewrite]

Suggested Additional AC:

Error Handling:
- [specific suggested AC]

Edge Cases:
- [specific suggested AC]

[other categories as applicable]

Summary: X of Y existing AC are well-defined. Z additional AC suggested.
```

**Important:** The comment body must be plain text. Jira will render it as-is.
Keep formatting simple — use dashes for bullets, numbers for ordered lists, and
blank lines for separation. Do NOT use markdown syntax like `**bold**` or
`## headers` — Jira does not render markdown in comments.

---

## Mode: Implementation Plan

### Step 1: Parse ticket context

From the fetched ticket, extract:
- All acceptance criteria (numbered)
- Existing "Implementation Details & Additional Resources" section content
- Components list
- Business value context
- Any API references or technical constraints mentioned

### Step 2: Map to repositories

Use the Jira Component → Repository mapping:

| Jira Component | Repository | Path |
|---------------|------------|------|
| Web App | polaris-web | ~/code/wpromote/polaris-web |
| API | polaris-api | ~/code/wpromote/polaris-api |
| Client Portal | client-portal | ~/code/wpromote/client-portal |
| Cube | cube | ~/code/wpromote/cube |
| SDK | wp-sdk | ~/code/wpromote/wp-sdk |
| Polaris Apps | polaris-apps | ~/code/wpromote/polaris-apps |

If no component is specified, infer from the AC content:
- Mentions of UI, page, component, button → polaris-web
- Mentions of endpoint, API, backend, service → polaris-api
- Mentions of query, metric, dimension → cube
- Mentions of pipeline, ETL, data → kraken

If multiple repos are involved, explore each.

### Step 3: Explore the codebase(s)

For each relevant repository:

1. **Read project conventions:**
   ```bash
   cat ~/code/wpromote/<repo>/AGENTS.md 2>/dev/null
   ```

2. **Search for related code** based on AC keywords. Use grep/find to locate:
   - Existing implementations of similar features
   - Related API endpoints, components, or services
   - Data models and schemas involved
   - Test patterns used in the project

3. **Understand the patterns** — how does the codebase handle similar features?
   What conventions does it follow? What testing framework and patterns are used?

Spend time here — the implementation plan is only as good as the codebase
understanding behind it. Read actual source files to understand patterns, don't
guess.

### Step 4: Generate implementation details

For each AC, produce a technical plan:

```
Implementation Plan for <TICKET-ID>: <Summary>

Prerequisites:
- [Any setup, migrations, or dependencies needed first]

AC 1: [AC text]
  Repo: <repo-name>
  Files to modify:
    - path/to/file.ts - [what to change and why]
    - path/to/other.ts - [what to change and why]
  Files to create:
    - path/to/new-file.ts - [purpose]
  Approach: [1-3 sentences on the technical approach]
  Testing: [what tests to write and where]

AC 2: [AC text]
  ...

API Changes (if applicable):
  - [HTTP method] [path] - [description]
  - Request: [key fields]
  - Response: [key fields]

Data Model Changes (if applicable):
  - [table/model] - [what changes]
  - Migration needed: yes/no

Cross-Repo Coordination:
  - [If changes span repos, describe the order and dependencies]

Testing Strategy:
  - Unit tests: [what and where]
  - Integration tests: [what and where]
  - Manual verification: [what to check]

Risks and Open Questions:
  - [Items that need clarification before or during implementation]
```

### Step 5: Post as Jira comment

Post the implementation plan as a Jira comment:

```bash
acli jira workitem comment create --key <TICKET-ID> --body "<content>"
```

**Comment header:**

```
Implementation Plan (automated)

Note: This supplements any existing content under "Implementation Details &
Additional Resources" in the ticket description. It does not replace it.

---

[implementation plan content]
```

**Important:** Keep the comment body as plain text. Use dashes for bullets,
numbers for ordered lists, and blank lines for separation. Do NOT use markdown.

Also display the full implementation plan to the user in the chat (using markdown
for readability in the chat context).

## Important guidelines

- **Be concrete, not abstract.** "You'll need to update the API" is useless.
  "Add a new GET endpoint at `/api/v1/reports/{id}/export` in
  `polaris-api/src/routes/reports.ts`" is actionable.
- **Read actual code.** Don't guess file paths or patterns. Explore the codebase
  and reference real files.
- **Respect existing patterns.** If the codebase uses a particular approach for
  similar features, follow it. Don't introduce new patterns unnecessarily.
- **Acknowledge uncertainty.** If you can't determine something from the code,
  say so — don't fabricate details.
- **Stay focused.** Only cover what the AC require. Don't scope-creep into
  improvements or refactors the ticket doesn't call for.
- **Plain text for Jira.** Comments posted to Jira must be plain text — no
  markdown formatting. Render markdown in the chat response only.
