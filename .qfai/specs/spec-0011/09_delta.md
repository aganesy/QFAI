# 09 Delta (Migration Record)

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-23
- Primary: Behavior
- Tags: @docs, @test
- Summary: The qfai-implement skill sends a decision, a consultation and an
  out-of-scope discovery to a Change Request to `/qfai-sdd`, keeps a stop in
  `Blocked-By`, and names no `.qfai/steering/`. AC-0011-0012, BR-0011-0009,
  EX-0011-0010 and TC-0011-0013 are added, seeded as TDD-0021..TDD-0023, one
  row per boundary.

- Change ID: DELTA-0002
- Date: 2026-09-25
- Primary: Behavior
- Tags: @docs, @test
- Summary: Under `CR-20260925-0010`, AC-0011-0012, BR-0011-0009,
  EX-0011-0010 and TC-0011-0013 are removed, and ledger rows
  TDD-0021..TDD-0023 are deleted and tombstoned. The skill text they tested
  stays.

## Triage (2026-09-25)

The record-homes obligations, whose tests only checked the replacement skill
text or the absence of the work-log surface, are withdrawn under
`CR-20260925-0010`. The skill text stays.

| Source                                | Subject                                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By                            | Rationale                                                                                                                                             | Depends-On |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923060900824#REQ-0007 | Remove AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013 and the REQ-0007 source line (`01_Spec.md:67`); ledger rows TDD-0021, TDD-0022, TDD-0023 deleted and tombstoned | spec-0011     | UPDATE    | REMOVE | user (Claude Code structured question) | The amended REQ-0007 is checked by review. The replacement skill text stays; TDD-0021 tested only that text, and TDD-0022 and TDD-0023 prove absences | -          |

- Approved By: the user, through a Claude Code structured question at
  2026-09-25T04:52:16Z, for this row (Triage group G3 of `CR-20260925-0010`).
  The same answer approved the Change Request.
- Line references in the Subject cell are to the files before this run.
- Retired ledger rows. Phase 2b deleted each row from `tdd/test-list.md` and
  tombstoned its ID under a new `## TDD-ID reservations` section. No other row
  is reset. Each row's `Evidence` cell, verbatim:
  - `spec-0011/TDD-0021`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e -> .qfai/evidence/atdd-spec-0011.md#tdd-0021`
  - `spec-0011/TDD-0022`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e -> .qfai/evidence/atdd-spec-0011.md#tdd-0022`
  - `spec-0011/TDD-0023`:
    `RED:fail GREEN:pass ORACLE:proved TIER:T2 REV:working-tree+c292c15294d9d938c98ea2b44f8628d362f65785919015b7c37e29791107264e -> .qfai/evidence/atdd-spec-0011.md#tdd-0023`
- The tests those rows drove are deleted in the same commit, by `/qfai-atdd`:
  `packages/qfai/tests/integration/spec0011RecordHomes.test.ts`. Every `it`
  block in the file belonged to a deleted row.
- REQ-0007 is checked by review. That review searches the `qfai-implement`
  skill for both `.qfai/steering/` and `worklog-entry.schema.md`, because
  NFR-0006's token list names only the first.
- Decisions: DR-0011-0014 records the withdrawal. It supersedes
  DR-0011-0004..DR-0011-0011 and DR-0011-0013, and amends DR-0011-0003 and
  DR-0011-0012, whose skill text and plan paragraph stand. No rejected option is taken, so nothing is
  re-opened. The 2026-09-23 Triage row and DL-0001..DL-0011 stay as history.

## Triage (2026-09-23)

The qfai-implement skill names the existing home of each record instead of a
work-log entry under `.qfai/steering/`.

| Source                                | Subject                                                                                                                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                          | Depends-On |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923060900824#REQ-0007 | Append AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013: the skill sends a decision to `07_Decisions.md` or a Change Request, a consultation or out-of-scope discovery to `08_Open-questions.md` or a Change Request, and a stop to the target its `Blocked-By` names, and names no `.qfai/steering/` | spec-0011     | UPDATE    | APPEND | -           | No item states the work-log obligation today, and the acceptance signal needs a test. Phase 2b seeds a ledger row for TC-0011-0013 | -          |

