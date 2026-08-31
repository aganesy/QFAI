# R03 — qa-gatekeeper, round 15, spec-0017 (ATDD stage gates)

**Revision under review:** `21e2cdc6` at start. Recorded again at finish, below.

**Verdict: REVISE.**

## A gate that passed, stated first

`pnpm -C packages/qfai vitest run` (the whole suite, all seven projects) at `21e2cdc6` with the
working tree clean: **462 test files passed, 8 skipped; 5411 tests passed, 51 skipped; exit 0**, 199s,
started 04:00:53. Transcript: `tmp/r15-gate/baseline-full.txt`. `git status --porcelain` was empty
before and after.

`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017` reports
**`counts: info=2 warning=0 error=1`**, the single error being `QFAI-ATDD-112` on exactly the eight
TCs the record names — `TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070`. Exit 1 is
`--fail-on error` doing its job, not a second failure. Transcript: `tmp/r15-gate/validate-atdd.txt`;
artifact `.qfai/report/validate.spec-0017.json` (which the run reproduced byte-for-byte — it was not
even dirty afterwards). `.qfai/report/validate.log` was rewritten by the run and restored from a
`git show HEAD:` copy taken beforehand, per the request's trap note.

Both of that is scoped to what it says and clears nothing else.

## What I planted, and where

I am the only role writing to `packages/qfai/assets/init/root/.github/workflows/` this round, and I
used it. Three execution channels were planted into the two shipped workflow templates at 04:07 and
removed at the end of this report; the plant script is `tmp/r15-gate/plant.mjs` and the pre-plant
copies are `tmp/r15-gate/backup/`. Siblings who saw a diff in that directory between 04:07 and the
restore were seeing my instrument.

## Section 5 — the record, verified figure by figure

Verified and correct, by measurement rather than by reading:

| claim                                                | measured                                                  |
| ---------------------------------------------------- | --------------------------------------------------------- |
| scoped gate `info=2 warning=0 error=1`               | exactly that; `QFAI-ATDD-112` the only error               |
| `QFAI-ATDD-112` on eight TCs                          | `-0016 -0030 -0032 -0033 -0034 -0035 -0069 -0070`          |
| each of the eight has a recorded reason               | six carry a `CR-*` in the CR column, two an explicit reason |
| `e2e callsites at this tree: 880`                     | 880, over 89 files, by the guard's own `CALLSITE` rule      |
| `test:e2e` 1444 / 16 skipped                          | 1443 passed + 1 failed + 16 skipped = 1444 / 16 (see `m1`)  |
| `--project integration --project unit` 1219 / 19      | 1218 passed + 1 flake + 19 skipped = 1219 / 19 (see `m1`)   |
| mechanism corpus = 29, in all three derived phrasings | corpus holds 29; all three regexes match and agree          |

The eight `QFAI-ATDD-112` rows check out per row. `TDD-0016` → `CR-20260818-0007`, `TDD-0030` →
`CR-20260820-0001`, `TDD-0032`/`-0033`/`-0034`/`-0035` → `CR-20260820-0007`, and `TDD-0069`/`-0070`
carry "NOT BLOCKED by a CR — waiting on data that does not exist yet" with the reason spelled out.
Nothing is left blank and nothing points at a CR that does not name it.

## Section 2 — the key inversion, attacked by planting

Six channels were planted across two batches. Each uses **only keys already on
`ALLOWED_WORKFLOW_KEYS` / `ALLOWED_JOB_KEYS` / `ALLOWED_STEP_KEYS`**, so the inversion round 14 built
is never asked a question it can answer. Every one of the six left
`tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` at **10 passed / 10**, including the `refusals()`
scan, the program-set pin, the `ALLOWED_STEP_BODIES` multiset, `ALLOWED_ACTIONS`,
`ALLOWED_ACTION_COMMITS` and `ALLOWED_ACTION_INPUTS`.

