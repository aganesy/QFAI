# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-23
- Primary: Behavior
- Tags: @api, @docs, @test
- Summary: `qfai validate` stops reading `.qfai/steering/`. The schema, link,
  promotion, stale and handoff-brief checks are removed with their items and
  twelve ledger rows. The reviewer justification rule keeps
  `R-REJECTED-READOPT` only. AC-0004-0040 and AC-0004-0041 specify the absence
  and the `blocked`-row rule, seeded as TDD-0067..0072 with TDD-0018 reset.

- Change ID: DELTA-0002
- Date: 2026-09-23
- Primary: Behavior
- Tags: @docs, @test
- Summary: Under CR-20260923-0015, AC-0004-0041, BR-0004-0035, EX-0004-0044
  and TC-0004-0076 state that a `blocked` row passes on a well-formed
  `Blocked-By`, naming what it waits on and the status it was blocked at, as
  `TDDLIST_BLOCKED_MISSING_REF` checks. No ledger row changes.

- Change ID: DELTA-0003
- Date: 2026-09-25
- Primary: Behavior
- Tags: @docs, @test
- Summary: Under `CR-20260925-0010`, AC-0004-0040, AC-0004-0041, their BR,
  EX and TC and ledger rows TDD-0018 and TDD-0067..0071 are removed.
  AC-0004-0018 and its chain require a justification on `R-REJECTED-READOPT`
  and say nothing about the removed code. TDD-0072 stays `done`.

- Change ID: DELTA-0004
- Date: 2026-09-26
- Primary: Traceability
- Tags: @docs, @test
- Summary: TC-0004-0088 covers the passing clause of AC-0004-0018, with
  EX-0004-0059 and ledger row TDD-0093 at `todo`. Two requirement bindings
  that named a missing test file name tracked tests.

## Triage (2026-09-26)

A non-empty justification on `R-REJECTED-READOPT` gets its own test case, and
the requirement bindings stop naming a file that does not exist.

| Source           | Subject                                                                                                             | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                   | Depends-On |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| User instruction | Add the passing case of AC-0004-0018: EX-0004-0059, TC-0004-0088 and ledger row TDD-0093                            | spec-0004     | UPDATE    | APPEND | -           | AC-0004-0018 says a non-empty justification passes, and no test case covered that clause. TC-0004-0018 keeps its one boundary, the rejection. No criterion or rule changes                                                                                                  | -          |
| User instruction | Re-point the REQ-0013 and REQ-0015 rows of the requirement bindings in `16_Traceability-ledger.md` to tracked tests | spec-0004     | UPDATE    | MODIFY | -           | Both rows named `tests/core/validate.test.ts`, which does not exist. REQ-0013 takes `tests/core/specScopeValidate.test.ts`, the test BR-0004-0001 binds for `validate.ts`, and REQ-0015 takes `tests/validators/uiEvidenceArtifacts.test.ts`, the test of its own validator | -          |

## Triage (2026-09-25)

The obligations whose only content is that the work-log surface is absent, or
that repeat a behaviour an existing test already covers, are withdrawn under
`CR-20260925-0010`. The production removal stays, and TDD-0072 keeps
`R-REJECTED-READOPT` tested.

| Source                                | Subject                                                                                                                                                                                                                                                                                              | Existing Spec | Operation | Sub-op | Approved By                            | Rationale                                                                                                                                                                                                                                             | Depends-On |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923060900824#REQ-0002 | Remove AC-0004-0040, BR-0004-0034, EX-0004-0042, EX-0004-0043, TC-0004-0074, TC-0004-0075; ledger rows TDD-0067, TDD-0068 deleted and tombstoned; `16_Traceability-ledger.md` rows 17-19 and 24-25 removed                                                                                           | spec-0004     | UPDATE    | REMOVE | user (Claude Code structured question) | The amended REQ-0002, REQ-0006 and REQ-0010 no longer ask for an absence test. `QFAI-ASSETS-006` on a leftover copy is the generic check, tested by `assistantAssetProvenance.test.ts` ("does report an unshipped sibling")                           | -          |
| discussion-20260923060900824#REQ-0004 | Remove AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076; ledger rows TDD-0069, TDD-0070, TDD-0071 deleted and tombstoned; `16_Traceability-ledger.md` rows 20 and 26 removed                                                                                                                   | spec-0004     | UPDATE    | REMOVE | user (Claude Code structured question) | TDD-0069 and TDD-0071 prove the removed check is gone. TDD-0070 repeats `tests/core/tddListBlockedStatus.test.ts` ("errors when Blocked-By is empty"), which keeps `TDDLIST_BLOCKED_MISSING_REF` tested                                               | -          |
| discussion-20260923060900824#REQ-0003 | Narrow AC-0004-0018 (drop the `R-WORKLOG-DRIFT` And), BR-0004-0017 (drop its second sentence), EX-0004-0016 (drop the second And) and TC-0004-0018 (one boundary, Type `error`); ledger row TDD-0018 deleted and tombstoned, TDD-0072 kept                                                           | spec-0004     | UPDATE    | MODIFY | user (Claude Code structured question) | Before: two boundaries, `R-REJECTED-READOPT` rejected and `R-WORKLOG-DRIFT` ignored. After: the first only, which predates the change. This row deletes a ledger row, so it needs the approver                                                        | -          |
| discussion-20260923060900824#REQ-0002 | Adjust `01_Spec.md` to what remains: the source lines naming discussion REQ-0002, 0004, 0006 and 0010, and the AC/BR/EX/TC range lines (`:114-117`). Re-point `16_Traceability-ledger.md` row 21 (BR-0004-0001) to a surviving test of `validate.ts`, and restate the Notes of row 22 (BR-0004-0017) | spec-0004     | UPDATE    | MODIFY | user (Claude Code structured question) | Row 21 binds a deleted file and BR-0004-0001 changed on the branch, so without a binding it raises `QFAI-TRACE-001`. `tests/core/validate.test.ts`, suggested in the plan, is not tracked; `tests/cli/validateRunIncomplete.test.ts` is one candidate | -          |

- Approved By: the user, through a Claude Code structured question at
  2026-09-25T04:52:16Z, for these rows as one set (Triage group G2 of
  `CR-20260925-0010`). The same answer approved the Change Request.
- Line references in the Subject cells are to the files before this run.
- How the fourth row was applied:
  - The four `## Relevant Requirements` lines stay. Each requirement's
    behaviour clause still describes what `qfai validate` does, and
    DR-0004-0025, which names them, stands. What changed is that no criterion
    cites them.
  - The range lines now end at AC-0004-0039, BR-0004-0033, EX-0004-0041 and
    TC-0004-0073.
  - Row 21 binds `packages/qfai/tests/core/specScopeValidate.test.ts`. It runs
    the real `validateProject` over the `sdd` profile and asserts findings from
    its validators. `tests/cli/validateRunIncomplete.test.ts` was not taken,
    because it replaces `validateProject` with a mock. `validate.ts` changed
    on the branch, so the binding needs no `Proof`.
- Retired ledger rows. Phase 2b deleted each row from `tdd/test-list.md` and
  tombstoned its ID under `## TDD-ID reservations`. No row is reset. Each row's
  `Evidence` cell, verbatim:
  - `spec-0004/TDD-0018`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5 -> .qfai/evidence/implement-spec-0004.md#tdd-0018`
  - `spec-0004/TDD-0067`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+6bd3dce938ff90e748781d76e25d0dec2f4538bdd7d90f40496b14437d813b05 -> .qfai/evidence/atdd-spec-0004.md#tdd-0067`
  - `spec-0004/TDD-0068`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9 -> .qfai/evidence/atdd-spec-0004.md#tdd-0068`
  - `spec-0004/TDD-0069`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9 -> .qfai/evidence/atdd-spec-0004.md#tdd-0069`
  - `spec-0004/TDD-0070`:
    `RED:falsifiability GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+ea5fbfa46d21439bd483cb0e7b67826bed86536f571d746faef52aadb29a2870 -> .qfai/evidence/atdd-spec-0004.md#tdd-0070`
  - `spec-0004/TDD-0071`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+66f265784e365f4d16870ec097515ce65966ab9360048c7a35c5d49a0996b3b9 -> .qfai/evidence/atdd-spec-0004.md#tdd-0071`
- TDD-0072 stays `done` with every cell unchanged, `Boundary`
  `rejected-readopt-empty` included. It is the boundary TC-0004-0018 keeps.
  Its evidence names TDD-0018 as `Satisfied-by`, which stays as the record of
  how that round ran.
- The tests those rows drove are deleted in the same commit:
  - by `/qfai-atdd`, whole files, every `it` block belonging to a deleted row:
    `spec0004WorklogSurfaceRemoval.test.ts` (TDD-0067),
    `spec0004WithdrawnSchemaFinding.test.ts` (TDD-0068),
    `spec0004BlockedRowNeedsOnlyBlockedBy.test.ts` (TDD-0069),
    `spec0004BlockedRowEmptyBlockedBy.test.ts` (TDD-0070) and
    `spec0004SteeringUnreadableBlockedRow.test.ts` (TDD-0071), all under
    `packages/qfai/tests/integration/`;
  - by `/qfai-implement`, in
    `packages/qfai/tests/validators/reviewerJustification.test.ts` (TDD-0018):
    the `it` "TC-0004-0018: raises no justification finding when
    R-WORKLOG-DRIFT carries an empty justification" with its comment (lines
    46-66), the header sentence (lines 4-5) and the
    `// QFAI:SPEC-0004:TC-0004-0018` annotation (line 7). Three other tests
    stay in the file.
- Coverage that stays, for the reviewer notes carried from the pack:
  - REQ-0004's positive half, a well-formed `Blocked-By` passing, is covered by
    `tddListBlockedStatus.test.ts` ("accepts ... with its departure status").
  - The pack's DUS-002 lines that name `QFAI-ASSETS-006` on the withdrawn
    schema derive no test or example here: DAC-002-03, the two edge seeds and
    the idempotency seed of `03_Story-Workshop.md`. The generic check is
    covered as the first row says.
