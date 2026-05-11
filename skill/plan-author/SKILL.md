---
name: plan-author
description: >-
  Structure gathered context into a plan document at .project-plans/. Use when
  the user says "write a plan", "structure this into a plan", "plan-author", or
  any request to produce a plan document from already-gathered requirements and
  findings. Do NOT use for Jira ticket planning (use ticket-plan instead). This
  skill assumes context has already been gathered — it structures, not explores.
---

# Plan Author

Structure gathered context into a `.project-plans/` plan document. This skill
is invoked by a write-capable agent after requirements and exploration findings
have been collected. It does not fetch tickets or explore codebases — it
organizes what's already known into a consistent plan format.

## When to use

**Use when:**
- The user says "write a plan", "structure this into a plan", "plan-author"
- Gandalf dispatches with gathered context and asks for a plan document
- Converting ad-hoc notes/findings into a structured plan file

**Do NOT use when:**
- Planning from a Jira ticket (use `ticket-plan`)
- Exploring codebases to gather context (use Legolas)
- Stress-testing a plan (use `grill-me`)

## Inputs

The invoking agent should provide:
- **Goal/requirements** — what the plan accomplishes
- **Exploration findings** — codebase discoveries, research results, constraints
- **Slug** — short kebab-case identifier for the filename (e.g., `config-mcp-scoping`)
- **Source** — ticket ID, user request, or reference that prompted this plan

## Workflow

1. **Determine filename:** `.project-plans/YYYY-MM-DD_<slug>.md` (today's date)
2. **Structure** the provided context into the template sections below
3. **Write** the file
4. **Return** a brief summary: title, path, section count, key risks identified

## Plan template

```markdown
## Plan: <title>

> **Status:** Draft
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
```

## Guardrails

- Each section as short as content warrants — do not pad.
- Omit inapplicable sections with a one-line note (e.g., "N/A — no data shapes involved").
- Implementation steps must be actionable with specific file paths where known.
- Reference the `tdd` skill for testing strategy on executable changes.
- Do not fabricate — if gathered context doesn't cover something, flag it in Risks.