| # | channel                                                          | file / job                      | spec-0017 E2E | whole suite            |
| - | ---------------------------------------------------------------- | ------------------------------- | ------------- | ---------------------- |
| 1 | second `setup-node`, `with: node-version: lts/*` + `cache: npm`   | `qfai-validate.yml#validate`    | green         | caught — on `cache:` only |
| 2 | `uses:`-only `pnpm/action-setup` step in an "inert" lane          | `qfai-tests.yml#unit`           | green         | **green — it ships**   |
| 3 | `if:` on the `qfai validate` step, so the lane validates nothing  | `qfai-validate.yml#validate`    | green         | caught — by a spec-0003 row |
| 4 | two `run:` bodies swapped **between the two files**               | `#validate` ⇄ `#component`      | green         | see `B2`               |
| 5 | second `setup-node`, `node-version: lts/*` and no `cache:`        | `qfai-validate.yml#validate`    | green         | see `B1`               |
| 6 | `runs-on` default changed from `ubuntu-latest` to `self-hosted`   | `qfai-tests.yml#verdict`        | green         | see `M1`               |

The answer to the request's first bullet is therefore **no, the inversion is not closed** — but not
because a seventh key exists. It is not closed because the enumeration answers *which keys* and four
of the enumerated ones carry execution in a **value** nothing reads, and because a step that carries
no `run:` at all is scanned by nothing in this gate except its own key list.

Isolated re-measurement, so the two ships are attributed rather than inferred: with **only** channels
5 and 2 planted and nothing else, the whole suite is **5410 passed / 51 skipped / 1 failed**, and the
single failure is `stageEvidenceCounts.test.ts`'s response count — caused by my two sibling
reviewers' reports landing in this pack while I measured, not by the plants (see `m2`). Transcript:
`tmp/r15-gate/planted3-full.txt`. Baseline for comparison: `tmp/r15-gate/baseline-full.txt`,
5411 / 51 / 0.

### `B1` A `with: node-version` literal ships past `US-0017-0003`, the story whose whole content forbids it

Planted into `qfai-validate.yml`, immediately before `Install dependencies (lockfile-aware)`:

```yaml
      - name: Set up Node via actions/setup-node 4.4.0 (planted override)
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: lts/*
```

**5410 of 5410 non-skipped tests pass with that in the shipped template.** Nothing in this repository
refuses it, spec-0017's gate least of all — and `US-0017-0003` is titled "an adopter receives no
hard-coded Node version to drift from".

Why every instrument misses it, in order:

- the keys are `name`, `uses`, `with` — all on `ALLOWED_STEP_KEYS`, so round 14's inversion is never
  asked anything;
- `actions/setup-node` is on `ALLOWED_ACTIONS` and the SHA is the exact one in
  `ALLOWED_ACTION_COMMITS`, so round 14's pin-value repair passes it;
- `node-version` is on `ALLOWED_ACTION_INPUTS`, and `readUses` reads input **keys** and never a
  value;
- there is no `run:`, so `refusals()`, `invocationsOf`, `classifyBuildCommand` and the
  `ALLOWED_STEP_BODIES` multiset all see nothing — the step contributes no digest, so the "one for
  one" correspondence stays exact;
- `US-0017-0003`'s own first `it` greps `/node-version:\s*['"]?\d/`. `lts/*` has no leading digit.
  So do `v20.11.0`, `>=20.19.0`, `latest`, `node`, `iron` and `--lts`. Six spellings of the literal
  the row exists to forbid, and the row sees a seventh only if it starts with a digit;
- `US-0017-0003`'s second `it` walks each job for the **first** `setup-node` whose `node-version`
  matches `${{ steps.X.outputs.Y }}` and `continue`s past any that does not. A planted step placed
  after the real one is skipped by that `continue`, and the row then runs and asserts the *real*
  resolver — reporting green about a step that no longer decides the version.

The effect on an adopter is the exact drift `BR-0017-0027` and the row's own docstring name: the
adopter's `.nvmrc` is read, published, consumed by the real `setup-node`, and then silently
overridden four lines later. The resolver still resolves; nothing runs on what it resolved.

