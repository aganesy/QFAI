# Decision Record

- ID: `DR-0017-0010`
- Title: `Two tuning-guard rows cannot be reddened before the CI history they measure exists`
- Kind: `anomaly` — the Decision Record a `todo -> exception` transition requires
- Spec: `spec-0017`
- Rows: `TDD-0069`, `TDD-0070`
- Raised by: `/qfai-atdd spec-0017`, Phase Red branch 3
- Raised at: `2026-08-20T22:00:00Z`
- Status: **`PASS` at P1d pass 6** (`9a37421c`) — five `REVISE` before it, each sustaining
  `TDD-0070`'s own account and failing the record around it. `/qfai-implement` may write
  `todo -> exception` with this `DR-ID` once the stage entry carries the PASS, which
  `.qfai/evidence/atdd-spec-0017.md` § "Ledger rows advanced" now does

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

`EX-0017-0053`, **quoted in full** this time:

> Exactly one runner project is tuned, largest first, and three consecutive green aggregate-verdict
> runs are recorded with their run identifiers quoted in the description

The first version of this record quoted only the second clause, twice, and P1d's `qa-gatekeeper`
caught it. That matters because **the first clause is checkable today**: `vitest.knobs.ts` declares
the worker axes at the root and `.qfai/evidence/timing-workers-spec-0017.md` measures `core` as the
largest project. A row whose obligation is half-quoted has not had branches 1 and 2 examined, whatever
this record asserted — see § "Branch 2" below, which is corrected as a result.

**And the obstacle this record named was the wrong one.** It said the required context "is still
failing on a repo-wide `QFAI-ATDD-111` unrelated to this row". Both halves are false, and P1d
demonstrated it:

- there were **two** errors when P1d measured this, `error=2`, and **both were scoped to
  `.qfai/specs/spec-0017`**. (**Dated 2026-08-22, after round 15**: these two bullets read "there are two
  errors at HEAD" and named `QFAI-ATDD-111` in the present tense, and a record naming HEAD is stale at
  the next commit — the hazard the stage evidence's own P7 rule states. `US-0017-0007` was covered in
  round 12 and `QFAI-ATDD-111` no longer fires for this spec; the scoped gate is one error,
  `QFAI-ATDD-112`. The measurement is dated rather than deleted, which is what makes it historical
  instead of wrong, and it is how `CR-20260820-0012` states its own.);
- `QFAI-ATDD-111`'s subject was `US-0017-0007`, which `03_Acceptance-Criteria.md:410` records as the
  parent of **`AC-0017-0029`** — the AC these two rows implement. Not unrelated: it was their own;
- `QFAI-ATDD-112` names `TC-0017-0069` and `TC-0017-0070` **by id**, because neither is annotated
  anywhere in the repository. That error is _constituted by_ these two rows.

### The real obstacle for `TDD-0069`: the gate is self-referential

```text
ci-pass green   requires   build green
build green     requires   qfai validate --fail-on error  ->  exit 0   (error=0)
error=0         requires   QFAI-ATDD-112 clear
ATDD-112 clear  requires   TC-0017-0069 annotated in tests/integration/**
annotated       requires   a passing test for TC-0017-0069
that test       requires   three consecutive green ci-pass runs
```

The exit condition this record originally offered — "becomes implementable once PR #794 has three
consecutive green `ci-pass` runs to cite" — **cannot be followed**, because the run it waits for is
gated on the annotation it is waiting to justify. P1d verified every link against run `32368851703` at
`headSha 16f611c7`.

So the framing "a timing fact rather than a defect" is true of `TDD-0070` and **false of `TDD-0069`**.
`TDD-0070` waits for time to pass. `TDD-0069` waits for itself. That is an arrangement defect, filed
as `CR-20260820-0012`, and it is what a later reader following the `DR-ID` cell needs to find here —
`exception` clears only by `exception -> todo` when the anomaly resolves, so a wrong account of the
anomaly decides when anyone tries again.

Also corrected: "the workflow changes that produce an aggregate verdict are unmerged" was false as
`TDD-0069`'s reason. `ci-pass` exists at `.github/workflows/ci.yml:469` and has run many times on
this branch; `EX-0017-0053`'s obligation is **pre-merge** by construction, since it is about a pull
request and its runs.

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

