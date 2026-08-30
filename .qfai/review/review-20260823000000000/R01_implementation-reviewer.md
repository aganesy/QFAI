# R01 — implementation-reviewer, round 20, spec-0017 (ATDD stage)

**Verdict: REVISE** (stated in full at the end of this file).

## Provenance of this review

- **Code pinned to `2e1d5d9f2`**, the commit that opened this pack. Every subject file quoted below
  was read with `git show 2e1d5d9f2:<path>` and executed from a copy of those bytes at
  `tmp/r20impl/shippedLaneCommands.subject.ts`.
- **The record's counts were measured at the working tree**, per the brief. The working tree is
  clean: `git status --porcelain` (whole repo, not just `packages/`) returned empty at start, so
  HEAD, the working tree and the pinned revision are the same bytes here. Nothing in this review
  needed the split that round 19 required.
- `git rev-parse --short HEAD` at start: **`2e1d5d9f2`**. `git status --porcelain packages/` at
  start: **empty**. Both recorded again at the end.
- **Method: execution, not reading.** A fake `npx` on `PATH` records its arguments to a marker file
  and exits 0; each candidate body runs through `bash -c` in a fresh lab with the marker cleared
  first. Every corpus string was **extracted from the subject's own bytes** by brace-matching the
  array literal and evaluating it (`tmp/r20impl/extract.mjs`), never transcribed — what I ran
  through bash is exactly what the test runs through `maskOf`.
- **The heredoc hazard is real and it bit me once.** My first oracle script was written through a
  quoted shell heredoc and came out with one backslash eaten: a two-character escape written as
  backslash-backslash-n in the JS source arrived in the file as backslash-n, so the fake bundler's
  `printf` format string held a literal newline instead. `cat -A` caught it before any measurement
  was taken. Every
  script after that was written with **no backslash escapes at all** — newlines and quotes are built
  from `String.fromCharCode` — and each was checked with `cat -A` or `grep -c` before it was run.
- **I modified nothing under `packages/`.** There were no plants in the tracked tree, so there was
  nothing to restore. All work is under the repository-root `tmp/r20impl/` (gitignored).

`bash` here is MSYS/Git-Bash 5.2.37 at `/usr/bin/bash` (`MINGW64_NT-10.0-26200`), which is what Node
resolves; `os.tmpdir()` is `C:\Users\YUSUKE~1\AppData\Local\Temp` (a short name, no space in it —
that turns out to matter, see **M2**).

## What passed

Stated first and explicitly, because the brief requires a nameable passed gate.

#### Gate: all 34 rows of the decoration corpora are filed correctly against bash

The brief asks whether the 32 rows the stage did not correct are right. **They are, and so are the
two it corrected.** I ran all 25 `LIVE_DECORATIONS` and all 9 `INERT_DECORATIONS` through bash
myself, with my own fake `npx`, extracted from `2e1d5d9f2`'s bytes rather than transcribed
(`tmp/r20impl/oracle.mjs`, results in `tmp/r20impl/oracle-result.json`):

```text
misfiled=0 of 34
nonzero-exit=0
syntax-bad=0
```

Every `live` row wrote the marker; no `inert` row did. I additionally ran each row through `bash -n`
— which the subject does not do — and every one of the 34 is syntactically valid, so no `inert` row
is scoring a parse error as a shell decision today (see **m2** for why that is luck rather than
design). The two rows round 19 refiled are both right on this platform: `build_once() { %s; }` is
now called, and `if [ -f package.json ]` runs because the harness writes a `package.json` into the
lab.

#### Gate: the oracle's positive control is real, and the `inert` half is not vacuous

The obvious way for this test to lie is for the fake `npx` never to be reachable — then no row
writes the marker, all 9 `inert` rows "agree", and the test is a tautology. It cannot: the 25 `live`
rows are the positive control, in the same lab and the same `PATH`, and any failure to reach the
fake bundler reddens all 25 of them at once. I confirmed the marker content is written by the fake
(`npx-ran-with tsup`, my own spelling) and not by a real `npx`. This is the right shape for the
instrument and it answers the gate's residual from round 19.

#### Gate: `tests/unit/shippedLaneCommands.test.ts` and the layered-CI e2e file are green at HEAD

