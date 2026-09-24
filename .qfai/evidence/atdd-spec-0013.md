# ATDD Evidence: spec-0013

## Objective

Carry the proof for four of this spec's twelve `done` ledger rows. The other
eight are not backfilled and the reasons are under Gaps.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0013/06_Test-Cases.md`
- `.qfai/specs/spec-0013/02_User-stories.md`
- `.qfai/specs/spec-0013/tdd/test-list.md`
- `packages/qfai/tests/integration/sddUiTemplate.test.ts`
- `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`
- `packages/qfai/tests/integration/primaryTasksStructured.test.ts`
- `packages/qfai/tests/core/activeDiscussionPack.test.ts`
- `packages/qfai/tests/core/surfaceTypePopulate.test.ts`

## Decisions made (with rationale)

Every row declares `Run output retained: no`. The cells held a verdict with no
command and no output, so the reviewer verdicts and pack seals a completed entry
normally carries cannot be recorded and are not invented.

No row can produce an observed RED — every implementation shipped long before
this record — so all four take the falsifiability path.

Seven rows carried a `Selector` written as a summary of the obligation rather
than a test's title. Each was corrected to the title of the case that carries
the obligation, after reading the `Verify` line of its test case against what
the test asserts. Two more — `TDD-0023` and `TDD-0026` — already named the tail
of their `describe` title, without the leading test-case id, and resolve because
the runner matches a substring.

A `Selector` correction stands on its own: it makes the row name a case that can
be run, and says nothing about whether that case discharges the obligation.
Three of the five rows this run leaves unbackfilled with a corrected `Selector`
keep their original `Evidence` cell; `TDD-0023` and `TDD-0026` are unchanged in
both cells.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

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

**The six rows are in two files,** as S1 D3 set out:
`packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (`TDD-0044`, `TDD-0046`,
`TDD-0047`, `TDD-0048`) and `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts`
(`TDD-0045`, `TDD-0049`). Every `it` of a file was written before the first RED of that file.

## Grilling Session

This file had no `## Grilling Session` section before this run; the earlier runs recorded
none here.

### /qfai-atdd — run started 2026-09-23T19:33:24.738Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T20:13:17.289Z | working-tree+ecbebad44db0972da88c2858d175f303772e80ba665e4a380c68ea3e59caf750 | 2026-09-24T00:39:59.840Z | preflight | empty | none in flight | 15 | 0 | 4 |
| S2 | adopted | 2026-09-24T00:43:09.001Z | working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 | 2026-09-24T00:45:41.337Z | whether rows one GREEN satisfies take their REDs before that GREEN | empty | none in flight | 1 | 0 | 1 |

S1 is the preflight session of the one `/qfai-atdd` run that covers spec-0003, spec-0004,
spec-0011 and spec-0013; `.qfai/evidence/atdd-spec-0004.md` carries the same row. `Work resumed` for S1 is this run's first spec-0013 test write.
S2 records a decision the user answered after S1 had ended.

Escalated S1: D1 — `EX-0004-0044` gives a passing `Blocked-By` the kept check rejects. User: fix the example and BR via a Change Request. Done as `CR-20260923-0011` (applied; spec-0004 DR-0004-0043, DL-0029). TDD-0069..0071 fixtures use `spec-0004:TDD-0001 — blocked at todo`.

Escalated S1: D2 — batch every RED first vs the P1c per-row loop. User: one row at a time (the P1c loop).

Escalated S1: D13 — the BR-0003-0009 negative (refusal to write outside the project) is a safety-floor ⚠️ that this change did not create. User: raise a Change Request to add that test; spec-0003's ATDD is reported not PASS on that cell until it lands.

Escalated S1: N1 — `/qfai-implement` checkpoints need the related suites and full-suite runs, beyond "only the new tests". User: run checkpoints locally too (this task only). Superseded by the user's later answer (AskUserQuestion, 2026-09-23): the full package suite runs on CI through a pushed draft PR at the boundaries, and the local per-row set is the row's test, the direct-import test files, both type checks and the rule-code drift check.

Escalated S2: D2-refinement — several rows are satisfied by one shared GREEN, so a later row would pass on its first run after that GREEN, and the sibling-satisfied branch needs the sibling `done`, which the stop-at-`refactor` decision rules out. User: take the REDs of rows sharing a GREEN before that GREEN; GREENs and reviews per row.
### /qfai-implement — run started 2026-09-24T12:34:21.949Z

- Work resumed: 2026-09-24T12:40:32.989Z
- Grilling S1 ended at 2026-09-24T12:38:28.145Z on source revision working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e. Decisions: 2; open: 0; escalated: 0.
- S1 D1: state the two existing record homes in the existing skill output explanation. Reject a new independent section because it would duplicate that explanation.
- S1 D2: edit the three existing approval stops directly, preserving the approval cell, Phase 0 gate, Operation and target report, `QFAI-TRIAGE-005` and the rerun instruction. Reject a new shared section because the three stop sites need the rule at point of use.
- Source changes: shipped `qfai-sdd/SKILL.md`, `references/sdd-execution-playbook.md`, `references/sdd-triage.md`, and the existing `autoModeApprovalDegrade.test.ts` expectations. `sync:ssot` ran as its four scripts, all exit 0.

## Work performed (what changed, where)

- `.qfai/specs/spec-0013/tdd/test-list.md` — seven `Selector` cells rewritten to
  the titles they name, and the `Evidence` cells of the four rows below rewritten
  as pointers into this file. No `Status` moved.
- This file created.
- `TDD-0020` and `TDD-0030` taken again when their test files gained the cases
  their obligations named: the prototyping preflight refusing an empty
  `primary_tasks`, and a structured item missing `label`. `TDD-0029` taken again
  with them, because it shares the second file. The three rows now carry the
  revision of that run in their `Evidence` cells.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs for `TDD-0024` were taken
at revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Those for `TDD-0020`,
`TDD-0029` and `TDD-0030` were taken at
`working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d`,
with `d4b59da759e80dc2c6018b92b8d6f9154e1e4dd7` as `HEAD`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Row        | Mutation                                          | Killed              |
| ---------- | ------------------------------------------------- | ------------------- |
| `TDD-0020` | the empty-list test and the preflight check forced false | 4 of 5 |
| `TDD-0020` | the preflight check forced false, alone | 1 of 5 |
| `TDD-0024` | the pointer-to-pack match made unconditional      | 1 of 4              |
| `TDD-0029` | `acceptance` taken out of the required set | 5 of 7 |
| `TDD-0029` | the legacy string branch emptied | 1 of 7 |
| `TDD-0030` | `label` taken out of the missing-key filter | 1 of 7 |
| `TDD-0030` | the shape finding's rule code renamed | 5 of 7 |

Refactor verify: 25 passed at the first revision and 62 at the second. Checkpoint:
8986 passed at the first and 9468 at the second, exit 0 both times.

The checkpoint holds two files of the `core` project out, named in its command:
`tests/core/prFixMonitor.test.ts` and `tests/core/prMergePlan.test.ts` drive a
PowerShell script, and this container has no `pwsh`, so eighteen of their
nineteen cases fail on `spawn pwsh ENOENT` whatever the tree holds. They run in
continuous integration, which does have it.

Validate gate, over the tree as this change leaves it rather than at the
revision above — the matrix this profile requires is part of the change, so the
gate cannot pass without it: `npx qfai validate --profile atdd --fail-on error
--spec 0013` — `error=0`, exit 0. Two findings are about the tree, both `info`:
the partial-profile notice, and the carrier-only coverage note. A third,
`QFAI-TOOL-001`, reports which binary ran and moves with how the command is
invoked rather than with the tree.

## Test volume estimate

Two cases, one per row taken again: the preflight refusal in
`sddPrimaryTasksLane.test.ts` and the missing `label` in
`primaryTasksStructured.test.ts`. `TDD-0029` shares the second file, and `TDD-0024`
records proof for a test that already existed.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

| Layer       | Raw count | Signal | Evidence                                      | Notes                                                                 |
| ----------- | --------: | -----: | --------------------------------------------- | --------------------------------------------------------------------- |
| E2E         |        14 |     27 | the `US-0013-*` stories; no `L5` TC          | Surface opt-in is off project-wide, so every non-planned `US-*` is required |
| API         |         0 |      0 | no `CON-API-*`; no `L4` TC                    |                                                                       |
| Integration |        37 |     73 | integration-routed `TC-0013-*`; no `CON-DB-*` | 24 of them declare no `Level`, which routes to `tests/integration/**` |

`total` = 51. Signals are shares of that total in whole percent, planning signals only.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

- `TC-0013-0036` and `TC-0013-0037`: exercised by `TDD-0044` … `TDD-0049`, all done after the first full CI checkpoint, under
  `packages/qfai/tests/integration/**`.
- `US-*` (14), `CON-API-*` (none), `CON-DB-*` (none): unchanged by this change.

## Ledger rows advanced

The four earlier rows were already done. TDD-0044 through TDD-0049 became done after the first full CI checkpoint.

| TDD-ID     | Obligation      | Layer       | RED provenance | Status |
| ---------- | --------------- | ----------- | -------------- | ------ |
| `TDD-0020` | `TC-0013-0026`  | integration | falsifiability | done   |
| `TDD-0024` | `TC-0013-0029`  | integration | falsifiability | done   |
| `TDD-0029` | `TC-0013-0034`  | integration | falsifiability | done   |
| `TDD-0030` | `TC-0013-0035`  | integration | falsifiability | done   |
| `TDD-0044` | `TC-0013-0036` | Integration | observed-red | done |
| `TDD-0046` | `TC-0013-0036` | Integration | observed-red | done |
| `TDD-0047` | `TC-0013-0036` | Integration | observed-red | done |
| `TDD-0048` | `TC-0013-0036` | Integration | observed-red | done |
| `TDD-0045` | `TC-0013-0037` | Integration | observed-red | done |
| `TDD-0049` | `TC-0013-0037` | Integration | observed-red | done |

One of the four reaches part of a multi-clause obligation. The part each reaches
is recorded with the row, so the evidence says what it proves rather than
restating what the test case asks for.

