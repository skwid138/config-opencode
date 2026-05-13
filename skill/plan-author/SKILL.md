---
name: plan-author
description: >-
  Structure Saruman-approved gathered context into a plan document. Use when
  the user says "write a plan", "structure this into a plan", "plan-author", or
  any request to produce a plan document from already-gathered requirements and
  findings. For Jira ticket planning, jira-plan produces the chat plan first;
  plan-author persists it only after review and approval. This skill assumes
  context has already been gathered — it structures, not explores.
---

# Plan Author

Structure gathered context into a plan document. This skill is invoked by
**Aragorn** after requirements and exploration findings have been collected and,
for non-trivial work, after Saruman review and user approval. It does not fetch
tickets or explore codebases — it organizes what's already known into a
consistent plan format.

## Executor ownership

Only **Aragorn** writes the plan file. Read-only agents can draft plan content in
chat, but must dispatch Aragorn for persistence. A persisted plan file must be a
semantic copy of the Saruman-approved content; material changes require another
Saruman review and user approval before writing.

## When to use

**Use when:**
- The user says "write a plan", "structure this into a plan", "plan-author"
- Gandalf dispatches Aragorn with gathered, reviewed context and asks for a plan document
- Converting ad-hoc notes/findings into a structured plan file

**Do NOT use when:**
- Producing the initial plan from a Jira ticket (use `jira-plan`; plan-author
  persists the approved result)
- Exploring codebases to gather context (use Legolas)
- Stress-testing a plan (use `grill-me`)

## Inputs

The invoking agent should provide:
- **Goal/requirements** — what the plan accomplishes
- **Exploration findings** — codebase discoveries, research results, constraints
- **Slug** — short kebab-case identifier for the filename (e.g., `config-mcp-scoping`)
- **Source** — ticket ID, user request, or reference that prompted this plan

## Workflow

1. **Determine filename:** use `.project-plans/YYYY-MM-DD_<slug>.md` when
   `.project-plans/` exists; otherwise use `YYYY-MM-DD_<slug>.md` at the repo
   root. Use today's date.
2. **Structure** the provided context into the template sections below
3. **Verify semantic equivalence** to the Saruman-approved content. Do not add,
   remove, or materially reinterpret scope during persistence.
4. **Write** the file
5. **Return** a brief summary: title, path, section count, key risks identified

## Plan template

```markdown
## Plan: <title>

> **Status:** Approved for persistence
> **Created:** <YYYY-MM-DD>
> **Source:** <ticket ID, user request, or reference>

### 1. Goal

What this plan accomplishes and why. 2-3 sentences.

### 2. Scope and non-goals

What's in scope. What's explicitly out and why.

### 3. Context

Gathered findings — exploration results, research, relevant existing patterns.
This is where Legolas/Radagast findings land.

### 4. Approach

High-level strategy. Key decisions and their rationale.

### 5. Implementation steps

Ordered, actionable steps. Each references specific file paths and describes
what changes. Order by dependency.

1. <Step with specific files and changes>
2. ...

### 6. Testing strategy

How to verify the implementation. Reference the `tdd` skill for executable
changes. Break down by test type where applicable.

### 7. Data shapes

Types, interfaces, API contracts, or schema changes involved.
(Omit with a one-line note if not applicable.)

### 8. Risks and open questions

Items that could affect the plan — ambiguity, missing info, dependencies,
things the gathered context didn't cover.

### 9. Verification

How to confirm the plan is complete — build passes, tests green, manual
checks, acceptance criteria met.

<!-- Include the following sections only when the source is a Jira ticket. -->

### 10. AC-by-AC traceability

For each acceptance criterion, map planned steps and verification signals back
to the exact AC text. Omit only for non-Jira plans.

### 11. API readiness / contracts

Document API routes, request/response contracts, backend readiness, and any
specific contract gaps. Omit only when no API/data contract is involved.

### 12. Feature flag decisions

State whether a feature flag is needed, which existing/new flag applies, and why.
Omit only when feature flags are irrelevant.

### 13. Cross-repo coordination

List repos involved, dependency order, merge/deploy sequencing, and ownership.
Omit only for single-repo work.

### 14. Cleanup scope

List cleanup allowed only in files already touched for the Jira AC. State "No
in-scope cleanup identified" if none qualifies.
```

## Guardrails

- Each section as short as content warrants — do not pad.
- Omit inapplicable sections with a one-line note (e.g., "N/A — no data shapes involved").
- Implementation steps must be actionable with specific file paths where known.
- Reference the `tdd` skill for testing strategy on executable changes.
- Do not fabricate — if gathered context doesn't cover something, flag it in Risks.
- Persist only reviewed and approved content. If formatting exposes a material
  gap or requires new scope, stop and send the changed plan back through Saruman
  review before writing.