- Ledger: Phase 2b appends TDD-0021..TDD-0023 for TC-0011-0013 at `todo`, one
  per boundary (`record-homes-stated`, `resume-closes-no-record`,
  `no-surface-reference`; DL-0011): `Integration`, `T2`, owning module
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, `BR-Ref`
  BR-0011-0009. No row is reset or retired.
- Ledger: `Tier` is seeded on TDD-0021..TDD-0023 only. No Change Request
  drives this run, and re-deriving the other rows could raise a tier, which
  returns a row to `todo` although this change does not touch it (DL-0008).

## Update History

| Date       | DL      | Summary                                                                  |
| ---------- | ------- | ------------------------------------------------------------------------ |
| 2026-09-23 | DL-0001 | Decisions and discoveries leave the skill as a Change Request            |
| 2026-09-23 | DL-0002 | Texts of AC-0011-0012, BR-0011-0009, EX-0011-0010 and TC-0011-0013       |
| 2026-09-23 | DL-0003 | TC-0011-0013 checks the skill directory; spec-0013 checks the whole tree |
| 2026-09-23 | DL-0004 | Source line on AC-0011-0012 and a qualified requirement line             |
| 2026-09-23 | DL-0005 | One BR, EX and TC for the new AC                                         |
| 2026-09-23 | DL-0006 | TDD-0021 is T2                                                           |
| 2026-09-23 | DL-0007 | TDD-0021's owning module is the skill directory                          |
| 2026-09-23 | DL-0008 | Tier seeded on the new row only                                          |
| 2026-09-23 | DL-0009 | BR-0011-0009 is realized by the shipped skill text, with no contract     |
| 2026-09-23 | DL-0010 | The plan names the edit path and cites spec-0004 for the order           |
| 2026-09-23 | DL-0011 | TC-0011-0013 holds one row per boundary: TDD-0021..TDD-0023              |
| 2026-09-25 | DL-0012 | The record-homes obligations are withdrawn (CR-20260925-0010)            |

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
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/execution-ledger.md
notes: A decision, a consultation and an out-of-scope discovery leave /qfai-implement as a Change Request to /qfai-sdd; a stop stays in Blocked-By (DR-0011-0003).
```

#### Migration / Follow-ups

- `/qfai-implement` rewrites the skill text that asks for a `.qfai/steering/` entry, then `pnpm sync:ssot` regenerates the `.qfai/assistant/` copy.

#### Rejected

- option: /qfai-implement writes 07_Decisions.md or 08_Open-questions.md itself
  reason: The Drift Protocol forbids the implementation stage from writing upstream spec records.
  do_not: Let /qfai-implement write 07_Decisions.md, 08_Open-questions.md or 09_delta.md.
  temptation: It is one step shorter than raising a Change Request.
- option: Also name .qfai/decisions/DR-* as a home
  reason: It repeats an existing anomaly route the requirement does not ask for.
  do_not: Add a third home for decisions in this skill.
  temptation: The directory already exists.

#### Verification

### Plan (DL-0001)

```yaml
- id: VFY-001
  level: integration
  target: Record homes in the shipped qfai-implement text
  method: TC-0011-0013 reads SKILL.md and references/execution-ledger.md
  owner: dev
  expected: A stop is carried by Blocked-By and the other records go to a Change Request to /qfai-sdd.
  links:
    - .qfai/specs/spec-0011/06_Test-Cases.md
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
  - spec-0011/03_Acceptance-Criteria.md
  - spec-0011/04_Business-Rules.md
  - spec-0011/05_Examples.md
  - spec-0011/06_Test-Cases.md
notes: AC-0011-0012, BR-0011-0009, EX-0011-0010 and TC-0011-0013 state the routing, and the blocked -> todo bullet carries no archived and no instruction to close a record (DR-0011-0004).
```

#### Migration / Follow-ups

- No migration required.

#### Verification

### Plan (DL-0002)

```yaml
- id: VFY-001
  level: integration
  target: The blocked -> todo bullet of references/execution-ledger.md
  method: TC-0011-0013 reads the bullet
  owner: dev
  expected: The bullet contains no archived and no instruction to close a record.
  links:
    - .qfai/specs/spec-0011/06_Test-Cases.md
