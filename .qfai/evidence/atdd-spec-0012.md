# ATDD Evidence: spec-0012

## Objective

spec-0012 rev11 で追加された acceptance obligations を runnable ATDD に反映し、`QFAI-ATDD-111/112` を解消する。対象は `US-0012-0077..0083`、`TC-0012-0272..0284`。`CON-API` obligation はなし。

## Inputs reviewed (files/paths)

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`
- `.qfai/assistant/steering/test-layers.md`
- `.qfai/specs/spec-0012/01_Spec.md`
- `.qfai/specs/spec-0012/02_User-stories.md`
- `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0012/05_Examples.md`
- `.qfai/specs/spec-0012/06_Test-Cases.md`
- `.qfai/specs/spec-0012/09_delta.md`
- `.qfai/specs/spec-0012/10_Plan.md`
- `.qfai/contracts/api/README.md`
- `tests/e2e/qfai-traceability.md`
- `tests/integration/qfai-traceability.md`
- `packages/qfai/tests/e2e/**`
- `packages/qfai/tests/integration/**`
- `packages/qfai/src/core/index.ts`
- `packages/qfai/src/core/harness/measurement.ts`
- `packages/qfai/src/core/harness/panelScore.ts`
- `packages/qfai/src/core/prototyping/specCoverage.ts`
- `packages/qfai/src/core/prototyping/refSemantics.ts`

## Decisions made (with rationale)

- rev11 ATDD obligation は E2E 7件 / API 0件 / Integration 13件とした。API contract は実義務がないため test 追加なし。
- 既存の prototyping 系パターンに合わせ、source-inspection 型の acceptance test を採用した。rev11 は semantic closure の確認が主で、実装 source と core test 同期の検査が acceptance objective に一致するため。
- validate が参照する annotation source は root `tests/e2e|integration/qfai-traceability.md` なので、packages 側 test 追加と同時に root traceability を更新した。
- rejected option の再導入はない。`09_delta.md` の rev11 decision に沿い、public export 再公開や legacy grammar 許容は行っていない。
- The stub runner in `does not invoke the server runner when --auto-serve is absent` returns a well-formed `ok: true` result.
  A call that should not happen is then caught by the test's own assertion, rather than by iterate failing to read an empty result.
- The case `uses the default runner when no captureScreen is injected, and exits 2 naming Playwright when it is not installed` mocks `playwright` with a module whose `chromium` export throws an `ERR_MODULE_NOT_FOUND` error.
  vitest wraps an error thrown by a mock factory in an error of its own, which the default runner reads as a broken install rather than a missing package.
  Raised from the export, the error reaches the runner's own module-not-found branch.
- The case `dynamically loads defaultServerRunner; deferred sentinel error is gone` now binds a port that was free a moment before, and spies on `net.Server.prototype.listen`.
  It asserts exit 0, one listen on the `--target-url` port, and no server left listening after iterate returns.
  Before, it asserted only that the exit code was a number, which also held when iterate used no default runner at all.
- `TDD-0516` and `TDD-0517` are `unit` rows whose cases declare `Level: L1`, so this stage writes no handover entry for them.
  `CR-20260923-0001` step 3 gives them to `/qfai-implement`, whose evidence is `implement-spec-0012.md`.
  Their annotation lines are left to that run too, which adds them in the change that advances the rows.
  Added here, they put both rows on `openRowAlreadyTested.test.ts`'s list of open rows a test already annotates, which may only shrink.
- `Test 6` of `prototypingIterate.checkConvergence.test.ts` is two tests: `Test 6a` calls `parseArgs`, and `Test 6b` peeks with no cycle.
  Every assertion is unchanged; each half moved whole into its own test.
  Before, a mutation of the parse failed the test before the cycle was read, so the default-cycle boundary had no failure of its own.
- Three annotations are removed, because no clause of the case they name is observed by their test:
  - `exports defaultCaptureScreen as a function (smoke test on the default runner module)` loses `TC-0012-0484`.
    It checks the type of a module export and never runs iterate.
  - `surfaces 'playwright not installed' and exits 2 when the runner reports the missing-dep failure shape (DI-mimicked)` loses `TC-0012-0484`.
    It injects a capture runner, while the case's clause is about a run with none injected.
    It still passes when iterate's fallback to the default runner is replaced.
  - `does not invoke serverRunner when autoServe flag is absent` loses `TC-0012-0485`.
    `CR-20260923-0014` gives the iterate half of "its absence starts no server" to `TDD-0469`, whose test asserts it with a well-formed stub.
    This test's stub is a bare `vi.fn()`, so when the gate is broken it fails on a `TypeError` before its assertion runs.
    The parse half is test `parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent`, which keeps the annotation.
    Keeping the annotation because the case's text names the clause was weighed.
    It would leave an annotation no row selects, on a test that observes the clause through no assertion.
- `TDD-0568` breaks iterate's own use of the UI contracts, `collectScreensForCapture`, and separately narrows the reader's glob to `.yaml`.
  Changing the glob to `**/*.json` fails both of the row's tests too, but the glob is shared by every UI-contract reader.
  That mutation also fails twelve `done` rows of spec-0012 and spec-0013, so it does not show the row's own predicate.
- Deleting the line that sets `--capture` or `--auto-serve` leaves the flag-absent test passing.
  `TDD-0514` and `TDD-0515` therefore carry a second mutation, which sets the flag in the `options` initializer, so both of their tests fail.
- A row whose tests share a `describe` that holds nothing else, or a title fragment no other test carries, is selected by that text.
  `TDD-0572` and `TDD-0575` have neither, so their `Selector` is a JSON array, one command per entry.
- `TDD-0571`'s test fails on its own `Promise.race` error, `teardown exceeded 2s budget`, and not on an assertion.
  Its one assertion, `elapsed < 2000`, runs only when the teardown resolves before the race timer, so no mutation can fail it without timing luck.
  `CR-20260923-0014` accepts that error as the statement of the bound.

## Work performed (what changed, where)

- `tests/e2e/qfai-traceability.md`
  - `QFAI:SPEC-0012:US-0012-0077..0083` を追加。
- `tests/integration/qfai-traceability.md`
  - `QFAI:SPEC-0012:TC-0012-0272..0284` を追加。
- `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts`
  - rev11 E2E test を新規追加。
  - `index.ts` export closure、`measurement.ts` strict validation、`panelScore.ts` strict validation、`specCoverage.ts` / `refSemantics.ts` semantic closure、core test synchronization を検査。
- `packages/qfai/tests/integration/prototypingRev11Integration.test.ts`
  - rev11 Integration test を新規追加。
  - `TC-0012-0272..0284` の ID 対応を spec に合わせて調整し、実装 source / core tests との一致を検査。
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts`
  - New case `TC-0012-0489 (TDD-0561)`: the default runner refuses a held port.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts`
  - Each of the four tests carries `QFAI:SPEC-0012:TC-0012-0442`.
  - The stub runner in `does not invoke the server runner when --auto-serve is absent` returns a well-formed `ok: true` result instead of nothing. The title and both assertions are unchanged.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts`
  - Six tests carry `QFAI:SPEC-0012:TC-0012-0484`, the six `CR-20260923-0001` names.
  - New block (11): with no `captureScreen` injected and Playwright missing, iterate exits 2 and stderr names Playwright. It carries the same annotation.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts`
  - Five tests carry `QFAI:SPEC-0012:TC-0012-0485`. Block (7) carries none: its refusal is `TC-0012-0489`.
  - `dynamically loads defaultServerRunner; deferred sentinel error is gone` asserts that iterate bound the `--target-url` port, exited 0 and left no server listening. Its three existing assertions stay, and `typeof exit` became `exit === 0`.
  - `listenOnEphemeralPort` moved from block (8) to file scope, unchanged, so block (3) can use it.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts`
  - All eight tests carry `QFAI:SPEC-0012:TC-0012-0488`.
- `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts`
  - The file carries `QFAI:SPEC-0012:US-0012-0143`, and a new `US-0012-0143` block runs the peek through the CLI entry point.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts`
  - `Test 6` is now `Test 6a: --check-convergence WITHOUT --cycle parses as a known flag` and `Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9`. Both carry `QFAI:SPEC-0012:TC-0012-0488`.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts`
  - The two block (3) tests no longer carry `QFAI:SPEC-0012:TC-0012-0484`.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts`
  - Block (4) no longer carries `QFAI:SPEC-0012:TC-0012-0485`.

## Commands executed + key outputs

| Command | Outcome | Key output |
| --- | --- | --- |
| `pnpm -C packages/qfai test:e2e && pnpm -C packages/qfai test:integration` | PASS | rev11 追加分を含む focused E2E / Integration green |
| `npx qfai validate --fail-on error --format github` | PARTIAL | `QFAI-ATDD-111/112` 消滅、残り 31 errors は pre-existing / out-of-scope |
| `pnpm check-types` | PASS | type check green |
| `node scripts/verify-pack.mjs` | PASS | pack verification green |
| `pnpm exec prettier -c tests/e2e/qfai-traceability.md tests/integration/qfai-traceability.md packages/qfai/tests/e2e/prototypingRev11E2E.test.ts packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | PASS | changed files formatting green |
| `pnpm lint` | FAIL (pre-existing) | unrelated existing failures in `prototypingSkillE2E.test.ts`, `validatePipelineIntegration.test.ts` |
| `pnpm -C packages/qfai test` | FAIL (pre-existing) | existing timeout in `tests/integration/specAutoDiscovery.test.ts > TC-0014-0028` |
| `pnpm format:check` | FAIL (pre-existing) | repo-wide existing format issues |

## Test volume estimate

| Layer | Raw count | Signal | Evidence | Notes |
| --- | ---: | ---: | --- | --- |
| E2E | 7 | 7 | `.qfai/specs/spec-0012/02_User-stories.md` | `US-0012-0077..0083` |
| API | 0 | 0 | `.qfai/contracts/api/README.md` | spec-0012 rev11 に contract obligation なし |
| Integration | 13 | 13 | `.qfai/specs/spec-0012/06_Test-Cases.md` | `TC-0012-0272..0284` |

## Grilling Session

### /qfai-atdd — run started 2026-09-23T06:51:05.149Z

Preflight: confidence high

No session opened. The change request fixes both rows, their test cases and the
test file each case names, and nothing surfaced during the run that the spec or
the change request leaves open.


### /qfai-implement — run started 2026-09-23T06:48:00.000Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T07:01:00Z | d310849f2a0d737689212974f479c2007c2a4f27 | 2026-09-23T07:03:00Z | a ledger row whose Selector names four boundaries of one test case | empty | none in flight | 1 | 0 | 0 |

### /qfai-atdd — run started 2026-09-23T11:30:58.834Z

Preflight: confidence high

No session opened. `CR-20260923-0001` fixes the rows, their test cases and the
test file each case names. Three rows need a split, which is a Change Request
this stage reports rather than decides, and the two fixture choices this run
made are recorded under `## Decisions made`.

### /qfai-atdd — run started 2026-09-23T21:09:31.563Z

Preflight: confidence high

No session opened. `CR-20260923-0014` fixes the twelve rows, the boundary each
holds and the tests of each boundary. The three annotations it leaves to this
run were settled by reading each test against its case: an annotation names a
case its test discharges. The readings, and the reading that was weighed and
not taken, are under `## Decisions made`.

### /qfai-implement — run started 2026-09-23T22:29:18.879Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T22:30:20Z | da96f2d57cf5ee5ffb422dedb2269c27fa7b7143 | 2026-09-23T22:30:30Z | preflight | empty | none in flight | 2 | 0 | 0 |
| S2 | adopted | 2026-09-23T22:31:48Z | da96f2d57cf5ee5ffb422dedb2269c27fa7b7143 | 2026-09-23T22:31:49Z | the two mutations the TDD-0514 handover names mask each other when applied together | empty | none in flight | 1 | 0 | 0 |
| S3 | adopted | 2026-09-23T22:36:51Z | da96f2d57cf5ee5ffb422dedb2269c27fa7b7143 | 2026-09-23T22:37:41Z | the test cases of the unit rows TDD-0516 and TDD-0517 each state several boundaries | empty | none in flight | 2 | 0 | 0 |

## Ledger rows advanced

This run takes up the rows `CR-20260923-0002` owes, as `CR-20260923-0004`
split them: one row per boundary. Every row passed on its first run here, so
every row takes branch 2. The mutations are production code, and
`/qfai-implement` Phase Red step 3c applies them.

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0469` | `TC-0012-0442` | Integration | falsifiability | [TDD-0469](#tdd-0469) |
| `TDD-0561` | `TC-0012-0489` | Integration | falsifiability | [TDD-0561](#tdd-0561) |
| `TDD-0562` | `TC-0012-0442` | Integration | falsifiability | [TDD-0562](#tdd-0562) |
| `TDD-0563` | `TC-0012-0442` | Integration | falsifiability | [TDD-0563](#tdd-0563) |
| `TDD-0564` | `TC-0012-0442` | Integration | falsifiability | [TDD-0564](#tdd-0564) |
| `TDD-0567` | `US-0012-0143` | E2E | falsifiability | [TDD-0567](#tdd-0567) |
| `TDD-0514` | `TC-0012-0484` | Integration | falsifiability | [TDD-0514](#tdd-0514) |
| `TDD-0515` | `TC-0012-0485` | Integration | falsifiability | [TDD-0515](#tdd-0515) |
| `TDD-0497` | `TC-0012-0488` | Integration | falsifiability | [TDD-0497](#tdd-0497) |
| `TDD-0568` | `TC-0012-0484` | Integration | falsifiability | [TDD-0568](#tdd-0568) |
| `TDD-0569` | `TC-0012-0484` | Integration | falsifiability | [TDD-0569](#tdd-0569) |
| `TDD-0570` | `TC-0012-0485` | Integration | falsifiability | [TDD-0570](#tdd-0570) |
| `TDD-0571` | `TC-0012-0485` | Integration | falsifiability | [TDD-0571](#tdd-0571) |
| `TDD-0572` | `TC-0012-0488` | Integration | falsifiability | [TDD-0572](#tdd-0572) |
| `TDD-0573` | `TC-0012-0488` | Integration | falsifiability | [TDD-0573](#tdd-0573) |
| `TDD-0574` | `TC-0012-0488` | Integration | falsifiability | [TDD-0574](#tdd-0574) |
| `TDD-0575` | `TC-0012-0488` | Integration | falsifiability | [TDD-0575](#tdd-0575) |
| `TDD-0576` | `TC-0012-0488` | Integration | falsifiability | [TDD-0576](#tdd-0576) |

The run started 2026-09-23T11:30:58.834Z takes up the rows `CR-20260923-0001`
resets. `TDD-0567` is handed over on the falsifiability branch. `TDD-0514`,
`TDD-0515` and `TDD-0497` are not handed over: each case has several
independently observable boundaries, so each row needed a split, which
`CR-20260923-0014` made. `TDD-0516` and `TDD-0517` are `/qfai-implement`'s
rows and have no entry here.

The run started 2026-09-23T21:09:31.563Z takes up the twelve rows
`CR-20260923-0014` leaves at `todo`, one boundary each. Every test passed on its
first run at `ae69c92c848153aaee2119919df293a82f1f0905`, the commit that split
`Test 6` and removed three annotations, so every row takes the falsifiability
branch. Each entry names the predicate to break and the mutation. This run
applied each mutation, ran it, and reverted it at that commit, to confirm the
row's tests fail and to see which other rows fail with them. The runs covered
the case's Test files and every other file that exercises the same code, listed
under `## Execution logs`. `/qfai-implement` Phase Red step 3c takes the recorded
runs.

### TDD-0469

