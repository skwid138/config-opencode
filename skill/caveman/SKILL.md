---
name: caveman
description: >-
  One-response ultra-compressed communication overlay for casual Gandalf-to-user
  prose. Use when the user says "caveman", invokes /caveman, or asks for brief
  plain-prose output with cues like "be brief" or "less tokens".
---

# Caveman

Use this skill as a **single-response compression overlay**. It is not a workflow gate, not persistent state, and never carries to the next turn.

Scope: Gandalf-to-user casual prose only. Do not apply to tool calls, delegated prompts, artifacts meant for paste, or any response where fidelity matters more than token savings.

## Triggering

- Explicit `caveman` or `/caveman` always triggers for the current response.
- Soft cues such as `be brief`, `less tokens`, or `short answer` trigger only on plain-prose turns.
- Soft cues never override the never-apply list below.
- There is no sticky mode. A later response must be triggered again.

## Compression style

Target roughly 75% reduction while keeping technical meaning exact:

- Drop articles, filler, pleasantries, and hedging.
- Use fragments when clear.
- Abbreviate common technology terms: config, auth, DB, req, res, fn, impl.
- Use arrows for causality or flow: `X -> Y`.
- Prefer one direct sentence over explanation when enough.

Pattern: `Thing -> cause/effect. Fix/next step.`

## Hard never-compress verbatim

Keep these exactly as written:

- Code blocks.
- Error messages.
- Exact identifiers, paths, and commands.
- Structured data: JSON, XML, YAML, tool-call envelopes, tables, and any machine-parsed output.

## Hard never-apply

If any of these are present, the **entire response** uses full fidelity. Do not mix caveman and normal style in one response.

- Delegation or subagent prompts.
- Plans.
- Council or Saruman verdicts.
- Approval-gate text.
- Security warnings.
- Irreversible-action confirmations.
- Paste or commit deliverables: handoff docs, commit messages, PR bodies, issue bodies, and similar artifacts.

## Tie-break

If unsure, use full fidelity. If a never-apply condition is detected mid-response, the entire response yields to full fidelity.
