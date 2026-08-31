# R02 — completion-reviewer, round 7

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 7
- **Reviewed revision: `9a37421c`.** `git rev-parse --short HEAD` was `9a37421c` at start and at
  finish; `git status --porcelain` was **empty** at both. HEAD did not move.
- **Audited evidence hash (stage review):
  `sha256:bedf1838121cda22932de05a2ba6b72d84d597b85cfdec3bb663191a2caa45b3`** — the four steps of
  `constitution/shared-skill-delegation-baseline.md:395-441`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status`
  (`0fb71a306c08a4ab9b33531a8d2f7a353c46c1fa14c8826dd4d067a5a445a2fc`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`7a4ef207ba48989d48da9a83a33889b2e54e7a174aadf9747d7838be5a111f5c`), serialized as
  `path + NUL + sha256` sorted by path, hashed. `## Final status` is at `:976` and no `##` heading
  follows it, so truncating and excising remain byte-identical operations. **The coverage-depth hash is
  byte-identical to the one I recorded in round 6** — that file was not touched in this commit range,
  which is itself a finding (B5).
- Authored/edited under review: **none.**
- **Mutations: none.** Every finding below is derivable read-only. The oracle rounds in B6 were run by
  replicating the test's own `flatten` / `quotedSpans` / `occurrences` over the tracked files
  (`tmp/r7/retract.mjs`) — the tree was read, never written, so there was nothing to revert.
  `validate` ran twice against a `git archive HEAD` shadow root at `tmp/r7/shadow` with all **83**
  tracked symlinks re-materialised natively from the index (`total=83 created=83
  verified_as_links=83`); both run-logs landed inside the shadow
  (`tmp/r7/shadow/.qfai/report/run-20260821025307925`) and the tracked `.qfai/report/validate.log` is
  `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` before and after, equal to
  `git rev-parse HEAD:.qfai/report/validate.log`. Scratch under `tmp/r7/` only. No `git checkout` /
  `stash` / `reset`, no commit, no push.
- **No shadow artifact this round.** Rounds 4-6 each had to exclude one extra `QFAI-LINK-001` from 70
  dereferenced wrappers. Native symlink re-materialisation removed it: the scoped run reports exactly
  the two errors the record states, with nothing excluded. Every count below is raw.

## Verdict summary

**Six blocking, seven major, eight minor. One gate PENDING.**

**The suite is GREEN at the revision under review, and I checked the colour before anything else, as
instructed.** `pnpm -C packages/qfai test:e2e` exits **0** with `1431 passed | 16 skipped (1447)`
across `84 passed | 4 skipped` files — `:851` exact. `--project integration --project unit` gives
`1191 passed | 19 skipped (1210)`, exit 0 — `:852` exact. `pnpm ci:lint` exits 0 with exactly eleven
`&&` members; `pnpm check-types` exits 0.

**This is the strongest round on measurement and the weakest on the one thing my domain owns.** Every
figure the request sent me to re-derive reproduces exactly except the P7 derivation: all six closed
pack seals plus round 1's superseded one, the two-space variant and the printed manifest; the ledger's
82/71/11, 74/6/2 and Integration 63/6/2; the matrix's 3/1/5, its 38+5 cells and its A30/B7/C1
partition; `--profile full` at `error=4` with its four members identified; the unscoped `-111` 12 /
`-112` 15 with both per-spec splits; `CR-20260820-0011`'s 208/127/81; the six rejected-alternative
bullets; and **all six per-file test counts**, including the duplicate bullet round 6 found. Round 6's
`B2` needle defect is genuinely closed — all ten entries now match, and all ten are quoted.

**And `## Ledger rows advanced` is false for the seventh consecutive round, `## Final status` still
does not know that round 6 happened, and three of the six round-count sites P1d named by file and line
are not only unfixed but now two behind.**

- **B1.** `:275` opens the handover with "**neither transition is yet authorised**" while the same file
  says four times that P1d authorised one (`:308`, `:798`, `:900-901`, `:1022`). The duplicate
  paragraph round 5's `B2`, round 6's `B4` and P1d's `A4` all required deleted is **still there**, both
  copies, third round. `:295` was corrected to five rounds in the round that made it six.
- **B2.** `## Final status` says "**Five** stage rounds and **four** P1d passes, **fifteen** reviewer
  responses" — six, five and **eighteen** measured — its round table stops at round 5, and `:1032` says
  "**Four** packs, one per round" above **seven** listed directories. `SKILL.md:298` requires the
  completion gate to "check that `## Final status` says what that pack says"; it does not say what
  round 6's pack says at all.
- **B3.** `atdd:439`, `:458`, `:1000`, `:973` and **`DR-0017-0010:10-11`** still say P1d has run three
  times / a fourth re-route is owed. P1d's round-6 `B1` tabulated six such sites by file and line;
  three of the six are unfixed, and the DR — the artifact P1d audits — is one of them.
- **B4.** The P7 derivation is wrong for a third round, **in the row that replaced the one round 6
  faulted**, and the stale sentence the edit failed to delete (`:887-888`) is the arithmetically
  correct one.
- **B5.** The classifier is **v7** in code and in `## Work performed`, **v5** at `:607`, and **v6** in
  the Coverage Depth Matrix — whose test *pins* v6 (`coverageDepthMatrix.test.ts:338`). Round 6's `B5.3`
  with the artifacts swapped. The round's largest code change has no account in either evidence file.
- **B6.** `retractedClaims.test.ts` is green at a revision where the record asserts a refuted claim in
  **four** places, because two retractions my own role established are missing from its list — and
  round 6's required fix (a), "every entry must match at least one occurrence", was **not** applied.

---

## What I re-derived and could not fault

Every number below was measured from the tree at `9a37421c`, not read from a prior report.

1. **The suite is green and both P7 totals are exact.** `test:e2e` -> exit 0,
   `Test Files 84 passed | 4 skipped (88)`, `Tests 1431 passed | 16 skipped (1447)` — `:851` exact.
   `--project integration --project unit` -> exit 0, `171 passed | 4 skipped (175)`,
   `1191 passed | 19 skipped (1210)` — `:852` exact. `pnpm ci:lint` -> exit 0, and `ci:lint` splits on
   `&&` into exactly **eleven** members — `:850` exact. `pnpm check-types` -> exit 0.
2. **All six per-file test counts, measured by running each file.**
   `spec0017LayeredCiScaffoldE2E.test.ts` **9** (`:180`, `:212`),
   `checkAtddAnnotationLedger.test.ts` **22** (`:188`, `:225`), `buildCommand.test.ts` **14** (`:191`,
   `:229`), `coverageDepthMatrix.test.ts` **5** (`:193`, `:227`), `stageEvidenceCounts.test.ts` **7**
   (`:196`), `retractedClaims.test.ts` **5** (`:199`). Round 6's `B5.1` duplicate bullet is deleted and
   the size is now stated once. **This is the first round with no wrong per-file count.**
3. **The ledger, parsed mechanically** (`tmp/r7/ledger.py`): **82** data rows of 9 cells,
   `TDD-0001`-`TDD-0082`, no duplicates, header at `:37`. `Layer`: **71 Integration / 11 Unit**.
   `Status`: **74 refactor / 6 blocked / 2 todo**. Cross-tab Integration **63 / 6 / 2** (`63+6+2 = 71`),
   Unit 11 refactor. `:21-22`, `:257`, `:268` exact. The 6 `blocked` are
   `TDD-0016/0030/0032/0033/0034/0035` and exactly **four** carry `CR-20260820-0007` — `:761-762`
   exact. `test-list.md:107-108` are both `todo`, `DR-ID: -`, `Blocked-By: -` — `:285`, `:302`, `:996`
   exact.
4. **The matrix, parsed mechanically** (`tmp/r7/matrix.py`): 9 rows by 7 depth columns, 9-column
   header. Status totals **3 / 1 / 5** — `coverage-depth:57` and `atdd:472` exact. **38** depth
   failure cells plus **5** in `Status` — `coverage-depth:114` exact. `A 30, B 7, C 1 = 38` —
   `coverage-depth:139` exact.
5. **The scoped gate, with no shadow artifact to exclude.** `info=2 warning=0 error=2`.
   `QFAI-ATDD-111` names `SPEC-0017:US-0017-0007` and nothing else; `QFAI-ATDD-112` names exactly the
   eight `TC-0017-0016, -0030, -0032..-0035, -0069, -0070`. `:232-233`, `:268`, `:855`, `:994` exact.
