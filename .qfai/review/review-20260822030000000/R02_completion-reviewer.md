# R02 — completion-reviewer, round 14 (spec-0017, `/qfai-atdd` stage gate)

- Reviewer: `completion-reviewer`
- Audit subject: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`,
  and the guards that derive their numbers
  (`packages/qfai/tests/assets/{stageEvidenceCounts,coverageDepthMatrix,retractedClaims}.test.ts`)
- Emphasis: § 4 of the request — the completion contract and the record's honesty
- Revision reviewed: `4d737f3a` at start **and** at finish. HEAD did not move.
- **Verdict: REVISE** — 3 blocking, 4 major, 4 minor, 3 advisory

## Provenance, and one thing that did move

`git rev-parse --short HEAD` = `4d737f3a` at start and finish. `git status --porcelain` was **empty**
at start.

It was not empty later, and neither file is mine. At around 03:05 the tree held:

```text
 M .qfai/report/validate.log
 M packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml
```

The workflow carried a planted `defaults: run: working-directory: ./ci-primer` block; by 03:20 that
plant was gone again. That directory is `qa-gatekeeper`'s partition this round, so the plant is expected
and I did not touch it. `.qfai/report/validate.log` is still dirty — a concurrent `qfai validate`
rewrote a **tracked** file while this round ran. See `A3`; it changes one thing I could not measure.

I planted nothing and restored nothing. I wrote only this file and scratch under
`tmp/r02-completion-round14/`.

## What passed

- `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — **5/5 green**, and the matrix's arithmetic
  reproduces by hand: `✅ 3 / ⚠️ 2 / ❌ 4` cross-tabulates from the table, 34 `❌` depth cells + 4 in
  `Status`, and the class partition (A 23 / B 9 / C 1 / D 1) is complete, disjoint and contains no
  non-`❌` cell. I re-derived every one of those numbers from the table independently.
- **The headline correction is real, both halves.** `.qfai/report/validate.spec-0017.json` (tracked)
  holds `info=2 warning=0 error=1`; the cited run directory `.qfai/report/run-20260822024224027/`
  exists and records `errors: 1, warnings: 0` with `QFAI-ATDD-112` naming exactly the eight TCs the
  record lists (`TC-0017-0016`, `-0030`, `-0032`…`-0035`, `-0069`, `-0070`).
- **The P1d PASS the record leans on exists.** `.qfai/review/review-20260821080000000/R04_qa-gatekeeper-p1d.md`
  states `Verdict: **PASS**` on `9a37421c`, and that pack's `summary.json` carries the matching
  `PASS` row. No review verdict in the record is invented, and round 13's absence is stated honestly.
- **`US-0017-0007`'s restoration is carried by a real effect.** The carrier holds 2 tests, `spawnSync`s
  the runner and reads `peakConcurrency`, and the matrix's `Special values ⚠️` claim ("each measured")
  is backed at `spec0017RunnerParallelismE2E.test.ts:308`. This is not a raised score with no test
  behind it.
- **`ALLOWED_STEP_BODIES`' denominator checks out**: the committed shipped tree has 12 step `run:`
  bodies (4 in `qfai-validate.yml`, 8 in `qfai-tests.yml`) against 12 digests. (Count from
  `git show HEAD:` — the working tree briefly read 13 because of the plant above.)

None of that is a gate. Below is why the stage gate is not passed.

## Blocking

### B1 — Three guard tests are RED at the revision under review, in a required CI leg, and `## Final status` states a round count the disk contradicts

**Severity: blocking. Traces to: `defect:quality-gate`; this skill's DoD (the completion record's own
derived counts).**

Measured at `4d737f3a`, nothing planted:

```text
pnpm -C packages/qfai exec vitest run tests/assets/stageEvidenceCounts.test.ts
  -> Tests 2 failed | 8 passed (10)
     "rounds: record says thirteen, 14 packs on disk"
     "every pack this stage opened must be named":
        expected [...13] to deeply equal [...14]  (missing review-20260822030000000)

pnpm -C packages/qfai exec vitest run tests/assets/retractedClaims.test.ts
  -> Tests 1 failed | 10 passed (11)
     ".qfai/evidence/atdd-spec-0017.md: states Thirteen where the tree holds 14"
```

