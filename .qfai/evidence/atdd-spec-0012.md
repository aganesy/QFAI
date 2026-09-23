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

## Ledger rows advanced

This run takes up the two rows `CR-20260923-0002` owes. Both passed on their
first run here, so both take branch 2. The mutations are production code and
`/qfai-implement` Phase Red step 3c applies them.

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0469` | `TC-0012-0442` | Integration | falsifiability | [TDD-0469](#tdd-0469) |
| `TDD-0561` | `TC-0012-0489` | Integration | falsifiability | [TDD-0561](#tdd-0561) |

### TDD-0469

- TDD-ID: TDD-0469
- Layer: Integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts
- Selector: ["does not invoke the server runner when --auto-serve is absent","calls the runner once and invokes the returned teardown at cycle end","accepts runner.ok=true (recovery path) and continues to cycle completion","returns exit 2 with PID + owning command on stderr when runner refuses"]
- TC-ref: TC-0012-0442
- Branch: falsifiability — the change request restated the test case and changed no test and no product code, so each Selector entry passed on its first run
- Predicate to break: one per Selector entry, listed below
- Mutation: one per Selector entry, listed below

Each Selector entry runs on its own, so each has its own predicate. All four
are in `runPrototypingIterate`, in
`packages/qfai/src/cli/commands/prototypingIterate.ts`.

1. Selector entry: `does not invoke the server runner when --auto-serve is absent`
   - Predicate to break: line 1281, `if (options.autoServe) {` — the gate that keeps the runner uncalled without `--auto-serve`
   - Mutation: `if (options.autoServe) {` to `if (options.autoServe ?? options.serverRunner) {`
   - Why it fails: the test injects a runner and no `autoServe`, so the mutated gate calls it.
     The stub returns nothing, and reading `serverResult.ok` at line 1317 throws a `TypeError`.
     The case fails before it reaches `expect(runner).not.toHaveBeenCalled()`
2. Selector entry: `calls the runner once and invokes the returned teardown at cycle end`
   - Predicate to break: line 1369, `await teardownOnce();` — the cycle-end teardown in the `finally` block
   - Mutation: delete line 1369
   - Why it fails: nothing else invokes the teardown during the cycle, so `expect(teardown).toHaveBeenCalledTimes(1)` sees 0 calls
3. Selector entry: `accepts runner.ok=true (recovery path) and continues to cycle completion`
   - Predicate to break: line 1317, `if (!serverResult.ok) {` — the check that lets a runner reporting success continue the cycle
   - Mutation: `if (!serverResult.ok) {` to `if (serverResult.ok) {`
   - Why it fails: a runner answering `ok: true` now takes the refusal branch and iterate returns 2, so `expect(exit).toBe(0)` fails.
     vitest strips types, so the `reason` read in that branch does not stop the run
4. Selector entry: `returns exit 2 with PID + owning command on stderr when runner refuses`
   - Predicate to break: line 1318, ``error(`qfai prototyping iterate --auto-serve: ${serverResult.reason}`);`` — the line that puts the runner's reason on stderr
   - Mutation: that line to `error("qfai prototyping iterate --auto-serve: refused");`
   - Why it fails: the exit code stays 2, and `expect(joined).toMatch(/foreign process/)` fails because stderr no longer carries the reason

First run of each entry, on its own:

```text
pnpm -C packages/qfai exec vitest run tests/integration/cli/commands/prototypingIterate.autoServe.test.ts -t "<entry>"
  each of the four: Tests 1 passed | 3 skipped (4)
```

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
| `TC-0012-0442` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts` | D3 | Runs `runPrototypingIterate` with an injected runner and checks the four clauses of the runner contract: no call without `--auto-serve`, one call and one teardown with it, a recovered owner completing the cycle, and a refusal exiting 2 with the runner's reason on stderr |
| `TC-0012-0489` | Integration | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts` | D3 | Runs `runPrototypingIterate` with the default runner against a port a real listener holds, and checks the exit code, the port in the stderr reason, that the listener still accepts connections, and that no other port was bound |

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

## Gaps / Open risks

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