6. **`validate --profile full` is `error=4`** (`info=4 warning=404`), and the four are
   `QFAI-REVIEW-004`, `QFAI-REVIEW-005` (both naming `.qfai/review/review-20260821080000000`, this
   round's own in-flight pack), `QFAI-ATDD-111` and `QFAI-ATDD-112`. `:857`, `:966-971` exact.
7. **Round 6's `B6` is applied, and applied precisely.** `:967` now says the two ATDD errors under
   `full` are the **unscoped** ones, "12 US across five specs and 15 TCs across four, of which this
   spec owns 1 and 8; `build` needs all fifteen". Measured from the shadow full run:
   `-111` = SPEC-0003 8, SPEC-0006 1, SPEC-0008 1, SPEC-0015 1, SPEC-0017 1 = **12** across **five**;
   `-112` = SPEC-0003 1, SPEC-0008 4, SPEC-0015 2, SPEC-0017 8 = **15** across **four**. Exact,
   including "of which this spec owns 1 and 8". A three-round finding closed on the merits. (What is
   left of it is M4.)
8. **All six closed pack seals reproduce, plus the superseded and two-space variants**
   (`tmp/r7/seal.py`). Manifest form is the git blob hash, a single space, the pack-relative path and a
   newline, in byte order, sha256 over the stream: round 1 `5c8cd425...c74317e3` (`:1046`), round 2
   `305ffd65...5983e77a` (`:1050`), round 3 `257e793b...6d01bfd0` (`:1053`), round 4
   `aaa2d2a6...04db35ff` (`:1056`), round 5 `5798d557...4263b62` (`:1059`), **round 6
   `d99dff9c...726a96752` (`:1062`) — the new one, and it is right**; the superseded
   `d8ac0a77...58967c9` (`:1047`) over round 1 three reports as they stand today; and the two-space
   form gives exactly `fa8d6e83...d17e2526` (`:1089`). Round 1 printed manifest (`:1106-1109`) is
   byte-identical to what I hashed. Round 3 pack correctly holds no `R03_qa-gatekeeper.md`, matching
   `:951`.
9. **The in-flight pack is disclosed without a seal** (`:1064-1065`), and the monotone seal rule is
   right. `stageEvidenceCounts.test.ts:329-339` now requires every older pack to carry a seal and every
   recorded seal — newest included — to recompute. Round 6's `M2.2` is closed the way it was specified:
   this test can be green at the completion gate, which the previous version could not. `:1099-1101`
   recompare-against-the-recorded-value rule is intact and is what `SKILL.md:298` asks for.
10. **`CR-20260820-0011` figures.** `tests/e2e/qfai-traceability.md` holds **208** unique claims;
    `check-atdd-annotation-ledger.mjs` reports **127** unbacked (exit 1), so **81** backed; the scoped
    guard reports `8 claim(s) backed by a test annotation (spec-0017)`, exit 0. `:111`, `:219`, `:222`,
    `:853-854` exact.
11. **The six rejected alternatives, exact.** `07_Decisions.md` carries exactly **six**
    `Decision, rejected alternative` bullets at `:133`, `:137`, `:203`, `:206`, `:242`, `:249` —
    `atdd:34` exact — and `09_delta.md` section `Rejected` carries exactly **three** candidate bullets.
12. **Delta Rejected Guard — substance PASSES for this round artifacts, which I checked myself because
    the record section still does not (M5). No RE-OPEN is required for anything in this round.**
    `07_Decisions.md:133-136` rejects a second parser over the same **YAML**; this round touched
    `buildCommand.ts` (shell strings and `package.json` script maps), `retractedClaims.test.ts` (five
    markdown governance records), `stageEvidenceCounts.test.ts` (markdown + TS sources + the annotation
    ledger) and `coverageDepthMatrix.test.ts` (one markdown table) — no new workflow-YAML parser and no
    second parser of any spec artifact. `07_Decisions.md:137-140` rejects a validator rule under the
    distributed validator surface; every change is under `packages/qfai/tests/**`. The two ledger-timing
    bullets at `:203` and `:206` are untouched — `tdd/test-list.md` is unwritten — and so are `:242` and
    `:249`. Of `09_delta.md` three candidates: the test-case table is unsplit, no SPLIT is proposed on a
    count, and `US-0017-0007` is still withdrawn with 8 spec-0017 ledger claims. `CR-20260820-0012` is
    `Status: open` with `Approved option: -`, so option 5 is not adopted.
13. **Round 6 `B3` first half is applied, and it is the best repair of the round.** `:306-330`
    (`### What the writer must change in the same edit`) quotes the three refuted fragments
    `test-list.md:107` carries, names each as refuted with its ground, and requires the writer to land
    the replacement in the same edit that writes `Blocked-By`. That is exactly P1d round-5 item 4 and
    round-6 `A1`, discharged. **I checked round 6 second half and it does not hold:** the `TDD-0070`
    handover gives that row `DR-ID: DR-0017-0010` and `Blocked-By: -`, so the phrase NOT BLOCKED by a CR
    in its `Evidence` cell is true, and the cell account (needs post-merge history, not satisfiable on
    the branch that introduces the tuning) matches the DR. Its absence from `:306-330` is correct, not a
    half-application. Round 6 over-reached there and I withdraw that half.
14. **Excluding `tdd/test-list.md` from `retractedClaims.test.ts` is right, not an evasion.**
    `SKILL.md:74` makes it read, never written; the `Status` / `DR-ID` / `Blocked-By` / `Evidence` cells
    belong to `/qfai-implement` under the Drift Protocol carve-out; and a guard that reddens on a file
    this stage may not touch is unsatisfiable, which is the exact defect round 5 own version of this
    test had in another direction. The docstring says so at `:34-38` and the record discharges it into
    the handover at `:326-330`. The reasoning is sound and I sustain it. One residual, advisory: the
    exclusion leaves the handover instruction unenforced in both directions — see the CR proposal.
15. **Round 6 `M4` and P1d `B2` are applied.** `CR-20260820-0012:127-135` now quotes both refuted
    wordings — degenerate against this runner, and wrong about clause 1 three times — replaces the
    italics with quotation marks, and states why at `:133-136`. My oracle confirms both occurrences read
    `quoted=true`.
16. **Round 6 `B2` needle defect is closed on the mechanism.** All **ten** entries now match at least
    one occurrence and **all ten are quoted** (`tmp/r7/retract.mjs`, instrumented with the test own
    predicates). Whitespace collapse, per-paragraph quoting and the all-file search each do what the
    docstring claims. Paragraph scoping bounds the stray-quote inversion, which I re-probed. Credit
    where due: three of the four holes round 6 measured are gone.
17. **`stageEvidenceCounts.test.ts` reads every occurrence now** (`:147`, `matchAll`), with disagreeing
    values raised as their own finding (`:160-165`) and a per-**file** floor for recorded outputs
    (`:182-192`). Round 6 `B5.2`, `M2.1` and `M2.3` are applied as specified. The `.each` precondition
    (`:205-226`) is the right shape: assert the rule premise rather than emulate the runner.
18. **The matrix row-width guard is real.** `coverageDepthMatrix.test.ts:57-62` throws when a row field
    count differs from `COLUMNS.length`, which closes the delete-one-pipe-and-the-default-backfills-it
    route round 6 found.
19. **The two claims the request singled out are both correct, measured with `git show`.** Round 5
    `stageEvidenceCounts.test.ts` held **4** callsites at `3f815725`, not six. And the three loop-guard
    tests were already in the 1186 baseline: `checkAtddAnnotationLedger.test.ts` is **19** at
    `54d8d325` and **22** at `0cfa67c9`, and `git diff 3f815725 cb91e089` for that file is **empty**.
    Both retractions at `:875-879` are sound. What the table does with them is B4.

---

## BLOCKING

### B1 — `## Ledger rows advanced` is false for the seventh consecutive round: its opening sentence denies the one authorisation any gate has issued, and the duplicate paragraph three prior findings required deleted is still there in both copies

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:275-277`, `:284-287`, `:302-304`, `:295`, `:436`,
  `:441-443`; against `:308`, `:798`, `:900-901`, `:1022`, `:415`
- **Contract**: `qfai-atdd/SKILL.md:322-325` (`## Ledger rows advanced` is the handover — the payload
  goes in the section); Evidence (MANDATORY); `qfai-implement/SKILL.md` step 3b reads this section;
  round 5 `B2` fixes 2-3, round 6 `B4`, P1d round-6 `A4`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) plus
  `SKILL.md:322-325` / `defect:correctness`

**1. The opening sentence of the section contradicts four other statements in the same file.**

```text
:275-276  "**None advanced. One row is routed to branch 3, one is `blocked`, and neither transition
           is yet authorised**; the rest were not this stage's to route."
```

Against, in the same file:

| site | says |
| --- | --- |
| `:308` | "P1d **released** `todo -> blocked` for `TDD-0069`" |
| `:798` | "P1d's fourth pass **released** that write on the merits" |
| `:900-901` | "Pass 4 **released** `todo -> blocked` for `TDD-0069` — the first write any gate has authorised" |
| `:1022` | "Round 5's P1d **released** `todo -> blocked` for `TDD-0069`, which is the first write any gate has authorised" |

