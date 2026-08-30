# R03 — qa-gatekeeper (stage), round 8

- Stage: `/qfai-atdd` (spec-0017)
- Revision reviewed: `dbe00247`
- `git rev-parse --short HEAD` at start: `dbe00247`; at end: `dbe00247` — **HEAD did not move**
- `git status --porcelain` at start: **empty**; re-confirmed empty after every mutation campaign and at
  the end
- Method: read-only except this file. Six mutation campaigns, 138 mutations across five tracked files,
  every one reverted in the same step with a sha256 comparison printed. Scratch under `tmp/r8-qa/` only.
  `validate` run against a `git archive HEAD` shadow root with all 83 tracked symlinks re-materialised
  as **relative-target** symlinks, not junctions; the real `.qfai/report/` tree hashed before and after
  — 1507 files, digest `67dbc8ef06a9ef99dd3f0732cc29fdcb3a35bf3d0423d464bc04f972833e121d` unchanged,
  and no `QFAI-LINK-001`.
- P1d is **closed** (PASS at round 7). Nothing below re-opens it; section 6 records that explicitly.

## Verdict: **REVISE**

11 blocking, 11 advisory.

**v8 is broken 25 ways over 66 probes I chose, and — the result that matters — its member-level pinning
detects nothing.** The test written to close round 7's "each rule is pinned at one member" finding
generates its probes *from the sets it pins*, so deleting a member deletes its own assertion: **0 of 17
member mutations redden it**, including two that add a *wrong* member. Whole-file, **35 of 57 mutations
survive** (round 7 measured 10 of 23), and every one of the 22 detections comes from a hardcoded case
elsewhere in the file. Downstream: **10 of 11 real builds planted into a shipped lane pass
`US-0017-0004`**, with a plain `pnpm build` control reddening.

`retractedClaims.test.ts` closed three holes and opened one: the zero-width repair **inverted** the
defect rather than closing it. One `RETRACTED` entry cannot match the sentence it exists to forbid, and
I restored that exact sentence with the suite green. Three refuted count statements stand unquoted at
sites round 6's P1d and round 7 both named by file and line — so the round's headline procedural claim
("zero unquoted refuted claims", verified by grep) is false, in the same class it was written for.

`stageEvidenceCounts.test.ts` is the success of the round: **12 of 12 redden**, including round 7's live
first-match hole. The matrix guard now permits the repair round 7 said it forbade — and the repair was
not made: **1 of 5** items applied, and the record now attributes **v6's refuted rule to `v8`**.

**What held, measured.** All eight packs reconcile: 7 recorded seals recompute, round 1's superseded
value recomputes, and the `--no-filters` reasoning for round 7's pack is **correct** — I reproduced both
computations. Every suite total is exact (1432 / 1193 / 1313). Both validate profiles are exact
(`error=2` scoped, `error=4` full) with exactly the four codes and the right per-spec breakdown.
`ci:lint` exits 0 across eleven members. The matrix arithmetic is fully derived and correct.
`## Final status` now says what the packs say. 33 of my 46 artifact mutations redden.

---

## 1. Break v8 (request question 1)

Harnesses: `tmp/r8-qa/probe.mjs` (66 commands, both real manifests loaded), `runner.mjs` + `table.mjs`
(57 helper mutations), `runner2/3.mjs` + `table2.mjs` (17 mutations against the iterating test alone and
against the whole file), `erunner.mjs` + `etable.mjs` (11 builds planted in the shipped tree). Baseline
before every campaign: 16 passed, exit 0.

**25 disagreements of 66 probes: 12 missed builds, 8 false positives, and 4 commands that get two
verdicts depending on how one flag is spelled.**

### `B1` (BLOCKING) — v8's headline rule 3 reaches one of the two families its own docstring defines

`packages/qfai/tests/helpers/buildCommand.ts:275`:

```ts
const known = isManager ? MANAGER_BOOLEAN.has(token) : true;
```

For a **build tool** `known` is unconditionally `true`, so `if (!known)` is never taken and a spaced
flag's value is **never** consumed. The docstring states the rule without that qualification (`:22-24`):
"A spaced flag **consumes its value** unless it is a known boolean." The numbered list directly above it
defines exactly two families, and the rule reaches one of them.

Measured — the value lands in the bare-token position and is read as the subcommand (`:290`):

```text
none    gradle --console plain build          <- a real build
build   gradle --console=plain build          <- THE SAME COMMAND, inline
none    dotnet --verbosity minimal build      <- a real build
build   dotnet --verbosity=minimal build      <- THE SAME COMMAND, inline
none    make -j 4 build                       <- a real build
build   make -j4 build                        <- THE SAME COMMAND, attached
none    cargo --color never build             <- a real build
build   cargo --color=never build             <- THE SAME COMMAND, inline
none    ninja -j 8 build
none    turbo --concurrency 4 run build
```

And in the other direction, the flag's value read as a **target**, all four returning the strong `build`
verdict rather than the labelled guess:

```text
build   cargo --config build.jobs=2 test
build   gradle --build-cache test
build   gradle --build-file other.gradle clean
build   dotnet --arch build test
```

This is round 7's `B2` — "v7's headline rule 3 is implemented on one of its two branches" — reproduced
exactly, with the branch pair changed from inline/spaced to manager/tool. `cargo --config
build.jobs=2 test` is a probe I reported at round 7 and it returns `build` again. Four of the ten misses
are one-command-two-verdicts pairs, which is the defect `buildCommand.test.ts:284-294` exists to forbid;
that test enumerates the three `--filter` forms and nothing else.

I measured the naive repair (`M48`: `const known = MANAGER_BOOLEAN.has(token);`) and it **reddens** —
`cargo --locked build`, `gradle --no-daemon build`, `make -B build` and `make -S build` are all pinned
and none of those flags is in a manager's boolean list. So the repair is not a one-line inversion: it is
a per-tool `bools` array beside `pass` and `dirs`, which is precisely the shape v8 already chose for
`dirs`. Applied to `dirs` and not to booleans is what leaves the hole.

### `B2` (BLOCKING) — `MANAGER_BOOLEAN` is v7's `DIRECTORY_VALUE_FLAGS` re-created one family over

`:114-132` is a **global** list of "flags that take no value" applied to eight managers whose grammars
differ. Round 7's finding against v7 was a global list of "flags that take a directory" whose members
were wrong in the tools it was applied to. Same shape, same measurement:

```text
build   pnpm -w build                         <- pinned by the corpus at :236 and :384-387
none    pnpm --workspace-root build           <- THE SAME FLAG, long form
none    npm -w qfai run build                 <- -w takes a VALUE in npm
build   npm --workspace qfai run build        <- the same command, long form
```

