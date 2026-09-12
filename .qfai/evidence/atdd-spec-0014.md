# ATDD Evidence: spec-0014

## Objective

Carry the proof for three of the five `Integration` rows of this spec's ledger
whose `Evidence` cells predate the pointer grammar. `TDD-0009` and `TDD-0036`
are not backfilled; the reasons are under Gaps.

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
this record — so all three take the falsifiability path, and the mutation
recorded per row is what that path asks for.

Every run is narrowed to the row's own `Selector`. A whole-file run can stay red
through a case belonging to another row, and then it says nothing about whether
this row's test discriminates.

`TDD-0035` carried a `Selector` written as a summary of the obligation rather
than a test's title. It was corrected to the title of the block that carries the
obligation, chosen by what it asserts.

## Work performed (what changed, where)

- `.qfai/specs/spec-0014/tdd/test-list.md` — the `Selector` of `TDD-0035`
  rewritten to the title it names, and the `Evidence` cells of `TDD-0018`,
  `TDD-0019` and `TDD-0035` rewritten as pointers into this file. `TDD-0033` and
  `TDD-0034` are `unit`, so their proof is in
  `.qfai/evidence/implement-spec-0014.md`. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

Each row's two runs select that row's `Selector` and nothing else, so the counts
below are over the selected cases, not over the file.

