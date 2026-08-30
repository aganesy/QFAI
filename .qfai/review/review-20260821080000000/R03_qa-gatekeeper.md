# R03 — qa-gatekeeper (stage), round 7

- Stage: `/qfai-atdd` (spec-0017)
- Revision reviewed: `9a37421c`
- `git rev-parse --short HEAD` at start: `9a37421c`; at end: `9a37421c` — **HEAD did not move**
- `git status --porcelain` at start: **empty**; re-confirmed empty after every mutation step and at the end
- Method: read-only except this file. Every oracle mutation reverted in the same step with a sha256
  comparison printed. Scratch under `tmp/r7-qa/` only. `validate` run against a `git archive HEAD`
  shadow root with all 83 tracked symlinks re-materialised from the index; the real
  `.qfai/report/` tree hashed before and after (1507 files, digest unchanged).

## Verdict: **REVISE**

11 blocking, 7 advisory. v7 is broken 15 ways over 59 probes I chose;
`retractedClaims.test.ts` is defeated 5 of 8 ways and there is a **live violation at HEAD**;
`stageEvidenceCounts.test.ts` still has round 6's first-match hole, demonstrated green;
`coverageDepthMatrix.test.ts` **requires the record to keep a version name that is two versions
stale**, so the correct edit reddens it; and P1d's round-6 blocking item 2 — six sites it named by
file and line, with the wording supplied — is **1 of 6 applied**, in a class P1d has said it will
not re-raise.

What did hold, measured: all six recorded pack seals and round 1's superseded seal recompute; both
suite totals (1431/16 and 1191/19) are exact; the scoped gate is `error=2` and the full profile
`error=4` with exactly the four codes claimed; the unscoped `QFAI-ATDD-111` / `-112` breakdown is
right to the identifier; `ci:lint` exits 0 across all eleven members; the matrix arithmetic
(38 cells, A 30 / B 7 / C 1, ✅ 3 / ⚠️ 1 / ❌ 5) is correct and derived; 24 of my 34 artifact
mutations redden.

## 1. Break v7 (request question 1)

I ran 59 commands of my own choosing through `classifyBuildCommand` with the two real manifests
loaded, and 23 mutations of the helper against the committed corpus. Harnesses:
`tmp/r7-qa/probe.mjs`, `tmp/r7-qa/probe2.mjs`, `tmp/r7-qa/mutate2.mjs`.

**15 defects: 6 missed builds, 9 false positives, and three commands that get two verdicts
depending on how a flag is spelled.**

### `B1` (BLOCKING) — `DIRECTORY_VALUE_FLAGS` re-creates the exact class round 6 measured

`packages/qfai/tests/helpers/buildCommand.ts:132` puts `-B`, `-S`, `--source`, `--output` and `-o`
into the set whose members make the next bare token "a location and not a subcommand". Three of
those are **boolean** flags in the very tools the set is applied to:

- `-B` is `make`'s `--always-make`
- `-S` is `make`'s `--no-keep-going` and `gradle`'s `--full-stacktrace`

Measured:

```text
none    make -B build                        <- build. -B is --always-make, boolean
build   make --always-make build             <- the same command, spelled long
none    make -S build                        <- build. -S is --no-keep-going, boolean
build   make --no-keep-going build           <- the same command, spelled long
none    gradle -S build                      <- build. -S is --full-stacktrace, boolean
build   gradle --full-stacktrace build       <- the same command, spelled long
none    gradlew -S build                     <- same, through the wrapper
```

This is round 6's finding twice over in one line of code. It is the `sawFlag` regression class —
"a flag ended the subcommand position, so a build became `none`" — narrowed from *all* flags to a
six-member set that still contains three flags where the narrowing is wrong. And it is the
"one command, three verdicts across a flag's forms" defect, which v7 fixed for `--filter`/`-F` and
left standing for `-B`/`--always-make` and `-S`/`--full-stacktrace`.

The docstring at `:23-27` states the rule as "only a flag that takes a **directory**". `-B`, `-S`
and `-o` do not take directories in `make`, `gradle` or `mvn`; the set does not implement the rule
its own comment states.

### `B2` (BLOCKING) — v7's headline rule 3 is implemented on one of its two branches

`:29-30`: "Only a **target-naming** flag's value can name a target, so `--reporter=build-log` is not
a build." That is enforced at `:242`, inside the `flag=value` branch. In the **spaced** branch an
unknown flag's value is not consumed at all (`:262-265` sets `afterDirectoryFlag` false and falls
through), so the value reaches the bare-token handling at `:268-282` and **is** read as a target —
as a script name for a manager, and as a `namesABuild` subcommand for a tool, which yields the
strong `build` verdict.

```text
none        pnpm --reporter=build-log install     <- the case the rule was written for
heuristic   pnpm --reporter build-log install     <- THE SAME COMMAND, spaced
heuristic   npm --cache build-cache ci
build       docker run --name build-agent alpine  <- a container run, reported as a build
build       docker run --name build-agent alpine sh -c 'echo hi'
build       podman run --name build-x alpine
build       poetry run --directory build pytest
build       gradle --project-dir build test
build       make --directory build clean          <- --directory is make's long form of -C
none        make -C build clean                   <- THE SAME COMMAND, spelled short
build       cargo --config build.jobs=2 test
```

Eight false positives, six of them the strong `build` verdict rather than the labelled guess. Two of
them are the same command disagreeing with itself, which is the defect the corpus test at
`packages/qfai/tests/unit/buildCommand.test.ts:279-289` exists to forbid — that test enumerates the
three `--filter` forms and nothing else, so `--reporter=` versus `--reporter ` and `-C` versus
`--directory` are both outside it.

### `B3` (BLOCKING) — each new rule is pinned at exactly one member; 10 of 23 mutations survive

The corpus does not test the generalisation any of v7's new rules claims. It tests the single case
the previous round named. Measured against the committed 14-test file (baseline: 14 passed):

