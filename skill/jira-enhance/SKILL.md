---
name: jira-enhance
description: >-
  Audit Jira acceptance criteria quality, suggest improvements, and generate
  implementation details for a ticket by analyzing the codebase. Use this skill
  when a user asks to review AC quality, improve acceptance criteria, check if AC
  are complete, "are the AC good enough", "what's missing from the AC", "flesh
  out implementation details", "add technical details to the ticket", or any
  request to evaluate or enhance Jira
  ticket content — even if they don't explicitly say "Jira" or "acceptance
  criteria." Also use when the user wants to prepare a ticket for development by
  adding technical implementation context.
---

# Jira Enhance

Evaluate Jira ticket acceptance criteria for quality and completeness, and
generate implementation details by analyzing the actual codebases involved.
Previews results by default; posting to Jira is opt-in and gated.

## Executor ownership

The invoking agent may perform the read-only audit and codebase analysis.
Codebase exploration should be delegated to **Legolas** when it is non-trivial.
Jira comment mutations are not performed by read-only agents: `--post` requests
posting, then Gandalf routes the comment body through Saruman review, user
approval, and **Aragorn** execution. For non-trivial work, implementation routes
through Gandalf's workflow: plan → Saruman pre-impl review → user approval →
Aragorn execution → post-impl audit.

## When to use this skill

- "Are the AC complete for BIXB-18835?"
- "Improve the acceptance criteria"
- "What's missing from this ticket?"
- "Flesh out the implementation details"
- "Add technical context to BIXB-18835"
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
| No argument | `/jira-ac-quality` or `/jira-add-imp-plan` | Detect from branch name |
| URL | `https://wpromote.atlassian.net/browse/BIXB-18835` | Extract ID from path |

Optional flags:

| Flag | Purpose |
|------|---------|
| `--post` | Request posting the generated comment to Jira after Saruman review and user approval. Without this flag, preview only. |

**Branch → Ticket conversion:**

When no ticket ID is provided, run:

```bash
~/code/scripts/agent/branch-to-ticket.sh
```

It searches the current branch for a `PREFIX-NUMBER` / `PREFIX_NUMBER`
pattern (anywhere in the branch), uppercases the prefix, and normalizes
the separator to `-`. Examples: `bixb_18835` → `BIXB-18835`,
`feature/bixb-18835-foo` → `BIXB-18835`, `chore/some-fix-bixb-18835`
→ `BIXB-18835`.

If the script exits non-zero (no recognizable ticket ID in the branch)
and no ticket ID was provided, ask the user.

## Preflight

1. **Verify wrapper script:**
   ```bash
   ~/code/scripts/agent/jira-fetch-ticket.sh --help
   ```
   The wrapper handles its own `acli`/`jq` dependency and auth checks. Surface
   its errors verbatim.

2. **For impl-plan mode — verify git:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```

## Shared: Fetch the ticket

Fetch the ticket data for both modes:

```bash
~/code/scripts/agent/jira-fetch-ticket.sh --all <TICKET-ID>
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

### Step 5: Preview, then optional gated Jira comment

Format the output as a plain-text Jira comment body and display it in chat.
Without `--post`, stop here. With `--post`, do **not** post immediately:

1. Surface the exact comment body for Saruman review.
2. Gandalf dispatches Saruman to attack the comment for accuracy, scope creep,
   unsafe advice, and unsupported claims.
3. After Saruman approval, ask the user for explicit approval to post.
4. Dispatch Aragorn to execute the Jira mutation:

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

Use `instruction/wpromote-context.md` for Jira Component → Repository mapping
when it has been conditionally loaded under `~/code/wpromote/`. If unavailable,
use this fallback mapping and state that it is inferred:

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

For each relevant repository, dispatch **Legolas** with a focused brief to:

1. Read project conventions (`AGENTS.md` and `.agents/skills/` if present).
2. Search for related code based on AC keywords:
   - Existing implementations of similar features
   - Related API endpoints, components, or services
   - Data models and schemas involved
   - Test patterns used in the project
3. Summarize the patterns: how the codebase handles similar features, what
   conventions it follows, and what testing framework/patterns are used.

Legolas must return structured findings with file paths and line numbers where
useful, not raw file dumps.

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

### Step 5: Preview, then optional gated Jira comment

Display the implementation details in chat and render a plain-text Jira comment
body. Without `--post`, stop here. With `--post`, do **not** post immediately:
Saruman reviews the comment body, the user approves, then Aragorn executes the
Jira mutation.

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
