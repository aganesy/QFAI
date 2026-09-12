# ATDD Evidence: spec-0014

## Objective

Carry the proof for one of the five `Integration` rows of this spec's ledger
whose `Evidence` cells predate the pointer grammar. `TDD-0009`, `TDD-0018`,
`TDD-0035` and `TDD-0036` are not backfilled; the reasons are under Gaps.

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
this record — so the recorded row takes the falsifiability path, and its two
mutations are what that path asks for. A mutation earns the row only if it
falsifies the row's own obligation; one that reddens a neighbouring predicate
proves that predicate instead.

Every run is narrowed to the row's own `Selector`. A whole-file run can stay red
through a case belonging to another row, and then it says nothing about whether
this row's test discriminates.

`TDD-0035` carried a `Selector` written as a summary of the obligation rather
than a test's title. It was corrected to the title of the block that carries the
obligation, so the row names a case that can be run. Its `Evidence` cell is
unchanged; the reason is under Gaps.

## Work performed (what changed, where)

- `.qfai/specs/spec-0014/tdd/test-list.md` — the `Selector` of `TDD-0035`
  rewritten to the title it names, and the `Evidence` cell of `TDD-0019`
  rewritten as a pointer into this file. `TDD-0033` and
  `TDD-0034` are `unit`, so they belong to
  `.qfai/evidence/implement-spec-0014.md`, which records neither and says why.
  No `Status` moved.
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
| `TDD-0019` GREEN            | 1 of 5   | 1 passed            |
| `TDD-0019` falsifiability A | 1 of 5   | 1 failed            |
| `TDD-0019` falsifiability B | 1 of 5   | 1 failed            |
| Refactor verify           | all      | 126 passed          |
| Checkpoint                | all      | 9063 passed, exit 0 |

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
| `TDD-0019` | `TC-0014-0019` | integration | falsifiability | done   |

Eight files declare themselves inactive and did not run, each through
`describe.skip` carrying the marker `(test-first, pending /qfai-implement)`.
They hold thirty-five cases. The checkpoint below reports eighty-two skips, so
those eight account for thirty-five of them and the remaining forty-seven are
conditional skips — `it.skipIf` and `describe.skipIf` on the platform, on
`geteuid`, and on optional tooling. The run was taken on Windows, and eleven of
the forty-seven are the `process.platform === "win32"` cases in the `cli` and
`integration` projects, so a POSIX runner reaches a different total. The count
is read against the platform rather than as a constant.

The checkpoint needs `pnpm -C packages/qfai build` first.
`tests/integration/cliStartupCost.test.ts` reads `packages/qfai/dist/**` and is
written to fail rather than pass vacuously when no build exists.

Validate gate, over the ledger as this change leaves it:
`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0014` —
`counts: info=3 warning=0 error=0`, exit 0. The three are `QFAI-ATDD-117`,
`QFAI-ATDD-119` and `QFAI-PROFILE-001`. The command names the built entry point
rather than `npx qfai`, which resolves to the registry rather than to this
branch and so cannot re-check anything this branch changed.

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

