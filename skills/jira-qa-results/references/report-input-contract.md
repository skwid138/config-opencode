# Jira QA Results: report and input contract

This reference defines the builder's strict version-1 input, output envelope,
ADF subset, and status semantics. It is a reporting contract, not a test plan or
Jira API guarantee.

## Input JSON

Pass exactly one JSON document to
`/Users/hunter/code/scripts/agent/jira-qa-results-build.sh INPUT.json`, or use
`-` to read one document from stdin. The builder rejects multiple top-level
documents, unknown fields, wrong types, duplicate IDs, unresolved references,
and caller-supplied ADF.

All top-level fields below are required, including arrays that may be empty.
Objects reject extra fields. Required strings must be non-empty; use `unknown`
when a value is not known rather than omitting it.

```json
{
  "version": 1,
  "target_issue_key": "TEST-123",
  "parent_story": {"key": "TEST-122", "summary": "Synthetic example"},
  "environments": [
    {
      "id": "ENV-1",
      "label": "Synthetic environment",
      "date_window": "2026-10-27 10:00-10:05 UTC",
      "scope": "One synthetic check",
      "url": "https://example.test/",
      "identity": "Synthetic operator alias",
      "build": {"source": "synthetic fixture", "id": "build-1", "time": "2026-10-27T10:00:00Z"},
      "client_deviations": [],
      "approved_agent_checks": ["One synthetic check"],
      "approved_human_checks": [],
      "completed_human_checks": [],
      "approved_side_effects": [],
      "cleanup_scope": "No data changes"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC-1",
      "text": "Synthetic criterion wording.",
      "coverage": "complete",
      "status": "Passed",
      "environment_id": "ENV-1",
      "build_id": "build-1",
      "evidence_ids": ["E-1"]
    }
  ],
  "subtask_tests": [],
  "evidence": [
    {
      "id": "E-1",
      "provenance": "agent_browser",
      "action": "Opened the synthetic route",
      "method": "browser",
      "path": "/",
      "state": "Synthetic heading visible",
      "window": "One captured check",
      "limits": "Fixture only; no live app was checked",
      "artifact": "Synthetic evidence marker",
      "environment_id": "ENV-1",
      "build_id": "build-1"
    }
  ],
  "probes": [],
  "findings": [],
  "observations": [],
  "unresolved_requirements": [],
  "design_verification": [],
  "accessibility": [],
  "input_parsing": [],
  "attachments": [],
  "closers": {"not_run": [], "needs_human": [], "qa_data_cleanup": []}
}
```

### Record schemas

- `parent_story`: exactly `key`, `summary`. Its valid Jira key must differ from
  `target_issue_key`.
- `environments[]`: exactly `id`, `label`, `date_window`, `scope`, `url`,
  `identity`, `build`, `client_deviations`, `approved_agent_checks`,
  `approved_human_checks`, `completed_human_checks`, `approved_side_effects`,
  `cleanup_scope`. `build` contains exactly non-empty `source`, `id`, and `time`.
  Keep approved human checks distinct from completed human checks; completed
  work does not imply prior approval. Use an alias for identity; do not include
  unnecessary account/person details. `url` is HTTP(S) or the literal `unknown`.
- `acceptance_criteria[]`: exactly `id`, `text`, `coverage`, `status`,
  `environment_id`, `build_id`, `evidence_ids`. `coverage` is `complete` or
  `partial`. A partial result cannot be `Passed`. `Passed` and `Failed` require
  evidence IDs.
- `subtask_tests[]`, `probes[]`, `design_verification[]`, `accessibility[]`,
  and `input_parsing[]`: exactly `id`, `label`, `status`, `notes`,
  `environment_id`, `build_id`, `evidence_ids`. `Passed` and `Failed` require
  evidence IDs. If QA-subtask steps were unavailable, say so in `notes`; if the
  array is empty, the report explicitly says no steps were supplied and none
  were invented.
- `evidence[]`: exactly `id`, `provenance`, `action`, `method`, `path`, `state`,
  `window`, `limits`, `artifact`, `environment_id`, `build_id`. Provenance is
  one of `agent_browser`, `agent_api`, `synthetic_injected`, `static`,
  `ci_only`, `assumption`, or `human_completed`. Keep an evidence record in one
  registry entry and refer to it by ID. `path` is an HTTP(S) URL, a root-relative
  app/API route such as `/api/items`, or a textual marker without path separators.
  `artifact` is descriptive text without slash/backslash separators or an
  independently verified HTTP(S) URL.
- `findings[]`: confirmed defects only. Exactly `id`, `summary`, `expected`,
  `actual`, `reproduction`, `severity`, `scope`, `environment_id`, `build_id`,
  `evidence_ids`. Evidence is required.
- `observations[]` and `unresolved_requirements[]`: exactly `id`, `summary`,
  `environment_id`, `build_id`, `evidence_ids`. The report labels an
  observation as making no asserted violation. Keep unresolved expected
  behavior separate from observed defects.
- `attachments[]`: exactly `id`, `caption`, `state`, `viewport`,
  `environment_id`, `build_id`, `local_path`. Use IDs such as `SCREENSHOT-01`
  or `ATTACHMENT-01`. Use an empty `local_path` when no mapping is available.
  Otherwise supply only an absolute existing local file path. The builder
  verifies file existence for the handoff, never places the path in ADF, and
  marks missing mappings unavailable without returning the path. Captions
  should identify the test, environment, state, and viewport where relevant.
  The builder does not upload files or create/render media nodes. A durable
  link may appear as visible caption text only after its metadata is
  independently verified; the builder does not verify the link itself.
