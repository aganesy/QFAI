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
`packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (`TDD-0110`, `TDD-0112`,
`TDD-0113`, `TDD-0114`) and `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts`
(`TDD-0111`, `TDD-0115`). Every `it` of a file was written before the first RED of that file.

### /qfai-atdd run 2026-09-25T02:23:00.972Z

This run re-completes the six rows the merge renumbered, `TDD-0110` … `TDD-0115`, and
nothing else in the spec. Each row's work is its `#### Round 2`; its `#### Round 1` is the
history the renumber kept (DR-0013-0017, DL-0013).

- **Preflight: confidence high, no session opened.** The approach is settled input:
  decision D6 of grilling session `split-2026-09-25` S1, adopted as DR-0013-0017
  (`.qfai/evidence/sdd-spec-0013.md`, Work Orders step 1). It re-completes the rows on the
  branch `red-provenance.md` assigns, and rules out reverting production code to
  manufacture a RED.
- **Branch 2 is expected for every row.** The `qfai-sdd` skill text the six tests read is in
  the tree, so each first run should pass. The classification run decides it: a failing
  first run is a natural RED on the approved scope.
- **No test is written or changed.** The tests are the two files as the re-derive in merge
  `eeadf8142` renamed them. The volume estimate, coverage checklist and matrix of the
  2026-09-23 run stand: the renumber changed IDs, not counts.
- **Standing user decisions carry over** from the 2026-09-23 run: rows stop at `refactor`,
  with checkpoints closed on the final head's CI; RED is observed locally for these tests
  only; rows sharing a GREEN take their REDs first. No GREEN is built this round, so the
  last one does not order anything here.
- **Stage 0.** The four catalog files hold no placeholder or `TBD`, and this run found no
  stale fact in them. **Delta Rejected Guard.** This run changes no spec, test or skill
  text, so it reintroduces no rejected option.

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

Escalated S1: D1 — `EX-0004-0044` gives a passing `Blocked-By` the kept check rejects. User: fix the example and BR via a Change Request. Done as `CR-20260923-0015` (applied; spec-0004 DR-0004-0043, DL-0029). TDD-0069..0071 fixtures use `spec-0004:TDD-0001 — blocked at todo`.

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

### /qfai-atdd — run started 2026-09-25T02:23:00.972Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

### /qfai-implement — run started 2026-09-25T02:45:32.177Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

This invocation names `TDD-0110` … `TDD-0115` and works them one at a time, in the order
of `## Ledger rows advanced`. Every row is `Layer = Integration`, so this file is the only
home of its record, and the block is written once.

- **Confidence high, no session opened.** The approach is settled input: decision D6 of
  grilling session `split-2026-09-25` S1, adopted as DR-0013-0017. The six rows are
  completed again on the branch `red-provenance.md` assigns, which the `/qfai-atdd` run
  started 2026-09-25T02:23:00.972Z settled as branch 2 for all six, and production code is
  not reverted to manufacture a RED. Each row's mutation is the one approved with its
  `#### Round 2` scope, so this run decides no seam, no production approach and no refactor.
- **Standing user decisions carry over:** rows stop at `refactor`, and checkpoints and seals
  close on the final head's CI; RED and checkpoints run locally, for the related tests only.
- **Stage 0.** `catalog/tech.md`, `catalog/structure.md` and `catalog/product.md` hold no
  placeholder, and this run found no stale fact in them. `catalog/manifest.md` still holds the
  shipped template's `<…>` placeholders. It is a copy of
  `packages/qfai/assets/init/.qfai/assistant/catalog/manifest.md`, which `sync:ssot`
  regenerates, and its content is product intent no repository file states, so this run does
  not fill it. No command, path or entrypoint this run uses is read from it.
- **Change Request preflight.** No `.qfai/decisions/CR-*.md` names spec-0013's `TDD-0110` …
  `TDD-0115`, so none resets or blocks them. The one record that names a `TDD-0110`,
  `CR-20260924-0004`, names `spec-0017/TDD-0110`. `git status --short .qfai/decisions`
  printed nothing.
- **Pre-split evidence marker pass.** The recorded ledger fingerprint no longer matched the
  eighteen ledgers, so the pass ran. No `E2E` / `API` / `Integration` row past `todo` has an
  `implement-` anchor without the marker, so it marked nothing, refused nothing, and recorded
  the new fingerprint in `.qfai/state.json`.
- **Plan phase.** A named-`TDD-ID` invocation is confirmed rather than re-planned
  (`references/plan-phase.md`). The facts that confirmation reads hold: each row exists, none
  is `blocked`, and each is `T2`, which forms no group.
  - `delivery-planner` (instance `impl13-plan`) confirmed the handover: PASS, relayed by the
    coordinator and recorded here at 2026-09-25T02:55:37.468Z (Work Orders step 4).
  - Order: the confirmation was taken after the Skeleton re-run and after TDD-0110's step 3b
    check and both step 3c mutation runs, and before any ledger write of this run. TDD-0110's
    falsifiability gate (`qa-gatekeeper` `impl13-qa`) had already been dispatched when it
    landed. No row had moved, so the order the confirmation fixes governed every ledger write.
  - Constraint it adds: step 3c stays strictly serial across the six rows, and each row's
    mutation is reverted to the committed blob before the next row's mutation is applied.
  - `test-design-analyst` (instance `impl13-tda`): non-blocking pass over HEAD `1e09c3067`,
    against the full `TC-*` / `US-*` / `CON-API-*` set of spec-0013. No REVISE.
    - **Why here.** `plan-phase.md` names `implement-spec-0013.md`. Every other home rule of
      the skill splits by `Layer`. The run-level record goes to "every evidence file this
      invocation's rows own" (`SKILL.md`), and an `Integration` row's file is this one
      (`record-contract.md`, `execution-ledger.md`). All six rows are `Integration` with no
      `Pre-split-evidence` marker. The reviewers that plan-phase findings are meant for read
      this file. A new `implement-spec-0013.md` would hold only these findings, and nothing
      reads it for these rows.
    - **TC-0013-0038 / TC-0013-0039: covered, layer correct.** TC-0013-0038's four boundaries
      map one row each: `TDD-0110`, `TDD-0112`, `TDD-0113`, `TDD-0114`. TC-0013-0039's two
      map to `TDD-0111` and `TDD-0115`. Both TCs declare `Level: integration`, which the
      validator lowercases and reads as L3. Neither falls in the L1/L2 carve-out, so all six
      rows are ATDD-owned `Integration` rows. Their tests are in `tests/integration/**`.
      `US-Refs` and `CON-API-Refs` are `-`, so no row cites an obligation its layer does not
      own. Each `Selector` equals one `it` title and names one boundary. `BR-Ref` follows the
      chain: TC-0013-0038 → AC-0013-0030 → BR-0013-0023, and TC-0013-0039 → AC-0013-0029 →
      BR-0013-0022.
    - **Renumber: no obligation lost.** Main's 110 rows are unchanged in every column except
      `Evidence`. HEAD adds exactly the six rows. Every row obligation has a row:
      TC-0013-0001 … 0039 each have at least one, and every one of the 14 active stories
      US-0013-0001 … 0014 has an `E2E` row. No story is `planned`. The `CON-API-*` set is empty:
      there is no `contracts/api/`, and the pack cites none. The old IDs appear only in the
      rename tables of `09_delta.md` and the context of `07_Decisions.md`.
    - **Advisory, upstream (`/qfai-sdd`), not tied to a row.** AC-0013-0029 and AC-0013-0030
      carry no `US-Refs`, so TC-0013-0038/0039 trace to no story. This neither creates nor
      removes a row obligation. Most ACs in the pack have the same gap.
    - **Advisory, upstream (skill text).** `plan-phase.md` names `implement-<spec-id>.md` for
      every row, without the `Layer` split the other home rules state.
- **Skeleton.** Re-run for this invocation before any mutation: `.qfai/evidence/skeleton.md`,
  "Re-run — `/qfai-implement` spec-0013, run started 2026-09-25T02:45:32.177Z", exit 0.
- **Delta Rejected Guard.** The only edits to the skill text are the approved mutations,
  each restored byte for byte, so no rejected option is reintroduced.
- **Concurrent processes.** A vitest run (PID 32948) started at 2026-09-25T02:43:23Z under
  `.claude/worktrees/agent-a59afa4be8de399a4`, another worktree. It cannot write this tree,
  and it is not this run's.

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

- `TC-0013-0038` and `TC-0013-0039`: exercised by `TDD-0110` … `TDD-0115`, all done after the first full CI checkpoint, under
  `packages/qfai/tests/integration/**`.
- `US-*` (14), `CON-API-*` (none), `CON-DB-*` (none): unchanged by this change.

## Ledger rows advanced

The original four rows were already `done`. The three new rows remain `todo`
until the orchestrator writes their ledger cells after implementation gates.
TDD-0110 through TDD-0115 became done after the first full CI checkpoint as
TDD-0044 through TDD-0049. The merge renumbered them (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"), and they
are `todo` until they are completed again.

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
| `TDD-0112` | `TC-0013-0038` | Integration | falsifiability | red |
| `TDD-0113` | `TC-0013-0038` | Integration | falsifiability | red |
| `TDD-0114` | `TC-0013-0038` | Integration | falsifiability | red |
| `TDD-0115` | `TC-0013-0039` | Integration | falsifiability | red |

Rows `TDD-0110` … `TDD-0115` of this branch are withdrawn by `CR-20260925-0010`. Their ledger
rows are deleted and their test files are deleted. `TDD-0112` … `TDD-0115` are tombstoned.
The withdrawn `TDD-0110` and `TDD-0111` never merged under those IDs: main assigned both to
the rows `CR-20260925-0008` seeds, so the IDs are main's. Their sections below are headed
`Withdrawn TDD-0110 (never merged)` and `Withdrawn TDD-0111 (never merged)`, and stay as
history with the other four.

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

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: no record that this run's mandatory plan phase ran (delivery-planner, test-design-analyst); the ledger moved the row to `review-fix` (56bb4b16c) and back to `refactor` (f06af3786) as a member of its T1 group keyed `BR-0013-0007`, and the group was reviewed again once the plan phase was recorded in `implement-spec-0013.md`
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925120100000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 4993fe8d2df94d24a308085642eecf00da6b031006307eaaa65720d9853b6737

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260925120200000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): c665d461bd5262b0ff8c774484b4b3a2e6643a0a8369fe86ae6cdf78592dd684
- Spec review: PASS
- Spec reviewed revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Spec audited evidence hash: d2b5d01d4f740a982a34404f93b2c25022fa3d91f27cb29d4339cae88151a087
- Spec review pack: .qfai/review/review-20260925120200000 <!-- qfai:not-a-citation -->
- Spec review pack seal: c665d461bd5262b0ff8c774484b4b3a2e6643a0a8369fe86ae6cdf78592dd684
- Code quality review: PASS
- Code quality reviewed revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Code quality audited evidence hash: d2b5d01d4f740a982a34404f93b2c25022fa3d91f27cb29d4339cae88151a087
- Code quality review pack: .qfai/review/review-20260925120200000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c665d461bd5262b0ff8c774484b4b3a2e6643a0a8369fe86ae6cdf78592dd684
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 24 passed (24). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Checkpoint verification seal: 3130415110be88e4f514d4b5528b21ee49f7d002fe1ad7902e4b6a8277d1acd5

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

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: no record that this run's mandatory plan phase ran (delivery-planner, test-design-analyst); the ledger moved the row to `review-fix` (56bb4b16c) and back to `refactor` (f06af3786) as a member of its T1 group keyed `BR-0013-0007`, and the group was reviewed again once the plan phase was recorded in `implement-spec-0013.md`
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925120100000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 4993fe8d2df94d24a308085642eecf00da6b031006307eaaa65720d9853b6737

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260925120200000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): c665d461bd5262b0ff8c774484b4b3a2e6643a0a8369fe86ae6cdf78592dd684
- Spec review: PASS
- Spec reviewed revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Spec audited evidence hash: da9c01b0be72f58c63ab7ae2daaa86c36534bed440f3840169e9e1e590e3ec23
- Spec review pack: .qfai/review/review-20260925120200000 <!-- qfai:not-a-citation -->
- Spec review pack seal: c665d461bd5262b0ff8c774484b4b3a2e6643a0a8369fe86ae6cdf78592dd684
- Code quality review: PASS
- Code quality reviewed revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Code quality audited evidence hash: da9c01b0be72f58c63ab7ae2daaa86c36534bed440f3840169e9e1e590e3ec23
- Code quality review pack: .qfai/review/review-20260925120200000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c665d461bd5262b0ff8c774484b4b3a2e6643a0a8369fe86ae6cdf78592dd684
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/sddSkillSpec0013.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 24 passed (24). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 9cae7bb4b64018c5048704921331e916ad28e4f3
- Checkpoint verification seal: 3130415110be88e4f514d4b5528b21ee49f7d002fe1ad7902e4b6a8277d1acd5

### TDD-0133

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/stage1OtherApprovals.test.ts`
- Selector: `TC-0013-0040: The other approval-required operations keep the question`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/stage1OtherApprovals.test.ts --testNamePattern='TC-0013-0040: The other approval-required operations keep the question' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Inside a workflow run section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/stage1OtherApprovals.test.ts`

### TDD-0134

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/stage1AutoMode.test.ts`
- Selector: `TC-0013-0041: `--auto` inside a run approves nothing`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/stage1AutoMode.test.ts --testNamePattern='TC-0013-0041: `--auto` inside a run approves nothing' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `--auto` inside a run section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/stage1AutoMode.test.ts`

### TDD-0118

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/defectRowSeedingExistingRows.test.ts`
- Selector: `TC-0013-0044: Seeding changes no upstream item and no existing row's status or evidence`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/defectRowSeedingExistingRows.test.ts --testNamePattern='TC-0013-0044: Seeding changes no upstream item and no existing row's status or evidence' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ### Defect row seeding section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/defectRowSeedingExistingRows.test.ts`

### TDD-0119

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/defectRowSeedingLayer.test.ts`
- Selector: `TC-0013-0045: The seeded row's layer comes from the oracle`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/defectRowSeedingLayer.test.ts --testNamePattern='TC-0013-0045: The seeded row's layer comes from the oracle' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ### Defect row seeding section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/defectRowSeedingLayer.test.ts`

### TDD-0120

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/defectRowSeedingDelta.test.ts`
- Selector: `TC-0013-0046: The append is recorded as an approval-free delta row`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/defectRowSeedingDelta.test.ts --testNamePattern='TC-0013-0046: The append is recorded as an approval-free delta row' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ### Defect row seeding section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/defectRowSeedingDelta.test.ts`

### TDD-0122

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/standaloneEnd.test.ts`
- Selector: `TC-0013-0048: A direct `/qfai-sdd` ends at SDD`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/standaloneEnd.test.ts --testNamePattern='TC-0013-0048: A direct `/qfai-sdd` ends at SDD' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Invoked by name section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/standaloneEnd.test.ts`

### TDD-0123

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/entryCheck.test.ts`
- Selector: `TC-0013-0049: The entry check follows the handover`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/entryCheck.test.ts --testNamePattern='TC-0013-0049: The entry check follows the handover' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Entry check section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/entryCheck.test.ts`

### TDD-0124

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/operationsTable.test.ts`
- Selector: `TC-0013-0050: The Operations table lists the vocabulary's operations`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/operationsTable.test.ts --testNamePattern='TC-0013-0050: The Operations table lists the vocabulary's operations' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests  1 passed (1)); the asset text landed before this test was written
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/operationsTable.test.ts`
- Note: The Operations table this test reads was written for spec-0001 TDD-0039, before this test existed, so no RED was observed.

### TDD-0125

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/stage0Reuse.test.ts`
- Selector: `TC-0013-0051: Stage 0 reuse keeps SDD's own check live`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/stage0Reuse.test.ts --testNamePattern='TC-0013-0051: Stage 0 reuse keeps SDD's own check live' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Stage 0 section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/orchestrated-mode.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`, `packages/qfai/tests/integration/sdd/stage0Reuse.test.ts`

### TDD-0131

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/stage1ApprovalCheck.test.ts`
- Selector: `TC-0013-0052: Stage 1 checks a matching routing-time approval`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/stage1ApprovalCheck.test.ts --testNamePattern='TC-0013-0052: Stage 1 checks a matching routing-time approval' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '## Inside a workflow run Under a QFAI…' to match /the check passes only when the recor…/i`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/integration/sdd/stage1ApprovalCheck.test.ts`
- Reopened by: CR-20260925-0020 part A; the case asserts the check itself (the record exists, matches the row's operation and capability, and is not stale) instead of a contract citation.

### TDD-0132

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/stage1ApprovalStop.test.ts`
- Selector: `TC-0013-0053: A failed approval check persists nothing`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/stage1ApprovalStop.test.ts --testNamePattern='TC-0013-0053: A failed approval check persists nothing' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '## Inside a workflow run Under a QFAI…' to match /an approval is stale when the scope …/i`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/integration/sdd/stage1ApprovalStop.test.ts`
- Reopened by: CR-20260925-0020 part A; the case asserts the three staleness conditions and that the clock alone never makes an approval stale.

### TDD-0116

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/triageAuthorizationRefColumn.test.ts`
- Selector: `TC-0013-0042: The triage format carries Authorization-Ref`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/triageAuthorizationRefColumn.test.ts --testNamePattern='TC-0013-0042: The triage format carries Authorization-Ref' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '## Triage table format ```markdown ##…' to match /`Authorization-Ref` is optional and …/i`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/integration/sdd/triageAuthorizationRefColumn.test.ts`
- Reopened by: CR-20260925-0020 part A; the case asserts the value form `run-<17 digits>/<authorizationId>` instead of a contract citation.

### TDD-0117

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/defectRowSeeding.test.ts`
- Selector: `TC-0013-0043: Defect row seeding appends one case and one row`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/defectRowSeeding.test.ts --testNamePattern='TC-0013-0043: Defect row seeding appends one case and one row' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); the `### Defect row seeding` text landed with the rows this batch closed before
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/sdd/defectRowSeeding.test.ts`
- Reopened by: CR-20260925-0020 part A; the case asserts that the row is for behaviour the spec already states and files no Change Request, with no decision ID.
- The shipped text names the work order by its operation, `defect-row-seeding`; `sdd_append` is the stage kind the core issues it under and does not ship.

### TDD-0121

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/sdd/workOrderTarget.test.ts`
- Selector: `TC-0013-0047: A work order without a target is refused`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sdd/workOrderTarget.test.ts --testNamePattern='TC-0013-0047: A work order without a target is refused' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); the `## Operations` text landed with the rows this batch closed before
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/sdd/workOrderTarget.test.ts`
- Reopened by: CR-20260925-0020 part A; the case dropped its citation clause.

### TDD-0126

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E. Discharged by the spec-0018 US-0018-0001 journey: the routing-time `create` answer is the only one asked, and the SDD work order targets the approved `new_capability` slot with no second question; the test carries `QFAI:SPEC-0013:US-0013-0015`.
- Test file: `packages/qfai/tests/e2e/spec0018DeliverAFeatureE2E.test.ts`
- Selector: `US-0018-0001 (TDD-0455): one create question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018DeliverAFeatureE2E.test.ts --testNamePattern='US-0018-0001 \(TDD-0455\): one create question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1, shared with spec-0018 TDD-0455: the journey stopped at the seam round trip, since `next` issued no seam-only work order after an acceptance result asking for a seam (the journal fold kept no seam request)
- GREEN result: exit 0; `✓ |e2e| tests/e2e/spec0018DeliverAFeatureE2E.test.ts > US-0018-0001 (TDD-0455): one create question, then every stage from its work order, and finish qfai_done`
- Production files: `packages/qfai/src/core/workflow/persistence.ts` (`foldSeam`), under spec-0018 TDD-0455

