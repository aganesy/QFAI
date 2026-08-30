# R03 — qa-gatekeeper

**Result: REVISE**

- Reviewed revision: `90a33ee5` (HEAD when I started and when I finished).
- The prompt named `bc36f08c`; HEAD moved to `90a33ee5` while I was starting. I verified the only
  difference is `A .qfai/review/review-20260820140000000/review_request.md`, so every artifact under
  review is byte-identical between the two and all measurements below stand at either. The
  discrepancy is the orchestrator's, not a finding.
- `git status --porcelain` was empty when I started, after `ci:lint`, and after all three suite runs.
- Mutations applied: none. Scratch under `tmp/r03-qa/` only. `validate` writes the tracked
  `.qfai/report/validate.log`, so I ran it against a `git archive HEAD` shadow root under `tmp/`
  rather than against the shared tree.

## Gates I ran

| gate | measured | orchestrator's figure | verdict |
| --- | --- | --- | --- |
| `pnpm ci:lint` (11 members) | exit 0 | exit 0 | confirmed |
| `validate --profile tdd --fail-on error` | exit 1, `info=4 warning=358 error=2` | same | confirmed |
| `pnpm -C packages/qfai test:scripts` | exit 0, 10 files, 135 passed | 135 passed | confirmed |
| `pnpm -C packages/qfai test:e2e` | exit 0, 75 passed / 4 skipped (79), 904 passed / 16 skipped (920) | not given | — |
| `pnpm -C packages/qfai test` (unfiltered) | exit 0, 431 passed / 8 skipped (439), **4426 passed** / 37 skipped (4463) | 431 files / 4424 passed | **contradicted, +2 tests** |

The two extra tests are real growth, not flake: the evidence's whole-suite figure
(`4424 passed | 37 skipped (4461)`, evidence lines 106-112) was measured three commits before HEAD,
and `05778274`, `5ce34ff5` and `a910c91c` each added test cases after it. Step 2 does pass at HEAD —
I re-established it — but the recorded number no longer describes the tree.

The two `error=2` findings are `QFAI-ATDD-111` and `QFAI-ATDD-112`. Attribution I measured:

- `QFAI-ATDD-112` spec-0017 members: `TC-0017-0016, 0030, 0032, 0033, 0034, 0035, 0069, 0070` —
  **eight**, exactly the eight `todo` rows. The evidence says nine; that was true before `a910c91c`
  implemented `TDD-0065`. The record is one behind, in the run's favour.
- `QFAI-ATDD-111` spec-0017 members: `US-0017-0001` through `US-0017-0009`. The ledger declares no
  `Layer = E2E` row at all, so no `TDD-*` row carries a `US-*` obligation.
- `TDDLIST_STALE_STATUS` spec-0017: **six** (rows 16, 30, 32, 33, 34, 35), down from the twelve
  `CR-20260818-0006` measured.

## The two things the last round blocked on

### 1. The falsifiability trio — DISCHARGED on substance, NOT on population

Every row that carries the mode also carries all three fields plus a GREEN pair. I checked this
mechanically over the ledger rather than by reading: 20 rows carry `Satisfied-by` **and**
`Falsifiability command` **and** `Falsifiability result` **and** `GREEN command` **and**
`GREEN result`, and no row carries a RED pair together with the trio. Exactly-one-of-two holds.

The trios are substantive, not labels. Each of the 20 names at least one mutation that reddens **that
row**, several name one per claim (`TDD-0036` R1/R2/R3, `TDD-0042` R3/R4/R5, `TDD-0075` R6 to R9), and
several blocks carry a prose control that reddens nothing — which is what separates "the row sees
this" from "the suite was already red".

**But the population is not what the run thinks it is, in two ways.**