| Row        | Reached by the recorded case                                                             | Not reached                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TDD-0020` | The lane fails at `error`, and the message names the file, the screen and the rule token; the `/qfai-prototyping` preflight then refuses, its UI contract check naming the file and the screen | Nothing the obligation names |
| `TDD-0024` | A missing pointer and an absent pack each raise a recovery error                         | A pointer resolving to a duplicate pack. No case supplies one, and none can: the resolver calls `findPacks` once over one directory, and two entries of one directory cannot share a name, so `matches.length > 1` is unreachable through this API. The branch is defensive code, and the row proves the two conditions that are reachable |
| `TDD-0030` | An item missing `id`, one missing `label`, one missing `acceptance`, one carrying an extra key, and a list where every item is malformed | Nothing the obligation names |

`TDD-0020`, `TDD-0029` and `TDD-0030` share the refactor-verify and checkpoint
runs of the second revision, which their entries record. `TDD-0024` records
those of the first:

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)

Eight further files and 43 cases in those projects declare themselves inactive
and did not run.

### TDD-0020

- TDD-ID: TDD-0020
- Layer: integration
- Test file: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts
- Selector: TC-0013-0026: QFAI-AUD-001 aligned lane fails when primary_tasks is empty
- TC-ref: TC-0013-0026
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The proof below was taken again when the file gained the case for the preflight refusal the obligation names: the tests were re-run for the GREEN, and the mutations were applied and reverted to establish that each of the row's cases discriminates. No reviewer verdict is recorded because none can be reconstructed.

- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d
- Round 1: Satisfied-by: packages/qfai/src/core/validators/designAudit.ts, checkContractHierarchyFromScreens — the empty-list test that opens the `QFAI-AUD-001` branch; and packages/qfai/src/core/doctor.ts, buildPrototypingUiContractsCheck — the check that stops the prototyping preflight on a screen with no primary task.
- Round 1: Falsifiability command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 4 failed, 1 passed (5). Both of this row's cases fail: the lane case on the absent finding, and the preflight case on `qfai prototyping preflight` exiting 0 over the contract it has to refuse.

The edits, one per case — the empty-list branch that opens `QFAI-AUD-001`, and
the preflight's refusal:

```diff
   for (const screen of screens) {
-    if (screen.primaryTasks.length === 0) {
+    if (false) {
       // sourceRef is `<rel-path>#<screenId>` — split so the message names
```

```diff
   const withoutTasks = screens.filter((screen) => screen.primaryTasks.length === 0);
-  if (withoutTasks.length > 0) {
+  if (false) {
     return {
```

- Round 1: Falsifiability revision: working-tree+d3c1c8e9ccd62bcdb6ae1b7d76d388f7dc097eb7b2f76c5cc71e6081f921eb8c
- Round 1: GREEN command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 5 passed (5)
- Round 1: RED test hash: cb0467ec3070442a73780dae84ca4e9c75718f4b932a72480b9ed966ae2888b1
- Round 1: RED test manifest: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts

Forcing the empty-list test false silences the finding for an empty list and for
a legacy contract alike, so the lane case dies together with the two sibling
cases that read it; the surviving case is the sibling's non-empty contract. The
preflight edit is independent of the lane. Applied alone, at
`working-tree+715bf5db785170b2b2460c13ca8540f30e2e2aa287be9786d527c22c590d0532`,
it fails the preflight case and nothing else: Tests 1 failed, 4 passed (5).

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts tests/cli/doctor.test.ts
- Refactor verify result: Test Files 7 passed (7); Tests 62 passed (62)
- Refactor verify revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 547 passed (555); Tests 9468 passed (9550)
- Checkpoint verification revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d

### TDD-0024

- TDD-ID: TDD-0024
- Layer: integration
- Test file: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Selector: TC-0013-0029: ambiguous/absent active pointer raises a recovery error
- TC-ref: TC-0013-0029
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.

- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, resolveActiveDiscussionPack — the filter that matches the pointer against the packs on disk.
- Round 1: Falsifiability command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 3 passed (4). The dangling-pointer case fails; the error stops being raised.

The edit, in `resolveActiveDiscussionPack` — the filter that matches the
pointer against the packs on disk:

```diff
-  const matches = candidates.filter((pack) => pack.name === currentId);
+  const matches = candidates;
```
- Round 1: Falsifiability revision: working-tree+01dcf4fa9d5f24f9cbd5321207d20ffb4fc433eb459fc66c27021b2f38734669
- Round 1: GREEN command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: f707c0a49fe7893d759c7aebc8859047777f9b9505d50f0e7d4f202f30f13d71
- Round 1: RED test manifest: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0029

- TDD-ID: TDD-0029
- Layer: integration
- Test file: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Selector: TC-0013-0034: structured primary_tasks accepted
- TC-ref: TC-0013-0034
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The proof below was taken again when the test file this row shares with `TDD-0030` gained a case, which moved the file its RED test hash is taken over: the tests were re-run for the GREEN, and the mutations were applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.

- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d
- Round 1: Satisfied-by: packages/qfai/src/core/contracts/screenContracts.ts, REQUIRED_PRIMARY_TASK_KEYS — the closed set a structured item is measured against.
- Round 1: Falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 5 failed, 2 passed (7). This row's acceptance case fails on the complete item it is meant to admit.

The edit, in `screenContracts.ts` — the closed set a structured item is
measured against:

```diff
-const REQUIRED_PRIMARY_TASK_KEYS = ["id", "label", "acceptance"] as const;
+const REQUIRED_PRIMARY_TASK_KEYS = ["id", "label"] as const;
```

Which five die:

```text
 ✓ TC-0013-0034 > string-only items pass (legacy shape, three string entries — within band)
 × TC-0013-0034 > complete structured {id,label,acceptance} items pass
 × TC-0013-0035 > rejects a structured item missing 'acceptance'
 × TC-0013-0035 > rejects a structured item missing 'label'
 × TC-0013-0035 > rejects a structured item missing 'id'
 ✓ TC-0013-0035 > surfaces QFAI-AUD-021 shape findings even when every entry is malformed (parsed list empty)
 × TC-0013-0035 > rejects a structured item carrying an extra key (closed schema)
```

The set is one closed schema read from both directions, which is why the
rejection cases move with the acceptance case: `acceptance` leaving the required
list makes it an **extra** key on every item that carries one, so the complete
item is rejected, and the first finding each rejection case reads is now about
another item or another key than the one it names. The all-malformed case
survives because none of its items carries `acceptance`, so its first finding
still reports the missing `id`.

- Round 1: Falsifiability revision: working-tree+37038454e27eb82828e673dc7b06f1ff1ddf79cb835bc00b556a4f017140b802
- Round 1: GREEN command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 7 passed (7)
- Round 1: RED test hash: 42ed4fd14d1e12d580570121fe033e4d7afc2d3ecad4e946af7f605e42860c0f
- Round 1: RED test manifest: packages/qfai/tests/integration/primaryTasksStructured.test.ts

The obligation admits two shapes, so it carries two mutations. The one above
takes the structured shape. The legacy string shape is taken by emptying, in
the same file, the branch that turns a bare string entry into a task:

```diff
     if (typeof entry === "string") {
-      const trimmed = entry.trim();
-      if (trimmed.length > 0) {
-        primaryTasks.push(trimmed);
-      }
       continue;
     }
```

- Round 1: Second falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Second falsifiability result: Test Files 1 failed (1); Tests 1 failed, 6 passed (7). The failure is the legacy-shape case of this row, `string-only items pass (legacy shape, three string entries — within band)`.
- Round 1: Second falsifiability revision: working-tree+859131b08ab33abfce9e9a658459256c9c229c3bb2fa87858c63eabb9024a101

A legacy string then contributes no task, so a screen carrying three of them
parses as empty and the lane reports it. The first mutation leaves that case
green and the second leaves the structured case green, so the pair covers both
shapes the obligation admits.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts tests/cli/doctor.test.ts
- Refactor verify result: Test Files 7 passed (7); Tests 62 passed (62)
- Refactor verify revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 547 passed (555); Tests 9468 passed (9550)
- Checkpoint verification revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d

### TDD-0030

- TDD-ID: TDD-0030
- Layer: integration
- Test file: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Selector: TC-0013-0035: incomplete / open structured primary_tasks rejected
- TC-ref: TC-0013-0035
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The proof below was taken again when the file gained the case for a structured item missing `label`, which the obligation names: the tests were re-run for the GREEN, and the mutations were applied and reverted to establish that each rejection case discriminates. No reviewer verdict is recorded because none can be reconstructed.

- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d
- Round 1: Satisfied-by: packages/qfai/src/core/contracts/screenContracts.ts, extractPrimaryTasks — the filter that reports each required key a structured item lacks.
- Round 1: Falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 6 passed (7). The `label` case fails, and it is the only one: an item without `label` now conforms.

The edit, in `extractPrimaryTasks` — `label` taken out of the missing-key filter:

```diff
       const missingKeys = REQUIRED_PRIMARY_TASK_KEYS.filter((key) => {
+        if (key === "label") return false;
         const v = record[key];
```

- Round 1: Falsifiability revision: working-tree+c0d5ecd3d9dfc6bab6ff4c4442dea3793ee1c40c4ddea089070d40753c0e2db3
- Round 1: GREEN command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 7 passed (7)
- Round 1: RED test hash: 42ed4fd14d1e12d580570121fe033e4d7afc2d3ecad4e946af7f605e42860c0f
- Round 1: RED test manifest: packages/qfai/tests/integration/primaryTasksStructured.test.ts

The other rejection cases each read the rule code a shape violation is reported
under. Renaming it in `shapeFindingFor` from `QFAI-AUD-021` to `QFAI-AUD-001`, at
`working-tree+c60db41fe9908ec31eed3d068b04fb7bce7367af4ec703f6413c3f5ebd6419cf`,
fails all five of them and leaves the two acceptance cases passing: Tests 5
failed, 2 passed (7).

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts tests/cli/doctor.test.ts
- Refactor verify result: Test Files 7 passed (7); Tests 62 passed (62)
- Refactor verify revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 547 passed (555); Tests 9468 passed (9550)
- Checkpoint verification revision: working-tree+6fb16efd07f3f84741a144ed4cfb6924947303775e708bd0070c947e3aa0b78d

### TDD-0044

- TDD-ID: TDD-0044
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
- TC-ref: TC-0013-0036
- Boundary: `record-homes-stated`
- EX-ref: EX-0013-0021; AC-ref: AC-0013-0028; BR-ref: BR-0013-0021
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` `## Work-log entries` sends these records to a `.qfai/steering/<id>.md` entry, and no text of the skill sends an out-of-scope discovery anywhere. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Unit: `SKILL.md` and every file under `references/`, split into paragraphs and list items.
  Read-proof (S1 D5): the walk includes `SKILL.md` and at least one reference.
- Oracle (S1 D11, presence), as the matrix row note plans it, one statement per record home:
  - one block names a decision, `07_Decisions.md` and "Change Request";
  - one block names a consultation (not `consultation-needed`) and an out-of-scope
    discovery, `08_Open-questions.md` and "Change Request".
- Expected RED, from reading the code before the run (the RED below matches it): `consultationOrDiscovery` is
  `false`, since no block names an out-of-scope discovery. Whether a decision block
  already exists is not known before the run.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: this row's `it` body and the helpers it calls, as read at file hash
    `32f2b472…09ba66`, with the single selector entry above. `TDD-0046`'s
    fix changes the file hash. The resubmission must show this `it` unchanged,
    and I re-confirm it on the new hash before the RED runs.
  - Sufficiency: both routes of TC-0013-0036's first bullet, across
    `SKILL.md` and every file under `references/`. A decision must appear with
    `07_Decisions.md` and "Change Request". A consultation and an out-of-scope
    discovery must appear with `08_Open-questions.md` and "Change Request".
    Requiring both alternatives in the statement is how "sends … to X or a
    Change Request" is stated.
  - Two statements, and consultation and discovery in one block: this goes
    further than S1 D11's "each kind tied to its home". It is the matrix row
    note's planned assertion, as the author says, so it is accepted as
    settled. The mutation that deletes the discovery clause fails it.
  - One boundary: `record-homes-stated`. The section, the example and the
    tree tokens belong to `TDD-0046` … `TDD-0048`.
  - The read-proof (`SKILL.md` and at least one reference read) is
    legitimate.
- Scope approval (`delivery-planner`), on file hash `b45c049e…4e2e2a`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:59:11Z
  - Covers: file hash `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`,
    at tree `working-tree+d388a371…afca`, and the single selector entry above, which is unchanged.
    No RED on this hash had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Re-confirmed: the `it` body reads as it did at `32f2b472…09ba66`. The only
    change in the file is `TDD-0046`'s one line, which this row does not use.
    The earlier PASS reasons hold.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0044`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca
- Round 1: RED test hash: d27b6b92e0ed796f5826e95c5c923077619621b6882cd4c10291e492d28cd249
  (lstat-mode form `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it changes
  no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T01:00:45.861Z after the scope
  PASS at 00:59:11Z. Before the run both spec-0013 file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`, with
  the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text,
  and nothing else writing to the tree. Exit 1; Test Files 1 failed (1); Tests 1 failed,
  the other `it`s of the file skipped by the filter.
  The read-proof passed: the walk read `SKILL.md` and the references. The failure is the
  assertion at line 88, inside the selector: both statements are missing, `decision` and
  `consultationOrDiscovery` are `false`. No block of the skill ties a decision to
  `07_Decisions.md` and a Change Request either, which the prediction had left open.
  Vitest's report follows verbatim.

```text
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 47ms
   → expected { decision: false, …(1) } to deeply equal { decision: true, …(1) }
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
AssertionError: expected { decision: false, …(1) } to deeply equal { decision: true, …(1) }

- Expected
+ Received

  {
-   "consultationOrDiscovery": true,
-   "decision": true,
+   "consultationOrDiscovery": false,
+   "decision": false,
  }

 ❯ tests/integration/spec0013RecordHomes.test.ts:88:20
     86|       ),
     87|     };
     88|     expect(stated).toEqual({ decision: true, consultationOrDiscovery: …
       |                    ^
     89|   });
     90|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  10:00:51
   Duration  821ms (transform 109ms, setup 108ms, import 37ms, tests 49ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised as
  below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed. The
  test was restored at once: it compared byte-equal to the copy taken before the strip, the
  file hash recomputed to the approved value, and the tree address returned to the RED
  revision.

```diff
@@ -60,13 +60,11 @@ describe("TC-0013-0036: records go to the spec pack", () => {
       ({ name }) => name === "SKILL.md" || name.startsWith("references/"),
     );

-    expect(
-      {
+    void [{
         skill: files.some(({ name }) => name === "SKILL.md"),
         references: files.filter(({ name }) => name.startsWith("references/")).length > 0,
       },
-      "the walk read SKILL.md and the references",
-    ).toEqual({ skill: true, references: true });
+      "the walk read SKILL.md and the references", { skill: true, references: true }, expect];

     const all: string[] = [];
     for (const { file } of files) all.push(...blocks(await linesOf(file)));
@@ -85,7 +83,7 @@ describe("TC-0013-0036: records go to the spec pack", () => {
           block.includes("Change Request"),
       ),
     };
-    expect(stated).toEqual({ decision: true, consultationOrDiscovery: true });
+    void [stated, { decision: true, consultationOrDiscovery: true }, expect];
   });

   it("TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 51ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:01:49
   Duration  860ms (transform 89ms, setup 87ms, import 42ms, tests 53ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
  1. Delete the out-of-scope discovery clause from the statement the GREEN writes. The
     selector must fail on `consultationOrDiscovery`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The walk read-proof passed. The failure is the assertion at line 88 inside the selector: no block of `SKILL.md` or `references/` ties a decision to `07_Decisions.md` and a Change Request, and none ties a consultation and an out-of-scope discovery to `08_Open-questions.md` and a Change Request. That is the predicate.
  - Scope against TC-0013-0036 (`record-homes-stated`) / EX-0013-0021 / AC-0013-0028 / BR-0013-0021: both routes, presence per S1 D11, with the one-statement shape the scope approval accepted. Nothing else is asserted.
  - Oracle proof plan: delete the out-of-scope discovery clause from the statement the GREEN writes. It names the GREEN command. Acceptable. Advisory: it exercises only the `consultationOrDiscovery` half. A second mutation removing `07_Decisions.md` from the decision statement would show the `decision` half discriminates.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 32ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`; Result: exit 1, assertion failed inside selector `TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Removed `out-of-scope discovery` from the `08_Open-questions.md` sentence; the result reported `consultationOrDiscovery: false` at `spec0013RecordHomes.test.ts:88:20`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
AssertionError: expected { decision: true, …(1) } to deeply equal { decision: true, …(1) }

- Expected
+ Received

  {
-   "consultationOrDiscovery": true,
+   "consultationOrDiscovery": false,
    "decision": true,
  }

 ❯ tests/integration/spec0013RecordHomes.test.ts:88:20
     86|       ),
     87|     };
     88|     expect(stated).toEqual({ decision: true, consultationOrDiscovery: …
       |                    ^
     89|   });
     90|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

2. Removed `07_Decisions.md` from the decision sentence; the result reported `decision: false` at `spec0013RecordHomes.test.ts:88:20`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
AssertionError: expected { decision: false, …(1) } to deeply equal { decision: true, …(1) }

- Expected
+ Received

  {
    "consultationOrDiscovery": true,
-   "decision": true,
+   "decision": false,
  }

 ❯ tests/integration/spec0013RecordHomes.test.ts:88:20
     86|       ),
     87|     };
     88|     expect(stated).toEqual({ decision: true, consultationOrDiscovery: …
       |                    ^
     89|   });
     90|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 16 passed (16). The named selector passed. No further source edit was needed.
- Refactor verify revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Build-phase qa-gatekeeper: PASS for this row's GREEN and Oracle proof at working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.
- Ledger write: todo -> red at 2026-09-24T12:36:53.149Z; red -> green at 2026-09-24T13:08:14.513Z; green -> refactor at 2026-09-24T13:16:42.266Z. The green write followed the build-phase qa-gatekeeper PASS.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924131612877 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 7458317017e72ce45f412e7bd0d4bfff5c600370e67b5de89cceb9646e9e5724
- Spec review: PASS
- Spec reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Spec audited evidence hash: f68373598e550909ac9885175b561d00abe9b197dd1e3c435239749b652325e7
- Spec review pack: .qfai/review/review-20260924131612877 <!-- qfai:not-a-citation -->
- Spec review pack seal: 7458317017e72ce45f412e7bd0d4bfff5c600370e67b5de89cceb9646e9e5724
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Code quality audited evidence hash: f68373598e550909ac9885175b561d00abe9b197dd1e3c435239749b652325e7
- Code quality review pack: .qfai/review/review-20260924131612877 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 7458317017e72ce45f412e7bd0d4bfff5c600370e67b5de89cceb9646e9e5724
- Spec record re-attestation: 92c2348be2179f2c21afc4d73db02c3b4c8847a8573c33f601a2331766fd042c
- Spec record re-attestation pack: .qfai/review/review-20260924172220870 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: aa1416c1a3682478868b00ad33213abf3a8cbe66ad4e50e7cd1e3ba8513c582c
- Code quality record re-attestation: 92c2348be2179f2c21afc4d73db02c3b4c8847a8573c33f601a2331766fd042c
- Code quality record re-attestation pack: .qfai/review/review-20260924172220870 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: aa1416c1a3682478868b00ad33213abf3a8cbe66ad4e50e7cd1e3ba8513c582c
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 3 passed (3); Tests 16 passed (16); root and package type checks passed; emitted rule-code drift check passed. Final-head full suite remains assigned to CI.
- Checkpoint verification revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification seal: 1b65113db2900fd93f740f767b04410fed297d1f2831def1e8b1c04bcf820fb0
- Relevant suite resolution: User-directed local set — this row's exact selector, the two spec-0013 integration files, the direct asset consumer test, root and package type checks, and emitted rule-code drift. The retired skill text is an asset with no static import graph; the final-head CI suite covers the package-wide fallback.

### TDD-0046

- TDD-ID: TDD-0046
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
- TC-ref: TC-0013-0036
- Boundary: `no-worklog-section`
- EX-ref: EX-0013-0021; AC-ref: AC-0013-0028; BR-ref: BR-0013-0021
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` has a `## Work-log entries` section. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Read-proof (S1 D5): the heading ``### `--auto` and approval-required rows``, which
  AC-0013-0029 names, is found exactly once in the file read.
- Oracle (S1 D11, absence): no line of `SKILL.md` contains `## Work-log entries`
  (case-sensitive substring).
- Expected RED, from reading the code before the run (the RED below matches it): the heading is found once.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: REVISE
  - Time: 2026-09-24T00:48:34Z
  - Reviewed: file hash `32f2b47255514581d706f56b080c8b2c75f562c79e705b14d33412b78009ba66`, at tree `working-tree+2d31f83a…c37d55`, the single selector entry
    above, and the Round 1 plan below. No RED had been run.
  - Reason, sufficiency gap: the check is `line.trimEnd() === "## Work-log
    entries"`, an exact-line match. S1 D11 settles absence as an exact
    substring, case-sensitive for `## Work-log entries`. A heading that keeps
    the title and adds to it, such as `## Work-log entries (legacy)`, is still
    that section, and it passes this row.
  - What holds: the `SKILL_ANCHOR` read-proof, one boundary
    (`no-worklog-section`), and the mutation that re-inserts the heading.
  - To clear:
    1. Match the substring: `lines.filter((line) =>
       line.includes("## Work-log entries"))`.
    2. Record the new file hash and resubmit it for scope approval before any
       RED is run. The hash covers the whole file, so the resubmission covers
       `TDD-0044`, `TDD-0047` and `TDD-0048` too.
- Scope approval (`delivery-planner`), on file hash `b45c049e…4e2e2a`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:59:11Z
  - Covers: file hash `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`,
    at tree `working-tree+d388a371…afca`, and the single selector entry above, which is unchanged.
    No RED on this hash had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Reason: the REVISE is cleared. The absence check is
    `line.includes("## Work-log entries")`, the substring S1 D11 settles, so a
    heading that keeps the title and adds to it fails the row. The
    `SKILL_ANCHOR` read-proof and the single boundary are unchanged.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0046`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca
- Round 1: RED test hash: d27b6b92e0ed796f5826e95c5c923077619621b6882cd4c10291e492d28cd249
  (lstat-mode form `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it changes
  no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T01:00:52.703Z after the scope
  PASS at 00:59:11Z. Before the run both spec-0013 file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`, with
  the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text,
  and nothing else writing to the tree. Exit 1; Test Files 1 failed (1); Tests 1 failed,
  the other `it`s of the file skipped by the filter.
  The read-proof passed: the anchor heading is found once. The failure is the assertion at
  line 99, inside the selector: two lines contain `## Work-log entries`, the heading itself
  and the cross-reference "(see `## Work-log entries`)" in the approval-stop bullet, which
  the substring match S1 D11 settled also catches.
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section 42ms
   → expected [ …(2) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
AssertionError: expected [ …(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "- **Stop the stage and hand the run back.** Leave `Approved By` as `-`, do not enter Phase 0, write a `consultation-needed` work-log entry (see `## Work-log entries`) naming every unapproved row with its Operation and target, and report that the approvals need a rerun without `--auto`. The resulting `QFAI-TRIAGE-005` errors are the reported state of a suspended run, not a gate to route",
+   "## Work-log entries",
+ ]

 ❯ tests/integration/spec0013RecordHomes.test.ts:99:74
     97|     ).toHaveLength(1);
     98|
     99|     expect(lines.filter((line) => line.includes("## Work-log entries")…
       |                                                                          ^
    100|   });
    101|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  10:00:58
   Duration  916ms (transform 79ms, setup 77ms, import 39ms, tests 44ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised as
  below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed. The
  test was restored at once: it compared byte-equal to the copy taken before the strip, the
  file hash recomputed to the approved value, and the tree address returned to the RED
  revision.

```diff
@@ -91,12 +91,10 @@ describe("TC-0013-0036: records go to the spec pack", () => {
   it("TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section", async () => {
     const lines = await linesOf(SKILL);

-    expect(
-      lines.filter((line) => line === SKILL_ANCHOR),
-      "the file read is the qfai-sdd skill",
-    ).toHaveLength(1);
+    void [lines.filter((line) => line === SKILL_ANCHOR),
+      "the file read is the qfai-sdd skill", 1, expect];

-    expect(lines.filter((line) => line.includes("## Work-log entries"))).toEqual([]);
+    void [lines.filter((line) => line.includes("## Work-log entries")), [], expect];
   });

   it("TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section 16ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:01:56
   Duration  554ms (transform 74ms, setup 73ms, import 47ms, tests 18ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section"`
  1. Re-insert the `## Work-log entries` heading. The selector must fail.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The anchor read-proof passed. The failure is the assertion at line 99 inside the selector: the heading `## Work-log entries` and the cross-reference to it in the approval-stop bullet. The substring match the REVISE required catches both. That is the predicate.
  - Scope against TC-0013-0036 (`no-worklog-section`): one absence over `SKILL.md`, case-sensitive per S1 D11. Nothing else is asserted.
  - Oracle proof plan: re-insert the heading. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section 21ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section"`; Result: exit 1, assertion failed inside selector `TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted the `## Work-log entries` heading into `SKILL.md`; the result found the heading at `spec0013RecordHomes.test.ts:99:74`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
AssertionError: expected [ '## Work-log entries' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "## Work-log entries",
+ ]

 ❯ tests/integration/spec0013RecordHomes.test.ts:99:74
     97|     ).toHaveLength(1);
     98|
     99|     expect(lines.filter((line) => line.includes("## Work-log entries")…
       |                                                                          ^
    100|   });
    101|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 16 passed (16). The named selector passed. No further source edit was needed.
- Refactor verify revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Build-phase qa-gatekeeper: PASS for this row's GREEN and Oracle proof at working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.
- Ledger write: todo -> red at 2026-09-24T12:37:08.368Z; red -> green at 2026-09-24T13:08:28.327Z; green -> refactor at 2026-09-24T13:16:46.790Z. The green write followed the build-phase qa-gatekeeper PASS.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924131612879 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 9b33eabac7464954637b419af2bc6bf0ab97f43ef9b8e82e65b15657ec0bd96c
- Spec review: PASS
- Spec reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Spec audited evidence hash: 7bcb902fb5a88d426b9d591ffc2534753b105c28715d229e1281b03e582d24ca
- Spec review pack: .qfai/review/review-20260924131612879 <!-- qfai:not-a-citation -->
- Spec review pack seal: 9b33eabac7464954637b419af2bc6bf0ab97f43ef9b8e82e65b15657ec0bd96c
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Code quality audited evidence hash: 7bcb902fb5a88d426b9d591ffc2534753b105c28715d229e1281b03e582d24ca
- Code quality review pack: .qfai/review/review-20260924131612879 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 9b33eabac7464954637b419af2bc6bf0ab97f43ef9b8e82e65b15657ec0bd96c
- Spec record re-attestation: 05aa4663d3a9053787d4fbcf5dcd24ad3a7b3a05b897fbaabfd04f55839079bd
- Spec record re-attestation pack: .qfai/review/review-20260924172220886 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: d2aa898af56c9b4ea4c92bd874523c11ba507d56a75688537518b8b7d8b2c6d8
- Code quality record re-attestation: 05aa4663d3a9053787d4fbcf5dcd24ad3a7b3a05b897fbaabfd04f55839079bd
- Code quality record re-attestation pack: .qfai/review/review-20260924172220886 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: d2aa898af56c9b4ea4c92bd874523c11ba507d56a75688537518b8b7d8b2c6d8
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 3 passed (3); Tests 16 passed (16); root and package type checks passed; emitted rule-code drift check passed. Final-head full suite remains assigned to CI.
- Checkpoint verification revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification seal: 1b65113db2900fd93f740f767b04410fed297d1f2831def1e8b1c04bcf820fb0
- Relevant suite resolution: User-directed local set — this row's exact selector, the two spec-0013 integration files, the direct asset consumer test, root and package type checks, and emitted rule-code drift. The retired skill text is an asset with no static import graph; the final-head CI suite covers the package-wide fallback.

### TDD-0047

- TDD-ID: TDD-0047
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
- TC-ref: TC-0013-0036
- Boundary: `no-pending-promotion-example`
- EX-ref: EX-0013-0021; AC-ref: AC-0013-0028; BR-ref: BR-0013-0021
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` cites a `W-PENDING-PROMOTION` decision as an example of carry-over. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Read-proof (S1 D5): as `TDD-0046`.
- Oracle (S1 D11, absence): no line of `SKILL.md` contains `W-PENDING-PROMOTION`
  (case-sensitive).
- Expected RED, from reading the code before the run (the RED below matches it): the carry-over line.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: this row's `it` body and the helpers it calls, as read at file hash
    `32f2b472…09ba66`, with the single selector entry above. `TDD-0046`'s
    fix changes the file hash. The resubmission must show this `it` unchanged,
    and I re-confirm it on the new hash before the RED runs.
  - Sufficiency: no line of `SKILL.md` contains `W-PENDING-PROMOTION`. That
    is S1 D11's case-sensitive code-token absence, and it covers "no
    `W-PENDING-PROMOTION` example" whatever form the example takes.
  - One boundary: `no-pending-promotion-example`. The `SKILL_ANCHOR`
    read-proof is legitimate.
- Scope approval (`delivery-planner`), on file hash `b45c049e…4e2e2a`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:59:11Z
  - Covers: file hash `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`,
    at tree `working-tree+d388a371…afca`, and the single selector entry above, which is unchanged.
    No RED on this hash had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Re-confirmed: the `it` body reads as it did at `32f2b472…09ba66`. The only
    change in the file is `TDD-0046`'s one line, which this row does not use.
    The earlier PASS reasons hold.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0047`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca
- Round 1: RED test hash: d27b6b92e0ed796f5826e95c5c923077619621b6882cd4c10291e492d28cd249
  (lstat-mode form `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it changes
  no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T01:01:01.175Z after the scope
  PASS at 00:59:11Z. Before the run both spec-0013 file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`, with
  the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text,
  and nothing else writing to the tree. Exit 1; Test Files 1 failed (1); Tests 1 failed,
  the other `it`s of the file skipped by the filter.
  The read-proof passed: the anchor heading is found once. The failure is the assertion at
  line 110, inside the selector: the carry-over line citing a `W-PENDING-PROMOTION` decision.
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 37ms
   → expected [ Array(1) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "   the command cannot compute — e.g. a `W-PENDING-PROMOTION` decision still to promote in Stage 1 — belong in `Open Questions (Carry-over)`: pass them as `--assume \"<finding>\"`, or append them to that section **of the latest-run pointer** (a re-run reads its carry-over back from the pointer, so they survive step 3 below; a note appended only to a run-scoped copy is never read again).",
+ ]

 ❯ tests/integration/spec0013RecordHomes.test.ts:110:74
    108|     ).toHaveLength(1);
    109|
    110|     expect(lines.filter((line) => line.includes("W-PENDING-PROMOTION")…
       |                                                                          ^
    111|   });
    112|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  10:01:05
   Duration  735ms (transform 74ms, setup 86ms, import 38ms, tests 39ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised as
  below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed. The
  test was restored at once: it compared byte-equal to the copy taken before the strip, the
  file hash recomputed to the approved value, and the tree address returned to the RED
  revision.

```diff
@@ -102,12 +102,10 @@ describe("TC-0013-0036: records go to the spec pack", () => {
   it("TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example", async () => {
     const lines = await linesOf(SKILL);

-    expect(
-      lines.filter((line) => line === SKILL_ANCHOR),
-      "the file read is the qfai-sdd skill",
-    ).toHaveLength(1);
+    void [lines.filter((line) => line === SKILL_ANCHOR),
+      "the file read is the qfai-sdd skill", 1, expect];

-    expect(lines.filter((line) => line.includes("W-PENDING-PROMOTION"))).toEqual([]);
+    void [lines.filter((line) => line.includes("W-PENDING-PROMOTION")), [], expect];
   });

   it("TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 15ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:02:07
   Duration  525ms (transform 78ms, setup 76ms, import 40ms, tests 17ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
  1. Re-insert the `W-PENDING-PROMOTION` example. The selector must fail.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The anchor read-proof passed. The failure is the assertion at line 110 inside the selector: the carry-over line citing a `W-PENDING-PROMOTION` decision. That is the predicate.
  - Scope against TC-0013-0036 (`no-pending-promotion-example`): one case-sensitive code-token absence. Nothing else is asserted.
  - Oracle proof plan: re-insert the example. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 29ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`; Result: exit 1, assertion failed inside selector `TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted the `W-PENDING-PROMOTION` example in the preflight sentence; the result found that line at `spec0013RecordHomes.test.ts:110:74`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "   the command cannot compute — e.g. a `W-PENDING-PROMOTION` decision still to promote in Stage 1 — belong in `Open Questions (Carry-over)`: pass them as `--assume \"<finding>\"`, or append them to that section **of the latest-run pointer** (a re-run reads its carry-over back from the pointer, so they survive step 3 below; a note appended only to a run-scoped copy is never read again).",
+ ]

 ❯ tests/integration/spec0013RecordHomes.test.ts:110:74
    108|     ).toHaveLength(1);
    109|
    110|     expect(lines.filter((line) => line.includes("W-PENDING-PROMOTION")…
       |                                                                          ^
    111|   });
    112|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 16 passed (16). The named selector passed. No further source edit was needed.
- Refactor verify revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Build-phase qa-gatekeeper: PASS for this row's GREEN and Oracle proof at working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.
- Ledger write: todo -> red at 2026-09-24T12:37:15.283Z; red -> green at 2026-09-24T13:08:33.131Z; green -> refactor at 2026-09-24T13:16:49.033Z. The green write followed the build-phase qa-gatekeeper PASS.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924131612880 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 1aa186161bdca91602c108d75a343950f7ba491314c03f144f06c3415b95c568
- Spec review: PASS
- Spec reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Spec audited evidence hash: 14d49f90d5dd8d5d7f8e286e257fb2c77d4c6b9b1a88082a19b8cf069e19b2f0
- Spec review pack: .qfai/review/review-20260924131612880 <!-- qfai:not-a-citation -->
- Spec review pack seal: 1aa186161bdca91602c108d75a343950f7ba491314c03f144f06c3415b95c568
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Code quality audited evidence hash: 14d49f90d5dd8d5d7f8e286e257fb2c77d4c6b9b1a88082a19b8cf069e19b2f0
- Code quality review pack: .qfai/review/review-20260924131612880 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 1aa186161bdca91602c108d75a343950f7ba491314c03f144f06c3415b95c568
- Spec record re-attestation: 0f30fe0de447a293cf11ef5063f33b36dbc561f0eaf4c777753cf6cd19b7e798
- Spec record re-attestation pack: .qfai/review/review-20260924172220893 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 1585484419ac3909b88dc964739443963c9d4180bc0e19e1a108972e4d4b1cad
- Code quality record re-attestation: 0f30fe0de447a293cf11ef5063f33b36dbc561f0eaf4c777753cf6cd19b7e798
- Code quality record re-attestation pack: .qfai/review/review-20260924172220893 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 1585484419ac3909b88dc964739443963c9d4180bc0e19e1a108972e4d4b1cad
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 3 passed (3); Tests 16 passed (16); root and package type checks passed; emitted rule-code drift check passed. Final-head full suite remains assigned to CI.
- Checkpoint verification revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification seal: 1b65113db2900fd93f740f767b04410fed297d1f2831def1e8b1c04bcf820fb0
- Relevant suite resolution: User-directed local set — this row's exact selector, the two spec-0013 integration files, the direct asset consumer test, root and package type checks, and emitted rule-code drift. The retired skill text is an asset with no static import graph; the final-head CI suite covers the package-wide fallback.

### TDD-0048

- TDD-ID: TDD-0048
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
- TC-ref: TC-0013-0036
- Boundary: `no-surface-reference-in-tree`
- EX-ref: EX-0013-0021; AC-ref: AC-0013-0028; BR-ref: BR-0013-0021
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: the shipped tree holds `catalog/worklog-entry.schema.md`, and the `/qfai-implement` and `/qfai-sdd` skills name `.qfai/steering/`. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Unit: every file under `packages/qfai/assets/init/.qfai/assistant/`, walked recursively.
  Read-proof (S1 D5): the walk includes `skills/qfai-sdd/SKILL.md` and
  `skills/qfai-implement/SKILL.md`.
- Oracle (S1 D11, absence): no file contains `.qfai/steering/` or
  `worklog-entry.schema.md` (case-sensitive).
- This row reads files other rows change: the `/qfai-implement` skill (spec-0011) and
  the shipped schema (spec-0004 `TDD-0068`, spec-0003 `TDD-0098`). Its GREEN is the tree
  after all of them.
- Expected RED, from reading the code before the run (the RED below matches it): `catalog/worklog-entry.schema.md`,
  `skills/qfai-implement/SKILL.md`, `skills/qfai-implement/references/execution-ledger.md`
  and `skills/qfai-sdd/SKILL.md`.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: this row's `it` body and the helpers it calls, as read at file hash
    `32f2b472…09ba66`, with the single selector entry above. `TDD-0046`'s
    fix changes the file hash. The resubmission must show this `it` unchanged,
    and I re-confirm it on the new hash before the RED runs.
  - Sufficiency: the whole of TC-0013-0036's fourth bullet. Every file under
    `packages/qfai/assets/init/.qfai/assistant/` is checked for
    `.qfai/steering/` and `worklog-entry.schema.md`. The read-proof names two
    files the walk must reach, which is stronger than the matrix note's
    "count above zero".
  - One boundary: `no-surface-reference-in-tree`.
  - Not scope: the tree includes the `/qfai-implement` skill, so this check
    contains spec-0011 `TDD-0023`'s token check, and its GREEN waits on the
    spec-0011 text and the schema withdrawal. That overlap is how the two
    TCs are written, and the user's decision that rows sharing a GREEN take
    their REDs first covers the order.
- Scope approval (`delivery-planner`), on file hash `b45c049e…4e2e2a`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:59:11Z
  - Covers: file hash `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`,
    at tree `working-tree+d388a371…afca`, and the single selector entry above, which is unchanged.
    No RED on this hash had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Re-confirmed: the `it` body reads as it did at `32f2b472…09ba66`. The only
    change in the file is `TDD-0046`'s one line, which this row does not use.
    The earlier PASS reasons hold.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round
  and, for this row, the tree after the spec-0011 skill-text GREEN and the schema withdrawal.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0048`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.

#### Round 1

- Round 1: RED revision: working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca
- Round 1: RED test hash: d27b6b92e0ed796f5826e95c5c923077619621b6882cd4c10291e492d28cd249
  (lstat-mode form `b45c049e5b34b4ca829c7b0d3ad1baeb0988fc4d7cc17e2866ccd969c64e2e2a`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it changes
  no test.)
- Round 1: RED result: exit 1; the approved RED, run at 2026-09-24T01:01:07.350Z after the scope
  PASS at 00:59:11Z. Before the run both spec-0013 file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`, with
  the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text,
  and nothing else writing to the tree. Exit 1; Test Files 1 failed (1); Tests 1 failed,
  the other `it`s of the file skipped by the filter.
  The read-proof passed: the walk includes both skill files. The failure is the assertion
  at line 130, inside the selector: seven hits in four files, `skills/qfai-sdd/SKILL.md`,
  `skills/qfai-implement/SKILL.md`, `skills/qfai-implement/references/execution-ledger.md`
  and `catalog/worklog-entry.schema.md`.
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 218ms
   → expected [ …(7) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
AssertionError: expected [ …(7) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "skills/qfai-sdd/SKILL.md: .qfai/steering/",
+   "skills/qfai-sdd/SKILL.md: worklog-entry.schema.md",
+   "skills/qfai-implement/SKILL.md: .qfai/steering/",
+   "skills/qfai-implement/SKILL.md: worklog-entry.schema.md",
+   "skills/qfai-implement/references/execution-ledger.md: .qfai/steering/",
+   "catalog/worklog-entry.schema.md: .qfai/steering/",
+   "catalog/worklog-entry.schema.md: worklog-entry.schema.md",
+ ]

 ❯ tests/integration/spec0013RecordHomes.test.ts:130:19
    128|       }
    129|     }
    130|     expect(found).toEqual([]);
       |                   ^
    131|   });
    132| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  10:01:13
   Duration  806ms (transform 79ms, setup 81ms, import 36ms, tests 220ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised as
  below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed. The
  test was restored at once: it compared byte-equal to the copy taken before the strip, the
  file hash recomputed to the approved value, and the tree address returned to the RED
  revision.

```diff
@@ -113,12 +113,10 @@ describe("TC-0013-0036: records go to the spec pack", () => {
   it("TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md", async () => {
     const files = await walk(ASSISTANT_DIR);

-    expect(
-      ["skills/qfai-sdd/SKILL.md", "skills/qfai-implement/SKILL.md"].filter(
+    void [["skills/qfai-sdd/SKILL.md", "skills/qfai-implement/SKILL.md"].filter(
         (name) => !files.some((entry) => entry.name === name),
       ),
-      "the walk read the shipped assistant tree",
-    ).toEqual([]);
+      "the walk read the shipped assistant tree", [], expect];

     const found: string[] = [];
     for (const { file, name } of files) {
@@ -127,6 +125,6 @@ describe("TC-0013-0036: records go to the spec pack", () => {
         if (text.includes(token)) found.push(`${name}: ${token}`);
       }
     }
-    expect(found).toEqual([]);
+    void [found, [], expect];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 635ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:02:15
   Duration  1.59s (transform 162ms, setup 203ms, import 44ms, tests 638ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
  1. Re-insert a `.qfai/steering/<id>.md` sentence into one file of the `/qfai-sdd` skill.
     The selector must fail on `found`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The walk read-proof passed (both skill files reached). The failure is the assertion at line 130 inside the selector: seven hits in `skills/qfai-sdd/SKILL.md`, `skills/qfai-implement/SKILL.md`, `skills/qfai-implement/references/execution-ledger.md` and `catalog/worklog-entry.schema.md`. That is the predicate.
  - Scope against TC-0013-0036 (`no-surface-reference-in-tree`): both tokens over every file of the shipped assistant tree. Nothing else is asserted.
  - Ordering: the GREEN for this row is the tree after the spec-0011 skill-text GREEN, the spec-0013 skill-text GREEN and the schema withdrawal, as recorded. That follows the S2 user decision. At the build gate, the GREEN run must be on the tree where all three have landed, and must name them.
  - Oracle proof plan: re-insert a `.qfai/steering/<id>.md` sentence into the `/qfai-sdd` skill, the `Owning module`. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 616ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`; Result: exit 1, assertion failed inside selector `TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted `.qfai/steering/<id>.md` into the `SKILL.md` record sentence; the result named `skills/qfai-sdd/SKILL.md: .qfai/steering/` at `spec0013RecordHomes.test.ts:130:19`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0036: records go to the spec pack > TC-0013-0036: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "skills/qfai-sdd/SKILL.md: .qfai/steering/",
+ ]

 ❯ tests/integration/spec0013RecordHomes.test.ts:130:19
    128|       }
    129|     }
    130|     expect(found).toEqual([]);
       |                   ^
    131|   });
    132| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 16 passed (16). The named selector passed. No further source edit was needed.
- Refactor verify revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Build-phase qa-gatekeeper: PASS for this row's GREEN and Oracle proof at working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.
- Ledger write: todo -> red at 2026-09-24T12:37:24.740Z; red -> green at 2026-09-24T13:08:38.272Z; green -> refactor at 2026-09-24T13:16:51.990Z. The green write followed the build-phase qa-gatekeeper PASS.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924131612881 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 778935ea262fcae2247daefd121bb209aa393e91912ca31eec10f75f3714f178
- Spec review: PASS
- Spec reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Spec audited evidence hash: 9d4728f2e1d2e8ac9202e2c56397a7ce11207f1e942e0e65600d3ba5e9946d8c
- Spec review pack: .qfai/review/review-20260924131612881 <!-- qfai:not-a-citation -->
- Spec review pack seal: 778935ea262fcae2247daefd121bb209aa393e91912ca31eec10f75f3714f178
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Code quality audited evidence hash: 9d4728f2e1d2e8ac9202e2c56397a7ce11207f1e942e0e65600d3ba5e9946d8c
- Code quality review pack: .qfai/review/review-20260924131612881 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 778935ea262fcae2247daefd121bb209aa393e91912ca31eec10f75f3714f178
- Spec record re-attestation: c97d9e677261538ab77d73f9f1b85bb834133998729832525d532445b6f2824b
- Spec record re-attestation pack: .qfai/review/review-20260924172221050 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: ca37cbff09bddf03f0a5b039ee784287ada054c506cd16ca17f2167dbba66dee
- Code quality record re-attestation: c97d9e677261538ab77d73f9f1b85bb834133998729832525d532445b6f2824b
- Code quality record re-attestation pack: .qfai/review/review-20260924172221050 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: ca37cbff09bddf03f0a5b039ee784287ada054c506cd16ca17f2167dbba66dee
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 3 passed (3); Tests 16 passed (16); root and package type checks passed; emitted rule-code drift check passed. Final-head full suite remains assigned to CI.
- Checkpoint verification revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification seal: 1b65113db2900fd93f740f767b04410fed297d1f2831def1e8b1c04bcf820fb0
- Relevant suite resolution: User-directed local set — this row's exact selector, the two spec-0013 integration files, the direct asset consumer test, root and package type checks, and emitted rule-code drift. The retired skill text is an asset with no static import graph; the final-head CI suite covers the package-wide fallback.

### TDD-0045

- TDD-ID: TDD-0045
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Selector: TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
- TC-ref: TC-0013-0037
- Boundary: `stop-steps-stated`
- EX-ref: EX-0013-0022; AC-ref: AC-0013-0029; BR-ref: BR-0013-0022
- Branch: observed-red (branch 1), confirmed by the fresh RED below. The superseded RED is kept
  after it as history. The surface exists and states the predicate wrongly: the three files each tie the stop to a `consultation-needed` work-log entry, and the playbook and the triage step do not state all three steps. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Units, each found exactly once (S1 D5): `SKILL.md` ``### `--auto` and approval-required
  rows``; the bullet "- Triage rows requiring approval but lacking `Approved By`" of
  `references/sdd-execution-playbook.md`, up to the next top-level bullet; and step
  `7. **Stop.**` of `references/sdd-triage.md`, up to the next numbered step.
- Oracle (S1 D11, presence), with backticks and emphasis removed and each run of whitespace,
  line breaks included, read as one space, over all three files at once. `missing` must be empty. Each unit states:
  - `Approved By as -`;
  - "do not enter Phase 0", case-insensitively;
  - "report", then "every unapproved row", then "Operation" and "target", within one
    sentence.
- Expected RED, from reading the code before the run (the RED below matches it): `SKILL.md` lacks the report step
  (it names the rows for the entry, then reports the rerun); the playbook lacks "do not
  enter Phase 0" and the report step; the triage step names "each" unapproved row for the
  entry, not a report of every one.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: fresh RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: file hash `ab739c98a873d2a48ecfc9398d8c2bf22d742b42a343678ee3521b3004962dfd`, at tree `working-tree+2d31f83a…c37d55`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Sufficiency: the whole of TC-0013-0037's first bullet, asserted over all
    three files at once as the TC requires. Each file's unit is the one
    AC-0013-0029 names: the `SKILL.md` section, the playbook's
    missing-approval bullet, and triage step 7. Each unit must state all
    three steps, and every miss is collected into one `toEqual`.
  - One boundary: `stop-steps-stated`. The work-log absence belongs to
    `TDD-0049`.
  - Finding each unit exactly once is a legitimate read-proof.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0045`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.
- Scope approval (`delivery-planner`), on file hash `c7517a90…1249df`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:59:11Z
  - Covers: file hash `c7517a90b1b3b2a2f9a152c04211d171233a3e38a7960007938297a58f1249df`,
    at tree `working-tree+d388a371…afca`, and the single selector entry above, which is unchanged.
    No RED on this hash had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Reason: the only change is that each stop unit is read with every run of
    whitespace, line breaks included, as one space before the unchanged step
    patterns run. That changes how a statement is read, not which statement is
    required. The three steps, the three units and the all-files-at-once shape
    are the same, so the obligation is neither widened nor narrowed.
  - It repairs a false negative. A step that the playbook states but wraps
    across a line break is now found. Without the fix, the row failed on
    wording that satisfies the TC, and that failure would have been attributed
    to the predicate. The `report … every unapproved row … Operation … target`
    pattern is still bounded by `[^.]`, so it cannot run into the next
    sentence.
  - The superseded RED was taken on the earlier hash, which the earlier PASS
    covered. It stays on record as superseded, and it cannot stand for this
    hash. A fresh RED and stripped run on this hash are owed.

#### Round 1

- Round 1: RED revision: working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca
- Round 1: RED test hash: f54f462a71cd9b41b2aaf2dea9141a207769b2a629ce4e31eac6f47b0e28ce37
  (lstat-mode form `c7517a90b1b3b2a2f9a152c04211d171233a3e38a7960007938297a58f1249df`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it changes
  no test.)
- Round 1: RED result: exit 1; the fresh approved RED, run at 2026-09-24T01:01:15.709Z after the scope
  PASS at 00:59:11Z. Before the run both spec-0013 file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`, with
  the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text,
  and nothing else writing to the tree. Exit 1; Test Files 1 failed (1); Tests 1 failed,
  the other `it`s of the file skipped by the filter.
  The read-proof passed: each file's stop unit is found once. The failure is the assertion
  at line 111, inside the selector: four steps are missing, the report step in all three
  files and "do not enter Phase 0" in the playbook. The playbook's "keep `Approved By` as
  `-`", wrapped across two lines, is now read as stated: the false negative the superseded
  RED recorded is gone.
  Vitest's report follows verbatim.

```text
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps 26ms
   → expected [ …(4) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
AssertionError: expected [ …(4) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: report every unapproved row with its Operation and target",
+   "references/sdd-execution-playbook.md: do not enter Phase 0",
+   "references/sdd-execution-playbook.md: report every unapproved row with its Operation and target",
+   "references/sdd-triage.md: report every unapproved row with its Operation and target",
+ ]

 ❯ tests/integration/spec0013ApprovalStop.test.ts:111:21
    109|       );
    110|     });
    111|     expect(missing).toEqual([]);
       |                     ^
    112|   });
    113|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
   Start at  10:01:21
   Duration  575ms (transform 77ms, setup 77ms, import 37ms, tests 27ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised as
  below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed. The
  test was restored at once: it compared byte-equal to the copy taken before the strip, the
  file hash recomputed to the approved value, and the tree address returned to the RED
  revision.

```diff
@@ -97,10 +97,8 @@ describe("TC-0013-0037: approval stop writes no entry", () => {
   it("TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps", async () => {
     const units = await readStopUnits();

-    expect(
-      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
-      "each file's stop unit is found exactly once",
-    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));
+    void [units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
+      "each file's stop unit is found exactly once", STOP_UNITS.map(({ name }) => `${name}: 1`), expect];

     const missing = units.flatMap(({ name, unit }) => {
       const plain = unit.text.replace(/[`*]/g, "").replace(/\s+/g, " ");
