# 04 Business Rules

## BR-0011-0001: Serial-by-Default Processing

- AC-Refs: AC-0011-0001, AC-0011-0005

- Items are processed one test at a time in `test-list.md` order by default.
- Parallel processing requires explicit user approval and delivery-planner authorization.

## BR-0011-0002: Forward-Only Lifecycle

- AC-Refs: AC-0011-0002

- Valid transitions: `todo` -> `red` -> `green` -> `refactor` -> `done`.
- Any active status -> `exception` is allowed.
- Backward transitions are prohibited.

## BR-0011-0003: Test-First Enforcement

- AC-Refs: AC-0011-0003

- A failing test MUST be written before any production code.
- Production code written before a failing test exists is rejected.

## BR-0011-0004: Minimal Code Principle

- AC-Refs: AC-0011-0011

- Write the minimum production code to make the failing test pass.
- Speculative generalization is prohibited.

## BR-0011-0005: Evidence Hard Rules

- AC-Refs: AC-0011-0007

- Status-only evidence is invalid and MUST be rejected.
- Both command and result are required for RED and GREEN phases.
- Stale evidence from previous runs MUST NOT be reused.
- Empty evidence entries are rejected.

## BR-0011-0006: Reviewer Separation

- AC-Refs: AC-0011-0006

- Implementation workers cannot serve as their own reviewers.
- Both completion-reviewer and implementation-reviewer must return PASS before `done`.

## BR-0011-0007: Handoff Schema Closed Field Set

- AC-Refs: AC-0011-0009

- `prototype-handoff.yaml` MUST expose exactly `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes`.
- Legacy fields `mustPreserve` / `mayAdapt` / `mustNotCopy` MUST NOT be relied on by `/qfai-implement` and MUST surface as schema warnings if encountered.

## BR-0011-0008: Design System Input Determinism

- AC-Refs: AC-0011-0010

- `design-system.yaml` is the deterministic mirror of root `DESIGN.md` token tables (color / typography / radius / shadow).
- `/qfai-implement` MUST treat it as input only — it does not regenerate token tables from per-iter HTML.

## BR-0011-0009: The Stage-Skill Handover

- AC-Refs: AC-0011-0012

- In mode `active`, `/qfai-implement` makes the stage-skill entry check, does only the work of a work order it is handed, and its `SKILL.md` cites `references/orchestrated-mode.md` with one line.

## BR-0011-0010: The Operations Table

- AC-Refs: AC-0011-0013

- The `## Operations` table of `qfai-implement/references/orchestrated-mode.md` lists exactly the operations the plan vocabulary assigns to `qfai-implement`, `seam-only` included.

## BR-0011-0011: The Run Binding Supplies the Primary Spec

- AC-Refs: AC-0011-0014

- A work order whose target binds a spec supplies the hard-required `primarySpecId` without a confirmation, and with no work order the User Selection Flow asks as it does today.

## BR-0011-0012: The Checkpoint Resume

- AC-Refs: AC-0011-0015

- A long implement stage resumes at the ledger row its work order's `checkpointRef` names, through the work order's operation, and names row IDs without copying any row's status.

## BR-0011-0013: The Ledger Check Is Never Cached

- AC-Refs: AC-0011-0016

- Inside an active run, the implement stage may reuse the shared preflight snapshot only for the inputs the snapshot covers.
- It reads and checks the bound ledger itself at every stage start, and never takes that check from the snapshot.

## BR-0011-0014: The Seam-Only Work Order

- AC-Refs: AC-0011-0017

- A seam-only work order lands only the minimal connection its target test needs, through the existing minimal-seam step, and leaves that test failing at its assertion.

## BR-0011-0015: Diagnose-Only Changes No Tracked File

- AC-Refs: AC-0011-0018

- A diagnose-only work order is served without changing any file git tracks, and a file it writes that git ignores, such as its reproduction record, is named in `artifactRefs` rather than in `changedFiles`.

## BR-0011-0016: A Diagnosis Returns One Verdict

- AC-Refs: AC-0011-0019

