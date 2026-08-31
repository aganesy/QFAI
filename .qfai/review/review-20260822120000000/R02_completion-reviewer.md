# R02 — completion-reviewer, round 17, spec-0017 (stage gates)

**Revision at start:** `1d7c0c3f`. **Revision at finish:** recorded at the end of this file.
**Emphasis:** sections 3 and 4 of the request, as directed.

## Method

Every regex-shaped claim in this report was measured by pulling the pattern **out of the file's own
bytes** and evaluating it, not by reading it — the method the request asks for. Where a guard's own
module could be run, it was run: `retractedClaims.test.ts` was reduced to its non-`describe` prefix
under `tmp/r17-completion/rc.mts` and executed with `node --experimental-strip-types`, so `GOVERNANCE`,
`RETRACTED`, `flattenDocument`, `quotedSpans` and `occurrences` are the shipped implementations rather
than a transcription. Plants against the records were made on disk, measured with `vitest`, and
restored from a copy taken first; `git checkout` was never used on any path.

## A gate that passed

```text
pnpm -C packages/qfai exec vitest run tests/assets/stageEvidenceCounts.test.ts \
    tests/assets/coverageDepthMatrix.test.ts tests/assets/retractedClaims.test.ts
  -> 3 files, 28 tests passed, exit 0
```

`.qfai/report/validate.log` was byte-identical before and after that run (md5
`95b9574bf6e4d28cb983d6328616a120` both sides), so the documented trap does not fire for a
single-file `vitest run` of these three.

Independently re-derived and **correct**: e2e-project callsites `881`; `seventeen` packs;
`44` closed-pack reviewer responses and a `43 + 1` split that sums to it; `8` annotated describes; and
every per-file test count `## Work performed` states (23, 12, 27, 5, 12, 2, 2, 10, 11). `ci:lint` does
have eleven members.

## Verdict

**REVISE.**

### B1 — class C's roster is checked one way, and the "both ways" claim is what makes that worse

**Severity: blocking. Traces to:** `defect:oracle-strength` — a guard whose stated property is not the
property it enforces, in the guard repaired for exactly that defect two rounds running.

`packages/qfai/tests/assets/coverageDepthMatrix.test.ts:366-399` says the roster is now checked in
both directions:

- forward, `classC.filter((cell) => !namedInProse.has(cell))`, where `namedInProse` is built at
  **line 370-374 from the WHOLE file** (`text.matchAll(…)`);
- reverse, `[...inClassCSection].filter((cell) => !classC.includes(cell))`, built at line 391 from
  class C's own paragraph.

So "the record does not name it **with its own reason**" is enforced as "the record does not name it
**anywhere**". Measured, by plant:

1. I moved the whole `` `US-0017-0007` × `Error path` `` bullet out of class C's paragraph and inserted
   it verbatim immediately before `**Class B — property:`, i.e. into **class A's** paragraph. Nothing
   else changed; the matrix table, the partition table and the sizes line were untouched.
   -> `vitest run tests/assets/coverageDepthMatrix.test.ts` — **5 passed, exit 0.**
   The record now says class C has "Two members, each with its own reason" and lists one, while class
   A's paragraph carries a class C reason. Both directions of the check are satisfied.
2. Control, from the same planted state: deleting the bullet outright.
   -> **1 failed** — `a class C cell the record does not name with its own reason: expected
   [ 'US-0017-0007/Error path' ] to deeply equal []`.

