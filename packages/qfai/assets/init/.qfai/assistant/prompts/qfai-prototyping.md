<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->
---

id: qfai-prototyping
title: QFAI Prototyping (Implement a runnable contract skeleton)
description: "Implement a minimal end-to-end runnable skeleton (UI + API + DB) based on contracts, before ATDD/TDD automation."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [FullStackEngineer, BackendEngineer, FrontendEngineer, DBEngineer, DevOpsCIEngineer, QAEngineer, CodeReviewer]
mode: execution-focused

---

# /qfai-prototyping

Build a **minimum runnable vertical slice** from `.qfai/contracts/**` so that:
- developers can start the app locally (`pnpm dev` or equivalent),
- the UI is navigable (no 404 on routes declared in UI contracts),
- the API responds for paths declared in OpenAPI contracts,
- persistence exists at least as a working skeleton (real DB or a clearly marked temporary store),
- the project is ready for `/qfai-atdd` automation.

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow the relevant directory README template and sample:
  - `.qfai/contracts/**/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
- Do NOT copy templates/samples into this prompt.
- Completion requires a **Format Self-Check** in the evidence.

## Inputs (read first)

- `.qfai/contracts/ui/*.yaml` (routes/screens/elements/actions)
- `.qfai/contracts/api/*.yaml` (OpenAPI)
- `.qfai/contracts/db/*.sql` (schema constraints)
- `.qfai/specs/<spec-id>/spec.md` + `delta.md` (scope + decisions)
- `.qfai/specs/<spec-id>/scenario.feature` (for “what users do”, but do NOT implement tests here)

## Output boundaries

- ✅ You MAY implement application code required for a runnable skeleton.
- ✅ You MAY add minimal wiring/config (env examples, local DB setup scripts, dev server config).
- ✅ You MAY add minimal “smoke scripts” (e.g., `scripts/smoke.ts`) if they help manual verification.
- ❌ Do NOT implement acceptance tests here (that is `/qfai-atdd`).
- ❌ Do NOT implement unit/component tests here (that is TDD phases).
- ❌ Do NOT change `.qfai/**/README.md` content. They are templates and remain SSOT.

## Mission (what “prototype” means)

Implement the following **contract-satisfying skeleton**, aiming for the smallest viable integration:

### 1) UI skeleton
- For every screen/route in `contracts/ui/*.yaml`:
  - create a page/route that renders and is reachable,
  - include placeholder components for declared elements (table/input/button),
  - implement declared navigation actions (links/buttons).

### 2) API skeleton
- For every endpoint in `contracts/api/*.yaml` used by the spec pack:
  - implement the route handler,
  - return realistic stub responses aligned with schemas,
  - implement minimal error shape (e.g., validation error payload) if contracts imply it.

### 3) DB skeleton
- Apply or integrate the SQL contracts:
  - if project uses migrations: add migration(s) from `contracts/db/*.sql`,
  - else: create schema setup script with explicit instructions.
- If using a temporary in-memory store initially, it MUST be:
  - documented in code comments,
  - shaped to match the DB contract schema,
  - replaceable by real DB without rewriting the whole app.

### 4) Wiring & dev experience
- Ensure local startup works:
  - `pnpm install`
  - `pnpm dev`
- Add or update minimal documentation under project README (outside `.qfai/`) if needed for running the skeleton.

## Work process (required)

1) **Inventory contracts**: list UI routes, API endpoints, DB tables/constraints.
2) **Select minimal implementation strategy** based on detected stack:
   - If Next.js/React: implement pages and API routes accordingly.
   - If Express/Fastify/etc: implement server routes and connect frontend.
   - If unknown: choose the project’s existing conventions; do not introduce a new stack.
3) Implement UI routes first (avoid 404).
4) Implement API endpoints next (return stub JSON).
5) Implement DB skeleton and connect (or provide clear temporary store).
6) Run the dev server and perform a manual “happy path” click-through.

## Completion criteria (hard gate)

You may declare completion ONLY if:

- [ ] Dev server starts locally without errors (`pnpm dev` or project equivalent).
- [ ] All UI routes declared in UI contracts are reachable (no 404).
- [ ] At least one end-to-end happy path works in the UI:
  - list screen loads data (stub OK),
  - create/edit screen submits and updates list (stub OK),
  - navigation works.
- [ ] All implemented API endpoints respond with status codes consistent with the contract.
- [ ] Evidence file exists: `.qfai/evidence/qfai-prototyping-<spec-id>.md`
  - includes executed commands,
  - includes “Format Self-Check”,
  - includes a short manual verification log.

## Reviewer checklist (for CodeReviewer role)

- No test automation was added here.
- Implementation aligns with project conventions (no new framework added).
- UI/API/DB skeleton matches contract definitions.
- Completion criteria are objectively satisfied.
