# R03 — qa-gatekeeper (stage), round 10, spec-0017

**Verdict: REVISE.**

- `git rev-parse --short HEAD` at start: `a66be5c6`. At finish: `a66be5c6`. It did not move.
- `git status --porcelain` at start: **empty**. At finish: **empty**.
- Read-only apart from this file. Every oracle mutation reverted in the same step with a printed byte
  comparison. All scratch under `tmp/r10-qa/`.
- `.qfai/report/` sha256 over its 1511 files: `7a8d8f4a…d538` before, `7a8d8f4a…d538` after —
  **identical**. `validate` ran only against a `git archive HEAD` shadow root at
  `tmp/r10-qa/shadow/` with the 83 tracked symlinks re-materialised as relative-target symlinks
  (`83 created, 0 failed`, all resolvable, no `QFAI-LINK-001`).

One thing before the findings, because the brief asks for it explicitly: **P1d is closed.** It passed
at round 7, pass 6, revision `9a37421c`, on `DR-0017-0010`, authorising `TDD-0070 -> exception` and
holding `TDD-0069 -> blocked` released. I did not re-open it, did not re-read the branch-3 reasoning
for merit, and nothing below re-decides it. Where a finding touches `DR-0017-0010` it touches the
*record around it*, never the gate.

## Gate summary

| gate | status | evidence |
| --- | --- | --- |
| validate hard gate (scoped) | **FAIL, as recorded** | `--profile atdd --fail-on error --spec 0017` -> `info=2 warning=0 error=2`, exit 1. Matches the record. |
| validate hard gate (unscoped) | **FAIL, as recorded** | `--profile full --fail-on error` -> `info=4 warning=404 error=4`, exit 1. Matches the record. |
| Hard Gate artifact currency | **PASS** | tracked `.qfai/report/validate.spec-0017.json` is **deep-equal** to a fresh run. |
| coverage obligations | **REVISE** | matrix present and pinned, every `❌` justified — but its central claim about `US-0017-0004` is falsified by `B1`. |
| Coverage Depth Matrix | **present, committed, pinned** | `.qfai/evidence/coverage-depth-spec-0017.md`, tracked, 9 rows, `❌` cells partitioned and each justified. |
| runtime proof | **PASS** | `--project e2e` 1434 passed / 16 skipped exit 0; `--project integration --project unit` 1200 passed / 19 skipped exit 0. Both exactly as recorded. |
| RED/GREEN observation gate | **nothing open** | no ledger row advanced; see § "The observation gate". |
| prototyping evidence | **n/a** | no UI/prototyping surface declared for this spec; `atdd` profile raises none. |

**On the unscoped `error=4`, one clarification the number needs.** I reproduced it against the
`git archive HEAD` shadow, where this round's pack holds only `review_request.md`, so two of the four
are `QFAI-REVIEW-004` / `-005` against this pack itself. The record discloses exactly that at
§ "The full profile". It means `error=4` is reproducible only from HEAD's tracked content: run against
the working tree now, with this file and a sibling's report present, `QFAI-REVIEW-005` clears and the
count is 3. The two spec-facing errors — `QFAI-ATDD-111` and `-112`, unscoped — are the stable ones.

The verdict is `REVISE` because the validate hard gate fails and because `B1`-`B5` are the same defect
this stage has now failed to close for a third consecutive round.

## The headline: the repair does not generalise

