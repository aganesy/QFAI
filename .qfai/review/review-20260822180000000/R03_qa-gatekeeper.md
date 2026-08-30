# R03 — qa-gatekeeper, round 19, spec-0017 (stage gates only)

- Revision at start: `1ecbeb07` (`git rev-parse --short HEAD`), working tree clean.
- **Subject under review: `7fbac2d3`.** Every artifact judged below was read with
  `git show 7fbac2d3:<path>`. Where a measurement had to be *executed*, I say which revision's bytes
  were on disk — and for `packages/`, `scripts/` and `.github/` that distinction is empty:

  ```text
  git diff --stat 7fbac2d3 1ecbeb07 -- packages/ scripts/ .github/    (no output)
  ```

  So every executed measurement below ran the subject's code exactly, on a working tree at `1ecbeb07`.
  The only difference between the two revisions is `.qfai/evidence/atdd-spec-0017.md` (six lines) and
  the round-19 pack, and per the amendment the record's pack and response counts are measured at
  `19b751ca`.
- Emphasis per the request: **§2 (the init surface, third attempt)** and **§4 (the record)**.
- Verdict: **REVISE**

## Gate that passed

`pnpm -C packages/qfai exec vitest run --project integration --project unit` —
**173 files, 1222 passed / 19 skipped, exit 0**, working tree clean at `1ecbeb07` (subject code).
That is one of the two totals §4 asks about, and it reproduces exactly. `test:e2e` reproduces too
(**1446 passed / 16 skipped, exit 0**), but I do not offer it as the passed gate, because §2 below
shows it stays green with an executable payload shipping into every adopter's tree.

## Restoration statement

I planted three times inside my partition, `packages/qfai/assets/init/root/`. A byte copy was taken
first (`tmp/r19qa/backup-assets-root/`, manifest `tmp/r19qa/backup-manifest.txt`) and the partition
was diffed against it after each restore. All three restores are clean:

```text
2ed38d4d…d87a  SUBJ/.github/workflows/qfai-validate.yml
468e7cd9…8d33  SUBJ/.github/workflows/qfai-tests.yml
526fc186…6d6e  SUBJ/qfai.config.yaml
f59eb3d1…faef  SUBJ/DESIGN.md
```

— identical before and after, and `git status --porcelain packages/qfai/assets` is empty. Those four
digests are also the four the subject pins (`ALLOWED_WORKFLOW_FILES`, `ALLOWED_INIT_CONTENT`), so the
restore is verified against the subject's own constants and not only against my copy. `packages/qfai/dist/`
was rebuilt (it is git-ignored build output, and it was stale relative to `b0f9d443`); it is rebuilt
from the restored assets as the last step.

## §2 — The init surface, third attempt

### B1 — A fourth way, and it is three bytes: a BOM in front of the shebang

`initMustNotShip` (`tests/helpers/shippedLaneCommands.ts:1111-1121` at `7fbac2d3`) asks its first
question as:

```ts
if (contents.subarray(0, 2).toString("latin1") === "#!") return "carries a shebang";
```

**Bytes 0-1, exactly.** A UTF-8 BOM occupies bytes 0-2, so `EF BB BF 23 21 2F 62 69 6E 2F 73 68` —
a `#!/bin/sh` script saved by any editor that writes a BOM — answers `EF BB`, and the question says no.

Planted, shipped and measured. Into my partition:

```text
packages/qfai/assets/init/root/.agents/qfai-bootstrap        (66 bytes, no extension)
  00000000: efbb bf23 212f 6269 6e2f 7368 0a70 7269   ...#!/bin/sh.pri
  line 2:   printf QFAI-R19-BOM-PWNED > "$HOME/qfai-r19-bom.txt"
```

It arrives in the adopter tree verbatim (`node dist/cli/index.mjs init --dir <tmp> --yes`, exit 0,
`tmp/r19qa/initroot3/.agents/qfai-bootstrap`, same twelve first bytes), and it **runs**:

```text
$ HOME=tmp/r19qa sh tmp/r19qa/initroot3/.agents/qfai-bootstrap
tmp/…/.agents/qfai-bootstrap: line 1: ﻿#!/bin/sh: No such file or directory
sh exit=0
$ cat tmp/r19qa/qfai-r19-bom.txt
QFAI-R19-BOM-PWNED
```

All three questions pass it. Re-implementing the subject's own three constants verbatim over the
initialised tree (`tmp/r19qa/enumerate.mjs`, 227 files):

