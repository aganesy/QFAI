# R03 — qa-gatekeeper, round 20, spec-0017

**Subject revision read:** `2e1d5d9f2` (`docs(cr): open round 20, …`). All code quoted below was read with
`git show 2e1d5d9f2:<path>`. Record pack/response counts were measured at the **working tree**.

- `git rev-parse --short HEAD` at start: `2e1d5d9f2`
- Working tree at start: `git status --porcelain` empty (verified, including `.qfai/report/`).
- `.qfai/report/` copied to `tmp/r20qa/report-backup/` before any validate run.
- Scratch: `tmp/r20qa/`.

**Emphasis:** §3 (the init surface, fifth attempt) and the hard gates.

## Verdict

`REVISE`. One hard gate is red at this working tree and the record certifies it green.
A gate that passed is stated in `Hard gates` below, so the PASS precondition is met on that
axis and the verdict turns on the findings.

## Hard gates — every line re-run at this working tree

| gate | recorded | measured | verdict |
| --- | --- | --- | --- |
| `pnpm ci:lint` | exit 0, all eleven members | exit 0, eleven members all reached | **PASS** |
| `pnpm check-types` | exit 0 | exit 0 | **PASS** |
| `vitest --project e2e` | 1477 passed / 16 skipped, exit 0 | **1 failed / 1476 passed / 16 skipped (1493), exit 1** | **FAIL** — `B1` |
| `vitest --project integration --project unit` | 1239 passed / 19 skipped, exit 0 | 1239 passed / 19 skipped (1258), exit 0 | **PASS** |
| `check-atdd-annotation-ledger.mjs --spec 0017` | 9 claim(s) backed, exit 0 | 9 claim(s) backed, exit 0 | **PASS** |
| `pnpm verify:pack` | exit 0 (ok=16 info=2 warning=1 error=0) | exit 0, `ok=16 info=2 warning=1 error=0` | **PASS** |
| `validate --profile atdd --fail-on error --spec 0017` | `info=2 warning=0 error=1` | `info=2 warning=0 error=1`; `.qfai/report/validate.spec-0017.json` carries the same `counts` | **PASS** |
| `validate --profile full` | rule + deltas; 48 with reports and no summary, 49 just-opened | `info=4 warning=403 error=48`, exit 1, of which **44** `QFAI-REVIEW-007` + 2 `-004` + 1 `-005` + 1 `QFAI-ATDD-112` | **PASS** on the leg I could reach |

**`ci:lint` member count is eleven, and I counted it from `package.json` rather than from the record.**
`format:check`, `lint`, `lint:md`, `check-bidi`, `check-instructions-size`, `check-review-profile-consistency`,
`check-prompt-scanner-pair`, `check-workflow-hygiene`, `lint:shipping`, `lint:workflow-shape`,
`check-pack-locations`. All eleven appear in the transcript at `tmp/r20qa/ci-lint.log`.

**On the full profile.** I could verify the "48 with reports and no summary" leg directly: 48 with my own
report in the pack. I could **not** verify the "49 just-opened" leg, because removing my report did not
return the pack to just-opened — `R02_completion-reviewer.md` landed in it **while my run was in
flight**, so the pack held a report either way and measured 48 both times. The rule is consistent with
both measurements; the 49 leg is unverified this round for that reason and I am not claiming it.
Working-tree pack state at measurement: **65 pack directories / 321 files on disk, 23 directories /
103 files tracked**, against round 19's 64 / 317 / 22 / 98. The decomposition in
`§ "The full profile"` (`44 / 1 / 1 / 0 / 1`) reproduces exactly.

`.qfai/report/` was copied to `tmp/r20qa/report-backup2` and `tmp/r20qa/rb3` before each validate run and
restored from the copy afterwards; `git status --porcelain .qfai/report/` was empty before and after every
run, and `validate.log` was byte-identical (`e9dd5a13…`) at the end. I found it **clean**, not dirty from
another run.

### B1 — `test (e2e)` is red at this working tree, and the block that certifies it says it was re-run

The record's P7 block reads `pnpm -C packages/qfai test:e2e    1477 passed / 16 skipped, exit 0`,
under the sentence "**Every line below was re-run for round 19, and that sentence has to be earned each
time.**" Measured here, at `2e1d5d9f2`, clean tree:

```text
Test Files  1 failed | 88 passed | 4 skipped (93)
     Tests  1 failed | 1476 passed | 16 skipped (1493)
E2E_EXIT=1
```

**The total is right and the colour is wrong.** 1477 is the number of tests that RAN; 1476 passed.
A reader checking the arithmetic — 1477 + 16 = 1493 — confirms the figure and learns nothing about
the leg being red, which is the one property a gate line exists to carry.

The failure is `tests/e2e/spec0017RunnerParallelismE2E.test.ts > … > runs one file at a time at one
worker and several at four`, i.e. **`US-0017-0007`'s runtime proof — the row the Coverage Depth Matrix
rescored to COVERED in round 12 and the row `§ Gaps` item 2 calls "a category error" to have scored
otherwise.** The coverage claim for that story rests on this test observing the pool, and it is not
observing anything:

```text
Error: the fixture suite did not pass at 1 workers (status 1):
  failed to load config from …\Temp\qfai-parallelism-tOOrlc\vitest.config.ts
Error: Cannot find module 'vitest/config'
```

Reproduced three times: in the full project run, in isolation, and with `TMPDIR` redirected into the
repository (where it fails one resolver later, `ERR_MODULE_NOT_FOUND: Cannot find package 'vitest'`).

**It is structural, not a local accident.** `fixture()` writes `vitest.config.ts` into
`mkdtemp(os.tmpdir())` and has it `import { defineConfig } from "vitest/config"`. `vitest` is a
devDependency of `packages/qfai` only — it is absent from the root `package.json` — so a bare specifier
resolves only from inside `packages/qfai/**`. No ancestor of the OS temp directory has it, on any
platform. `pnpm-lock.yaml` pins `vitest@2.1.9` / `vite@5.4.21`, the exact pair installed here, so
`ubuntu-latest` installs the same resolver and `/tmp/qfai-parallelism-*/` has no `node_modules`
ancestor either. I cannot run `ubuntu-latest`, so I state that as the mechanism rather than as a
measurement — but the claim that needs evidence now is "it is green in CI", and this block supplies
none.

Note what the failure is *not*: it is not an assertion about worker counts. It is a **load failure of
the fixture**, the failure class this role is required to refuse as a stand-in for an observation. The
test cannot currently fail for the reason it owns, in either direction.

Required: re-run the line and record the colour it has, and either repair the fixture (a temp dir under
`packages/qfai/`, or a config that imports `vitest/config` by absolute path the way it already imports
`vitest.knobs.ts`) or record `US-0017-0007` as uncovered again with the reason.

### B2 — the fifth route: no shebang, no bit, no listed name — planted in `assets/init/.qfai/`, executed from an adopter tree, every pin green

Shipped and run, not argued.

`initMustNotShip` asks three questions, and its own docstring states the premise that defeats it:
"what made the round-19 payload run was `sh <file>`, **which consults no bit and no offset**". The
round-19 repair then made the *shebang* the detector. `sh <file>` needs no shebang, so a payload author
drops it and keeps the execution path, losing only the marker of intent.

Measured directly against the subject's own exported function (`node --experimental-strip-types`,
importing `packages/qfai/tests/helpers/shippedLaneCommands.ts` at `2e1d5d9f2`):

```text
-- ALLOWED --                      | NO shebang, NO bit, unlisted name  (.qfai/assistant/bootstrap)
arrives executable                 | exec bit, 0755, no shebang
carries a shebang                  | utf8 / utf16le / utf16be BOM + shebang
is a manifest or a script by name  | a/b.sh   /   .agents/hooks/post-checkout
-- ALLOWED --                      | 1200 spaces then shebang
-- ALLOWED --                      | a/b.mts        -- ALLOWED --  | a/Makefile
```

End to end:

1. Planted `packages/qfai/assets/init/.qfai/assistant/bootstrap` — 0644, no shebang, no extension,
   body `printf … > "$HOME/…"`. `assets/init/.qfai/**` is copied by `copyTemplateTree(qfaiAssets,
   destQfai)` in `src/cli/commands/init.ts`, and `.qfai/` is one of the eight `INIT_INSTRUCTION_TREES`
   the path pin and the content pin both exclude.
