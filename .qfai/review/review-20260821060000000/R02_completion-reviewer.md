# R02 — completion-reviewer, round 6

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 6
- **Reviewed revision: `cb91e089`.** `git rev-parse --short HEAD` was `cb91e089` at start and at
  finish; `git status --porcelain` was **empty** at both. HEAD did not move.
- **Audited evidence hash (stage review):
  `sha256:e94f2f9c3de6938a8043428977a779127f1e1333889f70d61f149c358107e6a6`** — the four steps of
  `constitution/shared-skill-delegation-baseline.md:395-441`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status`
  (`154a8d32af6eaa0c19f9fd1c421aeeab4badcc36607af50cf5eb6fb9bdad2512`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`7a4ef207ba48989d48da9a83a33889b2e54e7a174aadf9747d7838be5a111f5c`), serialized as
  `path + NUL + sha256` sorted by path, hashed. `## Final status` is at `:915` and no `##` heading
  follows it, so truncating and excising remain byte-identical operations.
- Authored/edited under review: **none.**
- **Mutations: none.** Every finding below is derivable read-only. The eleven oracle rounds in B2 were
  run against **in-memory copies** of the record, never against the tracked file — the mutation exists
  only inside `tmp/r6/oracle*.mjs`, so there was nothing to revert. `validate` ran twice against a
  `git archive HEAD` shadow root at `tmp/r6/shadow` with all **83** tracked symlinks re-materialised
  natively from the index (`total=83 created=83 verified_as_links=83`); the tracked
  `.qfai/report/validate.log` is `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` before and after, equal to
  `git rev-parse HEAD:.qfai/report/validate.log`. Scratch under `tmp/r6/` only. No `git checkout` /
  `stash` / `reset`, no commit, no push.
- **Shadow artifact, disclosed:** every shadow run reports one extra `QFAI-LINK-001` (70 wrappers read
  as dangling under the shadow root, although the link targets are present in the archive — a
  resolution artifact of the non-checkout tree, as rounds 4 and 5 also recorded). It is excluded from
  every count below.

## Verdict summary

**Six blocking, five major, six minor.**

**The suite is GREEN at the revision under review, and round 5's B1 is closed on the merits.** I
checked the colour before anything else, as instructed: `pnpm -C packages/qfai test:e2e` exits **0**
with `1428 passed | 16 skipped (1444)` across `84 passed | 4 skipped` files, exactly what `:825`
certifies; `--project integration --project unit` gives **1188 / 19**, exit 0, exactly `:826`;
`pnpm ci:lint` exits 0 with exactly eleven `&&` members. The in-flight-pack rule is right, the record
argues it correctly at `:1011-1019`, and the P7 block now names the projects that exist and states the
`e2e`-leg consequence of round 5's red test in its own words. **Every headline figure the request sent
me to re-derive reproduces exactly** — all five closed pack seals plus the superseded one and the
two-space variant, the ledger's 82/71/11 and 74/6/2 and Integration 63/6/2, the matrix's 3/1/5 and its
38-cell A30/B7/C1 partition, `--profile full` at `error=4`, the unscoped `-111` 12 / `-112` 15,
`CR-20260820-0011`'s 208/127/81, the six rejected-alternative bullets, and every per-file test count
except one. That is a real round of repairs and it is the first round where the headline numbers hold.

What did not survive is the same mechanism, for the sixth consecutive round, and this time it is
**inside the instrument built to stop it**.

**Round 5's `B4` is entirely unapplied in the record** (B1). `:880-881` still publishes
"`DR-0017-0010` now records clause 1 as **degenerate rather than satisfied**" — the reading P1d refuted
and the DR retracts at `:144` and `:186` — five hundred lines from `:379`, where the same record says
the DR records it as **unsatisfied**. `### P1d's verdicts:859` still says P1d "has run **three
times**"; it has run four, which the same file says at `:771`, `:774`, `:949` and `:998`. No Third or
Fourth pass paragraph was added.

**`retractedClaims.test.ts` cannot see that** (B2), and it cannot see much else it claims. I ran eleven
oracle rounds. It is genuinely stronger than round 5's proximity version — blockquotes, fenced blocks
and table cells all redden — but **three of its eight entries match nothing at all**, because Prettier
put a newline inside the needle; a fourth names `[DR]` while the claim it forbids stands unquoted in
`CR-20260820-0012:130`; the retraction the record is violating right now is not on the list; and the
enclosure test is a **global quote-parity scan**, so one unpaired `"` anywhere earlier inverts the
verdict for the whole rest of the file. The test's own third case checks needle length and emphasis
markers — neither of which detects a needle that matches nothing.

**And the one write any gate has ever released is still blocked by the ledger cell it would land in**
(B3). P1d's round-5 required item 4 — "promote A1 into the handover so the ledger's writer replaces the
'NOT BLOCKED by a CR' `Evidence` text in the same edit as `Blocked-By`" — appears nowhere:
`grep -nE 'Evidence (text|cell|column)|NOT BLOCKED|same edit'` over the record returns **nothing**. And
`tdd/test-list.md:107` still reads "**NOT BLOCKED by a CR** … the workflow changes are unmerged and CI
has not run them … becomes implementable once the pull request has three green `ci-pass` runs to cite" —
one cell carrying the retracted reason, the refuted exit condition, and the negation of the
`Blocked-By` value the handover asks for.

And the "applied to one artifact, not the other" pattern repeated four more times: round 5's `M2`
(B6), P1d's item 2 (M4), the classifier version (B5), and the Delta Rejected Guard (M3).

---

## What I re-derived and could not fault

Every number below was measured from the tree at `cb91e089`, not read from a prior report.

1. **The suite is green, and both P7 totals are exact.** `pnpm -C packages/qfai test:e2e` -> **exit 0**,
   `Test Files 84 passed | 4 skipped (88)`, `Tests 1428 passed | 16 skipped (1444)` — `:825` exact.
   `pnpm vitest run --project integration --project unit` -> **exit 0**, `171 passed | 4 skipped (175)`,
   `1188 passed | 19 skipped (1207)` — `:826` exact, and the invocation no longer names a project that
   does not exist. `pnpm ci:lint` -> **exit 0**, and `ci:lint` splits on `&&` into exactly **eleven**
   members, enumerated — `:824` exact.
2. **Every per-file test count except one.** Measured by running each file:
   `spec0017LayeredCiScaffoldE2E.test.ts` **9** (`:180`, `:212`),
   `checkAtddAnnotationLedger.test.ts` **22** (`:188`, `:225`), `buildCommand.test.ts` **11** (`:191`,
   `:229`), `coverageDepthMatrix.test.ts` **5** (`:193`, `:227`), `stageEvidenceCounts.test.ts` **6**
   (`:195`), `retractedClaims.test.ts` **3** (`:198`). The exception is `:203` — see B5.
3. **The ledger, parsed mechanically** (`tmp/r6/ledger.py`): **82** data rows of 9 cells,
   `TDD-0001`-`TDD-0082`, no duplicates, header at `:37`. `Layer`: **71 Integration / 11 Unit**.
   `Status`: **74 refactor / 6 blocked / 2 todo**. Cross-tab Integration: **63 / 6 / 2**, and
   `63+6+2 = 71` closes. `:21-22`, `:257`, `:268`, `:736` exact. The 6 `blocked` are
   `TDD-0016/0030/0032/0033/0034/0035` and exactly **four** carry `CR-20260820-0007`. `TDD-0069` and
   `TDD-0070` at `test-list.md:107-108` are both `todo`, `DR-ID: -`, `Blocked-By: -` — `:284-287`,
   `:302-304`, `:935-936` exact.
