# R04 — qa-gatekeeper, P1d branch-3 DR gate (round 3)

- Reviewer: `qa-gatekeeper`
- Stage: `/qfai-atdd spec-0017`, gate **P1d** (re-route)
- Audit subject: `.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`,
  plus `.qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md`
  insofar as the `blocked` re-classification hangs on it
- Rows: `TDD-0069`, `TDD-0070`
- Revision reviewed: `1473897a`
- Prior verdict: **REVISE** on `16f611c7` — `.qfai/review/review-20260820220000000/R04_qa-gatekeeper-p1d.md`
- Verdict: **REVISE**

## Provenance of this run

`git rev-parse --short HEAD` = `1473897a` at start **and** at finish; `git status --porcelain`
empty at both. Nothing was mutated except this file.

HEAD-accurate validate evidence was obtained read-only, because the tracked
`.qfai/report/validate.log` was last written at `16f611c7` and three commits have landed since:
`git archive HEAD` into `tmp/r04-p1d-round3/shadow` (83 tracked symlink entries enumerated from
the index and confirmed content-reachable in the shadow), then
`validate --profile full --fail-on error --root tmp/r04-p1d-round3/shadow`. The tracked log was
not touched. Live evidence: run `32370926286` at `headSha 1473897a`, and PR #794 (OPEN).

## What round 2 required, and what the revision did

| Round-2 required fix                                                             | Status                                                                      |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1. Name both validate errors, their `spec-0017` scope, and ATDD-112's two TC ids | **Done, accurately** — DR lines 58-62                                       |
| 2. Replace the unreachable closure condition, or file the Change Request         | **CR filed**; the cycle it records is incomplete — **B3**                   |
| 3. Quote `EX-0017-0053` whole and record what branch 1 / 2 found on clause 1     | Quote **exact**; the finding on clause 1 is **wrong** — **B2**              |
| 4. Drop the `CR-20260820-0006` count; drop "unmerged" from `TDD-0069`            | **Done in the DR** (lines 86-89, 136-139); **not** in the handover — **B1** |
| 5. Recommended: clear the stale statements in the evidence file                   | Partly; the two that matter are now **contradictions**, not staleness — **B1** |

## Verified correct this round

1. **`EX-0017-0053` is quoted verbatim.** DR lines 45-46 match `05_Examples.md:84` word for word,
   both clauses.
2. **The AC-parentage citation is right.** `03_Acceptance-Criteria.md:410` is the index row
   `AC-0017-0029 | ... | US-0017-0007`, and `:311-312` carries the same parentage in the scenario
   header. Both validate errors do belong to these rows' own story.
3. **Row identity is unchanged and still exact** against `tdd/test-list.md:107-108`:
   `Layer = Integration`, `Test file = packages/qfai/tests/assets/actionPinBumpOwner.test.ts`, and
   the two selectors verbatim. Both rows are still `todo` with `DR-ID = -` and `Blocked-By = -`, so
   nothing has been written ahead of this gate.
4. **The ID space is still clean.** `07_Decisions.md` ends at `DR-0017-0009`; `.qfai/decisions/`
   holds exactly one `DR-0017-*`. No collision.
5. **Both validate errors persist at THIS HEAD**, measured by my own run rather than inherited:
   `QFAI-ATDD-111` still names `SPEC-0017:US-0017-0007`, and `QFAI-ATDD-112` still names
   `SPEC-0017:TC-0017-0069` and `SPEC-0017:TC-0017-0070` among its eight.
6. **The annotation genuinely does not exist.** Repo-wide grep for both TC ids across every
   `.ts` / `.mts` / `.mjs` / `.js` / `.cjs` file: **0 matches**.
7. **`ci.yml:469` is `ci-pass`**, its `needs` includes `build`, and at HEAD the run shows `build`
   failure -> `ci-pass` failure with `detect`, `lint`, `check-types`, `check-types-future`,
   `scanner-coverage` and all **seven** test legs green. The CR's link 1 is exact.
8. **`Blocked-By: CR-YYYYMMDD-NNNN` is the canonical form.** `tddList.ts:1001` names a Change
   Request ID first among the accepted values, and the six existing `blocked` rows all use it
   (`CR-20260818-0007`, `CR-20260820-0001`, `CR-20260820-0007` x4). The proposed cell is
   mechanically valid, and `CR-20260820-0012`'s `Blocked set` field matches `CR-20260820-0007`'s.