2. `tests/assets/initAssetsRootMirror.test.ts` **does** redden — but only on mirror inconsistency, not
   on what the file is. Adding the mirrored copy at repo-root `.qfai/assistant/bootstrap` — which
   `pnpm sync:ssot` writes automatically, and which `ci:gate` prescribes as the normal contributor step
   — silences it.
3. With both copies in place: `tests/assets` + `spec0017LayeredCiScaffoldE2E.test.ts` +
   `initE2E.test.ts` → **1355 passed, 66 files, 0 failed**. `pnpm ci:lint` → **exit 0**.
   `sync-init-to-root.mjs --check` → **No drift detected**.
4. `node packages/qfai/dist/cli/index.mjs init --dir <scratch>` put it at
   `<adopter>/.qfai/assistant/bootstrap`, mode 0644.
5. `sh <adopter>/.qfai/assistant/bootstrap` → exit 0, and the file it was told to write existed.
   Payload confirmed executed.

All plants were restored from a copy taken first; `git status --porcelain` is empty and
`sync-init-to-root.mjs --check` reports no drift.

**Why the four round-19 pins do not reach it.** `ALLOWED_INIT_ROOT_ASSETS` walks
`assets/init/root` — a different source tree. `ALLOWED_INIT_PATHS` / `ALLOWED_INIT_CONTENT` exclude
`.qfai/`. `ALLOWED_PROVENANCE_SHAPE` covers exactly one file. `carriesShebang` is answered by omitting
the shebang. The symlink check is not engaged. The pin added this round is at the source tree that
holds **four** files; the source tree that holds **two hundred** still has none.

