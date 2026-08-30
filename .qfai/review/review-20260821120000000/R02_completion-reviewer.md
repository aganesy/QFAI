# R02 — completion-reviewer, round 9

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 9 — **stage gates only**; P1d closed at round 7 and I did not
  re-decide it
- **Reviewed revision: `05a97202`.** `git rev-parse --short HEAD` was `05a97202` at start and at
  finish; `git status --porcelain` was **empty** at both. HEAD did not move. (My run was interrupted
  by a spend limit and resumed; I re-confirmed both at the resume point before writing anything.)
- **Audited evidence hash (stage review):
  `sha256:98a239cc1929242b31bc21fc01341c95396ad8ad47836b955e1165353b34a7ef`** — the four steps of
  `constitution/shared-skill-delegation-baseline.md#reviewer-response-template`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status`
  (`74a58d852e9e4f86dfb5ce0eb3bc96bdfbea10d838f570f8b68aac2328fbceb1`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`7e592e9cd778b343e78391d1cc923cea5f709c3235a5042cba2ebf5fc4f77fa4`), serialized as
  `path + NUL + sha256` sorted by path, hashed. `## Final status` is at `:1277` and no `##` heading
  follows it, so truncating and excising are byte-identical.
- Authored/edited under review: **none.**
- **Independence.** Two other reports had landed in this pack when I resumed. I did **not** open
  either one before forming and writing every finding below. Any agreement with them is independent.
- **No tracked file was mutated.** Round 8 declared the classifier's behavioural corpus `PENDING`
  because a probe under `tmp/` could not resolve `vitest`. It does not need to: Node 24 imports the
  TypeScript helper directly, so `tests/helpers/buildCommand.ts` was executed **in process** from
  `tmp/r9/`, and the deletion sweep was replicated by mutating the exported `GRAMMAR` **in memory**.
  The retracted-claims exploit was demonstrated against **copies** under `tmp/r9/exempt/`, with the
  tracked evidence file's sha256 printed before and after (`b41ec959d44ce576c54d1f41b5a7ed9d…` both
  times, identical) and `git status --porcelain` empty after. The shipped-lane plant ran against a
  copy in `tmp/r9/plant/`; `git diff --stat` for
  `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` is empty. Nothing was planted in a
  tracked file, so there was nothing to revert.
- `validate` ran twice against a `git archive HEAD` shadow root at `tmp/r9/shadow` with all **83**
  tracked symlinks re-materialised as **relative-target** symlinks (`created=83 failed=0`;
  `checked=83 matched=83 mismatched=0` against `git cat-file blob`). `MSYS=winsymlinks:nativestrict`
  was required — plain `ln -s` in Git Bash silently **copies**, which my first attempt did and the
  target check caught. Both run-logs landed inside the shadow; the tracked
  `.qfai/report/validate.log` is `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` before and after, equal to
  `git rev-parse HEAD:.qfai/report/validate.log`.
- **No shadow artifact.** Relative-target symlinks produced **0** `QFAI-LINK-001`. Every count below
  is raw.
- Scratch under `tmp/r9/` only. No `git checkout` / `stash` / `reset`, no commit, no push.

## Verdict summary

| # | finding | severity |
| --- | --- | --- |
| `B1` | I planted twenty real builds in the shipped lane and **eighteen shipped unnoticed** — round 8's defect at nearly twice the scale. For **eleven of the thirty declared tools** the pinning case is a command the tool does not have, while its canonical build is invisible | blocking |
| `B2` | `## Final status` certifies **seven** rounds / **21** responses / **20 REVISE** where the tree holds **eight** / **23** / **22**; its own findings table enumerates 23 and its own pack list says nine. No instrument derives it | blocking |
| `B3` | the grammar-member count is **208** in five places and is **250**. 208 is the *ledger-claim* count recorded three lines from one of them | blocking |
| `B4` | the P7 currency claim is false: `f544daad` postdates `eb5d59af`, changes five helper/test files and **adds a callsite**; the sequence stops four commits short of HEAD; and the integration+unit total is recorded 1196 against a measured **1197** | blocking |
| `B5` | `retractedClaims.test.ts`: the new fence exemption is exploitable in **two lines of markdown**, demonstrated, with a one-function fix I verified keeps the tree green | blocking |
| `B6` | the `## Final status` mutation tally names `X7`/`X8`/`X9` — identifiers that exist **nowhere** — miscounts the renamed `Q1`-`Q7` family as "four (`X6`-`X9`)", and omits `W1`-`W9` and the 250-member sweep entirely. Round 7 `M1`, round 8 `M2`, **third round** | blocking |
| `M1` | the committed Validate Hard Gate artifact **does not reproduce from HEAD** (`matchedFileCount` 465 vs 467; no revision on this branch holds 465) | advisory |
| `M2` | "one command, one verdict" — asserted twice in the file — is violated four ways by *spelling*: `docker-compose`, `cross-env`, `gmake`, `py -m` | advisory |
| `M3` | `:1347` "each sealed when its last reviewer response landed" is refuted by the record's own table 64 lines below (4 of 7 late) | advisory |
| `M4` | "**eight** corpora" is not derivable: the file holds **twelve** named corpora, and the two evidence files' enumerations have **nine** items each and are **different lists** | advisory |
| `M5` | the helper and its test say "**Ten** versions" / "ten versions" while the helper is **v11**; the anchored pin cannot see it, because it takes the maximum | advisory |
| `M6` | the Delta Rejected Guard clears "a row that cannot fail looks like coverage" on the strength of the member sweep, which measures a different property from the one at risk | advisory |
| `m1`-`m10` | see MINOR | advisory |

**Two things changed that eight rounds could not, and both deserve saying first.** The **deletion
sweep is real** — I replicated it in process over all 250 members and 0 survived, and I went further
than the test does and checked that each member's **own** case notices its own deletion: 0 failures
there too. And the **seals are now a function of the repository**: all eight recompute LF-normalised,
round 8's `B1` is properly closed, and round 8's pack is in version control. The blocking set below
is about the classifier's *grammar* rather than its pinning, and about six numbers the record states
that the tree does not hold.

---

## What I re-derived and could not fault

Ran, in the working tree unless noted:

1. **`test:e2e`: 1433 passed / 16 skipped, 84 files, exit 0** — `:1065` exactly.
2. **`ci:lint` exit 0 with eleven members**, counted from the root `package.json` chain
   (`format:check`, `lint`, `lint:md`, `check-bidi`, `check-instructions-size`,
   `check-review-profile-consistency`, `check-prompt-scanner-pair`, `check-workflow-hygiene`,
   `lint:shipping`, `lint:workflow-shape`, `check-pack-locations`). `check-types` exit 0.
3. **The scoped gate, in the shadow root: `info=2 warning=0 error=2`, exit 1**, membership exactly as
   recorded — `QFAI-ATDD-111` = 1 US (`US-0017-0007`), `QFAI-ATDD-112` = 8 TCs (`0016`, `0030`,
   `0032`-`0035`, `0069`, `0070`).
