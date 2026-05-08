# Refactor candidates

After tests are green, look for:

- **Duplication** → Extract function, class, or shared helper.
- **Long methods** → Break into private helpers; keep tests on the public interface.
- **Shallow modules** → Combine, deepen, or hide behind a smaller surface. See [deep-modules.md](deep-modules.md).
- **Feature envy** → Move logic to where the data lives.
- **Primitive obsession** → Introduce value objects (e.g. `Money`, `EmailAddress`).
- **Existing code that the new code reveals as problematic** → Note it, fix it now if small, otherwise capture as a follow-up.

## Refactor discipline

- Run tests after every refactoring move.
- Never refactor while RED. Get to GREEN first.
- One refactor at a time. If a refactor reveals another refactor, finish the first or stash it.
- Never change behavior during refactoring. New behavior starts a new RED.