| Run                       | Selected | Result              |
| ------------------------- | -------- | ------------------- |
| `TDD-0018` GREEN          | 2 of 5   | 2 passed            |
| `TDD-0018` falsifiability | 2 of 5   | 1 failed, 1 passed  |
| `TDD-0019` GREEN          | 1 of 5   | 1 passed            |
| `TDD-0019` falsifiability | 1 of 5   | 1 failed            |
| `TDD-0035` GREEN          | 2 of 2   | 2 passed            |
| `TDD-0035` falsifiability | 2 of 2   | 1 failed, 1 passed  |
| Refactor verify           | all      | 126 passed          |
| Checkpoint                | all      | 2258 passed, exit 0 |

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

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/uix/threeLayer.ts, validateForbiddenLegacyFiles — the filter that reports a canonical sidecar matching any forbidden legacy pattern.
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0018'
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 1 passed (2 of the file's 5 selected), on `expected undefined to be defined` — the absent `UIX-VAL-3LAYER-FORBIDDEN-FILE` finding.
- Round 1: Falsifiability revision: working-tree+e8f19276e2c174fae97eaa94a78ab60dbdfb4b94ab010c33bddb558629445383
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0018'
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed (2 of the file's 5 selected)
- Round 1: RED test hash: f59276acc52e9397953da7c5d7edccfbdeb45e1ca9822da516c17b75de8c2ce2
- Round 1: RED test manifest: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts

The mutation, in `packages/qfai/src/core/validators/uix/threeLayer.ts` line 166:

```diff
-    .filter((entry) => FORBIDDEN_LEGACY_PATTERNS.some((pattern) => pattern.test(entry)))
+    .filter((entry) => FORBIDDEN_LEGACY_PATTERNS.every((pattern) => pattern.test(entry)))
```

No single filename matches every forbidden pattern, so the filter returns
nothing.

The selector holds two cases. The one that dies is the one that runs the
validators and reads the finding back; the other asserts that `validate.ts`
imports and invokes them, which the mutation leaves true. Run over the whole
file the mutation also kills a `TDD-0009` case reading the same filter, which is
why the command names the selector.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 187 passed (191); Tests 2258 passed (2277)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

Four files and nineteen cases in those projects declare themselves inactive and
did not run, each through `describe.skip` carrying the marker
`(test-first, pending /qfai-implement)`.

The checkpoint needs `pnpm -C packages/qfai build` first.
`tests/integration/cliStartupCost.test.ts` reads `packages/qfai/dist/**` and is
written to fail rather than pass vacuously when no build exists.

Validate gate, over the ledger as this change leaves it:
`npx qfai validate --profile atdd --fail-on error --spec 0014` —
`counts: info=4 warning=0 error=0`, exit 0.

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

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/types.ts, IssueCategory — the union the removed compatibility category is absent from.
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0019'
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1 of the file's 5 selected). The selector holds one case and it dies.
- Round 1: Falsifiability revision: working-tree+d46540131695fb9d36bba2c09b20878d6ad69136a24ccd1f9672326b7e78e173
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0019'
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1 of the file's 5 selected)
- Round 1: RED test hash: f59276acc52e9397953da7c5d7edccfbdeb45e1ca9822da516c17b75de8c2ce2
- Round 1: RED test manifest: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts

The mutation, in `packages/qfai/src/core/types.ts` line 5:

```diff
-export type IssueCategory = "canonical" | "change";
+export type IssueCategory = "canonical" | "change" | "compatibility";
```

That is the removed surface reappearing, which is the obligation stated as a
change. The case reads the source text rather than the type, which is why a
type-only edit is observable at run time: `expected 'import type { ScCoverage,
TestFileSca…' not to contain '"compatibility"'`.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 187 passed (191); Tests 2258 passed (2277)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

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

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingCertify.ts — the certificate body's conditional `scope` field.
- Round 1: Falsifiability command: npx vitest run tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts -t 'certify --scope saas-package seals a scope-limited certificate'
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 1 passed (2 of the file's 2 selected), on `expected undefined to be 'saas-package'`.
- Round 1: Falsifiability revision: working-tree+fedb7acf0fa804aaaf25cab36939479ca8521973762ca046b060d2a4ef5da720
- Round 1: GREEN command: npx vitest run tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts -t 'certify --scope saas-package seals a scope-limited certificate'
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed (2 of the file's 2 selected)
- Round 1: RED test hash: f30c3f411f42ae69e34e5a4c5b2ac752e656e258b40d2f42a3879c5f0a98448a
- Round 1: RED test manifest: packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts

The mutation, in `packages/qfai/src/cli/commands/prototypingCertify.ts` line
1200, deletes the line:

```diff
-    ...(isSaasPackageScope ? { scope: "saas-package" as const } : {}),
```

The selector is the block holding the file's two cases, which observe the same
boundary from both sides. The case asserting the scoped invocation writes
`scope` dies. Its partner, asserting a default invocation writes no `scope`,
stays green: the mutation removes the field in both directions, and only one
direction is a defect.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 187 passed (191); Tests 2258 passed (2277)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0014.md`.
Totals: ✅ 16 / ⚠️ 59 / ❌ 69, with 3 not applicable, across 147 scored cells —
126 matrix depth cells (14 rows × 9 columns) and 21 business rule cells
(7 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                                 | Status (PASS/REVISE/PENDING) |
| ------------------- | ---------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the fourteen obligations and write the matrix  | PASS                         |

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

The behaviour exists; the coverage does not. `/qfai-verify` is a shipped skill
rather than a CLI command, and
`packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md` carries
the gate in two clauses: under `Stage Minimum Roles (MUST)`, "Reviewer is
delegated independently and returns only `PASS` or `REVISE`"; under
`Reviewer Gate (MUST)`, "Do not declare DONE or handoff until all routed
blocking reviewers return `PASS`".

`validateReviewArtifacts` is wired into the full-scan verify profile, but reads
a review pack's `PASS` / `FAIL` / `NA` roster and never a `REVISE` verdict. No
case in the package reads either clause. So the row needs a test over the
shipped skill, not a decision about the obligation.

`TDD-0036` is not backfilled either, for a different reason. Its obligation,
`TC-0014-0036`, holds two boundaries: `--upgrade-scope full` is refused while a
gate is still missing, and accepted once every gate passes. Two cases in
`prototypingCertify.upgradeScope.test.ts` carry them, and each falls to its own
mutation while leaving the other green — so the two are independently
observable, not one boundary seen from two angles.

`references/selector-granularity.md` puts one independently observable boundary
on a row, and sends a matrix-shaped obligation to `/qfai-sdd` Phase 2b: the row
is split there, into two rows carrying the same `TC-Refs`, never in place at
evidence time. A `Selector` naming both cases would pack both boundaries behind
one identifier, which is the shape that rule forbids. The row therefore stays as
it stands and needs a Change Request that decomposes it.

## Final status

PASS for the three rows recorded here. This is a per-row verdict, not a stage
verdict: the pack is not clean, and `TDD-0009` and `TDD-0036` are listed rather
than claimed.
