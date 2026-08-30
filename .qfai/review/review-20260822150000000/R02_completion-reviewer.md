# R02 — completion-reviewer, round 18, spec-0017 (stage gates only)

- Revision at start: `0f61ad2f`
- Revision at finish: `0f61ad2f` (recorded again at the end of this report)
- Emphasis per the request: **§4 (the four rescoped guards)** and **§5 (the record)**
- Verdict: **REVISE**

## Gate that passed

`pnpm -C packages/qfai exec vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts
tests/assets/coverageDepthMatrix.test.ts tests/assets/retractedClaims.test.ts` — 3 files, 28 tests,
exit 0, at `0f61ad2f` with a clean tree. Every plant below was measured against that baseline and
restored from a copy taken before the plant; `git status --porcelain` is empty at start and at finish
and each planted file was diffed against `git show HEAD:<path>` afterwards.

Independently re-measured, all agreeing with the record:

| claim | measured |
| --- | --- |
| `test:e2e` 1446 passed / 16 skipped | 1446 / 16, exit 0 |
| `--project integration --project unit` 1219 / 19 | 1219 / 19, exit 0 |
| `e2e callsites at this tree: 882` | 882 |
| scoped gate `info=2 warning=0 error=1` on eight TCs | identical; the eight are TC-0017-0016/-0030/-0032/-0033/-0034/-0035/-0069/-0070 |
| the eight are 6 `blocked` + 2 `todo` | `tdd/test-list.md:54,68,70-73` blocked; `:107-108` todo |
| eighteen packs, 47 responses, 46 REVISE + one PASS | 18 packs, 47 reports over closed packs, exactly one PASS (`review-20260821080000000/R04`) |
| unscoped `QFAI-ATDD-111` = 11 US across four specs, none this spec's | confirmed from the run |
| unscoped `QFAI-ATDD-112` = 15 TCs across four specs, 8 this spec's | confirmed; the seven others are all `todo` in their own ledgers |
| the `revision_form` correction states the contract | confirmed — see `A1` |

**No subject movement observed.** The tree did not move under me this round.

## Plant hygiene

