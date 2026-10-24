---
description: Structure gathered context into a plan document (at .project-plans/ if it exists, otherwise repo root)
---

Load the `plan-author` skill and use it to structure already-gathered,
reviewed, and approved context into a plan document. If the plan content has not
yet gone through Saruman review and user approval, draft it in chat first and do
not write a file yet.

If an argument is provided, use it as the plan slug (filename identifier). Otherwise, derive a slug from the goal/topic.

Example: `/plan-author config-mcp-scoping`

{{$arguments}}
