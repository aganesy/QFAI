# ATDD Evidence: spec-0014

## Objective

Carry the proof for one of the five `Integration` rows of this spec's ledger
whose `Evidence` cells predate the pointer grammar. `TDD-0009`, `TDD-0018`,
`TDD-0035` and `TDD-0036` are not backfilled; the reasons are under Gaps.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0014/01_Spec.md`
- `.qfai/specs/spec-0014/02_User-stories.md`
- `.qfai/specs/spec-0014/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0014/04_Business-Rules.md`
- `.qfai/specs/spec-0014/05_Examples.md`
- `.qfai/specs/spec-0014/06_Test-Cases.md`
- `.qfai/specs/spec-0014/tdd/test-list.md`
- `qfai.config.yaml` — for the surface resolution the `US-*` obligations are scoped by
- `.qfai/contracts/api/` and `.qfai/contracts/db/` — scanned and empty, which is
  why no `CON-API-*` or `CON-DB-*` is owed and the volume estimate's API row is
  zero rather than absent
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

- `.qfai/specs/spec-0014/tdd/test-list.md` — **unchanged**. Two edits were
  drafted and both were withdrawn: rewriting `TDD-0035`'s `Selector` to the
  title it names, and turning `TDD-0019`'s `Evidence` cell into a pointer into
  this file. Neither is this stage's to make — the cells belong to rows a
  completed run recorded, and a pointer written here would have carried an
  automated gate past an artifact that records `ESCALATED`. The reasons are
  under Gaps. `TDD-0033` and `TDD-0034` are `unit` and belong to
  `.qfai/evidence/implement-spec-0014.md`, which records neither and says why.
  No `Status` moved and no cell was written.
- This file created.

## Commands executed + key outputs

Every `vitest` command ran from `packages/qfai`; the validate gate ran from the
repository root, which is where its `node packages/qfai/dist/cli/index.mjs` path
resolves. From `packages/qfai` that same string names a `packages/qfai` inside
`packages/qfai` and does not exist. The clean-tree runs were taken at
revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

Each row's two runs select that row's `Selector` and nothing else, so the counts
below are over the selected cases, not over the file.

| Run                         | Selected | Result                    |
| --------------------------- | -------- | ------------------------- |
| `TDD-0019` GREEN            | 1 of 6   | 1 passed                  |
| `TDD-0019` falsifiability A | 1 of 6   | 1 failed                  |
| `TDD-0019` falsifiability B | 1 of 6   | 1 failed                  |
| `TDD-0019` checkpoint item  | all 6    | 6 passed                  |
| Refactor verify             | all      | 127 passed                |
| Checkpoint                  | all      | seven of seven CI slices  |

## Test volume estimate

The estimate is owed by the spec's obligations rather than by what this run
authored, so "no test was authored" does not make it inapplicable.

| Layer       | Raw count | Signal | Evidence                                           | Notes                                                        |
| ----------- | --------: | -----: | -------------------------------------------------- | ------------------------------------------------------------ |
| E2E         |         5 |     50 | `US-0014-0013`, `-0014`, `-0018`, `-0019`, `-0020` | five required stories, none deferred. `E2E_s` 50 is above its 5–25 band: this spec declares as many stories as integration cases, and its four remaining test cases are `unit`, which this skill does not own. Distribution accepted and recorded |
| API         |         0 |      0 | no `CON-API-*` referenced                          | nothing owed                                                  |
| Integration |         5 |     50 | `TC-0014-0009`, `-0018`, `-0019`, `-0035`, `-0036` | the five `TC-*` whose `Level` is `integration`. `-0028`, `-0029`, `-0033` and `-0034` are `unit` and are excluded from `#TC`; no `CON-DB-*` is referenced, so nothing is added to it |

`total` is 10, so both non-zero shares are 50.

`Signal` is a share of the obligation total, not a count of what is covered. How
many of these obligations have a case that runs is the Coverage Depth Matrix's
question, and its answer here is that no story does — `US-0014-0020` has an
annotated file under `tests/e2e/**` whose cases sit inside a `describe.skip`
marked test-first — and that seven of the nine declared test cases carry a row
naming a file that exists and runs — every `done` row does. The two that do not
are `TDD-0028` and `TDD-0029`, both at `exception`, whose
`packages/qfai/tests/validators/prototypingDesignSystem.test.ts` is not in the
tree. This run authored no test and moved no `Status`.

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
They hold thirty-five cases, which is the platform-independent part of every
skip count below.

The rest is conditional — `it.skipIf` and `describe.skipIf` on the platform, on
`geteuid`, and on optional tooling — so it is read against the runner rather
than as a constant, and the two runs recorded here disagree because they ran on
different ones.

