# R01 — implementation-reviewer

```text
Round: 2
Result: REVISE
Reviewed revision: 56daee8d
Audited evidence hash: 8f55d306a4ee1554887a1b1114225a22ab89dfabf8cbb15960f86856f8b8db42
Authored/edited under review: none
```

`git rev-parse --short HEAD` at start: `56daee8d`. `git status --porcelain`: **empty**. Rechecked at
the end of the run: `56daee8d`, still empty. Zero mutations; every experiment ran against in-memory
copies driven from scripts under `tmp/rev2/`, which is gitignored.

`Audited evidence hash` subject: the **stage review** subject of
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md:322-372` —
`.qfai/evidence/atdd-spec-0017.md` whole minus its `## Final status` section (line 480 to EOF), plus
`.qfai/evidence/coverage-depth-spec-0017.md` whole; each normalized by step 2, serialized as
`path + NUL + sha256`, sorted by path, joined with `\n`, then SHA-256 of the record list. Per-artifact
digests: `atdd-spec-0017.md` = `c4fdfb13e11b5646c93fe303fa36176040c551998e42d476ffb1260f729f0301`
(32073 normalized bytes); `coverage-depth-spec-0017.md` =
`cc000b54d0e8fb20cdcb7d103137979e2887c823ab2bea83fa8e6a3f3c0093ea` (18731 bytes). Computed by
`tmp/rev2/hash.mjs`, by this reviewer, on the bytes it read.

## Verdict

**REVISE.** Four blocking findings. The two claims this round asked me to break — the `US-0017-0003`
behavioural assertion and `coverageDepthMatrix.test.ts` — are **not** vacuous, and I say so with
measurements below. The `127` figure reproduces exactly. What fails is elsewhere: the new guard's
annotation regex admits a false backing, the guard passes silently from any cwd but the repo root, the
chain-resolution loop leaks state across jobs, and the matrix's `⚠️` justification for `US-0017-0003`
describes an assertion the E2E does not make.

## What I ran

| #   | Command                                                                                            | Result                                                                       |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | `node scripts/check-atdd-annotation-ledger.mjs` (repo root)                                        | exit 1, **127** unbacked of **208** — reproduces the stage's number exactly   |
| 2   | `npx vitest run --project integration tests/integration/scripts/checkAtddAnnotationLedger.test.ts` | 10/10 pass                                                                   |
| 3   | `npx vitest run --project e2e tests/assets/coverageDepthMatrix.test.ts`                            | 4/4 pass                                                                     |
| 4   | `npx vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`                      | 9/9 pass                                                                     |
| 5   | `npx eslint` + `npx prettier -c` on all four changed files                                          | both clean, `--max-warnings 0`                                               |
| 6   | `tmp/rev2/bounds.mjs`                                                                              | the repo-wide bounds under six ledger/source mutations                       |
| 7   | `tmp/rev2/us3.mjs`                                                                                 | the `US-0017-0003` oracle under 6 resolver-body mutations, and under `-e -o pipefail` |
| 8   | `tmp/rev2/matrix.mjs`                                                                              | `parseMatrix` under 3 malformed-table mutations                              |
| 9   | `tmp/rev2/predicates.mjs`                                                                          | `RUNNER`/`BUNDLER` against 13 realistic adopter commands                     |
| 10  | `tmp/rev2/chain.mjs`                                                                               | the chain-resolution loop against a two-job workflow                         |
| 11  | `tmp/rev2/regex.mjs`                                                                               | `ANNOTATION` against the SSOT `US_TEST_ANNOTATION_RE`                        |
| 12  | CLI matrix: `--spec 0017`, `--spec`, `--spec 17`, `--spec=0017`, `--spce 0017`, and from `packages/qfai/` cwd | see B2 / m1                                                        |

`pnpm ci:lint` was **not** run in full (PENDING) — it invokes `sync:ssot` and would touch tracked
files. The two members that reach these files (`eslint`, `prettier -c`) were run directly and pass.
`.qfai/evidence/*[0-9]*.md` is ignored by both `.prettierignore` and `.markdownlint-cli2.jsonc:53`, so
the matrix file is outside `lint:md` and `format:check`; the near-miss heading at
`coverage-depth-spec-0017.md:233` (a `###` with no preceding blank line) is therefore not a gate
failure.