```text
GREEN <-- SURVIVES   M1  DIRECTORY_VALUE_FLAGS keeps only --install  (drops -B -S --source --output -o)
red (2 failed)       M2  DIRECTORY_VALUE_FLAGS emptied
GREEN <-- SURVIVES   M3  CONSUMING drops --filter-prod and --scope
red (1 failed)       M4  CONSUMING drops -F
red (2 failed)       M5  CONSUMING drops --filter
red (1 failed)       M6  CONSUMING drops workspace
red (1 failed)       M7  PASSTHROUGH drops buildx
GREEN <-- SURVIVES   M8  PASSTHROUGH drops workspaces
GREEN <-- SURVIVES   M9  PASSTHROUGH drops dlx
GREEN <-- SURVIVES   M10 PASSTHROUGH drops --
GREEN <-- SURVIVES   M11 NO_SCRIPTS drops --no-scripts
red (1 failed)       M12 NO_SCRIPTS emptied
GREEN <-- SURVIVES   M13 TARGET_FLAGS drops --task
red (1 failed)       M14 TARGET_FLAGS drops --target
GREEN <-- SURVIVES   M15 TARGET_FLAGS drops -m
GREEN <-- SURVIVES   M16 DIR_FLAGS drops --dir/--cwd/--prefix
red (1 failed)       M17 rule 3 removed on the INLINE branch
red (2 failed)       M18 v6 behaviour restored: ANY flag ends the subcommand position
red (1 failed)       M19 lifecycle hooks always run (noScripts gate removed in script())
red (1 failed)       M20 noScripts not propagated from command() into script()
GREEN <-- SURVIVES   M21 spaced TARGET_FLAGS branch disabled entirely
red (2 failed)       M22 afterDirectoryFlag consumption disabled
GREEN <-- SURVIVES   M23 isPathLike guard on inline target values removed
```

Per new surface the request named:

- `DIRECTORY_VALUE_FLAGS` — 1 of 6 members pinned (`--install`). `M1` deletes the other five and the
  suite stays green, and those five are the ones `B1` shows are wrong.
- `--filter`/`-F` — pinned (`M4`, `M5` redden). The two other `CONSUMING` members added in the same
  edit are not (`M3`).
- `buildx` — pinned (`M7`). Three of `PASSTHROUGH`'s other six members are not (`M8`, `M9`, `M10`).
- `NO_SCRIPTS` and the `noScripts` propagation — the propagation is genuinely pinned (`M19`, `M20`
  both redden, which is the strongest result in the table), but `--no-scripts` is not (`M11`).
- Rule 3 — pinned on the inline branch only (`M17` reddens, `M21` survives). `M21` disables the
  whole spaced `TARGET_FLAGS` branch, lines `:255-261`, and nothing notices. That is `B2` restated as
  a mutation: the half of rule 3 that is broken is also the half nothing tests.

`.qfai/evidence/atdd-spec-0017.md:191-192` calls this "14 tests, six corpora, none of them chosen by
this stage". The provenance claim holds — I grepped my own round-6 report and `--ignore-scripts`,
`--reporter=build-log` and `docker buildx build --push .` were all cases I named. What does not hold
is the inference the record draws from it: a corpus made only of last round's counterexamples pins
last round's counterexamples.

### `A1` (advisory) — `--workspace`/`-w` is the `--filter` defect, unfixed

```text
build   npm run build
build   npm --workspace=qfai run build
none    npm --workspace qfai run build
none    npm -w qfai run build
```

One command, two verdicts across a flag's forms — the same shape as the `--filter` defect, on npm's
workspace selector instead of pnpm's. It is genuinely harder than `--filter` (`-w` is a *boolean*
`--workspace-root` in pnpm and a *value-taking* `--workspace` in npm, and `pnpm -w build` is
correctly `build` today), so I raise it as advisory rather than blocking. But `CONSUMING` cannot hold
`-w` and `pnpm -w build` cannot keep working, so the fix is not the one used for `--filter`.

### `A2` (advisory) — `docker buildx bake` is `none`

`buildx` was added to `PASSTHROUGH`, so `docker buildx build` resolves; `docker buildx bake` is a
build and reports `none`. Low value, recorded for completeness.

## 2. Break `retractedClaims.test.ts` a third time (request question 2)

First, credit where it is due, because it is the part of this round that worked. I ran a census of
all ten `RETRACTED` entries against all five `GOVERNANCE` files with the file's own `flatten` and
`quotedSpans` (`tmp/r7-qa/retracted.mjs`):

```text
q=1 u=0  All 71 Integration rows are already at refactor
q=2 u=0  because the workflow changes are unmerged
q=2 u=0  there is no run history to mutate
q=2 u=0  degenerate against this runner
q=1 u=0  degenerate rather than satisfied
q=3 u=0  0 misclassified
q=1 u=0  rebuilt the scan around the verb
q=1 u=0  wrong about clause 1 three times
q=2 u=0  Three packs
q=2 u=0  becomes implementable once the pull request has three green

0 of 10 entries match NOTHING anywhere
```

Every entry matches somewhere and every occurrence is quoted. Whitespace collapse fixed a real
defect: under the round-6 version four of these were invisible. The every-file search fixed a real
defect too — `degenerate against this runner` is found in the DR *and* in the CR, and the round-6
version searched only one of them.

### `B4` (BLOCKING) — 5 of 8 assertion bypasses survive, and one of them is live at HEAD

I planted each shape into `.qfai/evidence/atdd-spec-0017.md` and ran the three assets guards
(`tmp/r7-qa/guards.mjs`; every mutation reverted, byte-identical):

```text
red (1 failed)       Z1  a retracted claim ASSERTED plainly (positive control)
GREEN <-- SURVIVES   Z2  the same claim asserted ACROSS A PARAGRAPH BREAK
GREEN <-- SURVIVES   Z3  the same claim asserted with a zero-width space inside it
GREEN <-- SURVIVES   Z4  a retracted claim asserted with its first word lower-cased
GREEN <-- SURVIVES   Z5  a retracted claim asserted with one word drifted
red (1 failed)       Z6  a retracted claim asserted inside a fenced code block
GREEN <-- SURVIVES   Z7  a retracted claim wrapped in a stray quote PAIR (launder)
red (1 failed)       Z8  a legitimate quotation preceded by one stray quote mark
```