- Decisions: DR-0004-0044 records the withdrawal. DR-0004-0045..0047 re-open
  DR-0004-0028, DR-0004-0032 and DR-0004-0040, whose rejected options this
  withdrawal takes. The 2026-09-23 Triage rows and DL-0001..DL-0029 stay as
  history.

## Triage (2026-09-23)

`qfai validate` stops reading the project-root work-log surface
`.qfai/steering/`. The reviewer justification rule keeps `R-REJECTED-READOPT`
only, and a `blocked` ledger row needs nothing beyond its `Blocked-By`.

| Source                                | Subject                                                                                                                                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                              | Depends-On                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| discussion-20260923060900824#REQ-0002 | Remove schema, link, promotion and stale validation: REQ-0035, REQ-0037, REQ-0038, REQ-0039; US-0004-0029, US-0004-0031; AC-0004-0016, -0017, -0020, -0021, -0027, -0028, -0029, -0030; BR-0004-0015, -0016, -0019, -0020; EX-0004-0014, -0015, -0018, -0019, -0027..-0031; TC-0004-0016, -0017, -0020, -0021, -0027..-0031 | spec-0004     | UPDATE    | REMOVE | yusuke_senaga | The behaviour is removed. Ledger rows deleted and their IDs tombstoned: TDD-0016, -0017, -0020, -0021, -0027..-0031 (`done` on `tests/validators/worklogSurface.test.ts`, deleted in the same change) and the E2E rows TDD-0059 and TDD-0061 (`todo`, `US-Refs` on the removed stories)                                                                | -                                     |
| discussion-20260923060900824#REQ-0009 | Remove the handoff-brief check: REQ-0042, AC-0004-0019, BR-0004-0018, EX-0004-0017, TC-0004-0019                                                                                                                                                                                                                            | spec-0004     | UPDATE    | REMOVE | yusuke_senaga | The brief goes with no replacement. Ledger row TDD-0019 deleted and its ID tombstoned. `.qfai/handoff.yaml` and `R-HANDOFF-SCHEMA-DRIFT` are a separate feature and stay                                                                                                                                                                               | -                                     |
| discussion-20260923060900824#REQ-0003 | Narrow the justification rule to `R-REJECTED-READOPT`: REQ-0036, US-0004-0030, AC-0004-0018 (drop "entry ID"), BR-0004-0017, EX-0004-0016, TC-0004-0018                                                                                                                                                                     | spec-0004     | UPDATE    | MODIFY | yusuke_senaga | Before: a justification is required on `R-WORKLOG-DRIFT` and `R-REJECTED-READOPT`, and US-0004-0030 also asks for the handoff sections. After: required on `R-REJECTED-READOPT`; an empty one on `R-WORKLOG-DRIFT` raises nothing. TC-0004-0018 is the only case proving the kept half, so TDD-0018 and E2E TDD-0060 stay and no ledger row is deleted | discussion-20260923060900824#REQ-0009 |
| discussion-20260923060900824#REQ-0003 | Reword the `R-WORKLOG-DRIFT` precedent in US-0004-0036 and BR-0004-0028 to cite BR-0004-0017                                                                                                                                                                                                                                | spec-0004     | UPDATE    | MODIFY | yusuke_senaga | Wording only; the `R-PROMPT-SCANNER-DRIFT` obligation is unchanged                                                                                                                                                                                                                                                                                     | -                                     |
| discussion-20260923060900824#REQ-0002 | Re-parent AC-0004-0026 (`US-Refs` US-0004-0029 to US-0004-0001) and EX-0004-0026 (`BR-Ref` BR-0004-0015 to BR-0004-0001), and add AC-0004-0026 to the `AC-Refs` of BR-0004-0001                                                                                                                                             | spec-0004     | UPDATE    | MODIFY | yusuke_senaga | The agent-catalog SSOT guard is not work-log behaviour but hangs off the removed story and rule. TC-0004-0026 and TDD-0026 are unchanged; no obligation is added or dropped                                                                                                                                                                            | -                                     |
| discussion-20260923060900824#REQ-0010 | Append AC-0004-0040, BR-0004-0034, EX-0004-0042, TC-0004-0074: `validate --profile full` on a tree holding malformed `.qfai/steering/*.md` emits none of the five work-log codes and no finding that names the directory                                                                                                    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | Carries the absence signals of REQ-0002 and REQ-0010                                                                                                                                                                                                                                                                                                   | discussion-20260923060900824#REQ-0002 |
| discussion-20260923060900824#REQ-0006 | Append EX-0004-0043 and TC-0004-0075 under AC-0004-0040 and BR-0004-0034: a remaining `catalog/worklog-entry.schema.md` is reported as `QFAI-ASSETS-006`                                                                                                                                                                    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | The validate half of REQ-0006's acceptance. Existing check; no new code                                                                                                                                                                                                                                                                                | discussion-20260923060900824#REQ-0010 |
| discussion-20260923060900824#REQ-0004 | Append AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076: under `--profile tdd` a `blocked` row with a non-empty `Blocked-By` passes with no other record, an empty one still fails `TDDLIST_BLOCKED_MISSING_REF`, and an unreadable file under `.qfai/steering/` raises nothing                                       | spec-0004     | UPDATE    | APPEND | yusuke_senaga | No item specifies `QFAI-TDDLIST-015` or `QFAI-TDDLIST-016`, so there is nothing to remove. This spec owns the traceability validators, and the row traces the code removal                                                                                                                                                                             | -                                     |

- Approved By: yusuke_senaga, through AskUserQuestion on 2026-09-23, for this
  target's rows as one set, including keeping TDD-0018 and removing TDD-0059 and
  TDD-0061.
- Ledger: Phase 2b deletes TDD-0016, -0017, -0019, -0020, -0021, -0027..-0031,
  -0059 and -0061, records them under a new `## TDD-ID reservations` citing the
  REMOVE rows above, and seeds rows for TC-0004-0074..0076. `/qfai-implement`
  re-points the `Selector` of TDD-0018 once its test is rewritten.
- Size: AC 39 exceeds the slice-policy threshold. The spec owns one capability
  (CAP-0004), so this is recorded and not split. After this triage the spec holds
  32 AC and 43 TC.
- Retired ledger rows. Phase 2b deleted each row from `tdd/test-list.md` and
  tombstoned its ID under `## TDD-ID reservations`. Each row's `Evidence` cell,
  verbatim:
  - `spec-0004/TDD-0016`: `v1.9.0 RED→GREEN 2026-05-23 (kind enum reject)`
  - `spec-0004/TDD-0017`:
    `v1.9.0 RED→GREEN 2026-05-23 (per-link unresolved spec/discussion)`
  - `spec-0004/TDD-0019`: `v1.9.0 RED→GREEN 2026-05-23 (missing 5-section enum)`
  - `spec-0004/TDD-0020`:
    `v1.9.0 RED→GREEN 2026-05-23 (promote-to without Decisions row)`
  - `spec-0004/TDD-0021`: `v1.9.0 RED→GREEN 2026-05-23 (now − updated > 90 days)`
  - `spec-0004/TDD-0027`: `v1.9.0 RED→GREEN 2026-05-23 (YYYY-MM-DD format guard)`
  - `spec-0004/TDD-0028`:
    `v1.9.0 RED→GREEN 2026-05-23 (updatedOrder reversed-date guard)`
  - `spec-0004/TDD-0029`:
    `v1.9.0 RED→GREEN 2026-05-23 (linksElementType non-string element guard)`
  - `spec-0004/TDD-0030`:
    `v1.9.0 RED→GREEN 2026-05-23 (idFormat non-kebab-case guard)`
  - `spec-0004/TDD-0031`:
    `v1.9.0 RED→GREEN 2026-05-23 (2026-02-30 → createdFormat fires past Date.UTC roll)`
  - `spec-0004/TDD-0059`: `no evidence — retired at Status = todo, never executed`
  - `spec-0004/TDD-0061`: `no evidence — retired at Status = todo, never executed`
- What happens to the retired rows' tests. `/qfai-implement` makes these edits
  in the same change:
  - Delete `packages/qfai/tests/validators/worklogSurface.test.ts`, the test file
    of TDD-0016, -0017, -0019, -0020, -0021 and -0027..-0031.
  - In `packages/qfai/tests/integration/validatorConvergenceIntegration.test.ts`,
    remove the `TC-0004-0027`..`TC-0004-0031` annotations (lines 29-33) and
    their mention in the header comment (line 10).
  - In `packages/qfai/tests/assets/rowNamesItsTestFile.test.ts`, remove the five
    `spec-0004 TDD-0027`..`TDD-0031` entries of `KNOWN_TEST_FILE_DRIFT`
    (lines 45-49).
  - In the annotation carrier `tests/integration/qfai-traceability.md`, remove
    `QFAI:SPEC-0004:TC-0004-0016`, `-0017`, `-0019`, `-0020`, `-0021` and
    `-0027`..`-0031` (lines 110-111, 113-115 and 121-125).
  - TDD-0059 and TDD-0061 had no test. The annotation carrier
    `tests/e2e/qfai-traceability.md` lists their stories: remove
    `QFAI:SPEC-0004:US-0004-0029` and `QFAI:SPEC-0004:US-0004-0031`
    (lines 46 and 48).
- Rewrite, not delete: TDD-0018 keeps its test,
  `packages/qfai/tests/validators/reviewerJustification.test.ts:47`, which
  asserts the reversed oracle — an error on an empty `R-WORKLOG-DRIFT`
  justification. `/qfai-implement` rewrites it to assert no justification
  finding and re-points the row's `Selector`.
