# ATDD Evidence: spec-0003

## Objective

Bind the three shipped-workflow test cases `TC-0003-0056`, `-0057` and `-0058` to
integration tests under `tests/integration/**`, and hand their seven ledger rows
to `/qfai-implement` on the falsifiability path. `CR-20260923-0003` restated the
cases and seeded `TDD-0092` for the fourth verify bullet of `TC-0003-0058`; this
run is its approved action 2.

## Inputs reviewed (files/paths)

- `.qfai/decisions/CR-20260923-0003-spec-0003-states-the-document-lane-as-it-was-before-change-scoping.md`
- `.qfai/specs/spec-0003/06_Test-Cases.md` (`TC-0003-0056` to `-0058`), `04_Business-Rules.md` (`BR-0003-0047`, `-0048`), `05_Examples.md` (`EX-0003-0050`, `-0051`)
- `.qfai/specs/spec-0003/tdd/test-list.md`
- `.qfai/contracts/cli/shipped-workflows.md` §5
- `packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml`, `qfai-validate.yml`
- `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`, `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`
- `.qfai/assistant/catalog/test-layers.md`

## Decisions made (with rationale)

- **The four cases of `TC-0003-0056` and `-0057` move into one integration module**,
  `packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts`. Both
  cases declare `Level: integration`, whose annotation `QFAI-ATDD-112` requires under
  `tests/integration/**` and `QFAI-ATDD-122` refuses under `tests/e2e/**`.
- **Each file keeps its own set-up.** The delivered tree, the job reader and the step
  runner are local to the integration module and to the end-to-end file. A shared
  helper would have two consumers, and the repository extracts one on its third.
- **All seven rows take branch 2, falsifiability.** Each test and the behaviour it
  checks shipped in the same change, so no natural RED can be observed.
- **`TDD-0063` and `TDD-0092` name the checker as their predicate.** Each test plants
  its own copy of the aggregate, so no change to a shipped file can fail it. The code
  the case exercises is the check in `aggregateFailureViolations`, and that is where
  the discriminating mutation sits.
- **`TDD-0001`'s test is the row's own integration case, rewritten.** The two tests
  `CR-20260923-0011` names assert the clause, but neither sits in
  `tests/integration/**`, where `TC-0003-0001`'s `Level` routes it. The reasoning is
  in the `TDD-0001` entry.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

- **The work-log removal cases, `TC-0003-0059` … `-0061`, are in two files,**
  as S1 D3 set out: `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts`
  (`TDD-0094` … `TDD-0097`) and
  `packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts`
  (`TDD-0098`, `TDD-0099`), both added to `packages/qfai/tsconfig.tests.json`.
  Every `it` of a file was written before the first RED of that file, because
  the file's RED test hash covers all of them.
- **Every row stops at `refactor`, by user decision.** Stage gate P1c takes each
  branch-1 row through its checkpoint before the next row's test is written.
  This run departs from that: the change is green only at its head, so each
  row stops at `refactor` after its RED, its GREEN, its reviews and its local
  per-row checkpoint. All rows' full-suite checkpoints close together on the
  final head's CI, and all rows go `done` after that run passes. Authority: the
  user's answer to a structured question (AskUserQuestion), relayed by the
  orchestrator. The same decision is recorded in `atdd-spec-0004.md`.
- **REDs before their shared GREENs.** One GREEN satisfies several rows: the
  seed removal (`TDD-0094`, `TDD-0096`, `TDD-0097`), the instructions line
  (`TDD-0095`), and the asset withdrawal (`TDD-0098`, `TDD-0099` and spec-0004
  `TDD-0068`). Each RED is taken before the GREEN that satisfies it.
- **The `BR-0003-0009` negative goes to a Change Request (S1 D13, user).** The
  refusal to write outside the project is a safety-floor `⚠️` cell this change
  did not create. The user chose to add its test through a Change Request, and
  spec-0003's ATDD is reported not PASS on that cell until it lands. The
  Change Request is `CR-20260924-0005`, open.
- **Row numbers.** After the merge of main, this change's spec-0003 rows are
  `TDD-0094` … `TDD-0099`. S1's decisions name them by their earlier numbers
  (`TDD-0092` … `TDD-0097`): D7's `TDD-0095` is now `TDD-0097`, and D10's
  `TDD-0097` is now `TDD-0099`.

**Rows sharing a GREEN take their REDs first (user, S2).** A refinement of S1 D2 (one row
at a time), adjudicated by the user through a structured question (AskUserQuestion) after
S1 had ended, so it is recorded as session S2 of this run rather than under S1.

- Decision: rows that one GREEN satisfies take their REDs before that GREEN. GREENs and
  reviews stay per row.
- Reason: after a shared GREEN, a later row would pass on its first run and have no RED
  left to observe. The sibling-satisfied branch would need the sibling `done`, which the
  stop-at-`refactor` decision rules out until the final head.
## Grilling Session

### /qfai-atdd — run started 2026-09-23T03:14:36.552Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T03:16:00Z | d842484798a82f6de425bf892e17e7b36d2e196e | 2026-09-23T03:17:30Z | where the four integration-level cases live, and where their set-up comes from | empty | none in flight | 1 | 0 | 0 |

### /qfai-implement — run started 2026-09-23T03:29:00.000Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T03:53:00Z | working-tree+0c16e336d92d65224ec37609bd8d897cbb70d42c505d6c0d0adf6c102605203f | 2026-09-23T03:53:07Z | a falsifiability predicate that lives in the row's own Test file, which step 3c assumes is production code | empty | none in flight | 1 | 0 | 0 |
| S2 | adopted | 2026-09-23T04:08:10Z | 6368454b0f56a50611aa309f82eb80e8cc35b758 | 2026-09-23T04:08:20Z | how to answer the code quality REVISE on the two-consumer workflow-tree helper | empty | none in flight | 1 | 0 | 0 |

### /qfai-atdd — run started 2026-09-23T08:28:13.966Z

Preflight: confidence high

No session opened. `CR-20260923-0007` fixes the row, the verify bullet it covers,
the test file and the two job shapes, and nothing surfaced during the run that the
spec or the change request leaves open.


### /qfai-implement — run started 2026-09-23T08:31:57.000Z

Preflight: confidence high

No session was opened: `CR-20260923-0007` settles every decision this row needs.

### /qfai-atdd — run started 2026-09-23T11:24:46.722Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T11:27:41Z | working-tree+b6717d99336497714758bb9eafe114d2ddc4f4c194e332da052432f02b99161f | 2026-09-23T11:28:00Z | neither test the change request names for TDD-0001 sits in the directory TC-0003-0001's Level routes to | empty | none in flight | 1 | 0 | 0 |

### /qfai-implement — run started 2026-09-23T11:42:45.972Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T11:44:45Z | 0d2064bd1dd3e976ae8e39ea31b9c04f6e180209 | 2026-09-23T11:44:51Z | TDD-0037 is done under a replaced test, and the one exit from done, the upstream reset, is refused for a row the approving CR's actions do not name | empty | none in flight | 1 | 0 | 0 |

### /qfai-atdd — run started 2026-09-23T19:33:24.738Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T20:13:17.289Z | working-tree+ecbebad44db0972da88c2858d175f303772e80ba665e4a380c68ea3e59caf750 | 2026-09-24T00:16:53.938Z | preflight | empty | none in flight | 15 | 0 | 4 |
| S2 | adopted | 2026-09-24T00:43:09.001Z | working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 | 2026-09-24T00:43:37.959Z | whether rows one GREEN satisfies take their REDs before that GREEN | empty | none in flight | 1 | 0 | 1 |

S1 is the preflight session of the one `/qfai-atdd` run that covers spec-0003,
spec-0004, spec-0011 and spec-0013; `.qfai/evidence/atdd-spec-0004.md` carries
the same row. `Work resumed` here is this run's first spec-0003 test write.

Escalated S1: D1 — `EX-0004-0044` gives a passing `Blocked-By` the kept check rejects. User: fix the example and BR via a Change Request. Done as `CR-20260923-0011` (applied; spec-0004 DR-0004-0043, DL-0029). TDD-0069..0071 fixtures use `spec-0004:TDD-0001 — blocked at todo`.

Escalated S1: D2 — batch every RED first vs the P1c per-row loop. User: one row at a time (the P1c loop).

Escalated S1: D13 — the BR-0003-0009 negative (refusal to write outside the project) is a safety-floor ⚠️ that this change did not create. User: raise a Change Request to add that test; spec-0003's ATDD is reported not PASS on that cell until it lands.

Escalated S1: N1 — `/qfai-implement` checkpoints need the related suites and full-suite runs, beyond "only the new tests". User: run checkpoints locally too (this task only). Superseded by the user's later answer (AskUserQuestion, 2026-09-23): the full package suite runs on CI through a pushed draft PR at the boundaries, and the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check.

Escalated S2: D2-refinement — several rows are satisfied by one shared GREEN, so a later row would pass on its first run after that GREEN, and the sibling-satisfied branch needs the sibling `done`, which the stop-at-`refactor` decision rules out. User: take the REDs of rows sharing a GREEN before that GREEN; GREENs and reviews per row.

### /qfai-implement — run started 2026-09-24T05:57:51.031Z

Preflight: session opened

### /qfai-implement — run started 2026-09-24T08:22:12.576Z

Preflight: confidence high. The removal decisions, row order, Oracle mutations and
checkpoint set were adopted in the spec-0004 implementation run's S3 work orders.
This invocation implements only spec-0003 TDD-0094..0099 against those decisions.
The start time is recovered from the Codex host session JSONL
`C:\Users\pc\.codex\sessions\2026\09\24\rollout-2026-09-24T17-13-01-01a0d279-8384-7d01-9f7a-748e0a8fd80c.jsonl`,
ordinal 216 (`clock__curr_time` call at `2026-09-24T08:22:12.576Z`) immediately
before ordinal 218's second-precision response.

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-24T09:59:55.341Z | working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb | 2026-09-24T10:00:28.295Z | on-detection: recover the original run key from the host clock event | empty | none in flight | 1 | 0 | 0 |

S1 opened after the run started, when the second-precision heading failed the
completion record check. The griller's final message is recorded at ordinal 3098
(`2026-09-24T09:59:55.341Z`) in the parent Codex host session JSONL
`C:\Users\pc\.codex\sessions\2026\09\24\rollout-2026-09-24T15-26-56-01a0d218-8066-7e52-a3a5-63c8f72ae407.jsonl`.
The first resumed edit is ordinal 2032 (`FileChange` at
`2026-09-24T10:00:28.295Z`) in the child session JSONL named above. The
working-tree address excludes evidence and ledgers; captures before and after
this decision agree on the `Revision` shown for S1.

## Work performed (what changed, where)

- New `packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts`: the
  document-check and validation-profile cases, titles unchanged, annotated
  `QFAI:SPEC-0003:TC-0003-0056` / `-0057`. It carries its own `project`, `jobsOf`
  and `runStep`.
- `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`: the two moved
  blocks removed; the eight `US-*` describes and their set-up stay.
- `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`: the three
  `TC-0003-0058` cases annotated `QFAI:SPEC-0003:TC-0003-0058`.
- `packages/qfai/tsconfig.tests.json`: the new file listed.
- `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`: a new
  `TDD-0093` `it.each` in the `TC-0003-0058` describe, annotated
  `QFAI:SPEC-0003:TC-0003-0058`, with one case per job shape of verify bullet 5.
  `CR-20260923-0007` asked for it.
- `packages/qfai/tests/integration/shippedWorkflowInertness.test.ts`: the `TDD-0037`
  describe and its count case renamed to the counts the case asserts. No assertion
  changed. `CR-20260923-0011` asked for it.
- `packages/qfai/tests/integration/initSpec0003.test.ts`: the `TC-0003-0001` case
  now runs init into an empty directory and asserts all three verify bullets, for the
  `TDD-0001` row that `CR-20260923-0011` reset.

## Commands executed + key outputs

```text
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts tests/integration/shippedWorkflowPortability.test.ts
  Test Files 3 passed (3); Tests 66 passed (66)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
```

For `TDD-0093`:

```text
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
  Test Files 1 passed (1); Tests 23 passed (23)
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0093\): rejects an aggregate job whose shape cannot preserve failure"
  Test Files 1 passed (1); Tests 2 passed | 21 skipped (23)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
```

The re-verify runs of `TDD-0062`, `TDD-0063` and `TDD-0092` are in the `TDD-0093`
entry.

For `TDD-0001` and `TDD-0037`:

```text
pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts tests/integration/shippedWorkflowInertness.test.ts
  Test Files 2 passed (2); Tests 30 passed (30)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
npx eslint packages/qfai/tests/integration/initSpec0003.test.ts packages/qfai/tests/integration/shippedWorkflowInertness.test.ts --max-warnings 0   -> exit 0
```

The selector, mutation and re-verify runs are in each row's entry.

## Test volume estimate

| Layer | Files touched | Cases |
| ----- | ------------- | ----- |
| integration | 2 | 22 moved, 21 kept |
| e2e | 1 | 23 kept |

### /qfai-atdd run 2026-09-23T19:33:24.738Z

| Layer       | Raw count | Signal | Evidence                                                   | Notes                                                                                      |
| ----------- | --------: | -----: | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| E2E         |        27 |     37 | the `US-0003-*` stories of `02_User-stories.md`; no `L5` TC | Surface opt-in is off project-wide, so every non-planned `US-*` is required                 |
| API         |         0 |      0 | no `CON-API-*` referenced; no `L4` TC                      | `CLI-INIT` is a CLI contract                                                               |
| Integration |        46 |     63 | integration-routed `TC-0003-*`; no `CON-DB-*`              | From the test-design-analyst's P0 for this run                                             |

`total` = 73. Signals are shares of that total in whole percent, planning
signals only.

## Coverage obligations checklist

- `TC-0003-0056`, `-0057`, `-0058`: annotated under `tests/integration/**`.
- The other obligations of this pack are scored in the Coverage Depth Matrix; this
  run took up only the rows `CR-20260923-0003` names.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

| Kind        | Required                  | Home                                 | This run                                                                         |
| ----------- | ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `US-*`      | 27                        | `tests/e2e/**`                       | Unchanged by this change; not scored in this run (S1 D13)                        |
| `TC-*`      | 46 integration-routed     | `packages/qfai/tests/integration/**` | `TC-0003-0059` … `-0061` written (`TDD-0094` … `TDD-0099`), not yet run          |
| `CON-API-*` | none                      | `tests/api/**`                       | none owed                                                                        |
| `CON-DB-*`  | none                      | `tests/integration/**`               | none owed                                                                        |

## Ledger rows advanced

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0058` | `TC-0003-0056` | Integration | falsifiability | [TDD-0058](#tdd-0058) |
| `TDD-0059` | `TC-0003-0056` | Integration | falsifiability | [TDD-0059](#tdd-0059) |
| `TDD-0060` | `TC-0003-0057` | Integration | falsifiability | [TDD-0060](#tdd-0060) |
| `TDD-0061` | `TC-0003-0057` | Integration | falsifiability | [TDD-0061](#tdd-0061) |
| `TDD-0062` | `TC-0003-0058` | Integration | falsifiability | [TDD-0062](#tdd-0062) |
| `TDD-0063` | `TC-0003-0058` | Integration | falsifiability | [TDD-0063](#tdd-0063) |
| `TDD-0092` | `TC-0003-0058` | Integration | falsifiability | [TDD-0092](#tdd-0092) |
| `TDD-0093` | `TC-0003-0058` | Integration | falsifiability | [TDD-0093](#tdd-0093) |
| `TDD-0001` | `TC-0003-0001` | Integration | falsifiability | [TDD-0001](#tdd-0001) |
| `TDD-0037` | `TC-0003-0037` | Integration | falsifiability, test-only replacement | [TDD-0037](#tdd-0037) |
| `TDD-0094` | `TC-0003-0059` | Integration | observed-red | [TDD-0094](#tdd-0094) |
| `TDD-0095` | `TC-0003-0059` | Integration | observed-red | [TDD-0095](#tdd-0095) |
| `TDD-0096` | `TC-0003-0060` | Integration | observed-red | [TDD-0096](#tdd-0096) |
| `TDD-0097` | `TC-0003-0060` | Integration | observed-red | [TDD-0097](#tdd-0097) |
| `TDD-0098` | `TC-0003-0061` | Integration | observed-red | [TDD-0098](#tdd-0098) |
| `TDD-0099` | `TC-0003-0061` | Integration | observed-red | [TDD-0099](#tdd-0099) |

Rows `TDD-0094` … `TDD-0099` are withdrawn by `CR-20260925-0010`. Their ledger rows are deleted
and tombstoned, and their test files are deleted. Their sections below stay as history.

### TDD-0058

- TDD-ID: TDD-0058
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0056 (TDD-0058): delivers both isolated native matrix units without changing checker commands
- TC-ref: TC-0003-0056
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `checks`, `strategy.matrix.check` — the two legs, `shape` and `mermaid`
- Mutation: `check: [shape, mermaid]` to `check: [shape]`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `checks`, `strategy.matrix.check` — the two legs, `shape` and `mermaid`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0058\): delivers both isolated native matrix units without changing checker commands"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected { check: [ 'shape' ] } to deeply equal { check: [ 'shape', 'mermaid' ] }` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:61:32`

The edit:

```diff
-        check: [shape, mermaid]
+        check: [shape]
```

- Round 1: Falsifiability revision: working-tree+efa8887570e027f30f5f9b4c8802a2062106058348473127b1fb6548b8ba9936
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+721a10e5695f96894c2e3a026853fa5a6205e58a1a0ac77457c0ecb43c2e6360
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0058\): delivers both isolated native matrix units without changing checker commands"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected { check: [ 'shape' ] } to deeply equal { check: [ 'shape', 'mermaid' ] }` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:153:32`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0058\): delivers both isolated native matrix units without changing checker commands"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 REVISE on the RED test manifest; qa-gatekeeper#2 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+efa8887570e027f30f5f9b4c8802a2062106058348473127b1fb6548b8ba9936; qa-gatekeeper#3 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#4 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+721a10e5695f96894c2e3a026853fa5a6205e58a1a0ac77457c0ecb43c2e6360; qa-gatekeeper#5 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040010000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 4e419f3230190025e5530165e471b2447b924bfb4229143409c4bfd097a80cd4

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040020000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 6d9c437b985d0172bf1e0cf2f01c938082a3a3a2e78e00d6bd96245b98a6300d
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 7b459d797e8970baf40a741690a5b552ce7f12ab43b56dcaa03ad44337c27242
- Spec review pack: .qfai/review/review-20260923040020000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 6d9c437b985d0172bf1e0cf2f01c938082a3a3a2e78e00d6bd96245b98a6300d
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 7b459d797e8970baf40a741690a5b552ce7f12ab43b56dcaa03ad44337c27242
- Code quality review pack: .qfai/review/review-20260923040020000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 6d9c437b985d0172bf1e0cf2f01c938082a3a3a2e78e00d6bd96245b98a6300d
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 22 passed (22). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification seal: 8c6285bb550ec6ae6f68478e4251c2d8299e7095e05e9105f32af65ec3b7ad58

### TDD-0059

- TDD-ID: TDD-0059
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0056 (TDD-0059): keeps the existing external check name and always runs its matrix aggregate
- TC-ref: TC-0003-0056
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, `name:` — the external check name adopter branch protection requires
- Mutation: the aggregate's `name:` from `qfai docs (document shape and Mermaid syntax)` to `qfai docs (document checks)`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, `name:` — the external check name adopter branch protection requires
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0059\): keeps the existing external check name and always runs its matrix aggregate"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected 'qfai docs (document checks)' to be 'qfai docs (document shape and Mermaid…' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:93:28`

The edit:

```diff
-    name: qfai docs (document shape and Mermaid syntax)
+    name: qfai docs (document checks)
```

- Round 1: Falsifiability revision: working-tree+ab9fcde10a43a277e36c3a59c1053e7fb21f536f84cd507c2c039a05c77defe0
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+79c0b5c6fc87897aa937ccd08e91c00cd80d73eff973b9ca40351c494c408121
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0059\): keeps the existing external check name and always runs its matrix aggregate"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected 'qfai docs (document checks)' to be 'qfai docs (document shape and Mermaid…' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:185:28`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0059\): keeps the existing external check name and always runs its matrix aggregate"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+ab9fcde10a43a277e36c3a59c1053e7fb21f536f84cd507c2c039a05c77defe0; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#3 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+79c0b5c6fc87897aa937ccd08e91c00cd80d73eff973b9ca40351c494c408121; qa-gatekeeper#4 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040011000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 880d532627ed9f06beeaf2e23c7a05e7e97ef02fd4703f66af8aaa67a964a008

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040021000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): e5c44d55d827f8515dd0fe46fde1d10d19b935679f12735183803c59036795e9
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 9e4cbc33730db648468efc1b9b1a686ea23d8cd714dd34e0f35c0873254abcba
- Spec review pack: .qfai/review/review-20260923040021000 <!-- qfai:not-a-citation -->
- Spec review pack seal: e5c44d55d827f8515dd0fe46fde1d10d19b935679f12735183803c59036795e9
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 9e4cbc33730db648468efc1b9b1a686ea23d8cd714dd34e0f35c0873254abcba
- Code quality review pack: .qfai/review/review-20260923040021000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: e5c44d55d827f8515dd0fe46fde1d10d19b935679f12735183803c59036795e9
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 22 passed (22). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification seal: 8c6285bb550ec6ae6f68478e4251c2d8299e7095e05e9105f32af65ec3b7ad58

### TDD-0060

