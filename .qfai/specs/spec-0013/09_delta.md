# 09 Delta (Migration Record)

## Renumbering after the merge (2026-09-25)

The main branch gave the first six IDs below to the optional side artifact
rules before this pack gave them to the work-log removal chain (DELTA-0001).
`CR-20260913-0012` allocated the test case IDs, and `CR-20260923-0010` gave
`AC-0013-0028` the same meaning. Main keeps them, and the chain moves to the
next free IDs (DR-0013-0017, DL-0013). Commit messages written before the merge still carry the old
IDs.

| Old ID       | New ID       | Subject                                       |
| ------------ | ------------ | --------------------------------------------- |
| AC-0013-0028 | AC-0013-0030 | Records Go To The Spec Pack                   |
| BR-0013-0021 | BR-0013-0023 | Decisions And Discoveries Go To The Spec Pack |
| EX-0013-0021 | EX-0013-0023 | Record Homes In The Shipped qfai-sdd Text     |
| TC-0013-0036 | TC-0013-0038 | Records Go To The Spec Pack                   |
| TC-0013-0037 | TC-0013-0039 | Approval Stop Writes No Entry                 |
| TDD-0044     | TDD-0110     | `record-homes-stated`                         |
| TDD-0045     | TDD-0111     | `stop-steps-stated`                           |
| TDD-0046     | TDD-0112     | `no-worklog-section`                          |
| TDD-0047     | TDD-0113     | `no-pending-promotion-example`                |
| TDD-0048     | TDD-0114     | `no-surface-reference-in-tree`                |
| TDD-0049     | TDD-0115     | `no-worklog-entry-named`                      |

- `AC-0013-0029`, `BR-0013-0022` and `EX-0013-0022` did not collide and keep
  their IDs.
- The six rows are seeded at `todo` under their new IDs and are completed
  again. Their tests changed title and annotation with the IDs, so the recorded
  runs no longer describe the test bytes. Those runs stay in
  `.qfai/evidence/atdd-spec-0013.md` as earlier rounds under the new headings.

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-23
- Primary: Behavior
- Tags: @docs, @test
- Summary: The qfai-sdd skill names the spec-pack home of each record, and its
  approval stop writes nothing beyond the Triage table and the stop report.
  AC-0013-0030 and AC-0013-0029, each with one BR, EX and TC, are added, seeded
  as TDD-0110..TDD-0115, one row per boundary.

- Change ID: DELTA-0002
- Date: 2026-09-25
- Primary: Behavior
- Tags: @docs, @test
- Summary: Under `CR-20260925-0010`, AC-0013-0029, AC-0013-0030, their BR,
  EX and TC, and ledger rows TDD-0110..TDD-0115 are removed and tombstoned.
  The skill text they tested stays.

## Triage (2026-09-25, CR-20260925-0010)

The record-homes and approval-stop obligations, whose tests only checked the
replacement skill text or the absence of the work-log surface, are withdrawn
under `CR-20260925-0010`. The skill text stays. This heading names the Change
Request because the renumbering round below took `## Triage (2026-09-25)`.

| Source                                | Subject                                                                                                                                                                                 | Existing Spec | Operation | Sub-op | Approved By                            | Rationale                                                                                                                                       | Depends-On |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923060900824#REQ-0007 | Remove AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038 and the REQ-0007 source line (`01_Spec.md:85`); ledger rows TDD-0110, TDD-0112, TDD-0113, TDD-0114 deleted and tombstoned | spec-0013     | UPDATE    | REMOVE | user (Claude Code structured question) | The amended REQ-0007 is checked by review. TDD-0110 tested only the kept replacement text; TDD-0112 to TDD-0114 prove absences                  | -          |
| discussion-20260923060900824#REQ-0008 | Remove AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0039 and the REQ-0008 source line (`01_Spec.md:86`); ledger rows TDD-0111, TDD-0115 deleted and tombstoned                     | spec-0013     | UPDATE    | REMOVE | user (Claude Code structured question) | The stop steps in the three files are already pinned by the existing `tests/assets/autoModeApprovalDegrade.test.ts`. TDD-0115 proves an absence | -          |

- Approved By: the user, through a Claude Code structured question at
  2026-09-25T04:52:16Z, for these rows as one set (Triage group G4 of
  `CR-20260925-0010`). The same answer approved the Change Request.
- Line references in the Subject cells are to the files before this run.
- Retired ledger rows. Phase 2b deleted each row from `tdd/test-list.md` and
  tombstoned its ID under a new `## TDD-ID reservations` section. No other row
  is reset. The six rows were at `red` with `Evidence` `-`, so there is no cell
  to copy. Their rounds are recorded under the matching headings of
  `.qfai/evidence/atdd-spec-0013.md` (`#tdd-0110` to `#tdd-0115`), and each
  tombstone points there.