`pnpm -w build` and `pnpm --workspace-root build` are one command with two verdicts across one flag's
long and short forms. That is the `--filter`/`-F` defect the corpus test at `:284-294` was written for,
on the very flag whose short form the corpus pins — and `-w` cannot leave the set without breaking
`pnpm -w build`, so this is not fixable by editing the list.

Six more missed builds from boolean flags the list omits, each swallowing the script name:

```text
none   pnpm --stream build            none   pnpm --parallel build
none   pnpm --no-color build          none   pnpm --aggregate-output build
none   pnpm --dry-run build           none   pnpm --shell-mode build
```

The list is load-bearing in the other direction too: adding `--reporter`, a value-taking flag, to
`MANAGER_BOOLEAN` reddens (`N17`), because `pnpm --reporter build-log install` then reads `build-log` as
a script name. So it must be exactly right per manager, and it is maintained as one global set.

### `B3` (BLOCKING) — the "pins every member" test is generated from the sets it pins, so it cannot see a deletion. 0 of 17.

`buildCommand.test.ts:353-422` iterates `GRAMMAR` and builds one probe per member. Deleting a member
removes its probe. The test is a tautology with respect to removal — the exact failure mode it was
written to close.

Measured with `-t "pins every member of every grammar set"`, so only that test ran:

```text
GREEN <-- SURVIVES   N01 MANAGER_DIRS drops --prefix
GREEN <-- SURVIVES   N02 MANAGER_BOOLEAN drops -w
GREEN <-- SURVIVES   N03 MANAGER_BOOLEAN drops --offline
GREEN <-- SURVIVES   N04 MANAGER_CONSUMING drops --scope
GREEN <-- SURVIVES   N05 MANAGER_PASS drops dlx
GREEN <-- SURVIVES   N06 MANAGER_PASS drops exec
GREEN <-- SURVIVES   N07 NO_SCRIPTS drops --no-scripts
GREEN <-- SURVIVES   N08 TARGET_FLAGS drops --task
GREEN <-- SURVIVES   N09 BUNDLERS drops rolldown
GREEN <-- SURVIVES   N10 BUNDLERS drops msbuild
GREEN <-- SURVIVES   N11 TOOLS docker pass drops buildx
GREEN <-- SURVIVES   N12 TOOLS podman pass drops buildx
GREEN <-- SURVIVES   N13 TOOLS bazel dirs emptied
GREEN <-- SURVIVES   N14 TOOLS zig entry deleted
GREEN <-- SURVIVES   N15 TOOLS lerna entry deleted
GREEN <-- SURVIVES   N16 CONTROL turbo dirs GAINS a wrong member
GREEN <-- SURVIVES   N17 CONTROL MANAGER_BOOLEAN GAINS --reporter

17 of 17 survive
```

Re-run against the **whole** file, the same 17 give 12 survive / 5 redden — and each of the five reddens
through a hardcoded case: `N02` through `pnpm -w build` (`:236`), `N06` through `pnpm exec vite build`
(`:116`), `N10` through `msbuild MySolution.sln` (`:92`), `N11` through `docker buildx build --push .`
(`:273`), `N17` through `pnpm --reporter build-log install` (`:337`). **The iterating test contributes
zero detections.**

Whole-file, the full campaign (57 mutations, restore byte-identical): **35 survive, 22 redden.**
Survivors include:

```text
M03 M04 M05  MANAGER_PASS drops dlx / workspaces / --
M06 M07 M08  MANAGER_CONSUMING drops --filter-prod / --scope / -F
M11-M15      MANAGER_BOOLEAN drops --offline / --force / --verbose / --if-present / --prod+--dev
M17 M18 M19  MANAGER_DIRS drops --prefix / --cwd / --dir
M20 M21      TARGET_FLAGS drops --task / -m
M22          NO_SCRIPTS drops --no-scripts
M24 M26      BUNDLERS drops rolldown / swc
M28 M30 M33 M35 M37   podman buildx, cmake's other three dirs, gradle --project-dir,
                      turbo --cwd, nx run
M38 M39 M40  whole TOOLS entries deleted (lerna, rush, zig)
M41 M42 M43 M44       bazel / dotnet / poetry dirs tables emptied
M52          isPathLike guard on inline target values removed   (round 7's M23, unfixed)
M56          spaced TARGET_FLAGS branch disabled entirely       (round 7's M21, unfixed)
M57          NOT_A_BUNDLER emptied (dead code: tsc reaches none by another path)
```

Round 7 measured 10 of 23 surviving and asked for "the *rule* rather than the member". The proportion
surviving went **up**, from 43% to 61%, and two mutations round 7 named individually are still green.

The record's claim at `atdd-spec-0017.md:191` — "16 tests, eight corpora, none of them chosen by this
stage" — and the helper's at `:324-328` — "exported so a corpus can pin **every member** rather than one
… A test that iterates these cannot have that hole" — are both refuted by the table above. The second
sentence is the one to correct: iterating them is *why* it has that hole.

### `B4` (BLOCKING) — `US-0017-0004`'s oracle is evadable ten ways, and I planted the builds

