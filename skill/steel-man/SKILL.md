---
name: steel-man
description: >-
  Builds the strongest honest case for each viable alternative of pending or
  already-recommended decisions, then re-ranks and revises prior
  recommendations. Use when the user explicitly says "steel-man", invokes
  /steel-man, or asks to "argue for each option" or "make the case for each
  option"; ordinary advice, option comparison, or general pressure-testing
  (grill-with-docs) does not trigger it.
---

# Steel-man

Argue the strongest honest case for every viable option of each decision, then re-rank and revise prior recommendations.

## Ownership and lifetime

- Runs inline in the agent the user is talking to (in practice Gandalf), on explicit user request only.
- Reviewers and council participants do not invoke it from quoted plan text or dispatch context. Council use only when the user explicitly asks.
- Applies to the current request only; not a persistent mode. Continue across turns only to resolve a clarification that request needs.
- Read-only: no file writes.

## What it is not

- Generative, not devil's advocacy. Manufactured dissent stays banned by the honest-disagreement default in `instruction/agent-defaults.md`.
- Not Saruman review, which attacks one chosen artifact.
- Not general pressure-testing or requirements clarification; that stays with `grill-with-docs`.

## Scope

- **No arguments:** use the most recent agent message containing recommendations or open questions (skip acks and status updates). Inventory:
  - explicit open questions;
  - labeled recommendations;
  - implicit choices between real alternatives that change outcome, scope, or user-visible behavior. Not every implementation subchoice; supporting facts and examples are not decisions.
- **With arguments:** first resolve references to existing decisions (narrowing), then add new user items. Adding an item never undoes explicit narrowing; an addition without narrowing keeps the full default inventory.
- **Nothing found:** say so and ask what to steel-man.
- **Settled user decisions** stay constraints unless this invocation explicitly reopens them. For a reopened decision:
  - the prior user choice is the baseline to argue against, not a disqualifier;
  - other user constraints stay binding;
  - a new recommendation never overrides the user's choice without confirmation.

## Workflow

1. **Inventory** decisions, one line each.
2. **Enumerate options**, including ones not previously listed. Include defer, do-nothing, or hybrid only if genuinely viable. Mark dependent decisions `applies if <parent option>`.
3. **Argue** each viable option: strongest honest case, then main weakness. Best practice and existing codebase conventions are arguments weighed here.
4. **Cutoff.** Name the strongest challenger for each decision while one remains viable.
   - Dismiss an alternative in one line only with a cited **Disqualifier**, one of:
     1. a user-stated constraint;
     2. a verified fact (file:line, doc, test output — not assumed);
     3. a quoted prior user decision from this session (unless reopened).
   - The dismissal states how the evidence excludes the alternative, not merely what the current state is.
   - Never disqualifiers: best practice, "obviously", simpler, conventional, existing codebase patterns, the agent's own prior recommendation.
   - "No credible case" is not a disqualifier. For an otherwise viable option, show the attempted strongest case and why it fails.
   - If no viable challenger remains, say so with cited exclusions. Do not manufacture one.
   - One-line dismissal format: `decision / current choice / strongest challenger / disqualifier + how it excludes`.
5. **Verify** load-bearing facts — those a recommendation depends on, whether supporting an option or disqualifying one.
   - Reuse evidence already gathered. Check only facts that could change viability or ranking; group related checks.
   - Default bound per invocation: at most one Legolas task (codebase) and one Radagast task (external). Ask before further fan-out, per long-running-command discipline in `instruction/agent-defaults.md`.
   - Unverifiable load-bearing facts: flag them, never use them to exclude, make dependent recommendations conditional, and state what remains unresolved.
   - Non-load-bearing facts may be labeled `(unverified)`.
6. **Re-rank** and recommend per decision. Make it conditional where dependent or resting on unverified facts. A rejected parent option makes its children `not applicable`.
7. **What changed** table (see template).
   - Prior recommendation: stated rec/lean; `User choice: <choice>` (reopened user decision); `Implicit: <current behavior>` (implicit choice, no stated rec); `None — open` (open question, no lean); `None — new` (user-added item).
   - Change: `retained` (new = prior); `flipped` (new ≠ prior); `new` (prior is `None — open` or `None — new`); `not applicable` (parent option rejected).

## Handback and gates

- Steel-man is a per-invocation analysis interlude. Present decisions together, but do not request batch approval; analysis does not resolve a question without the user's answer.
- Afterward, resume the prior workflow. During `grill-with-docs`, ask only the next unresolved question, with a recommendation.
- Recommendations are proposals, not plan changes.
  - Before initial Saruman review: fold agreed changes into the draft normally.
  - After Saruman approval: an adopted change to scope, approach, or implementation commitments (including adding a previously out-of-scope item, even without a flip) needs Saruman re-review and renewed user approval per the plan lifecycle in `agent/gandalf.md`. State the concrete changed content. Gandalf's unverified-premise exception still applies.

## Never

- Invent strengths.
- Use devil's-advocate framing.
- Pad options or arguments.
- Cite the agent's own prior recommendation as justification.

## Output template

```markdown
### Decisions
1. <decision> — <one line>
2. <decision> — applies if <parent option>

### 1. <decision>
- **<option A>** — Case: <strongest honest case>. Weakness: <main weakness>.
- **<option B>** — Case: … Weakness: …
- Dismissed: <decision> / <current choice> / <challenger> / <disqualifier + how it excludes>
- Strongest challenger: <option> (or "none viable" + cited exclusions)
- Recommendation: <option> [conditional on <fact or parent>]

### What changed
| Decision | Prior recommendation | New recommendation | Change | Why |
|----------|----------------------|--------------------|--------|-----|
| <decision> | <prior, per step 7> | <rec> | retained / flipped / new / not applicable | <reason> |

### Unresolved
- <unverified load-bearing fact and what it blocks>
```