`vitest run --project unit tests/unit/shippedLaneCommands.test.ts` — 13 passed, 427 ms.
`vitest run --project e2e` over the whole project — 88 files passed, 1476 tests passed, including
every test in `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`. One file failed, and it is not this
one; see **M3**.

#### Gate: the temp lab is not leaked on an assertion failure

`mkdtemp` happens before the `try`, everything else is inside it, and `rm(lab, { recursive: true,
force: true })` is in the `finally`, so the `expect(misfiled).toEqual([])` throw cleans up on its
way out. `GITHUB_OUTPUT` is inside the lab. That holds — with one measured exception in **M2**.

## Findings

### B1 — two here-documents opening on ONE line: `pendingData.find` masks only the first, and one quote character in the second's data disarms `refusals()` for the rest of the body (twelfth spelling, executed)

**Issue.** `hereDocAt` computes `dataStart` as "the character after the end of the operator's line",
which is correct only for the **first** here-document opened on that line. bash reads the bodies of
several openers **consecutively**: for `read v <<A <<B`, A's data comes first and B's data starts
where A's closer ends. The subject gives both openers the same `dataStart`.

`codeMask` then looks the region up by that field:

```ts
const here = pendingData.find((region) => region.dataStart === i);
```

`find` returns the **first** match. With two openers on one line both regions carry the same
`dataStart`, so only A's region is jumped; B's region is never entered, never masked, and the walk
continues **through it as code**. A single `"` in B's data then drives the mask's quote state for
everything after — which is precisely round 19's blocker, re-entered through the bookkeeping that
was added to close it.

`commandsOf` does **not** have this bug (it tracks `heredocEnd` and jumps to the last opener's
`dataEnd`), so the two walks disagree again — the eighth "two walks, one question" divergence on
this file, and the second one inside the reader they were given to share.

**Executed.** Fake `npx` on `PATH`, `bash -c`, `tmp/r20impl/lexprobe2.mjs`. Four spellings where
**bash runs the build and `refusals()` returns the empty array**:

```text
FAIL-OPEN P1 bashRan=true refusals=[]
      commandsOf=["read v <<A <<B","echo a | npx tsup \")\""]
FAIL-OPEN P4 bashRan=true refusals=[]
      commandsOf=["read v <<A <<-B","echo a | npx tsup \")\""]
FAIL-OPEN P6 bashRan=true refusals=[]
      commandsOf=["read v <<A <<B <<C","echo a | npx tsup \")\""]
FAIL-OPEN P7 bashRan=true refusals=[]
      commandsOf=["echo x <<A <<B","echo a | npx tsup \")\""]
```

P1 as a body, with the same shape the corpus uses:

```text
read v <<A <<B
A
"
B
echo a | npx tsup ")"
```

**The mask, dumped over that body** (`tmp/r20impl/maskdump.mjs`; `|` is a newline, `C` = the mask
says CODE, `.` = masked):

```text
body : read v <<A <<B|A|"|B|echo a | npx tsup ")"
mask : CCCCCCC...C...C.C.......................C.
```

A's data (`A`) is masked. B's data (`"`) is **not** — the walk reaches the `"` as code, opens a
quote, and masks the newline, `B`, the whole last line and the closing quote. The only code position
left after it is the `)`. `commandsOf`'s `isAlternation()` scans forward over code positions from
the `|`, finds that `)` before any `;`, newline or `(`, and reads a real pipe as a `case` arm — so
the line never splits, `invocationOf` reads the leading `echo`, and `npx tsup` is invisible.
`echo` and `read` are both name-allowed, so nothing else in the body is refused either: the array is
empty, not merely missing one entry.

**Why this is blocking.** `refusals()` is the only gate over shipped `run` bodies for
`US-0017-0004` ("invokes only the programs an adopter's lanes are allowed to invoke",
`tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`). The module's own thesis is that it "fails
CLOSED"; here it fails open, and the differential test cannot see it because the corpus has no row
with two openers on one line.

