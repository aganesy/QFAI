**Verdict: REVISE.**

# R03 — `qa-gatekeeper`, round 12, spec-0017 (`/qfai-atdd` stage gates)

## Provenance and isolation

| item | start | finish |
| ---- | ----- | ------ |
| `git rev-parse --short HEAD` | `45e6f041` | `45e6f041` (did not move) |
| `git status --porcelain` | empty | empty |
| `sha256` over `find .qfai/report -type f \| sort \| xargs sha256sum \| sha256sum` | `90ae4d6a…8a00c6` | `90ae4d6a…8a00c6` |
| `.qfai/report` file count | 1543 | 1543 |

`validate` was run against a `git archive HEAD` shadow root at `tmp/r12-qa/shadow` with all **83** tracked
symlinks re-materialised as relative-target symlinks (`links ok=83 fail=0`), so the working tree's
`.qfai/report/` never moved — confirmed by the identical hash above.

**Plants, and their reverts.** I planted once, in the directory this round assigns to me:

```text
packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml
  before  sha256 581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee   11241 bytes
  planted sha256 962cb83845931a0c7220792d68d34b3c07839eb2b9b3ce2e49a61b279cfe7377   11643 bytes
  after   sha256 581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee   11241 bytes
  BYTE-IDENTICAL: True     (tmp/r12-qa/plant.py revert, and `git status --porcelain` empty)
qfai-validate.yml untouched throughout: 08e79f77a91b59c60b15d3e517341dcf18561b09397f804564f3a58c9bd1c7f6
```

No other file in the subject was mutated. The parallelism measurement in **B3** is taken in throwaway
trees under `tmp/r12-qa/` and touches neither `vitest.knobs.ts` nor any config. Two `node_modules`
symlinks created under `tmp/r12-qa/` for that measurement were removed with `rm <link>` (never a
recursive delete of the holding directory) and the store verified intact afterwards.

I saw no file in the workflows directory that I had not written. `qfai-extra.yml`, round 11's collision,
did not reappear.

## Gate summary

| gate | status | evidence |
| ---- | ------ | -------- |
| Stage gate `validate --profile atdd --fail-on error --spec 0017` | **FAIL** — exit **1**, `info=2 warning=0 error=1` | shadow root; `tmp/r12-qa/validate.out`; `QFAI-ATDD-112` over **7** TCs |
| `QFAI-ATDD-111` (US obligations) | **reported closed, not sound** | absent from the gate output; but its ninth carrier is red at HEAD — **B2** |
| `QFAI-ATDD-112` (TC obligations) | **open, 7 rows**; parking verified **5 of 7** | `TC-0017-0016`, `-0032`…`-0035` verified against their CRs; `-0069`/`-0070` not parked in the ledger — **B6** |
| Runtime proof (suite totals, exit codes, callsite line) | **FAIL** | `--project e2e` at HEAD: `1 failed \| 1442 passed \| 16 skipped`, **exit 1**; § P7 certifies `1440 passed … exit 0` and `error=2` — **B4** |
| `e2e callsites at this tree: 879` | **PASS** | independently measured **879** over the project's two globs (`tmp/r12-qa/callsites.py`, 89 files) |
| Coverage Depth Matrix exists at the committed path | **PASS** | `.qfai/evidence/coverage-depth-spec-0017.md`, tracked |
| Matrix internal arithmetic (totals, partition, class sizes) | **PASS** | re-derived by hand: `✅3 / ⚠️1 / ❌5`; 38 depth `❌`; `A 30 / B 7 / C 1` — all hold |
| Matrix agreement with the tree; every `❌` justified | **FAIL** | the `US-0017-0007` row and both its sections still say *not covered / claim withdrawn*; its 7 `❌` rest on a retracted reason — **B5** |
| Test-case depth (normal + error path per obligation) | recorded | every scored row carries both columns; the five `Status = ❌` rows carry neither, by class A |
| Allowlist / shipped-lane assertion (`US-0017-0004`) | **FAIL** | 3 of 4 real builds planted in the shipped `unit` lane shipped unnoticed through 2829 tests — **B1** |
| `uses:` / `with:` channel at job and step level | closed for the shapes I could reach; a **sibling** channel is open | `container`/`services`/job-level `uses` all refused; `shell:` is read by nothing — **B1**, X4 |
| Prototyping evidence | **N/A** | no `.qfai/evidence/calibration.yaml`, no UI surface declared by `spec-0017`; nothing owed |

**A gate that passed:** the callsite line `e2e callsites at this tree: 879` reproduces exactly, and the
Coverage Depth Matrix's own arithmetic — the thing round 1 broke — reproduces exactly. Neither is enough
for a stage PASS: the stage gate itself exits 1, and four of the gates above fail.

## Blocking findings

### B1 — Three of four real builds planted in the shipped `unit` lane shipped unnoticed; the rebuilt allowlist's `NOTHING` still swallows a command's tail

The repair's argument is that splitting `undefined` into `NOTHING` (provably invokes nothing) and
`UNREADABLE` (a refusal) closes holes nobody enumerated. It does not. The **function-definition header**
class — one of the five the round-12 request names as "a place a command can hide" — returns `NOTHING`
for the whole command *including its tail*, which is the same head/tail defect the repair fixed for
keywords and `case` arms and did not fix here.

**The plant.** I replaced the shipped `unit` lane's placeholder step with the step an adopter would write
when filling it in (`tmp/r12-qa/plant.py`, diff above):

