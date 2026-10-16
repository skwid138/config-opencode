# Evidence Signals

Detail for `release-deploy-checks`. Read when choosing a signal, writing a
probe projection, applying the version rule, or drafting a write-based check.
The core rules (write rules, deny-by-default prod, hygiene, quality gate) live
in `SKILL.md` and take precedence over anything here.

## Contents

1. [Signal catalogue](#1-signal-catalogue)
2. [Runtime mapping](#2-runtime-mapping)
3. [Probe templates](#3-probe-templates)
4. [Probe result interpretation](#4-probe-result-interpretation)
5. [Deployed-version rule](#5-deployed-version-rule)
6. [Write-based checks](#6-write-based-checks)
7. [Origins and test clients](#7-origins-and-test-clients)
8. [Calibration examples (historical)](#8-calibration-examples-historical)

## 1. Signal catalogue

In preference order. Pick the first signal that discriminates old vs new code
for this ticket and covers the runtime the ticket changed.

| # | Signal | Discriminates when the ticket… | Runtime | Notes |
|---|---|---|---|---|
| 1 | OpenAPI schema (`/schema/?format=json` on the API origin) | adds/removes a serializer field, changes a constraint (`maxLength`, `enum`, `required`, `nullable`, `readOnly`), adds/removes a route or method, or changes a permission surfaced in the operation | api | Cheapest and data-free. Locate the schema component and operation from the diff (serializer/view names), not by guessing. Confirm the fact on tst first. |
| 2 | API GET response field presence (detail/list GET) | changes response shape without a schema-visible change (e.g. `SerializerMethodField`, dynamic fields) | api | Endpoint must be verified non-mutating from source (no side effects in `get`/`retrieve`, no audit-write middleware tied to it). Project to key presence, types, counts only. |
| 3 | UI page snapshot (already-loaded page) | adds/removes/relabels a visible control, column, empty state, or route | web / portal | Record element role/label presence only. Pair with `/build/version` where available. |
| 4 | Django admin | changes admin registration, list columns, filters, or read-only fields | api | Structural facts only from already-loaded or verified-GET pages. Never actions, change-form saves, or bulk operations. |

Not signals: page loads, absence of errors, HTTP 200 on a pre-existing route,
GitOps manifests, CI status, Jira status.

Worker/beat/data-only changes (Celery tasks, schedules, migrations without an
API-visible shape change, BigQuery/kraken effects) usually have no safe
visible signal. Prefer `No read-only check found — <reason>` or a narrowly
scoped human check (for example, "after tomorrow's scheduled run, confirm X in
<read-only report>"), and state the runtime it covers.

## 2. Runtime mapping

Classify changed files to name what a signal does and does not cover.

| Repo / path pattern | Runtime |
|---|---|
| `polaris-api` views, serializers, urls, permissions, filters | api |
| `polaris-api` `*/tasks/*`, Celery task modules | celery worker |
| `polaris-api` Celery beat schedule / periodic task config | beat |
| `polaris-api` admin modules | api (admin) |
| `polaris-api` migrations | api (db); visible only via an API/admin shape change |
| `polaris-web` | web |
| `client-portal` | portal |

A ticket touching api + worker with only an API signal: `Runtime covered: api;
uncovered: celery worker`.

## 3. Probe templates

Use only the shape below: one fixed same-origin GET, `redirect: 'manual'`,
projection in the browser. Replace placeholders from the diff before running.
Never return `body`, `doc`, or any record value. Return only booleans,
counts, type names, and primitives validated to the expected type.

Each template validates the payload's root shape **before** projecting. Only a
result with `outcome: 'observation'` is evidence. `outcome: 'inconclusive'`
(unexpected shape, invalid JSON) carries only types, key counts, and
presence flags for expected keys (never key names or values), and is never
negative evidence: an absent, `null`, or wrongly typed structure must
not be read as "field missing" or "zero items". `outcome: 'not observed'`
(non-200 or non-JSON) is interpreted by status per §4.

Schema fact (run on a tab whose exact origin is the API origin):

```js
async () => {
  const r = await fetch('/schema/?format=json', { method: 'GET', redirect: 'manual', credentials: 'include' });
  if (r.type === 'opaqueredirect') return { outcome: 'unverified redirect' };
  const contentType = r.headers.get('content-type') || '';
  const base = { status: r.status, finalUrl: r.url, contentType, at: new Date().toISOString() };
  if (r.status !== 200 || !contentType.includes('json')) return { ...base, outcome: 'not observed' };
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  let doc;
  try { doc = await r.json(); } catch { return { ...base, outcome: 'inconclusive', reason: 'invalid JSON' }; }
  const schemas = isObj(doc) && isObj(doc.components) ? doc.components.schemas : undefined;
  const has = (o, k) => isObj(o) && Object.hasOwn(o, k);
  if (!isObj(doc) || typeof doc.openapi !== 'string' || !isObj(doc.paths) || !isObj(schemas)) {
    return { ...base, outcome: 'inconclusive', reason: 'unexpected shape', rootType: kind(doc),
             keyCount: isObj(doc) ? Object.keys(doc).length : 0,
             hasOpenapi: has(doc, 'openapi'), hasPaths: has(doc, 'paths'), hasComponents: has(doc, 'components'),
             openapiType: kind(doc?.openapi), pathsType: kind(doc?.paths), schemasType: kind(schemas) };
  }
  const routePresent = Object.hasOwn(doc.paths, '<path template>');
  const component = schemas['<SchemaName>'];
  if (component === undefined) return { ...base, outcome: 'observation', routePresent, schemaPresent: false };
  if (!isObj(component) || !isObj(component.properties)) {
    return { ...base, outcome: 'inconclusive', reason: 'unexpected shape', routePresent, schemaPresent: true,
             componentType: kind(component), componentKeyCount: isObj(component) ? Object.keys(component).length : 0,
             hasProperties: has(component, 'properties'), hasAllOf: has(component, 'allOf'),
             hasOneOf: has(component, 'oneOf'), hasAnyOf: has(component, 'anyOf'), hasRef: has(component, '$ref') };
  }
  const prop = component.properties['<field>'];
  if (prop !== undefined && !isObj(prop)) {
    return { ...base, outcome: 'inconclusive', reason: 'unexpected shape', routePresent, schemaPresent: true, propType: kind(prop) };
  }
  const type = prop?.type;
  const maxLength = prop?.maxLength;
  if ((type !== undefined && typeof type !== 'string') ||
      (maxLength !== undefined && !(Number.isInteger(maxLength) && maxLength >= 0))) {
    return { ...base, outcome: 'inconclusive', reason: 'unexpected shape', routePresent, schemaPresent: true,
             typeType: kind(type), maxLengthType: kind(maxLength) };
  }
  return { ...base, outcome: 'observation', routePresent, schemaPresent: true, fieldPresent: prop !== undefined,
           type: type ?? null, maxLength: maxLength ?? null };
}
```

`schemaPresent: false` means the named component is absent. Treat it as a
"before" observation only when the diff adds that component; otherwise the
name is probably wrong, so re-derive it rather than recording a negative.
A component without a `properties` object (for example `allOf` composition)
is inconclusive; use the `has*` flags to adjust the projection. A property
whose `type` is not a string (for example an OpenAPI 3.1 type array) or whose
`maxLength` is not a non-negative integer is inconclusive and reports only
`typeType` / `maxLengthType`.

Response-shape fact (verified non-mutating detail GET):

```js
async () => {
  const r = await fetch('<fixed same-origin path>', { method: 'GET', redirect: 'manual', credentials: 'include' });
  if (r.type === 'opaqueredirect') return { outcome: 'unverified redirect' };
  const contentType = r.headers.get('content-type') || '';
  const base = { status: r.status, finalUrl: r.url, contentType, at: new Date().toISOString() };
  if (r.status !== 200 || !contentType.includes('json')) return { ...base, outcome: 'not observed' };
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  let body;
  try { body = await r.json(); } catch { return { ...base, outcome: 'inconclusive', reason: 'invalid JSON' }; }
  const items = isObj(body) ? body['<list key>'] : undefined;
  if (!isObj(body) || !Array.isArray(items) || !items.every(isObj)) {
    return { ...base, outcome: 'inconclusive', reason: 'unexpected shape', rootType: kind(body),
             keyCount: isObj(body) ? Object.keys(body).length : 0,
             hasListProp: isObj(body) && Object.hasOwn(body, '<list key>'), listType: kind(items),
             itemTypes: Array.isArray(items) ? [...new Set(items.map(kind))] : [] };
  }
  return { ...base, outcome: 'observation', topLevelHasField: Object.hasOwn(body, '<field>'),
           itemCount: items.length, itemsWithField: items.filter((i) => Object.hasOwn(i, '<field>')).length };
}
```

`itemCount: 0` with `outcome: 'observation'` is a valid empty list; it shows
nothing about the field, so pick a record that has items.

Frontend version (web or portal origin): same shape with `/build/version`,
returning only `frontend_version`.

Control probe: before treating a 404 or missing field as a "before"
observation, confirm a known-good probe on the same origin succeeded in the
same session (the schema probe is a good control).

## 4. Probe result interpretation

| Result | Meaning | Action |
|---|---|---|
| `opaqueredirect` (status 0) | Unverified redirect | Inconclusive. Not auth expiry, not negative evidence. Optionally ask the user to confirm the session, retry once. |
| 401 / 403 | Auth expired or insufficient | Pause origin, ask for re-login, retry once; persists → `not live-verified`. |
| 200 with HTML when JSON expected, or login URL | Auth expired | Same as 401. |
| 404 on a route the ticket adds | Candidate "before" on prod | Valid only after a passing control probe. |
| 5xx / network error | Inconclusive | Record and move on. |
| 200 JSON, unexpected shape or invalid JSON (`outcome: 'inconclusive'`) | Inconclusive | Never negative evidence. Check the placeholders and projection against the structural info returned; retry once with a corrected projection or record as inconclusive. |
| 200 JSON, expected shape (`outcome: 'observation'`) | Observation | Record sanitized fact with timestamp. |

## 5. Deployed-version rule

- **Frontends:** `/build/version` returns JSON with `frontend_version` (a git
  SHA). At authoring time (2026-10-16) it responded on tst web, tst portal, and
  prd portal; prd polaris-web returned 404. Re-probe rather than assume.
- **Ordering:** `git -C ~/code/wpromote/<repo> merge-base --is-ancestor <ticket-commit> <deployed-sha>`
  using local objects only. Exit 0: the deployed build contains the ticket.
  Exit 1: it does not. Exit 128 or other errors (object missing locally):
  `version unknown`. Never fetch to resolve it.
- **API:** no runtime version endpoint is known. A ticket-specific
  observation on tst is the "after" signal; make no claim about the whole
  build.
- **Not proof:** GitOps image tags (`gitops-polaris` kustomizations), Argo CD
  state, and CI runs describe desired or built state, not the observed runtime.

## 6. Write-based checks

Only when no read-only signal exists and effects and cleanup are bounded. The
blurb itself carries the warning:

```text
⚠️ MANUAL PROD WRITE — On test client <ID> (<prod URL>), <exact mutation>.
If deployed, <observation>; if not, <old behavior>. Cleanup: <exact revert>.
```

Never target existing business records. If the mutation's side effects
(notifications, syncs to ad platforms, billing, scheduled jobs) or cleanup are
unknown, output `No safe deploy check found — <reason>` instead.

## 7. Origins and test clients

Origins come from `gcp-project-map.sh --url`; the values below were verified
at authoring time and are a sanity check, not the source of truth.

| Service | prd | tst |
|---|---|---|
| polaris-api | https://api.polaris.wpromote.com | https://test.api.polaris.wpro.sh |
| polaris-web | https://polaris.wpromote.com | https://test.polaris.wpro.sh |
| client-portal | https://polarisiq.wpromote.com | https://test.polarisiq.wpro.sh |

Test-client **candidates** for prod checks: `C95366327`, `C18623470`. Ask the
user to confirm the client before using it in any blurb, and especially in a
`⚠️ MANUAL PROD WRITE` check.

## 8. Calibration examples (historical)

These illustrate the expected shape and reasoning. They are **calibration,
not current truth**: schema names, routes, and prod state may have changed.
Re-derive every fact from the diff and live probes.

**BIXB-22690 — schema constraint.** The plan-create serializer's `name` gained
`maxLength: 255`. Signal: schema component for plan create, property `name`,
`maxLength` 255 on tst, absent/different on prod before release. Shape of the
check: "Open https://api.polaris.wpromote.com/swagger/ and confirm the
plan-create schema's `name` field shows maxLength 255." Runtime: api.

**BIXB-22687 — field added, route removed.** Plan-detail line items gained
`taxonomy_dimension_id`, and the `line-items/{id}` route was removed. Signals:
response-shape projection (line items carrying the field) and schema
`paths` no longer containing the line-item detail route. Either alone is
discriminating; together they cover both halves. Runtime: api.

**BIXB-22700 — permission change.** The plan detail GET's permission tag
became `IsClientAccessAllowed`. Signal: the operation's permission tag in the
schema/Swagger. Check: "In Swagger, confirm the plan detail GET lists
`IsClientAccessAllowed`." Runtime: api.

**Rejected example.** "Open the media plan page and confirm it loads." It
passes on old and new code, so the quality gate rejects it. If nothing better
exists, output `No deploy-distinguishing check found — <reason>`.
