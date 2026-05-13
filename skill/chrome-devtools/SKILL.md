---
name: chrome-devtools
description: Use Chrome DevTools MCP to inspect, debug, or interact with a running web app — UI/layout debugging, network/console inspection, Lighthouse audits, performance traces, visual comparison to Figma, or driving any page that needs a real browser. Use this skill whenever the user asks to "open the page", "check the UI", "debug the frontend", "inspect network requests", "run Lighthouse", "compare to the Figma design in browser", or any request that requires Chrome to be driven programmatically — even if they don't explicitly say "Chrome DevTools MCP".
---

# Chrome DevTools MCP

The chrome-devtools MCP connects to Chrome on `127.0.0.1:9222`. Chrome must be running with remote debugging on that port before any `chrome-devtools_*` tool will work.

## Executor ownership

The invoking agent executes this read-only browser inspection workflow. If the
browser findings imply implementation, route the fix through Gandalf's normal
workflow: plan → Saruman pre-impl review → user approval → Aragorn execution →
post-impl audit.

## Auto-launch protocol (do this yourself; do not ask the user)

Before your FIRST `chrome-devtools_*` tool call in a session, OR if any `chrome-devtools_*` tool fails with a connection error:

1. Check: `~/code/scripts/agent/chrome_mcp.sh --check` (exit 0 = running, 1 = not running)
2. If not running, launch it: `~/code/scripts/agent/chrome_mcp.sh` — or with `--url <URL>` to open a target page directly.
3. Then proceed with the MCP tool call.

Do NOT report "the MCP isn't running" and stop. The script exists for this exact purpose — run it.

## Authentication

If the target page requires login, after launching Chrome tell the user:

> "I've launched Chrome for DevTools debugging. Please authenticate to [site] and navigate to [page], then let me know when ready."

Then wait for their confirmation before proceeding.

## Wpromote local dev URLs

Use the URLs in `instruction/wpromote-context.md` when that file has been
conditionally loaded under `~/code/wpromote/`. Do not hardcode Wpromote URLs
here — the conditional Wpromote context is the source of truth when available.
Outside `~/code/wpromote/`, ask the user for the target URL or infer it from the
running app.

These domains are HTTPS via OrbStack. If the user reports cert/connection errors, suggest they run `wp dev up` first.

## Figma fallback

Prefer the Figma desktop MCP (`http://127.0.0.1:3845/mcp`) for design context. Only fall back to driving figma.com via Chrome DevTools MCP if the Figma MCP is unavailable.

## When NOT to use

- API-only work — use `curl` / `httpie`
- Reading static source files — use the Read tool
- Anything that doesn't require a real browser
