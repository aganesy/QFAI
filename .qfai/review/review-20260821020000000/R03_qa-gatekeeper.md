# R03 — qa-gatekeeper (round 4, spec-0017 / `/qfai-atdd`)

- Role: `qa-gatekeeper`, independent stage-level gate, non-edit
- Round: 4. **Round 3's general `qa-gatekeeper` slot was spent on the P1d re-route, so this is the
  first stage-level gate since round 2** (`.qfai/review/review-20260820220000000/R03_qa-gatekeeper.md`).
- Revision under review: `54d8d325` — `git rev-parse --short HEAD` at start **and** at finish. HEAD
  did not move.
- `git status --porcelain`: **empty** at start, after every one of the 25 mutation cycles, and at
  finish. `git stash list` empty. No `git checkout` / `stash` / `reset`, no commit, no push.
- Domain: validate / coverage / runtime-proof / oracle-strength gates
- Scratch: `tmp/r04qa/**` only. Every mutation planted alone and restored from a pristine copy with a
  `git hash-object` comparison in the same step; see the Mutation hygiene section.

## Verdict: **REVISE**

Six blocking findings. Of the five things I was asked to attack, three survive and two do not — and
both failures are in the artifact this round was convened to fix.

| #    | Finding | Class |
| ---- | ------- | ----- |
| `B1` | The own tree runs **four** builds, not two. v4 cannot see two of them, and the one it does see it sees by NAME | blocking |
| `B2` | v4 is a **regression** on 20 of 23 forms v3 caught, and neither committed corpus can see the class | blocking |
| `B3` | The ratchet floor reddens on the **first** ledger line `CR-20260820-0011` Option 1 tells you to remove | blocking |
| `B4` | Four record numbers do not reproduce, one of them a recorded command output — sixth consecutive round | blocking |
| `B5` | Both governance records still carry the build-predicate statements rounds 2 and 3 blocked on, and neither records v4 at all | blocking |
| `B6` | The `ELOOP` hardening misses the third `ELOOP` site, so a mutual cycle still exits 3 — and nothing tests it | blocking |
| `M1`-`M8` | advisories | non-blocking |

**What passed, measured rather than accepted:** all nine claimed matrix falsification rounds
(`X1`-`X3`, `X6`-`X8`, `Y1`-`Y3`) redden exactly as recorded with the control green; all six
`E6`-`E11` resolver rounds redden with the control green and the Oracle Strength Check admits every
one; the `realpath` dedupe genuinely terminates the cycle shape round 3 measured; the scoped gate is
`error=2` with the right content and a byte-identical artifact; round 2's and round 3's packs are now
clean under `--profile full` and **all three pack seals plus the superseded one reproduce exactly**;
and every re-derivable number in the P7 block (`1420`/`16`, `1174`/`19`, `19`, `208`/`127`/`8`, six
rejected alternatives, `ci:lint` exit 0) reproduces.

---

## 1. Break the v4 build classifier, both directions (request question 1)