```text
=== OUTSIDE INSTRUCTION TREES ===   the six allowed paths, nothing else
=== CONTENT PINS ===                all four MATCH
=== FLAGGED BY KIND ===             (empty)
```

And the stage's own gate is green with the payload in the shipped tree:

```text
pnpm -C packages/qfai exec vitest run --project e2e
  Test Files  85 passed | 4 skipped (89)
       Tests  1446 passed | 16 skipped (1462)          EXIT=0
```

**Why each of the three questions misses it**, since the rule's defence is meant to be that three
questions cover three answers to "who runs this":

1. *shebang* — defeated by the BOM. The check reads two bytes at a fixed offset; nothing skips a
   leading BOM, and nothing else in the file looks for `#!` anywhere but position 0.
2. *executable bit* — `(mode & 0o100) !== 0`. My plant is mode `0644`. It did not need to be
   executable, because `sh <file>` and `. <file>` do not consult the bit, and neither does a
   `source` from an adopter's own script.
3. *name* — `.agents/qfai-bootstrap` has no extension, is not one of the nine manifest names, and is
   not under a `hooks/` directory. The comment above `INIT_MUST_NOT_SHIP` says the pattern is "kept
   as the third of those" questions; round 18's payload was caught by *name* only after it was moved
   under `hooks/`, and the name clause is still an extension-and-nine-names list.

This is the same class the record names as established fact #1 — "a boundary drawn at a reading is a
boundary at the reader's limits". The reader here is two bytes wide.

**The narrowest correct repair is not "also skip a BOM".** A BOM is one encoding; `FF FE`,
`FE FF`, `EF BB BF` and a UTF-16 `#!` are four more, and the next round finds whichever is left. What
makes the file a script is that a shell will interpret it, and the property available cheaply is: the
first non-BOM, non-whitespace bytes are `#!`, over the decoded text rather than over `latin1` of the
first two bytes.

### B2 — The executable-bit question has never fired, and round 18's evidence that it needed to exist was `ls` echoing the shebang

Question 2 is `if ((mode & 0o100) !== 0) return "arrives executable";`, with the comment "Git records
only this one, so it is the only one an adopter can receive."

On the platform this stage executes its gate on — Windows, which is where `pnpm -C packages/qfai
test:e2e` was run for the `1446 … exit 0` line in `## P7 quality gates` — Node reports `0o666` for
every regular file and `0o444` for a read-only one. The owner-execute bit is never set, so
`(mode & 0o100) !== 0` is **structurally false** and question 2 cannot fire. Measured:

```text
$ chmod 755 plain-755.txt ; chmod 644 shebang-644.txt
$ ls -la
-rw-r--r--  plain-755.txt        <- chmod 755, shown non-executable
-rwxr-xr-x  shebang-644.txt      <- chmod 644, shown executable
$ node -e "…statSync…"
plain-755.txt   node mode octal 666 | (mode & 0o100)!==0 => false
shebang-644.txt node mode octal 666 | (mode & 0o100)!==0 => false
```

Read the two lines together. **Git Bash's `ls` derives the `x` column from the file's magic bytes, not
from its mode**: the `chmod 755` file displays as `rw-`, and the `chmod 644` file displays as `rwx`
*because it begins with `#!`*.

That is the instrument round 18's `qa-gatekeeper` used. Its report
(`review-20260822150000000/R03_qa-gatekeeper.md:58-70`) records the plant as "`#!/bin/sh`, mode 0755",
evidences it as

```text
-rwxr-xr-x  37 .agents/hooks/post-checkout
```

and concludes the file "arrives **with its executable bit intact** … which neither pin reads". The
`x` in that line is the shebang, displayed by `ls`. The finding — a hook script ships and neither pin
reads it — was correct and the repair for it was correct; but **the specific sub-claim that the
executable bit survives the copy was an artifact of the display**, and it is the sub-claim question 2
was added to answer. My own plant is the control: `.agents/qfai-bootstrap` is a `#!/bin/sh` script and
`ls` shows it `-rw-r--r--`, because the BOM moved the magic three bytes to the right.

Consequences, in order of size:

- **Two of the three questions are inert against my B1 payload where the stage measures**, and the
  third is a name list. The "three questions, three answers" defence is one question deep on Windows.
