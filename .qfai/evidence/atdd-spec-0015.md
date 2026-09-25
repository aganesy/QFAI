# ATDD Evidence: spec-0015

## Objective

Give ledger row `TDD-0039` (`TC-0015-0007`, Layer Integration, Boundary `legacy-profile-preservation`, `BR-0015-0005`) an executable acceptance test, and take its first run.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0015/03_Acceptance-Criteria.md` (`AC-0015-0007`, `AC-0015-0009`)
- `.qfai/specs/spec-0015/04_Business-Rules.md` (`BR-0015-0005`)
- `.qfai/specs/spec-0015/05_Examples.md` (`EX-0015-0004`)
- `.qfai/specs/spec-0015/06_Test-Cases.md` (`TC-0015-0007`, Boundary `legacy-profile-preservation`)
- `.qfai/specs/spec-0015/09_delta.md` (`VFY-001`)
- `.qfai/specs/spec-0015/10_Plan.md` (Test approach)
- `.qfai/specs/spec-0015/tdd/test-list.md` (row `TDD-0039`)
- `.qfai/evidence/sdd-spec-0015.md` (known-test handoff table)
- `.qfai/assistant/catalog/test-layers.md`
- `.claude/skills/qfai-atdd/references/red-provenance.md` (branch 2, Evidence shape)
- `packages/qfai/src/cli/commands/init.ts` (`runInit`, `syncGovernedAssistantAssets`)
- `packages/qfai/src/core/assistantAssetProvenance.ts` (`hashAssistantAssetText`, `readAssistantAssetsLock`, `writeAssistantAssetsLock`)
- `packages/qfai/assets/init/.qfai/assistant/catalog/review-gate.rules.yml`
- `packages/qfai/assets/init/.qfai/assistant/manifest/review-profiles.yml`
- `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`

The spec references no `CON-API-*` or `CON-DB-*` contract for this boundary.

## Decisions made (with rationale)

- The row's test is the existing `it("preserves adopter profiles on both init paths while emitting the canonical target bound")` in `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`, inside `describe("TC-0015-0007: Pattern-Doubler N/A Default")`. `10_Plan.md` Test approach, `09_delta.md` `VFY-001` and the known-test handoff in `.qfai/evidence/sdd-spec-0015.md` all name that file and that test as this boundary's verification.
- A first draft put the boundary in a separate file. The delivery-planner scope review returned REVISE in round 1: a second file would put two tests on one boundary, one of them outside the ledger, and depart from the plan without a Change Request. The separate file was deleted and its `tsconfig.tests.json` entry reverted. The existing test was extended with the assertions the boundary still lacked. The round-2 review passed.
- The existing test's name is unchanged, and no other test in the file was edited.
- No production change. The current initializer already satisfies the boundary, so the row takes the falsifiability branch.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T09:01:01.993Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

## Work performed (what changed, where)

- `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`: the existing test now checks the rest of the `legacy-profile-preservation` boundary after the forced refresh:
  - `missing_mandatory_pairing` is `required` in the `pattern-doubler` bound;
  - the catalog on disk equals the shipped catalog bytes;
  - `required.spec` still holds `UserStories`, `AcceptanceCriteria`, `Examples` and `TestCases`;
  - `quality_gates.defaults` still holds `completion-reviewer` and `qa-gatekeeper`;
  - the asset receipt records the shipped hash for `catalog/review-gate.rules.yml`.
- A receipt-mismatch step was appended to the same test. It writes the older catalog back without updating the receipt, runs forced init, and expects the older catalog and the adopter profiles to be left unchanged.
- `packages/qfai/tests/assets/openRowAlreadyTested.test.ts`: removed the entry `spec-0015 TDD-0039 todo TC-0015-0007`. It stops being an open row that already has a test once the row closes.
- `packages/qfai/tsconfig.tests.json`: unchanged from `HEAD`.

## Commands executed + key outputs

Tree address, recorded immediately before the first run:

```text
$ node tmp/address.mjs .
records=2471 tracked=2230 untracked=0 dirs=241
working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
```

First run of the approved selector (exit 0):

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/agentDelegationSpec0015.test.ts --reporter=verbose -t "preserves adopter profiles on both init paths while emitting the canonical target bound"

 ✓ |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 95801ms

 Test Files  1 passed (1)
      Tests  1 passed | 16 skipped (17)
   Duration  98.46s (transform 1.58s, setup 39ms, collect 1.99s, tests 95.80s, environment 0ms, prepare 148ms)
```

