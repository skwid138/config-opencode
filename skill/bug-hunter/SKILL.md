---
name: bug-hunter
description: >-
  Read-only, evidence-based scanner for defensive coding gaps at system
  boundaries. Traces runtime data flow from API responses, storage, and external
  inputs through transforms and consumers to find null/undefined/None
  dereferences, type-reality mismatches, missing guards, and unhandled edge
  cases that unit tests and mutation testing miss. Use this skill
  whenever a user asks to "hunt for bugs", "find crashes", "check for null
  safety", "audit defensive coding", "find runtime errors", "what could crash",
  "is this code safe", "check API boundary safety", "find unguarded access",
  or any request to proactively find bugs in code that tests aren't catching
  — even if they don't explicitly say "bug hunt."
---

# Bug Hunter

Proactively find bugs that tests miss by tracing data flow from system
boundaries to crash sites. Focuses on the gap between static types or declared
contracts and runtime reality; this applies to typed and untyped languages alike.

## Executor ownership

Gandalf loads this skill for proactive bug-finding requests and coordinates the
scan. Codebase exploration is delegated to **Legolas**; the invoking agent
synthesizes the report. This skill is read-only and does not modify code. For
non-trivial work, implementation routes through Gandalf's workflow: plan →
Saruman pre-impl review → user approval → Aragorn execution → post-impl audit.

> **Core insight:** The most dangerous bugs live at system boundaries where
> external data enters the app. Type annotations and contracts describe the
> *intended* shape, but APIs, storage, files, subprocesses, environment variables,
> and user input can deliver anything. Tests use well-formed mocks or fixtures
> that match the declared interface, so the crash path is never exercised.
> Mutation testing can't help because there's no guard code to mutate — the bug
> is *missing* code. Only tracing the actual data flow from boundary to
> dereference site reveals these gaps.

> **Framework note:** Examples use TypeScript/React for concreteness, but the
> methodology applies to any language with system boundaries — Python (`requests`,
> SQLAlchemy), shell scripts (parsing command output, reading files), Go, Rust,
> TypeScript, etc. Adapt terminology to the target codebase.

## When to use this skill

- "Hunt for bugs in the creative audit feature"
- "What could crash in this component?"
- "Check if this code handles null API responses"
- "Audit the API boundary safety for this feature"
- "Find defensive coding gaps"
- "Is this code safe against malformed data?"
- "What happens if the API returns null here?"
- "Find unguarded property access"
- "Proactively find bugs in src/features/X"
- Any request to find bugs that tests aren't catching

Do **not** use this skill for:
- Reviewing PR changes (use `pr-review`)
- Finding bugs reported in GitHub issues (use standard investigation)
- Performance analysis (use profiling tools)
- Security audits focused on auth/injection (this skill finds crash bugs, not
  security vulnerabilities specifically)

## Modes

| Mode | Flag | Best for | Scan depth |
|------|------|----------|-----------|
| **Standard Scan** (default) | none | Feature directory, broad sweep | Broad coverage with the full report structure |
| **Boundary Audit** | `--mode boundary` | Boundary module or API/data layer | Transform completeness, normalization |
| **Deep Trace** | `--mode trace` | Single consumer or data flow | Fewer findings, strongest proof chains |

If the user's intent is ambiguous, default to **Standard Scan**.

## Input parsing

| Format | Example | Handling |
|--------|---------|---------|
| Directory | `/bug-hunt src/features/creativeAudit/` | Scan all source files in directory |
| File | `/bug-hunt src/components/Table.tsx` or `/bug-hunt scripts/deploy.sh` | Deep trace on single file |
| Feature name | `/bug-hunt creativeAudit` | Resolve to feature directory |
| Boundary module | `/bug-hunt --mode boundary api:creativeAudit` | Find boundary layer, trace external-data entry points |
| Consumer | `/bug-hunt --mode trace TagsTable` | Resolve consumer, trace its data sources |
| Diff scope | `/bug-hunt --scope diff` | Analyze files changed from main |
| No argument | `/bug-hunt` | Error: scope is required |

