---
description: Preview a Jira acceptance-criteria quality audit and optionally request a gated Jira comment
---
Use the `jira-enhance` skill in **ac-audit** mode.

Evaluate the acceptance criteria on the specified Jira ticket (or auto-detect
from branch name) for specificity, testability, completeness, and clarity.
Suggest additional AC for any gaps found.

**Default behavior:** preview in chat only.

**Post gate:** pass `--post` to request a Jira comment. The generated comment
body must be reviewed by Saruman, approved by the user, and posted by Aragorn.

{{$arguments}}
