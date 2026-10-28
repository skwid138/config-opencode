---
name: jira-qa-results
description: >-
  Turn already-completed manual QA evidence into a structured, readable Jira ADF
  comment preview using the local builder. Use whenever a user asks to report,
  summarize, or prepare a Jira comment from completed browser, API, CI, static,
  synthetic, or human QA results, even if they do not mention ADF. This skill
  formats evidence only: it does not run QA, provide QA sign-off, or post by
  default. Do not use it to create QA-subtask test instructions; use
  `jira-qa-subtask` for that.
---

# Jira QA Results

Prepare an honest report from completed QA evidence. The report is an agent
assessment, not QA sign-off. This skill does not execute browser/API tests,
fetch ticket context, invent acceptance criteria, mutate Jira, upload files, or
verify that Jira persisted or rendered a comment.

## Use only completed evidence

Use the story, ACs, QA-subtask steps, environment, findings, and evidence already
provided by the user or preserved in the completed `manual-qa` session. Do not
fetch a ticket or comments to fill gaps. Ask for missing target/parent keys,
parent summary, environment/build, approval scope, or evidence instead of
guessing. Keep the QA target issue distinct from the parent story.

Do not run QA from this skill. Do not treat a CI result, static inspection,
synthetic/injected input, assumption, or partial human check as an executed
browser/API check. Attribute each evidence item to its provenance and
environment/build. Split outcomes across different environments/builds. A
partially covered AC cannot be `Passed`; cite evidence by ID and keep shared
evidence in one registry entry. Keep approved agent checks, approved human
checks, and completed human checks separate. Completed work does not imply that
the human check was approved.

Before generating the preview, review the whole input for auth tokens, cookies,
CSRF values, headers, payloads, and screenshot secrets. Redact them yourself.
The scripts validate structure and known filesystem-path leakage; they do not
prove semantic redaction, factual correctness, or that all sensitive material
was found.

## Build and preview

Read [the report/input contract](references/report-input-contract.md) before
assembling structured input. Use only its version-1 JSON shape, exact status
vocabulary, and supported ADF subset. Do not pass an arbitrary `adf` field.
For unknown environment/build values, use the literal string `unknown`. Do not
invent AC, test steps, routes, approvals, defects, historical baselines, or
cleanup verification.

Build with the public script. It accepts one input file or `-` for stdin and
writes only a version-1 envelope to stdout:

```text
/Users/hunter/code/scripts/agent/jira-qa-results-build.sh INPUT.json
/Users/hunter/code/scripts/agent/jira-qa-results-build.sh - < input.json
```

If the envelope must be reused by the publisher, save stdout only to the
session's approved temporary directory, if the active tool policy provides one.
Resolve the exact path once and reuse it. Do not create a workspace or arbitrary
local file for the envelope. Show the user the complete `.preview`, target,
parent, digest, and attachment handoff. Check the report for the correct
environment/build, status, evidence links, unresolved requirements, and
`Not run` / `Needs human` / `QA data/cleanup` closers before presenting it.

The builder creates a small ADF document and a deterministic digest of the
canonical ADF body. Structural validation is not a Jira render check. The
32,767-character guard applies to generated report text; Jira's server-side ADF
count and acceptance behavior remain unknown.

## Attachments

Use stable `SCREENSHOT-01` / `ATTACHMENT-01` markers and captions that identify
the check, environment, state, and viewport where relevant. A local file path is
only a handoff hint: the builder reports it only when it is an absolute existing
file, and the path never enters ADF. Missing or absent mappings are `unavailable`.
Do not invent a path. This builder supports marker/caption text and a local
handoff only; it does not upload files or create/render media nodes. If an
already-uploaded durable link is needed, independently verify its metadata and
include it as visible caption text; the builder does not validate the link. Do
not fabricate media IDs or confuse a Jira attachment ID with a Media Services
ID. Otherwise leave the marker and tell the human to upload or replace the
attachment after any separately authorized post.

## Jira publishing is a separate gate

The publisher defaults to preview and makes no auth or Jira call:

```text
/Users/hunter/code/scripts/agent/jira-qa-results-publish.sh ENVELOPE.json
```

Never add `--write` just because the user approved QA execution or the report
looks complete. Posting requires all of the following:

1. Saruman reviews the exact ADF body.
2. The user explicitly approves that exact body, target issue, Jira site/account,
   and audience.
3. Before execution, verify the selected site/account and project default
   visibility. Stop if either cannot be verified.
4. Aragorn runs one publisher invocation with the exact target and reviewed body
   digest:

   ```text
   /Users/hunter/code/scripts/agent/jira-qa-results-publish.sh ENVELOPE.json --key ISSUE-KEY --expected-digest SHA256 --write
   ```

The CLI has no site selector or machine-readable auth-status contract. Do not
claim automated tenant/audience protection. Do not switch accounts, log in, or
change configuration. The publisher makes one `acli jira workitem comment
create --key KEY --body-file FILE --json` invocation and never retries itself;
whether the CLI retries internally is unknown. Do not edit comments, upload
attachments, use multi-issue operations, or promise deduplication.

The publisher reports `cli_reported_success` only when the process exits 0 and
one valid `SUCCESS` result matches the target and counts. The response `.id` is
the issue key, not a comment ID. Report `comment_id: null` and
`comment_reference: "unknown"`; this is CLI-reported success, not independent
proof of persistence. For malformed, partial, multiple, mismatched, or nonzero
responses, report the sanitized `uncertain` result and do not retry.

There is no automated readback. Only if the user separately requests a comment
reference and read-only access is allowed may you inspect structured Jira
readback to find an unambiguous matching comment on the exact target. Never guess
the newest comment, infer a comment ID from the create response, accept
ambiguous matches, or retry a post.

## Keep the reporting boundary

- `manual-qa` owns QA execution and its evidence. This skill only formats its
  completed findings.
- `jira-qa-subtask` writes human test instructions; this skill reports completed
  results. Do not merge the two formats.
- QA approval is not publishing approval. Historical admin, token, fault, or
  data-operation evidence is not new authorization.
- Read [historical coverage](references/historical-coverage.md) only when
  interpreting related coverage patterns. It is private context, not a source
  of current-ticket facts or reusable raw ticket content.