The control is what makes (1) a finding rather than a guess: the assertion is live, and it is blind to
exactly the mutation the comment above it describes as covered ("a member the prose does not name is a
cell reclassified without a reason"). Restored from `tmp/r17-completion/coverage-depth.md.bak`;
`git status` clean on that path afterwards.

**Rework:** build `namedInProse` from `classCReasons` rather than from `text` — the slice is already
computed eleven lines below. Note while doing it that `classCEnd` searches
`/^(?:\*\*Class |## )/m` and **class C is the last class**, so the slice actually runs to the next
top-level heading and swallows several paragraphs; scope it to the bullet list or to the next `**`
paragraph.

### B2 — the corpus count still admits a wrong number, and now also fails on a true one

**Severity: blocking. Traces to:** `defect:oracle-strength` — third round in a row that this row fails
in the direction it was repaired for.

Three plants, all against `stageEvidenceCounts.test.ts:243-302`. `held` is
`corpus.slice(start,end).match(/^ {2}["']/gm).length` (line 264), and the four site patterns are lines
275-278.

**(a) A wrong number that passes — measured on disk.** `held` counts lines opening with `"` or `'` at
indent two. It does not count a **template literal**, and `shippedLaneCommands.test.ts` already writes
one in a sibling corpus: `ROOT_CAUSES` line 5 is `` `declared=${BACKTICK} tsup ${BACKTICK}` ``. So
`ROOT_CAUSES` measures 17 by this rule and holds 18 — the record's `ROOT_CAUSES 18` is right and the
counter would be wrong about it. I added one entry to `MECHANISMS` in exactly that established style:

```
  `node ${BACKTICK}echo build.mjs${BACKTICK}`,
```

The corpus now holds **30**; `held` still reads **29**; the record states 29 at four sites.
-> `vitest run tests/assets/stageEvidenceCounts.test.ts tests/unit/shippedLaneCommands.test.ts` —
**24 passed, exit 0.** The number this record calls derived is a wrong number, and the guard requires
it to stay wrong.

**(b) A second wrong number that passes.** Pattern 1 is
`/(\d+)(?:\s+\S+){0,3}\s+mechanisms?\b/g` — greedy over up to three intervening words, so the FIRST
numeral in the window is captured and any numeral inside those three words is consumed by `\S+`.
Planted `escape corpus 29 mechanisms` -> `escape corpus 29 of the 31 mechanisms`:
-> **12 passed, exit 0**, with the record asserting 31.

**(c) A legitimate edit that fails.** `SITES` is read from `corpus size appears (\w+) times **in this
section**`, and the site count is taken over the **whole file**. I added one true sentence — "The
sweep confirmed 29 mechanisms, and every one of them is refused." — under `## Final status`, four
sections away:
-> **1 failed**, `expected 5 to be 4`. The record's own sentence is still true (four sites in that
section); the guard reddens anyway. The needle reads a scoped claim and enforces an unscoped one.

**(d) Dead numerals.** `WORDS` (lines 169-200) carries `twenty-one` … `twenty-nine`, added so the
table "covers every value this stage could reach". `(\w+)` cannot capture a hyphen, so at 21 sites the
`stated` match is `null` and the failure is "the record must say how many times it states the corpus
size" rather than a count mismatch. Nine of the thirty entries are unreachable. Verified by evaluating
line 283's literal from the file's bytes against
`corpus size appears twenty-one times in this section` -> no match.

All three plants restored from `tmp/r17-completion/*.bak`; `git status` clean on both paths.

**Rework:** count entries by parsing the array (or at minimum add `` ` `` to the character class and
assert the line count equals a comma count); build the site list from the **section** the sentence
names; and read the numeral with `([\w-]+)` or drop the unreachable keys.

### M1 — the `GOVERNANCE` self-exclusion rests on a premise that is measurably false

**Severity: moderate. Traces to:** `defect:evidence-accuracy` — a stated reason inside a governance
artifact, false, hiding the one file that could report it.

`retractedClaims.test.ts:85-87` excludes the guard's own file with this reason:

> NOT this file: `RETRACTED` holds the claims verbatim, so scanning it would report every needle
> against its own entry.

Measured, by running the guard's own `occurrences()` with the file appended to `GOVERNANCE` (the
shipped implementation, executed out of `tmp/r17-completion/rc.mts`):

```text
GOVERNANCE 15 (baseline)   82 occurrences, 0 unquoted
GOVERNANCE 16 (+ itself)  206 occurrences, 6 unquoted
```

124 occurrences appear in the file and **118 of them read as quoted**, because every `claim:` and
`why:` string sits inside a real `"` pair. The premise is false: the entries are not what would be
reported. What *is* reported is six, and they divide into two kinds, neither of which the comment
names:

- **three false positives** — `P1d has returned REVISE three times`, `defeated by the formatter` and
  `defeated by running the formatter`, at lines 43-46, which are visibly and correctly quoted. They
  read as unquoted because paragraph 0 (lines 1-56) holds **23** quotation marks, an odd number: line
  26 carries the single stray `` `"` `` in the phrase "one stray `"` inverted every range after it",
  and it shifts every pairing after itself. The docstring contains a live instance of the defect it is
  describing, and `oddParagraphs` — the rule written to report exactly that — is filtered to `.md`
  members at line 832, so it would not report it even if the file were scanned;
- **three mentions** — `Three packs` at lines 246 and 667 (backticked, and backticks are stripped),
  and `degenerate against this runner` at line 572, written `` `_degenerate against this runner_` ``,
  i.e. in **italics**, which this same file establishes at line 38 are *not* quotes and faults
  `CR-20260820-0012` for relying on.

So the exclusion is defensible on the false-positive ground and indefensible on the ground given, and
the italic mention is the pattern this stage retracted a CR's reasoning over. The honest form is to
state the real reason (a `.ts` file's `"` is a string delimiter, which line 827-830 already argues for
the odd-mark rule) rather than one that a two-line measurement refutes.