```yaml
      - name: unit lane
        shell: bash
        run: |
          # X1
          build_once() { pnpm -C packages/qfai build; }
          build_once
          # X2
          echo x|npx tsup
          # X3
          node -e "require('child_process').execSync('pnpm build',{stdio:'inherit'})"
      - name: unit lane via a custom shell
        shell: npx tsup {0}          # X4
        run: |
          echo noop
```

**The run.** `./node_modules/.bin/vitest run --project e2e --project integration --project unit --project scripts`
from `packages/qfai` — the four projects containing all six test files that read the shipped workflow
directory. `tmp/r12-qa/planted-run.log`:

```text
 Test Files  3 failed | 265 passed | 8 skipped (276)
      Tests  3 failed | 2791 passed | 35 skipped (2829)
```

One of those three is `spec0017RunnerParallelismE2E` and is red without any plant (**B2**). The other two
both name **X2 only**:

```text
FAIL |e2e|  spec0017LayeredCiScaffoldE2E > … (US-0017-0004) > ships no lane that runs its own bundler build
  + Array [ "qfai-tests.yml#unit [build]: echo x|npx tsup" ]
FAIL |unit| buildCommand.test.ts > the real workflow trees > finds no build in the shipped tree …
  + Array [ "qfai-tests.yml::echo x|npx tsup" ]
```

`grep -c build_once` and `grep -c execSync` over the whole 3865-line run log both return **0**. So
**X1, X3 and X4 shipped unnoticed through 2829 tests**, and the one thing caught was caught by
`classifyBuildCommand` — the instrument this record says cannot converge — not by `refusals()`.

**Measured at the helper, one construct at a time** (`tmp/r12-qa/probe1.mts`, `probe2.mts`, run with
`node <file>.mts`; the helper is imported directly from `packages/qfai/tests/helpers/`):

```text
refused  npx tsup                                       (control)  refusals = ["npx tsup"]
ESCAPED  f() { npx tsup; }\nf                                      refusals = []
           commands = ["f() { npx tsup", "}", "f"]
           invocations = ["<NOTHING>", "<NOTHING>", "f"]
ESCAPED  echo x|npx tsup                                           refusals = []   invocation "echo x|npx"
ESCAPED  [ -f package.json ]|npx tsup                              refusals = []   invocation "["
ESCAPED  node -e "require('child_process').execSync('pnpm build')" refusals = []   invocation "node"

and against BOTH instruments, for the exact planted body:
  body     = "f() { pnpm -C packages/qfai build; }\nf\n"
  refusals()             -> []
  classifyBuildCommand() -> none  on every line
```

**Why X1 is the sharpest of the four.** The construct is already in the shipped file:
`qfai-tests.yml:79` is `emit() { echo "lanes=$1" >> "$GITHUB_OUTPUT"; }`, and
`invocationOf` returns `NOTHING` for it (`tmp/r12-qa/probe3.mts`). Its tail happens to be `echo`, so no
one noticed the tail was being discarded. `localFunctionsOf` then reports `emit` / `build_once` as a local
function, and `refusals()` skips the *call* on that basis — so the definition hides the body and the
definition's own existence excuses the call. The helper's docstring says "whatever the function itself
runs is scanned on its own", which is true only of the **multi-line** brace form; measured, the one-line
form is `NOTHING`.

`build_once() { pnpm -C packages/qfai build; }` is `pnpm … build`, the first entry the corpus claims to
refuse, in one line, in a shipped lane, with both instruments silent. That is the same result as rounds
8-11 (10/11, 18/20, 34/40, 18/20, 44/50, 15/18) reached by a different door, so the repair's claim to have
closed the class is not established.

**The other three, briefly.**

- **X2** is the documented `spacedPipe` concession — "the unspaced form is legal shell that nobody uses".
  It is legal shell that **runs**: `bash -e -o pipefail -c 'echo x|tee ran-p02.txt'` writes the file
  (`tmp/r12-qa/execproof.sh`, exit 0). The allowlist missed it; only the deprecated classifier saw it, and
  only because `npx tsup` survives as literal text on the line — a spelling match, which is exactly the
  property the inverted instrument was adopted to stop depending on.
- **X3** is `node` allowed by exact invocation with `OPAQUE_AFTER` short-circuiting at `-e`. The docstring
  concedes "a payload is opaque to any scan" and allows it anyway, so `US-0017-0004`'s claim is defeated by
  a construct the instrument permits by design. `bash -c 'node -e "…writeFileSync…"'` executes (exit 0).
- **X4** is a channel neither instrument reads at all. `grep -rn '\["shell"\]\|"shell"'` over
  `packages/qfai/tests/` and `packages/qfai/scripts/` returns only `buildCommand.ts`'s internal
  `kind: "shell"` discriminant — **no assertion reads a step's or a job's `shell:` key**, while the shipped
  tree sets it six times. A custom shell template names a program and hands it a file, which is the
  `uses:`-with-`arguments:` channel one document level down. This is the request's item 2 answered: the
  `uses:`/`with:`/`container:`/`services:` reading is now sound for the shapes I could construct — a
  job-level `uses:`, a local composite action, a `docker://` image and a non-enumerated input key are all
  refused — and `shell:` is the sibling key that was not brought with them.