`## Ledger rows advanced` **is** the handover. `/qfai-implement` step 3b reads this section and no
other; the bolded lead sentence tells its reader that nothing is authorised, and `:436` ("Neither
transition is authorised yet:") and `:441-443` repeat it with a reason P1d third pass gave and its
fourth pass superseded ("step 3b leaves a row at `todo` when its handover entry is malformed"). The one
piece of forward motion six rounds produced is denied by the section that carries it, while `:306-330`
— nineteen lines further down, added this round — is written on the premise that the release happened.
Same failure class, in the artifact that is the handover, for the seventh round.

**2. The duplicate paragraph is still there, both copies.** `:284-287` and `:302-304` are the same
paragraph seventeen lines apart, citing the same two ledger lines. Round 5 `B2` required one deleted;
round 6 `B4` required it again; P1d round-6 `A4` listed it a third time.
`git diff cb91e089 HEAD -- .qfai/evidence/atdd-spec-0017.md` touches neither. **Third round unapplied.**

**3. `:295` was corrected in the round that made it wrong again.** It now reads "**Rounds 1 through 5**
each found a false statement in this section". Round 6 found two — the duplicate paragraph and this very
sentence (`B4`) — so the number is six, by the same convention `:415` uses. Fifth round in which the
count of rounds that faulted this section is wrong inside this section.

**Required fix.** `:275-276` to state that `TDD-0069 -> blocked` **is** authorised (P1d pass 4,
sustained pass 5) and `TDD-0070 -> exception` is not, so the lead agrees with `:308`, `:900-901` and
`:1022`; likewise `:436` and `:441-443`. Delete `:302-304` **or** `:284-287` — one, not both — and
verify with `git diff cb91e089 HEAD` before claiming it is gone. `:295` to six, or reword it to point at
`:415`. Add the phrase "neither transition is yet authorised" to the `retractedClaims.test.ts` list so
the eighth attempt at this class is enforced rather than announced.

### B2 — `## Final status` does not say what round 6 pack says: three counts are one round stale, the round table stops at round 5, and the pack count says four above seven directories

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1010-1012`, `:1014-1020`, `:1032`, `:1038-1042`,
  `:946-955`, `:1068`; against `.qfai/review/review-20260821060000000/summary.json` and the seven pack
  directories on disk
- **Contract**: `qfai-atdd/SKILL.md:298` — recompute the seal over the recorded path and compare it with
  the **recorded** value, **and check that `## Final status` says what that pack says**; Evidence
  (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:298` (Definition of Done, P8 seal) /
  `defect:correctness`

`SKILL.md:298` gives the completion gate exactly two jobs on this section: recompute the seals against
the recorded values, and check that the section says what the pack says. **The seals all pass. The
second job fails four ways.**

```text
:1010   "Five stage rounds and four P1d passes, fifteen reviewer responses, every one REVISE."
```

Measured by counting `Rxx_*.md` in each pack directory:

| pack | responses |
| --- | --- |
| `review-20260820200000000` | 2 (R02, R03) |
| `review-20260820220000000` | 4 (R01, R02, R03, R04) |
| `review-20260821000000000` | 3 (R01, R02, R04) |
| `review-20260821020000000` | 3 (R02, R03, R04) |
| `review-20260821040000000` | 3 (R02, R03, R04) |
| `review-20260821060000000` | 3 (R02, R03, R04) |
| **total** | **18** |

So: **six** stage rounds, **five** P1d passes (`:899` says five, correctly, 111 lines earlier), and
**eighteen** responses. Three figures, all the round-5 values, in the sentence whose stated purpose is
"the full set, because an earlier version of this line named round 1 alone and round 5 found it still
doing so".

**The table at `:1014-1020` stops at round 5.** Round 6 pack landed in this very commit range — `R02`,
`R03`, `R04` in `ac4700d1` and `summary.json` in `9a37421c` — and the round whose findings this revision
exists to answer has no row. Its `summary.json` records `completion-reviewer` FAIL/18, `qa-gatekeeper`
FAIL/20, `qa-gatekeeper` (P1d) FAIL/3, on `cb91e089`. Nothing in `## Final status` reflects any of it.
`### Round 3 and round 4` (`:946-955`) also still stops at round 4, so rounds 5 **and** 6 have no
finding counts anywhere (M6).

**And `:1032` says "Four packs, one per round"** above a block listing **seven** directories
(`:1044-1066`). That sentence is followed at `:1038-1042` by: the count itself was wrong until now, this
section said "Three packs" against four directories, round 4 caught it, and it is now derived because
`stageEvidenceCounts.test.ts` compares the packs this section names against the directories on disk.
The test compares the **names** (`:307-310`); nothing reads the numeral. So the one defect the section
announces as fixed-by-derivation has recurred in the same sentence, and `retractedClaims.test.ts`
carries the *old wording* ("Three packs", `:102-104`) rather than the invariant — a list that tracks
wording, not claims (B6).

`## Final status` is the section a completion gate reads first, and it is the one part excluded from
every audit subject, which is precisely why `SKILL.md:298` puts a human-checkable obligation on it.

**Required fix.** `:1010` to six stage rounds, five P1d passes, eighteen reviewer responses. Add a
round-6 row to `:1014-1020` with `cb91e089` and REVISE. `:1032` to seven packs (six closed, one in
flight), and derive the numeral: pin it against `packsOnDisk().length` in
`stageEvidenceCounts.test.ts`, which is the only change that stops this recurring an eighth time.
Extend the finding-count table to rounds 5 and 6 from their `summary.json` (M6).

### B3 — three of the six round-count sites P1d tabulated by file and line are unapplied, and they are now two behind; one of them is the Decision Record P1d audits

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:438-439`, `:458`, `:973`, `:1000`, `:797`;
  `.qfai/decisions/DR-0017-0010-*.md:10-11`; against `atdd:899` and
  `.qfai/review/review-20260821060000000/R04_qa-gatekeeper-p1d.md:268-281`, `:355-356`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); Stage Gate P1d;
  `qfai-implement/references/red-provenance.md:267` (the entry is the table row **plus** its anchored
  section)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d plus Evidence (MANDATORY)
  / `defect:correctness`

P1d round-6 `B1` printed a six-row table of every site in this record and the DR that undercounted its
review history, each with a file and a line. Three were fixed. Three were not, and because P1d ran a
fifth time in the interval, the unfixed ones are now **two** short:

```text
atdd:438-439  "needs the P1d `qa-gatekeeper` PASS on `DR-0017-0010`, and P1d has
               returned `REVISE` three times"                                  -> five
atdd:458      "This is the row P1d sustained across three passes"              -> five
atdd:1000     "P1d has returned `REVISE` three times"                          -> five
atdd:973      "A fourth P1d re-route and a fifth stage round are owed"         -> sixth, seventh
DR:10-11      "P1d has returned **REVISE** three times ... Revised a third time
               below; a fourth re-route is owed"                               -> five; sixth
```

`atdd:899` says P1d has run **five times** and is correct, so the record disagrees with itself four
times over, and `:797` says "sustained **four times** running" — a fifth value for the same quantity.

Two of these are load-bearing rather than cosmetic:

- **`DR:10-11` is the `Status` field of the artifact P1d exists to audit.** A `todo -> exception`
  transition names this DR in the ledger `DR-ID` column; a reader arriving there is told the gate has
  refused three times when it has refused five, and that the next re-route is the fourth when it is the
  sixth. P1d named this file and line in round 5 and again in round 6.
- **`atdd:438-439` and `:458` are inside the two anchored `### TDD-NNNN` sections**, which
  `red-provenance.md:267` makes part of each row entry. `:458` also routes its reader to the
  `P1d's verdicts` section, where the correct figure is.

**Required fix.** All five sites to the measured values in one edit, with `atdd:797` reconciled to five.
Then add the wordings "P1d has returned REVISE three times" and "sustained across three passes" to
`retractedClaims.test.ts` — both are already refuted, all three occurrences are unquoted today, and the
entries redden immediately (B6, measured).

### B4 — the P7 derivation is wrong for a third round, in the row that replaced the one round 6 faulted; the stale sentence the edit failed to delete is the correct derivation, and it contradicts the new table

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:868-888`, specifically `:880-881` and `:885-888`;
  measured against `git show` at `0cfa67c9`, `3f815725`, `c40b2358`, `cb91e089`, `9a37421c`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Evidence (MANDATORY); round 3 `B4`, round 5
  `B1` and `M3`, round 6 `M1`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

Both endpoints are exact (verified item 1). Three of the five rows re-derive exactly, including both
claims the request singled out (verified item 19). The fourth does not, and `:885` asserts of all of
them: "**Every figure in the block above is the measured one at the revision named.**"

Callsites, counted with `git show` at each revision:

```text
file                            0cfa67c9  3f815725  c40b2358  cb91e089  9a37421c
stageEvidenceCounts.test.ts            0         4         6         6         7
retractedClaims.test.ts                -         -         -         3         5
coverageDepthMatrix.test.ts            4         4         5         5         5
buildCommand.test.ts                   9         9        11        11        14
checkAtddAnnotationLedger.test.ts     22        22        22        22        22
```

The row under review:

```text
:880-881  "round 6   retractedClaims.test.ts (5 tests), the matrix row-width round and
                     stageEvidenceCounts' .each precondition      1422 -> 1431"
```

Three defects in one row:

1. **`retractedClaims.test.ts` held 3, not 5, when round 6 added it** (`cb91e089`). Five is its size at
   HEAD. The same conflation round 6 faulted — crediting the round that *opened* with the *final* size
   of a file — reproduced one line below the sentence retracting it.
2. **The matrix row-width round contributed zero tests.** `coverageDepthMatrix.test.ts` is 5 at
   `cb91e089` and 5 at HEAD; `git diff cb91e089 HEAD` on it is 18 insertions / 11 deletions with no new
   callsite. It is named as a cause of a `+9` it did not contribute to.
3. **The stated causes do not sum to the delta.** 5 + 0 + 1 = 6, against `1431 - 1422 = 9`. The missing
   three are `stageEvidenceCounts` 4 -> 6 (round 6 opening) and `coverageDepthMatrix` 4 -> 5 (round 5
   repair) — and the second means the row labelled "round 6" silently absorbs round 5 repair, which is
   the exact telescoping round 6 `M1` faulted.

**And the sentence the edit failed to delete is the right one.** `:887-888` still reads: Round 6 opened
with `retractedClaims.test.ts`, three more under `e2e`: 1425 -> 1428. Measured: `1422 + 3` (round 5
repair: `stageEvidenceCounts` +2, matrix +1) `= 1425`, and `1425 + 3` (three tests in
`retractedClaims.test.ts`) `= 1428`, which is the total round 6 measured at `cb91e089`. **The stale
sentence is arithmetically correct and the replacement table is not** — an insertion where a replacement
was intended, the same edit failure as B1.2, in the block rewritten to answer a finding about this
block.

Two further items from round 6 `M1`, both still open:

- **No revision is recorded beside either total.** `:846-847` still says these numbers are measured at
  the tree that carries every **round-4** repair — a caption three rounds stale in front of round-7
  numbers — while `:890` says they carry a statement of when they were measured. Round 3 `B4` third
  clause and round 5 `B1` both asked for the hash. **Fourth round open.**
- `:860-861` still enumerates **six** projects and then names `e2e` as a seventh in the next clause;
  `vitest.workspace.ts` declares seven.

**Required fix.** Split `:880-881` into the four commits it spans using the measured callsite deltas:
`1422 -> 1425` (round 5 repair), `1425 -> 1428` (round 6 opening), `1428 -> 1431` (round 6 repair:
`retractedClaims` +2, `stageEvidenceCounts` +1); drop the row-width round from the arithmetic and record
it as a zero-test change; delete `:887-888`; record `9a37421c` beside both totals; fix `:860` to seven
projects. Then check the sum against the endpoint before writing that every figure is the measured one.

### B5 — the classifier is v7, v6 and v5 in three artifacts at once, the Coverage Depth Matrix was not opened at all, and its test pins the stale version with a regex the version history satisfies forever

- **Artifacts**: `packages/qfai/tests/helpers/buildCommand.ts:4`, `:23-31`;
  `.qfai/evidence/atdd-spec-0017.md:189`, `:607-624`;
  `.qfai/evidence/coverage-depth-spec-0017.md:216-225`, `:189-214`;
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:335-338`
- **Contract**: `qfai-atdd/SKILL.md:342` (`## Work performed (what changed, where)`); `:361`
  (`## Execution logs`); Evidence (MANDATORY); the Coverage Depth Matrix is a required section
  (`SKILL.md:322-330`); round 6 `B5.3`; round 6 `qa-gatekeeper` `B6`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) plus
  `SKILL.md:322-330` / `defect:correctness`

The largest code change of the round is a full rewrite of the build classifier —
`buildCommand.ts:4` reads "**Seven** versions" and `:23-31` states the three narrowings of v7.
`## Work performed` follows it: `:189` says **v7**. Two other artifacts did not.

```text
atdd:607            "v5 lives in packages/qfai/tests/helpers/buildCommand.ts with its corpora
                     in packages/qfai/tests/unit/buildCommand.test.ts, and it changes three
                     things: ..."                                            <- v5-era, whole
coverage-depth:216  "v6 lives in packages/qfai/tests/helpers/buildCommand.ts ... It keeps the
                     v5 shell segmentation ... and adds the three distinctions v5 was missing"
                                                                             <- v6-era
```

`git diff cb91e089 HEAD -- .qfai/evidence/coverage-depth-spec-0017.md` is **empty**, and I can prove it
independently: the coverage-depth SHA-256 in my audit hash is byte-identical to the one I recorded in
round 6. So one of the two evidence files the request names as the unit under review, and the one that
holds the classifier account, was not opened.

Consequences, in order of weight:

1. **No account of v7 exists in any evidence artifact.** `coverage-depth:189-214` narrates v1-v5 and
   `:216-225` narrates v6 against the ten defects round 5 measured. Round 6 `qa-gatekeeper` measured v6
   at **20 missed / 2 false positives over 46 cases** and reported `pnpm build`,
   `pnpm --filter qfai build` and `pnpm -F qfai build` giving three different verdicts for one command
   (`R03:160-293`). v7 exists to answer that; the answer is written only in a test helper docstring,
   which is not evidence. `atdd:607-624` is worse than silent — it describes the three changes of v5 as
   current.
2. **`coverageDepthMatrix.test.ts:338` pins the stale version.** The assertion is
   `expect(text, ...).toMatch(/v6/)` with optional backticks, so the guard written to stop the version
   drifting is what holds the record at v6. Round 6 `X8` — "the version named in the record drifts back
   — REDDENS", `atdd:727` — now reddens on **correcting** it.
3. **That pin cannot detect the drift it was written for.** It requires only that v6 appear *somewhere*
   in the file. `coverage-depth:195-200` already lists v3, v4 and v5 as history lines, so the moment the
   record is updated to v7 the history list will contain a v6 line and the assertion will pass forever
   regardless of which version the record describes. It is vacuous going forward, by construction, from
   the established shape of the file itself.

This is round 6 `B5.3` with the artifacts swapped: last round the ATDD record said v5 while the matrix
said v6 and the pin was right; this round the ATDD record says v7 while the matrix says v6 and the pin
is wrong. The applied-to-one-artifact-not-the-other pattern, seventh round.

**Required fix.** `atdd:607-624` rewritten for v7, citing the measured 20/2 over 46 from round 6 and the
three-verdict defect, and `coverage-depth:216-225` likewise with a v7 heading and the v6 paragraph moved
into the history list. `coverageDepthMatrix.test.ts:338` to the current version, and made non-vacuous:
match the version inside the sentence that **describes** the live helper, anchored to the phrase naming
`buildCommand.ts`, rather than any occurrence in the file. Add the classifier version to the `CLAIMS` of
`stageEvidenceCounts.test.ts` so the label in the ATDD record is derived too — round 6 `B5` asked for
that and it is not there (M3).

### B6 — `retractedClaims.test.ts` is green at a revision where the record asserts a refuted claim in four places: two retractions my role established are absent from its list, one is evaded by wording, and round 6 required fix (a) was not applied

- **Artifacts**: `packages/qfai/tests/assets/retractedClaims.test.ts:68-109`, `:229-241`;
  `.qfai/evidence/atdd-spec-0017.md:137`, `:438-439`, `:458`, `:1000`, `:580`;
  `.qfai/decisions/DR-0017-0010-*.md:10-11`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the stated purpose of the file at `:4-9` —
  prose cannot be trusted to say whether prose was deleted, so the rule is enforced instead of
  announced; round 6 `B2` required fixes (a) and (c)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

I replicated the `flatten`, `quotedSpans` and `occurrences` functions of the test over the five
governance files (`tmp/r7/retract.mjs`), read-only. The mechanism is genuinely fixed: **all ten entries
match, and all ten are quoted.** What has not changed is that the coverage of the list is a list of ten
strings, and the record is violating claims that are not on it.

Asked to name a retraction my own role established in rounds 3-6 that is missing from the list: **two,
and both are live at HEAD.**

```text
candidate needle                              occurrences  verdict
"P1d has returned REVISE three times"         3 unquoted   *** WOULD REDDEN ***
    atdd:438-439, atdd:1000, DR-0017-0010:10-11
"the row P1d sustained across three passes"   1 unquoted   *** WOULD REDDEN ***
    atdd:458
"Rebuilt around the verb"                     1 unquoted   *** WOULD REDDEN ***
    atdd:137
```

1. **"P1d has returned REVISE three times."** Round 6 `B1` and P1d round-6 `B1` both established this as
   false and P1d tabulated six sites. It stands as a bare assertion in three places at HEAD (B3),
   including the `Status` field of the Decision Record P1d audits. The nearest entry on the list is
   nothing at all. **This is round 6 `B2` defect 3 exactly — the retraction the record is violating right
   now is not on the list — reproduced in the round that answered it.**
2. **"Rebuilt around the verb"** (`atdd:137`) is the claim of entry 7 in different words. Entry 7 is
   "rebuilt the scan around the verb" and it now matches exactly one occurrence, in
   `coverage-depth:206`, quoted. `atdd:137-142` asserts "Rebuilt around the verb and re-observed:
   **10 of 10 forms redden**" as a live statement about the round-1 repair, while `atdd:580` retracts it
   by name: it was **not** anchored on the verb as the code comment and this record both claimed, it was
   a closed five-member package-manager list. A five-character difference in the needle, and the guard
   looks past it. P1d round-6 hole 3 named this property — a literal-substring list tracks wording, not
   claims — and neither the docstring nor the record discloses it.
3. **Round 6 required fix (a) was not applied, and it is the assertion that would have caught the pack
   count.** The fifth test, "keeps every entry in a form the search can match" (`:229-241`), checks that
   `RETRACTED.length` exceeds 8, that each claim carries no emphasis markers, that each `why` is
   non-empty, and that `GOVERNANCE.length` exceeds 4. **It never checks that an entry matches anything.**
   So an entry whose wording has drifted is indistinguishable from a retraction that was cleaned up —
   which is what entry 9 has become: "Three packs" is a wording that no longer exists anywhere except
   inside its own retraction, while the current claim in the same sentence, four packs against seven
   directories, goes unguarded (B2).

The docstring claims all four of the round-6 holes are closed (`:24-32`). Three are. The fourth — a
per-entry `files` list, so a claim asserted in a file the entry did not name was free — was closed by
searching every file, which is right; but the general form of that hole is a claim no entry names, and
the assertion round 6 specified for it was dropped.

**Required fix.** (a) Add "P1d has returned REVISE three times", "sustained across three passes" and
"Rebuilt around the verb" to `RETRACTED`, then apply B3 and correct `atdd:137`, so the suite is green on
the merits rather than on the omission. (b) Assert that **every** entry matches at least one occurrence
across `GOVERNANCE` — the assertion round 6 specified; it costs one line over the result of
`occurrences()` and it is the only structural defence against wording drift. (c) Add the
`## Final status` pack-count invariant (B2) and the phrase "neither transition is yet authorised" (B1).
(d) Disclose in the docstring that the list tracks wordings rather than claims, since that is the
residual after (b).

---

## MAJOR

### M1 — `## Execution logs` gives three mutation ids two different meanings each, and `## Final status` counts those three twice in its round tally

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:651`, `:673-682`, `:720-728`, `:982-987`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs`); Evidence (MANDATORY); round 5 `B7` (define
  the families) and the reason the record itself gives for renaming off `L*` and `Z*` (`:986-987`)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The heading at `:651` reads `### M1-M7, X1-X8, Y1-Y3` and its block at `:673-682` lists