- **Question 2 is untested in both directions.** Nothing in the suite asserts that a mode-0755 file is
  refused, and nothing asserts that the copy preserves the bit — so the claim in the JSDoc ("the only
  one an adopter can receive") is unmeasured, and on `ubuntu-latest`, where CI actually runs the `e2e`
  slice (`.github/workflows/ci.yml:340`, `runs-on: ubuntu-latest`, no Windows leg — there is a
  `TODO(QFAI-PR206-followup)` for one at line 259), it has still never been shown to fire.
- This is the record's established fact #2 in a new place — two readings of one question, and the one
  nobody is looking at is wrong — except here the two readings are `ls` and `stat`, and the
  disagreement was invisible because only one of them was ever printed.

The cheap repair is a unit case per question: a fixture at mode `0o755` must be refused and one at
`0o644` must not, skipped on `process.platform === "win32"` with the skip stated, so the reader knows
which of the three questions their local run did not exercise.

### M1 — `b0f9d443` added an adopter-facing file that no pin covers, and it is not an agent instruction

The request asks whether anything `b0f9d443`'s `init.ts` now writes falls outside these pins. It does:

```text
<adopter>/.qfai/install-provenance.json          429 bytes, written by recordInstalledWorkflows()
{ "workflows": { "qfai-validate.yml": { "sha256": "2ed38d4d…", "installedByVersion": "1.10.0",
                                        "installedAt": "2026-08-22T02:47:48.110Z" }, … } }
```

Measured: it is present in the initialised tree (`tmp/r19qa/initroot/.qfai/install-provenance.json`),
it is new — `PROVENANCE_SEGMENTS = [".qfai", "install-provenance.json"]`,
`src/shared/provenance.ts:58` at `7fbac2d3` — and it is invisible to all three pins, because `.qfai/`
is one of the eight `INIT_INSTRUCTION_TREES`.

It is not a security hole: no shebang, no exec bit, not a manifest. The finding is about the
**exclusion's stated justification**, which `ALLOWED_INIT_PATHS`'s JSDoc gives as:

> `.qfai/`, `.claude/`, `.codex/` and `.agents/` are excluded by path: they are agent-instruction trees
> that change whenever a skill does, and what matters about them is narrower than their contents

`install-provenance.json` is not an agent instruction, does not change when a skill does, and its
contents are exactly what matters about it — doctor's drift detection and init's prune decision both
read it, and `resolvePrunableRetiredWorkflows` will **delete an adopter's workflow file** when this
record says QFAI wrote it and the digest still matches. A file that gates a delete is not covered by
"what matters about them is narrower than their contents".

Two smaller notes on the same file, both `b0f9d443`'s and reported here because they ship to the same
adopters:

- The JSDoc says "the eight agent-instruction trees" in one place and "`.qfai/`, `.claude/`, `.codex/`
  and `.agents/`" — four — two paragraphs later; `INIT_INSTRUCTION_TREES` has eight. The four-name list
  is the pre-round-18 text left in place.
- The record's `## P7 quality gates` block does not mention that `init` now writes a ninth adopter-facing
  file, and neither does the e2e file's header comment, which still says the outside-trees set "is a
  six-entry list".

### M2 — `.agents/` is the unguarded one, and it is unguarded by accident

My first plant this round was `packages/qfai/assets/init/root/.claude/settings.json` carrying a Claude
Code `hooks` block — `{"type":"command","command":"sh -c '…'"}`, a string a tool spawns without a
shebang, an exec bit or a manifest name. It **ships verbatim** into `<adopter>/.claude/settings.json`,
and spec-0017's three pins all pass it (measured: 227 files, no path violation, no content drift,
nothing flagged by kind).

It was caught — by `tests/assets/assets.test.ts:846`, "keeps root init assets free of wrapper
directories", a **spec-0003** guard:

```ts
for (const removedDir of [".claude", ".codex"]) {
  expect(existsSync(path.join(templateRootDir, removedDir))).toBe(false);
}
// and, under .github: instructions, agents, skills, commands, prompts
```

Seven names. `.agents` is not one of them, and `.qfai` is not one of them. That is the whole reason
B1's payload reached an adopter: not because the kind rule let it through on merit, but because the
list that would have stopped it at the source predates `.agents/` existing. Two consequences:

- **The init surface's real defence is a seven-name list in another spec's test file**, which nothing
  in spec-0017's record mentions, and which no reviewer of these pins would find.
- `packages/qfai/assets/init/root/.qfai/**` **pre-empts** `packages/qfai/assets/init/.qfai/**`.
  Measured: the root copy runs first (`init.ts:150-160`), the `.qfai` copy is `force: false`, so a file
  planted at `root/.qfai/waivers.yml` arrives in the adopter's `.qfai/waivers.yml` and the real one
  never lands. `initAssetsRootMirror.test.ts` compares `assets/init/.qfai/` with the repository root
  `.qfai/` and never looks at `assets/init/root/.qfai/`, so that shadow is outside the SSOT guard as
  well as outside all three pins. (The two payloads I tried through it — a shadowed `waivers.yml` and a
  shadowed `qfai-implement/SKILL.md` — were caught by `wrapperParity.test.ts` and two
  `spec0006WorkflowsIntegrity` cases, again from other specs. The route is open; those two payloads are
  not.)

