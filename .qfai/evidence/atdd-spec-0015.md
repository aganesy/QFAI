# ATDD evidence — spec-0015

## Objective

Give `TC-0015-0007`'s `legacy-profile-preservation` boundary its own executable Integration selector for `TDD-0039`.

## Inputs reviewed

- `spec-0015/01_Spec.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `09_delta.md`, `10_Plan.md`, and `tdd/test-list.md`
- `qfai.config.yaml`, the shipped review-gate catalog, the existing spec-0015 integration test, `runInit`, and its asset-receipt helpers
- `.qfai/assistant/catalog/test-layers.md`; the spec names no `CON-API-*` or `CON-DB-*` contract

## Decision

Use one dedicated test file. The older spec-0015 integration file is shared by earlier ledger rows. This file gives the compatibility boundary one selector without moving their test manifests. The test exercises the existing `runInit` path; no production change is requested.

## Grilling Session

### /qfai-atdd — run started 2026-09-24T13:40:28.006Z

- Run started: 2026-09-24T13:40:28.006Z
- Preflight: confidence high — `TC-0015-0007`, the approved delta, and the existing init test agree on the boundary.
- Session detections: none; no unresolved choice arose while authoring this selector.

## Work performed

- Added `packages/qfai/tests/integration/spec0015LegacyProfilePreservation.test.ts` and enumerated it in `packages/qfai/tsconfig.tests.json`.
- The selector checks adopter profile bytes after ordinary and forced reinit; an older catalog plus matching receipt is preserved without force and refreshed with force. It checks the refreshed numeric-target bound, mandatory pairing, product obligations and review gates. It then checks that a mismatched receipt prevents forced replacement of the older catalog.

## Commands executed

- `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=verbose` — exit 0; Test Files 1 passed (1), Tests 1 passed (1). This first-run observation preceded the formal handoff record below.
- `corepack pnpm exec prettier --check packages/qfai/tests/integration/spec0015LegacyProfilePreservation.test.ts packages/qfai/tsconfig.tests.json` — exit 0.
- `git diff --check -- packages/qfai/tests/integration/spec0015LegacyProfilePreservation.test.ts packages/qfai/tsconfig.tests.json` — exit 0.

## Test volume estimate

One `Integration` ledger row is in scope: `TDD-0039`, bound to `TC-0015-0007`'s `legacy-profile-preservation` boundary. The separate `abstract-only-na` boundary remains `TDD-0007`.

## Coverage obligations checklist

| Obligation | Test asset | State |
| ---------- | ---------- | ----- |
| `TC-0015-0007` `legacy-profile-preservation` | `packages/qfai/tests/integration/spec0015LegacyProfilePreservation.test.ts` | First run PASS; falsifiability assertion FAIL; byte-equal restoration and GREEN PASS |
| `CON-API-*`, active `CON-DB-*` | None referenced by this spec's boundary | Not applicable |

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0015.md` (committed). Totals: ✅ 21 / ⚠️ 25 / ❌ 6.

## Ledger rows advanced

### TDD-0039

- TDD-ID: TDD-0039
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0015LegacyProfilePreservation.test.ts
- Selector: preserves adopter profile bytes and refreshes only a recorded older catalog
- TC-ref: TC-0015-0007 (`legacy-profile-preservation`)
- EX-ref: EX-0015-0004; AC-refs: AC-0015-0007, AC-0015-0009; BR-ref: BR-0015-0005
- Branch: falsifiability. The current initializer already passes this selector. No natural RED is available on the current production tree.
- Satisfied-by: `packages/qfai/src/cli/commands/init.ts::runInit`, the `syncGovernedAssistantAssets` call's `force: options.force` setting. It refreshes a recorded older catalog under `--force`; a temporary `force: false` left that catalog in place and failed the refreshed-catalog assertion. The test file and its helpers were unchanged.
- Status: `refactor`. The acceptance test, falsifiability mutation assertion, restored GREEN and both `qa-gatekeeper` passes are recorded. The orchestrator wrote `todo -> red` at 2026-09-24T13:50:06.228Z, `red -> green` at 2026-09-24T13:52:27.944Z, and `green -> refactor` at 2026-09-24T14:03:17.188Z.
- Ledger handback: `Test file` and `Selector` match the identity above; `Evidence` is `RED:falsifiability GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+91d36dd525df7e9ee09367b2e8f792c063bf3ea866da1d16123f1ce522ce88df -> .qfai/evidence/atdd-spec-0015.md#tdd-0039`. `DR-ID` and `Blocked-By` remain `-`. The orchestrator owns ledger writes.

