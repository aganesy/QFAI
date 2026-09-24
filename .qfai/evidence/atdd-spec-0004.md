# ATDD Evidence: spec-0004

## Objective

Write the acceptance tests for the removal of QFAI's AI work-log surface
`.qfai/steering/` that spec-0004 owns: `TC-0004-0074`, `TC-0004-0075` and
`TC-0004-0076`, carried by the ledger rows `TDD-0067` … `TDD-0071`. Each row
gets its RED provenance here before `/qfai-implement` builds the change, one
row at a time.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0004/01_Spec.md` (`Status: active`), `02_User-stories.md`,
  `03_Acceptance-Criteria.md` (`AC-0004-0040`, `AC-0004-0041`),
  `04_Business-Rules.md` (`BR-0004-0034`, `BR-0004-0035`), `05_Examples.md`
  (`EX-0004-0042` … `EX-0004-0044`), `06_Test-Cases.md`, `07_Decisions.md`
  (`DR-0004-0037`), `09_delta.md`, `10_Plan.md`
- `.qfai/specs/spec-0004/tdd/test-list.md` — read, not written
- `.qfai/contracts/api/**`, `.qfai/contracts/db/**` — no contract exists;
  `BR-0004-0034` and `BR-0004-0035` bind `CLI-VAL`, a CLI contract that owes no
  `QFAI-ATDD-113` / `-115` coverage
- `qfai.config.yaml` — `paths.specsDir` `.qfai/specs`, `paths.contractsDir`
  `.qfai/contracts`, `paths.testsDir` `tests`
- `.qfai/assistant/catalog/test-layers.md#annotation-routing`
- `.qfai/assistant/catalog/tech.md#standard-commands-copy-paste`
- `.qfai/evidence/coverage-depth-spec-0004.md`, `.qfai/evidence/skeleton.md`
- `.qfai/decisions/CR-20260923-0011-spec-0004-passes-a-blocked-row-the-kept-check-fails.md`
- `packages/qfai/src/core/validate.ts`,
  `packages/qfai/src/core/validators/worklogSurface.ts`,
  `packages/qfai/src/core/worklogEntries.ts` — the surface the rows remove

## Decisions made (with rationale)

The preflight session S1 settled fifteen decisions. Each is a
`grilling(S1@2026-09-23T19:33:24.738Z/…)` row in the Work Orders Summary, with
its reason and any disagreeing position.

For `TDD-0067` the D5 read-proof is a content-derived control: the fixture
carries `.qfai/specs/spec-0001/01_Spec.md` with no `Status` bullet, and the test
requires exactly one `QFAI-STATUS-001` naming that path. Only a run that opened
that file of this tree can produce it, so an absence observed over a run that
read nothing cannot pass.

**Checkpoints close on the final head, by user decision.** Stage gate P1c takes
each branch-1 row through its checkpoint before the next row’s test is written.
This run departs from that. The change is green only at its head: its rows remove
one surface together, and a tree with some of them applied can fail suites the
others fix. So each row stops at `refactor`, after its RED, its GREEN, its reviews
and its local per-row checkpoint. The full-suite checkpoints of all rows run
together on the final head’s CI, and all rows go `done` together after that.

- Authority: the user’s answer to a structured question (AskUserQuestion),
  relayed by the orchestrator after `TDD-0067`. It is not an agent decision.
- Effect: a row at `refactor` does not block the next row’s test. The next row’s
  test is still written only after the previous row’s GREEN and reviews.
- Risk: until the final head’s CI, no full-suite run covers any row. That is
  recorded under Gaps / Open risks.

For `TDD-0069` the D5 read-proof is a control row in the same ledger. Its
`Blocked-By` names a blocker but no departure status, and the test requires
exactly one `TDDLIST_BLOCKED_MISSING_REF` naming that row. The check that must
accept the named row is the one that rejects the control, so silence on the
named row cannot come from a ledger nobody read. The control’s shape differs
from the empty cell `TDD-0070` owns.

**`TDD-0071` has its own test file.** S1 D3 listed one file for TC-0004-0076,
`spec0004BlockedRowNeedsOnlyBlockedBy.test.ts`, with one `it` per ledger row.
`TDD-0071` is instead in
`packages/qfai/tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts`,
added to `packages/qfai/tsconfig.tests.json`.

- Reason: `TDD-0069`'s RED test hash covers the whole of the first file, and
  `qa-gatekeeper` had already passed that RED. Adding an `it` to the file would
  change its bytes and void the hash. The hash was recomputed after the new file
  was added and is unchanged (`ddf4adda…dba10`).
- Who: the acceptance-test engineer (`atdd-ate`), applying the orchestrator's
  instruction for this case. `delivery-planner` recorded no scope objection to
  the separate file, and `qa-gatekeeper` advised recording it here.
- Not a grilling row: no session was opened for it, so it has no
  `grilling(<Session>@<run key>/…)` row in the Work Orders Summary, and S1's
  `Decisions` count stays 15. It is an authoring decision within this run.
- Effect on coverage: none. Both files carry `QFAI:SPEC-0004:TC-0004-0076` under
  `packages/qfai/tests/integration/**`, the directory the TC's Level routes to.

**`TDD-0068` has its own test file,** for the same reason. S1 D3 put
TC-0004-0074 and TC-0004-0075 in one file, `spec0004WorklogSurfaceRemoval.test.ts`.
`TDD-0068` is instead in
`packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts`, added to
`packages/qfai/tsconfig.tests.json`.

- Reason: `TDD-0067`'s RED test hash covers the whole of the first file, and
  `qa-gatekeeper` had passed that RED. An added `it` would void the hash.
- Who: the acceptance-test engineer (`atdd-ate`), on the orchestrator's
  instruction. Not a grilling row, for the reason given for `TDD-0071`.
- Effect on coverage: none. The new file carries `QFAI:SPEC-0004:TC-0004-0075`
  under `packages/qfai/tests/integration/**`.

**Rows sharing a GREEN take their REDs first (user, S2).** A refinement of S1 D2 (one row
at a time), adjudicated by the user through a structured question (AskUserQuestion) after
S1 had ended, so it is recorded as session S2 of this run rather than under S1.

- Decision: rows that one GREEN satisfies take their REDs before that GREEN. GREENs and
  reviews stay per row.
- Reason: after a shared GREEN, a later row would pass on its first run and have no RED
  left to observe. The sibling-satisfied branch would need the sibling `done`, which the
  stop-at-`refactor` decision rules out until the final head.
## Grilling Session

### /qfai-atdd — run started 2026-09-23T19:33:24.738Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T20:13:17.289Z | working-tree+ecbebad44db0972da88c2858d175f303772e80ba665e4a380c68ea3e59caf750 | 2026-09-23T20:18:34.935Z | preflight | empty | none in flight | 15 | 0 | 4 |
| S2 | adopted | 2026-09-24T00:43:09.001Z | working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 | 2026-09-24T00:43:37.959Z | whether rows one GREEN satisfies take their REDs before that GREEN | empty | none in flight | 1 | 0 | 1 |

Escalated S1: D1 — `EX-0004-0044` gives a passing `Blocked-By` the kept check rejects. User: fix the example and BR via a Change Request. Done as `CR-20260923-0011` (applied; spec-0004 DR-0004-0043, DL-0029). TDD-0069..0071 fixtures use `spec-0004:TDD-0001 — blocked at todo`.

Escalated S1: D2 — batch every RED first vs the P1c per-row loop. User: one row at a time (the P1c loop).

Escalated S1: D13 — the BR-0003-0009 negative (refusal to write outside the project) is a safety-floor ⚠️ that this change did not create. User: raise a Change Request to add that test; spec-0003's ATDD is reported not PASS on that cell until it lands.

Escalated S1: N1 — `/qfai-implement` checkpoints need the related suites and full-suite runs, beyond "only the new tests". User: run checkpoints locally too (this task only). Superseded by the user's later answer (AskUserQuestion, 2026-09-23): the full package suite runs on CI through a pushed draft PR at the boundaries, and the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check.

Escalated S2: D2-refinement — several rows are satisfied by one shared GREEN, so a later row would pass on its first run after that GREEN, and the sibling-satisfied branch needs the sibling `done`, which the stop-at-`refactor` decision rules out. User: take the REDs of rows sharing a GREEN before that GREEN; GREENs and reviews per row.

### /qfai-implement — run started 2026-09-23T21:11:02.206Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T21:17:21.288Z | working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494 | 2026-09-23T21:18:12.657Z | TDD-0067 GREEN scope | empty | none in flight | 10 | 0 | 0 |
| S2 | adopted | 2026-09-23T23:38:13.576Z | working-tree+818c7ff482f03603ef6bd7274df9467e1a343433f9e477c424d4f0db1ea53e6f | 2026-09-23T23:38:13.644Z | TDD-0069 GREEN scope | empty | none in flight | 10 | 0 | 0 |
| S3 | adopted | 2026-09-24T00:51:55.975Z | working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 | 2026-09-24T00:51:55.978Z | shared GREENs: asset withdrawal, init seed removal, copilot line | empty | none in flight | 12 | 0 | 0 |
| S4 | adopted | 2026-09-24T02:06:43.557Z | working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9 | 2026-09-24T02:06:43.560Z | TDD-0068 checkpoint failure: README citation | empty | none in flight | 5 | 0 | 0 |
| S5 | adopted | 2026-09-24T05:21:30.478Z | working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b | 2026-09-24T05:21:35Z | TDD-0018 / TDD-0072 unit rows: scope and TDD-0072 falsifiability ordering | empty | none in flight | 8 | 0 | 1 |

Note S5: writes that do not depend on Q6 ran while S5 was open with only Q6 pending, after D1–D7 were adopted: the creation of `.qfai/evidence/implement-spec-0004.md`, TDD-0018 `todo -> red` at 2026-09-24T05:20:43Z, and the rewrite of `packages/qfai/tests/validators/reviewerJustification.test.ts` at 2026-09-24T05:20:57Z, which rests on D2. No write that depends on Q6 (TDD-0072) came before the user's answer.

Escalated S5: Q6 — the order TDD-0072 runs in. No order closes on the single final-head CI run the user chose. DR-0004-0041 and DL-0027 start TDD-0072 only after TDD-0018 is `done`, and `done` waits for that CI run. TDD-0072's test cannot be written before it: its first run would pass with TDD-0018 at `refactor`, and `red-not-observable.md` then offers no lawful form, which is the `exception` DR-0004-0041 names. Written after it, the test moves the tree address that CI run covered. Ledger and evidence writes, and a mutation restored byte-for-byte, do not move the address; the new test does. So the author's option A needs a later tree and a second CI run. Option C is not offered: DL-0027 rejects a production path as `Satisfied-by` on a unit row, and `git log -S` shows the property came from spec-0004's own TDD-0015..0025 commit (75e53c184), so it is not state that no row created. Options for the user: (1, recommended) keep DR-0004-0041 and DL-0027. Every other row, TDD-0018 included, closes on the final CI run as decided. TDD-0072 then takes its cycle in its own test file, so TDD-0018's closed `Test file` is not edited, and it closes on a second CI run over that new head. That amends the run decision that all full-suite checkpoints close together, for this row only. (2) A Change Request amends DR-0004-0041, DL-0027 and `10_Plan.md` step 1 so that TDD-0072 cites TDD-0018 at `refactor`, takes its test in the same file now, and both close on the one CI run. That also departs from `red-not-observable.md`, which accepts "an earlier `done` sibling row", and no spec Change Request amends a shipped skill. Option 1 is recommended because it keeps every recorded spec decision and the skill as written, and costs one push and one CI run. User (AskUserQuestion, 2026-09-24): "2 回目の CI で閉じる (推奨)" ("close on a second CI (recommended)"), option 1: keep DR-0004-0041 and DL-0027 unchanged; every other row, TDD-0018 included, closes on the final CI as already decided; TDD-0072 then runs in a separate test file and closes on a second CI at the new head; the batch-close decision is relaxed for this row only.

## Work performed (what changed, where)

- `packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts` —
  new. Holds the `TDD-0067` case, annotated `QFAI:SPEC-0004:TC-0004-0074`.
  `TDD-0068` (`TC-0004-0075`) joins this file in its own loop.
- `packages/qfai/tsconfig.tests.json` — the new file added to `include`.

No production file was changed.

## Commands executed + key outputs

- Tree address, taken by the four-step procedure of
  `.qfai/assistant/skills/qfai-implement/references/evidence-revision.md`, run
  twice with equal results each time. `paths.specsDir` was resolved from
  `qfai.config.yaml` (`.qfai/specs`) rather than from `npx qfai doctor`: this
  repository does not install its own package.
  - At S1's end, before any test was written:
    `working-tree+ecbebad44db0972da88c2858d175f303772e80ba665e4a380c68ea3e59caf750`
  - At both `TDD-0067` REDs (the first and the approved one), and again after
    each assertion-stripped run was restored:
    `working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494`
- `node_modules/.bin/tsc -p packages/qfai/tsconfig.tests.json --noEmit` — exit 0,
  no diagnostic.
- `TDD-0067` RED and assertion-stripped runs: see `### TDD-0067`.

Host: Windows 11 (win32), Node.js v24.18.0. On this host `lstat` reports mode
`0666` for the tracked test files.

## Test volume estimate

| Layer       | Raw count | Signal | Evidence                                                                          | Notes                                                                                 |
| ----------- | --------: | -----: | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| E2E         |        14 |     27 | The 14 `US-0004-*` headings of `02_User-stories.md`, `US-0004-0001` … `US-0004-0039`; no `L5` TC | Surface opt-in is off project-wide, so every non-planned `US-*` is required; none is planned |
| API         |         0 |      0 | No `CON-API-*` referenced; no `L4` TC                                             | `CLI-VAL` is a CLI contract                                                           |
| Integration |        38 |     73 | 16 `integration`, 21 `validators`, 1 `ssot-guard` Level TCs; no `CON-DB-*`         | `validators` and `ssot-guard` name no layer and route to `tests/integration/**`; 5 `unit` TCs excluded |

`total` = 52. Signals are shares of that total in whole percent
(`references/volume-signals.md`), planning signals only.

## Coverage obligations checklist

| Kind       | Required                                        | Home                                  | This run                                                                                       |
| ---------- | ----------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `US-*`     | 14                                              | `tests/e2e/**`                        | Unchanged by this change; not scored in this run (D13)                                         |
| `TC-*`     | 38 integration-routed                           | `packages/qfai/tests/integration/**`  | `TC-0004-0074` written (`TDD-0067`); `TC-0004-0075` and `TC-0004-0076` follow in the P1c loop  |
| `CON-API-*` | none                                           | `tests/api/**`                        | none owed                                                                                      |
| `CON-DB-*` | none                                            | `tests/integration/**`                | none owed                                                                                      |

## Ledger rows advanced

<!-- Index table + one `### TDD-NNNN` section per row:
     `references/red-provenance.md#evidence-shape`. Rework rounds nest inside a
     row's section as `#### Round N`: `references/review-fix-rounds.md`. -->

No ledger cell is written here: `/qfai-implement` writes `Status`, `DR-ID` and
`Evidence`.

| TDD-ID     | Obligation     | Layer       | RED provenance | Handoff                    | Entry                 |
| ---------- | -------------- | ----------- | -------------- | -------------------------- | --------------------- |
| `TDD-0067` | `TC-0004-0074` | integration | observed-red   | ready, P1c (stage gate)    | [TDD-0067](#tdd-0067) |
| `TDD-0068` | `TC-0004-0075` | integration | observed-red   | ready, asset-withdrawal GREEN | [TDD-0068](#tdd-0068) |
| `TDD-0069` | `TC-0004-0076` | integration | observed-red   | ready, P1c (stage gate)    | [TDD-0069](#tdd-0069) |
| `TDD-0070` | `TC-0004-0076` | integration | falsifiability | ready, step 3c | [TDD-0070](#tdd-0070) |
| `TDD-0071` | `TC-0004-0076` | integration | observed-red   | ready, after `TDD-0069`'s GREEN | [TDD-0071](#tdd-0071) |

### TDD-0067

- TDD-ID: TDD-0067
- Layer: integration
- Test file: packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts
- Selector: TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path
- TC-ref: TC-0004-0074
- EX-ref: EX-0004-0042; AC-ref: AC-0004-0040; BR-ref: BR-0004-0034
- Branch: observed-red (branch 1). The surface exists and implements the
  predicate wrongly: `validateWorklogSurface` in
  `packages/qfai/src/core/validators/worklogSurface.ts`, called from
  `validateProject` in `packages/qfai/src/core/validate.ts`, still reads
  `.qfai/steering/`. No seam was needed: the test imports only `runValidate`,
  which exists. The RED is taken against the tree before the removal.
- qa-gatekeeper: PASS x2 (instance `atdd-red-gate`, Round 1 — qa-gatekeeper#2, RED phase gate before the production change, reviewed revision working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494 at HEAD 45587f6b2d358fe9f7fbf1eac79681c4d1ff4285; qa-gatekeeper#3, build-phase GREEN + oracle proof, reviewed revision working-tree+6bd3dce938ff90e748781d76e25d0dec2f4538bdd7d90f40496b14437d813b05 at HEAD 45587f6b2d358fe9f7fbf1eac79681c4d1ff4285)
- Handoff: to `/qfai-implement` Phase Red step 3b, at stage gate P1c, naming
  this row. Branch `observed-red`, so step 3b writes `todo -> red` from this
  entry and continues at Phase Green; no second RED is taken.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from
    the row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0004.md#tdd-0067`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are the
    round’s own fields under `#### Round 1`. The pre-approval run there is history,
    not the handed-over RED.
  - The `qa-gatekeeper` PASS is the line above. The `Oracle proof` plan, with its
    GREEN command, is under `#### Round 1`; `/qfai-implement` records the run there
    as `Round 1: Oracle proof`.
  - No production file is changed by this stage. The surface the GREEN changes is
    `validateProject` in `packages/qfai/src/core/validate.ts`, the row’s `Owning module`.

#### Round 1

The first RED of this round was taken before the scope approval and was
submitted to `qa-gatekeeper`, which returned REVISE for the missing approval
alone. It is kept below, verbatim. The round’s own RED fields further down
hold the approved RED.

**Pre-approval RED (superseded; qa-gatekeeper#1 REVISE, missing scope approval)**

- Tree: working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494
- Test content hash: 5c2400e293ec4579ff9cee5df6c71c4882cde87f4d9c9a3b53d460e0612d3ba1
- Test manifest:
  - packages/qfai/tests/helpers/tempTree.ts
  - packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts
- Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"`
- Result: exit 1; Test Files 1 failed (1); Tests 1 failed (1). The
  failure is the absence assertion at line 151, inside the selector. The read
  control at line 143 passed before it. The received value lists all five
  work-log codes and one `.qfai/steering/` path per entry, so the fixture
  exercises every code EX-0004-0042 names. Vitest's report follows verbatim;
  the 33 finding lines `runValidate` printed to stdout before it are omitted.

```text
 ❯ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test | 1 failed) 575ms
   × TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 572ms
     → expected { workLogCodes: [ …(5) ], …(1) } to deeply equal { workLogCodes: [], steeringTexts: [] }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL |integration|  tests/integration/spec0004WorklogSurfaceRemoval.test.ts > TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path
AssertionError: expected { workLogCodes: [ …(5) ], …(1) } to deeply equal { workLogCodes: [], steeringTexts: [] }

- Expected
+ Received

  Object {
-   "steeringTexts": Array [],
-   "workLogCodes": Array [],
+   "steeringTexts": Array [
+     ".qfai/steering/broken-frontmatter.md",
+     ".qfai/steering/broken-frontmatter.md: YAML frontmatter is missing or unparseable.",
+     ".qfai/steering/broken-link.md",
+     ".qfai/steering/broken-link.md: link \"spec-9999\" points to a non-existent spec.",
+     ".qfai/steering/incomplete-handoff.md",
+     ".qfai/steering/incomplete-handoff.md: handoff entry is missing required sections: ## Next single action, ## Constraints to preserve, ## Open questions, ## References to consult first.",
+     ".qfai/steering/stale-entry.md",
+     ".qfai/steering/stale-entry.md: status=active but updated 2453d ago (> 90d).",
+     ".qfai/steering/pending-promotion.md",
+     ".qfai/steering/pending-promotion.md: promote-to=\"spec-0001/07_Decisions.md\" is set but spec-0001/07_Decisions.md has no row referencing pending-promotion; `promoted-to:` back-ref is missing (must contain the DR-ID of the appended row in spec-0001/07_Decisions.md).",
+   ],
+   "workLogCodes": Array [
+     "W-WORKLOG-SCHEMA",
+     "W-WORKLOG-BROKEN-LINK",
+     "R-HANDOFF-INCOMPLETE",
+     "W-WORKLOG-STALE",
+     "W-PENDING-PROMOTION",
+   ],
  }

 ❯ tests/integration/spec0004WorklogSurfaceRemoval.test.ts:151:45
    149|       issue.texts.filter((text) => STEERING_PATH.test(text)),
    150|     );
    151|     expect({ workLogCodes, steeringTexts }).toEqual({ workLogCodes: []…
       |                                             ^
    152|   });
    153| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  05:21:56
   Duration  4.93s (transform 2.27s, setup 41ms, collect 3.75s, tests 575ms, environment 0ms, prepare 159ms)
```

- Failure mode: assertion
- Stripped run: both assertions neutralised as below,
  the RED command re-run unchanged, and the selector executed and passed. The
  test was restored at once; the file compared byte-equal to the RED copy and
  the tree address returned to the RED revision.

```diff
@@ -140,7 +140,7 @@ describe("TC-0004-0074: validate does not read the work-log directory", () => {
     const controlReads = issues.filter(
       (issue) => issue.code === "QFAI-STATUS-001" && issue.texts.includes(CONTROL_SPEC),
     );
-    expect(controlReads, "validate read this tree").toHaveLength(1);
+    void [controlReads, "validate read this tree", expect];

     const workLogCodes = issues
       .map((issue) => issue.code)
@@ -148,6 +148,6 @@ describe("TC-0004-0074: validate does not read the work-log directory", () => {
     const steeringTexts = issues.flatMap((issue) =>
       issue.texts.filter((text) => STEERING_PATH.test(text)),
     );
-    expect({ workLogCodes, steeringTexts }).toEqual({ workLogCodes: [], steeringTexts: [] });
+    void [{ workLogCodes, steeringTexts }, { workLogCodes: [], steeringTexts: [] }];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"
 ✓ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test) 481ms
   ✓ TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 480ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  05:22:33
   Duration  4.25s (transform 2.01s, setup 32ms, collect 3.24s, tests 481ms, environment 0ms, prepare 122ms)
exit=0
```

- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-23T20:32:56Z
  - Order: given after the RED above was run. That RED was taken without
    approval, so it is not the approved RED. A fresh RED and its
    assertion-stripped run are still owed before the `qa-gatekeeper`
    resubmission.
  - Covers: the test as reviewed, whose RED test hash is `5c2400e2…d3ba1`, and
    the single selector entry above. If the test file, a manifest entry or the
    selector changes, this approval lapses and the row needs a new one.
  - Reason, sufficiency: the selector covers the whole of TC-0004-0074, not a
    slice of it. The fixture holds the five EX-0004-0042 entries, one for each
    kind AC-0004-0040 names. It is a fresh directory, so it has no
    `.qfai/assistant/steering/`. The test runs validate with `profile: "full"`,
    in-process from `src` as S1 D3 settled. The one absence assertion checks
    both halves of the expected result: none of the five codes, and no
    `.qfai/steering/` path in any of the five S1 D4 fields.
  - Reason, one boundary: both halves observe one boundary, BR-0004-0034's
    "validate does not read `.qfai/steering/` and reports nothing about it".
    TC-0004-0074 is typed `normal` with that one boundary. It is not a matrix,
    so the row does not need splitting. The halves share a single `toEqual`, so
    one failure shows both of them and neither hides the other. The received
    value in the RED above shows both. The Oracle proof plan's two mutations
    make each half falsifiable on its own.
  - Reason, nothing extra: the `QFAI-STATUS-001` read control is the S1 D5
    vacuity guard. It is a precondition of the absence oracle, not a separate
    obligation. AC-0004-0040's second clause (`QFAI-ASSETS-006` for a leftover
    `worklog-entry.schema.md`) is not asserted here. It belongs to TC-0004-0075
    and TDD-0068. BR-0004-0035's ledger-check half belongs to TDD-0069 …
    TDD-0071.
- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the pre-approval RED: REVISE (instance `atdd-red-gate`, Round 1,
  reviewed revision working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494
  at HEAD 45587f6b2d358fe9f7fbf1eac79681c4d1ff4285). The row-level
  `qa-gatekeeper: PASS` field is not written, because that field takes only PASS.
  - Observation: meets the RED admissibility criteria. The gatekeeper recomputed the RED test
    hash from the manifest (`5c2400e2…d3ba1`, both entries regular files, mode `0666`) and the
    tree address (equal to the RED revision). Re-running the RED command reproduced the
    failure at line 151 with the same five codes and ten steering texts, after the
    read control at line 143 passed. The module loads, no seam was used, `packages/qfai/src`
    is unchanged against HEAD, and the new test file is untracked, so no passing code
    exists yet. The strip diff touches only the test file, keeps `runValidate`, the report
    read and both filters, and the stripped run shows the selector executed and passed with
    the command unchanged. The D4 oracle (five fields, backslashes normalised, boundary regex) and
    the D5 control follow the settled set. The assertions cover TC-0004-0074 /
    EX-0004-0042 / AC-0004-0040 first clause and nothing more.
  - Reason for REVISE: `delivery-planner` has not approved the scope. red-provenance
    branch 1 step 3 requires that approval before step 2 runs the RED. A PASS here would
    also stop the scope from being re-argued for this round
    (`qfai-implement/SKILL.md#precedence-between-delivery-planner-and-qa-gatekeeper`).
  - To clear: route `delivery-planner` on this row, asking whether the selector covers
    enough of TC-0004-0074, and record its verdict here. After a PASS, take the RED
    again, plus its assertion-stripped run (one per RED), and resubmit. If the test is
    unchanged (RED test hash `5c2400e2…d3ba1`) and the re-run reproduces this evidence,
    it passes. A scope REVISE means a fresh RED on the revised test.
  - Advisory (Oracle proof plan): at GREEN, mutation 2 must land in the code this row
    owns, `validateProject` in `packages/qfai/src/core/validate.ts`, not "any validator".
    A mutation in a shared validator is rejected there. Name the GREEN command, the same
    command as the RED, in the proof. `/qfai-implement` writes the run as
    `Round 1: Oracle proof`.
- Round 1: RED revision: working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494
- Round 1: RED test hash: 38ca12b8b3ad81a2ca60d7819fc7b00ee45f2425a3656aab834596724766b2d1
  (lstat-mode form `5c2400e293ec4579ff9cee5df6c71c4882cde87f4d9c9a3b53d460e0612d3ba1`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"`
- Round 1: RED result: exit 1; 1 test failed. The approved RED, run at 2026-09-23T20:34:08Z after the
  scope approval above. Before the run, the test hash recomputed to the approved
  `5c2400e2…d3ba1`, and the tree address was taken twice with equal results.
  Exit 1; Test Files 1 failed (1); Tests 1 failed (1). The failure is the
  absence assertion at line 151, inside the selector. The read control at line
  143 passed before it. The received value lists all five work-log codes and
  one `.qfai/steering/` path per entry. Vitest's report follows verbatim; the 33
  finding lines `runValidate` printed to stdout before it are omitted.

```text
 ❯ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test | 1 failed) 335ms
   × TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 333ms
     → expected { workLogCodes: [ …(5) ], …(1) } to deeply equal { workLogCodes: [], steeringTexts: [] }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL |integration|  tests/integration/spec0004WorklogSurfaceRemoval.test.ts > TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path
AssertionError: expected { workLogCodes: [ …(5) ], …(1) } to deeply equal { workLogCodes: [], steeringTexts: [] }

- Expected
+ Received

  Object {
-   "steeringTexts": Array [],
-   "workLogCodes": Array [],
+   "steeringTexts": Array [
+     ".qfai/steering/broken-frontmatter.md",
+     ".qfai/steering/broken-frontmatter.md: YAML frontmatter is missing or unparseable.",
+     ".qfai/steering/broken-link.md",
+     ".qfai/steering/broken-link.md: link \"spec-9999\" points to a non-existent spec.",
+     ".qfai/steering/incomplete-handoff.md",
+     ".qfai/steering/incomplete-handoff.md: handoff entry is missing required sections: ## Next single action, ## Constraints to preserve, ## Open questions, ## References to consult first.",
+     ".qfai/steering/stale-entry.md",
+     ".qfai/steering/stale-entry.md: status=active but updated 2453d ago (> 90d).",
+     ".qfai/steering/pending-promotion.md",
+     ".qfai/steering/pending-promotion.md: promote-to=\"spec-0001/07_Decisions.md\" is set but spec-0001/07_Decisions.md has no row referencing pending-promotion; `promoted-to:` back-ref is missing (must contain the DR-ID of the appended row in spec-0001/07_Decisions.md).",
+   ],
+   "workLogCodes": Array [
+     "W-WORKLOG-SCHEMA",
+     "W-WORKLOG-BROKEN-LINK",
+     "R-HANDOFF-INCOMPLETE",
+     "W-WORKLOG-STALE",
+     "W-PENDING-PROMOTION",
+   ],
  }

 ❯ tests/integration/spec0004WorklogSurfaceRemoval.test.ts:151:45
    149|       issue.texts.filter((text) => STEERING_PATH.test(text)),
    150|     );
    151|     expect({ workLogCodes, steeringTexts }).toEqual({ workLogCodes: []…
       |                                             ^
    152|   });
    153| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  05:34:15
   Duration  3.38s (transform 1.67s, setup 28ms, collect 2.66s, tests 335ms, environment 0ms, prepare 104ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: this RED's own stripped run. Both
  assertions were neutralised as below, the RED command was re-run unchanged,
  and the selector executed and passed. The test was restored at once. It
  compared byte-equal to the copy taken before the strip, the test hash
  recomputed to `5c2400e2…d3ba1`, and the tree address returned to the RED
  revision.

```diff
@@ -140,7 +140,7 @@ describe("TC-0004-0074: validate does not read the work-log directory", () => {
     const controlReads = issues.filter(
       (issue) => issue.code === "QFAI-STATUS-001" && issue.texts.includes(CONTROL_SPEC),
     );
-    expect(controlReads, "validate read this tree").toHaveLength(1);
+    void [controlReads, "validate read this tree", expect];

     const workLogCodes = issues
       .map((issue) => issue.code)
@@ -148,6 +148,6 @@ describe("TC-0004-0074: validate does not read the work-log directory", () => {
     const steeringTexts = issues.flatMap((issue) =>
       issue.texts.filter((text) => STEERING_PATH.test(text)),
     );
-    expect({ workLogCodes, steeringTexts }).toEqual({ workLogCodes: [], steeringTexts: [] });
+    void [{ workLogCodes, steeringTexts }, { workLogCodes: [], steeringTexts: [] }];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"
 ✓ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test) 313ms
   ✓ TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 312ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  05:34:30
   Duration  3.19s (transform 1.52s, setup 34ms, collect 2.44s, tests 313ms, environment 0ms, prepare 112ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`): two mutations, one per half of the predicate. Both
  land in the code this row owns, `validateProject` in
  `packages/qfai/src/core/validate.ts`, and each is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"`
  1. In `validateProject`, read `.qfai/steering/` again and add a
     `W-WORKLOG-SCHEMA` finding for an entry whose frontmatter does not parse.
     The selector must fail on `workLogCodes`.
  2. In `validateProject`, add one finding whose code is none of the five and
     whose `file` is `.qfai/steering/broken-link.md`. The selector must fail on
     `steeringTexts` while `workLogCodes` stays empty.
- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#2 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494 at HEAD 45587f6b2d358fe9f7fbf1eac79681c4d1ff4285).
  - Precondition met: the `delivery-planner` PASS at 2026-09-23T20:32:56Z comes before this
    RED (vitest start 05:34:15 local, 20:34:15Z). It covers the test hash the RED ran on.
  - Observation: the gatekeeper recomputed the RED test hash from the manifest
    (`5c2400e2…d3ba1`) and the tree address, and both equal the recorded values.
    `packages/qfai/src` is unchanged against HEAD. The ledger row is still `todo`.
    Re-running the RED command reproduced the failure at line 151 with the five codes,
    after the line 143 control passed. The module loads and no seam was used.
  - Strip: this RED's own stripped run. The diff reaches only the `Test file`, keeps
    `runValidate`, the report read and both filters, and the output shows the selector
    executed and passed with the command unchanged.
  - Oracle proof plan: both mutations are in `validateProject`
    (`packages/qfai/src/core/validate.ts`, this row's `Owning module`). Neither is a load
    failure. Each targets one half of the predicate, and the plan names the GREEN command,
    which equals the RED command. That is acceptable as a plan. The demonstration is judged
    at GREEN.
  - Oracle (D4 / D5) and scope against TC-0004-0074 / EX-0004-0042 / AC-0004-0040: as in
    the first verdict, unchanged.
  - Correction required before `/qfai-implement` step 3b consumes this entry. It does not
    touch this PASS: the pre-approval run must not be labelled
    `Round 1: Interrupted RED (block 1)`. `round-evidence.md` defines that group only for
    a round that a resumption from `blocked` re-observed into, and numbers the blocks.
    This row was never `blocked`: the ledger shows `todo` with an empty `Blocked-By`, and
    no `Resumed-from-blocked` exists. The label therefore records a block that never
    happened, in a field family that consumers parse. Keep the run, since every run of a
    gate is reported in order. Put it in `#### Round 1` under a plain bold label,
    **Pre-approval RED (superseded; qa-gatekeeper#1 REVISE, missing scope approval)**,
    and make its bullets carry no round-field name: `Tree`, `Test content hash`,
    `Test manifest`, `Command`, `Result`, `Failure mode`, `Stripped run`, with the
    fenced blocks as they are. Drop the "mirror group" sentence from the note. Moving
    that text changes no live `Round 1: RED*` field, so this PASS stands. An edit to a
    live RED field or to a manifest file voids it.
- Step 3b (`/qfai-implement`, run started 2026-09-23T21:11:02.206Z, backend-engineer
  `impl-row-0067`): entry verified before the status write. Branch `observed-red`;
  the selector is one entry over one boundary; the RED test hash recomputed to
  `5c2400e2…d3ba1` over the manifest, and the tree address recomputed to the
  `Round 1: RED revision`. Ledger write at 2026-09-23T21:18:12Z: `todo -> red`,
  `Test file` and `Selector` copied from the row identity above. `Evidence` stays
  `-` at `red`, because the one legal pointer shape carries `GREEN:pass`.
- Production change (Phase Green step 1), against HEAD `45587f6b2`:
  - `packages/qfai/src/core/validate.ts`: the `validateWorklogSurface` import and
    its call in `runSddValidators`, which `validateProject` reaches through
    `runProfileValidators`, are removed.
  - `packages/qfai/src/core/validators/index.ts`: its export is removed.
  - `packages/qfai/src/core/validators/worklogSurface.ts`: deleted. With the call
    gone the function is an unwired validator, which
    `tests/unit/validators-are-wired.test.ts` rejects.
  - `packages/qfai/src/core/emittedRuleCodes.ts`: regenerated with
    `npm run generate:rule-codes`. `R-HANDOFF-INCOMPLETE`, `W-PENDING-PROMOTION`,
    `W-WORKLOG-BROKEN-LINK`, `W-WORKLOG-SCHEMA` and `W-WORKLOG-STALE` leave it,
    because nothing produces them any more.
  - `packages/qfai/src/cli/commands/validate.ts`: `"W-WORKLOG-*"` and
    `"W-PENDING-PROMOTION"` leave the sdd family list, and the comment above it
    stops naming the surface. `reviewer-gate-sdd` is unchanged.
- Test and carrier edits that go with the deletion (`spec-0004/09_delta.md`,
  "What happens to the retired rows' tests"; implement S1 decisions 22 and 26):
  - `packages/qfai/tests/validators/worklogSurface.test.ts`: deleted, and its
    entry in `tests/scripts/typeCheckEnumeration.allowlist.ts` struck.
  - `packages/qfai/tests/integration/validatorConvergenceIntegration.test.ts`: the
    `TC-0004-0027` … `TC-0004-0031` annotations and their header mention removed.
    This file is acceptance-test territory; the removal is the ownership exception
    `/qfai-atdd` S1 D12 records.
  - `packages/qfai/tests/assets/rowNamesItsTestFile.test.ts`: the five
    `spec-0004 TDD-0027` … `TDD-0031` entries of `KNOWN_TEST_FILE_DRIFT` struck.
  - `packages/qfai/tests/integration/cli/commands/validate.profileCoverageNotice.test.ts`:
    the two work-log family assertions removed.
  - `tests/integration/qfai-traceability.md`: `TC-0004-0016`, `-0017`, `-0019`,
    `-0020`, `-0021` and `-0027` … `-0031` removed. `tests/e2e/qfai-traceability.md`:
    `US-0004-0029` and `US-0004-0031` removed.
- Round 1: Revision: working-tree+6bd3dce938ff90e748781d76e25d0dec2f4538bdd7d90f40496b14437d813b05
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"`
- Round 1: GREEN result: exit 0; 1 test passed. The restored run after both mutations were reverted.
  The tree address was taken before the first mutation and after each revert,
  and was equal each time. The RED test hash still recomputes to
  `5c2400e2…d3ba1`, so the test did not move under the RED. Vitest's report
  follows; the finding lines `runValidate` printed before it are omitted.

```text
 ✓ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test) 1210ms
   ✓ TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 1209ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  06:47:21
   Duration  11.23s (transform 8.13s, setup 56ms, collect 9.27s, tests 1.21s, environment 0ms, prepare 180ms)

exit=0
```

- Round 1: Oracle proof: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"` — exit 1; selector assertion failed.
  The two planned mutations, each applied at the call site
  the GREEN removed, inside `runSddValidators` in
  `packages/qfai/src/core/validate.ts`. That function is private to the row's
  `Owning module`, and `validateProject` reaches it through
  `runProfileValidators`. Each was reverted from a copy of the GREEN file, and the
  tree address returned to the `Round 1: Revision` above. Command for both runs:
  the GREEN command above.
  1. Read `.qfai/steering/` again and add `W-WORKLOG-SCHEMA` for an entry whose
     front matter does not parse. The finding names no file, so only the
     `workLogCodes` half is exercised. Result: exit 1, failing on
     `workLogCodes` with `steeringTexts` empty.

```diff
     ...(await validateNavigationFlow(root, config)),
+    ...(await (async () => {
+      const { readdir, readFile } = await import("node:fs/promises");
+      const { parse } = await import("yaml");
+      const dir = path.join(root, ".qfai", "steering");
+      const found: Issue[] = [];
+      for (const name of await readdir(dir).catch((): string[] => [])) {
+        const text = await readFile(path.join(dir, name), "utf-8");
+        const fm = /^---\n([\s\S]*?)\n---/.exec(text);
+        let ok = fm !== null;
+        try {
+          if (fm) parse(fm[1] ?? "");
+        } catch {
+          ok = false;
+        }
+        if (!ok) found.push(issue("W-WORKLOG-SCHEMA", "frontmatter does not parse", "warning"));
+      }
+      return found;
+    })()),
     ...(await validateAssistantTreeMigration(root, config)),
```

```text
 ❯ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test | 1 failed) 1744ms
   × TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 1742ms
     → expected { …(2) } to deeply equal { workLogCodes: [], steeringTexts: [] }

 FAIL |integration|  tests/integration/spec0004WorklogSurfaceRemoval.test.ts > TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path
AssertionError: expected { …(2) } to deeply equal { workLogCodes: [], steeringTexts: [] }

- Expected
+ Received

  Object {
    "steeringTexts": Array [],
-   "workLogCodes": Array [],
+   "workLogCodes": Array [
+     "W-WORKLOG-SCHEMA",
+   ],
  }

 ❯ tests/integration/spec0004WorklogSurfaceRemoval.test.ts:151:45

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  06:45:58
exit=1
```

  2. Add one finding whose code is none of the five and whose `file` is
     `.qfai/steering/broken-link.md`. Result: exit 1, failing on `steeringTexts`
     with `workLogCodes` empty.

```diff
     ...(await validateNavigationFlow(root, config)),
+    issue("QFAI-ORACLE-PROBE", "oracle probe", "info", ".qfai/steering/broken-link.md"),
     ...(await validateAssistantTreeMigration(root, config)),
```

```text
 ❯ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts (1 test | 1 failed) 1300ms
   × TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path 1299ms
     → expected { workLogCodes: [], …(1) } to deeply equal { workLogCodes: [], steeringTexts: [] }

 FAIL |integration|  tests/integration/spec0004WorklogSurfaceRemoval.test.ts > TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path
AssertionError: expected { workLogCodes: [], …(1) } to deeply equal { workLogCodes: [], steeringTexts: [] }

- Expected
+ Received

  Object {
-   "steeringTexts": Array [],
+   "steeringTexts": Array [
+     ".qfai/steering/broken-link.md",
+   ],
    "workLogCodes": Array [],
  }

 ❯ tests/integration/spec0004WorklogSurfaceRemoval.test.ts:151:45

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  06:46:48
exit=1
```

- GREEN tree checks: `npx tsc -p tsconfig.json --noEmit` and
  `npx tsc -p tsconfig.tests.json --noEmit` from `packages/qfai`, both exit 0
  with no diagnostic.
- Refactor (Phase: Refactor step 1): no production change. The GREEN is a pure
  deletion, and the source comments that still name `worklogSurface.ts` are
  deferred to later rows (implement S1 decision 23). Two test-side edits were
  made while running the relevant suite, each striking a frozen-list entry for
  a code nothing emits any more (implement S1 decision 21):
  - `packages/qfai/tests/core/findingCodeGrammar.test.ts`: `R-HANDOFF-INCOMPLETE`,
    `W-PENDING-PROMOTION`, `W-WORKLOG-BROKEN-LINK`, `W-WORKLOG-SCHEMA` and
    `W-WORKLOG-STALE` struck from `LEGACY_FINDING_CODES`, which failed
    "keeps no stale entry in the legacy registry".
  - `packages/qfai/tests/core/issueCodeUniqueness.test.ts`: `R-HANDOFF-INCOMPLETE`
    struck from both pending lists, which failed "keeps no stale entries on
    either pending list".
  - `eslint --max-warnings 0` and `prettier --check` over every changed file:
    both exit 0.
- Relevant suite resolution: step 3 (package fallback) applies, because the
  reverse walk from the changed modules cannot be completed. Test files import
  modules through computed paths, and the e2e tests reach the code through
  `dist/`. The whole-package run is multi-hour on this host, so the user chose
  (AskUserQuestion, 2026-09-23) a narrower local per-row set: the row's own test,
  the test files whose static imports resolve to a changed module, both type
  checks and the rule-code drift check. The full package suite runs on CI, from a
  pushed draft PR, at the boundaries: completed row 10, the last row, and any
  row that touches a file outside `packages/qfai`. This row is one of those,
  through the two root carriers under `tests/`. This
  deviates from the widen-to-package rule of
  `references/relevant-test-suite.md`, and main's CI is the baseline for
  pre-existing failures. The static-import set covers `src/core/validate.ts`,
  `src/core/validators/index.ts`, the deleted `src/core/validators/worklogSurface.ts`
  (no importer is left), `src/core/emittedRuleCodes.ts`,
  `src/cli/commands/validate.ts` and `tests/scripts/typeCheckEnumeration.allowlist.ts`:
  52 files. Four more were added: `tests/validators/ruleCodeUniqueness.test.ts`
  (a frozen code list that reads source rather than importing it),
  `tests/unit/validators-are-wired.test.ts` (the guard that makes the deletion
  necessary), and the two edited test files
  `tests/integration/validatorConvergenceIntegration.test.ts` and
  `tests/assets/rowNamesItsTestFile.test.ts`.
- Pre-merge refactor verify (first run of item 6, on the uncommitted tree the
  two reviews were pinned to; kept because every run of a gate is reported).
  Commands, from the repository root, in this order:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. The 56-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/assets/sddImportLiteEvidence.test.ts tests/cli/commands/validate.test.ts tests/cli/commands/validateTextFormat.test.ts tests/cli/githubAnnotationCap.test.ts tests/cli/githubAnnotationEscaping.test.ts tests/cli/report.test.ts tests/cli/validateRunIncomplete.test.ts tests/core/assistantAnchorReferences.test.ts tests/core/atddCoverageDepth.test.ts tests/core/contractSsotModules.test.ts tests/core/discussionDesignMdParse.test.ts tests/core/findingCodeGrammar.test.ts tests/core/frozenSurfaceReachability.test.ts tests/core/gateGroupCoverage.test.ts tests/core/issueCodeUniqueness.test.ts tests/core/layerCoverage.test.ts tests/core/platformOptionProfileScope.test.ts tests/core/reportDeltaScanDisclosure.test.ts tests/core/specScopeValidate.test.ts tests/core/specSections.test.ts tests/core/surfaceShortCircuitScope.test.ts tests/core/testFileGlobsConfiguration.test.ts tests/core/traceabilityIntegrity.test.ts tests/core/validationTimings.test.ts tests/core/validators/uiScreenEntries.test.ts tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/integration/cli/commands/validate.legacyPathEvidenceGate.test.ts tests/integration/cli/commands/validate.legacyValidateJsonConfig.test.ts tests/integration/cli/commands/validate.profileCoverageNotice.test.ts tests/integration/cli/commands/validate.reviewArtifactsProfiles.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/integration/cli/commands/validate.strictFailOnPrecedence.test.ts tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts tests/integration/cli/commands/validate.tddProfileTableArity.test.ts tests/integration/cli/commands/validateSaasPackage.passes.test.ts tests/integration/explorationRelaxationAudit.test.ts tests/integration/prototypingExplorationRelaxationScope.test.ts tests/integration/reviewArtifactsProfileWiring.test.ts tests/integration/reviewerGateMockHrefDrift.test.ts tests/integration/spec0004ProfileSuffixedValidate.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/integration/spec0010DiscussionMockAndPointer.test.ts tests/integration/spec0014VerifyReviewerGate.test.ts tests/integration/specAutoDiscovery.test.ts tests/integration/verifySemanticsSpec0014.test.ts tests/scripts/testTypeCheckEnumeration.test.ts tests/validators/atddTestGlobConfiguration.test.ts tests/validators/atddUnreadableTestRoot.test.ts tests/validators/importLite.test.ts tests/validators/uix/nonUiOverfire.test.ts  tests/validators/ruleCodeUniqueness.test.ts tests/unit/validators-are-wired.test.ts tests/integration/validatorConvergenceIntegration.test.ts tests/assets/rowNamesItsTestFile.test.ts
```

  Outcome: every command exited 0. The two type checks printed
  no diagnostic. The drift check printed
  `src/core/emittedRuleCodes.ts is in sync (502 codes).` The vitest run printed
  `Test Files  56 passed (56)`, `Tests  893 passed | 12 skipped (905)` and
  exit 0. Its verbose output names the row's selector as passed:
  `✓ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts > TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path`.
  The 12 skipped tests belong to other rows' files; none carries this row's
  selector. Earlier runs of the same gates, reported in order:
  - The first drift check, before 22:03Z (exact time not recorded), printed
    `src/core/emittedRuleCodes.ts is stale` and exited 1. `src/core/validate.ts`
    was then found byte-equal to the GREEN copy, and the tree address was
    `working-tree+6bd3dce9…`. Regenerating produced a byte-identical file, and
    the next check passed. The stale reading matches mutation 2's extra code
    being in the tree at that moment, most likely while `qa-gatekeeper` reproduced
    the Oracle proof in this worktree. Recorded as an `environment/tooling` finding.
  - The first run of the three frozen-list files, before the two edits above:
    `Test Files  2 failed | 4 passed (6)`, exit 1, with the two failures named
    above.
  Tree: working-tree+c40624af1b883bac9fd9b5db5ce141bf3db77edf404ed2633f5dd701429db549
- Merge of main: `4c48e72f1` commits this row's work, and `536fc4ddd` merges
  `origin/main` into it. `4c48e72f1` holds the reviewed content byte for
  byte. Checked out detached, with its index reset to `45587f6b2` (nothing was
  staged in the reviewed state), the four-step address recomputes to
  `working-tree+c40624af…d549`. `git diff 4c48e72f1 536fc4ddd` over this row's
  changed files touches only `packages/qfai/tsconfig.tests.json`: one `include`
  entry, `tests/integration/shippedWorkflowCheckIndependence.test.ts`, for a
  test main added. Under `packages/qfai/src`, `packages/qfai/tests` and `tests`,
  main changed 13 files. One is production: `src/core/validators/tddList.ts`,
  reached from `validateProject`. The rest are tests:
  `atddRedProvenance`, `finalChecklistGateParity`, `tddListEvidence`,
  `spec0003ShippedWorkflowSetE2E`, `spec0017RunnerParallelismE2E`, three
  `prototypingIterate` auto-serve tests, `reviewerFindingProvenance`, the new
  `shippedWorkflowCheckIndependence`, `shippedWorkflowPortability` and
  `vitestWorkspaceKnobs`. Main also moved the toolchain to TypeScript 6.0.3 and
  vitest 4.1.11. So the observations above cover a tree that no longer exists,
  and item 6 is re-taken on the merged commit below.
- Refactor verify command: `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`. From the repository root, after
  `cd packages/qfai && ./node_modules/.bin/tsup` (exit 0), in this order:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. The same 56-file run. The static-import set was recomputed on the merged
     tree and is the same 52 files, so main added no importer of a changed
     module:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/assets/sddImportLiteEvidence.test.ts tests/cli/commands/validate.test.ts tests/cli/commands/validateTextFormat.test.ts tests/cli/githubAnnotationCap.test.ts tests/cli/githubAnnotationEscaping.test.ts tests/cli/report.test.ts tests/cli/validateRunIncomplete.test.ts tests/core/assistantAnchorReferences.test.ts tests/core/atddCoverageDepth.test.ts tests/core/contractSsotModules.test.ts tests/core/discussionDesignMdParse.test.ts tests/core/findingCodeGrammar.test.ts tests/core/frozenSurfaceReachability.test.ts tests/core/gateGroupCoverage.test.ts tests/core/issueCodeUniqueness.test.ts tests/core/layerCoverage.test.ts tests/core/platformOptionProfileScope.test.ts tests/core/reportDeltaScanDisclosure.test.ts tests/core/specScopeValidate.test.ts tests/core/specSections.test.ts tests/core/surfaceShortCircuitScope.test.ts tests/core/testFileGlobsConfiguration.test.ts tests/core/traceabilityIntegrity.test.ts tests/core/validationTimings.test.ts tests/core/validators/uiScreenEntries.test.ts tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/integration/cli/commands/validate.legacyPathEvidenceGate.test.ts tests/integration/cli/commands/validate.legacyValidateJsonConfig.test.ts tests/integration/cli/commands/validate.profileCoverageNotice.test.ts tests/integration/cli/commands/validate.reviewArtifactsProfiles.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/integration/cli/commands/validate.strictFailOnPrecedence.test.ts tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts tests/integration/cli/commands/validate.tddProfileTableArity.test.ts tests/integration/cli/commands/validateSaasPackage.passes.test.ts tests/integration/explorationRelaxationAudit.test.ts tests/integration/prototypingExplorationRelaxationScope.test.ts tests/integration/reviewArtifactsProfileWiring.test.ts tests/integration/reviewerGateMockHrefDrift.test.ts tests/integration/spec0004ProfileSuffixedValidate.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/integration/spec0010DiscussionMockAndPointer.test.ts tests/integration/spec0014VerifyReviewerGate.test.ts tests/integration/specAutoDiscovery.test.ts tests/integration/verifySemanticsSpec0014.test.ts tests/scripts/testTypeCheckEnumeration.test.ts tests/validators/atddTestGlobConfiguration.test.ts tests/validators/atddUnreadableTestRoot.test.ts tests/validators/importLite.test.ts tests/validators/uix/nonUiOverfire.test.ts  tests/validators/ruleCodeUniqueness.test.ts tests/unit/validators-are-wired.test.ts tests/integration/validatorConvergenceIntegration.test.ts tests/assets/rowNamesItsTestFile.test.ts
```

- Refactor verify result: every command exited 0. The two type checks printed
  no diagnostic. The drift check printed
  `src/core/emittedRuleCodes.ts is in sync (502 codes).` The vitest run
  (start 07:41:42 local) printed `Test Files  56 passed (56)`,
  `Tests  893 passed | 12 skipped (905)` and exit 0. Its verbose output names
  the row's selector as passed:
  `✓ |integration| tests/integration/spec0004WorklogSurfaceRemoval.test.ts > TC-0004-0074: validate does not read the work-log directory > TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path`.
  The 12 skipped tests are the same ones as before, in `contractSsotModules`,
  `atddCoverageDepth`, `surfaceShortCircuitScope` and `sddImportLiteEvidence`.
  None carries this row's selector. `git status --porcelain` was empty before
  and after the run.
- Refactor verify revision: 536fc4ddda6894af728745a0765999aa82438ec5
- `qa-gatekeeper` (routing phase `build`), qa-gatekeeper#3 on the Round 1 GREEN and
  Oracle proof: PASS (instance `atdd-red-gate`, reviewed revision working-tree+6bd3dce938ff90e748781d76e25d0dec2f4538bdd7d90f40496b14437d813b05 at HEAD 45587f6b2d358fe9f7fbf1eac79681c4d1ff4285).
  - Freshness: the gatekeeper recomputed the tree address, equal to `Round 1: Revision`,
    and the RED test hash `5c2400e2…d3ba1` over the manifest, equal to the RED's. The
    test did not move under the RED.
  - GREEN: `Round 1: GREEN command` equals `Round 1: RED command`. The gatekeeper re-ran
    it, exit 0, and the output names the row's selector as passing (1 test, not skipped).
  - Oracle proof: the gatekeeper applied each recorded diff to the GREEN `validate.ts`,
    ran the GREEN command, and restored the file byte for byte from a copy, and the
    address returned to `Round 1: Revision`. Mutation 1 failed at line 151 on
    `workLogCodes: ["W-WORKLOG-SCHEMA"]`, with `steeringTexts` empty. Mutation 2 failed
    at line 151 on `steeringTexts: [".qfai/steering/broken-link.md"]`, with
    `workLogCodes` empty. Both failures name this row's selector, neither is a load
    failure, and each half of the predicate is falsified on its own.
  - Mutation site: both mutations are in `runSddValidators`, not literally in
    `validateProject` as the plan worded it. Accepted, no re-run. `runSddValidators` is
    module-private to `validate.ts`, the row's `Owning module`, and `validateProject`
    reaches it through `runProfileValidators` on `profile: "full"`. The site is the
    call-list line this round's GREEN removed (`git diff HEAD`, validate.ts line 784), so
    it is exactly the code this item wrote, not a shared helper. The plan's wording named
    the entry point, and the demonstration lands on the owned call site under it.
  - Gatekeeper's own runs, in order: the first two applications of mutation 1 did not
    load (`Transform failed … Unterminated regular expression`). The gatekeeper's
    scratch script had turned `
` in the recorded regex into a newline. Both were
    reverted byte for byte, and the third application, the recorded diff verbatim,
    gave the failure above. They are not evidence about this row.
  - Grilling: the `### /qfai-implement — run started 2026-09-23T21:11:02.206Z` block
    exists. Its S1 row ended `adopted` at 21:17:21.288Z against the RED tree
    `working-tree+06abf1f7…e494`, so it ended before any production write. Work
    resumed at 21:18:12.657Z, which is the step 3b ledger write, and `Decisions` 10
    matches Work Orders rows 21–30.
  - Advisory: mutation 1 is 18 lines, not the "smallest, one line" that
    `oracle-strength.md` asks for. One unconditional `W-WORKLOG-SCHEMA` issue would
    do. Size is not a reject condition, and this mutation also re-creates the
    directory read the obligation forbids, so it stands.

- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924175617099 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 61e9926c910a073542ffd6c469a76bbfea32e01a28bea9285ee136a0867b6c63
- Prototype parity: n/a (not UI-affecting)
- Prototype parity rationale: `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at
  working-tree+c40624af1b883bac9fd9b5db5ce141bf3db77edf404ed2633f5dd701429db549,
  and again at 536fc4ddda6894af728745a0765999aa82438ec5 with the same answer.
- Historical Prototype parity reviewed revision: 536fc4ddda6894af728745a0765999aa82438ec5
- Historical review record: The verdicts, reviewed revisions, and audited hashes below belong to earlier evidence and do not attest to this revised section.

- Historical Code quality review: PASS (implementation-reviewer, instance `impl-ir-0067`, 2026-09-23T22:15Z). Diff reviewed: `src/core/validate.ts`, `src/core/validators/index.ts`, the deleted `src/core/validators/worklogSurface.ts`, the regenerated `src/core/emittedRuleCodes.ts`, `src/cli/commands/validate.ts`, the seven test-side edits, the deleted `tests/validators/worklogSurface.test.ts`, `tsconfig.tests.json` and the two root carriers. Re-run by this reviewer: both type checks (`tsc -p tsconfig.json` and `tsc -p tsconfig.tests.json`, `--noEmit`), exit 0 with no diagnostic; the row's selector, 1 passed. The S1 decisions of Work Orders rows 21–30 match the diff. `R-HANDOFF-INCOMPLETE` and `R-WORKLOG-DRIFT` stay in `reviewer-gate-sdd` and in `ADVISORY_FAILING_CODES`. `handoffUpgrade.ts`, `R-HANDOFF-SCHEMA-DRIFT`, `assistantPaths.ts` and the `LEGACY_ASSISTANT_*` code are untouched. No removed symbol or code has a remaining importer or emitter. No blocking finding. Advisory findings: source and test comments still name the deleted `worklogSurface.ts` as the authority (`worklogEntries.ts`, `assistantPaths.ts`, `parse/spec.ts`, `prototypingEvidence.ts`, `ruleCodeUniqueness.test.ts`, `tddListBlockedStatus.test.ts`, `worklogSchemaShipped.test.ts`). Both READMEs and `docs/finding-codes.md` still name the removed codes. Decision 23 defers both to later steps, and they must be gone before the change's head. The tree moved during review: HEAD went from `45587f6b2` to `4c48e72f1` in a commit this reviewer did not make. Under `packages/qfai` and `tests/`, `4c48e72f1` is the reviewed diff with nothing added, so the verdict is pinned to the revision below.
- Historical Code quality reviewed revision: working-tree+c40624af1b883bac9fd9b5db5ce141bf3db77edf404ed2633f5dd701429db549
- Historical Code quality audited evidence hash: bbd512123998133679aa865d8d885104439e658d8acae8b70c75eac365073eb9
- Historical Round 1: reviewer verdict: completion-reviewer PASS (completion-reviewer
  `impl-cr-0067`, item review, reviewed revision working-tree+c40624af1b883bac9fd9b5db5ce141bf3db77edf404ed2633f5dd701429db549
  at HEAD 45587f6b2d358fe9f7fbf1eac79681c4d1ff4285). Pinned to that revision.
  - Tree: at review time HEAD was 4c48e72f1fce1659a8e7d2c899f3135792e06743 with
    a clean worktree. The address taken over that tree with HEAD set to
    45587f6b2 equals the `Refactor verify revision`, so the commit holds the
    reviewed content.
  - Re-run: the GREEN command, exit 0, 1 test passed, none skipped. Both type
    checks exit 0.
  - Spec alignment: the selector covers TC-0004-0074, EX-0004-0042, the first
    clause of AC-0004-0040 and BR-0004-0034. The production and test edits match
    `09_delta.md` ("What happens to the retired rows' tests") and implement S1
    decisions 21-30. No other spec's `done` row names a changed file in
    `Owning module` or `Test file`.
  - Not judged: validate, coverage and runtime evidence, which are P5/P6 inputs.
    The ten `## Cross-spec obligations` entries stay open; this verdict does not
    re-review them.
  - Condition on `done`: the row is a checkpoint boundary, so `refactor -> done`
    waits for a passing full suite on the reviewed content. The pull request's
    CI tests GitHub's merge of the branch with main, which is 18 commits past
    45587f6b2, so that run is not on this tree.
- Historical Round 1: reviewer verdict: completion-reviewer PASS (completion-reviewer
  `impl-cr-0067`, re-review after the merge of main, reviewed revision
  536fc4ddda6894af728745a0765999aa82438ec5). Pinned to that revision. The
  verdict above is kept as history.
  - Merge delta: for every file this row changed under `packages/qfai` and
    `tests`, `3a436e308..536fc4ddd` makes the same change as
    `45587f6b2..4c48e72f1`, so the row's diff is unchanged. The merge also
    renumbered spec-0004's Change Request to `CR-20260923-0011`, and nothing left
    names it by its old number. Main's own changes inside the covered tree are
    covered by the re-taken item 6 and by the full suite.
  - Item 6: the refactor verify at 536fc4ddd is accepted. 56 files pass, the
    row's selector is named, and both type checks and the rule-code check pass.
  - Re-run: the GREEN command with `--reporter=verbose` names the selector as
    passed. Both type checks exit 0 under TypeScript 6.0.3.
  - Cross-spec: after the merge, 14 more rows of other specs are `done` with a
    `Test file` under `packages/qfai/`: spec-0003 TDD-0058..0063, TDD-0092 and
    TDD-0093; spec-0012 TDD-0561..0566. The spec-0003 and spec-0012 entries do
    not list them yet.
  - Condition on `done`: waits for a passing full suite on this tree.
    `refs/pull/2221/merge` is 476bbb77668d5af3bb3e96839c5ceffe3a85a4c2. Its
    parents are fd9a633c6 (main, which moved `@cucumber/gherkin` from 37 to 42
    after this merge) and 536fc4ddd. Its tree differs from 536fc4ddd in
    `packages/qfai/package.json` and `pnpm-lock.yaml`, so a CI run on it is not
    a checkpoint of 536fc4ddd.
- Historical Code quality review: PASS (implementation-reviewer, instance `impl-ir-0067`, re-review at the merged commit `536fc4ddd`, 2026-09-23T22:50Z). The verdict above, pinned to `working-tree+c40624af…d549`, is kept as history, and this one supersedes it. `git diff 4c48e72f1 536fc4ddd` leaves every file of this row's diff byte-identical except `packages/qfai/tsconfig.tests.json`. There, main added one `include` entry for its own new test, `shippedWorkflowCheckIndependence.test.ts`, and this row's entry is unchanged. Main's `src/core/validators/tddList.ts` hunks cover the record re-attestation fields (added to the gate-field boundary), PASS-verdict parsing and shared-artifact re-verify staleness. None of them touches Check 8b, `worklogEntries.js`, the audit-subject extraction for this entry, or a removed symbol or code. No added line in main's 13 changed files under `packages/qfai/src`, `packages/qfai/tests` and `tests` names `worklogSurface`, `validateWorklogSurface`, `W-WORKLOG-*`, `W-PENDING-PROMOTION`, `R-HANDOFF-INCOMPLETE`, `R-WORKLOG-DRIFT` or `.qfai/steering`. Main adds no finding code and no type assertion in `src`. Re-run by this reviewer at `536fc4ddd` (TypeScript 6.0.3): both type checks (`tsc -p tsconfig.json` and `tsc -p tsconfig.tests.json`, `--noEmit`), exit 0 with no diagnostic; the row's selector, 1 passed. No blocking finding. The advisory findings of the verdict above stand unchanged: stale `worklogSurface.ts` comments, and removed code names in both READMEs and `docs/finding-codes.md`. Decision 23 defers both, and they must be gone before the change's head. The audited evidence hash is recomputed, because the phase-authored region now holds the re-taken `Refactor verify` fields at `536fc4ddd`.
- Historical Code quality reviewed revision: 536fc4ddda6894af728745a0765999aa82438ec5
- Historical Code quality audited evidence hash: dada6af460d9628b9a0df1c4b54d5c0e2afdbf90fe71e01883837bd436f694ad
- Checkpoint timing (user decision, AskUserQuestion, 2026-09-23): the change is
  green only at its head. So every row of this change stops at `refactor` once
  its RED, GREEN, reviews and local per-row checkpoint are recorded. The
  full-suite checkpoints of all rows close together on the final head's CI, and
  then every row moves to `done`. This row stays at `refactor` until then. Its
  checkpoint fields and seal are written from that CI run.

- Spec review: PASS
- Spec reviewed revision: 536fc4ddda6894af728745a0765999aa82438ec5
- Spec audited evidence hash: 404d961fae34cbd2d615b3d0e208bac9b6b4bd79a9216bf1887588cb9f940547
- Spec review pack: .qfai/review/review-20260924175617099 <!-- qfai:not-a-citation -->
- Spec review pack seal: 61e9926c910a073542ffd6c469a76bbfea32e01a28bea9285ee136a0867b6c63
- Code quality review: PASS
- Code quality reviewed revision: 536fc4ddda6894af728745a0765999aa82438ec5
- Code quality audited evidence hash: 404d961fae34cbd2d615b3d0e208bac9b6b4bd79a9216bf1887588cb9f940547
- Code quality review pack: .qfai/review/review-20260924175617099 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 61e9926c910a073542ffd6c469a76bbfea32e01a28bea9285ee136a0867b6c63
- Prototype parity reviewed revision: 536fc4ddda6894af728745a0765999aa82438ec5
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts --reporter=verbose; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — file-scoped run: 1 file, 1 test(s) passed, selector named in verbose output; CI run https://github.com/aganesy/QFAI/actions/runs/36026684599: all nine test slices and ci-pass passed at b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d.
- Checkpoint verification revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Checkpoint verification seal: 36c4413f5ebd2df82845bef9110a88b1ff86fa4f162d6b7d6d4f35753a3918a5

### TDD-0069

- TDD-ID: TDD-0069
- Layer: integration
- Test file: packages/qfai/tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts
- Selector: TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error
- TC-ref: TC-0004-0076
- Boundary: first tree; boundary `blocked-by-named`
- EX-ref: EX-0004-0044, first clause; AC-ref: AC-0004-0041, first clause;
  BR-ref: BR-0004-0035, as amended by `CR-20260923-0011`
- Branch: observed-red (branch 1), confirmed by the RED below. The surface
  exists and implements the predicate wrongly: `validateTddList` in
  `packages/qfai/src/core/validators/tddList.ts` still requires a
  `.qfai/steering/` entry for a spec with a `blocked` row, through
  `blockedWithoutWorklog` and `readSteeringIndex`, and raises
  `QFAI-TDDLIST-015` at `error` when none exists. No seam is needed: the test
  imports only `runValidate`, which exists.
- qa-gatekeeper: PASS x2 (instance `atdd-red-gate`, Round 1 — qa-gatekeeper#1, RED phase gate before the production change, reviewed revision working-tree+818c7ff482f03603ef6bd7274df9467e1a343433f9e477c424d4f0db1ea53e6f at HEAD 536fc4ddda6894af728745a0765999aa82438ec5; qa-gatekeeper#2, build-phase GREEN + oracle proof, reviewed revision working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture: a fresh temporary directory with no `.qfai/steering/`. It holds
  `.qfai/specs/spec-0001/` with four stub spec files and a nine-column ledger:
  - row 1, `TDD-0002`: `blocked`, `Blocked-By` `spec-0004:TDD-0001 — blocked at todo`,
    the row under test;
  - row 2, `TDD-0003`: `blocked`, `Blocked-By` `CR-20260923-0001`, the D5 control.
    It names a blocker and no departure status, a different shape from the
    empty cell `TDD-0070` owns.
- Oracle, run under `runValidate({ profile: "tdd" })` and inspect the temporary report returned by the validation run:
  - read-proof (S1 D5): exactly one `TDDLIST_BLOCKED_MISSING_REF` whose fields
    name the ledger path and `(row 2)`;
  - absence: `expect(rowErrors).toEqual([])`, where `rowErrors` holds the codes
    of every `error` finding that names row 1, by `TDD-0002` or the `row 1` label
    the ledger check writes. A row-name match reads `file`, `relatedFiles[]`,
    `refs[]`, `message` and `suggested_action`, with `\` normalised to `/`.
- Fixture lookup, not a RED: before the test was written, the built CLI
  (`packages/qfai/dist/cli/index.mjs validate --profile tdd`) was run on the same
  tree in a scratch directory outside the repository, to choose a row the ledger
  check leaves otherwise clean. Its only `error` findings were the control's
  `TDDLIST_BLOCKED_MISSING_REF` naming `(row 2)` and `QFAI-TDDLIST-015` naming
  `(row 1, row 2)` and `.qfai/steering/`. The test file itself has not been run.
- Status: RED and its stripped run recorded under `#### Round 1`, on the test
  hash the scope PASS below approved. `qa-gatekeeper` (routing phase `red`)
  passed it (qa-gatekeeper#1). Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-23T23:18:53Z
  - Reviewed: test hash `11e2bf06…2594d1`, the single selector entry above,
    and the Round 1 plan below. No RED had been run.
  - Reason, what the TC asks here: TC-0004-0076 names three trees, each with
    its own expected result. For the first tree, the one this row owns, the
    expected result is "no error-severity finding for the row". "No finding
    names `.qfai/steering/`" is the third tree's expected result, and
    `TDD-0071` (`steering-unreadable`) owns it.
  - Reason, a second boundary: the `steeringTexts` half of the `toEqual` at
    line 124 asserts that third-tree result on the first tree. It can fail on
    its own: a finding that names `.qfai/steering/` but not row 1, or names it
    only at `warning`, fails `steeringTexts` while `rowErrors` stays empty. The
    Round 1 Oracle proof plan confirms this, because mutation 3 exists only to
    fail `steeringTexts` with `rowErrors` empty. A row whose assertions cannot
    all be named under one boundary carries more than one, and the row has to
    change before its RED.
  - Sufficiency otherwise holds, and needs no change. The fixture holds a
    `blocked` row whose `Blocked-By` is `spec-0004:TDD-0001 — blocked at todo`,
    matching the EX-0004-0044 first clause as amended by `CR-20260923-0011`.
    The tree has no `.qfai/steering/`. The test runs validate under
    `profile: "tdd"`. `rowErrors` filters on `error` severity and on findings
    that name row 1, which is exactly "no error-severity finding for the row".
    Oracle proof mutations 1 and 2 make that half falsifiable.
  - The control row `TDD-0003` is a legitimate read-proof, not an addition.
    Settled decision S1 D5 requires one on every absence oracle. The control
    is read by the same check that must accept row 1, so an empty `rowErrors`
    cannot come from a ledger nobody read. Its shape (a named blocker, no
    departure status) is not the empty cell `TDD-0070` owns. The `(row 2)`
    match does not also match a combined `(row 1, row 2)` label. It asserts no
    result that TC-0004-0076 expects, so it takes no part of a sibling's
    obligation.
  - To clear:
    1. Drop the `steeringTexts` half from the absence assertion, leaving
       `expect(rowErrors).toEqual([])`, and remove `STEERING_PATH` if nothing
       else uses it.
    2. Drop mutation 3 from the Oracle proof plan.
    3. Keep the fixture, the control and the selector. The selector names the
       tree's precondition, "no `.qfai/steering/`", not a second expected
       result, so it can stay as it is.
    4. Record the new test hash and resubmit it for scope approval before any
       RED is run.
  - Note: the user's decision on checkpoints (every row stops at `refactor`,
    and all full-suite checkpoints close together on the final head's CI)
    changes when checkpoints run, not what a row covers. It has no bearing on
    this verdict.
- Scope approval (`delivery-planner`), on the revised test:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-23T23:21:57Z
  - Covers: test hash `ddf4addab620b7b72d05acdaf700a6b94a86a26a9bb51267ccdf4626fdddba10`,
    at tree `working-tree+818c7ff4…e53e6f`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Reason: each item the REVISE listed is done. The one absence assertion is
    `expect(rowErrors).toEqual([])`. `steeringTexts` and `STEERING_PATH` are
    gone. `.qfai/steering/` now appears only in the selector name and in the
    comment that states the tree's precondition. Mutation 3 is gone from the
    plan.
  - One boundary: TC-0004-0076's first tree expects no error-severity finding
    for the row. Every remaining assertion either observes that result or is
    the S1 D5 read-proof that makes it meaningful. The two remaining mutations
    both land in `tddList.ts` and both fail on `rowErrors`.
  - Sufficiency and the control row `TDD-0003` are unchanged from the REVISE's
    findings, which already held both.
  - Nothing the TC does not ask: the second-tree result (an empty `Blocked-By`)
    belongs to `TDD-0070`, and the third-tree result (no finding names
    `.qfai/steering/`) belongs to `TDD-0071`. Neither is asserted here.
- Handoff: ready. To `/qfai-implement` Phase Red step 3b, at stage gate P1c,
  naming this row. Branch `observed-red`, so
  step 3b writes `todo -> red` from this entry and continues at Phase Green; no
  second RED is taken.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from
    the row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0004.md#tdd-0069`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are
    under `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (qa-gatekeeper#1, RED phase) is the row-level line
    above.
  - No production file is changed by this stage. The surface the GREEN changes is
    `validateTddList` in `packages/qfai/src/core/validators/tddList.ts`, the row’s
    `Owning module`.

#### Round 1

- Round 1: RED revision: working-tree+818c7ff482f03603ef6bd7274df9467e1a343433f9e477c424d4f0db1ea53e6f
- Round 1: RED test hash: 06c9cbe589a9420a99c0a079761ba5eacdbe8d2d70ededb1b07142afdbd64876
  (lstat-mode form `ddf4addab620b7b72d05acdaf700a6b94a86a26a9bb51267ccdf4626fdddba10`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts -t "TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error"`
- Round 1: RED result: exit 1; 1 test failed. The approved RED, run at 2026-09-23T23:23:00Z after the
  scope PASS at 23:21:57Z. Before the run, the test hash recomputed to the
  approved `ddf4adda…dba10`, and the tree address was taken twice with equal
  results; HEAD `536fc4ddd`. Exit 1; Test Files 1 failed (1); Tests 1 failed (1).
  The failure is the absence assertion at line 118, inside the selector:
  `rowErrors` holds `QFAI-TDDLIST-015`, the finding that requires a
  `.qfai/steering/` entry for a spec with a `blocked` row. The read control at
  line 111 passed before it. Vitest's report follows verbatim; the 11 finding
  lines `runValidate` printed to stdout before it are omitted.

```text
 ❯ |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts (1 test | 1 failed) 404ms
     × TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error 401ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error
AssertionError: expected [ 'QFAI-TDDLIST-015' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "QFAI-TDDLIST-015",
+ ]

 ❯ tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts:118:23
    116|       )
    117|       .map((issue) => issue.code);
    118|     expect(rowErrors).toEqual([]);
       |                       ^
    119|   });
    120| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  08:23:06
   Duration  6.51s (transform 4.23s, setup 147ms, import 4.96s, tests 404ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions neutralised as below,
  the RED command re-run unchanged, exit 0. The runner names no test on a pass;
  the command's `-t` filter pins the selector, and `Tests 1 passed (1)` with no
  skipped or zero-selected marker shows it executed. The test was restored at
  once: it compared byte-equal to the copy taken before the strip, the test hash
  recomputed to `ddf4adda…dba10`, and the tree address returned to the RED
  revision.

```diff
@@ -108,13 +108,13 @@ describe("TC-0004-0076: a blocked row needs only its Blocked-By", () => {
         issue.texts.includes(LEDGER) &&
         issue.texts.some((text) => text.includes("(row 2)")),
     );
-    expect(controlReads, "the ledger check read this ledger's Blocked-By cells").toHaveLength(1);
+    void [controlReads, "the ledger check read this ledger's Blocked-By cells", expect];

     const rowErrors = issues
       .filter(
         (issue) => issue.severity === "error" && issue.texts.some((text) => NAMES_ROW_1.test(text)),
       )
       .map((issue) => issue.code);
-    expect(rowErrors).toEqual([]);
+    void [rowErrors, []];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts -t "TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error"
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  08:23:27
   Duration  3.79s (transform 2.43s, setup 84ms, import 3.11s, tests 296ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). All three mutations land in the row's
  `Owning module`, `packages/qfai/src/core/validators/tddList.ts`, and each is
  reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts -t "TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error"`
  1. In `validateTddList`, drop `if (parsed.ok) continue;` from the blocked-row
     loop, so a well-formed `Blocked-By` is reported too. The selector must fail
     on `rowErrors` with `TDDLIST_BLOCKED_MISSING_REF`.
  2. Remove `todo` from `BLOCKED_DEPARTURE_STATUSES`. `parseBlockedBy` then
     rejects `— blocked at todo`, and the selector must fail on `rowErrors`.
  3. In `validateTddList`, after the GREEN has removed the steering requirement
     (Check 8b, `blockedWithoutWorklog` / `readSteeringIndex`), re-add one
     `QFAI-TDDLIST-015` finding at `error` for a spec whose ledger holds a
     `blocked` row and whose `.qfai/steering/` holds no entry for it, naming the
     blocked row labels (`row 1, row 2` on this fixture). The selector must fail
     on `rowErrors` with `QFAI-TDDLIST-015`. This is the mutation that breaks
     what this round’s GREEN changes. Mutations 1 and 2 break `parseBlockedBy`
     handling, which the GREEN leaves alone.
  - Advisory from `qa-gatekeeper`#1 on mutation 1: dropping
    `if (parsed.ok) continue;` leaves a TypeScript type error, because
    `parsed.reason` is then read on the success branch. Vitest transforms with
    esbuild, which strips types without checking them, so the run still reaches
    the assertion. At GREEN, record that mutation 1 fails on the line-118
    assertion (`expected [ 'TDDLIST_BLOCKED_MISSING_REF' ] to deeply equal []`),
    not on a transform or type error.
  - Numbering: the `delivery-planner` PASS at 23:21:57Z says mutation 3 is gone
    and two remain. That mutation 3 was the earlier one, a finding naming
    `.qfai/steering/` that failed only `steeringTexts`. The mutation 3 above is a
    different one, which `qa-gatekeeper`#1 required after that PASS, and it fails
    on `rowErrors`.
- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+818c7ff482f03603ef6bd7274df9467e1a343433f9e477c424d4f0db1ea53e6f at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (23:21:57Z) covers test hash `ddf4adda…dba10`.
    The RED ran on that hash after the PASS (vitest start 08:23:06 local, 23:23:06Z), and
    the test file had not been run before it. The fixture lookup ran the built CLI on a
    scratch tree, which is not a run of this test.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest
    (`ddf4adda…dba10`; `tempTree.ts` imports only `node:fs/promises`) and the tree address
    (equal to `Round 1: RED revision`). `packages/qfai/src` is unchanged against HEAD, the
    test file is untracked, and the ledger row is `todo`.
  - Observation: re-running the RED command reproduced the failure. The module loads, and
    no seam was used. The failure is the assertion at line 118 inside the selector,
    `expected [ 'QFAI-TDDLIST-015' ] to deeply equal []`. The code is the finding that
    demands a `.qfai/steering/` entry for the blocked rows `(row 1, row 2)`, so the message
    names the predicate BR-0004-0035 removes. The line 111 control passed first, and the
    selector has one entry.
  - Strip: the diff reaches only the `Test file`. It keeps `runValidate`, the report read and
    both filters, and leaves `expect` referenced. The command is unchanged. On a pass,
    vitest 4.1.11 prints no test names. The command's `-t` filter pins the selector, the
    file holds exactly one `it` (the selector), and `Tests 1 passed (1)` carries no
    skipped or no-tests marker. A filter that matched nothing reports the test as skipped.
    That is sufficient evidence that the selector ran, and the name is not required. Adding
    a flag to print it would change the command.
  - Scope against TC-0004-0076 (first tree) / EX-0004-0044 first clause / AC-0004-0041:
    the fixture matches EX-0004-0044 as amended (`spec-0004:TDD-0001 — blocked at todo`,
    no `.qfai/steering/`). The only result asserted is "no error-severity finding for the
    row". The D4 fields and backslash normalisation match S1, and the D5 control (row 2,
    `(row 2)` only) cannot be satisfied by a combined label.
  - Oracle proof plan: both mutations are in `tddList.ts`, fail on `rowErrors` (the check
    emits `TDDLIST_BLOCKED_MISSING_REF` per row with a `(row N)` label, so the control
    still holds), and name the GREEN command. That is acceptable as a plan. Mutation 1
    leaves a type error that esbuild strips (`parsed.reason` on the `ok` branch). At GREEN
    it must show the line 118 assertion failing, not a transform error.
  - Required before the build gate (does not affect this PASS): add a third mutation
    against the code this round's GREEN writes. Both planned mutations break
    `parseBlockedBy`, which this round does not change. The GREEN removes the steering
    requirement (Check 8b, `blockedWithoutWorklog` / `readSteeringIndex`), and
    `round-evidence.md` takes the proof "against the code this round wrote". So restore
    that requirement in `validateTddList`: one `QFAI-TDDLIST-015` `error` naming the
    blocked rows' labels when no steering entry exists. The selector must fail on
    `rowErrors`. Without it, the build gate has no evidence that the test discriminates
    the change the row exists for. The natural RED shows the test failed before the
    change, not that it depends on it afterwards.

- Step 3b (`/qfai-implement`, run started 2026-09-23T21:11:02.206Z, backend-engineer
  `impl-row-0067`, implement session S2): entry verified before the status write.
  Branch `observed-red`; the selector is one entry over one boundary; the RED
  test hash recomputed to `ddf4adda…dba10`. The tree address had moved from the
  `Round 1: RED revision` to `working-tree+a495f6e2…a4b`. The only change
  between the two is `TDD-0071`'s new test file and its `tsconfig.tests.json`
  entry; no production file and no file of this row's manifest changed. Ledger
  write at 2026-09-23T23:51:31Z: `todo -> red`, `Test file` and `Selector`
  copied from the row identity above. `Evidence` stays `-` at `red`.
- Production change (Phase Green step 1), against HEAD `536fc4ddd`, per
  implement S2 decisions 38-41:
  - `packages/qfai/src/core/validators/tddList.ts`: removed the Check 8b block
    "a stopped ledger owes a steering record", `blockedRowLabels`,
    `blockedWithoutWorklog`, `readSteeringIndex`, `BlockedWorklogGate`,
    `StoppedSpecIndex`, the one-time steering read and `gate` object in
    `validateTddList`, the `gate` parameter of `validateSpecTddList`, and the
    `worklogEntries.js` and `PROJECT_STEERING_DIR` imports. The Check 8b block
    "parked items must be visible in CI" and `TDDLIST_BLOCKED_MISSING_REF` are
    unchanged.
  - `packages/qfai/src/core/worklogEntries.ts`: deleted; no importer is left.
  - `packages/qfai/src/cli/commands/validate.ts`: the `QFAI-TDDLIST-015` and
    `QFAI-TDDLIST-016` expected-state entries and their comments removed.
  - `packages/qfai/src/core/emittedRuleCodes.ts`: regenerated; `QFAI-TDDLIST-015`
    and `QFAI-TDDLIST-016` leave both lists (500 codes).
  - `packages/qfai/tests/core/tddListBlockedStatus.test.ts`: the
    `QFAI-TDDLIST-015` describe block removed, with the helpers only it used (the
    `node:fs/promises` mock and its comment, `SteeringSeed`, the `steering`
    parameter and `steeringIsRegularFile` option of `run()`, `entry()` and its
    comment) and the imports that became unused (`vi`, `type * as FsPromises`,
    `HANDOFF_REQUIRED_SECTIONS`).
- Round 1: Revision: working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts -t "TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error"`
- Round 1: GREEN result: exit 0; 1 test passed. The restored run after all three mutations were
  reverted. The GREEN file was byte-equal to its copy, the tree address equal to
  `Round 1: Revision` before the first mutation and after each revert, and the
  RED test hash still `ddf4adda…dba10`. `--reporter=verbose` is added to the
  RED command because vitest 4, which the merge of main brought, no longer
  prints test names by default; the selector is unchanged. The finding lines
  `runValidate` printed before the report are omitted.
  The tree this address names also holds `/qfai-atdd`'s new `TDD-0068` test
  (`spec0004WithdrawnSchemaFinding.test.ts`) and its `tsconfig.tests.json`
  entry, written before these runs. Neither is in this row's manifest.

```text
 ✓ |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error 732ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  08:56:37
   Duration  8.87s (transform 6.56s, setup 82ms, import 7.60s, tests 734ms, environment 0ms)

exit=0
```

- Round 1: Oracle proof: `cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts -t "TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error"` — exit 1; selector assertion failed.
  The three planned mutations, each applied to a copy of
  the GREEN `packages/qfai/src/core/validators/tddList.ts` and reverted by
  restoring that copy. Command for all three: the GREEN command above. Each
  fails on the absence assertion at line 118 with an `AssertionError`, not on a
  transform or type error.
  Record note: the scope approval of the revised test says "mutation 3 is gone".
  That sentence refers to an earlier mutation 3 of the plan, not to the mutation
  3 below, which `qa-gatekeeper`#1 required before the build gate.
  `/qfai-atdd` corrects its own record (implement S2 decision 45).
  1. Drop `if (parsed.ok) continue;` from the blocked-row loop in
     `validateSpecTddList`, which `validateTddList` calls. A well-formed
     `Blocked-By` is then reported too. Exit 1 at line 118, received
     `[ "TDDLIST_BLOCKED_MISSING_REF" ]`. The type error the gatekeeper
     predicted is not reached: vitest transforms without type checking, and the
     run reaches the assertion.

```diff
@@ -6192,7 +6192,6 @@ async function validateSpecTddList(
     if (cell(ref, "Status").toLowerCase() !== "blocked") continue;
     const blockedBy = cell(ref, BLOCKED_BY_COLUMN);
     const parsed = parseBlockedBy(blockedBy);
-    if (parsed.ok) continue;

     const where = `in tdd/test-list.md for spec-${specNumber} (${ref.label})`;
     let message: string;
```

```text
 × |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error 663ms
   → expected [ 'TDDLIST_BLOCKED_MISSING_REF' ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error
AssertionError: expected [ 'TDDLIST_BLOCKED_MISSING_REF' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "TDDLIST_BLOCKED_MISSING_REF",
+ ]

 ❯ tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts:118:23
    116|       )
    117|       .map((issue) => issue.code);
    118|     expect(rowErrors).toEqual([]);
       |                       ^
    119|   });
    120| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  08:55:13
exit=1
```

  2. Remove `todo` from `BLOCKED_DEPARTURE_STATUSES`, so `parseBlockedBy`
     rejects `— blocked at todo`. Exit 1 at line 118, received
     `[ "TDDLIST_BLOCKED_MISSING_REF" ]`.

```diff
@@ -229,7 +229,8 @@ const BR_ID_COLUMN = "BR-ID";
  */
 const BLOCKED_DEPARTURE_STATUSES = new Set(
   Array.from(VALID_STATUSES).filter(
-    (status) => status !== "blocked" && status !== "done" && status !== "exception",
+    (status) =>
+      status !== "blocked" && status !== "done" && status !== "exception" && status !== "todo",
   ),
 );

