---
name: manual-qa
description: >-
  Run rigorous, evidence-based manual web QA of a running browser app against a Jira ticket's acceptance criteria using Chrome DevTools MCP, Jira/PR context, network/console assertions, and a clear agent-vs-human test split. Use when the user asks to manually QA a web ticket, browser-test Jira ACs, execute a web QA subtask in the app, verify a local/deployed UI through Chrome, or produce a browser QA results matrix — especially Wpromote web/client-portal tickets.
---

# Manual Web QA

Verify a running web app against Jira acceptance criteria. Ground browser tests
in the implementation, collect bounded evidence, and state what remains human or
unverified.

## Ownership and safety

- This is a verification workflow, not a fixing workflow. Do not edit files,
  patch defects, mutate Jira, create PRs, seed data, change flags, restart
  services, or alter configuration.
- Route fixes through Gandalf planning, Saruman review, user approval, Aragorn
  implementation, and post-implementation audit.
- Browser actions can mutate application data. Default to observation and obtain
  user approval for the complete test plan before any test execution.
- Before an expected mutation, identify the environment, account/client, test
  data, side effects, and cleanup or rollback. Stop for production, unknown, or
  destructive effects and propose safer data or human execution.
- Never bypass permissions. Determine endpoint behavior from the implementation;
  an HTTP `POST` is not automatically a write.

## Workflow

### 1. Resolve the QA contract

Collect the story, subtask, or Jira URL; target app URL; optional PR/branch; and
account/client/test data. When issue type or parent fields are needed, use:

```text
/Users/hunter/code/scripts/agent/jira-fetch-ticket.sh --all --json-fields <KEY>
```

For a subtask, resolve `.fields.parent.key` and fetch the parent story ACs. Ask
if no parent is available. For Wpromote stories, read
[references/wpromote.md](references/wpromote.md) before discovering an existing
QA subtask. For other Jira projects, use explicit linked keys only.

Number and lightly normalize each AC into testable checks while preserving its
parent wording and identity. Keep QA-subtask steps and risk probes separate.
Flag missing or ambiguous ACs; do not invent them or narrow them to the code.

### 2. Map the implementation

Use the PR, commits, and diff to build a read-only map: route, component,
controller/state, stable selectors, network URL patterns, added/removed files,
feature flags, and relevant API behavior. Delegate focused exploration to
Legolas when useful. This map guides observability; the ACs remain the contract.

Reuse available `pr-review` or `acceptance-criteria-checker` context. Do not
automatically rerun a broad static review. Static `Met` is not browser `Passed`.
An existing `jira-qa-subtask` is input; never generate or mutate one here.

### 3. Agree on the test plan

Before executing any browser test, present:

- the numbered AC matrix and bounded risk probes;
- target environment, identity, and data;
- expected app-side effects and cleanup;
- what the agent will execute and what the human must judge;
- known coverage gaps and stop conditions.

The agent can click/fill, inspect accessibility and DOM state, check network and
console activity, and test persistence. The human owns overall visual fidelity,
perceptual no-flash behavior, exploratory judgment, and unavailable states. Wait
for the user's approval of this split and the whole test plan before executing.

### 4. Establish the browser baseline

Load and follow the `chrome-devtools` skill for launch, authentication, and URL
handling. Confirm the intended target loads. Treat a feature-flag 404 or missing
auth/data as a precondition issue until verified, not a product result.

Before acting, record the current route/state plus network and console baselines.
Enable log preservation when available. Tool retention may cover only the last
three navigations, so checkpoint evidence before loss and bound every claim to
the captured window. Use a fresh accessibility snapshot before interactions;
UIDs become stale. Pass text arrays to `wait_for`.

### 5. Execute and record ACs

Test AC by AC, preferably with a fresh snapshot for each. Record observable UI,
DOM, network, console, screenshot, and persistence evidence that matters to the
criterion. A partially verified AC is not `Passed`.

Use only these statuses: `Passed`, `Failed`, `Blocked by data`,
`Human double-check required`, `Not run`, and `Inconclusive`. Scope conclusions
to the observed environment, data, session, pagination, and evidence window.

Read [references/evidence-patterns.md](references/evidence-patterns.md) for the
evidence ladder, negative-proof recipe, boundary probes, stop conditions, and
report templates. Do not fix findings, seed missing data, or toggle flags.

When compressing context, retain full detail for open tests. For closed tests,
preserve the conclusion, evidence IDs/window, and limitations.

### 6. Run design verification when applicable

Use the optional design track for design-scoped product UI, not automatically
for Django admin, Swagger, or every browser page. Read
[references/design-verification.md](references/design-verification.md) and
compose the `figma` skill's read-only connection, extraction, and screenshot
protocols. Do not perform implementation-oriented token-to-code mapping.

If required design evidence is unavailable, record `Inconclusive` with the
explicit blocked reason. Continue independent functional QA, but do not pass the
whole ticket while required design verification remains unresolved. Run the
deeper `style-audit` workflow only when the user requests it separately.

### 7. Report

Report the environment/data/scope, implementation map, approved split and side
effects, AC matrix, boundary results, network/console summary, defects, and
specific human checks with reasons. Include a separate design table when used.
Never claim evidence that the live tools did not retain or expose.

## References

- [Evidence patterns](references/evidence-patterns.md): evidence strength,
  negative assertions, boundaries, statuses, and report templates.
- [Wpromote](references/wpromote.md): internal discovery, current topology
  source, local startup, client-data, and feature-gate cautions.
- [Design verification](references/design-verification.md): optional Figma
  scope, connection fallback, comparison evidence, and reporting.
