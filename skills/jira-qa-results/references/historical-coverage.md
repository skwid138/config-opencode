# Historical manual QA coverage patterns

These private references illustrate why reports must distinguish evidence
types, environments, unresolved requirements, and cleanup. They are not current
ticket facts, implementation claims, authorization, or reusable raw ticket
content. Do not copy raw comments or person metadata into public fixtures.

- **BIXB-22691**, comment 97279, parent 22690: CI reported 23 tests passed, while
  live DB index/migration still needed a human double-check. There were 11
  extra TST probes, three local defects, exact TST cleanup IDs, and a local ID
  gap.
- **BIXB-22688**, comment 97466, parent 22687: invalid qualified statuses needed
  normalization; CI/static evidence was distinct from actual checks. Borrowed
  IDs 111/163 were intentionally retained/changed. IDs 294–303 were created and
  deleted with ID 404 verification; baseline 14 plans.
- **BIXB-22701**, comment 97495, parent 22700: T9 CLIENT 403 was executed while
  the ADMIN scenario config was not run owing to BigQuery cost. The story's 403
  versus removed routes' 404 remained an unresolved requirement, separate from
  cost. Keep the observed error oracle distinct from static consequence. Token
  revoke returned 401; audit/login analytics remained residual.
- **BIXB-22582**, comment 97216, parent 22581: frontend build was known and
  backend build unknown. All ACs were claimed passed despite a human clipboard
  check still being needed; agent ~50 whole-value bulk-text input was not
  clipboard proof. Synthetic in-page 500 differed from an actual transient
  failure. Accessibility/input parsing, four actual media screenshots, and
  restore with audit residual and retained ID 181 were relevant.

## Builder/create artifact delta

BIXB-21071 comment 97743 is a supplementary artifact; the parent-title
reference 21070 does not prove a relationship. The create response `.id` was
the issue key, not a comment ID. Separate structured readback showed
`fields.comment.comments[].id` as string `97743`, `total=1`, `maxResults=1`,
and `startAt=0`, with no `isLast`. Persisted ADF added empty `attrs: {}` to
table-cell/header nodes and retained all 120 text nodes and marks. Do not claim
exact ADF round-trip or render proof.
