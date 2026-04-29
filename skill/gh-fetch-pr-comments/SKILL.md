---
name: gh-fetch-pr-comments
description: >-
  Fetch all review comments, threads, and review metadata from a GitHub pull
  request using the gh CLI and GraphQL. Returns structured, classified data
  for consumption by analysis skills. Use this skill whenever you need raw
  PR review comment data — for triage, planning, metrics, or any workflow
  that starts with "get me the review feedback on this PR." This is a pure
  data retrieval skill; it does not analyze or judge comments.
---

# GitHub PR Comment Fetcher

Retrieve all review feedback from a GitHub pull request and return it as
structured, classified data. This skill is a reusable data layer — it fetches
and organizes, but does not analyze or judge.

## Script

**Always use the script for data retrieval:**

```bash
~/code/scripts/agent/gh-pr-comments.sh [PR_REF]
~/code/scripts/agent/gh-pr-comments.sh --no-diff 275          # skip diff for speed
~/code/scripts/agent/gh-pr-comments.sh wpromote/polaris-web#275
```

The script outputs JSON with keys: `metadata`, `reviews`, `threads`, `files`, `commits`, `diff`.
Use `jq` to extract what you need. The rest of this skill describes how to
classify and present the data.

## When to use this skill

- As the data retrieval phase of a PR review analysis workflow
- When another skill or command needs structured PR comment data
- When the user asks to "fetch", "get", or "pull" review comments from a PR

Do not use this skill to *analyze* comments. This skill retrieves and
structures data. Analysis belongs to the consuming skill.

## Inputs

Accept PR references in any of these forms:

| Format | Example |
|--------|---------|
| PR number (current repo) | `#123` or `123` |
| Owner/repo with number | `owner/repo#123` |
| Full URL | `https://github.com/owner/repo/pull/123` |

If no PR reference is provided, detect the current branch's open PR:

```bash
gh pr view --json number,url --jq '.number' 2>/dev/null
```

If that fails, ask the user for a PR reference.

## Preflight

Before fetching:

1. **Verify gh authentication:**
   ```bash
   gh auth status
   ```
   If not authenticated, stop and report:
   `Error: gh CLI is not authenticated. Run gh auth login to authenticate.`

2. **Resolve owner and repo:**
   If not provided explicitly, detect from git remote:
   ```bash
   gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"'
   ```

3. **Confirm the PR exists:**
   ```bash
   gh pr view <number> --repo <owner/repo> --json number,title --jq '.number'
   ```
   If not found, stop and report:
   `Error: Could not access PR <reference>. Verify the PR exists and you have access.`

## Retrieval workflow

Use GraphQL for all review data retrieval. The REST API does not expose thread
resolution state, outdated state, or pending reviews — all of which are required
for downstream analysis.

### Step 1: Fetch PR metadata

```bash
gh pr view <number> --repo <owner/repo> --json title,body,state,baseRefName,headRefName,author,mergeable,url
```

