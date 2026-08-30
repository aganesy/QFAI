# R03 — qa-gatekeeper (round 5, spec-0017 / `/qfai-atdd`)

- Role: `qa-gatekeeper`, independent stage-level gate, non-edit
- Round: 5. Prior stage-level reports: `.qfai/review/review-20260820200000000/R03_qa-gatekeeper.md`
  (round 1), `review-20260820220000000/R03_qa-gatekeeper.md` (round 2),
  `review-20260821020000000/R03_qa-gatekeeper.md` (round 4). Round 3's slot went to the P1d re-route.
- Revision under review: **`3f815725`** — `git rev-parse --short HEAD` at start **and** at finish. HEAD
  did not move.
- `git status --porcelain`: **empty** at start, after every one of the 34 mutation cycles, and at
  finish. `git stash list` empty. No `git checkout` / `stash` / `reset`, no commit, no push.
- Domain: validate / coverage / runtime-proof / oracle-strength gates, Coverage Depth Matrix, RED/GREEN
  observation
- Scratch: `tmp/r05qa/**` only. Every mutation planted alone and restored from a pristine copy with a
  `git hash-object` comparison in the same step; see Mutation hygiene.

## Verdict: **REVISE**

Ten blocking findings. Of the five things I was asked to attack, **none survives**, and the newest
artifact — `packages/qfai/tests/assets/stageEvidenceCounts.test.ts`, written to stop the record
misstating the tree — **is red at the revision that added it**, which makes the P7 block's "exit 0"
false and puts a second CI job in the red.

| #     | Finding | Class |
| ----- | ------- | ----- |
| `B1`  | `stageEvidenceCounts.test.ts` is **RED at HEAD** and cannot be green while a round is in flight; `test (e2e)` is red in CI | blocking |
| `B2`  | The P7 block's `1422 passed … exit 0` is false (measured `1 failed \| 1421 passed`, exit 1), and it names a vitest project that does not exist | blocking |
| `B3`  | v5's headline property is **false in the code**: a name-shaped guess returns the STRONG verdict whenever the manifest lookup misses — and the fix reddens nothing | blocking |
| `B4`  | **10 of 13** mutations to v5's new machinery redden nothing, including removing the entire `cd` feature | blocking |
| `B5`  | The stated limit undercounts: this repository has **three** build-spawning helpers, and two of them return `none`, not `heuristic` | blocking |
| `B6`  | The matrix pinning test has a **whole-column hole**, and the paragraph added this round to discharge round 4's `B5` sits outside the fence | blocking |
| `B7`  | The new counts test misses the number class round 4's `B4` was about, and checks seal **arity**, not seal value | blocking |
| `B8`  | `### TDD-0069` asserts that two of its own sentences are gone, six and eleven lines below them | blocking |
| `B9`  | `## Gaps` item 8 still asserts two ledger statuses the ledger does not carry, contradicting `## Final status` | blocking |
| `B10` | `## Final status` cites two oracle-round ranges defined nowhere, one colliding with the record's own layer notation | blocking |
| `M1`-`M8` | advisories | non-blocking |