```

```text
 × |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error 646ms
   → expected [ 'TDDLIST_BLOCKED_MISSING_REF' ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error
AssertionError: expected [ 'TDDLIST_BLOCKED_MISSING_REF' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "TDDLIST_BLOCKED_MISSING_REF",
+ ]

 ❯ tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts:118:23
    116|       )
    117|       .map((issue) => issue.code);
    118|     expect(rowErrors).toEqual([]);
       |                       ^
    119|   });
    120| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  08:55:41
exit=1
```

  3. Restore the steering requirement this round removed: at the site of the
     removed Check 8b block, one `QFAI-TDDLIST-015` at `error` naming the
     blocked rows' labels when no `.qfai/steering/` entry names the spec. This
     is the mutation that breaks what this round's GREEN changed. Exit 1 at line
     118, received `[ "QFAI-TDDLIST-015" ]`.

```diff
@@ -6226,6 +6226,20 @@ async function validateSpecTddList(
     );
   }

+  {
+    const labels = [...ledgerRows()]
+      .filter((ref) => cell(ref, "Status").toLowerCase() === "blocked")
+      .map((ref) => ref.label);
+    const { readdir, readFile } = await import("node:fs/promises");
+    const dir = path.join(root, ".qfai", "steering");
+    const names = await readdir(dir).catch((): string[] => []);
+    const texts = await Promise.all(names.map((n) => readFile(path.join(dir, n), "utf-8")));
+    if (labels.length > 0 && !texts.some((x) => x.includes(`spec-${specNumber}`))) {
+      issues.push(
+        issue("QFAI-TDDLIST-015", `blocked rows (${labels.join(", ")}) have no steering entry`, "error", relPath),
+      );
+    }
+  }
   // Phase 2 – Check 8: Exception rows must have a DR-ID that resolves
   const isDrDeclared = await buildDrDeclarationResolver(specDir, specsRoot, recordIds);
   {
```

```text
 × |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error 840ms
   → expected [ 'QFAI-TDDLIST-015' ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts > TC-0004-0076: a blocked row needs only its Blocked-By > TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error
AssertionError: expected [ 'QFAI-TDDLIST-015' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "QFAI-TDDLIST-015",
+ ]

 ❯ tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts:118:23
    116|       )
    117|       .map((issue) => issue.code);
    118|     expect(rowErrors).toEqual([]);
       |                       ^
    119|   });
    120| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  08:56:12
