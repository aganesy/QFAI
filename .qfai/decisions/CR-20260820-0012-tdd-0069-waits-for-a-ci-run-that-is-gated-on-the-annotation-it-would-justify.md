# Change Request

- ID: `CR-20260820-0012`
- Title: `TDD-0069 waits for a CI run that is gated on the annotation that row would justify`
- Raised by: `/qfai-atdd orchestrator, spec-0017; raised by P1d's qa-gatekeeper REVISE on DR-0017-0010, which found the exit condition that record offered to be unreachable`
- Raised at: `2026-08-20T23:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-atdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `5 then 1` — split the conjunction upstream, then narrow the signal
- Applied at: `2026-08-23T00:00:00Z` — options 5 then 1 applied; TC-0017-0069 / -0083 / -0070 covered
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

### Option 1 — narrow the signal from the aggregate verdict to the lanes the tuning affects

**This is an amendment, not a reading, and the first version of this CR presented it as a reading.**
Both round-3 gates said so independently, and they are right:

- "aggregate verdict" is **this spec's own defined term** for `ci-pass`. `BR-0017-0001`, `BR-0017-0004`,
  `AC-0017-0029` and `NFR-0004` all use it that way, and `01_Spec.md` calls the aggregate verdict "the
  single observed signal". There is no ambiguity to resolve;
- the cycle is not an artifact of misreading it. `BR-0017-0001` **requires** the verdict to derive from
  every `need`, so `build` is in it by design;
- and the first version's warrant was wrong about the rule's own rationale. `BR-0017-0053` gives it as
  "OC-80. Batching two projects into one pull request makes an emergent race unattributable" —
  **attributability**, not "guards against an unstable pipeline". The stability reading was invented
  here.

Stated honestly, then: this option asks the user to narrow the flake budget's signal to a **subset of
`ci-pass`'s inputs that excludes the one failing input**. That may well be right — a tuning change's
stability is a property of the test lanes, and a `validate` error about annotation completeness says
nothing about it — but it is a decision to weaken a guard, and the user should be asked for it as one.

Evidence position, corrected: three consecutive runs with the lane set green except `build` **do**
exist — `32370185891`, `32370813280`, `32370926286` — but `EX-0017-0053` also requires the run
identifiers to be **quoted in the pull request description**, and PR #794's body quotes none. So the
evidence is two-thirds present, not present.

Cost: an upstream edit to `05_Examples.md`, which is Drift Protocol territory and needs the
`#when-drift-is-detected` path rather than an inline edit.

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

### Option 5 — split the conjunction upstream, keeping clause 2's subject bound

`EX-0017-0053` states **two** obligations in one example: "exactly one runner project is tuned, largest
first" **and** "three consecutive green aggregate-verdict runs are recorded with their run identifiers
quoted". One ledger row therefore carries a satisfiable half and an unsatisfiable half, and
`red-provenance.md` gives a row one branch. Split the example in two and each half gets its own row,
its own branch and its own exit.

**The split must not unbind the second clause, and the first version of this option did.**
`AC-0017-0029` reads "And **each such** pull request records three consecutive green aggregate-verdict
runs" — the greens are _that tuning change's_ greens, which is the whole of `BR-0017-0053`'s OC-80
rationale: batching makes an emergent race unattributable. Worded as two free-standing obligations the
halves become independently satisfiable and the attributability guarantee is gone. P1d's third pass
found that, and it is recoverable: clause 2's row must name the change clause 1's row records, so the
two remain one guard in two rows rather than two guards.

It does **not** close `TDD-0069` on its own. Clause 1 is **unsatisfied** — no tuning change has been
made, so there is nothing for "exactly one project is tuned, largest first" to be true of — and clause
2 stays behind the cycle. (An earlier version of this option said clause 1 was "degenerate against this runner". P1d's third
pass showed that is false: `maxConcurrency` is project-scoped per this repository's own
`CR-20260820-0003` site table and `vitest.knobs.ts`'s `projectKnobs`. `DR-0017-0010` records the
history — two wrong readings and one correction, not, as an earlier version of this sentence had it,
"wrong about clause 1 three times".)

Italics were doing the quoting in the sentence above until round 6 pointed out that they are emphasis,
not quotation, so the refuted reading was standing as an assertion. Both refuted wordings are quoted
now, and `packages/qfai/tests/assets/retractedClaims.test.ts` enforces that rather than this record
announcing it. What the
split buys is that the two failures get named separately instead of one standing for both.

