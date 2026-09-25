# ATDD Evidence: spec-0013

## Objective

The original backfill proves four of the twelve rows that were `done` at that
run. The other eight are listed under Gaps. This update adds falsifiability
evidence for three newly seeded optional-side-artifact rows.

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

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T01:55:05.779Z

Preflight: confidence high

No session opened. `CR-20260925-0008` fixes the two rows, the boundary each
owns and the test case both verify. The verify text names both catalog shapes
the first case builds, and the skill section the second case reads. Nothing
surfaced during the run that the spec or the change request leaves open.

### /qfai-implement — run started 2026-09-25T02:02:32.686Z

Preflight: confidence high

No session opened. `CR-20260925-0008` fixes the two rows and the boundary
each owns, and the `/qfai-atdd` handover names each predicate and its
mutation. Both named lines hold the named text at this revision, and nothing
surfaced during the run that the spec, the change request or the handover
leave open.

## Ledger rows advanced

The original four rows were already `done`. The three new rows remain `todo`
until the orchestrator writes their ledger cells after implementation gates.

The run started 2026-09-25T01:55:05.779Z adds `TDD-0110` and `TDD-0111`, the two rows
`CR-20260925-0008` seeds on `TC-0013-0010`. Both cases passed on their first
run, so both take branch 2. `/qfai-implement` Phase Red step 3c applies each
mutation and writes the falsifiability trio into the row's entry.

| TDD-ID     | Obligation      | Layer       | RED provenance | Status |
| ---------- | --------------- | ----------- | -------------- | ------ |
| `TDD-0020` | `TC-0013-0026`  | integration | falsifiability | done   |
| `TDD-0024` | `TC-0013-0029`  | integration | falsifiability | done   |
| `TDD-0029` | `TC-0013-0034`  | integration | falsifiability | done   |
| `TDD-0030` | `TC-0013-0035`  | integration | falsifiability | done   |
| `TDD-0081` | `TC-0013-0036`  | integration | falsifiability | todo   |
| `TDD-0082` | `TC-0013-0037`  | integration | falsifiability | todo   |
| `TDD-0083` | `TC-0013-0037`  | integration | falsifiability | todo   |
| `TDD-0110` | `TC-0013-0010`  | integration | falsifiability | todo   |
| `TDD-0111` | `TC-0013-0010`  | integration | falsifiability | todo   |

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

### Optional side artifact handoff (TDD-0081 to TDD-0083)

The three tests use a usable markdown discussion pack and exercise SDD
preflight through `runSddPreflight`. `TC-0013-0036` covers absence;
`TC-0013-0037` has separate invalid and legacy selectors. The `01_Context.md`
fixture does not claim a UI classification, so the missing-artifact test title
was narrowed to the input it actually supplies before the final proof.

Live falsifiability observations ran in an isolated worktree at HEAD
`c0fba3fb3c9786a497fbdcc7fc36e0aab3c260b0`. The scratch tree held an
identical copy of the test and production source. Each mutation was retained
while an independent `qa-gatekeeper` inspected the source, test, command,
assertion failure, SHA-256 values and content-addressed revision. After each
PASS verdict, the source was restored byte-for-byte and the same selector
passed. The restored source SHA-256 was
`9214217580cf6aa0c20ab374749ca81899ed6ff864a88a01d40c59b2ba2dff53`.
The restored scratch revision was
`working-tree+75d032c3913c0b9533e2fdb4629da26e89cd727adcfc5e3a45dc4c9173466c0f`.
The test file SHA-256 in scratch and the PR worktree was
`da430c65829cd4921f596bcba29a942c113896dd600ccc4ae357347da01a3e1e`.
The direct PR-worktree run of all three cases passed (one file, three tests).

Commands below ran from the isolated `packages/qfai` directory via the
`tmp/hold-spec0013-optional-mutant.mjs` wrapper. That wrapper inserted the
stated condition after `resolvePreflightBlockers(readiness)`, ran the exact
Vitest command, and left the mutated source for live inspection. Its `restore`
action restored the production source before the same command ran again.
The ignored `tmp/` logs were inspection aids, not committed evidence.

### TDD-0081