The falsifiability path applies when the surface is already there — the obligation is satisfied by
state that predates the row, and the trio (`Satisfied-by`, a falsifiability command, its result)
demonstrates the test discriminates against that state.

**For `TDD-0070`, there is no such state.** The surface it measures is post-merge default-branch run
history. Nothing to mutate, so nothing to falsify.

**For `TDD-0069`, this record has now been wrong about clause 1 twice, in opposite directions.**

The first version said branch 2 was unavailable because there was nothing to falsify. The second said
clause 1 — "exactly one runner project is tuned, largest first" — _is_ satisfied by pre-existing state
and _is_ falsifiable, "mutate `vitest.knobs.ts` to tune a second project ... and a test over that
clause would redden".

**The mutation named was an equivalent mutant.** P1d's second pass found it: `vitest.knobs.ts` puts
`maxWorkers` in `rootKnobs`, and its own docstring records what happened when a per-project worker
declaration was tried — it "type-checked, it ran, it emitted no warning — **and it did nothing**",
measured at a ratio of 0.93, which is noise. Open `CR-20260820-0003` adds that the runner "drops
unknown project options silently".

**And the conclusion drawn from that was also wrong, in the other direction.** The second revision
called clause 1 "degenerate — not expressible against this runner at all", and P1d's third pass showed
that is false: `CR-20260820-0003`'s own site table lists **`maxConcurrency`** as "each project /
project-scoped", `vitest.knobs.ts` puts `maxConcurrency: tunable(CONCURRENCY_ENV)` in `projectKnobs`,
and `vitest.workspace.ts` spreads it into all seven projects. A differential `maxConcurrency` on `core`
is a one-line, runner-honoured, **per-project** parallelism change. The 0.93 measurement was about the
worker override specifically, and reading it as covering all per-project tuning was overreach.

**Third statement, and the narrow one: clause 1 is UNSATISFIED.** Not unfalsifiable, not degenerate —
simply not true yet, because _no tuning change has been made_. `BR-0017-0053` and `TC-0017-0069` govern
a tuning **change**; "exactly one runner project is tuned, largest first" has nothing to be true of
until one is. That also means clause 1 is **falsifiable in principle**, once a change exists — so
branch 2 becomes available for it at that point, and is unavailable now for the ordinary reason that
the state it would check has not been created.

This record has been wrong about clause 1 **twice** — "nothing to falsify", then "degenerate" — and
the statement above is the third and, per P1d's fourth pass, the correct one. It verified the reading
independently rather than accepting it: `projectKnobs` is spread uniformly into all seven projects with
only `name` and `include` overridden, `maxConcurrency` is declared once, and the declared start is
unmoved on both axes, so no tuning change exists.

The count matters because an earlier version of this line said "wrong three times", which classified
the current, correct statement as an error — the defect `CR-20260820-0006` describes, in a record that
cites it eighteen lines later. Two wrong readings and a correction, recorded in full rather than
replaced: each wrong one was written confidently, from a real citation, read one step wider than the
citation supported.

P1d's fourth pass added one caveat and marked it explicitly non-blocking: `BR-0017-0053` and
`AC-0017-0029` are universally quantified, so zero instances makes clause 1 _untriggered_ rather than
violated. **The row-level conclusion does not rest on that wording** — it rests on branch 2's GREEN
pair requirement for clause 2, which is independent — so this record does not restate clause 1 a fourth
time on that ground.

**And "exactly one form per row" was the wrong clause to reason from.** P1d's second pass:
`references/red-provenance.md` § "Evidence shape" governs how many forms _one row records_, not how a
two-clause obligation is treated. The load-bearing requirement is one line lower — branch 2 needs a
**GREEN pair**, which clause 2 forbids. Same destination, correct grounds, and P1d's third pass
confirmed the clause.

**The treatment neither this record nor `CR-20260820-0012` considered: split the conjunction
upstream.** `EX-0017-0053` states two obligations in one example. Split into two examples — one for
"exactly one runner project is tuned, largest first" and one for the three green runs — and each gets
its own row, its own branch and its own exit.

