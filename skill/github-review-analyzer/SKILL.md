---
name: github-review-analyzer
description: >-
  Analyze GitHub pull request review comments with deep codebase understanding
  and produce a tiered change plan. Fetches all review threads (including
  pending/draft and outdated), assesses each comment against the actual code,
  traces imports and callers for full context, checks codebase conventions,
  and outputs a prioritized plan of changes worth making. Use this whenever a
  user wants to understand which review comments actually matter, create a plan
  from PR feedback, assess review comment validity against the codebase, triage
  PR comments, or decide what to fix first on a PR — even if they don't
  explicitly ask for "review analysis." This skill overrides the plugin's
  github-review-analyzer with deeper analysis and planning capabilities.
---

# GitHub PR Review Analyzer

Analyze PR review comments with deep codebase context and produce a tiered
change plan. This skill has two modes: **deep** (default) for thorough analysis
with a change plan, and **quick** for fast triage matching the plugin's original
behavior.

> **Core insight:** A review comment's value depends on the code it references,
> not just the words in the comment. A suggestion that sounds reasonable might
> contradict established patterns. A nitpick might reveal a real bug. The only
> way to know is to read the code deeply before judging.

## Modes

| Mode | When | What it does |
|------|------|-------------|
| **deep** (default) | No flag or `--deep` | Full codebase analysis + tiered change plan |
| **quick** | `--quick` flag | Fast triage into Must Do / Consider / Safely Ignore (no change plan) |

## Inputs

Accept PR references in any of these forms:

| Format | Example |
|--------|---------|
| PR number (current repo) | `#123` or `123` |
| Owner/repo with number | `owner/repo#123` |
| Full URL | `https://github.com/owner/repo/pull/123` |
| No reference | Auto-detect from current branch's open PR |

Optional flags:

| Flag | Purpose |
|------|---------|
| `--quick` | Use quick triage mode instead of deep analysis |
| `--jira <TICKET-ID>` | Cross-reference Jira acceptance criteria during analysis |
| `--pattern-ref <directory>` | Scan a directory for codebase conventions to use as a pattern guide |

## Preflight

1. Verify `gh auth status` works.
2. Resolve owner/repo from git remote if not specified.
3. Confirm the PR exists and is accessible.

If any preflight check fails, stop and report the error clearly.

---

# Quick Mode

When `--quick` is specified, follow this streamlined workflow. The output is a
triage report — no change plan.

## Quick mode workflow

1. Follow the `gh-fetch-pr-comments` skill workflow to fetch all PR comment data.
2. Filter out:
   - Resolved threads (`isResolved: true`)
   - CI/tooling bot comments (keep AI reviewers)
   - Pure praise with no action requested
3. For outdated threads (`isOutdated: true`): read the current code at the
   referenced file/line. If the concern still applies, keep the thread. If the
   code has changed and the concern no longer applies, filter it out.
4. **Check for contradictory feedback loops.** For each surviving comment,
   check whether it suggests reverting a change that was made in response to
   an earlier resolved comment on this PR. Use the commit history and resolved
   threads to detect this. If a loop is detected, tag the comment as
   `[feedback loop]` and note it in the output — do not categorize it as
   "Must Do" unless a hybrid third approach clearly exists.
5. Read the full thread chain before judging any comment.
6. Inspect the relevant code or diff when a comment references a file or line.
7. Categorize each surviving comment into exactly one tier:

### Must Do
Genuinely blocking issues: bugs, correctness problems, security vulnerabilities,
data loss risks, explicit changes-requested items with strong technical basis.
Only use when you can explain the concrete downside of not fixing it.

### Consider
Non-blocking but worthwhile: valid improvements, low-impact bugs, readability
improvements, convention-backed consistency fixes, reasonable questions needing
answers. When unsure, prefer Consider over Safely Ignore.

### Safely Ignore
Not worth actioning: pure nitpicks without substance, subjective preferences
with no project convention behind them, incorrect suggestions, comments based
on misunderstanding, redundant feedback.