- TDD-ID: TDD-0081
- Layer: integration
- Test file: packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts
- Selector: does not block when a usable discussion pack is missing prototyping.yaml
- TC-ref: TC-0013-0036
- RED provenance: falsifiability, branch 2; the production path already made
  this assertion pass before the test was moved.

#### Round 1

- Round 1: Revision: working-tree+75d032c3913c0b9533e2fdb4629da26e89cd727adcfc5e3a45dc4c9173466c0f
- Round 1: Satisfied-by: packages/qfai/src/core/preflight/sddPreflight.ts,
  `runSddPreflight` and `resolvePreflightBlockers`; absence of an optional
  `prototyping.yaml` is not a blocker.
- Round 1: Falsifiability command: `node node_modules/vitest/vitest.mjs run tests/integration/sddOptionalArtifactPreflight.test.ts -t "does not block when a usable discussion pack is missing prototyping.yaml"`
- Round 1: Falsifiability result: exit 1; one assertion failed, two tests
  skipped. At test line 37, `result.status` was `blocked` instead of `ready`.
Observed failure output (excerpt):

```text
 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
 FAIL  |integration| tests/integration/sddOptionalArtifactPreflight.test.ts > SDD preflight optional discussion side artifact > does not block when a usable discussion pack is missing prototyping.yaml
AssertionError: expected 'blocked' to be 'ready' // Object.is equality
Expected: "ready"
Received: "blocked"
 ❯ tests/integration/sddOptionalArtifactPreflight.test.ts:37:29
```

- Round 1: Falsifiability revision: working-tree+4402324589c0660a78330be7b125a7767b1b0bee89e3bcf538b3ed6f30db0141
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: eee65283a88b54eb2b8f7be0fc46cd6087ac802cca46eea6b39b5746670ef329
- Round 1: RED test manifest: packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/integration/sddOptionalArtifactPreflight.test.ts -t "does not block when a usable discussion pack is missing prototyping.yaml"`
- Round 1: GREEN result: exit 0; one passed, two skipped after restoration.
Observed GREEN output (excerpt):

```text
 Test Files  1 passed (1)
      Tests  1 passed | 2 skipped (3)
```

- P1d qa-gatekeeper verdict: PASS after live inspection of the mutated tree,
  failed assertion, revision and both file hashes; restoration was then
  verified by the GREEN run.

Mutation: read the optional side artifact and add a blocker when its content is
empty. The mutant source SHA-256 was
`f35493eac5773cb4456ac16531960bfecc5ee761f437ba2577e5614c782e1647`.

### TDD-0082

- TDD-ID: TDD-0082
- Layer: integration
- Test file: packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts
- Selector: does not block when prototyping.yaml exists but namespaced schema is invalid
- TC-ref: TC-0013-0037
- RED provenance: falsifiability, branch 2.

#### Round 1

- Round 1: Revision: working-tree+75d032c3913c0b9533e2fdb4629da26e89cd727adcfc5e3a45dc4c9173466c0f
- Round 1: Satisfied-by: packages/qfai/src/core/preflight/sddPreflight.ts,
  `runSddPreflight` and `resolvePreflightBlockers`; an invalid optional
  `prototyping.yaml` does not enter the blocker list.
- Round 1: Falsifiability command: `node node_modules/vitest/vitest.mjs run tests/integration/sddOptionalArtifactPreflight.test.ts -t "does not block when prototyping.yaml exists but namespaced schema is invalid"`
- Round 1: Falsifiability result: exit 1; one assertion failed, two tests
  skipped. At test line 57, `result.status` was `blocked` instead of `ready`.
Observed failure output (excerpt):

```text
 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
 FAIL  |integration| tests/integration/sddOptionalArtifactPreflight.test.ts > SDD preflight optional discussion side artifact > does not block when prototyping.yaml exists but namespaced schema is invalid
AssertionError: expected 'blocked' to be 'ready' // Object.is equality
Expected: "ready"
Received: "blocked"
 ❯ tests/integration/sddOptionalArtifactPreflight.test.ts:57:29
```

- Round 1: Falsifiability revision: working-tree+601b350bffcaa514b48cf4e0a259157bd856d5b89adba669703745e60b3c0274
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: eee65283a88b54eb2b8f7be0fc46cd6087ac802cca46eea6b39b5746670ef329
- Round 1: RED test manifest: packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/integration/sddOptionalArtifactPreflight.test.ts -t "does not block when prototyping.yaml exists but namespaced schema is invalid"`
- Round 1: GREEN result: exit 0; one passed, two skipped after restoration.
Observed GREEN output (excerpt):