**Suggestion.** The regions are sequential, not coincident. Give `hereDocAt` an origin parameter —
the previous opener's `dataEnd` on the same line, defaulting to the operator line's end — and thread
it through both walks, so the second opener searches for its closer **after** the first's. Then
`codeMask` can keep `find`, and `commandsOf`'s `heredocEnd` becomes "the last opener's `dataEnd`" by
construction rather than by coincidence. If that is too large a change now, the minimal repair in
`codeMask` is to jump to the **maximum** `dataEnd` over every region whose `dataStart === i`, which
closes the fail-open half but leaves **M1**.

**Regression row.** Add to `LIVE_DECORATIONS` (verified: bash runs it, and the differential test
reddens on it with the right message — the `npx tsup` span is masked, so it lands in `misread` as
"live but masked", which correctly names the mask as the thing to fix):

```text
"read v <<A <<B\nA\n\"\nB\necho a | %s \")\""
```

**Severity:** blocking
**Traces to:** `defect:correctness` — `packages/qfai/tests/helpers/shippedLaneCommands.ts`,
`codeMask` (`pendingData.find`) and `hereDocAt` (`dataStart`); it defeats the assertion at
`tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` that carries `US-0017-0004`.

### M1 — the same root cause in the other direction: a second delimiter's word inside the first's data makes `commandsOf` read four lines of DATA as commands and refuse them

**Issue.** `heredocEnd` in `commandsOf` is overwritten by each opener on the line, so it ends up
holding the **last** opener's `dataEnd`. That is the right answer only when the last opener's closer
is the furthest one — which is coincidence, not a property. When the second delimiter's word appears
inside the first here-document's data, `hereDocAt` matches the second closer **early** (it searches
from the operator line's end, so it sees the first document's data), `heredocEnd` moves backwards,
and the walk resumes inside data.

**Executed** (`tmp/r20impl/m1probe.mjs`; bash prints `done` and does not run the build):

```text
read v <<A <<B
B
npx tsup
A
bdata
B
echo done
```

```text
bashRan=false  bashStdout="done"
refusals=["npx tsup","A","bdata","B"]
commandsOf=["read v <<A <<B","npx tsup","A","bdata","B","echo done"]
```

Four lines of here-document data are read as commands and all four are refused. This direction is
fail-CLOSED, so it is not a security hole — but the module's own doc comment records why it matters
anyway: sixteen false refusals over the shipped tree were treated as a defect in round 12 for the
same reason, "a refusal nobody can act on because there is nothing there to fix". If a shipped lane
ever prints a script containing its own second delimiter, a required CI leg goes red with a message
naming lines that are not commands.

**Suggestion.** The same repair as **B1**: each opener on a line searches for its closer starting at
the previous opener's `dataEnd`, not at the operator line's end. Then `heredocEnd` is the last
opener's `dataEnd` and is correctly the furthest.

**Severity:** major
**Traces to:** `defect:correctness` — `packages/qfai/tests/helpers/shippedLaneCommands.ts`,
`hereDocAt` (`dataEnd` search origin) and `commandsOf` (`heredocEnd`).

### M2 — the bash oracle interpolates the marker path into the fake `npx` UNQUOTED, so on any runner whose temp path contains a space it reports 25 false misfilings and writes a file OUTSIDE its own lab

**Issue.** `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`, in the oracle:

```ts
await writeFile(
  path.join(bin, "npx"),
  `#!/bin/sh\nprintf '%s\\n' "npx $*" >> ${marker.split(path.sep).join("/")}\nexit 0\n`,
  { mode: 0o755 },
);
```

The redirection target is a bare interpolation. `mkdtemp(path.join(os.tmpdir(), ...))` inherits
whatever `os.tmpdir()` is, and on Windows that is `TEMP`, which is frequently
`C:\Users\First Last\AppData\Local\Temp` when the profile name has a space and short-name
generation is off. It is a short name on this machine, which is the only reason the oracle works
here.

**Executed** (`tmp/r20impl/spacetest.mjs`, reproducing the subject's exact `npx` body against two
lab paths):

```text
lab="nospace"     markerWritten=true   exit=0  stderr=""
   stray files in lab: ["bin","ran.txt"]
lab="with space"  markerWritten=false  exit=0  stderr=""
   stray files in lab: ["bin"]