I planted only in `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
and `packages/qfai/tests/assets/retractedClaims.test.ts`, always via
copy-first / write / run / restore-from-copy, never `git checkout`. Nothing was planted under
`packages/qfai/assets/init/root/**` — that is `qa-gatekeeper`'s partition. `.qfai/report/validate.log`
was rewritten by the two `validate` runs and restored with `git show HEAD:<path> > <path>`.

## Section 4 — the four guards, broken again in both directions

All four are still breakable. Three of the four break in the round-17 shape verbatim: **the check
reads a wider region, or accepts a wider spelling, than the claim it makes.** The fourth traded one
hole for another. Each break below was executed, not read.

### B1

**The corpus-count guard's region is 186 lines and spans three level-2 headings, and its needle got
narrower in the same repair. Both directions demonstrated.**

`packages/qfai/tests/assets/stageEvidenceCounts.test.ts:297-320` scopes the check by
`prose.lastIndexOf("### ", …)` and `prose.indexOf("\n### ", …)`. Extracted from the file's bytes and
evaluated against the record, that region is:

```text
region start line 985   ### The twenty-agent sweep, and where the boundary moved
region end   line 1170  ### What the writer must change in the same edit
  LEVEL-2 HEADING INSIDE REGION at line 1112 : ## Test volume estimate
  LEVEL-2 HEADING INSIDE REGION at line 1122 : ## Coverage obligations checklist
  LEVEL-2 HEADING INSIDE REGION at line 1137 : ## Ledger rows advanced
```

`"\n### "` does not match `"\n## "`, so the slice runs past every level-2 heading until the next
level-3 one. The record's own claim (`atdd-spec-0017.md:1048`) is scoped to "this section", which ends
at line 1111. The repair's stated purpose — *"a true sentence added in a different section reddened a
row whose own claim is scoped to one. A claim about a section is checked over that section"* — is not
achieved for any section boundary below level 3, which is every boundary that actually follows it.

**Direction A, a legitimate edit that fails.** Planted one true sentence — the corpus size, correct at
38 — into `## Test volume estimate`, 64 lines outside "this section":

```text
The 11 `Unit` rows owe nothing here (`L1` has no mandated directory). The unit lane also carries the
sweep corpus, which is 38 mechanisms.
```

Result: `expected 5 to be 4`, row red. The record's own sentence stays true; the guard does not.

**Direction B, a wrong record that passes.** Planted two false statements of the corpus size *inside
the section the claim is about*, in a spelling the four alternations do not reach:

```text
The sweep pinned 29 escape mechanisms in all, and 29 of the corpus refused.
```

Result: exit 0, green. Two wrong numbers, in the section, and the record's own
"appears four times in this section" is now false at six.

**And this is a regression the repair introduced.** At `1d7c0c3f` the needle was
`/(\d+)(?:\s+\S+){0,3}\s+mechanisms?\b/` — which matches `29 escape mechanisms`. Round 17 narrowed it
to `/(\d+) mechanisms?\b/` (immediate adjacency) *and* narrowed the region, so the plant above was
caught by the pre-repair guard and is invisible to the post-repair one. The comment three lines up
still reads "So this reads EVERY numeral adjacent to the word"; it now reads only the numeral
immediately abutting it.

Severity: Blocking. Traces to: `defect:test-oracle` — a derived-count guard that is green over two
wrong numbers inside its own declared scope, in the file whose whole subject is numbers the tree does
not hold.

### B2

**The Delta Rejected Guard tie is defeated by a tilde-fenced decoy table. Fourth version, fourth time
a fenced sample satisfies a check about the real table.**

`stageEvidenceCounts.test.ts:229` strips fences with `/^```[\s\S]*?^```/gm` — backticks only. The same
stage's `retractedClaims.test.ts:357` already carries the lesson: *"Tildes as well as backticks: a
`~~~` fence is a fence, and stripping only one of the two delimiters made the tilde form invisible to
the exempt-span scan."* Line 234 then takes the **first** `| artifact ` in the surviving text.

Plant: copy the real table into a `~~~text` fence placed immediately above it, and **delete** the
`tests/assets/retractedClaims.test.ts` row from the real table.

- negative control (delete the row, no fence): red, `expected [ Array(1) ] to deeply equal []`
- with the tilde-fenced copy above it: **exit 0, green**
- indented backtick fence: red (rows indented two spaces stop matching `^|`), so that route is closed

The row this guard exists to force — "reasons about every artifact added since" — can be absent from
the table while a fenced sample stands in for it. That is the exact failure the comment at
lines 226-233 says was closed twice.

Severity: Blocking. Traces to: `defect:test-oracle`.

### B3

**Class C's roster checks that a cell's coordinates appear in the paragraph. It does not check that a
reason is attached to them, which is what the class exists for. Three plants pass.**

`coverageDepthMatrix.test.ts:374-390` narrows the search to class C's own paragraph — a real
improvement over round 17 — and then asks only whether the string
`` `US-0017-NNNN` × `Column` `` occurs anywhere in that paragraph. The assertion message is *"a class C
cell the record does not name **with its own reason**"*, and the check has no model of a reason at all.
The comment two blocks up says each member's reason "is checked by the naming rule below". It is not.

All three of the following are green at `0f61ad2f`
(`pnpm exec vitest run --project e2e tests/assets/coverageDepthMatrix.test.ts`, 5 tests, exit 0):

1. **reason deleted, coordinates moved into the class narrative.** Removed the whole
   `` `US-0017-0001` × `Boundary values` `` bullet and its four-line reason, and added the coordinates
   to the "This class has been written three ways" paragraph as a historical aside. The member now has
   no reason under the class that claims it. **Green.** This is round 17's own finding — a member's
   reason moved out from under it — reproduced one region smaller.
2. **reasons swapped between the two members.** Kept both coordinate heads, exchanged the reason
   bodies, so `Boundary values` on `US-0017-0001` is justified by "the design has no failure to
   observe" and `Error path` on `US-0017-0007` by "a single shipped value admits no boundary".
   **Green.** That is round 4's finding (swapped reason paragraphs) at member granularity, in the block
   whose comment says round 4's break is what the body-phrase check exists to stop.
3. **coordinates with no reason at all.** Replaced the bullet with the bare line
   `` - `US-0017-0001` × `Boundary values` ``. **Green.**

Severity: Blocking. Traces to: `defect:test-oracle` — the roster was adopted precisely because
"inapplicable by the design" cannot be decided by a predicate and only a justified list can carry it;
a list that does not require the justification is the computable property again under a new name.

### B4

**The depth-score pin anchors on `^- `, which is one of at least four legal spellings of a markdown
list item. Three of them carry a contradicting score straight through.**

Extracted from the file's bytes and evaluated (`coverageDepthMatrix.test.ts:572`):

```text
template bytes  : "^- \*\*${column} \`([^\`]+)\`\*\*"
regex source    : "^- \*\*COL `([^`]+)`\*\*"
compiled        : /^- \*\*COL `([^`]+)`\*\*/gm
    exact bold bullet    true
    unbolded mention     false
    nested bullet        false
    blockquoted bullet   false
    asterisk bullet      false
