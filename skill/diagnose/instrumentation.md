# Instrumentation

How to add probes that produce signal without producing noise — and how to clean them up afterward.

## Tag every debug log

Use a unique prefix per investigation, e.g. `[DEBUG-a4f2]`. Pick a fresh tag for each diagnosis session — never reuse.

Reasons:

- **Cleanup is one grep.** `rg '\[DEBUG-a4f2\]'` shows everything you added. Removing them is mechanical.
- **Pre-existing debug-style logs survive.** You don't accidentally delete the team's real logging.
- **Concurrent investigations don't collide.** Two diagnoses running in parallel (yours + a teammate's) stay distinguishable.

## One variable at a time

Each probe must map to one specific prediction from a Phase 3 hypothesis. If a probe could distinguish between hypotheses A and B and also rule out C, that's fine — but the probe was designed for one of them.

Multi-variable probes ("let me log everything in this whole subsystem and see what looks weird") burn tokens and produce ambiguous evidence. They feel productive and aren't.

## Tool preference (in order)

1. **Debugger / REPL inspection.** One breakpoint beats ten logs. Use this whenever the language and environment support attaching a debugger.
2. **Targeted logs at boundaries.** Log at the seams that distinguish your hypotheses — function entry/exit, before/after the suspect transformation, at the IO edge.
3. **Existing observability.** If the project already has structured logging, traces, or metrics, use them before adding new ones. They're already plumbed and they survive.
4. **Never "log everything and grep".** Volume is not signal.

## Performance probes

Logs are usually wrong for performance bugs — they perturb the timing, they're coarse-grained, they don't tell you about CPU/memory/IO breakdown.

Instead:

1. **Baseline first.** Measure the current behaviour with a timing harness, `performance.now()`, profiler trace, or query plan. You can't tell what's slow without knowing what fast looks like.
2. **One change, one measurement.** Same as logs: change one variable, measure, compare to baseline.
3. **Profilers and heap snapshots are long-running commands.** Propose, estimate, ask before running.

Common perf seams to measure:

- **Hot loops:** wall time per iteration, allocations per iteration.
- **DB queries:** `EXPLAIN`, query count, payload size.
- **Network calls:** count, latency distribution, payload size.
- **Render paths (frontend):** layout/paint counts, long-task duration.
- **Cold starts:** module load time, init time per subsystem.

## State mutation is out of bounds

This skill does not restart services, reset databases, change config, or modify production state to make the loop work. If a probe needs that:

1. Stop.
2. Tell the user exactly what mutation is needed and why.
3. Let them decide: do it themselves, open a separate session with appropriate permissions, or accept that this avenue is blocked.

Don't argue. Don't try to find a workaround that's "almost a mutation." The line is bright for a reason.

## Cleanup checklist

Before declaring the diagnosis complete:

- [ ] All `[DEBUG-...]` instrumentation removed (`rg` the prefix to confirm zero matches).
- [ ] Throwaway harnesses deleted, or moved to a clearly-marked `.scratch/` location with a note about what they were for.
- [ ] Captured fixtures from Phase 1 (HAR files, traces, payloads) either preserved as test fixtures (if useful) or deleted.
- [ ] No probe-related changes left in the working tree that aren't part of the regression test or the diagnosis evidence.

If you wrote a failing regression test in Phase 5, leave it in place — that's the handoff artifact, not a probe.