4. **`--profile full`: `info=4 warning=404 error=4`, exit 1**, all four members identified:
   `QFAI-ATDD-111` **12 US across five specs** (0003 x8, 0006 x1, 0008 x1, 0015 x1, 0017 x1),
   `QFAI-ATDD-112` **15 TCs across four** (0003 x1, 0008 x4, 0015 x2, 0017 x8 — "this spec owns 1 and
   8" exact), and `QFAI-REVIEW-004` / `-005` naming `review-20260821120000000`, this round's own
   in-flight pack.
5. **The ledger guard**: 8 claims backed, exit 0.
6. **All eight pack seals recompute**, LF-normalised, with the record's own serialization
   (blob hash, single space, pack-relative path, LF; `LC_ALL=C` order; sha256 over the stream):
   `5c8cd425`, `305ffd65`, `257e793b`, `aaa2d2a6`, `5798d557`, `d99dff9c`, **`022c3add`**,
   **`d2ef7d5c`**. The two written this round both reproduce. Round 7's pack is the **only** one where
   the LF and raw-byte seals differ (`022c3add` vs `aa07e395`) and its `R03` still holds **423 CRLF**
   on disk — so round 8's `B1` is closed the durable way: `blobHash` normalises, and the recorded
   value is what every checkout computes. I ran the CRLF census over all **40** pack files; exactly
   one is affected.
7. **Round 7's `summary.json` P1d slot is corrected to 8** (round 8 `M1`), and **round 8's pack is in
   version control** — all nine atdd packs are disk-equals-tracked file for file
   (4 / 6 / 5 / 5 / 5 / 5 / 5 / 4 / 1).
8. **The deletion sweep is sound, and stronger than it claims.** In-process over the exported
   `GRAMMAR`: 250 members, 250 hardcoded cases, unnamed members none, cases-naming-nothing none,
   baseline failures 0, **undetected none**. And every member's own case notices its own deletion — 0
   exceptions — which the test does not assert (it accepts any case noticing) and which is the
   stronger property.
9. **The e2e half of the P7 sequence reproduces at every revision, including past its last row.**
   Callsites under the project's two globs: `3f815725` 858, `c40b2358` 861, `cb91e089` 864,
   `ac4700d1` 867, `9882a1d4` 868, `dbe00247` 868, `eb5d59af` 869, `96c89ae3` 869 — and `b016623b`,
   `aab29486`, `f544daad`, `05a97202` all **869**. So 1422 plus (869 minus 858) = **1433**, which is
   what I measured, and the stated invariant at `:1109-1111` holds for that leg. Round 8's `B4.1` is
   closed. See `B4` for the other leg.
10. **The ledger, parsed mechanically** (82 data rows of 9 cells; the two legend rows excluded):
    **71 `Integration` plus 11 `Unit` = 82**; **74 `refactor`, 6 `blocked`, 2 `todo`**; `Integration`
    cross-tab **63 / 6 / 2**. `:107` and `:108` are `TDD-0069` and `TDD-0070`, both `Status = todo`,
    `DR-ID = -`, `Blocked-By = -`, and both `Evidence` cells still open with "NOT BLOCKED by a CR".
    **Nothing has been written ahead of the gate**, and `## Ledger rows advanced` says so correctly.
11. **The matrix.** ✅ 3 / ⚠️ 1 / ❌ 5 from the table's own `Status` column; **38** failing depth
    cells over 7 by 9 = 63 (12 pass, 13 warn), plus 5 in `Status`; per-row failing counts
    3, 1, 2, 6, 6, 6, 7, 5, 2 = 38; partition **A 30 / B 7 / C 1 = 38**, complete and disjoint; nine
    rows, all nine cells wide. Every figure exact.
12. **Every per-file test count and every recorded vitest output.** `checkAtddAnnotationLedger` 22,
    `buildCommand` 20, `coverageDepthMatrix` 5, `stageEvidenceCounts` 7, `retractedClaims` 7, E2E 9,
    and **8** annotated describes — matching `:146`, `:222`, `:233`, `:239`, `:242`, `:245` and the
    recorded outputs at `:257` through `:279`. `stageEvidenceCounts.test.ts` is now in `OWED` and its
    run is recorded (round 8 `M7`, first half), and `.for` joins `.each` in the precondition.
13. **The version pin is genuinely anchored** (round 8 `m12`): `coverageDepthMatrix.test.ts:339-360`
    requires a sentence of the form "vN lives in packages/qfai/tests/helpers/buildCommand.ts" and
    compares N to the helper's maximum. `:694` says `v11` and the helper's maximum is 11. See `M5`
    for what the maximum rule cannot see.
14. **Round 8's `B2` is applied and I verified it by needle, not by eye.** "sustained across three
    passes", "sustained four times running" and "re-route of P1d is owed" occur only inside
    quotations; "A fourth P1d re-route", "a fifth stage round are owed" and "still owed a P1d PASS"
    occur **nowhere**. `DR-0017-0010`'s `Status` line reads "PASS at P1d pass 6 (`9a37421c`) — five
    REVISE before it". A sixth-pass paragraph exists at `:1186`. Both conditions on the write are
    disclosed at `:536-539` and `:1191-1192`.
15. **`retractedClaims.test.ts`'s list is in its best state in four rounds.** Replicating
    `flattenings`, `quotedSpans`, `shownSpans` and `occurrences` over the five `GOVERNANCE` files:
    every one of the nineteen live entries matches at least once and **every occurrence is quoted**;
    the three `RETIRED` entries match nothing. The every-entry-matches assertion rounds 6, 7 and 8
    each required is now written (`:473-498`), and it is the assertion that would have caught round
    8's two dead needles. **On the question I was asked** — I re-probed every retraction my role
    established in rounds 3-8 and found exactly **one** still asserted unquoted, and it is in the DR,
    not the evidence (`m1`).
16. **The exempt-span widening is currently unexploited, which is not the same as unexploitable.**
    31 of 446 paragraphs are marked wholesale (7.8% of characters) and in all four cases I inspected
    the "prose" is fence *content*, not narrative. **Zero** paragraphs carry an odd number above one
    of quote marks, so the alternate-pairing branch is inert today. See `B5` and `m6`.
17. **Round 8's other repairs, each checked at its site**: `m1` `:357` now "Rounds 1 through 7";
    `m2` `:494` now points at a section that exists; `m3` `:1452` now "first six packs"; `m4` `:1023`
    now "two of them blocking"; `m5` `:1034` now 4 / 6 / 9 = 19; `m6` `:1315-1320` now carries the
    `FIRST_PACK` boundary and the 27 the bare glob gives; `m7` the seal-timing table exists at
    `:1411-1419`; `m8` `:1075` now "seven projects"; `m10` `:717-722` now names three helpers;
    `m11` and `m13` the `W1`-`W9` family is defined at `:887-897`; `m15` "NOT BLOCKED by a CR" is
    entry 18. `B3`'s v6 and v7 history lines are at `coverage-depth:204-214`; `B6`'s withdrawal is
    recorded at `:912-925` with both configuration facts. **Of round 8's 29, I could fault the
    application of three** — `M2` becomes my `B6`, `m9` becomes my `m1`, and `B4`'s currency half
    becomes my `B4`.
18. **The Delta Rejected Guard, run by me.** Nine rejected options read at source — the three
    `09_delta.md` Rejected candidates and the six `07_Decisions.md` "Decision, rejected alternative"
    bullets at `:133`, `:137`, `:203`, `:206`, `:242`, `:249`, against **nine** unique `DR-0017-*` in
    that file, which is the transposition `:33-36` records. **No rejected option is implemented by
    this round's changes and no RE-OPEN is required.** `buildCommand.ts` is not the rejected second
    parser of a spec artifact; no validator rule was added under `src/core/validators/**`; nothing was
    merged, waived or narrowed for `CR-20260820-0012`. See `M6` for the one clause whose *warrant* is
    wrong.
19. **`US-0017-0007` is uncovered by choice and its ledger line is gone** — a grep for
    `QFAI:SPEC-0017:US-0017-0007` in `tests/e2e/qfai-traceability.md` returns **0**.

---

## BLOCKING

### B1 — I planted twenty real builds in the shipped lane and eighteen shipped unnoticed; for eleven of the thirty declared tools the pinning case is a command the tool does not have

- **Artifacts**: `packages/qfai/tests/helpers/buildCommand.ts:45`, `:47-59`, `:117-192`, `:287-304`,
  `:500`; `packages/qfai/tests/unit/buildCommand.test.ts:146-397`, `:539-540`, `:806-810`, `:923-988`,
  `:1060-1070`; `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:412-431`;
  `.qfai/evidence/atdd-spec-0017.md:71-79`, `:660`, `:993-994`;
  `.qfai/evidence/coverage-depth-spec-0017.md:180-190`, `:254-258`
- **Contract**: `qfai-atdd/SKILL.md` Not-done criteria (Coverage Depth Matrix / oracle strength);
  Success Criteria `:282` (required `US` covered by E2E tests); the record's own recurring-class item
  7 at `:993-994`, which states in writing that for this assertion **a miss is the vacuity direction**
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:282` Success Criteria plus Not-done
  criteria / `defect:correctness`

**Method, and it is round 8's.** I copied the shipped orchestrator to `tmp/r9/plant/`, replaced the
`unit` lane's placeholder echo with a real build one form at a time, and ran the story's **own** loop
from `spec0017LayeredCiScaffoldE2E.test.ts:412-431` — parse the YAML, walk `jobs`, walk the steps'
`run` bodies, strip trailing comments, `classifyBuildCommand(command)` with no script map. The control
(the shipped tree unmodified) flags nothing, as it must.

```text
*** SHIPS UNNOTICED ***  mvn -B package
*** SHIPS UNNOTICED ***  gradle assemble
*** SHIPS UNNOTICED ***  dotnet publish -c Release
*** SHIPS UNNOTICED ***  sbt assembly
*** SHIPS UNNOTICED ***  make all
*** SHIPS UNNOTICED ***  make
*** SHIPS UNNOTICED ***  ninja
*** SHIPS UNNOTICED ***  go install ./cmd/...
*** SHIPS UNNOTICED ***  docker-compose build
*** SHIPS UNNOTICED ***  cross-env NODE_ENV=production pnpm build
*** SHIPS UNNOTICED ***  xvfb-run -a -s "-screen 0 1024x768x24" pnpm build
*** SHIPS UNNOTICED ***  yarn workspaces foreach -A run build
*** SHIPS UNNOTICED ***  tsc -p tsconfig.build.json
*** SHIPS UNNOTICED ***  python3 setup.py bdist_wheel
*** SHIPS UNNOTICED ***  rake
*** SHIPS UNNOTICED ***  meson compile -C builddir
*** SHIPS UNNOTICED ***  scons
*** SHIPS UNNOTICED ***  pnpm exec tsc -b
REDDENS                  pnpm build
REDDENS                  timeout 600 pnpm build

18 of 20 planted builds ship without the story noticing
```

Round 8 measured **10 of 11**. This is 18 of 20, and **fifteen of the eighteen are tools or wrappers
the grammar already declares**. They are not exotic: `mvn package`, `gradle assemble`,
`dotnet publish`, `make`, `ninja`, `sbt compile`, `go install` and `rake` are the canonical build
invocations of eight of the thirty entries in `TOOLS`.

**The mechanism is one level up from v9's.** v9 gave each tool its own *flag* grammar. No version has
given any tool its own *subcommand* grammar: `command()` recognises a tool's build only when a bare
token splits to contain the literal word "build" (`:500`, via `namesABuild`). So the grammar knows
thirty build tools and recognises the build verb of nineteen of them.

**And the corpus cannot see it, because the corpus was written from the member list.** Eleven of the
thirty `TOOLS.NAME` cases use the template "TOOL build", and for these eleven that command is either
not the tool's build or not a command at all:

```text
tool      MEMBER_CASES entry      the real build            v11 verdict on the real build
mvn       "mvn build"     build   mvn package               none   ("mvn build" is not a Maven phase)
sbt       "sbt build"     build   sbt compile / assembly    none   ("sbt build" is not an sbt task)
cmake     "cmake build"   build   cmake --build .           none   ("cmake build" CONFIGURES ./build)
dotnet    "dotnet build"  build   dotnet publish            none
gradle    "gradle build"  build   gradle assemble           none
gradlew   "gradlew build" build   gradlew assembleRelease   none
make      "make build"    build   make / make all           none
ninja     "ninja build"   build   ninja                     none
rake      "rake build"    build   rake                      none
just      "just build"    build   just                      none
task, waf "TOOL build"    build   task / waf                none
```

`cmake build` is the sharpest: the case asserts `build` for a command that in reality names `./build`
as the *source* directory, which is the exact confusion `cmake --install build` exists in the corpus
to prevent, inverted.

**This is the recurring class, at the level of the corpus rather than the code.** Round 8's finding
was that the member test *generated* its probes from the sets it pinned. The repair hardcoded them —
and `:806-810` claims the hardcoding is what makes them "literals that outlive the member". They do.
But they were still **chosen by reading the member name**, so 250 cases assert what the grammar does
and none asserts what a tool does. That is item 7 of `:974-994` — a claim asserted over how something
is written rather than over what it does — with the instrument one layer out.

**Two of the eighteen falsify the corpus's own stated rule.** `buildCommand.test.ts:539-540` writes
the rule down: `msbuild` "was named as missed by round 3 and dropped from the corpus a round later,
which is corpus selection by outcome. **It stays in this list now whether it passes or not.**"
`tsc -p tsconfig.build.json` is recorded as REDDENS in the `E4b` block at `atdd:660`, is a real build,
returns `none` under v11 — and appears in **no** current corpus. It was dropped, exactly as `msbuild`
was, under a rule written to forbid that.

**And the wrapper the round added misses its own canonical form.** The invocation
`xvfb-run -a -s "-screen 0 1024x768x24" pnpm build` is the textbook one. `-s` is in the wrapper's
`values`, so `stripPrefix:383-385` advances by two unconditionally, swallowing the quoted `-screen`;
then `0` is a bare token with `args` already spent, so the loop breaks and the command becomes
`0 1024x768x24 pnpm build`, which is `none`. The `MEMBER_CASES` entry is
`xvfb-run -s screen pnpm build`, a single-token value that does not occur in practice. The other nine
wrapper flag cases share that shape.

**Required fix.** I am **not** asking for twenty-five new tools — that would be a product obligation
upstream never asked for. Do one of these two, and say which:

1. **Give the tools that have one a `builds` list** — the field already exists and `docker` and
   `podman` use it for `bake` — so `mvn.builds` gets `package` and `install`, `gradle.builds` gets
   `assemble`, `dotnet.builds` gets `publish`, `sbt.builds` gets `compile` and `assembly`, and the
   default-target case is handled (`make`, `ninja`, `rake` invoked with no bare token). Add each
   planted form above as a case, `tsc -p tsconfig.build.json` included, per the file's own `msbuild`
   rule.
2. **Or state the limit where the completion gate reads it**: that the predicate recognises a tool's
   build only when a token contains the word "build"; that for eleven of thirty declared tools the
   canonical invocation therefore returns `none`; and that this is the **vacuity** direction for
   `US-0017-0004` — then score `Oracle strength` accordingly rather than reasserting that the corpora
   establish the property.

Either way, delete or requalify the eleven "TOOL build" cases whose command the tool does not have,
fix the `xvfb-run` value handling, and verify with the plant rather than by reading.

### B2 — `## Final status` certifies seven rounds, 21 responses and 20 REVISE where the tree holds eight, 23 and 22; the record's own findings table and pack list both contradict it

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1311-1320`, `:1322-1330`, `:1347`, `:1213-1239`,
  `:1389-1390`; `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:332-384`;
  `packages/qfai/tests/assets/retractedClaims.test.ts:169-192`
- **Contract**: `qfai-atdd/SKILL.md:298` (check that the status section says what that pack says);
  Evidence (MANDATORY); rounds 4, 5, 6 and 7 each raised this line
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:298` / `defect:correctness`

Counted from the packs on disk, from `FIRST_PACK` onwards:

```text
review-20260820200000000  2      review-20260821060000000  3
review-20260820220000000  4      review-20260821080000000  3
review-20260821000000000  3      review-20260821100000000  2
review-20260821020000000  3      review-20260821120000000  0   (this pack, in flight)
review-20260821040000000  3
                                 8 rounds with responses, 23 responses
```

Reading each report's verdict line: **22 REVISE and one PASS**, the PASS being
`review-20260821080000000/R04_qa-gatekeeper-p1d.md`.

`:1311-1313` says "**seven** rounds, **21** reviewer responses, **20 REVISE and one PASS**". All three
are a round behind — and the record itself continues, in the same sentence: "Every earlier version of
this line was a round behind, which rounds 4, 5, 6 and 7 each said". **Fifth occurrence, inside the
sentence that names the pattern.**

**This is not merely staleness; it is a contradiction at HEAD.** Three sites in one section disagree:

| site | says | tree |
| --- | --- | --- |
| `:1312` | seven rounds, 21 responses, 20 REVISE | eight, 23, 22 |
| `:1213-1239` | 25 rows, **23** of them real responses, round-8 rows present | 23 — correct |
| `:1347` | "**Nine** packs, one per round" | 9 — correct |

So the findings table was carried forward to round 8 while the round table at `:1322-1330` (seven
rows, no round 8) and the "Confirmed by" sentence were not. Nine packs one-per-round and seven rounds
cannot both be true on any counting.

**Nothing derives it.** `stageEvidenceCounts.test.ts` derives per-file counts, annotated describes, the
guard output, the pack names and the pack seals — not the round, response or verdict counts.
`retractedClaims.test.ts` has one `COUNTED_CLAIMS` pattern and it matches only the "N packs, one per
round" shape. I confirmed by probe that "seven rounds", "21 reviewer responses" and "20 REVISE and one
PASS" are live and **unquoted**, so they would redden the guard if they were listed. They are not
listed, not derived, and wrong — the one load-bearing count in the section with no instrument behind
it.

**Required fix.** Correct `:1312` to eight / 23 / 22-plus-one-PASS; add a round-8 row to `:1322-1330`;
and put the count under an instrument — either a `COUNTED_CLAIMS` entry per figure, or three
assertions in `stageEvidenceCounts.test.ts` against `packsOnDisk()` and the report listing, which is
where `FIRST_PACK` already lives. Verify by grep after the edit.

### B3 — the grammar-member count is 208 in five places and is 250, and 208 is the ledger-claim count recorded in the same file

- **Artifacts**: `packages/qfai/tests/unit/buildCommand.test.ts:812-813`, `:847`;
  `packages/qfai/tests/helpers/buildCommand.ts:31`; `.qfai/evidence/atdd-spec-0017.md:77`;
  `.qfai/evidence/coverage-depth-spec-0017.md:224`, `:262`, `:266`; against
  `.qfai/evidence/atdd-spec-0017.md:215`, `:268`, `:803`, `:955`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs`); Evidence (MANDATORY); `:33-36`, which
  records the identical failure — a count transposed from elsewhere in the same file
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

Measured two independent ways — `grammarMembers()` replicated in process against the live `GRAMMAR`,
and a grep over the `MEMBER_CASES` literal:

```text
grammarMembers()          250
MEMBER_CASES (grep)       250
MEMBER_CASES (parsed)     250
```

The record says **208**, at five sites:

```text
buildCommand.test.ts:812   "a sweep deleting each of the 208 members one at a time reddens the corpus 208 times"
buildCommand.test.ts:813   "Before v10 dropped the forty-five unobservable members, 162 of 207 survived"
buildCommand.test.ts:847   "run against v9's grammar, 162 of 207 members survived"
buildCommand.ts:31         "for all 207 of them"
atdd:77                    "an in-suite sweep over all 208 grammar members"
coverage-depth:266         "it deletes each of the 208 remaining members in turn"
coverage-depth:224, :262   "45 of 207", "162 of 207"
```

**And 208 is a number the same evidence file states four times about something else entirely** —
`:215` "127 of the 208 claims in `tests/e2e/qfai-traceability.md`", plus `:268`, `:803` and `:955`.
The grammar-member figure has been set to the E2E-ledger-claim figure. `:33-36` records this exact
failure mode in this exact file: "The first version said nine, which was the file's `DR` count
transposed onto its rejected-alternative count; round 3 caught it."

The 207-to-162 arithmetic is separately suspect: 207 minus 45 is exactly 162, and the sentence claims
162 survived *a corpus* while 45 survived *every possible command*. Two different measurements cannot
be expected to differ by exactly the second one. I cannot check the v9 number — that grammar is gone —
so I report it as unverifiable rather than wrong.

**The number is trivially derivable and nothing derives it**, in the one file whose whole subject is
deriving numbers. **Required fix.** Replace all five with 250, or delete the numeral and let the
assertion carry it; and add one line to `stageEvidenceCounts.test.ts` pinning the member count stated
in the two evidence files against `GRAMMAR`, the way the pack numeral is already pinned.

### B4 — the P7 block's currency claim is false: `f544daad` postdates the certified revision, changes five helper/test files and adds a callsite, and the integration+unit total is wrong by one

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1055-1061`, `:1063-1072`, `:1088-1098`,
  `:1109-1112`; measured with `git grep -c` at `eb5d59af`, `96c89ae3`, `b016623b`, `aab29486`,
  `f544daad`, `05a97202` and with a live `--project integration --project unit` run
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Success Criteria `:294` (repository quality
  gates pass with evidence); round 3 `B4`, round 4, round 5 `B1`, round 7 `B4`, round 8 `B4`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

**Credit first: the e2e leg is right, and it is the first time in five rounds.** 1433 measured, 1433
implied, the per-commit sequence reproduces, and the invariant covers the four commits past its last
row. Round 8's `B4.1` is closed.

**Three defects, all in the sentence that certifies the block's currency.** `:1058-1060` reads:

```text
**These numbers are measured at `eb5d59af`**, the revision that carries every repair through round 8.
The commits after it change records only and add no test callsite, which the sequence below shows per
commit.
```

1. **`eb5d59af` is not the revision that carries every repair through round 8.** Four commits follow
   it, and `f544daad` — "fix(classifier): see the builds round 8 planted, and empty two more dead
   sets" — **is** round 8's `B4` repair, the largest code change of the round:

   ```text
   packages/qfai/tests/helpers/buildCommand.ts             147 +++--
   packages/qfai/tests/unit/buildCommand.test.ts           163 +++++-
   packages/qfai/tests/assets/retractedClaims.test.ts       79 ++++--
   packages/qfai/tests/assets/stageEvidenceCounts.test.ts   15 +--
   packages/qfai/tests/assets/coverageDepthMatrix.test.ts   13 +-
   ```

2. **"change records only and add no test callsite" is false on both clauses.** Five test and helper
   files are not records, and `buildCommand.test.ts` goes from **19** callsites at `eb5d59af` to **20**
   at `f544daad`. Measured, unit-plus-integration project callsites: 1158 at `eb5d59af`, `96c89ae3`,
   `b016623b` and `aab29486`; **1159** at `f544daad` and `05a97202`.

3. **So the second leg's total is wrong.** `:1066` records `1196 passed / 19 skipped, exit 0`.
   Measured at HEAD: **1197 passed / 19 skipped**, 171 files, exit 0 — off by exactly the callsite
   `f544daad` added.

4. **"which the sequence below shows per commit" is false.** The sequence at `:1088-1098` ends at
   `96c89ae3`. `b016623b`, `aab29486`, `f544daad` and `05a97202` have no rows, and one of them is the
   commit that changes the number.

**This is the third occurrence of one defect.** Round 3 found the block "written at `16f611c7` before
`21ea1ddc` landed +489/-76 across four files, so it certified three artifacts that postdated it".
Round 4 found the replacement stale the same way. The record narrates both at `:1055-1058` — and then
certifies a revision that four commits, one of them a 400-line code change, postdate.

**And the asymmetry is structural, not incidental.** The invariant at `:1109-1111` is written for the
**e2e project's two globs** only. The integration-plus-unit leg beside it has no invariant, no
per-commit sequence and no instrument — which is why it is the one that drifted while the guarded leg
held. A rule stated for one of two adjacent totals protects one of them.

**Required fix.** Re-measure both legs at HEAD and record `05a97202` beside them; correct `:1066` to
1197; extend the sequence to `05a97202` with the `f544daad` row shown as the plus-one; rewrite
`:1058-1060` so it names the revision the numbers were actually measured at and drops the false
"records only" clause; and extend the invariant at `:1109-1111` to the integration and unit globs, or
add a second sequence, so the unguarded total stops being the unguarded one.

### B5 — `retractedClaims.test.ts`: the new fence exemption launders a reasserted claim in two lines of markdown; demonstrated, with a verified one-function fix

- **Artifacts**: `packages/qfai/tests/assets/retractedClaims.test.ts:264-302`, `:309-330`, **`:371`**,
  `:353-388`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the file's own stated rule at `:8-9` — "a
  refuted claim may appear only as a quotation. A record may say: this said X, and X is wrong; it may
  not say X"
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The exempt-span work is the right *diagnosis* — round 8's `A4` showed three ways a correct edit
reddened a required CI leg — and `shownSpans` (`:309-330`) computes **precise** start-and-end ranges
for each fence and each blockquote run. `occurrences` then throws them away:

```text
:371   if (shownSpans(paragraph).length > 0) spans.push([offset - 1, offset + flat.length + 1]);
```

**One fence line anywhere in a paragraph exempts the entire paragraph**, and a paragraph is whatever
sits between two blank lines. So:

**Measured, on copies under `tmp/r9/exempt/`** — no tracked file touched, the subject's sha256 printed
before and after and identical, `git status --porcelain` empty after. Subject needle: `RETRACTED`
entry 3, "there is no run history to mutate".

```text
tracked evidence, unmodified            hits=4  all quoted            GREEN   (correct)
+ the claim reasserted as plain prose   hits=6  *** WOULD REDDEN ***   RED     (correct)
+ the same prose, with a fenced block
  opening on the very next line         hits=6  all quoted            GREEN   *** LAUNDERED ***
```

Two lines of markdown. No zero-width characters, no quote marks, no wording drift. The claim stands as
a bare assertion and the guard reports nothing. **Fourth time this file has been green for the wrong
reason** — its own docstring counts two and round 8 found a third.

**The fix is one function and I verified it in both directions.** Mark the paragraph wholesale only
when **every** non-blank line in it is a fence delimiter, fence content, or a blockquote line:

```text
narrow rule, over the five tracked GOVERNANCE files, 16 live needles:  all quoted    GREEN
narrow rule, against the fenced launder above:                        WOULD REDDEN   RED
```

So the narrow rule keeps every current occurrence exempt — including the four paragraphs where a fence
and its content share a paragraph — and closes the hole. Shifting the precise `shownSpans` ranges into
flattened coordinates would be stricter still; the coordinate mismatch the comment at `:368-371`
describes is why it was not done, and the wholly-shown predicate sidesteps it entirely.

**Required fix.** Replace `:371` with the wholly-shown predicate, or shift the precise spans; then
plant the two-line launder against a copy and confirm it reddens. Record the round as `W10`, because
the `W` family is where this guard's oracle rounds live and a guard rebuilt four times should have
this round's falsification on the record.

### B6 — the `## Final status` mutation tally names three identifiers that exist nowhere, miscounts the renamed family, and omits nine mutations and the sweep

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1284-1286`; against `:745`, `:766-776`, `:779-783`,
  `:820-832`, `:887-897`, and `packages/qfai/tests/unit/buildCommand.test.ts:841-870`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs`); Evidence (MANDATORY); round 5 `B7`
  (every family must be defined under that section), round 7 `M1`, round 8 `M2`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:361` / `defect:correctness`

The tally at `:1284-1286` reads:

```text
sixteen falsification rounds on the matrix pinning test (`M1`-`M7`, `X1`-`X3`, `X6`-`X8`, `Y1`-`Y3`),
three on the ledger ratchet (`R1`-`R3`), three on the loop guard (`G1`-`G3`), four on the matrix
record's own prose (`X6`-`X9`) and five on the derived-count test (`C1`-`C5`) — all defined under
§ "Execution logs"
```

Grepped: `X7`, `X8` and `X9` occur **at those two lines and nowhere else in the file**.
`## Execution logs` defines `X1`-`X6` (`:745`, `:766-776`) and the second family renamed to
**`Q1`-`Q7`** (`:820-832`). So:

| claim | tree |
| --- | --- |
| `M1`-`M7`, `X1`-`X3`, `X6`-`X8`, `Y1`-`Y3` | `M1`-`M7` (7) plus `X1`-`X6` (6) plus `Y1`-`Y3` (3) = 16. The **total is right**; three of the identifiers do not exist |
| "four on the matrix record's own prose (`X6`-`X9`)" | that family is `Q1`-`Q7` — **seven**, not four, and not `X` |
| — | **`W1`-`W9` is absent from the tally entirely**: nine mutations added this round at `:887-897` |
| — | so is the **250-member deletion sweep**, this round's largest instrument |

Round 8's `M2` asked for exactly this: renumber the second family and correct both totals. The
renumbering was done in `## Execution logs` and **not** in the sentence that counts them, so the
sentence now points at identifiers that resolve to nothing. Round 7 `M1`, round 8 `M2`, **third
round.**

**The record wrote the rule for this itself**, at `:967-969`: "This read `W1`/`W2`/`W3` for two rounds,
naming a family that did not exist — and `W*` now names the retracted-claims family, so the stale
reference would have resolved to the wrong instrument rather than to nothing." `X7`, `X8` and `X9` now
resolve to nothing, in the paragraph that certifies what the stage achieved.

**Required fix.** Rewrite `:1284-1286` from the section itself: `E1`-`E5` (5), `E6`-`E11` (6),
`M1`-`M7` plus `X1`-`X6` plus `Y1`-`Y3` (16), `Q1`-`Q7` (7), `R1`-`R3` (3), `G1`-`G3` (3), `C1`-`C5`
(5), `W1`-`W9` (9), plus the 250-member sweep. Then grep for `X7`, `X8` and `X9` and confirm zero.