Only `Z1` is a true detection. `Z6` and `Z8` are **false positives** — see `A3`. So of eight probes
the guard gets one right, five wrong in the permissive direction and two wrong in the accusing one.

Mechanisms, each traceable to a line:

- **`Z2`** — `:150` splits on the blank line **before** `:112` collapses whitespace. Collapsing
  whitespace inside a paragraph cannot see a claim that straddles two paragraphs. The fix for the
  round-6 defect was applied one step too late in the pipeline.
- **`Z3`** — `flatten` at `:113` collapses `\s+`. U+200B is not `\s` in JavaScript. `U+00A0` is, so
  that one is covered; a zero-width space renders identically and is not.
- **`Z4`** — `indexOf` at `:156` is case-sensitive. `All 71 Integration rows are already at refactor`
  is invisible the moment the sentence puts it mid-clause as `all 71 …`, which is the natural form
  and is the form this record itself uses at `.qfai/evidence/atdd-spec-0017.md:276`.
- **`Z5`/`Z7`** — literal-substring matching, and quote *parity* being taken for quote *semantics*.
  A pair of stray quote marks around an assertion makes it read as quoted.

**The live violation.** `.qfai/evidence/atdd-spec-0017.md:1032` asserts, unquoted:

> **Four** packs, one per round, each sealed when its last reviewer response landed

There are **seven** pack directories at or after `FIRST_PACK`, six closed and one in flight, and the
same file lists all seven at `:1045-1065`. This is `RETRACTED` entry 9 — `Three packs`, retracted
because "there were four pack directories when this was written" — recurring one round later with the
numeral incremented and the error grown from one to three. `Z5` is that shape and it is green. Six
lines further down, `:1038-1042` quotes the retraction correctly and then says "It is now derived" —
which is false of the number in the sentence it is correcting: the test derives the pack *names* and
seals, never the count.

Related, in the guard's own committed text: `packages/qfai/tests/assets/retractedClaims.test.ts:103`
says of the same entry "there are six now (round 4)". There are seven.

### `B5` (BLOCKING) — the docstring's account of the mechanism is false, and the error is mine

`packages/qfai/tests/assets/retractedClaims.test.ts:18-22` states as fact:

> **Literal spaces.** The second matched needles containing spaces against text where Prettier had
> put **newlines**. … a guard whose premise is "prose cannot be trusted" was defeated by running the
> formatter `ci:lint` enforces.

The repository refutes both halves:

- `.prettierrc.json` sets `proseWrap: "preserve"` for `*.md`. Prettier never introduces a line break
  into markdown prose in this repository, at any print width.
- `.prettierignore:17-19` excludes `.qfai/evidence/**` except `README.md`. I asked prettier directly:
  `prettier --file-info .qfai/evidence/atdd-spec-0017.md` returns `{ "ignored": true }`, and the same
  for `coverage-depth-spec-0017.md`. `.markdownlint-cli2.jsonc` also ignores
  `.qfai/evidence/*[0-9]*.md`. `ci:lint` does not touch either file.

The line breaks are hand-authored. **The causal claim originates in my own round-6 report** —
`.qfai/review/review-20260821060000000/R03_qa-gatekeeper.md:19,28,112,120,377,397` — and this stage
adopted it verbatim into a committed test file without checking it. I am naming it as blocking anyway,
on the standard this stage is being held to everywhere else: a committed artifact asserts a mechanism
the repository contradicts, in the file whose entire premise is that prose about mechanism must be
verified rather than believed. The **defect** I measured was real (needles with spaces against text
with newlines) and the **fix** is right; only the attributed cause is wrong, and the repair is one
sentence.

### `A3` (advisory) — two of the three reddening cases are false accusations, and one forbids the
natural repair

- **`Z6`** — a retracted claim inside a fenced code block reddens. A fence carries no `"`, so the
  most natural way to record a prior version's wording verbatim is now forbidden. That pressures the
  record toward paraphrase, and paraphrase is exactly what `Z4`/`Z5` show the guard cannot see.
- **`Z8`** — one stray `"` earlier in the same paragraph inverts the pairing and accuses the correct
  quotation that follows. Paragraph scoping bounded round 6's blast radius; it did not remove the
  mechanism.
- A blockquote (`>`), markdown's own quotation construct, also reddens. A nested quotation
  (`It said "the line read "0 misclassified" and that was wrong"`) reddens as well.

`tests/assets/**` runs in the `e2e` project, which is a required CI leg, so each of these is a way
for a correct edit to turn a required check red — the failure mode this file's own docstring at
`:14-22` records as its first defect.

## 3. Break `stageEvidenceCounts.test.ts` and the matrix test again (request question 3)

24 of my 34 artifact mutations redden. The row-width enforcement, the seal rules, the partition and
class-assignment checks and the per-file recorded-output floor all work — `X2` now throws
`Error: row US-0017-0002 has 7 cells, expected 8` where round 6 deleted a pipe and nothing moved.
Full matrix in § "Every command I ran". The four that matter:

### `B6` (BLOCKING) — round 6's first-match hole is still live, and I can demonstrate it green

`packages/qfai/tests/assets/stageEvidenceCounts.test.ts:285` still uses `exec`:

```ts
const stated = /(\d+) claim\(s\) backed by a test annotation/.exec(evidence);
```

`.qfai/evidence/atdd-spec-0017.md` contains **two** occurrences of that pattern — `:111` and `:219` —
and `exec` reads only `:111`. `:219` is the one inside `## Commands executed`, which is the one the
test's own comment at `:263-265` says it is checking. Measured:

```text
GREEN <-- SURVIVES   Y7  the guard recorded output 8 to 7 claims
```

I changed the recorded output at `:219` from `8 claim(s)` to `7 claim(s)` and all three guards stayed
green. This is round 6's finding `B7` — "the guard output is still first-match only" — not fixed. The
round-6 repair converted the CLAIMS loop (`:147`) and the recorded-vitest-output scan (`:177`) to
`matchAll` and left the two `exec` pins in the same file untouched: `:252` (annotated describes, one
occurrence today, so latent) and `:285` (two occurrences today, so live).

### `B7` (BLOCKING) — the matrix guard requires the record to keep a stale version name

