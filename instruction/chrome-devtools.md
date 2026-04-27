# Chrome DevTools MCP Usage

## Prerequisites

The Chrome DevTools MCP connects to Chrome on port 9222. Before using any
chrome-devtools tools:

1. **Check if Chrome is already running:**
   ```bash
   ~/code/scripts/chrome_mcp.sh --check
   ```
   If exit code is 0, Chrome is ready. If 1, launch it.

2. **Launch Chrome for MCP:**
   ```bash
   ~/code/scripts/chrome_mcp.sh
   ```
   This starts Chrome with:
   - A temporary user-data directory (no extensions/session interference)
   - Remote debugging on port 9222
   - Detached mode (runs as normal macOS app)

3. **If authentication is needed:**
   Tell the user: "I've launched Chrome for DevTools debugging. Please
   authenticate to [site] and navigate to [page], then let me know when ready."
   Wait for confirmation before proceeding with MCP tools.

4. **To open a specific URL:**
   ```bash
   ~/code/scripts/chrome_mcp.sh --url "https://example.com"
   ```

## When to use Chrome DevTools MCP

- UI debugging (layout, styling, rendering issues)
- Network request inspection
- Console error investigation
- Accessibility audits (Lighthouse)
- Performance traces
- Comparing implementation to Figma designs
- Reading Figma design values via the Figma web app
- Visual regression checking

## When NOT to use

- Tasks that don't involve a browser
- API-only debugging (use curl/httpie)
- Reading static source files (use Read tool)

## Figma workflow

When working with Figma designs:

1. **Prefer Figma MCP** (desktop app, Dev Mode, MCP enabled at `http://127.0.0.1:3845/mcp`)
   - Provides structured data: components, variables, layout, styles
   - No Chrome needed
2. **Fallback to Chrome DevTools MCP** if Figma desktop MCP is unavailable:
   - Launch Chrome: `~/code/scripts/chrome_mcp.sh --url "https://www.figma.com/..."`
   - Ask user to authenticate if needed
   - Use DevTools MCP to navigate Figma and read design values
3. For client-portal: check `src/common/themes/tokens.*.ts` for existing tokens first
4. Prefer existing tokens over raw values; use raw values only when no token exists