I planted **50 build forms** one at a time into the shipped orchestrator's `unit` lane placeholder in
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, and ran the story's own loop —
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`, the `US-0017-0004` row, which reaches
the asset through a real `runInit`. Every mutation was reverted in the same step and the file's sha256
printed; the asset is `581608a7…f9ee` before the first plant and `581608a7…f9ee` after the last, with
50 distinct intermediate hashes proving each plant landed.

    total=50  caught=6  MISSED=44   revert failures=0   runs that did not execute the row=0

**All 6 controls reddened. All 44 candidates shipped unnoticed.** The controls were forms this
repository already declares (`pnpm build`, `npx tsup`, `mvn package`, `make`, `./gradlew
assembleRelease`, `docker buildx bake -f docker-bake.hcl`); the 44 were forms nobody here has written.
Round 8 planted 11 and 10 shipped; round 9 planted 20 and 40 and 18 and 34 shipped; round 10 planted
44 and 44 shipped. The ratio got worse, not better.

The negative result the brief asked for is the opposite of what happened, so here is the positive one
in its sharpest form. **I did not have to find a weakness in v12 to do this. I only had to name build
tools v12 does not name, and to give the ones it does name their real arguments.**

### B1 — 44 of 50 real builds ship past the story's own loop, in five families

Verdicts are from the loop itself (exit 1 = caught). I re-measured each with the repository manifests
supplied as well, so the result is not an artefact of the shipped tree having no `package.json`:
**44 of 50 are `none` with sources too.**

**Family 1 — a manager plus an undeclared binary. The manager path returns on the FIRST bare token and
never reads the rest of the line.** `command()` reaches
`return script(whole, { ...ctx, cwd, noScripts })` and the word `build` sitting right after it is never
looked at:

    npx next build                              none
    pnpm exec ng build --configuration production  none
    npx nuxt build                              none
    npx astro build                             none
    pnpm exec nest build                        none
    npx gatsby build                            none
    npx docusaurus build                        none
    npx react-scripts build                     none
    npx vue-cli-service build                   none
    npx unbuild                                 none
    npx tsdown                                  none
    npx ncc build src/index.ts                  none
    npx babel src --out-dir lib                 none

`npx next build` is plausibly the single most common build command in the JavaScript ecosystem. The
corpus's `pnpm exec vite build` and `npx turbo run build` pass only because `vite` is in `BUNDLERS` and
`turbo` is in `TOOLS` — so what the corpus measures is membership, not the manager rule.

**Family 2 — a manager flag eats the tool. This is the `MANAGER_BOOLEAN` rule breaking, and see `B3`.**

    npx --yes esbuild src/index.ts --bundle --outfile=dist/index.js   none
    npx --no-install tsup --config tsup.config.ts                     none
    npm exec -- tsup --config tsup.config.ts                          none
    npx --package=tsup -- tsup --config tsup.config.ts                none
    npm-run-all --parallel build lint                                 none

`esbuild` and `tsup` are **declared members of `BUNDLERS`**. The `--yes` / `--no-install` / `--` token
consumes them, because `laterBare` sees a bare token further along the line and concludes the flag must
take a value.

**Family 3 — `run-s` / `run-p` / `npm-run-all` take a LIST of scripts and only the first is read.**
`MANAGERS`'s own comment says "Their bare tokens are script names", plural; the code reads `tokens[i]`
once and returns.

    run-s clean build          none
    npm-run-all clean build    none
    run-p lint build           none

**Family 4 — undeclared launchers, wrappers and compilers.**

    ./mvnw -B package                             none   (`gradlew` is declared; `mvnw` is not)
    bazelisk build //...                          none   (`bazel` is declared)
    cargo b --release                             none   (cargo's own canonical alias)
    corepack pnpm build                           none
    ant dist                                      none
    deno task build                               none
    deno compile --output app main.ts             none
    nix build                                     none
    buildah bud -t qfai:ci .                      none
    earthly +build                                none
    pants package ::                              none
    dart compile exe bin/main.dart                none
    elm make src/Main.elm --output=dist/app.js    none
    gcc -O2 -o dist/app src/main.c                none
    javac -d out src/Main.java                    none
    rustc -O src/main.rs                          none
    swiftc main.swift -o app                      none

**Family 5 — shell structure and platform.**

    powershell -NoProfile -File scripts\build.ps1   none   (`pwsh -File scripts/build.ps1` is `heuristic`)
    .\scripts\build.cmd                         none
    (cd packages/qfai && pnpm build)                  none   (the closing paren defeats `namesABuild`)
    bash -eo pipefail -c "pnpm build"                 none   (`-eo` is not `-o`, so the cluster rule never fires)
    script -q -c "pnpm build" /dev/null               none
    xargs -I{} pnpm -C {} build                       none

`SCRIPT_EXTENSIONS` and `NAME_SEPARATORS` were exported and swept this round; `NAME_SEPARATORS` still
has no `\`, and `scriptFileRe` still builds a character class of `[\w./-]`, so no Windows-separator
path can match either.

**The pair table is the finding, though.** For every one of these I took the nearest form the corpus
already contains and put them side by side. Verdict shown as `without sources / with this
repository's manifests`:

    build/build           npx --yes tsup                        <- in the corpus (REGRESSIONS)
    none/none             npx --yes tsup --config tsup.config.ts

    build/build           npm exec -- tsup
    none/none             npm exec -- tsup --config tsup.config.ts

    heuristic/build       run-s build                           <- in the corpus (MEMBER_CASES)
    none/none             run-s clean build

    build/build           ./gradlew assembleRelease             <- in the corpus (round 9 PLANTED)
    none/none             ./mvnw -B package

    build/build           cargo build --release
    none/none             cargo b --release

    heuristic/heuristic   pwsh -File scripts/build.ps1          <- in the corpus (round 9 PLANTED)
    none/none             powershell -NoProfile -File scripts\build.ps1

    build/build           pnpm exec vite build                  <- in the corpus (KEPT)
    none/none             pnpm exec ng build

    heuristic/build       pnpm build
    none/none             corepack pnpm build

    build/build           bazel build //...
    none/none             bazelisk build //...

    build/build           docker build -t x .
    none/none             buildah bud -t x .

    heuristic/build       cd packages/qfai && pnpm build         <- in the corpus (REGRESSIONS)
    none/none             (cd packages/qfai && pnpm build)

    heuristic/build       bash -c "pnpm build"                  <- in the corpus (round 9 PLANTED)
    none/none             bash -eo pipefail -c "pnpm build"