exit=1
```

- GREEN tree checks: `npx tsc -p tsconfig.json --noEmit` and
  `npx tsc -p tsconfig.tests.json --noEmit` from `packages/qfai`, both exit 0
  with no diagnostic; `node scripts/generate-emitted-rule-codes.mjs --check`
  printed `src/core/emittedRuleCodes.ts is in sync (500 codes).`;
  `eslint --max-warnings 0` and `prettier --check` over the changed files, both
  exit 0.
- `qa-gatekeeper` (routing phase `build`), qa-gatekeeper#2 on the Round 1 GREEN and Oracle
  proof: PASS (instance `atdd-red-gate`, reviewed revision working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Freshness: the current tree is `working-tree+1a69d4ec…e260a`. The only difference from
    `Round 1: Revision` is `/qfai-atdd`'s rename of the `TDD-0068` `it`, and the gatekeeper
    proved this. It rebuilt the pre-rename file by reversing the rename, which hashes to the
    `b52a9713…d416b9` the scope PASS covered. With that file's bytes substituted, the
    address recomputes to `Round 1: Revision` exactly. That file is in neither row's
    manifest.
  - Command: `Round 1: GREEN command` is the RED command with `--reporter=verbose` added.
    The file and the `-t` selector are unchanged, so the tests that run are unchanged, and
    the command shape is the same. The flag only makes vitest 4 print the passing test's
    name. Every Oracle proof run used exactly the recorded GREEN command. Accepted. (The
    flag was not needed: at the RED gate the `-t` filter plus a success line with no
    skipped marker was already accepted.)
  - GREEN: the gatekeeper re-ran the GREEN command, exit 0, and the output names this row's
    selector as passing (1 test). The RED test hash still recomputes to `ddf4adda…dba10`.
  - Oracle proof: the gatekeeper applied each recorded diff to a copy of the GREEN
    `tddList.ts`, ran the GREEN command, and restored the file byte for byte. The address
    returned to `Round 1: Revision` (same substitution as above). Each failed at line 118
    with an `AssertionError`:
    1. `[ 'TDDLIST_BLOCKED_MISSING_REF' ]`. It reached the assertion, not a type error.
    2. `[ 'TDDLIST_BLOCKED_MISSING_REF' ]`.
    3. `[ 'QFAI-TDDLIST-015' ]`.
    All three name this row's selector, and none is a load failure.
  - The condition set at the RED gate is met: mutation 3 breaks what this round's GREEN
    changed. It re-imposes the steering requirement for a blocked row at the site of the
    removed Check 8b block. Mutations 1 and 2 add evidence that the test also depends on
    `parseBlockedBy` accepting a well-formed `Blocked-By`.
  - Mutation site: `validateSpecTddList` is module-private to `tddList.ts`, the row's
    `Owning module`, and `validateTddList` calls it. Mutation 3 sits where this round's
    GREEN removed the block, and 1 and 2 are in the same module's blocked-row check.
    Accepted, on the same reading as `TDD-0067`: the owned call site under the named entry
    point.

- Refactor (Phase: Refactor step 1): no change. The GREEN is a removal, and
  nothing it left needs renaming, merging or moving.
- Relevant suite resolution: the reverse walk cannot be completed, as recorded
  for `TDD-0067`, so the local per-row set the user chose (AskUserQuestion,
  2026-09-23) applies. The full package suite runs on CI at the final head,
  where every row's checkpoint closes (the user's stop-at-`refactor`
  decision). This deviates from the widen-to-package rule of
  `references/relevant-test-suite.md`. The set is implement S2 decision 47:
  - the 54 test files whose static imports reach `src/core/validators/tddList.ts`,
    the deleted `src/core/worklogEntries.ts` (no importer is left),
    `src/core/emittedRuleCodes.ts` or `src/cli/commands/validate.ts`, recomputed
    on this tree. That includes both rows' tests, `tddListBlockedStatus.test.ts`
    and `spec0004WorklogSurfaceRemoval.test.ts`;
  - `ruleCodeUniqueness`, `validators-are-wired`, `issueCatalogHasEmitters`,
    `generateEmittedRuleCodes` and `implementWorklogObligation`, which read
    source rather than import it. `gateGroupCoverage`, `findingCodeGrammar` and
    `issueCodeUniqueness` are already in the static-import set;
  - excluded: `tests/integration/spec0004WithdrawnSchemaFinding.test.ts`, which
    imports `cli/commands/validate.ts`. It holds `TDD-0068`'s deliberate RED,
    under that row's own RED gate, and passing is not what it owes yet.
  59 files in all.
- Refactor verify command: `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`. From the repository root, in this order:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. `./node_modules/.bin/eslint --max-warnings 0` and
     `./node_modules/.bin/prettier --check` over
     `packages/qfai/src/core/validators/tddList.ts`,
     `packages/qfai/src/cli/commands/validate.ts`,
     `packages/qfai/src/core/emittedRuleCodes.ts` and
     `packages/qfai/tests/core/tddListBlockedStatus.test.ts`
  5. The 59-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/assets/implementWorklogObligation.test.ts tests/assets/reviewFixStatus.test.ts tests/assets/tddLedgerTemplate.test.ts tests/cli/commands/validate.test.ts tests/cli/commands/validateTextFormat.test.ts tests/cli/githubAnnotationCap.test.ts tests/cli/githubAnnotationEscaping.test.ts tests/cli/report.test.ts tests/cli/validateRunIncomplete.test.ts tests/core/atddUnitComponentScope.test.ts tests/core/coverageLevelClassification.test.ts tests/core/evidenceRevisionStale.test.ts tests/core/findingCodeGrammar.test.ts tests/core/gateGroupCoverage.test.ts tests/core/issueCodeUniqueness.test.ts tests/core/layerCoverage.test.ts tests/core/specScopeValidate.test.ts tests/core/tddCoverageTargetsShared.test.ts tests/core/tddExceptionRowRollCall.test.ts tests/core/tddLedgerLaterTableChecks.test.ts tests/core/tddLedgerRegionMasking.test.ts tests/core/tddLevelCoverageRowCrosswalk.test.ts tests/core/tddLevelUndeclaredMigration.test.ts tests/core/tddList.test.ts tests/core/tddListBlockedStatus.test.ts tests/core/tddListBrRefKey.test.ts tests/core/tddListDecisionRecord.test.ts tests/core/tddListEvidence.test.ts tests/core/tddListExceptionVisibility.test.ts tests/core/tddListObligationColumns.test.ts tests/core/tddListOwningModule.test.ts tests/core/tddListSpecStatus.test.ts tests/core/tddListSplitBoundary.test.ts tests/core/tddListStaleStatus.test.ts tests/core/tddListTier.test.ts tests/core/tddListUpstreamReset.test.ts tests/core/testCaseTableResolution.test.ts tests/core/validationTimings.test.ts tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/integration/cli/commands/validate.legacyPathEvidenceGate.test.ts tests/integration/cli/commands/validate.legacyValidateJsonConfig.test.ts tests/integration/cli/commands/validate.profileCoverageNotice.test.ts tests/integration/cli/commands/validate.reviewArtifactsProfiles.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/integration/cli/commands/validate.strictFailOnPrecedence.test.ts tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts tests/integration/cli/commands/validate.tddProfileTableArity.test.ts tests/integration/cli/commands/validateSaasPackage.passes.test.ts tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts tests/integration/spec0004ProfileSuffixedValidate.test.ts tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/scripts/generateEmittedRuleCodes.test.ts tests/unit/issueCatalogHasEmitters.test.ts tests/unit/validators-are-wired.test.ts tests/validators/importLite.test.ts tests/validators/ruleCodeUniqueness.test.ts
```