**Negative results, so "I found nothing here" is testable.** These I tried and could **not** get past
`refusals()`: `git -c alias.x='!npx tsup' x` (refused — `-c` is in `OPAQUE_AFTER`, so the head is bare
`git`, which is no longer allowed by name); `X=$(npx tsup)` and backticked / `<( )` / `>( )` substitution
(all descended into and refused); a multi-line function body (`npx tsup` on its own line is refused);
`bash -c 'npx tsup'` (refused on `bash`); `${{ matrix.cmd }}` (refused); `$BUILD` (refused);
`pnpm -p build`, `npx -p esbuild tsup`, `node --loader=x build.mjs` (all refused). A third bare argument
past `TAKES_NO_PACKAGE` I could not reach either — `npm install left-pad extra` is refused with its extra
arguments named.

**One more instance of the same root cause, for the record:** `invocationOf` returns early for
`[` and `[[` (`if (head === "[" || head === "[[") return head`) **without recursing into the rest**, so the
tail after a bracket test is discarded exactly as the function header's is. Measured:
`[[ -n x ]]|pnpm build` → invocation `[[` → allowed. The request asked whether any of the four new
`HARMLESS_PROGRAMS` members can reach a build; `[` and `[[` can, by that early return.

### B2 — `QFAI-ATDD-111`'s closure rests on a test that is red at HEAD: the fixture cannot load, so the peak-concurrency assertion never runs

`tests/e2e/spec0017RunnerParallelismE2E.test.ts` **fails at `45e6f041`, on a clean tree, with no plant**,
in 1.13 s:

```text
$ cd packages/qfai && ./node_modules/.bin/vitest run --project e2e tests/e2e/spec0017RunnerParallelismE2E.test.ts
EXIT=1
Error: the fixture suite did not pass at 1 workers (status 1): failed to load config from
  C:\Users\…\AppData\Local\Temp\qfai-parallelism-IEMK5G\vitest.config.ts
Error: Cannot find module 'vitest/config'
Require stack:
- C:\Users\…\AppData\Local\Temp\qfai-parallelism-IEMK5G\vitest.config.ts
 ❯ runAt tests/e2e/spec0017RunnerParallelismE2E.test.ts:170:11
 ❯ tests/e2e/spec0017RunnerParallelismE2E.test.ts:202:22
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
```

`tmp/r12-qa/parallelism-alone.log`, reproduced identically inside the four-project run
(`tmp/r12-qa/planted-run.log`, failure 2 of 3, temp dir `qfai-parallelism-izKLXa`).

**The cause is structural, not this machine.** `fixture()` writes the generated `vitest.config.ts` into
`os.tmpdir()` (line 107) and that file opens with a **bare specifier**,
`import { defineConfig } from "vitest/config"` (line 116). Node resolves a bare specifier by walking
parent directories for `node_modules`; from `%TEMP%` — or from `/tmp` on `ubuntu-latest` — there is none.
`--root dir` does not change resolution: the stack shows the failure at the config file's own path.

I checked whether *anywhere* in this repository would resolve it, because pnpm's layout is the second half
of the cause. Writing the same fixture to `tmp/r12-qa/flatA/` — inside the workspace — fails too:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest' imported from
  C:\…\QFAI\tmp\r12-qa\flatA\vitest.config.ts.timestamp-….mjs