- Rows reset and added. TDD-0018 is reset to `todo` under `DR-0296`, with
  Boundary `worklog-drift-ignored`. TDD-0072 holds the other boundary of
  TC-0004-0018, `rejected-readopt-empty`. TDD-0067 and TDD-0068 hold
  TC-0004-0074 and TC-0004-0075. TDD-0069..TDD-0071 hold the three boundaries
  of TC-0004-0076: `blocked-by-named`, `blocked-by-empty` and
  `steering-unreadable`. The next free ID is TDD-0073.
- Tier is seeded only on TDD-0018 and TDD-0067..TDD-0072. Every other row keeps
  the value it had, which for most is blank and reads as T1. No Change Request
  drives those rows, and re-deriving their Tier would raise some of them, which
  resets `done` rows this change does not otherwise touch.

## Update History

| Date       | DL      | Summary                                                                        |
| ---------- | ------- | ------------------------------------------------------------------------------ |
| 2026-09-23 | DL-0001 | Removed items are deleted with no marker                                       |
| 2026-09-23 | DL-0002 | One tombstone per retired TDD-ID                                               |
| 2026-09-23 | DL-0003 | Retired rows, their Evidence and their tests' fate sit beside the Triage rows  |
| 2026-09-23 | DL-0004 | TDD-0018 is reset to `todo` under DR-0296                                      |
| 2026-09-23 | DL-0005 | TC-0004-0018 splits by boundary into TDD-0018 and TDD-0072                     |
| 2026-09-23 | DL-0006 | New cases use Level and Layer `integration`                                    |
| 2026-09-23 | DL-0007 | TDD-0072 takes Layer `validators`                                              |
| 2026-09-23 | DL-0008 | Tier seeded on new and reset rows only                                         |
| 2026-09-23 | DL-0009 | Parents of AC-0004-0040 and AC-0004-0041                                       |
| 2026-09-23 | DL-0010 | The unshipped-schema finding is a clause of AC-0004-0040 and BR-0004-0034      |
| 2026-09-23 | DL-0011 | Upstream requirements named as pack pairs; new criteria carry Source lines     |
| 2026-09-23 | DL-0012 | Changed lines are written in English                                           |
| 2026-09-23 | DL-0013 | The justification rule covers `R-REJECTED-READOPT` only                        |
| 2026-09-23 | DL-0014 | Every appended item is kept                                                    |
| 2026-09-23 | DL-0015 | The Tier limit is stated in one ledger bullet                                  |
| 2026-09-23 | DL-0016 | The contract's broader justification sentence stays                            |
| 2026-09-23 | DL-0017 | BR-0004-0034 binds CLI-VAL                                                     |
| 2026-09-23 | DL-0018 | The justification rule resolves to the set `reviewerJustification.ts` enforces |
| 2026-09-23 | DL-0019 | `QFAI-ASSETS-006` resolves through the existing validate surface               |
| 2026-09-23 | DL-0020 | BR-0004-0035 cites CLI-VAL                                                     |
| 2026-09-23 | DL-0021 | BR-0004-0028 resolves to `qfai-validate.md`; AC-0004-0026 binds no contract    |
| 2026-09-23 | DL-0022 | The plan states the removal order once, for all six specs                      |
| 2026-09-23 | DL-0023 | The removal's tests build their own trees                                      |
| 2026-09-23 | DL-0024 | RE-OPEN of DL-0016: the contract's justification sentence is narrowed          |
| 2026-09-23 | DL-0025 | RE-OPEN of DL-0018: the justification rule resolves directly to the contract   |
| 2026-09-23 | DL-0026 | TC-0004-0018 is Level `unit`; TDD-0018 and TDD-0072 are Layer `unit`           |
| 2026-09-23 | DL-0027 | TDD-0072 runs after TDD-0018 and cites it as `Satisfied-by`                    |
| 2026-09-23 | DL-0028 | TDD-0067..TDD-0071 need no change; TC-0004-0074 keeps one row                  |
| 2026-09-23 | DL-0029 | A blocked row passes on a well-formed `Blocked-By` (CR-20260923-0015)          |
| 2026-09-25 | DL-0030 | The work-log absence obligations are withdrawn (CR-20260925-0010)              |
| 2026-09-25 | DL-0031 | RE-OPEN of DL-0014: items that assert existing behaviour are dropped           |
| 2026-09-25 | DL-0032 | RE-OPEN of DL-0018: the R-WORKLOG-DRIFT clause leaves AC-0004-0018             |
| 2026-09-25 | DL-0033 | RE-OPEN of DL-0026: TDD-0018 is retired                                        |

## Decision Log

### DL-0001

#### Meta

```yaml
id: DL-0001
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004 02..06
notes: Removed items are deleted outright with no marker (DR-0004-0015).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Leave a reserved-gap comment where each removed item was
  reason: It restates the approved Triage row as history.
  do_not: Add gap comments for the removed IDs.
  temptation: The examples file already carries one such comment.
- option: Keep each removed heading and mark it removed
  reason: The orphan and trace checks still read the heading.
  do_not: Keep headings for removed items.
  temptation: It looks like a safer audit trail.

### DL-0002

#### Meta

```yaml
id: DL-0002
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md
notes: One tombstone bullet per retired TDD-ID, citing the Triage Source (DR-0004-0016).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: One bullet per range of retired IDs
  reason: The allocation rule reads one id per tombstone.
  do_not: Write a range in a tombstone bullet.
  temptation: Ten of the twelve IDs are consecutive in pairs and runs.

### DL-0003

#### Meta

```yaml
id: DL-0003
date: 2026-09-23
primary: Ops
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - spec-0004/09_delta.md
notes: Retired rows, their Evidence and their tests' fate are listed beside the approved Triage rows (DR-0004-0017).
```

#### Migration / Follow-ups

- `/qfai-implement` makes the test edits the list names.

#### Rejected

- option: Rewrite the approved Rationale cells
  reason: They are the record the user approved.
  do_not: Edit an approved Triage row to add Phase 2b detail.
  temptation: The Rationale already names the rows.
- option: Keep the record in the ledger
  reason: The ledger holds live rows only.
  do_not: Park retired rows or their evidence in `tdd/test-list.md`.
  temptation: The ledger is where the rows lived.

### DL-0004

#### Meta

```yaml
id: DL-0004
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md TDD-0018
notes: TDD-0018 is reset to todo under DR-0296, prior evidence kept (DR-0004-0018).
```

#### Migration / Follow-ups

- `/qfai-implement` re-executes TDD-0018 against the rewritten test.

#### Rejected

- option: Leave TDD-0018 done and let implementation swap its Selector
  reason: Its evidence proves the opposite of the new behaviour, and an upstream reset is the only lawful exit from done.
  do_not: Keep a done row whose evidence contradicts its rule.
  temptation: The test file and the case ID do not change.

### DL-0005

#### Meta

```yaml
id: DL-0005
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md TDD-0018, TDD-0072
notes: TC-0004-0018 splits by boundary; TDD-0018 takes worklog-drift-ignored, TDD-0072 rejected-readopt-empty (DR-0004-0019).
```

#### Migration / Follow-ups

- TDD-0072 records the state production already has at RED.

#### Rejected

- option: TDD-0018 takes rejected-readopt-empty and TDD-0072 takes worklog-drift-ignored
  reason: TDD-0018's test already drives R-WORKLOG-DRIFT, so it keeps that boundary.
  do_not: Move TDD-0018 onto a boundary its test does not exercise.
  temptation: The existing row's selector names the error case.
- option: A new TC-0004-0077 for the R-WORKLOG-DRIFT half
  reason: It needs a Triage row the approved set does not have.
  do_not: Add a case outside the approved MODIFY row.
  temptation: One case per half reads more simply.

### DL-0006

#### Meta

```yaml
id: DL-0006
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/06_Test-Cases.md
  - spec-0004/tdd/test-list.md
notes: New cases use Level integration; their rows use Layer integration in lowercase (DR-0004-0020).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Level L3
  reason: The pack already declares integration for this layer.
  do_not: Mix L3 into this pack's Level column.
  temptation: L3 is the catalog's canonical name.
- option: Layer Integration, capitalised
  reason: The existing integration rows are lowercase.
  do_not: Mix spellings in one ledger.
  temptation: The template spells it with a capital.

### DL-0007

#### Meta

```yaml
id: DL-0007
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md TDD-0072
notes: TDD-0072 takes Layer validators, like TDD-0018 (DR-0004-0021).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Layer Integration for TDD-0072
  reason: The rows of one case stay in one group, and moving TDD-0018 needs a Change Request.
  do_not: Split one case's rows across layers.
  temptation: validators is not a legal Layer value.

### DL-0008

#### Meta

```yaml
id: DL-0008
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md
notes: Tier is seeded on new and reset rows only (DR-0004-0022).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Re-derive Tier on every unchanged row
  reason: A raised Tier on a done row is an upstream reset, and no Change Request drives one.
  do_not: Re-derive Tier on rows this change does not touch.
  temptation: Phase 2b re-derives Tier on a full reseed.

### DL-0009

#### Meta

```yaml
id: DL-0009
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/03_Acceptance-Criteria.md
notes: AC-0004-0040 hangs from US-0004-0020 and AC-0004-0041 from US-0004-0001 (DR-0004-0023).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A new user story for the removal
  reason: It adds an E2E ledger row the approved Triage does not list.
  do_not: Add a story for the absence checks.
  temptation: The criteria are about a new outcome.

### DL-0010

#### Meta

```yaml
id: DL-0010
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/03_Acceptance-Criteria.md AC-0004-0040
  - spec-0004/04_Business-Rules.md BR-0004-0034
notes: The unshipped-schema finding is a second clause of AC-0004-0040 and BR-0004-0034 (DR-0004-0024).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A separate criterion and rule for the schema file
  reason: The approved Triage row places the case under AC-0004-0040 and BR-0004-0034.
  do_not: Add a criterion outside the Triage.
  temptation: The schema finding has its own code.

### DL-0011

#### Meta

```yaml
id: DL-0011
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/01_Spec.md
  - spec-0004/03_Acceptance-Criteria.md