## Quick mode output format

```markdown
# PR Review Analysis: <PR title> (#<number>)

**PR:** <owner/repo>#<number>
**Status:** <open/merged/closed>
**Author:** @<author>
**Base:** <base> <- <head>

**Filtered out:** X resolved threads · Y outdated (no longer applicable) · Z CI/tooling bot comments
**Outdated but still applicable:** N threads re-included
**AI reviewers included:** <list logins, or "none">
**Analyzed:** N comments across M threads

---

## Must Do (N)

> Blocking issues that should be addressed before merge

### 1. [<file>:<line>] <Brief summary>

**Reviewer:** @<login>
**Type:** <bug/security/correctness/data-loss>

> <Original comment text, quoted>

**Why this matters:** <1-2 sentence explanation>
**Suggested action:** <What specifically to do>

---

## Consider (N)

> Non-blocking but worth reviewing

### 1. [<file>:<line>] <Brief summary>

**Reviewer:** @<login>
**Type:** <improvement/style/readability/question>

> <Original comment text, quoted>

**Why:** <Brief rationale>

---

## Safely Ignore (N)

> Nitpicks, incorrect suggestions, or subjective preferences

### 1. [<file>:<line>] <Brief summary>

**Reviewer:** @<login>

> <Original comment text, quoted>

**Why safe to skip:** <Brief reason>

---

_Analysis complete. Comments are categorized by impact — verify "Must Do" items first._
```

If a tier has no items, include the header with "No items in this category."

---

# Deep Mode

The default mode. Produces a thorough analysis with a tiered change plan.

## Deep mode workflow

### Phase 1: Data Retrieval

Follow the `gh-fetch-pr-comments` skill workflow to fetch all PR comment data.
This gives you:
- PR metadata (title, state, author, branches, description)
- All reviews including pending/draft
- All review threads with resolution and outdated state
- Full comment chains within each thread
- Changed file list
- PR diff

### Phase 2: Thread Pre-Processing

Process each thread from the fetch output:

1. **Read the full thread chain** before making any assessment. A reply may
   narrow, soften, or withdraw the original concern. A thread where the
   reviewer says "oh I see, never mind" is effectively resolved even if
   GitHub shows it as unresolved.

2. **Check resolution state:**
   - `isResolved: true` → Skip. Note in filtered count.
   - Effectively resolved (thread conversation shows concern was addressed)
     → Skip. Note in filtered count. Be conservative — only mark as
     effectively resolved when the thread itself contains strong evidence.

3. **Evaluate outdated threads:**
   - `isOutdated: true` does NOT mean skip.
   - Read the current code at the referenced file and line.
   - If the concern still applies to the current code, keep the thread and
     tag it as `[outdated thread, still applicable]`.
   - If the code has changed and the concern no longer applies, skip it.

4. **Classify comment target:**
   - Check the PR diff to determine if the commented file/line was modified.
   - Tag each comment as `[your change]` or `[pre-existing code]`.
   - This distinction matters for plan prioritization — issues in code you
     wrote are more urgent than issues in code that was already there.

5. **Filter CI bots**, keep AI reviewers and humans.