**Sixteen pairs, sixteen times the corpus holds the member and misses the command.** In every case the
corpus's chosen spelling is the one with no trailing argument, no alias, no wrapper spelling and no
Windows separator. That is not a corpus that was chosen to break the predicate; it is a corpus that was
chosen to name the grammar. The round-9 sentence the request wanted attacked —
"the instrument is checked against its own claims rather than against the world" — is not weakened by
v12. This table is it, restated at a finer grain.

The consequence for the gate: `coverage-depth-spec-0017.md`'s `US-0017-0004` section states
"the E2E test asserts the invariant that survives the gap — no shipped lane runs its own build — and
**the oracle confirms it reddens when one does**". Measured: it reddens for 6 of 50 forms that do.
`Oracle strength = ⚠️` is not a conservative score for that; and `⚠️` is the one score the matrix's
justification contract does not require a reason for, so the weakest claim about the instrument sits at
the only cell nothing checks.

### B2 — a real build arriving through `uses:` ships past BOTH instruments

A separate channel, and the one I would fix first because it is cheap and nobody has looked at it. I
replaced the `unit` lane placeholder with

    - name: unit lane placeholder
      uses: gradle/actions/setup-gradle@0000000000000000000000000000000000000000
      with:
        arguments: build

and ran both instruments:

    S1  E2E row: MISSED  | unit shipped-tree: CAUGHT  | a real build in qfai-validate.yml (`npx tsup`)
    S2  E2E row: MISSED  | unit shipped-tree: MISSED  | a build via `uses:` + `with.arguments`
    S3  E2E row: CAUGHT  | unit shipped-tree: CAUGHT  | CONTROL: `npx tsup` in the orchestrator

Both asset files byte-identical afterwards (`581608a7…f9ee`, `08e79f77…c7f6`).

The E2E row reads only `step["run"]` and skips anything that is not a string
(`if (typeof run !== "string") continue;`). The unit test's extractor greps for `run:` in the YAML text.
So neither reads `uses:` or `with:`. `gradle/actions/setup-gradle` with `arguments:` is the officially
documented way to run Gradle in GitHub Actions, and `docker/build-push-action` is the standard way to
build an image there — both would be invisible. The classifier itself would classify `gradle build`
correctly; the harness never hands it the string.

`S1` is a lesser instance and it is covered: a build in the sibling shipped workflow is missed by the
`US-0017-0004` row (which reads `ORCHESTRATOR` only) and caught by
`tests/unit/buildCommand.test.ts`'s shipped-tree scan. Recorded as `A4` rather than as blocking.

### B3 — the eight deletions rest on an inference the sweep cannot make, and one of them is falsified

The request named this as the argument to attack, so here is a decisive counter-example rather than a
doubt. `buildCommand.ts` says of `MANAGER_PASS`:

> No `--`: the rule that a manager flag consumes only when a later bare token exists already leaves the
> script readable, so listing it changed no verdict.

I restored the single member and measured, reverting in the same step
(`429b2fef…09f1` before, `429b2fef…09f1` after):

    === UNMUTATED (the deletion in place) ===
    none      "npm exec -- tsup --config tsup.config.ts"
    none      "npx --package=tsup -- tsup --config tsup.config.ts"

    === WITH "--" RESTORED TO MANAGER_PASS ===
    build     "npm exec -- tsup --config tsup.config.ts"
    build     "npx --package=tsup -- tsup --config tsup.config.ts"

**"Listing it changed no verdict" is false.** It changes the verdict of `npm exec -- tsup --config
tsup.config.ts`, which is a command people write and which reaches `tsup`, a declared bundler.

And the second half of the measurement is the general point. With `--` restored, the corpus does redden
— but only here:

    a grammar member no hardcoded case names: expected [ 'MANAGER_PASS.--' ] to deeply equal []
    a grammar member whose deletion no case in this corpus notices: expected [ 'MANAGER_PASS.--' ] to deeply equal []

No verdict regressed. The sweep's report on `--` is *identical* whether the member is dead or whether
the corpus merely lacks a command of its shape, and the eight deletions read that report as the former.
**The sweep cannot distinguish "no command needs this member" from "no command in this corpus exercises
this member", and every one of the eight deletions is an inference from the second to the first.** The
docstring states the inference outright — "A rule no probe can distinguish is not grammar" — and that is
the step that does not hold, because the probes are the corpus and the corpus is this stage's.

`B1` family 2 is the same finding on `MANAGER_BOOLEAN`'s replacement rule, with five real commands:
`npx --yes esbuild src/index.ts --bundle --outfile=dist/index.js`,
`npx --no-install tsup --config tsup.config.ts`, `npm exec -- tsup --config tsup.config.ts`,
`npx --package=tsup -- tsup --config tsup.config.ts` and `npm-run-all --parallel build lint`. The
nineteen-member list was replaced by "a manager flag consumes its value only when a later bare token
exists to be the script", and the shape that breaks it is the ordinary one: **flag, tool, tool's own
argument.** For completeness I also neutralised the rule in both directions and both redden the corpus
(`laterBare = true` REDDENS, `laterBare = false` REDDENS), so the rule is probed — it is probed and
wrong, which is a different thing from unprobed.

