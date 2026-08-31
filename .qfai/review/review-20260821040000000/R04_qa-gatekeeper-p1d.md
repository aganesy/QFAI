# R04 — qa-gatekeeper, P1d branch-3 DR gate (round 5)

- Reviewer: `qa-gatekeeper`
- Stage: `/qfai-atdd spec-0017`, gate **P1d** (fourth re-route)
- Audit subject: `.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`,
  plus `.qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md`
  insofar as the `blocked` re-classification hangs on it, and the two rows' handover entries in
  `.qfai/evidence/atdd-spec-0017.md`
- Rows: `TDD-0069`, `TDD-0070`
- Revision reviewed: `3f815725`
- Prior verdicts: **REVISE** on `16f611c7`, `1473897a`, `54d8d325`
- Verdict: **REVISE** — narrowed; one of the two ledger writes is released

## Provenance of this run

`git rev-parse --short HEAD` = `3f815725` at start **and** at finish; `git status --porcelain` empty at
both. HEAD did not move. Nothing was mutated except this file; scratch under `tmp/r04-p1d-round5/`.

HEAD-accurate validate evidence was taken read-only, because `.qfai/report/validate.log` is tracked and
shared: `git archive HEAD` into `tmp/r04-p1d-round5/shadow`, the 83 tracked symlink entries enumerated
from the index and every one confirmed content-reachable (`total=83 missing=0`), then
`validate --profile tdd --fail-on error --root tmp/r04-p1d-round5/shadow` — **unscoped**, which is the
shape the `build` job's failing step runs. The tracked log was not touched. The run reports
`info=5 warning=376 error=3`; the third error is the shadow artifact `QFAI-LINK-001` (70 wrappers that
`tar` dereferenced into real directories) and is excluded from every count below, exactly as round 4
excluded it. The real tree's unscoped error count is therefore 2.

## What round 4 required, and what the revision did

| Round-4 required fix                                                                 | Status                                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1. Repair the anchored section, not just the index; add a `Blocked-By` column         | Column **done**; 2 of the 4 statements **still untouched** — **B3**          |
| 2. State clause 1 correctly, in the DR **and** in option 5                           | Correct in the CR and in the DR finding; the DR option-5 paragraph still says `degenerate` — **B1** |
| 3. Complete the cycle account with the unscoped strand; withdraw / re-scope option 2  | Strand **done, and exact** — Judgement 3. Option 2 not withdrawn, and its new kill reason is wrong — **M1** |
| 4. Fix option 5's warrant; resolve its self-contradiction                            | **Done, and correctly** — Judgement 4                                        |
| 5. Housekeeping (A2, A3, A4); hand A1 to the ledger's writer                          | A3 **done**; A1, A2, A4 **not done** — advisory                              |

## Verified correct at this HEAD

1. **Row identity is still exact on all three fields, both rows**, against
   `.qfai/specs/spec-0017/tdd/test-list.md:107-108`: `Layer = Integration`,
   `Test file = packages/qfai/tests/assets/actionPinBumpOwner.test.ts`, and the two selectors verbatim.
2. **Nothing has been written ahead of this gate, and the record now says so.** Both rows are `todo`
   with `DR-ID: -` and `Blocked-By: -`, read column by column at `:107-108`. The handover states it
   (lines 274-277, and again at 292-294) and asserts neither status as already written. Request item 1's
   second half is satisfied.
3. **The `DR-ID` overload is fixed.** The table now carries a separate `Blocked-By` column;
   `TDD-0069` is `DR-ID: -` / `Blocked-By: CR-20260820-0012`, `TDD-0070` is
   `DR-ID: DR-0017-0010` / `Blocked-By: -`. The quoted justification matches
   `execution-ledger.md:56-61` word for word, including the reason that makes it matter. Request
   item 1's first half is satisfied.
4. **Obligation references are exact.** `06_Test-Cases.md:134-135`; `AC-0017-0029` at
   `03_Acceptance-Criteria.md:311-320`, parent `US-0017-0007`.