### TDD-0128

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E. Discharged by the spec-0018 US-0018-0001 journey: the `qfai-sdd` work order names exactly its operation and target, and every later work order targets the spec SDD bound; the test carries `QFAI:SPEC-0013:US-0013-0017`.
- Test file: `packages/qfai/tests/e2e/spec0018DeliverAFeatureE2E.test.ts`
- Selector: `US-0018-0001 (TDD-0455): one create question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018DeliverAFeatureE2E.test.ts --testNamePattern='US-0018-0001 \(TDD-0455\): one create question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1, shared with spec-0018 TDD-0455: the journey stopped at the seam round trip, since `next` issued no seam-only work order after an acceptance result asking for a seam (the journal fold kept no seam request)
- GREEN result: exit 0; `✓ |e2e| tests/e2e/spec0018DeliverAFeatureE2E.test.ts > US-0018-0001 (TDD-0455): one create question, then every stage from its work order, and finish qfai_done`
- Production files: `packages/qfai/src/core/workflow/persistence.ts` (`foldSeam`), under spec-0018 TDD-0455

### TDD-0129

- Retired: row deleted 2026-09-25 in the merge reconciliation. It duplicated origin/main's application of the same approved option of CR-20260913-0012, and TDD-0081 now owns its case. Its test file was deleted; the checks it made that TDD-0081's test lacked moved there. The record below is kept as it was written.
- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Seeded by: `CR-20260913-0012` (option 1, applied); the request is resolved.
- Test file: `packages/qfai/tests/integration/sddPreflightOptionalArtifact.test.ts`
- Selector: `TC-0013-0036: Missing optional side artifact leaves preflight ready`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/sddPreflightOptionalArtifact.test.ts --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (2 passed). `qfai sdd preflight --format json` returns exit 0, `ready` and no blockers with and without the file; the preflight treats the file as optional already.
- GREEN result: exit 0; 2 passed (2)
- Changed files: `packages/qfai/tests/integration/sddPreflightOptionalArtifact.test.ts`

### TDD-0130

- Retired: row deleted 2026-09-25 in the merge reconciliation. It duplicated origin/main's application of the same approved option of CR-20260913-0012, and TDD-0082 and TDD-0083 now own its case. Its test file was deleted; the checks it made that TDD-0082 and TDD-0083's test lacked moved there. The record below is kept as it was written.
- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Seeded by: `CR-20260913-0012` (option 1, applied); the request is resolved.
- Test file: `packages/qfai/tests/integration/sddPreflightOptionalArtifact.test.ts`
- Selector: `TC-0013-0037: Invalid or legacy optional side artifact leaves preflight ready`
- RED command (cwd `packages/qfai`): as TDD-0129
- RED result: already satisfied: exit 0 on the first run; a schema-invalid namespaced file and a legacy-only file each leave the verdict `ready` with no blockers
- GREEN result: exit 0; 2 passed (2)
- Changed files: `packages/qfai/tests/integration/sddPreflightOptionalArtifact.test.ts`

### Withdrawn TDD-0110 (never merged)

- Renumbered: `TDD-0044` before the merge (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"). The rounds below were recorded under the old IDs and test titles, shown here mapped. They are history: the row is `todo` again.
- Re-completion: `/qfai-atdd` run started 2026-09-25T02:23:00.972Z takes this row again in `#### Round 2`. The `Branch`, `Status`, `Scope approval`, `Handoff` and `qa-gatekeeper` lines above `#### Round 1` describe Round 1.