4. **The matrix, parsed mechanically** (`tmp/r6/matrix.py`): 9 rows by 7 depth columns, header carries 9
   columns. Status totals **3 / 1 / 5** — `coverage-depth:57` and `atdd:446` exact. **38** depth failure
   cells plus **5** in Status — `coverage-depth:114` exact. The partition is complete, disjoint, holds
   no non-failing member and names no non-depth column; sizes **A 30, B 7, C 1 = 38** —
   `coverage-depth:139` exact. Class A's stated property holds for all 30, class B's for all 7, and
   class C is exactly `US-0017-0001` crossed with `Boundary values`.
5. **The scoped gate.** Shadow run: `info=2 warning=0 error=2` after excluding the shadow artifact.
   `QFAI-ATDD-111` names **`SPEC-0017:US-0017-0007` and nothing else**; `QFAI-ATDD-112` names **exactly
   the eight** `TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070`. `:232-233`, `:268`,
   `:734-736`, `:829`, `:933-934` exact.
6. **`validate --profile full` is `error=4`** (`info=4 warning=404`), and the four are `QFAI-ATDD-111`,
   `QFAI-ATDD-112`, `QFAI-REVIEW-004` and `QFAI-REVIEW-005` — the last two naming
   `.qfai/review/review-20260821060000000`, **this round's own in-flight pack**, exactly as `:906-907`
   says. `:831` and `:905` exact.
7. **The unscoped ATDD breakdown.** Measured from the shadow's full-profile run:
   `QFAI-ATDD-111` = `SPEC-0003 8, SPEC-0006 1, SPEC-0008 1, SPEC-0015 1, SPEC-0017 1` = **12**
   (`:738-739` exact, including that the four sibling specs give 11 and `US-0017-0007` makes 12);
   `QFAI-ATDD-112` = `SPEC-0003 1, SPEC-0008 4, SPEC-0015 2, SPEC-0017 8` = **15**, exactly as
   `CR-20260820-0012:154-160` states it. (Not in the record: B6.)
8. **All five closed pack seals reproduce, plus the superseded and the two-space variants**
   (`tmp/r6/seal.py`). Manifest form is the git blob hash, a single space, the pack-relative path and a
   newline, in byte order, with sha256 over the stream: round 1 `5c8cd425...c74317e3` (`:985`), round 2
   `305ffd65...5983e77a` (`:989`), round 3 `257e793b...6d01bfd0` (`:992`), round 4 `aaa2d2a6...04db35ff`
   (`:995`), **round 5 `5798d557...4263b62` (`:998`) — the new one, and it is right**; the superseded
   `d8ac0a77...58967c9` (`:986`) over round 1's three reports **as they stand today**, which is what
   discharges the re-seal; and the two-space form gives exactly `fa8d6e83...d17e2526` at `:1025`. Round
   1's printed manifest at `:1042-1045` is byte-identical to what I hashed. Round 3's pack correctly
   holds no `R03_qa-gatekeeper.md`, matching `:890`'s "did not run".
9. **The in-flight pack is disclosed rather than sealed** (`:1000-1001`), and `:1011-1019` states the
   two-rule contract and why, naming round 5's finding. `:1035-1037`'s rule — recompare against the
   **recorded** values, not a tree-read expectation — is correct and is the reasoning `SKILL.md:298`
   asks for. This is the round's best repair.
10. **`## Final status` "Confirmed by" now reflects all five rounds and every REVISE** (`:949-962`).
    Counted against the packs on disk: round 1 two responses, round 2 four, round 3 three, round 4
    three, round 5 three = **fifteen**, every one REVISE — `:949` exact. Round 5's `summary.json`
    records `completion-reviewer` FAIL/17, `qa-gatekeeper` FAIL/17, `qa-gatekeeper` FAIL/3. `:961`'s
    statement that round 5's P1d released `todo -> blocked` is confirmed by
    `review-20260821040000000/R04_qa-gatekeeper-p1d.md:307`. Round 5's `B5` is fully applied.
11. **`CR-20260820-0011`'s figures.** `tests/e2e/qfai-traceability.md` holds **208** unique claims;
    `check-atdd-annotation-ledger.mjs` reports **127** unbacked (exit 1), so **81** backed; the scoped
    guard reports `8 claim(s) backed by a test annotation (spec-0017)`, exit 0. `:111`, `:219`, `:222`,
    `:745`, `:827-828` exact.
12. **The six rejected alternatives, exact.** `07_Decisions.md` carries exactly **six**
    `Decision, rejected alternative` bullets, at `:133`, `:137`, `:203`, `:206`, `:242`, `:249` —
    `:33-34` exact — and `09_delta.md` section `Rejected` carries exactly **three** candidate bullets.
13. **Delta Rejected Guard — substance PASSES for this round's artifacts, which I checked myself
    because the record's section did not (M3).** No rejected option is reintroduced.
    `07_Decisions.md:133-136` rejects a second parser over the same **YAML** surface;
    `retractedClaims.test.ts` reads two markdown evidence files and two markdown decision records, and
    `stageEvidenceCounts.test.ts` reads markdown plus test sources plus the annotation ledger — no
    workflow YAML, no spec artifact. `:137-140` rejects a validator rule under the distributed validator
    surface; the round added two tests under `tests/assets/**` and rewrote a test helper, none of which
    is that surface. `CR-20260820-0012` option 5 splits one **example**, not the test-case table and not
    the spec. **No RE-OPEN is required for anything in this round.**
14. **`DR-0017-0010`'s option-5 paragraph is fixed, and correctly.** `:180-184` now records that this is
    where P1d's pass "found the retraction had not reached", quotes the old sentence rather than
    asserting it, and `:186` states "Clause 1 is **unsatisfied**". `:151` says "wrong about clause 1
    **twice**" with `:157-159` explaining the count. Round 5's `B4` item 1 and `m3` are both applied
    well — in the DR. (Not in the record: B1. Not in the CR: M4.)
15. **`## Gaps` item 8 is in the not-yet form.** `:767-773` — "**Both are still `todo` in the ledger**,
    and what follows is the status each is owed rather than one it has" — matching `:935-936`. Round 5's
    `B3` applied.
16. **`## Ledger rows advanced` is corrected at the source for two of the four statements.** `:369-374`
    and `:376-382` now quote the retracted sentences and state the replacement beside them, and
    `:400-406`'s table of where each correction landed is the right shape — checkable rather than
    self-attesting. Round 5's `B2` first clause is applied. (Its second and third clauses are not: B4.)
17. **`v6` of the classifier is described accurately in the matrix record**
    (`coverage-depth:216-225`), with no accuracy figure and with the corpora named instead — and the
    matrix test pins the version string (`coverageDepthMatrix.test.ts:331`) and the **absence** of the
    refuted `0 misclassified` figure (`:327`). Round 4's and round 5's findings on that paragraph are
    properly closed there. (Not in the ATDD record: B5.)
18. **`## Work performed` gained the three artifacts round 5's `B6` named** —
    `stageEvidenceCounts.test.ts` (`:195`), `DR-0017-0010-*.md` (`:201`) and `CR-20260820-0012-*.md`
    (`:202`) — plus this round's `retractedClaims.test.ts` (`:198`). The addition is real; what it broke
    is B5.
19. **The oracle-round families are defined now.** `R1`-`R3` at `:665-679`, `G1`-`G3` at `:681-692`,
    `X6`-`X9` at `:694-708`, `C1`-`C5` at `:710-724`, all under `## Execution logs` in the shape of
    `:491-501`, and `:924-926` records why they were renamed off the `L*` and `Z*` prefixes. Round 5's
    `B7` is applied as specified.
20. **`## Execution logs` discloses that round 5's test was the round's worst defect** (`:720-724`) and
    `:836-840` states the CI consequence in the P7 block. The stage reported its own worst finding
    without being asked twice. Credited.

---

## BLOCKING