#### Round 1

- Round 1: Revision: working-tree+91d36dd525df7e9ee09367b2e8f792c063bf3ea866da1d16123f1ce522ce88df
- Round 1: RED failure mode: falsifiability; first selector run passed against the existing implementation.
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0015LegacyProfilePreservation.test.ts
```

- Round 1: RED test hash: 2183bdd60022c9ca52c3875082b688b27d9a69e4ab953688f85b32adf0262e27
- Round 1: First-run command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=verbose`
- Round 1: First-run result: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
- Round 1: Satisfied-by: `packages/qfai/src/cli/commands/init.ts::runInit`, the `syncGovernedAssistantAssets` call's `force: options.force` setting.
- Round 1: Falsifiability setup: temporarily changed only that setting to `force: false`. The source's SHA-256 changed from `A500A0332F802120F22078A7F59E2E5C8BBBB1FC45AEC46C3BBC9127EB5BAD58` to `0B0711169E4FD977BC964D1F72717466C51CED1CFCE27C89C7969EC61EE8A394`; the test manifest hash remained `2183bdd60022c9ca52c3875082b688b27d9a69e4ab953688f85b32adf0262e27`.
- Round 1: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=verbose -t "preserves adopter profile bytes and refreshes only a recorded older catalog"`
- Round 1: Falsifiability result: exit 1; Test Files 1 failed (1), Tests 1 failed (1). The selected test failed its refreshed-catalog equality assertion at `spec0015LegacyProfilePreservation.test.ts:68`: the old catalog remained and lacked the `pattern-doubler` bound. The actual runner output is below.

  ```text
  × |integration| tests/integration/spec0015LegacyProfilePreservation.test.ts > TC-0015-0007: legacy profile preservation > preserves adopter profile bytes and refreshes only a recorded older catalog
  AssertionError: expected 'schema_version: "1.0"\n\nrequired:\n …' to be 'schema_version: "1.0"\n\nrequired:\n …' // Object.is equality
  -     - pattern-doubler
  -   pattern-doubler:
  -     more_scope: [business-flow, US, AC, EX, TC]
  -     numeric_targets: ignored
  +     - pattern-doubler
   ❯ tests/integration/spec0015LegacyProfilePreservation.test.ts:68:51
  Test Files  1 failed (1)
  Tests  1 failed (1)
  ```

- Round 1: Falsifiability revision: working-tree+d734b29995f275b5a6a105527774547eab6ad01b86b4cfcc9ce60af3effa5ffd
- Round 1: Oracle proof: the falsifiability mutation above made the same selector fail on its owned catalog-refresh assertion; the source was restored byte-equal before GREEN.
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=verbose -t "preserves adopter profile bytes and refreshes only a recorded older catalog"`
- Round 1: GREEN result: exit 0; Test Files 1 passed (1), Tests 1 passed (1). The runner named the passing selector:

  ```text
  ✓ |integration| tests/integration/spec0015LegacyProfilePreservation.test.ts > TC-0015-0007: legacy profile preservation > preserves adopter profile bytes and refreshes only a recorded older catalog 3612ms
  Test Files  1 passed (1)
  Tests  1 passed (1)
  ```

  Restored `init.ts` SHA-256 `A500A0332F802120F22078A7F59E2E5C8BBBB1FC45AEC46C3BBC9127EB5BAD58`; the restored source revision was `working-tree+91d36dd525df7e9ee09367b2e8f792c063bf3ea866da1d16123f1ce522ce88df`.
