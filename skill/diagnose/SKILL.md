---
name: diagnose
description: >-
  Disciplined read-only diagnosis loop for hard bugs and performance
  regressions. Reproduce → minimise → hypothesise → instrument → propose
  fix + regression test → hand off. Use when the user says "diagnose
  this", "debug this", "figure out why X is broken/throwing/failing",
  reports a bug to investigate, or describes a performance regression.
  This skill investigates and proposes; it does not apply fixes,
  restart services, or mutate state — it hands off to implementation.
---

# Diagnose

A discipline for hard bugs. Skip phases only when explicitly justified.

## Executor ownership

The invoking agent executes this read-only investigation workflow. Diagnosis
does not apply fixes, restart services, mutate config, or modify production
code. If a failing regression test or implementation change should be written,
that work must be dispatched to the write-capable agent, **Aragorn**. For
non-trivial work, implementation routes through Gandalf's workflow: plan →
Saruman pre-impl review → user approval → Aragorn execution → post-impl audit.

**This skill is read-only investigation.** You build a feedback loop, reproduce the bug, generate hypotheses, instrument, and arrive at a diagnosis with a recommended fix and a regression-test design. You **do not** apply the fix, restart services, mutate config, modify production code, or write tests inside this skill. When the diagnosis is complete, hand off — to the user, to Aragorn through Gandalf's dispatch workflow, or to whichever route the user explicitly chooses.

When exploring the codebase, use the project's domain glossary (CONTEXT.md if present) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Long-running command discipline

Diagnosis tempts you to "just run everything" — the full test suite, broad fuzz loops, full profilers, mutation testing, recursive scans. Don't. Per the **Long-running command discipline** section in `instruction/agent-defaults.md`, before running any expensive command:

1. **Explain what would run** and what signal it would produce.
2. **Show the exact command.**
3. **Estimate the cost** (wall time, CPU/memory, network, money).
4. **Ask the user** whether to run it inline or hand it off to their separate shell.

This applies to: full test suites, broad fuzz/property loops (>100 iterations), `git bisect run` over many commits, full profilers/heap snapshots, mutation testing (Stryker etc.), broad codebase scans, anything taking >30s of wall time. Prefer **targeted, narrow loops** instead — see [feedback-loops.md](feedback-loops.md).

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.** But stay narrow — a 2-second targeted loop beats a 5-minute full-suite run every time.

See [feedback-loops.md](feedback-loops.md) for:
- The ten ways to construct a loop (in rough order of preference)
- How to iterate on the loop itself (faster, sharper, more deterministic)
- Handling non-deterministic bugs (raise the reproduction rate, don't chase clean repro)
- What to do when you genuinely cannot build a loop

Do not proceed to Phase 2 until you have a loop you believe in.

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.

Do not proceed until you reproduce the bug.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.

If a hypothesis requires expensive validation (running the full suite, broad bisection, profiling under load), apply the long-running-command discipline before running it.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. **Never "log everything and grep".**

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Probes that mutate state are not allowed in this skill.** No restarts, no config changes, no DB writes. If a probe needs them, escalate to the user — explain what you'd change and why — and let them decide whether to do it themselves or open a separate session with appropriate permissions.

**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second. Profilers and heap snapshots fall under long-running-command discipline — propose, estimate, ask.

See [instrumentation.md](instrumentation.md) for log tagging conventions, perf measurement patterns, and clean-up checklists.

## Phase 5 — Propose fix + design regression test

This skill does not apply fixes. It produces a fix proposal and, where possible,
a failing regression-test design that proves both the bug and the fix
correctness once Aragorn writes it.

### Failing regression test design

This skill designs the failing regression test but does not write it. Writing
even a red test is a local file mutation, so it routes to Aragorn. Showing a red
test alongside the diagnosis is still the strongest form of "I am right about
what is wrong," but Aragorn owns that write step.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it in the diagnosis. The codebase architecture is preventing the bug from being locked down. Flag it for the architecture skill (see Phase 6).

If a correct seam exists:

1. Specify how to turn the minimised repro into a failing test at that seam.
2. Include the exact command Aragorn should run to watch it fail and confirm the
   failure reason.
3. **Stop.** Do not write the test or apply the fix in this skill.

### The handoff

Produce a diagnosis package containing:

- **Symptom.** What the user reported, restated precisely.
- **Repro.** The Phase 1 loop and how to run it.
- **Cause.** The hypothesis that survived Phase 4, stated mechanistically (what is happening, where, why).
- **Evidence.** The probe outputs, the proposed regression test for Aragorn to implement, the ruled-out hypotheses.
- **Recommended fix.** Specific code change at a specific seam, with rationale. Not the patch itself — the description.
- **Risks of the fix.** What it might break, what to verify after.
- **Follow-ups.** Architectural concerns surfaced (Phase 6 candidates), missing test coverage, related code smells.

Hand the package to the user or to Gandalf for Aragorn dispatch with the package
as the implementation prompt.

## Phase 6 — Post-mortem (still read-only)

After handing off, ask: **what would have prevented this bug?**

If the answer involves architectural change (no good test seam, tangled callers, hidden coupling), recommend the `improve-codebase-architecture` skill with the specifics. Phrase it as a recommendation to the user, not as an automatic next step — they decide whether to invoke it now, defer, or skip.

Make the recommendation **after** the diagnosis is complete, not before — you have more information now than when you started.

## Behavioral rules

### Always

- Build the feedback loop before hypothesising. No loop, no diagnosis.
- Apply the long-running-command discipline before any expensive command.
- Tag every debug log with a unique prefix.
- Show the ranked hypothesis list to the user before testing.
- Hand off the fix; do not apply it yourself.

### Never

- Never apply a fix. Diagnosis ends at the proposal.
- Never run a long-running command without proposing it first and getting confirmation.
- Never mutate state during instrumentation (no restarts, no config changes, no DB writes).
- Never proceed past a phase without satisfying its exit criteria.
- Never skip the post-mortem when the bug points at architectural debt.

## Per-investigation checklist

```
[ ] Feedback loop built and verified
[ ] Bug reproduced — exact symptom matches user's report
[ ] 3–5 falsifiable hypotheses ranked and shown
[ ] Each probe mapped to a specific prediction
[ ] Debug logs tagged for cleanup
[ ] Diagnosis package complete (symptom, repro, cause, evidence, recommended fix, risks)
[ ] Handoff target identified
[ ] Post-mortem asked: what would have prevented this?
```

## References

- [feedback-loops.md](feedback-loops.md) — ten ways to build a loop, iteration discipline, non-determinism, fallbacks
- [instrumentation.md](instrumentation.md) — log tagging, perf measurement, cleanup checklists
