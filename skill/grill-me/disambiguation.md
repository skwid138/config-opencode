# Disambiguation — verifying shared definitions

The most common source of false agreement is the same word meaning different things to each party. Before exploring any design tree, sharpen the load-bearing terms.

## What counts as a load-bearing term

A term is load-bearing if a different definition would change the answer to a question being asked. Examples:

- "User" — does it mean the human, the authenticated account, the API caller, or the legal customer entity?
- "Cancellation" — does it mean the user clicked a button, the order status flipped, the payment was refunded, or the legal cancellation under contract terms?
- "Search" — full-text? exact-match? semantic? scoped to which corpus?
- "Cache" — in-memory? distributed? CDN? browser?

## The protocol

When you spot a load-bearing term in the user's first description:

1. **Pause and verify.** "When you say X, do you mean A, B, or something else?"
2. **Recommend the meaning you think they mean.** "I'd guess A, because of context Y. Right?"
3. **Wait for confirmation before moving on.** Don't accept "yeah, sure" — confirm by restating in their own framing.
4. **Capture the agreed definition.** If the project has a CONTEXT.md or domain glossary, this is when you propose adding the term to it (see the `grill-with-docs` skill). If it doesn't, just note the agreed definition in conversation so it can be referred back to.

## When the user resists disambiguation

If the user says "you know what I mean, just go with it" — don't.

Push once, politely: "I want to be sure we're aligned because the answer depends on whether X means A or B. Can you confirm one?"

If they still resist, surface the consequence: "OK — I'll proceed assuming A. If I get to a fork where it matters and B was right, we'll have to back up. Want to lock it in now?"

## Aliases and renaming

When two words appear to mean the same thing:

1. **Pick the better one.** Be opinionated. The "best" word is usually the most specific, the one most often used in the code, or the one a domain expert would prefer.
2. **Flag the alias as to-avoid.** "Going forward, let's call this `Order` and avoid `Purchase` — they kept getting mixed up."
3. **If the project has a CONTEXT.md, record the alias.** This prevents future drift.

## Common patterns to watch for

- **Person-vs-account confusion.** "User," "customer," "client," "account," "subscriber" often used interchangeably when they mean different things.
- **Process-vs-outcome confusion.** "Checkout" — the page, the button, the resulting order, or the entire purchase flow?
- **State-vs-event confusion.** "Cancelled" — a status the record can have, or an event that happens once?
- **Boundary confusion.** "API" — the network endpoint, the public interface of a module, the contract between teams?
- **Scope confusion.** "Production" — deployed, customer-facing, revenue-generating, the prod environment?