### m1 — The symlink comment states a property the walk does not have

```ts
// … So a link is RESOLVED rather than refused: one pointing at a directory is covered where that
// directory is walked, and one pointing at a file is judged on the file's kind, because what runs is
// the target.
if (!entry.isFile()) {
  const target = await stat(full).catch(() => undefined);
  …
  if (target.isDirectory()) continue;
}
```

"Covered where that directory is walked" is true only for a target **inside the walked root**. `stat`
follows the link wherever it goes; a directory link whose target is outside the tree is `continue`d and
its contents are never read by anything. Today all seventy links resolve inside — measured, seventy
links, `insideTree=true` for all seventy, thirty-two of them directory links that the walk skips — so
this is not live. It is filed because the comment is the only thing a future reader has, and it asserts
a coverage claim the code does not enforce. `path.relative(root, await realpath(full)).startsWith("..")`
is one line.

## §4 — The record

#### What reproduces, measured

Executed against the subject's code (`git diff 7fbac2d3 1ecbeb07 -- packages/ scripts/ .github/` is
empty), with the record's own figures beside them:

| record line | recorded | measured | where |
| --- | --- | --- | --- |
| `pnpm -C packages/qfai test:e2e` | 1446 passed / 16 skipped, exit 0 | **1446 / 16, exit 0** (85 files passed, 4 skipped) | working tree @ `1ecbeb07` |
| `vitest --project integration --project unit` | 1222 passed / 19 skipped, exit 0 | **1222 / 19, exit 0** (173 files) | working tree @ `1ecbeb07` |
| `e2e callsites at this tree: 882` | 882 | **882**, over 89 files | recomputed from `git ls-tree` at both `7fbac2d3` and `1ecbeb07` |
| `check-atdd-annotation-ledger.mjs --spec 0017` | 9 claim(s) backed, exit 0 | **9 backed, exit 0** | working tree @ `1ecbeb07` |
| scoped gate | `info=2 warning=0 error=1` | **`info=2 warning=0 error=1`, exit 1** | `git archive 7fbac2d3` shadow |
| `artifact .qfai/report/validate.spec-0017.json` | cited | **byte-identical**, 4381 bytes, `sha256 0ab3bc2b…c881a`, shadow output == `git show 7fbac2d3:` | same |
| `## Final status`: nineteen / 50 / 49+1 | at `19b751ca` | **19 packs ≥ `FIRST_PACK`, 50 responses over the 18 closed** | disk, recounted by hand |
| `CR-20260820-0012` unscoped strand | 11 US / 15 TC across four specs | **11 US (0003×8, 0006, 0008, 0015) and 15 TC (0003×1, 0008×4, 0015×2, 0017×8)** | full-profile run at `7fbac2d3` |
| option 2's third ground | "all fifteen are `todo` or `blocked`" | **all fifteen**: 7 `todo`, 6 `blocked` in spec-0017, `todo` elsewhere | ledgers at `7fbac2d3` |

The callsite count is recomputed with the record's own stated rule (`^[ \t]*(?:it|test)(?:\.\w+)*[\s(]`
over `tests/e2e/**/*.test.ts` and `tests/assets/**/*.test.ts`, the `e2e` project's two includes at
`vitest.workspace.ts:55`), from `git ls-tree` rather than from the disk, so it is a property of the
revision and not of my working copy. **882 at both revisions.**

**Option 2 of `CR-20260820-0012`: the disposition is still right.** All three withdrawn grounds stay
withdrawn, the third is re-verified above rather than taken from the record, and nothing at
`7fbac2d3`..`1ecbeb07` or in `b0f9d443` touches the CR or its grounds. "Handed to that CR's owner"
remains the only disposition this stage may write.

### B3 — The sealed `--profile full` value is 44/48 untracked scratch, and it is not a property of any revision

The record's answer to a number that moves is to record "the rule and the sealed value":

> **48 with the current round sealed, 50 at a revision that has just opened a pack, 49 once reports
> land in it and before a `summary.json` does.**

**The rule is correct and I reproduced all three values exactly.** On a shadow of `1ecbeb07` carrying
this working copy's `.qfai/review/`, mutating only the round-19 pack between runs:

```text
A  pack absent (round sealed)              counts: info=4 warning=404 error=48
B  pack holds review_request.md only       counts: info=4 warning=404 error=50
C  pack holds reports, no summary.json     counts: info=4 warning=404 error=49
```

**And the same command on the committed subject answers 4.**

```text
git archive 7fbac2d3 -> shadow, 83/83 symlinks re-materialised, 0 dangling
  validate --profile full --fail-on error --root <shadow>   counts: info=4 warning=404 error=4
git archive 19b751ca -> shadow (pack just opened)
  validate --profile full --fail-on error --root <shadow>   counts: info=4 warning=404 error=6
```

The 44 that separate them are all one rule:

```text
error tally, working-copy shadow, state C:
   1 QFAI-ATDD-111    1 QFAI-ATDD-112    2 QFAI-REVIEW-004    1 QFAI-REVIEW-005   44 QFAI-REVIEW-007
error tally, git-archive shadow @ 7fbac2d3:
   1 QFAI-ATDD-111    1 QFAI-ATDD-112    1 QFAI-REVIEW-004    1 QFAI-REVIEW-005    0 QFAI-REVIEW-007
```

`.qfai/review/` holds **64 pack directories and 317 files on disk; 20 directories and 98 files are
tracked**, and `git status --porcelain` is clean with all 317 present — the directory is ignored and
packs are force-added. The 44 extra `QFAI-REVIEW-007` are one per untracked pack whose `summary.json`
fails the minimum schema. They belong to other stages, on this machine, and **no revision of this
repository contains them.**

So the sealed value has the defect the record spent four rounds naming about the two suite totals, one
size larger:

- **It is not reproducible from the repository.** `git clone` + `pnpm build` + the recorded command
  gives **4**, not 48. A reader checking the figure finds it wrong by 44 and has no way to discover
  why, because nothing beside it says the number is a function of untracked directories.
- **The seal does not seal the dominant term.** What the record sealed is round state, worth ±2. What
  it did not seal is 44 — 92 % of the figure — and that term moves whenever anyone on this machine
  opens or closes a review pack for **any** spec.
- **It is the same sentence the record retracts about round 16.** "Round 16 recorded 49 as a property
  of the tree" is quoted there as an error. 48 is recorded as a property of the round, which is a
  smaller claim and still not the true one: it is a property of *this working copy*, and the record
  does not say so. The block it sits in opens "**These numbers are measured at the working tree of
  this commit**", which for this line is false in the way that matters — the working tree of that
  commit, checked out fresh, does not produce it.

The repair is one clause, not a re-measurement: state the figure as `48 on a working copy carrying N
untracked review packs; 4 at the committed revision`, or drop the absolute and keep the rule and the
deltas (`+2 on opening a pack, −1 when reports land, −1 when a summary lands`), which *are* properties
of the subject and which I reproduced at both committed revisions.

### M3 — `## P7 quality gates` re-dated its currency claim to round 18 after re-running one of its seven lines

`7fbac2d3` is a two-line change to this block:

```diff
-round 14: the e2e figure is 1446 and the integration+unit figure 1220. Round 12 re-measured them at
+round 18: the e2e figure is 1446 and the integration+unit figure 1222.
-vitest --project integration --project unit     1220 passed / 19 skipped, exit 0
+vitest --project integration --project unit     1222 passed / 19 skipped, exit 0
```

One line of seven was re-measured. The framing sentence — "**These numbers are measured at the working
tree of this commit**", whose own first sentence is "**Re-run after the last artifact changed, twice,
because this block was wrong about its own currency both times**" — was advanced from "round 14" to
"round 18", which asserts currency for `ci:lint`, `check-types`, the annotation ledger, `verify:pack`
and both validate lines as well.