### M2 — `GOVERNANCE` is again "the files the round was looking at", short by one this time

**Severity: moderate. Traces to:** `defect:coverage-obligation`.

`retractedClaims.test.ts:81-84` says the round-15 list "named the files the round happened to be
looking at rather than the files this stage wrote". Enumerated from
`git log --format="" --name-only 8fb48002~1..HEAD`, excluding `.qfai/review/**`, the stage wrote 25
paths. `GOVERNANCE` holds 15. Of the remainder, one is a prose-carrying file this stage **created**:

```text
scripts/check-atdd-annotation-ledger.mjs   added at 58c29d9f, 340 lines, 122 comment lines
```

It is the script `§ Delta Rejected Guard` reasons about by name, `stageEvidenceCounts.test.ts:505`
imports it, and it is outside the scan. (`packages/qfai/tests/integration/shippedWorkflowDetection.test.ts`
is stage-**modified** rather than stage-written, so I do not claim it.) I re-ran all 32 needles across
`.qfai/**`, `packages/qfai/tests/**`, `packages/qfai/scripts/**` and `scripts/**` — 3564 files — and
**no live claim is standing in it today**, so this is the obligation and not a live defect. It is the
third round in which the list was widened to the files in view.

### M3 — the depth-score pin reads only the first bullet, which is the `exec` defect its sibling retired twice

**Severity: moderate. Traces to:** `defect:oracle-strength`.

The doubled escape at `coverageDepthMatrix.test.ts:559` is genuinely repaired — I evaluated the
template from the file's bytes and `^- \*\*<Column> `([^`]+)`\*\*` is two literal asterisks on both
sides, so the bold markers are required. The defect one level along is that the pin uses `.exec(…)`:

```ts
const stated = new RegExp(`^- \*\*${column} \`([^\`]+)\`\*\*`, "m").exec(rowSection)?.[1];
```

Planted a **second** bullet for the same column, after the real one:
`- **Error path `✅`** — restated: the malformed-override path is asserted end to end.`
-> **5 passed, exit 0**, with the section now stating `✅` and `❌` for the same cell and the table
holding `❌`.

Control: changing the FIRST bullet to `✅` reddens as designed
(`every depth column's score must agree between the table and the row's justification`).

`stageEvidenceCounts.test.ts:368-372` records this exact failure being found in round 6 — "`## Work
performed` stating one file's size three times … two of them wrong and invisible, because `exec`
returns only the first match" — and switched three sites to `matchAll` for it. The matrix pin did not
follow. **Rework:** `matchAll`, and fail when one column is stated twice with disagreeing values, as
the sibling does at lines 388-393.

### B3 — the Delta Rejected Guard tie is vacuous for the third time: the row can be deleted

**Severity: blocking. Traces to:** `defect:oracle-strength` — the check exists to close a disclosed
gap and has now been green with its subject removed in three successive shapes.

`stageEvidenceCounts.test.ts:203-241`. The comment records two earlier vacuous versions and says the
fix is "the TABLE's first column, not the section's text", with fences stripped and "a row must have
the columns of a row". The row test is
`/^\|\s*`([^`]+)`\s*\|[^\n]*\|/gm` over `section`, and `section` is the whole 111-line slice from
`### Delta Rejected Guard` to the next `## ` — the table is only part of it.

