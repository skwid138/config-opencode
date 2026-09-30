---
name: post-impl-audit
description: >-
  Audit implementation output against the plan that produced it. Use after
  Aragorn completes non-trivial work and before final verification, or when a
  user asks to "audit the implementation", "check Aragorn's work", "post-impl
  review", or verify that changes match a plan. Dispatches Saruman with the
  implementation-audit frame, not the pre-implementation plan-review frame.
---

# Post-Implementation Audit

Use Saruman's adversarial posture to review Aragorn's completed work against the
specific plan that authorized it. This is not a PR review: it is narrower,
plan-scoped, and happens before Gandalf's final Verify step.

## Executor ownership

**Saruman** executes this read-only audit. Gandalf gathers the plan, diff,
status, changed files, acceptance criteria, and prior verification output before
dispatch. Aragorn addresses any REVISE findings through Gandalf's workflow.

## When to use this skill

- After Aragorn completes non-trivial implementation work.
- Before Gandalf's final Verify step.
- When the user asks to "audit the implementation", "check Aragorn's work", or
  run a "post-impl review".
- When there is a plan, acceptance criteria, or explicit change list to compare
  against the actual working tree.

## When to skip

Skip only for trivial work as defined by Gandalf's triage rubric. All five must
hold:

1. Single file, single intent.
2. No design decisions requiring user input.
3. No ambiguity in what to do.
4. No external system changes.
5. Reversible.

If the case is borderline, treat it as non-trivial and audit.

## Inputs Gandalf gathers before dispatch

Provide Saruman with:

- Plan file path or inline plan text.
- Acceptance criteria, if the work came from Jira or another requirements source.
- Aragorn's completion summary, if available.
- `git status --porcelain` output, so untracked/new files are visible.
- Changed file list, including untracked files Aragorn created.
- Full `git diff` for tracked changes.
- For untracked files that matter to the plan, either include their content or
  explicitly name them so Saruman can read them.
- Any relevant verification output Aragorn already ran.

## Saruman dispatch template

```markdown
You are Saruman performing a post-implementation audit.

You are reviewing implementation output against the plan that authorized it. You
are not re-running the plan review — that already happened, against a description
of the work. You are seeing the real diff. If the plan itself proves defective
against that evidence, file it under category 8 rather than silently working
around it. Attack whether Aragorn's actual changes match the plan, missed steps,
introduced unintended work, or lack required verification.

Inputs:
- Plan: <path or inline plan>
- Acceptance criteria: <Jira AC or none>
- Aragorn summary: <summary or none>
- Git status: <git status --porcelain output>
- Changed files: <tracked and untracked files>
- Diff: <git diff output, or path to saved diff>
- Prior verification: <commands/results, or none>

Check these implementation-specific categories:
1. Plan compliance — did Aragorn do what the plan said, no less and no more?
2. Missed steps — are any ordered plan steps not reflected in the output?
3. Unintended changes — did Aragorn touch files or behaviors outside the plan?
4. Test coverage — are new/changed behaviors covered by meaningful tests, or is
   there a justified no-test reason?
5. Pattern consistency — do the changes match nearby codebase conventions?
6. Data-shape alignment — do types, interfaces, payloads, and file formats match
   what the plan and receiving code expect?
7. Verification quality — do the reported checks actually exercise the changed
   behavior, or are they only smoke/tautology signals?
8. Plan defects — did the plan instruct something the codebase or data
   contradicts, or omit something its own stated goal requires? Aragorn
   implementing a flawed plan faithfully is still a problem worth naming.

Do not redesign the plan. Do file plan defects under category 8, held to the
same verified-premise standard as every other finding.

Do not run tests, linters, builds, or mutating commands. Use read-only
exploration only where needed to verify the changed files and nearby patterns.

Output using Saruman's standard format:

## Must Address (N)
Blocking implementation defects or plan-compliance failures. Concrete consequence required.

## Should Address (N)
Non-blocking risks worth fixing before final verification. Concrete risk required.

## Unrelated Observations (N)
Adjacent issues that do not affect this implementation's correctness.

**VERDICT: APPROVE | REVISE | REJECT**

Verdict rules:
- APPROVE — no Must Address items; proceed to Gandalf Verify.
- REVISE — Aragorn should fix the named issues, then Gandalf re-runs this audit.
- REJECT — the implementation is fundamentally inconsistent with the plan or
  unsafe to continue as-is. Gandalf must stop and surface that the working tree
  contains Aragorn's partial/rejected changes.

If APPROVE with zero objections, enumerate at least three concrete aspects of
the implementation you attacked and found defensible.
```

## Gandalf handling after the audit

- **APPROVE** — proceed to Verify.
- **REVISE** — dispatch Aragorn to address Saruman's feedback, then re-run the
  post-implementation audit on the revised working tree. Before re-running the
  audit, **state in chat what this round examines that prior rounds did not** —
  either a materially different framing, or something concrete that changed (a
  probe run, a file read, a test result, an applied fix). If neither, say so and
  surface the remaining items to the user instead of dispatching. Plan defects
  (category 8) are not Aragorn's to fix unilaterally. Apply the same autonomy
  rules used during plan revision: mechanical corrections within the plan's
  stated goal may be applied and noted; anything that changes scope, approach,
  or a trade-off goes to the user before Aragorn is dispatched.
- **REJECT** — stop and surface the rejection to the user. Explicitly note that
  the working tree contains Aragorn's changes and ask whether to revert, re-plan,
  or accept with caveats.

Do not let Unrelated Observations affect the verdict or block Verify.
