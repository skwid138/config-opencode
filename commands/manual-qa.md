---
description: Run evidence-based browser QA against Jira ACs with an approved agent/human split
---
Use the `manual-qa` skill to verify a running web app against the supplied Jira
story or QA subtask.

Before any browser test execution, show the complete test plan, target
environment/data, application side effects and cleanup, coverage limits, and
agent-versus-human split. Wait for explicit user approval.

Do not fix defects inline, edit files, mutate Jira, change flags, seed data,
restart services, or bypass permissions. Stop for production, unknown, or
destructive application side effects and offer a safer test path.

{{$arguments}}
