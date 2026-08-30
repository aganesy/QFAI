# R02 — completion-reviewer, round 20, spec-0017 (stage gates only)

- Revision at start: `2e1d5d9f2` (`git rev-parse --short HEAD`)
- **Code under review: `2e1d5d9f2`**, the commit that opened this pack. `git diff 2e1d5d9f2 HEAD` was
  **empty** at start, so the bytes I executed against are the subject's bytes for every guard, helper and
  test. Where I quote a line number it is `2e1d5d9f2`'s.
- **The record's pack and response counts are measured at the WORKING TREE**, per the request. That is
  the same tree as `2e1d5d9f2` for these three counts: `.qfai/review/review-20260823000000000/` holds
  only `review_request.md`, which the response counter does not match and which the closed-pack rule
  excludes anyway.
- Emphasis per the request: **§4 (the four record guards, sixth attempt)** and **§5 (the record)**
- Verdict: **REVISE**

## Gate that passed

`node ./node_modules/vitest/vitest.mjs run --project e2e tests/assets/stageEvidenceCounts.test.ts
tests/assets/coverageDepthMatrix.test.ts tests/assets/retractedClaims.test.ts` from
`packages/qfai` — **3 files, 28 tests, exit 0**, at a tree whose `.qfai/` and `packages/qfai/` contents
are `2e1d5d9f2`'s. That is the baseline every plant below was measured against, and every plant was
written over a copy taken first and restored from that copy (`tmp/r20cr/backup/`, md5 re-verified by the
harness after every single run, which aborts if a restore does not reproduce the backup's digest).

## Plant hygiene, and what is in the tree that is not mine

I planted only in `.qfai/evidence/atdd-spec-0017.md` and `.qfai/evidence/coverage-depth-spec-0017.md`,
always copy-first / write / run / restore-from-copy, never `git checkout`. Nothing under
`packages/qfai/tests/**` or `packages/qfai/assets/**` was modified by me. All scratch is under
`tmp/r20cr/`. Nothing was committed.

**Three artifacts appeared in `git status` under me and none of them is mine**, so I am reporting them
rather than touching them: `packages/qfai/assets/init/.github/instructions/code-review.instructions.md`
modified, and `packages/qfai/assets/init/.qfai/assistant/bootstrap/` and
`packages/qfai/assets/init/.qfai/assistant/catalog/r20-probe.md` untracked. The `r20-probe.md` name says
it is a live plant by a sibling reviewer in this round; the other two are either that reviewer's or the
other session's. They are inside the **shipped** init tree, so if any of them is left behind it reaches
adopters. I did not restore them because they are not mine to restore, and per the request I say so
rather than assuming.

## Section 4 — the four record guards, sixth attempt

I broke each in both directions with **27 plants** against the 28-test baseline. One of the four is
genuinely repaired and I record that first. The other three are all NEEDLE defects over regions that are
correct — the same shape as round 19 — and two of them are the round-19 finding surviving its own repair.

### What held: the Delta Rejected Guard tie

Round 19's `B1` is closed in **both** directions, verified with seven plants. The strip now reads
`/^ {0,3}(?:```|~~~)[\s\S]*?^ {0,3}(?:```|~~~)/gm` and the header is located by
`[...unfenced.matchAll(/^\|\s*artifact\s+\|/gm)]` with `expect(headers.length).toBe(1)`:

```text
[ RED ] control: real `tests/assets/retractedClaims.test.ts` row deleted, no decoy
[ RED ] 1-space-indented BACKTICK fenced decoy table above it, real row deleted
[ RED ] 3-space-indented backtick fenced decoy above it, real row deleted
[ RED ] 1-space-indented TILDE fenced decoy above it, real row deleted
[ RED ] plain duplicate table above it, real row deleted  (exactly-one rule fires by name)
[GREEN] a four-line illustrative EXCERPT in a 1-space-indented fence, table intact and complete
[GREEN] the same excerpt in a column-0 fence, table intact and complete
```

Every route round 19 demonstrated is shut and neither of its direction-A false reds reproduces. I tried
four further routes and three of them are shut too:

```text
[ RED ] 4-space-indented decoy (its rows never reach column zero), real row deleted
[ RED ] decoy inside an UNCLOSED fence, real row deleted
[ RED ] decoy BELOW the real table, real row deleted
[GREEN] complete decoy above + the LIVE table's header renamed `| Artifact  |` + its row deleted
```

The fourth is `m1` below and it is small. This is much the strongest of the four repairs and the only one
I could not break on its own terms, and it is worth saying plainly before the three findings that follow.

### B1

**The corpus-count guard reads three of the record's four stated corpus sizes and reaches "four" by
counting one of them twice. The fourth — the one the record's own sentence singles out as the hard one —
is unread: a wrong value there passes, and deleting it passes. The widening lost a site the version it
replaced caught.**

`stageEvidenceCounts.test.ts:315-365`. The needles are now three wide ones over two nouns, and the site
count is `new Set(sites.map((match) => match.index)).size`, compared against the `four` the record states.
Extracting the three patterns from the file's own bytes and evaluating them over the guard's own region
(record lines 996-1122, which I re-derived and which is correct):

```text
index 4760  corpus                         42      <- needle 3, `corpus` .. 42
index 4791  42 mechanisms                           <- needle 1, same `42` as the line above
index 5102  42 mechanisms                           <- needle 1
index 5105  mechanisms pinned; ... lets all 42      <- needle 2
```

Four indices. But the record states the corpus size at **four separate places**, and they are these:

```text
4791  escape corpus                         42 mechanisms, 0 still open
5102  tests/unit/shippedLaneCommands.test.ts  42 mechanisms pinned;
5155  ... the pre-repair helper lets all 42 through
5300  assertion reddens it with all 42 listed, and swapping it back leaves the file green.
```

The guard reads 4791 **twice** (once as `corpus … 42`, once as `42 mechanisms`), reads 5102 and 5155, and
never reaches **5300**. The count of four is an arithmetic coincidence between a double count and a
missing one.

Executed, record restored from `tmp/r20cr/backup/` after each:

```text
[ RED ] control: `42 mechanisms, 0 still open` -> 47
[ RED ] control: `lets all 42 through` -> 47
[GREEN] `reddens it with all 42 listed` -> `with all 47 listed`
[GREEN] the whole clause `with all 42 listed, ` deleted from the sentence
```

**Round 19's version caught both of those.** Its needle set carried `/with all (\d+) listed/g` and
`/lets all (\d+) through/g` as two of its four phrasings. Widening to "any numeral adjacent to
`mechanism` or `corpus`" dropped the one true site that has neither noun within forty characters — so the
repair for "a needle narrowed until it lost a spelling" lost a spelling by widening. That is the same
ledger entry, in the opposite direction, and it is the fifth consecutive round in which this guard's
needle is the defect.

It matters more than an ordinary miss because of what the record says about site 5300 specifically: *"It
said 'the three numerals in that block' until round 16, which was wrong twice over: there are four, **and
one of them sits outside the block the sentence points at**."* 5300 is that one. The guard's coverage
stops exactly at the site the record wrote a sentence to make sure nobody forgot.

**Direction A, two true sentences that redden.** Round 19 filed
`Of the 42, 6 lexer mechanisms were the level-1 class.` as a false red; it is not exempted and it still
reddens. And the widening added a new one, from a missing word boundary — needle 1 is
`(NUMERAL)(?:\s+\S+){0,3}\s+mechanisms?\b` with **no `\b` before the capture**, so `one` inside `None`
is a numeral:

```text
[ RED ] Of the 42, 6 lexer mechanisms were the level-1 class.
          -> "6 lexer mechanisms: corpus holds 42"
[ RED ] None of the mechanisms found since round 12 escaped the repaired helper.
          -> "one of the mechanisms: corpus holds 42"
[GREEN] Everyone who ran the sweep agreed the mechanisms were real.   (control: >3 words apart)
```

`None of the mechanisms …` is not a contrived spelling. The section two paragraphs above the plant already
writes *"fourteen confirmed escapes and none refuted"*; one rewording puts `mechanisms` within three
words of that `none` and reddens a required `e2e` leg on a true sentence.

Severity: Blocking. Traces to: `defect:test-oracle` — the guard the record cites as deriving its
falsification figure leaves one of the four figures unchecked in both value and existence, and reddens on
two true sentences.

### B2

**The exemption list re-hardcodes the site count the guard was rewritten to stop hardcoding, so the
record's own documented way of adding a fifth true statement reddens — with an error message about a dead
exemption rather than about the count.**

`stageEvidenceCounts.test.ts:267-271` explains why `SITES` is read from the record and not written in the
file: *"`SITES = 4` was a literal the record never stated while its nearest sentence said three, so adding
one true sentence reddened this row and a reader had no way to know which number was authoritative."*
Sixty lines later, `NOT_THE_TOTAL[3]` is the literal string

```text
"corpus size appears four times in this section"
```

and `:332-337` requires every entry to still occur in the section, on the stated ground that *"a dead
entry here is a hole this guard would keep open"*. The two rules are in tension: the sentence the guard
reads `SITES` out of is also an exemption keyed on the word `four`.

The record states the intended behaviour in its own words at line 1113: *"that sentence is where the guard
reads how many sites to expect, so **adding a fifth statement without saying so reddens**"* — the plain
reading of which is that saying so does not. Executed:

```text
[ RED ] add a fifth TRUE statement (`The corpus holds 42 mechanisms today.`)
        AND update the sentence to `corpus size appears five times in this section`
        -> "an exempted phrase that is no longer in the section"
```

So the honest edit the record describes is not available, and the failure it produces names the wrong
thing: a maintainer is told an exemption went dead, not that the site count moved.

The other three entries are clean and I checked each of the three properties the request named. **Wider
than the sentence?** No — each span covers exactly one needle hit, and `"mechanisms, 0 still open"` is
deliberately quoted without its leading `42 ` so that the `42` stays a counted site (I verified the site
at 4791 survives the exemption at 4794). **Swallows a true site?** No, measured: the four spans are
`[224,247)`, `[434,520)`, `[4794,4818)`, `[5477,5522)` and no counted site index falls inside any of them.
**Dead?** No: all four occur exactly once each. The one structural residual is that
`section.indexOf(phrase)` exempts only the **first** occurrence, so a record that quoted one of these four
sentences twice would have its second copy counted — latent today, and the same shape as `B5` below,
where quoting the record's own withdrawn wording is what reddens a guard.

Severity: Major. Traces to: `defect:test-oracle` — a literal count reintroduced in the same test that
documents why it was removed, blocking the record's own stated growth path.

### B3

**Class C's per-cell pin is a single keyword, and round 15's rejected reason passes it with one word
added. The check's own message says "does not argue about the cell it is written under"; what it enforces
is that the cell's noun appears somewhere in the bold span.**

`coverageDepthMatrix.test.ts:78-81` pins `US-0017-0001/Boundary values` to a `boundary|boundaries` needle
and `US-0017-0007/Error path` to a `fail|failure|fails|failed` needle. Round 19's break 2 is genuinely
closed — I ran it first, so the escapes below are localised:

```text
[ RED ] control: the two members' reasons SWAPPED between them
```

But the property enforced is keyword presence, and class C's defining claim is that the cell is
**inapplicable by the design rather than untested**. A reason asserting the opposite passes:

```text
[GREEN] `US-0017-0007` × `Error path` — **it is simply untested, no one has looked,
         and nothing here fails.**
[GREEN] the two reasons reduced to **boundary.** and **fail.**
```

The first plant is not invented. "It is simply untested, and no one has looked" is the exact reason
round 15 filed a cell under this class with, and the matrix quotes it in this very paragraph as the reason
the class was rewritten: *"Round 15 filed a plainly untested cell under that property, with the reason
'it is simply untested, and no one has looked', and every guard stayed green."* Six lines of comment in
the guard narrate that failure. Adding the word `fails` to it passes the repair written for it. The
paragraph's own words are that the members are enumerated *"because no score in this table can decide
that"* — and a keyword cannot decide it either.

Round 18's `**see the row's own section.**` and round 19's `**A.**` are both closed, so this is narrower
than what it replaces. It is still the fourth consecutive round in which a reason that does not justify
its cell passes the roster check, at a fourth granularity.

Severity: Blocking. Traces to: `defect:test-oracle` — the only assertion tying a class C cell to a reason
is satisfied by a reason stating the cell belongs to no class at all.

### B4

**The depth-score pin reads one LINE at a time, and this record is hand-wrapped. A contradicting score
whose bolded pair straddles a line break is invisible, a true one that straddles a line break reddens, and
a score written without its backticks is invisible. Sixth attempt, both directions, one cause.**

`coverageDepthMatrix.test.ts:663-672`. The repair replaced the marker enumeration with the bolded pair —
the column name and the score inside one bold span, or the score in a code span immediately after it —
matched **per line**, over `rowSection.split("\n").filter((line) => !isQuotation(line))`.

Round 19's four spellings are all closed (ordered list, no marker at all, table cell, doubled dash)
because each puts the pair on one line. Executed against the `US-0017-0007` section, each plant raising a
cell the table scores as failing:

```text
[ RED ] control:  - **Error path `✅`** — the malformed-override cases cover it.
[GREEN]           - **Error path
                    `✅`** — the malformed-override cases cover it.
[GREEN]           - **Error path** ✅ — the malformed-override cases cover it.
```

Both greens render to a reader as exactly the assertion the control makes. The first is a hand-wrap; this
file's own bullets wrap — the `Oracle strength` bullet runs to five lines — and no formatter would ever
normalise them, because this stage has established at length that `.qfai/evidence/**` is prettier-ignored
and `proseWrap` is `preserve`. The second drops the code span, which markdown does not require around an
emoji.

**Direction A, from the same cause.** Hand-wrapping a TRUE bullet inside its bold span reddens a required
leg:

```text
[ RED ] - **State transitions
          `❌`** — the axis is read once per run.
        -> "State transitions: the section states no score for it"
```

Nothing about that edit changes what the section claims. This is round 19's direction-A residual in a new
spelling: the repair moved the anchor from the list marker to the bolded pair, and the unit it reads is
still the line.

**The unit is the defect, and this stage already solved it once.** `retractedClaims.test.ts` collapses
whitespace before searching, for exactly this reason, and its docstring says why — the needle had a space
where the record has a hand-wrapped newline, filed as round 6's decisive finding. Two instruments in one
stage's work, one question, and the one that reads scores still answers it the way round 6 refuted.

Severity: Blocking. Traces to: `defect:test-oracle` — the pin that stops a coverage cell being raised
without a sentence is defeated by pressing Enter, and reddens when a true sentence is rewrapped.

### B5

**`isQuotation` centralised half of one rule. There is no fourth copy of the function — there are five
sites that decide "is this line shown or asserted" and they give three different answers, two of them in
the file that imports the helper. Both halves are demonstrated: a blockquoted quotation reddens the
roster, and a fenced quotation reddens the score pin.**

The request asked for a fourth copy. What I found instead:

```text
recordProse.ts:22        isQuotation          /^\s*>/                   blockquote SHOWN, fence ASSERTED
retractedClaims.ts:416   flattenDocument      inFence || isQuotation    blockquote SHOWN, fence SHOWN
retractedClaims.ts:749   reconstruction test  inside  || /^\s*>/        blockquote SHOWN, fence SHOWN
coverageDepthMatrix:663  the score pin        !isQuotation(line)        blockquote SHOWN, fence ASSERTED
coverageDepthMatrix:63   BULLET               ^[ \t>]*[-*+]             blockquote ASSERTED
coverageDepthMatrix:469  inClassCSection      no rule at all            blockquote ASSERTED
```

`:749` is a deliberate re-derivation and the file argues for it; I do not count it as a divergence. The
last two are not deliberate. Executed:

```text
[ RED ] class C's body quotes a withdrawn roster entry in a BLOCKQUOTE:
          > - `US-0017-0004` × `Normal path` — **the second one no future work would turn green.**
        -> "the pinned reasons and the roster must name the same members"
[GREEN] a withdrawn SCORE quoted in a blockquote in the row section   (round 19's B4 direction A, fixed)
[ RED ] the same withdrawn SCORE quoted in a FENCE in the row section
        -> "Error path: the section states it 2 times"
```

`BULLET`'s own docstring says the marker may be *"inside a blockquote or not"*, while `isQuotation`'s — in
the file `BULLET`'s file imports — says a blockquote is *"the one route round 10 demonstrated that is
meant to stay open"*. Both were written in the same commit, sixty lines apart. This record's lesson 2 is
*"two copies of a rule diverge, and the one nobody is looking at is the one that is wrong"*, and the
commit that extracted the helper to end that pattern created the next instance of it inside the importing
file. That is the third consecutive round in which the class C roster carries the defect its neighbour
had fixed.

The fenced half matters more, because `isQuotation` is **named for the whole question and answers a
quarter of it**. `flattenDocument` has to write `inFence ||` in front of every call; the score pin has no
fence tracking at all, so a record that quotes its own withdrawn score in a fence — the ordinary way to
show a markdown bullet without it rendering as a bullet — reddens a required leg. Round 19 required this
decided *"once, in one place"*; it was decided in one place for one of the two ways a record quotes
something.

Severity: Blocking. Traces to: `defect:test-oracle`.

### M1

**Every region terminator now matches any heading level, and every one of them matches a heading-shaped
line inside a fenced block. One of the three is a laundering route: round 15's phantom class C member
becomes invisible behind an ordinary fenced sample carrying a shell comment.**

Round 19 recorded the three terminators as correct-today and one heading away from round 17's defect, and
asked for no plant. They were widened to `#{1,6} `, which is the right axis, and the widening bought a new
failure on the other side: **`#` at the start of a fenced line is not a heading**, and markdown says so.
None of the three tracks fences.

Measured first, so the grading is honest: **zero** lines in either record are heading-shaped inside a
fence today (scanned both files, tracking `\`\`\`` and `~~~` toggles). This is latent. It is filed above
minor because one direction is a green, and because the shape that triggers it — a fenced `yaml` or `bash`
sample whose first line is `# something` — is the single most common code block in a repository whose
subject is CI workflows.

```text
[ RED ] a fenced yaml sample with a `# derive the base ref` line placed ABOVE class C's roster
        -> class C's body truncates at the comment, both roster entries vanish,
           "the pinned reasons and the roster must name the same members: expected [2] to equal []"
[GREEN] the same fenced sample placed BELOW the roster, with a phantom member after it:
          - `US-0017-0004` × `Normal path` — **it is simply untested, and no one has looked.**
        -> `inClassCSection` never reaches it; the check that a reason may not exist for a
           non-member passes over a reason for a non-member
```

The green is round 15's finding verbatim — *"filed a plainly untested cell under it, with the reason 'no
one has looked', and the suite stayed green"* — restored by the repair for round 19's `m3`. The same
truncation applies to `stageEvidenceCounts.test.ts:292` (`/\n#{1,6} /` over the sweep section) and to
`coverageDepthMatrix.test.ts:630` (the row section), where I could not produce a green because the four
exempt phrases and the seven column bullets all sit before any plausible truncation point — but in both
cases the region silently shrinks and nothing reports it.

The corpus guard shows what the fix looks like: its exemption list is required to be non-dead, so a region
that loses a phrase fails loudly. A terminator that can silently shrink a region has no such floor.

Severity: Major. Traces to: `defect:test-oracle`.

### m1

**The "exactly one artifact table" rule is case-sensitive, and one capital letter defeats it with the
live row deleted.**

`stageEvidenceCounts.test.ts:213` — `/^\|\s*artifact\s+\|/gm`, no `i` flag. Executed:

```text
[GREEN] a complete stale copy of the table pasted above the live one,
        the live table's header renamed `| Artifact  |`, and the live table's
        `tests/assets/retractedClaims.test.ts` row deleted
```

The guard counts one header, finds the stale copy, and reads it as "the table". Two edits and visible to a
reader, which is why this is minor rather than part of the Delta tie's clean result — but the repair is
one flag.

Severity: minor. Traces to: `defect:test-oracle`.

### m2

**`WORDS` was extended to `thirty-five` with hyphenated keys, and the new alternation built from those
keys in the same commit truncates a compound to its first key in two of its three needles. Third copy of
one rule, third divergence, inside one round.**

`stageEvidenceCounts.test.ts:343` builds `NUMERAL` from `Object.keys(WORDS)`. Evaluated against sentences
this record could hold:

```text
"The sweep pinned twenty-one mechanisms in all."   needle 1 -> "twenty-one"  (21, correct)
"The mechanisms number twenty-one in all."         needle 2 -> "twenty"      (20, wrong)
"The mechanisms number thirty-five in all."        needle 3 -> "thirty"      (30, wrong)
```

Needle 1 recovers by backtracking because the alternation is followed by a mandatory `\s+`; needles 2 and
3 end at `\b`, which a hyphen satisfies, so the first matching key wins. `recordProse.ts:39` states the
rule that was violated: *"The hyphenated keys are the point: `[ \t]+` does not cross a hyphen, so
`twenty-one` has to be one key."* The retracted-claims needle was fixed to `[\w-]+` for this; the
alternation written in the same commit was not. Latent — the corpus is 42, which `WORDS` cannot spell at
all — and filed because the record's house style writes counts as words and the corpus grows every round.

Severity: minor. Traces to: `defect:test-oracle`.

## Section 5 — the record

### Counts I re-measured, per revision, and what held

Every figure below was run at this tree. `.qfai/report/validate.log` and `validate.spec-0017.json` were
restored from `tmp/r20cr/reportbak/` afterwards and `git status --porcelain .qfai/report/` verified empty.

```text
pnpm ci:lint                                    exit 0   — and the script has exactly ELEVEN members  MATCHES
pnpm check-types                                exit 0                                                MATCHES
vitest --project integration --project unit     1239 passed | 19 skipped, exit 0                      MATCHES
check-atdd-annotation-ledger.mjs --spec 0017    9 claim(s) backed, exit 0                             MATCHES
pnpm verify:pack                                ok=16 info=2 warning=1 error=0                        MATCHES
validate --profile atdd --fail-on error --spec 0017
                                                info=2 warning=0 error=1, QFAI-ATDD-112 on EIGHT TCs  MATCHES
validate --profile full                         info=4 warning=403 error=48 at THIS pack state        see M3
vitest --project e2e                            1475 passed | 2 FAILED | 16 skipped, exit 1           see B6
e2e callsites at this tree                      913, and the guard derives it                         MATCHES
integration+unit callsites                      853 + 287 = 1140                                      MATCHES
```

**The arithmetic model the record uses for the suite totals verifies at this revision.** It states
*"integration+unit, 99 against passed and 118 against passed-plus-skipped; for e2e, 564 and 580"* against
*"today's 1239 / 1140"*. Measured: 1239 − 1140 = 99, 1258 − 1140 = 118, 1477 − 913 = 564, 1493 − 913 = 580.
All four constants hold. Round 19's `B5` is applied in full — the per-revision table at
`atdd-spec-0017.md:2086-2087` now attributes two callsites to the other session and one to this stage, and
the corrected 1219 replaces 1220 with the four-round staleness stated.

**`## Final status`'s three counts verify, including the split, which I derived rather than accepted.**
20 pack directories, 19 closed, **53** responses matching `/^R0\d+_.*\.md$/` over the closed ones — so
"twenty rounds, 53 reviewer responses" is right, and round 19's `M2` is applied: the partial is
`predecessor-partial_completion-reviewer.md`, which the counter does not match and the recursive seal
still covers. The split the record says is not derivable, I derived by hand: scanning all 53 for a verdict
line, **exactly one states `Verdict: **PASS**`** —
`.qfai/review/review-20260821080000000/R04_qa-gatekeeper-p1d.md`, P1d's sixth pass — and all 52 others
carry a REVISE. "52 REVISE and one PASS" is true.

**Round 19's other applied findings**, each re-checked rather than taken on the commit message: `B6`'s
three round-18 leftovers are all gone (`"Three of round 16's guard repairs failed again"` deleted, the
doubled `"two of two of thirty-five reports"` sentence rewritten to the arithmetic pin, and the
`GOVERNANCE` self-exclusion arithmetic re-measured to 126 / 112 / 14 across six claims); `m1`'s seal-gap
table now runs to round 18; `m2`'s numeral table is one shared copy running to `thirty-five`; `m3`'s three
terminators all match any heading level (and see `M1`).

**Rejected options: nothing is reintroduced and no RE-OPEN is owed by this stage.** `tdd/test-list.md:107`
and `:108` hold `TDD-0069` and `TDD-0070` at `todo`, `DR-ID: -`, `Blocked-By: -`; `.qfai/waivers.yml` is
`waivers: []`; and I ran both profiles, so no gate was narrowed — the scoped gate still exits 1 on
`QFAI-ATDD-112` over the same eight TCs. Option 2 of `CR-20260820-0012` is still handed to that CR's
owner with its rejection's lost grounds stated at `atdd-spec-0017.md:150-160`, which is where round 19
left it and still the right disposition.

### B6

**`## Commands executed` certifies the e2e leg at `exit 0`, and it exits 1 at this tree. One of the two
failures is the test that carries the restored `US-0017-0007` coverage claim, it reproduces in isolation,
and its cause is structural rather than flaky.**

The record's block states *"pnpm -C packages/qfai test:e2e — 1477 passed / 16 skipped, exit 0"*, under a
paragraph headed *"Every line below was re-run for round 19, and that sentence has to be earned each
time."* Measured at this tree:

```text
Test Files  2 failed | 87 passed | 4 skipped (93)
Tests       2 failed | 1475 passed | 16 skipped (1493)
```

1477 is the number of non-skipped tests, and 1475 of them pass. Two do not:

1. **`tests/assets/initAssetsRootMirror.test.ts`** — `root .qfai/ is out of sync with
   packages/qfai/assets/init/.qfai`, missing `.qfai/assistant/bootstrap`. **This one is not the record's.**
   It is a sibling reviewer's live plant in this round: `packages/qfai/assets/init/.qfai/assistant/bootstrap`
   was untracked in `git status` while I ran, disappeared, and came back. I am reporting it only so the
   number above is accounted for.
2. **`tests/e2e/spec0017RunnerParallelismE2E.test.ts` › "runs one file at a time at one worker and several
   at four"** — this one reproduces with a clean `git status`, three runs out of three, in isolation and
   in the full project.

The second failure's cause, measured rather than guessed:

```text
the fixture suite did not pass at 1 workers (status 1):
  failed to load config from C:\...\Temp\qfai-parallelism-XXXXXX\vitest.config.ts
  Error: Cannot find module 'vitest/config'
  Require stack:
    - C:\...\Temp\qfai-parallelism-XXXXXX\vitest.config.ts
    - <repo>\node_modules\.pnpm\vite@5.4.21_.../vite/dist/node/chunks/dep-BK3b2jBa.js
```

`fixture()` writes the config into `os.tmpdir()` and vite resolves a config's bare imports relative to the
config file. Measured directly with `require.resolve`:

```text
cwd = %TEMP%            vitest/config -> MODULE_NOT_FOUND
cwd = <repo>            vitest/config -> MODULE_NOT_FOUND   (the root has no hoisted vitest)
cwd = <repo>/tmp        vitest/config -> MODULE_NOT_FOUND
cwd = packages/qfai     vitest/config -> ...\vitest@2.1.9...\dist\config.cjs
```

So the fixture can only load where the OS temp directory sits under a `node_modules` chain that reaches
vitest, which is true of neither this machine nor a `ubuntu-latest` runner. The carrier file is byte-identical
since `0af376e2`, so **this is not this round's regression** and I could not reconcile it with round 19's
recorded `1446 passed | 16 skipped, exit 0` on the same machine; I am recording the measurement and the
cause and handing the diagnosis to whoever owns §1/§3 in this round's routing.

What is squarely mine is the consequence for the record. `coverageDepthMatrix.test.ts:749-756` requires the
carrier to contain `peakConcurrency(` and `spawnSync(` — it checks the file's TEXT, not that it passes —
and the matrix scores `US-0017-0007` `⚠️ and COVERED` on the strength of it, with `Normal path ✅` and
`Oracle strength ✅` justified as *"a measured effect, not a file's contents"*. The effect is not being
measured here. A story whose withdrawal lasted eleven rounds for asserting an existence check is now
carried by a test whose own guard is an existence check over its source.

Severity: Blocking. Traces to: `defect:evidence-integrity` — a `## Commands executed` line certifying
`exit 0` for a required CI leg that exits 1 at the revision it certifies, and the failing test is the
carrier for the one coverage claim this stage restored.

### M2

**Gap 10, and the request's question. Deferring is defensible; the paragraph as written is not. It states
sixteen where the table holds fifteen, its own enumeration lists exactly fifteen, and it says all of them
"carry no reason anywhere" when seven of them are justified in the artifact — including two in the row
whose section the record quotes elsewhere. And it cites lesson 5 for a proposition lesson 5 does not
contain.**

**The deferral itself is defensible, and I want that on the record before the rest.** The obligation is one
round old, it arrived as a residual under a check its author explicitly passed, and it landed in the commit
that OPENS a review round — the one moment this stage's own rule says the subject must stop moving. Sixteen
justifications written into a governance artifact in that window would be sixteen unreviewed claims in the
artifact whose entire history is reviewers refuting quickly-written prose. Naming it, quantifying it and
assigning it to the next round is the right shape. I would not have filed this as a finding at all.

**What I am filing is the paragraph.** Measured from the matrix table's own rows, by the same parse
`coverageDepthMatrix.test.ts` uses:

```text
US-0017-0001  ⚠️ depth cells: Error path, Special values
US-0017-0002  ⚠️ depth cells: Boundary values, Combinatorial
US-0017-0003  ⚠️ depth cells: Boundary values, Special values
US-0017-0004  ⚠️ depth cells: Oracle strength
US-0017-0005  ⚠️ depth cells: Oracle strength
US-0017-0006  ⚠️ depth cells: Oracle strength
US-0017-0007  ⚠️ depth cells: Boundary values, Special values
US-0017-0008  ⚠️ depth cells: Normal path, Oracle strength
US-0017-0009  ⚠️ depth cells: Boundary values, Special values
TOTAL: 15
```

Gap 10 says **sixteen**. Its own enumeration — "`-0001`'s error path and special values, `-0002`'s boundary
and combinatorial, `-0003`'s and `-0007`'s and `-0009`'s boundary and special values, `-0004` through
`-0006`'s and `-0008`'s oracle strength, and `-0008`'s normal path" — is exactly the fifteen above, correct
and complete. The numeral and the list disagree inside one sentence, in the paragraph arguing against
writing things quickly, in the record whose most-repeated defect is a numeral nothing derives.

**And "carry no reason anywhere" is false for seven of the fifteen**, each quoted from
`coverage-depth-spec-0017.md`:

```text
US-0017-0003 Boundary values, Special values
   "`Boundary values` and `Special values` stay `⚠️`: the two probe candidates and the fail-open
    default are exercised, a blank or whitespace-only file is not."
US-0017-0004 Oracle strength
   "**`Oracle strength` is `⚠️`, down from `✅`.** … the assertion does exactly that: it filters
    `job.steps[].run` for build commands, and every step in every lane is an `echo` placeholder…"
US-0017-0005 Oracle strength
   "`Oracle strength` stays `⚠️` because that assertion is about file topology and cannot distinguish
    a lane that runs tests from a lane that echoes."
US-0017-0007 Boundary values, Special values
   "**Boundary values `⚠️`** — one worker and four are exercised, and one worker is the true boundary…"
   "**Special values `⚠️`** — the override rejects `\"\"`, `\" \"`, `\"0\"`, `\"-1\"`, `\"2.5\"`…"
US-0017-0008 Normal path
   "`Normal path` is `⚠️` rather than `❌` because reachability is genuinely half the story…"
```

The eight that genuinely carry nothing are `-0001`'s two, `-0002`'s two, `-0006`'s and `-0008`'s
`Oracle strength`, and `-0009`'s two — and `-0002` and `-0009` have no justification section at all,
because the artifact only gives one to a `❌ Status` row. **That is the actual gap**, and it is a contract
gap rather than a prose gap: `§ "Every ❌ cell, named"` and the guard that reads it both key on `❌`, so a
`⚠️` cell is unjustifiable-by-construction whatever anyone writes. Gap 10 files it as sixteen sentences
owed. A round that discharges it as written will write seven reasons for cells that already have one, in a
second place — which is this record's lesson 2 as a work order.

**The lesson 5 citation is the part that answers the request's question directly.** Gap 10 says filling
the cells quickly *"is the 'tidy summary' failure lesson 5 warns about, at the scale of a whole section"*.
Lesson 5, in full, reads: *"'I cannot settle this' needs the evidence any other claim needs … each of
those is a deferral WITH its evidence, which is the thing this lesson asks for rather than the thing it
warns against."* It does not mention tidy summaries; it is about deferrals, and its test is that a
deferral carries its evidence. Applied to gap 10, lesson 5 does not license the deferral — **it is the
standard gap 10 fails**, because the evidence gap 10 offers about the fifteen cells is a count the table
does not hold and a universal the artifact refutes. So the answer to the brief's question is: the
deferral is not the tidy-summary failure, and the paragraph recording it is.

Severity: Major. Traces to: `defect:evidence-accuracy` — a Gaps item stating a count its own enumeration
contradicts and a universal seven counter-examples refute, in the commit under review.

### M3

**The `--profile full` rule and its 47 / 49 / 48 sequence verify. The commit under review moved the figure
at one of the two places the record states it and left the other, so at `2e1d5d9f2` the record said 49 in
one section and 48 in another about the same working copy — which is lesson 4, in the commit that states
lesson 4.**

**First, what verifies**, because this is the figure three rounds have got wrong and this version is the
best of them. Measured by running the profile and counting `[error]` lines by rule:

```text
QFAI-REVIEW-007   44
QFAI-REVIEW-004    2   review-20260823000000000 (no summary.json), review-20260821200000000 (round 13)
QFAI-REVIEW-005    1   review-20260821200000000 (round 13)
QFAI-ATDD-111      0   closed
QFAI-ATDD-112      1
                  48   at the state I measured: round 20's pack open, reports landed, no summary.json
```

That is the third of the three states, and it reads **48**, which is the record's third value. Removing
round 20's `-004` gives the sealed value **47**, the decomposition table's own five rows. At the subject
commit the pack held only `review_request.md`, so round 20 contributed a `-005` as well: **49**, the
second value. The stated deltas — `+2` on opening, `−1` once reports land, `−1` once a `summary.json`
does — reproduce exactly, in both directions, and the sealed decomposition sums correctly. I also
confirmed that all 43 packs `QFAI-REVIEW-007` cites are untracked and that **none of them is this
stage's**, which is the claim the whole "not a property of any revision" argument rests on.

**What does not verify is that the record states one number.** `## Commands executed` at
`atdd-spec-0017.md:2173` reads *"validate --profile full — info=4 warning=403 error=48 on THIS working
copy"*. § "The full profile" at `:2712` was edited in this commit to read *"49 is the state this commit
is in"*, and the commit message says so in as many words: *"The unscoped profile goes to 49 by the same
rule."* Both sentences describe the same working copy at the same commit, and at that commit the answer
was 49. One was corrected and one was not.

The line is now accidentally right again — reports have landed in round 20's pack since, taking the tree
to 48 — which is worse than being wrong, because nothing distinguishes a figure that tracks from a figure
that is stationary while the quantity oscillates around it. This is the fifth instance of the class
lesson 4 names, and unlike the four the lesson lists, this one was created by the commit that lists them.

Severity: Major. Traces to: `defect:evidence-integrity`.

### M4

**`recordProse.ts` is a governance-prose file this stage added this round and it is not in `GOVERNANCE`,
so a refuted claim written in it is invisible to the guard whose subject is exactly that. Nothing ties
`GOVERNANCE` to the file list two guards away, and the list's own comment records this omission happening
twice before.**

`stageEvidenceCounts.test.ts` names twelve files this stage added — nine in `TRACKED`, three in
`HELPERS` — and asserts that `CLAIMS`'s file set equals `TRACKED` exactly, *"Without this the list below
could drift from `TRACKED` in either direction."* `retractedClaims.test.ts`'s `GOVERNANCE` has no such
tie. Comparing the two lists:

```text
in TRACKED + HELPERS, in GOVERNANCE          11 of 12
in TRACKED, deliberately excluded, argued      1   tests/assets/retractedClaims.test.ts
in HELPERS, absent from GOVERNANCE, unargued   1   packages/qfai/tests/helpers/recordProse.ts
```

`recordProse.ts` is 77 lines of which about 50 are argument about this record's rules — the history of the
blockquote decision, the history of the numeral table, and two claims about how many places each rule used
to live in. It is in the Delta Rejected Guard table as an artifact this stage added. It is not scanned.

The omission is **latent**: I ran the guard's own 33 needles, flattened by its own rule, over the file and
none matches. I did not plant one, deliberately — `packages/qfai/tests/**` is shared with two sibling
reviewers running right now, and a plant there is a finding somebody else would measure against.
The structure is conclusive without one: `occurrences()` iterates `GOVERNANCE` and nothing else.

`GOVERNANCE`'s own comment records this exact failure twice — *"the widening named the files the round
happened to be looking at rather than the files this stage wrote, which is the same shape as the scoping
it replaced, one size smaller"* — and the repair is the tie `CLAIMS` already has: assert
`GOVERNANCE ⊇ TRACKED + HELPERS` minus the one documented exclusion, so adding a file is an edit in both
places or a red.

Severity: Major. Traces to: `defect:test-oracle`.

### m3

**The paragraph that argues an absolute is meaningless without the untracked-pack count beside it and the
date it was taken carries four such numbers, three of them stale and none of them dated.**

§ "The full profile" states: *"measured here, **64 pack directories and 317 files on disk against 22
directories and 98 files tracked**"* and *"this stage attributed every finding of the current run to the
pack it names: **45 packs cited, 43 of them untracked**"* and *"re-measured at round 19 with 42 untracked
packs present"*. Measured at `2e1d5d9f2`:

```text
pack directories on disk            65      record says 64
files under .qfai/review on disk   319      record says 317
tracked pack directories            22      record says 22   OK
tracked files                      103      record says 98
packs cited by QFAI-REVIEW-007      43      record says 45   (44 findings over 43 distinct packs)
of those, untracked                 43      record says 43   — but now that is ALL of them, not 43 of 45
untracked pack directories          43      record says 42
```

None of this changes the finding the paragraph exists for, and the 47 / 49 / 48 sequence still verifies at
43 untracked packs — which is the paragraph's own point, that the deltas travel and the absolute does not.
It is filed because the sentence *"An absolute cited without the untracked-pack count beside it, and the
date it was taken, is not a measurement of anything a reader can reproduce"* is immediately preceded by an
absolute whose untracked-pack count is one round old and which carries no date.

Severity: minor. Traces to: `defect:evidence-accuracy`.

### m4

**Round 19's `m1` was applied and the table it fixed is one row short again, in the commit that certifies
nineteen closed packs.**

§ "When each pack was actually sealed" now runs 1 through 18, which is round 19's finding applied. Round
19's pack was sealed at `6f64a9a1f` — inside this commit window — and there is no row 19. The section
above it says the table *"measures the gap **per round**"* and that *"Both numerator and denominator move
every round; the table is the claim."*

I derived the row by the section's own stated method (`git log --diff-filter=A` per file), and it is not
what the other eighteen rows say:

```text
round  last report at   summary.json at   gap
 19    1fad70cb         6f64a9a1          FOUR COMMITS
```

All three of round 19's reports were added by `1fad70cb` (*"test(guards): terminate every region at any
heading…"*) and its `summary.json` by `6f64a9a1`, with `286e0e1a`, `b9994c19` and `e7c6c5b2` in between —
three of them changes to the subject. Every other row in the table reads `same commit`, and round 13's
reads `none`. **Round 19 is the first round with a real gap and it is the one round the table does not
cover**, in the section whose entire subject is that gap and whose sentence above says the numerator and
denominator move every round.

Graded minor because the seals themselves recompute and nothing is hidden by the omission in the sense the
section cares about — the reports and the seal are both in history. It is filed because the missing row is
the only interesting one, which is not a coincidence a stale table gets to keep.

Severity: minor. Traces to: `defect:evidence-accuracy`.

### A1

**Advisory, and the request's other direct question: the five lessons. All five are now supported by what
happened. That is a real change from round 19, which found two false as written and one misdirecting. The
failure has moved from the text to its application — three of the five were violated by the commit that
rewrote them, and I can name the violation for each.**

I judged each the way my predecessor judged the old set: against the record's own sentences and against
what this round measured.

**Lesson 1 — "a boundary drawn at a reading is a boundary at the reader's limits", with the
one-directionality removed. Supported, and this round adds five more counter-examples in the inward
direction.** The rewritten line now carries its own refutation (*"The correction does not always move
outward, and believing it does is itself a defect"*) and cites the `$GITHUB_OUTPUT` false refusal and
round 19's four false reds. Round 20 supplies five more: `B1`'s two true sentences reddened by the corpus
needle, `B4`'s rewrapped true bullet, and `B5`'s two quotations. The lesson predicted this round's findings
before they were made, which is the strongest thing that can be said for a lesson.

**Lesson 2 — "two copies of a rule diverge". Supported, and violated by its own commit for the third
consecutive round.** The rewrite adds a prescription the earlier version lacked: *"the check that applies
it is: after fixing a rule, grep for the rule."* That check was not run on the commit that added it.
`isQuotation` was extracted to end the blockquote divergence and `BULLET`, sixty lines from the import in
the importing file, still decides it the other way (`B5`). `WORDS` gained hyphenated keys with a docstring
explaining why, and the alternation built from those keys in the same commit truncates them (`m2`). Two
greps, two hits, neither performed.

**Lesson 3 — "a guard's region and its needle are two claims". Supported, and the round shows the axis it
does not yet cover.** Round 19's evidence for the rewrite reproduces: four of my five guard findings are
needle defects over regions I measured and found correct. What round 20 adds is that the region repair
also has two directions — `M1` is a region defect created by the repair that widened every region
terminator, false-red in one direction and false-green in the other. The lesson says the region and the
needle are two claims; the sentence it is missing is that each of the two is itself two-directional, which
is lesson 1 applied one level in.

**Lesson 4 — "correcting a record in place costs following the correction to whatever cites it". Supported,
the numeral is gone, four instances are named — and the commit that named them created the fifth.**
`M3`: the `--profile full` figure was corrected in § "The full profile" and left at `## Commands executed`,
the two sections then stating 49 and 48 about the same working copy.

**Lesson 5 — "'I cannot settle this' needs the evidence any other claim needs". Supported as written, and
misquoted where it is invoked.** The rewrite is correct: it drops "the one time", names the four places
this record defers, and states that each of them is a deferral WITH its evidence. What it does not say is
anything about tidy summaries — and that is what gap 10 and the commit message both cite it for (`M2`).
Applied properly, lesson 5 is the standard gap 10 fails rather than the licence gap 10 claims.

**One structural observation about the section, advisory only.** Every lesson now carries its
counter-example, which makes the section honest and makes it long — five lessons in about seventy lines,
of which the lessons themselves are five sentences. The record's stated purpose for the section is that
"eighteen rounds' conclusions stop being re-derived". A reader who needs the conclusion has to read the
history to find it. That is a presentation judgement rather than a defect and I am not asking for a change.

Severity: advisory. Traces to: `none` — this asserts no obligation; it is the answer to a question the
brief asked, and the concrete violations it names are filed as `B5`, `M1`, `M3`, `M2` and `m2`.

### A2

**Advisory — scope, and what I did not audit.** The request set my emphasis at §4 and §5 and I spent the
round there. I did not audit §1 (the bash oracle's soundness, its skip behaviour, or the correctness of its
34 rows), §2 (the lexer's twelfth spelling and the `pendingData` bookkeeping) or §3 (the init surface's
fifth route and the executable-bit claim); `implementation-reviewer` and `qa-gatekeeper` own those in this
round's routing. Where §1 touches my domain I note only that the record's
*"34 decorations executed under bash — 25 live, 9 inert"* is a count I did not re-derive, and where §3
touches it, `B6`'s first failure is a sibling reviewer's live plant in the shipped init tree rather than
anything the record states.

**Not a blocking finding, per the drift protocol's reviewer-originated-obligations clause.** `M2` argues
that the real shape of gap 10 is a contract gap — the matrix and its guard both key justification on `❌`,
so a `⚠️` cell cannot be justified by construction. Changing that contract is a product obligation nobody
upstream asked for, and I am not requiring it. What I require in `M2` is only that the paragraph state a
count the table holds and stop asserting a universal seven cells refute. If the stage wants the contract
question recorded, it belongs as a Change Request note rather than as work this gate demands.

Severity: advisory. Traces to: `none` — a scope declaration and a non-obligation, per the drift
protocol's reviewer-originated-obligations clause.

## Required gates and residual risks

**Gates run this round**, all at a tree whose `packages/qfai/` and `.qfai/` contents are `2e1d5d9f2`'s:

```text
PASS   the three record guards, 3 files / 28 tests / exit 0   (the gate I can state)
PASS   pnpm ci:lint, eleven members, exit 0
PASS   pnpm check-types, exit 0
PASS   pnpm verify:pack, ok=16 info=2 warning=1 error=0
PASS   vitest --project integration --project unit, 1239 passed | 19 skipped, exit 0
PASS   check-atdd-annotation-ledger.mjs --spec 0017, 9 claim(s) backed, exit 0
FAIL   vitest --project e2e, 1475 passed | 2 FAILED | 16 skipped, exit 1   (B6; one of the two is a
       sibling reviewer's in-flight plant, the other is this stage's carrier test)
FAIL   validate --profile atdd --fail-on error --spec 0017, error=1  (known, recorded, QFAI-ATDD-112)
FAIL   validate --profile full, error=48 at this pack state  (known, recorded, and the rule verifies)
```

**Residual risks.**

1. **The e2e leg is the required one and it is red.** `B6` is the first time in this stage's record that
   the block certifying `exit 0` and the run disagree on the verdict rather than on a count. Until it is
   diagnosed, no gate line in `## Commands executed` can be taken as re-run, because the sentence above
   them claims all seven were.
2. **The four guards are still the only instrument between this record and the class of defect they exist
   to catch. Of my 32 plants, 8 that should have reddened were green and 7 true records were reported as
   wrong.** The greens are `B1`'s two (a wrong corpus size at the fourth site, and that site deleted),
   `B3`'s two (a one-word reason, and a reason asserting the cell is untested), `B4`'s two (a raised score
   behind a line break, and one without backticks), `M1`'s one (a phantom class C member behind a fenced
   comment) and `m1`'s one (the capitalised-header decoy).
3. **Both directions have live examples again, and there are now seven of them.** `B1` reddens on two true
   sentences, `B4` on a rewrapped true bullet, `B5` on a blockquoted and a fenced quotation, `B2` on the
   record's own documented way of adding a fifth corpus-size statement. Round 18's `M1` — that a guard
   which reddens on the honest edit teaches the stage to write the dishonest one — is unresolved for the
   third round and is wider than when it was filed.
4. **A second writer and two sibling reviewers are on this branch.** `packages/qfai/assets/init/.qfai/assistant/bootstrap`
   appeared, vanished and reappeared in `git status` while I worked, and it is inside the shipped init tree.
   Every count in `## Final status` and § "The full profile" is a property of a tree three agents are
   writing to, which is why I measured each of them twice and said which pack state each value belongs to.
5. **`recordProse.ts` is outside the retracted-claims scan** (`M4`). Nothing that gets written into the
   stage's newest prose file is reachable by the instrument whose subject is stale prose.

## Plant ledger

**32 plants** — 19 against `.qfai/evidence/atdd-spec-0017.md` and 13 against
`.qfai/evidence/coverage-depth-spec-0017.md`: 11 on the Delta Rejected Guard tie, 8 on the corpus-count
guard, 4 on the class C roster, 6 on the depth-score pin, and 3 on the blockquote / fenced-heading
region questions. Each was written over a copy taken first and restored from `tmp/r20cr/backup/`; the harness
re-verifies the md5 against the backup after every run and aborts if a restore does not reproduce it.
Nothing under `packages/qfai/**` was modified — deliberately, because two sibling reviewers are running
against those files right now. `.qfai/report/validate.log` and `validate.spec-0017.json` were rewritten by
the two validate runs and restored from `tmp/r20cr/reportbak/`; `git status --porcelain .qfai/report/` is
empty. The `run-*` directories my validate runs produced are gitignored regenerable output and I left them
rather than risk deleting a concurrent session's. All scratch is under the repository-root `tmp/r20cr/`.
Nothing was committed.

- Revision at finish: `2e1d5d9f2` (`git rev-parse --short HEAD`). **The subject did not move under me**,
  and both records are byte-identical to the backups I took at the start (md5 verified).
- The three record guards re-run after the last plant: **3 files, 28 tests, exit 0.**

## Verdict

**REVISE.** Six blocking (`B1`-`B6`), four major (`M1`-`M4`), four minor (`m1`-`m4`), two advisory
(`A1`, `A2`).

`PASS` is not available, and the reason is not that the round achieved nothing. The Delta Rejected Guard
tie is repaired in both directions and I could not break it on its own terms; round 19's `B5`, `B6`, `M2`,
`m1`, `m2` and `m3` are all applied and I re-verified each rather than reading the commit messages; the
five lessons are, for the first time, all supported by what happened; the `--profile full` rule and its
47 / 49 / 48 sequence reproduce in both directions; and the `## Final status` split — the one figure the
record says is not derivable — I derived by hand and it is right. That is more than any previous round of
this stage has been able to say.

The rework list, in the order I would take it:

1. **`B4` and `B1` share one repair and it is not another spelling.** Both read the wrong UNIT. The
   depth-score pin reads a line of a hand-wrapped document; the corpus needle reads within forty characters
   of a noun. `retractedClaims.test.ts` already solved the unit problem for this record — it collapses the
   document and searches the collapse. Use that reader for both. Doing so also makes `B4`'s direction-A
   half go away, because a rewrapped bullet flattens to the same string.
2. **`B5` and `m2` are one grep.** Decide, in `recordProse.ts`, what a shown line is — blockquote AND
   fence, which is what `flattenDocument` already needs — and make `BULLET`, `inClassCSection` and the
   score pin read it. Then run the check lesson 2 now prescribes: grep for every other place the rule
   lives, including `WORDS`'s hyphen rule, which reached one of its two consumers.
3. **`B3`** — a keyword is not an argument. The cheapest thing that is: require the reason to state what
   the cell measures AND to contradict the two classes it is not (class A's missing surface, class B's
   missing harness, and "untested", which is what class C means it is not). Or accept that no regex
   decides this and replace the pin with a hash of the reason, so changing one is a review.
4. **`B2`** — take the site count out of `NOT_THE_TOTAL`. The exemption for the sentence the guard reads
   `SITES` from should be the sentence's stable prefix (`corpus size appears`), not the whole sentence
   including the numeral, or the record cannot state a fifth site.
5. **`B1`'s missing site** — the fourth stated corpus size has no noun within forty characters. Either
   widen the third needle to the sentence, or require the number of sites to equal the number of
   OCCURRENCES of the corpus value in the section, which is the quantity the record's sentence is actually
   about and which no double count can satisfy.
6. **`B6`** — diagnose the parallelism carrier before anything else in `## Commands executed` is re-dated.
   The block's own sentence says every line was re-run; one of them exits 1.
7. **`M2`** — fifteen, not sixteen; drop "carry no reason anywhere" and name the eight that carry nothing;
   and stop citing lesson 5 for the tidy-summary argument, which lesson 5 does not make.
8. **`M3`** — one figure, two sites. Follow the correction, or state the profile figure in one place and
   cross-reference it.
9. **`M1`, `M4`, `m1`, `m3`, `m4`** — a fence-aware terminator, the `GOVERNANCE ⊇ TRACKED + HELPERS` tie,
   an `i` flag, four re-measured pack-tree numbers with a date, and one table row.

Against the 28-test baseline I ran **32 plants**: **8** that should have reddened were green, and **7**
true records were reported as wrong.