| Run                                                      | Skips | Conditional |
| -------------------------------------------------------- | ----- | ----------- |
| The checkpoint, seven `ubuntu-latest` jobs               | 82    | 47          |
| One unfiltered `npx vitest run` here, on Windows         | 92    | 57          |

The ten between them are platform gates the POSIX runner takes and this one does
not: `cli` and `integration` hold eleven `process.platform === "win32"`
declarations between them — ten `it.skipIf` and one `describe.skipIf` over a
single case — and the difference is read off the two totals rather than matched
to them one by one, because a case may sit behind more than one gate.

Attributing the checkpoint's count to Windows was the error: `ci.yml` runs that
matrix on `ubuntu-latest`, so 82 is the POSIX figure and 92 is this machine's.

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
- Round 1: Satisfied-by: packages/qfai/src/core/types.ts, IssueCategory — the union the removed compatibility category is absent from; and packages/qfai/src/core/validators/index.ts, its export list — the surface the removed `runLegacyUixCompatibilityValidators` aggregator is absent from. The row obliges the namespace to stay gone, and the two mutations reach it through the two places it could return.
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
mutation puts the legacy aggregator name back in the validators barrel, in
`packages/qfai/src/core/validators/index.ts` line 71:

```diff
 export { runCanonicalUixValidators } from "./uix/canonical.js";
+export { runCanonicalUixValidators as runLegacyUixCompatibilityValidators } from "./uix/canonical.js";
```

The name is what the obligation forbids, whatever it points at, and the case
fails on it.

**The barrel is not the package entrypoint**, and the row's assertion reads the
barrel's source text rather than the exported surface: `src/core/index.ts`
re-exports validator modules selectively and does not re-export this file, so a
name added here would not reach a consumer. What the mutation establishes is
that the case discriminates the text it reads, which is what an oracle proof
owes. Whether the obligation's own subject — the name being absent from what the
package exposes — is asserted anywhere is a coverage question, and the matrix
scores it: this row's `Oracle strength` is `⚠️` for reading source text rather
than the surface.