@@ -108,7 +106,7 @@ describe("TC-0013-0037: approval stop writes no entry", () => {
         ([step]) => `${name}: ${step}`,
       );
     });
-    expect(missing).toEqual([]);
+    void [missing, [], expect];
   });

   it("TC-0013-0037: none of the three files names a work-log entry or consultation-needed", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps 24ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  10:02:25
   Duration  693ms (transform 76ms, setup 74ms, import 40ms, tests 26ms, environment 0ms)
exit=0
```

**Superseded RED (the oracle changed after it: each run of whitespace in a stop unit is now read as one space. A fresh RED and stripped run on the revised file follow the new scope approval.)**
- Tree: working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55
- Test content hash: ab739c98a873d2a48ecfc9398d8c2bf22d742b42a343678ee3521b3004962dfd
- Test manifest:
  - packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Result: the approved RED, run at 2026-09-24T00:51:19.581Z after the scope
  PASS. Before the run the file hash recomputed to the approved value, and the tree
  address was taken twice with equal results; HEAD `536fc4ddd`, with the uncommitted
  GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text, and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the file
  skipped by the filter.
  The read-proof passed: each file's stop unit is found once. The failure is the assertion
  at line 108, inside the selector: `missing` holds five items, the report step in all
  three files, "do not enter Phase 0" in the playbook, and "leave Approved By as -" in the
  playbook.
  Vitest's report follows verbatim.

```text
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps 11ms
   → expected [ …(5) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
AssertionError: expected [ …(5) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: report every unapproved row with its Operation and target",
+   "references/sdd-execution-playbook.md: leave Approved By as -",
+   "references/sdd-execution-playbook.md: do not enter Phase 0",
+   "references/sdd-execution-playbook.md: report every unapproved row with its Operation and target",
+   "references/sdd-triage.md: report every unapproved row with its Operation and target",
+ ]

 ❯ tests/integration/spec0013ApprovalStop.test.ts:108:21
    106|       );
    107|     });
    108|     expect(missing).toEqual([]);
       |                     ^
    109|   });
    110|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
   Start at  09:51:21
   Duration  355ms (transform 67ms, setup 66ms, import 30ms, tests 13ms, environment 0ms)