```text
 Test Files  1 passed (1)
      Tests  1 passed | 2 skipped (3)
```

- P1d qa-gatekeeper verdict: PASS after live inspection of the mutated tree,
  failed assertion, revision and both file hashes; restoration was then
  verified by the GREEN run.

Mutation: read the optional side artifact and add a blocker when it has a
`prototyping:` namespace without the expected `full-harness` recommendation.
The mutant source SHA-256 was
`bb45b400a7c82a7ce1c82d46fe215efabc748c64ad3d49312309c800c5ed47f0`.

### TDD-0083

- TDD-ID: TDD-0083
- Layer: integration
- Test file: packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts
- Selector: does not block when prototyping.yaml uses legacy-only schema
- TC-ref: TC-0013-0037
- RED provenance: falsifiability, branch 2.

#### Round 1

- Round 1: Revision: working-tree+75d032c3913c0b9533e2fdb4629da26e89cd727adcfc5e3a45dc4c9173466c0f
- Round 1: Satisfied-by: packages/qfai/src/core/preflight/sddPreflight.ts,
  `runSddPreflight` and `resolvePreflightBlockers`; a legacy optional
  `prototyping.yaml` is not a blocker.
- Round 1: Falsifiability command: `node node_modules/vitest/vitest.mjs run tests/integration/sddOptionalArtifactPreflight.test.ts -t "does not block when prototyping.yaml uses legacy-only schema"`
- Round 1: Falsifiability result: exit 1; one assertion failed, two tests
  skipped. At test line 83, `result.status` was `blocked` instead of `ready`.
Observed failure output (excerpt):

```text
 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
 FAIL  |integration| tests/integration/sddOptionalArtifactPreflight.test.ts > SDD preflight optional discussion side artifact > does not block when prototyping.yaml uses legacy-only schema (no prototyping namespace)
AssertionError: expected 'blocked' to be 'ready' // Object.is equality
Expected: "ready"
Received: "blocked"
 ❯ tests/integration/sddOptionalArtifactPreflight.test.ts:83:29
```

- Round 1: Falsifiability revision: working-tree+7bf3bef2b6fd19caa142e497b55b3c294a3aa3555570f400c086a6d29dac16ac
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: eee65283a88b54eb2b8f7be0fc46cd6087ac802cca46eea6b39b5746670ef329
- Round 1: RED test manifest: packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/integration/sddOptionalArtifactPreflight.test.ts -t "does not block when prototyping.yaml uses legacy-only schema"`
- Round 1: GREEN result: exit 0; one passed, two skipped after restoration.
Observed GREEN output (excerpt):

```text
 Test Files  1 passed (1)
      Tests  1 passed | 2 skipped (3)