Superseded: the separate file's run. That file was deleted after the round-1 scope review, so this run is not evidence for the row (exit 0):

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0015LegacyProfilePreservation.test.ts --reporter=verbose -t "preserves adopter profile bytes and refreshes only a recorded older catalog"

 ✓ |integration| tests/integration/spec0015LegacyProfilePreservation.test.ts > TC-0015-0007: legacy profile preservation > preserves adopter profile bytes and refreshes only a recorded older catalog 36138ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

Formatting (exit 0):

```text
$ npx --yes prettier@3.9.6 --write packages/qfai/tests/integration/agentDelegationSpec0015.test.ts packages/qfai/tests/assets/openRowAlreadyTested.test.ts
packages/qfai/tests/integration/agentDelegationSpec0015.test.ts 730ms (unchanged)
packages/qfai/tests/assets/openRowAlreadyTested.test.ts 46ms (unchanged)
```

Scoped validation, from a fresh repo build (`packages/qfai/node_modules/.bin/tsup`; the `dist/cli` bundles built, the local type-declaration step did not). Both runs exit 1 on backlog that `main` at `65a3437b5` reports the same way; none of the findings names `TDD-0039`.

<!-- qfai:not-a-citation .qfai/report/run-20260925185919671/ -->
```text
$ node packages/qfai/dist/cli/index.cjs validate --profile atdd --fail-on error --spec spec-0015 --format text
counts: info=3 warning=1 error=9
run-log: .qfai/report/run-20260925185919671
exit 1
```

The nine errors are `QFAI-TEST-003` on skipped tests in other specs' files, listed under `## Cross-spec obligations`. On `main` the same command also reported `QFAI-ATDD-131` for spec-0015, because the Coverage Depth Matrix did not exist; it is gone.

```text
$ node packages/qfai/dist/cli/index.cjs validate --profile tdd --fail-on error --spec spec-0015 --format text
counts: info=6 warning=31 error=51
exit 1
```

The 51 errors are the same set `main` reports: the nine `QFAI-TEST-003` above, and 42 ledger findings on older spec-0015 rows whose `Evidence` cells predate the pointer grammar. That ledger backlog is pinned in `scripts/dogfood-backlog.json` and belongs to those rows' own runs.

## Test volume estimate

From `qa-strategist#1`. Signals are planning hints, not gates.

| Layer       | Raw count | Signal | Evidence                                                                                                                                                                                                         | Notes                                                                                                                                                                                          |
| ----------- | --------: | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E         |        16 |     35 | 16 `US-*` in `02_User-stories.md`, none deferred. No `TC-*` declares `L5`. The surface opt-in is off repo-wide: no `prototyping.primarySpecId`, no `.qfai/contracts/ui/`, no sibling spec declares a surface. | Above the 5–25 band. Every story is active and owes an E2E reference; the ledger carries TDD-0020, TDD-0021 and TDD-0040 to TDD-0053 for them.                                                  |
| API         |         0 |      0 | `04_Business-Rules.md` has no `Contract-Refs` column and `01_Spec.md` no `QFAI-CONTRACT-REF`. No `TC-*` declares `L4`.                                                                                           | `CLI-HANDOFF` and `CLI-WFSET` are CLI contract names in prose, not `CON-API-*`.                                                                                                                |
| Integration |        30 |     65 | 16 `TC-*` with no `Level` and 14 declaring `integration`; the 6 `unit` cases are excluded. No active `CON-DB-*`.                                                                                                 | Inside the 40–80 band. This run owns one of these obligations: the `legacy-profile-preservation` boundary of `TC-0015-0007`.                                                                   |

