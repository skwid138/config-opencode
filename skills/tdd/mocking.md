# Mocking — what to use and what to avoid

## Default: prefer state verification

Verify outcomes through the public interface. Reach for behavior verification (mocks) only for awkward collaborations: email senders, time, remote gateways, message buses.

## Doubles taxonomy

| Double | Purpose | Verification |
|--------|---------|--------------|
| **Dummy** | Satisfies a parameter; never used | None |
| **Fake** | Working shortcut implementation (e.g. in-memory repo) | State |
| **Stub** | Returns canned answers | State |
| **Spy** | Stub that also records calls | State or behavior |
| **Mock** | Pre-programmed expectations on calls | Behavior |

## Rules

### Never mock what you don't own

Third-party libraries, HTTP clients, database drivers — wrap them in an adapter you control, then test against the adapter or fake the adapter in tests. Mocking external libraries directly couples your tests to their internal API and breaks on every upgrade.

```typescript
// BAD — mocks a library you don't own.
jest.mock("stripe", () => ({ charges: { create: jest.fn() } }));

// GOOD — mocks an adapter you do own.
const fakeGateway: PaymentGateway = {
  charge: async () => ({ status: "ok", id: "ch_test" }),
};
const result = await checkout(cart, fakeGateway);
```

### Don't mock value objects

If it has no behavior worth faking, just construct a real one.

### Don't mock the system under test

If you find yourself partially mocking the class you're testing, the design needs a refactor — extract collaborators.

### Mocking is a smell, not a sin

Heavy mocking usually means the design has too many fine-grained collaborators. Listen to the tests: hard-to-mock collaborators are pointing at a missing abstraction.

## When behavior verification is worth it

- Side-effecting operations where state isn't directly observable (logging, metrics, fire-and-forget messaging).
- Confirming a side-effect happened **at most once** (idempotency, no double-charge).
- Verifying a fallback or retry path was exercised.

In all other cases, prefer asserting on returned values or observable state.
