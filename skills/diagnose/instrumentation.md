# Instrumentation

How to design probes that produce signal without producing noise — and how they get installed, run, and removed. This file is the canonical home for the probe contract, ledger, and cleanup gate; `SKILL.md` and `feedback-loops.md` point here. Whether a probe dispatch skips Saruman review is defined only in the `agents/gandalf.md` triage rubric ("Trivial — diagnostic probe").

## Roles

- **Diagnosing agent** (whoever invoked this skill) is read-only. It runs read-only probes itself and **designs** code probes. It never edits files, never applies fixes. Legolas or Saruman invoking this skill gain no new powers; they return probe designs to Gandalf.
- **Gandalf** posts the visibility note, maintains the ledger, dispatches Aragorn, and runs the cleanup gate.
- **Aragorn** installs, runs, and removes code probes under the contract below.

Read-only probes come first: existing logs and tests, running existing commands, debuggers, `git log`/`git blame`, Chrome DevTools. Code probes (tagged debug lines, throwaway harnesses, captures, `git bisect`) are allowed in **Phase 1** as bootstrap probes (state the missing observable the probe establishes) and in **Phase 4** (state the hypothesis prediction the probe tests).

## Tag every debug line

Use a unique prefix per diagnosis, e.g. `[DEBUG-a4f2]`. Pick a fresh tag for each diagnosis and verify it is absent with the cleanup-gate search before any insertion — never reuse.

Reasons:

- **Cleanup is one search.** The gate search finds everything the probe added.
- **Pre-existing debug-style logs survive.** The team's real logging is never touched.
- **Concurrent investigations don't collide.** Two diagnoses running in parallel stay distinguishable.

## One variable at a time

Each probe must map to one specific prediction from a Phase 3 hypothesis (or, in Phase 1, one missing observable). If a probe could distinguish between hypotheses A and B and also rule out C, that's fine — but the probe was designed for one of them.

Multi-variable probes ("log everything in this subsystem and see what looks weird") burn tokens and produce ambiguous evidence. They feel productive and aren't.

## Tool preference (in order)

1. **Debugger / REPL inspection.** One breakpoint beats ten logs. Use it whenever the language and environment support attaching a debugger.
2. **Existing observability.** Structured logs, traces, or metrics the project already has. They're plumbed and they survive.
3. **Targeted tagged logs at boundaries** (Aragorn-installed). Log at the seams that distinguish hypotheses — function entry/exit, before/after the suspect transformation, at the IO edge.
4. **Never "log everything and grep".** Volume is not signal.

## Probe design (diagnosing agent)

A probe design handed to Gandalf states:

- Prediction tested (Phase 4) or observable established (Phase 1).
- Tag, and each file plus exact line(s) to insert. Debug expressions must call no state-changing functions.
- The exact bounded repro command, its workdir, and runtime.
- Expected signal for each outcome.
- Every output location the repro will touch (build dirs, caches, coverage, app logs), plus any artifacts written under the diagnosis temp subdir.
- For harnesses: absolute path (inside the diagnosis temp subdir), repo workdir, interpreter/runner, import resolution, fixtures.
- Prefer an existing running app; state how it reloads the change and where its log sink is.

Inputs, existing logging, and capture config must be inspected first and be secret/PII-free. Nothing sensitive is logged, captured, or pasted into chat.

## Aragorn probe contract

Aragorn, dispatched by Gandalf with the design and the ledger:

1. Installs the probe exactly as designed.
2. For harnesses, confirms the harness reaches the intended seam. Setup or import failures are not evidence.
3. For an existing running app, confirms the reload happened and the log sink is the expected one.
4. Runs the exact bounded repro command in the specified workdir/runtime.
5. Captures stdout/stderr and app-log evidence.
6. Returns: command, exit status, observed signal, artifact paths.

No fixes. No full test suites or builds. No background or long-running processes. Gandalf resumes one Aragorn task_id per diagnosis; if resume is unavailable, pass the ledger in the new dispatch.

## Visibility note

Before each probe, Gandalf posts a compact note: prediction/observable, files + tag, command, expected signal. No approval wait. Expensive setup still follows long-running-command discipline.

