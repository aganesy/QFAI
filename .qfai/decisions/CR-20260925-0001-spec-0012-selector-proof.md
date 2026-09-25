# Change Request

- ID: `CR-20260925-0001`
- Title: `Completed spec-0012 rows select no executable test`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-24T20:50:04Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (Claude Code structured question)`
- Approved at: `2026-09-24T23:25:27Z`
- Approved option: `approved defect repair`
- Applied at: `-`
- Superseded by: `-`

## Context

The 25 `done` rows listed below have `Selector` values found in the named source files only as comments or traceability labels. The validator's containment check therefore reports `selectorResolves=true`, but the exact Vitest `-t` command selects no test. A `done` row consequently claims proof without an executable row-specific oracle. This is a defect in the spec-0012 execution ledger itself. `.qfai/assistant/constitution/drift-protocol.md` allows `/qfai-implement` to edit a `Selector` only while `selectorResolves=false`; the current values resolve, so Phase 2b of `/qfai-sdd` owns their correction.

The case text in `06_Test-Cases.md` and current implementation agree for the ordinary title corrections. Additional defects surfaced in the same blocked set: `TDD-0337` conflates four TC IDs, including superseded `TC-0012-0325`; `TDD-0396`, `TDD-0429`, `TDD-0437`, `TDD-0438`, and `TDD-0443` each carry multiple independent test boundaries; `TDD-0399` proves only the absence of an orchestrator capture call although `TC-0012-0362` also requires positive Reviewer-owned Playwright invocation. The row-specific analysis and exact current test titles are in `tmp/cross-spec-closure/selector-true-sdd-triage.md` (review aid, not an upstream artifact).

## Reproduction

`spec-0012/tdd/test-list.md` line 55 declares `TDD-0389` at `done` with `Selector = TC-0012-0378`. The named test file has the token only in comments at lines 50 and 60; its executable `it` title begins at line 51:

```text
50:   // QFAI:SPEC-0012:TC-0012-0378
51:   it("composes zero-padded iter dir + screen review path for a (idx, spec, screen) triple", () => {
60:   // QFAI:SPEC-0012:TC-0012-0378
```

Run from the repository root (the environment variable suppresses only a Vite configuration warning):

```powershell
$env:VITE_CONFIG_NATIVE_IGNORE_WARNING='true'; corepack pnpm -C packages/qfai exec vitest run tests/core/prototyping/iterationPaths.test.ts -t TC-0012-0378
```

Verbatim result excerpt (exit code `0`):

```text
Test Files  1 skipped (1)
     Tests  8 skipped (8)
  Duration  619ms (transform 112ms, setup 87ms, import 164ms, tests 0ms, environment 0ms)
```

Control command with the real title prefix `-t 'composes zero-padded iter dir'` returns `Tests 1 passed | 7 skipped (8)`. The focused replay inventory at `tmp/cross-spec-closure/missing.tsv` records `passed=0`, `failed=0`, `skipped=0` for each of the 25 row selectors after batch execution; the direct one-row reproduction above is the minimal proof of the underlying cause.

## Proposed change

One correction exists: make every completed ledger row's selector name an actually executed test for its own TC boundary, then redo its row-specific proof and cross-spec review. The approved owner rerun is `/qfai-sdd spec-0012` in `re-derive` mode, with a Phase 2b delta:

1. For single-boundary rows, replace the comment-only selector with the exact executable `it` title listed in the review aid. Preserve row identity and TC semantics.
2. Re-scope `TDD-0337` to one active boundary and seed one row per remaining active boundary. Remove superseded `TC-0012-0325` from its refs; `TC-0012-0358` already has `TDD-0373`. Keep `TDD-0366` as additional TC-0012-0322 coverage unless the owner review finds an approved retirement necessary.
3. Split `TDD-0396`, `TDD-0429`, `TDD-0437`, `TDD-0438`, and `TDD-0443` by independently observable boundary. The retained row keeps the first boundary its current proof can actually support; appended rows start `todo`. Phase 2b's boundary and selector-granularity rules govern the exact split.
4. Preserve TC-0012-0362's positive and negative obligations: give `TDD-0399` its existing negative check and seed an additional positive Reviewer dispatch boundary. `/qfai-atdd` authors the positive test after SDD hands it over.
5. Leave the current TC-0012-0402 and TC-0012-0404 behavior intact. Their present tests agree with those TCs; rewrite or refresh the stale `Evidence` cells of `TDD-0422` and `TDD-0424` in the downstream execution stage after reset, without asserting that old proof observed the new behavior.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                                       |
| -------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `spec-0012/TDD-0337` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0366` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0389` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0390` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0391` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0392` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0393` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0394` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0395` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0396` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0397` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0398` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0399` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0400` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0415` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0416` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0421` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0422` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0423` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0424` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0428` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0429` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0437` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0438` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |
| `spec-0012/TDD-0443` | ledger-row | Its `done` selector selects zero tests, so the cross-spec re-review proof is absent. |

- Not blocked by this CR: all other ledger rows and PR 2221's implementation files except where a new test must read their behavior. Their independent work may continue.
- Overlapping open CRs: `CR-20260912-0003` names `TDD-0337` as a matrix blocker for its possible spec-0012 rerun but explicitly leaves its split to another CR. `CR-20260925-0002` through `CR-20260925-0004` cover the disjoint remaining 25 rows, and all three are approved.

## Impact scope

- Specs: `spec-0012`
- Plans: none anticipated
- Tests: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`, `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`, `packages/qfai/tests/core/prototyping/iterationPaths.test.ts`, `packages/qfai/tests/core/prototyping/licenseVerify.test.ts`, `packages/qfai/tests/core/prototyping/specResolution.test.ts`, `packages/qfai/tests/core/prototyping/reviewerDispatch.test.ts`, `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`, `packages/qfai/tests/skill/prototypingSkill.test.ts`; only the positive dispatch gap may require a test edit, pending row-level proof review
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/tdd/test-list.md`, `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve the enumerated defect correction and reset/split scope above, followed by `/qfai-sdd spec-0012` in `re-derive` mode and row-specific reruns for the 25 completed rows?

## Approved actions (owner skill rerun plan)

1. On explicit approval, record it in this CR's canonical `.qfai/decisions/CR-20260925-0001-spec-0012-selector-proof.md` with the actual approver and time; run `/qfai-sdd spec-0012` in `re-derive` mode. Stage 1 Triage uses `Operation = UPDATE`, `Sub-op = MODIFY` on the affected existing TC-to-ledger traceability, with unchanged product acceptance criteria. Phase 2b performs the exact selector corrections and boundary splits. Phase 4 records the CR in `.qfai/specs/spec-0012/09_delta.md`. Complete the UI-bearing target's required independent review gates.
2. Downstream ledger sweep after owner rerun: reset these existing rows to `todo` through `/qfai-implement` Change-Request preflight, recording this CR in `DR-ID`: `spec-0012/TDD-0337`, `spec-0012/TDD-0366`, `spec-0012/TDD-0389`, `spec-0012/TDD-0390`, `spec-0012/TDD-0391`, `spec-0012/TDD-0392`, `spec-0012/TDD-0393`, `spec-0012/TDD-0394`, `spec-0012/TDD-0395`, `spec-0012/TDD-0396`, `spec-0012/TDD-0397`, `spec-0012/TDD-0398`, `spec-0012/TDD-0399`, `spec-0012/TDD-0400`, `spec-0012/TDD-0415`, `spec-0012/TDD-0416`, `spec-0012/TDD-0421`, `spec-0012/TDD-0422`, `spec-0012/TDD-0423`, `spec-0012/TDD-0424`, `spec-0012/TDD-0428`, `spec-0012/TDD-0429`, `spec-0012/TDD-0437`, `spec-0012/TDD-0438`, `spec-0012/TDD-0443`. Preserve existing evidence as historical pointers; no row is approved for retirement by this CR. Any appended rows start `todo` and carry this CR's boundary rationale.
3. `/qfai-atdd spec-0012` handles affected Integration rows and the positive Reviewer-owned Playwright test; `/qfai-implement spec-0012` handles the rest. Each row must demonstrate a nonzero selected-test count, falsifiability where required, restored GREEN, and independent cross-spec re-review. An unavailable or changed obligation returns to the CR decision path rather than being marked `done`.

## Resolution

Approved. The owner rerun (`/qfai-sdd spec-0012` in `re-derive` mode, then the downstream sweep above) is not yet run.
