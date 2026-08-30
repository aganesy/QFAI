# R02 — completion-reviewer, round 19, spec-0017 (stage gates only)

- Revision at start: `1ecbeb07` (`git rev-parse --short HEAD`)
- **Code under review: `7fbac2d3`.** Every source artifact judged below was read with
  `git show 7fbac2d3:<path>`. `git diff 7fbac2d3 HEAD -- packages/ scripts/ .github/` is **empty**, so
  the bytes on disk that I executed against are `7fbac2d3`'s bytes for every guard, helper and test.
- **The record's pack and response counts are measured at `19b751ca`**, per the request's amendment.
  `git diff 19b751ca HEAD` touches only files inside this round's own in-flight pack directory, and the
  in-flight pack is excluded from both the response tally and the seal rule — so the working tree I ran
  against is `19b751ca`'s record for every count guard. Where a claim's truth differs between
  `7fbac2d3` and `19b751ca` I say which I used.
- Emphasis per the request: **§3 (the four guards, fifth attempt)** and **§4 (the record)**
- Verdict: **REVISE**

## Gate that passed

`pnpm -C packages/qfai exec vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts
tests/assets/coverageDepthMatrix.test.ts tests/assets/retractedClaims.test.ts` — **3 files, 28 tests,
exit 0**, working tree clean at `1ecbeb07`. That is the baseline every plant below was measured
against, and every plant was restored from a copy taken before it
(`tmp/r19cr/backup/`, md5 verified after each restore).

## Plant hygiene

I planted only in `.qfai/evidence/atdd-spec-0017.md` and `.qfai/evidence/coverage-depth-spec-0017.md`,
always copy-first / write / run / restore-from-copy, never `git checkout`. Nothing was planted under
`packages/qfai/assets/init/root/**` — `qa-gatekeeper`'s partition. Nothing under `packages/qfai/tests/`
was modified. All scratch is under the repository-root `tmp/r19cr/`. Nothing was committed.

## Section 3 — the four guards, fifth attempt

I extracted all **100 regexes** in the three guard files from the files' own bytes with the TypeScript
scanner (`ts.isRegularExpressionLiteral` + `new RegExp(...)` call sites) rather than reading them —
48 in `stageEvidenceCounts.test.ts`, 37 in `coverageDepthMatrix.test.ts`, 15 in `retractedClaims.test.ts`
— and evaluated the load-bearing ones against the records they scope. Two of round 18's four are
genuinely repaired; two are not, and both fail in the round's own recurring shape.

**What round 18 fixed and I could not re-break.** The corpus-count guard's REGION is now right:
extracting `/corpus size appears (\w+) times in this section/` and `/\n#{2,4} /` from the bytes and
evaluating them gives region = record lines 995..1121, **one heading inside it**
(`### The twenty-agent sweep, and where the boundary moved`), ending at `## Test volume estimate`.
Round 18's B1 measured 186 lines across three level-2 headings. Four sites, all reading 42, corpus
holds 42. The needle is back to `{0,2}` intervening words, so `29 escape mechanisms` is caught again.
The depth-score pin's anchor is now `^[ \t>]*[-*+] `, which covers all four spellings round 18's B4
used. Both directions of round 18's own plants are closed. That is real progress and I am recording
it before the two that are not.

### B1

**A markdown fence indented by one to three spaces is still a fence, and the Delta Rejected Guard tie
does not strip it. Fifth spelling, fifth round, both directions demonstrated.**