notes: Upstream requirements are named as pack pairs without a local ID; new criteria carry Source lines (DR-0004-0025).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Mint local REQ IDs for the upstream requirements
  reason: This spec's own REQ-0010 already means something else.
  do_not: Reuse a pack REQ number as a local REQ ID.
  temptation: Other specs list local REQ IDs.
- option: No Relevant Requirements lines, Source lines only
  reason: The execution consumer reads 01_Spec.md, which should name every requirement the spec answers.
  do_not: Leave the upstream requirements out of 01_Spec.md.
  temptation: The Source lines already trace each criterion.

### DL-0012

#### Meta

```yaml
id: DL-0012
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004 01, 04
notes: Changed lines are written in English; REQ-0036 and BR-0004-0017 whole, BR-0004-0028 its last bullet (DR-0004-0026).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Translate the untouched Japanese text as well
  reason: It is outside what the change edits.
  do_not: Rewrite unchanged items for language alone.
  temptation: The files mix languages.

### DL-0013

#### Meta

```yaml
id: DL-0013
date: 2026-09-23
primary: Behavior
tags: ["@api", "@test"]
compat: Change
scope:
  - spec-0004 01..06 (REQ-0036, US-0004-0030, US-0004-0036, AC-0004-0018, AC-0004-0026, BR-0004-0001, BR-0004-0017, BR-0004-0028, EX-0004-0016, EX-0004-0026, TC-0004-0018)
notes: The justification rule covers R-REJECTED-READOPT only; an empty one on R-WORKLOG-DRIFT raises nothing (DR-0004-0027).
```

#### Migration / Follow-ups

- A reviewer report that carries `R-WORKLOG-DRIFT` is no longer checked for a
  justification. No adopter action is needed.

#### Rejected

- option: BR-0004-0017 ends "R-WORKLOG-DRIFT is not checked by this rule"
  reason: It reads as if the code were still a Reviewer-Gate code.
  do_not: Describe R-WORKLOG-DRIFT as a live code the rule skips.
  temptation: It is the shortest way to say the rule narrowed.
- option: US-0004-0036 cites BR-0004-0017
  reason: A story may not cite a business rule (`TRACE_DOWNSTREAM_REF`); it cites REQ-0036, which states the same rule.
  do_not: Put a BR ID in `02_User-stories.md`.
  temptation: The Triage row names BR-0004-0017 for both rewordings.

#### Verification

### Plan

```yaml
- id: VFY-001
  level: integration
  target: TC-0004-0018, both boundaries
  method: The reviewer-justification suite under TDD-0018 and TDD-0072
  owner: dev
  expected: An empty justification on R-REJECTED-READOPT is an error; on R-WORKLOG-DRIFT it raises no justification finding.
  links:
    - .qfai/specs/spec-0004/tdd/test-list.md
```

### DL-0014

#### Meta

```yaml
id: DL-0014
date: 2026-09-23
primary: Ops
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - spec-0004 03..06 (AC-0004-0040..0041, BR-0004-0034..0035, EX-0004-0042..0044, TC-0004-0074..0076)
notes: Every appended item is kept (DR-0004-0028).
```

#### Migration / Follow-ups

- `/qfai-atdd` writes the tests for TC-0004-0074..0076.
- DL-0031 re-opens this decision (DR-0004-0045).

#### Rejected

- option: Drop the items that assert existing behaviour
  reason: Each answers an acceptance signal of an upstream requirement.
  do_not: Drop EX-0004-0043 or TC-0004-0075 as needing no new code.
  temptation: The unshipped-file check already exists.

### DL-0015

#### Meta

```yaml
id: DL-0015
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/09_delta.md
notes: The Tier limit and its reason are stated in one ledger bullet (DR-0004-0029).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: State nothing about the rows left without a Tier
  reason: A reader cannot tell a limit from an omission.
  do_not: Leave the Tier limit unstated.
  temptation: The rows are unchanged.

### DL-0016

#### Meta

```yaml
id: DL-0016
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/04_Business-Rules.md BR-0004-0017
notes: The broader justification sentence in the qfai validate contract stays; BR-0004-0017 states the narrower rule (DR-0004-0030).
```

#### Migration / Follow-ups

- No migration required.
- DL-0024 re-opens this decision (DR-0004-0038).

#### Rejected

- option: Narrow the contract sentence to R-REJECTED-READOPT
  reason: The contract is outside the approved list, so editing it is the user's decision.
  do_not: Edit the contract's justification sentence in this change.
  temptation: The sentence is broader than the spec.

### DL-0017

#### Meta

```yaml
id: DL-0017
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/04_Business-Rules.md BR-0004-0034
notes: BR-0004-0034 binds CLI-VAL (DR-0004-0031).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Contract-Refs -
  reason: The rule states what qfai validate reads, which CLI-VAL governs.
  do_not: Leave BR-0004-0034 unbound.
  temptation: No other rule in this file names a contract.

### DL-0018

#### Meta

```yaml
id: DL-0018
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0004/03_Acceptance-Criteria.md (AC-0004-0018)
  - spec-0004/04_Business-Rules.md (BR-0004-0017)
notes: The justification rule resolves to the set reviewerJustification.ts enforces, which R-WORKLOG-DRIFT leaves (DR-0004-0032).
```

#### Migration / Follow-ups

- No migration required.
- DL-0025 re-opens this decision (DR-0004-0039).
- DL-0032 re-opens its rejection of dropping the `R-WORKLOG-DRIFT` clause (DR-0004-0046).

#### Rejected

- option: Narrow the qfai-validate.md sentence to the justification set
  reason: It contradicts DR-0004-0030 and removes the rejection rule BR-0015-0013 relies on.
  do_not: Edit the contract's justification sentence in this change.
  temptation: Read literally, the sentence still covers R-WORKLOG-DRIFT.
- option: Drop the R-WORKLOG-DRIFT clause from AC-0004-0018 and BR-0004-0017
  reason: It contradicts the approved REQ-0003 row.
  do_not: Remove an approved acceptance clause to fit the contract.
  temptation: It would make the obligation match the sentence word for word.

### DL-0019

#### Meta

```yaml
id: DL-0019
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0004/04_Business-Rules.md (BR-0004-0034)
notes: QFAI-ASSETS-006 resolves through the existing validate surface, assistantAssets.ts and the generated governed-asset manifest (DR-0004-0033).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Add a QFAI-ASSETS-006 row to the table of new codes in qfai-validate.md
  reason: The code is not new, and the row widens the approved contract edits.
  do_not: List an existing code as a new one.
  temptation: The rule names the code and the contract does not.

### DL-0020

#### Meta

```yaml
id: DL-0020
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0004/04_Business-Rules.md (BR-0004-0035)
notes: BR-0004-0035 carries Contract-Refs CLI-VAL; BR-0004-0017's join is recorded in the evidence only (DR-0004-0034).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Add Contract-Refs CLI-VAL to BR-0004-0017 as well
  reason: The join is recorded in the evidence, and the rule needs no new line for it.
  do_not: Add a binding line to a reworded rule the Triage did not ask to bind.
  temptation: DR-0004-0031's reason applies to both rules.
- option: Record BR-0004-0035's join in the evidence only
  reason: A rule this run added about what validate reads names its contract, as BR-0004-0034 does.
  do_not: Leave BR-0004-0035 unbound.
  temptation: The evidence already holds the join.

### DL-0021

#### Meta

```yaml
id: DL-0021
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/04_Business-Rules.md (BR-0004-0028)
  - spec-0004/03_Acceptance-Criteria.md (AC-0004-0026)
notes: BR-0004-0028 resolves to qfai-validate.md; AC-0004-0026 is realized by the agent-catalog guard test and binds no contract (DR-0004-0035).
```

#### Migration / Follow-ups

- No migration required.

### DL-0022

#### Meta

```yaml
id: DL-0022
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0004/10_Plan.md
notes: The plan states the order of the work-log removal once, for all six specs, and names code by symbol (DR-0004-0036).
```

#### Migration / Follow-ups

- The plans of spec-0003, spec-0011 and spec-0013 cite this order.

#### Rejected

- option: One statement of the order in each spec's plan
  reason: Six copies of one order drift apart.
  do_not: Copy the order into the other plans.
  temptation: Each implementer reads its own spec's plan.
- option: Require every step of the change to be green on its own
  reason: One change lands, and only its head is checked.
  do_not: Order the steps for per-commit green builds.
  temptation: A green build at each step reads as safer.
- option: Rewrite the earlier sections of this plan
  reason: The request does not cover them.
  do_not: Re-audit or rewrite the Current State and second-wave sections in this change.
  temptation: The Current State section is out of date.

### DL-0023

#### Meta

```yaml
id: DL-0023
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/10_Plan.md (Test approach)
notes: The removal's tests build their own trees; no shared fixture is planned (DR-0004-0037).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A shared fixture for a populated .qfai/steering/ tree
  reason: The three trees differ, so there is no third identical caller.
  do_not: Plan a shared fixture before three callers need the same tree.
  temptation: Three tests put files under the same directory.

### DL-0024

#### Meta

```yaml
id: DL-0024
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-validate.md (## Reviewer-Gate input bundle)
notes: RE-OPEN of DL-0016 (DR-0004-0038, re-opening DR-0004-0030). The user approved narrowing the contract sentence through AskUserQuestion on 2026-09-23.
```

#### Migration / Follow-ups

- The contract requires and checks a justification only for R-REJECTED-READOPT, the other codes it declares with one, and the justification catalog codes.

#### Rejected

- option: Keep the broad sentence and reconcile it by a stated join
  reason: Read alone, the contract predicts the reverse of TDD-0018's oracle.
  do_not: Restore a justification sentence that covers every R-* code.
  temptation: The code already enforces the narrower set.
- option: Narrow the sentence to R-REJECTED-READOPT only
  reason: The catalog codes would lose the contract line BR-0015-0013 cites.
  do_not: Drop the catalog codes from the sentence.
  temptation: BR-0004-0017 names R-REJECTED-READOPT alone.