## Judgement 1 — the `blocked` re-classification is a real application of the clause, not a dodge

Asked to challenge this specifically, I did, and it holds. Three independent reasons:

- **Literal fit.** `execution-ledger.md:185-187` admits `todo -> blocked` on "an upstream defect, an
  unresolved Change Request, or an unfinished row in another spec". `CR-20260820-0012` is
  `Status: open`, `Approved option: -`, and names `spec-0017 TDD-0069` in its `Blocked set`. Its
  recommended resolution is an edit to `05_Examples.md` routed through the Drift Protocol — an
  upstream change. That is two of the three grounds, not a stretch of one.
- **The incentive runs the other way.** `execution-ledger.md:330-338` is explicit that `blocked` is
  **completion-prohibiting, exactly like `todo`**, and that `exception` "satisfies spec completion —
  filing a blocked row there would silently close the obligation". So the stage traded the status
  that can be closed (via a user-approved `TDDLIST-001` waiver) for the status that cannot be closed
  at all. A stage converting a verdict it disliked would have kept `exception` — which round 2 had
  already blessed as correct — and merely repaired the prose. It did the opposite.
- **The filing was required of it.** Round 2's required fix 2 said in as many words: "If the honest
  answer is that the arrangement is defective, file the Change Request — `CR-20260820-0007` is the
  precedent for exactly this filing." Round 2's finding 8 rejected `blocked` on the premise that the
  row was "waiting on CI run history"; round 2's own B2 destroyed that premise. A status derived from
  a corrected anomaly is not a status laundered around a verdict.

Two caveats, both cheap and neither blocking:

- A `blocked` row needs no `DR-*` and no reviewer PASS, so after this transition the only route from
  the ledger to the analysis is `Blocked-By` -> `CR-20260820-0012` -> its prose section
  "Not to be confused with" -> `DR-0017-0010`. That chain resolves today but lives in a paragraph.
  Put the pointer in a field.
- DR lines 167-174 open "`blocked` was considered for both and **is wrong**" and close by adopting it
  for `TDD-0069`. The paragraph is its own contradiction on first read; the meaning is recoverable
  only at the end. Rewrite it as one claim per row.

## Judgement 2 — `TDD-0070`'s `exception` is sustained, for the third round

Re-verified independently: `BR-0017-0054` (`04_Business-Rules.md:103`) and `EX-0017-0054`
(`05_Examples.md:85`) both scope the measurement to **default-branch** aggregate-verdict runs
**after** a tuning change has merged, at a rate over one in twenty. That surface cannot exist on the
branch that introduces the tuning. Branch 1 fails on the GREEN side; branch 2 has no satisfied state
to mutate; `exception` with a `DR-*` is the right shape. Nothing in B1-B3 below touches this row's
own account.

## Judgement 3 — the six links hold individually; the diagram they compose does not

Each of the six is verified at this HEAD (see "Verified correct" 5-7, and link 5 against
`05_Examples.md:84`). What fails is the composition — see **B3**. The row is not waiting on one gate
that waits on the row; it is waiting on five things, one of which is `TDD-0070`.

## Judgement 4 — the conjunction reaches the right answer through the wrong clause

Asked whether "exactly one form per row" is the right reading of `red-provenance.md`
section "Evidence shape" for a conjunctive obligation: **no, and the DR does not need it.**

That sentence governs how many forms **one row records** — it forbids recording an observed RED and a
falsifiability trio for the same row, and it forbids recording neither. It says nothing about an
obligation with two clauses. The clause that actually decides this row is one line lower: the
branch-2 row of the same table requires a **GREEN pair** (`red-provenance.md:253`). A row whose
second clause cannot go green cannot produce that pair, so branch 2 is unavailable **for the row** no
matter how falsifiable clause 1 is. The DR states this reasoning correctly at lines 130-134 and then
attributes it to the wrong sentence. Fix the citation; the conclusion stands.

**The treatment neither artifact considers** is splitting the conjunction upstream: make clause 1 its
own obligation, testable now, and let clause 2 be the post-merge one. That is a `05_Examples.md` /
`06_Test-Cases.md` edit — the same Drift Protocol path option 1 already needs — and it is what the
DR's own corrected analysis points at most directly. Its absence from `CR-20260820-0012`'s four
options is a gap in the set the user is being asked to choose from. Non-blocking: it strengthens the
option set rather than correcting an error in it, and **B2** is why clause 1 may not survive the split
either.