## Probe ledger

Gandalf maintains one ledger per diagnosis:

- **Tag**, verified absent before insertion using the gate search below.
- **Each touched file** with its pre-probe `git status --porcelain -- <file>` line and `git hash-object --no-filters -- <file>`. Probes go only in files with no uncommitted changes.
- **Repro-created outputs** (build dirs, caches, coverage, app logs), identified before execution.
- **Diagnosis temp subdir** `<session-temp>/diagnose-<tag>/`, where `<session-temp>` is the path named in the bash tool description. Create it with plain `mkdir` (no `-p`; it must fail if it already exists). All harnesses, captures, and fixtures live here — never in the repo.
- **Bisect baseline** (if bisecting): `git symbolic-ref -q HEAD` (or "detached") and `git rev-parse HEAD`.
- **Gate exclusions**, if any, each with the reason the probe/repro cannot write there.

## Cleanup gate

Run at diagnosis close **and** when the diagnosis is blocked or abandoned.

1. **Tag search:**

   ```bash
   rg --no-config -uuu -F -g '!.git' -- '[DEBUG-<tag>]' <repo-root> <other ledger paths>
   ```

   Exit 1 passes. Exit 0, exit 2, or an interrupted run fails. Excluding a path is allowed only if the ledger records it with its reason.
2. **Hashes:** each touched file's `git hash-object --no-filters -- <file>` equals its ledger baseline.
3. **Temp paths:** any deletion targets only exact temp paths recorded in the ledger. Never glob-delete the shared session temp root.
4. **Bisect:** after `git bisect reset`, the symbolic ref (or detached state) and HEAD match the baseline, and `git bisect log` exits non-zero.

**Failure handling.** A failed gate blocks. No destructive recovery (no `git reset --hard`, no `git checkout -f`). On mismatch (e.g. a concurrent user edit), Aragorn removes only tagged lines and recorded created paths — no checkout, restore, or delete beyond that. Gandalf reports the residue to the user, and the gate stays failed until the user resolves it.

## git bisect

Only via Aragorn or the user, on a clean tree, under long-running-command discipline (estimate range × per-step cost; ask before starting), with the bisect baseline recorded and the gate's bisect checks applied.

## Performance probes

Logs are usually wrong for performance bugs — they perturb timing, are coarse-grained, and don't show CPU/memory/IO breakdown.

Instead:

1. **Baseline first.** Measure current behaviour with existing tooling, a timing harness (designed per above, run by Aragorn), `performance.now()`, a profiler trace, or a query plan.
2. **One change, one measurement.** Change one variable, measure, compare to baseline.
3. **Profilers and heap snapshots are long-running commands.** Propose, estimate, ask before running.

Common perf seams to measure:

- **Hot loops:** wall time per iteration, allocations per iteration.
- **DB queries:** `EXPLAIN`, query count, payload size.
- **Network calls:** count, latency distribution, payload size.
- **Render paths (frontend):** layout/paint counts, long-task duration.
- **Cold starts:** module load time, init time per subsystem.

## State mutation is out of bounds

Probes do not restart services, reset databases, change config, add dependencies, or touch production state. If a probe would need any of that:

1. Stop.
2. Tell the user exactly what mutation is needed and why.
3. Let them decide: do it themselves, route it through the full plan cycle, or accept that this avenue is blocked.

Don't argue. Don't look for a workaround that's "almost a mutation." Production instrumentation is never a probe-class exemption — see the triage rubric.

## Artifacts and fixtures

Harnesses, captures (HAR files, traces, payloads), and fixtures live in the diagnosis temp subdir and are cited by path in the diagnosis package. Promoting a fixture into the real test suite happens only inside the approved fix (full cycle). The regression test stays a design in the diagnosis package; Aragorn writes it after the fix is approved.

## Close-out checklist

- [ ] Cleanup gate passed (tag search, hashes, temp paths, bisect state).
- [ ] Probe outputs and artifact paths recorded in the diagnosis package.
- [ ] No probe-related changes left in the working tree.