## Blocking findings

### B1 — the guard's annotation regex admits a false backing

**Issue.** `scripts/check-atdd-annotation-ledger.mjs:32` is `/QFAI:SPEC-(\d{4}):(US-\d{4}-\d{4})/g` —
no right boundary. A typo'd annotation in a test file therefore backs a claim it does not name.
Measured (`tmp/rev2/regex.mjs`):

```text
QFAI:SPEC-0017:US-0017-00017   guard=["QFAI:SPEC-0017:US-0017-0001"]  scanner=["QFAI:SPEC-0017:US-0017"]
XQFAI:SPEC-0017:US-0017-0001   guard=["QFAI:SPEC-0017:US-0017-0001"]  scanner=[]
QFAI:SPEC-0017:US-0017         guard=[]                              scanner=["QFAI:SPEC-0017:US-0017"]

checkLedger("- QFAI:SPEC-0017:US-0017-0001\n",
            Map{"a.test.ts" => "// QFAI:SPEC-0017:US-0017-00017\n"})
  ->  ok = true, unbacked = []
```

The SSOT is `US_TEST_ANNOTATION_RE` at `packages/qfai/src/core/atddTraceability.ts:27`:
`/\bQFAI:SPEC-(\d{4}):US-(\d{4}(?:-\d{4})?)\b/g`. Three divergences, all failing **open**: a five-digit
tail is truncated into a real claim and marks it backed; a glued prefix counts; and the short form
`US-NNNN`, which the scanner accepts, is invisible in both directions (`checked = 0`, `ok = true`) for
a claim `QFAI-ATDD-111` genuinely reads.

**Why.** The guard's entire stated purpose (file docstring, lines 6-15) is to close the direction where
"an appended line with nothing behind it reads as covered". A regex that lets a mangled token in a test
file discharge a real claim reintroduces exactly that, inside the instrument built to detect it. It
also means the reported `127` is a floor rather than a measurement.

**Suggestion.** Use the SSOT regex verbatim, or import it. Minimum:
`/\bQFAI:SPEC-(\d{4}):(US-\d{4}(?:-\d{4})?)\b/g`, and decide explicitly what the short form means here
— the ledger has zero short-form entries today, so accepting it costs nothing and closes the hole. Add
the three probe strings above as test cases.

Severity: blocking | Traces to: defect:correctness

### B2 — the guard passes silently from any cwd but the repo root, and `main()` has no tests

**Issue.** `check-atdd-annotation-ledger.mjs:132` takes the root from `process.cwd()`, and lines 138-143
answer a missing ledger with a friendly stdout line and **exit 0**. Measured:

```text
$ cd packages/qfai && node ../../scripts/check-atdd-annotation-ledger.mjs
check-atdd-annotation-ledger: no ledger at tests/e2e — nothing to check
exit=0
```

Every sibling root script resolves its root from the module URL, not the cwd:
`check-publish-dry-run.mjs:74` (`path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..")`),
`check-workflow-hygiene.mjs:609`, `check-scanner-coverage.mjs:43`,
`check-review-profile-consistency.mjs:25`. The script under review is the only one that does not.

Compounding it: the 10 tests cover `checkLedger` and `collectTestSources` only. **`main()` has zero
coverage** — not the root resolution, not the argument parsing, not the missing-ledger branch, not any
exit code. CLAUDE.md: "All source changes must have corresponding test coverage."

**Why.** The docstring and `CR-20260820-0011` both propose this as a `ci:lint` member. `ci:lint` runs
from the repo root today, so the defect is latent — but a guard whose failure mode is "print a
reassuring sentence and exit 0" is the same fail-open shape as the gate it was written to compensate
for. It cannot distinguish "this repository has no ledger" from "I was invoked from the wrong
directory".

