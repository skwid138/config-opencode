---
description: >-
  Prepare a structured report and local Jira ADF preview from completed manual
  QA evidence. Does not execute QA or post by default.
---

Use the `jira-qa-results` skill to format completed manual QA evidence as a
versioned Jira ADF preview. This is a report, not QA execution or sign-off.

The default flow builds and reviews a local preview only. It does not fetch Jira
context, post comments, or upload attachments. Any future posting requires
Saruman review and explicit user approval of the exact body, target,
site/account, and audience; stop if site/account and project visibility cannot
be verified.

Common invocations:

- `/jira-qa-results` — format completed QA evidence from the current context.
- `/jira-qa-results BIXB-12345` — prepare a report for the supplied target key;
  provide the distinct parent story key and summary if they are not in context.

{{$arguments}}