## Judgement 5 — option 1 is an amendment dressed as a reading

Option 1 is procedurally honest: it says it edits `05_Examples.md` and routes through
`#when-drift-is-detected` rather than reinterpreting inline. Its **justification** is not.

"Aggregate verdict" is not loose wording in this spec; it is a defined term for the `ci-pass` job,
used consistently:

- `BR-0017-0001` — "The aggregate verdict job MUST compute its result by iterating its serialized
  `needs` map";
- `BR-0017-0004` — "The aggregate verdict's check name is immutable", whose own note already
  distinguishes the job from a required context ("The verdict is not a required context today");
- `AC-0017-0029:319`, `NFR-0004` (`01_Spec.md:99`) and `01_Spec.md:137` — "the aggregate verdict is
  **the single observed signal**".

So the CR's premise — that the cycle "is an artifact of reading 'aggregate verdict' as 'the context
that also gates annotation completeness'" — attacks a reading nobody made. The cycle exists because
`BR-0017-0001` **requires** the verdict to derive from every `need`, and `build` is one. Option 1
therefore asks the user to narrow the flake budget's observed signal from the single observed signal
to a subset chosen to exclude the one lane that is failing. That may well be the right call — `build`
runs no vitest, so worker tuning cannot flake it — but it has to be put to the user as **narrowing
the guard**, with the reason why the excluded lane is parallelism-insensitive, not as recovering an
intent the spec contradicts in five places. A user approving on the present framing would be
approving a weakening described as a clarification.

Its evidence claim is also two-thirds true. Three consecutive runs with the whole lane set green
except `build` **do** exist — `32370185891` (`a241b90e`), `32370813280` (`21ea1ddc`),
`32370926286` (`1473897a`) — so the CR's citation of `8fb48002` and `16f611c7` is under-inclusive
rather than wrong, and those two are not consecutive: a failed run and a cancelled run sit between
them. But `EX-0017-0053`'s second half is "recorded **with their run identifiers quoted in the
description**", and PR #794's body quotes no run identifier at all. "Evidence that already exists"
should read "runs that already exist, plus a description edit".

## Blocking findings

### B1 — the handover index still says `exception` for `TDD-0069`, so the transition the revision decided cannot be written from it

`red-provenance.md:267` makes `## Ledger rows advanced` **the index** `/qfai-implement` reads: "one
row per `TDD-*`, holding the branch and an anchor". At HEAD that index reads:

```text
.qfai/evidence/atdd-spec-0017.md:260
| `TDD-0069` | Integration | `TC-0017-0069` | 3 — `exception` | `DR-0017-0010` | (section) `TDD-0069` |
```

and the row's own section repeats it:

- line 316 — branch 1 is unavailable "because the workflow changes are unmerged", the exact sentence
  the DR retracts at lines 86-89 as false for this row;
- lines 319-320 — "Branch 2 (falsifiability) is unavailable ... there is no run history to mutate",
  the exact claim the DR retracts at lines 123-134 as an overstatement;
- line 326 — "The row stays `todo` in the ledger until `/qfai-implement` writes `todo -> exception`";
- line 354 — both rows counted alongside "the six `blocked` ones" as if neither were joining them.

