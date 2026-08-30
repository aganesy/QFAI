# R02 — completion-reviewer, round 10

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 10 — **stage gates only**. P1d closed at round 7; I did not
  re-open or re-decide it, and nothing below touches it.
- **Reviewed revision: `a66be5c6`.** `git rev-parse --short HEAD` was `a66be5c6` at start and at
  finish; `git status --porcelain` was **empty** at both. HEAD did not move.
- **Audited evidence hash (stage review):
  `sha256:6829b59306c48fce1c810bddb325c2cce5b3f226bb971051cabbafbd25190f7e`** — the procedure at
  `constitution/shared-skill-delegation-baseline.md#reviewer-response-template`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status`
  (`7e3ad1284e78cc802bc0cc4fc05cf511aaefac635b3a32cbdf3afca19cc21f84`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`b7fecf2d935e6fa2a439fa3c321d782550b1fdf6cacfb3132a770218d486837a`), serialized as
  `path + NUL + sha256` sorted by path, hashed. `## Final status` is at `:1334` and is the last `##`
  heading, so truncating and excising are byte-identical.
- Authored/edited under review: **none.**
- **Independence.** `.qfai/review/review-20260821140000000/R01_implementation-reviewer.md` existed on
  disk (ignored, untracked) while I ran. I did **not** open it. Every finding below was formed and
  written from my own measurements.
- **Mutation hygiene.** One tracked file was mutated, once, to falsify an oracle claim, and reverted
  in the same step with a byte comparison printed:
  `packages/qfai/tests/helpers/buildCommand.ts`, sha256
  `429b2fef442dbbfc97e3600e32a98eabe4a8a5682e73d8c4203bec32ce2609f1` / blob
  `d1d28068ea13ff5934ae9307fe919b93760972eb`, **before and after identical**, and
  `git status --porcelain` empty after. Every other oracle result was obtained in process against the
  exported grammar, or against copies under `tmp/r10/`. No shipped asset was planted in; the plant
  ran against an in-memory clone of the parsed workflow.
- `validate` ran against a `git archive HEAD` shadow root at `tmp/r10/shadow` with all **83** tracked
  symlinks re-materialised as **relative-target** symlinks (`created=83 failed=0`;
  `checked=83 matched=83 mismatched=0` against `git cat-file blob`). **A recipe correction for the
  next round:** Git Bash `ln -s` silently copies even with `MSYS=winsymlinks:nativestrict` set in the
  parent environment, and Python `os.symlink` without `target_is_directory=True` produces a *file*
  symlink to a directory that `readlink` reports correctly and `fs.stat` cannot resolve — which
  yielded **70** spurious `QFAI-LINK-001` on my first attempt. With the directory flag set,
  `QFAI-LINK-001` is **0** and every count below is raw. Both run-logs landed inside the shadow; the
  tracked `.qfai/report/validate.log` is blob `4883090b0aa3aa8c251e9fc7f382d6d2cbacf518` before and
  after, equal to `git rev-parse HEAD:.qfai/report/validate.log`. The shadow was torn down after
  checking that **0** of its symlinks escaped it.
- Scratch under `tmp/r10/` only. No `git checkout` / `stash` / `reset`, no commit, no push.

## Verdict summary

| # | finding | severity |
| --- | --- | --- |
| `B1` | `MANAGER_BOOLEAN`'s deletion warrant is **refuted by 20 commands**: `yarn --silent workspace pkg build` is a real build and returns `none` while `yarn workspace pkg build` returns `heuristic`. 9 of 10 planted builds ship unnoticed through the story's own loop | blocking |
| `B2` | `SH_FAMILY` decides verdicts and is **outside `GRAMMAR`**, so "an in-suite sweep over every grammar member" is false. I deleted one of its three members: all 23 tests green, one verdict changed | blocking |
| `B3` | **six prose counts the tree does not hold**, four of them written into the commits that closed round 9's counting findings: the corpora numeral (10 / 9 / 11), the grammar-member count (208 vs **296**), `MANAGER_BOOLEAN`'s "nineteen" (vs 17 / 18 / **22**), "four of the seven closed packs" (**nine**), the test docstring's "Eight review rounds … ten versions" (**nine / twelve**), and the `Q1-Q4` heading over a `Q1`-`Q7` block | blocking |
| `B4` | the P7 currency sentence is false for the **fifth** round: **five** commits follow `30a0ae5a`, not two, and they add **zero** e2e callsites, not one — the `+1` was in the unguarded integration+unit leg. And the revision is named "this commit" | blocking |
| `B5` | `### Findings per round` **omits round 9's three responses entirely** while `## Final status` counts 26; and the round-4 stage-gatekeeper slot still records 6 where the table's own stated rule gives **9** | blocking |
| `M1` | `cmake build`, `mvn build` and `sbt build` are **still pinned as `build`** — round 9 `B1`'s "delete or requalify" clause is unapplied, and `cmake build` configures | major |
| `M2` | the Delta Rejected Guard's discharge of "a row that cannot fail looks like coverage" still overstates: I planted 33 real builds and **30** shipped unnoticed | major |
| `M3` | round 9 `B5`'s second half is unapplied: **no `W10`**, so the guard rebuilt this round has no oracle round in `## Execution logs` | major |
| `M4` | round 9 `B2` and `B3`'s **instrument** halves are unapplied: nothing derives the round / response / verdict counts or the grammar-member count | major |
| `M5` | `shownSpans`'s stated coordinate model is **false for 50 of 456 paragraphs** and displaces 14 live exempt spans, two of them past the end of their own paragraph | major |
| `M6` | `mvnw` is absent while `gradlew` is present, against the file's own stated alias rule; `./mvnw package` is `none` | major |
| `M7` | `## Gaps / Open risks` item 7's "canonical list" is **incomplete**: at least three instances added this round belong on it | major |
| `m1`-`m8` | see MINOR | minor |

**Two things improved that eight rounds could not, and they deserve saying first.** Round 9's
twenty-form plant is **completely closed** — 0 of 20 still unnoticed, including `mvn -B package`,
`gradle assemble`, `ninja`, `rake`, `sbt assembly`, `go install ./cmd/...`,
`xvfb-run -a -s "-screen 0 1024x768x24" pnpm build` and `yarn workspaces foreach -A run build`. And
the **false-positive side is the best it has been**: 21 of 22 non-builds correctly rejected, including
`npx tsc --noEmit`, `rm -rf build dist`, `cmake -S . -B build`, `bazel test //src/build:tests`,
`docker run --name build-agent alpine` and `pnpm check-types   # runs tsc -b`. What is blocking below
is one level out again: a **deletion** whose warrant does not hold, a set the sweep cannot reach, and
six numbers.

---

## What I re-derived and could not fault

Ran, in the working tree unless noted:

1. **`--project e2e`: 1434 passed / 16 skipped, 84 files, exit 0** — `:1103` exactly.
2. **`--project integration --project unit`: 1200 passed / 19 skipped, 171 files, exit 0** —
   `:1104` exactly. Round 9's `B4.3` (1196 vs 1197) is closed.
3. **`pnpm ci:lint` exit 0, eleven members**, counted from the root `package.json` chain:
   `format:check`, `lint`, `lint:md`, `check-bidi`, `check-instructions-size`,
   `check-review-profile-consistency`, `check-prompt-scanner-pair`, `check-workflow-hygiene`,
   `lint:shipping`, `lint:workflow-shape`, `check-pack-locations`.
4. **`pnpm verify:pack` exit 0** (`ok=16 info=2 warning=1 error=0`). Round 9's `m10` and its own
   `PENDING` are both closed — this is the gate round 9 could not run.
5. **The scoped gate, in the shadow root: `info=2 warning=0 error=2`, exit 1**, membership exactly as
   recorded — `QFAI-ATDD-111` = 1 US (`US-0017-0007`), `QFAI-ATDD-112` = 8 TCs (`0016`, `0030`,
   `0032`-`0035`, `0069`, `0070`), zero `QFAI-LINK-001`.
6. **`--profile full`: `info=4 warning=404 error=4`, exit 1**, all four members identified, and the
   per-spec membership extracted from the shadow's `validate.json`: `QFAI-ATDD-111` **12 US across
   five specs** (0003 x8, 0006 x1, 0008 x1, 0015 x1, 0017 x1) and `QFAI-ATDD-112` **15 TCs across
   four** (0003 x1, 0008 x4, 0015 x2, 0017 x8). "this spec owns 1 and 8" is exact. `QFAI-REVIEW-004`
   and `-005` name `review-20260821140000000`, this round's own in-flight pack.
7. **The committed Hard Gate artifact now reproduces.** `.qfai/report/validate.spec-0017.json` is
   tracked, `traceability.testFiles.matchedFileCount` is **467**, and 467 is the tracked test-file
   count at `30a0ae5a` and at HEAD (no test file added or deleted between them). Its `counts` are
   `info=2 warning=0 error=2` with exactly the two recorded findings. Round 9's `M1` is closed.