That assertion is not safe here, because `b0f9d443` — the other session — changed the producer of
three of them: `scripts/check-atdd-annotation-ledger.mjs` (+22/−0, "the ATDD ledger counts only
runner-executed test files"), `scripts/check-workflow-hygiene.mjs` (+276/−…) and
`scripts/check-publish-dry-run.mjs`, all of which `ci:lint` and this block's own lines run. The commit
that noticed a concurrent session had invalidated one figure re-dated the whole block instead of
re-running it.

I re-ran the one that was cheapest to check and it holds — `node scripts/check-atdd-annotation-ledger.mjs
--spec 0017` → `9 claim(s) backed by a test annotation (spec-0017)`, exit 0. That is the finding's
shape exactly: the number is right and the reason to believe it was not the record's.

## The differential test (the request's headline question)

Outside my emphasis, but this is an oracle-strength question and that is mine. Three answers, all
measured.

**1. It is falsifiable, in both directions.** I transpiled `7fbac2d3`'s
`tests/helpers/shippedLaneCommands.ts` with esbuild into `tmp/r19qa/helpers.mjs` (nothing in the
subject was touched — the helper imports only `node:crypto`), transcribed the test body and its
twenty-one `live` and five `inert` shapes, and mutated only my copy:

```text
baseline (unmutated)          live=21 inert=5  misread=0  missed=0    GREEN
M-a  refusals() -> []         live=21 inert=5  misread=0  missed=21   RED
M-b  maskOf()  -> all true    live=21 inert=5  misread=5  missed=0    RED
```

Both instruments are load-bearing: killing the scan reddens `missed`, and killing the mask's
discrimination reddens `misread` through the `inert` list. Neither mutation is a load failure, and the
baseline reproduces the committed green, so the transcription is faithful.

**2. What is missing from the `live` list: forty-four decorations — and none of them escapes.** I built
a corpus of every construct absent from the twenty-one that puts a build at a position bash executes,
and scored it **against bash itself** rather than against the mask: a fake `npx` on `PATH` writing a
sentinel is the oracle, so "did a build run" is observed, not modelled.

```text
44 shapes: || & trailing-& brace-group while for until else elif if-condition backtick-subst
$( ) assignment-prefix env command exec time ! <( ) subshell-in-pipe leading-tab ;;& after-esac
after-fi after-done after-func heredoc-then-pipe nested-subst escaped-hash escaped-hash-semi
$'#' "#" backslash-continuation escaped-backslash-then-hash ;-in-dq ${x:-a} (( )) [[ ]] array-assign
quote-in-comment escaped-quote-then-sep <<-EOF heredoc-delim-with-paren comment-then-newline

ESCAPES (bash ran a build and refusals() returned []):   0
mask says NOT-CODE while bash ran the build:             0
fail-closed (bash did not run it, scan refused anyway):  4   || after success, while false,
                                                             until true, [[ -f a ]] false — allowed
```

So the `live` list is under-inclusive by at least forty-four and the lexer is not. That is worth
recording as the positive result of five root causes, and it is the first round since 15 in which a
sweep of this shape found nothing.

**One methodological warning, because it nearly became this report's finding.** My first sweep reported
`echo \# && npx tsup` as an escape — mask `false`, `refusals` `[]`. It was not: the backslash never
reached the probe, so the string under test was `echo # && npx tsup`, a genuine comment, for which
`false` / `[]` is the correct answer. Rebuilt from character codes
(`String.fromCharCode(92) + String.fromCharCode(35)`, bytes verified `… 32 92 35 32 …`), the lexer
answers `maskOf = true`, `refusals = ["npx tsup"]`. A probe that loses the escape it is probing reports
the subject's correct answer as a defect, and the corpus above is byte-constructed for that reason.

### A1 — The test's oracle is agreement between two instruments in one file, and a fault common to both is invisible to it by construction

This is not a defect I found live; it is the residual, and it is worth stating because the test is
this stage's answer to its most-repeated finding.

The property asserted is *`codeMask` and `refusals()` agree*. Every escape in rounds 15 to 18 was a
disagreement, so the test covers the whole observed history — but the record's own established fact #2
is "two copies of a rule diverge, and the one nobody is looking at is the one that is wrong", and this
file now has more than two copies of the tokenizer's assumptions. Where two of them are wrong the same
way, `misread` and `missed` are both empty and the test is green.

The `inert` list is what is supposed to anchor the mask to reality — "the mask must agree that they are
not code, or the mask is the thing that is wrong". It anchors it to **five shapes the stage asserted
are inert**, not to bash. Nothing in the committed suite runs a shell.

The oracle that does falsify the property is the one round 18's `implementation-reviewer` used (about
1600 cases with a fake bundler on `PATH`) and the one I used above. The record notes this itself —
"four of the five plantings were reviewers', not this stage's, and the story's discriminating power was
only ever established from outside." Six rounds later that is still true: **the only oracle that has
ever found a defect in this file lives in reviewer scratch and is deleted at the end of each round.**
Committing it — a `describe` that spawns `bash -c` behind `process.platform !== "win32"`, with the fake
bundler as the sentinel — turns the strongest instrument this spec has into a guard, and makes the
`inert` list derived rather than asserted.

### m2 — A tracked file was rewritten during this review, by another agent, and the working tree went dirty because of it

