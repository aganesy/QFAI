# Coverage Depth Matrix — spec-0017

Historical E2E scope: the nine `US-0017-*` this spec declares, scored against
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`, and `US-0017-0007` against
`packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts`. **All nine are covered**, the ninth since
round 12 — its claim was withdrawn in round 1 for asserting that a file exists, and it is carried now by a
test that observes the runner's pool. The current spec declares 92 `TC-0017-*` cases. The original
assessment below considered only the nine story E2E rows; the complete current US/TC and BR tables
are appended at the end of this file.

Committed, because it is a governance record: one justification per `❌`, and § "Every `❌` cell,
named" below is the enumeration that makes "one per cell" checkable rather than asserted.

## What "the E2E surface" is for this spec

`spec-0017` has two halves — QFAI's own CI, and the same scaffold in the templates QFAI ships. The
own half is asserted directly against `.github/workflows/**` by the integration slices. The half a
user story is about the adopter's, and it has one end-to-end surface: run `qfai init` into an
empty project and read what arrives.

**Eight of the nine rows are scored against that surface. `US-0017-0007` is scored against this
repository's own runner**, because that is what its story is about — "as a maintainer tuning a 415-file
suite", whose three slice surfaces are this repository's own vitest projects, CI matrix and scripts.
Ten rounds read the row as adopter-facing and scored it uncoverable on the ground that no knob file
ships, which this record retracts as a category error; the row's own justification section says so in as
many words. So the scope of this matrix is **the surface each story is actually about**, and for eight
rows that is `qfai init` — which is why several of them carry `❌` for work the own tree has and the
shipped tree does not. A reader who takes "always the adopter's tree" at face value would read
`US-0017-0007`'s `✅`s as adopter-facing, and round 14 found this section saying exactly that.

## The finding that re-scored this matrix after round 1

The five shipped layer lanes — `unit`, `component`, `integration`, `api`, `e2e` — **run nothing**.
Each has exactly one step:

```yaml
- name: integration lane placeholder
  run: echo "integration lane placeholder - opted in, but the test-lane body ships in a later revision of this file"
```

Round 1's `qa-gatekeeper` found this and it had not been disclosed. The first version of this matrix
read job names and structure and never read a step body, which is the same error as the vacuous
claims implement rounds 4-6 kept finding: a property asserted over how something is _written_ rather
than over what it _does_. Two consequences, both applied below:

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
| US-0017-0007 | ✅          | ❌         | ⚠️              | ⚠️             | ❌                | ❌            | ✅              | ⚠️     |
| US-0017-0008 | ⚠️          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0009 | ✅          | ✅         | ⚠️              | ⚠️             | ❌                | ❌            | ✅              | ✅     |

Totals by `Status`: **✅ 3 / ⚠️ 2 / ❌ 4**.

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
total differs from the `✅ 2 / ⚠️ 2 / ❌ 5` the gatekeeper measured — the current figure is
stated once, above, where the pin reads it — for two reasons:
`US-0017-0003` rose because the assertion it was missing turned out to be available and was written
(§ below), and `US-0017-0004`'s `Oracle strength` fell because an oracle for an assertion is not an
oracle for a story. Neither movement changes the `❌` count.

## The scoring surface, and where it does not match the stories

The first version of this file justified scoring against the shipped tree with a premise: "a user
story is about the adopter". Round 1's `completion-reviewer` read that against this spec's US
catalogue and the premise does not hold. **Five of the nine stories name the own tree explicitly** —
four that round 1 enumerated, and `US-0017-0007`, whose own-tree reading round 12 established and which
this list did not gain until round 14 pointed at the disagreement between the two records:

- `US-0017-0002` — "**Own-CI** supply-chain hardening…", goal "every own-CI job…"
- `US-0017-0003` — "the setup preamble to exist exactly once **in the repository**", and its
  Non-goals _rule out_ shipping the mechanism to adopters (a composite action under the shipped
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
| `US-0017-0008` | `tests/scripts/ownWorkflowTopology.test.ts` — the retired duplicate and the folded profile run  |

Those assertions are `Integration` rows of `tdd/test-list.md` and are scored there, not here. What
this matrix scores for those four stories is the adopter-facing half only, and each row's cells should
be read with that scope.

## Every ❌ cell, named

34 depth cells are `❌`, plus 4 in `Status`. The contract is one justification per cell, so each is
assigned a reason class here — **by name, in a table a test can read** — and no cell is left to be
inferred from a row-level narrative.

The first version of this section declared only the class SIZES (`30 + 7 + 1`). Round 2's
`completion-reviewer` and `qa-gatekeeper` independently broke that: cutting a class's enumeration
while leaving its stated size reddened nothing, renaming a class member to a cell the table scores
`⚠️` reddened nothing, and resizing two halves so the sum survived reddened nothing. A partition
asserted by its total is not asserted. The table below is the partition, and
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` checks it against the table's own cells for
completeness, disjointness and no non-`❌` member.

| class | US ID        | `❌` columns                                                                               |
| ----- | ------------ | ------------------------------------------------------------------------------------------ |
| A     | US-0017-0004 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial |
| A     | US-0017-0005 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial |
| A     | US-0017-0006 | Normal path, Error path, Boundary values, Special values, State transitions, Combinatorial |
| A     | US-0017-0008 | Error path, Boundary values, Special values, State transitions, Combinatorial              |
| B     | US-0017-0001 | State transitions, Combinatorial                                                           |
| B     | US-0017-0002 | State transitions                                                                          |
| B     | US-0017-0003 | State transitions, Combinatorial                                                           |
| B     | US-0017-0007 | State transitions, Combinatorial                                                           |
| B     | US-0017-0009 | State transitions, Combinatorial                                                           |
| C     | US-0017-0001 | Boundary values                                                                            |
| C     | US-0017-0007 | Error path                                                                                 |

Sizes, derived from the table above: **A 23, B 9, C 2 — 34 cells.**

`US-0017-0007` left class A entirely when its row was rescored in round 12: class A's property is
`Status = ❌` and that row is `⚠️` now. Two of its three remaining `❌` cells joined class B on the
class's own property. The third needed a class of its own rather than a membership invented to keep a
total tidy, which is the move round 2 broke this section for.

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
the gap, it is the same gap for every cell in the class, and closing it needs a surface that reads
workflow-run history rather than a file. No ledger row proposes one; the absence is recorded as open
risk 6 of the stage evidence.

Class B covers the rows whose `Status` is not `❌` — five of them, and stated as the property rather
than as a numeral because the numeral said four for two rounds after `US-0017-0007` was rescored into
the class, in the same edit that wrote the paragraph three lines above explaining the rescoring. The same two columns on `US-0017-0004` …
`-0008` are class A: those rows have no surface to run, so the reason they are `❌` is the absence,
not the harness.

**Class C — property: the cell is inapplicable by the design rather than untested, which is neither
class A's missing surface nor class B's missing harness. There is nothing there to observe, and the
members are enumerated because no score in this table can decide that.** These are the `❌`s that no
future work on the story would turn green. Two members, each with its own reason:

- `US-0017-0001` × `Boundary values` — **a single shipped value admits no boundary.** The detection job
  emits one verdict per push; there is no sequence, count or limit to sit at the edge of. A boundary cell
  over a single-valued output is not partially covered, it is inapplicable, and `❌` is how this matrix
  spells that.
- `US-0017-0007` × `Error path` — **the design has no failure to observe.** A malformed worker override
  does not fail; it falls back to the declared value, deliberately, so that a tuning aid cannot
  reconfigure the suite by accident. The honest gap is narrower and is stated in the row's own section:
  nothing observes the runner's behaviour when the pool cannot start at all, which is a different
  question from a bad override.

**This class has been written three ways, and the first two could not fail.** Round 12 made it two
classes, C and D, each stating its single member's coordinates as a property — which nothing can violate
except a different cell — and the two paragraphs then contradicted each other in this file about how many
such cells the table held: one called itself "the one `❌` in the table that no future work would turn
green" and the other "the second". Round 14 merged them under a computable property, `not class A and not
class B`. Round 15 filed a plainly untested cell under that property, with the reason "it is simply
untested, and no one has looked", and every guard stayed green.

"Inapplicable by the design" is a claim about the thing the story describes, not about a table of scores,
so no predicate over a row and a column can decide it — and a predicate that admits whatever the other
two classes reject decides nothing at all. What a test can hold is the list of cells someone has
justified. The members are enumerated in `coverageDepthMatrix.test.ts` and each is named here with its
own reason; a new one reddens until it appears in both. That is the move `ALLOWED_STEP_BODIES` makes one
instrument over: enumerate our own surface, refuse the rest, and make an addition a review rather than a
silent pass.

## Every ⚠️ cell, named

Fifteen depth cells are `⚠️`, and until round 20 not one of them was enumerated anywhere. The section
above and the test that reads it both key on `❌`, so a `⚠️` was outside the contract **by
construction** — and `US-0017-0002` and `US-0017-0009` have no justification section at all, because
this artifact writes one only for a row whose `Status` is `❌`.

That is the wrong way round for the value a reader most needs the reason for. `❌` at least says
"nothing here". `⚠️` says "something here" and, unnamed, says nothing about which half.

The partition below has the same three properties the `❌` one carries — disjoint, complete, and
naming nothing the table scores otherwise — and `coverageDepthMatrix.test.ts` enforces all three plus
a line per member. The reason classes are NOT shared with `❌`'s: A/B/C say why a behaviour cannot be
exercised at all, and every class here is a statement about a behaviour that partly is.

| class | US ID        | `⚠️` columns                    |
| ----- | ------------ | ------------------------------- |
| W1    | US-0017-0001 | Error path, Special values      |
| W2    | US-0017-0002 | Boundary values, Combinatorial  |
| W2    | US-0017-0003 | Boundary values, Special values |
| W3    | US-0017-0004 | Oracle strength                 |
| W3    | US-0017-0005 | Oracle strength                 |
| W3    | US-0017-0006 | Oracle strength                 |
| W2    | US-0017-0007 | Boundary values, Special values |
| W4    | US-0017-0008 | Normal path                     |
| W3    | US-0017-0008 | Oracle strength                 |
| W2    | US-0017-0009 | Boundary values, Special values |

Sizes of the ⚠️ classes: **W1 2, W2 8, W3 4, W4 1 — 15 cells, one line each.**

**W1 — the surface IS exercised, by a row that is not this one.** This matrix scores _the surface each
story is actually about_, which its opening section states, so a behaviour asserted against the
identical shipped bytes counts as exercised even when the annotation carrying it belongs to another
spec. What the `⚠️` records is that this spec's own row does not carry it, and that something the row
is about is unreached by anybody.

- `US-0017-0001` × `Error path` — the shipped orchestrator has nine degraded branches: five
  `fail_open` sites (`qfai-tests.yml:85`, `:88`, `:91`, `:99`, `:114`), three probe fallbacks
  (`:135`, `:150`, `:158`) and the verdict's `exit 1` on a failed or cancelled lane (`:267-269`).
  This row asserts none of them — its whole coverage is three assertions at
  `spec0017LayeredCiScaffoldE2E.test.ts:270-287`, which read a job key, a job's existence and a
  substring. The branches are exercised, over the same bytes, at
  `spec0003ShippedWorkflowSetE2E.test.ts:530-593` and
  `shippedWorkflowDetection.test.ts:341-449`. **One is reached by nothing in the repository**: the
  `name-only diff failed` arm at `qfai-tests.yml:98-100`, which needs a fixture where `git diff`
  itself exits non-zero.
- `US-0017-0001` × `Special values` — the row reads no output at all: it never touches
  `steps.diff.outputs.lanes` and never feeds the verdict a `result`. The two value classes that
  matter — the empty selection `"[]"` and the five-element superset — are asserted at
  `spec0003ShippedWorkflowSetE2E.test.ts:502-528`, and the verdict's four `result` strings at
  `:555-593`. Same surface, another row.

**W2 — part of the domain is exercised and a named part is not.** The discriminator is real and the
corpus it runs over is real; what is missing is a value at the edge, and it is named per cell.

- `US-0017-0002` × `Boundary values` — the SHA discriminator at
  `spec0017LayeredCiScaffoldE2E.test.ts:319` is `/@[0-9a-f]{40}\b/`, which genuinely rejects 39 hex
  digits on the count, 41 on the `\b`, uppercase on the class and a seven-character short sha. **No
  such value is ever fed to it**: the corpus is four non-local `uses:` refs
  (`qfai-tests.yml:56`, `qfai-validate.yml:50`, `:143`, `:171`), all valid. And the collection's
  non-emptiness is unasserted here while the own tree asserts exactly that at
  `workflowHygiene.test.ts:292`, so a shipped tree carrying no `uses:` at all would satisfy both
  halves of this row vacuously.
- `US-0017-0002` × `Combinatorial` — two independent properties, pinned and hardened, are evaluated
  on every step of the arrived tree, which is a two-factor sweep over the real corpus. What is not
  exercised is a step that satisfies one and fails the other; the technique exists in the repository
  — `workflowHygiene.test.ts:528` removes _both_ permission blocks and asserts the pair — and is not
  applied to the arrived tree.
- `US-0017-0003` × `Boundary values`, and `US-0017-0003` × `Special values` — the two probe candidates and the
  fail-open default are exercised; a blank or whitespace-only version file is not. Stated in this
  row's own section below.
- `US-0017-0007` × `Boundary values` — one worker and four are exercised, and one worker is the true
  boundary. `US-0017-0007` × `Special values` — the override rejects `""`, `" "`, `"0"`, `"-1"` and `"2.5"`, which is
  a real special-value sweep over the parser and not over the pool it configures. Both stated in that
  row's section.
- `US-0017-0009` × `Boundary values`, and `US-0017-0009` × `Special values` — the row runs one default `qfai init`
  and varies no value; the mapping document is asserted only for its presence and a disclaimer
  phrase, so no domain with an edge is read. The layer codes the received mapping names, and the
  hyphen the loader's own extraction regex turns on
  (`specPackParsers.ts:81`, `/@?(layer-[a-z0-9-]+)/gi`), are both available to assert and unasserted.

**W3 — the oracle is weaker than the claim it is asked to carry.** Something real is observed; it is
not the thing the story is about.

- `US-0017-0004` × `Oracle strength` — the assertion filters `job.steps[].run` for build commands, and
  every step in every lane is an `echo` placeholder, so it cannot distinguish "no lane rebuilds" from
  "no lane does anything". Stated in that row's section.
- `US-0017-0005` × `Oracle strength` — the assertion is about file topology and cannot distinguish a
  lane that runs tests from a lane that echoes. Stated in that row's section.
- `US-0017-0006` × `Oracle strength` — the sole annotated test parses the arrived `qfai-tests.yml` and
  asserts its trigger mapping contains `pull_request`
  (`spec0017LayeredCiScaffoldE2E.test.ts:1244-1252`). Parsing rather than grepping earns something:
  `pull_request` occurs twice in the shipped file, at the trigger (`qfai-tests.yml:36`) and inside
  `QFAI_BASE_REF` (`:67`), so a grep-shaped oracle would stay green over a deleted trigger block. Two
  things keep it from `✅`. It is **totally subsumed** by `:1136-1140`, which compares the same
  arrived document minus `jobs` against a pinned literal that spells
  `"pull_request":null` — so any mutation this test would catch reddens that one too. And it is
  off-subject: nothing in it mentions a hygiene lane. The story's own property IS asserted, in full,
  at `workflowHygiene.test.ts:1690` — but over `REPO_ROOT`, and the adopter half is unassertable
  today, because `grep -rn check-workflow-hygiene packages/qfai/assets/` returns nothing. No hygiene
  lane ships.
- `US-0017-0008` × `Oracle strength` — the row asserts that the adopter's `qfai-validate.yml` still
  contains the literal `qfai validate` somewhere in its raw text, which is the "how it is written"
  class this record names as its recurring defect. The assertion it wants is written one file over,
  against the same `qfai init` output, over step `run:` bodies.

**W4 — one half of the story is reachable and the other is not.**

- `US-0017-0008` × `Normal path` — `⚠️` rather than `❌` because reachability is genuinely half the
  story, and that half is asserted. Stated in that row's section.

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

v4's naming defect is the one worth keeping in view: it measured **how a script is _called_ rather
than what it _does_**, which is the failure mode § "The finding that re-scored this matrix after round
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

**The classifier's world is closed, and that is the limit this row's oracle strength rests on.** A build
run by a tool the grammar does not declare returns `none`. Round 10 planted twenty-six such lines through
the story's own loop and none was seen: `next build` and `ng build` are the two that matter, being the
dominant build lines of two of the largest JavaScript ecosystems, in a scaffold shipped to adopters, and
the list ran on through `gulp`, `grunt`, `hugo`, `jekyll`, `mkdocs`, `mix`, `sphinx-build`, `buck2`,
`helm`, `goreleaser`, `packer`, `tox`, `R CMD build`, `shards` and `cabal`. Many of those are now
declared; the point survives their declaration, because enumeration cannot converge and the next round
can name sixteen more.

For **this** assertion that is the vacuity direction, not the safe one: the row passes while the thing it
forbids is present. Stating it here rather than only in the helper's docstring is deliberate — the
completion gate reads this file, and round 9 asked for the sentence in this exact place. What answers the
limit is not a longer list but the inverted instrument: `tests/unit/shippedLaneCommands.test.ts` asks
what a lane may INVOKE, which needs no corpus of build spellings and fails closed. This row's oracle is
qualified for the classifier's sake and the story no longer rests on it.

No accuracy figure is quoted here on purpose, and **the corpora are enumerated in exactly one place** —
`.qfai/evidence/atdd-spec-0017.md`, in the paragraph beginning "Measured against". This file used to
carry its own list, and round 10 found the two enumerating different sets: this one stopped at round 8
while the other ran to round 9, so each was a partial record described as the record. Two copies of a
list that grows once a round is the same defect as two copies of a number, and the fix is the same one —
one site, pointed at rather than retyped. None of the corpora was chosen by this stage.

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

### US-0017-0007 — runner parallelism derived from QFAI's own workload: ⚠️ and COVERED

**The withdrawal is over, and the reason it lasted eleven rounds was wrong.** The first version of this
row asserted that `qfai.config.yaml` exists after init — which `tests/e2e/initE2E.test.ts:58-64` already
asserted, and which would hold for a project with no knobs in it at all. Round 1 removed it, correctly, as
the false certification `CR-20260814-0001` describes.

What this section then said for eleven rounds was **"no knob file ships … it becomes coverable when the
knobs ship"**, and that was a category error. The story reads "as a maintainer tuning a 415-file suite",
and its three slice surfaces — vitest project names, the CI matrix slice list, the per-slice scripts — are
this repository's own. It was never about an adopter's tree. Every other `tests/e2e/**` file here runs
`qfai init` into a temporary directory, so the habit of the suite pointed at a tree the story does not
name, and the absent knob file was recorded as the obstacle it never was.

`packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts` carries the row now, and what makes it
coverage rather than a second annotation over a gap is that it asserts an EFFECT. The story's eight
existing tests all assert that a knob is DECLARED at the site the runner reads it — and `vitest.knobs.ts`
contains the proof that a declaration can be declared and do nothing, recording a project-level worker
declaration that "type-checked, it ran, it emitted no warning — and it did nothing" at a 0.93 wall-clock
ratio. This test spawns a fixture suite twice through the real `rootKnobs` and observes the pool: peak
simultaneously-live files is 1 at one worker and greater than 1 at four.

Scores, and the reason for every remaining `❌`:

- **Normal path `✅`** — the declared axis is exercised at two settings and the verdict differs.
- **Oracle strength `✅`** — the oracle is a measured effect, not a file's contents. Falsified four ways,
  all reddening: the axis declared at a scope the runner ignores, the override replaced by a fixed
  literal, file parallelism switched off, and the override variable renamed. The fourth is the one worth
  recording — it found a self-referential oracle in the first version, which read the variable's name from
  the module it tests, so a rename carried the test along and everything stayed green. The name is pinned
  as a literal now.
- **Boundary values `⚠️`** — one worker and four are exercised, and one worker is the true boundary
  (the pool cannot overlap). The declared value of ten is not exercised as such, and the upper end of the
  axis is not probed at all.
- **Special values `⚠️`** — the override rejects `""`, `" "`, `"0"`, `"-1"`, `"2.5"`, `"1e3"` and `"ten"`,
  each measured. What is not covered is a value large enough to exhaust the machine.
- **Error path `❌`** — there is no error path asserted. A malformed override falls back to the declared
  value rather than failing, which is the design, so the honest gap is that nothing observes the runner's
  behaviour when the pool cannot start.
- **State transitions `❌`** — the axis is read once per run. Changing it mid-run is not a thing the runner
  supports, and nothing here asserts what happens across two runs at different settings beyond the two
  this test makes.
- **Combinatorial `❌`** — the worker axis and the within-file concurrency axis are declared together and
  only the worker axis is observed. `CONCURRENCY_ENV`'s effect is unmeasured, and their interaction
  entirely so.

`TDD-0060`, `TDD-0061` and `TDD-0068` remain `refactor` against the own tree, which is now the right
subject rather than a limitation.

### US-0017-0008 — retire the duplicate validate workflow without weakening the required check: ❌

`qfai-validate.yml` still ships. The own tree retired its duplicate and folded the full-profile run
into `build`; the adopter's set still carries both workflows.

The E2E test asserts the half that must hold either way — the validate work is reachable from a
shipped workflow — because the failure this story guards against is a workflow retired while the
check depending on it keeps its name and loses its content. `Normal path` is `⚠️` rather than `❌`
because reachability is genuinely half the story, and the other half (that the duplicate is gone) is
what has not happened.

## The two rows scored ⚠️, and the one that stopped being scored ⚠️

- **US-0017-0001** `⚠️`: the detection job and the needs-map verdict both ship and both are asserted,
  with oracles (`E1`, `E3`). `Boundary values` is class C, `State transitions` and `Combinatorial`
  are class B.

### US-0017-0003, now ✅ — a stated reason that was simply false, and the assertion it was hiding

The first version scored `Oracle strength` `⚠️` and `Status` `⚠️` with this reason: _"'File-derived' —
the positive half — is not established: nothing here proves the version comes from a file rather than
from a default."_

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

| fixture                    | asserted                                                                      |
| -------------------------- | ----------------------------------------------------------------------------- |
| `.nvmrc` = `23.4.1`        | the published version is `23.4.1`                                             |
| `.node-version` = `21.7.3` | the published version is `21.7.3`                                             |
| both files present         | `.nvmrc` wins, so the probe order is a fact                                   |
| neither present            | exit 0, the published version is exactly `20`, and a `::warning::` is emitted |

The first version ran it twice and asserted "a different documented value" for the fallback. Round 3
pointed out that the integration row one layer down asserts the exact literal, and that an E2E row
claiming to have added a behavioural check should not be the weaker of the two — so it is `20` now, the
`engines: ">=20.19.0"` floor the shipped comment names.

The first repair asserted the same thing over the step's **text** and was vacuous, which two oracle
rounds caught: `.nvmrc` also occurs in the step's warning message and `version=` also occurs in its
fallback publish, so breaking the mechanism left both patterns matching other text in the same body.
`E6`/`E7` reddened nothing. Rewritten to run the step, six rounds redden (`E6`-`E11`) with a comment
control green. Another instance of the class enumerated at `atdd-spec-0017.md` § "Gaps / Open risks"
item 7 — a claim about how code is _written_ surviving the
behaviour being removed — and the fix is the same every time: run the thing and look.

**What this E2E row adds over the integration layer, and what it does not.** Round 2's
`implementation-reviewer` pointed out that `tests/integration/shippedWorkflowPortability.test.ts`
already extracts the same `run` body from the same asset and executes it, asserting _more_ than the
first version of this row did. So the behavioural execution is not the new thing, and saying it was
would be a weaker instance of the `US-0017-0007` pattern this stage withdrew a claim over.

What the E2E row genuinely adds is one fact the integration row cannot see: **the resolver arrives in
the adopter's tree through `qfai init`**, rather than merely existing under `assets/`. That is an
E2E-layer fact and this is its right home. The resolution _depth_ is owned one layer down, and is
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

## Current ATDD coverage (2026-09-24)

This section scores the complete active US/TC and BR set against the test files currently named by the TDD ledger. The historical nine-story E2E assessment above remains unchanged. A test under `tests/scripts/**` or `tests/assets/**` is a useful candidate, but it does not satisfy a declared L3 Integration acceptance row. Unit rows retain their L1 evidence. The six newly moved cases have `⚠️` status and explicit pending reasons until their Integration live results are recorded.

The `Evidence` column identifies the current file and exact selector. A `⚠️` is partial evidence, not an inferred pass. The current table includes the pre-existing 66 L3 placement gaps separately from the six TC migrations (`TC-0017-0007`, `-0043`, `-0062`, `-0064`, `-0090`, `-0091`).

The 359 US/TC and 67 BR `n/a` cells are provisional absence classifications based on TC Type, sibling cases under each AC, and the declared scenario or rule text. Formal QA must reconcile them against every active AC/BR clause before treating this section as a final coverage verdict. The `✅` cells retain the prior E2E score or identify a direct L1/L3 selector; they do not certify the surrounding `⚠️` or `❌` cells.

### Current US/TC coverage matrix

| US/TC ID | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status | Evidence |
| -------- | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ | -------- |
| US-0017-0001 | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ✅ | ⚠️ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0001` |
| US-0017-0002 | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ❌ | ⚠️ | ✅ | ✅ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0002` |
| US-0017-0003 | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ✅ | ✅ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0003` |
| US-0017-0004 | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0004` |
| US-0017-0005 | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0005` |
| US-0017-0006 | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0006` |
| US-0017-0007 | ⚠️ | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ✅ | ⚠️ | [spec0017RunnerParallelismE2E.test.ts](../../packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts) · `US-0017-0007` |
| US-0017-0008 | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0008` |
| US-0017-0009 | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ✅ | ✅ | [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts) · `US-0017-0009` |
| TC-0017-0001 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0001 (TDD-0001): the verdict derives its result from the serialized needs map` (TDD-0001) |
| TC-0017-0002 | ⚠️ | n/a | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0002 (TDD-0002): a failed need and a cancelled need each drive the verdict to 1` (TDD-0002) |
| TC-0017-0003 | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0003 (TDD-0003): no need is outside the verdict derivation and edge 1 is cited` (TDD-0003) |
| TC-0017-0004 | ⚠️ | ⚠️ | n/a | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0004 (TDD-0004): all-succeeded and all-skipped are both accepting` (TDD-0004) |
| TC-0017-0005 | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | ⚠️ | n/a | ⚠️ | ⚠️ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0005 (TDD-0005): an unrecognized need state fails closed` (TDD-0005) |
| TC-0017-0006 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0006 (TDD-0006): the executing set and its declared timeout sum match the pin` (TDD-0006) |
| TC-0017-0007 | ❌ | n/a | ❌ | n/a | ❌ | n/a | ❌ | ❌ | ⚠️ | ⚠️ | [spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts) · `keeps every retained matrix leg declared` (TDD-0007)<br>[spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts) · `derives the skip from detection at the job level` (TDD-0102)<br>[spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts) · `retires project, script and matrix legs together` (TDD-0103) |
| TC-0017-0008 | ❌ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0008 (TDD-0008): a resolvable base ref narrows the lane set with no annotation` (TDD-0008) |
| TC-0017-0009 | ❌ | n/a | ❌ | ❌ | n/a | ❌ | ❌ | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0009 (TDD-0009): a shallow clone and an unreachable base ref both fail open` (TDD-0009) |
| TC-0017-0010 | ⚠️ | ⚠️ | n/a | n/a | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0010 (TDD-0010): assistant-tree Markdown is not documentation-only` (TDD-0010) |
| TC-0017-0011 | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0011 (TDD-0011): a path in no recognized directory selects everything` (TDD-0011) |
| TC-0017-0012 | ❌ | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0012 (TDD-0012): no lint-aggregate lane's host job is conditioned or listed` (TDD-0012) |
| TC-0017-0013 | ❌ | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0013 (TDD-0013): a condition on a dependency makes the required job skippable` (TDD-0013) |
| TC-0017-0014 | ❌ | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block` (TDD-0014) |
| TC-0017-0015 | ⚠️ | n/a | n/a | n/a | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | ⚠️ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0015 (TDD-0015): reachability and declaration are two different measurements` (TDD-0015) |
| TC-0017-0016 | ⚠️ | n/a | n/a | n/a | ✅ | ⚠️ | n/a | ⚠️ | ⚠️ | ⚠️ | [spec0017OwnWorkflowScope.test.ts](../../packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts) · `grants no permission block beyond the three that are deliberate` (TDD-0016) |
| TC-0017-0017 | ❌ | n/a | ❌ | ❌ | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0017 (TDD-0017): removing both blocks exits 1 naming the workflow and the job` (TDD-0017) |
| TC-0017-0018 | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0018 (TDD-0018): restoring either one of the two blocks returns exit 0` (TDD-0018) |
| TC-0017-0019 | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0019 (TDD-0019): every checkout step refuses to persist credentials` (TDD-0019) |
| TC-0017-0020 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0020 (TDD-0020): deleting the flag from one checkout step exits 1` (TDD-0020) |
| TC-0017-0021 | ❌ | n/a | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0021 (TDD-0021): full history is job-scoped, never a workflow default` (TDD-0021) |
| TC-0017-0022 | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0022 (TDD-0022): every action reference is a full-SHA pin` (TDD-0022) |
| TC-0017-0023 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0023 (TDD-0023): a planted floating reference exits 1 and is named` (TDD-0023) |
| TC-0017-0024 | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0024 (TDD-0024): a readable pin trailer stays legal and no guard is widened` (TDD-0024) |
| TC-0017-0025 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner` (TDD-0025) |
| TC-0017-0026 | ❌ | n/a | n/a | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0026 (TDD-0026): no root bump configuration, and the owner is recorded anyway` (TDD-0026) |
| TC-0017-0027 | ❌ | ❌ | n/a | n/a | ❌ | ❌ | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition` (TDD-0027) |
| TC-0017-0028 | ❌ | n/a | n/a | ❌ | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0028 (TDD-0028): no toolchain job restates a preamble step inline` (TDD-0028) |
| TC-0017-0029 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0029 (TDD-0029): the shared definition keeps its four-step order and the re-shim` (TDD-0029) |
| TC-0017-0030 | ⚠️ | ✅ | n/a | n/a | ⚠️ | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | [spec0017OwnWorkflowScope.test.ts](../../packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts) · `leaves exactly the publishing job's declared literal and routes every other job through the shared setup` (TDD-0030) |
| TC-0017-0031 | ❌ | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0031 (TDD-0031): the shared definition never enters the shipped asset tree` (TDD-0031) |
| TC-0017-0032 | ⚠️ | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ | ⚠️ | [spec0017ArtifactReuse.test.ts](../../packages/qfai/tests/integration/spec0017ArtifactReuse.test.ts) · `names the legs that would change, and binds the numbers to the moment one of them downloads` (TDD-0032) |
| TC-0017-0033 | ⚠️ | n/a | ✅ | ⚠️ | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ | [spec0017MeasurementClaims.test.ts](../../packages/qfai/tests/integration/spec0017MeasurementClaims.test.ts) · `rejects a saving asserted on argument, and accepts the same claim once the numbers are quoted` (TDD-0033) |
| TC-0017-0034 | ⚠️ | ✅ | n/a | n/a | ⚠️ | n/a | ⚠️ | n/a | ⚠️ | ⚠️ | [spec0017MeasurementClaims.test.ts](../../packages/qfai/tests/integration/spec0017MeasurementClaims.test.ts) · `resolves the criterion satisfied on a measured regression, and only while the rebuilds are there` (TDD-0034) |
| TC-0017-0035 | ⚠️ | n/a | n/a | ⚠️ | ✅ | n/a | ⚠️ | n/a | ⚠️ | ⚠️ | [spec0017MeasurementClaims.test.ts](../../packages/qfai/tests/integration/spec0017MeasurementClaims.test.ts) · `refuses to close the criterion on an unmeasured regression, rebuilds present or not` (TDD-0035) |
| TC-0017-0036 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality` (TDD-0036) |
| TC-0017-0037 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0037 (TDD-0037): a rename or an added dependency condition is reported` (TDD-0037) |
| TC-0017-0038 | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0038 (TDD-0038): no verification-set item is weakened by continue-on-error` (TDD-0038) |
| TC-0017-0039 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0039 (TDD-0039): the report upload skips on cancellation and ages out sooner` (TDD-0039) |
| TC-0017-0040 | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0040 (TDD-0040): retention 7 passes, retention 8 and an unconditional run fail` (TDD-0040) |
| TC-0017-0041 | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0041 (TDD-0041): layer separation adds no workflow file and no check name` (TDD-0041) |
| TC-0017-0042 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0042 (TDD-0042): the aggregate verdict check name is immutable` (TDD-0042) |
| TC-0017-0043 | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ⚠️ | [spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts) · `reports all expanded check names on full runs` (TDD-0043)<br>[spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts) · `reports bare skipped matrix jobs on documentation-only runs` (TDD-0104) |
| TC-0017-0044 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0044 (TDD-0044): the hygiene lane exits 0 over the hardened own tree` (TDD-0044) |
| TC-0017-0045 | ⚠️ | n/a | n/a | n/a | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0045 (TDD-0045): the own-tree hygiene rule set is closed at exactly five` (TDD-0045) |
| TC-0017-0046 | ❌ | ❌ | n/a | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0046 (TDD-0046): a green run names every rule it evaluated` (TDD-0046) |
| TC-0017-0047 | ❌ | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0047 (TDD-0047): an unevaluated rule is absent, not implied by the green run` (TDD-0047) |
| TC-0017-0048 | ❌ | n/a | ❌ | ❌ | n/a | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0048 (TDD-0048): each planted violation exits 1 naming file, job and rule` (TDD-0048) |
| TC-0017-0049 | ⚠️ | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0049 (TDD-0049): hygiene findings use the bare lint namespace` (TDD-0049) |
| TC-0017-0050 | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0050 (TDD-0050): the lane scans both roots and reports shipped paths as such` (TDD-0050) |
| TC-0017-0051 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0051 (TDD-0051): a shipped-only violation exits 1 naming the shipped path` (TDD-0051) |
| TC-0017-0052 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0052 (TDD-0052): shipped coverage never precedes the shipped hardening` (TDD-0052) |
| TC-0017-0053 | ⚠️ | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0053 (TDD-0053): the shipped third-party rule is allow-list membership` (TDD-0053) |
| TC-0017-0054 | ❌ | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0054 (TDD-0054): an unsanctioned third-party reference exits 1` (TDD-0054) |
| TC-0017-0055 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0055 (TDD-0055): the lane is invoked from an aggregate pull requests execute` (TDD-0055) |
| TC-0017-0056 | ❌ | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0056 (TDD-0056): the lane is absent from the release-only aggregate` (TDD-0056) |
| TC-0017-0057 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree` (TDD-0057) |
| TC-0017-0058 | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0058 (TDD-0058): a declared context resolving to no job exits 1` (TDD-0058) |
| TC-0017-0059 | ❌ | n/a | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0059 (TDD-0059): skippable-through-a-dependency and a shrunk set both exit 1` (TDD-0059) |
| TC-0017-0060 | ❌ | ❌ | n/a | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts) · `TC-0017-0060 (TDD-0060): every runner project declares the full knob set` (TDD-0060) |
| TC-0017-0061 | ❌ | n/a | n/a | ❌ | ❌ | ❌ | n/a | ❌ | ⚠️ | ❌ | [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts) · `TC-0017-0061 (TDD-0061): the declared starting value is ten on both axes` (TDD-0061) |
| TC-0017-0062 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ⚠️ | [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts) · `agrees across the runner, scripts, CI and release declarations` (TDD-0062)<br>[spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts) · `declares exactly the seven approved names` (TDD-0105) |
| TC-0017-0063 | ❌ | n/a | n/a | ❌ | ❌ | ❌ | n/a | n/a | ⚠️ | ❌ | [sliceSurfaceAlignment.test.ts](../../packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts) · `TC-0017-0063 (TDD-0063): no declared slice can match zero test files` (TDD-0063) |
| TC-0017-0064 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ⚠️ | [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts) · `names each script after its selected project` (TDD-0064)<br>[spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts) · `four sliced jobs invoke per-slice scripts` (TDD-0106) |
| TC-0017-0065 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement` (TDD-0065) |
| TC-0017-0066 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0066 (TDD-0066): a slower or flakier higher value keeps the lower one` (TDD-0066) |
| TC-0017-0067 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0067 (TDD-0067): revising the declared starting value needs the sign-off` (TDD-0067) |
| TC-0017-0068 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ⚠️ | ❌ | [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts) · `TC-0017-0068 (TDD-0068): the runner workspace carries zero retry settings` (TDD-0068) |
| TC-0017-0069 | ⚠️ | n/a | ⚠️ | ⚠️ | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | ⚠️ | [spec0017TuningChangeScope.test.ts](../../packages/qfai/tests/integration/spec0017TuningChangeScope.test.ts) · `reads every project, and finds the departing set holds no more than the largest one` (TDD-0069) |
| TC-0017-0070 | ⚠️ | n/a | ✅ | n/a | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | [spec0017TuningChangeScope.test.ts](../../packages/qfai/tests/integration/spec0017TuningChangeScope.test.ts) · `holds the post-merge budget open, and finds no merged tuning change owing it anything` (TDD-0070) |
| TC-0017-0071 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0071 (TDD-0071): exactly one workflow is triggered by a pull request` (TDD-0071) |
| TC-0017-0072 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0072 (TDD-0072): the folded run uses the local binary, not the published one` (TDD-0072) |
| TC-0017-0073 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0073 (TDD-0073): the folded run joins the enumerated verification set` (TDD-0073) |
| TC-0017-0074 | ❌ | n/a | ❌ | ❌ | n/a | n/a | ❌ | n/a | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0074 (TDD-0074): deleting the copy with no shipped-set gate is rejected` (TDD-0074) |
| TC-0017-0075 | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ | [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts) · `TC-0017-0075 (TDD-0075): the gate is present at or before the deletion` (TDD-0075) |
| TC-0017-0076 | ❌ | ❌ | n/a | ❌ | ❌ | n/a | n/a | ❌ | ⚠️ | ❌ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0076 (TDD-0076): the mapping file exists in both trees and is cross-linked` (TDD-0076) |
| TC-0017-0077 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0077 (TDD-0077): the mapping file header disclaims the layer-policy loader` (TDD-0077) |
| TC-0017-0078 | ❌ | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0078 (TDD-0078): the mapping file does not read as activating routing` (TDD-0078) |
| TC-0017-0079 | ❌ | ❌ | n/a | n/a | ❌ | n/a | ❌ | n/a | ⚠️ | ❌ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0079 (TDD-0079): the vocabulary warning count is unchanged after it lands` (TDD-0079) |
| TC-0017-0080 | ⚠️ | n/a | n/a | n/a | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0080 (TDD-0080): the built-in layer token set is unmodified` (TDD-0080) |
| TC-0017-0081 | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0081 (TDD-0081): authoring in the asset tree passes both mirror gates` (TDD-0081) |
| TC-0017-0082 | ❌ | n/a | ❌ | n/a | n/a | n/a | ❌ | n/a | ⚠️ | ❌ | [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts) · `TC-0017-0082 (TDD-0082): an unlinked repository-root path fails the link check` (TDD-0082) |
| TC-0017-0083 | ⚠️ | n/a | ⚠️ | ⚠️ | ⚠️ | n/a | ⚠️ | n/a | ⚠️ | ⚠️ | [spec0017TuningChangeScope.test.ts](../../packages/qfai/tests/integration/spec0017TuningChangeScope.test.ts) · `requires three recorded runs against the change that moved it, and none against no change` (TDD-0083) |
| TC-0017-0084 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0084 (TDD-0093): a committed pin disagreeing with the recomputed value exits 1` (TDD-0093) |
| TC-0017-0085 | ❌ | n/a | ❌ | n/a | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0085 (TDD-0094): exempt lint hosts cannot be declared skippable` (TDD-0094) |
| TC-0017-0086 | ❌ | n/a | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts) · `TC-0017-0086 (TDD-0095): a committed code-path pin the tree does not declare exits 1` (TDD-0095) |
| TC-0017-0087 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0087 (TDD-0096): the code path's cost agrees with the committed pin` (TDD-0096) |
| TC-0017-0088 | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0088 (TDD-0097): release prerequisites accept complete gate paths` (TDD-0097) |
| TC-0017-0089 | ❌ | n/a | ❌ | n/a | n/a | ❌ | ❌ | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0089 (TDD-0098): release prerequisites reject invalid gate paths` (TDD-0098) |
| TC-0017-0090 | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ⚠️ | ⚠️ | [spec0017ReleaseOperations.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts) · `classifies exact operation capabilities` (TDD-0099)<br>[spec0017ReleaseOperations.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts) · `preserves the ordered operation vector` (TDD-0107)<br>[spec0017ReleaseOperations.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts) · `runs one complete suite on each runtime` (TDD-0108) |
| TC-0017-0091 | ❌ | n/a | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ⚠️ | ⚠️ | [spec0017ReleaseFallback.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts) · `missing operation scripts retain aggregate checks` (TDD-0100)<br>[spec0017ReleaseFallback.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts) · `older and whole-suite tags use the whole aggregate` (TDD-0109)<br>[spec0017ReleaseFallback.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts) · `refuses invalid checks outputs` (TDD-0110) |
| TC-0017-0092 | ❌ | n/a | ❌ | n/a | ❌ | n/a | ❌ | ❌ | ⚠️ | ❌ | [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts) · `TC-0017-0092 (TDD-0101): runs independent checks in isolated verified workspaces` (TDD-0101) |

Current matrix: **US 9 / TC 92**; scored cells **✅ 20 / ⚠️ 197 / ❌ 333 / n/a 359**; status **✅ 3 / ⚠️ 28 / ❌ 70**.

### Current business rule coverage

The `Covering TC` list follows each rule's declared AC references. It names candidates, not a passing assertion. `⚠️` means a linked L1/L3 assertion exists but the complete positive, negative, or conditional rule has not been proved here. No business-rule cell is marked `✅` solely from a shared AC reference.

| BR ID | Positive case | Negative case | Conditional branches | Covering TC | Status |
| ----- | ------------- | ------------- | -------------------- | ----------- | ------ |
| BR-0017-0001 | ⚠️ | ⚠️ | n/a | TC-0017-0001, TC-0017-0002, TC-0017-0003, TC-0017-0004, TC-0017-0005 | ⚠️ |
| BR-0017-0002 | ⚠️ | n/a | ⚠️ | TC-0017-0004, TC-0017-0005 | ⚠️ |
| BR-0017-0003 | ⚠️ | ⚠️ | n/a | TC-0017-0001, TC-0017-0002, TC-0017-0003, TC-0017-0004, TC-0017-0005 | ⚠️ |
| BR-0017-0004 | ❌ | ⚠️ | n/a | TC-0017-0001, TC-0017-0002, TC-0017-0003, TC-0017-0041, TC-0017-0042, TC-0017-0043, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0005 | ❌ | n/a | ⚠️ | TC-0017-0001, TC-0017-0002, TC-0017-0003, TC-0017-0041, TC-0017-0042, TC-0017-0043, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0006 | ❌ | ❌ | ❌ | TC-0017-0006, TC-0017-0007, TC-0017-0012, TC-0017-0013, TC-0017-0084, TC-0017-0085, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0007 | ❌ | ❌ | ❌ | TC-0017-0006, TC-0017-0007, TC-0017-0084, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0008 | ❌ | ❌ | ❌ | TC-0017-0008, TC-0017-0009 | ❌ |
| BR-0017-0009 | ⚠️ | n/a | n/a | TC-0017-0010, TC-0017-0011 | ⚠️ |
| BR-0017-0010 | ⚠️ | n/a | ⚠️ | TC-0017-0010, TC-0017-0011 | ⚠️ |
| BR-0017-0011 | ❌ | ❌ | n/a | TC-0017-0012, TC-0017-0013, TC-0017-0085 | ❌ |
| BR-0017-0012 | ❌ | ❌ | ❌ | TC-0017-0012, TC-0017-0013, TC-0017-0036, TC-0017-0037, TC-0017-0038, TC-0017-0057, TC-0017-0058, TC-0017-0059, TC-0017-0085 | ❌ |
| BR-0017-0013 | ❌ | n/a | ❌ | TC-0017-0012, TC-0017-0013, TC-0017-0041, TC-0017-0042, TC-0017-0043, TC-0017-0085, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0014 | ⚠️ | ❌ | ⚠️ | TC-0017-0014, TC-0017-0015, TC-0017-0016, TC-0017-0017, TC-0017-0018 | ❌ |
| BR-0017-0015 | ⚠️ | ❌ | ⚠️ | TC-0017-0014, TC-0017-0015, TC-0017-0016 | ❌ |
| BR-0017-0016 | ⚠️ | ❌ | ⚠️ | TC-0017-0014, TC-0017-0015, TC-0017-0016 | ❌ |
| BR-0017-0017 | ❌ | n/a | ❌ | TC-0017-0017, TC-0017-0018 | ❌ |
| BR-0017-0018 | ❌ | n/a | n/a | TC-0017-0019, TC-0017-0020, TC-0017-0021 | ❌ |
| BR-0017-0019 | ❌ | ❌ | n/a | TC-0017-0019, TC-0017-0020, TC-0017-0021 | ❌ |
| BR-0017-0020 | ❌ | n/a | n/a | TC-0017-0022, TC-0017-0023, TC-0017-0024 | ❌ |
| BR-0017-0021 | ❌ | ❌ | n/a | TC-0017-0022, TC-0017-0023, TC-0017-0024 | ❌ |
| BR-0017-0022 | ❌ | ❌ | ❌ | TC-0017-0025, TC-0017-0026 | ❌ |
| BR-0017-0023 | ❌ | ❌ | n/a | TC-0017-0025, TC-0017-0026 | ❌ |
| BR-0017-0024 | ❌ | n/a | ❌ | TC-0017-0027, TC-0017-0028, TC-0017-0029 | ❌ |
| BR-0017-0025 | ❌ | n/a | n/a | TC-0017-0027, TC-0017-0028, TC-0017-0029 | ❌ |
| BR-0017-0026 | ❌ | n/a | n/a | TC-0017-0027, TC-0017-0028, TC-0017-0029 | ❌ |
| BR-0017-0027 | ⚠️ | ❌ | n/a | TC-0017-0030, TC-0017-0031 | ❌ |
| BR-0017-0028 | ⚠️ | ❌ | n/a | TC-0017-0030, TC-0017-0031 | ❌ |
| BR-0017-0029 | ⚠️ | n/a | ⚠️ | TC-0017-0032, TC-0017-0033 | ⚠️ |
| BR-0017-0030 | ⚠️ | ⚠️ | ⚠️ | TC-0017-0032, TC-0017-0033, TC-0017-0034, TC-0017-0035, TC-0017-0065, TC-0017-0066, TC-0017-0067 | ⚠️ |
| BR-0017-0031 | ⚠️ | n/a | ⚠️ | TC-0017-0034, TC-0017-0035 | ⚠️ |
| BR-0017-0032 | ❌ | n/a | n/a | TC-0017-0036, TC-0017-0037, TC-0017-0038, TC-0017-0071, TC-0017-0072, TC-0017-0073 | ❌ |
| BR-0017-0033 | ❌ | ❌ | n/a | TC-0017-0036, TC-0017-0037, TC-0017-0038 | ❌ |
| BR-0017-0034 | ⚠️ | ❌ | ⚠️ | TC-0017-0039, TC-0017-0040 | ❌ |
| BR-0017-0035 | ❌ | n/a | n/a | TC-0017-0041, TC-0017-0042, TC-0017-0043, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0036 | ⚠️ | ❌ | ⚠️ | TC-0017-0041, TC-0017-0042, TC-0017-0043, TC-0017-0079, TC-0017-0080, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0037 | ⚠️ | ❌ | n/a | TC-0017-0044, TC-0017-0045 | ❌ |
| BR-0017-0038 | ❌ | n/a | n/a | TC-0017-0046, TC-0017-0047 | ❌ |
| BR-0017-0039 | ⚠️ | n/a | n/a | TC-0017-0048, TC-0017-0049 | ⚠️ |
| BR-0017-0040 | ⚠️ | n/a | ⚠️ | TC-0017-0048, TC-0017-0049, TC-0017-0050, TC-0017-0051, TC-0017-0052 | ⚠️ |
| BR-0017-0041 | ❌ | ❌ | ❌ | TC-0017-0055, TC-0017-0056 | ❌ |
| BR-0017-0042 | ❌ | ❌ | n/a | TC-0017-0057, TC-0017-0058, TC-0017-0059 | ❌ |
| BR-0017-0043 | ❌ | n/a | ❌ | TC-0017-0057, TC-0017-0058, TC-0017-0059 | ❌ |
| BR-0017-0044 | ❌ | n/a | ❌ | TC-0017-0050, TC-0017-0051, TC-0017-0052 | ❌ |
| BR-0017-0045 | ❌ | ❌ | ❌ | TC-0017-0050, TC-0017-0051, TC-0017-0052 | ❌ |
| BR-0017-0046 | ⚠️ | ❌ | n/a | TC-0017-0053, TC-0017-0054 | ❌ |
| BR-0017-0047 | ❌ | ❌ | n/a | TC-0017-0060, TC-0017-0061 | ❌ |
| BR-0017-0048 | ❌ | n/a | n/a | TC-0017-0060, TC-0017-0061 | ❌ |
| BR-0017-0049 | ❌ | n/a | ❌ | TC-0017-0065, TC-0017-0066, TC-0017-0067 | ❌ |
| BR-0017-0050 | ❌ | ❌ | ❌ | TC-0017-0065, TC-0017-0066, TC-0017-0067 | ❌ |
| BR-0017-0051 | ❌ | ❌ | n/a | TC-0017-0065, TC-0017-0066, TC-0017-0067 | ❌ |
| BR-0017-0052 | ⚠️ | n/a | n/a | TC-0017-0068, TC-0017-0069, TC-0017-0070, TC-0017-0083 | ⚠️ |
| BR-0017-0053 | ⚠️ | n/a | ⚠️ | TC-0017-0068, TC-0017-0069, TC-0017-0070, TC-0017-0083 | ⚠️ |
| BR-0017-0054 | ⚠️ | n/a | ⚠️ | TC-0017-0068, TC-0017-0069, TC-0017-0070, TC-0017-0083 | ⚠️ |
| BR-0017-0055 | ❌ | ❌ | n/a | TC-0017-0062, TC-0017-0063, TC-0017-0064 | ❌ |
| BR-0017-0056 | ❌ | ❌ | n/a | TC-0017-0062, TC-0017-0063, TC-0017-0064 | ❌ |
| BR-0017-0057 | ❌ | n/a | n/a | TC-0017-0062, TC-0017-0063, TC-0017-0064 | ❌ |
| BR-0017-0058 | ❌ | n/a | n/a | TC-0017-0071, TC-0017-0072, TC-0017-0073 | ❌ |
| BR-0017-0059 | ❌ | n/a | n/a | TC-0017-0071, TC-0017-0072, TC-0017-0073 | ❌ |
| BR-0017-0060 | ❌ | n/a | n/a | TC-0017-0036, TC-0017-0037, TC-0017-0038, TC-0017-0071, TC-0017-0072, TC-0017-0073 | ❌ |
| BR-0017-0061 | ❌ | n/a | n/a | TC-0017-0074, TC-0017-0075 | ❌ |
| BR-0017-0062 | ❌ | n/a | ❌ | TC-0017-0076, TC-0017-0077, TC-0017-0078 | ❌ |
| BR-0017-0063 | ❌ | ❌ | n/a | TC-0017-0076, TC-0017-0077, TC-0017-0078 | ❌ |
| BR-0017-0064 | ❌ | ❌ | n/a | TC-0017-0076, TC-0017-0077, TC-0017-0078 | ❌ |
| BR-0017-0065 | ⚠️ | ❌ | ⚠️ | TC-0017-0079, TC-0017-0080 | ❌ |
| BR-0017-0066 | ❌ | ❌ | n/a | TC-0017-0081, TC-0017-0082 | ❌ |
| BR-0017-0067 | ❌ | ❌ | ❌ | TC-0017-0006, TC-0017-0007, TC-0017-0041, TC-0017-0042, TC-0017-0043, TC-0017-0084, TC-0017-0086, TC-0017-0087 | ❌ |
| BR-0017-0068 | ❌ | ❌ | ❌ | TC-0017-0088, TC-0017-0089 | ❌ |
| BR-0017-0069 | ❌ | ❌ | ❌ | TC-0017-0090, TC-0017-0091, TC-0017-0092 | ❌ |

Current business rules: **BR 69**; scored cells **✅ 0 / ⚠️ 42 / ❌ 98 / n/a 67**; status **✅ 0 / ⚠️ 13 / ❌ 56**.

### Current gap reasons

Each entry names every `❌` coordinate in its row. These are open gaps, not passing tests. The historical E2E findings above explain the E2E surface in detail.

- **US-0017-0001** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0001`: `Boundary values` = E2E gap (historical finding above); `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above).
- **US-0017-0002** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0002`: `State transitions` = E2E gap (historical finding above).
- **US-0017-0003** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0003`: `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above).
- **US-0017-0004** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0004`: `Normal path` = E2E gap (historical finding above); `Error path` = E2E gap (historical finding above); `Boundary values` = E2E gap (historical finding above); `Special values` = E2E gap (historical finding above); `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above); `Status` = E2E gap (historical finding above).
- **US-0017-0005** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0005`: `Normal path` = E2E gap (historical finding above); `Error path` = E2E gap (historical finding above); `Boundary values` = E2E gap (historical finding above); `Special values` = E2E gap (historical finding above); `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above); `Status` = E2E gap (historical finding above).
- **US-0017-0006** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0006`: `Normal path` = E2E gap (historical finding above); `Error path` = E2E gap (historical finding above); `Boundary values` = E2E gap (historical finding above); `Special values` = E2E gap (historical finding above); `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above); `Status` = E2E gap (historical finding above).
- **US-0017-0007** — [spec0017RunnerParallelismE2E.test.ts](../../packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts), selector `US-0017-0007`: `Error path` = E2E gap (historical finding above); `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above).
- **US-0017-0008** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0008`: `Error path` = E2E gap (historical finding above); `Boundary values` = E2E gap (historical finding above); `Special values` = E2E gap (historical finding above); `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above); `Status` = E2E gap (historical finding above).
- **US-0017-0009** — [spec0017LayeredCiScaffoldE2E.test.ts](../../packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts), selector `US-0017-0009`: `State transitions` = E2E gap (historical finding above); `Combinatorial` = E2E gap (historical finding above).
- **TC-0017-0001** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0001 (TDD-0001): the verdict derives its result from the serialized needs map`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0003** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0003 (TDD-0003): no need is outside the verdict derivation and edge 1 is cited`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0006** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0006 (TDD-0006): the executing set and its declared timeout sum match the pin`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0007** — [spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts), selector `keeps every retained matrix leg declared`: `Equivalence partitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Error path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Boundary values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `State transitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Combinatorial` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Status` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **TC-0017-0008** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0008 (TDD-0008): a resolvable base ref narrows the lane set with no annotation`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0009** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0009 (TDD-0009): a shallow clone and an unreachable base ref both fail open`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0012** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0012 (TDD-0012): no lint-aggregate lane's host job is conditioned or listed`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0013** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0013 (TDD-0013): a condition on a dependency makes the required job skippable`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0014** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0017** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0017 (TDD-0017): removing both blocks exits 1 naming the workflow and the job`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0018** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0018 (TDD-0018): restoring either one of the two blocks returns exit 0`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0019** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0019 (TDD-0019): every checkout step refuses to persist credentials`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0020** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0020 (TDD-0020): deleting the flag from one checkout step exits 1`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0021** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0021 (TDD-0021): full history is job-scoped, never a workflow default`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0022** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0022 (TDD-0022): every action reference is a full-SHA pin`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0023** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0023 (TDD-0023): a planted floating reference exits 1 and is named`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0024** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0024 (TDD-0024): a readable pin trailer stays legal and no guard is widened`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0025** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0026** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0026 (TDD-0026): no root bump configuration, and the owner is recorded anyway`: `Equivalence partitions` = L3 placement gap (assets path); `Edge cases` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Combinatorial` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0027** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0028** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0028 (TDD-0028): no toolchain job restates a preamble step inline`: `Equivalence partitions` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0029** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0029 (TDD-0029): the shared definition keeps its four-step order and the re-shim`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0031** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0031 (TDD-0031): the shared definition never enters the shipped asset tree`: `Equivalence partitions` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0036** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0037** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0037 (TDD-0037): a rename or an added dependency condition is reported`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0038** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0038 (TDD-0038): no verification-set item is weakened by continue-on-error`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0039** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0039 (TDD-0039): the report upload skips on cancellation and ages out sooner`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0041** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0041 (TDD-0041): layer separation adds no workflow file and no check name`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0042** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0042 (TDD-0042): the aggregate verdict check name is immutable`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0043** — [spec0017CiMatrix.test.ts](../../packages/qfai/tests/integration/spec0017CiMatrix.test.ts), selector `reports all expanded check names on full runs`: `Equivalence partitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Error path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Edge cases` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Boundary values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Combinatorial` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Status` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **TC-0017-0044** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0044 (TDD-0044): the hygiene lane exits 0 over the hardened own tree`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0046** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0046 (TDD-0046): a green run names every rule it evaluated`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0047** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0047 (TDD-0047): an unevaluated rule is absent, not implied by the green run`: `Equivalence partitions` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0048** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0048 (TDD-0048): each planted violation exits 1 naming file, job and rule`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0050** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0050 (TDD-0050): the lane scans both roots and reports shipped paths as such`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0051** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0051 (TDD-0051): a shipped-only violation exits 1 naming the shipped path`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0052** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0052 (TDD-0052): shipped coverage never precedes the shipped hardening`: `Equivalence partitions` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0054** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0054 (TDD-0054): an unsanctioned third-party reference exits 1`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0055** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0055 (TDD-0055): the lane is invoked from an aggregate pull requests execute`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0056** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0056 (TDD-0056): the lane is absent from the release-only aggregate`: `Equivalence partitions` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0057** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0058** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0058 (TDD-0058): a declared context resolving to no job exits 1`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0059** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0059 (TDD-0059): skippable-through-a-dependency and a shrunk set both exit 1`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0060** — [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts), selector `TC-0017-0060 (TDD-0060): every runner project declares the full knob set`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0061** — [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts), selector `TC-0017-0061 (TDD-0061): the declared starting value is ten on both axes`: `Equivalence partitions` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0062** — [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts), selector `agrees across the runner, scripts, CI and release declarations`: `Equivalence partitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Normal path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Boundary values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Combinatorial` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Status` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **TC-0017-0063** — [sliceSurfaceAlignment.test.ts](../../packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts), selector `TC-0017-0063 (TDD-0063): no declared slice can match zero test files`: `Equivalence partitions` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0064** — [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts), selector `names each script after its selected project`: `Equivalence partitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Normal path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Boundary values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Combinatorial` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Status` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **TC-0017-0065** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0066** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0066 (TDD-0066): a slower or flakier higher value keeps the lower one`: `Equivalence partitions` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Combinatorial` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0067** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0067 (TDD-0067): revising the declared starting value needs the sign-off`: `Equivalence partitions` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0068** — [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts), selector `TC-0017-0068 (TDD-0068): the runner workspace carries zero retry settings`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0071** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0071 (TDD-0071): exactly one workflow is triggered by a pull request`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0072** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0072 (TDD-0072): the folded run uses the local binary, not the published one`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0073** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0073 (TDD-0073): the folded run joins the enumerated verification set`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0074** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0074 (TDD-0074): deleting the copy with no shipped-set gate is rejected`: `Equivalence partitions` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `Edge cases` = L3 placement gap (assets path); `State transitions` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0075** — [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0075 (TDD-0075): the gate is present at or before the deletion`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `State transitions` = L3 placement gap (assets path); `Combinatorial` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0076** — [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0076 (TDD-0076): the mapping file exists in both trees and is cross-linked`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Edge cases` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Combinatorial` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0077** — [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0077 (TDD-0077): the mapping file header disclaims the layer-policy loader`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0078** — [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0078 (TDD-0078): the mapping file does not read as activating routing`: `Equivalence partitions` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0079** — [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0079 (TDD-0079): the vocabulary warning count is unchanged after it lands`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Boundary values` = L3 placement gap (assets path); `State transitions` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0081** — [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0081 (TDD-0081): authoring in the asset tree passes both mirror gates`: `Equivalence partitions` = L3 placement gap (assets path); `Normal path` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `Edge cases` = L3 placement gap (assets path); `State transitions` = L3 placement gap (assets path); `Combinatorial` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0082** — [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0082 (TDD-0082): an unlinked repository-root path fails the link check`: `Equivalence partitions` = L3 placement gap (assets path); `Error path` = L3 placement gap (assets path); `State transitions` = L3 placement gap (assets path); `Status` = L3 placement gap (assets path).
- **TC-0017-0084** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0084 (TDD-0093): a committed pin disagreeing with the recomputed value exits 1`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0085** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0085 (TDD-0094): exempt lint hosts cannot be declared skippable`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0086** — [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0086 (TDD-0095): a committed code-path pin the tree does not declare exits 1`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0087** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0087 (TDD-0096): the code path's cost agrees with the committed pin`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0088** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0088 (TDD-0097): release prerequisites accept complete gate paths`: `Equivalence partitions` = L3 placement gap (scripts path); `Normal path` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Edge cases` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0089** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0089 (TDD-0098): release prerequisites reject invalid gate paths`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Special values` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).
- **TC-0017-0090** — [spec0017ReleaseOperations.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts), selector `classifies exact operation capabilities`: `Equivalence partitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Normal path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Error path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Boundary values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Status` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **TC-0017-0091** — [spec0017ReleaseFallback.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts), selector `missing operation scripts retain aggregate checks`: `Equivalence partitions` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Error path` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Edge cases` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Boundary values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Special values` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Combinatorial` = integration selector has per-row GREEN/QA; implementation checkpoint pending; `Status` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **TC-0017-0092** — [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0092 (TDD-0101): runs independent checks in isolated verified workspaces`: `Equivalence partitions` = L3 placement gap (scripts path); `Error path` = L3 placement gap (scripts path); `Boundary values` = L3 placement gap (scripts path); `State transitions` = L3 placement gap (scripts path); `Combinatorial` = L3 placement gap (scripts path); `Status` = L3 placement gap (scripts path).

- **BR-0017-0004** (AC-0017-0001, AC-0017-0018) — candidate TC-0017-0001 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0001 (TDD-0001): the verdict derives its result from the serialized needs map`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0005** (AC-0017-0001, AC-0017-0018) — candidate TC-0017-0001 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0001 (TDD-0001): the verdict derives its result from the serialized needs map`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0006** (AC-0017-0003, AC-0017-0006) — candidate TC-0017-0006 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0006 (TDD-0006): the executing set and its declared timeout sum match the pin`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0007** (AC-0017-0003) — candidate TC-0017-0006 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0006 (TDD-0006): the executing set and its declared timeout sum match the pin`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0008** (AC-0017-0004) — candidate TC-0017-0008 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0008 (TDD-0008): a resolvable base ref narrows the lane set with no annotation`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0011** (AC-0017-0006) — candidate TC-0017-0012 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0012 (TDD-0012): no lint-aggregate lane's host job is conditioned or listed`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0012** (AC-0017-0006, AC-0017-0016, AC-0017-0025) — candidate TC-0017-0012 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0012 (TDD-0012): no lint-aggregate lane's host job is conditioned or listed`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0013** (AC-0017-0006, AC-0017-0018) — candidate TC-0017-0012 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0012 (TDD-0012): no lint-aggregate lane's host job is conditioned or listed`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0014** (AC-0017-0007, AC-0017-0008) — candidate TC-0017-0014 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0015** (AC-0017-0007) — candidate TC-0017-0014 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0016** (AC-0017-0007) — candidate TC-0017-0014 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0017** (AC-0017-0008) — candidate TC-0017-0017 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0017 (TDD-0017): removing both blocks exits 1 naming the workflow and the job`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0018** (AC-0017-0009) — candidate TC-0017-0019 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0019 (TDD-0019): every checkout step refuses to persist credentials`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0019** (AC-0017-0009) — candidate TC-0017-0019 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0019 (TDD-0019): every checkout step refuses to persist credentials`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0020** (AC-0017-0010) — candidate TC-0017-0022 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0022 (TDD-0022): every action reference is a full-SHA pin`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0021** (AC-0017-0010) — candidate TC-0017-0022 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0022 (TDD-0022): every action reference is a full-SHA pin`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0022** (AC-0017-0011) — candidate TC-0017-0025 at [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0023** (AC-0017-0011) — candidate TC-0017-0025 at [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0024** (AC-0017-0012) — candidate TC-0017-0027 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0025** (AC-0017-0012) — candidate TC-0017-0027 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0026** (AC-0017-0012) — candidate TC-0017-0027 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0027** (AC-0017-0013) — candidate TC-0017-0030 at [spec0017OwnWorkflowScope.test.ts](../../packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts), selector `leaves exactly the publishing job's declared literal and routes every other job through the shared setup`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0028** (AC-0017-0013) — candidate TC-0017-0030 at [spec0017OwnWorkflowScope.test.ts](../../packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts), selector `leaves exactly the publishing job's declared literal and routes every other job through the shared setup`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0032** (AC-0017-0016, AC-0017-0030) — candidate TC-0017-0036 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0033** (AC-0017-0016) — candidate TC-0017-0036 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0034** (AC-0017-0017) — candidate TC-0017-0039 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0039 (TDD-0039): the report upload skips on cancellation and ages out sooner`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0035** (AC-0017-0018) — candidate TC-0017-0041 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0041 (TDD-0041): layer separation adds no workflow file and no check name`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0036** (AC-0017-0018, AC-0017-0033) — candidate TC-0017-0041 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0041 (TDD-0041): layer separation adds no workflow file and no check name`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0037** (AC-0017-0019) — candidate TC-0017-0044 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0044 (TDD-0044): the hygiene lane exits 0 over the hardened own tree`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0038** (AC-0017-0020) — candidate TC-0017-0046 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0046 (TDD-0046): a green run names every rule it evaluated`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0041** (AC-0017-0024) — candidate TC-0017-0055 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0055 (TDD-0055): the lane is invoked from an aggregate pull requests execute`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0042** (AC-0017-0025) — candidate TC-0017-0057 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0043** (AC-0017-0025) — candidate TC-0017-0057 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0044** (AC-0017-0022) — candidate TC-0017-0050 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0050 (TDD-0050): the lane scans both roots and reports shipped paths as such`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0045** (AC-0017-0022) — candidate TC-0017-0050 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0050 (TDD-0050): the lane scans both roots and reports shipped paths as such`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0046** (AC-0017-0023) — candidate TC-0017-0053 at [workflowHygiene.test.ts](../../packages/qfai/tests/scripts/workflowHygiene.test.ts), selector `TC-0017-0053 (TDD-0053): the shipped third-party rule is allow-list membership`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0047** (AC-0017-0026) — candidate TC-0017-0060 at [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts), selector `TC-0017-0060 (TDD-0060): every runner project declares the full knob set`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0048** (AC-0017-0026) — candidate TC-0017-0060 at [vitestWorkspaceKnobs.test.ts](../../packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts), selector `TC-0017-0060 (TDD-0060): every runner project declares the full knob set`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0049** (AC-0017-0028) — candidate TC-0017-0065 at [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0050** (AC-0017-0028) — candidate TC-0017-0065 at [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0051** (AC-0017-0028) — candidate TC-0017-0065 at [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0055** (AC-0017-0027) — candidate TC-0017-0062 at [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts), selector `agrees across the runner, scripts, CI and release declarations`: `Positive case` = per-row GREEN/QA recorded; implementation checkpoint pending; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0056** (AC-0017-0027) — candidate TC-0017-0062 at [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts), selector `agrees across the runner, scripts, CI and release declarations`: `Positive case` = per-row GREEN/QA recorded; implementation checkpoint pending; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0057** (AC-0017-0027) — candidate TC-0017-0062 at [spec0017SliceAlignment.test.ts](../../packages/qfai/tests/integration/spec0017SliceAlignment.test.ts), selector `agrees across the runner, scripts, CI and release declarations`: `Positive case` = per-row GREEN/QA recorded; implementation checkpoint pending.
- **BR-0017-0058** (AC-0017-0030) — candidate TC-0017-0071 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0071 (TDD-0071): exactly one workflow is triggered by a pull request`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0059** (AC-0017-0030) — candidate TC-0017-0071 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0071 (TDD-0071): exactly one workflow is triggered by a pull request`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0060** (AC-0017-0016, AC-0017-0030) — candidate TC-0017-0036 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0061** (AC-0017-0031) — candidate TC-0017-0074 at [actionPinBumpOwner.test.ts](../../packages/qfai/tests/assets/actionPinBumpOwner.test.ts), selector `TC-0017-0074 (TDD-0074): deleting the copy with no shipped-set gate is rejected`: `Positive case` = no qualifying L3 evidence for a rule-positive case.
- **BR-0017-0062** (AC-0017-0032) — candidate TC-0017-0076 at [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0076 (TDD-0076): the mapping file exists in both trees and is cross-linked`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0063** (AC-0017-0032) — candidate TC-0017-0076 at [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0076 (TDD-0076): the mapping file exists in both trees and is cross-linked`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0064** (AC-0017-0032) — candidate TC-0017-0076 at [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0076 (TDD-0076): the mapping file exists in both trees and is cross-linked`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0065** (AC-0017-0033) — candidate TC-0017-0079 at [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0079 (TDD-0079): the vocabulary warning count is unchanged after it lands`: `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0066** (AC-0017-0034) — candidate TC-0017-0081 at [layerCiLaneMapping.test.ts](../../packages/qfai/tests/assets/layerCiLaneMapping.test.ts), selector `TC-0017-0081 (TDD-0081): authoring in the asset tree passes both mirror gates`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection.
- **BR-0017-0067** (AC-0017-0003, AC-0017-0018) — candidate TC-0017-0006 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0006 (TDD-0006): the executing set and its declared timeout sum match the pin`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0068** (AC-0017-0035) — candidate TC-0017-0088 at [ownWorkflowTopology.test.ts](../../packages/qfai/tests/scripts/ownWorkflowTopology.test.ts), selector `TC-0017-0088 (TDD-0097): release prerequisites accept complete gate paths`: `Positive case` = no qualifying L3 evidence for a rule-positive case; `Negative case` = no qualifying L3 evidence for the kept rejection; `Conditional branches` = no qualifying L3 evidence for all declared alternatives.
- **BR-0017-0069** (AC-0017-0036) — TC-0017-0090 at [spec0017ReleaseOperations.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts), selector `classifies exact operation capabilities`, and TC-0017-0091 at [spec0017ReleaseFallback.test.ts](../../packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts), selector `missing operation scripts retain aggregate checks`: `Positive case` = per-row GREEN/QA recorded; implementation checkpoint pending; `Negative case` = fallback GREEN/QA recorded; implementation checkpoint pending; `Conditional branches` = the moved selectors and the still-scripted TC-0017-0092 have no complete L3 branch proof.

### Partial-score basis

- For a TC's `Equivalence partitions`, `⚠️` means one linked L1/L3 selector exists, while the full valid and kept-invalid partition set was not established by that selector alone. For `Oracle strength`, `⚠️` means the present assertion has not been freshly tied to a named mutation or equivalent-mutant receipt in this assessment.
- For inherited `Error path` and `Boundary values`, `⚠️` means the row reaches a sibling case through its AC, but this row alone does not establish all inherited alternatives. `⚠️` for other TC depth cells likewise records a candidate assertion without proof of every value, state, or combination.
- The current US cells retain their historical E2E scores; their newly required `Equivalence partitions` and `Edge cases` cells are `⚠️` pending a separate depth audit. The E2E selector and the existing historical rationale above define the scored surface.
- A BR `⚠️` names a linked L1/L3 test case; it does not assert that all rule clauses or branches passed. The TDD ledger and linked test selector must be read together before closing that cell.
