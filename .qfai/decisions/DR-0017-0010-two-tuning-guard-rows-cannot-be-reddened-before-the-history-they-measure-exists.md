# Decision Record

- ID: `DR-0017-0010`
- Title: `Two tuning-guard rows cannot be reddened before the CI history they measure exists`
- Kind: `anomaly` — the Decision Record a `todo -> exception` transition requires
- Spec: `spec-0017`
- Rows: `TDD-0069`, `TDD-0070`
- Raised by: `/qfai-atdd spec-0017`, Phase Red branch 3
- Raised at: `2026-08-20T22:00:00Z`
- Status: `open` — awaiting the `qa-gatekeeper` PASS that P1d routes on this artifact

## Why this record exists at all

Both rows are `Layer = Integration`, `Status = todo`, no `Blocked-By`. `/qfai-implement` Phase Red
step 3b routes exactly that shape to `/qfai-atdd` for its RED provenance, and step 3b stops on an
absent entry. So these two rows are this stage's to route, and leaving them unrouted deadlocks them.

`references/red-provenance.md` offers three branches in order. This record is branch 3, taken because
branches 1 and 2 were tried and are unavailable — not because they were skipped.

**Two rounds of review were needed to get this far, and the second found the first attempt wrong in a
way worth recording.** Round 1's stage evidence claimed all 71 `Integration` rows were already at
`refactor`, so no row was selectable; that was false (63 / 6 / 2). Round 2's evidence then routed both
rows to branch 3 but recorded the `DR-*` as _pending_, on the stated grounds that this stage could not
author it because `07_Decisions.md` is a read-only P5 input. **That obstacle was the wrong artifact.**
`qfai-implement/references/execution-ledger.md` § "Where the Decision Record is written" says a branch-3
DR goes to `.qfai/decisions/DR-<id>-<slug>.md` and explicitly **not** to `07_Decisions.md`, and
`constitution/drift-protocol.md` whitelists _creating_ exactly this file. Both round-2 reviewers found
it independently, and both noted the stage had already exercised that same authority this round when it
wrote `CR-20260820-0011`. The permission was never missing. This file is what should have existed then.

## The anomaly

Neither row can be reddened on this branch, and not for want of a test.

### `TDD-0069` — one tuning change per pull request, behind three green runs

- `Test file`: `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`
- `Selector`: `TC-0017-0069 (TDD-0069): one tuning change per pull request, behind three green runs`
- Obligation: `TC-0017-0069`, via `EX-0017-0053`

`EX-0017-0053` requires **three consecutive green aggregate-verdict runs with their run identifiers
quoted**. The workflow changes that produce an aggregate verdict are unmerged; PR #794's runs exist but
no three-in-a-row green sequence does, because the required context is still failing on a repo-wide
`QFAI-ATDD-111` unrelated to this row.

### `TDD-0070` — a rerun-to-green rate above one in twenty reopens it

- `Test file`: `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`
- `Selector`: `TC-0017-0070 (TDD-0070): a rerun-to-green rate above one in twenty reopens it`
- Obligation: `TC-0017-0070`, via `EX-0017-0054`

`EX-0017-0054` measures a rerun-to-green rate over **default-branch** verdict runs after a tuning
change has merged — at minimum twenty runs following a merge that has not happened. **This row is not
satisfiable on the branch that introduces the tuning, by construction.** No work on this branch changes
that; it is a property of when the branch is, not of what it contains.

## Branch 1 was tried and is unavailable

Branch 1 wants an admissible RED observed before the code that makes it pass exists. A test asserting
"three green runs exist and are cited" would indeed fail today, and its message would name the row's own
predicate — so the failure would be _admissible_ in shape. What makes it unusable is the other side of
the cycle: it cannot be made green on this branch at all, because the data it reads cannot exist here.
That is not a RED observation, it is a permanently failing test committed to a shared suite, and it would
break every unrelated pull request until a merge that this row is itself gating.

Recorded rather than glossed because the distinction is the whole reason branch 3 exists: branch 1 fails
here on the GREEN side, not the RED side.

## Branch 2 was tried and is unavailable

The falsifiability path applies when the surface is already there — the obligation is satisfied by state
that predates the row, and the trio (`Satisfied-by`, a falsifiability command, its result) demonstrates
the test discriminates against that state. There is no such state. The surface these two rows measure is
**workflow-run history**, and this branch has none of the kind they require. There is nothing to mutate,
so there is nothing to falsify.

This is distinct from `CR-20260820-0006`'s twelve rows, where the obligation _was_ already satisfied and
only the reference's vocabulary for saying so was missing. Here the obligation is not satisfied by
anything.

## Decision

Both rows transition `todo -> exception` against this `DR-0017-0010`, and stay parked.

**What that does not do.** `references/red-provenance.md#branch-3-does-not-close-a-spec-on-its-own`:
an `exception` is a blocking output. It needs a user-approved `TDDLIST-001` waiver, or the row is parked
and the spec stays open. **The spec stays open.** These two rows, the six `blocked` rows and the
uncovered `US-0017-0007` are why this stage's status is `FAIL`, and none of them is closeable by this
stage.

**What closes them.** `TDD-0069` becomes implementable once PR #794 has three consecutive green
`ci-pass` runs to cite. `TDD-0070` becomes implementable only after a merge, plus twenty default-branch
verdict runs. Both are ordinary work at that point, with no anomaly left to record — which is the sense
in which this `exception` is a timing fact rather than a defect.

## What a reviewer is being asked to judge

Per `qfai-atdd/SKILL.md` P1d, `qa-gatekeeper` is routed on **this artifact**, and
`references/red-provenance.md` fixes the audit subject as the row identity, the obligation reference,
the `DR-ID` and the DR artifact. All four are above. The judgement is not whether the rows are
important; it is whether branch 3 was reached honestly — that branches 1 and 2 were genuinely tried and
genuinely unavailable, rather than skipped because branch 3 is cheaper.

The row identity and obligation references were recorded in `58c29d9f`, before any gate was routed, as
that reference requires.
