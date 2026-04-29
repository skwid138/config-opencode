---
name: figma
description: >-
  Extract design context from Figma files for implementation. Use this skill
  when implementing UI from Figma designs, comparing implementation to designs,
  extracting design tokens/values, or any request involving Figma files —
  even if the user just pastes a Figma URL.
---

# Figma Design Context

Extract design information from Figma files to inform implementation.

## Connection methods (in priority order)

### 1. Figma Desktop MCP (preferred)

The Figma MCP server provides structured design data (components, variables,
layout, styles) directly. It's configured at `http://127.0.0.1:3845/mcp`.

**Prerequisites:**
- Figma desktop app open
- Dev Mode enabled (Shift+D)
- MCP server enabled in the inspect panel

**If the Figma MCP tools are not available or connection fails:**
Tell the user: "The Figma MCP server isn't responding. Please open the Figma
desktop app, switch to Dev Mode (Shift+D), and enable the MCP server in the
inspect panel. Let me know when ready."

### 2. Chrome DevTools fallback

When the Figma desktop MCP is unavailable (e.g., user only has web access):

```bash
~/code/scripts/agent/chrome_mcp.sh --url "https://www.figma.com/design/FILE_KEY/..."
```

Then use Chrome DevTools MCP tools to navigate and inspect design values.
This is less structured but works without the desktop app.

## Workflow: Implementing from Figma

1. **Get the Figma link** from the user or Jira ticket.
2. **Extract design context** using Figma MCP tools:
   - Get the node/frame structure
   - Extract variables, colors, spacing, typography
   - Identify components and their variants
3. **Check existing tokens** before using raw values:
   - For client-portal: `src/common/themes/tokens.*.ts`
   - For polaris-web: check the theme/design system files
4. **Map Figma values to code:**
   - Prefer existing design tokens over raw values
   - Use raw values only when no matching token exists
   - Note any new tokens that should be created

## Workflow: Comparing implementation to design

1. **Open both** the Figma design and the running app.
2. **Extract design values** from Figma (spacing, colors, typography, layout).
3. **Inspect the implementation** via Chrome DevTools MCP.
4. **Report discrepancies** with specific values and file locations.

## Guardrails

- **Read-only.** Never modify Figma files unless explicitly asked.
- **Prefer tokens.** Always check for existing design tokens before suggesting raw values.
- **Be specific.** Report exact values (px, hex, font-weight) not approximations.
- **Link context.** Reference the specific Figma node/frame being discussed.