8. **All ten packs, and all nine seals.** Ten directories from `FIRST_PACK`; the nine closed ones all
   recompute LF-normalised with the record's own serialization (`5c8cd425`, `305ffd65`, `257e793b`,
   `aaa2d2a6`, `5798d557`, `d99dff9c`, `022c3add`, `d2ef7d5c`, `0966ca41`), the tenth is disclosed
   unsealed, and round 7's is still the **only** pack where the LF and raw-byte seals differ
   (`022c3add` vs `aa07e395`). **Round 1's superseded seal reproduces**: hashing the three reports as
   they stand now, without `summary.json`, gives
   `d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9` — byte-for-byte the recorded
   value, so the discharge at `:1547-1551` is verified rather than argued.
9. **All ten packs are tracked file-for-file** (4 / 6 / 5 / 5 / 5 / 5 / 5 / 4 / 5, and 1 of 2 for the
   in-flight one — see `m7`).
10. **The ledger, parsed mechanically** (82 data rows of nine cells): **71 `Integration` plus 11
    `Unit` = 82**; **74 `refactor`, 6 `blocked`, 2 `todo`**; `Integration` cross-tab **63 / 6 / 2**;
    `Unit` 11 / 0 / 0. `:107` and `:108` are `TDD-0069` and `TDD-0070`, both `Status = todo`,
    `DR-ID = -`, `Blocked-By = -`, both `Evidence` cells still opening "NOT BLOCKED by a CR".
    **Nothing has been written ahead of the gate**, and `## Ledger rows advanced` says so correctly.
    The six `blocked` rows are `TC-0017-0016`, `-0030`, `-0032`, `-0033`, `-0034`, `-0035`, four of
    them on `CR-20260820-0007` — so `QFAI-ATDD-112`'s eight is exactly the six blocked plus the two
    todo.
11. **The matrix, cell by cell.** ✅ 3 / ⚠️ 1 / ❌ 5 from the `Status` column; per-row failing depth
    counts 3, 1, 2, 6, 6, 6, 7, 5, 2 = **38**; partition **A 30 / B 7 / C 1 = 38**, complete,
    disjoint, every member satisfying its own class property; nine rows, all nine cells wide. Every
    figure exact. Class B is 7, which is what open risk 6 calls "all seven of them".
12. **The `## Final status` counts are right.** Nine rounds; **26** reviewer responses
    (2/4/3/3/3/3/3/2/3 from `FIRST_PACK`); **25 FAIL and one PASS** read from every `summary.json`,
    the PASS being `review-20260821080000000`'s P1d slot. The bare glob gives 27 responses over ten
    directories, so the stated `FIRST_PACK` boundary is load-bearing and is now stated in the prose.
    Round 9's `B2` numeric half is closed.
13. **Every finding count the `### Findings per round` table does carry reproduces**, id family by id
    family, for all 23 slots present — including round 5's `B1-B10, M1, M3` = 12, round 7's P1d
    `M1, A1-A7 (inline)` = 8, and the three "enumerated inline" rows. See `B5` for what is missing.
14. **The e2e half of the P7 sequence reproduces at every revision**, callsites under the project's
    two globs: 858, 861, 864, 867, 868, 868, 869, 869, 869, 869, 869, 869, **870** at `30a0ae5a` —
    and 1422 plus (870 minus 858) = **1434**, which is what I measured. See `B4` for the sentence
    beside it.
15. **The ledger guard**: 8 claims backed for `spec-0017`, exit 0; repo-wide **exit 1 with 127
    unbacked of 208 claims**, counted both mechanically from `tests/e2e/qfai-traceability.md` (208
    `QFAI:SPEC-NNNN:US-` lines) and from the guard's own output. Eight annotated describes in the E2E
    file, eight ledger lines, `US-0017-0007` absent from both.
16. **Round 9's twenty-form plant is closed — 0 of 20 still unnoticed**, run through the story's own
    loop at `spec0017LayeredCiScaffoldE2E.test.ts:412-431` against an in-memory clone of the shipped
    orchestrator, with the unmodified control flagging nothing.
17. **The spelling pairs round 9 `M2` named are fixed**: `docker-compose build`, `gmake build`,
    `py -m build`, `python3 -m build` and `cross-env NODE_ENV=production pnpm build` all land
    correctly, and `docker-compose` and `cross-env` are declared.
18. **`tsc -b` is a build and `--noEmit` still separates the type check from the emit**:
    `pnpm exec tsc -b` and `tsc -p tsconfig.build.json` are `build`, `npx tsc --noEmit` is `none`.
    Round 9's `B1` residual on `tsc -p tsconfig.build.json` is closed and the form is in the corpus.
19. **The deletion sweep is exact over the members it enumerates.** 296 `MEMBER_CASES` entries, 296
    distinct labels, 296 grammar members from a line-for-line replication of `grammarMembers()`; the
    test now asserts both the weak property (some case notices) and the strong one (the member's
    **own** case notices), which round 9 measured and recommended. See `B2` for the scope.
20. **Round 9's `B5` exploit is closed.** Reasserting a retracted claim as plain prose with a fenced
    block opening on the very next line now **reddens**; the exemption is line-scoped and the
    alternate odd-parity pairing is gone, with 0 odd-parity offenders across the five governance
    files.
21. **The Delta Rejected Guard's inputs are exactly as stated**: three `## Rejected` candidates in
    `09_delta.md`, six "Decision, rejected alternative" bullets at `07_Decisions.md:133`, `:137`,
    `:203`, `:206`, `:242`, `:249`, against nine unique `DR-0017-*` — the transposition `:33-36`
    records. **No rejected option is implemented by this round's changes and no RE-OPEN is
    required**; see `M2` for the one clause whose warrant still overstates.
22. **Round 9's `m1`, `m8`, `M5` helper half, `M3` pack-count half, `m3` row 8 and `B6` are applied at
    their sites**: the DR no longer says "has run twelve times";
    `yarn workspaces foreach -A run build` is `heuristic`; `buildCommand.ts:4` says "Twelve versions.
    Each of the first eleven"; the section says "**Ten** packs"; the seal-timing table's row 8 says
    `aab29486`; and `X7`, `X8`, `X9` occur **only** inside the quotation at `:1347`.

---

## BLOCKING

### B1 — `MANAGER_BOOLEAN`'s deletion warrant is refuted by twenty commands, and nine of ten planted builds ship unnoticed

- **Artifacts**: `packages/qfai/tests/helpers/buildCommand.ts:29-32`, `:43-48`, `:282-289`,
  `:609-616`; `.qfai/evidence/coverage-depth-spec-0017.md:265-271`;
  `.qfai/evidence/atdd-spec-0017.md:71-93`;
  `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:412-431`; the deleted set recovered
  from `f544daad:packages/qfai/tests/helpers/buildCommand.ts`
- **Contract**: `qfai-atdd/SKILL.md:282` Success Criteria (required `US` covered by E2E tests) and
  Not-done criteria (Coverage Depth Matrix / oracle strength); the record's own recurring-class item 7
  at `:1023-1025`, which states in writing that for this assertion **a miss is the vacuity direction**
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:282` Success Criteria plus Not-done
  criteria / `defect:correctness`

The round's central deletion claim is stated three times in the helper and once in the committed
matrix: `MANAGER_BOOLEAN`'s members "went to one rule — a manager flag consumes its value **only when
a later bare token exists to be the script**", and `:47-48` generalises it: "Each was a list whose
deletion changed no command's verdict."

**A command distinguishes it, and so do the other nineteen.** I recovered the deleted set from
`f544daad` and ran each member back through the live grammar:

```text
heuristic  yarn workspace pkg build          <- correct: a real build
none       yarn -w workspace pkg build
none       yarn --workspace-root workspace pkg build
none       yarn -r workspace pkg build
none       yarn --recursive workspace pkg build
none       yarn --silent workspace pkg build
none       yarn --quiet workspace pkg build
none       yarn --yes / -y / --frozen-lockfile / --if-present / --prod / --dev  workspace pkg build
none       yarn --no-bail / --offline / --force / --verbose / --stream         workspace pkg build
none       yarn --aggregate-output / --no-color / --parallel                   workspace pkg build

