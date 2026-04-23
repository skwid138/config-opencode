---
description: >-
  Hunt for bugs that tests miss — null dereferences, type-reality mismatches,
  guard gaps, and unhandled edge cases at system boundaries. Requires a scope
  argument (file, directory, feature name, or api:sliceName).
---
Use the `bug-hunter` skill to scan the specified scope for defensive coding gaps.

**Default behavior:** Quick Scan mode — broad sweep for obvious gaps across the
scoped files. Traces data flow from API boundaries through transforms into
consumers, looking for unguarded access patterns.

**Modes:**
- Default (no flag): Quick Scan — broad, shallow
- `--mode boundary`: Boundary Audit — focused on API transform completeness
- `--mode trace`: Deep Trace — fewer findings, strongest proof chains

**Scope is required.** Examples:
- `/bug-hunt src/features/creativeAudit/` — scan a feature directory
- `/bug-hunt src/components/Table.tsx` — deep trace on a single file
- `/bug-hunt --mode boundary api:creativeAudit` — audit an API slice
- `/bug-hunt --mode trace TagsTable` — trace a component's data sources
- `/bug-hunt --scope diff` — scan files changed from main

Stay read-only throughout. Do not modify code — only analyze and report findings
with proof chains, fix suggestions, and test suggestions.

{{$arguments}}
