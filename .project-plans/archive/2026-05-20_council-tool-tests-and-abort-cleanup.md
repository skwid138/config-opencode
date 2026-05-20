# Council Tool: Tests + session.abort() Cleanup

**Date:** 2026-05-20  
**Status:** Approved (Saruman v3)  
**Target:** `~/.config/opencode/plugins/council-tool.ts`

## Context

The council-tool.ts plugin (~472 lines) creates child sessions via `ctx.client.session.create`, prompts them, then abandons them. On timeout (via `raceWithTimeout`), the session is orphaned with no server-side cancellation. Additionally, the plugin has no test infrastructure.

## Phase 1: Test Infrastructure

- Add devDeps to `package.json`: `vitest`, `typescript`
- Add `"scripts": { "test": "vitest run" }`
- Create `tsconfig.json` (ESNext target/module, strict)
- Create `vitest.config.ts` (minimal defaults)

## Phase 2: Export Utilities for Testability

Export `raceWithTimeout` and `normalizeCouncilConfig` as named exports from the module. These are module-scoped pure utility functions (not inside the factory closure). The default export (`CouncilToolPlugin`) remains unchanged — no public API change.

## Phase 3: session.abort() Refactor

### Pattern

Abort lives INSIDE the IIFE passed to `raceWithTimeout`, in a try/finally:

```typescript
(async () => {
  let sessionID: string | undefined;
  try {
    sessionID = await createChildSession(...);
    return await promptAndExtract({ sessionID, ... });
  } finally {
    if (sessionID) {
      await ctx.client.session.abort({ path: { id: sessionID } }).catch(() => {});
    }
  }
})()
```

Applied to: `runCouncillorAttempt` and `synthesizeWithElrond`.

### Cleanup Guarantees

| Scenario | Behavior |
|----------|----------|
| Success | IIFE completes → finally aborts session |
| Failure (throw) | IIFE rejects → finally aborts session |
| Timeout (IIFE eventually resolves/rejects) | finally fires when IIFE completes → aborts session |
| Indefinite network hang | **Known limitation:** IIFE never completes → session leaks. Mitigated by server-side session TTL. AbortController out of scope. |
| sessionID undefined (createChildSession throws) | Guard prevents abort call |
| Abort itself fails | `.catch(() => {})` silences — best-effort cleanup |

### Key Decisions

1. **Guard:** `if (sessionID)` — no abort if createChildSession never resolved
2. **Best-effort:** `.catch(() => {})` — abort failure is silent (cleanup, not business logic)
3. **Abort on success too** — sessions should be cleaned up after use regardless
4. **Known limitation documented** in code comment at the refactor site

## Phase 4: Unit Tests

**File:** `plugins/council-tool.test.ts`

**Mock strategy:** Mock `ctx.client` object (session.create, session.prompt, session.messages, session.get, session.abort). Invoke plugin factory with mocked ctx, get tool, call `execute()`.

### Test Categories

1. **raceWithTimeout** (direct export) — resolves before timeout returns value; rejects on timeout with formatted label+duration in message
2. **normalizeCouncilConfig** (direct export) — missing councillors defaults; invalid timeout clamped; partial config merged with defaults
3. **Retry logic** (via execute) — first attempt fails → retry succeeds; both fail → combined error message
4. **Elrond threshold** (via execute) — <2 councillor successes → error string (no Elrond call); ≥2 → Elrond session created
5. **session.abort() cleanup** (via execute):
   - Success path: abort called with correct sessionID after promptAndExtract returns
   - Failure path: abort called after promptAndExtract throws
   - Timeout path: deferred promise pattern (200ms+ timeout, then resolve deferred → assert abort called)
   - sessionID undefined: abort NOT called when createChildSession throws before resolving
   - Abort rejects: no unhandled rejection, result still returned correctly

## Acceptance Criteria

- [ ] `npm test` passes with all test categories green
- [ ] session.abort() called in finally blocks for every created child session (guarded, best-effort)
- [ ] No behavioral regression in retry/timeout logic
- [ ] Default export unchanged (public API preserved)
- [ ] Zero unhandled promise rejections in test suite
- [ ] Known limitation documented in code comment

## Saruman Review History

- **v1:** REVISE — sessionID undefined on timeout (must guard + try/catch); race between caller abort and IIFE continuation
- **v2:** REVISE — "abort on ALL paths" claim incorrect for indefinite hangs; fake timer test fragility
- **v3:** APPROVE — limitation acknowledged, deferred promise test pattern, honest cleanup guarantees