20 of 20 recovered boolean flags turn a real build into `none`
```

**The mechanism.** `MANAGER_CONSUMING` still holds `workspace`, and `:572-575` handles it — but only
if the loop reaches it. With a boolean flag in front, `:612-616` sees `value = "workspace"` (bare) and
`laterBare` true over `["pkg", "build"]`, so the flag **eats `workspace`**; `pkg` is then read as the
script, `script("pkg")` does not name a build, and the line is `none`. The one rule defeats the one
member the set was reduced to.

**This violates the invariant the file asserts twice**, and which the matrix records as the defect
that killed v5 and v7: one command, one verdict. Here the verdict is decided by whether a boolean
flag is present. The same shape appears without `workspace`:

```text
heuristic  pnpm build extra
none       pnpm --silent build extra
none       pnpm --silent build:prod extra
```

**And it is story-level, measured through the story's own loop.** Planting one form at a time into the
shipped orchestrator's lane placeholder (in-memory clone; control flags nothing):

```text
*** SHIPS UNNOTICED ***  yarn --silent workspace pkg build
*** SHIPS UNNOTICED ***  yarn -r workspace app build
*** SHIPS UNNOTICED ***  pnpm --silent build extra
REDDENS                  pnpm build
```

**Why this is not a product obligation upstream never asked for.** I am not asking for a new tool or a
new manager. `yarn`, `pnpm`, `workspace` and every one of the twenty flags are already declared or were
declared until this round; the defect is a **regression introduced by this round's deletion**, in the
grammar's own idiom, breaking an invariant the file states in its own words. It is demonstrable from
the changed artifacts, so it stays blocking.

**Required fix.** Either restore the boolean knowledge for the flags that need it, or narrow the one
rule so it cannot consume a token the manager's own grammar already claims — a flag's value is never a
`MANAGER_PASS` or `MANAGER_CONSUMING` member. Then add `yarn --silent workspace pkg build` and
`pnpm --silent build extra` as cases, re-run the plant, and correct `buildCommand.ts:47-48` and
`coverage-depth:265-271`: "deletion changed no command's verdict" is the claim that failed, and the
honest replacement names what was measured and over which commands.

### B2 — `SH_FAMILY` decides verdicts and is outside `GRAMMAR`, so "a sweep over every grammar member" is false; I deleted a member and all 23 tests stayed green

- **Artifacts**: `packages/qfai/tests/helpers/buildCommand.ts:363`, `:513`, `:693-720` (particularly
  `:697-700`); `packages/qfai/tests/unit/buildCommand.test.ts:111-160`, `:1005-1035`;
  `.qfai/evidence/atdd-spec-0017.md:77`, `:81-84`, `:1197`, `:1344`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs`); Evidence (MANDATORY); round 9
  `R03 B2`, which found exactly this — the sweep's reach is what `GRAMMAR` exports — and whose repair
  enumerated three of the four unexported decision-bearing things
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:361` / `defect:correctness`

`GRAMMAR`'s own docstring states the invariant: "The sweep's reach is exactly this object, so anything
that decides a verdict and is not here is unpinned by construction." Round 9's repair added
`scriptExtensions`, `executableExtensions`, `nameSeparators` and `rules`. It missed `SH_FAMILY`.

`SH_FAMILY = new Set(["bash", "sh", "zsh"])` at `:363` is read at `:513` and decides whether an
interpreter's clustered inline flag (`-lc`, `-ec`, `-euxc`) re-enters its argument as a shell line.
It is not in `GRAMMAR`, not in `grammarMembers()`, and the string `SH_FAMILY` occurs **zero** times in
`buildCommand.test.ts`.

**Measured, with the mutation reverted byte-identical in the same step.** I removed `"zsh"` — one
member of a three-member set:

```text
BEFORE sha256=429b2fef442dbbfc97e3600e32a98eabe4a8a5682e73d8c4203bec32ce2609f1

  tests/unit/buildCommand.test.ts   23 passed (23), exit 0     <- 296 member cases, every corpus,
                                                                 and the sweep itself: all green
  zsh -c  "pnpm build"    heuristic  ->  none
  zsh -lc "pnpm build"    heuristic  ->  none
  bash -c "pnpm build"    heuristic  ->  heuristic  (control, unchanged)

AFTER  sha256=429b2fef442dbbfc97e3600e32a98eabe4a8a5682e73d8c4203bec32ce2609f1   REVERT VERIFIED
```

`zsh -c "..."` is a real `run:` form, and the corpus has no `zsh` cluster case at all — only
`bash -lc 'pnpm build'` and `sh -c 'npm run build'`, in a different test.

**Three record claims are therefore false as written**: `:77` "an in-suite sweep over all ... grammar
members"; `:1197`'s instrument table row "every grammar member of the classifier"; and `:81-84`, which
says the families "establish that **deleting a rule reddens the corpus**". They establish it for the
members `GRAMMAR` exports.

**Required fix.** Put `SH_FAMILY` in `GRAMMAR` with a case per member (`zsh -c "pnpm build"` is one),
or state the exclusion where the completion gate reads it. Then re-audit properly: the invariant at
`:697-700` is a promise about a set, and the way to keep it is to enumerate every module-scope binding
the classifier reads and check each one is exported — not to add the ones a reviewer names.

### B3 — six prose counts the tree does not hold, four of them written into the commits that closed round 9's counting findings

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:247`, `:732-739`, `:851`, `:853`, `:1422`, `:1487`;
  `.qfai/evidence/coverage-depth-spec-0017.md:284`, `:287-291`;
  `packages/qfai/tests/helpers/buildCommand.ts:31`, `:285`, `:610`;
  `packages/qfai/tests/unit/buildCommand.test.ts:4`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs`), `:342` (`## Work performed`), Evidence
  (MANDATORY); round 9 `B3` and `M4`, and `:33-36`, which records this exact failure mode in this
  exact file
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

**1. The corpora numeral is stated twice, differently, in one file, over a list of eleven.**

```text
:247   "23 tests over the ten corpora enumerated at the Execution logs section (E4b)"
:732   "Measured against **nine** corpora, and this is the enumeration both evidence files count from"
:733   the list itself, counted: 11 items
```

And the cross-file claim is false. `coverage-depth:287-291` carries a **different** nine-item list:
round 5's 10 and round 6's 7 appear only there; round 6's 46, round 7's 59, round 9's 60 and its five
spelling pairs appear only in the atdd list. Round 9's `M4` asked for the corpora to be "enumerated
once, in one file, with the other linking to it, and make the numeral the list's length". Instead a
**second** numeral was added at `:247`. Parsed mechanically, the test file names **14** corpora
(`MEMBER_CASES` 296, `REGRESSIONS` 20, `KEPT` 15, `NOT_BUILDS` 17, `REGRESSED` 7, `SHOULD_BUILD` 8,
`SHOULD_NOT` 6, `MISSED` 6, `INVENTED` 4, `PLANTED` 11, `WRAPPED` 6, `STILL_NONE` 5, `PLANTED` 41,
`NOT_PLANTED` 16) — round 9 measured twelve.

**2. The grammar-member count is still 208 in the committed matrix, and it is 296.**
`coverage-depth:284` reads "it deletes each of the 208 remaining members in turn" — present tense,
about the current sweep. Measured two ways: `grammarMembers()` replicated in process gives **296**, and
`MEMBER_CASES` parsed gives **296 entries / 296 distinct labels**. Round 9's `B3` listed this exact
site and required "Replace all five with 250, or delete the numeral". The numeral was deleted in the
test file (`:946` now explains the defect instead of restating a figure — the right repair) and left
standing in the governance record.

**3. `MANAGER_BOOLEAN`'s "nineteen members" matches no revision.** Counted from git:

```text
9882a1d4   17 members
eb5d59af   18 members
f544daad   22 members     <- the revision immediately before 30a0ae5a emptied the set
```

Stated as nineteen at `buildCommand.ts:31`, `:285`, `:610` and `coverage-depth:268`. Three of those
four are in the file whose comments a reviewer reads to check the deletion argument of `B1`.

**4. "four of the seven closed packs" — there are nine.** `:1422` and `:1487` both say "four of the
seven closed packs missed it". Ten packs exist, nine are closed, and the table below `:1487` has nine
rows. Round 9's `M3` asked for exactly this sentence to be rewritten; the pack count was updated to
"Ten" and the closed-pack count was not.

**5. The test file's own docstring is two numbers behind.** `buildCommand.test.ts:4`: "**Eight**
review rounds measured **ten** versions of it". Nine rounds; `VERSION = 12`. Round 9's `M5` asked for
this line specifically ("`test:4` to eleven versions, and drop the round count") and it is unchanged.

**6. The `Q` family's heading says four over a block of seven.** `:851` is
`### Q1-Q4 — the matrix record's prose`; `:853` says round 5 broke it "**twice more**"; the block lists
`Q1` to `Q7`; and `## Final status` correctly says "seven on the matrix record's own prose". Three
sizes for one section. This is round 9 `B6`'s defect surviving in the heading that names the family —
the total was corrected and the label was not, which is what `B6` was about.

**Required fix.** Correct all six. Then take round 9's un-taken advice and put each under an
instrument, because five rounds of correcting these one at a time have not worked and
`stageEvidenceCounts` already reads all the inputs. The member count and the corpora count are
one-line derivations; the closed-pack count is `packsOnDisk().length - 1`; the version and round
counts are already available to it.