`tests/assets/**` runs in the `e2e` project, which this record itself names as a required matrix leg
five separate times. So `## P7 quality gates`' line

```text
pnpm -C packages/qfai test:e2e                  1443 passed / 16 skipped, exit 0
```

is **false at this revision**, under a paragraph that says "**These numbers are measured at the working
tree of this commit**". That is not a new failure mode: the same block certified `exit 0` while round
5's gatekeeper measured `test:e2e` exit 1, and the record already writes that up as "the same defect
class this record keeps finding, now about the suite's own colour". It is that defect again.

The cause is that `4d737f3a` created `.qfai/review/review-20260822030000000/` and changed nothing else.
The record has a stated rule for exactly this — "every **closed** pack must carry a seal that
recomputes, and the **in-flight** one must be named without one" — and the new pack satisfies neither
half. Two prose numerals go stale with it: `## Final status`' "**thirteen** rounds" and
§ "Review packs and their seals"' "**Thirteen** packs, one per round". The response count (**35**) and
the split (**34 REVISE and one PASS**) are correct as I write this and stop being correct the moment
this file lands.

This is not the guard being over-strict. The guard is the only reason the record is not simply wrong
and quiet, which is the property five earlier rounds asked for.

**Rework:**

1. Add `Review pack: .qfai/review/review-20260822030000000/ (round 14 — stage gates only)` with
   `Review pack seal: IN FLIGHT — sealed when its last reviewer response lands`.
2. **Seal round 13's pack.** Once round 14 is named, `packs.slice(0, -1)` makes
   `review-20260821200000000` closed, and it currently carries `IN FLIGHT`. It *is* closed — it produced
   no reports and a newer pack exists — so naming round 14 without sealing round 13 moves the failure
   rather than fixing it. (See `m4`: the record says elsewhere that round 13 is "dead rather than open",
   so "IN FLIGHT" is also wrong on the merits.)
3. `thirteen` → `fourteen` in `## Final status`; `Thirteen packs` → `Fourteen packs`.
4. Re-derive the response count and the verdict split after this round's reports land, and re-run the
   `## P7 quality gates` block afterwards rather than carrying its current figures forward.

### B2 — The eight-TC table misstates four ledger rows, and the "honest form" conclusion drawn from it is wrong in both directions

**Severity: blocking. Traces to: `defect:evidence-accuracy`; the handover obligation in
§ "Ledger rows advanced".**

The record's per-row table (§ "`QFAI-ATDD-112` reports **eight** TCs") reads:

```text
TC-0017-0032   CR-20260820-0007  in blocked set    ledger row: refactor
TC-0017-0033   CR-20260820-0007  in blocked set    ledger row: refactor
TC-0017-0034   CR-20260820-0007  in blocked set    ledger row: refactor
TC-0017-0035   CR-20260820-0007  in blocked set    ledger row: refactor
```

Measured against `.qfai/specs/spec-0017/tdd/test-list.md:70-73`, all four rows are

```text
| TDD-0032 | … | blocked | - | CR-20260820-0007 | BLOCKED by CR-20260820-0007. …
```

`blocked`, with the CR in the `Blocked-By` column. Three consequences, in order of seriousness:

1. **The record contradicts its own cross-tabulation.** § "Inputs reviewed" states "**74 `refactor`,
   6 `blocked`, 2 `todo`**", and `stageEvidenceCounts.test.ts` derives that from the ledger and passes.
   The six `blocked` rows *are* `TDD-0016`, `-0030`, `-0032`, `-0033`, `-0034`, `-0035`. If four of them
   were `refactor` the derived tally could not be 6. One file, two answers, and the derived one is right.