- `closers`: exactly `not_run`, `needs_human`, and `qa_data_cleanup`, each an
  array of non-empty strings. Include reasons and exact cleanup IDs, environment,
  actions, verification, retained state, residuals, or incomplete work where
  relevant. Do not claim approval that was not given.

IDs must be non-empty and unique across every record collection. Every result
record must resolve to an existing environment and matching build ID. Every
evidence reference must resolve to a registry record for that same
environment/build. Split outcomes across different environments/builds rather
than merging them. Evidence fields record action, method/path, state, observation
window, limits, and artifact. Builder and publisher reject common POSIX roots
(including `/Users`, `/Volumes`, `/mnt`, `/private/var`, `/tmp`, and
`/var/folders`), drive-letter and UNC paths, dot-relative paths, and `file://`
references in ADF-visible text. `evidence.path` is separate: it accepts an
HTTP(S) URL, a root-relative API route such as `/api/items`, or a textual marker
without separators. `evidence.artifact` accepts textual markers/descriptions
without slash or backslash characters, or an HTTP(S) URL; it is not a local-path
field. The publisher validates the evidence table's Path and Artifact cells
against those rules. These checks are conservative and pattern-based, not
universal path recognition. They do not detect every secret or prove semantic
redaction, so review free text and URLs before preview.

## Canonical report and ADF

The generated title is `Agent-assisted manual QA — <parent story key>:
<summary>`. The verdict is `Agent assessment — not QA sign-off.` The ADF uses
collapsible `expand` sections titled Environment, Acceptance criteria, Subtask
tests, and Evidence register. Optional probes, findings/observations/unresolved
requirements, design verification, accessibility, input parsing, and attachments
are also collapsible. Keep the title and verdict outside the expands. Keep
`Not run`, `Needs human`, and `QA data/cleanup` closers visible at top level
after the expands. Empty acceptance criteria and subtask tests are stated
explicitly.

Allowed result statuses are exactly:

- `Passed`
- `Failed`
- `Blocked by data`
- `Human double-check required`
- `Not run`
- `Inconclusive`

Distinguish executed browser/API checks from synthetic/injected, static, CI-only,
assumption, and completed human evidence. An unchanged code path alone does not
prove a problem is pre-existing; cite a historical baseline. Keep defects,
observations without an asserted violation, and unresolved requirements
separate. Cleanup text must not imply completion when work is retained or
unverified.

The builder emits only a small supported ADF subset: `doc` version 1 with
`content`, level-1/level-2 headings, paragraphs, text nodes, `expand` nodes with
`attrs.title` and paragraph/table children, and tables with
tableRow/tableHeader/tableCell/paragraph/text hierarchy. Generated
tableHeader/tableCell nodes carry empty `attrs: {}`. It does not accept ADF from
input and does not validate the full Atlassian schema. Jira may normalize
persisted ADF; do not claim exact round-trip. Offline structural checks do not
prove Jira acceptance or live rendering.

The builder counts generated ADF text nodes and `expand.attrs.title` values and
rejects reports over 32,767 characters. The publisher applies the same count.
The server-side ADF character count/acceptance limit is unknown; do not infer a
byte ceiling or promise the comment will be accepted.

## Builder envelope and digest

The stdout envelope has version 1 and these fields: `target_issue_key`,
`parent_story`, generated bare `adf`, readable `preview`, `attachment_handoff`,
and `body_digest`. The builder makes no Jira/network call and writes no files.
The preview includes expand titles and generated ADF text in document order,
separated by newlines.

`body_digest` is lowercase SHA-256 over the canonical compact JSON serialization
of the actual `adf` object, recursively key-sorted with `jq -cS`, followed by
exactly one newline. On macOS, recompute it from an envelope with:

```text
jq -cS '.adf' ENVELOPE.json | shasum -a 256
```

The publisher recomputes this same digest and rejects a mismatch. The reviewed
digest binds the exact ADF body; it does not prove the facts are true or that
Jira persisted the result.

## Publisher output and CLI

Preview is the default and has zero auth/remote calls:

```text
/Users/hunter/code/scripts/agent/jira-qa-results-publish.sh ENVELOPE.json
```

Writing is opt-in and requires one exact target key and the reviewed digest:

```text
/Users/hunter/code/scripts/agent/jira-qa-results-publish.sh ENVELOPE.json --key TEST-123 --expected-digest <reviewed-sha256> --write
```

The publisher extracts only `.adf.version`, `.adf.type`, and `.adf.content` to a
mode-0600 temporary file under `umask 077`, deletes it with an exit trap, and
invokes exactly once:

```text
acli jira workitem comment create --key KEY --body-file FILE --json
```

It never sends the envelope, preview wrapper, attachment handoff, or local path.
Success requires CLI exit 0, one valid JSON document, exactly one `SUCCESS`
result, `totalCount` and `successCount` equal to 1, and result `.id` equal to the
target issue key. Message wording is ignored. This is an observed response
shape, not a universal CLI-version contract. `.id` is the work item key, not a
comment ID. A success is `cli_reported_success` with `comment_id: null` and
`comment_reference: "unknown"`; it is not independent persistence proof. Any
ambiguous/malformed/multiple/partial/mismatched response or nonzero process
exit becomes sanitized `uncertain` output and is never retried. CLI-internal
retry behavior is unknown.

No automated readback is provided. If a separate read-only workflow is allowed
and the user asks for a comment reference, identify only an unambiguous match on
the exact issue. Never guess the newest entry or infer a comment ID from create
`.id`.