`X1 X2 X3 X6 X7 X8 Y1 Y2 Y3`. The heading at `:720` reads `### X6-X9` and its block at `:724-728` lists
`X6 X7 X8 X9`. The contents are different mutations:

| id | first meaning (`:673-682`) | second meaning (`:724-728`) |
| --- | --- | --- |
| `X6` | two members swap classes, so both sums survive | a ninth all-failing depth column is added |
| `X7` | a cell is claimed by two classes at once | the refuted accuracy figure is restored |
| `X8` | a table cell is emptied, silently read as a warning | the version named in the record drifts back |

`## Final status:982-985` then counts **sixteen** falsification rounds on the matrix pinning test
(`M1`-`M7`, `X1`-`X3`, `X6`-`X8`, `Y1`-`Y3`) **and** **four** on the prose of the matrix record
(`X6`-`X9`) — so three rounds are counted in both totals and the tally the record gives of its own
oracle work is overstated by three. The heading at `:651` also claims `X1`-`X8`, eight ids, while
listing six. `:986-987` explains that `L*` and `Z*` were abandoned because `L1`/`L3` collided with the
layer codes; the replacement collides too. **Required fix:** renumber the second family and correct
both totals in `## Final status`.

### M2 — `:731-734` asserts a pin this round deleted, and the hand-off it was deleted for is recorded nowhere in the evidence

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:727`, `:731-734`; against
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:325-340` and
  `git diff cb91e089 HEAD -- packages/qfai/tests/assets/coverageDepthMatrix.test.ts`