6. **Detect contradictory feedback loops:**

   Review comments can create destructive loops: reviewer A suggests changing X
   to Y, the author complies, then reviewer B (or the same reviewer in a later
   round) suggests changing Y back to X. If you follow both suggestions, you
   end up in an infinite cycle. AI reviewers are especially prone to this
   because they lack memory across review rounds — each round evaluates the
   code in isolation without knowing what previous rounds suggested.

   To detect loops:

   a. **Correlate resolved threads with commits.** For each resolved thread,
      check whether a subsequent commit on the PR addressed it. Use the commit
      history (from the fetch step) and the PR diff to identify commits that
      modified the same file/region the resolved thread targeted. A commit
      message referencing "PR comments", "review feedback", or similar is a
      strong signal.

   b. **Compare unresolved suggestions against resolved ones.** For each
      unresolved comment, check whether it suggests reverting or undoing a
      change that was made in response to an earlier resolved comment. Signs
      of a loop:
      - An unresolved comment targets code that was *changed by a commit
        responding to a resolved comment* on the same region
      - The unresolved suggestion would restore the code to a state similar
        to what existed before the resolved comment's feedback was applied
      - The resolved and unresolved comments express opposing preferences
        (e.g., "use the shared helper" vs. "inline this for performance")

   c. **When a loop is detected**, do not simply pick one side. Both comments
      identified a real concern — the loop exists because each suggestion
      solved one problem while reintroducing another. Instead:
      - Identify the **underlying tension** (e.g., DRY vs. performance,
        abstraction vs. explicitness, consistency vs. locality)
      - Assess whether a **third approach** exists that satisfies both
        concerns simultaneously
      - If a hybrid solution exists, plan that instead of either suggestion
      - If no hybrid exists, evaluate which tradeoff matters more for this
        specific code and explain the reasoning
      - Tag the item in the output as `[feedback loop detected]` so the
        author knows this was a contested point

   d. **Check all reviewers, not just AI.** Humans can create loops too,
      especially across multiple review rounds or when different reviewers
      have different style preferences. However, AI reviewers are the most
      common source because they re-evaluate from scratch each round.

### Phase 3: Deep Codebase Analysis

For each surviving comment, build thorough understanding before judging:

1. **Read the referenced file in full.** Not just the diff hunk — the entire
   file. Understand the function, the class, the module's purpose.

2. **Trace imports and callers** up to 3 levels deep:
   - What does this code depend on?
   - What depends on this code?
   - Would the suggested change have ripple effects?

   If understanding seems incomplete at 3 levels (e.g., the code is a utility
   used broadly, or the change would affect a public API), ask the user:
   "The impact of this change may extend beyond 3 levels of dependencies.
   Should I trace deeper for a more complete picture?"

3. **Read related tests:**
   - Search for test files covering the referenced code: `*.test.*`,
     `*.spec.*`, `__tests__/` directories.
   - Understanding existing test coverage helps assess whether a suggested
     change would break tests or is already covered by assertions.

4. **Pattern scanning** (if `--pattern-ref <directory>` was provided):
   - Delegate to a sub-agent (legolas/explore): "Scan `<directory>` and
     summarize the naming conventions, file structure patterns, error handling
     patterns, import patterns, and code style patterns used. Return a concise
     summary of conventions found."
   - Use this summary when assessing style and pattern comments.
   - If no `--pattern-ref` was provided, still check the immediate surrounding
     directory and sibling files for local conventions before judging
     style-related comments.

5. **Jira AC context** (if `--jira <TICKET-ID>` was provided):
   - Fetch the ticket: `acli jira workitem view <TICKET-ID>`
   - Extract acceptance criteria from the ticket description.
   - Use AC to determine if any comments are out-of-scope for this PR, or if
     a planned change relates to a specific acceptance criterion.

### Phase 4: Assessment

For each surviving comment, evaluate these dimensions:

**Technical validity:**
- Is the comment factually correct about the code's behavior?
- Does the reviewer understand what the code actually does?
- If the comment is wrong, what specifically is it wrong about?

**Codebase alignment:**
- Does the suggestion match existing patterns in the codebase?
- Would it introduce a new pattern where one already exists?
- If `--pattern-ref` was used, does it align with the reference directory's
  conventions?

**Impact classification:**
- **Critical:** Correctness, security, data integrity, crash/error conditions
- **Mid-level:** Performance, error handling, maintainability, missing
  validation, race conditions
- **Low:** Readability, naming, style consistency, minor DX improvements

