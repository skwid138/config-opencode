---
description: Fetch SonarCloud issues for the current PR or a specified PR number
---

Use the `sonarcloud` skill to fetch and display SonarCloud issues.

Auto-detect the repository and PR number from git context unless provided
explicitly. Supports `--severity <level>` to set a severity floor and
`--format <format>` to control output format.

{{$arguments}}