**Plant 1 — a row that reasons about nothing.** Replaced

```
| `tests/unit/buildCommand.test.ts` | "a row that cannot fail looks like coverage" (delta)    | measured, not assumed |
```

with `| `tests/unit/buildCommand.test.ts` |  |  |`.
-> **12 passed, exit 0.** The assertion's message is "a file this stage added that the Delta Rejected
Guard table does not reason about"; an empty verdict satisfies it.

**Plant 2 — the row deleted outright.** I removed that table row entirely and put a bare
`| `tests/unit/buildCommand.test.ts` | x |` on its own line **two paragraphs below the table**,
immediately before `**No RE-OPEN is required.**`, where there is no table at all.
-> **12 passed, exit 0.**

So the third version fails the same way the first two did: "deleting a row from the table left it
green" — the exact sentence at line 218 — is true again, because nothing ties the match to the table.
Both restored; `git status` clean.

**Rework:** find the table by its header separator row and slice from it to the first blank line, then
match rows inside that slice only; and require a non-empty second and third cell, since "reasoned
about" is what the assertion claims to check.

## Section 4 — the record

### The counts, re-measured

Every figure the request named was re-derived at `1d7c0c3f` and **all of them hold**:

```text
e2e callsites at this tree            881    measured 881   (walked the e2e project's two includes)
seventeen packs                        17    measured 17
44 reviewer responses, 43 + 1          44    measured 44 over closed packs; split sums
annotated describes                     8    measured 8
per-file test counts (10 claims)        —    all 10 agree
ci:lint members                        11    measured 11
validate --profile atdd --spec 0017    info=2 warning=0 error=1, QFAI-ATDD-112 on 8 TCs   CONFIRMED
validate --profile full                error=49                                          CONFIRMED
  QFAI-REVIEW-007  44 / -004  2 / -005  1 / -ATDD-111  1 / -ATDD-112  1                  CONFIRMED
QFAI-ATDD-111 unscoped   11 US across spec-0003/0006/0008/0015, spec-0017 owns NONE       CONFIRMED
QFAI-ATDD-112 unscoped   15 TCs across spec-0003/0008/0015/0017, spec-0017 owns 8         CONFIRMED
build runs --profile full --fail-on error    ci.yml:359 (job `build`), step at :410       CONFIRMED
```

The eight scoped TCs are `TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070`.

I also re-ran the retracted-claims scan myself, all 32 needles across `.qfai/**`,
`packages/qfai/tests/**`, `packages/qfai/scripts/**` and `scripts/**` — **3564 files**, wider than
`GOVERNANCE`. Outside the 15 governance members and the review packs (reviewer-written history), the
only hits are: three `Three packs` matches in `_policies/08_Decisions.md`, `_policies/10_delta.md` and
`spec-0017/09_delta.md`, all of them the unrelated phrase "fragmented across three packs"; two
`no filters` matches in `_policies/08_Decisions.md` about a rejected CLI option; and two in
`tdd/test-list.md`, which the guard documents as deliberately out of scope and which the handover does
name. **Nothing is standing where no needle reached, except inside the guard's own file — see `M1`.**

### The ground option 2 now rests on — the account is accurate, the reason is not

The *account* of how the ground moved is accurate. `683f16ab` did correct the `US-0017-0007` bullet the
first reason cites, `2e851bd8` is where the bullet was rewritten rather than repointed, and the CR
records the in-place edit with a date (`CR-20260820-0012`, "**Corrected 2026-08-22, after round 16.**").
No rejected option is reintroduced and no `RE-OPEN` is owed. What does not hold is the replacement
reason itself; the finding for that is two headings below.

### M4 — `revision_form` is recorded as unsettleable, and this repository settles it

**Severity: moderate. Traces to:** `defect:evidence-accuracy`.

`atdd-spec-0017.md:2409-2417` says the repair "moved the pack from a value the schema rejects to a
value the schema accepts and the content does not support", and closes: "this stage cannot settle
which, because the contract is not this spec's."

Both halves of the contract are in this repository and both say the first horn:

- `packages/qfai/src/core/validators/reviewArtifacts.ts:26` —
  `const REVISION_FORM = /^(?:[0-9a-f]{7,64}|working-tree\+[0-9a-f]{64})$/i;`
  A 7-64 hex git rev **is** the accepted value under the current contract; `working-tree+<64 hex>` is
  the alternative for an uncommitted tree. The failing message at :425 spells both out.