### B1 — round 5's `B4` is unapplied in the record: `### P1d's verdicts` publishes the retracted clause-1 reading as the DR's current position, and miscounts P1d's passes

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:880-881`, `:859`, `:857-881`, `:412-414`, `:938-939`;
  against `:379`, `.qfai/decisions/DR-0017-0010-*.md:144-149`, `:180-191`, and
  `.qfai/review/review-20260821040000000/R02_completion-reviewer.md:304-341`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — evidence verifiable by a party that did not
  author it; `:298` ("check that `## Final status` says what that pack says"); round 5's `B4` required
  items 2 and 3
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) plus Stage Gate
  P1d / `defect:correctness`

Round 5's `B4` had three parts. Part 1 (the DR's option-5 paragraph) is applied and applied well —
verified item 14. Parts 2 and 3 were not touched.

**`:880-881` still reads:** "An equivalent mutant, written while applying a finding about that clause.
`DR-0017-0010` **now records clause 1 as degenerate rather than satisfied**."

That is the reading P1d's third pass refuted, that `DR:136-142` refutes by name, and that `DR:144` and
`DR:186` replace with **unsatisfied**. It is also contradicted by the same record 501 lines earlier:

```text
:379   "`DR-0017-0010` now records clause 1 as **unsatisfied**"           <- correct
:881   "`DR-0017-0010` **now records clause 1 as degenerate** rather..."  <- the retracted reading
```

`### P1d's verdicts` is the record's only summary of the DR's position for a completion gate reading
`## Final status`. It tells that reader the DR holds the reading the DR retracts.

**And the section still cannot count its own subject.** `:859`: "P1d has run **three times** on
`DR-0017-0010` and returned **REVISE** every time." It has run **four**:
`review-20260821040000000/R04_qa-gatekeeper-p1d.md:1-13` is headed "P1d branch-3 DR gate (round 5)",
"(fourth re-route)", with "Prior verdicts: **REVISE** on `16f611c7`, `1473897a`, `54d8d325`". The same
record says four at `:771`, `:774`, `:949` and `:998`, and `DR:152` and `:163` also say "fourth pass".
Two more places carry the stale three: `:412-414` and `:938-939`.

The section then narrates **First pass** (`:862`) and **Second pass** (`:867`) and stops. Round 5's
`B4` asked for a Third pass paragraph; two are now missing, including the one that produced the only
released write.

**Required fix.** `:880-881` to the DR's actual current statement (`DR:144`, `:186`). `:859`, `:412`
and `:938` to four. Add **Third pass** (`54d8d325`) and **Fourth pass** (`3f815725`) paragraphs to
`### P1d's verdicts`, the latter naming the released `todo -> blocked` and the three items it left open.
Add the phrase "degenerate rather than satisfied" to `retractedClaims.test.ts`'s list with the evidence
file in its `files`, so the fifth attempt at this sentence is enforced rather than announced (B2).

### B2 — `retractedClaims.test.ts` is materially weaker than the record claims: three of its eight entries can never match, one names the wrong file while the claim stands, the retraction the record is violating is absent, and enclosure is a global parity scan

