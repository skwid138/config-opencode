---
name: qa-subtask
description: >-
  Generate a concise QA subtask description for a Jira story by analyzing the
  story's acceptance criteria, the implementing PR/code, and the team's
  established QA subtask pattern. Use this skill when a user asks to "write QA
  steps", "create a QA subtask", "draft QA instructions", "QA description for
  BIXB-XXXX", "what should QA test", "pare down my QA notes", or any request to
  produce QA test instructions for a ticket — even if they don't explicitly say
  "QA subtask." Output is a ready-to-paste subtask description matching the
  team's existing format. Defaults to read-only preview; pass `--push` to
  create the subtask in Jira via the vendored render + create scripts.
---

# QA Subtask Generator

Produce concise, scannable QA subtask descriptions that match the team's
established pattern. The skill reads peer QA subtasks to learn the house style,
then applies that style to the target story.

Peer QA tickets are the spec — the shape of a good QA subtask is whatever the
team's recently-shipped subtasks look like, not a generic template. Always
sample the corpus before writing.

## When to use this skill

- "Write a QA subtask for BIXB-16803"
- "Create QA steps for this ticket"
- "Pare down these QA notes to match our pattern"
- "Draft the QA description"
- "What should the QA tester verify?"

Do **not** use this skill to:
- Audit AC quality (use `jira-enhance` ac-audit mode)
- Generate implementation plans (use `jira-enhance` impl-plan or `ticket-plan`)
- Review PR code (use `pr-review`)
- Run QA itself (no automation; this is a human handoff document)

## Input parsing

| Input | Example | Handling |
|-------|---------|---------|
| Ticket ID | `BIXB-16803` | Use directly as the parent story |
| URL | `https://wpromote.atlassian.net/browse/BIXB-16803` | Extract ID |
| No argument | (none) | Detect from current branch via `~/code/scripts/agent/branch-to-ticket.sh` |
| User-provided draft | Verbose existing notes | Treat as input to pare down, but still re-derive from AC |

Optional flags:

| Flag | Purpose |
|------|---------|
| `--env <code>` | Target env code: `dev` or `tst` (default: `tst`). Resolves to a real URL via `gcp-project-map.sh --url <env> <service>` based on the parent ticket's component. `prd` should not appear in QA subtasks. |
| `--client <id>` | Suggested test client ID for SOURCE url |
| `--samples <n>` | How many peer QA subtasks to sample for style (default: 5) |
| `--pr <number>` | PR number for the implementation (otherwise auto-detect from branch) |
| `--no-scope` | Drop the `SCOPE:` row from the output (passes through to renderer) |
| `--no-input` | Drop the `INPUT DATA/EXPECTED OUTPUT` row from the output |
| `--keep-helpers` | Keep the right-column italic helper text in each row (default is to drop it, matching peer corpus) |
| `--push` | After generating, create the subtask in Jira via `jira-create-subtask.sh` instead of stopping at preview. Without this flag, the skill **previews and asks** before any mutation. |

### Resolving the SOURCE base URL

Do NOT hardcode hostnames. Pick the correct **service key** from the parent
ticket's Jira **Component**, then resolve via `gcp-project-map.sh --url`
(documented in the always-loaded codebase-map instructions):

| Jira Component | Service key |
|---|---|
| Web App | `polaris-web` |
| Client Portal | `client-portal` |
| API | `polaris-api` |

If the ticket has no component or has multiple, ask the user which one the
QA tester should target before resolving the URL.

## Preflight

1. Verify `~/code/scripts/agent/jira-fetch-ticket.sh --help` runs (the wrapper
   handles its own dependency checks for `acli` and `jq`).
2. Verify `gh` is available if a PR will be examined.
3. If preflight fails, warn and proceed with whatever context is available.

## Workflow

### Phase 1: Gather story context

1. Fetch the parent story via the standard wrapper script (NOT raw `acli`):
   ```bash
   ~/code/scripts/agent/jira-fetch-ticket.sh <TICKET-ID>
   ```
   This returns structured JSON with title, description, AC, status, type,
   labels, components, and parent linkage. If you need richer context, the
   `jira-ticket` skill wraps this same script with summary/estimation modes —
   delegate to it rather than re-implementing.
