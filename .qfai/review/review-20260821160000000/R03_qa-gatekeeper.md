**Verdict: REVISE.**

# Round 11 — `qa-gatekeeper` (stage gates), spec-0017

## Provenance

| item | at start | at finish |
| ---- | -------- | --------- |
| `git rev-parse --short HEAD` | `4b58eadd` | `4b58eadd` (did not move) |
| `git status --porcelain` | ` M .qfai/report/validate.log`, ` M .qfai/report/validate.spec-0017.json` | identical, nothing added |
| sha256 over `.qfai/report/**` (1515 files) | `f74cda1ebfdce6a764dcb724a82faa7fc80852ebb6a712dbb06a3c18f90441cb` | `f74cda1ebfdce6a764dcb724a82faa7fc80852ebb6a712dbb06a3c18f90441cb` |

The two modified files under `.qfai/report/` were **already modified when I started** and are not mine:
both of my `validate` runs executed with `cwd` set to a `git archive HEAD` shadow root, and the directory
hash above is byte-identical at start and finish. Method: `git archive HEAD | tar -x`, then the 83 tracked
`120000` entries re-materialised as relative-target symlinks from `git cat-file blob HEAD:<path>`. The
first attempt skipped the relink and produced a spurious `QFAI-LINK-001` (`error=3`); that is recorded
here so the `error=2` below is known to be measured against a faithful tree, not a lucky one.

Every mutation in this review was reverted inside a `trap ... EXIT` with a printed sha256 and byte
comparison. Scratch is under `tmp/r11-qa/`. Nothing was committed, pushed or staged.

## Gate summary

| gate | status | evidence |
| ---- | ------ | -------- |
| Scoped validate (`--profile atdd --fail-on error --spec 0017`) | **FAIL** — `info=2 warning=0 error=2`, exit 1 | reproduced in the shadow root: `QFAI-ATDD-111` for `US-0017-0007`, `QFAI-ATDD-112` for 8 TCs; artifact written to the shadow's `.qfai/report/validate.spec-0017.json`, 5133 bytes, sha `c2b82305…` |
| Coverage obligation (`US`) | **FAIL** | `US-0017-0007` uncovered, deliberately, per the withdrawal |
| Coverage obligation (`TC`) | **FAIL** | `TC-0017-0016, -0030, -0032..-0035, -0069, -0070` unreferenced under `tests/integration/**` |
| Coverage Depth Matrix — presence | PASS | `.qfai/evidence/coverage-depth-spec-0017.md`, tracked (`git ls-files --error-unmatch` succeeds) |
| Coverage Depth Matrix — arithmetic | PASS | totals `3 / 1 / 5` and the failed-cell partition `A 30 / B 7 / C 1 = 38` both re-derived by hand from the table's own cells; complete, disjoint, no non-failed member |
| Coverage Depth Matrix — justification honesty | **FAIL** | `B8` — `US-0017-0004`'s `Oracle strength` rests on a claim this review falsified |
| Runtime proof — recorded suite totals | **FAIL** | `B6` — e2e measured **1439/16** against a recorded 1437/16; integration+unit measured **1209/19** against a recorded 1206/19 |
| Runtime proof — other recorded gate outputs | PASS | `pnpm ci:lint` has exactly 11 members, counted from `package.json`; `check-atdd-annotation-ledger.mjs --spec 0017` prints `8 claim(s) backed`, exit 0 |
| Story instrument (`US-0017-0004`) soundness | **FAIL** | `B2`, `B3`, `B4`, `B5` — 15 of 18 probes, and 6 plants inside the shipped orchestrator, ran real builds with both instruments clean |
| Item scope vs. annotated story | **FAIL** | `B7` — `US-0017-0002` and `US-0017-0003` measured blind to a third shipped workflow that violates them |
| `pnpm verify:pack` | NOT RE-RUN | out of budget; the recorded `exit 0` is not independently confirmed by me |

`PASS` requires a gate that passed. Three did — matrix presence, matrix arithmetic, and the two non-suite
recorded gate outputs. The blocking gate did not, and neither did the instrument the blocking story now
rests on.

