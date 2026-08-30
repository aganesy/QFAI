# R04 — qa-gatekeeper, P1d branch-3 DR gate (round 4)

- Reviewer: `qa-gatekeeper`
- Stage: `/qfai-atdd spec-0017`, gate **P1d** (third re-route)
- Audit subject: `.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`,
  plus `.qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md`
  insofar as the `blocked` re-classification hangs on it, and the row's handover entry in
  `.qfai/evidence/atdd-spec-0017.md`
- Rows: `TDD-0069`, `TDD-0070`
- Revision reviewed: `54d8d325`
- Prior verdicts: **REVISE** on `16f611c7` (`.qfai/review/review-20260820220000000/R04_qa-gatekeeper-p1d.md`)
  and **REVISE** on `1473897a` (`.qfai/review/review-20260821000000000/R04_qa-gatekeeper-p1d.md`)
- Verdict: **REVISE**

## Provenance of this run

`git rev-parse --short HEAD` = `54d8d325` at start **and** at finish; `git status --porcelain` empty at
both. HEAD did not move. Nothing was mutated except this file; scratch under `tmp/r04-p1d-round4/`.

HEAD-accurate validate evidence was obtained read-only, because `.qfai/report/validate.log` is tracked
and shared: `git archive HEAD` into `tmp/r04-p1d-round4/shadow`, with the 83 tracked symlink entries
enumerated from the index and every one confirmed content-reachable in the shadow (`missing=0 of 83`).
Three runs against that root — `--profile atdd --spec 0017`, `--profile tdd` (unscoped), `--profile full`
(unscoped). All outputs landed in the shadow's `.qfai/report/`; the tracked log was not touched.

Each shadow run reports one extra `QFAI-LINK-001` that the real tree does not have: `tar` dereferenced
the integration symlinks into real directories, so the guard sees "directory, not a symlink" for 70
wrappers. It is an artifact of the shadow and is excluded from every count below.

Live evidence: PR #794 (**OPEN**, body quotes **zero** run identifiers), and runs `32375136373`
(`headSha 54d8d325`), `32375018275`, `32370926286`, `32370813280`, `32370185891`.

## What round 3 required, and what the revision did

| Round-3 required fix                                                                            | Status                                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1. Make the handover say what the revision decided — the table row **and** the four statements   | Table row **done**; the four statements are **untouched** — **B1**  |
| 2. Correct the clause-1 finding                                                                  | Restated, and **false in a third direction** — **B2**               |
| 3. Complete the cycle account in both artifacts; withdraw or re-scope option 2                   | Three strands added and accurate; the largest strand is **missing** — **M1**. Option 2 not withdrawn — **M2** |
| 4. Re-frame option 1 as narrowing the guard; optionally add option 5                             | **Done, and done well** — Judgement 4. Option 5 added, warrant false — **M3** |
| 5. Housekeeping (N2 branch-2 citation, N3 paragraph, N4 header)                                  | N2 **done**; N3 and N4 **not done** — advisory                      |

## Verified correct at this HEAD

1. **Row identity is still exact on all three fields, both rows**, against
   `.qfai/specs/spec-0017/tdd/test-list.md:107-108`: `Layer = Integration`,
   `Test file = packages/qfai/tests/assets/actionPinBumpOwner.test.ts`, and the two selectors verbatim.
2. **Nothing has been written ahead of this gate.** Both rows are `todo` with `DR-ID = -` and
   `Blocked-By = -`.
3. **Obligation references are exact.** `06_Test-Cases.md:134-135` gives `TC-0017-0069 -> EX-0017-0053`
   and `TC-0017-0070 -> EX-0017-0054`, both under `AC-0017-0029`, whose parent is `US-0017-0007`.
4. **`EX-0017-0053` is still quoted verbatim** in the DR (lines 45-46) against `05_Examples.md:84`.
5. **The ID space is clean.** `07_Decisions.md` ends at `DR-0017-0009`; one `DR-0017-*` in
   `.qfai/decisions/`.
6. **Both errors persist at this HEAD, and their spec-0017 membership is exactly as recorded.** My own
   scoped run: `QFAI-ATDD-111` names `SPEC-0017:US-0017-0007`; `QFAI-ATDD-112` names
   `TC-0017-0016, 0030, 0032, 0033, 0034, 0035, 0069, 0070`.