**(a) It is 20, not 13.** The review request, and `CR-20260820-0006` itself, both say thirteen. The
seven rows converted by `e4a7295c` — `TDD-0055`, `0056`, `0078`, `0079`, `0080`, `0081`, `0082` — are
on the same path with the same fields and are absent from the CR's not-reset list and from its step-3
cross-check ("confirm thirteen cells"). That cross-check will now fail against the tree, and the CR's
contingency ("the **eleven** rows whose `Satisfied-by` names an artifact must have that cell
rewritten") would miss `TDD-0055`, `0056`, `0080` and `0082`, which also name artifacts.

**(b) At least one row is still missing the trio — and it is the exact defect B7 was about.**
Change 8 (`TDD-0006` through `TDD-0012`, seven rows) records
`RED result (post-seam): Tests 6 failed | 13 passed (19)` and attributes nothing per row. The
arithmetic closes it:

```text
change 7 GREEN                      12 passed (12)        file fully green immediately before
file at 9aced5bb (change 8 base)    12 describes, 12 it   one test per row
file at 2a3ef61c (change 9 base)    19 describes, 19 it   +7, exactly TC-0017-0006..0012
change 8 RED                        6 failed | 13 passed (19)
                                    13 = 12 pre-existing + 1 of the 7 new
```

So **exactly one of `TDD-0006` through `TDD-0012` passed at its own RED**, that row is named nowhere,
it carries no trio, and all seven cells quote the one aggregate as their RED. `5d09f897`'s own commit
message identifies the shape and the likely row: "`TC-0017-0008` asserts the **accepting**
direction … an accepting-direction claim is exactly what a mutation set aimed at rejecting behaviour
will skip" — which is the same reasoning used to place `TDD-0004`, `0018`, `0024`, `0031`, `0068` and
`0075` on the path. I identify the row by arithmetic plus the run's own characterisation, not by
re-measurement: reconstructing change 8's seam would require mutating this shared tree.

Sixteen of the seventeen change blocks reconcile their RED failure count against their row count, with
every passing row carrying a trio. Change 8 is the only one that does not. B7 was fixed in two of its
three locations — measured for the mapping block, reasoned for the shipped-tree block — and missed
here.

**Required:** reconstruct change 8's seam, re-run `tests/scripts/ownWorkflowTopology.test.ts`
file-scoped, record which of the seven passed exactly as the mapping block already did
(`2 failed | 5 passed (7)` reproduced per test), and give that row a trio.

**Ruling on `Satisfied-by` naming a pre-existing artifact while `CR-20260820-0006` is open:
ACCEPTABLE as evidence.** Three reasons. `red-not-observable.md` step 2 and `oracle-strength.md` make
the falsifiability demonstration the load-bearing evidence, not the label, and the demonstration is
present and per-row for all 20. Writing a `TDD-NNNN` that does not exist would be worse, and the same
reference forbids manufacturing a citation in terms ("inventing an unrelated change to tick this box
is worse than the gap it fills"). Routing a reference that cannot express the case to a CR is what
`drift-protocol.md` prescribes. I do not block on it.

Two conditions on that acceptance. The CR must be re-scoped from 13 rows to 20. And it must name the
**three** deviation classes actually in the tree, because its option 1 legalises only the first:

| class | rows | count |
| --- | --- | --- |
| pre-existing artifact or state | 0024, 0025, 0026, 0036, 0038, 0041, 0042, 0043, 0055, 0056, 0068, 0080, 0082 | 13 |
| the no-behaviour **seam** this row's own change created | 0004, 0078, 0079, 0081 | 4 |
| **this run's own production change** | 0018, 0031, 0075 | 3 |

The third class is the one the CR does not mention and the one most worth a decision:
`Satisfied-by: the production edit of change 3 itself` (`TDD-0018`) points at the change the row is
part of, which is neither a sibling row nor pre-existing state.

### 2. The mutant hashes — SATISFIES `oracle-strength.md`, with one inaccuracy in the correction

The correction's measurements reproduce exactly on my machine:

```text
git cat-file -t 9232ee34 / f9c12a13 / 34b1da53 / de01ef97  -> fatal: Not a valid object name (all four)
one-line file "x=1" + newline, git hash-object  -> bafc5d9a1a836cea09dadcec13e66fe498cd997a
a second identical file, git hash-object        -> bafc5d9a1a836cea09dadcec13e66fe498cd997a (identical)
git cat-file -t bafc5d9a...                     -> fatal: could not get object info
```

`oracle-strength.md` never asks for a blob hash. It asks for the smallest production change named,
applied, the row's selector run, the failing output recorded, and an immediate revert. Those are
present per round. So unresolvable hashes are not a gate failure, describing the column as a
fingerprint rather than an address is the accurate statement, and not retracting a correct value is
right. **PASS on the question asked.**

One inaccuracy to fix: the correction says "the needle and the replacement are therefore the
load-bearing record, exactly as `references/oracle-strength.md` asks". That is true of **one** of the
sixteen oracle tables — change 1's, the only one with a `needle -> replacement` column. The other
fifteen record a prose mutation description and a hash, with no literal bytes. In those, the
fingerprint's stated purpose ("a reader who reconstructs the mutant … gets the recorded value back")
is unachievable, so the column is inert. Advisory, not blocking: what `oracle-strength.md` actually
requires — named mutation, reddened assertion with its location, plus controls — is there.

## `TDD-0065` and the timing artifact — the adopted value IS placed; the row is not passing on noise

The accepting condition the row uses is "within ten percent of the fastest measured, with a written
reason". The total measured spread across all three settings is **2.02%** (2.7s on a 133s run). That
bound is **order-independent**: under any permutation of the true ordering, the adopted 10 stays
within 2.02% of whichever setting is actually fastest — five times inside the threshold. One run per
setting leaves the ORDER unestablished, which the artifact states itself, but the order is not what
`EX-0017-0049` needs. Noise would decide the outcome only if the margin approached ten percent, and
the artifact names that as the trigger for a best-of-three. **Sufficient.**

The written reason is independently the strongest part: `BR-0017-0051` reserves the starting value to
the user and `DR-0017-0009` records the instruction, so the row may not adopt 4 even if 4 were proven
fastest.

The row's oracle is the best in the record. `U2` makes the artifact internally consistent **and more
compliant-looking** (adopting the fastest needs no reason) and the row still fails, because the
assertion reads `vitest.knobs.ts` rather than the artifact's own arithmetic. `U3`'s disclosed
self-correction — a mutation that did not actually violate the property, producing a false "reddens
nothing" — is exactly the trap `oracle-strength.md` warns about, caught and written down.

Two caveats. The `vs fastest` column and the "fastest" marker assert an ordering the data does not
support; the Provenance section discloses it, which is the right treatment, but a reader of the table
alone is misinformed (advisory). And the selector carries six claims in one test, so the RED observed
claim 1 only — the other five are covered by `U1` through `U5` rather than by the RED. Selector
granularity is `delivery-planner`'s call; routed there, not adjudicated here.

**But `TDD-0065` fails item 10 outright: its evidence block names no `Revision` and no base
revision.** It is the only block of seventeen with none — change 1 phrases it as "the working tree at
revision `3dbeeef6`", which is acceptable. `Revision` is a required phase-authored field.

## Item 10 — stale locations: FAIL for all 74 rows

Every row's own test file has changed since its block's recorded base revision, by 1 to 13 commits.
Drift since round 4's reviewed `0cd866e9` alone:

```text
ownWorkflowTopology.test.ts   1528 -> 1661   (+133)
workflowHygiene.test.ts       1511 -> 1659   (+148)
actionPinBumpOwner.test.ts     327 ->  462   (+135)
layerCiLaneMapping.test.ts     203 ->  217   (+14)
vitestWorkspaceKnobs.test.ts   325 ->  334   (+9)
```

I resolved all 20 assertion locators recorded in the falsifiability trios and oracle tables against
HEAD. **None of the 20 lands on an assertion.** They land on comments, JSDoc lines, blank lines, a
string literal inside an array, and fragments mid-expression. The drift is not off-by-a-few: the
locators recorded for `TDD-0041` (`:1254`), `0042` (`:1280`, `:1291`, `:1299`) and `0043` (`:1313`)
now sit 94 to 145 lines **before** the `describe` that owns them, and `TDD-0038`'s `:1438` now falls
inside `TDD-0036`'s region (0036's describe is at 1502, 0038's at 1583).

Worse than line drift, **assertions themselves were replaced after the observations that covered
them, with no new observation recorded**. `5ce34ff5` alone:

- L1 — `workflowHygiene.test.ts`: `TDD-0015`'s counter comparison was a tautology "no mutation of
  either counter could fail"; replaced with a reachability comparison plus a second claim. Its
  recorded RED and oracle `Q2` describe the tautology.
- L2 — `layerCiLaneMapping.test.ts`: `TDD-0079`'s literal-versus-literal claim could not be falsified
  by any production change; now asserted against `src/core/layerPolicy.ts`.
- L4 — `TC-0017-0047` / `0048` gained a plant and `DECLARATION_SCOPE`.
- L10 — `TDD-0068`'s retry scan gained a fourth file; its trio was measured over three.
- L12 — `TDD-0066`'s pin regex relaxed; its oracle R5/R6 was measured over the old one.
- L6 — 16 bare `as` replaced with narrowing across the two largest test files.

`05778274` (hygiene lane, `TC-0017-0036` / `0073`), `9c04aa47` (`TDD-0036` / `0038` / `0059`),
`1f453a31` (the ci.yml classifier that `TDD-0006` through `0012` assert over) and `575af2e4`
(ci.yml plus 39 new test lines) likewise changed test or production code. Three of those five commits
did not touch the evidence file at all.

And **no round was opened for any of it**: zero `Round N:` fields and zero `review-fix` states exist
in the ledger or the evidence, against three blocking reviewers returning REVISE in round 4 and rework
that plainly changed production behaviour (the rename flag, the hygiene lane's property 3, the lane's
three PASS-over-nothing fixes, the documentation-versus-executable classifier).
`references/round-evidence.md` requires a round per REVISE needing new production behaviour, and a
refreshed `Refactor verify` pair for one that does not. Neither exists.

`references/evidence-revision.md` is explicit: "A commit that changes any file the observation covered
invalidates it. Re-run the observation; do not carry the verdict forward because 'the change was
unrelated'." Its prescribed ordering — "Measure at the tip, then commit the record and the `done`
transition together" — has not been followed for any row.

## Item 12 — the checkpoint CANNOT pass, and `CR-20260818-0006` is not why

| step | measured | verdict |
| --- | --- | --- |
| 1 file-scoped item test | `test:scripts` exit 0, 135 passed | PASS at HEAD |
| 2 full suite | exit 0, 431 files, 4426 tests | PASS at HEAD (recorded figure stale by +2) |
| 3 static gates | `ci:lint` exit 0, all 11 members | PASS |
| 4 `validate --profile tdd --fail-on error` | exit 1, `error=2` | **FAIL** |

The step-4 substitution does not rescue it, on this spec's own numbers:

- clause 1 — **FAILS**. `implement-spec-0017.md` records no step-4 baseline with counts **and**
  finding IDs before any row started. The only pre-slice number is retrospective prose in change 1's
  block ("raised `validate --profile tdd` from `warning=352` to `warning=369`"). The reference says a
  baseline written after the fact is not a baseline. Contrast `implement-spec-0006.md`, which has the
  section and is what `CR-20260818-0006` cites as holding.
- clause 2 — holds. `QFAI-TEST-001` = 0, measured.
- clause 3 — **FAILS**. `warning=358` against baseline `352`. The excess is exactly **+6**, and all
  six are spec-0017 `TDDLIST_STALE_STATUS` on rows 16, 30, 32, 33, 34, 35 — the CR-blocked `todo`
  rows. 352 + 6 = 358.
- clause 4 — holds. No closing row's `TC-*` is in the `QFAI-ATDD-112` list.
- clause 5 — **holds per row**, and this is worth recording because it is the run's strongest
  position: every spec-0017 finding still open belongs to a row that is not being closed. All eight
  `QFAI-ATDD-112` spec-0017 TCs are the eight `todo` rows; all six stale-status warnings are those
  rows; `QFAI-ATDD-111`'s `US-0017-*` are ATDD obligations the ledger's own Producer note excludes
  from being rows here.

So the checkpoint fails on clauses 1 and 3 regardless of how `CR-20260818-0006` is decided. Approving
that CR is **necessary but not sufficient** — clause 1 would still fail, and clause 1 cannot be
repaired retroactively. That is the finding to carry: the run is right that clause 3 is unattributed
(clause 5 answers the same question per row and reaches the opposite result on the same six warnings),
and right that the checkpoint does not pass. It is not right that clause 3 is the only obstacle.

No `Checkpoint verification command` / `Checkpoint verification result` field exists anywhere in the
evidence.

## Per gate item, over the 74 `refactor` rows

| item | verdict | measurement |
| --- | --- | --- |
| 1 TDD-ID selected | PASS 74/74 | — |
| 2 test added first | **FAIL 5** (`TDD-0001` to `0005`), PASS 69 | the run records "the production body was authored BEFORE the test file … no later measurement makes it so"; those five cells say "test-first NOT met". Includes `TDD-0004`, a trio row |
| 3 RED observed or substitute | PASS 20 trio + 47 others at their base revision; **UNRESOLVED 7** (`TDD-0006` to `0012`) | one of the seven passed at RED, unidentified, no trio; plus no current observation for the assertions replaced after the fact |
| 4 minimal production code | PASS or waived | — |
| 5 GREEN + `Oracle proof` | PASS on substance 74/74 | named mutation per row, reddened claims, prose controls; `mutant` column inert in 15 of 16 tables |
| 6 refactor + GREEN re-confirmed | **FAIL 74/74** | no `Refactor verify command` / `Refactor verify result` anywhere — one prose mention at evidence line 418, no pair |
| 7 completion-reviewer PASS | **FAIL 74/74** | zero verdict fields; 16 blocks state the verdicts were not obtained |
| 8 implementation-reviewer PASS | **FAIL 74/74** | same |
| 9 prototype parity | N/A | no UI-affecting row |
| 10 status + anchor + same revision | anchors **PASS 74/74**; revision **FAIL 74/74** | all 74 `#tdd-NNNN` pointers resolve, checked mechanically; 20 of 20 assertion locators stale; `TDD-0065` names no revision; items 7-8 have no revision at all |
| 11 both verdicts appended | **FAIL 74/74** | — |
| 12 checkpoint | **FAIL 74/74** | step 4 exits 1; substitution fails clauses 1 and 3 |

## May each row proceed to `done`?

**No row may.** All 74 `refactor` rows are held by items 6, 7, 8, 11 and 12 — five all-conditions
items that fail for every row, four of them by the run's own record and one (item 12) by my
measurement. Item 10 fails for all 74 as well.

Additional per-row blocks on top of that, which must be cleared even after the reviews run:

- `TDD-0001`, `0002`, `0003`, `0004`, `0005` — item 2, not repairable by measurement.
- `TDD-0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012` — item 3: identify the row that passed at
  change 8's RED and give it a trio.
- `TDD-0065` — item 10: the block names no revision.
- `TDD-0008`, `0015`, `0036`, `0038`, `0047`, `0048`, `0059`, `0066`, `0068`, `0079` — items 3 and 5:
  their assertions, or the production code under them, changed after the recorded observation, with no
  round opened and no refreshed pair.

The eight `todo` rows are correctly `todo`; each names its blocker, and all eight are the sole
spec-0017 population of `QFAI-ATDD-112`, which is consistent.

## Advisories (do not block; do not implement as production code)

1. `CR-20260820-0006` must be re-scoped from 13 to 20 rows and must name all three `Satisfied-by`
   deviation classes; its step-3 cross-check as written will fail against the tree.
2. The correction's claim that needle-plus-replacement is the load-bearing record holds for 1 of 16
   oracle tables.
3. `TDD-0055` / `0056`'s "THIS ROW WAS AMONG THE PASSING" is asserted, not measured, while the mapping
   block set the standard by measuring it. Same finding, two standards of proof.
4. The timing artifact's `vs fastest` column asserts an ordering that one run per setting cannot
   establish.
5. The evidence's whole-suite figure and its `QFAI-ATDD-112` "nine" are each one or more commits behind
   HEAD (4424 versus 4426; nine versus eight).

## Scope of this verdict

This ruling covers RED/GREEN observation evidence, oracle strength, and the gate items the orchestrator
assigned. It does not adjudicate item scope or selector granularity — `delivery-planner` owns those,
and `TDD-0065`'s six-claims-in-one-selector is routed there. No PASS recorded here widens any row's
scope, and nothing here clears the completion gate.

## The tree moved under this review — ruling PINNED

Recorded per `references/evidence-revision.md` § "When the tree moved under a reviewer", which
requires a reviewer who noticed this to say so and pin the ruling to a named revision. **Pinned form:
every measurement in this document was taken between 14:45 and 14:50 local, at `90a33ee5`, with
`git status --porcelain` empty — verified before `ci:lint`, after `ci:lint`, and after all three suite
runs.**

At 15:02:54 to 15:04:41, while this round was open, four files were modified in the shared working
tree by another agent (not by me — my only write is this gitignored pack file, and I edited no source
or test file at any point):

```text
 M .github/workflows/ci.yml                                    15:02:54
 M packages/qfai/tests/scripts/workflowHygiene.test.ts          15:02:54
 M packages/qfai/tests/scripts/ownWorkflowTopology.test.ts      15:03:16
 M packages/qfai/tests/assets/layerCiLaneMapping.test.ts        15:04:34
```

HEAD is still `90a33ee5`; these are uncommitted working-tree edits. They are not oracle mutations —
they carry finished comments and cite review findings, so they are rework being applied live.

**Two consequences.**

First, my verdict stands for `90a33ee5` + clean tree and is stale for any later state. Three of the
four files are the test files the rows under review assert through, and `ci.yml` is production code
`TDD-0006` through `TDD-0012` assert over, so the numbers above must be re-measured before any row
transitions.

Second, and more important, the edit to `layerCiLaneMapping.test.ts` **independently confirms the
central finding of this review.** Its own new comment reads:

> the first version searched all of `layerPolicy.ts` for the catalog's name, and that name occurs SIX
> times there — once in JSDoc and four times inside Japanese diagnostic strings … So changing the
> resolved filename left both halves green: the same vacuity as the `--no-renames` claim this run
> shipped and repaired, and found here by an implementation review rather than by an oracle, which is
> the weaker of the two ways to find it.

That is the L2 fix from `5ce34ff5` — one of the rework's own new claims — being repaired for being
vacuous. It is the **third** vacuous claim this rework has shipped (`--no-renames` in `575af2e4`,
caught by `5d09f897`; L1's tautology, caught by `5ce34ff5` itself; now L2, caught after commit). All
three were assertions added or replaced without a RED, a GREEN or an oracle round of their own, which
is precisely the gap recorded under item 10 above. The rework's claims are not incidentally unverified
— the defect rate among them is now measured at three.

The remedy does not change: open a round per changed assertion, observe it, and re-measure at the tip
before any row moves to `done`.
