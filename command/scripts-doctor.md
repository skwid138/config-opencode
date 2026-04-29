---
description: Audit the local shell-scripts repos against project conventions and report issues
---

Use the `~/code/scripts/agent/scripts-doctor.sh` script to health-check the user's shell-scripts repos (`~/code/scripts` and `~/code/wpromote/scripts`) against the project's documented conventions.

## What it checks

For each repo:

- **Tooling**: `bash`, `shellcheck`, `shfmt`, `jq`, `git` (required); `gh`, `acli`, `gcloud`, `gitleaks` (recommended).
- **`/bin/bash` version**: agent scripts must stay portable to bash 3.2.
- **CI workflow**: `.github/workflows/ci.yml` exists and pins `actions/checkout`.
- **Per agent/ script**:
  - `--help` exits 0
  - Strict mode is `set -uo pipefail` (CONVENTIONS forbids `set -e` per BashFAQ/105)
  - Sources `lib/common.sh` or `lib/detect.sh` (transitive load via detect counts; both expose the `die_*` family)
  - Has a companion bats suite under `tests/<name>.bats`

The script exits 1 if any check fails; 0 otherwise.

## Workflow

1. **Run**: Execute `~/code/scripts/agent/scripts-doctor.sh --json` and parse the JSON output. Top-level keys: `version`, `ok`, `summary` (`pass`/`fail`/`warn` counts), `checks` (array of `{repo, name, status, detail}`).

2. **Report**: Present a clear summary grouped by repo. For each repo:
   - Show pass/fail/warn counts.
   - List every `fail` and `warn` with its `name` and `detail` field. Skip `pass` entries unless the user asks for the full report — the goal is signal, not noise.

3. **Triage**: For each failing check, classify it:
   - **Convention violation** (e.g. `set -e` present, missing strict mode) → quick mechanical fix; reference `~/code/scripts/docs/CONVENTIONS.md`.
   - **Missing artifact** (no bats suite, no CI workflow, missing checkout pin) → may be intentional in early scaffolding; flag and ask.
   - **Tooling gap** (required tool missing) → install via `brew` (macOS) or `apt` (Linux); never auto-install without approval.

4. **Recommend, don't auto-fix**: For each failure, suggest the specific change (filename, line area, what to replace with what), but do NOT edit files unprompted. The doctor is diagnostic; remediation is a separate explicit step.

5. **Confirm before fixing**: If the user asks you to fix the surfaced issues, do them one at a time (or as one coherent batch when the change is identical across files, e.g. a CONVENTIONS-driven `set -e` strip). Run `make check` from the relevant repo after each change. Never commit on the user's behalf.

6. **Re-verify**: After any fixes, re-run `~/code/scripts/agent/scripts-doctor.sh` (text mode for human readability) and confirm the failure is gone.

## Rules

- Run the script, do not reimplement its logic in the prompt.
- Warns are informational (e.g. "gitleaks not installed locally"); do not treat them as failures unless the user wants stricter posture.
- When the doctor reports a check as failing for a script that the user is actively working on, prefer fixing it in the same commit as their feature work; otherwise propose a standalone hygiene commit.
- If the doctor itself fails to run (e.g., `--repo` path missing, jq missing), report the error verbatim and stop.
- The doctor is read-only by design — it does not modify any files.

{{$arguments}}
