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
- `.qfai/decisions/CR-20260923-0004-spec-0004-passes-a-blocked-row-the-kept-check-fails.md`
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

## Grilling Session

### /qfai-atdd — run started 2026-09-23T19:33:24.738Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T20:13:17.289Z | working-tree+ecbebad44db0972da88c2858d175f303772e80ba665e4a380c68ea3e59caf750 | 2026-09-23T20:18:34.935Z | preflight | empty | none in flight | 15 | 0 | 4 |

Escalated S1: D1 — `EX-0004-0044` gives a passing `Blocked-By` the kept check rejects. User: fix the example and BR via a Change Request. Done as `CR-20260923-0004` (applied; spec-0004 DR-0004-0043, DL-0029). TDD-0069..0071 fixtures use `spec-0004:TDD-0001 — blocked at todo`.

Escalated S1: D2 — batch every RED first vs the P1c per-row loop. User: one row at a time (the P1c loop).

Escalated S1: D13 — the BR-0003-0009 negative (refusal to write outside the project) is a safety-floor ⚠️ that this change did not create. User: raise a Change Request to add that test; spec-0003's ATDD is reported not PASS on that cell until it lands.

Escalated S1: N1 — `/qfai-implement` checkpoints need the related suites and full-suite runs, beyond "only the new tests". User: run checkpoints locally too (this task only).

### /qfai-implement — run started 2026-09-23T21:11:02.206Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T21:17:21.288Z | working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494 | 2026-09-23T21:18:12.657Z | TDD-0067 GREEN scope | empty | none in flight | 10 | 0 | 0 |

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
- Round 1: RED test hash: 5c2400e293ec4579ff9cee5df6c71c4882cde87f4d9c9a3b53d460e0612d3ba1
- Round 1: RED test manifest:
  - packages/qfai/tests/helpers/tempTree.ts
  - packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts
- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0004WorklogSurfaceRemoval.test.ts -t "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"`
- Round 1: RED result: the approved RED, run at 2026-09-23T20:34:08Z after the
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
- Round 1: GREEN result: the restored run after both mutations were reverted.
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

- Round 1: Oracle proof: the two planned mutations, each applied at the call site
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
  pushed draft PR, at the boundaries completed row 10 and the last row. This
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
- Refactor verify command: from the repository root, in this order:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. The 56-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/assets/sddImportLiteEvidence.test.ts tests/cli/commands/validate.test.ts tests/cli/commands/validateTextFormat.test.ts tests/cli/githubAnnotationCap.test.ts tests/cli/githubAnnotationEscaping.test.ts tests/cli/report.test.ts tests/cli/validateRunIncomplete.test.ts tests/core/assistantAnchorReferences.test.ts tests/core/atddCoverageDepth.test.ts tests/core/contractSsotModules.test.ts tests/core/discussionDesignMdParse.test.ts tests/core/findingCodeGrammar.test.ts tests/core/frozenSurfaceReachability.test.ts tests/core/gateGroupCoverage.test.ts tests/core/issueCodeUniqueness.test.ts tests/core/layerCoverage.test.ts tests/core/platformOptionProfileScope.test.ts tests/core/reportDeltaScanDisclosure.test.ts tests/core/specScopeValidate.test.ts tests/core/specSections.test.ts tests/core/surfaceShortCircuitScope.test.ts tests/core/testFileGlobsConfiguration.test.ts tests/core/traceabilityIntegrity.test.ts tests/core/validationTimings.test.ts tests/core/validators/uiScreenEntries.test.ts tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/integration/cli/commands/validate.legacyPathEvidenceGate.test.ts tests/integration/cli/commands/validate.legacyValidateJsonConfig.test.ts tests/integration/cli/commands/validate.profileCoverageNotice.test.ts tests/integration/cli/commands/validate.reviewArtifactsProfiles.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/integration/cli/commands/validate.strictFailOnPrecedence.test.ts tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts tests/integration/cli/commands/validate.tddProfileTableArity.test.ts tests/integration/cli/commands/validateSaasPackage.passes.test.ts tests/integration/explorationRelaxationAudit.test.ts tests/integration/prototypingExplorationRelaxationScope.test.ts tests/integration/reviewArtifactsProfileWiring.test.ts tests/integration/reviewerGateMockHrefDrift.test.ts tests/integration/spec0004ProfileSuffixedValidate.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/integration/spec0010DiscussionMockAndPointer.test.ts tests/integration/spec0014VerifyReviewerGate.test.ts tests/integration/specAutoDiscovery.test.ts tests/integration/verifySemanticsSpec0014.test.ts tests/scripts/testTypeCheckEnumeration.test.ts tests/validators/atddTestGlobConfiguration.test.ts tests/validators/atddUnreadableTestRoot.test.ts tests/validators/importLite.test.ts tests/validators/uix/nonUiOverfire.test.ts  tests/validators/ruleCodeUniqueness.test.ts tests/unit/validators-are-wired.test.ts tests/integration/validatorConvergenceIntegration.test.ts tests/assets/rowNamesItsTestFile.test.ts
```