## Method for the plants

A build "ran" is measured, never asserted. `tmp/r11-qa/stubs/` holds executables named `tsup`, `next`,
`ng`, `vite`, `rollup`, `webpack`, `npx`, `pnpm`; each appends `RAN:<name> <args>` to `$QFAI_MARK`. Each
probe body is executed by `bash -e -o pipefail` — the flags GitHub applies to a `shell: bash` step — in a
fresh `mkdtemp` with `git init`, a `package.json`, and the stub directory prepended to `PATH`. "build
REALLY ran" below means the marker file was non-empty afterwards.

Both instruments are called exactly as the story's own row calls them: `refusals(run)` from
`packages/qfai/tests/helpers/shippedLaneCommands.ts`, and `classifyBuildCommand` per line after the
comment strip, which is the loop at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:455-463`.

---

### B1 — The stage gate is FAIL at `error=2`; the stage cannot be certified complete

`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017`, run with
`cwd` set to the shadow root:

```text
[error] QFAI-ATDD-111  E2E で参照されていない US があります: SPEC-0017:US-0017-0007
[error] QFAI-ATDD-112  宣言 Level が指すディレクトリで参照されていない TC があります:
        tests/integration/** -> TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070
counts: info=2 warning=0 error=2
exit 1
```

This matches the record exactly and is not a new finding — it is recorded because it is the gate I own
and it decides the verdict. `TDD-0069` and `TDD-0070` remain `todo` in `tdd/test-list.md`. No PASS is
available while a hard gate this stage's own Definition of Done names is red.

Checkable negative: the working tree's `.qfai/report/` did not move across either validate run, per the
hash in Provenance, so nothing here was measured against a tree another process had rewritten — the
hazard round 8 reported and this record cites when it declines to use `validate.log` as evidence.

### B2 — `refusals()` fails OPEN: any shell keyword head hides the command behind it, and 15 of 18 probes ran a real build with both instruments clean

`invocationOf` returns `undefined` when the command's head is in `KEYWORDS`
(`shippedLaneCommands.ts:207`). But a shell keyword is a **prefix to a command**, not a command: `if`,
`then`, `else`, `do`, `until`, `while`, `!`, `{` and `[` all take a following command in one-line form,
and `commandsOf` splits on `;`, so the following command becomes the tail of a keyword-headed command and
is dropped whole. `invocationsOf` therefore returns `[]` for a body that unconditionally builds.

Measured, per probe (`tmp/r11-qa/harness.mjs`; BT stands for a literal backtick):

```text
probe                                                  refusals()  classifier  build REALLY ran
01  if [ -f package.json ]; then pnpm build; fi             0          0        RAN:pnpm build
02  if npx tsup; then echo "bundled"; fi                    0          0        RAN:npx tsup
03  if true; then npx tsup --minify; fi                     0          0        RAN:npx tsup --minify
04  if false; then echo skip; else pnpm run build; fi        0          0        RAN:pnpm run build
06  ! npx tsup                                              0          0        RAN:npx tsup
07  echo BT npx tsup BT                                     0          0        RAN:npx tsup
08  echo "hash=BT npx tsup BT"                              0          0        RAN:npx tsup
09  ./ci/*/build.sh                                         0          0        RAN:npx tsup
10  grep -q stub <(npx tsup)                                0          0        RAN:npx tsup
11  echo a#b && npx tsup                                    0          0        RAN:npx tsup
12  git config --local alias.mkdist '!npx tsup' ; git mkdist 0          0        RAN:npx tsup
14  for p in one; do npx tsup; done                         0          0        RAN:npx tsup
17  { npx tsup; }                                           0          0        RAN:npx tsup
18  until npx tsup; do break; done                          0          0        RAN:npx tsup
13  node -e '...execSync("npx tsup")...'                    0          0        the real npx ran and
                                                                                tried to install tsup