`.qfai/evidence/coverage-depth-spec-0017.md:216` says:

> `v6` lives in `packages/qfai/tests/helpers/buildCommand.ts`

The helper is **v7** — its own docstring says "Seven versions" and
`.qfai/evidence/atdd-spec-0017.md:189` says "the build classifier, v7". `v6` occurs exactly once in
the matrix, at `:216`. And `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:335-338` asserts:

```ts
expect(text, "the record must name the predicate version it describes, …").toMatch(/`?v6`?/);
```

So I made the **correct** edit and measured it:

```text
red (1 failed)       X5  the record corrected from v6 to v7 (the TRUE edit)
```

The guard forbids the repair. That is the round-6 "one mechanism defeated two guards" shape inverted:
here a guard pins a false statement in place, and a required CI leg goes red when someone fixes it.

Three further consequences of the matrix not being edited at all this round — `git diff cb91e089 HEAD
-- .qfai/evidence/coverage-depth-spec-0017.md` is **empty**:

- `:189` still says "five versions of the predicate … each of the first four reported as clean". It
  is seven and six.
- `:192-204` logs v1 through v5 and stops. Neither v6 nor v7 has an entry.
- `:219-221` still states **v6's rule as the design**: "a build tool's subcommand counting only
  before any flag — which is what separates `cmake --build .` from `cmake --install build`". That is
  precisely the rule round 6 measured as regressing a whole class and that v7 narrowed. The record
  describes the refuted design as current.

And the same stale-sentence pattern is in the evidence file: `.qfai/evidence/atdd-spec-0017.md:607`
says "`v5` lives in `packages/qfai/tests/helpers/buildCommand.ts`". Two committed governance
artifacts state where the classifier lives, in the identical sentence form, with two different and
both-wrong version numbers.

### `B8` (BLOCKING) — the newest test file's own count is unpinned and its run unrecorded

```text
GREEN <-- SURVIVES   Y11 retractedClaims own stated count 5 to 9
```

`.qfai/evidence/atdd-spec-0017.md:199` states "`retractedClaims.test.ts` — 5 tests". That number is
correct (I measured 5 via vitest and 5 via `countCases`) and it is in **neither** pinned list:
`CLAIMS` at `:107-138` names six patterns and not this one, and `OWED` at `:182-187` names four files
and not this one. `## Commands executed` at `:210-236` records no run of it either, nor of
`stageEvidenceCounts.test.ts`.

This is the failure that produced round 6's `B6` reproduced on the next file: the derived-count test
covers every file except the one added in the same commit as the round's repairs. The record then
says at `:891-893` that "everything derivable about the artifacts … is now checked by
`stageEvidenceCounts.test.ts` rather than typed", which is not true of the file two bullets above it.

### `A4` (advisory) — three smaller holes in the same file

- **`Y13` green.** The `.each` precondition at `:220` tests `/^[ \t]*(?:it|test|describe)\.each\b/m`.
  I replaced one `it(` with `it.for([1])(` in a counted file and all three guards stayed green.
  vitest 2.1's `test.for` / `it.for` expands one callsite into many cases exactly as `.each` does, so
  the precondition the whole `countCases` rule rests on is checked for one of the two spellings.
- **`X10` green.** `coverageDepthMatrix.test.ts:362` asserts `toMatch(/withdrawn/i)`. I changed the
  `US-0017-0007` row's own "withdrawn" to "retired" and it stayed green, because the word occurs
  elsewhere in the file. The pin is satisfiable by any occurrence anywhere.
- The comment at `stageEvidenceCounts.test.ts:140-144` says "the count of matches is pinned too: a
  size stated twice is a size that can disagree with itself". The code at `:160` flags only
  *disagreement*; the count is not pinned. `Y3` (the same size stated twice, agreeing) is green,
  which is defensible behaviour but is not what the comment says. A comment overstating what its code
  does is the class this suite exists to catch.

**Credit, measured.** These reddened, and several are round-by-round regression guards that now hold:

```text
red  X1  a depth ❌ flipped to ⚠️            red  Y1  buildCommand count 14 to 13
red  X2  one pipe deleted from a row        red  Y2  the same size stated twice, DISAGREEING
red  X3  class letters B and C permuted     red  Y4  a recorded vitest output changed 9 to 8
red  X4  stated depth-cell count 38 to 37   red  Y5  the arrow dropped from a recorded run
red  X6  a ninth depth column added         red  Y6  annotated-describe count 8 to 9
red  X7  a partition row deleted            red  Y8  one Review-pack line removed
red  X8  sizes total 38 to 380              red  Y9  one recorded seal corrupted by a nibble
red  X9  class A body phrase changed        red  Y10 a CLOSED pack left unsealed
red  X11 a Status cell flipped              red  Y12 stageEvidenceCounts own count 7 to 6
red  X12 US-0017-0007 Oracle ❌ to ⚠️
```

`Y10` is worth calling out: the monotone seal rule is correct in both directions — it reddens when a
closed pack loses its seal, and it does not require the newest pack to be unsealed, so it will not go
red at the completion gate the way its predecessor did.

## 4. Numbers (request question 4)

Every figure below was re-derived, not read. Commands and exact outputs in § "Every command I ran".