- **Contract**: `qfai-atdd/SKILL.md:342`, `:361`; Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

This round **removed** the assertion that the string "0 misclassified" is absent from the matrix record,
on the stated ground that it conflicted with `retractedClaims.test.ts`, which permits the figure quoted —
a defensible and well-argued trade, recorded in the comment of the test at `:325-331`. The evidence record
was not told. `:734` still reads: the header is compared to the column list now, and the **absence** of
the refuted figure is pinned. And `:727` still lists `X7  the refuted accuracy figure is restored
REDDENS` under a family whose instrument no longer contains that check. The **outcome** still holds —
restoring the figure unquoted reddens `retractedClaims.test.ts` — but the account the record gives of
which instrument holds it is false, and a deliberate design change of this round is undisclosed in the
one artifact a completion gate reads. **Required fix:** rewrite `:731-734` to record the hand-off and
re-attribute `X7` to `retractedClaims.test.ts`.

### M3 — `stageEvidenceCounts.test.ts` still does not pin the two things round 6 named, while `:890-893` says everything derivable is checked, and its OWED list codifies the two missing command records

- **Artifacts**: `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:107-138`, `:182-187`,
  `:210-216`; `.qfai/evidence/atdd-spec-0017.md:890-893`, `:210-236`, `:199`, `:189`
- **Contract**: `qfai-atdd/SKILL.md:361`; Evidence (MANDATORY); round 6 `B5` required fix and `m4`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:code-quality`

Round 6 `B5` required two additions to `CLAIMS`: the own count of `retractedClaims.test.ts`, "the only
new test file whose count is unpinned", and the classifier version. **Neither is there.** `CLAIMS`
(`:107-138`) holds six entries covering five files; `retractedClaims.test.ts` appears in none of them and
is likewise absent from `COUNTED` (`:210-216`). So the "5 tests" at `:199` and the "v7" at `:189` are both
typed, while `:890-893` says everything derivable about the artifacts — per-file test counts, annotated
describes, the recorded guard output, the named packs — is now checked by that test rather than typed. Two
of my six blocking findings are numbers inside the scope of that sentence: the pack count in B2 and the
version label in B5.

The `OWED` list at `:182-187` names four files and, correctly, requires each to appear — a real
improvement on a bare `rows.length > 2`. But it omits `stageEvidenceCounts.test.ts` and
`retractedClaims.test.ts`, which turns round 6 `m4` from an omission into a pinned expectation:
`## Commands executed + key outputs` (`:210-236`) records runs for four files, and the two the round
added are now **permitted** to stay unrecorded. **Required fix:** add both files to `CLAIMS`, `COUNTED`
and `OWED`, record their runs at `:210-236`, and narrow `:890-893` to what is actually derived.

### M4 — `## Gaps` item 3 still presents eight as the whole `QFAI-ATDD-112` obligation, so the section a completion gate reads for obligations understates it by seven

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:760-762`, `:763-770`; against `:967` and
  `.qfai/decisions/CR-20260820-0012-*.md:154-163`
- **Contract**: `qfai-atdd/SKILL.md:294` (repository quality gates); `:305` (Not-done: validation
  evidence failing); round 4 P1d `M1`, round 5 `M2`, round 6 `B6`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality
  gates) / `defect:correctness`

The substance of round 6 `B6` is applied, and applied exactly, at `:967` (verified item 7) — so this is a
placement and completeness residual, not the third recurrence of the error. `## Gaps` item 3 still reads
that `QFAI-ATDD-112` still reports 8 spec-0017 TCs, correct, and that it clears when those rows are
implemented; item 4 gives the sibling picture for `QFAI-ATDD-111` (11 plus 1 makes 12, exact) and says
nothing about the seven belonging to `-112`. A reader of `## Gaps` — which is where this skill puts the
obligations that survive completion — is told the obligation is eight rows of this spec, when `build`
needs fifteen across four specs and seven of them are other specs to close. **Required fix:** add the
repo-wide 15 for `-112` with its per-spec split to item 3 or item 4, cross-referencing
`CR-20260820-0012:154-163` and `:967`.