### DL-0025

#### Meta

```yaml
id: DL-0025
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0004/03_Acceptance-Criteria.md (AC-0004-0018)
  - spec-0004/04_Business-Rules.md (BR-0004-0017)
notes: RE-OPEN of DL-0018 (DR-0004-0039, re-opening DR-0004-0032). AC-0004-0018 and BR-0004-0017 resolve to the narrowed contract sentence with no join.
```

#### Migration / Follow-ups

- No migration required.

### DL-0026

#### Meta

```yaml
id: DL-0026
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/06_Test-Cases.md (TC-0004-0018 Level)
  - spec-0004/tdd/test-list.md (TDD-0018, TDD-0072 Layer)
notes: TC-0004-0018 is Level unit and both its rows are Layer unit, derived from the falsifying oracle (DR-0004-0040). Supersedes DL-0007.
```

#### Migration / Follow-ups

- `/qfai-implement` owns both rows. The line for TC-0004-0018 in
  `tests/integration/qfai-traceability.md` is read by no gate once the case is
  `unit`, and stays.
- DL-0013's VFY-001 names `level: integration` for this case. It is now
  `unit`.
- DL-0033 re-opens its rejection of retiring TDD-0018 (DR-0004-0047).

#### Rejected

- option: Level integration and Layer Integration for both rows
  reason: The oracle reads the returned issue, which is unit level; the report file is setup BR-0004-0017 does not own.
  do_not: Raise a level to match how a test happens to be driven.
  temptation: TDD-0040 and spec-0015 TDD-0029 check the same predicate at integration.
- option: Retire TDD-0018 and seed a fresh unit row
  reason: The approved Triage set keeps TDD-0018, and no owner or evidence file changes.
  do_not: Retire a row the user approved keeping.
  temptation: The Level-crossing rule retires a `todo` row and reseeds it.
- option: Keep Layer validators on both rows
  reason: It is not a legal Layer, and the case had two owners.
  do_not: Seed a Layer the vocabulary does not list.
  temptation: The rest of the spec's validators rows keep it.

### DL-0027

#### Meta

```yaml
id: DL-0027
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/10_Plan.md (step 1)
notes: TDD-0072 runs after TDD-0018 reaches done and cites it as Satisfied-by (DR-0004-0041).
```

#### Migration / Follow-ups

- `/qfai-implement` runs TDD-0018 before TDD-0072.

#### Rejected

- option: TDD-0072 cites reviewerJustification.ts as Satisfied-by
  reason: A unit row may not cite production code no ledger row owns.
  do_not: Record a production path as Satisfied-by on a unit row.
  temptation: The rule already holds in that file.

### DL-0028

#### Meta

```yaml
id: DL-0028
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md (TDD-0067..TDD-0071)
notes: Reviewed with no change. TC-0004-0074 keeps one row, since its two assertions observe one boundary (DR-0004-0042).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Split TC-0004-0074 into a codes row and a path row
  reason: Both assertions observe that validate does not read the directory, and the same edit makes both pass.
  do_not: Split one boundary seen from two angles.
  temptation: The case names two acceptance signals, REQ-0002's and REQ-0010's.

### DL-0029

#### Meta

```yaml
id: DL-0029
date: 2026-09-23
primary: Behavior
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - spec-0004/03_Acceptance-Criteria.md (AC-0004-0041)
  - spec-0004/04_Business-Rules.md (BR-0004-0035)
  - spec-0004/05_Examples.md (EX-0004-0044)
  - spec-0004/06_Test-Cases.md (TC-0004-0076)
notes: The items state TDDLIST_BLOCKED_MISSING_REF as it is; the passing Blocked-By names its status (CR-20260923-0015, DR-0004-0043).
```

#### Migration / Follow-ups

- No migration required. TDD-0069..TDD-0071 stay at `todo`, and `/qfai-atdd`
  writes TC-0004-0076 against the restated example.

#### Rejected

- option: Relax parseBlockedBy so a cell without a departure status passes
  reason: The discussion requirement keeps TDDLIST_BLOCKED_MISSING_REF unchanged, and the departure status is the only record a resumed row has of where it stopped.
  do_not: Weaken the check to fit the example.
  temptation: The example is shorter than the check.

### DL-0030

#### Meta

```yaml
id: DL-0030
date: 2026-09-25
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - spec-0004/01_Spec.md (range lines)
  - spec-0004/03_Acceptance-Criteria.md (AC-0004-0018 narrowed; AC-0004-0040, AC-0004-0041 removed)
  - spec-0004/04_Business-Rules.md (BR-0004-0017 narrowed; BR-0004-0034, BR-0004-0035 removed)
  - spec-0004/05_Examples.md (EX-0004-0016 narrowed; EX-0004-0042..0044 removed)
  - spec-0004/06_Test-Cases.md (TC-0004-0018 narrowed; TC-0004-0074..0076 removed)
  - spec-0004/16_Traceability-ledger.md (rows of the removed items; BR-0004-0001 re-bound)
  - spec-0004/tdd/test-list.md (TDD-0018, TDD-0067..0071 deleted and tombstoned)
notes: The work-log absence obligations are withdrawn under CR-20260925-0010, approved by the user; TDD-0072 stays (DR-0004-0044).
```

#### Migration / Follow-ups

- `/qfai-atdd` deletes the five `spec0004*` integration test files, and
  `/qfai-implement` removes the TDD-0018 test from
  `reviewerJustification.test.ts`, in the same commit.

#### Rejected

- option: Bind BR-0004-0001 to tests/cli/validateRunIncomplete.test.ts
  reason: That file replaces validateProject with a mock, so it runs none of the validators BR-0004-0001 is about.
  do_not: Bind a machine-gate rule to a test that mocks the gate.
  temptation: The Change Request named it as a candidate.
- option: Remove the four discussion requirement lines from 01_Spec.md
  reason: Each requirement's behaviour clause still describes qfai validate, and DR-0004-0025 stands.
  do_not: Leave the upstream requirements out of 01_Spec.md.
  temptation: No criterion cites them any more.

#### Verification

### Plan (DL-0030)

```yaml
- id: VFY-001
  level: integration
  target: no spec-0004 ledger row or binding names a deleted test file
  method: qfai validate --profile sdd and --profile tdd --spec spec-0004 with the repository build, after the test files are deleted
  owner: dev
  expected: No TDDLIST_TEST_FILE_MISSING and no QFAI-TRACE-001 for spec-0004.
  links:
    - .qfai/specs/spec-0004/tdd/test-list.md
    - .qfai/specs/spec-0004/16_Traceability-ledger.md
```

### DL-0031

#### Meta

```yaml
id: DL-0031
date: 2026-09-25
primary: Behavior
tags: ["@test"]
compat: Change
scope:
  - spec-0004/05_Examples.md (EX-0004-0043 removed)
  - spec-0004/06_Test-Cases.md (TC-0004-0075, TC-0004-0076 removed)
notes: RE-OPEN of DL-0014 (DR-0004-0045, re-opening DR-0004-0028). The user approved dropping items an existing test already covers through CR-20260925-0010.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Keep TDD-0070 beside tddListBlockedStatus.test.ts
  reason: It repeats "errors when Blocked-By is empty", which predates the change.
  do_not: Add a second test of a behaviour an existing test already covers.
  temptation: The row was already done.

#### Verification

### Plan (DL-0031)

```yaml
- id: VFY-001
  level: unit
  target: TDDLIST_BLOCKED_MISSING_REF and QFAI-ASSETS-006 stay tested
  method: tests/core/tddListBlockedStatus.test.ts and tests/core/assistantAssetProvenance.test.ts
  owner: dev
  expected: The existing cases pass unchanged.
  links:
    - packages/qfai/tests/core/tddListBlockedStatus.test.ts
    - packages/qfai/tests/core/assistantAssetProvenance.test.ts
```

### DL-0032

#### Meta

```yaml
id: DL-0032
date: 2026-09-25
primary: Behavior
tags: ["@test"]
compat: Change
scope:
  - spec-0004/03_Acceptance-Criteria.md (AC-0004-0018)
  - spec-0004/04_Business-Rules.md (BR-0004-0017)
  - spec-0004/05_Examples.md (EX-0004-0016)
  - spec-0004/06_Test-Cases.md (TC-0004-0018)
notes: RE-OPEN of DL-0018 (DR-0004-0046, re-opening DR-0004-0032). The R-WORKLOG-DRIFT clause goes because the code is gone, approved by the user through CR-20260925-0010.
```

#### Migration / Follow-ups

- No migration required. TDD-0072 already tests the boundary that stays.

#### Rejected

- option: Keep the clause and test that R-WORKLOG-DRIFT raises nothing
  reason: The user decided that nothing reacts to the work-log surface and that no test checks a removed code is ignored.
  do_not: Test that a removed finding code is ignored.
  temptation: A rule that lost a code reads as unfinished without a test of the loss.

#### Verification

### Plan (DL-0032)

```yaml
- id: VFY-001
  level: unit
  target: an empty justification on R-REJECTED-READOPT is still an error
  method: TDD-0072, tests/validators/reviewerRejectedReadopt.test.ts
  owner: dev
  expected: The case passes unchanged.
  links:
    - packages/qfai/tests/validators/reviewerRejectedReadopt.test.ts
```

### DL-0033

#### Meta

