---
name: improve-codebase-architecture
description: >-
  Read-only architecture review. Find deepening opportunities — refactors
  that turn shallow modules into deep ones for testability and locality.
  Use when the user asks to review architecture at the system level, find
  refactoring opportunities across files, consolidate tightly-coupled
  modules, identify deepening candidates, or decide where to invest
  architectural effort. NOT for local refactors (one function, one file).
  This skill investigates and proposes; it does not execute refactors —
  implementation routes through Gandalf and Aragorn.
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and locality.

## Executor ownership

Architecture review is read-only: the invoking agent explores, proposes
deepening candidates, runs the grilling loop, and may design alternative
interfaces. **Legolas** handles delegated codebase exploration. Refactors and
documentation writes are not executed in this skill; they route through Gandalf
to **Aragorn**. For non-trivial work, implementation routes through Gandalf's
workflow: plan → Saruman pre-impl review → user approval → Aragorn execution →
post-impl audit.

When exploring the codebase, use the project's domain glossary (`CONTEXT.md` if present) to get a clear mental model of relevant modules, and read ADRs in any area you're touching.

## When to use this skill

Use it for **system-level** architecture review:

- Clusters of shallow modules across multiple files
- Missing or wrong-place seams across module boundaries
- Tightly-coupled components that resist testing or change
- "Where should we invest architectural effort?" questions

Do **not** use it for local refactors — renaming a function, extracting a helper inside one file, cleaning up a single loop. Those are edits, not architecture review.

If unclear, ask the user: *"system-level architecture review, or local refactor?"*

## Long-running command discipline

Architecture review tempts broad operations — full call-graph generation, dependency-graph scans, recursive directory walks, parallel sub-agent dispatch over many candidates, full test suite runs to verify a deepening hypothesis. Don't run any of them blind. Per the **Long-running command discipline** section in `instruction/agent-defaults.md`, before running any expensive command:

1. **Explain what would run** and what signal it would produce.
2. **Show the exact command** (or sub-agent prompt batch).
3. **Estimate the cost** (wall time, sub-agent count, tokens).
4. **Ask** whether to run it inline or hand it off to the user.

Prefer **targeted, narrow exploration** over broad scans. A focused read of three files beats a recursive walk of forty.

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles (full list in [LANGUAGE.md](LANGUAGE.md)):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

This skill is _informed_ by the project's domain model. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate.

## Process

### 1. Explore

Read the project's domain glossary and any ADRs in the area you're touching first.

Then dispatch codebase exploration to **Legolas**. Legolas is the codebase-exploration subagent — give it a focused brief that names the area of friction and the kinds of signal you want (shallow modules, leaked seams, untested clusters). Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

If you need to issue more than one or two parallel **Legolas** exploration tasks, treat that as a long-running operation: explain the batch, estimate the cost, and ask before dispatching (per the discipline above).

### 2. Present candidates

Present a numbered list of deepening opportunities. For each candidate:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve

Before falling back to inline markdown, attempt the optional HTML candidate report helper only through this default-safe contract:

1. Resolve `~/code/scripts/agent/arch-review-report.sh` to the absolute path `/Users/hunter/code/scripts/agent/arch-review-report.sh`.
2. Use the HTML report only if the script exists, is executable, exits 0, and stdout parses as well-formed JSON containing at least `{ "version": 1, "path": "..." }` with optional `opened`.
3. Pass candidate data as JSON on stdin. Expect `{version:1,path,opened}` JSON on stdout.
4. Any other outcome — missing script, denied permission, non-zero exit, malformed output, wrong version, or missing path — must not hard-fail the review. Present the candidates inline in markdown instead.

The report helper is a presentation aid only. It does not change the read-only posture of this architecture review and must never execute refactors or modify the target codebase.