### M5 — the Delta Rejected Guard section still covers rounds 1-2 artifacts only, fifth round, and this round added two more to the uncovered set

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:31-50`
- **Contract**: `constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`;
  `qfai-atdd/SKILL.md` Delta Rejected Guard (MANDATORY output)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard

`:46-50` reasons about `check-atdd-annotation-ledger.mjs` and about not writing `06_Test-Cases.md`. It
says nothing about `buildCommand.ts` or `buildCommand.test.ts`, nothing about
`stageEvidenceCounts.test.ts`, nothing about `coverageDepthMatrix.test.ts`, nothing about
`retractedClaims.test.ts` (now reading five governance records), and nothing about option 5 of
`CR-20260820-0012`. Round 4 `m3`, round 5 `M5`, round 6 `M3` — **fifth round**, and the guard is a
mandatory stage output. **I ran it myself and the conclusion holds** (verified item 12): no rejected
option is reintroduced and **no RE-OPEN is required for anything in this round**. So this is a
completeness defect in a mandatory output, not a substantive collision. **Required fix:** re-run the
section against the current artifact set and record the sentences, including the one distinguishing
option 5 of `CR-20260820-0012` from the rejected split candidates in `09_delta.md`.

### M6 — `### Round 3 and round 4` still stops at round 4, so the two rounds whose findings this revision answers have no counts anywhere

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:946-955`; against
  `.qfai/review/review-20260821040000000/summary.json` and
  `.qfai/review/review-20260821060000000/summary.json`
- **Contract**: `qfai-atdd/SKILL.md:298`; Evidence (MANDATORY); round 6 `M5`, P1d round-6 `A3`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY)

Both rounds of counts are on disk: round 5 gives 17 / 17 / 3 and round 6 gives 18 / 20 / 3, and the
reports break down to 7-5-5 and 6-5-6 with 10 blocking from the gatekeeper and 2 blocking from P1d.
`:1014-1020` carries verdicts without findings, so `:946-955` is the only place findings are tabulated
and it is two rounds behind. Round 6 raised it; P1d raised it and also corrected the round-4 P1d row
from 3 blocking to 2 blocking plus 3 major, which is still uncorrected at `:955`. **Required fix:**
extend and rename the table through round 6, and fix `:955`.

### M7 — the round-6 `summary.json` misstates two of its three reports finding counts by the rule it declares, and that file is inside the seal

- **Artifacts**: `.qfai/review/review-20260821060000000/summary.json`; against
  `R02_completion-reviewer.md` and `R04_qa-gatekeeper-p1d.md` in the same pack
- **Contract**: `qfai-atdd/SKILL.md:298` (check that `## Final status` says what that pack says); the
  pack contract behind `QFAI-REVIEW-004`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:298` / `defect:correctness`

`summary.json` declares its own rule: distinct finding identifiers matching `(F|BL|B|M|L|N|A)-?NN`, or
the count of heading-level-3 sections where a report uses no identifiers. Counted against the reports:

```text
R02_completion-reviewer.md   B1-B6, M1-M5, m1-m6              = 17   recorded 18
R04_qa-gatekeeper-p1d.md     B1, B2, M1, A1-A5                =  8   recorded  3
R03_qa-gatekeeper.md         B1-B10 plus the advisory section  = 20   recorded 20   OK
```

The verdict line of `R02` says six blocking, five major, six minor, which is 17. This is the artifact
`SKILL.md:298` makes the completion gate compare `## Final status` against, and it is inside the sealed
pack, so the seal certifies a wrong figure rather than catching it. **Required fix:** correct both values
— a pack edit means a re-seal, and the round-1 precedent at `:1093-1097` says record the superseded value
when you do — or state the rule the counts actually follow.

---

## MINOR

### m1 — "Three blocking reviewers" contradicts the manifest and the table in the same record

`:815` opens with "**Three blocking reviewers** on `56daee8d`". `agent-routing.yml:202-206` gives
`qfai-atdd` / `review` `blocking_agents: [qa-gatekeeper, completion-reviewer]` with
`implementation-reviewer` in `conditional_agents`, and the table at `:497` states it correctly. Routing a
third reviewer was right; the label is wrong. Round 3 `M4`, round 4 `m1`, round 5 `m1`, round 6 `m1` —
**fifth** round unapplied. **Severity: advisory** | **Traces to:** `agent-routing.yml` `qfai-atdd`
phases.

### m2 — the round-2 table still understates `R01` by four findings

`:820-822` records `implementation-reviewer` at 4 blocking, 6 medium, **5 low**. Counted at
`review-20260820220000000/R01_implementation-reviewer.md`: `B1`-`B4` and `M1`-`M6` as level-3 headings
plus `m1`-`m9` as bolded bullets under the low findings section, which is **19**, not 15. Round 3 `m2`,
round 4 `m2`, round 5 `m2`, round 6 `m2` — **fifth** round unapplied. **Severity: advisory** |
**Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m3 — the round-6 seal was taken one commit after its last reviewer response, with no superseded value recorded

`SKILL.md:298` fixes the seal at when the last reviewer response lands. The three round-6 reports landed
in `ac4700d1`; `summary.json` and the seal both landed in `9a37421c`. So the recorded seal is over a pack
that was edited after its reviewers finished — the same shape as round 1, for which the record keeps a
`superseded:` value and argues at `:1093-1097` that keeping it is what makes the re-seal auditable. No
such value exists for round 6. **I verified nothing was laundered:**
`git diff --stat ac4700d1 9a37421c -- .qfai/review/review-20260821060000000/` is `summary.json` alone, 15
insertions. So this is an auditability gap rather than a defect. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md:298` / `defect:code-quality`.

### m4 — the account of which packs were missing `summary.json` does not match the history, and the round-6 recurrence is unrecorded

`:1033-1034` says rounds 2 and 3 were missing their `summary.json` until round 3 found it, and that the
round-4 one was missing until the round-4 gatekeeper found the same thing again; `:1068` says the round-5
pack was missing its `summary.json` when its reviewers landed, for the third time in five packs. Traced
with `git log --diff-filter=A` per file: the round-3 and round-4 `summary.json` each landed in the **same
commit** as their reports (`2d3426aa`, `0cfa67c9`), so neither pack was ever sealed without one; the
round-2 one landed two commits late (`2d3426aa`), the round-5 one one commit late (`cb91e089`), and **the
round-6 one one commit late (`9a37421c`)** — the fourth occurrence in six packs, and it is not recorded.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m5 — `:625-627` names one build-spawning helper; the docstring of the helper now names three

`:625-627` states the limit as `scripts/check-build-warnings.mjs` spawning the build, and reading
`package.json` being unable to follow a `spawnSync` inside a helper. `buildCommand.ts:33-38` now says
that `scripts/check-build-warnings.mjs`, `scripts/verify-pack.mjs` and
`scripts/check-publish-dry-run.mjs` each reach `prepack -> npm run build -> tsup`, and that only the
first has a filename saying build, so only commands reaching it land on `heuristic`. The disclosed gap is
narrower than the one the code documents, and the only-the-first clause is the load-bearing part.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m6 — no oracle round is recorded for either guard this round rewrote, and the three-live-violations claim appears nowhere in the evidence

`## Execution logs` has families for the shipped tree, the version resolver, the matrix test, the ledger
ratchet, the loop guard, the matrix prose and the derived-count test — and **none** for
`retractedClaims.test.ts` or for the row-width guard, the two instruments this round rebuilt. The review
request states that the rewritten guard found three live violations on its first run and that all are
quoted now (`review_request.md:31-32`); that finding is in no evidence artifact, so the one piece of
evidence that the rewrite has discriminating power is visible to reviewers and not to a completion gate.
`## Commands executed` records no run of it either (M3). **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md:361` (`## Execution logs`).

### m7 — corpus gap in the flag handling of v7, routed rather than adjudicated

`buildCommand.ts:111` puts `--filter` and `-F` in `CONSUMING` and `:127` puts `-C`, `--dir`, `--cwd` and
`--prefix` in `DIR_FLAGS`, both as bare tokens. `buildCommand.test.ts` exercises the space-separated
forms only — `:285` pins `pnpm build`, `pnpm --filter qfai build` and `pnpm -F qfai build` agreeing —
while the **equals** forms are in no corpus and the GNU long form `--directory` is absent from
`DIR_FLAGS`. I could not execute the classifier read-only (see PENDING), so I make no claim about the
verdicts; this is a corpus-completeness note for the reviewer whose domain it is. **Severity: advisory** |
**Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality gates) / `defect:code-quality`.

### m8 — the pack of this round is the source of the two `QFAI-REVIEW-*` errors

`.qfai/review/review-20260821080000000/` at `9a37421c` holds only `review_request.md`, which raises
`QFAI-REVIEW-004` and `-005` at error severity under the full profile. This is a **sequencing note on my
own round**, not a gap: committing the request before the reviewers launch is what fixed the moving-tree
problem of round 1, and `:966-971` discloses it accurately. **Severity: advisory** | **Traces to:**
`defect:code-quality`.

---

## Rulings on the questions put to me

### Check the suite colour first

**GREEN, and the figures in the record are exact.** `test:e2e` exit 0 with 1431 passed and 16 skipped of
1447 across 84 passed and 4 skipped files; `--project integration --project unit` exit 0 with 1191 passed
and 19 skipped of 1210; `ci:lint` exit 0 with eleven members; `check-types` exit 0. `SKILL.md:313` no
longer bars completion on gate colour. Round 5 `B1` stays closed, and this is the second consecutive
round where the record certifies the colour it actually has.

### The P7 derivation

**Wrong for a third round — see B4.** Three of the five rows re-derive exactly, including both claims the
request singled out: the round-5 file held **4** callsites at `3f815725`, and the three loop-guard tests
were already in the 1186 baseline (19 at `54d8d325`, 22 at `0cfa67c9`, and the diff for that file between
`3f815725` and `cb91e089` is empty). The fourth row credits `retractedClaims.test.ts` with 5 tests where
round 6 added 3, names a zero-test change as a cause, and enumerates causes summing to 6 against a delta
of 9 — while `:885` asserts that every figure in the block is the measured one at the revision named. And
`:887-888`, the sentence the edit failed to delete, is the arithmetically correct derivation of the two
intermediates the new table omits.

### `## Ledger rows advanced`, against five documents

