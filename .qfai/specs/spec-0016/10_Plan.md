# 10 Implementation Plan — spec-0016 (Development Toolkit Hardening)

> **How-only.** What and Why live in 01_Spec.md. This file is the single source of truth for implementation order, test strategy, and risk mitigation.

---

## 1. Implementation Strategy

All changes are delivered in a single PR (NFR-0001: 1 version = 1 PR). Steps are ordered by technical dependency; each step must be complete before the next begins unless explicitly noted as parallelizable.

### Step 1: Update `qfai-implement/SKILL.md` — sub-agent roster, completion contract, evidence contract, parallel dispatch rules

**Path**: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md`

**Covers**: REQ-0001, REQ-0002, REQ-0003, REQ-0004, REQ-0005, REQ-0006

**Details**:

- Add a formal sub-agent roster section defining all 6 named sub-agents: `TDDCycleController`, `TDDImplementer`, `RedGreenAuditor`, `TDDSpecReviewer`, `TDDCodeQualityReviewer`, `ParallelSliceDispatcher`.
- For each sub-agent, declare: responsibilities, prohibitions, and handoff contracts (all 8 agent-to-agent transitions).
- Add item completion contract: 10-point checklist (TDD-ID selected, failing test added, RED observed, minimal code written, GREEN observed, refactor+re-green, TDDSpecReviewer PASS, TDDCodeQualityReviewer PASS, test-list.md updated, checkpoint verification passed).
- Add spec completion conditions: all unit/component TC-\* in test-list.md, all done or valid exception with DR-ID, 0 blocking reviewer issues, checkpoint verify pass, no unresolved CR/waiver.
- Add completion prohibition conditions: no RED evidence, no GREEN evidence, reviewer not run or FAIL, items still in progress, parallel slice integration verify not run, checkpoint boundary not verified.
- Add evidence contract: free-text + labeled fields format; TDD-ID, TC-ref, RED command+result, GREEN command+result, refactor-verify command+result, TDDSpecReviewer result, TDDCodeQualityReviewer result; status-only evidence is invalid.
- Add parallel dispatch rules: allow conditions (independent SUT, test files, state, no sequential dependency, worktree separation, post-merge integration verify plan);
  deny conditions (same behavior R/G/R, same API surface, shared fixture/mock/DI/global setup, unexplained independence claim);
  ParallelSliceDispatcher is sole authority for dispatch authorization.
- Required phrases that must appear in SKILL.md: `watch it fail`, `watch it pass`, `fresh evidence`, `spec review`, `code quality review`, `one test at a time`, `parallel`, `independent`.
- Forbidden phrases that must not appear: `qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor`, `write all tests first`, `implement later`, `80% coverage required`, `minimum N tests`.

**Depends on**: nothing (first step).

---

### Step 2: Docs synchronization — `.qfai/README.md` and `workflow.md`

**Paths**:

- `packages/qfai/assets/init/.qfai/README.md`
- `packages/qfai/assets/init/.qfai/assistant/instructions/workflow.md`
- `.qfai/README.md` (local instance)
- `.qfai/assistant/instructions/workflow.md` (local instance)

**Covers**: REQ-0007

**Details**:

- Update `README.md` references to `qfai-implement`: add behavior-only language stating failing test / watch-it-fail / watch-it-pass / reviewer gates / evidence requirements; do not expose sub-agent names per OQ-0005 resolution.
- Update `workflow.md` to align handoff descriptions with the hardened completion contract in SKILL.md.
- Ensure all 8 required phrases exist in updated docs and no forbidden phrases are introduced.
- Local instances (`.qfai/`) must mirror asset templates exactly.

**Depends on**: Step 1 (canonical skill body must be final before syncing docs).

---

### Step 3: Wrapper synchronization — `.agents`, `.claude`, `.codex`, conditional `.github`

**Paths**:

- `.agents/**` wrapper for `qfai-implement`
- `.claude/commands/**` wrapper for `qfai-implement`
- `.codex/**` wrapper for `qfai-implement`
- `.github/**` — update only if `qfai-implement` references exist there (per OQ-0004 resolution)
- Corresponding asset templates under `packages/qfai/assets/init/`

**Covers**: REQ-0008

**Details**:

- Update `qfai-implement` description in each platform wrapper to use behavior-only language: watch-it-fail, watch-it-pass, reviewer gates, evidence. Do not include sub-agent names in wrapper descriptions.
- Remove any old shortcut wording or stale completion descriptions.
- All three platform wrappers (`.agents`, `.claude`, `.codex`) must contain the same required phrases; wrapper parity drift must equal 0 (NFR-0002).
- Check `.github` directory for `qfai-implement` references; update if found, skip if absent.
- Asset template counterparts must be updated in the same commit as the local wrappers (atomic update per NFR-0002).

**Depends on**: Step 2 (doc wording must be stable before wrapper descriptions are finalized).

---

### Step 4: Asset tests — required phrase guardrails (×8) and forbidden phrase guardrails (×7)

**Path**: `packages/qfai/tests/assets/assets.test.ts`

**Covers**: REQ-0009, REQ-0010

**Details**:

- Add or update test assertions for 8 required phrases across SKILL.md and wrappers:
  1. `watch it fail`
  2. `watch it pass`
  3. `fresh evidence`
  4. `spec review`
  5. `code quality review`
  6. `one test at a time`
  7. `parallel`
  8. `independent`
- Add or update test assertions that 7 forbidden phrases are absent:
  1. `qfai-tdd-red`
  2. `qfai-tdd-green`
  3. `qfai-tdd-refactor`
  4. `write all tests first`
  5. `implement later`
  6. `80% coverage required`
  7. `minimum N tests`
- Assertions must identify both phrase and file location on failure.
- Tests must be idempotent: two consecutive runs produce identical results.
- Wrapper parity assertion: verify all three platform wrappers pass required phrase checks identically.

**Depends on**: Step 3 (all target files must be updated before adding guardrails against them).

---

### Step 5: Verify-pack and init tests update

**Paths**:

- `scripts/verify-pack.mjs`
- `packages/qfai/tests/cli/init.test.ts`

**Covers**: REQ-0011, NFR-0001

**Details**:

- Run `scripts/verify-pack.mjs`; fix any packaging integrity failures caused by SKILL.md or wrapper changes.
- Update `init.test.ts` expectations to reflect any structural changes introduced in Steps 1–4.
- Confirm `qfai validate` reports no new errors against the updated files.
- Confirm non-implementation skill tests pass unchanged (NFR-0003 backward compatibility).

**Depends on**: Step 4 (all file changes and asset test guardrails must be in place before verifying packaging).

---

### Step 6: Optional — validator warning diagnostics

**Path**: `packages/qfai/src/core/validators/specPack.ts` (and/or `packages/qfai/src/core/report/*`)

**Covers**: REQ-0012 (Could)

**Details**:

- Add non-blocking warning diagnostics (warning, not hard error) for:
  - `Selector` not found in the target test file
  - Orphan test candidate (test file with no TC mapping)
  - Invalid layer value (anything outside `unit|component` for Phase 1 validators)
  - Ambiguous multi-row `TC-*` mapping in `test-list.md`
  - Evidence ref missing: `Status=done` but `Evidence` column is empty
- These are informational; they must not block `qfai validate --fail-on error`.
- Step is optional; skip if time or scope pressure arises.

**Depends on**: Step 5 (core delivery must be complete before optional extensions).

---

### Step 7: Orphan reference cleanup

**Covers**: REQ-0007, REQ-0008, NFR-0002, NFR-0004

**Details**:

- Execute full-text search across the repository for old shortcut wording and any stale `qfai-implement` descriptions that predate v1.6.2 contracts.
- Search targets: `packages/`, `.qfai/assistant/`, `.agents/`, `.claude/`, `.codex/`, `scripts/`, `tests/`.
- Exclusions from enforcement: `CHANGELOG.md`, `.qfai/discussion/`, `.qfai/specs/spec-0016/` (this spec's own documentation may reference old wording descriptively).
- Confirm forbidden phrase grep hit count = 0 in all canonical asset paths after cleanup.
- Confirm `qfai validate` and `verify-pack.mjs` both pass after cleanup.

**Depends on**: Steps 1–5 (all file updates must be complete before the sweep).

---

## 2. Test Strategy

### 2.1 Layer assignment

Per `test-layers.md` (`.qfai/assistant/steering/test-layers.md`):

| Layer          | TC/US IDs                                                             | Scope                                                                                      | Location               |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- |
| L3 Integration | TC-0016-0001 through TC-0016-0021, TC-0016-0029                       | Spec behavior: sub-agent roster, completion contract, evidence contract, parallel dispatch | `tests/integration/**` |
| L4 API         | None                                                                  | Not applicable — QFAI is a CLI tool; no HTTP/gRPC service contracts                        | —                      |
| L5 E2E         | TC-0016-0022 through TC-0016-0028 (US-0016-0001 through US-0016-0005) | Full workflow: asset tests, wrapper parity, verify-pack, phrase guardrails                 | `tests/e2e/**`         |

### 2.2 L3 Integration test file mapping

| Test file                    | TC IDs covered                                                                                   | Scope                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `skillRoster.test.ts`        | TC-0016-0001, TC-0016-0002, TC-0016-0003, TC-0016-0004                                           | Sub-agent roster completeness, handoff contracts, RedGreenAuditor authority, watch-it-fail enforcement                                |
| `completionContract.test.ts` | TC-0016-0005, TC-0016-0006, TC-0016-0007, TC-0016-0008, TC-0016-0009, TC-0016-0010, TC-0016-0011 | 10-point checklist, completion blocking conditions, reviewer gates, spec completion                                                   |
| `evidenceContract.test.ts`   | TC-0016-0012, TC-0016-0013, TC-0016-0014, TC-0016-0015                                           | Evidence acceptance/rejection, status-only rejection, truncated result acceptance                                                     |
| `parallelDispatch.test.ts`   | TC-0016-0016, TC-0016-0017, TC-0016-0018, TC-0016-0019, TC-0016-0020, TC-0016-0021, TC-0016-0029 | Independent slice dispatch, dependency blocking, worktree requirement, integration verify, bypass blocking, single-slice degeneration |

### 2.3 L5 E2E test file mapping

| Test file                  | US IDs / TC IDs covered                                               | Scope                                                                                  |
| -------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `phraseGuardrails.test.ts` | US-0016-0005 / TC-0016-0022, TC-0016-0023, TC-0016-0024, TC-0016-0027 | Required phrase presence, forbidden phrase detection, idempotency, fix-and-rerun cycle |
| `wrapperParity.test.ts`    | US-0016-0005 / TC-0016-0025, TC-0016-0026                             | Wrapper parity across .agents/.claude/.codex, behavior-only language check             |
| `verifyPack.e2e.ts`        | US-0016-0005 / TC-0016-0028                                           | verify-pack pass after all v1.6.2 changes                                              |
| `skillRosterE2E.test.ts`   | US-0016-0001, US-0016-0002, US-0016-0003, US-0016-0004                | Full workflow validation: SKILL.md hardened contracts from end-to-end perspective      |

### 2.4 Annotation schema

All L3 Integration test files carry `QFAI:SPEC-0016:TC-XXXX` annotations:

```typescript
// QFAI:SPEC-0016:TC-0016-0001
// QFAI:SPEC-0016:TC-0016-0002
describe("sub-agent roster completeness and handoff contracts", () => { ... });
```

All L5 E2E test files carry `QFAI:SPEC-0016:US-XXXX` annotations:

```typescript
// QFAI:SPEC-0016:US-0016-0005
describe("E2E: phrase guardrails idempotency", () => { ... });
```

- AC annotations are optional; indirect coverage through TC is acceptable per test-layers.md.
- `tests/e2e/**` must not carry `QFAI:SPEC-0016:TC-XXXX` annotations (forbidden reference per test-layers.md).
- Unknown TC/US references (not declared in `06_Test-Cases.md` or `02_User-stories.md`) are errors.

### 2.5 Coverage obligations

- Every TC-0016-0001 through TC-0016-0029 must appear in at least one `tests/integration/**` annotation.
- Every US-0016-0001 through US-0016-0005 must appear in at least one `tests/e2e/**` annotation.
- No test file may reference a TC-ID or US-ID not defined in spec-0016 artifacts.

---

## 3. Risk & Mitigation

### Risk 1: Half-migration state

**Risk**: SKILL.md updated with hardened contracts but wrappers or docs still carry old descriptions, leaving a partial migration state where enforcement is inconsistent across artifacts.

**Mitigation**:

- Steps 1–3 are sequentially ordered; wrapper sync (Step 3) cannot begin until docs sync (Step 2) is complete, which cannot begin until SKILL.md (Step 1) is final.
- All files are delivered in a single PR (NFR-0001).
- Asset test guardrails (Step 4) and wrapper parity assertions catch any drift before merge.
- Orphan reference sweep (Step 7) provides a final sweep after all changes.
- `verify-pack.mjs` (Step 5) surfaces structural packaging failures.

### Risk 2: Backward compatibility regression

**Risk**: v1.6.0 and v1.6.1 validator tests fail due to wording changes in SKILL.md or wrappers.

**Mitigation**:

- v1.6.2 adds content to SKILL.md (new sections) rather than replacing existing TDD micro-cycle logic; existing validator checks remain valid.
- Step 5 explicitly runs the full test suite and fixes any regressions before marking the step complete.
- NFR-0003 (all existing validator tests pass without modification) is a hard gate for the PR.
- Required phrases added in v1.6.2 (`watch it fail`, `watch it pass`, etc.) were already present in v1.6.0's SKILL.md; adding guardrails for them cannot cause backward failures.

### Risk 3: Scope creep

**Risk**: Implementation expands into evidence schema versioning, wrapper framework generalization, generic spec-lint, or coverage numerical targets — all deferred to v1.6.3+.

**Mitigation**:

- Step 6 (validator diagnostics) is explicitly optional (REQ-0012 is Could priority); skip if scope pressure arises.
- Out-of-scope items from `01_Spec.md` are referenced in each step's Details to make exclusion explicit.
- NFR-0004 (0 unrelated file changes in PR diff) is a hard gate; any unrelated change is a merge blocker.

### Risk 4: `.github` conditional update ambiguity

**Risk**: Step 3 requires a conditional `.github` update; implementer uncertainty about the condition could cause an unintended skip or an unintended change.

**Mitigation**:

- Condition is explicit per OQ-0004: search `.github/` for `qfai-implement` references; update only if found.
- If `.github/` is absent or contains no `qfai-implement` reference, no change is made and no error is raised.
- Orphan sweep (Step 7) covers `.github/` for forbidden phrases; any missed update will surface there.

### Risk 5: CI time budget

**Risk**: New asset test assertions increase CI time beyond the 10% delta allowed by NFR-0005.

**Mitigation**:

- Required/forbidden phrase checks are synchronous string searches over small files; execution time is negligible.
- NFR-0005 is verified in Step 5 as part of the full test run; any violation is addressed before merge.

---

## 4. Dependencies

### 4.1 External dependencies

None. No new npm packages required.

### 4.2 Internal dependencies

| Dependency                                     | Usage                                              | Already exists |
| ---------------------------------------------- | -------------------------------------------------- | -------------- |
| `packages/qfai/tests/assets/assets.test.ts`    | Extend with required/forbidden phrase guardrails   | Yes            |
| `scripts/verify-pack.mjs`                      | Packaging integrity verification after all changes | Yes            |
| `packages/qfai/tests/cli/init.test.ts`         | Update expectations for structural changes         | Yes            |
| Wrapper files (`.agents`, `.claude`, `.codex`) | Platform wrapper sync                              | Yes            |
| `packages/qfai/assets/init/` counterparts      | Asset template sync                                | Yes            |

### 4.3 Cross-spec dependencies

- spec-0014 (qfai-implement introduction, v1.6.0): SKILL.md created in spec-0014 is the file updated in Step 1 of this plan. No spec-0014 logic is removed; v1.6.2 adds sections.
- spec-0015 (test-list.md hardening, v1.6.1): validator Phase 2 introduced there is not modified by v1.6.2. Optional Step 6 extends `specPack.ts` with warning diagnostics only.
- No dependency on other in-flight specs.

---

## 5. Delivery

- **Single PR**: all 7 steps (Steps 1–5 mandatory; Step 6 optional; Step 7 mandatory) in one atomic PR per NFR-0001.
- **Branch**: `feature/v1.6.2` (current branch).
- **Pre-merge gates**:
  - `npm test` / `vitest run` passes
  - `scripts/verify-pack.mjs` passes
  - `qfai validate --fail-on error` passes
  - Asset test required phrase assertions pass (×8)
  - Asset test forbidden phrase assertions pass (×7)
  - Wrapper parity drift = 0 (NFR-0002)
  - Orphan phrase grep = 0 in canonical assets (NFR-0004)
  - All existing validator tests pass without modification (NFR-0003)
  - CI time delta < 10% (NFR-0005)
- **Post-merge verification**: confirm SKILL.md contains sub-agent roster; confirm all three platform wrappers contain required phrases; confirm forbidden phrases absent from all canonical assets.

---

## 6. Acceptance Gate Criteria

Pre-merge gates (referenced from 01_Spec.md):

- `npm test` / `vitest run` passes
- `scripts/verify-pack.mjs` passes
- `qfai validate --fail-on error` passes
- Asset test required phrase assertions pass (×8)
- Asset test forbidden phrase assertions pass (×7)
- Wrapper parity drift = 0 (NFR-0002)
- Orphan phrase grep = 0 in canonical assets (NFR-0004)
- All existing validator tests pass without modification (NFR-0003)
- CI time delta < 10% (NFR-0005)

---

## 7. New/Modified File Summary

### Modified files

| File                                                                       | Step | Change                                                                                |
| -------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md` | 1    | Add sub-agent roster, completion contract, evidence contract, parallel dispatch rules |
| `.qfai/assistant/skills/qfai-implement/SKILL.md` (local instance)          | 1    | Mirror asset template changes                                                         |
| `packages/qfai/assets/init/.qfai/README.md`                                | 2    | Sync behavior-only language with SKILL.md contracts                                   |
| `.qfai/README.md` (local instance)                                         | 2    | Mirror asset template changes                                                         |
| `packages/qfai/assets/init/.qfai/assistant/instructions/workflow.md`       | 2    | Align handoff descriptions with hardened completion contract                          |
| `.qfai/assistant/instructions/workflow.md` (local instance)                | 2    | Mirror asset template changes                                                         |
| `.agents/**` `qfai-implement` wrapper                                      | 3    | Sync behavior-only description; remove old shortcut wording                           |
| `.claude/commands/**` `qfai-implement` wrapper                             | 3    | Sync behavior-only description; remove old shortcut wording                           |
| `.codex/**` `qfai-implement` wrapper                                       | 3    | Sync behavior-only description; remove old shortcut wording                           |
| Corresponding `packages/qfai/assets/init/` wrapper counterparts            | 3    | Mirror local wrapper changes                                                          |
| `.github/**` (conditional)                                                 | 3    | Update only if `qfai-implement` references exist                                      |
| `packages/qfai/tests/assets/assets.test.ts`                                | 4    | Add required/forbidden phrase guardrail assertions                                    |
| `scripts/verify-pack.mjs`                                                  | 5    | Fix any packaging integrity failures from Steps 1–4                                   |
| `packages/qfai/tests/cli/init.test.ts`                                     | 5    | Update expectations for structural changes                                            |
| `packages/qfai/src/core/validators/specPack.ts` (optional)                 | 6    | Add non-blocking warning diagnostics                                                  |

### New files

| File                                           | Step | Purpose                                                            |
| ---------------------------------------------- | ---- | ------------------------------------------------------------------ |
| `tests/integration/skillRoster.test.ts`        | 4    | L3: TC-0016-0001 through TC-0016-0004                              |
| `tests/integration/completionContract.test.ts` | 4    | L3: TC-0016-0005 through TC-0016-0011                              |
| `tests/integration/evidenceContract.test.ts`   | 4    | L3: TC-0016-0012 through TC-0016-0015                              |
| `tests/integration/parallelDispatch.test.ts`   | 4    | L3: TC-0016-0016 through TC-0016-0021, TC-0016-0029                |
| `tests/e2e/phraseGuardrails.test.ts`           | 4    | L5: US-0016-0005 / TC-0016-0022 through TC-0016-0024, TC-0016-0027 |
| `tests/e2e/wrapperParity.test.ts`              | 4    | L5: US-0016-0005 / TC-0016-0025, TC-0016-0026                      |
| `tests/e2e/verifyPack.e2e.ts`                  | 5    | L5: US-0016-0005 / TC-0016-0028                                    |
| `tests/e2e/skillRosterE2E.test.ts`             | 4    | L5: US-0016-0001 through US-0016-0004                              |
