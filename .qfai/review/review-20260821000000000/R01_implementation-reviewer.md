# R01 — implementation-reviewer

```text
Round: 3
Result: REVISE
Reviewed revision: 1473897a
Audited evidence hash: dc63c9df7f1adff05f0b58deb50ea521610564c2999bde8bd0e22181fede2068
Authored/edited under review: none
```

`git rev-parse --short HEAD` at start: `1473897a`. `git status --porcelain`: **empty**. Rechecked at
the end of the run: `1473897a`, still empty; `git stash list` empty. Zero mutations — every experiment
ran against in-memory copies or throwaway trees under `os.tmpdir()`, driven from scripts in
`tmp/rev3/`, which is gitignored.

`Audited evidence hash` subject: the **stage review** subject of
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md:322-372` —
`.qfai/evidence/atdd-spec-0017.md` whole **minus** its `## Final status` section, plus
`.qfai/evidence/coverage-depth-spec-0017.md` whole; each normalized by step 2, serialized as
`path + NUL + sha256`, sorted by path, joined with `\n`, then SHA-256 of the record list. The excluded
extent, computed rather than assumed (`tmp/rev3/extent.mjs`): lines **558-583** of 664, heading
`## Final status (PASS/FAIL) + who confirmed`, resuming at line 584 `## Round 2, and the P7 evidence
for it` — **not** "to EOF" as in round 2, because the file has since grown a section after it. Fence
tracking ended clean, so no fenced `##` moved the boundary. Per-artifact digests:
`atdd-spec-0017.md` = `dfec517953a5ac4a475abc0cb3615d8fdbd4e566770e76518043605628e3b900`
(43748 normalized bytes); `coverage-depth-spec-0017.md` =
`a7415bbbae2cfafa0c45944a9ce7ded00a196170b3ca33b55afef2dfaa4a5c70` (22229 bytes). Computed by
`tmp/rev3/hash.mjs`, by this reviewer, on the bytes it read.

## Verdict

**REVISE.** Four blocking findings. All fifteen round-2 findings were applied and **eleven of them are
correct** — I broke at each and they held, with measurements below. Three repairs introduced a new
defect of the class this round exists to catch, and the two governance records carry four numbers that
no longer reproduce:

- the symlink loop guard added for `m5` **does not guard against a loop**, and says in a comment that
  it does;
- the v3 build predicate's recorded "0 misclassified" fails in both directions on a 58-form corpus I
  chose, including against **this repository's own build lane**;
- the matrix's new class-size cross-check is substring-based, so every stated size can be inflated
  tenfold and all four tests stay green;
- `atdd-spec-0017.md` still says the guard has ten tests, in three places, one of them a recorded
  command output; and `coverage-depth-spec-0017.md` still says the resolver step is executed twice.

## What I ran

| #   | Command / script                                                                             | Result                                                              |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | `vitest run --project integration .../checkAtddAnnotationLedger.test.ts`                     | **19/19 pass**                                                      |
| 2   | `vitest run --project e2e tests/assets/coverageDepthMatrix.test.ts`                          | 4/4 pass                                                            |
| 3   | `vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`                    | 9/9 pass                                                            |
| 4   | `node scripts/check-atdd-annotation-ledger.mjs` (repo root)                                  | exit 1, **127** unbacked of **208** — reproduces exactly            |
| 5   | `node scripts/check-atdd-annotation-ledger.mjs --spec 0017`                                  | exit 0, 8 claims backed                                             |
| 6   | `npx eslint --max-warnings 0` + `npx prettier -c` on all four changed files                  | both clean                                                          |
| 7   | `tmp/rev3/args.sh` — 16 argument forms, exit codes captured from `node`                       | m1 correct on every form                                            |
| 8   | `tmp/rev3/loop.mjs` — a self-referencing directory junction                                  | **the `seen` set deduplicated nothing; 64 levels, then ELOOP** → B1 |
| 9   | `tmp/rev3/seenhits.mjs` — `seen.has()` hits over the two real trees                          | **0 hits in 2 visits** — the guard is unreachable → B1              |
| 10  | `tmp/rev3/exit3.mjs` — a self-contained fake root, clean then looped                         | exit 0, then **exit 3** "no measurement taken"                      |
| 11  | `tmp/rev3/pred.mjs` — 58 commands, labelled by what they do                                  | **9 missed builds, 10 false positives** → B2                        |
| 12  | `tmp/rev3/pred2.mjs` — this repo's own build invocations from `ci.yml`                        | **`pnpm ci:build-verify` MISSED** → B2                              |
| 13  | `tmp/rev3/matrix.mjs` — six in-memory matrix mutations through all four tests                | **M1, M2, M3 all pass** → B3, medium M5                             |
| 14  | `tmp/rev3/us3.mjs` — 11 resolver-body mutants through the row's six assertions               | 8/8 behavioural mutants redden, control green — repair confirmed    |
| 15  | `tmp/rev3/us3.mjs` (tail) — an intermediate `false`, with and without `-e -o pipefail`        | status 1 vs 0: the flags **have teeth**                             |
| 16  | `tmp/rev3/chain.mjs` — the chain loop against four multi-job workflows                       | round 2's exact leak fixture now correct                            |
| 17  | `tmp/rev3/ratchet.mjs` — 10 ledger/source mutations through the ratchet pair                 | both round-2 directions fixed; one exception (M6)                   |
| 18  | `tmp/rev3/partition.mjs` — 9 malformed partition rows                                        | `parsePartition` fails **closed** in every case                     |
| 19  | `git ls-files -s \| awk '$1=="120000"'`, whole repo and the two scanned trees                 | **83 total, 0 under either scanned tree** → B1                      |