**Scope is required.** If no scope is provided, ask the user to specify one.

Optional flags:

| Flag | Default | Purpose |
|------|---------|---------|
| `--mode <mode>` | `standard` | Scan mode (standard, boundary, trace) |
| `--max-files <N>` | 30 | Cap on files to scan (prevents runaway) |
| `--detectors <list>` | all | Comma-separated detector subset |

## Preflight

1. **Verify git context:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```
2. **Resolve scope to concrete file paths:**
   - Directory: resolve source file extensions based on the target codebase's
     language (e.g., `*.ts`, `*.tsx` for TypeScript; `*.py` for Python; `*.sh`
     for shell; etc.), excluding test files and generated files
   - Feature name: resolve to `src/features/<name>/`
   - Symbol/consumer name: grep for declaration/export patterns appropriate to
     the language to find the file
   - Boundary module: grep for data-fetching patterns appropriate to the language
     (e.g., HTTP clients, database queries, file I/O, subprocess calls, external
     API wrappers)
   - Diff: filter `git diff main...HEAD --name-only` with language-appropriate
     source extensions (e.g., `*.ts`/`*.tsx`, `*.py`, `*.sh`, etc.)
3. **Check file count against max-files.** If over limit, inform the user and
   ask to narrow scope or increase limit.

---

## Phase 1: Boundary Map

**Goal:** Identify all system boundaries in scope — places where external data
enters the application.

Gandalf delegates to **Legolas** (explorer) with this prompt structure:

> Explore the codebase at the specified scope to build a boundary map.
>
> **Scope:** `<resolved file paths>`
>
> Find and return a structured summary of:
>
> 1. **System boundaries** — HTTP clients, database queries, file reads,
>    subprocess output, environment variables, user input, external API wrappers,
>    or other places external data enters the program.
>    For each: the boundary function/command/module name, the normalization or
>    transform step (if any), and the declared return type or contract (if typed
>    language).
>
> 2. **Data consumers** — Components, functions, commands, handlers, or other
>    code paths that consume the boundary data. For each: file path, how they
>    access the data (destructuring, property access, indexing).
>
> 3. **Transform chain** — The path from raw boundary data to final
>    consumer. Note where data is normalized, defaulted, or passed through
>    unchanged.
>
> 4. **Type definitions, schemas, or contracts** — The declared expectations for
>    boundary data. For typed languages: note optional vs required fields and
>    nullable types. For untyped languages: note documented expectations vs what
>    is actually validated.
>
> 5. **Existing guards** — Any null checks, optional chaining, nullish
>    coalescing, default values, or type narrowing already in place.
>
> Return ONLY a structured summary. Include file paths and line numbers.
> Do not return raw file contents.

---

## Phase 2: Trace & Prove

**Goal:** For each boundary, trace data flow to every consumer and identify
unguarded access patterns.

### Detector categories

Run these detectors against the boundary map. Read `references/detector-rules.md`
for detailed heuristics.

#### 1. Null/Undefined Dereference at Boundary (`NullDerefBoundary`)
- Boundary value typed/contracted as required but no normalization in transform
- Consumer accesses `obj.field.subfield` or `obj[key]` without guard
- Python code uses a value that can be `None`; Go code dereferences a nil/null
  pointer; JavaScript/TypeScript code dereferences `null`/`undefined`
- **Proof required:** Show the transform does NOT guard the field AND the
  consumer does NOT guard before access

#### 2. Type-Reality Mismatch (`TypeRealityMismatch`)
- Declared type/schema says `string` but boundary data could return `null`/`None`
- Declared type/schema says list/array but boundary data could omit it
- Contract says required field but documentation or observed patterns suggest optional
- **Proof required:** Show the type definition AND evidence the runtime value
  can differ (e.g., other fields in same response ARE guarded, suggesting
  awareness of the issue)

#### 3. Guard Gap (`GuardGap`)
- Some code paths guard against null for a value, but other paths using the
  same value don't
- `transformResponse` guards `results` but not `averageAssetScores` in the
  same response
- **Proof required:** Show the guarded path AND the unguarded path for the
  same data

#### 4. Implicit Assumption (`ImplicitAssumption`)
- Code assumes array is non-empty (`arr[0]`, `arr.length` without check)
- Code assumes object/map/dict has specific key (`obj[dynamicKey]` without `in`
  check, Python `dict[key]` causing `KeyError`)
- Code assumes string is non-empty (used in template without fallback)
- Shell code assumes variables are set/safe (unquoted variable expansion,
  missing `${var:-default}` fallback)
- **Proof required:** Show the assumption AND a plausible scenario where it
  fails

#### 5. Unhandled Async Edge Case (`UnhandledAsync`)
- Promise/future/task/subprocess result without error handling in
  non-framework-managed code
- State update or side effect after potential unmount/teardown without lifecycle
  cleanup mechanisms (useEffect cleanup, context managers, signal handlers,
  defer/finally, destructors, etc.)
- Race condition between concurrent requests
- **Proof required:** Show the async code AND the missing error/cleanup path

### Evidence standard

**A finding is only valid if the agent can show ALL of:**
1. **Boundary can yield the problematic value** — evidence from transform gaps,
   boundary patterns, or type/contract looseness
2. **No guard exists** on the path from boundary to dereference
3. **Crash or corruption site** — the specific line that would fail
4. **Reachability** — a plausible call path from boundary to crash site

If any link in the chain is uncertain, downgrade to P2 or move to Notes.

### Delegation

For **Standard Scan** and **Boundary Audit**: delegate trace work to a single
**Legolas** exploration dispatch with the boundary map as input.

For **Deep Trace**: delegate to **Legolas** for evidence gathering, then
synthesize and deduplicate findings directly.

---

## Phase 3: Classify & Deduplicate

Assign severity per `references/severity-rubric.md`:

| Severity | Criteria | Example |
|----------|----------|---------|
| **P0 — Crasher** | Will crash the app in production given plausible boundary data | `tag.averageAssetScores[key]` when API returns null |
| **P1 — Likely Bug** | Will produce incorrect behavior but not crash | Filter returns wrong results due to missing guard |
| **P2 — Hardening** | Defensive gap that could become P0/P1 if data changes | No fallback for optional field, currently always populated |

Assign confidence:

| Confidence | Criteria |
|------------|----------|
| **High** | Complete proof chain with concrete evidence |
| **Medium** | Proof chain with one inferential step |

Do NOT emit Low confidence findings. If confidence is low, move to the
**Notes** section as an area to investigate.

**Deduplicate by root cause.** If the same missing normalization causes 5
crash sites, report ONE finding with the root cause and list all affected
sites.

---

## Phase 4: Report

### Output format

```markdown
## Bug Hunt Report: <scope>