5. **`EX-0017-0053` is still quoted verbatim** (DR 45-46 against `05_Examples.md:84`), both clauses.
6. **The ID space is clean.** `07_Decisions.md` ends at `DR-0017-0009`; one `DR-0017-*` on disk.
7. **The unscoped membership is exactly as the CR records it.** My own unscoped run:

   ```text
   QFAI-ATDD-112  15 TC   SPEC-0003 1 (TC-0003-0032)
                          SPEC-0008 4 (TC-0008-0015..0018)
                          SPEC-0015 2 (TC-0015-0035, 0036)
                          SPEC-0017 8 (TC-0017-0016, 0030, 0032..0035, 0069, 0070)
   QFAI-ATDD-111  12 US   SPEC-0003 8, SPEC-0006 1, SPEC-0008 1, SPEC-0015 1, SPEC-0017 1
   ```

   1+4+2+8 = 15 across **four** specs, and 12 across **five**. Both figures and both breakdowns are
   correct. Request item 3's first half is satisfied.
8. **`build` does run unscoped profiles.** `.github/workflows/ci.yml:376-428` — three steps,
   `--profile tdd`, `--profile sdd`, `--profile full`, each `--fail-on error --root .` with **no
   `--spec`**, under `set -euo pipefail`. The premise the CR reasons from is verified at the source.
9. **`TDD-0070`'s own account is sustained, for the fifth round.** `BR-0017-0054`
   (`04_Business-Rules.md:103`) and `EX-0017-0054` both scope the measurement to **default-branch**
   verdict runs **after** a tuning change has merged, above one in twenty. That surface cannot exist on
   the branch introducing the tuning: branch 1 fails on the GREEN side, branch 2 has no satisfied state
   to mutate, `exception` with a `DR-*` is the right shape. Nothing below touches this row's reasoning,
   and its own handover section (lines 384-399) is correct, including that the transition is still owed
   a P1d PASS.
10. **The `blocked` clause still applies to `TDD-0069`.** Fourth verification:
    `execution-ledger.md:185-187`; `CR-20260820-0012` is `Status: open`, `Approved option: -`, and names
    `spec-0017 TDD-0069` in its `Blocked set`.
11. **Two of the four statements round 4 required repaired are repaired.** "Branch 3 it is" for both
    rows is replaced by "**`TDD-0070` is branch 3** ... **`TDD-0069` is not**" (line 362), and "until
    `/qfai-implement` writes `todo -> exception`" is replaced by the correct per-row pair (lines
    375-382).
12. **The Coverage Depth Matrix exists at a committed path** — `.qfai/evidence/coverage-depth-spec-0017.md`,
    `git ls-files` confirms it tracked. Outside this gate's subject; recorded because my role contract
    requires the check from the ATDD cycle onward.

## Judgement 1 — clause 1 as "unsatisfied": right this time, and I say so on measurement

Asked to judge this adversarially, as the third statement in three rounds. I tried to break it four ways.

**Is it true that no tuning change exists on this branch?** Measured, not inferred:

- `packages/qfai/vitest.knobs.ts:98-104` declares `maxConcurrency: tunable(CONCURRENCY_ENV)` **once**, in
  `projectKnobs`;
- `packages/qfai/vitest.workspace.ts` spreads `...projectKnobs` into each of the seven projects and then
  sets **only** `name` and `include`. No project carries a differential knob value;
- `packages/qfai/vitest.config.ts:17` spreads `...rootKnobs` once;
- a repo-wide grep for `maxConcurrency` across `packages/qfai/**/*.ts` returns exactly two files: the
  declaration and the test that reads it;
- `DECLARED_START = 10` is unchanged on both axes, and `BR-0017-0048`'s note distinguishes the declared
  starting value from an adopted final one: "Only the final value is measurement-gated; the structure
  lands with the starting value."

So no knob value has moved off its declared start and no project is differentially tuned. **The factual
core is true**, and it is the first of the three clause-1 statements that is. Round 4's B2 is discharged:
"degenerate" is gone from the DR's finding and from the CR, `CR-20260820-0003`'s scope is stated
correctly, and "or by any other" is dropped.

**One wording caveat, flagged explicitly so it does not become a fourth rewrite.** `BR-0017-0053` and
`AC-0017-0029:318` are universally quantified — "**each** tuning change lands on its own pull request,
largest project first" — and `EX-0017-0053`'s subject column is "A parallelism tuning pull request". An
obligation of that shape with zero instances is **untriggered / vacuous**, not violated; "unsatisfied"
invites a reader to think the repository is in breach, which it is not. The DR's own gloss rules that
reading out in the next clause ("nothing to be true of until one is"), and the operative conclusion is
unaffected, so **do not rewrite clause 1 a fourth time on this ground alone.** It matters only where it
is load-bearing, which is option 5 (M2).

