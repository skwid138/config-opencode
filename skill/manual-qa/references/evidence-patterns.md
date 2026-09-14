# Manual QA Evidence Patterns

Use this reference while designing tests, recording evidence, and writing the
final report. Evidence proves only the behavior, window, environment, and data
that were observed.

## Contents

1. [Evidence ladder](#evidence-ladder)
2. [AC evidence record](#ac-evidence-record)
3. [Negative-proof recipe](#negative-proof-recipe)
4. [Boundary probes](#boundary-probes)
5. [Stop conditions](#stop-conditions)
6. [Status taxonomy](#status-taxonomy)
7. [Report template](#report-template)

## Evidence ladder

Use the strongest combination relevant to the claim. More artifacts are not
automatically better; each artifact must establish part of the criterion.

1. **Observed application result:** visible state, value, navigation, error, or
   persistence outcome tied to a named test identity.
2. **DOM/accessibility evidence:** a fresh snapshot or bounded DOM/computed-style
   query that establishes exact rendered state.
3. **Network evidence:** request ID, method, path, payload/response facts, status,
   and the capture window. A failed request still proves the request fired.
4. **Console evidence:** relevant error/warning IDs and a baseline that separates
   pre-existing messages from test-generated messages.
5. **Screenshot evidence:** route/state/viewport-labeled visual evidence. It can
   support appearance claims but cannot prove exact tokens by itself.
6. **Implementation evidence:** file/route/controller/API mapping that explains
   what to observe. It does not replace browser execution.
7. **Human observation:** named perceptual or exploratory judgment with a reason
   automation cannot settle it.

For a pass, cite the smallest sufficient set. Network/console evidence does not
prove visual fidelity. A screenshot does not prove persistence or exact design
tokens. Static code evidence does not prove live behavior.

## AC evidence record

Keep one open record per criterion until its status is resolved:

```markdown
### AC-<n>: <parent criterion, lightly normalized>
- **Preconditions:** <environment, identity, data, route, state>
- **Actions:** <bounded steps actually executed>
- **Observed:** <specific behavior>
- **Status:** <canonical status>
- **Evidence:** <snapshot/request/console/screenshot IDs and capture window>
- **Gaps:** <untested branch, retention gap, unavailable data, human check>
```

Keep parent AC identity intact. Put QA-subtask instructions and extra risk probes
under their own labels so they cannot silently replace the acceptance criteria.

## Negative-proof recipe

An absence claim needs a defined observation boundary and a positive persistence
check. Use this sequence:

1. Map the real write behavior from the implementation, including all relevant
   methods, paths, queued work, unload behavior, and alternate transports.
2. Name the measured workflow from the baseline state through its settle point.
3. Capture network activity for that window. If retention is limited, checkpoint
   before navigation evicts evidence and divide the workflow into named windows.
4. Search the complete available request set for the mapped methods and paths.
   Count failed requests as fired.
5. Allow known debounce, settle, navigation, and unload timing to complete.
6. Refresh or reopen the authoritative UI and search all relevant pages for a
   unique test identity. Record pagination/search scope.
7. State exactly what was not observed and where. If any window or persistence
   scope is missing, use `Inconclusive` rather than a universal negative claim.

### `/data-models/` example

Claim: canceling creation does not persist a data model.

- Baseline request capture before opening the flow.
- Unique candidate name: `qa-cancel-20260914-1420`.
- Measured workflow: open, enter the candidate, cancel, wait for settle, navigate
  away, and return.
- Network check: zero requests matching the implementation-mapped write methods
  (`POST`, `PUT`, `PATCH`, `DELETE`, or another actual transport) and path
  `/data-models/` across the named capture windows.
- Persistence check: refresh the list and search every available page for the
  unique candidate name.
- Limit: if requests were evicted, pagination was incomplete, or an async save
  could occur beyond the wait window, report `Inconclusive` and name the gap.

Do not treat network absence alone as proof. Do not assume every `POST` writes;
use the endpoint's actual behavior.

## Boundary probes

Run only probes connected to an identified risk and approved side effects.

| Risk | Bounded probe | Evidence | Caution |
|---|---|---|---|
| Duplicate submission | Rapid double-click or repeated Enter | request count, disabled state, result count | Use safe test data; stop if duplicate cleanup is uncertain. |
| Normalization | Compare blank, spaces, and trimmed text | validation state, payload, persisted value | Do not infer `.trim()` from appearance alone. |
| Rendering/escaping | Safe punctuation, emoji, and bounded long input | rendered text, DOM, payload | Test escaping, not exploit execution. |
| Eager save | Refresh, back/forward, or navigate during edits | requests during settle/unload, refreshed state | Include unload timing and retention limits. |
| Data-dependent branch | Exercise an alternate available dataset | state and response differences | If required data is absent, use `Blocked by data`; do not seed it. |
| Race/order | Change controls quickly in a bounded sequence | final state and request ordering | Stop if rollback is unclear or effects are destructive. |

Examples of unacceptable expansion include exploit payloads, production writes,
unknown destructive actions, automatic flag changes, and unapproved data setup.
For example, if no single-table dataset exists for a required branch, report
`Blocked by data` and propose a human alternative or unit-coverage check.

## Stop conditions

Stop execution and report the reason when:

- the test plan or agent/human split is not yet approved;
- the environment, identity, client, side effect, or cleanup is unknown;
- the action targets production or may delete/corrupt data;
- permissions would need bypassing;
- missing ACs make the expected result ambiguous;
- authentication, route, feature gate, or required data blocks the next action;
- evidence retention cannot support the intended claim;
- continuing would require a defect fix, seed, flag toggle, service restart,
  config edit, Jira mutation, or other out-of-scope change.

Offer a safer dataset, a human action, a narrower claim, or a unit/integration
coverage recommendation. Never silently skip the condition and pass the AC.

## Status taxonomy

Use exactly one status per AC or design check:

| Status | Meaning |
|---|---|
| `Passed` | All required behavior was observed with sufficient evidence in the stated scope. |
| `Failed` | Observed behavior contradicts the requirement. |
| `Blocked by data` | Required application data is unavailable and cannot safely be created by this workflow. |
| `Human double-check required` | A named perceptual, exploratory, or inaccessible check requires a person. |
| `Not run` | The approved test has not been executed. State why. |
| `Inconclusive` | Execution or evidence cannot support pass/fail. State the explicit blocked reason or evidence gap. |

Do not invent a generic `Blocked` status. In particular, unavailable required
design evidence is `Inconclusive` with an explicit blocked reason. If one part of
an AC is unresolved, the whole AC cannot be `Passed`; use the status that best
describes the unresolved requirement and list passed subchecks separately.

## Report template

```markdown
# <ticket> Manual QA Report

## Session
- **Target:** <URL, environment, route>
- **Identity/data:** <account, client, unique test data>
- **Scope:** <story/subtask, PR/branch, evidence windows>

## Implementation map
<route -> component/state -> selectors -> network/API -> flags>

## Approved execution plan
- **Agent:** <checks>
- **Human:** <checks and why>
- **Side effects/cleanup:** <approved effects and rollback>

## Acceptance criteria
| AC | Observed behavior | Status | Evidence | Gaps |
|---|---|---|---|---|
| AC-1 | ... | Passed | S1, N2 | None in stated scope |

## Boundary probes
| Probe | Result | Status | Evidence/limits |
|---|---|---|---|

## Network and console
<baseline, relevant requests/messages, capture windows, retention limits>

## Defects
### DEF-1: <summary>
- **Reproduction:** ...
- **Expected:** ...
- **Actual:** ...
- **Evidence:** ...

## Human double-checks
- <specific check>: <why human judgment or unavailable state is required>

## Design verification
<include the separate design table when applicable>
```