Lines 278-298 of the same file *do* record the re-classification correctly. So the handover carries
both accounts, and the one a consumer reads first is the withdrawn one. This is not round 2's N3
staleness note: those statements were merely out of date, these **contradict a decision taken in the
same commit range**. The file itself quotes the rule that makes this blocking (lines 328-331: an entry
"malformed in any other way" leaves the row at `todo`, and step 3b "treats malformed and absent
identically"). Acting on this handover, `/qfai-implement` would write `todo -> exception` with
`DR-0017-0010` for `TDD-0069` — precisely the transition the revision exists to prevent.

### B2 — the clause-1 branch-2 finding is contradicted by the repository, and the mutation it names is inert

DR lines 123-128 state that `EX-0017-0053`'s first clause "**is** satisfied by state that predates the
row, and it is falsifiable: mutate `vitest.knobs.ts` to tune a second project, or to tune one that is
not the largest, and a test over that clause would redden".

Measured against the file it names:

- `packages/qfai/vitest.knobs.ts` puts the worker axis in **`rootKnobs`** —
  `maxWorkers: tunable(WORKERS_ENV)`, `minWorkers: 1`, `fileParallelism: true` — and `projectKnobs`
  carries no worker axis at all;
- its own docstring records why: `NonProjectOptions` "names `maxWorkers`, `minWorkers` and
  `fileParallelism`", `poolOptions.forks` is narrowed to `singleFork | isolate`, and a first attempt
  that declared the worker axis on every project "type-checked, it ran, it emitted no warning — **and
  it did nothing**", at a measured wall-clock ratio of 0.93;
- `CR-20260820-0003` (**open**, class `intent`) is that finding, and adds that the runner "drops
  unknown project options silently".

Two consequences, both against the sentence as written. **The named mutation is behaviourally inert** —
tuning a second project changes no observable, which is the equivalent-mutant shape this role is
chartered to reject; it would redden only a purely structural test, and the DR does not say so. And
**clause 1 is not "satisfied" by that state**: with a single root-scoped value applied to all seven
projects, "exactly one runner project is tuned" has no per-project tuning surface to be true of — it
is degenerate, and arguably it is what `CR-20260820-0003` says the spec asks for and the runner
refuses. "Largest first" is in the same position: the only place "largest" is observable is the
measurement artifact, which `TDD-0065` already owns.

This matters because round 2's required fix 3 asked what the branch-1 / branch-2 examination **found**
on clause 1, and the answer given is an assertion contradicted by an open Change Request in the same
directory — the one round 2 named by ID. The correct finding supports branch 3 at least as strongly,
so this is again a repair of the reason and not of the destination. But it is the third round in which
this record has stated a mechanical fact about the runner that the repository already knew was false,
and it is the same class as `CR-20260820-0002` and `CR-20260820-0003`.

### B3 — the cycle is over-determined, one strand runs through `TDD-0070`, and option 2 does not break it

Both artifacts state the link `error=0 requires QFAI-ATDD-112 clear`. At HEAD, `error=0` requires
**both** errors clear, and neither clears the way the diagram implies:

- **`QFAI-ATDD-111` is standing deliberately, by this stage's own recorded decision.**
  `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:500-518`: the annotation for
  `US-0017-0007` "has been REMOVED", with the reason that the assertion claiming it added no
  discriminating power, and "So `QFAI-ATDD-111` reports `US-0017-0007` again, **deliberately** ... The
  row becomes coverable when the knobs ship." Since `error=2`, clearing `QFAI-ATDD-112` alone leaves
  `error=1` and `build` still exits 1. **Annotating `TC-0017-0069` cannot make `ci-pass` green at this
  HEAD**, self-reference or no self-reference.
- **`QFAI-ATDD-112` clears only when all eight of its TCs are annotated**, and the eight are exactly
  `{the six blocked rows} + {TDD-0069, TDD-0070}`: `TC-0017-0016`, `0030`, `0032`, `0033`, `0034`,
  `0035` are the six `blocked` rows' obligations, held by `CR-20260818-0007`, `CR-20260820-0001` and
  `CR-20260820-0007`. So `TDD-0069`'s stated exit requires three other Change Requests resolved —
  **and it requires `TC-0017-0070` annotated**, which on the CR's own link ("annotated requires a
  passing test") `EX-0017-0054` makes impossible before a merge. Under the strict reading `TDD-0069`
  is blocked on `TDD-0070`, transitively and permanently pre-merge. That is a stronger and cleaner
  statement of the anomaly than the loop, and it is in neither artifact.
- **`build` green also requires the two later dogfooding profiles.** The failing step at HEAD is
  `--profile tdd` (`ci.yml:376-388`), whose `error=2` is the pair above; `set -euo pipefail` aborts
  the job there, so the `sdd` and `full` steps never run. My shadow-root `--profile full` run at HEAD
  reports **`error=6`**, the extra three being `QFAI-REVIEW-004` on
  `.qfai/review/review-20260820220000000` and `QFAI-REVIEW-004` + `QFAI-REVIEW-005` on
  `.qfai/review/review-20260821000000000` — this stage's own review packs, with no `summary.json`.
  Not the DR's defect, but a fourth independent reason `build` cannot exit 0 today, and the one the
  stage can fix itself.

The consequence for the decision the user is being asked to take: **option 2 does not work.** The CR
says exempting in-flight TCs from the fatal gate "Breaks the cycle for every future row of this class,
not just this one". At this HEAD it breaks nothing for this row, because `QFAI-ATDD-111` survives it
and `build` stays red. Option 1 does survive this finding — it removes the row's dependence on
`ci-pass` entirely — so the recommendation stands, but an option analysis with a false entry is not a
basis for an approval.

## Non-blocking findings

- **N1.** Option 1's framing and its "evidence that already exists" claim — Judgement 5. Correct it in
  the same edit as B3; a user approving a narrowing described as a clarification is a worse outcome
  than a row that stays parked another round.
- **N2.** The "exactly one form per row" citation — Judgement 4. Point at `red-provenance.md:253`'s
  GREEN-pair requirement instead.
- **N3.** DR lines 167-174 contradict themselves on first read — Judgement 1, caveat 2.
- **N4.** The DR's `Rows:` header still lists both rows while only `TDD-0070` now takes a transition
  against it. Acceptable, and the DR says why at lines 148-149, but the header should say which row
  the record backs.
- **N5.** Round 2's pack `.qfai/review/review-20260820220000000` has no `summary.json`, and this
  round's pack has none yet; both are `error`-level under the `full` profile. The orchestrator's to
  write, not mine.

## Gate decision

**REVISE.**

**`/qfai-implement` may NOT write `todo -> exception` for `TDD-0070` yet** — not because that row's
account is unsound (it is sound, and I sustain it for the third round), but because the handover index
it would read is malformed for its sibling (**B1**) and the record it would cite still states a
mechanical falsehood about the runner (**B2**). A `DR-ID` cell is a permanent pointer; the record it
points at has to be right about both rows it covers.

**`/qfai-implement` may NOT write `todo -> blocked` for `TDD-0069` yet either** — and here the reason
is narrower and purely structural. The status itself is correct and needs no verdict from me:
`blocked` requires no `DR-*` and no `qa-gatekeeper` PASS, and I have confirmed the clause genuinely
applies (Judgement 1). What blocks the write is that the handover index at
`.qfai/evidence/atdd-spec-0017.md:260` still says `3 — exception` / `DR-0017-0010` for this row, so
the transition actually written from this handover would be the wrong one.

Both writes become available on a repair that is small: three cells and four statements in the
evidence file, two paragraphs in the DR, one option and one justification in the CR.

## Required to clear this gate

1. **Make the handover say what the revision decided.** `.qfai/evidence/atdd-spec-0017.md`: the
   `## Ledger rows advanced` row for `TDD-0069` (branch and `DR-ID` cells), and the four statements at
   lines 316, 319-320, 326 and 354. The `TDD-0070` row is correct as it stands.
2. **Correct the clause-1 finding.** State what `vitest.knobs.ts` and `CR-20260820-0003` actually
   establish: the worker axis is root-scoped, a per-project declaration is inert and silently dropped,
   so clause 1 has no per-project surface to be satisfied by and the mutation the record names would
   not redden a behavioural test. Cite `CR-20260820-0003` by ID.
3. **Complete the cycle account, in both artifacts.** `QFAI-ATDD-111` is standing by this stage's own
   decision; `QFAI-ATDD-112` needs all eight TCs including `TC-0017-0070`, whose annotation is
   pre-merge-impossible; six of the eight are held by three other Change Requests. Then **withdraw or
   re-scope option 2**, which does not break the blockage at this HEAD.
4. **Re-frame option 1** as narrowing the guard, with `BR-0017-0001` / `BR-0017-0004` /
   `01_Spec.md:137` quoted as the terms it narrows, and with the description edit named as part of the
   work. Optionally add the fifth option: split the conjunction upstream.
5. **Housekeeping** (N2, N3, N4): the branch-2 citation, the self-contradicting paragraph, the `Rows:`
   header.

## Residual risk if this were passed as-is

`/qfai-implement` would write `todo -> exception, DR-0017-0010` for `TDD-0069` from a handover index
that says so, contradicting a decision taken three commits ago and putting a completion-satisfying
status on a row the stage itself judged unclosable. And a user would be asked to approve one of four
options, one of which does not work and one of which is recommended on a premise the spec contradicts.
`exception` clears only by `exception -> todo` when the anomaly resolves, so a wrong account of the
anomaly decides when — or whether — anyone tries again.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts, line numbers, live run ids and a HEAD-accurate validate run
- [x] Required gates and residual risks are recorded