--- negative controls: both instruments correct ---
15  npx tsup                                                1          1        RAN:npx tsup
16  out=$(npx tsup)                                         1          1        RAN:npx tsup
05  while [ $n -lt 1 ]; do n=1; npx tsup; done              1          1        RAN:npx tsup
```

Five independent parser holes are in that table, each with its own root cause:

- **the keyword head** (01, 02, 03, 04, 06, 14, 17, 18) — as above;
- **backtick command substitution** (07, 08) — `commandsOf` enters `$( … )` on its own terms but has no
  case for a backtick at all, so `echo BT npx tsup BT` yields an invocation whose program is `echo`,
  which is name-allowed. `$(npx tsup)` is correctly refused (control 16), so the two spellings of one
  shell feature get opposite verdicts;
- **a glob in the head** (09) — `invocationOf` returns `undefined` for any head containing a glob
  metacharacter, treating it as a `case` pattern. `./ci/*/build.sh` and `scripts/*/build.sh` are ordinary
  CI idiom and they execute;
- **process substitution** (10) — `<( … )` is not entered, so `grep -q stub <(npx tsup)` reads as the
  invocation `grep stub`, name-allowed, while the build runs;
- **`#` treated as a comment introducer anywhere** (11) — bash starts a comment only at word start, so
  `echo a#b && npx tsup` runs the build while `commandsOf` drops the rest of the line at the `#`.

Confirmed through the story's own loop, not just the helper. Plant, in
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, one step ahead of the `unit lane
placeholder` (BT is a literal backtick in the planted file):

```yaml
      - name: hygiene probe
        run: |
          if [ -f package.json ]; then pnpm build; fi
          echo "sha=BT npx tsup BT"
          ./ci/*/build.sh
          for p in one; do npx tsup; done
          git config --local alias.mkdist '!npx tsup'
          git mkdist
          grep -q x <(npx tsup)
```

Then `pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`:

```text
Test Files  1 passed (1)
     Tests  10 passed (10)
```

Six real builds in a shipped lane, all nine annotated rows green. Revert:

```text
BEFORE sha256=581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee bytes=11241
AFTER  sha256=581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee bytes=11241
RESTORE OK: byte-identical
git-diff-lines-in-assets=0
```

This is the sixth round in which most planted builds ship unnoticed (10/11, 18/20, 34/40, 18/20, 44/50,
now 15/18) and the first in which the instrument defeated is the allowlist. Note the direction: this is
not "a build spelling nobody enumerated". Probe 01 uses `pnpm build`, which is the first entry the
corpus at `shippedLaneCommands.test.ts:89` refuses. **One shell construct around it is enough.**

### B3 — The allowlist's own corpus is blind to this class by construction, and its accept-direction PINS the hole open

Two defects in `packages/qfai/tests/unit/shippedLaneCommands.test.ts`, one of them load-bearing.

**First: every one of the 62 `PLANTED` entries is a bare command.** Not one is wrapped in `if`, `then`,
`do`, a brace group, `!`, a backtick or a glob head. So the corpus cannot report on the class in `B2`, and
its "0 escaped" result carries no information about it. Measured by lifting the array literal out of the
test file and evaluating it, so the list is the module's and not mine (`tmp/r11-qa/corpus-wrap.mjs`):

```text
corpus entries parsed: 62
bare (as the corpus writes it)   allowlist misses  0/62   classifier misses  0/62   BOTH miss  0/62
if <c>; then echo ok; fi         allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
if true; then <c>; fi            allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
for p in one; do <c>; done       allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
{ <c>; }                         allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
! <c>                            allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
echo BT<c>BT                     allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
until <c>; do break; done        allowlist misses 61/62   classifier misses 61/62   BOTH miss 61/62
```

All seven wrap shapes are standard shell that executes the wrapped command unconditionally, and at least
one instance of each was executed with a marker stub in `B2`, so this is not an argument from reading.

**Second, and worse: `SHIPPED[6]` is `if [ -f package.json ]; then echo "yes"; fi`**
(`shippedLaneCommands.test.ts:108`), asserted to produce **no** refusals by the
"accepts the shapes the shipped tree actually contains" case. That case does not merely fail to notice
the hole — it **requires** it. `refusals()` returns `[]` for that line only because `[` and `then` are
keyword heads whose tails are discarded, which is exactly the mechanism `B2` exploits. Any repair that
teaches `invocationOf` to look past a keyword will redden this case, so the guard's accept direction now
defends the refuse direction's vacuity. That is round 8's member-pinning defect (item 5 of the
recurring-class list) one level out: the test that certifies the instrument is derived from the
instrument's own blind spot.

