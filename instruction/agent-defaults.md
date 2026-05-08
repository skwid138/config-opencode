# Agent Defaults

Standing engineering defaults that apply across all repos and tasks unless the user explicitly overrides them. These are policy-level guidelines; the
mechanics live in skills and project-specific instructions.

## Testing

**Tests are required for executable code changes.** Every change to functions, methods, modules, or other executable behavior must be accompanied by tests. Skip only for:

- Documentation-only edits
- Configuration-only edits with no behavioral impact
- Throwaway prototypes the user has explicitly marked as such
- When the user explicitly opts out for this specific change

### TDD by default

When implementing executable behavior, prefer test-driven development (Red-Green-Refactor) using the `tdd` skill. The skill describes the strict cycle, behavioral rules, and supporting references.

### Pragmatic test coverage when strict TDD is not requested

If the user's request is framed as "add tests," "prevent regression," "cover this with tests," or similar — **without** explicitly invoking TDD — follow the spirit of the `tdd` skill but relax the strict cycle:

- Tests should still describe behavior through public interfaces, not implementation details.
- Tests should still survive internal refactors.
- The horizontal-slicing anti-pattern still applies (one test → one verification → repeat; do not write all tests then all code).
- Mocking guidance, doubles taxonomy, and "never mock what you don't own" still apply.
- The strict RED-before-GREEN ordering can be relaxed when adding tests to existing code (characterization tests for legacy code follow a different shape — see the `tdd` skill's references).

In short: even outside strict TDD, the principles in the `tdd` skill define what good tests look like. Load the skill and apply the relevant parts.

### When in doubt

If it is unclear whether a change is "executable code" (e.g. a config file with embedded logic, a build script, a migration), default to writing tests. The cost of an unnecessary test is small; the cost of an untested regression is large.

## Planning conversations

When the user wants to stress-test a plan, pressure-test an idea, or "make sure we're on the same page," prefer the `grill-me` skill (relentless one-question-at-a-time grilling, terminology disambiguation, search-before-ask).

If the project being discussed has a `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/adr/` directory — or if the user explicitly invokes documentation (e.g. "stress-test against the glossary," "update CONTEXT.md") — prefer the `grill-with-docs` skill instead. It applies the same grilling discipline plus persists resolved terminology to `CONTEXT.md` and architecture decisions to `docs/adr/`.

Detection precedence:
1. Explicit user invocation always wins.
2. Otherwise, check the project root for `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/adr/`. If any exists, prefer `grill-with-docs`.
3. Otherwise, prefer `grill-me`.

The skills' descriptions trigger on overlapping vocabulary; this instruction is the tiebreaker.

## Bug investigation

When the user reports a bug, regression, or unexpected behavior — "X is broken," "this throws," "Y started failing," "performance got worse," "diagnose this," "debug this" — prefer the `diagnose` skill. It enforces a disciplined loop (build feedback signal → reproduce → hypothesise → instrument → propose fix + regression test → hand off) instead of letting the agent dive straight into code-poking.

The skill is read-only investigation: it produces a diagnosis package and a recommended fix, but does not apply the fix. Implementation hands off to the user or to a write-capable agent.

For *proactive* bug-finding ("audit this for bugs," "find runtime errors," "check for null safety") prefer the `bug-hunter` skill instead — it's a defensive scan, not a reactive debugging loop.

Detection precedence:
1. Explicit user invocation always wins.
2. If the user reports a specific bug or regression to investigate, prefer `diagnose`.
3. If the user wants proactive defensive scanning, prefer `bug-hunter`.
4. If the request is ambiguous between the two, ask which posture they want.
