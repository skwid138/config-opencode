# ADR format

ADRs (Architecture Decision Records) live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create the `docs/adr/` directory lazily — only when the first ADR is needed.

## Template

```md
# {Short title of the decision}

{1–3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording **that** a decision was made and **why** — not in filling out boilerplate sections.

## Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`) — useful when decisions are revisited.
- **Considered Options** — only when the rejected alternatives are worth remembering (otherwise nobody will care in six months).
- **Consequences** — only when non-obvious downstream effects need to be called out.

## Numbering

Scan `docs/adr/` for the highest existing number and increment by one. Pad to four digits.

## When to offer an ADR — the three-gate test

All three of these must be true. If any is missing, **do not create an ADR**. Even if the user asks.

1. **Hard to reverse.** The cost of changing your mind later is meaningful — measured in days or weeks of work, not minutes.
2. **Surprising without context.** A future reader will look at the code and ask "why did they do it this way?" If the answer is obvious from reading the code, no ADR is needed.
3. **The result of a real trade-off.** Genuine alternatives existed and one was chosen for specific reasons. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced; the read model is projected to Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library — only the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite. Stops the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives where the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it — otherwise someone will suggest GraphQL again in six months.

### What does not qualify

- Coding-style preferences (those go in lint config or AGENTS.md).
- Library choices that are easy to swap (axios vs. fetch).
- Naming decisions inside a single module.
- Variable cleanups, refactors, or any change that lives within one PR.
- Anything where "we just picked one" is the honest answer.

## Refuse-to-write phrasing

If the user requests an ADR for something that fails the three-gate test, push back:

> "This decision is easy to reverse — recording it as an ADR will create noise that drowns the real decisions. Want to capture it as a `## Flagged ambiguities` entry in CONTEXT.md, or skip the docs entirely?"

Cargo-cult ADRs are worse than no ADRs.

## Cross-referencing

When an ADR supersedes another, mark it in the new ADR's frontmatter (`status: accepted, supersedes: ADR-0003`) and edit the old ADR to add `status: superseded by ADR-NNNN`. Keep both files; never delete an ADR.