```

### DL-0003

#### Meta

```yaml
id: DL-0003
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0011/06_Test-Cases.md
notes: TC-0011-0013 checks the qfai-implement skill directory; spec-0013 TC-0013-0038 carries the tree-wide absence check (DR-0011-0005).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: TC-0011-0013 widens its absence check to the whole assistant tree
  reason: TC-0013-0038 owns the tree-wide half, and two cases would hold one obligation twice.
  do_not: Check the whole tree from two test cases.
  temptation: Both skills are edited in the same change.
- option: A separate test case for the tree-wide half
  reason: It changes the approved Triage id list.
  do_not: Mint a TC the Triage did not list.
  temptation: One case per signal reads neatly.

### DL-0004

#### Meta

```yaml
id: DL-0004
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0011/01_Spec.md
  - spec-0011/03_Acceptance-Criteria.md
notes: AC-0011-0012 carries a Source line and 01_Spec.md names discussion-20260923060900824#REQ-0007 with no local id (DR-0011-0006).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Record the source only in 09_delta.md
  reason: Every AC needs its Source, and 01_Spec.md copies down the requirements it answers.
  do_not: Leave a new AC without a Source line.
  temptation: The Triage row already names the source.

### DL-0005

#### Meta

```yaml
id: DL-0005
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0011/04_Business-Rules.md
notes: One BR, one EX and one TC for AC-0011-0012, as the Triage lists; QFAI-COV-207 warnings are triaged in the density review (DR-0011-0007).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Split BR-0011-0009 per record kind
  reason: The Triage lists one item per layer, and the kinds share one oracle.
  do_not: Split the item to clear a density warning.
  temptation: A warning reads as a defect.

### DL-0006

#### Meta

```yaml
id: DL-0006
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0011/tdd/test-list.md
notes: TDD-0021 is T2 because its test reads shipped files (DR-0011-0008).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: T1 like the neighbouring Integration rows
  reason: Those rows show - because they predate seeded tiers, and reading shipped files is T2 in the tier table.
  do_not: Copy an unseeded neighbour's tier onto a new row.
  temptation: It matches the rows above it.

### DL-0007

#### Meta

```yaml
id: DL-0007
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0011/tdd/test-list.md
notes: TDD-0021's Owning module is packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement (DR-0011-0009).
```

#### Migration / Follow-ups

- No migration required.

### DL-0008

#### Meta

```yaml
id: DL-0008
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0011/tdd/test-list.md
notes: Tier is seeded on TDD-0021 only; the other rows are not re-derived because no Change Request drives this run (DR-0011-0010).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Re-derive Tier on every row
  reason: A raised tier returns a row to todo, and no Change Request authorizes resetting rows this change does not touch.
  do_not: Re-derive tiers across the ledger without a driving Change Request.
  temptation: Phase 2b re-derives Tier on every run.

### DL-0009

#### Meta

```yaml
id: DL-0009
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0011/04_Business-Rules.md (BR-0011-0009)
notes: BR-0011-0009 is realized by the shipped qfai-implement skill text; its named homes resolve to templates, schemas and .qfai/decisions/, with no contract (DR-0011-0011).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Write a contract for the skill text
  reason: The request does not need one.
  do_not: Add a contract under .qfai/contracts/ for skill text.
  temptation: Obligation reconciliation asks for a realizing contract.

### DL-0010

#### Meta

```yaml
id: DL-0010
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0011/10_Plan.md
notes: The plan names where the skill text is edited and cites spec-0004's plan for the order (DR-0011-0012).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Leave the plan unchanged
  reason: A reader of this plan alone would miss that the text must land with the removal of QFAI-TDDLIST-015.
  do_not: Leave the coupling to the other plans.
  temptation: The edit sits inside one skill.

### DL-0011

#### Meta

```yaml
id: DL-0011
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0011/06_Test-Cases.md (TC-0011-0013)
  - spec-0011/tdd/test-list.md (TDD-0021..TDD-0023)
notes: TC-0011-0013 names three boundaries, one ledger row each, and checks the "work-log entry" absence EX-0011-0010 asserts (DR-0011-0013).
```

#### Migration / Follow-ups

- `/qfai-atdd` writes one test per boundary and records each RED on its own.

#### Rejected

