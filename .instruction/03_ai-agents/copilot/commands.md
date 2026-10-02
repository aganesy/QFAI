---
category: copilot
update-frequency: frequent
dependencies: none
version: 1.0.0
---

# Common Commands (GitHub Copilot)

## Setup

- Install dependencies: pnpm install
- Generate GraphQL types: pnpm generate:graphql

## Development

- Frontend dev server: pnpm dev
- Backend apply: pnpm apply:backend
- Build: pnpm build

## Quality

- Lint: pnpm lint
- Format: pnpm format; check only: pnpm format:check
- Type check: pnpm check-types

## Tests

- All tests: pnpm test
- Coverage: pnpm test:coverage
- Backend Unit: pnpm test:unit
- Backend Integration: pnpm test:integration
- E2E: pnpm test:e2e

## Seed and Data

- Run seed: pnpm seed

## MCP (recommended)

- MCP list and when to use each: `.instruction/02_project/mcp.md`
- Check in VS Code (command palette):
  - `MCP: List Servers` (use `Start/Restart` if needed)
  - `MCP: Reset Cached Tools` (when tools do not appear)

> State whether each run succeeded or failed, and on failure give a log summary and the response.
