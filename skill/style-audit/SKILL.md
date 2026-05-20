---
name: style-audit
description: >-
  Audit styles, check against Figma, style pass, compare to design: read-only
  style verification workflow that audits implementation against Figma design
  tokens and produces a style-fix plan. Use when logic is done and tests pass,
  and the user wants to verify visual fidelity to the Figma design.
---

# Style Audit

Read-only visual fidelity verification for comparing an implemented UI against a
Figma design. This skill produces a concrete style-fix plan; it does **not**
modify code.

## Executor ownership

The invoking agent performs the audit and produces the style-fix plan. The plan
flows through normal orchestration before implementation:

1. Gandalf routes and frames the work.
2. Saruman performs pre-implementation review.
3. The user approves the reviewed plan.
4. Aragorn executes the approved changes.

Do not self-execute the style-fix plan from this skill.

## When to use this skill

Use this skill for requests such as:

- "audit styles"
- "check against Figma"
- "style pass"
- "compare to design"
- Any request to verify visual fidelity after logic is complete and tests pass

Do **not** use this skill for implementing the fixes directly. This is a
read-only verification workflow.

## Inputs

Collect or infer:

- Figma file/node URL or selected Figma node
- Target route/page state for the implemented component
- Component or feature name
- Relevant branch/diff context if the implementation is unmerged

If the page state requires authentication, feature flags, seeded data, or a
specific scenario, ask only for the missing state setup that cannot be inferred
from the codebase or ticket context.

## Workflow

### 1. Get Figma design context

Use the Figma MCP tools to capture both structural data and visual reference:

- `figma_get_design_context` for component structure and reference code
- `figma_get_screenshot` for the visual target
- `figma_get_variable_defs` for variables and token values

Extract all design values that affect fidelity:

- Colors
- Spacing and sizing
- Typography
- Borders and radii
- Shadows/elevation
- Layout behavior and alignment

Record exact values and variable names. Do not rely on visual approximation
where structured Figma values are available.

### 2. Read current implementation style files

Identify and read every file that contributes styles to the target component,
including:

- Component files with `className`, `style`, Ant Design props, or theme overrides
- Style hooks and token utility usage
- Shared style files, CSS modules, global CSS, and Tailwind class composition
- Shared primitives used by the component that may own part of the rendered UI

Trace styles through wrappers and shared components rather than stopping at the
first component file.

### 3. Prior art check (mandatory, thorough)

This is **not** a lightweight step. Thoroughly check:

- `src/common/components/` for existing Ant Design wrappers or shared UI
  primitives
- Feature-local modern reference implementations, such as AnalyzePerformance
  patterns within Growth Planner
- Existing custom components that extend similarly named Ant Design components
- Similar layouts, cards, charts, tooltips, empty states, legends, headers, and
  controls in nearby features

Document patterns that should be followed or reused. If prior art is rejected,
state why it does not fit.

### 4. Check for project-local styling skill

Look for `.agents/skills/styling/SKILL.md` in the current repository.

- If it exists, load it and follow the project's styling preference hierarchy
  (for example: generated Tailwind Polaris utilities > `useCssTokens` > Ant
  Design theme overrides > inline styles).
- If it does not exist, recommend token-based values without prescribing the
  application method beyond using existing project conventions.

### 5. Map Figma variables to available token equivalents

For each Figma variable or token used by the design:

1. Find the corresponding Polaris token available in the codebase.
2. Identify whether the token is exposed through generated Tailwind utilities,
   `usePolarisTokens()`, `getPolarisTokens('light')`, or another established
   project mechanism.
3. Flag Figma values that have no token equivalent.

Use tokens, never raw values, unless no equivalent token exists. When no token
exists, call that out explicitly and recommend the least risky fallback.

### 6. Produce discrepancy table

List every mismatch between the current implementation and the Figma design.

| File | Selector/Prop | Current Value | Target Value | Token to Use |
|------|--------------|---------------|--------------|--------------|

Include exact file paths, selectors, component props, utility classes, or inline
style properties where the mismatch originates.

### 7. Produce style-fix plan

Organize proposed changes by file. For each file, include:

- Exact properties/classes/props to change
- Token or value to use
- Whether the change belongs in the consumer or shared component
- Shared component boundaries and known consumers
- Where prop-based overrides should be added instead of changing shared defaults
- Where Ant Design primitives (`<Flex>`, `<Space>`, `<Typography.Text>`) should
  replace raw `div`s with equivalent CSS

Before proposing any shared component default change, list all known consumers
and explain why the default change is safe for each. Prefer consumer-level props
or overrides for feature-specific styling.

### 8. DevTools screenshot comparison

Use Chrome DevTools MCP for the implemented UI screenshot:

1. Prompt the user to navigate the app to the relevant page state showing the
   target component if the agent cannot do so from available context.
2. Capture an implementation screenshot with Chrome DevTools MCP.
3. Compare it to the Figma screenshot from step 1.
4. Note visible discrepancies, including spacing, alignment, typography, color,
   border, radius, elevation, and responsive behavior differences.

Always obtain both the Figma screenshot and the implementation screenshot before
finalizing the audit.

## Output format

Return the audit in this structure:

```markdown
## Style Audit Summary

- Figma node: ...
- Implementation route/state: ...
- Styling convention source: `.agents/skills/styling/SKILL.md` found/not found
- Screenshots compared: Figma ✅ / Implementation ✅

## Prior Art Checked

- ...

## Token Mapping

| Figma Variable/Value | Polaris Equivalent | Access Method | Notes |
|----------------------|--------------------|---------------|-------|

## Discrepancies

| File | Selector/Prop | Current Value | Target Value | Token to Use |
|------|--------------|---------------|--------------|--------------|

## Style-Fix Plan

### `<file>`
- Change ... to ... using ...
- Shared component impact: ...
- Consumer-safe approach: ...

## Visual Comparison Notes

- ...

## Handoff

This is a read-only style-fix plan. Route through Gandalf → Saruman → user
approval → Aragorn before implementation.
```

## Key preferences

- Prefer Ant Design layout primitives over raw `div`s with equivalent CSS.
- Prefer quality over speed; the goal is to prevent a second style pass.
- Maintain shared component consumer awareness. Always check who else uses a
  shared component before proposing changes to defaults.
- Prefer token-backed styling over raw values.
- Prefer prop-based overrides over shared default changes for feature-specific
  visual requirements.

## Behavioral rules

Always:

- Get both a Figma screenshot and implementation screenshot for comparison.
- Check shared component consumers before proposing default changes.
- Use tokens, never raw values, unless no token exists.
- Perform the prior art check thoroughly.
- List all consumers before proposing changes to shared component defaults.

Never:

- Modify files. This skill is read-only.
- Skip the prior art check.
- Propose changes to shared components without listing all consumers.
- Treat the produced style-fix plan as self-executing.
