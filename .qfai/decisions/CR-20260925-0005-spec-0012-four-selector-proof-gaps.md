# Change Request

- ID: `CR-20260925-0005`
- Title: `Four completed selectors omit their declared test boundaries`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-24T21:27:25Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (Codex interactive decision)`
- Approved at: `2026-09-24T21:36:00Z`
- Approved option: `approved defect repair`
- Applied at: `2026-09-25T22:32:07Z`
- Superseded by: `-`

## Context

`TDD-0489`, `TDD-0498`, `TDD-0499`, and `TDD-0500` are `done` and have executable selectors after a
lawful `/qfai-implement` repair of previously unresolved selector text. Independent review returned
`REVISE`: the selected tests prove only part of the already-declared TC in each row. A passing
focused test is not proof that the rest of the case passed.
`tmp/cross-spec-closure/spec0012-selector-revise-plan.json` records exact selected and omitted test
titles and the reviewer's row-specific reasons. The existing TC meanings remain the target.

The other four `REVISE` rows from that same review (`TDD-0497`, `TDD-0514`, `TDD-0515`, `TDD-0516`)
are already blocked by approved, unapplied `CR-20260923-0001`. They are deliberately outside this
CR's blocked/reset scope.

## Reproduction

Two excerpts show the defect without inferring a missing assertion from a title:

- `.qfai/specs/spec-0012/06_Test-Cases.md#TC-0012-0470` requires rejection text to **end with** the
  literal peek-mode hint.
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.cycleOutOfRange.peekMode.test.ts` line
  42 asserts only `expect(stderrLines.join("")).toContain(EXPECTED_HINT)`. Text appended after the
  hint would pass the selected test and violate the TC.
- `TC-0012-0451` requires six additional negative inputs (empty, whitespace, negative, float, hex,
  SQL injection) with the literal four-digit error. `TDD-0499` selects only
  `rejects "abc" with the literal error string`; the named file's five current `it` titles do not
  include those six specified cases. The independent review inventory at
  `tmp/cross-spec-closure/spec0012-selector-revise-plan.json` lists the current titles and source
  lines.

`TC-0012-0450` separately promises literal stdout with counts and first offenders, while
`TDD-0498`'s selected tests call the pure summary helper and do not assert all three counts.
`TC-0012-0452` promises parser normalization plus CLI-resolved `spec-0001`, upper-bound and zero
rejection, while `TDD-0500` selects only four positive parser cases.

## Proposed change

Preserve all four TCs and correct the proof at the owning layers:

1. `TDD-0489`: add an exact full-output assertion or snapshot that includes the out-of-range error
   and ends with the literal hint, trimming only the final newline. Narrow the selector to the
   focused test that makes a trailing-text mutation fail.
2. `TDD-0498`: add a CLI-level exact output test for `[BLOCKED]` category identifiers, counts,
   stable order, and first offenders. Keep pure-helper tests as supporting coverage. SDD Phase 2b
   assigns the stdout boundary to a matching integration test file/row rather than treating helper
   output as stdout.
3. `TDD-0499`: add the six specified negative inputs with literal diagnostic assertions and stable
   executable titles; give independent input classes separate boundaries where required. Keep the
   `abc` case.
4. `TDD-0500`: prove normalization to `0001` in the parser and prefix resolution to `spec-0001` at
   the CLI layer; include `10000` and `0` rejection. SDD Phase 2b separates independently observable
   parser/CLI and accept/reject boundaries. Preserve the TC's concrete examples or revise only its
   fixture-count wording when the owner confirms exact equivalent coverage.

Do not substitute an all-tests passing file run for per-boundary falsifiability. The SDD owner
retains row identities where possible and appends rows at `todo` for newly separated boundaries.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                            |
| -------------------- | ---------- | ------------------------------------------------------------------------- |
| `spec-0012/TDD-0489` | ledger-row | Selected assertion allows trailing text after the mandated final hint.    |
| `spec-0012/TDD-0498` | ledger-row | Selected pure-helper checks do not prove literal CLI stdout counts.       |
| `spec-0012/TDD-0499` | ledger-row | Selector omits the six specified negative inputs and literal diagnostics. |
| `spec-0012/TDD-0500` | ledger-row | Selector omits upper/zero rejection and CLI prefix resolution.            |

- Not blocked by this CR: `TDD-0497`, `TDD-0514`, `TDD-0515`, and `TDD-0516`; approved but unapplied
  `CR-20260923-0001` already blocks and governs them. The other 50 rows are covered by draft
  `CR-20260925-0001` through `0004`, or are unaffected.
- Overlapping open CRs: no open CR found naming these four IDs. `CR-20260923-0001` is approved but
  unapplied, and its blocked set is disjoint from this one.

## Impact scope

- Specs: `spec-0012`
- Plans: `.qfai/specs/spec-0012/10_Plan.md` only if Phase 2b adds layer-specific boundary rows
- Tests:
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.cycleOutOfRange.peekMode.test.ts`,
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.blockedSummary.test.ts`,
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.primarySpecIdError.test.ts`,
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.primarySpecIdNormalise.test.ts`, plus a
  CLI integration test for stdout/prefix if the current suite cannot host it
- Contracts: none proposed
- Schema: none proposed
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`, `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/10_Plan.md`