This is not the key enumeration failing. It is the enumeration answering the wrong question: it
decides **which keys may appear** and four of the enumerated ones — `node-version` and
`persist-credentials` and `fetch-depth` under `with`, and `if`, `needs`, `outputs`, `permissions`,
`runs-on` at job level — carry their meaning in a value the gate does not read. The docstring on
`ALLOWED_WORKFLOW_KEYS` claims a key nobody wrote down is refused; it is silent about a key everybody
wrote down being given a value nobody reads, which is the shape all six of my channels have.

### `B2` A `uses:`-only step ships into a lane the shipped file documents as executing nothing

Planted into `qfai-tests.yml`, as the first step of the `unit` lane:

```yaml
      - name: Set up pnpm via pnpm/action-setup 4.4.0 (planted)
        uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320
```

Same measurement, same result: **nothing in the tree refuses it.** Two keys, both on
`ALLOWED_STEP_KEYS`; an action on `ALLOWED_ACTIONS` at its own pinned commit; no `with:` at all, so
`ALLOWED_ACTION_INPUTS` has nothing to check; and **no `run:`**, so every body-shaped instrument in
this spec — `refusals()`, the program-set pin, `bodyDigest`, the multiset — is structurally unable to
see it. `bodies` gains no entry, so the "one for one" assertion round 14 built stays exactly satisfied
by twelve digests against twelve.

What it contradicts is not a subtle invariant. It is the shipped file's own header, three lines an
adopter reads:

> `| packageManager precondition | none today - no lane installs. …|`
> `Every lane is declared but inert until you opt in, so this file executes no test in your repository today.`

`pnpm/action-setup` resolves a pnpm version from the adopter's `package.json#packageManager` and
installs it. That is an install, in a lane, in the file that says no lane installs — and it is exactly
the class `US-0017-0004` is about ("an adopter's lanes do not each rebuild what one could produce"),
arriving through the one door that story's assertions cannot look at.

`tests/integration/shippedWorkflowInertness.test.ts` is the natural home for the refusal and does not
reach it: its assertion is scoped, by name, to "detection and verdict install nothing". The five layer
lanes are not covered by it.

The general statement, which is what I would want fixed rather than the two instances: **a step with
`uses:` and no `run:` is scanned by exactly one predicate in this spec — the key list — and passes it
by construction, because `uses` and `with` are on the list.** Every other instrument in
`shippedLaneCommands.ts` takes a `run` body as its argument. That is the same "the scan reads `run:`
scalars and nothing else" claim the record already carries as a RETRACTED entry (`stopped being a
reading`), still true of everything except the key list.

### `M1` Four of six channels were caught, and spec-0017's gate caught none of them

The four refusals all came from `spec-0003` rows in `tests/integration/`:

| channel                                  | refused by                                                      |
| ---------------------------------------- | --------------------------------------------------------------- |
| `with: cache: npm` on the second setup-node | `shippedWorkflows.test.ts` TC-0003-0029                        |
| `if:` on the `qfai validate` step        | `shippedWorkflowPortability.test.ts` TC-0003-0053               |
| two `run:` bodies swapped between files  | `shippedWorkflowPortability.test.ts` TC-0003-0044 / -0053, `shippedWorkflowShapeGate.test.ts` TC-0003-0049 |
| `runs-on` default → `self-hosted`        | `shippedWorkflowRunners.test.ts` TC-0003-0041 (three rows)      |

`tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` reported **10 passed / 10** on every one of the six,
in all three batches. That is worth stating plainly because of what the file claims about itself: it
is this spec's only US surface, it carries the nine `US-0017-*` annotations the gate reads, and its
`US-0017-0004` block is 220 lines of argument that enumeration "fails closed … which is the correct
cost for a shipped surface". Measured this round, the surface it protects has four live refusals and
it owns none of them.

That is not an argument for deleting it. It is an argument that the record's account of *where the
boundary is* is wrong: § "the boundary moved, and the scanner stayed" names `ALLOWED_STEP_BODIES`,
`refusals()`, `ALLOWED_STEP_ENV` and the three key lists as the boundary, and every one of those is a
predicate over a `run:` body or over a key **name**. The things that actually refused a channel this
round read **values** — a `cache:` expression, an `if:`, a `runs-on` selector, a step's position in
its job — and they live in a different spec's rows, where a spec-0017 reader will not find them and a
spec-0017 repair will not maintain them.

Concretely, and this is the part I would act on: channels 3 and 6 (`if:` on a step, `runs-on` value)
are refused **today** only because `spec-0003` happens to assert something adjacent. Neither is
refused by any statement about `US-0017-0004`, and neither `ALLOWED_STEP_KEYS` nor `ALLOWED_JOB_KEYS`
would notice if those `spec-0003` rows were changed. The `if:`-on-the-validate-step channel in
particular is a "green check over nothing" — the failure `US-0017-0008` and `BR-0017-0032` are
written against — and spec-0017's own gate is green over it.

### `M2` The `ALLOWED_STEP_BODIES` multiset pins counts, not locations — a body moved between files is green

Round 14's repair changed a digest-keyed `Map` to a sorted multiset so that "one reviewed body run
twice is two executions". It closes duplication. It does not close **permutation**, which is the other
half of the request's question, and the two are not the same claim.

Measured (channel 4): I swapped the `run:` body of `qfai-validate.yml#validate [qfai validate]` —
`npx qfai validate --profile full --fail-on error` — with the body of
`qfai-tests.yml#component [component lane placeholder]`. After the swap the adopter's validate lane
echoes a placeholder and an inert test lane runs the validator. Both assertions stayed green:

```
bodies.filter(not in ALLOWED_STEP_BODIES).map(at)   ->  []      (unchanged)
bodies.map(digest).sort()  ===  [...ALLOWED_STEP_BODIES].sort()  (unchanged)
```

because both sides are multisets over digests alone. The `at` field — `${id} [${name}]`, the job and
step a body was found in — is computed two lines earlier and reaches an assertion only as the
`.map(body => body.at)` of bodies whose digest is **absent** from the list. Every digest here is
present, so that array is `[]` on every run and `at` is never compared to a location. The one field
that records where a body lives is the one field the pair of assertions cannot read.

The location is not missing information: `ALLOWED_STEP_BODIES` already carries it, in the comment
above each digest (`// qfai-tests.yml#detection [Select lanes from the name-only diff] — 40 lines`).
Twelve comments state exactly the fact the assertion declines to check, which is the shape this
record calls out elsewhere — a claim about how something is *written* standing in for what it does.
A `ReadonlyMap<digest, at>` compared to the derived `bodies` would close it, and would make the
existing comments load-bearing instead of decorative.

Two smaller answers to the same bullet, from reading rather than planting:

- **a digest listed twice is inert.** `ALLOWED_STEP_BODIES` is a `Set`, so `[...ALLOWED_STEP_BODIES]`
  de-duplicates before the comparison. Pasting a digest a second time changes nothing and reddens
  nothing — the "multiset" is a multiset on one side only.
- **two steps swapping bodies within one job** is the same permutation at smaller scope and is
  likewise green; the swap I measured crossed files only to make the consequence easy to state.

### `M3` The merged class C is vacuous in the other direction: it accepts a cell that is simply untested

The request asks this directly and the answer is yes, by construction rather than by oversight.

`packages/qfai/tests/assets/coverageDepthMatrix.test.ts:297-304`:

```ts
A: (row) => statusOf.get(row) === "❌",
B: (row, column) => statusOf.get(row) !== "❌" && (column === "State transitions" || column === "Combinatorial"),
C: (row, column) => statusOf.get(row) !== "❌" && column !== "State transitions" && column !== "Combinatorial",
```