**Mode:** <standard|boundary|trace>
**Files scanned:** <count>
**Boundaries found:** <count>
**Findings:** <P0 count> crashers, <P1 count> likely bugs, <P2 count> hardening

---

### P0 — Crashers

#### BH-<Type>-<N>: <one-line summary>

**Severity:** P0 | **Confidence:** High | **Type:** <detector category>
**Location:** `<file>:<line>`

**Proof chain:**
1. **Boundary:** `<endpoint/function/command>` returns `<type>` — `<file>:<line>`
2. **Transform:** `<function>` guards `<field>` but NOT `<other field>` — `<file>:<line>`
3. **Consumer:** `<component/function/command>` accesses `<expression>` — `<file>:<line>`
4. **Crash site:** `<expression>` throws when value is `<null|undefined|None>` — `<file>:<line>`

**Runtime scenario:** <concrete description of when this happens>

**Fix suggestion:**
```<language>
// In <file>, normalize at the boundary:
<code snippet>
```

**Test suggestion:** Mock `<field>` as `<null|undefined|None>` in the boundary
input and assert the consumer handles it without throwing or corrupting output.

---

### P1 — Likely Bugs

<same format per finding>

---

### P2 — Defensive Hardening

<same format per finding>

---

### Notes

<uncertain findings, areas to investigate, patterns observed>
```

### Machine-readable block

After the markdown report, emit a fenced JSON block for composition with
other skills:

````markdown
```json:bug-hunt-findings
{
  "meta": {
    "mode": "<mode>",
    "scope": "<scope>",
    "filesScanned": <N>,
    "boundariesFound": <N>
  },
  "findings": [
    {
      "id": "BH-NullDerefBoundary-001",
      "type": "NullDerefBoundary",
      "severity": "P0",
      "confidence": "High",
      "location": { "file": "<path>", "line": <N> },
      "chain": [
        { "step": "boundary", "file": "<path>", "line": <N>, "detail": "<desc>" },
        { "step": "transform", "file": "<path>", "line": <N>, "detail": "<desc>" },
        { "step": "consumer", "file": "<path>", "line": <N>, "detail": "<desc>" },
        { "step": "crash", "file": "<path>", "line": <N>, "detail": "<desc>" }
      ],
      "fix": "<one-line fix description>",
      "test": "<one-line test description>"
    }
  ]
}
```
````

---

## Stretch goals (opt-in, not implemented in v1)

These are hooks for future enhancement. Do NOT implement them unless the user
explicitly requests.

### Jira ticket creation (`--emit jira`)
- Generate one Jira ticket per root cause (not per symptom)
- Title: `[Bug] <one-line summary>`
- Description: proof chain + fix suggestion + test suggestion
- If ever implemented, Jira creation must be preview-default and route through
  Saruman review, user approval, and Aragorn execution before any mutation

### PR creation (`--emit pr-plan`)
- Generate a commit plan with files to modify and changes to make
- Does NOT create the PR — outputs the plan for review
- User can then ask Gandalf to route implementation through Aragorn

### Fix mode (`/bug-hunt-fix`)
- Separate command that takes bug-hunt findings and applies fixes
- Routes through Gandalf's implementation workflow with Aragorn executing after
  Saruman review and user approval
- Runs tests after each fix to verify no regressions

---

## Guardrails

1. **Read-only by default.** This skill never modifies code, creates files,
   commits, or pushes. It only reads and reports.
2. **Evidence threshold.** No P0 or P1 finding without a complete proof chain.
   Speculation goes in Notes, not in findings.
3. **Scan radius cap.** Default 30 files. Require explicit opt-in to expand.
   This prevents runaway analysis and keeps findings focused.
4. **Prefer normalization over scattered guards** in fix suggestions. The best
   fix is usually at the boundary (normalization transform, parser, adapter),
   not at every consumer.
5. **Don't fabricate.** If you can't find evidence for a link in the proof
   chain, say so. Move the finding to Notes with what you do know.
6. **Respect codebase patterns.** Fix suggestions must match existing
   conventions (e.g., language-idiomatic defaults such as `?? []` in JS/TS,
   `.get(key, default)` in Python, or `${var:-default}` in shell; suggest the
   existing local pattern, not a different one).
7. **No scope creep.** Only report bugs within the specified scope. Don't
   follow imports beyond 1 hop unless in Deep Trace mode.

## Error handling

| Error | Action |
|-------|--------|
| Scope resolves to 0 files | "No source files found at `<scope>`. Check the path." |
| Scope exceeds max-files | "Found <N> files, limit is <max>. Narrow scope or use `--max-files <N>`." |
| No boundaries found in scope | "No system boundaries found in scope. This skill works best on code that consumes external data. Try a broader scope or use `--mode trace` on a specific consumer." |
| No findings | Report "No defensive coding gaps found in <scope>." with a brief summary of what was checked. |

## Reference files

- `references/severity-rubric.md` — Detailed P0/P1/P2 definitions with examples
- `references/fix-patterns.md` — Common fix patterns organized by detector type
- `references/detector-rules.md` — Heuristics for each detector category
- `references/examples.md` — The `averageAssetScores` case as a canonical walkthrough
