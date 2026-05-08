# Interface design for testability

Good interfaces make testing natural. If a test is hard to write, the interface usually needs work — not the test.

## 1. Accept dependencies, don't create them

Inject collaborators. Don't `new` them up inside the function.

```typescript
// Testable
function processOrder(order: Order, gateway: PaymentGateway): OrderResult { ... }

// Hard to test — caller cannot substitute the gateway
function processOrder(order: Order): OrderResult {
  const gateway = new StripeGateway();
  ...
}
```

## 2. Return results, don't mutate

Pure functions are trivial to test: pass input, assert output.

```typescript
// Testable
function calculateDiscount(cart: Cart): Discount { ... }

// Hard to test — assertion requires inspecting `cart` after the call
function applyDiscount(cart: Cart): void {
  cart.total -= discount;
}
```

## 3. Small surface area

Fewer methods means fewer tests. Fewer parameters means simpler setup.

If an interface is growing past ~5 methods, ask whether it's two interfaces wearing one mask.

## 4. Make collaborators replaceable

If you cannot substitute a collaborator in a test, you cannot isolate the unit under test. Use ports & adapters: depend on an interface you own, implement it once for production and once (or not at all — use a fake) for tests.

## 5. When the design fights the test

If you cannot write a test, do not warp the test to fit the code. Refactor the production code to expose a seam. The test was telling you something.