- option: Keep one row and record why one oracle suffices
  reason: The three checks fail for different reasons and are fixed by different edits, so one row observes only the first failure.
  do_not: Put independently failing checks behind one row.
  temptation: All three fail today, so one row turns red either way.

### DL-0012

#### Meta

```yaml
id: DL-0012
date: 2026-09-25
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - spec-0011/01_Spec.md (discussion REQ-0007 line removed)
  - spec-0011/03_Acceptance-Criteria.md (AC-0011-0012 removed)
  - spec-0011/04_Business-Rules.md (BR-0011-0009 removed)
  - spec-0011/05_Examples.md (EX-0011-0010 removed)
  - spec-0011/06_Test-Cases.md (TC-0011-0013 removed)
  - spec-0011/tdd/test-list.md (TDD-0021..TDD-0023 deleted and tombstoned)
notes: The record-homes obligations are withdrawn under CR-20260925-0010, approved by the user; the skill text stays (DR-0011-0014).
```

#### Migration / Follow-ups

- `/qfai-atdd` deletes `spec0011RecordHomes.test.ts` in the same commit.

#### Rejected

- option: Keep TDD-0021 for the replacement skill text
  reason: The user kept the text and withdrew its tests; REQ-0007 is checked by review.
  do_not: Add a test that pins skill wording or the absence of the work-log surface.
  temptation: The text is shipped, and shipped text usually has a test.

#### Verification

### Plan (DL-0012)

```yaml
- id: VFY-001
  level: integration
  target: no spec-0011 ledger row names a deleted test file
  method: qfai validate --profile sdd and --profile tdd --spec spec-0011 with the repository build, after the test file is deleted
  owner: dev
  expected: No TDDLIST_TEST_FILE_MISSING and no finding naming TDD-0021..TDD-0023.
  links:
    - .qfai/specs/spec-0011/tdd/test-list.md
```

## Origin

- Consolidates: old spec-0014 (TDD unification), spec-0015 (Guardrail Hardening), spec-0016 (Dev Toolkit Hardening)
- Old spec-0014 unified 3 TDD skills into `/qfai-implement`
- Old spec-0015 added Phase 2 validators and 8-column template
- Old spec-0016 formalized 6-agent roster, completion contracts, evidence contracts, parallel dispatch rules

## Adopted

- AD-0011-0001: Single TDD entry point -- `/qfai-implement` with embedded micro-cycle (from spec-0014)
- AD-0011-0002: 8-column test-list.md -- TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence (from spec-0015)
- AD-0011-0003: 6-agent sub-agent roster -- formal agent definitions with responsibilities and prohibitions (from spec-0016)
- AD-0011-0004: 10-point completion gate -- machine-enforceable completion conditions (from spec-0016)
- AD-0011-0005: Evidence contract hardening -- per-item fresh evidence with RED/GREEN command+result (from spec-0016)
- AD-0011-0006: Failed first delegation hard-stop mitigation -- the first required real delegation doubles as the capability probe, and failure must stop immediately with remediation guidance (from spec-0011/10_Plan.md Risk mitigation)

## Rejected

- RJ-0011-0001: Old 3-skill TDD workflow (qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor)
  - DO NOT reintroduce separate TDD phase skills
  - Temptation: splitting implement back into separate skills for "modularity"
  - Reason: single entry point eliminates phase-skipping and ensures full cycle enforcement

- RJ-0011-0002: Status-only evidence
  - DO NOT accept evidence without command+result pairs
  - Temptation: marking items done with "looks good" or "should pass"
  - Reason: observable proof is required per evidence hard rules

## ID Renumbering

| Old ID                 | New ID       | Notes                 |
| ---------------------- | ------------ | --------------------- |
| spec-0014 US-0014-YYYY | US-0011-YYYY | TDD unification       |
| spec-0015 US-0015-YYYY | US-0011-YYYY | Guardrail hardening   |
| spec-0016 US-0016-YYYY | US-0011-YYYY | Dev toolkit hardening |

