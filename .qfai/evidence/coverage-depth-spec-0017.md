# Coverage Depth Matrix — spec-0017

Scope: the nine `US-0017-*` this spec declares, scored against
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`. **Eight are covered; `US-0017-0007`
is not** — its claim was withdrawn in round 1 and the row is scored as the gap it is. The 82
`TC-0017-*` are `L1`/`L3` and belong to `tdd/test-list.md` under `/qfai-implement`; this matrix does
not restate them.

Committed, because it is a governance record: one justification per `❌`, and § "Every `❌` cell,
named" below is the enumeration that makes "one per cell" checkable rather than asserted.

## What "the E2E surface" is for this spec

`spec-0017` has two halves — QFAI's own CI, and the same scaffold in the templates QFAI ships. The
own half is asserted directly against `.github/workflows/**` by the integration slices. The half a
user story is about is the adopter's, and it has one end-to-end surface: run `qfai init` into an
empty project and read what arrives. Every cell below is scored against **that** surface, not against
this repository's own workflows, which is why several rows carry `❌` for work the own tree has and
the shipped tree does not.

## The finding that re-scored this matrix after round 1

The five shipped layer lanes — `unit`, `component`, `integration`, `api`, `e2e` — **run nothing**.
Each has exactly one step:

```yaml
- name: integration lane placeholder
  run: echo "integration lane placeholder - opted in, but the test-lane body ships in a later revision of this file"
```

Round 1's `qa-gatekeeper` found this and it had not been disclosed. The first version of this matrix
read job names and structure and never read a step body, which is the same error as the vacuous
claims implement rounds 4-6 kept finding: a property asserted over how something is *written* rather
than over what it *does*. Two consequences, both applied below:

- **`US-0017-0004`** — "no lane rebuilds what one could produce" passes because no lane runs
  anything at all. Its `Normal path` was already `❌`; what changes is that the `❌` now names the
  right reason.
- **`US-0017-0005`** — `Normal path` drops from `⚠️` to `❌`. Counting five lanes certified layer
  separation over five stubs. Five `echo` steps are not a layer split; they are a layer split's
  placeholder, and the matrix may not score the shape as if the substance were there.

## The matrix

| US ID        | Normal path | Error path | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ----------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0017-0001 | ✅          | ⚠️         | ❌              | ⚠️             | ❌                | ❌            | ✅              | ⚠️     |
| US-0017-0002 | ✅          | ✅         | ⚠️              | ✅             | ❌                | ⚠️            | ✅              | ✅     |
| US-0017-0003 | ✅          | ✅         | ⚠️              | ⚠️             | ❌                | ❌            | ✅              | ✅     |
| US-0017-0004 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0005 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0006 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0007 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0017-0008 | ⚠️          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0009 | ✅          | ✅         | ⚠️              | ⚠️             | ❌                | ❌            | ✅              | ✅     |

Totals by `Status`: **✅ 3 / ⚠️ 1 / ❌ 5**.

**That total sums two measurements, and it is worth saying so before it is read as one.** Four rows —
`US-0017-0002`, `-0003`, `-0005`, `-0008` — name the own tree in their own titles, so their cells score
the adopter-facing **half** of the story (see § "The scoring surface" below); the other five are scored
whole. Round 2's `completion-reviewer` raised it. The alternative — scoring the own half here too — is
worse: it would double-count what the `Integration` rows of `tdd/test-list.md` already score, in a
matrix whose declared surface is `qfai init`.

The first version of this file declared `✅ 3 / ⚠️ 2 / ❌ 4`, which was wrong: it counted nine rows
into eight slots. Round 1's `qa-gatekeeper` cross-tabulated the column and got `✅ 2 / ⚠️ 2 / ❌ 5`,
and noted that this file's own five justification sections agreed with its count rather than with its
total. Corrected, and the counts are now pinned by
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` so the table and its total cannot disagree
again.

Two cells then moved on their merits while round 1's findings were being applied, which is why the
total is `✅ 3 / ⚠️ 1 / ❌ 5` rather than the `✅ 2 / ⚠️ 2 / ❌ 5` the gatekeeper measured:
`US-0017-0003` rose because the assertion it was missing turned out to be available and was written
(§ below), and `US-0017-0004`'s `Oracle strength` fell because an oracle for an assertion is not an
oracle for a story. Neither movement changes the `❌` count.

## The scoring surface, and where it does not match the stories

The first version of this file justified scoring against the shipped tree with a premise: "a user
story is about the adopter". Round 1's `completion-reviewer` read that against this spec's US
catalogue and the premise does not hold. **Four of the nine stories name the own tree explicitly**:

- `US-0017-0002` — "**Own-CI** supply-chain hardening…", goal "every own-CI job…"
- `US-0017-0003` — "the setup preamble to exist exactly once **in the repository**", and its
  Non-goals *rule out* shipping the mechanism to adopters (a composite action under the shipped
  `.github/` is a hard pack failure, DTC-1)
- `US-0017-0005` — "separated into their own **own-CI** jobs and matrix legs"
- `US-0017-0008` — "**the repository's own** duplicate of the shipped validate workflow deleted"

So scoring every cell against the adopter's tree biases in both directions at once: it understates
the own-tree stories, whose obligations `tests/scripts/ownWorkflowTopology.test.ts` and
`tests/scripts/workflowHygiene.test.ts` do assert and which are scored nowhere, and it credits
shipped-tree observables to own-tree obligations.

**Stated as a deviation rather than as a premise.** This matrix scores the E2E surface, and the E2E
surface for this spec is `qfai init`. That is a real limit of this matrix, not a claim about what user
stories are. The own-tree half of each of the four is asserted, and here is where:

| story          | own-tree assertion                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `US-0017-0002` | `tests/scripts/ownWorkflowTopology.test.ts` — SHA pins and `persist-credentials` across the set |
| `US-0017-0003` | `tests/scripts/workflowHygiene.test.ts` — the single shared setup definition, own tree          |
| `US-0017-0005` | `tests/scripts/ownWorkflowTopology.test.ts` — the seven matrix legs and the pinned check names  |
| `US-0017-0008` | `tests/scripts/ownWorkflowTopology.test.ts` — the retired duplicate and the folded profile run |

Those assertions are `Integration` rows of `tdd/test-list.md` and are scored there, not here. What
this matrix scores for those four stories is the adopter-facing half only, and each row's cells should
be read with that scope.

## Every ❌ cell, named

38 depth cells are `❌`, plus 5 in `Status`. The contract is one justification per cell, so each is
assigned a reason class here — **by name, in a table a test can read** — and no cell is left to be
inferred from a row-level narrative.

The first version of this section declared only the class SIZES (`30 + 7 + 1`). Round 2's
`completion-reviewer` and `qa-gatekeeper` independently broke that: cutting a class's enumeration
while leaving its stated size reddened nothing, renaming a class member to a cell the table scores
`⚠️` reddened nothing, and resizing two halves so the sum survived reddened nothing. A partition
asserted by its total is not asserted. The table below is the partition, and
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` checks it against the table's own cells for
completeness, disjointness and no non-`❌` member.

| class | US ID        | `❌` columns                                                                              |
| ----- | ------------ | ---------------------------------------------------------------------------------------- |
| A     | US-0017-0004 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial |
| A     | US-0017-0005 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial |
| A     | US-0017-0006 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial |
| A     | US-0017-0007 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial, Oracle strength |
| A     | US-0017-0008 | Error path, Boundary values, Special values, State transitions, Combinatorial              |
| B     | US-0017-0001 | State transitions, Combinatorial                                                          |
| B     | US-0017-0002 | State transitions                                                                         |
| B     | US-0017-0003 | State transitions, Combinatorial                                                          |
| B     | US-0017-0009 | State transitions, Combinatorial                                                          |
| C     | US-0017-0001 | Boundary values                                                                           |

Sizes, derived from the table above: **A 30, B 7, C 1 — 38 cells.**

**Class A — property: `Status = ❌`. The shipped surface does not exist, so no depth is reachable.** A depth column asks how
thoroughly a behaviour is exercised. Where the behaviour is absent from the adopter's tree there is
nothing to exercise at any depth, and scoring `⚠️` would claim partial exercise of nothing. Each
row's own section below says what is absent, what was measured, and which ledger row closes it. This
is the honest `❌`: not "we did not test it" but "there is no it".

**Class B — property: `Status ≠ ❌` and the column is `State transitions` or `Combinatorial`. The
E2E surface reads files and cannot run a workflow.** A state transition here means "a
documentation-only push produced a narrow lane set, and the next push a wide one". A combinatorial
cell means "these lane subsets, crossed with these change classifications, produce these skip
decisions". Both need a **real run**; the surface this file scores is a directory that `qfai init`
just wrote. PR #794 now provides real runs — `detect`, the `if:` plumbing, the seven-leg matrix and
the derived verdict all observed working in GitHub Actions — and **nothing consumes them**. That is
the gap, it is the same gap for all seven cells, and closing it needs a surface that reads
workflow-run history rather than a file. No ledger row proposes one; the absence is recorded as open
risk 6 of the stage evidence.

Class B covers only the four rows whose surface exists. The same two columns on `US-0017-0004` …
`-0008` are class A: those rows have no surface to run, so the reason they are `❌` is the absence,
not the harness.

**Class C — property: the column is `Boundary values` on `US-0017-0001`. A single shipped value
admits no boundary.** `US-0017-0001` × `Boundary values`. The
detection job emits one verdict per push; there is no sequence, count or limit to sit at the edge of.
A boundary cell over a single-valued output is not partially covered, it is inapplicable, and `❌` is
how this matrix spells that — flagged here because it is the one `❌` in the table that no future work
would turn green.

## Justifications, one per ❌ status row

### US-0017-0004 — measurement-gated build reuse and artifact-upload hygiene: ❌

Measured in the shipped tree: **0 `upload-artifact` steps and 0 bundler builds**, and — round 1's
finding — the five lanes that would do the building run `echo`. There is nothing to reuse and nothing
to upload, so the obligation has no surface an adopter could receive.

The row is not skipped: the E2E test asserts the invariant that survives the gap — no shipped lane
runs its own build — and the oracle confirms it reddens when one does.

**`Oracle strength` is `⚠️`, down from `✅`.** Round 1's `completion-reviewer` applied
`references/test-case-depth-checklist.md:82` — "no loop asserts over a collection that is empty by
construction" — and the assertion does exactly that: it filters `job.steps[].run` for build commands,
and every step in every lane is an `echo` placeholder, so the collection is empty before the filter
runs. `E4` is a sound oracle **for the assertion** and not for the story: an oracle shows that a case
can fail, and this row has no case. Scoring six category cells `❌` and the oracle `✅` is the same
incoherence the checklist bars in the other direction.

What the oracle establishes is that the assertion discriminates — and getting that far took twelve
versions of the predicate, each measured, each of the first eleven reported as clean by the party that
wrote it and then broken by a corpus someone else chose:

```text
v1  one flag-value pair. `pnpm run build`, `npx tsup` and six more reddened nothing
v2  a package-manager list plus `build` anywhere after it. Caught `npx tsc --noEmit`
v3  `build` as a standalone shell word. Missed nine builds, reported ten non-builds; caught
    `rm -rf build dist` and a comment in a JS block
v4  verb plus first target. Fixed those, then lost 20 of the 23 forms v3 caught, because returning
    on the first target hides everything after `&&` — and reported `pnpm ci:build-verify` as a build
    purely because of the script's NAME
v5  shell segments, per-manifest script bodies, and a third `heuristic` verdict. Round 5 broke it
    ten ways, the worst being that a manifest lookup which MISSED returned the strong `build`
    verdict from the bare name — so `pnpm --filter qfai ci:build-verify` was `build` while
    `pnpm ci:build-verify` was `heuristic`: one command, two verdicts, decided by a lookup failure
v6  a global `sawFlag`: any flag ended the subcommand position. Round 6 measured seven builds v5
    had caught going to `none` — `make -C packages/qfai build`, `make -j4 build`,
    `cargo --locked build`, `gradle --no-daemon build`, `bazel --output_base=/tmp build //...`,
    `docker buildx build --push .`, `docker -H tcp://x build .`
v7  the narrower rule v6 needed, but still global: one set of "flags that take a directory" for
    every runner. Three of its members are BOOLEAN in the tools it was applied to (`-B` is
    make's `--always-make`, `-S` its `--no-keep-going` and gradle's `--full-stacktrace`), so
    `make -B build` was `none` while `make --always-make build` was `build` — one command, two
    verdicts again, from a set that exists for `cmake --install build` alone. And `run` was a
    global passthrough, so `docker run --name build-agent alpine` was a build: the real
    subcommand skipped, a container name read as a target. Fifteen defects over 59 probes
v8  per-family grammars, which is what v7 lacked — but one global rule stayed: a spaced flag
    consumes its value unless it is a known boolean, with `known` hardcoded `true` for every build
    tool. So no tool's spaced flag consumed anything and its value landed in the subcommand
    position: `gradle --console plain build` was `none`. Round 8 measured 25 of 66 disagreeing
v9  each tool declares which of ITS flags take a value, which is the knowledge v6, v7 and v8 each
    approximated globally. Plus: a flag never names a build outside a per-tool allowlist; a bare
    token carrying `=` is a setting; and for a tool EVERY bare token is a candidate subcommand,
    not just the first
v10 forty-five grammar members deleted, because round 8's other finding was that the corpus pinned
    45 of 207 and the test that claimed to pin them all detected nothing (below)
v11 wrappers and managers declare their own flags too. Round 8 planted a real build in a shipped
    lane eleven ways and TEN went unnoticed: a wrapper's own flags were never consumed, so the
    scan broke on `nice -n` and `xvfb-run -a` and read `19` as the command; `timeout` was not a
    wrapper at all; and `-w` is boolean for pnpm and takes a value for npm, one spelling with two
    meanings, which is `-B` in make and cmake one level up
v12 tools declare their own SUBCOMMANDS, and the last two families get grammars. Round 9 planted
    again and did far worse: 18 of 20 for one reviewer, 34 of 40 for the other, and fifteen of the
    eighteen were tools this grammar already declared. `mvn package`, `gradle assemble`,
    `dotnet publish`, `make`, `ninja`, `sbt compile`, `go install` and `rake` are the canonical
    builds of eight of thirty entries, and a build was recognised only when a bare token split to
    contain the literal word. Also: interpreters had no flag grammar, so `bash -c "pnpm build"` —
    the commonest way to put a compound command in a `run:` step — had been `none` for eleven
    versions; and a wrapper's tail is now FOUND rather than counted, which is what finally saw
    through `xvfb-run -a -s "-screen 0 1024x768x24" pnpm build`
```

Two claims previously recorded here are withdrawn. That round 2 "rebuilt the scan **around the
verb**" — it did not; it was a closed five-member package-manager list, so `make build`,
`turbo run build`, `cargo build` and six more were invisible. And v3's "21 caught / 14 rejected / 0
misclassified" — a figure measured only against a corpus this stage chose, which is how every version
of this predicate came to be reported clean and then broken.

v4's naming defect is the one worth keeping in view: it measured **how a script is *called* rather
than what it *does***, which is the failure mode § "The finding that re-scored this matrix after round
1" names as this spec's recurring one.

`v12` lives in `packages/qfai/tests/helpers/buildCommand.ts` with its corpora in
`packages/qfai/tests/unit/buildCommand.test.ts`. Shell segmentation and per-manifest resolution are
**v5's**, kept unchanged since — an earlier version of this paragraph credited them to v8, and named
three "distinctions v5 was missing" that were v5's own. What the versions after v5 actually contribute
is one thing, arrived at three times: **the grammar is per-runner, not global**. A package manager
resolves a script and its flag set is open-ended, so the safe default is to consume; a build tool takes
subcommands and its flag set is closed and declared, so the safe default is to consume nothing. v6, v7
and v8 each tried to hold both with one global rule and each broke one direction to fix the other.

**The same rule, five families, four rounds.** v9 gave each build tool its own flag grammar; v11 gave
each wrapper and each manager one; v12 gave tools their subcommands and interpreters their flags. Every
time the defect was a global rule standing in for knowledge the runner has, and every time it was found
by someone planting real commands rather than by reading the code.

**What each version deleted matters as much as what it added, and v12 deleted more than it added.**
Eight sets are now empty: every tool's `pass` list, `MANAGER_CONSUMING`'s flag members,
`NOT_A_BUNDLER`, the wrapper `booleans` list, the wrapper `values` lists with their `args` counts,
`MANAGER_BOOLEAN`'s nineteen members, `MANAGER_VALUES`, and the interpreter `scripts` lists. Each was a
list whose deletion changed no command's verdict, and each was found by trying to write the case that
would notice. The replacements are rules that cannot be incomplete the way a list can: a wrapper's
command begins at the first token that names a command; a manager flag consumes only when a later bare
token exists to be the script. The direction of the miss is worth stating plainly, because an earlier version of the helper's own
docstring had it backwards: it argued that missing a build is "the safe direction here", since the
assertion is that a tree contains none. For **this** assertion a false negative is the **vacuity**
direction — the guard passes while the thing it forbids is present — and the tradeoff bought four false
positives anyway.

Round 8's second finding is why v10 is **smaller** than v9. The test that claimed to "pin every member
of every grammar set" generated its probes **from the sets it pinned**, so deleting a member deleted its
own assertion: 0 of 17 member mutations reddened it, and a full sweep put member survival at 162 of 207.
Replacing it with one hardcoded case per member forced the question "what command changes verdict if
this member goes?" once per member — and for forty-five the answer was none. Those are deleted, one of
them (`NOT_A_BUNDLER`) because the single command whose verdict it changed it decided **wrong**. The
sweep is now a test rather than a measurement: it deletes each remaining member in turn and requires a
case to notice, and it fails on any member that cannot be pinned. **No count of the members appears
here.** It read 208 for three rounds while the tree held 250 and then 296, and each correction went
stale inside a commit; the number is `grammarMembers().length` at run time and the assertions are the
measurement, so restating it in prose only creates something to be wrong about.

No accuracy figure is quoted here on purpose. What the corpora are is recorded instead: round 4's 20
measured regressions, round 5's 10 measured defects, round 6's 7, round 8's 6 missed builds and 4
invented ones, round 8's eleven planted builds and six wrapper forms, v4's 15 kept forms, the non-builds
five rounds accumulated, one case per grammar member, and every `run:` line in both workflow trees. None
was chosen by this stage.

Closing the row is `TDD-0032` … `TDD-0035`, all four `blocked` on `CR-20260820-0007`, because their
acceptance criteria require numbers written into `07_Decisions.md` which `/qfai-implement` may not
patch. So this cell is `❌` for a reason recorded upstream of this stage, not for want of a test.

### US-0017-0005 — layer-separated lanes without a new check name: ❌

Two divergences from the own tree, and round 1 found the second:

1. The shipped orchestrator separates layers into **five separate jobs**; the own tree uses matrix
   legs of one job. Five jobs give five check names, which is exactly what the story's title guards
   against for the own tree — though an adopter has no pre-existing check-name set to preserve.
2. **All five jobs are `echo` placeholders.** No lane invokes a test runner. `Normal path` is `❌`
   rather than `⚠️` for that reason: the shape is there and the substance is not.

The E2E test asserts the half that holds either way — one workflow file carries every lane, so no
lane addition adds a check name — and `Oracle strength` stays `⚠️` because that assertion is about
file topology and cannot distinguish a lane that runs tests from a lane that echoes.

Which shape an adopter should receive is a genuine open question belonging to whoever owns the
shipped orchestrator (`spec-0003`); the placeholders are a plain gap in this spec's shipped half.
Recorded, not resolved.

### US-0017-0006 — a workflow-hygiene lint lane that pull requests actually run: ❌

The shipped orchestrator does not invoke `check-workflow-hygiene` at all — measured, zero
occurrences. The lane exists and runs in the own tree's `ci:lint`; it was never wired into the
adopter's set.

The E2E test asserts the precondition instead: the shipped orchestrator triggers on `pull_request`,
so a lane added there would run rather than sitting in an aggregate nobody invokes — the failure
`BR-0017-0041` names. Asserting the absence was rejected deliberately: a test pinning "no hygiene
lane is invoked" fails the day someone correctly adds one.

### US-0017-0007 — runner parallelism derived from QFAI's own workload: ❌ and NOT COVERED

No knob file ships. `vitest.knobs.ts` exists in `packages/qfai/` and is not part of the init asset
tree, so an adopter receives no declared worker or file-parallelism setting. `TDD-0060`, `TDD-0061`
and `TDD-0068` are `refactor` against the own tree only.

**The coverage claim for this row has been withdrawn.** The first version asserted that
`qfai.config.yaml` exists after init — and round 1's `completion-reviewer` found that
`tests/e2e/initE2E.test.ts:58-64` already asserts exactly that. The row added no discriminating
power whatever: it would have passed for a project with no knobs in it at all, which this matrix
already conceded by scoring `Oracle strength` `❌`, and it duplicated a test that was already there.

An annotation over a gap is the false certification `CR-20260814-0001` describes, so the describe was
removed and the `- QFAI:SPEC-0017:US-0017-0007` line was deleted from
`tests/e2e/qfai-traceability.md`. `QFAI-ATDD-111` reports this story again, deliberately. It becomes
coverable when the knobs ship.

### US-0017-0008 — retire the duplicate validate workflow without weakening the required check: ❌

`qfai-validate.yml` still ships. The own tree retired its duplicate and folded the full-profile run
into `build`; the adopter's set still carries both workflows.

The E2E test asserts the half that must hold either way — the validate work is reachable from a
shipped workflow — because the failure this story guards against is a workflow retired while the
check depending on it keeps its name and loses its content. `Normal path` is `⚠️` rather than `❌`
because reachability is genuinely half the story, and the other half (that the duplicate is gone) is
what has not happened.

## The one row still scored ⚠️, and the one that stopped being scored ⚠️

- **US-0017-0001** `⚠️`: the detection job and the needs-map verdict both ship and both are asserted,
  with oracles (`E1`, `E3`). `Boundary values` is class C, `State transitions` and `Combinatorial`
  are class B.
### US-0017-0003, now ✅ — a stated reason that was simply false, and the assertion it was hiding

The first version scored `Oracle strength` `⚠️` and `Status` `⚠️` with this reason: *"'File-derived' —
the positive half — is not established: nothing here proves the version comes from a file rather than
from a default."*

**That was false.** `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml:117-149`
probes `.nvmrc`, then `.node-version`, publishes what it finds as a step output, and only falls open
to Node 20 with a `::warning::` annotation when neither exists — then feeds
`node-version: ${{ steps.node-version.outputs.version }}` into `setup-node`. The positive half was
assertable from the very surface this matrix scores, and had simply not been asserted. Round 1's
`completion-reviewer` found it and called it what it was: a cheap gap, not an inherent limit, and the
one place an invariant stood in for substance that was reachable.

It is asserted now, and **behaviourally**: the test locates the resolver through the chain
(`setup-node`'s `node-version` names a step output, which names the step), extracts that step's `run`
body, and executes it under `bash -e -o pipefail` — the flags GitHub applies to a `shell: bash` step —
**four times**, in four fixture directories:

| fixture                          | asserted                                            |
| -------------------------------- | --------------------------------------------------- |
| `.nvmrc` = `23.4.1`              | the published version is `23.4.1`                   |
| `.node-version` = `21.7.3`       | the published version is `21.7.3`                   |
| both files present               | `.nvmrc` wins, so the probe order is a fact         |
| neither present                  | exit 0, the published version is exactly `20`, and a `::warning::` is emitted |

The first version ran it twice and asserted "a different documented value" for the fallback. Round 3
pointed out that the integration row one layer down asserts the exact literal, and that an E2E row
claiming to have added a behavioural check should not be the weaker of the two — so it is `20` now, the
`engines: ">=20.19.0"` floor the shipped comment names.

The first repair asserted the same thing over the step's **text** and was vacuous, which two oracle
rounds caught: `.nvmrc` also occurs in the step's warning message and `version=` also occurs in its
fallback publish, so breaking the mechanism left both patterns matching other text in the same body.
`E6`/`E7` reddened nothing. Rewritten to run the step, six rounds redden (`E6`-`E11`) with a comment
control green. Another instance of the class enumerated at `atdd-spec-0017.md` § "Gaps / Open risks"
item 7 — a claim about how code is *written* surviving the
behaviour being removed — and the fix is the same every time: run the thing and look.

**What this E2E row adds over the integration layer, and what it does not.** Round 2's
`implementation-reviewer` pointed out that `tests/integration/shippedWorkflowPortability.test.ts`
already extracts the same `run` body from the same asset and executes it, asserting *more* than the
first version of this row did. So the behavioural execution is not the new thing, and saying it was
would be a weaker instance of the `US-0017-0007` pattern this stage withdrew a claim over.

What the E2E row genuinely adds is one fact the integration row cannot see: **the resolver arrives in
the adopter's tree through `qfai init`**, rather than merely existing under `assets/`. That is an
E2E-layer fact and this is its right home. The resolution *depth* is owned one layer down, and is
cross-referenced rather than restated. The row was also brought up to the integration row's fidelity
rather than left below it — the documented fallback is asserted verbatim (`20`, the
`engines: ">=20.19.0"` floor) instead of "any leading digit", both probe candidates are exercised, and
their precedence is pinned.

`Boundary values` and `Special values` stay `⚠️`: the two probe candidates and the fail-open default
are exercised, a blank or whitespace-only file is not.

## What this matrix does not claim

No cell is scored from this repository's own workflows. **Four of the nine stories are satisfied in
the shipped tree and five are not**, and after round 1 that split is sharper than first reported: of
the four rows whose `Status` is not `❌` — three `✅` and one `⚠️` — none depends on a layer lane,
because no layer lane does anything. The "and ship it to adopters" half of this spec is **less than half done**, and none
of it was visible until `qfai init` was run and the step bodies — not the job names — were read.
