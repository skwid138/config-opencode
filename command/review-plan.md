---
description: Analyze PR review comments and create a tiered change plan
---
Use the `gh-fetch-pr-comments` skill to retrieve all review comment data for the
specified PR, then use the `github-review-analyzer` skill to assess each comment
against the codebase and produce a tiered change plan.

**Default behavior:** Deep analysis mode — thorough codebase reading, pattern
checking, and a prioritized change plan output.

If `--quick` is specified, use the `github-review-analyzer` skill in **quick**
mode instead (triage only into Must Do / Consider / Safely Ignore, no change
plan).

If `--jira <TICKET-ID>` is specified, fetch the Jira ticket's acceptance
criteria and use them as additional context during analysis.

If `--pattern-ref <directory>` is specified, scan that directory for codebase
conventions and use them when assessing style and pattern comments.

**PR detection:** If no PR number or reference is provided, auto-detect from the
current branch's open PR. If a PR number or reference is provided as an
argument, use that instead.

Stay read-only throughout. Do not modify code, push, approve, dismiss, or
resolve conversations.

{{$arguments}}
