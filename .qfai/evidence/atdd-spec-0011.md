# ATDD Evidence: spec-0011

## Objective

Write the acceptance tests for the removal of the AI work-log surface `.qfai/steering/` that
spec-0011 owns: `TC-0011-0013`, carried by the ledger rows `TDD-0021`, `TDD-0022` and
`TDD-0023`. Each row gets its RED provenance here before `/qfai-implement` changes the
shipped `/qfai-implement` skill text.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0011/03_Acceptance-Criteria.md` (`AC-0011-0012`),
  `04_Business-Rules.md` (`BR-0011-0009`), `05_Examples.md` (`EX-0011-0010`),
  `06_Test-Cases.md` (`TC-0011-0013`)
- `.qfai/specs/spec-0011/tdd/test-list.md` — read, not written
- `.qfai/evidence/coverage-depth-spec-0011.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md` and `references/execution-ledger.md`, read from the package tree

## Decisions made (with rationale)

The preflight session S1 settled fifteen decisions for the whole run; each is a
`grilling(S1@2026-09-23T19:33:24.738Z/…)` row in the Work Orders Summary.

**Every row stops at `refactor`, by user decision.** The change is green only at its head,
so each row stops at `refactor` after its RED, its GREEN, its reviews and its local
per-row checkpoint. All rows' full-suite checkpoints close together on the final head's
CI, and all rows go `done` after that run passes. Authority: the user's answer to a
structured question (AskUserQuestion), relayed by the orchestrator. It departs from stage
gate P1c, which runs each row's checkpoint before the next row's test.

**Rows sharing a GREEN take their REDs first (user, S2).** A refinement of S1 D2 (one row
at a time), adjudicated by the user through a structured question (AskUserQuestion) after
S1 had ended, so it is recorded as session S2 of this run rather than under S1.

- Decision: rows that one GREEN satisfies take their REDs before that GREEN. GREENs and
  reviews stay per row.
- Reason: after a shared GREEN, a later row would pass on its first run and have no RED
  left to observe. The sibling-satisfied branch would need the sibling `done`, which the
  stop-at-`refactor` decision rules out until the final head.

**All three rows are in one file,** `packages/qfai/tests/integration/spec0011RecordHomes.test.ts`,
as S1 D3 set out, and every `it` was written before the first RED of the file.

## Grilling Session

### /qfai-implement — run started 2026-09-24T11:31:45.842Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-24T11:36:58.319Z | working-tree+8da24c6ba61734c4bfedfd7bf1e5a71ef8f2c41ebe7fbfb87425ed5ffc0bace9 | 2026-09-24T11:42:46.203Z | preflight | empty | none in flight | 3 | 0 | 0 |

### /qfai-atdd — run started 2026-09-23T19:33:24.738Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T20:13:17.289Z | working-tree+ecbebad44db0972da88c2858d175f303772e80ba665e4a380c68ea3e59caf750 | 2026-09-24T00:39:27.265Z | preflight | empty | none in flight | 15 | 0 | 4 |
| S2 | adopted | 2026-09-24T00:43:09.001Z | working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 | 2026-09-24T00:45:41.337Z | whether rows one GREEN satisfies take their REDs before that GREEN | empty | none in flight | 1 | 0 | 1 |

S1 is the preflight session of the one `/qfai-atdd` run that covers spec-0003, spec-0004,
spec-0011 and spec-0013; `.qfai/evidence/atdd-spec-0004.md` carries the same row. `Work resumed` for S1 is this run's first spec-0011 test write.
S2 records a decision the user answered after S1 had ended.

Escalated S1: D1 — `EX-0004-0044` gives a passing `Blocked-By` the kept check rejects. User: fix the example and BR via a Change Request. Done as `CR-20260923-0011` (applied; spec-0004 DR-0004-0043, DL-0029). TDD-0069..0071 fixtures use `spec-0004:TDD-0001 — blocked at todo`.

Escalated S1: D2 — batch every RED first vs the P1c per-row loop. User: one row at a time (the P1c loop).

Escalated S1: D13 — the BR-0003-0009 negative (refusal to write outside the project) is a safety-floor ⚠️ that this change did not create. User: raise a Change Request to add that test; spec-0003's ATDD is reported not PASS on that cell until it lands.

Escalated S1: N1 — `/qfai-implement` checkpoints need the related suites and full-suite runs, beyond "only the new tests". User: run checkpoints locally too (this task only). Superseded by the user's later answer (AskUserQuestion, 2026-09-23): the full package suite runs on CI through a pushed draft PR at the boundaries, and the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check.

Escalated S2: D2-refinement — several rows are satisfied by one shared GREEN, so a later row would pass on its first run after that GREEN, and the sibling-satisfied branch needs the sibling `done`, which the stop-at-`refactor` decision rules out. User: take the REDs of rows sharing a GREEN before that GREEN; GREENs and reviews per row.

## Work performed (what changed, where)

- `packages/qfai/tests/integration/spec0011RecordHomes.test.ts` — new; annotated
  `QFAI:SPEC-0011:TC-0011-0013`.
- `packages/qfai/tsconfig.tests.json` — the file added to `include`.

No production file was changed.

## Commands executed + key outputs

- prettier, eslint and `tsc -p packages/qfai/tsconfig.tests.json --noEmit` over the new
  file: clean. No test has been run.

## Test volume estimate

| Layer       | Raw count | Signal | Evidence                                        | Notes                                                                 |
| ----------- | --------: | -----: | ----------------------------------------------- | --------------------------------------------------------------------- |
| E2E         |         8 |     38 | the `US-0011-*` stories; no `L5` TC            | Surface opt-in is off project-wide, so every non-planned `US-*` is required |
| API         |         0 |      0 | no `CON-API-*`; no `L4` TC                      |                                                                       |
| Integration |        13 |     62 | integration-routed `TC-0011-*`; no `CON-DB-*`   | 12 of them declare no `Level`, which routes to `tests/integration/**` |

`total` = 21. Signals are shares of that total in whole percent, planning signals only.

## Coverage obligations checklist

| Kind        | Required              | Home                                 | This run                                                    |
| ----------- | --------------------- | ------------------------------------ | ----------------------------------------------------------- |
| `US-*`      | 8                     | `tests/e2e/**`                       | Unchanged by this change; not scored in this run (S1 D13)   |
| `TC-*`      | 13 integration-routed | `packages/qfai/tests/integration/**` | `TC-0011-0013` written (`TDD-0021` … `TDD-0023`), not run    |
| `CON-API-*` | none                  | `tests/api/**`                       | none owed                                                   |
| `CON-DB-*`  | none                  | `tests/integration/**`               | none owed                                                   |

## Ledger rows advanced

No ledger cell is written here: `/qfai-implement` writes `Status`, `DR-ID` and `Evidence`.

| TDD-ID     | Obligation     | Layer       | RED provenance             | Entry                 |
| ---------- | -------------- | ----------- | -------------------------- | --------------------- |
| `TDD-0021` | `TC-0011-0013` | Integration | observed-red | [TDD-0021](#tdd-0021) |
| `TDD-0022` | `TC-0011-0013` | Integration | observed-red | [TDD-0022](#tdd-0022) |
| `TDD-0023` | `TC-0011-0013` | Integration | observed-red | [TDD-0023](#tdd-0023) |

### TDD-0021

- TDD-ID: TDD-0021
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0011RecordHomes.test.ts
- Selector: TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
- TC-ref: TC-0011-0013
- EX-ref: EX-0011-0010; AC-ref: AC-0011-0012; BR-ref: BR-0011-0009
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: the recording constraint in `SKILL.md` `## CRITICAL CONSTRAINTS (Read First)` sends a stop, a decision and a consultation to a `.qfai/steering/<id>.md` work-log entry. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Units, each read-proofed by being found exactly once (S1 D5): the section
  `## CRITICAL CONSTRAINTS (Read First)` of `SKILL.md`, and the bullet
  ``- Any active status -> `blocked` `` of `references/execution-ledger.md`.
- Oracle (S1 D11, presence: each record kind tied to its home inside the unit). The
  section is split into paragraphs and list items. `missing` must be empty:
  - one block of the section names a stop and `` `Blocked-By` ``;
  - one block of the section names a decision, a consultation (not `consultation-needed`)
    and an out-of-scope discovery, with `/qfai-sdd` and "Change Request";
  - the `-> blocked` bullet names `` `Blocked-By` ``.
- Reading of the TC, for the scope review: the stop is asserted in both files, and the
  route to `/qfai-sdd` in the `SKILL.md` recording constraint, which EX-0011-0010 names
  beside the two ledger edges.
- Expected RED, from reading the code before the run (the RED below matches it): both `SKILL.md` statements are
  missing; the `-> blocked` bullet already names `Blocked-By`.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: file hash `97bd4a7bf6ea1b1160af424845669acef72024220ac9931a05f16cc58ee53f26`, at tree `working-tree+2d31f83a…c37d55`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - The author's reading of TC-0011-0013 is confirmed. The stop is checked in
    both files: the `## CRITICAL CONSTRAINTS (Read First)` section of
    `SKILL.md` and the `-> blocked` bullet of `execution-ledger.md`. The route
    to `/qfai-sdd` is checked in `SKILL.md` only. The TC names both files for
    the stop. EX-0011-0010 ties the route to "the recording constraint", which
    is `SKILL.md`'s. The ledger's transitions are not where a decision's home
    is stated. Requiring the route there would add something the TC does not
    ask.
  - Sufficiency: every part of the `record-homes-stated` check is asserted.
    `Blocked-By` goes with the stop. `/qfai-sdd` and "Change Request" go with
    a decision, a consultation and an out-of-scope discovery. All three misses
    are collected into one `toEqual`, so one failure shows them all. The
    AC's "which names what it waits on" and the `07` / `08` homes are not in
    TC-0011-0013, and they are not asserted.
  - One boundary, as the TC declares. The `blocked -> todo` wording and the
    surface tokens belong to `TDD-0022` and `TDD-0023`.
  - Both units being found exactly once is a legitimate S1 D5 read-proof.
  - The three kinds must share one block. That goes further than S1 D11
    ("each record kind tied to its home"). It is the matrix row note's
    planned assertion, "one statement sends a decision, a consultation and
    an out-of-scope discovery", so it is accepted as settled rather than
    re-argued here.
  - Advisory: the `-> blocked` edge already states `Blocked-By` today. This
    row's RED will come from the `SKILL.md` half.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-implement` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0011.md#tdd-0021`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55
- Round 1: RED test hash: e00687f7e4c622d992dc4ff20b2bdb4b08bff6281a879bba7e69f3b3dd2cfa05
  (lstat-mode form `97bd4a7bf6ea1b1160af424845669acef72024220ac9931a05f16cc58ee53f26`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0011RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; Test Files 1 failed (1); Tests 1 failed, 2 skipped (3). The approved RED ran at 2026-09-24T00:51:05.020Z after the scope
  PASS. Before the run the file hash recomputed to the approved value, and the tree
  address was taken twice with equal results; HEAD `536fc4ddd`, with the uncommitted
  GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text, and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the file
  skipped by the filter.
  The read-proof passed: the CRITICAL CONSTRAINTS section and the `-> blocked` bullet are
  each found once. The failure is the assertion at line 108, inside the selector:
  `missing` holds the two `SKILL.md` statements, a stop recorded in `Blocked-By` and the
  route of a decision, a consultation and an out-of-scope discovery to `/qfai-sdd` as a
  Change Request. The `-> blocked` bullet already names `Blocked-By`, as predicted.
  Vitest's report follows verbatim.

```text
 × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request 14ms
   → expected [ …(2) ] to deeply equal []
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
AssertionError: expected [ …(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: a stop recorded in `Blocked-By`",
+   "SKILL.md: a decision, a consultation and an out-of-scope discovery sent to /qfai-sdd as a Change Request",
+ ]

 ❯ tests/integration/spec0011RecordHomes.test.ts:108:21
    106|         : ["execution-ledger.md: the -> blocked edge records the stop …
    107|     ].flat();
    108|     expect(missing).toEqual([]);
       |                     ^
    109|   });
    110|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
   Start at  09:51:07
   Duration  422ms (transform 79ms, setup 77ms, import 38ms, tests 15ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised
  as below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed.
  The test was restored at once: it compared byte-equal to the copy taken before the
  strip, the file hash recomputed to the approved value, and the tree address returned to
  the RED revision.

```diff
@@ -79,10 +79,8 @@ describe("TC-0011-0013: records go to existing homes", () => {
     const constraints = section(await linesOf(SKILL), "## CRITICAL CONSTRAINTS (Read First)");
     const blockedEdge = bullet(await linesOf(LEDGER), "- Any active status -> `blocked`");

-    expect(
-      { constraints: constraints.count, blockedEdge: blockedEdge.count },
-      "each unit read is found exactly once",
-    ).toEqual({ constraints: 1, blockedEdge: 1 });
+    void [{ constraints: constraints.count, blockedEdge: blockedEdge.count },
+      "each unit read is found exactly once", { constraints: 1, blockedEdge: 1 }, expect];

     const units = blocks(constraints.body);
     const missing = [
@@ -105,7 +103,7 @@ describe("TC-0011-0013: records go to existing homes", () => {
         ? []
         : ["execution-ledger.md: the -> blocked edge records the stop in `Blocked-By`"],
     ].flat();
-    expect(missing).toEqual([]);
+    void [missing, [], expect];
   });

   it("TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request"
 ✓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request 6ms
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry

 Test Files  1 passed (1)
      Tests  1 passed | 2 skipped (3)
   Start at  09:52:36
   Duration  450ms (transform 81ms, setup 78ms, import 40ms, tests 7ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request"`
  1. Delete the out-of-scope discovery clause from the recording constraint in `SKILL.md`.
     The selector must fail on `missing`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:48:34Z) covers file hash `97bd4a7b…ee53f26`, and the RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `97bd4a7b…ee53f26`. The manifest is the one file, which imports no test-owned helper. The skill directory the test reads, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, is identical to HEAD. The RED revision cannot be recomputed from the current tree, whose address is `working-tree+7fbbb5f1…11dd4`. Files outside this row have changed since, with both spec-0013 test files created after the RED. Excluding them does not restore the recorded value either, so something else outside the row changed too, probably an untracked path created and removed in parallel. Nothing in the manifest or the skill tree moved, and the gatekeeper reproduced the RED on the current tree, so the freshness of this observation stands on the RED test hash and the reproduction. That is the role `red-provenance.md` gives the hash.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other two `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The module loads and imports nothing from `src`. The read-proof passed (the CRITICAL CONSTRAINTS section and the `-> blocked` bullet each found once). The failure is the assertion at line 108 inside the selector: `missing` holds the two `SKILL.md` statements, a stop recorded in `Blocked-By` and the route of a decision, a consultation and an out-of-scope discovery to `/qfai-sdd` as a Change Request. That is the predicate. The ledger half already passes, which the entry predicted.
  - Scope against TC-0011-0013 (`record-homes-stated`) / EX-0011-0010 / AC-0011-0012 / BR-0011-0009: the reading the scope PASS confirmed, with presence tied to its home per S1 D11. Nothing else is asserted.
  - Oracle proof plan: delete the out-of-scope discovery clause from the recording constraint this round writes. It names the GREEN command. Acceptable. Advisory: it exercises only the route half. A second mutation dropping `Blocked-By` from the stop statement would show the other half discriminates as well.

- Round 1: Revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Round 1: GREEN command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request"`
- Round 1: GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed, 2 skipped (3). The named selector passed on the shipped skill text.
- Round 1: Oracle proof:

  ```text
  Mutation: delete `or an out-of-scope discovery` from SKILL.md.
  Command: cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request"
  × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
  AssertionError: expected [ Array(1) ] to deeply equal []
  + "SKILL.md: a decision, a consultation and an out-of-scope discovery sent to /qfai-sdd as a Change Request"
  ❯ tests/integration/spec0011RecordHomes.test.ts:108:21
  Test Files  1 failed (1)
  Tests  1 failed | 2 skipped (3)
  Restoration: SKILL.md SHA-256 FF6421F065E89A374667E871B06A24DC2277E5440624DF6C77326422A0F35A83; the same selector passed again.
  ```
- Round 1: Oracle proof command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request"`
- Round 1: Oracle proof result: exit 1; Test Files 1 failed (1); Tests 1 failed, 2 skipped (3); assertion failure inside the selected test, followed by byte-equal restoration and exit 0 on the restored GREEN command.

  ```text
  × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request 124ms
    → expected [ Array(1) ] to deeply equal []
  AssertionError: expected [ Array(1) ] to deeply equal []
  - Expected
  + Received
  - []
  + [
  +   "SKILL.md: a decision, a consultation and an out-of-scope discovery sent to /qfai-sdd as a Change Request",
  + ]
   ❯ tests/integration/spec0011RecordHomes.test.ts:108:21
  Test Files  1 failed (1)
  Tests  1 failed | 2 skipped (3)
  ```
- Phase: Refactor: no further source edit. The recording constraint uses the existing `Blocked-By` and Change Request homes.
- Refactor verify command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose`; root `corepack pnpm check-types`, root `corepack pnpm lint`, package `npm run -s lint`, rule-code and governed-manifest drift checks.
- Refactor verify result: the test file passed 3/3; both type checks, both lint checks and both drift checks passed. Targeted Prettier and `git diff --check` passed. The root `format:check` initially found only the parent-owned spec-0011 ledger row formatting, which the parent corrected after this run.
- Refactor verify revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Ledger write: todo -> red at 2026-09-24T11:33:30.463Z; red -> green at 2026-09-24T12:14:50.823Z; green -> refactor at 2026-09-24T12:21:12.665Z. The green write followed the build-phase qa-gatekeeper PASS; refactor followed local verification.
- Refactor verify after the green ledger write: the named selector and the full three-test file passed at the same source revision; no refactor edit was needed.
- Build-phase qa-gatekeeper: PASS (`spec0011_qa_build`), reviewing the GREEN, planned Oracle failure and byte-equal restoration at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e`.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924121914333 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: dafa3a85a6d4708c38bd146451d0a85be3c3b3fd213ebc502981b48d7af5425e
- Spec review: PASS
- Spec reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Spec audited evidence hash: f8a4696c1a4b95ffe85df2014be38a185c56fbe684903e9bf167f2cab0585cd5
- Spec review pack: .qfai/review/review-20260924121914333 <!-- qfai:not-a-citation -->
- Spec review pack seal: dafa3a85a6d4708c38bd146451d0a85be3c3b3fd213ebc502981b48d7af5425e
- Code quality review: PASS
- Code quality reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Code quality audited evidence hash: f8a4696c1a4b95ffe85df2014be38a185c56fbe684903e9bf167f2cab0585cd5
- Code quality review pack: .qfai/review/review-20260924121914333 <!-- qfai:not-a-citation -->
- Code quality review pack seal: dafa3a85a6d4708c38bd146451d0a85be3c3b3fd213ebc502981b48d7af5425e
- Spec record re-attestation: 75357b85873ce4c8fa5debd122b8a1d46c117ea48a63c3f47785769faf17aadb
- Spec record re-attestation pack: .qfai/review/review-20260924172220836 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: d177f45c529bafb401814f38f8fbfe28ac1163b0edafa3b23c345fb1d15b25e3
- Code quality record re-attestation: 75357b85873ce4c8fa5debd122b8a1d46c117ea48a63c3f47785769faf17aadb
- Code quality record re-attestation pack: .qfai/review/review-20260924172220836 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: d177f45c529bafb401814f38f8fbfe28ac1163b0edafa3b23c345fb1d15b25e3
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Checkpoint verification command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 3 passed (3); both type checks and emitted rule-code drift check passed; no direct-import tests; no per-item full-suite boundary.
- Checkpoint verification revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Checkpoint verification seal: 183613e696f252552f6afbcbc05230680ec56176a26940992201fdf30e12ad7b

### TDD-0022

- TDD-ID: TDD-0022
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0011RecordHomes.test.ts
- Selector: TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
- TC-ref: TC-0011-0013
- EX-ref: EX-0011-0010; AC-ref: AC-0011-0012; BR-ref: BR-0011-0009
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: the `blocked -> todo` bullet of `references/execution-ledger.md` says to close the entry that accounted for the stop by setting its `status:` to `archived`. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Unit (S1 N2): the `### Allowed transitions` section of `references/execution-ledger.md`,
  and in it the bullet ``- `blocked` -> `todo` `` up to the next top-level bullet. Both
  are found exactly once (S1 D5).
- Oracle (S1 D11, absence): the bullet contains no `archived` (case-sensitive) and no
  instruction to close a record, matched as "close" followed by `the`, `its`, `a`, `an`
  or `that`, at most one further word, and "entry" or "record", case-insensitively.
- Expected RED, from reading the code before the run (the RED below matches it): `archived` and "Close the
  entry".
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: file hash `97bd4a7bf6ea1b1160af424845669acef72024220ac9931a05f16cc58ee53f26`, at tree `working-tree+2d31f83a…c37d55`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Sufficiency: the S1 N2 extract is used as settled. It takes the
    `blocked -> todo` bullet under `### Allowed transitions`, up to the next
    top-level bullet, and requires exactly one match. Both parts of the TC
    are asserted: no `archived`, and no instruction to close a record. The
    current "**Close the entry** … set its `status:` to `archived`" fails on
    both.
  - One boundary: `resume-closes-no-record`, one bullet, one `toEqual`.
  - Finding the section and the bullet once is a legitimate read-proof.
  - Advisory, not scope: the close pattern matches the imperative `close`
    only. A re-added "resuming closes the entry" or "closing the record"
    would pass it. Widening it to `clos(?:e|es|ing)` would cost nothing.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-implement` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0011.md#tdd-0022`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55
- Round 1: RED test hash: e00687f7e4c622d992dc4ff20b2bdb4b08bff6281a879bba7e69f3b3dd2cfa05
  (lstat-mode form `97bd4a7bf6ea1b1160af424845669acef72024220ac9931a05f16cc58ee53f26`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0011RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; Test Files 1 failed (1); Tests 1 failed, 2 skipped (3). The approved RED ran at 2026-09-24T00:51:08.487Z after the scope
  PASS. Before the run the file hash recomputed to the approved value, and the tree
  address was taken twice with equal results; HEAD `536fc4ddd`, with the uncommitted
  GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text, and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the file
  skipped by the filter.
  The read-proof passed: `### Allowed transitions` and its `blocked -> todo` bullet are
  each found once. The failure is the assertion at line 126, inside the selector:
  `found` is `archived` and "Close the entry".
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
 × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record 12ms
   → expected [ 'archived', 'Close the entry' ] to deeply equal []
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
AssertionError: expected [ 'archived', 'Close the entry' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "archived",
+   "Close the entry",
+ ]

 ❯ tests/integration/spec0011RecordHomes.test.ts:126:19
    124|         []),
    125|     ];
    126|     expect(found).toEqual([]);
       |                   ^
    127|   });
    128|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
   Start at  09:51:10
   Duration  404ms (transform 74ms, setup 76ms, import 32ms, tests 14ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised
  as below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed.
  The test was restored at once: it compared byte-equal to the copy taken before the
  strip, the file hash recomputed to the approved value, and the tree address returned to
  the RED revision.

```diff
@@ -113,17 +113,15 @@ describe("TC-0011-0013: records go to existing homes", () => {
     const transitions = section(lines, "### Allowed transitions");
     const resume = bullet(transitions.body, "- `blocked` -> `todo`");

-    expect(
-      { transitions: transitions.count, resume: resume.count },
-      "the Allowed transitions section and its blocked -> todo bullet are found exactly once",
-    ).toEqual({ transitions: 1, resume: 1 });
+    void [{ transitions: transitions.count, resume: resume.count },
+      "the Allowed transitions section and its blocked -> todo bullet are found exactly once", { transitions: 1, resume: 1 }, expect];

     const found = [
       ...(resume.text.includes("archived") ? ["archived"] : []),
       ...(resume.text.match(/\bclose\s+(?:the|its|a|an|that)\s+(?:\S+\s+)?(?:entry|record)\b/gi) ??
         []),
     ];
-    expect(found).toEqual([]);
+    void [found, [], expect];
   });

   it("TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record"
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
 ✓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record 4ms
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry

 Test Files  1 passed (1)
      Tests  1 passed | 2 skipped (3)
   Start at  09:52:39
   Duration  433ms (transform 117ms, setup 88ms, import 71ms, tests 7ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record"`
  1. Re-insert "set its `status:` to `archived`" into the `blocked -> todo` bullet of
     `references/execution-ledger.md`. The selector must fail on `found`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:48:34Z) covers file hash `97bd4a7b…ee53f26`, and the RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `97bd4a7b…ee53f26`. The manifest is the one file, which imports no test-owned helper. The skill directory the test reads, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, is identical to HEAD. The RED revision cannot be recomputed from the current tree, whose address is `working-tree+7fbbb5f1…11dd4`. Files outside this row have changed since, with both spec-0013 test files created after the RED. Excluding them does not restore the recorded value either, so something else outside the row changed too, probably an untracked path created and removed in parallel. Nothing in the manifest or the skill tree moved, and the gatekeeper reproduced the RED on the current tree, so the freshness of this observation stands on the RED test hash and the reproduction. That is the role `red-provenance.md` gives the hash.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other two `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The read-proof passed (`### Allowed transitions` and its `blocked -> todo` bullet each found once, S1 N2). The failure is the assertion at line 126 inside the selector: `found` is `archived` and `Close the entry`, the record-closing instruction the row forbids.
  - Scope against TC-0011-0013 (`resume-closes-no-record`): one bullet, one `toEqual`, and the two absence tokens. Nothing else is asserted.
  - Oracle proof plan: re-insert the `archived` instruction the round removes. It names the GREEN command. Acceptable. Advisory, as the scope approval noted: the close pattern matches only the imperative `close`, so a reworded re-addition (`closes`, `closing`) would pass. Widening it is a test edit, so it takes a fresh scope approval and RED if made.

- Round 1: Revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Round 1: GREEN command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record"`
- Round 1: GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed, 2 skipped (3). The named selector found no closure instruction in the resumption bullet.
- Round 1: Oracle proof:

  ```text
  Mutation: insert `Set its status to archived` with the literal Markdown `status:` and `archived` tokens into the `blocked -> todo` bullet.
  Command: cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record"
  × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
  AssertionError: expected [ 'archived' ] to deeply equal []
  + "archived"
  ❯ tests/integration/spec0011RecordHomes.test.ts:126:19
  Test Files  1 failed (1)
  Tests  1 failed | 2 skipped (3)
  Restoration: execution-ledger.md SHA-256 EA6040257643BC423ECBB872AF1A146577CDBB258D06AA6C90093623C758E1BB; the same selector passed again.
  ```
- Round 1: Oracle proof command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record"`
- Round 1: Oracle proof result: exit 1; Test Files 1 failed (1); Tests 1 failed, 2 skipped (3); assertion failure inside the selected test, followed by byte-equal restoration and exit 0 on the restored GREEN command.

  ```text
  × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record 13ms
    → expected [ 'archived' ] to deeply equal []
  AssertionError: expected [ 'archived' ] to deeply equal []
  - Expected
  + Received
  - []
  + [
  +   "archived",
  + ]
   ❯ tests/integration/spec0011RecordHomes.test.ts:126:19
  Test Files  1 failed (1)
  Tests  1 failed | 2 skipped (3)
  ```
- Phase: Refactor: no further source edit. The blocked resumption still keeps its round and Change Request reset rules.
- Refactor verify command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose`; root `corepack pnpm check-types`, root `corepack pnpm lint`, package `npm run -s lint`, rule-code and governed-manifest drift checks.
- Refactor verify result: the test file passed 3/3; both type checks, both lint checks and both drift checks passed. Targeted Prettier and `git diff --check` passed. The root `format:check` initially found only the parent-owned spec-0011 ledger row formatting, which the parent corrected after this run.
- Refactor verify revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Ledger write: todo -> red at 2026-09-24T11:37:54.957Z; red -> green at 2026-09-24T12:14:54.262Z; green -> refactor at 2026-09-24T12:21:15.613Z. The green write followed the build-phase qa-gatekeeper PASS; refactor followed local verification.
- Refactor verify after the green ledger write: the named selector and the full three-test file passed at the same source revision; no refactor edit was needed.
- Build-phase qa-gatekeeper: PASS (`spec0011_qa_build`), reviewing the GREEN, planned Oracle failure and byte-equal restoration at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e`.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924121914334 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 38f25dbe0579fdb4ea10f417321532ece42b7c6fe3138e60f6565c23cad66603
- Spec review: PASS
- Spec reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Spec audited evidence hash: 347c0e04e568d402d9e6be1a69cefcd717b992e3f9ffd6ebd8b6a3b7713cf7b5
- Spec review pack: .qfai/review/review-20260924121914334 <!-- qfai:not-a-citation -->
- Spec review pack seal: 38f25dbe0579fdb4ea10f417321532ece42b7c6fe3138e60f6565c23cad66603
- Code quality review: PASS
- Code quality reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Code quality audited evidence hash: 347c0e04e568d402d9e6be1a69cefcd717b992e3f9ffd6ebd8b6a3b7713cf7b5
- Code quality review pack: .qfai/review/review-20260924121914334 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 38f25dbe0579fdb4ea10f417321532ece42b7c6fe3138e60f6565c23cad66603
- Spec record re-attestation: 84c5aa8bb04bf51dac2570e223659ffde2a882643ed41082164e1530c51e4b05
- Spec record re-attestation pack: .qfai/review/review-20260924172220856 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 752b48db565e378cdc577ec2e5d49886b0edff619ad4e271e818415b66c57909
- Code quality record re-attestation: 84c5aa8bb04bf51dac2570e223659ffde2a882643ed41082164e1530c51e4b05
- Code quality record re-attestation pack: .qfai/review/review-20260924172220856 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 752b48db565e378cdc577ec2e5d49886b0edff619ad4e271e818415b66c57909
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Checkpoint verification command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 3 passed (3); both type checks and emitted rule-code drift check passed; no direct-import tests; no per-item full-suite boundary.
- Checkpoint verification revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Checkpoint verification seal: 183613e696f252552f6afbcbc05230680ec56176a26940992201fdf30e12ad7b

### TDD-0023

- TDD-ID: TDD-0023
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0011RecordHomes.test.ts
- Selector: TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry
- TC-ref: TC-0011-0013
- EX-ref: EX-0011-0010; AC-ref: AC-0011-0012; BR-ref: BR-0011-0009
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` and `references/execution-ledger.md` name `.qfai/steering/`, and `SKILL.md` names `worklog-entry.schema.md`. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Unit: every file under the skill directory, walked recursively. Read-proof (S1 D5): the
  walk includes `SKILL.md` and `references/execution-ledger.md`.
- Oracle (S1 D11, absence): no file contains `.qfai/steering/` or `worklog-entry.schema.md`
  (case-sensitive), and neither `SKILL.md` nor `references/execution-ledger.md` matches
  "work-log entry" case-insensitively.
- Expected RED, from reading the code before the run (the RED below matches it): `SKILL.md` names all three, and
  `references/execution-ledger.md` names `.qfai/steering/` and "work-log entry".
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: file hash `97bd4a7bf6ea1b1160af424845669acef72024220ac9931a05f16cc58ee53f26`, at tree `working-tree+2d31f83a…c37d55`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Sufficiency: the whole of the TC's third bullet. Every file under the
    skill directory is checked for `.qfai/steering/` and
    `worklog-entry.schema.md`. "work-log entry" is checked in `SKILL.md` and
    `execution-ledger.md` only, case-insensitive as S1 D11 settles.
  - One boundary: `no-surface-reference`.
  - The walk read-proof (both named files are present) is legitimate.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-implement` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0011.md#tdd-0023`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55
- Round 1: RED test hash: e00687f7e4c622d992dc4ff20b2bdb4b08bff6281a879bba7e69f3b3dd2cfa05
  (lstat-mode form `97bd4a7bf6ea1b1160af424845669acef72024220ac9931a05f16cc58ee53f26`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0011RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Round 1: RED result: exit 1; Test Files 1 failed (1); Tests 1 failed, 2 skipped (3). The approved RED ran at 2026-09-24T00:51:11.105Z after the scope
  PASS. Before the run the file hash recomputed to the approved value, and the tree
  address was taken twice with equal results; HEAD `536fc4ddd`, with the uncommitted
  GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text, and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the file
  skipped by the filter.
  The read-proof passed: the walk includes `SKILL.md` and `references/execution-ledger.md`.
  The failure is the assertion at line 155, inside the selector: `SKILL.md` names
  `.qfai/steering/`, `worklog-entry.schema.md` and a work-log entry, and
  `references/execution-ledger.md` names `.qfai/steering/` and a work-log entry.
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
 × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry 19ms
   → expected [ 'SKILL.md: .qfai/steering/', …(4) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry
AssertionError: expected [ 'SKILL.md: .qfai/steering/', …(4) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: .qfai/steering/",
+   "SKILL.md: worklog-entry.schema.md",
+   "SKILL.md: work-log entry",
+   "references/execution-ledger.md: .qfai/steering/",
+   "references/execution-ledger.md: work-log entry",
+ ]

 ❯ tests/integration/spec0011RecordHomes.test.ts:155:19
    153|       }
    154|     }
    155|     expect(found).toEqual([]);
       |                   ^
    156|   });
    157| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
   Start at  09:51:13
   Duration  360ms (transform 69ms, setup 69ms, import 32ms, tests 21ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised
  as below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed.
  The test was restored at once: it compared byte-equal to the copy taken before the
  strip, the file hash recomputed to the approved value, and the tree address returned to
  the RED revision.

```diff
@@ -133,10 +133,8 @@ describe("TC-0011-0013: records go to existing homes", () => {
     }
     const relative = files.map((file) => path.relative(SKILL_DIR, file).replace(/\\/g, "/"));

-    expect(
-      ["SKILL.md", "references/execution-ledger.md"].filter((name) => !relative.includes(name)),
-      "the walk read the skill directory",
-    ).toEqual([]);
+    void [["SKILL.md", "references/execution-ledger.md"].filter((name) => !relative.includes(name)),
+      "the walk read the skill directory", [], expect];

     const found: string[] = [];
     for (const [index, file] of files.entries()) {
@@ -152,6 +150,6 @@ describe("TC-0011-0013: records go to existing homes", () => {
         found.push(`${name}: work-log entry`);
       }
     }
-    expect(found).toEqual([]);
+    void [found, [], expect];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry"
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request
 ↓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record
 ✓ |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry 15ms

 Test Files  1 passed (1)
      Tests  1 passed | 2 skipped (3)
   Start at  09:52:44
   Duration  748ms (transform 73ms, setup 76ms, import 33ms, tests 18ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry"`
  1. Re-insert the `.qfai/steering/<id>.md` sentence into `SKILL.md`. The selector must fail
     on `found`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:48:34Z) covers file hash `97bd4a7b…ee53f26`, and the RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `97bd4a7b…ee53f26`. The manifest is the one file, which imports no test-owned helper. The skill directory the test reads, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, is identical to HEAD. The RED revision cannot be recomputed from the current tree, whose address is `working-tree+7fbbb5f1…11dd4`. Files outside this row have changed since, with both spec-0013 test files created after the RED. Excluding them does not restore the recorded value either, so something else outside the row changed too, probably an untracked path created and removed in parallel. Nothing in the manifest or the skill tree moved, and the gatekeeper reproduced the RED on the current tree, so the freshness of this observation stands on the RED test hash and the reproduction. That is the role `red-provenance.md` gives the hash.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other two `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The walk read-proof passed (both named files present). The failure is the assertion at line 155 inside the selector: `SKILL.md` names `.qfai/steering/`, `worklog-entry.schema.md` and a work-log entry, and `references/execution-ledger.md` names `.qfai/steering/` and a work-log entry. That is the predicate.
  - Scope against TC-0011-0013 (`no-surface-reference`): the S1 D11 tokens over every file of the skill directory, with the prose token over the two named files. Nothing else is asserted.
  - Oracle proof plan: re-insert the `.qfai/steering/<id>.md` sentence into `SKILL.md`. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Round 1: GREEN command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry"`
- Round 1: GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed, 2 skipped (3). The directory walk found no forbidden token.
- Round 1: Oracle proof:

  ```text
  Mutation: insert a `.qfai/steering/<id>.md` sentence in SKILL.md.
  Command: cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry"
  × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry
  AssertionError: expected [ 'SKILL.md: .qfai/steering/' ] to deeply equal []
  + "SKILL.md: .qfai/steering/"
  ❯ tests/integration/spec0011RecordHomes.test.ts:155:19
  Test Files  1 failed (1)
  Tests  1 failed | 2 skipped (3)
  Restoration: SKILL.md SHA-256 FF6421F065E89A374667E871B06A24DC2277E5440624DF6C77326422A0F35A83; the same selector passed again.
  ```
- Round 1: Oracle proof command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose -t "TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry"`
- Round 1: Oracle proof result: exit 1; Test Files 1 failed (1); Tests 1 failed, 2 skipped (3); assertion failure inside the selected test, followed by byte-equal restoration and exit 0 on the restored GREEN command.

  ```text
  × |integration| tests/integration/spec0011RecordHomes.test.ts > TC-0011-0013: records go to existing homes > TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry 48ms
    → expected [ 'SKILL.md: .qfai/steering/' ] to deeply equal []
  AssertionError: expected [ 'SKILL.md: .qfai/steering/' ] to deeply equal []
  - Expected
  + Received
  - []
  + [
  +   "SKILL.md: .qfai/steering/",
  + ]
   ❯ tests/integration/spec0011RecordHomes.test.ts:155:19
  Test Files  1 failed (1)
  Tests  1 failed | 2 skipped (3)
  ```
- Phase: Refactor: no further source edit. The retired surface references are absent from the whole skill directory.
- Refactor verify command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose`; root `corepack pnpm check-types`, root `corepack pnpm lint`, package `npm run -s lint`, rule-code and governed-manifest drift checks.
- Refactor verify result: the test file passed 3/3; both type checks, both lint checks and both drift checks passed. Targeted Prettier and `git diff --check` passed. The root `format:check` initially found only the parent-owned spec-0011 ledger row formatting, which the parent corrected after this run.
- Refactor verify revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Ledger write: todo -> red at 2026-09-24T11:38:09.441Z; red -> green at 2026-09-24T12:14:58.192Z; green -> refactor at 2026-09-24T12:21:19.265Z. The green write followed the build-phase qa-gatekeeper PASS; refactor followed local verification.
- Refactor verify after the green ledger write: the named selector and the full three-test file passed at the same source revision; no refactor edit was needed.
- Build-phase qa-gatekeeper: PASS (`spec0011_qa_build`), reviewing the GREEN, planned Oracle failure and byte-equal restoration at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e`.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924121914335 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 87e686ee391bc57bb4f1f14cc514844201fe802f7bd332c56b3b18b64cb5c0d7
- Spec review: PASS
- Spec reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Spec audited evidence hash: a314e2b1ec12675d8828203c55c9cd97c2451ca87008d7df89ec060a4876d29e
- Spec review pack: .qfai/review/review-20260924121914335 <!-- qfai:not-a-citation -->
- Spec review pack seal: 87e686ee391bc57bb4f1f14cc514844201fe802f7bd332c56b3b18b64cb5c0d7
- Code quality review: PASS
- Code quality reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Code quality audited evidence hash: a314e2b1ec12675d8828203c55c9cd97c2451ca87008d7df89ec060a4876d29e
- Code quality review pack: .qfai/review/review-20260924121914335 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 87e686ee391bc57bb4f1f14cc514844201fe802f7bd332c56b3b18b64cb5c0d7
- Spec record re-attestation: f818ab3b46daf2ae2e485632ded98dbbd755012825e85aa197bb89507eec53f5
- Spec record re-attestation pack: .qfai/review/review-20260924172220863 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 302af2e8956047de7a12d60072f8c242412ea39f911bf494495cbaed835e5434
- Code quality record re-attestation: f818ab3b46daf2ae2e485632ded98dbbd755012825e85aa197bb89507eec53f5
- Code quality record re-attestation pack: .qfai/review/review-20260924172220863 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 302af2e8956047de7a12d60072f8c242412ea39f911bf494495cbaed835e5434
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Checkpoint verification command: `cd packages/qfai && npx vitest run tests/integration/spec0011RecordHomes.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 3 passed (3); both type checks and emitted rule-code drift check passed; no direct-import tests; no per-item full-suite boundary.
- Checkpoint verification revision: working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e
- Checkpoint verification seal: 183613e696f252552f6afbcbc05230680ec56176a26940992201fdf30e12ad7b

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0011.md` (committed). Totals: ✅ 4 / ⚠️ 12 / ❌ 3,
`n/a` 17, across 36 scored cells: 9 matrix cells and 27 business rule cells.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Fix EX-0004-0044 / BR-0004-0035 (and AC-0004-0041, TC-0004-0076) through CR-20260923-0011 | `spec-0004/05_Examples.md`, `04_Business-Rules.md` | `CR-20260923-0011` (applied); the example gave a passing `Blocked-By` the kept `TDDLIST_BLOCKED_MISSING_REF` check rejects, and changing settled input is the user's to approve | PASS |
| 2 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Per-row P1c loop; a row a sibling's GREEN already satisfies moves to branch 2 with `Satisfied-by` naming that sibling; TDD-0070 is branch 2, re-classified right before handover, `Satisfied-by` naming `packages/qfai/src/core/validators/tddList.ts` and the kept `TDDLIST_BLOCKED_MISSING_REF` check | `.claude/skills/qfai-atdd/SKILL.md` P1c | Stage gate P1c requires one loop per row before the next RED; disagreeing position: the author (`atdd-preflight-tda`) recommended taking every RED first in one batch | PASS |
| 3 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Seven new integration files, one `it` per ledger row, annotations in the files, each added to `tsconfig.tests.json`, `runValidate` / `runInit` called in-process from `src`, not `initSpec0003.test.ts` | `spec0004ProfileSuffixedValidate.test.ts`, `packages/qfai/tsconfig.tests.json` | One `it` per row keeps each selector equal to its row; in-process `src` calls follow the existing spec-0004 suite and need no build; the include list is an enumeration. Amended by the griller from the author's proposal | PASS |
| 4 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): "Names `.qfai/steering/`" scans `file`, `relatedFiles[]`, `refs[]`, `message`, `suggested_action`, normalises `\` to `/`, and matches `.qfai/steering` followed by `/` or end of string | `packages/qfai/src/core/types.ts` `Issue` | A finding can name a path in any of those fields; Windows separators would hide a match; the boundary keeps `.qfai/assistant/steering/` from matching. Amended by the griller | PASS |
| 5 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Every absence oracle also shows the scanner under test read the fixture; a written report proves nothing | `06_Test-Cases.md` TC-0004-0074 … 0076 | An absence observed over a run that read nothing passes vacuously. Amended by the griller | PASS |
| 6 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0071 unreadable file: `chmod 000` on POSIX, `icacls <f> /deny *S-1-1-0:(R)` on win32 with the deny removed before cleanup; assert first that `readFile` rejects; record the host | `05_Examples.md` EX-0004-0044 | The fixture must be unreadable on both hosts, and asserting the rejection first keeps a no-op permission change from reading as a pass. Amended by the griller | PASS |
| 7 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Each `it` gets its own fixture; TDD-0097 runs plain init then `--force`, asserting after `--force` against the pre-run record | `spec-0004/07_Decisions.md` DR-0004-0037 | Each test builds its own tree, as DR-0004-0037 records; comparing against the pre-run record shows what `--force` changed | PASS |
| 8 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): After init, delete everything under `.qfai/steering/`, write exactly the EX-0003-0053 set, then record paths and hashes | `spec-0003/05_Examples.md` EX-0003-0053 | A tree holding exactly the example's set makes the preserved paths and hashes reproducible | PASS |
| 9 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Build lock records with the exported `hashAssistantAssetText`, `readAssistantAssetsLock`, `writeAssistantAssetsLock`; schema content an inline literal; TDD-0068 removes the lock record init writes | `packages/qfai/src/core/assistantAssetProvenance.ts` | Reuses the exported lock helpers rather than re-implementing the lock format; an inline literal keeps the test self-contained. Amended by the griller | PASS |
| 10 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0099 note oracle requires, on one report line, `NOTE:`, a normalised path ending `catalog/worklog-entry.schema.md`, "no longer shipped", "content has been edited", "was not removed" | `spec-0003/06_Test-Cases.md` | Pinning every part to one line fails a partial or split message. Amended by the griller | PASS |
| 11 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Text oracles: exact case-sensitive substrings for code tokens, case-insensitive for "work-log" / "work-log entry"; presence ties each record kind to its home inside the extracted unit; a row whose current text already passes is branch 2, never a reshaped oracle | `spec-0011/06_Test-Cases.md`, `spec-0013/06_Test-Cases.md` | Exact tokens avoid false passes, and prose casing varies; reshaping an oracle to force a failure is forbidden by the RED provenance rules. Amended by the griller | PASS |
| 12 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): Retired annotations in acceptance-test territory (`validatorConvergenceIntegration.test.ts`, the root `tests/**/qfai-traceability.md` lines) are removed by `/qfai-implement` with the symbol removal, as the deltas say; record the ownership exception | `spec-0004/09_delta.md` | The deltas pair each annotation's removal with its symbol's, so one change removes both; the exception is recorded because those files are this stage's territory | PASS |
| 13 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): BR-0003-0009 floor cell goes to a Change Request, not satisfied this run; other carried ❌ cells cite one DR/CR per cluster; scoring only this change's TC rows is recorded as a decision | `.qfai/evidence/coverage-depth-spec-0003.md` | The refusal to write outside the project is a safety floor the matrix cannot waive; disagreeing position: the author (`atdd-preflight-tda`) recommended recording it as an open risk. Amended by the griller before it went to the user | PASS |
| 14 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Checkpoints (related suites, full suite at row 10 and the last row) run locally for this task | `.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md` | Checkpoints need more than the new tests the local-run permission covered, so the user was asked. Superseded by the user's later AskUserQuestion answer (2026-09-23): the full suite runs on CI at the boundaries; the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check | PASS |
| 15 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/agents): TDD-0022 extracts the `blocked -> todo` bullet under `### Allowed transitions` in `execution-ledger.md`, up to the next top-level bullet, and asserts exactly one match | `spec-0011/06_Test-Cases.md` | A bounded extract with one match reads only the transition the row owns | PASS |
| 16 | orchestrator | - | grilling(S2@2026-09-23T19:33:24.738Z/user): rows one GREEN satisfies take their REDs before that GREEN; GREENs and reviews stay per row | S1 D2; the stop-at-`refactor` decision | A shared GREEN would make a later row pass on its first run, and the sibling-satisfied branch needs the sibling `done`, which stop-at-`refactor` rules out. Refines S1 D2 (one row at a time) | PASS |
| 17 | acceptance-test-engineer | atdd-ate | TDD-0021 … TDD-0023 tests written | `spec-0011/03`…`06`; S1 D3-D5, D11, N2 | `packages/qfai/tests/integration/spec0011RecordHomes.test.ts` (test hash `97bd4a7b…e53f26`) | PASS |
| 18 | delivery-planner | atdd-scope | Scope approval TDD-0021 | `### TDD-0021`; `spec0011RecordHomes.test.ts` (hash `97bd4a7b…ee53f26`); TC-0011-0013, EX-0011-0010, AC-0011-0012, BR-0011-0009; matrix row note | Scope PASS. The author's reading is confirmed: the stop is checked in both files, and the route to `/qfai-sdd` only in `SKILL.md`, as EX-0011-0010 ties it to the recording constraint. The one-block co-location follows the matrix note | PASS |
| 19 | delivery-planner | atdd-scope | Scope approval TDD-0022 | `### TDD-0022`; `spec0011RecordHomes.test.ts` (hash `97bd4a7b…ee53f26`); TC-0011-0013 second bullet; S1 N2 | Scope PASS. The N2 extract, no `archived`, no close instruction, one boundary. Advisory: widen `close` to `clos(?:e|es|ing)` | PASS |
| 20 | delivery-planner | atdd-scope | Scope approval TDD-0023 | `### TDD-0023`; `spec0011RecordHomes.test.ts` (hash `97bd4a7b…ee53f26`); TC-0011-0013 third bullet; S1 D11 | Scope PASS. Tokens in every skill file, and "work-log entry" in the two named files, one boundary | PASS |
| 21 | acceptance-test-engineer | atdd-ate | TDD-0021 RED | `### TDD-0021`; `packages/qfai/tests/integration/spec0011RecordHomes.test.ts` (RED test hash `97bd4a7b…e53f26`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0021` Round 1 | PASS |
| 22 | acceptance-test-engineer | atdd-ate | TDD-0022 RED | `### TDD-0022`; `packages/qfai/tests/integration/spec0011RecordHomes.test.ts` (RED test hash `97bd4a7b…e53f26`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0022` Round 1 | PASS |
| 23 | acceptance-test-engineer | atdd-ate | TDD-0023 RED | `### TDD-0023`; `packages/qfai/tests/integration/spec0011RecordHomes.test.ts` (RED test hash `97bd4a7b…e53f26`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0023` Round 1 | PASS |
| 24 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0021 | `### TDD-0021` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:48:34Z; `spec0011RecordHomes.test.ts` | PASS: RED reproduced at line 108: both SKILL.md statements missing (the ledger half passes), after its read-proof; RED test hash equal and skill tree identical to HEAD (the RED revision is not recomputable after parallel writes outside the row); strip valid | PASS |
| 25 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0022 | `### TDD-0022` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:48:34Z; `spec0011RecordHomes.test.ts` | PASS: RED reproduced at line 126: `archived` and `Close the entry`, after its read-proof; RED test hash equal and skill tree identical to HEAD (the RED revision is not recomputable after parallel writes outside the row); strip valid | PASS |
| 26 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0023 | `### TDD-0023` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:48:34Z; `spec0011RecordHomes.test.ts` | PASS: RED reproduced at line 155: five hits across SKILL.md and the execution ledger, after its read-proof; RED test hash equal and skill tree identical to HEAD (the RED revision is not recomputable after parallel writes outside the row); strip valid | PASS |
| 27 | discovery-analyst | spec0011_grill | grilling(S1@2026-09-24T11:31:45.842Z/agents): a stop uses `Blocked-By`, while a decision, consultation or out-of-scope discovery goes to `/qfai-sdd` as a Change Request | BR-0011-0009; DR-0011-0003 | Existing homes cover each record; no other medium or direct upstream spec edit is needed | PASS |
| 28 | discovery-analyst | spec0011_grill | grilling(S1@2026-09-24T11:31:45.842Z/agents): use the three existing RED selectors and remove the retired surface-pinning test | TC-0011-0013; `spec0011RecordHomes.test.ts`; `implementWorklogObligation.test.ts` | One selector per boundary; no extra test layer or history operation is needed | PASS |
| 29 | discovery-analyst | spec0011_grill | grilling(S1@2026-09-24T11:31:45.842Z/agents): remove the blocked-entry creation and closure sentences while retaining `Blocked-By`, round and Change Request reset rules | `references/execution-ledger.md` allowed transitions | TDD-0022 and TDD-0023 change only the retired recording surface; resumption still retains its evidence | PASS |
| 30 | backend-engineer | spec0011_impl | /qfai-implement: TDD-0021 GREEN and Oracle proof | `#tdd-0021`; TC-0011-0013; BR-0011-0009 | `#tdd-0021` Round 1 at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e`; selector PASS, planned mutation assertion FAIL, byte-equal restore | PASS |
| 31 | backend-engineer | spec0011_impl | /qfai-implement: TDD-0022 GREEN and Oracle proof | `#tdd-0022`; TC-0011-0013; BR-0011-0009 | `#tdd-0022` Round 1 at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e`; selector PASS, planned mutation assertion FAIL, byte-equal restore | PASS |
| 32 | backend-engineer | spec0011_impl | /qfai-implement: TDD-0023 GREEN and Oracle proof | `#tdd-0023`; TC-0011-0013; BR-0011-0009 | `#tdd-0023` Round 1 at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e`; selector PASS, planned mutation assertion FAIL, byte-equal restore | PASS |
| 33 | qa-gatekeeper | spec0011_qa_build | /qfai-implement: TDD-0021 build-phase GREEN and Oracle gate | `#tdd-0021` Round 1; source revision `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` | PASS: selector success, planned mutation assertion failure, and byte-equal restoration independently checked | PASS |
| 34 | qa-gatekeeper | spec0011_qa_build | /qfai-implement: TDD-0022 build-phase GREEN and Oracle gate | `#tdd-0022` Round 1; source revision `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` | PASS: selector success, planned mutation assertion failure, and byte-equal restoration independently checked | PASS |
| 35 | qa-gatekeeper | spec0011_qa_build | /qfai-implement: TDD-0023 build-phase GREEN and Oracle gate | `#tdd-0023` Round 1; source revision `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` | PASS: selector success, planned mutation assertion failure, and byte-equal restoration independently checked | PASS |
| 36 | completion-reviewer | spec0011_completion | /qfai-implement: TDD-0021 Round 1, attempt 1 completion review | `#tdd-0021` Round 1; review request `review-20260924121914333` | PASS: audited evidence hash `f8a4696c…0585cd5`; no findings or required fixes | PASS |
| 37 | implementation-reviewer | spec0011_code_review | /qfai-implement: TDD-0021 Round 1, attempt 1 code review | `#tdd-0021` Round 1; review request `review-20260924121914333` | PASS: same audited evidence hash and reviewed revision; no findings or required fixes | PASS |
| 38 | completion-reviewer | spec0011_completion | /qfai-implement: TDD-0022 Round 1, attempt 1 completion review | `#tdd-0022` Round 1; review request `review-20260924121914334` | PASS: audited evidence hash `347c0e04…7713cf7b5`; no findings or required fixes | PASS |
| 39 | implementation-reviewer | spec0011_code_review | /qfai-implement: TDD-0022 Round 1, attempt 1 code review | `#tdd-0022` Round 1; review request `review-20260924121914334` | PASS: same audited evidence hash and reviewed revision; advisory on `close` verb forms, no required fix | PASS |
| 40 | completion-reviewer | spec0011_completion | /qfai-implement: TDD-0023 Round 1, attempt 1 completion review | `#tdd-0023` Round 1; review request `review-20260924121914335` | PASS: audited evidence hash `a314e2b1…4876d29e`; no findings or required fixes | PASS |
| 41 | implementation-reviewer | spec0011_code_review | /qfai-implement: TDD-0023 Round 1, attempt 1 code review | `#tdd-0023` Round 1; review request `review-20260924121914335` | PASS: same audited evidence hash and reviewed revision; no findings or required fixes | PASS |
| 42 | backend-engineer | spec0011_impl | /qfai-implement: TDD-0021..0023 checkpoint verification | Three reviewed rows at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` | File-scoped 3/3, both type checks and rule-code drift PASS; same revision before and after | PASS |

## Cross-spec obligations

| Source rows | Dependent spec | Dependent row | Shared artifact | Change | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TDD-0021..TDD-0023 | spec-0013 | TDD-0048 (`todo`) | Shipped `.qfai/assistant` skill tree | Remove the qfai-implement work-log text | `spec0013RecordHomes.test.ts` still has its deliberate RED in qfai-sdd files; re-run it after spec-0013 edits | open |

The direct importer scan found no test importing the changed Markdown files. The
source-reading asset suite passed 179 files and failed four repository-wide
accounting tests that also cover other pending work: `evidenceCitedArtifacts`,
`openRowAlreadyTested`, `retractedClaims` and `stageEvidenceCounts`. The final
full-suite checkpoint must close those failures. The scoped ATDD validation
still runs at P5.

## Execution logs

None yet; the REDs are recorded per row when they run.

## Gaps / Open risks

- `TDD-0021` … `TDD-0023`: REDs passed by `qa-gatekeeper` (RED phase) on file hash
  `97bd4a7b…ee53f26`; handoffs ready. Their GREEN is the `/qfai-implement` skill-text round.
- The implementation's source-reading asset suite has four accounting failures,
  named under Cross-spec obligations. Its other 179 files passed.
- Checkpoint departure (user decision, see Decisions made): no full-suite checkpoint runs per
  row. All rows' full-suite checkpoints close together on the final head's CI.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

Pending. P8 has not been reached, and no review pack is open.

## First full CI checkpoint

- Revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Run: https://github.com/aganesy/QFAI/actions/runs/36026684599
- Result: PASS — build, lint, types, all nine package test slices, Node floor tests, and ci-pass succeeded.
- Rows closed: TDD-0021, TDD-0022, TDD-0023.

## Record defects

- `record:QFAI-TDDLIST-008`, `TDD-0021`, Round 1: the TC reference, RED result and Oracle proof placed observed results outside the fields read by validation. The record now identifies the actual failing assertion, command and ledger TC reference. The completion and implementation reviewers re-attested PASS at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` over audited hash `75357b85873ce4c8fa5debd122b8a1d46c117ea48a63c3f47785769faf17aadb`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0022`, Round 1: the TC reference, RED result and Oracle proof placed observed results outside the fields read by validation. The record now identifies the actual failing assertion, command and ledger TC reference. The completion and implementation reviewers re-attested PASS at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` over audited hash `84c5aa8bb04bf51dac2570e223659ffde2a882643ed41082164e1530c51e4b05`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0023`, Round 1: the TC reference, RED result and Oracle proof placed observed results outside the fields read by validation. The record now identifies the actual failing assertion, command and ledger TC reference. The completion and implementation reviewers re-attested PASS at `working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e` over audited hash `f818ab3b46daf2ae2e485632ded98dbbd755012825e85aa197bb89507eec53f5`; the original sealed review remains historical.