- **Artifacts**: `packages/qfai/tests/assets/retractedClaims.test.ts:55-96`, `:109-131`, `:190-206`;
  `.qfai/evidence/atdd-spec-0017.md:198-200`, `:124-125`, `:880-881`;
  `.qfai/evidence/coverage-depth-spec-0017.md:206-209`; `.qfai/decisions/CR-20260820-0012-*.md:127-130`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the file's own stated purpose at `:15-17`
  ("Prose cannot be trusted to say whether prose was deleted, so the rule is enforced instead of
  announced") and `:51-53` ("Adding an entry is how a retraction becomes enforced rather than
  announced")
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The idea is right and the enclosure move is a real improvement on round 5's proximity version. I ran
**eleven oracle rounds** against in-memory copies (`tmp/r6/oracle.mjs`, `tmp/r6/oracle2.mjs`; baseline
green, two controls green):

```text
Q1  bare assertion in plain prose                                REDDENS
Q2  bare assertion inside a fenced code block                     REDDENS
Q3  bare assertion inside a markdown blockquote                   REDDENS
Q4  bare assertion inside a table cell                            REDDENS
Q5  ONE unpaired quote char planted early, then Q1's assertion    REDDENS on the 8 CORRECT quotations
                                                                  and NOT on the planted assertion
Q6  the retracted reading in the record's own :880-881 wording    *** REDDENS NOTHING ***
Q7  a single curly open quote, unpaired                           REDDENS on 4 correct quotations
Q10 Q1's assertion Prettier-wrapped across a line break           *** REDDENS NOTHING ***
Q8, Q11  controls: neutral sentences                              green, correct
```

Four defects, two of them live in the repository right now.

**1. Three of the eight entries match nothing, and the mechanism is the repository's own formatter.**
Instrumented with the test's own functions (`tmp/r6/retract.mjs`):

```text
entry                                              named files      occurrences found
"All 71 Integration rows are already at refactor"  EVIDENCE         0    <- :124 wraps after "All 71"
"rebuilt the scan around the verb"                 EVIDENCE,MATRIX  0,0  <- matrix :206 wraps after "the"
"0 misclassified"                                  EVIDENCE,MATRIX  2,0  <- matrix :208 wraps after "0"
"degenerate against this runner"                   DR,CR            1,0  <- CR :127 wraps after "this"
"wrong about clause 1 three times"                 DR               0    <- DR corrected to "twice"
```

`normalise` strips asterisks, underscores and backticks but not newlines, so a needle whose words
Prettier split across a line can never be found. `coverage-depth:206-207` is literally
`rebuilt the scan **around the` / `verb**"`. The test's third case guards `entry.claim.length < 80` with
the comment "short enough to survive the record being rewrapped by Prettier" — but Prettier wraps at 100
columns, so **any** multi-word needle straddles a line break somewhere, and length is the wrong
invariant. Q10 confirms it is exploitable rather than merely latent: the same assertion Q1 reddens on
becomes invisible when wrapped.

**2. Entry 7 names the wrong file, and the claim is standing unquoted in a file it does not name.**
`CR-20260820-0012:130`: "See `DR-0017-0010`, which has now been wrong about clause 1 **three times** in
three directions." Not a quotation. `files` is `[DR]` only, and the DR was corrected to "twice" — so the
entry protects the one file where the claim is gone and ignores the one where it survives. That is
exactly P1d's round-5 required item 2, half-applied (M4), and the guard built to catch half-applied
retractions is looking the other way.

**3. The retraction the record is violating right now is not on the list.** Q6: the `:880-881` wording
"records clause 1 as degenerate rather than satisfied" reddens nothing, because the needle is
"degenerate against this runner" and the evidence file is not in that entry's `files`. So the test is
green at a revision where B1's defect is live in the audited record. **The test's green does not mean
the record is clean; it means the record is clean of five findable strings.**

**4. Enclosure is a global quote-parity scan, so the check is not local.** `quotedRanges` pairs every
quote character in the file sequentially, so a position counts as quoted iff an **odd** number of quote
characters precede it — which the instrumentation confirms for every one of the eight passing
occurrences. Consequence (Q5, Q7): inserting **one** unpaired quote character anywhere earlier — in a
fenced block, a shell command, a URL — inverts the classification of the entire remainder of the
document. The planted bare assertion disappears from the report and eight correct quotations are accused
instead. A repair round reading that failure list would go and mangle eight compliant passages while the
real violation sits unreported.

**Required fix.** (a) Assert that **every** entry matches at least one occurrence in every file it
names — an entry that finds nothing is indistinguishable from a retraction that was cleaned up, and that
single assertion catches defects 1 and 2 at once. (b) Match on whitespace-normalised text, or store
needles as word sequences, so a line break cannot hide an assertion. (c) Add "degenerate rather than
satisfied" with the evidence file in `files`, and add the CR to entry 7's `files`. (d) Scope the quote
pairing to a line or a paragraph, so one stray character cannot invert the file.

### B3 — the one ledger write any gate has released is blocked by the cell it would land in, and P1d's required item 4 is absent from the record

- **Artifacts**: `.qfai/specs/spec-0017/tdd/test-list.md:107` (and `:108`);
  `.qfai/evidence/atdd-spec-0017.md:279-282`, `:284-287`, `:410-417`; against
  `.qfai/review/review-20260821040000000/R04_qa-gatekeeper-p1d.md:307-317`, `:343-345`, and
  `.qfai/decisions/DR-0017-0010-*.md:86-89`, `:75`
- **Contract**: `qfai-atdd/SKILL.md:322-325` (`## Ledger rows advanced` is the handover, "the payload
  goes in the section"); `qfai-implement/SKILL.md:116` (step 3b reads that section);
  `qfai-implement/references/execution-ledger.md` (`blocked` carries a `Blocked-By` value)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) plus Stage Gate
  P1b/P1d / `defect:correctness`

P1d's round-5 report released `todo -> blocked` for `TDD-0069` with exactly one condition attached
(`R04:316-317`): "**One condition the writer owes**, and it is the ledger's own consistency rather than
my gate: replace the row's `Evidence` text in the same edit (**A1**)." Restated as required item 4
(`R04:343-345`): "**Promote A1 into the handover** so the ledger's writer replaces the 'NOT BLOCKED by a
CR' `Evidence` text in the same edit as `Blocked-By`."

**It is nowhere in the record.** `grep -nE 'Evidence (text|cell|column)|NOT BLOCKED|same edit|replace the row'`
over `.qfai/evidence/atdd-spec-0017.md` returns **no match**. The handover table at `:279-282` carries
`TDD-*`, `Layer`, obligation, branch, `DR-ID`, `Blocked-By` and anchor — no `Evidence` column and no
prose about the cell.

And the cell is worse than stale. `tdd/test-list.md:107`, read whole:

> **NOT BLOCKED by a CR** - waiting on data that does not exist yet. `EX-0017-0053` requires three
> consecutive green aggregate-verdict runs with their run identifiers quoted, and this branch has
> produced no aggregate-verdict runs: **the workflow changes are unmerged and CI has not run them**.
> **The row becomes implementable once the pull request has three green ci-pass runs to cite.**
> Recorded rather than left blank so the next agent does not look for a CR

Three defects in one cell, all retracted elsewhere:

| the cell says | retracted at |
| --- | --- |
| "NOT BLOCKED by a CR" | `atdd:281` and `:384` give `Blocked-By: CR-20260820-0012` |
| "the workflow changes are unmerged and CI has not run them" | `DR:86-89` — "**was false** as `TDD-0069`'s reason. `ci-pass` exists at `ci.yml:469` and has run twelve times"; `atdd:369-374` |
| "becomes implementable once the pull request has three green ci-pass runs to cite" | `DR:75` — the exit condition P1d's first pass found **unreachable**; `CR-20260820-0012:41` |

So if `/qfai-implement` exercises the released write today it produces a row whose `Blocked-By` names a
CR and whose `Evidence` says it is not blocked by a CR — and step 3b's reader is handed a section that
never mentions the contradiction. This is the same "the retraction did not reach the artifact a reader
meets" failure the round's headline test exists to stop, one artifact further out than the test looks
(B2), in the artifact that **is** the handover.

I am **not** asking this stage to write `tdd/test-list.md` — `:206` correctly says it does not. The fix
is inside its authority and is what P1d specified.

**Required fix.** Add the `Evidence`-cell replacement to `## Ledger rows advanced` as an explicit part
of the `TDD-0069` handover: quote the three retracted fragments the cell currently holds, give the
replacement text, and state that the writer must land it in the same edit as `Blocked-By`. Do the same
for `TDD-0070`, whose cell at `:108` also asserts "NOT BLOCKED by a CR" while its handover routes it to
`exception`. Add the surviving fragments to `retractedClaims.test.ts` with `tdd/test-list.md` in their
`files`.

### B4 — `## Ledger rows advanced` still holds the duplicate paragraph and the stale round count round 5's `B2` required removed, and the section contradicts itself about how many rounds have faulted it

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:284-287` against `:302-304`; `:295` against `:389`
- **Contract**: `qfai-atdd/SKILL.md:322-325`; Evidence (MANDATORY); round 5's `B2` required fixes 2 and 3
  ("Delete one of the two duplicate paragraphs. Correct `:285` to four rounds.")
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

Round 5's `B2` listed three required fixes for this section. The first is applied (verified item 16).
The other two are not.

```text
:284-287  "**Neither ledger cell has been written, and this table is the handover, not the ledger.**
           `tdd/test-list.md:107-108` has both rows `todo` with `DR-ID: -` and `Blocked-By: -`; those
           cells are `/qfai-implement`'s to write. What is recorded here is what it should write..."

:302-304  "**Neither cell has been written yet.** `tdd/test-list.md:107-108` still has both rows
           `todo` with `DR-ID: -` and `Blocked-By: -`, because those cells are `/qfai-implement`'s to
           write and this stage does not write the ledger. What this table is, is the handover it reads."
```

The same paragraph twice, seventeen lines apart, citing the same two ledger lines — an insertion where a
replacement was intended, which round 5 named as "the same edit failure one level down" and which is
still here. Round 5's `qa-gatekeeper` also read them as a pair (`R04:47-49` cites "lines 274-277, and
again at 292-294").

And `:295` still reads "**Rounds 1, 2 and 3** each found a false statement in this section". Round 4
found one (round 4's `B1`, P1d's `B1`), round 5 found one (round 5's `B2`, P1d's `B3`), and **the same
section says so ninety-four lines later**: `:389` — "Rounds 1, 2, 3, 4 **and 5** each found this
subsection stating something the record elsewhere had already retracted". One section, two counts of its
own defect history. This is the fourth round in which the number of rounds that faulted this section is
wrong in this section.

**Required fix.** Delete `:302-304` (or `:284-287`) — one, not both. `:295` to five rounds, or reword it
to point at `:389` rather than restate it. Then diff the section against `git diff 3f815725 HEAD` before
claiming any statement is gone: three of the last four rounds have found this section asserting a repair
the diff does not contain.

### B5 — `## Work performed` lists the matrix test twice with contradictory counts and calls the round's own classifier `v5`, and the derived-count test is blind to both because it reads only the first match

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:193-194` against `:203`; `:189-190` and `:581`
  against `packages/qfai/tests/helpers/buildCommand.ts:4`, `:24` and
  `.qfai/evidence/coverage-depth-spec-0017.md:216`;
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:133-137`, `:142`
- **Contract**: `qfai-atdd/SKILL.md:342` (`## Work performed (what changed, where)`); Evidence
  (MANDATORY); the derived-count test's own purpose at `:2-7`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

**1. `coverageDepthMatrix.test.ts` is listed twice, and the two entries disagree.**

```text
:193  - **new** `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — 5 tests deriving the
        Coverage Depth Matrix's totals, partition, class assignment and per-class justification...
:203  - **new** `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — 4 tests pinning the matrix
```

Measured: the file holds **5**. So `:203` is a stale duplicate stating a count the tree does not hold —
in the one section whose contract is "what changed, where", inside the list round 5's `B6` was applied
to, and it is the **only** per-file count in the record that is wrong. Round 5's three required items
were inserted above a pre-existing entry instead of replacing it: the same defect as B4, in the same
commit.

**2. The test built to stop exactly this cannot see it.** `stageEvidenceCounts.test.ts:142` uses
`claim.pattern.exec(evidence)` — **first match only**. The `coverageDepthMatrix` pattern at `:135` finds
`:193`'s correct 5 and stops. Every one of the six `CLAIMS` has this property, so **any restatement of
any pinned count after its first occurrence is unchecked**, and the record is exercising that gap right
now. `:851-853` says "Everything derivable about the artifacts ... is now checked by" that test.

**3. The classifier is `v6` and this record calls it `v5`, twice.** `buildCommand.ts:4` — "**Six
versions**, each measured" — and `:24` — "`v6` keeps v5's three moves and adds three distinctions".
`coverage-depth:216` says `v6` and `coverageDepthMatrix.test.ts:331` **pins** it. The ATDD record says
`v5` at `:189-190` ("the build classifier, v5") and at `:581`, and `:581-604` is still the v5-era
paragraph — it does not mention round 5's ten measured defects, which `coverage-depth:200-203` and
`:224` both do. Nothing pins the version in this file, so the round's headline code change is
misdescribed in the stage's own evidence while being correct in the matrix beside it. The "applied to
one artifact, not the other" pattern, for the fourth time this round.

**Required fix.** Delete `:203`. Update `:189-190` and `:581` to `v6`, and bring `:581-604` up to the
matrix's account (`coverage-depth:200-225`), including round 5's ten defects. Change
`stageEvidenceCounts.test.ts:142` to `matchAll` and require **every** occurrence to agree, and add the
classifier version to its `CLAIMS`. Add `retractedClaims.test.ts`'s own 3 to `CLAIMS` — it is the only
new test file whose count is unpinned.

### B6 — round 5's `M2` is unapplied for a second round: `### The full profile` calls two unscoped errors "the scoped" ones, and the record still never states `QFAI-ATDD-112`'s repo-wide 15

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:905-907`, `:734-744`; against
  `.qfai/decisions/CR-20260820-0012-*.md:154-163` and `.github/workflows/ci.yml` (three unscoped
  dogfooding steps)
- **Contract**: `qfai-atdd/SKILL.md:294` (repository quality gates) and `:305` (Not-done: validation
  evidence failing); round 4's P1d `M1` required the strand "in both artifacts"; round 5's `M2`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality
  gates) / `defect:correctness`

`:905-907` still reads: "`validate --profile full` reports **`error=4`** ... and `build` runs that
profile. **Two are the scoped `QFAI-ATDD-111` / `-112`**". The full profile is run **unscoped**, and I
measured what that means:

```text
QFAI-ATDD-111, unscoped:  SPEC-0003 8  SPEC-0006 1  SPEC-0008 1  SPEC-0015 1  SPEC-0017 1  = 12
QFAI-ATDD-112, unscoped:  SPEC-0003 1  SPEC-0008 4  SPEC-0015 2  SPEC-0017 8               = 15
```

So `build` needs **fifteen** TCs annotated, not the eight `## Gaps` item 3 states, and seven of the
fifteen belong to three other specs — which item 4 says explicitly is not this stage's work. Item 4
discloses the sibling picture for `-111` ("11 items repo-wide, plus `US-0017-0007` makes 12", exact,
verified) and **says nothing about `-112`'s seven**. `CR-20260820-0012:154-163` carries the strand
verbatim correct, including "`build` needs all fifteen, not eight. That is the dominant strand and it was
absent from both this CR and `DR-0017-0010`."

It is now absent from the evidence record for a third round: P1d's round-4 `M1`, then round 5's `M2`,
then here. The record's account of why `build` is red is wrong about which rule scope produced two of
its four errors, and understates the obligation by seven TCs.

**Required fix.** `:906` to say the two ATDD errors under `full` are the **unscoped** ones, with both
counts. Add `-112`'s repo-wide 15 with its per-spec split to `## Gaps` item 3 or 4, cross-referencing
`CR-20260820-0012:154-163`, and state that seven of the fifteen are other specs' work.

---

## MAJOR

### M1 — the P7 totals are right and their history is false in three particulars, one of which its own arithmetic refutes; and no revision is recorded for a fourth round

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:842-848`, `:817-821`, `:834-835`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Evidence (MANDATORY); round 3's `B4` third
  clause; round 5's `M3` ("attribute all twelve") and `B1` ("record the revision each was measured at")
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

Both endpoints are exact (verified item 1). The chain that explains them is not.

```text
:844  "so its two corpus tests left the `e2e` project and twelve joined `unit`: 1420 -> 1418,
       1174 -> 1186"
        -> the +12 is right; the attribution is not. NINE joined `unit` (buildCommand.test.ts held 9
           at 3f815725) and THREE joined `integration` (checkAtddAnnotationLedger.test.ts 19 -> 22:
           `git show 54d8d325:...` = 19, HEAD = 22). Round 5's M3, third bullet, still open.

:844  "Round 5 added `tests/assets/stageEvidenceCounts.test.ts`, whose SIX tests run under `e2e`:
       1418 -> 1424"
        -> FOUR. `git show 3f815725:packages/qfai/tests/assets/stageEvidenceCounts.test.ts` holds 4
           callsites; HEAD holds 6. Round 5's own B6 said "4 by `it(` blocks". 1418 + 4 = 1422, which
           is the total round 5 measured (1421 passed + 1 failed). **1424 is a total no tree has ever
           held**, and the two tests round 6 added to that file are absorbed into round 5's credit.

:845  "added a matrix round, two classifier rounds and THREE LOOP-GUARD TESTS: 1424 -> 1425 and
       1186 -> 1188"
        -> no loop-guard test was added. `git diff --stat 3f815725 cb91e089 --
           packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` is EMPTY: the
           file is byte-identical. And the sentence's own figure proves it — 1186 + 2 (classifier) =
           1188, whereas three more tests would give 1191. The three loop tests landed in round 4.
```

The endpoint is right only because the +2 the chain omits equals the +2 it over-credits. Five of the last
six rounds have found a P7 figure the tree did not hold; this round the figures hold and the narrative
does not.

Two further items, both unapplied:

- **No revision is recorded for either total.** `:850` says they "carry a statement of when they were
  measured", and `:817-821`'s statement is "These numbers are measured at the tree that carries every
  **round-4** repair" — a caption two rounds stale in front of round-6 numbers. Round 3's `B4` third
  clause and round 5's `B1` both asked for the revision hash. Fourth round open.
- **`:834-835` enumerates six of the seven projects.** "The projects are `core`, `unit`, `validators`,
  `integration`, `cli` and `scripts`; `tests/assets/**` runs under **`e2e`**" — `vitest.workspace.ts`
  declares seven and `e2e` is one of them. In the sentence written to correct the `--project assets`
  error.

**Required fix.** Attribute the +12 to `unit` (9) and `integration` (3); state round 5's file as four
tests with 1418 -> 1422; credit round 6 with the two it added; drop the loop-guard tests from the
round-5 clause; and record `cb91e089` beside both totals. Fix `:834`'s project list to seven.

### M2 — `stageEvidenceCounts.test.ts`: first-match-only, and the in-flight rule now punishes the correct sealing act instead of the correct request-first practice

- **Artifacts**: `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:142`, `:160-166`, `:273`,
  `:290-294`; `.qfai/evidence/atdd-spec-0017.md:851-853`
- **Contract**: `qfai-atdd/SKILL.md:298` (the seal is fixed at "when the last reviewer response lands");
  Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:code-quality`

Round 5's four `M1` items are three-quarters closed and closed well: `countCases` is now
statement-initial with a five-decoy fixture and returns 6 for its own 6-test file and 22 for the 22-test
file (test 3 is the regression guard, and it is the right shape); test 5 **runs** `checkLedger` instead
of transcribing a count; the date window is gone, replaced by `FIRST_PACK` with a stated reason; and
seals are compared by **value**. Four gaps remain.

**1. `exec`, not `matchAll`** (`:142`) — see B5.2. The record is exploiting it at `:203` today.

**2. The in-flight rule inverts the red rather than removing it.** `:273` takes the newest pack on disk
as in flight and `:290-294` asserts `sealed.has(inFlight) === false`. `SKILL.md:298` requires this pack
to be sealed **when its last reviewer response lands** — which is inside round 6, before completion. The
moment the record does that, this test goes red, and stays red until a round-7 pack directory exists.
Round 5's version made the suite red at pack **creation**; this one makes it red at pack **sealing**. It
is green only in the window between the two, which is exactly the window a reviewer runs in — so the
defect is invisible to every reviewer and lands on whoever seals. It also means the required CI leg
cannot be green at the completion gate, which is the one moment `SKILL.md:298` asks for the
recomputation.

The scoping that fixes it is the same one `QFAI-REVIEW-004` / `-005` need: "in flight" is a property of
the pack's **contents** (no `Rxx_*.md`, or no `summary.json`), not of its position in a sorted list.

**3. Test 2 requires only `rows.length > 2`.** `## Commands executed + key outputs` records runs for four
files and **neither** of the round's two new assets tests (m4), and the test permits that. Its regex also
needs the path to be the last token on the `vitest run` line, so any recorded run with a trailing flag
silently drops out of the checked set.

**4. The superseded seal is unchecked** (m5), and `:851-853` still says "Everything derivable about the
artifacts ... is now checked".

### M3 — the Delta Rejected Guard section still covers rounds 1-2's artifacts only, three rounds after that was raised, and this round added a new artifact to the uncovered set

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:31-50`
- **Contract**: `constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`;
  `qfai-atdd/SKILL.md` Delta Rejected Guard (MANDATORY output)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard

`:46-50` reasons about `check-atdd-annotation-ledger.mjs` and about not writing `06_Test-Cases.md`. It
says nothing about `buildCommand.ts` / `buildCommand.test.ts` (which parse both workflow trees),
`stageEvidenceCounts.test.ts`, `retractedClaims.test.ts` (which between them parse four governance
records and the annotation ledger), or `CR-20260820-0012`'s option 5. Round 4's `m3` raised it, round
5's `M5` raised it, and the uncovered set has grown by two artifacts since.

**I checked all of it myself and the conclusion holds** (verified item 13) — so this is a completeness
defect in a mandatory stage output, not a substantive collision, and **no RE-OPEN is required for
anything in this round**. **Required fix:** re-run the section against the current artifact set and
record the sentences, including the one round 4's `M5` asked for distinguishing option 5 from
`09_delta.md`'s two rejected split candidates.

### M4 — P1d's required item 2 is applied to the DR and not to the CR, and the guard that should catch that is looking at the DR

- **Artifacts**: `.qfai/decisions/CR-20260820-0012-*.md:130`; against
  `.qfai/decisions/DR-0017-0010-*.md:151`, `:157-159` and
  `.qfai/review/review-20260821040000000/R04_qa-gatekeeper-p1d.md:346-348`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate P1d; Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d / `defect:correctness`

P1d required: "**DR 151 and `CR-20260820-0012`:130** — make the count agree ... wrong **twice**, now
stating a third." `DR:151` is fixed and explained (`:157-159`). `CR:130` still reads "See
`DR-0017-0010`, which has now been wrong about clause 1 **three times** in three directions" — which
classifies the DR's current, P1d-sustained statement as an error, the defect `CR-20260820-0006`
describes.

`retractedClaims.test.ts` has this exact string on its list (entry 7) with `files: [DR]` — the file where
it is gone — and not the CR, where it stands. See B2.2.

### M5 — `## Final status` counts five rounds correctly and the narrative tables stop at round 4

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:885-894`, `:787-798`; against
  `.qfai/review/review-20260821040000000/summary.json`
- **Contract**: `qfai-atdd/SKILL.md:298`; Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY)

`### Round 3 and round 4` tabulates per-reviewer finding counts through round 4 and stops. Round 5's
counts exist and are recoverable — `summary.json` gives `completion-reviewer` 17, `qa-gatekeeper` 17,
`qa-gatekeeper` (P1d) 3, and the reports break down to 7/5/5, 10 blocking, and 3 blocking. `:949-962`'s
table carries round 5's verdict but no findings, so the round whose findings this revision exists to
answer is the only round with no findings recorded. Extend the table (and rename it), or add the counts
to the `## Final status` table.

---

## MINOR

### m1 — "Three blocking reviewers" contradicts the manifest and the record's own table

`:789` opens "**Three blocking reviewers** on `56daee8d`". `agent-routing.yml:202-206` gives
`qfai-atdd` / `review` `blocking_agents: [qa-gatekeeper, completion-reviewer]` with
`implementation-reviewer` in `conditional_agents`, and the record's own table at `:471` states this
correctly. Routing a third reviewer was right; the label is wrong. Round 3's `M4`, round 4's `m1`, round
5's `m1` — **fourth** round unapplied. **Severity: advisory** | **Traces to:** `agent-routing.yml`
`qfai-atdd` phases.

### m2 — the round-2 table still understates `R01` by four findings

`:796` records `implementation-reviewer` at "4 blocking, 6 medium, **5 low**". Counted at
`review-20260820220000000/R01_implementation-reviewer.md`: `B1`-`B4` and `M1`-`M6` as level-3 headings,
plus `m1`-`m9` as bolded bullets under `## Low / nit findings` (`:348`-`:393`) = **19**, not 15. Round
3's `m2`, round 4's `m2`, round 5's `m2` — **fourth** round unapplied. **Severity: advisory** |
**Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m3 — the record's branch-1 reason for `TDD-0069` and the DR's are two different sentences

`atdd:369-374` gives the reason as `CR-20260820-0012`'s self-referential gate; `DR:107` gives it as "the
data it reads cannot exist here". Both are defensible and they are compatible, but round 5's `B2` asked
for `DR:107`'s wording and a reader comparing the two artifacts meets two causes for one row. One
sentence tying them together would close it. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m4 — `## Commands executed + key outputs` records no run of either new assets test

`:210-235` quotes runs for the E2E file, the ledger guard, the matrix test and the classifier, and none
for `stageEvidenceCounts.test.ts` or `retractedClaims.test.ts` — the round's own two artifacts, and the
two whose counts the record states at `:195` and `:198`. Test 2 of the derived-count test permits it
(M2.3). **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:361` (`## Execution logs`).

### m5 — round 1's superseded seal is unpinned

`:986`'s `superseded:` value is the artifact that makes the re-seal auditable (`:1029-1033` argues this
correctly), and no test reads it. I reproduced it (`d8ac0a77...58967c9` over the three reports as they
stand today), so it is right — it is simply the one seal value in the section that nothing will notice
changing. **Severity: advisory** | **Traces to:** `defect:code-quality`.

### m6 — this round's pack is the source of the two `QFAI-REVIEW-*` errors

`.qfai/review/review-20260821060000000/` at `cb91e089` held only `review_request.md`, which raises
`QFAI-REVIEW-004` and `-005` at error severity under `full`. This is a **sequencing note on my own
round**, not a gap: the practice is right and is what fixed round 1's moving-tree problem, and
`:906-907` discloses it accurately. The pack is also the newest on disk, which is what makes M2.2's
window currently green. **Severity: advisory** | **Traces to:** `defect:code-quality`.

---

## Rulings on the questions put to me

### Question 1 — break `retractedClaims.test.ts`

**Broken four ways; see B2.** The blockquote, the fenced block and the table cell all **fail** to escape
it — credit where due, that is a genuine improvement on round 5's version. What does escape it: (a) a
**line break inside the needle**, which is not hypothetical, since Prettier has already made three of
the eight entries unmatchable and one of them unmatchable in **both** files it names; (b) an **entry
missing from the list**, and the one missing right now is the claim this round's own record asserts at
`:880-881`; (c) an entry whose `files` omits the file where the claim survives —
`CR-20260820-0012:130`; and (d) **one unpaired quote character anywhere earlier in the document**, which
inverts the enclosure verdict for everything after it, hides the real assertion and accuses eight
correct quotations instead. The single assertion that would have caught (a) and (c) is: every entry must
match at least one occurrence in every file it names.

### Question 3 — break `stageEvidenceCounts.test.ts` again

**Broken twice; see M2 and B5.** `exec` reads the first match only, so a second, contradictory statement
of any pinned count is invisible — and `:203` is one, today, for the file the test names. And the
in-flight rule now goes red the moment the pack is correctly sealed, which is the one act `SKILL.md:298`
requires before completion; the red moved from pack creation to pack sealing rather than being removed.
Also: test 2 never requires the new files' runs to be recorded, and neither the classifier version nor
`retractedClaims.test.ts`'s own count is pinned.

### Question 5 — re-derive every number

Of the figure groups the request names, **thirteen re-derive exactly**: the suite totals
**1428 / 16 skipped, exit 0** and **1188 / 19, exit 0**; the full profile at `error=4` with its four
members identified; the five closed pack seals plus round 1's superseded one, the two-space variant and
the printed manifest; the unscoped `QFAI-ATDD-112` breakdown 1/4/2/8 = 15 and `-111`'s 8/1/1/1/1 = 12;
the ledger's 82/71/11, 74/6/2 and Integration 63/6/2 with 4 of 6 `blocked` on `CR-20260820-0007`; the
matrix's 3/1/5, its 38+5 cells and its A30/B7/C1 partition with all three class properties holding;
`CR-20260820-0011`'s 208/127/81 and the scoped guard's 8 backed; the six rejected-alternative bullets at
their six line numbers; `ci:lint` exit 0 with eleven members; the scoped gate at `error=2` with the
right membership; and **five of the six per-file test counts**.

**One per-file count is wrong and nine further figures are wrong:**

| figure | recorded | measured |
| --- | --- | --- |
| the matrix test's count | 4 tests pinning the matrix (`:203`) | **5**, and `:193` says 5 (B5) |
| the classifier version | the build classifier, v5 (`:189`, `:581`) | **v6** (`buildCommand.ts:4`, `:24`; `coverage-depth:216`) (B5) |
| P1d's pass count | P1d has run three times (`:859`, `:412`, `:938`) | **four** (`R04:5`, fourth re-route); the same file says four at `:771`, `:774`, `:949`, `:998` (B1) |
| round 5's new test | whose six tests run under `e2e`: 1418 -> 1424 (`:844-845`) | **four**; 1418 -> 1422; 1424 never existed (M1) |
| the round-5 repair's tests | two classifier rounds and three loop-guard tests (`:845`) | the ledger test is byte-identical to `3f815725`; 1186 + 2 = 1188 proves it (M1) |
| the integration+unit move | twelve joined `unit` (`:844`) | 9 `unit` + 3 `integration` (M1) |
| the full profile's ATDD errors | the scoped `-111` / `-112` (`:906`) | unscoped: 12 US and 15 TCs across five specs (B6) |
| rounds that faulted this section | Rounds 1, 2 and 3 (`:295`) | five, and `:389` says five (B4) |
| round-2 `R01` findings | 4 blocking, 6 medium, 5 low (`:796`) | 4 / 6 / **9** = 19 (m2) |
| the project list | six named (`:834`) | seven in `vitest.workspace.ts` (M1) |

Three of these were introduced **inside the repair of a finding about that exact class**: the duplicate
matrix entry and the `v5` label landed in the list rewritten to answer round 5's `B6`; and the P7
narrative's three attribution errors are in the block rewritten to answer round 5's `B1` and `M3`.

### Question 6 — `TDD-0070`'s remaining blocker, precisely

**One paragraph and two sentences, in artifacts this stage owns, and none of it is analytical.**

P1d has sustained the row's own account five times — post-merge history cannot exist pre-merge, branch
3's own named example — and at `cb91e089` its identity, obligation and `DR-ID` are all exact against
`test-list.md:108`. What is left:

1. **`atdd:880-881`** must stop publishing "degenerate rather than satisfied" as `DR-0017-0010`'s
   position. This is the last surviving instance of the claim P1d blocked on in rounds 4 and 5; the DR
   itself is now clean (`DR:180-191`), so the remaining defect is entirely in the record's summary of it.
   (B1)
2. **`CR-20260820-0012:130`** must stop saying the DR has "now been wrong about clause 1 three times",
   which classifies the sustained statement as an error. `DR:151` is already fixed. (M4)
3. **`### P1d's verdicts` must record the third and fourth passes** and say P1d ran four times, so that
   the section a completion gate reads is not two passes behind the gate it describes. (B1)
4. Then, and only then, is the write mechanically available: `qfai-implement/SKILL.md` step 3b writes
   `todo -> exception` **only when the entry carries the `qa-gatekeeper` PASS P1d took on that `DR-*`**
   (`R04:329-333`). At `cb91e089` the entry records REVISEs and no PASS, which is accurate. So a fifth
   P1d re-route is owed after items 1-3, and the PASS must then be recorded in the `TDD-0070` entry
   before the write.

Nothing about the row's merits is in dispute and nothing new needs measuring. `TDD-0069`'s released
write has its own remaining blocker, and it is B3.

### Are this stage's disclosed gaps complete?

**Closer than any prior round, and no.** The gaps the request names are each genuinely recorded and
accurate, and I could not fault them: **three build-spawning helpers rather than two** — `:593-604` names
**four** places a build is reached, two of them opaque `heuristic` hits inside
`check-build-warnings.mjs`, and `buildCommand.test.ts:307-313` pins the set as a set, so the "spawn
inside a `.mjs`" limit is stated for both `ci:build-verify` and `ci:gate` and the `release.yml` prepack
chain is stated too; **round 3's missing stage gatekeeper** at `:890` and `:896-901`, with the manifest
obligation named; **the full profile at `error=4`** (`:905`, measured, exact); the five inert lanes
(`:728-731`); `US-0017-0007` uncovered by choice (`:732-733`); 127 unbacked claims (`:745-756`); the E2E
surface unable to run a workflow (`:757-760`); Stage Minimum Roles unused for P2-P4 (`:457-483`); and
**the two writes' authorisation state**, which is now correct in all three places it appears —
`:275-277`, `:410-417` and `:935-946` all say neither cell has been written, `:961` credits the one
released write, and `## Gaps` item 8 no longer contradicts them. That last one is the repair I could not
fault anywhere, and it took five rounds.

Undisclosed and material:

1. **The ledger's own `Evidence` cell for both rows contradicts the handover** and carries two retracted
   statements plus a refuted exit condition (B3) — the blocker on the only write any gate has released,
   and P1d named it as a required item.
2. **`DR-0017-0010`'s retracted clause-1 reading is published by the record as current** (B1), in the
   section a completion gate reads first.
3. **`build` needs fifteen TCs, not eight** (B6), across three specs the record's own Gaps item 4 puts
   outside this stage's work.
4. **`retractedClaims.test.ts`'s real coverage is five strings, not eight** (B2), and the record calls it
   the thing that makes retractions "enforced rather than announced" (`:198-200`, and the test's own
   `:15-17`).
5. **`stageEvidenceCounts.test.ts` checks only the first statement of each count** (B5, M2), and the
   record is stating a second, wrong one — while `:851-853` says everything derivable is checked.
6. **The in-flight-pack rule goes red when the pack is correctly sealed** (M2.2), which is the state the
   completion gate will be in.

---

## Required fixes (blocking only)

1. **B1** — `atdd:880-881` to the DR's current statement; `:859` / `:412` / `:938` to four passes; add
   **Third pass** and **Fourth pass** paragraphs to `### P1d's verdicts`.
2. **B2** — assert that every `RETRACTED` entry matches at least one occurrence in every file it names;
   match on whitespace-normalised text; add "degenerate rather than satisfied" with the evidence file, and
   add the CR to entry 7's `files`; scope the quote pairing so one stray character cannot invert the file.
3. **B3** — put the `Evidence`-cell replacement for `TDD-0069` (and `TDD-0070`) into
   `## Ledger rows advanced` as part of the handover, quoting the three retracted fragments
   `test-list.md:107` currently holds and requiring the writer to land the replacement in the same edit as
   `Blocked-By`.
4. **B4** — delete one of `:284-287` / `:302-304`; `:295` to five rounds; diff the section before claiming
   any statement is gone.
5. **B5** — delete `:203`; `:189-190` and `:581` to `v6` and bring `:581-604` up to
   `coverage-depth:200-225`; `stageEvidenceCounts.test.ts:142` to `matchAll` with every occurrence
   required to agree; pin `retractedClaims.test.ts`'s own count.
6. **B6** — `:906` to unscoped, with both counts; add `-112`'s repo-wide 15 and its per-spec split to
   `## Gaps`, cross-referencing `CR-20260820-0012:154-163`.

## Advisory / Change Request proposals

- **Attribute the P7 history** (M1): 9 `unit` + 3 `integration`; round 5's file as four tests
  (1418 -> 1422); round 6's two; drop the loop-guard clause; record `cb91e089` beside both totals; fix
  `:834`'s project list to seven.
- **Re-run the Delta Rejected Guard** against the current artifact set (M3) — a mandatory output, three
  rounds of artifacts uncovered, substance verified sound by me.
- **`CR-20260820-0012:130`** to "twice" (M4).
- **Extend the round table to round 5** (M5) from its `summary.json`.
- **Pin the superseded seal** (m5) and record the runs of both new assets tests (m4).
- **"Three blocking reviewers"** (m1) and the round-2 `R01` count (m2), both fourth-round.
- **A pack in flight breaks two gates for the second round, in the opposite direction** (M2.2, m6).
  `QFAI-REVIEW-004` / `-005` and the in-flight seal rule share one cause: a pack directory whose contents
  cannot exist when it does. A `CR-*` against whichever skill owns `review-artifact-layout.md` is the
  place for the validate half — this is a product obligation upstream never asked for, so per
  `drift-protocol.md#reviewer-originated-obligations` it **must not gate this rework**. M2.2 asks only
  that this spec's own test classify "in flight" by pack contents rather than by sort order, which is
  inside the DoD.

## Open risks / residuals

- **The suite is green and both required legs pass**, so `SKILL.md:313` no longer bars completion on gate
  colour. The scoped gate is still `error=2` and the build profile still `error=4`, both correctly
  disclosed as counts and both mis-scoped in the record's account of two of the four (B6).
- **`TDD-0069`'s released write cannot be exercised cleanly** while `test-list.md:107` says "NOT BLOCKED
  by a CR" and nothing in the handover tells its writer to replace that text (B3). The one piece of
  forward motion five rounds produced is parked on an unlanded one-line instruction.
- **`TDD-0070` needs three textual edits and a fifth P1d re-route**, then a recorded PASS in its entry
  before step 3b will write it. Nothing analytical is owed.
- **Five of the eight `retractedClaims` entries can fire** (B2). The stage's countermeasure against its
  own most-recurring failure runs at 62% of its stated coverage, and the gap includes the instance live in
  the audited record.
- **Two counts are now wrong in artifacts guarded by tests that read only the first match** (B5), so the
  "derived, not typed" claim at `:851-853` is true of first occurrences only.
- **The authorship-separation breach stands** and is unrepairable retroactively. Six rounds of independent
  reviewers repair the gate, not the history.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; the guard closes that direction for `spec-0017` only and is not in `ci:lint`.
- **Eleven oracle rounds in B2 were run against in-memory copies**, so `retractedClaims.test.ts` was never
  executed against a mutated tracked file. Q6 is confirmed live at HEAD by reading `:880-881` against the
  entry list, not by planting anything.
- **Concurrency.** I ran alongside whichever other reviewers this round routes. Own shadow root
  (`tmp/r6/shadow`) and own scratch (`tmp/r6/`); the tracked `.qfai/report/validate.log` was never written
  by me and any run-log pointer in the working tree may reflect another run.

## Evidence checked

- `.qfai/review/review-20260821060000000/review_request.md`;
  `.qfai/review/review-20260821040000000/` all five files (R02, R03 headings, R04, request,
  `summary.json`); `review-20260820220000000/R01_implementation-reviewer.md`; the five earlier packs'
  file listings and blob hashes
- `.qfai/evidence/atdd-spec-0017.md` (whole, 1047 lines);
  `.qfai/evidence/coverage-depth-spec-0017.md` (whole)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically, 82 rows of 9 cells; `:37` and
  `:107-108` read cell by cell); `07_Decisions.md` rejected alternatives; `09_delta.md` section
  `Rejected`
- `.qfai/decisions/DR-0017-0010-*.md:80-200`; `CR-20260820-0012-*.md:125-170`
- `.qfai/assistant/manifest/agent-routing.yml:139-208` (the `qfai-atdd` phases; the `review` block read
  in full)
- `packages/qfai/tests/assets/retractedClaims.test.ts` (whole);
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole);
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (assertions);
  `packages/qfai/tests/helpers/buildCommand.ts` (version header);
  `packages/qfai/vitest.workspace.ts`; root `package.json` (`ci:lint`); `packages/qfai/package.json`
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` (start and finish);
  `git ls-files -s` (83 tracked symlinks); `git archive HEAD` shadow root with native symlink
  re-materialisation (83 of 83 created and verified); shadow-root `validate` at
  `--profile atdd --spec 0017` (`error=2` after the shadow artifact) and `--profile full` (`error=4`),
  with the full `-111` and `-112` membership extracted per spec; `pnpm ci:lint` (exit 0, eleven members
  enumerated from `package.json`); **`pnpm vitest run --project e2e` (exit 0, 1428 / 16)**;
  `--project integration --project unit` (exit 0, 1188 / 19); the six per-file suites
  (9, 22, 11, 5, 6, 3); `node scripts/check-atdd-annotation-ledger.mjs` with and without `--spec 0017`
  (127 unbacked / exit 1; 8 backed / exit 0) plus a 208-claim count over the ledger; `git hash-object`
  over six packs in two seal serializations plus the superseded manifest;
  `git diff --stat 3f815725 cb91e089` (14 files) and per-file; `git show 3f815725:` and
  `git show 54d8d325:` callsite counts for three test files; mechanical re-counts of the ledger
  cross-tab, the matrix tally, partition and class properties, and the test callsites; eleven oracle
  rounds against in-memory copies of the record with two controls; and the audit-hash procedure over
  both readings of the excluded final section (identical, by construction).
- **Not re-run:** the resolver mutations `E6`-`E11`; the matrix falsification rounds `M1`-`M7`, `X*`,
  `Y*`; the classifier's `v6` boundary corpora beyond the pinned real-tree set and the version claim
  itself. No finding above rests on any of them.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`
- [x] Required gates and residual risks are recorded
- [x] No mutation persisted: HEAD `cb91e089` at start and finish, `git status --porcelain` empty at both,
      `.qfai/report/validate.log` still `2b572934ce71305b4fcfc1ac40c34c164f83cf8d`, and every oracle
      round was run against an in-memory copy rather than the tracked tree
