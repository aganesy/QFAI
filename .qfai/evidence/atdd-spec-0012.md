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
- The case `teardown executes within 2s when SIGINT is dispatched mid-run` reads the teardown call count while the cycle is still running, after the SIGINT.
  Without it, the cycle-end teardown satisfied the case even when the SIGINT ran nothing, so the case could not own the boundary `sigint-invokes-teardown-within-bound`.
- The `TDD-0471` test records the SIGINT listener count inside its runner stub and asserts it equals the baseline.
  The clause says the handler is installed after the runner returns, and without this a handler installed before the runner call left every test green.
- The `TDD-0566` test asserts one SIGINT dispatch and one teardown end before it checks the 2-second bound, so the bound check can no longer be skipped.
- The `TDD-0577` test runs the same cycle twice, with a teardown that resolves and with one that rejects, and compares the exit codes.
  The case asks for the exit code a resolving teardown gives, so the test measures it rather than assuming it.

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
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts`
  - Each of the three tests carries `QFAI:SPEC-0012:TC-0012-0462`.
  - `teardown executes within 2s when SIGINT is dispatched mid-run` records the teardown call count after the SIGINT, inside the capture callback, and asserts it is 1. The existing assertions, including the 2 s bound, are unchanged.
  - `installs a SIGINT handler after the runner returns and removes it after cycle completion`: the runner stub records `process.listenerCount("SIGINT")` when it is called, and the test asserts it equals `sigintListenersBefore`. Every existing assertion is unchanged.
  - `teardown executes within 2s when SIGINT is dispatched mid-run`: the bound check is unconditional. The test asserts `sigintDispatchedAt` and `teardownEndedAt` each hold one value, then that the elapsed time is under 2 000 ms.
- `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts`
  - New file. One case: a rejected `--auto-serve` teardown is reported on stdout and leaves the exit code alone (`TC-0012-0490`, `TDD-0577`).
- `packages/qfai/tsconfig.tests.json`
  - Enumerates the new test file.

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

### /qfai-atdd — run started 2026-09-23T08:46:59.499Z

Preflight: confidence high

No session opened. `CR-20260923-0008` fixes the three rows, their boundaries
and the test each one names, and nothing surfaced during the run that the spec
or the change request leaves open.


### /qfai-implement — run started 2026-09-23T08:45:00.000Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T08:46:00Z | 97262ad85841c5f5a22bb206a9a9e8b2af9b4542 | 2026-09-23T08:46:05Z | a restated SIGINT case whose row's Selector names three clauses | empty | none in flight | 1 | 0 | 0 |

### /qfai-atdd — run started 2026-09-24T01:49:59.342Z

Preflight: confidence high

No session opened. `CR-20260924-0001` fixes the row, its case, its boundary
and the example value the case uses. The work order put the test in a new file
rather than in the file the case's `Test file` line names; that line is
recorded under Gaps / Open risks.

### /qfai-implement — run started 2026-09-24T02:32:49.865Z

Preflight: confidence high

No session opened. `CR-20260924-0001` fixes the row, its case and its
boundary, the `/qfai-atdd` handover names the predicate and the mutation, and
`CR-20260924-0002` points the case at the file that holds its test. The named
line holds the named call at this revision, and nothing surfaced during the run
that the spec, the change requests or the handover leave open.

## Ledger rows advanced

This run takes up the rows `CR-20260923-0002` owes, as `CR-20260923-0004`
split them: one row per boundary. Every row passed on its first run here, so
every row takes branch 2. The mutations are production code, and
`/qfai-implement` Phase Red step 3c applies them.

The run started 2026-09-23T08:46:59.499Z adds the three rows `CR-20260923-0008` splits
`TC-0012-0462` into, on the same branch.

The run started 2026-09-24T01:49:59.342Z adds `TDD-0577`, which `CR-20260924-0001`
seeds on `TC-0012-0490`, on the same branch.

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0469` | `TC-0012-0442` | Integration | falsifiability | [TDD-0469](#tdd-0469) |
| `TDD-0561` | `TC-0012-0489` | Integration | falsifiability | [TDD-0561](#tdd-0561) |
| `TDD-0562` | `TC-0012-0442` | Integration | falsifiability | [TDD-0562](#tdd-0562) |
| `TDD-0563` | `TC-0012-0442` | Integration | falsifiability | [TDD-0563](#tdd-0563) |
| `TDD-0564` | `TC-0012-0442` | Integration | falsifiability | [TDD-0564](#tdd-0564) |
| `TDD-0471` | `TC-0012-0462` | Integration | falsifiability | [TDD-0471](#tdd-0471) |
| `TDD-0565` | `TC-0012-0462` | Integration | falsifiability | [TDD-0565](#tdd-0565) |
| `TDD-0566` | `TC-0012-0462` | Integration | falsifiability | [TDD-0566](#tdd-0566) |
| `TDD-0577` | `TC-0012-0490` | Integration | falsifiability | [TDD-0577](#tdd-0577) |

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

### TDD-0471

- TDD-ID: TDD-0471
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Selector: installs a SIGINT handler after the runner returns and removes it after cycle completion
- TC-ref: TC-0012-0462
- Branch: falsifiability — the change request restated the test case and changed no test and no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1329, `runPrototypingIterate` — `process.on("SIGINT", sigintHandler);`, installing the handler once the runner has returned
- Mutation: delete line 1329
- Why it fails: no handler is added, so the listener count read during capture equals the baseline.
  `expect(listenersDuringCapture).toBe(sigintListenersBefore + 1)` fails as an assertion
- Other rows: `TDD-0565` still passes, because the cycle-end teardown and the `process.off` of a handler never added both still run.
  `TDD-0566` also fails, at `:241:41`: with no handler installed, the SIGINT cannot run the teardown before the cycle ends. A SIGINT reaches the teardown only through the installed handler, so the two rows cannot be broken apart

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, `process.on("SIGINT", sigintHandler)` — the handler installed for the cycle
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "installs a SIGINT handler after the runner returns and removes it after cycle completion"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 2 skipped (3). The row's case fails on `AssertionError: expected +0 to be 1 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts:141:36`

The edit:

```diff
-    process.on("SIGINT", sigintHandler);
+
```

- Round 1: Falsifiability revision: working-tree+69f901bf8a421496ece4dd66d57e4218c7ecec33c71110b2650578ee8a48d567
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 4284535510d521c425a887a5435544b348f0b44f2bf6af65552f287a44fb4b82
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
```

- Round 1: RED test replacement: test-only replacement — completion-reviewer REVISE, Round 1 attempt 1 (the test's runner stub records the SIGINT listener count when it is called, and the test asserts it equals the baseline, so the handler has to be installed after the runner returns); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+dc7ed30d03057e00f34bacc9de31e5f8107a657fafe45e572a6fd565fe99a1dc
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "installs a SIGINT handler after the runner returns and removes it after cycle completion"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 2 skipped (3). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected +0 to be 1 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts:147:36`

- Round 1: Revision: 2ccde8e44d32798e3dafbd2218c39761963fcff9
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "installs a SIGINT handler after the runner returns and removes it after cycle completion"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 2 skipped (3)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 3 passed (3). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 REVISE, RED phase gate: the entry said TDD-0566's case passes under this mutation, and it fails; qa-gatekeeper#2 PASS, RED phase gate after that line was corrected, reviewed revision working-tree+69f901bf8a421496ece4dd66d57e4218c7ecec33c71110b2650578ee8a48d567; qa-gatekeeper#3 PASS, build-phase GREEN + oracle proof, reviewed revision d4062ae2f6dd8a2c6d2a5ee2fdd3e5c5b6d54afd; qa-gatekeeper#4 PASS, replacement-proof + build-phase GREEN + oracle proof, reviewed revision c648c4a4c1b2c06fde70b1908a604a0f37a1492b (tree-equal to 2ccde8e44 outside the evidence and ledger); the gate ran after the revert, and it confirmed each proof tree by rebuilding it from 2ccde8e44 plus the one-line mutation and matching the recorded content address

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the TDD-0471 test misses the handler's order, and the NFR-0106 bound was never stated; CR-20260923-0009 states the bound and the test goes back to /qfai-atdd
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923090010000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 13532b4dfb9ad9276612e9c2d7a75d49a1e84239aaa835ed9309e2b2f4c0bf53

- Round 1: reviewer verdict (attempt 2): REVISE — completion-reviewer: Refactor verify revision names 2ccde8e44, not the reviewed revision; the verify is re-run and its revision refreshed on the current tree; implementation-reviewer PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923090020000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 5e76b9ad08f8757a159d46b876c75de6e27b757f7f6ee21b4b4454dbd9e1a297

- Round 1: reviewer verdict (attempt 3): PASS
- Round 1: Review pack (attempt 3): .qfai/review/review-20260923090030000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 3): 7e10e3b5ef3d95677b659b4ad5a8cb434a0b6f6b8189b154339c0fc6571479dc
- Spec review: PASS
- Spec reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Spec audited evidence hash: 4719f1ed93206b70691bf078581d53f5b135743f0ea8b1ae05fbfe6f092f10db
- Spec review pack: .qfai/review/review-20260923090030000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 7e10e3b5ef3d95677b659b4ad5a8cb434a0b6f6b8189b154339c0fc6571479dc
- Code quality review: PASS
- Code quality reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Code quality audited evidence hash: 4719f1ed93206b70691bf078581d53f5b135743f0ea8b1ae05fbfe6f092f10db
- Code quality review pack: .qfai/review/review-20260923090030000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 7e10e3b5ef3d95677b659b4ad5a8cb434a0b6f6b8189b154339c0fc6571479dc
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 3 passed (3). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Checkpoint verification seal: 9dfd172bc6323bad1523bc963470fe8fca15d5ab0cf6bb09e9a8e7e70ca875e0

### TDD-0565

- TDD-ID: TDD-0565
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Selector: auto-serve teardown + SIGINT detach happen even when the mirror helper throws
- TC-ref: TC-0012-0462
- Branch: falsifiability — the change request restated the test case and changed no test and no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1367, `runPrototypingIterate` — `} finally {`, which runs the handler removal and the teardown whether or not the capture path throws
- Mutation: `} finally {` to `} catch (cause) { throw cause; } {`
- Why it fails: a throw from the capture path is rethrown before the removal and the teardown run, so iterate still rejects.
  `expect(teardown).toHaveBeenCalledTimes(1)` then sees 0 calls
- Other rows: on a cycle that completes, the block after the `catch` runs as the `finally` did, so `TDD-0471` and `TDD-0566` still pass

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the `finally` that runs the teardown and removes the handler when the cycle fails
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "auto-serve teardown \+ SIGINT detach happen even when the mirror helper throws"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 2 skipped (3). The row's case fails on `AssertionError: expected "spy" to be called 1 times, but got 0 times` at `tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts:193:22`

The edit:

```diff
-  } finally {
+  } catch (cause) { throw cause; } {
```

- Round 1: Falsifiability revision: working-tree+7ea777c3326e31b625df2d4e843ff5befcfe0c0965dfca9caa85cbe320b8e490
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 4284535510d521c425a887a5435544b348f0b44f2bf6af65552f287a44fb4b82
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
```

- Round 1: RED test replacement: test-only replacement — completion-reviewer REVISE, Round 1 attempt 1 (the other two tests of this file changed: the TDD-0471 test gained its order assertion and the TDD-0566 test its unconditional bound check; this row's own test is unchanged); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+71459030efd6be997668c167a428bafb4b6826fac8ecb8ffc81547f3fd9f6948
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "auto-serve teardown \+ SIGINT detach happen even when the mirror helper throws"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 2 skipped (3). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected "spy" to be called 1 times, but got 0 times` at `tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts:199:22`

- Round 1: Revision: 2ccde8e44d32798e3dafbd2218c39761963fcff9
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "auto-serve teardown \+ SIGINT detach happen even when the mirror helper throws"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 2 skipped (3)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 3 passed (3). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+7ea777c3326e31b625df2d4e843ff5befcfe0c0965dfca9caa85cbe320b8e490; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision d4062ae2f6dd8a2c6d2a5ee2fdd3e5c5b6d54afd; qa-gatekeeper#3 PASS, replacement-proof + build-phase GREEN + oracle proof, reviewed revision c648c4a4c1b2c06fde70b1908a604a0f37a1492b (tree-equal to 2ccde8e44 outside the evidence and ledger); the gate ran after the revert, and it confirmed each proof tree by rebuilding it from 2ccde8e44 plus the one-line mutation and matching the recorded content address

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the TDD-0471 test misses the handler's order, and the NFR-0106 bound was never stated; CR-20260923-0009 states the bound and the test goes back to /qfai-atdd
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923090011000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 781798b7b61d4a72551d31e0eb300a2f4e21480c32a737e1560b226aadab6f41

- Round 1: reviewer verdict (attempt 2): REVISE — completion-reviewer: Refactor verify revision names 2ccde8e44, not the reviewed revision; the verify is re-run and its revision refreshed on the current tree; implementation-reviewer PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923090021000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): e2ced9ce169926ef59a050ca4f0b7d95e5f5d20e3589826f4b175daf074e8aae

- Round 1: reviewer verdict (attempt 3): PASS
- Round 1: Review pack (attempt 3): .qfai/review/review-20260923090031000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 3): 73ff474046d927262a77a95dab434049aa474cd970409b07deb2943e368cacd2
- Spec review: PASS
- Spec reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Spec audited evidence hash: 90abff7b8d5fb1fd14f9c6a9bab713ad7adcd0b5ae2e305cd32cfd1127e488ee
- Spec review pack: .qfai/review/review-20260923090031000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 73ff474046d927262a77a95dab434049aa474cd970409b07deb2943e368cacd2
- Code quality review: PASS
- Code quality reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Code quality audited evidence hash: 90abff7b8d5fb1fd14f9c6a9bab713ad7adcd0b5ae2e305cd32cfd1127e488ee
- Code quality review pack: .qfai/review/review-20260923090031000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 73ff474046d927262a77a95dab434049aa474cd970409b07deb2943e368cacd2
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 3 passed (3). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Checkpoint verification seal: 9dfd172bc6323bad1523bc963470fe8fca15d5ab0cf6bb09e9a8e7e70ca875e0

### TDD-0566

- TDD-ID: TDD-0566
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Selector: teardown executes within 2s when SIGINT is dispatched mid-run
- TC-ref: TC-0012-0462
- Branch: falsifiability — the change request restated the test case and changed no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1327, the SIGINT handler in `runPrototypingIterate` — `void teardownOnce();`, the call that makes a SIGINT run the teardown
- Mutation: delete line 1327
- Why it fails: the SIGINT no longer runs the teardown, so the count read in the capture callback after the SIGINT is 0.
  `expect(teardownCallsBeforeCycleEnd).toBe(1)` fails as an assertion. The cycle-end teardown still runs once afterwards
- Other rows: no SIGINT reaches the other two cases, so the handler's body never runs there and both still pass
- Note: deleting `teardownInvoked = true;` at line 1274 also fails this case, on `expect(teardown).toHaveBeenCalledTimes(1)` with 2 calls.
  It breaks the once-guard rather than the SIGINT call, so it is not this row's proof

The case reads the teardown call count inside the capture callback, after the
SIGINT and the 10 ms yield, and asserts it is 1 after iterate returns. The
handler starts the teardown synchronously when the SIGINT is emitted, so the
count does not depend on timing, and a teardown the cycle end runs comes too
late to be counted.

The three mutations were written into a type-level copy of the auto-serve block
in a scratch config with the test file, and `tsc` exited 0 on all three. The
`TDD-0566` copy was re-checked with the line 1327 deletion, also exit 0.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the SIGINT handler's `void teardownOnce();`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "teardown executes within 2s when SIGINT is dispatched mid-run"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 2 skipped (3). The row's case fails on `AssertionError: expected +0 to be 1 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts:241:41`

The edit:

```diff
-      void teardownOnce();
+
```

- Round 1: Falsifiability revision: working-tree+89fda95e1794e7f57f9c47efc86b0b6657ff52a3c0cee006d3bb98c6a69572b6
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 4284535510d521c425a887a5435544b348f0b44f2bf6af65552f287a44fb4b82
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
```

- Round 1: RED test replacement: test-only replacement — completion-reviewer REVISE, Round 1 attempt 1 (the 2-second bound check no longer sits inside a condition: the test asserts one SIGINT dispatch and one teardown end, then the elapsed time); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+1e1f2aa94ad8a0f4cc4f479e5a8af05f3991e2bc5f4e4024bb987440f43f6b82
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "teardown executes within 2s when SIGINT is dispatched mid-run"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 2 skipped (3). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected +0 to be 1 // Object.is equality` at `tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts:247:41`

- Round 1: Revision: 2ccde8e44d32798e3dafbd2218c39761963fcff9
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "teardown executes within 2s when SIGINT is dispatched mid-run"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 2 skipped (3)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 3 passed (3). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+89fda95e1794e7f57f9c47efc86b0b6657ff52a3c0cee006d3bb98c6a69572b6; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision d4062ae2f6dd8a2c6d2a5ee2fdd3e5c5b6d54afd; qa-gatekeeper#3 PASS, replacement-proof + build-phase GREEN + oracle proof, reviewed revision c648c4a4c1b2c06fde70b1908a604a0f37a1492b (tree-equal to 2ccde8e44 outside the evidence and ledger); the gate ran after the revert, and it confirmed each proof tree by rebuilding it from 2ccde8e44 plus the one-line mutation and matching the recorded content address

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the TDD-0471 test misses the handler's order, and the NFR-0106 bound was never stated; CR-20260923-0009 states the bound and the test goes back to /qfai-atdd
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923090012000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 6fbd28486d4cda0e8554553d75906ce84ac75161150a427b9afa67cdaa7d4a88

- Round 1: reviewer verdict (attempt 2): REVISE — completion-reviewer: Refactor verify revision names 2ccde8e44, not the reviewed revision; the verify is re-run and its revision refreshed on the current tree; implementation-reviewer PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923090022000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): d9c71671b874973b03842b0cb944eda503beec21b1e9f6767fe4fcafbba67423

- Round 1: reviewer verdict (attempt 3): PASS
- Round 1: Review pack (attempt 3): .qfai/review/review-20260923090032000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 3): 04680b4ecddd5a1e45fb2656a75d9023d371009512a7b5865081de73ac89a412
- Spec review: PASS
- Spec reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Spec audited evidence hash: 314f5e506ebcc099cf3ab88def76931d28ee1680234cfbbc6daf063660061956
- Spec review pack: .qfai/review/review-20260923090032000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 04680b4ecddd5a1e45fb2656a75d9023d371009512a7b5865081de73ac89a412
- Code quality review: PASS
- Code quality reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Code quality audited evidence hash: 314f5e506ebcc099cf3ab88def76931d28ee1680234cfbbc6daf063660061956
- Code quality review pack: .qfai/review/review-20260923090032000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 04680b4ecddd5a1e45fb2656a75d9023d371009512a7b5865081de73ac89a412
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — the last row of this run, so the full suite ran: Test Files 771 passed | 3 skipped (774); Tests 14553 passed | 82 skipped (14635)
- Checkpoint verification revision: 6c36c7913713371c7493fca59269ce4fadd6fb06
- Checkpoint verification seal: 4a9d4972b938def2b096407c04276b55b18459f85d700187de42cd9a6081eb23

A first full-suite run on this tree was discarded: it failed one test, `tests/assets/evidenceCitedArtifacts.test.ts`, because the review-pack lines this run added to this file lacked the not-a-citation marker. The marker was added, which moves no audited evidence hash, and the run above is the re-run.

### TDD-0577

- TDD-ID: TDD-0577
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts
- Selector: reports a rejected auto-serve teardown on stdout and keeps the exit code of a resolving teardown
- TC-ref: TC-0012-0490
- Branch: falsifiability — `teardownOnce` already catches a rejected teardown and reports it on stdout, and the change request changed no product code, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/prototypingIterate.ts:1278, the `catch` in `teardownOnce` — `` warn(`qfai prototyping iterate --auto-serve: teardown failed (${String(cause)})`); ``, the line that reports a rejected teardown
- Mutation: delete line 1278, leaving the `catch` empty
- Why it fails: the rejection is still caught, so the teardown is still called once and iterate still returns 0, but stdout carries no `teardown failed` line.
  `expect(teardownFailureLines(rejected.stdout)).toEqual([...])` fails as an assertion
- Other rows: every other auto-serve case uses a teardown that resolves, so the `catch` body never runs there. Under the mutation, `prototypingIterate.autoServe.test.ts`, `prototypingIterate.autoServe.sigint.test.ts` and `prototypingIterate.cliAutoServe.test.ts` pass: Test Files 3 passed (3); Tests 24 passed (24)
- Note: changing `warn(` to `error(` on line 1278 also fails this case at the same assertion, because the line then goes to stderr. It moves the report rather than removing it, so it is not this row's proof

The case runs `runPrototypingIterate` twice with `autoServe: true` and an
injected runner, each time on a fresh tree: once with a teardown that resolves,
and once with one that rejects with `Error: port 3000 still bound`, the value
`EX-0012-0190` uses. Stdout is captured through `tests/helpers/stdout.ts`.

| Clause | Observation |
| ------ | ----------- |
| The teardown ran and rejected | `rejected.teardownCalls` is 1 |
| A line on stdout names the `--auto-serve` teardown and the reason | The only stdout line containing `teardown failed` is `qfai prototyping iterate --auto-serve: teardown failed (Error: port 3000 still bound)`, and the resolving run prints none |
| The exit code is the one a resolving teardown gives | `rejected.exit` equals `resolved.exit`, and is 0 |

The selector holds no regular-expression metacharacter. The `-t` pattern below
escapes its `-` as the other entries do.

- First-run command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts -t "reports a rejected auto\-serve teardown on stdout and keeps the exit code of a resolving teardown"
- First-run result: PASS — Test Files 1 passed (1); Tests 1 passed (1)
- Mutation trial command: the same command, with line 1278 of `packages/qfai/src/cli/commands/prototypingIterate.ts` deleted
- Mutation trial result: FAIL — Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts:150:51`
- Restored GREEN command: the same command, after `git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed (1)

The trial shows the mutation discriminates. It is not the row's falsifiability
trio: `/qfai-implement` Phase Red step 3c applies the mutation, records the
`Round 1:` fields and routes `qa-gatekeeper` while it is in the tree.

- RED test hash: 297dba1fdd4ccaf18eb931b2a0d8b6a877da2dcddf0d65c7c56653800e5e248e
- RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts
```

#### Shared-artifact re-verify

None. The test file is new and `tests/helpers/stdout.ts` is read unchanged, so
no recorded `RED test hash` moves.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts, `runPrototypingIterate`, the `catch` in `teardownOnce` — the `warn(...)` at line 1278 that reports a rejected teardown on stdout
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts -t "reports a rejected auto\-serve teardown on stdout and keeps the exit code of a resolving teardown"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts:150:51`

The edit, line 1278 deleted and the `catch` left empty:

```diff
     } catch (cause) {
-      warn(`qfai prototyping iterate --auto-serve: teardown failed (${String(cause)})`);
     }
```

- Round 1: Falsifiability revision: working-tree+1c8af7d6aaa95b24c0583cd1b607f3192a179fd79c73d01a32ba37c0251cb1f2
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 297dba1fdd4ccaf18eb931b2a0d8b6a877da2dcddf0d65c7c56653800e5e248e
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts
```

- Round 1: Revision: 3f1fc99036e3cf19a59c127776299260ac13acff
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts -t "reports a rejected auto\-serve teardown on stdout and keeps the exit code of a resolving teardown"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1). Run after `git checkout -- packages/qfai/src/cli/commands/prototypingIterate.ts`, which restores the file as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Run on the tree the reviews read
- Refactor verify revision: 0413184a06c29c1fae13cbf4ebaaee08440a4448

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
| `TC-0012-0462` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts` | D3 | Runs `runPrototypingIterate` with an injected runner and checks the three SIGINT clauses: the handler is installed for the cycle and removed at its end, teardown and removal survive a failed cycle, and a SIGINT during the cycle tears down once within the bound. One ledger row per clause: `TDD-0471`, `TDD-0565`, `TDD-0566`. |
| `TC-0012-0490` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts` | D3 | Runs `runPrototypingIterate` with an injected runner twice, with a teardown that resolves and with one that rejects, and checks the stdout line naming the `--auto-serve` teardown and the reason, and that the two exit codes match. Ledger row `TDD-0577` |

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

### Rows for the run started 2026-09-23T08:46:59.499Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 32 | acceptance-test-engineer | acceptance-test-engineer | Annotate the three `TC-0012-0462` tests per case | CR-20260923-0008, 06_Test-Cases.md `TC-0012-0462` | `prototypingIterate.autoServe.sigint.test.ts` | PASS |
| 33 | acceptance-test-engineer | acceptance-test-engineer | Hand over `TDD-0471`, `TDD-0565` and `TDD-0566` on the falsifiability branch | the test file, `prototypingIterate.ts` | #tdd-0471, #tdd-0565, #tdd-0566 | PASS |
| 34 | acceptance-test-engineer | acceptance-test-engineer | Add `TC-0012-0462` to the Coverage Depth Matrix | 06_Test-Cases.md | #coverage-depth-matrix | PASS |
| 35 | - | n/a | grilling(-@2026-09-23T08:46:59.499Z/none): none | - | - | PASS |
| 36 | acceptance-test-engineer | acceptance-test-engineer | Make the `TDD-0566` case observe that the SIGINT ran the teardown, and move its proof to the handler call | #tdd-0566 | `prototypingIterate.autoServe.sigint.test.ts`; #tdd-0566 | PASS |
| 37 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd review-fix handback: add the handler-order assertion to the `TDD-0471` test, make the `TDD-0566` bound check unconditional, replace the RED test hash of `TDD-0471`, `TDD-0565` and `TDD-0566`, and mark each proof stale | completion-reviewer REVISE, Round 1 attempt 1; #tdd-0471, #tdd-0565, #tdd-0566 | the test file; Round 1 RED test replacement lines | PASS |

### Rows for the /qfai-implement run started 2026-09-23T08:45:00.000Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | orchestrator | orchestrator | grilling(S1@2026-09-23T08:45:00.000Z/agents): restate TC-0012-0462 and split TDD-0471 into three rows through CR-20260923-0008 | #tdd-0471, `selector-granularity.md` | CR-20260923-0008; narrowing the Selector alone would leave two clauses with no row | PASS |
| 2 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0471 RED phase gate | #tdd-0471 | the Other rows line said TDD-0566 passes under the mutation, and it fails | REVISE |
| 3 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0471 RED phase gate, resubmitted with that line corrected | #tdd-0471 | Round 1 | PASS |
| 4 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0471 build-phase GREEN + oracle proof | #tdd-0471 | Round 1 | PASS |
| 5 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0565 RED phase gate | #tdd-0565 | Round 1 | PASS |
| 6 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0565 build-phase GREEN + oracle proof | #tdd-0565 | Round 1 | PASS |
| 7 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0566 RED phase gate | #tdd-0566 | Round 1 | PASS |
| 8 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0566 build-phase GREEN + oracle proof | #tdd-0566 | Round 1 | PASS |

### Rows for the run started 2026-09-24T01:49:59.342Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 38 | acceptance-test-engineer | acceptance-test-engineer | Write the `TC-0012-0490` test for `TDD-0577` | CR-20260924-0001, 06_Test-Cases.md `TC-0012-0490`, 05_Examples.md `EX-0012-0190` | `prototypingIterate.autoServeTeardownFailure.test.ts`; `tsconfig.tests.json` | PASS |
| 39 | acceptance-test-engineer | acceptance-test-engineer | Hand over `TDD-0577` on the falsifiability branch | the test file, `prototypingIterate.ts` | #tdd-0577 | PASS |
| 40 | acceptance-test-engineer | acceptance-test-engineer | Add `TC-0012-0490` to the Coverage Depth Matrix | 06_Test-Cases.md | #coverage-depth-matrix | PASS |
| 41 | - | n/a | grilling(-@2026-09-24T01:49:59.342Z/none): none | - | - | PASS |

### Rows for the /qfai-implement run started 2026-09-24T02:32:49.865Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 42 | - | n/a | grilling(-@2026-09-24T02:32:49.865Z/none): none | - | - | PASS |
| 43 | backend-engineer | backend-engineer | /qfai-implement: TDD-0577 falsifiability run with line 1278 deleted, then the revert and the restored GREEN | #tdd-0577, `prototypingIterate.ts` | Round 1 | PASS |
| 44 | backend-engineer | backend-engineer | /qfai-implement: TDD-0577 refactor verify on the committed tree | #tdd-0577 | Refactor verify fields | PASS |

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

### Checks for the run started 2026-09-23T08:46:59.499Z

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "<Selector>"
  TDD-0471 installs a SIGINT handler after the runner returns and removes it after cycle completion   Tests 1 passed | 2 skipped (3)
  TDD-0565 auto-serve teardown + SIGINT detach happen even when the mirror helper throws            Tests 1 passed | 2 skipped (3)
  TDD-0566 teardown executes within 2s when SIGINT is dispatched mid-run                              Tests 1 passed | 2 skipped (3)
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
  Test Files 1 passed (1); Tests 3 passed (3)
eslint and prettier --check on the test file   -> exit 0
```

Each `-t` pattern above is the one run, with `-` and `+` escaped. `tsc` ran on a
scratch config that extends `packages/qfai/tsconfig.tests.json` and includes the
test file and the type-level copy of the three mutations, with exit 0. The
scratch config is deleted.

After the `TDD-0566` case gained its assertion:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "<Selector>"
  TDD-0471   Tests 1 passed | 2 skipped (3)
  TDD-0565   Tests 1 passed | 2 skipped (3)
  TDD-0566   Tests 1 passed | 2 skipped (3)
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
  Test Files 1 passed (1); Tests 3 passed (3)
tsc on a scratch config: the test file and the line 1327 mutation copy   -> exit 0
eslint and prettier --check on the test file                             -> exit 0
```

After the review-fix correction of the test file:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts -t "<Selector>"
  TDD-0471   Tests 1 passed | 2 skipped (3)
  TDD-0565   Tests 1 passed | 2 skipped (3)
  TDD-0566   Tests 1 passed | 2 skipped (3)
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.sigint.test.ts
  Test Files 1 passed (1); Tests 3 passed (3)
tsc on a scratch config holding the test file   -> exit 0
eslint and prettier --check on the test file    -> exit 0
RED test hash over the corrected manifest       -> 4284535510d521c425a887a5435544b348f0b44f2bf6af65552f287a44fb4b82
```

The corrected test passes on its first run, so the rows take the no-new-behaviour
path and no round is opened.

### Checks for the run started 2026-09-24T01:49:59.342Z

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts -t "<Selector>"
  TDD-0577   Tests 1 passed (1)
node scripts/pin-stage-evidence-counts.mjs                               -> already current; nothing to write
node packages/qfai/dist/cli/index.mjs validate --profile tdd --format text
  no finding names TC-0012-0490 or TDD-0577, and no QFAI-ATDD-112 is reported
node scripts/check-dogfood-backlog.mjs --profile tdd                     -> 956 errors, all within the pinned backlog
node scripts/check-dogfood-backlog.mjs --profile full                    -> 975 errors, all within the pinned backlog
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json                    -> exit 0
eslint and prettier --check on the test file and tsconfig.tests.json     -> exit 0
```

The build ran before `validate`, and `.qfai/report` was restored after each
run. `tsconfig.tests.json` enumerates the new test file, so the `tsc` run above
checks it directly.

### Checks for the /qfai-implement run started 2026-09-24T02:32:49.865Z

```text
pnpm -C packages/qfai build                                              -> exit 0
node packages/qfai/dist/cli/index.mjs validate --profile tdd --format text
  no finding names TDD-0577 or TC-0012-0490
node scripts/check-dogfood-backlog.mjs --profile tdd                     -> 956 errors, all within the pinned backlog
node scripts/check-dogfood-backlog.mjs --profile full                    -> 975 errors, all within the pinned backlog
node scripts/pin-stage-evidence-counts.mjs                               -> already current; nothing to write
```

`.qfai/report` was restored after each run.

## Gaps / Open risks

- repo-global gate は未解消の既存 failures が残るため、今回は scope-local completion として扱う。
- `completion-reviewer` は内容面を PASS としたが、4ファイルがまだ未コミットである点を merge 前の手続き上の注意として指摘した。
- `TC-0012-0276` の ordering assertion は string index ベースで、実装の大幅な整形変更には比較的弱い。
- source-inspection 型 ATDD はこの repo の既存パターンに整合するが、runtime behavior を直接実行するテストではないため rationale を残す。
- Resolved by `CR-20260924-0002`: `TC-0012-0490` named `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts` in its `Test file` line while its test is in `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts`. The change request points the line at `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts`, which keeps the `RED test hash` of the four `done` rows whose manifest names the other file.

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