```

```text
$ find spacelab -maxdepth 2 -type f
spacelab/nospace/ran.txt
spacelab/with            <- written OUTSIDE the lab
```

Two things are wrong, and the second is the worse one:

1. **The diagnosis is inverted.** `sh` splits the redirect at the space, writes to a file named
   `.../with`, and **exits 0 with no stderr**. The marker is never created, so all 25 `live` rows
   report `live but bash did not run it` — 25 findings that all name the corpus when the harness is
   what is broken. A guard whose failure mode is silence is worse than none; a guard that fails
   loudly with the wrong subject is close behind, and this one would send the next round back into
   the corpus.
2. **It escapes the lab.** The test's own comment says `GITHUB_OUTPUT` is pointed inside the lab
   "so that no decoration writes outside it". In this configuration the fake bundler itself writes
   one directory up, and the `finally` block's `rm(lab, …)` does not remove it — so the test leaks
   a file on every one of the 25 rows, on exactly the platform where it also fails.

**Suggestion.** Single-quote the path in the generated script, and reject a path that contains a
single quote rather than escaping it: `>> '<path>'`. Better still, pass the marker through the
environment (`>> "$QFAI_ORACLE_MARKER"`) — the harness already builds a custom `env`, so the path
never has to survive a round trip through shell quoting at all.

**Severity:** major
**Traces to:** `defect:correctness` — `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`,
the `writeFile(path.join(bin, "npx"), …)` call in `agrees with bash about which decorations actually
run a build`.

### M3 — `spec0017RunnerParallelismE2E.test.ts` is reproducibly RED on this platform at HEAD, by exactly the mechanism the record says "does not apply"

**Issue.** Running the e2e project at `2e1d5d9f2` — clean tree, nothing planted — gives:

```text
 Test Files  1 failed | 88 passed | 4 skipped (93)
      Tests  1 failed | 1476 passed | 16 skipped (1493)
 FAIL |e2e| tests/e2e/spec0017RunnerParallelismE2E.test.ts >
   E2E: the declared worker axis is honoured by the runner, not merely declared (US-0017-0007) >
   runs one file at a time at one worker and several at four
```

The failure, reproduced a second time with that file alone (727 ms, so it is not a timeout or a
contention artifact):

```text
Error: the fixture suite did not pass at 1 workers (status 1):
  failed to load config from C:\...\Temp\qfai-parallelism-ygZkmB\vitest.config.ts
  Error: Cannot find module 'vitest/config'
  Require stack:
  - C:\...\Temp\qfai-parallelism-ygZkmB\vitest.config.ts
