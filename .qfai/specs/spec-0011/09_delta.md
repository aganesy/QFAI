# 09 Delta (Migration Record)

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

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-24
- Primary: Behavior
- Tags: @docs, @test
- Summary: the eight rows of `## Triage (2026-09-24 intent-driven entry)` applied.
  `/qfai-implement` gains its orchestrated mode, the diagnose-only operation, the
  seam-only work order, `regression_fix` against a `done` row, and `test_fix` for
  unit-layer rows. The two scope-gap lines of the skill carve out a diagnosed
  missing test, under the `REQ-0046` row.
- Appended: US-0011-0009..0012; AC-0011-0012..0025; BR-0011-0009..0022;
  DR-0011-0003, DR-0011-0004. Modified: none. BR-0011-0002 and AC-0011-0002 stand
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

- Change ID: DELTA-0002
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0006 part A. AC-0011-0020, BR-0011-0017, EX-0011-0018
  and TC-0011-0021 no longer require the two scope-gap lines to cite DR-0297,
  which the distributed-surface guards refuse in a shipped file. Each line names
  `/qfai-sdd` as the skill that appends the row instead. IDs are unchanged.
  TDD-0029 stays at todo; this CR goes in its DR-ID.

## Update History

| Date       | DL      | Summary                                                                                          |
| ---------- | ------- | ------------------------------------------------------------------------------------------------ |
| 2026-09-24 | DL-0001 | DR-0011-0003: A defective unit-layer test is fixed with ledger status untouched                  |
| 2026-09-24 | DL-0002 | DR-0011-0004: A regression on a `done` row is fixed in production code, and the row stays `done` |

## Decision Log

One entry per `07_Decisions.md` record added on 2026-09-24.

### DL-0001

DR-0011-0003: A defective unit-layer test is fixed with ledger status untouched.

#### Meta

```yaml
id: DL-0001
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

### DL-0002

DR-0011-0004: A regression on a `done` row is fixed in production code, and the row stays `done`.

#### Meta

```yaml
id: DL-0002
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

| CR ID            | Upstream artifact                                                                      | Mode      | Approved by | Applied at           |
| ---------------- | -------------------------------------------------------------------------------------- | --------- | ----------- | -------------------- |
| CR-20260924-0006 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-24T18:26:35Z |
| CR-20260925-0004 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-24T19:00:08Z |
| CR-20260925-0006 | `.qfai/contracts/cli/qfai-workflow.md`; `spec-0011/03..06`                             | re-derive | user        | 2026-09-25T02:36:35Z |
| CR-20260925-0010 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T03:00:14Z |
| CR-20260925-0009 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-25T03:23:20Z |
| CR-20260925-0012 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T06:04:36Z |
| CR-20260925-0013 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T07:34:27Z |
| CR-20260925-0015 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-25T10:20:50Z |

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- Change Request records `CR-20260924-0001`, `CR-20260924-0002` and `CR-20260925-0008` became `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010`; every reference here follows them.
