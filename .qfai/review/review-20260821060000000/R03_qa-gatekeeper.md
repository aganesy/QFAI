# R03 — qa-gatekeeper (round 6, spec-0017 / `/qfai-atdd`)

- Role: `qa-gatekeeper`, independent stage-level gate, non-edit
- Round: 6. Prior stage-level reports: `review-20260820200000000/R03` (round 1),
  `review-20260820220000000/R03` (round 2), `review-20260821020000000/R03` (round 4),
  `review-20260821040000000/R03` (round 5). Round 3's slot went to the P1d re-route.
- Revision under review: **`cb91e089`** — `git rev-parse --short HEAD` at start **and** at finish. HEAD
  did not move.
- `git status --porcelain`: **empty** at start, before and after every one of the 41 mutation cycles,
  and at finish. `git stash list` empty. No `git checkout` / `stash` / `reset`, no commit, no push.
- Scratch: `tmp/r06qa/**` only. Every mutation planted alone, restored from a pristine in-memory copy
  with a `git`-compatible blob-hash comparison **in the same step**; the harness aborts the whole run if
  a restore or a porcelain check fails. See Mutation hygiene.

## Verdict: **REVISE**

Ten blocking findings. Of the four artifacts I was asked to attack, **none survives**. The headline is
one mechanism, and it defeats **two** guards at once: both `retractedClaims.test.ts` and the matrix
test's refuted-figure pin match a **literal space** where Prettier has put a **newline**. So:

- a retracted claim reinstated as a plain assertion is invisible if it straddles a line wrap, and
- **the record already violates its own new rule at HEAD** — `CR-20260820-0012:127` asserts a refuted
  claim in italics rather than quotes, and the guard is green only because the phrase wraps, and
- **the forbidden figure `0 misclassified` is already present** in `coverage-depth-spec-0017.md:208-209`,
  wrapped, while the test written to keep it out passes.

The guard whose stated purpose is "prose cannot be trusted to say whether prose was deleted" can be
defeated by running the formatter that `ci:lint` enforces.

| #     | Finding | Class |
| ----- | ------- | ----- |
| `B1`  | `retractedClaims.test.ts` is defeated by a line wrap — five laundering routes measured — and the record **violates the rule at HEAD** | blocking |
| `B2`  | The matrix test's `\b0 misclassified\b` pin is defeated by the same wrap, and the figure is **already in the file**; asserting it as v6's is green | blocking |
| `B3`  | v6 **regresses** on the tool-with-flags class (`make -C d build` and six more -> `none`), and the corpus **pins the defect** so the repair reddens | blocking |
| `B4`  | `pnpm --filter qfai build` -> `heuristic` while `pnpm build` -> `build`: the same command still disagrees with itself, and round 5's required fix is now **forbidden** by the corpus | blocking |
| `B5`  | **9 of 15** mutations to v6's machinery redden nothing, including 12 `TOOLS` members and the whole false-positive guard | blocking |
| `B6`  | `## Work performed` states one file's size **three times, two of them wrong**, invisibly; and calls the classifier **v5** | blocking |
| `B7`  | The guard output is still **first-match only** (round 5's `S8`, unfixed), and a recorded run that drops `-> ` escapes coverage entirely | blocking |
| `B8`  | The P7 arithmetic is **wrong twice** about its own history, and the currency statement names the wrong tree for a total only HEAD holds | blocking |
| `B9`  | The retracted claim **survives in the ledger** — `TDD-0069`'s `Evidence` cell asserts it, and contradicts the record twice; the ledger is outside the guard's file list | blocking |
| `B10` | The matrix test still defaults a missing `Status` to `⚠️` and drops a row's extra cell silently: the round-5 repair was applied to the **header only** | blocking |
| `M1`-`M10` | advisories | non-blocking |

**What passed, measured rather than accepted.** All **five** closed pack seals reproduce **exactly**
under an independent implementation, and the in-flight pack correctly carries none — fifth round
running. **Round 5's `B1` and `B2` are fixed and I confirmed it by running the suite: `test:e2e` is
`1428 passed / 16 skipped`, exit 0**, and `--project assets` is gone from the P7 block. `1188 / 19`
exact. Scoped gate `info=2 warning=0 error=2`, no `QFAI-LINK-001`; `--profile full` `error=4` with
`QFAI-REVIEW-004/005` now naming **round 6's** pack, as round 5 predicted; `sdd` exit 0; `tdd`
`error=2`. Unscoped breakdowns exactly `8+1+1+1+1 = 12` and `1+4+2+8 = 15`. `127` unbacked over `16`
specs against `208` unique claims; `8` scoped, exit 0. `ci:lint` exit 0, eleven members. Ledger
`82x9 / 71-11 / 74-6-2`, `DR-ID` `-` on all 82. The Coverage Depth Matrix's content is **correct** on an
independent parse: 9 rows, `3/1/5`, 38 depth failures plus 5 in `Status`, a 38-member partition that is
complete, disjoint and phantom-free at `A 30 / B 7 / C 1`, zero misassigned. Round 5's `B7` (seals
counted not compared), `B8`, `B9` and `B10` are **all genuinely fixed** — `S7` reddens on a one-nibble
seal change, the `L*`/`Z*` collision is renamed **and disclosed**, `### TDD-0069` now quotes its old
sentences with attribution and replaces "are gone now" with a table of where each landed, and
`## Gaps` item 8 uses the not-yet form. `countCases` is right on its own file and on a five-decoy
fixture. Seven of v6's twelve round-5 forms now resolve.

---

## 1. Break `retractedClaims.test.ts` (request question 1)

Subject: `packages/qfai/tests/assets/retractedClaims.test.ts`. Baseline **3 passed**, exit 0.
Nine real mutation cycles against `npx vitest run --project e2e tests/assets/retractedClaims.test.ts`,
each planted alone and restored with a hash comparison in the same step, plus a green control.