`stageEvidenceCounts.test.ts:232`, extracted from the bytes: `/^(?:```|~~~)[\s\S]*?^(?:```|~~~)/gm`.
Round 18's B2 added the `~~~` alternation. What it did not add is the leading-indent allowance, and
CommonMark admits up to three spaces of indentation before a fence delimiter without changing what the
block is — it still renders as code. `^` with `m` requires column zero, so an indented fence is invisible
to the strip, its rows survive into `unfenced`, and `unfenced.indexOf("| artifact ")` at line 237 takes
the **first** header it finds.

Executed against `7fbac2d3`'s guard bytes, record restored from `tmp/r19cr/backup/` after each
(`pnpm exec vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts`):

```text
[ RED ] control: real `tests/assets/retractedClaims.test.ts` row deleted, no decoy
[GREEN] 1-space-indented BACKTICK fence decoy above it, real row deleted
[GREEN] 1-space-indented TILDE fence decoy above it, real row deleted
[GREEN] 3-space-indented backtick fence decoy above it, real row deleted
[ RED ] four-backtick fence decoy (```` ) — stripped, so this route is closed
[GREEN] plain duplicate table above it, real row deleted
```

**Direction A, a true record that fails.** The real table complete and untouched; a four-line
illustrative EXCERPT of it shown above in a one-space-indented fence, which is exactly how a record
quotes a fragment of its own table:

```text
[ RED ] the table must have a first column to read: expected 2 to be greater than 5
```

The same excerpt in a column-0 fence is green. So the guard's verdict on an unchanged, complete table
depends on whether an unrelated code block one line above starts at column 0 or column 1.

**And the last row is the general form.** The decoy does not have to be fenced at all: a plain second
copy of the table placed above the live one satisfies the check with the live row deleted, because
`indexOf` takes the first header. Round 18 fixed the delimiter and left the "first table wins" rule,
which is the wider region again — the check reads "some table in this section" where the claim is about
"the table".

Severity: Blocking. Traces to: `defect:test-oracle` — the one assertion tying the mandatory
`§ Delta Rejected Guard` confirmation to the artifacts this stage added is satisfiable with the
confirmation's real row deleted, in three ordinary markdown spellings.

### B2

**The corpus-count guard's REGION was fixed and its NEEDLE is still a closed enumeration of four
phrasings. Five direction-B escapes and two direction-A false reds, all executed.**

The comment at `stageEvidenceCounts.test.ts:265` reads *"So this reads EVERY numeral adjacent to the
word"*. Extracted from the bytes, the four needles are:

```text
/(\d+)(?:\s+\S+){0,2}\s+mechanisms?\b/g
/mechanisms? (?:pinned|held)[^.]{0,24}?(\d+)\b/g
/lets all (\d+) through/g
/with all (\d+) listed/g
```

Controls first, so the escapes are localised: `29 mechanisms` **red**, and round 18's own
`29 escape mechanisms` **red** — the `{0,2}` restoration works.

**Direction B — five wrong corpus sizes inside the guard's own region, all green:**

```text
[GREEN] The corpus now holds 29 of these escape mechanisms.        (3 intervening words)
[GREEN] The sweep ended with 29 distinct proven escape mechanisms. (4 intervening words)
[GREEN] The sweep pinned twenty-nine mechanisms in all.            (spelled-out numeral)
[GREEN] The mechanisms counted 29 in all.                          (verb outside {pinned,held})
[GREEN] The escape corpus stands at 29.                            (the word is `corpus`)
```

The spelled-out one is not a contrived spelling. It is **this record's own house style** — the same
`## Final status` sentence the sibling guard reads says "**nineteen** rounds", and the sweep block two
paragraphs above the plant says "**fourteen** confirmed escapes". `(\d+)` cannot see any of it, and
`WORDS` — which this same file maintains up to `thirty` for exactly this reason — is not consulted here.

**Direction A — two TRUE sentences that redden:**

```text
[ RED ] `1 mechanism per agent`   (the section's own words, numeral for word)
          -> "1 mechanism: corpus holds 42"
[ RED ] `Of the 42, 6 lexer mechanisms were the level-1 class.`
          -> "6 lexer mechanisms: corpus holds 42"
```

The needle has no model of the word `mechanism` being used for anything but the corpus total, so a
true subset count or a true per-agent rate is reported as a wrong corpus size. Round 18's finding said
*"The region and the needle are two problems"*; the repair fixed the region and left the needle both
too narrow (five escapes) and too wide (two false accusations).

Severity: Blocking. Traces to: `defect:test-oracle`.

### B3

**Class C's roster: round 18's break number 2 is green again, verbatim, after the repair written for
it — and the repair's own anchor is the defect round 18 found in the bullet fifteen lines away and
fixed there.**

`coverageDepthMatrix.test.ts:385`, extracted:
``/^- `(US-0017-\d{4})`\s*×\s*`([^`]+)`\s*—\s*\*\*([^*]+)\*\*/gm``.

Round 18's B3 listed three breaks. Break 3 (coordinates with no reason) is closed — control **red**.
Break 2 is not:

```text
[GREEN] the two members' reasons SWAPPED between them
          `US-0017-0001` × `Boundary values` — **the design has no failure to observe.**
          `US-0017-0007` × `Error path`      — **a single shipped value admits no boundary.**
