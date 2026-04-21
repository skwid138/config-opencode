---
description: Fetch a Jira ticket, explore relevant codebases, and produce a comprehensive implementation plan for engineer review
---
Use the `ticket-plan` skill to create an implementation plan for the specified
Jira ticket.

**Default behavior:** Deep analysis mode — fetch the ticket, explore the primary
and companion codebases via explorer agents, then synthesize a comprehensive plan
via the planner agent. Output the plan to chat only.

If `--quick` is specified, produce a lighter plan: skip companion codebase
exploration and output only AC breakdown, implementation steps, and risks.

If `--post-jira` is specified, also post the plan as a comment on the Jira
ticket after displaying it in chat.

**Ticket detection:** If no ticket ID is provided, auto-detect from the current
branch name. If a ticket ID or URL is provided as an argument, use that instead.

Stay read-only throughout. Do not modify code or create files — only produce
the plan.

{{$arguments}}