- Round 1: Revision: 09f6f3b362ffc1ceac2a8fa6087d4029da4aed61
- Round 1: Satisfied-by: packages/qfai/src/core/types.ts, IssueCategory — the union the removed compatibility category is absent from.
- Round 1: Falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0019'
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1 of the file's 6 selected). The selector holds one case and it dies, on `expected 'import type { ScCoverage, TestFileSca…' not to contain '"compatibility"'`.
- Round 1: Falsifiability revision: working-tree+ed11467f59bfb62f58c90667eb64771c30f7fd1439478e8d28f9ea98ce26d39b
- Round 1: GREEN command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0019'
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1 of the file's 6 selected)
- Round 1: RED test hash: 4888866eb28f7cecdefa2a2eaabdfe39cf82c7b11d3f53fdca2ea227c1246d44
- Round 1: RED test manifest: packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts
- Round 1: Re-taken. The round was first observed at
  `649d8111147436408c90cbbe1b9f9b07e34da8cb`, and the manifest file has since
  gained a case — the merge with main brought a test that observes the canonical
  group arriving through verify, which is the same file this row's RED hash
  covers. A recorded hash over a file that has moved is evidence for a tree
  nobody has, so the mutation, the GREEN run and the hash were all taken again
  on this revision rather than the hash being re-typed. The selector still holds
  one case, the file now holds six, and the mutation still kills it on the same
  assertion.
- Round 1: Falsifiability revision abbreviation length: 9. The address above is
  reproducible only at that length. The procedure in
  `.qfai/assistant/skills/qfai-implement/references/evidence-revision.md` builds
  the serialized diff with `git diff HEAD --no-color --no-ext-diff --binary --`
  and passes no `--full-index`, so the `index` lines carry abbreviated object
  names and the address folds their length into itself. Nine is not a setting
  anyone chose here — no `core.abbrev` is configured, and git derives the length
  from how many objects the repository holds, so it rises as the repository
  grows. The address is therefore not reproducible by a later reader of the same
  tree, which is worse than depending on a setting: there is nothing to copy.
  The length is recorded because this address is already taken; a
  configuration-independent form is owed by that procedure rather than by this
  pack.

The mutation, in `packages/qfai/src/core/types.ts` line 5:

```diff
-export type IssueCategory = "canonical" | "change";
+export type IssueCategory = "canonical" | "change" | "compatibility";
```

That is the removed surface reappearing, which is the obligation stated as a
change. The case reads the source text rather than the type, which is why a
type-only edit is observable at run time: `expected 'import type { ScCoverage,
TestFileSca…' not to contain '"compatibility"'`.

The surface has two halves, and the mutation above reaches one. A second
mutation puts the legacy aggregator back on the package surface, in
`packages/qfai/src/core/validators/index.ts` line 71:

```diff
 export { runCanonicalUixValidators } from "./uix/canonical.js";
+export { runCanonicalUixValidators as runLegacyUixCompatibilityValidators } from "./uix/canonical.js";
```

The name is what the obligation forbids, whatever it points at, and the case
fails on it.

- Round 1: Second falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0019'
- Round 1: Second falsifiability result: Test Files 1 failed (1); Tests 1 failed (1 of the file's 5 selected), on the `runLegacyUixCompatibilityValidators` assertion.
- Round 1: Second falsifiability revision: working-tree+10267bf65a45b59090a24d478a7112887fc9c6d763c93e01d7486d0302090129

Two of the case's four assertions are falsified this way, and the other two are
not, for reasons worth recording rather than leaving to a reader to discover.
The `validators/legacy` path string would need the deleted module back to be
reintroduced honestly. The union-shape regular expression is unanchored at its
right end, so it still matches a union that has been widened, which is why the
first mutation passes it and fails the literal check below it instead.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts' --exclude 'tests/integration/dbSchemaDriftEngine.test.ts' --exclude 'tests/assets/mdschemaRouting.test.ts' --exclude 'tests/assets/mdschemaSchemas.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 533 passed (541); Tests 9063 passed (9145)
- Checkpoint verification revision: 09f6f3b362ffc1ceac2a8fa6087d4029da4aed61
- Checkpoint verification note: three suites are excluded beyond the two the
  command already excluded, and each is excluded for a dependency this checkout
  does not install rather than for anything about this branch.
  `tests/integration/dbSchemaDriftEngine.test.ts` refuses without an in-process
  Postgres engine, and `tests/assets/mdschemaRouting.test.ts` and
  `tests/assets/mdschemaSchemas.test.ts` need the `@jackchuka/mdschema`
  entry point. Run without the exclusions the same command reports twelve
  failures in those three files and nothing else, and all seven `test` slices of
  CI — which install the full toolchain — pass on this revision. CI is the run
  that decides the merge; this one is the local reproduction with the gap named.
  The eight files and eighty-two cases the run did not execute are the declared
  inactive suites and the conditional skips described above.
- Superseded checkpoint: the earlier record was `npx vitest run --project integration --project cli`
  at `649d8111147436408c90cbbe1b9f9b07e34da8cb` — Test Files 187 passed (191);
  Tests 2258 passed (2277). That revision is an ancestor of this commit rather
  than its merge base, and the `integration` project has gained cases since, so
  the run described a suite this commit no longer has.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0014.md`.
Totals: ✅ 13 / ⚠️ 60 / ❌ 71, with 3 not applicable, across 147 scored cells —
126 matrix depth cells (14 rows × 9 columns) and 21 business rule cells
(7 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                                     | Status (PASS/REVISE/PENDING) |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the fourteen obligations and write the matrix      | PASS                         |
| completion-reviewer | Audit every claim this file and the matrix make          | PENDING                      |

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

`TDD-0018` is not backfilled. Its obligation, `TC-0014-0018`, is that the
full-scan verify path depends on the canonical validators, and its selector
holds two cases that sit at opposite ends of that claim.

One drives `runCanonicalUixValidators` directly over a seeded pack and reads the
forbidden-file finding back. A mutation of the three-layer filter reddens it —
but calling the validators directly is not verify calling them, so what that
mutation falsifies is the validator's own predicate, not the dependency.

The other case carries the dependency, and carries it as
`expect(validateSrc).toContain("runCanonicalUixValidators")` over the text of
`validate.ts`. The import statement alone satisfies it, so a behavioural mutation
that removes every call survives it. Removing the import as well does redden the
case, and its `not.toMatch` half over the two legacy aggregator names is a real
oracle — but neither observes verify running the canonical validators, which is
what the row claims.

So the half that is falsifiable is not the obligation, and the half that is the
obligation is not falsifiable. The row needs a case that drives a verify run and
observes the canonical findings in its output.

`TDD-0035` is not backfilled. Its obligation names the command line and says so
twice: `TC-0014-0035` reads "run `qfai prototyping certify --scope saas-package`
against a SaaS-tenant project", and its type column calls it the CLI shape.

Both cases under the row's selector enter by calling `runPrototypingCertify`
with the scope as an argument. The seal itself is discriminated — one mutation
kills the `scope` field, a second drops a gate from the notes, and each leaves
the other intact — but the parsing and dispatch that turn the flag into that
argument are exercised by nothing that runs. The only case invoking the command
line sits in a block that is skipped. A parser that stopped forwarding the flag
would leave both cases green.

So the row proves the seal and not the entry path the obligation names. It needs
a case that drives the command line.

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

PASS for the one row recorded here. This is a per-row verdict, not a stage
verdict: the pack is not clean, and `TDD-0009`, `TDD-0018`, `TDD-0035` and
`TDD-0036` are listed rather than claimed.
