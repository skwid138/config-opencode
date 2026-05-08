# Tests — what good and bad look like

## Good test

Describes a capability through the public interface. Survives internal refactors.

```typescript
// GOOD — exercises the public API, asserts observable behavior.
test("user can check out with a valid cart", async () => {
  const cart = createCart({ items: [{ sku: "A", qty: 2 }] });
  const result = await checkout(cart, { paymentToken: "tok_test" });
  expect(result.status).toBe("confirmed");
  expect(result.total).toBe(2000);
});
```

## Bad test

Couples to internals. Breaks on refactor without behavior change.

```typescript
// BAD — verifies internal call order; breaks if implementation changes.
test("checkout calls validate then charge then persist", async () => {
  const cart = createCart({ items: [{ sku: "A", qty: 2 }] });
  await checkout(cart, { paymentToken: "tok_test" });
  expect(mockValidator).toHaveBeenCalledBefore(mockCharger);
  expect(mockCharger).toHaveBeenCalledBefore(mockPersister);
});
```

## Warning signs the test is wrong

- It breaks when you rename an internal function but behavior is unchanged.
- It passes when you remove the feature entirely.
- It asserts on a private method or internal data shape.
- Setup is longer than the assertion.
- It re-implements the production code in the test.

## Test taxonomy — pick the smallest test that gives confidence

| Level | Scope | Speed | When to use |
|-------|-------|-------|-------------|
| **Unit** | One module, no I/O | Milliseconds | Default. Most logic should be testable here. |
| **Component** | Multiple modules, limited doubles | Fast | When unit-level mocking would be excessive. |
| **Broad-stack** | Full stack, real I/O | Slow | A small set, for end-to-end confidence. |
| **Contract** | Provider meets consumer expectations | Fast | Service boundaries; API compatibility. |
| **Characterization** | Pin current behavior of legacy code | Varies | Before refactoring untested code. |

**Test pyramid:** many unit tests, fewer component tests, very few broad-stack tests. Inverting the pyramid produces slow, flaky suites.

## Naming

Test names are specifications. They should make expected behavior obvious without reading the body.

```
GOOD: "user can check out with a valid cart"
GOOD: "checkout returns insufficient_funds when card is declined"
BAD:  "test1"
BAD:  "checkout works"
BAD:  "test_checkout_function"
```