## 2026-05-06 — CHG-001 — Absorbed simplified handoff + design-system input from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                          |
| ------ | ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | simplified handoff schema + design-system input bullets; US range → US-0011-0008 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0011-0007..0008)            | simplified handoff + design-system input user stories                            |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0011-0009..0010)     | simplified handoff schema + design-system mirror byte-equivalence                |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0011-0007..0008)          | mirror BR layer for OP-003                                                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0011-0008..0009)                | worked examples per AC                                                           |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0011-0011..0012)              | test coverage per AC                                                             |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0011-0011..0012) | TDD ledger sync                                                                  |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). The mirror invariant for `design-system.yaml` is enforced by the design contract validator family owned by spec-0004; `/qfai-implement` only consumes the validated mirror.

## Triage

| Source                                                     | Subject                                                                                                                                                                                             | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017 (CHG-003) | `/qfai-implement` SKILL.md に `project_memory:` 宣言追加、author 前に open work-log entry を読み、kind 別 write-trigger に従い entry を書く。handoff entry body を 5 セクション schema に従わせる。 | spec-0011     | UPDATE    | APPEND | pin-implied | Primary worklog-writer (most write-trigger surface area)。implementation-phase skill (REQ-0005 scope)。subject-token overlap (`skill`, `implement`)。 |

## CHG-003 (v1.9.0) — Primary Worklog-writer Contract

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- Obligation: `/qfai-implement` is the **primary** worklog-writer. SKILL.md MUST:
  1. Carry a `project_memory:` block enumerating layers it reads.
  2. Read open work-log entries (`status` ∈ `{active, handoff}`, `scope` ∈ `{global, <current-spec>}`) before authoring; cite consulted entry IDs in completion report (REQ-0005).
  3. Write entries at the 11 conditions listed in `_policies/10_Policy.md#work-log-write-triggers` (REQ-0004) — milestone, decision, risk, consultation-needed, unexpected, unscoped-discovery, handoff, blocker, scope-up, scope-down, spike.
  4. Follow the handoff-brief body schema (REQ-0017) for `kind: handoff` entries.
  5. Treat `kind: unscoped-discovery` as non-blocking (REQ-0016): record and continue, do not abort current scope.
- Cascade: SKILL.md `project_memory:` validated by spec-0004. Reviewer-Gate drift checks (spec-0015) run on outputs.
- Source: REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

| Source                       | Subject                                                                                                                                      | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                       | Depends-On        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| REQ-0045                     | A diagnose-only operation with four verdicts                                                                                                 | spec-0011     | UPDATE    | APPEND | -           | It takes the expected-behaviour reference and the scope and changes no product code. It returns a reproduction, cause candidates, impact, the matching obligations and one verdict: a missing test, a defective test, a regression on a `done` row, or an expectation that differs from the request, which reclassifies the run | REQ-0033          |
| REQ-0046                     | `regression_fix` against a `done` row whose existing, correct test caught a regression                                                       | spec-0011     | UPDATE    | APPEND | -           | D18. BR-0011-0002 and AC-0011-0002 stand: the row stays `done` with its status untouched. The same test turning GREEN again, plus the final verify, confirms the fix, and the run evidence records it. OQ-0009 fixes the stage name                                                                                             | REQ-0033, OQ-0009 |
| REQ-0048                     | `test_fix` for a defective Unit or Component test, or an Integration test whose TCs are all L1 or L2                                         | spec-0011     | UPDATE    | APPEND | -           | D14. The fix leaves ledger status alone only while the expectation still points at the same AC or BR. It carries an independent review and a re-run in the run evidence. The acceptance-layer half is ATDD's, on spec-0008                                                                                                      | REQ-0033, OQ-0009 |
| REQ-0038                     | A seam-only work order during the ATDD round trip                                                                                            | spec-0011     | UPDATE    | APPEND | -           | Implement lands only the minimal connection the acceptance test needs to reach its assertion, through the existing minimal-seam step. The main implementation waits for RED                                                                                                                                                     | REQ-0033          |
| REQ-0013                     | A valid run binding satisfies the hard-required `primarySpecId` without asking                                                               | spec-0011     | UPDATE    | APPEND | -           | The User Selection Flow asks only when no binding is supplied. Standalone invocation is unchanged                                                                                                                                                                                                                               | REQ-0033          |
| REQ-0034                     | A long implement stage resumes at a ledger-item boundary through `checkpointRef` and a legal `operation`                                     | spec-0011     | UPDATE    | APPEND | -           | The run cites ledger IDs and never copies item state. Implement keeps its own phase order                                                                                                                                                                                                                                       | REQ-0033          |
| REQ-0051, REQ-0052, REQ-0056 | Orchestrated mode for `/qfai-implement`: the entry check, the work-order scope and shared-snapshot reuse, with the ledger check never cached | spec-0011     | UPDATE    | APPEND | -           | One `references/orchestrated-mode.md` cited by one line from `SKILL.md` (D12)                                                                                                                                                                                                                                                   | REQ-0033          |
| NFR-0003                     | `qfai-implement/SKILL.md` grows by at most the one citation line                                                                             | spec-0011     | UPDATE    | APPEND | -           | The file is at 799 of its 800 lines                                                                                                                                                                                                                                                                                             | -                 |

