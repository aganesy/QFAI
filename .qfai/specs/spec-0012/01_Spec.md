# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- NOTE: The CLI command `qfai prototyping` has been REMOVED. This spec covers the SKILL (`/qfai-prototyping`) only.

## Scope

- In:
  - `/qfai-prototyping` skill workflow (SKILL only, no CLI command)
  - All-spec stage: scope is ALL specs from `.qfai/specs/spec-*`
  - Spec Auto-Discovery Protocol (4-source unified diff detection: branch diff, local changes, evidence mtime, delta.md parse)
  - Prototyping modes: low-cost (static only), standard (static + optional light validation, default), full-harness (runtime-heavy, opt-in)
  - Mode selection protocol: user-specified > discussion recommendation > system default (standard)
  - Definition of Done by fidelity level: L1 (skeleton), L2 (interactive, default)
  - Coverage Matrix for all specs (uiRoutes, apiEndpoints, dbObjects)
  - Runtime Interaction Gate v2 (UI route checks, API endpoint checks, DB object checks, mock path checks)
  - Full-harness workflow loop (Planner -> Generator -> Evaluator -> Decision Gate)
  - Non-UI project handling (surface: non-ui skips UI-specific obligations)
  - Visual Review Guard (DDP -> Design Token -> UI Contract -> HTML Mock -> Flow)
  - Evidence production: markdown + JSON artifacts under `.qfai/evidence/`
  - `prototyping.json` with `uiFidelity` for L2 reporting
- Out:
  - CLI command `qfai prototyping` (REMOVED)
  - Acceptance test automation (belongs to `/qfai-atdd`)
  - Unit/component tests (belongs to `/qfai-implement`)
  - Contract redesign during prototyping

## Applicable NFR

- NFR-0001: All-spec coverage -- every spec from `.qfai/specs/spec-*` must be covered in Coverage Matrix
- NFR-0002: Static-first default -- standard mode requires no browser or server process
- NFR-0003: API runtime gate -- zero 404 results in API endpoint checks
- NFR-0004: No placeholder pages -- placeholder-only pages are marked REVISE, not accepted
- NFR-0005: L2 fidelity default -- declared primary interactions wired with mockable behavior

## Applicable Policy

- Policy: Drift Protocol mandatory
- Contracts are strict inputs; do not create new files under `.qfai/contracts/**`
- Full-harness mode must be explicitly opted in (never auto-activated)

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`
- Consolidates: old spec-0006 (prototyping CLI), spec-0024 (render evidence), spec-0028-0033 (runtime/harness), spec-0035 (canonical), spec-0036 (foundation)
- NOTE: CLI command `qfai prototyping` has been removed from codebase

## Relevant Requirements

- REQ-0001: All-spec prototyping -- scope fixed to ALL specs from `.qfai/specs/spec-*`
- REQ-0002: Spec Auto-Discovery -- 4-source unified diff detection (branch, local, evidence mtime, delta.md)
- REQ-0003: Mode definitions -- low-cost (static), standard (default), full-harness (opt-in)
- REQ-0004: Mode selection protocol -- user > discussion recommendation > system default
- REQ-0005: L1/L2 fidelity DoD -- skeleton (L1) vs interactive (L2 default)
- REQ-0006: Coverage Matrix -- uiRoutes, apiEndpoints, dbObjects per spec
- REQ-0007: Runtime Gate v2 -- UI/API/DB/mock path checks
- REQ-0008: Full-harness loop -- Planner -> Generator -> Evaluator -> Decision Gate
- REQ-0009: Non-UI handling -- non-ui surface skips UI obligations
- REQ-0010: Evidence artifacts -- markdown + JSON with uiFidelity for L2
- REQ-0011: Visual Review Guard -- DDP-first reading for UI-affecting slices

## Entry points

- US range in this spec: US-0012-0001..US-0012-0007
- Primary actors: Developer, AI Agent (FullStackEngineer, RuntimeGatekeeper), CI/CD pipeline
- Notes: No CLI command exists. This is a skill-only spec for `/qfai-prototyping`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: fidelity depth vs execution speed must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
