---
description: Preview implementation details for a Jira ticket and optionally request a gated Jira comment
---
Use the `jira-enhance` skill in **impl-plan** mode.

Analyze the acceptance criteria for the specified Jira ticket (or auto-detect
from branch name), explore relevant codebases, and generate implementation
details that supplement "Implementation Details & Additional Resources."

**Default behavior:** preview in chat only.

**Post gate:** pass `--post` to request a Jira comment. The generated comment
body must be reviewed by Saruman, approved by the user, and posted by Aragorn.

{{$arguments}}