- TDD-ID: TDD-0469
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Selector: does not invoke the server runner when --auto-serve is absent
- TC-ref: TC-0012-0442
- Branch: falsifiability — the change request restated the test case and changed no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1281, `runPrototypingIterate` — `if (options.autoServe) {`, the gate that keeps the runner uncalled without `--auto-serve`
- Mutation: `if (options.autoServe) {` to `if (options.autoServe ?? options.serverRunner) {`
- Why it fails: the test injects a runner and no `autoServe`, so the mutated gate calls it.
  The stub answers with a well-formed `ok: true` result, so iterate completes with exit 0.
  `expect(runner).not.toHaveBeenCalled()` then fails as an assertion
- Type check: `options.autoServe ?? options.serverRunner` is a boolean or a function, and the mutated line passes `tsc`

The case's stub runner returns a well-formed `ok: true` result, so a call that
should not happen is caught by the case's own assertion rather than by iterate
failing to read an empty result.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the `if (options.autoServe)` guard — with the flag off no runner is called
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "does not invoke the server runner when --auto-serve is absent"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected "spy" to not be called at all, but actually been called 1 times` at `tests/integration/cli/commands/prototypingIterate.autoServe.test.ts:126:24`

The edit:

```diff
-  if (options.autoServe) {
+  if (options.autoServe ?? options.serverRunner) {
```

- Round 1: Falsifiability revision: working-tree+7a8f32f6baf1088c4c44836c7d0e23476db662fb1832fcf95dad042a1ec63d5d
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: a1b34eacd9d13660bb4eff8d8471d83e92b692bb92fc9ed252bf1eac53039a77
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
```

- Round 1: Revision: 8e198e459f426d6624cbf56808d297bdf2fa78d2
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "does not invoke the server runner when --auto-serve is absent"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 4 passed (4). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+7a8f32f6baf1088c4c44836c7d0e23476db662fb1832fcf95dad042a1ec63d5d; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 8e198e459f426d6624cbf56808d297bdf2fa78d2

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the case and criterion cite REQ-0012-0062, which still contradicts the restated runner contract; CR-20260923-0005 restates it, and no test or production code changes
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923070010000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 56721b3c7b1257d40d353cde24231170975244a804c1394e06f9454a5163ea2c

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923070020000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 2d241794cc2e4e64001299328cec9b0a2f193a7acd7ac219e7931d16f9d98182
- Spec review: PASS
- Spec reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Spec audited evidence hash: 5e4e86c7e10234e38ba403eae219a23d5d6a3b27a3a560a95277ea92e4b75ec3
- Spec review pack: .qfai/review/review-20260923070020000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 2d241794cc2e4e64001299328cec9b0a2f193a7acd7ac219e7931d16f9d98182
- Code quality review: PASS
- Code quality reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Code quality audited evidence hash: 5e4e86c7e10234e38ba403eae219a23d5d6a3b27a3a560a95277ea92e4b75ec3
- Code quality review pack: .qfai/review/review-20260923070020000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 2d241794cc2e4e64001299328cec9b0a2f193a7acd7ac219e7931d16f9d98182
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 4 passed (4). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification seal: 1f2ac512b423453dcb5888136f34104b8c33fb0386a2fb918272833601bcfa41

### TDD-0561

- TDD-ID: TDD-0561
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Selector: TC-0012-0489 (TDD-0561): refuses the held port, binds no other and iterate exits 2 naming it
- TC-ref: TC-0012-0489
- Branch: falsifiability — the default runner already refuses a port another listener holds and names it (`port ${port} already in use`), so the new test passed on its first run
- Predicate to break: packages/qfai/src/core/prototyping/defaultServerRunner.ts:207, `bindServer` — the `EADDRINUSE` refusal reason that names the held port
- Mutation: `` `port ${port} already in use; refusing to attach to a foreign process. ` `` to `` `port already in use; refusing to attach to a foreign process. ` ``
- Why it fails: iterate still exits 2, and the rest of the reason names the port only as `:<port>` in the `lsof` and `findstr` hints.
  ``expect(stderrChunks.join("")).toContain(`port ${blocker.port}`)`` therefore fails

The test binds an ephemeral listener, then runs `runPrototypingIterate` with
`autoServe: true`, no `serverRunner`, and a `targetUrl` naming that port, which
the default runner binds. It observes the four clauses of the case:

| Clause | Observation |
| ------ | ----------- |
| iterate exits 2 | `expect(exit).toBe(2)` |
| stderr names the held port | stderr contains `port <held port>` |
| the holder is still listening | a TCP connection to the held port succeeds after iterate returns |
| no other port is bound | a spy on `net.Server.prototype.listen`, installed after the holder bound, records exactly one call, on the held port, and the one server it started is not listening afterwards |

First run:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "TC-0012-0489 \(TDD-0561\): refuses the held port, binds no other and iterate exits 2 naming it"
  Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/prototyping/defaultServerRunner.ts, `bindServer`, the `EADDRINUSE` refusal reason that names the held port
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "TC-0012-0489 \(TDD-0561\): refuses the held port, binds no other and iterate exits 2 naming it"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17). The row's case fails on `AssertionError: expected 'qfai prototyping iterate --auto-serve…' to contain 'port 54313'` at `tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:599:37`

The edit:

```diff
-            `port ${port} already in use; refusing to attach to a foreign process. ` +
+            `port already in use; refusing to attach to a foreign process. ` +
```

- Round 1: Falsifiability revision: working-tree+4172d4ebd95524128f278757c71f61cb2ff7bc926c3ad409eee0c37c51a21f1c
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 30076a2c4b1382a476d60bb74673f6c13cca1ef4ba8697ac3e3c814389d38f57
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
```

- Round 1: Revision: 8e198e459f426d6624cbf56808d297bdf2fa78d2
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "TC-0012-0489 \(TDD-0561\): refuses the held port, binds no other and iterate exits 2 naming it"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 17 passed (17). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+4172d4ebd95524128f278757c71f61cb2ff7bc926c3ad409eee0c37c51a21f1c; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 8e198e459f426d6624cbf56808d297bdf2fa78d2

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the case and criterion cite REQ-0012-0062, which still contradicts the restated runner contract; CR-20260923-0005 restates it, and no test or production code changes
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923070011000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 61c338610efc9a8a6952864f537c89260b272f62908a7c75fffc30ada5c8eccd

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923070021000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 2216fa8157c07ad7e3f91e2844a0bad9d7c99f6e4ed8e3e6beec1d3664f4b60b
- Spec review: PASS
- Spec reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Spec audited evidence hash: ca6f856b0b64eeeec4212d88e1003697c9ec07c04c9d252998efa3abe8147ccf
- Spec review pack: .qfai/review/review-20260923070021000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 2216fa8157c07ad7e3f91e2844a0bad9d7c99f6e4ed8e3e6beec1d3664f4b60b
- Code quality review: PASS
- Code quality reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Code quality audited evidence hash: ca6f856b0b64eeeec4212d88e1003697c9ec07c04c9d252998efa3abe8147ccf
- Code quality review pack: .qfai/review/review-20260923070021000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 2216fa8157c07ad7e3f91e2844a0bad9d7c99f6e4ed8e3e6beec1d3664f4b60b
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 17 passed (17). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification seal: 70e129296d4d2063f21aaf1c3a094f8f25cafd43fe2c26dc10612dde7b6e9e72

### TDD-0562

- TDD-ID: TDD-0562
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Selector: calls the runner once and invokes the returned teardown at cycle end
- TC-ref: TC-0012-0442
- Branch: falsifiability — the change request restated the test case and changed no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1369, `runPrototypingIterate` — `await teardownOnce();`, the cycle-end teardown in the `finally` block
- Mutation: delete line 1369
- Why it fails: nothing else invokes the teardown during the cycle, so `expect(teardown).toHaveBeenCalledTimes(1)` sees 0 calls

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the cycle-end `await teardownOnce();`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "calls the runner once and invokes the returned teardown at cycle end"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected "spy" to be called 1 times, but got 0 times` at `tests/integration/cli/commands/prototypingIterate.autoServe.test.ts:146:22`

The edit:

```diff
-    await teardownOnce();
+
```

- Round 1: Falsifiability revision: working-tree+57d63f74344721fb082af6bd1a6d76b205864c9237c530e1e773f1d61af06486
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: a1b34eacd9d13660bb4eff8d8471d83e92b692bb92fc9ed252bf1eac53039a77
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
```

- Round 1: Revision: 8e198e459f426d6624cbf56808d297bdf2fa78d2
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "calls the runner once and invokes the returned teardown at cycle end"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 4 passed (4). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+57d63f74344721fb082af6bd1a6d76b205864c9237c530e1e773f1d61af06486; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 8e198e459f426d6624cbf56808d297bdf2fa78d2

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the case and criterion cite REQ-0012-0062, which still contradicts the restated runner contract; CR-20260923-0005 restates it, and no test or production code changes
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923070012000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 8e3f487b19031aa00a191e4d593f3ed8f7598e7e6c34d28c0ce977dc3efbe62e

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923070022000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 3879bd83cd09457da35beee476a185f405d2dcdc653777d88b8568721d8248d7
- Spec review: PASS
- Spec reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Spec audited evidence hash: ced20f278f26a7aff4c7f41e8af6c4695b2f38cee810882629dfd449ba838744
- Spec review pack: .qfai/review/review-20260923070022000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 3879bd83cd09457da35beee476a185f405d2dcdc653777d88b8568721d8248d7
- Code quality review: PASS
- Code quality reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Code quality audited evidence hash: ced20f278f26a7aff4c7f41e8af6c4695b2f38cee810882629dfd449ba838744
- Code quality review pack: .qfai/review/review-20260923070022000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 3879bd83cd09457da35beee476a185f405d2dcdc653777d88b8568721d8248d7
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 4 passed (4). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification seal: 1f2ac512b423453dcb5888136f34104b8c33fb0386a2fb918272833601bcfa41

### TDD-0563

- TDD-ID: TDD-0563
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Selector: accepts runner.ok=true (recovery path) and continues to cycle completion
- TC-ref: TC-0012-0442
- Branch: falsifiability — the change request restated the test case and changed no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1321, `runPrototypingIterate` — `serverTeardown = serverResult.teardown;`, iterate adopting the teardown of a runner that reports success
- Mutation: `serverTeardown = serverResult.teardown;` to `serverTeardown = null;`
- Why it fails: the recovery run still exits 0, but the returned teardown is never adopted.
  `expect(teardown).toHaveBeenCalledTimes(1)` sees 0 calls
- Type check: the mutated line passes `tsc`. Deleting the line instead does not:
  `serverTeardown` is initialised to `null` and never assigned again, so `tsc` narrows it to `never` inside `teardownOnce` and rejects the call at line 1276
- Distinct from `TDD-0562`, whose predicate is the cycle-end call at line 1369

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, `serverTeardown = serverResult.teardown;` — an ok runner's teardown is adopted
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "accepts runner.ok=true \(recovery path\) and continues to cycle completion"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected "spy" to be called 1 times, but got 0 times` at `tests/integration/cli/commands/prototypingIterate.autoServe.test.ts:167:22`

The edit:

```diff
-    serverTeardown = serverResult.teardown;
+    serverTeardown = null;
```

- Round 1: Falsifiability revision: working-tree+e94047bf4e1c76bbaf42f2db7d828e5807c3d2704b8ac779162ab7db879ea8bc
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: a1b34eacd9d13660bb4eff8d8471d83e92b692bb92fc9ed252bf1eac53039a77
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
```

- Round 1: Revision: 8e198e459f426d6624cbf56808d297bdf2fa78d2
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "accepts runner.ok=true \(recovery path\) and continues to cycle completion"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 4 passed (4). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+e94047bf4e1c76bbaf42f2db7d828e5807c3d2704b8ac779162ab7db879ea8bc; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 8e198e459f426d6624cbf56808d297bdf2fa78d2

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the case and criterion cite REQ-0012-0062, which still contradicts the restated runner contract; CR-20260923-0005 restates it, and no test or production code changes
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923070013000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 0c622d183a2b0bd5871876ecd0ed3fdfadddca84bf63801235edd043ba50622f

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923070023000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 7cb24849bc1ac26124e7c0736662c0aa01593243ba4c61e3c5f7efbfd1cce492
- Spec review: PASS
- Spec reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Spec audited evidence hash: d409f65645994178ed17fb2006531ed298cc4ddd854d1e36b9e3b302eab9e940
- Spec review pack: .qfai/review/review-20260923070023000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 7cb24849bc1ac26124e7c0736662c0aa01593243ba4c61e3c5f7efbfd1cce492
- Code quality review: PASS
- Code quality reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Code quality audited evidence hash: d409f65645994178ed17fb2006531ed298cc4ddd854d1e36b9e3b302eab9e940
- Code quality review pack: .qfai/review/review-20260923070023000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 7cb24849bc1ac26124e7c0736662c0aa01593243ba4c61e3c5f7efbfd1cce492
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 4 passed (4). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification seal: 1f2ac512b423453dcb5888136f34104b8c33fb0386a2fb918272833601bcfa41

### TDD-0564

- TDD-ID: TDD-0564
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Selector: returns exit 2 with PID + owning command on stderr when runner refuses
- TC-ref: TC-0012-0442
- Branch: falsifiability — the change request restated the test case and changed no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1318, `runPrototypingIterate` — the refusal `error(...)` that puts the runner's reason on stderr
- Mutation: ``error(`qfai prototyping iterate --auto-serve: ${serverResult.reason}`);`` to `error("qfai prototyping iterate --auto-serve: refused");`
- Why it fails: the exit code stays 2, and `expect(joined).toMatch(/foreign process/)` fails because stderr no longer carries the reason

#### Round 1

An earlier run of this gate, discarded:

- Command: `pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "returns exit 2 with PID + owning command on stderr when runner refuses"`, with the same mutation applied
- Result: `Test Files 1 skipped (1); Tests 4 skipped (4)`, exit 0
- Cause: the unescaped `+` read as a regular-expression quantifier, so the filter matched no test
- What followed: the mutation was reverted, the tree was confirmed back at `8e198e459f426d6624cbf56808d297bdf2fa78d2`, and the mutation was re-applied and re-run with every metacharacter escaped, as recorded below
- The raw output of that run was not kept

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the refusal `error(...)` that carries the runner's reason
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "returns exit 2 with PID \+ owning command on stderr when runner refuses"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected 'qfai prototyping iterate --auto-serve…' to match /foreign process/` at `tests/integration/cli/commands/prototypingIterate.autoServe.test.ts:199:22`

The edit:

```diff
-      error(`qfai prototyping iterate --auto-serve: ${serverResult.reason}`);
+      error("qfai prototyping iterate --auto-serve: refused");
```

- Round 1: Falsifiability revision: working-tree+adb451e843c406c5c0fd26760ad623f4845da5c55423f94a205cc7ccf8201876
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: a1b34eacd9d13660bb4eff8d8471d83e92b692bb92fc9ed252bf1eac53039a77
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
```

- Round 1: Revision: 8e198e459f426d6624cbf56808d297bdf2fa78d2
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "returns exit 2 with PID \+ owning command on stderr when runner refuses"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 4 passed (4). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 REVISE, RED phase gate: the entry omitted a discarded run whose filter selected no test; qa-gatekeeper#2 PASS, RED phase gate on the falsifiability mutation run after that run was recorded, reviewed revision working-tree+adb451e843c406c5c0fd26760ad623f4845da5c55423f94a205cc7ccf8201876; qa-gatekeeper#3 PASS, build-phase GREEN + oracle proof, reviewed revision 8e198e459f426d6624cbf56808d297bdf2fa78d2

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the case and criterion cite REQ-0012-0062, which still contradicts the restated runner contract; CR-20260923-0005 restates it, and no test or production code changes
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923070014000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): edd396b930ac9c657e9ca92ff9b3c9f8da067e5c8121ca82be270cb36a4c0bc2

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923070024000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 30730cbffd9f5c8669fc3e6eaa82fedbb7915cd66bd4ebfc9b820d74d4370799
- Spec review: PASS
- Spec reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Spec audited evidence hash: 2a8e71d28b0d7f5963cc7392d4ee3a746d09319534776cd6031b348c71d4492d
- Spec review pack: .qfai/review/review-20260923070024000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 30730cbffd9f5c8669fc3e6eaa82fedbb7915cd66bd4ebfc9b820d74d4370799
- Code quality review: PASS
- Code quality reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Code quality audited evidence hash: 2a8e71d28b0d7f5963cc7392d4ee3a746d09319534776cd6031b348c71d4492d
- Code quality review pack: .qfai/review/review-20260923070024000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 30730cbffd9f5c8669fc3e6eaa82fedbb7915cd66bd4ebfc9b820d74d4370799
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: f5fcfba30dc0fe74f61d201cc7282bb8c1132cff
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts --reporter=verbose && pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — step 1, the Test file: Test Files 1 passed (1); Tests 4 passed (4), naming the TDD-0564 case as passed. Step 2, the full suite: Test Files 770 passed | 3 skipped (773); Tests 14543 passed | 82 skipped (14625), exit 0. The worker count and per-test timeout are raised because two slow suites time out at the default under a full parallel run on this host
- Checkpoint verification revision: 2d35c540bad7b3ae24611d105b105ce5e63f7f2a
- Checkpoint verification seal: a8d25651519a0f5a47b1bea669fa3d8e5fda13f859d923e5f9273e2b16539606

### TDD-0567

- TDD-ID: TDD-0567
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts
- Selector: US-0012-0143: iterate --check-convergence reports the recorded loop state read-only
- US-ref: US-0012-0143
- Branch: falsifiability — the peek predates the story, so the new block passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:3327, `runCheckConvergencePeek` — the closing `return 2;`, the exit code of every recorded state that is not converged
- Mutation: `return 2;` to `return 0;` at line 3327
- Why it fails: the budget-exhausted record still prints `Not converged`, but the run exits 0.
  `expect(notConverged.exitCode).toBe(2)` fails as an assertion, `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/e2e/spec0012PrototypingRemediationE2E.test.ts:565:35`
- Other rows: the other 19 tests of the E2E file still pass. Three tests of `prototypingIterate.checkConvergence.test.ts` fail: `converged with a negative acceptedIterationIndex is NOT converged`, `Test 2` and `Test 3`. They belong to `TDD-0497`, which is at `todo`, so no completed row is affected
- Type check: the mutated line is a plain `return 0;` in a function returning `Promise<number>`

The block runs `qfai prototyping iterate --check-convergence --root <project>`
through the CLI entry point, with no `--cycle`, twice against one project:

| Clause | Observation |
| ------ | ----------- |
| AC-0012-0083 and EX-0012-0189: a `max-iterations` record with `acceptedIterationIndex: null`, peeked without `--cycle` | exit 2; stdout carries `(cycle 9):`, `stopReason: max-iterations`, `acceptedIterationIndex: null`, `iterations: 10` and `Not converged: stopReason="max-iterations"` |
| EX-0012-0189: a `converged` record with `acceptedIterationIndex: 3` | exit 0; stdout carries `stopReason: converged`, `acceptedIterationIndex: 3`, `iterations: 4` and `Converged:` |
| AC-0012-0083: the run writes nothing and starts no cycle | after each run `prototyping.json` is byte-for-byte what the test wrote, and the project's file list equals the one taken before the first run |

`EX-0012-0187` and `EX-0012-0188` hang from `BR-0012-0066`, whose criterion is
`AC-0012-0059`, the `--capture` criterion. They are not in this story's chain,
so the block does not assert them.

First run:

```text
pnpm -C packages/qfai exec vitest run tests/e2e/spec0012PrototypingRemediationE2E.test.ts -t "US-0012-0143: iterate --check-convergence reports the recorded loop state read-only"
  Test Files 1 passed (1); Tests 1 passed | 19 skipped (20)
```

The mutation was applied, run and reverted at revision
`8d6fc3cbdd81e577a3cf46ec20987251ffa99acc`:

```text
pnpm -C packages/qfai exec vitest run tests/e2e/spec0012PrototypingRemediationE2E.test.ts -t "US-0012-0143: iterate --check-convergence reports the recorded loop state read-only"
  AssertionError: expected +0 to be 2 // Object.is equality
   ❯ tests/e2e/spec0012PrototypingRemediationE2E.test.ts:565:35
  Test Files 1 failed (1); Tests 1 failed | 19 skipped (20)
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts:
  Test Files 1 passed (1); Tests 1 passed | 19 skipped (20)
```

`/qfai-implement` Phase Red step 3c takes the recorded run.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runCheckConvergencePeek`, the closing `return 2;` for every recorded state that is not converged
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0012PrototypingRemediationE2E.test.ts -t "US-0012-0143: iterate --check-convergence reports the recorded loop state read-only"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 19 skipped (20). The row's case fails on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/e2e/spec0012PrototypingRemediationE2E.test.ts:565:35`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..860f95df9 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -3327 +3327 @@ async function runCheckConvergencePeek(root: string, cycle: number): Promise<num
-  return 2;
+  return 0;
```

- Round 1: Falsifiability revision: working-tree+d21a70a81a9ba2f18a1b3ceb84cda53be75e99939d78d779131801cb8a93dd64
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: cbc624eb31702de967d6c55559105628638570df03331d570a2864b509918cf8
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0012PrototypingRemediationE2E.test.ts -t "US-0012-0143: iterate --check-convergence reports the recorded loop state read-only"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 19 skipped (20)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0012PrototypingRemediationE2E.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 20 passed (20). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree d21a70a8… (shared with TDD-0572) matches; E2E selector fails :565:35 on the closing return 2; hash cbc624eb… recomputes; GREEN and file 20/20 at HEAD

#### Done rows on the same Test file

Sixteen `done` rows name this Test file: `TDD-0460` to `TDD-0463`, `TDD-0473`
to `TDD-0476`, `TDD-0490` to `TDD-0495` and `TDD-0509` to `TDD-0513`. None
records a `RED test manifest`, so this edit moves no recorded hash and there is
no re-verify record to write. The whole file passed after the edit: Test Files 1
passed (1); Tests 20 passed (20).

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: faa1315fa7983ee6781af66e5fcbb199b71a40e8d7776bf4b86924a41fc7a57c
- Spec review pack: .qfai/review/review-20260923140012000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 256f2d746f219b4ace5b483d14077a306050065adbc0202442680e242794a992
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: faa1315fa7983ee6781af66e5fcbb199b71a40e8d7776bf4b86924a41fc7a57c
- Code quality review pack: .qfai/review/review-20260923140012000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 256f2d746f219b4ace5b483d14077a306050065adbc0202442680e242794a992
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0012PrototypingRemediationE2E.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 20 passed (20). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: eb97d7d06b754f67804fdab308bd0266d8eabe11bb665e783fac3669e00343e4

### TDD-0514

- TDD-ID: TDD-0514
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Selector: ["parseArgs sets options.prototypingCapture=true when --capture is present","parseArgs leaves prototypingCapture undefined when --capture is absent"]
- TC-ref: TC-0012-0484
- Branch: falsifiability — the parser already handles `--capture`, so both tests passed on their first run
- Predicate to break: packages/qfai/src/cli/lib/args.ts:932, `parseArgs` — `options.prototypingCapture = true;`, the only place the flag is set; and packages/qfai/src/cli/lib/args.ts:232, the `options` initializer, which leaves the flag unset when it is absent
- Mutation: delete line 932. Separately, line 232 `rootExplicit: false,` to `rootExplicit: false, prototypingCapture: true,`
- Why it fails: with line 932 deleted, `--capture` sets nothing, and `expect(parsed.options.prototypingCapture).toBe(true)` in the flag-present test fails.
  With the initializer changed, the flag is on without `--capture`, and `toBeUndefined()` in the flag-absent test fails.
  Deleting line 932 alone leaves the flag-absent test passing, which is why the row carries both
- Other rows: none. Outside the ledger, each mutation also fails tests in `tests/cli/args.test.ts`, and the deletion fails `qfaiPrototyping.iterateFlagSurface.test.ts`; no row names either file
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 under each mutation
- Run with: `-t 'iterate --capture: \(1\) CLI flag parses'`, which selects the `describe`'s two tests and no other (Tests 2 passed | 16 skipped (18))
- Done rows on this Test file: none

```text
line 932 deleted:
  parseArgs sets options.prototypingCapture=true when --capture is present
    AssertionError: expected undefined to be true // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:139:47
line 232 given prototypingCapture: true:
  parseArgs leaves prototypingCapture undefined when --capture is absent
    AssertionError: expected true to be undefined
     ❯ tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:146:47
after git checkout -- packages/qfai/src/cli/lib/args.ts: both pass
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/lib/args.ts, `parseArgs`, the `--capture` case and the `options` initializer
- Round 1: Falsifiability command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "parseArgs sets options\.prototypingCapture=true when --capture is present"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "parseArgs leaves prototypingCapture undefined when --capture is absent"
```

- Round 1: Falsifiability result: One run per entry, all against the tree below. Entry 1: Test Files 1 failed (1); Tests 1 failed | 17 skipped (18), failing on `AssertionError: expected false to be true // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:139:47`. Entry 2: Test Files 1 failed (1); Tests 1 failed | 17 skipped (18), failing on `AssertionError: expected true to be undefined` at `tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:146:47`

The proof sets the flag to `false` in the `--capture` case rather than deleting the line.
Applied together, the deletion and the initializer mask each other: the initializer then sets the flag without `--capture`, so the flag-present test reads `true` and passes.
A first proof run applied exactly that pair and is discarded. Entry 1 passed (Tests 1 passed | 17 skipped (18)).
Entry 2 failed on `AssertionError: expected true to be undefined` at `tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:146:47`.
The handover's two mutations are recorded one at a time below.

The edit, both mutations applied together:

```diff
diff --git a/packages/qfai/src/cli/lib/args.ts b/packages/qfai/src/cli/lib/args.ts
index 82a3be9a5..de235c42c 100644
--- a/packages/qfai/src/cli/lib/args.ts
+++ b/packages/qfai/src/cli/lib/args.ts
@@ -232 +232 @@ export function parseArgs(argv: string[], cwd: string): ParsedArgs {
-    rootExplicit: false,
+    rootExplicit: false, prototypingCapture: true,
@@ -932 +932 @@ export function parseArgs(argv: string[], cwd: string): ParsedArgs {
-          options.prototypingCapture = true;
+          options.prototypingCapture = false;
```

Each mutation alone, run against every entry and reverted. These runs are not the proof; they show which predicate each test reads:

```text
args.ts:932 deleted:
  parseArgs sets options.prototypingCapture=true when --capture is present: Test Files 1 failed (1); Tests 1 failed | 17 skipped (18) — AssertionError: expected undefined to be true // Object.is equality at tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:139:47
  parseArgs leaves prototypingCapture undefined when --capture is absent: Test Files 1 passed (1); Tests 1 passed | 17 skipped (18)
args.ts:232 rootExplicit: false, to rootExplicit: false, prototypingCapture: true,:
  parseArgs sets options.prototypingCapture=true when --capture is present: Test Files 1 passed (1); Tests 1 passed | 17 skipped (18)
  parseArgs leaves prototypingCapture undefined when --capture is absent: Test Files 1 failed (1); Tests 1 failed | 17 skipped (18) — AssertionError: expected true to be undefined at tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:146:47
```

- Round 1: Falsifiability revision: working-tree+ab99c390b3cdd8ed3de22d8ce8074fe76d6c06267c97d3da9c40f0842827c81d
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 112bea3e2f3befbdc6aab1a9bfb571b2ef128a246a0fe3e25a06d895235499c3
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "parseArgs sets options\.prototypingCapture=true when --capture is present"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "parseArgs leaves prototypingCapture undefined when --capture is absent"
```

- Round 1: GREEN result: One run per entry. Entry 1: Test Files 1 passed (1); Tests 1 passed | 17 skipped (18). Entry 2: Test Files 1 passed (1); Tests 1 passed | 17 skipped (18)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/core/tddListObligationColumns.test.ts tests/assets/completedRowNamesItsTestCase.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 70 passed (70) — the row's test file 18 of 18, and the three files the rework changed: `validate.sddProfileLedgerSeed.test.ts` 20, `tddListObligationColumns.test.ts` 31, `completedRowNamesItsTestCase.test.ts` 1. No production file changed
- Refactor verify revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree ab99c390… matches; both entries fail on their own AssertionError (:139:47, :146:47); both edits inside parseArgs; hash 112bea3e… recomputes; GREEN 2/2 and file 18/18 at HEAD

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: TDD-0514's sdd-profile routing of the new check has no test; TDD-0575's Test 6b bypasses the CLI default at main.ts:398 through a cast; the row goes to review-fix. This row takes the path for a `REVISE` that needs no new production behaviour, and opens no round. The rework adds the `--profile sdd` case for `QFAI-TDDLIST-022` to `validate.sddProfileLedgerSeed.test.ts`. It adds an empty `TC-Refs` cell and a `CON-DB-*` id on a `Unit` row to `tddListObligationColumns.test.ts`. It states in the `CHANGELOG.md` entry and in the check's expected-state text which rows are exempt, and corrects the header of `completedRowNamesItsTestCase.test.ts`. Commit `c505a4bc1de4a002847ef7d2672babf9050798bc`. Removing `TC_REFS_NAME_NO_TEST_CASE_CODE` from the seed-shape set in `tddList.ts` fails the new `--profile sdd` case (`expected [ 'TDDLIST_TC_NOT_COVERED', …(20) ] to include 'QFAI-TDDLIST-022'`); reverted
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923140000000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 83fb1d8e77aa7df6c063cff233f7cbb9456146ebc8e82ba4881009cbff8b9a3e

### TDD-0515

- TDD-ID: TDD-0515
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Selector: ["parseArgs sets options.prototypingAutoServe=true when --auto-serve is present","parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent"]
- TC-ref: TC-0012-0485
- Branch: falsifiability — the parser already handles `--auto-serve`, so both tests passed on their first run
- Predicate to break: packages/qfai/src/cli/lib/args.ts:942, `parseArgs` — `options.prototypingAutoServe = true;`, the only place the flag is set; and packages/qfai/src/cli/lib/args.ts:232, the `options` initializer, which leaves the flag unset when it is absent
- Mutation: delete line 942. Separately, line 232 `rootExplicit: false,` to `rootExplicit: false, prototypingAutoServe: true,`
- Why it fails: with line 942 deleted, `--auto-serve` sets nothing, and `expect(parsed.options.prototypingAutoServe).toBe(true)` in the flag-present test fails.
  With the initializer changed, serving is on without `--auto-serve`, and `toBeUndefined()` in the flag-absent test fails
- Other rows: none. Outside the ledger, each mutation also fails a test in `tests/cli/args.test.ts`, and the deletion fails `qfaiPrototyping.iterateFlagSurface.test.ts`; no row names either file
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 under each mutation
- Run with: `-t 'iterate --auto-serve: \(1\) CLI flag parses'`, which selects the `describe`'s two tests and no other (Tests 2 passed | 15 skipped (17))
- Done rows on this Test file: `TDD-0561`, re-verified below

The iterate half of the case's "its absence starts no server" is `TDD-0469`'s,
as `CR-20260923-0014` step 3 records. The block (4) test that also observed
it no longer carries this case's annotation (`## Decisions made`).

```text
line 942 deleted:
  parseArgs sets options.prototypingAutoServe=true when --auto-serve is present
    AssertionError: expected undefined to be true // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:147:49
line 232 given prototypingAutoServe: true:
  parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent
    AssertionError: expected true to be undefined
     ❯ tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:154:49
after git checkout -- packages/qfai/src/cli/lib/args.ts: both pass
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/lib/args.ts, `parseArgs`, the `--auto-serve` case and the `options` initializer
- Round 1: Falsifiability command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "parseArgs sets options\.prototypingAutoServe=true when --auto-serve is present"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent"
```

- Round 1: Falsifiability result: One run per entry, all against the tree below. Entry 1: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17), failing on `AssertionError: expected false to be true // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:147:49`. Entry 2: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17), failing on `AssertionError: expected true to be undefined` at `tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:154:49`