`pnpm ci:lint` was **not** run in full (PENDING) — it invokes `sync:ssot` and would touch tracked
files. The two members that reach these files (`eslint`, `prettier -c`) were run directly and pass.
`qfai validate` was **not** run (PENDING): it writes the tracked `.qfai/report/validate.log`, and the
gate questions it answers are `qa-gatekeeper`'s domain, not code correctness.

## Blocking findings

### B1 — the symlink loop guard does not guard against a loop, and the comment says it does

**Issue.** `scripts/check-atdd-annotation-ledger.mjs:106-113`:

```js
const seen = new Set();
for (let current = queue.pop(); current !== undefined; current = queue.pop()) {
  // A symlink loop would otherwise walk forever. This repository tracks 83 symlinks, so the
  // possibility is not theoretical here.
  const key = path.resolve(current);
  if (seen.has(key)) continue;
```

`path.resolve` normalizes a path lexically; it does **not** resolve symlinks. In a queue-driven tree
walk every directory is enqueued exactly once from its unique parent, so `seen.has(key)` cannot be true
in the benign case — and in the loop case each descent produces a NEW lexical path, so it is not true
there either. Measured (`tmp/rev3/loop.mjs`), a junction pointing back at its own parent:

```text
shipped-walk replica: { steps: 64, capped: false, maxDepth: 63, files: 64, seenSize: 64 }
sample keys: x.test.ts | loop/x.test.ts | loop/loop/x.test.ts | loop/loop/loop/x.test.ts
realpath-dedupe walk: { steps: 2, capped: false, files: 1 }
SHIPPED collectTestSources on the loop: threw Error: ELOOP: too many symbolic links encountered
```

64 visits, `seen` grew to 64, **zero hits**. The same instrument over the two real scanned trees
(`tmp/rev3/seenhits.mjs`): `{ directoryVisits: 2, seenHits: 0 }`. What actually stops the walk is the
operating system, and because `isMissing` (lines 160-167) admits only `ENOENT` / `ENOTDIR`, `ELOOP` is
rethrown. End to end, in a self-contained fake root (`tmp/rev3/exit3.mjs`):

```text
baseline (clean fake root)         exit=0  1 claim(s) backed by a test annotation (all specs)
with a symlink LOOP in tests/e2e   exit=3  internal failure, no measurement taken: Error: ELOOP...
```

The second half of the comment is also wrong. Re-derived: the repository tracks **83** symlinks and
**zero** of them are under `tests/e2e` or `packages/qfai/tests/e2e`; all 83 live under `.github/`,
`.claude/`, `.codex/`, `.agents/` and `.claude/rules/` — every one of those roots begins with a dot,
which line 139 skips by name. So the count cited to show the hazard "is not theoretical here" counts
links this walk cannot reach.

**Why.** The `m5` repair is what made directory symlinks reachable at all — before it they were
skipped, so no loop was possible. The repair introduced the hazard, and the guard written to contain it
contains nothing while asserting in prose that it does. That is the exact defect class this round was
convened for, in code added to answer a round-2 finding. The consequence is real if latent: a directory
symlink loop anywhere under either scanned tree turns the guard from a measurement into `exit 3`.

**Suggestion.** One line: dedupe on `realpath(current)` with a fallback to `path.resolve`. Measured
above: the same fixture then walks 2 steps and reads the file once. Add `ELOOP` to `isMissing` (or
rename it — it is a "not a real failure" predicate, not a "missing" one) so a pathological tree
degrades to a skip rather than to no measurement. And test the loop: the fixture is five lines on top
of the symlink test already at `checkAtddAnnotationLedger.test.ts:152`.

Severity: blocking | Traces to: defect:correctness, `principles.instructions.md` KISS (dead guard)

### B2 — the v3 build predicate misses 9 build forms and catches 10 non-builds, including this repository's own build lane

**Issue.** `spec0017LayeredCiScaffoldE2E.test.ts:419-421`, with `atdd-spec-0017.md:479-481` recording
"Measured in **both** directions this time: **21 forms caught, 14 non-builds rejected, 0
misclassified.** `mvn package` remains invisible and is named as a known limit". Measured against a
58-command corpus **I** chose, each labelled by what the command does (`tmp/rev3/pred.mjs`):
**9 missed builds, 10 false positives.** The two structural causes are in the lookaround, and neither
is named anywhere:

```text
MISSED   npm run build-storybook          <- trailing hyphen is in the LOOKAHEAD
MISSED   yarn build-storybook --quiet
MISSED   npm run build-lib
MISSED   nx run-many --target=build --all <- leading equals is in the LOOKBEHIND
MISSED   cmake --build .                  <- leading hyphen is in the LOOKBEHIND
MISSED   msbuild MySolution.sln
FALSE+   rm -rf build dist                <- a CLEAN step
FALSE+   mkdir -p build / cd build / ls -la build / if [ -d build ]; then
FALSE+   echo "::notice::build reuse is not wired yet"   <- a MESSAGE about builds
FALSE+   npx vitest run build.test.ts     <- BUILD_SCRIPT matching a TEST file name
```

And the sharpest one (`tmp/rev3/pred2.mjs`) — this repository's own workflows:

```text
CAUGHT  pnpm -C packages/qfai build     (.github/workflows/ci.yml:326)
MISSED  pnpm ci:build-verify            (.github/workflows/ci.yml:371)
```

`ci:build-verify` is `node ./scripts/check-build-warnings.mjs && pnpm verify:pack && node
./scripts/check-publish-dry-run.mjs` (root `package.json:20`) — the build-and-pack verification lane.
The predicate written to detect a lane running its own build does not detect the build lane in the
repository that ships it, because its script name has a hyphen after `build`.

Note the internal redundancy: `--output=build-artifacts`, `reports/build.xml`, `.cache/build` and
`./build` — the four forms the v3 comment cites as the overshoot it fixed — are each already excluded
by the equals, dot or slash members alone. The hyphen in the lookahead and the hyphen/equals in the
lookbehind buy only `build-essential`, and they cost `build-storybook`, `--target=build`,
`cmake --build` and `ci:build-verify`.