**Use `CONTEXT.md` vocabulary for the domain, and [LANGUAGE.md](LANGUAGE.md) vocabulary for the architecture.** If `CONTEXT.md` defines "Order," talk about "the Order intake module" — not "the FooBarHandler," and not "the Order service."

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly (e.g. _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

For tradeoff-heavy candidates where the right deepening is non-obvious, surface the tradeoffs explicitly in the candidate brief and let the user decide.

Do NOT propose interfaces yet. Ask the user: *"Which of these would you like to explore?"*

### 3. Grilling loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Documentation side effects are staged inline as decisions crystallize, but file
writes route through Aragorn:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Propose the
  term for `CONTEXT.md` — same discipline as the `grill-with-docs` skill (see
  `skill/grill-with-docs/context-format.md`). Aragorn creates or updates the
  file after confirmation.
- **Sharpening a fuzzy term during the conversation?** Stage the CONTEXT.md
  update immediately, then route the approved write to Aragorn.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR,
  framed as: _"Want me to record this as an ADR so future architecture reviews
  don't re-suggest it?"_ Only offer when the reason would actually be needed by
  a future explorer to avoid re-suggesting the same thing — skip ephemeral
  reasons ("not worth it right now") and self-evident ones. See
  `skill/grill-with-docs/adr-format.md`. Aragorn writes approved ADRs.
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) for the parallel-sub-agent design exploration.

### 4. Hand off

When the user is ready to implement, produce a deepening package:

- **Candidate.** Which deepening was chosen, named in `CONTEXT.md` + [LANGUAGE.md](LANGUAGE.md) vocabulary.
- **Files involved.** Specific paths.
- **Current shape.** Why it's shallow / friction-prone today.
- **Target shape.** The deep module's interface (or, if `INTERFACE-DESIGN.md` was used, the chosen design with rationale).
- **Dependency strategy.** Which dependency category applies (see [DEEPENING.md](DEEPENING.md)) and what adapters are implied.
- **Test strategy.** What tests survive, what tests get deleted, what tests get added at the new interface.
- **Risks.** What could break; what to verify after.
- **ADRs.** Any new ADRs the user agreed to during the grilling loop.

Hand the package to the user or to Gandalf for Aragorn dispatch. **Do not execute
the refactor in this skill.**

## Behavioral rules

### Always

- Read `CONTEXT.md` and relevant ADRs before exploring.
- Use the [LANGUAGE.md](LANGUAGE.md) vocabulary in every suggestion.
- Apply the deletion test before classifying a module as shallow.
- Apply the long-running-command discipline before broad scans or parallel sub-agent batches.
- Present candidates and let the user pick before designing interfaces.
- Hand off the deepening package; do not execute the refactor yourself.

### Never

- Never substitute "component," "service," "API," or "boundary" for the [LANGUAGE.md](LANGUAGE.md) terms.
- Never propose interfaces in the candidate-presentation step. Wait for the user to pick.
- Never re-litigate decisions that have a clear ADR unless the friction is genuinely load-bearing.
- Never introduce a port for a single adapter (one adapter = hypothetical seam).
- Never execute the refactor. Diagnosis ends at the proposal.
- Never run a long-running command or batch parallel sub-agents without proposing first and getting confirmation.

## Per-review checklist

```
[ ] CONTEXT.md and relevant ADRs read
[ ] Exploration brief sent to Legolas (or done in-skill if narrow)
[ ] Candidates presented with files / problem / solution / benefits
[ ] Architecture vocabulary used consistently
[ ] User picked a candidate before interface design started
[ ] Grilling loop walked the design tree (constraints, dependencies, tests)
[ ] Documentation updates (CONTEXT.md, ADRs) staged and routed to Aragorn when approved
[ ] Deepening package complete and handed off
```

## References

- [LANGUAGE.md](LANGUAGE.md) — full vocabulary and principles
- [DEEPENING.md](DEEPENING.md) — dependency categories, seam discipline, testing strategy
- [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) — parallel sub-agent interface exploration ("Design It Twice")
