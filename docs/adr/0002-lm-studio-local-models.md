# Static OpenCode local model config with explicit LM Studio runtime management

## Status

accepted

## Context

OpenCode can use OpenAI-compatible providers, and LM Studio can expose local
models through an OpenAI-compatible server. The risky part is coupling config
discovery, runtime startup, and model loading: a session launcher that edits
config or eagerly loads large models would make startup surprising and could
consume a large amount of memory before the user has chosen a model.

The local models we want surfaced in OpenCode are a small curated set of LLMs.
Embedding models are intentionally excluded from v1 because they are not useful
as normal chat/code models in the OpenCode TUI.

## Decision

Use LM Studio as the canonical local runtime and keep OpenCode model discovery
static. `opencode.jsonc` defines a custom `lmstudio` provider using
`@ai-sdk/openai-compatible`, pinned to `http://127.0.0.1:1234/v1`, with explicit
`local/...` model IDs and fixed limits.

Runtime state is managed separately by `~/code/scripts/personal/local-models.sh`:

- `start` starts/verifies LM Studio at the pinned endpoint and does not load a
  model.
- `verify` checks CLI availability, endpoint response, installed source models,
  and static config drift without requiring any model to be loaded.
- `load <alias>` loads a source model using `--identifier local/...` so the API
  identifier exactly matches the OpenCode model ID.
- `unload <alias>` unloads only the exact stable identifier; `unload --all-local`
  unloads only identifiers beginning `local/`.

`opensession --local` calls `local-models.sh start` before `openweb` or
`openattach`. It does not imply `--restart`, does not edit config, and does not
load models. After changing OpenCode provider/model config, use
`opensession --local --restart` or the existing stale-daemon prompt flow.

## Consequences

- Local models appear as normal provider/model choices in OpenCode, but the
  current OpenAI-backed defaults and agent pins remain unchanged.
- Startup remains cheap: `opensession --local` verifies the runtime only.
- Adding/removing models is a two-place v1 workflow: update the script mapping
  and `opencode.jsonc`, then run `local-models.sh verify` to catch drift.
- Future work should add `local-models.sh add` so additions can be generated and
  validated rather than hand-edited.
- A running OpenCode daemon must still be restarted to pick up config changes;
  OpenCode freezes config at daemon start.
