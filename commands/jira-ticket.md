---
description: Fetch a Jira ticket and display a structured summary or estimate
---
Fetch the Jira ticket provided in the arguments using the `jira-ticket` skill.

Display the ticket in **summary mode** by default: business value, acceptance
criteria, technical notes, comments, linked issues, and attachments.

If the user asks for scope or estimation, use the skill's estimation mode. If the
user asks to implement, build, plan implementation, or write tests, route to
`jira-plan`, `tdd`, or Aragorn instead of expanding this command's scope.

{{$arguments}}