```text
R0  control: a plain sentence appended                          exit=0  reddens nothing
R1  markdown blockquote asserts the claim                       exit=1  REDDENS
R4  the claim WRAPPED across a line, plain assertion            exit=0  REDDENS NOTHING  <- B1
R5  the claim reworded by one word                              exit=0  REDDENS NOTHING
R6  the claim asserted in a file outside its `files` list       exit=0  REDDENS NOTHING
R8  ONE stray double quote early, nothing else changed          exit=1  REDDENS (8 FALSE POSITIVES)
R10 REFLOW ONLY: de-wrap the CR's italic assertion              exit=1  REDDENS  <- live violation
R13 stray quote + plain assertion in the clean window           exit=0  REDDENS NOTHING
R15 an inches measurement as the stray quote                    exit=0  REDDENS NOTHING
```

I also simulated the shipped algorithm exactly (`tmp/r06qa/sim.py`, cross-checked against all nine real
runs) to search the space cheaply; blockquote, fenced code block, table cell, nested quote and HTML
comment all redden, so four of the request's five suggested routes are genuinely closed.

### `B1` (BLOCKING) — the rule is defeated by a line wrap, and the record breaks it at HEAD

**`quotedRanges` and `indexOf` both work on text with the newline intact**
(`retractedClaims.test.ts:140-149`). `normalise` (`:99-101`) strips `*`, `_` and backticks and nothing
else. So a claim whose words straddle a line break cannot be found at all. Measured over the four
scanned files (`tmp/r06qa/wrap.py`), **four occurrences are already invisible to the shipped guard**:

```text
atdd-spec-0017.md:124            'All 71\nIntegration rows are already at refactor'
CR-20260820-0012...md:127        'degenerate against this\nrunner'
coverage-depth-spec-0017.md:206  'rebuilt the scan around the\nverb'
coverage-depth-spec-0017.md:208  '0\nmisclassified'
```

Three are quoted and therefore compliant — but the guard **reports compliance it did not verify**.
The fourth is a live violation. Running the whitespace-tolerant version of the same predicate
(`tmp/r06qa/correct.py`) over the four files returns exactly one assertion-form hit:

```text
CR-20260820-0012...md:127
  "(An earlier version of this option called clause 1 _degenerate against this
   runner_; P1d's third pass showed that is false, ...)"
```

