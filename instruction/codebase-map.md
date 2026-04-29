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

### Deployment & Logs Map

All Polaris services share **one non-prod GKE cluster**, multi-tenant by namespace. The `-base-` GCP projects (e.g. `prj-npd-plrs-dev-base-yzaf`) host IAM/Workload Identity GSAs only — **workloads do NOT run there**, and `k8s_container` logs are NOT in those projects.

**Cluster (non-prod):**

| Field | Value |
|---|---|
| GCP project (where logs live) | `prj-npd-ek8s-lpqx` |
| GKE cluster | `gke-npd-ek8s-primary` |
| Region | `us-west1` |

**Per-environment namespaces:**

| Env | Namespace | Argo App suffix |
|-----|-----------|-----------------|
| dev | `polaris-dev` | `-development` |
| test | `polaris-tst` | `-test` |
| prod | `polaris` | `-production` (separate cluster/project — TBD, confirm before assuming) |

**Per-repo container names inside the pod** (the container name often differs from the repo/image name):

| Repo | Container name(s) | Verified |
|------|------------------|----------|
| polaris-api | `api` (web), `worker` (celery), `pgbouncer` | ✅ |
| polaris-web | TBD | ❌ |
| client-portal | TBD | ❌ |
| cube | TBD | ❌ |
| kraken | TBD | ❌ |

**Container registry (all repos):**
```
us-west1-docker.pkg.dev/prj-c-registry-qso0/registry-docker/<image>:<git-short-sha>
```

**Deploy flow (polaris-* repos):**
1. CI in the app repo builds image, tags with 7-char git short SHA, pushes to Artifact Registry.
2. CI's `set-deployment` job runs `kustomize edit set image` against `~/code/wpromote/gitops-polaris` at `apps/<app>/overlays/<env>/kustomization.yaml` and **direct-pushes** the bump as `wpromote-github-writer[bot]` (no PR).
3. Argo CD (running inside each cluster) auto-syncs from gitops-polaris (`automated: {selfHeal: true, prune: false}`).
4. Argo Applications are generated by an `ApplicationSet` per env (`overlays/<env>/appset.yaml`), not by hand-written `Application` YAMLs.

**Reading logs:** prefer `gke-logs.sh` (see `script-usage.md`) over hand-writing `gcloud logging read` queries — it encodes the project/namespace/container mapping above so you don't have to.

### Data Project Map (BigQuery)

GCP projects that host the BigQuery datasets services read from. These are **separate from the GKE/log projects above** — `prj-npd-ek8s-lpqx` is where workloads run; the BQ data lives elsewhere.

**kraken / cube** — current non-prod deployments write to per-env `-data-` projects (NOT the legacy `wpro-kraken-qa`):

| Env | BQ project | Verified |
|-----|-----------|----------|
| dev | `prj-npd-plrs-dev-data-yws6` | ✅ |
| test | `prj-npd-plrs-tst-data-szm2` | ✅ |
| prod | `wpro-kraken-314320` | ✅ inferred (legacy) — confirm before assuming |

> **Legacy:** `wpro-kraken-qa` still exists and has the same datasets, but the *current* non-prod kraken deployments write to the per-env `prj-npd-plrs-*-data-*` projects above. If you see fresh data in `wpro-kraken-qa`, double-check — it may be stale or a different deployment.

**Other services:**

| Service / data source | Non-prod | Prod | Verified |
|---|---|---|---|
| cube (BQ data source) | Reads from kraken's BQ project for the env (`prj-npd-plrs-<env>-data-*`); also writes preaggregations to `cube_pre_aggregations_<env>` datasets there | `wpro-kraken-314320` | ✅ |
| ga4 | `wpro-ga4-data-qa` | `wpro-ga4-data` | ❌ unverified |
| polaris-api direct BQ | TBD (code default `prj-npd-plrs-dev-backend-9l8d` for QA mgmt commands; runtime may differ) | TBD | ❌ unverified |

**Key kraken datasets (same names across all kraken BQ projects):**

| Dataset | Notable tables |
|---|---|
| `kraken_metadata` | `polaris_dimensions`, `polaris_attributes`, `polaris_clients`, `polaris_platforms`, `taxonomy_dimension_list` |
| `all_clients` | `polaris_<platform>__ad_level`, `polaris_<platform>__ad_level_datahub` (views), `datahub_with_preagg*` (views) |
| `cube_pre_aggregations_<env>` | Cube preaggregation cache tables (per-env in the same project) |

**Gotchas:**
- kraken's metadata dataset is named **`kraken_metadata`** — NOT `metadata`. Easy to get wrong from a generic dbt-style guess.
- For non-prod kraken/cube, **use `prj-npd-plrs-<env>-data-*`, NOT `wpro-kraken-qa`**. The legacy project still has the schema but isn't the active deployment target.
- Cube's BQ project for non-prod is the same per-env data project (configured in Cube Cloud deployment env vars `CUBEJS_DB_BQ_PROJECT_ID`, not in the cube repo source).

**Probe quickly:**
```bash
# test
bq --project_id=prj-npd-plrs-tst-data-szm2 ls kraken_metadata
# dev
bq --project_id=prj-npd-plrs-dev-data-yws6 ls kraken_metadata
```
