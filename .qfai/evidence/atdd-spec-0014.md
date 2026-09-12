# ATDD Evidence: spec-0014

## Objective

Carry the proof for the four `Integration` rows of this spec's ledger whose
`Evidence` cells predate the pointer grammar. A fifth `Integration` row,
`TDD-0009`, is not backfilled; the reason is under Gaps.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0014/06_Test-Cases.md`
- `.qfai/specs/spec-0014/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0014/tdd/test-list.md`
- `packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts`
- `packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts`
- `packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts`

## Decisions made (with rationale)

Each row declares `Run output retained: no`. The cells held a verdict with no
command and no output, so the reviewer verdicts and pack seals a completed entry
normally carries cannot be recorded and are not invented.

No row can produce an observed RED — every implementation shipped long before
this record — so all four take the falsifiability path, and the mutation
recorded per row is what that path asks for.

Two rows carried a `Selector` written as a summary of the obligation rather than
a test's title. Both were corrected to the title of the test that carries the
obligation, chosen by what it asserts. `TDD-0036`'s obligation has two
directions — refused while a gate is missing, accepted once the gates pass — so
its `Selector` names both cases in the list form the column admits.

## Work performed (what changed, where)

- `.qfai/specs/spec-0014/tdd/test-list.md` — the `Selector` of `TDD-0035` and
  `TDD-0036` rewritten to the titles they name, and the `Evidence` cells of
  `TDD-0018`, `TDD-0019`, `TDD-0035` and `TDD-0036` rewritten as pointers into
  this file. `TDD-0033` and `TDD-0034` are `unit`, so their proof is in
  `.qfai/evidence/implement-spec-0014.md`. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `be74e075f00e815c888e3808e75bfde5e3cb952f`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Result                |
| ------------------------- | --------------------- |
| `TDD-0018` GREEN          | 5 passed              |
| `TDD-0018` falsifiability | 2 failed, 3 passed    |
| `TDD-0019` GREEN          | 5 passed              |
| `TDD-0019` falsifiability | 1 failed, 4 passed    |
| `TDD-0035` GREEN          | 2 passed              |
| `TDD-0035` falsifiability | 1 failed, 1 passed    |
| `TDD-0036` GREEN          | 16 passed             |
| `TDD-0036` falsifiability | 6 failed, 10 passed   |
| Refactor verify           | 126 passed            |
| Checkpoint                | 2263 passed           |

## Test volume estimate

Not applicable. This run authored no test; it records proof for rows whose tests
already exist.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Ledger rows advanced

No row changed status. Every row below was already `done`; this run supplies the
evidence its cell points at.

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0018` | `TC-0014-0018` | integration | falsifiability | done   |
| `TDD-0019` | `TC-0014-0019` | integration | falsifiability | done   |
| `TDD-0035` | `TC-0014-0035` | integration | falsifiability | done   |
| `TDD-0036` | `TC-0014-0036` | integration | falsifiability | done   |

### TDD-0018

- TDD-ID: TDD-0018
- Layer: integration
- Test file: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts
- Selector: TC-0014-0018
- TC-ref: TC-0014-0018
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Round 1: Satisfied-by: packages/qfai/src/core/validators/uix/threeLayer.ts, validateForbiddenLegacyFiles — the filter that reports a canonical sidecar matching any forbidden legacy pattern.
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 2 failed, 3 passed (5). This row's own case fails on the absent `UIX-VAL-3LAYER-FORBIDDEN-FILE` finding.
- Round 1: Falsifiability revision: working-tree+7c7f15c70f3fbe5ca54b0ff0f674ec64255986b18305780eec3b104bcb9c4fe0
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 5 passed (5)
- Round 1: RED test hash: f59276acc52e9397953da7c5d7edccfbdeb45e1ca9822da516c17b75de8c2ce2
- Round 1: RED test manifest: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts

The mutation changed the forbidden-pattern filter from "matches any pattern" to
"matches every pattern", which no single filename can. The second failing case
belongs to `TDD-0009`, which reads the same filter — recorded here because it
says what this mutation reaches, not only what it proves.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 188 passed (192); Tests 2263 passed (2282)
- Checkpoint verification revision: be74e075f00e815c888e3808e75bfde5e3cb952f

Four files and nineteen cases in those projects declare themselves inactive and
did not run.

### TDD-0019