- A diagnosis returns exactly one verdict from the contract's closed set, `matchedRowIds` naming the ledger rows of the matching existing obligations that the next work order binds, and the record `reproductionRef` names, which holds the reproduction, the cause candidates and the impact.

## BR-0011-0017: A Diagnosed Missing Test Raises No Change Request

- AC-Refs: AC-0011-0020

- When diagnosis finds a missing test on behaviour the spec already states, `/qfai-implement` files no Change Request and adds no ledger row: `/qfai-sdd` appends the row (`_policies/08_Decisions.md` DR-0297).
- The two scope-gap lines of the skill, in `references/change-request-reset.md` and in `SKILL.md`, state that carve-out and cite DR-0297. Each is edited in place, so `SKILL.md` gains no line from this rule.
- The carve-out covers that one case. Every other scope gap still goes through a Change Request.

## BR-0011-0018: A Regression Fix Leaves the `done` Row `done`

- AC-Refs: AC-0011-0021

- A `regression_fix` work order changes production code only, against the existing row, and leaves that row `done` with no Change Request filed and no evidence deleted.

## BR-0011-0019: What Confirms a Regression Fix

- AC-Refs: AC-0011-0022

- The same test turning GREEN again, plus the run's final verify, confirms a regression fix (DR-0011-0004).
- The stage result carries the `regressionFix` receipt, naming that test, its GREEN re-run and its independent review, and the fix and the re-run are also recorded in the run evidence.
- The re-run is also appended to the row's evidence section as a re-verify record, in a form the ledger validator already reads. None of the row's cells is edited. Where the project's `paths.srcDir` covers the fixed code, the changed code would otherwise leave the row reported as stale, and the run's final validate would fail.

## BR-0011-0020: What a Test Fix Leaves on the Ledger Row

- AC-Refs: AC-0011-0023

- A test fix returns the AC or BR the expectation cites before and after the fix, with an independent review and a re-run of the test (DR-0011-0003).
- It edits none of the row's `Status`, `TC-Refs`, `Layer` and `Boundary`. `Test file` and `Selector` may change, since a wrong selector is one of the defects a test fix repairs.
- The re-run is appended to the row's evidence section as a re-verify record, in a form the ledger validator already reads. The changed test file would otherwise leave the row reported as stale, and the run's final validate would fail.

## BR-0011-0021: A Change of Meaning Goes to SDD

- AC-Refs: AC-0011-0024

- A test fix after which the expectation would cite a different AC or BR is returned as `needs_repair`, listing that finding with `qfai-sdd` as its resolving owner.

## BR-0011-0022: The Unit Layers of a Test Fix

- AC-Refs: AC-0011-0025

- `/qfai-implement` serves a `test_fix` work order for a `Unit` or `Component` row and for an `Integration` row whose `TC-Refs` name only `L1` or `L2` test cases, and none for any other row.

## Contract Realization

The CLI contracts declare no `CON-*` ID, so this table names the contract section
that realizes each rule added on 2026-09-24.

| Contract   | Section                                      | Realized by                                            |
| ---------- | -------------------------------------------- | ------------------------------------------------------ |
| CLI-WF     | `### host:stage-skill-handover`              | BR-0011-0009                                           |
| CLI-WFFILE | `### The Operations table`, `### Vocabulary` | BR-0011-0010                                           |
| CLI-WF     | `### Work order`                             | BR-0011-0011, BR-0011-0012                             |
| CLI-WF     | `### Stage result`                           | BR-0011-0014, BR-0011-0015, BR-0011-0016, BR-0011-0021 |
| CLI-WF     | `### Stage result` (`testFix`)               | BR-0011-0020, the returned field only                  |
| CLI-WF     | `### Stage result` (`regressionFix`)         | BR-0011-0019, the receipt only                         |
| CLI-WF     | `## Ledger row-set check`                    | BR-0011-0018                                           |
| CLI-WFFILE | `### Vocabulary`                             | BR-0011-0022                                           |

BR-0011-0013 and BR-0011-0017 have no row: no contract states which checks a
stage re-runs inside a run, or how the skill words its scope-gap lines. For
BR-0011-0019 the contract carries the receipt; that the same test turning GREEN
again confirms the fix, and the re-verify record, are a spec rule.