**And the row-level conclusion does not depend on clause 1 at all.** Branch 2 needs a **GREEN pair**
(`red-provenance.md`, "Evidence shape", falsifiability row); clause 2 cannot go green on this branch; so
branch 2 is unavailable **for the row** however clause 1 is characterised. The DR reasons this way at
147-150 and cites the right sentence. That is why three rounds of clause-1 error never moved the
destination, and why this round's correction does not either.

## Judgement 2 — the history as told is accurate in its substance and wrong in its arithmetic

Request item 2 asks whether all three versions are kept and whether the history is accurate. They are
kept, the attributions are right — "P1d's second pass" for the equivalent-mutant finding
(`review-20260821000000000`) and "P1d's third pass" for the `maxConcurrency` finding
(`review-20260821020000000`) are both correct — and the DR is candid that each correction was "written
confidently, from a real citation, read one step wider than the citation supported". That is the right
lesson, drawn honestly.

The arithmetic is not. See **B2**: the same section says "wrong about clause 1 **twice**, in opposite
directions" (DR 123) and "wrong about clause 1 **three times**, in three different directions" (DR 151),
and labels the current statement "**Third** statement" (DR 144). `CR-20260820-0012:130` repeats the
"three times". As written, both records classify the statement they are currently making as one of the
errors.

## Judgement 3 — the unscoped strand is correctly derived, and it does **not** kill option 2 the way the CR says

The strand itself is exact (Verified 7, 8) and it is the answer to round 4's M1. But request item 3's
second half asks whether it kills option 2, and the answer is **no, not by that route** — see **M1**.
Option 2 reads: exempt "a spec's own in-flight TCs", i.e. TCs "whose ledger rows are `todo` / `blocked` /
`exception`". I checked the seven non-spec-0017 members of `QFAI-ATDD-112` against their own ledgers:

```text
TC-0003-0032  todo      TC-0008-0015  todo      TC-0015-0035  todo
                        TC-0008-0016  todo      TC-0015-0036  todo
                        TC-0008-0017  todo
                        TC-0008-0018  todo
```

All seven are `todo`. So the rule as worded is general and would exempt **all fifteen**, clearing
`QFAI-ATDD-112` outright. The CR's new sentence — "an exemption for _this spec's_ in-flight rows would
still leave **seven** TCs from three other specs failing the same gate" — reads its own option as
spec-0017-scoped, which it is not.

**The conclusion survives, through the other reason.** `QFAI-ATDD-111` is a `US`-level finding with no
ledger rows to exempt, it stands **deliberately** by this stage's own decision, and `--fail-on error`
exits 1 at `error=1`. So option 2 leaves `build` red and does not open the cycle. That is the CR's
*first* listed reason and it is sound. The second, newly added one is not.

## Judgement 4 — option 5's corrected warrant does bind clause 2's subject

This is the part of the revision I sustain without qualification. `AC-0017-0029` at
`03_Acceptance-Criteria.md:319` reads, exactly as the CR quotes it: "And **each such** pull request
records three consecutive green aggregate-verdict runs before merge, with the run identifiers quoted in
the description", with `:318` supplying the antecedent ("each tuning change lands on its own pull
request, largest project first"). The CR now names its own prior error, states the OC-80 attributability
rationale as the reason the binding is load-bearing, and requires that "clause 2's row must name the
change clause 1's row records, so the two remain one guard in two rows rather than two guards". That is
the repair round 4 asked for and it does the work: the halves are no longer independently satisfiable.

Two consequences worth recording. **"It changes no obligation" is now defensible** — round 4 rejected it
because the split as then worded unbound the clause; with the binding required, nothing is dissolved.
And **the option-5 self-contradiction is resolved in the CR**: "what the split buys is that the two
failures get named separately instead of one standing for both" is consistent with clause 1 being
untriggered-but-falsifiable-in-principle. Request item 4 is satisfied **in the CR**. It is not satisfied
in the DR — that is **B1**.

## Blocking findings

### B1 — the retracted "degenerate" claim survives in the DR's option-5 paragraph, pointing at its own retraction

DR 161-167:

> Split into two examples ... and each gets its own row, its own branch and its own exit. **Clause 1's
> row would still be degenerate against this runner (see above)**, so the split does not close it
> either; but it would stop a reachable half being parked behind an unreachable one ...

Three defects in one sentence, all of them ones this record has already been through:

- **"degenerate against this runner" is the claim round 4 blocked on**, and the same document retracts it
  by name 20 lines earlier (DR 136-142: "P1d's third pass showed that is false: `CR-20260820-0003`'s own
  site table lists `maxConcurrency` as 'each project / project-scoped'"). I re-verified the retraction
  independently: `CR-20260820-0003:83-89` tabulates `maxConcurrency` as site "each project", why
  "project-scoped", and `vitest.knobs.ts:103` has it in `projectKnobs`. The paragraph asserts what the
  repository contradicts.
- **"(see above)" points the reader at the retraction as if it were support.** A later reader following
  the `DR-ID` cell into this paragraph is sent to the passage that says the opposite.
- **It carries round 4's exact self-contradiction pair**, both halves, unchanged: "so the split does not
  close it either" and "it would stop a reachable half being parked behind an unreachable one". If the
  half is unreachable it is not reachable.

The reason this blocks rather than being filed as an advisory: **the CR's twin paragraph was corrected in
this same commit range and this one was not.** `git diff 54d8d325..HEAD` touches `CR-20260820-0012`
(61 lines) and `DR-0017-0010` (47), and option 5's warrant landed in the CR while the DR's parallel
paragraph went untouched. That is the same "repair the pointer, not the payload" pattern as round 4's B1,
in the artifact whose correctness is the whole subject of this gate. `exception` clears only by
`exception -> todo`, so a reader deciding whether the anomaly has resolved reads this.

### B2 — both records classify their own current clause-1 statement as an error

- DR 123: "this record has now been wrong about clause 1 **twice**, in opposite directions" — correct:
  satisfied-and-falsifiable, then degenerate.
- DR 144: "**Third statement**, and the narrow one: clause 1 is UNSATISFIED" — offered as the correct one.
- DR 151: "This record has now been wrong about clause 1 **three times**, in three different directions,
  across three P1d passes."
- `CR-20260820-0012:130`: "`DR-0017-0010`, which has now been wrong about clause 1 **three times** in
  three directions."

`twice` and `three times` cannot both be right, and "three times" plus "third statement" says the third
statement is wrong. As written, the two artifacts disown the finding they are asking me to accept.

This is small, and it is exactly the defect the DR cites `CR-20260820-0006` for eighteen lines later —
"the number is not the check. Derive it from the ledger." It blocks because the count is the record's own
account of its reliability, and this gate has now spent three rounds on that clause; the fifth round
should not leave a sentence saying the answer is wrong.

### B3 — two of the four statements are untouched, and the same subsection asserts all four are gone

`.qfai/evidence/atdd-spec-0017.md` section `TDD-0069`, lines 353-360, byte-for-byte unchanged:

```text
356  ... it could not be made green on this branch at all, because the workflow changes are unmerged.
359  **Branch 2 (falsifiability) is unavailable**: the procedure requires an obligation already satisfied
360  by state that exists. Nothing satisfies this one — there is no run history to mutate.
```

And lines 367-373, eight lines below:

> Four statements went in that pass and **are gone now**: that the workflow changes being unmerged is
> `TDD-0069`'s obstacle (it is not; ...), that there is "no run history to mutate" for clause 1 (the
> correction is narrower — see the DR), that "branch 3 it is" for both rows, and that the blocking
> condition is the `exception` P1d PASS for both.

Measured, not read: `git diff 54d8d325..HEAD -- .qfai/evidence/atdd-spec-0017.md` shows "there is no run
history to mutate" as a **context** line, and the "workflow changes are unmerged" sentence does not
appear in the diff at all. The third and fourth statements were repaired (Verified 11). The first two were
not, and the paragraph that claims all four were is the fifth consecutive round in which this section
states something the tree does not hold — this time the claim is the repair itself.

The first survives against DR 86-89, which retracts "the workflow changes that produce an aggregate
verdict are unmerged" as `TDD-0069`'s reason by name, having verified `ci-pass` exists at `ci.yml:469`
and has run on this branch. The second is the sentence round 2 opened this whole sequence over.

