# Skill Authoring Guide

Practitioner reference for writing OpenCode skills. Distilled from [Anthropic skill best practices](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices), [OpenAI GPT-4.1 prompting guide](https://cookbook.openai.com/examples/gpt4-1_prompting_guide), [GPT-5 prompting guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide), [OpenCode skills docs](https://opencode.ai/docs/skills/), [OpenAI Codex skills](https://developers.openai.com/codex/skills/), and the [Agent Skills specification](https://agentskills.io/specification).

---

## 1. Description is the selector

The `description` field is what the agent sees to decide whether to invoke a skill. It is a triggerable signal, not marketing copy.

- Include **what the skill does** and **when to use it**. Front-load trigger words and scope.
- Recommended shape: two sentences. Sentence 1 says what the skill does; sentence 2 starts with `Use when...` and names concrete triggers.
- Write in third person (`Use when...`, not `I help with...`).
- List concrete trigger phrases the user might say (e.g., `"TDD this"`, `"red-green-refactor"`).
- If a skill triggers too often, make the description more specific. If it should never auto-trigger, add manual-only invocation guidance.

**OpenCode constraints:**
- `name` must match its directory and the regex `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `description` must be 1--1024 characters.
- Both `name` and `description` are required in YAML frontmatter.

## 2. Concision in the always-loaded body

Once invoked, `SKILL.md` content stays in context across all subsequent turns. Every line is recurring token cost.

- Keep `SKILL.md` under **500 lines**. Split when approaching that limit.
- Treat 100 lines as a soft prompt to ask whether detail belongs in `references/`; 500 lines remains the hard cap.
- Default assumption: the model is already smart. State **what to do**, not how or why.
- Move rationale, examples, and domain-specific details into `references/`.

## 3. Calibrate strictness to task fragility

Use [Anthropic's degree-of-freedom framework](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices) to decide how prescriptive a skill should be:

| Freedom | When | Style | Examples |
|---------|------|-------|----------|
| **High** | Multiple valid approaches; context decides | Principles, not rules | Research, analysis, design exploration |
| **Medium** | Preferred pattern but variation OK | Guidelines with flexibility | Code review, refactoring proposals |
| **Low** | Fragile, error-prone, consistency-critical | Explicit rules and ordered steps | TDD, migrations, deploys, data resets |

Start with 5--10 standing rules only for behaviors that are safety-critical, validation-critical, or repeatedly missed in real use.

## 4. Over-steering warnings

Over-steering is not just verbosity. Modern models follow instructions literally enough that bad rules cause more harm than missing rules.

**Concrete bad patterns:**
- **Contradictory rules** -- the model spends reasoning effort reconciling them instead of doing the task.
- **Blanket "always X"** without escape hatches -- breaks when the precondition doesn't hold.
- **"Must call tool before responding"** without fallback -- causes hallucinated tool inputs when info is missing.
- **ALL-CAPS / bribery / incentive language** -- followed too literally; generally unnecessary.
- **Over-broad descriptions** -- skill triggers on tasks it shouldn't handle.

**Practical fix -- scoped gates:**

Replace blanket imperatives with scoped conditions that include a fallback.

```markdown
# Bad
Always run tests.

# Good
Run the focused test for the current change. If the test command
is unknown, discover it from the project config or ask.
```

```markdown
# Bad
Always TDD everything.

# Good
Use TDD for executable behavior changes. Do not apply to
docs/config-only edits unless the user explicitly asks.
```

## 5. File-splitting and progressive disclosure

Three-level loading model (consensus across [Anthropic](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview), [Codex](https://developers.openai.com/codex/skills/), [Agent Skills spec](https://agentskills.io/specification)):

1. **Metadata** (name + description) -- always loaded for selection.
2. **`SKILL.md` body** -- loaded when the skill is invoked.
3. **References / scripts** -- loaded only when explicitly read.

**Recommended layout:**

```
skill-name/
├── SKILL.md           # trigger scope, core workflow, gates, reference map
├── references/        # detail, examples, language-specifics, rationale
└── scripts/           # deterministic helpers (only output consumes context)
```

**Guidelines:**
- Keep references **one level deep** from `SKILL.md`.
- Add a **table of contents** for any reference file over 100 lines.
- Use scripts when deterministic execution beats generated code. Scripts run without loading source into context.
- Add scripts when the same code would otherwise be generated repeatedly.
- Add scripts when errors need explicit handling, exit codes, or stable machine-readable output.
- Split rarely needed advanced features into references so normal invocation stays small.

## 6. Requirements gathering before writing

Do a short requirements loop before drafting a new skill:

1. Name the repeated task or observed failure.
2. Identify who should invoke it and who should not.
3. List the trigger phrases users actually say.
4. Decide which parts are workflow rules, references, scripts, or repo-wide instructions.
5. Confirm whether the skill may write files, must stay read-only, or routes writes through Aragorn.

After drafting, ask the user to review:

- Does the description trigger on the right requests and stay quiet on adjacent ones?
- Are any rules too broad or missing escape hatches?
- Is anything time-sensitive or project-specific that belongs in a reference or external data source instead?
- Are examples concrete enough to guide behavior without bloating `SKILL.md`?

## 7. Optional `SKILL.md` skeleton

```markdown
---
name: skill-name
description: >-
  What this skill does. Use when the user says "trigger phrase" or needs the
  specific workflow this skill owns.
---

# Skill Name

One-paragraph scope statement.

## When to use

- Trigger 1.
- Trigger 2.

## Workflow

1. Step one.
2. Step two.
3. Step three.

## Behavioral rules

### Always

- Rule with condition and fallback.

### Never

- Boundary rule.

## References

- [reference.md](references/reference.md) — optional detail loaded only when needed.
```

## 8. Build from observed failures

Each rule in a skill should defend against an observed failure mode. Decorative rigor accumulates and harms.

- Build evals before extensive documentation ([Anthropic](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices), [OpenAI](https://developers.openai.com/api/docs/guides/prompt-engineering)).
- Iterate from real agent behavior, not imagined completeness.
- Prompt behavior is model-specific and nondeterministic -- eval and pin models in production prompts.

**Practical sequence:** write a minimal skill -> use it -> observe failures -> add rules that prevent those failures -> repeat.

## 9. What belongs where

| Layer | Purpose | Examples |
|-------|---------|----------|
| `AGENTS.md` / `instruction/` | Durable, repo-wide expectations | TDD default, commit rules, honest-disagreement posture |
| Skills (`skill/`) | Repeatable task workflows | TDD cycle, PR review, ticket planning |
| MCP / tools | Live external data that changes frequently | Jira, GitHub, SonarCloud, Chrome DevTools |
| Scripts (in skills) | Deterministic validation / discovery | Test-command detection, branch-to-ticket extraction |

Put it in `AGENTS.md` if it applies to every task. Put it in a skill if it's a workflow you invoke on demand. Put it in MCP/tools if the data is external and live. Put it in a script if deterministic code is more reliable than generated code.

## 10. The hybrid resolution

Anthropic says "be concise." OpenAI says "be explicit." The resolution:

- **Be explicit** about scope, gates, and outputs -- these are where ambiguity causes failures.
- **Be concise** about background and rationale -- push to `references/` files.

A well-authored `SKILL.md` reads like a checklist, not a textbook.

---

## Quick checklist

Before shipping a new skill:

- [ ] Description includes what it does AND when to use it, with trigger phrases
- [ ] `name` matches directory, matches regex, description is 1--1024 chars
- [ ] `SKILL.md` is under 500 lines
- [ ] 100+ line `SKILL.md` has been checked for reference-file split opportunities
- [ ] Strictness matches task fragility (high/medium/low freedom)
- [ ] No blanket imperatives without escape hatches
- [ ] Every rule defends against an observed failure mode
- [ ] Detailed material is in `references/`, not the main body
- [ ] No time-sensitive info is embedded where a live source or external data file belongs
- [ ] Terminology is consistent across description, body, references, and commands
- [ ] Concrete examples are included where useful; large example sets moved to `references/`
- [ ] Scope/gates/outputs are explicit; background/rationale are concise

## Sources

| Source | URL |
|--------|-----|
| Anthropic: Skill best practices | https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices |
| Anthropic: Agent Skills overview | https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview |
| Anthropic: Claude Code skills | https://docs.anthropic.com/en/docs/claude-code/skills |
| OpenCode: Skills docs | https://opencode.ai/docs/skills/ |
| OpenAI: GPT-4.1 prompting guide | https://cookbook.openai.com/examples/gpt4-1_prompting_guide |
| OpenAI: GPT-5 prompting guide | https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide |
| OpenAI: Codex skills | https://developers.openai.com/codex/skills/ |
| Agent Skills specification | https://agentskills.io/specification |