---

## MAJOR

### M1 — the committed Validate Hard Gate artifact does not reproduce from HEAD

- **Artifacts**: `.qfai/report/validate.spec-0017.json`; `.qfai/evidence/atdd-spec-0017.md:284`,
  `:288-293`, `:295-300`; against `tmp/r9/shadow/.qfai/report/validate.spec-0017.json`
- **Contract**: `qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS (the per-run directory or this spec's
  `validate.spec-ID.json` as the admissible Hard Gate citation); round 8 `A11`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS (Validate Hard
  Gate evidence) / `defect:correctness`

Round 8's `A11` found neither cited path in the repository, so the JSON was force-added. It is tracked
now — `git ls-files .qfai/report` lists it — and that half is closed. But regenerated from a
`git archive HEAD` shadow root it differs, in exactly one field:

```text
traceability.testFiles.matchedFileCount    committed = 465    HEAD = 467
```

Everything else is identical, both files 5133 bytes, all findings and counts equal — so the *verdict*
the record cites is sound. What is not sound is the reproducibility that was the point of committing
it. Tracked test-file counts per revision: 466 at `3f815725`, then **467 at every revision from
`cb91e089` to HEAD**. **No revision on this branch holds 465**, so the artifact was generated against a
tree state that is not any commit here, and a later reader who regenerates gets a different file with
no way to tell whether the difference is benign.

**Required fix.** Regenerate the artifact at HEAD and force-add it, or record beside the citation which
revision it was generated at and that `matchedFileCount` is the field that moves.

### M2 — "one command, one verdict" is violated four ways by spelling, an invariant this file asserts twice

- **Artifacts**: `packages/qfai/tests/unit/buildCommand.test.ts:729-739`, `:908-920`;
  `packages/qfai/tests/helpers/buildCommand.ts:287-304`, `:117-192`, `:310`
- **Contract**: `qfai-atdd/SKILL.md` Not-done criteria (oracle strength); the invariant the file states
  twice in its own words
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Not-done criteria /
  `defect:correctness`

The file asserts one-command-one-verdict for the long, short and absent forms of `--filter`
(`:729-739`) and for five spaced-versus-inline pairs (`:908-920`), and `coverage-depth:203` and `:211`
record it as the defect that killed v5 and v7. Measured across all 63 long and 44 short tool flags:
**0 disagreements** between spaced and inline, and **0** between spaced and attached. That invariant
holds broadly and I credit it. It fails on *spelling*:

```text
build      vs  none      docker compose build          ||  docker-compose build
heuristic  vs  none      env NODE_ENV=x pnpm build     ||  cross-env NODE_ENV=x pnpm build
build      vs  none      make build                    ||  gmake build
build      vs  none      python -m build               ||  py -m build
```

`docker-compose` and `cross-env` are the two that matter: both are the dominant spelling in real CI,
and `cross-env` is the npm ecosystem's standard way of doing precisely what the `env` wrapper entry was
added for. `pnpm.cmd build` is a fifth — `SCRIPT_FILE` (`:310`) includes `cmd`, so `pnpm.cmd` is read
as a script file rather than a manager and returns `none`.

**Required fix.** Add `docker-compose` to `TOOLS` (aliasing `docker`) and `cross-env` to `WRAPPERS`,
each with its pinning case; and extend the one-command-one-verdict block with the spelling pairs, so
the invariant is asserted over the axis that now breaks it.

### M3 — `:1347` asserts every pack was sealed when its last response landed; the record's own table 64 lines below says four of seven were not

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1347-1348`, `:1406-1425`
- **Contract**: `qfai-atdd/SKILL.md:298`; round 8 `m7`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:298` / `defect:correctness`

`:1347`: "**Nine** packs, one per round, **each sealed when its last reviewer response landed** and
before this record's verdict was written."

`:1411-1419`, in the same section: rounds 2, 5, 6 and 7 late by 3, 1, 1 and 1 commits. And `:1422-1425`
says so in words: "This section told the rounds-3-and-4 version of that story — written first, then
sealed — for two rounds after it had stopped being true of the majority." The table and the retraction
were added; **the sentence they refute was not removed.** The newest pack is also not sealed at all,
which the same section correctly explains at `:1434-1442`.

I re-traced the timing myself with `git log --diff-filter=A` for round 8: `R02`, `R03` and
`summary.json` all landed at `aab29486` — same commit, so the table's row 8 is right in substance.

**Required fix.** Rewrite `:1347` to: nine packs, one per round, eight closed and sealed and the newest
in flight; four of the eight were sealed one to three commits after their last response — see the table
below.

### M4 — "eight corpora" is not derivable, and the two evidence files enumerate different nine-item lists

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:702-707`, `:233-238`;
  `.qfai/evidence/coverage-depth-spec-0017.md:269-273`;
  `packages/qfai/tests/unit/buildCommand.test.ts`