7. **`QFAI-ATDD-112`'s eight spec-0017 TCs are exactly the six `blocked` rows plus these two.** Verified
   row by row: `TDD-0016` (`CR-20260818-0007`), `TDD-0030` (`CR-20260820-0001`), `TDD-0032`, `TDD-0033`,
   `TDD-0034`, `TDD-0035` (all `CR-20260820-0007`). Three other Change Requests, as the CR says.
8. **`QFAI-ATDD-111` stands deliberately, by this stage's own decision.**
   `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:750-768` records the withdrawal, the
   reason (the assertion duplicated `initE2E.test.ts` and added no discriminating power), and
   "So `QFAI-ATDD-111` reports `US-0017-0007` again, deliberately". The CR's B3 repair is accurate.
9. **`build` at HEAD fails and `ci-pass` with it, with every other lane green.** Run `32375136373`:
   `build` failure, `ci-pass` failure, `detect` / `lint` / `check-types` / `check-types-future` /
   `scanner-coverage` and all **seven** test legs success.
10. **The three cited runs exist and are consecutive.** `32370185891` (12:41:52), `32370813280`
    (12:49:01), `32370926286` (12:50:16), nothing between them.
11. **The `blocked` clause genuinely applies to `TDD-0069`.** Re-verified, third round:
    `execution-ledger.md:185-187` admits `todo -> blocked` on "an upstream defect, an unresolved Change
    Request, or an unfinished row in another spec"; `CR-20260820-0012` is `Status: open`,
    `Approved option: -`, and names `spec-0017 TDD-0069` in its `Blocked set`.
12. **`TDD-0070`'s own account is sustained, for the fourth round.** `BR-0017-0054`
    (`04_Business-Rules.md:103`) and `EX-0017-0054` (`05_Examples.md:85`) both scope the measurement to
    **default-branch** verdict runs **after a merge**, at a rate over one in twenty. That surface cannot
    exist on the branch that introduces the tuning: branch 1 fails on the GREEN side, branch 2 has no
    satisfied state to mutate, `exception` with a `DR-*` is the right shape. Nothing below touches this
    row's own reasoning.
13. **The Coverage Depth Matrix exists at a committed path** — `.qfai/evidence/coverage-depth-spec-0017.md`,
    and `git ls-files` confirms it is tracked. Outside this gate's audit subject; recorded because my role
    contract requires the check from the ATDD cycle onward and the artifact is present.

## Judgement 1 — the asymmetry disclosure is adequate, and the asymmetry is not being used to route around me

Asked directly. The disclosure at `.qfai/evidence/atdd-spec-0017.md:276-281` names the asymmetry in one
sentence ("`exception` needs a P1d `qa-gatekeeper` PASS and `blocked` does not"), states the consequence
("re-classifying `TDD-0069` moved it out of the gate its twin still has to pass"), and gives the merits
ground plus the fact that `blocked` is the more conservative of the two. That is the disclosure I would
have asked for, made unprompted, in the section where a reader of the handover meets the row.

And the substance holds, on the same three grounds round 3 found and I re-verified: `blocked` is
**completion-prohibiting** while `exception` **satisfies** completion (`execution-ledger.md:330-338`), so
the stage traded a closeable status for an uncloseable one; the clause literally fits; and round 3
required the filing in as many words. A stage routing around a gate keeps the status the gate had already
blessed and repairs the prose. This one did the opposite, twice now.

**One mechanical defect in how the disclosure is carried, which is B1's second half.** The table now puts
`CR-20260820-0012` in the column headed `DR-ID`. `execution-ledger.md:56-61` forbids exactly that
widening, and gives the reason this gate cares about: "`DR-ID` is **not** widened to carry it: that column
is what distinguishes a parked `exception` from a row that never started, and overloading it would merge
the two states the `blocked` status exists to separate." The handover table is the index
`/qfai-implement` reads to decide what goes in the ledger's `DR-ID` and `Blocked-By` cells, so the
overload here is how it gets copied there. The fix is a column, not a paragraph.