## 2026-09-24 — Intent-driven entry: change summary

- Change ID: DELTA-0003
- Date: 2026-09-24
- Primary: Behavior
- Tags: @docs, @test
- Summary: the eight rows of `## Triage (2026-09-24 intent-driven entry)` applied.
  `/qfai-implement` gains its orchestrated mode, the diagnose-only operation, the
  seam-only work order, `regression_fix` against a `done` row, and `test_fix` for
  unit-layer rows. The two scope-gap lines of the skill carve out a diagnosed
  missing test, under the `REQ-0046` row.
- Appended: US-0011-0009..0012; AC-0011-0013..0025, AC-0011-0026; BR-0011-0010..0022, BR-0011-0023;
  DR-0011-0015, DR-0011-0016. Modified: none. BR-0011-0002 and AC-0011-0002 stand
  unchanged.
- Resolved pack question: `discussion-20260923171450572#OQ-0009` (the names of
  the SDD row-append operation and the bugfix stages), resolved by CLI-WFFILE
  `### Vocabulary` and `_policies/08_Decisions.md` DR-0297. This spec's stages are
  `diagnose`, `regression_fix` and `test_fix`. `08_Open-questions.md` records a
  question only while it is open, so the resolution is recorded here.
- Size: AC 11 → 25, under the threshold of 30.
- Reserved IDs: DR-0011-0002 stays unused, because ledger rows cite it and no
  record declares it.

- Phase 2c.1 (obligation reconciliation): AC-0011-0018 and BR-0011-0015 now say a diagnosis changes no file git tracks, and name the files git ignores as artifacts. AC-0011-0019 and BR-0011-0016 name `matchedRowIds` and put the reproduction, cause candidates and impact in the reproduction record. BR-0011-0019 names the `regressionFix` receipt and gains a Contract Realization row. The IDs are unchanged. The sources are CLI-WF `### Stage result` (`changedFiles`, `artifactRefs`, `diagnosis`, `regressionFix`).

- Change ID: DELTA-0004
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0020 part A. AC-0011-0020, BR-0011-0017, EX-0011-0018
  and TC-0011-0021 no longer require the two scope-gap lines to cite DR-0297,
  which the distributed-surface guards refuse in a shipped file. Each line names
  `/qfai-sdd` as the skill that appends the row instead. IDs are unchanged.
  TDD-0029 stays at todo; this CR goes in its DR-ID.

## 2026-09-24 — Intent-driven entry: update history

| Date       | DL      | Summary                                                                                          |
| ---------- | ------- | ------------------------------------------------------------------------------------------------ |
| 2026-09-24 | DL-0013 | DR-0011-0015: A defective unit-layer test is fixed with ledger status untouched                  |
| 2026-09-24 | DL-0014 | DR-0011-0016: A regression on a `done` row is fixed in production code, and the row stays `done` |

## 2026-09-24 — Intent-driven entry: decision log

One entry per `07_Decisions.md` record added on 2026-09-24.

### DL-0013

DR-0011-0015: A defective unit-layer test is fixed with ledger status untouched.

#### Meta

```yaml
id: DL-0013
date: 2026-09-24
primary: Behavior
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - .qfai/specs/spec-0011
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md
notes: The unit-layer half of decision D14; the acceptance-layer half is spec-0008's
```

#### Migration / Follow-ups

- No migration required. A `test_fix` stage moves no ledger row, and existing rows
  are unchanged.

