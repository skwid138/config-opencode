---
description: >-
  Generate a Jira QA subtask description. Reads parent ticket AC + peer corpus,
  renders via the vendored ADF template, previews by default with a local render
  envelope, and gates any Jira mutation through Saruman review, user approval,
  and Aragorn execution.
---
Use the `jira-qa-subtask` skill to produce a QA subtask description for a Jira
story.

**Default behavior:** preview. The skill renders the description via
`jira-qa-render.sh` and shows the plain-text preview + path to the saved local
render envelope. No Jira mutation occurs unless explicitly requested.

**Push gate:** pass `--push`, `--create`, or `--update <KEY>` to request a Jira
mutation after preview. Saruman reviews the exact body, the user approves, and
Aragorn runs the update/create script.

**Common invocations:**
- `/jira-qa-subtask BIXB-16803` — preview only
- `/jira-qa-subtask BIXB-16803 --push` — preview, then request update of the existing QA
  subtask (or stop and prompt if none / multiple / already filled)
- `/jira-qa-subtask BIXB-16803 --push --create` — preview, then request creation of a brand
  new QA subtask (skipping discovery)
- `/jira-qa-subtask BIXB-16803 --push --update BIXB-19719` — preview, then
  request update of the named QA subtask explicitly
- `/jira-qa-subtask BIXB-16803 --push --force` — request overwrite of an already-filled QA
  subtask description (use sparingly)
- `/jira-qa-subtask BIXB-16803 --no-scope --no-input` — drop SCOPE + INPUT rows
- `/jira-qa-subtask BIXB-16803 --keep-helpers` — retain the right-column italic
  helper text (default is to drop it, matching peer corpus)
- `/jira-qa-subtask` — auto-detect ticket ID from the current branch

**Flag passthrough to the skill:**
- `--env <code>` — target env: `dev` or `tst` (default `tst`)
- `--client <id>` — suggested test client ID for SOURCE url
- `--samples <n>` — peer QA subtasks to sample for style (default 5)
- `--pr <number>` — implementing PR (otherwise auto-detect from branch)
- `--no-scope` / `--no-input` — drop the corresponding rows
- `--keep-helpers` — keep right-column italic helper text
- `--push` — request a gated Jira update after preview (update default; see `--create`)
- `--create` — request the gated create path even if an existing QA subtask is
  found. Implies `--push`.
- `--update <KEY>` — request a gated update of the named QA subtask.
  Implies `--push`.
- `--force` — pass through to `jira-update-subtask.sh --force`, allowing
  overwrite of a non-template (filled) description.

No Jira mutation occurs by default. Preview writes a local render envelope. Only
mutate Jira when `--push` (or `--create` / `--update`) is present and Saruman +
the user have approved. When discovery is ambiguous (filled subtask, multiple
candidates, none found), STOP and ask before proceeding.

{{$arguments}}