Also an upstream `05_Examples.md` edit, so also the Drift Protocol path.

## Recommendation

**Option 5 first, then option 1 for what remains** — both through the Drift Protocol, because both edit
`05_Examples.md`.

The split is the smaller ask: it changes no obligation, only how many rows carry them, and it makes the
two distinct failures visible instead of conflated. Option 1 then applies to clause 2 alone and can be
put to the user as what it is — narrowing the flake budget's signal to exclude `build`. Option 2 is
worth specifying separately, since the cycle it removes is structural and will recur, but not as the
vehicle for this row.

**The cycle is over-determined, and worse than the scoped numbers suggest.** Two passes of P1d found
successively more of it:

- clearing `QFAI-ATDD-112` leaves the scoped gate at `error=0`. **Corrected 2026-08-22, after round 15**
  — this bullet read "still leaves `error=1` from `QFAI-ATDD-111`, which stands deliberately because this
  stage withdrew `US-0017-0007`'s unearned annotation", which was true when written and was refuted by
  round 12: the story is about this repository's own suite, it is covered by
  `tests/e2e/spec0017RunnerParallelismE2E.test.ts`, and `QFAI-ATDD-111` is clear for this spec;
- `QFAI-ATDD-112`'s eight **scoped** TCs are the six `blocked` rows plus these two, so a green `build`
  needs three other CRs resolved _and_ `TC-0017-0070` annotated — which `EX-0017-0054` makes impossible
  pre-merge. Under the strict reading `TDD-0069` is blocked on `TDD-0070`;
- and the scoped count is the wrong one to reason from. **`build` runs three UNSCOPED profiles**
  (`ci.yml:376-428`). Unscoped, `QFAI-ATDD-111` is **11 US across four specs** and `QFAI-ATDD-112` is
  **15 TCs across four**. **Corrected 2026-08-22, after round 15** — the first figure read "12 US across
  five specs", which is the double-count the stage evidence retracts by name ("that sentence used to end
  'plus `US-0017-0007` makes 12', which was double-counting a row already inside the eleven"). It
  survived here because it is written as two counts in one sentence, so no needle in the retracted-claims
  guard reached it, and because that guard read `.qfai/evidence/**` and this file's own name and not the
  wording. Re-derived rather than taken on trust:

  ```text
  QFAI-ATDD-112, unscoped:  SPEC-0003 1   SPEC-0008 4   SPEC-0015 2   SPEC-0017 8   = 15
  ```

  `build` needs all fifteen, not eight. That is the dominant strand and it was absent from both this
  CR and `DR-0017-0010`.

  **It does not, however, give option 2 a second independent failure, and an earlier version of this
  paragraph claimed it did.** P1d's fourth pass checked: all seven non-`spec-0017` TCs are themselves
  `todo`, so option 2 as worded — an exemption for _a spec's_ own in-flight rows, not this spec's —
  is general and would clear `QFAI-ATDD-112` outright.

  **Open as of 2026-08-22, after round 17: this option's rejection has no surviving stated ground.** It
  cited the FIRST reason above — that `QFAI-ATDD-111` has no ledger rows to exempt — and round 15's
  correction withdrew that reason's premise, because `US-0017-0007` is covered and the rule no longer
  fires for this spec. Round 16 substituted the unscoped strand, and round 17 measured that too: all
  fifteen TCs `QFAI-ATDD-112` names unscoped are `todo` or `blocked`, so the exemption clears the rule
  outright rather than leaving other specs behind.

  The `/qfai-atdd` stage recorded this rather than choosing a new ground, because the option is this CR's
  to decide and the CR is `/qfai-implement`'s record. What is owed is either a ground that survives the
  two corrections or a re-opening.

Recorded so that no option here is read as sufficient by itself.

## Not to be confused with

- `CR-20260820-0007` — nine rows asserting over numbers `/qfai-implement` may not write into
  `07_Decisions.md`. Same _class_ (an arrangement defect, not a coding defect) and a different cycle;
  `TDD-0069` is not in its blocked set.
- `DR-0017-0010` — the anomaly record for `TDD-0070`, which is genuinely a timing fact. It keeps the
  `TDD-0069` analysis for continuity and points here for the decision.