```

`fixture()` writes `import { defineConfig } from "vitest/config";` into a directory under
`os.tmpdir()` and runs vitest with `--root dir`. A **bare specifier** cannot resolve from a path
outside the workspace under pnpm's layout — there is no `node_modules` anywhere above the temp
directory (I checked every ancestor: `Temp`, `Local`, `AppData`, the profile, `C:\Users`, `C:\`).

**This is the same mechanism round 12's `R03 B2` named, and the record retracts it as false.**
`.qfai/evidence/atdd-spec-0017.md`, lines 598-601:

> **`R03 B2` — "`QFAI-ATDD-111`'s closure rests on a test that is red at HEAD".** Not reproduced. The
> test passes at HEAD, twice measured, in 6.3s; the mechanism given (a bare `vitest/config` import
> unresolvable from `os.tmpdir()`) does not apply, because vitest resolves its own config imports
> through its own loader.

The stated reason is wrong: vitest does **not** resolve that import through its own loader — Vite
bundles the config and `require`s the externalised specifier from the config file's own location,
which is what the require stack above shows.

**What I can and cannot conclude.** CI run `32553054491` on this branch reports `test (e2e)`
**success** on `ubuntu-latest`, so the test does pass there and the required leg is not red. So the
correct statement is not "the test is red" but "**the test is platform-dependent, and the record
refuted a true observation with a false mechanism**". Round 12's reviewer was measuring on this
platform; the round-13 rebuttal was measured on a different one and generalised. The consequences
are both real:

- `US-0017-0007`'s only behavioural coverage — the carrier that closed `QFAI-ATDD-111` — cannot be
  run by a Windows contributor. `pnpm -C packages/qfai test` is red for them, at HEAD, on a clean
  tree.
- A false mechanism in the record is worse than a retracted finding, because it tells the next
  round not to look. Lesson 5 is about exactly this shape.

**Suggestion.** Two lines fix the test and remove the platform dependence: emit the fixture config
as a plain object literal (`export default { test: { ... } }` — Vitest accepts one; `defineConfig`
is only a typing helper), or add a `resolve.alias` for `vitest` pointing at
`PACKAGE_ROOT/node_modules/vitest`. Either way the fixture stops depending on where `os.tmpdir()`
sits relative to a `node_modules`. Separately, the record's `R03 B2` entry needs re-retracting: the
finding was true, the mechanism was true, and only the platform was unstated.

**Ownership.** `spec0017RunnerParallelismE2E.test.ts` last changed at `0af376e2d`, well before this
round, so this belongs to an earlier stage rather than to round 19's repairs. Reported here per the
brief's instruction to report cross-session findings.

**Severity:** major
**Traces to:** `defect:correctness` — `packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts`
(`fixture()`), and `.qfai/evidence/atdd-spec-0017.md` lines 598-601.

### M4 — 34 serial `bash` subprocesses in a required leg, measured at 11 961 ms under the project's own contention against a declared 15 000 ms `testTimeout`

**Issue.** The brief asks whether 34 subprocesses in a required leg is acceptable. Measured, four
ways, on an otherwise idle machine:

| condition | duration |
| --- | --- |
| the 34 `bash -c` spawns alone, no runner (`tmp/r20impl/timeit.mjs`) | 4 362 ms / 5 332 ms |
| the test alone in the `e2e` project, warm, three runs | 5 247 / 5 269 / 4 903 ms |
| the test alone in the `e2e` project, first ever run (cold) | **26 652 ms** |
| the test inside the whole `e2e` project, 10 workers, `fileParallelism: true` | **11 961 ms** |

`vitest.knobs.ts` declares `testTimeout: 15_000` on every project and the test passes no override.
Under the project's own declared contention the margin is **20 %**, and the cold observation is
**78 % over the limit**. `poolOptions.forks` runs `isolate: true` with no retries — the knobs file
records that omission as deliberate, which is right, and it also means one slow spawn is a red
required leg with no second chance.

This is not a hypothetical: the cold run is the state a CI runner is always in.

**Why it is major and not minor.** The other 1 476 tests in this project cost 154 s in total; this
one test is 8 % of the whole `e2e` leg's test time by itself, and it is the only test in the
repository that spawns a shell 34 times serially. The instrument is the right one — I argued for it
under **What passed** — so the answer is not to delete it but to make its cost declared rather than
inherited, in the same spirit as `vitest.knobs.ts`'s own docstring about declared-versus-inherited
values.

**Suggestion.** Declare an explicit timeout on this `it(...)` (`{ timeout: 120_000 }`), so the
budget is a reviewable number next to the thing that spends it rather than a project default it is
quietly close to. Optionally batch the corpus: one `bash -c` per row is 34 shell startups, and the
same measurement can be had from one shell that clears the marker, runs a row and prints a line per
row — but that trades the per-row isolation for speed, so the timeout is the change I would make
first.

**Severity:** major
**Traces to:** `defect:code-quality` — `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`,
`agrees with bash about which decorations actually run a build`, against
`packages/qfai/vitest.knobs.ts` `projectKnobs.testTimeout`.

### m1 — when `bash` is absent the oracle PASSES; it does not skip

**Issue.** The skip path:

```ts
const bashAt = spawnSync("bash", ["-c", "printf ok"], { encoding: "utf-8" });
if (bashAt.error !== undefined || bashAt.stdout.trim() !== "ok") {
  expect(bashAt.error, "bash is unavailable, so this oracle did not run").toBeDefined();
  return;
}
```

I attacked this four ways, and three of the four are honest:

- **bash exists but misbehaves** (a `BASH_ENV` that prints, a WSL stub with no distro): `error` is
  `undefined`, so `toBeDefined()` **fails**. Loud, correct.
- **the fake `npx` is shadowed**: it cannot be — `bin` is prepended to `PATH` — and if it were, all
  25 `live` rows redden at once. Loud, correct.
- **the marker cannot be written**: `rm(marker, { force: true })` swallows `ENOENT` but not
  `EPERM`, so it throws out of the loop and the `finally` still cleans up. Loud, correct.
- **`bash` does not resolve at all**: `error` is defined, the assertion passes, and the test
  `return`s. Vitest reports it as **passed**, not skipped. This is the one failure mode the brief
  names — a skip that reads as a pass — and the comment beside it ("Skipping is honest") describes
  behaviour the code does not have.

`PATH` separators are fine here: `path.delimiter` is `;`, and MSYS converts a Windows-form `PATH` on
entry — proven by the 34 rows running. (Under a WSL `bash` it would not, but that path is caught by
the `stdout !== "ok"` branch or by 25 loud row failures.)

**Suggestion.** Take the test context and call `ctx.skip()`, so the reporter says `skipped` and a
run on a runner without a shell cannot be read as 34 verified rows. One line:
`it("agrees with bash …", async (ctx) => { … ctx.skip(); })`.

**Severity:** minor
**Traces to:** `defect:code-quality` — the early-return branch of the oracle in
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`.