- Refactor verify result: every command exited 0. The two type checks printed
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
- Refactor verify revision: working-tree+c40624af1b883bac9fd9b5db5ce141bf3db77edf404ed2633f5dd701429db549
- Prototype parity: n/a (not UI-affecting). `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at
  working-tree+c40624af1b883bac9fd9b5db5ce141bf3db77edf404ed2633f5dd701429db549.
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

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0004.md` (committed). Totals: ✅ 54 / ⚠️ 21 / ❌ 0,
`n/a` 42, across 117 scored cells: 27 matrix cells and 90 business rule cells.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | atdd-preflight-tda | P0 plan and obligations, P1 layer assignment, P1b branch per row | `spec-0004/02_User-stories.md`, `04_Business-Rules.md`, `06_Test-Cases.md`, `tdd/test-list.md` | `.qfai/evidence/coverage-depth-spec-0004.md`; volume E2E 14 / API 0 / Integration 38; opt-in off; no CON-API / CON-DB | PASS |
| 2 | devops-ci-engineer | - | P1a `Phase: Skeleton` re-run for `qfai` | `catalog/tech.md#standard-commands-copy-paste` | `.qfai/evidence/skeleton.md` (Re-run — `/qfai-atdd` stage gate P1a, 2026-09-23T19:33:24.738Z) | PASS |
| 3 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Fix EX-0004-0044 / BR-0004-0035 (and AC-0004-0041, TC-0004-0076) through CR-20260923-0004 | `spec-0004/05_Examples.md`, `04_Business-Rules.md` | `CR-20260923-0004` (applied); the example gave a passing `Blocked-By` the kept `TDDLIST_BLOCKED_MISSING_REF` check rejects, and changing settled input is the user's to approve | PASS |
| 4 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Per-row P1c loop; a row a sibling's GREEN already satisfies moves to branch 2 with `Satisfied-by` naming that sibling; TDD-0070 is branch 2, re-classified right before handover, `Satisfied-by` naming `packages/qfai/src/core/validators/tddList.ts` and the kept `TDDLIST_BLOCKED_MISSING_REF` check | `.claude/skills/qfai-atdd/SKILL.md` P1c | Stage gate P1c requires one loop per row before the next RED; disagreeing position: the author (`atdd-preflight-tda`) recommended taking every RED first in one batch | PASS |
| 5 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Seven new integration files, one `it` per ledger row, annotations in the files, each added to `tsconfig.tests.json`, `runValidate` / `runInit` called in-process from `src`, not `initSpec0003.test.ts` | `spec0004ProfileSuffixedValidate.test.ts`, `packages/qfai/tsconfig.tests.json` | One `it` per row keeps each selector equal to its row; in-process `src` calls follow the existing spec-0004 suite and need no build; the include list is an enumeration. Amended by the griller from the author's proposal | PASS |
| 6 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): "Names `.qfai/steering/`" scans `file`, `relatedFiles[]`, `refs[]`, `message`, `suggested_action`, normalises `\` to `/`, and matches `.qfai/steering` followed by `/` or end of string | `packages/qfai/src/core/types.ts` `Issue` | A finding can name a path in any of those fields; Windows separators would hide a match; the boundary keeps `.qfai/assistant/steering/` from matching. Amended by the griller | PASS |
| 7 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Every absence oracle also shows the scanner under test read the fixture; a written report proves nothing | `06_Test-Cases.md` TC-0004-0074 … 0076 | An absence observed over a run that read nothing passes vacuously. Amended by the griller | PASS |
| 8 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0071 unreadable file: `chmod 000` on POSIX, `icacls <f> /deny *S-1-1-0:(R)` on win32 with the deny removed before cleanup; assert first that `readFile` rejects; record the host | `05_Examples.md` EX-0004-0044 | The fixture must be unreadable on both hosts, and asserting the rejection first keeps a no-op permission change from reading as a pass. Amended by the griller | PASS |
| 9 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Each `it` gets its own fixture; TDD-0095 runs plain init then `--force`, asserting after `--force` against the pre-run record | `spec-0004/07_Decisions.md` DR-0004-0037 | Each test builds its own tree, as DR-0004-0037 records; comparing against the pre-run record shows what `--force` changed | PASS |
| 10 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): After init, delete everything under `.qfai/steering/`, write exactly the EX-0003-0053 set, then record paths and hashes | `spec-0003/05_Examples.md` EX-0003-0053 | A tree holding exactly the example's set makes the preserved paths and hashes reproducible | PASS |
| 11 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Build lock records with the exported `hashAssistantAssetText`, `readAssistantAssetsLock`, `writeAssistantAssetsLock`; schema content an inline literal; TDD-0068 removes the lock record init writes | `packages/qfai/src/core/assistantAssetProvenance.ts` | Reuses the exported lock helpers rather than re-implementing the lock format; an inline literal keeps the test self-contained. Amended by the griller | PASS |
| 12 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0097 note oracle requires, on one report line, `NOTE:`, a normalised path ending `catalog/worklog-entry.schema.md`, "no longer shipped", "content has been edited", "was not removed" | `spec-0003/06_Test-Cases.md` | Pinning every part to one line fails a partial or split message. Amended by the griller | PASS |
| 13 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Text oracles: exact case-sensitive substrings for code tokens, case-insensitive for "work-log" / "work-log entry"; presence ties each record kind to its home inside the extracted unit; a row whose current text already passes is branch 2, never a reshaped oracle | `spec-0011/06_Test-Cases.md`, `spec-0013/06_Test-Cases.md` | Exact tokens avoid false passes, and prose casing varies; reshaping an oracle to force a failure is forbidden by the RED provenance rules. Amended by the griller | PASS |
| 14 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Retired annotations in acceptance-test territory (`validatorConvergenceIntegration.test.ts`, the root `tests/**/qfai-traceability.md` lines) are removed by `/qfai-implement` with the symbol removal, as the deltas say; record the ownership exception | `spec-0004/09_delta.md` | The deltas pair each annotation's removal with its symbol's, so one change removes both; the exception is recorded because those files are this stage's territory | PASS |
| 15 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): BR-0003-0009 floor cell goes to a Change Request, not satisfied this run; other carried ❌ cells cite one DR/CR per cluster; scoring only this change's TC rows is recorded as a decision | `.qfai/evidence/coverage-depth-spec-0003.md` | The refusal to write outside the project is a safety floor the matrix cannot waive; disagreeing position: the author (`atdd-preflight-tda`) recommended recording it as an open risk. Amended by the griller before it went to the user | PASS |
| 16 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Checkpoints (related suites, full suite at row 10 and the last row) run locally for this task | `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md` | Checkpoints need more than the new tests the local-run permission covered, so the user was asked | PASS |
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
| TDD-0067 | spec-0012 | 182 rows: TDD-0286, TDD-0293..0295, TDD-0336..0346, TDD-0348..0351, TDD-0353..0383, TDD-0385..0400, TDD-0403..0408, TDD-0415..0435, TDD-0437..0476, TDD-0479..0527 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0012's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0013 | 12 rows: TDD-0019..0030 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0013's `done` rows certify behaviour whose tests reach `validateProject` or the CLI validate command, whose sdd composition lost the work-log validator. Re-run read-only, file-scoped with `--reporter=verbose`, in the checkpoint run above: TDD-0022 named as passed. The other 11 rows are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0014 | 7 rows: TDD-0009, TDD-0018..0019, TDD-0033..0036 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0014's `done` rows certify behaviour whose tests reach `validateProject` or the CLI validate command, whose sdd composition lost the work-log validator. Re-run read-only, file-scoped with `--reporter=verbose`, in the checkpoint run above: TDD-0009, TDD-0018, TDD-0019 named as passed. The other 4 rows are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0015 | 21 rows: TDD-0011..0012, TDD-0017..0035 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0015's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |
| TDD-0067 | spec-0016 | 28 rows: TDD-0001..0028 | `packages/qfai/src/core/validate.ts` and the files listed in `### TDD-0067` | Remove the work-log validator from validate's sdd composition | spec-0016's `done` rows are matched through the package fallback only; no static import reaches a changed module. Their selectors are re-run by the CI full-suite checkpoint | open |

## Execution logs

- `TDD-0067` RED and assertion-stripped runs: `### TDD-0067`.

## Gaps / Open risks

- `TDD-0067`: scope approved (PASS); the approved RED and its
  assertion-stripped run are recorded. The `qa-gatekeeper` RED verdict on them
  is pending.
- `TDD-0068` … `TDD-0071` are not yet written; they follow in the P1c loop.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

Pending. P8 has not been reached, and no review pack is open.