The wrapper `values`/`args` deletion has its own instance in `B1` family 5:
`script -q -c "pnpm build" /dev/null` is `none` because `namesACommand` unquotes and `command()` does
not, so the scan lands on the token `"pnpm` and then cannot recognise it. See `B4`.

### B4 — the deletion sweep's reach is still narrower than its claim: three live decisions sit outside `GRAMMAR`

The question the request asks is "Is anything still deciding a verdict from outside `GRAMMAR`?" The
answer is **yes, three things**, and I measured each by mutating the helper, running the whole corpus,
and reverting in the same step (`429b2fef…09f1` before and after, every time).

| id | mutation | corpus | verdict change |
| --- | --- | --- | --- |
| H1 | drop `zsh` from `SH_FAMILY` | **GREEN** | `zsh -c 'pnpm build'` heuristic -> none; `zsh -euxc 'make'` build -> none |
| H4 | remove `unquote` from `namesACommand` | **GREEN** | `env -S "pnpm test" pnpm build` none -> heuristic |
| H8 | make's optional-arg rule consumes any non-flag token | **GREEN** | `make -j build clean` build -> none |
| H2 | drop `sh` from `SH_FAMILY` (control) | REDDENS | |
| H3 | empty `SH_FAMILY` (control) | REDDENS | |
| H5 | `laterBare = true` (control) | REDDENS | |
| H6 | `laterBare = false` (control) | REDDENS | |
| H7 | narrow the sh cluster regex to `/^-c$/` (control) | REDDENS | |

Three survivors, all non-equivalent — each provably moves a real command's verdict — and all three
green across all 23 tests.

- **`SH_FAMILY`** is a live set: it is what makes `bash -lc`, `sh -ec` and `zsh -euxc` re-enter as shell
  lines. It is **not a member of `GRAMMAR`**, so `grammarMembers()` never enumerates it and the sweep
  cannot reach it. `bash` and `sh` happen to be pinned by round 9's planted forms; `zsh` is pinned by
  nothing, and dropping it silently loses every `zsh -c` build.
- **`unquote` inside `namesACommand`** is a live rule with no probe, and it is also the mechanism behind
  `script -q -c "pnpm build" /dev/null` returning `none`: `namesACommand` unquotes and stops on `"pnpm`,
  then `command()` computes `stripExecutableExtension(first.split("/").pop())` on the raw token and gets
  `"pnpm`, which is in no set. One function unquotes and its consumer does not.
- **make's `optional` digit test** `/^\d+$/` is the entire behavioural difference between `optional`
  and `values`, and collapsing it to `!value.startsWith("-")` is invisible. Only `-j`'s *membership* in
  `optional` is pinned, by `make -j 4`; what `optional` *means* is not.

This is exactly the shape round 9 closed for `SCRIPT_EXTENSIONS`, `NAME_SEPARATORS` and `RULES`, and the
file's own docstring states the general rule it then did not apply:

> The sweep's reach is exactly this object, so anything that decides a verdict and is not here is
> unpinned by construction.

Round 9's repair added the three items round 9 happened to name. The class was not swept for. Three
members of it remain, found by the same method, one round later.

### B5 — the retracted-claims guard is laundered again, by one character and by a closing fence

Broken in each of rounds 5 through 9. Broken again. I planted each shape into
`.qfai/evidence/atdd-spec-0017.md`, ran `tests/assets/retractedClaims.test.ts`, and reverted in the same
step; the file is `7d7ddc3f…682f` before the first plant and `7d7ddc3f…682f` after the last.

    C1  CAUGHT     CONTROL: the claim as a plain paragraph
    L1  CAUGHT     the claim after a closing ``` fence, same paragraph (fails by exactly one character)
    L1b LAUNDERED  the claim after a closing ~~~ fence, same paragraph
    L1c CAUGHT     as L1 but with one word between the fence and the claim
    L2  LAUNDERED  one stray `"` on a BLOCKQUOTE line shifts every pairing after it
    L2b LAUNDERED  the same stray `"` on a FENCE line
    L2c CAUGHT     NEGATIVE CONTROL: the same stray `"` with no fence and no blockquote
    L3  LAUNDERED  the claim on a blockquote line (exempt by design)
    L4  CAUGHT     60 indented lines then a blockquote line then the claim
    L5  CAUGHT     60 trailing-space lines then a blockquote line then the claim

The claim used throughout was `P1d has returned REVISE three times`, a live `RETRACTED` entry.