- The tests those rows drove are deleted in the same commit:
  - by `/qfai-atdd`, whole files, every `it` block belonging to a deleted row:
    `packages/qfai/tests/integration/spec0013RecordHomes.test.ts` (TDD-0110,
    TDD-0112, TDD-0113, TDD-0114) and
    `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` (TDD-0111,
    TDD-0115);
  - by `/qfai-implement`: the six `KNOWN_OPEN_BUT_TESTED` entries for
    TDD-0110..TDD-0115 in `packages/qfai/tests/assets/openRowAlreadyTested.test.ts`.
- REQ-0007 is checked by review. That review searches the shipped assistant tree
  for both `.qfai/steering/` and `worklog-entry.schema.md`, because NFR-0006's
  token list names only the first.
- Decisions: DR-0013-0018 records the withdrawal. It supersedes
  DR-0013-0006..DR-0013-0014, DR-0013-0016 and DR-0013-0017, and amends
  DR-0013-0005 and DR-0013-0015, whose skill text and plan paragraph stand. DR-0013-0019 re-opens DR-0013-0008, whose
  rejection this withdrawal takes. The renumbering record, the earlier Triage
  rounds and DL-0001..DL-0013 stay as history.

## Triage (2026-09-25)

The work-log removal chain moves to the next free IDs, as the renumbering
section at the top of this file lists. Its wording and obligations do not change.

| Source       | Subject                                                                                                                                                                                                               | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Depends-On |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| DR-0013-0017 | Renumber AC-0013-0028, BR-0013-0021, EX-0013-0021, TC-0013-0036 and TC-0013-0037 to AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038 and TC-0013-0039, and ledger rows TDD-0044..TDD-0049 to TDD-0110..TDD-0115 | spec-0013     | UPDATE    | MODIFY | -           | CR-20260913-0012 and CR-20260923-0010 gave the old IDs to the optional side artifact rules first. The text of each item is unchanged. No ledger row is deleted: the six rows are appended at `todo` with no `DR-ID` and no `Evidence`, because a renumbered row keeps no evidence. Against main at `8214d0fdd`, every obligation main holds keeps its ID and text, and this chain has the same two ACs, two BRs, two EXs, two TCs and six ledger rows before and after the renumber, so none is lost or gained | -          |

- Ledger: TDD-0110..TDD-0115 follow main's TDD-0109. Test file, Layer, Tier,
  owning module and Boundary are unchanged. Selector and `BR-Ref` change only
  in the IDs they carry: the six Selectors take the new TC prefix, and the four
  `BR-Ref` cells that named BR-0013-0021 name BR-0013-0023. No row is deleted,
  so no tombstone is owed.

## Triage (2026-09-23)

The qfai-sdd skill names the existing home of each record, and its approval stop
writes nothing beyond the Triage table and the stop report.

| Source                                | Subject                                                                                                                                                                                                                                                                                                            | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                         | Depends-On |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923060900824#REQ-0007 | Append AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038: `SKILL.md` names the same homes, and carries no work-log section and no `W-PENDING-PROMOTION` example                                                                                                                                               | spec-0013     | UPDATE    | APPEND | -           | No item covers this text, and the acceptance signal needs a test. Phase 2b seeds a ledger row for TC-0013-0038                                    | -          |
| discussion-20260923060900824#REQ-0008 | Append AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0039: `SKILL.md`, `references/sdd-execution-playbook.md` and `references/sdd-triage.md` state the same stop (leave `Approved By` as `-`, do not enter Phase 0, report each unapproved row with its Operation and target), and none names a work-log entry | spec-0013     | UPDATE    | APPEND | -           | The record of a stop is the `Approved By: -` cell, the `QFAI-TRIAGE-005` errors and the stop report. Phase 2b seeds a ledger row for TC-0013-0039 | -          |