`C` is exactly `¬A ∧ ¬B`. Every `❌` cell in the matrix satisfies exactly one of the three, so the
partition is not a classification at all — it is a **case split on coordinates the table already
carries**, and membership is forced. There is no input to the guard that is a class-C cell and no
input that is a misfiled one.

Measured on a mutated copy (`tmp/r15-gate/classc.mjs`, writing
`tmp/r15-gate/coverage-depth-MUTATED.md`; the real file was not touched). I took `US-0017-0002 ×
Special values`, today `✅` on a `✅` row — a cell that is covered by a real assertion — and scored it
`❌`, i.e. the case "someone deleted the test and nobody replaced it":

```
class A admits US-0017-0002 x Special values: false
class B admits US-0017-0002 x Special values: false
class C admits US-0017-0002 x Special values: true
```

So a plainly untested cell is admitted by, and only by, the class whose stated property is "the cell
is **inapplicable by the design rather than untested**" and whose section says "These are the `❌`s
that no future work on the story would turn green". The two things the class distinguishes between
are the two things it cannot distinguish.

The roster check does not repair this. It requires the prose to contain the coordinates in the form
`` `US-0017-000N` × `Column` `` and nothing more — the reason **text** beside them is unread, so a
one-line bullet asserting inapplicability satisfies it as well as an argument does.

And there is no honest alternative filing. `unknownClass` refuses any class the test does not know,
so a reviewer who finds a real gap on a covered row must either file it under C — asserting it is
inapplicable — or edit the test. The guard's own comment records that this was found before ("round 4
found that a newly discovered gap on a covered row had no admissible class at all"); merging C and D
did not add the missing class, it removed the last place the distinction could have been noticed.

What would fix it is not a fourth letter with a residual property. It is giving C a **positive**
property something can violate — the shape `B` already has and `C` does not.

### `M4` A fourth statement of the mechanism-corpus size sits one line above the three derived ones, underived — and the sentence certifying the derivation is false

The derivation itself is right. `tmp/r15-gate/mech.mjs` re-runs the guard's extraction against the
tree: the corpus holds **29**, and each of the three regexes matches exactly once and agrees.

```
/(\d+) mechanisms pinned/g -> 1 ["29 mechanisms pinned"]
/lets all (\d+) through/g  -> 1 ["lets all 29 through"]
/with all (\d+) listed/g   -> 1 ["with all 29 listed"]
```

Two problems around it.

**First, the fourth site.** `.qfai/evidence/atdd-spec-0017.md:1011`:

```text
escape corpus                         29 mechanisms, 0 still open
```

Same number, same fact, different wording — and none of the three regexes matches it. I ran all three
against every line of the record that carries both the word "mechanism" and a digit; line 1011 is
`covered=false`. It is the numeral this guard was written for, one line above the numeral it guards,
and it will go stale on exactly the schedule the guard's own docstring predicts: "the corpus grows
every round a reviewer proves a new escape".

**Second, the sentence at line 1022 is false about its own subject:**

> **The three numerals in that block are derived**, by `tests/assets/stageEvidenceCounts.test.ts`,
> from the corpus itself.

Two of the three derived numerals are in that block (both on line 1015). The third — `with all 29
listed` — is on line **1019**, in the prose *after* the fence, not in the block. And the block
contains nine other numerals (`29`, `0`, `12`, `0`, `62`, `18`, `620`, `0`, `16`) that nothing
derives, including the `12` shipped bodies and the `16` pinned programs, both of which the E2E does
pin as sets and neither of which is tied to the record's count of them.

So the claim a reader takes from that paragraph — "the numbers in this block are checked" — is true of
two of eleven. Round 14's repair moved the numerals it knew about and wrote a sentence that certifies
the block.

### `m1` The `## Final status` guard's numeral table ends at `fifteen`, and this is round fifteen

`stageEvidenceCounts.test.ts:513-529` maps spelled-out numerals to integers so it can check
"**fifteen** rounds" against the pack directories on disk. The map stops at `fifteen`.