| claim | site | measured | verdict |
| --- | --- | --- | --- |
| `validate --profile atdd --spec 0017` = `info=2 warning=0 error=2` | `:232-233`, `:855`, `:994` | `info=2 warning=0 error=2`, exit 1 | **correct** |
| the two errors are `QFAI-ATDD-111` (US-0017-0007) and `-112` (8 TCs) | `:232-233` | exactly those, TC-0017-0016/0030/0032/0033/0034/0035/0069/0070 | **correct** |
| `validate --profile full` = `error=4` | `:857`, `:966` | `info=4 warning=404 error=4` | **correct** |
| the four are `-111`, `-112`, `QFAI-REVIEW-004`, `-005` | `:967-969` | exactly those; `-004` = pack has no `summary.json`, `-005` = pack has no `Rxx_*.md` | **correct** |
| unscoped `-111` = 12 US across five specs, this spec owns 1 | `:967` | 12 ids across SPEC-0003/0006/0008/0015/0017; spec-0017 owns `US-0017-0007` | **correct** |
| unscoped `-112` = 15 TCs across four specs, this spec owns 8 | `:967`, `:919` | 15 ids across SPEC-0003/0008/0015/0017; spec-0017 owns 8 | **correct** |
| the `-111` split 8 + 1 + 1 + 1 + 1 = 12 | `:764-766` | spec-0003 8, spec-0006 1, spec-0008 1, spec-0015 1, spec-0017 1 | **correct** |
| `pnpm ci:lint` exit 0, all eleven members | `:850` | exit 0; `ci:lint` has exactly 11 `&&`-joined members | **correct** |
| `test:e2e` 1431 passed / 16 skipped | `:851` | `Tests 1431 passed / 16 skipped (1447)`, 84 files, exit 0 | **correct** |
| `--project integration --project unit` 1191 / 19 | `:852` | `Tests 1191 passed / 19 skipped (1210)`, 171 files, exit 0 | **correct** |
| the ledger guard: 8 backed, exit 0 scoped | `:219`, `:854` | `8 claim(s) backed`, exit 0 | **correct** |
| repo-wide: exit 1, 127 of 208 unbacked, 16 specs | `:222`, `:771-772` | exit 1, 127 unbacked lines, 208 total claims, 16 distinct specs | **correct** |
| 71 Integration rows = 63 refactor + 6 blocked + 2 todo | `:257`, `:376-377` | 82 rows total: 71 Integration (63/6/2) + 11 Unit | **correct** |
| the 8 uncovered TCs are the 6 blocked + 2 todo rows | `:268-269` | blocked = TDD-0016/0030/0032-0035; todo = TDD-0069/0070; identical set | **correct** |
| matrix totals ✅ 3 / ⚠️ 1 / ❌ 5, 38 depth cells, A 30 / B 7 / C 1 | matrix `:57`, `:114`, `:139` | cross-tabulated by hand: 3/1/5 over 9 rows; 38 depth cells; 30/7/1 | **correct** |
| the six pack seals | `:1046-1062` | all six recompute; round 1's superseded value also recomputes over the three reports as they stand | **correct** |

### `B9` (BLOCKING) — the replacement P7 derivation credits round 6 with round 5's work

Round 6 found this block wrong twice with correct endpoints. The endpoints are right again, and the
attribution is now wrong once. I re-derived the whole sequence by walking every commit from
`3f815725` to HEAD and counting statement-initial callsites per directory at each revision
(`tmp/r7-qa/walk.mjs`, `tmp/r7-qa/perfile.mjs`):

```text
rev        e2e project   unit+integration   what landed
3f815725      1422            1186          round 5 opened here
c40b2358      1425            1188          round 5's repairs: stageEvidenceCounts 4->6, matrix 4->5, buildCommand 9->11
cb91e089      1428            1188          round 6 opened here: retractedClaims 0->3
ac4700d1      1431            1191          round 6's repairs: retractedClaims 3->5, stageEvidenceCounts 6->7, buildCommand 11->14
9a37421c      1431            1191          HEAD (no test change)
```

`.qfai/evidence/atdd-spec-0017.md:880-881` says:

> round 6  retractedClaims.test.ts (5 tests), the matrix row-width round and
>          stageEvidenceCounts' .each precondition                       1422 -> 1431

Round 6's e2e delta is **1428 -> 1431**, three tests. The row starts at 1422, which is round *5*'s
revision, and so silently absorbs round 5's repair step (1422 -> 1425, +3). The e2e column therefore
has no row for round 5's repairs at all, although the unit column does have one — `:877`, "applying
its findings: two classifier cases 1186 -> 1188", which is exactly the same commit. And the row's
itemisation belongs to the span it does not name: "the matrix row-width round" is
`coverageDepthMatrix.test.ts` 4 -> 5, which happened at `c40b2358` in round 5's repairs and
contributed **zero** tests in round 6.

The block's own opening sentence at `:885` is "Every figure in the block above is the measured one at
the revision named" — and the round-6 row names no revision while starting at one measured two steps
earlier. The trailing sentence at `:887-888`, "Round 6 opened with `retractedClaims.test.ts`, three
more under `e2e`: 1425 -> 1428", is **correct** and I verified it (retractedClaims held exactly 3
tests at `cb91e089`) — it is the table above it that disagrees with it, by starting round 6 at 1422.

Everything else in the block checks out: `1418 -> 1422` for stageEvidenceCounts' four tests at
`3f815725`, `1186 -> 1188` for the two classifier cases, `1188 -> 1191` for round 6's three, and
`checkAtddAnnotationLedger.test.ts` being 22 at both `3f815725` and `cb91e089` so its diff between
them is indeed empty.

### `B10` (BLOCKING) — `## Final status` is a whole round behind, in four numbers at once

`.qfai/evidence/atdd-spec-0017.md:1010`:

> Confirmed by: **nobody has returned PASS.** Five stage rounds and four P1d passes, fifteen reviewer
> responses, every one **REVISE**. The full set, because an earlier version of this line named round 1
> alone and round 5 found it still doing so:

Measured from the packs on disk (`tmp/r7-qa/seals.mjs`):

| the record says | on disk |
| --- | --- |
| five stage rounds | **six** packs hold reviewer reports (rounds 1-6) |
| four P1d passes | **five** `R04_qa-gatekeeper-p1d.md` files (packs 2-6) |
| fifteen reviewer responses | **eighteen** `R*_*.md` files (2 + 4 + 3 + 3 + 3 + 3) |
| the table at `:1014-1020` is "the full set" | it stops at round 5; **round 6 is absent** |

Round 6's pack is named and sealed in this same file at `:1061-1062`, so § "Review packs and their
seals" and § "Final status" contradict each other by one round. The sentence that introduces the
table specifically says it is complete because an earlier version was not; it is not complete.

Two more in the same section:

- `:973` — "A fourth P1d re-route and a fifth stage round are owed." This is round 7 and P1d pass 6;
  a **sixth** re-route and a **seventh** round are owed.
- `:1032` — "**Four** packs", against seven. Covered under `B4`.

### `B11` (BLOCKING) — P1d's round-6 blocking item 2 is 1 of 6 applied, in a class P1d has closed