### B4 — `git` is name-allowed with any arguments, and one line of it is a real build

`HARMLESS_PROGRAMS` (`shippedLaneCommands.ts:248-258`) is documented as "Programs whose arguments cannot
reach a build, allowed by NAME", and `.qfai/evidence/atdd-spec-0017.md:362` states it as "Nine cannot
reach a build whatever their arguments and are allowed by name". `git` is one of the nine, and `git` runs
arbitrary configured commands:

```text
git -c alias.mkdist='!npx tsup' mkdist
  invocationsOf : ["git"]
  refusals()    : []
  classifier    : []
  really ran    : ["RAN:npx tsup"]
```

(`tmp/r11-qa/harness2.mjs`. One line, no shell construct, no parser hole — `-c` is in `OPAQUE_AFTER` so
the invocation is the bare program `git`, and even without that the program is `git` either way.) The same
holds for `git submodule foreach`, `git rebase --exec`, `git bisect run`, `git filter-branch
--tree-filter` and `git difftool --extcmd`. The two-line form is probe 12 above and also ran.

So the sentence at `atdd-spec-0017.md:362` is false as written, and the split the module calls "the whole
design" — a program that could build is allowed only as an exact invocation — is not applied to the one
name-allowed program that can build. Note the asymmetry: `npx tsup` is refused, while
`git -c alias.t='!npx tsup' t` is allowed.

### B5 — The `uses:` / `with:` channel is not closed: a job-level `uses:` and a `container:` are invisible to both loops

Round 10 found this channel invisible to both instruments; the repair enumerated actions and action input
keys. The repair reads `step["uses"]` and `step["with"]` inside `job["steps"]`
(`spec0017LayeredCiScaffoldE2E.test.ts:512-528`), so a job with **no steps** is scanned zero times — and a
job-level `uses:` is a whole reusable workflow. `container:` and `services:` are not read at all.

Plant, into the same shipped orchestrator:

```yaml
  bundle-via-reusable:
    needs: detection
    uses: acme-ci/shared/.github/workflows/bundle.yml@1111111111111111111111111111111111111111
    with:
      arguments: build
  bundle-via-container:
    needs: detection
    runs-on: ubuntu-latest
    container:
      image: node:22
      options: --entrypoint /usr/local/bin/npx --env NPX_ARGS=tsup
    services:
      builder:
        image: gradle:8-jdk21
    steps:
      - name: nothing to see
        run: echo ok
```

Result: `Tests 10 passed (10)`. Revert byte-identical (`581608a7…` both sides,
`git-diff-lines-in-assets=0`).

`with: arguments: build` is the exact key the guard's own comment names as "the channel a `uses:` build
arrives by" (`spec0017LayeredCiScaffoldE2E.test.ts:532-533`) and the exact key
`shippedLaneCommands.test.ts:162` asserts is absent from the allowlist — and it shipped, because the key
was read at the wrong level of the document. A third-party reusable workflow is also a larger
supply-chain edge than any of the three enumerated actions, and `US-0017-0002` did not see it either: the
40-hex pin satisfied its regex.

### B6 — Both recorded suite totals are stale at HEAD, and the e2e sequence owes rows by its own stated rule

`### P7 quality gates` (`atdd-spec-0017.md:1331-1351`) states "These numbers are measured at the working
tree of this commit ... the e2e figure is 1437 and the integration+unit figure 1206", with:

```text
pnpm -C packages/qfai test:e2e                  1437 passed / 16 skipped, exit 0
vitest --project integration --project unit     1206 passed / 19 skipped, exit 0
```

Measured at `4b58eadd`:

```text
pnpm -C packages/qfai exec vitest run --project e2e
  Test Files  84 passed | 4 skipped (88)
       Tests  1439 passed | 16 skipped (1455)      EXIT=0

pnpm -C packages/qfai exec vitest run --project integration --project unit
  Test Files  172 passed | 4 skipped (176)
       Tests  1209 passed | 19 skipped (1228)      EXIT=0
```

Off by +2 and +3. And the derivation sequence's own invariant is violated: it ends at
`7af579c3  1437  (+2)  873  (+2)`, and its stated rule is "any commit that changes an `it` / `test`
callsite under the e2e project's two include globs owes a row in the sequence". Between `7af579c3` and
HEAD:

```text
git diff --stat 7af579c3..HEAD -- packages/qfai/tests/e2e/ packages/qfai/tests/assets/
 tests/assets/coverageDepthMatrix.test.ts        | 112 +++++++---
 tests/assets/retractedClaims.test.ts            | 158 +++++++++++--
 tests/assets/stageEvidenceCounts.test.ts        | 129 ++++++++++--
 tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts  |  37 ++-
 4 files changed, 383 insertions(+), 53 deletions(-)
```

Four files under the two globs changed and no row was added. This is the sixth round the e2e figure has
been found a round behind and the second for the integration+unit figure. The reason is structural, not
clerical: `stageEvidenceCounts.test.ts` derives per-FILE counts (`CLAIMS`) and per-file recorded vitest
outputs (`RECORDED`, which requires a `vitest run ... tests/x.test.ts` line followed by
`-> Tests N passed`), and **neither pattern matches the two suite totals**, which sit in a fenced block
as `pnpm -C packages/qfai test:e2e   1437 passed / 16 skipped`. The record says the counts here are
derived; these two are typed, and both were wrong the moment this round's own commits landed. The
sequence's right-hand column exists precisely to make the total checkable at a later revision, so derive
the two totals from it or stop stating them.

### B7 — `US-0017-0002` and `US-0017-0003` are scoped narrower than the stories they annotate, measured

The review request asked whether any of the other eight rows repeats the defect round 10 found on
`US-0017-0004`. Two do, by the same mechanism: a hardcoded two-file literal where `US-0017-0004` now uses
the derived `shippedJobs()`.

- `US-0017-0002` at line 227 reads `[ORCHESTRATOR, "qfai-validate.yml"]`. Title: "an adopter receives a
  supply-chain-hardened workflow **set**".
- `US-0017-0003` at line 263 iterates the same two-element literal. Title: "an adopter receives **no**
  hard-coded Node version to drift from".

Plant: a third file `packages/qfai/assets/init/root/.github/workflows/qfai-lint.yml` carrying
`uses: actions/checkout@v4` (a floating tag, not a 40-hex SHA), **no** `persist-credentials: false`, a
quoted `node-version: 22.4.0` literal, and `npx tsup --config tsup.config.ts`. Measured:

```text
BEFORE listing: [qfai-tests.yml qfai-validate.yml]
DURING listing: [qfai-lint.yml qfai-tests.yml qfai-validate.yml]

PASS  US-0017-0001  ships a detection job and a verdict ...
PASS  US-0017-0002  pins every action to a full SHA and refuses to persist credentials    <-- BLIND
PASS  US-0017-0003  declares no workflow-level Node version literal in either workflow    <-- BLIND
PASS  US-0017-0003  resolves the version by running the shipped step ...
FAIL  US-0017-0004  -> "qfai-lint.yml#lint [build]: npx tsup --config tsup.config.ts"
FAIL  US-0017-0004  -> "qfai-lint.yml#lint: npx tsup"
FAIL  US-0017-0005  -> expected [ qfai-lint.yml, ...(2) ] to deeply equal [ qfai-tests.yml, ...(1) ]
Tests  3 failed | 7 passed (10)

AFTER  listing: [qfai-tests.yml qfai-validate.yml]
git status assets: []
```

`US-0017-0004`'s derived scope works: it named the new file. `US-0017-0002` stayed green with an unpinned
third-party action and an unhardened checkout in the shipped set. `US-0017-0003` stayed green with the
exact literal it forbids in the shipped set. `US-0017-0005` fires, but on a **different** property (the
file list), and that makes the failure mode worse rather than better: when a third workflow legitimately
ships, the fix is to widen `US-0017-0005`'s literal, at which point `-0002` and `-0003` go silent with
nobody prompted to widen them.

