# Context7 setup

## What was installed

- Codex MCP server `context7` was registered in the shared Codex config at `C:\Users\chiar\.codex\config.toml`.
- Cursor project config was added at `.cursor/mcp.json`.
- A permanent agent rule was added at `AGENTS.md` so the agent prefers Context7 automatically for library and framework documentation work.

## Installed configuration

### Codex

Context7 was added with:

```powershell
codex mcp add context7 --url https://mcp.context7.com/mcp
```

The resulting Codex config entry is:

```toml
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
```

### Cursor

Project file:

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

## Node requirement

Verified on this machine:

```powershell
node -v
```

Current version during setup: `v24.15.0`

## Verification

### Codex CLI / Codex IDE

Check that Codex sees the MCP server:

```powershell
codex mcp list
codex mcp get context7
```

Expected result:

- `context7` appears as enabled
- URL is `https://mcp.context7.com/mcp`

### IDE prompt test

After restarting or reloading the IDE window, run this prompt:

```text
Buscá la documentación actualizada de Next.js App Router usando Context7 y explicá cómo crear una ruta básica. use context7
```

## API key

Context7 recommends an API key for higher rate limits, but the MCP server can be registered without hardcoding one.

If you later need authenticated access:

1. Create a secure environment variable named `CONTEXT7_API_KEY`.
2. Do not commit the key.
3. Re-run the official setup once interactive auth is available:

```powershell
npx ctx7 setup --codex --mcp
```

or update your MCP client configuration to send that secret securely, depending on the client's supported auth method.

## Official setup / removal commands

Recommended install command from Context7:

```powershell
npx ctx7 setup
```

Removal:

```powershell
npx ctx7 remove
codex mcp remove context7
```

If the CLI was ever installed globally:

```powershell
npm uninstall -g ctx7
```

## Restart step

To make the new MCP server visible to the IDE agent:

- Restart the IDE, or
- Reload the window/session

This is required because the current running agent session does not hot-reload newly-added MCP servers.
