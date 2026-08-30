**Verdict: REVISE.**

# R01 — implementation-reviewer, round 12, spec-0017 (stage)

| field                   | value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `HEAD` at start         | `45e6f041`                                                                           |
| `git status` at start    | clean                                                                                |
| `HEAD` at finish        | `45e6f041` (unmoved)                                                                 |
| `git status` at finish   | **5 files modified by another agent while I worked** — see `A1`                       |
| scratch                 | `tmp/r12-impl/` only                                                                 |
| asset workflows written | **none.** `packages/qfai/assets/init/root/.github/workflows/` was read, never written |
| mutations taken         | 3 files, each restored in a `finally` with a printed byte comparison (all `equal=true`) |

Files I mutated to measure, and their restore proof:

| file                                                     | mutations | restore                                         |
| -------------------------------------------------------- | --------- | ----------------------------------------------- |
| `packages/qfai/tests/helpers/buildCommand.ts`            | 10        | `original=55801B after=55801B equal=true`       |
| `packages/qfai/tests/integration/shippedWorkflowDetection.test.ts` | 2 | `original=20435B after=20435B equal=true`       |
| `packages/qfai/vitest.workspace.ts`                      | 1         | `original=1756B after=1756B equal=true`         |

None of the three appears in `git status` at finish, which is the second, independent restore check.
The permission-departure oracle (item 3) and the shipped-workflow refusal scan were measured against a
**copy** of the tree in `tmp/r12-impl/wf/`, so nothing real was mutated for them.

## What I could not reproduce

Stated plainly, because a null result is a measurement:

- **No further missing `await`.** A type-aware lint over the six changed/adjacent files with
  `no-floating-promises`, `await-thenable`, `no-misused-promises` and `require-await` enabled is CLEAN,
  and the same probe catches one planted floating promise (`B2`). The six the conversion left are gone.
- **No vacuous sibling** among the tests that assert the parallelism declarations.
  `tests/scripts/sliceSurfaceAlignment.test.ts:257` carries the floor (`projects.length` is 7) that the
  withdrawn round-1 assertion lacked, and `vitestWorkspaceKnobs.test.ts` reaches its claims by IMPORTING
  the config rather than scanning it.
- **No corruption of the E2E's shared JSONL log** in 40 trials of 4 simultaneous writers (`m6`).
- **No build reachable through `[`, `[[`, `test` or `false`.** All four evaluate a condition and exec
  nothing, and `commandsOf` splits on the `&&` / `||` that would follow them (cases `20`, `21`).

### B1 — Seven constructs run a real build in a shipped lane while `refusals()` returns `[]`, in six root-cause classes the repair does not name