`normalise` strips the `_`, leaving `degenerate against this runner` standing as **prose, not a
quotation** — which is what `:17` forbids ("A record is free to say `this said "X", and X is wrong`; it
is not free to say X"). `R10` proves it: a **reflow-only** edit joining `this\nrunner` onto one line —
no words added, removed or changed, exactly what Prettier does at a different print width — turns the
suite red with `CR-...md:127 asserts "degenerate against this runner"`. The fifth recurrence of this
defect class is live at the revision that added the guard against it.

**Three further laundering routes, all measured green:**

- **`R4` — wrap the assertion.** `The row cannot go green because the workflow changes are\nunmerged on
  this branch.` is a bare assertion of a retracted claim and the suite is green. `:198-200` asserts
  `entry.claim.length < 80` "short enough to survive the record being rewrapped by Prettier" — that is
  the wrong mitigation, and inverted: in a 100-column document an 80-character phrase wraps with near
  certainty. Length does not help; only whitespace tolerance does.
- **`R5` — reword by one word.** `changes are unmerged` -> `changes remain unmerged`: green. Inherent
  to a verbatim list, but this record's history is of claims **restated**, not copy-pasted, so the
  paraphrase class needs to be a disclosed limit rather than an implicit one.
- **`R6` — assert it in a file the entry does not list.** `because the workflow changes are unmerged`
  lists `[EVIDENCE, DR]`; asserted in `CR-20260820-0012` it is green — and the CR is the artifact the
  claim's own `why` field names as the real obstacle.

**And the mechanism fails in the other direction, into a required CI leg.** `quotedRanges`
(`:109-123`) pairs quote characters **positionally over the whole document**, with no line or block
boundary, so parity is global. `R8` inserts **one** stray `"` near the top of `atdd-spec-0017.md` — a
shell snippet, an inches measurement, an unbalanced quote in a fenced block — and changes nothing else.
Result: **eight false positives**, the suite red, and a message accusing the record of asserting eight
claims it had correctly quoted:

```text
atdd-spec-0017.md:373 asserts "because the workflow changes are unmerged"
atdd-spec-0017.md:405 asserts "because the workflow changes are unmerged"
atdd-spec-0017.md:381 asserts "there is no run history to mutate"
... 5 more
```

`tests/assets/**` runs in the **`e2e`** project, a required `ci.yml` matrix leg. That is round 5's `B1`
shape — a new guard able to redden a required leg for a reason unrelated to the property it checks —
reintroduced by a different mechanism.

The same parity gives a **clean** laundering: every retracted claim currently sits at or before byte
63837, and the next quote characters are at 66005 / 66043 / 67396 / 67432, so a stray `"` inserted
anywhere in that window opens a range that swallows a plain assertion with **zero** collateral. `R13`
and `R15` are green with no other claim disturbed.

**Required fix.** Match the claim over collapsed whitespace (`\s+` between words) and compute enclosure
over the same collapsed text. Add the ledger and the spec pack to the file list (`B9`). Bound quote
pairing at the paragraph or line so one stray quote cannot re-polarise the document. State paraphrase
as a known limit.

---

## 2. Break v6, both directions (request question 2)

Subjects: `packages/qfai/tests/helpers/buildCommand.ts` (v6) and
`packages/qfai/tests/unit/buildCommand.test.ts` (the corpora). Baseline **11 passed**, exit 0.
Corpus of my own choosing, run through a type-stripping probe against this repository's two real
manifests (`tmp/r06qa/probe.mts`, `probe2.mts`); fifteen mutation cycles with a green control.

### `B3` (BLOCKING) — v6's new rule regresses a whole class, and the corpus makes the repair illegal

`buildCommand.ts:269`:

```ts
    if (isTool) return !sawFlag && namesABuild(token) ? "build" : "none";
```

`sawFlag` is set by **any** flag (`:227-228`), including flags that are not semantic at all — a
directory selector, a parallelism knob, a daemon switch, a docker host. Measured:

```text
none   make -C packages/qfai build          <- the most common Makefile form in CI
none   make -j4 build
none   cargo --locked build
none   gradle --no-daemon build
none   bazel --output_base=/tmp build //...
none   docker buildx build --push .          <- the modern docker build
none   docker -H tcp://x build .
build  cmake --build .                       <- in the corpus
build  cargo build                           <- in the corpus
build  docker build -t x .                   <- in the corpus
```

Every in-corpus tool form puts its subcommand **first**; every out-of-corpus form puts a flag in front
of it. That is corpus selection by outcome for the third consecutive version. And these are
**regressions**: under v5 a tool target fell through to the script resolver, whose miss returned
`build` from the bare name, so `make -C d build` and `cargo --locked build` were `build` in v5 and are
`none` in v6. `buildCommand.ts:30-31` presents the rule as a distinction gained, with no limit stated.

**The corpus forbids the repair.** `V12` — delete `!sawFlag &&`, which is exactly what makes
`make -C d build` work — **reddens**, because `buildCommand.test.ts:227` asserts `cmake --install build`
is `none` and that is the only case distinguishing the two rules. One case pins a rule that costs seven
forms, and neither the corpus nor the docstring records the trade. The rule needed is per-flag (a
directory or parallelism flag is not a semantic separator), not "any flag".

### `B4` (BLOCKING) — the same command still disagrees with itself, and round 5's required fix is now pinned as forbidden

Round 5's `B3` was "the same command, upgraded by a lookup failure". v6 removed the upgrade (`:296`)
and left the disagreement, polarity flipped:

```text
build      pnpm build                  <- root build resolves to pnpm -C packages/qfai build -> tsup
heuristic  pnpm --filter qfai build    <- SAME BUILD, DOWNGRADED
heuristic  pnpm --filter=qfai build
none       pnpm -F qfai build          <- -F is the documented alias of --filter, in neither set
```

`--filter` is still in `DIR_FLAGS` (`:128`), and pnpm takes a **package name or glob** there, not a
directory — so in any pnpm workspace the lookup misses systematically and a provable build becomes a
labelled guess. Round 5 required: "Drop `--filter` from `DIRECTORY_FLAGS` or resolve it as a package
name." Neither was done, and **`V13` shows the fix is now blocked by the corpus**: dropping `--filter`
reddens `buildCommand.test.ts:210` and `:217`.

Worse, `:215-220` asserts "and it must agree with the unfiltered form — round 5 found them differing",
on the one target (`ci:build-verify`) where **both** sides are `heuristic` and the disagreement cannot
appear. The assertion that names round 5's finding is instantiated at the single point immune to it.

### `B5` (BLOCKING) — 9 of 15 mutations to v6's machinery redden nothing

Each planted alone into `buildCommand.ts`, restored with a hash comparison in the same step:

```text
V1   control: a comment line added                            exit=0  reddens nothing
V2   TOOLS: 12 members dropped (lerna rush ninja bazel buck
     mvn swift zig podman sbt rake)                           exit=0  REDDENS NOTHING
V3   LIFECYCLE: the whole publish hook chain dropped          exit=0  REDDENS NOTHING
V4   NOT_A_BUNDLER emptied (tsc no longer excluded)           exit=0  REDDENS NOTHING
V5   INTERPRETERS -> bash only (4 dropped)                    exit=0  REDDENS NOTHING
V6   isPathLike: the file-extension clause dropped            exit=0  REDDENS NOTHING
V7   PASSTHROUGH: dlx and workspaces dropped                  exit=0  REDDENS NOTHING
V8   inline flag: the isPathLike guard on the VALUE dropped   exit=0  REDDENS NOTHING
V9   MANAGERS: pnpx / bunx / bun dropped                      exit=0  REDDENS NOTHING
V11  TARGET_FLAGS: --task dropped                             exit=0  REDDENS NOTHING
V10  wrapper-strip loop bound 8 -> 1                          exit=1  REDDENS
V12  the tool-subcommand repair (see B3)                      exit=1  REDDENS
V13  --filter dropped from DIR_FLAGS (see B4)                 exit=1  REDDENS
V14  a missing script returns build again (the v5 defect)     exit=1  REDDENS
V15  the whole cd handler disabled                            exit=1  REDDENS
```

`V15` reddening is a **real advance** — round 5's `V11` was green there, and the `cd` semantics are now
pinned by `buildCommand.test.ts:247-254`. `V14` reddening means v6's headline property is genuinely
enforced. But `V4` and `V8` are the two that matter for the **false-positive** direction and both are
free: the only guard against a build-shaped inline flag value is unexercised, and `npx tsc --noEmit`
passes `NOT_BUILDS` for an unrelated reason, so the entire `tsc` exclusion could be deleted silently.

Two false positives measured, neither disclosed:

```text
build   pnpm -C packages/qfai pack --ignore-scripts   <- the flag suppresses every lifecycle hook
build   pnpm --reporter=build-log install
```

`--ignore-scripts` is round 5's `B5b`, unaddressed and unmentioned; `release.yml` uses that flag
deliberately and `npm ci --ignore-scripts` is already pinned in `NOT_BUILDS`, so the flag is in the
vocabulary of the tree and not in that of the predicate.

**Five of the twelve forms round 5 named are still `none`, and the record does not say which.**

```text
fixed -> build   npx turbo run build / pnpm turbo run build / npx nx run-many --target=build --all
                 pnpm nx build web / pnpm exec turbo build / yarn workspace qfai build / pnpm -w build
STILL none       timeout 600 pnpm build       xargs -0 pnpm build       env -i pnpm build
STILL none       bash -c "pnpm build"         npm run "build"
```

7 of 12. `env -i pnpm build` is the sharp one: `env` **is** in `WRAPPERS` (`:124`), but the strip loop
breaks on the first non-wrapper token (`:192`), so a flag after the wrapper defeats it — while
`env NODE_ENV=production pnpm build`, which is in the corpus, works because the assignment matches a
different branch. Two forms that look like one feature; one pinned, one broken.

Over my full 46-case corpus: **20 missed builds and 2 false positives** (`tmp/r06qa/probe.mts`), plus
`cd packages/qfai && cd .. && pnpm build` and `cd "$GITHUB_WORKSPACE/packages/qfai" && pnpm build`
both downgraded to `heuristic` (`normalise` at `:144-149` keeps `..` and cannot see a variable), and
`yarn workspaces foreach run build`, `pnpm recursive run build` and `./gradlew.bat build` all `none`.

**Does the committed corpus pin what it claims?** Partly. `V12`-`V15` are real, and the round-5 cases
that are present are pinned. But the `it` titled "classifies the ten forms round 5 measured against v5"
holds **twelve** assertions for "ten forms", five of round 5's named forms are absent, and what is
missing throughout is a **stated limits** block: a nested runner behind a wrapper, a tool subcommand
behind a flag, `-F`, `workspaces foreach`, `--ignore-scripts`, `cd ..`, `cd $VAR` and a quoted script
name are all invisible, while `buildCommand.ts:33-38` discloses only the helper-script limit. The
`expect.soft` usage in five of the eleven cases is good practice and worth keeping.

---

## 3. Break `stageEvidenceCounts.test.ts` again (request question 3)

Baseline **6 passed**, exit 0. Eleven cycles, green control.

```text
S1  control: a prose sentence added                                exit=0  reddens nothing
S2  the SECOND coverageDepthMatrix.test.ts entry: 4 -> 40 tests     exit=0  REDDENS NOTHING  <- B6
S3  the SECOND guard-output occurrence: 8 -> 80 claims              exit=0  REDDENS NOTHING  <- B7
S4  a recorded vitest output with the "-> " prefix dropped          exit=0  REDDENS NOTHING  <- B7
S6  the P7 suite totals: 1428 -> 9999 and 1188 -> 8888              exit=0  REDDENS NOTHING  (disclosed)
S5  a recorded vitest output kept in form: 9 -> 90                  exit=1  REDDENS
S7  round 5's recorded pack seal corrupted in ONE nibble            exit=1  REDDENS
S8  a pack removed from the Final status list                       exit=1  REDDENS
S9  the in-flight pack given a seal                                exit=1  REDDENS
S10 the annotated-describe count: 8 -> 18                          exit=1  REDDENS
S11 the first buildCommand.test.ts count: 11 -> 110                exit=1  REDDENS
```

`S5`, `S7`, `S8` and `S9` are round 4's `B4` item 1 and round 5's `B7` **fixed** — recorded vitest
outputs are covered, seal **values** recompute, the pack list is pinned, and the in-flight rule is
enforced rather than announced. That is the strongest repair in this round.

### `B6` (BLOCKING) — a size stated three times, two of them wrong, all three invisible; and the classifier is called v5

`.qfai/evidence/atdd-spec-0017.md` states `coverageDepthMatrix.test.ts`'s size **three** times:

```text
:149  ... coverageDepthMatrix.test.ts` - four tests, all seven falsification rounds reddening
:193  - **new** ... coverageDepthMatrix.test.ts` - 5 tests deriving the Coverage Depth Matrix totals
:203  - **new** ... coverageDepthMatrix.test.ts` - 4 tests pinning the matrix
```

The file holds **5**. `:203` is a duplicate `## Work performed` bullet for a file already listed at
`:193`, and it is **wrong**. `:149` is wrong and spelled as a word, so the `(\d+)` pattern cannot see it
at all. `CLAIMS` uses `pattern.exec` (`:142`), which takes the **first** match, so only `:193` is
checked. `S2` confirms it: `:203` can say any number. This is the defect class the file exists to stop,
present at HEAD, in the block the derivation covers, one round after round 5 reported the first-match
hole.

Same block, `:189-190`: "**new** `packages/qfai/tests/helpers/buildCommand.ts` — the build classifier,
**v5**". The unit under review is **v6**; the helper docstring says v6 (`buildCommand.ts:24`) and so
does the matrix (`coverage-depth:216`). Nothing derives the version.

### `B7` (BLOCKING) — the guard output is still first-match only, and a run can leave coverage by losing two characters

- **`S3`.** `:236` still does `.exec(evidence)` for the guard-output pattern. The string occurs at
  `:111` (Decision 4 prose) and `:219` (the recorded command output). Only `:111` is checked, so `:219`
  — the line recording what the guard **printed** — can be any number. This is round 5's `S8` verbatim,
  and `:849-851` still claims "the recorded guard output ... is now checked".
- **`S4`.** `RECORDED` (`:160`) requires the arrow form on the line after the command. Dropping the two
  characters `-> ` makes that row vanish, and the floor is only `rows.length > 2` (`:162-166`) while
  four runs are recorded — so any **one** of the four can be decoupled and left free. The floor should
  be "one row per file this stage added", derived, not a constant.

**And `countCases` measures a quantity that is not what vitest reports**, contrary to `:57` ("the
callsite, which is what vitest reports and prose means"). Measured directly against the shipped regex:

```text
 1 callsites   a template literal holding a statement-initial it(      (vitest: 0)
 0 callsites   the it.each template-table form                          (vitest: N)
 1 callsites   it.each over five rows                                   (vitest: 5)
 2 callsites   describe.each over three rows wrapping two cases          (vitest: 6)
 1 callsites   it.skip                                                  (vitest: 0 passed, 1 skipped)
 1 callsites   a prose line beginning "test the following behaviour"     (vitest: 0)
```

`describe.each` is the **prevailing idiom in this very directory** — 40+ sites across
`packages/qfai/tests/assets/*.test.ts`, nineteen of them in `atddRedProvenance.test.ts` alone
(`:45`, `:133`, `:254`, ...), plus `perSpecGateScope.test.ts:48` and `swallowedListItem.test.ts:80`.
The six derived files happen not to use it. The moment one does, `countCases` and vitest part, and the
test named "records vitest outputs the named files can actually produce" will **require** the record to
state a number the file cannot produce. The position heuristic is a good call; the claim that a callsite
equals a run is not.

---

## 4. Break the matrix pinning test a fifth time (request question 4)

`packages/qfai/tests/assets/coverageDepthMatrix.test.ts`. Baseline **5 passed**. Six cycles, run
together with `retractedClaims.test.ts` so both guards are observed at once (8 passed at baseline).

```text
X1 control: a prose sentence added                                       exit=0  reddens nothing
X2 the refuted figure ASSERTED, wrapped as Prettier wraps it             exit=0  REDDENS NOTHING
X3 US-0017-0004 per-row measurement inverted (round 5 X3)                exit=0  REDDENS NOTHING
X4 the version fence claims v6 achieves the refuted figure               exit=0  REDDENS NOTHING
X5 a ninth cell on ROWS only, header untouched                           exit=0  REDDENS NOTHING
X6 US-0017-0001 loses a cell; Oracle slides into Status, default fills   exit=0  REDDENS NOTHING
```

Round 5's `X6` (the ninth **column**) is closed — `:108-117` now pins the header row against `COLUMNS`,
and that is a genuine advance.

### `B2` (BLOCKING) — the refuted-figure pin is defeated by a wrap, and the figure is already in the file

`:324` is `/\b0 misclassified\b/.test(text)` expected `false`.
`coverage-depth-spec-0017.md:208-209` reads:

```text
... And v3's "21 caught / 14 rejected / 0
misclassified" - a figure measured only against a corpus this stage chose, ...
```

The forbidden string **is present**, split by Prettier at the print width, and the test that exists to
keep it out is green. Today it sits inside a quotation and is explicitly withdrawn, so the record's
intent is honest — but the guard cannot tell, which `X2` proves: rewriting that sentence so it
**asserts** the figure, still wrapped, is green in **both** guards. `X4` is worse: rewriting the version
fence so that **v6** claims `21 caught / 14 rejected / 0\nmisclassified` is also green, because
`:328-331` is satisfied by `v6` appearing anywhere in the file. Round 4's blocking finding was that this
file published a refuted accuracy figure as current; the repair for it can be reverted, and the figure
re-attached to the **current** version, without anything reddening.

`X3` is round 5's `B6` second half, unrepaired: `US-0017-0004`'s failing score rests on the measurement
"**0 upload-artifact steps and 0 bundler builds**" (`coverage-depth:172`), and inverting it to
"**9 ... and 4**" is green. Test 3 (`:300-314`) checks only that a heading exists.

### `B10` (BLOCKING) — the tally default and the per-row cell drop survive; the fix was header-only

- **`X6`.** `:123` still reads `tally[row.cells["Status"] ?? "warning"] += 1`. Delete one cell from
  `US-0017-0001` — a single pipe — and `Oracle strength`'s passing score slides into `Status`, `Status`
  becomes `undefined`, the default fills it with the middle score, and because that row's `Status`
  **was** the middle score every derived number is unchanged and **all five tests pass**. A row silently
  lost a coverage dimension. This is the "default the unrecognized case to the warning score" trap the
  file's own comment at `:62-68` says was removed after round 2 — removed from `parseMatrix`, left in
  the tally.
- **`X5`.** `:59-60` still returns early when `COLUMNS[index]` is `undefined`, so a **row** carrying a
  ninth cell drops it silently. The header pin closes the column case and not the row case. The floor at
  `:347-350` ("must have parsed into all eight columns") exists and applies to `US-0017-0007` only; it
  belongs on every row.

**Required fix.** Assert every row's field count equals `COLUMNS.length` and remove the tally default.
Require a distinguishing phrase per **per-row** justification, the way `BODY_PHRASE` already does for
the class paragraphs. Match the forbidden figure and the version paragraph over collapsed whitespace.

---

## 5. Gates and numbers (request question 5)

All `validate` runs against a `git archive HEAD` shadow root at `tmp/r06qa/shadow` with the **83**
tracked symlinks re-materialised from the index (83 declared, 83 created, 0 dangling). The first pass
created them with POSIX separators, which Windows will not resolve, and that produced 70 spurious
`QFAI-LINK-001` subjects; re-creating them with native separators cleared all of them. That defect was
in my method, not in HEAD, and I record it because a reviewer owes its own false starts. The tracked
`.qfai/report/validate.log` was **never written**: `git hash-object` equals `git rev-parse HEAD:...` at
`2b572934...` before and after every run.

```text
validate --profile atdd --fail-on error --spec 0017   info=2  warning=0    error=2   EXIT 1
  [error] QFAI-ATDD-111  SPEC-0017:US-0017-0007                       <- and nothing else
  [error] QFAI-ATDD-112  8 spec-0017 TCs
  [info]  QFAI-ATDD-117 (11 Unit/Component TCs)   [info] QFAI-PROFILE-001
  NO QFAI-LINK-001
validate --profile full  --fail-on error             info=4  warning=404  error=4   EXIT 1
  [error] QFAI-REVIEW-004 / -005  ->  .qfai/review/review-20260821060000000  (THIS round's pack)
validate --profile sdd   --fail-on error             info=4  warning=26   error=0   EXIT 0
validate --profile tdd   --fail-on error             info=5  warning=376  error=2   EXIT 1

QFAI-ATDD-111 unscoped: spec-0003 8, -0006 1, -0008 1, -0015 1, -0017 1  = 12
QFAI-ATDD-112 unscoped: spec-0003 1, -0008 4, -0015 2, -0017 8           = 15
node scripts/check-atdd-annotation-ledger.mjs --spec 0017   8 claim(s) backed        EXIT 0
node scripts/check-atdd-annotation-ledger.mjs               127 unbacked, 16 specs   EXIT 1
unique ledger claims                                        208
pnpm ci:lint                                                EXIT 0; 11 members
pnpm -C packages/qfai test:e2e            1428 passed / 16 skipped        EXIT 0
vitest --project integration --project unit  1188 passed / 19 skipped     EXIT 0
vitest --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts   9 passed   EXIT 0
vitest --project integration .../checkAtddAnnotationLedger.test.ts  22 passed   EXIT 0
vitest --project e2e tests/assets/coverageDepthMatrix.test.ts        5 passed   EXIT 0
vitest --project unit tests/unit/buildCommand.test.ts               11 passed   EXIT 0
```

Every one of those matches the record, including **`test:e2e` exit 0**, which was round 5's worst
finding. `--profile full` is `error=4` and the `QFAI-REVIEW-*` pair has moved to round 6's pack — the
third consecutive round in which the practice regenerates it, exactly as round 5's `R02` predicted.

### The five pack seals — all reproduce

Serialization per `## Final status`: the git blob hash, a single space, the pack-relative path, a
newline; paths in byte order; sha256 over the stream. Implemented independently (`tmp/r06qa/seal.py`),
with the blob hash cross-checked against `git hash-object` on a real file.

```text
review-20260820200000000  4 files  5c8cd42571c8baf5...c74317e3  *** MATCH ***
review-20260820220000000  6 files  305ffd6555799fd3...5983e77a  *** MATCH ***
review-20260821000000000  5 files  257e793b5c764a81...6d01bfd0  *** MATCH ***
review-20260821020000000  5 files  aaa2d2a6e16b2027...04db35ff  *** MATCH ***
review-20260821040000000  5 files  5798d55711e1ff78...64263b62  *** MATCH ***  <- new this round
review-20260821060000000           IN FLIGHT, correctly unsealed
```

All six pack directories are **fully tracked** at HEAD (`git ls-files`), so the working-tree walk in
`sealOf` reproduces from a clean CI checkout. That was the one way the seal repair could have re-broken
the `e2e` leg, and it does not.

### `B8` (BLOCKING) — the P7 arithmetic is wrong twice, and its currency statement names the wrong tree

`.qfai/evidence/atdd-spec-0017.md:843-848` says round 5 added `stageEvidenceCounts.test.ts` "whose
**six** tests run under `e2e`: 1418 -> 1424", then that applying round 5's findings added "a matrix
round, two classifier rounds and **three loop-guard tests**: 1424 -> 1425 and 1186 -> 1188".

Measured at the three revisions with `git show`, counting callsites per file:

```text
                                       3f815725   c40b2358   cb91e089
checkAtddAnnotationLedger.test.ts          22         22         22
buildCommand.test.ts                        9         11         11
coverageDepthMatrix.test.ts                 4          5          5
stageEvidenceCounts.test.ts                 4          6          6
retractedClaims.test.ts                     -          -          3
```

- `stageEvidenceCounts.test.ts` had **four** tests when round 5 added it, not six. The move was
  1418 -> **1422**, which is exactly what round 5 measured (`1 failed | 1421 passed` = 1422). It became
  six only when round 5's findings were applied.
- the **three loop-guard tests were already inside the 1186 baseline** — 22 at `3f815725`, which round
  5's own report states ("19 tests became 22"). The `1186 -> 1188` move is `+2` from the classifier
  alone. The record attributes six additions to a change worth three.

The endpoints are right and I verified both by running the suite; the derivation of them is not. Sixth
consecutive round in which this block misstates something about itself.

`:820-821` also still gives a **description** where round 3's `B4` and round 4's `M3` required a
revision id — and the description is now demonstrably the wrong tree: "These numbers are measured at the
tree that carries every round-4 repair", for a `1428` that exists only at `cb91e089`, three commits
later. The block's own narrative at `:846-848` contradicts it one paragraph on.

### `B9` (BLOCKING) — the retracted claim survives in the ledger, and the ledger contradicts the record twice

`.qfai/specs/spec-0017/tdd/test-list.md`, `TDD-0069`'s `Evidence` cell, verbatim:

```text
NOT BLOCKED by a CR - waiting on data that does not exist yet. EX-0017-0053 requires three
consecutive green aggregate-verdict runs with their run identifiers quoted, and this branch has
produced no aggregate-verdict runs: the workflow changes are unmerged and CI has not run them.
The row becomes implementable once the pull request has three green ci-pass runs to cite.
```

Against `atdd-spec-0017.md:369-373`, which this round rewrote at the source:

> **The reason it cannot go green is the self-referential gate, not unmerged work.** ... `ci-pass`
> exists at `.github/workflows/ci.yml:469` and has run twelve times on this branch; what blocks a green
> run is `CR-20260820-0012`.

So the ledger cell asserts (a) the refuted reason — unmerged workflow changes — as its live
justification, and (b) "**NOT BLOCKED by a CR**", against a record that says it is blocked on
`CR-20260820-0012` and a P1d pass that **released** `todo -> blocked` for exactly that reason. Two
contradictions, in the artifact `qfai-implement/SKILL.md` step 3b sends the next agent to.

`retractedClaims.test.ts` cannot see it: `test-list.md` is not among `EVIDENCE / MATRIX / DR / CR`
(`:41-46`), and the phrasing differs from the stored substring in any case (`B1`, `R5`). The correction
has now been applied at the source in the prose and **not** in the ledger — the same "the repair touched
one place" shape rounds 2, 3, 4 and 5 each found, at one more remove.

---

## 6. Advisories

- **`M1`** — the guard's own metadata is stale: `retractedClaims.test.ts:93` gives the "Three packs"
  entry's `why` as "there were four pack directories, and there are **five** now (round 4)". There are
  **six**. A list whose justifications drift is a list nobody re-reads.
- **`M2`** — **the two guards contradict each other.** `retractedClaims` permits `0 misclassified` in
  the matrix **as a quotation**; `coverageDepthMatrix.test.ts:324` forbids **any** occurrence in that
  file. An edit that is correct under one rule reddens the other. Decide which file owns the figure.
- **`M3`** — `countCases` versus vitest (`B7`, measured table). Restate `:57` as "the callsite, which is
  the run count only while no file uses `.each`", or derive the run count from a vitest JSON reporter.
- **`M4`** — **the final pack can never be sealed.** `:290-294` requires the newest pack to carry no
  seal, and the newest is whichever sorts last. Once the stage completes and no newer pack opens, the
  pack holding the reviews that *approved* the work is permanently unsealed — the one pack where a
  post-hoc edit matters most. Key on "has at least one `R*.md`", not on position.
- **`M5`** — `sealOf` (`:71-91`) walks the **working tree**. Every pack file is tracked today, so local
  and CI agree; one scratch file left in a closed pack directory silently makes them disagree, and the
  failure will read as a tampered report.
- **`M6`** — round 5's `M3` stands. `.qfai/report/validate.spec-0017.json` is matched by
  `.qfai/report/.gitignore:1` and `git ls-files .qfai/report` returns five paths without it, so the
  artifact `:825-826` cites reaches no commit. `.qfai/report/specs-coverage/spec-0017.md` likewise.
- **`M7`** — `--ignore-scripts` is a live false positive and undisclosed (`B5`).
- **`M8`** — five of round 5's twelve named forms are still `none` and the record's "ten forms" wording
  does not say which (`B5`).
- **`M9`** — `:836-838`: "The projects are `core`, `unit`, `validators`, `integration`, `cli` and
  `scripts`" — six of the seven `vitest.workspace.ts` declares; `e2e` is named only in the following
  clause. An enumeration presented as complete that is not.
- **`M10`** — `packsOnDisk` (`:97`) filters on an all-digit suffix, so a pack directory with any
  non-numeric suffix is silently excluded and the "every pack must be named" rule stops applying to it.

---

## 7. My own gates

### Coverage Depth Matrix gate — **PASS**

The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md` (`git ls-files`
lists it), not only inside the stage-evidence file. Verified by independent parse: 9 rows, `Status`
3 passing / 1 warning / 5 failing, 38 failing depth cells and 5 `Status` failures matching the declared
counts, a 38-member partition that is complete, disjoint and phantom-free at `A 30 / B 7 / C 1`, and
every member satisfying its class's stated property (0 misassigned). No row has a passing `Normal path`
with an unrecorded failing `Error path`. `B2` and `B10` are filed against the **pinning test**, not
against the matrix's current content.

### RED/GREEN Observation Gate — **no subject**

`.qfai/specs/spec-0017/tdd/test-list.md` parsed mechanically: 82 rows of 9 cells; `Layer` 71
`Integration` / 11 `Unit`; `Status` 74 `refactor` / 6 `blocked` / 2 `todo`; `DR-ID` `-` on all 82;
`Blocked-By` `-` seventy-six times. `TDD-0069` and `TDD-0070` are both `todo` with `DR-ID: -` and
`Blocked-By: -`. **No row was advanced**, so there is no RED pair, no GREEN pair and no per-item
`Oracle proof` on a ledger row for me to judge, and none was offered. `TDD-0069`'s disposition is
`blocked`, which takes no RED-provenance branch. `TDD-0070`'s branch-3 `DR-*` is P1d's subject and I do
not adjudicate it here — but `B9` is stage evidence and is reported above.

The `R*`, `V*`, `S*` and `X*` rounds are oracle-strength evidence for the **stage's own guards**, not
RED observations for ledger rows, and I judged them as such. Every mutation is inside artifacts the
stage owns; none is a syntax error, a load failure or a deleted export; each batch carried a green
control and every control was green.

### `TDD-0070`'s remaining blocker (request question 6) — from my domain only

Not my routing; `R04` owns the branch-3 adjudication. What is observable from here: the `DR-*` exists
and is cited, the row is `todo` with `DR-ID: -`, and the row's **own `Evidence` cell** offers a
justification ("This row is not satisfiable on the branch that introduces the tuning, by construction")
which is a statement about unavailability and is **not** the `DR-*`'s account. So the same "which
artifact speaks for this row" ambiguity that `B9` documents for `TDD-0069` applies here too. Whatever
P1d decides about the `DR-*`, the ledger cell has to be rewritten in the same pass or the row will carry
two different reasons.

### PENDING

- **Runtime proof and the completion gate at completion strength.** The stage does not claim completion
  and self-declares `FAIL`; the round-6 unit is the round-5 repairs plus one new artifact.
  `.qfai/report/specs-coverage/spec-0017.md` and the scoped validate JSON are untracked (`M6`).
- **Prototyping coverage evidence.** No `CON-API-*` is declared and this spec is not UI-bearing on the
  surface I read. Nothing owed, nothing audited.

---

## Required fixes (blocking only)

1. **`B1`** — match retracted claims over collapsed whitespace and compute enclosure on the same
   collapsed text; fix `CR-20260820-0012:127` (quote it or drop it); bound quote pairing so one stray
   quote cannot re-polarise the file; add `test-list.md` to the file list; state paraphrase as a limit.
2. **`B2`** — match the forbidden figure and the version paragraph over collapsed whitespace; pin the v6
   paragraph's own distinguishing phrase; pin `US-0017-0004`'s per-row measurement.
3. **`B3`** — make the tool-subcommand rule per-flag rather than "any flag", so `make -C d build`
   resolves while `cmake --install build` does not; add the seven measured forms to the corpus.
4. **`B4`** — resolve `--filter` as a package name or drop it from `DIR_FLAGS`, and add `-F`; assert the
   filtered/unfiltered agreement on a target where the two **can** differ (`build`, not
   `ci:build-verify`).
5. **`B5`** — exercise `NOT_A_BUNDLER`, the inline-flag path guard, and at least one member of each set
   the corpus never touches; handle or disclose `--ignore-scripts`; name the five still-missed round-5
   forms.
6. **`B6`** — delete the duplicate `## Work performed` bullet at `:203`, correct `:149`, correct `v5` to
   `v6` at `:190`, and use `matchAll` so a second statement of a pinned form cannot hide.
7. **`B7`** — anchor the guard-output regex to `## Commands executed` (or check every occurrence);
   derive the recorded-run floor from the files the stage added instead of a constant.
8. **`B8`** — restate the P7 arithmetic as `1418 -> 1422 -> 1425 -> 1428`, with `1186 -> 1188` being the
   classifier's `+2` alone, and name the **revision** each figure was measured at.
9. **`B9`** — rewrite `TDD-0069`'s `Evidence` cell so it names `CR-20260820-0012` and drops "the workflow
   changes are unmerged" and "NOT BLOCKED by a CR", in the same pass that applies the released
   `todo -> blocked`.
10. **`B10`** — assert every matrix row's field count equals `COLUMNS.length`, and remove the tally
    default at `:123`.

## Mutation hygiene

Four files were mutation targets: `.qfai/evidence/atdd-spec-0017.md`,
`.qfai/evidence/coverage-depth-spec-0017.md`, `.qfai/decisions/CR-20260820-0012-...md` and
`packages/qfai/tests/helpers/buildCommand.ts`. **41 cycles** across four batches (`R` 9, `X` 6, `V` 15,
`S` 11). The harness (`tmp/r06qa/mut.py`) refuses to start a cycle when `git status --porcelain` is
non-empty, requires each search string to occur **exactly once**, refuses to run when the mutation
leaves the blob hash unchanged, restores from the pristine bytes read **before** the edit in a `finally`
block, and re-verifies both the blob hash and porcelain **after every cycle**, aborting the whole run if
either fails. Every cycle above printed `restore: <hash>==<hash> porcelain='' OK=True`. No REDDENS was
measured against an unmutated file and no "reddens nothing" against a file the harness had not confirmed
changed. Each batch carried a green control (`R0`, `X1`, `V1`, `S1`) and every control was green, so no
baseline was red — the failure that cost round 5 a batch.

Search-space exploration used faithful reimplementations of the shipped predicates in Python
(`tmp/r06qa/sim.py`, `correct.py`, `occur.py`, `wrap.py`) and a type-stripping Node probe
(`probe.mts`, `probe2.mts`); every result reported as a finding was then **re-measured with a real
mutation and a real vitest run**. All probes are read-only. One disclosed false start: my first shadow
root created its symlinks with POSIX separators, which Windows does not resolve, producing 70 spurious
`QFAI-LINK-001` subjects; no `validate` result was reported from that pass.

Final state, verified: `HEAD` **`cb91e089`**, `git status --porcelain` **empty**, `git stash list`
**empty**, `.qfai/report/validate.log` byte-identical to its HEAD blob (`2b572934`). My one write is
this file, which plain `git status` does not show because `.gitignore` covers `.qfai/review/*` and review
packs are force-added.

## Every command I ran, with its result

```text
git rev-parse --short HEAD                -> cb91e089 (start AND finish; HEAD did not move)
git status --porcelain                    -> empty (start, before/after all 41 cycles, finish)
git stash list                            -> empty
git ls-files -s, mode 120000, counted     -> 83 tracked symlinks
git ls-files .qfai/review/<each of 6>     -> all six packs fully tracked (4/6/5/5/5/1 files)
git ls-files .qfai/report                 -> 5 paths; validate.spec-0017.json NOT among them
git check-ignore -v .qfai/report/validate.spec-0017.json -> matched by .qfai/report/.gitignore:1
git show {3f815725,c40b2358,cb91e089}:<5 test files>, callsites counted -> the table in B8
git ls-files .qfai/evidence               -> coverage-depth-spec-0017.md is committed

python tmp/r06qa/quoted.py / occur.py / wrap.py / correct.py
  -> 4 scanned files, all with EVEN quote counts today; 9 claim occurrences the guard examines;
     4 occurrences INVISIBLE because of a line wrap; 1 live rule violation (CR:127)
python tmp/r06qa/sim.py     -> 16 simulated attacks; 6 launder cleanly, 1 false-positives
python tmp/r06qa/seal.py    -> all five closed seals MATCH; blob hash == git hash-object
python shadow build + native-separator repair pass
  -> git archive HEAD extracted (2859 files); 83 symlinks declared / created / 0 dangling
node --experimental-strip-types tmp/r06qa/probe.mts   -> 20 missed builds, 2 false positives of 46
node --experimental-strip-types tmp/r06qa/probe2.mts  -> 7 of round 5's 12 named forms fixed
node -e (the shipped CALLSITE regex on six shapes)    -> the countCases table in B7

npx vitest run --project e2e tests/assets/{retractedClaims,stageEvidenceCounts,coverageDepthMatrix}
                                          -> 3 files, 14 passed, exit 0 (3 / 6 / 5)
npx vitest run --project unit tests/unit/buildCommand.test.ts        -> 11 passed, exit 0
npx vitest run --project integration .../checkAtddAnnotationLedger  -> 22 passed, exit 0
npx vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E -> 9 passed, exit 0
npx vitest run --project integration --project unit  -> 1188 passed / 19 skipped, EXIT 0
pnpm -C packages/qfai test:e2e                       -> 1428 passed / 16 skipped, EXIT 0
pnpm ci:lint                                         -> EXIT 0; 11 members
node scripts/check-atdd-annotation-ledger.mjs [--spec 0017] -> 127 / 16 specs EXIT 1 ; 8 EXIT 0
unique QFAI:SPEC-*:US-* in tests/e2e/qfai-traceability.md   -> 208

validate --profile atdd --spec 0017 --root <shadow>  -> info=2 warning=0   error=2  EXIT 1
validate --profile full            --root <shadow>   -> info=4 warning=404 error=4  EXIT 1
validate --profile sdd             --root <shadow>   -> info=4 warning=26  error=0  EXIT 0
validate --profile tdd             --root <shadow>   -> info=5 warning=376 error=2  EXIT 1
git hash-object .qfai/report/validate.log vs HEAD blob -> 2b572934... both (untouched)

41 mutation cycles: R0/R1/R4/R5/R6/R8/R10/R13/R15 (retractedClaims subject),
X1-X6 (matrix subject), V1-V15 (buildCommand.ts), S1-S11 (stageEvidenceCounts subject).
Results in sections 1 to 5.
```

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — `file:line` throughout, each with the command that
      produced the measurement, and each mutation batch with a green control
- [x] Required gates and residual risks are recorded — `B1`-`B10` blocking, `M1`-`M10` advisory, and
      section 7 records what passed, what had no subject, and what is PENDING and why