```yaml
id: DL-0033
date: 2026-09-25
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0004/tdd/test-list.md (TDD-0018 deleted and tombstoned)
notes: RE-OPEN of DL-0026 (DR-0004-0047, re-opening DR-0004-0040). The user approved retiring TDD-0018 through CR-20260925-0010; no row replaces it.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Seed a fresh row for the retired boundary
  reason: The boundary is no longer an obligation.
  do_not: Seed a row for a boundary the case no longer declares.
  temptation: DL-0026 paired retiring with reseeding.

## Rejected

- Candidate: Narrow the contract's justification sentence
- Reason: DR-0004-0030 held the edit to be outside the approved contract edits.
- DO NOT: Edit the sentence without the user's approval.
- Temptation: The sentence is broader than the spec.
- Re-opened by: DR-0004-0038
- Candidate: Narrow the qfai-validate.md sentence to the justification set
- Reason: DR-0004-0032 held that it contradicted DR-0004-0030.
- DO NOT: Narrow it past the catalog codes BR-0015-0013 relies on.
- Temptation: Read literally, the broad sentence still covered R-WORKLOG-DRIFT.
- Re-opened by: DR-0004-0039
- Candidate: Drop the items that assert existing behaviour
- Reason: DR-0004-0028 kept every appended item.
- DO NOT: Drop EX-0004-0043 or TC-0004-0075 as needing no new code.
- Temptation: The check they assert already exists.
- Re-opened by: DR-0004-0045
- Candidate: Drop the R-WORKLOG-DRIFT clause from AC-0004-0018 and BR-0004-0017
- Reason: DR-0004-0032 held that dropping it would remove an approved acceptance clause to fit the contract.
- DO NOT: Remove an approved acceptance clause to fit the contract.
- Temptation: The contract sentence was broader than the rule.
- Re-opened by: DR-0004-0046
- Candidate: Retire TDD-0018 and seed a fresh unit row
- Reason: DR-0004-0040 held that the user had approved keeping TDD-0018.
- DO NOT: Retire a row the user approved keeping.
- Temptation: A fresh row avoids relabelling one in place.
- Re-opened by: DR-0004-0047

## Change Requests

| CR ID            | Upstream artifact                                                                                                                                                                                   | Mode      | Approved by                            | Applied at           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------- | -------------------- |
| CR-20260923-0015 | `spec-0004/03_Acceptance-Criteria.md`, `spec-0004/04_Business-Rules.md`, `spec-0004/05_Examples.md`, `spec-0004/06_Test-Cases.md`                                                                   | re-derive | yusuke_senaga                          | 2026-09-23T20:08:13Z |
| CR-20260925-0010 | `spec-0004/01_Spec.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `10_Plan.md`, `16_Traceability-ledger.md`, `tdd/test-list.md` | re-derive | user (Claude Code structured question) | -                    |

## 2026-09-04

- `CR-20260904-0003` (`confirm-only`, `/qfai-sdd 0004`): this spec's
  `iter-NN/review.json` schema disagreed with
  `core/validators/prototypingEvidence.ts` in three places, and the
  implementation is canonical for all three (operator decision).
  `AC-0004-0012`'s eight `lap-*` IDs named navigation and interaction defects
  while `assets/validators/layoutAntiPatterns.json` — what `loadKnownLapIds`
  resolves against — names layout archetypes; seven of eight had no
  counterpart, so every ID the criterion listed except
  `lap-008-no-back-affordance` was rejected by the shipped gate. The criterion
  now points at the registry and lists its IDs with their scopes.
  `AC-0004-0013`'s `designMdViolations` shape was
  `{category, expected, found, location}` with any extra field rejecting; the
  validator checks `{kind, found}` and ignores the rest, and the criterion now
  says so. `04_Business-Rules.md` and `05_Examples.md` said `prose` where the
  validator requires `proseCritique` — 17 occurrences plus `REVIEW_KNOWN_KEYS`,
  so a payload written to the spec was rejected twice.

  **Upstream artifacts changed:** `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md`, `08_Open-questions.md`. All are
  upstream SSOT under `drift-protocol.md:63-65`, which is why this took a
  Change Request. Each corrected criterion records what it used to say.

  No DERIVED artifact changed, and no test: `06_Test-Cases.md` cites the
  criteria by ID rather than restating the shapes, and the tests already assert
  the implementation's shape — which is what this CR makes canonical.

  **Not settled:** two product questions the choice does not answer are open as
  `OQ-0168` (is the navigation-defect family separately worth detecting? seven
  of those IDs have no detector today and none was deliberately retired) and
  `OQ-0169` (should a reviewer supply `expected` and `location`? the gate drops
  both, so a violation is reported without a location). Filed from **#1105**.

- `CR-20260904-0001` (`confirm-only`, `/qfai-sdd 0004`): `TDD-0011`, `TDD-0012`
  and `TDD-0013` were `done` against
  `packages/qfai/tests/core/prototypingEvidence.negative.test.ts`, which holds
  no `QFAI-PROT-002` assertion; `16_Traceability-ledger.md`'s `REQ-0020` row
  cited the same file. All four now name
  `packages/qfai/tests/validators/prototypingEvidence.test.ts`, and one test was
  added there for `EX-0004-0010`'s payload so `TDD-0011`'s selector resolves.
  **Upstream artifacts changed:** `16_Traceability-ledger.md`'s `REQ-0020` row,
  above. Only `tdd/test-list.md`'s `Test file` column is writable without the
  drift path; `drift-protocol.md:63-65` puts every other file under
  `.qfai/specs/**` — this ledger included — under upstream SSOT, so repointing
  that row is an upstream change and is covered by `CR-20260904-0001`'s approval
  and by this `confirm-only` rerun. An earlier revision of this entry said
  "Nothing upstream of `tdd/test-list.md` changed" while recording the ledger
  edit two sentences above; that was self-contradictory and is withdrawn.

  No DERIVED artifact changed: `03`, `04`, `05` and `06` are untouched, and
  "v1.x-shaped" in `TC-0004-0011` is not a version check — `EX-0004-0010`
  defines it as a payload missing the required keys.

  **Scope of the confirm-only:** this rerun confirms only that the corrected
  ledger rows describe the tests that exist. It does **not** certify the rest of
  the pack. Three divergences between this spec's `review.json` schema and the
  shipped validator were found while recording it and are tracked in **#1105**:
  `04:60` / `05:68` name the prose key `prose` where the validator requires
  `proseCritique`; `03:58` defines `designMdViolations` as
  `{category, expected, found, location}` where `prototypingEvidence.ts:79-87`
  checks `{kind, found}`; and seven of `AC-0004-0012`'s eight `lap-*` names
  differ from `assets/validators/layoutAntiPatterns.json`. Choosing a canonical
  side for each needs its own Change Request.

## 2026-04-22

- Clarified: validate's prototyping responsibility is current skill/evidence/schema gating.
- Superseded: active references to the removed `prototypingRecommendation.ts` validator.
- Added: `packages/qfai/src/core/validators/prototypingEvidence.ts` as the current prototyping schema validator in the validate path.
- Preserved: `QFAI-UIE-001/002` and other deterministic validator slices as current machine-gate behavior.

## 2026-05-06 — CHG-001 — Absorbed validator subjects from spec-0017 (decomposition)

- Trigger: spec-0017 (CAP-0017 v2.0 / UX-loop redesign) violates `_policies/11_Slice-Policy.md` (1 spec = 1 CAP, 1 skill = 1 spec). Validator-side subjects belong to spec-0004 (validate territory).
- Posture: additive append; no purge in spec-0004. Backward compatibility for existing validators retained.
- Approved By: yusuke_senaga

## Triage (CHG-001)

| Source                       | Subject                                     | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                  |
| ---------------------------- | ------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------ |
| spec-0017 REQ-0017-0015      | DCON-030 / 031 / 032 validators             | spec-0004     | UPDATE    | APPEND | yusuke_senaga | DESIGN.md / lock / mirror gate is validate |
| spec-0017 TC-0017-0015..0017 | prototypingEvidenceV3 schema validator      | spec-0004     | UPDATE    | APPEND | yusuke_senaga | review.json schema gate is validate        |
| spec-0017 AC-0017-0018       | layoutAntiPatternsDetected schema validator | spec-0004     | UPDATE    | APPEND | yusuke_senaga | lap-\* whitelist enforcement is validate   |
| spec-0017 AC-0017-0019       | designMdViolations schema validator         | spec-0004     | UPDATE    | APPEND | yusuke_senaga | violation shape gate is validate           |
| spec-0017 AC-0017-0020       | `findDesignMdViolations` purity contract    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | pure-fn determinism is validate            |

## CHG-001 Operations

| Op ID  | Op Type       | Target                                                | Summary                                                                                                                         |
| ------ | ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In + REQ-0025..0031 + Entry points) | DCON-030/031/032, prototypingEvidenceV3, lap whitelist, designMdViolations shape, findDesignMdViolations purity を Scope に追加 |
| OP-002 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0008..0014)        | DCON-030/031/032, prototypingEvidenceV3, lap whitelist, designMdViolations shape, findDesignMdViolations purity の AC layer     |
| OP-003 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0008..0013)             | mirror BR layer for OP-002                                                                                                      |
| OP-004 | UPDATE:APPEND | 05_Examples.md (EX-0004-0007..0012)                   | worked examples per AC-0004-0008..0014                                                                                          |
| OP-005 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0008..0014)                 | test coverage per AC; routes to existing tests under `packages/qfai/tests/core/validators/`                                     |

## CHG-001 Notes

- spec-0004 は CHG-001 から開始 (既存 CHG-NNN なし、本日 2026-05-06 が初 CHG)。
- `QFAI-PROT2-NNN` プレフィックスは distributed-surface 禁止リスト (`.agents/rules/distributed-surface.md`) のため、本 spec 文面では `QFAI-DCON-NNN` / `QFAI-PROT-NNN` のみ使用。
- spec-0017 番号は永久 gap として予約 (`_policies/11_Slice-Policy.md` §ID 安定性ルール 5)。
  **注 (2026-08-05 追記)**: この恒久予約は `_policies/10_delta.md` § CHG-007 / DR-0275 で撤廃され、
  `spec-0017` は `CAP-0017 = Repository Toolchain` として再採番された。上記行は 2026-05-06 時点の
  記録として保持する（現行の制約ではない）。