**False for the seventh round — see B1.** Read against `tdd/test-list.md:107-108` (both rows `todo`,
`DR-ID: -`, `Blocked-By: -`, verified cell by cell), the Decision block of `DR-0017-0010`,
`CR-20260820-0012` (`Status: open`, `Approved option: -`, `Blocked set: spec-0017 TDD-0069`) and
`## Final status:996-1007`: four of the five agree that `TDD-0069 -> blocked` is authorised and unwritten.
The fifth is the opening sentence of the handover itself, which says no transition is authorised. The new
subsection `### What the writer must change in the same edit` (`:306-330`) is correct, is exactly what
P1d item 4 and round 6 `B3` asked for, and is the best repair of the round — and it sits nineteen lines
below a sentence denying its premise. I also checked the second half of round 6 `B3` and **withdraw it**:
the `TDD-0070` cell is not contradicted by its handover (verified item 13).

### `retractedClaims.test.ts` as a completion instrument

**Broken a third time — see B6.** The mechanism is fixed and I credit it: all ten entries match, all ten
are quoted, whitespace collapse works, paragraph scoping bounds the stray quote, and italics no longer
launder. What is not fixed is the completeness of the oracle. **Retractions my role established in rounds
3-6 that are missing from the list, both live at HEAD:** "P1d has returned REVISE three times" (round 6
`B1`; three unquoted occurrences, one of them the `Status` field of `DR-0017-0010`) and the wording
variant of entry 7, "Rebuilt around the verb" (round 2, retracted at `:580`, unquoted at `:137`). And
required fix (a) from round 6 — every entry must match at least one occurrence — was not applied, which is
why entry 9 can protect the dead wording "Three packs" while the live "Four packs" against seven
directories goes unguarded (B2).

**Excluding `tdd/test-list.md` is right, not an evasion** (verified item 14): `SKILL.md:74` makes it read,
never written; its cells belong to `/qfai-implement` under the Drift Protocol carve-out; and a guard that
reddens on a file this stage may not touch is unsatisfiable — which is precisely the defect the round-5
version of this test had. The record discharges it into the handover instead. The residual is that the
handover instruction is now enforced by nothing at all, in either direction; the CR proposal below is a
satisfiable form of that guard.

### Re-derive every number

**Everything except the P7 derivation reproduces exactly.** Reproduced: 1431 / 16 and 1191 / 19, both
exit 0; the full profile at `error=4` with all four members identified; `ci:lint` with eleven members;
the six closed pack seals plus the superseded value of round 1, the two-space variant and the printed
manifest; the unscoped `-111` at 8/1/1/1/1 = 12 across five specs and `-112` at 1/4/2/8 = 15 across four,
with "this spec owns 1 and 8" exact; the ledger at 82/71/11, 74/6/2 and Integration 63/6/2 with four of
the six `blocked` on `CR-20260820-0007`; the matrix at 3/1/5, 38 plus 5 cells and A30/B7/C1;
`CR-20260820-0011` at 208/127/81 and the scoped guard at 8 backed, exit 0; the six rejected-alternative
bullets at their six lines; the scoped gate at `error=2` with the right membership; and **all six
per-file test counts**, which is a first.

Wrong:

| figure | recorded | measured |
| --- | --- | --- |
| the round-6 e2e contribution | retractedClaims.test.ts (5 tests) ... 1422 to 1431 (`:880-881`) | 3 at `cb91e089`; the causes of the row sum to 6 against a delta of 9 (B4) |
| the matrix row-width round | named as a cause of the +9 (`:880`) | **0** tests: 5 at `cb91e089`, 5 at HEAD (B4) |
| the e2e intermediates | 1425 to 1428 (`:887-888`, stale) | correct — and the new table omits both (B4) |
| the P1d pass count | three times (`:438`, `:458`, `:1000`), `DR:10-11` | **five**; `:899` says five (B3) |
| P1d re-routes owed | a fourth re-route and a fifth stage round (`:973`) | sixth re-route, seventh round (B3) |
| reviewer responses | fifteen (`:1010`) | **eighteen**, counted from the packs (B2) |
| stage rounds and P1d passes | five and four (`:1010`) | **six** and **five** (B2) |
| review packs | Four packs, one per round (`:1032`) | **seven** directories listed below it (B2) |
| the classifier version | v5 (`atdd:607`), v6 (`coverage-depth:216`, pinned) | **v7** (`buildCommand.ts:4`) (B5) |
| rounds faulting the handover | Rounds 1 through 5 (`:295`) | six (B1) |
| distinct falsification rounds | sixteen plus four (`:982-985`) | three ids counted twice (M1) |
| round-2 `R01` findings | 4 blocking, 6 medium, 5 low (`:820`) | 4 / 6 / **9** = 19 (m2) |
| `R02` findings, round 6 | 18 (`summary.json`) | 17 (M7) |
| P1d findings, round 6 | 3 (`summary.json`) | 8 by the rule the file declares (M7) |

**Three of these were introduced inside the repair of a finding about that exact class:** the P7 row,
rewritten to answer round 6 `M1`; the v6 pin left standing while the label moved to v7, which is round 6
`B5.3`; and the round count at `:295`, corrected in the round that made it six.

### The remaining blocker on `TDD-0070`, precisely

**Textual, in artifacts this stage owns, and the set is still shrinking — but it grew back by one this
round.** P1d has sustained the account of the row five times, and its fifth pass reported, for the first
time, nothing saying the reasoning is wrong. The clause-1 history in `DR-0017-0010` is correct,
`CR-20260820-0012:127-135` is fixed, and `atdd:940-942` now records unsatisfied with the refuted wording
quoted — all three `TDD-0070` items from round 6 are closed. What is left:

1. **`DR-0017-0010:10-11`** must stop saying P1d has refused three times and that a fourth re-route is
   owed. P1d named this file and line in round 5 and again in round 6. (B3)
2. **`atdd:438-439`, `:458`, `:973`, `:1000`** — the same count, four more times, two of them inside
   `### TDD-0069` and `### TDD-0070`, which `red-provenance.md:267` makes part of each row entry. (B3)
3. **`atdd:275-276`** must stop telling the step 3b reader that neither transition is authorised, because
   the verdicts section — which `:460` sends that reader to — says one is. (B1)
4. Then a **sixth P1d re-route**, and the PASS recorded in the `TDD-0070` entry before step 3b will write
   `todo -> exception`.

Nothing analytical is owed and nothing needs measuring: every value the fixes need is in this report or in
the round-6 one. The set was three items in round 6 and is three plus one in round 7 — the addition is
`:275-276`, which is a regression in the section rather than a new question about the row.

---

## Are the disclosed gaps of this stage complete?

**Closer than any prior round on substance, and no.** The gaps that are recorded are accurate and I could
not fault them: the five unsatisfied stories and the placeholder lanes (`:754-757`); `US-0017-0007`
uncovered by choice (`:758-759`); the four places a build is reached with the two opaque `heuristic` hits,
pinned as a set (`:619-630`); 127 unbacked claims held by a ratchet (`:771-782`); the E2E surface being
unable to exercise a workflow run (`:783-786`); the vacuity pattern recurring inside a vacuity repair
(`:787-792`); Stage Minimum Roles unused for P2-P4 with the manifest quoted (`:485-509`); the missing
stage gatekeeper of round 3 (`:951`, `:957-962`); the full profile at `error=4` (`:966-971`, measured,
exact); and **the authorisation state of both rows in `## Gaps` item 8** (`:793-804`), which is in the
not-yet form and agrees with `## Final status`.

**Undisclosed and material:**

1. **`## Ledger rows advanced` denies the one authorisation any gate has issued** (B1), in the section
   step 3b reads.
2. **`## Final status` does not know round 6 happened** (B2) — three counts, a table and a pack count.
3. **v7 has no account in either evidence file, and the matrix record was not opened at all** (B5) — the
   largest change of the round, and its guard pins the version it replaced.
4. **The refuted-figure pin in the matrix test was deleted this round and `:731-734` still says it is
   there** (M2) — a design change the record does not record.
5. **The real coverage of `retractedClaims.test.ts` is ten wordings**, two of which are dead and two of
   which the record is currently violating in a different wording (B6), while `:199-201` and the own
   docstring at `:4-9` call it the thing that makes retractions enforced rather than announced.
6. **`stageEvidenceCounts.test.ts` pins neither the version nor the count of the new file** (M3) while
   `:890-893` says everything derivable is checked — and two of my blocking findings are numbers inside
   the scope of that sentence.
7. **The handover instruction at `:329-330` is enforced by nothing**, in either direction. It is disclosed
   as an instruction; it is not disclosed as an unguarded one.

---

## Required fixes (blocking only)

1. **B1** — `:275-276`, `:436` and `:441-443` to state that `TDD-0069 -> blocked` is authorised and
   unwritten; delete one of `:284-287` or `:302-304`; `:295` to six; verify with `git diff` before
   claiming any statement is gone.
2. **B2** — `:1010` to six, five and eighteen; add a round-6 row to `:1014-1020`; `:1032` to seven packs,
   and derive the numeral in `stageEvidenceCounts.test.ts`.