**What passed, measured rather than accepted:** all four pack seals plus the superseded and two-space
variants reproduce exactly (fourth round running, and this round's new one is right); the scoped gate is
`error=2` with the right content and no `QFAI-LINK-001`; the unscoped breakdowns are exactly
`8+1+1+1+1 = 12` and `1+4+2+8 = 15`, now recorded in `CR-20260820-0012`; `127 / 208 / 16 specs /
spec-0012 28 / spec-0017 0`; `ci:lint` exit 0 with eleven members; `1186 / 19`; the ledger's
`82x9 / 71-11 / 74-6-2 / 63-6-2` with both target rows `todo` `-` `-`; the Coverage Depth Matrix's
partition verified independently as complete, disjoint, phantom-free, `A 30 / B 7 / C 1 = 38`, every
member satisfying its class's stated property; **four of the six loop-guard resolution sites are now
genuinely pinned**, including round 4's `B6` (`stat` `ELOOP`) and round 4's vacuity finding on the
symlink test; round 4's `B3` ratchet floor is fixed and `## Gaps` item 5 now describes it correctly;
round 4's `B4` item 1 is fixed; the handover index table and its new `Blocked-By` column are right; and
the round 2 / 3 / 4 verdict tables with the missing-gatekeeper disclosure are complete and correct.

---

## 1. Break v5, both directions (request question 1)

Subject: `packages/qfai/tests/helpers/buildCommand.ts` (v5) and
`packages/qfai/tests/unit/buildCommand.test.ts` (the four corpora). I chose my own corpus and my own
oracle. Baseline: `vitest run --project unit tests/unit/buildCommand.test.ts` -> **9 passed**, exit 0.

### `B3` (BLOCKING) — the `build` / `heuristic` boundary is inverted by a lookup failure, and the fix is invisible

`buildCommand.ts:312-316`:

```ts
  if (bodies.length === 0) {
    // Not a declared script in this manifest: `cargo build`, `docker build`, `make build` land here,
    // and so does a script in a manifest that was not supplied.
    return namesABuild(target) ? "build" : "none";
  }
```

Three artifacts state the opposite property:

- `buildCommand.ts:31-34` — "`build` when a chain of bodies **provably** reaches one, `heuristic` when
  only a *name* suggests it";
- `buildCommand.ts:178-180` — "`sources` … omit when the tree's scripts are unknown, and a name-shaped
  match then returns `heuristic` rather than `build`";
- `.qfai/evidence/atdd-spec-0017.md:552-554` — "three verdicts instead of two, so a name-shaped guess
  returns `heuristic` rather than passing itself off as an analysis".

The comment above the return **names** the offending case ("a script in a manifest that was not
supplied") and then gives it the strong verdict. Measured against this repository's two real manifests
(`tmp/r05qa/probe.mjs`, `probe2.mjs`):

```text
verdict    | without sources | command
heuristic  | heuristic       | pnpm ci:build-verify                  <- resolved: the honest answer
build      | heuristic       | pnpm --filter qfai ci:build-verify    <- SAME COMMAND, UPGRADED
build      | heuristic       | pnpm -C packages/other ci:build-verify
build      | heuristic       | npm run clean:build-cache
build      | heuristic       | pnpm run test:build-output
build      | heuristic       | npm run build:prod
build      | heuristic       | pnpm run restore:build-artifact
build      | heuristic       | pnpm run download:build-cache
build      | heuristic       | npm run lint:build-config
build      | heuristic       | cmake -S . -B build      <- a CONFIGURE step
build      | heuristic       | cmake --install build    <- an INSTALL step
```

`--filter` is the sharp one. `DIRECTORY_FLAGS` (`:125`) holds `--filter`, but pnpm's `--filter` takes a
**package name or a glob**, not a directory — so in any real pnpm monorepo the manifest lookup misses
systematically and every name-shaped target becomes a hard `build`. The predicate returns *more*
certainty on *less* evidence, which is the precise inverse of the contract.

**And the corpus cannot see the fix.** Oracle round `V4`: change that one return to
`namesABuild(target) ? "heuristic" : "none"` — the repair — and the suite is **9 passed, exit 0**. No
committed case depends on the boundary v5 exists to draw.

Round 4's `M3` named `restore:build-artifact`, `download:build-cache` and both `cmake` forms by hand as
the `CR-20260820-0007` reuse-lane scenario. They are unaddressed, and v5 **regresses** on them: v4
returned a boolean, v5 returns the verdict `:34` tells a caller to demand "when it needs certainty".

**Required fix.** Return `heuristic` from that fallback for a *declared-script* target and keep `build`
only for the non-npm runner subcommands the comment names (`cargo build`, `docker build`, `make build`),
which are distinguishable by verb. Add the case where `--filter` misses the manifest to the corpus. Drop
`--filter` from `DIRECTORY_FLAGS` or resolve it as a package name.

### `B4` (BLOCKING) — 10 of 13 mutations to v5 redden nothing, including the whole `cd` feature

Each planted alone into `buildCommand.ts`, run against
`vitest run --project unit tests/unit/buildCommand.test.ts`, restored with a hash comparison in the
same step:

```text
V1   DIRECTORY_FLAGS -> only "-C"                     exit=0  9 passed   REDDENS NOTHING
V2   PASSTHROUGH drop workspace/workspaces/--         exit=0  9 passed   REDDENS NOTHING
V3   LIFECYCLE drop `publish`                         exit=0  9 passed   REDDENS NOTHING
V4   the name-only fallback build -> heuristic (FIX)  exit=0  9 passed   REDDENS NOTHING   <- B3
V5   WRAPPERS -> time/sudo/env only (7 dropped)       exit=0  9 passed   REDDENS NOTHING
V6   BUNDLERS drop 6 members                          exit=0  9 passed   REDDENS NOTHING
V7   RUNNERS drop 13 members                          exit=0  9 passed   REDDENS NOTHING
V9   INTERPRETERS -> bash only                        exit=0  9 passed   REDDENS NOTHING
V10  NOT_A_BUNDLER emptied                            exit=0  9 passed   REDDENS NOTHING
V11  the `cd` handler removed entirely                exit=0  9 passed   REDDENS NOTHING
V8   the `visited` cycle guard removed                exit=1  1 failed   REDDENS
V12  BUNDLERS return heuristic not build              exit=1  4 failed   REDDENS
V13  strongest(): build -> heuristic                  exit=1  4 failed   REDDENS
```

**`V11` is the one that matters most**, because the corpus claims that property by name.
`buildCommand.test.ts:206-218` is titled "resolves a script in the manifest its directory selects, not a
merged one" and its last assertion carries the comment "`cd` moves the manifest too, which is what makes
`cd pkg && …` differ from a bare invocation" — then asserts
`classifyBuildCommand("cd pkg && pnpm other", sources)` is `"none"`. Without the `cd` handler the answer
is **also `"none"`** (`cd` becomes an unrecognised verb, `pnpm other` resolves to `echo root`). The
assertion is vacuous for the property it names — the identical shape round 4 found in the symlink test.
The positive direction (`cd packages/qfai && pnpm build` at `REGRESSIONS:69`, and `reachesBuild(...)` at
`:193`) passes without `cd` too, because the *root* `build` script and `namesABuild("build")` both reach
a build independently.

**And the `cd` handler has a live defect the corpus cannot reach.** `:202` concatenates
cwd and the argument and `normalise` (`:164-166`) strips only a **leading** `./`, so the `/./` survives:

```text
sources = { "": { go: "pnpm -C pkg ship" }, pkg: { ship: "tsup", build: "tsup" } }

build   cd pkg && pnpm ship
none    cd ./pkg && pnpm ship          <- the same command with a leading ./
build   cd . && cd pkg && pnpm ship
build   cd pkg/ && pnpm ship
none    cd $GITHUB_WORKSPACE/pkg && pnpm ship
build   cd ./pkg && pnpm build         <- the bug MASKED, because the name says build
```

The last line is why no corpus entry can see it: every `cd` case in the committed corpus targets a script
whose *name* contains `build`, so the name fallback covers for the broken lookup. Against the real
manifests, `cd ./packages/qfai && pnpm prepack` -> **none** while `cd packages/qfai && pnpm prepack` ->
`build`.

**Membership asymmetry creates a second blind spot.** `RUNNERS` is consulted only in the **verb**
position; the **target** position consults only `BUNDLERS`. So a runner behind a runner is invisible:

```text
none   npx turbo run build                     none   pnpm turbo run build
none   npx nx run-many --target=build --all    none   pnpm nx build web
none   pnpm exec turbo build                   none   yarn workspace qfai build
none   pnpm -w build                           none   timeout 600 pnpm build
none   bash -c (a quoted pnpm build)           none   env -i pnpm build
none   npm run (a quoted build)                none   xargs -0 pnpm build
```

- `nx run-many --target=build` is in `KEPT` in its **bare** form; the `npx`-prefixed form, which is how
  CI writes it without a global install, is a miss.
- `yarn workspace <pkg> build` is a miss **because** `workspace` is in `PASSTHROUGH`: the flag is skipped,
  then the package-name argument consumes the `return resolveScript(...)` at `:281` and `build` is never
  read. Adding `workspace` to `PASSTHROUGH` looks like handling the form and does not.
- **`pnpm -w build` -> `none`** is a plain bug: `-w` is pnpm's run-at-workspace-root flag, and
  `DIRECTORY_FLAGS` makes it consume `build` as a directory (`:263-269`).
- Four of the six `DIRECTORY_FLAGS` (`--dir`, `--cwd`, `--filter`, `--prefix`) plus `-w` are exercised by
  no committed case, and one of the five is wrong.

Measured over my own labelled corpus (`tmp/r05qa/corpus.mjs`, 22 builds / 14 non-builds):
**19 missed builds and 14 false positives.**

**Required fix.** Add chained-runner and `msbuild`-style cases to the corpus; pin the `cd` semantics with
a target whose *name does not say build*; fix `-w`; and exercise at least one of
`--filter` / `--dir` / `--cwd` / `--prefix` so `V1` cannot pass.

### `B5` (BLOCKING) — the four-line set is right today; the stated LIMIT undercounts by two helpers, and those two return `none`

I reproduced the real-tree scan with an independent implementation (`tmp/r05qa/tree.mjs`): **313 own +
138 shipped = 451** command lines, **0 flagged in the shipped tree**, and the own tree's flagged set
**identical** to the four strings pinned at `buildCommand.test.ts:309-314`. Round 4's `M1` (the scan
could lose a tree silently) and `M2` (basename matching) are both structurally closed — the floors at
`:279` and `:287-288` and the per-root `file::command` tagging.

What is false is the limit stated three times:

> **What no command-line scan can see** … because this repository has **two instances**: a build spawned
> from inside a helper script. `scripts/check-build-warnings.mjs` spawns `pnpm -C packages/qfai build`
> (`buildCommand.ts:36-40`; also `atdd-spec-0017.md:562-566`, `coverage-depth-spec-0017.md:207-210`)

There are **three** such helpers, and the two the record omits are worse, not equal:

- `scripts/verify-pack.mjs:35-38` runs `npm pack` with `cwd` set to `packages/qfai`, and
  `packages/qfai/package.json` has `prepack: "npm run build"` -> `build: "tsup"`.
- `scripts/check-publish-dry-run.mjs:76-79` runs `npm publish --dry-run` in the same directory, and its
  own docstring says "it **builds** the tarball and lists its contents".

Measured: `pnpm verify:pack` -> **`none`**; `node ./scripts/verify-pack.mjs` -> **`none`**;
`node ./scripts/check-publish-dry-run.mjs` -> **`none`**. The `heuristic` label the record calls the
safety net ("they land on `heuristic` only because that filename happens to say `build`, which is luck")
is an accident of **one** filename and does not cover these two at all. Both are inside
`ci:build-verify`'s body and one is inside `ci:gate`'s, so `ci:gate` reaches a build by **two**
independent routes and `ci:build-verify` by **three**, and v5 sees one of the five.

The pinned set is complete for the workflow trees **as they stand**, because those two helpers are
invoked only through the two aggregate script names that *are* flagged. What is wrong is the
generalisation — and the assertion message at `:306-308` states the general form: "every command
reaching or appearing to reach a build". The day a lane calls `pnpm verify:pack` directly, that message
is false and the diagnosis inverts: `toEqual` would report "a build in a new place" when a build had
*disappeared* from view.

**One more false positive in the new machinery.** `--ignore-scripts` suppresses every lifecycle hook and
v5 ignores it: `pnpm -C packages/qfai pack --ignore-scripts` -> **`build`**;
`cd packages/qfai && npm pack --ignore-scripts` -> **`build`**. `release.yml` uses that flag deliberately
on its publish step, and `npm ci --ignore-scripts` is already in `NOT_BUILDS:123`, so the flag is in the
tree's vocabulary and not in the predicate's.

**Is "four commands, two of them `heuristic`" the right answer?** For the four *command lines currently
present*, yes — and the set-equality form is a real improvement on round 4's count. But it is a set of
what the predicate can see, described as a count of what the tree does, which is round 4's `B1` one level
up. Say instead: "the four command lines this predicate reaches, of which two resolve and two are
name-luck; three helper scripts spawn builds and only one of the three has a build-shaped filename."

---

## 2. Break `stageEvidenceCounts.test.ts` (request question 2)

### `B1` (BLOCKING) — it is RED at the revision that added it, and it cannot be green while a round is in flight

```text
npx vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts
  -> Test Files 1 failed (1) | Tests 1 failed | 3 passed (4)
  x  names as many review packs as the review directory holds, each with a seal
     expected [ ...4 ] to deeply equal [ ...5 ]
     -   "review-20260821040000000",
```

`git log --diff-filter=A -- .qfai/review/review-20260821040000000/review_request.md` -> **`3f815725`**.
The same commit added the test (`packages/qfai/tests/assets/stageEvidenceCounts.test.ts`), rewrote the
P7 block claiming `exit 0`, and created the directory that makes the test fail. It was red the instant it
was committed.

It is **not** a local artefact: `git ls-files .qfai/review/review-20260821040000000/` returns
`review_request.md`, and the directory is present in my `git archive HEAD` shadow root. A clean CI
checkout reproduces it.

**Where it lands.** There is **no `assets` vitest project** — `vitest.workspace.ts:21,28,35,42,54,61,68`
declares `core / unit / validators / integration / e2e / cli / scripts`, and `tests/assets/**` is inside
the **`e2e`** project's `include` (`:54-55`). `ci.yml:307` runs the matrix
`slice: [core, validators, integration, e2e, cli, unit, scripts]` via `pnpm -C packages/qfai test:<slice>`,
and `ci-pass` (`ci.yml:481`) needs `test`. So at HEAD **`test (e2e)` is red**, `ci-pass` fails on
**two** jobs rather than one, and `pnpm ci:gate` (release.yml, which runs `pnpm -C packages/qfai test`)
fails too. Round 4 verified "every other lane green, `build` and `ci-pass` failing"; that is no longer
true and the record does not say so.

**And it is self-punishing.** `:116-118` requires every pack in the window to be named in
`## Final status` **with a seal** (`:129-130`). A pack cannot be sealed before its last reviewer lands,
so there is no honest edit that greens this during the round: recording a seal now guarantees a wrong
seal once `R02` / `R03` land. This is round 4's `B3` shape (a test that reddens on its own remediation)
and round 2's `B1` shape, in the artifact built to end that class.

**Second-order consequence, which cost me a batch.** An already-red file is useless as an oracle. My
first mutation batch (`S1`-`S7` plus a control that only added a prose sentence) returned **"REDDENS" for
all eight**, identically `1 failed | 3 passed`, purely because the baseline was red. I re-ran everything
against `-t "states the number"`, which is green at HEAD (`3 passed | 1 skipped`), and report only those.

**Required fix.** Require `named` to equal the packs that hold at least one `R*.md` (or exclude the
newest), then re-derive the P7 totals.

### `B7` (BLOCKING) — it covers three count classes and misses the one round 4's `B4` was about; and it checks seal ARITY, not seal value

Seven falsification rounds, green control, against `-t "states the number"`:

```text
S9   `## Work performed` "checkAtddAnnotationLedger.test.ts - 22 tests" -> 2   exit=1  REDDENS
S10  Decision 4 "...check-atdd-annotation-ledger.mjs with 22 tests" -> 2       exit=1  REDDENS
S11  "9 tests across 8 annotated describes" -> 18                             exit=1  REDDENS

S2   `## Commands executed` "-> Tests 9 passed (9)" -> 42                     exit=0  REDDENS NOTHING
S3   "-> Tests 22 passed (22)" -> 99  and  "-> Tests 4 passed (4)" -> 44      exit=0  REDDENS NOTHING
S4   `## Work performed` "coverageDepthMatrix.test.ts - 4 tests" -> 40        exit=0  REDDENS NOTHING
S5   "stageEvidenceCounts.test.ts - four tests" -> "forty"                    exit=0  REDDENS NOTHING
S6   P7 "1422 passed / 16 skipped" -> 9999 and "1186 / 19" -> 8888            exit=0  REDDENS NOTHING
S8   "8 claim(s) backed by a test annotation (spec-0017)" at :209 -> 80       exit=0  REDDENS NOTHING
S12  "127 of 208 E2E ledger claims" -> "7 of 20"                             exit=0  REDDENS NOTHING
Sctl (control) a prose sentence added                                        exit=0  reddens nothing
```

- **`S2` is round 4's `B4` item 1 verbatim.** `## Commands executed + key outputs` — the block whose job
  is recording measured outputs, and the block where round 4 found `Tests 9 passed (9)` for a file that
  ran eleven — is **not covered by `CLAIMS`** (`:45-66` matches only `## Work performed` phrases and
  Decision 4). Three of the four recorded vitest outputs (`:202`, `:215`, `:217`, `:219`) can be any
  number at all. The one number the defect class was named for is the one the derivation skipped.
- **`S8` falsifies the record's own claim.** `:741`: "Everything derivable about the artifacts — per-file
  test counts, annotated describes, **the recorded guard output**, the named packs — is now checked by
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts`". `:104`'s `exec` takes the **first** match,
  and the guard output appears twice — `:111` (Decision 4 prose) and `:209` (the recorded command
  output). Mutating `:209` is invisible. The clause is true of the prose and false of the output.
- **`S4`**: `coverageDepthMatrix.test.ts`'s size is stated three times (`:149` "four tests", `:193`
  "4 tests", `:217` "Tests 4 passed (4)") and derived **zero** times, while
  `checkAtddAnnotationLedger`'s is derived twice.
- **`S5`**: the new test does not derive **its own** count.
- **`S6`** is honest — `:739-741` discloses the two suite totals as underivable. `B2` is about their
  values, not their coverage.

**Two holes established by inspection, no mutation required:**

1. **Seal values are never checked.** `:129-130` captures each seal with a 64-hex group and then uses
   only `.length` on the match array, comparing it to `named.length`. Four wrong 64-hex strings satisfy
   it. The seals are this record's integrity mechanism — round 4's `R02` used the superseded seal's
   reproduction to prove three reports untouched between seals — and recomputation is about fifteen lines
   (`git hash-object` per file, `LC_ALL=C` order, sha256 over the stream); I did it in
   `tmp/r05qa/seal.py`.
2. **The window decays with the calendar.** `:117` filters on a pattern that fixes the date to the 20th
   or 21st of August 2026. Measured:

   ```text
   MATCHED  review-20260821040000000     MATCHED  review-20260821060000000
   ESCAPED  review-20260822000000000     ESCAPED  review-20260901000000000
   ```

   All of them satisfy the `>= "review-20260820200000000"` threshold at `:118`. A round-6 pack created on
   22 August — this stage has run five rounds in two days and it is now the 21st — is **silently
   excluded**, and the record could then say "Five packs" against six directories with the test green.
   That is a concrete way to satisfy the test while the record misstates the tree, which is exactly what
   was asked for.

**One derivation is of the wrong quantity.** `countCases` (`:31-33`) counts `it(` and `test(` **callsites
in the whole file text, comments included**. Measured on the test's own source: `countCases` = **6**
against 4 real cases, the two extra being the backtick-quoted `it(` and `test(` inside its docstring. Any
of the four target files gaining a docstring that mentions a backtick-quoted `it(` — or English prose
containing "test" followed by a space and an open parenthesis — forces the record to state a number
vitest does not report. The docstring at `:27-29` concedes the point ("Counts the callsite, not the run")
while `## Commands executed` records vitest's run count, which is a different number by construction.

---

## 3. Break the matrix pinning test a fourth time (request question 3)

`packages/qfai/tests/assets/coverageDepthMatrix.test.ts`. Baseline **4 passed**.

```text
X1  class A and class B explanatory BODIES swapped (property sentences kept)   exit=1  REDDENS
X2  class A's explanatory body deleted (property sentence kept)                exit=1  REDDENS

X3  US-0017-0004's per-row justification inverted: "0 upload-artifact steps
    and 0 bundler builds" -> "9 ... and 4"  (coverage-depth:173)               exit=0  REDDENS NOTHING
X4  the scope sentence claims all nine covered (:4-5)                          exit=0  REDDENS NOTHING
X5  class B prose "all seven cells" -> "eleven" against the pinned `B 7`       exit=0  REDDENS NOTHING
X6  a NINTH depth column appended, all nine of its cells scored failing        exit=0  REDDENS NOTHING
X7  the v5 paragraph (:207-210) replaced by "v4 ... with 0 misclassified"      exit=0  REDDENS NOTHING
Xctl (control) a prose sentence added                                          exit=0  reddens nothing
```

Round 4's `Z1` / `Z2` are **genuinely closed** — `X1` and `X2` redden on `EXPECTED_PROSE` (`:245-255`)
and `BODY_PHRASE` (`:265-282`), and those two additions are a real advance.

### `B6` (BLOCKING) — the contract has a whole-column hole, and this round's `B5` repair landed outside the fence

**`X6` is the fourth break and it is not a prose defect.** `:59-60` reads the column name out of
`COLUMNS` by index and returns early when it is `undefined`, so any table column beyond the eight in
`COLUMNS` (`:22-31`) is **silently dropped**. Appending a `Concurrency` column to
`coverage-depth-spec-0017.md:45-55` with all nine cells failing leaves nine unjustified failing cells
invisible: the depth-cell count, the partition, the sizes and the total all still agree, and all four
tests pass. The file's own opening states the contract this defeats — "one justification per failing
cell, and the enumeration below is what makes 'one per cell' **checkable rather than asserted**"
(`coverage-depth:9-10`) — and the test's docstring repeats it at `:10-13`. A depth dimension is exactly
the kind of thing a later round adds. (Inserting rather than appending is worse: `Status` shifts to index
8, `row.cells["Status"]` silently picks up the new column's score, and `:108`'s default absorbs the rest.)

**`X7` is the sharper governance break.** `coverage-depth:207-210` is the paragraph added this round to
discharge round 4's blocking `B5` — the finding that this file still published v3's refuted "0
misclassified" as current. Replacing it with a v4 sentence carrying "0 misclassified" is green. The
repair for a blocking finding about a stale predicate claim landed in the one region of the file the
pinning test does not read, so it can regress to the same defect silently. `X3` is the same region:
`US-0017-0004`'s failing score rests on the measurement "0 upload-artifact steps and 0 bundler builds",
and inverting it to "9 and 4" is green. Test 3 (`:285-299`) checks only that a justification **heading**
exists, and its `.*` leaves the heading's title free too.

`X4` and `X5` are round 4's `Z4` and `Z3` residue, still live: the scope sentence's "Eight are covered"
and class B's prose cell count are both un-derived, and `X5` drifts the prose from the size the test does
pin.

Two further residues, by inspection:

- **`:108` still defaults a missing score to the middle value** when tallying `Status`, which is the exact
  "default the unrecognized case to the warning score" trap the same file's comment at `:62-65` says it
  removed after round 2's `implementation-reviewer` found it.
- **Round 4's `M4b` stands.** `:230-234` still hard-fails on an unknown class letter, so recording a
  newly discovered gap of a new shape requires three coordinated test edits (`PROPERTIES`,
  `EXPECTED_PROSE`, `BODY_PHRASE`). The comment at `:216-218` says a new class is "a REVIEW item, not a
  pass and not a silent failure"; the implementation makes it a failure whose message tells you to edit
  the test.

**Required fix.** Derive `COLUMNS` from the table's own header row, or assert that the header row is
exactly `COLUMNS`. Require one distinguishing phrase per per-row justification section, the way
`BODY_PHRASE` already does for the class paragraphs — the v5 paragraph is the case that needs it. Remove
the tally default.

**The matrix itself is correct.** Verified with an independent parse (`tmp/r05qa/audit.py` plus a direct
re-derivation): 9 rows; `Status` 3 passing / 1 warning / 5 failing; **38** failing depth cells and **5**
`Status` failures, matching the declared "38 depth cells ... plus 5 in Status"; 38 partition members, all
unique, **complete** (no unclaimed cell), **phantom-free**, sizes **A 30 / B 7 / C 1**; and every member
satisfies its class's stated property. No `US` has a passing `Normal path` with an unrecorded failing
`Error path`.

---

## 4. The loop guard's three new tests (request question 4 for my domain)

`scripts/check-atdd-annotation-ledger.mjs:101-171`, tests at
`packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts:155-181` and `:206-265`.
Baseline **22 passed**.

**All three fixtures are real on this machine** (`tmp/r05qa/loop.mjs`):

```text
T1 the modified symlink test: link created INSIDE the scanned dir
   dirent 'link' -> { isDirectory: false, isSymbolicLink: true }   <- the branch IS reached
   collected: [ linked.test.ts ]
T2 self-referential junction: realpath('tree/self') -> 'tree', stat -> dir
   collected: [ a.test.ts ]                                        (1 ms, no multiplication)
T3 mutual cycle x->y, y->x: realpath / stat / readdir on x and y all THROW ELOOP
   collected: [ real.test.ts ]                                     <- the sibling survives
T4 dangling junction: realpath / stat / readdir all THROW ENOENT
   collected: [ beside.test.ts ]
```

**Four of the six resolution guards are genuinely pinned:**

```text
L1  stat catch: drop isLoop  (revert round 5's own fix)   exit=1  REDDENS
L2  stat catch: drop isMissing                            exit=1  REDDENS
L3  realpath -> lexical path.resolve (revert round 3)     exit=1  REDDENS
L4  the entry.isSymbolicLink() branch disabled            exit=1  REDDENS
L7  the `seen` dedupe removed                             exit=1  REDDENS

L5  readdir catch: drop isLoop                            exit=0  REDDENS NOTHING
L6  realpath catch: drop isLoop                           exit=0  REDDENS NOTHING
```

Round 4's `B6` (the unguarded `stat` `ELOOP` site) is **fixed and tested** — `L1` reddens. Round 4's
finding that the previous symlink test was vacuous is **fixed** — `L4` reddens where round 4 measured it
green. Round 4's `B6b` ("nothing tests any of it") is largely discharged: 19 tests became 22.

**Does the `ELOOP` skip at `stat` drop a tree it should measure?** No. If `stat` cannot resolve the
entry there is no target behind it, so nothing reachable is lost; and `T3` proves the sibling subtree the
unguarded version dropped is now measured. The direction is also safe — a skipped subtree raises
`unbacked`, never lowers it.

### `M1` (advisory) — two guards are untested, and the shape that reaches them is the shape this repair moved away from

`L5` and `L6` redden nothing. The comment at `:131-134` makes a claim specifically about the **readdir**
site, and `:150-155` says "Three sites resolve paths; **all three are guarded now**" — true, with one of
the three tested. Neither is unreachable: every `current` except the initial argument was `stat`ed as a
directory first, so the only shape that reaches the `realpath` and `readdir` `ELOOP` arms is a **cycle
member passed as the root**. Measured (`tmp/r05qa/loop2.mjs`):

```text
collectTestSources(<cycle member as ROOT>) -> 0 entries, no throw
```

That is precisely the shape round 3's symlink test used (the link as the walk's root) and that this
round's repair correctly moved off. One `it` asserting the promise resolves to a `Map` on that root
covers both remaining guards.

Also advisory (`M2`): `isLoop` (`:176-186`) matches `ENAMETOOLONG`, so a legitimately deep Windows
subtree is skipped silently. Round 4's `R02` asked for one line of comment; still absent. And the
dangling-link test's oracle (`:262-264`) is the weakest available — it asserts only that the promise
resolves to a `Map`, and does not assert that the rest of the tree was still read, which `:246-249` does
for the cycle case.

---

## 5. Gates and numbers (request question 5)

All runs against a `git archive HEAD` shadow root at `tmp/r05qa/shadow` with the **83** tracked symlinks
re-materialised natively from the index (**83 declared, 83 created, 0 failed, 83 verified as links**), so
no `QFAI-LINK-001` fired and the tracked `.qfai/report/validate.log` was never written
(`git hash-object` equals `git rev-parse HEAD:` at `2b572934...` before and after).

```text
validate --profile atdd --fail-on error --spec 0017   info=2  warning=0    error=2   EXIT 1
  [error] QFAI-ATDD-111  SPEC-0017:US-0017-0007                        <- and nothing else
  [error] QFAI-ATDD-112  tests/integration/** -> TC-0017-0016, -0030, -0032, -0033,
                                                 -0034, -0035, -0069, -0070   <- exactly 8
  [info]  QFAI-ATDD-117 (11 Unit/Component TCs)   [info] QFAI-PROFILE-001
validate --profile tdd   --fail-on error            info=5  warning=376  error=2   EXIT 1
validate --profile sdd   --fail-on error            info=4  warning=26   error=0   EXIT 0
validate --profile full  --fail-on error            info=4  warning=404  error=4   EXIT 1
```

- **`error=2` scoped: confirmed**, with the content exactly as recorded.
- **`--profile full` is still `error=4`, and the two `QFAI-REVIEW-*` have moved to THIS round's pack.**
  `QFAI-REVIEW-004` and `-005` now name `.qfai/review/review-20260821040000000`;
  `review-20260821020000000` is **clean**, so round 4's pack was completed and sealed correctly. That is
  the answer to the question as put: the count did not change, the subject did, and round 4's `R02` `B6`
  prediction — the practice regenerates the pair every round — is now measured twice. The record's
  `### The full profile` (`:795-801`) states this correctly and is the one place the disclosure is right.
  What it does **not** say is that at HEAD the same practice also reddens a **test** leg (`B1`), so the
  `build`-job accounting is no longer the whole story.
- **The unscoped breakdowns reproduce exactly.** `QFAI-ATDD-111`: spec-0003 8, -0006 1, -0008 1,
  -0015 1, -0017 1 = **12**. `QFAI-ATDD-112`: spec-0003 1, -0008 4, -0015 2, -0017 8 = **15** — the
  request's 1/4/2/8 = 15 is right, and `CR-20260820-0012:155-162` now records it, discharging round 4's
  P1d `M1`.

```text
node scripts/check-atdd-annotation-ledger.mjs --spec 0017   8 claim(s) backed          EXIT 0
node scripts/check-atdd-annotation-ledger.mjs               127 unbacked lines         EXIT 1
unique ledger claims                                        208
per-spec unbacked: 0012 28, 0013 10, 0010 10, 0004 10, 0001 9, 0005 8, 0002 8, 0016 7,
                   0015 6, 0008 6, 0009 5, 0006 5, 0003 5, 0014 4, 0011 3, 0007 3 = 127, 16 specs
pnpm ci:lint                                                EXIT 0; 11 members
vitest --project integration --project assets --project unit  1186 passed / 19 skipped  EXIT 0
pnpm -C packages/qfai test:e2e                    1 FAILED | 1421 passed / 16 skipped   EXIT 1
vitest --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts    9 passed         EXIT 0
vitest --project integration .../checkAtddAnnotationLedger.test.ts    22 passed         EXIT 0
vitest --project e2e tests/assets/coverageDepthMatrix.test.ts          4 passed         EXIT 0
vitest --project unit tests/unit/buildCommand.test.ts                  9 passed         EXIT 0
```

### `B2` (BLOCKING) — the P7 block is false about the suite, and it names a project that does not exist

`.qfai/evidence/atdd-spec-0017.md:719-729` states `pnpm -C packages/qfai test:e2e` -> **"1422 passed /
16 skipped, exit 0"**. Measured at HEAD: **`1 failed | 1421 passed | 16 skipped`, exit 1**. The
arithmetic in `:734-738` is internally sound (1420 -> 1418 for the two corpus tests leaving `e2e`,
1174 -> 1186 for nine joining `unit` plus three on the guard, 1418 -> 1422 for the four new ones), and
`1186 / 19` is **exact**. What is false is the total and the exit code, and by `B1` it was false when it
was written.

Two further defects in the same block:

- `vitest --project integration --project assets --project unit` names a project that does not exist.
  `--project assets` alone gives "No test files found, exiting with code 1"; combined with real projects
  it silently contributes nothing, so `1186` is integration plus unit.
- `:737` explains 1418 -> 1422 as "four tests in the **`assets` project**, which the `test:e2e`
  invocation also runs". There is no `assets` project; `test:e2e` runs them because `tests/assets/**` is
  in the **`e2e`** project's `include` (`vitest.workspace.ts:54-55`). The record's own explanation of the
  number rests on a project that is not declared anywhere.

Round 3's `B4` and round 4's `M3` both required naming the revision each P7 figure was measured at.
`:716-718` still gives a description ("measured at the tree that carries every round-4 repair"), and this
round the description is not merely uncheckable — it is contradicted by the commit that wrote it.

### The four pack seals — all reproduce, and so do both variants

Serialization per `:869-871`: the git hash, a single space, the pack-relative path, a newline; paths in
`LC_ALL=C` order; sha256 over the byte stream (`tmp/r05qa/seal.py`).

```text
review-20260820200000000  4 files  5c8cd42571c8baf5...c74317e3   *** MATCH ***
review-20260820220000000  6 files  305ffd6555799fd3...5983e77a   *** MATCH ***
review-20260821000000000  5 files  257e793b5c764a81...6d01bfd0   *** MATCH ***
review-20260821020000000  5 files  aaa2d2a6e16b2027...04db35ff   *** MATCH ***   <- new this round
superseded (round 1, 3 files)      d8ac0a777dd38514...58967c9    *** MATCH ***
two-space variant of round 1       fa8d6e836cabd14a...d17e2526   *** MATCH ***
```

This remains the record's strongest passage and it is now fully verified for the **fourth** round
running, including the seal this round added. The superseded seal still reproducing over the three
reports as they stand today is what discharges the re-seal, exactly as `:875-879` argues.

### `M3` (advisory) — the Hard Gate artifacts the record cites reach no commit

`.qfai/report/.gitignore` excludes everything and negates only `.gitignore` and `README.md`, and
`git ls-files .qfai/report` returns five paths: `.gitignore`, `README.md`, `preflight_summary.md`,
`specs-coverage/spec-0012.md`, `validate.log`. So the two citations at `:225-226` —
`.qfai/report/validate.spec-0017.json` and `.qfai/report/run-20260820194530635/` — are **untracked**
(`git check-ignore -v` confirms; `git ls-files` on the run directory returns 0 entries), and
`.qfai/report/specs-coverage/spec-0017.md` is untracked too. A third party at HEAD cannot read any of
them, which is the standard `qfai-atdd/SKILL.md` Evidence (MANDATORY) sets.

The working-tree copy is already stale: my HEAD re-run of `validate.spec-0017.json` differs from it in
exactly one leaf — `traceability.testFiles.matchedFileCount` **466** against **465** — because the local
file predates HEAD's new test file. `counts`, `profile` and every issue are identical, so the **gate
verdict** is unaffected. (Round 4's "byte-identical to the committed one (5133 bytes)" was comparing
against a file that is not committed; mine differs only because HEAD moved.)

The refusal to cite `validate.log` (`:227-232`) is right on the merits — and `validate.log` is the only
one of the three that is in the repository. Either force-add the scoped JSON per round the way
`coverage-depth-spec-0017.md` is force-added, or state plainly that the gate evidence is a re-runnable
command rather than an artifact.

---

## 6. Governance-record findings

### `B8` (BLOCKING) — `### TDD-0069` asserts that two of its own sentences are gone

`.qfai/evidence/atdd-spec-0017.md:356` and `:360`, verbatim and present-tense:

```text
:356  ... it could not be made green on this branch at all, because the workflow changes are unmerged.
:360  Nothing satisfies this one - there is no run history to mutate.
```

`:369-372`, eleven and nine lines later:

> Four statements went in that pass and **are gone now**: that the workflow changes being unmerged is
> `TDD-0069`'s obstacle (it is not; the obstacle is the self-referential gate in `CR-20260820-0012`),
> that there is "no run history to mutate" for clause 1 (the correction is narrower — see the DR), that
> "branch 3 it is" for both rows, and that the blocking condition is the `exception` P1d PASS for both.

The last two **are** gone — correctly, and well done. The first two are not, and one of them is quoted
inside the sentence claiming its removal. `DR-0017-0010:86-89` records the first as false for this row;
P1d's `R04` `B1` named both by line and required them replaced.

This is the fifth consecutive round in which this subsection carries a statement the record elsewhere
retracts, and the first in which it also carries a claim that it does not.
`qfai-implement/SKILL.md:116` sends step 3b to this subsection.

### `B9` (BLOCKING) — `## Gaps` item 8 asserts two ledger statuses the ledger does not carry

`:672-673`: "`TDD-0070` **is** `exception` against `DR-0017-0010` ... `TDD-0069` **is** `blocked` on
`CR-20260820-0012`". `## Final status` `:829-836` says the opposite, correctly and at length: "`TDD-0070`
is **not yet** `exception`" and "`TDD-0069` is **not yet** `blocked` either". The ledger, parsed
mechanically: 82 rows of 9 cells, **`DR-ID` is `-` on all 82**, and `TDD-0069` / `TDD-0070` are `todo`
with `Blocked-By: -`. Round 4's `R02` `B2` required exactly this fix at what was then `:605-606`; it was
applied to `## Final status` and not to `## Gaps`. Two rounds, two sections, opposite claims.

### `B10` (BLOCKING) — two oracle-round ranges in `## Final status` are defined nowhere

`:813-814`: "three on the ledger ratchet (`W1`-`W3`), **three on the loop guard (`L1`-`L3`)** and **four
more on the matrix record's own prose (`Z1`-`Z4`)**".

- `git grep` over both records: `L1` and `L3` occur only at `:249` and `:258` as **test-layer** labels
  (`L1` = Unit, `L3` = Integration) and at `coverage-depth:6`. There is no `## Execution logs`
  subsection for a loop-guard oracle round — the section runs `:450-629` and has none. A reviewer asked
  to check `L1`-`L3` cannot, and the ids collide with the record's own notation — a third meaning for the
  same tokens, which is the shape round 4's `R02` `M4` item 5 flagged for `E6`-`E11`.
- `Z1`-`Z4` occur only in that sentence. They were round 4's **reviewers'** rounds
  (`review-20260821020000000/R03_qa-gatekeeper.md` section 2 `Z1`-`Z4`, and
  `R02_completion-reviewer.md` M1 `Z1`-`Z2`), counted here in the stage's achievement list without
  attribution and recorded in no execution log.
- The `X` range **was** fixed — `X1-X3, X6-X8` now, instead of round 4's `X1-X8` claim. So the same
  section had this defect corrected in one range and introduced in two others in the same pass.

### Advisories on the record

- **`M4`** — `## Final status` "Confirmed by" (`:826-829`) still names **round 1's** two reviewers on
  `8fb48002` only. Round 3's `m1` and round 4's `R02` `B5` item 3 — unapplied for four rounds — even
  though the round 2 / 3 / 4 verdict tables (`:693-697`, `:773-786`) are now complete and correct,
  including the disclosure that round 3's stage-level gatekeeper did not run.
- **`M5`** — the round-2 table (`:696`) still records `implementation-reviewer` at "5 low"; that report
  holds `m1` through `m9` = **9** (counted at
  `review-20260820220000000/R01_implementation-reviewer.md:348-396`). Round 4's `m2`, third round
  unapplied.
- **`M6`** — `:688` "Three blocking reviewers on `56daee8d`". `agent-routing.yml:202-206` gives
  `qfai-atdd`/`review` `blocking_agents: [qa-gatekeeper, completion-reviewer]` with
  `implementation-reviewer` **conditional**; the record's own Work Orders table states this correctly.
  Round 4's `m1`, unapplied.
- **`M7`** — the nested-runner and wrapper blind spots in `B4` should be stated as named limits in
  `buildCommand.ts`'s docstring and in `coverage-depth:207-210`, the way `mvn package` is: a runner in
  the target position, a wrapper not in `WRAPPERS` (`timeout`, `xargs`, `retry`), an interpreter invoked
  with a flag rather than a script path, a quoted script name, and a `cd` whose argument holds an
  environment variable are all invisible.
- **`M8`** — `LIFECYCLE` (`:128-131`) covers `pack` and `publish` and not `prepare`, which `npm ci` and
  `npm install` run and which is npm's documented build-on-install hook. Correct for this repository
  (the root manifest has `preinstall` only), but `pnpm install --frozen-lockfile` is pinned in
  `NOT_BUILDS:131` under the general message "a non-build reported as one".

---

## 7. My own gates

### Coverage Depth Matrix gate — **PASS**

The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md` (`git ls-files`
lists it; `git check-ignore` reports it not ignored), not only inside the stage-evidence file. Verified
by independent parse: 9 rows, `Status` 3 passing / 1 warning / 5 failing, 38 failing depth cells and 5
`Status` failures matching the declared counts, a 38-member partition that is complete, disjoint and
phantom-free at `A 30 / B 7 / C 1`, and every member satisfying its class's stated property. Per US/TC
depth: no row has a passing `Normal path` with an unrecorded failing `Error path` — `US-0017-0008` is the
only split case and it is recorded in its own section; the four rows failing both are class A with
justifications. `B6` is filed against the **pinning test**, not against the matrix's current content.

### RED/GREEN Observation Gate — **no subject**

`.qfai/specs/spec-0017/tdd/test-list.md` parsed mechanically: 82 rows of 9 cells; `Layer` 71
`Integration` / 11 `Unit`; `Status` 74 `refactor` / 6 `blocked` / 2 `todo`; `Integration` crossed with
`Status` 63 / 6 / 2; `DR-ID` is `-` on every row; `Blocked-By` is `CR-20260820-0007` four times,
`CR-20260818-0007` once, `CR-20260820-0001` once, `-` seventy-six times. `TDD-0069` and `TDD-0070` are
both `todo` with `DR-ID: -` and `Blocked-By: -`. **No row was advanced**, so there is no RED pair, no
GREEN pair and no per-item `Oracle proof` on a ledger row for me to judge, and none was offered.
`TDD-0069`'s disposition is `blocked`, which takes no branch; `TDD-0070`'s branch-3 `DR-*` is P1d's
subject and a fourth re-route is owed, which the record states at `:797-798`. I do not adjudicate it here.

The `V*`, `L*`, `X*` and `S*` rounds above are oracle-strength evidence for the **US coverage tests and
the record's own pinning tests**, not RED observations for ledger rows, and I judged them as such. Every
mutation is inside code the stage owns; none is a syntax error, a load failure or a deleted export; and
`V8`'s failure is a genuine non-termination, which is what that test asserts.

### PENDING

- **Runtime proof and the full-profile completion gate at completion strength.** The stage self-declares
  `FAIL` (`:807`) and does not claim completion; the round-5 unit is the round-4 repairs.
  `.qfai/report/specs-coverage/spec-0017.md` exists but is untracked (`M3`). `B1` and `B2` are **not**
  deferrable to that gate, because they are claims the record makes now about a suite that is red now.
- **Prototyping coverage evidence.** No `CON-API-*` is declared and this spec is not UI-bearing on the
  surface I read. Nothing owed, nothing audited.
- **P1d on the twice-revised `DR-0017-0010` and its third statement of clause 1.** Not my routing;
  request question 4 belongs to `R04`. `B8`'s handover contradiction is reported here because
  `## Ledger rows advanced` is stage evidence.

---

## Required fixes (blocking only)

1. **`B1`** — make `stageEvidenceCounts.test.ts:111-131` compare `named` against the packs holding at
   least one `R*.md`, so an in-flight pack does not redden the suite; then re-derive P7.
2. **`B2`** — re-measure `test:e2e` after `B1` and record the exit code and the revision; drop
   `--project assets` from the P7 command and correct `:737` to name the `e2e` project's
   `tests/assets/**` include.
3. **`B3`** — return `heuristic` from `buildCommand.ts:312-316` for a declared-script target; pin the
   boundary with a case that fails when it returns `build`.
4. **`B4`** — pin `cd` with a non-build-named target; fix `-w`; exercise one of
   `--filter` / `--dir` / `--cwd` / `--prefix`; add one chained-runner form.
5. **`B5`** — state the limit as three helpers and name `verify:pack` and `check-publish-dry-run.mjs` as
   `none`, not `heuristic`; handle or disclose `--ignore-scripts`.
6. **`B6`** — derive `COLUMNS` from the table header (or assert equality with it), and pin one
   distinguishing phrase per per-row justification so the v5 paragraph cannot silently revert.
7. **`B7`** — extend `CLAIMS` to `## Commands executed + key outputs`; anchor the guard-output regex to
   that block rather than taking the first match; recompute at least one seal instead of counting them;
   replace the date-bound window with a date-free rule.
8. **`B8`** — delete `:356`'s "because the workflow changes are unmerged" and `:360`'s "there is no run
   history to mutate", or stop claiming at `:369-372` that they are gone.
9. **`B9`** — `:672-673` to the not-yet form used at `:829-836`.
10. **`B10`** — define `L1`-`L3` and `Z1`-`Z4` in `## Execution logs` with their sources, or drop them
    from `## Final status`; rename the `L*` series so it does not collide with the layer labels at `:249`
    and `:258`.

## Mutation hygiene

Four files were mutation targets: `packages/qfai/tests/helpers/buildCommand.ts`,
`scripts/check-atdd-annotation-ledger.mjs`, `.qfai/evidence/coverage-depth-spec-0017.md` and
`.qfai/evidence/atdd-spec-0017.md`. **34 cycles.** Each mutation was applied to a single file, run, then
restored from a pristine copy taken **before** the edit. The harness (`tmp/r05qa/mut.py`) refuses to run
when a mutation leaves the target's `git hash-object` unchanged, refuses to clobber an existing pristine
copy, requires each search string to occur **exactly once**, and re-checks `git status --porcelain` after
every cycle, aborting the whole run if either check fails. No REDDENS above was measured against an
unmutated file, and no "reddens nothing" was measured against a file the harness had not confirmed
changed.

One disclosed near-miss, and one methodological retraction:

- The `V8` cycle's *reporting* line raised a `cp932` encode error on a non-ASCII character in vitest's
  output — **after** the `finally` block had restored the file, which printed its own confirmation
  (`19dd569edb46 == 19dd569edb46 == 19dd569edb46 -> OK ; porcelain=''`). I verified immediately and made
  the harness ASCII-safe before continuing.
- **I retract my first record-mutation batch.** `S1` through `S7` were run against the whole
  `stageEvidenceCounts.test.ts` file, which is **already red at HEAD**, so all eight cycles including the
  control reported "REDDENS" and none of them measured anything. Every `S*` result reported above is from
  the re-run against `-t "states the number"`, whose baseline is `3 passed | 1 skipped`, with the control
  green. This is `B1`'s second-order cost and I record it because a reviewer that mutates owes its own
  false starts.

All loop fixtures were built under the OS temp directory and removed; the classifier probes are
read-only; the shadow root and every probe live in gitignored `tmp/r05qa/`.

Final state, verified: `HEAD` **`3f815725`**, `git status --porcelain` **empty**, `git stash list`
**empty**, and all five sensitive paths byte-identical to their `HEAD` blobs —
`buildCommand.ts 19dd569e`, `check-atdd-annotation-ledger.mjs e639c915`,
`coverage-depth-spec-0017.md 4c26396e`, `atdd-spec-0017.md 7c07255d`, `validate.log 2b572934`. My one
write is this file, which plain `git status` does not show because `.gitignore` covers `.qfai/review/*`
and review packs are force-added.

## Every command I ran, with its result

```text
git rev-parse --short HEAD                 -> 3f815725 (start AND finish; HEAD did not move)
git status --porcelain                     -> empty (start, after all 34 cycles, finish)
git stash list                             -> empty
git ls-files -s, mode 120000, counted      -> 83 tracked symlinks
git diff --stat 54d8d325 3f815725          -> 17 files, +3355 / -405
git log --diff-filter=A -- .qfai/review/review-20260821040000000/review_request.md -> 3f815725
git ls-files .qfai/report                  -> 5 paths; validate.spec-0017.json NOT among them
git check-ignore -v .qfai/report/validate.spec-0017.json -> matched by .qfai/report/.gitignore

node tmp/r05qa/probe.mjs / probe2.mjs / probe3.mjs / corpus.mjs
  -> 19 missed builds, 14 false positives on my own corpus; the verdict-inversion table;
     a leading ./ on cd losing a resolvable build; pnpm -w build -> none
node tmp/r05qa/tree.mjs   -> 451 lines (313 own + 138 shipped), 4 flagged, identical to the pinned set
node tmp/r05qa/loop.mjs   -> all four fixtures real; T3 stat/realpath/readdir all ELOOP
node tmp/r05qa/loop2.mjs  -> cycle member as ROOT -> 0 entries, no throw (L5/L6 reachable)
node tmp/r05qa/counts.mjs -> the derivations: 22 / 9 / 9 / 4 / 6-vs-4; 8 annotations; 8 spec-0017
                             claims; 208 total; 5 packs in the window vs 4 named; 4 seals
python tmp/r05qa/audit.py plus a direct re-derivation
  -> matrix 9 rows, 3/1/5, 38 depth failures, 5 status failures, 38 unique members, complete,
     no phantoms, A30/B7/C1, 0 misassigned; ledger 82x9, 71/11, 74/6/2, 63/6/2, DR-ID '-' x82
python tmp/r05qa/seal.py  -> all four seals, the superseded one and the two-space variant MATCH
python tmp/r05qa/shadow.py -> git archive HEAD extracted; 83 declared, 83 created, 0 failed,
                              83 verified as links

npx vitest run --project unit tests/unit/buildCommand.test.ts                  ->  9 passed, exit 0
npx vitest run --project integration .../checkAtddAnnotationLedger.test.ts     -> 22 passed, exit 0
npx vitest run --project e2e tests/assets/coverageDepthMatrix.test.ts          ->  4 passed, exit 0
npx vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts    ->  9 passed, exit 0
npx vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts  -> 1 FAILED | 3 passed, exit 1
npx vitest run --project e2e             -> 1 failed | 1421 passed | 16 skipped, EXIT 1
npx vitest run --project integration --project assets --project unit -> 1186 / 19, exit 0
npx vitest run --project assets          -> "No test files found, exiting with code 1"
pnpm ci:lint                             -> exit 0; the ci:lint script splits into 11 members
node scripts/check-atdd-annotation-ledger.mjs [--spec 0017] -> 127 / exit 1 ; 8 / exit 0

validate --profile atdd --spec 0017 --root <shadow>  -> info=2 warning=0   error=2  EXIT 1
validate --profile tdd            --root <shadow>    -> info=5 warning=376 error=2  EXIT 1
validate --profile sdd            --root <shadow>    -> info=4 warning=26  error=0  EXIT 0
validate --profile full           --root <shadow>    -> info=4 warning=404 error=4  EXIT 1
shadow validate.spec-0017.json vs the working-tree copy -> one leaf differs, matchedFileCount 466/465
git hash-object .qfai/report/validate.log vs HEAD blob  -> 2b572934... both (untouched)

34 mutation cycles: V1-V13 (buildCommand.ts), L1-L7 (check-atdd-annotation-ledger.mjs),
X1-X7 plus Xctl (coverage-depth-spec-0017.md), S2-S6 and S8-S12 plus Sctl2 (atdd-spec-0017.md),
plus the retracted S1-S7 batch. Results in sections 1 to 5.
```

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — `file:line` throughout, each with the command that
      produced the measurement, and each oracle round with its control
- [x] Required gates and residual risks are recorded — `B1`-`B10` blocking, `M1`-`M8` advisory, and
      section 7 records what passed, what had no subject, and what is PENDING and why