**Suggestion.** Resolve the root from `import.meta.url` like the siblings, and keep the exit-0
no-ledger path only for a genuinely absent `tests/e2e`. Add `main()` tests — spawn it with a `cwd` and
assert exit code and stream content for: clean ledger, unbacked claim, absent ledger, `--spec` valid,
`--spec` malformed.

Severity: blocking | Traces to: defect:correctness, CLAUDE.md test-coverage rule

### B3 — the chain-resolution loop leaks `resolverId` / `resolverBody` across jobs

**Issue.** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:252-273`. Both variables are
declared **outside** `for (const job of Object.values(map))` and never reset per job. Scan A sets
`resolverId` from a `setup-node` step; scan B searches the same job for that id — which is correct for
GitHub Actions, since `steps.<id>.outputs` is job-scoped, and I confirmed that half is right. But
because neither variable is scoped to the iteration, a later job carrying a step with the same `id` and
no `setup-node` of its own overwrites `resolverBody`. Measured (`tmp/rev2/chain.mjs`, the loop copied
verbatim, against a two-job fixture):

```text
two jobs, later job reuses the id
  -> resolverId   = "node-version"
  -> resolverBody = 'echo "AN UNRELATED STEP THAT REUSES THE ID - resolves nothing"'
```

The test then extracts and executes the wrong step body and asserts against it — and the assertions are
`expect.soft`, so it reports a resolver failure rather than a wiring failure. A second probe confirmed
the benign direction: a later job pinning a literal `node-version` does not clobber a correctly
resolved body, because scan A skips it.

**Why.** `qfai-validate.yml` has one job today, so this is latent. The loop iterates all jobs precisely
because it means to be robust to more than one; the sibling orchestrator already carries eight, and the
spec's own direction is to fold the validate work into it. The bug sits in the code whose whole point is
"find the resolver through the CHAIN rather than by guessing its name" — a leaked id is guessing with
extra steps.

**Suggestion.** Move both declarations inside the job loop, break once a resolver is found, and hoist
the result out. Per-job scope plus an early exit is smaller than what is there now, not larger.

Severity: blocking | Traces to: defect:correctness

### B4 — the matrix's warning-level justification for `US-0017-0003` describes an assertion the E2E does not make

**Issue.** `.qfai/evidence/coverage-depth-spec-0017.md:260-261` reads: "`Boundary values` and
`Special values` stay warning-level: **the two probe candidates** and the fail-open default are
exercised, a blank or whitespace-only file is not."

The E2E writes **only** `.nvmrc` (`spec0017LayeredCiScaffoldE2E.test.ts:290`). `.node-version` is never
created in either fixture directory. Measured (`tmp/rev2/us3b.mjs`): deleting `.node-version` from the
shipped probe list is **invisible** to this row — no assertion moves. Line 17 of the same matrix
declares "Every cell below is scored against **that** surface", the `qfai init` E2E surface, so the
statement is false about the surface it is scoring.

**Why.** Round 1's finding against this exact row was a stated reason that was false. The repair
replaced it with another stated reason that is false, in the adjacent cell, in the same paragraph.
`coverageDepthMatrix.test.ts` cannot catch it: it pins counts and headings, never justification content.
And the two probe candidates *are* both exercised — at
`packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:249-268`, in the integration lane,
which this matrix says at line 101 it does not score.

**Suggestion.** Either write the `.node-version` case into the E2E row (one more fixture dir, four
lines; the both-present precedence case is nearly free), or correct the sentence to "one probe candidate
and the fail-open default are exercised; `.node-version` and the both-present precedence are asserted at
the integration layer and scored there".

Severity: blocking | Traces to: defect:correctness

## Required fixes

1. B1 — align `ANNOTATION` with `atddTraceability.ts:27`, with the three probe strings as tests.
2. B2 — resolve the root from `import.meta.url`; add `main()` coverage for exit codes and the
   no-ledger path.
3. B3 — scope `resolverId` / `resolverBody` per job.
4. B4 — correct the `US-0017-0003` warning-level justification, or write the assertion it claims.
5. M1 — replace the two repo-wide bounds with exact values, or delete the "cannot drift" claim.
6. M2 — bound the `RUNNER` / `BUNDLER` false-positive side and strip trailing comments.
7. M3 — give `coverageDepthMatrix.test.ts` test 4 a floor so an empty cell map cannot pass it.

## Medium findings

### M1 — "pinned so the number cannot drift silently in either direction" is false

**Issue.** `checkAtddAnnotationLedger.test.ts:145-155`. Measured (`tmp/rev2/bounds.mjs`):

```text
BASELINE                  checked=208 (>=200 true)  unbacked=127 (>100 true)
guard blind (no sources)  checked=208 (>=200 true)  unbacked=208 (>100 true)   <- PASSES
all annotations stripped  checked=208 (>=200 true)  unbacked=208 (>100 true)   <- PASSES
+100 bogus claims         checked=308 (>=200 true)  unbacked=227 (>100 true)   <- PASSES
26 unbacked claims fixed  checked=182 (>=200 FALSE) unbacked=101 (>100 true)
```

Both bounds are one-sided. Upward drift is unbounded in both metrics; downward drift only trips after a
26-claim margin, and then via `checked`, not via `unbacked`. With `sources` empty — the guard completely
blind — both bounds pass. The only thing that reddens that case is the **scoped** assertion earlier in
the same `it` (line 138). So the wide bounds contribute nothing the scoped assertions do not already
contribute, while the comment claims they pin the `CR-20260820-0011` number.

**Why.** This is the same shape as the findings this round exists to close: a comment asserting
discriminating power the code does not have. It matters more than usual because the number is the sole
quantitative claim in a filed Change Request.

**Suggestion.** `expect(wide.checked).toBe(208)` and `expect(wide.unbacked.length).toBe(127)`, with the
comment saying that a change to either is a deliberate update to `CR-20260820-0011`. If exact pinning is
judged too brittle, keep the bounds and delete the sentence.

Severity: blocking-adjacent, filed as required | Traces to: defect:code-quality

### M2 — the widened build predicates false-positive on 7 of 13 realistic adopter commands

**Issue.** `spec0017LayeredCiScaffoldE2E.test.ts:346-347`. Measured (`tmp/rev2/predicates.mjs`):

```text
FALSE POSITIVE  BUNDLER  "npx tsc --noEmit"
FALSE POSITIVE  BUNDLER  "pnpm check-types   # runs tsc -b"
FALSE POSITIVE  RUNNER   "npm ci --ignore-scripts # build deps are prebuilt"
FALSE POSITIVE  RUNNER   "pnpm exec eslint . --cache-location .cache/build"
FALSE POSITIVE  RUNNER   "npm test -- --reporter=junit --outputFile reports/build.xml"
FALSE POSITIVE  RUNNER   "npx playwright test --output=build-artifacts"
FALSE POSITIVE  RUNNER   "yarn dlx license-checker --start ./build"
ok                       "pnpm run build" / "npx tsup" / "pnpm vitest run --project e2e" / "npm run lint:md"
```

Two of these are the common case, not the contrived one. `npx tsc --noEmit` is a **type check**, not a
build — this repository's own `check-types` is `tsc -b` (root `package.json:26`) — so the day the shipped
orchestrator wires a typecheck lane, `US-0017-0004` fails saying that lane "runs its own build". And the
comment-stripping at lines 358-360 removes only lines whose **first** non-space character is a hash, so
every trailing comment is still scanned as a command.

**Why.** Round 1 measured the false-**negative** side (8 idiomatic forms invisible) and the repair
widened until 10 of 10 reddened. Nobody measured the other side, so the fix overshot into the
anti-pattern the same file declares it avoids at lines 30-34: "a test pinning [an absence] would fail
the day someone correctly adds one — a test that punishes its own fix". The matrix reports the 10-of-10
at lines 164-165 and reports no false-positive measurement at all.

**Suggestion.** Strip trailing comments as well. Anchor `RUNNER` on the script position rather than
anywhere on the line — a package-manager verb followed by an optional `run` / `exec` / `dlx` and then
`build`, rather than a package manager plus `build` anywhere after it. Drop `tsc` from `BUNDLER`, or
exclude the `--noEmit` / `-b`-only forms, and say why. Then re-measure **both** directions and record
both counts.

Severity: blocking-adjacent, filed as required | Traces to: defect:code-quality, `principles.instructions.md` Fail Fast

### M3 — `coverageDepthMatrix.test.ts` test 4 has no floor

**Issue.** Lines 141-162. `Object.values(row?.cells ?? {}).every((s) => s === "❌")` returns **true** for
an empty cell map, and `expect(text).toMatch(/withdrawn/i)` matches the word anywhere in a 269-line
file. Measured (`tmp/rev2/matrix.mjs`), with the `US-0017-0007` row truncated to `| US-0017-0007 |`:

```text
test4 probe: row defined? true | cells = {} | every(=== failing) = true | /withdrawn/i = true
```

Every assertion in the test passes. Test 1 *would* redden on that particular mutation via the tally, but
that is a different test — within test 4 the claim "a story no test covers cannot score above the
failing mark in any column" has no lower bound.

**Suggestion.** One line: assert the cell values equal an array of `COLUMNS.length` failing marks rather
than asserting `every`, and scope the `withdrawn` check to the `US-0017-0007` justification section
rather than the whole file.

Severity: blocking-adjacent, filed as required | Traces to: defect:code-quality

### M4 — `parseMatrix` classifies every unrecognized cell as warning-level instead of failing

**Issue.** `coverageDepthMatrix.test.ts:58`. The warning-level branch is never *verified*; it is the
default for anything that is not one of the two recognized glyphs. Measured (`tmp/rev2/matrix.mjs`):

```text
REAL              rows=9  {ok:3, warn:1, fail:5}  depth-fail=38
U+2718 in Status  rows=9  {ok:3, warn:2, fail:4}  depth-fail=38   (a look-alike glyph became warn)
blank depth cell  rows=9  {ok:3, warn:1, fail:5}  depth-fail=37   (a blank cell became warn)
```

The first-code-point trick is correct and the comment explaining U+26A0 U+FE0F is accurate — that part I
verified and it holds. The problem is the fallthrough: a look-alike glyph, a blank cell, a dash or a
stray word all become the middle score. Test 1's independent cross-check does catch the tally shift, but
the message it prints — "the declared total must equal the table's own Status column" — points a reader
at the totals line, not at the malformed cell. And test 3 stops requiring a justification for a row
whose failing mark was mistyped.

**Suggestion.** Throw on anything that is not one of the three, naming the row and column, and assert
the warning case against U+26A0 explicitly rather than by exclusion.

Severity: advisory | Traces to: `principles.instructions.md` Fail Fast

### M5 — `runStep` is the fourth copy of `runShell`, and it copies the least faithful variant

**Issue.** `spec0017LayeredCiScaffoldE2E.test.ts:97-132` is a near-verbatim copy of
`shippedWorkflowDetection.test.ts:77-97`. `shippedWorkflowPortability.test.ts:158-181` and
`shippedWorkflowInertness.test.ts:96` are two more, and **both of those** invoke bash with
`["-e", "-o", "pipefail", scriptPath]` — the flags GitHub applies to a `shell: bash` step. The new one
passes none, while its docstring (line 95) claims "the same pattern as
`tests/integration/shippedWorkflow*.test.ts`".

Measured: the current resolver body behaves identically under both (`tmp/rev2/us3.mjs`, last row), so
there is no live consequence. But the row's headline assertion is `fallback.status === 0` — "no version
file must not fail the lane" — which is precisely a claim about the exit semantics the omitted flags
define. Under CI's `-e`, any intermediate non-zero fails the step; under plain bash it does not.

**Suggestion.** Pass the two flags, and extract one shared helper rather than a fifth copy. Four copies
with two different shell semantics is the state where a reader cannot tell which one is authoritative.

Severity: advisory | Traces to: `principles.instructions.md` DRY

### M6 — the behavioural half of `US-0017-0003` is already asserted, more strongly, one layer down

**Issue.** `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:213-283` already extracts
the same `run` body from the same asset and executes it, asserting strictly more than the new E2E row:
the exact documented fallback literal (the E2E accepts any leading digit), **both** probe candidates, the
precedence when both files are present, and "no warning annotation when a version was pinned". The new
row is a subset at coarser fidelity.

The E2E row does carry independent content — that the resolver arrived in the adopter's tree through
`qfai init` rather than only existing under `assets/` — and that is a genuine E2E-layer fact. But the
matrix at lines 247-258 presents the *behavioural execution* as the new thing that earned the rise, and
the behavioural execution is not new.

**Why.** Round 1 withdrew `US-0017-0007` because "its one assertion duplicated an existing test's". This
is a weaker instance of the same pattern and should be named here rather than left for round 3. I am
**not** asking for the row to be withdrawn — the init-delivery fact is real and the E2E layer is the
right home for it.

**Suggestion.** Amend the matrix narrative to say what the E2E adds over
`shippedWorkflowPortability.test.ts` (delivery through `qfai init`) and cross-reference the integration
row that owns the resolution depth. If the row keeps the behavioural half, make it no weaker than the
integration one: assert the documented literal rather than any leading digit.

Severity: advisory | Traces to: defect:code-quality

## Low / nit findings

- **m1** `--spec=0017` and unknown flags are silently ignored. `check-atdd-annotation-ledger.mjs:124`
  uses `args.indexOf("--spec")`, which only sees the space-separated form. Measured: `--spec=0017` and
  `--spce 0017` both run **repo-wide** and print the repo-wide failure. The space-separated edge cases
  are handled correctly — `--spec` as the last argument and `--spec 17` both exit 2 with the right
  message, and `--spec 0017` reports 8 claims backed. Fix: reject any unrecognized argument, and accept
  the equals form. Traces to: `principles.instructions.md` Principle of Least Astonishment.
- **m2** exit codes collapse. Lines 175-178 map every unexpected error to exit 1, which is also the
  "unbacked claims found" code, so a CI consumer cannot tell a finding from a crash.
  `check-scanner-coverage.mjs` distinguishes (2 usage / 1 finding). Use a third code.
  Traces to: defect:code-quality.
- **m3** `if (current === undefined) break;` (line 81) is unreachable: `while (queue.length > 0)`
  guarantees `pop()` returns a value, and nothing type-checks this file — root `tsconfig.json:3`
  references only `packages/qfai`, whose `tsconfig.json:9` includes `src/**/*.ts` alone. No compiler
  demands the guard. Traces to: `principles.instructions.md` KISS.
- **m4** `TEST_SUFFIXES` (line 34) diverges from the scanner's `DEFAULT_TEST_FILE_GLOB`
  (`atddTraceability.ts:60`): `.cjs`, `.cts`, `.jsx` and `.feature` are missing, so a `.feature` file
  under `tests/e2e/**` carrying a US annotation would count for `QFAI-ATDD-111` and not for the guard —
  an over-report. Excluding `.md` is **essential** (otherwise the ledger backs itself) and is pinned by
  the `notes.md` case at test line 111, but nothing states the reason; a well-meaning "sync this with
  the scanner" edit would make the guard vacuously green. Say so in a comment.
  Traces to: defect:code-quality.
- **m5** `collectTestSources` silently skips symlinked directories: `entry.isDirectory()` is false for a
  symlink under `withFileTypes`. Verified there are none under either scanned tree today
  (`git ls-files -s tests packages/qfai/tests` yields no mode-120000 entries), and the repository has 83
  elsewhere. The `ENOENT` / `ENOTDIR` handling itself is correct, and `isMissing` narrows `unknown`
  properly with an `in` check rather than an assertion.
- **m6** the guard's own tests plant live annotation tokens. `checkAtddAnnotationLedger.test.ts:43, 53,
  64, 71, 80, 104` use real spec and story ids that the ledger claims. Not exploitable today (the scan
  covers only the two `e2e` roots), but measured: widening the scan to every test directory takes
  127 -> **126**, and the single claim that flips is `QFAI:SPEC-0001:US-0001-0001`, "backed" by a fixture
  string at `packages/qfai/tests/core/atddCodeTraceability.test.ts:45`. So the stage's own "126 across
  every test directory" figure is 127 minus one **false** backing — which confirms the narrow two-root
  scan is the right choice, and shows that a fixture token is enough to launder a claim. Use a reserved
  spec id in fixtures. Traces to: defect:code-quality.
- **m7** `spawnSync("bash")` has no availability guard; `child.error` is rethrown (line 117), so on a
  machine without bash the row fails as a defect rather than skipping. CI is ubuntu-only today
  (`ci.yml:30, 229, 303`), and `ci.yml:222` carries a TODO to add a `windows-latest` matrix entry —
  landing that TODO activates this for four helpers, not one. It ran clean on this Windows machine (Git
  Bash on PATH), and `.gitattributes` forces `eol=lf`, so the CRLF-in-`step.sh` failure mode does not
  apply.
- **m8** `spec0017...:287-288` mkdtemps `withFile` then `withoutFile` **before** the `try`, so if the
  second throws the first leaks. `runStep`'s own `try/finally` (129-131) is correct and does clean up on
  the throw path.
- **m9** the `node-version:` literal scan (line 219) would miss a folded scalar (`node-version: >-`
  followed by an indented literal). A quoted expression is correctly excluded. Fine as written; noted for
  completeness.

## What I confirmed rather than faulted

These are the claims the request asked me to break. I broke at them and they held.

1. **The `US-0017-0003` behavioural assertion is not vacuous.** Six independent mutations of the shipped
   resolver body, each run through the row's five assertions (`tmp/rev2/us3.mjs`):

   ```text
   R0 unmodified body                    GREEN
   M1 probe loop deleted                 RED -> pinned.version===23.4.1
   M2 publish to stdout not GITHUB_OUT   RED -> pinned.version, fallback.version
   M3 probe reads .nvmrc-disabled        RED -> pinned.version===23.4.1
   M4 fail CLOSED with no version file   RED -> fallback.status, fallback.version, warning
   M5 warning annotation removed         RED -> warning emitted
   M6 fallback hardcoded to 23.4.1       RED -> fallback.version!==23.4.1
   ```

   The rewrite from text-matching to execution did what the stage claims it did. The one mutation it does
   **not** catch is `.node-version` removal, which is B4.

2. **`coverageDepthMatrix.test.ts` is not vacuous**, apart from M3. Every assertion compares two
   independently-sourced values: the table's `Status` column against the prose totals line; the measured
   failing-depth-cell count against the stated one; the measured failing `Status` rows against the
   declared `###` headings, **in both directions** (line 138 catches a stale justification section, which
   is the harder half); and the reason-class sizes against the cell total. No assertion computes its
   expectation from the actual. The column-index mapping is correct — `split("|").slice(1, -1)` yields
   the id plus exactly eight scores against eight `COLUMNS` entries — and the second table in the file is
   excluded because its ids are backticked, which the row regex will not match.

3. **The 127 figure is independently verified.** `node scripts/check-atdd-annotation-ledger.mjs` from the
   repo root reports 127 unbacked of 208, exit 1. I checked the two ways the guard could over-report and
   neither applies: the scanned trees hold only `.ts` files plus the ledger `.md` (24 and 1 respectively),
   so no extension is missed, and there are no symlinked directories to skip. The `.md` exclusion is what
   stops the ledger backing itself, and it is correct. `CR-20260820-0011` is not overstated. Per B1, if
   anything 127 is a floor.

4. **The main-guard is right.**
   `process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href` is the exact
   sibling convention (`check-publish-dry-run.mjs:111`, `check-workflow-hygiene.mjs:639`), including the
   `undefined` check that the comment there records as the bug it fixes. Verified live: the module imports
   cleanly under vitest (10 tests) and the CLI fires from the shell.

5. **Repository rules hold.** No bare `as` type assertions in any of the four files (`as const` and an
   import alias only). Every async path has explicit handling: `collectTestSources` narrows and rethrows,
   `main()` is wrapped in a `.catch`, `runStep` uses `try/finally`, `exists()` catches. No function
   exceeds roughly 50 lines. `eslint --max-warnings 0` and `prettier -c` both clean on all four files.

6. **`process.exitCode` over `process.exit` is a legitimate choice** — `check-not-a-dependency.mjs:45`
   does the same, and it lets stdout flush, which `process.exit` risks. The `2` for a usage error against
   `1` for a finding matches `check-scanner-coverage.mjs`; only the crash case is unseparated (m2).

7. **Layer placement is right, and the tests actually run.** `tests/assets/**` is in the `e2e` project
   and `tests/integration/**` in `integration` (`vitest.workspace.ts:44, 55`), so all 14 new tests execute
   in CI. `.qfai/evidence/coverage-depth-spec-0017.md`, `tests/e2e/qfai-traceability.md` and all three
   test files are tracked (`git ls-files --error-unmatch`), despite `.gitignore:59` — force-added, per this
   repository's convention — so nothing breaks on a fresh clone.

## Residual risks and gates

- **PENDING** — `pnpm ci:lint` in full, and `qfai validate`. Both write tracked artifacts or run
  `sync:ssot`; out of scope for a read-only pass. The two `ci:lint` members that reach these files were
  run directly and pass.
- **PENDING** — behaviour on a non-Windows host. Everything above ran on `win32` with Git Bash. CI is
  ubuntu-only, and the four `spawnSync("bash")` helpers are the only platform-sensitive surface.
- **Residual** — `main()` stays untested after B2's cwd fix unless tests land with it; cwd-dependence is
  the kind of defect that returns.
- **Residual** — the guard is not wired into `ci:lint`. That is `CR-20260820-0011`'s work by the stage's
  own account, and correctly out of scope here. Until it is wired, nothing runs this script on a pull
  request, so B1 and B2 are latent rather than active.
- **Out of my domain, flagged for routing** — request items 3 (whether withdrawing `US-0017-0007` was
  right), 4 (branch 3 for `TDD-0069` / `TDD-0070` with a pending `DR-*`) and 5 (the re-seal) are process
  and provenance questions for `completion-reviewer` / `qa-gatekeeper`, not code correctness. I read the
  ledger rows at `.qfai/specs/spec-0017/tdd/test-list.md:107-108` and the branch-3 entries at
  `.qfai/evidence/atdd-spec-0017.md:254-313` only far enough to identify my audit subject and compute the
  hash above.

## Evidence checked

- `scripts/check-atdd-annotation-ledger.mjs` (whole), against `scripts/check-publish-dry-run.mjs`,
  `check-workflow-hygiene.mjs:590-640`, `check-scanner-coverage.mjs:40-161`,
  `check-review-profile-consistency.mjs:22-25`, `check-not-a-dependency.mjs:42-45`
- `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` (whole)
- `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (whole)
- `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (whole)
- `packages/qfai/src/core/atddTraceability.ts:27-28, 60` — the annotation SSOT and the test-file glob
- `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml` — the resolver under test
- `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:145-311`,
  `shippedWorkflowDetection.test.ts:70-97`, `shippedWorkflowInertness.test.ts:96` — the pattern claimed
- `.qfai/evidence/coverage-depth-spec-0017.md` (whole), `.qfai/evidence/atdd-spec-0017.md`
  (§ Ledger rows advanced, § Gaps / Open risks, § Final status)
- `.qfai/specs/spec-0017/tdd/test-list.md:107-108`
- `tests/e2e/qfai-traceability.md` (221 lines, 208 claims, 8 for spec-0017)
- `qfai.config.yaml` (`testsDir: tests`), root `package.json:19-20` (`ci:lint`, `ci:gate`),
  `packages/qfai/vitest.workspace.ts`, `.github/workflows/ci.yml:222-330`, `.gitattributes`,
  `.prettierignore`, `.markdownlint-cli2.jsonc:27-60`
- `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:265-424` — the hash procedure
- `.github/instructions/principles.instructions.md`, `.github/instructions/code-review.instructions.md`,
  `CLAUDE.md`
- Scratch: `tmp/rev2/{bounds,us3,us3b,matrix,predicates,chain,regex,hash}.mjs` — all read-only against
  the repository; every mutation applied to an in-memory copy.