I chose my own corpus and my own real-tree oracle. The predicate is
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:228-276` (`classifyBuild`), with
`BUILD_RUNNERS:150`, `BUNDLERS:184`, `RUNNER_PASSTHROUGH:197`, `INTERPRETERS:207`,
`namesABuild:210`, `isPathLike:218`.

### `B1` (BLOCKING) — "flags exactly the two real builds and nothing else" is false: the tree runs four

The claim is at `:548-551`; the assertions it certifies are at `:687-700`:

```text
// Measured on data this stage did not invent: every `run:` command line in both workflow trees
// (451 lines) flags exactly the two real builds and nothing else ...
expect.soft(flagged.length, "the own tree's build count: one producer plus its verification,
             both in ci.yml").toBe(2);
expect.soft(flagged.filter((entry) => !entry.startsWith("ci.yml ")),
  "no workflow outside the own orchestrator may run a build - the shipped tree least of all").toEqual([]);
```

I re-ran the scan with an independent implementation (`tmp/r04qa/tree.ts`). **451 lines exactly** —
313 own tree, 138 shipped tree, 4 YAML files — and **2 flagged, both in `ci.yml`**. The numbers
reproduce. The *premise* does not: the own tree runs a build in **four** places, and each of the two
v4 misses is documented as a build by the workflow file itself.

```text
CAUGHT   .github/workflows/ci.yml:326          pnpm -C packages/qfai build
CAUGHT   .github/workflows/ci.yml:371          pnpm ci:build-verify
MISSED   .github/workflows/release.yml:155     pnpm ci:gate
MISSED   .github/workflows/release.yml:318-321 pnpm -C packages/qfai pack --pack-destination ...
```

- `release.yml:162`, the very next step, says it outright: "**`ci:gate` builds** but does not re-run
  this; CI runs it after the build because some identifiers only appear in `dist/`." The chain is
  `ci:gate` -> `pnpm verify:pack` (root `package.json:18`) -> `npm pack` -> `prepack` ->
  `npm run build` -> `tsup` (`packages/qfai/package.json`).
- `release.yml:313-317`, that step's own comment: "**`prepack` runs `npm run build`, so packing is
  what produces the final `dist/`.**" `classifyBuild` returns `false` for the line.

So the second assertion — "no workflow outside the own orchestrator may run a build" — is **false as a
statement about this repository**, and green only because the predicate cannot see either violation.
`release.yml` is outside `ci.yml` and it builds twice.

**And the one it catches, it catches by name.** `pnpm ci:build-verify` is flagged because
`namesABuild` splits `ci:build-verify` on `[:\-_./]` and finds `build`. Rename the script
`ci:pack-verify` — identical behaviour, same `verify:pack`, same `tsup` — and the flag disappears
(`tmp/r04qa/probe2.ts`):

```text
true   pnpm ci:build-verify
false  pnpm ci:pack-verify
false  pnpm verify:pack
false  npm pack
false  pnpm ci:gate
```

That is the defect class `.qfai/evidence/coverage-depth-spec-0017.md:31-34` says this spec keeps
finding, verbatim: "a property asserted over how something is **written** rather than over what it
**does**". The predicate measures npm-script naming; `US-0017-0004`'s obligation is behaviour.

**Required fix (either is acceptable).** Correct the claim — the count is the number of lines whose
*command form* names a build, not the tree's build count, with `release.yml`'s two named as misses —
**or** widen the assertion to four and state which of them the predicate reaches structurally. Do not
leave "exactly the two real builds and nothing else" and "the own tree's build count" standing: those
are the two sentences that make this the real-data corpus, and both are false.

### `B2` (BLOCKING) — v4 is a regression on 20 of 23 forms v3 caught, and no committed corpus can see it

`classifyBuild` returns on the **first** target (`:266-273`), so everything after a shell operator or a
wrapper verb is invisible. v1-v3 scanned the line as text and caught all of it. Measured
(`tmp/r04qa/v3cmp.ts`, v3's three regexes transcribed from `1473897a`):

```text
v3     v4     command
BUILD    -    npm ci && npm run build                       <- v4 REGRESSION
BUILD    -    pnpm install --frozen-lockfile && pnpm build   <- v4 REGRESSION
BUILD    -    cd packages/qfai && pnpm build                 <- v4 REGRESSION
BUILD    -    pnpm lint; pnpm build                          <- v4 REGRESSION
BUILD    -    time pnpm build   /   sudo make build          <- v4 REGRESSION
BUILD    -    env NODE_ENV=production pnpm build             <- v4 REGRESSION
BUILD    -    docker build -t qfai:ci .                      <- v4 REGRESSION
BUILD    -    just build / task build / waf build / dune build / stack build   <- v4 REGRESSION
BUILD    -    flutter build web / poetry build / python -m build               <- v4 REGRESSION
BUILD    -    xcodebuild -scheme QFAI build                  <- v4 REGRESSION
BUILD    -    npx --yes tsup                                 <- v4 REGRESSION
BUILD    -    node --run build                               <- v4 REGRESSION
  -      -    msbuild MySolution.sln
20 of 23 forms v3 caught, v4 misses.
```

`npm ci && npm run build` is the most common build form there is in a GitHub Actions `run:` block. It
is now invisible, and so is `npx --yes tsup` — the flag consumes its own target because
`namesABuild("tsup")` is false (`:270-272`), the same trap the code comment two lines above says it
avoided for `pnpm --silent build`.

My own 44-build / 28-non-build corpus (`tmp/r04qa/probe.ts`) returns **34 missed builds and 9 false
positives**. I retract two of my eleven initial false positives on inspection:
`node ./scripts/check-build-warnings.mjs` and `pnpm run check:build-warnings` **are** builds —
`scripts/check-build-warnings.mjs:4` spawns `pnpm -C packages/qfai build` — so v4 is right there, by
name again.

**`msbuild MySolution.sln` is the sharpest single case.** Round 3's `R01` B2 named it explicitly as
MISSED. The committed test is titled "classifies every case round 3 named, in both directions"
(`:585`). `msbuild` is **not in the corpus** — and it is **still missed**. Three of round 3's six
named misses (`yarn build-storybook --quiet`, `npm run build-lib`, `msbuild MySolution.sln`) and four
of its named false positives (`cd build`, `ls -la build`, `if [ -d build ]; then`,
`npx vitest run build.test.ts`) were dropped, and the one still misclassified is among the dropped.

**The methodological point, which is what round 3 was actually about.** The corpus is round 3's cases
*against v3*. A corpus chosen adversarially against v3 cannot find v4's new failure modes, and neither
can 451 real lines that contain no chained command and no non-Node build tool. So "the countermeasure
is not a bigger corpus of my own invention" (`:580-582`) selected a corpus that is structurally blind
to the version it certifies — the fourth round of the same error, one level up.

I record the trade fairly: v4 is **strictly better than v3 on the real tree**. v3 flagged a JS comment
line inside a `run:` body (`ci.yml detect: // their build ran.`) and missed `pnpm ci:build-verify`;
v4 gets both right. The precision gain is real. What is undisclosed is that the recall loss is larger
than the precision gain and includes two builds in the very tree the test pins.

**Required fix:** name the two structural limits in the comment and in the record — a build after a
shell operator or a wrapper verb is invisible, and a build behind an aggregate script name is
invisible — and add at least one chained form to the corpus so the class is pinned rather than
described. Restore `msbuild MySolution.sln`, or narrow the test's title.

---

## 2. Break the matrix pinning test a third time (request question 2)

`packages/qfai/tests/assets/coverageDepthMatrix.test.ts:171-219`. The nine rounds the record claims
all reproduce (section 5). Here is the third break, and it is not a numeric one.

### `M4` — the class letters are now fully determined, so the classes' only content is unpinned

The assignment check (`:194-219`) hardcodes each class's defining property **in the test**:
`A` iff the row's `Status` is FAIL; `B` iff the row's `Status` is not FAIL and the column is
`State transitions` or `Combinatorial`; `C` iff `US-0017-0001` x `Boundary values`. Against the
current failing-cell set those three predicates **partition it exactly**, so every cell's letter is
forced. The partition table is therefore a derived restatement of the matrix, and the letters carry no
independent information at all.

What the letters are *for* is the reason — and the reason lives in prose the test never reads. Four
mutations, each planted alone into `.qfai/evidence/coverage-depth-spec-0017.md`, reverted with a hash
comparison in the same step:

```text
Z1  the Class A and Class B REASON paragraphs swapped (:141, :147),
    letters, members, sizes and assignment all untouched      exit=0  4 passed   REDDENS NOTHING
Z2  US-0017-0006's justification body inverted - "invokes
    check-workflow-hygiene in every lane - measured, nine
    occurrences" (:217-218)                                   exit=0  4 passed   REDDENS NOTHING
Z3  class B's prose cell count drifts from its own sizes line
    ("the same gap for all seven cells" -> eleven, :154)      exit=0  4 passed   REDDENS NOTHING
Z4  the scope sentence claims all nine stories covered (:4-5)  exit=0  4 passed   REDDENS NOTHING
Zctl (control) a prose sentence added                          exit=0  4 passed   reddens nothing
```

`Z1` is the one asked for: it preserves the table, the partition, the sizes and every assignment
property, and it inverts the record's central finding — that 30 cells fail because **no shipped
surface exists** (the stage's headline, open risk 1) and 7 fail because **the harness cannot run a
workflow**. After `Z1` the record says the opposite and the test is green. `Z3` is round 3's `R01` B3
residue, still live: the stated size `B 7` is pinned and the sentence that means the same thing is not.

### `M4b` — and the assignment check cannot record a new gap

Because the three properties are hardcoded, a failing cell that appears on a **covered** row in any
column other than `State transitions` / `Combinatorial` has **no admissible class**. Measured —
`US-0017-0002`'s `Error path` re-scored FAIL, with the cell count and the sizes line updated
consistently, and the new member filed under each class in turn:

```text
Z5a  filed as class A   exit=1  1 failed | 3 passed   REDDENS ("every member must satisfy its own")
Z5b  filed as class B   exit=1  1 failed | 3 passed   REDDENS
Z5c  filed as class C   exit=1  1 failed | 3 passed   REDDENS
```

A fourth letter reddens too (`ok = false` for anything but A/B/C, `:213`). So the record cannot
honestly record a newly discovered gap of a shape it has not already seen without editing the test —
**a test that punishes its own fix**, the anti-pattern this repository states in writing twice
(`coverage-depth-spec-0017.md:223-224`; `spec0017LayeredCiScaffoldE2E.test.ts:31-33`).

**Required fix (advisory, non-blocking):** derive the class properties from the record instead of
hardcoding them — read each class's heading and assert its member set against it — or state the bound
plainly: the letters are derived, the reasons are prose, and re-scoring a covered row needs a test
change. The membership, sizes and total checks are genuine advances and should stay.

---

## 3. The loop guard (request question 3)

`scripts/check-atdd-annotation-ledger.mjs:106-136`, with `isLoop` at `:172-181`.

### What is right, measured

I replicated the shipped walk with instrumentation (`tmp/r04qa/loop.mjs`) and ran the real script end
to end in throwaway roots under `os.tmpdir()` (`tmp/r04qa/exit3.mjs`).

```text
1. the two real scanned trees
   tests/e2e                 {visits:1, hits:0, files:0}   <- ledger markdown only, correctly
   packages/qfai/tests/e2e   {visits:1, hits:0, files:24}
2. a self-referencing junction (round 3's exact fixture)
   replica  {visits:2, hits:1, readdirSkips:0, files:1}     <- TERMINATES, file still read
   the real script, fake root, loop under packages/qfai/tests/e2e  -> exit 1, a normal finding
```

**Is it reachable?** Yes — `hits: 1`, where round 3 measured 0 hits in 64 descents. **Does it
terminate a real cycle?** Yes: 2 visits, and the ordinary walk still reads its file. **And the comment
is now honest** — 0 hits on the two real trees, and `:113-115` says exactly that ("this repository's
83 tracked symlinks are all under dot-directories this walk skips by name, and ZERO are under either
scanned tree"). That is a correct repair of a correct finding.

### `B6` (BLOCKING) — the third `ELOOP` site is unguarded, so the claimed property is false

`ELOOP` can be raised at three places in this walk. The repair guarded `realpath` (`:122-127`) and
`readdir` (`:129-136`). It did not guard **`stat`** (`:145-152`), whose catch still admits only
`isMissing`:

```js
try {
  directory = (await stat(full)).isDirectory();
} catch (error) {
  // A dangling link is not a failure of this guard.
  if (!isMissing(error)) throw error;
  continue;
}
```

`stat` is the site that fires first for the classic **mutual** cycle. Measured, with a real subtree
behind it that the guard should have measured:

```text
C. mutual symlink cycle x->y, y->x under packages/qfai/tests/e2e, plus sub/two.test.ts
   -> status 3  "internal failure, no measurement taken: Error: ELOOP ... stat '.../x'"
D. control: the SAME subtree, no cycle
   -> status 0  "2 claim(s) backed by a test annotation (all specs)"
```

`D` proves the dropped subtree was measurable. So the comment at `:131-134` — "`ELOOP` was previously
unhandled, so a symlink cycle answered exit 3 — 'no measurement taken' — instead of being skipped and
measured around" — is **still false for the mutual cycle**, which is the canonical shape. A claim about
a repair, written in the repair, that the repair does not deliver: the class this round exists to
catch.

**Does the `ELOOP` skip lose a tree it should have measured?** Not through `readdir` — that skip is
per-directory and fails **closed**, since claims behind it then report as unbacked and redden the
ratchet. Through `stat` it loses **everything**, because the walk aborts.

### `B6b` — and nothing tests any of it

```text
grep -n -i 'loop|ELOOP|realpath|exit 3|status).toBe(3'
  packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts
  -> only :152-166, the pre-existing symlink-follow test. No loop case, no ELOOP case, no exit-3 case.
vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts  -> 19 passed (19)
```

Round 3's `R01` listed both as **required fixes**: B1 ("And test the loop: the fixture is five lines
on top of the symlink test already at `:152`") and M3 ("cover exit 3; it is reachable and this report
has a ten-line fixture for it"). Neither landed — the test count is unchanged at 19 and the diff to
that file is one assertion plus comments. `CLAUDE.md`: "All source changes must have corresponding
test coverage." And the record mentions `realpath`, `ELOOP` and the loop guard **nowhere**: `git grep`
over both evidence artifacts returns zero hits. A new guard with no test, no oracle round and no
evidence entry, against this stage's own recorded countermeasure that "every new claim gets an oracle
round before it is reported".

**Required fix:** add `ELOOP` to the `stat` catch (one clause, and `isLoop` already exists), and add
the two tests round 3 specified — a self-referencing junction for the dedupe and a mutual cycle for
`ELOOP`, gated the way `:152-166` gates the existing symlink test.

---

## 4. `B3` (BLOCKING) — the ratchet floor punishes `CR-20260820-0011` Option 1's dominant branch

`packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts:336-348`. Round 2's `B1`
was that `unbacked.length > 100` punishes its own fix. The repair replaced `checked === 208` with
`toBeGreaterThanOrEqual(208)` and the message "the ledger may grow; it may not shrink below what
`CR-20260820-0011` measured". Round 2's case is genuinely fixed. **A new legitimate change is punished
instead — and it is the recommended remediation's main branch.**

`CR-20260820-0011` Option 1 (recommended), at `:78-83`, gives two resolutions per claim and says which
one matters:

> - a test exists and its annotation was never added -> add the annotation;
> - no test exists -> **remove the ledger line** ...
>
> The second is the one that matters and the one that will hurt.

Measured over the exported pure `checkLedger` at HEAD (`tmp/r04qa/ratchet2.mjs`), evaluating all three
assertions of the ratchet together:

```text
== Option 1 branch 1: a test exists, ADD the annotation ==
GREEN  checked= 208 unbacked= 126   1 claim backfilled
GREEN  checked= 208 unbacked= 100   27 backfilled       <- round 2's B1 case: FIXED
GREEN  checked= 208 unbacked=   0   all 127 backfilled

== Option 1 branch 2: no test exists, REMOVE the ledger line ==
RED    checked= 207 unbacked= 126   1 ledger line removed   <- the floor FAILS on the FIRST one
RED    checked= 203 unbacked= 122   5 removed
RED    checked= 148 unbacked=  67   60 removed
RED    checked=  81 unbacked=   0   127 removed  <- the defect fully repaired, the test RED

== regressions the ratchet must still catch ==
RED    checked= 209 unbacked= 128   one NEW unbacked claim appended
RED    checked= 208 unbacked= 208   the guard goes blind (no sources at all)
GREEN  checked= 209 unbacked= 127   a legitimate NEW backed story   <- round 2's B1: FIXED

== the disclosed blind spot ==
GREEN  checked= 208 unbacked= 127   SWAP: one deleted, one new unbacked added
```

So the assertion reddens on the **first line removed**, and is still red when the CR's recommended work
is **complete** at `unbacked = 0`. `CR-20260820-0011:100-104` describes it as "the **ratchet** ...
`toBeLessThanOrEqual(127)`, which reddens on a new unbacked claim and stays green as the 127 are
fixed" — true of branch 1, false of branch 2, and branch 2 is the branch the same CR calls the one
that matters. The code comment at `:337-339` is honest about the mechanism ("A floor ... catches a
truncation") and blind to the fact that the deliberate truncation **is** the fix.

This is the fourth version of this one assertion and the third time its stated property has been wrong
in one direction. The swap blind spot was disclosed rather than papered over, which is right; this one
was not noticed.

**Required fix (any of three).** (a) State the branch-2 exception in the comment as a
deliberate-update point, exactly as the swap is stated — cheapest, and consistent with how the file
already handles a known bound. (b) Pin `unbacked` exactly at 127 with the CR named, so movement in
either direction is a deliberate edit — round 2's own recommendation. (c) Drop the `checked` floor and
keep the `unbacked` cap plus the spec-0017 zero, stating that a truncation shows up as `unbacked`
falling. Also correct `CR-20260820-0011:100-104`.

---

## 5. Verify the oracle claims in the two governance records (request item 4)

Everything the record claims as an oracle round, I re-ran. **All fifteen reproduce.** Each planted
alone, run, restored from a pristine copy, hash-compared, with `git status` re-checked after each.

### `E6`-`E11` — `US-0017-0003`, mutating `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml`

```text
E6   probe list disabled (.nvmrc -> .nvmrc-off)     exit=1  1 failed | 10 passed  REDDENS
E7   the in-loop publish removed                    exit=1  1 failed | 10 passed  REDDENS
E8   setup-node takes the literal "20"              exit=1  2 failed |  9 passed  REDDENS
E9   fail-open default 20 -> 22                     exit=1  1 failed | 10 passed  REDDENS
E10  the ::warning:: annotation dropped             exit=1  1 failed | 10 passed  REDDENS
E11  probe order reversed (.node-version first)     exit=1  1 failed | 10 passed  REDDENS
Ectl (control) a comment inside the run body        exit=0  11 passed (11)        reddens nothing
```

The failing messages name this row's own predicates — "the adopter's own version file must win — this
is the whole of 'file-derived': expected '20' to be '23.4.1'", "the documented fallback must be
published verbatim, or setup-node receives a guess", "falling open silently is the drift this
forbids", "`.nvmrc` is probed first, so it wins when both exist".

**Oracle Strength Check, applied per round:** every mutation is inside the shipped step the row owns;
none is a syntax error, a load failure or a deleted export; none is an equivalent mutant; and the
recorded command is the one I ran. **Admissible.** Round 3's `R02` B7 — "`E11` is recorded nowhere and
was never run" — is now discharged, and discharged by an independent run rather than by the record's
say-so, which matters because the harness lives in gitignored `tmp/`.

Two citation defects, both advisory (`M5`): the record credits `E9`/`E10` to round 2's `qa-gatekeeper`
but the two descriptions are **swapped** relative to
`review-20260820220000000/R03_qa-gatekeeper.md:83-84`; and `E11` (probe order) is round 3's `R01` N1
relabelled, not a round the stage found. The heading "the three rounds round 3 could not find"
(`atdd-spec-0017.md:504`) also misstates round 3's finding, which was that they were not **recorded**.

### `X1`-`X3`, `X6`-`X8`, `Y1`-`Y3` — the matrix pinning test

```text
X1  a class member row dropped          REDDENS  "every failing cell must be named by a reason class"
X2  a class names a WARN-scored cell    REDDENS  same predicate
X3  an enumeration cut, sizes left      REDDENS  same predicate
X6  two members swap classes, sums OK   REDDENS  "every member must satisfy its own"
X7  one cell claimed twice              REDDENS  "a cell may not be claimed by two reason classes"
X8  a table cell emptied                REDDENS  throws "unrecognized score" (all 4 tests fail)
Y1  sizes inflated tenfold              REDDENS  expected {A:300,B:70,C:10} to equal {A:30,B:7,C:1}
Y2  the B and C labels permuted         REDDENS  "every member must satisfy its own"
Y3  one size drifts, total stays        REDDENS  expected {A:29,B:8,C:1} to equal {A:30,B:7,C:1}
(control) prose added                   green
```

**Nine of nine reproduce.** `Y1` and `Y2` — round 3's two breaks — are genuinely closed. The record
skips `X4`/`X5` with no note; harmless, but a gap in an enumerated id range is the same shape `E11` had.

### The v4 corpus counts

451 lines: **exact**. 2 flagged, both `ci.yml`: **exact**. 43 corpus cases (25 builds + 18 non-builds),
all classifying as the test expects — but the comment says "round 3's own **30** named cases"
(`:549-550`), which is neither 43 nor the 16 forms round 3 named. See `B4`.

---

## 6. `B4` (BLOCKING) — four record numbers do not reproduce, one of them a recorded command output

Round 3's `R02` B4 was exactly this finding. Three of its four items were fixed and the class recurred
in the same commit that fixed them.

1. **`.qfai/evidence/atdd-spec-0017.md:196-197`**, in "Commands executed + key outputs" — a **recorded
   command output**:
   `pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`
   `-> Tests 9 passed (9), exit 0`. I ran exactly that at HEAD: **11 passed (11)**. This round added
   the two `classifyBuild` tests to that very file and the recorded output was not re-derived. Round
   3's B4 item 3 was the identical defect one command lower (`10 passed` for a file holding 19) and was
   fixed in this commit.
2. **`:698`** — "across five oracle rounds, a ten-form round 2, **a three-round behavioural round**".
   The same file at `:519` says "With `E6`-`E8` that is **six** rounds", and the `E9-E11` block records
   the other three. Three against six, 180 lines apart.
3. **`:698`** — "and **a seven-round** falsification of the matrix pinning test". The
   `M1-M7, X1-X8, Y1-Y3` block records `M1`-`M7` **plus nine more** = **sixteen**. The round-4 request
   itself says "Nine falsification rounds".
4. **`spec0017LayeredCiScaffoldE2E.test.ts:549-550`** — "round 3's own **30** named cases". The
   committed corpus holds **43**; round 3 named **16** forms.

Items 2 and 3 sit in `## Final status` — the section a completion gate reads first, and the one section
excluded from every audit subject so that it can be trusted. Both understate this round's own evidence,
which is the harmless direction and the wrong property: a number nobody re-derived cannot be relied on
in either direction.

**Required fix:** re-derive all four at `54d8d325`, and record the revision each figure was measured
at. The P7 block now does this (`:652`); "Commands executed" and `## Final status` do not.

---

## 7. `B5` (BLOCKING) — both records still carry the statements rounds 2 and 3 blocked on, and neither records v4

`git grep 'classifyBuild\|v4\|9 missed\|10 false'` over `.qfai/evidence/atdd-spec-0017.md` and
`.qfai/evidence/coverage-depth-spec-0017.md`: **zero hits**. The v4 predicate — the largest change this
round — is recorded in no evidence artifact. The only build-predicate measurement in either record is
the one round 3 falsified.

- **`atdd-spec-0017.md:499-502`**: "`v3` anchors on `build` as a standalone shell **word** ... Measured
  in **both** directions this time: **21 forms caught, 14 non-builds rejected, 0 misclassified.**
  `mvn package` remains invisible and is named as a known limit." Round 3's `R01` B2 was blocking and
  required, in as many words: "replace '0 misclassified' — in the comment **and in
  `atdd-spec-0017.md:479-481`**". The comment was replaced; the record's sentence is unchanged, still
  present-tense, still the headline number for a predicate that no longer exists.
- **`coverage-depth-spec-0017.md:190-191`**: "**Round 2 rebuilt the scan around the verb** and
  re-observed **10 of 10** forms reddening." That is round 2's `B3`, blocking, whose required fix was
  "Do not leave 'anchored on the verb' standing." It was applied to `atdd-spec-0017.md:489-492` — which
  now correctly says "it was **not** 'anchored on the verb' ... it was a closed five-member
  package-manager list" — and **not** to the committed matrix. Two rounds later, the artifact my own
  contract makes me audit describes v2 as the state of the scan whose `Oracle strength` cell it scores.
- **`coverage-depth-spec-0017.md:293`**: "six rounds redden (`E6`-`E11`)". Round 3's `R02` B7 was
  applied to `atdd-spec-0017.md` and not here. The sentence is now *true* — I reproduced all six — but
  it became true by the rounds being run elsewhere, not by this sentence being repaired.

The committed Coverage Depth Matrix is the one artifact in this pack that survives into the repository
for a third party to read. Leaving two superseded predicate descriptions and one uncorrected count
inside it is a governance defect independent of the code.

**Required fix:** correct `atdd-spec-0017.md:499-502` and `coverage-depth-spec-0017.md:190-191`, and
add an Execution-logs entry for the v4 predicate carrying whatever survives `B1` and `B2`.

---

## 8. The scoped gate and its citations (request question 5)

Run in a `git archive HEAD` shadow root (`tmp/r04qa/shadow`) with all 83 tracked symlinks
re-materialised from the index (**83 declared, 83 created, 0 failed**), so the tracked
`.qfai/report/validate.log` was never written and `QFAI-LINK-001` did not fire.

```text
node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017 \
     --root tmp/r04qa/shadow
  -> counts: info=2 warning=0 error=2     EXIT=1
     [error] QFAI-ATDD-111  SPEC-0017:US-0017-0007            <- and nothing else
     [error] QFAI-ATDD-112  tests/integration/** -> TC-0017-0016, -0030, -0032, -0033,
                                                    -0034, -0035, -0069, -0070   <- exactly 8
     [info]  QFAI-ATDD-117 (11 Unit/Component TCs, excluded)
     [info]  QFAI-PROFILE-001 (partial profile)
```

- **`error=2`: confirmed.** **`QFAI-ATDD-111` names `US-0017-0007` only: confirmed.**
  **`QFAI-ATDD-112` names exactly 8 TCs: confirmed**, and they are precisely the six `blocked` rows
  plus `TDD-0069` / `TDD-0070`.
- The shadow run's `validate.spec-0017.json` is **byte-identical** to the committed one (5133 bytes):
  `profile: atdd`, `counts {info:2, warning:0, error:2}`, issues `QFAI-ATDD-111 error`,
  `QFAI-ATDD-112 error`, `QFAI-ATDD-117 info`, `QFAI-PROFILE-001 info`.
- **The citations are the admissible ones.** `qfai.config.yaml:5` declares
  `paths.outDir: .qfai/report` and `:37` `output.validateJsonPath: .qfai/report/validate.json`, so
  `.qfai/report/validate.spec-0017.json` is the scoped sibling and
  `.qfai/report/run-20260820194530635/` is a per-run directory under the configured `outDir`. Both
  exist. The record's refusal to cite `validate.log` (`:219-224`) stands, and my run confirms the
  mechanism: the shadow write landed in `tmp/r04qa/shadow/.qfai/report/run-20260820224949263`, absent
  from the real tree, and `git hash-object .qfai/report/validate.log` equals
  `git rev-parse HEAD:.qfai/report/validate.log` (`efbdae82...`) before and after.

### Full profile

```text
validate --profile full --fail-on error --root tmp/r04qa/shadow
  -> counts: info=4 warning=404 error=4     EXIT=1
     [error] QFAI-REVIEW-004  .qfai/review/review-20260821020000000   (no summary.json)
     [error] QFAI-REVIEW-005  .qfai/review/review-20260821020000000   (no Rxx_*.md)
     [error] QFAI-ATDD-111    12 US across spec-0003 / -0006 / -0008 / -0015 / -0017
     [error] QFAI-ATDD-112    15 TC across spec-0003 / -0008 / -0015 / -0017
```

- **The two packs that were missing `summary.json` are now clean.** Neither
  `review-20260820220000000` nor `review-20260821000000000` appears. Round 3's `R02` B5 is applied, and
  both files satisfy `review-artifact-layout.md:21-31`: `version`, `created_at`, `target`,
  `routing_profile`, `overall_status: FAIL`, `reviewers[]` (4 and 3 entries, matching the reports
  present), `revision_form: "content-hash"`, `revision: 56daee8d` / `1473897a`.
- **What remains at `error` that the record does not disclose (`M7`):** the two `QFAI-REVIEW-*`
  findings on `.qfai/review/review-20260821020000000` — **created by `54d8d325` itself**, the commit
  that opened this round. `## Final status:723` says "Three packs, one per round" while the tree holds
  four pack directories. Round 3's `R04` B3 named the `full`-profile errors as "a fourth independent
  reason `build` cannot exit 0 today, and the one the stage can fix itself" and required the cycle
  account completed "in both artifacts";
  `.qfai/decisions/DR-0017-0010-*.md` and `CR-20260820-0012-*.md` mention the `full` profile
  **nowhere** (grep: zero hits for `profile full` and `QFAI-REVIEW-`). The over-determination paragraph
  the CR gained covers the `QFAI-ATDD-111` / `-112` strands only.
- The two ATDD errors are disclosed and correct.

---

## 9. Re-derived numbers (request question 5)

Every figure measured from the tree at `54d8d325`, not read from a prior report.

```text
node scripts/check-atdd-annotation-ledger.mjs --spec 0017    -> "8 claim(s) backed"  EXIT=0    ok
node scripts/check-atdd-annotation-ledger.mjs                -> EXIT=1, 127 unbacked lines     ok
unique ledger claims (grep -oE ... | sort -u | wc -l)        -> 208                            ok
vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts -> 19 passed (19)       ok
vitest run tests/assets/coverageDepthMatrix.test.ts                    -> 4 passed (4)         ok
vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts -> 11 passed  RECORD SAYS 9  WRONG (B4)
pnpm -C packages/qfai test:e2e (vitest --project e2e)        -> 1420 passed / 16 skipped       ok
vitest --project integration --project assets --project unit -> 1174 passed / 19 skipped       ok
pnpm ci:lint                                                 -> EXIT 0; package.json:19 splits
                                                                on && into exactly 11 members  ok
07_Decisions.md 'Decision, rejected alternative' bullets     -> 6, at :133 :137 :203 :206 :242
                                                                :249, across 3 of the 9 DRs    ok
09_delta.md Rejected section '- Candidate:' bullets          -> 3                              ok
run: command lines across both workflow trees                -> 451 (313 own + 138 shipped)    ok
v4 flagged                                                   -> 2, both ci.yml         ok, but see B1
corpus cases in the committed test                           -> 43   COMMENT SAYS 30    WRONG (B4)
```

### The three pack seals — all reproduce, and so does the superseded one

Serialization per `atdd-spec-0017.md:741-743`: `<git hash-object><single space><path><LF>`, paths
relative to the pack root in `LC_ALL=C` order, sha256 over the byte stream.

```text
review-20260820200000000  4 files  1-space 5c8cd42571c8baf5...c74317e3   *** MATCH ***
                                   2-space fa8d6e836cabd14a...d17e2526   = the value the record cites
review-20260820220000000  6 files  1-space 305ffd6555799fd3...5983e77a   *** MATCH ***
review-20260821000000000  5 files  1-space 257e793b5c764a81...6d01bfd0   *** MATCH ***
superseded (round 1, 3 files)      d8ac0a777dd38514...58967c9            *** MATCH ***
round 1's printed manifest         all four git hash-object values match byte for byte
```

The superseded seal still reproducing over the three reports **as they stand today** is what discharges
the re-seal, exactly as `:749-753` now argues — and that argument is the right one, replacing the
self-certifying "the pack gained a required artifact" reasoning round 2 flagged. **This is the record's
strongest passage and it is now fully verified for the third round running.**

---

## 10. My own gates

### Coverage Depth Matrix gate — **PASS**

The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md` (`git ls-files`
lists it; `git check-ignore` reports it not ignored), not only inside the stage-evidence file. Every
failing cell is named and assigned to exactly one class (`:126-139`), and I verified completeness,
disjointness and the absence of any non-failing member mechanically. No `US` is left with only
normal-path coverage unrecorded: `US-0017-0008` is the only row with a passing `Normal path` and a
failing `Error path`, and its split is recorded at `:243-252`; the four rows failing both are class A
with justifications. Per `test-case-depth-checklist.md:124-127` the warning-level rationale check is
`completion-reviewer`'s. The defects above are in what the matrix **says**, not in whether it exists or
partitions — hence PASS on this gate, with `M4` and `B5` filed separately.

### RED/GREEN Observation Gate — **no subject**

`.qfai/specs/spec-0017/tdd/test-list.md` parsed mechanically: 82 rows of 9 cells; `Layer` 71
`Integration` / 11 `Unit`; `Status` 74 `refactor` / 6 `blocked` / 2 `todo`. `TDD-0069` and `TDD-0070`
are both still `todo` with `DR-ID = -` and `Blocked-By = -`, matching `atdd-spec-0017.md:270-272`
exactly. No row was advanced, so there is no RED pair, no GREEN pair and no per-item `Oracle proof` on
a ledger row for me to judge, and none was offered. `TDD-0069`'s disposition is `blocked`, which takes
no branch; `TDD-0070`'s branch-3 `DR-*` is P1d's subject, and P1d has returned REVISE twice with a
third re-route owed — which the record states at `:690` and does not claim. I do not adjudicate it here.

The `E*`, `X*`, `Y*`, `Z*` and `V*` rounds above are oracle-strength evidence for the **US coverage
tests**, not RED observations for ledger rows, and I judged them as such.

### PENDING

- **Runtime proof and the full-profile completion gate**, at completion strength. The stage
  self-declares `FAIL` (`:694`) and does not claim completion; the round-4 unit is the round-3 repairs.
  `.qfai/report/specs-coverage/spec-0017.md` exists.
- **Prototyping coverage evidence.** No `CON-API-*` is declared and this spec is not UI-bearing on the
  surface I read. Nothing owed, nothing audited.
- **P1d on the revised `DR-0017-0010`.** Not my routing this round.

---

## Advisory findings

- **`M1`** — **the corpus scan can lose the shipped tree entirely and stay green.** `:661-668` wraps
  `readdir(root)` in a `try { ... } catch { continue }`, and the only size floor is
  `expect.soft(scanned).toBeGreaterThan(100)` while the own tree alone is 313 of the 451 lines.
  Measured: repointing the shipped root at a non-existent directory leaves the test **green**
  (`V1: exit=0, 11 passed`), so the assertion whose message is "no workflow outside the own
  orchestrator may run a build - the shipped tree least of all" passes with the shipped tree never
  opened. Repointing the *own* root reddens (`V2: exit=1`, on `flagged.length === 2`). Assert that both
  roots resolved, or floor `scanned` per root.
- **`M2`** — `flagged.filter((entry) => !entry.startsWith("ci.yml "))` (`:694`) matches on **basename**
  across a flat list built from both roots, so a build inside a shipped `ci.yml` would satisfy "no
  workflow outside the own orchestrator". Tag entries with their root.
- **`M3`** — `namesABuild` (`:210-216`) splits on `[:\-_./]`, so any script name containing a `build`
  segment is a build: `npm run clean:build-cache`, `npm run lint:build-config`,
  `pnpm run test:build-output`, `npm run verify-build-metadata`, `bash scripts/assert-no-build.sh`, and
  `cmake -S . -B build` / `cmake --install build` — a **configure** and an **install** step — all
  classify true. This re-creates the punish-its-own-fix shape in the exact scenario `:524-527` names:
  a `CR-20260820-0007` reuse lane called `restore:build-artifact` or `download:build-cache` would fail
  `US-0017-0004` saying that lane "runs its own build". Fixing `ci:build-verify` is what bought this;
  say so.
- **`M4` / `M4b`** — the matrix assignment check: section 2. Advisory because the record is correct
  today.
- **`M5`** — `E9` / `E10` are attributed to `review-20260820220000000/R03_qa-gatekeeper.md:83-84` with
  the two descriptions **swapped**, and `E11` is round 3's `R01` N1 relabelled rather than a round the
  stage found.
- **`M6`** — the record carries **no round-3 reviewer accounting**: the verdict table at `:626-630`
  covers round 2 only; three REVISE verdicts (`R01` 4 blocking, `R02` 7 blocking, `R04` 3 blocking)
  appear in no table; and `## Final status`'s "Confirmed by" (`:716-719`) still names round 1's two
  reviewers on `8fb48002` — round 3's `m1`, unapplied for a third round. The disclosure that round 3's
  stage-level `qa-gatekeeper` slot was spent on P1d appears in the round-4 request and in the commit
  message, and **not in the evidence record**.
- **`M7`** — the `full`-profile disclosure gap: section 8.
- **`M8`** — `checkAtddAnnotationLedger.test.ts:153` still motivates the symlink test with "This
  repository tracks 83 symlinks", the same misleading count the script's own comment was corrected for
  at `check-atdd-annotation-ledger.mjs:113-115`. Zero of the 83 are reachable by this walk.

---

## Every command I ran, with its result

State:

```text
git rev-parse --short HEAD                   -> 54d8d325  (start AND finish; HEAD did not move)
git status --porcelain                       -> empty     (start, after each mutation, finish)
git stash list                               -> empty
git ls-files -s, mode 120000, counted        -> 83 tracked symlinks
git diff --name-status 1473897a 54d8d325     -> 15 files (4 code, 4 governance, 7 pack/report)
git hash-object <each mutation target> vs git rev-parse HEAD:<path>  -> SAME for all, at finish
```

Suites and gates:

```text
npx vitest run tests/assets/coverageDepthMatrix.test.ts                     -> 4 passed,    exit 0
npx vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts  -> 19 passed,   exit 0
npx vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts -> 11 passed,   exit 0
npx vitest run --project e2e                                                -> 1420 / 16,   exit 0
npx vitest run --project integration --project assets --project unit        -> 1174 / 19,   exit 0
pnpm ci:lint                                                                -> exit 0
node scripts/check-atdd-annotation-ledger.mjs [--spec 0017]     -> 127 / exit 1;  8 / exit 0
```

Classifier, extracted by line range so there is no transcription risk, run under Node 24 type
stripping:

```text
node tmp/r04qa/probe.ts   -> 34 missed builds / 9 false positives on my own 72-case corpus
node tmp/r04qa/probe2.ts  -> ci:gate false, verify:pack false, ci:build-verify true,
                             ci:pack-verify false, npx --yes tsup false, msbuild false
node tmp/r04qa/probe3.ts  -> the release.yml pack line false
node tmp/r04qa/tree.ts    -> 451 lines (313 + 138), 4 yaml files, v4 flags 2 (both ci.yml),
                             v3 flags 2 (one of them a JS COMMENT), 3 lines mention build at all
node tmp/r04qa/v3cmp.ts   -> 20 of 23 forms v3 caught, v4 misses
```

Loop guard:

```text
node tmp/r04qa/loop.mjs   -> real trees {visits:1, hits:0} twice; self-junction {visits:2, hits:1};
                             mutual cycle THREW ELOOP from stat()
node tmp/r04qa/exit3.mjs  -> A clean exit 1 | B self-junction exit 1 | C mutual cycle EXIT 3,
                             "no measurement taken" | D control exit 0, 2 claims backed
grep for loop / ELOOP / realpath / exit 3 in the guard test  -> no such test exists
```

Ratchet, validate, seals and artifacts:

```text
node tmp/r04qa/ratchet.mjs and ratchet2.mjs -> the table in section 4, over the exported checkLedger
git archive HEAD piped to tar -x -C tmp/r04qa/shadow    -> extracted
python tmp/r04qa/links.py                               -> 83 declared, 83 created, 0 failed
validate --profile atdd --fail-on error --spec 0017 --root <shadow> -> info=2 warning=0 error=2, EXIT 1
validate --profile full  --fail-on error            --root <shadow> -> info=4 warning=404 error=4, EXIT 1
byte-compare shadow vs committed validate.spec-0017.json -> byte-identical (5133 B)
git hash-object .qfai/report/validate.log vs HEAD blob   -> efbdae82... both (untouched)
python tmp/r04qa/seal.py    -> all three seals, the superseded one, and the two-space variant
python (parse tdd/test-list.md) -> 82 rows; 71 / 11; 74 / 6 / 2; TDD-0069 and -0070 still todo
python (summary.json shape) -> both packs satisfy review-artifact-layout.md:21-31
git ls-files and git check-ignore -> the matrix is tracked and not ignored
```

Oracle rounds — 25 cycles, each planted alone, run, restored, hash-compared:

```text
X1 X2 X3 X6 X7 X8 Y1 Y2 Y3   REDDEN           (the record's nine matrix claims)
Z1 Z2 Z3 Z4                  redden NOTHING   (M4 - the third break)
Z5a Z5b Z5c                  REDDEN           (M4b - no class admits a newly found gap)
Zctl                         reddens nothing  (control)
E6 E7 E8 E9 E10 E11          REDDEN           (the record's six resolver claims)
Ectl                         reddens nothing  (control)
V1 shipped root unreachable  reddens NOTHING  (M1)
V2 own root unreachable      REDDENS
```

## Mutation hygiene

Three files were mutation targets: `.qfai/evidence/coverage-depth-spec-0017.md`,
`packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml`, and
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`. Each mutation was applied to a single
file, run, then restored from a pristine copy taken **before** the edit. The harness
(`tmp/r04qa/mut.py`) refuses to run when a mutation leaves the target's `git hash-object` unchanged,
refuses to clobber an existing pristine copy, and re-checks `git status --porcelain` after every cycle,
aborting the whole run if either check fails. No REDDENS above was measured against an unmutated file.

One incident, disclosed because a reviewer that mutates owes its own near-misses: the `Z5a` cycle's
*reporting* line raised a `cp932` encode error on a non-ASCII character in my own label — **after** the
`finally` block had already restored the file. I verified immediately: `git status --porcelain` empty,
and `git hash-object .qfai/evidence/coverage-depth-spec-0017.md` =
`a335467849651f6e0279aeb9c6bd83e080f50e5b` = `git rev-parse HEAD` for that path. I then re-ran `Z5b`
and `Z5c` with ASCII labels. All loop and exit-3 fixtures were built under `os.tmpdir()` and removed;
the classifier probes are read-only. Everything else lives in gitignored `tmp/r04qa/`.

Final state, verified: every mutation target byte-identical to its `HEAD` blob,
`.qfai/report/validate.log` untouched, `git status --porcelain` **empty**, `HEAD` **54d8d325**. My one
write is this file, which plain `git status` does not show because `.gitignore` covers
`.qfai/review/*` and review packs are force-added.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — `file:line` throughout, each with the command
      that produced the measurement
- [x] Required gates and residual risks are recorded — `B1`-`B6` blocking, `M1`-`M8` advisory, and
      section 10 records what passed, what had no subject, and what is PENDING and why