- **Contract**: `qfai-atdd/SKILL.md:361`; Evidence (MANDATORY); round 8 gatekeeper `A10` — "the corpora
  were counted three ways. Eight, enumerated once"
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

`:702` says "Measured against **eight** corpora, and this is the enumeration both evidence files count
from". Three problems:

1. **The atdd list has nine items**: round 4's 20 regressions; v4's 15 kept forms; round 6's 46-case
   corpus; round 7's 59 probes; round 8's 66; round 8's 11 planted plus 6 wrapper forms; the
   accumulated non-builds; one case per grammar member; every run line in both workflow trees.
2. **The coverage-depth list also has nine, and they are different lists.** `coverage-depth:269-273`
   has round 4's 20, **round 5's 10**, **round 6's 7**, round 8's 6 missed and 4 invented, round 8's 11
   plus 6, v4's 15, the non-builds, one case per member, every run line. Round 6's *46* and round 7's
   *59* appear in one file only; round 5's *10* and round 6's *7* only in the other. So "this is the
   enumeration both evidence files count from" is false of both.
3. **The file holds twelve named corpora**: `MEMBER_CASES` 250, `REGRESSIONS` 20, `KEPT` 15,
   `NOT_BUILDS` 18, `REGRESSED` 7, `SHOULD_BUILD` 8, `SHOULD_NOT` 6, `MISSED` 6, `INVENTED` 4,
   `PLANTED` 11, `WRAPPED` 6, `STILL_NONE` 5 — plus two workflow trees and two inline pair lists.

The word "eight" was written to close round 8's `A10`, which asked for the corpora to be counted once
instead of three ways. They are now counted **two** ways, differently, in the two files that each say
they count the same way.

**Required fix.** Enumerate once, in one file, with the other linking to it, and make the numeral the
list's length. Better: pin it — `stageEvidenceCounts.test.ts` already counts callsites in this file;
counting the corpus literals is the same shape.

### M5 — the helper and its test say "Ten versions" while the helper is v11, and the anchored pin cannot see it

- **Artifacts**: `packages/qfai/tests/helpers/buildCommand.ts:4`, `:47`;
  `packages/qfai/tests/unit/buildCommand.test.ts:4`; against
  `.qfai/evidence/coverage-depth-spec-0017.md:188-190`, `:225-229`;
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:339-346`
- **Contract**: `qfai-atdd/SKILL.md:361`; the `Q3` / `Q6` / `Q7` rounds at
  `.qfai/evidence/atdd-spec-0017.md:826-863`, whose whole subject is this drift
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

```text
buildCommand.ts:4       "Ten versions. Each of the first nine was measured, reported clean ... then broken"
buildCommand.ts:47      "**v11 is the same lesson twice more.**"
buildCommand.test.ts:4  "Eight review rounds measured ten versions of it"
coverage-depth:188-190  "getting that far took eleven versions ... each of the first ten reported as clean"
```

The helper contradicts itself 43 lines apart, and the coverage-depth record has it right. **The
anchored pin cannot catch this**, and the reason is instructive: `coverageDepthMatrix.test.ts:342-344`
takes the maximum over every version token in the helper, so `v11` at `:47` satisfies it while `:4`
says ten. The anchor was added on the *record* side (round 8 `m12`, correctly) and the *helper* side is
still a bare maximum. `Q6` and `Q7` are exactly "the describing sentence lags" and "the new version
appears in the history only" — the same defect in a third placement.

`buildCommand.test.ts:4` also says "**Eight** review rounds", which was true when written and is a
round behind now.

**Required fix.** `buildCommand.ts:4` to "Eleven versions. Each of the first ten ..."; `test:4` to
eleven versions, and drop the round count. Then extend the pin: require the helper's own count sentence
to agree with its maximum, which is the mutation `Q6` names and which nothing currently reddens.

### M6 — the Delta Rejected Guard clears the option most at risk on the strength of a sweep that measures a different property

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:52-87`, particularly `:71-79`
- **Contract**: `qfai-atdd/SKILL.md:145` (Delta Rejected Guard, Mandatory);
  `constitution/shared-skill-operating-baseline.md` Delta Rejected Guard
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard

**The section is re-run against the current artifact set, and that is round 8's `M5` closed** — five
rounds of the same finding, now discharged. I ran the guard myself (verified item 18) and the
*conclusion* holds: no rejected option is implemented, and **no RE-OPEN is required.**

One clause is unsound. `:71-79` names "a row that cannot fail looks like coverage" as the option these
four guards are most at risk of reintroducing, says it was reintroduced twice, and then discharges it:

```text
That is why every one of these guards now carries a measured mutation family ... and an in-suite
sweep over all 208 grammar members for the classifier. The option is not reintroduced *now* ...
```

The sweep establishes that **deleting a grammar member reddens the corpus** — true (verified item 8),
and I confirmed it more strongly than the test asserts. It does not establish anything about whether
**`US-0017-0004`'s assertion can fail when the shipped tree contains a build**, which is the property
"a row that cannot fail looks like coverage" is about. `B1` measures that property directly: 18 of 20.
So the mandatory output's discharge cites the right instrument for the wrong claim — which is the
`M3` and `M7` class from round 8, naming the wrong instrument, inside the section that lists that class
as the thing it is guarding against.

**Required fix.** Rewrite `:71-79` to say what the sweep establishes and what it does not, and cite
`B1`'s measurement for the story-level property, with whichever of `B1`'s two remedies is taken.

---

## MINOR

### m1 — `DR-0017-0010:89` still says `ci-pass` "has run twelve times"

Round 8's `m9` had two halves. The evidence half is applied — `:459-461` now records that "the count
was stated as twelve and measured at 23 by P1d two rounds later, and it moves with every push, so it is
dropped rather than tracked". The DR half is not: `DR-0017-0010:89` reads "`ci-pass` exists at
`.github/workflows/ci.yml:469` and **has run twelve times** on". Probed against every retraction my
role established in rounds 3-8, this is the **only** one still live and unquoted in the five governance
files. The DR is inside `GOVERNANCE`, so adding the wording to `RETRACTED` would catch it — or drop the
figure as the evidence file did. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence
(MANDATORY) / `defect:correctness`.

### m2 — the findings table's round-4 stage-gatekeeper slot does not follow the table's own declared rule

`:1241-1243` declares the rule: "distinct finding identifiers appearing as a heading in the report".
`review-20260821020000000/R03_qa-gatekeeper.md` carries `B1`-`B6` as headings — three of them behind a
numbered `##` prefix — **plus** `M4` and `M4b`, also headings. So the rule gives 7, or 8 counting
`M4b`; the table records **6** with families "B1-B6". Every other row's derived value reproduces
exactly, including round 7's P1d slot at 8 with its "(inline)" annotation. So "the derived one is the
one to trust" is one row short of being true. **Severity: advisory, high confidence** | **Traces to:**
`qfai-atdd/SKILL.md:298`.

### m3 — the seal-timing table's row 8 says "(this commit)", three commits behind HEAD