## Judgement 2 — the branch-2 citation is now the right clause

Asked whether reasoning from branch 2's **GREEN pair** requirement is correct rather than from "exactly
one form per row". It is. `references/red-provenance.md` "Evidence shape", falsifiability row, ends the
required set with **`GREEN pair`**, and the branches section says it in prose: "the mutation run satisfies
`todo -> red` and the restored passing run is the GREEN. ... Hand the pair over in that order." A row
whose obligation cannot go green on this branch cannot produce the restored run, so branch 2 is
unavailable **for the row** however falsifiable its other clause is. The DR states this at lines 147-150
and no longer attributes it to the wrong sentence. Round 3's N2 is discharged.

## Judgement 3 — the cycle strands that were added are accurate, and the one that dwarfs them is absent

See **M1**. The three strands the revision added — `QFAI-ATDD-111` standing deliberately, the eight TCs
being the six `blocked` rows plus these two, and `TDD-0069` therefore blocked on `TDD-0070` — are each
verified true (items 6-8 above). What both artifacts still get wrong is the **scope** of the gate they are
reasoning about.

## Judgement 4 — option 1's corrected warrant is honest enough to decide on

This is the part of the revision I would sustain without qualification.

It opens by naming its own prior error ("This is an amendment, not a reading, and the first version of
this CR presented it as a reading"). Every citation checks out: `BR-0017-0001` does require the verdict to
"compute its result by iterating its serialized `needs` map" (`04_Business-Rules.md:50`); `BR-0017-0004`
does make the check name immutable (`:53`); `01_Spec.md:137` does read "the aggregate verdict is the
single observed signal"; and `AC-0017-0029` (`03_Acceptance-Criteria.md:311-320`) uses the term the same
way. The rationale correction is right too — `BR-0017-0053`'s reason is "OC-80. Batching two projects into
one pull request makes an emergent race unattributable", which is **attributability**, not pipeline
stability, so the first version's warrant was invented. And the ask is now put as what it is: "a decision
to weaken a guard, and the user should be asked for it as one", with the reason the excluded lane is
parallelism-insensitive stated ("a `validate` error about annotation completeness says nothing about it").

The evidence position is corrected honestly as well — "two-thirds present, not present" — and I confirm
both halves: the three runs exist, and PR #794's body quotes **zero** run identifiers.

One advisory, not a defect of honesty: the run list is enumerated, and a fourth such run now exists
(`32375136373` at HEAD, green everywhere but `build`). Every commit adds one, so the list goes stale by
construction. State the derivation rule instead — the same lesson `CR-20260820-0006` recorded as "the
number is not the check. Derive it from the ledger."

## Judgement 5 — option 5, judged adversarially, and it does not survive as written

It was my role's suggestion in round 3, so I put it under the same test as option 1: is it a legitimate
Drift Protocol change, or does it dissolve an obligation by rewriting the artifact that states it?

**Procedurally it is legitimate.** It edits `05_Examples.md`, it says so, and it routes through the Drift
Protocol rather than reinterpreting inline. `AC-0017-0029` already states the two obligations as separate
`And` clauses, so splitting the example is not inventing a partition the spec resists.

**Its warrant is false, and the falsehood is load-bearing.** The CR recommends option 5 first on the
ground that "it changes no obligation, only how many rows carry them". `AC-0017-0029:319` reads: "And
**each such** pull request records three consecutive green aggregate-verdict runs before merge, with the
run identifiers quoted in the description." Each such — the pull request that lands one tuning change,
largest project first. The three greens are the greens **of that change**. That binding is not incidental
packaging; it is the attributability property `BR-0017-0053`'s own rationale names (OC-80). Split as the
CR words it — "one for 'exactly one runner project is tuned, largest first' and one for the three green
runs" — the second half loses its subject, and the two halves become independently satisfiable: one
project tuned in PR A, three greens quoted in PR B, with nothing checking that those greens are that
tuning's. That is a weakening described as a re-partition, which is the exact criticism the CR correctly
levels at option 1's first framing.

The split is recoverable, and cheaply: clause 2's new example must keep the subject "a pull request that
lands exactly one tuning change, largest project first" rather than becoming "three green runs are
quoted". Then nothing is dissolved. But the CR has to say that, because as worded the reader approves the
dissolution.

**Does it help at all?** The CR's own paragraph cannot decide. It says the split "does **not** close
`TDD-0069` on its own" because clause 1 is degenerate and its row "would be unfalsifiable rather than
blocked" — and then, four lines later, that "what the split buys is that a reachable half stops being
parked behind an unreachable one". Both cannot be true: if clause 1 is unfalsifiable, its half is not
reachable and the split buys only bookkeeping. On my corrected reading (**B2**) clause 1 *is* reachable,
and the split buys considerably more than the CR claims — an ordinary branch-2 guard row. Either way the
paragraph as written argues against itself, and it does so because it inherited **B2**'s error.

## Blocking findings

### B1 — the table was repaired and the section it points at was not, so `TDD-0069`'s entry now contradicts itself

`references/red-provenance.md:267` makes `## Ledger rows advanced` an index: "one row per `TDD-*`, holding
the branch and an anchor", with the payload in "that row's own `### TDD-NNNN` section". The entry is
therefore the table row **and** the anchored section. At HEAD they say different things.

The table row (`.qfai/evidence/atdd-spec-0017.md:262`) is now correct on the branch:

```text
| `TDD-0069` | Integration | `TC-0017-0069` | none — `blocked`, not a branch | `CR-20260820-0012` | § `TDD-0069` |
```

The section it anchors is **byte-for-byte unchanged from the revision round 3 rejected**.
`git diff 1473897a..HEAD -- .qfai/evidence/atdd-spec-0017.md` touches lines 259-281 and lines 364-369; it
does not touch lines 326-352 at all. So all three statements round 3 required repaired are still there,
verbatim, plus a fourth:

- **line 336** — branch 1 is unusable "because the workflow changes are unmerged", the sentence the DR
  retracts at its own lines 86-89 as false for this row;
- **lines 339-340** — "Branch 2 (falsifiability) is unavailable ... there is no run history to mutate",
  the argument the DR describes at lines 138-142 as having reached the right place by a wrong route, and
  which omits clause 1 entirely — the omission round 2 opened this whole sequence over;
- **line 342** — "**Branch 3 it is**, recorded in `DR-0017-0010`", contradicting the table's own
  "`blocked`, not a branch" nine lines earlier and the DR's Decision section at lines 169-172;
- **line 346** — "The row stays `todo` in the ledger until `/qfai-implement` writes `todo -> exception`",
  which is the transition this revision exists to prevent.

No supersession marker anywhere in the section. A consumer following the anchor gets three mutually
exclusive instructions for one row: branch `none — blocked` from the table, `DR-0017-0010` as a `DR-ID`
from the same table's overloaded column, and "write `todo -> exception`" from the section. Step 3b's own
rule decides what that is: an entry "malformed in any other way leaves the row at `todo` and stops with a
handoff note" (`qfai-implement/SKILL.md:116`). The handover quotes that rule at its own lines 348-351 and
then fails it.

Second half, from Judgement 1: the `DR-ID` cell holds a `CR-*` id, which `execution-ledger.md:56-61`
forbids by name and for the reason that applies here — the column is what separates a parked `exception`
from a row that never started. Add a `Blocked-By` column and leave `DR-ID` as `-` for this row, mirroring
the ledger's own two columns.

### B2 — the clause-1 finding is now false in a third direction, and it is contradicted by the two artifacts it cites for support

DR lines 130-142 replace round 3's overstatement with a new one:

> Clause 1 is therefore **degenerate rather than satisfied**: not "true of the current state and
> falsifiable", but not expressible against this runner at all. ... a test over clause 1 could not be
> reddened by that mutation or by any other.

The two citations under it are accurate as far as they reach, and I verified both:

- `packages/qfai/vitest.knobs.ts:20-25` — "A first attempt declared the worker axis on every project. It
  type-checked, it ran, it emitted no warning — and it did nothing. Measured on the `validators` project,
  constraining the worker override to one against the declared default gave a wall-clock ratio of 0.93,
  which is noise." `rootKnobs` holds `maxWorkers` / `minWorkers` / `fileParallelism`;
- `CR-20260820-0003:56` — **open**, class `intent` — "The runner also has no runtime complaint to make: it
  drops unknown project options silently."

**But neither supports the absolute claim, and both contradict it.**

- That measurement is explicitly about **the worker override**. It cannot support a claim about any other
  axis, and `CR-20260820-0003`'s title scopes the whole finding to two knobs: "requires every project to
  declare **a worker setting and a file-parallelism setting**, and the runner scopes both to the root".
- `CR-20260820-0003:83-89` — the table three lines below the sentence the DR quotes — tabulates
  `maxConcurrency` as site "each project", why "**project-scoped**", alongside `pool` /
  `poolOptions.forks` and the two timeouts. Only `maxWorkers` / `minWorkers` / `fileParallelism` are
  root-only.
- `vitest.knobs.ts:104` puts `maxConcurrency: tunable(CONCURRENCY_ENV)` in `projectKnobs`, i.e. a
  **tunable** project-scoped axis, and the same docstring the DR quotes says "everything genuinely
  project-scoped stays per project" (`:27-28`).
- `vitest.workspace.ts` spreads `projectKnobs` into each of the seven projects and then overrides. A
  differential `maxConcurrency` on `core` alone is a one-line, runner-honoured, per-project parallelism
  tuning change — and the within-file concurrency axis is one of this spec's **two** declared tuning axes
  (`BR-0017-0048`: "ten on the worker axis and ten on the within-file concurrency axis, and each declared
  value MUST stay overridable").

So a mutation that would redden a test over clause 1 exists, it is cheap, and it is in the file the DR
read. "Or by any other" is false.

**And the obligation is not about the runner's option scoping at all.** `BR-0017-0053`
(`04_Business-Rules.md:102`): "Each parallelism tuning **change** MUST land on its own pull request,
largest project first". `TC-0017-0069`'s expected result (`06_Test-Cases.md:134`): "A tuning **change**
touches one project and records three consecutive green verdict run identifiers". `EX-0017-0053`'s subject
column: "A parallelism tuning **pull request** and its recorded aggregate-verdict runs". The assertable
object is a change, not a runner state — and this repository's own third artifact reads it that way:
`.qfai/evidence/timing-workers-spec-0017.md:69-71` says "`BR-0017-0053` governs per-project tuning and
requires one project per pull request behind three green verdict runs — `TDD-0069` owns that and is not
satisfiable until this branch has verdict runs to quote." It attributes the unsatisfiability to clause 2,
not to per-project inexpressibility.

The correct finding is narrower than all three attempts and reaches the same destination: **clause 1 is
unsatisfied, not degenerate.** No tuning change exists on this branch — this PR lands the declared
starting value, which `BR-0017-0048`'s note distinguishes from an adopted final one — so there is no
satisfied state for branch 2 to mutate. Branch 2 stays unavailable, for a reason that is true.

The difference is not cosmetic, which is why this blocks rather than being filed as an advisory.
"Degenerate" is a claim about the runner: it survives any spec edit, and it is the sole ground on which
option 5's help is discounted and on which option 5's paragraph contradicts itself (Judgement 5).
"Unsatisfied" is a claim about this branch: a later tuning pull request clears it. A user choosing between
options is choosing on that distinction.

This is the third consecutive round in which this record has stated a mechanical fact about the runner
that the repository already knew was false, and the third in which the error runs in the direction that
makes branch 3 look more inevitable than it is.

## Major findings — they govern a user decision, not either ledger write

Recorded separately from B1/B2 on purpose. `references/red-provenance.md` fixes P1d's audit subject as the
row identity, the obligation reference, the `DR-ID` and the DR artifact; `CR-20260820-0012` is in scope
only insofar as the `blocked` re-classification hangs on it, and that needs the CR **open and naming the
row**, both true. Its option set is the user's input, not a precondition of a transition. Round 3 treated
option-set defects as blocking; I am narrowing that so the loop terminates. These must be fixed before the
user is asked to approve an option — not before the ledger is written.

### M1 — the cycle account is still missing its largest strand: `build` validates the whole repository, unscoped

Both artifacts reason about `build` while quoting the **scoped** membership.
`.github/workflows/ci.yml:376-428` runs three dogfooding steps — `--profile tdd`, `--profile sdd`,
`--profile full` — each with `--fail-on error --root .`, **no `--spec`**, under `set -euo pipefail`. My
unscoped `--profile tdd` run against the HEAD shadow, which is what `build`'s failing step executes:

```text
QFAI-ATDD-111  12 US   spec-0003 (8), spec-0006 (1), spec-0008 (1), spec-0015 (1), spec-0017 (1)
QFAI-ATDD-112  15 TC   spec-0003 (1), spec-0008 (4), spec-0015 (2), spec-0017 (8)
```

So "`QFAI-ATDD-112` clears only when all eight of its TCs are annotated" is the spec-0017 slice imported
into a claim about a repo-wide gate. `build` needs all **fifteen**, and `QFAI-ATDD-111` needs all
**twelve**. Eleven of those US and seven of those TCs belong to four other specs — and this handover's own
Gaps item 4 says closing them "is each owning spec's next `/qfai-atdd` run", explicitly not this stage's
work.

That is the dominant strand and it is in neither artifact. It also settles two things the CR leaves open:
**option 2 fails a second, independent way** (exempting a spec's own in-flight TCs leaves
`QFAI-ATDD-111`, which has no ledger rows to exempt, and leaves other specs' members of `-112`), and
**option 1 is the only option that works**, because removing the row's dependence on `ci-pass` is the only
move that does not route through four other specs' annotation debt. The CR reaches "option 1 does survive"
already; it should reach it for this reason.

The `full` profile adds nothing permanent: at HEAD the only extra errors are `QFAI-REVIEW-004` /
`QFAI-REVIEW-005` against `.qfai/review/review-20260821020000000`, i.e. this round's own pack, which clears
when this report and its `summary.json` land. Round 3's finding on the previous two packs is **fixed** —
both now carry `summary.json`.

### M2 — option 2 was not withdrawn or re-scoped

Round 3 required it, and the CR still presents it as "Breaks the cycle for every future row of this class,
not just this one". At this HEAD it breaks the cycle for no row: `QFAI-ATDD-111` survives it, and by M1 so
does `QFAI-ATDD-112`. The over-determination paragraph at the end of the CR does not reach into the option,
and a user reading the options in order meets the false claim first.

### M3 — option 5's warrant, and its self-contradiction

Judgement 5. "Changes no obligation" is false against `AC-0017-0029:319`'s "each such pull request"; and
the paragraph's two sentences about clause 1's reachability cannot both hold.

## Advisory

- **A1.** The ledger's own `Evidence` cell for `TDD-0069` (`tdd/test-list.md:107`) still opens "**NOT
  BLOCKED by a CR** - waiting on data that does not exist yet", repeats "the workflow changes are
  unmerged", and ends "The row becomes implementable once the pull request has three green ci-pass runs to
  cite" — the exit the DR retracts as unreachable. This stage cannot repair it (`/qfai-atdd` is never the
  ledger's writer), which is precisely why the handover must be unambiguous: whoever writes
  `Blocked-By: CR-20260820-0012` must replace that Evidence text in the same edit, or the ledger will
  carry a `CR-*` blocker next to the words "NOT BLOCKED by a CR".
- **A2.** Round 3's N3 and N4 are not done. DR lines 191-198 still open "`blocked` was considered for both
  and is wrong" and close by adopting it for `TDD-0069`; the `Rows:` header still lists both rows without
  saying which one the record now backs.
- **A3.** Option 1's run list is enumerated and a fourth qualifying run exists at HEAD (`32375136373`).
  Derive it, do not list it.
- **A4.** `.qfai/evidence/atdd-spec-0017.md:375` still groups "these two rows, the six `blocked` ones" as
  distinct categories after one of the two has joined the six.

## Gate decision

**REVISE.**

**`/qfai-implement` may NOT write `todo -> exception` for `TDD-0070`.** That row's own account is sound and
I sustain it for the fourth round — its handover table row and its `### TDD-0070` section are both correct,
and the section now says plainly that the transition is still owed a P1d PASS. What blocks the write is the
record its `DR-ID` cell would point at: the DR states, for the third consecutive round, a mechanical
falsehood about the runner (**B2**), contradicted by the table inside the very Change Request it cites and
by the file whose docstring it quotes. A `DR-ID` cell is a permanent pointer and `exception` clears only by
`exception -> todo`, so the record has to be right about both rows it covers.

**`/qfai-implement` may NOT write `todo -> blocked` for `TDD-0069` either.** The **status is correct** and
needs no verdict from me — `blocked` requires no `DR-*` and no `qa-gatekeeper` PASS, I have now confirmed
the clause applies three rounds running, and the asymmetry was disclosed rather than exploited
(Judgement 1). What blocks the write is purely that the entry it would be written from is
self-contradictory (**B1**): the table says `blocked`, the anchored section says "Branch 3 it is" and
"writes `todo -> exception`", and the `DR-ID` cell carries a `CR-*` id the ledger contract forbids that
column to hold. Acting on it, step 3b's own rule leaves the row at `todo` with a handoff note.

**Why REVISE costs no progress.** `TDD-0069`'s entry is malformed regardless of what I decide, so it stays
at `todo` either way and the stage cannot close either way. Passing `TDD-0070` now would not release the
stage; it would only freeze the DR's third false clause-1 statement as the cited anomaly record before the
repair lands. The remaining blocking set is two items, both mechanical, both verifiable in one read.

## Required to clear this gate

1. **Repair the anchored section, not just the index.** `.qfai/evidence/atdd-spec-0017.md` lines 333-352:
   drop "because the workflow changes are unmerged"; replace the branch-2 sentence with the corrected
   clause-1 / clause-2 finding; replace "**Branch 3 it is**, recorded in `DR-0017-0010`" with the `blocked`
   classification; replace "until `/qfai-implement` writes `todo -> exception`" with `todo -> blocked` and
   `Blocked-By: CR-20260820-0012`. And give the table a `Blocked-By` column so no `CR-*` id sits under
   `DR-ID` (`execution-ledger.md:56-61`).
2. **State clause 1 correctly, in the DR and in option 5.** It is **unsatisfied, not degenerate**: no
   tuning change exists on this branch, so branch 2 has no satisfied state to mutate. Say that the
   root-scoping finding is scoped to the **worker** and **file-parallelism** axes —
   `CR-20260820-0003:83-89` tabulates `maxConcurrency`, `pool` / `poolOptions.forks` and the timeouts as
   project-scoped — and that the 0.93 measurement covered the worker override only. Drop "or by any other".
3. **Complete the cycle account with the strand that dominates it** (M1): `build` runs three unscoped
   profiles at the repo root, so `QFAI-ATDD-111` needs 12 US and `QFAI-ATDD-112` needs 15 TCs, across five
   specs, and four of those specs are outside this stage's work by the handover's own Gaps item 4. Then
   **withdraw or re-scope option 2** in the option text, not only in the closing paragraph.
4. **Fix option 5's warrant** (M3): the split must keep clause 2's subject bound to "a pull request that
   lands exactly one tuning change, largest project first", because `AC-0017-0029:319` says "each such pull
   request" and `BR-0017-0053`'s OC-80 rationale is attributability. Resolve the paragraph's
   self-contradiction about clause 1's reachability once item 2 is applied.
5. **Housekeeping** (A2, A3, A4), and hand item A1 to whoever writes the ledger cell.

## Residual risk if this were passed as-is

`/qfai-implement` would either stop on `TDD-0069`'s self-contradictory entry — the likeliest outcome, and
merely another round — or resolve the contradiction in favour of the anchored section and write
`todo -> exception, DR-0017-0010` for a row this stage judged unclosable, putting a completion-satisfying
status on it. And `DR-0017-0010` would stand as the permanent anomaly record for `TDD-0070` while asserting
that a per-project parallelism tuning surface does not exist against this runner, three lines away from the
table in `CR-20260820-0003` that says it does. `exception` clears only by `exception -> todo` when the
anomaly resolves, so a wrong account of the anomaly decides when — or whether — anyone tries again.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts, line numbers, live run ids, and a HEAD-accurate validate run taken
      read-only in a shadow root
- [x] Required gates and residual risks are recorded