**And `ci:gate`'s SSOT step cannot close it either.** `ci:gate` runs `pnpm sync:ssot && git diff
--exit-code .qfai/ qfai.config.yaml`. `sync:ssot` (without `--check`) *writes* the mirror, and
`git diff --exit-code` does not see an untracked new file. Demonstrated on this tree: with exactly one
untracked file present under `packages/qfai/assets/`, `git diff --exit-code packages/qfai/assets/`
exited **0**. The script's own docstring names this hazard in the other direction ("an unmodified
tracked file is not a diff") and the new-file direction is the same hole.

The rule the fix needs is the one `ALLOWED_INIT_ROOT_ASSETS` already states for four files, applied to
the tree it excluded — or a kind rule that does not depend on the payload volunteering a marker.

### M1 — the executable-bit claim is TRUE, and the branch it describes is exercised by nothing on any platform

I verified the claim rather than accepting it, and it holds exactly as written.

```text
$ chmod 755 exec755        (no shebang)   ->  ls: -rw-r--r--
$ chmod 644 sheb644        (#!/bin/sh)    ->  ls: -rwxr-xr-x
$ node fs.statSync(...).mode  for all three files  ->  0o100666,  mode & 0o100 === 0
   platform win32, node v24.13.1;  git config core.filemode = false
```

Both halves of the record's sentence reproduce: Node reports `0o666` for every file here, so
`(mode & 0o100) !== 0` can never be true; and Git Bash's `ls` prints the `x` column from the shebang,
opposite to the actual bit in both directions. Round 19's correction of round 18 is **sustained**, and
this stage was right to re-measure it.

**What the record stops short of.** It says "the question stays, because CI runs `ubuntu-latest`, where
git restores the mode and the bit is real". Git restores a mode it *records*, and it records none:
every one of the **191** blobs under `packages/qfai/assets/` at `2e1d5d9f2` is `100644`
(`git ls-tree -r … | awk '{print $1}' | sort | uniq -c` → `191 100644`). Combined with
`core.filemode=false` locally, this repository cannot presently produce the input that would exercise
the branch, on Windows or on Linux.

And nothing supplies one synthetically. `initMustNotShip` has **exactly two callers**
(`spec0017LayeredCiScaffoldE2E.test.ts:622` and `:751`), both of which pass a mode read off a real
filesystem by `stat`/`lstat`. There is no unit test anywhere that calls it with `0o100755`, with a
BOM-prefixed buffer, or with a name from `INIT_MUST_NOT_SHIP`. So of the three questions and the four
`carriesShebang` encodings, **the committed suite exercises only the negative direction of the name
rule and the no-BOM path** — a green walk over a tree that contains none of the triggers.

I confirmed by direct call that all of the branches are functionally correct (the table in `B2`). That
is the point: they work, and no test would notice if they stopped. The oracle for the round-19 repair
is a walk that cannot fail for the reason the repair exists. Recommend a table-driven unit test over
`initMustNotShip` with synthetic `(path, bytes, mode)` triples — it costs one file and makes the three
questions falsifiable on every platform.

### M2 — a third init source tree that no pin walks, whose content ships verbatim into an excluded tree

`ALLOWED_INIT_ROOT_ASSETS`'s docstring says the template root "is the only part of the init source that
is not itself mirrored from somewhere with a guard of its own". There is a third source tree, and it is
not mirrored either.

`syncIntegrationWrappers` step 3.5 (`src/cli/commands/init.ts`) reads
`path.join(getInitAssetsDir(), ".github", "instructions", fileName)` for
`code-review.instructions.md` and `principles.instructions.md`, and writes them to the adopter's
`.github/instructions/` — one of the eight `INIT_INSTRUCTION_TREES`, so excluded from the path pin and
the content pin. `assets/init/.github/` is outside `assets/init/root/`, so `ALLOWED_INIT_ROOT_ASSETS`
does not walk it. `sync-init-to-root.mjs` mirrors `.qfai/**` only, so the SSOT test does not cover it.

Measured: appending one line to `packages/qfai/assets/init/.github/instructions/code-review.instructions.md`
left `tests/assets` + `spec0017LayeredCiScaffoldE2E.test.ts` + `initE2E.test.ts` at **1355 passed / 0
failed**, and the line arrived verbatim at `<adopter>/.github/instructions/code-review.instructions.md`.
Restored from a copy taken first.

These are Copilot custom instructions — the adopter's reviewing agent reads them. That is one tool over
from "a package manager reads a manifest and a shell reads a script", and it is unreviewed content
shipping into every adopter tree. The same is true of the four README bodies
`buildReadmeEntries()` writes (`.agents/README.md`, `.codex/README.md`, `.claude/agents/README.md`,
`.github/agents/README.md`): they are generated from string literals in `init.ts`, land inside excluded
trees, and no pin reads them. Only `.github/copilot-instructions.md`, which lands outside the trees, is
byte-pinned.

### M3 — Gap 10 says sixteen; the table says fifteen, and so does Gap 10's own enumeration

`2e1d5d9f2` is titled "record the **sixteen** unjustified matrix cells rather than inventing reasons",
and `§ Gaps / Open risks` item 10 reads "**sixteen `⚠️` cells across the seven depth columns**".

Counted from the nine table rows of `.qfai/evidence/coverage-depth-spec-0017.md`, over the seven depth
columns only (Status excluded):

```text
US-0017-0001  Error, Special                 US-0017-0006  Oracle
US-0017-0002  Boundary, Comb                 US-0017-0007  Boundary, Special
US-0017-0003  Boundary, Special              US-0017-0008  Normal, Oracle
US-0017-0004  Oracle                         US-0017-0009  Boundary, Special
US-0017-0005  Oracle
                                             depth-column WARN total: 15   (X total: 34)
```

**Gap 10's own list adds to fifteen too**: `-0001` ×2, `-0002` ×2, (`-0003`, `-0007`, `-0009`) ×2 = 6,
(`-0004`, `-0005`, `-0006`, `-0008`) oracle = 4, `-0008` normal = 1. 2+2+6+4+1 = 15. The enumeration
beside the numeral refutes the numeral, in the same sentence.

This is a fresh instance of the class the record calls its own most-repeated error — a count nothing
derives, written one commit ago, in the item whose subject is a count nothing derives. It is also
**unguarded**: `§ "Every ❌ cell, named"` and `coverageDepthMatrix.test.ts` both key on `❌`, exactly as
item 10 says, so no instrument reads this numeral. The `❌` side, by contrast, re-derives cleanly:
34 depth cells + 4 Status, and the class table's `A 23, B 9, C 2` sums to 34.

**On the depth check itself** (this role's `MUST`): the matrix is present at the committed path
`.qfai/evidence/coverage-depth-spec-0017.md`, every `❌` cell is enumerated and assigned a justified
class, and no US/TC is normal-path-only without an answer. The depth gate therefore **passes**. Gap 10's
deferral of the `⚠️` justifications is defensible on its stated ground — sixteen (fifteen) sentences
written to clear a gate are the failure lesson 5 names — but it is defensible only while the numeral
beside it is right, because a deferral that miscounts what is deferred is the same tidy summary in a
different costume. Fix the numeral, keep the deferral.

### M4 — I re-grepped for retracted claims, and the guard's file set omits the one place two of them are live

P1d's fifth pass found the retracted-claims guard "green **because of an omission**, which is why that
guard now searches every governance file for every claim". It does not.

Independent scan: 33 `claim:` needles extracted from `RETRACTED`, 15 files extracted from `GOVERNANCE`,
matched with whitespace-flattening and zero-width stripping over **every tracked `.md` / `.ts` / `.mjs`
/ `.yml` / `.json` file** (`git ls-files`). Result — outside `.qfai/review/**` (historical packs, which
correctly carry the claims as their own findings) and outside the guard's own definition file:

```text
.qfai/specs/spec-0017/tdd/test-list.md   << NOT BLOCKED by a CR >>
.qfai/specs/spec-0017/tdd/test-list.md   << becomes implementable once the pull request has three green >>
.qfai/specs/_policies/08_Decisions.md    << no filters >>
```

`.qfai/specs/spec-0017/tdd/test-list.md` is **not in `GOVERNANCE`**. Both needles stand there as plain
assertions in the `Evidence` cells of `TDD-0069` / `TDD-0070` (verified at the working tree, lines 107
and 108, both rows still `todo`, `DR-ID: -`, `Blocked-By: -`).

The record already knows those exact sentences are refuted — `§ "What the writer must change in the
same edit"` lists them as items 1 and 3 of three, and `RETRACTED` carries both as needles. So the
situation is: the stage identified the claims, retracted them, wrote a guard for them, and pointed the
guard at fifteen files not including the one file the claims are in. The handover excuse ("those cells
are `/qfai-implement`'s to write") explains why they are unfixed; it does not explain why the guard
does not see them, and a guard that is green over a live occurrence is worse than no guard, because
`§ P7` cites it as one of the four instruments that make the record's claims derived rather than typed.

Widen `GOVERNANCE` to include `.qfai/specs/spec-0017/tdd/test-list.md`, and expect it to redden until
the ledger cells are written — which is the correct state for an open handover, and is visible instead
of asserted. See `m1` before widening.

### m1 — a `RETRACTED` needle two generic words wide, already matching unrelated prose

`claim: "no filters"` (`why: "the seal is LF-normalised, not unfiltered…"`) matches
`.qfai/specs/_policies/08_Decisions.md:1827`:

> Rejected option A — simple newest-first JSON list, **no filters**: ships fastest but forces operators
> to pipe through external `jq` …

Nothing to do with the seal, a different spec, and unquoted. It is harmless today only because that
file is outside `GOVERNANCE` — which means the needle cannot survive the widening `M4` requires. The
round asked whether any exemption is wider than the sentence it exempts; the same question applies to
the needles, and this is the answer for one of them. Lengthen it to a span that identifies the claim
(the surrounding clause about the seal), rather than to two words that occur in ordinary prose.

### m2 — the bash oracle's marker path is unquoted, so a temp path with a space inverts every live row

`spec0017LayeredCiScaffoldE2E.test.ts:802` writes the fake bundler as:

```text
#!/bin/sh
printf '%s\n' "npx $*" >> C:/Users/…/qfai-e2e-spec0017-oracle-XXXX/ran.txt
```

The redirect target is interpolated **unquoted**. `os.tmpdir()` here is the 8.3 short name
`C:\Users\YUSUKE~1\AppData\Local\Temp`, so it happens to contain no space; a runner whose `TMPDIR`
does (`C:\Documents and Settings\…`, or a self-hosted agent under `C:\Program Files\…`) makes the
redirect a two-word command, the marker is never written, and **every `live` row reports "did not run"**
— 25 misfilings at once. That is loud rather than silent, so it is a minor, not a blocker; the harness
I wrote to check the corpus quotes the path and I recommend the same one-character fix.

The rest of the skip path is **sound**, and I checked it in the direction the round asked. The guard is

```text
if (bashAt.error !== undefined || bashAt.stdout.trim() !== "ok") {
  expect(bashAt.error, "bash is unavailable, so this oracle did not run").toBeDefined();
  return;
}
```

so the dangerous case — bash resolves but misbehaves (a banner on stdout, a wrapper, a shadowed shell)
— enters the branch with `error === undefined` and the assertion **fails**. A skip cannot read as a
pass here. `PATH` uses `path.delimiter`, correct on both platforms. 34 subprocesses cost 3.4 s in the
required leg, which is acceptable. The lab is removed in a `finally`, so it does not leak on failure.

### m3 — two name-rule gaps and a bound, all reachable by the same route as `B2`

From the direct probe: `a/b.mts` and `a/Makefile` are `-- ALLOWED --`, and so is a file with 1200
spaces before its `#!` (the `carriesShebang` head is `contents.subarray(0, 1024)`). None of these is a
separate route — `B2` already gets through with a plain file — but each is a smaller version of the
same "a name is not a kind" defect the docstring says it fixed, and `.mts` / `.cts` are the two
script extensions the list acquired a gap for when Node learned to run TypeScript.

### A1 — the differential corpus is right: all 34 rows agree with bash, checked with my own harness

The round asked whether the other 32 rows are right. I wrote an independent harness
(`tmp/r20qa/bashoracle.mjs`) — my own fake `npx`, my own lab, my own marker, path **quoted** — and read
only the corpus data out of the subject at `2e1d5d9f2`, never its classification.

```text
rows=34   misfiled=0     (25 live, 9 inert; every live row left the marker, no inert row did)
```

Including the four rows round 19 added and the two it re-filed: `build_once() { … }; build_once` runs,
`if [ -f package.json ]` runs where the file exists, `read v <<EOF>/dev/null` runs the trailing build,
`read v <<E\n"\nE\necho a | %s ")"` runs, and all three quoted-delimiter spellings plus both
double-quoted process substitutions are inert. **Corpus PASS.**

### A2 — `verify:pack`, the scoped gate and the full-profile decomposition all reproduce exactly

- `verify:pack` → `summary: ok=16 info=2 warning=1 error=0`, exit 0. The single warning is
  `traceability.testGlobs: testFileGlobs is empty` in the packed template, which is the seeded config
  the SSOT script's docstring explains.
- `validate --profile atdd --fail-on error --spec 0017` → `counts: info=2 warning=0 error=1`; the one
  error is `QFAI-ATDD-112` naming eight `SPEC-0017:TC-*`; `.qfai/report/validate.spec-0017.json`
  carries the same `counts` object. Cited from the scoped artifact beside the configured
  `output.validateJsonPath`, per `qfai.config.yaml` (`paths.outDir: .qfai/report`,
  `output.validateJsonPath: .qfai/report/validate.json`) — **not** from `validate.log`.
- `validate --profile full` → `info=4 warning=403 error=48`, exit 1, decomposing as
  `44 QFAI-REVIEW-007 + 2 QFAI-REVIEW-004 + 1 QFAI-REVIEW-005 + 1 QFAI-ATDD-112`, which is the
  record's table with `QFAI-ATDD-111` at 0. The `−1 once reports land in it` delta is confirmed.
- `check-atdd-annotation-ledger.mjs --spec 0017` → `9 claim(s) backed`, exit 0.

### A3 — no fourth copy of `isQuotation` / `WORDS`

`packages/qfai/tests/helpers/recordProse.ts` exports both. Three importers and no others across
`packages/qfai/src`, `packages/qfai/tests` and `scripts`:
`coverageDepthMatrix.test.ts` (`isQuotation`), `retractedClaims.test.ts` (both),
`stageEvidenceCounts.test.ts` (`WORDS`). No independent numeral map exists elsewhere. The round's
question is answered **no**.

### A4 — the pack moved under me, and it belongs to this round's sibling

`R02_completion-reviewer.md` appeared in `.qfai/review/review-20260823000000000/` **during** my run —
it was absent when I measured the full profile the first time and present when I re-measured. That is
why I could not verify the "49 just-opened" leg. Not a defect; recorded because `§ "The full profile"`
makes the pack's file state part of a measured figure, and this is a worked example of two reviewers
in one pack invalidating each other's reading of it.

### A5 — the two parked rows are unwritten, as the record says

`.qfai/specs/spec-0017/tdd/test-list.md:107-108`: both `TDD-0069` and `TDD-0070` are `todo`, `DR-ID: -`,
`Blocked-By: -`. The handover table in `§ "Ledger rows advanced"` states this and states that the cells
are `/qfai-implement`'s to write, so I confirm it rather than fault it. **No row advanced this round**,
so there is no RED/GREEN observation to adjudicate: no `Selector` moved, no `GREEN command` is claimed,
and P1d is closed at round 7 on `DR-0017-0010` (not re-opened here). See `M4` for the guard consequence
of the cells staying as they are.

## Gate summary

| gate | status |
| --- | --- |
| validate evidence present and cited from the scoped artifact | **PASS** |
| Coverage Depth Matrix present at the committed path, every `❌` justified | **PASS** (numeral defect `M3`) |
| runtime proof for `US-0017-0007` | **FAIL** — `B1`, the test cannot load its fixture |
| `ci:lint` / `check-types` / integration+unit / `verify:pack` / ledger / scoped gate / full profile | **PASS** |
| `test (e2e)` | **FAIL** — `B1` |
| adopter-surface containment (`§3`) | **FAIL** — `B2` |

**Gates that passed, stated as the verdict requires:** `pnpm ci:lint` (exit 0, eleven members),
`pnpm check-types` (exit 0), `vitest --project integration --project unit`
(1239 passed / 19 skipped, exit 0), `pnpm verify:pack` (`ok=16 info=2 warning=1 error=0`),
`check-atdd-annotation-ledger --spec 0017` (9 backed), and the scoped
`validate --profile atdd --spec 0017` (`info=2 warning=0 error=1`).

## Verdict: REVISE

Two blocking findings: a required CI leg red under a line certifying it green (`B1`), and a fifth live
route by which arbitrary shell code reaches every adopter tree with the whole suite green (`B2`).

Residual risks recorded: `M1` (the round-19 kind-rule repairs have no oracle), `M2` (a third unpinned
init source tree), `M3` (an unguarded numeral one commit old), `M4` (a guard blind to the file its
needles are live in), `m1`-`m3`.

- `git rev-parse --short HEAD` at finish: `2e1d5d9f2`
- `git status --porcelain` at finish: empty apart from this report.
- `.qfai/report/` restored from copy; `validate.log` byte-identical to its pre-run digest
  (`e9dd5a13ac3e2aa30283a5df9de6a096`). It was **clean** when I found it.
- Every plant restored from a copy taken first. No file was `git checkout`-ed.

### A6 — `.qfai/report/` is dirty from another process, and it is not mine

Reported rather than reverted, per this round's instruction.

I restored `.qfai/report/` from `tmp/r20qa/rb3` and verified `git status --porcelain .qfai/report/`
empty, with `validate.log` at `e9dd5a13ac3e2aa30283a5df9de6a096`. At the end of my review the same
command reports:

```text
 M .qfai/report/validate.log            mtime 14:25:27   md5 fffc1aa5aabc8f54f904e0e93d470695
 M .qfai/report/validate.spec-0017.json mtime 14:24:21
```

Both timestamps are **after** my last write to that directory, and `validate.log` now holds an
**unscoped** multi-spec run (`spec-0004`, `spec-0005`, `spec-0007` findings in its tail). I did not
write it. It belongs to the other writer on this branch — most likely this round's
`completion-reviewer`, whose report landed in the pack in the same window (`A4`).

Left in place, deliberately. The scoped artifact it overwrote still reads
`profile: atdd, counts {info: 2, warning: 0, error: 1}`, identical to my measurement, so no figure in
this report is affected. This is the third consecutive round in which `validate.log` has been rewritten
mid-review by a sibling; `§ P7`'s decision not to cite it as Hard Gate evidence is vindicated again,
and the fact that the *scoped* artifact is also shared and also overwritten is worth the record's
attention — `validate.spec-0017.json` is the file `§ P7` **does** cite.
