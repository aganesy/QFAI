# Change Request

- ID: `CR-20260924-0002`
- Title: Split CI acceptance rows by observable boundary
- Raised by: `qfai-implement`
- Raised at: `2026-09-24T08:16:14Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user` (2026-09-24 reply)
- Approved at: `2026-09-24T08:55:00Z`
- Approved option: `-`
- Applied at: `2026-09-24T09:58:00Z`
- Superseded by: `-`

## Context

Six `spec-0017` ledger rows each cover more than one independently observable
boundary. A single selector cannot demonstrate every assertion in those rows.
The ledger's row granularity conflicts with the acceptance cases it cites.

## Reproduction

`qfai-implement/references/selector-granularity.md` requires one observable
boundary per row and one RED observation per selector entry. The current ledger
has one row for each of `TC-0017-0007`, `TC-0017-0043`, `TC-0017-0062`,
`TC-0017-0064`, `TC-0017-0090` and `TC-0017-0091`. Their expected results in
`06_Test-Cases.md` include separate outcomes. For example, `TC-0017-0062`
requires both equality across slice declarations and an exact count of seven.
The current test checks both in one `it` block, so the first failing assertion
can prevent the second from running.

## Proposed change

Use `/qfai-sdd` Phase 2b to name each boundary in the six test cases and split
their ledger rows. Keep each existing `TDD-ID` for one boundary and allocate new
IDs for the others. Give sibling rows distinct `Boundary` slugs. Use separate
selectors and assertions for independently failing outcomes.

| Test case      | Boundaries to record                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-0017-0007` | Retained CI legs remain declared; selection skips retained legs; approved retirement removes the project, script and matrix legs together.                                                              |
| `TC-0017-0043` | Full runs report expanded check names; documentation-only runs report bare skipped matrix jobs.                                                                                                         |
| `TC-0017-0062` | Runner, scripts, four matrices and release shape list agree; the approved set contains exactly seven named slices and excludes retired names.                                                           |
| `TC-0017-0064` | Each slice script selects its matching runner project; all four sliced jobs invoke their per-slice scripts without a generic project argument.                                                          |
| `TC-0017-0090` | Exact capabilities select the sliced shape; the four operation scripts preserve the ordered aggregate command vector; one complete suite runs on each runtime.                                          |
| `TC-0017-0091` | Missing operation scripts keep the sliced suite behind aggregate checks; older and whole-suite tags use the whole suite; invalid check outputs and unsuccessful required operations refuse publication. |

The test-case owner must check whether a proposed boundary is already covered
by another active row, including `TDD-0098` for release prerequisites, before
seeding a sibling. A new row must not duplicate that obligation.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                               |
| -------------------- | ---------- | ---------------------------------------------------------------------------- |
| `spec-0017/TDD-0007` | ledger-row | Its selector conflates CI leg retention and retirement.                      |
| `spec-0017/TDD-0043` | ledger-row | Its selector covers two check-name states.                                   |
| `spec-0017/TDD-0062` | ledger-row | Its selector covers equality and exact membership.                           |
| `spec-0017/TDD-0064` | ledger-row | Its selector covers scripts and matrix invocation.                           |
| `spec-0017/TDD-0099` | ledger-row | Its test case covers classification, operation commands and suite execution. |
| `spec-0017/TDD-0100` | ledger-row | Its test case covers fallback and publication refusals.                      |

- Not blocked by this CR: other `spec-0017` rows whose obligations do not cite these six test cases.
- Overlapping open CRs: none identified.

## Impact scope

- Specs: `spec-0017`
- Plans: `.qfai/specs/spec-0017/10_Plan.md`
- Tests: `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`, `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts`
- Contracts: none
- Schema: none
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0017/06_Test-Cases.md`,
  `.qfai/specs/spec-0017/09_delta.md`,
  `.qfai/specs/spec-0017/10_Plan.md`,
  `.qfai/specs/spec-0017/16_Traceability-ledger.md`,
  `.qfai/specs/spec-0017/tdd/test-list.md`

## Decision needed from user

Approve splitting these six test cases and ledger rows within this pull request
so each independent result receives its own test and evidence.

## Approved actions (owner skill rerun plan)

1. Rerun `/qfai-sdd spec-0017` in `re-derive` mode. Record the approved
   boundaries and seed sibling rows with distinct `Boundary` slugs. Preserve
   existing `TDD-ID` values. Record this CR in `09_delta.md`.
2. Resume the six parked rows at `todo`, recording this CR in `DR-ID` and
   retaining prior evidence as history: `spec-0017/TDD-0007`, `spec-0017/TDD-0043`,
   `spec-0017/TDD-0062`, `spec-0017/TDD-0064`, `spec-0017/TDD-0099` and
   `spec-0017/TDD-0100`. Each row was parked from `todo` while this request
   awaited approval.
3. `/qfai-atdd` assigns a test to every boundary. `/qfai-implement` records
   fresh RED or falsifiability, GREEN, reviews and checkpoint evidence before
   advancing the affected rows.

## Resolution

The user approved the six-case split in this pull request on 2026-09-24.