Round 6's P1d listed its whole remaining blocking set at
`.qfai/review/review-20260821060000000/R04_qa-gatekeeper-p1d.md:352-361`, item 2 being six review-round
count sites named by file and line, with "the wording for each is supplied" and "Items 1 and 2 are one
edit in one file plus a header". At HEAD:

| P1d's site | HEAD location | says | truth | applied |
| --- | --- | --- | --- | --- |
| `DR-0017-0010:10-12` | DR `:10-11` | "REVISE three times"; "Revised a third time"; "a fourth re-route is owed" | five; fifth; sixth | **no** |
| `atdd:413` | `atdd:439` | "returned `REVISE` three times" | five | **no** |
| `atdd:432` | `atdd:458` | "the row P1d sustained across three passes" | five | **no** |
| `atdd:859` | `atdd:899` | "P1d has run **five times**" | five | yes |
| `atdd:912` | `atdd:973` | "A fourth P1d re-route and a fifth stage round are owed" | sixth; seventh | **no** |
| `atdd:939` | `atdd:1000` | "P1d has returned `REVISE` three times" | five | **no** |

Plus one site of the same class P1d did not enumerate: `atdd:797`, "the account P1d has sustained
**four times** running" — five.

P1d's items **1** and **3** *were* applied and I verified both: `:940-942` now records clause 1 as
`unsatisfied` and quotes "degenerate rather than satisfied" as a quotation, and
`CR-20260820-0012:131` now quotes "wrong about clause 1 three times". So the two findings P1d framed
as gate-holding are fixed and the enumerated list attached to one of them is not.

This is blocking at **my** gate specifically because P1d wrote at `:379-382` that it has now swept all
four artifacts for this class, that the six sites are the complete result, and that it "will not open a
new finding of this class against the same material next round". If the stage gate does not carry it,
nothing does — and `:1000` and `:439` are in the two sections a P1d PASS would be written into and read
from.

### `A5` (advisory) — one pattern, three counts

The "asserted over how something is written rather than over what it does" recurrence is counted three
times and never derived: `atdd:604-605` "found **five** times", `atdd:789` "**Four** occurrences on this
spec now, all four asserting over source text rather than behaviour", matrix `:328-329` "**Fourth**
time on this spec". They may be describing two slightly different populations; nothing in the record
says so, and nothing derives any of the three. Advisory rather than blocking because I cannot show any
one of them false.

### `A6` (advisory) — the matrix's corpus enumeration is stale

`coverage-depth-spec-0017.md:223-225` enumerates the corpora as "round 4's 20 measured regressions,
round 5's 10 measured defects, v4's 15 kept forms, the 18 non-builds four rounds accumulated, and every
`run:` line in both workflow trees". I verified all four counts against the test file (20, 10, 15, 18 —
all exact). But that is five corpora and the evidence file says six at `:191`, because round 6's
additions — the seven v6-regression forms, the three flag-form cases and the two flag-value/lifecycle
cases — are not listed.

### `A7` (advisory) — the Hard Gate artifacts are not in the repository

`:238-243` correctly declines `validate.log` and cites `.qfai/report/validate.spec-0017.json` and
`.qfai/report/run-20260820194530635/` instead. I agree with the reasoning and I reproduced the numbers.
But `git ls-files .qfai/report` shows only `.gitignore`, `README.md`, `preflight_summary.md`,
`specs-coverage/spec-0012.md` and `validate.log` — neither cited artifact is tracked, so a later reader
cannot check either one from the repository. The recorded run-log directory name also no longer matches
any run I could reproduce. Not blocking: the numbers are reproducible from source, which I did.

## 5. Request question 5 — `TDD-0070`'s remaining blocker, and whether the set is shrinking

**What is left, from my domain.** Nothing about `DR-0017-0010`'s reasoning. P1d has sustained
`TDD-0070`'s account for five passes running and its round-6 report says explicitly that nothing in its
finding set claims the anomaly account is wrong. I read the DR and § `TDD-0070` and I agree: the
branch-1 and branch-2 unavailability arguments are sound, the obligation is quoted in full, the
identity and `DR-ID` were recorded before any gate routed (`58c29d9f`), and `blocked` for `TDD-0069` is
argued rather than asserted.

What is left is the record **around** it, and it is now smaller than round 6's but not empty:

1. **Five of the six count sites P1d enumerated** (`B11`). Two of them, `atdd:439` and `atdd:1000`,
   are inside the anchored section a consumer reaches from the row's own ledger entry and inside the
   section a PASS would be written into. A PASS recorded at `atdd:899` (now correct) sits 100 lines
   above `atdd:1000` denying that five passes happened.
2. **`## Final status` is a round behind in four numbers** (`B10`), and `TDD-0070`'s entry at `:458-460`
   routes its reader to "§ P1d's verdicts below", one of the sections affected.
3. Everything in §§ 1-3 above, which is not P1d's subject but is this stage's.

**Is the remaining set shrinking?** For the P1d gate: **yes, and it has stopped being about the
reasoning.** Pass 1 found the substance wrong; pass 5 found two sentences about the review itself;
what I find is one of those two sentences fixed, the other's attached list 1-of-6 applied, and no new
defect in the DR. That is a real trajectory.

For the **stage** gate: **no.** Round 6 gave 10 blocking; I give 11. The composition changed rather
than shrank: the classifier was rebuilt and broke in a new place with the same shape, the retracted-
claims guard closed four holes and left five, and the derived-count test closed one first-match pin and
left the other — which is now demonstrably live. Two of my eleven (`B7`, `B11`) are findings that a
previous round located precisely and that were not applied, which is the pattern this spec keeps
producing: the repair lands where the finding pointed and not where the defect is.

## 6. My own gates

### Coverage Depth Matrix gate — **PASS**, with `B7` against its content

- The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md` — not inside
  `atdd-spec-0017.md`, which would be a missing matrix under my rules.
- Every `❌` cell is justified: all 38 depth cells are partitioned into A/B/C with a stated property
  per class, each of the five `❌`-status rows has its own `### <US-ID> — …: ❌` section, and I
  cross-tabulated the whole table by hand and got the declared 38 and A 30 / B 7 / C 1.