### B4 — the P7 currency sentence is false for the fifth round: five commits follow the sequence, not two, and they add zero e2e callsites, not one

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1086-1099`, `:1101-1113`, `:1129-1145`,
  `:1147-1152`, `:1162-1165`; measured with `git grep -c` over the project globs at eighteen revisions
  and with live `--project e2e` and `--project integration --project unit` runs
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Success Criteria `:294` (repository quality
  gates pass with evidence); round 3 `B4`, round 4, round 5 `B1`, round 7 `B4`, round 8 `B4`, round 9
  `B4`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

**Credit first: both totals are right.** `--project e2e` gives 1434 / 16 and
`--project integration --project unit` gives 1200 / 19, exactly as recorded. Round 9's `B4.3` is
closed and the second leg was re-measured.

**The sentence certifying them is not.** `:1089-1091` reads:

```text
**These numbers are measured at the working tree of this commit**, which carries every repair through
round 9. The e2e figure is 1434 and the integration+unit figure 1200; the sequence below reaches
`30a0ae5a` and the two commits after it add one e2e callsite between them.
```

Three defects.

1. **"the two commits after it" is five.** `git rev-list --count 30a0ae5a..HEAD` is **5**:
   `d4ea336c`, `70c50a9c`, `3a466b27`, `a163b52a`, `a66be5c6`.
2. **"add one e2e callsite between them" is zero, and the plus-one was in the other leg.** Callsites
   under each project's globs:

   ```text
              e2e   int+unit
   30a0ae5a   870   1161
   d4ea336c   870   1162   (+1)   <- the callsite, in the UNGUARDED leg
   70c50a9c   870   1162
   3a466b27   870   1162
   a163b52a   870   1162
   a66be5c6   870   1162
   ```

   The sentence contradicts the record's own arithmetic: 1422 plus (870 minus 858) = 1434 is the
   stated total, and one more e2e callsite would make it 1435.
3. **"this commit" is not a revision.** The same block says, 76 lines down: "A record naming HEAD is
   stale at the next commit; a record naming a revision plus a rule is not", and `:1098-1099`: "Three
   rounds asked for the revision beside the totals and got a round name instead; a round name cannot
   be checked, which is the whole reason those rounds asked." "This commit" is a fourth uncheckable
   form of the same reference — the sentence was written at `d4ea336c` and HEAD is `a66be5c6`.

**And the structural half of round 9's `B4` is unapplied.** It required "extend the invariant at
`:1109-1111` to the integration and unit globs, or add a second sequence, so the unguarded total stops
being the unguarded one". The record instead **discloses** that it did not: "the other total is
derivable the same way and is not yet derived" (`:1152`). The very next commit after that disclosure,
`d4ea336c`, moved the unguarded total by one — and the record then attributed that callsite to the
guarded leg. The asymmetry the record names as structural produced the defect again, one commit later.

**Required fix.** Name `a66be5c6` (or whichever revision the numbers are measured at) beside both
totals; correct the sentence to five commits and zero e2e callsites; extend the sequence or the
invariant to the integration and unit globs, which is the fix that stops this recurring.

### B5 — `### Findings per round` omits round 9's three responses while `## Final status` counts 26, and the round-4 slot still contradicts the table's own stated rule

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1259-1264`, `:1266-1292`, `:1294-1308`,
  `:1374-1383`, `:1385-1399`; `.qfai/review/review-20260821120000000/summary.json`;
  `.qfai/review/review-20260821020000000/R03_qa-gatekeeper.md`;
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole)
- **Contract**: `qfai-atdd/SKILL.md:298` (check that `## Final status` says what that pack says);
  Evidence (MANDATORY); round 9 `B2` and `m2`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:298` / `defect:correctness`

The table's preamble at `:1261-1262` states its own contract: "Every count below is **derived**:
distinct finding identifiers appearing as a heading in the report, counted from the packs on disk."

**1. Round 9's pack is on disk, closed and sealed, and has no rows.** The table holds **25 rows**, two
of which record non-responses ("did not run", "not routed"), so it enumerates **23** responses and
stops at round 8. `## Final status` at `:1375` counts **26**. Derived from the packs, the three missing
rows are:

```text
| 9 | implementation-reviewer | REVISE |  25 | B1-B4, M1-M9, m1-m12  |  25 |
| 9 | completion-reviewer     | REVISE |  22 | B1-B6, M1-M6, m1-m10  |  22 |
| 9 | qa-gatekeeper (stage)   | REVISE |  17 | B1-B8, A1-A9          |  17 |
```

This is round 9's `B2` inverted. It found the findings table carried forward to round 8 while the round
table and the "Confirmed by" sentence were not. Both of those were fixed — `:1385-1399` has nine rows,
`:1375` says nine / 26 / 25 — and the findings table was left a round behind. The record's own account
of the defect ("the findings table was carried forward ... while the round table ... and the 'Confirmed
by' sentence were not") is now true with the terms exchanged.

**2. The round-4 stage-gatekeeper slot still disagrees with the stated rule.** `:1300-1301` states it:
"identifier headings appear at level two or three, sometimes with a word prefix and sometimes
backtick-wrapped". Under that rule, `review-20260821020000000/R03_qa-gatekeeper.md` carries **nine**:

```text
level 3, backticked:  B1  B2  M4  M4b  B6  B6b
level 2, numbered:    "## 4. `B3` (BLOCKING)"   "## 6. `B4` (BLOCKING)"   "## 7. `B5` (BLOCKING)"
```

The table records **6** with families `B1, B2, M4, M4b, B6, B6b`. Round 9's `m2` reported this row and
asked for the count corrected; what changed is the **`id families` cell**, rewritten to list exactly
the six level-3 headings — so the cell now describes a narrower rule than the one the record states,
two paragraphs above it. Making the families match the count instead of deriving the count is the
recurring class at the level of the bookkeeping: the row is now self-consistent, and the rule it claims
to follow is not the rule stated. Every other row reproduces exactly under either reading, so this is
the one row standing between the table and its claim that "the derived one is the one to trust".

**Required fix.** Add round 9's three rows; correct the round-4 slot to 9, or state the level-3-only
rule the cell actually follows and reconcile it with `:1300-1301` and with round 7's P1d slot, which is
counted inline at 8. Then take round 9's `B2` instrument advice, which is the only thing that has
stopped a number recurring on this spec.

---

## MAJOR

### M1 — `cmake build`, `mvn build` and `sbt build` are still pinned as builds; round 9 `B1`'s requalify clause is unapplied

- **Artifacts**: `packages/qfai/tests/unit/buildCommand.test.ts:240`, `:245`, `:254`, `:305`, `:347`,
  `:348`, `:649-651`; `.qfai/review/review-20260821140000000/review_request.md:42-44`
- **Contract**: `qfai-atdd/SKILL.md` Not-done criteria (oracle strength); round 9 `B1`'s closing
  instruction — "delete or requalify the eleven TOOL-build cases whose command the tool does not have"
- **Severity: major** | **Traces to:** `qfai-atdd/SKILL.md` Not-done criteria / `defect:correctness`

Round 9 identified eleven `MEMBER_CASES` entries whose command the tool does not have.
`tsc -p tsconfig.build.json` was added, and the false-positive control corpus is now excellent — but
three cases remain, unannotated, asserting `build`:

```text
:245  ["TOOLS.cmake", "build", "cmake build"]    <- `cmake build` CONFIGURES ./build as the source dir
:305  ["TOOLS.mvn",   "build", "mvn build"]      <- not a Maven lifecycle phase
:347  ["TOOLS.sbt",   "build", "sbt build"]      <- not an sbt task
```

`cmake build` is the one that costs something. It is the **inverse** of the `cmake --install build`
case the corpus holds to stop `build`-as-a-directory being read as a verb, and asserting it as a build
means `US-0017-0004` fails the day a shipped lane legitimately configures with `cmake build` — the
test-that-punishes-its-own-fix shape this spec rejects in writing in two separate files. A grep for
"maven phase", "sbt task" or "configures" across the four artifacts returns nothing, so the cases carry
no requalification either.

**And the round summary claims otherwise.** `review_request.md:42-44` reads "**The corpus is built from
each tool's real build invocation.** Round 9 found eleven of thirty tool cases were commands the tool
does not have (`mvn build` is not a Maven phase; `cmake build` configures `./build`)" — naming the two
that are still there.

**Required fix.** Replace the three with the tools' real invocations (`cmake --build .`, `mvn package`
and `sbt compile` all already land correctly, so a member-pinning command that survives the key's
deletion has to be found — `cmake --install build` for the key, for instance), or annotate each as a
deliberate synthetic probe and say in the file that its expected verdict is not a claim about the tool.

### M2 — the Delta Rejected Guard's discharge of "a row that cannot fail looks like coverage" still overstates; 30 of 33 planted builds ship unnoticed

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:71-93`, particularly `:88-93`;
  `.qfai/specs/spec-0017/09_delta.md` `## Rejected`, third candidate;
  `.qfai/evidence/coverage-depth-spec-0017.md:180-190`
- **Contract**: `qfai-atdd/SKILL.md:145` (Delta Rejected Guard, Mandatory);
  `constitution/shared-skill-operating-baseline.md` Delta Rejected Guard
