---
name: zoom-out
description: >-
  Higher-abstraction code understanding mode. Use when the user is unfamiliar
  with a code area, asks to zoom out, or needs a module/caller map in domain
  glossary terms before details.
---

# Zoom Out

When invoked, go up one layer of abstraction before answering details.

Produce a compact map of the relevant area:

- **Domain terms** — use `CONTEXT.md` glossary vocabulary when present.
- **Modules** — name the modules involved and what each is responsible for.
- **Callers** — show who calls into the area and who it calls out to.
- **Flow** — summarize the end-to-end path in domain language.
- **Seams** — note boundaries where behavior changes, data crosses systems, or adapters sit.
- **Next drill-down** — recommend the smallest file/function to inspect next.

Rules:

- Prefer module/caller relationships over line-level details.
- Translate identifiers into domain glossary terms, but keep exact paths and identifiers when cited.
- If no glossary exists, infer domain terms cautiously from code and say they are inferred.
- Do not modify files; this is a read-only orientation skill.