- `.qfai/assistant/skills/qfai-implement/references/evidence-revision.md:153-155` — "Write
  `"revision_form": "content-hash"` beside it … **That marker is how a pack says which contract
  produced it.**" The marker names the *contract*, not the encoding of `revision`.

So `revision_form: "content-hash"` beside a short sha is not a label the content fails to support; it
is exactly what the contract prescribes for a committed tree. The survey the record rests on is
otherwise right — I measured all 60 `summary.json` in `.qfai/review/`: 59 carry a git-sha `revision`
and one (`review-20260805082718000`, `"round-11"`, no form) is malformed — but the conclusion drawn
from it is not. Recording it as an open question is more honest than the first version's "fixed"; it
is still one degree short, because the question is answered by two files a reader can open.

**Rework:** close the open question with the two citations above, or state precisely which artifact
would have to say otherwise for the second horn to be live.

### m1 — "at five sites" is not what the tree holds

**Severity: minor. Traces to:** `defect:evidence-accuracy`.

`atdd-spec-0017.md:2383-2388`: 'wrote the pre-fix figure down as current — "error=50", at five sites.'
Measured with `git grep` at `683f16ab` (the commit being described) and at `2e851bd8~1` (immediately
before the correction):

```text
683f16ab      error=50 at 2 sites, both in atdd-spec-0017.md
2e851bd8~1    error=50 at 3 sites: atdd-spec-0017.md x2, review-20260822090000000/review_request.md x1
```

Five is reachable only by counting a different figure as well — the `45` in the table and the `45` on
the request's line 103 — which is not what the quoted token says. The correction itself is right
(`error=49`, `44 QFAI-REVIEW-007`, both confirmed above) and the diff touched three sites. Make the
sentence say what it counted, in this record's own idiom.

### B4 — option 2's replacement ground contradicts its own source in the adjacent sentence, and the ledger refutes it

**Severity: blocking. Traces to:** `defect:rejected-option-reasoning` — a Delta Rejected Guard
conclusion resting on a premise the record itself withdraws one sentence earlier. This is the third
ground option 2 has been rejected on and the second that does not hold.

`.qfai/evidence/atdd-spec-0017.md:138-141` and `CR-20260820-0012:183-186` both say:

> `build` runs the profile UNSCOPED, where `QFAI-ATDD-112` names fifteen TCs across four specs, so an
> exemption for one spec's in-flight rows clears none of the other three specs' and the gate this
> option exists to clear stays red.

The **immediately preceding sentence in the same CR paragraph** says the opposite:

> P1d's fourth pass checked: all seven non-`spec-0017` TCs are themselves `todo`, so option 2 as
> worded — an exemption for *a spec's* own in-flight rows, not this spec's — **is general and would
> clear `QFAI-ATDD-112` outright**.

Option 2's own wording (`CR-20260820-0012:86-89`) is "exempt **a spec's** own in-flight TCs", treating
`QFAI-ATDD-112` "for TCs whose ledger rows are `todo` / `blocked` / `exception`" as a warning. So the
rejecting sentence re-narrows the option to a per-spec exemption that the paragraph above it
explicitly says is not the wording.

Re-derived from the ledgers rather than taken from the CR — every one of the fifteen TCs the unscoped
gate names is in-flight:

```text
spec-0017  TC-0017-0016 blocked   -0030 blocked  -0032 blocked  -0033 blocked
           -0034 blocked  -0035 blocked  -0069 todo  -0070 todo
spec-0003  TC-0003-0032 todo
spec-0008  TC-0008-0015 todo  -0016 todo  -0017 todo  -0018 todo
spec-0015  TC-0015-0035 todo  -0036 todo
```

15 of 15 are `todo` or `blocked`. Option 2 as worded clears **all fifteen**, and `QFAI-ATDD-112`
leaves the full profile entirely. The stated ground is false.

This matters beyond tidiness: `§ Delta Rejected Guard` is the artifact that certifies no rejected
option is reintroduced, and one of its two "reasoning stated rather than asserted" entries is now
resting on a refuted premise for the third time in three rounds.