**`L2` / `L2b` is the important one, and `L2c` is what makes it a finding rather than a guess.** This
round replaced the odd-parity alternate pairing with a *report*, on the stated ground that
"a stray quotation mark in a governance file is a defect to fix, not a licence to widen the guard". But
`quotedSpans` counts **every** mark in the flattened paragraph, while the odd-parity report skips marks
inside `shownSpans`:

    if (exempt.some(([start, end]) => index >= start && index < end)) continue;

So a paragraph shaped like

    > an aside carrying one " mark
    P1d has returned REVISE three times and that is why the row waits. See "the aside" above.

has three marks. `quotedSpans` pairs mark 0 with mark 1, producing a span that runs from the blockquote
line to the real quotation and swallows the assertion between them. The odd-parity report counts two,
because the blockquote mark is exempt, and reports nothing. `L2c` removes the blockquote line and the
identical stray mark is caught — which localises the hole precisely to the exemption the report was
built to be independent of. **The replacement for the one-character laundering route has a
one-character laundering route in the same place.**

**`L1b` is the fence-scoping half.** `shownSpans` resets `inFence = false` at every paragraph, and
paragraphs split on blank lines, so a fence containing a blank line puts its *closing* delimiter at the
head of a new paragraph — where it is read as an *opening* one, and every line after it in that
paragraph becomes exempt:

    ~~~text
    sample one

    sample two
    ~~~
    P1d has returned REVISE three times and that is why the row waits.

That renders as a code block followed by an ordinary prose paragraph asserting the claim. `L1` is the
same structure with ``` instead of `~~~` and it survives only because `flattenings` strips backticks, so
the fence line flattens to the empty string and the `[start - 1, end]` shift lands the span start exactly
on the claim's index, where `start < index` is strict. `L1c` shows how fragile that is: put one word
between and the arithmetic changes. Round 9's finding was "12.5% of the governance corpus was already
exempt, and putting one blockquote line under a reasserted claim laundered it". Narrowing
paragraph-wholesale to line-scoped moved the boundary; it did not close the route.

For completeness: `L4` / `L5` were my attempt at a third route through the offset arithmetic in
`shownSpans`, which double-counts a space for every indented or trailing-whitespace line (a paragraph's
true flattening collapses newline-plus-indent to one space; `shownSpans` accumulates
`flat.length + 1` per line). The drift is real but does not reach far enough to matter here. Recorded so
the next round does not have to re-derive it.

### B6 — `### Findings per round` omits round 9 entirely, while claiming to be counted from the packs on disk

The section opens:

> Every count below is **derived**: distinct finding identifiers appearing as a heading in the report,
> counted from the packs on disk.

The table's last data row is round 8. Measured:

    findings-table rounds present: 1 2 3 4 5 6 7 8      (25 data rows)
    round 9's pack on disk:
      R01_implementation-reviewer.md   25 identifier headings
      R02_completion-reviewer.md       22
      R03_qa-gatekeeper.md             17
    round 9's summary.json: 25 / 22 / 17

Three reports, on disk, sealed, with 64 findings between them — and no row. The `## Final status` table
seventy lines below *does* carry round 9, and the prose at `atdd-spec-0017.md:1397` discusses round 9's
`implementation-reviewer` and says "Its 25 findings are applied all the same". So the record knows the
round happened and the one section whose stated method is "counted from the packs on disk" did not
count it.

This is the "a round behind" defect the same file says rounds 4, 5, 6 and 7 each reported, in the
section that was rewritten this round to explain its own derivation rule. Nothing derives it:
`stageEvidenceCounts.test.ts` pins pack *names* and *seals* and six *file* counts, and reads no row of
this table.

### B7 — the "FOUR places" measurement block is the pre-v12 state, and the file's own pinned set refutes it

`atdd-spec-0017.md:741-746`:

    this repository reaches a build in FOUR places, not the two previously asserted
      build      ci.yml       pnpm -C packages/qfai build                    direct
      build      release.yml  pnpm -C packages/qfai pack --pack-destination  via prepack -> build -> tsup
      heuristic  ci.yml       pnpm ci:build-verify                           spawn inside a .mjs
      heuristic  release.yml  pnpm ci:gate                                   spawn inside the same .mjs

`tests/unit/buildCommand.test.ts:1396-1407` pins, and passes green at HEAD:

    "build::ci.yml::pnpm -C packages/qfai build",
    "build::ci.yml::pnpm check-types",
    'build::release.yml::pnpm -C packages/qfai pack --pack-destination "$PWD/tmp"',
    "build::release.yml::pnpm ci:gate",
    "heuristic::ci.yml::pnpm ci:build-verify",

**Five commands, not four.** `pnpm check-types` is absent from the record's block entirely, and
`pnpm ci:gate` is labelled `heuristic` where the test pins it as `build`. Both differences are caused by
this round's own change 3 — "`tsc -b` is a build" — described three paragraphs above the block. The
sentence at `:753` ("the other two would land on `none` if nothing else in their line said build") is
stale for the same reason. And the paragraph closes by saying the set is "pinned as a set in the unit
test so a build in a new place fails rather than being absorbed by a count" — which is true of the test
and is the thing that refutes the block above it.

