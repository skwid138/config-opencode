# Deep modules — small interface, deep implementation

From John Ousterhout's *A Philosophy of Software Design*. A module is **deep** when its interface is much smaller than its implementation: a lot of complexity is hidden behind a simple façade.

## Why it matters for TDD

Deep modules are easy to test because the public interface is small. You write tests against a few entry points, and a large amount of internal logic is exercised through them. Shallow modules — modules where the interface is nearly as large as the implementation — leak complexity to callers and force you to test surface details.

## Signals of a shallow module

- Public methods that pass parameters straight through to a single collaborator.
- "Wrapper" classes that don't add behavior, only forwarding.
- Configuration explosions: many parameters required to use the module.
- Tests that feel like they're testing two things at once because the module is really two responsibilities glued together.

## Signals of a deep module

- A small number of public entry points.
- Each entry point does meaningful work; callers don't need to coordinate.
- Internal complexity (algorithms, edge cases, data structures) is invisible from outside.
- Tests describe **what** the module does, not **how**.

## Practical heuristic

When you finish GREEN and have written a working module, ask:

- Is the interface as small as it could reasonably be?
- Could I move complexity from the caller into the module?
- Could two adjacent shallow modules be merged into one deep one?

This is a refactor question, not a green-field design question. You will rarely see the right depth on the first pass — you see it when callers start to use the module.