Measured: `.qfai/review/` holds **15** directories at or after `FIRST_PACK`, and the record
(line 2348) says "**fifteen** rounds, **38** reviewer responses, **37 REVISE and one PASS**". At
`21e2cdc6` all three are correct — 15 packs, and `git ls-files` counts 38 `R0N_*.md` under those
directories.

Round 16 opens a sixteenth pack. `WORDS["sixteen"]` is `undefined`, `statedRounds` is then `undefined`,
`undefined !== 16`, and the row is red **whatever the record says** — the correct record and the
incorrect one fail identically, and the only repair is a test edit. For a guard whose entire subject
is numbers with a one-round lifetime, having a one-round lifetime of its own is worth fixing before it
fires rather than after. Parsing the numeral (or accepting a digit) costs less than the next round's
diagnosis.

### `m2` The response-count row is red for the whole duration of every review round, and it reddens a required CI leg

`.qfai/evidence/atdd-spec-0017.md` states a response count; the guard counts `R0N_*.md` across every
pack **including the one currently open**. So the moment the first reviewer of a round writes its
report, the record is behind by one and stays behind until the stage applies the round.

This is not hypothetical and I did not have to plant it. At 04:00 I ran the whole suite at a clean
`21e2cdc6`: 5411 passed, exit 0. At 04:02 my sibling `completion-reviewer` wrote its report. At
04:04 I ran `--project e2e` and got:

```
responses: record says 38, disk holds 39
the verdict split sums to 38 against 39 responses
```

`--project e2e` exited 1 — **1443 passed / 1 failed / 16 skipped** — and `tests/assets/**` runs in
the `e2e` project, which `ci.yml` executes as a required matrix leg. Every later run in this session
reproduced it, at 40 and then 41 responses as R01 and my own report landed.

This is the same defect the record already reports about the pack **seal** at round 5 — "its first
version required a seal for every pack on disk, which no honest edit can satisfy while a pack is
under review, and it made a required CI leg red at the commit that added it". The seal was given an
in-flight exemption. The response count, added later, was not, and the exemption it needs is the same
one: exclude the newest pack, or exclude any pack with no `summary.json`.

Two consequences for the record's own § P7 block, which is why I am filing this rather than shrugging:

- `pnpm -C packages/qfai test:e2e … exit 0` is reproducible only in the window before the first
  reviewer of a round writes. Round 14's `completion-reviewer` filed the same class of finding
  against the same line;
- the two totals it certifies are still correct — 1443 + 1 = 1444 passed / 16 skipped, and
  1218 + 1 flake = 1219 passed / 19 skipped in `--project integration --project unit`. The
  integration/unit failure was `spec0006DoctorProbeOrder.test.ts` at 15.1s, green in both full-suite
  runs, so it is a load-dependent flake and not a count problem. Both figures verify.

### `m3` A retracted claim still stands as a present-tense assertion, in a wording no needle matches

The first half of the request's question is clean: **no `RETRACTED` entry is inert.** The guard's own
`has no entry that matches nothing, in either direction` row enforces it, and it is green at
`21e2cdc6` in every full-suite run I made. The six needles added this round all match.

The second half is not. `RETRACTED` carries `the scoped gate is error=2`. Searching the same five
`GOVERNANCE` files for the *fact* rather than the wording,
`.qfai/decisions/DR-0017-0010-…-exists.md:60` asserts, unquoted, in a bulleted list:

> - there are **two** errors at HEAD, `error=2`, and **both are scoped to `.qfai/specs/spec-0017`**;
> - `QFAI-ATDD-111`'s subject is `US-0017-0007` …

Measured this round: there is **one** error at HEAD and it is `QFAI-ATDD-112`. `QFAI-ATDD-111` does
not fire at all. Both bullets are false as written, both are in the present tense, both are in a file
the guard searches, and the needle does not reach either because the record's own § P7 rule names the
exact hazard — "A record naming HEAD is stale at the next commit".