`stageEvidenceCounts.test.ts`'s `RECORDED` regex only matches `vitest run … -> Tests N passed`, so this
block is outside every derived check in the stage.

### B8 — "ten corpora" and "nine corpora", in the same file, against an eleven-item enumeration

    :247   `packages/qfai/tests/unit/buildCommand.test.ts` — 23 tests over the **ten** corpora
    :732   Measured against **nine** corpora, and this is the enumeration both evidence files count from

The `:732` sentence claims to be authoritative for both evidence files, and `:247` disagrees with it.
Counting the enumeration at `:733-738` gives **eleven** comma-separated items (round 4's 20
regressions; v4's 15 kept forms; round 6's 46-case corpus; round 7's 59 probes; round 8's 66; round 8's
11 planted builds and 6 wrapper forms; round 9's 60 planted builds; its five spelling pairs; the
accumulated non-builds; one case per grammar member; every `run:` line in both workflow trees). So
neither number matches the list, and nothing pins either. The `23 tests` in the same sentence at `:247`
**is** pinned and **is** correct — which is what makes the neighbouring number's staleness easy to miss.

### B9 — P7's currency sentence is wrong about its own currency, for the third time

`atdd-spec-0017.md:1089-1091`: "**These numbers are measured at the working tree of this commit** …
the sequence below reaches `30a0ae5a` and **the two commits after it** add one e2e callsite between
them."

    $ git log --oneline 30a0ae5a..HEAD
    a66be5c6 docs(review): open round 10 with the request committed before any reviewer launches
    a163b52a docs(review): seal round 9, and catch the untracked pack the same way round 8's was found
    3a466b27 test(classifier): pin members by commands their tools accept, and one number, one place
    70c50a9c docs(evidence): stop citing the sweep for a property it does not measure
    d4ea336c fix(classifier): one command, one verdict across its spellings too

**Five, not two.** One of the five (`3a466b27`) is a change to the classifier's test file. The block's
own headline is "Re-run after the last artifact changed, twice, because this block was wrong about its
own currency both times"; this is the third.

**The numbers themselves are right, and I verified all of them at HEAD:**

    pnpm -C packages/qfai test:e2e                 -> 1434 passed | 16 skipped, exit 0   MATCHES
    vitest --project integration --project unit    -> 1200 passed | 19 skipped, exit 0   MATCHES
    validate --profile atdd --spec 0017            -> info=2 warning=0 error=2, exit 1   MATCHES
    validate --profile full                        -> error=4, exit 1                    MATCHES
    ci:lint members counted from package.json      -> 11                                 MATCHES
    tracked validate.spec-0017.json vs fresh run   -> deep-equal                         MATCHES

So the defect is confined to the sentence that certifies the numbers' currency — which is the one part
of the block a reader has to take on trust.

## The observation gate

**Nothing to adjudicate, and that is the correct state.** The ledger at
`.qfai/specs/spec-0017/tdd/test-list.md` holds 71 `Integration` and 11 `Unit` rows and **no `E2E` or
`API` row at all**, so no ATDD-owned row's RED provenance is in scope. Verified against the file:

    line 107  TDD-0069  todo  DR-ID: -  Blocked-By: -
    line 108  TDD-0070  todo  DR-ID: -  Blocked-By: -
    statuses  74 refactor, 6 blocked, 2 todo

The record's `## Ledger rows advanced` says "None advanced … Neither ledger cell has been written, and
this table is the handover, not the ledger", cites `tdd/test-list.md:107-108`, and states the `DR-ID`
and `Blocked-By` values as `-`. **All of that is exactly true**, including the line numbers. No RED or
GREEN observation was produced this round, so there is none to accept or refuse, and none was claimed.

`TDD-0069` is `blocked` on `CR-20260820-0012` and takes no RED-provenance branch. `TDD-0070` is branch 3
on `DR-0017-0010`, and **P1d ruled on it and passed it at round 7, pass 6, `9a37421c`**. Per the brief
that gate is closed; I have not re-opened it and this report does not re-decide it.

One observation, recorded because my role's brief makes the `Oracle strength` check mine at a GREEN or
completion gate: the three refuted sentences in `TDD-0069`'s `Evidence` cell — "NOT BLOCKED by a CR",
"the workflow changes are unmerged", "becomes implementable once the pull request has three green
ci-pass runs to cite" — are all still present in `tdd/test-list.md:107`. That is **disclosed** by the
record (`### What the writer must change in the same edit`) and `retractedClaims.test.ts` excludes the
file deliberately, because it belongs to `/qfai-implement` under the Drift Protocol. I am not raising it
against this stage; I am noting that the retracted-claim property does not hold repository-wide, and
that the handover instruction is the only thing carrying it. Recorded as `A6`.

## Advisories

### A1 — the retracted-claims guard's own docstring carries a stale claim

`retractedClaims.test.ts:230-235` says:

> Two entries left this list in round 8: the W-family record in `## Execution logs` now quotes both, so
> they are live-and-quoted rather than absent. The second assertion below is what noticed — writing that
> record made a retired declaration false in the same commit.

Measured across all five governance files:

    "P1d has run three times"                     0 occurrences
    "transition itself is still owed a P1d PASS"  0 occurrences
    "no filters"                                  0 occurrences

All three are in `RETIRED` at HEAD, and the suite passes precisely because none of them appears
anywhere. So the note describes a state two rounds gone. It is a stale prose claim inside the
instrument built to stop stale prose claims — and `GOVERNANCE` does not include the test files, so this
guard structurally cannot see its own docstring.

### A2 — derived numbers restated in a second file where nothing pins them

Two numbers are derived in one file and retyped in another, and only the derived copy is checked:

- the `Totals by ...Status...` line (✅ 3 / ⚠️ 1 / ❌ 5) at `coverage-depth-spec-0017.md:57` is read by
  `coverageDepthMatrix.test.ts`. The same figure is restated at `atdd-spec-0017.md:585` and is read by
  nothing (the test's regex requires a space after the colon; the copy has a newline, and the test only
  opens `MATRIX` anyway). "and 38 depth cells" at `:593` is the same shape.
- the sentence naming the predicate version and its file appears at
  `coverage-depth-spec-0017.md:251`, where the version pin reads it, **and** at
  `atdd-spec-0017.md:724`, where nothing does. Both currently say `v12`; only one of them is prevented
  from drifting.

### A3 — `## Final status`'s counts are correct and underived, and expire when this round closes

I checked them mechanically:

    R0*.md across review-20260820200000000 .. review-20260821120000000  =  26
    rounds with responses                                              =   9
    verdicts: 25 REVISE + 1 PASS (P1d pass 6)                          =  26

**Correct.** But no test derives them — `stageEvidenceCounts.test.ts` derives pack names and seals, six
file counts, the annotated-describe count and the ledger guard's output, and none of these three. And
they become wrong the moment round 10's reports land: "nine rounds / 26 responses" is a figure whose
correctness has a lifetime of one round. That is the same class as `B6` and `B9`, caught before it fired
rather than after.

While measuring this I found a **concurrent** `R01_implementation-reviewer.md` in this round's pack
(untracked; `.gitignore:61` ignores `.qfai/review/*`). It was not there when I started. HEAD did not
move — `a66be5c6` at start and finish — so this is a sibling reviewer writing, not the tree moving, and
it did not reach my shadow root. Recorded so the seal event does not read it as drift. Note also that
this round's pack correctly declares `Review pack seal: IN FLIGHT`, so my writing this file does not
redden the seal check.

### A4 — the `US-0017-0004` row scans one workflow, the story is about the set

Measured as `S1` in `B2`: a real build in `qfai-validate.yml` is missed by the `US-0017-0004` row, which
calls `jobs()` on `ORCHESTRATOR` only, and caught by the shipped-tree scan in
`tests/unit/buildCommand.test.ts`. The gap is covered; the row's own scope is narrower than the story it
is annotated for, and a reader of the annotation would not know that.

### A5 — the version pin compares two hand-typed numbers

`VERSION = 12` is exported and the matrix's sentence is checked against it, which closes round 7's
literal-pin defect and round 9's discussed-a-future-version defect. But `VERSION` is not derived from
anything: no part of the grammar contributes to it, and nothing fails if the grammar changes and the
constant does not. The pin has moved the number from two hand-maintained places to one, which is a real
improvement and is not derivation. Recorded because the request asked whether "the version pin reads an
exported constant" is a fix; it is a narrowing.

### A6 — the refuted `Evidence` text stands in `tdd/test-list.md`

See § "The observation gate". Disclosed, correctly out of this stage's reach, carried only by prose.

### A7 — three hardcoded file lists in `stageEvidenceCounts.test.ts` are maintained independently

`CLAIMS` (7 entries over 6 files), `OWED` (6) and `COUNTED` (6) currently name the same six files. They
are separate literals with no assertion tying them together, so a file added to `CLAIMS` without being
added to `COUNTED` would have its count checked while its `.each` / `.for` precondition went
unchecked — which is the exact pairing the `.each` test exists to maintain. No live defect; a seam.

## What I ran, so a negative result would have been checkable

Recorded because the request asked for the method whether or not it found anything.