- 実装側 error code 整合: AC-0004-0011/0012/0013 は `QFAI-PROT-002` (per-iter shape) で発火 (実装は schema-v3-violation / lap-whitelist-violation / designMdViolations-shape-violation を 1 つの error code に集約)。
- 残課題 (Phase 8): (a) 実装の `designMdViolations` shape は `{kind, found}`、spec 文面の `{category, expected, found, location}` と齟齬。(b) `findDesignMdViolations(html, designMd)` 関数は現実装に存在しない。両者は別 spec / 別 phase で migration 予定。

## Triage

| Source                                                                                                       | Subject                                                                                                                                                                              | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008 (CHG-003) | `qfai validate` が 4-layer asset-tree enforcement、work-log frontmatter schema、drift/promote/stale/link checks、SKILL.md `project_memory:` 宣言、deprecated-path warning を実装する | spec-0004     | UPDATE    | APPEND | pin-implied | Primary capability owner (CAP-0004)。subject-token overlap (`validate`, `assistant`, `path`)。新 finding code 10+ を追加。                                                                                                                                                                                                                                       |
| REQ-0009 (CHG-003)                                                                                           | `assistantPaths.ts` SSOT module を validate 側 reader が import する (companion of spec-0003 row)                                                                                    | spec-0004     | UPDATE    | APPEND | pin-implied | Cross-spec module consumer。                                                                                                                                                                                                                                                                                                                                     |
| `discussion-20260804173914356#REQ-0012`, `#REQ-0013` (CHG-007)                                               | `pnpm ci:lint` lane inventory gains the workflow-hygiene lane                                                                                                                        | spec-0004     | UPDATE    | MODIFY | -           | Cascade from CHG-007. spec-0004 owns the ci:lint lane inventory, so a new lane is recorded here; the lane's own rule set and its shipped-file target are owned by spec-0017 and spec-0003. No validator and no finding code is added to `qfai validate` itself — the lane is a repository script, following the pack-location lane precedent (no contract file). |

## CHG-003 (v1.9.0) — Assistant-layer Recut + Work-log Schema Validation

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-validate.md` (CLI-VAL、Contract Index)、`.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- New REQs (to be appended to `01_Spec.md#Relevant Requirements` in this CHG):
  - REQ-0034: 4-layer asset-tree enforcement (`constitution/`, `manifest/`, `catalog/`, `process/` 以外を reject)
  - REQ-0035: work-log frontmatter schema validation (`W-WORKLOG-SCHEMA`、severity warning、non-blocking)
  - REQ-0036: Reviewer-Gate drift findings (`R-WORKLOG-DRIFT`, `R-REJECTED-READOPT` — severity error, advisory-failing with mandatory non-empty `justification:` field)
  - REQ-0037: decision-promotion gate (`W-PENDING-PROMOTION` + dedicated section in validate report; satisfied when `07_Decisions.md` row + entry archive + `promoted-to` back-ref all present)
  - REQ-0038: stale-entry surfacing (`W-WORKLOG-STALE` for `status: active` entries with `updated` older than 90 days)
  - REQ-0039: link-integrity validation (`W-WORKLOG-BROKEN-LINK` for unresolved `links: [spec-NNNN, discussion-*, entry-XXXX]`)
  - REQ-0040: `D-DEPRECATED-PATH` warning during deprecation window; warning text MUST name sunset version (REQ-0018 of pack); escalates to error at sunset (REQ-0008)
  - REQ-0041: SKILL.md `project_memory:` declaration enforcement (REQ-0010); read of un-declared path is rejected
  - REQ-0042: `R-HANDOFF-INCOMPLETE` Reviewer-Gate finding for `kind: handoff` entries missing any of 5 required sections (canonical reference: `.qfai/contracts/cli/worklog-entry.schema.md` under the "kind: handoff body — required sections" subsection)
  - REQ-0043: `W-SKILL-DOC-BROKEN-REF` for SKILL.md references that do not resolve in current layout (NFR-0008)
  - REQ-0044: `W-USER-EDIT-PRESERVED` informational pass-through when `qfai init --upgrade-assistant-tree` preserves user edits
- Cascade:
  - companion row in spec-0003 (init seed → validate enforce)
  - companion row in spec-0015 (Reviewer-Gate input bundle + finding `justification:` schema)
  - companion rows in all skill specs (SKILL.md `project_memory:` block presence)
- Out-of-scope (this spec): seeding (spec-0003); agent implementation of drift heuristic (spec-0015)
- Implementation-phase 詳細は本 PR で append 完了 (per-spec SDD pass landed in this PR):
  - US: US-0004-0028..0033 (work-log surface + reviewer bundle + skill enforcement + upgrade-tree)
  - AC: AC-0004-0015..0030 (no gaps; AC-0004-0026 is the ssot-guard SSOT-divergence acceptance)
  - BR: BR-0004-0014..0024 (mirror layer for the new ACs)
  - EX: EX-0004-0013..0031 (per-AC worked examples; gaps at EX-0004-0024..0025 only — see 05_Examples.md HTML comment)
  - TC: TC-0004-0015..0031 (validator finding-emit checks + cross-spec ssot-guard + per-format calendar-validity guard)
  - TDD: TDD-0015..0031 (RED→GREEN evidence in `tdd/test-list.md`)

### CHG-003 Operations (this PR)

| Op ID  | Op Type       | Target                                                                                   | Summary                                                                                                                        |
| ------ | ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| OP-006 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0034..0044)                                       | 11 v1.9.0 finding-code / schema requirements appended                                                                          |
| OP-007 | UPDATE:APPEND | 02_User-stories.md (US-0004-0028..0033)                                                  | new US for work-log surface + reviewer bundle + skill enforcement + upgrade-tree                                               |
| OP-008 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0015..0030; no gaps — AC-0004-0026 covers ssot-guard) | per-REQ acceptance criteria including per-field date/scope/blocking/id-format sub-criteria                                     |
| OP-009 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0014..0024)                                                | mirror BR layer for OP-008                                                                                                     |
| OP-010 | UPDATE:APPEND | 05_Examples.md (EX-0004-0013..0031; gaps at 0024..0025 only)                             | worked examples per AC                                                                                                         |
| OP-011 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0015..0031; ssot-guard Level enum + TC-0004-0026)              | validator finding-emit + cross-spec ssot-guard + per-format calendar-validity guard; Level enum extended with `ssot-guard` row |
| OP-012 | UPDATE:APPEND | tdd/test-list.md (TDD-0015..0031)                                                        | RED→GREEN evidence rows; layer covers validators / ssot-guard                                                                  |

- Source: REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves all existing AC/BR/EX/TC numbering. NFR-0101 (SSOT-sync mirror) and NFR-0103 (validate warning names sunset version) absorbed into BR layer via BR-0004-0026 / BR-0004-0027.
- Approved By: yusuke_senaga

## Triage (CHG-005)

| Source                                  | Subject                                                                                                                                        | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| REQ-0120 (discussion-20260523221141355) | `validate.json` profile disambiguation (profile-suffixed + always-latest with explicit `profile` field; legacy path deprecated until `1.10.0`) | spec-0004     | UPDATE    | APPEND | yusuke_senaga | validate output path semantics are spec-0004 owned (CAP-0004); deprecation pattern reuses BR-0004-0021 sunset-named contract |
| REQ-0102 (discussion-20260523221141355) | SSOT-sync invariant — `pnpm ci:lint` lane enforces pair-changed `findDesignMdViolations.ts` ↔ `generator-prompt.md`                            | spec-0004     | UPDATE    | APPEND | yusuke_senaga | validate lane extension lives in spec-0004 territory; mirrors `.agents/rules/distributed-surface.md` layer-1/2/3 pattern     |
| REQ-0125 (discussion-20260523221141355) | `R-PROMPT-SCANNER-DRIFT` finding code with mandatory `justification:` 3-part contract                                                          | spec-0004     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate finding shape enforcement is spec-0004 (mirrors BR-0004-0017 R-WORKLOG-DRIFT pattern)                          |
| NFR-0101 (SSOT-sync mirror enforced)    | absorbed into BR-0004-0027 (SSOT-sync pair-changed CI lane)                                                                                    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | NFR realized as BR-layer mechanical guarantee                                                                                |
| NFR-0103 (warning names sunset version) | absorbed into BR-0004-0026 (legacy validate.json deprecation window)                                                                           | spec-0004     | UPDATE    | APPEND | yusuke_senaga | NFR realized through existing sunset-named-in-warning pattern (BR-0004-0021)                                                 |

## CHG-005 Operations

| Op ID  | Op Type       | Target                                                                                  | Summary                                                                                                                                                                        |
| ------ | ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OP-013 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0120 / REQ-0102 / REQ-0125; Entry-points ranges) | 3 new REQs appended; range expanded to US-0036 / AC-0035 / BR-0029 / EX-0036 / TC-0064                                                                                         |
| OP-014 | UPDATE:APPEND | 02_User-stories.md (US-0004-0034..0036)                                                 | profile-suffixed validate output + SSOT-sync pair-changed lane + R-PROMPT-SCANNER-DRIFT justification user stories                                                             |
| OP-015 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0031..0035)                                          | per-REQ acceptance criteria including pair-changed pass-cases (neither / both edited) and deprecation-window escalation                                                        |
| OP-016 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0025..0029)                                               | mirror BR layer for OP-015; reuses BR-0004-0017 (justification non-empty) and BR-0004-0021 (sunset named) patterns                                                             |
| OP-017 | UPDATE:APPEND | 05_Examples.md (EX-0004-0032..0036)                                                     | worked examples per AC                                                                                                                                                         |
| OP-018 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0055..0064)                                                   | test coverage per AC — TC level pinned `integration` (per spec-0004 catalog) for end-to-end profile-suffixed wiring and CI-lane behavior; `validators` for finding-emit checks |