**This does not re-open P1d.** `DR-0017-0010`'s decision — that two tuning-guard rows cannot be
reddened before the history they measure exists — is untouched by this, and I have not re-examined it.
What is stale is a supporting measurement inside the file, which is the class the `RETRACTED` list
exists to catch and which its needle-shaped instrument cannot catch when the wording differs.

The neighbouring `CR-20260820-0012:31-32` carries the same `error=2` twice and is **not** a finding:
it opens "Every link verified at `16f611c7`, against run `32368851703` on that sha", which dates the
measurement. That is the difference between a stale claim and a historical one, and it is the
distinction `DR-0017-0010`'s bullet is missing.

### `A1` A stray zero-byte file appeared at the repository root mid-round; it is a sibling's probe, and I removed it

At 04:16 `git status` showed `?? [hello,` at the repository root — zero bytes, created during the
window in which `R01_implementation-reviewer.md` was being written. That report's §
"here-document" section prints `refusals() == ["hello", "DELIM"]`, so the file is the word-split
remains of an unquoted array used as a redirect target by a sibling probe running with the repository
root as its cwd.

It is not mine (my writes this round were `tmp/**`, the two workflow templates, and this file), it is
not the suite's — the tree was clean immediately after my 04:00 full-suite run and after the two
later ones — and a root-level addition is forbidden outright by
`.agents/rules/root-additions-policy.md`. I deleted it; the root is clean now and it has not returned
across two subsequent full-suite runs. Recording it rather than silently cleaning up, because round
11's gatekeeper found a file it had not created in its own partition and the right response was to say
so: a probe that leaves a file behind can attribute a later catch to the wrong instrument.

## What I attacked and could not break

Recorded because a reviewer who reports only what broke leaves the next round re-attacking the same
places.

- **`ALLOWED_ACTION_COMMITS` is reachable at the job level.** Planted
  `uses: actions/checkout@0000…0000` as a key of the `unit` **job** in `qfai-tests.yml` and ran the
  E2E row. Three refusals fired at once: `qfai-tests.yml#unit: declares uses` (the key list),
  `actions/checkout is pinned elsewhere to 11d5960a… , here to actions/checkout@0000…` (the new
  value check), and `US-0017-0002`'s checkout-vs-`persist-credentials` count. `readUses` reads
  `holder["uses"]` unconditionally at all three levels, so round 14's repair covers every `uses:` the
  document can carry, including the one on a job that round 13 found. Restored.
- **`ALLOWED_ACTION_INPUTS` refuses what it should.** `cache:` on the planted second `setup-node` was
  refused (channel 1) — by a `spec-0003` row, but refused.
- **No `RETRACTED` entry is inert.** The guard's own dormancy row enforces it and it is green.
- **The three mechanism-corpus derivations are live and agree with the corpus** — all three phrasings
  are present in the record and all three say 29 against a corpus of 29.
- **The eight `QFAI-ATDD-112` rows each carry a recorded reason** in the ledger's own Notes column,
  six naming a `CR-*` and two explaining why no CR applies.

## Verdict

**REVISE.** Two execution channels ship through the whole tree (`B1`, `B2`), demonstrated by plant and
by a 5462-test measurement rather than argued. The four remaining findings are about the record's
account of its own boundary (`M1`, `M2`) and about two guards whose properties do not constrain what
they claim to (`M3`, `M4`).

Gates that passed, so the verdict is not a blanket one: the whole suite at `21e2cdc6` before any
sibling wrote (`5411 passed / 51 skipped / exit 0`), and the scoped ATDD gate
(`info=2 warning=0 error=1`, `QFAI-ATDD-112` alone, eight TCs, each with a recorded reason). This PASS
on those two gates covers those two observations and nothing else; it does not clear the stage.

**Revision at start `21e2cdc6`, at finish `21e2cdc6` — the subject did not move while I worked.**
Every plant was restored from `tmp/r15-gate/backup/`, taken before the first plant, and
`git status --porcelain --untracked-files=all` is empty at the time of writing. Nothing was committed.