- **Severity: major** | **Traces to:** `qfai-atdd/SKILL.md:145` Delta Rejected Guard

**The section is genuinely better and round 9's `M6` is applied**: `:78-85` now separates the two
properties, names the sweep as an instrument for the guards rather than the story, and says in writing
that the previous version "discharged the option by citing the sweep, which is the naming-the-wrong-
instrument defect". `:90-93` even concedes that the story's discriminating power "has only ever been
established from outside". I ran the guard myself (verified item 21) and the conclusion holds: **no
rejected option is implemented and no RE-OPEN is required.**

One clause is still stronger than the tree supports. `:90` reads "the option is not reintroduced
*now*, in both senses, and both defences are measurements". Measured, through the story's own loop,
with real build invocations chosen from outside every corpus in the repository:

```text
30 of 33 planted builds ship without the story noticing
```

Three of the thirty are `B1`'s regression, in managers the grammar declares. The rest are undeclared
tools (`m5`). So "not reintroduced" is true of the forty-one pinned forms and false of the general
claim, and the delta's own Temptation — "a row that cannot fail looks like coverage" — still describes
`US-0017-0004` more accurately than the discharge does.

**Required fix.** Scope the sentence: the option is not reintroduced **over the forty-one forms two
reviewers planted**, and the story remains vacuous for a build the grammar does not declare. That is
the honest form and it costs nothing, because the matrix already scores the row as failing with a
qualified oracle.

### M3 — round 9 `B5`'s second half is unapplied: there is no `W10`, so the guard rebuilt this round has no oracle round on the record

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:912-928`, `:1343`;
  `packages/qfai/tests/assets/retractedClaims.test.ts:276-302`, `:304-334`, `:364-400`, `:485-514`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs` — every family defined there, round 5
  `B7`); round 9 `B5`'s closing instruction — "Record the round as `W10`, because the `W` family is
  where this guard's oracle rounds live"; the record's own countermeasure at `:1027-1030`, "every new
  claim gets an oracle round before it is reported"
- **Severity: major** | **Traces to:** `qfai-atdd/SKILL.md:361` / `defect:correctness`

`W10` occurs nowhere in the record; the `W` table stops at `W9` and `## Final status` says "nine on the
retracted-claims guard". Nor does anything in `## Execution logs` record round 9's falsification (the
fence-exemption launder) or the falsification of its repair (line-scoped exemptions, strict quote
parity, the odd-parity report). The guard was rebuilt for the fifth time this round and its oracle
round exists only in round 9's report and in the test's own docstring — and a completion gate reads
neither, which is the sentence `:914-916` writes about this same file.

I verified the repair works (verified item 20), so the substance is there and the record is missing.

**Required fix.** Add `W10` (round 9's two-line launder, reddening) and `W11` (the same launder against
the line-scoped rule, still reddening) with the control, and correct the `## Final status` tally.

### M4 — round 9 `B2` and `B3`'s instrument halves are unapplied: nothing derives the round, response or member counts