## Decision needed from user

Approve preserving these four existing TC obligations and resetting the four enumerated rows for
missing exact-output, negative-input, boundary and CLI-layer proof, followed by
`/qfai-sdd spec-0012` in `re-derive` mode?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the actual approver and time in canonical
   `.qfai/decisions/CR-20260925-0005-spec-0012-four-selector-proof-gaps.md`. Run
   `/qfai-sdd spec-0012` in `re-derive` mode. Stage 1 Triage is `UPDATE/MODIFY` for the existing
   TC-to-test traceability. Phase 2b corrects Test file/Selector cells and splits independent
   boundaries. Phase 4 records this CR in `spec-0012/09_delta.md`. Complete the UI-bearing
   independent review gates.
2. Reset exactly `spec-0012/TDD-0489`, `spec-0012/TDD-0498`, `spec-0012/TDD-0499`, and
   `spec-0012/TDD-0500` to `todo`, recording this CR in `DR-ID`. No row retirement is approved here.
   Appended rows start `todo`.
3. `/qfai-atdd spec-0012` handles CLI integration boundaries, `/qfai-implement spec-0012` handles
   Unit boundaries. Each row needs nonzero focused selection, falsifiability, restored GREEN and
   independent cross-spec review before `done`.

## Resolution

Applied. The owner rerun and the ledger sweep (actions 1 and 2) are done. Action 3, the tests and
proof of each reset or new row, is the downstream work this releases. No test case text changes.

- **Reset.** `spec-0012/TDD-0489`, `TDD-0498`, `TDD-0499` and `TDD-0500` are at `todo` with this
  record in `DR-ID`, each with its prior `Evidence` kept after `prior:`. No row is retired.
- **`TDD-0498`** keeps the helper boundary, `summary-counts-and-first-offenders`, on the test that
  names the top three categories with their offenders. `TDD-0614` is a new `Integration` row for
  the stdout line, `cli-stdout-line`. No test exists for it, so its `Test file` and `Selector` are
  `-` until `/qfai-atdd` writes them.
- **`TDD-0500`** keeps the parser boundary, `parser-pads-to-four-digits`. Three new rows take the
  rest:

  | Row        | Boundary                   | Layer         |
  | ---------- | -------------------------- | ------------- |
  | `TDD-0615` | `cli-resolves-spec-prefix` | `Integration` |
  | `TDD-0616` | `rejects-above-9999`       | `unit`        |
  | `TDD-0617` | `rejects-zero`             | `unit`        |

- **`TDD-0499` is not split.** All seven inputs fail with the same literal diagnostic, so they are
  one boundary seen from seven angles. The row's test still needs the six inputs the case lists.
- **`TDD-0489` is not split.** Its case states one boundary: the rejection text ends with the hint.
  Its selector stays until the test that fails on trailing text exists.