2. **The conclusion the section is written to reach is off by one.** "**every uncovered TC has a recorded
   reason somewhere, and for three of the eight that reason is not where the ledger says to look**" — it
   is **two**: `TDD-0069` and `TDD-0070`, the only two of the eight whose `Blocked-By` is `-`. The other
   six point at their CR from the ledger.
3. **The sentence "Four more are `refactor` in the ledger while their CR holds them" names the wrong
   rows and the wrong number.** That state does exist — `CR-20260820-0007`'s blocked set is nine rows,
   and `TDD-0052`, `-0066`, `-0067`, `-0074`, `-0075` are all `refactor` with `Blocked-By: -` — so it is
   **five** rows, none of which is among the eight this paragraph is about. The real finding got
   attributed to rows that had already been fixed.

**And the measurement claim around it is false.** The paragraph says round 12 "measured it per row
against the decision records' `Blocked set:` fields and the ledger's own `Blocked-By` column". The four
rows have been `blocked` since `bc36f08c` (2026-08-20, 285 commits before HEAD) — so they were `blocked`
when that per-row table was written. This is the same class the record names at entry 5/8 of its own
recurring list: a table described as measured that was not re-measured.

**Rework:** re-derive the four `ledger row:` cells from the ledger; correct "three of the eight" to two;
either delete the "four more are refactor" sentence or restate it over `TDD-0052/-0066/-0067/-0074/-0075`
and say plainly that those five are outside the eight. Consider extending
`stageEvidenceCounts.test.ts` to derive this table the way it already derives the cross-tabulation — the
data is in the same two files it already reads.

### B3 — The claims this round's headline correction retracted are still asserted, unquoted, in five more places — including the two sections that certify

**Severity: blocking. Traces to: `defect:evidence-accuracy`; the record's own retracted-claims contract.**

The request asked me to look for "more of that shape". There is more, and it is in the worst places.
Every line below is asserted in the record's own voice at `4d737f3a`, not quoted:

```text
:1022  "- `US-0017-0007` — **not covered**, deliberately. Claim withdrawn; `QFAI-ATDD-111` reports it"
         § "Coverage obligations checklist" — the section that discharges the coverage obligation.

:1213  "It does not clear completion: `US-0017-0007` is uncovered, the scoped gate is `error=2`, the
        unscoped profiles `build` runs need 12 `US` and 15 `TC` across five specs"
         § "P1d's verdict: PASS, at the sixth pass".

:1248  "These two rows, the six `blocked` ones and `US-0017-0007` are why the completion status below
        is `FAIL`"

:2200  "eight of `spec-0017`'s nine `US-*` are covered"   § "Final status"

:2218  "- **`US-0017-0007` is uncovered**, so `QFAI-ATDD-111` reports it and the scoped gate is
        `error=2`;"                                       § "Final status" → "What is not satisfied"
```

Against the record's own § "The scoped gate is `error=1`", its § "`US-0017-0007` is covered", its
Objective ("**All nine are covered**"), the matrix ("**All nine are covered**") and the tracked
`validate.spec-0017.json` (`error=1`, `-111` clear). The correction moved one paragraph and left five.

`:1213` is the sharpest, because it carries **three** refuted figures in one sentence:

- `error=2` — refuted by the re-run this round performed;
- `US-0017-0007` uncovered — refuted by round 12;
- "**12** `US` and 15 `TC` across **five** specs" — this is the exact double-count the record retracts
  by name at `:1692` ("That sentence used to end 'plus `US-0017-0007` makes 12', which was
  double-counting a row already inside the eleven"), and § "The full profile" and Gaps item 4 both say
  **11 US across four specs**. The retracted numeral survived in a second site, which is the failure
  mode § "Ledger rows advanced" describes for a different paragraph ("two copies had drifted apart in
  wording — so every attempt looked for an exact match and found none").

Two more of lower weight, same class: `:891` "`error=2` with the same two findings **reproduces at
HEAD**" (present tense, false at this HEAD) and `:2190` "masked in CI only because the `tdd` step fails
first on `error=2`".

**The instrument built for this cannot see any of them.** `RETRACTED` in
`packages/qfai/tests/assets/retractedClaims.test.ts` holds 22 needles and not one of them is
`US-0017-0007 is uncovered`, `the scoped gate is error=2` or `12 US and 15 TC`. The record's stated
practice is one entry per retraction — "one entry per retraction, at least one per round" is asserted in
that file — and this round retracted a claim without adding it.

**Rework:** rewrite all five sites at the source (not a correction table pointing elsewhere — `:1188`
records what that costs); correct `:891` and `:2190`; and add three needles to `RETRACTED`:
`US-0017-0007 is uncovered`, `the scoped gate is error=2`, and `15 TC across five specs`. Then re-grep,
because two of the five sites are in sections a reader reaches first.

## Major

### M1 — The matrix's declared scoring surface is now false for one of its nine rows, and the list that supports it disagrees with the stage record

**Severity: major. Traces to: `defect:evidence-accuracy`; Coverage Depth Matrix contract.**

`coverage-depth-spec-0017.md:19-21` declares, of every cell in the table:

> Every cell below is scored against **that** surface, not against this repository's own workflows

where "that surface" is `qfai init` into an empty project. The `US-0017-0007` row is scored against
**this repository's own runner** — its carrier spawns the real `rootKnobs` over a fixture in this repo
and never runs `qfai init` — and the row's own justification section says so in as many words ("It was
never about an adopter's tree"). So the file's scope declaration is refuted by one of its own rows, and
a reader who takes the declaration at face value will read that row's `✅`s as adopter-facing.

The supporting list has drifted with it. Three sites, two answers, nothing deriving either:

```text
coverage-depth-spec-0017.md:86   "**Four of the nine stories name the own tree explicitly**"  (0002, 0003, 0005, 0008)
atdd-spec-0017.md:139            "Four of the nine name the own tree explicitly"
atdd-spec-0017.md:250            "Round 1 also recorded that five of the nine stories name the own tree"
```

`:250` says five and names none; `:139` and the matrix say four and enumerate them. On the record's own
current reading of `US-0017-0007` the answer is five and the fifth is `-0007` — which would make `:250`
accidentally right and both enumerations stale.

**Rework:** restate the matrix's scope as "the E2E surface, which is `qfai init` for eight rows and this
repository's own runner for `US-0017-0007`", add `-0007` to the own-tree enumeration in both files (or
say why it is excluded), and make the two numerals agree. This is a good candidate for
`coverageDepthMatrix.test.ts`, which already seeks statements in **both** records.

### M2 — "The rule below reproduces 25 of the 27 numeral-bearing rows" is two rounds stale, in the paragraph whose subject is that counts must be derived

**Severity: major. Traces to: `defect:evidence-accuracy`.**

§ "Findings per round" opens with that sentence and describes it as measured ("Round 11 implemented the
stated rule and ran it over all 27 rows"). The table now holds **33** numeral-bearing rows: rounds 11
and 12 contributed three each after the measurement was taken. So the denominator is wrong and the
numerator was never re-run over the six new rows.

This is the fourth count in this record found stale in a section that certifies, and it is worse than
the others in one respect: it is a claim about a *rule's* coverage, so the reader cannot repair it by
recounting the table.

**Rework:** either re-run the rule over all 33 rows and restate the pair, or delete the numerals and
state the rule plus the two named exceptions — which is what the record does successfully elsewhere
("the count is the list's length").

### M3 — Class C and class D contradict each other on how many `❌` cells are inapplicable, and both class properties are coordinates rather than properties

**Severity: major. Traces to: `defect:evidence-accuracy`; the one-justification-per-cell contract.**

The request asks whether class D is a real class or a bucket. My answer, in two parts.

**The justification is real.** "A malformed worker override does not fail; it falls back to the declared
value, deliberately" is a substantive reason, it is true of the code, and it is not class A's reason
(there is a surface), class B's (no run needed) or class C's (no boundary). D is not invented to keep a
total tidy.

**The class as *stated* is not a property.** `coverageDepthMatrix.test.ts:296` enforces
`column === "Error path" && row === "US-0017-0007"` and requires the prose to say exactly that. A
property that names its single member's coordinates cannot be violated by anything except a different
cell, so the assignment check the round-3 finding introduced is vacuous for C and D both. And C and D
say the same thing about themselves in different words:

```text
:184  (class C) "flagged here because it is the one ❌ in the table that no future work would turn green"
:177  (class D) "This is the second ❌ in the table that no future work on the story itself would turn green"
```

Two paragraphs in one file, one asserting there is exactly one such cell and the other that itself is
the second. That contradiction is the evidence for the structural point: **C and D share a property** —
*the cell is inapplicable by the design, not untested* — and the honest partition is one class with that
property and two members, whose defining test is falsifiable (a member whose absence is a gap rather
than an inapplicability fails it).

**Rework:** either merge C and D into one class stated as a property and fix `PROPERTIES`/`EXPECTED_PROSE`
accordingly, or keep them separate and repair `:184` so the two do not contradict. Do not leave the
count claim in `:184` standing.

### M4 — "Class B covers only the four rows whose surface exists" — it covers five

**Severity: major. Traces to: `defect:evidence-accuracy`.**

`coverage-depth-spec-0017.md:168`. Class B's members are `US-0017-0001`, `-0002`, `-0003`, `-0007`,
`-0009` — five rows — and the rows whose `Status ≠ ❌` are the same five. The sentence went stale when
`-0007` was rescored into class B in round 12, in the same edit that wrote the paragraph three lines
above it explaining that rescoring. The guard passes because it checks membership and sizes, not the
prose numeral.

**Rework:** "five rows", or drop the numeral and say "the rows whose `Status` is not `❌`", which is the
class's own property and cannot go stale.

## Minor

### m1 — The partition table is split by a stray blank line, so 8 of its 11 rows do not render as a table

**Severity: minor. Traces to: `defect:evidence-accuracy`.**

`coverage-depth-spec-0017.md:134` is empty, between the third class-A row and the fourth. In rendered
markdown the block below it has no header and no delimiter row, so `US-0017-0008`'s class-A row and all
of B, C and D render as a paragraph of pipe characters rather than as a table. The section promises the
opposite in its own words — "**by name, in a table a test can read**".

Nothing catches it: `parsePartition` reads lines with a regex, so the guard is green, and
`.qfai/evidence/**` is outside both prettier's and markdownlint's globs, so `pnpm ci:lint` never looks.
An instrument that reads the raw file cannot see a defect that only exists for a reader of the rendered
one — the same asymmetry `m3` of round 10 established about fence delimiters.

**Rework:** delete line 134.

### m2 — § "The one row still scored ⚠️" — two rows are `⚠️`

**Severity: minor. Traces to: `defect:evidence-accuracy`.**

`coverage-depth-spec-0017.md:423`. `US-0017-0001` and `US-0017-0007` both hold `Status ⚠️`. The heading
predates `-0007`'s rescoring; the section below it discusses `-0001` only, so `-0007`'s `⚠️` has no
narrative home in the section written for exactly that purpose.

### m3 — Gaps item 9 names `npm ci` where the shipped body's fallback is `npm install --no-audit --no-fund`

**Severity: minor. Traces to: `defect:evidence-accuracy`.**

The request asks whether item 9 is an honest scope statement or an excuse. **It is honest**, and I want
to say why before the objection: `US-0017-0004`'s obligation is over the scaffold's own lanes, the
matrix already scores that row `❌`/class A ("there is no it"), and no shipped-text repair can forbid an
adopter's `postinstall`. Narrowing the claim from "the lane executes no build in an adopter's tree" to
"the shipped TEXT invokes only these programs" is the record correcting an over-claim, not excusing a
gap the story owns.

It understates its own subject by one spelling, though. `qfai-validate.yml:180-185` falls through from
`npm ci` to

```yaml
            npm install --no-audit --no-fund
```

when no lockfile exists. That is strictly wider than `npm ci`: with no lockfile the **registry** decides
which versions — and therefore which lifecycle scripts — run. The bullet names only `npm ci`, so the
honest scope statement is one notch narrower than the channel it describes.

**Rework:** name the fallback in the bullet, or state the class ("any install this lane may perform")
rather than one command.

### m4 — Round 13's pack is recorded as `IN FLIGHT` while the record states elsewhere that round 13 is dead

**Severity: minor. Traces to: `defect:evidence-accuracy`. (Also part of `B1`'s rework.)**

§ "The twenty-agent sweep" says "no round-13 verdict exists … the round in question is **dead rather
than open**", and the seal block says `IN FLIGHT — sealed when its last reviewer response lands` — a
response that will never land. Under the record's own two-rule contract that pack is closed, and once
round 14 is named the guard will demand a seal for it.

## Advisory

### A1 — Entry 17 is a real class, not a restatement of entry 12 — and the entry should say which of the two it is closest to

**Severity: advisory. Traces to: `defect:evidence-accuracy` (advisory only).**

The request asks directly, and the answer is that the record is right and its own defence of the
distinction holds:

- **Entry 12** is *the unreadable was read as consent*. `invocationOf` returned `undefined` for both
  "invokes nothing" and "cannot be read", `refusals()` treated the second as permission, and the
  *fails-closed* claim — the stated reason for the whole design — was therefore false. One conflation,
  one line, refutable by one `if`.
- **Entry 17** is *the readings do not converge*. After that conflation was fixed, the sweep's six
  mechanisms are all cases the parser read and read **wrongly**: quote state in `isAlternation`, stdin as
  a program source, a flag that *is* the program, an environment prefix deciding resolution, write-then-
  install, and `env:` with no `run:` at all. None of those is "conceded on confusion"; each is a wrong
  model of bash. Different mechanism, different cure — and the record states the difference correctly.

One thing to add rather than change. The list's declared class is "a claim asserted over **how something
is written** rather than over **what it does**", and entries 1-16 are each a *claim*; entry 17 is the
*instrument as a whole*. Entry 13 already does that one level down for the corpus and says so ("That is
entry 5 … at the level of a whole instrument rather than a member"). Entry 17 should carry the same
sentence about entry 12, so a later reader does not have to re-derive the distinction the way this round
did.

### A2 — The tracked `.qfai/report/validate.log` at HEAD points at a run from round 11

**Severity: advisory. Traces to: `defect:evidence-accuracy` (advisory only).**

At `4d737f3a` the committed `validate.log` names `run-20260821160310691` — neither the run the record
cites (`run-20260822024224027`) nor the newest one on disk. The record explicitly declines to use
`validate.log` as Hard Gate evidence and names the reason, so this is **not** a gap in its citation. But
`validate.log` is tracked, a later reader will open it before opening a JSON artifact, and no section of
the record owns what it says.

Consider one sentence in § "Validate Hard Gate evidence" naming which run the tracked copy happens to
hold and why it is not the citation — or raising with the owner whether a file nothing serialises should
be tracked at all.

### A3 — I could not re-measure the record's stated byte-identity invariant, because a concurrent writer held the artifact

**Severity: advisory. Traces to: `defect:process` (advisory only).**

The record replaces a number with an invariant: the committed `validate.spec-0017.json` "must be
deep-equal to a fresh `--profile atdd --fail-on error --spec 0017` run". I intended to run it. I did
not, for two reasons that arrived together:

1. `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml` carried a planted
   `defaults: run: working-directory: ./ci-primer` block while I worked. A validate run would have
   measured a planted tree.
2. `.qfai/report/validate.log` — tracked, shared by every run, serialised by nothing — was rewritten
   under me during this review. My own run would have overwritten another agent's, and a restore from a
   copy I took *after* the concurrent write would have frozen a state that is neither mine nor the
   committed one.

So the invariant is **unverified this round**. Everything else I report was measured against artifacts
the plant does not touch (`.qfai/evidence/**`, `.qfai/specs/**`, `.qfai/review/**`), and the three test
failures in `B1` reproduce from those alone.

This is worth recording rather than shrugging at, because it is the third round in a row where the
round's own machinery was the thing that moved: round 11 was two reviewers colliding, round 12 was the
stage editing under its reviewers, and this round it is a **tracked** artifact with no owner and no lock.
The partition fixed the asset tree. It does not cover `.qfai/report/`.

**Suggestion, not an obligation:** give the round's roles a shadow report root
(`QFAI_REPORT_DIR` or equivalent) for any validate run, so `.qfai/report/validate.log` is written by the
stage and by nobody else.

## Evidence summary

| claim under review | how measured | result |
| --- | --- | --- |
| scoped gate `info=2 warning=0 error=1`, 8 TCs | `validate.spec-0017.json` + `run-20260822024224027/{run.json,summary.md}` | **confirmed** |
| the re-run left the tracked artifact byte-identical | not re-run — see `A3` | **unverified** |
| matrix totals, `❌` partition, class sizes | re-derived by hand from the table; `coverageDepthMatrix.test.ts` 5/5 | **confirmed** |
| `US-0017-0007` carried by an effect, not a declaration | carrier read; 2 tests, `spawnSync` + `peakConcurrency`; the 7 special values at `:308` | **confirmed** |
| P1d PASS on `9a37421c` | `R04_qa-gatekeeper-p1d.md` + that pack's `summary.json` | **confirmed** |
| no invented review verdict; round 13 stated as producing none | packs on disk (0 reports in `review-20260821200000000`) | **confirmed** |
| `ALLOWED_STEP_BODIES` covers 12 shipped bodies | `git show HEAD:` on both shipped workflows — 4 + 8 | **confirmed** |
| ledger cross-tabulation `74/6/2` | `stageEvidenceCounts.test.ts` (green) + `awk` tally | **confirmed** |
| the eight TCs' per-row ledger statuses | ledger rows 54, 68, 70-73, 107-108 | **refuted — `B2`** |
| `## Final status` round/pack counts | 14 packs on disk; two guards red | **refuted — `B1`** |
| `US-0017-0007` uncovered / `error=2` (5 sites) | the record's own re-run, and `validate.spec-0017.json` | **refuted — `B3`** |

## Gaps this review did not close

- **The invariant in `A3` is owed a measurement** on a still tree, by whoever runs round 15.
- **Drift protocol:** compliant as far as I can check. `4d737f3a` touches one file under
  `.qfai/review/**`; `.qfai/specs/spec-0017/tdd/test-list.md` has not been written by this stage (last
  modified at `76ade4dd`, 285 commits back, by `/qfai-implement`), which is what the whitelist requires,
  and the record's refusal to fix `TDD-0069`'s refuted `Evidence` cell itself is the correct reading of
  the carve-out. `.qfai/evidence/**` and `.qfai/decisions/**` creation are both whitelisted.
- **No rejected option is reintroduced** that I could find: `CR-20260820-0012`'s four rejected options
  all remain rejected in fact (`TDD-0069` is `blocked` with a `Blocked-By`, no gate narrowed, no waiver
  requested, nothing merged), and no `RE-OPEN` is required by anything in this round.
- **No self-approval:** the record's Work Orders Summary still discloses that P2-P4 ran inline, and it
  does not claim the reviewer gate has passed.

## Verdict

**REVISE.** I cannot state a stage gate that passed. The narrow gate that did pass — P1d on
`DR-0017-0010` — is closed, is not this gate, and the record says so itself.

`B1` `B2` `B3` `M1` `M2` `M3` `M4` `m1` `m2` `m3` `m4` `A1` `A2` `A3`

`git rev-parse --short HEAD` at finish: `4d737f3a` — unchanged from start.