- Round 1: Second falsifiability command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts -t 'TC-0014-0019'
- Round 1: Second falsifiability result: Test Files 1 failed (1); Tests 1 failed (1 of the file's 6 selected), on the `runLegacyUixCompatibilityValidators` assertion.
- Round 1: Second falsifiability revision: working-tree+0010eec58d8657672a11b6c886981f18d9897d38a885d12489fbb94f3f27c010
- Round 1: Second falsifiability re-taken. The previous address was computed at
  `649d8111147436408c90cbbe1b9f9b07e34da8cb`, where this round was first
  observed, and stayed there when the round moved to
  `09f6f3b362ffc1ceac2a8fa6087d4029da4aed61`. A working-tree address folds its
  own `HEAD` into itself, so the recorded value addressed a tree the round no
  longer names — the same defect the first mutation was re-taken for, in the
  half that was left behind. The mutation was applied again on the round's
  revision and the address recomputed there. The file holds six cases rather
  than five, and the mutation still kills the selected one on the same
  assertion. The nine-character abbreviation the note above records governs this
  address too.

Two of the case's four assertions are falsified this way, and the other two are
not, for reasons worth recording rather than leaving to a reader to discover.
The `validators/legacy` path string would need the deleted module back to be
reintroduced honestly. The union-shape regular expression is unanchored at its
right end, so it still matches a union that has been widened, which is why the
first mutation passes it and fails the literal check below it instead.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 127 passed (127)
- Refactor verify revision: db8cd210a3b71ffd82591dda52ed250af76d812d
- Checkpoint item test command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts --reporter=verbose
- Checkpoint item test result: Test Files 1 passed (1); Tests 6 passed (6). The verbose output names the row's `Selector` entry among the tests it ran — `TC-0014-0019: removed compatibility surface > package surface exposes no legacy namespace or compatibility category` — which is what the per-item step asks of a file-scoped run.
- Checkpoint item test revision: db8cd210a3b71ffd82591dda52ed250af76d812d
- Checkpoint verification command: pnpm -C packages/qfai test:core && pnpm -C packages/qfai test:validators && pnpm -C packages/qfai test:integration && pnpm -C packages/qfai test:e2e && pnpm -C packages/qfai test:cli && pnpm -C packages/qfai test:unit && pnpm -C packages/qfai test:scripts
- Checkpoint verification result: PASS — seven of seven green, nothing filtered out; the seven slices together cover every project `vitest.workspace.ts` declares
- Checkpoint verification revision: 879079199019a43767e893f4366056e493d8a798
- Checkpoint verification note: the seven commands ran as the seven parallel jobs
  of the `test` matrix at
  https://github.com/aganesy/QFAI/actions/runs/34698239422, and their conclusions
  were read back from the check runs rather than inferred from a green badge.
  **The revision above is the tree those jobs checked out**, which is not this
  branch head: `ci.yml` restricts `push` runs to the default branch, so the run
  is a `pull_request` one and its unqualified checkout takes the generated merge
  of this branch with the base tip. The checkout step names it —
  `Merge db8cd210a3b71ffd82591dda52ed250af76d812d into a07c51782d527c98708d9a326e0c623a12a6e5d8` —
  and the object is fetchable, so the result is reproducible from what is
  recorded. Its second parent `db8cd210` is the branch head the observation
  belongs to, and its first is the base tip at the time; the item-level test
  revision above is that branch head, because that run was taken here.
  That is the environment in which the set can be run whole. Run here as one
  unfiltered `npx vitest run`, the same suite reports Test Files 1 failed, 697
  passed, 8 skipped (706) and Tests 1 failed, 11537 passed, 92 skipped (11630),
  exiting 1. The one failure is in `tests/scripts/ownWorkflowTopology.test.ts`,
  whose case writes the release workflow's own association gate to a temporary
  script and runs it under `bash`. That gate calls `jq`, which this checkout
  does not have and the runner image does, so the assertion reads a gate that
  declined for want of a tool rather than a gate that ran and refused. It is
  unrelated to this spec, and that a test depends on an undeclared external tool
  and fails with an assertion message naming something else is recorded as a
  finding of its own.
- Revision reachability: every revision this entry names is a commit of the
  branch the observations were taken on. This repository squash-merges, so none
  of them is an ancestor of the commit that lands on the default branch, and a
  fresh clone of that branch alone cannot resolve them. Nothing a run can do
  changes it: the merge commit does not exist while the observation is being
  made, and the procedure records `git rev-parse HEAD` at that moment. It is a
  property of the address form rather than of this record, and it holds for
  every evidence entry the repository has merged.
- Superseded checkpoint: two earlier records. The first was
  `npx vitest run --project integration --project cli` at
  `649d8111147436408c90cbbe1b9f9b07e34da8cb`, whose revision is an ancestor of
  this commit rather than its merge base and whose `integration` project has
  gained cases since. The second selected four of the seven projects and
  excluded five files by name at
  `915f4d5b5355e6bdc87398a031de681464399292`; every `unit`, `validators` and
  `scripts` test was outside it, so it was not the whole-repository set the
  per-spec step asks for whatever its exclusions were justified by.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0014.md`.
Totals: ✅ 14 / ⚠️ 60 / ❌ 70, with 3 not applicable, across 147 scored cells —
126 matrix depth cells (14 rows × 9 columns) and 21 business rule cells
(7 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                                          | Status (PASS/REVISE/PENDING) |
| ------------------- | -------------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the fourteen obligations and write the matrix           | PASS                         |
| devops-ci-engineer  | Run the refactor verification, the per-item file-scoped test and the unfiltered suite, and report the counts | PASS |
| completion-reviewer | Audit every claim this file and the matrix make               | REVISE                       |

**Four mandatory roles have no order here, and that is part of the escalation.**
`agent-routing.yml` requires `qa-strategist` in coverage, `delivery-planner` and
`acceptance-test-engineer` in RED, and `qa-gatekeeper` in review. This run
dispatched none of them: it authored no test and moved no `Status`, so the work
those roles own did not happen — and a work order recorded for work nobody
performed is the invented provenance the summary exists to prevent. The shared
fields the template asks for — agent instance, inputs, outputs — are absent for
the same reason on the rows that are here: the two that ran are recorded with
what they returned, and nothing is written for the rest. A stage missing four
mandatory roles cannot pass its own gate, which is what `ESCALATED` says.

The `devops-ci-engineer` order returned the three command blocks with their
summary lines and exit codes, and nothing else: it wrote no file and changed no
status. Its output is what the `Refactor verify`, `Checkpoint item test` and
`Checkpoint verification` fields above record. The mutation runs and the address
recomputation are not in it — a mutation dirties the tree the suite would be
measured against, so they were taken separately and before it.

## Reviewer response

**This response is short of the contract, and the missing fields are named
rather than written.** `shared-skill-delegation-baseline.md#reviewer-response-template`
requires a reviewed revision, an audited evidence hash, an independence
declaration, traced findings, required fixes and the evidence checked, one block
per round. This record carries a summary across the rounds and none of the
first three. They cannot be supplied now: the rounds were taken against trees
this branch has moved past, an audited hash recomputed today would address a
different subject than the one reviewed, and an independence declaration is the
reviewer's to make and not the author's. Writing any of them would be the
invented provenance the template exists to prevent. The stage is `ESCALATED`
partly for this: what a user is being asked to decide includes a review record
that does not meet its own contract.

- Role: completion-reviewer
- Status: REVISE, budget spent
- Review series: .qfai/evidence/atdd-spec-0014.md + completion-reviewer
- Rounds: 1 `REVISE`, 2 `REVISE`, 2b `ESCALATE`
- Subject: every claim this file and the Coverage Depth Matrix make
- What each round found, and what it cost:
  - Round 1 reproduced the recorded row exactly — both falsifiability mutations,
    the GREEN run and the refactor-verify run, including the quoted assertion
    message — and verified the matrix cell by cell. It blocked on three
    statements the repository does not support: a fifth totals table left behind
    by a rescore, an absolute in the `TDD-0018` withdrawal that experiment
    falsifies, and a validate gate recorded at a count the run does not produce
    under a command that cannot resolve to this branch.
  - Round 2 verified those three and found a sixth totals site the same rescore
    had left behind.
  - Round 2b verified that one and escalated on a paragraph interpreting the
    superseded checkpoint as though it described the new one.
- Every finding above is repaired. The budget is spent as
  `.qfai/assistant/constitution/review-convergence.md` defines it — two rounds
  plus one verification review — so no further round may run, and whether this
  pack reaches DONE on the repaired record is the user's decision rather than a
  reviewer's.
- Residual risk the reviews name and this record does not close: the census in
  the matrix is held by review alone. `QFAI-ATDD-133` checks that a totals
  section exists and never compares a number, and four rescores have now each
  left one figure behind. Until something reads the numbers, the next rescore
  will do it again.

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

**That case now exists, and it arrived from main rather than from this run.**
`verifySemanticsSpec0014.test.ts` holds `a verify run surfaces a canonical group
finding`, which calls `validateProject` under the `verify` profile and asserts
the forbidden-sidecar finding in its output; its own comment names the
falsifying change as deleting the two `runCanonicalUixValidators` call sites
while keeping the import — the mutation this withdrawal reports as surviving.
So the gap is closed and `TDD-0018` is backfillable, and the row's existing
`Selector` already selects the case: the selector is the bare test-case id, the
case sits inside `describe("TC-0014-0018: canonical UIX in verify path")`, and
this record states three paragraphs earlier that a bare id resolves against a
`describe` name. No re-pointing is owed. An earlier reading of this said the
case was not the one the selector names, and that was wrong.

This run still does not backfill it, for a reason that has nothing to do with
the selector: a backfill is a RED observation, a GREEN, a refactor verification
and a checkpoint against **that** row, and this run's subject is `TDD-0019`.
Recording another row's verdict from a run taken for this one is the shape of
claim this whole record exists to remove.

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

**The ledger is not written by this record.** `TDD-0019`'s `Evidence` cell keeps
the prose it had. A conforming pointer plus a lowered pin makes the automated
evidence gate pass the row, and the artifact that pointer names is escalated: two
`REVISE` verdicts, four mandatory roles with no work order, no review pack, and
no user decision. A gate passing over that measures the pointer's grammar rather
than the evidence. The cell also belongs to `/qfai-implement` — this stage
declares `test-list.md` read-only — so writing it here had no owner either.

What this record carries is the evidence and the escalation. The cell is written
when the escalation resolves, by the stage that owns it.

- Review pack: none retained
- Review pack seal: none

**Both are absent rather than empty.** `pack-seal.md` requires a sealed
`.qfai/review/review-<timestamp>/` pack beside a stage verdict, and this run
retained none — the rounds were taken and their responses summarised without a
pack being archived. A seal computed now would address a directory that does not
exist, so the fields record the absence. It is part of what the escalation puts
to the user: a later decision cannot verify that the reviewed evidence or the
reviewer's response stayed unchanged, because nothing sealed them.

ESCALATED. The row's evidence is complete and the reviewer gate has not passed
it: `completion-reviewer` returned `REVISE` in both rounds, and the one
permitted verification round escalated rather than clearing them.
`review-convergence.md` makes the user's decision the only exit from an
escalation, and no such decision is recorded, so this stage is not `PASS`
whatever is true of the row's own fields. Escalation is not failure: the
artifact stays where it is and the decision is above the reviewer.

Nothing about the pack is claimed either. `TDD-0009`, `TDD-0018`, `TDD-0035` and
`TDD-0036` are listed rather than backfilled, each with the reason it is not.
