# CONTEXT.md format

`CONTEXT.md` is the project's domain glossary. It records terms that are meaningful to domain experts — not implementation details.

## Structure

```md
# {Context Name}

{One or two sentences describing what this context is and why it exists.}

## Language

**Order**:
A request from a Customer to purchase one or more items.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a Customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organisation that places Orders.
_Avoid_: Client, buyer, account

## Relationships

- An **Order** produces one or more **Invoices**.
- An **Invoice** belongs to exactly one **Customer**.

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — resolved: these are distinct concepts.
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Flag conflicts explicitly.** If a term has been used ambiguously, record it in `## Flagged ambiguities` with the resolution.
- **Keep definitions tight.** One sentence max per term. Define what it IS, not what it does.
- **Show relationships.** Use bold term names. Express cardinality where it matters (`one or more`, `exactly one`, `zero or one`).
- **Only domain terms belong.** General programming concepts (timeouts, retry policies, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this concept unique to this domain, or is it a general programming term? Only the former.
- **Group terms under subheadings** when natural clusters emerge. If everything is one cohesive area, a flat list under `## Language` is fine.
- **Write an example dialogue.** A short conversation between a developer and a domain expert that shows how the terms interact and clarifies the boundaries between them. Updates the entire glossary's tone — read it as a sanity check on the definitions.

## Single vs multi-context repos

**Single context (most repos):** one `CONTEXT.md` at the repo root.

**Multiple contexts:** a `CONTEXT-MAP.md` at the repo root lists the bounded contexts, where they live, and how they relate:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md) — manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking.
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices.
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`.
```

Detection rules:

- If `CONTEXT-MAP.md` exists, read it to find contexts.
- If only a root `CONTEXT.md` exists, single-context mode.
- If neither exists, default to single-context mode and create root `CONTEXT.md` lazily.

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask before writing.