The proof sets the flag to `false` in the `--auto-serve` case rather than deleting the line.
Applied together with the initializer, a deletion is masked: the initializer then sets the flag, so the flag-present test passes, as the `TDD-0514` proof run found.
The handover's two mutations are recorded one at a time below.

The edit, both mutations applied together:

```diff
diff --git a/packages/qfai/src/cli/lib/args.ts b/packages/qfai/src/cli/lib/args.ts
index 82a3be9a5..c8c3f9dcf 100644
--- a/packages/qfai/src/cli/lib/args.ts
+++ b/packages/qfai/src/cli/lib/args.ts
@@ -232 +232 @@ export function parseArgs(argv: string[], cwd: string): ParsedArgs {
-    rootExplicit: false,
+    rootExplicit: false, prototypingAutoServe: true,
@@ -942 +942 @@ export function parseArgs(argv: string[], cwd: string): ParsedArgs {
-          options.prototypingAutoServe = true;
+          options.prototypingAutoServe = false;
```

Each mutation alone, run against every entry and reverted. These runs are not the proof; they show which predicate each test reads:

```text
args.ts:942 deleted:
  parseArgs sets options.prototypingAutoServe=true when --auto-serve is present: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17) — AssertionError: expected undefined to be true // Object.is equality at tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:147:49
  parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)
args.ts:232 rootExplicit: false, to rootExplicit: false, prototypingAutoServe: true,:
  parseArgs sets options.prototypingAutoServe=true when --auto-serve is present: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)
  parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17) — AssertionError: expected true to be undefined at tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:154:49
```