**Rework:** the decision looks right on other grounds — with `QFAI-ATDD-112` exempted, `build` is still
red on `QFAI-ATDD-111` (11 US, none of them this spec's) and on 47 `QFAI-REVIEW-*`, so option 2 does
not unblock `TDD-0069` either — but that is a *fourth* ground and has to be written and measured, not
assumed. Either state it, or state that option 2 is rejected on the first two reasons only. Both files
carry the sentence; grep after the edit, as this record's own countermeasure requires.

### B5 — the subject was edited while this round was measuring, for the second round in a row of stages

**Severity: blocking. Traces to:** `defect:review-integrity` — the round's own rule, and the property
round 12 established: a finding measured against a half-applied state is indistinguishable from a
false one, in either direction.

Disclosed by the stage, unprompted, while I was writing this report:
`packages/qfai/tests/helpers/shippedLaneCommands.ts` and
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` carried an uncommitted
`ALLOWED_INIT_PATHS` / `INIT_MUST_NOT_SHIP` pin and a new `it(…)` in the `US-0017-0004` describe for
part of the round. `HEAD` never moved. `review_request.md:25` states the rule it breaks in five words:
"The stage does not edit the subject while this round runs."

The disclosure is the right behaviour and I am recording it as the request asks — not softening it. It
is blocking for two reasons that outlive this round:

1. **It is the second occurrence**, and the record already classifies the first as a defect in how the
   stage runs rounds. A rule broken twice with a disclosure each time is a rule with no mechanism.
2. **The blast radius was not small.** Both files are `GOVERNANCE` members of the retracted-claims
   guard, and the e2e file is inside the walk that derives `e2e callsites at this tree`. An extra
   `it(…)` there moves that count to 882 and reddens
   `stageEvidenceCounts.test.ts` — so for part of this round the record's own derived-count guard was
   red for a reason no reviewer could see in `git status` of a committed tree.

**What I re-took, after confirming both files are byte-identical to `HEAD`** (`git hash-object` equals
`git rev-parse HEAD:<path>` for both; neither contains `ALLOWED_INIT_PATHS` or `INIT_MUST_NOT_SHIP`;
`git status --porcelain` empty):

```text
e2e callsites / per-file counts / packs / responses / describes   re-run   identical
3 record guards, clean tree                                       re-run   28 passed, exit 0
retracted-claims scan, baseline and + self                        re-run   82/0 and 206/6, identical
B2 plant (a), template-literal corpus entry                       re-run   24 passed, exit 0
B1 plant, class C reason moved out of its paragraph               re-run   5 passed, exit 0
B3 plant 2, table row deleted, stray pipe line in prose           re-run   12 passed, exit 0
```

**Every finding in this report is re-measured at the tree as it now stands.** Nothing is left
un-retaken. The two gate runs (`--profile atdd --spec 0017`, `--profile full`) do not read either
file.

**Rework:** the mechanism, not another disclosure. Two candidates, both cheap: open the round from a
clean tree and have each reviewer record `git status --porcelain` at start and finish in its report —
I did, and it is what surfaced the sibling plant below — or move stage work to a scratch worktree for
the duration of a round.

### A1 — a partitioned plant, observed and reported rather than measured through

**Severity: advisory. Traces to:** none — this is an observation, not a defect.

At 08:40 and 08:45 my `git status --porcelain` showed, untracked:

```text
?? packages/qfai/assets/init/.qfai/ci-primer.cjs      (08:40, gone by 08:45)
?? packages/qfai/assets/init/root/.ci-primer.cjs      (08:45)
?? packages/qfai/assets/init/root/.npmrc
?? packages/qfai/assets/init/root/package.json        {"scripts":{"preinstall":"node ./.ci-primer.cjs"}}
```

That is `qa-gatekeeper`'s answer to the request's first question, in `qa-gatekeeper`'s partition. I did
not measure through it: no suite run of mine touched `assets/init/**`, and I ran no full `test:e2e`
while it was live. All three were gone by the time I re-took my measurements, and the tree is clean at
finish. Recorded because the request asks both siblings to report a plant they see, and because the
window matters for anyone reading two reports side by side.

I could **not** re-measure the two `## P7 quality gates` suite totals (`e2e 1445`,
`integration+unit 1219`) for this reason — a full `test:e2e` would have run through the shipped-tree
plant, and `assets.test.ts` and `distributedSurfaceLeakage.test.ts` both enumerate that tree. They are
the only two figures in the request's section 4 I am not certifying. The thing that *invalidates* them
is derived and green: `e2e callsites at this tree: 881` is correct.

## What I checked and found sound

Recorded so a later round does not re-open them:

- **The depth-score pin's doubled escape is genuinely fixed.** Extracted from
  `coverageDepthMatrix.test.ts:559`'s bytes and evaluated: the template's `\*\*` yields `\*\*`, two
  literal asterisks, so the bold markers are required. Its remaining defect is `exec`, not the escape
  (`M3`).
- **No other doubled escape.** I extracted every regex literal from
  `coverageDepthMatrix.test.ts`, `stageEvidenceCounts.test.ts` and `retractedClaims.test.ts` by
  scanning the files' bytes and evaluated each. The only escape-shaped patterns that could degrade —
  `/^(?:\*\*Class |## )/m`, `/^\*\*Class ([A-Z]) — property: (.+?)\.\s/gms`,
  `/^Sizes, derived from the table above: \*\*(.+?)\*\*/m`,
  `/\*\*(\w+)\*\* rounds, \*\*(\d+)\*\* reviewer responses…/` and the two `new RegExp` templates at
  `:440` and `:559` — all resolve to literal asterisks. Nothing else is a backslash-plus-quantifier.
- **The retracted-claims corpus is clean outside its own file.** 32 needles, 3564 files, the two
  flattenings the guard uses. See section 4.
- **The `Delta Rejected Guard` table's content.** All 11 `TRACKED` + `HELPERS` files have a row with a
  real verdict today; the vacuity in `B3` is a property of the check, not of the table.
- **`P1d` is not re-opened** and no measurement of mine touches `DR-0017-0010`.
- **No rejected option is reintroduced.** `B4` is about the *reason given*, not about a reintroduction.

## Required gates and residual risk

| gate | state at `1d7c0c3f` |
| --- | --- |
| `validate --profile atdd --fail-on error --spec 0017` | **exit 1**, `error=1`, `QFAI-ATDD-112` on 8 TCs — as recorded |
| `validate --profile full --fail-on error` | **exit 1**, `error=49` — as recorded |
| `vitest run tests/assets/{stageEvidenceCounts,coverageDepthMatrix,retractedClaims}.test.ts` | **exit 0**, 28 passed |
| `pnpm -C packages/qfai test:e2e` (1445) | **not re-measured** — see `A1` |
| `vitest --project integration --project unit` (1219) | **not re-measured** — see `A1` |

Residual risks and blocking assumptions:

1. Three of the four guards this round says were repaired are broken again in the direction they were
   repaired for (`B1`, `B2`, `B3`), and a fourth carries the sibling defect of one already retired
   twice (`M3`). The pattern across rounds 15, 16 and 17 is not "the repair missed a case" — it is
   that each repair is validated against the mutation named in the finding and against nothing else.
   **The countermeasure that would change this is a falsification list per guard, kept in the file,**
   the way `shippedLaneCommands.test.ts` keeps `PLANTED` / `ROOT_CAUSES` / `MECHANISMS`. Every break
   above took one plant and one `vitest` run.
2. The one artifact no guard in this stage covers is **the shipped tree outside
   `.github/workflows/**`**. `A1` is a sibling's plant, not mine, and I leave the finding to them —
   but two reviewers arriving at the same uncovered surface independently is the shape the request's
   section 1 predicted.
3. `B5` means this round's measurements have a provenance caveat that only re-running removes. I
   re-ran everything; a later round cannot assume the same of round 17's *other* reports unless they
   say so.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts, line numbers and measured runs
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to none
- [x] Required gates and residual risks recorded
- [x] Subject not modified: every plant restored from a copy taken first, `git checkout` never used on
      any path; `git status --porcelain` empty at finish

**Revision at finish:** `1d7c0c3f` — unchanged from start. `git status --porcelain` empty.

Findings: `B1`, `B2`, `B3`, `B4`, `B5`, `M1`, `M2`, `M3`, `M4`, `m1`, `A1`.
