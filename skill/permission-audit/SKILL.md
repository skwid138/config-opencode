---
name: permission-audit
description: >-
  Audit opencode permission decisions and recommend permission config changes.
  Use this skill whenever a user asks to "audit permissions", generate a
  "permission report", asks "what's triggering ask", wants to "review permission
  decisions", or invokes "permission-audit".
---

# Permission Audit

Audit recent opencode permission `ask` / `deny` decisions from local log files,
then present safe, evidence-backed recommendations for permission config changes.

## Executor ownership

The invoking agent runs this read-only audit workflow. The audit script is
authoritative for retrieving permission events. This skill does not edit
`opencode.json`; if the user approves recommendations, generate a config diff
for **Aragorn** to apply.

## Script

Always use the wrapper script for data retrieval:

```bash
/Users/hunter/code/scripts/agent/permission-audit.sh --json
/Users/hunter/code/scripts/agent/permission-audit.sh --start 2026-05-20 --end 2026-05-21 --json
/Users/hunter/code/scripts/agent/permission-audit.sh --action all --agent gandalf --json
```

Script interface:

```text
permission-audit.sh [--start DATE] [--end DATE] [--action ask|deny|all] [--agent AGENT] [--json|--human]
```

Defaults: today's date range, `--action ask`, JSON output. Dates use
`YYYY-MM-DD`. JSON summary reports `prompt_event_count` (one per `asking` log
record) separately from `pattern_occurrence_count` (one per `patterns` array
entry). opencode log retention is limited to about 10 files; pre-plugin agent
attribution is best effort, and v1.15.13 SQLite permission/event tables do not
recover the missing attribution.

## When to use this skill

- "audit permissions"
- "permission report"
- "what's triggering ask"
- "review permission decisions"
- "permission-audit"

## Input parsing

| Input | Example | Handling |
|-------|---------|----------|
| No arguments | `/permission-audit` | Audit today's `ask` decisions with JSON output |
| Date range | `/permission-audit --start 2026-05-20 --end 2026-05-21` | Pass dates through to the script |
| Action filter | `/permission-audit --action deny` | Pass `ask`, `deny`, or `all` through |
| Agent filter | `/permission-audit --agent aragorn` | Pass the agent filter through |

## Workflow

1. Invoke `/Users/hunter/code/scripts/agent/permission-audit.sh --json` with the
   user-specified date range and filters. If no range is specified, use the
   script default of today.
2. Parse the JSON output.
3. For each entry, assess:
   - Is the command or path read-only / safe? → recommend `allow`.
   - Is it destructive or system-affecting? → recommend keeping `ask` or `deny`.
   - Is it a hallucinated or typo path (for example, `wpromute`)? → recommend
     `deny`.
   - Is the triggering agent supposed to have this capability? Cross-check the
     agent's description and permission posture before recommending broader
     access.
4. Present a table of permission events plus recommendations and rationale.
5. If the user approves, generate the config diff for **Aragorn** to apply.
6. Remind the user that bash rules should use anchored absolute script paths;
   `@skwid138/opencode-command-normalizer` normalizes safe argv0 `~/` and
   `$HOME/` forms before opencode evaluates permissions.

## Recommendation guidance

Classify each entry conservatively:

| Signal | Recommendation |
|--------|----------------|
| Repeated read-only wrapper script or diagnostic command | `allow`, scoped to the narrowest safe pattern |
| Read-only file access that matches an agent's role | `allow` or keep inherited allow, scoped by path |
| Destructive shell command, deploy, delete, reset, schema mutation, uninstall, or force push | Keep `ask` or `deny` |
| Hallucinated path, typo path, or command that should never run | `deny` |
| Cross-agent mismatch, such as a read-only reviewer requesting writes | Keep `ask` / `deny` and flag the mismatch |

Prefer narrow rules over broad wildcards. Use counts and repeated agents as
supporting evidence, not as automatic justification for `allow`.

## Bash path normalization

opencode v1.15.13 normalizes permission **patterns** at config load time but
matches bash **command nodes** before shell expansion. Pattern-side `~/`, bare
`~`, `$HOME/`, and `$HOME` at position 0 are expanded to `/Users/hunter`; the
raw command text is not. `${HOME}` is not expanded by opencode.

Do **not** recommend both absolute and tilde bash rules. A tilde bash rule is
expanded to the same absolute pattern as the absolute rule, so it does not match
a raw `~/...` command. Prefer anchored absolute, sibling-safe script rules:

```json
"/Users/hunter/code/scripts/agent/foo.sh": "allow",
"/Users/hunter/code/scripts/agent/foo.sh *": "allow"
```

`@skwid138/opencode-command-normalizer` handles prompt reduction by
rewriting only safe argv0 home forms (`~/`, bare `~`, `$HOME/`, `$HOME`) to the
same absolute path before permission evaluation. That keeps allow and deny
patterns in lockstep and avoids unsafe `<name>.sh*` suffixes that would also
match sibling names such as `foo.sh.evil`.

## Output format

Produce a markdown report:

```markdown
## Permission Audit: <start> to <end>

**Filter:** action=<ask|deny|all>, agent=<agent or all>
**Total events:** <n>
**Unique patterns:** <n>

| # | Permission | Pattern | Matched rule | Action | Count | Agents | Recommendation |
|---|------------|---------|--------------|--------|-------|--------|----------------|
| 1 | bash | `<pattern>` | `<matched_rule>` | ask | 3 | gandalf | Add anchored absolute sibling-safe script allow — read-only wrapper |

### Recommended config changes

<Only include concrete rules after explaining the rationale. If user approval is
needed before applying, state that these are proposed diffs only.>

### Keep as ask/deny

<List destructive, suspicious, or role-mismatched entries with reasons.>
```

If the script returns no entries, report that no matching permission decisions
were found for the requested filters and date range.
