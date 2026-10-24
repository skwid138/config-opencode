---
description: Review code changes from main for quality, security, and Jira AC compliance
---
Use the pr-review skill to review the current branch's code changes.

Run in **full** mode by default — code quality analysis plus acceptance criteria compliance check. If the user specifies "code only" or "ac only" in arguments, use the corresponding mode.

Auto-detect the Jira ticket ID from the branch name unless a ticket ID is provided in the arguments.

{{$arguments}}