- qa-gatekeeper: PASS (`spec0003_qa_build`, RED phase, Round 1). The mutation at `working-tree+d734b29995f275b5a6a105527774547eab6ad01b86b4cfcc9ce60af3effa5ffd` failed the named assertion; byte-equal restoration and GREEN passed at `working-tree+91d36dd525df7e9ee09367b2e8f792c063bf3ea866da1d16123f1ce522ce88df`. The test manifest and source hashes matched. Later shared-tree edits do not change those observation addresses.
- Build-phase qa-gatekeeper: PASS (`spec0003_qa_build`, Round 1). The named verbose GREEN output, falsifiability assertion failure, restored source and test manifest hashes, and `red` ledger status were checked.
- Phase: Refactor: no production or test edit. The mutation was restored byte-equal before the GREEN observation.
- Refactor verify command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 1 passed (1), Tests 1 passed (1), duration 5.40s. The source address read before this run was `working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000`; the post-run capture agreed. No source edit was made during this verification.
- Refactor verify revision: working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924140518254 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 1646360e1772f293421b0ad1f28542ad75a3a2b4c52ecfbb661d712f10616a1a
- Spec review: PASS
- Spec reviewed revision: working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000
- Spec audited evidence hash: 95c72b7cef20eaca274bd8165b8de7cb5b9e8288ba7141b9a59b63d4f657a969
- Spec review pack: .qfai/review/review-20260924140518254 <!-- qfai:not-a-citation -->
- Spec review pack seal: 1646360e1772f293421b0ad1f28542ad75a3a2b4c52ecfbb661d712f10616a1a
- Code quality review: PASS
- Code quality reviewed revision: working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000
- Code quality audited evidence hash: 95c72b7cef20eaca274bd8165b8de7cb5b9e8288ba7141b9a59b63d4f657a969
- Code quality review pack: .qfai/review/review-20260924140518254 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 1646360e1772f293421b0ad1f28542ad75a3a2b4c52ecfbb661d712f10616a1a
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=dot`
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 1 passed (1), duration 5.40s. Off a per-item checkpoint boundary; the narrow Refactor suite is reused without re-running.
- Checkpoint verification revision: working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000
- Checkpoint verification seal: 67d5de1df601235bfe9be7cf8462eb1cba7d2c7ccb3a9e742d1d5287b8e170c6

## Work Orders Summary

| Step | Role | Agent instance | Task title | Input (refs) | Output (refs) | Status |
| ---- | ---- | -------------- | ---------- | ------------ | ------------- | ------ |
| 1 | acceptance-test-engineer | spec0003_atdd_repair | Author the `TDD-0039` Integration selector | `TC-0015-0007`, `EX-0015-0004`, `BR-0015-0005` | `#tdd-0039`, dedicated test and first-run PASS | PASS |
| 2 | acceptance-test-engineer | spec0003_atdd_repair | Hand the falsifiability mutation to `/qfai-implement` | `#tdd-0039` `Satisfied-by` | Dedicated test, unchanged manifest hash, and the mutation seam | PASS |
| 3 | - | n/a | grilling(-@2026-09-24T13:40:28.006Z/none): none | - | - | PASS |
| 4 | backend-engineer | spec0011_impl | Prove TDD-0039 falsifiability and restore production | `#tdd-0039` and `packages/qfai/src/cli/commands/init.ts::runInit` | Named assertion FAIL on the mutant, byte-equal restoration, named GREEN PASS, both source revisions and hashes | PASS |
| 5 | qa-gatekeeper | spec0003_qa_build | Judge TDD-0039 Round 1 falsifiability evidence | `#tdd-0039` mutation log, restored GREEN log, source and test hashes | PASS: named assertion failure, separate mutant/restored revisions, byte-equal restoration and GREEN verified | PASS |
| 6 | qa-gatekeeper | spec0003_qa_build | Judge TDD-0039 Round 1 GREEN observation | `#tdd-0039` named verbose GREEN output, mutation proof and `red` ledger row | PASS: selected test succeeded after source restoration; the falsifiability assertion failed on the mutant | PASS |
| 7 | orchestrator | orchestrator | Verify TDD-0039 Refactor without a source edit | `#tdd-0039` at `working-tree+21020bfa0c992308fee2d5926044ed6191935f9a006889bd8dd677beb242a000` | File-scoped integration test 1/1 PASS; ledger `green -> refactor` | PASS |
| 8 | completion-reviewer | spec0003_completion | TDD-0039 Round 1, attempt 1 completion review | `#tdd-0039`, canonical request `review-20260924140518254` | PASS at reviewed revision `working-tree+21020bfa…242a000`, audited hash `95c72b7c…657a969`; no findings | PASS |
| 9 | implementation-reviewer | spec0003_code_review | TDD-0039 Round 1, attempt 1 code review | `#tdd-0039`, canonical request `review-20260924140518254` | PASS at the same revision and audited hash; no findings | PASS |
| 10 | backend-engineer | spec0011_impl | Seal TDD-0039 review and checkpoint evidence | `review-20260924140518254`, `#tdd-0039` Refactor verify | Both reviewer responses PASS; pack and checkpoint seals recorded | PASS |

## Final status

`TDD-0039` has a test identity, a failing falsifiability mutation, byte-equal restoration, a passing GREEN, both qa-gatekeeper gates PASS, a file-scoped Refactor verify PASS, and both blocking reviews PASS. The ledger is `refactor`; the orchestrator owns the final `refactor -> done` transition.
