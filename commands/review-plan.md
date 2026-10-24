---
description: Analyze PR review comments and create a tiered change plan
---
Use the standard Gandalf workflow for PR feedback: Legolas retrieves review
comment data via `gh-fetch-pr-comments`, Legolas explores codebase context, and
`github-review-analyzer` assesses each comment against the actual code.

**Default behavior:** full analysis — thorough codebase reading, pattern
checking, and a prioritized action plan.

**Workflow:**
1. Fetch PR comments and metadata.
2. Explore referenced code, changed files, tests, imports/callers, and patterns.
3. Analyze comments into Critical, Recommended, Optional, and Declined.
4. Gandalf synthesizes Critical + Recommended into an executable plan via
   `plan-author`.
5. Saruman reviews only the executable plan, with the full analysis attached as
   context so misclassifications can be challenged.
6. User approves.
7. Aragorn implements.

If `--ticket <TICKET-ID>` is specified, fetch the Jira ticket's acceptance
criteria and use them as additional context during analysis. Action items should
record traceability as `AC-gap`, `code-quality`, and/or `reviewer-preference`.

If `--pattern-ref <directory>` is specified, scan that directory for codebase
conventions and use them when assessing style and pattern comments.

**PR detection:** If no PR number or reference is provided, auto-detect from the
current branch's open PR. If a PR number or reference is provided as an
argument, use that instead.

Stay read-only until the user approves an executable plan. Do not modify code,
push, approve, dismiss, or resolve conversations during analysis.

{{$arguments}}
