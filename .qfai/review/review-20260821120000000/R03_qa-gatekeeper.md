# REVISE — qa-gatekeeper, stage gates, /qfai-atdd spec-0017 (round 9)

- Revision reviewed: `05a97202`, on `feature/chg-007-layered-ci-scaffold`.
- `git status --porcelain` at my start: **empty**. `git rev-parse --short HEAD` at my start and at my
  finish: **`05a97202`** both times. HEAD did not move.
- `.qfai/report/` hashed before and after my whole run (1507 files, digest-of-digests
  `67dbc8ef06a9ef99df...`): **byte-identical**. Both `validate` runs went to a `git archive HEAD`
  shadow root at `tmp/qa-r9/shadow` with all **83** tracked symlinks re-materialised as
  relative-target symlinks (`dir /AL` reports `<SYMLINKD>` with `..\..\` targets, not `<JUNCTION>`;
  0 absolute, 0 non-symlinks). No spurious `QFAI-LINK-001`.
- Every oracle mutation was reverted in the same step with a sha256 comparison printed, and
  `git status --porcelain` was empty after each mutation batch. Scratch confined to `tmp/qa-r9/`.
- For the record, not a finding: `R01_implementation-reviewer.md` appeared in this pack at 05:56,
  after my 05:36 start. That is a sibling reviewer, not a tree move; HEAD and the tracked tree are
  unchanged.

## Verdict

**REVISE.** 8 blocking, 9 advisory. The two gate numbers the request asked me to verify both reproduce
exactly, the P7 sequence and all eight pack seals reproduce, and the record's own `FAIL` is accurate —
but four of the six instruments this round repaired are still evadable, and I broke each by mutation
rather than by reading.

| gate | status |
| ---- | ------ |
| Validate hard gate | **FAIL** — reproduced exactly: scoped `error=2` exit 1, unscoped `error=4` exit 1 |
| Coverage obligations | **PASS** as recorded — every claimed number reproduced item-for-item |
| Coverage Depth Matrix | **PASS** on presence, partition and per-`❌` justification; `B1` is a content finding against `US-0017-0004`'s justification |
| Runtime proof (instruments) | **PASS** — `e2e` project 1433 passed / 16 skipped at HEAD, the exact certified figure; P7 callsite sequence reproduces per commit |
| Runtime proof (workflow run) | **PENDING** — class B of the matrix, open risk 6; not this round's subject |
| RED/GREEN observation gate | **no subject** — no ledger row advanced; both candidate rows are `todo` |
| P1d / branch 3 (`TDD-0070`) | **CLOSED at round 7. I did not re-open, re-route or re-decide it.** |
| Prototyping evidence | **N/A** — no calibration pack and no prototyping obligation on this spec |

### On P1d, explicitly

P1d passed at its sixth pass on `DR-0017-0010`. That gate is closed, nothing in this report reopens
it, and I formed no opinion on the branch-3 account. Where `DR-0017-0010` appears below it is only as
one of the five governance files the retracted-claims guard searches.

### On the RED/GREEN observation gate, explicitly

`## Ledger rows advanced` says none advanced, and `tdd/test-list.md:107-108` confirms it: `TDD-0069`
and `TDD-0070` are both `Status = todo` with `DR-ID: -` and `Blocked-By: -`. I tallied the whole
ledger independently — 82 rows, 71 `Integration` + 11 `Unit`, 74 `refactor` / 6 `blocked` / 2 `todo`,
the 6 `blocked` being `TDD-0016`, `-0030`, `-0032`…`-0035` and the 2 `todo` being `TDD-0069` /
`TDD-0070`. So there is no observation to judge: no row produced a RED or a GREEN this round, and
nothing here is offered as a substitute for one. A verdict on an observation is not owed and is not
given.

## Validate hard gate — both claims verified

Run from the shadow root against the real `dist` (verified newer than every `src/**/*.ts`):

```text
validate --profile atdd --fail-on error --spec 0017
  -> exit 1, counts: info=2 warning=0 error=2
     QFAI-ATDD-111  SPEC-0017:US-0017-0007
     QFAI-ATDD-112  8 TCs: TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070

validate --profile full --fail-on error
  -> exit 1, counts: info=4 warning=404 error=4
     QFAI-REVIEW-004  review pack has no summary.json   (this pack, in flight)
     QFAI-REVIEW-005  review pack has no Rxx_*.md       (this pack, in flight)
     QFAI-ATDD-111    12 US across 5 specs
     QFAI-ATDD-112    15 TCs across 4 specs
```

`error=2` and `error=4`: both exactly as the record claims, including its disclosure that two of the
four are against its own in-flight pack. The per-spec breakdowns in `## Gaps / Open risks` items 3 and
4 reproduce item-for-item — `-112`: 0003 (1), 0008 (4), 0015 (2), 0017 (8) = 15; `-111`: 0003 (8),
0006 (1), 0008 (1), 0015 (1) = 11, plus `US-0017-0007` = 12. No `QFAI-COV-201/202/203`; the 404
warnings include the 116 `QFAI-COV-207` single-case signals, which are warnings by design.

## Blocking findings

### B1 — I planted five real builds in five shipped lanes and `US-0017-0004`'s own assertion stayed green. 34 of 40 forms are unseen

This is round 8's `B4` again, repaired only for the eleven forms round 8 happened to write.

End to end, not by reasoning: I replaced all five `echo` placeholders in
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` with real builds and ran the story's
own test.

```text
line 161  run: bash -c "pnpm build"
line 174  run: cross-env NODE_ENV=production tsup
line 187  run: npm-run-all build:main build:types
line 200  run: pnpm --no-frozen-lockfile build
line 213  run: node scripts/bundle.mjs

vitest run --project unit tests/unit/buildCommand.test.ts -t "shipped tree"
  -> 1 passed. "finds no build in the shipped tree, which is what US-0017-0004 needs" — GREEN,
     with five builds in it.

file sha256 before 581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee
file sha256 after  581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee   (reverted)
```

Then the classifier directly, no script map, which is what the shipped-tree test uses. **34 of 40 real
build forms return `none`**, in four families:

1. **The build verb is not the word `build`.** `mvn package`, `mvn install -DskipTests`, `mvn verify`,
   `dotnet publish -c Release`, `dotnet pack`, `go install ./...`, `sbt compile`, `gradle assemble`,
   `gradle jar`, `tsc -p tsconfig.build.json`, `tsc --build` — all `none`. This is v4's naming defect
   with the sign flipped: the predicate now recognises a build only when the *word* appears.
2. **A bare tool with a default target.** `make`, `make all`, `make -j4`, `ninja` — all `none`. The
   token loop starts at index 1, so a one-token command can never reach a verdict.
3. **The interpreter has no flag grammar.** `bash -c "pnpm build"`, `bash -lc '…'`, `sh -c 'npm run
   build'`, `pwsh -Command 'pnpm build'` — all `none`. `INTERPRETERS` is stripped by name and the next
   token is `-c`, so the loop breaks exactly as wrappers did before v11. The repair v11 applied to
   `WRAPPERS` was not applied one line up.
4. **The wrapper list is the six forms that were measured.** `cross-env NODE_ENV=production tsup`,
   `npm-run-all`, `concurrently`, `setsid`, `flock`, `taskset`, `chrt`, `unbuffer`, `retry` — all
   `none`. `cross-env` is more idiomatic in a JS repository than `ionice`, `stdbuf` and `xvfb-run`,
   which are all listed.

Plus `pnpm --no-frozen-lockfile build` and `pnpm --shell-emulator build`: a boolean manager flag not
in `MANAGER_BOOLEAN` consumes the script name, so the default-to-consume rule loses the build whenever
such a flag sits immediately before it.

Controls held: `pnpm build`, `nice -n 19 pnpm build`, `timeout 600 pnpm build` and
`docker buildx bake -f docker-bake.hcl` are all flagged, and `cargo build --release`, `swift build`,
`bazel build //...`, `docker compose build` and `cmake --build build --config Release` survive their
flags. v11 is a real improvement on the eleven forms it was written for.

The direction matters, and the record already says so at `## Gaps / Open risks` item 7.7: for an
assertion that a tree contains no build, a miss is the vacuity direction. `qfai init` ships a template
for JS repositories, and the four most idiomatic JS spellings of a build in a lane body — an explicit
shell, `cross-env`, `npm-run-all`, a plain script file — are all invisible.

### B2 — the deletion sweep's claim is scoped to what `GRAMMAR` exports, and nine decision-bearing members outside it survive deletion

`GRAMMAR`'s docstring says "Every set the grammar is built from, exported so a corpus can be checked
for **naming each member**", and the sweep asserts "deleting any one grammar member reddens the
corpus". Both are true of the thirteen exported sets — I confirmed that independently, see "What I
could not break". Neither is true of the decision-bearing lists that are not exported. Eighteen
mutations, each applied, measured against the whole 20-test file by exit code, and reverted:

```text
CONTROL: BUNDLERS drop tsup                    reddens (13 failed)
SCRIPT_FILE drop .sh                           reddens
SCRIPT_FILE drop .ps1                          SURVIVES
SCRIPT_FILE drop .bat                          SURVIVES
SCRIPT_FILE drop .cmd                          SURVIVES
SCRIPT_FILE drop .mjs                          reddens
SCRIPT_FILE drop .cjs                          SURVIVES
SCRIPT_FILE drop .js                           SURVIVES
SCRIPT_FILE drop .ts                           SURVIVES
namesABuild drop ':' separator                 reddens
namesABuild drop '-' separator                 reddens
namesABuild drop '_' separator                 SURVIVES
namesABuild drop '.' separator                 reddens
namesABuild drop '/' separator                 SURVIVES
stripPrefix guard 8 -> 1                       reddens
isSetting always false                         SURVIVES
isPathLike drop the extension test             reddens
strongest: heuristic -> none                   reddens

helper sha256 before c4323b79f102a48ff6aa7ed051ad40e56defe3170a46bd2017eabf6833c212c3
helper sha256 after  c4323b79f102a48ff6aa7ed051ad40e56defe3170a46bd2017eabf6833c212c3
```

Nine survivors. Six of the eight `SCRIPT_FILE` extensions and two of the five `namesABuild`
separators are members in exactly the sense `MANAGER_BOOLEAN.--verbose` is one — a list of
alternatives that decides verdicts — and no case pins them.

The sharpest is the last: **`isSetting` can be reduced to a constant `false` and the whole corpus
stays green.** The helper's docstring lists it as one of v9's three headline rules ("a bare token
carrying `=` is a setting, not a subcommand: `cargo --config build.jobs=2 test`"), and the example it
gives is decided by `--config` consuming its value, not by this rule. The rule is not dead — without
it, `make build_dir=out clean` becomes a false-positive build, because `namesABuild` splits on `_` —
so this is a live rule with no probe, which is exactly the state v10 deleted forty-five members for
being in. The measurement that found those forty-five cannot see this one, because it enumerates the
export rather than the grammar.

Required: bring these lists into `GRAMMAR` so the sweep enumerates them, or state in the sweep what it
does not cover. The claim as written is broader than the measurement.

### B3 — "Measured, not assumed: a sweep deleting each of the **208** members" — the grammar holds **250**

`tests/unit/buildCommand.test.ts:812-813` and `.qfai/evidence/coverage-depth-spec-0017.md:266` both
say 208. Counting `MEMBER_CASES` rows at both revisions:

```text
eb5d59af  (v10, round 8's apply commit)  MEMBER_CASES rows = 208
05a97202  (HEAD, v11)                    MEMBER_CASES rows = 250
```

208 was correct at `eb5d59af`, and the very next commit — `f544daad`, the v11 commit — took it to 250
without touching the sentence. My own sweep over the live grammar reports `members=250 cases=250`.

This is the recurring defect class of item 7, inside the sentence that claims measurement, in the
commit written to close it. Nothing catches it: `stageEvidenceCounts.test.ts` derives numbers stated
in the *record*, and this number is stated in a test comment and in the matrix.

### B4 — `retractedClaims.test.ts` is broken a fifth time, and the round-8 exempt-span repair opened two of the three holes

Five laundering shapes against `.qfai/evidence/atdd-spec-0017.md`, each appended, measured and
reverted (file sha256 `b41ec959d44ce576...` before and after every one). The needle is the listed claim
`0 misclassified`; the plain control is the shape the stage measured as reddening.

```text
control      caught     (guard red)          plain assertion, no adjacent construct
blockquote   LAUNDERED  (guard GREEN)        one blockquote line under the sentence, no blank line
fence        LAUNDERED  (guard GREEN)        a fenced block under the sentence, no blank line
oddquote     LAUNDERED  (guard GREEN)        one stray quote mark before it, a real quotation after it
listitem     caught     (guard red)
```

1. **Blockquote and fence adjacency.** `occurrences()` marks the *whole flattened paragraph* exempt
   whenever `shownSpans` finds anything, and paragraphs are split on blank lines. So one blockquote
   line or one fence opener placed under a sentence, with no blank line between, exempts every claim in
   that paragraph wholesale. `MD031` would forbid the adjacency, but `.qfai/evidence/**` is outside
   both prettier and markdownlint, which is the same fact this file's docstring relies on to establish
   that its line breaks are hand-wrapped.
2. **The odd-quote alternate pairing is not a small widening.** With `2k+1` marks, `pairFrom(0)` and
   `pairFrom(1)` together cover *everything between the first and last mark*: 3 marks give `(m0,m1)`
   and `(m1,m2)`; 5 give `(m0,m1),(m2,m3)` and `(m1,m2),(m3,m4)`. In a record this densely quoted, one
   stray mark before an assertion exempts it as long as any real quotation follows. The comment
   discloses that a launder would have to introduce a stray quote mark to use it. That is a
   one-character cost, and I measured it working.

How much of the corpus is already unpoliced, computed with the guard's own span logic:

```text
                                        paragraphs   wholesale-exempt   chars exempt
atdd-spec-0017.md                          245            23             12.2%
coverage-depth-spec-0017.md                 74             2             16.4%
DR-0017-0010 ....md                         53             2             10.4%
CR-20260820-0012 ....md                     41             2             11.7%
CR-20260820-0011 ....md                     33             2              7.5%
all five                                   446            31             12.5%
```

8.1% of the main record is exempt from fences and blockquotes alone. No paragraph currently carries an
odd mark count above one, so hole 2 is dormant at HEAD, one character from live.

The two exemptions were added to stop false accusations, and that reason is sound: reddening a
required CI leg on a correct edit is the worse failure. The fix is to narrow the span to the fence and
blockquote *lines* rather than the paragraph containing them, and to bound the alternate pairing to
the region after the stray mark instead of unioning both readings.

On the second half of request item 3, is a retraction my role established in rounds 3-8 still missing
from the list? I harvested **534** quoted phrases of six words or more from every `qa-gatekeeper`
report in the nine packs and searched all five governance files with the guard's own quotedness logic.
49 unquoted occurrences are not covered by the 19-entry list; spot-checking them, they are section
headings and statements that are currently true, not refuted wordings. So I cannot name a specific
missing retraction. What I can say is that the question has become the wrong one: with three working
laundering shapes, "nothing is missing from the list" and "no refuted claim stands" are different
statements, and only the first is checkable.

### B5 — the `.each` / `.for` precondition is evaded by any modifier in the chain, at a live 2-test divergence

Round 8's `A6` was that a precondition naming one of two equivalent constructs does not hold. The
repair added `.for` beside `.each` in `/^[ \t]*(?:it|test|describe)\.(?:each|for)\b/m`, which requires
the expander to sit *immediately* after `it` / `test` / `describe`. vitest's modifiers sit in between.

Mutating one `it(` in `tests/assets/retractedClaims.test.ts` (sha256 `c695204cb9fc71ac...` before and
after each):

```text
it.each([1, 2, 3])(...)              guard(stageEvidenceCounts) = red     <- the declared form
it.concurrent.each([1, 2, 3])(...)   guard(stageEvidenceCounts) = GREEN
it.sequential.each([1, 2, 3])(...)   guard(stageEvidenceCounts) = GREEN
it.concurrent.for([1, 2, 3])(...)    guard(stageEvidenceCounts) = GREEN
```

And the divergence measured live rather than argued:

```text
vitest run --project e2e tests/assets/retractedClaims.test.ts
  -> tests/assets/retractedClaims.test.ts (9 tests)   Tests 9 passed (9)
record states 7   countCases() returns 7
stageEvidenceCounts.test.ts + coverageDepthMatrix.test.ts -> 12 passed, both GREEN
```

Nine tests run where the record says seven, with every derived-count guard green. `it.skip.each` and
`it.only.each` are in the same class. The precondition should allow an arbitrary modifier chain:
`^[ \t]*(?:it|test|describe)(?:\.\w+)*\.(?:each|for)\b`.

### B6 — the corpora are still counted two ways, in two files, and neither enumeration has eight members

Round 8's `A10` was "the corpora were counted three ways", reported fixed as "Eight, enumerated once".

`atdd-spec-0017.md:702` says "Measured against **eight** corpora, and this is the enumeration both
evidence files count from", then lists nine noun phrases: round 4's 20 regressions; v4's 15 kept forms;
round 6's 46-case corpus; round 7's 59 probes; round 8's 66; round 8's 11 planted builds and 6 wrapper
forms; the non-builds accumulated across every round; one case per grammar member; every `run:` line
in both workflow trees.

`coverage-depth-spec-0017.md:269` enumerates a **different nine**: round 4's 20 measured regressions;
round 5's 10 measured defects; round 6's 7; round 8's 6 missed and 4 invented; round 8's eleven planted
builds and six wrapper forms; v4's 15 kept forms; the non-builds five rounds accumulated; one case per
grammar member; every `run:` line in both workflow trees.

Round 7's 59 probes are in the first list and not the second; round 5's 10 and round 6's 7 are in the
second and not the first. So there are two enumerations, of nine members each, and the sentence
asserting that both files count from one of them is false. `atdd-spec-0017.md:233` repeats the count as
"20 tests over the eight corpora". The test file's own corpus arrays number thirteen across ten test
blocks, so "eight" is not reproducible from the instrument either.

### B7 — the anchored version pin reads the first match only, so a second, false statement of the version is invisible

Round 8's `A7` was that the version pin was satisfiable anywhere in the record. The repair anchored it
to the sentence naming the helper, and used `.exec`, which returns the first match. Mutating
`.qfai/evidence/coverage-depth-spec-0017.md` (sha256 `7e592e9cd778b343...` before and after each):

```text
replace the one sentence with v7                       guard = red     (control)
add a SECOND sentence naming v7, AFTER the true one    guard = GREEN
add a SECOND sentence naming v7, BEFORE the true one   guard = red
```

The pin holds only if the false statement is placed first, which is chance. `exec` where `matchAll` is
needed is the defect round 6 required fixed in this stage's guards and round 7 found still live at a
third site; `stageEvidenceCounts.test.ts` was corrected for it in four places, and this pin, written
one round later, reintroduces it. The same `.exec` shape sits on the `US-0017-0007` section lookup in
the same file.

### B8 — the committed Hard Gate artifact is not the run of the revision it certifies

`## Commands executed` cites `.qfai/report/validate.spec-0017.json` as this stage's Validate Hard Gate
evidence, and round 8's `A11` was that a later reader could not check it. It is force-added now, and
what was added is a four-round-old run.

```text
committed .qfai/report/validate.spec-0017.json   traceability.matchedFileCount = 465
fresh run at HEAD in the shadow root             traceability.matchedFileCount = 467
diff with volatile fields removed: that field, and nothing else

tracked test files matching the configured globs, per revision:
  0cfa67c9  465   <- round 4's apply commit, 08-20 23:36
  3f815725  466
  cb91e089  467
  eb5d59af .. 05a97202  467
```

So the committed artifact is the output of a run made at `0cfa67c9` or earlier, force-added at
`f544daad` (08-21 05:32) as this round's gate evidence without being re-run. The gate *verdict* is
unaffected: I reproduced `error=2` with the same two findings, the same content and every other field
identical. But the artifact exists for auditability, and a reader checking it is reading round 4's
tree. Re-running the scoped command and re-adding the JSON is a one-line fix.

## Advisory findings

### A1 — the tool pinning shape asserts a fact about flags that is false for optional-argument flags, and the corpus cannot see it

Every tool value-flag member is pinned by `<tool> <flag> build clean` expecting `none`, which asserts
"this flag always consumes the next token". GNU make's `-j`, `--jobs` and `-l` take an *optional*
argument, so a non-numeric next token is a target:

```text
none   make -j build          <- GNU make: unlimited jobs, target `build`. A real build.
none   make -j build clean    <- the pinning case for TOOLS.make.values.-j
none   make --jobs build
none   make -l build
build  make -j 4 build        <- correct, and asserted by the v8-regression list
build  make -j4 build         <- correct
none   ninja -j build         <- correct: ninja's -j is mandatory-argument
none   cargo -j build         <- correct
```

The sweep is green on all of these, because the corpus is derived from the grammar's claim rather than
from the tool. That is v7's "-B is boolean" defect one notch over: at the level of "does this flag take
an argument" instead of "does this flag exist". Related: `sbt build`, the pinning case for `TOOLS.sbt`,
is not an sbt task at all, while the real ones (`sbt compile`, `sbt package`) are `none`.

### A2 — four false positives in six probes, from the new wrapper grammar

```text
build  command -v tsup                        checks a binary exists; runs nothing
build  command -v vite || npm i -g vite       the idiomatic existence probe
build  timeout 5 docker buildx bake --print   --print renders the plan
build  stdbuf -oL npx tsup --help             --help builds nothing
```

`command` is a `WRAPPERS` entry with an empty `values` list, so `-v` is skipped and its argument is
read as the command. Lower stakes than `B1` because these fail toward reddening the guard, but they
would break the own-tree pinned set on a legitimate addition, and `command -v` before a bundler is not
an exotic line.

### A3 — two of the 23 derivation strings in `### Findings per round` misdescribe the identifiers they claim

The numbers are right; the derivations beside them are not. Counting identifier headings mechanically,
allowing the backtick and bold wrappers the reports use:

- round 4 `qa-gatekeeper` (stage): table says `6`, id families `B1-B6`. The report's identifier
  headings are `B1`, `B2`, `M4`, `M4b`, `B6`, `B6b`. Six, so the count holds, but three of the six `B`
  numbers the range claims have no heading.
- round 5 `qa-gatekeeper` (stage): table says `12`, id families `B1-B10, M1-M3`. That reads as 13. The
  report has `B1`-`B10` plus `M1` and `M3` as headings, `M2` appearing only inline, so 12 is right and
  the range over-claims by one.

Everything else in the table reproduces: all 21 other slots match a mechanical heading count,
including round 6's `completion-reviewer` at 17 against a `summary.json` of 18.

### A4 — the declared feedback-count rule does not produce the recorded numbers for the reports it was written for

The rule is "distinct finding identifiers ... or the count of heading-level-3 sections where a report
uses no identifiers", and the table explains three stage reports as enumerating advisories **inline**
rather than as headings. Round 1's `R03` has **zero** `###` headings and **five** `## Finding N`
headings, and its `summary.json` records 5. So that report is enumerated as headings, at H2 with a word
prefix, and the recorded number is exactly derivable. Round 2's `R03` has four `###` sections against a
recorded 9. Either the rule should say "identifier headings at any level, or `## Finding N`", or the
exception should name what those reports actually do.

### A5 — the sweep's restore is not order-exact for `TOOLS` and `WRAPPERS`

`deleteMember` restores a set by clearing and re-adding in original order, and the comment says why
("not for the two tests that compare member lists"). For a whole tool or wrapper it uses
`Reflect.deleteProperty` and then re-assigns, which moves the key to the end of the object. After the
sweep, `Object.entries(GRAMMAR.tools)` is fully rotated. Harmless today, because every later assertion
is order-insensitive, but "the restore has to be exact, or every test after this one is measuring a
different grammar" is not quite what the code does.

### A6 — a sentence in `## Final status` reads as an outstanding P1d requirement for a gate that passed

"`TDD-0070` is **not yet** `exception`: that needs the P1d `qa-gatekeeper` PASS on `DR-0017-0010`". The
PASS was granted at pass 6, and the same sentence goes on to say so. The true reason the row is not
`exception` is that the ledger cell has not been written, which is the next clause of the same list.
Recommend re-wording to name the ledger write as the outstanding item rather than the gate.

### A7 — `.qfai/report/specs-coverage/spec-0017.md` does not exist in the tree

That path is one of my declared inputs. `.qfai/report/specs-coverage/` holds `spec-0001.md` through
`spec-0007.md` on disk (last written 08-20 18:34), and only `spec-0012.md` is tracked. I obtained
spec-0017's report by reading the one my shadow `--profile full` run produced. Coverage there is clean:
every `AC` has 2-3 `TC`, every `BR` has an `EX`, every `EX` has a `TC`, no `QFAI-COV-201/202/203`.
Worth either regenerating the directory or dropping the citation.

### A8 — the ledger's `TDD-0069` `Evidence` cell still carries all three refuted statements

Verified at `tdd/test-list.md:107`: "NOT BLOCKED by a CR", "the workflow changes are unmerged and CI
has not run them", and "becomes implementable once the pull request has three green ci-pass runs to
cite". All three are in `RETRACTED`, and the guard excludes that file deliberately, on Drift-Protocol
grounds I accept. Accepted as a handover, as rounds 6-8 did. The residual worth stating: this is the
file `/qfai-implement` reads to *select* the next row, so of all the places a refuted reason can stand,
this is the one most likely to be acted on.

### A9 — two more member cases are commands their own tool would reject

Beyond `sbt build` in `A1`: `docker --name build clean` and `docker -t build clean` put `docker run` and
`docker build` flags in docker's global position, where docker accepts neither. The verdicts are right
for the wrong reason. This follows from scanning all tokens without tracking the subcommand, which is
also what makes `docker build -t x .` work, so it may be the right tradeoff. But the pinning case then
documents a command shape that cannot occur.

## What I could not break, having tried

- **The deletion sweep, on its own terms.** I re-implemented `grammarMembers`, `deleteMember` and
  `MEMBER_CASES` against the live grammar and measured **attribution**, which the sweep itself does not
  require: for all **250** members, the member's **own** case detects its own deletion, and 0 of 250
  are noticed only by a sibling. The hardcoded table really does pin per member, and the property the
  round-8 repair claimed is the property it has, within `GRAMMAR` (see `B2`).
- **All eight pack seals recompute**, over LF-normalised bytes, and the two written this round are
  among them. The pack set named in the record equals the nine directories on disk from
  `review-20260820200000000` on, and the newest is correctly named without a seal.
- **Both superseded seals are verifiable, and I verified them the hard way.** Round 1's reproduces over
  the pack minus `summary.json`. Round 7's I recomputed against the *historical* blob: sha256 over the
  pack with `dbe00247`'s `summary.json` gives exactly the recorded `3d56fd2edd484c0f...`, and with the
  current one exactly `022c3addd80a7d9a...`. That proves the re-seal moved `feedback_count: 3 -> 8` and
  changed nothing else, which is the check the record says the superseded value exists to enable.
- **The P7 sequence's two columns.** Recomputed from `git show` per commit over the `e2e` project's two
  include globs: 858, 861, 864, 867, 868, 868, 869, 869. Every delta as printed. And the invariant
  holds through HEAD: `b016623b`, `aab29486`, `f544daad` and `05a97202` are all 869, so no later commit
  owes a row. The left column's endpoint checks out live: the `e2e` project at HEAD is **1433 passed /
  16 skipped (1449)**, exactly the certified figure, and `1422 + (869 - 858) = 1433`.
- **The findings table's 23 slots.** 23 reviewer responses across the nine packs (2+4+3+3+3+3+3+2, plus
  this round's in-flight one), 21 of them in rounds 1-7 as `## Final status` says. Twenty-one of the 23
  finding counts reproduce mechanically; the two exceptions are `A3`, where the number is right and the
  range is not. The "five packs" whose `summary.json` disagrees with the derived count are exactly packs
  1, 2, 4, 5 and 6.
- **Request item 5(a): leaving those five as written is the right call.** Re-sealing five closed packs
  to move a bookkeeping figure would destroy the one property that made round 7's re-seal auditable.
  Stating the rule beside the table is the better answer. `A4` is about the rule's wording, not the
  decision.
- **Request item 5(b): committing the JSON and marking the run directory regenerable is the right
  call** - a timestamped directory name is not reproducible by a later run. `B8` is that the call was
  mis-executed, not that it was wrong.
- **Item 7's defect-class list** has exactly seven entries and the count is stated as the list's length.
  Items 3 and 4's per-spec numbers reproduce item-for-item against my own runs.
- **The Coverage Depth Matrix's arithmetic**, checked independently of its guard: 9 rows, totals 3 / 1 /
  5, 38 depth failures plus 5 in `Status`, partition `A 30 + B 7 + C 1 = 38`, every failing cell in
  exactly one class, every class with a property and a distinguishing body, a justification section per
  failing row and none for a row that is not failing. Depth-wise the failing normal-path and error-path
  cells are all class A with a per-row account of what is absent, so they are justified rather than
  unexplained, which is what my mandate asks of them.
- **Coverage obligations**, re-derived: 82 ledger rows, 63 `Integration` at `refactor`, the 8 uncovered
  `L3` TCs being exactly the 6 `blocked` plus 2 `todo` that `QFAI-ATDD-112` names, and `US-0017-0007`
  the single `QFAI-ATDD-111` subject. The first `RETRACTED` entry's replacement value ("63 refactor, 6
  blocked and 2 todo") is exactly what the ledger holds.

## Required fixes

Blocking, in the order I would take them:

1. `B1` - give `INTERPRETERS` a flag grammar, admit a one-token tool invocation, and either widen
   `WRAPPERS` past the measured six or state the miss direction as a limit of the assertion. Then
   re-run a planted-build round with forms nobody in this stage chose.
2. `B2` - bring `SCRIPT_FILE`, the `namesABuild` separators and `isSetting` under the sweep, or narrow
   the sweep's claim to what it enumerates.
3. `B3` - 208 to 250 at both sites, and consider deriving it rather than typing it.
4. `B4` - narrow the exempt span to the fence and blockquote lines; bound the alternate pairing to the
   region after the stray mark.
5. `B5` - allow an arbitrary modifier chain before `.each` / `.for`.
6. `B6` - one enumeration, in one place, with the count equal to its length, and the other file
   pointing at it.
7. `B7` - `matchAll` instead of `exec`, here and on the `US-0017-0007` section lookup.
8. `B8` - re-run the scoped gate at HEAD and re-add the JSON.

## Residual risks recorded

- The validate hard gate fails at HEAD and the record says so; `US-0017-0007` is uncovered by choice
  and `QFAI-ATDD-112` names 8 unimplemented rows. Nothing in this round changes that, and completion
  remains blocked on it.
- `QFAI-REVIEW-004` will still be live after this report lands, until this pack gets its
  `summary.json`. `QFAI-REVIEW-005` clears with this file.
- The workflow-run runtime surface (matrix class B, open risk 6) remains unconsumed, and
  `CR-20260820-0012` still gates the two rows that would consume it. Not this round's subject.
- `B1`, `B2` and `A1` are the same shape: the instrument is checked against its own claims rather than
  against the world. Eleven versions in, the corpus's authority still comes from who chose it.

## Sign-off

- [x] Review verdict is explicit: **REVISE**, 8 blocking and 9 advisory, every one of the 17 a heading.
- [x] Findings cite concrete artifacts, line numbers, commands and measured output; every mutation was
      reverted in the same step with a byte comparison printed.
- [x] Required gates and residual risks are recorded. P1d is closed and was not re-decided. The
      RED/GREEN observation gate has no subject this round and no verdict is claimed for it.
- HEAD at finish: `05a97202`. `.qfai/report/` byte-identical to my start. Working tree clean.