**Why.** Round 2's M2 required "re-measure **both** directions and record both counts". Both counts
were recorded — on a corpus the stage chose, with one limit named. The record's own text at line 464
states the standard ("on a form set this stage chose, which round 2 pointed out is not the same as
establishing the property") and then, seventeen lines later, states "0 misclassified" without it. The
false-positive class is live rather than contrived: the shipped orchestrator already carries **10
`echo` lines** (`assets/init/root/.github/workflows/qfai-tests.yml:78-239`), five of them prose lane
placeholders that the `CR-20260820-0007` reuse work will replace — and a reuse implementation that
prints a `::notice::` about reusing the build artifact, or cleans with `rm -rf build`, fails
`US-0017-0004` saying that lane "runs its own build". That is the test-that-punishes-its-own-fix shape
the file's own header declares it avoids at lines 30-34.

**Suggestion.** Two options, either acceptable.

1. *Cheap and honest:* keep the regexes and replace "0 misclassified" — in the comment and in
   `atdd-spec-0017.md:479-481` — with the two limit classes named: a hyphen or equals adjacent to the
   word hides `build-storybook`, `--target=build`, `cmake --build` and this repository's own
   `ci:build-verify`; the bare word in a non-command position (`rm -rf build`, `mkdir -p build`, an
   `echo` naming a build) reports a false build. Ten words of disclosure buys back the claim.
2. *Smaller and stronger:* anchor on the command position rather than on the word — a package-manager
   or runner verb, an optional `run` / `exec` / `dlx`, then a token beginning `build` — plus `--build`
   and `--target=build` as explicit forms. That catches all 9 misses and drops all 10 false positives
   except `npx vitest run build.test.ts`, which `BUILD_SCRIPT` should exclude for `.test.`.

Severity: blocking | Traces to: defect:code-quality, `principles.instructions.md` Fail Fast; the
record claim at `atdd-spec-0017.md:479-481`

### B3 — the matrix class-size cross-check passes with every stated size inflated tenfold

**Issue.** `coverageDepthMatrix.test.ts:174-181` is the new derivation for
`coverage-depth-spec-0017.md:139` (`Sizes, derived from the table above: **A 30, B 7, C 1 — 38
cells.**`). It uses `toContain` with a class letter and a **number** — a substring match — and it never
reads the trailing total at all. Measured, in memory, through all four tests (`tmp/rev3/matrix.mjs`):

```text
GREEN <<< PASSES  M2 stated sizes inflated 10x: 'A 300, B 70, C 10 - 380 cells'
```

`A 30` is a substring of `A 300`, `B 7` of `B 70`, `C 1` of `C 10`, and `380` is compared against
nothing. The check is one-directional too: it iterates the classes the TABLE holds, so a stated size for
a class the table does not contain is never read.

**Why.** This file's docstring, lines 6-8: "A stated total that nothing derives is a number nobody
recomputes. These tests derive it — from the table, by parsing the markdown the same way a reader
would — so the two cannot part again." The sizes line is the one number the section itself labels
"derived from the table above", it is the number round 2's `completion-reviewer` and `qa-gatekeeper`
broke three ways, and the repair for that break can be wrong by an order of magnitude in silence. The
matrix prose compounds it: `coverage-depth-spec-0017.md:154` says class B is "the same gap for all
seven cells", so the mutation leaves the document contradicting itself in words while the derivation
test stays green.

**Suggestion.** Parse the sizes line instead of substring-matching it — capture every letter/number
pair plus the trailing cell total, compare the parsed map to `sizes` with `toEqual`, and compare the
total to `members.length`. That is smaller than what is there and closes both directions.

Severity: blocking | Traces to: defect:correctness (the test's own stated purpose)

### B4 — four numbers in the two governance records no longer reproduce

**Issue.** All four are counts restated across the round-2 repair without re-derivation, which is the
class the request asked me to re-derive.

1. `.qfai/evidence/atdd-spec-0017.md:107-108` — "The script now exists as
   `scripts/check-atdd-annotation-ledger.mjs` with **ten tests** in
   `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts`". Present tense; the
   file has **19**.
2. `atdd-spec-0017.md:185`, under `## Work performed (what changed, where)` — the live artifact
   inventory — "`checkAtddAnnotationLedger.test.ts` — **10 tests**". 19.
3. `atdd-spec-0017.md:205-206`, under `## Commands executed + key outputs` — a **recorded command
   output**: the vitest invocation for that file, `-> Tests 10 passed (10), exit 0`. I ran exactly that
   command at this revision: `Tests 19 passed (19)`. A reader re-running the recorded command gets a
   different answer, which is the one property a command log exists to have. (The adjacent
   `coverageDepthMatrix.test.ts -> 4 passed` and the E2E's `9 passed` both still reproduce.)
4. `.qfai/evidence/coverage-depth-spec-0017.md:274-277` — "extracts that step's `run` body, and
   executes it under bash **twice** — once in a directory holding `.nvmrc` with `23.4.1`, once in an
   empty one — asserting the published output is the file's content in the first case, and **a
   different documented value** plus a warning in the second." The row now executes it **four** times
   across four fixture directories (`spec0017LayeredCiScaffoldE2E.test.ts:336, 346, 357, 363`) and
   asserts the exact literal `20`, not "a different documented value". Both phrases were superseded by
   the round-2 B4 repair, and the same document says so correctly twenty lines later at 294-298.

**Why.** Round 2 found `spec-0015 (2)`, a two-space seal manifest, a non-existent `Notes` column and
"four rows presented as successes". Item 3 above is the strongest form of that defect — not a stale
adjective but a recorded measurement that does not reproduce — and it sits in the section whose whole
function is to let a reader re-run and check. Note that the 19-test figure is already correct in
`review_request.md:32`, so the record is behind the request that launched this round.

The `## Round 2 ... P7 quality gates` block at lines 612-627 is **not** part of this finding: it is
explicitly labelled round 2, so its `1418` / `1171` counts are legitimately frozen history.

**Suggestion.** Re-derive the three test counts from a run at HEAD, and rewrite
`coverage-depth-spec-0017.md:274-277` to match the four executions the row now performs.

Severity: blocking | Traces to: defect:correctness (evidence accuracy)

## Required fixes

1. B1 — dedupe on `realpath`, admit `ELOOP`, correct both halves of the comment at lines 108-109, and
   test the loop case.
2. B2 — either name the two limit classes and drop "0 misclassified", or anchor the predicate on the
   command position; either way `pnpm ci:build-verify` must be accounted for.
3. B3 — parse the sizes line and `toEqual` it, including the trailing cell total.
4. B4 — re-derive the three test counts and the "twice" / "a different documented value" sentences.
5. M1 — make both silent skips visible, per this repository's own `it.skipIf` convention.
6. M2 — replace the bare `as` at `spec0017LayeredCiScaffoldE2E.test.ts:127` with narrowing.
7. M3 — cover exit 3; it is reachable and this report has a ten-line fixture for it.
8. M4 — correct the `TEST_SUFFIXES` comment: it is a strict SUBSET of the scanner's glob.
9. M5 — drop the `?? warning` default at `coverageDepthMatrix.test.ts:108` and require every row to
   have parsed all eight cells.

## Medium findings

### M1 — two silent skips, either of which passes a row green with no assertion made

**Issue.** `checkAtddAnnotationLedger.test.ts:163-169` wraps `symlink(...)` in a `try` whose `catch`
body is a bare `return`, commented "skipping beats a false failure". A bare `catch` returning from the
test body reports a **pass with zero assertions**, for every error class — `EEXIST`, `EACCES`,
`ENOSPC`, a typo in the path — not only the Windows-privilege case the comment names. Node ignores the
`"junction"` type argument off Windows, so on Linux CI this creates an ordinary symlink and the path is
dormant; the point is that if it ever fires there, the test that exists to prove the `m5` repair works
reports success having tested nothing.

The same shape at `spec0017LayeredCiScaffoldE2E.test.ts:337` (`if (pinned.skipped) return;`): on a host
without `bash` the whole `US-0017-0003` behavioural row — the six assertions `E6`-`E11`, the record's
headline claim for that story — passes green with only the two `toBeDefined` checks made, silently.
`ci.yml:222` carries a TODO to add `windows-latest`, which is when that becomes live.

**Why.** This repository already has the visible idiom: `it.skipIf(process.platform === "win32")`
appears 10+ times in `tests/cli/initRepairRollback.test.ts:655, 696, 796` and
`tests/core/integrationSurface.test.ts:1023-1491`. A skipped test is reported as skipped; an
early-returning test is reported as passed.

**Suggestion.** For the symlink test: probe once outside the test and gate with `it.skipIf`, or rethrow
anything whose `code` is not `EPERM` / `EACCES`. For the E2E: `it.skipIf(bashMissing)`, or keep the
ENOENT branch but assert the platform on it so a Linux skip is a failure rather than a pass.

Severity: blocking-adjacent, filed as required | Traces to: defect:code-quality

### M2 — the M5 repair introduced the only bare `as` assertion in the four files

**Issue.** `spec0017LayeredCiScaffoldE2E.test.ts:127` asserts `child.error` to
`NodeJS.ErrnoException` to read `.code`. CLAUDE.md, Project Rules: "TypeScript: avoid bare `as` type
assertions; prefer type narrowing." My round-2 report certified that none of the four files contained
one; this arrived with the M5 / m7 repair. `eslint --max-warnings 0` does not catch it, so the rule is
the only thing standing.

**Why.** The compliant idiom is **in the same change**, 100 lines away and for the same purpose:
`check-atdd-annotation-ledger.mjs:160-167` narrows with `typeof` plus `in` and no assertion, which
round 2 praised by name. Two idioms for one operation inside one changeset is the state where a reader
cannot tell which is the convention.

**Suggestion.** `if ("code" in child.error && child.error.code === "ENOENT")`. No assertion, and it is
shorter. (`tests/core/specLayoutCaseExact.test.ts:107` is the same violation and is pre-existing — out
of scope here, worth a follow-up.)

Severity: blocking-adjacent, filed as required | Traces to: CLAUDE.md TypeScript rule

### M3 — exit 3, the whole of the `m2` repair, has no test

**Issue.** The six new CLI tests (`checkAtddAnnotationLedger.test.ts:200-295`) cover exit 0 (twice),
exit 1, exit 2 (eight argument forms) and the no-ledger exit-0 path. **Exit 3 is uncovered** — no test
asserts the code, and none asserts the "internal failure, no measurement taken" message that is the
point of separating it from exit 1. CLAUDE.md: "All source changes must have corresponding test
coverage."

**Why / how.** It is reachable and I reached it (`tmp/rev3/exit3.mjs`), using the same
copy-the-script-into-a-temp-root fixture the no-ledger test at line 279 already builds: add a symlink
loop under `tests/e2e` and the guard exits 3. That is roughly ten lines, and it would have caught B1 as
well — which is the argument for it. A crash-versus-finding distinction that nothing exercises is a
distinction that regresses to exit 1 the next time someone touches the catch.

Severity: blocking-adjacent, filed as required | Traces to: CLAUDE.md test-coverage rule

### M4 — the `TEST_SUFFIXES` comment states the divergence backwards

**Issue.** `check-atdd-annotation-ledger.mjs:55` — "Deliberately broader than the scanner's own
`DEFAULT_TEST_FILE_GLOB`, and narrower than 'any file'". Re-derived:

```text
scanner (atddTraceability.ts:60): ts tsx js jsx mjs cjs mts cts feature md markdown
guard   (line 61):               ts tsx js     mjs cjs mts cts
scanner minus guard = { jsx, feature, md, markdown }      guard minus scanner = { }
```

It is a strict **subset**. It is broader in nothing. The comment then justifies excluding `.md` (which
is correct and load-bearing — otherwise the ledger backs itself) and `.feature` with the same reason,
"a markdown file naming an annotation is a ledger or a document, not a test", which is not true of
`.feature`, a Gherkin file the scanner treats as a test carrier. `.jsx` is dropped with no mention at
all. Both omissions fail **closed** (the guard over-reports an unbacked claim), so there is no exploit;
the defect is that round 2's `m4` asked for the divergence to be documented and the documentation
inverts it.

**Suggestion.** "A strict subset of the scanner's glob. `.md` and `.markdown` are excluded because the
ledger is markdown and would otherwise back itself — that exclusion is load-bearing and is pinned by
the `notes.md` case below. `.feature` and `.jsx` are excluded for now: a claim backed only in one
over-reports as unbacked, which is the safe direction."

Severity: advisory | Traces to: defect:code-quality

### M5 — the warning-level fallthrough round 2 removed from `parseMatrix` survives one function over

**Issue.** `coverageDepthMatrix.test.ts:108` tallies `row.cells["Status"] ?? "⚠️"`. Now that
`parseMatrix` throws on an unrecognized glyph (lines 69-71 — a correct repair), the only way
`cells["Status"]` is undefined is a row that parsed **fewer than eight cells**, and nothing requires
eight except test 4, and only for `US-0017-0007`. So a short row silently becomes the middle score and
its remaining scores shift one column left. Measured (`tmp/rev3/matrix.mjs`):

```text
GREEN <<< PASSES  M3 US-0017-0002 loses its Status cell + totals restated as 2/2/5
RED               M4 (control) same truncation, totals untouched
```

Two coordinated edits, so weaker than B3 — but the fix removes an expression that has no legitimate use
left.

**Suggestion.** In `parseMatrix`, after the `forEach`, throw unless the cell count equals
`COLUMNS.length`, naming the row. Then line 108 loses the `??` and test 4's floor at lines 208-211
becomes redundant rather than special-cased for one row.

Severity: advisory | Traces to: `principles.instructions.md` Fail Fast

### M6 — the ratchet's stated property has one measured exception, and its companion pin punishes a correct change

**Issue.** `checkAtddAnnotationLedger.test.ts:328` and `atdd-spec-0017.md:523`: "`toBeLessThanOrEqual`
fires on a NEW unbacked claim and stays green all the way down to zero." Measured
(`tmp/rev3/ratchet.mjs`), the pair `checked === 208` plus `unbacked <= 127`:

```text
GREEN  checked=208  unbacked=127  BASELINE
RED    checked=208  unbacked=208  the guard goes BLIND (no sources at all)
RED    checked=268  unbacked=187  60 MORE unbacked claims appended
GREEN  checked=208  unbacked=100  27 existing unbacked claims BACKFILLED
GREEN  checked=208  unbacked=0    ALL 127 backfilled (the CR's Option 1, completed)
RED    checked=209  unbacked=128  one NEW unbacked claim appended
RED    checked=209  unbacked=127  one new BACKED claim + its test (a LEGITIMATE new E2E story)
GREEN  checked=208  unbacked=127  SWAP: one unbacked claim deleted, one new unbacked claim added
```

Both directions round 2 broke are fixed, and that is the substance of the repair. Two residuals: a new
unbacked claim that arrives WITH a deletion is invisible, so "fires on a NEW unbacked claim" has an
exception; and a correct new E2E story with a real test and its ledger line **reddens** on
`checked === 208` with no comment telling the author it is a deliberate-update pin — the `unbacked`
assertion got that sentence (lines 335-337) and the `checked` one at line 332 says only "for context".

**Suggestion.** Give line 332 the same deliberate-update sentence, and say the swap case out loud (or
pin `wide.unbacked.length` exactly and accept the same maintenance shape as `checked`). Correct
`atdd-spec-0017.md:523` to "fires when the count rises, and `checked` fires when the ledger grows".

Severity: advisory | Traces to: defect:code-quality

## Low / nit findings

- **m1** `main()` is **83 lines** (169-251) against CLAUDE.md's "extract when a function exceeds ~50
  lines"; `collectTestSources` is 53. The `m1` repair added the 30-line argument block. Extracting a
  `parseArgs(argv)` would also let the sixteen argument forms be unit-tested instead of spawned — the
  two argument tests currently cost 309 ms and 330 ms of the file's 1397 ms because they spawn `node`
  eight times between them.
- **m2** a repeated `--spec` silently last-wins: `--spec 0017 --spec 0012` runs spec-0012 (exit 1).
  Given the repair's stated principle — "Every argument is now accounted for" — a duplicate is the one
  unaccounted form. Traces to: `principles.instructions.md` Principle of Least Astonishment.
- **m3** `--help` exits 2 as an "unknown argument". The usage string is printed, so it is usable, but
  exit 2 for `--help` is unconventional.
- **m4** `unbacked.sort` uses `localeCompare` (line 92), making the reported order ICU-locale
  dependent. For a 127-line CI diff, a stable comparison is what you want.
- **m5** `coverageDepthMatrix.test.ts:216` — the `/withdrawn/i` check is still file-wide. Round 2's M3
  asked for two things and one landed (the eight-column floor at 208-211, which is correct and which I
  verified reddens). Measured: the word occurs twice, and renaming both does redden, so it is not
  vacuous — but it is satisfied by the word anywhere in 310 lines rather than by the `US-0017-0007`
  section.
- **m6** the matrix membership check verifies the partition's **shape**, not its **attribution**.
  Measured: moving `US-0017-0001 / Boundary values` from class C to class B and restating the sizes
  passes all four tests, while `coverage-depth-spec-0017.md:161` still names that exact cell as class
  C's sole member. I am **not** filing this as a fix — prose attribution is not machine-checkable and
  the repair is a genuine advance over sizes-only. Recorded as the honest bound of what the membership
  check establishes, since the request asked.
- **m7** the E2E chain loop validates only the **first** resolver it finds (`break` at line 301). In a
  workflow where two jobs each resolve a version, a broken second resolver is invisible — measured
  (`tmp/rev3/chain.mjs` case D). The `break` is what my round-2 B3 asked for and I stand by it; the
  bound is worth one sentence in the comment, since the same comment cites the eight-job orchestrator
  as the reason the scoping matters.
- **m8** `runStep`'s `finally` and the fixture teardown loop (`spec0017...:383`) both `await rm` in
  sequence, so a throw on the first directory leaks the rest and masks the original error.
  `force: true` makes it unlikely. Same shape at `checkAtddAnnotationLedger.test.ts:49`.
- **m9** removing `tr -d '[:space:]'` from the shipped resolver is **invisible** to the row (measured,
  `tmp/rev3/us3.mjs` N10: GREEN) — a `.nvmrc` with a trailing CR would publish a dirty version to
  `setup-node`. This is **honestly disclosed**: it is exactly what
  `coverage-depth-spec-0017.md:300-301` keeps `Boundary values` / `Special values` at warning level
  for. Noted because the fixture machinery to close it now exists and it is four lines, not because
  the record is wrong.

## What I confirmed rather than faulted

Eleven of the fifteen round-2 findings were applied correctly. I attacked each and it held.

1. **B1, the annotation regex.** `check-atdd-annotation-ledger.mjs:50` is the SSOT form from
   `atddTraceability.ts:27`, character for character apart from the deliberate capture-group split. All
   three fail-open forms are closed **and tested** at lines 105-140. Re-derived: the ledger holds **208
   claims, all full-form, zero short-form**, so accepting the short form costs nothing and closes the
   hole, as suggested. The guard test file now backs **0** claims if the scan ever reaches it
   (measured) — `m6` correctly applied; the one remaining literal at line 145 is the near-miss probe,
   which by construction is not an annotation.
2. **B2, the root.** Resolved from `import.meta.url` (line 211), the sibling convention. Verified live
   from the repo root, from `packages/qfai/`, and from an unrelated temp directory: identical output,
   exit 0. The reassuring-sentence-and-exit-0 path now requires a genuinely absent `tests/e2e`, and the
   test at line 279 builds a tree to prove it.
3. **m1, the argument loop — correct on every form.** Measured (`tmp/rev3/args.sh`), exit codes captured
   from `node` rather than from a pipeline:

   ```text
   --spec 0017         0 (8 claims, spec-0017)    --spce 0017         2 (unknown argument)
   --spec=0017         0 (byte-identical output)  0017                2 (unknown argument)
   --spec              2 (four-digit)             --spec 0017 extra   2 (unknown argument)
   --spec=             2 (four-digit)             --help              2 (unknown argument)
   --spec 17           2 (four-digit)             --spec --spec       2 (four-digit)
   --spec abcd / 00017 2 (four-digit)             (no arguments)      1 (repo-wide finding)
   ```
4. **m2, exit 3 — reachable and correctly separated.** Measured end to end in a fake root: exit 0 clean,
   exit 3 on an internal failure, with the "no measurement taken" wording. The three-way split (2 usage
   / 1 finding / 3 crash) is strictly better than `check-scanner-coverage.mjs`'s two.
5. **m3.** The unreachable `break` is gone, replaced by a `for` whose condition is the same test —
   smaller, not larger.
6. **m5, the directory-symlink half.** `stat` is the **right** call: `readdir withFileTypes` gives lstat
   semantics, so `entry.isSymbolicLink()` correctly identifies the link and `stat(full)` follows it to
   learn the target's kind. `lstat` would report the symlink again and answer nothing; `realpath` is
   what the LOOP half needs (B1) but not what the kind test needs. The dangling-link branch (lines
   132-136) is correct. Verified live: the junction test really executes on this Windows host —
   `tmp/rev3/loop.mjs` created one successfully — so the test is not silently skipping here.
7. **B3, the chain loop.** Round 2's exact leak fixture now returns the real resolver, and three further
   shapes are right (`tmp/rev3/chain.mjs`):

   ```text
   A later job reusing the id, no setup-node    -> "THE REAL RESOLVER"  (was the unrelated step)
   B resolver only in the SECOND job            -> "SECOND JOB RESOLVER"
   C job A references a step that doesn't exist -> falls through to job B, resolverId NOT set from A
   D two resolvers, second broken               -> validates the first only (m7)
   ```
8. **B4 and M6, the `US-0017-0003` row — strong, and the two new assertions earn their place.** Eleven
   mutants of the shipped resolver body through the row's six assertions (`tmp/rev3/us3.mjs`):

   ```text
   R0  unmodified                                   GREEN
   N1  probe order REVERSED                         RED -> E8 precedence        <- NEW this round
   N2  .node-version dropped from the probe list    RED -> E7 second.version    <- NEW this round
   N3  fallback 20 -> 22                            RED -> E10 fallback.version
   N4  fallback published to stdout                 RED -> E10
   N5  warning annotation removed                   RED -> E11
   N6  fail CLOSED with no version file             RED -> E9, E10
   N7  probe loop deleted                           RED -> E6, E7, E8
   N8  resolved value hardcoded to the fallback     RED -> E6, E7, E8
   N9  COMMENT-ONLY control                         GREEN, correct
   N10 whitespace strip removed                     GREEN  (disclosed as warning-level, m9)
   ```

   Round 2's B4 is genuinely closed: deleting `.node-version` from the shipped probe list, which was
   invisible before, now reddens, and so does reversing the precedence. The fallback literal `20`
   matches `packages/qfai/package.json:33` `"node": ">=20.19.0"`, so the "documented fallback" claim is
   accurate. `coverage-depth-spec-0017.md:300-301` — "the two probe candidates and the fail-open
   default are exercised, a blank or whitespace-only file is not" — is now **true**, which was the
   whole of B4.
9. **M5, the shell flags have teeth.** `bash -e -o pipefail` is not cosmetic: with an intermediate
   `false` planted in the resolver and no version file present, `{status: 1, published: ""}` with the
   flags versus `{status: 0, published: "version=20"}` without them. The row is now sensitive to a
   regression class it was blind to, and the comment at lines 113-118 describes it accurately.
10. **M3's floor, and `parsePartition`.** The eight-column floor at lines 208-211 is present and
    correct. `parsePartition`'s row regex is sound and **fails closed** in every malformed shape I
    probed (`tmp/rev3/partition.mjs`): a two-letter or lowercase class letter is skipped (dropping its
    members, which reddens `unclaimed`), an empty columns cell yields zero members, a four-column row
    folds the extra into a phantom member, and both the header row and the main matrix's own rows are
    correctly not matched.
11. **The matrix's own arithmetic, re-derived rather than restated.** 9 rows;
    `Totals by Status: 3 / 1 / 5`; `38 depth cells failing, plus 5 in Status`; partition
    `A 30, B 7, C 1 = 38`, complete, disjoint, no non-failing member. All correct at HEAD. The
    two-code-point warning glyph handling and the throw-on-unrecognized repair both work as documented.
12. **The 127.** Reproduced exactly, exit 1, 127 of 208. A fail-open regex regression is invisible to the
    ratchet (the pre-B1 loose form yields the same 208/127 today) but is caught by the dedicated test at
    lines 105-140, which is the right place for it.
13. **Repository rules.** `eslint --max-warnings 0` and `prettier -c` clean on all four files. Every
    async path has explicit handling: `collectTestSources` narrows and rethrows, `main()` is wrapped in
    `.catch`, `runStep` uses `try/finally`, `exists()` catches, and the fixture registry (the m8 repair)
    registers each directory inside the `try` before it can leak. One bare `as` (M2) and one
    over-length function (m1) are the exceptions.

## Residual risks and gates

- **PENDING** — `pnpm ci:lint` in full, and `qfai validate`. Both write tracked artifacts or run
  `sync:ssot`; out of scope for a read-only pass. The two `ci:lint` members that reach these files were
  run directly and pass. `.qfai/evidence/*[0-9]*.md` is outside both `.prettierignore` and
  `.markdownlint-cli2.jsonc`, so the two records are not covered by `lint:md` / `format:check` either
  way.
- **PENDING** — behaviour on a non-Windows host. Everything above ran on `win32` with Git Bash. The four
  `spawnSync("bash")` helpers and the junction test are the platform-sensitive surface; M1 is about what
  happens when one of them cannot run there.
- **Residual** — the guard is still not wired into `ci:lint`, so B1's exit-3 path and B2's predicate gap
  are latent rather than active. That is `CR-20260820-0011`'s work by the stage's own account.
- **Residual** — B2 option 1 (disclose the limits) leaves the false-positive class live for the
  `CR-20260820-0007` reuse work, which should expect to revisit this predicate.
- **Out of my domain, flagged for routing** — request items 3 (`TDD-0069`'s `blocked` re-classification
  and whether `CR-20260820-0012` is a real unresolved Change Request) and 4 (`CR-20260820-0012` option
  1's reading of `BR-0017-0053`) are process and obligation questions for `completion-reviewer` /
  `qa-gatekeeper`. I read `.qfai/specs/spec-0017/tdd/test-list.md` and `atdd-spec-0017.md:278-356` only
  far enough to identify my audit subject and compute the hash above. Item 5 I answered for the numbers
  a code reviewer can re-derive: B4.

## Evidence checked

- `scripts/check-atdd-annotation-ledger.mjs` (whole), against `scripts/check-publish-dry-run.mjs`,
  `check-scanner-coverage.mjs`, `check-not-a-dependency.mjs`
- `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` (whole)
- `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (whole)
- `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (whole)
- `packages/qfai/src/core/atddTraceability.ts:20-70` — `US_TEST_ANNOTATION_RE` and
  `DEFAULT_TEST_FILE_GLOB`
- `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml:105-155` — the resolver under
  test; `.../qfai-tests.yml:69-239` — the ten `echo` bodies
- `.github/workflows/ci.yml:321-373`, root `package.json:16-20`, `packages/qfai/package.json:32-36`
- `tests/e2e/qfai-traceability.md` — 208 claims, all full-form
- `packages/qfai/tests/cli/initRepairRollback.test.ts:655-796`,
  `tests/core/integrationSurface.test.ts:1023-1491` — the `it.skipIf` convention;
  `tests/core/specLayoutCaseExact.test.ts:107` — the pre-existing `as`
- `.qfai/evidence/coverage-depth-spec-0017.md` (whole), `.qfai/evidence/atdd-spec-0017.md` (whole)
- `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:265-424` — the hash procedure
- `.github/instructions/principles.instructions.md`,
  `.github/instructions/code-review.instructions.md`, `CLAUDE.md`
- Scratch: `tmp/rev3/` — `loop`, `seenhits`, `exit3`, `args.sh`, `pred`, `pred2`, `matrix`, `us3`,
  `chain`, `ratchet`, `partition`, `hash`, `extent`. All read-only against the repository; every
  mutation applied to an in-memory copy or to a throwaway tree under `os.tmpdir()`.
