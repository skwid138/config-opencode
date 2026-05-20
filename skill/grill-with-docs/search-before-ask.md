# Search-before-ask

When a question has a knowable answer, find it instead of asking the user. The user's time is more valuable than yours, and the answer they remember from memory is less reliable than the source of truth.

## Hierarchy of sources

Prefer in this order. Drop to the next tier only when the previous can't answer.

### Tier 1 — Codebase and local context

The highest-confidence source. The code is the ground truth.

- Project source files (functions, types, schemas, configs).
- Existing tests — they often encode behavior the code itself doesn't make obvious.
- README, AGENTS.md, CONTEXT.md, docs/ — first-party documentation written by the team that maintains the code.
- Git history — `git log`, `git blame`, recent commits — reveals *why* something is the way it is.
- Already-loaded context in the current session.

### Tier 2 — First-party documentation

The library or framework's own docs. High-confidence; lags the code slightly but is intentional.

- Library official docs (via the `context7` MCP if available, or direct doc fetch).
- Standard-library or language docs.
- Vendor documentation (cloud provider, API docs, etc.).

### Tier 3 — Generic web search

Lowest-confidence. Use sparingly and only for a narrow class of questions.

- Ecosystem-state questions: "is library X still maintained?", "is feature Y deprecated yet?", "what's the current best alternative to Z?"
- Comparative questions where many opinions exist and you want a sample of the discourse.

**Avoid generic web search for:**
- Specific API behavior — the docs (Tier 2) are more reliable than blog posts.
- "How do I do X in library Y?" — Tier 2 has the canonical answer.
- Anything that varies across versions — blog posts are version-stamped at publish time and rot fast.
- Anything you could verify in the codebase by running a test or reading the source.

## Why generic web search is dangerous

- **Blog rot.** Posts from three years ago describe a library version that no longer exists.
- **LLM-generated content.** Stack Overflow and Medium are increasingly filled with AI-generated articles containing hallucinated APIs.
- **Outdated Stack Overflow answers.** The top answer is often from 2014, with comments noting "this is wrong since version X" buried below.
- **Ranking is not truthfulness.** The first result is the most popular, not the most correct.

The cost of a wrong answer here isn't just being wrong — it's that you'll *report* the wrong answer to the user with apparent confidence, and they may build on it.

## When to ask the user anyway

Even when an answer is in principle searchable, ask the user if:

- The question is about the user's *intent* or *preference*, not a fact ("do you want X or Y?").
- Searching would take longer than asking and is unlikely to find a definitive answer.
- The codebase has multiple possible answers and you don't know which is authoritative.
- You've searched and found contradictory information — surface the contradiction to the user rather than picking one.

## Reporting search results

When you've searched, tell the user **what you searched** and **what you found**, so they can correct you if you read the wrong thing.

> "I checked `src/checkout.ts` — looks like cancellation flips `status` to `cancelled` and emits a `CheckoutCancelled` event. Is that the cancellation you meant, or the legal-contract one in `src/billing/`?"

Don't just silently use the result; surface it.
