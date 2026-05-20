# Council Permission Fix + Permission Tuning

**Date:** 2026-05-20  
**Status:** Approved (Saruman v3)  
**Scope:** `plugins/council-tool.ts`, `plugins/package.json`, `opencode.json`

## Problem

Council plugin child sessions hit `ask` for bash permission prompts → TUI hangs (prompt appears but is non-functional for plugin-created sessions). Additionally, agents hallucinate the wrong script path (`/Users/hunter/code/scripts/agent/auto-ticket-context.sh` instead of correct `/Users/hunter/code/wpromote/scripts/agent/auto-ticket-context.sh`), triggering unnecessary prompts.

## Part 1: V2 SDK Permission Injection (`council-tool.ts` + `plugins/package.json`)

**Goal:** Prevent council child sessions from ever hitting `ask`. Councillors keep full bash access for known-safe commands; unknown commands get denied (fail fast) instead of prompting.

### Steps

1. Add `@opencode-ai/sdk` as explicit dependency in `plugins/package.json` (pin to same version as transitive dep to avoid skew)
2. Pass a test permission ruleset to `session.create()` body via type assertion on existing `ctx.client`:
   ```ts
   permission: [
     { permission: "bash", pattern: "echo *", action: "allow" },
     { permission: "bash", pattern: "*", action: "deny" }
   ]
   ```
3. **Manual test checkpoint:** With the test ruleset from step 2, run `echo hello` (should succeed OR be denied — this empirically reveals within-ruleset precedence) and `ls` (should be denied, NOT asked). This verifies:
   - (a) Server accepts the `permission` field on `session.create()`
   - (b) Within-ruleset precedence semantics (first-match vs last-match)
   - (c) Catch-all deny prevents `ask` (no hang)
   
   **If server ignores field:** Try `PATCH /session/{id}` to set permissions post-creation (endpoint exists per merged PR #22070). If that also fails, escalate to user with findings.

4. Build a `PermissionRuleset` at plugin init by reading `~/.config/opencode/opencode.json`:
   - Extract `permission.bash` map → convert each `{pattern: action}` to `PermissionRule`
   - **Filter out entries where action is `"ask"`** (would reintroduce hangs)
   - Extract `permission.external_directory` map → convert to `PermissionRule` entries with `permission: "external_directory"`
   - Append catch-all `{ permission: "bash", pattern: "*", action: "deny" }` as final rule
5. Pass `permission: builtRuleset` to `session.create()` body for all child sessions
6. Use hardcoded config path `~/.config/opencode/opencode.json` (NOT `ctx.directory`)

**Accepted limitation:** Reads only global config, not project-level merges. Acceptable because this is a personal config tool, not a distributed package.

**Merge semantics:** Server merges `agent.permission + session.permission`. The session-level catch-all deny means council children can only run bash commands explicitly allowed in the session ruleset. Councillors get a generous allow-list (same commands solo Saruman gets via global config) but unknown/unvetted commands fail fast instead of hanging.

## Part 2: Global Permission Additions (`opencode.json`)

Add to `permission.bash`:

```json
"python3 -c *": "allow",
"python3 - *": "allow",
"python3 -": "allow",
"sed -i*": "deny",
"sed -i *": "deny",
"sed *": "allow",
"sqlite3 *": "allow",
"npx tsc*": "allow",
"npm test*": "allow",
"/Users/hunter/code/scripts/agent/auto-ticket-context.sh*": "deny"
```

The last entry denies the wrong/hallucinated path so calls fail fast instead of prompting.

## Key Architecture Facts

- `PermissionRuleset = Array<{ permission: string; pattern: string; action: "allow" | "deny" | "ask" }>`
- Server merges `agent.permission + session.permission` — last-match-wins for merge order between levels
- Within-ruleset precedence: empirically determined by step 3 test
- Legacy SDK (`@opencode-ai/plugin`) types don't declare `permission` on `session.create()` but v2 SDK does
- Line 316 of `council-tool.ts` already uses `as` type assertion — same pattern works for adding `permission` to body
- `ctx.client` is the legacy SDK client; the HTTP endpoint is the same regardless of SDK version
- Plugin context: `{ client, project, directory, worktree, serverUrl, $ }`

## Files Modified

- `plugins/council-tool.ts` — add permission ruleset building + pass to session.create()
- `plugins/package.json` — add `@opencode-ai/sdk` explicit dep
- `opencode.json` — add new bash permission rules

## Verification

- Council tool invocation should no longer produce permission prompts for known-safe commands
- Unknown commands should be denied (error returned to model) not asked
- Solo Saruman via `task` tool should continue working as before (unaffected)
- Councillors should still be able to: read files, grep, glob, run allowed scripts, git read commands