| harness | what it did | scratch |
| --- | --- | --- |
| plant sweep | 50 forms, one at a time, into the orchestrator's `unit` placeholder as a block scalar under `run:`; `runInit` + the `US-0017-0004` row per form; revert from the original bytes and re-hash each time | `tmp/r10-qa/plant.mjs`, `forms.all.txt`, `results.json` |
| pair probe | corpus form vs realistic extension, with and without this repository's manifests, via Node type-stripping against the helper directly | `tmp/r10-qa/probe2.mjs` |
| grammar mutation sweep | 8 source mutations, full 23-test corpus each, revert + sha256 each | `tmp/r10-qa/mutate.mjs`, `witness.mjs` |
| deletion counter-example | restore `MANAGER_PASS.--`, measure four commands and the corpus | `tmp/r10-qa/dashdash.mjs`, `why.mjs` |
| laundering harness | 10 planting shapes into the evidence file, `retractedClaims.test.ts` each, revert + sha256 | `tmp/r10-qa/launder.mjs`, `launder2.mjs` |
| scope probe | `uses:`-borne build and sibling-workflow build against both instruments | `tmp/r10-qa/scope.mjs` |
| validate | `git archive HEAD` -> `tmp/r10-qa/shadow`, 83 symlinks re-materialised relative, `--root` at the shadow | `tmp/r10-qa/validate-atdd.txt`, `validate-full.txt` |

**Forms I tried that were CAUGHT**, so the corpus is not blind to everything new — these are the six
controls and they are the reason the 44 mean something: `pnpm build` (`heuristic`), `npx tsup`,
`mvn package`, `make`, `./gradlew assembleRelease`, `docker buildx bake -f docker-bake.hcl`.

**Attacks that did not land**, recorded so they are not re-tried:

- neutralising the manager `laterBare` rule in either direction reddens the corpus (`H5`, `H6`) — the
  rule is probed, just wrong;
- narrowing the sh cluster regex to `/^-c$/` reddens (`H7`);
- emptying `SH_FAMILY`, or dropping `bash` or `sh` from it, reddens (`H2`, `H3`) — only `zsh` is free;
- the `shownSpans` offset drift from indented and trailing-whitespace lines is real but too small to
  reach a claim (`L4`, `L5`);
- the closing-``` fence route fails by exactly one character (`L1`), and by more than that once a word
  intervenes (`L1c`); only `~~~` works (`L1b`);
- a stray quotation mark with no fence or blockquote around it is caught (`L2c`);
- `TOOL_LISTS` and `INTERPRETER_LISTS` are complete against `ToolGrammar` and `InterpreterGrammar`; the
  sweep's alias canonicalisation by object identity is sound and its restore is exact (the
  `grammarMembers().length === MEMBER_CASES.length` assertion holds);
- the pack seal, `blobHash` LF normalisation, `countCases`, the annotated-describe count and the ledger
  guard's `8 claim(s) backed` all reproduce; the `coverageDepthMatrix` partition, class properties,
  prose properties and body phrases all hold; `1315` assets tests across 64 files pass.

## Required to clear this gate

1. **`B1` / `B2`.** The `US-0017-0004` oracle admits 44 of 50 real builds and an entire delivery channel.
   Whatever is done about the predicate, the corpus has to stop being this stage's — the three rounds of
   evidence now say that a corpus written from the previous round's misses fits those misses and nothing
   else. `B2` is separable and cheap: neither instrument reads `uses:` or `with:`.
2. **`B3`.** Either produce, for each of the eight deletions, a command of the deleted member's shape and
   show its verdict unchanged — or restore the members. "No probe distinguishes it" is not the same
   claim as "no command distinguishes it", and `MANAGER_PASS.--` is a worked counter-example.
3. **`B4`.** `SH_FAMILY`, the `unquote` call in `namesACommand` and make's `optional` digit test decide
   verdicts and are not in `GRAMMAR`. Either export them or state, in the docstring, the class of
   decisions the sweep is known not to reach.
4. **`B5`.** The stray-mark route (`L2` / `L2b`) and the `~~~` closing-fence route (`L1b`).
5. **`B6` - `B9`.** Four prose counts the tree does not hold: round 9 missing from the derived findings
   table, the pre-v12 "FOUR places" block against the file's own pinned five, ten-vs-nine corpora, and
   "the two commits after it" against five.

## Sign-off

- [x] Review verdict is explicit — **REVISE**.
- [x] Findings cite concrete artifacts, line numbers, commands and measured outputs; every mutation
      reverted in the same step with a byte comparison printed.
- [x] Required gates and residual risks recorded. Hard gates: scoped `error=2`, unscoped `error=4`, both
      reproduced and both as recorded — the validate gate has not passed. Runtime proof: reproduced
      exactly. Coverage Depth Matrix: present, committed, pinned, every `❌` justified; its
      `US-0017-0004` oracle claim is falsified by `B1`. RED/GREEN observation gate: nothing open, and
      **P1d remains closed on `DR-0017-0010` — not re-opened, not re-decided.**

**Count: 9 blocking (`B1`-`B9`), 7 advisory (`A1`-`A7`), 16 total.** Every one is a heading; none is
enumerated inline.

- `git rev-parse --short HEAD` at finish: `a66be5c6`
- `git status --porcelain` at finish: empty
- `.qfai/report/` sha256: `7a8d8f4a6a3f97d1899fc7383a466a9bf110741e622f3fb7d28d818fc696d538`, unchanged