- TDD-ID: TDD-0019
- Layer: integration
- Test file: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts
- Selector: TC-0014-0019
- TC-ref: TC-0014-0019
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Round 1: Satisfied-by: packages/qfai/src/core/types.ts, IssueCategory — the union the removed compatibility category is absent from.
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 4 passed (5). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+9b841d7fdfa486b843ecbfb2666b81dca6d471eceec659902c9f36b108472ac2
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 5 passed (5)
- Round 1: RED test hash: f59276acc52e9397953da7c5d7edccfbdeb45e1ca9822da516c17b75de8c2ce2
- Round 1: RED test manifest: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts

The mutation re-added `"compatibility"` to the category union. That is the
removed surface reappearing, which is the obligation stated as a change.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 188 passed (192); Tests 2263 passed (2282)
- Checkpoint verification revision: be74e075f00e815c888e3808e75bfde5e3cb952f

### TDD-0035

- TDD-ID: TDD-0035
- Layer: integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts
- Selector: certify --scope saas-package seals a scope-limited certificate
- TC-ref: TC-0014-0035
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingCertify.ts — the certificate body's conditional `scope` field.
- Round 1: Falsifiability command: npx vitest run tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 1 passed (2). This row's own case fails on the absent `scope` field.
- Round 1: Falsifiability revision: working-tree+f272662388b8a461b20ab548d3a9bb78717e341c3af6a9dcf0b94ca51ccbe7d6
- Round 1: GREEN command: npx vitest run tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed (2)
- Round 1: RED test hash: f30c3f411f42ae69e34e5a4c5b2ac752e656e258b40d2f42a3879c5f0a98448a
- Round 1: RED test manifest: packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts

The mutation dropped the `scope` field from the sealed certificate. The file's
other case, which asserts a default invocation carries no `scope`, stays green —
the mutation removes the field in both directions, and only one direction is a
defect.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 188 passed (192); Tests 2263 passed (2282)
- Checkpoint verification revision: be74e075f00e815c888e3808e75bfde5e3cb952f

### TDD-0036

- TDD-ID: TDD-0036
- Layer: integration
- Test file: packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Selector: ["refuses to upgrade while named gates are still missing; stderr names them", "upgrades the certificate to full DONE when the previously-skipped gates now pass"]
- TC-ref: TC-0014-0036
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingCertify.ts — the refusal branch taken when the gates signal still names a missing gate.
- Round 1: Falsifiability command: npx vitest run tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 6 failed, 10 passed (16). Every refusal case fails, including this row's own.
- Round 1: Falsifiability revision: working-tree+2f640f1876df7dd0b3fb7a5dc1c454ff725dbecacfdf3d758b5372c2177acedf
- Round 1: GREEN command: npx vitest run tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 16 passed (16)
- Round 1: RED test hash: cba71be37bffe18df1121e93e5e70680e26306fbbd36f86789c70e1bc93773fd
- Round 1: RED test manifest: packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts

The mutation raised the refusal threshold beyond any reachable count, so the
command upgrades whatever the signal says. Six cases die: every one that
expects a refusal. The acceptance case stays green, which is correct — the
mutation only removes refusals.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 188 passed (192); Tests 2263 passed (2282)
- Checkpoint verification revision: be74e075f00e815c888e3808e75bfde5e3cb952f

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0014.md`.
Totals: ✅ 24 / ⚠️ 33 / ❌ 58, with 3 not applicable, across 118 scored cells —
81 matrix depth cells, 9 matrix status cells, 21 business rule cells and 7
business rule status cells.

## Work Orders Summary

| Role                | Task                                            | Status (PASS/REVISE/PENDING) |
| ------------------- | ----------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the nine obligations and write the matrix | PASS                         |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

`TDD-0009` is not backfilled. Its obligation, `TC-0014-0009`, asks that feeding
`/qfai-verify` a `REVISE` review artifact blocks completion, and its parent
`AC-0014-0002` reads "Verify inspects reviewer artifacts and blocks on
`REVISE`". The test the row names asserts something else: that a legacy
strategy-style filename and legacy evaluation content are rejected with
migration guidance.

The row's `Selector` is the bare test-case id, and the test's `describe` name
begins with the same string, so the selector resolves. Resolution is not
evidence of discharge, and no lane reports the difference.

Nothing found so far discharges the obligation. There is no verify command under
`packages/qfai/src/cli/commands/`, and `src/**` mentions `REVISE` in three
files — the ledger's own reviewer-verdict handling among them, which is a
different layer from a verify run inspecting review artifacts. What the row
should name is a decision about the obligation, not an evidence run.

## Final status

PASS for the four rows recorded here. The pack is not clean; `TDD-0009` is
listed rather than claimed.