- Refactor verify result: every command exited 0. The type checks printed no
  diagnostic. The drift check printed
  `src/core/emittedRuleCodes.ts is in sync (500 codes).` eslint and prettier
  reported no finding. The vitest run (start 09:15:02 local) printed
  `Test Files  59 passed (59)`, `Tests  1656 passed | 7 skipped (1663)` and
  exit 0. Its verbose output names this row's selector as passed:
  `TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error`. It also names `TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/`, `TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path` (TDD-0071 and TDD-0067), and the
  selectors of spec-0002 `TDD-0012` and spec-0013 `TDD-0022` as passed. The 7
  skipped tests are in `tddListDecisionRecord`, `tddListEvidence` and
  `validate.profileCoverageNotice`, and none carries a selector of these rows.
  Tree during the run: `/qfai-atdd` wrote two new spec-0003 test files
  (`spec0003InitWorklogSurface.test.ts`, `spec0003WithdrawnSchemaRetirement.test.ts`)
  and their `tsconfig.tests.json` entries at 09:17:31-37 local, while the run
  was in progress. None is in the 59-file list, and vitest does not read
  `tsconfig.tests.json`, so no input of this run changed. The revision below is
  the address taken at 09:11:29 local, after the last change before the run
  (`TDD-0068`'s test, 09:09:42), and it is the tree steps 1-4 and the start of
  step 5 ran on. The address after the run is
  `working-tree+e5d63a1bc487af979ea2745e76f9672c10ff50edf3fbc50ac5b407bb60184502`.
- Refactor verify revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924175617131 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: ad27d9d18020da94915c336a48356df38ceec99e8550ea18f4340baeed4d20a3
- Prototype parity: n/a (not UI-affecting)
- Prototype parity rationale: `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a.
- Historical Prototype parity reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Checkpoint timing: this row stops at `refactor`, and its checkpoint fields
  and seal are written from the final head's CI run (the user's decision,
  recorded in `### TDD-0067`).
- Historical review record: The verdicts, reviewed revisions, and audited hashes below belong to earlier evidence and do not attest to this revised section.

- Historical Code quality review: PASS (implementation-reviewer, instance `impl-ir-0067`, 2026-09-23T23:59Z). Diff reviewed: `git diff 536fc4ddd` over `src/core/validators/tddList.ts`, the deleted `src/core/worklogEntries.ts`, `src/cli/commands/validate.ts`, the regenerated `src/core/emittedRuleCodes.ts`, `tests/core/tddListBlockedStatus.test.ts`, the new `tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts` and its `tsconfig.tests.json` entry. The removal matches the plan's `tddList.ts` list and S2 decisions 38–47, and adds nothing. The "parked items must be visible in CI" Check 8b, `TDDLIST_BLOCKED_MISSING_REF` and `parseBlockedBy` are intact. No file under `src`, `tests` or `scripts` still names `worklogEntries`, `collectStoppedSpecIds`, `collectWorklogEntries`, `unreadableWorklogEntries`, `WORKLOG_STOP_KINDS`, `blockedWithoutWorklog`, `readSteeringIndex`, `BlockedWorklogGate` or `StoppedSpecIndex`. `QFAI-TDDLIST-015` / `-016` remain only in the shipped `qfai-implement` skill text and `implementWorklogObligation.test.ts`, which decision 43 defers. `PROJECT_STEERING_DIR` and `HANDOFF_REQUIRED_SECTIONS` stay for the `init.ts` seed, which spec-0003 removes later. `assistantPaths.ts`, the legacy `.qfai/assistant/steering/` code, `handoffUpgrade.ts`, `.qfai/handoff.yaml` and `R-HANDOFF-SCHEMA-DRIFT` are untouched. No bare `as`, no dropped promise and no internal id in `src`. Re-run by this reviewer at `536fc4ddd` plus the working tree: both type checks (`tsc -p tsconfig.json` and `tsc -p tsconfig.tests.json`, `--noEmit`), exit 0 with no diagnostic; this row's selector and `TDD-0071`'s, 2 passed. No blocking finding. Advisory, `defect:code-quality`: `ReportedIssue`, `stringsOf`, `reportedIssues` and the stub-pack writer loop are now copied in four spec-0004 integration files (`spec0004WorklogSurfaceRemoval`, `spec0004BlockedRowNeedsOnlyBlockedBy`, `spec0004SteeringUnreadableBlockedRow`, `spec0004WithdrawnSchemaFinding`), past the third-occurrence limit on sharing. They are acceptance tests that `/qfai-atdd` owns, so the extraction into `tests/helpers/` is that stage's to make. Advisory, `record:QFAI-TDDLIST-008`: this entry's `TC-ref` holds `TC-0004-0076 (first tree; boundary ...)`, not the ledger's `TC-0004-0076`, so gate item 10's identity check refuses the row at `done` until the value is exactly the ledger's.
- Historical Code quality reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Historical Code quality audited evidence hash: 931c4de428d3c43506c726059805ffaab3dbf9066d449973174cb5d26afc07bc
- Historical Round 1: reviewer verdict: completion-reviewer PASS (completion-reviewer
  `impl-cr-0067`, item review for `refactor`, reviewed revision working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
  at HEAD 536fc4ddda6894af728745a0765999aa82438ec5). Pinned to that revision.
  - Tree: at review time the address was `working-tree+e5d63a1b…184502`.
    Leaving out the two spec-0003 test files `/qfai-atdd` added and their two
    `tsconfig.tests.json` lines, it recomputes to the reviewed revision exactly.
    The RED test hash recomputes to `ddf4adda…dba10`.
  - Re-run: the GREEN command names the selector as passed. Both type checks
    exit 0.
  - Spec alignment: the selector covers the first tree of TC-0004-0076, the
    first clause of EX-0004-0044 and of AC-0004-0041, and BR-0004-0035 as
    amended by `CR-20260923-0011`. The production change is the one
    `10_Plan.md` ("Removing the work-log surface") lists for `tddList.ts` and
    `worklogEntries.ts`, as implement S2 decisions 38-47 settled it. The other
    Check 8b block and `TDDLIST_BLOCKED_MISSING_REF` are unchanged, and
    `tddList.ts` no longer reads `.qfai/steering/`.
  - Grilling: S2 ended `adopted` before the first production write, and its 10
    decisions are Work Orders rows 38-47.
  - Not judged: the checkpoint, which closes on the final head's CI by the
    user's decision, and the P5/P6 inputs.
  - Advisory (record): no `## Cross-spec obligations` entry names this row. Its
    change (`tddList.ts`, the deleted `worklogEntries.ts`,
    `cli/commands/validate.ts`, `emittedRuleCodes.ts`) is not the change the
    `TDD-0067` entries describe.

- Spec review: PASS
- Spec reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Spec audited evidence hash: a9f6936fee6045a7f91517c5c927fc5d40c05f23f56a12674dcfa8cce51a670a
- Spec review pack: .qfai/review/review-20260924175617131 <!-- qfai:not-a-citation -->
- Spec review pack seal: ad27d9d18020da94915c336a48356df38ceec99e8550ea18f4340baeed4d20a3
- Code quality review: PASS
- Code quality reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Code quality audited evidence hash: a9f6936fee6045a7f91517c5c927fc5d40c05f23f56a12674dcfa8cce51a670a
- Code quality review pack: .qfai/review/review-20260924175617131 <!-- qfai:not-a-citation -->
- Code quality review pack seal: ad27d9d18020da94915c336a48356df38ceec99e8550ea18f4340baeed4d20a3
- Prototype parity reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts --reporter=verbose; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — file-scoped run: 1 file, 1 test(s) passed, selector named in verbose output; CI run https://github.com/aganesy/QFAI/actions/runs/36026684599: all nine test slices and ci-pass passed at b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d.
- Checkpoint verification revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Checkpoint verification seal: 89031a2682649ca0d495f9abcdb671a7e34af947f73ccf29886660111bb230a1

### TDD-0071

- TDD-ID: TDD-0071
- Layer: integration
- Test file: packages/qfai/tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts
- Selector: TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/
- TC-ref: TC-0004-0076
- Boundary: third tree; boundary `steering-unreadable`
- EX-ref: EX-0004-0044, third clause; AC-ref: AC-0004-0041, third clause;
  BR-ref: BR-0004-0035 ("Ledger checks do not read `.qfai/steering/`"), as
  amended by `CR-20260923-0011`
- qa-gatekeeper: PASS x2 (instance `atdd-red-gate`, Round 1 — qa-gatekeeper#1, RED phase gate before the production change, reviewed revision working-tree+a495f6e2660353a192023607a231d309b94c85e5b7733dc0eb03deefca210a4b at HEAD 536fc4ddda6894af728745a0765999aa82438ec5; qa-gatekeeper#2, build-phase GREEN + oracle proof, reviewed revision working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Order: taken before `TDD-0069`'s GREEN, by the implement stage's griller
  session S2 (adopted). That GREEN also makes this row pass, and the
  satisfied-by-a-sibling branch needs the sibling `done`, which the
  stop-at-`refactor` decision rules out until the final head.
- Own file: the test is not a second `it` in
  `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts`. `TDD-0069`'s RED test hash
  covers that whole file, so any edit to it would void a RED the gatekeeper has
  passed. That hash was recomputed after this file was added and is unchanged
  (`ddf4adda…dba10`). The file is added to `packages/qfai/tsconfig.tests.json`.
  This departs from S1 D3's file list for TC-0004-0076, for that reason.
- Branch: observed-red (branch 1), confirmed by the RED below. The surface
  exists and implements the predicate wrongly: `validateTddList` in
  `packages/qfai/src/core/validators/tddList.ts` reads `.qfai/steering/` through
  `readSteeringIndex` whenever a ledger holds a `blocked` row. An entry it cannot
  read becomes `QFAI-TDDLIST-016` at `error`, naming the file. No seam is needed:
  the test imports only `runValidate`, which exists.
- Fixture: a fresh temporary directory holding the same `spec-0001` stub pack and
  two-row ledger as `TDD-0069` (row 1 `TDD-0002`, `Blocked-By`
  `spec-0004:TDD-0001 — blocked at todo`; row 2 `TDD-0003`, the D5 control), and
  one file, `.qfai/steering/unreadable.md`.
- Unreadable file (S1 D6): on win32, `icacls <file> /deny *S-1-1-0:(R)` (the
  `Everyone` SID, independent of the system locale); elsewhere, `chmod 000`.
  The test first asserts that `readFile` rejects, naming the platform in the
  assertion message. In a `finally`, it removes the deny (`icacls /remove:d`) or
  restores mode `0644` before the tree is deleted. Host: Windows 11 (win32),
  Node.js v24.18.0.
  - Platform check, not a RED: before the test was written, the same `icacls`
    deny was applied to a scratch file outside the repository. `readFile`
    rejected with `EPERM`, `readdir` still listed the file as a file, and after
    `/remove:d` the file read back and was deleted.
  - On POSIX as root, `chmod 000` does not stop a read. The precondition
    assertion then fails before validate runs. That is a fixture failure, not an
    admissible RED, and says the host cannot run this case.
- Oracle, run under `runValidate({ profile: "tdd" })` and inspect the temporary report returned by the validation run:
  - read-proof (S1 D5): exactly one `TDDLIST_BLOCKED_MISSING_REF` whose fields
    name the ledger path and `(row 2)`;
  - absence: `expect(steeringTexts).toEqual([])`, where `steeringTexts` holds
    every `file`, `relatedFiles[]`, `refs[]`, `message` or `suggested_action`
    naming `.qfai/steering` followed by `/` or the end of the string, with `\`
    normalised to `/` (S1 D4). The first tree's result, no error for the row,
    belongs to `TDD-0069` and is not asserted here.
- Expected RED, from reading the code before the run: `QFAI-TDDLIST-016`
  names `.qfai/steering/unreadable.md`, so `steeringTexts` is non-empty.
  `QFAI-TDDLIST-015` is withheld because the index is `null`. The RED below
  matches it.
- Status: RED and its stripped run recorded under `#### Round 1`, on the test
  hash the scope PASS below approved. `qa-gatekeeper` (routing phase `red`)
  passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-23T23:40:24Z
  - Reviewed: test hash `74be7f2f…9b5768`, at tree `working-tree+cee92904…2bb2b3`,
    the single selector entry above, and the Round 1 plan below. No RED had
    been run.
  - Answer to the author's question: `rowErrors` carries the first tree's
    result, which `TDD-0069` owns. It is not part of one "raises nothing"
    boundary.
  - Reason, what the TC asks here: this row's obligation is TC-0004-0076. For
    the third tree, the TC's expected result is "no finding names
    `.qfai/steering/`", which is also EX-0004-0044's third clause.
    AC-0004-0041's "raises nothing" is stated at the TC in exactly that form.
    "No error-severity finding for the row" is the first tree's expected
    result.
  - Reason, a second boundary: `rowErrors` can fail on its own. A
    `TDDLIST_BLOCKED_MISSING_REF` on row 1 names no `.qfai/steering/` path, so
    it fails `rowErrors` while `steeringTexts` stays empty. `rowErrors` cannot
    tell whether an error on row 1 came from the unreadable file or from the
    `Blocked-By` check. So `TDD-0069`'s two Oracle proof mutations, both in
    the `Blocked-By` check, would fail this row too. The row's own mutation 2
    exists to fail `rowErrors`. This is the same split the `TDD-0069` REVISE
    made, from the other side: each tree's expected result is asserted in its
    own row.
  - The selector changes too. "Raises no error" in its name states the
    first-tree result, not this tree's precondition.
  - What holds, and needs no change:
    - The fixture: the well-formed row 1 is the TC's "first row" beside the
      unreadable file. It is a precondition of this tree, not an assertion.
    - The S1 D6 unreadable-file setup and its `readFile`-rejects precondition.
    - The `TDD-0003` control, which is a legitimate S1 D5 read-proof here. It
      shows the ledger check ran over a `blocked` row in this tree. That row
      is the condition under which the current code reads `.qfai/steering/`,
      so an empty `steeringTexts` cannot come from a check that never ran.
    - `steeringTexts` over the five S1 D4 fields, which is exactly the third
      tree's expected result. Mutation 1 makes it falsifiable.
  - Not scope, no objection: the separate test file, a departure from S1 D3
    that keeps `TDD-0069`'s hash valid, and taking this RED before
    `TDD-0069`'s GREEN. Once `rowErrors` is removed, the expected RED
    (`QFAI-TDDLIST-016` naming `.qfai/steering/unreadable.md`) still fails on
    this row's own half.
  - Not added here: a row-level error that the unreadable file causes without
    naming its path is outside TC-0004-0076 as written. If that case must be
    covered, it is a new obligation. It needs a Change Request to `/qfai-sdd`
    Phase 2b, not a wider assertion in this row.
  - To clear:
    1. Reduce the absence assertion to `expect(steeringTexts).toEqual([])`.
       Remove `rowErrors` and `NAMES_ROW_1` if nothing else uses them.
    2. Rename the `it` so the name states only this tree's result, for
       example `TC-0004-0076: a well-formed blocked row beside an unreadable
       .qfai/steering/ file: no finding names .qfai/steering/`. Update the
       Selector, the RED and GREEN commands to match.
    3. Drop mutation 2 from the Oracle proof plan.
    4. Keep the fixture, the D6 setup and the control.
    5. Record the new test hash and resubmit it for scope approval before any
       RED is run.
- Scope approval (`delivery-planner`), on the revised test:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-23T23:45:01Z
  - Covers: test hash `9f0091e362c31e1ad951b9c4821afc477f9bce996588b940bdaba64a5e06e7dc`,
    at tree `working-tree+a495f6e2…210a4b`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Reason: each item the REVISE listed is done.
    - The only absence assertion is `expect(steeringTexts).toEqual([])`.
    - `rowErrors` and `NAMES_ROW_1` are gone.
    - The `it`, the Selector and both commands now name only this tree's
      result.
    - One mutation remains. It re-adds the `QFAI-TDDLIST-016` read in
      `tddList.ts`, and it fails on `steeringTexts`.
    - The fixture, the D6 setup and the `TDD-0003` read-proof are unchanged.
  - One boundary: TC-0004-0076's third tree expects no finding naming
    `.qfai/steering/`. Every remaining assertion either checks that result or
    is a precondition of it: the D6 `readFile` rejection and the D5
    read-proof.
  - Nothing the TC does not ask: the first-tree result belongs to `TDD-0069`
    and the second-tree result to `TDD-0070`. Neither is asserted here.
  - Advisory, not scope: `ReportedIssue.severity` is still declared and filled
    in, but nothing reads it any more.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row.
  Branch `observed-red`, so step 3b writes `todo -> red` from this entry; no
  second RED is taken. The row's GREEN is taken on the tree after `TDD-0069`'s
  GREEN, which removes the steering read this row depends on (implement griller
  S2), and the GREEN entry names that `TDD-0069` round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from
    the row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0004.md#tdd-0071`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are
    under `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage. The surface the GREEN changes is
    `validateTddList` in `packages/qfai/src/core/validators/tddList.ts`, the row’s
    `Owning module`.

#### Round 1

- Round 1: RED revision: working-tree+a495f6e2660353a192023607a231d309b94c85e5b7733dc0eb03deefca210a4b
- Round 1: RED test hash: 40ae16e2047f302bb97af59c832400beea8ba2b8fc219288f7fcadd835a16709
  (lstat-mode form `9f0091e362c31e1ad951b9c4821afc477f9bce996588b940bdaba64a5e06e7dc`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts -t "TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/"`
- Round 1: RED result: exit 1; 1 test failed. The approved RED, run at 2026-09-23T23:46:13Z after the
  scope PASS at 23:45:01Z. Before the run, the test hash recomputed to the
  approved `9f0091e3…06e7dc`, and the tree address was taken twice with equal
  results; HEAD `536fc4ddd`. Host: Windows 11 (win32), Node.js v24.18.0, so the
  file was made unreadable with `icacls <file> /deny *S-1-1-0:(R)` and restored
  with `icacls <file> /remove:d *S-1-1-0`. Exit 1; Test Files 1 failed (1);
  Tests 1 failed (1). The `readFile` precondition at line 133 passed (the read
  was rejected with `EPERM`), and so did the read control at line 147. The
  failure is the absence assertion at line 152, inside the selector:
  `steeringTexts` holds the `file` and the `message` of `QFAI-TDDLIST-016`, the
  finding the ledger check raises when it cannot read an entry under
  `.qfai/steering/`. No `qfai-spec0004-steering-unreadable-*` directory was left
  in the OS temporary directory. Vitest's report follows verbatim; the 11
  finding lines `runValidate` printed to stdout before it are omitted.

```text
 ❯ |integration| tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts (1 test | 1 failed) 1101ms
     × TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/ 1096ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts > TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing > TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/
AssertionError: expected [ Array(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   ".qfai/steering/unreadable.md",
+   "`.qfai/steering/unreadable.md` could not be read — EPERM: operation not permitted, open 'C:/Users/pc/AppData/Local/Temp/qfai-spec0004-steering-unreadable-7xfGkz/.qfai/steering/unreadable.md'. Ledger validation continued, but no spec was checked for a work-log entry accounting for its blocked rows",
+ ]

 ❯ tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts:152:29
    150|         issue.texts.filter((text) => STEERING_PATH.test(text)),
    151|       );
    152|       expect(steeringTexts).toEqual([]);
       |                             ^
    153|     } finally {
    154|       await restoreRead(unreadable);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  08:46:19
   Duration  11.11s (transform 7.47s, setup 339ms, import 8.48s, tests 1.10s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: all three assertions neutralised as
  below: the `readFile` precondition keeps its read and discards the outcome,
  and the other two keep their operands. The RED command was re-run unchanged,
  exit 0. The runner names no test on a pass; the command's `-t` filter pins the
  selector, and `Tests 1 passed (1)` with no skipped or zero-selected marker
  shows it executed. The test was restored at once: it compared byte-equal to
  the copy taken before the strip, the test hash recomputed to
  `9f0091e3…06e7dc`, the tree address returned to the RED revision, and no
  temporary tree was left behind.

```diff
@@ -130,10 +130,13 @@ describe("TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing"

     await denyRead(unreadable);
     try {
-      await expect(
-        readFile(unreadable),
+      void [
+        await readFile(unreadable).then(
+          () => undefined,
+          (error: unknown) => error,
+        ),
         `${UNREADABLE} is unreadable on ${process.platform}`,
-      ).rejects.toThrow();
+      ];

       await runValidate({ root, strict: false, profile: "tdd" });
       const issues = await reportedIssues(root);
@@ -144,12 +147,12 @@ describe("TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing"
           issue.texts.includes(LEDGER) &&
           issue.texts.some((text) => text.includes("(row 2)")),
       );
-      expect(controlReads, "the ledger check read this ledger's Blocked-By cells").toHaveLength(1);
+      void [controlReads, "the ledger check read this ledger's Blocked-By cells", expect];

       const steeringTexts = issues.flatMap((issue) =>
         issue.texts.filter((text) => STEERING_PATH.test(text)),
       );
-      expect(steeringTexts).toEqual([]);
+      void [steeringTexts, []];
     } finally {
       await restoreRead(unreadable);
     }
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts -t "TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/"
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  08:47:00
   Duration  12.92s (transform 9.98s, setup 78ms, import 10.97s, tests 1.28s, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`,
  `packages/qfai/src/core/validators/tddList.ts`, and is reverted after its
  run. GREEN here is the tree after `TDD-0069`'s GREEN, which removes the
  steering read this row also depends on.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts -t "TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/"`
  1. In `validateTddList`, re-add a read of `.qfai/steering/` when a ledger holds
     a `blocked` row, and one `QFAI-TDDLIST-016` finding at `error` whose `file`
     is each entry that could not be read. The selector must fail on
     `steeringTexts` with `.qfai/steering/unreadable.md`.
- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+a495f6e2660353a192023607a231d309b94c85e5b7733dc0eb03deefca210a4b at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (23:45:01Z) covers test hash `9f0091e3…06e7dc`.
    The RED ran on that hash after the PASS (vitest start 08:46:19 local, 23:46:19Z).
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest and the tree
    address, and both equal the recorded values. `packages/qfai/src` is unchanged against
    HEAD, and `tddList.ts` still calls `readSteeringIndex`. The ledger row is `todo`.
    `TDD-0069`'s RED test hash still recomputes to `ddf4adda…dba10`, so the separate file
    left that row's passed RED valid.
  - Observation: the gatekeeper re-ran the RED command on win32. The module loads, and no
    seam was used. The `readFile` precondition (EPERM) and the line 147 control passed. The
    failure is the assertion at line 152 inside the selector: `steeringTexts` holds
    `QFAI-TDDLIST-016`'s `file` and `message` naming `.qfai/steering/unreadable.md`, the
    read BR-0004-0035 forbids. The `finally` removed the deny, and no
    `qfai-spec0004-steering-unreadable-*` directory was left behind. The selector has one
    entry.
  - Strip: the diff reaches only the `Test file`. The precondition keeps its `readFile` and
    discards the verdict. The control and the absence keep their operands, and
    `runValidate`, both filters and the `finally` restore still run. The command is
    unchanged. The file holds exactly one `it`, the `-t` filter pins it, and
    `Tests 1 passed (1)` carries no skipped or no-tests marker. That is sufficient evidence
    that the selector ran under vitest 4, as for `TDD-0069`.
  - Scope against TC-0004-0076 (third tree) / EX-0004-0044 third clause / AC-0004-0041:
    the only result asserted is "no finding names `.qfai/steering/`". It uses the S1 D4
    oracle (five fields, backslashes normalised, the `.qfai/steering(/|$)` boundary). The
    S1 D6 set-up is followed: the `Everyone` SID deny on win32, `chmod 000` elsewhere, the
    rejection asserted first, the deny removed before cleanup, and the host recorded. The
    S1 D5 control is the row-2 read-proof.
  - Order and GREEN: taking this RED before `TDD-0069`'s GREEN is sound. The tree does not
    yet make the assertion pass. The plan's single mutation re-adds the `QFAI-TDDLIST-016`
    read in `validateTddList`, which is this row's own predicate (BR-0004-0035, "ledger
    checks do not read `.qfai/steering/`") and the code `TDD-0069`'s GREEN removes. It
    names the GREEN command. That is acceptable as a plan.
  - For the build gate (does not affect this PASS): this row's round writes no production
    change of its own. Its `Round 1: GREEN` must be its own run of its GREEN command, on a
    tree after `TDD-0069`'s GREEN, and must name that round as the change that made it
    pass. The mutation must be applied to that tree and reverted to it. It must also show
    the line 152 assertion failing, not the precondition or the control.
  - Advisory: on a POSIX host running as root, `chmod 000` does not stop a read, so the
    precondition fails before validate runs. A root CI container would then fail this case
    as a fixture failure. The entry already says so. It is noted here so the final-head CI
    run is read with it in mind.
  - Advisory: the change from S1 D3's file list (a separate file) is reasoned in the entry.
    It is an agents-level amendment to a settled decision, so record it where the run
    records adopted decisions.

- Step 3b (`/qfai-implement`, run started 2026-09-23T21:11:02.206Z, backend-engineer
  `impl-row-0067`): entry verified before the status write, on the tree after
  `TDD-0069`'s GREEN, as implement S2 decision 44 orders. Branch
  `observed-red`; the selector is one entry; the RED test hash recomputed to
  `9f0091e3…e7dc`. Ledger write at 2026-09-23T23:56:58Z: `todo -> red`,
  `Test file` and `Selector` copied from the row identity above. `Evidence`
  stays `-` at `red`.
- Production change: none of this row's own. The GREEN is satisfied by
  `TDD-0069` Round 1, whose change removes the `.qfai/steering/` read from
  `validateTddList` (`readSteeringIndex` and the `QFAI-TDDLIST-016` finding
  with it). That is the read this row's RED failed on.
- Round 1: Revision: working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts -t "TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/"`
- Round 1: GREEN result: exit 0; 1 test passed on `TDD-0069` Round 1's tree, with no change
  of its own. This is the restored run after the mutation below was reverted.
  The GREEN file was byte-equal to its copy, the tree address equal to
  `Round 1: Revision`, and the RED test hash still `9f0091e3…e7dc`.
  `--reporter=verbose` is added for the reason `TDD-0069` gives.

```text
 ✓ |integration| tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts > TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing > TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/ 630ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  08:57:50
   Duration  6.23s (transform 4.16s, setup 82ms, import 5.01s, tests 633ms, environment 0ms)

exit=0
```

- Round 1: Oracle proof: `cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts -t "TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/"` — exit 1; selector assertion failed.
  The planned mutation, applied to a copy of the GREEN
  `packages/qfai/src/core/validators/tddList.ts` and reverted by restoring that
  copy. It re-adds a `.qfai/steering/` read when the ledger holds a `blocked`
  row, and one `QFAI-TDDLIST-016` at `error` whose `file` is each entry that
  could not be read. It sits at the site of the removed Check 8b block in
  `validateSpecTddList`, which `validateTddList` calls. Command: the GREEN
  command above. Exit 1 at line 152, the `steeringTexts` absence assertion. The
  precondition (`readFile` rejects on the fixture file) and the read control at
  line 147 passed before it.

```diff
@@ -6226,6 +6226,16 @@ async function validateSpecTddList(
     );
   }

+  if ([...ledgerRows()].some((ref) => cell(ref, "Status").toLowerCase() === "blocked")) {
+    const { readdir, readFile } = await import("node:fs/promises");
+    const dir = path.join(root, ".qfai", "steering");
+    for (const name of await readdir(dir).catch((): string[] => [])) {
+      const rel = `.qfai/steering/${name}`;
+      await readFile(path.join(dir, name), "utf-8").catch(() => {
+        issues.push(issue("QFAI-TDDLIST-016", `${rel} could not be read`, "error", rel));
+      });
+    }
+  }
   // Phase 2 – Check 8: Exception rows must have a DR-ID that resolves
   const isDrDeclared = await buildDrDeclarationResolver(specDir, specsRoot, recordIds);
   {
```

```text
 × |integration| tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts > TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing > TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/ 485ms
   → expected [ Array(2) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts > TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing > TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/
AssertionError: expected [ Array(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   ".qfai/steering/unreadable.md",
+   ".qfai/steering/unreadable.md could not be read",
+ ]

 ❯ tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts:152:29
    150|         issue.texts.filter((text) => STEERING_PATH.test(text)),
    151|       );
    152|       expect(steeringTexts).toEqual([]);
       |                             ^
    153|     } finally {
    154|       await restoreRead(unreadable);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  08:57:26
exit=1
```
- `qa-gatekeeper` (routing phase `build`), qa-gatekeeper#2 on the Round 1 GREEN and Oracle
  proof: PASS (instance `atdd-red-gate`, reviewed revision working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Freshness: the current tree is `working-tree+1a69d4ec…e260a`. The only difference from
    `Round 1: Revision` is `/qfai-atdd`'s rename of the `TDD-0068` `it`, and the gatekeeper
    proved this. It rebuilt the pre-rename file by reversing the rename, which hashes to the
    `b52a9713…d416b9` the scope PASS covered. With that file's bytes substituted, the
    address recomputes to `Round 1: Revision` exactly. That file is in neither row's
    manifest.
  - Command: `Round 1: GREEN command` is the RED command with `--reporter=verbose` added.
    The file and the `-t` selector are unchanged, so the tests that run are unchanged, and
    the command shape is the same. The flag only makes vitest 4 print the passing test's
    name. Every Oracle proof run used exactly the recorded GREEN command. Accepted. (The
    flag was not needed: at the RED gate the `-t` filter plus a success line with no
    skipped marker was already accepted.)
  - Conditions set at the RED gate, all met:
    1. The GREEN is this row's own run of its GREEN command, on the tree after
       `TDD-0069`'s GREEN (the same `Round 1: Revision`). The gatekeeper re-ran it, exit 0,
       with this row's selector passing. The RED test hash still recomputes to
       `9f0091e3…e7dc`.
    2. It names `TDD-0069` Round 1 as the change that makes it pass, and records none of
       its own.
    3. The mutation was applied to that tree's `tddList.ts` and restored to it byte for
       byte. The gatekeeper did the same and the address returned. It fails at line 152 on
       `steeringTexts` = `[".qfai/steering/unreadable.md", ".qfai/steering/unreadable.md
       could not be read"]`, which means the `readFile` precondition and the line 147
       control passed first. The `finally` removed the deny, and no temporary tree was
       left.
  - Mutation site: `validateSpecTddList`, at the site of the removed Check 8b block,
    re-adding the `.qfai/steering/` read this row's predicate forbids. That is the code
    `TDD-0069`'s round wrote, and the predicate this row shares with it. Accepted.

- Refactor (Phase: Refactor step 1): no change. The GREEN is a removal, and
  nothing it left needs renaming, merging or moving.
- Relevant suite resolution: the reverse walk cannot be completed, as recorded
  for `TDD-0067`, so the local per-row set the user chose (AskUserQuestion,
  2026-09-23) applies. The full package suite runs on CI at the final head,
  where every row's checkpoint closes (the user's stop-at-`refactor`
  decision). This deviates from the widen-to-package rule of
  `references/relevant-test-suite.md`. The set is implement S2 decision 47:
  - the 54 test files whose static imports reach `src/core/validators/tddList.ts`,
    the deleted `src/core/worklogEntries.ts` (no importer is left),
    `src/core/emittedRuleCodes.ts` or `src/cli/commands/validate.ts`, recomputed
    on this tree. That includes both rows' tests, `tddListBlockedStatus.test.ts`
    and `spec0004WorklogSurfaceRemoval.test.ts`;
  - `ruleCodeUniqueness`, `validators-are-wired`, `issueCatalogHasEmitters`,
    `generateEmittedRuleCodes` and `implementWorklogObligation`, which read
    source rather than import it. `gateGroupCoverage`, `findingCodeGrammar` and
    `issueCodeUniqueness` are already in the static-import set;
  - excluded: `tests/integration/spec0004WithdrawnSchemaFinding.test.ts`, which
    imports `cli/commands/validate.ts`. It holds `TDD-0068`'s deliberate RED,
    under that row's own RED gate, and passing is not what it owes yet.
  59 files in all.
- Refactor verify command: `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`. From the repository root, in this order:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. `./node_modules/.bin/eslint --max-warnings 0` and
     `./node_modules/.bin/prettier --check` over
     `packages/qfai/src/core/validators/tddList.ts`,
     `packages/qfai/src/cli/commands/validate.ts`,
     `packages/qfai/src/core/emittedRuleCodes.ts` and
     `packages/qfai/tests/core/tddListBlockedStatus.test.ts`
  5. The 59-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/assets/implementWorklogObligation.test.ts tests/assets/reviewFixStatus.test.ts tests/assets/tddLedgerTemplate.test.ts tests/cli/commands/validate.test.ts tests/cli/commands/validateTextFormat.test.ts tests/cli/githubAnnotationCap.test.ts tests/cli/githubAnnotationEscaping.test.ts tests/cli/report.test.ts tests/cli/validateRunIncomplete.test.ts tests/core/atddUnitComponentScope.test.ts tests/core/coverageLevelClassification.test.ts tests/core/evidenceRevisionStale.test.ts tests/core/findingCodeGrammar.test.ts tests/core/gateGroupCoverage.test.ts tests/core/issueCodeUniqueness.test.ts tests/core/layerCoverage.test.ts tests/core/specScopeValidate.test.ts tests/core/tddCoverageTargetsShared.test.ts tests/core/tddExceptionRowRollCall.test.ts tests/core/tddLedgerLaterTableChecks.test.ts tests/core/tddLedgerRegionMasking.test.ts tests/core/tddLevelCoverageRowCrosswalk.test.ts tests/core/tddLevelUndeclaredMigration.test.ts tests/core/tddList.test.ts tests/core/tddListBlockedStatus.test.ts tests/core/tddListBrRefKey.test.ts tests/core/tddListDecisionRecord.test.ts tests/core/tddListEvidence.test.ts tests/core/tddListExceptionVisibility.test.ts tests/core/tddListObligationColumns.test.ts tests/core/tddListOwningModule.test.ts tests/core/tddListSpecStatus.test.ts tests/core/tddListSplitBoundary.test.ts tests/core/tddListStaleStatus.test.ts tests/core/tddListTier.test.ts tests/core/tddListUpstreamReset.test.ts tests/core/testCaseTableResolution.test.ts tests/core/validationTimings.test.ts tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/integration/cli/commands/validate.legacyPathEvidenceGate.test.ts tests/integration/cli/commands/validate.legacyValidateJsonConfig.test.ts tests/integration/cli/commands/validate.profileCoverageNotice.test.ts tests/integration/cli/commands/validate.reviewArtifactsProfiles.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/integration/cli/commands/validate.strictFailOnPrecedence.test.ts tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts tests/integration/cli/commands/validate.tddProfileTableArity.test.ts tests/integration/cli/commands/validateSaasPackage.passes.test.ts tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts tests/integration/spec0004ProfileSuffixedValidate.test.ts tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/scripts/generateEmittedRuleCodes.test.ts tests/unit/issueCatalogHasEmitters.test.ts tests/unit/validators-are-wired.test.ts tests/validators/importLite.test.ts tests/validators/ruleCodeUniqueness.test.ts
```

- Refactor verify result: every command exited 0. The type checks printed no
  diagnostic. The drift check printed
  `src/core/emittedRuleCodes.ts is in sync (500 codes).` eslint and prettier
  reported no finding. The vitest run (start 09:15:02 local) printed
  `Test Files  59 passed (59)`, `Tests  1656 passed | 7 skipped (1663)` and
  exit 0. Its verbose output names this row's selector as passed:
  `TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/`. It also names `TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error`, `TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path` (TDD-0069 and TDD-0067), and the
  selectors of spec-0002 `TDD-0012` and spec-0013 `TDD-0022` as passed. The 7
  skipped tests are in `tddListDecisionRecord`, `tddListEvidence` and
  `validate.profileCoverageNotice`, and none carries a selector of these rows.
  Tree during the run: `/qfai-atdd` wrote two new spec-0003 test files
  (`spec0003InitWorklogSurface.test.ts`, `spec0003WithdrawnSchemaRetirement.test.ts`)
  and their `tsconfig.tests.json` entries at 09:17:31-37 local, while the run
  was in progress. None is in the 59-file list, and vitest does not read
  `tsconfig.tests.json`, so no input of this run changed. The revision below is
  the address taken at 09:11:29 local, after the last change before the run
  (`TDD-0068`'s test, 09:09:42), and it is the tree steps 1-4 and the start of
  step 5 ran on. The address after the run is
  `working-tree+e5d63a1bc487af979ea2745e76f9672c10ff50edf3fbc50ac5b407bb60184502`.
- Refactor verify revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924175617152 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: d0ac8e9b1352e5249b51d9ed3bb86ef0d1bd23e24dec4e09df26060df432e985
- Prototype parity: n/a (not UI-affecting)
- Prototype parity rationale: `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a.
- Historical Prototype parity reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Checkpoint timing: this row stops at `refactor`, and its checkpoint fields
  and seal are written from the final head's CI run (the user's decision,
  recorded in `### TDD-0067`).
- Historical review record: The verdicts, reviewed revisions, and audited hashes below belong to earlier evidence and do not attest to this revised section.

- Historical Code quality review: PASS (implementation-reviewer, instance `impl-ir-0067`, 2026-09-23T23:59Z). This row changes no production code. Its GREEN is `TDD-0069`'s removal, reviewed in `### TDD-0069` at the same revision, so every production observation there applies here. Row-specific review of `tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts` and its `tsconfig.tests.json` entry: `denyRead` and `restoreRead` are awaited, `restoreRead` runs in `finally` before the tree is removed, and `readFile` is asserted to reject before validate runs, so a permission change that did nothing cannot pass as a result. No bare `as`. Re-run by this reviewer: both type checks exit 0; this row's selector, 1 passed (win32). No blocking finding. Advisory, `defect:code-quality`: the same four-file copy of `ReportedIssue`, `stringsOf` and `reportedIssues` as in `### TDD-0069`, which `/qfai-atdd` owns. Advisory, `record:QFAI-TDDLIST-008`: this entry's `TC-ref` holds `TC-0004-0076 (third tree; boundary ...)`, not the ledger's `TC-0004-0076`, so gate item 10 refuses the row at `done` until the value matches exactly.
- Historical Code quality reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Historical Code quality audited evidence hash: d7ed3598742b903fea3dd1a11864e8e4ab4d0c03665fdc1e9270148077a34723
- Historical Round 1: reviewer verdict: completion-reviewer PASS (completion-reviewer
  `impl-cr-0067`, item review for `refactor`, reviewed revision working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
  at HEAD 536fc4ddda6894af728745a0765999aa82438ec5). Pinned to that revision.
  - Tree: as for `TDD-0069`. The RED test hash recomputes to `9f0091e3…06e7dc`.
  - Re-run: the GREEN command names the selector as passed on win32, and no
    temporary tree was left. Both type checks exit 0.
  - Spec alignment: the selector covers the third tree of TC-0004-0076, the
    third clause of EX-0004-0044 and of AC-0004-0041, and BR-0004-0035's
    "Ledger checks do not read `.qfai/steering/`". The RED failed on
    `QFAI-TDDLIST-016` naming the unreadable file. The GREEN is `TDD-0069`
    Round 1's change, as implement S2 decision 44 settled, and the Oracle proof
    puts that read back.
  - Not judged: the checkpoint, which closes on the final head's CI by the
    user's decision, and the P5/P6 inputs.

- Spec review: PASS
- Spec reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Spec audited evidence hash: 77b10355f86f61ac36bd82b1c33392cc15739097169768b9e5a8c3858c666080
- Spec review pack: .qfai/review/review-20260924175617152 <!-- qfai:not-a-citation -->
- Spec review pack seal: d0ac8e9b1352e5249b51d9ed3bb86ef0d1bd23e24dec4e09df26060df432e985
- Code quality review: PASS
- Code quality reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Code quality audited evidence hash: 77b10355f86f61ac36bd82b1c33392cc15739097169768b9e5a8c3858c666080
- Code quality review pack: .qfai/review/review-20260924175617152 <!-- qfai:not-a-citation -->
- Code quality review pack seal: d0ac8e9b1352e5249b51d9ed3bb86ef0d1bd23e24dec4e09df26060df432e985
- Prototype parity reviewed revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts --reporter=verbose; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — file-scoped run: 1 file, 1 test(s) passed, selector named in verbose output; CI run https://github.com/aganesy/QFAI/actions/runs/36026684599: all nine test slices and ci-pass passed at b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d.
- Checkpoint verification revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Checkpoint verification seal: 88e59614616ca1c04a8fb10973468668057734a29e2b169b92d16e999853a424

### TDD-0068

- TDD-ID: TDD-0068
- Layer: integration
- Test file: packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts
- Selector: TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006
- TC-ref: TC-0004-0075
- EX-ref: EX-0004-0043; AC-ref: AC-0004-0040, second clause; BR-ref:
  BR-0004-0034, second clause (`Contract-Refs: CLI-VAL`)
- Order: the GREEN that withdraws the schema asset (removing
  `catalog/worklog-entry.schema.md` from the shipped assets and regenerating
  `governedAssistantManifest.ts`) also satisfies spec-0003 `TDD-0098`, so both
  REDs are taken before that GREEN.
- Own file: not a second `it` in `spec0004WorklogSurfaceRemoval.test.ts`, whose
  whole content `TDD-0067`'s passed RED test hash covers. Recorded under
  Decisions made with the same reason as `TDD-0071`.
- Branch: observed-red (branch 1), confirmed by the RED below. The surface
  exists and implements the predicate wrongly: the release still ships
  `catalog/worklog-entry.schema.md` (`packages/qfai/assets/init/.qfai/assistant/catalog/`
  and `packages/qfai/src/core/governedAssistantManifest.ts`), so the provenance
  check in `packages/qfai/src/core/validators/assistantAssets.ts` classifies a
  remaining copy through `classifyAssistantAsset` as `shipped`, `stale` or
  `forked`, never `unshipped`. No seam is needed: the test imports only
  `runInit`, `runValidate` and the two exported lock helpers, which exist.
- qa-gatekeeper: PASS x2 (instance `atdd-red-gate`, Round 1 — qa-gatekeeper#1, RED phase gate before the production change, reviewed revision working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a at HEAD 536fc4ddda6894af728745a0765999aa82438ec5; qa-gatekeeper#2, build-phase GREEN + oracle proof, reviewed revision working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Fixture: a fresh temporary directory initialised by `runInit` in-process. Then,
  per S1 D9:
  - the `.assets.lock.json` record `catalog/worklog-entry.schema.md` is removed
    with `readAssistantAssetsLock` / `writeAssistantAssetsLock`, so the fixture
    holds no record for the schema before the GREEN (init writes one) and after
    it (init no longer does). `hashAssistantAssetText` is not needed: no record
    is built;
  - `.qfai/assistant/catalog/worklog-entry.schema.md` is written from an inline
    literal, not copied from the shipped asset;
  - the control `.qfai/assistant/catalog/unshipped-control.md` is added, a file no
    release ships.
- Oracle, run under `runValidate({ profile: "full" })` and inspect the temporary report returned by the validation run. A finding names a path when one of `file`,
  `relatedFiles[]`, `refs[]`, `message` or `suggested_action`, with `\`
  normalised to `/` (S1 D4), contains it:
  - read-proof (S1 D5): the findings naming the control include
    `error QFAI-ASSETS-006`. The provenance check read this tree's catalog and
    reports an unshipped addition in it, so the schema's outcome below is the
    schema's own;
  - presence: the findings naming `.qfai/assistant/catalog/worklog-entry.schema.md`
    include `error QFAI-ASSETS-006`.
- Expected RED, from reading the code before the run (the RED below matches it): the control passes,
  and the schema, whose content differs from the shipped file and has no record,
  is named by `error QFAI-ASSETS-005` (a local fork) instead of `006`.
- Status: RED and its stripped run recorded under `#### Round 1`, on the renamed
  test the second scope PASS below approved. The earlier run under the first
  name selected zero tests and is kept there as `Attempted run, not a RED`.
  `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-23T23:56:02Z
  - Covers: test hash `b52a971314f216013349f46be022049eb57875bddbd7b1c1a9e141fa17d416b9`,
    at tree `working-tree+66f26578…96b3b9`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Sufficiency: the selector covers the whole of TC-0004-0075.
    - The tree is one `qfai init` wrote.
    - The schema is written back at
      `.qfai/assistant/catalog/worklog-entry.schema.md`.
    - Validate runs with `profile: "full"`.
    - The assertion requires `error QFAI-ASSETS-006` among the findings that
      name that path. That is the TC's expected result, severity included.
    - The one Oracle proof mutation puts the schema back into the governed
      list, and it fails that assertion.
  - One boundary: the ledger row declares none, and TC-0004-0075 is typed
    `error` with one expected result: a remaining schema is an unshipped file.
    The absence half of AC-0004-0040 (no work-log code, no `.qfai/steering/`
    path) is `TDD-0067`'s and is not asserted here.
  - Removing the lock record is S1 D9 and asks nothing beyond the TC. After
    the GREEN, `qfai init` writes no record for the schema, so removing it
    beforehand gives the same tree the TC describes, on both sides of the
    GREEN. A tree whose lock still holds a record from an earlier release is
    not a case TC-0004-0075 names, and it is not added here.
  - The control `catalog/unshipped-control.md` is legitimate, on a different
    ground from `TDD-0067`'s. This oracle is a presence check, so it cannot
    pass without the tree being read. S1 D5's vacuity guard is therefore not
    what justifies the control. Attribution is: the expected RED is the
    control passing while the schema gets `QFAI-ASSETS-005`. Only a control
    that raises `006` shows the check does report unshipped files in this
    tree, so a missing `006` on the schema is the schema's classification and
    not a broken check. It also restates AC-0004-0040's "like any other file
    the installed release does not ship". It asserts no result the TC leaves
    out.
  - `toContain` is the right strength. The TC requires that `006` names the
    path. It does not require that nothing else names it, so no exclusivity
    is asserted.
  - Not scope, no objection: the separate test file, a departure from S1 D3
    that keeps `TDD-0067`'s hash valid, and taking this RED before the asset
    withdrawal together with spec-0003 `TDD-0098`. The hand-off tree holds
    the implement agent's uncommitted `TDD-0069` work in `tddList.ts`. The
    predicate here is in `governedAssistantManifest.ts`, so this does not
    change the row's scope. The RED revision is taken again when the RED
    runs, as recorded above.
- Scope approval (`delivery-planner`), on the renamed test:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:04:58Z
  - Covers: test hash `d27c64b0d4490b33e646d2db1defbb1a71ede7fa1752c19a4cd826304148805c`,
    at tree `working-tree+1a69d4ec…61e260a`, and the single selector entry
    `TC-0004-0075: validate --profile full reports a remaining
    catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006`. No RED had
    been run: the earlier attempt selected no test. If the test file, a
    manifest entry or the selector changes, this approval lapses.
  - Reason: the earlier PASS lapsed on its own condition, because the
    selector changed. Only the `it` name differs. The file is the same
    length, and its fixture, lock-record removal, control, `findingsNaming`
    and both assertions read as they did under the earlier approval.
  - The new name still states only the TC's result, a remaining schema
    reported as `QFAI-ASSETS-006` at `error`. It adds no expected result and
    drops none, so every reason in the earlier approval above holds
    unchanged.
  - Not scope: whether the name matches itself as a `-t` pattern is a
    question of running the selector. It was checked before hand-off, and
    `qa-gatekeeper` confirms it when the RED shows the test selected and
    executed.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`,
  so step 3b writes `todo -> red` from this entry; no second RED is taken. The
  GREEN is the asset-withdrawal round, which waits for the REDs of spec-0003
  `TDD-0098` and `TDD-0099` (renumbered after the merge of main).
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from
    the row identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0004.md#tdd-0068`. `DR-ID` stays `-`, and
    `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are
    under `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
    `/qfai-implement` records the proof run there as `Round 1: Oracle proof`.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage. The surface the GREEN changes is
    `packages/qfai/src/core/governedAssistantManifest.ts`, the row’s
    `Owning module`, with the shipped asset it lists.

#### Round 1

- Round 1: RED revision: working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a
- Round 1: RED test hash: 5709bd6f3c5af71d81adeebb20a1eff41c6f158be8bed20f0a672d4dc657dc83
  (lstat-mode form `d27c64b0d4490b33e646d2db1defbb1a71ede7fa1752c19a4cd826304148805c`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose -t "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too;
  it changes no test.)
- Round 1: RED result: exit 1; 1 test failed. The approved RED, run at 2026-09-24T00:08:57Z after the
  scope PASS at 00:04:58Z. Before the run, the test hash recomputed to the
  approved `d27c64b0…48805c`, and the tree address was taken twice with equal
  results; HEAD `536fc4ddd`. That tree holds `TDD-0069`'s uncommitted GREEN and
  no mutation: the build gate had finished. The schema asset is still shipped.
  Exit 1; Test Files 1 failed (1); Tests 1 failed (1). The read control at line
  113 passed: the control addition is named by `error QFAI-ASSETS-006`. The
  failure is the presence assertion at line 116, inside the selector: the only
  finding naming the schema is `error QFAI-ASSETS-005`, a local fork, because the
  release still ships the file and the copy differs from it. Vitest's report
  follows verbatim; the 18 finding lines `runValidate` printed to stdout before
  it are omitted.

```text
 × |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006 4301ms
   → expected [ 'error QFAI-ASSETS-005' ] to include 'error QFAI-ASSETS-006'

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006
AssertionError: expected [ 'error QFAI-ASSETS-005' ] to include 'error QFAI-ASSETS-006'
 ❯ tests/integration/spec0004WithdrawnSchemaFinding.test.ts:116:44
    114|       "error QFAI-ASSETS-006",
    115|     );
    116|     expect(findingsNaming(issues, SCHEMA)).toContain("error QFAI-ASSET…
       |                                            ^
    117|   });
    118| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  09:08:59
   Duration  7.59s (transform 2.30s, setup 73ms, import 2.96s, tests 4.30s, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions neutralised as below,
  their operands kept. The RED command was re-run unchanged, exit 0, and the
  verbose reporter shows the selector executed and passed. The test was restored
  at once: it compared byte-equal to the copy taken before the strip, the test
  hash recomputed to `d27c64b0…48805c`, the tree address returned to the RED
  revision, and no temporary tree was left behind.

```diff
@@ -110,9 +110,7 @@ describe("TC-0004-0075: a remaining work-log schema is an unshipped file", () =>
     await runValidate({ root, strict: false, profile: "full" });
     const issues = await reportedIssues(root);

-    expect(findingsNaming(issues, CONTROL), "the provenance check read this tree").toContain(
-      "error QFAI-ASSETS-006",
-    );
-    expect(findingsNaming(issues, SCHEMA)).toContain("error QFAI-ASSETS-006");
+    void [findingsNaming(issues, CONTROL), "the provenance check read this tree", "error QFAI-ASSETS-006", expect];
+    void [findingsNaming(issues, SCHEMA), "error QFAI-ASSETS-006"];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose -t "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006"
 ✓ |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006 7510ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  09:09:22
   Duration  19.10s (transform 2.91s, setup 362ms, import 10.11s, tests 7.51s, environment 0ms)
exit=0
```

- Attempted run, not a RED (2026-09-24T00:02:14Z, test hash `b52a9713…d416b9`
  and tree `working-tree+66f26578…96b3b9` both recomputed before it and equal
  to the recorded values). Command, with `--reporter=verbose` added so the
  runner prints the selected test's name; the flag changes no test:
  `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose -t "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as QFAI-ASSETS-006 (error)"`.
  Exit 0 with the test skipped: `-t` reads its argument as a regular
  expression, so `(error)` is a group that matches `error`, and the pattern
  does not match the test's own name, which holds `(error)`. Checked outside
  the runner: `new RegExp(selector).test(selector)` is `false` for this
  selector and `true` for those of `TDD-0067`, `TDD-0069` and `TDD-0071`. A
  checkpoint that runs `<Test file> -t '<Selector>'` would skip this row the
  same way.

```text
 ↓ |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as QFAI-ASSETS-006 (error)

 Test Files  1 skipped (1)
      Tests  1 skipped (1)
   Start at  09:02:18
   Duration  5.62s (transform 4.13s, setup 88ms, import 5.04s, tests 0ms, environment 0ms)
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The GREEN changes the shipped asset set and its
  generated manifest, so the mutation lands there and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose -t "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006"`
  1. Put `"catalog/worklog-entry.schema.md"` back into the governed file list of
     `packages/qfai/src/core/governedAssistantManifest.ts`, the row's
     `Owning module`. The predicate is that entry. The asset file under
     `packages/qfai/assets/init/.qfai/assistant/catalog/` is restored with it:
     `buildShippedAssistantHashes` throws on a listed file it cannot read, and
     that throw is not an assertion failure. A remaining copy is then `forked`,
     and the selector must fail on the schema's `error QFAI-ASSETS-006` at the
     second assertion, while the control still passes.
- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+1a69d4ec296c917f359ff233f83a83b9c22631318b15607093a3636b861e260a at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the re-approval (00:04:58Z) covers test hash `d27c64b0…48805c` and the
    renamed selector. The RED ran on that hash after it (vitest start 09:08:59 local,
    00:08:59Z). The earlier run is correctly recorded as not a RED: it selected no test
    (`1 skipped`), so no failure was observed. The rename is the only change between the
    two approvals.
  - Freshness: the gatekeeper recomputed the RED test hash over the manifest and the tree
    address, and both equal the recorded values. The ledger edits running in parallel are
    excluded from the address. `governedAssistantManifest.ts` still lists
    `catalog/worklog-entry.schema.md`, and the asset still ships. The selector matches
    itself as a `-t` pattern.
  - Observation: the gatekeeper re-ran the RED command. The module loads, and no seam was
    used. The line 113 control passed: the unshipped control is named by
    `error QFAI-ASSETS-006`, so the provenance check read this tree and reports unshipped
    files. The failure is the assertion at line 116 inside the selector,
    `expected [ 'error QFAI-ASSETS-005' ] to include 'error QFAI-ASSETS-006'`. The schema
    is classified as a local fork because the release still ships it, which is the predicate
    the row owns. The selector has one entry, and no temporary tree was left.
  - Strip: the diff reaches only the `Test file`. It keeps `runInit`, the lock-record
    removal, `runValidate`, the report read and both `findingsNaming` calls, and leaves
    `expect` referenced. The command is unchanged. The verbose output names the selector
    as passing.
  - Scope against TC-0004-0075 / EX-0004-0043 / AC-0004-0040 second clause /
    BR-0004-0034 second bullet: the tree is one `qfai init` wrote, the schema is written
    back from an inline literal (S1 D9), and validate runs `profile: "full"`. The one result
    asserted is `error QFAI-ASSETS-006` naming the schema. The control is attribution, as
    the scope approval reasons.
  - Oracle proof plan: one mutation, putting the schema back into the governed list in
    `governedAssistantManifest.ts` (the `Owning module`), with the shipped asset restored so
    `buildShippedAssistantHashes` does not throw. Both are what this row's GREEN removes, so
    the mutation breaks the code the round writes. It is expected to fail at line 116 with
    the control passing, and it names the GREEN command. That is acceptable as a plan. At
    GREEN, show the line 116 assertion failing, not a load failure. The restored asset
    must be byte-equal to the shipped one, so the classification comes from the list entry
    and not from a missing file.
  - Advisory: the RED and GREEN commands carry `--reporter=verbose` from the start, so the
    two are identical. The spec-0003 `TDD-0098` RED that the same GREEN satisfies is judged
    on its own row.

- Step 3b (`/qfai-implement`, run started 2026-09-23T21:11:02.206Z, backend-engineer
  `impl-row-0067`, implement session S3): entry verified before the status write.
  Branch `observed-red`; the selector is one entry over one boundary; the RED
  test hash recomputed to `d27c64b0…48805c`. The tree had moved from the
  `Round 1: RED revision` to `working-tree+f658df6c…8e67` through other rows'
  new test files, the `TDD-0070` record and `CR-20260924-0001`; no file of this
  row's manifest and no production file this round changes had moved. Ledger
  write at 2026-09-24T01:30:36Z: `todo -> red`, `Test file` and `Selector`
  copied from the row identity above. `Evidence` stays `-` at `red`.
- Production change (Phase Green step 1), against HEAD `536fc4ddd`, per
  implement S3 decision R-D2 (Work Orders step 62). This is the asset round;
  spec-0003 `TDD-0098` and `TDD-0099` consume the same GREEN in the spec-0003
  invocation, and their ledger rows are not written here.
  - `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`:
    deleted.
  - `packages/qfai/src/core/governedAssistantManifest.ts`: regenerated with
    `npm run generate:governed-manifest` from `packages/qfai`;
    `catalog/worklog-entry.schema.md` leaves `SHIPPED_GOVERNED_ASSISTANT_FILES`
    (25 files). `generate-governed-assistant-manifest.mjs --check` then printed
    `src/core/governedAssistantManifest.ts is in sync (25 files).`
  - `pnpm sync:ssot`: `pnpm` is not on this host's PATH, so the four commands
    the script chains were run directly from the repository root, in its order:
    `node ./scripts/gen-agent-catalog.mjs && node ./scripts/link-assistant-tree.mjs && node ./scripts/sync-init-to-root.mjs && node ./scripts/gen-codex-agents.mjs`.
    Exit 0. It changed no tracked file and left
    `.qfai/assistant/catalog/worklog-entry.schema.md` as a dangling link.
  - `.qfai/assistant/catalog/worklog-entry.schema.md`: the tracked symlink
    deleted.
  - `packages/qfai/tests/assets/worklogSchemaShipped.test.ts`: deleted, and its
    entry in `tests/scripts/typeCheckEnumeration.allowlist.ts` struck.
  - `retireWithdrawnGovernedAssets` and the `.assets.lock.json` record are
    unchanged.
- Asset-tree checks after the change:
  - `node scripts/check-tracked-symlinks.mjs`: exit 0,
    `check-tracked-symlinks: 29 path(s) checked, each staged as a link.`
  - Tracked-tree diff around the sync, the `ci:gate:ssot` pair: the chain
    was run a second time, and the diff and status over `.qfai/`,
    `qfai.config.yaml` and `packages/qfai/assets/init/.qfai/` hashed equal
    before and after it. The sync is idempotent on this tree. Under
    `.qfai/assistant/` and `packages/qfai/assets/init/.qfai/` the only
    changes are the two deletions above. The whole diff is not empty,
    because the uncommitted spec-pack and evidence edits of this change sit
    under `.qfai/`.
  - `npx tsc -p tsconfig.json --noEmit` and `npx tsc -p tsconfig.tests.json
    --noEmit` from `packages/qfai`: both exit 0 with no diagnostic.
- Round 1: Revision: working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose -t "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006"`
- Round 1: GREEN result: exit 0; 1 test passed. The restored run after the Oracle proof below was
  reverted. The manifest was byte-equal to its GREEN copy, the asset absent, the
  tree address equal to `Round 1: Revision` before the mutation and after the
  revert, and the RED test hash still `d27c64b0…48805c`.

```text
 ✓ |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006 11257ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  10:34:51
   Duration  18.20s (transform 5.46s, setup 94ms, import 6.45s, tests 11.26s, environment 0ms)

exit=0
```

- Round 1: Oracle proof: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose -t "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006"` — exit 1; selector assertion failed.
  The planned mutation. `"catalog/worklog-entry.schema.md"`
  goes back into `SHIPPED_GOVERNED_ASSISTANT_FILES` in
  `packages/qfai/src/core/governedAssistantManifest.ts`, the row's
  `Owning module`, by restoring the pre-GREEN copy. The asset file is restored
  with it, byte-equal to HEAD, because the manifest reader throws on a listed
  file it cannot read. Command: the GREEN command above. Exit 1 at line 116, the
  second assertion: the remaining copy is now a fork of a shipped file
  (`error QFAI-ASSETS-005`), not an unshipped one. The control assertion
  before it passed. Reverted by restoring the GREEN manifest copy and deleting
  the asset again.

```diff
@@ -24,6 +24,7 @@ export const SHIPPED_GOVERNED_ASSISTANT_FILES: readonly string[] = [
   "catalog/test-layers.md",
   "catalog/ui-definition-protocol.md",
   "catalog/ui-procurement.md",
+  "catalog/worklog-entry.schema.md",
   "constitution/agent-selection.md",
   "constitution/change-classification.md",
   "constitution/communication.md",
```

```text
 × |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006 36866ms
   → expected [ 'error QFAI-ASSETS-005' ] to include 'error QFAI-ASSETS-006'

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004WithdrawnSchemaFinding.test.ts > TC-0004-0075: a remaining work-log schema is an unshipped file > TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006
AssertionError: expected [ 'error QFAI-ASSETS-005' ] to include 'error QFAI-ASSETS-006'
 ❯ tests/integration/spec0004WithdrawnSchemaFinding.test.ts:116:44
    114|       "error QFAI-ASSETS-006",
    115|     );
    116|     expect(findingsNaming(issues, SCHEMA)).toContain("error QFAI-ASSET…
       |                                            ^
    117|   });
    118| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  10:33:11
exit=1
```

- `qa-gatekeeper` (routing phase `build`), qa-gatekeeper#2 on the Round 1 GREEN and Oracle proof: PASS (instance `atdd-red-gate`, reviewed revision working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Freshness: the live tree addresses to `Round 1: Revision` `73bc7ce7…21ba9` directly. The RED test hash recomputes to `d27c64b0…48805c`, so the test did not move under the RED.
  - GREEN: `Round 1: GREEN command` equals the RED command. The gatekeeper re-ran it: exit 0, and the verbose output names this selector as passing (1 test). Validate named both the control and `.qfai/assistant/catalog/worklog-entry.schema.md` as `error QFAI-ASSETS-006`, which is the result TC-0004-0075 expects, severity included. No temporary tree was left.
  - Production change, checked against HEAD: `governedAssistantManifest.ts` loses exactly one entry, `catalog/worklog-entry.schema.md`. The asset `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md` and its tracked mirror link `.qfai/assistant/catalog/worklog-entry.schema.md` are both deleted, and the link was tracked as `120000`, so deleting the dangling link is required. `retireWithdrawnGovernedAssets` and the lock format are unchanged.
  - Scope stays inside the round: the only other edits this round owns are the deletion of `tests/assets/worklogSchemaShipped.test.ts` and its one allowlist line, which implement S1 decision 29 deferred to this row. The other changed files in the tree belong to `TDD-0067`, `TDD-0069` and `TDD-0071`. spec-0003 `TDD-0098` and `TDD-0099` consume this GREEN through the two open cross-spec entries and are judged on their own rows.
  - Oracle proof, judged on its record (the gatekeeper was limited to the selector here): the mutation restores the one manifest entry in `governedAssistantManifest.ts`, the `Owning module`, together with the asset byte-equal to HEAD. That is what the RED gate required, so the classification comes from the list entry and not from a missing file. Both are what this round removes. The run fails at line 116 on the second assertion (`error QFAI-ASSETS-005` in place of `-006`) after the control assertion passed. That is an assertion inside the selector, not a load failure, and it ran the recorded GREEN command. The revert is recorded with the manifest byte-equal to its GREEN copy, the asset absent and the address back at `73bc7ce7…`, which the gatekeeper confirmed.
  - verify:pack baseline (CI build job): no re-pin expected, on a static reading. `scripts/fresh-init-findings.json` holds seven findings, and none of them names the schema. On a fresh init the schema is no longer written and no lock record for it exists, so neither `QFAI-ASSETS-*` nor the retirement path fires. No shipped file cites `worklog-entry.schema.md#…`, so `QFAI-LINK-002` cannot fire. `skillDocReferences` checks only a fixed list of retired paths, and `staleReferences` has no work-log token. The two shipped `SKILL.md` files still mention the path in prose until the spec-0011 and spec-0013 text GREENs land, and no validator reads that as a link. `verify:pack` itself was not run here, so the final head's CI build job is the confirmation. If it reports a difference, re-record with `QFAI_PACK_FINDINGS_UPDATE=1` in the same change.
- Ledger write: `red -> green` at 2026-09-24T01:42:02Z, after `qa-gatekeeper#2`
  passed the build gate (Work Orders step 80), with the `Evidence` pointer.
- Refactor (Phase: Refactor step 1): no change. The round deletes a file and
  regenerates a module; nothing left needs renaming, merging or moving.
- Local checkpoint, first run (implement S3 decision R-D10), on
  `working-tree+73bc7ce7…1ba9`. No other test process was running.
  - `./node_modules/.bin/tsup` (for the tests that read `dist/`), the
    governed-manifest and rule-code drift checks, `check-tracked-symlinks.mjs`,
    both type checks, and eslint and prettier on the changed files: all exit 0.
  - The 19-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/cli/init.test.ts tests/cli/initConstitutionCreation.test.ts tests/cli/initRuleMasterUpdates.test.ts tests/cli/initRunReport.test.ts tests/core/assistantAnchorReferences.test.ts tests/core/assistantAssetProvenance.test.ts tests/core/assistantAssetsUnverifiable.test.ts tests/core/skillRegistrationContract.test.ts tests/core/skillRegistrationFileSystem.test.ts tests/core/validators/skillDocumentReadability.test.ts tests/core/validators/skillReferenceReachability.test.ts tests/integration/agentDelegationSpec0015.test.ts tests/integration/distributedSurfaceLeakage.test.ts tests/integration/initSpec0003.test.ts tests/integration/spec0003WithdrawnSchemaRetirement.test.ts tests/integration/spec0004WithdrawnSchemaFinding.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/validators/assistantAssets.test.ts
```

  - Result (start 10:45:12 local): `Test Files  1 failed | 18 passed (19)`,
    `Tests  1 failed | 620 passed | 13 skipped (634)`, exit 1. The failure is
    `tests/assets/assets.test.ts > assets guardrails > checks relative path
    references in markdown`, received
    `.qfai/assistant/catalog/worklog-entry.schema.md (README.md)`. The root
    `README.md` cites the file this round deleted, and so does
    `packages/qfai/README.md`, which `scripts/check-readme-alignment.mjs` holds
    to it line for line. This round caused the failure, so the row owns it. The
    row stays at `green` until it is fixed and the set is re-run.
- verify:pack: the gatekeeper expects no re-pin of
  `scripts/fresh-init-findings.json`, on a static reading only. The final CI
  build job, which runs `verify-pack.mjs`, confirms it.
- Round 1 refactor-phase checkpoint repair (implement session S4, Work Orders
  step 81; no new round, no new build gate): the paragraph "The frontmatter
  contract and the **per-kind write trigger** … are in the seeded
  `.qfai/assistant/catalog/worklog-entry.schema.md`." is deleted from the root
  `README.md` (lines 727-729) and from `packages/qfai/README.md` (lines 721-723),
  each with one adjacent blank line. The file-tree line and the rest of the
  section stay for the documents step. `node scripts/check-readme-alignment.mjs`:
  `README.md and packages/qfai/README.md are aligned (799 lines).`, exit 0.
  `prettier --check` on both: exit 0. `Round 1: Revision` stays
  `working-tree+73bc7ce7…1ba9`, and the build-gate PASS of step 80 stands.
- Refactor verify command: `cd packages/qfai && ./node_modules/.bin/tsup`. From the repository root, in this order, on the
  repaired tree, with no other test process running:
  1. `cd packages/qfai && ./node_modules/.bin/tsup`
  2. `cd packages/qfai && node scripts/generate-governed-assistant-manifest.mjs --check`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. `node scripts/check-tracked-symlinks.mjs`
  5. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit` and
     `npx tsc -p tsconfig.tests.json --noEmit`
  6. `./node_modules/.bin/eslint --max-warnings 0` on
     `packages/qfai/src/core/governedAssistantManifest.ts` and
     `packages/qfai/tests/scripts/typeCheckEnumeration.allowlist.ts`, and
     `./node_modules/.bin/prettier --check` on those two and both READMEs
  7. The same 19-file run as the first attempt, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/cli/init.test.ts tests/cli/initConstitutionCreation.test.ts tests/cli/initRuleMasterUpdates.test.ts tests/cli/initRunReport.test.ts tests/core/assistantAnchorReferences.test.ts tests/core/assistantAssetProvenance.test.ts tests/core/assistantAssetsUnverifiable.test.ts tests/core/skillRegistrationContract.test.ts tests/core/skillRegistrationFileSystem.test.ts tests/core/validators/skillDocumentReadability.test.ts tests/core/validators/skillReferenceReachability.test.ts tests/integration/agentDelegationSpec0015.test.ts tests/integration/distributedSurfaceLeakage.test.ts tests/integration/initSpec0003.test.ts tests/integration/spec0003WithdrawnSchemaRetirement.test.ts tests/integration/spec0004WithdrawnSchemaFinding.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/validators/assistantAssets.test.ts
```

- Refactor verify result: every command exited 0. The drift checks printed
  `src/core/governedAssistantManifest.ts is in sync (25 files).` and
  `src/core/emittedRuleCodes.ts is in sync (500 codes).`; the symlink check
  `check-tracked-symlinks: 29 path(s) checked, each staged as a link.`; the type
  checks no diagnostic. The vitest run (start 11:10:54 local) printed
  `Test Files  19 passed (19)` and `Tests  621 passed | 13 skipped (634)`, exit 0.
  Its verbose output names this row's selector and
  `assets guardrails > checks relative path references in markdown` as passed.
  The 13 skipped tests are in `initConstitutionCreation`, `initRuleMasterUpdates`,
  `initRunReport` and `assistantAssetProvenance`, as in the first run, and none
  carries this row's selector. The tree address was equal before step 1 and
  after step 7.
- Refactor verify revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Tracked-tree diff after `sync:ssot` on the repaired tree (implement S4 D3 as amended at
  Work Orders step 81; the R-D10 item the re-verify above did not run): the chain
  `node ./scripts/gen-agent-catalog.mjs && node ./scripts/link-assistant-tree.mjs && node ./scripts/sync-init-to-root.mjs && node ./scripts/gen-codex-agents.mjs`
  was run from the repository root, exit 0. The sha256 of `git diff` plus
  `git status --porcelain` over `.qfai/`, `qfai.config.yaml` and
  `packages/qfai/assets/init/.qfai/`, with `.qfai/evidence/**` excluded (this
  record is written there), was
  `ce3b195d90e3baccc4ff19bf74aad150b01d06dab0db4a70d7481ee72e73b652` before and
  after the run. The tree address was
  `working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b`
  before and after, so the reviews pinned to it stand.
- Ledger write: `green -> refactor` at 2026-09-24T02:21:49Z, after the refactor record above.
- The local R-D10 checkpoint re-run is that same run, on the same tree. The
  checkpoint fields and seal stay deferred to the final head's CI run (the
  user's decision, recorded in `### TDD-0067`).
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924175617115 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: a88248c753a23d8cb47ff045e0496072e94faa000d444a6c71a082d5ff21904f
- Prototype parity: n/a (not UI-affecting)
- Prototype parity rationale: `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b.
- Historical Prototype parity reviewed revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Historical review record: The verdicts, reviewed revisions, and audited hashes below belong to earlier evidence and do not attest to this revised section.

- Historical Code quality review: PASS (implementation-reviewer, instance `impl-review-0068`, 2026-09-24T02:30:53Z, Round 1). The production change is the withdrawal of the shipped schema asset, the regenerated `governedAssistantManifest.ts`, the mirror symlink and `worklogSchemaShipped.test.ts` deletions, and the refactor-phase README repair.
- Historical Code quality reviewed revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Historical Code quality audited evidence hash: 80d2feb5635ce3b6817563477ecee3e07872d944ae311f54bfeeba4e6fdc919a
- Historical Round 1: reviewer verdict: completion-reviewer PASS (instance `impl-cr-0068`), reviewed revision working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b.
- Historical Spec reviewed revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Historical Spec audited evidence hash: 80d2feb5635ce3b6817563477ecee3e07872d944ae311f54bfeeba4e6fdc919a
- Checkpoint: deferred. The checkpoint fields and seal are written from the
  final head's CI run (the user's decision, recorded in `### TDD-0067`).

- Spec review: PASS
- Spec reviewed revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Spec audited evidence hash: 5e8ea0ba4fe8d0478d1a267db2b39867aee12d402482af6eb078f646f75daf17
- Spec review pack: .qfai/review/review-20260924175617115 <!-- qfai:not-a-citation -->
- Spec review pack seal: a88248c753a23d8cb47ff045e0496072e94faa000d444a6c71a082d5ff21904f
- Code quality review: PASS
- Code quality reviewed revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Code quality audited evidence hash: 5e8ea0ba4fe8d0478d1a267db2b39867aee12d402482af6eb078f646f75daf17
- Code quality review pack: .qfai/review/review-20260924175617115 <!-- qfai:not-a-citation -->
- Code quality review pack seal: a88248c753a23d8cb47ff045e0496072e94faa000d444a6c71a082d5ff21904f
- Prototype parity reviewed revision: working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0004WithdrawnSchemaFinding.test.ts --reporter=verbose; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — file-scoped run: 1 file, 1 test(s) passed, selector named in verbose output; CI run https://github.com/aganesy/QFAI/actions/runs/36026684599: all nine test slices and ci-pass passed at b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d.
- Checkpoint verification revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Checkpoint verification seal: 6dfa75e54b9b11e10a4e428edabdb0f81df7f27634437363842f64e3a088e47f

### TDD-0070

- TDD-ID: TDD-0070
- Layer: integration
- Test file: packages/qfai/tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts
- Selector: TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row
- TC-ref: TC-0004-0076
- Boundary: second tree; boundary `blocked-by-empty`
- EX-ref: EX-0004-0044, second clause; AC-ref: AC-0004-0041, second clause; BR-ref:
  BR-0004-0035, as amended by `CR-20260923-0011`
- Branch: falsifiability (branch 2), confirmed by the classification run below, which passed
  on its first run, and by the P4b re-run just before handover. The
  predicate is already implemented and this change keeps it:
  `TDDLIST_BLOCKED_MISSING_REF` already fires for a `blocked` row with an empty
  `Blocked-By`. So no natural RED is observable. The sibling-satisfied form, which needs
  the sibling `done`, is ruled out by the stop-at-`refactor` decision, so `Satisfied-by`
  names the production symbol (S1 D2).
- qa-gatekeeper: PASS x2 (instance `atdd-red-gate`, Round 1 — qa-gatekeeper#1, RED-phase falsifiability gate on the mutated tree, reviewed revision working-tree+c1ba0661f602ec03a86253fb638c042634ca9f200b13e4a43a79f34312577784 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5; qa-gatekeeper#2, build-phase GREEN + oracle proof, reviewed revision working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Own file: not an `it` in `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts`, whose whole
  content `TDD-0069`'s passed RED test hash covers; the same reason as `TDD-0071` and
  `TDD-0068`. Added to `packages/qfai/tsconfig.tests.json`.
- Fixture: a fresh temporary directory with a `spec-0001` stub pack and a nine-column
  ledger whose row 1, `TDD-0002`, is `blocked` with an empty `Blocked-By` cell. A fixture
  lookup with the built CLI (`dist/cli/index.mjs validate --profile tdd`) on the same tree
  in a scratch directory outside the repository showed the empty cell is read as empty:
  `TDDLIST_BLOCKED_MISSING_REF` "Blocked-By is empty … (row 1)". The test itself has not
  been run.
- Oracle (presence), under `runValidate({ profile: "tdd" })`, inspect the temporary report returned by the validation run: at least one `error` `TDDLIST_BLOCKED_MISSING_REF` whose
  fields name the ledger path and `(row 1)`, with `\` normalised to `/` (S1 D4). The message
  wording is not matched. The finding is itself the proof that the ledger was read.
- Selector check: `new RegExp(selector).test(selector)` is `true`; the file has one `it`.
- Status: scope approved (the second verdict below). The classification run passed and the
  P4b re-run passed, so the row is on branch 2 and ready for `/qfai-implement` step 3c.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-24T01:06:57Z
  - Reviewed: test hash `4bbe2800…a7a6f4`, at tree `working-tree+30bb6582…0196af`,
    the single selector entry above, the Satisfied-by and the predicate to break.
    No run had been taken.
  - What TC-0004-0076's second tree asks: the same `blocked` row with an empty
    `Blocked-By` raises `TDDLIST_BLOCKED_MISSING_REF` (EX-0004-0044: "names it";
    AC-0004-0041: "still raises"). It names the code and the row, nothing more.
  - Reason 1, the message text is an assertion the TC does not ask for. The
    filter requires "Blocked-By is empty". The fixture's only `blocked` row has
    an empty cell, so the code naming `(row 1)` already identifies this
    boundary. The wording adds nothing except a way to fail on a rewording that
    still satisfies the TC.
  - Reason 2, the planned mutation does not break this row's predicate. With the
    empty-cell test in `parseBlockedBy` made false, `""` reaches
    `BLOCKED_BY_DEPARTURE_RE`, which does not match. The parse then returns
    `missing-departure-status`, and the blocked-row loop still raises
    `TDDLIST_BLOCKED_MISSING_REF` at `error` for `(row 1)`, with the "names no
    departure status" message. The TC's second tree still holds under that
    mutation. The selector fails only because of the message match in Reason 1.
    The falsifiability evidence would therefore prove a wording, not the
    behaviour the row owns.
  - Reason 3, the count. `toHaveLength(1)` requires exactly one such finding.
    This is the same over-specification as `TDD-0099`'s note count: the TC asks
    that the code is raised, not that it is raised once. A duplicate finding
    for the row would fail this test while the TC is met.
  - What holds:
    - One boundary: `blocked-by-empty`. The named-row and unreadable-steering
      trees are `TDD-0069`'s and `TDD-0071`'s, and they are not asserted here.
    - Severity `error` may stay. It is the severity the kept check is contracted
      at ("`TDDLIST_BLOCKED_MISSING_REF` errors when either half is absent" in
      the shipped execution ledger). AC-0004-0041's "still raises" is that
      unchanged check, set against the first tree's "no error-severity finding".
    - The presence finding is its own read-proof.
    - Branch 2 with `Satisfied-by` naming the production symbol follows S1 D2.
  - To clear:
    1. Drop the "Blocked-By is empty" substring. Keep the code, `error`, the
       ledger path and `(row 1)`.
    2. Require at least one such finding (`naming.length > 0`), not exactly one.
    3. Replace the predicate to break with one that stops the empty cell from
       raising the code for the row. For example, in `parseBlockedBy`, return
       `{ ok: true, blocker: "", departureStatus: "todo" }` for an empty or `-`
       value, so the loop's `if (parsed.ok) continue;` skips the row. The
       selector must then fail with no matching finding. It stays in the
       `Owning module`, `tddList.ts`.
    4. Record the new test hash and resubmit it for scope approval before the
       classification run.
- Scope approval (`delivery-planner`), on the revised test:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T01:10:21Z
  - Covers: test hash `a4c8d3a86f511c17e233f39cf6f91426212eb484925d23bc71bd8a3032063971`,
    at tree `working-tree+ea5fbfa4…a2870`, and the single selector entry above,
    which is unchanged. No run had been taken. If the test file, a manifest
    entry or the selector changes, this approval lapses.
  - Reason: each item the REVISE listed is done.
    - The filter now asks only what TC-0004-0076's second tree asks: the code
      `TDDLIST_BLOCKED_MISSING_REF`, at the `error` the kept check is contracted
      at, naming the ledger and `(row 1)`.
    - The count is `naming.length > 0`, so uniqueness is no longer asserted.
    - The predicate to break now makes `parseBlockedBy` accept an empty or `-`
      cell. The loop's `if (parsed.ok) continue;` then skips the row, and no
      `TDDLIST_BLOCKED_MISSING_REF` is raised for it at all. That falsifies the
      behaviour the row owns, and not its wording. The mutation stays in
      `tddList.ts`.
  - One boundary: `blocked-by-empty`. Nothing from `TDD-0069` or `TDD-0071` is
    asserted. The finding is its own read-proof.
  - Branch 2 is unchanged. If the classification run fails instead of passing,
    it is a natural RED on an approved scope, and it goes to `qa-gatekeeper` as
    one.

#### Round 1

- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts --reporter=verbose -t "TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row"`
  (the same command serves as the RED command, the falsifiability command and the GREEN
  command)
- Test hash at hand-off for scope approval: a4c8d3a86f511c17e233f39cf6f91426212eb484925d23bc71bd8a3032063971
  (revised for the scope REVISE below; the REVISE was given on `4bbe2800…a7a6f4`)
- Test manifest:
  - packages/qfai/tests/helpers/tempTree.ts
  - packages/qfai/tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts
- Tree at hand-off for scope approval: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
  (HEAD `536fc4ddda6894af728745a0765999aa82438ec5`, taken twice with equal results)
- Classification run (branch choice; not RED evidence): run at 2026-09-24T01:11:24.560Z after the
  scope PASS at 01:10:21Z. Before the run the file hash recomputed to the approved
  `a4c8d3a8…063971`, and the tree address was taken twice with equal results. Tree:
  `working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870`, HEAD `536fc4ddd`, with the uncommitted
  GREENs of spec-0004 `TDD-0069` and `TDD-0071`. Exit 0: the selector executed and passed,
  because the kept `TDDLIST_BLOCKED_MISSING_REF` check already rejects the empty cell. A first
  run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts --reporter=verbose -t "TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row"
 ✓ |integration| tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts > TC-0004-0076: a blocked row with an empty Blocked-By is rejected > TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row 1085ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  10:11:31
   Duration  7.04s (transform 4.49s, setup 101ms, import 5.27s, tests 1.09s, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-24T01:11:41.925Z,
  right after the classification run, since no P2-P4 surface building is pending for this
  row. Same command, same tree and file hash. Exit 0: the branch still holds.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts --reporter=verbose -t "TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row"
 ✓ |integration| tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts > TC-0004-0076: a blocked row with an empty Blocked-By is rejected > TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row 455ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  10:11:47
   Duration  5.81s (transform 3.96s, setup 81ms, import 4.82s, tests 457ms, environment 0ms)
exit=0
```
- Round 1: Satisfied-by: `packages/qfai/src/core/validators/tddList.ts`, `validateTddList`, the
  kept `TDDLIST_BLOCKED_MISSING_REF` check of the blocked-row loop, fed by `parseBlockedBy`'s
  `missing-blocker` result for an empty cell.
- Predicate to break (for `/qfai-implement` Phase Red step 3c, which applies the mutation,
  runs this row's selector, records the falsifiability trio here and reverts after the
  `qa-gatekeeper` verdict): make `parseBlockedBy` return
  `{ ok: true, blocker: "", departureStatus: "todo" }` for an empty or `-` value, so the
  blocked-row loop's `if (parsed.ok) continue;` skips the row and no
  `TDDLIST_BLOCKED_MISSING_REF` is raised for it at all. The selector must then fail with no
  matching finding (`naming.length` is 0). The mutation lands in the row's `Owning module`,
  `packages/qfai/src/core/validators/tddList.ts`, and in no file of the manifest. It
  replaces the earlier plan to make the empty-cell test false, which the scope REVISE
  asked to change.
- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming
  this row. Branch `falsifiability`, and its evidence is not written yet, which is the
  ordinary case: step 3c applies the mutation above, runs this row's selector, and records
  `Round 1: Falsifiability command`, `Round 1: Falsifiability result`, `Round 1: RED failure
  mode: falsifiability`, `Round 1: RED test hash` with its manifest (taken before the
  mutation; the mutation lands in no manifest file) and `Round 1: Falsifiability revision`.
  It routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the
  restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above; `Evidence` pointing at `.qfai/evidence/atdd-spec-0004.md#tdd-0070`.
    `DR-ID` stays `-`, and `Blocked-By` stays `-`.
- Step 3b (`/qfai-implement`, run started 2026-09-23T21:11:02.206Z, backend-engineer
  `impl-row-0067`): entry verified. Branch `falsifiability` with its trio not yet
  written, so the row goes to step 3c. The selector is one entry over one
  boundary. The test hash recomputed to the approved `a4c8d3a8…063971`, and the
  tree address to the hand-off tree `working-tree+ea5fbfa4…a2870`. No ledger
  cell is written yet: step 3c writes `todo -> red`, with `Test file` and
  `Selector`, on the `qa-gatekeeper` PASS.
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: f074f302e1afd0f6886a6f830594018ffabd2eabb9496f656a1aaeb09b9a335c
  (lstat-mode form `a4c8d3a86f511c17e233f39cf6f91426212eb484925d23bc71bd8a3032063971`; same bytes as approved)
  (taken before the mutation, on `working-tree+ea5fbfa4…a2870`; the mutation lands
  in no manifest file)
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts
```

- Round 1: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts --reporter=verbose -t "TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row"`
- Round 1: Falsifiability result: exit 1; 1 test failed on an assertion. The predicate to break above, applied to
  `parseBlockedBy` in `packages/qfai/src/core/validators/tddList.ts`, the row's
  `Owning module`. With an empty or `-` cell parsed as `ok`, the blocked-row
  loop's `if (parsed.ok) continue;` skips row 1, and no
  `TDDLIST_BLOCKED_MISSING_REF` is raised for it. Run at 2026-09-24T01:13:51Z.
  Exit 1: the selector executed and failed on the presence assertion at line 103
  (`expected 0 to be greater than 0`), with no matching finding. That is an
  assertion inside the selector, not a load, transform or fixture error. The
  production copy before the mutation was byte-equal to `TDD-0069`'s GREEN copy.

```diff
@@ -274,7 +274,7 @@ type BlockedByParse =
 /** Parse a `Blocked-By` cell into its blocker and departure-status halves. */
 function parseBlockedBy(raw: string): BlockedByParse {
   const value = raw.trim();
-  if (value.length === 0 || value === "-") return { ok: false, reason: "missing-blocker" };
+  if (value.length === 0 || value === "-") return { ok: true, blocker: "", departureStatus: "todo" };

   const match = BLOCKED_BY_DEPARTURE_RE.exec(value);
   if (match === null) return { ok: false, reason: "missing-departure-status" };
```

```text
 × |integration| tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts > TC-0004-0076: a blocked row with an empty Blocked-By is rejected > TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row 632ms
   → expected 0 to be greater than 0

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts > TC-0004-0076: a blocked row with an empty Blocked-By is rejected > TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts:103:27
    101|         issue.texts.some((text) => text.includes("(row 1)")),
    102|     );
    103|     expect(naming.length).toBeGreaterThan(0);
       |                           ^
    104|   });
    105| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  10:13:51
exit=1
```

- Round 1: Falsifiability revision: working-tree+c1ba0661f602ec03a86253fb638c042634ca9f200b13e4a43a79f34312577784
  (the mutated tree, taken twice with equal results before any revert)

- `qa-gatekeeper` (routing phase `red`, step 3c falsifiability trio), qa-gatekeeper#1: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+c1ba0661f602ec03a86253fb638c042634ca9f200b13e4a43a79f34312577784 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5, taken while the mutation is in the tree).
  - Branch: branch 2 is right. The classification run passed on its first run and the P4b re-run passed on an unchanged tree, both on the approved hash `a4c8d3a8…063971`, and no RED was taken before the scope PASS. `Satisfied-by` names a production path and symbol, which is admissible on an `Integration` row handed over by `/qfai-atdd`. This row carries no `Pre-split-evidence: implement` marker, and TC-0004-0076 declares `Level` `integration`. It names the predicate to mutate, `parseBlockedBy` feeding the kept check in the blocked-row loop of `validateTddList`, not a commit.
  - Mutation in owned code: the gatekeeper diffed the mutated `tddList.ts` against the `TDD-0069` GREEN copy it kept at that build gate. Exactly one line differs: the empty or `-` branch of `parseBlockedBy` returns `{ ok: true, blocker: "", departureStatus: "todo" }` instead of `missing-blocker`. That is the predicate `Satisfied-by` names, in the `Owning module`, with no other production change. It is not a syntax error, a throw or a deleted export, and it touches no manifest file.
  - Falsifiability run: the gatekeeper re-ran the recorded command on the tree as it stands, which addresses to the recorded `Round 1: Falsifiability revision` `working-tree+c1ba0661…7784`. Exit 1, and the failure is the presence assertion at line 103 inside the selector, `expected 0 to be greater than 0`. The row's selector is named. Validate ran and read the fixture: it reported `TDDLIST_TC_TABLE_UNRESOLVED` for spec-0001, with `error=0`. So the missing finding is the mutation's effect, not a run that read nothing. No temporary tree was left.
  - Test unchanged: the RED test hash recomputes to `a4c8d3a8…063971` over the recorded manifest (`tempTree.ts` and the test file), equal to the value taken before the mutation and to the one the scope PASS covered.
  - Command: the falsifiability command equals the classification, RED and GREEN command.
  - For the restore and the GREEN (does not affect this PASS): revert `tddList.ts` to the pre-mutation bytes, that is the `TDD-0069` GREEN copy. Confirm that the address leaves `c1ba0661…7784`. Take `Round 1: Revision` from the restored run, then re-run the same command for the GREEN. Phase Green step 2a does not repeat the proof, because this mutation is the row's `Oracle proof`.

- Revert (after the `qa-gatekeeper` verdict): `tddList.ts` restored from its
  pre-mutation copy, byte-equal to `TDD-0069`'s GREEN copy. The tree address
  returned to `working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870` (taken twice), and the RED
  test hash still recomputes to `a4c8d3a8…063971`.
- Round 1: Revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts --reporter=verbose -t "TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row"`
- Round 1: GREEN result: exit 0; 1 test passed. The restored run, taken on the tree named by
  `Round 1: Revision`. The mutation above is this row's `Oracle proof`, so Phase
  Green step 2a is not repeated.

```text
 ✓ |integration| tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts > TC-0004-0076: a blocked row with an empty Blocked-By is rejected > TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row 519ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  10:17:26
   Duration  6.72s (transform 4.65s, setup 100ms, import 5.62s, tests 520ms, environment 0ms)

exit=0
```

- Ledger writes: `todo -> red` at 2026-09-24T01:17:43Z, with `Test file` and
  `Selector` copied from the row identity above, then `red -> green` at
  01:17:44Z with the `Evidence` pointer.
  `green -> refactor` followed at 01:20:23Z, after the local checkpoint below.
  Ordering: `red -> green` was written at 01:17:44Z, before any build-phase
  `qa-gatekeeper` gate had run on this row. `qa-gatekeeper#2` (Work Orders step
  77) later passed that same GREEN observation, taken on
  `working-tree+ea5fbfa4…a2870`. The ledger is left as written.
- Refactor (Phase: Refactor step 1): no change. This row writes no production
  code; the predicate it relies on is the kept check named in `Satisfied-by`.
- Relevant suite resolution: the row touches no production module, so the
  static-import set is empty. The local per-row set (the user's decision,
  AskUserQuestion, 2026-09-23) is the row's own test file-scoped, plus the other
  tests of the same blocked-row check (`TDD-0069`, `TDD-0071` and
  `tddListBlockedStatus.test.ts`), both type checks (the second reads this
  row's `tsconfig.tests.json` entry) and the rule-code drift check. The full
  package suite runs on CI at the final head, where every row's checkpoint
  closes. This deviates from the widen-to-package rule of
  `references/relevant-test-suite.md`, as recorded for `TDD-0067`.
- Refactor verify command: `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`. From the repository root, in this order:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. The four-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts tests/core/tddListBlockedStatus.test.ts
```

- Refactor verify result: every command exited 0. The type checks printed no
  diagnostic, and the drift check printed
  `src/core/emittedRuleCodes.ts is in sync (500 codes).` The vitest run (start
  10:19:29 local) printed `Test Files  4 passed (4)`, `Tests  30 passed (30)`
  and exit 0, with nothing skipped. Its verbose output names this row's
  selector as passed. Tree during the run: a new Change Request,
  `.qfai/decisions/CR-20260924-0001-the-out-of-project-refusal-of-init-force-has-no-test-case.md`,
  was written at 10:18:45 local while the type checks ran. No command here reads
  `.qfai/decisions/`, and the four tests build their own temporary trees, so no
  input of this run changed. The revision below was taken before step 1. The
  address after the run is
  `working-tree+f658df6c098b87251337de2a73566a1e30b1fce22715fc2b49e31c75c81c8e67`.
- Refactor verify revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- `qa-gatekeeper` (routing phase `build`), qa-gatekeeper#2 on the Round 1 GREEN and Oracle proof: PASS (instance `atdd-red-gate`, reviewed revision working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Freshness: the live tree addresses to `working-tree+f658df6c…c8e67`. With only the untracked `.qfai/decisions/CR-20260924-0001-the-out-of-project-refusal-of-init-force-has-no-test-case.md` excluded, it addresses to `Round 1: Revision` `ea5fbfa4…a2870` exactly. That file is read by neither the test nor the code under test. The RED test hash still recomputes to `a4c8d3a8…063971`.
  - Restore: `packages/qfai/src/core/validators/tddList.ts` is byte-equal to the pre-mutation copy the gatekeeper kept (the `TDD-0069` GREEN copy), so the falsifiability mutation is gone and no other production change came with the revert. `Round 1: Revision` equals the hand-off tree, which is the expected result for a row that writes no production code.
  - GREEN: `Round 1: GREEN command` equals the falsifiability command, and the RED and classification commands. The gatekeeper re-ran it: exit 0, and the verbose output names this row's selector as passing (1 test). Validate reported `error TDDLIST_BLOCKED_MISSING_REF` with the message `Blocked-By is empty … (row 1)`, which is the finding the assertion requires.
  - Oracle proof: the step 3c mutation of `parseBlockedBy` that qa-gatekeeper#1 passed on `c1ba0661…7784` is this row's proof. Phase Green step 2a is not repeated on branch 2, as `qfai-implement/SKILL.md` step 3c states. It was in the `Owning module`, it broke the predicate `Satisfied-by` names, it failed at the line 103 assertion, and it ran the same command as this GREEN.
  - Model: the same shape as the `TDD-0071` build gate: no production change of its own, and a GREEN on the tree the predicate already holds on, with that source named in `Satisfied-by`.
  - Order: the ledger wrote `red -> green` at 01:17:44Z, before this gate. This PASS supplies the missing build-phase confirmation of the same GREEN observation. It does not rewrite when the transition was made. That deviation belongs to the completion review that raised it.

- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924175617142 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 4a32df171c56588a674e014295c782fd201685ebf5549df3dfc22533ef857a4c
- Prototype parity: n/a (not UI-affecting)
- Prototype parity rationale: `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870.
- Historical Prototype parity reviewed revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Checkpoint timing: this row stops at `refactor`, and its checkpoint fields
  and seal are written from the final head's CI run (the user's decision,
  recorded in `### TDD-0067`).

- Historical review record: The verdicts, reviewed revisions, and audited hashes below belong to earlier evidence and do not attest to this revised section.

- Historical Code quality review: PASS (implementation-reviewer, instance `impl-review-0070`, 2026-09-24T01:38:53Z, Round 1, no blocking finding; the PASS was re-confirmed on the current section). This row changes no production code; its GREEN is the kept `TDDLIST_BLOCKED_MISSING_REF` check named in `Satisfied-by`.
- Historical Code quality reviewed revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Historical Code quality audited evidence hash: 7977465003ce3c4b8bb870abc439ce7f6737ef1cdfcd7bdad84e430f56bff9f1
  (the gate's `completedEvidenceAuditHash` rule: the section cut at `- Prototype parity:`,
  plus line 57 and the first line of the paragraph at line 87 of
  `coverage-depth-spec-0004.md`)
- Historical Round 1: reviewer verdict (attempt 1): completion-reviewer REVISE (instance
  `impl-cr-0070`). `red -> green`
  was written at 01:17:44Z before any build-phase `qa-gatekeeper` gate had run.
  Path: no new production behaviour, so no round was opened. The build gate
  then ran and passed (`qa-gatekeeper#2`, Work Orders step 77), and the ordering
  note under `Ledger writes` records it.
- Historical Round 1: reviewer verdict (attempt 2): completion-reviewer PASS (instance
  `impl-cr-0070`), reviewed revision working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870.
- Historical Spec reviewed revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Historical Spec audited evidence hash: 9be0b2f72f0312ed7364ebe443589b801e68f02102d46b4a8cfcc07aa3464b08
- Checkpoint: deferred. The checkpoint fields and seal are written from the
  final head's CI run (the user's decision, recorded in `### TDD-0067`).

- Spec review: PASS
- Spec reviewed revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Spec audited evidence hash: 1cd510ddf6efbd333d9de2d8ff97c3790665e889923c9abe571f00266288ea6e
- Spec review pack: .qfai/review/review-20260924175617142 <!-- qfai:not-a-citation -->
- Spec review pack seal: 4a32df171c56588a674e014295c782fd201685ebf5549df3dfc22533ef857a4c
- Code quality review: PASS
- Code quality reviewed revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Code quality audited evidence hash: 1cd510ddf6efbd333d9de2d8ff97c3790665e889923c9abe571f00266288ea6e
- Code quality review pack: .qfai/review/review-20260924175617142 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 4a32df171c56588a674e014295c782fd201685ebf5549df3dfc22533ef857a4c
- Prototype parity reviewed revision: working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts --reporter=verbose; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — file-scoped run: 1 file, 1 test(s) passed, selector named in verbose output; CI run https://github.com/aganesy/QFAI/actions/runs/36026684599: all nine test slices and ci-pass passed at b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d.
- Checkpoint verification revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Checkpoint verification seal: 20e5f323c64ccc7b6a1e974562fb687f1f149a4be6d4ca4b23e890cc1a2fa0a0

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0004.md` (committed). Totals: ✅ 54 / ⚠️ 21 / ❌ 0,
`n/a` 42, across 117 scored cells: 27 matrix cells and 90 business rule cells.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | atdd-preflight-tda | P0 plan and obligations, P1 layer assignment, P1b branch per row | `spec-0004/02_User-stories.md`, `04_Business-Rules.md`, `06_Test-Cases.md`, `tdd/test-list.md` | `.qfai/evidence/coverage-depth-spec-0004.md`; volume E2E 14 / API 0 / Integration 38; opt-in off; no CON-API / CON-DB | PASS |
| 2 | devops-ci-engineer | - | P1a `Phase: Skeleton` re-run for `qfai` | `catalog/tech.md#standard-commands-copy-paste` | `.qfai/evidence/skeleton.md` (Re-run — `/qfai-atdd` stage gate P1a, 2026-09-23T19:33:24.738Z) | PASS |
| 3 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Fix EX-0004-0044 / BR-0004-0035 (and AC-0004-0041, TC-0004-0076) through CR-20260923-0011 | `spec-0004/05_Examples.md`, `04_Business-Rules.md` | `CR-20260923-0011` (applied); the example gave a passing `Blocked-By` the kept `TDDLIST_BLOCKED_MISSING_REF` check rejects, and changing settled input is the user's to approve | PASS |
| 4 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Per-row P1c loop; a row a sibling's GREEN already satisfies moves to branch 2 with `Satisfied-by` naming that sibling; TDD-0070 is branch 2, re-classified right before handover, `Satisfied-by` naming `packages/qfai/src/core/validators/tddList.ts` and the kept `TDDLIST_BLOCKED_MISSING_REF` check | `.claude/skills/qfai-atdd/SKILL.md` P1c | Stage gate P1c requires one loop per row before the next RED; disagreeing position: the author (`atdd-preflight-tda`) recommended taking every RED first in one batch | PASS |
| 5 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Seven new integration files, one `it` per ledger row, annotations in the files, each added to `tsconfig.tests.json`, `runValidate` / `runInit` called in-process from `src`, not `initSpec0003.test.ts` | `spec0004ProfileSuffixedValidate.test.ts`, `packages/qfai/tsconfig.tests.json` | One `it` per row keeps each selector equal to its row; in-process `src` calls follow the existing spec-0004 suite and need no build; the include list is an enumeration. Amended by the griller from the author's proposal | PASS |
| 6 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): "Names `.qfai/steering/`" scans `file`, `relatedFiles[]`, `refs[]`, `message`, `suggested_action`, normalises `\` to `/`, and matches `.qfai/steering` followed by `/` or end of string | `packages/qfai/src/core/types.ts` `Issue` | A finding can name a path in any of those fields; Windows separators would hide a match; the boundary keeps `.qfai/assistant/steering/` from matching. Amended by the griller | PASS |
| 7 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Every absence oracle also shows the scanner under test read the fixture; a written report proves nothing | `06_Test-Cases.md` TC-0004-0074 … 0076 | An absence observed over a run that read nothing passes vacuously. Amended by the griller | PASS |
| 8 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0071 unreadable file: `chmod 000` on POSIX, `icacls <f> /deny *S-1-1-0:(R)` on win32 with the deny removed before cleanup; assert first that `readFile` rejects; record the host | `05_Examples.md` EX-0004-0044 | The fixture must be unreadable on both hosts, and asserting the rejection first keeps a no-op permission change from reading as a pass. Amended by the griller | PASS |
| 9 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Each `it` gets its own fixture; TDD-0097 runs plain init then `--force`, asserting after `--force` against the pre-run record | `spec-0004/07_Decisions.md` DR-0004-0037 | Each test builds its own tree, as DR-0004-0037 records; comparing against the pre-run record shows what `--force` changed | PASS |
| 10 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): After init, delete everything under `.qfai/steering/`, write exactly the EX-0003-0053 set, then record paths and hashes | `spec-0003/05_Examples.md` EX-0003-0053 | A tree holding exactly the example's set makes the preserved paths and hashes reproducible | PASS |
| 11 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Build lock records with the exported `hashAssistantAssetText`, `readAssistantAssetsLock`, `writeAssistantAssetsLock`; schema content an inline literal; TDD-0068 removes the lock record init writes | `packages/qfai/src/core/assistantAssetProvenance.ts` | Reuses the exported lock helpers rather than re-implementing the lock format; an inline literal keeps the test self-contained. Amended by the griller | PASS |
| 12 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0099 note oracle requires, on one report line, `NOTE:`, a normalised path ending `catalog/worklog-entry.schema.md`, "no longer shipped", "content has been edited", "was not removed" | `spec-0003/06_Test-Cases.md` | Pinning every part to one line fails a partial or split message. Amended by the griller | PASS |
| 13 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Text oracles: exact case-sensitive substrings for code tokens, case-insensitive for "work-log" / "work-log entry"; presence ties each record kind to its home inside the extracted unit; a row whose current text already passes is branch 2, never a reshaped oracle | `spec-0011/06_Test-Cases.md`, `spec-0013/06_Test-Cases.md` | Exact tokens avoid false passes, and prose casing varies; reshaping an oracle to force a failure is forbidden by the RED provenance rules. Amended by the griller | PASS |
| 14 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Retired annotations in acceptance-test territory (`validatorConvergenceIntegration.test.ts`, the root `tests/**/qfai-traceability.md` lines) are removed by `/qfai-implement` with the symbol removal, as the deltas say; record the ownership exception | `spec-0004/09_delta.md` | The deltas pair each annotation's removal with its symbol's, so one change removes both; the exception is recorded because those files are this stage's territory | PASS |
| 15 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): BR-0003-0009 floor cell goes to a Change Request, not satisfied this run; other carried ❌ cells cite one DR/CR per cluster; scoring only this change's TC rows is recorded as a decision | `.qfai/evidence/coverage-depth-spec-0003.md` | The refusal to write outside the project is a safety floor the matrix cannot waive; disagreeing position: the author (`atdd-preflight-tda`) recommended recording it as an open risk. Amended by the griller before it went to the user | PASS |
| 16 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Checkpoints (related suites, full suite at row 10 and the last row) run locally for this task | `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md` | Checkpoints need more than the new tests the local-run permission covered, so the user was asked. Superseded by the user's later AskUserQuestion answer (2026-09-23): the full suite runs on CI at the boundaries; the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check | PASS |
| 17 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0022 extracts the `blocked -> todo` bullet under `### Allowed transitions` in `execution-ledger.md`, up to the next top-level bullet, and asserts exactly one match | `spec-0011/06_Test-Cases.md` | A bounded extract with one match reads only the transition the row owns | PASS |
| 18 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0067 | `### TDD-0067` Round 1; `spec0004WorklogSurfaceRemoval.test.ts`; `spec-0004/06_Test-Cases.md` TC-0004-0074, `05_Examples.md` EX-0004-0042, `03_Acceptance-Criteria.md` AC-0004-0040 | Observation admissible (RED reproduced; RED test hash and revision recomputed equal; strip valid; D4/D5 followed). REVISE: `delivery-planner` scope approval is missing, and red-provenance step 3 requires it before the RED is run | REVISE |
| 19 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0067 (resubmission) | `### TDD-0067` Round 1 approved RED (20:34:08Z) and its stripped run; `delivery-planner` PASS 20:32:56Z; `spec0004WorklogSurfaceRemoval.test.ts` | PASS: approval precedes the RED; RED reproduced; RED test hash `5c2400e2…d3ba1` and revision recomputed equal; strip valid; Oracle proof plan in `validateProject` names the GREEN command. Required before handover: relabel the `Interrupted RED (block 1)` group, because the row was never `blocked` | PASS |
| 19 | delivery-planner | atdd-scope | Scope approval TDD-0067 | `### TDD-0067`; `spec0004WorklogSurfaceRemoval.test.ts` (RED test hash `5c2400e2…d3ba1`); `spec-0004/06_Test-Cases.md` TC-0004-0074, `05_Examples.md` EX-0004-0042, `03_Acceptance-Criteria.md` AC-0004-0040, `04_Business-Rules.md` BR-0004-0034; `tdd/test-list.md` TDD-0067 | Scope PASS. The selector covers the whole of TC-0004-0074 and one boundary (BR-0004-0034, validate does not read `.qfai/steering/`). It asserts nothing the TC leaves out: the AC second clause is TDD-0068's. Given after the Round 1 RED, so a fresh RED and stripped run are owed before resubmission | PASS |
| 20 | acceptance-test-engineer | atdd-ate | TDD-0067 test + RED | `spec-0004/06_Test-Cases.md` TC-0004-0074, `05_Examples.md` EX-0004-0042, `03_Acceptance-Criteria.md` AC-0004-0040, `04_Business-Rules.md` BR-0004-0034; S1 D3-D5, D11 | `packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts` (RED test hash `5c2400e2…d3ba1`), `packages/qfai/tsconfig.tests.json`; approved RED and its stripped run at `working-tree+06abf1f7…f9e494` in `### TDD-0067` Round 1; the first RED kept under **Pre-approval RED (superseded)** | PASS |
| 21 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): In `cli/commands/validate.ts` remove only `"W-WORKLOG-*"` and `"W-PENDING-PROMOTION"` from the sdd family list and fix the comment above it; keep `R-HANDOFF-INCOMPLETE` and `R-WORKLOG-DRIFT` in `reviewer-gate-sdd`; the frozen code lists in `findingCodeGrammar.test.ts`, `issueCodeUniqueness.test.ts` and `ruleCodeUniqueness.test.ts` change only as far as they fail | `spec-0004/10_Plan.md` "Removing the work-log surface"; `tests/unit/validators-are-wired.test.ts` | Removing the call alone leaves `validateWorklogSurface` unwired, and that guard's allowlist may only shrink, so the module and the codes only it emits go with this row. The two `reviewer-gate-sdd` codes are re-emitted by `reviewerJustification.ts` and leave with TDD-0018 and `ADVISORY_FAILING_CODES` | PASS |
| 22 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Take exactly the retired rows' test edits `spec-0004/09_delta.md` lists: the TC-0004-0016, -0017, -0019, -0020, -0021 and -0027..-0031 annotations, US-0004-0029 and US-0004-0031 in the e2e carrier, and the TDD-0027..TDD-0031 entries of `KNOWN_TEST_FILE_DRIFT`; nothing more | `spec-0004/09_delta.md` "What happens to the retired rows' tests"; S1 D12 of the `/qfai-atdd` run | Those edits are paired with deleting `worklogSurface.test.ts`, which this row does; D12 puts retired annotations with the symbol removal | PASS |
| 23 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Defer `worklogEntries.ts`, Check 8b and its expected-state strings in `cli/commands/validate.ts`, `ADVISORY_FAILING_CODES`, the `assistantPaths.ts` constants, the init seed, the asset withdrawal, the docs and the dogfood re-pin to later rows; source comments naming `worklogSurface.ts` may point at a deleted file until a later row, and must be gone before the change's head | `spec-0004/10_Plan.md` removal order steps 2-7; `tdd/test-list.md` TDD-0018, TDD-0068..TDD-0072 | Each deferred item has a live row or a later plan step that owns it; `worklogEntries.ts` is still imported by `tddList.ts` | PASS |
| 24 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Measure the pre-existing failures from clean HEAD in a separate `git worktree` with junctioned `node_modules` and its own `dist/`, recorded by file and test name, then remove the worktree; add `tsc -p tsconfig.tests.json --noEmit` and `generate:rule-codes --check` to the checkpoint; a failure this change causes is owed by it | `references/checkpoint-verification.md`; `references/relevant-test-suite.md` | A separate worktree leaves this tree untouched and avoids the shared stash stack. Disagreeing position (backend-engineer `impl-row-0067`): measure on this worktree's tree before the change, because clean HEAD lacks the uncommitted spec-pack edits and would attribute their failures to this row; that run is kept as supplementary data | PASS |
| 25 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): The `## Cross-spec obligations` entry lists other specs' `done` rows found by matching the package fallback against `Test file`, and their selectors are re-run read-only before `completion-reviewer` sees them | `references/cross-spec-ownership.md` | The import walk from `validate.ts` cannot be completed (non-literal dynamic imports, e2e tests through `dist/`), so the rule widens to the package | PASS |
| 26 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): In `validate.profileCoverageNotice.test.ts` drop only the two work-log family assertions | `tests/integration/cli/commands/validate.profileCoverageNotice.test.ts` | They pin the two family entries this row removes; nothing else in that file names the surface | PASS |
| 27 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): That removal is the plan's own step 4, not a new obligation | `spec-0004/10_Plan.md` removal order step 4 | Step 4 removes the tests that pin the surface | PASS |
| 28 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Leave the free-text `W-PENDING-PROMOTION` in `args.test.ts` and the sdd preflight tests, the synthetic probe in `contractDeferralNotes.test.ts`, and the TC-0004-0015 title in `assistantTreeMigration.test.ts` (advisory only) | the four test files named | They use the string as data or name a code without depending on its emitter, so the removal does not change their result | PASS |
| 29 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): `worklogSchemaShipped.test.ts` stays until the asset-withdrawal row | `tdd/test-list.md` TDD-0068 | It pins the shipped schema asset, which TDD-0068 withdraws | PASS |
| 30 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Add nothing the row's GREEN, the type check, the lint or the listed edits do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 31 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0067 | `### TDD-0067` Round 1 GREEN pair and Oracle proof; `Round 1: Revision` working-tree+6bd3dce938ff90…; `packages/qfai/src/core/validate.ts` | PASS: GREEN re-run, exit 0, selector passing; tree address and RED test hash recomputed equal; both mutations re-applied, each fails line 151 on its own half; the `runSddValidators` site is accepted as the owned call site the GREEN removed; grilling block precedes the first production write. Advisory: mutation 1 is larger than the smallest change | PASS |
| 32 | completion-reviewer | impl-cr-0067 | Item review TDD-0067 | `### TDD-0067` (handoff, Round 1 RED/GREEN/Oracle proof, refactor verify); `tdd/test-list.md` TDD-0067; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0040, `04_Business-Rules.md` BR-0004-0034, `05_Examples.md` EX-0004-0042, `06_Test-Cases.md` TC-0004-0074, `09_delta.md`; `## Cross-spec obligations` | PASS at working-tree+c40624af…9db549 (content-equal to 4c48e72f1). `done` waits for a passing full-suite checkpoint on that content; the ten cross-spec entries stay open | PASS |
| 32 | implementation-reviewer | impl-ir-0067 | Item review TDD-0067 | `git diff` of `packages/qfai` and `tests/` at working-tree+c40624af…9db549 (the same content is at HEAD `4c48e72f1`); `spec-0004/10_Plan.md` "Removing the work-log surface"; Work Orders rows 21–30; `### TDD-0067` | PASS. Both type checks exit 0, and the row selector passes. The P-D1 boundary holds: `R-HANDOFF-INCOMPLETE` and `R-WORKLOG-DRIFT` stay in `reviewer-gate-sdd`. Legacy steering code and `R-HANDOFF-SCHEMA-DRIFT` are untouched, and no remaining consumer of a removed symbol exists. Advisory: stale `worklogSurface.ts` comments and README or doc code names are deferred by decision 23 and must be gone before the change's head. The verdict is pinned to the reviewed revision because HEAD moved during review | PASS |
| 33 | implementation-reviewer | impl-ir-0067 | Item re-review TDD-0067 at the merged commit | `git diff 4c48e72f1 536fc4ddd` over `packages/qfai` and `tests/`; main's `src/core/validators/tddList.ts` hunks; `### TDD-0067` re-taken `Refactor verify` at `536fc4ddd` | PASS at 536fc4ddda6894af728745a0765999aa82438ec5. The row's diff is unchanged apart from main's own `tsconfig.tests.json` include entry. Main's `tddList.ts` changes and new tests use no removed symbol or code and do not touch Check 8b. Both type checks exit 0 under TypeScript 6.0.3, and the row selector passes. Audited evidence hash recomputed: `dada6af4…94ad`. The row 32 advisories stand | PASS |
| 33 | completion-reviewer | impl-cr-0067 | Item re-review TDD-0067 after the merge of main | `### TDD-0067` (re-taken item 6 at `536fc4ddd`); `git diff 3a436e308 536fc4ddd` against `git diff 45587f6b2 4c48e72f1`; `refs/pull/2221/merge`; `## Cross-spec obligations`; other specs' ledgers at `536fc4ddd` | PASS at 536fc4ddd. `done` waits for a passing full suite on a tree equal to 536fc4ddd's; the CI merge commit 476bbb77 adds main's gherkin bump. Cross-spec entries for spec-0003 and spec-0012 miss 14 newly `done` rows | PASS |
| 34 | delivery-planner | atdd-scope | Scope approval TDD-0069 | `### TDD-0069`; `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts` (test hash `11e2bf06…2594d1`); `spec-0004/06_Test-Cases.md` TC-0004-0076, `05_Examples.md` EX-0004-0044, `03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035 (as amended by `CR-20260923-0011`); `tdd/test-list.md` TDD-0069 … TDD-0071 | Scope REVISE. The `steeringTexts` half asserts the TC's third-tree result ("no finding names `.qfai/steering/`"), which `TDD-0071` owns, and can fail with `rowErrors` empty (Oracle mutation 3). Drop that half and mutation 3, then resubmit for approval before any RED. The `rowErrors` half is sufficient for the first tree. The `TDD-0003` control is a legitimate S1 D5 read-proof | REVISE |
| 35 | delivery-planner | atdd-scope | Scope approval TDD-0069 (resubmission) | `### TDD-0069`; revised `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts` (test hash `ddf4adda…ddba10`, tree `working-tree+818c7ff4…e53e6f`); `spec-0004/06_Test-Cases.md` TC-0004-0076; step 34 REVISE | Scope PASS. The absence assertion is `rowErrors` only, and `steeringTexts`, `STEERING_PATH` and mutation 3 are gone. One boundary: TC-0004-0076's first tree, no error-severity finding for the row. The `TDD-0003` control stays as the S1 D5 read-proof. Nothing from `TDD-0070` or `TDD-0071` is asserted | PASS |
| 36 | acceptance-test-engineer | atdd-ate | TDD-0069 test + RED | `spec-0004/06_Test-Cases.md` TC-0004-0076, `05_Examples.md` EX-0004-0044, `03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035 (as amended by `CR-20260923-0011`); S1 D3-D5 | `packages/qfai/tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts` (RED test hash `ddf4adda…dba10`), `packages/qfai/tsconfig.tests.json`; revised per the scope REVISE; approved RED and its stripped run at `working-tree+818c7ff4…e53e6f` in `### TDD-0069` Round 1 | PASS |
| 37 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0069 | `### TDD-0069` Round 1 approved RED (23:23:00Z) and its stripped run; `delivery-planner` PASS 23:21:57Z on `ddf4adda…dba10`; `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts`; TC-0004-0076 / EX-0004-0044 / AC-0004-0041 / BR-0004-0035 | PASS: RED reproduced at line 118 (`QFAI-TDDLIST-015`) after the line 111 control; hash and revision recomputed equal; strip valid, with the one-`it` file, the `-t` filter and a no-skip success line shown in place of a test name. Required before the build gate: add a mutation that restores the steering requirement the GREEN removes | PASS |
| 38 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Remove from `tddList.ts` the Check 8b block "a stopped ledger owes a steering record", `blockedRowLabels`, `blockedWithoutWorklog`, `readSteeringIndex`, `BlockedWorklogGate`, `StoppedSpecIndex`, the `gate` wiring in `validateTddList` and the `gate` parameter of `validateSpecTddList`, and the `worklogEntries.js` and `PROJECT_STEERING_DIR` imports; keep the "parked items must be visible in CI" block and `TDDLIST_BLOCKED_MISSING_REF` | `spec-0004/10_Plan.md` "Removing the work-log surface"; `packages/qfai/src/core/validators/tddList.ts` | This is the plan's list for `tddList.ts`; `blockedRowLabels` has no other reader | PASS |
| 39 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Delete `src/core/worklogEntries.ts` in this row | `git grep worklogEntries` over `src`, `tests`, `scripts` | After the `tddList.ts` removal it has no importer, the plan lists it, and no later row owns it. Alternative considered: keep it as dead code until a later row | PASS |
| 40 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Remove the `QFAI-TDDLIST-015` and `QFAI-TDDLIST-016` expected-state entries and their comments from `cli/commands/validate.ts`, and regenerate `emittedRuleCodes.ts` | `tests/unit/issueCatalogHasEmitters.test.ts`; implement S1 decision 23 | A catalog entry whose code nothing emits fails that guard; S1 deferred these entries to this row | PASS |
| 41 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): In `tddListBlockedStatus.test.ts` remove the `QFAI-TDDLIST-015` describe block and the helpers only it used (the `node:fs/promises` mock, `SteeringSeed`, the `steering` parameter and `steeringIsRegularFile` option of `run()`, `entry()`, the `HANDOFF_REQUIRED_SECTIONS` import, the header lines on the steering setup), plus the imports that become unused (`vi`, `type * as FsPromises`); every other describe stays | `spec-0004/10_Plan.md` removal order step 4 | The plan removes the tests that pin the surface; left behind, the helpers and imports are unused and fail `eslint --max-warnings 0`. The unused imports were added by the griller | PASS |
| 42 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): The frozen code lists change only as far as they fail | `findingCodeGrammar.test.ts`, `issueCodeUniqueness.test.ts`, `ruleCodeUniqueness.test.ts` | The same rule S1 decision 21 set; 015 and 016 use the canonical grammar and sit on no pending list, so no change is expected | PASS |
| 43 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Defer the `assistantPaths.ts` constants, the skill text naming `QFAI-TDDLIST-015` with `implementWorklogObligation.test.ts`, `ADVISORY_FAILING_CODES`, the asset withdrawal, the docs, CHANGELOG, the dogfood re-pin and the remaining comments naming `worklogSurface.ts` to their later rows and plan steps; all must land before the change's head | `spec-0004/10_Plan.md` removal order steps 2-7 | Each has an owner later in the order. Griller advisory: until the spec-0011 row rewrites the skill text, the shipped skill still tells an agent to write a `.qfai/steering/` entry for a blocked row, and this run does not follow it | PASS |
| 44 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): `/qfai-atdd` takes TDD-0071's RED before this row's GREEN, and this GREEN then satisfies TDD-0071 as well | `.claude/skills/qfai-implement/references/red-not-observable.md`; the user's stop-at-`refactor` decision | Once this GREEN lands nothing reads `.qfai/steering/`, so TDD-0071 would pass on its first run. Its branch-2 route needs a `done` sibling, and no row reaches `done` before the head. Amended by the griller from the author's proposal (reclassify TDD-0071 as branch 2) | PASS |
| 45 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Run all three planned Oracle proof mutations and record in `Round 1: Oracle proof` that the scope-approval text "mutation 3 is gone" refers to an earlier, different mutation 3; mutation 1 is shown failing at the line-118 assertion, not on a type error | `### TDD-0069` Oracle proof plan and scope approvals | Mutation 3 is the only one that breaks what this GREEN changes; `/qfai-atdd` corrects its own record. Amended by the griller from the author's proposal (restore the blocked-row labels inside mutation 3 only) | PASS |
| 46 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Add nothing the row's GREEN, the type check, the lint or the listed edits do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 47 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Local checkpoint set: the row's test, the test files whose static imports reach `tddList.ts`, `worklogEntries.ts`, `emittedRuleCodes.ts` or `cli/commands/validate.ts`, plus `ruleCodeUniqueness`, `validators-are-wired`, `issueCatalogHasEmitters`, `generateEmittedRuleCodes`, `implementWorklogObligation`, `gateGroupCoverage`, `findingCodeGrammar`, `issueCodeUniqueness` and `spec0004WorklogSurfaceRemoval` (TDD-0067 regression), with both type checks, the rule-code drift check, eslint and prettier | The user's local-checkpoint decision (AskUserQuestion, 2026-09-23) | The files that read source rather than import it are added by name, because a static-import scan cannot find them. The last four were added by the griller | PASS |
| 48 | delivery-planner | atdd-scope | Scope approval TDD-0071 | `### TDD-0071`; `spec0004SteeringUnreadableBlockedRow.test.ts` (test hash `74be7f2f…9b5768`); `spec-0004/06_Test-Cases.md` TC-0004-0076, `05_Examples.md` EX-0004-0044 third clause, `03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035 (as amended by `CR-20260923-0011`); `tdd/test-list.md` TDD-0069 … TDD-0071 | Scope REVISE. `rowErrors` asserts the first tree's result, which `TDD-0069` owns. It fails on its own, and `TDD-0069`'s mutations would fail it. The TC's third-tree result is "no finding names `.qfai/steering/`" only. Reduce the assertion to `steeringTexts`, rename the selector, drop mutation 2, then resubmit before any RED. The fixture, the D6 setup and the `TDD-0003` read-proof stand | REVISE |
| 49 | delivery-planner | atdd-scope | Scope approval TDD-0071 (resubmission) | `### TDD-0071`; revised `spec0004SteeringUnreadableBlockedRow.test.ts` (test hash `9f0091e3…06e7dc`, tree `working-tree+a495f6e2…210a4b`); `spec-0004/06_Test-Cases.md` TC-0004-0076; step 48 REVISE | Scope PASS. The only absence assertion is `steeringTexts`. `rowErrors`, `NAMES_ROW_1` and mutation 2 are gone, and the selector names only the third-tree result. One boundary: TC-0004-0076's third tree, no finding names `.qfai/steering/`. The D6 setup and the `TDD-0003` read-proof stand. Nothing from `TDD-0069` or `TDD-0070` is asserted | PASS |
| 50 | acceptance-test-engineer | atdd-ate | TDD-0071 test + RED | `spec-0004/06_Test-Cases.md` TC-0004-0076, `05_Examples.md` EX-0004-0044, `03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035 (as amended by `CR-20260923-0011`); S1 D3-D6; implement griller S2 | `packages/qfai/tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts` (RED test hash `9f0091e3…06e7dc`), `packages/qfai/tsconfig.tests.json`; revised per the scope REVISE; approved RED and its stripped run at `working-tree+a495f6e2…210a4b` on win32 (`icacls`) in `### TDD-0071` Round 1 | PASS |
| 51 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0071 | `### TDD-0071` Round 1 approved RED (23:46:13Z, win32 icacls deny) and its stripped run; `delivery-planner` PASS 23:45:01Z on `9f0091e3…06e7dc`; `spec0004SteeringUnreadableBlockedRow.test.ts`; TC-0004-0076 / EX-0004-0044 / AC-0004-0041 / BR-0004-0035 | PASS: RED reproduced at line 152 (`QFAI-TDDLIST-016` naming `.qfai/steering/unreadable.md`) after the EPERM precondition and the control; hash and revision recomputed equal; `TDD-0069`'s hash still valid; strip valid; Oracle proof plan re-adds the 016 read. For the build gate: an own GREEN run on the tree after `TDD-0069`'s GREEN | PASS |
| 52 | delivery-planner | atdd-scope | Scope approval TDD-0068 | `### TDD-0068`; `spec0004WithdrawnSchemaFinding.test.ts` (test hash `b52a9713…d416b9`, tree `working-tree+66f26578…96b3b9`); `spec-0004/06_Test-Cases.md` TC-0004-0075, `05_Examples.md` EX-0004-0043, `03_Acceptance-Criteria.md` AC-0004-0040 second clause, `04_Business-Rules.md` BR-0004-0034; `tdd/test-list.md` TDD-0068 | Scope PASS. The selector covers the whole of TC-0004-0075: `error QFAI-ASSETS-006` names the written-back schema in an initialised tree under the full profile. One boundary. The lock-record removal is S1 D9 and matches the TC's post-GREEN tree. The `unshipped-control.md` control is legitimate, as proof of attribution rather than as a vacuity guard. Nothing from `TDD-0067` is asserted | PASS |
| 53 | delivery-planner | atdd-scope | Scope approval TDD-0068 (renamed selector) | `### TDD-0068`; `spec0004WithdrawnSchemaFinding.test.ts` (test hash `d27c64b0…48805c`, tree `working-tree+1a69d4ec…61e260a`); step 52 PASS; `spec-0004/06_Test-Cases.md` TC-0004-0075 | Scope PASS. Only the `it` name changed. The new name states the same single TC-0004-0075 result, `QFAI-ASSETS-006` at `error` for the remaining schema. Fixture, control and oracle are unchanged, so the step 52 reasons hold | PASS |
| 54 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0069 | `### TDD-0069` Round 1 GREEN pair and Oracle proof; `Round 1: Revision` working-tree+66f26578…; `packages/qfai/src/core/validators/tddList.ts` | PASS: GREEN re-run, exit 0, selector passing; RED test hash unchanged; current tree differs from the Revision only by the TDD-0068 `it` rename (proved by substitution); `--reporter=verbose` accepted, same command shape; three mutations each fail line 118 (015 restore among them); `validateSpecTddList` site accepted as the owned call site | PASS |
| 55 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0071 | `### TDD-0071` Round 1 GREEN pair and Oracle proof; `Round 1: Revision` working-tree+66f26578…; `packages/qfai/src/core/validators/tddList.ts` | PASS: GREEN re-run, exit 0, selector passing; RED test hash unchanged; current tree differs from the Revision only by the TDD-0068 `it` rename (proved by substitution); `--reporter=verbose` accepted, same command shape; GREEN on TDD-0069 Round 1's tree, that round named; mutation fails line 152 after precondition and control; `validateSpecTddList` site accepted as the owned call site | PASS |
| 56 | acceptance-test-engineer | atdd-ate | TDD-0068 test + RED | `spec-0004/06_Test-Cases.md` TC-0004-0075, `05_Examples.md` EX-0004-0043, `03_Acceptance-Criteria.md` AC-0004-0040, `04_Business-Rules.md` BR-0004-0034 (`Contract-Refs: CLI-VAL`); S1 D3-D5, D9 | `packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts` (RED test hash `d27c64b0…48805c`), `packages/qfai/tsconfig.tests.json`; `it` renamed so the selector matches itself as a `-t` pattern; approved RED and its stripped run at `working-tree+1a69d4ec…1e260a` in `### TDD-0068` Round 1 | PASS |
| 57 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0068 | `### TDD-0068` Round 1 approved RED (00:08:57Z) and its stripped run; `delivery-planner` re-approval 00:04:58Z on `d27c64b0…48805c`; `spec0004WithdrawnSchemaFinding.test.ts`; TC-0004-0075 / EX-0004-0043 / AC-0004-0040 / BR-0004-0034 | PASS: RED reproduced at line 116 (schema `error QFAI-ASSETS-005`, not `006`) after the line 113 control; hash and revision recomputed equal; the attempted run correctly recorded as not a RED; strip valid; Oracle proof plan re-lists the schema in `governedAssistantManifest.ts` | PASS |
| 58 | implementation-reviewer | impl-ir-0067 | Item review TDD-0069 | `git diff 536fc4ddd` over `src/core/validators/tddList.ts`, `src/core/worklogEntries.ts` (deleted), `src/cli/commands/validate.ts`, `src/core/emittedRuleCodes.ts`, `tests/core/tddListBlockedStatus.test.ts`, `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts`; `spec-0004/10_Plan.md`; S2 decisions 38–47; `### TDD-0069` | PASS at working-tree+1a69d4ec…e260a (HEAD `536fc4ddd`). The removal matches the plan list and S2. The kept parked-items Check 8b, `TDDLIST_BLOCKED_MISSING_REF` and `parseBlockedBy` are intact. No remaining consumer of a removed symbol or code, apart from the skill text decision 43 defers. Legacy steering code and `.qfai/handoff.yaml` are untouched. Both type checks exit 0, and the selector passes. Advisory: the report-reader helper is copied in four ATDD files (owner `/qfai-atdd`); `TC-ref` is not the ledger value (`record:QFAI-TDDLIST-008`) | PASS |
| 58 | completion-reviewer | impl-cr-0067 | Item review TDD-0069 | `### TDD-0069`; `tdd/test-list.md` TDD-0069; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035, `05_Examples.md` EX-0004-0044, `06_Test-Cases.md` TC-0004-0076, `10_Plan.md`; S2 rows 38-47 | PASS at working-tree+1a69d4ec…61e260a (`refactor`-complete). Advisory: no cross-spec entry names this row's change | PASS |
| 59 | implementation-reviewer | impl-ir-0067 | Item review TDD-0071 | `spec0004SteeringUnreadableBlockedRow.test.ts`; `### TDD-0071`; the `### TDD-0069` production review | PASS at working-tree+1a69d4ec…e260a (HEAD `536fc4ddd`). No production change of its own; its GREEN is `TDD-0069`'s. The permission setup is awaited and restored in `finally`, and the rejection is asserted first. Both type checks exit 0, and the selector passes. Advisory: the same helper duplication; `TC-ref` is not the ledger value (`record:QFAI-TDDLIST-008`) | PASS |
| 59 | completion-reviewer | impl-cr-0067 | Item review TDD-0071 | `### TDD-0071`; `tdd/test-list.md` TDD-0071; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035, `05_Examples.md` EX-0004-0044, `06_Test-Cases.md` TC-0004-0076; S2 row 44 | PASS at working-tree+1a69d4ec…61e260a (`refactor`-complete) | PASS |
| 60 | orchestrator | - | grilling(S2@2026-09-23T19:33:24.738Z/user): rows one GREEN satisfies take their REDs before that GREEN; GREENs and reviews stay per row | S1 D2; the stop-at-`refactor` decision | A shared GREEN would make a later row pass on its first run, and the sibling-satisfied branch needs the sibling `done`, which stop-at-`refactor` rules out. Refines S1 D2 (one row at a time) | PASS |
| 61 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D1: The asset round runs first, in this spec-0004 invocation, with `TDD-0068` as its owner round; spec-0003's rows run in a separate `/qfai-implement` invocation with its own run start, block and sessions in `atdd-spec-0003.md`: `TDD-0098` and `TDD-0099` consume the asset round, then the seed round (`TDD-0094`, consumed by `TDD-0096` and `TDD-0097`), then the copilot round (`TDD-0095`). Before the asset round, spec-0004 `TDD-0070` takes its branch-2 handover here and spec-0013 `TDD-0048` takes its RED | `qfai-implement/SKILL.md` Spec Auto-Discovery (one spec at a time); `tmp/atdd-s1-settled.md` loop order | One invocation cannot span two specs, and the loop order puts spec-0004 before spec-0003. `TDD-0048` scans the whole shipped tree, schema asset included, so its RED has to precede the withdrawal; the other skill-text rows need not wait. `TDD-0070` is independent of these rounds and the loop order puts it before `TDD-0068`; its RED-not-observable form names pre-existing production state, because stop-at-`refactor` rules out a `done` sibling. The last two points were added by the griller | PASS |
| 62 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D2: Asset round: delete `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`, run `npm run generate:governed-manifest`, run `pnpm sync:ssot` and inspect its diff, delete the tracked symlink `.qfai/assistant/catalog/worklog-entry.schema.md`, delete `tests/assets/worklogSchemaShipped.test.ts` and its `typeCheckEnumeration.allowlist.ts` entry; `retireWithdrawnGovernedAssets` and the lock record stay | `spec-0004/10_Plan.md` removal order step 3; `spec-0003/10_Plan.md` "Removing the work-log seed" | The plan's step 3. `ci:gate:ssot` diffs `.qfai/` after the sync, so the tracked link goes in the same round; the retire pass is what deletes an adopter's unedited copy | PASS |
| 63 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D3: Seed round: remove from `init.ts` the seven symbols spec-0003's plan lists (`seedProjectSteering`, `buildProjectSteeringEntryTemplate`, `summarizeSeedDrift`, `readSeedBodyForDrift`, `SeedComparison`, `normalizeNewlines`, `SEED_DRIFT_MAX_BYTES`), the call and the three `projectSteeringResult` folds, the three imports, "steering" in the `--force` NOTE, and "steering" in the comments near lines 178, 642 and 1732; the legacy `.qfai/assistant/steering` code and comments (near 283 and 2625-2860) and `LEGACY_*` stay | `spec-0003/10_Plan.md` "Removing the work-log seed" | The plan's list, plus the comments that would describe behaviour init no longer has. The legacy layout is out of scope in the plan | PASS |
| 64 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D4: In the seed round, remove the `assistantPaths.ts` symbols that lose their last user: `PROJECT_STEERING_DIR`, `PROJECT_STEERING_TEMPLATES_SUBDIR`, `joinProjectSteering`, `WORKLOG_ENTRY_KINDS`, `WORKLOG_ENTRY_STATUSES`, `HANDOFF_REQUIRED_SECTIONS`, the types `WorklogEntryKind` and `WorklogEntryStatus`, and their comments; the `LEGACY_ASSISTANT_*` constants and the `joinLegacyAssistant*` functions stay byte-identical | `spec-0004/10_Plan.md` removal order step 2; `dist/index.d.ts` | They are internal, absent from the published type declarations, and have no user once init stops seeding; no other row owns `assistantPaths.ts` | PASS |
| 65 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D5: Seed-round test edits, exactly the `spec-0003/09_delta.md` list: the six `TC-0003-0022 (TDD-0022)` blocks and the `WORKLOG_ENTRY_STATUSES` import in `init.test.ts`, and its `joinProjectSteering` assertion; the file-level annotation, the `TC-0003-0022` describe block and the `joinProjectSteering` assertion in `initSpec0003.test.ts`; the carrier entry `QFAI:SPEC-0003:TC-0003-0022` in `tests/integration/qfai-traceability.md`; delete `tests/assets/initContractSteeringSeed.test.ts` and its allowlist entry. Afterwards confirm the selectors of TDD-0001..0015, TDD-0018..0021 and TDD-0023..0026 still resolve | `spec-0003/09_delta.md` retired-row edits | The delta assigns these to `/qfai-implement` in the change that removes the seed | PASS |
| 66 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D6: In `initGitignoreMigration.test.ts`, delete the `steering` constant, the `projectContent` read and its conditional; keep the agent and manifest assertions | `packages/qfai/tests/cli/initGitignoreMigration.test.ts` | Once nothing seeds `.qfai/steering/`, that branch can never run. Amended by the griller from the author's proposal (leave it as an advisory) | PASS |
| 67 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D7: Copilot round: remove only the work-log line `buildCopilotInstructions` writes (`init.ts` near line 8147); the legacy-layout lines after it stay | `spec-0003/10_Plan.md` "Removing the work-log seed" | The plan names that line alone | PASS |
| 68 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D8: Defer the skill-text rewrite with `implementWorklogObligation.test.ts` (spec-0011 and spec-0013 rows), `ADVISORY_FAILING_CODES` (TDD-0018), the root documents, `docs/finding-codes.md`, CHANGELOG and the dogfood re-pin. Between rounds the shipped skills cite a schema that no longer ships; this repository's `.github/copilot-instructions.md` already points at the deleted contract. Both are fixed in their steps before the change's head | `spec-0004/10_Plan.md` removal order steps 3, 6 and 7 | Each has an owner later in the order. The note on the root `.github/copilot-instructions.md` was added by the griller. Amended by S4 D4 (step 81): the one README paragraph that cites the withdrawn schema is removed in the asset round, in both READMEs; the rest of the README stays with step 6 | PASS |
| 69 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D9: Oracle proofs as planned: `TDD-0068`, `TDD-0098` and `TDD-0099` put the manifest entry and the asset back; `TDD-0094` and `TDD-0096` restore the seed call with its function; `TDD-0097` restores it only under `--force` and shows `TDD-0096` still passing; `TDD-0095` restores the line. Each restores from a copy of the pre-GREEN file and reverts to the GREEN copy | The handoff entries of the six rows | The mutations are the handoffs' own; restoring from copies keeps each revert exact | PASS |
| 70 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D10: Local checkpoint sets. Asset round: the static importers of `assistantAssetProvenance.ts`, `validators/assistantAssets.ts` and `governedAssistantManifest.ts`, the governed-manifest drift check, `assistantAnchorReferences`, `distributedSurfaceLeakage`, `tests/assets/assets.test.ts`, `init.test.ts`, `initSpec0003.test.ts`, `spec0004WorklogSurfaceRemoval`, `spec0004WithdrawnSchemaFinding`, `spec0003WithdrawnSchemaRetirement`, `node scripts/check-tracked-symlinks.mjs` and the tracked-tree diff after `sync:ssot`, excluding the later rows' deliberate REDs (`spec0011RecordHomes`, `spec0013RecordHomes`). Seed and copilot rounds: the static importers of `init.ts` and `assistantPaths.ts` after a `dist/` rebuild, `spec0003InitWorklogSurface.test.ts` narrowed per selector until `TDD-0095` is green, `agentsRulesSurface`, `outputLanguageSingleSource` and `initE2E`. Every round: both type checks, its drift checks, eslint and prettier; verify:pack is left to the head's CI | The user's local-checkpoint decision (AskUserQuestion, 2026-09-23) | Static-import scans miss the checks that read the shipped tree or the generated output as text, so those are added by name. The symlink check, the tracked-tree diff and the two schema-row tests were added by the griller | PASS |
| 71 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D11: Add nothing the rounds, the type checks or the lint do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 72 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D12: `## Cross-spec obligations` gains code-ownership entries: spec-0003 `TDD-0098` and `TDD-0099` for the asset round, resolved by their own GREEN in the spec-0003 invocation; spec-0015 `TDD-0039` (`todo`, `Owning module` `init.ts`, no selector to re-run) for the seed round | `.claude/skills/qfai-implement/references/cross-spec-ownership.md` | The asset round changes what those rows assert before their own invocation takes them, and the seed round edits a module another spec's row owns. Added by the griller | PASS |
| 73 | delivery-planner | atdd-scope | Scope approval TDD-0070 | `### TDD-0070`; `spec0004BlockedRowEmptyBlockedBy.test.ts` (hash `4bbe2800…a7a6f4`); TC-0004-0076 second tree, EX-0004-0044, AC-0004-0041; `tddList.ts` `parseBlockedBy` | Scope REVISE. The "Blocked-By is empty" match and `toHaveLength(1)` assert what the TC does not ask. The planned mutation falls through to `missing-departure-status` and still raises the code for the row, so it proves wording only. Drop the text, require at least one, and break the predicate so the empty cell raises nothing. Severity `error` stays | REVISE |
| 74 | delivery-planner | atdd-scope | Scope approval TDD-0070 (resubmission) | `### TDD-0070`; `spec0004BlockedRowEmptyBlockedBy.test.ts` (hash `a4c8d3a8…063971`, tree `working-tree+ea5fbfa4…a2870`); step 73 REVISE | Scope PASS. The oracle is the code at `error` naming the ledger and `(row 1)`, at least one. The predicate to break makes `parseBlockedBy` accept an empty cell, so no finding is raised and the row's behaviour is what is falsified. One boundary | PASS |
| 75 | acceptance-test-engineer | atdd-ate | TDD-0070 test, classification run and P4b re-run | `### TDD-0070`; `packages/qfai/tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts` (test hash `a4c8d3a8…063971`) | both runs passed at `working-tree+ea5fbfa4…b2a2870`; branch 2 handover with `Round 1: Satisfied-by` and the predicate for step 3c | PASS |
| 76 | qa-gatekeeper | atdd-red-gate | Falsifiability gate TDD-0070 | `### TDD-0070` Round 1 falsifiability trio; mutated tree `working-tree+c1ba0661…7784`; `packages/qfai/src/core/validators/tddList.ts` `parseBlockedBy` | PASS: one-line mutation of the predicate `Satisfied-by` names, in the Owning module; failure reproduced at line 103 (`expected 0 to be greater than 0`) with validate shown to have read the fixture; RED test hash unchanged; command equals the GREEN command | PASS |
| 77 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0070 | `### TDD-0070` Round 1 GREEN pair, the restore, and the step 3c falsifiability mutation as the Oracle proof; `Round 1: Revision` working-tree+ea5fbfa4… | PASS: live tree equals the Revision once the unrelated CR-20260924-0001 file is excluded; `tddList.ts` byte-equal to its pre-mutation copy; GREEN re-run, exit 0, selector passing with the kept finding named; RED test hash unchanged; the Oracle proof is the passed falsifiability mutation (step 2a exempt on branch 2); the ledger wrote `red -> green` before this gate, which is recorded, not repaired, here | PASS |
| 78 | backend-engineer | impl-row-0067 | TDD-0070 step 3b, step 3c mutation, revert and GREEN | `### TDD-0070` hand-off (branch `falsifiability`, `Satisfied-by`, predicate to break); `packages/qfai/src/core/validators/tddList.ts` at `TDD-0069`'s GREEN; test hash `a4c8d3a8…063971` | Entry verified at `working-tree+ea5fbfa4…a2870`; `parseBlockedBy` mutated, selector failed at line 103 (`expected 0 to be greater than 0`), trio and `Round 1: Falsifiability revision` `working-tree+c1ba0661…7784` recorded before the gate; after `qa-gatekeeper#1` (step 76) the file was restored byte-equal, the tree returned to `ea5fbfa4…a2870`, and the GREEN passed; ledger `todo -> red` 01:17:43Z, `red -> green` 01:17:44Z (before the build gate, step 77), `green -> refactor` 01:20:23Z; local checkpoint 4 files, 30 tests passed | PASS |
| 79 | implementation-reviewer | impl-review-0070 | Item review TDD-0070 | `spec0004BlockedRowEmptyBlockedBy.test.ts`; `### TDD-0070`; `packages/qfai/src/core/validators/tddList.ts` `parseBlockedBy` and the blocked-row loop | PASS at working-tree+ea5fbfa4…a2870 (HEAD `536fc4ddd`), 2026-09-24T01:38:53Z, re-confirmed on the current section. No production change of its own; its GREEN is the kept `TDDLIST_BLOCKED_MISSING_REF` check. Code quality audited evidence hash `7977465003ce3c4b8bb870abc439ce7f6737ef1cdfcd7bdad84e430f56bff9f1` | PASS |
| 79 | completion-reviewer | impl-cr-0070 | Item review TDD-0070 (attempt 1) | `### TDD-0070`; `tdd/test-list.md` TDD-0070; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0041, `04_Business-Rules.md` BR-0004-0035, `05_Examples.md` EX-0004-0044, `06_Test-Cases.md` TC-0004-0076 | REVISE: `red -> green` was written at 01:17:44Z before any build-phase `qa-gatekeeper` gate. Answered by that gate (step 77) and the ordering note under `Ledger writes`; no new production behaviour, so no round was opened | REVISE |
| 79 | completion-reviewer | impl-cr-0070 | Item review TDD-0070 (attempt 2) | As attempt 1, with the build gate of step 77 and the ordering note | PASS at working-tree+ea5fbfa4…a2870. Spec audited evidence hash `9be0b2f72f0312ed7364ebe443589b801e68f02102d46b4a8cfcc07aa3464b08` | PASS |
| 80 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0068 | `### TDD-0068` Round 1 GREEN pair and Oracle proof; `Round 1: Revision` working-tree+73bc7ce7…; `governedAssistantManifest.ts`, the withdrawn asset and its mirror link | PASS: GREEN re-run, exit 0, schema and control both `error QFAI-ASSETS-006`; revision and RED test hash recomputed equal; manifest loses exactly the one entry; scope inside the round; Oracle proof (entry plus byte-equal asset restored) fails line 116 on the assertion after the control. verify:pack: no re-pin expected on a static reading; the final-head CI build job confirms | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D1: Fix the README citation in the asset round (option A), not in step 6 (option B) | `### TDD-0068` local checkpoint, first run; S3 R-D10 (step 70); `references/checkpoint-verification.md` Pass criteria, per item; `spec-0004/10_Plan.md` removal order ("Only its head has to be green") | R-D10 puts `tests/assets/assets.test.ts` in this round's checkpoint set, and this round's deletion is what failed it, so the row owns the repair: fix it and re-run the whole set. Under B the row cannot pass a checkpoint its own set requires until step 6, and every review pinned to it waits too. The plan binds only the head, so an earlier README edit contradicts nothing. Not critical: no spec, contract or DR changes, the edit is an uncommitted working-tree change, and it rests on no product intent. The author recommended A | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D2: Delete only the paragraph that points at the seeded schema, identically in both READMEs (root lines 727-729, `packages/qfai/README.md` lines 721-723, with one of the blank lines beside it); the file-tree entry (root line 702, package line 696) and the rest of the section stay with step 6 | `packages/qfai/tests/assets/assets.test.ts` `extractPathReferences`; `scripts/check-readme-alignment.mjs`; S3 R-D8 (step 68) | The guard counts a reference only when it contains a `/`, so the bare tree line is not read and does not fail; the paragraph holds the only cited path. The alignment check holds the two files line for line, so both change together. R-D8 already accepts root documents that are stale between rounds, and the tree entry is one of them. Amended by the griller from the author's proposal. Disagreeing position (author `impl-row-0067`): delete the tree entry too, leaving `ui-definition-protocol.md` as the last entry, because it lists a file init no longer writes | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D3: The README edit is Round 1's Phase: Refactor change, recorded as the checkpoint repair. It opens no round, `Round 1: Revision` stays `working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9`, and the step 80 build gate stands with no new one. Record the repair, then `Refactor verify command` / `result` / `revision` on the repaired tree, then the item reviews pinned to that revision, then the whole R-D10 set with its own `Checkpoint verification revision`; `green -> refactor` is written with the refactor record | `references/evidence-revision.md` "Which tree each gate item addresses"; `references/checkpoint-verification.md` "A repair that changed code owes its `Refactor verify` fields"; `references/execution-ledger.md` allowed transitions | `Revision` addresses the tree after implementation and before the refactor, which the GREEN observed; the final tree is carried by `Refactor verify revision`. Neither the selector nor the production change reads the README, so the GREEN observation is unchanged. The earlier "Refactor ... no change" line stays as written; the repair is appended after the failed run. Amended: the author ran the R-D10 set as the refactor-verify run on `working-tree+fd08d443…f37b`, and the item reviews then passed on that same address. That is equivalent on two points. First, the order: the checkpoint follows the reviews so that it runs on the tree the reviewers judged, and the reviews changed nothing and pinned the address the run was taken on. Second, the formal `Checkpoint verification` fields and seal are deferred to the final head's CI run, which is the user's decision recorded in `### TDD-0067` and the same deferral `TDD-0067`, `TDD-0069`, `TDD-0070` and `TDD-0071` carry; gate item 12 reads them only at `done`, and no row reaches `done` before that run. Still owed: (1) R-D10's tracked-tree diff after `sync:ssot` is missing from the fd08d443 run. Take it there (the sync chain, then the diff hashed equal before and after) and record it beside the refactor-verify record; the address must stay fd08d443, and if it moves the reviews are stale and the repair loop re-runs. The GREEN-time check on 73bc7ce7 does not carry, because nothing records that the READMEs are the only change between the two addresses. (2) Record both item-review verdicts in `### TDD-0068` with `Reviewed revision` fd08d443 and their audited evidence hashes; the section holds neither yet | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D4: Amend S3 R-D8 (step 68) in place: its deferral of the root documents no longer covers the one README paragraph D2 removes. Nothing else recorded needs an amendment: R-D10 stands and D1 serves it, `spec-0004/10_Plan.md` step 6 still owns the README rewrite, and the `### TDD-0068` records are appended to, not rewritten | step 68; step 70; `spec-0004/10_Plan.md` removal order step 6 | Without the note, step 68 reads as leaving every root-document edit to step 6, which the asset round no longer does. The amendment takes the in-place form the run already uses for a changed decision | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D5: Add nothing the repair, the refactor re-verify and the checkpoint re-run do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 82 | backend-engineer | impl-row-0067 | TDD-0068 step 3b, asset-round GREEN, Oracle proof, checkpoint, S4 repair and refactor verify | `### TDD-0068` hand-off (branch `observed-red`, test hash `d27c64b0…48805c`); implement S3 R-D2 and R-D10; implement S4 | Ledger `todo -> red` 01:30:36Z; GREEN: shipped schema asset deleted, `governedAssistantManifest.ts` regenerated (25 files), the `sync:ssot` chain run twice with an unchanged tracked-tree diff, the mirror symlink and `worklogSchemaShipped.test.ts` deleted, symlink check exit 0; GREEN passed at `working-tree+73bc7ce7…1ba9`; Oracle proof (entry and asset restored) failed at line 116 with `error QFAI-ASSETS-005`, then reverted; `red -> green` 01:42:02Z after the build gate (step 80); first local checkpoint failed on `assets.test.ts` (README cites the deleted schema); S4 repair deleted that paragraph from both READMEs; refactor verify on working-tree+fd08d443…f37b: 19 files, 621 tests passed; `green -> refactor` 02:21:49Z | PASS |
| 83 | implementation-reviewer | impl-review-0068 | Item review TDD-0068 | The asset-round diff (schema asset, `governedAssistantManifest.ts`, mirror symlink, `worklogSchemaShipped.test.ts` and its allowlist entry, both READMEs); `### TDD-0068` | PASS at working-tree+fd08d443…f37b (HEAD `536fc4ddd`), 2026-09-24T02:30:53Z. Code quality audited evidence hash `80d2feb5635ce3b6817563477ecee3e07872d944ae311f54bfeeba4e6fdc919a` | PASS |
| 83 | completion-reviewer | impl-cr-0068 | Item review TDD-0068 | `### TDD-0068`; `tdd/test-list.md` TDD-0068; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0040, `04_Business-Rules.md` BR-0004-0034, `05_Examples.md` EX-0004-0043, `06_Test-Cases.md` TC-0004-0075 | PASS at working-tree+fd08d443…f37b, Round 1. Spec audited evidence hash `80d2feb5635ce3b6817563477ecee3e07872d944ae311f54bfeeba4e6fdc919a` | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D1: TDD-0018 and TDD-0072 keep their evidence in `.qfai/evidence/implement-spec-0004.md`. The edit that creates that file copies in this run's `### /qfai-implement — run started 2026-09-23T21:11:02.206Z` block (S1–S5, same heading and rows) and every `grilling(<Session>@2026-09-23T21:11:02.206Z/…)` Work Orders row, identical to this file. Every later write to either copy goes into both | `tdd/test-list.md` TDD-0018, TDD-0072; `qfai-implement/SKILL.md` "Record both sessions where the gate reads them"; `.qfai/evidence/` listing | Settled by lookup, confirming the author: both rows are Layer `unit` with no `Pre-split-evidence` marker, and `implement-spec-0004.md` does not exist yet. The gate compares every copy of this invocation's block and its grilling rows, and requires them identical | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D2: TDD-0018's test in `tests/validators/reviewerJustification.test.ts` takes the reversed oracle. One report holds an empty `justification:` on `R-WORKLOG-DRIFT`, and no issue with that code comes back. The `R-HANDOFF-INCOMPLETE` finding leaves the fixture. The same report holds an empty `justification:` on `R-PROMPT-SCANNER-DRIFT`, which must come back as an `error` issue with that code: that is the read control. The `it` is renamed for the new behaviour and the row's `Selector` takes the new name. The header comment (lines 4–5) and the comment at line 88 state the old set and are corrected in the same rewrite | `06_Test-Cases.md` TC-0004-0018; `10_Plan.md` "Tests for the work-log removal"; the atdd run's S1 decision that every absence oracle shows the read (step 7) | An absence oracle alone also passes over a run that read nothing. A control in the same report file proves the file was read. The control is `R-PROMPT-SCANNER-DRIFT` and not `R-REJECTED-READOPT`, because that is TDD-0072's predicate and its mutation would then fail TDD-0018 as well. The RED is natural: the current code returns the `R-WORKLOG-DRIFT` error. Amended by the griller: the control goes in the same report file, and the two comments are corrected | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D3: GREEN: remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from `ADVISORY_FAILING_CODES` in `reviewerJustification.ts` and from `reviewer-gate-sdd` in `cli/commands/validate.ts` (lines 622–623). `R-REJECTED-READOPT` stays in both. Correct the comments that list the old set: the source list at `reviewerJustification.ts` lines 17–21, its docblock at lines 139–142, and `justificationCatalog.ts` lines 8–10. `emittedRuleCodes.ts` is regenerated only if the rule-code drift check fails. In `ruleCodeUniqueness.test.ts` the two codes leave the `validators/reviewerJustification.ts` entry (lines 206, 209) when its census fails, and that entry's comment stops naming `worklogSurface.ts`, which no longer exists. `issueCodeUniqueness.test.ts:195` is not edited | `10_Plan.md` "What the validators of this spec lose" and removal order step 2; S1 steps 21 and 23 (P-D1); `src/core/emittedRuleCodes.ts` | The plan names these edits, and S1 deferred the two `reviewer-gate-sdd` entries to this row. The generated file lists none of the three codes today: the gate re-emits a code read from a report, which a static census cannot see, so regeneration has nothing to remove. A comment cannot fail, and `issueCodeUniqueness.test.ts` is otherwise outside the diff (`documentation-clarity.md`: leave everything outside the diff alone). Disagreeing positions (author `impl-row-0067`): regenerate `emittedRuleCodes.ts` as a GREEN step; edit the `issueCodeUniqueness.test.ts:195` comment | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D4: Leave untouched: `contractDeferralNotes.test.ts:525`, `justificationCatalog.test.ts:77`, `justificationRejectEmpty.test.ts:6` and `init.ts:2009`. The two comments this leaves stale, `justificationRejectEmpty.test.ts:6` and `issueCodeUniqueness.test.ts:195`, are recorded as an advisory and not as an obligation | The four sites; S3 R-D3 (step 63) | Line 525 is a synthetic probe source that does not read the real set. Line 77 asserts the catalog excludes `R-WORKLOG-DRIFT`, which stays true. Line 6 is a comment outside the diff. `init.ts:2009` belongs to the spec-0003 seed round. The plan names no test comment, so the two stale ones are recorded rather than fixed here. The author's proposal | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D5: TDD-0072's test is its own `it` with its own fixture: one report holding an empty `justification:` on `R-REJECTED-READOPT`, which must come back as an `error` issue with that code. It has no read control. Its falsifiability mutation is the one DR-0004-0041 names, removing `R-REJECTED-READOPT` from `ADVISORY_FAILING_CODES`, restored from a copy. Which file it goes in, and when it is written, follow the escalated Q6 | TC-0004-0018; `10_Plan.md` "Tests for the work-log removal"; DR-0004-0041 | The plan gives the rejection its own row because a gate that rejected nothing would pass TDD-0018. A separate fixture keeps each selector reading only its own finding. A presence oracle cannot pass over a run that read nothing, so no control is needed. The author's proposal, with the placement left to Q6 | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D6: TDD-0018's local checkpoint set: its test file; the test files that statically import `reviewerJustification.ts`, `validators/index.ts` or `cli/commands/validate.ts`; `ruleCodeUniqueness`, `issueCatalogHasEmitters`, `gateGroupCoverage`, `contractDeferralNotes` and `validate.profileCoverageNotice` by name; both type checks, the rule-code drift check, eslint and prettier. The importers of `emittedRuleCodes.ts` join only if the drift check makes this row regenerate it. The full suite waits for the final head's CI run | The atdd run's S1 N1 (the user's local-checkpoint answer); S3 R-D10 (step 70); `references/checkpoint-verification.md` per-item set | The set reaches every file the GREEN changes and every test that reads the edited lists as text or through the AST. Under D3 `emittedRuleCodes.ts` does not change, so its importers read nothing new. Amended by the griller from the author's proposal, which included every importer of `emittedRuleCodes.ts` | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D7: Add nothing the two rows, their checkpoints and the plan do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/user): Q6: TDD-0072 keeps the order DR-0004-0041 and DL-0027 record. Every other row, TDD-0018 included, closes on the final CI run as already decided. TDD-0072's test is written only after that, in its own test file annotated `QFAI:SPEC-0004:TC-0004-0018` and added to `tsconfig.tests.json`; its first run is classified with `Satisfied-by` TDD-0018 (`done`), its mutation is D5's, and it closes on a second CI run over the new head. The decision that all full-suite checkpoints close together is relaxed for TDD-0072 only | DR-0004-0041; `09_delta.md` DL-0027; `references/red-not-observable.md` "Classify first"; `references/evidence-revision.md` "What makes evidence stale" | Answered by the user through AskUserQuestion on 2026-09-24 (option 1, recommended by the griller). The recorded order needs TDD-0018 `done` first, `done` waits for the final CI, and the new test moves the address that run covered, so no order closed on one CI. A separate file leaves TDD-0018's closed `Test file` unedited. Rejected: a Change Request letting TDD-0072 cite TDD-0018 at `refactor`, which also departs from the shipped skill | PASS |
| 85 | delivery-planner | impl-scope-0018 | Scope approval TDD-0018 | `implement-spec-0004.md` `### TDD-0018`; `tests/validators/reviewerJustification.test.ts` (test hash `93364462…f067`, tree `working-tree+a093ad34…5693`); `spec-0004/06_Test-Cases.md` TC-0004-0018, `05_Examples.md` EX-0004-0016, `03_Acceptance-Criteria.md` AC-0004-0018, `04_Business-Rules.md` BR-0004-0017; implement S5 D2 | PASS, "Approve, then run". Hash and tree recomputed equal. `todo -> red` at step 2 is legal for a `todo` unit row; the `Selector` repair is legal; Round 1 is legal. Expected RED: fails at test line 62 with the control at line 60 passing. Advisories: at GREEN, name spec-0015 TDD-0019 and TDD-0028 in `## Cross-spec obligations` and re-run their selectors read-only (implement S1 decision 25); no test can fail on the `R-HANDOFF-INCOMPLETE` removal, recorded as an advisory and not adopted (a test for it would need a Change Request the request does not need) | PASS |
| 86 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0018 | `implement-spec-0004.md` `### TDD-0018` Round 1 RED and its stripped run; `delivery-planner` PASS step 85; `tests/validators/reviewerJustification.test.ts` | PASS: RED reproduced at line 62 (`R-WORKLOG-DRIFT` still rejected) after the line 60 read control; revision and gate-form RED test hash recomputed equal; production lists unchanged; strip valid; Oracle proof plan re-adds the code to `ADVISORY_FAILING_CODES` | PASS |
| 87 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0018 | `implement-spec-0004.md` `### TDD-0018` Round 1 GREEN pair and Oracle proof; `Round 1: Revision` working-tree+63b9d538…; `reviewerJustification.ts`, `cli/commands/validate.ts`, `justificationCatalog.ts`, `ruleCodeUniqueness.test.ts` | PASS: GREEN re-run, exit 0, selector passing; revision and gate-form RED test hash recomputed equal; diffs match S5 D3 (exactly two codes out of each list, R-REJECTED-READOPT kept); the `ruleCodeUniqueness` comment rewrite is in scope, as the smallest true wording once `worklogSurface.ts` goes; Oracle proof re-adds `R-WORKLOG-DRIFT` and fails line 62 after the control | PASS |
| 88 | backend-engineer | impl-row-0067 | TDD-0018 Red steps 1-3, RED and stripped run, GREEN, Oracle proof, refactor and local checkpoint | `implement-spec-0004.md` `### TDD-0018`; implement S5 D2, D3 and D6 (step 84); scope approval (step 85); RED gate (step 86); build gate (step 87) | Ledger `todo -> red` 05:20:43Z and the `Selector` repaired 05:21:35Z; test rewritten to the reversed oracle with the `R-PROMPT-SCANNER-DRIFT` read control (test hash `93364462…f067`); RED at `working-tree+a093ad34…5693` failed at line 62 with the control at line 60 passing, and the stripped run passed; GREEN removed `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from `ADVISORY_FAILING_CODES` and `reviewer-gate-sdd`, corrected the comments, and updated the `ruleCodeUniqueness` census; the drift check passed, so `emittedRuleCodes.ts` was not regenerated; spec-0015 `TDD-0019` and `TDD-0028` re-run read-only and passed; GREEN at `working-tree+63b9d538…cfd5`; Oracle proof (`R-WORKLOG-DRIFT` put back) failed at line 62, then reverted; `red -> green` 05:37:31Z; 46-file checkpoint: 615 passed, 2 skipped; `green -> refactor` 05:41:03Z | PASS |
| 89 | implementation-reviewer | impl-review-0018 | Item review TDD-0018 | The diff of `reviewerJustification.ts`, `justificationCatalog.ts`, `cli/commands/validate.ts`, `reviewerJustification.test.ts` and `ruleCodeUniqueness.test.ts`; `implement-spec-0004.md` `### TDD-0018` | PASS at working-tree+63b9d538…cfd5 (HEAD `536fc4ddd`), 2026-09-24T05:45:09Z. Code quality audited evidence hash `fdb7b70cf4d2519432fffee6d895adb8630fa1c9efca909e257622e2351ba43f` | PASS |
| 89 | completion-reviewer | impl-cr-0018 | Item review TDD-0018 (attempt 1) | `implement-spec-0004.md` `### TDD-0018`; `tdd/test-list.md` TDD-0018; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0018, `04_Business-Rules.md` BR-0004-0017, `05_Examples.md` EX-0004-0016, `06_Test-Cases.md` TC-0004-0018 | REVISE: F1, the cross-spec entry named only spec-0015 TDD-0019 and TDD-0028. Answered outside the section by widening the entry; no new production behaviour, so no round was opened | REVISE |
| 89 | completion-reviewer | impl-cr-0018 | Item review TDD-0018 (attempt 2) | As attempt 1, with the widened `## Cross-spec obligations` entry | PASS at working-tree+63b9d538…cfd5. Spec audited evidence hash `fdb7b70cf4d2519432fffee6d895adb8630fa1c9efca909e257622e2351ba43f` | PASS |