3. **B3** — `atdd:438-439`, `:458`, `:973`, `:1000`, `:797` and `DR-0017-0010:10-11` to the measured
   counts, in one edit.
4. **B4** — split `:880-881` into the four commits it spans using the measured callsite deltas, 1422 to
   1425 to 1428 to 1431; drop the row-width round from the arithmetic; delete `:887-888`; record
   `9a37421c` beside both totals; fix `:860` to seven projects.
5. **B5** — `atdd:607-624` and `coverage-depth:216-225` rewritten for v7 with the measured 20/2 over 46
   from round 6; `coverageDepthMatrix.test.ts:338` to v7 and anchored to the describing sentence so it
   cannot be satisfied by the version-history list.
6. **B6** — add the three missing wordings to `RETRACTED`; assert that every entry matches at least one
   occurrence across `GOVERNANCE`; add the pack-count invariant; disclose that the list tracks wordings.

## Advisory / Change Request proposals

- **Renumber the second X family and fix both round totals** (M1).
- **Record the hand-off of the refuted-figure pin** (M2) and re-attribute `X7`.
- **Pin the count of `retractedClaims.test.ts` and the classifier version; add both new assets tests to
  `OWED` and record their runs** (M3).
- **Add the repo-wide 15 for `-112` to `## Gaps`** (M4).
- **Re-run the Delta Rejected Guard against the current artifact set** (M5) — a mandatory output, five
  rounds of artifacts uncovered, substance verified sound by me, no RE-OPEN required.
- **Extend the finding-count table through round 6 and fix the round-4 P1d row** (M6).
- **Correct the round-6 `summary.json`, recording the superseded seal if you re-seal** (M7).
- **Three blocking reviewers** (m1) and the round-2 `R01` count (m2), both **fifth** round.
- **A satisfiable guard for the handover instruction.** The `tdd/test-list.md` exclusion is right, and it
  leaves `:329-330` unenforced. A guard that is green whenever the row `Status` is `todo` **or** its
  `Evidence` cell no longer contains the phrase NOT BLOCKED by a CR, and red only when `Status` is
  `blocked` **and** the cell still says it, is satisfiable at every point in time — green now, green after
  a correct write, red only after a half-write. That is inside the test tree of this spec and inside the
  DoD, so it is not a new product obligation.
- **A pack in flight breaks two gates, for the third round.** `QFAI-REVIEW-004` and `-005` fire on a pack
  whose contents cannot exist when the directory does. This is a product obligation upstream never asked
  for, so per `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations` it **must
  not gate this rework**; a `CR-*` against whichever skill owns `review-artifact-layout.md` is the place
  for it. Nothing in the blocking set above depends on it.

## Open risks / residuals

- **The suite is green and both required legs pass**, so gate colour no longer bars completion. The scoped
  gate is `error=2` and the build profile `error=4`, both correctly disclosed and, for the first time,
  both correctly scoped in the account the record gives (`:967`).
- **The seal contract is in its best state yet**: six closed seals recompute against the recorded values,
  the rule is monotone, the in-flight pack is disclosed, and `:1099-1101` states the recorded-value rule
  correctly. What fails at the completion gate is the other half of `SKILL.md:298` — check that
  `## Final status` says what that pack says (B2).
- **The released write for `TDD-0069` still cannot be exercised from the lead sentence of the handover**
  (B1), although the `Evidence`-cell instruction it needs is now there (verified item 13). One sentence
  stands between six rounds of work and the only forward motion any gate has authorised.
- **`TDD-0070` needs five textual edits and a sixth P1d re-route**, then a recorded PASS in its entry.
  Nothing analytical is owed.
- **Two guards protect wordings rather than claims.** `retractedClaims.test.ts` (B6) and
  `coverageDepthMatrix.test.ts:338` (B5.3) are each satisfiable by text that no longer means what the
  guard was written to catch. Both are one-line fixes and both are inside the DoD.
- **The authorship-separation breach stands** and is unrepairable retroactively. Seven rounds of
  independent reviewers repair the gate, not the history.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; `check-atdd-annotation-ledger.mjs` closes that direction for `spec-0017` only and is not
  in `ci:lint`.
- **No oracle round was run against a mutated tracked file.** Every B6 result comes from replicating the
  predicates of the test over the tree as committed, so the live occurrences are read, not planted.
- **Concurrency.** I ran alongside whichever other reviewers this round routes. Own shadow root
  (`tmp/r7/shadow`) and own scratch (`tmp/r7/`); the tracked `.qfai/report/validate.log` was never written
  by me and any run-log pointer in the working tree may reflect another run.

## PENDING

- **The behavioural corpus of v7.** I could not execute `classifyBuildCommand` read-only: the helper is a
  TypeScript module under `packages/qfai/tests/`, a probe placed under `tmp/` per Article XI cannot
  resolve `vitest` from there, and placing a config inside `packages/qfai/` would be a mutation. So I make
  **no verdict** on whether v7 is correct, and m7 is a corpus-completeness note rather than a finding. The
  behaviour of the classifier is the domain of `qa-gatekeeper` and `implementation-reviewer` and my role
  contract routes it there. What I did check and can report: the version **label** is inconsistent across
  three artifacts (B5), and the committed corpus exercises no equals-form flag (m7).

## Evidence checked

- `.qfai/review/review-20260821080000000/review_request.md`;
  `.qfai/review/review-20260821060000000/` all five files (`R02`, the structure of `R03`, `R04`, the
  request, `summary.json`); `review-20260821040000000/summary.json`;
  `review-20260820220000000/R01_implementation-reviewer.md`; all seven pack file listings and blob hashes;
  `git log --diff-filter=A` per pack file
- `.qfai/evidence/atdd-spec-0017.md` (whole, 1110 lines);
  `.qfai/evidence/coverage-depth-spec-0017.md` (whole, 354 lines, parsed mechanically)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically: 82 rows of 9 cells; `:37` and `:107-108`
  read cell by cell, including both `Evidence` cells in full); `07_Decisions.md:130-145`, `:200-212`,
  `:240-255`; the `Rejected` section of `09_delta.md`
- `.qfai/decisions/DR-0017-0010-*.md:1-20` and `:120-200`; `CR-20260820-0012-*.md:1-20` and `:120-140`
- `.qfai/assistant/skills/qfai-atdd/SKILL.md:74`, `:224`, `:280-370`;
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:390-441`;
  `.qfai/assistant/manifest/agent-routing.yml:195-212`
- `packages/qfai/tests/assets/retractedClaims.test.ts` (whole);
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole);
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (parse guard, version pin, and the deleted
  assertion via `git diff`); `packages/qfai/tests/helpers/buildCommand.ts:1-140`;
  `packages/qfai/tests/unit/buildCommand.test.ts` (the flag-form corpus); `vitest.workspace.ts`; the root
  `package.json` (`ci:lint`, eleven members)
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` at start and finish;
  `git ls-files -s` (83 tracked symlinks); a `git archive HEAD` shadow root with native symlink
  re-materialisation (83 of 83 created and verified); shadow-root
  `validate --profile atdd --fail-on error --spec 0017` (`info=2 warning=0 error=2`, no shadow artifact)
  and `validate --profile full` (`info=4 warning=404 error=4`) with the `-111` and `-112` membership
  extracted per spec; `pnpm ci:lint` (exit 0); `pnpm check-types` (exit 0);
  **`pnpm -C packages/qfai test:e2e` (exit 0, 1431 / 16)**; `--project integration --project unit`
  (exit 0, 1191 / 19); the six per-file suites (9, 22, 14, 5, 7, 5);
  `node scripts/check-atdd-annotation-ledger.mjs` with and without `--spec 0017` (127 unbacked, exit 1;
  8 backed, exit 0) plus a 208-claim count; `git hash-object` over seven packs in two seal serializations
  plus the superseded manifest (`tmp/r7/seal.py`); callsite counts via `git show` at `54d8d325`,
  `0cfa67c9`, `3f815725`, `c40b2358`, `cb91e089` and `9a37421c` for six test files; `git diff --stat` for
  four files across two ranges; mechanical re-parses of the ledger cross-tab (`tmp/r7/ledger.py`) and of
  the matrix tally and partition (`tmp/r7/matrix.py`); the retracted-claims oracle over the five
  governance files with 17 candidate needles (`tmp/r7/retract.mjs`); and the audit-hash procedure over the
  truncated evidence file (`tmp/r7/audithash.py`).
- **Not re-run:** the resolver mutations `E6`-`E11`; the matrix falsification rounds; the behavioural
  corpora of the classifier (PENDING). No finding above rests on any of them.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`
- [x] Required gates and residual risks are recorded, and one gate is declared **PENDING** rather than
      assumed
- [x] No mutation persisted: HEAD `9a37421c` at start and finish, `git status --porcelain` empty at both,
      `.qfai/report/validate.log` still `2b572934ce71305b4fcfc1ac40c34c164f83cf8d`, both `validate`
      run-logs inside `tmp/r7/shadow`, and every oracle result derived by replicating the predicates of
      the test over the tree as committed rather than by planting anything
