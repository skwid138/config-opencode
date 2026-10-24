# Wpromote Manual QA Reference

Read this file only for Wpromote web/client-portal QA. The generic workflow and
safety gates in `../SKILL.md` still apply.

## Current environment context

Treat `instruction/wpromote-context.md` as the source of truth for repository
topology, service relationships, and current URLs. It is conditionally loaded
when working under `~/code/wpromote/`. Do not reconstruct or copy its canonical
tables into a test plan.

- `https://polarisiq.local` is an observed client-portal example. Verify the
  current URL from loaded context or the running environment.
- `polaris-web`, `client-portal`, and `polaris-api` are distinct targets. Do not
  treat a frontend and the API as interchangeable.
- Use absolute paths or `$HOME` in commands.

Use the `chrome-devtools` skill for Chrome connection, authentication, and URL
opening. It owns `/Users/hunter/code/scripts/agent/chrome_mcp.sh --check` and
`--url`; do not duplicate or alter that protocol here.

If a local Wpromote URL is unavailable, suggest that the user run `wp dev up`.
Do not run it, restart services, repair certificates, or alter the environment as
part of QA.

## Story and QA-subtask discovery

Fetch a story or directly supplied subtask with:

```text
/Users/hunter/code/scripts/agent/jira-fetch-ticket.sh --all --json-fields <KEY>
```

When the supplied key is a subtask, read `.fields.parent.key`, fetch the parent,
and derive ACs from the parent story. If the parent is missing, ask for it rather
than testing only the subtask.

For a supplied parent story, perform one QA-subtask discovery call:

```text
/Users/hunter/code/wpromote/scripts/agent/jira-find-qa-subtask.sh --parent <STORY>
```

- One result: use its existing QA instructions as additional input.
- Multiple results: list them and ask which one applies.
- No results: say that no QA subtask was found and continue from parent ACs.
- Script failure: surface the error. Do not fall back to raw Jira mutation or
  create a subtask.

The parent ACs remain authoritative for coverage. QA instructions may add setup
or probes but cannot remove ACs. `manual-qa` consumes QA subtasks; it never calls
their render, update, or create paths.

Outside Wpromote, do not depend on the private discovery script. Use explicit
Jira links or keys available in the user's context.

## Client data and feature gates

`C13420297` is a user-provided candidate for real-data client testing. It is not
guaranteed to exist, be safe to mutate, expose every required state, or remain
the right client. Verify it in the target environment and include its actual
coverage limits in the approved test plan.

`dsa_metrics` is a user-reported route-gating example. Verify the applicable
flag and route in the current code and environment. A 404 may indicate a gate,
wrong app, wrong URL, or another precondition; it is not evidence of expected
feature behavior by itself. Never toggle a blocked flag automatically.

When a required state is absent:

- use `Blocked by data` when application data is specifically unavailable;
- use `Inconclusive` with the explicit blocked reason for an unresolved gate,
  target, auth, or evidence problem;
- propose safe alternative data, a human check, or unit/integration coverage;
- do not seed data, change a flag, switch clients without approval, or pass the
  criterion silently.

## Implementation-aware checks

Map the current branch/PR across the relevant repositories before testing. Name
the frontend route and state, the actual backend endpoint behavior, selectors,
feature gates, and any changed files that alter observability. Current code and
loaded Wpromote context override examples in this reference.