```

- One of the five items is a false negative of the oracle, not a missing step. The
  playbook states the step as "keep `Approved By` as" and wraps before "`-`", so its unit
  holds `Approved By as` then a line break then `-`, and the pattern `Approved By as -`
  does not allow a line break there. The other four items are steps the text does not
  state. The RED stays admissible: it is an assertion inside the selector, and the
  predicate it names is the row's own. The oracle is not changed here, since that would
  void the scope approval. A GREEN that states the step correctly but wraps it the same
  way would still fail. Treating a line break as a space in the unit text would remove
  that, and needs a new scope approval before the GREEN.
- Failure mode: assertion
- Stripped run: both assertions of this row's `it` neutralised
  as below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed.
  The test was restored at once: it compared byte-equal to the copy taken before the
  strip, the file hash recomputed to the approved value, and the tree address returned to
  the RED revision.

```diff
@@ -94,10 +94,8 @@ describe("TC-0013-0037: approval stop writes no entry", () => {
   it("TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps", async () => {
     const units = await readStopUnits();

-    expect(
-      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
-      "each file's stop unit is found exactly once",
-    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));
+    void [units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
+      "each file's stop unit is found exactly once", STOP_UNITS.map(({ name }) => `${name}: 1`), expect];

     const missing = units.flatMap(({ name, unit }) => {
       const plain = unit.text.replace(/[`*]/g, "");
@@ -105,7 +103,7 @@ describe("TC-0013-0037: approval stop writes no entry", () => {
         ([step]) => `${name}: ${step}`,
       );
     });
-    expect(missing).toEqual([]);
+    void [missing, [], expect];
   });

   it("TC-0013-0037: none of the three files names a work-log entry or consultation-needed", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps 10ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  09:52:50
   Duration  631ms (transform 95ms, setup 89ms, import 49ms, tests 12ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
  1. Remove "do not enter Phase 0" from one of the three units. The selector must fail on
     `missing`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `c7517a90…1249df`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `c7517a90…1249df`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The read-proof passed (each stop unit found once). The failure is the assertion at line 111 inside the selector: the report step in all three files and the phrase do not enter Phase 0 in the playbook. That is the predicate. The wrapped `Approved By as -` step is now read as stated, so the false negative the superseded RED recorded is gone.
  - Superseded RED: kept under a plain label with non-round keys, which is the right placement. It was taken on the earlier hash, which the earlier PASS covered, and it does not stand for this hash. The oracle change between the two runs only removes a false negative, so it does not reshape the oracle to force a failure.
  - Scope against TC-0013-0037 (`stop-steps-stated`) / EX-0013-0022 / AC-0013-0029 / BR-0013-0022: three steps over three units at once. Nothing else is asserted.
  - Oracle proof plan: remove the phrase do not enter Phase 0 from one unit. It names the GREEN command. Acceptable. The plan sits after the superseded block and is the live plan for this round.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps 24ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`; Result: exit 1, assertion failed inside selector `TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Removed `do not enter Phase 0` from the `SKILL.md` stop; the result named `SKILL.md: do not enter Phase 0` at `spec0013ApprovalStop.test.ts:111:21`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
AssertionError: expected [ 'SKILL.md: do not enter Phase 0' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: do not enter Phase 0",
+ ]

 ❯ tests/integration/spec0013ApprovalStop.test.ts:111:21
    109|       );
    110|     });
    111|     expect(missing).toEqual([]);
       |                     ^
    112|   });
    113|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 16 passed (16). The named selector passed. No further source edit was needed.
- Refactor verify revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Build-phase qa-gatekeeper: PASS for this row's GREEN and Oracle proof at working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.
- Ledger write: todo -> red at 2026-09-24T12:37:01.272Z; red -> green at 2026-09-24T13:08:24.275Z; green -> refactor at 2026-09-24T13:16:44.616Z. The green write followed the build-phase qa-gatekeeper PASS.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924131612878 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: ab19a199352527af17297881c6f9827dae0360903f44c140f04ab75c05a65ea3
- Spec review: PASS
- Spec reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Spec audited evidence hash: 18dc8a547a43316c5203cf8eb8c1801a38bc1d9722f504d35cff6ca6223a5bf3
- Spec review pack: .qfai/review/review-20260924131612878 <!-- qfai:not-a-citation -->
- Spec review pack seal: ab19a199352527af17297881c6f9827dae0360903f44c140f04ab75c05a65ea3
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Code quality audited evidence hash: 18dc8a547a43316c5203cf8eb8c1801a38bc1d9722f504d35cff6ca6223a5bf3
- Code quality review pack: .qfai/review/review-20260924131612878 <!-- qfai:not-a-citation -->
- Code quality review pack seal: ab19a199352527af17297881c6f9827dae0360903f44c140f04ab75c05a65ea3
- Spec record re-attestation: 1a4021d1381e34a8c9e5d54664c6b8676b723c8fc3d2c3f92072d347ec4c7a9c
- Spec record re-attestation pack: .qfai/review/review-20260924172220877 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: a199ca32641a50a6c3ce49d62c2301148bd6ed305ab9787a9da8577d3acc367a
- Code quality record re-attestation: 1a4021d1381e34a8c9e5d54664c6b8676b723c8fc3d2c3f92072d347ec4c7a9c
- Code quality record re-attestation pack: .qfai/review/review-20260924172220877 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: a199ca32641a50a6c3ce49d62c2301148bd6ed305ab9787a9da8577d3acc367a
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 3 passed (3); Tests 16 passed (16); root and package type checks passed; emitted rule-code drift check passed. Final-head full suite remains assigned to CI.
- Checkpoint verification revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification seal: 1b65113db2900fd93f740f767b04410fed297d1f2831def1e8b1c04bcf820fb0
- Relevant suite resolution: User-directed local set — this row's exact selector, the two spec-0013 integration files, the direct asset consumer test, root and package type checks, and emitted rule-code drift. The retired skill text is an asset with no static import graph; the final-head CI suite covers the package-wide fallback.

### TDD-0049

- TDD-ID: TDD-0049
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Selector: TC-0013-0037: none of the three files names a work-log entry or consultation-needed
- TC-ref: TC-0013-0037
- Boundary: `no-worklog-entry-named`
- EX-ref: EX-0013-0022; AC-ref: AC-0013-0029; BR-ref: BR-0013-0022
- Branch: observed-red (branch 1), confirmed by the fresh RED below. The superseded RED is kept
  after it as history. The surface exists and states the predicate wrongly: all three files name a `consultation-needed` work-log entry. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Read-proof (S1 D5): each file's stop unit, as in `TDD-0045`, is found exactly once.
- Oracle (S1 D11, absence), over each whole file: no match of "work-log"
  case-insensitively, and no `consultation-needed` (case-sensitive).
- Expected RED, from reading the code before the run (the RED below matches it): all three files, both tokens.
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the pattern matches no other `it` in the file.
- Status: fresh RED and its stripped run recorded under `#### Round 1`, on the file hash the
  scope PASS below approved. `qa-gatekeeper` (routing phase `red`) passed it. Ready for handover.
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:48:34Z
  - Covers: file hash `ab739c98a873d2a48ecfc9398d8c2bf22d742b42a343678ee3521b3004962dfd`, at tree `working-tree+2d31f83a…c37d55`, and the single selector entry
    above. No RED had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Sufficiency: the TC says "none of the three files contains", so the whole
    of each file is scanned, not only its stop unit. That is correct. The
    tokens follow S1 D11: `work-log` case-insensitive, `consultation-needed`
    case-sensitive.
  - One boundary: `no-worklog-entry-named`. The unit-once read-proof shows
    each file was read.
  - Advisory, not scope: `SKILL.md` is one of the three files, so any
    `## Work-log entries` heading also fails this row. `TDD-0046` has no
    failure this row does not share. That overlap is in how TC-0013-0036 and
    TC-0013-0037 are written. Removing it would take a Change Request to
    `/qfai-sdd`, not a re-scope here.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0049`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - The RED pair, `Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`,
    `Round 1: RED revision`, and `Round 1: RED test hash` with its manifest are under
    `#### Round 1`, with the `Oracle proof` plan and its GREEN command.
  - The `qa-gatekeeper` PASS (RED phase) is the row-level line above.
  - No production file is changed by this stage.
- Scope approval (`delivery-planner`), on file hash `c7517a90…1249df`:
  - Approver: `delivery-planner`, instance `atdd-scope`
  - Verdict: PASS
  - Time: 2026-09-24T00:59:11Z
  - Covers: file hash `c7517a90b1b3b2a2f9a152c04211d171233a3e38a7960007938297a58f1249df`,
    at tree `working-tree+d388a371…afca`, and the single selector entry above, which is unchanged.
    No RED on this hash had been run. If the test file, a manifest entry or the
    selector changes, this approval lapses.
  - Re-confirmed: the `it` body reads as it did at `ab739c98…962dfd`. It scans
    whole files and never reads the normalised unit text, so `TDD-0045`'s
    change does not reach it. The earlier PASS reasons hold, and a fresh RED on
    this hash is owed.

#### Round 1

- Round 1: RED revision: working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca
- Round 1: RED test hash: f54f462a71cd9b41b2aaf2dea9141a207769b2a629ce4e31eac6f47b0e28ce37
  (lstat-mode form `c7517a90b1b3b2a2f9a152c04211d171233a3e38a7960007938297a58f1249df`; same bytes as approved)
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it changes
  no test.)
- Round 1: RED result: exit 1; the fresh approved RED, run at 2026-09-24T01:01:22.195Z after the scope
  PASS at 00:59:11Z. Before the run both spec-0013 file hashes recomputed to the approved
  values, and the tree address was taken twice with equal results; HEAD `536fc4ddd`, with
  the uncommitted GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text,
  and nothing else writing to the tree. Exit 1; Test Files 1 failed (1); Tests 1 failed,
  the other `it`s of the file skipped by the filter.
  The read-proof passed: each file's stop unit is found once. The failure is the assertion
  at line 126, inside the selector: all three files match "work-log" and contain
  `consultation-needed`, as in the superseded RED.
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed 29ms
   → expected [ 'SKILL.md: work-log', …(5) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed
AssertionError: expected [ 'SKILL.md: work-log', …(5) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: work-log",
+   "SKILL.md: consultation-needed",
+   "references/sdd-execution-playbook.md: work-log",
+   "references/sdd-execution-playbook.md: consultation-needed",
+   "references/sdd-triage.md: work-log",
+   "references/sdd-triage.md: consultation-needed",
+ ]

 ❯ tests/integration/spec0013ApprovalStop.test.ts:126:19
    124|       ...(text.includes("consultation-needed") ? [`${name}: consultati…
    125|     ]);
    126|     expect(found).toEqual([]);
       |                   ^
    127|   });
    128| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
   Start at  10:01:27
   Duration  746ms (transform 78ms, setup 78ms, import 36ms, tests 30ms, environment 0ms)
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of this row's `it` neutralised as
  below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed. The
  test was restored at once: it compared byte-equal to the copy taken before the strip, the
  file hash recomputed to the approved value, and the tree address returned to the RED
  revision.

```diff
@@ -114,15 +114,13 @@ describe("TC-0013-0037: approval stop writes no entry", () => {
   it("TC-0013-0037: none of the three files names a work-log entry or consultation-needed", async () => {
     const units = await readStopUnits();

-    expect(
-      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
-      "each file's stop unit is found exactly once",
-    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));
+    void [units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
+      "each file's stop unit is found exactly once", STOP_UNITS.map(({ name }) => `${name}: 1`), expect];

     const found = units.flatMap(({ name, text }) => [
       ...(/work-log/i.test(text) ? [`${name}: work-log`] : []),
       ...(text.includes("consultation-needed") ? [`${name}: consultation-needed`] : []),
     ]);
-    expect(found).toEqual([]);
+    void [found, [], expect];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed 24ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  10:02:33
   Duration  644ms (transform 82ms, setup 82ms, import 38ms, tests 25ms, environment 0ms)
exit=0
```

**Superseded RED (the oracle changed after it: the file it shares with `TDD-0045` was revised, so its hash moved; this `it` is unchanged. A fresh RED and stripped run on the revised file follow the new scope approval.)**
- Tree: working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55
- Test content hash: ab739c98a873d2a48ecfc9398d8c2bf22d742b42a343678ee3521b3004962dfd
- Test manifest:
  - packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"`
  (`--reporter=verbose` makes the runner name the selected test on a pass too; it
  changes no test.)
- Result: the approved RED, run at 2026-09-24T00:51:22.150Z after the scope
  PASS. Before the run the file hash recomputed to the approved value, and the tree
  address was taken twice with equal results; HEAD `536fc4ddd`, with the uncommitted
  GREENs of spec-0004 `TDD-0069` and `TDD-0071`, which touch no skill text, and no
  mutation. Exit 1; Test Files 1 failed (1); Tests 1 failed, the other `it`s of the file
  skipped by the filter.
  The read-proof passed: each file's stop unit is found once. The failure is the assertion
  at line 123, inside the selector: all three files match "work-log" and contain
  `consultation-needed`.
  Vitest's report follows verbatim.

```text
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed 12ms
   → expected [ 'SKILL.md: work-log', …(5) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed
AssertionError: expected [ 'SKILL.md: work-log', …(5) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: work-log",
+   "SKILL.md: consultation-needed",
+   "references/sdd-execution-playbook.md: work-log",
+   "references/sdd-execution-playbook.md: consultation-needed",
+   "references/sdd-triage.md: work-log",
+   "references/sdd-triage.md: consultation-needed",
+ ]

 ❯ tests/integration/spec0013ApprovalStop.test.ts:123:19
    121|       ...(text.includes("consultation-needed") ? [`${name}: consultati…
    122|     ]);
    123|     expect(found).toEqual([]);
       |                   ^
    124|   });
    125| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 skipped (2)
   Start at  09:51:24
   Duration  354ms (transform 68ms, setup 69ms, import 30ms, tests 13ms, environment 0ms)
```

- Failure mode: assertion
- Stripped run: both assertions of this row's `it` neutralised
  as below, their operands kept, and no other `it` touched. The RED command was re-run
  unchanged, exit 0, and the verbose reporter shows this selector executed and passed.
  The test was restored at once: it compared byte-equal to the copy taken before the
  strip, the file hash recomputed to the approved value, and the tree address returned to
  the RED revision.

```diff
@@ -111,15 +111,13 @@ describe("TC-0013-0037: approval stop writes no entry", () => {
   it("TC-0013-0037: none of the three files names a work-log entry or consultation-needed", async () => {
     const units = await readStopUnits();

-    expect(
-      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
-      "each file's stop unit is found exactly once",
-    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));
+    void [units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
+      "each file's stop unit is found exactly once", STOP_UNITS.map(({ name }) => `${name}: 1`), expect];

     const found = units.flatMap(({ name, text }) => [
       ...(/work-log/i.test(text) ? [`${name}: work-log`] : []),
       ...(text.includes("consultation-needed") ? [`${name}: consultation-needed`] : []),
     ]);
-    expect(found).toEqual([]);
+    void [found, [], expect];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed 6ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  09:52:55
   Duration  484ms (transform 77ms, setup 80ms, import 38ms, tests 8ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"`
  1. Re-insert `consultation-needed` in one of the three files. The selector must fail.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `c7517a90…1249df`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `c7517a90…1249df`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The read-proof passed. The failure is the assertion at line 126 inside the selector: `work-log` and `consultation-needed` in each of the three files. That is the predicate.
  - Superseded RED: kept as history. It does not stand for the current hash, and the fresh RED on the current hash is the one judged here.
  - Scope against TC-0013-0037 (`no-worklog-entry-named`): whole-file absence per S1 D11. Nothing else is asserted. The overlap with TDD-0046 is how the TCs are written, as the scope approval notes.
  - Oracle proof plan: as recorded in this section. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed 12ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"`; Result: exit 1, assertion failed inside selector `TC-0013-0037: none of the three files names a work-log entry or consultation-needed`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `82170e4164cfef2820ed107fca00608ccc0b9aa33e52835c69325a7a1d1954cf`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted a `consultation-needed` work-log entry into the playbook stop; the result named both `work-log` and `consultation-needed` in `references/sdd-execution-playbook.md` at `spec0013ApprovalStop.test.ts:126:19`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0037: none of the three files names a work-log entry or consultation-needed"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0037: approval stop writes no entry > TC-0013-0037: none of the three files names a work-log entry or consultation-needed
AssertionError: expected [ …(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "references/sdd-execution-playbook.md: work-log",
+   "references/sdd-execution-playbook.md: consultation-needed",
+ ]

 ❯ tests/integration/spec0013ApprovalStop.test.ts:126:19
    124|       ...(text.includes("consultation-needed") ? [`${name}: consultati…
    125|     ]);
    126|     expect(found).toEqual([]);
       |                   ^
    127|   });
    128| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

- Refactor verify command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose`
- Refactor verify result: exit 0; Test Files 3 passed (3); Tests 16 passed (16). The named selector passed. No further source edit was needed.
- Refactor verify revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Build-phase qa-gatekeeper: PASS for this row's GREEN and Oracle proof at working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.
- Ledger write: todo -> red at 2026-09-24T12:37:32.421Z; red -> green at 2026-09-24T13:08:42.648Z; green -> refactor at 2026-09-24T13:16:54.217Z. The green write followed the build-phase qa-gatekeeper PASS.
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924131612882 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 52152e43d98b4c7362e0cceaba4d382047359249469a7292c889113a75406570
- Spec review: PASS
- Spec reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Spec audited evidence hash: 043460281b7d0503d9f2ad733f6efec1439bbce4810c44c1b350a2396f47fda4
- Spec review pack: .qfai/review/review-20260924131612882 <!-- qfai:not-a-citation -->
- Spec review pack seal: 52152e43d98b4c7362e0cceaba4d382047359249469a7292c889113a75406570
- Code quality review: PASS
- Code quality reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Code quality audited evidence hash: 043460281b7d0503d9f2ad733f6efec1439bbce4810c44c1b350a2396f47fda4
- Code quality review pack: .qfai/review/review-20260924131612882 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 52152e43d98b4c7362e0cceaba4d382047359249469a7292c889113a75406570
- Spec record re-attestation: eca62e968eb38e1b5101f36772ca9c8bad37fa0aca62c5b042b2d581e34db5ad
- Spec record re-attestation pack: .qfai/review/review-20260924172221208 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 718b6485b35b442d82126dbc1d7d1d490b317520f2489a5e7a13242f0f2ae65e
- Code quality record re-attestation: eca62e968eb38e1b5101f36772ca9c8bad37fa0aca62c5b042b2d581e34db5ad
- Code quality record re-attestation pack: .qfai/review/review-20260924172221208 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 718b6485b35b442d82126dbc1d7d1d490b317520f2489a5e7a13242f0f2ae65e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/assets/autoModeApprovalDegrade.test.ts tests/integration/spec0013RecordHomes.test.ts tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose; corepack pnpm check-types (root); cd packages/qfai && npm run -s check-types; cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
- Checkpoint verification result: PASS — Test Files 3 passed (3); Tests 16 passed (16); root and package type checks passed; emitted rule-code drift check passed. Final-head full suite remains assigned to CI.
- Checkpoint verification revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Checkpoint verification seal: 1b65113db2900fd93f740f767b04410fed297d1f2831def1e8b1c04bcf820fb0
- Relevant suite resolution: User-directed local set — this row's exact selector, the two spec-0013 integration files, the direct asset consumer test, root and package type checks, and emitted rule-code drift. The retired skill text is an asset with no static import graph; the final-head CI suite covers the package-wide fallback.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0013.md`.
Totals: ✅ 66 / ⚠️ 116 / ❌ 312, with 7 not applicable, across 501 scored cells —
441 matrix depth cells (49 rows × 9 columns) and 60 business rule cells
(20 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

For the /qfai-atdd run 2026-09-23T19:33:24.738Z: the rows this change adds are scored under
`## Update: the work-log removal` in the same file. Totals for the stage evidence after
that update: ✅ 73 / ⚠️ 118 / ❌ 312, `n/a` 22, across 525 scored cells.

## Work Orders Summary

| Role                | Task                                                     | Status (PASS/REVISE/PENDING) |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the forty-nine obligations and write the matrix    | PASS                         |
| completion-reviewer | Audit every claim this file makes against the repository | PENDING |

### /qfai-atdd run 2026-09-23T19:33:24.738Z

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
| 17 | acceptance-test-engineer | atdd-ate | TDD-0044 … TDD-0049 tests written | `spec-0013/03`…`06`; S1 D3-D5, D11 | `spec0013RecordHomes.test.ts`, `spec0013ApprovalStop.test.ts` (hashes in the row sections) | PASS |
| 18 | delivery-planner | atdd-scope | Scope approval TDD-0044 | `### TDD-0044`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0036 first bullet, AC-0013-0028; matrix row note | Scope PASS. Both routes with both alternatives. The two-statement co-location follows the matrix note. To be re-confirmed on the file's new hash | PASS |
| 19 | delivery-planner | atdd-scope | Scope approval TDD-0046 | `### TDD-0046`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0036 second bullet; S1 D11 | Scope REVISE. The exact-line match misses a `## Work-log entries …` heading with added text. S1 D11 settles a substring. Resubmit with `includes` | REVISE |
| 20 | delivery-planner | atdd-scope | Scope approval TDD-0047 | `### TDD-0047`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0036 third bullet; S1 D11 | Scope PASS. No `W-PENDING-PROMOTION` anywhere in `SKILL.md`, one boundary. To be re-confirmed on the file's new hash | PASS |
| 21 | delivery-planner | atdd-scope | Scope approval TDD-0048 | `### TDD-0048`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0036 fourth bullet, AC-0013-0028 whole-tree clause | Scope PASS. The whole shipped assistant tree, with a two-file read-proof, one boundary. To be re-confirmed on the file's new hash | PASS |
| 22 | delivery-planner | atdd-scope | Scope approval TDD-0045 | `### TDD-0045`; `spec0013ApprovalStop.test.ts` (hash `ab739c98…962dfd`); TC-0013-0037 first bullet, AC-0013-0029 | Scope PASS. Three steps in each of the three named units, over all files at once, one boundary | PASS |
| 23 | delivery-planner | atdd-scope | Scope approval TDD-0049 | `### TDD-0049`; `spec0013ApprovalStop.test.ts` (hash `ab739c98…962dfd`); TC-0013-0037 second bullet; S1 D11 | Scope PASS. Whole-file scan of the three files, as the TC says. Advisory: it subsumes `TDD-0046`, which is how the TCs are written | PASS |
| 24 | acceptance-test-engineer | atdd-ate | TDD-0045 RED | `### TDD-0045`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `ab739c98…962dfd`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0045` Round 1 | PASS |
| 25 | acceptance-test-engineer | atdd-ate | TDD-0049 RED | `### TDD-0049`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `ab739c98…962dfd`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0049` Round 1 | PASS |
| 26 | delivery-planner | atdd-scope | Scope approval TDD-0044 (resubmission) | `### TDD-0044`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged; the only change in the file is `TDD-0046`'s line | PASS |
| 27 | delivery-planner | atdd-scope | Scope approval TDD-0046 (resubmission) | `### TDD-0046`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS. The heading check is `includes("## Work-log entries")`, the S1 D11 substring | PASS |
| 28 | delivery-planner | atdd-scope | Scope approval TDD-0047 (resubmission) | `### TDD-0047`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged | PASS |
| 29 | delivery-planner | atdd-scope | Scope approval TDD-0048 (resubmission) | `### TDD-0048`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged | PASS |
| 30 | delivery-planner | atdd-scope | Scope approval TDD-0045 (resubmission) | `### TDD-0045`; `spec0013ApprovalStop.test.ts` (hash `c7517a90…1249df`); tree `working-tree+d388a371…afca` | Scope PASS. Collapsing whitespace before the unchanged step patterns fixes a false negative on a wrapped step. The obligation is unchanged. The earlier RED is superseded, and a fresh RED is owed | PASS |
| 31 | delivery-planner | atdd-scope | Scope approval TDD-0049 (resubmission) | `### TDD-0049`; `spec0013ApprovalStop.test.ts` (hash `c7517a90…1249df`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged, and the whole-file scan is not touched by the normalisation. A fresh RED is owed | PASS |
| 32 | acceptance-test-engineer | atdd-ate | TDD-0044 RED | `### TDD-0044`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0044` Round 1 | PASS |
| 33 | acceptance-test-engineer | atdd-ate | TDD-0046 RED | `### TDD-0046`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0046` Round 1 | PASS |
| 34 | acceptance-test-engineer | atdd-ate | TDD-0047 RED | `### TDD-0047`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0047` Round 1 | PASS |
| 35 | acceptance-test-engineer | atdd-ate | TDD-0048 RED | `### TDD-0048`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0048` Round 1 | PASS |
| 36 | acceptance-test-engineer | atdd-ate | TDD-0045 fresh RED | `### TDD-0045`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `c7517a90…1249df`) | fresh approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0045` Round 1 | PASS |
| 37 | acceptance-test-engineer | atdd-ate | TDD-0049 fresh RED | `### TDD-0049`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `c7517a90…1249df`) | fresh approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0049` Round 1 | PASS |
| 38 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0044 | `### TDD-0044` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 88: neither statement present (`decision` and `consultationOrDiscovery` false), after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 39 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0046 | `### TDD-0046` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 99: the `## Work-log entries` heading and its cross-reference, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 40 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0047 | `### TDD-0047` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 110: the carry-over line citing a `W-PENDING-PROMOTION` decision, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 41 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0048 | `### TDD-0048` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 130: seven hits in four files including the schema asset, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 42 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0045 | `### TDD-0045` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013ApprovalStop.test.ts` | PASS: RED reproduced at line 111: four stop steps missing across the three files, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 43 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0049 | `### TDD-0049` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013ApprovalStop.test.ts` | PASS: RED reproduced at line 126: `work-log` and `consultation-needed` in all three files, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |


### /qfai-implement — run started 2026-09-24T12:34:21.949Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | backend-engineer | spec0013-griller | grilling(S1@2026-09-24T12:34:21.949Z/agents): place decisions and consultations in existing spec or Change Request homes | AC-0013-0028; TC-0013-0036; shipped `qfai-sdd/SKILL.md` | S1 D1: add one short paragraph in Mandatory Outputs; reject a separate section | PASS |
| 2 | backend-engineer | spec0013-griller | grilling(S1@2026-09-24T12:34:21.949Z/agents): retain the three approval stop sites and their existing gates | AC-0013-0029; TC-0013-0037; shipped skill and two references | S1 D2: edit each existing stop and update the old assertion test; reject a new shared section | PASS |
| 3 | backend-engineer | spec0013-impl | TDD-0044..TDD-0049 GREEN and Oracle proof | six ATDD RED entries; shipped skill and references | The six row sections above; 16 restored GREEN tests, seven assertion-failing Oracle runs, byte-equal restoration | PASS |

## Cross-spec obligations

None.

## Reviewer response

- Role: completion-reviewer
- Status: PASS
- Reviewed revision: c751cb050caa9e78a1ff5e622fc5abd738d126c2
- Review series: .qfai/evidence/coverage-depth-spec-0013.md + completion-reviewer
- Rounds: 1 `REVISE`, 2 `REVISE`, 2b `PASS`. The budget is spent.
- Scope: the revision named above. The tree has moved since, so the verdict does
  not cover it, and no round remains to take one.
- Subject: every claim this file makes, checked against the files it names
- Result: the four recorded rows reproduce their GREEN commands, their
  refactor-verify run and the checkpoint exactly as recorded, and **those four
  rows'** `Selector` values resolve to a real case — not every selector in the
  ledger, which the same reviewed artifact contradicts: its finding 6 reports
  six of the twenty-seven runnable selectors matching zero cases; the evidence-entry contract holds, with
  `QFAI-TDDLIST-008` and `-009` silent and `-007` / `-011` naming exactly the
  eight unbackfilled rows and no backfilled one; all eight gap reasons check
  out against the files they name; the validate gate reproduces at `error=0`,
  and fails on a missing matrix at the revision the mutations were taken at,
  which is why it is recorded over this tree; the matrix totals at that
  revision — ✅ 76 / ⚠️ 105 / ❌ 312 with `n/a` 8 across 501 cells — agree with
  the tables there, and every `❌` and `⚠️` cell carries exactly one
  justification, with no coordinate missing and none listed that does not carry
  the mark; and the four rows naming `auditProfile.ts` keep every mark when read
  against the eight sibling-pack cases that drive that entrypoint.
- What that verdict does not cover: the matrix has been rescored since, and the
  totals this file now restates are ✅ 66 / ⚠️ 116 / ❌ 312 with `n/a` 7. The
  entrypoint conclusion in the line above is among the claims withdrawn — the
  four rows no longer keep every mark, because the module each obligation names
  is reached by no case this pack owns. The gate is `PENDING` for that reason:
  the verdict stands for the revision it names, and no reviewer has read the
  current artifact.
- Residual risk: the five falsifiability mutations were re-applied at this tree
  and every kill count reproduced, but their recorded `Falsifiability revision`
  values cannot be. Each folds the tree state into a content address and the
  tree has moved, so what a reader reconstructs from the recorded edit is the
  same mutation over a different base. Separately, whether a cell deserves `⚠️` over `✅` is a
  judgement the arithmetic cannot settle: the totals and both censuses were
  verified mechanically, the individual scores by sampling.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

Eight of the pack's twelve `done` rows are not backfilled. Four name an
obligation the product states the opposite of, and one an obligation a sibling
in the same pack contradicts. The other three have a case that runs and no
oracle for what the row's own obligation names.

| Row        | Obligation     | What stops it                                                     |
| ---------- | -------------- | ----------------------------------------------------------------- |
| `TDD-0019` | `TC-0013-0025` | The obligation contradicts a sibling test case                    |
| `TDD-0021` | `TC-0013-0027` | Half the obligation is stated the other way round by the product  |
| `TDD-0022` | `US-0013-0011` | Its case drives `runValidate`, not the preflight the row promises |
| `TDD-0023` | `TC-0013-0028` | Ignoring the pointer entirely leaves the row's own case green     |
| `TDD-0025` | `TC-0013-0030` | The test drives a helper no production path calls                 |
| `TDD-0026` | `TC-0013-0031` | The obligation says `warning`; the validator emits `error`        |
| `TDD-0027` | `TC-0013-0032` | The count band the obligation states was removed from the product |
| `TDD-0028` | `TC-0013-0033` | The same band                                                     |

Three of the five rows whose `Selector` was examined keep a corrected one, so
the row names a case that can be run; `TDD-0023` and `TDD-0026` are unchanged.
All eight rows above keep their original `Evidence` cell, so none claims more
than it did before.

**`TC-0013-0025` cannot be satisfied as written.** It requires every `screens[]`
entry of the shipped template to carry a literal `primary_tasks: []`.
`TC-0013-0026`, in the same pack, requires the validate lane to fail at `error`
on exactly that value. A template shipping an empty list would hand the author a
contract that fails on first use, so the template ships filled entries and the
test asserts only that the key is present and is a list. The narrower assertion
is the right one; the obligation above it is the half that needs a Change
Request.

**`TC-0013-0027` has two halves and the product answers the second one the other
way.** The lane passing silently on a non-empty list is covered. Pre-existing
slot-less contracts, which the obligation calls informational and non-blocking,
are emitted at `error` past sunset — the covering case says so in its own title.

**`TC-0013-0030` names `/qfai-sdd`; the test names a helper.**
`populateSurfaceTypeIfUiCompanion` has no caller anywhere in `src`, and the
obligation's second half — that `resolveAllUiBearingSpecs()` still requires the
frontmatter as the strict signal — is not exercised at all.

**`TC-0013-0031` specifies `warning` during the deprecation window.**
`validateSurfaceTypeDrift` sets `error` with no window logic, and the covering
case asserts `error` under a `describe` still named "warns". `AC-0013-0023`,
`BR-0013-0018` and `US-0013-0013` say the same thing as the test case, so either
the window closed and four spec layers are stale, or the escalation was early.

**`TDD-0023`'s test does not discriminate what its obligation names.**
`TC-0013-0028` asks that the helper return the pack
`state.json#discussion.currentId` names, without scanning modification times.
Replacing the pointer match with the whole candidate list — so `currentId` is
ignored entirely — leaves the row's own case green, because its fixture builds
one pack and returning the sole directory satisfies it. Only a `TDD-0024` case
dies. A mutation that cannot redden the row is not an oracle for it.

**`TDD-0022`'s case does not drive what the row promises.** The structural
blocker this entry used to name is gone: the ledger now carries a `US-Refs`
column and the row reads `US-0013-0011` from it, so the obligation resolves and
an evidence entry can match it.

What remains is the row's own coverage. `US-0013-0011` is about the UI contract's
`primary_tasks` slot and the lane that refuses a pack without it, and the case
the `Selector` names asserts a non-zero `runValidate` exit carrying the rule
token. `runValidate` is not the `/qfai-prototyping` preflight the story's second
half names, and nothing in the file drives one. The row can carry a pointer now;
what it cannot yet carry is a pointer to a case that reaches the whole
obligation.

**`TDD-0027` and `TDD-0028` name a count band the product dropped.**
`TC-0013-0032` and `TC-0013-0033` state a `primary_tasks` band of 3..7. The
validator's lower bound was removed and the tests now assert that one through
seven emit nothing. The `Selector` of both rows is reported unresolved, which is
the one signal this drift raises on its own.

**One rule is emitted from two places.** `QFAI-AUD-001` is built independently
in `checkContractsHierarchy` and in `checkContractHierarchyFromScreens`, both
called from `validateDesignAudit` — the first over a discussion-pack sidecar,
the second over the UI contracts. The two message texts and severities are
maintained separately. Nothing here depends on that, and no test covers the
pair, so a change to one can silently diverge from the other.

### /qfai-atdd run 2026-09-23T19:33:24.738Z

- `TDD-0044` … `TDD-0049`: REDs passed by `qa-gatekeeper` (RED phase) on file hashes
  `b45c049e…64e2e2a` and `c7517a90…1249df`; handoffs ready. The GREEN of `TDD-0044`, `TDD-0045`,
  `TDD-0046`, `TDD-0047` and `TDD-0049` is the `/qfai-sdd` skill-text round. The earlier REDs of
  `TDD-0045` and `TDD-0049` are kept as superseded history.
- `TDD-0048` reads the whole shipped assistant tree, so its GREEN is the tree after the
  spec-0011 skill-text GREEN and the schema withdrawal as well as its own.
- Checkpoint departure (user decision, see Decisions made): no full-suite checkpoint runs per
  row. All rows' full-suite checkpoints close together on the final head's CI.

## Final status

PASS for TDD-0020, TDD-0024, TDD-0029, TDD-0030 and TDD-0044 through TDD-0049, each for the part of its obligation named under "Ledger rows advanced". This is a per-row verdict, not a stage verdict. The pack retains the eight unrelated coverage gaps named above.
## First full CI checkpoint

- Revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Run: https://github.com/aganesy/QFAI/actions/runs/36026684599
- Result: PASS — build, lint, types, all nine package test slices, Node floor tests, and ci-pass succeeded.
- Rows closed: TDD-0044, TDD-0045, TDD-0046, TDD-0047, TDD-0048, TDD-0049.

## Record defects

- `record:QFAI-TDDLIST-008`, `TDD-0044`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `92c2348be2179f2c21afc4d73db02c3b4c8847a8573c33f601a2331766fd042c`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0045`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `1a4021d1381e34a8c9e5d54664c6b8676b723c8fc3d2c3f92072d347ec4c7a9c`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0046`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `05aa4663d3a9053787d4fbcf5dcd24ad3a7b3a05b897fbaabfd04f55839079bd`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0047`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `0f30fe0de447a293cf11ef5063f33b36dbc561f0eaf4c777753cf6cd19b7e798`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0048`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `c97d9e677261538ab77d73f9f1b85bb834133998729832525d532445b6f2824b`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0049`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `eca62e968eb38e1b5101f36772ca9c8bad37fa0aca62c5b042b2d581e34db5ad`; the original sealed review remains historical.