- Notes:
  - Sunset version `1.10.0` is the next minor after the pinned branch (`feature/v1.9.1`); the literal string is the only versioned token allowed in spec text per `.agents/rules/distributed-surface.md` exception for npm-version markers.
  - Parallel pack pieces: spec-0012 receives the iterate-side scanner/prompt implementation; spec-0006 receives the `qfai doctor` playwright probe rebuild; spec-0013 receives the SDD UI contract template `primary_tasks:` slot; spec-0015 receives the Reviewer-Gate cycle + drift finding emission.
  - 9 deferred-OQ decisions made upstream by the orchestrator are reflected verbatim in REQ text (OQ-0111 = option A profile-suffixed path; legacy path sunset = `1.10.0`).
- Source: REQ-0120, REQ-0102, REQ-0125 (discussion-20260523221141355); NFR-0101, NFR-0103

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR | Rationale                                                                                                                                                                                  | Approver |
| ------------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| UPDATE:APPEND | spec-0004   | REQ-0150  | spec-0006 CHG-005 cycle で REQ/AC/TC composite ID が doctor.ts コメントに leak し manual reviewer audit でのみ検出された defect を lint-shipping `src-comment` lane で automation 化する。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0004)

| Operation | Sub-op | Target                                                                                                                | Source (REQ)                 | Rationale        | DR-Ref                    | Status |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- | ------------------------- | ------ |
| UPDATE    | APPEND | 01_Spec.md (Scope.In + Relevant Requirements + Entry-points ranges → US-0039 / AC-0039 / BR-0033 / EX-0041 / TC-0073) | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0004-0037..0039)                                                                               | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0004-0036..0039)                                                                        | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0004-0030..0033)                                                                             | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0004-0038..0041)                                                                                   | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0004-0067..0073)                                                                                 | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0004-0014)                                                                                        | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (OQ-0158/0159/0167 resolved notes)                                                               | REQ-0164, REQ-0167           | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |

- Notes:
  - REQ-0166 spans BOTH specs: this is the VALIDATE-PROFILE side (`qfai validate --profile saas-package`); the CERTIFY side (`certify --scope saas-package`) is owned by spec-0014 (same Source REQ, file-local IDs). The skip set named by `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) must match the certify-side `notes:`.
  - Contract references: `_policies/05_Contracts.md` §CHG-006 — CLI-HANDOFF (cross-skill handoff schema), DCON-005 (design-system attestation, REFERENCE no-schema-change), CLI-VAL (`--profile saas-package` + `auditProfile.ts` dual-shape per DR-0268). Glossary §CHG-006 — `saas-package profile`, `R-PACK-LOCATION-DRIFT`, `D-SAAS-PACKAGE-VERIFY-SKIPPED`, `QFAI-AUD-020`.
  - REQ-0164: `auditProfile.ts` is a NEW validator module (to be created); accepts string-only AND structured `{id,label,acceptance}` (DR-0268 closed schema); `QFAI-AUD-020` names `3..7` band (DR-0267). OQ-0158 / OQ-0159 resolved by the cited DRs.
  - REQ-0167: `packages/qfai/scripts/check-pack-locations.mjs` is a NEW lint script (to be created) wired into `pnpm ci:lint` (no contract file; recorded under `_policies/07_Constraints.md` OC-65). OQ-0167 lint-scope dimension resolved by DR-0274; the register's `sdd lint --fix` OQ-0167 remains separately deferred.
  - One-minor deprecation window per OC-63 applies to the new `D-*` findings.
- Source: REQ-0166, REQ-0164, REQ-0167 (discussion-20260527075558258)

## Triage (2026-09-11)

| Source   | Subject                                                    | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                              |
| -------- | ---------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| REQ-0028 | `proseCritique` schema check states a cap, not a word band | spec-0004     | UPDATE    | MODIFY | -           | Impact cascade from REQ-0012-0059: the validator spec restates the retired band in its requirement, criterion and rule |

## Triage (2026-09-12)

| Source   | Subject                                                                        | Existing Spec | Operation | Sub-op | Approved By      | Rationale                                                                                                                     |
| -------- | ------------------------------------------------------------------------------ | ------------- | --------- | ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| REQ-0029 | The `layoutAntiPatternsDetected` whitelist is the registry, not a numeric band | spec-0004     | UPDATE    | MODIFY | CR-20260912-0001 | The acceptance criterion was already registry-anchored; the requirement, the rule and the example still stated `lap-001..008` |

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

| Source             | Subject                                                                                                       | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Depends-On         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| REQ-0043           | The triage approval check resolves a cited workflow authorization and uses the one approval set               | spec-0004     | UPDATE    | APPEND | -           | A row citing a workflow authorization must resolve to a recorded `human_decision` under `.qfai/evidence/workflow/<runId>/` for the same operation and capability. A legacy row keeps the `Approved By` check. The validator's own copy of the approval set gives way to `requiresApproval()`. Size signal: AC 39 is over 30 and TC 50 sits at the threshold, over it after this append. spec-0004 owns only CAP-0004, so there is no split                                                                                                                                                                                                                                            | REQ-0041, OQ-0006  |
| REQ-0065, REQ-0057 | `qfai validate` applies the governed-layer provenance checks to the installed plans under `process/workflows` | spec-0004     | UPDATE    | APPEND | -           | CLI-INIT makes `process/workflows` a governed layer, so validate vouches for it as for the others: an edited installed plan is `QFAI-ASSETS-005` (a fork) or `QFAI-ASSETS-004` (stale), at `error`, the fixed severity of the provenance checks, and a recorded layer deleted whole is reported once, against the layer. `process/migrations/` is not governed. The finding codes exist and no contract changes. The lock-key read and the helper that maps a path to its governed layer are spec-0003's (BR-0003-0053); the two layer reads in `validators/assistantAssets.ts` are this spec's. Size signal: AC 43 → 44, over 30. spec-0004 owns only CAP-0004, so there is no split | REQ-0033, REQ-0049 |

## 2026-09-24 — Intent-driven entry: change summary

- Change ID: DELTA-0004
- Date: 2026-09-24
- Primary: the triage authorization reference (`discussion-20260923171450572#REQ-0043`)
- Tags: @docs, @test
- Summary: the validator checks a triage row that cites a workflow authorization
  against the record it names, and decides which rows need approval from
  `requiresApproval()` alone. The rules cite CLI-VAL
  `## Triage authorization reference` and copy none of its checks.
- Items appended: US-0004-0040; AC-0004-0042..AC-0004-0043, AC-0004-0045..AC-0004-0046;
  BR-0004-0036..BR-0004-0037, BR-0004-0039..BR-0004-0040, each contract-backed. The examples and test cases
  follow from EX-0004-0056 and TC-0004-0084. No existing item changes.
- Resolved pack question: `discussion-20260923171450572#OQ-0006`, recorded in
  `08_Open-questions.md` `## Resolved (2026-09-24 intent-driven entry)`.
- Policy: `_policies/08_Decisions.md` DR-0299, cited in `01_Spec.md`
  `## Applicable Policy`. No spec decision record is added.
- Size: AC 39 → 43, over 30; TC 50, over 50 once the test cases are appended.
  No split: spec-0004 owns only CAP-0004.

- Change ID: DELTA-0005
- Date: 2026-09-24
- Primary: Phase 2c obligation reconciliation, against CLI-VAL
  `## Triage authorization reference` as revised: `Authorization-Ref` on a
  `CREATE` row only, and a `Binding` check with the capability branch alone
- Tags: @docs, @test
- Summary: AC-0004-0046 gains one outcome, that a reference on an
  approval-required row other than a `CREATE` fails `Operation`. BR-0004-0040
  keeps its text, since it cites the check set rather than listing it. The
  OQ-0006 resolution in `08_Open-questions.md` names the `CREATE`-only rule. The
  reference-check matrix no longer has a case for a non-`CREATE` row's binding.

- Change ID: DELTA-0006
- Date: 2026-09-24
- Primary: the installed plans as a governed layer
  (`discussion-20260923171450572#REQ-0065`, `#REQ-0057`)
- Tags: @docs, @test
- Summary: one approval-free `UPDATE` / `APPEND` row in
  `## Triage (2026-09-24 intent-driven entry)`. `qfai validate` applies the
  existing governed-layer provenance checks to `process/workflows`, which CLI-INIT
  makes a governed layer, and reports nothing under `process/migrations/`.
- Items appended: AC-0004-0044 under US-0004-0028, which already holds the
  assistant-tree checks, so no new story and no new journey; BR-0004-0038, a
  spec rule, since no contract states the `QFAI-ASSETS` family. Its examples and test cases
  start at EX-0004-0052 and TC-0004-0080.
- Size: AC 43 → 44, over 30. No split: spec-0004 owns only CAP-0004.
- Correction to BR-0004-0038 and AC-0004-0044, IDs kept: an edited installed
  plan is `QFAI-ASSETS-005` (a fork) and a stale one `QFAI-ASSETS-004`, both at
  `error`, which is fixed rather than configured. The deleted-layer finding stays
  `QFAI-ASSETS-007`.

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- `AC-0004-0040`, `AC-0004-0041`, `BR-0004-0034`, `BR-0004-0035`, `EX-0004-0042`..`EX-0004-0044`
  and `TC-0004-0074`..`TC-0004-0077` became `AC-0004-0045`, `AC-0004-0046`, `BR-0004-0039`,
  `BR-0004-0040`, `EX-0004-0056`..`EX-0004-0058` and `TC-0004-0084`..`TC-0004-0087`.
- `TDD-0067`..`TDD-0072` became `TDD-0087`..`TDD-0092`.
- The intent-driven entry's `DELTA-0001`..`DELTA-0003` became `DELTA-0004`..`DELTA-0006`.
- `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010` became `CR-20260924-0007`,
  `CR-20260924-0008` and `CR-20260925-0022`. `CR-20260925-0003`..`CR-20260925-0007` and
  `CR-20260925-0015` became `CR-20260925-0017`..`CR-20260925-0021` and `CR-20260925-0023`.
  Every reference here follows them.
- A range that included a moved ID now names the moved IDs separately.