- **Artifacts**: `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole);
  `packages/qfai/tests/assets/retractedClaims.test.ts:181-204`;
  `.qfai/evidence/atdd-spec-0017.md:1374-1383`
- **Contract**: `qfai-atdd/SKILL.md:298`; Evidence (MANDATORY); round 9 `B2` ("put the three counts
  under an instrument") and `B3` ("pin the member count the way the pack numeral is pinned")
- **Severity: major** | **Traces to:** `qfai-atdd/SKILL.md:298` / `defect:correctness`

`stageEvidenceCounts.test.ts` derives per-file test counts, recorded vitest outputs, the modifier-chain
precondition, its own callsite counting, the annotated-describe count, the ledger guard's output, and
the pack names and seals. It does **not** derive the round count, the response count, the verdict
split, the corpora count or the grammar-member count. The `COUNTED_CLAIMS` entry in
`retractedClaims.test.ts` matches only the "N packs, one per round" shape. Greps for "reviewer
responses", "REVISE and one PASS", "grammarMembers" and "member count" across `tests/assets/**` return
nothing.

The nine / 26 / 25 figures are correct at this revision (verified item 12) — and `B3` and `B5` are the
prices of them being unpinned: five numbers wrong and a table a round behind, in the round that closed
round 9's findings about numbers. `:1381-1383` already argues the case in its own words: "the number
was right and unreproducible".

**Required fix.** Three assertions against `packsOnDisk()` and the per-pack report listing, plus one
comparing the member numeral in both evidence files against `GRAMMAR`. Round 9 offered both, and both
are one-liners over data these guards already read.

### M5 — the retracted-claims guard's stated coordinate model is false for 50 of 456 paragraphs and displaces fourteen live exempt spans

- **Artifacts**: `packages/qfai/tests/assets/retractedClaims.test.ts:304-334` (particularly the
  docstring at `:313-316`), `:371-383`, `:485-514`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the record's recurring-class item 7 at
  `:1005-1030` — a claim asserted over how something is written rather than what it does
- **Severity: major, high confidence (measured); no live verdict changes** | **Traces to:**
  `qfai-atdd/SKILL.md` Evidence (MANDATORY) / `defect:correctness`

The repair for round 9's `B5` rests on a stated property of the code, quoted from `:313-316`:
"flattening collapses runs of whitespace, so a paragraph's flattened text is its lines' flattened texts
joined by single spaces, and a line's span is derivable by accumulating lengths."

That is false whenever a line carries leading indentation. Flattening a **line** collapses its indent
to one space and **keeps** it; flattening the **paragraph** collapses the newline-plus-indent to a
single space. Measured over the five governance files:

```text
paragraphs                                                456
paragraphs where per-line-joined != paragraph-flattened     50   (length deltas 1 to 8)
of those, paragraphs that also carry an exempt span         14
```

In two of the fourteen the computed span **ends past the end of its own paragraph** (`[354,404]` in a
399-character paragraph; `[476,476]` in a 471-character one), and because the caller shifts spans by
the paragraph's offset in the joined text, an over-running span leaks into the following paragraph. The
displacement also means the exempted characters are not the fence line's:

```text
guard exempts : "s/unit/buildcommand.test.ts where it belongs)"
intended line : " tests/unit/buildcommand.test.ts where it belongs)"
```

**Nothing changes verdict today**, and I state that rather than overstate the finding: comparing the
shipped model against a corrected one (locate each line's flattened text inside the paragraph's own
flattening), **0 of 382 quote marks** are classified differently and both models give **0**
odd-parity offenders. The leak window is bounded by the accumulated indentation, so it is too small for
a real needle. Latent, not live.

**Why major rather than minor.** It is the fourth wrong instrument the request asked me to look for: a
property asserted about the code, in the docstring of the repair for a finding about exactly that
class, and false. The odd-parity test at `:498` also depends on these spans, so the guard that now
reports stray quote marks reports them against displaced ranges.

**Required fix.** Derive each line's span from the paragraph's own flattening, or trim each line before
measuring, and assert the invariant the docstring claims — that the per-line spans reconstruct the
paragraph — over the five governance files.

### M6 — `mvnw` is absent while `gradlew` is present, against the file's own stated alias rule

- **Artifacts**: `packages/qfai/tests/helpers/buildCommand.ts:206-214`, `:36-39`, `:178-261`
- **Contract**: `qfai-atdd/SKILL.md` Not-done criteria (oracle strength); the rule the file states at
  `:206-208` — the gradle wrapper script is the same tool, one definition, so a flag added to gradle
  cannot be forgotten for it
- **Severity: major** | **Traces to:** `qfai-atdd/SKILL.md` Not-done criteria / `defect:correctness`

```text
build   ./gradlew build     ./gradlew assembleRelease    ./gradlew --no-daemon assembleRelease
none    ./mvnw package      ./mvnw -B package            mvnw package
build   mvn package
```

The Maven wrapper ships in the root of every Maven project generated this decade, and
`./mvnw -B package` is the canonical Maven CI line — at least as common as `./gradlew`, which the file
declares and explains. This is not a request for a new tool: the `mvn` grammar exists, the alias
mechanism exists and is used five times (make/gmake, python/py, gradle/gradlew, docker/podman,
pwsh/powershell), and one line closes it. The asymmetry is what makes it a finding rather than a wish:
the file's own stated principle is applied to one wrapper script and not to the other.

**Required fix.** Alias `mvnw` to the `mvn` grammar the way `gradlew` is aliased, add its pinning case,
and re-run the plant.

### M7 — the recurring-class list at `## Gaps / Open risks` item 7 is incomplete

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1005-1030`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY), `## Gaps / Open risks`; the item's own
  claim to be the canonical list whose count is its length
- **Severity: major** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The seven entries are each correct, and dropping the count so the list carries it is the right repair.
The list is not canonical, because at least three instances added **this round** belong on it, and one
of them is the round's central deletion argument.

1. **The `MANAGER_BOOLEAN` deletion warrant** (`B1`). "Each was a list whose deletion changed no
   command's verdict" is a claim over the commands this stage enumerated, not over the commands that
   exist. Twenty distinguish it. This is entry 5 one layer further out than round 9 took it: round 8
   found probes generated from the sets, round 9 found the corpus written from the member list, and
   this is the **deletion** justified by that corpus's silence.
2. **The retracted-claims guard's coordinate model** (`M5`). A stated property of the code, false for
   50 of 456 paragraphs, written in the repair of a finding about this class.
3. **"this is the enumeration both evidence files count from"** (`B3.1`). A claim about how the two
   files are written, false of both, written to close a finding about counting.

A fourth candidate, weaker, and offered as such: **the round-4 findings slot** (`B5.2`), where the
families cell was rewritten to agree with the count rather than the count derived from the stated
rule — a claim about how the row is written standing in for the measurement.

**Required fix.** Add them. The item is the record's own summary of what has gone wrong nine times, and
it is the one place a later reader will look.

---

## MINOR

### m1 — the seal-timing table's row 9 says "(this commit)", which is round 9's `m3` one row down

`:1500` reads `9  (this commit)  (this commit)  same commit`. Traced with
`git log --diff-filter=A`, round 9's last report and its `summary.json` both landed at **`a163b52a`**,
and HEAD is `a66be5c6`, so "(this commit)" resolves to nothing a reader can check. Round 9's `m3` made
this exact objection about row 8 and required `aab29486` written in; row 8 now says `aab29486` and row 9
repeats the defect. **Rows 1-8 all reproduce exactly** against `git log --diff-filter=A`
(58c29d9f/58c29d9f, a241b90e/2d3426aa, 2d3426aa/2d3426aa, 0cfa67c9/0cfa67c9, c40b2358/cb91e089,
ac4700d1/9a37421c, 9882a1d4/dbe00247, aab29486/aab29486), so the table's substance is sound. Write
`a163b52a`. **Severity: minor** | **Traces to:** `qfai-atdd/SKILL.md:298`.

### m2 — the version pin reads one of the two files that carry the sentence it pins

`coverageDepthMatrix.test.ts:356-368` requires every sentence naming the helper's version and file to
name the exported `VERSION`, and it reads **only** `coverage-depth-spec-0017.md`. The same sentence
occurs at `atdd-spec-0017.md:724` and is unpinned. Both say v12 today, so nothing is wrong — but this
is the reach-narrower-than-the-claim shape of `B2` and of round 9's `R03 B7`, and the fix is to read
both files in the same loop. The helper's own count sentence is also unpinned, which round 9's `M5`
asked for and which `B3.5` shows still matters. **Severity: minor, high confidence** | **Traces to:**
`qfai-atdd/SKILL.md:361` / `defect:code-quality`.

### m3 — three laundering routes survive the retracted-claims guard, all of them shown rather than asserted

Measured on copies under `tmp/r10/launder/`, with the subject's sha256 printed before and after and
identical, and `git status --porcelain` empty:

```text
WOULD REDDEN                     plain reassertion
WOULD REDDEN                     reassertion + fence opening on the next line   <- round 9 B5, closed
*** LAUNDERED (stays GREEN) ***  the claim as a fence INFO STRING
*** LAUNDERED (stays GREEN) ***  the claim on the closing fence line
*** LAUNDERED (stays GREEN) ***  the claim on a blockquote line
```

The exemption is line-scoped now but still **whole-line**: everything after a fence marker on the same
line is exempt. The blockquote route is defensible (a blockquote is a quotation), and the
closing-fence route renders as code. The **info-string** route is the real residual: an info string is
not rendered at all, so the claim is invisible to a reader of the document and exempt from the guard,
while a reader of the raw file sees it asserted. Exempt the fence *content*, not the delimiter line's
tail. **Severity: minor, medium confidence on exploitability** | **Traces to:** `qfai-atdd/SKILL.md`
Evidence (MANDATORY) / `defect:code-quality`.

### m4 — `make -n build` is a build while `make --dry-run build` is not

```text
none   make --dry-run build
build  make -n build
build  make --just-print build
```

`-n` and `--just-print` are make's spellings of `--dry-run`, which is in `NEVER_FLAGS`. One command,
three spellings, two verdicts — the invariant round 9's `M2` was about, in the false-positive direction
this time. Impact is small (a shipped lane running `make -n build` would be reported as building), and
the rest of the false-positive corpus is clean at 21 of 22. Either give the tools their own never-flag
spellings, or add `-n` and `--just-print` where they are unambiguous. **Severity: minor** |
**Traces to:** `qfai-atdd/SKILL.md` Not-done criteria / `defect:correctness`.

### m5 — the classifier's closed-world limit is not stated where the completion gate reads it

Round 9's `B1` offered two remedies and said adding twenty-five tools would be a product obligation
upstream never asked for. I agree, so this is **not** a request for tools — it is a request for the
sentence round 9's option 2 asked for. Planted through the story's own loop, none of these is seen:

```text
next build              ng build --configuration production      nuxt build
gulp build              grunt build                              deno task build
corepack pnpm build     ant dist                                 cabal build all
hugo --minify           jekyll build                             mkdocs build
mix compile             dart compile exe bin/main.dart           sphinx-build -b html docs _build
buck2 build //...       nix build .#default                      helm package charts/app
goreleaser build --snapshot --clean                              packer build template.pkr.hcl
tox -e build            R CMD build .                            elm make src/Main.elm
shards build --release  bundle exec rake build                   pnpm dlx @vercel/ncc build src/index.ts
```

`next build` and `ng build` are the two that matter — the dominant build lines of two of the largest JS
ecosystems, in a scaffold shipped to adopters. The helper's "What no command-line scan can see"
paragraph names only the spawned-helper case; nothing in either evidence file says that a build by an
undeclared tool returns `none`, or that this is the **vacuity** direction for `US-0017-0004`. Say it
where the completion gate reads it, in the matrix's oracle-strength justification.
**Severity: minor** | **Traces to:** `qfai-atdd/SKILL.md` Not-done criteria / `defect:correctness`.

### m6 — round 9's `m4` is half applied: round 7's superseded seal still lacks the note that it cannot recompute

`:1461` now annotates round 7's superseded value with the edit it preceded, which is the half round 9
asked for. The other half is missing: `:1547-1551` explains superseded values on the ground that "the
first seal still reproduces over the three reports **as they stand now**" — which I verified for
round 1 (verified item 8) and which is **not** true of round 7's, because that pack's `summary.json`
changed. Two clauses would close it. **Severity: minor** | **Traces to:** `qfai-atdd/SKILL.md:298`.

### m7 — the round-10 pack currently holds an ignored, untracked sibling report

`git status --porcelain --ignored .qfai/review/review-20260821140000000` reports one ignored
implementation-reviewer report, and `git ls-files` on that directory lists **1** path against **2** on
disk. This is the state `:1477-1484` describes for rounds 8 and 9: `.gitignore:61` ignores
`.qfai/review/*`, so a pack reaches the repository only by `git add -f`, and an ignored file is
invisible to a plain `git status --porcelain`. The countermeasure the record records is exactly the
command above, run before sealing. This is a **sequencing note on my own round**, not a gap in the
subject — the pack is in flight and this report will land untracked too. Recorded so the sealing step
force-adds every file. **Severity: minor** | **Traces to:** `qfai-atdd/SKILL.md:298`.

### m8 — `make release` and `make dist` are `none`

`make` declares one build subcommand and a bare-invocation build, so `make` and `make all` are builds
and `make release` / `make dist` are not. Both are conventional build targets, and unlike `m5` this is a
tool the grammar declares with a subcommand list that could hold them. I raise it at **low confidence**
because a Makefile target's meaning genuinely is not knowable from the command line, and `heuristic`
rather than `build` may be the right verdict. **Severity: minor, low confidence** | **Traces to:**
`qfai-atdd/SKILL.md` Not-done criteria / `defect:correctness`.

---

## Rulings on the questions put to me

### 1. Plant builds again, with forms nobody in this repository has written

**Done, and it came back dirty. 30 of 33.** Method: parse
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, clone the parsed document in
memory, replace the first lane-placeholder echo with one planted form, and run the story's own loop
from `spec0017LayeredCiScaffoldE2E.test.ts:412-431` — same comment stripping, same
`classifyBuildCommand(command)` with no script map. The unmodified control flags nothing. No tracked
file was touched.

The thirty split into two classes, and the split is the finding:

- **three are regressions this round introduced** in managers the grammar declares —
  `yarn --silent workspace pkg build`, `yarn -r workspace app build` and `pnpm --silent build extra`
  (`B1`). These are blocking.
- **twenty-seven are undeclared tools** (`M6`, `m5`). Of these I raise only `mvnw` as a defect, on the
  grammar's own alias rule; the rest is a **stated-limit** obligation, not a tools obligation, exactly
  as round 9 framed it.

**And the negative result, because you asked for it.** Round 9's twenty are **completely closed** — 0
of 20 — and I could not break the per-tool subcommand grammars, the wrapper's found-tail rule or the
interpreter re-entry at all. `mvn -B package`, `gradle assemble`, `dotnet publish`, `sbt assembly`,
`make`, `make all`, `ninja`, `rake`, `scons`, `meson compile -C builddir`, `go install ./cmd/...`,
`python3 setup.py bdist_wheel`, `docker-compose build`, `docker buildx build --push .`,
`cross-env NODE_ENV=production pnpm build`, `xvfb-run -a -s "-screen 0 1024x768x24" pnpm build`,
`yarn workspaces foreach -A run build`, `bash -c "pnpm build"`, `zsh -euxc "pnpm build"`,
`pnpm exec tsc -b`, `./gradlew --no-daemon assembleRelease`, `swift build -c release`,
`flutter build apk --release`, `zig build`, `poetry build`, `stack build`, `dune build`,
`nx build my-app`, `turbo run build`, `bazel build //...`, `buck build //...`, `rush build`,
`lerna run build`, `just build`, `task build`, `waf build`, `python -m build`, `py -m build` and
`cmake --build build --config Release` all land correctly. **The false-positive side is 21 of 22** and
includes every trap earlier rounds found. v12's per-family grammar work is sound; what broke is a
**deletion**, which is a different act from an addition and was measured by a different method.

### 2. Three instruments were wrong and you caught them by falsifying. Look for the fourth

**Found it, in the guard next to the one you named.** `retractedClaims.test.ts:313-316` asserts a
property of its own code as the warrant for round 9's `B5` repair — that a paragraph's flattened text
is its lines' flattened texts joined by single spaces — and it is false for **50 of 456** paragraphs,
displacing **14** live exempt spans and running two of them past the end of their own paragraph
(`M5`). It changes no verdict today, which is why reading the code would not find it and only comparing
the two coordinate models does.

The version pin itself I could not fault: it reads the exported `VERSION`, requires the anchored
sentence, uses `matchAll` rather than `exec`, and both sentences in the matrix say v12. Its one
residual is reach, not correctness (`m2`).

### 3. Break the deletion sweep, again

**Broken, on scope rather than on strength.** Its two assertions are exact over what it enumerates: I
replicated `grammarMembers()` line for line at **296**, `MEMBER_CASES` parses to **296 entries and 296
distinct labels**, and the test now asserts the strong property (the member's own case notices) as well
as the weak one — which is the recommendation round 9 made, and it was taken. I could not make any
enumerated member survive.

What I could do is delete a decision-bearing member the sweep cannot see. `SH_FAMILY` is not in
`GRAMMAR`, and removing one of its three members left **all 23 tests green** while
`zsh -c "pnpm build"` moved from `heuristic` to `none` (`B2`, with the byte-identical revert printed).
So: **round 9's `R03 B2` is not closed.** Its repair added the three unexported things a reviewer named
and did not answer the question that would have found the fourth — which module-scope bindings does the
classifier read, and is each of them exported? The invariant in `GRAMMAR`'s docstring is a promise
about a set, and it is still enforced by inspection.

### 4. The eight deletions, and `MANAGER_BOOLEAN` in particular

**You picked the right one, and the argument does not hold.** `B1`: twenty of the twenty recovered
members change a command's verdict, the command is `yarn <flag> workspace pkg build`, and the mechanism
is that the replacement rule eats the one member `MANAGER_CONSUMING` was reduced to. The invariant
broken is the file's own — one command, one verdict — and the direction of the miss is the vacuity
direction, so it reaches the story: three planted forms ship unnoticed.

**The general lesson, offered because it is the load-bearing one.** Each deletion rests on "no command
distinguishes this member", and the commands are the corpus. That makes a deletion **strictly weaker**
than an addition under the same corpus: an addition is checked by a case that has to pass, a deletion
is justified by cases that stay silent. And the eight deletions were verified by the instrument round 9
proved has authority only over the set it enumerates. Two of the other seven I could not falsify — the
non-bundler set and the wrapper boolean list are genuinely subsumed by the found-tail rule, and
`pnpm --no-frozen-lockfile build` does keep its script — so I am **not** asking for the deletions to be
reverted wholesale. I am asking for the one that fails to be fixed, and for the warrant sentence at
`buildCommand.ts:47-48` to say what was measured over what.

### 5. The numbers you derived rather than typed, and whether any prose count survives that is not derived

| figure | recorded | measured |
| --- | --- | --- |
| `## Final status` rounds / responses / verdicts | 9 / 26 / 25+1 | **exact** — 2/4/3/3/3/3/3/2/3 from `FIRST_PACK`, 25 FAIL and one PASS |
| the `### Findings per round` table | 25 rows, 23 responses | **exact for all 23 present**, id family by id family — and **round 9's three are missing** (`B5`); one row disagrees with the stated rule (`B5.2`) |
| the ten pack seals | nine values plus one in flight | **all nine recompute** LF-normalised; round 1's superseded value also reproduces |
| the P7 sequence, e2e column | 858 to 870 | **exact at all thirteen revisions**, and 1422 plus 12 = 1434 = measured |
| the P7 totals | 1434 / 1200 | **exact**, both legs run |
| the P7 currency sentence | two commits, one e2e callsite | **five commits, zero e2e callsites** (`B4`) |
| the corpora | 10 at `:247`, 9 at `:732` | **11 items in the list; 14 named in the test file; the two evidence files hold different lists** (`B3.1`) |
| the ledger | 82 / 74 / 6 / 2 | **exact**, and 71/11, 63/6/2, 11/0/0 |
| the matrix | 38 cells, A30 / B7 / C1, 3 / 1 / 5 | **exact**, cell by cell, complete and disjoint |
| the grammar members | 208 at `coverage-depth:284` | **296** (`B3.2`) |
| `MANAGER_BOOLEAN` | nineteen | **17 / 18 / 22** — no revision holds nineteen (`B3.3`) |
| closed packs | four of seven | **nine closed** (`B3.4`) |
| the test docstring | eight rounds, ten versions | **nine, twelve** (`B3.5`) |
| the `Q` family | heading four, prose "twice more" | **seven** (`B3.6`) |
| the gates | scoped `error=2`, full `error=4`, `ci:lint` 11, `verify:pack` 0 | **exact**, with membership |
| the unbacked ledger claims | 127 of 208 | **exact**, counted two ways |
| the planted forms pinned | forty-one | **exact** — the array holds 41 |

**Direct answer: yes, prose counts survive that nothing derives, and six of them are wrong.** The
pattern is sharp enough to be worth stating on its own: **every figure an instrument derives is
correct** — the matrix, the seals, the per-file test counts, the annotated describes, the guard output,
the pack numeral — and **every figure that is wrong is one nothing derives**. Round 9 asked twice for
the remaining ones to be pinned (`B2`, `B3`) and both instrument halves were skipped (`M4`); this round
then produced five new wrong counts, four of them in the commits that closed those very findings. That
is the fourth consecutive round in which correcting the numbers one at a time has failed, and the fifth
in which the instrument was the fix nobody took.

---

## Required fixes (blocking only)

1. **`B1`** — stop the one manager-flag rule consuming a token the manager's own grammar claims (or
   restore the boolean knowledge for the flags that need it); add `yarn --silent workspace pkg build`
   and `pnpm --silent build extra` as cases; re-run the plant; and rewrite the "deletion changed no
   command's verdict" warrant to say what was measured over what.
2. **`B2`** — put `SH_FAMILY` in `GRAMMAR` with a case per member, or state the exclusion where the
   completion gate reads it; and audit every module-scope binding the classifier reads against the
   export, rather than adding the ones a reviewer names.
3. **`B3`** — correct all six counts: the corpora numeral (one enumeration, one file, numeral equals
   list length), `coverage-depth:284`'s 208, "nineteen" at four sites, "four of the seven closed packs"
   at two, `buildCommand.test.ts:4`, and the `Q1-Q4` heading with its "twice more".
4. **`B4`** — name the revision beside both P7 totals; correct the sentence to five commits and zero
   e2e callsites; and extend the sequence or the invariant to the integration and unit globs.
5. **`B5`** — add round 9's three rows to `### Findings per round`; correct the round-4 slot to 9, or
   state the narrower rule the cell follows and reconcile it with the rule paragraph above it.

## Advisory / Change Request proposals

- Requalify or replace `cmake build`, `mvn build`, `sbt build` (`M1`).
- Scope the Delta Rejected Guard's "not reintroduced" clause to the forty-one pinned forms (`M2`) —
  the conclusion holds and **no RE-OPEN is required**.
- Record `W10` and `W11` for the retracted-claims guard's fifth rebuild (`M3`).
- Pin the round, response and member counts in `stageEvidenceCounts.test.ts` (`M4`).
- Fix the retracted-claims guard's coordinate mapping and assert the invariant its docstring claims
  (`M5`).
- Alias `mvnw` to the `mvn` grammar (`M6`).
- Add the three new instances to the recurring-class list (`M7`).
- The minors: the seal-timing row 9 (`m1`), the version pin's reach (`m2`), the fence-info-string route
  (`m3`), make's dry-run spellings (`m4`), the closed-world limit in the matrix's oracle-strength
  justification (`m5`), round 7's superseded seal note (`m6`), force-adding this pack (`m7`),
  `make release` (`m8`).
- **A pack in flight breaks two gates, for the sixth round.** `QFAI-REVIEW-004` and `-005` fire on
  `review-20260821140000000`, which cannot hold reviewer responses when the directory is created — and
  creating it first is what fixed round 1's moving-tree problem. Per
  `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations` this is a product
  obligation upstream never asked for, so it **must not gate this rework**; a `CR-*` against whichever
  skill owns `review-artifact-layout.md` is its home. Nothing in my blocking set depends on it.
- **A shadow-root recipe correction for the next round's request**, offered because two rounds have now
  lost time to it: `MSYS=winsymlinks:nativestrict` in the parent environment does **not** stop Git Bash
  `ln -s` copying, and Python `os.symlink` needs `target_is_directory=True` for the links whose targets
  are directories — without it `readlink` is correct, `fs.stat` is `ENOENT`, and `QFAI-LINK-001`
  reports 70 dangling wrappers that are a shadow artifact rather than a repository state.

## Open risks / residuals

- **Every gate I ran is the colour the record claims.** `--project e2e` 1434 / 16 exit 0;
  `--project integration --project unit` 1200 / 19 exit 0; `ci:lint` exit 0 with eleven members;
  `verify:pack` exit 0; the ledger guard 8 backed exit 0 and repo-wide exit 1 at 127 of 208; scoped
  validate `info=2 warning=0 error=2` exit 1; full profile `info=4 warning=404 error=4` exit 1 with all
  four members identified. **CI is the colour I cannot certify**, and I found no reason to think a clean
  checkout differs — the seal function normalises line endings and all nine seals recompute.
- **The classifier is sound where it was last broken and broken where it was last shrunk.** Additions:
  0 of 20 round-9 forms still missed, 21 of 22 non-builds rejected, 0 disagreements across the spelling
  pairs round 9 named, 0 across the per-tool flag grammars I re-probed. Deletions: `MANAGER_BOOLEAN`
  fails (`B1`) and `SH_FAMILY` was never in the sweep's reach (`B2`).
- **The instruments derive everything they cover, and the record's uncovered numbers keep failing.**
  Nine of nine seals, 38 of 38 matrix cells, every per-file test count and every recorded vitest output
  are exact. Six prose counts are wrong and none of them is pinned; round 9 asked twice.
- **`## Ledger rows advanced` remains substantively true.** Both rows are still `todo` with `DR-ID: -`
  and `Blocked-By: -`, read cell by cell; the handover table says exactly that; the six `blocked` rows
  and their `Blocked-By` values reconcile with the eight TCs `QFAI-ATDD-112` names. Nothing analytical
  is owed on either row, and **nothing in my blocking set touches P1d**, which closed at round 7.
- **The stage's Definition of Done is not met, and the record says so.** `US-0017-0007` uncovered, the
  scoped gate at `error=2`, both ledger writes outstanding, an `exception` still needing a user-approved
  `TDDLIST-001` waiver, and the Stage-Minimum-Roles breach for P2-P4 unrepairable retroactively.
  `## Final status` is `FAIL` and that is correct.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; `check-atdd-annotation-ledger.mjs` closes that direction for `spec-0017` only and is
  still not among `ci:lint`'s eleven members.
- **Concurrency.** A sibling reviewer's report appeared in this pack while I ran; I did not open it. Own
  shadow root (torn down after an escaping-link check), own scratch (`tmp/r10/`). The tracked
  `.qfai/report/validate.log` was never written by me, and any run-log pointer in the working tree may
  reflect another run.

## PENDING

- **None.** Every gate the P7 block names was run, including `verify:pack`, which round 9 could only
  declare `PENDING`. Not re-run, and no finding above rests on them: the resolver mutations `E6`-`E11`,
  the matrix families `M*` / `X*` / `Y*` / `Q*`, the ledger ratchet `R1`-`R3`, and the loop guard
  `G1`-`G3`. The four vitest projects the P7 block does not name were not run either; no figure in the
  record depends on them.

## Evidence checked

- `.qfai/review/review-20260821140000000/review_request.md`;
  `.qfai/review/review-20260821120000000/R02_completion-reviewer.md` (whole, all 22 findings traced to
  their sites) and its `summary.json`; all ten packs' file listings, `summary.json` values,
  tracked-versus-disk counts, per-file blob hashes filtered and unfiltered, seal recomputation in both
  serializations, and `git log --diff-filter=A` per pack; every report's heading-borne identifier set
  under two rules
- `.qfai/evidence/atdd-spec-0017.md` (whole, 1564 lines);
  `.qfai/evidence/coverage-depth-spec-0017.md` (whole, 421 lines, parsed mechanically)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically: 82 data rows of nine cells;
  `:107-108` read cell by cell); `07_Decisions.md` at `:133`, `:137`, `:203`, `:206`, `:242`, `:249`
  and its nine unique decision ids; the `## Rejected` section of `09_delta.md`, three candidates, read
  in full
- `.qfai/decisions/DR-0017-0010-*.md`, `CR-20260820-0011-*.md`, `CR-20260820-0012-*.md`
- `.claude/skills/qfai-atdd/SKILL.md` (whole, 499 lines)
- `packages/qfai/tests/helpers/buildCommand.ts` (whole, **executed**, and mutated once with a
  byte-identical revert); `packages/qfai/tests/unit/buildCommand.test.ts` (whole; the member table and
  every corpus array parsed; the member enumerator replicated);
  `packages/qfai/tests/assets/retractedClaims.test.ts` (whole; its four helpers replicated, plus a
  corrected-coordinate variant); `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole; its
  blob and seal functions replicated);
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (whole);
  `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:1-70` and `:390-435`;
  `packages/qfai/vitest.workspace.ts`; the root `package.json`; `tests/e2e/qfai-traceability.md`;
  `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`
- `f544daad`, `eb5d59af` and `9882a1d4` of `packages/qfai/tests/helpers/buildCommand.ts`, for the
  recovered boolean set and its size at each revision
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` at start and finish;
  `git ls-files -s` (83 tracked symlinks); a `git archive HEAD` shadow root with native
  relative-target symlink re-materialisation (83 created, 83 verified against `git cat-file blob`,
  0 escaping links, torn down); shadow-root `validate --profile atdd --fail-on error --spec 0017`
  (`info=2 warning=0 error=2`, exit 1, zero `QFAI-LINK-001`) and `--profile full`
  (`info=4 warning=404 error=4`, exit 1) with the two ATDD rule memberships extracted per spec from
  the shadow's `validate.json`; `pnpm ci:lint` (exit 0); `pnpm verify:pack` (exit 0); vitest
  `--project e2e` (**1434 / 16**, 84 files, exit 0), `--project integration --project unit`
  (**1200 / 19**, 171 files, exit 0), and the three asset guards plus the classifier's unit file
  individually; the ledger guard scoped (8 backed, exit 0) and repo-wide (exit 1, 127 unbacked of
  208); e2e and integration-plus-unit callsite counts at **eighteen** revisions via `git grep -c` over
  the project globs; seal recomputation over all ten packs in both blob serializations plus round 1's
  superseded value over the three reports alone; **in-process execution of the classifier over
  130-plus probes**; **the shipped-lane plant through the story's own loop, twice, 43 forms**, against
  an in-memory clone; **a one-member deletion of a decision-bearing set with the full unit corpus
  re-run and a byte-identical revert**; the retracted-claims oracle and five laundering routes against
  copies, plus a paragraph and coordinate-model census; the ledger parsed mechanically; and the
  audit-hash procedure

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to none
- [x] Required gates and residual risks are recorded; **no gate is `PENDING`** — every gate the P7
      block names was run, including the one round 9 could not
- [x] No mutation persisted: HEAD `a66be5c6` at start and at finish; `git status --porcelain` empty at
      both; the one tracked-file mutation reverted in the same step with sha256 and blob hash printed
      before and after and identical
      (`429b2fef442dbbfc97e3600e32a98eabe4a8a5682e73d8c4203bec32ce2609f1` and
      `d1d28068ea13ff5934ae9307fe919b93760972eb`); `.qfai/report/validate.log` still blob
      `4883090b0aa3aa8c251e9fc7f382d6d2cbacf518`, equal to its value at HEAD; both validate run-logs
      inside the shadow root; the shipped workflow never written, because the plant ran against an
      in-memory clone; the evidence file's sha256 identical before and after the laundering
      demonstration; scratch under `tmp/r10/` only