### m2 — the oracle discards `status`, `stderr` and the marker's contents, so it cannot tell "bash decided not to run this" from "bash could not parse it"

**Issue.**

```ts
spawnSync("bash", ["-c", shape.replace("%s", BUILD_DECORATION)], { cwd: lab, env, … });
const ran = await access(marker).then(() => true, () => false);
```

The result object is dropped on the floor. An `inert` row that is a **syntax error** never writes
the marker, so it scores as a confirmed `inert` — and the mask, which is what the row exists to
anchor, is meanwhile lexing text that bash rejected outright. The same blindness applies to a row
whose `npx` ran with different arguments than the corpus intends: the marker is only checked for
existence, never for content, though the fake bundler goes to the trouble of recording `npx $*`.

**No live impact today.** I ran `bash -n` over all 34 rows and all 34 parse; all 34 exit 0. So this
is a property of the instrument rather than a defect in the corpus — but the whole point of
committing the oracle was that the corpus is a set of claims about bash, and the instrument
currently cannot distinguish two of the ways a claim can be wrong.

**Suggestion.** Two assertions, both free: run `bash -n` on each shape first and fail on a non-zero
status (a corpus row must at least be a shell program), and when `ran` is true assert the marker's
last line equals `npx tsup`.

**Severity:** minor
**Traces to:** `defect:code-quality` — the `spawnSync` / `access` pair in the oracle in
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`.

### A1 — two residuals in the oracle's environment assumptions that I could not demonstrate here, recorded so the next round does not have to rediscover them

Neither is a change I am asking for; both are things a runner could do to this test that this
platform cannot.

- **`noexec` on the temp filesystem.** The fake `npx` is created with `mode: 0o755` inside
  `os.tmpdir()`. On a hardened Linux host where `/tmp` is mounted `noexec`, the bundler cannot be
  executed and all 25 `live` rows redden — a required leg failing for a host policy, with a message
  that names the corpus. If the oracle ever moves to a self-hosted runner, put the lab under the
  workspace rather than under `os.tmpdir()`.
- **`rm(lab, { recursive: true, force: true })` uses the default `maxRetries: 0`.** One corpus row
  (`echo x <\ #y & %s`) backgrounds a process. On Windows a surviving handle turns the `finally`
  into an `EBUSY` throw that both leaks the lab and replaces the real assertion message with the
  cleanup's. It did not happen in any of my five runs, so this is a note, not a measurement;
  `maxRetries: 3` would remove the question.

**Severity:** advisory
**Traces to:** none — this adds no obligation and asks for no change. Recorded under
`Advisory / Change Request proposals` per `drift-protocol.md#reviewer-originated-obligations`; no
Change Request is proposed, because nothing already approved changes.

## Direct answers to the brief's questions

**§1 — "Is it sound, and can it lie?"** Sound in shape: the 25 `live` rows are a genuine positive
control for the 9 `inert` ones, so the instrument cannot pass by being disconnected. It can lie in
one way (**m1**, bash absent reads as passed) and it can fail with the wrong subject in one way
(**M2**, a space in the temp path). The marker, the `PATH` prefix and the unwritable-marker case are
all honest.

