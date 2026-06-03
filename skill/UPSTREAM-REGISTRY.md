# Upstream Skill Registry

This registry tracks local skills derived from [`github.com/mattpocock/skills`](https://github.com/mattpocock/skills).

## Upstream license

MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Audit metadata

- Refresh trigger: Manual. Recommended quarterly or when upstream cuts a release.
- Last full audit: 2026-06-03
- Upstream repo: `github.com/mattpocock/skills`
- Upstream pinned commit: `aaf2453fbdfe7a15c07f11d861224f34ab4b53cb`
- Prior sync baseline: `70141119e9fe47430b62b93bcf166a73e6580048`

## Skill provenance

| Local Skill | Source Repo | Source Path | Relationship | Local Divergences | Last Synced Commit |
|---|---|---|---|---|---|
| grill-me | github.com/mattpocock/skills | skills/productivity/grill-me/ | heavily-adapted | Diff status: changed since last sync — local disambiguation protocol, search-before-ask hierarchy, relentless-until-aligned framing; local far richer than upstream. | 70141119e9fe47430b62b93bcf166a73e6580048 |
| grill-with-docs | github.com/mattpocock/skills | skills/engineering/grill-with-docs/ | adapted | Diff status: changed since last sync — inlined grilling protocol, DDD-newbie guardrails, collision-risk check, lazy creation, and local richer context-format retained. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| tdd | github.com/mattpocock/skills | skills/engineering/tdd/ | merged | Diff status: changed since last sync — dropped structured output/confirm gates, added philosophy/anti-pattern sections, multi-file split, and domain-glossary awareness. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| diagnose | github.com/mattpocock/skills | skills/engineering/diagnose/ | adapted | Diff status: changed since last sync — local read-only posture, long-running-command discipline, and OpenCode terminology; local ahead of upstream. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| improve-codebase-architecture | github.com/mattpocock/skills | skills/engineering/improve-codebase-architecture/ | adapted | Diff status: changed since last sync — local read-only posture, long-running-command discipline, OpenCode terminology, and forward-compatible report fallback contract. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| prototype | github.com/mattpocock/skills | skills/engineering/prototype/ | adapted | Diff status: changed since last sync — local long-running-command discipline reference and OpenCode executor ownership. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| handoff | github.com/mattpocock/skills | skills/productivity/handoff/ | new-adoption | Diff status: changed since last sync — adapted for OpenCode multi-session workflows, no-write-by-default, suggested skills, and redaction guidance. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| to-issues | github.com/mattpocock/skills | skills/engineering/to-issues/ | new-adoption | Diff status: changed since last sync — GitHub-only with OpenCode guardrails. | 67bce91c80cd1020a4f068ced32d0281656842ad |
| caveman | github.com/mattpocock/skills | skills/productivity/caveman/ | new-adoption | Diff status: changed since last sync — local version is a once-per-response Gandalf prose overlay, not a sticky mode, with stricter never-compress and never-apply gates. | aaf2453fbdfe7a15c07f11d861224f34ab4b53cb |
| zoom-out | github.com/mattpocock/skills | skills/engineering/zoom-out/ | new-adoption | Diff status: changed since last sync — local version keeps the higher-abstraction map request and adapts it to domain-glossary/module-caller language. | aaf2453fbdfe7a15c07f11d861224f34ab4b53cb |
| triage | github.com/mattpocock/skills | skills/engineering/triage/ | new-adoption | Diff status: changed since last sync — local version is GitHub-only for personal non-Wpromote repos, references the external label manifest, and degrades to no label automation when absent. | aaf2453fbdfe7a15c07f11d861224f34ab4b53cb |

## Refresh procedure

Use the GitHub compare API to reproduce an audit before changing this registry:

1. Pick the prior baseline and target upstream commit.
2. Fetch `https://api.github.com/repos/mattpocock/skills/compare/<baseline>...<target>`.
3. Record the reproducibility fields below.
4. Inspect changed upstream skill paths and compare each affected local skill.
5. Update the table with full 40-character SHAs when recoverable; if a short SHA cannot be expanded, keep the short SHA and flag it in `Local Divergences`.
6. Preserve rejected local design decisions explicitly instead of blindly copying upstream.

Current audit reproducibility fields:

- Compare URL: `https://api.github.com/repos/mattpocock/skills/compare/70141119e9fe47430b62b93bcf166a73e6580048...aaf2453fbdfe7a15c07f11d861224f34ab4b53cb`
- Run date: `2026-06-03`
- Local SHA: `b37c4fcf94b78afd718ba25822f34c6b634e34f7`
- Rationale: provenance hardening plus approved adoption of `caveman`, `zoom-out`, and `triage`, while preserving local OpenCode-specific workflow constraints.