- Round 1: Falsifiability revision: working-tree+bf35a854076517330c1cce66fd7d71312c8fd3227f76c6e137a98bb11b7805b9
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: f800ebeb6792b20caa6994b1527742d4a83af8279eceae2888e172f5da5ba616
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "parseArgs sets options\.prototypingAutoServe=true when --auto-serve is present"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent"
```

- Round 1: GREEN result: One run per entry. Entry 1: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17). Entry 2: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 17 passed (17). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree bf35a854… matches; both entries fail on their own AssertionError (:147:49, :154:49); both edits inside parseArgs; hash f800ebeb… recomputes; GREEN 2/2 and file 17/17 at HEAD

#### Shared-artifact re-verify

The Test file changed twice after `TDD-0561` recorded its hash. The run started
2026-09-23T11:30:58.834Z added five annotation lines, changed the test at line
179 and moved `listenOnEphemeralPort` to file scope without changing it. The run
started 2026-09-23T21:09:31.563Z removed the annotation from the block (4)
test. `TDD-0561` is the one `done` row whose manifest holds the file. Its selector
was re-run against the file as it now stands, and its original mutation was
re-applied, run and reverted. This record replaces the one the earlier run
wrote here, whose hash no longer recomputes.

##### spec-0012/TDD-0561

- Evidence file: .qfai/evidence/atdd-spec-0012.md
- Revision: ae69c92c848153aaee2119919df293a82f1f0905
- Selector: TC-0012-0489 (TDD-0561): refuses the held port, binds no other and iterate exits 2 naming it
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "TC-0012-0489 \(TDD-0561\): refuses the held port, binds no other and iterate exits 2 naming it"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "TC-0012-0489 \(TDD-0561\): refuses the held port, binds no other and iterate exits 2 naming it", with `packages/qfai/src/core/prototyping/defaultServerRunner.ts:207` changed from `` `port ${port} already in use; refusing to attach to a foreign process. ` + `` to `` `port already in use; refusing to attach to a foreign process. ` + ``
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 16 skipped (17). The row's case fails on `AssertionError: expected 'qfai prototyping iterate --auto-serve…' to contain 'port 62588'` at `tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:615:37`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "TC-0012-0489 \(TDD-0561\): refuses the held port, binds no other and iterate exits 2 naming it", after `git checkout -- packages/qfai/src/core/prototyping/defaultServerRunner.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)
- RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
```

- RED test hash: f800ebeb6792b20caa6994b1527742d4a83af8279eceae2888e172f5da5ba616

The record is read as evidence once this entry is a completed, reviewed item.

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 568fc51fd911a9b319be758edb15da97824ccef588d9de2a3efcdcd03b3d01cc
- Spec review pack: .qfai/review/review-20260923140003000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 698d60faac0a741d6fc8b9bc8e5f5b0e50865a0a997055f1b02597e0e73c869e
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 568fc51fd911a9b319be758edb15da97824ccef588d9de2a3efcdcd03b3d01cc
- Code quality review pack: .qfai/review/review-20260923140003000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 698d60faac0a741d6fc8b9bc8e5f5b0e50865a0a997055f1b02597e0e73c869e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 17 passed (17). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 845d63183d803803ee4802c394343e08366727b0b82d52c229d1a210eae32e20

### TDD-0497

- TDD-ID: TDD-0497
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Selector: Test 1: cycle 9 + converged loop (converged + accepted) -> exit 0 + report
- TC-ref: TC-0012-0488
- Branch: falsifiability — the peek predates the restated case, so the test passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:3297, `runCheckConvergencePeek` — `if (stopReason === "converged" && acceptedIterationIndex !== null) {`, the one branch that exits 0
- Mutation: `acceptedIterationIndex !== null` to `acceptedIterationIndex === null` at line 3297
- Why it fails: a `converged` record with accepted index 3 now falls through to the not-converged branch and the peek exits 2.
  `expect(exit).toBe(0)` fails as an assertion
- Other rows: every row whose test peeks a `converged` record fails with it, all at `todo`: `TDD-0572` (the negative-index test, which the mutation turns to exit 0), `TDD-0575` (`Test 5` and `Test 6b`), `TDD-0576` and `TDD-0567`. No `done` row is affected.
  Each of those tests uses a converged record as its fixture, so no mutation of this branch can fail `Test 1` alone
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with: `-t 'Test 1: cycle 9 \+ converged loop \(converged \+ accepted\) -> exit 0 \+ report'` (Tests 1 passed | 8 skipped (9))
- Done rows on this Test file: none

```text
line 3297 !== null to === null:
  Test 1: cycle 9 + converged loop (converged + accepted) -> exit 0 + report
    AssertionError: expected 2 to be +0 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:80:20
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: passes
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runCheckConvergencePeek`, the converged branch at line 3297
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 1: cycle 9 \+ converged loop \(converged \+ accepted\) -> exit 0 \+ report"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected 2 to be +0 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:80:20`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..c8e61a5ac 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -3297 +3297 @@ async function runCheckConvergencePeek(root: string, cycle: number): Promise<num
-  if (stopReason === "converged" && acceptedIterationIndex !== null) {
+  if (stopReason === "converged" && acceptedIterationIndex === null) {
```

- Round 1: Falsifiability revision: working-tree+fc39f9e4ca5371543507acd70644cbe9fdd2f46003d9e10661a917e247c85857
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9d4193a220c699ecc1386d982d78eea194d454488684af1c4ebfccf259a73979
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 1: cycle 9 \+ converged loop \(converged \+ accepted\) -> exit 0 \+ report"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 9 passed (9). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree fc39f9e4… matches; converged-branch edit at line 3297 fails :80:20 inside runCheckConvergencePeek; hash 9d4193a2… recomputes; GREEN and file 9/9 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 805e35dd94f1909c364eaae449915ee60b6d38b90b9e3e29ff7100bd10a00cdf
- Spec review pack: .qfai/review/review-20260923140006000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 131b50c7d244f55f1dacbcded56dec0a9cf06fd0a1019a9d059115000129f62a
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 805e35dd94f1909c364eaae449915ee60b6d38b90b9e3e29ff7100bd10a00cdf
- Code quality review pack: .qfai/review/review-20260923140006000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 131b50c7d244f55f1dacbcded56dec0a9cf06fd0a1019a9d059115000129f62a
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 9 passed (9). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 60f7209cf2387cb5916af472e9d68f116fa462cc0c9e4138daa2ad3ef90d4422

### TDD-0568

- TDD-ID: TDD-0568
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Selector: derives screens from
- TC-ref: TC-0012-0484
- Branch: falsifiability — iterate already derives screens from the UI contracts, so both tests passed on their first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1845, `collectScreensForCapture` — `return canonical.map((entry) => ({ id: entry.screenId, url: entry.route }));`, iterate turning the contracts' screens into its capture list; and packages/qfai/src/core/contracts/screenContracts.ts:144, `readUiContractDocuments` — the `**/*.{yaml,yml}` glob that reads both extensions
- Mutation: line 1845 `canonical.map(` to `canonical.slice(0, 0).map(`. Separately, line 144 `"**/*.{yaml,yml}"` to `"**/*.yaml"`
- Why it fails: with line 1845 changed, iterate captures no screen, and `expect(calls.sort()).toEqual(["home", "settings"])` fails in both tests.
  With the glob narrowed, a `.yml` contract is not read, and the same assertion fails in the `.yml` test alone
- Other rows: none under either mutation.
  `CR-20260923-0014` names the glob to `**/*.json`, which fails both tests as well. It also fails twelve `done` rows, because every UI-contract reader shares the glob: spec-0012 `TDD-0387`, `TDD-0418`, `TDD-0419`, `TDD-0427`, `TDD-0445`, `TDD-0447`, `TDD-0451`, and spec-0013 `TDD-0020`, `TDD-0021`, `TDD-0027`, `TDD-0028`, `TDD-0030`. The two mutations above are named instead
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 under each mutation
- Run with: `-t 'derives screens from'`, which selects the two tests and no other (Tests 2 passed | 16 skipped (18)). No `describe` holds both: they are in blocks (8) and (10), and block (8) also holds the no-contract warning test
- Done rows on this Test file: none

```text
line 1845 canonical.map( to canonical.slice(0, 0).map(:
  derives screens from UI contracts when CLI sets capture=true without DI screens
    AssertionError: expected [] to deeply equal [ 'home', 'settings' ]
     ❯ tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:438:26
  derives screens from `.yml` UI contracts (extension parity with `.yaml`)
    AssertionError: expected [] to deeply equal [ 'home', 'settings' ]
     ❯ tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:633:26
line 144 glob to "**/*.yaml":
  derives screens from `.yml` UI contracts (extension parity with `.yaml`)
    AssertionError: expected [] to deeply equal [ 'home', 'settings' ]
     ❯ tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:633:26
after git checkout of each file: both pass
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `collectScreensForCapture`; and packages/qfai/src/core/contracts/screenContracts.ts, `readUiContractDocuments`, the `**/*.{yaml,yml}` glob
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "derives screens from"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 2 failed | 16 skipped (18). Both of the row's tests fail on `AssertionError: expected [] to deeply equal [ 'home', 'settings' ]` at `tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:438:26`, and `AssertionError: expected [] to deeply equal [ 'home', 'settings' ]` at `tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:633:26`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..75a2b1375 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -1845 +1845 @@ async function collectScreensForCapture(
-  return canonical.map((entry) => ({ id: entry.screenId, url: entry.route }));
+  return canonical.slice(0, 0).map((entry) => ({ id: entry.screenId, url: entry.route }));
```

Each mutation alone, run against every entry and reverted. These runs are not the proof; they show which predicate each test reads:

```text
screenContracts.ts:144 "**/*.{yaml,yml}" to "**/*.yaml":
  derives screens from: Test Files 1 failed (1); Tests 1 failed | 1 passed | 16 skipped (18) — AssertionError: expected [] to deeply equal [ 'home', 'settings' ] at tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:633:26
```

- Round 1: Falsifiability revision: working-tree+e1d118bd57ed1ab4562086ac10c9f125f628fac3e2e90ec49ca5175b2169692b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 112bea3e2f3befbdc6aab1a9bfb571b2ef128a246a0fe3e25a06d895235499c3
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "derives screens from"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed | 16 skipped (18)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 18 passed (18). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree e1d118bd… matches; line 1845 fails both selected tests (:438:26, :633:26) inside collectScreensForCapture; hash 112bea3e… recomputes; GREEN and file 18/18 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 2bc33755fe7f51c8464b1dbb3fceffb5163961e3aab1bcfc360ce2d4fa8b159a
- Spec review pack: .qfai/review/review-20260923140001000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 8e0f0529338dcde56082a0b66f546ebda7c72de5ba538786a8ff4e3644d8118a
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 2bc33755fe7f51c8464b1dbb3fceffb5163961e3aab1bcfc360ce2d4fa8b159a
- Code quality review pack: .qfai/review/review-20260923140001000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 8e0f0529338dcde56082a0b66f546ebda7c72de5ba538786a8ff4e3644d8118a
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 18 passed (18). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 5884f0850b92bbda283c82c693ec79cbb7829d498556dc02ad107639bbdd482e

### TDD-0569

- TDD-ID: TDD-0569
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Selector: uses the default runner when no captureScreen is injected, and exits 2 naming Playwright when it is not installed
- TC-ref: TC-0012-0484
- Branch: falsifiability — iterate already falls back to the default Playwright runner, so the test passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1535, `runCapturePath` — `runner = mod.defaultCaptureScreen;`, the fallback taken when no runner is injected
- Mutation: `runner = mod.defaultCaptureScreen;` to `runner = async () => ({ ok: true, durationMs: 0 });`
- Why it fails: iterate no longer reaches the default runner, so the missing Playwright is never reported and the run exits 0.
  `expect(exit).toBe(2)` fails as an assertion
- Other rows: none
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with: `-t 'uses the default runner when no captureScreen is injected, and exits 2 naming Playwright when it is not installed'` (Tests 1 passed | 17 skipped (18))
- Done rows on this Test file: none

The test observes the default runner only through its missing-Playwright
outcome, which is the outcome CI can reach, so both halves of the case's third
clause are one boundary.

```text
line 1535 to a stub runner:
  uses the default runner when no captureScreen is injected, and exits 2 naming Playwright when it is not installed
    AssertionError: expected +0 to be 2 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:680:20
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: passes
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runCapturePath`, the fallback to `defaultCaptureScreen`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "uses the default runner when no captureScreen is injected, and exits 2 naming Playwright when it is not installed"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 17 skipped (18). The row's case fails on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts:680:20`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..7089d525e 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -1535 +1535 @@ async function runCapturePath(
-      runner = mod.defaultCaptureScreen;
+      runner = async () => ({ ok: true, durationMs: 0 });
```

- Round 1: Falsifiability revision: working-tree+f8f8a4848bbfd8501f9cff55216907bbc9203ce021d4aa1d43b74e9008eeb288
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 112bea3e2f3befbdc6aab1a9bfb571b2ef128a246a0fe3e25a06d895235499c3
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts -t "uses the default runner when no captureScreen is injected, and exits 2 naming Playwright when it is not installed"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 17 skipped (18)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 18 passed (18). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree f8f8a484… matches; stubbed defaultCaptureScreen fallback fails :680:20 inside runCapturePath; hash 112bea3e… recomputes; GREEN and file 18/18 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 0cd1f3f4e35d8bcf6eed9b4b97e76ea1fb44c2af637dc72e90a0ec773db1224a
- Spec review pack: .qfai/review/review-20260923140002000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 2276b26301d3e00a739d0a7f5644a38e0da646a6b9f9e04c264605773255d167
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 0cd1f3f4e35d8bcf6eed9b4b97e76ea1fb44c2af637dc72e90a0ec773db1224a
- Code quality review pack: .qfai/review/review-20260923140002000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 2276b26301d3e00a739d0a7f5644a38e0da646a6b9f9e04c264605773255d167
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 18 passed (18). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 5884f0850b92bbda283c82c693ec79cbb7829d498556dc02ad107639bbdd482e

### TDD-0570

- TDD-ID: TDD-0570
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Selector: dynamically loads defaultServerRunner; deferred sentinel error is gone
- TC-ref: TC-0012-0485
- Branch: falsifiability — iterate already falls back to the default server runner, so the test passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1294, `runPrototypingIterate` — `serverRunner = mod.defaultServerRunner;`, the fallback taken when no runner is injected
- Mutation: `serverRunner = mod.defaultServerRunner;` to `serverRunner = async () => ({ ok: true, teardown: async () => {} });`
- Why it fails: the stub binds no port, so the spy on `net.Server.prototype.listen` records no call.
  `expect(listenPorts).toEqual([probe.port])` fails as an assertion
- Other rows: `TDD-0561`, which is `done`, fails too: its test also runs with no runner injected, and the stub never refuses the held port, so iterate exits 0.
  That is the same predicate seen from its refusal side; the mutation is reverted, and the restored run passes
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with: `-t 'dynamically loads defaultServerRunner; deferred sentinel error is gone'` (Tests 1 passed | 16 skipped (17))
- Done rows on this Test file: `TDD-0561`, re-verified in `TDD-0515`'s entry

```text
line 1294 to a stub runner:
  dynamically loads defaultServerRunner; deferred sentinel error is gone
    AssertionError: expected [] to deeply equal [ 61635 ]
     ❯ tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:215:27
  TC-0012-0489 (TDD-0561): refuses the held port, binds no other and iterate exits 2 naming it
    AssertionError: expected +0 to be 2 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:614:20
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: both pass
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the fallback to `defaultServerRunner`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "dynamically loads defaultServerRunner; deferred sentinel error is gone"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17). The row's case fails on `AssertionError: expected [] to deeply equal [ 56761 ]` at `tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:215:27`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..7948d9a92 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -1294 +1294 @@ export async function runPrototypingIterate(
-        serverRunner = mod.defaultServerRunner;
+        serverRunner = async () => ({ ok: true, teardown: async () => {} });
```

- Round 1: Falsifiability revision: working-tree+81060ea6b4d3644cb82ff472921552a9221c6e424afd48f39448fed1335a7621
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: f800ebeb6792b20caa6994b1527742d4a83af8279eceae2888e172f5da5ba616
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "dynamically loads defaultServerRunner; deferred sentinel error is gone"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 17 passed (17). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree 81060ea6… matches; stubbed defaultServerRunner fallback fails :215:27; TDD-0561 re-verify in #tdd-0515 covers the annotation removal (ae69c92c8, f800ebeb…); GREEN and file 17/17 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 8e57bcf6dbdb269215a999f457a3be7df4f4e9a6c6c06308066a41105c033ca0
- Spec review pack: .qfai/review/review-20260923140004000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 8049ee527669a1c08b47c9387df815c3db86fed321eec029ba61371971d0a3bf
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 8e57bcf6dbdb269215a999f457a3be7df4f4e9a6c6c06308066a41105c033ca0
- Code quality review pack: .qfai/review/review-20260923140004000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 8049ee527669a1c08b47c9387df815c3db86fed321eec029ba61371971d0a3bf
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 17 passed (17). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 845d63183d803803ee4802c394343e08366727b0b82d52c229d1a210eae32e20

### TDD-0571

- TDD-ID: TDD-0571
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Selector: default runner teardown resolves within 2000ms
- TC-ref: TC-0012-0485
- Branch: falsifiability — the default runner's teardown already resolves well inside the bound, so the test passed on its first run
- Predicate to break: packages/qfai/src/core/prototyping/defaultServerRunner.ts:174, `defaultServerRunner`'s `teardown` — the `resolve();` inside `server.close`
- Mutation: `resolve();` to `setTimeout(resolve, 2500);` at line 174
- Why it fails: the teardown now resolves after 2500 ms, so the 2000 ms timer in the test's `Promise.race` rejects first.
  The test fails on `Error: teardown exceeded 2s budget`, raised by that timer at line 277, and not on an `AssertionError`.
  `CR-20260923-0014` accepts that error as the statement of the bound under test.
  The test's one assertion, `expect(elapsed).toBeLessThan(2000)`, runs only when the teardown won the race, so no mutation fails it without timing luck
- Other rows: none. This is not `TDD-0566`'s SIGINT bound: that case injects a runner, so the default runner's teardown is outside it
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with: `-t 'default runner teardown resolves within 2000ms'` (Tests 1 passed | 16 skipped (17))
- Done rows on this Test file: `TDD-0561`, re-verified in `TDD-0515`'s entry

```text
line 174 resolve(); to setTimeout(resolve, 2500);:
  default runner teardown resolves within 2000ms
    Error: teardown exceeded 2s budget
     ❯ tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:277:33
after git checkout -- packages/qfai/src/core/prototyping/defaultServerRunner.ts: passes
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/prototyping/defaultServerRunner.ts, `defaultServerRunner`, the `teardown` that resolves on `server.close`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "default runner teardown resolves within 2000ms"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 16 skipped (17). The row's case fails on `Error: teardown exceeded 2s budget` at `tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts:277:33`. That error is not an `AssertionError`: the test's own 2000 ms timer raises it when the teardown loses its `Promise.race`, and `CR-20260923-0014` accepts it as the statement of the bound under test

The edit:

```diff
diff --git a/packages/qfai/src/core/prototyping/defaultServerRunner.ts b/packages/qfai/src/core/prototyping/defaultServerRunner.ts
index bc1340193..3dcd792c1 100644
--- a/packages/qfai/src/core/prototyping/defaultServerRunner.ts
+++ b/packages/qfai/src/core/prototyping/defaultServerRunner.ts
@@ -174 +174 @@ export const defaultServerRunner = async (args: ServerRunnerArgs): Promise<Serve
-        resolve();
+        setTimeout(resolve, 2500);
```

- Round 1: Falsifiability revision: working-tree+29c723e1a4bdc5bf27ccfd7de16ad0cf239b2be203a582230383f6cdeacc6359
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: f800ebeb6792b20caa6994b1527742d4a83af8279eceae2888e172f5da5ba616
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "default runner teardown resolves within 2000ms"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 16 skipped (17)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 17 passed (17). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree 29c723e1… matches; the test's own 2 s race rejection at :277:33 inside the selector states the bound and is admissible; hash f800ebeb… recomputes; GREEN and file 17/17 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: a53ec9159d507006d34903ccc6dbb22fd4e12e1687aa73bc31901693963b335e
- Spec review pack: .qfai/review/review-20260923140005000 <!-- qfai:not-a-citation -->
- Spec review pack seal: d358f7366ac67071a43e4d182a455f2d7ba066338487fccb5a9e62898996712c
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: a53ec9159d507006d34903ccc6dbb22fd4e12e1687aa73bc31901693963b335e
- Code quality review pack: .qfai/review/review-20260923140005000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: d358f7366ac67071a43e4d182a455f2d7ba066338487fccb5a9e62898996712c
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 17 passed (17). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 845d63183d803803ee4802c394343e08366727b0b82d52c229d1a210eae32e20

### TDD-0572

- TDD-ID: TDD-0572
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Selector: ["converged with a negative acceptedIterationIndex is NOT converged","Test 2: max-iterations + acceptedIterationIndex null -> exit 2 + Not converged","Test 3: license-verify-fail -> exit 2 + Not converged + reason"]
- TC-ref: TC-0012-0488
- Branch: falsifiability — the peek predates the restated case, so the three tests passed on their first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:3327, `runCheckConvergencePeek` — the closing `return 2;`, the exit code of every recorded state that is not converged
- Mutation: `return 2;` to `return 0;` at line 3327
- Why it fails: each of the three records still prints `Not converged` and its reason, but the peek exits 0.
  `expect(exit).toBe(2)` fails as an assertion in each test
- Other rows: `TDD-0567`, at `todo`, whose E2E block peeks a `max-iterations` record. No `done` row is affected
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with, one command per entry: `-t 'converged with a negative acceptedIterationIndex is NOT converged'`, `-t 'Test 2: max-iterations \+ acceptedIterationIndex null -> exit 2 \+ Not converged'` and `-t 'Test 3: license-verify-fail -> exit 2 \+ Not converged \+ reason'`, each Tests 1 passed | 8 skipped (9).
  No `describe` or common title fragment selects exactly these three
- Done rows on this Test file: none

```text
line 3327 return 2; to return 0;:
  converged with a negative acceptedIterationIndex is NOT converged
    AssertionError: expected +0 to be 2 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:105:20
  Test 2: max-iterations + acceptedIterationIndex null -> exit 2 + Not converged
    AssertionError: expected +0 to be 2 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:131:20
  Test 3: license-verify-fail -> exit 2 + Not converged + reason
    AssertionError: expected +0 to be 2 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:155:20
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: all three pass
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runCheckConvergencePeek`, the closing `return 2;`
- Round 1: Falsifiability command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "converged with a negative acceptedIterationIndex is NOT converged"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 2: max-iterations \+ acceptedIterationIndex null -> exit 2 \+ Not converged"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 3: license-verify-fail -> exit 2 \+ Not converged \+ reason"
```

- Round 1: Falsifiability result: One run per entry, all against the tree below. Entry 1: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:105:20`. Entry 2: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:131:20`. Entry 3: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:155:20`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..860f95df9 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -3327 +3327 @@ async function runCheckConvergencePeek(root: string, cycle: number): Promise<num
-  return 2;
+  return 0;
```

- Round 1: Falsifiability revision: working-tree+d21a70a81a9ba2f18a1b3ceb84cda53be75e99939d78d779131801cb8a93dd64
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9d4193a220c699ecc1386d982d78eea194d454488684af1c4ebfccf259a73979
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "converged with a negative acceptedIterationIndex is NOT converged"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 2: max-iterations \+ acceptedIterationIndex null -> exit 2 \+ Not converged"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 3: license-verify-fail -> exit 2 \+ Not converged \+ reason"
```

- Round 1: GREEN result: One run per entry. Entry 1: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 2: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 3: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 9 passed (9). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree d21a70a8… (shared with TDD-0567) matches; all three entries fail separately (:105:20, :131:20, :155:20); hash 9d4193a2… recomputes; GREEN 3/3 and file 9/9 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 9c52a11f46e2014ca80212d1437adc663a6a2bdf93ca10e5d89f4a55197a5dd3
- Spec review pack: .qfai/review/review-20260923140007000 <!-- qfai:not-a-citation -->
- Spec review pack seal: c856bbdd16e1d855944584826c35753464b954bb9b849be06ae65ea0a648670f
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 9c52a11f46e2014ca80212d1437adc663a6a2bdf93ca10e5d89f4a55197a5dd3
- Code quality review pack: .qfai/review/review-20260923140007000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c856bbdd16e1d855944584826c35753464b954bb9b849be06ae65ea0a648670f
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 9 passed (9). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 60f7209cf2387cb5916af472e9d68f116fa462cc0c9e4138daa2ad3ef90d4422

### TDD-0573

- TDD-ID: TDD-0573
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Selector: Test 4: prototyping.json missing -> exit 2 + diagnostic
- TC-ref: TC-0012-0488
- Branch: falsifiability — the peek predates the restated case, so the test passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:3271, `runCheckConvergencePeek` — the `return 2;` after the missing-file diagnostic
- Mutation: `return 2;` to `return 0;` at line 3271
- Why it fails: the diagnostic still prints, but the peek exits 0. `expect(exit).toBe(2)` fails as an assertion
- Other rows: none
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with: `-t 'Test 4: prototyping\.json missing -> exit 2 \+ diagnostic'` (Tests 1 passed | 8 skipped (9))
- Done rows on this Test file: none

```text
line 3271 return 2; to return 0;:
  Test 4: prototyping.json missing -> exit 2 + diagnostic
    AssertionError: expected +0 to be 2 // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:175:20
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: passes
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runCheckConvergencePeek`, the missing-record `return 2;`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 4: prototyping\.json missing -> exit 2 \+ diagnostic"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:175:20`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..476d35287 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -3271 +3271 @@ async function runCheckConvergencePeek(root: string, cycle: number): Promise<num
-    return 2;
+    return 0;
```

- Round 1: Falsifiability revision: working-tree+69eb25d97f31159b2dc1cbc45e37fad637048678ad5f4cc7b7435e0e3a8a34e6
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9d4193a220c699ecc1386d982d78eea194d454488684af1c4ebfccf259a73979
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 4: prototyping\.json missing -> exit 2 \+ diagnostic"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 9 passed (9). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree 69eb25d9… matches; missing-record return 2→0 fails :175:20; hash 9d4193a2… recomputes; GREEN and file 9/9 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 484fd9fb39cc2d43c64190780527b5307ed11e6966a19c7c0cb993a5035d8f3c
- Spec review pack: .qfai/review/review-20260923140008000 <!-- qfai:not-a-citation -->
- Spec review pack seal: a17657748515fdf2966ded25246024313ace24fd1c23723961aae3542cb5b43f
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 484fd9fb39cc2d43c64190780527b5307ed11e6966a19c7c0cb993a5035d8f3c
- Code quality review pack: .qfai/review/review-20260923140008000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: a17657748515fdf2966ded25246024313ace24fd1c23723961aae3542cb5b43f
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 9 passed (9). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 60f7209cf2387cb5916af472e9d68f116fa462cc0c9e4138daa2ad3ef90d4422

### TDD-0574

- TDD-ID: TDD-0574
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Selector: Test 6a: --check-convergence WITHOUT --cycle parses as a known flag
- TC-ref: TC-0012-0488
- Branch: falsifiability — the parser already handles `--check-convergence`, so the test passed on its first run
- Predicate to break: packages/qfai/src/cli/lib/args.ts:922, `parseArgs` — `options.prototypingCheckConvergence = true;`
- Mutation: delete line 922
- Why it fails: the flag parses without error but sets nothing. `expect(parsed.options.prototypingCheckConvergence).toBe(true)` fails as an assertion
- Other rows: `TDD-0567`, at `todo`, whose E2E block runs the peek through the CLI and now gets the usage text. `Test 6b` still passes: it calls iterate directly, which is why it is a test of its own. No `done` row is affected.
  Outside the ledger, `tests/cli/args.test.ts` and `qfaiPrototyping.iterateFlagSurface.test.ts` fail too; no row names either file
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0
- Run with: `-t 'Test 6a: --check-convergence WITHOUT --cycle parses as a known flag'` (Tests 1 passed | 8 skipped (9))
- Done rows on this Test file: none

```text
line 922 deleted:
  Test 6a: --check-convergence WITHOUT --cycle parses as a known flag
    AssertionError: expected undefined to be true // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:221:56
after git checkout -- packages/qfai/src/cli/lib/args.ts: passes
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/lib/args.ts, `parseArgs`, the `--check-convergence` case
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6a: --check-convergence WITHOUT --cycle parses as a known flag"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected undefined to be true // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:221:56`

The edit:

```diff
diff --git a/packages/qfai/src/cli/lib/args.ts b/packages/qfai/src/cli/lib/args.ts
index 82a3be9a5..5df7e4539 100644
--- a/packages/qfai/src/cli/lib/args.ts
+++ b/packages/qfai/src/cli/lib/args.ts
@@ -922 +922 @@ export function parseArgs(argv: string[], cwd: string): ParsedArgs {
-          options.prototypingCheckConvergence = true;
+
```

- Round 1: Falsifiability revision: working-tree+3f247609dfbeb9570aafb9badbba5be6268e994908b73c4380bccde74389151e
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9d4193a220c699ecc1386d982d78eea194d454488684af1c4ebfccf259a73979
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6a: --check-convergence WITHOUT --cycle parses as a known flag"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 9 passed (9). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree 3f247609… matches; deleting args.ts:922 fails :221:56 inside parseArgs; hash 9d4193a2… recomputes; GREEN and file 9/9 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: c0ac71f8aff89eec2a9e35c881f42f0e3bb8da820df992701f7810204ababf6d
- Spec review pack: .qfai/review/review-20260923140009000 <!-- qfai:not-a-citation -->
- Spec review pack seal: b1137d465f406fbd69ffd060ab48dcbfb1bb2e6210576e520a87e20213497012
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: c0ac71f8aff89eec2a9e35c881f42f0e3bb8da820df992701f7810204ababf6d
- Code quality review pack: .qfai/review/review-20260923140009000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: b1137d465f406fbd69ffd060ab48dcbfb1bb2e6210576e520a87e20213497012
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 9 passed (9). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 60f7209cf2387cb5916af472e9d68f116fa462cc0c9e4138daa2ad3ef90d4422

### TDD-0575

- TDD-ID: TDD-0575
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Selector: ["Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9)","Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9"]
- TC-ref: TC-0012-0488
- Branch: falsifiability — the peek predates the restated case, so both tests passed on their first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:459, `runPrototypingIterate` — `return runCheckConvergencePeek(options.root, 9);`, the default when no cycle is given; and line 473, `return runCheckConvergencePeek(options.root, options.cycle);`, the cycle given
- Mutation: line 459 `9` to `0`. Separately, line 473 `options.cycle` to `9`
- Why it fails: with line 459 changed, the peek without `--cycle` reports cycle 0, and `expect(out).toMatch(/cycle\s*9/)` in `Test 6b` fails.
  With line 473 changed, `--cycle 5` reports cycle 9, and `expect(out).toMatch(/cycle\s*5/)` in `Test 5` fails.
  Each mutation fails one entry, so each entry has a failure of its own
- Other rows: none under either mutation
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 under each mutation
- Run with, one command per entry: `-t 'Test 5: --cycle 5 --check-convergence reports the requested cycle \(not 9\)'` and `-t 'Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9'`, each Tests 1 passed | 8 skipped (9).
  No `describe` or common title fragment selects exactly these two
- Done rows on this Test file: `TDD-0497`, `TDD-0572`, `TDD-0573`, `TDD-0574` and `TDD-0576`, re-verified below

```text
line 459 9 to 0:
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9
    AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*9/
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:247:19
line 473 options.cycle to 9:
  Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9)
    AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*5/
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:209:19
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: both pass
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the two `runCheckConvergencePeek` calls of the peek branch
- Round 1: Falsifiability command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 5: --cycle 5 --check-convergence reports the requested cycle \(not 9\)"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9"
```

- Round 1: Falsifiability result: One run per entry, all against the tree below. Entry 1: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*5/` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:209:19`. Entry 2: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*9/` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:247:19`

The two mutations are on different lines, so applied together each entry still fails on its own.
The peek with `--cycle 5` goes through line 473, and the peek without `--cycle` through line 459.

The edit, both mutations applied together:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..326be3afb 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -459 +459 @@ export async function runPrototypingIterate(
-      return runCheckConvergencePeek(options.root, 9);
+      return runCheckConvergencePeek(options.root, 0);
@@ -473 +473 @@ export async function runPrototypingIterate(
-    return runCheckConvergencePeek(options.root, options.cycle);
+    return runCheckConvergencePeek(options.root, 9);
```

Each mutation alone, run against every entry and reverted. These runs are not the proof; they show which predicate each test reads:

```text
prototypingIterate.ts:459 runCheckConvergencePeek(options.root, 9) to runCheckConvergencePeek(options.root, 0):
  Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9): Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9) — AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*9/ at tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:247:19
prototypingIterate.ts:473 runCheckConvergencePeek(options.root, options.cycle) to runCheckConvergencePeek(options.root, 9):
  Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9): Test Files 1 failed (1); Tests 1 failed | 8 skipped (9) — AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*5/ at tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:209:19
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
```

- Round 1: Falsifiability revision: working-tree+69b80e851b936e06e427e90e36c9fc9b1ef9e02cd63b26c5448afc8e7ca1b7db
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9d4193a220c699ecc1386d982d78eea194d454488684af1c4ebfccf259a73979
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 5: --cycle 5 --check-convergence reports the requested cycle \(not 9\)"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9"
```

- Round 1: GREEN result: One run per entry. Entry 1: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 2: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 9 passed (9). No production file changed in this phase, and the whole test file is the relevant suite. Re-run on the tree Round 2 closed on
- Refactor verify revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree 69b80e85… matches; the two combined edits hit separate paths and each entry fails on its own (:209:19, :247:19); hash 9d4193a2… recomputes; GREEN 2/2 and file 9/9 at HEAD

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: TDD-0514's sdd-profile routing of the new check has no test; TDD-0575's Test 6b bypasses the CLI default at main.ts:398 through a cast; the row goes to review-fix. This row opens Round 2: Test 6b now runs through the CLI entry point, so the default it asserts is read at `main.ts:398`, and that needs a falsifiability run of its own
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923140010000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 0f0400fd6c3ab0036db38484f92ac2d44c62da1002491f224fe8256557c1949d

#### Round 2

Test 6b now runs `prototyping iterate --check-convergence --root <root>`
through `run`, the CLI entry point, instead of calling `runPrototypingIterate`
with `cycle` cast away. The default it asserts is therefore the one
`main.ts:398` supplies, `options.prototypingCycle ?? 9`, and the peek then
reads it through `prototypingIterate.ts:473`. Line 459 is not on that path.
Test 5 is unchanged and still reads line 473.

- Round 2: Satisfied-by: packages/qfai/src/cli/main.ts, `dispatch`, the `cycle` default of the `prototyping iterate` call; and packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the `runCheckConvergencePeek` call that takes the given cycle
- Round 2: Falsifiability command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 5: --cycle 5 --check-convergence reports the requested cycle \(not 9\)"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9"
```

- Round 2: Falsifiability result: One run per entry, all against the tree below. Entry 1: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*5/` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:210:19`. Entry 2: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), failing on `AssertionError: expected '' to contain '(cycle 9)'` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:245:19`

Test 5's half is Round 1's, line 473 `options.cycle` to `9`. On the same tree it
answers `(cycle 9)` for every default in range, so any in-range value at
`main.ts:398` leaves Test 6b passing: `?? 0` together with it passed (below).
The default is therefore taken out of range, `?? 10`. The range check in
`runPrototypingIterate` then refuses the cycle before line 473, the peek
prints nothing, and Test 6b fails on its first assertion.

The edit, both mutations applied together:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..d9acf2c3c 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -473 +473 @@ export async function runPrototypingIterate(
-    return runCheckConvergencePeek(options.root, options.cycle);
+    return runCheckConvergencePeek(options.root, 9);
diff --git a/packages/qfai/src/cli/main.ts b/packages/qfai/src/cli/main.ts
index f58c56e0d..c108fd259 100644
--- a/packages/qfai/src/cli/main.ts
+++ b/packages/qfai/src/cli/main.ts
@@ -398 +398 @@ async function dispatch(command: string, options: ParsedArgs["options"]): Promis
-          cycle: options.prototypingCycle ?? 9,
+          cycle: options.prototypingCycle ?? 10,
```

`tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 on that tree.

Each mutation alone, run against every entry and reverted. These runs are not the proof; they show which predicate each test reads:

```text
main.ts:398 ?? 9 to ?? 10:
  Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9): Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9) — AssertionError: expected '' to contain '(cycle 9)' at tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:245:19
main.ts:398 ?? 9 to ?? 0:
  Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9): Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9) — AssertionError: expected 'qfai prototyping iterate --check-conv…' to contain '(cycle 9)' at tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:245:19
prototypingIterate.ts:473 runCheckConvergencePeek(options.root, options.cycle) to runCheckConvergencePeek(options.root, 9):
  Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9): Test Files 1 failed (1); Tests 1 failed | 8 skipped (9) — AssertionError: expected 'qfai prototyping iterate --check-conv…' to match /cycle\s*5/ at tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:210:19
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
main.ts:398 ?? 9 to ?? 0, with line 473 changed as above:
  Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
```

- Round 2: Falsifiability revision: working-tree+69fa8c000deadebe69b18398fe33185a6f064e390bc418eb539b7734c1cb45a2
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: bf9a7565888fadb44163966f392b86fe675244e5343d56d945a62dcf24c34a7c
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 2: Revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- Round 2: GREEN command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 5: --cycle 5 --check-convergence reports the requested cycle \(not 9\)"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6b: --check-convergence WITHOUT --cycle defaults the peek to cycle 9"
```

- Round 2: GREEN result: One run per entry, after `git checkout -- packages/qfai/src`. Entry 1: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 2: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

#### Shared-artifact re-verify

Round 2 changed the Test file, and five `done` rows hold it in their
manifest. Each row's selector was re-run on the file as it now stands, its
recorded mutation was re-applied, run and reverted, and its selector was run
again. Each mutation is identical to the one the row's own entry records, and
each row fails on the assertion its entry records. The failing line is one
lower than recorded in every case, because of the import Round 2 added.

A first `TDD-0576` proof run is discarded: the tool that applied the mutation
wrote the `\n` in `"{}\n"` as a line break, and the mutated file did not
compile (`Error: Transform failed with 1 error`, no tests run). The mutation
was re-applied as the entry records it, and that run is the one below.

##### spec-0012/TDD-0497

- Evidence file: .qfai/evidence/atdd-spec-0012.md
- Revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- Selector: Test 1: cycle 9 + converged loop (converged + accepted) -> exit 0 + report
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 1: cycle 9 \+ converged loop \(converged \+ accepted\) -> exit 0 \+ report"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 1: cycle 9 \+ converged loop \(converged \+ accepted\) -> exit 0 \+ report", with `packages/qfai/src/cli/commands/prototypingIterate.ts:3297` changed from `acceptedIterationIndex !== null` to `acceptedIterationIndex === null`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected 2 to be +0 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:81:20`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 1: cycle 9 \+ converged loop \(converged \+ accepted\) -> exit 0 \+ report", after `git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- RED test hash: bf9a7565888fadb44163966f392b86fe675244e5343d56d945a62dcf24c34a7c

##### spec-0012/TDD-0572

- Evidence file: .qfai/evidence/atdd-spec-0012.md
- Revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- Selector: ["converged with a negative acceptedIterationIndex is NOT converged","Test 2: max-iterations + acceptedIterationIndex null -> exit 2 + Not converged","Test 3: license-verify-fail -> exit 2 + Not converged + reason"]
- Re-verify command:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "converged with a negative acceptedIterationIndex is NOT converged"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 2: max-iterations \+ acceptedIterationIndex null -> exit 2 \+ Not converged"
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 3: license-verify-fail -> exit 2 \+ Not converged \+ reason"
```

- Re-verify result: PASS — one run per entry. Entry 1: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 2: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 3: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- Proof command: the three commands above, each run with `packages/qfai/src/cli/commands/prototypingIterate.ts:3327` changed from `return 2;` to `return 0;`
- Proof result: FAIL — one run per entry, all against that tree. Entry 1: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9), on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:106:20`. Entry 2: the same, at `:132:20`. Entry 3: the same, at `:156:20`
- Restored GREEN command: the three commands above, after `git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts`
- Restored GREEN result: PASS — one run per entry. Entry 1: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 2: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9). Entry 3: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- RED test hash: bf9a7565888fadb44163966f392b86fe675244e5343d56d945a62dcf24c34a7c

##### spec-0012/TDD-0573

- Evidence file: .qfai/evidence/atdd-spec-0012.md
- Revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- Selector: Test 4: prototyping.json missing -> exit 2 + diagnostic
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 4: prototyping\.json missing -> exit 2 \+ diagnostic"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 4: prototyping\.json missing -> exit 2 \+ diagnostic", with `packages/qfai/src/cli/commands/prototypingIterate.ts:3271` changed from `return 2;` to `return 0;`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected +0 to be 2 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:176:20`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 4: prototyping\.json missing -> exit 2 \+ diagnostic", after `git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- RED test hash: bf9a7565888fadb44163966f392b86fe675244e5343d56d945a62dcf24c34a7c

##### spec-0012/TDD-0574

- Evidence file: .qfai/evidence/atdd-spec-0012.md
- Revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- Selector: Test 6a: --check-convergence WITHOUT --cycle parses as a known flag
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6a: --check-convergence WITHOUT --cycle parses as a known flag"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6a: --check-convergence WITHOUT --cycle parses as a known flag", with `packages/qfai/src/cli/lib/args.ts:922`, `options.prototypingCheckConvergence = true;`, emptied
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected undefined to be true // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:222:56`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 6a: --check-convergence WITHOUT --cycle parses as a known flag", after `git checkout -- packages/qfai/src/cli/lib/args.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- RED test hash: bf9a7565888fadb44163966f392b86fe675244e5343d56d945a62dcf24c34a7c

##### spec-0012/TDD-0576

- Evidence file: .qfai/evidence/atdd-spec-0012.md
- Revision: c505a4bc1de4a002847ef7d2672babf9050798bc
- Selector: Test 7: --check-convergence does NOT invoke iterate (no iter-NN/iterate-plan.json written)
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 7: --check-convergence does NOT invoke iterate \(no iter-NN/iterate-plan\.json written\)"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 7: --check-convergence does NOT invoke iterate \(no iter-NN/iterate-plan\.json written\)", with `packages/qfai/src/cli/commands/prototypingIterate.ts:3286` changed from `info(header);` to `await writeFile(protoJsonAbs, "{}\n", "utf-8"); info(header);`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected '{}\n' to be '{\n  "stopReason": "converged",\n  "a…' // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:278:24`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 7: --check-convergence does NOT invoke iterate \(no iter-NN/iterate-plan\.json written\)", after `git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)
- RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- RED test hash: bf9a7565888fadb44163966f392b86fe675244e5343d56d945a62dcf24c34a7c

The records are read as evidence once this entry is a completed, reviewed item.

### TDD-0576

- TDD-ID: TDD-0576
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Selector: Test 7: --check-convergence does NOT invoke iterate (no iter-NN/iterate-plan.json written)
- TC-ref: TC-0012-0488
- Branch: falsifiability — the peek predates the restated case, so the test passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:3286, `runCheckConvergencePeek` — the function reads `prototyping.json` and writes nothing; line 3286 is its `info(header);`
- Mutation: `info(header);` to `await writeFile(protoJsonAbs, "{}\n", "utf-8"); info(header);` at line 3286
- Why it fails: the peek overwrites `prototyping.json`. `expect(afterBytes).toBe(beforeBytes)` fails as an assertion
- Other rows: `TDD-0567`, at `todo`, whose E2E block checks the file byte for byte. No `done` row is affected
- Type check: `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0; `writeFile` is already imported
- Run with: `-t 'Test 7: --check-convergence does NOT invoke iterate \(no iter-NN/iterate-plan\.json written\)'` (Tests 1 passed | 8 skipped (9))
- Done rows on this Test file: none

```text
line 3286 given a writeFile before info(header):
  Test 7: --check-convergence does NOT invoke iterate (no iter-NN/iterate-plan.json written)
    AssertionError: expected '{}\n' to be '{\n  "stopReason": "converged",\n  "a…' // Object.is equality
     ❯ tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:277:24
after git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts: passes
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runCheckConvergencePeek`, which reads and never writes
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 7: --check-convergence does NOT invoke iterate \(no iter-NN/iterate-plan\.json written\)"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 8 skipped (9). The row's case fails on `AssertionError: expected '{}\n' to be '{\n  "stopReason": "converged",\n  "a…' // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts:277:24`

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/prototypingIterate.ts b/packages/qfai/src/cli/commands/prototypingIterate.ts
index 13f40dd1e..b9e30b6ca 100644
--- a/packages/qfai/src/cli/commands/prototypingIterate.ts
+++ b/packages/qfai/src/cli/commands/prototypingIterate.ts
@@ -3286 +3286 @@ async function runCheckConvergencePeek(root: string, cycle: number): Promise<num
-  info(header);
+  await writeFile(protoJsonAbs, "{}\n", "utf-8"); info(header);
```

- Round 1: Falsifiability revision: working-tree+a3d7393ffe2c61dacdf60443f5be6a95195fec808f171e293335f2940a52278b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9d4193a220c699ecc1386d982d78eea194d454488684af1c4ebfccf259a73979
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
```

- Round 1: Revision: da96f2d57cf5ee5ffb422dedb2269c27fa7b7143
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts -t "Test 7: --check-convergence does NOT invoke iterate \(no iter-NN/iterate-plan\.json written\)"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 8 skipped (9)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 9 passed (9). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — rebuilt tree a3d7393f… matches; inserted writeFile fails the byte-equality at :277:24 inside runCheckConvergencePeek; hash 9d4193a2… recomputes; GREEN and file 9/9 at HEAD

- Spec review: PASS
- Spec reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Spec audited evidence hash: 349c4640232c0225b75008daf6eb25ffdf22d966e61a95c3a2a17013de13f381
- Spec review pack: .qfai/review/review-20260923140011000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 999b3e68d2d9788b64f0c9529d5d753c394f36a0845e41cff809a2da4f73e7aa
- Code quality review: PASS
- Code quality reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Code quality audited evidence hash: 349c4640232c0225b75008daf6eb25ffdf22d966e61a95c3a2a17013de13f381
- Code quality review pack: .qfai/review/review-20260923140011000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 999b3e68d2d9788b64f0c9529d5d753c394f36a0845e41cff809a2da4f73e7aa
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 9 passed (9). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: cd95d9abfa8f0975ac61a3dbd8b9f85ffa83697d
- Checkpoint verification seal: 60f7209cf2387cb5916af472e9d68f116fa462cc0c9e4138daa2ad3ef90d4422

## Coverage Depth Matrix

| Obligation | Layer | Implemented in | Depth | Rationale |
| --- | --- | --- | --- | --- |
| `US-0012-0077` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | public export omission と rev11 breaking-change comment を source で直接確認 |
| `US-0012-0078` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | 8 category refs、canonical screen contract ref、`validatePanelScore` 呼び出しを検査 |
| `US-0012-0079` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | empty axes / evidenceRefs / non-concrete evidenceRef rejection root を検査 |
| `US-0012-0080` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | `01_Spec.md` only の declaration source 制約を検査 |
| `US-0012-0081` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | `isSpecDeclarationRef` grammar と consumer import を検査 |
| `US-0012-0082` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | measurement / panelScore core tests の negative synchronization を検査 |
| `US-0012-0083` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | specCoverage / refSemantics core tests の semantic closure synchronization を検査 |
| `TC-0012-0272..0276` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | export removal、measurement strict validation、validation ordering を検査 |
| `TC-0012-0277..0278` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | panelScore strict validation source を検査 |
| `TC-0012-0279..0281` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | specCoverage / refSemantics semantic closure を検査 |
| `TC-0012-0282..0284` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | core test existence / describe synchronization を検査 |
| `TC-0012-0442` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts` | D3 | Runs `runPrototypingIterate` with an injected runner and checks the four clauses of the runner contract: no call without `--auto-serve`, one call and one teardown with it, a recovered owner completing the cycle, and a refusal exiting 2 with the runner's reason on stderr. One ledger row per clause: `TDD-0469`, `TDD-0562`, `TDD-0563`, `TDD-0564` |
| `TC-0012-0489` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts` | D3 | Runs `runPrototypingIterate` with the default runner against a port a real listener holds, and checks the exit code, the port in the stderr reason, that the listener still accepts connections, and that no other port was bound |
| `TC-0012-0484` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts` | D3 | Parses `--capture` on and off, derives screens from `.yaml` and `.yml` UI contracts, and runs iterate with no runner injected and Playwright missing, checking exit 2 and the Playwright reason on stderr. One row per boundary: `TDD-0514`, `TDD-0568`, `TDD-0569` |
| `TC-0012-0485` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts` | D3 | Parses `--auto-serve` on and off, runs iterate with no runner injected on a free port and checks the one listen and the teardown, and bounds the default runner's teardown at 2000 ms. One row per boundary: `TDD-0515`, `TDD-0570`, `TDD-0571`. That iterate calls no runner without the flag is `TDD-0469`'s |
| `TC-0012-0488` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts` | D3 | Peeks converged, negative-index, `max-iterations`, `license-verify-fail` and missing records, the given and the default cycle, and checks the peek writes nothing. One row per boundary: `TDD-0497`, `TDD-0572` to `TDD-0576` |
| `US-0012-0143` | E2E | `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts` | D3 | Runs the peek through the CLI entry point without `--cycle` against a `max-iterations` record and a `converged` one, and checks the exit codes, the reported state and that no file changed. `TDD-0567` |

## Coverage obligations checklist

| Obligation set | Required | Implemented | Status |
| --- | --- | --- | --- |
| E2E `US-0012-0077..0083` | 7 | 7 | PASS |
| API `CON-API-*` | 0 | 0 | PASS |
| Integration `TC-0012-0272..0284` | 13 | 13 | PASS |
| Forbidden layer references | none found | none found | PASS |
| Unknown references | none found | none found | PASS |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | `test-design-analyst` | rev11 obligations and depth analysis | spec-0012 US/TC set, `test-layers.md`, existing tests | `#test-volume-estimate`, `#coverage-depth-matrix` | PASS |
| 2 | `qa-strategist` | layer ownership and signal review | spec-0012, contracts, traceability reports | `#test-volume-estimate`, `#coverage-obligations-checklist` | PASS |
| 3 | `acceptance-test-engineer` | implement rev11 acceptance tests | traceability registries, prototyping test patterns | changed files listed in `#work-performed-what-changed-where` | PASS |
| 4 | `devops-ci-engineer` | runtime and gate evidence capture | changed files, validate + repo gates | `#commands-executed--key-outputs`, `#execution-logs` | PASS |
| 5 | `qa-gatekeeper` | coverage depth and scope-local gate review | full ATDD diff and outputs | `#final-status-passfail--who-confirmed` | PASS |
| 6 | `completion-reviewer` | independent completion review | ATDD diff, traceability, evidence, gate outputs | `#final-status-passfail--who-confirmed` | PASS |

### Rows for the run started 2026-09-23T06:51:05.149Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 7 | acceptance-test-engineer | acceptance-test-engineer | Write the `TC-0012-0489` test for `TDD-0561` | CR-20260923-0002, 06_Test-Cases.md `TC-0012-0489` | `prototypingIterate.cliAutoServe.test.ts` | PASS |
| 8 | acceptance-test-engineer | acceptance-test-engineer | Annotate the four `TDD-0469` tests with `TC-0012-0442` | CR-20260923-0002, 06_Test-Cases.md `TC-0012-0442` | `prototypingIterate.autoServe.test.ts` | PASS |
| 9 | acceptance-test-engineer | acceptance-test-engineer | Hand over `TDD-0469` and `TDD-0561` on the falsifiability branch | both test files, `prototypingIterate.ts`, `defaultServerRunner.ts` | #tdd-0469, #tdd-0561 | PASS |
| 10 | acceptance-test-engineer | acceptance-test-engineer | Add `TC-0012-0442` and `TC-0012-0489` to the Coverage Depth Matrix | 06_Test-Cases.md | #coverage-depth-matrix | PASS |
| 11 | - | n/a | grilling(-@2026-09-23T06:51:05.149Z/none): none | - | - | PASS |
| 12 | acceptance-test-engineer | acceptance-test-engineer | Give the entry 1 stub a well-formed result, and name a compiling mutation for entry 3 | #tdd-0469, `red-admissibility.md` | `prototypingIterate.autoServe.test.ts`; #tdd-0469 entries 1 and 3 | PASS |
| 13 | acceptance-test-engineer | acceptance-test-engineer | Re-hand over the split `TDD-0469` as four rows, one boundary each | CR-20260923-0004, `tdd/test-list.md` rows `TDD-0469`, `TDD-0562` to `TDD-0564` | #tdd-0469, #tdd-0562, #tdd-0563, #tdd-0564 | PASS |

### Rows for the /qfai-implement run started 2026-09-23T06:48:00.000Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 14 | qa-gatekeeper | qa-gatekeeper | grilling(S1@2026-09-23T06:48:00.000Z/agents): split `TDD-0469` by boundary through `CR-20260923-0004` rather than narrow its Selector | #tdd-0469, `selector-granularity.md` | `CR-20260923-0004`; narrowing alone would leave three clauses of the case with no row | PASS |
| 15 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0469 RED phase gate on the falsifiability mutation run | #tdd-0469 | Round 1 | PASS |
| 16 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0469 build-phase GREEN + oracle proof | #tdd-0469 | Round 1 | PASS |
| 17 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0561 RED phase gate on the falsifiability mutation run | #tdd-0561 | Round 1 | PASS |
| 18 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0561 build-phase GREEN + oracle proof | #tdd-0561 | Round 1 | PASS |
| 19 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0562 RED phase gate on the falsifiability mutation run | #tdd-0562 | Round 1 | PASS |
| 20 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0562 build-phase GREEN + oracle proof | #tdd-0562 | Round 1 | PASS |
| 21 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0563 RED phase gate on the falsifiability mutation run | #tdd-0563 | Round 1 | PASS |
| 22 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0563 build-phase GREEN + oracle proof | #tdd-0563 | Round 1 | PASS |
| 23 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0564 RED phase gate on the falsifiability mutation run | #tdd-0564 | the entry omitted a discarded run whose filter selected no test | REVISE |
| 24 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0564 RED phase gate, resubmitted with that run recorded | #tdd-0564 | Round 1 | PASS |
| 25 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0564 build-phase GREEN + oracle proof | #tdd-0564 | Round 1 | PASS |
| 26 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of the five rows, attempt 1 | #tdd-0469 … #tdd-0564 | REQ-0012-0062, which the criterion and the case cite, still contradicts the restated runner contract | REVISE |
| 27 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of the five rows, attempt 1 | #tdd-0469 … #tdd-0564 | one response per row in that row's attempt-1 pack | PASS |
| 28 | orchestrator | orchestrator | /qfai-implement: raise, approve and apply CR-20260923-0005, restating REQ-0012-0062, US-0012-0126 and EX-0012-0169's first example | the attempt-1 REVISE | CR-20260923-0005; refactor verify re-taken on the restated tree | PASS |
| 29 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of the five rows, attempt 2 | #tdd-0469 … #tdd-0564 | one response per row in that row's attempt-2 pack | PASS |
| 30 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of the five rows, attempt 2 | #tdd-0469 … #tdd-0564 | one response per row in that row's attempt-2 pack | PASS |
| 31 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0564, its Test file and the full suite | #tdd-0564 | Checkpoint verification fields | PASS |

### Rows for the run started 2026-09-23T11:30:58.834Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 32 | acceptance-test-engineer | acceptance-test-engineer | Annotate the tests of `TC-0012-0484`, `TC-0012-0485` and `TC-0012-0488` | CR-20260923-0001 `## Proposed change`, 06_Test-Cases.md | the three test files in #work-performed-what-changed-where | PASS |
| 33 | acceptance-test-engineer | acceptance-test-engineer | Write the `TC-0012-0484` case where iterate itself falls back to the default Playwright runner | CR-20260923-0001 approved actions step 3, 06_Test-Cases.md `TC-0012-0484` | `prototypingIterate.cliCapture.test.ts` block (11); #tdd-0514 | PASS |
| 34 | acceptance-test-engineer | acceptance-test-engineer | Make the `TC-0012-0485` default-runner case assert the bind and the teardown | CR-20260923-0001 approved actions step 3, 06_Test-Cases.md `TC-0012-0485` | `prototypingIterate.cliAutoServe.test.ts` block (3); #tdd-0515 | PASS |
| 35 | acceptance-test-engineer | acceptance-test-engineer | Write the `US-0012-0143` E2E block and hand over `TDD-0567` on the falsifiability branch | US-0012-0143, AC-0012-0083, BR-0012-0067, EX-0012-0189, `prototypingIterate.ts` | `spec0012PrototypingRemediationE2E.test.ts`; #tdd-0567 | PASS |
| 36 | acceptance-test-engineer | acceptance-test-engineer | Group the tests of `TDD-0514`, `TDD-0515` and `TDD-0497` by boundary, with a mutation for each | the three test files, `selector-granularity.md` | #tdd-0514, #tdd-0515, #tdd-0497; each row needs a split | PASS |
| 37 | acceptance-test-engineer | acceptance-test-engineer | Re-verify `spec-0012/TDD-0561` under the edited Test file | #tdd-0561, `shared-test-artifacts.md` | #tdd-0515 Shared-artifact re-verify | PASS |
| 38 | acceptance-test-engineer | acceptance-test-engineer | Add `TC-0012-0484`, `TC-0012-0485`, `TC-0012-0488` and `US-0012-0143` to the Coverage Depth Matrix | 06_Test-Cases.md, 02_User-stories.md | #coverage-depth-matrix | PASS |
| 39 | - | n/a | grilling(-@2026-09-23T11:30:58.834Z/none): none | - | - | PASS |

### Rows for the run started 2026-09-23T21:09:31.563Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 40 | acceptance-test-engineer | acceptance-test-engineer | Separate `Test 6` into a parse test and a default-cycle test | CR-20260923-0014 `## Proposed change` step 5 | `prototypingIterate.checkConvergence.test.ts`; #tdd-0574, #tdd-0575 | PASS |
| 41 | acceptance-test-engineer | acceptance-test-engineer | Settle the annotations of the tests no row selects | CR-20260923-0014 step 5, 06_Test-Cases.md `TC-0012-0484`, `TC-0012-0485` | `prototypingIterate.cliCapture.test.ts`, `prototypingIterate.cliAutoServe.test.ts`; #decisions-made-with-rationale | PASS |
| 42 | acceptance-test-engineer | acceptance-test-engineer | Hand over the twelve rows on the falsifiability branch, with a mutation per boundary tried and reverted | CR-20260923-0014, the three test files, `selector-granularity.md` | #tdd-0514, #tdd-0515, #tdd-0497, #tdd-0568 to #tdd-0576 | PASS |
| 43 | acceptance-test-engineer | acceptance-test-engineer | Re-verify `spec-0012/TDD-0561` under the edited Test file | #tdd-0561, `shared-test-artifacts.md` | #tdd-0515 Shared-artifact re-verify | PASS |
| 44 | acceptance-test-engineer | acceptance-test-engineer | Name the split rows in the Coverage Depth Matrix | CR-20260923-0014 `## Resolution` | #coverage-depth-matrix | PASS |
| 45 | - | n/a | grilling(-@2026-09-23T21:09:31.563Z/none): none | - | - | PASS |

### Rows for the /qfai-implement run started 2026-09-23T22:29:18.879Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 46 | backend-engineer | backend-engineer | grilling(S1@2026-09-23T22:29:18.879Z/agents): keep the ledger `Selector` of `TDD-0514` and `TDD-0515` and correct the entry's identity copy to it | CR-20260923-0014 `## Proposed change` step 1; #tdd-0514, #tdd-0515; `qfai-implement/SKILL.md` per-item evidence contract | the `Selector` line of both entries; the ledger cell resolves, so the carve-out does not allow rewriting it, and the entry copies its identity from the ledger. The work order asked for the handover's `describe` name in the ledger | PASS |
| 47 | backend-engineer | backend-engineer | grilling(S1@2026-09-23T22:29:18.879Z/agents): prove a multi-entry row on one mutated tree that fails every entry, and record each handover mutation alone as extra evidence | #tdd-0514, #tdd-0515, #tdd-0575; `qfai-implement/SKILL.md` Red 3c; `selector-granularity.md` | Round 1 of the three rows; step 3c runs each entry against one tree with one `Falsifiability revision`, and the primary mutation alone leaves an entry passing. The work order asked for the primary mutation as the proof | PASS |
| 48 | backend-engineer | backend-engineer | grilling(S2@2026-09-23T22:29:18.879Z/agents): on `TDD-0514` and `TDD-0515`, set the flag to `false` in the flag's case instead of deleting the line | #tdd-0514; `tmp` run output of the discarded proof | Round 1 of both rows; with the initializer mutation in place a deleted case is masked, so the flag-present test passed. The discarded run is recorded in #tdd-0514 | PASS |
| 49 | backend-engineer | backend-engineer | grilling(S3@2026-09-23T22:29:18.879Z/agents): stop `TDD-0516` at `todo`: `TC-0012-0486` states five boundaries of `composeCaptureUrl` | 06_Test-Cases.md `TC-0012-0486`; `selector-granularity.md`; the boundary method of CR-20260923-0014 | the row is unchanged; absolute passthrough, route-relative join, fallback with no screen URL, and two rejections naming `--target-url` each sit on their own predicate. A split is `/qfai-sdd` Phase 2b's; no Change Request is raised in this run, per the work order | PASS |
| 50 | backend-engineer | backend-engineer | grilling(S3@2026-09-23T22:29:18.879Z/agents): stop `TDD-0517` at `todo`: `TC-0012-0487` states two boundaries of `defaultCaptureScreen` | 06_Test-Cases.md `TC-0012-0487`; `selector-granularity.md`; the boundary method of CR-20260923-0014 | the row is unchanged; the rejection of a status of 400 or above and the rejection of a missing response are two predicates with two reasons. A split is `/qfai-sdd` Phase 2b's; no Change Request is raised in this run, per the work order | PASS |
| 51 | backend-engineer | backend-engineer | /qfai-implement: TDD-0514 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0514 | Round 1; the row is at `refactor` | PASS |
| 52 | backend-engineer | backend-engineer | /qfai-implement: TDD-0568 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0568 | Round 1; the row is at `refactor` | PASS |
| 53 | backend-engineer | backend-engineer | /qfai-implement: TDD-0569 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0569 | Round 1; the row is at `refactor` | PASS |
| 54 | backend-engineer | backend-engineer | /qfai-implement: TDD-0515 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0515 | Round 1; the row is at `refactor` | PASS |
| 55 | backend-engineer | backend-engineer | /qfai-implement: TDD-0570 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0570 | Round 1; the row is at `refactor` | PASS |
| 56 | backend-engineer | backend-engineer | /qfai-implement: TDD-0571 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0571 | Round 1; the row is at `refactor` | PASS |
| 57 | backend-engineer | backend-engineer | /qfai-implement: TDD-0497 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0497 | Round 1; the row is at `refactor` | PASS |
| 58 | backend-engineer | backend-engineer | /qfai-implement: TDD-0572 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0572 | Round 1; the row is at `refactor` | PASS |
| 59 | backend-engineer | backend-engineer | /qfai-implement: TDD-0573 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0573 | Round 1; the row is at `refactor` | PASS |
| 60 | backend-engineer | backend-engineer | /qfai-implement: TDD-0574 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0574 | Round 1; the row is at `refactor` | PASS |
| 61 | backend-engineer | backend-engineer | /qfai-implement: TDD-0575 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0575 | Round 1; the row is at `refactor` | PASS |
| 62 | backend-engineer | backend-engineer | /qfai-implement: TDD-0576 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0576 | Round 1; the row is at `refactor` | PASS |
| 63 | backend-engineer | backend-engineer | /qfai-implement: TDD-0567 Phase Red 3c falsifiability run, restored GREEN and refactor verify | #tdd-0567 | Round 1; the row is at `refactor` | PASS |
| 64 | acceptance-test-engineer | acceptance-test-engineer | /qfai-implement: TDD-0514 review-fix, no new production behaviour: the `--profile sdd` case for `QFAI-TDDLIST-022`, two unit cases, and refactor verify | #tdd-0514; the attempt-1 `REVISE` of `implementation-reviewer` | the path taken on `Round 1: reviewer verdict (attempt 1)`, a refreshed `Refactor verify`; commit `c505a4bc1`; the row is at `refactor` | PASS |
| 65 | acceptance-test-engineer | acceptance-test-engineer | /qfai-implement: TDD-0575 review-fix Round 2: Test 6b through the CLI entry point, falsifiability run on `main.ts:398`, restored GREEN and refactor verify | #tdd-0575; the attempt-1 `REVISE` of `implementation-reviewer` | Round 2; commit `c505a4bc1`; the row is at `refactor` | PASS |
| 66 | acceptance-test-engineer | acceptance-test-engineer | /qfai-implement: shared-artifact re-verify of the five `done` rows on `prototypingIterate.checkConvergence.test.ts` | #tdd-0575; the entries of `TDD-0497`, `TDD-0572`, `TDD-0573`, `TDD-0574`, `TDD-0576` | `#### Shared-artifact re-verify` under #tdd-0575, one record per row; each fails under its recorded mutation and passes restored | PASS |

## Execution logs

- focused suites:
  - `pnpm -C packages/qfai test:e2e && pnpm -C packages/qfai test:integration`
  - result: PASS
- validate:
  - `npx qfai validate --fail-on error --format github`
  - result: FAIL globally, but `QFAI-ATDD-111/112` resolved; remaining errors are `QFAI-SKILLS-001`, `QFAI-REVIEW-003/005/007`, `QFAI-PROT-150/171`
- repo gates:
  - `pnpm check-types` -> PASS
  - `node scripts/verify-pack.mjs` -> PASS
  - changed-files `prettier -c` -> PASS
  - `pnpm lint` -> FAIL (pre-existing)
  - `pnpm -C packages/qfai test` -> FAIL (pre-existing timeout)
  - `pnpm format:check` -> FAIL (pre-existing repo-wide formatting issues)
- format self-check:
  - evidence updated to README-aligned heading structure and table schema

### Checks for the run started 2026-09-23T06:51:05.149Z

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
  Test Files 2 passed (2); Tests 21 passed (21)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
eslint and prettier --check on both test files         -> exit 0
```

`tsconfig.tests.json` does not list either test file. Both were also checked
through a scratch config that extends it and includes only them, with exit 0.

After the `TDD-0469` stub change, both files passed again (Tests 21 passed (21)),
and eslint and prettier exited 0. A scratch config holding both test files and
a type-level copy of the `TDD-0469` and `TDD-0563` mutations reported one error only:
the copy that deletes the `serverTeardown` assignment, which is why `TDD-0563`
names `serverTeardown = null;` instead. The scratch config is deleted.

Each of the five row selectors, run on its own after the row split:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "<Selector>"
  TDD-0469 does not invoke the server runner when --auto-serve is absent               Tests 1 passed | 3 skipped (4)
  TDD-0562 calls the runner once and invokes the returned teardown at cycle end        Tests 1 passed | 3 skipped (4)
  TDD-0563 accepts runner.ok=true (recovery path) and continues to cycle completion    Tests 1 passed | 3 skipped (4)
  TDD-0564 returns exit 2 with PID + owning command on stderr when runner refuses      Tests 1 passed | 3 skipped (4)
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts -t "<Selector>"
  TDD-0561 TC-0012-0489 (TDD-0561): refuses the held port, binds no other and iterate exits 2 naming it   Tests 1 passed | 16 skipped (17)
```

The `-t` pattern escapes `(`, `)` and `+`, since vitest reads it as a regular expression.

### Checks for the run started 2026-09-23T11:30:58.834Z

```text
pnpm -C packages/qfai exec vitest run <the four changed test files and the two unit files>
  Test Files 6 passed (6); Tests 77 passed (77)
eslint and prettier --check on the changed test files   -> exit 0
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json    -> exit 0
node packages/qfai/dist/cli/index.mjs validate --profile tdd --format text   -> 945 errors (946 before)
node packages/qfai/dist/cli/index.mjs validate --profile full --format text  -> 964 errors (965 before)
pnpm -C packages/qfai exec vitest run tests/assets
  Test Files 1 failed | 185 passed (186): openRowAlreadyTested.test.ts
```

`tsconfig.tests.json` lists none of the changed test files. A scratch config
that extends it and includes only them reported four errors in
`spec0012PrototypingRemediationE2E.test.ts`, none on a line this run added: the
`dm()` fixture at lines 69, 80 and 81, and `.sort()` on a readonly array at line
643, which was line 569 before. The other files reported none. The scratch
config is deleted.

`validate` no longer reports `QFAI-ATDD-111` for `US-0012-0143` or
`QFAI-ATDD-112` for `TC-0012-0484`, `-0485` and `-0488`. It reports one new
error, `QFAI-TDDLIST-008` on `TDD-0561`: its recorded `RED test hash` no longer
matches the edited Test file. The re-verify record under `#tdd-0515` is read
only from a completed, reviewed entry, so the finding stands until the row that
inherits that record reaches `done`.

`openRowAlreadyTested.test.ts` fails on three rows it does not list:
`TDD-0497`, `TDD-0514` and `TDD-0515`. Each is `todo` while a test carries its
case, and the list may only shrink. They leave it when `/qfai-implement`
advances them, after the split.

### Checks for the run started 2026-09-23T21:09:31.563Z

The test edits are commit `ae69c92c848153aaee2119919df293a82f1f0905`. Every
mutation was applied to that tree, run, type-checked and reverted, and
`git diff --quiet -- packages/qfai/src` held after each revert.

```text
pnpm -C packages/qfai exec vitest run <the three edited test files>
  Test Files 3 passed (3); Tests 44 passed (44)
eslint and prettier --check on the three edited test files   -> exit 0
prettier --check .qfai/evidence/atdd-spec-0012.md             -> exit 0
node scripts/pin-stage-evidence-counts.mjs                    -> already current; nothing to write (e2e callsites 2443)
pnpm -C packages/qfai build                                   -> exit 0
node packages/qfai/dist/cli/index.mjs validate --profile tdd --format text
  counts: info=6 warning=330 error=942
git checkout -- .qfai/report
node scripts/check-dogfood-backlog.mjs --profile tdd
  tdd reports 942 error(s) across 14 file(s), all within the pinned backlog
pnpm -C packages/qfai exec vitest run tests/assets
  Test Files 1 failed | 185 passed (186): openRowAlreadyTested.test.ts
```

The files each mutation was run against, from `packages/qfai`:

- `tests/cli/args.test.ts`, `tests/cli/usageExitCodes.test.ts`,
  `tests/cli/commands/prototypingIterate.test.ts`
- `tests/integration/skills/qfaiPrototyping.iterateFlagSurface.test.ts`
- `tests/e2e/spec0012PrototypingRemediationE2E.test.ts`
- every `tests/integration/cli/commands/prototypingIterate.*.test.ts` that runs
  iterate: `aggregateMirror`, `autoServe`, `autoServe.sigint`, `capture`,
  `capture.budget`, `capture.htmlSource`, `checkConvergence`, `cliAutoServe`,
  `cliCapture`, `cycle0BackupOrdering`, `cycle0Force`, `iterContextHint`,
  `lap009`, `licensePatch`, `stopReason`, `validateConformant`
- `tests/unit/cli/commands/prototypingIterate.cycleOutOfRange.test.ts` and its
  `peekMode` sibling, `tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts`
- `tests/assets/convergenceStopCondition.test.ts`,
  `tests/assets/stopReasonSpecAlignment.test.ts`

That is 479 tests, all passing unmutated. The `TDD-0568` mutations also ran
against 34 more files whose code reads UI contracts — the certify, doctor,
design-audit, UI-evidence and primary-task suites — for 1376 tests in all.

`validate` reports one error naming a row this run touched: `QFAI-TDDLIST-008`
on `TDD-0561`, whose recorded `RED test hash` no longer matches its Test file.
The re-verify record under `#tdd-0515` carries the current hash, and it is read
only from a completed, reviewed entry. It also reports the three
`TDDLIST_STALE_STATUS` warnings `CR-20260923-0014` expects, on `TDD-0514`,
`TDD-0515` and `TDD-0497`. spec-0012's ledger holds 394 errors, its pinned
count.

`openRowAlreadyTested.test.ts` now fails on twelve rows it does not list: the
twelve rows this run hands over, each `todo` while a test carries its case. The
guard reads the case, not the test, so the annotations this run removed do not
move it. The rows leave it as `/qfai-implement` advances them.

## Gaps / Open risks

- `QFAI-TDDLIST-008` on `TDD-0561` clears when `TDD-0515`'s entry, which holds the re-verify, is a completed, reviewed item.
- `openRowAlreadyTested.test.ts` fails on the twelve rows handed over here, until `/qfai-implement` advances them.
- `TDD-0571` fails under its mutation on the test's own timeout error, not on an assertion. `CR-20260923-0014` accepts that error as the statement of the 2000 ms bound.
- `TDD-0514` and `TDD-0515` carry a JSON array of their two test titles as `Selector` in the ledger, where their entries name the `describe` that holds exactly those tests. `/qfai-implement` Phase Red step 3b writes the entry's value.
- `composeCaptureUrl`'s route-relative tests pass when the join is string concatenation, `targetUrl + screenUrl`: only the unparseable-pair test fails under that mutation. `TDD-0516` is `/qfai-implement`'s row.
- `QFAI-TDDLIST-008` on `TDD-0497`, `TDD-0572`, `TDD-0573`, `TDD-0574` and `TDD-0576` clears when `TDD-0575`'s entry, which holds their re-verify records, is a completed, reviewed item. Until then `scripts/dogfood-backlog.json` pins spec-0012's ledger at 398 in the `tdd` and `full` profiles, up from 394. Once the five clear, it is re-pinned at 393.

- repo-global gate は未解消の既存 failures が残るため、今回は scope-local completion として扱う。
- `completion-reviewer` は内容面を PASS としたが、4ファイルがまだ未コミットである点を merge 前の手続き上の注意として指摘した。
- `TC-0012-0276` の ordering assertion は string index ベースで、実装の大幅な整形変更には比較的弱い。
- source-inspection 型 ATDD はこの repo の既存パターンに整合するが、runtime behavior を直接実行するテストではないため rationale を残す。

## Final status (PASS/FAIL) + who confirmed

- `qa-gatekeeper`: PASS (scope-local)
- `completion-reviewer`: PASS (content complete; merge 前に 4 files を commit することを推奨)
- Final ATDD judgment: PASS (scope-local)
- DR-IDs referenced: none
- Rejected option reintroduced: none
- Confirmation:
  - required E2E `US-*` coverage: complete
  - required Integration `TC-*` coverage: complete
  - required API `CON-API-*` coverage: not applicable
  - no forbidden references introduced
