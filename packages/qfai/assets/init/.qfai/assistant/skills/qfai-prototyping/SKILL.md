<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-prototyping
title: QFAI Prototyping (Implement a runnable contract skeleton)
description: "Implement a minimal end-to-end runnable skeleton (UI + API + DB) based on contracts, before ATDD/TDD automation."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [FullStackEngineer, BackendEngineer, FrontendEngineer, DBEngineer, DevOpsCIEngineer, QAEngineer, RuntimeGatekeeper, UIUXReviewer, CodeReviewer]
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

- **Before writing or editing any `.qfai/**` artifact\*\*, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- **Do NOT copy** templates/samples into this prompt or into other prompt markdown.
- The generated artifacts must match the README-defined structure (headings, ordering, table columns).
- Completion requires a **Format Self-Check** in the evidence: list each artifact and confirm "matches README template".

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/delta.md` (Decision Records; if no spec yet, state "not applicable")
- P4: other artifacts (spec.md, scenario.feature, contracts, evidence)

## Stage 0 — Steering completion refresh (mandatory)

Before moving forward in this stage, refresh these files:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

Rules:

- Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, stale facts).
- Fill what is verifiable from repository evidence (tree, docs, require/spec artifacts, package.json, CI definitions).
- If something cannot be verified, record it as an Open Question and ask the user.
- Even if steering is already complete, update it when new facts are discovered in this stage.
## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- Do NOT implement acceptance tests or unit tests (that is `/qfai-atdd` and TDD phases).
- If `implementation-brief.md` exists, you MUST follow it as implementation constraints.
- If `implementation-brief.md` is missing, exploratory prototyping is allowed, but you MUST run `/qfai-sdd-planning` before downstream execution phases.
- You MUST produce the required evidence file: `.qfai/evidence/prototyping-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the dev server and perform manual verification.
- You MUST pass the Runtime Interaction Gate (boot + access + interaction) before completion.
- You MUST check UI layout sanity (no oversized primary buttons, no broken header/search rows).
- You MUST stop and escalate if runtime evidence or contract alignment is missing.
- Implementation must align with existing project conventions; do NOT introduce new frameworks.
- Completion must be approved by a reviewer who did not implement the code.

## Sub-agent policy (mandatory)

- If subagents are supported, Orchestrator MUST delegate: implementation (Frontend/Backend/DB), Runtime Gatekeeper, Reviewer (non-edit).
- Orchestrator must not implement directly when delegation is available.
- Evidence must include work orders and reviewer notes.
- If subagents are not supported, simulate role separation with explicit role sections.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Build a minimal runnable vertical slice from contracts so the app boots and users can perform at least one primary interaction.

## Non-goals

- Acceptance tests (use `/qfai-atdd`).
- Unit/component tests (use TDD phases).

## Mandatory Outputs

- Runnable skeleton implementation aligned with contracts
- Runtime Interaction Gate evidence (boot + access + interaction)
- Evidence file: `.qfai/evidence/prototyping-<spec-id>.md`
- Reviewer notes (PASS or concrete rework list)

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

#### UI layout guardrails (mandatory)

- Do NOT make primary buttons full-width by default; use a separate block variant when needed.
- Header rows: title and primary action stay on one line (no overflow or wrap).
- Search rows: input uses flex-grow; buttons are fixed width (shrink-0) so inputs do not collapse.
- If using Tailwind/@apply: define component classes in `@layer components` and avoid width in base button classes (separate `btn` vs `btn-block`).
- Empty/error states must be readable and not visually broken.

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

1. **Inventory contracts**: list UI routes, API endpoints, DB tables/constraints.
2. **Select minimal implementation strategy** based on detected stack:
   - If Next.js/React: implement pages and API routes accordingly.
   - If Express/Fastify/etc: implement server routes and connect frontend.
   - If unknown: choose the project’s existing conventions; do not introduce a new stack.
3. Implement UI routes first (avoid 404).
4. Implement API endpoints next (return stub JSON).
5. Implement DB skeleton and connect (or provide clear temporary store).
6. Run the dev server and perform a manual “happy path” click-through.

## Sub-agent assignments (required when supported)

- UI Skeleton Builder: FrontendEngineer (apply UI layout guardrails).
- API/DB Skeleton Builder: BackendEngineer + DBEngineer.
- Runtime Smoke Checker: RuntimeGatekeeper (boot/access/interaction evidence).
- UI/UX Reviewer: UIUXReviewer (layout sanity check).
- Reviewer: CodeReviewer (non-edit; PASS/FAIL only).

## Runtime Interaction Gate (mandatory)

You may declare completion only after capturing evidence for:

- Boot: `pnpm dev` (or equivalent) starts without errors.
- Access: main URL(s) render without runtime errors.
- Interaction: at least one user interaction succeeds (click/input/submit/navigation).
- Optional (recommended): Playwright smoke (`@smoke`) if available.

Record commands, logs, and interaction steps in evidence.

## Completion criteria (hard gate)

You may declare completion ONLY if:

- [ ] Dev server starts locally without errors (`pnpm dev` or project equivalent).
- [ ] Runtime Interaction Gate evidence is captured (boot/access/interaction).
- [ ] All UI routes declared in UI contracts are reachable (no 404).
- [ ] UI layout guardrails are satisfied (no oversized buttons; header/search rows intact).
- [ ] At least one end-to-end happy path works in the UI:
  - list screen loads data (stub OK),
  - create/edit screen submits and updates list (stub OK),
  - navigation works.
- [ ] All implemented API endpoints respond with status codes consistent with the contract.
- [ ] If Playwright smoke exists, `@smoke` passes (or document why it cannot run).
- [ ] Evidence file exists: `.qfai/evidence/prototyping-<spec-id>.md`
  - includes executed commands,
  - includes “Format Self-Check”,
  - includes a short manual verification log.

## Failure handling (mandatory)

- If blocked/unknown, stop and record a DR in delta.md (do not skip).
- If Runtime Interaction Gate fails, fix and re-run before declaring completion.

## Reviewer checklist (for CodeReviewer role)

- No test automation was added here.
- Implementation aligns with project conventions (no new framework added).
- UI/API/DB skeleton matches contract definitions.
- Runtime Interaction Gate evidence is present and reproducible.
- UI layout guardrails were checked (UI/UX reviewer sign-off).
- Completion criteria are objectively satisfied.

## Evidence (MANDATORY)

- Create evidence file: `.qfai/evidence/prototyping-<spec-id>.md`
- Include the following sections:
  1. **Contract Inventory**: list of UI routes, API endpoints, DB tables from contracts.
  2. **Implementation Summary**: what was implemented for each contract item.
  3. **Dev Server Startup**: commands executed and result.
  4. **Runtime Interaction Gate**: access + interaction steps with results.
  5. **UI Layout Sanity Check**: guardrails checked + screenshots/notes if available.
  6. **Manual Verification Log**: step-by-step click-through with observations.
  7. **Format Self-Check**: list each artifact and confirm "matches README template".

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions/steering and the delta.md spec-id
- DR-IDs referenced (or "none" + propose adding a Decision Record)
- Confirmation that no rejected options were reintroduced (or list RE-OPEN DR-IDs)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists: `.qfai/evidence/prototyping-<spec-id>.md`.
- [ ] Dev server starts without errors.
- [ ] All UI routes from contracts are reachable (no 404).
- [ ] All API endpoints respond with expected status codes.
- [ ] Manual verification log is complete.
- [ ] No test automation was added.
- [ ] Completion approved by a reviewer who did not implement the code.


