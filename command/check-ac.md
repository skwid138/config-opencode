---
description: Check if code changes satisfy the Jira ticket acceptance criteria
---
Use the pr-review skill in **ac-compliance** mode only.

Compare the current branch's diff from main against the acceptance criteria in the Jira ticket. Auto-detect the ticket ID from the branch name unless one is provided.

Output the AC compliance matrix showing which criteria are met, partial, or missing.

{{$arguments}}
