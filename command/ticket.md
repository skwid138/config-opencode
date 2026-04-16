---
description: Fetch a Jira ticket and display a structured summary with acceptance criteria, technical details, and context
---
Fetch the Jira ticket provided in the arguments using the jira-ticket skill.

Display the ticket in **summary mode** — show the full structured summary including business value, acceptance criteria, technical notes, comments, linked issues, and attachments.

If the user included extra context like "estimate", "implement", or "test" alongside the ticket ID, use the appropriate output mode from the skill instead.

{{$arguments}}
