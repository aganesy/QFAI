# Change Request

- ID: `CR-20260924-0004`
- Title: Scope traceability checks to the implementation obligation
- Raised by: `architecture-reviewer`
- Raised at: `2026-09-24T12:13:02Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`BR-0017-0069` now requires exact seven-slice release capability and fallback
behavior. Its local `ci:gate:checks` command-order clause is unchanged.
`package.json` already preserves that order, and the active
`16_Traceability-ledger.md` correctly links the clause to that file.

The ledger and shipped `qfai-sdd` guidance define `QFAI-TRACE-001` per spec:
changing any acceptance criterion or business rule requires a branch diff in
every linked implementation file. The validator therefore reports the unchanged
`package.json` binding as an error during this approved release change. The gate
implements its documented rule, but that rule conflates a changed release
obligation with an already satisfied local command-order obligation.

## Proposed change

Give the unchanged local command-order clause its own business-rule identity.
Keep its truthful `package.json` binding and keep the release capability binding
to `.github/workflows/release.yml`. Define traceability validation around the
affected obligation and its bindings. A changed or newly introduced obligation
whose implementation remains unchanged must carry explicit test evidence that
the existing implementation satisfies it. Missing or ambiguous bindings, an
unavailable diff, and failed evidence must never pass silently.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                  | Cost                                                     | Risk                                                         | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| 1   | Keep the current per-spec gate and defer this spec change until `package.json` needs a genuine behavior change.         | Delays the approved release correction.                  | The old spec remains inaccurate.                             |             |
| 2   | Keep the per-spec gate and add a reviewed exception for each unchanged linked file.                                     | Adds exception records and expiry rules.                 | Exceptions can outlive the reason for them.                  |             |
| 3   | Split the static clause and validate changed obligations with complete bindings and verified unchanged implementations. | Updates the spec, ledger, guidance, validator and tests. | Missing-binding behavior needs explicit regression coverage. | ✅          |

Editing `package.json` without a needed behavior change would only manufacture
a diff. Removing or demoting its ledger binding would discard a real contract.
Changing only the validator would contradict the shipped traceability contract.
None of those shortcuts is an approved resolution.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                          |
| -------------------- | ---------- | ------------------------------------------------------- |
| `spec-0017/TDD-0099` | ledger-row | Release capability classification cites `BR-0017-0069`. |
| `spec-0017/TDD-0100` | ledger-row | Missing-capability fallback cites `BR-0017-0069`.       |
| `spec-0017/TDD-0101` | ledger-row | Isolation and ordering cite `BR-0017-0069`.             |
| `spec-0017/TDD-0107` | ledger-row | The local command vector is the clause to separate.     |
| `spec-0017/TDD-0108` | ledger-row | Runtime suite execution cites `BR-0017-0069`.           |
| `spec-0017/TDD-0109` | ledger-row | Legacy fallback cites `BR-0017-0069`.                   |
| `spec-0017/TDD-0110` | ledger-row | Invalid release checks cite `BR-0017-0069`.             |

- Not blocked by this CR: other `spec-0017` rows whose test cases do not cite
  the release operation requirement; their work may continue. Full
  `spec-0017` TDD validation cannot pass while this binding is unresolved.
- Overlapping open CRs: none identified for these release operation rows.

## Impact scope

- Specs: `spec-0017`
- Plans: `.qfai/specs/spec-0017/10_Plan.md`
- Tests: `packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts`,
  `packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts`,
  `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`, traceability
  validator tests
- Contracts: traceability behavior documented in the `qfai-sdd` skill
- Schema: none
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0017/04_Business-Rules.md`,
  `.qfai/specs/spec-0017/06_Test-Cases.md`,
  `.qfai/specs/spec-0017/09_delta.md`,
  `.qfai/specs/spec-0017/10_Plan.md`,
  `.qfai/specs/spec-0017/16_Traceability-ledger.md`,
  `.qfai/specs/spec-0017/tdd/test-list.md`,
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`,
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`,
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/spec/16_Traceability-ledger.md`

## Decision needed from user

Approve option 3 for this pull request: split the unchanged local command-order
obligation and revise traceability validation so affected obligations require
complete bindings and proof when their implementation is unchanged?

## Approved actions (owner skill rerun plan)

1. Rerun `/qfai-sdd spec-0017` in `re-derive` mode. Split the business rule,
   preserve the command-order obligation and its `package.json` binding, update
   the affected test-case and ledger references, and record this CR in
   `09_delta.md`.
2. Update the shipped traceability guidance and validator together. Add tests
   for changed, unchanged-but-proved, missing, ambiguous and unavailable
   bindings. Do not suppress `QFAI-TRACE-001` by path or spec ID.
3. Reset to `todo`, recording this CR in `DR-ID`:
   `spec-0017/TDD-0099`, `spec-0017/TDD-0100`,
   `spec-0017/TDD-0101`, `spec-0017/TDD-0107`,
   `spec-0017/TDD-0108`, `spec-0017/TDD-0109`,
   `spec-0017/TDD-0110`. Retire no rows. Re-run affected test and evidence
   gates before advancing them.

## Resolution

Pending user decision.