**Severity: blocking.** **Traces to:** `US-0017-0004` (the story this instrument is the sole oracle for);
`defect:security` (each construct executes an arbitrary program in an adopter's CI lane).

**Issue.** The repair's argument is that splitting `undefined` into `NOTHING` and `UNREADABLE` closes the
class rather than five instances of it. It does not. Taking the review request's second challenge — get a
real build to run in a shipped lane while `refusals()` returns `[]`, by any route — I got there seven times,
six of them by mechanisms none of the five repaired holes covers.

**Measurement.** Each body is a file under `tmp/r12-impl/cases/`. Two instruments read the same bytes:
`refusals()` via `node --experimental-strip-types tmp/r12-impl/probe.mjs`, and `bash` via
`tmp/r12-impl/exec.sh`, with marker-writing `npx` / `npm` / `tsup` on `PATH` and a real `build.mjs`.
Measured at `45e6f041`:

| case                        | body                                                       | `refusals()`                 | bash                              |
| --------------------------- | ---------------------------------------------------------- | ---------------------------- | --------------------------------- |
| `01-base-direct`            | `npx tsup`                                                 | `["npx tsup"]`               | ran                               |
| `04-base-node-file`         | `node build.mjs`                                           | `["node build.mjs"]`         | ran                               |
| `05-base-npm-pkg`           | `npm install left-pad`                                     | `["npm install + left-pad"]` | ran                               |
| **`10-hole-oneline-fn`**    | `b() { npx tsup; }` then `b`                               | **`[]`**                     | `npx tsup`                        |
| **`11-hole-oneline-case`**  | `case "$f" in *.ts) npx tsup ;; esac`                      | **`[]`**                     | `npx tsup`                        |
| **`12-hole-subst-arg`**     | `node $(echo build.mjs)`                                   | **`[]`**                     | `REAL BUILD RAN: build.mjs`       |
| **`13-hole-subst-pkg`**     | `npm install $(echo left-pad)`                             | **`[]`**                     | `npm install left-pad`            |
| **`14-hole-opaque-pkg`**    | `npm install -p left-pad`                                  | **`[]`**                     | `npm install -p left-pad`         |
| **`15-hole-quoted-shadow`** | a quoted string holding the line `npx() {`, then `npx tsup`| **`[]`**                     | `npx tsup`                        |
| **`16-hole-node-eval`**     | `node -e` with an fs payload                               | **`[]`**                     | `RAN arbitrary code via node -e`  |
| **`17-hole-env-assign`**    | `GIT_EXTERNAL_DIFF=./ext-diff.sh git diff --ext-diff HEAD` | **`[]`**                     | `external program invoked by git`  |
| **`19-hole-node-options`**  | `NODE_OPTIONS=--require=./preload.cjs node -e "0"`         | **`[]`**                     | `REAL BUILD RAN via NODE_OPTIONS` |

Case `17` needed a git repository the shared driver cwd does not have, so it was proved on its own in
`tmp/r12-impl/gitrepo`: git invoked `./ext-diff.sh` once per changed file, exit 0.
Case `18` (`GIT_PAGER`) is the same class and I did **not** get it to fire — reported, not claimed.

And in the corpus's own units. `tests/unit/shippedLaneCommands.test.ts` records "0 of 62 missed" bare and
"61 of 62 missed" under any one of the ten `WRAPS`. Four of the above, written as wrappers over the same
62-entry `PLANTED` list (`tmp/r12-impl/wraps.mjs`):

    61 / 62 escaped  <- one-line function definition + call
    61 / 62 escaped  <- one-line case arm
    53 / 62 escaped  <- function name shadowed from inside a string
     1 / 62 escaped  <- argument via command substitution
    TOTAL escaped across the four wrappers: 176 / 248

The substitution wrapper scores 1/62 only because most `PLANTED` heads are refused by name whatever their
arguments. Applied where the head is ALLOWED it is total (`tmp/r12-impl/wraps2.mjs`):

    refused  "node build.mjs"            | ACCEPTED "node $(echo build.mjs)"
    refused  "node ./scripts/build.mjs"  | ACCEPTED "node $(echo ./scripts/build.mjs)"

**Why — each class is a line, not a spelling.**

1. **`shippedLaneCommands.ts:276`.** `for` / `case` / `select` return `NOTHING` before the tail is read. A
   one-line `case` has no `;` before its first arm — the arm is introduced by `in` and closed by `;;` — so
   `commandsOf` hands over `case "$f" in *.ts) npx tsup` as ONE command and the build is discarded. This is
   the identical tail-discarding defect that line 287 fixes for the `case` ARM, ten lines later. One shell
   construct, two punctuation marks, one fixed and one not.
2. **`shippedLaneCommands.ts:281`.** `head.endsWith("()")` returns `NOTHING` and discards the tail of a
   one-line function definition. The multi-line form was already read, which is exactly why a corpus of bare
   commands could not see it. (Closed in the working tree at 15:26 by the edit reported in `A1`; open at the
   reviewed revision, and the shipped tree contains the construct — see below.)
3. **`shippedLaneCommands.ts:79-84`.** A `$( … )` is scanned as its own body and then **deleted from the
   surrounding word**. The docstring says "what it contributes there is its output, not a command" and then
   contributes nothing at all — so `node <arg>` degenerates to bare `node`, which `ALLOWED_INVOCATIONS`
   holds, and `npm install <pkg>` degenerates to `npm install`, which `TAKES_NO_PACKAGE` then cannot see a
   package in.
4. **`shippedLaneCommands.ts:428`.** `bareArgumentsOf` breaks at `OPAQUE_AFTER`, so a package sitting after
   any of those six flags is invisible to `TAKES_NO_PACKAGE`. Whether npm honours `-p` is a second question;
   the finding is the instrument's verdict, which is `[]`.
5. **`shippedLaneCommands.ts:309`.** `localFunctionsOf` runs a `gm` regex over the RAW body, ignoring the
   quote tracking `commandsOf` was rebuilt to have. A function header inside a string literal therefore
   shadows a real program for the whole body — 53 of 62.
6. **`shippedLaneCommands.ts:266`.** The assignment skip DISCARDS the assignment. Environment variables are
   a documented arbitrary-program channel: `GIT_EXTERNAL_DIFF`, `GIT_PAGER`, `GIT_SEQUENCE_EDITOR`,
   `NODE_OPTIONS=--require`, `LD_PRELOAD`. This is the very argument that moved `git` off
   `HARMLESS_PROGRAMS` this round — "`git -c alias.zz=... zz` is one line and a real build" — in its
   environment spelling, against the same allowlisted `git diff`, one round later.
7. Case `16` (`node -e`) is DOCUMENTED and I am not calling the documentation wrong. I am calling the module
   header's "It fails **closed**" conditional on it, because the shipped tree itself uses `node -e`, so the
   payload channel is open in the very tree the claim is about.

**Two of these are live on the real subject, not only on plants.** The shipped detection body defines
`emit() { echo "lanes=$1" >> "$GITHUB_OUTPUT"; }` on ONE line, and `fail_open() {` opens a multi-line one —
so class 2 has been reading a real shipped construct as nothing all along. And the shipped probe step runs
`declared="$(node -e ' … ')"`, which is class 3 plus class 7 in one line.

**One property worth naming on its own.** `refusals()` and the pinned program set at
`spec0017LayeredCiScaffoldE2E.test.ts:548` are both derived from `invocationOf`. A construct that reaches
`NOTHING` is therefore invisible to BOTH, so the set pin cannot notice a program the scanner declines to
see — which is why it reads clean for every row in the table.

**Suggestion — three changes, not six patches.**

- **One prefix rule, not three punctuation marks.** A head that is a keyword, a `case` arm or a function
  header is a PREFIX: strip it and recurse on the tail, which is what line 287 already does. Then `for` /
  `case` / `select` / `()` need no `NOTHING` return at all, and the fourth punctuation mark is covered
  before someone finds it.
- **Never delete a substitution or an assignment — replace it with an opaque token.** `$( … )` becomes a
  placeholder WORD and `VAR=x` stays in the invocation. Both then fail the exact-match allowlist, and the
  shipped tree still passes: its own use is `declared="$( … )"`, whose head remains an assignment that
  invokes nothing. The same change closes class 4, because the placeholder IS a bare argument.
- **Derive `localFunctionsOf` from `commandsOf` output**, so one quote-aware scanner is the only reader of
  the body.

Verified rather than asserted, against the COMMITTED helper (`git show 45e6f041:...`,
`tmp/r12-impl/verify-emit.mjs`):

    "emit() { echo \"lanes=$1\" >> \"$GITHUB_OUTPUT\"" -> NOTHING
    "}"                                               -> NOTHING
    "emit \"[]\""                                     -> "emit []"
    refusals: []

### B2 — Nothing type-checks or async-lints `packages/qfai/tests/**`, so the gate that mechanically catches a missing `await` is switched off over every file in this change

**Severity: blocking.** **Traces to:** `CLAUDE.md` Project Rules ("TypeScript: every async path must have
explicit error handling", "All source changes must have corresponding test coverage"); `defect:code-quality`.

**Issue.** The review request says `tsc -b` accepted all six missing `await`s. It is worse than that:
`tsc -b` never read the file. `packages/qfai/tsconfig.json` has `"include": ["src/**/*.ts", "src/**/*.d.ts"]`,
so no tsconfig in the repository contains `tests/**`. And because tests are outside a project,
`eslint.config.js:51-64` applies `tseslint.configs.disableTypeChecked` to `**/tests/**/*.ts`, which switches
off `no-floating-promises` — the one rule that catches this defect class mechanically. So the conversion
added roughly fifteen new `await` points to a directory where no gate can see one missing, and the failure
had to surface as a semantically unrelated test asserting the absence of a warning.

**Measurement (`tmp/r12-impl/typecheck-probe.mjs`).** Planted a type error and a floating promise at the end
of `tests/integration/shippedWorkflowDetection.test.ts` — the file the conversion touched — and ran the
repository's own gates:

    pnpm check-types (tsc -b, repo root):            exit=0  (accepted the mutant)
    pnpm -C packages/qfai check-types (tsc --noEmit): exit=0  (accepted the mutant)
    pnpm lint (eslint . --max-warnings 0):            exit=0  (accepted the mutant)
    RESTORE: original=20435B after=20435B equal=true

`ci.yml`'s `check-types` job runs `pnpm check-types`, so the CI lane inherits the same blind spot.

**The good news, and it is what makes this actionable rather than a lament.** I built the missing gate in
`tmp/r12-impl/tsconfig.probe.json` + `tmp/r12-impl/eslint.probe.config.mjs` (a tsconfig that includes
`tests/**`, and the four async rules) and ran it. Both directions, per the frozen-probe rule
(`tmp/r12-impl/lint-probe.mjs`):

    at HEAD                     : CLEAN
    mutation applied: +231 bytes
    with one floating promise   : 1 finding  (no-floating-promises, line 492)
    RESTORE: original=20435B after=20435B equal=true

And over the WHOLE test tree (415 files):

    @typescript-eslint/no-floating-promises   : 0
    @typescript-eslint/await-thenable         : 0
    @typescript-eslint/no-misused-promises    : 0
    @typescript-eslint/require-await          : 83   (a style rule, not a correctness one)

**Suggestion.** Add a `packages/qfai/tsconfig.tests.json` that includes `tests/**` with `noEmit`, reference
it from the eslint `parserOptions`, and narrow the `disableTypeChecked` block at `eslint.config.js:53` so it
covers the config files but NOT `**/tests/**`, re-enabling at minimum
`no-floating-promises` / `await-thenable` / `no-misused-promises`. The three are green today, so this is a
configuration commit with no backlog attached; leave `require-await` off if the 83 are not wanted. Without
it, the next conversion of this shape has the same detector — an unrelated test noticing a warning it did
not expect.

### M1 — The parallelism E2E measures the knob MODULE, not the runner the story is about: a project-level `singleFork: true` makes the axis inert with all three guards green

**Severity: major.** **Traces to:** `US-0017-0007`; `defect:correctness` (the oracle does not observe the
subject the story names).

**Issue.** The test is a real advance — it is the story's first assertion of an EFFECT, the four mutations
behind it are sound, and reading `WORKERS_ENV`'s name as a literal rather than from the module under test is
the right call. But its fixture writes its OWN flat `vitest.config.ts` in a temp directory and never loads
`packages/qfai/vitest.config.ts` or `vitest.workspace.ts`. So it proves that `rootKnobs` honours the axis
when spread into a single flat config — a shape this repository never uses. The story's subject is "a
maintainer tuning a 415-file suite", which is THIS suite, configured through seven workspace projects.

**Measurement, answering "can the axis be made inert a fifth way".** Yes. `tmp/r12-impl/fifth-axis.mjs`
builds the same fixture and measures peak file concurrency:

    control: knobs as shipped                  workers=1 status=0 files=4 PEAK=1
    control: knobs as shipped                  workers=4 status=0 files=4 PEAK=4
    + poolOptions.forks.singleFork = true      workers=4 status=0 files=4 PEAK=1
    + sequence.concurrent = false              workers=4 status=0 files=4 PEAK=4
    + poolOptions.forks.maxForks = 1           workers=4 status=0 files=4 PEAK=1

`singleFork` is PROJECT-scoped — `vitest.knobs.ts` says so itself ("`poolOptions.forks` is further narrowed
to `singleFork | isolate`") — so it can be set per project in `vitest.workspace.ts`, after the `projectKnobs`
spread, where the fixture cannot see it. Planted exactly that on the `e2e` project
(`tmp/r12-impl/inert-axis.mjs`):

    AT HEAD:
       tests/scripts/vitestWorkspaceKnobs.test.ts : GREEN
       tests/scripts/sliceSurfaceAlignment.test.ts: GREEN
       tests/e2e/spec0017RunnerParallelismE2E     : GREEN
    MUTANT PLANTED (e2e project gets singleFork:true; applied=true):
       tests/scripts/vitestWorkspaceKnobs.test.ts : GREEN
       tests/scripts/sliceSurfaceAlignment.test.ts: GREEN
       tests/e2e/spec0017RunnerParallelismE2E     : GREEN
    RESTORE: original=1756B after=1756B equal=true

The declaration guard passes because it only asks that `poolOptions` be a non-empty record naming the pool,
and that no ROOT-ONLY key appear on a project. `singleFork: true` satisfies both while serialising the
project. `maxForks: 1` in `vitest.config.ts` is the same route at root level.

**On the flake question, separately: the observation is sound.** At 4 workers the pool creates 4 forks
regardless of core count — tinypool's ceiling is the number given, not the machine's — and four busy loops
of 700 ms time-slice into overlapping intervals even on one core. I measured PEAK=4 on every run (8 runs of
the 4-worker case across this review, never below 2). The comment's "fails only on a single-core machine" is
therefore conservative in the safe direction rather than a live flake.

**Suggestion.** Point one assertion at the REAL configuration: load
`packages/qfai/vitest.config.ts` and `vitest.workspace.ts` the way `vitestWorkspaceKnobs.test.ts` already
does (import, do not scan), and assert no project carries a `poolOptions.forks.singleFork === true` or a
`maxForks` that would serialise it. That is still a declaration check, but it closes the one gap the effect
measurement cannot reach — and it is three lines beside `ROOT_ONLY`, which already exists for the mirror-image
defect.

### M2 — `process.env[X] = undefined` stores the string "undefined": the "absent override" assertion never reaches the absent branch, and the `finally` does not restore

**Severity: major.** **Traces to:** `US-0017-0007`; `defect:correctness`.

**Issue.** `spec0017RunnerParallelismE2E.test.ts:246-248` states: "`tunable` reads `process.env[name]`, for
which an absent key and an `undefined` value are the same thing." They are not. Node's `process.env` setter
coerces, so the key is set to the six-character string `"undefined"`.

**Measurement (`tmp/r12-impl/env.mjs`, `tmp/r12-impl/tunable.mjs`).**

    after assigning undefined: typeof=string    value="undefined"  'in' env=true
    after delete:              typeof=undefined value=undefined    'in' env=false
    assigned undefined -> "undefined" tunable = 10 (declared 10)
    really absent      -> undefined   tunable = 10

Two consequences. The assertion labelled "an absent override falls back to the declared value" (line 249)
exercises the same `!/^[0-9]+$/` branch as `"ten"`, so `tunable`'s `raw === undefined` early return is not
reached by it. And the `finally` at line 262 writes `"undefined"` back rather than deleting, so the restore
does not restore: the worker process keeps `QFAI_TEST_MAX_WORKERS="undefined"` and any child spawned after
this test inherits it. The blast radius is bounded here — `isolate: true` gives each file its own process and
`runAt` overrides the variable explicitly — which is why this is major and not blocking.

**Suggestion.** `vi.stubEnv(WORKERS_ENV, undefined)` inside a `vi.unstubAllEnvs()` teardown, which
`vitestWorkspaceKnobs.test.ts` already uses, actually deletes the key and restores it. If the dynamic-delete
lint rule is the reason for the assignment, note that the rule is disabled for `tests/**` today anyway
(see `B2`), and `vi.stubEnv` sidesteps it regardless.

(`vi.stubEnv`'s own signature is `(name, value: string | undefined)`, so passing `undefined` is the
supported delete.)

### M3 — `run()`'s catch folds a spawn failure and a truncating kill into `status: 1`, which is the value the file's one discriminating control asserts

**Severity: major.** **Traces to:** `TC-0003-0040`; `defect:correctness`.

**Issue.** The helper's guard is `"code" in error && "stdout" in error`. Node's promisified `execFile`
assigns `err.stdout` and `err.stderr` on EVERY rejection, including a spawn error, so the guard admits
outcomes that are not exit statuses and the `: 1` fallback erases the difference.

**Measurement (`tmp/r12-impl/run-catch.mjs`, the helper copied verbatim in shape).**

    a real non-zero exit           status=1 code=1                                  swallowedByCatch=true stdout=4B
    a binary that does not exist   status=1 code=ENOENT                             swallowedByCatch=true stdout=0B
    stdout past maxBuffer          status=1 code=ERR_CHILD_PROCESS_STDIO_MAXBUFFER   swallowedByCatch=true stdout=1024B

Three outcomes, one status. The consequence is at line 462, `expect(failedLane.status).toBe(1)` — the
assertion the comment calls "discriminating control of the same predicate: green-on-skip is not
green-on-anything". It is satisfied by a shell that never ran. `maxBuffer` also silently TRUNCATES stdout,
which matters for `expect(run.stdout).not.toMatch(/::warning::/)` at line 208; that one is shielded by the
`status === 0` assertion before it, and `spawnSync` had the same 1 MiB default, so the truncation is not a
regression — the ENOENT fold is new with the conversion.

**Suggestion.** Fold only what is an exit status, and rethrow the rest:

    const code: unknown = (error as { code?: unknown }).code;
    if (typeof code === "number") { return { status: code, ... }; }
    throw error;

The intent is already in the file (`typeof error.code === "number" ? error.code : 1`); it is the `: 1` that
does the swallowing. `git()` is unaffected either way because it throws on any non-zero.

### M4 — What the three concurrent fixtures share is the ambient git configuration, and it is load-bearing: a global `core.excludesFile` reddens 4 of the 10 tests

**Severity: major.** **Traces to:** `TC-0003-0039`; `defect:correctness` (a fixture suite that is not
hermetic against a plausible developer configuration).

**Issue.** The review request asks whether the three concurrent fixtures share a temp-directory helper, a git
config or an env var. All three, and the third is the one that bites:

- the temp-directory POOL (`useTempDirPool`, a module-scope array with a file-scoped `afterEach`) — shared,
  and safe: allocation is a single-threaded push and the memo comment about `afterEach` draining the pool
  before the later `it()`s is correct;
- the memoized `orchestratorDocPromise` — shared deliberately, and correctly (the promise is cached, not the
  value, so concurrent callers share one read);
- `process.env` — `git()` passes NO `env`, and `runShell` spreads `...process.env`. So every fixture inherits
  the developer's or runner's git configuration. `COMMIT_IDENTITY` pins identity and `commit.gpgsign`, and
  nothing else.

**Measurement.** A global config with `core.excludesFile` listing `*.png` and `docs/`. The first attempt
passed and I did not believe it: the probe had not asserted that the mutation applied, and the MSYS-translated
path meant git never read the file. With the mutation verified applied (`git config --get core.excludesFile`
echoes it, and `git status --porcelain` reports nothing for either file):

    GIT_CONFIG_GLOBAL=<that config> vitest run tests/integration/shippedWorkflowDetection.test.ts
    Tests  4 failed | 6 passed (10)
      x TC-0003-0038 ... a Markdown-only diff ...
          -> git ... commit -m change docs/guide.md failed (1)
      x TC-0003-0039 ... all three degraded cases ... (all three its)
          -> git ... commit -m change logo.png failed (1)

It fails LOUDLY, which is why this is major rather than blocking: `git()` throws with the stderr, so nobody
gets a wrong verdict. But 4 of 10 tests in this file depend on the reader not having a global ignore file
containing entries the fixtures use as fixtures.

**Suggestion.** One line in `git()`: pass
`env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull, GIT_CONFIG_NOSYSTEM: "1" }`.
That also makes `COMMIT_IDENTITY`'s `commit.gpgsign=false` redundant, which is a second small win, and it
removes the `HOME`-dependence of a suite whose whole subject is a shipped shell script.

### M5 — The extraction is behaviour-preserving (121,626 comparisons, 0 differences) — but `openingVerdict` shipped a dead duplicate whose docstring asserts an ordering neither instrument can observe

**Severity: major.** **Traces to:** `defect:code-quality` (the extraction reproduced, inside the extracted
function, the exact defect it was performed to remove: a comment claiming a relationship a reader cannot check).

**The good half first, because it is the answer to the request's item 5.** I diffed the pre-refactor module
(`git show ab940aa2:...`) against HEAD over 40,542 generated command lines in 3 script-source contexts:
every program in `GRAMMAR` crossed with every flag in its own lists plus the global ones, in seven positions
(spaced, inline `=`, before and after the target, wrapped by each of 22 wrappers, through `bash -c`,
`bash -eo pipefail -c` and `pwsh -Command`, with assignment prefixes, `cd` prefixes and subshells), plus the
suite's own 500 `MEMBER_CASES` (`tmp/r12-impl/differential.mjs`):

    corpus lines: 40542  comparisons: 121626  DIFFERENCES: 0

The probe is not inert. Six planted mutations, each measured against the differential AND the suite's own
1,970-line corpus (`tmp/r12-impl/mutate-both.mjs`):

    baseline                                                   differences=0    own unit suite=GREEN
    N1 openingVerdict: DELETE the global never-flags check      differences=0    own unit suite=GREEN
    N2 openingVerdict: alwaysBuilds FIRST, ahead of both nevers  differences=0    own unit suite=GREEN
    N3 openingVerdict: DELETE the per-tool never check           differences=924  own unit suite=RED
    N4 command(): drop the noScripts pre-pass                    differences=0    own unit suite=RED
    N5 readFlag: neutralise the optional-argument branch         differences=0    own unit suite=RED
    N6 readFlag: collapse dirs into values (control)             differences=120  own unit suite=RED
    RESTORE: original=55801B after=55801B equal=true

So the behaviour claim holds, and `N4` / `N5` show honestly that my generated corpus is weaker than the
suite's in two places — the 0 there is my probe's silence, not a property of the code.

**The finding is `N1` and `N2`.** `openingVerdict`'s docstring says:

> Grouped because the order is load-bearing … `alwaysBuilds` is only safe because the never-flags are
> refused first — `ant -version` read as a build until the single-dash spelling was declared — and a per-tool
> never must beat it for the same reason.

Neither half of that is observable at HEAD:

- The GLOBAL check at line 865 is DEAD. `resolveHead` already ran `refusedBy(tokens, NEVER_FLAGS)` at line
  890 and returns `"none"`, and `command()` calls `resolveHead` first — so deleting line 865 moves nothing
  in 121,626 comparisons and leaves the suite green (`N1`). The extraction DUPLICATED a check five lines
  away from the one that decides it.
- The per-tool ordering is untestable, because no tool declares both. `alwaysBuilds` belongs to `COMPILER`
  and `sphinx-build`; neither has a `never`. Hence `N2`: `alwaysBuilds` can be moved ahead of BOTH checks
  with nothing noticing.
- And the docstring's own example is a different mechanism: `ant` is `bareIsBuild`, not `alwaysBuilds`
  (line 415). Its `-version` refusal comes from `resolveHead` plus the `sawBare` gate at line 1151.

`N3` is the control that keeps this honest: the per-tool check itself is very much alive (924 differences).

**Suggestion.** Delete line 865, and rewrite the docstring around what is load-bearing: the per-tool `never`
must be refused before `alwaysBuilds`, which is a rule about a configuration that does not exist yet, so say
so — or add the case that makes it exist. Either way the reader can check the claim, which is the entire
point of the extraction.

### M6 — The fourth flag effect, which `FlagAction` does not name, is the one still carrying the bug the other three had fixed

**Severity: major.** **Traces to:** `defect:correctness`.

**Issue.** `readFlag`'s docstring says "What one flag token does: end the line as a build, move the manifest
lookup, and/or consume tokens" and "The three effects are separate on purpose." A flag has at least three
MORE effects, all decided outside `readFlag`:

1. **refuse the whole line** — `NEVER_FLAGS` and `tool.never`, via `refusedBy` in `resolveHead` /
   `openingVerdict`;
2. **suppress lifecycle hooks** — `NO_SCRIPTS`, via a whole-token-list pre-pass at `buildCommand.ts:1048`;
3. **pass through without consuming** — `--`, via `MANAGER_PASS` at line 1056, checked before the
   dash branch ever runs.

Effect 2 is the interesting one, because it is the only flag effect in the file still reading a flag by whole
token. `refusedBy` was deliberately taught the inline spelling ("A whole-token match could not see
`scons --tree=all` or `tsc --showConfig=true`, which is the one-command-two-spellings invariant the per-tool
`never` list was introduced for, reproduced inside its own first use"). The `NO_SCRIPTS` pre-pass uses
`NO_SCRIPTS.has(t)`, so it does not.

**Measurement (`tmp/r12-impl/noscripts.mjs`, sources `{ publish: "echo published", prepublishOnly: "tsup" }`).**

    build      npm publish
    none       npm publish --ignore-scripts
    none       npm publish --no-scripts
    build      npm publish --ignore-scripts=true
    build      npm publish --no-scripts=1
    build      pnpm publish --ignore-scripts=true

npm accepts both spellings identically, so those are one command with two verdicts — the invariant this file
repairs in four other places. The direction is a false POSITIVE (a build reported where the hooks are
skipped), which is why it is major and not blocking, and this classifier is explicitly not the backstop for
`US-0017-0004`.

**Suggestion.** Compute `noScripts` with `refusedBy(tokens, NO_SCRIPTS)` — the function already exists and
already handles the inline form — and say in `FlagAction`'s docstring that a flag has effects this type does
not carry, with the three named. "The three effects are separate on purpose" is true and incomplete, and the
incompleteness is where the surviving bug is.

## Rulings the request asked for

### Requested ruling: `TC-0017-0016` — the choice is right, and so is the reading

**Ruling: correct on both counts, no change wanted.**

- **The withdrawal is right.** `CR-20260818-0007` exists, is `Status: open`, `Class: intent`,
  `Approved option: -`, and its `Blocked set` is `spec-0017 TDD-0016 (TC-0017-0016)`. Its recommendation is
  Option A and the test asserts Option A's oracle. Annotating it would discharge the `QFAI-ATDD-112` signal by
  adopting a recommendation the user has not approved, which is the drift protocol's core rule read correctly.
  The header's own summary of the near-miss — "an open CR naming a TC in its blocked set is the thing to check
  BEFORE covering that TC" — is the right lesson and worth keeping.
- **The third departure is necessary, not an over-grant.** `release.yml`'s `github-release` job runs
  `gh release create` (line 203). Creating a release writes to the repository, so `contents: write` is that
  job's minimum. The case's "exactly two" is wrong under the literal reading, and the test asserting the
  measured three while reporting the disagreement is the correct handling.
- **And the oracle discriminates.** Measured on a COPY of the own tree (`tmp/r12-impl/wf/`,
  `tmp/r12-impl/scope-probe.mjs`) so nothing real was mutated:

      BASELINE   departures (3): ci.yml#ci-pass: {} | release.yml#github-release: {"contents":"write"}
                                 | release.yml#publish: {"contents":"read","id-token":"write"}
      MUTANT A   departures (4): + ci.yml#planted-job: {"packages":"write"}
      MUTANT B   departures (4): baseline widened to contents: write -> ci.yml#detect becomes a departure
      RESTORE(copy): equal=true

  Both directions move the set, so the `toEqual` is not decoration. Treating a job block that RESTATES the
  baseline as a non-departure, and then asserting the baseline separately, is the right decomposition — mutant
  B shows the two halves catching a widening between them.

### Requested ruling: `TAKES_NO_PACKAGE` — the five are right, and the third bare argument is reachable twice

The five members are exactly the two-token `ALLOWED_INVOCATIONS` entries whose third token changes the act;
`npx qfai` and `git diff` / `git rev-parse` are correctly left open, since they legitimately carry more. But
the closure is defeated two ways, both in `B1`: through a command substitution supplying the package
(`npm install $(echo left-pad)`, case `13`) and through the `OPAQUE_AFTER` break in `bareArgumentsOf`
(`npm install -p left-pad`, case `14`). And the one entry the mechanism cannot express is the one-token
`node`, whose dangerous third token is a payload rather than an argument.

## Minor and nit-level

### m1 — `command()` is still 127 lines, and the extraction created a second function over the bar

**Severity: minor.** **Traces to:** `CLAUDE.md` Project Rules ("Keep functions focused; extract when a
function exceeds ~50 lines").

Measured (`tmp/r12-impl/lengths.mjs`, brace-to-brace):

    buildCommand.ts        command      lines 1027-1153 = 127
    buildCommand.ts        readFlag     lines  950-1025 =  76
    shippedLaneCommands.ts commandsOf   lines   57-139  =  83

211 to 127 is real progress and I am not asking for a rewrite. But the rule is ~50, the commit message says
the length "made B4 believable", and the same length is still there at 2.5x — plus a new 76-line function.
`readFlag`'s inline branch (lines 966-979) is a self-contained function of its own, and the manager-consume
block (1012-1023) is another.

### m2 — `invocationOf` line 282 is unreachable

**Severity: nit.** **Traces to:** `defect:code-quality`.

`if (/^[A-Za-z_]\w*=/.test(head) && tokens.length === i + 1) return NOTHING;` cannot fire: the loop above
(line 266) skips every token matching that same regex, so the loop can only break on a token that does not.
A trailing bare assignment already reaches `NOTHING` through `head === undefined` at line 280. It reads as
the guard for the "bare assignment" class in the `NOTHING` docstring, and that class is handled elsewhere.

### m3 — `invocationsOf` and `refusals` are the same loop twice

**Severity: nit.** **Traces to:** `defect:code-quality` (DRY).

Lines 318-333 and 441-463 walk `commandsOf`, call `invocationOf`, skip `NOTHING`, format `UNREADABLE`
identically and skip local functions — then diverge only in the last four lines. The module's own docstring
argues that "two copies of an allowlist is the same defect one size smaller"; two copies of the walk is the
same argument one size smaller again. `refusals` could be
`invocationsOf(body).filter(...)` if the unreadable marker were preserved.

### m4 — 11 of the 13 `HARMLESS_PROGRAMS` members are unused by the tree they were widened for

**Severity: minor.** **Traces to:** `defect:code-quality`.

Measured over the real shipped tree with the parser at HEAD (`tmp/r12-impl/shipped-refusals.mjs`): the
programs the shipped `run:` bodies invoke are `[`, `corepack`, `cut`, `echo`, `exit`, `git`, `grep`, `node`,
`npm`, `npx`, `pnpm`, `printf`, `read`, `tr`, `true`, `yarn`. So of the four members added this round, `[` is
used and `[[`, `test` and `false` are not. Each unused entry is a program allowed with UNEXAMINED arguments —
the exact property that made `git` unsafe on this list one commit earlier. None of the three can reach a build
today (measured, cases `20` and `21`), so this is housekeeping and not a hole; but a list that fails closed
should not carry members the tree does not need.

### m5 — `TC-0003-0038`'s two independent fixture tests are still serial, which is the shape `TC-0003-0039` just fixed

**Severity: minor.** **Traces to:** `defect:code-quality`.

Per-test timings (`--reporter=verbose`, 4.06s total, 3.67s in tests):

    1040ms  a Markdown-only diff selects the minimal (empty) lane set
     996ms  a diff containing source selects the full lane set
    1278ms  all three degraded cases emit a warning annotation   <- the three built CONCURRENTLY
     337ms  the verdict runs under an always-run condition

The first two build a repository each, roughly five sequential git spawns apiece, and are independent — 2.0s
of the 3.67s. `TC-0003-0040`'s first `it` likewise runs two independent `runShell` calls in sequence. Neither
is at risk of its 15s budget, so this is not the timeout the concurrency comment describes; it is the same
structural mismatch at a fifteenth of the cost, in the same file, one describe up.

### m6 — the E2E's shared JSONL log is written by four concurrent processes and parsed strictly; I could not reproduce corruption

**Severity: nit. Low confidence, reported rather than suppressed.**

Four fixture files append one line each to ONE file, at almost the same instant (they start together and
busy-loop the same 700 ms), and `runAt` does `JSON.parse(line)` with no `try`. A torn append would throw a
SyntaxError out of `runAt` rather than failing an assertion. I could not make it happen:

    tmp/r12-impl/append-race.mjs: trials=40 writers=4  clean=40  malformed-line=0  wrong-line-count=0

and the E2E itself recorded 4 of 4 intervals on all 8 runs I took. So the mechanism is theoretically present
and empirically absent at n=40. If it is ever cheap to remove: one file per slot, or a `try` around the parse
that reports the raw line.

### m7 — `orchestratorDocPromise` caches a rejection permanently

**Severity: nit.** **Traces to:** `defect:code-quality`.

`orchestratorDocPromise ??= readFile(...).then(parse)` caches the PROMISE, which is the right choice for the
happy path and means a transient read failure is replayed to every later caller in the worker with no second
attempt. Harmless here (the file is a repository fixture and every caller awaits it), noted because the
docstring justifies caching the promise without mentioning the rejection case.

## A1 — the subject moved under this review: an uncommitted edit landed mid-round and it reddens three tests

**Severity: advisory (it is not the reviewed revision).** **Traces to:** none — reported as an observation the
stage owner has to adjudicate, not as a defect in `45e6f041`.

`HEAD` never moved (`45e6f041` at start and finish). The WORKING TREE did. At start, `git status --porcelain`
was empty. At finish:

    M .qfai/report/validate.log
    M .qfai/report/validate.spec-0017.json
    M packages/qfai/tests/helpers/shippedLaneCommands.ts
    M packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts
    M tests/integration/qfai-traceability.md

None of those five is mine. My three mutation targets — `buildCommand.ts`,
`shippedWorkflowDetection.test.ts`, `vitest.workspace.ts` — are absent from that list, which is the
independent confirmation of the byte comparisons above. Timestamps: the two test files were written at
15:24 and 15:26, after my allowlist probes ran (15:03-15:20). I have NOT reverted any of it — it is someone
else's uncommitted work.

What the edit does, and why it matters to this report:

- It closes exactly ONE of `B1`'s eight rows — the one-line function header — and its comment cites "round 12"
  and the shipped `emit() { … }` construct. Re-running my probe against the current tree: `10-hole-oneline-fn`
  is now refused; `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19` are all **still `[]`**. So `B1` stands
  at seven of eight even against the in-flight fix.
- It also changes `commandsOf` to split on ANY pipe, spaced or not, removing the comment that explained why
  the space was required. That reintroduces the defect the removed comment documented. Measured against the
  REAL shipped tree (`tmp/r12-impl/shipped-refusals.mjs`):

      refusals over the REAL shipped tree: 16
         qfai-tests.yml#detection: <unreadable> *.md
         qfai-tests.yml#detection: LICENSE
         qfai-tests.yml#detection: <unreadable> src/*
         ... (13 more, all fragments of the two case-pattern alternations)

  A split alternation's fragments are no longer arms — they do not end with `)` — so they fall through to the
  glob rule and `LICENSE` returns itself, exactly as the deleted comment said. Three tests are RED in the
  working tree right now:

      tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts   1 failed | 9 passed  (US-0017-0004: "invokes only the
                                                                            programs an adopter's lanes are allowed")
      tests/unit/shippedLaneCommands.test.ts           2 failed | 7 passed  ("accepts the shapes the shipped tree
                                                                            actually contains"; "reads a case arm
                                                                            as a prefix, not as a program")

The prefix rule in `B1`'s suggestion is what makes any-pipe splitting safe, and applying the pipe change
without it is what produced those 16. Snapshots of both files as I found them are in
`tmp/r12-impl/concurrent/` so the diff is recoverable if it is lost.

**And the process point, which is why I am recording this at all.** Round 12's own plant-isolation rule exists
because two reviewers collided in one directory. This is the next step of the same failure: the phase under
review is editing the subject while the reviewers measure it. A reviewer's before/after is meaningless if the
"before" is a moving target — I only know which of my numbers are safe because I took them early and re-ran
the probe. Whatever the sealing step does with these findings, the fix should land as a COMMIT after the round
seals, not as working-tree edits during it.

## Verdict, gates and residual risk

**REVISE.** The request's rule is that `PASS` requires a gate I can state as passed. I can state gates that
passed, and they are worth stating — but not the one this stage rests on.

**Passed, measured at `45e6f041`:**

| gate                                                                              | result                        |
| --------------------------------------------------------------------------------- | ----------------------------- |
| `command()`'s extraction is behaviour-preserving                                  | 121,626 comparisons, 0 differences, probe validated by 3 of 6 planted mutations |
| the suite's own build-classifier corpus                                           | GREEN (1,970 lines, 500 member cases) |
| `tests/e2e/spec0017RunnerParallelismE2E.test.ts`                                  | GREEN, 7.17s, PEAK 1 at one worker and 4 at four |
| `tests/integration/spec0017OwnWorkflowScope.test.ts`                              | GREEN, and non-vacuous in both directions on a copy |
| `TC-0017-0016`'s withdrawal, and its reading of the third departure               | correct                        |
| no further missing `await` in the converted file or its five siblings             | CLEAN under a probe that catches a planted one |

**Failed:** the gate `US-0017-0004` depends on. `refusals()` returns `[]` for seven bodies that execute a
real build or arbitrary code in a shipped lane, and 176 of 248 wrapped forms of the suite's own planted
corpus escape. Six of the seven are root-cause classes the repair does not name, and two of the six are
constructs the shipped tree already contains.

**Residual risks, recorded:**

1. The fail-closed claim is only as strong as the ONE parser that both `refusals()` and the invoked-program
   pin are derived from. Until those two stop sharing `invocationOf`, no assertion in the suite can notice a
   construct the scanner declines to see. Three rounds have now each found a new punctuation mark; the count
   is the argument for the prefix RULE over the next enumeration.
2. `node -e` remains an acknowledged open channel in a tree that uses `node -e`. If `US-0017-0004` is meant
   to hold absolutely, the payload has to be pinned (an exact allowed invocation including its payload) rather
   than declared opaque.
3. Everything in `packages/qfai/tests/**` — 415 files — is unprotected by `tsc` and by every type-aware lint
   rule (`B2`). The three correctness rules are green today, so the window to close it for free is now.
4. `m6`'s append race is present in mechanism and absent at n=40.
5. The working tree is not the reviewed revision (`A1`), and three tests are red in it as I finish.

**Confirmed not taken:** I did not write to `packages/qfai/assets/init/root/.github/workflows/` — no
measurement in this report needed it, because every allowlist finding is a probe of the helpers plus `bash`,
which is where round 11's findings came from too. I did not commit, push or stage anything.

## Addendum — state of the working tree at the moment I finished

`HEAD` is still `45e6f041`. The concurrent edit described in `A1` grew from 5 modified files to 10 while I
wrote this report:

    M .qfai/evidence/atdd-spec-0017.md
    M .qfai/evidence/coverage-depth-spec-0017.md
    M .qfai/report/validate.log
    M .qfai/report/validate.spec-0017.json
    M packages/qfai/tests/assets/coverageDepthMatrix.test.ts
    M packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
    M packages/qfai/tests/helpers/shippedLaneCommands.ts
    M packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts
    M packages/qfai/tests/unit/shippedLaneCommands.test.ts
    M tests/integration/qfai-traceability.md

My three mutation targets are still absent from that list. Re-measuring my frozen probes against the tree as
it stands:

- shipped-tree refusals: back to **0** — the pipe regression I recorded in `A1` has been repaired.
- `node -e` is now pinned by a sha256 of the whitespace-collapsed payload
  (`ALLOWED_NODE_PAYLOADS`), which closes case `16` and residual risk 2, and incidentally case `19` because
  its payload is not on the list. The ENVIRONMENT-ASSIGNMENT class it belongs to is NOT closed: case `17`
  (`GIT_EXTERNAL_DIFF=./ext-diff.sh git diff --ext-diff HEAD`) is still `[]`.
- **Five of `B1`'s eight rows are still open at the moment I finish**: `11` (one-line `case`), `12` and `13`
  (substitution supplies the argument), `14` (`OPAQUE_AFTER` hides the package), `15` (a function name
  shadowed from inside a string), plus `17` / `18` (the assignment channel) — seven bodies in total,
  `ACCEPTED` by a helper that has been edited four times during this round.

Everything in the findings above is dated to `45e6f041`, which is the revision the request names as the
subject. This addendum exists so the sealing step can tell which numbers a re-run will reproduce and which
have already moved.
