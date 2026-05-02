# 01 Spec

- Spec: spec-0011
- Parent: CAP-0011
- Status: active
- Superseded-by: -
- Deprecated-at: -

## Consumer View

- Primary SSOT for execution: `spec-0011/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-implement` unified TDD micro-cycle skill
  - One-test-at-a-time serial execution from `test-list.md` ledger
  - Strict TDD lifecycle: `todo` -> `red` -> `green` -> `refactor` -> `done`
  - `exception` status with mandatory DR-ID
  - Backward transition prohibition
  - Routed sub-agent set (delivery-planner, frontend-engineer/backend-engineer, qa-gatekeeper, completion-reviewer, implementation-reviewer, product-surface-reviewer)
  - 8 handoff contracts between agents
  - 10-point item completion gate
  - Evidence contract with per-item fresh evidence (RED/GREEN command+result)
  - Parallelization policy (independent SUT slices only, with worktree separation)
  - Visual Review Guard for UI-affecting items
- Out:
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Acceptance tests (belongs to `/qfai-atdd`)
  - Validation gates (belongs to `/qfai-verify`)
  - Parallel execution across multiple specs simultaneously

## Applicable NFR

- NFR-0001: Serial execution -- items processed one test at a time by default
- NFR-0002: Forward-only lifecycle -- backward transitions prohibited (e.g., green -> red)
- NFR-0003: Fresh evidence -- stale evidence from previous runs must not be reused
- NFR-0004: QA gatekeeper authority -- sole authority for RED/GREEN observation confirmation; implementation self-certification prohibited
- NFR-0005: Reviewer independence -- implementation workers cannot serve as their own completion/code-quality reviewers

## Applicable Policy

- Policy: Drift Protocol mandatory
- Test-first: write failing test before production code
- Minimal code: write minimum production code to make test pass

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md`
- Consolidates: old spec-0014 (TDD unification), spec-0015 (Guardrail Hardening), spec-0016 (Dev Toolkit Hardening)

## Relevant Requirements

- REQ-0001: Single implementation entry point -- `/qfai-implement` replaces old 3-skill TDD workflow
- REQ-0002: Strict TDD micro-cycle -- Red (write failing test) -> Green (minimal code) -> Refactor -> Done
- REQ-0003: test-list.md execution ledger -- 8-column table (TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence)
- REQ-0004: Forward-only status lifecycle -- `todo` -> `red` -> `green` -> `refactor` -> `done` (no backward transitions)
- REQ-0005: Exception handling -- `exception` status requires DR-ID in DR-ID column
- REQ-0006: Routed sub-agent roster -- delivery-planner, implementation workers, qa-gatekeeper, completion-reviewer, implementation-reviewer, optional product-surface-reviewer
- REQ-0007: 8 handoff contracts -- defined transitions between all agent pairs
- REQ-0008: 10-point item completion gate -- all conditions must be satisfied before `done`
- REQ-0009: Per-item evidence contract -- TDD-ID, TC-ref, RED command+result, GREEN command+result, refactor verify, reviewer results
- REQ-0010: Parallelization policy -- independent SUT slices only, worktree separation, post-merge integration verify
- REQ-0011: Visual Review Guard -- DDP-first reading for UI-affecting items

## Entry points

- US range in this spec: US-0011-0001..US-0011-0006
- Primary actors: Developer, AI Agent (frontend-engineer / backend-engineer), CI/CD pipeline
- Notes: Each item goes through full Red/Green/Refactor cycle before the next item starts

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: test granularity vs implementation speed must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