## Coverage obligations checklist

| Obligation                                                        | Home                                                                     | Test                                                                                                                                                  | State                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `TC-0015-0007`, Boundary `legacy-profile-preservation` (TDD-0039) | No `Level` declared, so `tests/integration/**`                           | `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts` > "preserves adopter profiles on both init paths while emitting the canonical target bound" | Annotated `QFAI:SPEC-0015:TC-0015-0007`; first run passed |
| `TC-0015-0007`, Boundary `abstract-only-na` (TDD-0007)            | `tests/integration/**`                                                   | Same file, TDD-0007's own selector                                                                                                                    | Not in this run                                   |
| `CON-API-*`                                                       | `tests/api/**`                                                           | None referenced                                                                                                                                       | Not applicable                                    |
| `CON-DB-*`                                                        | `tests/integration/**`                                                   | None referenced                                                                                                                                       | Not applicable                                    |
| Other ATDD-owned rows of spec-0015                                | —                                                                        | —                                                                                                                                                     | Out of this run: TDD-0006, TDD-0007, TDD-0015, TDD-0016, TDD-0036, TDD-0037, TDD-0038 and TDD-0040 to TDD-0053 |
| `US-0015-0001` to `US-0015-0006`, `TC-0015-0013` to `TC-0015-0016` | `tests/e2e/**` for the stories, `tests/integration/**` for the cases | Covered only by annotation carriers that declare no test (`QFAI-ATDD-119`, info)                                                                     | Open: spec-0015's ATDD is not done               |

## Ledger rows advanced