**What this does not do is malform the entry** — see the gate decision. The transition instruction is now
coherent, and a `blocked` row takes no RED-provenance branch, so this vestigial branch analysis is not
part of a required evidence shape for `TDD-0069`. It is a false record, not a wrong instruction.

## Major and advisory — they govern a user decision or a later edit, not either ledger write

Kept out of the blocking set on purpose, on round 4's narrowing: `red-provenance.md` fixes P1d's subject
as the row identity, the obligation reference, the `DR-ID` and the DR artifact, and `CR-20260820-0012` is
in scope only insofar as the `blocked` re-classification hangs on it — which needs the CR open and naming
the row, both true. Its option set is the user's input.

- **M1 — option 2 is still not withdrawn, and its new kill reason is wrong.** Judgement 3. Option 2's own
  text (CR 86-94) still opens "Breaks the cycle for every future row of this class, not just this one",
  which a reader meets first; and the Recommendation's "would still leave seven TCs from three other
  specs" misreads option 2 as spec-scoped when all seven of those TCs are themselves `todo`. Fix both in
  the option text: option 2 clears `QFAI-ATDD-112` entirely and still fails, because `QFAI-ATDD-111` has
  no ledger rows to exempt.
- **M2 — clause 1's modality, but only where it is load-bearing.** Judgement 1. If the option-5
  paragraphs are being touched for B1 anyway, say "untriggered — no tuning change exists for it to be
  true of" rather than "unsatisfied". Do not open a fourth clause-1 rewrite for this alone.