### Step 2: Fetch reviews, threads, and comments via GraphQL

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      title
      state
      reviews(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes {
          author { login }
          state
          body
          createdAt
          url
        }
      }
      reviewThreads(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isResolved
          isOutdated
          comments(first: 50) {
            nodes {
              author { login }
              body
              path
              line
              originalLine
              createdAt
              url
              outdated
            }
          }
        }
      }
    }
  }
}' -f owner="<owner>" -f repo="<repo>" -F number=<number>
```

**Pagination:** If `hasNextPage` is `true` on reviews or reviewThreads, paginate
with `after: "<endCursor>"` until all data is collected. Do this silently — do
not report pagination progress to the user.

**Pending/draft reviews:** The `reviews` query includes `PENDING` state reviews
by default in GraphQL. Verify these appear in the output. If a review has
`state: PENDING`, tag it as a draft review in the output.

### Step 3: Fetch changed files

```bash
gh pr view <number> --repo <owner/repo> --json files --jq '.files[].path'
```

This provides the list of files modified in the PR, which downstream skills use
to determine whether a comment targets changed code or pre-existing code.

### Step 4: Fetch the PR diff

```bash
gh pr diff <number> --repo <owner/repo>
```

Store the diff for downstream skills that need to check specific hunks.

### Step 5: Fetch the commit history

```bash
gh pr view <number> --repo <owner/repo> --json commits --jq '.commits[] | "\(.oid[:8]) \(.messageHeadline)"'
```

This provides the ordered list of commits on the PR branch. Downstream skills
use this to detect **contradictory feedback loops** — situations where a
reviewer suggests a change, the author makes it, and a later review suggests
reverting it. Without commit history, the analyzer cannot distinguish "code
that was always this way" from "code that was changed in response to earlier
feedback."

## Author classification

Classify every comment author into one of three categories:

### `ai-reviewer`
AI-powered code reviewers whose comments should be analyzed on technical merit:
- `copilot-pull-request-reviewer[bot]` (GitHub Copilot)
- `coderabbitai[bot]` (CodeRabbit)
- `sourcery-ai[bot]` (Sourcery)
- `ellipsis-dev[bot]` (Ellipsis)
- Any `[bot]` login that posts line-level code review comments with technical
  substance

### `ci-bot`
CI/tooling bots whose comments are status reports, not review feedback:
- `github-actions[bot]`
- `codecov[bot]`
- `dependabot[bot]`
- `sonarcloud[bot]`
- `renovate[bot]`
- Any `[bot]` login that only posts CI status, coverage, or dependency updates

### `human`
All other authors.

**When uncertain about a `[bot]` author:** Inspect the comment content.
- Line-level code review with technical feedback → `ai-reviewer`
- CI status, coverage report, dependency alert → `ci-bot`
- If still unclear, classify as `ai-reviewer` (safer to over-include than
  to silently discard a valid finding)

## Output structure

Present the fetched data in this structured format. This is what the consuming
skill receives.

```
## PR Metadata

- **Title:** <title>
- **PR:** <owner/repo>#<number>
- **URL:** <url>
- **Status:** <open/merged/closed>
- **Author:** @<author>
- **Base:** <base> <- <head>
- **Mergeable:** <yes/no/unknown>
- **Description:** <PR body, first 500 chars or full if short>

## Changed Files

<list of file paths modified in the PR>

## Commit History

<ordered list of commits on the PR branch, oldest first>
- `<short sha>` <commit message>
- `<short sha>` <commit message>

## Reviews Summary

| Reviewer | State | Type | Date |
|----------|-------|------|------|
| @<login> | APPROVED/CHANGES_REQUESTED/COMMENTED/PENDING | human/ai-reviewer | <date> |

## Review Threads (<total> total)

### Thread 1
- **File:** <path>:<line>
- **Resolved:** yes/no
- **Outdated:** yes/no
- **Comments:**
  1. @<author> (<type>) — <date>
     > <comment body>
  2. @<author> (<type>) — <date>
     > <reply body>

### Thread 2
...

## Counts

- **Total threads:** N
- **Resolved threads:** N
- **Outdated threads:** N
- **CI bot comments filtered:** N
- **AI reviewer comments included:** N
- **Human comments:** N
- **Pending/draft reviews:** N
```

## Guardrails

- **Read-only.** Never modify the PR, push code, approve, dismiss, or resolve
  conversations.
- **Fetch everything.** Do not filter out resolved or outdated threads. Tag
  their state and let the consuming skill decide.
- **No analysis.** Do not categorize comments as important/unimportant. Do not
  assess technical validity. That is the consuming skill's job.
- **No fabrication.** Never invent comments, thread state, or author
  information. If data is missing or a query fails, report it clearly.
- **Handle errors gracefully.** If a specific query fails (e.g., diff too
  large), report what succeeded and what failed rather than aborting entirely.

## Error handling

| Condition | Response |
|-----------|----------|
| `gh` not authenticated | `Error: gh CLI is not authenticated. Run gh auth login to authenticate.` |
| PR not found / no access | `Error: Could not access PR <reference>. Verify the PR exists and you have access.` |
| No review comments at all | `This PR has no review comments.` |
| GraphQL pagination fails mid-stream | Report how many threads were fetched and that results may be incomplete |
| Diff too large to fetch | Note the limitation, still return all other data |