Related, established by reading rather than by plant and marked as such: `US-0017-0006` is titled "an
adopter's workflow **set** runs on the event that matters" and reads the orchestrator alone (line 576), so
a shipped workflow triggering only on `push` is outside it. Same class, lower stakes. Rows `-0001`,
`-0008` and `-0009` name their file in the claim itself, so their scope matches; `-0007` asserts nothing.

### B8 — The matrix's `US-0017-0004` oracle justification rests on a false claim, and that claim is the twelfth entry in its own recurring-class list

`coverage-depth-spec-0017.md:299-304` closes the row by saying that what answers the classifier's
closed-world limit is not a longer list but the inverted instrument, that
`tests/unit/shippedLaneCommands.test.ts` asks what a lane may INVOKE, that this "needs no corpus of build
spellings and **fails closed**", and that "the story no longer rests on" the classifier.

`atdd-spec-0017.md` item 7 closes with the same claim one step stronger: enumerate what is permitted and
refuse the rest "so the assertion needs no corpus and fails closed. That is what
`tests/helpers/shippedLaneCommands.ts` does, and it is **the only repair in this list that answers a whole
item rather than an instance of one**."

"Fails closed" is a claim about the instrument's **shape** — it is an allowlist, therefore everything
unenumerated is refused. `B2`, `B3`, `B4` and `B5` measure what it **does**: it fails open for every
command under a shell keyword head, for backtick substitution, for a glob-headed program, for process
substitution, for anything after an in-word `#`, for any `git` invocation, and for the whole `uses:`
surface above the step level. That is precisely the class item 7 enumerates, occurring for the twelfth
time and — like items 5, 8 and 9 — **inside the repair for a finding about the class**. Item 7's list is
described as canonical; it needs a twelfth entry, and the sentence calling the allowlist "the only repair
that answers a whole item" has to go.

Consequence for the matrix, which is the part I gate: `US-0017-0004`'s `Oracle strength` is scored
partially-met on the strength of that sentence, and the sentence is false. On the measurement above the
row has **no** sound oracle for its story in either instrument, so the partial score overstates it. The
row's `Status` is already the failed mark, so the gate arithmetic does not change — but the justification
text does, and it is the text the completion gate reads.

Checked and correct, so nobody re-derives it: the new closed-world paragraph
(`coverage-depth-spec-0017.md:290-297`) is **true**. 16 of the 17 tool lines it names now classify as
`build` — `next build`, `ng build`, `gulp`, `grunt`, `hugo`, `jekyll`, `mkdocs`, `mix`, `sphinx-build`,
`buck2`, `helm`, `goreleaser`, `packer`, `R CMD build`, `shards`, `cabal` — all 17 are refused by the
allowlist in their bare form, and the paragraph's hedge is "Many of those are now declared", which holds.
The one exception is bare `tox`, recorded at `A6`.

---

### A1 — `shippedLaneCommands.ts` states "ten programs" where the tree invokes fifteen

Three sites state this one fact. Measured by running `invocationsOf` over every `run` body in the shipped
set (`tmp/r11-qa/inventory.mjs`):

```text
distinct programs invoked: 15
  -> corepack, cut, echo, exit, git, grep, node, npm, npx, pnpm, printf, read, tr, true, yarn
distinct invocations     : 34
```

- `shippedLaneCommands.ts:18` — "The shipped tree invokes **ten** programs." **Wrong.**
- `spec0017LayeredCiScaffoldE2E.test.ts:481` — "invokes **fifteen** programs." Right.
- `atdd-spec-0017.md:362` — "invokes **fifteen** programs. Nine ... six could" (9 + 6 = 15). Right as
  arithmetic; the "nine cannot reach a build" half is `B4`.

The wrong copy is in the module the story now rests on, and nothing derives any of the three.

### A2 — `### Findings per round` says "Every count below is derived"; nothing derives it

