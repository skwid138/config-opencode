## Wpromote Codebase Topology

All Wpromote repositories live under `~/code/wpromote/`. When working on a task that spans multiple repos, use this map to understand dependencies and coordinate changes.

### Architecture Overview

```
                    ┌──────────────┐    ┌──────────────┐
                    │ polaris-web  │    │client-portal │
                    │  (frontend)  │    │  (frontend)  │
                    └──────┬───────┘    └──────┬───────┘
                           │                   │
                           └─────────┬─────────┘
                                     │ REST API
                              ┌──────┴───────┐
                              │  polaris-api │
                              │  (backend)   │
                              └──┬────┬───┬──┘
                                 │    │   │
                    ┌────────────┘    │   └────────────┐
                    │                 │                 │
              ┌─────┴─────┐   ┌──────┴──────┐   ┌─────┴─────┐
              │   cube    │   │   kraken    │   │  BigQuery │
              │(semantic  │   │  (data      │   │  (GCP)    │
              │  layer)   │   │  pipeline)  │   │           │
              └───────────┘   └─────────────┘   └───────────┘
```

### Repository Map

| Repository | Path | Role | Layer |
|-----------|------|------|-------|
| polaris-web | `~/code/wpromote/polaris-web` | Polaris SPA frontend (main user-facing app) | Frontend |
| client-portal | `~/code/wpromote/client-portal` | Client-facing portal (independent frontend) | Frontend |
| polaris-api | `~/code/wpromote/polaris-api` | Backend API serving both frontends | Backend |
| cube | `~/code/wpromote/cube` | Cube.js semantic layer for analytics queries | Data |
| kraken | `~/code/wpromote/kraken` | Data pipeline, interacts with polaris-api | Data |
| polaris-apps | `~/code/wpromote/polaris-apps` | Independent GCP-hosted applications | Services |
| wp-sdk | `~/code/wpromote/wp-sdk` | Shared CLI tool for the engineering team | Tooling |
| opencode-config | `~/code/wpromote/opencode-config` | Team OpenCode plugin (agents, skills, commands) | Tooling |

### Dependency Relationships

**Frontend → Backend:**
- `polaris-web` calls `polaris-api` (REST). New frontend features often require new or modified API endpoints.
- `client-portal` calls `polaris-api` (REST). Same backend, different frontend concerns.
- The two frontends are independent — they do not share code or a component library.

**Backend → Data:**
- `polaris-api` queries `cube` (Cube.js semantic layer) for analytics data.
- `polaris-api` interacts with `kraken` (data pipeline).
- `polaris-api` queries BigQuery directly via GCP (`gcloud`/`bq` CLI).

### Cross-Repo Change Patterns

When planning or implementing work, consider these common patterns:

| Change Type | Repos Likely Affected |
|------------|----------------------|
| New Polaris UI feature | `polaris-web` + likely `polaris-api` (new endpoint) |
| New client-portal feature | `client-portal` + likely `polaris-api` (new endpoint) |
| New API endpoint only | `polaris-api` only |
| Analytics/reporting change | `polaris-api` + `cube` (semantic layer update) |
| Data pipeline change | `kraken` + possibly `polaris-api` |
| Full-stack Polaris feature | `polaris-web` + `polaris-api` + possibly `cube` |

### Jira Component Mapping

Map Jira ticket components to repositories:

| Jira Component | Repository |
|---------------|------------|
| Web App | `polaris-web` |
| API | `polaris-api` |
| Client Portal | `client-portal` |
| Cube | `cube` |
| SDK | `wp-sdk` |
| Polaris Apps | `polaris-apps` |

If a Jira component doesn't match this table, check the ticket description for codebase hints or ask the user.

### Using This Map

- **Estimation**: Check which repos are affected. Multi-repo work adds coordination overhead — factor that into effort estimates.
- **Implementation**: Open the relevant repos and check their `AGENTS.md` files for project-specific conventions before coding.
- **Testing**: Changes to `polaris-api` may require testing from both `polaris-web` and `client-portal` perspectives.
- **PR Review**: Cross-repo features may need coordinated PRs — note this in planning.