`:1419` reads `8  (this commit)  (this commit)  same commit`. Measured: both landed at `aab29486`, and
HEAD is `05a97202`, so "(this commit)" now resolves to nothing a reader can check — the same objection
`:1060-1061` raises about round names ("a round name cannot be checked, which is the whole reason those
rounds asked"). Write `aab29486`. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:298`.

### m4 — the round-7 superseded seal is unverifiable, and the value round 8 published is dropped without a note

`:1384` records `superseded: 3d56fd2e…` for round 7. That value is the LF-normalised seal of the pack
*before* its `summary.json` was corrected, so it cannot be recomputed from any tree — and the value the
record carried at the previous revision, `ea0849f0…` (raw bytes over one working tree), is gone from the
record entirely. `:1466-1470` states the reason superseded values are kept at all: "the first seal
still reproduces over the three reports **as they stand now**". Neither of round 7's does. Two
sentences would fix it: which edit each value preceded, and that neither recomputes because the pack's
`summary.json` changed. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:298`.

### m5 — the tools' `dirs` versus `values` distinction is behaviourally unpinned

Every `TOOLS.tool.dirs.flag` case uses the template "TOOL FLAG build clean" expecting `none`, which
tests only that the flag **consumes** its value. Nothing tests that a tool's `dirs` flag moves the
manifest lookup — unlike the `MANAGER_DIRS` cases, which do (`pnpm -C sub hello` reaching `tsup`). So
moving any tool flag from `dirs` to `values` changes no verdict; it is caught only by the *name*
assertion at `:798-825`, which sees the changed member path. The membership is pinned and the behaviour
is not. Low impact today, since a tool's directory only matters through the recursion at `:492-493`.
**Severity: advisory, medium confidence** | **Traces to:** `qfai-atdd/SKILL.md:361` /
`defect:code-quality`.

### m6 — the alternate quote pairing exempts everything between the first and last mark, unboundedly

`quotedSpans:299` adds a second pairing whenever the mark count is odd. The union of the two pairings
over an odd number of marks is the whole span **from the first quote mark to the last**. So one stray
quote mark in a paragraph that also contains a real quotation exempts all the prose between them.
Measured: **zero** paragraphs in the five governance files currently carry an odd count above one, so
this is inert today and `B5` is the half that is live. The comment at `:294-298` acknowledges the
widening and argues it is the lesser evil, which I accept as a judgement — but it is stated as "a
launder would have to introduce a stray quote mark to use it", and the cost is one character. Bounding
each pairing to the marks adjacent to the stray one would keep the false-accusation fix and shrink the
window. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
`defect:code-quality`.

### m7 — `MEMBER_CASES` pins uniqueness of members but not of commands

`:824` asserts that the case count equals the distinct member count, so no member has two cases.
Nothing stops two members sharing one **command**: `WRAPPERS.timeout` and `WRAPPERS.timeout.args` are
both `timeout 600 pnpm build`. Both deletions happen to be detected (verified), so this is latent
rather than live — but "one case per member" reads as 250 distinct probes and it is 249.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:361` / `defect:code-quality`.

### m8 — `yarn workspaces foreach run build`, the yarn-berry build form, is `none`

`MANAGER_PASS` carries `workspaces`, so `yarn workspaces foreach -A run build` skips `workspaces` and
then reads `foreach` as **the script** — for a manager the first bare token returns — and stops. Yarn 2
and later have no `yarn workspaces run`; `foreach` is the only spelling. One `MANAGER_PASS` member
closes it. Folded into `B1`'s required fix. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md` Not-done criteria / `defect:correctness`.

### m9 — the in-flight pack raises `QFAI-REVIEW-004` and `-005`, for the fifth round

`.qfai/review/review-20260821120000000/` at `05a97202` holds only `review_request.md`, which is two of
the four full-profile errors. This is a **sequencing note on my own round**, not a gap: committing the
request before the reviewers launch is what fixed round 1's moving-tree problem, and `:1267-1269`
discloses it accurately. Per
`.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations` this is a product
obligation upstream never asked for and **must not gate this rework**; see the Change Request proposal
below. **Severity: advisory** | **Traces to:** `defect:code-quality`.

### m10 — `pack/verify` is not in the P7 block

`SKILL.md:426-431` lists "pack/verify (if distributed)" among the repository standard gates and the P7
block at `:1063-1072` does not carry it. This package is distributed. Every prior round accepted the
five-gate block, so I raise it as a completeness note at low confidence rather than as a defect — but
the block is what a completion gate reads, and one named gate is absent from it without a stated
reason. **Severity: advisory, low confidence** | **Traces to:** `qfai-atdd/SKILL.md:426-431`.

---

## Rulings on the questions put to me

### 1. Break v11

**Broken, in the direction that matters, at nearly twice round 8's scale.** 18 of 20 real builds
planted in the shipped lane through the story's own loop; 15 of the 18 are tools or wrappers the
grammar already declares; 11 of the 30 `TOOLS` entries have a pinning case whose command the tool does
not have while its canonical build returns `none`; and `mvn build`, `sbt build` and `cmake build` are
asserted as builds although the first two are not Maven or sbt commands and the third configures. The
wrapper guesses fail on the one that matters most —
`xvfb-run -a -s "-screen 0 1024x768x24" pnpm build`, the textbook form, is `none`, because the wrapper
`values` handler consumes one token unconditionally and the real value is multi-token. `cross-env` is
absent while `env` is present. See `B1`, `M2`, `m8`.

**What I could not break**: the per-tool flag grammars themselves. 63 long flags and 44 short flags,
spaced versus inline and spaced versus attached — **0 disagreements**. `make -B build`,
`gradle --console plain build`, `docker run --name build-agent alpine`,
`cargo --config build.jobs=2 test` and `gradle --build-file other.gradle clean` all land correctly.
v9's contribution is sound; what is missing was never a flag rule.

### 2. Break the deletion sweep

**I could not break it, and I tried harder than it asks.** 250 members, 250 cases, no member
undetected, replicated in process against the live `GRAMMAR`. Beyond the test's own assertion I checked
whether each member's **own** case notices its own deletion — the test accepts *any* case noticing,
which would let a labelled case be decorative — and 0 failed. That is the strongest state any
instrument on this spec has reached, and your own falsification (putting `--filter` back into
`MANAGER_CONSUMING`) is the right kind and gives the right answer.

**But the sweep and the coverage assertion can be simultaneously green and wrong, and they are.** The
two assertions say: every member has a case, and deleting any member reddens. Neither says the grammar
is *right*. `B1` is what that costs — 250 green member cases and 18 of 20 real builds invisible. The
mechanism is that the corpus was written **from the member list**: the commands are hardcoded, as
`:806-810` says, but they were chosen by reading member names, so they assert what the grammar does
rather than what a tool does. Round 8's finding was probes generated from the sets; this is the same
error one abstraction layer out, and the sweep cannot see it because the sweep's subject is the set,
not the world.

Two narrower holes: the `dirs` versus `values` distinction is caught only by name, not by behaviour
(`m5`), and two members share a command (`m7`).

### 3. Break `retractedClaims.test.ts` a fifth time

**Broken. Two lines of markdown.** Reassert a refuted claim as plain prose and open a fenced block on
the next line with no blank line between: the whole paragraph becomes an exempt span and the assertion
goes green. Demonstrated on copies, with the tracked file's hash printed before and after (`B5`). The
alternate quote pairing is exploitable in principle too — any odd mark count exempts everything between
the first and last mark — but is inert today at zero such paragraphs (`m6`). I also verified a
one-function fix: exempt a paragraph wholesale only when every non-blank line is a fence delimiter,
fence content or a blockquote line. All 16 live claims stay green; the launder reddens.

**On the second half of the question**: I re-probed every retraction my role established in rounds 3-8
and found **one** still live and unquoted — `DR-0017-0010:89`'s "has run twelve times" (`m1`). Every
other one is either absent or quoted, the three `RETIRED` entries match nothing, and the
every-entry-matches assertion three rounds required is finally written and is what would have caught
round 8's dead needles. This is the best state this guard has been in.

### 4. The numbers you derived rather than typed

| figure | recorded | measured |
| --- | --- | --- |
| the findings table's response slots | 23 | **23** — 25 rows, two of them "did not run" / "not routed"; equal to the 23 reports on disk. One row's derived value is off (`m2`) |
| the P7 sequence, e2e column | 858 to 869 | **exact at every revision**, including the four past its last row; 1422 plus 11 = 1433 = measured |
| the P7 sequence, integration+unit | 1196 | **1197** — `f544daad` added a callsite after the certified revision (`B4`) |
| the eight pack seals | eight values | **all eight recompute**, LF-normalised, including the two written this round |
| the eight corpora | eight | **twelve** named in the file; two nine-item enumerations that differ from each other (`M4`) |
| the grammar members | 208 | **250** (`B3`) |
| rounds / responses / verdicts | 7 / 21 / 20 plus 1 | **8 / 23 / 22 plus 1** (`B2`) |
| the mutation-family tally | `X1`-`X3`, `X6`-`X8`; four `X6`-`X9` | `X7` to `X9` do not exist; the family is `Q1`-`Q7`; `W1`-`W9` omitted (`B6`) |
| the matrix | 3 / 1 / 5, 38 cells, A30 / B7 / C1 | **exact**, cell by cell |
| the ledger | 82 / 71 / 11, 74 / 6 / 2, 63 / 6 / 2 | **exact** |
| the gates | scoped `error=2`, full `error=4`, `ci:lint` 11 members | **exact**, with membership |

So: **the seals and the e2e sequence are right; four of the eight derived quantities are not**, and
three of the four — 208, "eight corpora", and the `X`-family tally — were written in the commit that
was closing a finding about counting.

### 5. The two calls you made rather than asked about

**(a) Leaving five packs' `summary.json` as written, with the rule stated — right call.** Re-sealing
five closed packs to move a bookkeeping figure would rewrite more history than it repairs, and the
alternative you took is the one round 8 offered. The rule at `:1241-1251` is honest about why a
mechanical heading count undercounts the three gatekeeper reports that enumerate advisories inline. One
correction is owed before "the derived one is the one to trust" is true of every row: the round-4
stage-gatekeeper slot records 6 where the declared rule gives 7 (`m2`).

**(b) Marking the 445 KB run directory regenerable while force-adding the JSON — right in principle,
not achieved in fact.** The reasoning is sound and I checked each step: `SKILL.md` CRITICAL CONSTRAINTS
names *either* the per-run directory *or* this spec's `validate.spec-ID.json` as admissible, so one
path is enough; a run directory's name is a timestamp the next run cannot reproduce, so committing one
fixes a name that means nothing later; and `validate.log` is correctly declined for the shared-pointer
reason, which round 2's gatekeeper vindicated by observing it rewritten mid-review. But the committed
JSON does **not** reproduce from HEAD — `matchedFileCount` 465 against 467, and no revision on this
branch holds 465 (`M1`). The call was right; the artifact needs regenerating.

---

## Required fixes (blocking only)

1. **`B1`** — either give the tools that have one a `builds` list (the field exists) and add every
   planted form above as a case, `tsc -p tsconfig.build.json` included per the file's own `msbuild`
   rule; **or** state the limit where the completion gate reads it and score `Oracle strength`
   accordingly. Either way delete or requalify the eleven "TOOL build" cases whose command the tool
   does not have, fix the `xvfb-run` value handling, and verify with the plant.
2. **`B2`** — `:1312` to eight / 23 / 22-plus-one-PASS; add a round-8 row to `:1322-1330`; put the
   three counts under an instrument. Verify by grep.
3. **`B3`** — 208 and 207 to 250 at all five sites, or delete the numeral; pin the member count the way
   the pack numeral is pinned.
4. **`B4`** — re-measure both legs at HEAD, correct `:1066` to 1197, extend the sequence to `05a97202`
   with the `f544daad` row, rewrite `:1058-1060`, and extend the invariant to the integration and unit
   globs.
5. **`B5`** — replace `retractedClaims.test.ts:371` with the wholly-shown predicate; plant the two-line
   launder against a copy and confirm it reddens; record it as `W10`.
6. **`B6`** — rewrite `:1284-1286` from `## Execution logs`; grep for `X7`, `X8` and `X9` and confirm
   zero.

## Advisory / Change Request proposals

- Regenerate `validate.spec-0017.json` at HEAD, or record the revision it was generated at (`M1`).
- Add `docker-compose` and `cross-env`, and extend one-command-one-verdict to spelling pairs (`M2`).
- Rewrite `:1347` to agree with the table below it (`M3`).
- Enumerate the corpora once and pin the numeral (`M4`).
- `buildCommand.ts:4` and `buildCommand.test.ts:4` to eleven versions, and extend the pin to the
  helper's own count sentence (`M5`).
- Rewrite the Delta Rejected Guard's `:71-79` warrant (`M6`) — the conclusion holds and **no RE-OPEN is
  required**; only the instrument cited is wrong.
- The minors: the DR's twelve-runs figure (`m1`), the round-4 slot (`m2`), "(this commit)" (`m3`), the
  two superseded seals (`m4`), the `dirs` versus `values` behaviour (`m5`), the odd-pairing window
  (`m6`), the shared command (`m7`), `yarn workspaces foreach` (`m8`), `pack/verify` (`m10`).
- **A pack in flight breaks two gates, for the fifth round.** `QFAI-REVIEW-004` and `-005` fire on a
  pack whose contents cannot exist when the directory does. This is a product obligation upstream never
  asked for, so per
  `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations` it **must not gate
  this rework**; a `CR-*` against whichever skill owns `review-artifact-layout.md` is the place for it.
  Nothing in the blocking set depends on it.
- **Consider pinning the record's round and response counts and the grammar-member count in the same
  instrument that already pins the pack numeral.** `B2` and `B3` are both "a number the record states
  that nothing derives", and both are one-line derivations from data the guards already read. A
  proposal, not a blocking finding beyond the two findings themselves.

## Open risks / residuals

- **Every gate I ran is the colour the record claims, except one number.** `test:e2e` 1433 / 16 exit 0;
  integration plus unit 1197 / 19 exit 0 (recorded 1196); `ci:lint` exit 0 with eleven members;
  `check-types` exit 0; the ledger guard 8 backed exit 0; scoped validate `info=2 warning=0 error=2`
  exit 1; full profile `info=4 warning=404 error=4` exit 1 with all four members identified. **CI is
  the one colour I cannot certify**, and unlike round 8 I found no reason to think a clean checkout
  differs: the seal function now normalises line endings and all eight seals recompute.
- **The classifier is sound where it was last broken and broken one level up.** Per-tool flag grammars:
  0 disagreements over 107 flags. Per-tool subcommand knowledge: absent, and that is `B1`.
- **The instruments are converging and the record is not.** The sweep, the seals, the anchored pins and
  the retracted-claims list are all in their best state. Four of the record's derived numbers are
  wrong, and three of the four were written in the commit closing a finding about counting.
- **`## Ledger rows advanced` remains substantively true.** Both rows are still `todo` with `DR-ID: -`
  and `Blocked-By: -`, read cell by cell; the handover says exactly that; `DR-0017-0010`'s `Status`
  line carries the pass-6 PASS; both conditions on the write are disclosed. Nothing analytical is owed
  on either row, and nothing in my blocking set touches P1d.
- **The authorship-separation breach stands** and is unrepairable retroactively.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; `check-atdd-annotation-ledger.mjs` closes that direction for `spec-0017` only and is
  still not in `ci:lint`.
- **Concurrency.** I ran alongside the other reviewers this round routed. Own shadow root
  (`tmp/r9/shadow`), own scratch (`tmp/r9/`); the tracked `.qfai/report/validate.log` was never written
  by me and any run-log pointer in the working tree may reflect another run.

## PENDING

- **`pack/verify`** — not run (`m10`), and not claimed. It is named in `SKILL.md:426-431` as a
  repository standard gate and carries no figure in the P7 block, so I can neither confirm nor fault
  it.

That is the only one. The four projects the P7 block does not name were also run, after this report's
findings were fixed, and they pass: `--project core --project validators --project cli --project
scripts` gives **2748 passed / 16 skipped, 204 files, exit 0**. With the two legs the record does
certify that is 84 + 171 + 204 = **459 files** and 1433 + 1197 + 2748 = **5378 passed / 51 skipped**
across every project in the workspace, all exit 0. No figure in the record depends on those four, so
this is offered as corroboration rather than as a check of a claim.

Everything else round 8 left `PENDING` is now measured. Round 8 could not execute the classifier
because a probe under `tmp/` cannot resolve `vitest`; it does not need to. Node 24 imports the
TypeScript helper directly and the exported `GRAMMAR` is the very object the classifier reads, so both
the behavioural corpus and the deletion sweep are exercisable from `tmp/` with no mutation of any
tracked file. **Every oracle claim in this report was executed rather than argued.**

## Evidence checked

- `.qfai/review/review-20260821120000000/review_request.md`;
  `.qfai/review/review-20260821100000000/R02_completion-reviewer.md` (whole, all 29 findings traced to
  their sites), `R03_qa-gatekeeper.md` (structure and identifier set), `summary.json`; all nine atdd
  packs' file listings, `summary.json` values, tracked-versus-disk counts, per-file CRLF census and
  per-file blob hashes filtered and unfiltered; `git log --diff-filter=A` per round-8 pack file; every
  report's verdict line. **This round's sibling reports were not read before my findings were written.**
- `.qfai/evidence/atdd-spec-0017.md` (whole, 1484 lines);
  `.qfai/evidence/coverage-depth-spec-0017.md` (whole, 404 lines, parsed mechanically)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically: 82 data rows of 9 cells; `:107-108`
  read cell by cell); `07_Decisions.md:133`, `:137`, `:203`, `:206`, `:242`, `:249` and its nine unique
  `DR-0017-*`; the `Rejected` section of `09_delta.md`, three candidates, read in full
