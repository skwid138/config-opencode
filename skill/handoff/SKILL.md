---
name: handoff
description: Compact conversation into a handoff document for cross-session or cross-person continuity.
---

# Handoff

Use this skill when the user wants a concise handoff for a future opencode session or another person.

`compress` handles intra-session context management. Use `handoff` only when continuity needs to survive a fresh session, a different person, or a break in ownership.

Create a lightweight handoff document that captures:

- What was done.
- What's left.
- Key decisions made.
- Gotchas discovered.
- Relevant file paths, commands, PRs, tickets, or references.
- Suggested skills for the next session to invoke, if any.

Before presenting or writing a handoff, redact secrets and sensitive data: API keys, passwords, tokens, private credentials, and PII. Replace with clear placeholders such as `[REDACTED_API_KEY]`.

Include an explicit `## Suggested skills` section. If none are relevant, write `None` rather than omitting the section.

Keep the output concise and action-oriented. Prefer bullets over narrative. Do not create files unless the user explicitly asks you to write the handoff to disk.