```

because `vitest` lives in `packages/qfai/node_modules`, not at the repository root. So the only directories
from which this fixture can load are under `packages/qfai/`, and the test writes it to `os.tmpdir()`. There
is no machine on which the assertion runs.

**What this costs the stage.**

1. The gate's move from `error=2` to `error=1` — the headline result of round 12 — is the closure of
   `QFAI-ATDD-111` by an annotation on a **failing** test. `check-atdd-annotation-ledger.mjs --spec 0017`
   reports `9 claim(s) backed by a test annotation (spec-0017), exit 0`; I ran it. It checks annotation
   **presence**, so it cannot see this, and neither can `validate`, which round 1 established reads the
   ledger only. The record's own § "Round 1" calls an annotation over a gap "precisely the false
   certification `CR-20260814-0001` describes", and withdrew `US-0017-0007` for a carrier that at least
   passed. This carrier does not.
2. **The "falsified four ways, all reddening" claim is not discriminating.** A load error reddens. With the
   test red before any mutation, "the mutation reddened it" distinguishes nothing — including mutation 4,
   the rename that the record says exposed the self-referential oracle. There is no
   `§ Execution logs` entry for this test at all: § Execution logs carries `E*`, `M*`/`X*`/`Y*`/`Q*`,
   `C*`, `W*`, `R*`, `G*` series and nothing for the one test that closed the gate.
   `grep -n "spec0017RunnerParallelism" .qfai/evidence/atdd-spec-0017.md` returns exactly one line (449),
   in prose.
3. Under the Oracle Strength Check this row has **no admissible GREEN**: no recorded `GREEN command`, no
   recorded output showing the row's own selector passing, and the command that exists exits 1.

`tests/assets/coverageDepthMatrix.test.ts:446` is the guard added to stop a restoration being a relapse.
It asserts `/peakConcurrency\(/.test(carrier)` and `/spawnSync\(/.test(carrier)` — **presence of two
tokens in the source text**. It is green. That is the "a claim about how code is *written* rather than what
it *does*" class this record names as its own recurring defect, applied to the guard that was supposed to
prevent this exact relapse.

### B3 — The parallelism oracle is blind to the one way the axis actually goes inert, because its fixture flattens the root/project split it exists to police

The story's subject is that a declared knob can be inert. `vitest.knobs.ts`'s docstring records the
instance: a project-level worker declaration "type-checked, it ran, it emitted no warning — and it did
nothing". The split is the whole point of the module — `rootKnobs` at root, `projectKnobs` per project.

The fixture spreads **both halves into one flat `test:` block**
(`spec0017RunnerParallelismE2E.test.ts:121-122`):

```ts
`    ...rootKnobs,`,
`    ...projectKnobs,`,
```

so it cannot express a project scope, and it honours the worker axis whichever of the two objects carries
it. Move `maxWorkers` from `rootKnobs` to `projectKnobs` and the real suite loses the axis while the
fixture keeps it.

**Measured**, in two throwaway trees under `tmp/r12-qa/` (`mkfixture.py`, `peak.py`; four files each
busy-holding 700 ms, the same shape and hold as the subject; peak computed by the same endpoint sweep):

```text
tree    shape                                                     QFAI_TEST_MAX_WORKERS  intervals  peak
flatC   the SUBJECT's fixture: {...rootKnobs, ...projectKnobs}                        1          4     1
flatC   the SUBJECT's fixture                                                         4          4     4
projC   the REAL repository shape: the tunable axes spread PER PROJECT                1          4     4
projC   the REAL repository shape                                                     4          4     4
```

`flatC` reproduces both of the subject's assertions (1 at one worker, >1 at four). `projC` — the axis
declared at project scope — runs **four files at once with the override pinned to 1**. The axis is inert,
the override does nothing, and the subject's fixture cannot be put into that state, so it would still pass.

That is the fifth way the request asks for, and it is not exotic: it is the exact mistake the knobs module
was written to record. The test's own listed mutation 1, "declaring the axis at a scope the runner
ignores", is the mutation its fixture is structurally unable to observe — and given **B2**, whatever was
observed when it was "measured reddening" was the load error.

**And the counter-evidence, because it changes what this finding is about.** That regression is *not*
undefended: `tests/scripts/vitestWorkspaceKnobs.test.ts:156` loads the real config modules by import and
asserts both halves of the split — `ROOT_ONLY = ["maxWorkers", "minWorkers", "fileParallelism"]`
(line 103) must be shaped at root, and *"a root-only option declared on a project is a declaration nothing
reads"* must find none. So my `projC` mutation would redden a **sibling declaration test**.

Which is the finding. The E2E test's stated reason for existing is that the eight siblings "all assert
DECLARATIONS" and none asserts the effect. On the one inertness mode that exists for this axis, the
declaration test is the instrument that discriminates and the effect test is the one that cannot — its
fixture flattens the very distinction the declaration test polices. Take **B2** together with this and the
restored `US-0017-0007` claim rests on a test that (a) does not run and (b) adds no measured discriminating
power over the coverage the story already had. That is the shape round 1 withdrew the claim for; the file
name and the mechanism are new, the standing of the claim is not.

Secondary, on soundness rather than blindness: I could not make the oracle flake. At four workers `peak`
was 4 in every run, on a machine with the suite otherwise idle and with it loaded. The `> 1` threshold with
a 700 ms busy hold is a reasonable choice and I have no evidence against it. What I can say is that the
assertion has never run in this repository, so its flake rate is unmeasured rather than low.

### B4 — The runtime-proof block certifies an exit code, a suite total and a gate value the tree does not produce

`§ P7 quality gates` states its numbers are *"measured at the working tree of this commit, which carries
every repair through round 11"*. Measured at `45e6f041`:

| § P7 line | certified | measured |
| --------- | --------- | -------- |
| `pnpm -C packages/qfai test:e2e` | `1440 passed / 16 skipped, exit 0` | `1 failed \| 1442 passed \| 16 skipped (1459)`, **exit 1** |
| `node … validate --profile atdd --spec 0017` | `info=2 warning=0 error=2` | `info=2 warning=0 error=1`, exit 1 |

Commands: `cd packages/qfai && ./node_modules/.bin/vitest run --project e2e`
(`tmp/r12-qa/e2e-only.log`, the whole project, nothing planted) and the shadow-root gate run above
(`tmp/r12-qa/validate.out`). The `error=2` line is stale by the very change this round is about — the
record's own § "The gate moved" says `error=1` — so the block that exists to be the runtime proof
contradicts the record's headline.

The exit code matters more than the count. `tests/assets/**` and `tests/e2e/**` are the `e2e` project's two
globs and `e2e` is a required CI matrix leg, so `test (e2e)` is **red from a clean checkout** at this HEAD,
and `ci-pass` derives from it. Round 5 found this same class ("this block certified `exit 0`" while a
`tests/assets/**` test was red) and the record names it as such; it has recurred.

**The count is wrong in a way the record's own arithmetic predicts.** The stated rule is
`left column = 1422 + (callsites − 858)`. At this tree the callsites are **879** (independently measured;
see below), so the rule gives `1422 + 21 = 1443`. Measured total non-skipped: `1442 passed + 1 failed = 1443`.
The record's own derivation is exactly right and the number it certifies, 1440, is three short.

**The e2e sequence is six callsites behind its own stated invariant, and nothing checks that.** The
invariant, quoted from the record: *"any commit that changes an `it` / `test` callsite under the e2e
project's two include globs owes a row in the sequence below"*. The last row is `7af579c3 1437 873`.
`git log --oneline 7af579c3..HEAD --name-only -- packages/qfai/tests/e2e packages/qfai/tests/assets`
returns **eight** commits that touch those globs — `54a25be6`, `1b842190`, `0408248f`, `ab940aa2`,
`699202b4`, `b510843b`, `737d009b`, `0da0e4d8` — and **no rows were added**. The measured count is 879 against the last row's 873.

`stageEvidenceCounts.test.ts:361` is titled *"keeps the e2e sequence's last row current with the callsites
it counts"* and its body deliberately does not do that — it compares the standalone
`e2e callsites at this tree: N` line and says so at line 401. That line is correct
(**879 measured = 879 stated**, `tmp/r12-qa/callsites.py`, 89 files across the two globs, same
`/^[ \t]*(?:it|test)(?:\.\w+)*[\s(]/` rule) and it is the one runtime-proof number that verifies. The
sequence beside it, and the totals derived from it, are not guarded and are stale.

### B5 — The Coverage Depth Matrix still records `US-0017-0007` as uncovered; its seven `❌` cells rest on a reason the record itself retracts

The matrix is the committed governance record this gate audits, and its arithmetic is sound — I re-derived
every total by hand from the table's own cells: `Status` `✅3 / ⚠️1 / ❌5` over nine rows; depth `❌` per
row `3,1,2,6,6,6,7,5,2` = **38**; classes `A 30 / B 7 / C 1` = 38; class A membership is exactly the
`Status = ❌` rows' `❌` columns; class B is exactly `State transitions`/`Combinatorial` on the four rows
whose `Status ≠ ❌`; class C is the single cell it names. Round 1's defect has not recurred.

What has not been updated is the matrix's relationship to the tree. At `45e6f041` it says, in four places:

```text
:4-5    "**Eight are covered; `US-0017-0007` is not** — its claim was withdrawn in round 1 and the row
         is scored as the gap it is."
:53     US-0017-0007 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌      (7 depth cells, all ❌)
:132    class A | US-0017-0007 | Normal path … Combinatorial, Oracle strength
:347    "### US-0017-0007 — runner parallelism derived from QFAI's own workload: ❌ and NOT COVERED"
:349    "No knob file ships. … an adopter receives no declared worker or file-parallelism setting."
:353    "**The coverage claim for this row has been withdrawn.**"
:361-2  "`QFAI-ATDD-111` reports this story again, deliberately. It becomes coverable when the knobs ship."
```

Every one of those is contradicted by the tree: `QFAI-ATDD-111` is **absent** from the gate output, the
ledger carries `QFAI:SPEC-0017:US-0017-0007` (`tests/e2e/qfai-traceability.md:220`), and
`spec0017RunnerParallelismE2E.test.ts:46` carries the annotation.

**And the `❌` cells are unjustified, which is the part that makes this a REVISE rather than a nit.** The
contract is one justification per cell. Those seven cells are justified by class A, whose stated reason is
*"The shipped surface does not exist, so no depth is reachable"* — reworded at `:349` as "No knob file
ships". The record's own § at line 440-447 retracts exactly that: *"'no knob file ships' … was never the
obstacle"*, *"the subject is the OWN repository, not the shipped scaffold"*, and it calls the earlier
reading "a category error". So the reason carrying seven `❌` cells has been withdrawn in the evidence
record and left standing in the committed matrix. `Oracle strength ❌` is the worst of the seven: its
justification is *"its sole assertion was that `qfai.config.yaml` exists"*, which describes a describe
block that no longer exists.

The guard permits this deliberately — `coverageDepthMatrix.test.ts:458` says *"The scores are the matrix
owner's to raise now that the story is covered, so this no longer demands all-❌"* — so the guard was
updated for the restoration and the matrix was not. Per this role's ATDD-cycle standard (a missing matrix
**or one whose `❌` cells are unjustified** is a REVISE), this is blocking.

What the row honestly scores is a separate question I am not deciding: given **B2** the carrier does not
run, so `Oracle strength` cannot yet be raised above `❌` on the evidence — but the *reason* recorded for
the `❌` must be the real one, and it is not.

### B6 — Two of the seven `QFAI-ATDD-112` rows are not parked anywhere the ledger can see, and the record's "same set" claim is false in both directions

The gate output, verbatim from the shadow root:

```text
[error] QFAI-ATDD-112 … tests/integration/** -> SPEC-0017:TC-0017-0016, TC-0017-0032, TC-0017-0033,
        TC-0017-0034, TC-0017-0035, TC-0017-0069, TC-0017-0070
counts: info=2 warning=0 error=1
```

Seven, as the brief states. Verified per row against `tdd/test-list.md` and `.qfai/decisions/`:

| TC | ledger `Status` | ledger `Blocked-By` | decision artifact | its `Status` / `Approved option` | its `Blocked set` names the row? | verdict |
| -- | --------------- | ------------------- | ----------------- | -------------------------------- | -------------------------------- | ------- |
| `TC-0017-0016` | `blocked` | `CR-20260818-0007` | `CR-20260818-0007` | `open` / `-` | yes — `spec-0017 TDD-0016 (TC-0017-0016)` | **verified** |
| `TC-0017-0032` | `blocked` | `CR-20260820-0007` | `CR-20260820-0007` | `open` / `-` | yes | **verified** |
| `TC-0017-0033` | `blocked` | `CR-20260820-0007` | ” | ” | yes | **verified** |
| `TC-0017-0034` | `blocked` | `CR-20260820-0007` | ” | ” | yes | **verified** |
| `TC-0017-0035` | `blocked` | `CR-20260820-0007` | ” | ” | yes | **verified** |
| `TC-0017-0069` | **`todo`** | **`-`** | `CR-20260820-0012` | `open` / `-` | yes — `spec-0017 TDD-0069` | **not parked in the ledger** |
| `TC-0017-0070` | **`todo`** | **`-`** | `DR-0017-0010` | `PASS` at P1d pass 6 | n/a (a `DR`, not a blocked set) | **not parked in the ledger** |

Extracted with
`awk -F'|' 'NR>38 && NF>8 {print $2, $7, $9}' .qfai/specs/spec-0017/tdd/test-list.md`
(6 `blocked`, 2 `todo`, 74 `refactor`) and `grep -nE "^- (ID|Status|Approved option|Blocked set|Class):"`
over each decision file.

**The two `todo` rows contradict the claim in words, not just in status.** `test-list.md:107` and `:108`
open their `Evidence` cells with *"NOT BLOCKED by a CR - waiting on data that does not exist yet"* — for
`TDD-0069`, whose `Blocked-By` per `CR-20260820-0012` is that very CR. The record's § "Ledger rows
advanced" is honest about this (`:775-778`: *"Neither ledger cell has been written… those cells are
`/qfai-implement`'s to write"*), and I am not asking this stage to write them. What is blocking is that a
different section states the opposite as a fact.

**Three statements to correct.**

1. `:470-471` — *"For the first time the uncovered set and the recorded-blocked set are the same set."*
   False both ways. Uncovered minus ledger-blocked = `{TC-0017-0069, TC-0017-0070}`. Ledger-blocked minus
   uncovered = `{TC-0017-0030}` — `TDD-0030` is `blocked` on `CR-20260820-0001` (`Status: open`,
   `Blocked set: spec-0017 TDD-0030 (TC-0017-0030)`) **and its TC is covered**, which the same paragraph
   says two sentences earlier. Read "recorded-blocked" as the union of the open CRs' blocked sets instead
   and it is worse: that set additionally holds `TDD-0052`, `-0066`, `-0067`, `-0074`, `-0075`
   (see **A2**), all `refactor` and all covered.
2. `:114` — the Delta Rejected Guard discharges `CR-20260820-0012`'s rejected option 3 with
   *"`TDD-0069` is `blocked` with a `Blocked-By`"*. It is `todo` with `-`. This is the same shape as
   round 1's first finding: a false statement of fact in the one section whose job is discharging that
   question, refuted by line 776 of the same file.
3. `:757` and `:759-760` — § "Coverage obligations checklist", the section this gate reads for the
   coverage obligation, still says *"`US-0017-0007` — **not covered**, deliberately. Claim withdrawn;
   `QFAI-ATDD-111` reports it"* and *"the 8 uncovered are the 6 `blocked` and 2 `todo` rows …
   `QFAI-ATDD-112` names exactly those eight"*. Measured: `QFAI-ATDD-111` reports nothing, and
   `QFAI-ATDD-112` names **seven**, a set that is neither "the 6 blocked and 2 todo" (that set contains
   `TC-0017-0030`) nor of size eight. `§ Test volume estimate:746` carries the same staleness
   (`E2E | 9 | 8 | … except -0007, withdrawn in round 1`).

## Advisory findings

### A1 — Ruling on the `TC-0017-0016` withdrawal: complete, honest, and the unannotated test is the right residue

Asked for explicitly, so ruled explicitly. **The withdrawal holds.** Measured:

```text
$ grep -rn "TC-0017-0016" packages/qfai/tests/
  spec0017OwnWorkflowScope.test.ts:10,16,19,70,71,111   (prose and comments only)
  workflowHygiene.test.ts:33                            (prose only)
$ grep -n "QFAI:SPEC-0017" packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts
  127:// QFAI:SPEC-0017:TC-0017-0030
```

No `QFAI:SPEC-0017:TC-0017-0016` annotation exists anywhere in the test tree; the gate reports the row
again; `TC-0017-0030`'s annotation is present and its TC is correctly absent from the finding. The
withdrawal is materially complete, not merely narrated — which is the failure mode that made round 1's
`US-0017-0007` withdrawal checkable only after two reviewers looked.

**Honest, and unusually so.** `spec0017OwnWorkflowScope.test.ts:70-81` states the reason at the site: the
CR is open, `Class: intent`, its `Blocked set` names the row, its recommended Option A *is* what the test
asserts, and `Approved by:` / `Approved option:` are both `-`. I confirmed all five fields in
`CR-20260818-0007`. The reasoning — that discharging a gate finding by adopting a recommendation resolves
an intent question a stage has no authority to resolve, and does it invisibly because the gate goes quiet —
is correct and is the right call.

**The reading is also right.** The third departure is necessary, not an over-grant:
`release.yml#github-release` needs `contents: write` to create a release, and the test's own comment says
so. So the case's "exactly two" is stale rather than the tree being over-permissioned, and asserting the
measured three while reporting the disagreement is the correct choice over bending the assertion — the
opposite choice is what `US-0017-0004` spent ten rounds doing.

One qualification, which is why this is an advisory rather than a clean pass. The test is unannotated but
it is not inert: it hard-asserts Option A's expected set (`toEqual([ci-pass {}, github-release
{"contents":"write"}, publish {…}])`) as a CI gate. Approving Option B or C therefore reddens CI at the
moment of approval. The header comment says exactly that, so nobody is misled — but "the test claims
nothing" (`:78`) overstates it: it claims nothing about **coverage** while still enforcing one reading of
the contested term. Worth one sentence in the CR's own `Options` block so the approver knows a test
changes with the decision.

### A2 — `CR-20260820-0007`'s blocked set claims nine rows; five of them are `refactor`

```text
CR-20260820-0007  Status: open
  Blocked set: `spec-0017 TDD-0032, TDD-0033, TDD-0034, TDD-0035, TDD-0052, TDD-0066, TDD-0067,
                TDD-0074, TDD-0075` — all nine, held while this CR is open
tdd/test-list.md: TDD-0032..0035 = blocked;  TDD-0052, TDD-0066, TDD-0067, TDD-0074, TDD-0075 = refactor
```

Five rows an open CR says are "held" are implemented, annotated (none appears in `QFAI-ATDD-112`) and at
`refactor`. Either the CR's blocked set is over-broad and should be narrowed to the four, or five rows were
implemented past a hold. Not this stage's artifact to fix — it is `/qfai-implement`'s CR — but it is the
reason **B6**'s "same set" claim cannot be rescued by reading "recorded-blocked" generously, so it belongs
in this report.

### A3 — The gate that closed is guarded only by an annotation-presence check, which is a known-insufficient oracle

`scripts/check-atdd-annotation-ledger.mjs --spec 0017` reports
`9 claim(s) backed by a test annotation (spec-0017)`, exit 0 — I ran it. It is the instrument the record
substituted for `validate` after round 1 showed `validate` reads only the ledger. It checks that a claim's
id appears in a test file. It cannot see **B2** (the carrier fails), it could not have seen round 1's
vacuous assertion either, and `CR-20260820-0011` is on file about 127 ledger entries with no annotation at
all — the converse gap. The record should stop describing this script as verification of coverage and
describe it as verification of *registration*, which is what it measures.

### A4 — `stageEvidenceCounts.test.ts:361`'s title says it guards the sequence's last row; its body says it does not

The title is *"keeps the e2e sequence's last row current with the callsites it counts"*; lines 401-405
explain why it compares the standalone `e2e callsites at this tree:` line **instead**, and the reasoning is
good. The consequence is **B4**: the sequence went six callsites stale and the guard whose name suggests it
would notice is green. A title matching the body would have made that visible; so would a second assertion
that the sequence's last row names a revision reachable from `HEAD` and that the delta from it is
accounted for.

### A5 — `coverageDepthMatrix.test.ts:446`'s restored-claim guard is a source-text presence check

`/peakConcurrency\(/.test(carrier)` and `/spawnSync\(/.test(carrier)`. Both tokens are present, so the
guard is green while the carrier fails to load (**B2**). Its docstring says the distinguishing property is
"that raising the axis changes what the runner does" — which is a property of a *run*, and the guard checks
for two substrings. This is item 7 of § "Gaps / Open risks" (a claim about how code is written surviving
the behaviour being removed) inside the guard written to prevent a relapse of that class.

### A6 — This round's own `review_request.md` is stale at the HEAD it was committed under

`review_request.md:34-36` says `QFAI-ATDD-112` reports **six** TCs with `TC-0017-0016` and `TC-0017-0030`
covered. `git log --oneline 7af579c3..HEAD` shows the request landed at `9174df54` and `45e6f041`
("withdraw the TC-0017-0016 coverage claim, which an open CR had parked") followed it. So the brief that is
meant to fix the round-1 concurrency problem describes a tree one commit old, and a reviewer verifying
"six" against a measured "seven" would have to work out which is wrong. Committing the request before
launch is necessary and not sufficient: it also has to be the last commit, or state the revision it
describes.

### A7 — `HARMLESS_PROGRAMS`' new `[` / `[[` members are reached by an early return that discards the tail

Covered in **B1** but separable, because the fix is different: `invocationOf` has
`if (head === "[" || head === "[[") return head;` and does **not** recurse into `tokens.slice(i + 1)`, the
way the `case`-arm branch immediately above it does. Measured: `[[ -n x ]]|pnpm build` → invocation `[[` →
allowed; `[ -f package.json ]|npx tsup` → invocation `[` → allowed. `test` and `false` I could not reach a
build through. Making the bracket branch recurse on its tail, the way the `case` arm does, closes this one
without touching the allowlists.

### A8 — Prototyping evidence: nothing owed, recorded so the absence is not read as a gap

`.qfai/evidence/calibration.yaml` does not exist and `spec-0017` declares no UI surface or
`CON-API-*` obligation (`QFAI-ATDD-112` reports `refs=` for TCs only; the record's § "Coverage obligations
checklist" says `CON-API-* — none declared, nothing owed`, which I confirmed against the gate output's
absence of any `CON-API` finding). No prototyping gate applies to this stage.

## Test-case depth, per obligation

Read off the matrix's `Normal path` / `Error path` columns, which is where this spec's depth lives at the
ATDD layer:

| US | normal | error | note |
| -- | ------ | ----- | ---- |
| `US-0017-0001` | ✅ | ⚠️ | error path partial; class B for the two run-dependent columns |
| `US-0017-0002` | ✅ | ✅ | both present |
| `US-0017-0003` | ✅ | ✅ | both present; the fail-open branch is exercised behaviourally |
| `US-0017-0004` | ❌ | ❌ | no surface (class A) — and see **B1** for what the assertion does not catch |
| `US-0017-0005` | ❌ | ❌ | no surface (class A) |
| `US-0017-0006` | ❌ | ❌ | no surface (class A) |
| `US-0017-0007` | ❌ | ❌ | **scored as uncovered while annotated as covered** — **B5**; carrier red — **B2** |
| `US-0017-0008` | ⚠️ | ❌ | **flagged: reachability asserted, no error/failure path at all** |
| `US-0017-0009` | ✅ | ✅ | both present |

One row is flagged on the normal-only rule: **`US-0017-0008`**. Its `Normal path` is `⚠️` (validate work is
reachable from a shipped workflow) with `Error path` `❌`, and the class-A justification for the `❌` is the
absence of the retirement — but the *reachability* half that is asserted has a natural failure direction
(a workflow retired while the check keeping its name loses its content, which is the failure the story
names) and nothing asserts it. That is a cheap gap of the same kind round 1 found on `US-0017-0003`, not an
inherent limit. Recorded as a finding, not a hard gate, per this role's scope note.

## What I ran that found nothing, so the negatives are checkable

- **Allowlist routes that are genuinely closed** (`tmp/r12-qa/probe1.mts`, extended by hand):
  `git -c alias.x='!npx tsup' x`, `X=$(npx tsup)`, backtick and `<( )` / `>( )` substitution, a multi-line
  function body, `bash -c 'npx tsup'`, `${{ matrix.cmd }}`, `$BUILD`, `pnpm -p build`,
  `npx -p esbuild tsup`, `node --loader=x build.mjs`, `npm install left-pad extra`. All refused. Round 11's
  six routes are closed; I did not reproduce any of them.
- **`uses:` / `with:` at both levels.** A job-level `uses:` with `with: arguments:`, a local composite
  action (`./.github/actions/…`), a `docker://` image, `container:` and `services:` (including `container:`
  with a null value) are all refused by `readUses`. `shippedJobs()` keys jobs `<file>#<id>`, so a planted
  workflow cannot shadow an existing job id, and a third workflow file reddens `US-0017-0005`'s file pin.
  The only unread sibling key I found is `shell:` (**B1**, X4).
- **Parallelism oracle flake hunt.** Four runs of the fixture shape at 1 and 4 workers, machine idle and
  machine loaded: `peak` was 1 at one worker and 4 at four, every time. I have no evidence the `> 1`
  threshold flakes on a multi-core runner.
- **Matrix arithmetic.** Every total, the class partition, the class sizes and the row width re-derived by
  hand from the table's own cells. All correct. Round 1's defect has not recurred.
- **`e2e callsites at this tree: 879`.** Independently measured 879 with my own implementation of the same
  rule over the workspace's two globs.
- **The `TC-0017-0016` withdrawal.** Grepped the whole test tree for the annotation and the ledger for the
  claim; the withdrawal is complete (**A1**).

## Required fixes before this gate can pass

1. Make `spec0017RunnerParallelismE2E.test.ts` able to run — the fixture must live somewhere its bare
   `vitest/config` import resolves, i.e. under `packages/qfai/`, or the import must be given an absolute
   specifier. Then re-take the four mutations, because none of them has been observed against a green
   baseline (**B2**).
2. Until it runs, either withdraw the `US-0017-0007` annotation again or accept that the gate's move to
   `error=1` is not evidence of coverage. Do not close a `QFAI-ATDD-111` row on a red carrier (**B2**).
3. Close the `NOTHING`-swallows-the-tail class at its root: a one-line function definition, and the
   `[` / `[[` early return, must both scan what follows them (**B1**, **A7**). A spelling-by-spelling fix
   will leave the next one, which is the repair's own argument turned around.
4. Decide what `shell:` is: enumerate the permitted shells the way actions and inputs are enumerated, or
   record it as an accepted open channel. It is currently neither (**B1**, X4).
5. Re-take § P7 at a revision where the e2e project is green, and correct `error=2` to the gate's actual
   value; add the rows the e2e sequence owes, or delete the sequence's derivation claim (**B4**).
6. Re-score or re-justify `US-0017-0007` in the committed matrix, and fix the four places that say it is
   uncovered (**B5**).
7. Correct the three statements in **B6** — `:114`, `:470-471`, `:757`/`:759-760` — and `:746`.

## Residual risks

- **The story-level property for `US-0017-0004` remains unestablished by this stage's own instruments.**
  Six planting rounds, six majorities shipped unnoticed; this round's escape came through a construct the
  shipped file itself uses. The inverted allowlist is the right direction and its parser is the part that
  keeps failing. Consider not parsing at all: an allowlist over the *literal text* of each shipped `run:`
  body, diffed, refuses every construct including the ones nobody has named.
- **`test (e2e)` is a required CI leg and is red at this HEAD.** `ci-pass` derives from it, so the branch
  cannot go green on merge, independent of every finding above.
- Two `todo` ledger rows carry `Evidence` cells that contradict the decision artifacts naming them. The
  cells are `/qfai-implement`'s; the contradiction will keep producing findings until it writes them.

## Sign-off

- [x] Review verdict is explicit — **REVISE**, at the top of this file.
- [x] Findings cite concrete artifacts or evidence — every finding names the command, the file and line, or
      the plant with its before/after hashes; scratch under `tmp/r12-qa/`.
- [x] Required gates and residual risks are recorded — gate summary table above, required fixes and
      residual risks in the two sections preceding this one.

**Counts:** 6 blocking (`B1`-`B6`), 8 advisory (`A1`-`A8`).