`.qfai/report/validate.log` is tracked. `git status --porcelain` was **empty** when I started and is now:

```text
 M .qfai/report/validate.log
```

```diff
-- run_id: run-20260821160310691          +- run_id: run-20260822121244334
-- errors: 1                              +- errors: 49
-- warnings: 0                            +- warnings: 403
```

**It is not mine.** All eight of my validate runs used `--root tmp/r19qa/shadow-*` and every one of
their run directories is inside a shadow (`run-20260822120333492`, `…0357068`, `…0635441`, `…0643181`,
`…0835200`, `…0844066`, `…0852888`, `…0901638`). The two directories that appeared in the **real** tree
are `run-20260822121233381` and `run-20260822121244334`, at 12:12, after my last run at 12:09, and
neither exists in any shadow of mine. It is a sibling reviewer of this round, running the unscoped
profile against the repository root.

Three things follow:

- **The record's refusal to cite `validate.log` is vindicated for the second consecutive round.** Round
  18's `qa-gatekeeper` reported the same event; the record calls it "the exact hazard this record cites
  when it declines to use `validate.log` as Hard Gate evidence". It has now happened in two of two
  rounds where anyone looked. That is not a hazard any more, it is the normal case.
- **Do not commit this file with round 19's work.** A `git add -A` at the end of this round would
  record another agent's unscoped run — `errors: 49, warnings: 403` — as this spec's evidence, at a
  revision whose scoped gate is `error=1`.
- I have **not** restored it. It is outside my partition, it is not mine to revert, and a
  `git checkout` of a file another session may still be writing is how work gets destroyed. Reported
  rather than repaired, per the round's rule.

Incidentally it corroborates B3 from a source that is not me: `errors: 49` is exactly the value my
working-copy shadow gives for the current pack state, and it is 45 higher than the same profile on the
committed subject.

### m3 — The amendment commit put a fourth `R0N_*.md` in a pack with three reviewers, and the response guard counts it

`1ecbeb07` added `R02_completion-reviewer.partial-first-attempt.md` to this pack. The response counter
in `stageEvidenceCounts.test.ts:670` is:

```ts
entries.filter((name) => /^R0\d+_.*\.md$/.test(name)).length
```

`R02_completion-reviewer.partial-first-attempt.md` matches it. Measured on disk right now, the
round-19 pack holds **four** matching files from **three** reviewers:

```text
R01_implementation-reviewer.md
R02_completion-reviewer.md
R02_completion-reviewer.partial-first-attempt.md
R03_qa-gatekeeper.md
```

Responses are counted over closed packs, so nothing is red today — I recounted the eighteen closed
packs by hand and they sum to **50**, which is what the record says. The problem is the round after
this one: when round 20 opens, this pack closes and contributes 4, so `## Final status` will owe
"**54** reviewer responses, **53 REVISE and one PASS**" for **three** reviewers' work — and the
partial carries `Verdict: **REVISE**` on its line 8, so the REVISE half will look internally
consistent while double-counting one reviewer's round.

It is the same class as everything else in `## Final status`: a number derived from a file-name pattern,
and a file named without checking the pattern. Rename it out of the matcher
(`completion-reviewer.partial-first-attempt.md`, no `R0N_` prefix) or state in the record that round 19
holds four response files for three reviewers, before the count is written.

## Coverage Depth Matrix (mandatory check)

`.qfai/evidence/coverage-depth-spec-0017.md` exists at the committed path at `7fbac2d3`, 518 lines,
**45 `❌` cells**, with a `§ "Every ❌ cell, named"` enumeration that makes "one justification per cell"
checkable rather than asserted, and its pinning test (`tests/assets/coverageDepthMatrix.test.ts`) is
green inside the `1446 / exit 0` run above.

The depth check itself, per the Coverage Depth Matrix rule — normal path **and** error/failure path per
story. Six of the nine do not have both:

```text
US-0017-0001  normal ✅  error ⚠️      partial
US-0017-0004  normal ❌  error ❌      no surface: 0 uploads, 0 builds
US-0017-0005  normal ❌  error ❌      five separate jobs, not matrix legs
US-0017-0006  normal ❌  error ❌      no hygiene lane is invoked by the shipped set
US-0017-0007  normal ✅  error ❌      NORMAL PATH ONLY — the flagged shape
US-0017-0008  normal ⚠️  error ❌      qfai-validate.yml still ships
```