The paragraph at `atdd-spec-0017.md:1517-1520` reads "Every count below is **derived**: distinct finding
identifiers appearing as a heading in the report, counted from the packs on disk." Measured: a
`grep -rln` for "Findings per round" and "id families" across `packages/qfai` and `scripts` returns
nothing — no test, script or guard reads that table. "Derived" here means "was derived once, by hand, and
then described as a property", which is the exact wording of the finding round 10 raised about rounds 9
and 10 being absent from it. The table stops at round 10; three rows are owed the moment this round's
reports land, so the sentence is scheduled to be false again this round. Either derive it, or say
"counted by hand at revision X".

The neighbouring claim IS sound, and I confirmed it rather than assumed it. `## Final status` says
"**eleven** rounds, **29** reviewer responses, **28 REVISE and one PASS**" and the disk agrees: 11 pack
directories at or after `review-20260820200000000`, response counts `2+4+3+3+3+3+3+2+3+3+0 = 29`, and
`28 + 1 = 29`. It will break when this round's reports land, and `stageEvidenceCounts.test.ts` will catch
that, which is the design working as intended.

### A3 — `US-0017-0002`'s SHA-pin scan reads comment lines; its sibling row skips them

Measured accidentally and then deliberately. My first `B5` plant carried a YAML comment mentioning a
job-level `uses:` in backticks, and `US-0017-0002` failed on the comment:

```text
every third-party action in the shipped set must be pinned to a full SHA:
  + "qfai-tests.yml: uses:BT"
```

The regex at line 232 matches `uses:` followed by any non-space run, over the raw text, with no comment
strip — so a backticked `uses:` in prose is read as an action reference. `US-0017-0003` two rows down does
skip comments (line 266 continues on a line whose trimmed form starts with `#`), so the shipped set has
two adjacent scans of the same files disagreeing about whether a comment is content. This is a
false-positive direction and therefore not blocking, but it is a scan that documentation can redden, and
the shipped orchestrator is heavily commented. Re-run without the comment gave `Tests 10 passed (10)`,
which is what `B5` reports.

### A4 — One coordinate-model mutation stays green; low confidence, possibly an equivalent mutant

The request asked for a fourth mutation defeating `retractedClaims.test.ts`'s second coordinate
assertion. Three were tried, each applied and reverted byte-identically
(`2077845323edbc89ca573105afda46402b43c77a4a6bd3a05433d9fff2bde0bd` on both sides, 39903 bytes,
`git status --porcelain -- packages/qfai/tests` empty):

| mutation to `flattenDocument` | guard |
| ----------------------------- | ----- |
| emit the per-line separator unconditionally, including after a line that flattened to nothing | **11 passed — NOT CAUGHT** |
| paragraph end computed from the paragraph's own flattening (the old model round 10 measured) | caught — "reconstructs every recorded span ..." failed |
| exempt span widened by one, to include its separator | caught, naming three specific spans |

The surviving mutation changes `document.text`: a line flattening to nothing now contributes a separator,
so a needle spanning a fence marker matches differently. The paragraph identity check cannot see it
because it compares under a whitespace-collapsing normaliser; the tiling check cannot see it because the
shift is uniform. **I did not establish that it changes any occurrence's verdict**, so by the
oracle-strength criteria this may be an equivalent mutant, which would make it an upstream gap rather
than an implementer task. Reported at low confidence rather than suppressed, and the honest summary is:
2 of 3 caught, 1 undecided, no demonstrated laundering route.

### A5 — A sibling reviewer mutated the shipped asset tree during my measurements

Mid-review my restore step printed a file I had not created:

```text
AFTER  dir listing: qfai-extra.yml qfai-tests.yml qfai-validate.yml
git status in assets: [?? packages/qfai/assets/init/root/.github/workflows/qfai-extra.yml;]
```

