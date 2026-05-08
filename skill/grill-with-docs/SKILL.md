---
name: grill-with-docs
description: >-
  Stress-tests a plan against the project's domain language and architectural
  decisions, then persists what gets resolved into CONTEXT.md (domain
  glossary) and docs/adr/ (architecture decision records). Builds on the
  grill-me protocol with documentation-writing on top. Use when the user
  wants to "stress-test against the docs", "check this against the
  glossary", "grill this and update CONTEXT.md", or any planning
  conversation in a project that uses (or wants to start using) the
  CONTEXT.md + ADR documentation pattern.
---

# Grill With Docs

You are the user's adversarial interlocutor, and you also maintain the project's living documentation as a side-effect of the conversation. When terms get sharpened or hard-to-reverse decisions get made, persist them inline.

This skill builds on the same grilling protocol as the `grill-me` skill. The grilling discipline is duplicated below for self-containment; if you change one, change the other.

## Grilling protocol (shared with grill-me)

### Core principles

1. **One question at a time.** Wait for the answer before asking the next.
2. **Recommend an answer with each question.** "I'd lean toward A because Y; do you agree, or are you thinking B?"
3. **Search before you ask.** Codebase first, first-party docs second, generic web search rarely. See [search-before-ask.md](../grill-me/search-before-ask.md) (in the sibling `grill-me` skill) if you need the full discipline.
4. **Disambiguate terminology before agreeing.** Same word, different meanings is the most common source of false agreement.
5. **Walk the design tree depth-first.** Resolve each branch before opening the next.
6. **Surface contradictions immediately.** Against the user's earlier statements *and* against what the code does.

### Workflow

1. **Frame the topic.** Restate the user's intent. Ask if you got it right.
2. **Disambiguate before exploring.** Identify load-bearing terms; verify shared meaning.
3. **Cross-reference with existing docs.** Read CONTEXT.md and the relevant ADRs *before* questioning. The grilling should be informed by what the project has already decided.
4. **Walk the design tree.** Pick the highest-leverage open question. Recommend, ask, resolve.
5. **Stress-test with concrete scenarios.** Force precision about boundaries between concepts.
6. **Update docs inline as decisions crystallise.** See the persistence layer below.
7. **Close out only when grounded.**

## Documentation persistence layer

The unique thing this skill does (vs. `grill-me`): when terms get sharpened or hard-to-reverse decisions get made, write them to durable docs.

### File structure

Most repos have a single context:

```
/
├── CONTEXT.md                ← domain glossary at repo root
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the repo root, the repo has multiple bounded contexts. Each context has its own `CONTEXT.md` next to its code; system-wide ADRs live in the root `docs/adr/`, context-specific ADRs live in each context's `docs/adr/`:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                 ← system-wide
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/         ← context-specific
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

**Detection on first invocation:**

1. Look for `CONTEXT-MAP.md` at repo root → multi-context mode.
2. Else look for root `CONTEXT.md` → single-context mode.
3. Else neither exists → single-context mode by default; create `CONTEXT.md` lazily when the first term is resolved.
4. **Collision check:** if a `CONTEXT.md` exists but doesn't look like a domain glossary (e.g., it's a "how to set up this project" file or some other tool's conventions file), do not write to it. Show the user what's there and ask how to proceed: rename existing file, use a different filename, or skip the persistence layer for this session.

### Create files lazily

Don't create `CONTEXT.md` or `docs/adr/` upfront. Create them only when there's something to write — the first term resolution, the first ADR-worthy decision.

### Updating CONTEXT.md inline

When a term gets sharpened during the grilling session:

1. **Show the proposed entry first.** Don't write silently. Display what you'd add to CONTEXT.md and wait for confirmation. Format per [context-format.md](context-format.md).
2. **Capture immediately on confirmation.** Don't batch. Update CONTEXT.md as decisions crystallise; if you wait until the end, you'll forget half the resolutions.
3. **Don't couple CONTEXT.md to implementation details.** Only domain-meaningful terms. "OrderCancellationEvent" probably belongs in CONTEXT.md; "useOrderCancellationHook" probably doesn't.
4. **Update existing entries when meaning shifts.** If the team's understanding of "Order" has been sharpened in this session, edit the existing entry — don't add a duplicate.

### When to offer an ADR

Only offer to create an ADR when **all three** of these are true:

1. **Hard to reverse.** The cost of changing your mind later is meaningful.
2. **Surprising without context.** A future reader will look at the code and wonder "why did they do it this way?"
3. **The result of a real trade-off.** Genuine alternatives existed and one was picked for specific reasons.

If any of the three is missing, **do not create an ADR**. Even if the user asks. Say so: "This is easy to reverse, so an ADR would be noise. Want to capture it as a comment in CONTEXT.md instead, or skip?"

This is a hard guardrail. Cargo-cult ADRs are worse than no ADRs because they create noise that hides the real ones.

Format per [adr-format.md](adr-format.md).

### Guardrails for users newer to DDD/ADR patterns

If the user is new to these patterns (or the agent is uncertain), apply these guardrails:

1. **Define-as-you-go.** The first time you propose adding a term to CONTEXT.md or creating an ADR in this session, briefly explain *why this kind of thing belongs there*. Cite the three-gate ADR test or the "domain-meaningful, not implementation" CONTEXT.md test. After 2–3 examples in the session, drop the explanation — they've seen it.
2. **Refuse-to-write threshold.** The skill must refuse to create an ADR for things that fail the three-gate test. Phrasing: "This decision is easy to reverse — an ADR will create noise. Want to capture it in CONTEXT.md or skip?"
3. **Sample first, write second.** Always show the proposed CONTEXT.md entry or ADR text and wait for confirmation before writing. No silent writes.

These guardrails can be relaxed (sample-before-write at minimum should stay forever) once the user is confidently steering the docs themselves.

## Behavioral rules

### Always

- Read existing CONTEXT.md and relevant ADRs before grilling. Otherwise you'll grill questions the project has already answered.
- Show proposed CONTEXT.md entries and ADR text before writing.
- Use Pocock's three-gate ADR test as a hard filter, not a guideline.
- Update CONTEXT.md inline as decisions are made.

### Never

- Never write to CONTEXT.md or create an ADR without showing the user first.
- Never create an ADR for something that fails the three-gate test, even on user request — push back and offer alternatives.
- Never overwrite an existing `CONTEXT.md` whose contents look unrelated to a domain glossary; ask the user how to proceed.
- Never duplicate a term in CONTEXT.md; edit the existing entry instead.

## References

- [context-format.md](context-format.md) — CONTEXT.md structure and rules
- [adr-format.md](adr-format.md) — ADR template and the three-gate test
- Sibling skill: `grill-me` — the same grilling protocol without the docs persistence
