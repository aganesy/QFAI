# 01 Spec

- Spec: spec-0011
- Parent: CAP-0011
- Status: active

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
  - simplified `prototype-handoff.yaml` schema: `{finalIterIndex, finalArtifact, extractedDesignSystem, implementationNotes}` only (mustPreserve / mayAdapt / mustNotCopy triplets removed)
  - `design-system.yaml` consumed as input (deterministic mirror of DESIGN.md tokens; NOT a per-iter HTML extraction)
  - Orchestrated mode of `/qfai-implement` as a stage of a workflow run: its entry check, its Operations table, the run binding, the checkpoint resume and its stage result, in `references/orchestrated-mode.md`
  - The diagnose-only operation and its four verdicts
  - `regression_fix` against a `done` row whose existing, correct test caught a regression
  - The seam-only work order of the ATDD round trip
  - `test_fix` for a defective `Unit` or `Component` test, or an `Integration` test whose TCs are all `L1` or `L2`
  - The two scope-gap lines of `/qfai-implement` that carve out a diagnosed missing test (`references/change-request-reset.md` and `SKILL.md`)
- Out:
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Acceptance tests (belongs to `/qfai-atdd`)
  - Validation gates (belongs to `/qfai-verify`)
  - Parallel execution across multiple specs simultaneously
  - The workflow core, the built-in plans, the shipped schemas and the entry skills (spec-0018)
  - The rules every stage skill shares: descriptions as trigger conditions, one orchestrated-mode reference per skill, Stage 0 shared-snapshot reuse, and the drift-protocol carve-out (spec-0001)
  - The ATDD side of the seam-only round trip, and `test_fix` for `E2E`, `API` and other `Integration` rows (spec-0008)
  - Appending the missing-test row a diagnosis calls for, through Phase 2b defect row seeding (spec-0013)

## Applicable Contracts

| Contract   | File                                           | Governs here                                                                                     |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CLI-WF     | `.qfai/contracts/cli/qfai-workflow.md`         | `### Work order`, `### Stage result`, `## Ledger row-set check`, `### host:stage-skill-handover` |
| CLI-WFFILE | `.qfai/contracts/cli/workflow-files.schema.md` | `### Vocabulary` and `### The Operations table`                                                  |

The CLI contracts declare no `CON-*` ID. `04_Business-Rules.md` names the contract
section each rule is realized by in `## Contract Realization`.

## Applicable NFR

- NFR-0001: Serial execution -- items processed one test at a time by default
- NFR-0002: Forward-only lifecycle -- backward transitions prohibited (e.g., green -> red)
- NFR-0003: Fresh evidence -- stale evidence from previous runs must not be reused
- NFR-0004: QA gatekeeper authority -- sole authority for RED/GREEN observation confirmation; implementation self-certification prohibited
- NFR-0005: Reviewer independence -- implementation workers cannot serve as their own completion/code-quality reviewers
- `discussion-20260923171450572#NFR-0003`: `qfai-implement/SKILL.md` grows by at most the one line citing `references/orchestrated-mode.md`, from 799 to exactly 800 of its 800 lines. Every other edit to that file replaces text in place, the two scope-gap lines included. Measured, not tested: the 800-line asset budget guard holds the ceiling, and review of the diff holds the one line. No rule states it.

## Applicable Policy

- Policy: Drift Protocol mandatory
- Test-first: write failing test before production code
- Minimal code: write minimum production code to make test pass
- `_policies/08_Decisions.md` DR-0297: a diagnosed missing-test row is appended by `/qfai-sdd` without a Change Request, and this skill never seeds a row
- A defective unit-layer test is fixed with ledger status untouched (DR-0011-0003)
- A regression on a `done` row is fixed in production code, and the row stays `done` (DR-0011-0004)

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

### discussion-20260923171450572 (2026-09-24)

The requirements of this spec's rows in `## Triage (2026-09-24 intent-driven entry)`
of `09_delta.md`. The IDs are the pack's, so they are written with the pack
half; the local list above keeps its own numbering.

| Requirement                             | Home                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `discussion-20260923171450572#REQ-0013` | CLI-WF `### Work order`; BR-0011-0011                                                            |
| `discussion-20260923171450572#REQ-0034` | CLI-WF `### Work order`; BR-0011-0012                                                            |
| `discussion-20260923171450572#REQ-0038` | CLI-WF `### Stage result`; BR-0011-0014                                                          |
| `discussion-20260923171450572#REQ-0045` | CLI-WF `### Stage result`; BR-0011-0015, BR-0011-0016                                            |
| `discussion-20260923171450572#REQ-0046` | CLI-WF `## Ledger row-set check`; BR-0011-0017, BR-0011-0018, BR-0011-0019                       |
| `discussion-20260923171450572#REQ-0048` | CLI-WF `### Stage result`; CLI-WFFILE `### Vocabulary`; BR-0011-0020, BR-0011-0021, BR-0011-0022 |
| `discussion-20260923171450572#REQ-0051` | CLI-WF `### host:stage-skill-handover`; BR-0011-0009                                             |
| `discussion-20260923171450572#REQ-0052` | CLI-WFFILE `### The Operations table`; BR-0011-0010                                              |
| `discussion-20260923171450572#REQ-0056` | BR-0011-0013                                                                                     |
| `discussion-20260923171450572#NFR-0003` | `## Applicable NFR` above; measured, no rule                                                     |

## Entry points

- US range in this spec: US-0011-0001..US-0011-0012
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