| TDD-ID   | Branch         | Entry                    |
| -------- | -------------- | ------------------------ |
| TDD-0039 | falsifiability | [#tdd-0039](#tdd-0039) |

### TDD-0039

- TDD-ID: TDD-0039
- Layer: Integration
- Test file: packages/qfai/tests/integration/agentDelegationSpec0015.test.ts
- Selector: preserves adopter profiles on both init paths while emitting the canonical target bound
- TC-ref: TC-0015-0007
- Boundary: legacy-profile-preservation
- Branch: falsifiability. The first run passed against the current production tree, so no natural RED is observable.
- Satisfied-by: packages/qfai/src/cli/commands/init.ts::runInit. The call to `syncGovernedAssistantAssets` passes `force: options.force` (line 530); changing it to `force: false` should leave the older catalog in place on the forced run and fail the test's refreshed-bound assertions (`pattern-doubler` present, catalog bytes equal to the shipped catalog).
- First-run command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/agentDelegationSpec0015.test.ts --reporter=verbose -t "preserves adopter profiles on both init paths while emitting the canonical target bound"`
- First-run result:

  ```text
  exit 0
   ✓ |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 95801ms

   Test Files  1 passed (1)
        Tests  1 passed | 16 skipped (17)
  ```

- First-run revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Handover: /qfai-implement Phase Red step 3c applies the mutation and writes the Round 1 falsifiability fields.

#### Round 1

- Round 1: Revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Round 1: RED failure mode: falsifiability
- Round 1: RED test manifest:

  ```text
  packages/qfai/tests/helpers/stdout.ts
  packages/qfai/tests/helpers/tempTree.ts
  packages/qfai/tests/integration/agentDelegationSpec0015.test.ts
  ```

- Round 1: RED test hash: a862e99c2deb841fca4dbb0099e5b420dd53aebf346edaf60b2fe11b0a3388e7
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/init.ts::runInit, the force setting passed to syncGovernedAssistantAssets. With it pinned to `false`, the forced `init` run no longer replaces the older governed catalog the test planted, so `catalog/review-gate.rules.yml` keeps the catalog without the `pattern-doubler` bound instead of the shipped one.
- Round 1: Falsifiability setup: line 530 of `packages/qfai/src/cli/commands/init.ts`, inside the `syncGovernedAssistantAssets` call in `runInit`, changed from `force: options.force,` to `force: false,`. The `copyTemplatePaths` call above it and every other line are unchanged. SHA-256 of `init.ts` before the mutation `64cd401ce4ae998d74470805c90b2e4d205f73dd59f22c798a13bcec708313f9`, after it `8cffd98a0a0e6fd7024dcb15bd58e554849e32211ceb400d76c2625c5cd3a76c`. The three manifest files were not touched, and the RED test hash was taken before the mutation.
- Round 1: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/agentDelegationSpec0015.test.ts --reporter=verbose -t "preserves adopter profiles on both init paths while emitting the canonical target bound"`
- Round 1: Falsifiability result: exit 1. The selected test failed on an assertion inside its own body, after the forced run; the other 16 tests in the file were skipped by the selector.

  ```text
   × |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 12900ms
     → expected { …(2) } to have property "pattern-doubler"

  AssertionError: expected { …(2) } to have property "pattern-doubler"
   ❯ tests/integration/agentDelegationSpec0015.test.ts:356:27
      356|       expect(reviewModes).toHaveProperty("pattern-doubler");

   Test Files  1 failed (1)
        Tests  1 failed | 16 skipped (17)
  ```

- Round 1: Falsifiability revision: working-tree+b4ac4f4a95d58c6860652a7692c07cb22c62969a2b0a4020552be3e1f62187e7
- Round 1: Negative-control mutation runs: each run started from `init.ts` restored byte-equal to SHA-256 `64cd401ce4ae998d74470805c90b2e4d205f73dd59f22c798a13bcec708313f9`, and `init.ts` was restored byte-equal after each. None touched the manifest files. After the last one the primary mutation was re-applied; `init.ts` hashed to `8cffd98a0a0e6fd7024dcb15bd58e554849e32211ceb400d76c2625c5cd3a76c` again and the tree address was the recorded `Round 1: Falsifiability revision`. Every run used the `Round 1: Falsifiability command`.
  - A, a mismatching receipt must block the forced refresh. Change: in `syncGovernedAssistantAssets`, line 1026, the `refreshable` condition loses `&& currentHash === previousHash`. Mutated SHA-256 `22af279823d11d15e0b1e2ce026894e06d17949f62e87f5e6e4d7986dc0d6d12`. Exit 1. The forced run refreshed the catalog even though it no longer matched its receipt.

    ```text
     × |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 15735ms
       → mismatching receipt: catalog refreshed: expected 'schema_version: "1.0"\n\nrequired:\n …' to be 'schema_version: "1.0"\n\nrequired:\n …' // Object.is equality

    AssertionError: mismatching receipt: catalog refreshed: expected 'schema_version: "1.0"\n\nrequired:\n …' to be 'schema_version: "1.0"\n\nrequired:\n …' // Object.is equality
     ❯ tests/integration/agentDelegationSpec0015.test.ts:379:86

     Test Files  1 failed (1)
          Tests  1 failed | 16 skipped (17)
    ```

  - B, a reinit must not overwrite the adopter's `review-profiles.yml`.
    - B1, the site named for this control. `conflictPolicy` accepts only `"error" | "skip"`, so no value overwrites. The smallest one-line change that makes the `copyTemplatePaths(... STANDARD_ASSET_PATHS ...)` copy overwrite is line 521, `force: options.force,` changed to `force: true,`. Mutated SHA-256 `9ce2253a7bda3e0aec737d44ce66d8ccc5ff131efc47b80aafa26109c6883d3c`. Exit 0. This does not discriminate: that copy covers only `assistant/skills` and `assistant/agents`, and `review-profiles.yml` lives in `assistant/manifest/`.

      ```text
       ✓ |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 37681ms

       Test Files  1 passed (1)
            Tests  1 passed | 16 skipped (17)
      ```

    - B2, the copy that writes `review-profiles.yml`. Change: in `runInit`, the `copyTemplateTree(qfaiAssets, destQfai, ...)` call, line 510, `force: false,` changed to `force: options.force,`. Mutated SHA-256 `1a705007952dd66aefe754ee307ee5d68a65625193195bac82d6f0a381198102`. Exit 1. The forced run overwrote the adopter's profiles with the shipped file.

      ```text
       × |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 4734ms
         → force=true: adopter profiles changed: expected 'schema_version: "1.0"\n\nprofiles:\n …' to be 'schema_version: "1.0"\n\nprofiles:\n …' // Object.is equality

      AssertionError: force=true: adopter profiles changed: expected 'schema_version: "1.0"\n\nprofiles:\n …' to be 'schema_version: "1.0"\n\nprofiles:\n …' // Object.is equality
       ❯ tests/integration/agentDelegationSpec0015.test.ts:347:91

       Test Files  1 failed (1)
            Tests  1 failed | 16 skipped (17)
      ```

- Round 1: Oracle proof: this round's proof is the primary falsifiability mutation above, `force: false` in the `syncGovernedAssistantAssets` call in `runInit`; before GREEN, `init.ts` was restored from SHA-256 `8cffd98a0a0e6fd7024dcb15bd58e554849e32211ceb400d76c2625c5cd3a76c` to `64cd401ce4ae998d74470805c90b2e4d205f73dd59f22c798a13bcec708313f9`, byte-equal to `HEAD`.
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/agentDelegationSpec0015.test.ts --reporter=verbose -t "preserves adopter profiles on both init paths while emitting the canonical target bound"`
- Round 1: GREEN result: exit 0; 1 passed, 16 skipped by the selector. The selected test passed on the restored tree.

  ```text
   ✓ |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 11114ms

   Test Files  1 passed (1)
        Tests  1 passed | 16 skipped (17)
  ```

- qa-gatekeeper: PASS x2 (`qa-gatekeeper#1` — RED phase gate on the mutated tree `working-tree+b4ac4f4a95d58c6860652a7692c07cb22c62969a2b0a4020552be3e1f62187e7`, audited evidence hash `7fe699eeb699e557529d4af67133b5c02d059c148dfb2845d8cbc15aef365d8e`; build-phase GREEN + oracle proof on the restored tree `working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113`, audited evidence hash `2192a163bb87cef45af8757bacd2ee25aa9c536df27129e8891194c2a62d5ff5`). The RED gate re-ran the falsifiability command and saw the same assertion fail at line 356; the one-line diff is the predicate `Satisfied-by` names, the RED test hash recomputes, and negative controls A and B2 discriminate while B1 is marked as not discriminating. The build gate confirmed `init.ts` byte-equal to `HEAD`, the GREEN command byte-identical to the falsifiability command, and a passing re-run naming this selector.
- Ledger: the orchestrator wrote `todo -> red` at 2026-09-25T09:34:49.952Z, copying `Test file` and `Selector` from this entry.
- Ledger: the orchestrator wrote `red -> green` at 2026-09-25T09:39:26.696Z, with the `Evidence` pointer to this entry.
- Phase: Refactor: no production or test edit. The row's predicate already existed, and the only source change is the acceptance test `/qfai-atdd` extended.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/agentDelegationSpec0015.test.ts --reporter=verbose`
- Refactor verify result: exit 0. The whole test file ran, and the output names this row's selector as passed.

  ```text
   ✓ |integration| tests/integration/agentDelegationSpec0015.test.ts > TC-0015-0007: Pattern-Doubler N/A Default > preserves adopter profiles on both init paths while emitting the canonical target bound 8413ms

   Test Files  1 passed (1)
        Tests  17 passed (17)
  ```

- Refactor verify revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Ledger: the orchestrator wrote `green -> refactor` at 2026-09-25T09:40:06.605Z.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260925095540157 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 95adddaff9bcab1b30e4d8e8dd71f1e7f656df0ced42ae8d295c33ed8d7f6dfb
- Spec review: PASS
- Spec reviewed revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Spec audited evidence hash: 6c510ae7f9261098d99f2444fb888e24c6e6584893a230ad4021711059cc93ee
- Spec review pack: .qfai/review/review-20260925095540157 <!-- qfai:not-a-citation -->
- Spec review pack seal: 95adddaff9bcab1b30e4d8e8dd71f1e7f656df0ced42ae8d295c33ed8d7f6dfb
- Code quality review: PASS
- Code quality reviewed revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Code quality audited evidence hash: 6c510ae7f9261098d99f2444fb888e24c6e6584893a230ad4021711059cc93ee
- Code quality review pack: .qfai/review/review-20260925095540157 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 95adddaff9bcab1b30e4d8e8dd71f1e7f656df0ced42ae8d295c33ed8d7f6dfb
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/agentDelegationSpec0015.test.ts --reporter=verbose`
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 17 passed (17); the output names the selector preserves adopter profiles on both init paths while emitting the canonical target bound as passed. Not a per-item checkpoint boundary, so the Refactor verify run is reused without re-running.
- Checkpoint verification revision: working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113
- Checkpoint verification seal: ae61f155025285cb460f409f6e78583e9b7e5f23b8144bb374ac6a5e92b2fccd

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0015.md` (committed). Totals: ✅ 24 / ⚠️ 24 / ❌ 5.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | test-design-analyst#1 | /qfai-atdd coverage: Coverage Depth Matrix for spec-0015 | spec-0015 01-10, tdd/test-list.md, test-case-depth-checklist.md | `.qfai/evidence/coverage-depth-spec-0015.md` | PASS |
| 2 | qa-strategist | qa-strategist#1 | /qfai-atdd coverage: Test Volume Estimate and obligations checklist | spec-0015, qfai.config.yaml, .qfai/contracts/**, volume-signals.md | #test-volume-estimate, #coverage-obligations-checklist | PASS |
| 3 | delivery-planner | delivery-planner#1 | /qfai-atdd red: TDD-0039 slice and selector scope, round 1 | 06_Test-Cases.md#TC-0015-0007, 09_delta.md, 10_Plan.md, test-list.md | REVISE: move the row onto the existing test in agentDelegationSpec0015.test.ts and extend it | REVISE |
| 4 | acceptance-test-engineer | acceptance-test-engineer#1 | /qfai-atdd implementation: extend the TDD-0039 test and take its first run | round 1 required fixes | agentDelegationSpec0015.test.ts; #tdd-0039 first run | PASS |
| 5 | delivery-planner | delivery-planner#1 | /qfai-atdd red: TDD-0039 slice and selector scope, round 2 | the extended test at working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113 | PASS: one boundary, no split, no seam, Satisfied-by accepted | PASS |
| 6 | - | n/a | grilling(-@2026-09-25T09:01:01.993Z/none): none | - | - | PASS |

## Cross-spec obligations

The scoped atdd run exited 1 on nine `QFAI-TEST-003` findings. Each is a `describe.skip` in a test file another spec owns, which this run did not touch and may not edit.

| Finding | Contract ID | Test file | Owning spec | Why not this stage's work | Closed by |
| ------- | ----------- | --------- | ----------- | ------------------------- | --------- |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:41 | spec-0004 | A skipped acceptance test of spec-0004's own stories | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:67 | spec-0004 | A skipped acceptance test of spec-0004's own stories | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:88 | spec-0004 | A skipped acceptance test of spec-0004's own stories | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:45 | spec-0004 | A skipped acceptance test of spec-0004's own cases | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:62 | spec-0004 | A skipped acceptance test of spec-0004's own cases | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:77 | spec-0004 | A skipped acceptance test of spec-0004's own cases | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:41 | spec-0006 | A skipped acceptance test of spec-0006's own stories | spec-0006's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:60 | spec-0006 | A skipped acceptance test of spec-0006's own stories | spec-0006's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:78 | spec-0006 | A skipped acceptance test of spec-0006's own stories | spec-0006's next `/qfai-atdd` run |

## Execution logs

- `tmp/tdd0039-first-run-2.log`: the first run of the approved selector.
- `tmp/tdd0039-first-run.log`: the superseded run of the deleted separate file.

Both logs are scratch files and are not tracked. The recorded output above is the durable copy.

## Gaps / Open risks

- spec-0015's ATDD stage is not done. Fourteen story rows, TDD-0040 to TDD-0053, and several integration rows are still `todo`, and ten obligations are covered only by carriers (`QFAI-ATDD-119`). This run owned `TDD-0039` alone.
- Repository quality gates are left to the pull request's CI: format, lint, typecheck and the full test suite, including the edited `openRowAlreadyTested.test.ts`. Locally only the row's own test file ran, and prettier checked the changed files.
- The selected test runs real `init` five times. Its first run took 95.8 s on this machine, against the 120 s test timeout; later runs took 3.5 s to 37.7 s.
- The Coverage Depth Matrix routes several upstream findings outside this row to `/qfai-sdd` and to the ledger owner. They are listed in that file's Findings section.
- TDD-0007's test also asserts the numeric-target fields that belong to this row's boundary, so its RED can land on this row's assertion. That is for TDD-0007's own run to settle.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL — spec-0015's ATDD stage is not done. Fourteen story rows and several integration rows are still `todo`, and ten obligations are covered only by carriers. `TDD-0039`, the one row this run owned, is `done`: its item reviews are in its own entry.

The scoped atdd validation passes for everything this run owns. Its nine remaining errors belong to spec-0004 and spec-0006 and are recorded under `## Cross-spec obligations`.

P8 review, series `.qfai/evidence/atdd-spec-0015.md + <role> + 1`:

| Round | Pack | completion-reviewer | qa-gatekeeper | Reviewed revision | Audited evidence hash |
| ----- | ---- | ------------------- | ------------- | ----------------- | --------------------- |
| 1 | `review-20260925100118250` | REVISE (`completion-reviewer#2`) | REVISE (`qa-gatekeeper#2`) | working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113 | ce4e9f803e6aeeccff97ebf572eeeb7f68bf0b43d3959cd263f270acc8d29cb9 |
| 2 | `review-20260925100850645` | REVISE: the `full` dogfood pin for spec-0015 | PASS | working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113 | ec0946e0cb0054423f677bd7eca95de79b67ae32d8090e71f2f84bc4ce5c9b7a |
| 2b | `review-20260925102020101` | PASS, verifying the pin fix the user approved | - | working-tree+a13efff5f5b20ecbad486284a7af8c1073d23c5d4e3d03ea3498c4948408d440 | b872409b00d735960617e9d3fa87c1f88862dd53cf8a8cde1c6ef1c385899387 |
| Record re-attestation | `review-20260925103342317` | PASS, after the citation-marker repair | PASS, re-attesting round 2 | working-tree+2a83a305568c62558994e2220e401d080ef79e8475c97ac5a1015fe1d8e5da65 | ccd85c343012456d172c22e5a101c8631ef25e748c145ed6a16178aebea77624 |

Seals of the earlier packs: round 1 `71169c79eefc287c3ceb61f89c1c1e76591e18b7f6bcf2e8208b0ec5573ff3d3`, round 2 `f4d0c9dfa118581339edad1a0fbd2678a18129769f9b6d03617ff52fd7f418a1`, round 2b `a43dc79d8850a72dd021f0eadacbc25a2b112497169221776469ce8d253f5851`.

The dogfood backlog checks behind the pin fix ran with the local review packs moved aside, as a fresh clone has none, and with the regenerated `.qfai/report/**` restored afterwards:

```text
$ node scripts/check-dogfood-backlog.mjs --profile full
check-dogfood-backlog: full reports 962 error(s) across 27 file(s), all within the pinned backlog.
$ node scripts/check-dogfood-backlog.mjs --profile sdd
check-dogfood-backlog: sdd reports 11 error(s) across 3 file(s), all within the pinned backlog.
$ node scripts/check-dogfood-backlog.mjs --profile tdd
check-dogfood-backlog: tdd reports 947 error(s) across 13 file(s), all within the pinned backlog.
```

Review pack: `.qfai/review/review-20260925103342317/` <!-- qfai:not-a-citation .qfai/review/review-20260925103342317/ -->
Review pack seal: 7ee11d1fe0b84f5a6665bd117e825c45b222e9f0b99922272ee15d446b417630