## Cross-spec obligations

The scoped gate `npx qfai validate --profile atdd --fail-on error --spec spec-0004`
runs at P5.

Code-ownership entries from `/qfai-implement` (`references/cross-spec-ownership.md`).
No other spec's `done` row names a changed file in `Owning module` or `Test file`.
The reverse walk cannot be completed, so every `done` row of another spec whose
`Test file` lies under `packages/qfai/` is matched (implement S1 decision 25). Each
entry stays open until `completion-reviewer` has re-reviewed it. For the rows not
re-run locally, it also waits for the CI full-suite run.

| TDD-ID | Blocked spec | Blocked TDD-IDs | File | Change required | Obligation at risk | Resolution |
| ------ | ------------ | --------------- | ---- | --------------- | ------------------ | ---------- |
| TDD-0067 | spec-0002 | 6 rows: TDD-0001, TDD-0008..0012 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0002's `done` rows certify behaviour whose tests reach `validateProject` or the CLI validate command, whose sdd composition lost the work-log validator. Re-run read-only, file-scoped with `--reporter=verbose`, in the checkpoint run above: TDD-0012 named as passed. The other 5 rows are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0003 | 35 rows: TDD-0018..0021, TDD-0023..0027, TDD-0029..0031, TDD-0033..0055 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0003's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0006 | 25 rows: TDD-0012..0033, TDD-0038..0040 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0006's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0008 | 2 rows: TDD-0013..0014 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0008's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0010 | 10 rows: TDD-0001, TDD-0005..0008, TDD-0013..0017 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0010's `done` rows certify behaviour whose tests reach `validateProject` or the CLI validate command, whose sdd composition lost the work-log validator. Re-run read-only, file-scoped with `--reporter=verbose`, in the checkpoint run above: TDD-0013, TDD-0014, TDD-0015 named as passed. The other 7 rows are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0012 | 181 rows: TDD-0286, TDD-0293..0295, TDD-0336..0346, TDD-0348..0351, TDD-0353..0383, TDD-0385..0400, TDD-0403..0408, TDD-0415..0419, TDD-0421..0435, TDD-0437..0476, TDD-0479..0527 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0012's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0013 | 12 rows: TDD-0019..0030 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0013's `done` rows certify behaviour whose tests reach `validateProject` or the CLI validate command, whose sdd composition lost the work-log validator. Re-run read-only, file-scoped with `--reporter=verbose`, in the checkpoint run above: TDD-0022 named as passed. The other 11 rows are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0014 | 7 rows: TDD-0009, TDD-0018..0019, TDD-0033..0036 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0014's `done` rows certify behaviour whose tests reach `validateProject` or the CLI validate command, whose sdd composition lost the work-log validator. Re-run read-only, file-scoped with `--reporter=verbose`, in the checkpoint run above: TDD-0009, TDD-0018, TDD-0019 named as passed. The other 4 rows are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0015 | 21 rows: TDD-0011..0012, TDD-0017..0035 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0015's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0016 | 28 rows: TDD-0001..0028 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0016's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0068 | spec-0003 | TDD-0098 (`todo`) | `packages/qfai/src/core/governedAssistantManifest.ts`, `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md` | Withdraw `catalog/worklog-entry.schema.md` from the shipped governed set | spec-0003 `TDD-0098` asserts that `init --force` retires an unedited, lock-recorded copy of the schema. Its RED was taken before this round, on the tree that still shipped the file. It takes its GREEN on this round's tree in the spec-0003 `/qfai-implement` invocation (implement S3 decision R-D12) | re-reviewed |
| TDD-0068 | spec-0003 | TDD-0099 (`todo`) | `packages/qfai/src/core/governedAssistantManifest.ts`, `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md` | Withdraw `catalog/worklog-entry.schema.md` from the shipped governed set | spec-0003 `TDD-0099` asserts that `init --force` keeps an edited copy with the edited-content note. Its RED was taken before this round, on the tree that still shipped the file. It takes its GREEN on this round's tree in the spec-0003 `/qfai-implement` invocation (implement S3 decision R-D12) | re-reviewed |