- `.qfai/decisions/DR-0017-0010-*.md:1-20` and `:89`; `CR-20260820-0011-*.md` and
  `CR-20260820-0012-*.md` via the guard's `GOVERNANCE` set
- `.claude/skills/qfai-atdd/SKILL.md` (whole, 499 lines)
- `packages/qfai/tests/helpers/buildCommand.ts` (whole, and **executed**);
  `packages/qfai/tests/unit/buildCommand.test.ts` (whole; `MEMBER_CASES` parsed and replayed);
  `packages/qfai/tests/assets/retractedClaims.test.ts` (whole; `flattenings`, `quotedSpans`,
  `shownSpans` and `occurrences` replicated);
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole; `blobHash` and `sealOf` replicated);
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:320-407`;
  `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:1-70` and `:390-460`;
  `packages/qfai/vitest.workspace.ts`; the root `package.json` (`ci:lint`, eleven members);
  `.prettierignore`; `.markdownlint-cli2.jsonc`; the eslint config; `.gitattributes`
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` at start, at the resume
  point and at finish; `git ls-files -s` (83 tracked symlinks; `.qfai/report` six tracked paths
  including `validate.spec-0017.json`); a `git archive HEAD` shadow root with **native**
  relative-target symlink re-materialisation (83 created, 83 verified against `git cat-file blob`);
  shadow-root `validate --profile atdd --fail-on error --spec 0017` (`info=2 warning=0 error=2`,
  exit 1, zero `QFAI-LINK-001`) and `--profile full` (`info=4 warning=404 error=4`, exit 1) with the
  `-111` and `-112` membership extracted per spec and both artifacts diffed field by field against the
  committed one; `pnpm ci:lint` (exit 0); `pnpm -C packages/qfai check-types` (exit 0);
  `pnpm exec vitest run --project e2e` (exit 0, **1433 / 16**, 84 files),
  `--project integration --project unit` (exit 0, **1197 / 19**, 171 files) and
  `--project core --project validators --project cli --project scripts` (exit 0, **2748 / 16**,
  204 files);
  `node scripts/check-atdd-annotation-ledger.mjs --spec 0017` (8 backed, exit 0); seal recomputation
  over all nine packs in both blob serializations plus a CRLF census over all 40 pack files;
  e2e-project and unit-plus-integration callsite counts at thirteen revisions via `git grep -c`;
  **in-process execution of the classifier over 130-plus probes** (`tmp/r9/probe1.mjs`, `probe2.mjs`,
  `final.mjs`); **in-process replication of the 250-member deletion sweep plus an own-case variant**
  (`tmp/r9/sweep.mjs`); **the shipped-lane plant through the story's own loop** (`tmp/r9/plant.mjs`,
  against a copy in `tmp/r9/plant/`); the retracted-claims oracle over the five governance files with
  34 needles, plus a paragraph and exempt-span census and the narrow-rule variant (`tmp/r9/retract.mjs`,
  `retract2.mjs`, `retract3.mjs`, `tmp/r9/exempt/`); and the audit-hash procedure
- **Not re-run:** the resolver mutations `E6`-`E11`; the matrix falsification rounds `M*`, `X*`, `Y*`
  and `Q*`; the ledger ratchet `R1`-`R3`; and the loop guard `G1`-`G3`. No finding above rests on any
  of them. Every vitest project in the workspace WAS run (see PENDING); only `pack/verify` was not.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to none
- [x] Required gates and residual risks are recorded; one gate is declared **PENDING** rather than
      assumed, and the gate round 8 could not run was run
- [x] No mutation persisted: HEAD `05a97202` at start, at the resume point and at finish;
      `git status --porcelain` empty at all three; `.qfai/report/validate.log` still
      `2b572934ce71305b4fcfc1ac40c34c164f83cf8d`, equal to
      `git rev-parse HEAD:.qfai/report/validate.log`; both validate run-logs inside `tmp/r9/shadow`;
      the shipped workflow byte-identical (`git diff --stat` empty); the evidence file's sha256
      identical before and after the exempt-span demonstration; and every oracle result obtained either
      in process against the exported grammar or against a copy under `tmp/r9/` — nothing was planted
      in a tracked file, so nothing needed reverting

---

## Appendix — post-hoc cross-check with the sibling reports

**Written after everything above, and nothing above was changed by it.** I read
`R01_implementation-reviewer.md` and `R03_qa-gatekeeper.md` only once my own findings were complete and
written, so the agreements below are independent.

**Five findings reached independently by two reviewers**, from different corpora and different methods:

| mine | theirs | note |
| --- | --- | --- |
| `B1` (18 of 20 planted in one lane) | `R03 B1` (34 of 40 forms unseen, five lanes) | same defect, two disjoint corpora, two different plant sites |
| `B3` (208 recorded, 250 measured) | `R03 B3` | identical measurement, arrived at separately |
| `B5` (the fence exemption launders in two lines) | `R03 B4` (broken a fifth time; the round-8 exempt-span repair opened the holes) | same instrument, same round-8 repair identified as the cause |
| `M4` (twelve corpora; two nine-item lists that differ) | `R03 B6` (counted two ways, neither list has eight) | identical conclusion |
| `M1` (the committed artifact does not reproduce from HEAD) | `R03 B8` (not the run of the revision it certifies) | same artifact, same defect, different framings |

Also convergent: `R03 A9` and part of my `B1` (member cases that are commands their own tool would
reject); `R03 A3` / `A4` and my `m2` (the findings-per-round derivations and the feedback-count rule);
`R03 B7` and my `M5`, reached from opposite ends — they found the version pin reads only the first
match, I found the helper's own count sentence says ten while the pin is satisfied by the maximum.

**One sibling finding qualifies a credit I gave, and I would rather say so than leave it standing.**
`R03 B2` reports that the deletion sweep's scope is **what `GRAMMAR` exports**, and that nine
decision-bearing members outside that export survive deletion. My verified item 8 and my ruling on
question 2 credit the sweep as "sound" on the strength of replicating it over all 250 exported members
— which is true **of its own scope**, and that scope is narrower than the claim
`buildCommand.test.ts:812-813` makes. So read my credit as: *the sweep is exact over the members it
enumerates, and the set it enumerates is not the whole grammar.* That does not weaken `B1` (which is
about the grammar being wrong, not unpinned) and it strengthens the general point of my question-2
ruling: the sweep's subject is the set, not the world.

**Two sibling findings I did not reach and have no basis to dispute**: `R03 A5` (the sweep's restore is
not order-exact for `TOOLS` and `WRAPPERS`) and `R03 A7`
(`.qfai/report/specs-coverage/spec-0017.md` does not exist — consistent with what I measured, that
`git ls-files .qfai/report` lists `specs-coverage/spec-0012.md` and no `spec-0017.md`).

**My verdict is unchanged: REVISE.** Nothing in either sibling report removes a finding of mine, and
the convergence on `B1`, `B3`, `B5`, `M4` and `M1` means five of my twelve blocking-or-major findings
were each measured twice, independently, this round.