**This paragraph is where P1d's third pass found the retraction had not reached.** It read "clause 1's
row would still be degenerate against this runner (see above)" — the exact claim the section twenty
lines up retracts, pointing at that retraction as its support. The CR's twin paragraph was corrected in
the same commit range and this one was not: repair the pointer, not the payload, which is the pattern
`CR-20260820-0006` names. Corrected here.

Clause 1 is **unsatisfied**, so its row after a split would be a row nothing yet makes true — ordinary
work waiting on a tuning change, not an anomaly. The split therefore does not close `TDD-0069` on its
own; what it buys is that the two failures get named separately instead of one standing for both. And
it must keep clause 2's subject bound to clause 1's change, or the halves become independently
satisfiable and `BR-0017-0053`'s attributability guarantee is gone —`CR-20260820-0012`'s option 5
carries that wording.

This is distinct from `CR-20260820-0006`'s class-A rows, where the obligation _was_ already satisfied
and only the reference's vocabulary for saying so was missing. (That CR's own count went 13 -> 20 -> 21
across two corrections and it says in as many words "the number is not the check. Derive it from the
ledger" — so this record cites its classes and not a figure, which is the second thing P1d caught here.)

## Decision

**`TDD-0070`** transitions `todo -> exception` against this `DR-0017-0010`, and stays parked.

**`TDD-0069`** does not. P1d's REVISE established that its anomaly is a self-referential gate rather
than absent history, which is an unresolved Change Request of this spec — `CR-20260820-0012` — and
therefore a `blocked` condition, not an `exception`. It transitions `todo -> blocked` with
`Blocked-By: CR-20260820-0012`. This record keeps its analysis because the `DR-ID` cell is not the only
route a reader takes to it, and because the two rows were examined together.

**What that does not do.** `references/red-provenance.md#branch-3-does-not-close-a-spec-on-its-own`:
an `exception` is a blocking output. It needs a user-approved `TDDLIST-001` waiver, or the row is parked
and the spec stays open. **The spec stays open.** These two rows, the six `blocked` rows and the
uncovered `US-0017-0007` are why this stage's status is `FAIL`, and none of them is closeable by this
stage.

**What closes them, corrected.**

`TDD-0070` becomes implementable only after a merge, plus twenty default-branch verdict runs. Ordinary
work at that point, no anomaly left to record. For this row the `exception` is a timing fact.

`TDD-0069` cannot be closed by waiting, because of the cycle above. It becomes implementable when
`CR-20260820-0012` is resolved — by whichever of its options the user approves, all of which have the
same shape: break the dependency of the _run_ on the _annotation_. Until then the row is parked on an
anomaly that is a defect in the arrangement of its own gates, not a property of the calendar.

`blocked` was considered for both and is wrong: `execution-ledger.md` scopes `todo -> blocked` to "an
upstream defect, an unresolved Change Request, or an unfinished row in another spec". P1d checked this
independently and it closes in this record's favour for `TDD-0070`. For `TDD-0069` it is now arguable —
`CR-20260820-0012` is an unresolved Change Request of this spec's own — and the honest answer is that
`blocked` becomes correct for `TDD-0069` the moment that CR is open, which it now is. Recorded rather
than decided here: the transition is `/qfai-implement`'s to write, and it should write
`todo -> blocked` with `Blocked-By: CR-20260820-0012` for `TDD-0069`, and `todo -> exception` against
this record for `TDD-0070`.

## What a reviewer is being asked to judge

Per `qfai-atdd/SKILL.md` P1d, `qa-gatekeeper` is routed on **this artifact**, and
`references/red-provenance.md` fixes the audit subject as the row identity, the obligation reference,
the `DR-ID` and the DR artifact. All four are above. The judgement is not whether the rows are
important; it is whether branch 3 was reached honestly — that branches 1 and 2 were genuinely tried and
genuinely unavailable, rather than skipped because branch 3 is cheaper.

The row identity and obligation references were recorded in `58c29d9f`, before any gate was routed, as
that reference requires.
