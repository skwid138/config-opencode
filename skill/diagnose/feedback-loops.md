# Feedback Loops

A fast, deterministic, agent-runnable pass/fail signal is the single highest-leverage thing in diagnosis. This file is the catalogue.

## Ten ways to construct one — try them in roughly this order

Loops that need new files or code edits (scripts, harnesses, captures, tagged lines, bisect) are code probes: you design them, and Gandalf dispatches Aragorn to install, run, and remove them. Tagged debug lines go into existing repo files that were clean before the probe; new files (scripts, harnesses, captures, fixtures) live only in the diagnosis temp subdir, never in the repo. See [instrumentation.md](instrumentation.md) for the probe contract, ledger, and cleanup gate.

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e. Prefer an existing test the project already runs. A new test is a harness (item 6); promoting it into the real suite happens only inside the approved fix.
2. **Curl / HTTP script** against a running dev server. Fast, deterministic, easy to capture as a fixture.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network. Use the `chrome-devtools` skill if the project doesn't already have a Playwright setup.
5. **Replay a captured trace.** Save a real network request / payload / event log to the diagnosis temp subdir; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked external deps) that exercises the bug code path with a single function call. The design states the harness's absolute path in the diagnosis temp subdir, repo workdir, interpreter/runner, import resolution, and fixtures; Aragorn confirms it reaches the intended seam before its output counts as evidence.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run random inputs and look for the failure mode. **Long-running-command alert:** anything past ~100 iterations crosses the threshold; propose, estimate, ask.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so `git bisect run` can drive it. Bisect runs only via Aragorn or the user, on a clean tree, with the bisect checks in the cleanup gate. **Long-running-command alert:** estimate the bisect range × per-step cost; ask before kicking off.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive *them* with a structured loop script so the loop is still bounded. Captured output feeds back to you. Always confirm with the user before going HITL.

Build the right feedback loop, and the bug is 90% fixed.

## Iterate on the loop itself

Treat the loop as a product. Once you have *a* loop, ask:

- **Can I make it faster?** Cache setup, skip unrelated init, narrow the test scope. A 30-second loop is a tax on every iteration; a 2-second loop is a superpower.
- **Can I make the signal sharper?** Assert on the specific symptom, not "didn't crash". A loop that says "exit 0" when the bug is silent data corruption is worse than no loop.
- **Can I make it more deterministic?** Pin time, seed RNG, isolate filesystem, freeze network. A 30-second flaky loop is barely better than no loop.

If the loop is slow because it requires a long-running setup (DB seeding, container spin-up, build step), apply the long-running-command discipline before running it repeatedly — explain, estimate, ask whether to optimise the setup or accept the cost.

## Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

Stress-loop iteration counts past ~100 fall under long-running-command discipline. Propose first.

## When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for one of:

- **Access** to whatever environment reproduces it (staging, a customer's data, a specific machine).
- **A captured artifact** — HAR file, log dump, core dump, screen recording with timestamps, OpenTelemetry trace export.
- **Permission to add temporary production instrumentation** — but only if the user owns the system and explicitly authorises it. This is a mutation; it crosses the read-only line and is never a probe-class exemption. It is executed by the user or by Aragorn through the full plan cycle (see the `agent/gandalf.md` triage rubric).

Do **not** proceed to hypothesise without a loop. Hypothesising without a loop is just guessing in a more elaborate format.