The TDD-0068 dependencies on spec-0003 TDD-0098 and TDD-0099 are re-reviewed: both dependent rows reached `done` with their own GREEN, Oracle proof and completion review; the first and later full CI checkpoints passed. The other cross-spec entries remain open pending dependent-row verification.

## Execution logs

- `TDD-0067` RED and assertion-stripped runs: `### TDD-0067`.

## Gaps / Open risks

- The scoped rows TDD-0067 through TDD-0071 reached `done` after the first full CI checkpoint. TDD-0018 is recorded in the implementation evidence, and TDD-0072 is in its separate second checkpoint cycle.
- The POSIX unreadable-file test uses `chmod 000` and requires a non-root runner. The first full CI checkpoint passed on the supported runner.
- A spec-wide P8 stage review and scoped P5 validation are not recorded here, so no ATDD stage PASS is claimed.
## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

Pending. P8 has not been reached, and no review pack is open.

## First full CI checkpoint

- Revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Run: https://github.com/aganesy/QFAI/actions/runs/36026684599
- Result: PASS — build, lint, types, all nine package test slices, Node floor tests, and ci-pass succeeded.
- Rows closed: TDD-0067, TDD-0068, TDD-0069, TDD-0070, TDD-0071.
- Later full CI: `d1aef569c06201a083942a3376ab8fbfd15854b7`, run `36041167862`, passed after the cited-artifact record repair.
