# Interface Design

When the user wants to explore alternative interfaces for a chosen deepening candidate, use this parallel sub-agent pattern. Based on "Design It Twice" (Ousterhout) — your first idea is unlikely to be the best.

Uses the vocabulary in [LANGUAGE.md](LANGUAGE.md) — **module**, **interface**, **seam**, **adapter**, **leverage**.

## Long-running command discipline applies

Spawning 3+ parallel sub-agents counts as a long-running operation. Per the **Long-running command discipline** section in `instruction/agent-defaults.md`, before dispatching the parallel batch:

1. **Explain** what each sub-agent will produce (which design constraint each will explore).
2. **Show** the brief skeleton (the shared technical context plus the per-agent constraint).
3. **Estimate** the cost (sub-agent count, expected wall time, token cost).
4. **Ask** the user to confirm before dispatching.

This is not optional. Three Task-tool invocations in parallel is exactly the kind of dispatch the discipline targets.

## Process

### 1. Frame the problem space

Before spawning sub-agents, write a user-facing explanation of the problem space for the chosen candidate:

- The constraints any new interface would need to satisfy.
- The dependencies it would rely on, and which category they fall into (see [DEEPENING.md](DEEPENING.md)).
- A rough illustrative code sketch to ground the constraints — not a proposal, just a way to make the constraints concrete.

Show this to the user. While they read, prepare the sub-agent briefs.

### 2. Propose the parallel dispatch

Tell the user you intend to spawn 3+ parallel exploration tasks via the Task tool, each producing a **radically different** interface for the deepened module. Give them:

- The number of sub-agents (typically 3, optionally 4).
- The per-agent design constraint (see suggested matrix below).
- The choice of subagent — `elrond` for tradeoff-heavy interface design, `legolas` if the brief is heavily exploration-of-existing-shape rather than design.

Wait for the user to confirm before dispatching.

### 3. Dispatch sub-agents in parallel

When confirmed, send all Task-tool invocations in **a single message** so they run concurrently. Each brief contains:

- The shared technical context (file paths, coupling details, dependency category from [DEEPENING.md](DEEPENING.md), what sits behind the seam, [LANGUAGE.md](LANGUAGE.md) vocabulary, and `CONTEXT.md` vocabulary so the proposal names things consistently).
- The per-agent design constraint:
  - Agent 1: "Minimize the interface — aim for 1–3 entry points max. Maximise leverage per entry point."
  - Agent 2: "Maximise flexibility — support many use cases and extension."
  - Agent 3: "Optimise for the most common caller — make the default case trivial."
  - Agent 4 (optional): "Design around ports & adapters for cross-seam dependencies."

Each sub-agent must output:

1. Interface (types, methods, params — plus invariants, ordering, error modes).
2. Usage example showing how callers use it.
3. What the implementation hides behind the seam.
4. Dependency strategy and adapters (see [DEEPENING.md](DEEPENING.md)).
5. Trade-offs — where leverage is high, where it's thin.

### 4. Present and compare

Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated — the user wants a strong read, not a menu.

The chosen design feeds back into the deepening package handed off in the main `SKILL.md` Step 4. **Do not implement.**