#### Rejected

- option: allow any test edit without a status change
  reason: an edit that makes a test pass can change what it verifies
  do_not: accept a rewritten assertion without checking that it cites the same AC or BR
  temptation: the test was wrong, so any passing edit looks like the fix
- option: record the re-run in the run evidence only
  reason: the changed test file leaves the row stale and the final validate fails
  do_not: leave a changed test file with no re-verify record in the ledger's evidence
  temptation: the run evidence already holds the re-run

### DL-0014

DR-0011-0016: A regression on a `done` row is fixed in production code, and the row stays `done`.

#### Meta

```yaml
id: DL-0014
date: 2026-09-24
primary: Behavior
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - .qfai/specs/spec-0011
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md
notes: Decision D18; BR-0011-0002 and its forward-only lifecycle stand unchanged
```

#### Migration / Follow-ups

- No migration required. No ledger row moves, and no row is added.

#### Rejected

- option: append a regression row through /qfai-sdd
  reason: an existing row already holds the obligation, so a second row duplicates it
  do_not: seed a new row for an obligation an existing row holds
  temptation: a new row runs RED to GREEN, which looks like stronger evidence
- option: file a Change Request for the regression
  reason: nothing upstream changed, so the Change Request would record a change that did not happen
  do_not: file a Change Request for a regression an existing correct test catches
  temptation: it is how the shipped rules handle a regression found at a checkpoint
- option: record the re-run in the run evidence only
  reason: where the project's source directory covers the fixed code, the row goes stale and the final validate fails
  do_not: leave the row without a re-verify record in the ledger's evidence
  temptation: the run evidence already holds the re-run

## Change Requests

| CR ID            | Upstream artifact                                                                                                                                                      | Mode      | Approved by                            | Applied at           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------- | -------------------- |
| CR-20260924-0008 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                 | re-derive | user                                   | 2026-09-24T18:26:35Z |
| CR-20260925-0018 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`                                                                                 | re-derive | user                                   | 2026-09-24T19:00:08Z |
| CR-20260925-0020 | `.qfai/contracts/cli/qfai-workflow.md`; `spec-0011/03..06`                                                                                                             | re-derive | user                                   | 2026-09-25T02:36:35Z |
| CR-20260925-0022 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                 | re-derive | user                                   | 2026-09-25T03:00:14Z |
| CR-20260925-0009 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`                                                                                 | re-derive | user                                   | 2026-09-25T03:23:20Z |
| CR-20260925-0012 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                 | re-derive | user                                   | 2026-09-25T06:04:36Z |
| CR-20260925-0013 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                 | re-derive | user                                   | 2026-09-25T07:34:27Z |
| CR-20260925-0023 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`                                                                                 | re-derive | user                                   | 2026-09-25T10:20:50Z |
| CR-20260925-0010 | `spec-0011/01_Spec.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `10_Plan.md`, `tdd/test-list.md` | re-derive | user (Claude Code structured question) | -                    |

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- Change Request records `CR-20260924-0001`, `CR-20260924-0002` and `CR-20260925-0008` became `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010`; every reference here follows them.

A later `origin/main` took more of these IDs, and the intent-driven ones moved again to
the next free ones:

- `AC-0011-0012`, `BR-0011-0009`, `EX-0011-0010` and `TC-0011-0013` became `AC-0011-0026`,
  `BR-0011-0023`, `EX-0011-0025` and `TC-0011-0028`.
- `DR-0011-0003` and `DR-0011-0004` became `DR-0011-0015` and `DR-0011-0016`.
- `TDD-0021`..`TDD-0023` became `TDD-0040`..`TDD-0042`.
- The intent-driven entry's `DL-0001`, `DL-0002`, `DELTA-0001` and `DELTA-0002` became
  `DL-0013`, `DL-0014`, `DELTA-0003` and `DELTA-0004`.
- `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010` became `CR-20260924-0007`,
  `CR-20260924-0008` and `CR-20260925-0022`. `CR-20260925-0003`..`CR-20260925-0007` and
  `CR-20260925-0015` became `CR-20260925-0017`..`CR-20260925-0021` and `CR-20260925-0023`.
  Every reference here follows them.
- A range that included a moved ID now names the moved IDs separately.
