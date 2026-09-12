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
revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Each mutation was reverted
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
| `TDD-0036` GREEN            | 1 passed per entry    |
| `TDD-0036` falsifiability A | entry 1 fails, entry 2 passes |
| `TDD-0036` falsifiability B | entry 2 fails, entry 1 passes |
| Refactor verify           | 126 passed            |
| Checkpoint                | 2258 passed, exit 0   |

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

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/uix/threeLayer.ts, validateForbiddenLegacyFiles — the filter that reports a canonical sidecar matching any forbidden legacy pattern.
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 2 failed, 3 passed (5). This row's own case fails on the absent `UIX-VAL-3LAYER-FORBIDDEN-FILE` finding.
- Round 1: Falsifiability revision: working-tree+e8f19276e2c174fae97eaa94a78ab60dbdfb4b94ab010c33bddb558629445383
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 5 passed (5)
- Round 1: RED test hash: f59276acc52e9397953da7c5d7edccfbdeb45e1ca9822da516c17b75de8c2ce2
- Round 1: RED test manifest: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts

The mutation, in `packages/qfai/src/core/validators/uix/threeLayer.ts` line 166:

```diff
-    .filter((entry) => FORBIDDEN_LEGACY_PATTERNS.some((pattern) => pattern.test(entry)))
+    .filter((entry) => FORBIDDEN_LEGACY_PATTERNS.every((pattern) => pattern.test(entry)))
```

No single filename matches every forbidden pattern, so the filter returns
nothing. Both failures read `expected undefined to be defined`. The second
belongs to `TDD-0009`, which reads the same filter — recorded here because it
says what this mutation reaches, not only what it proves.

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

Validate gate: `npx qfai validate --profile atdd --fail-on error --spec 0014`
at the same revision — `counts: info=3 warning=0 error=0`, exit 0.

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
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 4 passed (5). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+d46540131695fb9d36bba2c09b20878d6ad69136a24ccd1f9672326b7e78e173
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 5 passed (5)
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
- Round 1: Falsifiability command: npx vitest run tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 1 passed (2). This row's own case fails on the absent `scope` field.
- Round 1: Falsifiability revision: working-tree+fedb7acf0fa804aaaf25cab36939479ca8521973762ca046b060d2a4ef5da720
- Round 1: GREEN command: npx vitest run tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed (2)
- Round 1: RED test hash: f30c3f411f42ae69e34e5a4c5b2ac752e656e258b40d2f42a3879c5f0a98448a
- Round 1: RED test manifest: packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts

The mutation, in `packages/qfai/src/cli/commands/prototypingCertify.ts` line
1200, deletes the line:

```diff
-    ...(isSaasPackageScope ? { scope: "saas-package" as const } : {}),
```

The case fails on `expected undefined to be 'saas-package'`. The file's other
case, which asserts a default invocation carries no `scope`, stays green — the
mutation removes the field in both directions, and only one direction is a
defect.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 187 passed (191); Tests 2258 passed (2277)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

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

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingCertify.ts — the refusal branch taken when the gates signal still names a missing gate.
- Round 1: Falsifiability command: npx vitest run tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts -t 'refuses to upgrade while named gates are still missing; stderr names them'
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 15 skipped (16), on `expected +0 not to be +0`. Mutation A. The second selector entry, run separately under the same mutation, passes: Tests 1 passed, 15 skipped (16).
- Round 1: Falsifiability revision: working-tree+c0b2657afd0bcc8a48b3375d05c60c47ce75d92eb09c057d11b9ce5ac74e41a1
- Round 1: GREEN command: npx vitest run tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts -t 'refuses to upgrade while named gates are still missing; stderr names them'
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1 of the file's 16 selected). The second selector entry, run separately: Tests 1 passed.
- Round 1: RED test hash: cba71be37bffe18df1121e93e5e70680e26306fbbd36f86789c70e1bc93773fd
- Round 1: RED test manifest: packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts

The `Selector` is a JSON array of two entries, so each is run on its own under
each mutation: an aggregate run shows one entry failing and leaves the other
unobserved. The four runs partition cleanly.

| Run | `refuses to upgrade …` | `upgrades the certificate …` |
| --- | --- | --- |
| Clean tree | 1 passed, 15 skipped | 1 passed, 15 skipped |
| Mutation A | **1 failed**, 15 skipped | 1 passed, 15 skipped |
| Mutation B | 1 passed, 15 skipped | **1 failed**, 15 skipped |

The obligation has two directions, so it carries two mutations. Each kills one
direction and leaves the other green, which is what makes the pair evidence
rather than one observation stated twice.

**Mutation A — the refusal direction.** In
`packages/qfai/src/cli/commands/prototypingCertify.ts` line 1603:

```diff
-  if (stillMissing.length > 0) {
+  if (stillMissing.length > 9999) {
```

The threshold is beyond any reachable count, so the command upgrades whatever
the signal says. Run over the whole file it kills six cases, every one that
expects a refusal.

**Mutation B — the acceptance direction.** In the same file, line 1656:

```diff
-  const upgraded = stripScopeMarkers(cert);
+  const upgraded = cert;
```

- Round 1: Second falsifiability command: npx vitest run tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts -t 'upgrades the certificate to full DONE when the previously-skipped gates now pass'
- Round 1: Second falsifiability result: Test Files 1 failed (1); Tests 1 failed, 15 skipped (16), on `expected 'saas-package' to be undefined`. Mutation B. The first selector entry, run separately under the same mutation, passes: Tests 1 passed, 15 skipped (16).
- Round 1: Second falsifiability revision: working-tree+d6d8998685c20b869dc0de4edacbe53a4beb5a2a97f04979c6d4a25d59f38b58

The upgrade branch never writes `scope: "full"` — it removes the field, through
`stripScopeMarkers()`, which rebuilds the certificate and omits `scope` and
`notes`. Returning the certificate unchanged therefore leaves it scope-limited
while reporting success. Run over the whole file it kills seven cases, every
acceptance-direction one; all eight refusal cases stay green, so the two
mutations partition the file and no case dies under both.

One acceptance-path case survives mutation B: `prefers the canonical path when
BOTH canonical and legacy signals exist`. It drives a successful upgrade but
asserts only the exit code and which signal path won, never reading the sealed
certificate back, so it would not notice an upgrade that silently left the
certificate scope-limited.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 187 passed (191); Tests 2258 passed (2277)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0014.md`.
Totals: ✅ 24 / ⚠️ 51 / ❌ 69, with 3 not applicable, across 147 scored cells —
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

## Final status

PASS for the four rows recorded here. This is a per-row verdict, not a stage
verdict: the pack is not clean, and `TDD-0009` is listed rather than claimed.