- TDD-ID: TDD-0060
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0057 (TDD-0060): delivers full validation and PR-only drift in isolated native matrix jobs
- TC-ref: TC-0003-0057
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `validate`, the drift step's `if:` — the condition that keeps the drift profile to pull requests
- Mutation: the drift step's `if:` loses `&& github.event_name == 'pull_request'`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `validate`, the drift step's `if:` — the condition that keeps the drift profile to pull requests
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0060\): delivers full validation and PR-only drift in isolated native matrix jobs"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:178:7`. The diff names the drift step: expected `"if": "matrix.profile == 'drift' && github.event_name == 'pull_request'"`, received `"if": "matrix.profile == 'drift'"`

The edit:

```diff
-        if: matrix.profile == 'drift' && github.event_name == 'pull_request'
+        if: matrix.profile == 'drift'
```

- Round 1: Falsifiability revision: working-tree+5ef2ee5e7f466e7441fd057c4476edd43c59af8045fad6f4f1c5a1c2b816d9ba
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+785fc9312811ff6bc22d4c6b8ebeaaaede497ebb7f84e2c9c5b4d09330a35db9
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0060\): delivers full validation and PR-only drift in isolated native matrix jobs"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:270:7`. The diff names the drift step: expected `"if": "matrix.profile == 'drift' && github.event_name == 'pull_request'"`, received `"if": "matrix.profile == 'drift'"`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0060\): delivers full validation and PR-only drift in isolated native matrix jobs"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+5ef2ee5e7f466e7441fd057c4476edd43c59af8045fad6f4f1c5a1c2b816d9ba; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#3 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+785fc9312811ff6bc22d4c6b8ebeaaaede497ebb7f84e2c9c5b4d09330a35db9; qa-gatekeeper#4 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040012000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): af46183d545ce2dda79f5838aec1b8be857fd8c82c22c5b516185d4efd2ed18e

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040022000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): c699849b03dd124c497a12812cbde937f85469cc022e7f07022803e4c66ba524
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 56b7180977289d12ec58fbe88c90ca1125a29b6759333b852cf30920f1ba205b
- Spec review pack: .qfai/review/review-20260923040022000 <!-- qfai:not-a-citation -->
- Spec review pack seal: c699849b03dd124c497a12812cbde937f85469cc022e7f07022803e4c66ba524
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 56b7180977289d12ec58fbe88c90ca1125a29b6759333b852cf30920f1ba205b
- Code quality review pack: .qfai/review/review-20260923040022000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c699849b03dd124c497a12812cbde937f85469cc022e7f07022803e4c66ba524
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 22 passed (22). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification seal: 8c6285bb550ec6ae6f68478e4251c2d8299e7095e05e9105f32af65ec3b7ad58

### TDD-0061

- TDD-ID: TDD-0061
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0057 (TDD-0061): keeps the existing external validation check as an always-run complete verdict
- TC-ref: TC-0003-0057
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `summary`, `name:` — the external check name adopter branch protection requires
- Mutation: the aggregate's `name:` from `qfai validate (full profile, fail on error)` to `qfai validate (verdict)`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `summary`, `name:` — the external check name adopter branch protection requires
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0061\): keeps the existing external validation check as an always-run complete verdict"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected 'qfai validate (verdict)' to be 'qfai validate (full profile, fail on …' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:194:31`

The edit:

```diff
-    name: qfai validate (full profile, fail on error)
+    name: qfai validate (verdict)
```

- Round 1: Falsifiability revision: working-tree+ff2ac28815bfa059ac8825a2e1bde65db692dc2a4def0a2961a00422c7467883
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+e0271491bba06aec582d11a8c8b0505964e639ac665cac4fa134773ab7850d81
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0061\): keeps the existing external validation check as an always-run complete verdict"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected 'qfai validate (verdict)' to be 'qfai validate (full profile, fail on …' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:286:31`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0061\): keeps the existing external validation check as an always-run complete verdict"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+ff2ac28815bfa059ac8825a2e1bde65db692dc2a4def0a2961a00422c7467883; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#3 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+e0271491bba06aec582d11a8c8b0505964e639ac665cac4fa134773ab7850d81; qa-gatekeeper#4 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040013000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 35b864259d8d9dc1b00d4fd076235f9aaea86bb3eb5b040079b1ff35a0cc1de9

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040023000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 2bd549a351ad86e4057ad38bbaab854667e3f3d2fb01d3e060b47a15e2525cc9
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 70cace0f4025a8951086705f8c866324bc6eca0c7acab4e6a06dcfd2d284f5ae
- Spec review pack: .qfai/review/review-20260923040023000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 2bd549a351ad86e4057ad38bbaab854667e3f3d2fb01d3e060b47a15e2525cc9
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 70cace0f4025a8951086705f8c866324bc6eca0c7acab4e6a06dcfd2d284f5ae
- Code quality review pack: .qfai/review/review-20260923040023000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 2bd549a351ad86e4057ad38bbaab854667e3f3d2fb01d3e060b47a15e2525cc9
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts --reporter=verbose && pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — step 1, the Test file: Test Files 1 passed (1); Tests 22 passed (22), naming TC-0003-0057 (TDD-0061) as passed. Step 2, the full suite: Test Files 771 passed | 3 skipped (774); Tests 14542 passed | 82 skipped (14624), exit 0. The worker count and per-test timeout are raised because two slow suites time out at the default under a full parallel run on this host
- Checkpoint verification revision: b8b38f2bf640432111527922e83bad3939ab8a56
- Checkpoint verification seal: 0c57eca84fd2f8cb4124cf8a84eebf7dfc92c67bad9b87e2930f3009e94b194f

### TDD-0062

- TDD-ID: TDD-0062
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: TC-0003-0058 (TDD-0062): rejects a planted green aggregate while accepting its unmodified body
- TC-ref: TC-0003-0058
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, the aggregate body's `exit 1` on a non-success result
- Mutation: the aggregate body's `exit 1` to `exit 0`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, the aggregate body's `exit 1` on a non-success result
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 20 skipped (21). The row's case fails on `AssertionError: expected [ …(6) ] to deeply equal []` at `tests/integration/shippedWorkflowPortability.test.ts:269:63`, the case's first assertion, on the unmodified shipped body. The six violations it received are `job "docs" reports exit 0 for checks: <result>` for `failure`, `cancelled`, `timed_out`, `skipped`, `unknown` and `missing`

The edit:

```diff
-            exit 1
+            exit 0
```

- Round 1: Falsifiability revision: working-tree+962fce2d7e7531c1d33451fd345b9aab5f295b89a4267dbe544537fd50a123c1
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fbbe35780e4e91d9f530ef48f21033ba17c7326fa1f8825b102050585ee57f01
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 20 skipped (21)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 21 passed (21). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+962fce2d7e7531c1d33451fd345b9aab5f295b89a4267dbe544537fd50a123c1; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758

- Spec review: PASS
- Spec reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Spec audited evidence hash: 65d44c966a5222ea8bb342c6e4294e8e62dfa10122da08cc9ead1e5065bd1d02
- Spec review pack: .qfai/review/review-20260923040014000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 555a3ebaa92d2fdaa8a039ab5b903215871962c185f3e2ee8500cd01ee73fb57
- Code quality review: PASS
- Code quality reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Code quality audited evidence hash: 65d44c966a5222ea8bb342c6e4294e8e62dfa10122da08cc9ead1e5065bd1d02
- Code quality review pack: .qfai/review/review-20260923040014000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 555a3ebaa92d2fdaa8a039ab5b903215871962c185f3e2ee8500cd01ee73fb57
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 21 passed (21). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification seal: ecd5b72e49e725620486d0370fe1c18deab941ccc61d2159b62402b80904256f

### TDD-0063