**§1 — "Are the other 32 right?"** Yes. All 34 verified against bash by me, independently, from the
subject's own extracted bytes: `misfiled=0 of 34`.

**§1 — "34 subprocesses in a required leg, and does it leak the temp dir on failure?"** The cost is
**M4**. It does not leak on an assertion failure — the `finally` is correctly placed — but it does
leak a file **outside** the lab in **M2**'s configuration, and **A1** records the one cleanup path
I could not exercise.

**§2 — "A twelfth spelling."** Found: **B1**, four spellings of it, executed. bash runs the build
and `refusals()` returns `[]`.

**§2 — "Is the region bookkeeping right when two here-documents open on one line, or when one opens
inside another's data?"** No, in both directions. Two on one line is **B1** (fail open); one
delimiter's word inside the other's data is **M1** (fail closed). One root cause: `hereDocAt`
computes every opener's data region from the **operator line's end**, which is only true of the
first opener, so two openers on one line get identical `dataStart` values and possibly inverted
`dataEnd` ones.

**§2 — "Is `pendingData.find` on every character correct rather than merely working today?"** It is
not correct. It is not a cost problem — the list is at most a handful of entries and the scan is
O(n·k) with a tiny k — it is that `dataStart === i` is not a key. It is unique only because no line
in the current corpus opens two here-documents, and `find` silently returns the first of several
equal keys instead of failing. Under the repair suggested in **B1** the field becomes a real key and
`find` becomes correct; without the repair, `find` returning `undefined` for the second region is
indistinguishable from there being no region.

## Scope