The story the classifier serves asserts that no shipped lane runs or appears to run a build
(`buildCommand.test.ts:494-504`). I replaced the `integration lane placeholder` step body in
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml:187` with a real build, one form at a
time, and ran the unit corpus plus the E2E file:

```text
red (1 failed)       E01 CONTROL  run: pnpm build
GREEN <-- SURVIVES   E02  run: nice -n 19 pnpm build
GREEN <-- SURVIVES   E03  run: xvfb-run -a pnpm build
GREEN <-- SURVIVES   E04  run: timeout 600 pnpm build
GREEN <-- SURVIVES   E05  run: gradle --console plain build
GREEN <-- SURVIVES   E06  run: make -j 4 build
GREEN <-- SURVIVES   E07  run: dotnet --verbosity minimal build
GREEN <-- SURVIVES   E08  run: pnpm --stream build
GREEN <-- SURVIVES   E09  run: pnpm --workspace-root build
GREEN <-- SURVIVES   E10  run: npm -w pkg run build
GREEN <-- SURVIVES   E11  run: docker buildx bake -f docker-bake.hcl
```

The control reddens, so the harness is sound. Ten of eleven real builds ship without the story noticing.
The helper's docstring at `:22-24` argues the missing direction is "the safe direction here: the
assertion this serves is that a tree contains none, so a false positive breaks it the day someone adds
an innocent lane." That has the risk backwards for *this* assertion: a false negative is the **vacuity**
direction — the guard passes while the thing it forbids is present — and `B1` shows the tradeoff bought
four false positives anyway. This is the "asserted over how something is written rather than what it
does" class the record counts on this spec, measured on the instrument itself for the second round.

### `A1` (advisory) — wrapper handling stops at the first wrapper flag; `timeout` is not a wrapper at all

`:203-213` skips `WRAPPERS` heads and `VAR=value` assignments but not a wrapper's own flags, so the loop
breaks on `-n` / `-a` / `-E` / `-oL` and `:234` returns `none`:

```text
none   nice -n 19 pnpm build       none   sudo -E make build
none   xvfb-run -a pnpm build      none   stdbuf -oL pnpm build
none   env -u CI pnpm build        none   timeout 600 pnpm build
```

`env` is in `WRAPPERS` and `env NODE_ENV=production pnpm build` is pinned at `:86`; the flag form is not.
`xvfb-run -a` and `timeout N` are the idiomatic CI spellings of both.

### `A2` (advisory) — `docker buildx bake` is still `none`

Round 7's `A2`, unchanged. `buildx` is in docker's `pass`, so `bake` reaches `:290` as a bare token and
`namesABuild("bake")` is false.

### `A3` (advisory) — dead code the corpus proves is dead

`NOT_A_BUNDLER` (`:107`) can be emptied with the suite green (`M57`): `tsc` reaches `none` through the
script-lookup path anyway. `MANAGER_CONSUMING` (`:112`) is now largely redundant for spaced forms —
`M08` drops `-F` and rule 3 consumes the value regardless. Both are members the record presents as
load-bearing.

---

## 2. Break `retractedClaims.test.ts` a fourth time (request question 2)

Census of all 13 `RETRACTED` entries against all five `GOVERNANCE` files with the file's own `flatten`
and `quotedSpans` (`tmp/r8-qa/census.mjs`), then 23 planted probes with all three assets guards run
(`arunner.mjs` / `wrunner.mjs`, every mutation reverted byte-identical; baseline 18 passed).

**Credit first, because three real holes closed.** `Z02` (a paragraph break inside the claim), `Z03` (a
zero-width character replacing a space) and `Z07` (the claim lower-cased) all **redden** now, and each
was green at round 7. The whole-document search with per-paragraph quote pairing is the right design and
it works: the census shows every live occurrence of every matching entry is quoted, `u=0` throughout.

### `B5` (BLOCKING) — the zero-width repair inverted the defect instead of closing it

`retractedClaims.test.ts:182` substitutes zero-width characters **with a space** and then collapses. The
docstring at `:179-182` reasons that the previous repair *deleted* them, which welded two words together
when the character replaced a space. Both are true and neither normalisation handles both placements —
substituting breaks the case where the character sits **inside a word**:

```text
red (1 failed)       Z01 CONTROL a retracted claim asserted plainly
red (1 failed)       Z03 U+200B REPLACING a space inside the claim   <- fixed this round
GREEN <-- SURVIVES   Z04 U+200B INSIDE A WORD of the claim
GREEN <-- SURVIVES   Z05 U+00AD (soft hyphen) inside a word
GREEN <-- SURVIVES   Z06 U+2060 (word joiner) inside a word
```

`Z04` is the same character in the other position. `Z05` and `Z06` are outside the stripped range
U+200B-U+200D / U+FEFF entirely, render identically, and were never in scope. The normalisation that
handles all four is to strip zero-width and format-class characters **and** compare on a
whitespace-free letter sequence, so that placement stops mattering.

Five more laundering shapes, all green:

```text
GREEN <-- SURVIVES   Z08 one word drifted ("rebuilt its scan around the verb")
GREEN <-- SURVIVES   Z09 the claim wrapped in a stray quote PAIR
GREEN <-- SURVIVES   Z10 an HTML comment inside the claim
GREEN <-- SURVIVES   Z11 a markdown link inside the claim
GREEN <-- SURVIVES   Z12 the claim split across two table cells
```

`Z09` is round 7's `Z7`, unchanged: `:252` still takes quote **parity** for quote **semantics**, so two
stray marks around an assertion make it read as quoted. `Z08` is inherent to literal matching, and the
mitigation chosen for it — a shortened needle — was added for **one** entry (`:114-116`), which is the
one-member pattern `B3` is about, on a different file.

### `B6` (BLOCKING) — one `RETRACTED` entry cannot match the sentence it exists to forbid, and I restored that sentence with the suite green

`retractedClaims.test.ts:117-120` adds, as this round's self-disclosure, the entry
`claim: "defeated by the formatter"`. The wording it retracts was, in the round-7 docstring:

> a guard whose premise is "prose cannot be trusted" was **defeated by running the formatter** `ci:lint`
> enforces

Flattened, that is `… was defeated by running the formatter ci:lint enforces` — and `defeated by the
formatter` is **not a substring of it**. Measured:

```text
entry 13 needle vs the wording it retracts:   needle matches that wording?  false
```

Demonstrated, not merely computed:

```text
GREEN <-- SURVIVES   W01 the EXACT retracted sentence restored, unquoted
red (1 failed)       W04 CONTROL the same claim in the paraphrase the LIST happens to hold
```

The entry guards a sentence nobody wrote and leaves the sentence that was written free. Two entries
match nothing at all in the tree — `P1d has returned REVISE three times`, correctly dormant, and this
one, vacuous by construction — and the census cannot tell them apart. A needle should be checked against
the text it was extracted from at the moment it is added.

### `B7` (BLOCKING) — three refuted statements stand unquoted at sites named by file and line in two prior rounds; the round's own procedural claim is false

The request's item 4 asks me to verify by grep that there are "zero remaining `N times` phrases … and
zero unquoted refuted claims". Grepped:

| site | says | the tree says | named before |
| --- | --- | --- | --- |
| `atdd:472` | "This is the row P1d sustained across **three passes**" | six passes, every one sustaining it | round 6 P1d item 2; round 7 `B11` |
| `atdd:811` | "whose account P1d has sustained **four times** running" | six | round 7 `B11` |
| `atdd:989` | "A **fourth** P1d re-route and a **fifth** stage round are owed" | P1d is closed; this is round 8 | round 6 P1d item 2; round 7 `B11` |

`atdd:989` is now wrong in a stronger way than when round 7 raised it: the P1d gate **passed** at round
7, so no re-route is owed at all, and the same file says so twice — `atdd:915` ("six times … at pass 6,
**PASS**") and `atdd:1099` ("Round 8 routes no P1d pass. That gate closed at round 7"). One paragraph in
section "The full profile" contradicts "Final status" 110 lines below it and "Review packs" 110 lines
below that.

Four of round 7's seven enumerated sites **were** applied and I verified each: `atdd:439` is rewritten as
"P1d's verdict: PASS, at the sixth pass"; `atdd:915` reads "six times"; `atdd:1016` reads "five times
before its pass-6 PASS"; `DR-0017-0010:10-13` now reads "**`PASS` at P1d pass 6**". So the score is
**4 of 7**, up from 1 of 6 — real movement, and still a partially applied located finding for the third
round running, which is the defect the round's countermeasure was adopted to end.

None of the three is in `RETRACTED`, and neither is the matrix's refuted design sentence (`B8`). I
planted two of them as fresh assertions and both are green:

```text
GREEN <-- SURVIVES   W02 the matrix's refuted v6 rule asserted in the evidence file too
GREEN <-- SURVIVES   W03 "This is the row P1d sustained across three passes"
```

### `A4` (advisory) — the three false accusations are unchanged

```text
red (1 failed)       Z13 a retracted claim inside a fenced code block
red (1 failed)       Z14 a retracted claim inside a blockquote
red (1 failed)       Z15 one stray quote mark earlier in the paragraph, then a CORRECT quotation
```

Round 7's `A3`, verbatim. A fence carries no quote mark, so the most faithful way to record a prior
version's wording is forbidden; a blockquote is markdown's own quotation construct; and `Z15` still
accuses a correct quotation. `tests/assets/**` runs in the `e2e` project, a required CI leg, so each is
a way for a correct edit to turn a required check red.

### `A5` (advisory) — the counted claim is pinned to one phrasing

`:136` matches a numeral or number-word followed by `packs, one per round`. Measured:

```text
red (1 failed)       Z16 "Eight" -> "Nine" packs, one per round
red (1 failed)       Z19 "Eight" -> "9" packs, one per round
GREEN <-- SURVIVES   Z17 "Nine packs — one per round"       (em dash instead of the comma)
GREEN <-- SURVIVES   Z18 "Nine review packs, one per round" (one word inserted)
```

The mechanism is right and the needle is one punctuation mark wide. The count itself is **correct** at
HEAD — eight directories, eight named (section 5).

---

## 3. Break `stageEvidenceCounts.test.ts` and the matrix test again (request question 3)

### The derived-count guard: 12 of 12 redden. Round 7's live hole is closed.

```text
red  Y01 buildCommand stated count 16 -> 15        red  Y07 annotated-describe count 8 -> 9
red  Y02 retractedClaims stated count 6 -> 5       red  Y08 round 7's closed pack loses its seal
red  Y03 stageEvidenceCounts own count 7 -> 6      red  Y09 one nibble of that seal corrupted
red  Y04 recorded vitest output 16 -> 15           red  Y10 the in-flight round-8 pack line removed
red  Y05 recorded guard output 8 -> 7 claims       red  Y11 the arrow dropped from a recorded run
red  Y06 the OTHER guard-output occurrence 8 -> 7  red  Y12 a recorded run deleted entirely
GREEN Y13 CONTROL a sentence added to the prose
```

`Y05` is round 7's `B6`. That finding was a demonstrated green — I changed `8 claim(s)` to `7` at the
second occurrence and all three guards passed. It reddens now, and so does the other occurrence (`Y06`).
`grep -n "\.exec(" packages/qfai/tests/assets/stageEvidenceCounts.test.ts` returns **nothing**; `:261`
and `:296` are `matchAll`. That third of the request's procedural claim holds, verified by grep.

### `B8` (BLOCKING) — the matrix guard now permits round 7's repair, and the repair was not made. 1 of 5.

`git diff 9a37421c HEAD -- .qfai/evidence/coverage-depth-spec-0017.md` is **one line**: `v6` to `v8` at
`:216`. Round 7's `B7` listed five items. Measured against the matrix guard:

```text
red (1 failed)       X01 the version name reverted to v6                     <- the pin works
GREEN <-- SURVIVES   X02 THE CORRECT REPAIR: "five versions ... first four"
                         -> "eight versions ... first seven"
GREEN <-- SURVIVES   X03 the same sentence inflated to nine / eight
GREEN <-- SURVIVES   X04 v6's refuted rule sentence replaced with v8's
GREEN <-- SURVIVES   X05 the stale v1-v5 version log deleted entirely
GREEN <-- SURVIVES   X06 the corpora enumeration replaced wholesale
red (1 failed)       X08 stated depth-cell count 38 -> 37
red (1 failed)       X09 a depth cell flipped from a cross to a warning (positive control)
GREEN <-- SURVIVES   X10 CONTROL a sentence added to the prose
```

`X02` green is the good news and the finding at once: `coverageDepthMatrix.test.ts:339-346` derives the
version from `Math.max` over the helper's own version mentions, so nothing forbids the correction any
more. It simply was not made. What stands at HEAD:

- `:188-190` — "getting that far took **five** versions of the predicate, each measured, each of the
  **first four** reported as clean". The helper's own docstring at `:4` says "**Eight** versions. Each of
  the **first seven** was measured, reported clean … and then broken by a corpus a reviewer chose." Two
  committed artifacts, adjacent numbers, three versions apart. Second round running.
- `:192-204` — the version log runs v1 to v5 and stops. v6, v7 and v8 have no entry. Second round.
- `:216-221` — the paragraph that now opens `` `v8` lives in … `` ends with "a runner may nest, with a
  build tool's subcommand counting only **before any flag** — which is what separates `cmake --build .`
  from `cmake --install build`." That is **v6's rule**, the one round 6 measured as regressing a whole
  class and v7 narrowed and v8 replaced. Round 7 reported the record describing a refuted design as
  current; the round-8 edit changed the version label on the sentence and left the sentence, so the
  refuted rule is now attributed to `v8` by name. That is worse than what round 7 found.
- `:223-225` — the corpora enumerated as five, against `atdd:191`'s "eight" and `atdd:629-630`'s four.

The guard's remaining weakness is that `toContain("v8")` is satisfied by one occurrence anywhere, which
is how all four of the above pass beside a corrected version name.

### `A6` (advisory) — the `.each` precondition misses `it.for`, now with a real divergence

`stageEvidenceCounts.test.ts:227` tests for `it`/`test`/`describe` followed by `.each`. vitest here is
**2.1.9**, where `test.for` / `it.for` expands one callsite into many cases exactly as `.each` does.
Measured on a counted file:

```text
GREEN <-- SURVIVES   F01 one it( -> it.for([1, 2, 3])( in coverageDepthMatrix.test.ts
     vitest under that mutation:  Tests 7 passed (7)
     the record states:           5 tests
     countCases returns:          5
```

Round 7 raised this as latent; it is now a live 2-test divergence with all three guards green. Round 7's
`A4` first bullet, unapplied.

### `A7` (advisory) — the withdrawn-word pin is still satisfiable anywhere

```text
GREEN <-- SURVIVES   X07 the US-0017-0007 section's own "withdrawn" changed to "retired"
```

`coverageDepthMatrix.test.ts:370`. Round 7's `A4` second bullet, unapplied.

### `B9` (BLOCKING) — round 7's `B8` is half applied: the guard requires a recorded run for five files and exempts itself

`OWED` at `:187-193` names five files. `retractedClaims.test.ts` was added this round, correctly — `Y12`
reddens. `stageEvidenceCounts.test.ts` is **not** in it, and `## Commands executed` at `atdd:210-236`
records no run of it. Grepped: the only mentions of that file in the evidence are prose at `:196`,
`:877`, `:909`, `:1059`, `:1068`, `:1106`, `:1114`, `:1127`. Round 7's `B8` said "record a run of it
**and of `stageEvidenceCounts.test.ts`**"; the first half landed and the second did not. The record at
`atdd:907-909` says "Everything derivable about the artifacts … is now checked by
`stageEvidenceCounts.test.ts` rather than typed", which remains untrue of that file's own recorded run,
one round after the same sentence was untrue of `retractedClaims.test.ts`.

---

## 4. The procedural claim, verified by grep (request question 4)

Round 7's countermeasure is that a located finding is verified **by grep after the edit**. Three
sub-claims:

| claim | verified how | result |
| --- | --- | --- |
| zero `.exec` in the derived-count guard | `grep -n "\.exec("` on `stageEvidenceCounts.test.ts` | **holds** — no matches. Six remain in `coverageDepthMatrix.test.ts`, all single-occurrence anchors, correctly so |
| zero remaining stale `N times` phrases | `grep -nE` for number-words followed by `times` across all five governance files | **false** — `atdd:472`, `atdd:811`, `atdd:989`; see `B7` |
| zero unquoted refuted claims | the 13-entry census plus 4 planted assertions | **false** — three count statements and the matrix's refuted rule sentence, none of them in `RETRACTED`; `W02` and `W03` green |

So the countermeasure caught one of its three targets. The reason is visible in the mechanism it
replaced: grep-after-edit finds only what the pattern names, and two of the three surviving sites
(`atdd:472` "three passes", `atdd:989` "a fourth P1d re-route") contain the word `times` nowhere at all.
A grep is not a sweep unless the pattern is derived from the *class* rather than from the wording of the
instance that happened to be noticed.

### `B10` (BLOCKING) — the P7 edit merged one duplicate paragraph and created another

`atdd:290-294` records: "Rounds 5, 6 and 7 each required a duplicate of this paragraph deleted and it
survived all three … Merged here." I verified that: `git diff 9a37421c HEAD` shows the "Ledger rows
advanced" duplicate removed. In the same commit, section P7 gained a new paragraph that repeats the one
already below it:

- `:890-895` (new) — "the first credited round 5 with six tests where `git show` says **four**, and
  claimed three loop-guard tests were added at a revision whose diff for that file is **empty**, which
  `1186 + 2 = 1188` already refuted"
- `:901-904` (pre-existing) — "The earlier version credited round 5 with six tests where it had four, and
  claimed three loop-guard tests were added at a revision whose diff for that file is empty — a claim
  `1186 + 2 = 1188` already refuted."

Three assertions, stated twice, six lines apart, in slightly different wording — which is the exact
mechanism `:290-294` says defeated three rounds of exact-match deletion. Nothing tests for it.

### `B11` (BLOCKING) — the P7 derivation is a round behind for the third time

The block introduces itself at `:857-861` as "**Re-run after the last artifact changed, twice, because
this block was wrong about its own currency both times**". Its stated totals at `:865-866` are
`1432 passed / 16 skipped` and `1193 passed / 19 skipped`, both of which I measured exactly. Its
derivation at `:887` is:

```text
per commit, e2e project:   3f815725  1422    c40b2358  1425    cb91e089  1428    ac4700d1  1431
```

It ends at 1431 and has no row for round 7's repairs, so the block **does not derive the number it states
twenty lines above**. I re-derived the per-file counts at every revision with
`git show <rev>:<file>` piped through the callsite pattern:

```text
rev        retractedClaims  buildCommand  stageEvidence  matrix    e2e     unit+integ
3f815725         0               9              4           4      1422       1186
c40b2358         0              11             6           5      1425       1188
cb91e089         3              11             6           5      1428       1188
ac4700d1         5              14             7           5      1431       1191
9a37421c         5              14             7           5      1431       1191
dbe00247         6              16             7           5      1432       1193   <- HEAD, no row
```

Every listed figure is right; the missing row is `9a37421c -> dbe00247`, e2e `1431 -> 1432` and
unit+integration `1191 -> 1193`, being `retractedClaims` 5 to 6 and `buildCommand` 14 to 16. Round 7's
`B9` was about this block's attribution and it is fixed — the sequence is now per commit and correct.
What recurs is the currency defect the block's own opening sentence names, third occurrence.

---

## 5. Numbers (request question 5)

Every figure re-derived, not read. Commands and outputs in section 8.

| claim | site | measured | verdict |
| --- | --- | --- | --- |
| scoped validate = `info=2 warning=0 error=2`, exit 1 | `atdd:869`, `:1011` | identical, exit 1 | **correct** |
| the two are `QFAI-ATDD-111` (`US-0017-0007`) and `-112` (8 TCs) | `atdd:235` | exactly those; TC-0017-0016/0030/0032/0033/0034/0035/0069/0070 | **correct** |
| `--profile full` = `error=4`, exit 1 | `atdd:871`, `:982` | `info=4 warning=404 error=4`, exit 1 | **correct** |
| the four codes are `-111`, `-112`, `QFAI-REVIEW-004`, `-005` | `atdd:983` | exactly those; `-004`/`-005` both against `review-20260821100000000`, the in-flight pack | **correct** |
| unscoped `-111` = 12 US across five specs, this spec owns 1 | `atdd:983` | 12 ids: spec-0003 8, -0006 1, -0008 1, -0015 1, -0017 1 | **correct** |
| unscoped `-112` = 15 TCs across four specs, this spec owns 8 | `atdd:983` | 15 ids: spec-0003 1, -0008 4, -0015 2, -0017 8 | **correct** |
| the `-111` split 8 + 1 + 1 + 1 + 1 = 12 | `atdd:778-779` | exact | **correct** |
| `pnpm ci:lint` exit 0, all eleven members | `atdd:864` | exit 0; exactly 11 members joined by `&&` | **correct** |
| `test:e2e` 1432 passed / 16 skipped | `atdd:865` | 84 files, 1432 passed / 16 skipped (1448), exit 0 | **correct** |
| `--project integration --project unit` 1193 / 19 | `atdd:866` | 1193 passed / 19 skipped (1212), exit 0 | **correct** |
| `tests/assets` (the request's third total) | — | 64 files, **1313 passed**, exit 0 | **correct** |
| ledger guard scoped: 8 backed, exit 0 | `atdd:219` | `8 claim(s) backed by a test annotation (spec-0017)`, exit 0 | **correct** |
| repo-wide: exit 1, 127 of 208 unbacked, 16 specs | `atdd:222`, `:785` | exit 1; 127 unbacked lines; 208 total claims; 16 distinct specs | **correct** |
| 82 ledger rows: 71 Integration (63 / 6 / 2) + 11 Unit | `atdd:21-22`, `:259` | exact; the two `todo` are TDD-0069 / TDD-0070, both `DR-ID: -`, `Blocked-By: -` | **correct** |
| the 8 uncovered TCs are the 6 `blocked` + 2 `todo` | `atdd:270-271` | identical sets | **correct** |
| matrix: 9 rows, 3 pass / 1 warn / 5 fail, 38 depth cells, A 30 / B 7 / C 1 | matrix `:57`, `:114`, `:139` | derived: 3/1/5; 38 depth failures; 38 partition members A 30 / B 7 / C 1; 0 unclaimed, 0 phantom | **correct** |
| the eight packs, seven seals | `atdd:1073-1096` | 8 directories, 8 named, 7 seals, **all 7 recompute**; round 1's superseded value recomputes over the three reports as they stand | **correct** |
| the per-file test counts (16 / 6 / 7 / 5 / 22 / 9 across 8 describes) | `atdd:188-200` | all exact, both by vitest and by `countCases` | **correct** |

### `## Final status` now says what the packs say

| the record says | on disk | |
| --- | --- | --- |
| "**seven** rounds" (`:1027`) | 8 pack directories, **7** holding reviewer reports | ok |
| "**21** reviewer responses" (`:1027`) | 21 report files: 2 + 4 + 3 + 3 + 3 + 3 + 3 | ok |
| "**20 REVISE and one PASS**" (`:1027`) | 20 REVISE; the PASS is `review-20260821080000000/R04_qa-gatekeeper-p1d.md` | ok |
| the table at `:1032-1040` is the full set | rounds 1-7 all present, round 3 correctly marked "no stage `qa-gatekeeper`" | ok |
| "**Eight** packs, one per round" (`:1057`) | 8 directories at or after `FIRST_PACK` | ok |

Round 7's `B10` is **applied in full**. The only thing left contradicting it is `atdd:989`, forty lines
above, which is `B7`.

### The `--no-filters` seal reasoning is correct, and I reproduced both computations

`atdd:1120-1129` states the manifest line as an unfiltered git blob hash, a single space, the pack-
relative path and a newline, and says round 7's pack is the first with CRLF content, so the filtered and
raw hashes diverge there and the recorded value is the unfiltered one. I computed both, per pack:

```text
pack                      files  CRLF files   recorded seal matches
review-20260820200000000    4        0        the raw / --no-filters value
review-20260820220000000    6        0        the raw / --no-filters value
review-20260821000000000    5        0        the raw / --no-filters value
review-20260821020000000    5        0        the raw / --no-filters value
review-20260821040000000    5        0        the raw / --no-filters value
review-20260821060000000    5        0        the raw / --no-filters value
review-20260821080000000    5        1        the raw / --no-filters value
    raw      = ea0849f0b759bd8d...  <- recorded
    filtered = 3d56fd2edd484c0f...  <- what a filtered `git hash-object` gives
review-20260821100000000    1        -        (no seal; in flight, correct)
```

The reasoning holds and the value is the right one: `sealOf` at `stageEvidenceCounts.test.ts:71-91` reads
working-tree bytes, so the raw hash is the only one it can reproduce. The CRLF file is
`review-20260821080000000/R03_qa-gatekeeper.md` — **my own round-7 report**, 423 CRLF terminators, so the
cause is mine.

### `A8` (advisory) — the sentence explaining it is off by one and self-contradictory

`atdd:1124-1126`: "The first **seven** packs held LF-only files … Round 7's pack carries one report with
CRLF line endings." Round 7's pack **is** the seventh. Measured: packs 1-6 have zero CRLF files, pack 7
has one. It is the first **six**. The two sentences refute each other inside one paragraph.

### `A9` (advisory) — one pattern, still three counts

Round 7's `A5`, unapplied: `atdd:619` "found **five** times"; `atdd:803` "**Four** occurrences on this
spec now, all four"; matrix `:328-329` "**Fourth** time on this spec". Nothing derives any of the three.
My `B4` is a further occurrence of the same class, which makes the divergence more consequential than it
was.

### `A10` (advisory) — the corpora are counted three ways

`atdd:191` says "eight corpora"; `atdd:629-630` enumerates four; matrix `:223-225` enumerates five. Round
7's `A6`, unapplied. The four and five I verified as accurate counts of the corpora they name; nothing
names eight.

### `A11` (advisory) — the Hard Gate artifacts are still untracked

`atdd:236-245` correctly declines `validate.log` and cites `.qfai/report/validate.spec-0017.json` and a
per-run directory instead. I confirmed the reasoning and reproduced both: my shadow run wrote
`validate.spec-0017.json` at the path `qfai.config.yaml` configures — `output.validateJsonPath` and
`paths.outDir` are both at their defaults, which I read rather than assumed. But
`git ls-files .qfai/report` returns five paths — `.gitignore`, `README.md`, `preflight_summary.md`,
`specs-coverage/spec-0012.md`, `validate.log` — so neither cited artifact is in the repository, and the
recorded `run-20260820194530635` cannot be checked by a later reader. Round 7's `A7`, unchanged. Not
blocking: the numbers reproduce from source, which I did.

---

## 6. My own gates

### Coverage Depth Matrix gate — **PASS**, with `B8` against its content

- The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md`, not inside
  `atdd-spec-0017.md` — which under my rules would be a missing matrix, because the managed `.gitignore`
  block would keep the justifications out of any commit.
- Derived, not read (`tmp/r8-qa/matrix.mjs`): 9 rows; `Status` 3 pass / 1 warn / 5 fail matching the
  declared total; 38 failing depth cells; 38 partition members in classes A 30 / B 7 / C 1; zero
  unclaimed cells and zero phantom members; every failing-status row carries its own justification
  heading.
- Every one of the nine `US-*` rows carries both a normal-path and an error-path assessment. The eight
  failing normal/error cells belong to rows whose shipped surface does not exist, which is a disclosed
  absence with a per-cell justification, not an unjustified gap.
- `B8` is a content defect — a stale version history and a refuted design statement attributed to the
  current version — not a missing or unjustified matrix, so it does not fail this gate. It is blocking at
  the stage gate.

### RED/GREEN Observation Gate — **no subject at the row level**

`atdd:277-289` says none advanced, and `tdd/test-list.md:107-108` confirms both rows are `todo` with
`DR-ID: -` and `Blocked-By: -`. There is no observed RED and no GREEN to judge for this stage, and
correctly so. Nothing in this report is an observation verdict.

### Branch 3 (`TDD-0070`) — **closed at round 7, not re-opened**

P1d passed at round 7 and that gate is closed. I read `DR-0017-0010` and the `TDD-0070` section and found
nothing that would reopen either: the record still states what could not be observed and why each branch
was unavailable, per row, which is what my rules require of a branch-3 record. `atdd:451-454`'s statement
that the PASS covers the observation and nothing else, and `:476-481`'s that branch 3 does not close a
spec, are both correct. `B7`'s three sentences are *about* the review rather than about the reasoning,
which is why they are stage findings and not P1d ones.

### Validate hard gate — **measured, and it fails as the record says**

`error=2` scoped and `error=4` on the full profile, both exit 1. The record does not claim otherwise.
Completion is correctly `FAIL`.

### `TDD-0069`'s ledger `Evidence` cell — accepted as a handover, unchanged

`tdd/test-list.md:107` still opens "NOT BLOCKED by a CR", still says "the workflow changes are unmerged"
and still ends with the exit P1d showed is unreachable. All three are `RETRACTED` entries.
`retractedClaims.test.ts:34-38` excludes that file deliberately and `atdd:309-333` carries the
instruction, quoting the cell and naming all three refuted parts. That is the right answer under the
Drift Protocol — the cell is `/qfai-implement`'s. Residual risk, recorded rather than blocking.

---

## 7. Required fixes (blocking only)

1. **`B1`** — give each tool its own boolean list (`bools` beside `pass` and `dirs`) and apply rule 3 on
   both branches. Corpus, as long/short **agreement** assertions rather than membership lists:
   `gradle --console plain build` equals `gradle --console=plain build`, `make -j 4 build` equals
   `make -j4 build`, `dotnet --verbosity minimal build` equals `dotnet --verbosity=minimal build`, and
   `cargo --config build.jobs=2 test` is `none`.
2. **`B2`** — `-w` cannot be a global boolean. Either key the boolean list by manager or resolve `-w` per
   manager. `pnpm -w build` must equal `pnpm --workspace-root build`, and `npm -w qfai run build` must
   equal `npm --workspace qfai run build`.
3. **`B3`** — do not generate the probes from the set. Pin each member as a **literal** case, or assert
   the set's contents against a literal expected array before the loop runs, so a deletion fails the
   comparison. `N01`-`N16` must all redden.
4. **`B4`** — treat the shipped-tree assertion as an oracle that has to be falsified: keep `E01`-`E11` as
   a corpus of builds that must all be seen. Until they are, the `US-0017-0004` cell's `Oracle strength`
   should say what I measured rather than carry a warning on the old grounds.
5. **`B5`** — normalise so placement cannot matter: strip zero-width and format-class characters
   (U+200B-U+200D, U+2060, U+FEFF, U+00AD), then compare on a whitespace-free letter sequence. `Z04`,
   `Z05`, `Z06`, `Z10`, `Z11`, `Z12` must redden. And judge quotedness by an actual quote construct
   rather than by parity, so `Z09` reddens.
6. **`B6`** — replace entry 13's needle with a substring of the sentence it retracts (`defeated by
   running the formatter` is one), and add an assertion that every `RETRACTED` needle matched *something*
   at the moment it was added — otherwise a vacuous entry is indistinguishable from a dormant one. `W01`
   must redden.
7. **`B7`** — apply `atdd:472` (six passes) and `atdd:811` (six), and rewrite `atdd:989`: the P1d gate is
   closed and this is round 8. Add all three wordings to `RETRACTED`, plus the matrix's "counting only
   before any flag" sentence, so `W02` and `W03` redden.
8. **`B8`** — matrix `:188-190` to eight/seven; add v6, v7 and v8 to the log at `:192-204`; **replace**
   the refuted rule at `:219-221` with v8's actual grammar; reconcile the corpora count with `atdd:191`.
   `X02` is green, so nothing is in the way.
9. **`B9`** — add `tests/assets/stageEvidenceCounts.test.ts` to `OWED` and record its run in
   `## Commands executed`.
10. **`B10`** — merge `atdd:890-895` and `atdd:901-904`. They state the same three things.
11. **`B11`** — add the HEAD row to the per-commit block: `9a37421c -> dbe00247`, e2e `1431 -> 1432`,
    unit+integration `1191 -> 1193`, being `retractedClaims` 5 to 6 and `buildCommand` 14 to 16.

## 8. Every command I ran, with its result

```text
git rev-parse --short HEAD                                       dbe00247  (start and end)
git status --porcelain                                           empty  (start, each campaign, end)
git diff --stat 9a37421c HEAD                                    13 files, +2781 / -180
git log --oneline 9a37421c..HEAD                                 9882a1d4, dbe00247

# baselines
npx vitest run --project unit tests/unit/buildCommand.test.ts    16 passed, exit 0
npx vitest run  (the three assets guards together)               18 passed, exit 0
npx vitest run --project e2e                                     84 files, 1432 passed / 16 skipped, exit 0
npx vitest run --project integration --project unit              1193 passed / 19 skipped, exit 0
npx vitest run tests/assets                                      64 files, 1313 passed, exit 0
pnpm ci:lint                                                     exit 0  (11 members)

# classifier probes  (tmp/r8-qa/probe.mjs, 66 commands, both real manifests)
                                                                 25 disagreements

# classifier mutations  (tmp/r8-qa/runner.mjs + table.mjs, 57)
                                                                 35 GREEN, 22 red
  restore sha256 db22152241397eb24476e3c4b761ad082d0d69b0afc2cd0b6c2043d885e413d0  byte-identical
# the same 17 member mutations, iterating test only               17 GREEN, 0 red
# the same 17 against the whole corpus file                       12 GREEN, 5 red

# shipped-tree plants  (etable.mjs, qfai-tests.yml:187, unit + E2E)
                                                                 10 GREEN, 1 red (the control)
  restore sha256 581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee  byte-identical

# artifact mutations  (atable.mjs 38 + wtable.mjs 4, on atdd-spec-0017.md)
                                                                 13 GREEN, 25 red, 4 patch-miss
  restore sha256 0fdaf408f33d3a069fdd216e8a99b5b06de54aafda321988bf0901de6a0db42f  byte-identical
# matrix mutations  (xtable.mjs, 10 on coverage-depth-spec-0017.md)
                                                                 7 GREEN, 3 red
  restore sha256 7d683d0602f372a87a0a8057339c2c138ec73a2a59564fc993424754c6c846af  byte-identical
# it.for probe  (fortable.mjs / forcheck.mjs, coverageDepthMatrix.test.ts)
                                                                 GREEN; vitest reports 7, record says 5
  restore sha256 9e480a2ddeb22ad9203bce9f1f3c409864d2d3c1d3d7a2dc75f27ce7677c03a4  byte-identical

# retracted-claim census  (tmp/r8-qa/census.mjs, 13 entries against 5 files)
  11 entries match somewhere, every occurrence quoted (u=0);  2 match nothing
  entry 13 needle against the wording it retracts:  no match

# seals  (tmp/r8-qa/seals.mjs)
  8 packs on disk, 8 named in the record, 7 seals recorded, 7 of 7 recompute (raw / --no-filters)
  round 7 pack: 1 CRLF file; raw ea0849f0...  filtered 3d56fd2e...   recorded = raw
  round 1 superseded over the 3 reports as they stand:
    d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9   MATCHES the record
  21 reviewer reports; 20 REVISE + 1 PASS
```

```text
# ledger guard
node scripts/check-atdd-annotation-ledger.mjs --spec 0017        8 claim(s) backed, exit 0
node scripts/check-atdd-annotation-ledger.mjs                    exit 1; 127 unbacked of 208; 16 specs

# ledger row census
82 TDD rows: 71 Integration (63 refactor / 6 blocked / 2 todo) + 11 Unit refactor
todo: TDD-0069, TDD-0070 — both with DR-ID and Blocked-By at the placeholder dash

# matrix arithmetic  (tmp/r8-qa/matrix.mjs)
9 rows; Status 3 / 1 / 5; 38 depth cells; partition 38 members A 30 / B 7 / C 1;
0 unclaimed, 0 phantom; 0 rows missing a normal or error assessment

# per-revision derivation
3f815725 e2e 1422 / u+i 1186   c40b2358 1425 / 1188   cb91e089 1428 / 1188
ac4700d1 1431 / 1191           9a37421c 1431 / 1191   dbe00247 1432 / 1193

# validate, in a git-archive shadow root with all 83 symlinks re-materialised as relative targets
validate --profile atdd --fail-on error --spec 0017 --root tmp/r8-qa/shadow
    counts: info=2 warning=0 error=2   exit 1     (no QFAI-LINK-001)
    QFAI-ATDD-111 SPEC-0017:US-0017-0007
    QFAI-ATDD-112 TC-0017-0016/0030/0032/0033/0034/0035/0069/0070
    artifact  tmp/r8-qa/shadow/.qfai/report/validate.spec-0017.json
validate --profile full --fail-on error --root tmp/r8-qa/shadow
    counts: info=4 warning=404 error=4   exit 1
    QFAI-ATDD-111 (12 US / 5 specs)   QFAI-ATDD-112 (15 TC / 4 specs)
    QFAI-REVIEW-004 and -005 both against review-20260821100000000

# real tree integrity
.qfai/report before  1507 files  67dbc8ef06a9ef99dd3f0732cc29fdcb3a35bf3d0423d464bc04f972833e121d
.qfai/report after   1507 files  67dbc8ef06a9ef99dd3f0732cc29fdcb3a35bf3d0423d464bc04f972833e121d
git ls-files .qfai/report      5 paths; neither cited Hard Gate artifact is tracked
qfai.config.yaml               paths.outDir and output.validateJsonPath both at their defaults
```

## 9. Mutation hygiene

Six campaigns, **138 mutations across five tracked files**, every one reverted in the same step with a
sha256 comparison printed, and every campaign wrapped in a `finally` that restores unconditionally:

```text
packages/qfai/tests/helpers/buildCommand.ts               db22152241397eb2...  byte-identical
packages/qfai/tests/assets/coverageDepthMatrix.test.ts    9e480a2ddeb22ad9...  byte-identical
packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml
                                                          581608a7e1dbbb72...  byte-identical
.qfai/evidence/atdd-spec-0017.md                          0fdaf408f33d3a06...  byte-identical
.qfai/evidence/coverage-depth-spec-0017.md                7d683d0602f372a8...  byte-identical
```

`git status --porcelain` was empty at the start, after every campaign, after both validate runs, after
every suite run, and at the end. HEAD was `dbe00247` at the start and `dbe00247` at the end. Validate
never wrote the tracked `.qfai/report/validate.log`: both runs used a shadow root and wrote into that
tree, and the real report digest is unchanged across both. The 83 symlinks were re-materialised with
relative target text preserved — spot-checked, `.claude/skills/conflict-resolve` points at
`../../.agents/skills/conflict-resolve` — and no `QFAI-LINK-001` appeared, which corroborates round 7's
junction disclosure.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — every finding names a file and line, and every
      measurement names the command, the mutation and the observed verdict
- [x] Required gates and residual risks are recorded — Coverage Depth Matrix **PASS**, with content
      defect `B8` routed to the stage gate; RED/GREEN observation **no subject**; branch 3 **closed at
      round 7, not re-opened**; validate hard gate **fails as recorded**, completion correctly `FAIL`.
      Residual risks: the `TDD-0069` ledger `Evidence` cell (routed handover, three refuted statements
      untested), the untracked Hard Gate artifacts (`A11`), the retracted-claims guard's three false
      accusations (`A4`), and the classifier's wrapper-flag and buildx-bake blind spots (`A1`, `A2`)
- [x] No mutation left in the tree — 138 mutations, five files, all byte-identical on restore;
      `git status --porcelain` empty; HEAD `dbe00247` unchanged