- TDD-ID: TDD-0110
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
- TC-ref: TC-0013-0038
- Boundary: `record-homes-stated`
- EX-ref: EX-0013-0023; AC-ref: AC-0013-0030; BR-ref: BR-0013-0023
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` `## Work-log entries` sends these records to a `.qfai/steering/<id>.md` entry, and no text of the skill sends an out-of-scope discovery anywhere. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- qa-gatekeeper: PASS x2 (instance `impl13-qa`, Round 2 — qa-gatekeeper#1, `/qfai-implement` step 3c falsifiability gate, routing phase `red`, on the mutated tree, reviewed revision working-tree+c1b7f0cf2933a38d7f85d7c1504d02c28c2f67090ad1c4e0fa1bcbab215df17f at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T02:53:32Z; qa-gatekeeper#2, build-phase GREEN + Oracle proof, reviewed revision working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:22:07Z)
  - Freshness: the tree address recomputed twice to `Round 2: Falsifiability revision`, before and after the gate's run. The test hash recomputed in the gate form to `c7e9ad69…bff2b1`, the value the Round 2 scope PASS covers, and the test file is unchanged against HEAD. The only production change in the tree is line 369 of `qfai-sdd/SKILL.md`, and it equals mutation 2's recorded diff. The pre-mutation copy hashes to the committed blob's `883bb9d8…1817d5`.
  - Satisfied-by: a path plus the named paragraph of `## Mandatory Outputs`. This form is open to an `Integration` row handed over by `/qfai-atdd`. The row carries no `Pre-split-evidence: implement`, and TC-0013-0038 declares `Level: integration`, so neither exception applies. The paragraph is a single predicate with a boundary, and it is not a commit id.
  - Ownership: both mutations edit only that paragraph. It is in the row's `Owning module`, and it is what `Satisfied-by` names, so it counts as the owned code for this check. No manifest file is touched.
  - Discrimination: each mutation removes one half of `record-homes-stated` and keeps the other half true. Mutation 1 removes the out-of-scope discovery, which gives `consultationOrDiscovery: false` and `decision: true`. Mutation 2 removes the `07_Decisions.md` home, which gives `decision: false` and `consultationOrDiscovery: true`. Neither is a load failure: the module loaded, the read-proof at line 63 passed, and the failure is the assertion at line 88 inside this row's selector, with the other three `it` entries skipped by the filter.
  - Observation: the gatekeeper re-ran the recorded command on this tree. It exited 1 with the same failure recorded for mutation 2. Mutation 1 was not re-run. Its log (`f0110-m1.txt`) matches the recorded output, and the tree returned to the hand-off address before mutation 2 was applied.
  - Command: `Round 2: Falsifiability command` is character for character the classification command, which the hand-off also names as the GREEN command.
  - Scope: not adjudicated here. The Round 2 `delivery-planner` PASS (`atdd13-scope`) is the item-scope authority, and no REVISE is open on it.
  - Next: revert mutation 2 byte for byte from the pre-mutation copy, confirm the tree returns to `working-tree+71d85ec5…d09bcfd3b`, and take the restored run as `Round 2: GREEN command` / `Round 2: GREEN result`. Both mutations then stand as the Oracle proof at the build gate.
  - Build gate (qa-gatekeeper#2, `/qfai-implement` item 5, Phase Green steps 2 and 3): PASS.
    - Tree: the address recomputed to `Round 2: Revision` before and after the gatekeeper's runs. `git status` shows no production change. `SKILL.md` is byte-equal to blob `c35700bf1`, so the restore after step 3c is complete. The test hash is unchanged.
    - GREEN: `Round 2: GREEN command` equals `Round 2: Falsifiability command` character for character, and its `-t` filter is this row's `Selector`. The recorded run (2026-09-25T02:56:04.136Z) exits 0, and its output names this selector as passing, with `1 passed | 3 skipped (4)` and nothing failed. The gatekeeper re-ran it on this tree at 2026-09-25T03:22:07Z: exit 0, same selector passing, same counts.
    - No production code: branch 2, so Phase Green writes nothing. The GREEN is the text `Round 2: Satisfied-by` names, restored to its committed blob. Item 4 is waived under `red-not-observable.md`.
    - Oracle proof: the two step 3c mutations (step 3), one per half of `record-homes-stated`, which passed the Oracle Strength Check at the falsifiability gate. Each mutation was in the owned code, failed on this row's assertion and not at load, and ran on the GREEN command. Step 2a is exempt on branch 2.
    - Scope: the run executes this row's selector only, and the file's other entries are skipped by the filter. The GREEN asserts nothing beyond the row's one boundary, and the `delivery-planner` Round 2 PASS is unchanged. Item scope is not adjudicated here.
    - Ledger: the row is still `red`, so `red -> green` follows this gate, as ordered. The `Evidence` cell is still `-`. It must be filled in the grammar of `evidence-cell-grammar.md` when the row reaches `green`, where `TDDLIST_EVIDENCE_EMPTY` would fire on `-`.
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
    `32f2b472…09ba66`, with the single selector entry above. `TDD-0112`'s
    fix changes the file hash. The resubmission must show this `it` unchanged,
    and I re-confirm it on the new hash before the RED runs.
  - Sufficiency: both routes of TC-0013-0038's first bullet, across
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
    tree tokens belong to `TDD-0112` … `TDD-0114`.
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
    change in the file is `TDD-0112`'s one line, which this row does not use.
    The earlier PASS reasons hold.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0110`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
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

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
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
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 47ms
   → expected { decision: false, …(1) } to deeply equal { decision: true, …(1) }
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
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
@@ -60,13 +60,11 @@ describe("TC-0013-0038: records go to the spec pack", () => {
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
@@ -85,7 +83,7 @@ describe("TC-0013-0038: records go to the spec pack", () => {
           block.includes("Change Request"),
       ),
     };
-    expect(stated).toEqual({ decision: true, consultationOrDiscovery: true });
+    void [stated, { decision: true, consultationOrDiscovery: true }, expect];
   });

   it("TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 51ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:01:49
   Duration  860ms (transform 89ms, setup 87ms, import 42ms, tests 53ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
  1. Delete the out-of-scope discovery clause from the statement the GREEN writes. The
     selector must fail on `consultationOrDiscovery`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The walk read-proof passed. The failure is the assertion at line 88 inside the selector: no block of `SKILL.md` or `references/` ties a decision to `07_Decisions.md` and a Change Request, and none ties a consultation and an out-of-scope discovery to `08_Open-questions.md` and a Change Request. That is the predicate.
  - Scope against TC-0013-0038 (`record-homes-stated`) / EX-0013-0023 / AC-0013-0030 / BR-0013-0023: both routes, presence per S1 D11, with the one-statement shape the scope approval accepted. Nothing else is asserted.
  - Oracle proof plan: delete the out-of-scope discovery clause from the statement the GREEN writes. It names the GREEN command. Acceptable. Advisory: it exercises only the `consultationOrDiscovery` half. A second mutation removing `07_Decisions.md` from the decision statement would show the `decision` half discriminates.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 32ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`; Result: exit 1, assertion failed inside selector `TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Removed `out-of-scope discovery` from the `08_Open-questions.md` sentence; the result reported `consultationOrDiscovery: false` at `spec0013RecordHomes.test.ts:88:20`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
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

2. Removed `07_Decisions.md` from the decision sentence; the result reported `decision: false` at `spec0013RecordHomes.test.ts:88:20`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
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

#### Round 2

- Branch: falsifiability (branch 2), confirmed: the classification run and the P4b re-run below both passed. The text this row asserts on is in the tree, and DR-0013-0017 (grilling decision D6) rules out reverting it to manufacture a RED.
- Expected classification result, from reading the tree and not from a run: pass. The opening paragraph of `## Mandatory Outputs` in `SKILL.md` is one block that names a decision with `07_Decisions.md` and a Change Request, and a consultation and an out-of-scope discovery with `08_Open-questions.md` and a Change Request.
- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"` (also the falsifiability and GREEN command)
- Test hash at hand-off for scope approval (gate form): c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
- Test manifest: `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` alone. The file imports only `node:fs/promises`, `node:path` and `vitest`, and reads no test-owned fixture, snapshot or helper.
- Tree at hand-off for scope approval: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b (HEAD `1e09c3067fae3588c4763a9f6f9a17681948c5c0`, working tree clean; taken twice with equal results, with no vitest process running)
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the selector matches no other `it` in the file.
- Round 2: Satisfied-by: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `## Mandatory Outputs`, its opening paragraph: "Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request." No other block of `SKILL.md` or `references/**` names an out-of-scope discovery.
- Predicate to break (approved with the scope, for `/qfai-implement` Phase Red step 3c): in that paragraph, delete ` or out-of-scope discovery`. The selector must then fail at line 88 with `consultationOrDiscovery: false` and `decision: true`. One line of `SKILL.md`, in the row's `Owning module`, and no manifest file.
  - Second mutation, for the `decision` half, run after the first is reverted: replace ``the spec's `07_Decisions.md` `` with "the spec's decision record" in the same paragraph. The selector must then fail at line 88 with `decision: false` and `consultationOrDiscovery: true`. Both mutations are this row's step 3c proposal; each is applied alone, run, and reverted.
- Scope approval (`delivery-planner`), Round 2:
  - Approver: `delivery-planner`, instance `atdd13-scope`
  - Verdict: PASS
  - Time: relayed by the coordinator; recorded here at 2026-09-25T02:33:19.854Z, before any run of this selector
  - Covers: test hash `c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1`, at tree `working-tree+71d85ec5…d09bcfd3b`, which the planner recomputed, and the single selector entry above. If the test file, a manifest entry or the selector changes, this approval lapses.
  - Reasons: the `Satisfied-by` above is a legal form on an `Integration` row handed over by `/qfai-atdd`, and the mutation is minimal. The planner found no oracle weakening against `e37b2fa82`, and accepted the overlap between the `TDD-0112` and `TDD-0115` predicates as structural.
  - Advisories taken: the index cells of `## Ledger rows advanced` are updated after classification, and `TDD-0110`'s second mutation is part of its step 3c proposal.
- Classification run (branch choice; not RED evidence): run at 2026-09-25T02:34:17.303Z, after the scope PASS recorded at 2026-09-25T02:33:19.854Z. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the selector executed and passed, because the opening paragraph of `## Mandatory Outputs` already ties both record kinds to their homes. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged. A first run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 15ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:34:19
   Duration  359ms (transform 65ms, setup 62ms, import 35ms, tests 17ms, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-25T02:34:31.120Z. Same command, tree and test hash, with the same captures before and after it. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the branch still holds. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 17ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:34:33
   Duration  368ms (transform 65ms, setup 69ms, import 32ms, tests 19ms, environment 0ms)
exit=0
```

- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming this row. Branch `falsifiability`, with its trio not yet written, which is the ordinary case. Step 3c:
  1. takes `Round 2: RED test hash` and its fenced `Round 2: RED test manifest` before the mutation; the mutation lands in no manifest file;
  2. applies each predicate to break above on its own, runs this row's selector, and reverts it before the next, recording both runs under `Round 2: Falsifiability command` and `Round 2: Falsifiability result`, with `Round 2: RED failure mode: falsifiability` and a `Round 2: Falsifiability revision` per mutated tree;
  3. routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Stage gate P1a first: `/qfai-implement` `Phase: Skeleton` is re-run for this invocation before any mutation run.
  - Ledger cells from this entry: `Test file` and `Selector` from the row identity above, equal to the ledger's cells today; `Evidence` pointing at `.qfai/evidence/atdd-spec-0013.md#tdd-0110`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - No production file is changed by this stage.

- Step 3b (`/qfai-implement`, run started 2026-09-25T02:45:32.177Z, backend-engineer
  `impl13-author`): entry verified.
  - Branch `falsifiability`, and Round 2 holds `Satisfied-by` with no trio and no
    `qa-gatekeeper` verdict on one, so the row goes to step 3c.
  - The selector is one entry over one boundary, `record-homes-stated`. It equals the
    ledger's `Selector`, `new RegExp(selector).test(selector)` is `true`, and it matches one
    of the file's four `it` titles.
  - The test hash recomputed in the gate form to the approved `c7e9ad69…bff2b1`, and the tree
    address, taken twice, to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`.
  - No ledger cell is written yet. Step 3c writes `todo -> red` on the `qa-gatekeeper` PASS,
    together with `Test file` and `Selector`, which already equal this entry's.
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
  (gate form, taken at 2026-09-25T02:48:47.733Z before either mutation, on
  `working-tree+71d85ec5…d09bcfd3b`; it recomputed to the same value after mutation 1's
  restore and with mutation 2 applied, since neither mutation lands in a manifest file)
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 2: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
- Round 2: Falsifiability result: exit 1 for each of the two approved mutations, each run alone on a tree holding only that mutation; 1 test failed on the assertion at line 88 inside this row's selector, with the file's other three `it` entries skipped by the filter. Both mutations edit line 369 of `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, the opening paragraph of `## Mandatory Outputs` that `Round 2: Satisfied-by` names, in the row's `Owning module`. Before each mutation the file was byte-equal to its committed blob `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5` (SHA-256 `883bb9d8…1817d5`). Mutation 1 was restored byte for byte from that copy before mutation 2 was applied, and the tree address returned to `working-tree+71d85ec5…d09bcfd3b`, taken twice. Mutation 2 is in the tree for the gate.

1. Mutation 1, the predicate to break: delete ` or out-of-scope discovery`. Run at
   2026-09-25T02:49:09.139Z. `consultationOrDiscovery` is `false` and `decision` stays `true`,
   because no other block of `SKILL.md` or `references/**` names an out-of-scope discovery.

```diff
@@ -369 +369 @@ Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-re
-Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request.
+Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation in `08_Open-questions.md` or a Change Request.
```

```text
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 19ms
   → expected { decision: true, …(1) } to deeply equal { decision: true, …(1) }
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
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


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  11:49:20
   Duration  833ms (transform 63ms, setup 64ms, import 39ms, tests 21ms, environment 0ms)

exit=1
```

2. Mutation 2, the second mutation: replace ``the spec's `07_Decisions.md` `` with "the spec's
   decision record". Run at 2026-09-25T02:49:51.328Z. `decision` is `false` and
   `consultationOrDiscovery` stays `true`.

```diff
@@ -369 +369 @@ Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-re
-Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request.
+Record a decision in the spec's decision record or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request.
```

```text
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 20ms
   → expected { decision: false, …(1) } to deeply equal { decision: true, …(1) }
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
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


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  11:49:53
   Duration  336ms (transform 63ms, setup 62ms, import 30ms, tests 21ms, environment 0ms)

exit=1
```

- Round 2: Falsifiability revision: working-tree+c1b7f0cf2933a38d7f85d7c1504d02c28c2f67090ad1c4e0fa1bcbab215df17f
  (mutation 2's tree, in place for the gate; taken twice before and twice after its run,
  all four equal. Mutation 1 ran on
  `working-tree+d465d9e034336fd3d13af7811fff000a08f5185f4d8fea58f5f3751637551426`, taken
  the same way before its restore. `git status --short .qfai/decisions` printed nothing
  at every capture, and no vitest process other than these runs was running.)

- Revert (after the `qa-gatekeeper` verdict, at 2026-09-25T02:55:53Z): `SKILL.md` restored
  from its pre-mutation copy. It is byte-equal to that copy (SHA-256 `883bb9d8…1817d5`) and
  to the committed blob `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5`. The tree address, taken
  twice, returned to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`, and the RED test
  hash still recomputes to `c7e9ad69…bff2b1`.
- Round 2: Revision: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b
- Round 2: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md"`
- Round 2: GREEN result: exit 0; 1 test passed, and the verbose output names this row's selector as passing, with the other three `it` entries left out by the filter (1 passed, 3 skipped). The restored run, taken at 2026-09-25T02:56:04.136Z on the tree named by `Round 2: Revision`, which was the same before and after the run. The step 3c mutations are this row's `Oracle proof`, so Phase Green step 2a is not repeated.

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md 17ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:56:05
   Duration  361ms (transform 66ms, setup 65ms, import 30ms, tests 18ms, environment 0ms)

exit=0
```

- Ledger write: todo -> red at 2026-09-25T02:56:15.914Z, after the step 3c `qa-gatekeeper`
  PASS, with `Test file` and `Selector` written from the row identity above (unchanged
  values). `Evidence` stays `-` at `red`. `red -> green` waits for the build-phase
  `qa-gatekeeper` gate on this GREEN, which the coordinator runs over all six rows.

### TDD-0112

- Renumbered: `TDD-0046` before the merge (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"). The rounds below were recorded under the old IDs and test titles, shown here mapped. They are history: the row is `todo` again.
- Re-completion: `/qfai-atdd` run started 2026-09-25T02:23:00.972Z takes this row again in `#### Round 2`. The `Branch`, `Status`, `Scope approval`, `Handoff` and `qa-gatekeeper` lines above `#### Round 1` describe Round 1.

- TDD-ID: TDD-0112
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
- TC-ref: TC-0013-0038
- Boundary: `no-worklog-section`
- EX-ref: EX-0013-0023; AC-ref: AC-0013-0030; BR-ref: BR-0013-0023
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` has a `## Work-log entries` section. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- qa-gatekeeper: PASS x2 (instance `impl13-qa`, Round 2 — qa-gatekeeper#1, `/qfai-implement` step 3c falsifiability gate, routing phase `red`, on the mutated tree, reviewed revision working-tree+c8e93ce8ee44c4566f6d5dd24e0d1a7e2726509d6f9bf8456683ccbe730a7442 at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T02:59:47Z; qa-gatekeeper#2, build-phase GREEN + Oracle proof, reviewed revision working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:22:10Z)
  - Freshness: the tree address recomputed twice to `Round 2: Falsifiability revision`, and once more after the gate's run. The test hash recomputed in the gate form to `c7e9ad69…bff2b1`, the value the Round 2 scope PASS covers, and the test file is unchanged against HEAD. `SKILL.md` hashes to `c25d1e6c…2e360`. Its only difference from blob `c35700bf1` is the recorded two-line insertion. TDD-0110's mutation is no longer in the tree.
  - Satisfied-by: a path plus the property it holds: no line contains `## Work-log entries`. This form is open to an `Integration` row handed over by `/qfai-atdd`. The row's `Evidence` cell is `-`, so there is no `Pre-split-evidence: implement`, and TC-0013-0038 declares `Level: integration`. The absence names one predicate with a boundary.
  - Ownership: the mutation adds one heading and one blank line to the file `Satisfied-by` names. That file is in the row's `Owning module`. No manifest file is touched.
  - Discrimination: the inserted heading is the substring the absence oracle reads, so it breaks this row's predicate and nothing else it asserts. The failure is not a load failure. The module loaded, the read-proof at line 97 passed (the anchor heading was found once), and the failure is the assertion at line 99 inside this row's selector, receiving `["## Work-log entries"]`, with the other three `it` entries skipped.
  - Overlap with TDD-0115: that predicate contains this one, so no mutation of this absence can avoid it. TDD-0115's selector is in `spec0013ApprovalStop.test.ts`, which this command does not run, so the failing output names only this row's selector. The Round 2 scope PASS judged the overlap structural, and it is not a discrimination defect.
  - Observation: the gatekeeper re-ran the recorded command on this tree, and it exited 1 with the recorded failure.
  - Command: `Round 2: Falsifiability command` is character for character the classification command, which the hand-off also names as the GREEN command.
  - Scope: not adjudicated here. The Round 2 `delivery-planner` PASS (`atdd13-scope`) holds, and no REVISE is open on it.
  - Next: remove the two inserted lines, confirm `SKILL.md` is byte-equal to blob `c35700bf1` and the tree is back at `working-tree+71d85ec5…d09bcfd3b`, and take the restored run as `Round 2: GREEN command` / `Round 2: GREEN result`.
  - Build gate (qa-gatekeeper#2, `/qfai-implement` item 5, Phase Green steps 2 and 3): PASS.
    - Tree: the address recomputed to `Round 2: Revision` before and after the gatekeeper's runs. `git status` shows no production change. `SKILL.md` is byte-equal to blob `c35700bf1`, so the restore after step 3c is complete. The test hash is unchanged.
    - GREEN: `Round 2: GREEN command` equals `Round 2: Falsifiability command` character for character, and its `-t` filter is this row's `Selector`. The recorded run (2026-09-25T03:00:58.753Z) exits 0, and its output names this selector as passing, with `1 passed | 3 skipped (4)` and nothing failed. The gatekeeper re-ran it on this tree at 2026-09-25T03:22:10Z: exit 0, same selector passing, same counts.
    - No production code: branch 2, so Phase Green writes nothing. The GREEN is the text `Round 2: Satisfied-by` names, restored to its committed blob. Item 4 is waived under `red-not-observable.md`.
    - Oracle proof: the step 3c heading insertion (step 7), which passed the Oracle Strength Check at the falsifiability gate. Each mutation was in the owned code, failed on this row's assertion and not at load, and ran on the GREEN command. Step 2a is exempt on branch 2.
    - Scope: the run executes this row's selector only, and the file's other entries are skipped by the filter. The GREEN asserts nothing beyond the row's one boundary, and the `delivery-planner` Round 2 PASS is unchanged. Item scope is not adjudicated here.
    - Ledger: the row is still `red`, so `red -> green` follows this gate, as ordered. The `Evidence` cell is still `-`. It must be filled in the grammar of `evidence-cell-grammar.md` when the row reaches `green`, where `TDDLIST_EVIDENCE_EMPTY` would fire on `-`.
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
       `TDD-0110`, `TDD-0113` and `TDD-0114` too.
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
    `.qfai/evidence/atdd-spec-0013.md#tdd-0112`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
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

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`
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
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 42ms
   → expected [ …(2) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
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
@@ -91,12 +91,10 @@ describe("TC-0013-0038: records go to the spec pack", () => {
   it("TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section", async () => {
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

   it("TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 16ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:01:56
   Duration  554ms (transform 74ms, setup 73ms, import 47ms, tests 18ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`
  1. Re-insert the `## Work-log entries` heading. The selector must fail.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The anchor read-proof passed. The failure is the assertion at line 99 inside the selector: the heading `## Work-log entries` and the cross-reference to it in the approval-stop bullet. The substring match the REVISE required catches both. That is the predicate.
  - Scope against TC-0013-0038 (`no-worklog-section`): one absence over `SKILL.md`, case-sensitive per S1 D11. Nothing else is asserted.
  - Oracle proof plan: re-insert the heading. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 21ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`; Result: exit 1, assertion failed inside selector `TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted the `## Work-log entries` heading into `SKILL.md`; the result found the heading at `spec0013RecordHomes.test.ts:99:74`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
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

#### Round 2

- Branch: falsifiability (branch 2), confirmed: the classification run and the P4b re-run below both passed. The text this row asserts on is in the tree, and DR-0013-0017 (grilling decision D6) rules out reverting it to manufacture a RED.
- Expected classification result, from reading the tree and not from a run: pass. `SKILL.md` carries the line ``### `--auto` and approval-required rows`` once and no line containing `## Work-log entries`.
- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"` (also the falsifiability and GREEN command)
- Test hash at hand-off for scope approval (gate form): c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
- Test manifest: `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` alone. The file imports only `node:fs/promises`, `node:path` and `vitest`, and reads no test-owned fixture, snapshot or helper.
- Tree at hand-off for scope approval: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b (HEAD `1e09c3067fae3588c4763a9f6f9a17681948c5c0`, working tree clean; taken twice with equal results, with no vitest process running)
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the selector matches no other `it` in the file.
- Round 2: Satisfied-by: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`: no line contains `## Work-log entries`.
- Predicate to break (approved with the scope, for `/qfai-implement` Phase Red step 3c): insert the line `## Work-log entries`, followed by a blank line, directly above `## Mandatory Outputs` in `SKILL.md`. The selector must then fail at line 99, receiving `["## Work-log entries"]`. The row's `Owning module`, and no manifest file. The inserted line also contains `work-log`, which `TDD-0115`'s whole-file check reads; every line holding `## Work-log entries` does, and only this row's selector runs.
- Scope approval (`delivery-planner`), Round 2:
  - Approver: `delivery-planner`, instance `atdd13-scope`
  - Verdict: PASS
  - Time: relayed by the coordinator; recorded here at 2026-09-25T02:33:19.854Z, before any run of this selector
  - Covers: test hash `c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1`, at tree `working-tree+71d85ec5…d09bcfd3b`, which the planner recomputed, and the single selector entry above. If the test file, a manifest entry or the selector changes, this approval lapses.
  - Reasons: the `Satisfied-by` above is a legal form on an `Integration` row handed over by `/qfai-atdd`, and the mutation is minimal. The planner found no oracle weakening against `e37b2fa82`, and accepted the overlap between the `TDD-0112` and `TDD-0115` predicates as structural.
  - Advisories taken: the index cells of `## Ledger rows advanced` are updated after classification, and `TDD-0110`'s second mutation is part of its step 3c proposal.
- Classification run (branch choice; not RED evidence): run at 2026-09-25T02:34:44.702Z, after the scope PASS recorded at 2026-09-25T02:33:19.854Z. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the selector executed and passed, because no line of `SKILL.md` contains `## Work-log entries`. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged. A first run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 4ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:34:46
   Duration  359ms (transform 63ms, setup 65ms, import 31ms, tests 6ms, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-25T02:34:53.019Z. Same command, tree and test hash, with the same captures before and after it. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the branch still holds. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 5ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:34:55
   Duration  397ms (transform 67ms, setup 65ms, import 35ms, tests 6ms, environment 0ms)
exit=0
```

- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming this row. Branch `falsifiability`, with its trio not yet written, which is the ordinary case. Step 3c:
  1. takes `Round 2: RED test hash` and its fenced `Round 2: RED test manifest` before the mutation; the mutation lands in no manifest file;
  2. applies the predicate to break above, runs this row's selector, and records `Round 2: Falsifiability command`, `Round 2: Falsifiability result`, `Round 2: RED failure mode: falsifiability` and `Round 2: Falsifiability revision`;
  3. routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Stage gate P1a first: `/qfai-implement` `Phase: Skeleton` is re-run for this invocation before any mutation run.
  - Ledger cells from this entry: `Test file` and `Selector` from the row identity above, equal to the ledger's cells today; `Evidence` pointing at `.qfai/evidence/atdd-spec-0013.md#tdd-0112`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - No production file is changed by this stage.

- Step 3b (`/qfai-implement`, run started 2026-09-25T02:45:32.177Z, backend-engineer
  `impl13-author`): entry verified.
  - Branch `falsifiability`, and Round 2 holds `Satisfied-by` with no trio and no
    `qa-gatekeeper` verdict on one, so the row goes to step 3c.
  - The selector is one entry over one boundary, `no-worklog-section`. It equals the ledger's
    `Selector`, `new RegExp(selector).test(selector)` is `true`, and it matches one of the
    file's four `it` titles.
  - The test hash recomputed in the gate form to the approved `c7e9ad69…bff2b1`, and the tree
    address, taken twice, to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`, after
    `TDD-0110`'s mutation had been reverted to the committed blob.
  - No ledger cell is written yet. Step 3c writes `todo -> red` on the `qa-gatekeeper` PASS.
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
  (gate form, taken at 2026-09-25T02:57:25.146Z before the mutation, on
  `working-tree+71d85ec5…d09bcfd3b`; it recomputed to the same value with the mutation
  applied, since the mutation lands in no manifest file)
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 2: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`
- Round 2: Falsifiability result: exit 1; 1 test failed on the assertion at line 99 inside this row's selector, receiving `["## Work-log entries"]`, with the file's other three `it` entries skipped by the filter. The read-proof at line 97 passed first: the heading ``### `--auto` and approval-required rows`` was found once. Run at 2026-09-25T02:57:46.036Z. The mutation is the predicate to break approved with the scope: the line `## Work-log entries` and a blank line inserted directly above `## Mandatory Outputs` in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, the file `Round 2: Satisfied-by` names, in the row's `Owning module`. Before it, the file was byte-equal to its committed blob `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5` (SHA-256 `883bb9d8…1817d5`). The mutation is in the tree for the gate.

```diff
@@ -364,6 +364,8 @@ Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-re
 11. Run validate; fix source-layer artifacts and rerun until `error=0`.
 12. Triage density-smell warnings in `.qfai/report/specs-coverage/spec-*.md`.

+## Work-log entries
+
 ## Mandatory Outputs

 Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request.
```

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 11ms
   → expected [ '## Work-log entries' ] to deeply equal []
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
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


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  11:57:47
   Duration  389ms (transform 72ms, setup 72ms, import 33ms, tests 12ms, environment 0ms)

exit=1
```

- Round 2: Falsifiability revision: working-tree+c8e93ce8ee44c4566f6d5dd24e0d1a7e2726509d6f9bf8456683ccbe730a7442
  (the mutated tree, taken twice before and twice after the run, all four equal.
  `git status --short .qfai/decisions` printed nothing at every capture, and no other
  vitest process was running.)

- Revert (after the `qa-gatekeeper` verdict, at 2026-09-25T03:00:47Z): `SKILL.md` restored
  from its pre-mutation copy, byte-equal to that copy and to the committed blob
  `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5`. The tree address, taken twice, returned to the
  hand-off tree `working-tree+71d85ec5…d09bcfd3b`, and the RED test hash still recomputes to
  `c7e9ad69…bff2b1`. A vitest process this run did not start (PID 36968) was seen once
  while the mutation was live, at 2026-09-25T02:59:14Z, during the gate. It had exited
  before it could be traced, and the address at that capture was still
  `working-tree+c8e93ce8…a7442`, taken twice.
- Round 2: Revision: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b
- Round 2: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section"`
- Round 2: GREEN result: exit 0; 1 test passed, and the verbose output names this row's selector as passing, with the other three `it` entries left out by the filter (1 passed, 3 skipped). The restored run, taken at 2026-09-25T03:00:58.753Z on the tree named by `Round 2: Revision`, which was the same before and after the run. The step 3c mutation is this row's `Oracle proof`, so Phase Green step 2a is not repeated.

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section 4ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  12:01:00
   Duration  325ms (transform 61ms, setup 61ms, import 28ms, tests 6ms, environment 0ms)

exit=0
```

- Ledger write: todo -> red at 2026-09-25T03:01:05.111Z, after the step 3c `qa-gatekeeper`
  PASS, with `Test file` and `Selector` written from the row identity above (unchanged
  values). `Evidence` stays `-` at `red`. `red -> green` waits for the build-phase
  `qa-gatekeeper` gate on this GREEN, which the coordinator runs over all six rows.

### TDD-0113

- Renumbered: `TDD-0047` before the merge (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"). The rounds below were recorded under the old IDs and test titles, shown here mapped. They are history: the row is `todo` again.
- Re-completion: `/qfai-atdd` run started 2026-09-25T02:23:00.972Z takes this row again in `#### Round 2`. The `Branch`, `Status`, `Scope approval`, `Handoff` and `qa-gatekeeper` lines above `#### Round 1` describe Round 1.

- TDD-ID: TDD-0113
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
- TC-ref: TC-0013-0038
- Boundary: `no-pending-promotion-example`
- EX-ref: EX-0013-0023; AC-ref: AC-0013-0030; BR-ref: BR-0013-0023
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: `SKILL.md` cites a `W-PENDING-PROMOTION` decision as an example of carry-over. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- qa-gatekeeper: PASS x2 (instance `impl13-qa`, Round 2 — qa-gatekeeper#1, `/qfai-implement` step 3c falsifiability gate, routing phase `red`, on the mutated tree, reviewed revision working-tree+83151f462c14893bfe5183665e846a69524495b4740fc5875a4c642e240d7747 at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:04:02Z; qa-gatekeeper#2, build-phase GREEN + Oracle proof, reviewed revision working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:22:13Z)
  - Freshness: the tree address recomputed twice to `Round 2: Falsifiability revision`, and once more after the gate's run. The test hash recomputed in the gate form to `c7e9ad69…bff2b1`, the value the Round 2 scope PASS covers, and the test file is unchanged against HEAD. `SKILL.md` hashes to `b152dc21…507254`. Its only difference from blob `c35700bf1` is the recorded two-line insertion. TDD-0112's mutation is no longer in the tree.
  - Satisfied-by: a path plus the property it holds: no line contains `W-PENDING-PROMOTION`. This form is open to an `Integration` row handed over by `/qfai-atdd`. The row's `Evidence` cell is `-`, so there is no `Pre-split-evidence: implement`, and TC-0013-0038 declares `Level: integration`. The absence names one predicate with a boundary.
  - Ownership: the mutation adds one paragraph and one blank line to the file `Satisfied-by` names. That file is in the row's `Owning module`. No manifest file is touched.
  - Discrimination: the inserted paragraph cites `W-PENDING-PROMOTION` as an example, which is the property `no-pending-promotion-example` forbids and the substring its oracle reads. The failure is not a load failure. The module loaded, the read-proof at line 108 passed (the anchor heading was found once), and the failure is the assertion at line 110 inside this row's selector, receiving ``["For example, `W-PENDING-PROMOTION`."]``, with the other three `it` entries skipped.
  - Observation: the gatekeeper re-ran the recorded command on this tree, and it exited 1 with the recorded failure.
  - Command: `Round 2: Falsifiability command` is character for character the classification command, which the hand-off also names as the GREEN command.
  - Scope: not adjudicated here. The Round 2 `delivery-planner` PASS (`atdd13-scope`) holds, and no REVISE is open on it.
  - Next: remove the two inserted lines, confirm `SKILL.md` is byte-equal to blob `c35700bf1` and the tree is back at `working-tree+71d85ec5…d09bcfd3b`, and take the restored run as `Round 2: GREEN command` / `Round 2: GREEN result`.
  - Build gate (qa-gatekeeper#2, `/qfai-implement` item 5, Phase Green steps 2 and 3): PASS.
    - Tree: the address recomputed to `Round 2: Revision` before and after the gatekeeper's runs. `git status` shows no production change. `SKILL.md` is byte-equal to blob `c35700bf1`, so the restore after step 3c is complete. The test hash is unchanged.
    - GREEN: `Round 2: GREEN command` equals `Round 2: Falsifiability command` character for character, and its `-t` filter is this row's `Selector`. The recorded run (2026-09-25T03:05:35.055Z) exits 0, and its output names this selector as passing, with `1 passed | 3 skipped (4)` and nothing failed. The gatekeeper re-ran it on this tree at 2026-09-25T03:22:13Z: exit 0, same selector passing, same counts.
    - No production code: branch 2, so Phase Green writes nothing. The GREEN is the text `Round 2: Satisfied-by` names, restored to its committed blob. Item 4 is waived under `red-not-observable.md`.
    - Oracle proof: the step 3c paragraph insertion (step 9), which passed the Oracle Strength Check at the falsifiability gate. Each mutation was in the owned code, failed on this row's assertion and not at load, and ran on the GREEN command. Step 2a is exempt on branch 2.
    - Scope: the run executes this row's selector only, and the file's other entries are skipped by the filter. The GREEN asserts nothing beyond the row's one boundary, and the `delivery-planner` Round 2 PASS is unchanged. Item scope is not adjudicated here.
    - The flag on the recorded GREEN: untraced vitest processes were present near both recorded runs. The address was unchanged at every capture, which shows no tracked file moved. The gatekeeper's own run, taken with no other process running on the same address, passes the same way, so the GREEN does not rest on the flagged runs alone.
    - Ledger: the row is still `red`, so `red -> green` follows this gate, as ordered. The `Evidence` cell is still `-`. It must be filled in the grammar of `evidence-cell-grammar.md` when the row reaches `green`, where `TDDLIST_EVIDENCE_EMPTY` would fire on `-`.
- Read-proof (S1 D5): as `TDD-0112`.
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
    `32f2b472…09ba66`, with the single selector entry above. `TDD-0112`'s
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
    change in the file is `TDD-0112`'s one line, which this row does not use.
    The earlier PASS reasons hold.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0113`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
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

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
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
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 37ms
   → expected [ Array(1) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
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
@@ -102,12 +102,10 @@ describe("TC-0013-0038: records go to the spec pack", () => {
   it("TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example", async () => {
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

   it("TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 15ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:02:07
   Duration  525ms (transform 78ms, setup 76ms, import 40ms, tests 17ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
  1. Re-insert the `W-PENDING-PROMOTION` example. The selector must fail.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The anchor read-proof passed. The failure is the assertion at line 110 inside the selector: the carry-over line citing a `W-PENDING-PROMOTION` decision. That is the predicate.
  - Scope against TC-0013-0038 (`no-pending-promotion-example`): one case-sensitive code-token absence. Nothing else is asserted.
  - Oracle proof plan: re-insert the example. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 29ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`; Result: exit 1, assertion failed inside selector `TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted the `W-PENDING-PROMOTION` example in the preflight sentence; the result found that line at `spec0013RecordHomes.test.ts:110:74`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
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

#### Round 2

- Branch: falsifiability (branch 2), confirmed: the classification run and the P4b re-run below both passed. The text this row asserts on is in the tree, and DR-0013-0017 (grilling decision D6) rules out reverting it to manufacture a RED.
- Expected classification result, from reading the tree and not from a run: pass. `SKILL.md` carries the line ``### `--auto` and approval-required rows`` once and no line containing `W-PENDING-PROMOTION`.
- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"` (also the falsifiability and GREEN command)
- Test hash at hand-off for scope approval (gate form): c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
- Test manifest: `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` alone. The file imports only `node:fs/promises`, `node:path` and `vitest`, and reads no test-owned fixture, snapshot or helper.
- Tree at hand-off for scope approval: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b (HEAD `1e09c3067fae3588c4763a9f6f9a17681948c5c0`, working tree clean; taken twice with equal results, with no vitest process running)
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the selector matches no other `it` in the file.
- Round 2: Satisfied-by: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`: no line contains `W-PENDING-PROMOTION`.
- Predicate to break (approved with the scope, for `/qfai-implement` Phase Red step 3c): insert the paragraph ``For example, `W-PENDING-PROMOTION`.``, followed by a blank line, directly above `## Mandatory Outputs` in `SKILL.md`. The selector must then fail at line 110, receiving that one line. The row's `Owning module`, and no manifest file.
- Scope approval (`delivery-planner`), Round 2:
  - Approver: `delivery-planner`, instance `atdd13-scope`
  - Verdict: PASS
  - Time: relayed by the coordinator; recorded here at 2026-09-25T02:33:19.854Z, before any run of this selector
  - Covers: test hash `c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1`, at tree `working-tree+71d85ec5…d09bcfd3b`, which the planner recomputed, and the single selector entry above. If the test file, a manifest entry or the selector changes, this approval lapses.
  - Reasons: the `Satisfied-by` above is a legal form on an `Integration` row handed over by `/qfai-atdd`, and the mutation is minimal. The planner found no oracle weakening against `e37b2fa82`, and accepted the overlap between the `TDD-0112` and `TDD-0115` predicates as structural.
  - Advisories taken: the index cells of `## Ledger rows advanced` are updated after classification, and `TDD-0110`'s second mutation is part of its step 3c proposal.
- Classification run (branch choice; not RED evidence): run at 2026-09-25T02:35:07.085Z, after the scope PASS recorded at 2026-09-25T02:33:19.854Z. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the selector executed and passed, because no line of `SKILL.md` contains `W-PENDING-PROMOTION`. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged. A first run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 5ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:35:09
   Duration  392ms (transform 66ms, setup 68ms, import 30ms, tests 6ms, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-25T02:35:15.533Z. Same command, tree and test hash, with the same captures before and after it. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the branch still holds. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 5ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:35:17
   Duration  338ms (transform 64ms, setup 63ms, import 34ms, tests 6ms, environment 0ms)
exit=0
```

- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming this row. Branch `falsifiability`, with its trio not yet written, which is the ordinary case. Step 3c:
  1. takes `Round 2: RED test hash` and its fenced `Round 2: RED test manifest` before the mutation; the mutation lands in no manifest file;
  2. applies the predicate to break above, runs this row's selector, and records `Round 2: Falsifiability command`, `Round 2: Falsifiability result`, `Round 2: RED failure mode: falsifiability` and `Round 2: Falsifiability revision`;
  3. routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Stage gate P1a first: `/qfai-implement` `Phase: Skeleton` is re-run for this invocation before any mutation run.
  - Ledger cells from this entry: `Test file` and `Selector` from the row identity above, equal to the ledger's cells today; `Evidence` pointing at `.qfai/evidence/atdd-spec-0013.md#tdd-0113`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - No production file is changed by this stage.

- Step 3b (`/qfai-implement`, run started 2026-09-25T02:45:32.177Z, backend-engineer
  `impl13-author`): entry verified.
  - Branch `falsifiability`, and Round 2 holds `Satisfied-by` with no trio and no
    `qa-gatekeeper` verdict on one, so the row goes to step 3c.
  - The selector is one entry over one boundary, `no-pending-promotion-example`. It equals
    the ledger's `Selector`, `new RegExp(selector).test(selector)` is `true`, and it matches
    one of the file's four `it` titles.
  - The test hash recomputed in the gate form to the approved `c7e9ad69…bff2b1`, and the tree
    address, taken twice, to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`, after
    `TDD-0112`'s mutation had been reverted to the committed blob.
  - No ledger cell is written yet. Step 3c writes `todo -> red` on the `qa-gatekeeper` PASS.
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
  (gate form, taken at 2026-09-25T03:01:42.242Z before the mutation, on
  `working-tree+71d85ec5…d09bcfd3b`; it recomputed to the same value with the mutation
  applied, since the mutation lands in no manifest file)
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 2: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
- Round 2: Falsifiability result: exit 1; 1 test failed on the assertion at line 110 inside this row's selector, receiving the one inserted line, with the file's other three `it` entries skipped by the filter. The read-proof at line 108 passed first: the heading ``### `--auto` and approval-required rows`` was found once. Run at 2026-09-25T03:01:57.086Z. The mutation is the predicate to break approved with the scope: the paragraph ``For example, `W-PENDING-PROMOTION`.`` and a blank line inserted directly above `## Mandatory Outputs` in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, the file `Round 2: Satisfied-by` names, in the row's `Owning module`. Before it, the file was byte-equal to its committed blob `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5` (SHA-256 `883bb9d8…1817d5`). The mutation is in the tree for the gate.

```diff
@@ -364,6 +364,8 @@ Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-re
 11. Run validate; fix source-layer artifacts and rerun until `error=0`.
 12. Triage density-smell warnings in `.qfai/report/specs-coverage/spec-*.md`.

+For example, `W-PENDING-PROMOTION`.
+
 ## Mandatory Outputs

 Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request.
```

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 11ms
   → expected [ Array(1) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "For example, `W-PENDING-PROMOTION`.",
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
   Start at  12:01:59
   Duration  502ms (transform 72ms, setup 71ms, import 33ms, tests 12ms, environment 0ms)

exit=1
```

- Round 2: Falsifiability revision: working-tree+83151f462c14893bfe5183665e846a69524495b4740fc5875a4c642e240d7747
  (the mutated tree, taken twice before and twice after the run, all four equal.
  `git status --short .qfai/decisions` printed nothing at every capture, and no other
  vitest process was running.)

- Revert (after the `qa-gatekeeper` verdict, at 2026-09-25T03:04:58Z): `SKILL.md` restored
  from its pre-mutation copy, byte-equal to that copy and to the committed blob
  `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5`. The tree address, taken twice, returned to the
  hand-off tree `working-tree+71d85ec5…d09bcfd3b`, and the RED test hash still recomputes to
  `c7e9ad69…bff2b1`.
- Round 2: Revision: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b
- Round 2: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example"`
- Round 2: GREEN result: exit 0 on both runs; 1 test passed each time, and the verbose output names this row's selector as passing, with the other three `it` entries left out by the filter (1 passed, 3 skipped). Both runs are reported. The first ran at 2026-09-25T03:05:03.462Z. At the capture just before it, a vitest process this run did not start (PID 14840) was present; it had exited before it could be traced. The run was repeated at 2026-09-25T03:05:35.055Z, and two more vitest processes this run did not start (PIDs 20340 and 38644) were present at the capture before it, one of them still at the capture after. They too exited before they could be traced. The tree address was `working-tree+71d85ec5…d09bcfd3b`, taken twice, at every capture before and after both runs. The step 3c mutation is this row's `Oracle proof`, so Phase Green step 2a is not repeated. The second run's output:

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example 5ms
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  12:05:36
   Duration  343ms (transform 69ms, setup 66ms, import 32ms, tests 6ms, environment 0ms)

exit=0
```

- Ledger write: todo -> red at 2026-09-25T03:06:08.709Z, after the step 3c `qa-gatekeeper`
  PASS, with `Test file` and `Selector` written from the row identity above (unchanged
  values). `Evidence` stays `-` at `red`. `red -> green` waits for the build-phase
  `qa-gatekeeper` gate on this GREEN, which the coordinator runs over all six rows.

### TDD-0114

- Renumbered: `TDD-0048` before the merge (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"). The rounds below were recorded under the old IDs and test titles, shown here mapped. They are history: the row is `todo` again.
- Re-completion: `/qfai-atdd` run started 2026-09-25T02:23:00.972Z takes this row again in `#### Round 2`. The `Branch`, `Status`, `Scope approval`, `Handoff` and `qa-gatekeeper` lines above `#### Round 1` describe Round 1.

- TDD-ID: TDD-0114
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013RecordHomes.test.ts
- Selector: TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
- TC-ref: TC-0013-0038
- Boundary: `no-surface-reference-in-tree`
- EX-ref: EX-0013-0023; AC-ref: AC-0013-0030; BR-ref: BR-0013-0023
- Branch: observed-red (branch 1), confirmed by the RED below. The surface exists and states the predicate wrongly: the shipped tree holds `catalog/worklog-entry.schema.md`, and the `/qfai-implement` and `/qfai-sdd` skills name `.qfai/steering/`. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- qa-gatekeeper: PASS x2 (instance `impl13-qa`, Round 2 — qa-gatekeeper#1, `/qfai-implement` step 3c falsifiability gate, routing phase `red`, on the mutated tree, reviewed revision working-tree+063d31c797bca678cf7752dc0e00e209b3d9624b3d1cb89ec41953f20de91d67 at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:10:20Z; qa-gatekeeper#2, build-phase GREEN + Oracle proof, reviewed revision working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:22:16Z)
  - Freshness: the tree address recomputed twice to `Round 2: Falsifiability revision`, and once more after the gate's run. The test hash recomputed in the gate form to `c7e9ad69…bff2b1`, the value the Round 2 scope PASS covers, and the test file is unchanged against HEAD. `SKILL.md` hashes to `bf6295f5…d16944`. Its only difference from blob `c35700bf1` is the recorded two-line insertion. TDD-0113's mutation is no longer in the tree.
  - Satisfied-by: a path plus the property it holds, over `assistant/**`: no file contains `.qfai/steering/` or `worklog-entry.schema.md`. This form is open to an `Integration` row handed over by `/qfai-atdd`. The row's `Evidence` cell is `-`, so there is no `Pre-split-evidence: implement`, and TC-0013-0038 declares `Level: integration`. The provenance recorded beside it names the rows that cleaned the rest of the tree and does not stand in for the property.
  - Whole-tree predicate, own-part mutation: the scan's predicate covers every file under `assistant/`. The read-proof at lines 115 to 120 shows the walk reached both `skills/qfai-sdd/SKILL.md` and `skills/qfai-implement/SKILL.md`, and one loop reads every walked file for both tokens. The mutation stays inside `skills/qfai-sdd/**`, which is both part of what `Satisfied-by` names and the row's `Owning module`, so it is owned code for the Oracle Strength Check. A mutation elsewhere in the tree would have been out of bounds. A fixed-string search by the gatekeeper on this tree finds the tokens in `skills/qfai-sdd/SKILL.md` only, so the failure is caused by the mutation alone. No manifest file is touched.
  - Discrimination: the inserted paragraph sends an entry to `.qfai/steering/`, the reference `no-surface-reference-in-tree` forbids. The failure is not a load failure. The module loaded, the read-proof passed, and the failure is the assertion at line 130 inside this row's selector, with `found` equal to `["skills/qfai-sdd/SKILL.md: .qfai/steering/"]`, and the other three `it` entries skipped.
  - Observation: the gatekeeper re-ran the recorded command on this tree, and it exited 1 with the recorded failure.
  - Command: `Round 2: Falsifiability command` is character for character the classification command, which the hand-off also names as the GREEN command.
  - Scope: not adjudicated here. The Round 2 `delivery-planner` PASS (`atdd13-scope`) approved a single mutation, holds, and has no open REVISE.
  - Advisory, non-blocking: the mutation exercises the `.qfai/steering/` token only. The `worklog-entry.schema.md` token runs through the same loop and comparison, so the discrimination shown carries to it, but it has not been demonstrated on its own. Inserting that token in the same place, run alone and reverted, would show it.
  - Next: remove the two inserted lines, confirm `SKILL.md` is byte-equal to blob `c35700bf1` and the tree is back at `working-tree+71d85ec5…d09bcfd3b`, and take the restored run as `Round 2: GREEN command` / `Round 2: GREEN result`.
  - Build gate (qa-gatekeeper#2, `/qfai-implement` item 5, Phase Green steps 2 and 3): PASS.
    - Tree: the address recomputed to `Round 2: Revision` before and after the gatekeeper's runs. `git status` shows no production change. `SKILL.md` is byte-equal to blob `c35700bf1`, so the restore after step 3c is complete. The test hash is unchanged.
    - GREEN: `Round 2: GREEN command` equals `Round 2: Falsifiability command` character for character, and its `-t` filter is this row's `Selector`. The recorded run (2026-09-25T03:11:31.927Z) exits 0, and its output names this selector as passing, with `1 passed | 3 skipped (4)` and nothing failed. The gatekeeper re-ran it on this tree at 2026-09-25T03:22:16Z: exit 0, same selector passing, same counts.
    - No production code: branch 2, so Phase Green writes nothing. The GREEN is the text `Round 2: Satisfied-by` names, restored to its committed blob. Item 4 is waived under `red-not-observable.md`.
    - Oracle proof: the step 3c `.qfai/steering/` insertion (step 11), which passed the Oracle Strength Check at the falsifiability gate. Each mutation was in the owned code, failed on this row's assertion and not at load, and ran on the GREEN command. Step 2a is exempt on branch 2.
    - Scope: the run executes this row's selector only, and the file's other entries are skipped by the filter. The GREEN asserts nothing beyond the row's one boundary, and the `delivery-planner` Round 2 PASS is unchanged. Item scope is not adjudicated here.
    - The step 11 advisory stands: the `worklog-entry.schema.md` token is not exercised on its own. It does not block this GREEN.
    - Ledger: the row is still `red`, so `red -> green` follows this gate, as ordered. The `Evidence` cell is still `-`. It must be filled in the grammar of `evidence-cell-grammar.md` when the row reaches `green`, where `TDDLIST_EVIDENCE_EMPTY` would fire on `-`.
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
    `32f2b472…09ba66`, with the single selector entry above. `TDD-0112`'s
    fix changes the file hash. The resubmission must show this `it` unchanged,
    and I re-confirm it on the new hash before the RED runs.
  - Sufficiency: the whole of TC-0013-0038's fourth bullet. Every file under
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
    change in the file is `TDD-0112`'s one line, which this row does not use.
    The earlier PASS reasons hold.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes `todo -> red` from
  this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round
  and, for this row, the tree after the spec-0011 skill-text GREEN and the schema withdrawal.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0114`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
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

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
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
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 218ms
   → expected [ …(7) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
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
@@ -113,12 +113,10 @@ describe("TC-0013-0038: records go to the spec pack", () => {
   it("TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md", async () => {
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
@@ -127,6 +125,6 @@ describe("TC-0013-0038: records go to the spec pack", () => {
         if (text.includes(token)) found.push(`${name}: ${token}`);
       }
     }
-    expect(found).toEqual([]);
+    void [found, [], expect];
   });
 });
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 635ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  10:02:15
   Duration  1.59s (transform 162ms, setup 203ms, import 44ms, tests 638ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
  1. Re-insert a `.qfai/steering/<id>.md` sentence into one file of the `/qfai-sdd` skill.
     The selector must fail on `found`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `b45c049e…4e2e2a`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `b45c049e…4e2e2a`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The walk read-proof passed (both skill files reached). The failure is the assertion at line 130 inside the selector: seven hits in `skills/qfai-sdd/SKILL.md`, `skills/qfai-implement/SKILL.md`, `skills/qfai-implement/references/execution-ledger.md` and `catalog/worklog-entry.schema.md`. That is the predicate.
  - Scope against TC-0013-0038 (`no-surface-reference-in-tree`): both tokens over every file of the shipped assistant tree. Nothing else is asserted.
  - Ordering: the GREEN for this row is the tree after the spec-0011 skill-text GREEN, the spec-0013 skill-text GREEN and the schema withdrawal, as recorded. That follows the S2 user decision. At the build gate, the GREEN run must be on the tree where all three have landed, and must name them.
  - Oracle proof plan: re-insert a `.qfai/steering/<id>.md` sentence into the `/qfai-sdd` skill, the `Owning module`. It names the GREEN command. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 616ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`; Result: exit 1, assertion failed inside selector `TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted `.qfai/steering/<id>.md` into the `SKILL.md` record sentence; the result named `skills/qfai-sdd/SKILL.md: .qfai/steering/` at `spec0013RecordHomes.test.ts:130:19`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
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

#### Round 2

- Branch: falsifiability (branch 2), confirmed: the classification run and the P4b re-run below both passed. The text this row asserts on is in the tree, and DR-0013-0017 (grilling decision D6) rules out reverting it to manufacture a RED.
- Expected classification result, from reading the tree and not from a run: pass. A fixed-string search of `packages/qfai/assets/init/.qfai/assistant/` finds neither `.qfai/steering/` nor `worklog-entry.schema.md`, and both `skills/qfai-sdd/SKILL.md` and `skills/qfai-implement/SKILL.md` exist. This row's Round 1 RED predates the asset round that retired the schema file, so only this round's run says what today's tree gives.
- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"` (also the falsifiability and GREEN command)
- Test hash at hand-off for scope approval (gate form): c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
- Test manifest: `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` alone. The file imports only `node:fs/promises`, `node:path` and `vitest`, and reads no test-owned fixture, snapshot or helper.
- Tree at hand-off for scope approval: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b (HEAD `1e09c3067fae3588c4763a9f6f9a17681948c5c0`, working tree clean; taken twice with equal results, with no vitest process running)
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the selector matches no other `it` in the file.
- Round 2: Satisfied-by: `packages/qfai/assets/init/.qfai/assistant/**`: no file contains `.qfai/steering/` or `worklog-entry.schema.md`. This row's own part, and the part step 3c mutates, is `skills/qfai-sdd/**`, the `Owning module`.
  - Provenance, alongside and not in its place: the rest of the tree lost its references under spec-0011 `TDD-0021`..`TDD-0023` (`qfai-implement` skill text) and spec-0004 `TDD-0068` (the retired schema asset), all `done`. The `qfai-sdd` part was written under `TDD-0044`..`TDD-0049`, IDs that now denote main's rows, so no `done` row owns it and the sibling form is not available.
- Predicate to break (approved with the scope, for `/qfai-implement` Phase Red step 3c): insert the paragraph ``Record the entry under `.qfai/steering/`.``, followed by a blank line, directly above `## Mandatory Outputs` in `skills/qfai-sdd/SKILL.md`. The selector must then fail at line 130, with `found` equal to `["skills/qfai-sdd/SKILL.md: .qfai/steering/"]`. The row's `Owning module`, and no manifest file.
- Scope approval (`delivery-planner`), Round 2:
  - Approver: `delivery-planner`, instance `atdd13-scope`
  - Verdict: PASS
  - Time: relayed by the coordinator; recorded here at 2026-09-25T02:33:19.854Z, before any run of this selector
  - Covers: test hash `c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1`, at tree `working-tree+71d85ec5…d09bcfd3b`, which the planner recomputed, and the single selector entry above. If the test file, a manifest entry or the selector changes, this approval lapses.
  - Reasons: the `Satisfied-by` above is a legal form on an `Integration` row handed over by `/qfai-atdd`, and the mutation is minimal. The planner found no oracle weakening against `e37b2fa82`, and accepted the overlap between the `TDD-0112` and `TDD-0115` predicates as structural.
  - Advisories taken: the index cells of `## Ledger rows advanced` are updated after classification, and `TDD-0110`'s second mutation is part of its step 3c proposal.
- Classification run (branch choice; not RED evidence): run at 2026-09-25T02:35:29.470Z, after the scope PASS recorded at 2026-09-25T02:33:19.854Z. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. No vitest process was running. Exit 0: the selector executed and passed, because no file of the shipped assistant tree contains either token. This is today's tree, after the asset round. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged. A first run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 166ms
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:35:32
   Duration  713ms (transform 72ms, setup 70ms, import 38ms, tests 167ms, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-25T02:35:40.923Z. Same command, tree and test hash, with the same captures before and after it. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `c7e9ad69…bff2b1`. Two vitest processes this run did not start were running (PIDs 6552 and 18964). They had exited before their command lines could be read. The tree address was the same before and after the run, taken twice each time, so they did not change the addressed tree. Exit 0: the branch still holds. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 101ms
 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  11:35:43
   Duration  501ms (transform 80ms, setup 74ms, import 39ms, tests 103ms, environment 0ms)
exit=0
```

- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming this row. Branch `falsifiability`, with its trio not yet written, which is the ordinary case. Step 3c:
  1. takes `Round 2: RED test hash` and its fenced `Round 2: RED test manifest` before the mutation; the mutation lands in no manifest file;
  2. applies the predicate to break above, runs this row's selector, and records `Round 2: Falsifiability command`, `Round 2: Falsifiability result`, `Round 2: RED failure mode: falsifiability` and `Round 2: Falsifiability revision`;
  3. routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Stage gate P1a first: `/qfai-implement` `Phase: Skeleton` is re-run for this invocation before any mutation run.
  - Ledger cells from this entry: `Test file` and `Selector` from the row identity above, equal to the ledger's cells today; `Evidence` pointing at `.qfai/evidence/atdd-spec-0013.md#tdd-0114`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - No production file is changed by this stage.

- Step 3b (`/qfai-implement`, run started 2026-09-25T02:45:32.177Z, backend-engineer
  `impl13-author`): entry verified.
  - Branch `falsifiability`, and Round 2 holds `Satisfied-by` with no trio and no
    `qa-gatekeeper` verdict on one, so the row goes to step 3c.
  - The selector is one entry over one boundary, `no-surface-reference-in-tree`. It equals
    the ledger's `Selector`, `new RegExp(selector).test(selector)` is `true`, and it matches
    one of the file's four `it` titles.
  - The test hash recomputed in the gate form to the approved `c7e9ad69…bff2b1`, and the tree
    address, taken twice, to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`, after
    `TDD-0113`'s mutation had been reverted to the committed blob.
  - Today's tree, re-checked before the mutation: a fixed-string search of
    `packages/qfai/assets/init/.qfai/assistant/` for `.qfai/steering/` and
    `worklog-entry.schema.md` found no file.
  - No ledger cell is written yet. Step 3c writes `todo -> red` on the `qa-gatekeeper` PASS.
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: c7e9ad69367a6bf627f1886455b8cb35bf9edd6e2b74f4f0873b39fcd2bff2b1
  (gate form, taken at 2026-09-25T03:07:45.309Z before the mutation, on
  `working-tree+71d85ec5…d09bcfd3b`; it recomputed to the same value with the mutation
  applied, since the mutation lands in no manifest file)
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/spec0013RecordHomes.test.ts
```

- Round 2: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
- Round 2: Falsifiability result: exit 1; 1 test failed on the assertion at line 130 inside this row's selector, with `found` equal to `["skills/qfai-sdd/SKILL.md: .qfai/steering/"]`, and the file's other three `it` entries left out by the filter (1 failed, 3 skipped). The read-proof at lines 115 to 120 passed first: the walk found both `skills/qfai-sdd/SKILL.md` and `skills/qfai-implement/SKILL.md`. Run at 2026-09-25T03:08:03.341Z. The mutation is the predicate to break approved with the scope: the paragraph ``Record the entry under `.qfai/steering/`.`` and a blank line inserted directly above `## Mandatory Outputs` in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, inside `skills/qfai-sdd/**`, the part of `Round 2: Satisfied-by` that is this row's `Owning module`. Before it, the file was byte-equal to its committed blob `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5` (SHA-256 `883bb9d8…1817d5`). The mutation is in the tree for the gate.

```diff
@@ -364,6 +364,8 @@ Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-re
 11. Run validate; fix source-layer artifacts and rerun until `error=0`.
 12. Triage density-smell warnings in `.qfai/report/specs-coverage/spec-*.md`.

+Record the entry under `.qfai/steering/`.
+
 ## Mandatory Outputs

 Record a decision in the spec's `07_Decisions.md` or a Change Request. Record a consultation or out-of-scope discovery in `08_Open-questions.md` or a Change Request.
```

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 × |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 79ms
   → expected [ Array(1) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md
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


 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  12:08:05
   Duration  441ms (transform 62ms, setup 62ms, import 30ms, tests 80ms, environment 0ms)

exit=1
```

- Round 2: Falsifiability revision: working-tree+063d31c797bca678cf7752dc0e00e209b3d9624b3d1cb89ec41953f20de91d67
  (the mutated tree, taken twice before and twice after the run, all four equal.
  `git status --short .qfai/decisions` printed nothing at every capture, and no other
  vitest process was running at any of them.)

- Advisory from the step 3c gate (`qa-gatekeeper` `impl13-qa`, Work Orders step 11), not
  blocking: the mutation falsifies only the `.qfai/steering/` token. The
  `worklog-entry.schema.md` token goes through the same loop, the same `text.includes`
  check and the same `found` list, so no second mutation is added for it.
- Revert (after the `qa-gatekeeper` verdict, at 2026-09-25T03:11:27Z): `SKILL.md` restored
  from its pre-mutation copy, byte-equal to that copy and to the committed blob
  `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5`. The tree address, taken twice, returned to the
  hand-off tree `working-tree+71d85ec5…d09bcfd3b`, and the RED test hash still recomputes to
  `c7e9ad69…bff2b1`.
- Round 2: Revision: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b
- Round 2: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013RecordHomes.test.ts --reporter=verbose -t "TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md"`
- Round 2: GREEN result: exit 0; 1 test passed, and the verbose output names this row's selector as passing, with the other three `it` entries left out by the filter (1 passed, 3 skipped). The restored run, taken at 2026-09-25T03:11:31.927Z on the tree named by `Round 2: Revision`, which was the same before and after the run, with no other vitest process present at either capture. The step 3c mutation is this row's `Oracle proof`, so Phase Green step 2a is not repeated.

```text
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section
 ↓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example
 ✓ |integration| tests/integration/spec0013RecordHomes.test.ts > TC-0013-0038: records go to the spec pack > TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md 86ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  12:11:37
   Duration  731ms (transform 113ms, setup 148ms, import 33ms, tests 88ms, environment 0ms)

exit=0
```

- Ledger write: todo -> red at 2026-09-25T03:11:48.024Z, after the step 3c `qa-gatekeeper`
  PASS, with `Test file` and `Selector` written from the row identity above (unchanged
  values). `Evidence` stays `-` at `red`. `red -> green` waits for the build-phase
  `qa-gatekeeper` gate on this GREEN, which the coordinator runs over all six rows.

### Withdrawn TDD-0111 (never merged)

- Renumbered: `TDD-0045` before the merge (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"). The rounds below were recorded under the old IDs and test titles, shown here mapped. They are history: the row is `todo` again.
- Re-completion: `/qfai-atdd` run started 2026-09-25T02:23:00.972Z takes this row again in `#### Round 2`. The `Branch`, `Status`, `Scope approval`, `Handoff` and `qa-gatekeeper` lines above `#### Round 1` describe Round 1.

- TDD-ID: TDD-0111
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Selector: TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
- TC-ref: TC-0013-0039
- Boundary: `stop-steps-stated`
- EX-ref: EX-0013-0022; AC-ref: AC-0013-0029; BR-ref: BR-0013-0022
- Branch: observed-red (branch 1), confirmed by the fresh RED below. The superseded RED is kept
  after it as history. The surface exists and states the predicate wrongly: the three files each tie the stop to a `consultation-needed` work-log entry, and the playbook and the triage step do not state all three steps. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- qa-gatekeeper: PASS x2 (instance `impl13-qa`, Round 2 — qa-gatekeeper#1, `/qfai-implement` step 3c falsifiability gate, routing phase `red`, on the mutated tree, reviewed revision working-tree+02c1adf21cbbffe4ed7f6a0f8bd7b078b481dc473e03f751ad3101b0b3df27f6 at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:14:24Z; qa-gatekeeper#2, build-phase GREEN + Oracle proof, reviewed revision working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:22:18Z)
  - Freshness: the tree address recomputed twice to `Round 2: Falsifiability revision`, and once more after the gate's run. The test hash of `spec0013ApprovalStop.test.ts` recomputed in the gate form to `b79a5271…3256cbf`, the value the Round 2 scope PASS covers, and the test file is unchanged against HEAD. `SKILL.md` hashes to `481582c2…2485f1`. Its only difference from blob `c35700bf1` is the recorded one-line edit of the stop bullet at line 96. TDD-0114's mutation is no longer in the tree. The vitest process under another worktree reads that worktree's assets, not this tree's.
  - Satisfied-by: three named units in three paths under `skills/qfai-sdd/`, plus the property each holds: it states all three stop steps. This form is open to an `Integration` row handed over by `/qfai-atdd`. The row's `Evidence` cell is `-`, so there is no `Pre-split-evidence: implement`, and TC-0013-0039 declares `Level: integration`. Each unit is a bounded predicate.
  - Ownership: the mutation edits only the stop bullet of the `SKILL.md` unit `Satisfied-by` names, in the row's `Owning module`. No manifest file is touched.
  - Discrimination: removing "Leave `Approved By` as `-`" removes exactly one of the three steps from one of the three units. The recorded and reproduced result is exactly the one missing cell, `SKILL.md: leave Approved By as -`: the other two steps of that unit and all three steps of both reference units still pass, and no other text of the section reads "Approved By as -" once backticks are stripped. The failure is not a load failure. The module loaded, the read-proof at line 102 passed (each stop unit found exactly once), and the failure is the assertion at line 111 inside this row's selector, with the file's other `it` skipped.
  - Observation: the gatekeeper re-ran the recorded command on this tree, and it exited 1 with the recorded failure.
  - Command: `Round 2: Falsifiability command` is character for character the classification command, which the hand-off also names as the GREEN command.
  - Scope: not adjudicated here. The Round 2 `delivery-planner` PASS (`atdd13-scope`) approved a single mutation, holds, and has no open REVISE.
  - Advisory, non-blocking: the boundary is nine cells, three steps in three units. The mutation exercises one of them. The other eight run through the same unit extraction, normalisation and pattern loop, so the discrimination shown carries to them, but they have not been demonstrated one by one.
  - Next: restore the bullet, confirm `SKILL.md` is byte-equal to blob `c35700bf1` and the tree is back at `working-tree+71d85ec5…d09bcfd3b`, and take the restored run as `Round 2: GREEN command` / `Round 2: GREEN result`.
  - Build gate (qa-gatekeeper#2, `/qfai-implement` item 5, Phase Green steps 2 and 3): PASS.
    - Tree: the address recomputed to `Round 2: Revision` before and after the gatekeeper's runs. `git status` shows no production change. `SKILL.md` is byte-equal to blob `c35700bf1`, so the restore after step 3c is complete. The test hash is unchanged.
    - GREEN: `Round 2: GREEN command` equals `Round 2: Falsifiability command` character for character, and its `-t` filter is this row's `Selector`. The recorded run (2026-09-25T03:15:31.347Z) exits 0, and its output names this selector as passing, with `1 passed | 1 skipped (2)` and nothing failed. The gatekeeper re-ran it on this tree at 2026-09-25T03:22:18Z: exit 0, same selector passing, same counts.
    - No production code: branch 2, so Phase Green writes nothing. The GREEN is the text `Round 2: Satisfied-by` names, restored to its committed blob. Item 4 is waived under `red-not-observable.md`.
    - Oracle proof: the step 3c stop-bullet edit (step 13), which passed the Oracle Strength Check at the falsifiability gate. Each mutation was in the owned code, failed on this row's assertion and not at load, and ran on the GREEN command. Step 2a is exempt on branch 2.
    - Scope: the run executes this row's selector only, and the file's other entries are skipped by the filter. The GREEN asserts nothing beyond the row's one boundary, and the `delivery-planner` Round 2 PASS is unchanged. Item scope is not adjudicated here.
    - The step 13 advisory stands: one of nine cells is exercised on its own. It does not block this GREEN.
    - Ledger: the row is still `red`, so `red -> green` follows this gate, as ordered. The `Evidence` cell is still `-`. It must be filled in the grammar of `evidence-cell-grammar.md` when the row reaches `green`, where `TDDLIST_EVIDENCE_EMPTY` would fire on `-`.
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
  - Sufficiency: the whole of TC-0013-0039's first bullet, asserted over all
    three files at once as the TC requires. Each file's unit is the one
    AC-0013-0029 names: the `SKILL.md` section, the playbook's
    missing-approval bullet, and triage step 7. Each unit must state all
    three steps, and every miss is collected into one `toEqual`.
  - One boundary: `stop-steps-stated`. The work-log absence belongs to
    `TDD-0115`.
  - Finding each unit exactly once is a legitimate read-proof.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0111`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
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

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
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
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 26ms
   → expected [ …(4) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
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
@@ -97,10 +97,8 @@ describe("TC-0013-0039: approval stop writes no entry", () => {
   it("TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps", async () => {
     const units = await readStopUnits();

-    expect(
-      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
-      "each file's stop unit is found exactly once",
-    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));
+    void [units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
+      "each file's stop unit is found exactly once", STOP_UNITS.map(({ name }) => `${name}: 1`), expect];

     const missing = units.flatMap(({ name, unit }) => {
       const plain = unit.text.replace(/[`*]/g, "").replace(/\s+/g, " ");
@@ -108,7 +106,7 @@ describe("TC-0013-0039: approval stop writes no entry", () => {
         ([step]) => `${name}: ${step}`,
       );
     });
-    expect(missing).toEqual([]);
+    void [missing, [], expect];
   });

   it("TC-0013-0039: none of the three files names a work-log entry or consultation-needed", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 24ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed

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
- Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
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
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 11ms
   → expected [ …(5) ] to deeply equal []
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
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
@@ -94,10 +94,8 @@ describe("TC-0013-0039: approval stop writes no entry", () => {
   it("TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps", async () => {
     const units = await readStopUnits();

-    expect(
-      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
-      "each file's stop unit is found exactly once",
-    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));
+    void [units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
+      "each file's stop unit is found exactly once", STOP_UNITS.map(({ name }) => `${name}: 1`), expect];

     const missing = units.flatMap(({ name, unit }) => {
       const plain = unit.text.replace(/[`*]/g, "");
@@ -105,7 +103,7 @@ describe("TC-0013-0039: approval stop writes no entry", () => {
         ([step]) => `${name}: ${step}`,
       );
     });
-    expect(missing).toEqual([]);
+    void [missing, [], expect];
   });

   it("TC-0013-0039: none of the three files names a work-log entry or consultation-needed", async () => {
```

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 10ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  09:52:50
   Duration  631ms (transform 95ms, setup 89ms, import 49ms, tests 12ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
  1. Remove "do not enter Phase 0" from one of the three units. The selector must fail on
     `missing`.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `c7517a90…1249df`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `c7517a90…1249df`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The read-proof passed (each stop unit found once). The failure is the assertion at line 111 inside the selector: the report step in all three files and the phrase do not enter Phase 0 in the playbook. That is the predicate. The wrapped `Approved By as -` step is now read as stated, so the false negative the superseded RED recorded is gone.
  - Superseded RED: kept under a plain label with non-round keys, which is the right placement. It was taken on the earlier hash, which the earlier PASS covered, and it does not stand for this hash. The oracle change between the two runs only removes a false negative, so it does not reshape the oracle to force a failure.
  - Scope against TC-0013-0039 (`stop-steps-stated`) / EX-0013-0022 / AC-0013-0029 / BR-0013-0022: three steps over three units at once. Nothing else is asserted.
  - Oracle proof plan: remove the phrase do not enter Phase 0 from one unit. It names the GREEN command. Acceptable. The plan sits after the superseded block and is the live plan for this round.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 24ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`; Result: exit 1, assertion failed inside selector `TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `780b7b04bdaf7fa9f2495ff7714ccad21b3bf06c08ae5f552096c07c882a7c10`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Removed `do not enter Phase 0` from the `SKILL.md` stop; the result named `SKILL.md: do not enter Phase 0` at `spec0013ApprovalStop.test.ts:111:21`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
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

#### Round 2

- Branch: falsifiability (branch 2), confirmed: the classification run and the P4b re-run below both passed. The text this row asserts on is in the tree, and DR-0013-0017 (grilling decision D6) rules out reverting it to manufacture a RED.
- Expected classification result, from reading the tree and not from a run: pass. Each of the three stop units is found once, and each states all three steps.
- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"` (also the falsifiability and GREEN command)
- Test hash at hand-off for scope approval (gate form): b79a52718873fa0e2c0e8f39bae34f2dd1b7c41c04390809ea8005b7a3256cbf
- Test manifest: `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` alone. The file imports only `node:fs/promises`, `node:path` and `vitest`, and reads no test-owned fixture, snapshot or helper.
- Tree at hand-off for scope approval: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b (HEAD `1e09c3067fae3588c4763a9f6f9a17681948c5c0`, working tree clean; taken twice with equal results, with no vitest process running)
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the selector matches no other `it` in the file.
- Round 2: Satisfied-by: three units under `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/`. Each states: leave `Approved By` as `-`, do not enter Phase 0, and report every unapproved row with its Operation and target.

  | File | Unit |
  | ---- | ---- |
  | `SKILL.md` | ``### `--auto` and approval-required rows``, its "Stop the stage and hand the run back." item |
  | `references/sdd-execution-playbook.md` | the item "Triage rows requiring approval but lacking `Approved By`" |
  | `references/sdd-triage.md` | step "7. **Stop.**" |

- Predicate to break (approved with the scope, for `/qfai-implement` Phase Red step 3c): in `SKILL.md`, change "Leave `Approved By` as `-`, do not enter Phase 0, and report" to "Do not enter Phase 0, and report". The selector must then fail at line 111, with `missing` equal to `["SKILL.md: leave Approved By as -"]`. With backticks stripped, no other text of that section reads "Approved By as -". The row's `Owning module`, and no manifest file.
- Scope approval (`delivery-planner`), Round 2:
  - Approver: `delivery-planner`, instance `atdd13-scope`
  - Verdict: PASS
  - Time: relayed by the coordinator; recorded here at 2026-09-25T02:33:19.854Z, before any run of this selector
  - Covers: test hash `b79a52718873fa0e2c0e8f39bae34f2dd1b7c41c04390809ea8005b7a3256cbf`, at tree `working-tree+71d85ec5…d09bcfd3b`, which the planner recomputed, and the single selector entry above. If the test file, a manifest entry or the selector changes, this approval lapses.
  - Reasons: the `Satisfied-by` above is a legal form on an `Integration` row handed over by `/qfai-atdd`, and the mutation is minimal. The planner found no oracle weakening against `e37b2fa82`, and accepted the overlap between the `TDD-0112` and `TDD-0115` predicates as structural.
  - Advisories taken: the index cells of `## Ledger rows advanced` are updated after classification, and `TDD-0110`'s second mutation is part of its step 3c proposal.
- Classification run (branch choice; not RED evidence): run at 2026-09-25T02:36:06.806Z, after the scope PASS recorded at 2026-09-25T02:33:19.854Z. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `b79a5271…256cbf`. Two vitest processes this run did not start were running (PIDs 28172 and 25704). They had exited before their command lines could be read. The tree address was the same before and after the run, taken twice each time, so they did not change the addressed tree. Exit 0: the selector executed and passed, because each of the three stop units states all three steps. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged. A first run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 7ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed
 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  11:36:09
   Duration  439ms (transform 71ms, setup 72ms, import 33ms, tests 9ms, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-25T02:36:16.731Z. Same command, tree and test hash, with the same captures before and after it. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `b79a5271…256cbf`. No vitest process was running. Exit 0: the branch still holds. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 7ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed
 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  11:36:19
   Duration  334ms (transform 60ms, setup 60ms, import 29ms, tests 8ms, environment 0ms)
exit=0
```

- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming this row. Branch `falsifiability`, with its trio not yet written, which is the ordinary case. Step 3c:
  1. takes `Round 2: RED test hash` and its fenced `Round 2: RED test manifest` before the mutation; the mutation lands in no manifest file;
  2. applies the predicate to break above, runs this row's selector, and records `Round 2: Falsifiability command`, `Round 2: Falsifiability result`, `Round 2: RED failure mode: falsifiability` and `Round 2: Falsifiability revision`;
  3. routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Stage gate P1a first: `/qfai-implement` `Phase: Skeleton` is re-run for this invocation before any mutation run.
  - Ledger cells from this entry: `Test file` and `Selector` from the row identity above, equal to the ledger's cells today; `Evidence` pointing at `.qfai/evidence/atdd-spec-0013.md#tdd-0111`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - No production file is changed by this stage.

- Step 3b (`/qfai-implement`, run started 2026-09-25T02:45:32.177Z, backend-engineer
  `impl13-author`): entry verified.
  - Branch `falsifiability`, and Round 2 holds `Satisfied-by` with no trio and no
    `qa-gatekeeper` verdict on one, so the row goes to step 3c.
  - The selector is one entry over one boundary, `stop-steps-stated`. It equals the ledger's
    `Selector`, `new RegExp(selector).test(selector)` is `true`, and it matches one of the
    file's two `it` titles.
  - The test hash recomputed in the gate form to the approved `b79a5271…256cbf`, and the tree
    address, taken twice, to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`, after
    `TDD-0114`'s mutation had been reverted to the committed blob.
  - No ledger cell is written yet. Step 3c writes `todo -> red` on the `qa-gatekeeper` PASS.
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: b79a52718873fa0e2c0e8f39bae34f2dd1b7c41c04390809ea8005b7a3256cbf
  (gate form, taken at 2026-09-25T03:12:29.075Z before the mutation, on
  `working-tree+71d85ec5…d09bcfd3b`; it recomputed to the same value with the mutation
  applied, since the mutation lands in no manifest file)
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
```

- Round 2: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
- Round 2: Falsifiability result: exit 1; 1 test failed on the assertion at line 111 inside this row's selector, with `missing` equal to `["SKILL.md: leave Approved By as -"]`, and the file's other `it` left out by the filter (1 failed, 1 skipped). The read-proof at line 102 passed first: each file's stop unit was found exactly once. Run at 2026-09-25T03:12:50.507Z. The mutation is the predicate to break approved with the scope: in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, the stop bullet's "Leave `Approved By` as `-`, do not enter Phase 0, and report" became "Do not enter Phase 0, and report". That bullet sits in the `SKILL.md` unit `Round 2: Satisfied-by` names, in the row's `Owning module`. The other two steps of that unit, and all three steps of the two reference units, still held. Before the mutation, the file was byte-equal to its committed blob `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5` (SHA-256 `883bb9d8…1817d5`). The mutation is in the tree for the gate.

```diff
@@ -95,3 +95,3 @@ approval-required row.
 - **Never synthesize an `Approved By` value.** `Approved By` is the only trace that a spec deletion or merge was authorized, so an invented approver is a false audit record — worse than a stopped run.
-- **Stop the stage and hand the run back.** Leave `Approved By` as `-`, do not enter Phase 0, and report every unapproved row with its Operation and target. Ask for a rerun without `--auto`. The resulting `QFAI-TRIAGE-005` errors are the reported state of a suspended run, not a gate to route
+- **Stop the stage and hand the run back.** Do not enter Phase 0, and report every unapproved row with its Operation and target. Ask for a rerun without `--auto`. The resulting `QFAI-TRIAGE-005` errors are the reported state of a suspended run, not a gate to route
   around.
```

```text
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 10ms
   → expected [ 'SKILL.md: leave Approved By as -' ] to deeply equal []
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
AssertionError: expected [ 'SKILL.md: leave Approved By as -' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "SKILL.md: leave Approved By as -",
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
   Start at  12:12:52
   Duration  314ms (transform 58ms, setup 57ms, import 28ms, tests 12ms, environment 0ms)

exit=1
```

- Round 2: Falsifiability revision: working-tree+02c1adf21cbbffe4ed7f6a0f8bd7b078b481dc473e03f751ad3101b0b3df27f6
  (the mutated tree, taken twice before and twice after the run, all four equal.
  `git status --short .qfai/decisions` printed nothing at every capture. At the capture
  before the mutation, a vitest process this run did not start (PID 37916) was running
  under another worktree, `.claude/worktrees/issue-pr-cycle-496f7a`. It cannot write this
  tree, and none was present at the captures around the run.)

- Advisory from the step 3c gate (`qa-gatekeeper` `impl13-qa`, Work Orders step 13), not
  blocking: the mutation falsifies one of the nine step-by-unit cells (three steps in each of
  three units). The other eight go through the same unit extraction and the same pattern loop,
  so no further mutation is added for them.
- Revert (after the `qa-gatekeeper` verdict, at 2026-09-25T03:15:27Z): `SKILL.md` restored
  from its pre-mutation copy, byte-equal to that copy and to the committed blob
  `c35700bf1d8a6625058dd15a0ec3ca0f2afd3de5`. The tree address, taken twice, returned to the
  hand-off tree `working-tree+71d85ec5…d09bcfd3b`, and the RED test hash still recomputes to
  `b79a5271…256cbf`.
- Round 2: Revision: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b
- Round 2: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps"`
- Round 2: GREEN result: exit 0; 1 test passed, and the verbose output names this row's selector as passing, with the file's other `it` left out by the filter (1 passed, 1 skipped). The restored run, taken at 2026-09-25T03:15:31.347Z on the tree named by `Round 2: Revision`, which was the same before and after the run, with no other vitest process present at either capture. The step 3c mutation is this row's `Oracle proof`, so Phase Green step 2a is not repeated.

```text
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps 7ms
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  12:15:33
   Duration  322ms (transform 57ms, setup 59ms, import 27ms, tests 8ms, environment 0ms)

exit=0
```

- Ledger write: todo -> red at 2026-09-25T03:15:45.167Z, after the step 3c `qa-gatekeeper`
  PASS, with `Test file` and `Selector` written from the row identity above (unchanged
  values). `Evidence` stays `-` at `red`. `red -> green` waits for the build-phase
  `qa-gatekeeper` gate on this GREEN, which the coordinator runs over all six rows.

### TDD-0115

- Renumbered: `TDD-0049` before the merge (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"). The rounds below were recorded under the old IDs and test titles, shown here mapped. They are history: the row is `todo` again.
- Re-completion: `/qfai-atdd` run started 2026-09-25T02:23:00.972Z takes this row again in `#### Round 2`. The `Branch`, `Status`, `Scope approval`, `Handoff` and `qa-gatekeeper` lines above `#### Round 1` describe Round 1.

- TDD-ID: TDD-0115
- Layer: Integration
- Test file: packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Selector: TC-0013-0039: none of the three files names a work-log entry or consultation-needed
- TC-ref: TC-0013-0039
- Boundary: `no-worklog-entry-named`
- EX-ref: EX-0013-0022; AC-ref: AC-0013-0029; BR-ref: BR-0013-0022
- Branch: observed-red (branch 1), confirmed by the fresh RED below. The superseded RED is kept
  after it as history. The surface exists and states the predicate wrongly: all three files name a `consultation-needed` work-log entry. No seam is needed: the test reads shipped files and imports nothing from `src`.
- qa-gatekeeper: PASS (qa-gatekeeper#1, instance `atdd-red-gate`, Round 1, RED phase gate before the production change, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- qa-gatekeeper: PASS x2 (instance `impl13-qa`, Round 2 — qa-gatekeeper#1, `/qfai-implement` step 3c falsifiability gate, routing phase `red`, on the mutated tree, reviewed revision working-tree+ca3b1337092a21175d388c52b61acc719369b6658c9bffe8a54503ddc3dc5ce1 at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:18:17Z; qa-gatekeeper#2, build-phase GREEN + Oracle proof, reviewed revision working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b at HEAD 1e09c3067fae3588c4763a9f6f9a17681948c5c0, 2026-09-25T03:22:21Z)
  - Freshness: the tree address recomputed twice to `Round 2: Falsifiability revision`, and once more after the gate's run. The test hash of `spec0013ApprovalStop.test.ts` recomputed in the gate form to `b79a5271…3256cbf`, the value the Round 2 scope PASS covers, and the test file is unchanged against HEAD. `references/sdd-triage.md` hashes to `969e33eb…4f96b4`. Its only difference from blob `12763a3f2` (`9eeaa3a4…dbcf86`, recomputed from HEAD) is the recorded append to step 7. `SKILL.md` hashes to its committed `883bb9d8…1817d5`, so TDD-0111's mutation is no longer in the tree.
  - Satisfied-by: three paths under `skills/qfai-sdd/`, plus the property each whole text holds: it contains neither `work-log`, in any case, nor `consultation-needed`. This form is open to an `Integration` row handed over by `/qfai-atdd`. The row's `Evidence` cell is `-`, so there is no `Pre-split-evidence: implement`, and TC-0013-0039 declares `Level: integration`.
  - Ownership: the mutation appends one sentence to step 7 of `references/sdd-triage.md`, one of the three files `Satisfied-by` names, in the row's `Owning module`. No manifest file is touched. A fixed-string search by the gatekeeper finds `work-log` in that file only and `consultation-needed` in none, so the failure is caused by the mutation alone.
  - Discrimination: the appended sentence names a work-log entry, which `no-worklog-entry-named` forbids. The failure is not a load failure. The module loaded, the read-proof at line 119 passed (each stop unit, the triage step-7 unit included, still found exactly once), and the failure is the assertion at line 126 inside this row's selector, with `found` equal to `["references/sdd-triage.md: work-log"]`, and the file's other `it` skipped.
  - Overlap with TDD-0112: that predicate is contained in this one. Only this row's selector runs here, and this mutation does not touch the file TDD-0112 reads for its heading, so the failing output names only this row's selector.
  - Observation: the gatekeeper re-ran the recorded command on this tree, and it exited 1 with the recorded failure.
  - Command: `Round 2: Falsifiability command` is character for character the classification command, which the hand-off also names as the GREEN command.
  - Scope: not adjudicated here. The Round 2 `delivery-planner` PASS (`atdd13-scope`) approved a single mutation, holds, and has no open REVISE.
  - Advisory, non-blocking: the mutation exercises the `work-log` token in one of three files. The `consultation-needed` token and the other two files run through the same per-file loop, so the discrimination shown carries to them, but they have not been demonstrated on their own.
  - Next: remove the appended sentence, confirm `references/sdd-triage.md` is byte-equal to blob `12763a3f2` and the tree is back at `working-tree+71d85ec5…d09bcfd3b`, and take the restored run as `Round 2: GREEN command` / `Round 2: GREEN result`.
  - Build gate (qa-gatekeeper#2, `/qfai-implement` item 5, Phase Green steps 2 and 3): PASS.
    - Tree: the address recomputed to `Round 2: Revision` before and after the gatekeeper's runs. `git status` shows no production change. `references/sdd-triage.md` is byte-equal to blob `12763a3f2`, so the restore after step 3c is complete. The test hash is unchanged.
    - GREEN: `Round 2: GREEN command` equals `Round 2: Falsifiability command` character for character, and its `-t` filter is this row's `Selector`. The recorded run (2026-09-25T03:19:28.411Z) exits 0, and its output names this selector as passing, with `1 passed | 1 skipped (2)` and nothing failed. The gatekeeper re-ran it on this tree at 2026-09-25T03:22:21Z: exit 0, same selector passing, same counts.
    - No production code: branch 2, so Phase Green writes nothing. The GREEN is the text `Round 2: Satisfied-by` names, restored to its committed blob. Item 4 is waived under `red-not-observable.md`.
    - Oracle proof: the step 3c triage step-7 append (step 15), which passed the Oracle Strength Check at the falsifiability gate. Each mutation was in the owned code, failed on this row's assertion and not at load, and ran on the GREEN command. Step 2a is exempt on branch 2.
    - Scope: the run executes this row's selector only, and the file's other entries are skipped by the filter. The GREEN asserts nothing beyond the row's one boundary, and the `delivery-planner` Round 2 PASS is unchanged. Item scope is not adjudicated here.
    - The step 15 advisory stands: `consultation-needed` and the other two files are not exercised on their own. It does not block this GREEN.
    - Ledger: the row is still `red`, so `red -> green` follows this gate, as ordered. The `Evidence` cell is still `-`. It must be filled in the grammar of `evidence-cell-grammar.md` when the row reaches `green`, where `TDDLIST_EVIDENCE_EMPTY` would fire on `-`.
- Read-proof (S1 D5): each file's stop unit, as in `TDD-0111`, is found exactly once.
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
    `## Work-log entries` heading also fails this row. `TDD-0112` has no
    failure this row does not share. That overlap is in how TC-0013-0038 and
    TC-0013-0039 are written. Removing it would take a Change Request to
    `/qfai-sdd`, not a re-scope here.

- Handoff: ready. To `/qfai-implement` Phase Red step 3b, naming this row. Branch `observed-red`, so step 3b writes
  `todo -> red` from this entry; no second RED is taken. The GREEN is the `/qfai-sdd` skill-text round.
  - Ledger cells step 3b fills from this entry: `Test file` and `Selector` from the row
    identity above, both `-` in the seeded row; `Evidence` pointing at
    `.qfai/evidence/atdd-spec-0013.md#tdd-0115`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
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
    whole files and never reads the normalised unit text, so `TDD-0111`'s
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

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`
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
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 29ms
   → expected [ 'SKILL.md: work-log', …(5) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed
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
@@ -114,15 +114,13 @@ describe("TC-0013-0039: approval stop writes no entry", () => {
   it("TC-0013-0039: none of the three files names a work-log entry or consultation-needed", async () => {
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
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 24ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  10:02:33
   Duration  644ms (transform 82ms, setup 82ms, import 38ms, tests 25ms, environment 0ms)
exit=0
```

**Superseded RED (the oracle changed after it: the file it shares with `TDD-0111` was revised, so its hash moved; this `it` is unchanged. A fresh RED and stripped run on the revised file follow the new scope approval.)**
- Tree: working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55
- Test content hash: ab739c98a873d2a48ecfc9398d8c2bf22d742b42a343678ee3521b3004962dfd
- Test manifest:
  - packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
- Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`
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
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 12ms
   → expected [ 'SKILL.md: work-log', …(5) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed
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
@@ -111,15 +111,13 @@ describe("TC-0013-0039: approval stop writes no entry", () => {
   it("TC-0013-0039: none of the three files names a work-log entry or consultation-needed", async () => {
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
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 6ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  09:52:55
   Duration  484ms (transform 77ms, setup 80ms, import 38ms, tests 8ms, environment 0ms)
exit=0
```

- Oracle proof (plan, run at GREEN by `/qfai-implement`, written there as
  `Round 1: Oracle proof`). The mutation lands in the row's `Owning module`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, and is reverted after its run.
  - GREEN command, the same as the RED command:
    `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`
  1. Re-insert `consultation-needed` in one of the three files. The selector must fail.

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the approved RED: PASS
  (instance `atdd-red-gate`, Round 1, reviewed revision working-tree+d388a371d899f1d74bc61f840876164441db2de9a14460ca43e4225af0e7afca at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (2026-09-24T00:59:11Z) covers file hash `c7517a90…1249df`, and this RED ran on it after that PASS.
  - Freshness: the RED test hash recomputes to `c7517a90…1249df`, over a one-file manifest; the test imports no helper. The shipped assistant tree under `packages/qfai/assets/init/.qfai/assistant` is identical to HEAD. The current tree address is `working-tree+30bb6582…196af`. The gatekeeper rebuilt the RED tree from it, without the later `spec0004BlockedRowEmptyBlockedBy.test.ts` (a TDD-0070 file written after these REDs) and without its `tsconfig.tests.json` include line, and that tree addresses to the recorded `working-tree+d388a371…afca` exactly.
  - Strip: the diff reaches only this row `it`. The operands and the unit extraction are kept, and `expect` stays referenced. The command is unchanged, and the verbose output names this selector as passing with the other `it` entries skipped.
  - Observation: the gatekeeper re-ran the RED command. The read-proof passed. The failure is the assertion at line 126 inside the selector: `work-log` and `consultation-needed` in each of the three files. That is the predicate.
  - Superseded RED: kept as history. It does not stand for the current hash, and the fresh RED on the current hash is the one judged here.
  - Scope against TC-0013-0039 (`no-worklog-entry-named`): whole-file absence per S1 D11. Nothing else is asserted. The overlap with TDD-0112 is how the TCs are written, as the scope approval notes.
  - Oracle proof plan: as recorded in this section. Acceptable.

- Round 1: Revision: working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`
- Round 1: GREEN result: exit 0; Vitest selected this row's exact selector and reported one passing test. The recorded runner output is:

```text
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 12ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
```
- Round 1: Oracle proof: Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`; Result: exit 1, assertion failed inside selector `TC-0013-0039: none of the three files names a work-log entry or consultation-needed`. The following mutation runs each failed inside this row's exact selector. The mutated source was restored byte for byte after each run; the restored SHA-256 was `82170e4164cfef2820ed107fca00608ccc0b9aa33e52835c69325a7a1d1954cf`. The source tree address before and after the six mutations was working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c.

1. Reinserted a `consultation-needed` work-log entry into the playbook stop; the result named both `work-log` and `consultation-needed` in `references/sdd-execution-playbook.md` at `spec0013ApprovalStop.test.ts:126:19`. Command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`. Result: exit 1, one failed selector with its assertion at the stated line; siblings skipped. The captured runner output follows.

```text
 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed
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

#### Round 2

- Branch: falsifiability (branch 2), confirmed: the classification run and the P4b re-run below both passed. The text this row asserts on is in the tree, and DR-0013-0017 (grilling decision D6) rules out reverting it to manufacture a RED.
- Expected classification result, from reading the tree and not from a run: pass. Each of the three stop units is found once, and no one of the three files contains `work-log` in any case, or `consultation-needed`.
- Planned classification command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"` (also the falsifiability and GREEN command)
- Test hash at hand-off for scope approval (gate form): b79a52718873fa0e2c0e8f39bae34f2dd1b7c41c04390809ea8005b7a3256cbf
- Test manifest: `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` alone. The file imports only `node:fs/promises`, `node:path` and `vitest`, and reads no test-owned fixture, snapshot or helper.
- Tree at hand-off for scope approval: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b (HEAD `1e09c3067fae3588c4763a9f6f9a17681948c5c0`, working tree clean; taken twice with equal results, with no vitest process running)
- Selector check: `new RegExp(selector).test(selector)` is `true`, and the selector matches no other `it` in the file.
- Round 2: Satisfied-by: `SKILL.md`, `references/sdd-execution-playbook.md` and `references/sdd-triage.md` under `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/`: the whole text of each contains neither `work-log`, in any case, nor `consultation-needed`.
- Predicate to break (approved with the scope, for `/qfai-implement` Phase Red step 3c): in `references/sdd-triage.md` step 7, append " Write no work-log entry." after "so the approvals can be collected.". The selector must then fail at line 126, with `found` equal to `["references/sdd-triage.md: work-log"]`. The step-7 unit is still found once. The row's `Owning module`, and no manifest file.
- Scope approval (`delivery-planner`), Round 2:
  - Approver: `delivery-planner`, instance `atdd13-scope`
  - Verdict: PASS
  - Time: relayed by the coordinator; recorded here at 2026-09-25T02:33:19.854Z, before any run of this selector
  - Covers: test hash `b79a52718873fa0e2c0e8f39bae34f2dd1b7c41c04390809ea8005b7a3256cbf`, at tree `working-tree+71d85ec5…d09bcfd3b`, which the planner recomputed, and the single selector entry above. If the test file, a manifest entry or the selector changes, this approval lapses.
  - Reasons: the `Satisfied-by` above is a legal form on an `Integration` row handed over by `/qfai-atdd`, and the mutation is minimal. The planner found no oracle weakening against `e37b2fa82`, and accepted the overlap between the `TDD-0112` and `TDD-0115` predicates as structural.
  - Advisories taken: the index cells of `## Ledger rows advanced` are updated after classification, and `TDD-0110`'s second mutation is part of its step 3c proposal.
- Classification run (branch choice; not RED evidence): run at 2026-09-25T02:36:39.436Z, after the scope PASS recorded at 2026-09-25T02:33:19.854Z. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `b79a5271…256cbf`. No vitest process was running. Exit 0: the selector executed and passed, because none of the three files contains `work-log` or `consultation-needed`. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged. A first run that passes is what puts the row on branch 2.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 11ms
 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  11:36:41
   Duration  479ms (transform 86ms, setup 83ms, import 38ms, tests 13ms, environment 0ms)
exit=0
```

- P4b re-run (`red-provenance.md` branch 2), immediately before handover: run at 2026-09-25T02:36:48.598Z. Same command, tree and test hash, with the same captures before and after it. Before the run, `git status --short .qfai/decisions` printed nothing; the tree address, taken twice, was `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b` both times; and the test hash recomputed to the approved `b79a5271…256cbf`. No vitest process was running. Exit 0: the branch still holds. After the run, `.qfai/decisions` still printed nothing and the address, taken twice, was unchanged.

```text
$ cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 5ms
 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  11:36:50
   Duration  349ms (transform 63ms, setup 62ms, import 33ms, tests 6ms, environment 0ms)
exit=0
```

- Handoff: ready for `/qfai-implement` Phase Red step 3c, reached through step 3b, naming this row. Branch `falsifiability`, with its trio not yet written, which is the ordinary case. Step 3c:
  1. takes `Round 2: RED test hash` and its fenced `Round 2: RED test manifest` before the mutation; the mutation lands in no manifest file;
  2. applies the predicate to break above, runs this row's selector, and records `Round 2: Falsifiability command`, `Round 2: Falsifiability result`, `Round 2: RED failure mode: falsifiability` and `Round 2: Falsifiability revision`;
  3. routes `qa-gatekeeper` while the mutation is in the tree, then reverts and takes the restored run as the GREEN. The row moves `todo -> red -> green` on those two runs.
  - Stage gate P1a first: `/qfai-implement` `Phase: Skeleton` is re-run for this invocation before any mutation run.
  - Ledger cells from this entry: `Test file` and `Selector` from the row identity above, equal to the ledger's cells today; `Evidence` pointing at `.qfai/evidence/atdd-spec-0013.md#tdd-0115`. `DR-ID` stays `-`, and `Blocked-By` stays `-`.
  - No production file is changed by this stage.

- Step 3b (`/qfai-implement`, run started 2026-09-25T02:45:32.177Z, backend-engineer
  `impl13-author`): entry verified.
  - Branch `falsifiability`, and Round 2 holds `Satisfied-by` with no trio and no
    `qa-gatekeeper` verdict on one, so the row goes to step 3c.
  - The selector is one entry over one boundary, `no-worklog-entry-named`. It equals the
    ledger's `Selector`, `new RegExp(selector).test(selector)` is `true`, and it matches one
    of the file's two `it` titles.
  - The test hash recomputed in the gate form to the approved `b79a5271…256cbf`, and the tree
    address, taken twice, to the hand-off tree `working-tree+71d85ec5…d09bcfd3b`, after
    `TDD-0111`'s mutation had been reverted to the committed blob.
  - No ledger cell is written yet. Step 3c writes `todo -> red` on the `qa-gatekeeper` PASS.
- Round 2: RED failure mode: falsifiability
- Round 2: RED test hash: b79a52718873fa0e2c0e8f39bae34f2dd1b7c41c04390809ea8005b7a3256cbf
  (gate form, taken at 2026-09-25T03:16:25.808Z before the mutation, on
  `working-tree+71d85ec5…d09bcfd3b`; it recomputed to the same value with the mutation
  applied, since the mutation lands in no manifest file)
- Round 2: RED test manifest:

```text
packages/qfai/tests/integration/spec0013ApprovalStop.test.ts
```

- Round 2: Falsifiability command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`
- Round 2: Falsifiability result: exit 1; 1 test failed on the assertion at line 126 inside this row's selector, with `found` equal to `["references/sdd-triage.md: work-log"]`, and the file's other `it` left out by the filter (1 failed, 1 skipped). The read-proof at line 119 passed first: each file's stop unit, the triage step-7 unit included, was found exactly once. Run at 2026-09-25T03:16:41.484Z. The mutation is the predicate to break approved with the scope: " Write no work-log entry." appended after "so the approvals can be collected." at the end of step 7 in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, one of the three files `Round 2: Satisfied-by` names, in the row's `Owning module`. Before it, the file was byte-equal to its committed blob `12763a3f2c8627b00be259da33b8a8bb11707c2e` (SHA-256 `9eeaa3a4…dbcf86`), and `SKILL.md` was back at its committed blob `c35700bf1`. The mutation is in the tree for the gate.

```diff
@@ -179,7 +179,7 @@ and that none were added or dropped — in the `Rationale` column of the
    `Approved By` as `-`, do not enter Phase 0, report every unapproved row
    with its Operation and target, and report the `QFAI-TRIAGE-005` errors as
    the reason the run stopped. Under `--auto`, also ask for a rerun without
-   `--auto` so the approvals can be collected.
+   `--auto` so the approvals can be collected. Write no work-log entry.

 ## Impact cascade (1 REQ → N rows)

```

```text
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 × |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 11ms
   → expected [ Array(1) ] to deeply equal []

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "references/sdd-triage.md: work-log",
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
   Start at  12:16:43
   Duration  320ms (transform 58ms, setup 57ms, import 28ms, tests 12ms, environment 0ms)

exit=1
```

- Round 2: Falsifiability revision: working-tree+ca3b1337092a21175d388c52b61acc719369b6658c9bffe8a54503ddc3dc5ce1
  (the mutated tree, taken twice before and twice after the run, all four equal.
  `git status --short .qfai/decisions` printed nothing at every capture, and no other
  vitest process was running at any of them.)

- Advisory from the step 3c gate (`qa-gatekeeper` `impl13-qa`, Work Orders step 15), not
  blocking: the mutation falsifies only the `work-log` token, in one of the three files. The
  `consultation-needed` token and the other two files go through the same loop, so no
  further mutation is added for them.
- Revert (after the `qa-gatekeeper` verdict, at 2026-09-25T03:19:21Z): `sdd-triage.md`
  restored from its pre-mutation copy, byte-equal to that copy and to the committed blob
  `12763a3f2c8627b00be259da33b8a8bb11707c2e`. The tree address, taken twice, returned to the
  hand-off tree `working-tree+71d85ec5…d09bcfd3b`, and the RED test hash still recomputes to
  `b79a5271…256cbf`. At that capture a vitest process this run did not start (PID 36352)
  was running under another worktree, `.claude/worktrees/agent-a720c7f75857614b8`. It
  cannot write this tree, and none was present at the capture after the GREEN.
- Round 2: Revision: working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b
- Round 2: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/integration/spec0013ApprovalStop.test.ts --reporter=verbose -t "TC-0013-0039: none of the three files names a work-log entry or consultation-needed"`
- Round 2: GREEN result: exit 0; 1 test passed, and the verbose output names this row's selector as passing, with the file's other `it` left out by the filter (1 passed, 1 skipped). The restored run, taken at 2026-09-25T03:19:28.411Z on the tree named by `Round 2: Revision`, which was the same before and after the run. The step 3c mutation is this row's `Oracle proof`, so Phase Green step 2a is not repeated.

```text
 ↓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps
 ✓ |integration| tests/integration/spec0013ApprovalStop.test.ts > TC-0013-0039: approval stop writes no entry > TC-0013-0039: none of the three files names a work-log entry or consultation-needed 6ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  12:19:30
   Duration  373ms (transform 77ms, setup 73ms, import 36ms, tests 8ms, environment 0ms)

exit=0
```

- Ledger write: todo -> red at 2026-09-25T03:19:40.963Z, after the step 3c `qa-gatekeeper`
  PASS, with `Test file` and `Selector` written from the row identity above (unchanged
  values). `Evidence` stays `-` at `red`. `red -> green` waits for the build-phase
  `qa-gatekeeper` gate on this GREEN, which the coordinator runs over all six rows.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0013.md`.
Totals: ✅ 78 / ⚠️ 117 / ❌ 312, with 15 not applicable, across 522 scored cells —
459 matrix depth cells (51 rows × 9 columns) and 63 business rule cells
(21 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

For the /qfai-atdd run 2026-09-23T19:33:24.738Z: the rows this change added were scored under
`## Update: the work-log removal` in the same file. `CR-20260925-0010` withdrew them, so they
add nothing to these totals.

## Work Orders Summary

| Role                | Task                                                     | Status (PASS/REVISE/PENDING) |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the forty-nine obligations and write the matrix    | PASS                         |
| completion-reviewer | Audit every claim this file makes against the repository | PENDING |

### /qfai-atdd run 2026-09-23T19:33:24.738Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | qa-gatekeeper | atdd-s1-griller | grilling(S1@2026-09-23T19:33:24.738Z/user): Fix EX-0004-0044 / BR-0004-0035 (and AC-0004-0041, TC-0004-0076) through CR-20260923-0015 | `spec-0004/05_Examples.md`, `04_Business-Rules.md` | `CR-20260923-0015` (applied); the example gave a passing `Blocked-By` the kept `TDDLIST_BLOCKED_MISSING_REF` check rejects, and changing settled input is the user's to approve | PASS |
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
| 17 | acceptance-test-engineer | atdd-ate | TDD-0110 … TDD-0115 tests written | `spec-0013/03`…`06`; S1 D3-D5, D11 | `spec0013RecordHomes.test.ts`, `spec0013ApprovalStop.test.ts` (hashes in the row sections) | PASS |
| 18 | delivery-planner | atdd-scope | Scope approval TDD-0110 | `### TDD-0110`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0038 first bullet, AC-0013-0030; matrix row note | Scope PASS. Both routes with both alternatives. The two-statement co-location follows the matrix note. To be re-confirmed on the file's new hash | PASS |
| 19 | delivery-planner | atdd-scope | Scope approval TDD-0112 | `### TDD-0112`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0038 second bullet; S1 D11 | Scope REVISE. The exact-line match misses a `## Work-log entries …` heading with added text. S1 D11 settles a substring. Resubmit with `includes` | REVISE |
| 20 | delivery-planner | atdd-scope | Scope approval TDD-0113 | `### TDD-0113`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0038 third bullet; S1 D11 | Scope PASS. No `W-PENDING-PROMOTION` anywhere in `SKILL.md`, one boundary. To be re-confirmed on the file's new hash | PASS |
| 21 | delivery-planner | atdd-scope | Scope approval TDD-0114 | `### TDD-0114`; `spec0013RecordHomes.test.ts` (hash `32f2b472…09ba66`); TC-0013-0038 fourth bullet, AC-0013-0030 whole-tree clause | Scope PASS. The whole shipped assistant tree, with a two-file read-proof, one boundary. To be re-confirmed on the file's new hash | PASS |
| 22 | delivery-planner | atdd-scope | Scope approval TDD-0111 | `### TDD-0111`; `spec0013ApprovalStop.test.ts` (hash `ab739c98…962dfd`); TC-0013-0039 first bullet, AC-0013-0029 | Scope PASS. Three steps in each of the three named units, over all files at once, one boundary | PASS |
| 23 | delivery-planner | atdd-scope | Scope approval TDD-0115 | `### TDD-0115`; `spec0013ApprovalStop.test.ts` (hash `ab739c98…962dfd`); TC-0013-0039 second bullet; S1 D11 | Scope PASS. Whole-file scan of the three files, as the TC says. Advisory: it subsumes `TDD-0112`, which is how the TCs are written | PASS |
| 24 | acceptance-test-engineer | atdd-ate | TDD-0111 RED | `### TDD-0111`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `ab739c98…962dfd`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0111` Round 1 | PASS |
| 25 | acceptance-test-engineer | atdd-ate | TDD-0115 RED | `### TDD-0115`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `ab739c98…962dfd`) | approved RED and its stripped run at `working-tree+2d31f83a…c37d55` in `### TDD-0115` Round 1 | PASS |
| 26 | delivery-planner | atdd-scope | Scope approval TDD-0110 (resubmission) | `### TDD-0110`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged; the only change in the file is `TDD-0112`'s line | PASS |
| 27 | delivery-planner | atdd-scope | Scope approval TDD-0112 (resubmission) | `### TDD-0112`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS. The heading check is `includes("## Work-log entries")`, the S1 D11 substring | PASS |
| 28 | delivery-planner | atdd-scope | Scope approval TDD-0113 (resubmission) | `### TDD-0113`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged | PASS |
| 29 | delivery-planner | atdd-scope | Scope approval TDD-0114 (resubmission) | `### TDD-0114`; `spec0013RecordHomes.test.ts` (hash `b45c049e…64e2e2a`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged | PASS |
| 30 | delivery-planner | atdd-scope | Scope approval TDD-0111 (resubmission) | `### TDD-0111`; `spec0013ApprovalStop.test.ts` (hash `c7517a90…1249df`); tree `working-tree+d388a371…afca` | Scope PASS. Collapsing whitespace before the unchanged step patterns fixes a false negative on a wrapped step. The obligation is unchanged. The earlier RED is superseded, and a fresh RED is owed | PASS |
| 31 | delivery-planner | atdd-scope | Scope approval TDD-0115 (resubmission) | `### TDD-0115`; `spec0013ApprovalStop.test.ts` (hash `c7517a90…1249df`); tree `working-tree+d388a371…afca` | Scope PASS re-confirmed. The `it` is unchanged, and the whole-file scan is not touched by the normalisation. A fresh RED is owed | PASS |
| 32 | acceptance-test-engineer | atdd-ate | TDD-0110 RED | `### TDD-0110`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0110` Round 1 | PASS |
| 33 | acceptance-test-engineer | atdd-ate | TDD-0112 RED | `### TDD-0112`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0112` Round 1 | PASS |
| 34 | acceptance-test-engineer | atdd-ate | TDD-0113 RED | `### TDD-0113`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0113` Round 1 | PASS |
| 35 | acceptance-test-engineer | atdd-ate | TDD-0114 RED | `### TDD-0114`; `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (RED test hash `b45c049e…4e2e2a`) | approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0114` Round 1 | PASS |
| 36 | acceptance-test-engineer | atdd-ate | TDD-0111 fresh RED | `### TDD-0111`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `c7517a90…1249df`) | fresh approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0111` Round 1 | PASS |
| 37 | acceptance-test-engineer | atdd-ate | TDD-0115 fresh RED | `### TDD-0115`; `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (RED test hash `c7517a90…1249df`) | fresh approved RED and its stripped run at `working-tree+d388a371…0e7afca` in `### TDD-0115` Round 1 | PASS |
| 38 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0110 | `### TDD-0110` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 88: neither statement present (`decision` and `consultationOrDiscovery` false), after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 39 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0112 | `### TDD-0112` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 99: the `## Work-log entries` heading and its cross-reference, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 40 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0113 | `### TDD-0113` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 110: the carry-over line citing a `W-PENDING-PROMOTION` decision, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 41 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0114 | `### TDD-0114` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013RecordHomes.test.ts` | PASS: RED reproduced at line 130: seven hits in four files including the schema asset, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 42 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0111 | `### TDD-0111` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013ApprovalStop.test.ts` | PASS: RED reproduced at line 111: four stop steps missing across the three files, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |
| 43 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0115 | `### TDD-0115` Round 1 approved RED and its stripped run; `delivery-planner` PASS 00:59:11Z; `spec0013ApprovalStop.test.ts` | PASS: RED reproduced at line 126: `work-log` and `consultation-needed` in all three files, after its read-proof; RED test hash equal, and the RED revision rebuilt exactly from the current tree; strip valid | PASS |


### /qfai-implement — run started 2026-09-24T12:34:21.949Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | backend-engineer | spec0013-griller | grilling(S1@2026-09-24T12:34:21.949Z/agents): place decisions and consultations in existing spec or Change Request homes | AC-0013-0030; TC-0013-0038; shipped `qfai-sdd/SKILL.md` | S1 D1: add one short paragraph in Mandatory Outputs; reject a separate section | PASS |
| 2 | backend-engineer | spec0013-griller | grilling(S1@2026-09-24T12:34:21.949Z/agents): retain the three approval stop sites and their existing gates | AC-0013-0029; TC-0013-0039; shipped skill and two references | S1 D2: edit each existing stop and update the old assertion test; reject a new shared section | PASS |
| 3 | backend-engineer | spec0013-impl | TDD-0110..TDD-0115 GREEN and Oracle proof | six ATDD RED entries; shipped skill and references | The six row sections above; 16 restored GREEN tests, seven assertion-failing Oracle runs, byte-equal restoration | PASS |

### /qfai-atdd run 2026-09-25T02:23:00.972Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | acceptance-test-engineer | atdd13-author | Preflight, RED test hashes and scope submission, TDD-0110 … TDD-0115 | D6 (DR-0013-0017); `spec0013RecordHomes.test.ts`, `spec0013ApprovalStop.test.ts` | Run block and `#### Round 2` stubs; hashes `c7e9ad69…bff2b1` and `b79a5271…256cbf` at `working-tree+71d85ec5…d09bcfd3b` | PASS |
| 2 | delivery-planner | atdd13-scope | Scope approval TDD-0110 … TDD-0115, Round 2 | the six `#### Round 2` stubs; both test hashes; tree `working-tree+71d85ec5…d09bcfd3b` | Scope PASS for all six: both hashes and the tree recomputed; each `Satisfied-by` legal, TDD-0114's path and property included; each mutation minimal; the TDD-0112 / TDD-0115 overlap structural; no oracle weakening against `e37b2fa82`. Advisories: update the index cells after classification; make TDD-0110's second mutation part of its proposal | PASS |
| 3 | acceptance-test-engineer | atdd13-author | Classification runs and P4b re-runs, TDD-0110 … TDD-0115 | the scope PASS of step 2; both approved test hashes | Twelve runs, one at a time, all exit 0, each on the approved hash; tree `working-tree+71d85ec5…d09bcfd3b` at every capture; `.qfai/decisions` clean at every capture. All six rows on branch 2, each with its `Round 2: Satisfied-by` and a step 3c hand-off; index cells set to `falsifiability` | PASS |

### /qfai-implement — run started 2026-09-25T02:45:32.177Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | backend-engineer | impl13-author | grilling(-@2026-09-25T02:45:32.177Z/none): none | D6 (DR-0013-0017); the six `#### Round 2` hand-offs | Preflight confidence high; no session opened | PASS |
| 2 | backend-engineer | impl13-author | Preflight, Skeleton re-run, and step 3b / 3c for TDD-0110 | the `/qfai-atdd` run started 2026-09-25T02:23:00.972Z; `.qfai/evidence/skeleton.md` | Run block above; Skeleton exit 0; `### TDD-0110` `#### Round 2` step 3b and 3c fields, revert to the committed blob, restored GREEN exit 0 on `working-tree+71d85ec5…d09bcfd3b`; ledger `todo -> red` after the step 3 PASS | PASS |
| 3 | qa-gatekeeper | impl13-qa | Falsifiability gate TDD-0110 (step 3c, phase `red`) | `### TDD-0110` `#### Round 2` falsifiability trio, `Satisfied-by` and scope PASS; mutated tree `working-tree+c1b7f0cf…df17f`; `qfai-sdd/SKILL.md` line 369; test hash `c7e9ad69…bff2b1`; mutation 1 log `f0110-m1.txt` | PASS: both mutations edit only the `Satisfied-by` paragraph in the Owning module. Each breaks one half of `record-homes-stated` (mutation 1: `consultationOrDiscovery: false`; mutation 2: `decision: false`), on the assertion at line 88 after the read-proof passed. Mutation 2 reproduced by the gatekeeper's own run, exit 1. Test hash unchanged. Command equals the GREEN command | PASS |
| 4 | delivery-planner | impl13-plan | Plan phase: confirm the named-`TDD-ID` handover, TDD-0110 … TDD-0115 | `tdd/test-list.md` rows TDD-0110 … TDD-0115; the six `#### Round 2` hand-offs; `qfai-implement/references/plan-phase.md` | PASS, taken after the Skeleton re-run and TDD-0110's step 3b / 3c runs and before any ledger write; TDD-0110's gate was already dispatched. Constraint: step 3c strictly serial across the six rows, each mutation reverted to the committed blob before the next row's is applied | PASS |
| 5 | backend-engineer | impl13-author | Step 3b / 3c for TDD-0112 | `### TDD-0112` `#### Round 2` hand-off; TDD-0110's mutation reverted to blob `c35700bf1` | `### TDD-0112` `#### Round 2` step 3b and 3c fields; exit 1 at line 99 on the approved mutation at `working-tree+c8e93ce8…a7442`; after the step 7 PASS, revert to the committed blob, restored GREEN exit 0 on `working-tree+71d85ec5…d09bcfd3b`, ledger `todo -> red` | PASS |
| 6 | test-design-analyst | impl13-tda | Plan phase: coverage and layer-ownership pass, TDD-0110 … TDD-0115 (mandatory, non-blocking) | `tdd/test-list.md` at HEAD `1e09c3067`; spec-0013's full `TC-*` / `US-*` / `CON-API-*` set | PASS: no coverage or layer-ownership defect. Findings are under the run block's `Plan phase` bullet in this file, since all six rows are `Integration` | PASS |
| 7 | qa-gatekeeper | impl13-qa | Falsifiability gate TDD-0112 (step 3c, phase `red`) | `### TDD-0112` `#### Round 2` falsifiability trio, `Satisfied-by` and scope PASS; mutated tree `working-tree+c8e93ce8…a7442`; `qfai-sdd/SKILL.md` (`c25d1e6c…2e360`, blob `c35700bf1` before); test hash `c7e9ad69…bff2b1` | PASS: the two-line insertion lands only in the file `Satisfied-by` names, in the Owning module, and breaks exactly the `no-worklog-section` absence. The read-proof at line 97 passed, then the assertion at line 99 failed receiving `["## Work-log entries"]`, reproduced by the gatekeeper's own run, exit 1. The TDD-0115 overlap is structural, and its selector is in another file and not run. Test hash unchanged. Command equals the GREEN command | PASS |
| 8 | backend-engineer | impl13-author | Step 3b / 3c for TDD-0113 | `### TDD-0113` `#### Round 2` hand-off; TDD-0112's mutation reverted to blob `c35700bf1` | `### TDD-0113` `#### Round 2` step 3b and 3c fields; exit 1 at line 110 on the approved mutation at `working-tree+83151f46…d7747`; after the step 9 PASS, revert to the committed blob, restored GREEN exit 0 twice on `working-tree+71d85ec5…d09bcfd3b` (repeated because vitest processes this run did not start were present), ledger `todo -> red`. The `Round 2: GREEN result` wording of TDD-0110, TDD-0112 and TDD-0113 changed from a bare "skipped" to the counted form, which the gate's passing-result check requires | PASS |
| 9 | qa-gatekeeper | impl13-qa | Falsifiability gate TDD-0113 (step 3c, phase `red`) | `### TDD-0113` `#### Round 2` falsifiability trio, `Satisfied-by` and scope PASS; mutated tree `working-tree+83151f46…d7747`; `qfai-sdd/SKILL.md` (`b152dc21…507254`, blob `c35700bf1` before); test hash `c7e9ad69…bff2b1` | PASS: the two-line insertion lands only in the file `Satisfied-by` names, in the Owning module, and breaks exactly the `no-pending-promotion-example` absence. The read-proof at line 108 passed, then the assertion at line 110 failed receiving the inserted line, reproduced by the gatekeeper's own run, exit 1. Test hash unchanged. Command equals the GREEN command | PASS |
| 10 | backend-engineer | impl13-author | Step 3b / 3c for TDD-0114 | `### TDD-0114` `#### Round 2` hand-off; TDD-0113's mutation reverted to blob `c35700bf1` | `### TDD-0114` `#### Round 2` step 3b and 3c fields; exit 1 at line 130 on the approved mutation at `working-tree+063d31c7…91d67`; after the step 11 PASS, revert to the committed blob, restored GREEN exit 0 on `working-tree+71d85ec5…d09bcfd3b`, ledger `todo -> red`; the step 11 advisory on the untested `worklog-entry.schema.md` token recorded, with no mutation added | PASS |
| 11 | qa-gatekeeper | impl13-qa | Falsifiability gate TDD-0114 (step 3c, phase `red`) | `### TDD-0114` `#### Round 2` falsifiability trio, `Satisfied-by` over `assistant/**` and scope PASS; mutated tree `working-tree+063d31c7…91d67`; `qfai-sdd/SKILL.md` (`bf6295f5…d16944`, blob `c35700bf1` before); test hash `c7e9ad69…bff2b1` | PASS: the scan covers the whole tree, and the read-proof shows the walk reached both skills. The mutation stays in `skills/qfai-sdd/**`, inside `Satisfied-by` and the Owning module, and is the only file the gatekeeper's own search finds. The assertion at line 130 failed with `found` `["skills/qfai-sdd/SKILL.md: .qfai/steering/"]`, reproduced by the gatekeeper's own run, exit 1. Test hash unchanged. Command equals the GREEN command. Advisory: the `worklog-entry.schema.md` token is not exercised on its own. The Round 2 GREEN result rewording on TDD-0110/0112/0113 postdates steps 3, 7 and 9 and changes none of the fields they judged | PASS |
| 12 | backend-engineer | impl13-author | Step 3b / 3c for TDD-0111 | `### TDD-0111` `#### Round 2` hand-off; TDD-0114's mutation reverted to blob `c35700bf1` | `### TDD-0111` `#### Round 2` step 3b and 3c fields; exit 1 at line 111 on the approved mutation at `working-tree+02c1adf2…f27f6`; after the step 13 PASS, revert to the committed blob, restored GREEN exit 0 on `working-tree+71d85ec5…d09bcfd3b`, ledger `todo -> red`; the step 13 advisory on the eight cells not mutated recorded, with no mutation added | PASS |
| 13 | qa-gatekeeper | impl13-qa | Falsifiability gate TDD-0111 (step 3c, phase `red`) | `### TDD-0111` `#### Round 2` falsifiability trio, `Satisfied-by` (three units) and scope PASS; mutated tree `working-tree+02c1adf2…27f6`; `qfai-sdd/SKILL.md` (`481582c2…2485f1`, blob `c35700bf1` before); test hash `b79a5271…3256cbf` | PASS: the one-line edit of the `SKILL.md` stop bullet lands only in a unit `Satisfied-by` names, in the Owning module. It removes exactly one step, and `missing` is exactly `["SKILL.md: leave Approved By as -"]`, with the other eight cells still holding. The read-proof at line 102 passed and the assertion at line 111 failed, reproduced by the gatekeeper's own run, exit 1. Test hash unchanged. Command equals the GREEN command. Advisory: one of nine cells is exercised on its own | PASS |
| 14 | backend-engineer | impl13-author | Step 3b / 3c for TDD-0115 | `### TDD-0115` `#### Round 2` hand-off; TDD-0111's mutation reverted to blob `c35700bf1` | `### TDD-0115` `#### Round 2` step 3b and 3c fields; exit 1 at line 126 on the approved mutation of `references/sdd-triage.md` at `working-tree+ca3b1337…dc5ce1`; after the step 15 PASS, revert to the committed blob `12763a3f2`, restored GREEN exit 0 on `working-tree+71d85ec5…d09bcfd3b`, ledger `todo -> red`; the step 15 advisory on the tokens and files not mutated recorded, with no mutation added | PASS |
| 15 | qa-gatekeeper | impl13-qa | Falsifiability gate TDD-0115 (step 3c, phase `red`) | `### TDD-0115` `#### Round 2` falsifiability trio, `Satisfied-by` (three files) and scope PASS; mutated tree `working-tree+ca3b1337…c5ce1`; `qfai-sdd/references/sdd-triage.md` (`969e33eb…4f96b4`, blob `12763a3f2` before); `SKILL.md` at its committed blob; test hash `b79a5271…3256cbf` | PASS: the one-sentence append to triage step 7 lands only in a file `Satisfied-by` names, in the Owning module, and it is the only hit of the gatekeeper's own search. The read-proof at line 119 passed and the assertion at line 126 failed with `found` `["references/sdd-triage.md: work-log"]`, reproduced by the gatekeeper's own run, exit 1. The TDD-0112 overlap is structural. Test hash unchanged. Command equals the GREEN command. Advisory: `consultation-needed` and the other two files are not exercised on their own | PASS |
| 16 | qa-gatekeeper | impl13-qa | Build gate TDD-0110 (phase build, item 5) | `### TDD-0110` `#### Round 2` GREEN pair and `Revision`; Oracle proof = step 3's falsifiability PASS; tree `working-tree+71d85ec5…d09bcfd3b` at HEAD `1e09c3067`; `SKILL.md` at blob `c35700bf1` | PASS: tree equals `Round 2: Revision` with no production change; GREEN command equals the falsifiability command and filters to this row's selector; recorded GREEN names the selector passing (1 passed, 3 skipped (4)), re-run by the gatekeeper at 03:22:07Z, exit 0. No production code on branch 2 (item 4 waived). Oracle proof passed. Scope stays inside the row. `red -> green` follows, with the `Evidence` cell filled | PASS |
| 17 | qa-gatekeeper | impl13-qa | Build gate TDD-0112 (phase build, item 5) | `### TDD-0112` `#### Round 2` GREEN pair and `Revision`; Oracle proof = step 7's falsifiability PASS; tree `working-tree+71d85ec5…d09bcfd3b` at HEAD `1e09c3067`; `SKILL.md` at blob `c35700bf1` | PASS: tree equals `Round 2: Revision` with no production change; GREEN command equals the falsifiability command and filters to this row's selector; recorded GREEN names the selector passing (1 passed, 3 skipped (4)), re-run by the gatekeeper at 03:22:10Z, exit 0. No production code on branch 2 (item 4 waived). Oracle proof passed. Scope stays inside the row. `red -> green` follows, with the `Evidence` cell filled | PASS |
| 18 | qa-gatekeeper | impl13-qa | Build gate TDD-0113 (phase build, item 5) | `### TDD-0113` `#### Round 2` GREEN pair and `Revision`; Oracle proof = step 9's falsifiability PASS; tree `working-tree+71d85ec5…d09bcfd3b` at HEAD `1e09c3067`; `SKILL.md` at blob `c35700bf1` | PASS: tree equals `Round 2: Revision` with no production change; GREEN command equals the falsifiability command and filters to this row's selector; recorded GREEN names the selector passing (1 passed, 3 skipped (4)), re-run by the gatekeeper at 03:22:13Z, exit 0. No production code on branch 2 (item 4 waived). Oracle proof passed. Scope stays inside the row. The untraced-process flag is cleared by the gatekeeper's clean re-run on the same address. `red -> green` follows, with the `Evidence` cell filled | PASS |
| 19 | qa-gatekeeper | impl13-qa | Build gate TDD-0114 (phase build, item 5) | `### TDD-0114` `#### Round 2` GREEN pair and `Revision`; Oracle proof = step 11's falsifiability PASS; tree `working-tree+71d85ec5…d09bcfd3b` at HEAD `1e09c3067`; `SKILL.md` at blob `c35700bf1` | PASS: tree equals `Round 2: Revision` with no production change; GREEN command equals the falsifiability command and filters to this row's selector; recorded GREEN names the selector passing (1 passed, 3 skipped (4)), re-run by the gatekeeper at 03:22:16Z, exit 0. No production code on branch 2 (item 4 waived). Oracle proof passed. Scope stays inside the row. `red -> green` follows, with the `Evidence` cell filled | PASS |
| 20 | qa-gatekeeper | impl13-qa | Build gate TDD-0111 (phase build, item 5) | `### TDD-0111` `#### Round 2` GREEN pair and `Revision`; Oracle proof = step 13's falsifiability PASS; tree `working-tree+71d85ec5…d09bcfd3b` at HEAD `1e09c3067`; `SKILL.md` at blob `c35700bf1` | PASS: tree equals `Round 2: Revision` with no production change; GREEN command equals the falsifiability command and filters to this row's selector; recorded GREEN names the selector passing (1 passed, 1 skipped (2)), re-run by the gatekeeper at 03:22:18Z, exit 0. No production code on branch 2 (item 4 waived). Oracle proof passed. Scope stays inside the row. `red -> green` follows, with the `Evidence` cell filled | PASS |
| 21 | qa-gatekeeper | impl13-qa | Build gate TDD-0115 (phase build, item 5) | `### TDD-0115` `#### Round 2` GREEN pair and `Revision`; Oracle proof = step 15's falsifiability PASS; tree `working-tree+71d85ec5…d09bcfd3b` at HEAD `1e09c3067`; `references/sdd-triage.md` at blob `12763a3f2` | PASS: tree equals `Round 2: Revision` with no production change; GREEN command equals the falsifiability command and filters to this row's selector; recorded GREEN names the selector passing (1 passed, 1 skipped (2)), re-run by the gatekeeper at 03:22:21Z, exit 0. No production code on branch 2 (item 4 waived). Oracle proof passed. Scope stays inside the row. `red -> green` follows, with the `Evidence` cell filled | PASS |

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
| 9 | completion-reviewer | completion-reviewer | /qfai-implement: TDD-0110 and TDD-0111 completion review, attempt 1 | #tdd-0110, #tdd-0111 | review-20260925120100000 <!-- qfai:not-a-citation --> | REVISE |
| 10 | implementation-reviewer | implementation-reviewer | /qfai-implement: TDD-0110 and TDD-0111 code review, attempt 1 | #tdd-0110, #tdd-0111 | review-20260925120100000 <!-- qfai:not-a-citation --> | PASS |
| 11 | completion-reviewer | completion-reviewer | /qfai-implement: TDD-0110 and TDD-0111 completion review, attempt 2 | #tdd-0110, #tdd-0111 | review-20260925120200000 <!-- qfai:not-a-citation --> | PASS |
| 12 | implementation-reviewer | implementation-reviewer | /qfai-implement: TDD-0110 and TDD-0111 code review, attempt 2 | #tdd-0110, #tdd-0111 | review-20260925120200000 <!-- qfai:not-a-citation --> | PASS |
| 13 | orchestrator | orchestrator | /qfai-implement: TDD-0110 and TDD-0111 group checkpoint verification, off a checkpoint boundary | #tdd-0110, #tdd-0111 | Checkpoint verification fields | PASS |

## Cross-spec obligations

Code-ownership entries from `/qfai-implement` (`references/cross-spec-ownership.md`).
No other spec's `done` row names a changed file in `Owning module` or `Test file`.
The reverse walk cannot be completed, so the package fallback matches every `done`
row of another spec whose `Test file` is a test module under `packages/qfai/`.
Each blocked row's selector, and its recorded proof where it has one, was re-run
read-only on a clean clone at `03762f3cf`, and `completion-reviewer` ruled every row
from those results. The head `9f96f2b70` differs from `03762f3cf` only in CI files
and `CHANGELOG.md`, so each ruling holds there.

The source rows are this change's `TDD-0110` … `TDD-0115`, which stopped at `red`.
`CR-20260925-0010` deleted them. Main assigned `TDD-0110` and `TDD-0111` to its own
rows, so this change's rows of those ids are named `Withdrawn … (never merged)`, the
form their sections above use. `TDD-0112` … `TDD-0115` are kept unique by their
tombstones. The production edits stay, so the entries stay.

### Files the source rows changed

- `Withdrawn TDD-0110 (never merged)`: `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`, `packages/qfai/tsconfig.tests.json`
- `Withdrawn TDD-0111 (never merged)`: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`, `packages/qfai/tsconfig.tests.json`
- `TDD-0112`: `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`, `packages/qfai/tsconfig.tests.json`
- `TDD-0113`: `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`, `packages/qfai/tsconfig.tests.json`
- `TDD-0114`: `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`, `packages/qfai/tsconfig.tests.json`
- `TDD-0115`: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`, `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`, `packages/qfai/tsconfig.tests.json`

### Entries

| TDD-ID | Blocked spec | Blocked TDD-IDs | File | Change required | Obligation at risk | Resolution |
| ------ | ------------ | --------------- | ---- | --------------- | ------------------ | ---------- |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0002 | 2 rows: TDD-0001, TDD-0011 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0001, TDD-0011 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0002 | 1 row: TDD-0008 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but its case checks three file names in `SKILL.md` and does not observe TC-0002-0008 (no winner in discuss). The approved option 1 records that the product contradicts the TC and resets the row. See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260912-0003 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0002 | 1 row: TDD-0012 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but the CR records that this wording test passes while contradicting the acceptance criterion on `prototyping.yaml` requiredness (TC-0002-0011). See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260912-0003 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0003 | 42 rows: TDD-0001, TDD-0018..0021, TDD-0023..0027, TDD-0029..0031, TDD-0033..0044, TDD-0046..0047, TDD-0049..0053, TDD-0055, TDD-0058..0063, TDD-0092..0094 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0001, TDD-0018..0020, TDD-0027, TDD-0029..0031, TDD-0033..0044, TDD-0046..0047, TDD-0049..0053, TDD-0055, TDD-0058..0063, TDD-0092..0094 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-a` confirmed each holds. See `### Re-run results: spec-0003` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0003 | 3 rows: TDD-0045, TDD-0048, TDD-0054 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The recorded mutation still survives on the current test (`init.ts` `6465aa79`, test `6a14f8e6`), so the test cannot fail on the predicate the row proves. The CR names the row. See `### Re-run results: spec-0003` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0006 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0004 | 28 rows: TDD-0005, TDD-0011, TDD-0013..0014, TDD-0022, TDD-0024, TDD-0026, TDD-0032..0033, TDD-0035..0049, TDD-0051..0053, TDD-0072 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0072 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0004` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0004 | 1 row: TDD-0050 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but TC-0004-0070 expects the warning to name the 3..7 band. `designAudit.ts:255` names only the ceiling, and the case asserts `/at most 7/`. See `### Re-run results: spec-0004` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0001 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0004 | 11 rows: TDD-0003..0004, TDD-0006, TDD-0008..0010, TDD-0012, TDD-0015, TDD-0023, TDD-0025, TDD-0034 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0004` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0015 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0006 | 23 rows: TDD-0012..0019, TDD-0021..0031, TDD-0033, TDD-0038..0040 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0029..0031, TDD-0033, TDD-0038..0040 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-a` confirmed each holds. See `### Re-run results: spec-0006` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0006 | 1 row: TDD-0020 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. The CR is still `open`. See `### Re-run results: spec-0006` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0007 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0006 | 1 row: TDD-0032 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes (2/2), but mutants R20 to R29 of the recorded set have no record, so the full set cannot be replayed. The CR names the row. See `### Re-run results: spec-0006` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0016 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0008 | 2 rows: TDD-0013..0014 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0013..0014 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0008` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0010 | 6 rows: TDD-0001, TDD-0005, TDD-0013..0015, TDD-0017 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0010` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0010 | 3 rows: TDD-0006..0008 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0010` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260912-0003 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0010 | 1 row: TDD-0016 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but TC-0010-0012 expects pack finalization to write `currentId`. The case drives `qfai discussion use`, and no stage code writes the pointer. See `### Re-run results: spec-0010` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0013 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 133 rows: TDD-0286, TDD-0293..0294, TDD-0336, TDD-0338..0339, TDD-0343, TDD-0345, TDD-0350, TDD-0355, TDD-0360..0361, TDD-0363..0364, TDD-0367..0369, TDD-0371..0383, TDD-0385..0388, TDD-0403..0408, TDD-0417..0419, TDD-0425..0427, TDD-0430..0435, TDD-0439..0442, TDD-0444..0452, TDD-0454, TDD-0458, TDD-0460..0462, TDD-0466..0471, TDD-0473..0474, TDD-0476, TDD-0479, TDD-0481..0485, TDD-0487..0488, TDD-0490..0495, TDD-0497, TDD-0501..0505, TDD-0509..0515, TDD-0518..0527, TDD-0561..0577 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0469, TDD-0471, TDD-0497, TDD-0514..0515, TDD-0561..0577 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-a` and `xspec-cr-b` confirmed each holds. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 3 rows: TDD-0496, TDD-0516..0517 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Not `done` at `03762f3cf`: `CR-20260923-0001`, applied on main, reset the row, and its blocked table names it. A row that is not `done` certifies nothing the change can break. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260923-0001 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 25 rows: TDD-0337, TDD-0366, TDD-0389..0400, TDD-0415..0416, TDD-0421..0424, TDD-0428..0429, TDD-0437..0438, TDD-0443 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0001 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 23 rows: TDD-0295, TDD-0340..0341, TDD-0344, TDD-0346, TDD-0348..0349, TDD-0351, TDD-0353..0354, TDD-0356..0359, TDD-0362, TDD-0365, TDD-0370, TDD-0453, TDD-0456..0457, TDD-0459, TDD-0465, TDD-0486 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0002 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 1 row: TDD-0342 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0003 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 1 row: TDD-0507 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0004 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 4 rows: TDD-0489, TDD-0498..0500 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0005 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0012 | 8 rows: TDD-0455, TDD-0463..0464, TDD-0472, TDD-0475, TDD-0480, TDD-0506, TDD-0508 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. The CR is still `open`. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0007 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0014 | 3 rows: TDD-0018..0019, TDD-0034 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0019 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0014 | 1 row: TDD-0033 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0002 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0014 | 1 row: TDD-0009 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but TC-0014-0009 expects a REVISE to block verify. The selected blocks assert stale-sidecar migration errors. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0005 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0014 | 1 row: TDD-0035 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but TC-0014-0035 runs the command. The cases call `runPrototypingCertify` directly, bypassing `src/cli/main.ts`, which this change edited. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0005 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0014 | 1 row: TDD-0036 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | The selector passes, but the cases bypass the command line as for TDD-0035, and the row aggregates the refusal and promotion boundaries the CR splits. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0005 |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0015 | 21 rows: TDD-0011..0012, TDD-0017..0035 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0015` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0016 | 28 rows: TDD-0001..0028 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0016` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| Withdrawn TDD-0110 (never merged), Withdrawn TDD-0111 (never merged), TDD-0112, TDD-0113, TDD-0114, TDD-0115 | spec-0017 | 6 rows: TDD-0016, TDD-0030, TDD-0033..0035, TDD-0070 | the paths listed for each under `### Files the source rows changed` | Replace the work-log text in the shipped `qfai-sdd` skill with each record's named home; Keep the approval-stop steps of the shipped `qfai-sdd` skill without the work-log entry | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0016, TDD-0030, TDD-0033..0035, TDD-0070 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0017` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |

- Seven rows whose selector passes take a CR: spec-0002 `TDD-0008` and `TDD-0012`,
  spec-0004 `TDD-0050`, spec-0010 `TDD-0016`, and spec-0014 `TDD-0009`, `TDD-0035` and
  `TDD-0036`. `xspec-cr-c` ruled that each pass does not show the obligation holds, for
  the reason in its line, and the CR records the same gap. No user has adjudicated these
  seven rulings.
- `CR-20260925-0007` is still `open`. Its eight spec-0012 rows and spec-0006 `TDD-0020`
  stay blocked until the user approves it.

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

### /qfai-atdd run 2026-09-23T19:33:24.738Z

- `TDD-0110` … `TDD-0115`: REDs passed by `qa-gatekeeper` (RED phase) on file hashes
  `b45c049e…64e2e2a` and `c7517a90…1249df`; handoffs ready. The GREEN of `TDD-0110`, `TDD-0111`,
  `TDD-0112`, `TDD-0113` and `TDD-0115` is the `/qfai-sdd` skill-text round. The earlier REDs of
  `TDD-0111` and `TDD-0115` are kept as superseded history.
- `TDD-0114` reads the whole shipped assistant tree, so its GREEN is the tree after the
  spec-0011 skill-text GREEN and the schema withdrawal as well as its own.
- Checkpoint departure (user decision, see Decisions made): no full-suite checkpoint runs per
  row. All rows' full-suite checkpoints close together on the final head's CI.

## Final status

Historical PASS for the original four rows, each for the part of its obligation named
under "Ledger rows advanced". This is a per-row verdict, not a stage verdict:
the pack is not clean, and eight of its twelve `done` rows are listed under Gaps
rather than claimed.

The three new rows have live P1d falsifiability PASS and focused GREEN. Their
full checkpoint, review pack and completion verdict remain pending.

TDD-0110 through TDD-0115 held a per-row PASS as TDD-0044 through TDD-0049. The
renumbering returned them to `todo` (`.qfai/specs/spec-0013/09_delta.md`, "Renumbering after the merge"), so that verdict is history
until they are completed again.

`TDD-0110` and `TDD-0111` are handed over on the falsifiability branch. Their
mutation runs, `qa-gatekeeper` verdicts, GREEN, review packs and checkpoint are
`/qfai-implement`'s, and remain pending.

## First full CI checkpoint

- Revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Run: https://github.com/aganesy/QFAI/actions/runs/36026684599
- Result: PASS — build, lint, types, all nine package test slices, Node floor tests, and ci-pass succeeded.
- Rows closed: TDD-0110, TDD-0111, TDD-0112, TDD-0113, TDD-0114, TDD-0115, shown mapped. They were closed as TDD-0044..TDD-0049 before the renumber, so this checkpoint is history: the rows are `todo` again.

## Record defects

- `record:QFAI-TDDLIST-008`, `TDD-0110`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `92c2348be2179f2c21afc4d73db02c3b4c8847a8573c33f601a2331766fd042c`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0111`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `1a4021d1381e34a8c9e5d54664c6b8676b723c8fc3d2c3f92072d347ec4c7a9c`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0112`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `05aa4663d3a9053787d4fbcf5dcd24ad3a7b3a05b897fbaabfd04f55839079bd`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0113`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `0f30fe0de447a293cf11ef5063f33b36dbc561f0eaf4c777753cf6cd19b7e798`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0114`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `c97d9e677261538ab77d73f9f1b85bb834133998729832525d532445b6f2824b`; the original sealed review remains historical.
- `record:QFAI-TDDLIST-008`, `TDD-0115`, Round 1: the TC reference, RED result, Oracle proof and parity value did not expose the observed run in the validator's fields. The ATDD entry now states the observed failure, command, selector and exact parity value. The completion and implementation reviewers re-attested PASS at `working-tree+8fc4a997096e64a1f08fafb4d4b8440e3311305d30a83168c7780278e3320c3c` over audited hash `eca62e968eb38e1b5101f36772ca9c8bad37fa0aca62c5b042b2d581e34db5ad`; the original sealed review remains historical.