```

The doubled escape is correct here — `\*` in the template is an escaped asterisk, and this confirms
round 16's third fix holds. The problem is the anchor. Planted, each on its own, directly above the
true `Error path` bullet in `### US-0017-0007`, each raising the cell to the score the table does not
give it:

- `* **Error path `✅`** …` (asterisk list marker) — **green**
- `  - **Error path `✅`** …` (two-space nested bullet) — **green**
- `> - **Error path `✅`** …` (blockquoted bullet) — **green**
- tab-indented `- **Error path `✅`** …` — **green**

Control: the same bullet at `^- ` reddens with *"the section states it 2 times"*, so the multi-bullet
half of the round-17 repair does work — for exactly one spelling. The pin's own comment says *"a
section that states one column's score twice is exactly the state this pin exists to catch"*; four
spellings of that state are not caught, and the record already names this failure class in its own
words about the pack-count pin: **a pin whose needle is a closed enumeration cannot be falsified from
outside that enumeration.**

Severity: Blocking. Traces to: `defect:test-oracle` — the one guard over over-claiming in the
governance record admits an over-claim written in three ordinary markdown spellings.

## Section 5 — the record

### B5

**`--profile full`: the rule is right and the sealed value 48 is right. The table that decomposes the
48 sums to 49, and the sentence that explains why it is 48 inverts the measurement.**

Measured at `0f61ad2f`, working tree clean, `validate.log` restored afterwards:

```text
counts: info=4 warning=403 error=50
     44 [error] QFAI-REVIEW-007
      2 [error] QFAI-REVIEW-005      review-20260822150000000, review-20260821200000000
      2 [error] QFAI-REVIEW-004      review-20260822150000000, review-20260821200000000
      1 [error] QFAI-ATDD-112
      1 [error] QFAI-ATDD-111
```

**The rule holds.** `atdd-spec-0017.md:2446-2448` states "48 with the current round sealed, 50 at a
revision that has just opened a pack, 49 once reports land in it and before a `summary.json` does."
`0f61ad2f` has just opened a pack and measures **50**. Landing reports clears `-005` for the new pack
(49); adding `summary.json` clears `-004` too (48). Every step checks out.

Two things do not:

1. **The table under "The forty-eight" sums to 49.** `atdd-spec-0017.md:2467-2473` gives
   `-007 44, -004 2, -005 1, ATDD-111 1, ATDD-112 1` = **49**, under a caption that says forty-eight.
   It also matches neither state: at 48 the composition is `-004 1 / -005 1`; at the measured
   revision it is `-004 2 / -005 2`. The one number in this block that is *supposed* to be
   decomposable is decomposed wrongly.
2. **"It is sealed now, which is why the count above is 48" is backwards.**
   `atdd-spec-0017.md:2497-2504` says `-004`/`-005` are against an unsealed pack, identifies it
   correctly as round 13's abandoned one, and then asserts it is fixed. It is not.
   `.qfai/review/review-20260821200000000/` holds `review_request.md` and nothing else — no
   `Rxx_*.md`, no `summary.json` — and it is one of the two packs named in **both** `-004` errors and
   **both** `-005` errors above. "Sealed" in this record means a sha256 recorded at
   § "Review packs and their seals"; that is not what `QFAI-REVIEW-004/005` read, and the record's own
   seals block says so plainly at `:2681` ("Closed with a request and no reports"). Round 13's pack is
   not the reason the count *fell* to 48 — it is the reason the floor is 48 rather than 46, and the
   record says elsewhere it will never clear ("a pack that clears itself never").