My emphasis this round was §1 and §2, and that is where the work went. I did not audit §3 (the init
surface), §4 (the four record guards, the `isQuotation` / `WORDS` fourth-copy question, the region
terminators) or §5 (the record's counts and lessons), except where **M3** touches the record's
`R03 B2` entry directly. Those belong to `qa-gatekeeper` and `completion-reviewer` in this pack, and
nothing below should be read as a clearance of them.

## Audited evidence hash

```text
Round: 20
Result: REVISE
Reviewed revision: 2e1d5d9f2 (code and record; the working tree is clean, so they coincide)
Audited evidence hash: 9ee5f27faacd234926a61947af2d57013abdde430c8f046c94a89aa24a6b9a2a
Authored/edited under review: none
```

Subject per `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`, **Stage review**
branch — the ledger `.qfai/specs/spec-0017/tdd/test-list.md` carries 84 rows and **none of them has
`Layer: E2E`**, so there is no per-row `### <TDD-ID>` section for this review to extract and the
stage construction is the applicable one. It is also the construction round 19's `R01` used, so the
two are comparable.

Construction: `.qfai/evidence/atdd-spec-0017.md` whole **minus** its `## Final status` section, plus
`.qfai/evidence/coverage-depth-spec-0017.md` whole; each normalized by step 2 (LF, trailing
whitespace stripped per line, leading/trailing blank lines dropped, exactly one final newline);
serialized as `path + NUL + sha256(normalized)`, sorted by path, joined with newlines; SHA-256 of
that record list. Computed by me, on the bytes I read, with `tmp/r20impl/hash.mjs`.

Excluded extent, with fence tracking: lines **2780-3097** of 3097, heading
`## Final status (PASS/FAIL) + who confirmed`, running to EOF — no `#` / `##` heading follows it
outside a fence. Per-artifact digests:

- `.qfai/evidence/atdd-spec-0017.md` = `d008dc3fa78baf2a4c2034c7688c58dd426070a3001d071f433132ef057861c0`
  (213 731 normalized bytes)
- `.qfai/evidence/coverage-depth-spec-0017.md` = `7f7d83b13ee63d9142191cd0a3d6e7a67cf3ad5affd2d4891e7d9fb13ef74b5a`
  (39 643 normalized bytes)

The second digest is **byte-identical to the one round 19's `R01` recorded**, which is a useful
cross-check that my normalization matches its predecessor's; the first has moved, as it must — the
record was edited this round.

## Verdict

**REVISE.**

Gates that passed, named because the brief requires a passed gate to be nameable:

- **All 34 decoration rows agree with bash**, verified independently, from the subject's own
  extracted bytes, with my own fake bundler: `misfiled=0 of 34`. The two rows round 19 refiled are
  right, and so are the other 32. The brief's central §1 question is answered in the affirmative.
- **The oracle's shape is sound**: the `live` half is a real positive control for the `inert` half,
  so the instrument cannot pass by being disconnected from the shell. Committing it was the right
  answer to round 19's gate residual, and I would keep it.
- **All 34 rows are valid shell** (`bash -n`, status 0) and all 34 exit 0, so no `inert` row is
  currently scoring a parse error as a shell decision.
- `tests/unit/shippedLaneCommands.test.ts` — 13 passed at HEAD.
- `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — every test green at HEAD, inside a full
  `--project e2e` run of 88 passing files and 1 476 passing tests.
- The temp lab is not leaked on an assertion failure.

What blocks: **B1**. A build that bash runs while `refusals()` returns the empty array — the twelfth
spelling, in four executed forms, defeating the only gate over shipped `run` bodies for
`US-0017-0004`. Its cause is the bookkeeping round 19 added to close the eleventh: `pendingData`
keys regions by a `dataStart` that is not unique, so the second here-document opened on a line is
never masked and one quote character in its data disarms the scan for the rest of the body. **M1**
is the same root cause failing the other way. One repair — give each opener on a line a search
origin at the previous opener's `dataEnd` — closes both.

Findings: **B1** blocking; **M1**, **M2**, **M3**, **M4** major; **m1**, **m2** minor; **A1**
advisory. Eight `###` headings, which is what `summary.json` should derive from.

`git rev-parse --short HEAD` at finish: **`2e1d5d9f2`** — unchanged from start.

`git status --porcelain packages/` at finish: **not empty**, and the difference is **not mine**:

```text
?? packages/qfai/assets/init/.qfai/assistant/bootstrap
```

That is a live plant by a concurrent reviewer in this pack — a 70-byte payload
(`PAYLOAD_R20=1` / `printf "R20 PAYLOAD EXECUTED" > "$HOME/r20-pwned2.txt"`), written at 14:17,
attacking §3's init surface. **I did not create it and I have deliberately not removed it**: it is
another role's measurement in flight, and deleting it would destroy their result exactly as round
19's rule warns. Every measurement in this report was taken **before** it appeared — my last runner
invocation was at 14:14:47 — so none of my numbers include it. It must be removed before anything
on this branch is committed; whoever planted it owns that.

I modified nothing under `packages/`. There were no plants in the tracked tree from me, so there was
nothing of mine to restore. Nothing was committed.

#### Reproduction kit

Left under the repository-root `tmp/r20impl/` (gitignored) so **B1**, **M1** and **M2** can be
re-run rather than re-derived; delete it once the stage has acted on them.

- `shippedLaneCommands.subject.ts` — `git show 2e1d5d9f2:packages/qfai/tests/helpers/shippedLaneCommands.ts`,
  unmodified.
- `extract.mjs` / `corpora.json` — the `LIVE_DECORATIONS` / `INERT_DECORATIONS` / `BUILD_DECORATION`
  values brace-matched out of the subject's own bytes and evaluated, so nothing was transcribed.
- `oracle.mjs` / `oracle-result.json` — the independent bash oracle over all 34 rows, with
  `status`, `stderr`, `bash -n` and marker contents recorded (the four things the subject drops).
- `lexprobe.mjs`, `lexprobe2.mjs` — the here-document differential; `lexprobe2.mjs` is B1's four
  executed spellings.
- `maskdump.mjs` — the `codeMask` dump quoted in B1.
- `m1probe.mjs` — M1's fail-closed direction.
- `spacetest.mjs` / `spacelab/` — M2, the unquoted marker path, both lab names.
- `timeit.mjs` — M4's 34-spawn stopwatch.
- `vt/` — the minimal Vitest project used to confirm that `testTimeout` does fire for a
  `spawnSync`-blocking async test, so M4's margin is a real one.
- `hash.mjs` — the audited-evidence-hash computation.