**Each is enumerated and justified**, which is what the rule asks for: the three `❌ ❌` rows are the
unsatisfied stories the e2e file deliberately does not assert as absences, each with the ledger rows
that would close it, and the one normal-path-only row is answered at line 192 — "`US-0017-0007` ×
`Error path` — **the design has no failure to observe**". So this is **not** a REVISE on the depth
check; it is recorded here as the finding the rule asks for, because "justified" is a judgement that
has to be re-made each round and the justifications are the part of this artifact nothing derives.

One residual: the enumeration covers `❌` and the guard checks `❌`. `US-0017-0001`'s and
`US-0017-0008`'s error/normal `⚠️` cells are neither enumerated nor checked, and `⚠️` is the value that
means "partially covered" — the one a reader most needs the reason for.

## Tree state at finish, and an update to `m2`

- `git rev-parse --short HEAD` at finish: **`1ecbeb07`** — unchanged from start.
- `git status --porcelain`: **empty**. My partition is byte-identical to the copy taken before the
  first plant (`diff tmp/r19qa/backup-manifest.txt tmp/r19qa/final-manifest.txt` — no output), and
  `packages/qfai/dist/` was rebuilt from the restored assets.
- **`m2` self-corrected while I was writing.** `.qfai/report/validate.log` is now byte-identical to
  `HEAD:.qfai/report/validate.log` again, and both real-tree run directories
  (`run-20260822121233381`, `run-20260822121244334`) have been deleted. Whoever wrote it cleaned up
  after themselves. The finding stands as an observation — it happened, it is the second consecutive
  round in which it happened, and the window in which the tracked file held another stage's
  `errors: 49, warnings: 403` was real — but the tree is clean now and nothing needs to be reverted.

## Hard gate status

| gate | status |
| --- | --- |
| validate evidence present and scoped | **PASS** — `validate.spec-0017.json` reproduces byte-identically from a shadow of `7fbac2d3`; `paths.outDir` and `output.validateJsonPath` read from `qfai.config.yaml:5,37` as the contract requires |
| scoped gate result | **red as recorded** — `info=2 warning=0 error=1`, exit 1, `QFAI-ATDD-112` only. Recorded correctly; the gate itself has not passed |
| coverage (traceability) | **PASS** — 9 claims backed, exit 0 |
| coverage (depth) | **PASS with findings** — matrix present, committed, every `❌` enumerated; six of nine stories lack a full normal+error pair and each is justified |
| runtime proof | **PASS** — both suite totals and the callsite figure reproduce; the callsite figure recomputed from `git ls-tree` at two revisions |
| `--profile full` evidence | **FAIL** — B3: the sealed value is not reproducible from the repository |
| init surface (`US-0017-0004`) | **FAIL** — B1: a `#!/bin/sh` payload ships into every adopter tree with `test:e2e` at `1446 / exit 0` |
| RED/GREEN observation | **not routed this round** — no ledger row advanced at `7fbac2d3`; `git diff 7b7a50ea 7fbac2d3 -- .qfai/specs/spec-0017/tdd/test-list.md` is empty |

## Verdict

**REVISE.**

I can state a gate that passed — `vitest --project integration --project unit`, 1222/19, exit 0, the
figure `7fbac2d3` exists to correct, reproducing exactly against the subject's code. Six of the nine
figures §4 asks about reproduce exactly, the scoped gate's artifact is byte-identical, option 2's
disposition is re-verified rather than accepted, and forty-four new decorations run against real bash
found nothing wrong with the lexer after five root causes.

It is still REVISE, on two independent grounds:

- **B1/B2 — the init surface is beaten a third time.** Three bytes in front of the shebang, in a tree
  the path pin excludes, and all three questions pass a `#!/bin/sh` script into every adopter's
  repository with the whole `e2e` project green. And the second of the three questions has never been
  able to fire where this stage measures, on evidence that turns out to have been `ls` reporting the
  first question's answer.
- **B3 — the sealed `--profile full` value is 44/48 untracked scratch.** The rule is right and the
  three values reproduce; the number does not exist at any revision of this repository, and the block
  it sits in says these numbers are measured at the working tree of this commit.

Findings: **B1**, **B2**, **B3**, **M1**, **M2**, **M3**, **m1**, **m2**, **m3**, **A1**.

## Sign-off

- [x] Review verdict is explicit — REVISE, with the passing gate named.
- [x] Findings cite concrete artifacts or evidence — every one carries a command, a byte count, a
      digest or a captured run; every plant carries its restore diff.
- [x] Required gates and residual risks are recorded — the table above, plus A1's residual (the only
      oracle that has ever found a defect in the lexer is not in the suite).