Round 17's finding on this exact sentence was that it misattributed the packs. The correction found
the right pack and then asserted an outcome it did not measure — the same one-step-short repair the
paragraph three sections up describes about itself ("the `--profile full` figure was measured before
the repair that changed it").

Related, and folded in rather than filed separately: `### P7 quality gates` opens with **"These
numbers are measured at the working tree of this commit"** (`:2043`) and its fenced block records
`error=48` (`:2094`), which by the record's own rule is not this commit's value. The `with the round
sealed` qualifier discloses it, so this is a framing defect rather than a false number — but the
block's opening sentence is the one that six rounds of findings put there.

Severity: Blocking. Traces to: `defect:evidence-accuracy` — a decomposition that does not sum to its
own caption, and a stated cause contradicted by the run the same section cites.

### M1

**Four legitimate edits that redden a section-4 guard.** The request asked for both directions; these
are the reverse of B1-B4 and each was executed and restored.

| plant | guard | result |
| --- | --- | --- |
| a **true** corpus-size sentence ("38 mechanisms") added to `## Test volume estimate` | corpus count | red, `expected 5 to be 4` |
| the Delta row's path spelled `packages/qfai/tests/assets/retractedClaims.test.ts` — the spelling `TRACKED` itself uses | Delta tie | red, "does not reason about" |
| the same row's cell annotated `` `tests/assets/retractedClaims.test.ts` (round 3) `` | Delta tie | red, same |
| class C's reason reworded to "the `Boundary values` cell of `US-0017-0001` — …" | class C roster | red, "does not name with its own reason" |
| a **true** historical sentence in class C's paragraph naming the cell round 15 misfiled | class C roster | red, "a class C reason for a cell the table does not put in class C" |
| the superseded `Error path` bullet quoted inside a ```` ```text ```` fence in the row's section | depth-score pin | red, "the section states it 2 times" |

The last two matter most. The record is required — by this stage's own retracted-claims discipline —
to keep refuted wordings on the page in quoted or fenced form. Two of these guards forbid exactly
that inside the regions they own: the depth-score pin has no fence model, and class C's reverse-orphan
check forbids naming any non-member cell in the class's paragraph. That is a second instance of the
conflict the record already documents from round 6 ("the pin was in **direct conflict** with
`retractedClaims.test.ts` … One rule, one instrument"), and it is unresolved.

Severity: Major. Traces to: `defect:test-oracle` — a guard that reddens on the honest edit teaches the
stage to write the dishonest one, which is how the depth-matrix guard held the record stale for a
whole round (its own comment, `coverageDepthMatrix.test.ts:605-608`).

### M2

**Option 2's disposition is right in substance and self-contradictory in form: the section forbids
leaving a bare "No RE-OPEN is required" standing, and then leaves one standing five lines later.**

The substance first, because I checked it rather than taking it:

- the mandatory rule (`constitution/shared-skill-operating-baseline.md:110-113`) is *do not reintroduce
  a rejected option*. Option 2 is not reintroduced: `TDD-0069` is `todo` with `Blocked-By: -` at
  `tdd/test-list.md:107`, no gate was narrowed, no waiver exists in `.qfai/waivers.yml`, nothing merged;
- the third ground round 17 refuted is refuted correctly. I re-derived it: `QFAI-ATDD-112` unscoped
  names 15 TCs; the seven outside spec-0017 are `TC-0003-0032`, `TC-0008-0015`…`-0018`, `TC-0015-0035`,
  `TC-0015-0036`, and **all seven are `todo`** in their own ledgers; spec-0017's eight are 6 `blocked`
  + 2 `todo`. So an exemption for a spec's in-flight rows does clear the rule outright;
- recording "the rejection is unsupported, not that option 2 is right", and handing it to the CR's
  owner, is more than the rule requires and is the correct call. The CR itself carries the same
  disclosure at its "Open as of 2026-08-22, after round 17" block. **I am not asking for a re-opening.**

What is owed is one line. `atdd-spec-0017.md:141-144` says, in the stage's own words:

> this stage may not re-open it, and it may not leave a `No RE-OPEN is required` standing on three
> grounds that are gone.

and `atdd-spec-0017.md:150`, five lines below it and closing the same section, reads:

> **No RE-OPEN is required.**

unqualified. A reader who takes the section's closing verdict at face value gets the opposite of the
bullet above it. This is the correction-does-not-follow-itself pattern the same round wrote up twice
(`:2435-2440`, `:146-148`), landing inside the paragraph that names it.

The fix is a qualifier on `:150` — that no `09_delta.md` or `07_Decisions.md` rejected option is
reintroduced, and that `CR-20260820-0012` option 2's rejection is recorded as unsupported and handed
over — not a re-opening and not a new ground.

Severity: Major. Traces to: `defect:evidence-accuracy`.

### M3

**The round-17 write-up says three guard repairs failed where four did, and the one it drops is the
depth-score pin — the guard `B4` above shows is still the weakest of the four.**

`atdd-spec-0017.md:2425-2427` reads "**Three of round 16's guard repairs failed again, all in one
shape**" and enumerates the corpus count, class C's roster and the Delta tie. `6ab7b11c` repaired
**four**: its own message lists the same three plus *"and the depth-score pin read only the first
bullet, so a second contradicting one passed"*, and `git diff 1d7c0c3f 6ab7b11c --
tests/assets/coverageDepthMatrix.test.ts` shows both hunks — the class C narrowing at `:370` and the
`.exec` to `matchAll` change at `:565`. This round's own request also says four.

This is the tally-of-the-measurements defect the record names about itself at `:2526-2529` ("counted
that family as four where it holds seven, and omitted the `W` family and the sweep entirely — a tally
of the measurements, wrong about the measurements, in the section that certifies them"), one section
along and one round later.

Severity: Major. Traces to: `defect:evidence-accuracy`.

### m1

**The `GOVERNANCE` self-exclusion: the reason is now measured, and the measurement subtracts a
deduplicated claim count from a raw occurrence count. It also names two instruments where three fire.**

`retractedClaims.test.ts:85-90` replaces round 16's unrun claim with: *"round 17 measured 118 of 124
occurrences already reading as quoted, and six that do not. Those six are this file's own commentary
… and two of the instruments that would read them cannot be satisfied by quoting at all, because
`COUNTED_CLAIMS` has no quotation model."*

I measured it with the file's own `occurrences()`, by adding the file to `GOVERNANCE` and a reporting
`it()` (both restored):

```text
PROBE self-occurrences=126 quoted=112 unquoted=14
```

126 occurrences, **112** quoted, **14** unquoted — across **6 distinct claims**, which is what the
guard's own de-duplicated failure list reports and is where the "six" comes from. `124 - 6 = 118` is
the arithmetic behind the recorded sentence, and it subtracts claims from occurrences. Only one
`RETRACTED` entry has been added since `6ab7b11c` (`four of the eight are refactor in the ledger`),
which accounts for `124 -> 126` and cannot account for `6 -> 14`.

The conclusion — **exclude the file** — is right, and I am not asking for it to change. What is wrong
is the number offered as the measurement, in the one guard whose subject is numbers offered as
measurements.

Three instruments fire, not two. The same run reports, beyond the six claims and the two
`COUNTED_CLAIMS` failures:

```text
AssertionError: an entry declared retired that the records still carry:
  expected [ 'P1d has run three times', …(2) ] to deeply equal []
```

All three `RETIRED` entries appear in this file's own prose, and `RETIRED` membership means "absent
from every governance file" — a rule that quoting cannot satisfy either. The recorded reason names
`COUNTED_CLAIMS` and stops.

Severity: minor. Traces to: `defect:evidence-accuracy`.

### m2

**`## Round 1` A3 carries a duplicated phrase and a count two rounds stale, inside the bullet about
counts that go stale.**

`atdd-spec-0017.md:492-493`:

```text
The verdict split is not derivable (two of
two of thirty-five reports state a verdict in a parseable form), so what is pinned is the arithmetic
```

"two of two of" is a doubling. And the figure is wrong: over the 18 packs in the guard's own scope
there are 48 report files, **17** of which state `**Verdict: PASS|REVISE**`. The sibling statement in
`stageEvidenceCounts.test.ts:640-642` says "two of twenty-nine", also stale. The claim the parenthetical
supports — that the split is not mechanically derivable — still holds, so this is the number and not
the reasoning.

Severity: minor. Traces to: `defect:evidence-accuracy`.

### m3

**A claim round 15's widening refuted, still standing in two places, and no needle reaches it.**

`atdd-spec-0017.md:480` and `retractedClaims.test.ts:330` both read, in the present tense:

> `GOVERNANCE` holds records and not the guards that read them.

`GOVERNANCE` has held guards since round 15 and holds twelve non-`.qfai` source files now
(`retractedClaims.test.ts:71-97`), including three `tests/assets/*.test.ts`. Round 15's own entry in
this record is that widening. Both sentences sit in passages *about* stale prose claims; the record's
copy is framed as round 10's history, which is why I grade it minor rather than major, but the clause
is written as a present property of the constant and is false as one.

This is the item the request asked me to re-grep for. I re-searched every `RETRACTED` needle
(extracted from the guard's own bytes, flattened by the guard's own rule) across all 4250
`.md`/`.ts`/`.mjs`/`.js`/`.json`/`.yml` files in the repository. Outside `GOVERNANCE`, review packs
and the guard file itself, the only genuine hits are the two in `tdd/test-list.md:107-108`
("`NOT BLOCKED by a CR`" x2, "`becomes implementable once the pull request has three green`"), and
those are correctly excluded and **are** named in the handover at `atdd-spec-0017.md:1177-1189` with
all three refuted phrases quoted. Everything else was a false positive
(`three packs` in `09_delta.md:48` and `_policies` means spec packs; `no filters` in
`_policies/08_Decisions.md:1827` is an unrelated rejected option). So the needle set itself is in good
order this round; what escapes it is the sentence above, which is nobody's entry.

Severity: minor. Traces to: `defect:evidence-accuracy`.

### A1

**Advisory, and the answer to one of the request's questions: the `revision_form` correction states the
contract accurately.**

`atdd-spec-0017.md:2484-2495` says
`references/review-artifact-layout.md` "settles the field in one sentence: `revision_form:
"content-hash"` with `revision` given as a git rev or `working-tree+<content hash>`", and that a short
commit sha is the first of those two forms.

`.qfai/assistant/skills/qfai-implement/references/review-artifact-layout.md:24-29` reads exactly that:
`revision_form: "content-hash"` and `revision` — "as a git rev or `working-tree+<content hash>`" — with
`"legacy"` the only alternative and only when corroborated by `.qfai/review/.legacy-packs`. The
two-form choice attaches to `revision`, not to `revision_form`, which is what the record says. All 16
of this stage's packs that carry a `summary.json` use `revision_form: "content-hash"` with a short sha
in `revision`. Nothing owed here; recorded because the request asked.

Two advisories that are not blocking and that I am not asking to be fixed this round:

1. **`CLASS_C_ROSTER` has no orphan check of its own.** `coverageDepthMatrix.test.ts:305` is a literal
   `Set`, and the two directions checked are table-vs-prose. A roster entry for a cell that has left
   class C is reported by neither: the roster is only ever read through `PROPERTIES.C`, which is a
   membership test. Round 17 gave the shape pins orphan reporting "in both directions"; the roster is
   the same shape and did not get it.
2. **The Delta tie checks presence, not reasoning.** `stageEvidenceCounts.test.ts:240` accepts any row
   whose first cell is the backticked path; `| `tests/x.ts` | | |` satisfies it. That is a disclosed
   limit rather than a defect, but the assertion message says "reasons about", which is stronger than
   what runs.

Severity: advisory. Traces to: none (no obligation asserted).

## Verdict

**REVISE.**

Rework list, smallest first:

1. `M2` — qualify `atdd-spec-0017.md:150` so the section's closing verdict does not contradict the
   bullet four lines above it. One sentence.
2. `M3` — `atdd-spec-0017.md:2425` says three; it was four. Name the depth-score pin.
3. `m2` — `atdd-spec-0017.md:493`: delete the duplicated "two of", and re-measure the figure (17 of 48)
   or drop the numeral, as § "Findings per round" already did for the same reason.
4. `m1` — restate the self-exclusion measurement as what was measured (112 quoted / 14 unquoted
   occurrences over 6 distinct claims at this revision), and name the third instrument, `RETIRED`.
5. `m3` — `atdd-spec-0017.md:480` and `retractedClaims.test.ts:330`: the clause about `GOVERNANCE` is
   false since round 15; either scope it to round 10 or delete it.
6. `B5` — fix the decomposition table so it sums to its caption, and replace "It is sealed now, which
   is why the count above is 48" with what the run shows: round 13's pack still contributes one
   `-004` and one `-005`, and that is why the sealed floor is 48 rather than 46.
7. `B1`-`B4` — the four guards. The common repair is the same one three rounds have half-made: stop
   choosing the region and the spelling by enumeration.
   - `B1`: end the region at the next heading of level 2 **or** 3, and restore the pre-`1d7c0c3f`
     needle width (a numeral within a few words of the word) now that the region is honest.
   - `B2`: strip `~~~` fences as well as ```` ``` ```` ones — `retractedClaims.test.ts:357` has the
     one-line fix already written.
   - `B3`: require the coordinate pair to **head a bullet with text after it**, not merely to occur in
     the paragraph, and pin one distinguishing phrase per member the way `BODY_PHRASE` does per class.
   - `B4`: accept `-`/`*`/`+` markers at any indentation, and either strip fenced regions from
     `rowSection` or accept a fenced occurrence as a quotation, so `M1`'s honest edit stops reddening.
8. `M1` — decide the fence conflict once. Two instruments currently disagree about whether a quoted
   superseded claim is allowed inside a region, which is the round-6 finding the record says it settled
   with "one rule, one instrument".

None of the above asks for an obligation the product did not already have: every item is either a
number the record states and the tree does not hold, or a guard that is green over the state it exists
to refuse.

- Revision at finish: `0f61ad2f` — unchanged from start. Working tree clean; every planted file
  verified byte-identical to `git show HEAD:<path>`.
