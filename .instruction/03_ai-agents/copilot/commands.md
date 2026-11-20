---
category: copilot
update-frequency: frequent
dependencies: none
version: 1.0.0
---

# Common Commands (GitHub Copilot)

## Setup

- Install, build and link the local CLI: `pnpm bootstrap`; use
  `corepack pnpm bootstrap` when pnpm is not on PATH. The steps it runs and
  the Windows shell notes are in `.instruction/02_project/development.md`.

## Build and Quality Gates

- Build: `pnpm build`
- Format: `pnpm format`; check only: `pnpm format:check`
- Lint: `pnpm lint`, `pnpm lint:mdschema`, `pnpm lint:mermaid`
- Type check: `pnpm check-types`
- Tests: `pnpm -C packages/qfai test`
- Package contents: `pnpm verify:pack`

## MCP (recommended)

- MCP list and when to use each: `.instruction/02_project/mcp.md`
- Check in VS Code (command palette):
  - `MCP: List Servers` (use `Start/Restart` if needed)
  - `MCP: Reset Cached Tools` (when tools do not appear)

> State whether each run succeeded or failed, and on failure give a log summary and the response.