- TDD-ID: TDD-0063
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: TC-0003-0058 (TDD-0063): rejects a result binding removed from the shipped aggregate
- TC-ref: TC-0003-0058
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-binding guard — the check this case exercises; the test plants its own copy of the aggregate, so no shipped file can make it fail
- Mutation: the guard's `if (!Object.values(bindings).includes(value))` to `if (false)`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-binding guard — the check this case exercises; the test plants its own copy of the aggregate, so no shipped file can make it fail
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 20 skipped (21). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:285:63`: the checker returned no violation for the aggregate the case stripped of its result binding, where the case expects `qfai-docs.yml: job "docs" does not consume the result of install-bearing need checks`

The edit:

```diff
-    if (!Object.values(bindings).includes(value)) {
+    if (false) {
```

- Round 1: Falsifiability revision: working-tree+0c16e336d92d65224ec37609bd8d897cbb70d42c505d6c0d0adf6c102605203f
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fbbe35780e4e91d9f530ef48f21033ba17c7326fa1f8825b102050585ee57f01
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 20 skipped (21)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 21 passed (21). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+0c16e336d92d65224ec37609bd8d897cbb70d42c505d6c0d0adf6c102605203f; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758

- Spec review: PASS
- Spec reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Spec audited evidence hash: 610d8cdec182fd50b2b4ea12c5202555527cd9ae4ac94f01a0b3595811412ba3
- Spec review pack: .qfai/review/review-20260923040015000 <!-- qfai:not-a-citation -->
- Spec review pack seal: b5e1c3e3a56e7acce9edfd8da0d2bb17d279575fa2da72907378e68b5dd675df
- Code quality review: PASS
- Code quality reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Code quality audited evidence hash: 610d8cdec182fd50b2b4ea12c5202555527cd9ae4ac94f01a0b3595811412ba3
- Code quality review pack: .qfai/review/review-20260923040015000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: b5e1c3e3a56e7acce9edfd8da0d2bb17d279575fa2da72907378e68b5dd675df
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 21 passed (21). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification seal: ecd5b72e49e725620486d0370fe1c18deab941ccc61d2159b62402b80904256f

### TDD-0092

- TDD-ID: TDD-0092
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: rejects an aggregate step that cannot preserve failure
- TC-ref: TC-0003-0058
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-only aggregate check — the check this case exercises; the test plants each unpreservable step itself, so no shipped file can make it fail
- Mutation: the check's `return [`…is not a result-only aggregate`]` to `return []`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-only aggregate check — the check this case exercises; the test plants each unpreservable step itself, so no shipped file can make it fail
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 7 failed | 14 skipped (21). Each of the seven parameterised cases of the row's `it.each` fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:304:63`: the checker returned no violation where each case expects `qfai-docs.yml: job "docs" survives a failed install but is not a result-only aggregate`. The seven are `{"if":"false"}`, `{"shell":"bash {0} || true"}`, `{"continue-on-error":true}`, `{"uses":"actions/checkout"}`, `{"run":"pnpm install"}`, `{"run":"npx qfai validate"}` and `{"run":false}`

The edit:

```diff
-    return [`${site} survives a failed install but is not a result-only aggregate`];
+    return [];
```

- Round 1: Falsifiability revision: working-tree+8694c6364628eb060cd00b073907fd026a6a8556fd0d034aaef784236ad15995
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fbbe35780e4e91d9f530ef48f21033ba17c7326fa1f8825b102050585ee57f01
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 7 passed | 14 skipped (21)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 21 passed (21). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+8694c6364628eb060cd00b073907fd026a6a8556fd0d034aaef784236ad15995; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758

- Spec review: PASS
- Spec reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Spec audited evidence hash: 78c9f15fd9bad641b4b53d43cdbbfb4347410ca2161994d01dfabefeca04407b
- Spec review pack: .qfai/review/review-20260923040016000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 700390442fcc729d37fd1eb6ccd3680b14ff5483567bb60423040db4a58fa596
- Code quality review: PASS
- Code quality reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Code quality audited evidence hash: 78c9f15fd9bad641b4b53d43cdbbfb4347410ca2161994d01dfabefeca04407b
- Code quality review pack: .qfai/review/review-20260923040016000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 700390442fcc729d37fd1eb6ccd3680b14ff5483567bb60423040db4a58fa596
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 21 passed (21). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification seal: ecd5b72e49e725620486d0370fe1c18deab941ccc61d2159b62402b80904256f

### TDD-0093

- TDD-ID: TDD-0093
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: TC-0003-0058 (TDD-0093): rejects an aggregate job whose shape cannot preserve failure
- TC-ref: TC-0003-0058
- Branch: falsifiability — the check this case exercises already rejects both job shapes, so the test passes on its first run and no natural RED can be observed
- Predicate to break: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the job-shape clauses of the result-only aggregate check — `job.steps.length !== 1` and `job.job["continue-on-error"] !== undefined`; the test plants each unpreservable job shape itself, so no shipped file can make it fail
- Mutation: delete the clause `job.job["continue-on-error"] !== undefined ||` (line 221)

That mutation fails the `continue-on-error set on the job` case. The second
mutation, deleting `job.steps.length !== 1 ||` (line 214), fails the
`a second step that does work of its own` case. Each leaves the other case
passing, because the other clause still rejects it.

The selector contains `(` and `)`. Escape both when passing it to vitest `-t`.

#### Shared-artifact re-verify

The new case is in the Test file of the three rows below, so it moves their
`RED test hash`. Each row's selector was re-run against the edited file at the
revision given, and each passed. The mutation proofs are handed to
`/qfai-implement` as a mutation-only request.

##### spec-0003/TDD-0062

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 97e6fd6f69f77bd4f04144d9d85d8630b3730717
- Selector: TC-0003-0058 (TDD-0062): rejects a planted green aggregate while accepting its unmodified body
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body", with `packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml:611` changed from `exit 1` to `exit 0`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 22 skipped (23). The row's case fails on `AssertionError: expected [ …(6) ] to deeply equal []` at `tests/integration/shippedWorkflowPortability.test.ts:269:63`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body", after `git checkout -- packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2

##### spec-0003/TDD-0063

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 97e6fd6f69f77bd4f04144d9d85d8630b3730717
- Selector: TC-0003-0058 (TDD-0063): rejects a result binding removed from the shipped aggregate
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate", with `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:230` changed from `if (!Object.values(bindings).includes(value)) {` to `if (false) {`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 22 skipped (23). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:285:63`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate", after `git checkout -- packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2

##### spec-0003/TDD-0092

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 97e6fd6f69f77bd4f04144d9d85d8630b3730717
- Selector: rejects an aggregate step that cannot preserve failure
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 7 passed | 16 skipped (23)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure", with `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:225` changed from `return [`${site} survives a failed install but is not a result-only aggregate`];` to `return [];`
- Proof result: FAIL — Test Files 1 failed (1); Tests 7 failed | 16 skipped (23). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:304:63`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure", after `git checkout -- packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 7 passed | 16 skipped (23)
- RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2

#### Round 1

An earlier run of this gate, superseded:

- Command: the same command, with only line 221 (`job.job["continue-on-error"] !== undefined ||`) replaced by an empty line
- Result: Test Files 1 failed (1); Tests 1 failed | 1 passed | 21 skipped (23). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:328:65`; the second-step case passed
- Verdict: qa-gatekeeper#1 REVISE — the second-step case had no run showing it fails, so the proof now removes both job-shape clauses in one edit

- Round 1: Satisfied-by: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the job-shape clauses of the result-only aggregate check — `job.steps.length !== 1` and `job.job["continue-on-error"] !== undefined`; the test plants each job shape itself, so no shipped file can make it fail
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0093\): rejects an aggregate job whose shape cannot preserve failure"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 2 failed | 21 skipped (23). Both cases fail on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:328:65`: `a second step that does work of its own` and `continue-on-error set on the job`

The edit:

```diff
-    job.steps.length !== 1 ||
+
-    job.job["continue-on-error"] !== undefined ||
+
```

- Round 1: Falsifiability revision: working-tree+7ec5e5259f299517c369d9c15d0142af4d1bc0a620e4b360b50300fefdbd6cd1
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0093\): rejects an aggregate job whose shape cannot preserve failure"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed | 21 skipped (23)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 23 passed (23). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 REVISE, RED phase gate: the second-step case had no run showing it fails; qa-gatekeeper#2 PASS, RED phase gate on the two-clause mutation run and the three shared-artifact re-verify subsections, reviewed revision working-tree+7ec5e5259f299517c369d9c15d0142af4d1bc0a620e4b360b50300fefdbd6cd1; qa-gatekeeper#3 PASS, build-phase GREEN + oracle proof, reviewed revision e4da9886fe30f7ae41827a6f5ac26c9a443ac851

- Spec review: PASS
- Spec reviewed revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Spec audited evidence hash: b3b911c58f50d7ba0c2fb6432904658d7048d4a476b523619c81bf7908643db5
- Spec review pack: .qfai/review/review-20260923080017000 <!-- qfai:not-a-citation -->
- Spec review pack seal: b20406bd395435082a5599f8ba88d4cd081e865df5f2bdd7d3b6020cb96c240e
- Code quality review: PASS
- Code quality reviewed revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Code quality audited evidence hash: b3b911c58f50d7ba0c2fb6432904658d7048d4a476b523619c81bf7908643db5
- Code quality review pack: .qfai/review/review-20260923080017000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: b20406bd395435082a5599f8ba88d4cd081e865df5f2bdd7d3b6020cb96c240e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts --reporter=verbose && pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — step 1, the Test file: Test Files 1 passed (1); Tests 23 passed (23), naming both TDD-0093 cases as passed. Step 2, the full suite: Test Files 771 passed | 3 skipped (774); Tests 14555 passed | 82 skipped (14637), exit 0. The worker count and per-test timeout are raised because two slow suites time out at the default under a full parallel run on this host
- Checkpoint verification revision: b20dbe4bc5c90581a030cdda8656107b85415a2c
- Checkpoint verification seal: de5d644d1a9f3d0f6fdaf6d29e977a36a542e4d23303e0df85ae3006efd73032

### TDD-0001

- TDD-ID: TDD-0001
- Layer: integration
- Test file: packages/qfai/tests/integration/initSpec0003.test.ts
- Selector: TC-0003-0001: Empty directory initialization
- TC-ref: TC-0003-0001
- Branch: falsifiability — init already writes no artifact directory, so the case passes on its first run and no natural RED can be observed
- Predicate to break: packages/qfai/src/cli/commands/init.ts:509, `copyTemplateTree(qfaiAssets, destQfai, …)` — it writes under `.qfai/` what `packages/qfai/assets/init/.qfai/` ships, and that tree holds `assistant/` and `waivers.yml` and no artifact directory
- Mutation: add an empty file `packages/qfai/assets/init/.qfai/specs/.gitkeep`
- Why it fails: init copies the new `specs/` directory into `.qfai/`, and the bullet 1 assertion at line 75 finds `specs` among the six artifact directories
- Other rows: the same mutation fails `tests/e2e/initE2E.test.ts` "creates .qfai/ with assistant assets and no artifact scaffold", the test `TDD-0069` (`US-0003-0001`, `todo`) is expected to take, and `tests/cli/init.test.ts` "does not create artifact scaffold outside assistant assets", which no ledger row names. Both were run under the mutation and failed on an assertion. `TDD-0002` to `TDD-0015` share the Test file and are `exception`; `TDD-0025` shares it and is `done` (see the re-verify below)

The case replaces the backfill test that only read `init.ts` for the string
`runInit`. It runs `runInit` into an empty temporary directory and asserts all
three verify bullets of `TC-0003-0001`. No other ledger row cites the case.

| Verify bullet | Assertion | Line |
| ------------- | --------- | ---- |
| 1 | `.qfai/assistant/` is a directory, and none of `specs`, `contracts`, `discussion`, `evidence`, `review` and `report` exists under `.qfai/` | 70, 75 |
| 2 | `qfai.config.yaml` is a file | 78 |
| 3 | every `qfai-*` skill directory under `.qfai/assistant/skills/` is a symlink in each of `.claude/skills`, `.agents/skills`, `.codex/skills` and `.github/skills`, and its target ends in `.qfai/assistant/skills/<skill>`; a guard first requires at least one such skill | 87, 98 |

Bullet 3 is checked the way `tests/cli/init.test.ts` "creates template additions
with symlinks" checks one skill: `lstat` reports a symbolic link and `readlink`
names the canonical directory. That file's two helpers are local to it, so the
check is written inline. It requires a real symlink on every platform, as that
test does: init has no fallback for a link it cannot create, and on Windows
without Developer Mode it stops with an error instead.

The describe title is unchanged, so the ledger's `Test file` and `Selector`
already name the case. The mutation below breaks bullet 1, the obligation the
change request moved, and it stays the row's predicate.

The two tests the change request names assert the same clause and cannot be this
row's test. `TC-0003-0001` declares `Level: integration`, so its home is
`tests/integration/**`. `initE2E.test.ts` is under `tests/e2e/**`, where
`QFAI-ATDD-122` refuses a `TC-0003-0001` annotation and the row's `integration`
Layer would not match the path. `tests/cli/init.test.ts` is in no layer directory,
and it asserts only that no file is written under the six directories. The Layer
is right for the Test file. The file's header already carries
`// QFAI:SPEC-0003:TC-0003-0001` (line 11), so no annotation was added.

- First-run command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0001: Empty directory initialization"
- First-run result: PASS — Test Files 1 passed (1); Tests 1 passed | 23 skipped (24)
- Mutation trial command: the same command, with the empty file `packages/qfai/assets/init/.qfai/specs/.gitkeep` added
- Mutation trial result: FAIL — Test Files 1 failed (1); Tests 1 failed | 23 skipped (24). The row's case fails on `AssertionError: init wrote an artifact directory under .qfai/: expected [ 'specs' ] to deeply equal []` at `tests/integration/initSpec0003.test.ts:75:72`
- Mutation trial revision: working-tree+9ba92159e7f398085ba887d31a27152e3353cb5b9f171bea46d6793ab3716d2f
- Restored GREEN command: the same command, after `rm -rf packages/qfai/assets/init/.qfai/specs`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 23 skipped (24)
- Test file command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts
- Test file result: PASS — Test Files 1 passed (1); Tests 24 passed (24)
- Test file revision: working-tree+7e98884c7e3c2ab9aa28703507d9661672229d1a78219c693a823672c1bb78b0

The trial shows the mutation discriminates. It is not the row's falsifiability
trio: `/qfai-implement` Phase Red step 3c applies the mutation, records the
`Round 1:` fields and routes `qa-gatekeeper` while it is in the tree.

- RED test hash: 5944d673da0c6056d3cb765a2a2bb103efe8ab8595e2f0b3d11715a7bb56ecb3
- RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initSpec0003.test.ts
```

#### Shared-artifact re-verify

No RED test manifest in any evidence file names
`packages/qfai/tests/integration/initSpec0003.test.ts`, so no recorded hash moves and
no `spec-NNNN/TDD-NNNN` subsection is owed. The one other `done` row whose Test file
this is, `spec-0003/TDD-0025`, carries no manifest and no recorded mutation, and its
describe is unchanged. Its selector was re-run against the edited file:

- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0025: assistantPaths.ts SSOT module"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 23 skipped (24)
- Re-verify revision: working-tree+7e98884c7e3c2ab9aa28703507d9661672229d1a78219c693a823672c1bb78b0

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/init.ts, `runInit`, `copyTemplateTree(qfaiAssets, destQfai, …)` at line 509 — it writes under `.qfai/` exactly the tree `packages/qfai/assets/init/.qfai/` ships, which holds `assistant/` and `waivers.yml` and no artifact directory
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0001: Empty directory initialization"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 23 skipped (24). The row's case fails on `AssertionError: init wrote an artifact directory under .qfai/: expected [ 'specs' ] to deeply equal []` at `tests/integration/initSpec0003.test.ts:75:72`

The edit, an empty file added to the shipped tree:

```diff
diff --git a/packages/qfai/assets/init/.qfai/specs/.gitkeep b/packages/qfai/assets/init/.qfai/specs/.gitkeep
new file mode 100644
index 000000000..e69de29bb
```

- Round 1: Falsifiability revision: working-tree+66d3dc33e57a53cc76dcc281e6545ef8d68d826d2555de7de7dd3a97f8ee6fbc
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5944d673da0c6056d3cb765a2a2bb103efe8ab8595e2f0b3d11715a7bb56ecb3
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initSpec0003.test.ts
```

- Round 1: Revision: 0d2064bd1dd3e976ae8e39ea31b9c04f6e180209
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0001: Empty directory initialization"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 23 skipped (24). Run after `rm -rf packages/qfai/assets/init/.qfai/specs`, which leaves the shipped tree as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 24 passed (24). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: e4e818d9bd641e56c55f4d074280a636687f008b
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the rebuilt falsifiability run (specs/.gitkeep, bullet 1 assertion at :75:72), reviewed revision working-tree+66d3dc33e57a53cc76dcc281e6545ef8d68d826d2555de7de7dd3a97f8ee6fbc; build-phase GREEN + oracle proof, reviewed revision e4e818d9bd641e56c55f4d074280a636687f008b

- Spec review: PASS
- Spec reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Spec audited evidence hash: c9e4fa914bfecb2b1c0ec1abebbfc19acb167e656ef5c45077a0af023afa4076
- Spec review pack: .qfai/review/review-20260923130000000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 888b53a0d9cfa5c89fd4ea9ac62938512b5980f0b823e07af34320a79ada6dc5
- Code quality review: PASS
- Code quality reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Code quality audited evidence hash: c9e4fa914bfecb2b1c0ec1abebbfc19acb167e656ef5c45077a0af023afa4076
- Code quality review pack: .qfai/review/review-20260923130000000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 888b53a0d9cfa5c89fd4ea9ac62938512b5980f0b823e07af34320a79ada6dc5
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 24 passed (24). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification seal: fa5e87e093c231ba3b1b8725963c7774c8321994ac37406340a3650286aeacb4

### TDD-0037

- TDD-ID: TDD-0037
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowInertness.test.ts
- Selector: TC-0003-0037 (TDD-0037): three installing job declarations, nine and eight executing instances, zero secret references
- TC-ref: TC-0003-0037
- Branch: falsifiability — recorded where the row closed, `.qfai/evidence/implement-spec-0003.md#tdd-0037`. This entry records a test-only replacement and changes no branch

`CR-20260923-0011` asked for the row's test names to state the counts the case
asserts. Two title strings changed and no assertion did:

| Title | Before | After |
| ----- | ------ | ----- |
| `describe`, line 360 | `TC-0003-0037 (TDD-0037): two installing job declarations, four and three executing instances, zero secret references` | `TC-0003-0037 (TDD-0037): three installing job declarations, nine and eight executing instances, zero secret references` |
| `it`, line 469 | `the init-written jobs that install dependencies are exactly the docs and validate lanes, four instances on a pull request and three on a push` | `the init-written jobs that install dependencies are exactly the docs, test and validate lanes, nine instances on a pull request and eight on a push` |

The `Selector` above names the renamed describe, which holds the row's three cases
and nothing else. The ledger still holds the old describe title. `/qfai-implement`
writes the value above to the ledger and to its own entry's copy; until it does,
`TDDLIST_SELECTOR_UNRESOLVED` is reported on row 37. No other ledger row's
`Selector` named either old title.

- Selector run command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Selector run result: PASS — Test Files 1 passed (1); Tests 3 passed | 3 skipped (6)
- Selector run revision: working-tree+b6717d99336497714758bb9eafe114d2ddc4f4c194e332da052432f02b99161f
- Proof to re-take: the two mutations the earlier entry names — a `secrets.QFAI_LEAKED` reference planted in the verdict step's `env:` of `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, and a `run: npm ci` step appended to its `detection` job

#### Shared-artifact re-verify

No RED test manifest in `.qfai/evidence/atdd-spec-0003.md`, or in any other evidence
file, names `packages/qfai/tests/integration/shippedWorkflowInertness.test.ts`, so no
recorded hash moves and no `spec-NNNN/TDD-NNNN` subsection is owed. The one other
`done` row whose Test file this is, `spec-0003/TDD-0036`, has its evidence at
`.qfai/evidence/implement-spec-0003.md#tdd-0036`, which records no manifest. Its
describe is byte-identical after the rename, and its selector was re-run:

- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0036 \(TDD-0036\): no declared layer script means zero executing test lanes"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 3 passed | 3 skipped (6)
- Re-verify revision: working-tree+b6717d99336497714758bb9eafe114d2ddc4f4c194e332da052432f02b99161f

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/, every workflow file init writes — none carries a `secrets` reference, a secret declaration or `secrets: inherit`, and only `qfai-docs.yml#checks`, `qfai-tests.yml#tests` and `qfai-validate.yml#validate` install dependencies. The lanes were built by TDD-0035, TDD-0038 to TDD-0040, TDD-0027 and TDD-0055; the zero-secret property has held since the set shipped
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 2 passed | 3 skipped (6). The secret case fails on `AssertionError: expected [ Array(1) ] to deeply equal []` at `tests/integration/shippedWorkflowInertness.test.ts:549:24`, naming `qfai-tests.yml:677: secret context reference`

The edit, a secret reference planted in the verdict step's `env:` of `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`:

```diff
           QFAI_SELECTED: ${{ needs.detection.outputs.selected }}
+          QFAI_LEAKED: ${{ secrets.QFAI_LEAKED }}
```

- Round 1: Falsifiability revision: working-tree+27a64a572f3b9dde75c9f714c23c1cfd41db2d7888b293654d82671f282d412b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 30ebc3cb08f888b4c46df68667a8b4c82e538837b44ed2d96193fb60a897e236
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/integration/shippedWorkflowInertness.test.ts
```

The earlier entry records no `RED test hash`, so none is overwritten. Over the same
manifest the file hashed to
`64780749016ea65cecf5f8e5ccb7233deb631be8257daf9f9680091f63b67450` before the rename.

- Round 1: RED test replacement: test-only replacement — CR-20260923-0011 asked for the describe and the count case to be renamed; the proof at .qfai/evidence/implement-spec-0003.md#tdd-0037 is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+27a64a572f3b9dde75c9f714c23c1cfd41db2d7888b293654d82671f282d412b
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 2 passed | 3 skipped (6). The planted secret the proof at .qfai/evidence/implement-spec-0003.md#tdd-0037 names, re-run under the renamed test, fails the secret case on `AssertionError: expected [ Array(1) ] to deeply equal []` at `tests/integration/shippedWorkflowInertness.test.ts:549:24`. Over the whole test file the same edit fails that case alone: Tests 1 failed | 5 passed (6)

A second mutation, the one the earlier entry ran beyond the proof, exercises the other two cases. It is not the row's proof:

- Command: the same command, with a `run: npm ci` step appended to the `detection` job of the same file
- Result: Test Files 1 failed (1); Tests 2 failed | 1 passed | 3 skipped (6). The count case fails on `AssertionError: expected [ …(4) ] to deeply equal [ …(3) ]` at `tests/integration/shippedWorkflowInertness.test.ts:499:68`, with `detection` as the extra entry, and the detection case fails on `AssertionError: expected [ Array(1) ] to deeply equal []` at `:574:24`, naming `detection job installs dependencies`
- Revision: working-tree+ceced760cb9f30ce532c18e001c8b48dbbc5cc5ab4806957a499b90b2fbd4e07

```diff
           echo "qfai tests: lanes to run ${selected}"
+      - name: Install dependencies
+        run: npm ci
   tests:
```

- Round 1: Revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 3 passed | 3 skipped (6). Run after `git checkout -- packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, which restored the file after each mutation

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 6 passed (6). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: e4e818d9bd641e56c55f4d074280a636687f008b
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the rebuilt falsifiability run (planted secrets.QFAI_LEAKED in the verdict step, secret case at :549:24) and the TDD-0036 shared-artifact re-verify, reviewed revision working-tree+27a64a572f3b9dde75c9f714c23c1cfd41db2d7888b293654d82671f282d412b; build-phase GREEN + oracle proof, reviewed revision e4e818d9bd641e56c55f4d074280a636687f008b

- Spec review: PASS
- Spec reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Spec audited evidence hash: b1eedd2b472ea8a6c5b8e3814205694077a4c345f1bf07c83309f858d1ae9af1
- Spec review pack: .qfai/review/review-20260923130001000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 19c315faa2751606c83ee1e5e877c1053aff72c126ce80e3fa0e3d16ea95ce1e
- Code quality review: PASS
- Code quality reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Code quality audited evidence hash: b1eedd2b472ea8a6c5b8e3814205694077a4c345f1bf07c83309f858d1ae9af1
- Code quality review pack: .qfai/review/review-20260923130001000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 19c315faa2751606c83ee1e5e877c1053aff72c126ce80e3fa0e3d16ea95ce1e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — the last row of this run, so the full suite ran: Test Files 771 passed | 3 skipped (774); Tests 14565 passed | 82 skipped (14647)
- Checkpoint verification revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification seal: 645095fba21747e6dc9b7be0b1a48e5dd514dd440649e88e89a443576ba712a4

### TDD-0094

- TDD-ID: TDD-0094
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
- Selector: TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
- TC-ref: TC-0003-0059
- Boundary: `no-steering-path`
- EX-ref: EX-0003-0052; AC-ref: AC-0003-0039; BR-ref: BR-0003-0049 (`Contract-Refs: CLI-INIT`)
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and implements the predicate wrongly: `runInit` in `packages/qfai/src/cli/commands/init.ts` calls `seedProjectSteering`, which writes `.qfai/steering/.gitkeep` and `.qfai/steering/_templates/entry.md` create-only. No seam is needed: the test imports only functions that exist.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture: a fresh temporary directory; one plain `runInit`, with stdout and stderr each
  captured by `vi.spyOn(process.<stream>, "write")` and split into lines, `\` normalised to
  `/`. `info` and `warn` write to stdout and `error` to stderr, and `runInit` calls all three.
- Oracle:
  - read-proof (S1 D5): exactly one captured stdout line starts `qfai init: dest=`, so the
    captured report is the one init printed;
  - absence, one `toEqual`: `lstat` of `.qfai/steering` fails with `ENOENT`, and no
    captured line of either stream names `.qfai/steering` followed by `/` or the end of the line (S1
    D4; `.qfai/assistant/steering/` does not match).
- Expected RED, from reading the code before the run (the RED below matches it): `.qfai/steering` exists,
  holding the two seed files.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-24T00:23:35Z
  - Reviewed: test hash `7604ef12…6c7da1`, at tree `working-tree+e5d63a1b…184502`,
    the single selector entry above, and the Round 1 plan below. No RED had
    been run.
  - "The report names none" belongs to this boundary. TC-0003-0059's first
    bullet puts it inside `no-steering-path` itself: "no path exists under
    `.qfai/steering/`, and the report names none". EX-0003-0052 says the same.
    One `toEqual` over both halves is therefore one boundary.
  - Reason, sufficiency gap: the test captures only `process.stdout`. Init's
    report is written to two streams. In `packages/qfai/src/cli/lib/logger.ts`,
    `info` and `warn` write to stdout and `error` writes to stderr, and
    `runInit` calls `error` more than once. A report line on stderr naming
    `.qfai/steering/` would pass this test, so the "names none" half covers
    only part of the report.
  - What holds:
    - Checking the directory itself (`lstat` `ENOENT`) reads "no path under
      `.qfai/steering/`" the way S1 D4 reads "names": `.qfai/steering`
      followed by `/` or the end. An empty seeded directory is therefore a
      failure, which is the right result.
    - The `qfai init: dest=` read-proof is legitimate (S1 D5). It shows the
      capture holds the report init printed.
    - The single mutation, restoring `seedProjectSteering`, fails the row.
  - To clear:
    1. Capture `process.stderr.write` alongside stdout, and run the
       `STEERING_PATH` check over the lines of both. Keep the `dest=`
       read-proof on stdout.
    2. Record the new file hash and resubmit it for scope approval before any
       RED is run. The hash covers the whole file, so the resubmission covers
       `TDD-0095`, `TDD-0096` and `TDD-0097` too.
- Scope approval (`delivery-planner`), on file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:28:16Z
  - Covers: file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`, at tree `working-tree+e7f06398…f9db7`, and the single selector entry above,
    which is unchanged. No RED had been run. If the test file, a manifest entry
    or the selector changes, this approval lapses.
  - Reason: the REVISE is cleared. `captureReport` now spies on
    `process.stderr.write` as well as stdout, and the `STEERING_PATH` check
    runs over the lines of both streams. The `dest=` read-proof stays on
    stdout, where `info` writes it. The "names none" half now covers the whole
    report init prints.
  - The rest is unchanged from the earlier verdict: the `lstat` `ENOENT` half,
    one `toEqual`, one boundary, and the seed-restoring mutation.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is
  the seed-removal round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the
    row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0003.md#tdd-0094`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7
- Round 1: RED test hash: c362525dc7a14900652ac262918049830753db71ac2bb092e71f555f20aa50a9
  (lstat-mode form `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T00:30:35.069Z after the scope PASS at
  2026-09-24T00:28:16Z. Before the run both file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`,
  with the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071` and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the
  file skipped by the filter.
  The read control at line 127 passed: one captured stdout line starts
  `qfai init: dest=`. The failure is the absence assertion at line 136, inside the
  selected test: `.qfai/steering` exists, and two captured report lines name the seed files
  under it, `.qfai/steering/.gitkeep` and `.qfai/steering/_templates/entry.md`.
  Vitest's report follows verbatim; the lines `runInit` printed are captured by the
  test and do not reach it.

```text
 × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none 1747ms
   → expected { steering: 'exists', …(1) } to deeply equal { steering: 'ENOENT', reportLines: [] }
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
AssertionError: expected { steering: 'exists', …(1) } to deeply equal { steering: 'ENOENT', reportLines: [] }

- Expected
+ Received

  {
-   "reportLines": [],
-   "steering": "ENOENT",
+   "reportLines": [
+     "    - .qfai/steering/.gitkeep",
+     "    - .qfai/steering/_templates/entry.md",
+   ],
+   "steering": "exists",
  }

 ❯ tests/integration/spec0003InitWorklogSurface.test.ts:136:39
    134|       STEERING_PATH.test(line),
    135|     );
    136|     expect({ steering, reportLines }).toEqual({ steering: "ENOENT", re…
       |                                       ^
    137|   });
    138|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  09:30:38
   Duration  3.16s (transform 671ms, setup 86ms, import 991ms, tests 1.75s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it`
  neutralised as below, their operands kept, and no other `it` touched. The RED command
  was re-run unchanged, exit 0, and the verbose reporter shows this selector executed
  and passed. The test was restored at once: it compared byte-equal to the copy taken
  before the strip, the file hash recomputed to the approved value, the tree address
  returned to the RED revision, and no temporary tree was left behind.

```diff
@@ -124,16 +124,17 @@ describe("TC-0003-0059: no work-log path or instructions line after init", () =>
   it("TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none", async () => {
     const report = await init(root, false);

-    expect(
+    void [
       report.stdout.filter((line) => line.startsWith("qfai init: dest=")),
       "the captured report is the one init printed",
-    ).toHaveLength(1);
+      expect,
+    ];

     const steering = await lstatOutcome(path.join(root, ".qfai", "steering"));
     const reportLines = [...report.stdout, ...report.stderr].filter((line) =>
       STEERING_PATH.test(line),
     );
-    expect({ steering, reportLines }).toEqual({ steering: "ENOENT", reportLines: [] });
+    void [{ steering, reportLines }, { steering: "ENOENT", reportLines: [] }];
   });

   it("TC-0003-0059: the generated copilot-instructions.md has no work-log line", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"
 ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none 1329ms
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  09:32:22
   Duration  2.84s (transform 689ms, setup 108ms, import 1.02s, tests 1.33s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/src/cli/commands/init.ts`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`
  1. Restore the `seedProjectSteering(destRoot, options.dryRun)` call in `runInit`, with the
     function it calls. It writes the two seed files under `.qfai/steering/`.
     The selector must fail on `steering`, which is then `exists`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:28:16Z) covers file hash `e706e39a…6a9f`, and the RED ran on it after that PASS. The earlier REVISE on the file was cleared before any RED.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest (`e706e39a…6a9f`) and the tree address, and both equal the recorded values. The production surface is unchanged: `init.ts` still calls `seedProjectSteering` and writes the work-log instructions line, and `governedAssistantManifest.ts` still lists the schema.
  - Strip: the diff reaches only `spec0003InitWorklogSurface.test.ts` and this row `it`. The operands and the calls before each assertion are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries of the file skipped by the filter. The selector matches only its own `it`.
  - Observation: the gatekeeper re-ran the RED command. The module loads, and no seam was used. The line 127 `dest=` read-proof passed. The failure is the assertion at line 136 inside the selector: `steering` is `exists`, and two report lines name `.qfai/steering/.gitkeep` and `.qfai/steering/_templates/entry.md`. That is the path the row forbids, and the stderr capture is included.
  - Scope against TC-0003-0059 first bullet / EX-0003-0052 / AC-0003-0039 / BR-0003-0049: no path under `.qfai/steering/` and a report that names none, in one `toEqual`, with the S1 D4 boundary. Nothing else is asserted.
  - Oracle proof plan: restore `seedProjectSteering` in `runInit`. That is the code this round removes, and it names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`
- Round 1: GREEN result: exit 0; actual verbose runner output after the Oracle restoration:

  ```text
  ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none 2432ms
  Test Files  1 passed (1)
  Tests  1 passed | 3 skipped (4)
  ```
- Round 1: Oracle proof: The first attempt restored only init.ts while assistantPaths.ts still lacked the old constants; it failed with TypeError before the assertion and is not relied on. Restoring both old modules then made the selector fail at line 136: the directory existed and the report named .gitkeep and _templates/entry.md. Both modules were restored byte-equal to the GREEN copies. Mutant command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"; exit 1; AssertionError from this selected row.
- Round 1: Oracle proof command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`
- Round 1: Oracle proof result: exit 1; actual verbose runner output:

  ```text
  × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none 20624ms
  AssertionError: expected { steering: 'exists', …(1) } to deeply equal { steering: 'ENOENT', reportLines: [] }

  - Expected
  + Received

    {
  -   "reportLines": [],
  -   "steering": "ENOENT",
  +   "reportLines": [
  +     "    - .qfai/steering/.gitkeep",
  +     "    - .qfai/steering/_templates/entry.md",
  +   ],
  +   "steering": "exists",
    }

   ❯ tests/integration/spec0003InitWorklogSurface.test.ts:136:39
  Test Files  1 failed (1)
  Tests  1 failed | 3 skipped (4)
  ```
- Round 1: Restored GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`
- Round 1: Restored GREEN result: exit 0; actual verbose runner output is in Round 1 GREEN result above.
- Round 1: Restoration check: `init.ts` SHA-256 equals the pinned GREEN copy `A500A0332F802120F22078A7F59E2E5C8BBBB1FC45AEC46C3BBC9127EB5BAD58`; `assistantPaths.ts` equals `619B27174C0A158978C38C3774F403038F53851770F17E6F0A370DA547164FB4`.
- Phase: Refactor: no further production change for this row.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 185 passed (185); Duration 260.74s in tmp/spec0003-near-post-replacement.log. The corrected row selector passed after Oracle restoration (Test Files 1 passed; Tests 1 passed; see replacement or shared-artifact re-verify and restored GREEN records). The first concurrent near-suite attempt timed out in one test; its selector passed alone, and the complete suite later passed in isolated reruns.
- Refactor verify revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Refactor verify address check: two captures before and two after the final near-suite rerun agreed.
- Ledger transition times: red → green at 2026-09-24T09:54:08.284Z; green → refactor at 2026-09-24T10:17:11.710Z. The Codex parent host JSONL records both as completed ledger writes.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924110931266 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: a1dbdb989eaf86b910bc865907785305fee3ca67fe6935757f118e2432bcc902
- Spec review: PASS
- Spec reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Spec audited evidence hash: bd657a1fba6b098cd8965674f6cdec82e59808461efff391df51d21b16bcf313
- Spec review pack: .qfai/review/review-20260924110931266 <!-- qfai:not-a-citation -->
- Spec review pack seal: a1dbdb989eaf86b910bc865907785305fee3ca67fe6935757f118e2432bcc902
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Code quality audited evidence hash: bd657a1fba6b098cd8965674f6cdec82e59808461efff391df51d21b16bcf313
- Code quality review pack: .qfai/review/review-20260924110931266 <!-- qfai:not-a-citation -->
- Code quality review pack seal: a1dbdb989eaf86b910bc865907785305fee3ca67fe6935757f118e2432bcc902
- Spec record re-attestation: e20a5cf87e4e23a3793530f8c052f905108dabe7aaf784deec52a57e6d032b43
- Spec record re-attestation pack: .qfai/review/review-20260924170316601 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: f0af41c1f0082518534d44227d67abebcbcbf26659222a87f8c04519da639f8d
- Code quality record re-attestation: e20a5cf87e4e23a3793530f8c052f905108dabe7aaf784deec52a57e6d032b43
- Code quality record re-attestation pack: .qfai/review/review-20260924170316601 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: f0af41c1f0082518534d44227d67abebcbcbf26659222a87f8c04519da639f8d
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Checkpoint verification result: PASS — corrected selector: Test Files 1 passed (1), Tests 1 passed; near suite: Test Files 3 passed (3), Tests 185 passed (185), duration 260.74s; no per-item full-suite boundary was reached.
- Checkpoint verification revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification seal: 82375a070ded3de888765279424bbf374406c1df08694fae883f09b544af41e5

### TDD-0095

- TDD-ID: TDD-0095
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
- Selector: TC-0003-0059: the generated copilot-instructions.md has no work-log line
- TC-ref: TC-0003-0059
- Boundary: `no-worklog-instructions-line`
- EX-ref: EX-0003-0052; AC-ref: AC-0003-0039; BR-ref: BR-0003-0049 (`Contract-Refs: CLI-INIT`)
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and implements the predicate wrongly: `buildCopilotInstructions` in `packages/qfai/src/cli/commands/init.ts` writes the line "AI work-log surface (per-project): `.qfai/steering/` (entry frontmatter schema: …)". No seam is needed: the test imports only functions that exist.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture: a fresh temporary directory; one plain `runInit`; the generated
  `.github/copilot-instructions.md` is read and split into lines.
- Oracle (S1 D11):
  - read-proof (S1 D5): the line `## Golden rules` is found exactly once, so the file
    read is the instructions file init generated;
  - absence: no line contains `.qfai/steering/` or `worklog-entry.schema.md`
    (case-sensitive) or matches `work-log` case-insensitively.
- Expected RED, from reading the code before the run (the RED below matches it): the "AI work-log surface"
  line is the one line found.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:23:35Z
  - Covers: this row's `it` body and the helpers it calls (`init`,
    `captureReport`), as read at file hash `7604ef12…6c7da1`, with the single
    selector entry above. The file hash will change when the sibling REVISEs
    are applied. The resubmission must show this `it` unchanged, and I
    re-confirm it on the new hash before the RED runs.
  - Sufficiency: the whole of TC-0003-0059's second bullet. One plain init
    runs in an empty directory, and the generated
    `.github/copilot-instructions.md` is read line by line. The absence check
    follows S1 D11: `.qfai/steering/` and `worklog-entry.schema.md`
    case-sensitive, `work-log` case-insensitive. That catches the one line
    `buildCopilotInstructions` writes today ("AI work-log surface
    (per-project): …"). It does not catch the separate legacy
    `.qfai/assistant/steering/` lines, which are not the work-log surface.
  - One boundary: `no-worklog-instructions-line`. It asserts nothing about
    paths or the report, which belong to `TDD-0094`.
  - The `## Golden rules` read-proof is legitimate (S1 D5). It shows the file
    read is the one init generated.
- Scope approval (`delivery-planner`), on file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:28:16Z
  - Covers: file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`, at tree `working-tree+e7f06398…f9db7`, and the single selector entry above,
    which is unchanged. No RED had been run. If the test file, a manifest entry
    or the selector changes, this approval lapses.
  - Re-confirmed on the new hash: the `it` body reads as it did at
    `7604ef12…6c7da1`. `init` now returns both streams, and this row ignores
    the value. The earlier PASS reasons hold.
  - Advisory, not scope: the local `const lines` in this `it` shadows the
    module-level `lines` helper the capture now uses. It compiles and changes
    no behaviour, but a `no-shadow` lint rule would flag it.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is
  the instructions-line round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the
    row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0003.md#tdd-0095`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7
- Round 1: RED test hash: c362525dc7a14900652ac262918049830753db71ac2bb092e71f555f20aa50a9
  (lstat-mode form `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T00:30:42.081Z after the scope PASS at
  2026-09-24T00:28:16Z. Before the run both file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`,
  with the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071` and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the
  file skipped by the filter.
  The read control at line 144 passed: `## Golden rules` is found exactly once. The
  failure is the absence assertion at line 155, inside the selector: the one line found
  is "AI work-log surface (per-project): `.qfai/steering/` (entry frontmatter schema: …)".
  Vitest's report follows verbatim; the lines `runInit` printed are captured by the
  test and do not reach it.

```text
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
 × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line 1515ms
   → expected [ Array(1) ] to deeply equal []
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "  - AI work-log surface (per-project): `.qfai/steering/` (entry frontmatter schema: `.qfai/assistant/catalog/worklog-entry.schema.md`)",
+ ]

 ❯ tests/integration/spec0003InitWorklogSurface.test.ts:155:26
    153|         /work-log/i.test(line),
    154|     );
    155|     expect(workLogLines).toEqual([]);
       |                          ^
    156|   });
    157| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  09:30:48
   Duration  3.35s (transform 926ms, setup 110ms, import 1.28s, tests 1.52s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it`
  neutralised as below, their operands kept, and no other `it` touched. The RED command
  was re-run unchanged, exit 0, and the verbose reporter shows this selector executed
  and passed. The test was restored at once: it compared byte-equal to the copy taken
  before the strip, the file hash recomputed to the approved value, the tree address
  returned to the RED revision, and no temporary tree was left behind.

```diff
@@ -141,10 +141,11 @@ describe("TC-0003-0059: no work-log path or instructions line after init", () =>
     const text = await readFile(path.join(root, ".github", "copilot-instructions.md"), "utf-8");
     const lines = text.split(/\r?\n/);

-    expect(
+    void [
       lines.filter((line) => line === "## Golden rules"),
       "the instructions file init generated was read",
-    ).toHaveLength(1);
+      expect,
+    ];

     const workLogLines = lines.filter(
       (line) =>
@@ -152,7 +153,7 @@ describe("TC-0003-0059: no work-log path or instructions line after init", () =>
         line.includes("worklog-entry.schema.md") ||
         /work-log/i.test(line),
     );
-    expect(workLogLines).toEqual([]);
+    void [workLogLines, []];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
 ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line 4503ms
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  09:32:32
   Duration  6.49s (transform 913ms, setup 115ms, import 1.22s, tests 4.51s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/src/cli/commands/init.ts`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`
  1. Restore the "AI work-log surface (per-project): `.qfai/steering/` …" line in
     `buildCopilotInstructions`. The selector must fail on `workLogLines`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:28:16Z) covers file hash `e706e39a…6a9f`, and the RED ran on it after that PASS. The earlier REVISE on the file was cleared before any RED.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest (`e706e39a…6a9f`) and the tree address, and both equal the recorded values. The production surface is unchanged: `init.ts` still calls `seedProjectSteering` and writes the work-log instructions line, and `governedAssistantManifest.ts` still lists the schema.
  - Strip: the diff reaches only `spec0003InitWorklogSurface.test.ts` and this row `it`. The operands and the calls before each assertion are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries of the file skipped by the filter. The selector matches only its own `it`.
  - Observation: the gatekeeper re-ran the RED command. The line 144 `## Golden rules` read-proof passed. The failure is the assertion at line 155 inside the selector: the one line found is the AI work-log surface line naming `.qfai/steering/`, which is the predicate.
  - Scope against TC-0003-0059 second bullet: the S1 D11 absence tokens (`.qfai/steering/` and `worklog-entry.schema.md` case-sensitive, `work-log` case-insensitive). The legacy `.qfai/assistant/steering/` lines do not match. Nothing else is asserted.
  - Oracle proof plan: restore that line in `buildCopilotInstructions`. That is the code this round removes, and it names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`
- Round 1: GREEN result: exit 0; actual verbose runner output after the Oracle restoration:

  ```text
  ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line 1813ms
  Test Files  1 passed (1)
  Tests  1 passed | 3 skipped (4)
  ```
- Round 1: Oracle proof: Restoring only the removed buildCopilotInstructions line made this selector fail at line 155 with the work-log line in the generated file. init.ts was restored byte-equal to the GREEN copy. Mutant command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"; exit 1; AssertionError from this selected row.
- Round 1: Oracle proof command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`
- Round 1: Oracle proof result: exit 1; actual verbose runner output:

  ```text
  × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line 2673ms
  AssertionError: expected [ Array(1) ] to deeply equal []

  - Expected
  + Received

  - []
  + [
  +   "  - AI work-log surface (per-project): `.qfai/steering/` (entry frontmatter schema: `.qfai/assistant/catalog/worklog-entry.schema.md`)",
  + ]

   ❯ tests/integration/spec0003InitWorklogSurface.test.ts:155:26
  Test Files  1 failed (1)
  Tests  1 failed | 3 skipped (4)
  ```
- Round 1: Restored GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`
- Round 1: Restored GREEN result: exit 0; actual verbose runner output is in Round 1 GREEN result above.
- Round 1: Restoration check: `init.ts` SHA-256 equals the pinned GREEN copy `A500A0332F802120F22078A7F59E2E5C8BBBB1FC45AEC46C3BBC9127EB5BAD58`; `assistantPaths.ts` equals `619B27174C0A158978C38C3774F403038F53851770F17E6F0A370DA547164FB4`.
- Phase: Refactor: no further production change for this row.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 185 passed (185); Duration 260.74s in tmp/spec0003-near-post-replacement.log. The corrected row selector passed after Oracle restoration (Test Files 1 passed; Tests 1 passed; see replacement or shared-artifact re-verify and restored GREEN records). The first concurrent near-suite attempt timed out in one test; its selector passed alone, and the complete suite later passed in isolated reruns.
- Refactor verify revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Refactor verify address check: two captures before and two after the final near-suite rerun agreed.
- Ledger transition times: red → green at 2026-09-24T09:54:17.876Z; green → refactor at 2026-09-24T10:17:16.677Z. The Codex parent host JSONL records both as completed ledger writes.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924110931267 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 38b977a51602a204b37ff5f2aa7c5aa24557d3b48fb130855266cf935df8e31a
- Spec review: PASS
- Spec reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Spec audited evidence hash: b11566b3a43a54f72e1fa5b72d835ed3482d9e1afdd9a5caa2aadeb6c580fcb8
- Spec review pack: .qfai/review/review-20260924110931267 <!-- qfai:not-a-citation -->
- Spec review pack seal: 38b977a51602a204b37ff5f2aa7c5aa24557d3b48fb130855266cf935df8e31a
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Code quality audited evidence hash: b11566b3a43a54f72e1fa5b72d835ed3482d9e1afdd9a5caa2aadeb6c580fcb8
- Code quality review pack: .qfai/review/review-20260924110931267 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 38b977a51602a204b37ff5f2aa7c5aa24557d3b48fb130855266cf935df8e31a
- Spec record re-attestation: 0998eb9914dc405479f4f8d5ef1f9972f6c6867e78ebc30fcbf717d469f41c83
- Spec record re-attestation pack: .qfai/review/review-20260924170316623 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: b2ccbbc9ba2a30f21c0fafacabaf9f8dc700cd56f3afcecae59edc1d63ea8b3d
- Code quality record re-attestation: 0998eb9914dc405479f4f8d5ef1f9972f6c6867e78ebc30fcbf717d469f41c83
- Code quality record re-attestation pack: .qfai/review/review-20260924170316623 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: b2ccbbc9ba2a30f21c0fafacabaf9f8dc700cd56f3afcecae59edc1d63ea8b3d
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Checkpoint verification result: PASS — corrected selector: Test Files 1 passed (1), Tests 1 passed; near suite: Test Files 3 passed (3), Tests 185 passed (185), duration 260.74s; no per-item full-suite boundary was reached.
- Checkpoint verification revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification seal: d8352bf9749a8fbd53ca78044d5294290fc7c6064d0808aa4b04c7e09edb111b

### TDD-0096

- TDD-ID: TDD-0096
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
- Selector: TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
- TC-ref: TC-0003-0060
- Boundary: `plain-init-byte-identical`
- EX-ref: EX-0003-0053; AC-ref: AC-0003-0039; BR-ref: BR-0003-0049 (`Contract-Refs: CLI-INIT`)
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and implements the predicate wrongly: `runInit` in `packages/qfai/src/cli/commands/init.ts` calls `seedProjectSteering`, which writes `.qfai/steering/.gitkeep` and `.qfai/steering/_templates/entry.md` create-only. No seam is needed: the test imports only functions that exist.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture (S1 D7, D8): a fresh temporary directory; one plain `runInit`; then everything
  under `.qfai/steering/` is removed and exactly the EX-0003-0053 set is written: an edited
  `README.md` and one adopter entry, `2026-09-01-adopter-note.md`, with no `.gitkeep` and
  no `_templates/entry.md`. Every entry under it is recorded by its relative path: a file by its SHA-256, a
  directory or a link by its kind, so an init that adds an empty directory changes the
  record.
- Oracle:
  - read-proof (S1 D5): the recorded path set is exactly those two files, so the walk read
    the populated directory and the comparison is not over an empty set;
  - after a second plain `runInit`, the snapshot equals the record: the same entries, each
    file with the same SHA-256.
- Expected RED, from reading the code before the run (the RED below matches it): the snapshot gains `.gitkeep`
  and `_templates/entry.md`.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-24T00:23:35Z
  - Reviewed: test hash `7604ef12…6c7da1`, at tree `working-tree+e5d63a1b…184502`,
    the single selector entry above, and the Round 1 plan below. No RED had
    been run.
  - Reason, sufficiency gap: TC-0003-0060 and EX-0003-0053 compare "the path
    set under `.qfai/steering/`" and each file's SHA-256. `snapshot` skips
    every entry that is not a file (`if (!entry.isFile()) continue`), so a
    directory is not in the recorded path set. BR-0003-0049 says init creates
    no path there. An init that created an empty `_templates/` directory, or
    any other empty directory, would pass this row. The seed being removed
    creates exactly that directory before it writes into it.
  - What holds:
    - The fixture is S1 D7 and D8: its own directory, the directory cleared,
      exactly the EX-0003-0053 set written.
    - The read-proof is legitimate (S1 D5). It shows the walk read the
      populated directory.
    - One boundary: `plain-init-byte-identical`, one plain run, one
      comparison. Nothing from `--force` is asserted.
    - The single mutation, restoring `seedProjectSteering`, fails the row.
  - To clear:
    1. Have `snapshot` record every entry under the directory by its relative
       path: a file by its SHA-256, and anything else by its kind (for
       example `dir`, `symlink`). The recorded path set is then the TC's path
       set. The read-proof's two expected keys stay as they are, because the
       EX-0003-0053 set holds no subdirectory.
    2. Record the new file hash and resubmit it for scope approval before any
       RED is run.
- Scope approval (`delivery-planner`), on file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:28:16Z
  - Covers: file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`, at tree `working-tree+e7f06398…f9db7`, and the single selector entry above,
    which is unchanged. No RED had been run. If the test file, a manifest entry
    or the selector changes, this approval lapses.
  - Reason: the REVISE is cleared. `snapshot` records every entry under the
    directory: a file by its SHA-256, a directory as `directory`, a link as
    `symlink`, anything else as `other`. The compared path set is now the TC's
    path set, so an empty directory created under `.qfai/steering/` fails the
    row.
  - The read-proof keys are still the two EX-0003-0053 files, which is correct
    because that set holds no subdirectory. The fixture, the single plain run
    and the seed-restoring mutation are unchanged.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is
  the seed-removal round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the
    row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0003.md#tdd-0096`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Shared-artifact re-verify

##### spec-0003/TDD-0094

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Selector: TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
- Re-verify command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none"
- Re-verify result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); captured in tmp/spec0003-reverify-0094.log.
- Proof command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none", with the old seed call and its path constants restored in init.ts and assistantPaths.ts; executed by tmp/spec0003-reproof-init.ps1 -Id 0094.
- Proof result: FAIL — exit 1; Test Files 1 failed (1); Tests 1 failed | 3 skipped (4); AssertionError at spec0003InitWorklogSurface.test.ts:136:39: the restored seed creates the work-log directory and prints its paths. Mutated tree working-tree+4960f8f4923bcf337b342f4aa279ed14f1c9d45907a13e980711dcea15a09d9c was captured twice before and after the run.
- Restored GREEN command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none", after the production files were restored byte-equal to their GREEN copies.
- Restored GREEN result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); captured in tmp/spec0003-reproof-0094-restored-green.log. Restored tree working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 was captured twice.
- RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- RED test hash: 2f338c75881d325fb4806c94bb45aef2825c23e00f71d2f5709c2c7625bd16ca

##### spec-0003/TDD-0095

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Selector: TC-0003-0059: the generated copilot-instructions.md has no work-log line
- Re-verify command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line"
- Re-verify result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); captured in tmp/spec0003-reverify-0095.log.
- Proof command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line", with the removed work-log instructions line restored in init.ts; executed by tmp/spec0003-reproof-init.ps1 -Id 0095.
- Proof result: FAIL — exit 1; Test Files 1 failed (1); Tests 1 failed | 3 skipped (4); AssertionError at spec0003InitWorklogSurface.test.ts:155:26: the restored instruction line appears in the generated file. Mutated tree working-tree+021c9f6c67b04b862b55c493e7dde0d4ae1420b1944302c9df91c2c578445928 was captured twice before and after the run.
- Restored GREEN command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0059: the generated copilot-instructions.md has no work-log line", after the production files were restored byte-equal to their GREEN copies.
- Restored GREEN result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); captured in tmp/spec0003-reproof-0095-restored-green.log. Restored tree working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 was captured twice.
- RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- RED test hash: 2f338c75881d325fb4806c94bb45aef2825c23e00f71d2f5709c2c7625bd16ca

##### spec-0003/TDD-0097

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Selector: TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical
- Re-verify command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"
- Re-verify result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); captured in tmp/spec0003-reverify-0097.log.
- Proof command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical", with seedProjectSteering restored only when options.force is true, alongside its path constants; executed by tmp/spec0003-reproof-init.ps1 -Id 0097.
- Proof result: FAIL — exit 1; Test Files 1 failed (1); Tests 1 failed | 3 skipped (4); AssertionError at spec0003InitWorklogSurface.test.ts:186:38: force-only seeding adds .gitkeep and _templates; the TDD-0096 plain-init control passed under the same mutation. Mutated tree working-tree+f2926e8682bb3716030323d257fe02b9d624ea4f3a6213e26a0312904ff44556 was captured twice before and after the run.
- Restored GREEN command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical", after the production files were restored byte-equal to their GREEN copies.
- Restored GREEN result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); captured in tmp/spec0003-reproof-0097-restored-green.log. Restored tree working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 was captured twice.
- RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- RED test hash: 2f338c75881d325fb4806c94bb45aef2825c23e00f71d2f5709c2c7625bd16ca

#### Round 1

- Round 1: RED revision: working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7
- Round 1: RED test hash: 2f338c75881d325fb4806c94bb45aef2825c23e00f71d2f5709c2c7625bd16ca
  (test-only replacement after implementation-reviewer REVISE; original RED hash `c362525dc7a14900652ac262918049830753db71ac2bb092e71f555f20aa50a9` and lstat-mode hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f` remain historical)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer series Round 1, attempt 1, replacement ordinal 1, REVISE. Internal decision IDs in the test comment and a stale description of the adopter directory were replaced with current-behaviour wording. The selector and production behaviour are unchanged. The corrected test passed on first run, so this is the no-new-behaviour path and no new TDD round opens. The original RED observation stays at its original RED revision.
- Round 1: Test-only replacement command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
- Round 1: Test-only replacement result: exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4).
- Round 1: Test-only replacement revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 (two equal address captures before and after both corrected-selector runs).
- Round 1: Replacement proof revision: working-tree+4960f8f4923bcf337b342f4aa279ed14f1c9d45907a13e980711dcea15a09d9c (test-only replacement after implementation-reviewer REVISE; two equal captures before and after mutation).
- Round 1: Original Oracle proof status: stale — test replaced; the original failure remains historical.
- Round 1: Replacement proof command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical", with the original production mutation re-applied by tmp/spec0003-reproof-init.ps1 -Id 0096.
- Round 1: Replacement proof result: exit 1; Test Files 1 failed (1); Tests 1 failed | 3 skipped (4); AssertionError at spec0003InitWorklogSurface.test.ts:171:38: .gitkeep and _templates were added to the two adopter files.
- Round 1: Replacement restored GREEN command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical", after byte-equal production restoration.
- Round 1: Replacement restored GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed | 3 skipped (4); restored tree working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 captured twice.

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T00:30:59.361Z after the scope PASS at
  2026-09-24T00:28:16Z. Before the run both file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`,
  with the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071` and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the
  file skipped by the filter.
  The read control at line 164 passed: the recorded entries are exactly the two
  EX-0003-0053 files. The failure is the snapshot comparison at line 171, inside the
  selected test: after the second plain run the directory also holds `.gitkeep`, the
  directory `_templates` and `_templates/entry.md`, and the two recorded files keep
  their SHA-256.
  Vitest's report follows verbatim; the lines `runInit` printed are captured by the
  test and do not reach it.

```text
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
 × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical 3947ms
   → expected { …(5) } to deeply equal { …(2) }
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
AssertionError: expected { …(5) } to deeply equal { …(2) }

- Expected
+ Received

  {
+   ".gitkeep": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "2026-09-01-adopter-note.md": "0279029a3a8c1faae53351e8dce6242f23d51b0f3ab4eba7b7436b765735edbe",
    "README.md": "dcb675ef0ee351f1d67f3df795d4de8acff893772ee15183b7a6f28c15e8970e",
+   "_templates": "directory",
+   "_templates/entry.md": "486cea9e9f27a7088f632ea4a33987a6ecd3da4c82e124fb620194cf595ddcdc",
  }

 ❯ tests/integration/spec0003InitWorklogSurface.test.ts:171:38
    169|
    170|     await init(root, false);
    171|     expect(await snapshot(steering)).toEqual(before);
       |                                      ^
    172|   });
    173|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  09:31:03
   Duration  6.03s (transform 823ms, setup 98ms, import 1.16s, tests 3.95s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it`
  neutralised as below, their operands kept, and no other `it` touched. The RED command
  was re-run unchanged, exit 0, and the verbose reporter shows this selector executed
  and passed. The test was restored at once: it compared byte-equal to the copy taken
  before the strip, the file hash recomputed to the approved value, the tree address
  returned to the RED revision, and no temporary tree was left behind.

```diff
@@ -162,13 +162,15 @@ describe("TC-0003-0060: populated work-log directory unchanged by init and init
     const steering = await populateSteering(root);
     const before = await snapshot(steering);

-    expect(Object.keys(before).sort(), "the walk read the populated directory").toEqual([
-      "2026-09-01-adopter-note.md",
-      "README.md",
-    ]);
+    void [
+      Object.keys(before).sort(),
+      "the walk read the populated directory",
+      ["2026-09-01-adopter-note.md", "README.md"],
+      expect,
+    ];

     await init(root, false);
-    expect(await snapshot(steering)).toEqual(before);
+    void [await snapshot(steering), before];
   });

   it("TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
 ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical 4076ms
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  09:32:45
   Duration  5.57s (transform 702ms, setup 94ms, import 996ms, tests 4.08s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/src/cli/commands/init.ts`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
  1. Restore the `seedProjectSteering(destRoot, options.dryRun)` call in `runInit`, with the
     function it calls. It writes the two seed files under `.qfai/steering/`.
     The selector must fail on the snapshot comparison.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:28:16Z) covers file hash `e706e39a…6a9f`, and the RED ran on it after that PASS. The earlier REVISE on the file was cleared before any RED.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest (`e706e39a…6a9f`) and the tree address, and both equal the recorded values. The production surface is unchanged: `init.ts` still calls `seedProjectSteering` and writes the work-log instructions line, and `governedAssistantManifest.ts` still lists the schema.
  - Strip: the diff reaches only `spec0003InitWorklogSurface.test.ts` and this row `it`. The operands and the calls before each assertion are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries of the file skipped by the filter. The selector matches only its own `it`.
  - Observation: the gatekeeper re-ran the RED command. The line 164 read-proof passed (exactly the two EX-0003-0053 files). The failure is the snapshot comparison at line 171 inside the selector: the second plain run added `.gitkeep`, the directory `_templates` and `_templates/entry.md`, while the two recorded files kept their SHA-256. The directory entry is caught because `snapshot` now records every entry.
  - Scope against TC-0003-0060 / EX-0003-0053 (plain run): one plain run and one comparison, with S1 D7/D8 fixture discipline. Nothing from `--force` is asserted.
  - Oracle proof plan: restore the unconditional `seedProjectSteering` call. That is the code this round removes, and it names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
- Round 1: GREEN result: exit 0; actual verbose runner output after the Oracle restoration:

  ```text
  ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical 4966ms
  Test Files  1 passed (1)
  Tests  1 passed | 3 skipped (4)
  ```
- Round 1: Oracle proof: The first attempt restored only init.ts while assistantPaths.ts still lacked the old constants; it failed with TypeError before the assertion and is not relied on. Restoring both old modules then made this selector fail at line 171: .gitkeep, _templates and _templates/entry.md appeared beside the two unchanged adopter files. Both modules were restored byte-equal to the GREEN copies. Mutant command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"; exit 1; AssertionError from this selected row.
- Round 1: Oracle proof command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
- Round 1: Oracle proof result: exit 1; actual verbose runner output:

  ```text
  × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical 49299ms
  AssertionError: expected { …(5) } to deeply equal { …(2) }

  - Expected
  + Received

    {
  +   ".gitkeep": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "2026-09-01-adopter-note.md": "0279029a3a8c1faae53351e8dce6242f23d51b0f3ab4eba7b7436b765735edbe",
      "README.md": "dcb675ef0ee351f1d67f3df795d4de8acff893772ee15183b7a6f28c15e8970e",
  +   "_templates": "directory",
  +   "_templates/entry.md": "486cea9e9f27a7088f632ea4a33987a6ecd3da4c82e124fb620194cf595ddcdc",
    }

   ❯ tests/integration/spec0003InitWorklogSurface.test.ts:171:38
  Test Files  1 failed (1)
  Tests  1 failed | 3 skipped (4)
  ```
- Round 1: Restored GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
- Round 1: Restored GREEN result: exit 0; actual verbose runner output is in Round 1 GREEN result above.
- Round 1: Restoration check: `init.ts` SHA-256 equals the pinned GREEN copy `A500A0332F802120F22078A7F59E2E5C8BBBB1FC45AEC46C3BBC9127EB5BAD58`; `assistantPaths.ts` equals `619B27174C0A158978C38C3774F403038F53851770F17E6F0A370DA547164FB4`.
- Phase: Refactor: no further production change for this row.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 185 passed (185); Duration 260.74s in tmp/spec0003-near-post-replacement.log. The corrected row selector passed after Oracle restoration (Test Files 1 passed; Tests 1 passed; see replacement or shared-artifact re-verify and restored GREEN records). The first concurrent near-suite attempt timed out in one test; its selector passed alone, and the complete suite later passed in isolated reruns.
- Refactor verify revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Refactor verify address check: two captures before and two after the final near-suite rerun agreed.
- Ledger transition times: red → green at 2026-09-24T09:54:29.618Z; green → refactor at 2026-09-24T10:17:27.769Z. The Codex parent host JSONL records both as completed ledger writes.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924110931268 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: cac593842a90f9207a3e600afc2d8ccfcdfc4b9591d5571a5db07f6499f2f299
- Spec review: PASS
- Spec reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Spec audited evidence hash: 3e6a447a61a846caab2d347a1c93b2a7172bcf69fff2db761be942b89819d497
- Spec review pack: .qfai/review/review-20260924110931268 <!-- qfai:not-a-citation -->
- Spec review pack seal: cac593842a90f9207a3e600afc2d8ccfcdfc4b9591d5571a5db07f6499f2f299
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Code quality audited evidence hash: 3e6a447a61a846caab2d347a1c93b2a7172bcf69fff2db761be942b89819d497
- Code quality review pack: .qfai/review/review-20260924110931268 <!-- qfai:not-a-citation -->
- Code quality review pack seal: cac593842a90f9207a3e600afc2d8ccfcdfc4b9591d5571a5db07f6499f2f299
- Spec record re-attestation: 29a1f5840b58535ee39390887cff1e54613e6542cafd7c4302566aaa9a120c33
- Spec record re-attestation pack: .qfai/review/review-20260924170316635 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 71ab0c7b2b7b7e74afb09c9a071cc844f154d1a97a952cb7628b520579933ee5
- Code quality record re-attestation: 29a1f5840b58535ee39390887cff1e54613e6542cafd7c4302566aaa9a120c33
- Code quality record re-attestation pack: .qfai/review/review-20260924170316635 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 71ab0c7b2b7b7e74afb09c9a071cc844f154d1a97a952cb7628b520579933ee5
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Checkpoint verification result: PASS — corrected selector: Test Files 1 passed (1), Tests 1 passed; near suite: Test Files 3 passed (3), Tests 185 passed (185), duration 260.74s; no per-item full-suite boundary was reached.
- Checkpoint verification revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification seal: 7d14dd584c81e8c66186595d7a10c036dcb1064ecdd1706f8a376f9513aa9b4d

### TDD-0097

- TDD-ID: TDD-0097
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
- Selector: TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical
- TC-ref: TC-0003-0060
- Boundary: `force-init-byte-identical`
- EX-ref: EX-0003-0053; AC-ref: AC-0003-0039; BR-ref: BR-0003-0049 (`Contract-Refs: CLI-INIT`)
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and implements the predicate wrongly: `runInit` in `packages/qfai/src/cli/commands/init.ts` calls `seedProjectSteering`, which writes `.qfai/steering/.gitkeep` and `.qfai/steering/_templates/entry.md` create-only. No seam is needed: the test imports only functions that exist.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture: as `TDD-0096`, in its own directory (S1 D7).
- Oracle:
  - read-proof (S1 D5): the recorded path set is exactly the two EX-0003-0053 files;
  - after a plain `runInit` and then `runInit` with `--force`, the snapshot, taken as in
    `TDD-0096` (every entry, a file by its SHA-256 and anything else by its kind), equals
    the record taken before both runs (S1 D7).
- Expected RED, from reading the code before the run (the RED below matches it): the snapshot gains `.gitkeep`
  and `_templates/entry.md`.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-24T00:23:35Z
  - Reviewed: test hash `7604ef12…6c7da1`, at tree `working-tree+e5d63a1b…184502`,
    the single selector entry above, and the Round 1 plan below. No RED had
    been run.
  - Reason 1, the same sufficiency gap as `TDD-0096`: `snapshot` leaves
    directories out of the path set. The same fix clears it here.
  - Reason 2, the boundary is not shown on its own: the Oracle proof's only
    mutation (restore `seedProjectSteering`) is `TDD-0096`'s. That mutation
    makes the plain run in this row's sequence change the directory, so it
    fails `TDD-0096` and this row together. It never shows that this row
    fails when only `--force` touches `.qfai/steering/`. As planned, nothing
    shows `force-init-byte-identical` can be observed apart from
    `plain-init-byte-identical`.
  - What holds:
    - The sequence (plain run, then `--force`, compared against the setup
      record) is TC-0003-0060's Action and S1 D7. It is not an addition.
    - The read-proof is legitimate (S1 D5).
    - The only assertion is after `--force`. Nothing after the plain run is
      asserted, so `TDD-0096`'s check is not repeated.
  - To clear:
    1. Apply `TDD-0096`'s `snapshot` fix. The helper is shared.
    2. Replace the Oracle proof mutation with one in `runInit`
       (`packages/qfai/src/cli/commands/init.ts`, this row's `Owning
       module`) that touches `.qfai/steering/` only when `force` is true. For
       example, call `seedProjectSteering` only under `--force`. The selector
       must fail on the snapshot comparison while `TDD-0096`'s selector still
       passes. Name both commands in the proof.
    3. Resubmit with the new file hash before any RED is run.
  - Advisory for `qa-gatekeeper`, not scope: on today's tree the plain run
    seeds `.gitkeep` and `_templates/entry.md`, and the seed is create-only.
    So this row's RED will most likely show a difference the plain run made,
    not one `--force` made. Whether that is admissible as this row's RED is
    the gatekeeper's call. If it is not, the coupling is in TC-0003-0060's
    Action. That needs a Change Request to `/qfai-sdd`, not a re-scope here.
- Scope approval (`delivery-planner`), on file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:28:16Z
  - Covers: file hash `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`, at tree `working-tree+e7f06398…f9db7`, and the single selector entry above,
    which is unchanged. No RED had been run. If the test file, a manifest entry
    or the selector changes, this approval lapses.
  - Reason: both parts of the REVISE are cleared.
    1. `snapshot` is shared and now records every entry, as for `TDD-0096`.
    2. The Oracle proof's only mutation calls `seedProjectSteering` in
       `runInit` only when `options.force` is true. Under it, this row must
       fail and `TDD-0096`'s selector must still pass, and both commands are
       named. That shows `force-init-byte-identical` can fail apart from
       `plain-init-byte-identical`.
  - Replace, not add, is what the REVISE asked for. The unconditional seed
    mutation is `TDD-0096`'s falsifier and tests nothing this row owns alone.
    Keeping it here would only repeat that row's proof.
  - The sequence (plain run, then `--force`, compared against the setup
    record) and the read-proof are unchanged.
  - The advisory for `qa-gatekeeper` still stands. Today's seed is create-only,
    so this row's RED will probably show a change the plain run made. Whether
    that is admissible is the gatekeeper's call.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is
  the seed-removal round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the
    row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0003.md#tdd-0097`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7
- Round 1: RED test hash: c362525dc7a14900652ac262918049830753db71ac2bb092e71f555f20aa50a9
  (lstat-mode form `e706e39a993039b40c5007c2f69229fca24786c22ae05d4377b0086c70796a9f`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T00:31:10.485Z after the scope PASS at
  2026-09-24T00:28:16Z. Before the run both file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`,
  with the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071` and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the
  file skipped by the filter.
  The read control at line 178 passed. The failure is the snapshot comparison at line
  186, inside the selector, after the plain run and then the `--force` run: the
  directory gains the same three entries as `TDD-0096`'s RED, `.gitkeep`, `_templates`
  and `_templates/entry.md`.
  Vitest's report follows verbatim; the lines `runInit` printed are captured by the
  test and do not reach it.

```text
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
 × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical 4293ms
   → expected { …(5) } to deeply equal { …(2) }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical
AssertionError: expected { …(5) } to deeply equal { …(2) }

- Expected
+ Received

  {
+   ".gitkeep": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "2026-09-01-adopter-note.md": "0279029a3a8c1faae53351e8dce6242f23d51b0f3ab4eba7b7436b765735edbe",
    "README.md": "dcb675ef0ee351f1d67f3df795d4de8acff893772ee15183b7a6f28c15e8970e",
+   "_templates": "directory",
+   "_templates/entry.md": "486cea9e9f27a7088f632ea4a33987a6ecd3da4c82e124fb620194cf595ddcdc",
  }

 ❯ tests/integration/spec0003InitWorklogSurface.test.ts:186:38
    184|     await init(root, false);
    185|     await init(root, true);
    186|     expect(await snapshot(steering)).toEqual(before);
       |                                      ^
    187|   });
    188| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  09:31:16
   Duration  5.92s (transform 703ms, setup 91ms, import 995ms, tests 4.30s, environment 0ms)
```

- What this RED does and does not show: the seed is create-only and runs on both the
  plain run and the `--force` run, so this run cannot tell which of the two added the
  three entries. On this tree the plain run alone adds them, as `TDD-0096`'s RED shows.
  What failed is the row's own predicate, the directory after plain-then-`--force`
  against the record taken before both, as an assertion inside the selector, so the
  failure is admissible. It does not show that the `--force` run changes the directory.
  That is the job of the planned Oracle proof at GREEN, which seeds only under
  `--force`: this selector must then fail while `TDD-0096`'s passes. The branch stays
  `observed-red`: the test did fail, which rules out branch 2, and a RED was
  observable, which rules out branch 3.
- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it`
  neutralised as below, their operands kept, and no other `it` touched. The RED command
  was re-run unchanged, exit 0, and the verbose reporter shows this selector executed
  and passed. The test was restored at once: it compared byte-equal to the copy taken
  before the strip, the file hash recomputed to the approved value, the tree address
  returned to the RED revision, and no temporary tree was left behind.

```diff
@@ -176,13 +176,15 @@ describe("TC-0003-0060: populated work-log directory unchanged by init and init
     const steering = await populateSteering(root);
     const before = await snapshot(steering);

-    expect(Object.keys(before).sort(), "the walk read the populated directory").toEqual([
-      "2026-09-01-adopter-note.md",
-      "README.md",
-    ]);
+    void [
+      Object.keys(before).sort(),
+      "the walk read the populated directory",
+      ["2026-09-01-adopter-note.md", "README.md"],
+      expect,
+    ];

     await init(root, false);
     await init(root, true);
-    expect(await snapshot(steering)).toEqual(before);
+    void [await snapshot(steering), before];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0059: no work-log path or instructions line after init > TC-0003-0059: the generated copilot-instructions.md has no work-log line
 ↓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical
 ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical 10379ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  09:32:59
   Duration  12.29s (transform 914ms, setup 103ms, import 1.30s, tests 10.38s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/src/cli/commands/init.ts`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`
  1. In `runInit`, call `seedProjectSteering(destRoot, options.dryRun)` only when
     `options.force` is true, restoring the function it calls. That touches
     `.qfai/steering/` on the `--force` run alone, adding `.gitkeep` and
     `_templates/entry.md`.
     - This row's selector, the GREEN command above, must fail on the snapshot
       comparison.
     - `TDD-0096`'s selector must still pass under the same mutation:
       `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
  - This replaces the plan's earlier mutation, an unconditional
    `seedProjectSteering` call, which fails `TDD-0096` just as well and so does not
    show that this row's `--force` run is what it checks (scope REVISE, to-clear
    item 2).

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:28:16Z) covers file hash `e706e39a…6a9f`, and the RED ran on it after that PASS. The earlier REVISE on the file was cleared before any RED.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest (`e706e39a…6a9f`) and the tree address, and both equal the recorded values. The production surface is unchanged: `init.ts` still calls `seedProjectSteering` and writes the work-log instructions line, and `governedAssistantManifest.ts` still lists the schema.
  - Strip: the diff reaches only `spec0003InitWorklogSurface.test.ts` and this row `it`. The operands and the calls before each assertion are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries of the file skipped by the filter. The selector matches only its own `it`.
  - Observation: the gatekeeper re-ran the RED command. The line 178 read-proof passed. The failure is the snapshot comparison at line 186 inside the selector, after the plain run and then `--force`: the same three entries as the TDD-0096 RED.
  - Admissibility of a RED the plain run caused (the question the scope approval deferred): admissible. The criterion is that an assertion inside the row selector fails, naming the predicate the row owns, on a tree that does not yet make it pass. The predicate here is the one TC-0003-0060 states: the directory after plain-then-`--force` equals the record taken before both. The plain run is part of the TC Action, not a fixture error, and the assertion, not the fixture, raised the failure. The strip passes, so the failure is the assertion. What the RED cannot show, that the `--force` run alone is caught, is a question of discrimination, which the Oracle proof answers and the RED does not. This does not open a Change Request: the coupling is the TC Action, and it leaves the RED admissible.
  - Condition for the build gate (does not affect this PASS): the discrimination of this row rests entirely on the planned `--force`-only mutation. At GREEN, the proof must show both of these under that one mutation: this selector fails at line 186 on the snapshot comparison, and the TDD-0096 selector passes. Record both commands and outputs. A proof that shows only this row failing, or one taken with the unconditional seed, does not show the `force-init-byte-identical` boundary and will be REVISEd.
  - Scope: one assertion after `--force`. Nothing is asserted after the plain run, so the TDD-0096 check is not repeated.

- Round 1: Revision: working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`
- Round 1: GREEN result: exit 0; actual verbose runner output after the Oracle restoration:

  ```text
  ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical 8460ms
  Test Files  1 passed (1)
  Tests  1 passed | 3 skipped (4)
  ```
- Round 1: Oracle proof: Restoring the old modules with seedProjectSteering called only when options.force is true made this selector fail at line 186 on the added .gitkeep and _templates entries; in the same run TDD-0096's plain-init selector passed. Both modules were restored byte-equal to the GREEN copies. Mutant command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"; exit 1; AssertionError from this selected row.
- Round 1: Oracle proof command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`
- Round 1: Oracle proof result: exit 1; actual verbose runner output:

  ```text
  × |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical 4046ms
  AssertionError: expected { …(5) } to deeply equal { …(2) }

  - Expected
  + Received

    {
  +   ".gitkeep": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "2026-09-01-adopter-note.md": "0279029a3a8c1faae53351e8dce6242f23d51b0f3ab4eba7b7436b765735edbe",
      "README.md": "dcb675ef0ee351f1d67f3df795d4de8acff893772ee15183b7a6f28c15e8970e",
  +   "_templates": "directory",
  +   "_templates/entry.md": "486cea9e9f27a7088f632ea4a33987a6ecd3da4c82e124fb620194cf595ddcdc",
    }

   ❯ tests/integration/spec0003InitWorklogSurface.test.ts:186:38
  Test Files  1 failed (1)
  Tests  1 failed | 3 skipped (4)
  ```
- Round 1: Oracle control command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical"`
- Round 1: Oracle control result: exit 0 under the same force-only mutation; actual verbose runner output:

  ```text
  ✓ |integration| tests/integration/spec0003InitWorklogSurface.test.ts > TC-0003-0060: populated work-log directory unchanged by init and init --force > TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical 2103ms
  Test Files  1 passed (1)
  Tests  1 passed | 3 skipped (4)
  ```
- Round 1: Restored GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`
- Round 1: Restored GREEN result: exit 0; actual verbose runner output is in Round 1 GREEN result above.
- Round 1: Restoration check: `init.ts` SHA-256 equals the pinned GREEN copy `A500A0332F802120F22078A7F59E2E5C8BBBB1FC45AEC46C3BBC9127EB5BAD58`; `assistantPaths.ts` equals `619B27174C0A158978C38C3774F403038F53851770F17E6F0A370DA547164FB4`.
- Phase: Refactor: no further production change for this row.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 185 passed (185); Duration 260.74s in tmp/spec0003-near-post-replacement.log. The corrected row selector passed after Oracle restoration (Test Files 1 passed; Tests 1 passed; see replacement or shared-artifact re-verify and restored GREEN records). The first concurrent near-suite attempt timed out in one test; its selector passed alone, and the complete suite later passed in isolated reruns.
- Refactor verify revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Refactor verify address check: two captures before and two after the final near-suite rerun agreed.
- Ledger transition times: red → green at 2026-09-24T09:54:39.972Z; green → refactor at 2026-09-24T10:17:33.086Z. The Codex parent host JSONL records both as completed ledger writes.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924110931269 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 4fa8051b6cc308692e02aa152df2795c9cd23f0e1bd42d58e7fb1fdee77c887f
- Spec review: PASS
- Spec reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Spec audited evidence hash: d8b2fe473bfb5dfdf05bb05424e0ca779a1462558c3a212e8e252d21d9361c0b
- Spec review pack: .qfai/review/review-20260924110931269 <!-- qfai:not-a-citation -->
- Spec review pack seal: 4fa8051b6cc308692e02aa152df2795c9cd23f0e1bd42d58e7fb1fdee77c887f
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Code quality audited evidence hash: d8b2fe473bfb5dfdf05bb05424e0ca779a1462558c3a212e8e252d21d9361c0b
- Code quality review pack: .qfai/review/review-20260924110931269 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 4fa8051b6cc308692e02aa152df2795c9cd23f0e1bd42d58e7fb1fdee77c887f
- Spec record re-attestation: 29e57295c3119a161f2fa13b75ec81e53053d3dd78bcde2f30caf0f7396e3352
- Spec record re-attestation pack: .qfai/review/review-20260924170316645 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 7ab74e80f3adbd3d29643b2ecd918386f35041b874a52151d21ed04f1debde93
- Code quality record re-attestation: 29e57295c3119a161f2fa13b75ec81e53053d3dd78bcde2f30caf0f7396e3352
- Code quality record re-attestation pack: .qfai/review/review-20260924170316645 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 7ab74e80f3adbd3d29643b2ecd918386f35041b874a52151d21ed04f1debde93
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003InitWorklogSurface.test.ts --reporter=verbose -t "TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Checkpoint verification result: PASS — corrected selector: Test Files 1 passed (1), Tests 1 passed; near suite: Test Files 3 passed (3), Tests 185 passed (185), duration 260.74s; no per-item full-suite boundary was reached.
- Checkpoint verification revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification seal: 26d4b01614d1b0983064d1a258dc0b38c30e127a2397ab826a7fbafbf50aecb5

### TDD-0098

- TDD-ID: TDD-0098
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts
- Selector: TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md
- TC-ref: TC-0003-0061
- Boundary: `unedited-copy-retired`
- EX-ref: EX-0003-0054; AC-ref: AC-0003-0039; BR-ref: BR-0003-0050 (`Contract-Refs: CLI-INIT`)
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and implements the predicate wrongly: the release still ships `catalog/worklog-entry.schema.md` (`packages/qfai/src/core/governedAssistantManifest.ts` and the asset under `packages/qfai/assets/init/.qfai/assistant/catalog/`), so `init --force` treats a recorded copy as a governed file to refresh, never as a withdrawn one to retire. No seam is needed: the test imports only functions that exist.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture (S1 D9): a fresh temporary directory; one plain `runInit`; then
  `.qfai/assistant/catalog/worklog-entry.schema.md` is written from an inline literal and
  its `.assets.lock.json` record is set to `hashAssistantAssetText` of that literal, with
  `readAssistantAssetsLock` and `writeAssistantAssetsLock`. Then `runInit` with `--force`.
- Oracle:
  - read-proof (S1 D5): the re-read lock still records other governed files, so init
    rewrote a readable record;
  - one `toEqual`: `lstat` of the schema fails with `ENOENT`, and the lock has no key
    `catalog/worklog-entry.schema.md`.
- Expected RED, from reading the code before the run (the RED below matches it): the copy matches its record but
  not the shipped file, so `--force` refreshes it as a stale copy. The file exists with the
  shipped content, and its record holds the shipped hash.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:23:35Z
  - Covers: this row's `it` body and the helpers it calls (`recordedSchema`,
    `init`, `lstatOutcome`), as read at file hash `204bc910…02f3d1`, with the
    single selector entry above. The resubmission must show them unchanged,
    and I re-confirm on the new hash before the RED runs.
  - Sufficiency: the whole of TC-0003-0061's first bullet. The initialised
    tree holds the schema with a matching lock record, built with the
    exported helpers per S1 D9. `--force` runs. Then one `toEqual` checks
    that the file is gone (`ENOENT`) and that the lock has no key for it.
    Those are the two parts of the bullet.
  - One boundary: `unedited-copy-retired`. The edited copy and the note are
    `TDD-0099`'s and are not asserted here.
  - The read-proof is legitimate (S1 D5). "No key" over a lock that is
    missing or empty would pass without init having written a record, and
    requiring other keys closes that gap.
  - The Oracle proof mutation lands in this row's `Owning module`. Leaving
    out the `retireWithdrawnGovernedAssets` mutation because it is outside
    that module is correct.
- Scope approval (`delivery-planner`), on file hash `e4bd58e8692da03895a68ab4691267d960e20652e83efbb7dd6cddfb8eadfba6`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:28:16Z
  - Covers: file hash `e4bd58e8692da03895a68ab4691267d960e20652e83efbb7dd6cddfb8eadfba6`, at tree `working-tree+e7f06398…f9db7`, and the single selector entry above,
    which is unchanged. No RED had been run. If the test file, a manifest entry
    or the selector changes, this approval lapses.
  - Re-confirmed on the new hash: the `it` body and the helpers it calls
    (`recordedSchema`, `init`, `lstatOutcome`) read as they did at
    `204bc910…02f3d1`. The earlier PASS reasons hold.
  - Correction to the hand-off note: this file's `captureReport` still reads
    stdout only. The hash moved because of `TDD-0099`'s fix, not a stderr
    capture. That does not affect this row, which reads no report.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is
  the asset-withdrawal round, which also satisfies spec-0004 `TDD-0068`.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the
    row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0003.md#tdd-0098`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Shared-artifact re-verify

##### spec-0003/TDD-0099

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Selector: TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it
- Re-verify command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"
- Re-verify result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 1 skipped (2); captured in tmp/spec0003-reverify-0099.log.
- Proof command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it", with the withdrawn schema restored in the governed manifest and as a shipped asset; executed by tmp/spec0003-reproof-schema.ps1 -Id 0099.
- Proof result: FAIL — exit 1; Test Files 1 failed (1); Tests 1 failed | 1 skipped (2); AssertionError at spec0003WithdrawnSchemaRetirement.test.ts:138:83: the edited content remains but the withdrawn-asset note is absent. Mutated tree working-tree+20c6a5554b0295f8b3f7f166fff4b071947d6f41c8844733f3331c04914444d5 was captured twice before and after the run.
- Restored GREEN command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it", after the production files were restored byte-equal to their GREEN copies and the temporary schema asset was removed.
- Restored GREEN result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 1 skipped (2); captured in tmp/spec0003-reproof-0099-restored-green.log. Restored tree working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 was captured twice.
- RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts
```

- RED test hash: 05b8528c8046c0eca535da1b70cb101614dc231665696275646c22283196df05

#### Round 1

- Round 1: RED revision: working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7
- Round 1: RED test hash: 05b8528c8046c0eca535da1b70cb101614dc231665696275646c22283196df05
  (test-only replacement after implementation-reviewer REVISE; original RED hash `b99314b92e448eed6dc213c87316799021d60f8b9f31ebc6900691bf1f56a347` and lstat-mode hash `e4bd58e8692da03895a68ab4691267d960e20652e83efbb7dd6cddfb8eadfba6` remain historical)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer series Round 1, attempt 1, replacement ordinal 1, REVISE. The internal decision ID in the test comment was replaced with a description of the current fixture. The selector and production behaviour are unchanged. The corrected test passed on first run, so this is the no-new-behaviour path and no new TDD round opens. The original RED observation stays at its original RED revision.
- Round 1: Test-only replacement command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`
- Round 1: Test-only replacement result: exit 0; Test Files 1 passed (1); Tests 1 passed | 1 skipped (2).
- Round 1: Test-only replacement revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 (two equal address captures before and after both corrected-selector runs).
- Round 1: Replacement proof revision: working-tree+20c6a5554b0295f8b3f7f166fff4b071947d6f41c8844733f3331c04914444d5 (test-only replacement after implementation-reviewer REVISE; two equal captures before and after mutation).
- Round 1: Original Oracle proof status: stale — test replaced; the original failure remains historical.
- Round 1: Replacement proof command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md", with the original production mutation re-applied by tmp/spec0003-reproof-schema.ps1 -Id 0098.
- Round 1: Replacement proof result: exit 1; Test Files 1 failed (1); Tests 1 failed | 1 skipped (2); AssertionError at spec0003WithdrawnSchemaRetirement.test.ts:116:8: the schema and its lock record still existed.
- Round 1: Replacement restored GREEN command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md", after byte-equal production restoration.
- Round 1: Replacement restored GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed | 1 skipped (2); restored tree working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 captured twice.

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T00:33:22.189Z after the scope PASS at
  2026-09-24T00:28:16Z. Before the run both file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`,
  with the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071` and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the
  file skipped by the filter.
  The read control at line 108 passed: the re-read lock records other governed files.
  The failure is the assertion at line 116, inside the selector: the schema still
  exists, and its record is `a6841519155b38b55f7b904c3d3d05e00a25148c5689dc1b70bd8211cd5383da`,
  the hash of the shipped asset, not the fixture's `5bbf47de…1b05bb`. `--force` refreshed
  the recorded copy as a stale file instead of retiring it.
  Vitest's report follows verbatim; the lines `runInit` printed are captured by the
  test and do not reach it.

```text
 × |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md 3213ms
   → expected { schema: 'exists', …(1) } to deeply equal { schema: 'ENOENT', record: null }
 ↓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md
AssertionError: expected { schema: 'exists', …(1) } to deeply equal { schema: 'ENOENT', record: null }

- Expected
+ Received

  {
-   "record": null,
-   "schema": "ENOENT",
+   "record": "a6841519155b38b55f7b904c3d3d05e00a25148c5689dc1b70bd8211cd5383da",
+   "schema": "exists",
  }

 ❯ tests/integration/spec0003WithdrawnSchemaRetirement.test.ts:116:8
    114|       schema: await lstatOutcome(schema),
    115|       record: files[SCHEMA_KEY] ?? null,
    116|     }).toEqual({ schema: "ENOENT", record: null });
       |        ^
    117|   });
    118|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
   Start at  09:33:26
   Duration  4.86s (transform 783ms, setup 81ms, import 1.09s, tests 3.22s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it`
  neutralised as below, their operands kept, and no other `it` touched. The RED command
  was re-run unchanged, exit 0, and the verbose reporter shows this selector executed
  and passed. The test was restored at once: it compared byte-equal to the copy taken
  before the strip, the file hash recomputed to the approved value, the tree address
  returned to the RED revision, and no temporary tree was left behind.

```diff
@@ -105,15 +105,19 @@ describe("TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kep
     const lock = await readAssistantAssetsLock(assistantRoot);
     const files = lock?.files ?? {};

-    expect(
+    void [
       Object.keys(files).length,
       "init --force rewrote a readable record of the other governed files",
-    ).toBeGreaterThan(0);
-
-    expect({
-      schema: await lstatOutcome(schema),
-      record: files[SCHEMA_KEY] ?? null,
-    }).toEqual({ schema: "ENOENT", record: null });
+      expect,
+    ];
+
+    void [
+      {
+        schema: await lstatOutcome(schema),
+        record: files[SCHEMA_KEY] ?? null,
+      },
+      { schema: "ENOENT", record: null },
+    ];
   });

   it("TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"
 ✓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md 2517ms
 ↓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  09:33:55
   Duration  4.02s (transform 715ms, setup 92ms, import 1.03s, tests 2.52s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/src/core/governedAssistantManifest.ts`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`
  1. Put `"catalog/worklog-entry.schema.md"` back into the governed file list of
     `packages/qfai/src/core/governedAssistantManifest.ts`. The asset file is restored with it:
     `buildShippedAssistantHashes` throws on a listed file it cannot read, and that throw is
     not an assertion failure. The recorded copy is then refreshed, not retired, and the selector must fail on `schema` and `record`.
  - The matrix row notes also name a mutation in `retireWithdrawnGovernedAssets`
    (`packages/qfai/src/cli/commands/init.ts`). That code is outside this row's
    `Owning module`, so it is not the planned proof.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:28:16Z) covers file hash `e4bd58e8…dba6`, and the RED ran on it after that PASS. The earlier REVISE on the file was cleared before any RED.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest (`e4bd58e8…dba6`) and the tree address, and both equal the recorded values. The production surface is unchanged: `init.ts` still calls `seedProjectSteering` and writes the work-log instructions line, and `governedAssistantManifest.ts` still lists the schema.
  - Strip: the diff reaches only `spec0003WithdrawnSchemaRetirement.test.ts` and this row `it`. The operands and the calls before each assertion are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries of the file skipped by the filter. The selector matches only its own `it`.
  - Observation: the gatekeeper re-ran the RED command. The line 108 read-proof passed (the lock still records other governed files). The failure is the assertion at line 116 inside the selector: the schema `exists` and its record is `a6841519…83da`, the shipped hash. `--force` refreshed the copy as stale instead of retiring it, which is the predicate.
  - Scope against TC-0003-0061 first bullet / EX-0003-0054 / BR-0003-0050: the recorded copy, built with the exported lock helpers (S1 D9), and one `toEqual` over `ENOENT` and no lock key. Nothing else is asserted.
  - Oracle proof plan: re-list the schema in `governedAssistantManifest.ts` with the asset restored. That is what this round (shared with spec-0004 TDD-0068) removes, and it names the GREEN command. Acceptable. At GREEN, the restored asset must be byte-equal to the shipped one, and the failure must be the line 116 assertion, not a load failure.

- Round 1: Revision: working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`
- Round 1: GREEN result: exit 0; actual verbose runner output after the Oracle restoration:

  ```text
  ✓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md 6986ms
  Test Files  1 passed (1)
  Tests  1 passed | 1 skipped (2)
  ```
- Round 1: Oracle proof: Restoring the shipped schema asset byte-equal from HEAD and its governedAssistantManifest entry made the selector fail at line 116: schema existed and the lock retained its shipped hash. The manifest was restored byte-equal to GREEN and the asset removed again. Mutant command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"; exit 1; AssertionError from this selected row.
- Round 1: Oracle proof command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`
- Round 1: Oracle proof result: exit 1; actual verbose runner output:

  ```text
  × |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md 5148ms
  AssertionError: expected { schema: 'exists', …(1) } to deeply equal { schema: 'ENOENT', record: null }

  - Expected
  + Received

    {
  -   "record": null,
  -   "schema": "ENOENT",
  +   "record": "a6841519155b38b55f7b904c3d3d05e00a25148c5689dc1b70bd8211cd5383da",
  +   "schema": "exists",
    }

   ❯ tests/integration/spec0003WithdrawnSchemaRetirement.test.ts:116:8
  Test Files  1 failed (1)
  Tests  1 failed | 1 skipped (2)
  ```
- Round 1: Restored GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`
- Round 1: Restored GREEN result: exit 0; actual verbose runner output is in Round 1 GREEN result above.
- Round 1: Restoration check: `governedAssistantManifest.ts` SHA-256 equals the pinned GREEN copy `44FC26EA0C0A132C5043792E2D6B50FAA25B7D98FD872EAE1A84CC893F561433`; the schema asset is absent.
- Phase: Refactor: no further production change for this row.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 185 passed (185); Duration 260.74s in tmp/spec0003-near-post-replacement.log. The corrected row selector passed after Oracle restoration (Test Files 1 passed; Tests 1 passed; see replacement or shared-artifact re-verify and restored GREEN records). The first concurrent near-suite attempt timed out in one test; its selector passed alone, and the complete suite later passed in isolated reruns.
- Refactor verify revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Refactor verify address check: two captures before and two after the final near-suite rerun agreed.
- Ledger transition times: red → green at 2026-09-24T09:54:57.767Z; green → refactor at 2026-09-24T10:17:40.842Z. The Codex parent host JSONL records both as completed ledger writes.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924110931270 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: a8db6296614d3e699147ab89546171af42b12867530fa9777095241b76696dc0
- Spec review: PASS
- Spec reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Spec audited evidence hash: bb8127989c5f773d344dfef95c68894e415e3b13f53e143766fa71d42aa82a1b
- Spec review pack: .qfai/review/review-20260924110931270 <!-- qfai:not-a-citation -->
- Spec review pack seal: a8db6296614d3e699147ab89546171af42b12867530fa9777095241b76696dc0
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Code quality audited evidence hash: bb8127989c5f773d344dfef95c68894e415e3b13f53e143766fa71d42aa82a1b
- Code quality review pack: .qfai/review/review-20260924110931270 <!-- qfai:not-a-citation -->
- Code quality review pack seal: a8db6296614d3e699147ab89546171af42b12867530fa9777095241b76696dc0
- Spec record re-attestation: fc7314fcc7737bab612ed72e8ad52a04d4d3ee7513b2e9ceb504a490a695ea74
- Spec record re-attestation pack: .qfai/review/review-20260924170316656 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: e83d779a5772c83d80b8f7b37e66cd5c61aea223fb1f948b16d2625902ffdd4e
- Code quality record re-attestation: fc7314fcc7737bab612ed72e8ad52a04d4d3ee7513b2e9ceb504a490a695ea74
- Code quality record re-attestation pack: .qfai/review/review-20260924170316656 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: e83d779a5772c83d80b8f7b37e66cd5c61aea223fb1f948b16d2625902ffdd4e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Checkpoint verification result: PASS — corrected selector: Test Files 1 passed (1), Tests 1 passed; near suite: Test Files 3 passed (3), Tests 185 passed (185), duration 260.74s; no per-item full-suite boundary was reached.
- Checkpoint verification revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification seal: b00d3620cb12e80302a41178209e5411a0046870d3a285fbdec910dfc603f9c3

### TDD-0099

- TDD-ID: TDD-0099
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts
- Selector: TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it
- TC-ref: TC-0003-0061
- Boundary: `edited-copy-kept-with-note`
- EX-ref: EX-0003-0054; AC-ref: AC-0003-0039; BR-ref: BR-0003-0050 (`Contract-Refs: CLI-INIT`)
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and implements the predicate wrongly: the release still ships `catalog/worklog-entry.schema.md` (`packages/qfai/src/core/governedAssistantManifest.ts` and the asset under `packages/qfai/assets/init/.qfai/assistant/catalog/`), so `init --force` treats a recorded copy as a governed file to refresh, never as a withdrawn one to retire. No seam is needed: the test imports only functions that exist.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture (S1 D9): as `TDD-0098`, in its own directory, then the file is overwritten with an
  edited literal, so it no longer matches its record. Then `runInit` with `--force`, its
  stdout captured.
- Oracle (S1 D10):
  - read-proof (S1 D5): exactly one captured line starts `qfai init: dest=`;
  - one `toEqual`: the file's content equals the edited literal, and at least one report
    line carries `NOTE:`, a normalised path ending `catalog/worklog-entry.schema.md`, "no
    longer shipped", "content has been edited" and "was not removed". The generic
    diverged-file note does not match.
- Expected RED, from reading the code before the run (the RED below matches it): the file is kept, as a local
  fork, so its content matches; no withdrawn-asset note is printed, so `noted` is `false`.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-24T00:23:35Z
  - Reviewed: test hash `204bc910…02f3d1`, at tree `working-tree+e5d63a1b…184502`,
    the single selector entry above, and the Round 1 plan below. No RED had
    been run.
  - Reason, an assertion the TC does not ask for: the `toEqual` requires
    `notes: 1`, meaning exactly one matching note line. TC-0003-0061 and
    EX-0003-0054 require that the report "carries the note". S1 D10 settles
    which parts must share one line, not how many such lines there are.
    Uniqueness is a second property that can fail on its own: a note printed
    twice fails this row while the file and the note are both correct.
    `TDD-0068` in spec-0004 was approved with `toContain` for the same reason.
  - What holds:
    - The rest of the TC-0003-0061 second bullet: the edited file compared
      byte for byte with the edited literal, and the D10 note parts on one
      line.
    - The `qfai init: dest=` read-proof is legitimate (S1 D5).
    - One boundary: `edited-copy-kept-with-note`, with both halves in one
      `toEqual`.
    - The Oracle proof mutation fails on the note half.
  - To clear:
    1. Assert that at least one matching note line exists, for example
       `noted: notes.length > 0` against `noted: true`, keeping the content
       half in the same `toEqual`.
    2. Record the new file hash and resubmit it for scope approval before any
       RED is run. The hash covers the whole file, so the resubmission covers
       `TDD-0098` too.
- Scope approval (`delivery-planner`), on file hash `e4bd58e8692da03895a68ab4691267d960e20652e83efbb7dd6cddfb8eadfba6`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:28:16Z
  - Covers: file hash `e4bd58e8692da03895a68ab4691267d960e20652e83efbb7dd6cddfb8eadfba6`, at tree `working-tree+e7f06398…f9db7`, and the single selector entry above,
    which is unchanged. No RED had been run. If the test file, a manifest entry
    or the selector changes, this approval lapses.
  - Reason: the REVISE is cleared. The `toEqual` now takes
    `noted: notes.length > 0` against `noted: true`, beside the unchanged
    content half. At least one line carrying every S1 D10 part is required,
    and uniqueness is no longer asserted.
  - The rest is unchanged from the earlier verdict: the content compared with
    the edited literal, the `dest=` read-proof, one boundary, and the
    governed-list mutation failing on the note half.
  - The note is read from stdout only, and that is not a scope gap. In
    `cli/lib/logger.ts` only `error` writes to stderr, and a note is printed
    through `info`, which writes to stdout. A presence check cannot miss a
    note that stdout carries.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is
  the asset-withdrawal round, which also satisfies spec-0004 `TDD-0068`.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the
    row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0003.md#tdd-0099`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7
- Round 1: RED test hash: b99314b92e448eed6dc213c87316799021d60f8b9f31ebc6900691bf1f56a347
  (lstat-mode form `e4bd58e8692da03895a68ab4691267d960e20652e83efbb7dd6cddfb8eadfba6`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T00:33:31.947Z after the scope PASS at
  2026-09-24T00:28:16Z. Before the run both file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`,
  with the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071` and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the
  file skipped by the filter.
  The read control at line 125 passed: one captured line starts `qfai init: dest=`.
  The failure is the assertion at line 138, inside the selector: the file's content
  equals the edited literal, and `noted` is `false`, because no report line carries
  the withdrawn-asset note. The copy is kept as a fork of a shipped file.
  Vitest's report follows verbatim; the lines `runInit` printed are captured by the
  test and do not reach it.

```text
 ↓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md
 × |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it 2299ms
   → expected { …(2) } to deeply equal { …(2) }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it
AssertionError: expected { …(2) } to deeply equal { …(2) }

- Expected
+ Received

@@ -3,7 +3,7 @@

  Every entry under `.qfai/steering/` carries `id`, `kind`, `status`, `created` and `updated`.

  Project rule: entries older than one release are archived.
  ",
-   "noted": true,
+   "noted": false,
  }

 ❯ tests/integration/spec0003WithdrawnSchemaRetirement.test.ts:138:83
    136|         line.includes("was not removed"),
    137|     );
    138|     expect({ content: await readFile(schema, "utf-8"), noted: notes.le…
       |                                                                                   ^
    139|       content: EDITED_TEXT,
    140|       noted: true,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
   Start at  09:33:35
   Duration  3.89s (transform 704ms, setup 76ms, import 989ms, tests 2.30s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it`
  neutralised as below, their operands kept, and no other `it` touched. The RED command
  was re-run unchanged, exit 0, and the verbose reporter shows this selector executed
  and passed. The test was restored at once: it compared byte-equal to the copy taken
  before the strip, the file hash recomputed to the approved value, the tree address
  returned to the RED revision, and no temporary tree was left behind.

```diff
@@ -122,10 +122,11 @@ describe("TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kep

     const report = await init(root, true);

-    expect(
+    void [
       report.filter((line) => line.startsWith("qfai init: dest=")),
       "the captured report is the one init printed",
-    ).toHaveLength(1);
+      expect,
+    ];

     const notes = report.filter(
       (line) =>
@@ -135,9 +136,9 @@ describe("TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kep
         line.includes("content has been edited") &&
         line.includes("was not removed"),
     );
-    expect({ content: await readFile(schema, "utf-8"), noted: notes.length > 0 }).toEqual({
-      content: EDITED_TEXT,
-      noted: true,
-    });
+    void [
+      { content: await readFile(schema, "utf-8"), noted: notes.length > 0 },
+      { content: EDITED_TEXT, noted: true },
+    ];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"
 ↓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md
 ✓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it 3568ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  09:34:16
   Duration  4.75s (transform 582ms, setup 84ms, import 826ms, tests 3.57s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/src/core/governedAssistantManifest.ts`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`
  1. Put `"catalog/worklog-entry.schema.md"` back into the governed file list of
     `packages/qfai/src/core/governedAssistantManifest.ts`. The asset file is restored with it:
     `buildShippedAssistantHashes` throws on a listed file it cannot read, and that throw is
     not an assertion failure. The edited copy is then a fork of a shipped file, no withdrawn-asset note is printed, and the selector must fail on `noted`.
  - The matrix row notes also name a mutation in `retireWithdrawnGovernedAssets`
    (`packages/qfai/src/cli/commands/init.ts`). That code is outside this row's
    `Owning module`, so it is not the planned proof.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+e7f063989c13a35635841114d27e95a686c922f88fc91870f21976c3e12f9db7 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:28:16Z) covers file hash `e4bd58e8…dba6`, and the RED ran on it after that PASS. The earlier REVISE on the file was cleared before any RED.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest (`e4bd58e8…dba6`) and the tree address, and both equal the recorded values. The production surface is unchanged: `init.ts` still calls `seedProjectSteering` and writes the work-log instructions line, and `governedAssistantManifest.ts` still lists the schema.
  - Strip: the diff reaches only `spec0003WithdrawnSchemaRetirement.test.ts` and this row `it`. The operands and the calls before each assertion are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries of the file skipped by the filter. The selector matches only its own `it`.
  - Observation: the gatekeeper re-ran the RED command. The line 125 `dest=` read-proof passed. The failure is the assertion at line 138 inside the selector: the content equals the edited literal, and `noted` is `false`. No report line carries the S1 D10 withdrawn-asset note, because the copy is kept as a fork of a still-shipped file. That is the predicate.
  - Scope against TC-0003-0061 second bullet: the content, plus at least one line with every S1 D10 part (uniqueness removed by the REVISE). The note is read from stdout, where `info` writes. Nothing else is asserted.
  - Oracle proof plan: the same re-listing mutation, failing on `noted`. Acceptable, with the same GREEN conditions as TDD-0098.

- Round 1: Revision: working-tree+3237ae8c58b3d2644825a25b85e0b05868ce24ed4fe41a3ae6f69ac9a4788edb
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`
- Round 1: GREEN result: exit 0; actual verbose runner output after the Oracle restoration:

  ```text
  ✓ |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it 5748ms
  Test Files  1 passed (1)
  Tests  1 passed | 1 skipped (2)
  ```
- Round 1: Oracle proof: The same temporary schema asset and governedAssistantManifest restoration made the selector fail at line 138: edited content remained but the withdrawn-asset note was absent. The manifest was restored byte-equal to GREEN and the asset removed again. Mutant command: cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"; exit 1; AssertionError from this selected row.
- Round 1: Oracle proof command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`
- Round 1: Oracle proof result: exit 1; actual verbose runner output:

  ```text
  × |integration| tests/integration/spec0003WithdrawnSchemaRetirement.test.ts > TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept > TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it 7432ms
  AssertionError: expected { …(2) } to deeply equal { …(2) }

  - Expected
  + Received

  @@ -3,7 +3,7 @@

    Every entry under `.qfai/steering/` carries `id`, `kind`, `status`, `created` and `updated`.

    Project rule: entries older than one release are archived.
    ",
  -   "noted": true,
  +   "noted": false,
    }

   ❯ tests/integration/spec0003WithdrawnSchemaRetirement.test.ts:138:83
  Test Files  1 failed (1)
  Tests  1 failed | 1 skipped (2)
  ```
- Round 1: Restored GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`
- Round 1: Restored GREEN result: exit 0; actual verbose runner output is in Round 1 GREEN result above.
- Round 1: Restoration check: `governedAssistantManifest.ts` SHA-256 equals the pinned GREEN copy `44FC26EA0C0A132C5043792E2D6B50FAA25B7D98FD872EAE1A84CC893F561433`; the schema asset is absent.
- Phase: Refactor: no further production change for this row.
- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 185 passed (185); Duration 260.74s in tmp/spec0003-near-post-replacement.log. The corrected row selector passed after Oracle restoration (Test Files 1 passed; Tests 1 passed; see replacement or shared-artifact re-verify and restored GREEN records). The first concurrent near-suite attempt timed out in one test; its selector passed alone, and the complete suite later passed in isolated reruns.
- Refactor verify revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Refactor verify address check: two captures before and two after the final near-suite rerun agreed.
- Ledger transition times: red → green at 2026-09-24T09:55:09.463Z; green → refactor at 2026-09-24T10:17:49.436Z. The Codex parent host JSONL records both as completed ledger writes.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924110931271 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 6a4c9df3c43abd60813621a256f85b39bb340461f45f469d14bdb6438a6514e2
- Spec review: PASS
- Spec reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Spec audited evidence hash: 71c633cc49841d9ca65732299b59556728873e5d7c6b64c31f01745b031b9d06
- Spec review pack: .qfai/review/review-20260924110931271 <!-- qfai:not-a-citation -->
- Spec review pack seal: 6a4c9df3c43abd60813621a256f85b39bb340461f45f469d14bdb6438a6514e2
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Code quality audited evidence hash: 71c633cc49841d9ca65732299b59556728873e5d7c6b64c31f01745b031b9d06
- Code quality review pack: .qfai/review/review-20260924110931271 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 6a4c9df3c43abd60813621a256f85b39bb340461f45f469d14bdb6438a6514e2
- Spec record re-attestation: d9205a74c005ef11d28e92a992119f148283bfc4c01de898bebe014a608ed3d4
- Spec record re-attestation pack: .qfai/review/review-20260924170316667 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: dc98673c0ace46b209b2ccb5822e80a052929a90fc9e8ce2aac6e8ab1b4a85ba
- Code quality record re-attestation: d9205a74c005ef11d28e92a992119f148283bfc4c01de898bebe014a608ed3d4
- Code quality record re-attestation pack: .qfai/review/review-20260924170316667 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: dc98673c0ace46b209b2ccb5822e80a052929a90fc9e8ce2aac6e8ab1b4a85ba
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0003WithdrawnSchemaRetirement.test.ts --reporter=verbose -t "TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it"`; then `cd packages/qfai && npx vitest run tests/integration/initSpec0003.test.ts tests/cli/initGitignoreMigration.test.ts tests/cli/init.test.ts --reporter=dot`
- Checkpoint verification result: PASS — corrected selector: Test Files 1 passed (1), Tests 1 passed; near suite: Test Files 3 passed (3), Tests 185 passed (185), duration 260.74s; no per-item full-suite boundary was reached.
- Checkpoint verification revision: working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9
- Checkpoint verification seal: 35610d6816bfe23acaf8ca89683db9a10730431b1ace850580ac71b4adcdf66d

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0003.md` (committed). Totals: ✅ 238 / ⚠️ 130 / ❌ 176, with 365 not applicable, across 909 scored cells.

For the /qfai-atdd run 2026-09-23T19:33:24.738Z: the rows this change added were scored under
`## Rows added by the work-log surface removal` in the same file. `CR-20260925-0010` withdrew
them, so that section scores no row: ✅ 0 / ⚠️ 0 / ❌ 0, `n/a` 0, across 0 scored cells. The
totals above are unchanged.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | acceptance-test-engineer | acceptance-test-engineer | Move the four cases and annotate the three test cases | CR-20260923-0003 | the files under Work performed | PASS |
| 2 | test-design-analyst | test-design-analyst | Score every obligation of the pack | 02_User-stories.md, 06_Test-Cases.md, 04_Business-Rules.md | .qfai/evidence/coverage-depth-spec-0003.md | PASS |
| 3 | acceptance-test-engineer | acceptance-test-engineer | grilling(S1@2026-09-23T03:14:36.552Z/agents): the four cases move into one integration module with a shared helper | test-layers.md | the new module and helper; the alternative, a copy of the set-up in each file, would drift | PASS |
| 4 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0058 RED phase gate on the falsifiability mutation run | #tdd-0058 | RED test manifest listed the Test file alone; list its test-owned import closure | REVISE |
| 5 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0058 RED phase gate on the falsifiability mutation run | #tdd-0058 | #tdd-0058 Round 1 | PASS |
| 6 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0058 build-phase GREEN + oracle proof | #tdd-0058 | #tdd-0058 Round 1 | PASS |
| 7 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0059 RED phase gate on the falsifiability mutation run | #tdd-0059 | #tdd-0059 Round 1 | PASS |
| 8 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0059 build-phase GREEN + oracle proof | #tdd-0059 | #tdd-0059 Round 1 | PASS |
| 9 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0060 RED phase gate on the falsifiability mutation run | #tdd-0060 | #tdd-0060 Round 1 | PASS |
| 10 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0060 build-phase GREEN + oracle proof | #tdd-0060 | #tdd-0060 Round 1 | PASS |
| 11 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0061 RED phase gate on the falsifiability mutation run | #tdd-0061 | #tdd-0061 Round 1 | PASS |
| 12 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0061 build-phase GREEN + oracle proof | #tdd-0061 | #tdd-0061 Round 1 | PASS |
| 13 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0062 RED phase gate on the falsifiability mutation run | #tdd-0062 | #tdd-0062 Round 1 | PASS |
| 14 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0062 build-phase GREEN + oracle proof | #tdd-0062 | #tdd-0062 Round 1 | PASS |
| 15 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0063 RED phase gate on the falsifiability mutation run | #tdd-0063 | #tdd-0063 Round 1 | PASS |
| 16 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0063 build-phase GREEN + oracle proof | #tdd-0063 | #tdd-0063 Round 1 | PASS |
| 17 | qa-gatekeeper | qa-gatekeeper | grilling(S1@2026-09-23T03:29:00.000Z/agents): a predicate in the row's own Test file is broken by a temporary, reverted mutation of that checker, with the RED test hash taken over the unmutated manifest | #tdd-0063, #tdd-0092 | the case plants its own broken copy, so no shipped file can fail it; the alternative, the test's owner taking the run, was not adopted because the owner named this mutation in its handover. The skill gap is filed as an issue | PASS |
| 18 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0092 RED phase gate on the falsifiability mutation run | #tdd-0092 | #tdd-0092 Round 1 | PASS |
| 19 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0092 build-phase GREEN + oracle proof | #tdd-0092 | #tdd-0092 Round 1 | PASS |
| 20 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0058 to TDD-0063 and TDD-0092, attempt 1 | #tdd-0058 … #tdd-0092 | one response per row in that row's review pack | PASS |
| 21 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0058 to TDD-0063 and TDD-0092, attempt 1 | #tdd-0058 … #tdd-0092 | PASS on TDD-0062, TDD-0063 and TDD-0092; REVISE on TDD-0058 to TDD-0061: the shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers | REVISE |
| 22 | implementation-reviewer | implementation-reviewer | grilling(S2@2026-09-23T03:29:00.000Z/agents): answer the REVISE by keeping the set-up local to each of the two files and deleting the helper | #tdd-0058 … #tdd-0061 | the alternative, a third consumer in spec0017LayeredCiScaffoldE2E.test.ts, was not adopted: it edits another spec's test file and reopens its completed rows | PASS |
| 23 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd review-fix handback: inline the helper, replace the RED test hash and manifest, mark the proof stale | #tdd-0058 … #tdd-0061 | the two test files; Round 1 RED test replacement lines | PASS |
| 24 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0058 re-taken falsifiability proof under the corrected test | #tdd-0058 | Round 1 Replacement proof fields | PASS |
| 25 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0059 re-taken falsifiability proof under the corrected test | #tdd-0059 | Round 1 Replacement proof fields | PASS |
| 26 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0060 re-taken falsifiability proof under the corrected test | #tdd-0060 | Round 1 Replacement proof fields | PASS |
| 27 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0061 re-taken falsifiability proof under the corrected test | #tdd-0061 | Round 1 Replacement proof fields | PASS |
| 28 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: build-phase GREEN on the restored tree for TDD-0058 to TDD-0061 | #tdd-0058 … #tdd-0061 | Round 1 Revision, GREEN and Refactor verify fields | PASS |
| 29 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0058 to TDD-0061, attempt 2 | #tdd-0058 … #tdd-0061 | one response per row in that row's attempt-2 review pack | PASS |
| 30 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0058 to TDD-0061, attempt 2 | #tdd-0058 … #tdd-0061 | one response per row in that row's attempt-2 review pack | PASS |
| 31 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0061, the row's Test file and the full suite | #tdd-0061 | Checkpoint verification fields | PASS |
| 32 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: write the TDD-0093 case for TC-0003-0058 verify bullet 5 and hand the row over on the falsifiability path | CR-20260923-0007 | packages/qfai/tests/integration/shippedWorkflowPortability.test.ts; #tdd-0093 | PASS |
| 33 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: shared-artifact re-verify of TDD-0062, TDD-0063 and TDD-0092 under the edited Test file | #tdd-0062, #tdd-0063, #tdd-0092 | #tdd-0093 Shared-artifact re-verify; each selector passes | PASS |
| 34 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: mutation-only request to /qfai-implement for the proofs of TDD-0062, TDD-0063 and TDD-0092, and the falsifiability run of TDD-0093 | #tdd-0093 | the Proof and Restored GREEN fields of #tdd-0093 and its Round 1 block, filled by the /qfai-implement run | PASS |
| 35 | - | n/a | grilling(-@2026-09-23T08:31:57.000Z/none): none | - | - | PASS |
| 36 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: shared-artifact proofs of TDD-0062, TDD-0063 and TDD-0092 under the edited test file | #tdd-0093 | the three re-verify subsections | PASS |
| 37 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0093 RED phase gate on the falsifiability mutation run | #tdd-0093 | the second-step case had no run showing it fails | REVISE |
| 38 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0093 RED phase gate on the two-clause mutation run | #tdd-0093 | Round 1 | PASS |
| 39 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0093 build-phase GREEN + oracle proof | #tdd-0093 | Round 1 | PASS |
| 40 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0093, attempt 1 | #tdd-0093 | one response in the row's pack | PASS |
| 41 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0093, attempt 1 | #tdd-0093 | one response in the row's pack | PASS |
| 42 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0093, its Test file and the full suite | #tdd-0093 | Checkpoint verification fields | PASS |
| 43 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: rename the TDD-0037 describe and count case to the counts the case asserts, record the new RED test hash and mark the proof stale | CR-20260923-0011 | packages/qfai/tests/integration/shippedWorkflowInertness.test.ts; #tdd-0037 | PASS |
| 44 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: shared-artifact re-verify under the renamed titles | #tdd-0037 | #tdd-0037 Shared-artifact re-verify: no RED test manifest names the file; the TDD-0036 selector passes | PASS |
| 45 | acceptance-test-engineer | acceptance-test-engineer | grilling(S1@2026-09-23T11:24:46.722Z/agents): TDD-0001's test is the row's own case in tests/integration/initSpec0003.test.ts, rewritten to run init and assert the clause, not either test CR-20260923-0011 names | CR-20260923-0011; 06_Test-Cases.md TC-0003-0001; .qfai/assistant/catalog/test-layers.md | #tdd-0001; TC-0003-0001 declares Level integration, so its home is tests/integration/**, where initE2E.test.ts is not and where QFAI-ATDD-122 keeps its annotation out of tests/e2e/**; tests/cli/init.test.ts is in no layer directory and asserts only that no file is written. Disagreeing position: the work order asked for one of the two named tests to be picked | PASS |
| 46 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: write the TDD-0001 case and hand the row over on the falsifiability path, with a reverted trial of the mutation | CR-20260923-0011 | packages/qfai/tests/integration/initSpec0003.test.ts; #tdd-0001 | PASS |
| 47 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: shared-artifact re-verify of TDD-0025 under the edited Test file | #tdd-0001 | #tdd-0001 Shared-artifact re-verify; the selector passes | PASS |
| 48 | completion-reviewer | - | /qfai-atdd: completion review of TDD-0001 and TDD-0037 | #tdd-0001, #tdd-0037 | not run in this invocation; the /qfai-implement run took it at row 61 | PASS |
| 49 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: add the TC-0003-0001 verify bullet 3 assertion to the TDD-0001 case, re-take the mutation trial and the RED test hash | #tdd-0001 | packages/qfai/tests/integration/initSpec0003.test.ts; #tdd-0001 | PASS |
| 50 | backend-engineer | backend-engineer | /qfai-implement: TDD-0001 falsifiability run with an empty `specs/.gitkeep` added to the shipped `.qfai/` tree | #tdd-0001 | #tdd-0001 Round 1 falsifiability fields | PASS |
| 51 | backend-engineer | backend-engineer | /qfai-implement: TDD-0001 restored GREEN and whole-file Refactor verify | #tdd-0001 | #tdd-0001 Round 1 GREEN and Refactor verify fields | PASS |
| 52 | backend-engineer | backend-engineer | grilling(S1@2026-09-23T11:42:45.972Z/agents): TDD-0037 stays at done, and re-taking its proof waits for a Change Request that names the row | execution-ledger.md allowed transitions; change-request-reset.md; CR-20260923-0011 approved action 2 | done leaves only by the upstream reset, which change-request-reset.md refuses for a row the CR's approved actions do not name, and CR-20260923-0011 names TDD-0001 and says no other row. Disagreeing position: the work order asked to bring the row to refactor | PASS |
| 53 | backend-engineer | backend-engineer | /qfai-implement: TDD-0037 Selector copied from the handback into the ledger | #tdd-0037; CR-20260923-0011 | test-list.md row 37 Selector, which CR-20260923-0011 says follows the rename | PASS |
| 54 | orchestrator | orchestrator | /qfai-implement: raise CR-20260923-0013 so TDD-0037 is reset and its proof re-taken on the renamed test; this replaces the outcome of row 52 | #tdd-0037; change-request-reset.md | CR-20260923-0013; test-list.md row 37 at todo with the record in DR-ID | PASS |
| 55 | backend-engineer | backend-engineer | /qfai-implement: TDD-0037 falsifiability run with a secret reference planted in the shipped `qfai-tests.yml`, and a second run with an install step on its detection job | #tdd-0037 | #tdd-0037 Round 1 falsifiability fields | PASS |
| 56 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0001 RED phase gate on the falsifiability mutation run | #tdd-0001 | #tdd-0001 Round 1 | PASS |
| 57 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0037 RED phase gate on the falsifiability mutation run and the TDD-0036 re-verify | #tdd-0037 | #tdd-0037 Round 1 | PASS |
| 58 | backend-engineer | backend-engineer | /qfai-implement: TDD-0037 restored GREEN and whole-file Refactor verify, and the TDD-0001 Refactor verify re-run on the reviewed tree | #tdd-0001, #tdd-0037 | the GREEN and Refactor verify fields of both entries | PASS |
| 59 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0001 build-phase GREEN + oracle proof | #tdd-0001 | #tdd-0001 Round 1 | PASS |
| 60 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0037 build-phase GREEN + oracle proof | #tdd-0037 | #tdd-0037 Round 1 | PASS |
| 61 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0001 and TDD-0037, attempt 1 | #tdd-0001, #tdd-0037 | one response per row in that row's review pack; its record advisories are queued in implement-spec-0003.md `## Record defects` | PASS |
| 62 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0001 and TDD-0037, attempt 1 | #tdd-0001, #tdd-0037 | one response per row in that row's review pack | PASS |
| 63 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0001 on its Test file and of TDD-0037 on the full suite | #tdd-0001, #tdd-0037 | Checkpoint verification fields | PASS |

### Work-log removal run (2026-09-23T19:33:24.738Z)

The step numbers in this table belong to this run. The preceding table's
steps 43–63 belong to the earlier continuation.

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 43 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Fix EX-0004-0044 / BR-0004-0035 (and AC-0004-0041, TC-0004-0076) through CR-20260923-0011 | `spec-0004/05_Examples.md`, `04_Business-Rules.md` | `CR-20260923-0011` (applied); the example gave a passing `Blocked-By` the kept `TDDLIST_BLOCKED_MISSING_REF` check rejects, and changing settled input is the user's to approve | PASS |
| 44 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Per-row P1c loop; a row a sibling's GREEN already satisfies moves to branch 2 with `Satisfied-by` naming that sibling; TDD-0070 is branch 2, re-classified right before handover, `Satisfied-by` naming `packages/qfai/src/core/validators/tddList.ts` and the kept `TDDLIST_BLOCKED_MISSING_REF` check | `.claude/skills/qfai-atdd/SKILL.md` P1c | Stage gate P1c requires one loop per row before the next RED; disagreeing position: the author (`atdd-preflight-tda`) recommended taking every RED first in one batch | PASS |
| 45 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Seven new integration files, one `it` per ledger row, annotations in the files, each added to `tsconfig.tests.json`, `runValidate` / `runInit` called in-process from `src`, not `initSpec0003.test.ts` | `spec0004ProfileSuffixedValidate.test.ts`, `packages/qfai/tsconfig.tests.json` | One `it` per row keeps each selector equal to its row; in-process `src` calls follow the existing spec-0004 suite and need no build; the include list is an enumeration. Amended by the griller from the author's proposal | PASS |
| 46 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): "Names `.qfai/steering/`" scans `file`, `relatedFiles[]`, `refs[]`, `message`, `suggested_action`, normalises `\` to `/`, and matches `.qfai/steering` followed by `/` or end of string | `packages/qfai/src/core/types.ts` `Issue` | A finding can name a path in any of those fields; Windows separators would hide a match; the boundary keeps `.qfai/assistant/steering/` from matching. Amended by the griller | PASS |
| 47 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Every absence oracle also shows the scanner under test read the fixture; a written report proves nothing | `06_Test-Cases.md` TC-0004-0074 … 0076 | An absence observed over a run that read nothing passes vacuously. Amended by the griller | PASS |
| 48 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0071 unreadable file: `chmod 000` on POSIX, `icacls <f> /deny *S-1-1-0:(R)` on win32 with the deny removed before cleanup; assert first that `readFile` rejects; record the host | `05_Examples.md` EX-0004-0044 | The fixture must be unreadable on both hosts, and asserting the rejection first keeps a no-op permission change from reading as a pass. Amended by the griller | PASS |
| 49 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Each `it` gets its own fixture; TDD-0097 runs plain init then `--force`, asserting after `--force` against the pre-run record | `spec-0004/07_Decisions.md` DR-0004-0037 | Each test builds its own tree, as DR-0004-0037 records; comparing against the pre-run record shows what `--force` changed | PASS |
| 50 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): After init, delete everything under `.qfai/steering/`, write exactly the EX-0003-0053 set, then record paths and hashes | `spec-0003/05_Examples.md` EX-0003-0053 | A tree holding exactly the example's set makes the preserved paths and hashes reproducible | PASS |
| 51 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Build lock records with the exported `hashAssistantAssetText`, `readAssistantAssetsLock`, `writeAssistantAssetsLock`; schema content an inline literal; TDD-0068 removes the lock record init writes | `packages/qfai/src/core/assistantAssetProvenance.ts` | Reuses the exported lock helpers rather than re-implementing the lock format; an inline literal keeps the test self-contained. Amended by the griller | PASS |
| 52 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0099 note oracle requires, on one report line, `NOTE:`, a normalised path ending `catalog/worklog-entry.schema.md`, "no longer shipped", "content has been edited", "was not removed" | `spec-0003/06_Test-Cases.md` | Pinning every part to one line fails a partial or split message. Amended by the griller | PASS |
| 53 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Text oracles: exact case-sensitive substrings for code tokens, case-insensitive for "work-log" / "work-log entry"; presence ties each record kind to its home inside the extracted unit; a row whose current text already passes is branch 2, never a reshaped oracle | `spec-0011/06_Test-Cases.md`, `spec-0013/06_Test-Cases.md` | Exact tokens avoid false passes, and prose casing varies; reshaping an oracle to force a failure is forbidden by the RED provenance rules. Amended by the griller | PASS |
| 54 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Retired annotations in acceptance-test territory (`validatorConvergenceIntegration.test.ts`, the root `tests/**/qfai-traceability.md` lines) are removed by `/qfai-implement` with the symbol removal, as the deltas say; record the ownership exception | `spec-0004/09_delta.md` | The deltas pair each annotation's removal with its symbol's, so one change removes both; the exception is recorded because those files are this stage's territory | PASS |
| 55 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): BR-0003-0009 floor cell goes to a Change Request, not satisfied this run; other carried ❌ cells cite one DR/CR per cluster; scoring only this change's TC rows is recorded as a decision | `.qfai/evidence/coverage-depth-spec-0003.md` | The refusal to write outside the project is a safety floor the matrix cannot waive; disagreeing position: the author (`atdd-preflight-tda`) recommended recording it as an open risk. Amended by the griller before it went to the user | PASS |
| 56 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Checkpoints (related suites, full suite at row 10 and the last row) run locally for this task | `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md` | Checkpoints need more than the new tests the local-run permission covered, so the user was asked. Superseded by the user's later AskUserQuestion answer (2026-09-23): the full suite runs on CI at the boundaries; the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check | PASS |
| 57 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0022 extracts the `blocked -> todo` bullet under `### Allowed transitions` in `execution-ledger.md`, up to the next top-level bullet, and asserts exactly one match | `spec-0011/06_Test-Cases.md` | A bounded extract with one match reads only the transition the row owns | PASS |
| 58 | delivery-planner | atdd-scope | Scope approval TDD-0094 | `### TDD-0094`; `spec0003InitWorklogSurface.test.ts` (test hash `7604ef12…6c7da1`); `spec-0003/06_Test-Cases.md` TC-0003-0059, `05_Examples.md` EX-0003-0052, BR-0003-0049; `cli/lib/logger.ts` | Scope REVISE. "The report names none" belongs to `no-steering-path`, as the TC's first bullet says. But only stdout is captured, and init's `error` lines go to stderr. Capture both streams and resubmit | REVISE |
| 59 | delivery-planner | atdd-scope | Scope approval TDD-0095 | `### TDD-0095`; `spec0003InitWorklogSurface.test.ts` (test hash `7604ef12…6c7da1`); TC-0003-0059 second bullet; `buildCopilotInstructions` | Scope PASS. The whole second bullet under the S1 D11 oracle, one boundary, and a legitimate `## Golden rules` read-proof. To be re-confirmed on the file's new hash, with the `it` unchanged | PASS |
| 60 | delivery-planner | atdd-scope | Scope approval TDD-0096 | `### TDD-0096`; `spec0003InitWorklogSurface.test.ts` (test hash `7604ef12…6c7da1`); TC-0003-0060, EX-0003-0053, BR-0003-0049 | Scope REVISE. The TC compares the path set, but `snapshot` records files only, so a created empty directory passes. Record every entry, with directories by kind, and resubmit | REVISE |
| 61 | delivery-planner | atdd-scope | Scope approval TDD-0097 | `### TDD-0097`; `spec0003InitWorklogSurface.test.ts` (test hash `7604ef12…6c7da1`); TC-0003-0060 Action and second bullet; S1 D7 | Scope REVISE. Same `snapshot` gap. The only Oracle mutation is `TDD-0096`'s, so `force-init-byte-identical` is never shown apart from the plain run. Add a mutation in `runInit` that touches steering only under `--force`. Advisory to `qa-gatekeeper`: the RED will probably show the plain run's seeding | REVISE |
| 62 | delivery-planner | atdd-scope | Scope approval TDD-0098 | `### TDD-0098`; `spec0003WithdrawnSchemaRetirement.test.ts` (test hash `204bc910…02f3d1`); TC-0003-0061 first bullet, EX-0003-0054, BR-0003-0050 | Scope PASS. File gone and no lock key, in one `toEqual`, one boundary, and a legitimate read-proof on a non-empty lock. To be re-confirmed on the file's new hash, with the `it` unchanged | PASS |
| 63 | delivery-planner | atdd-scope | Scope approval TDD-0099 | `### TDD-0099`; `spec0003WithdrawnSchemaRetirement.test.ts` (test hash `204bc910…02f3d1`); TC-0003-0061 second bullet, EX-0003-0054, S1 D10 | Scope REVISE. `notes: 1` asserts uniqueness, which the TC does not ask ("carries the note"). Assert at least one matching line and resubmit | REVISE |
| 64 | delivery-planner | atdd-scope | Scope approval TDD-0094 (resubmission) | `### TDD-0094`; `spec0003InitWorklogSurface.test.ts` (hash `e706e39a…796a9f`); step 58 REVISE | Scope PASS. stdout and stderr are both captured, and the path check reads both streams. The `dest=` read-proof stays on stdout. Otherwise unchanged | PASS |
| 65 | delivery-planner | atdd-scope | Scope approval TDD-0095 (resubmission) | `### TDD-0095`; same file and hash; step 59 PASS | Scope PASS re-confirmed. The `it` body is unchanged. Advisory: the local `lines` shadows the new module-level helper | PASS |
| 66 | delivery-planner | atdd-scope | Scope approval TDD-0096 (resubmission) | `### TDD-0096`; same file and hash; step 60 REVISE | Scope PASS. `snapshot` records every entry, files by SHA-256 and others by kind, so the compared set is the TC's path set | PASS |
| 67 | delivery-planner | atdd-scope | Scope approval TDD-0097 (resubmission) | `### TDD-0097`; same file and hash; step 61 REVISE | Scope PASS. Shared `snapshot` fix. The only mutation is force-only seeding, under which this row fails and `TDD-0096` passes, both commands named. Replacing the unconditional mutation, not adding to it, is what was asked. The gatekeeper advisory on RED attribution stands | PASS |
| 68 | delivery-planner | atdd-scope | Scope approval TDD-0098 (resubmission) | `### TDD-0098`; `spec0003WithdrawnSchemaRetirement.test.ts` (hash `e4bd58e8…eadfba6`); step 62 PASS | Scope PASS re-confirmed. The `it` and its helpers are unchanged. The hash moved because of `TDD-0099`'s fix: this file still captures stdout only | PASS |
| 69 | delivery-planner | atdd-scope | Scope approval TDD-0099 (resubmission) | `### TDD-0099`; same file and hash; step 63 REVISE | Scope PASS. The note check is `notes.length > 0`, so uniqueness is no longer asserted. Stdout-only capture is sufficient because notes go through `info` | PASS |
| 70 | acceptance-test-engineer | atdd-ate | TDD-0094 test + RED | `spec-0003/06_Test-Cases.md`, `05_Examples.md`, `04_Business-Rules.md`; S1 D3-D5, D7-D11 | `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts` (RED test hash `e706e39a…796a9f`); approved RED and its stripped run at `working-tree+e7f06398…12f9db7` in `### TDD-0094` Round 1 | PASS |
| 71 | acceptance-test-engineer | atdd-ate | TDD-0095 test + RED | `spec-0003/06_Test-Cases.md`, `05_Examples.md`, `04_Business-Rules.md`; S1 D3-D5, D7-D11 | `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts` (RED test hash `e706e39a…796a9f`); approved RED and its stripped run at `working-tree+e7f06398…12f9db7` in `### TDD-0095` Round 1 | PASS |
| 72 | acceptance-test-engineer | atdd-ate | TDD-0096 test + RED | `spec-0003/06_Test-Cases.md`, `05_Examples.md`, `04_Business-Rules.md`; S1 D3-D5, D7-D11 | `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts` (RED test hash `e706e39a…796a9f`); approved RED and its stripped run at `working-tree+e7f06398…12f9db7` in `### TDD-0096` Round 1 | PASS |
| 73 | acceptance-test-engineer | atdd-ate | TDD-0097 test + RED | `spec-0003/06_Test-Cases.md`, `05_Examples.md`, `04_Business-Rules.md`; S1 D3-D5, D7-D11 | `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts` (RED test hash `e706e39a…796a9f`); approved RED and its stripped run at `working-tree+e7f06398…12f9db7` in `### TDD-0097` Round 1 | PASS |
| 74 | acceptance-test-engineer | atdd-ate | TDD-0098 test + RED | `spec-0003/06_Test-Cases.md`, `05_Examples.md`, `04_Business-Rules.md`; S1 D3-D5, D7-D11 | `packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts` (RED test hash `e4bd58e8…eadfba6`); approved RED and its stripped run at `working-tree+e7f06398…12f9db7` in `### TDD-0098` Round 1 | PASS |
| 75 | acceptance-test-engineer | atdd-ate | TDD-0099 test + RED | `spec-0003/06_Test-Cases.md`, `05_Examples.md`, `04_Business-Rules.md`; S1 D3-D5, D7-D11 | `packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts` (RED test hash `e4bd58e8…eadfba6`); approved RED and its stripped run at `working-tree+e7f06398…12f9db7` in `### TDD-0099` Round 1 | PASS |
| 76 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0094 | `### TDD-0094` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:28:16Z; RED revision working-tree+e7f06398… | PASS: RED reproduced at line 136: `.qfai/steering` exists and the report names `.gitkeep` and `_templates/entry.md`, after its read-proof; file hash and revision recomputed equal; strip valid | PASS |
| 77 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0095 | `### TDD-0095` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:28:16Z; RED revision working-tree+e7f06398… | PASS: RED reproduced at line 155: the AI work-log surface instructions line, after its read-proof; file hash and revision recomputed equal; strip valid | PASS |
| 78 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0096 | `### TDD-0096` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:28:16Z; RED revision working-tree+e7f06398… | PASS: RED reproduced at line 171: the plain run adds `.gitkeep`, `_templates`, `_templates/entry.md`, after its read-proof; file hash and revision recomputed equal; strip valid | PASS |
| 79 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0097 | `### TDD-0097` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:28:16Z; RED revision working-tree+e7f06398… | PASS: RED reproduced at line 186 after plain then `--force`; admissible (own predicate, the TC Action). Required at the build gate: the `--force`-only mutation fails this selector while the TDD-0096 selector passes, after its read-proof; file hash and revision recomputed equal; strip valid | PASS |
| 80 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0098 | `### TDD-0098` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:28:16Z; RED revision working-tree+e7f06398… | PASS: RED reproduced at line 116: the copy refreshed to the shipped hash, not retired, after its read-proof; file hash and revision recomputed equal; strip valid | PASS |
| 81 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0099 | `### TDD-0099` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:28:16Z; RED revision working-tree+e7f06398… | PASS: RED reproduced at line 138: no withdrawn-asset note (`noted: false`), after its read-proof; file hash and revision recomputed equal; strip valid | PASS |
| 82 | orchestrator | - | grilling(S2@2026-09-23T19:33:24.738Z/user): rows one GREEN satisfies take their REDs before that GREEN; GREENs and reviews stay per row | S1 D2; the stop-at-`refactor` decision | A shared GREEN would make a later row pass on its first run, and the sibling-satisfied branch needs the sibling `done`, which stop-at-`refactor` rules out. Refines S1 D2 (one row at a time) | PASS |
| 83 | discovery-analyst | spec0003_grill | grilling(S1@2026-09-24T08:22:12.576Z/agents): recover the original run key from the adjacent host clock event | Child host session JSONL ordinal 216 and the existing second-precision heading | Adopt `2026-09-24T08:22:12.576Z` as the original run key; keep RED and Oracle observations, record the on-detection decision and re-request reviews under the corrected key | PASS |
| 84 | backend-engineer | spec0003_impl | /qfai-implement: build and refactor TDD-0094 | `#tdd-0094`, TC-0003-0059, CLI-INIT | `#tdd-0094` GREEN, Oracle and Refactor verify at `working-tree+3237ae8c…9a4788edb` | PASS |
| 85 | backend-engineer | spec0003_impl | /qfai-implement: build and refactor TDD-0095 | `#tdd-0095`, TC-0003-0059, CLI-INIT | `#tdd-0095` GREEN, Oracle and Refactor verify at `working-tree+3237ae8c…9a4788edb` | PASS |
| 86 | backend-engineer | spec0003_impl | /qfai-implement: build and refactor TDD-0096 | `#tdd-0096`, TC-0003-0060, CLI-INIT | `#tdd-0096` GREEN, Oracle and Refactor verify at `working-tree+3237ae8c…9a4788edb` | PASS |
| 87 | backend-engineer | spec0003_impl | /qfai-implement: build and refactor TDD-0097 | `#tdd-0097`, TC-0003-0060, CLI-INIT | `#tdd-0097` GREEN, force-only Oracle and Refactor verify at `working-tree+3237ae8c…9a4788edb` | PASS |
| 88 | backend-engineer | spec0003_impl | /qfai-implement: build and refactor TDD-0098 | `#tdd-0098`, TC-0003-0061, CLI-INIT | `#tdd-0098` GREEN, Oracle and Refactor verify at `working-tree+3237ae8c…9a4788edb` | PASS |
| 89 | backend-engineer | spec0003_impl | /qfai-implement: build and refactor TDD-0099 | `#tdd-0099`, TC-0003-0061, CLI-INIT | `#tdd-0099` GREEN, Oracle and Refactor verify at `working-tree+3237ae8c…9a4788edb` | PASS |

## Cross-spec obligations

| Source rows | Dependent spec | Dependent row | Shared artifact | Change | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TDD-0094, TDD-0096, TDD-0097 | spec-0015 | TDD-0039 (`done`) | `packages/qfai/src/cli/commands/init.ts` | Remove the project work-log seed and its report folding | The TDD-0039 selector and the first full-suite checkpoint passed. | closed |

## Execution logs

Recorded per row under `## Ledger rows advanced`.

## Gaps / Open risks

- The matrix records 176 `❌` cells across the pack, each with its reason in
  `.qfai/evidence/coverage-depth-spec-0003.md`. This run took up only the rows
  `CR-20260923-0003` names.
- Five obligations are asserted in the opposite direction by the tests, because the
  product changed on purpose after the pack was written. They need a change request,
  not a test.
- The step runner, job reader and delivered tree are copied into several shipped-workflow
  test files, including the two this run touched. Extracting them edits test files other
  specs' completed rows name, so it is a separate change.
- The `TDD-0093` entry's `Mutation:` line names the single-clause edit its handover
  planned. The run it closed on removes both job-shape clauses, and Round 1 records both
  runs.
- The `TDD-0001` case asserts all three verify bullets of `TC-0003-0001`. Its one
  mutation breaks bullet 1; no mutation has been run against the bullet 2 and bullet 3
  assertions.
- No mutation has shown the `TDD-0037` count case's nine and eight instance counts
  fail. The planted secret fails the secret case, and the install step on the
  detection job fails the declaration list and the detection case.
- The `TDD-0037` entry's `Branch:` line, its paragraph on the ledger's `Selector` and
  its Round 1 `RED test replacement` and `Replacement proof` fields describe the row
  as it was before `CR-20260923-0013` reset it. The repair is queued in
  `.qfai/evidence/implement-spec-0003.md` under `## Record defects`.
- The comments inside the `TDD-0037` count case still speak of four and three installs.
  Only the titles were in scope.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

- `TDD-0094` … `TDD-0099`: REDs passed by `qa-gatekeeper` (RED phase) on the approved file
  hashes; handoffs ready. Each GREEN, with its reviews, follows per row.
- `TDD-0097`'s RED cannot tell whether the plain run or the `--force` run changed the
  directory; the plain run alone does on this tree. The planned Oracle proof, which seeds
  only under `--force`, is what shows the row checks the `--force` run.
- The `BR-0003-0009` safety-floor cell (S1 D13) is raised as `CR-20260924-0005` (open).
  spec-0003's ATDD is not PASS on that cell until it lands.
- Checkpoint departure (user decision, see Decisions made): no full-suite checkpoint runs
  per row. All rows' full-suite checkpoints close together on the final head's CI.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL for the spec-wide ATDD pack; the scoped rows named below and in the first full CI checkpoint are done. The other ATDD-owned rows and the open safety-floor change request remain.

The ten rows these runs took up are `done`: `TDD-0058` to `TDD-0063`, `TDD-0092`,
`TDD-0093`, `TDD-0001` and `TDD-0037`. `/qfai-implement` took each through the
falsifiability path, and `qa-gatekeeper`, `completion-reviewer` and
`implementation-reviewer` passed each one. `TDD-0061`, `TDD-0093` and `TDD-0037`
closed on the full suite.

## First full CI checkpoint

- Revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Run: https://github.com/aganesy/QFAI/actions/runs/36026684599
- Result: PASS — build, lint, types, all nine package test slices, Node floor tests, and ci-pass succeeded.
- Rows closed: TDD-0094, TDD-0095, TDD-0096, TDD-0097, TDD-0098, TDD-0099.