- Ledger: Phase 2b appends one row per boundary at `todo` (DL-0012):
  TDD-0110, TDD-0112, TDD-0113 and TDD-0114 for TC-0013-0038, `BR-Ref`
  BR-0013-0023; TDD-0111 and TDD-0115 for TC-0013-0039, `BR-Ref` BR-0013-0022.
  All are `Integration`, `T2`, owning module
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`. No row is reset
  or retired.
- Ledger: `Tier` is seeded on TDD-0110..TDD-0115 only. No Change Request
  drives this run, and re-deriving the other rows could raise a tier, which
  returns a `done` row to `todo` although this change does not touch it
  (DL-0009).

## Update History

| Date       | DL      | Summary                                                                         |
| ---------- | ------- | ------------------------------------------------------------------------------- |
| 2026-09-23 | DL-0001 | The skill names the spec-pack homes, not `Blocked-By`                           |
| 2026-09-23 | DL-0002 | Texts of AC-0013-0030, BR-0013-0023, EX-0013-0023 and TC-0013-0038              |
| 2026-09-23 | DL-0003 | Texts of AC-0013-0029, BR-0013-0022, EX-0013-0022 and TC-0013-0039              |
| 2026-09-23 | DL-0004 | TC-0013-0038 checks the whole assistant tree                                    |
| 2026-09-23 | DL-0005 | Source lines on the new ACs and qualified requirement lines                     |
| 2026-09-23 | DL-0006 | One BR, EX and TC per new AC                                                    |
| 2026-09-23 | DL-0007 | TDD-0110 and TDD-0111 are T2                                                    |
| 2026-09-23 | DL-0008 | Their owning module is the skill directory                                      |
| 2026-09-23 | DL-0009 | Tier seeded on the new rows only                                                |
| 2026-09-23 | DL-0010 | BR-0013-0023 and BR-0013-0022 are realized by the shipped skill text            |
| 2026-09-23 | DL-0011 | The plan names the edit path and cites spec-0004 for the order                  |
| 2026-09-23 | DL-0012 | One row per boundary: TDD-0110..TDD-0115                                        |
| 2026-09-25 | DL-0013 | The work-log removal chain moves to the next free IDs                           |
| 2026-09-25 | DL-0014 | The record-homes and approval-stop obligations are withdrawn (CR-20260925-0010) |
| 2026-09-25 | DL-0015 | RE-OPEN of DL-0004: the record-homes acceptance signal has no test              |

## Decision Log

### DL-0001

#### Meta

```yaml
id: DL-0001
date: 2026-09-23
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references
notes: The qfai-sdd skill names 07_Decisions.md, 08_Open-questions.md and a Change Request as homes, and not Blocked-By (DR-0013-0005).
```

#### Migration / Follow-ups

- `/qfai-implement` rewrites the skill text, then `pnpm sync:ssot` regenerates the `.qfai/assistant/` copy.

#### Rejected

- option: Name Blocked-By as well, as the Triage subject reads
  reason: /qfai-sdd holds no in-progress ledger row, so it never records a stop there.
  do_not: Name a home this skill cannot reach.
  temptation: The Triage subject says the skill names the same homes as /qfai-implement.

#### Verification

### Plan (DL-0001)

```yaml
- id: VFY-001
  level: integration
  target: Record homes in the shipped qfai-sdd text
  method: TC-0013-0038 reads SKILL.md and references/**
  owner: dev
  expected: A decision goes to 07_Decisions.md or a Change Request, and a consultation or discovery to 08_Open-questions.md or a Change Request.
  links:
    - .qfai/specs/spec-0013/06_Test-Cases.md
```

### DL-0002

#### Meta

```yaml
id: DL-0002
date: 2026-09-23
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - spec-0013/03_Acceptance-Criteria.md
  - spec-0013/04_Business-Rules.md
  - spec-0013/05_Examples.md
  - spec-0013/06_Test-Cases.md
notes: AC-0013-0030, BR-0013-0023, EX-0013-0023 and TC-0013-0038 name the homes with no Decision Log mention and no settled or unsettled split (DR-0013-0006).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Name the 09_delta.md Decision Log entry beside 07_Decisions.md, and split settled from unsettled decisions
  reason: references/spec-traceability-rules.md already states both, and the requirement names only the homes.
  do_not: Restate the grilling-outcome table in an AC.
  temptation: It reads as the more complete rule.

#### Verification

### Plan (DL-0002)

```yaml
- id: VFY-001
  level: integration
  target: SKILL.md sections and examples
  method: TC-0013-0038 reads SKILL.md
  owner: dev
  expected: No Work-log entries section and no W-PENDING-PROMOTION example.
  links:
    - .qfai/specs/spec-0013/06_Test-Cases.md
```

### DL-0003

#### Meta

```yaml
id: DL-0003
date: 2026-09-23
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md
notes: The missing-approval stop leaves Approved By as -, does not enter Phase 0 and reports every unapproved row, in all three files, and writes no work-log entry (DR-0013-0007).
```

#### Migration / Follow-ups

- `/qfai-implement` removes the work-log sentence from each stop, the `consultation-needed` kind bullet, the `W-PENDING-PROMOTION` example and the `## Work-log entries` section of `SKILL.md`.

#### Verification

### Plan (DL-0003)

```yaml
- id: VFY-001
  level: integration
  target: The missing-approval stop in three files
  method: TC-0013-0039 reads SKILL.md, references/sdd-execution-playbook.md and references/sdd-triage.md
  owner: dev
  expected: Each states the three steps and none contains work-log or consultation-needed.
  links:
    - .qfai/specs/spec-0013/06_Test-Cases.md
```

### DL-0004

#### Meta

```yaml
id: DL-0004
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0013/06_Test-Cases.md
notes: AC-0013-0030, BR-0013-0023 and EX-0013-0023 state the tree-wide absence clause and TC-0013-0038 checks it (DR-0013-0008).
```

#### Migration / Follow-ups

- No migration required.
- DL-0015 re-opens this decision (DR-0013-0019).

#### Rejected

- option: Each skill's test case scans its own directory only
  reason: The rest of the assistant tree would have no test for the acceptance signal.
  do_not: Leave an acceptance signal without a test.
  temptation: Each skill's case stays inside its own skill.
- option: A separate test case for the tree-wide half
  reason: It changes the approved Triage id list.
  do_not: Mint a TC the Triage did not list.
  temptation: One case per signal reads neatly.

### DL-0005

#### Meta

```yaml
id: DL-0005
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0013/01_Spec.md
  - spec-0013/03_Acceptance-Criteria.md
notes: AC-0013-0030 and AC-0013-0029 carry Source lines; 01_Spec.md names both requirements with the pack id and no local id (DR-0013-0009).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Record the source only in 09_delta.md
  reason: Every AC needs its Source, and the local REQ-0007 and REQ-0008 mean something else.
  do_not: Write a bare REQ-0007 or REQ-0008 for a pack requirement in this spec.
  temptation: The Triage row already names the source.

### DL-0006

#### Meta

```yaml
id: DL-0006
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0013/04_Business-Rules.md
notes: One BR, one EX and one TC per new AC, as the Triage lists; QFAI-COV-207 warnings are triaged in the density review (DR-0013-0010).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Split the new items further
  reason: The Triage lists one item per layer, and each AC has one oracle.
  do_not: Split an item to clear a density warning.
  temptation: A warning reads as a defect.

### DL-0007

#### Meta

```yaml
id: DL-0007
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0013/tdd/test-list.md
notes: TDD-0110 and TDD-0111 are T2 because their tests read shipped files (DR-0013-0011).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: T1 like the neighbouring Integration rows
  reason: Those rows show - because they predate seeded tiers, and reading shipped files is T2 in the tier table.
  do_not: Copy an unseeded neighbour's tier onto a new row.
  temptation: It matches the rows above them.

### DL-0008

#### Meta

```yaml
id: DL-0008
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0013/tdd/test-list.md
notes: The owning module of TDD-0110 and TDD-0111 is packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd (DR-0013-0012).
```

#### Migration / Follow-ups

- No migration required.

### DL-0009

#### Meta

```yaml
id: DL-0009
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0013/tdd/test-list.md
notes: Tier is seeded on TDD-0110 and TDD-0111 only; the other rows are not re-derived because no Change Request drives this run (DR-0013-0013).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Re-derive Tier on every row
  reason: A raised tier returns a row to todo, and no Change Request authorizes resetting done rows this change does not touch.
  do_not: Re-derive tiers across the ledger without a driving Change Request.
  temptation: Phase 2b re-derives Tier on every run.

### DL-0010

#### Meta

```yaml
id: DL-0010
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0013/04_Business-Rules.md (BR-0013-0023, BR-0013-0022)
notes: BR-0013-0023 and BR-0013-0022 are realized by the shipped qfai-sdd skill text; their named homes resolve to templates, schemas, specPack.ts and .qfai/decisions/, with no contract (DR-0013-0014).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Write a contract for the skill text
  reason: The request does not need one.
  do_not: Add a contract under .qfai/contracts/ for skill text.
  temptation: Obligation reconciliation asks for a realizing contract.

### DL-0011

#### Meta

```yaml
id: DL-0011
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0013/10_Plan.md
notes: The plan names where the skill text is edited and cites spec-0004's plan for the order (DR-0013-0015).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Leave the plan unchanged
  reason: A reader of this plan alone would miss that the text must land with the removal of QFAI-TDDLIST-015.
  do_not: Leave the coupling to the other plans.
  temptation: The edit sits inside one skill.

### DL-0012

#### Meta

```yaml
id: DL-0012
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0013/06_Test-Cases.md (TC-0013-0038, TC-0013-0039)
  - spec-0013/tdd/test-list.md (TDD-0110..TDD-0115)
notes: TC-0013-0038 names four boundaries and TC-0013-0039 two, one ledger row each (DR-0013-0016).
```

#### Migration / Follow-ups

- `/qfai-atdd` writes one test per boundary and records each RED on its own.
- TDD-0114 turns green only once the spec-0011 and spec-0003/spec-0004 rows
  have removed the other references, in the same change.

#### Rejected

- option: Keep one row per case and record why one oracle suffices
  reason: Each check is fixed by a different edit and can pass while another fails, so one row observes only the first failure.
  do_not: Put independently failing checks behind one row.
  temptation: Every check fails today, so one row turns red either way.
- option: One TC-0013-0039 row per file
  reason: The three files state one rule; a set-valued assertion over them observes every file that fails.
  do_not: Split one boundary by the file it is read from.
  temptation: Each file is edited separately.

### DL-0013

#### Meta

```yaml
id: DL-0013
date: 2026-09-25
primary: Ops
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - spec-0013/03_Acceptance-Criteria.md (AC-0013-0030)
  - spec-0013/04_Business-Rules.md (BR-0013-0023)
  - spec-0013/05_Examples.md (EX-0013-0023)
  - spec-0013/06_Test-Cases.md (TC-0013-0038, TC-0013-0039)
  - spec-0013/tdd/test-list.md (TDD-0110..TDD-0115)
notes: The work-log removal chain moves to the next free IDs, because main allocated the old IDs first (DR-0013-0017). Rule 4 of spec-traceability-rules.md cannot hold on both sides of the collision; this side breaks it only in commit messages that have not merged, and the renumbering section maps them.
```

#### Migration / Follow-ups

- `/qfai-atdd` and `/qfai-implement` complete TDD-0110..TDD-0115 again under
  the new IDs.
- Commit messages written before the merge keep the old IDs. The renumbering
  section at the top of this file maps each one.

#### Rejected

- option: Renumber main's side instead
  reason: CR-20260913-0012 and CR-20260923-0010 allocated those IDs first, and main writes them into tests, evidence and four Change Requests.
  do_not: Renumber IDs an approved Change Request allocated.
  temptation: Main's rows are seeded todo and carry no evidence.
- option: Keep both chains on the same IDs
  reason: Rule 2 of spec-traceability-rules.md forbids resolving an ID collision by keeping both.
  do_not: Let one ID name two obligations.
  temptation: The two chains sit in different parts of the pack.

### DL-0014

#### Meta

```yaml
id: DL-0014
date: 2026-09-25
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - spec-0013/01_Spec.md (discussion REQ-0007 and REQ-0008 lines removed)
  - spec-0013/03_Acceptance-Criteria.md (AC-0013-0029, AC-0013-0030 removed)
  - spec-0013/04_Business-Rules.md (BR-0013-0022, BR-0013-0023 removed)
  - spec-0013/05_Examples.md (EX-0013-0022, EX-0013-0023 removed)
  - spec-0013/06_Test-Cases.md (TC-0013-0038, TC-0013-0039 removed)
  - spec-0013/tdd/test-list.md (TDD-0110..TDD-0115 deleted and tombstoned)
notes: The record-homes and approval-stop obligations are withdrawn under CR-20260925-0010, approved by the user; the skill text stays (DR-0013-0018).
```

#### Migration / Follow-ups

- `/qfai-atdd` deletes `spec0013RecordHomes.test.ts` and
  `spec0013ApprovalStop.test.ts`, and `/qfai-implement` removes their six
  `openRowAlreadyTested.test.ts` entries, in the same commit.

#### Rejected

- option: Keep TDD-0110 and TDD-0111 for the replacement skill text
  reason: The user kept the text and withdrew its tests; REQ-0007 and REQ-0008 are checked by review.
  do_not: Add a test that pins skill wording or the absence of the work-log surface.
  temptation: The approval stop is a safety rule.

#### Verification

### Plan (DL-0014)

```yaml
- id: VFY-001
  level: integration
  target: no spec-0013 ledger row names a deleted test file, and the stop steps stay pinned
  method: qfai validate --profile sdd and --profile tdd --spec spec-0013 with the repository build after the files are deleted; tests/assets/autoModeApprovalDegrade.test.ts
  owner: dev
  expected: No TDDLIST_TEST_FILE_MISSING and no finding naming TDD-0110..TDD-0115; the existing stop-step assertions pass.
  links:
    - .qfai/specs/spec-0013/tdd/test-list.md
    - packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts
```

### DL-0015

#### Meta

```yaml
id: DL-0015
date: 2026-09-25
primary: Behavior
tags: ["@test"]
compat: Change
scope:
  - spec-0013/06_Test-Cases.md (TC-0013-0038 removed)
notes: RE-OPEN of DL-0004 (DR-0013-0019, re-opening DR-0013-0008). The user amended REQ-0007 to be checked by review through CR-20260925-0010.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Keep the tree-wide scan as a guard test outside the ledger
  reason: The user decided that nothing tests the surface is gone.
  do_not: Add an unregistered test that scans for the work-log surface.
  temptation: A search is cheap to automate.

## Origin

- Consolidates: old spec-0011 (Spec Diff Protocol), spec-0038 (Auto-Discovery)
- Old spec-0011 defined Preflight Diff Protocol and SKILL.md incremental mode
- Old spec-0038 defined 4-source unified diff detection TypeScript implementation

## Adopted

- AD-0013-0001: Unified SDD workflow -- single `/qfai-sdd` entrypoint for full SDD flow
- AD-0013-0002: Spec Auto-Discovery integration -- 4-source diff detection from spec-0038
- AD-0013-0003: Contract-first phase -- contracts created before spec slices
- AD-0013-0004: Phase order enforcement -- strict Contracts -> Outline -> Slice -> Plan -> Delta
- AD-0013-0005: Triage cell escape ↔ parse symmetry -- `escapeTableCell` only escapes `|` → `\|` and normalizes line breaks (no `\` → `\\` step), matching the parser's `\|` → `|` un-escape rule exactly. Literal `\` is part of the allowed cell character set (Windows paths, regex literals) and round-trips as-is.

## Rejected

- RJ-0013-0001: Split SDD entrypoints
  - DO NOT reintroduce separate outline/slice/plan commands
  - Temptation: splitting for "modularity" or "flexibility"
  - Reason: unified flow prevents phase-skipping and ensures consistency

- RJ-0013-0002: Business Flow as Gherkin
  - DO NOT author Business Flow as Gherkin (\*.feature files)
  - Temptation: using Gherkin for "executable specs"
  - Reason: Business Flow is Markdown + Mermaid; Gherkin is deprecated for this purpose

- Candidate: Each skill's test case scans its own directory only
- Reason: DR-0013-0008 held that every acceptance signal needs a test.
- DO NOT: Leave an acceptance signal without a test.
- Temptation: Each skill owns only its own directory.
- Re-opened by: DR-0013-0019

## ID Renumbering

| Old ID          | New ID                      | Notes              |
| --------------- | --------------------------- | ------------------ |
| spec-0011 US/TC | US-0013-YYYY / TC-0013-YYYY | Spec Diff Protocol |
| spec-0038 US/TC | US-0013-YYYY / TC-0013-YYYY | Auto-Discovery     |

## Post-Migration Changes

| Date       | Change Type | IDs Added                                                                                                                                                                                                                                                  | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-01 | adopted     | AC-0013-0010, BR-0013-0008, EX-0013-0008, TC-0013-0013                                                                                                                                                                                                     | 06_Test-Cases テンプレートに Type 列（normal/error/boundary/edge）を追加、各 AC に最低1つの非正常系 TC を義務化                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-23 | updated     | REQ-0021, AC-0013-0011                                                                                                                                                                                                                                     | `/qfai-sdd` 完了時点で selected-direction/design-system も UI-bearing validate readiness の必須 design contract として扱うよう runtime gate に同期                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-04 | adopted     | AC-0013-0012, AC-0013-0013, AC-0013-0014, BR-0013-0009, BR-0013-0010, BR-0013-0011, EX-0013-0009, EX-0013-0010, EX-0013-0011, TC-0013-0014, TC-0013-0015, TC-0013-0016, TC-0013-0017, TC-0013-0018, TC-0013-0019, TC-0013-0020, TC-0013-0021, AD-0013-0005 | PR #206 commit 465b9869 — Triage cell escape ↔ parse symmetry を BR として明文化。`escapeTableCell` から `\` → `\\` 段を削除し、parser 側 (`splitMarkdownRow`) と対称化 (Option 1)。allowed cell character set に literal `\` を含めることを spec レベルで宣言し、trace chain (REQ → Spec → Code → Test) を round-trip identity property test に対して閉じる。AC-0013-0012 に Type=normal の TC-0013-0019 (happy path) と Type=edge の TC-0013-0018 (escape edge cases) を組み合わせて BR-0013-0008 を満たす。並行して spec-0038-consolidated annotation (TC-0013-0014..0017) を 06_Test-Cases.md に正式 register し、Code↔Spec 双方向 reachability を確立。当初 AC-0013-0001 / EX-0013-0001 (Phase Order 系) に semantic mis-anchor していたが、後続 commit で AC-0013-0013 / BR-0013-0010 / EX-0013-0010 (Spec Auto-Discovery 系) を新設し正しい AC へ re-anchor — semantic reachability も成立 (PR #206 review N2PY / N2XT)。AC-0013-0010 の non-normal coverage gap (BR-0013-0008 自己違反) は本 PR scope 外として OQ-0016 で track。後続 commit で TDD-0014/0015 を本来の SUT (`validateTraceabilityIntegrity` / validate-pipeline wiring) に対応する新規 TC-0013-0020 (Type=normal) / TC-0013-0021 (Type=boundary) に re-anchor し、Code↔Spec の semantic 整合を確立 (PR #206 review N32O / N34p / N35m / N39l)。さらに後続 commit で TC-0013-0020 (wiring assertion) を AC-0013-0007 (behavioral 'error count == 0') から新設の AC-0013-0014 (Validate Pipeline Validator Registration Integrity) / BR-0013-0011 (Validator Registry Wiring) / EX-0013-0011 (validator wiring source-level verification) へ re-anchor — semantic AC-Refs を behavioral outcome から structural-wiring contract に揃え、TC↔AC 一段間接化を解消 (PR #206 review N65f)。TC-0013-0021 (forward-compat boundary) は behavioral outcome (validator が old evidence で raise しない → error count = 0 が保たれる) と直接整合するため AC-0013-0007 anchor を維持。AC-0013-0014 の non-normal coverage gap は OQ-0016 pattern (2) で track (lexical detection class)、AC-0013-0013 の compound-AC facet-level gap は OQ-0019 で track (semantic detection class — PR #206 review N8St で OQ-0016 から split)。AC-0013-0014 自体の export/import 分解は同一 BR-0013-0011 配下に decomposition を残す routing を選択し、AC 分割せず単一 registration-integrity facet として保持 (PR #206 review N9Xs / N9dA — selection criterion: 共通 BR の facet なら AC 分割せず BR 層 decomposition を維持)。code-side annotation 側 (`packages/qfai/tests/core/traceabilityIntegrity.test.ts:232-240`) も AC-0013-0014 / BR-0013-0011 を参照するよう同期更新 (PR #206 review N9dn)。AC/BR 本文からは provenance prose を撤去し、来歴は本 row と OQ-0016 / OQ-0019 Notes 行に集約。次回 spec-0013 で新 TC を採番する場合は TC-0013-NNNN range の次の free slot (本 commit 時点で 0022 以降) から開始。 |

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0014~0015 (prototyping.yaml preflight gate, recommendation schema gate) 追加
- adopted: US-0013-0008, AC-0013-0008~0009 追加
- adopted: US range 更新 US-0013-0001..US-0013-0008
- rationale: v1.7.13 sddPreflight.ts に prototyping.yaml 存在チェックと recommendation schema validation が追加された実装の仕様反映

## v1.8.1 (2026-04-22) — Preflight Side Artifact Neutrality

- updated: REQ-0014~~0015 / US-0013-0008 / AC-0013-0008~~0010 を current implementation に再同期
- removed: prototyping.yaml 必須 preflight blocker 前提
- rationale: `packages/qfai/src/core/discussionPack.ts` が side artifact requiredness を廃止し、`packages/qfai/src/core/preflight/sddPreflight.ts` は markdown readiness を主 blocker として扱うため

## 2026-05-06 — CHG-001 — Absorbed SDD Phase 0 design lock + legacy design contract drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                               |
| ------ | ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | Phase 0 lock + legacy contract drop + active design-contract surface; US range → 0010 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0013-0009..0010)            | Phase 0 sha256 lock + active design-contract surface reduction                        |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0013-0015..0017)     | DESIGN.md lock + legacy removal + active index closed set                             |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0013-0012..0014)          | mirror BR layer for OP-003                                                            |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0013-0012..0014)                | worked examples per AC                                                                |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0013-0022..0024)              | test coverage per AC                                                                  |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0013-0022..0024) | TDD ledger sync                                                                       |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Validator-side enforcement of the lock and mirror invariants is owned by spec-0004; this spec only declares Phase 0 emission semantics.

## Triage (CHG-001)

| Source                                                                         | Subject                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------ |
| REQ-0005 (Stage 0 read), REQ-0007 (promote-gate surfacing), REQ-0010 (CHG-003) | `/qfai-sdd` SKILL.md に `project_memory:` 宣言追加。Stage 0 で open work-log entry を読み (MAY)、`W-PENDING-PROMOTION` を preflight summary に surface する。 | spec-0013     | UPDATE    | APPEND | pin-implied | SDD skill は MAY-read (REQ-0005 Notes); promote-gate surfacing は MUST。 |

## CHG-003 (v1.9.0) — Stage 0 Worklog Read + Promote-gate Surfacing

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Obligation: `/qfai-sdd` SKILL.md MUST gain a `project_memory:` block. Stage 0 preflight MAY read open work-log entries (`status` ∈ `{active, handoff}`); REQ-0005 Notes explicitly relaxes SDD's read contract from MUST to MAY. Stage 0 MUST however surface `W-PENDING-PROMOTION` findings from `qfai validate` in the preflight summary so the triage step can promote `kind: decision` entries to per-spec `07_Decisions.md` rows.
- Cascade: SKILL.md `project_memory:` validated by spec-0004.
- Source: REQ-0005, REQ-0007, REQ-0010

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing AC/BR/EX/TC numbering. NFR-0110 (testability of scanner + countWords as pure functions) naturally pairs with spec-0012 for the function-purity side; spec-0013's piece is the UI contract template `primary_tasks:` slot + the new validate lane gating `/qfai-prototyping`.
- Approved By: yusuke_senaga

## Triage (CHG-005)

Rows owned by this spec.

| Source                                                         | Subject                                                                                                                                                                                        | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0115 (discussion-20260523221141355)                        | UI spec template `primary_tasks: []` slot per screen + requirements-analyst guide instruction + new validate lane (QFAI-AUD-001 aligned) blocking `/qfai-prototyping` on empty `primary_tasks` | spec-0013     | UPDATE    | APPEND | yusuke_senaga | SDD UI contract template is spec-0013 (CAP-0013) territory; new validate lane's enforcement-side implementation routes through spec-0004's validator family |
| NFR-0110 (testability — pure functions, paired with spec-0012) | spec-0013 piece: UI contract template + validate lane (structural). The pure-function side lives in spec-0012.                                                                                 | spec-0013     | UPDATE    | APPEND | yusuke_senaga | NFR has two pair-points — only the template / lane half lands in spec-0013                                                                                  |

## CHG-005 Operations

| Op ID  | Op Type       | Target                                                                     | Summary                                                                                           |
| ------ | ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0115; Entry-points US range → 0011) | UI contract template `primary_tasks:` slot + new validate lane registered as Relevant Requirement |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0013-0011)                                          | requirements-analyst authoring story for `primary_tasks` slot                                     |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0013-0018..0019)                             | template-carries-slot + validate-lane-blocks-empty ACs                                            |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0013-0015..0016)                                  | mirror BR layer (template slot mandatory + lane gating contract)                                  |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0013-0015..0016)                                        | worked examples per AC                                                                            |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0013-0025..0027)                                      | test coverage per AC; integration level for template-load and validate-lane behavior              |

- Notes:
  - The validate lane finding code `QFAI-AUD-001` aligns with the existing audit-finding family; if the canonical token differs at implementation time, the spec text says "QFAI-AUD-001 aligned" to preserve flexibility while keeping intent intact.
  - Parallel pack pieces: spec-0004 (validate.json profile path + SSOT-sync pair lane + R-PROMPT-SCANNER-DRIFT justification); spec-0006 (qfai doctor playwright probe rebuild + skills.integrity downgrade); spec-0012 (iterate-side scanner / prompt + countWords pure-function half of NFR-0110); spec-0015 (Reviewer-Gate cycle + drift findings).
  - 9 deferred-OQ decisions made upstream by the orchestrator are reflected verbatim where relevant; REQ-0115 itself does not depend on a deferred decision (its option set was already definite in the pack).
- Source: REQ-0115 (discussion-20260523221141355); NFR-0110 (template / lane half)

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR | Rationale                                                                                                                                                                                                                                                                        | Approver |
| ------------- | ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UPDATE:APPEND | spec-0013   | REQ-0116  | CHG-005 cycle で `.claude → .qfai/assistant` migration 後の canonical UI 契約テンプレート path への prose 同期が 7 ファイル分 deferred。pure-documentation drift fix として登録。                                                                                                | auto     |
| UPDATE:APPEND | spec-0013   | REQ-0117  | CHG-005 cycle で QFAI-AUD-001 が key-absent / key-empty を同一 severity で扱う defect を 2-stage emission (info / error) として降格する follow-up が `sddPrimaryTasksLane.test.ts` 内 inline TODO で deferred。本 follow-up で OC-60 sunset window 配下の semantic を pin する。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0013)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing US/AC/BR/EX/TC numbering. New local IDs: US-0013-0012..0014, AC-0013-0020..0025, BR-0013-0017..0020, EX-0013-0017..0020, TC-0013-0028..0035, TDD-0023..0030, DR-0013-0002..0004.
- Approved By: pin-implied (feature/v1.9.2)

| Operation | Sub-op | Target                                                     | Source (REQ)                 | Rationale        | DR-Ref                    | Status |
| --------- | ------ | ---------------------------------------------------------- | ---------------------------- | ---------------- | ------------------------- | ------ |
| UPDATE    | APPEND | 01_Spec.md (Relevant Reqs, Consumer View, US range → 0014) | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0013-0012..0014)                    | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0013-0020..0025)             | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0013-0017..0020)                  | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0013-0017..0020)                        | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0013-0028..0035, Type-classified)     | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0013-0002..0004)                       | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (OQ-0157/0158/0159 resolved)          | REQ-0155, REQ-0164           | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 10_Plan.md (Second-Wave How)                               | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | tdd/test-list.md (TDD-0023..0030)                          | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |

- Notes:
  - REQ-0155 spans spec-0010 (writer) and spec-0013 (reader) — same Source REQ, file-local IDs per spec. Writer side declared in spec-0010.
  - REQ-0164 validator-implementation side is shared with spec-0004 (`auditProfile.ts` / `QFAI-AUD-020` enforcement). This slice owns the SDD authoring + doc + template surface (`ui-spec.yaml` comments, `references/ui-contract-guide.md`).
  - REQ-0163: `D-SURFACE-TYPE-MISSING` warns during the deprecation window and sunsets to error; `resolveAllUiBearingSpecs()` keeps the frontmatter as the strict downstream signal (no behavioral change downstream).
- Source: REQ-0155, REQ-0163, REQ-0164 (discussion-20260527075558258)

## Change Requests

| CR ID            | Upstream artifact                                                                                                                                                         | Mode         | Approved by                                                    | Applied at           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- | -------------------- |
| CR-20260923-0010 | `spec-0013/03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `06_Test-Cases.md`                                                                                         | confirm-only | claude-code (the user's standing instruction for this session) | 2026-09-23T10:52:00Z |
| CR-20260913-0009 | `spec-0013/02_User-stories.md`, `tdd/test-list.md`                                                                                                                        | re-derive    | user (2026-09-24 reply)                                        | 2026-09-24T09:46:00Z |
| CR-20260913-0012 | `spec-0013/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `10_Plan.md`, `tdd/test-list.md` | re-derive    | user (2026-09-24 reply)                                        | 2026-09-24T09:46:00Z |
| CR-20260925-0010 | `spec-0013/01_Spec.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `10_Plan.md`, `tdd/test-list.md`    | re-derive    | user (Claude Code structured question)                         | -                    |

### CR-20260913-0009: Ledger boundary repair

The existing 15-column ledger already had E2E placeholders for thirteen stories. Re-derivation adds the missing Integration cases and separates independently observable outcomes. Prior completed or exception evidence remains as history; the affected rows return to `todo` because their test identity changed. `US-0013-0003` now agrees with its usable-source acceptance criterion.

### CR-20260913-0012: Acceptance criterion ID repair

The original `AC-0013-0008` to `AC-0013-0010` headings retain their IDs. The contradicted markdown readiness and design normalization duplicates are removed. Optional side-artifact neutrality moves to `AC-0013-0028` with `BR-0013-0021`, `EX-0013-0021`, and `TC-0013-0036` to `TC-0013-0037`. The historical references above remain a record of past source text and do not reintroduce those obligations.
