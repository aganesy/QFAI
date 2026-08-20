# Change Request

- ID: `CR-20260820-0012`
- Title: `TDD-0069 waits for a CI run that is gated on the annotation that row would justify`
- Raised by: `/qfai-atdd orchestrator, spec-0017; raised by P1d's qa-gatekeeper REVISE on DR-0017-0010, which found the exit condition that record offered to be unreachable`
- Raised at: `2026-08-20T23:00:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`
- Blocked set: `spec-0017 TDD-0069`

## The cycle

```text
ci-pass green    requires   build green
build green      requires   qfai validate --fail-on error  ->  exit 0   (error=0)
error=0          requires   QFAI-ATDD-112 clear
ATDD-112 clear   requires   TC-0017-0069 annotated under tests/integration/**
annotated        requires   a passing test for TC-0017-0069
that test        requires   three consecutive green ci-pass runs   (EX-0017-0053)
```

Every link verified at `16f611c7`, against run `32368851703` on that sha:

- `.github/workflows/ci.yml:469` — `ci-pass` derives its verdict from the serialized `needs` map, so
  it fails when `build` fails. Observed: `build` failure, `ci-pass` failure, all seven test legs green;
- `build` runs the dogfooding self-validate with `--fail-on error`, which exits 1 at `error=2`;
- `.qfai/report/validate.log` — the two errors are `QFAI-ATDD-111` (`US-0017-0007`) and
  `QFAI-ATDD-112`, **both scoped to `.qfai/specs/spec-0017`**, and `QFAI-ATDD-112` names
  `TC-0017-0069` and `TC-0017-0070` by id among its eight;
- a repo-wide grep for those two ids across every `.ts` / `.mjs` / `.js` returns nothing, so the
  annotation genuinely does not exist;
- `EX-0017-0053` requires "three consecutive green aggregate-verdict runs … with their run identifiers
  quoted".

So the row waits for a green run, and the run is red _because_ the row is unannotated. Waiting cannot
resolve it. `DR-0017-0010`'s first version offered "becomes implementable once PR #794 has three
consecutive green `ci-pass` runs to cite" as the exit, and that exit does not exist.

## Why this is a defect and not a note

Because the row's recorded anomaly decides when anyone tries again. An `exception` clears by
`exception -> todo` when the anomaly resolves; a reader following the `DR-ID` cell in a month, seeing
"waiting on run history", would wait. The anomaly is not the calendar — it is that a spec's own
completeness gate is a precondition for the evidence that completes it.

It also generalises past this row. Any `TC` whose acceptance evidence is _a property of this
repository's CI runs_ inherits the same cycle, because `QFAI-ATDD-112` fires on the unannotated TC and
`build` treats that as fatal. `TDD-0070` escapes only because its obligation is explicitly post-merge,
which puts it outside the pre-merge gate rather than outside the cycle.

## Options

### Option 1 — cite runs of the workflow, not runs of the required context (recommended)

`EX-0017-0053` says "three consecutive green **aggregate-verdict** runs". Read strictly, that is three
green `ci-pass` **jobs**, which is what the cycle blocks. Read as the business rule intends —
`BR-0017-0053` guards against a tuning change landing on an unstable pipeline — what needs to be green
is **the layered lane set the tuning affects**: the seven test legs plus `detect` and the verdict's own
derivation. Those are green today, and were green on `8fb48002` and `16f611c7`.

Amend `EX-0017-0053` to name the runs it means, and the row becomes ordinary work with evidence that
already exists. Cost: an upstream edit to `05_Examples.md`, which is Drift Protocol territory and needs
the `#when-drift-is-detected` path rather than an inline edit.

This is recommended because the cycle is an artifact of reading "aggregate verdict" as "the context
that also gates annotation completeness", which is not what the tuning guard is about.

### Option 2 — exempt a spec's own in-flight TCs from the fatal gate

Let `build`'s self-validate treat `QFAI-ATDD-112` for TCs whose ledger rows are `todo` / `blocked` /
`exception` as a warning rather than an error, on the grounds that an unimplemented row is _reported_
by the ledger and does not need a second fatal report from the annotation scanner.

Breaks the cycle for every future row of this class, not just this one. Rejected as a first move
because it weakens a gate globally to unblock one row, and because `QFAI-ATDD-112` at `error` is what
stops a spec being declared done with uncovered TCs — the failure mode it exists for.

### Option 3 — waive the row

A user-approved `TDDLIST-001` waiver on `TDD-0069`, recorded in `.qfai/waivers.yml`. Honest, cheap, and
it leaves the cycle in place for the next row that meets it. Appropriate only if the answer to option 1
is "the strict reading is the intended one and the guard is simply not satisfiable pre-merge".

### Option 4 — merge first, then satisfy it

Accept that `TDD-0069` is post-merge in practice even though its example is pre-merge in wording, and
treat it like `TDD-0070`. Rejected on the record: it makes the wording of `EX-0017-0053` false rather
than resolving it, and it is the reading `DR-0017-0010`'s first version implicitly took when it blamed
"unmerged workflow changes" — which P1d showed is not the obstacle.

## Recommendation

**Option 1**, routed through the Drift Protocol because it edits `05_Examples.md`. Option 2 is worth
specifying separately — the cycle it removes is structural and will recur — but not as the vehicle for
this row.

Until an option is approved, `TDD-0069` is `blocked` with `Blocked-By: CR-20260820-0012`, not
`exception`. `execution-ledger.md` scopes `todo -> blocked` to "an upstream defect, an unresolved
Change Request, or an unfinished row in another spec", and this is the middle one.

## Not to be confused with

- `CR-20260820-0007` — nine rows asserting over numbers `/qfai-implement` may not write into
  `07_Decisions.md`. Same _class_ (an arrangement defect, not a coding defect) and a different cycle;
  `TDD-0069` is not in its blocked set.
- `DR-0017-0010` — the anomaly record for `TDD-0070`, which is genuinely a timing fact. It keeps the
  `TDD-0069` analysis for continuity and points here for the decision.
