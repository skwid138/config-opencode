---
description: Draft pasteable production deploy-check blurbs for sprint tickets
---
Use the `release-deploy-checks` skill to draft per-ticket deploy checks for the
Confluence "Production Release" page.

If ticket keys are supplied, use them. Otherwise list the current user's sprint
tickets with the skill's script, show the selection table, and wait for the
user to confirm the selection before any research.

Output goes to chat only. Do not write to Jira or Confluence, never write to
prod, and never run the drafted checks. Route any tst/local write through the
skill's write rules.

{{$arguments}}