- Every `US-*` carries both a normal-path and an error-path assessment; the eight `❌` normal/error
  cells belong to rows whose shipped surface does not exist, which is a disclosed absence rather than
  an unjustified gap.
- `B7` is a content defect (a stale version name that the guard pins in place), not a missing or
  unjustified matrix, so it does not fail this gate.

### RED/GREEN Observation Gate — **no subject at the row level**

`## Ledger rows advanced` says none advanced, and `tdd/test-list.md:107-108` confirms both rows are
`todo` with `DR-ID: -` and `Blocked-By: -`. There is no observed RED and no GREEN to judge for this
stage, and correctly so.

### Branch 3 (`TDD-0070`) — **PASS on the shape, deferred on the substance**

`DR-0017-0010` records what could not be observed and why each branch was unavailable, per row, which
is what my rules require of a branch-3 record. The substance belongs to the P1d re-route, which has
already sustained the account; I do not re-adjudicate it and I do not clear it. The stage's own
statement at `:462-467` — that branch 3 does not close a spec and the spec stays open — is correct.

### Validate hard gate — **measured, and it fails as the record says**

`error=2` scoped, exit 1; `error=4` on the full profile, exit 1. The record does not claim otherwise.
Completion is correctly `FAIL`.

### `TDD-0069`'s ledger `Evidence` cell — accepted as a handover

`tdd/test-list.md:107` still opens "NOT BLOCKED by a CR" and still ends with the exit P1d showed is
unreachable, and both are `RETRACTED` entries. `retractedClaims.test.ts` excludes that file
deliberately and `atdd:306-330` now carries the instruction, quoting the cell and naming all three
refuted parts. That is the right answer under the Drift Protocol — the cell is
`/qfai-implement`'s — and it closes round 6's `B9` and P1d's `A1`. Residual risk, recorded rather than
blocking: at HEAD the ledger carries two refuted statements unquoted and nothing tests it.

## 7. Required fixes (blocking only)

1. **`B1`** — remove `-B`, `-S` and `-o` from `DIRECTORY_VALUE_FLAGS`, or gate the set per tool. Add
   `make -B build`, `make --always-make build`, `make -S build`, `gradle -S build` and
   `gradle --full-stacktrace build` to the corpus as a long/short **agreement** assertion, not as a
   membership list.
2. **`B2`** — apply rule 3 to the spaced branch: an unrecognised flag's value must be consumed and
   must not be read as a target. Corpus: `pnpm --reporter build-log install` must equal
   `pnpm --reporter=build-log install`, `make --directory build clean` must equal
   `make -C build clean`, and `docker run --name build-agent alpine` must be `none`.
3. **`B3`** — assert the *rule* rather than the member: for each set, a property test over all members
   (or one case per member). `M1`, `M3`, `M8`-`M11`, `M13`, `M15`, `M16`, `M21`, `M23` must all redden.
4. **`B4`** — collapse whitespace **across** paragraph boundaries before splitting (or search the whole
   flattened document and locate the enclosing paragraph afterwards); strip zero-width characters in
   `flatten`; match case-insensitively; and **correct `atdd:1032` to seven packs**, deriving the count
   in `stageEvidenceCounts.test.ts` from `packsOnDisk()` so it cannot drift again. `retractedClaims.test.ts:103`
   also says six.
5. **`B5`** — replace the Prettier sentence at `retractedClaims.test.ts:18-22` with what is true: the
   line breaks are hand-authored, `.qfai/evidence/**` is prettier-ignored (`.prettierignore:17`) and
   `proseWrap` is `preserve`, so no formatter put them there. The defect and the fix stand; only the
   cause is wrong, and the error is mine to own.
6. **`B6`** — convert `stageEvidenceCounts.test.ts:285` and `:252` to `matchAll` with the same
   all-occurrence and disagreeing-value treatment the `CLAIMS` loop already has. `Y7` must redden.
7. **`B7`** — correct `coverage-depth-spec-0017.md:216` to `v7`, add v6 and v7 to the version log at
   `:192-204`, fix "five versions … first four" at `:189`, replace the v6 rule statement at `:219-221`
   with v7's, and change `coverageDepthMatrix.test.ts:338` so it pins **the version the helper
   declares** rather than a literal. Also fix `atdd:607` (`v5`).
8. **`B8`** — add `retractedClaims.test.ts` to `CLAIMS` and to `OWED`, and record a run of it and of
   `stageEvidenceCounts.test.ts` in `## Commands executed`.
9. **`B9`** — split the round-6 e2e row into round 5's repairs (`1422 -> 1425`) and round 6
   (`1428 -> 1431`), and move "the matrix row-width round" into the round-5 row where it belongs.
10. **`B10`** — six stage rounds, five P1d passes, eighteen reviewer responses; add round 6 to the
    table at `:1014-1020`; `:973` becomes a sixth re-route and a seventh round; `:1032` becomes seven.
11. **`B11`** — apply the five remaining count sites P1d enumerated, plus `atdd:797`.

## 8. Mutation hygiene

Three mutation campaigns, 57 mutations in total, every one reverted in the same step with the sha256
printed:

```text
packages/qfai/tests/helpers/buildCommand.ts       3ae7b5179e27caa8cb958901420e860b42c90e14db030ab5c23c08bd78a71e1e  byte-identical
.qfai/evidence/atdd-spec-0017.md                  fd677735427351a4…                                                  byte-identical
.qfai/evidence/coverage-depth-spec-0017.md        7a4ef207ba48989d…                                                  byte-identical
packages/qfai/tests/assets/stageEvidenceCounts.test.ts  f02aff21ac34c8bf…                                            byte-identical
```

`git status --porcelain` was empty at the start, after each campaign, after both `validate` runs, after
both suite runs, and at the end. `HEAD` was `9a37421c` at the start and `9a37421c` at the end.