- **A1 (round 4's A1, still open).** The ledger's `Evidence` cell for `TDD-0069`
  (`tdd/test-list.md:107`) still opens "**NOT BLOCKED by a CR** - waiting on data that does not exist
  yet" and ends "becomes implementable once the pull request has three green ci-pass runs to cite". The
  handover contains no instruction to replace it — I grepped for one. Whoever writes
  `Blocked-By: CR-20260820-0012` must replace that text in the same edit, or the ledger will carry a
  `CR-*` blocker next to the words "NOT BLOCKED by a CR" and the exit the DR retracts as unreachable.
  **This is the one advisory that should be promoted into the handover text**, because it is the only one
  a released write can make worse.
- **A2 — the round table misstates my own prior verdict.** `.qfai/evidence/atdd-spec-0017.md` reports
  round 4's `qa-gatekeeper` (P1d) as "3 blocking". It was **2 blocking** (B1, B2) plus 3 major (M1-M3);
  that report's own gate decision says "The remaining blocking set is two items". The other rows check
  out: round 3 P1d 3 blocking, round 4 stage `qa-gatekeeper` 6 blocking (`B1`-`B6`), round 4
  `completion-reviewer` 6 blocking / 5 major (`B1`-`B6`, `M1`-`M5`).
- **A3 — round 3's N3 / N4 and round 4's A2 are still open.** DR 200-207 still opens "`blocked` was
  considered for both and is wrong" and closes by adopting it for `TDD-0069`; the DR's `Rows:` header
  still lists both rows without saying which one it now backs.
- **A4 — round 4's A4 is still open.** Line 405 still groups "These two rows, the six `blocked` ones" as
  distinct categories after one of the two has joined the six.
- **A5 — a duplicated paragraph landed in this round's repair.** Lines 274-277 and 292-294 both say
  "Neither ledger cell has been written ... `todo` with `DR-ID: -` and `Blocked-By: -` ... this table is
  the handover". Both are true; one is redundant.
- **A6 — the DR's cycle block is still the scoped one** (DR 66-73), where the CR now carries the unscoped
  strand. Acceptable, because the DR delegates the arrangement question to the CR by ID and its chain
  claims necessity rather than sufficiency. Worth one clause if the paragraph is touched.

## Gate decision

**REVISE** — and narrower than any prior round. The two writes now separate, and I am releasing one.

**`/qfai-implement` MAY write `todo -> blocked` with `Blocked-By: CR-20260820-0012` for `TDD-0069`.**
This is not a `qa-gatekeeper` PASS, because that status does not take one: `blocked` requires no `DR-*`
and no P1d verdict. What round 4 blocked it on was purely mechanical — the entry was self-contradictory
about the transition itself, and the `DR-ID` cell carried a `CR-*` id. **Both are fixed.** The table says
`blocked` with the blocker in a `Blocked-By` column, the anchored section says "`TDD-0069` ... is
`blocked` on `CR-20260820-0012`, and `blocked` takes no RED-provenance branch at all", and the record
states that no ledger cell has been written. Nothing in **B3** contradicts the instruction; it
misdescribes a branch analysis that a `blocked` row does not have. The clause has now been verified to
apply four rounds running, and the classification was disclosed rather than exploited. **One condition
the writer owes**, and it is the ledger's own consistency rather than my gate: replace the row's
`Evidence` text in the same edit (**A1**).

**`/qfai-implement` may NOT write `todo -> exception` for `TDD-0070`.** That row's own account is sound
and I sustain it for the fifth round; its handover section is correct; its obligation, identity and
`DR-ID` are exact. What blocks the write is the record the `DR-ID` cell points at. `DR-0017-0010` still
asserts, in a present-tense analytical paragraph, that clause 1's row "would still be degenerate against
this runner" — the claim round 4 blocked on, retracted 20 lines earlier in the same file, contradicted by
the table in `CR-20260820-0003` and by `vitest.knobs.ts`, and corrected in the CR's twin paragraph in this
very commit range (**B1**) — and both records say the record has been wrong about that clause "three
times" while offering the third statement as the right one (**B2**).

**Mechanically, a PASS is not self-executing.** `qfai-implement/SKILL.md` step 3b writes
`todo -> exception` "**only when the entry carries the `qa-gatekeeper` PASS P1d took on that `DR-*`**".
So when this gate does pass, the stage must **record that PASS in the `TDD-0070` entry** before the write
is available. At HEAD the entry records three REVISEs and no PASS, which is accurate.

**The remaining blocking set is three items, all textual, none requiring a measurement.** B1 is one
paragraph in the DR. B2 is two sentences in the DR and one clause in the CR. B3 is two sentences in the
evidence file plus the claim that says they are gone. No new analysis is owed: every fact the repairs need
is verified in this report, and the destination has never been in dispute — five rounds have sustained
`TDD-0070`'s branch 3 and four have sustained `TDD-0069`'s `blocked`.

## Required to clear this gate

1. **DR 161-167** — drop "degenerate against this runner (see above)" and the "does not close it either"
   half. State it as the DR's own finding already does: clause 1 is untriggered because no tuning change
   exists, so the split gives each half its own row, its own branch and its own exit, and names the two
   failures separately. The second half of the sentence then stands on its own.
2. **DR 151 and `CR-20260820-0012`:130** — make the count agree with DR 123 and DR 144: wrong **twice**,
   now stating a third. Or drop the figure, which is what `CR-20260820-0006`'s own lesson recommends.
3. **`.qfai/evidence/atdd-spec-0017.md:353-360`** — remove "because the workflow changes are unmerged"
   (DR 86-89 retracts it) and replace "Nothing satisfies this one — there is no run history to mutate"
   with the corrected clause-1 / clause-2 finding. Only then does the "are gone now" paragraph become
   true; if any statement is deliberately kept, that paragraph must stop claiming it went.
4. **Promote A1 into the handover** so the ledger's writer replaces the "NOT BLOCKED by a CR" `Evidence`
   text in the same edit as `Blocked-By`.
5. **Option 2 (M1)** and housekeeping (A2-A6), before the user is asked to approve an option.

## Residual risk if this were passed as-is

`DR-0017-0010` would stand as the permanent anomaly record for `TDD-0070` while asserting in one
paragraph that a per-project parallelism tuning surface does not exist against this runner — three lines
from the `CR-20260820-0003` table that says it does, and twenty from its own retraction — and while
telling its reader it has been wrong about that clause three times, the third being the statement it is
making. `exception` clears only by `exception -> todo` when the anomaly resolves, so a wrong account of
the anomaly decides when, or whether, anyone tries again. And `.qfai/evidence/atdd-spec-0017.md` would
carry a paragraph certifying a repair the diff shows did not happen, which is the self-attestation this
gate exists to refuse.

## Sign-off

- [x] Review verdict is explicit — **REVISE**, with `TDD-0069 -> blocked` released
- [x] Findings cite concrete artifacts, line numbers, a HEAD-accurate unscoped validate run taken
      read-only in a shadow root, and the diff range that shows what the repair touched
- [x] Required gates and residual risks are recorded
