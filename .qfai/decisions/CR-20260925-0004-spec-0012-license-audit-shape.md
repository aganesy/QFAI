# Change Request

- ID: `CR-20260925-0004`
- Title: `The license-patch audit case excludes a persisted tier field`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-24T21:10:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (Codex interactive decision)`
- Approved at: `2026-09-24T21:13:46Z`
- Approved option: `2`
- Applied at: `-`
- Superseded by: `-`

## Context

`spec-0012/06_Test-Cases.md#TC-0012-0468` requires an audit row carrying exactly `{appliedAt, patchSha256, addedSources[]}` and no other fields. `AC-0012-0069` and `BR-0012-0057` also describe that three-field row. Current `packages/qfai/src/core/prototyping/licensePatchAudit.ts` accepts those required fields plus optional `addedLicenseTiers`; `licensePatchAudit.test.ts` explicitly accepts both 3-key and 4-key records. `TDD-0507` is `done` with a source-only selector `TC-0012-0468: license-patch audit-row shape lockdown`, but that selector selects zero tests. A replacement title alone cannot decide whether the fourth persisted field is legal.

## Proposed change

Adopt the selected audit-schema rule, update its TC/AC/BR chain, and rerun `TDD-0507` with boundary-specific executable tests. The sha256-of-patch-bytes requirement remains in every option that keeps the audit feature.

## Options (at least 3) and recommendation

| # | Option | Cost | Risk | Recommended |
| --- | --- | --- | --- | --- |
| 1 | Enforce exactly three keys; remove `addedLicenseTiers` from production and reject 4-key rows. | Code, compatibility, tests | Existing tier replay evidence can become unreadable or lossy. | |
| 2 | Keep three required keys and permit optional `addedLicenseTiers` with its validated map shape; restate the TC/AC/BR accordingly. | SDD changes and focused tests | Broadens the old exact-shape sentence; preserves shipped replay. | ✅ |
| 3 | Defer the schema decision; keep `TDD-0507` and this CR unresolved. | No immediate code change | Cross-spec closure and PR completion remain pending. | |

Recommendation 2 matches current persisted behavior while retaining the three required fields and their hash check. It is a product-contract change requiring the user's selection.

## Blocked downstream items

| Item | Kind | Why it depends on the artifact |
| --- | --- | --- |
| `spec-0012/TDD-0507` | ledger-row | Its TC forbids the fourth field that current code and tests accept, while its selector executes zero tests. |

- Not blocked by this CR: the other 49 spec-0012 rows in the selector audit; their own draft CRs govern them.
- Overlapping open CRs: none found for this row.

## Impact scope

- Specs: `spec-0012`
- Plans: `.qfai/specs/spec-0012/10_Plan.md` if it binds the audit-row shape
- Tests: `packages/qfai/tests/unit/core/prototyping/licensePatchAudit.test.ts`
- Contracts: inspect `.qfai/contracts/cli/qfai-prototyping.md` for a persisted audit-row declaration during owner rerun; do not modify a contract absent a separate scoped approval
- Schema: `packages/qfai/src/core/prototyping/licensePatchAudit.ts` under option 1, otherwise no production schema write expected
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`, `.qfai/specs/spec-0012/04_Business-Rules.md`, `.qfai/specs/spec-0012/05_Examples.md`, `.qfai/specs/spec-0012/06_Test-Cases.md`, `.qfai/specs/spec-0012/tdd/test-list.md`, `.qfai/specs/spec-0012/09_delta.md`, `.qfai/specs/spec-0012/10_Plan.md`

## Decision needed from user

Choose whether to enforce the old exact three-key audit row, permit a validated optional tier field, or defer the decision. Option 2 is recommended to preserve current tier replay.

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the selected option, approver and time in canonical `.qfai/decisions/CR-20260925-0004-spec-0012-license-audit-shape.md`; run `/qfai-sdd spec-0012` in `re-derive` mode. Stage 1 Triage is `UPDATE/MODIFY` for the affected case/acceptance/rule items. Phase 2b splits the audit-row shape boundaries (required keys, optional tier map, forbidden extras, patch hash) as independently observable tests. Phase 4 records the applied CR in `spec-0012/09_delta.md`; UI-bearing independent review gates apply.
2. Reset `spec-0012/TDD-0507` to `todo` with this CR in `DR-ID`. Its current Evidence cell is `landed CHG-005 Phase 4 (2026-05-26)`, which is historical only and does not prove the selected option. The existing test file remains; modify production only if option 1 is selected. New boundary rows start `todo`. `/qfai-implement` executes each with falsifiability, nonzero selection, GREEN and independent review. Option 3 keeps the row blocked by the open CR.

## Resolution

Pending user option selection and owner rerun.
