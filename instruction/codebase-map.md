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

| Repository | Path | Role | Layer | Local dev URL |
|-----------|------|------|-------|---------------|
| polaris-web | `~/code/wpromote/polaris-web` | Polaris SPA frontend (main user-facing app) | Frontend | `https://polaris.local` |
| client-portal | `~/code/wpromote/client-portal` | Client-facing portal (Polaris IQ — independent frontend) | Frontend | `https://polarisiq.local` |
| polaris-api | `~/code/wpromote/polaris-api` | Backend API serving both frontends | Backend | `https://api.polaris.local` |
| cube | `~/code/wpromote/cube` | Cube.js semantic layer for analytics queries | Data | — |
| kraken | `~/code/wpromote/kraken` | Data pipeline, interacts with polaris-api | Data | — |
| polaris-apps | `~/code/wpromote/polaris-apps` | Independent GCP-hosted applications | Services | — |
| wp-sdk | `~/code/wpromote/wp-sdk` | Shared CLI tool for the engineering team | Tooling | — |
| opencode-config | `~/code/wpromote/opencode-config` | Team OpenCode plugin (agents, skills, commands) | Tooling | — |

All three local URLs are served via OrbStack (HTTPS). If unreachable, run `wp dev up` first.

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

### Deployment, Logs, and Data Projects

Operational data (GKE cluster, namespaces, container names per repo, BQ
projects per env, Cube/GA4 data sources) is **not embedded here** — it lives in
a single canonical yaml that all consumers (this doc, `bq.sh`, `gke-logs.sh`,
future tmux GKE picker) read from. Embedding it here causes drift.

- **Canonical source:** `~/code/wpromote/scripts/data/gcp-projects.yaml`
- **Lookup tool:**      `~/code/wpromote/scripts/agent/gcp-project-map.sh --help`

Quick examples:

    gcp-project-map.sh --bq tst                  # BQ project for kraken/cube in tst
    gcp-project-map.sh --container tst polaris-api  # default container for polaris-api in tst
    gcp-project-map.sh --gke tst                 # cluster/project/region/namespace
    gcp-project-map.sh --url tst polaris-api     # public URL (e.g. https://test.api.polaris.wpro.sh)
    gcp-project-map.sh --env-code app test       # translate env codes (test → tst, nonprod → npd, etc.)
    gcp-project-map.sh --support nonprod argocd  # ops/support URLs (argocd, grafana, cloudbeaver)
    gcp-project-map.sh --markdown                # render the full table block

#### Critical gotchas (prose — kept inline because gotchas aren't data)

- **GKE workloads run in `prj-npd-ek8s-lpqx`, NOT in the per-app `-base-` projects.**
  Every non-prod service shares this cluster; logs live there. The `-base-` projects
  (e.g. `prj-npd-plrs-dev-base-yzaf`) host IAM/Workload Identity GSAs only.
- **Container name ≠ repo name.** `polaris-api`'s pod has containers `api` + `nginx`
  (initContainer: `move-staticfiles`). `polaris-web` and `client-portal` use container
  name `app`. Celery is split into separate deployments: `polaris-celery-worker`,
  `polaris-celery-beat`, `polaris-celery-flower` (containers named `worker`/`beat`/`flower`).
  Use `gcp-project-map.sh --container <env> <repo>` to resolve.
- **`kraken_metadata` is the dataset name**, not `metadata`. Easy to miss from a
  generic dbt-style guess.
- **Non-prod kraken/cube → `prj-npd-plrs-<env>-data-*`, NOT `wpro-kraken-qa`.**
  Legacy `wpro-kraken-qa` still has the schema but is not the active target. If you
  see fresh data in the legacy project, double-check — it may be stale.
- **Cube's BQ project for non-prod** is the same per-env data project as kraken,
  configured in Cube Cloud env vars (`CUBEJS_DB_BQ_PROJECT_ID`), not in the cube repo.
- **`cube` and `kraken` are NOT GKE workloads.** They don't run as pods on any cluster
  (npd / prd / sbx). `cnpg-kraken-*` pods on npd are the postgres database for kraken,
  not the kraken app itself. Cube runs in Cube Cloud; kraken runs as Airflow jobs.
- **Prod GKE cluster ≠ home of all prod services.** `gke-prd-ek8s-primary` only hosts
  `client-portal` (deployment named `portal`), `storybook`, and Airbyte. `polaris-api`,
  `polaris-web`, and `polaris-celery-*` on prd run on different infrastructure (likely
  Cloud Run / GAE) — confirm the deploy target before assuming GKE-prd.
- **Deploy flow (polaris-* repos):** CI builds image → `kustomize edit set image`
  in `gitops-polaris/apps/<app>/overlays/<env>/kustomization.yaml` → direct push as
  `wpromote-github-writer[bot]` (no PR) → Argo CD auto-syncs (selfHeal=true,
  prune=false). `Application` objects are generated by env-level `ApplicationSet`,
  not hand-written.

#### Probe quickly

    bqx --env tst --table-info kraken_metadata    # ~/code/scripts/personal/bq.sh wrapper
    wp gcp cluster connect --env tst              # connects kubectl to the cluster
    gke-logs polaris-api tst --filter 'severity>=ERROR'

#### Key kraken datasets (small, stable reference — kept here)

Same names across all kraken BQ projects:

| Dataset | Notable tables |
|---|---|
| `kraken_metadata` | `polaris_dimensions`, `polaris_attributes`, `polaris_clients`, `polaris_platforms`, `taxonomy_dimension_list` |
| `all_clients` | `polaris_<platform>__ad_level`, `polaris_<platform>__ad_level_datahub` (views), `datahub_with_preagg*` (views) |
| `cube_pre_aggregations_<env>` | Cube preaggregation cache tables (per-env in the same project) |
