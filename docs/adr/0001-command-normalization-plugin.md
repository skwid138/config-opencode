# Canonicalize bash commands via plugin instead of enumerating path-form permission rules

## Status

accepted

## Context

opencode normalizes permission **patterns** and **commands** asymmetrically. As
observed in opencode v1.15.13 source, config patterns are expanded at load time
(`~/`, `~`, `$HOME/`, `$HOME` → absolute home path; `permission/index.ts:280-296`),
but bash commands are matched against their raw, pre-shell-expansion source text
(`tool/shell.ts:122-124, 403-405`). A tilde-form allow
rule therefore can never match a tilde-form command, and the only config-only workaround
is an unsafe leading-wildcard substring rule (e.g. `*foo.sh*`) that over-permits compound
commands like `bash -c "rm -rf ~ ; foo.sh"`.

## Decision

Normalize the command, don't enumerate the patterns. A local plugin registered from
`./plugins/src/permission-canonicalizer.ts` hooks `tool.execute.before` for `tool ===
"bash"` and mutates `output.args.command` in place before opencode matches it. The
plugin rewrites command-node `argv0` values to canonical absolute form so commands
converge on the same absolute form config patterns already expand to. Anchored-absolute
allow rules then match without any wildcard substring rules.

By default, only four home forms expand, and only when they appear as `argv0` at the
start of a command node: `~`, `~/...`, `$HOME`, and `$HOME/...` →
`/Users/hunter/...`. `${HOME}` and `${HOME}/...` are opt-in via
`expandBraceHome: true`; the current `opencode.jsonc` registration does not set that
option, so brace-form HOME is not expanded. The plugin never expands home forms in
argument position.

Command nodes are split at argv0-start delimiters `&&`, `||`, `|`, `|&`, `;`, `&`, and
newlines, respecting quotes. The plugin returns the original command unchanged on
global uncertainty: unbalanced quotes, `<<` heredoc text, `$((`, `$(`, backticks, `<(`,
or `>(`. It also returns the original command unchanged when any segment has a leading
`(` or `{`, a leading quote, a leading `WORD=` environment assignment, quotes inside
`argv0`, or `..` inside `argv0` while roots are configured.

The current registration sets `roots` to `~/code/scripts/agent` and
`~/code/wpromote/scripts/agent`. Roots are a blast-radius limiter: when an expanded
`argv0` is not under any configured root, that segment is left unchanged. Roots are
normalized through the same home-expansion rules and rejected if the normalized value is
not absolute or contains `..`; malformed plugin options disable the plugin.

## Considered options

- **Config codegen / regex authoring → many glob variants** (rejected): plugins cannot
  inject or modify permission rules at runtime (no registry API; the ruleset is static and
  compiled once), so this could only be a static config-generation step — and it still
  cannot match a raw tilde command without the unsafe leading-wildcard form.
- **Broad `bash` allow + plugin blocks dangerous commands** (rejected): fails open if the
  plugin fails to load.

## Consequences

- The plugin must be **execution-equivalent** (only ever rewrite to the path the shell
  would itself produce) and must preserve deny-side parity: any load failure,
  uncertainty, malformed option, or out-of-root `argv0` leaves the original command
  unchanged for the normal configured permission rules to allow, deny, or ask. The
  plugin never makes a command more permissive than its raw form would be because
  opencode expands deny patterns the same way it expands allow patterns.
- The plugin writes an audit side effect independently of canonicalization: one NDJSON
  record per command node is appended to the default audit log
  `/Users/hunter/.local/share/opencode/permission-audit-plugin/audit.log`; debug messages
  go to `/Users/hunter/.local/share/opencode/permission-audit-plugin/debug.log`. Append
  failures are caught and logged to debug when possible, and debug-write failures are
  swallowed, so audit logging cannot change the canonicalized command returned to
  opencode.
- A future opencode that wires the `permission.ask` hook (observed as declared but
  unwired in opencode v1.15.13; upstream #7006) would offer a cleaner mechanism;
  this `tool.execute.before` approach should be revisited if that lands.
