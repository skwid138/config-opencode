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
