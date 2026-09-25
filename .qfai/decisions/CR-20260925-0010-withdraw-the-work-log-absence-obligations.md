# Change Request

- ID: `CR-20260925-0010`
- Title: `The work-log removal withdraws the obligations that test the surface is absent`
- Raised by: `requirements-analyst, for the stopped /qfai-atdd spec-0013 run`
- Raised at: `2026-09-25T04:27:24Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (Claude Code structured question)`
- Approved at: `2026-09-25T04:52:16Z`
- Approved option: `1`
- Applied at: `-`
- Superseded by: `-`

## Context

The user instructed on 2026-09-25, through structured questions:

1. Do not implement tests that check `.qfai/steering/` is gone. Nothing in the
   product reacts to the directory, present or absent, and nothing extra is
   implemented.
2. Withdraw the absence tests together with their AC, BR, EX and TC
   obligations and their ledger rows. The production removal stays.
3. Withdrawn catalog schema: withdraw only its tests. The generic retire pass
   and `QFAI-ASSETS-006` stay unchanged, with no exemption for the path.
4. Replacement skill text: keep the text and withdraw its tests
   (`spec-0011/TDD-0021`, `spec-0013/TDD-0110`, `spec-0013/TDD-0111`).
5. Withdraw `spec-0004/TDD-0070`. It repeats
   `packages/qfai/tests/core/tddListBlockedStatus.test.ts` ("errors when
   Blocked-By is empty"), which predates the change.
6. Move the unrelated `tddList.ts` change out of this pull request into a
   separate one.

This contradicts recorded upstream text. The discussion pack
`discussion-20260923060900824` asks for the absence tests in nine REQ
acceptance clauses, in NFR-0003's measurement, in `05_Scope.md` capability 9
and in `10_Policy.md`: "Removal is pinned by tests of absence, not by deleting
tests alone." The four specs carry approved Triage rows (2026-09-23) that
appended the obligations. Changing them is a Change Request.

The only row of the withdrawn chains that stays is `spec-0004/TDD-0072`.
Before this change, AC-0004-0018 already required a justification on
`R-REJECTED-READOPT`, and TDD-0072 is now the only test of that rule.

## Proposed change

Withdraw every obligation whose only content is that the work-log surface is
absent, or that restates a behaviour an existing test already covers. Keep
every production deletion, the replacement skill text and the generic retire
mechanism.

### Upstream edits (discussion pack)

All paths are under `.qfai/discussion/discussion-20260923060900824/`. The
behaviour clause of each REQ stays; only the acceptance-by-test clause goes.
Suggested wording is for `/qfai-discussion` to adopt or improve.

| Location                | Now asks for                                                                                     | Amended acceptance                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `06_REQ.md:10` REQ-0001 | An integration test finds no `.qfai/steering/` path and no work-log line after `qfai init`       | NFR-0006's search finds none of the removed symbols, and the type check fails on any import of a removed function                                                                           |
| `06_REQ.md:11` REQ-0002 | `validate --profile full` on a malformed `.qfai/steering/` reports none of the five codes        | The five codes are absent from `emittedRuleCodes.ts` and the profile lists (NFR-0006's search)                                                                                              |
| `06_REQ.md:12` REQ-0003 | Empty `justification` on `R-WORKLOG-DRIFT` raises nothing; on `R-REJECTED-READOPT` it still does | An empty `justification` on `R-REJECTED-READOPT` still raises a justification error                                                                                                         |
| `06_REQ.md:13` REQ-0004 | Three trees: named `Blocked-By` passes, empty fails, unreadable steering file raises nothing     | A `blocked` row with an empty `Blocked-By` still fails with `TDDLIST_BLOCKED_MISSING_REF`, as the existing `tddListBlockedStatus.test.ts` shows                                             |
| `06_REQ.md:15` REQ-0006 | Tests of the retire pass and `QFAI-ASSETS-006` on the withdrawn schema                           | The file is absent from the shipped tree and from `governedAssistantManifest.ts`; the retire pass and `QFAI-ASSETS-006` are the generic behaviour `assistantAssetProvenance.test.ts` covers |
| `06_REQ.md:16` REQ-0007 | A test that no shipped assistant file names the surface, and that each home appears              | Checked by review: no file under `assets/init/.qfai/assistant/**` names `.qfai/steering/` or `worklog-entry.schema.md` (NFR-0006), and each named home appears in the skill that reaches it |
| `06_REQ.md:17` REQ-0008 | A test that the three files carry the same stop steps and none names an entry                    | Checked by review, with the stop steps already pinned by the existing `autoModeApprovalDegrade.test.ts`                                                                                     |
| `06_REQ.md:19` REQ-0010 | An integration test hashes a populated `.qfai/steering/` around `init --force` and `validate`    | No path in `packages/qfai/src/**` names `.qfai/steering/` (NFR-0006), and no finding code names the directory                                                                               |
| `06_REQ.md:26` REQ-0017 | "Tests pin the absence" and "each acceptance signal above has a test"                            | Tests that pinned the surface are deleted with it, no test is added to assert its absence, and no test imports a removed module                                                             |
| `07_NFR.md:9` NFR-0003  | Integration test hashing every file around `qfai init` and `qfai init --force`                   | NFR-0006's search finds no `.qfai/steering/` in `packages/qfai/src/**`; the edited schema copy is kept by the generic retire pass                                                           |
| `05_Scope.md:23-24`     | "tests that pin its absence come in"                                                             | Tests that pinned the surface go, and none is added in their place                                                                                                                          |
| `10_Policy.md:36-37`    | "Removal is pinned by tests of absence, not by deleting tests alone."                            | The coverage reading below                                                                                                                                                                  |
| `99_delta.md`           | —                                                                                                | A `drift` row in `## Change History` and an entry under `## Drift Events`, citing this CR                                                                                                   |

The `## Rejected Decisions` rows of `99_delta.md` stay as history. Their
Recurrence Prevention cells at lines 34, 35 and 38 still resolve against the
amended wording. The cell at line 36, "NFR-0003 hash test", now means
NFR-0003's amended measurement; the drift row says so. NFR-0006 stays as it is.

### Coverage reading

`CLAUDE.md` says "All source changes must have corresponding test coverage."
For a change that only deletes, this CR records the reading:

- The tests that fixed the removed behaviour are deleted with it.
- The type check fails on any import of a deleted module.
- The behaviour that remains keeps its existing tests. The change adds no test
  beyond `spec-0004/TDD-0072`, which tests the kept `R-REJECTED-READOPT` rule.

A test that asserts the deleted surface is absent covers no behaviour the
product has. `10_Policy.md:36-37` is amended to this reading, so a reviewer
does not raise it again.

### Outside the ledgers

- Delete the absence assertions this change added to two unregistered tests.
  Before the change both asserted the surface was present. Removing those
  assertions was required; turning them into absence assertions was not.
  - `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts` lines 58, 59,
    91 and 113, the `not.toContain("work-log")` and
    `not.toContain("consultation-needed")` lines. The rewritten `toContain`
    lines stay.
  - `packages/qfai/tests/scripts/checkReadmeAlignment.test.ts` lines 175-176.
    Rename the `it` at line 168 to drop "without withdrawn work-log
    references".
- `packages/qfai/src/cli/main.ts:462`, the `--force` help text, still says
  "specs/contracts/steering ... are never overwritten". Change it to
  "specs/contracts", matching the NOTE in `init.ts`. REQ-0001 already requires
  this, so it adds nothing and needs no test.

### Move-out of the unrelated `tddList.ts` change

Commit `66ee3cf6d` changed `packages/qfai/src/core/validators/tddList.ts` in
two ways that have nothing to do with the work-log surface:

- `requestedTddIds` accepts a `## TDD IDs` list;
- `bareSha256` normalises the audited hash before comparing it.

Their tests are the "accepts the documented TDD IDs list" and "sha256-prefixed
hash" cases in `packages/qfai/tests/core/tddListEvidence.test.ts`, from the same
commit. No row of the four specs covers them. This pull request reverts those
hunks, and a separate pull request off `main` carries them.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                               | Cost                                                                             | Risk                                                                                                                         | Recommended            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Withdraw every absence and duplicate obligation with its tests, keep TDD-0072, keep the behaviour, keep the text, move the `tddList.ts` change out   | Four spec re-derives, one pack amendment, ten test files deleted and five edited | The replacement skill text has no dedicated test; the approval-stop steps stay pinned by `autoModeApprovalDegrade.test.ts`   | ✅ (the user's choice) |
| 2   | Keep every absence obligation and test as the pack states them                                                                                       | None now                                                                         | Tests that assert a directory is absent stay, and so does the maintenance they need                                          |                        |
| 3   | Withdraw only the pure absence tests; keep the record-homes tests (TDD-0021, TDD-0110) and the withdrawn-schema tests (TDD-0068, TDD-0098, TDD-0099) | Smaller re-derive                                                                | Three tests repeat `assistantAssetProvenance.test.ts` with a file name; exempting the path instead would be special handling |                        |

## Blocked downstream items

| Item                                         | Kind         | Why it depends on the artifact                                                 |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `spec-0003/TDD-0094`..`TDD-0097`             | `ledger-row` | `done`; TC-0003-0059/0060 are withdrawn (REQ-0001, REQ-0010)                   |
| `spec-0003/TDD-0098`, `TDD-0099`             | `ledger-row` | `done`; TC-0003-0061 is withdrawn (REQ-0006)                                   |
| `spec-0004/TDD-0018`                         | `ledger-row` | `done`; the `R-WORKLOG-DRIFT` boundary of TC-0004-0018 is withdrawn (REQ-0003) |
| `spec-0004/TDD-0067`, `TDD-0068`             | `ledger-row` | `done`; TC-0004-0074/0075 are withdrawn (REQ-0002, REQ-0006, REQ-0010)         |
| `spec-0004/TDD-0069`..`TDD-0071`             | `ledger-row` | `done`; TC-0004-0076 is withdrawn (REQ-0004)                                   |
| `spec-0011/TDD-0021`..`TDD-0023`             | `ledger-row` | `done`; TC-0011-0013 is withdrawn (REQ-0007)                                   |
| `spec-0013/TDD-0110`, `TDD-0112`..`TDD-0114` | `ledger-row` | `red`, uncommitted; TC-0013-0038 is withdrawn (REQ-0007)                       |
| `spec-0013/TDD-0111`, `TDD-0115`             | `ledger-row` | `red`, uncommitted; TC-0013-0039 is withdrawn (REQ-0008)                       |
| `/qfai-atdd spec-0013`                       | `spec`       | The run in flight on TDD-0110..0115 stops; no row advances to `green`          |

Every row above is left exactly as it is until the `/qfai-sdd` rerun deletes
it. None is parked: each is past `todo`.

- Not blocked by this CR:
  - `spec-0004/TDD-0072`, which stays. Its `TC-Refs` names TC-0004-0018, which
    survives, narrowed to `R-REJECTED-READOPT`.
  - The uncommitted additions to `.qfai/evidence/atdd-spec-0013.md` and
    `.qfai/evidence/skeleton.md`. They are history and are committed, not
    reverted; the spec-0013 tombstones point at them.
  - `spec-0015/TDD-0039`, closed in `66ee3cf6d` alongside the moved-out change.
    It is not withdrawn, but see step 6 of the rerun plan.
- Overlapping open CRs:
  - `CR-20260924-0005` edits `spec-0003/05_Examples.md`, `06_Test-Cases.md`,
    `09_delta.md` and `tdd/test-list.md`, on rows disjoint from these. It names
    `TDD-0100` as its next row, and the tombstones for TDD-0094..0099 keep
    that true. The two apply in either order; whichever lands second
    re-derives against the other's text.
  - `CR-20260925-0006` and `CR-20260925-0007` touch spec-0003, spec-0006,
    spec-0012 and spec-0015 on other rows. The open spec-0013 records
    (`CR-20260913-0001`, `-0003`, `-0004`, `-0008`, `-0010`, `-0011`, `-0014`)
    block other rows. None names a row above.
  - `CR-20260923-0011` (applied) reworded AC-0004-0041, which this CR removes.
    This CR assumes it has landed.

### Relation to `CR-20260924-0006`

This record **supersedes** `CR-20260924-0006`. That record authorised four
upstream edits of the same removal and records "Approved by: `Codex`". An
agent approval is not the user's. The four paths are named in this CR's
`## Impact scope`, so the user's approval of this CR covers them. Once this CR
is approved, `CR-20260924-0006` takes `Status: superseded` and
`Superseded by: CR-20260925-0010`. A superseded record no longer silences
`QFAI-DRIFT-001`, which is why its paths move here rather than being cited.

## Impact scope

- Specs: `spec-0003`, `spec-0004`, `spec-0011`, `spec-0013`
- Plans: `.qfai/specs/spec-0003/10_Plan.md`,
  `.qfai/specs/spec-0004/10_Plan.md`, `.qfai/specs/spec-0011/10_Plan.md`,
  `.qfai/specs/spec-0013/10_Plan.md`
- Tests:
  - deleted: `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts`,
    `spec0003WithdrawnSchemaRetirement.test.ts`,
    `spec0004WorklogSurfaceRemoval.test.ts`,
    `spec0004WithdrawnSchemaFinding.test.ts`,
    `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts`,
    `spec0004BlockedRowEmptyBlockedBy.test.ts`,
    `spec0004SteeringUnreadableBlockedRow.test.ts`,
    `spec0011RecordHomes.test.ts`, `spec0013RecordHomes.test.ts`,
    `spec0013ApprovalStop.test.ts`, all under `packages/qfai/tests/integration/`
  - edited: `packages/qfai/tests/validators/reviewerJustification.test.ts`
    (lines 4-5, 7 and 46-66), `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`,
    `packages/qfai/tests/scripts/checkReadmeAlignment.test.ts`,
    `packages/qfai/tests/assets/openRowAlreadyTested.test.ts` (lines 107-112),
    `packages/qfai/tsconfig.tests.json` (lines 280-289)
  - moved out: the `66ee3cf6d` hunks of
    `packages/qfai/tests/core/tddListEvidence.test.ts`
- Source: `packages/qfai/src/cli/main.ts` (line 462); the `66ee3cf6d` hunks of
  `packages/qfai/src/core/validators/tddList.ts`, moved out
- Documents: `README.md` and `packages/qfai/README.md`, edited together, drop
  `steering/` under `discussion-20260923060900824#REQ-0012`
- Contracts: none changed by this CR; the two below carry over from
  `CR-20260924-0006`
- Schema: none
- Cross-spec obligations, **not withdrawn by this CR**:
  - The withdrawn rows raised `## Cross-spec obligations` entries in
    `.qfai/evidence/atdd-spec-0003.md`, `.qfai/evidence/atdd-spec-0004.md`,
    `.qfai/evidence/implement-spec-0004.md` and
    `.qfai/evidence/atdd-spec-0011.md`, and in spec-0013's evidence if one is
    written. The production edits that raised them stay, so the entries stay.
  - Each keeps its original `TDD-ID`, which the tombstone keeps unique. None is
    moved to `spec-0004/TDD-0072` or deleted.
  - Their re-review of other specs' `done` rows is not withdrawn either. The
    completion review closes each entry as already planned, with
    `re-reviewed` or a `CR-*` of its own.
  - Each such section gets one prose line citing this CR for the retired
    source ids. It sits outside every `### TDD-NNNN` section, so no audited
    evidence hash moves.
- Rows of the cross-spec review this CR disposes of — exactly these ten, each
  a row this CR deletes:
  - `spec-0003/TDD-0094`, `TDD-0095`, `TDD-0096`, `TDD-0097`, `TDD-0098`,
    `TDD-0099`
  - `spec-0011/TDD-0021`, `TDD-0022`, `TDD-0023`
  - `spec-0013/TDD-0114`, formerly `TDD-0048`

  Each takes `Resolution: CR-20260925-0010` once this CR is applied: its
  `Applied at` is set, and the row is deleted and tombstoned. If the user does
  not approve the Triage group that deletes a spec's rows, those rows stay
  `done` and return to the review. Every other row of the review keeps its
  planned route.

- Upstream paths edited under this CR:
  - `.qfai/discussion/discussion-20260923060900824/05_Scope.md`,
    `.qfai/discussion/discussion-20260923060900824/06_REQ.md`,
    `.qfai/discussion/discussion-20260923060900824/07_NFR.md`,
    `.qfai/discussion/discussion-20260923060900824/10_Policy.md`,
    `.qfai/discussion/discussion-20260923060900824/99_delta.md`
  - `.qfai/specs/spec-0003/01_Spec.md`, `.qfai/specs/spec-0003/02_User-stories.md`,
    `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`,
    `.qfai/specs/spec-0003/04_Business-Rules.md`,
    `.qfai/specs/spec-0003/05_Examples.md`,
    `.qfai/specs/spec-0003/06_Test-Cases.md`,
    `.qfai/specs/spec-0003/07_Decisions.md`, `.qfai/specs/spec-0003/09_delta.md`,
    `.qfai/specs/spec-0003/10_Plan.md`, `.qfai/specs/spec-0003/tdd/test-list.md`
  - `.qfai/specs/spec-0004/01_Spec.md`,
    `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`,
    `.qfai/specs/spec-0004/04_Business-Rules.md`,
    `.qfai/specs/spec-0004/05_Examples.md`,
    `.qfai/specs/spec-0004/06_Test-Cases.md`,
    `.qfai/specs/spec-0004/07_Decisions.md`, `.qfai/specs/spec-0004/09_delta.md`,
    `.qfai/specs/spec-0004/10_Plan.md`,
    `.qfai/specs/spec-0004/16_Traceability-ledger.md`,
    `.qfai/specs/spec-0004/tdd/test-list.md`
  - `.qfai/specs/spec-0011/01_Spec.md`,
    `.qfai/specs/spec-0011/03_Acceptance-Criteria.md`,
    `.qfai/specs/spec-0011/04_Business-Rules.md`,
    `.qfai/specs/spec-0011/05_Examples.md`,
    `.qfai/specs/spec-0011/06_Test-Cases.md`,
    `.qfai/specs/spec-0011/07_Decisions.md`, `.qfai/specs/spec-0011/09_delta.md`,
    `.qfai/specs/spec-0011/10_Plan.md`, `.qfai/specs/spec-0011/tdd/test-list.md`
  - `.qfai/specs/spec-0013/01_Spec.md`,
    `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
    `.qfai/specs/spec-0013/04_Business-Rules.md`,
    `.qfai/specs/spec-0013/05_Examples.md`,
    `.qfai/specs/spec-0013/06_Test-Cases.md`,
    `.qfai/specs/spec-0013/07_Decisions.md`, `.qfai/specs/spec-0013/09_delta.md`,
    `.qfai/specs/spec-0013/10_Plan.md`, `.qfai/specs/spec-0013/tdd/test-list.md`
  - carried over from `CR-20260924-0006`: `.qfai/contracts/cli/qfai-validate.md`,
    `.qfai/contracts/cli/worklog-entry.schema.md`,
    `.qfai/specs/spec-0011/07_Decisions.md`,
    `.qfai/specs/spec-0013/07_Decisions.md`

## Decision needed from user

Approve option 1: withdraw the absence and duplicate obligations of the
work-log removal with their tests and ledger rows, keep `spec-0004/TDD-0072`,
keep the production removal and the replacement skill text, move the unrelated
`tddList.ts` change to its own pull request, and let this record supersede
`CR-20260924-0006`?

The item removals themselves are approved on the Triage rows of each spec
(groups G1 to G4), not here.

## Approved actions (owner skill rerun plan)

1. Record the approver and time here. Set `CR-20260924-0006` to
   `Status: superseded`, `Superseded by: CR-20260925-0010`.
2. `/qfai-discussion`, amending `discussion-20260923060900824`: write the edits
   in `## Upstream edits (discussion pack)`, a `drift` row in `99_delta.md`
   citing this CR, and nothing else.
3. `/qfai-sdd spec-0003`, `/qfai-sdd spec-0004`, `/qfai-sdd spec-0011` and
   `/qfai-sdd spec-0013`, each in mode `re-derive`, from the amended pack.
   - Each writes a `## Triage (2026-09-25)` with the approved rows and a
     `## Change Requests` row for this CR.
   - Phase 2b deletes the ledger rows, tombstones each id under
     `## TDD-ID reservations`, and adds that section to spec-0011 and spec-0013,
     which have none.
   - The decisions that decided the withdrawn items are marked superseded, not
     deleted.
   - Downstream ledger sweep: no row is reset. These rows are retired, each by
     its spec's approved `UPDATE:REMOVE` or `UPDATE:MODIFY` Triage row, where
     its `Evidence` cell is copied verbatim:
     `spec-0003/TDD-0094`, `TDD-0095`, `TDD-0096`, `TDD-0097`, `TDD-0098`,
     `TDD-0099`; `spec-0004/TDD-0018`, `TDD-0067`, `TDD-0068`, `TDD-0069`,
     `TDD-0070`, `TDD-0071`; `spec-0011/TDD-0021`, `TDD-0022`, `TDD-0023`;
     `spec-0013/TDD-0110`, `TDD-0111`, `TDD-0112`, `TDD-0113`, `TDD-0114`,
     `TDD-0115`. `spec-0004/TDD-0072` stays.
4. Test deletion, in the same commit as the row deletions, because a `done`
   row naming a deleted file fails `TDDLIST_TEST_FILE_MISSING`:
   - `/qfai-atdd` deletes the ten Integration files in `## Impact scope`.
   - `/qfai-implement` makes the unit edit in `reviewerJustification.test.ts`,
     the edits to the unregistered tests, `openRowAlreadyTested.test.ts`,
     `tsconfig.tests.json`, and the `main.ts:462` help text.
5. Dogfood re-pin, downward only: run `node scripts/check-dogfood-backlog.mjs`
   for `tdd`, `sdd` and `full`, and lower `scripts/dogfood-backlog.json` where a
   count fell. No pin rises (NFR-0005).
6. Move the `66ee3cf6d` `tddList.ts` and `tddListEvidence.test.ts` hunks to a
   pull request off `main`, and revert them here. Then run
   `qfai validate --profile tdd` with the repository build. If
   `spec-0015/TDD-0039` or any other surviving `done` row fails because its
   review record relies on the moved-out behaviour, merge that pull request
   first and merge `main` into this branch, rather than re-sealing the record.
7. Gates: `pnpm ci:lint`, `qfai validate --profile tdd|sdd|full` with the
   repository build (not `npx qfai`), then the pull request's CI.
8. Fill `Resolution` and `Applied at` once steps 2 to 7 are done.
9. In the cross-spec review, write `Resolution: CR-20260925-0010` on the ten
   rows `## Impact scope` names, and the prose line citing this CR in each
   `## Cross-spec obligations` section. Nothing else in those sections changes.

## Resolution

Pending explicit approval and the owner reruns.
