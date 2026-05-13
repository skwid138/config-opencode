---
description: Fetch a Jira ticket, explore relevant codebases, and produce a chat-first implementation plan for review
---
Use the `jira-plan` skill to create an implementation plan for the specified
Jira ticket.

**Default behavior:** fetch the ticket via `jira-fetch-ticket.sh`, dispatch
Legolas for relevant codebase exploration, and synthesize the full plan in chat.
Do not write a plan file before Saruman review and user approval.

**Review/persistence flow:** chat plan → Saruman review → user approval →
Aragorn writes the approved plan via `plan-author` to `.project-plans/` if it
exists, otherwise to the repo root. Never commit unless the user explicitly asks.

**Jira post gate:** pass `--post` to request posting the approved plan as a Jira
comment. The comment body must be reviewed by Saruman, approved by the user, and
posted by Aragorn.

**Ticket detection:** If no ticket ID is provided, auto-detect from the current
branch name. If a ticket ID or URL is provided as an argument, use that instead.

{{$arguments}}
