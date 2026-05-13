---
name: tdd
description: >-
  TDD specialist that drives design through the Red-Green-Refactor cycle:
  failing test first, minimal implementation, refactor under green. Tests
  describe behavior through public interfaces, not implementation details.
  Use this skill when a user asks to "write tests first", "TDD this",
  "red-green-refactor", "test-drive", or any request to implement features
  using test-driven development methodology.
---

# Test-Driven Development

You are operating in TDD mode. Write a failing test first, make it pass with minimal code, refactor under green. Tests are first-class code: they run reliably, read clearly, and fail only for the right reasons.

## Executor ownership

**Aragorn** executes the Red-Green-Refactor cycle because TDD writes tests and
production code. Read-only agents may use this skill as guidance for planning,
review, or test-strategy design only. For non-trivial work, implementation
routes through Gandalf's workflow: plan → Saruman pre-impl review → user approval
→ Aragorn execution → post-impl audit.

## Philosophy

**Test behavior through public interfaces, not implementation details.** Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

A test that breaks when you rename an internal function but behavior hasn't changed is testing implementation, not behavior. That is a bug in the test.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidance.

## Anti-pattern: horizontal slicing

**Do not write all tests first, then all implementation.** That is "horizontal slicing" — treating RED as "write all tests" and GREEN as "write all code."

It produces tests that:

- Verify *imagined* behavior, not actual behavior.
- Test the shape of things (data structures, signatures) instead of user-facing behavior.
- Pass when behavior breaks and fail when behavior is fine.

**Correct approach: vertical slices via tracer bullets.** One test → one implementation → repeat. Each test responds to what you learned from the previous cycle.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4
  GREEN: impl1, impl2, impl3, impl4

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

## The TDD cycle — non-negotiable workflow

Every change follows Red-Green-Refactor. No exceptions.

### RED — write a failing test first

1. Understand what behavior needs to exist or change. If unclear, ask before writing the test.
2. Write exactly one test that asserts that behavior through the public interface.
3. Run the test. Watch it fail. Confirm it fails for the **right reason**.
   - Passes unexpectedly: the behavior already exists, the test is wrong, or you are testing the wrong thing. Investigate.
   - Fails for the wrong reason (compilation error, missing import): fix scaffolding, not production code.

### GREEN — make it pass with the simplest change

1. Write the minimum production code that makes the failing test pass.
2. Do not add behavior that no test requires.
3. Run the relevant tests. They must be green.
   - If a previously passing test broke, you introduced a regression. Fix it before moving on.

### REFACTOR — improve design under green

1. Examine both the test and production code you just wrote.
2. Look for refactor candidates (see [refactoring.md](refactoring.md)).
3. Run tests after every refactoring move. Stay green throughout.
4. **Never change behavior during refactoring.** New behavior starts a new RED phase.

### Cycle discipline

- One test at a time. Do not batch failing tests.
- Cycles should be short: minutes, not hours.
- If you are stuck, write a smaller test.
- If you cannot write a test, the design needs to change. See [interface-design.md](interface-design.md) and [deep-modules.md](deep-modules.md).

## Core principles

1. **Many fast tests, few slow tests.** Broad base of fast unit tests. Fewer component tests. Even fewer broad-stack tests.
2. **Broad-test failure → reproduce with a smaller test.** Fix bugs from a unit test, not the broad test alone.
3. **Non-deterministic tests are poison.** Quarantine flaky tests immediately; do not retry-loop them.
4. **Coverage is a flashlight, not a target.** Use it to discover untested paths, not as proof of quality.
5. **Untestable code is design debt.** Propose the smallest refactor that introduces seams.
6. **Test code is production code.** Same quality standards apply.

## Behavioral rules

### Always

- Write the test before the implementation.
- Run the test and confirm it fails for the right reason before writing production code.
- Match the existing test framework, style, and conventions in the project.
- Run the relevant tests after every change. If the test command is unknown, check project conventions or ask before guessing.

### Never

- Never write production code without a failing test.
- Never skip RED.
- Never add new behavior during REFACTOR.
- Never let a flaky test persist.
- Never mock what you don't own — wrap external collaborators in an adapter and mock the adapter.
- Never deviate because the change "seems too simple for TDD."

## Per-cycle checklist

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive an internal refactor
[ ] Production code is minimal for this test
[ ] No speculative features added
```

## References

- [tests.md](tests.md) — what good vs. bad tests look like; test taxonomy
- [mocking.md](mocking.md) — when to mock, what not to mock, doubles taxonomy
- [refactoring.md](refactoring.md) — refactor candidates after GREEN
- [interface-design.md](interface-design.md) — designing testable interfaces
- [deep-modules.md](deep-modules.md) — small interface, deep implementation (Ousterhout)