```

- P1d qa-gatekeeper verdict: PASS after live inspection of the mutated tree,
  failed assertion, revision and both file hashes; restoration was then
  verified by the GREEN run.

Mutation: read the optional side artifact and add a blocker when it exists
without a `prototyping:` namespace. The mutant source SHA-256 was
`7fe08b235fd2a0053fc7bfe5995689cef3e572cd521e8c94f9402e60d5c36667`.

These three rows still require an integrated-tree checkpoint, review-pack seal,
and completion-reviewer verdict before the ledger can reach `done`. The old
Coverage Depth Matrix below predates `BR-0013-0021` and these two new TCs;
its revision is a separate stage-wide obligation.

### TDD-0110

- TDD-ID: TDD-0110
- Layer: integration
- Test file: packages/qfai/tests/integration/sddSkillSpec0013.test.ts
- Selector: reports a spec id the catalog moves to another capability
- TC-ref: TC-0013-0010
- Branch: falsifiability — the validator already reports a moved spec id, so the case passed on its first run
- Predicate to break: packages/qfai/src/core/validators/specSplitByCapability.ts:552, `capReferenceIssues` — `if (specText.trim().length === 0 || !specText.includes(capId)) {`, the check that a spec's `01_Spec.md` names the capability the catalog pairs it with
- Mutation: `if (specText.trim().length === 0 || !specText.includes(capId)) {` to `if (specText.trim().length === 0) {`
- Why it fails: every fixture spec has a non-empty `01_Spec.md`, so the mutated check reports nothing. The row-order catalog reaches the same check through `expectedSpecIds`, so it also reports nothing under this mutation; that failure is not observed, because the case stops at line 271.
  The two catalogs that keep the assignment still return `[]`.
  The catalog with its `Spec` cells swapped also returns `[]` where the case expects two `QFAI-SPLIT-105` findings, so `toEqual` fails as an assertion at `tests/integration/sddSkillSpec0013.test.ts:271`
- Type check: the mutated condition is still a boolean, and the line passes `tsc`
- Other rows: `TDD-0111` and `TDD-0010` still pass, because neither case calls the validator
- Classification command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "reports a spec id the catalog moves to another capability"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 23 skipped (24), at working-tree+8780ce78c6acf9aece8eaa7511b618d8c7b70b6c555c5f7ad8b3ef85928c2cbe

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/validators/specSplitByCapability.ts, `capReferenceIssues` — `QFAI-SPLIT-105` for a spec whose `01_Spec.md` does not name the capability the catalog pairs it with
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "reports a spec id the catalog moves to another capability"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 23 skipped (24). The row's case fails on `AssertionError: expected [] to deeply equal [ [ 'spec-0002', 'CAP-0001' ], …(1) ]` at `tests/integration/sddSkillSpec0013.test.ts:271:84`

The edit, the capability check dropped from the condition at line 552:

```diff
-    if (specText.trim().length === 0 || !specText.includes(capId)) {
+    if (specText.trim().length === 0) {
```

- Round 1: Falsifiability revision: working-tree+18cbf6770ac3e6cd0962f366469fc762609bfce34e23b32efed9d0d3310828dd
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 3fa41420770ad4ebc9dc6d77fa86fc6e270ebb60b9c3ace098356c946dc5549d
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/sddSkillSpec0013.test.ts
```

- Round 1: Revision: b05f9c0ae3653bc56a7cdf7cbc6dbab865361f4a
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "reports a spec id the catalog moves to another capability"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 23 skipped (24). Run after `git checkout -- packages/qfai/src/core/validators/specSplitByCapability.ts`, which restores the file as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 24 passed (24). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Run on the tree the reviews read
- Refactor verify revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1, Round 1 — RED phase gate on the rebuilt mutated tree working-tree+18cbf6770ac3e6cd0962f366469fc762609bfce34e23b32efed9d0d3310828dd; qa-gatekeeper#2 — build-phase GREEN + oracle proof at b05f9c0ae3653bc56a7cdf7cbc6dbab865361f4a)
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — RED phase gate on the rebuilt mutated tree (specSplitByCapability.ts:552 capability check dropped) working-tree+18cbf677… at HEAD b05f9c0ae; AssertionError at sddSkillSpec0013.test.ts:271:84; RED test hash 3fa41420… recomputes; qa-gatekeeper#2 PASS — build-phase GREEN and oracle proof at b05f9c0ae: selector 1 passed | 23 skipped, file 24/24. Gate taken after the revert, on the rebuilt tree

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: no record that this run's mandatory plan phase ran (delivery-planner, test-design-analyst); the row stays at `refactor` as a member of its T1 group keyed `BR-0013-0007`, and the group is reviewed again once the plan phase is recorded in `implement-spec-0013.md`
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925120000000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 2055a3f7fe50cab6c5c9eeb3ca53e37c67b9e039670fd5dfb71205f29ef2dc86

### TDD-0111

- TDD-ID: TDD-0111
- Layer: integration
- Test file: packages/qfai/tests/integration/sddSkillSpec0013.test.ts
- Selector: SKILL.md makes reordering the capability-to-spec mapping a Change Request
- TC-ref: TC-0013-0010
- Branch: falsifiability — the skill already states the rule, so the case passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md:267, the `## Arguments and Target Selection (Mandatory)` bullet `- Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.`
- Mutation: delete line 267
- Why it fails: the section no longer holds the sentence, so `expect(section).toContain(...)` fails as an assertion at `tests/integration/sddSkillSpec0013.test.ts:287`.
  The heading is still there, so the `start` check above it passes and the failure is the rule's own
- Type check: the edit is to a Markdown file, so no type-checked file changes
- Other rows: `TDD-0110` and `TDD-0010` still pass. No other case in the file reads that sentence, and `TDD-0010`'s cases read the `### No-argument batch delegation (MUST)` block
- Classification command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "SKILL.md makes reordering the capability-to-spec mapping a Change Request"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 23 skipped (24), at working-tree+8780ce78c6acf9aece8eaa7511b618d8c7b70b6c555c5f7ad8b3ef85928c2cbe

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md, `## Arguments and Target Selection (Mandatory)` — the bullet making a reorder of the capability-to-spec mapping a Change Request
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "SKILL\.md makes reordering the capability-to-spec mapping a Change Request"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 23 skipped (24). The row's case fails on `AssertionError: expected '## Arguments and Target Selection (Ma…' to contain 'Reordering capability-to-spec mapping…'` at `tests/integration/sddSkillSpec0013.test.ts:287:21`

The edit, line 267 deleted:

```diff
-- Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.
```

- Round 1: Falsifiability revision: working-tree+398b149532781ef3a2bf447008c3ea8d1a7dec73e9948cebd71ff7cde3ad506e
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 3fa41420770ad4ebc9dc6d77fa86fc6e270ebb60b9c3ace098356c946dc5549d
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/sddSkillSpec0013.test.ts
```

- Round 1: Revision: b05f9c0ae3653bc56a7cdf7cbc6dbab865361f4a
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "SKILL\.md makes reordering the capability-to-spec mapping a Change Request"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 23 skipped (24). Run after `git checkout -- packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, which restores the file as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 24 passed (24). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Run on the tree the reviews read
- Refactor verify revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1, Round 1 — RED phase gate on the rebuilt mutated tree working-tree+398b149532781ef3a2bf447008c3ea8d1a7dec73e9948cebd71ff7cde3ad506e; qa-gatekeeper#2 — build-phase GREEN + oracle proof at b05f9c0ae3653bc56a7cdf7cbc6dbab865361f4a)
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — RED phase gate on the rebuilt mutated tree (qfai-sdd SKILL.md:267 bullet deleted) working-tree+398b1495… at HEAD b05f9c0ae; toContain AssertionError at sddSkillSpec0013.test.ts:287:21; RED test hash 3fa41420… recomputes; qa-gatekeeper#2 PASS — build-phase GREEN and oracle proof at b05f9c0ae: selector 1 passed | 23 skipped, file 24/24. Gate taken after the revert, on the rebuilt tree

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: no record that this run's mandatory plan phase ran (delivery-planner, test-design-analyst); the row stays at `refactor` as a member of its T1 group keyed `BR-0013-0007`, and the group is reviewed again once the plan phase is recorded in `implement-spec-0013.md`
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925120001000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): fa6264c954fe558af39f9a39202df22e8ab23943a4b6877e2608a7080599717b

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0013.md`.
Totals: ✅ 66 / ⚠️ 116 / ❌ 312, with 7 not applicable, across 501 scored cells —
441 matrix depth cells (49 rows × 9 columns) and 60 business rule cells
(20 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                                     | Status (PASS/REVISE/PENDING) |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the forty-nine obligations and write the matrix    | PASS                         |
| completion-reviewer | Audit every claim this file makes against the repository | PENDING |

### Rows for the run started 2026-09-25T01:55:05.779Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | acceptance-test-engineer | acceptance-test-engineer | Write the `TDD-0110` and `TDD-0111` cases under a `TC-0013-0010` describe the `TDD-0010` selector does not match | CR-20260925-0008, 06_Test-Cases.md `TC-0013-0010` | `sddSkillSpec0013.test.ts` | PASS |
| 2 | acceptance-test-engineer | acceptance-test-engineer | Hand over `TDD-0110` and `TDD-0111` on the falsifiability branch | the test file, `specSplitByCapability.ts`, the `qfai-sdd` `SKILL.md` | #tdd-0110, #tdd-0111 | PASS |
| 3 | - | n/a | grilling(-@2026-09-25T01:55:05.779Z/none): none | - | - | PASS |

### Rows for the /qfai-implement run started 2026-09-25T02:02:32.686Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 4 | - | n/a | grilling(-@2026-09-25T02:02:32.686Z/none): none | - | - | PASS |
| 5 | backend-engineer | backend-engineer | /qfai-implement: TDD-0110 falsifiability run with the capability check dropped at line 552, then the revert and the restored GREEN | #tdd-0110, `specSplitByCapability.ts` | Round 1 | PASS |
| 6 | backend-engineer | backend-engineer | /qfai-implement: TDD-0111 falsifiability run with line 267 deleted, then the revert and the restored GREEN | #tdd-0111, the `qfai-sdd` `SKILL.md` | Round 1 | PASS |
| 7 | backend-engineer | backend-engineer | /qfai-implement: TDD-0110 and TDD-0111 refactor verify on the committed tree | #tdd-0110, #tdd-0111 | Refactor verify fields | PASS |
| 8 | qa-gatekeeper | qa-gatekeeper#1, qa-gatekeeper#2 | /qfai-implement: TDD-0110 and TDD-0111 RED phase gate on the rebuilt falsifiability trees, and the build-phase GREEN | #tdd-0110, #tdd-0111 | qa-gatekeeper fields | PASS |
| 9 | completion-reviewer | completion-reviewer | /qfai-implement: TDD-0110 and TDD-0111 completion review, attempt 1 | #tdd-0110, #tdd-0111 | review-20260925120000000, review-20260925120001000 <!-- qfai:not-a-citation --> | REVISE |
| 10 | implementation-reviewer | implementation-reviewer | /qfai-implement: TDD-0110 and TDD-0111 code review, attempt 1 | #tdd-0110, #tdd-0111 | review-20260925120000000, review-20260925120001000 <!-- qfai:not-a-citation --> | PASS |

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

### Checks for the run started 2026-09-25T01:55:05.779Z

```text
pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts -t "<Selector>"
  TDD-0110 reports a spec id the catalog moves to another capability   Tests 1 passed | 23 skipped (24)
  TDD-0111 SKILL.md makes reordering the capability-to-spec mapping a Change Request   Tests 1 passed | 23 skipped (24)
  TDD-0010 TC-0013-0010: Batch Mode Targets Every Capability   Tests 2 passed | 22 skipped (24)
pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts
  Test Files 1 passed (1); Tests 24 passed (24)
eslint and prettier --check on the test file   -> exit 0
RED test hash over the manifest                 -> 3fa41420770ad4ebc9dc6d77fa86fc6e270ebb60b9c3ace098356c946dc5549d
```

`TDD-0010`'s selector still selects its own two cases and neither new one.
`tsconfig.tests.json` does not list the test file, so `tsc` ran on a scratch
config that extends it and includes only that file, with exit 0. The scratch
config is deleted.

### Checks for the /qfai-implement run started 2026-09-25T02:02:32.686Z

```text
pnpm -C packages/qfai build                                              -> exit 0
node packages/qfai/dist/cli/index.mjs validate --profile tdd --format text
  no finding names TDD-0110, TDD-0111 or TC-0013-0010
node scripts/check-dogfood-backlog.mjs --profile tdd                     -> 935 errors, all within the pinned backlog
node scripts/check-dogfood-backlog.mjs --profile full                    -> 951 errors, all within the pinned backlog
node scripts/pin-stage-evidence-counts.mjs                               -> already current; nothing to write
```

`.qfai/report` was restored after each run.

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

**The Coverage Depth Matrix predates `TDD-0110` and `TDD-0111`.** Its
`TC-0013-0010` and `BR-0013-0007` rows still score the case as it was before
the two clauses had a test. Rescoring them is part of the stage-wide matrix
revision, as it is for the three optional-side-artifact rows.

## Final status

Historical PASS for the original four rows, each for the part of its obligation named
under "Ledger rows advanced". This is a per-row verdict, not a stage verdict:
the pack is not clean, and eight of its twelve `done` rows are listed under Gaps
rather than claimed.

The three new rows have live P1d falsifiability PASS and focused GREEN. Their
full checkpoint, review pack and completion verdict remain pending.

`TDD-0110` and `TDD-0111` are handed over on the falsifiability branch. Their
mutation runs, `qa-gatekeeper` verdicts, GREEN, review packs and checkpoint are
`/qfai-implement`'s, and remain pending.
