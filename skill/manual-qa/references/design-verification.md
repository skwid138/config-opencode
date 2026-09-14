# Optional Design Verification

Use this track when a ticket or user identifies an authoritative design for the
tested UI. Keep design observations separate from functional AC results.

## Contents

1. [Scope and authority](#scope-and-authority)
2. [Connection and fallback](#connection-and-fallback)
3. [Match the tested state](#match-the-tested-state)
4. [Evidence responsibilities](#evidence-responsibilities)
5. [Status rules](#status-rules)
6. [Design results table](#design-results-table)

## Scope and authority

At intake, record:

- the Figma file, frame, or node supplied by the ticket or user;
- who or what makes it authoritative and whether it is current;
- the app route and exact UI state;
- viewport, responsive breakpoint, theme, and relevant data state;
- whether design verification is required for acceptance or optional context.

Do not assume that every web page has a Figma contract. Product frontend UI is a
likely candidate. Django admin, Swagger, and other operational surfaces are not
design-scoped unless the ticket or user explicitly provides a design for them.

If the design conflicts with an AC, stop and ask which source governs. Record the
decision; do not silently override either source or invent missing design.

## Connection and fallback

Load the `figma` skill and use only its read-only connection, extraction,
screenshot, and comparison protocols that are available in the current session.
Do not copy its connection setup here or invent Figma tool calls.

Perform one bounded usability check. If the Figma MCP is unavailable or fails:

1. Report the failure once.
2. Offer user enable/reconnect, the existing Chrome/Figma fallback, supplied
   screenshots, or a named human check.
3. Do not retry in a loop, restart OpenCode, edit config, or auto-launch a server.

A known MCP startup error is context, not a defect to repair during QA. If the
design is required and no authoritative evidence can be accessed, assign
`Inconclusive` and state the explicit blocked reason. Continue independent
functional QA, but do not mark the whole ticket passed.

## Match the tested state

Before comparing, confirm that Figma and the app represent the same:

- route and component variant;
- populated, empty, loading, error, hover, focus, or disabled state;
- viewport and responsive breakpoint;
- theme and color mode;
- data shape and content assumptions.

If these cannot be aligned, narrow the claim or use `Inconclusive`. A comparison
against a different state is not negative evidence against the implementation.

## Evidence responsibilities

The agent may:

- cite the exact Figma file/frame/node;
- capture matched-state screenshots;
- inspect rendered DOM and computed styles;
- compare measurable dimensions, spacing, typography, color, visibility, and
  layout when the available tools expose exact values;
- record discrepancies and evidence limitations.

The human should check:

- overall fidelity and visual balance;
- transitions, animation, flicker, and no-flash behavior;
- responsive states not exercised by the agent;
- data-dependent or perceptual states that the session cannot reproduce.

Network and console evidence cannot prove visual fidelity. Screenshots can show
appearance but cannot prove exact token use. Do not perform source-level
token-to-code mapping in this track. If the user wants deeper source/prior-art,
token, and fix-plan analysis, route that separate request to `style-audit`.

## Status rules

Use the canonical statuses from `evidence-patterns.md`:

- `Passed` only when all required design observations are supported in the
  matched state.
- `Failed` for an observed mismatch with the authoritative design.
- `Human double-check required` for a named perceptual check assigned to a
  person.
- `Inconclusive` for unavailable required design, unmatched state, or
  insufficient evidence. Include the explicit blocked reason.
- `Not run` when an approved design test has not been executed.
- `Blocked by data` only when missing application data is the blocker.

Do not use a generic `Blocked` status. Optional unresolved design observations do
not erase independent functional results. Required unresolved design work does
prevent a whole-ticket pass.

## Design results table

```markdown
| Design reference | Route/state | Expected | Observed | Evidence | Status | Limitations |
|---|---|---|---|---|---|---|
| <Figma file/frame/node> | <route, state, viewport, theme> | <measurable design> | <rendered result> | <screenshot/DOM/style IDs> | <canonical status> | <human check or evidence gap> |
```

Place optional observations below the required rows and label them optional so
they cannot change the AC verdict silently.