Located to `tmp/r11-impl/plant3.mjs`, `plant4.mjs`, `plant5.mjs` and `plant6.mjs` — the concurrently
running `implementation-reviewer`, planting into the same file and the same directory this role was told
to plant into. Round 1's finding about the tree moving under three reviewers was fixed by committing the
request before launch; that fix does not address reviewers **mutating the subject concurrently**, which
the read-only rule explicitly permits ("mutate only to measure"). I re-ran the affected measurement with a
before / during / after directory listing, and the clean run is what `B7` reports. Two consequences worth
recording for the orchestrator: any plant-based measurement in a parallel round is unserialised, and a
reviewer whose plant collides can report a catch that belongs to a sibling's plant. A lock file, or a
per-role copy of the asset tree, would make this structural rather than a matter of noticing.

### A6 — bare `tox` classifies as none

`classifyBuildCommand("tox")` returns `none`, and `tox` with no arguments runs the configured envs, which
build. It is inside the classifier's declared closed-world limit and the allowlist refuses it, so this is
a note rather than a gap. Recorded because the round's brief asked whether deleting `tox`'s
`stops: ["--version"]` mattered, and the answer I can give is only that the bare form is already missed
with or without it.

### A7 — Negative results, so "I found nothing here" is checkable

Stated so the next round does not re-spend the budget:

- **The matrix's arithmetic is correct.** Cross-tabulating the `Status` column by hand gives 3 met / 1
  partial / 5 failed, matching line 57. Counting failed marks per row over the six depth columns plus
  `Oracle strength` gives `3+1+2+6+6+6+7+5+2 = 38`, matching "38 depth cells are failed, plus 5 in
  `Status`". The partition table sums `A 30 / B 7 / C 1 = 38`, is complete against the table's own failed
  cells, is disjoint, and contains no non-failed member.
- **No allowlist member is dead.** All 9 `HARMLESS_PROGRAMS`, all 8 `ALLOWED_INVOCATIONS`, all 3
  `ALLOWED_ACTIONS` and all 4 `ALLOWED_ACTION_INPUTS` are exercised by the shipped set. One note: the
  review request describes "six exact invocations"; the set holds **eight** entries over six distinct
  programs, so the prose and the code count different things.
- **Both evidence files are tracked** — `git ls-files --error-unmatch` succeeds for
  `.qfai/evidence/coverage-depth-spec-0017.md` and `.qfai/evidence/atdd-spec-0017.md`, so the matrix and
  its justifications do reach a commit. The Coverage Depth Matrix requirement of this role is met on
  presence, format and arithmetic; it fails only on the honesty of one justification (`B8`).
- **Two recorded gate outputs reproduce exactly.** `pnpm ci:lint` has 11 double-ampersand-joined members
  in `package.json`, matching "all eleven members"; `node scripts/check-atdd-annotation-ledger.mjs --spec
  0017` prints `8 claim(s) backed by a test annotation (spec-0017)`, exit 0.
- **Command substitution with a dollar sign IS correctly refused** — control 16, `out=$(npx tsup)`,
  reddens both instruments. That is what localises `B2`'s backtick hole to the missing backtick case
  rather than to substitution in general.
- **The e2e and integration+unit suites are green** at `4b58eadd` (`EXIT=0` for both), so no finding here
  is a red suite; every one is a green suite over a defect.
- **`pnpm verify:pack` was not re-run.** Its recorded `exit 0` is unverified by me.

## What would move this to PASS

Not a longer allowlist. Two things I would want measured next round:

1. `invocationOf` reduced **over** a keyword prefix rather than terminated by it; backticks and process
   substitution entered the way `$( ... )` is; a glob-headed word treated as a program when it stands in
   command position; `#` honoured only at word start; `git` moved out of `HARMLESS_PROGRAMS` into exact
   invocations. Then `shippedLaneCommands.test.ts`'s corpus re-run **with each entry wrapped in each of
   the seven constructs in `B3`** — 62 x 8 cases, which costs nothing and is the corpus shape the current
   one lacks.
2. `shippedJobs()`'s derivation extended to `US-0017-0002`, `-0003` and `-0006`, and the `uses:` scan
   moved up a level to read job-level `uses:`, `container:` and `services:` as well as `job.steps[]`.

Both are falsifiable by the plants in this report, which is why the commands are recorded rather than
summarised.
