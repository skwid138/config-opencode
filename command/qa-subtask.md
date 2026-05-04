---
description: >-
  Generate (and optionally push) a Jira QA subtask description. Reads parent
  ticket AC + peer corpus, renders via the vendored ADF template, previews
  by default, and on `--push` updates the existing auto-template QA subtask
  (or creates a new one with `--create`).
---
Use the `qa-subtask` skill to produce a QA subtask description for a Jira
story.

**Default behavior:** read-only preview. The skill renders the description
via `jira-qa-render.sh` and shows the plain-text preview + path to the saved
render envelope. No Jira mutation occurs unless explicitly requested.

**Push gate:** pass `--push` to mutate Jira after preview. The skill's
default mutation is to **update** the existing QA subtask the team's
automation creates under every story (discovered via
`jira-find-qa-subtask.sh`). Use `--create` to create a new one instead, or
`--update <KEY>` to target a specific subtask explicitly.

**Common invocations:**
- `/qa-subtask BIXB-16803` — preview only
- `/qa-subtask BIXB-16803 --push` — preview, then update the existing QA
  subtask (or stop and prompt if none / multiple / already filled)
- `/qa-subtask BIXB-16803 --push --create` — preview, then create a brand
  new QA subtask (skipping discovery)
- `/qa-subtask BIXB-16803 --push --update BIXB-19719` — preview, then
  update the named QA subtask explicitly
- `/qa-subtask BIXB-16803 --push --force` — overwrite an already-filled QA
  subtask description (use sparingly)
- `/qa-subtask BIXB-16803 --no-scope --no-input` — drop SCOPE + INPUT rows
- `/qa-subtask BIXB-16803 --keep-helpers` — retain the right-column italic
  helper text (default is to drop it, matching peer corpus)
- `/qa-subtask` — auto-detect ticket ID from the current branch

**Flag passthrough to the skill:**
- `--env <code>` — target env: `dev` or `tst` (default `tst`)
- `--client <id>` — suggested test client ID for SOURCE url
- `--samples <n>` — peer QA subtasks to sample for style (default 5)
- `--pr <number>` — implementing PR (otherwise auto-detect from branch)
- `--no-scope` / `--no-input` — drop the corresponding rows
- `--keep-helpers` — keep right-column italic helper text
- `--push` — mutate Jira after preview (update default; see `--create`)
- `--create` — force the create path even if an existing QA subtask is
  found. Implies `--push`.
- `--update <KEY>` — skip discovery and update the named QA subtask.
  Implies `--push`.
- `--force` — pass through to `jira-update-subtask.sh --force`, allowing
  overwrite of a non-template (filled) description.

Stay read-only by default. Only mutate Jira when `--push` (or `--create` /
`--update`) is present. When `--push` is on but discovery is ambiguous
(filled subtask, multiple candidates, none found), STOP and ask the user
before proceeding.

{{$arguments}}