**Proposed solution quality:**
- The comment may identify a real problem but suggest a suboptimal fix.
- When the *problem* is valid but the *solution* needs rethinking, note this
  explicitly: "The concern is valid, but the suggested approach has drawbacks.
  A better approach would be..."

**Pre-existing code awareness:**
- If the comment targets code that was NOT modified in this PR, flag it.
- Pre-existing code issues are still worth planning if they're genuine
  improvements, but they carry different urgency — the author didn't introduce
  the problem.

**Disagreement assessment:**
When a comment appears harmful, incorrect, or counterproductive, build a
tiered case:

- **High confidence disagreement:** Provide specific codebase evidence —
  pattern usage counts across files, test behavior that contradicts the
  suggestion, documentation that supports the current approach. Explain
  what would break or degrade if the suggestion were implemented.
- **Medium confidence disagreement:** Note the concern with reasoning but
  acknowledge uncertainty. Explain what additional context would strengthen
  or weaken the disagreement.
- **Low confidence disagreement:** Flag as "possibly not beneficial" with
  brief reasoning. Suggest the user verify before dismissing.

**Contradictory feedback loop awareness:**
If Phase 2 flagged this comment as part of a feedback loop, do not plan the
suggestion as-is. Instead:
- Acknowledge both sides of the tension explicitly
- Evaluate whether the current code (post-earlier-feedback) or the new
  suggestion better serves the codebase, or whether a third approach resolves
  both concerns
- If planning a change, plan the hybrid/third approach — not a revert to the
  pre-feedback state
- Place loop items in the appropriate tier based on the *hybrid solution's*
  merit, not the original comment's merit
- If no hybrid exists and the current code is the better tradeoff, place the
  comment in Declined Suggestions with the loop context as evidence

### Phase 5: Plan Generation

Group comments by file. Within each file group, order by oldest comment first.
Produce the tiered plan.

## Deep mode output format

```markdown
# PR Review Plan: <PR title> (#<number>)

**PR:** <owner/repo>#<number>
**Status:** <open/merged/closed>
**Author:** @<author>
**Base:** <base> <- <head>
**Mode:** Deep analysis
**Pattern reference:** <directory or "none">
**Jira:** <ticket-id or "not provided">

**Threads analyzed:** N of M total (X resolved, Y filtered CI, Z effectively resolved)
**Outdated re-evaluated:** N threads (A still applicable, B no longer relevant)
**Feedback loops detected:** N (comments that contradict earlier resolved feedback)
**AI reviewers included:** <list or "none">

---

## Critical Changes (N)

> Changes addressing correctness, security, or data integrity issues.
> These should be made before merging.

### 1. [<file>] <What would change>

**Triggered by:** @<reviewer> — "<quoted comment excerpt>"
**Comment targets:** [your change] | [pre-existing code]
**Thread status:** [current] | [outdated but still applicable] | [feedback loop detected]
**Why this change is in the plan:** <1-3 sentences explaining the real impact
and why this improves the code>
**Suggested approach:** <High-level description of what to change and the
general direction — not line-level diffs, but enough for an engineer or
sub-agent to understand the intent and scope>
**Test consideration:** <Existing test coverage status. If new tests would
strengthen the change, note what they should cover.>
**AC relevance:** <If --jira was provided and this relates to an AC, note it.
Otherwise omit this line.>
**Loop context:** <If feedback loop detected: describe the tension between the
earlier and current feedback, explain why the planned approach resolves both
sides rather than picking one. Omit this line if no loop.>

---

## Recommended Changes (N)

> Changes improving performance, error handling, or maintainability.
> Worth doing but not blocking.

### 1. [<file>] <What would change>

**Triggered by:** @<reviewer> — "<quoted comment excerpt>"
**Comment targets:** [your change] | [pre-existing code]
**Thread status:** [current] | [outdated but still applicable]
**Why this change is in the plan:** <explanation>
**Suggested approach:** <high-level direction>
**Test consideration:** <if relevant>

---

## Optional Improvements (N)

> Style, readability, and convention alignment changes.
> Pick and choose based on your judgment.

### 1. [<file>] <What would change>

**Triggered by:** @<reviewer> — "<quoted comment excerpt>"
**Comment targets:** [your change] | [pre-existing code]
**Why this change is in the plan:** <explanation>
**Suggested approach:** <high-level direction>

---

## Declined Suggestions (N)

> Comments where the suggested change appears harmful, incorrect, or
> counterproductive. Included with full reasoning so you can verify
> the assessment.

### 1. [<file>] <What was suggested>

**Triggered by:** @<reviewer> — "<quoted comment excerpt>"
**Confidence:** High | Medium | Low
**Why this is declined:**
- **Assessment:** <What the comment gets wrong or why the suggestion would
  be harmful>
- **Evidence:** <Specific codebase evidence — pattern usage, test behavior,
  existing conventions that support the current approach>
- **Loop context:** <If feedback loop: which earlier resolved comment this
  contradicts, what commit addressed it, and why reverting would recreate
  the original problem. Omit if no loop.>
- **Risk if implemented:** <What would break, degrade, or become inconsistent>
- **What would change this assessment:** <What additional context or evidence
  would flip this from "decline" to "accept">

---

## Filtered Out

- X resolved threads
- Y effectively resolved threads (concern addressed in conversation)
- Z CI/tooling bot comments
- W outdated threads no longer applicable

---
```