[GREEN] reason replaced by **see the row's own section.**
[GREEN] reason replaced by **A.**
[GREEN] both members given the same reason, differing only in a capital letter
```

The check requires each member to carry *a* bolded span and the spans to be set-distinct. Swapping two
distinct spans keeps them distinct, so the exact plant round 18 filed — *"That is round 4's finding
(swapped reason paragraphs) at member granularity"* — passes the repair written to close it. This is
now round 4's finding, at member granularity, at bolded-lead granularity: three sizes, one defect.

**Direction A, and this is the part that matters more than the plant.** The anchor is `^- `:

```text
[ RED ] the same true reason on a `* ` list marker
[ RED ] the same true reason on a two-space indented bullet
```

Fifteen lines further down the same file, `:585` was rewritten in the same commit to
`` new RegExp("^[ \t>]*[-*+] \*\*" + column + " `([^`]+)`\*\*", "gm") `` — precisely because
round 18's B4 showed `^- ` was one of four spellings. **Two copies of one anchor rule, in one file, in
one commit, and only the one the finding pointed at was corrected.** That is lesson 2 of the five this
record states it has established, violated by the commit that states it.

Severity: Blocking. Traces to: `defect:test-oracle`.

### B4

**The depth-score pin's four spellings are closed and four more are open, and widening the anchor to
`> ` made the guard call a QUOTATION an assertion — which its sibling guard in this same stage's work
decides the other way, deliberately.**

All five of round 18's spellings now redden (control: `- `, `* `, `  - `, `> - `, tab-indented — five
for five). The needle is a closed enumeration of markers, so:

```text
[GREEN] 1. **Error path `✅`** — fully covered.     (ordered-list item)
[GREEN]    **Error path `✅`** — fully covered.     (no list marker at all, column 0)
[GREEN] |  **Error path `✅`** — fully covered.     (table cell)
[GREEN] - - **Error path `✅`** — fully covered.
```

each planted directly above the true `- **Error path `❌`**` bullet, each raising a cell the table
scores `❌`, each green. The no-marker line is the one to fix on: it renders as an ordinary bold
paragraph and reads to a human exactly as the bullet does.

**Direction A — two true records that redden:**

```text
[ RED ] - **Error path** `❌` — there is no error path asserted.
          (the score's code span moved outside the bold; same score, same claim)
          -> "Error path: the section states no score for it"
[ RED ] the true bullet, plus, indented under it:
          > - **Error path `⚠️`** — what round 12's version of this section said, now withdrawn.
          -> "Error path: the section states it 2 times"
```

The second is the one worth naming. `retractedClaims.test.ts:646-650` pins the opposite decision in
words: *"A blockquote stays exempt, and that is a decision rather than an oversight: markdown renders a
blockquote AS a quotation … recorded as the one route round 10 demonstrated that is meant to stay
open."* Round 18's B4 repair added `>` to the anchor here, so in this instrument a blockquoted line is
an assertion and in that one it is a quotation. A record that quotes its own withdrawn score — the
practice `retractedClaims` exists to require — reddens a required `e2e` leg.

Severity: Blocking. Traces to: `defect:test-oracle`.

## Section 4 — the record

#### Counts I re-measured, and what held

Executed at the working tree (code identical to `7fbac2d3`), report artifacts restored from
`tmp/r19cr/reportbak/` afterwards and `git status --porcelain .qfai/report/` verified clean:

```text
pnpm ci:lint                                    exit 0   — and the script has exactly ELEVEN members
pnpm check-types                                exit 0
vitest --project e2e                            1446 passed | 16 skipped, exit 0   MATCHES
vitest --project integration --project unit     1222 passed | 19 skipped, exit 0   MATCHES
check-atdd-annotation-ledger.mjs --spec 0017    9 claim(s) backed, exit 0          MATCHES
pnpm verify:pack                                exit 0
validate --profile atdd --fail-on error --spec 0017
                                                info=2 warning=0 error=1, exit 1   MATCHES
                                                QFAI-ATDD-112 on EIGHT TCs         MATCHES
validate --profile full                         info=4 warning=403 error=49        see below
e2e callsites, derived by the guard's own regex 882 at 7fbac2d3                    MATCHES
vitest.workspace.ts                             SEVEN projects                     MATCHES
```

**`--profile full` — the rule and the sealed value both verify.** The record states the rule as
*"48 with the current round sealed, 50 at a revision that has just opened a pack, 49 once reports land
in it and before a `summary.json` does."* The tree I measured is exactly the third state — round 19's
pack open, reports landed, no `summary.json` — and it reports **49**. The decomposition is:

```text
QFAI-REVIEW-007  44   (the record's table says 44)
QFAI-REVIEW-004   2   .qfai/review/review-20260822180000000  (round 19, in flight)
                      .qfai/review/review-20260821200000000  (round 13, request only)
QFAI-REVIEW-005   1   .qfai/review/review-20260821200000000  (round 13)
QFAI-ATDD-111     1   11 US across FOUR specs (0003×8, 0006, 0008, 0015); spec-0017 owns NONE
QFAI-ATDD-112     1   15 TCs across FOUR specs (0003, 0008×4, 0015×2, 0017×8)
```

Sealing round 19 removes the one `QFAI-REVIEW-004` that names it, giving **44+1+1+1+1 = 48** — the
sealed table's own five rows, summing to 48. Round 18's `B5` (*"the table that decomposes the 48 sums to
49"*) is closed, and the prose's attribution of the residual `-004`/`-005` to round 13's abandoned pack
is correct: both name `review-20260821200000000`. The 111/112 characterisations — "of which this spec
owns NONE" and "of which it owns 8" — are both exactly right.

### B5

**The account of why the integration+unit total moved is wrong, and it is wrong in the direction that
matters: one of the three tests that moved it is this stage's own, committed one commit before the
re-measurement. The figure it replaced had also been wrong for four rounds before the other session
touched anything.**

`7fbac2d3`'s commit message and the paragraph it adds both say the total moved because of `b0f9d443`:
*"A concurrent session pushed `b0f9d443` … with two new integration tests — and the total this record
states went stale between one commit and the next"*, *"the integration+unit figure moved without this
stage touching it."*

Measured, per revision, with the guard's own `CALLSITE` regex over
`packages/qfai/tests/{integration,unit}/**/*.test.ts`:

```text
20121003  1120 callsites   (round 18's record commit — record states 1220 passed)
b0f9d443  1122 callsites   +checkPublishDryRun.test.ts 6->7, +shippedWorkflowOwnership.test.ts 25->26
7b7a50ea  1123 callsites   +tests/unit/shippedLaneCommands.test.ts 12->13   <-- THIS STAGE
7fbac2d3  1123 callsites   (record states 1222 passed)
```

`7b7a50ea` is *"test(atdd): tie the mask to the verdict"* — **the differential test this round exists to
review**. It is in the `unit` project, which is inside this very total. Three plain `it(` callsites were
added across the window, not two, and one of them is this stage's.

I confirmed the three are plain callsites rather than `.each` rows by running exactly those three files:
`Tests 46 passed` against `7 + 26 + 13 = 46` callsites, so tests and callsites are 1:1 for them and the
window's delta is **+3**. `git diff --stat 20121003 7fbac2d3 -- packages/qfai/tests/integration
packages/qfai/tests/unit` shows no other test file changed, and none of the ten `.each`/`.for` sites in
those projects is downstream of anything `b0f9d443` touched.

**So the previous figure was already wrong.** 1222 − 3 = **1219**, and the record said **1220**. That is
not a one-off: the callsite count has been 1120 at every revision from `683f16ab` (round 15) through
`0f61ad2f`, `953a6afe`, `20121003` — the figure was one high for the whole of rounds 15 to 18, in the
block whose first sentence is *"Re-run after the last artifact changed, twice, because this block was
wrong about its own currency both times."*

The arithmetic model is the record's own and I validated it before using it: total tests minus callsites
is constant per project (e2e: 580, checked against the record's own 1443/879, 1445/881 and my measured
1446/882; integration+unit: 118, checked against the record's own round-12 figure of 1216 at `0af376e2`,
where callsites are 1117).

What the paragraph gets right is the moral — a total nothing derives goes stale when anyone commits. What
it gets wrong is the evidence for it, and the shape of the error is this record's most-repeated one: a
correction that measures the endpoint and narrates the cause without checking the intervening commits,
in the section that says it re-derives *"from `git show` at each revision rather than from memory"*.

Severity: Blocking. Traces to: `defect:evidence-integrity` — a `## Commands executed` figure re-measured
in a commit whose stated reason for the move is false, and whose predecessor value was wrong by one for
four rounds without being detected by the re-measurement that replaced it.

### B6

**Three of round 18's twelve findings were not applied and are not disclosed as accepted, and all three
leave a refuted wording standing as an assertion. This is the re-grep the request asked for, and the
answer is that the grep improved, not the guard.**

`19c33aa1` applied round 18's `B1`-`B4` and `M2`, and applied `m3` (one word: "holds" -> "held" at
`retractedClaims.test.ts:330`). Three were left, with nothing in the record saying so:

1. **`M3` — "Three of round 16's guard repairs failed again".** `atdd-spec-0017.md:2446` still reads
   that, and still enumerates three. `6ab7b11c`'s own commit body enumerates **four** bullets under a
   sentence that says three — the fourth being *"and the depth-score pin read only the first bullet, so
   a second contradicting one passed"* — and
   `git diff 1d7c0c3f 6ab7b11c -- packages/qfai/tests/assets/coverageDepthMatrix.test.ts` has two
   hunks: the class C narrowing at `:370` and the depth-score pin's `.exec` becoming `matchAll` at
   `:565`. Round 18 filed this with the diff quoted. Unchanged.
2. **`m2` — the doubled phrase and the stale figure.** `atdd-spec-0017.md:502-503` still reads

   ```text
   The verdict split is not derivable (two of
   two of thirty-five reports state a verdict in a parseable form)
   ```

   The doubling is intact — it straddles a line break, which is why a single-line grep misses it — and
   so is the number. Measured over the 18 closed packs' **50** report files: **5** carry
   `**Verdict: PASS|REVISE**`, **14** carry `Verdict: **PASS|REVISE**`, and **46** carry a line holding
   both the word and a verdict token. "two of thirty-five" is wrong in numerator and denominator, and
   the same claim in code — `stageEvidenceCounts.test.ts:649-650`, *"two of twenty-nine use
   `**Verdict: REVISE**`"* — is untouched too. Round 18 named both sites.
3. **`m1` — the `GOVERNANCE` self-exclusion arithmetic.** `retractedClaims.test.ts:86-88` still reads
   *"round 17 measured 118 of 124 occurrences already reading as quoted, and six that do not … and two
   of the instruments"*. Round 18 ran the file's own `occurrences()` over itself and measured
   **126 / 112 / 14** across six distinct claims — the recorded figure subtracts a de-duplicated claim
   count from a raw occurrence count — and reported that **three** instruments fire, not two. Unchanged.

**The re-grep itself.** I extracted all **33** `RETRACTED` needles and all **15** `GOVERNANCE` members
from the guard's own bytes with the TypeScript scanner, flattened them by the guard's own rule (emphasis
and fence characters stripped, zero-width removed, whitespace collapsed, lower-cased) and searched
**4272** `.md` / `.ts` / `.mjs` / `.js` / `.json` / `.yml` files. Outside `GOVERNANCE`, the review packs
and the guard file, the only hits are the two the handover already names in `tdd/test-list.md` and three
false positives ("Three packs" meaning spec packs in `09_delta.md` and `_policies/`; "no filters" as an
unrelated rejected option in `_policies/08_Decisions.md`).

**The needle set reaches nothing new — and that is not the same as there being nothing to reach.** Each
of the three claims above is a wording a review round refuted, standing unquoted in a file `GOVERNANCE`
already covers, invisible because nobody wrote it an entry. Round 18 found one such claim; this round
finds three, all created in the same commit window. The guard did not improve; the grep did, and the
grep is a person.

Severity: Blocking. Traces to: `defect:evidence-integrity` — the record certifies with three refuted
statements standing as assertions, two of them inside the instruments whose subject is exactly that, and
none disclosed under the record's own "accepted rather than fixed" convention.

### M1

**The five lessons: two are not supported as written, one states a one-directional law the record's own
sentences contradict, and one carries a numeral of exactly the kind the section exists to retire. Lesson
2 is sound — and the commit that wrote it violates it twice.**

The request asked whether each is supported by what happened rather than being a tidy summary.

**Lesson 3 is the one that matters, because it shaped this round's repairs.** It reads *"A guard's region
is part of its claim. Four guards, four rounds, one cause."* Eight lines above it, the same section says
*"the corpus-count repair narrowed the NEEDLE instead and lost a spelling the version before it caught.
**The region and the needle are two problems.**"* Both cannot be right. Measured against round 18's own
four findings: `B1` and `B2` were region defects; `B3` was a needle defect in a region round 18
explicitly called *"a real improvement over round 17"*; `B4` was an anchor — a needle — in a region
nobody faulted. Two of four, not four of four. The consequence is on the page: `19c33aa1` fixed every
region, and my `B1`, `B2`, `B3` and `B4` above are **all needle defects with correct regions** (I
measured all three regions and they are right). A lesson that names one of two causes as the cause is
how a fifth attempt reproduces a fourth attempt's failures.

**Lesson 5 is false as a universal.** *"The one time this record recorded an open question rather than an
answer, the contract that settled it was three directories away."* This record records an open question
rather than an answer in at least four places, three of them defensibly and one of them live:
§ "`TC-0017-0016`" and § "The disagreement itself, which stands whatever is approved" (*"Two readings are
available … and the case's text does not distinguish them"*), § "A second timeout, measured and left to
its owner" (*"it is recorded rather than repaired"*), and § "Delta Rejected Guard" on option 2 (*"this
stage cannot supply another"*), which is this round's own live disposition and which I judge correct
below. What the lesson means — an inability to settle needs the evidence a settlement needs — is true
and is the sentence's first clause. "The one time" is a claim about the record's history that the record
falsifies four sections along, and it reads as condemning a practice the record also endorses.

**Lesson 1 is one-directional, and the record's own text contradicts the direction.** *"Each repair moved
the boundary outward … and each time the next round found what lay one step beyond it."* Two paragraphs
above it, the same section records the opposite repair: the delimiter scan *"turned the shipped
`$GITHUB_OUTPUT` idiom, one space removed, into a false refusal"* — a boundary that had to move **in**.
So do two of the four guards this round: `B2`'s two false accusations and `B4`'s two false reds are
boundaries drawn too wide. A law that says repairs move outward is the belief that produces a repair
which breaks in the other direction, which is round 18's `M1` and what I reproduced in `B2` and `B4`.

**Lesson 4 carries a numeral, in the list written so numerals stop being re-derived.** *"twice the next
round paid that cost instead of the stage."* § "Round 17" three paragraphs above lists **three** of the
stage's own corrections whose citations the next round had to chase — `revision_form`, the
`--profile full` figure, and option 2's third ground — and `B5` above is a fourth. This record has
faulted itself for a stale numeral eleven times by its own count; putting a twelfth inside the block
written to end that is the shape the block exists to end.

**Lesson 2 is supported, and was violated by its own commit.** *"Two copies of a rule diverge, and the
one nobody is looking at is the one that is wrong."* Every instance it cites checks out. And `19c33aa1`
— the commit that wrote it — repaired the bare-dash anchor at `coverageDepthMatrix.test.ts:585` and left
the identical anchor fifteen lines up at `:385` (my `B3`), and made a blockquoted line an assertion in
one guard while `retractedClaims.test.ts:646-650` pins it as a quotation in the other (my `B4`). The
lesson is right and nothing was done with it, which is the strongest evidence in the section that
writing a lesson down is not the same as applying it.

Severity: Major. Traces to: `defect:evidence-accuracy` — a section whose stated purpose is that eighteen
rounds' conclusions stop being re-derived, carrying two conclusions false as written and one that
misdirects the repair it exists to inform.

### M2

**A non-response file in this round's pack matches the response pattern, so `## Final status` will have
to certify 54 reviewer responses for 53 reviewers — and one of them reached no verdict, which the split
rule cannot express. This belongs to `1ecbeb07`, not to `7fbac2d3`.**

`stageEvidenceCounts.test.ts:670` counts responses with `/^R0\d+_.*\.md$/` over each closed pack.
`.qfai/review/review-20260822180000000/` holds:

```text
R01_implementation-reviewer.md
R02_completion-reviewer.md
R02_completion-reviewer.partial-first-attempt.md      <-- matches
R03_qa-gatekeeper.md
review_request.md
```

Four matches, three reviewers. The request itself calls the fourth file *"your predecessor's partial …
kept in the pack"* — an input to this round, not a response to it. When round 20 opens, `responses`
becomes **54** and the record must state 54, with `REVISE + PASS = 54`. The partial reached no verdict:
it stops after its gate section. So the split will have to record a REVISE that nobody gave, in the
sentence whose entire subject is a count the packs support — and the guard will enforce it.

Measured now: 19 packs, **50** responses over the 18 closed ones, which is what the record states at
`19b751ca`. That is correct today and wrong at the next round-open.

The cheap repair is a name the pattern does not match, or a subdirectory: `sealOf` walks recursively so
the file still enters the seal either way, while the response counter's `readdir` is flat.

Severity: Major. Traces to: `defect:evidence-integrity`.

### m1

**§ "When each pack was actually sealed" measures 12 of the 18 closed packs, and the section that points
at it says it measures the gap "per round".**

`atdd-spec-0017.md:2689` — *"§ 'When each pack was actually sealed' below measures the gap **per round**,
without a summary figure"* — and *"Both numerator and denominator move every round; the table is the
claim."* The table's last row is round **12**. Rounds 13 to 18 are absent and nothing says why. This is
the third hand-maintained table in this record to go stale, and the record deleted the other two on
exactly this argument (*"a hand-maintained table beside a derived one, going stale on the schedule this
record has faulted itself for eleven times"*).

I derived the missing rows with the section's own method
(`git log --diff-filter=A` per pack), so the repair is a paste:

```text
 13    none             none              pack holds a request and no reports
 14    f2711cdc         f2711cdc          same commit
 15    5d14962d         5d14962d          same commit
 16    7d67a719         7d67a719          same commit
 17    953a6afe         953a6afe          same commit
 18    20121003         20121003          same commit
```

Nothing is hidden by the omission — every missing row is "same commit" — but the record could not know
that without measuring, and it presents a twelve-row table as the eighteen-round claim. Graded minor for
that reason and not for the shape.

Severity: minor. Traces to: `defect:evidence-accuracy`.

### m2

**`retractedClaims.test.ts`'s numeral table stops at `twenty` and its sibling's goes to `thirty`. At 21
packs the counted-claim pin reports a TRUE record as wrong. Third copy of one rule, third divergence.**

Extracted from the bytes, the pack-count needle is
`/\b(\w+)[ \t]+(?:\w+[ \t]+)?packs[ \t]*[,—–-]?[ \t]*one per round\b/gi` and `WORDS` there ends at
`twenty: 20`. Evaluated against the sentence the record will hold at round 21 —
"Twenty-one packs, one per round" — the capture group does not match at "Twenty" (the hyphen stops
`[ \t]+`), backtracks, and matches at **"one"**, giving `WORDS["one"] = 1`. The guard then reports
*"states one where the tree holds 21"* against a correct record. It does not even reach the
"no numeral table here can read" branch, which is the one path designed for this.

`stageEvidenceCounts.test.ts:169-200` solved this already: its `WORDS` runs to `thirty` and carries the
hyphenated keys `twenty-one` … `twenty-nine`, with the comment *"a pin whose needle is a closed
enumeration, which is the defect the retracted-claims guard names in its own words about its own
alternation."* The file it names did not get the fix. Two rounds out.

Severity: minor. Traces to: `defect:test-oracle`.

### m3

**Three region terminators are right today and each is one heading away from the round-17 defect. I
measured all three rather than reading them.**

```text
stageEvidenceCounts.test.ts:306   /\n#{2,4} /
    region = record lines 995..1121, one heading inside, ends at `## Test volume estimate`.  CORRECT
    but 2-4 hashes only: a `#####` heading does not terminate it.
coverageDepthMatrix.test.ts:377   /^(?:\*\*Class |## )/m
    class C body = matrix lines 183..214, no heading inside, ends at
    `## Justifications, one per ❌ status row`.  CORRECT
    but `^## ` does not match `### `, so a level-3 heading after class C would not stop it.
coverageDepthMatrix.test.ts:567   (?=\n#{3} |$)
    row section = matrix lines 392..439, ends at `### US-0017-0008`.  CORRECT
    but exactly three hashes: neither `## ` nor `#### ` terminates it, so if US-0017-0007's section
    were last among the `###` blocks the pin would read to end of file.
```

None of these is a live defect and I am not asking for a plant to be produced for them. They are
recorded because "the region is part of the claim" was written into the record as a lesson while three
terminators still enumerate heading levels rather than matching any heading.

Severity: minor. Traces to: `defect:test-oracle`.

### A1

**Advisory, and the answer to the request's question: option 2's disposition is still right, and I
re-derived every part of it rather than taking round 18's word.**

- **Not reintroduced.** `tdd/test-list.md:107` and `:108` hold `TDD-0069` and `TDD-0070` at `todo`,
  `DR-ID: -`, `Blocked-By: -`. `.qfai/waivers.yml` is an empty waiver list. No gate was narrowed — I ran
  both profiles and the scoped gate still exits 1 on `QFAI-ATDD-112`. Nothing is merged.
- **Ground 1 is gone, measured.** `QFAI-ATDD-111` in my full-profile run names `US-0003-0021` through
  `-0028`, `US-0006-0011`, `US-0008-0008` and `US-0015-0016` — eleven, across four specs, **none in
  spec-0017**. So "no ledger rows to exempt" no longer describes this spec.
- **Ground 3 is refuted, measured.** All fifteen TCs `QFAI-ATDD-112` names unscoped are in flight: the
  seven outside spec-0017 (`TC-0003-0032`, `TC-0008-0015` through `-0018`, `TC-0015-0035`, `-0036`) are
  all `todo`; spec-0017's eight are **6 blocked and 2 todo**. An exemption for a spec's in-flight rows
  clears the rule outright rather than leaving other specs behind, exactly as recorded.
- **The bare sentence round 18 objected to is fixed.** `atdd-spec-0017.md:155` now reads "No RE-OPEN is
  required for eight of the nine rejected options" with option 2 named as the exception. Round 18's
  `M2` is applied.
- The CR carries the same disclosure at its own "Open as of 2026-08-22, after round 17: this option's
  rejection has no surviving stated ground" block. Handing it to that CR's owner rather than deciding it
  is correct, and I am not asking for a re-opening.

One observation, advisory only and **not** a blocking finding, because it would add an obligation
upstream never asked for: the record says this stage cannot supply another ground, and one candidate it
does not consider is that an exemption which clears the rule for every spec at once leaves
`QFAI-ATDD-112` unable to fail — which is the delta's own rejected Temptation, "a row that cannot fail
looks like coverage", at gate scope. That is the CR owner's argument to make or refuse, not this
stage's, and the current disposition already routes it there. If the stage wants it recorded it belongs
as a Change Request note on `CR-20260820-0012`, per the drift protocol's reviewer-originated-obligations
clause.

### A2

**Scope note.** The request set my emphasis at §3 and §4 and I spent the round there. I did not audit
§1 (the lexer's eleventh spelling, `hereDocAt` read by two walks), §2 (the init surface's fourth route)
or the differential test's live and inert lists beyond noting which commits carry them;
`implementation-reviewer` and `qa-gatekeeper` own those in this round's routing. Where §2 touches my
domain — whether `b0f9d443` moved a number this record states — the answer is `B5`, and it did.

## Required gates and residual risks

**Gates run this round**, all at a working tree whose code is byte-identical to `7fbac2d3`:

```text
PASS   the three record guards, 3 files / 28 tests / exit 0 (the gate I can state)
PASS   pnpm ci:lint, eleven members, exit 0
PASS   pnpm check-types, exit 0
PASS   pnpm verify:pack, exit 0
PASS   vitest --project e2e, 1446 passed | 16 skipped, exit 0
PASS   vitest --project integration --project unit, 1222 passed | 19 skipped, exit 0
PASS   check-atdd-annotation-ledger.mjs --spec 0017, 9 claims, exit 0
FAIL   validate --profile atdd --fail-on error --spec 0017, error=1 (known, recorded, QFAI-ATDD-112)
FAIL   validate --profile full, error=49 at this pack state (known, recorded, and the rule verifies)
```

**Residual risks.**

1. **The four guards are the only instrument between this record and the class of defect it exists to
   catch, and 17 of my §3 plants passed them.** Everything under "Counts I re-measured" was
   verified by hand this round; nothing in the guards would have caught the three refuted claims in
   `B6`, and nothing derives the integration+unit total that `B5` shows was wrong for four rounds.
2. **Both directions now have live examples.** `B2` and `B4` each redden on a true record. The record's
   own history says a guard that reddens on the honest edit teaches the stage to write the dishonest one
   (`coverageDepthMatrix.test.ts:605-608`), and round 18's `M1` filed that as unresolved. It is still
   unresolved and is now wider, because `B4`'s repair made a blockquote an assertion.
3. **`1ecbeb07` is not `7fbac2d3`.** The stage has committed twice since the subject and one of those
   commits introduced `M2`. Pinning the code and floating the record is workable, but the thing under
   review and the thing being shipped are two revisions apart at every measurement.
4. **A second writer is still on this branch.** `b0f9d443` is not this stage's and `B5` is the first
   number it moved. Nothing derives the second suite total, so the next such push is undetectable by any
   instrument here.

- Revision at finish: `1ecbeb07` (`git rev-parse --short HEAD`). **The subject did not move under me.**
- Plants: 18 against `.qfai/evidence/atdd-spec-0017.md` and 18 against
  `.qfai/evidence/coverage-depth-spec-0017.md`, each written, run and restored from a copy taken first;
  the harness re-verifies the md5 against `tmp/r19cr/backup/` after every single one and aborts if a
  restore does not reproduce the backup's digest. `.qfai/report/validate.log`,
  `validate.spec-0017.json` and two `run-*` directories were produced by the two validate runs and
  restored or removed; `git status --porcelain .qfai/report/` is clean. Nothing was written under
  `packages/qfai/assets/init/root/**`. Nothing was committed.

## Verdict

**REVISE.** Six blocking (`B1`-`B6`), two major (`M1`, `M2`), three minor (`m1`-`m3`), two advisory
(`A1`, `A2`).

The rework list, in the order I would take it:

1. **`B2`, `B3` and `B4` share one repair, and it is not another spelling.** Three needles are closed
   enumerations — four phrasings, one bullet marker, four bullet markers. Each has to be derived from
   the thing it is about rather than listed: the corpus needle from the record's own numeral vocabulary
   (`WORDS`, which the sibling file already maintains to thirty), and the roster and score anchors from
   **one shared markdown-bullet matcher** used by both sites in `coverageDepthMatrix.test.ts`. Write the
   matcher once. `B3` exists because it was written twice.
2. **`B1`** needs the fence strip to allow up to three leading spaces, and the table located by
   something stronger than "the first header in the section" — the last one, or all of them unioned,
   either of which also closes the duplicate-table route.
3. **`B2` and `B4` need their false-red half too**, which is round 18's `M1` unresolved: decide once, in
   one place, whether a blockquoted or fenced line in these records is shown or asserted, and make every
   guard read that decision. `retractedClaims.test.ts:646-650` already states it for one of them.
4. **`B5`** — correct the account, not only the number: three callsites moved the total, one of them
   `7b7a50ea`'s, and 1220 was already wrong at round 15. Then derive the integration+unit total the way
   the e2e one is derived; the record has said it "is derivable the same way and is not yet derived"
   since round 9.
5. **`B6`** — apply round 18's `M3`, `m1` and `m2`, or record them under "accepted rather than fixed"
   with the reason. Add needles for the three wordings so the next round does not have to find them by
   hand.
6. **`M2`** — rename or relocate the partial before round 20 opens.
7. **`M1`** — lessons 3 and 5 are the two to rewrite. Lesson 3 should say what the paragraph eight lines
   above it says: the region and the needle are two problems. Lesson 5 should keep its second clause and
   drop "the one time".

`PASS` is not available. I can state a gate that passed — the three record guards, 28 tests, exit 0 —
and that is why this is a `REVISE` with a stated gate rather than a stop condition. Against those same
28 tests I ran **36 plants**: **17** that should have reddened were green, and **7** true records were
reported as wrong.
