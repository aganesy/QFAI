# Implementation Evidence: spec-0014

## Objective

Carry the proof for the `unit` rows of this spec's ledger. The stage split puts
an `E2E` / `API` / `Integration` row's proof in `.qfai/evidence/atdd-spec-0014.md`;
every other layer anchors here.

The ledger holds four `unit` rows. **Neither of the two completed ones —
`TDD-0033` and `TDD-0034` — can be backfilled**, and the reasons are under
Gaps. The other two, `TDD-0028` and `TDD-0029`, are at `exception` with
`DR-0014-0002` recorded: an `exception` row carries a decision rather than a
proof, so backfilling is not the question for them and nothing here records one.
No row is recorded either way.

## Decisions made (with rationale)

`TDD-0034` carries a `Selector` written as a summary of the obligation rather
than a test's title: `cycle 0 deletes fullHarness`. **The ledger still carries
it, and this stage did not change it.** A correction was drafted and withdrawn —
the cell belongs to a `done` row, and rewriting one here would have re-pointed
a completed row's identity outside the transition that allows it. The repair is
the ledger owner's, and what is recorded below is the state as found.

## Commands executed + key outputs

Two runs establish what the row's `Selector` does and does not select. Neither
is evidence for the row; see Gaps.

Both ran from `packages/qfai` at revision
`649d8111147436408c90cbbe1b9f9b07e34da8cb`.

| Command                                                                                   | Selected  | Result      |
| ------------------------------------------------------------------------------------------- | --------- | ----------- |
| `npx vitest run tests/cli/commands/prototypingIterate.test.ts`                             | all       | 103 passed  |
| `npx vitest run tests/cli/commands/prototypingIterate.test.ts -t "cycle 0 deletes fullHarness"` | 0 of 103  | 103 skipped |

The second is the finding, and **it is both `unit` rows rather than one**. Neither
`Selector` the ledger carries matches a case:

| Row        | `Selector`                    | `-t` selects |
| ---------- | ----------------------------- | ------------ |
| `TDD-0033` | `iter-NN path layout`         | 0 of 103     |
| `TDD-0034` | `cycle 0 deletes fullHarness` | 0 of 103     |

`iter-NN path layout` appears in the test-case specification and in the ledger,
and in no `describe` or `it` name anywhere in the repository. A `-t` run that
matches nothing exits successfully and establishes nothing
(`references/checkpoint-verification.md`), so the row reads as runnable and is
not.

`TDD-0033` therefore needs the selector repair whether or not the layout
conflict its Gaps entry records is settled: resolving the conflict leaves a row
that still names no case. The title that carries its
obligation is
`re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate /
fullHarness / executionPlan on cycle 0`, recorded here for the owner rather than
written into the cell.

## Items processed

None. No row reached a recorded entry.

## Test results summary

The suite behind both `unit` rows passes. Passing is not the question either
row turns on.

## Gaps / Open risks

`TDD-0034` is not backfilled. Its implementation shipped long before this
record, so no RED can be observed and the row would take the falsifiability
path. That path requires `Satisfied-by`, and none of its accepted forms is
available here.

`references/red-not-observable.md` accepts a sibling `TDD-NNNN` whose
implementation already satisfies the obligation, the production path and symbol,
the row's own id and round when it resumes from `blocked`, or an artifact plus
the property it already had. The production path and symbol is accepted **only**
on an `E2E` / `API` / `Integration` row handed over by `/qfai-atdd`; on a `Unit`
or `Component` row it is refused, because production code no ledger row owns is
the case the procedure sends to `exception`. This row is `unit`, it resumes from
nothing, and no sibling row in the pack establishes the cycle-0 reset:
`TDD-0033`'s obligation is the iteration directory layout.

A second obstacle stands behind that one. The case the `Selector` names asserts
five outcomes — three deletions and two re-seeds — and a single case fails once,
so a mutation reddens whichever assertion runs first and leaves the rest
unobserved. `references/selector-granularity.md` puts one independently
observable boundary on a row and sends a matrix-shaped obligation to
`/qfai-sdd` Phase 2b to be split, never to be split at evidence time. So the row
needs decomposition before any single mutation can prove it.

`TDD-0033` is not backfilled either. Its obligation, `TC-0014-0033`, reads
"active layout uses `.qfai/evidence/prototyping/iter-NN/` only", and its parent
`AC-0014-0005` adds that the legacy `screenshots/` / `html/` directory layout is
"no longer accepted as the active SSOT".

The product still requires that layout. `uiEvidenceArtifacts.ts` builds
`screenshotRoot` as `<prototyping root>/screenshots` and looks there first,
falling back to `iter-NN`; `validate.ts` documents that path as the required
one; and `prototypingIterate.ts` mirrors each accepted iteration's files into
`screenshots/` and `html/` so the lookup finds something. Two cases in
`uiEvidenceArtifacts.test.ts` require a legacy-only project to report no issue.

The half of the obligation that makes the criterion true is therefore
contradicted by the code, and no test discriminates it. A mutation against the
narrower assertion would fix that disagreement into the record.

`TDD-0028` and `TDD-0029` share this pack and sit at `exception`, so they carry
no completed-evidence obligation and are not recorded here.

## Final status

No row is recorded. Both `unit` rows are listed above rather than claimed.