**Tier rules:**

- If a tier has no items, include the header with "No items in this category."
- If no comments survive filtering at all, use a short "All Clear" report
  instead of the full template.
- If `--jira` was NOT provided but AC context would improve the plan, add a
  note at the bottom:
  > **Tip:** Providing the Jira ticket (`--jira <TICKET-ID>`) could improve
  > this plan by cross-referencing acceptance criteria with the suggested
  > changes.

**Plan detail calibration:**

- Match plan detail to change complexity. A trivial rename doesn't need a
  paragraph. A suggested architectural change deserves thorough reasoning.
- The plan should be detailed enough that a sub-agent could use it as
  implementation instructions, but concise enough that a human can scan it
  and understand the what and why of each change in seconds.
- Always quote the original comment so the user can verify your judgment
  against the reviewer's actual words.

## Guardrails

- **Read-only.** Never modify code, push, approve, dismiss, or resolve
  conversations.
- **Never fabricate.** Always quote original comment text. Never invent thread
  state, author information, or code behavior.
- **Never plan a revert loop.** If a suggestion would undo a change that was
  made in response to earlier feedback on the same PR, do not plan it as-is.
  Either find a third approach that resolves both concerns, or decline the
  suggestion with loop context. The goal is forward progress, not oscillation.
- **Evidence-proportional disagreements.** High-confidence disagreements
  require codebase evidence. Low-confidence disagreements must say so.
- **Don't over-plan.** If a comment is valid but trivial, keep the plan entry
  brief. Match detail to complexity.
- **Respect the thread.** Read the full conversation before judging. If
  back-and-forth already resolved the concern, note it as effectively resolved.
- **Don't inflate.** A technically valid comment can still be Optional if the
  impact is low. A reviewer's blocking intent matters, but technical merit
  matters more.
- **Pre-existing code honesty.** Always flag when a comment targets code the
  PR author didn't write. Still plan the change if it's worthwhile, but the
  distinction matters for prioritization.

## Error handling

| Condition | Response |
|-----------|----------|
| `gh` not authenticated | `Error: gh CLI is not authenticated. Run gh auth login to authenticate.` |
| PR not found / no access | `Error: Could not access PR <reference>. Verify the PR exists and you have access.` |
| No review comments | `This PR has no review comments.` |
| `acli` unavailable (with `--jira`) | Warn that Jira context is unavailable, proceed without it |
| Pattern ref directory not found | Warn that pattern reference is unavailable, proceed without it |
| Ambiguous PR reference | Ask one concise clarifying question |