2. Extract:
   - **Title** (used to derive QA subtask summary)
   - **Acceptance Criteria** (verbatim, numbered)
   - **Description scope/context** (what feature area)
   - **Components** (drives the SOURCE base URL — see "Resolving the SOURCE
     base URL" above)
3. If AC are vague, missing, or marked as boilerplate placeholder text (e.g.
   `*Defines the boundaries...`), stop and warn the user that AC need to be
   filled in first — do not invent AC.

### Phase 2: Sample peer QA subtasks for house style

Find recent QA subtasks the team has actually written and shipped. Derive the
Jira **project key from the parent ticket ID** (e.g. `BIXB-16803` → `BIXB`).
Do NOT hardcode `BIXB` — other Wpromote projects exist (e.g. `WPRO`, `OPS`).

```bash
PROJECT="${TICKET_ID%-*}"  # e.g. BIXB
acli jira workitem search \
  --jql "project = ${PROJECT} AND summary ~ \"QA |\" AND status in (\"Done\", \"Ready for Release\") ORDER BY updated DESC" \
  --fields summary --json | jq '.[].key' | head -<n>
```

If that JQL returns zero results, broaden the filter before falling back to
the standard skeleton:

```bash
# Fallback 1: drop the status filter (may include in-flight QA tickets).
acli jira workitem search \
  --jql "project = ${PROJECT} AND summary ~ \"QA |\" ORDER BY updated DESC" ...

# Fallback 2: drop the "QA |" prefix and search by issuetype.
acli jira workitem search \
  --jql "project = ${PROJECT} AND issuetype = QA ORDER BY updated DESC" ...
```

(Raw `acli` is correct here — `jira-fetch-ticket.sh` does not wrap JQL search,
only single-ticket fetches.)

For each sampled key, fetch the description through the wrapper:

```bash
~/code/scripts/agent/jira-fetch-ticket.sh <SAMPLE-KEY>
```

**Filter out boilerplate-only descriptions** (those whose body matches the
unfilled template — `*Helps to determine...`, `*Defines the boundaries...`).
Only keep subtasks whose author actually wrote real content.

From the surviving samples, observe:

- **Section headers used** (e.g. `ACCEPTANCE CRITERIA:`, `SOURCE:`,
  `TEST STEPS TO VERIFY:`, `ADDITIONAL NOTES/ATTACHMENTS:`)
- **Section ordering**
- **AC formatting** — numbered single line vs. multi-line block
- **Step formatting** — numbered vs. test-grouped (Test 1, Test 2…)
- **SOURCE format** — direct URL only, or labeled URLs
- **Tone** — terse imperative ("Click X. Verify Y.") vs. prose
- **Length** — how many steps the median subtask has
- **What gets cut** — peer subtasks rarely include "Goal:", "Expected
  result:", emoji, ❌/✅ markers, sanity questions

If samples diverge in style, prefer the most recent ones and the ones that
share the same feature area (e.g., other GP subtasks for a GP story).

### Phase 3: Gather implementation context (optional but recommended)

1. **Find the implementing PR** by ticket ID:
   ```bash
   gh pr list --search "<TICKET-ID>" --state all --json number,title,url,headRefName
   ```
2. Read the PR diff to understand what actually changed in the UI/behavior.
   This protects against writing QA steps for the AC's intent that don't
   match what was implemented.
3. If the PR introduced **side-effects beyond the AC** (e.g., changing a
   default value cascades into a slider position change), note them as
   regression-style steps or as a single line in `ADDITIONAL NOTES`.
4. Identify the **route/page** the user must navigate to. Search the codebase
   for the relevant route definition rather than guessing.

### Phase 4: Generate the QA description (render via script)

The team's QA subtasks live in Jira as ADF tables (Atlassian Document Format),
not plain text. Hand-rolling ADF in the model is brittle and lossy. Use the
**vendored renderer**:

```bash
~/code/wpromote/scripts/agent/jira-qa-render.sh \
  --ac-file <path-to-ac.txt> \
  --source <resolved-source-url> \
  --steps-file <path-to-steps.txt> \
  [--notes-file <path-to-notes.txt>] \
  [--no-scope] [--no-input] [--keep-helpers] \
  --format both
```

The script returns a JSON envelope `{version:1, adf:{...}, text:"..."}`:
- `.adf` is the ADF document Jira expects.
- `.text` is a plain-text rendering you can show the user as a preview.

Inputs you produce as the model:
- **AC content**: extract numbered AC verbatim from the parent (one per line).
- **Steps content**: distilled per Phase 5 calibration (one step per line; the
  renderer numbers them automatically).
- **Notes content** (optional): 1–3 short bullets for gotchas/prerequisites.
- **Source URL**: resolved per "Resolving the SOURCE base URL".

Defaults match the peer corpus (BIXB-19719 shape): all 6 rows kept, helper
italic column dropped. Pass `--no-scope --no-input` only if the parent ticket
type or peer samples justify dropping those rows.

Save the renderer's output to a temp file — the next phases read it.

**Suggested QA subtask summary:**

```
QA | <prefix from parent if present, e.g. GP, B, C, D, Taxo> | <short title>
```

Mirror the parent story's prefix convention.

### Phase 5: Calibrate detail

Use this checklist before finalizing:

- [ ] Each test step is a single imperative sentence ("Click X." "Verify Y.")
- [ ] No "Goal:" / "Expected result:" framing unless peer samples use it
- [ ] No emoji unless peer samples use them
- [ ] Pre-test setup is folded into SOURCE + the first step, not its own block
- [ ] UX-feel / "does this look right" prompts go in ADDITIONAL NOTES, not as
      tests with pass/fail criteria
- [ ] Regression checks (existing data not affected) included if the change
      modifies defaults, schemas, or shared state
- [ ] Total length is in the same ballpark as peer median (typically 5–15
      steps; not 30+)
- [ ] Feature-flag, permission, or test-data prerequisites are surfaced
- [ ] Route URL in SOURCE is verified against codebase, not guessed

### Phase 6: Preview

Show the user:

1. **Suggested subtask summary** (one line)
2. **Plain-text preview** — the `.text` field from the renderer envelope, in
   a fenced code block so the user can read the full structure
3. **What changed from the user's draft** (if a draft was provided) — a short
   table mapping verbose → pared-down so the user can sanity-check the
   compression
4. **Path to the saved render envelope** (e.g. `/tmp/qa-render-BIXB-XXXXX.json`)
   so subsequent calls can re-use it

### Phase 7: Push (gated)

If `--push` was passed, create the subtask:

```bash
~/code/wpromote/scripts/agent/jira-create-subtask.sh \
  --parent <PARENT-KEY> \
  --summary "<suggested summary>" \
  --description-file <render-envelope-path>
```

Returns `{version:1, ticket_id:"BIXB-XXXX", url:"https://..."}`. Surface the
new key + URL to the user.

If `--push` was **not** passed, stop after Phase 6. Do not call the create
script. The user can either:
- Paste the preview into Jira manually, or
- Confirm and ask the skill to push, which then runs the create script.

Before calling `jira-create-subtask.sh`, optionally dry-run first:

```bash
~/code/wpromote/scripts/agent/jira-create-subtask.sh \
  --parent <PARENT-KEY> --summary "..." \
  --description-file <envelope> --dry-run
```

This is useful when the skill is uncertain about the parent key, project, or
issue type.

## Output format

````markdown
## Suggested QA subtask

**Summary:** `QA | <prefix> | <short title>`

**Preview** (from `jira-qa-render.sh --format both`):

```
ACCEPTANCE CRITERIA:
1. ...
2. ...

SOURCE:
https://<env>/client/<id>/<path>

TEST STEPS TO VERIFY:
1. ...
2. ...

ADDITIONAL NOTES/ATTACHMENTS:
- ...
```

**Render envelope:** `/tmp/qa-render-<TICKET>.json` (contains both ADF + text)

### What changed from the draft (if applicable)

| Original | Pared-down |
|---|---|
| ... | ... |

### Next step

Without `--push`: paste the preview into a new QA subtask in Jira manually,
or re-invoke with `--push` to create it via `jira-create-subtask.sh`.

With `--push`: subtask created at <url>.
````

## Guardrails

- **Mutation is opt-in.** Without `--push`, the skill is read-only: it
  produces a preview + render envelope and stops. The push step requires
  explicit confirmation, either via the `--push` flag or a follow-up "yes,
  push it" from the user.
- **Never invent AC.** If the parent ticket's AC are missing or boilerplate,
  warn the user and stop. AC quality is a `jira-enhance` problem, not a QA
  generation problem.
- **Never invent routes or selectors.** Verify the route in the codebase. If
  uncertain, say so and ask the user to confirm.
- **Style follows the corpus.** Do not impose a personal preference for
  emoji, "Goal:" framing, or verbose explanation. Whatever the team is
  actually shipping is the spec.
- **Cut, don't pad.** A QA subtask that's shorter than the user's draft is
  almost always better. Resist the urge to add "thoroughness" — peer QA
  testers know the app.
- **Surface side-effects, not feelings.** If the implementation changes
  something the AC doesn't mention (e.g. slider position scales), include it
  as a note. Subjective UX impressions are not pass/fail tests.
- **Render through the script.** Do not hand-write ADF JSON in the model. The
  vendored template + `jira-qa-render.sh` are the source of truth for
  Jira-compatible output.

## Error handling

| Condition | Response |
|-----------|----------|
| `jira-fetch-ticket.sh` not available | Stop. Report `Error: ~/code/scripts/agent/jira-fetch-ticket.sh missing. Check the public scripts checkout.` |
| `acli` not authed (wrapper exits with auth error) | Stop. Surface the wrapper's error verbatim. |
| Parent ticket not found | Stop. Report missing ticket ID. |
| Parent AC are boilerplate / empty | Stop. `Error: Parent ticket AC are empty or unfilled. Run jira-enhance ac-audit first.` |
| No peer QA samples found | Try the broader JQL fallbacks (Phase 2). If still empty, warn and fall back to the standard skeleton. |
| Multiple components on parent ticket | Ask the user which component the QA subtask should target before resolving the SOURCE URL. |
| `gcp-project-map.sh --url` fails for the resolved component | Warn and leave a `<TODO: SOURCE>` placeholder. |
| PR cannot be detected | Warn, generate from AC alone. Note the limitation. |
| Codebase route lookup fails | Warn, leave SOURCE url placeholder for user to fill in. |
| `jira-qa-render.sh` exits non-zero | Surface the script's stderr; do not attempt to hand-write ADF as a fallback. |
| `jira-create-subtask.sh` exits 4 (auth) | Stop. Tell the user to run `acli auth login` and re-invoke with `--push`. |
| `jira-create-subtask.sh` exits 5 (upstream Jira error) | Stop. Surface the script's stderr verbatim. The render envelope is preserved for retry. |