One correction I owe about my own process. My first shadow root re-materialised the 83 symlinks as
Windows **junctions**, which rewrote their targets to absolute paths; `validate` then reported a third
error, `QFAI-LINK-001` (32 broken integration symlinks), and my first reading of `error=3` was an
artifact of my own harness. I rebuilt the shadow with `symlinkSync(target, dest, "dir"|"file")` so the
relative target text is preserved, re-ran, and got `error=2`. The real tree was never touched — I
verified `.claude/skills/*` still carry their relative targets, dated `Aug 4 17:16`, and the
`.qfai/report/` tree digest (1507 files) is unchanged across both runs. I record it because a reviewer
reporting `error=3` here would have been reporting its own tooling.

`validate` never wrote the tracked `.qfai/report/validate.log`: both runs used
`--root tmp/r7-qa/shadow2` and wrote into `tmp/r7-qa/shadow2/.qfai/report/`.

## 9. Every command I ran, with its result

```text
git rev-parse --short HEAD                                    9a37421c  (start and end)
git status --porcelain                                        empty  (start, end, and after every step)

# baseline
pnpm -C packages/qfai vitest run tests/unit/buildCommand.test.ts        14 passed, exit 0
pnpm -C packages/qfai vitest run tests/assets                           64 files, 1312 passed, exit 0
pnpm -C packages/qfai vitest run --project e2e                          84 files, 1431 passed / 16 skipped, exit 0
pnpm -C packages/qfai vitest run --project integration --project unit   171 files, 1191 passed / 19 skipped, exit 0
pnpm ci:lint                                                            exit 0 (11 members)

# per-file counts, vitest against countCases
spec0017LayeredCiScaffoldE2E.test.ts   vitest 9  countCases 9   MATCH
checkAtddAnnotationLedger.test.ts      vitest 22 countCases 22  MATCH
coverageDepthMatrix.test.ts            vitest 5  countCases 5   MATCH
stageEvidenceCounts.test.ts            vitest 7  countCases 7   MATCH
retractedClaims.test.ts                vitest 5  countCases 5   MATCH

# classifier probes (tmp/r7-qa/probe.mjs, probe2.mjs) - 59 commands, real manifests
                                       8 disagreements in batch 1, 8 in batch 2  -> 15 distinct defects

# classifier mutations (tmp/r7-qa/mutate2.mjs) - 23 mutations, restore byte-identical
                                       13 red, 10 GREEN (M1 M3 M8 M9 M10 M11 M13 M15 M16 M21 M23)

# artifact mutations (tmp/r7-qa/guards.mjs) - 34 mutations, all three files restored byte-identical
                                       24 red, 10 GREEN (X10 Y3 Y7 Y11 Y13 Z2 Z3 Z4 Z5 Z7)

# seals (tmp/r7-qa/seals.mjs)
7 packs on disk >= FIRST_PACK, 7 named in the record, 6 seals recorded
review-20260820200000000  SEAL REPRODUCES      review-20260821020000000  SEAL REPRODUCES
review-20260820220000000  SEAL REPRODUCES      review-20260821040000000  SEAL REPRODUCES
review-20260821000000000  SEAL REPRODUCES      review-20260821060000000  SEAL REPRODUCES
review-20260821080000000  no recorded seal (in flight, correct)
round 1 superseded seal over the three reports as they stand: d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9  MATCHES the record
18 R*_ reviewer reports across 6 packs

# derivation walk (tmp/r7-qa/walk.mjs, perfile.mjs)
3f815725 e2e 1422 / unit+integ 1186    c40b2358 1425 / 1188
cb91e089 1428 / 1188                   ac4700d1 1431 / 1191    9a37421c 1431 / 1191

# ledger guard
node scripts/check-atdd-annotation-ledger.mjs --spec 0017      exit 0, 8 claim(s) backed
node scripts/check-atdd-annotation-ledger.mjs                  exit 1, 127 unbacked of 208, 16 specs

# ledger row census
82 TDD rows: 71 Integration (63 refactor / 6 blocked / 2 todo) + 11 Unit
blocked: TDD-0016 0030 0032 0033 0034 0035   todo: TDD-0069 TDD-0070

# validate, in a git-archive shadow root with all 83 symlinks re-materialised
node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017 \
  --root tmp/r7-qa/shadow2
    counts: info=2 warning=0 error=2   exit 1
    QFAI-ATDD-111 SPEC-0017:US-0017-0007
    QFAI-ATDD-112 TC-0017-0016/0030/0032/0033/0034/0035/0069/0070
    artifact tmp/r7-qa/shadow2/.qfai/report/validate.spec-0017.json

node packages/qfai/dist/cli/index.mjs validate --profile full --fail-on error --root tmp/r7-qa/shadow2
    counts: info=4 warning=404 error=4   exit 1
    QFAI-ATDD-111 (12 US / 5 specs)  QFAI-ATDD-112 (15 TC / 4 specs)
    QFAI-REVIEW-004 (no summary.json)  QFAI-REVIEW-005 (no Rxx_*.md)

# formatter provenance for B5
prettier --file-info .qfai/evidence/atdd-spec-0017.md            { "ignored": true }
prettier --file-info .qfai/evidence/coverage-depth-spec-0017.md  { "ignored": true }
.prettierrc.json                                                  *.md -> proseWrap: "preserve"

# real tree integrity
.qfai/report tree digest before validate  1507 files 90992b472414024be6e8add5bf6d4b2fc5b6e87637985e3eef4a1b9ee7e2f798
.qfai/report tree digest after  validate  1507 files 90992b472414024be6e8add5bf6d4b2fc5b6e87637985e3eef4a1b9ee7e2f798
git diff --stat cb91e089 HEAD -- .qfai/evidence/coverage-depth-spec-0017.md    (empty)
```

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — every one names a file and line, and every
      measurement names the command and its output
- [x] Required gates and residual risks are recorded — Coverage Depth Matrix **PASS**; RED/GREEN
      observation **no subject**; branch 3 **PASS on shape, deferred on substance**; validate hard gate
      **fails as recorded**; residual risks: `TDD-0069`'s ledger `Evidence` cell (routed handover),
      the untracked Hard Gate artifacts (`A7`), the guard's over-strict cases (`A3`)
- [x] No mutation left in the tree — three campaigns, 57 mutations, four files, all byte-identical on
      restore; `git status --porcelain` empty; HEAD `9a37421c` unchanged
