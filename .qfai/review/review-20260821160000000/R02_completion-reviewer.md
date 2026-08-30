**Verdict: REVISE.**

# Completion review — round 11, `spec-0017`, `/qfai-atdd` stage gates

Role: `completion-reviewer` (blocking, per `agent-routing.yml` atdd review phase).
Scope: the completion contract and the record — `.qfai/evidence/atdd-spec-0017.md`,
`.qfai/evidence/coverage-depth-spec-0017.md`, `.qfai/decisions/DR-0017-0010-*`,
`.qfai/decisions/CR-20260820-0011-*`, `.qfai/decisions/CR-20260820-0012-*`,
`.qfai/specs/spec-0017/**`, and `.claude/skills/qfai-atdd/SKILL.md`'s own Definition of Done.

**P1d is not re-opened.** It passed at round 7, pass 6, revision `9a37421c`, on `DR-0017-0010`. I
verified only that the record around it agrees with the DR's own `Status` field, which it does.

## Revision and tree state

| moment | `git rev-parse --short HEAD` | `git status --porcelain` |
| ------ | --------------------------- | ------------------------ |
| start (11:22) | `4b58eadd` | ` M .qfai/report/validate.log` / ` M .qfai/report/validate.spec-0017.json` |
| finish (11:52) | `4b58eadd` | ` M .qfai/report/validate.log` / ` M .qfai/report/validate.spec-0017.json` |

HEAD did not move. Both modified paths were **already modified when I started** and I did not
write to either; the `validate.spec-0017.json` delta is the subject of `B6` below.

**The pack moved under me.** `R01_implementation-reviewer.md` landed at 11:47:19 and
`R03_qa-gatekeeper.md` at 11:49:22 — after every measurement in this report except where noted.
`git status --porcelain --ignored .qfai/review/review-20260821160000000` at finish:

```text
!! .qfai/review/review-20260821160000000/R01_implementation-reviewer.md
!! .qfai/review/review-20260821160000000/R03_qa-gatekeeper.md
```

Both untracked (ignored), as round 10's `m7` predicted; force-add at the sealing step.

**Consequence, measured.** With those two on disk `stageEvidenceCounts.test.ts` now fails:

```text
pnpm -C packages/qfai exec vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts
  -> 1 failed | 7 passed (8)
     "responses: record says 29, disk holds 31"
     "the verdict split sums to 29 against 31 responses"
```

That is the derived guard doing its job and it is **disclosed** at `atdd-spec-0017.md:1653-1660`. I
record it as a sequencing note, not a finding: it will read 32 once this file lands, and the apply
commit owes the update. My e2e and `ci:lint` runs (11:36 and 11:39) predate both arrivals, so the
totals in `B1` are measured against the same pack state the record's own claim was.

## Mutation hygiene

Ten mutations, each applied alone, each reverted in a `finally`, each with a printed sha256
before/after. All ten reverted byte-identical (`identical: true` in every case); harnesses at
`tmp/r11-completion/mutate*.mjs`. One structural experiment planted a file and removed it
(`tmp/r11-completion/scope.mjs`), verified by `existsSync` false and
`git status --porcelain -- packages/qfai/assets` empty. Scratch confined to `tmp/r11-completion/`;
the `git archive HEAD` shadow root was checked for escaping symlinks (none), its links deleted
first, then the tree removed.

## Gates I ran, and what passed

| gate | result |
| ---- | ------ |
| `validate --profile atdd --fail-on error --spec 0017` (shadow root) | `info=2 warning=0 error=2`, **exit 1** — `QFAI-ATDD-111` (1 US: `US-0017-0007`), `QFAI-ATDD-112` (8 TC). Reproduces the record exactly. |
| `validate --profile atdd --fail-on error` (unscoped, shadow root) | `error=2`; `ATDD-111` = 12 (`0003`:8, `0006`:1, `0008`:1, `0015`:1, `0017`:1), `ATDD-112` = 15 (`0003`:1, `0008`:4, `0015`:2, `0017`:8). **Both match the record's items 3 and 4 exactly.** |
| `validate --profile full --fail-on error` (shadow root) | `info=4 warning=404 error=4`; the two extra are `QFAI-REVIEW-004/-005` on the in-flight pack. **Matches the record.** |
| `pnpm ci:lint` | **exit 0**, all eleven members (counted from `package.json#scripts`). |
| `pnpm check-types` | **exit 0** — see `M4`: it is not in `ci:lint` and not in the record. |
| `vitest run --project e2e` | 1439 passed / 16 skipped, exit 0 — see `B1`. |
| `vitest run --project integration --project unit` | 1209 passed / 19 skipped, exit 0 — see `B1`. |
| `vitest run --project e2e tests/assets/` | 1319 passed, exit 0 (before the sibling reports landed). |
| `node scripts/check-atdd-annotation-ledger.mjs --spec 0017` | `8 claim(s) backed`, exit 0. |
| `node scripts/check-atdd-annotation-ledger.mjs` | exit 1; **127** unbacked of **208** claims. Both reproduce. |

**A gate did pass** — `ci:lint`, `check-types`, and the record's own four guards were green at
`4b58eadd` before the pack moved. **No stage gate passed**: the scoped `validate` exits 1, which is
this skill's completion gate (`SKILL.md:293`), so the verdict is `REVISE`.

**Not reproduced:** `pnpm verify:pack` (the record claims exit 0). I declined to run it because it
performs a real prepack/build and can deposit artefacts outside `tmp/`. Stated plainly rather than
assumed.

## What I could not break

The Delta Rejected Guard's **substance** holds. `09_delta.md § Rejected` carries exactly three
candidates and `07_Decisions.md` exactly six rejected alternatives at `:133`, `:137`, `:203`,
`:206`, `:242`, `:249` — the record's counts at `:33-34` are correct. I read each against every
artifact this stage added and **no rejected option is implemented**: no second table in
`06_Test-Cases.md`, no SPLIT proposal, no oracle invented for the bump-owner half (`TDD-0069` /
`TDD-0070` are parked, which is the delta's own instruction), the new guard is a `scripts/` script
rather than a validator rule or a second spec-artifact parser, and `CR-20260820-0012`'s options 1-4
stay rejected (`TDD-0069` carries a `Blocked-By` in the handover, no gate narrowed, no waiver, no
merge). `B4` is about the discharge's *scope statement*, not about a reintroduction.

The ledger cross-tabulates exactly as the record says: 82 `TDD-NNNN` rows, 71 `Integration` /
11 `Unit`, 74 `refactor` / 6 `blocked` / 2 `todo`; `Integration` alone 63 / 6 / 2. `TDD-0069` and
`TDD-0070` are at `tdd/test-list.md:107-108`, both `todo`, both `DR-ID: -` and `Blocked-By: -`, and
the `Evidence` cell at `:107` still reads verbatim the three refuted clauses the handover quotes.
Four of the six `blocked` rows are `blocked` on `CR-20260820-0007`. `06_Test-Cases.md` holds 82
`TC-0017-*`. The eight `QFAI-ATDD-112` items are exactly the six `blocked` plus the two `todo`.

`DR-0017-0010`'s `Status` field says `PASS` at P1d pass 6 (`9a37421c`); the record agrees.
`CR-20260820-0011` and `-0012` are both `open`. The shipped tree has 0 `upload-artifact` steps and
0 `check-workflow-hygiene` occurrences. The seal-timing table's row 10 (`225a242e` / `225a242e`,
same commit) reproduces under `git log --diff-filter=A`. Round 10's recorded seal
`ec61ff8e5163…` recomputes. Exactly one pack file holds CRLF (round 7's `R03`, 423 of them).

---

### B1 — both `P7 quality gates` suite totals are wrong at HEAD, and the sequence's own invariant is violated

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1332`, `:1350-1351`, `:1400`, `:1418-1420`.
**Severity:** Blocking.
**Traces to:** `.claude/skills/qfai-atdd/SKILL.md:294` ("Repository quality gates
(format/lint/type/tests/pack) pass **with evidence**"); `defect:record-accuracy`.

`:1332` reads "**These numbers are measured at the working tree of this commit** … the e2e figure
is 1437 and the integration+unit figure 1206", and `:1350-1351`:

```text
pnpm -C packages/qfai test:e2e                  1437 passed / 16 skipped, exit 0
vitest --project integration --project unit     1206 passed / 19 skipped, exit 0
```

**Measured at `4b58eadd`, before the sibling reports landed:**

```text
pnpm -C packages/qfai exec vitest run --project e2e
  -> Tests  1439 passed | 16 skipped (1455)     Test Files 84 passed | 4 skipped

pnpm -C packages/qfai exec vitest run --project integration --project unit
  -> Tests  1209 passed | 19 skipped (1228)     Test Files 172 passed | 4 skipped
```

Both stated figures are wrong: **1437 vs 1439** and **1206 vs 1209**.

And the record's own invariant at `:1418-1420` — "any later commit that changes an `it` / `test`
callsite under the project's two globs owes a row here" — is violated. Counted the record's own way
(`it`/`test` callsites under `tests/e2e/**` + `tests/assets/**`, from `git show` at each revision):

```text
7af579c3   873 callsites   <- the sequence's last row, which states 1437 / 873
737d009b   874  (+1)       <- adds it("derives the round and response counts ...")
b510843b   875  (+1)       <- adds it("reconstructs every recorded span from the source, ...")
HEAD       875
```

`1437 + (875 - 873) = 1439`, which is what the suite reports. So the sequence owes two rows, and
each of the two commits is one the record's rule names by construction. This is the same defect
the record says it has closed five times (`:1338`, "Five rounds running, that sentence was wrong")
and it recurred in the two commits that were applying round 10.

**Nothing derives either figure.** Mutation `S5` on `.qfai/evidence/atdd-spec-0017.md`,
"the e2e figure is 1437 and the integration+unit figure 1206." -> "…9999 … 8888.":

```text
coverageDepthMatrix + retractedClaims + stageEvidenceCounts -> 24 passed (24)   reddens NOTHING
revert: sha256 dcc6487a735d9a26… -> dcc6487a735d9a26…   identical: true
```

**Rework:** re-measure both totals at the apply commit, add the two owed sequence rows
(`737d009b` +1, `b510843b` +1) plus the apply commit's own, and either derive the two totals or say
plainly that they are not derived — the record currently says the opposite of both.

### B2 — the pack-count numeral pin went inert at exactly eleven packs, and two record claims about it are false

**Artifact:** `packages/qfai/tests/assets/retractedClaims.test.ts:181-207` (`COUNTED_CLAIMS`) and
`:206` (`WORDS`); `.qfai/evidence/atdd-spec-0017.md:1450`, `:1699`, `:1706`.
**Severity:** Blocking.
**Traces to:** `.claude/skills/qfai-atdd/SKILL.md:298` (the pack must be sealed and
`## Final status` must "say what that pack says"); `defect:vacuous-guard`.

The record's derivation table at `:1450` claims

```text
| the pack-count **numeral** in prose ("Eight packs")     | `retractedClaims.test.ts`         |
```

and `:1706` says of the word "It is now measured with the rest." The needle is

```text
/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:\w+\s+)?packs\s*[,—–-]?\s*one per round\b/gi
```

with `WORDS` also stopping at `ten`, and the assertion has **no floor**: it iterates `matchAll` and
checks nothing when there are no matches. The record now reads `**Eleven** packs, one per round.`

```text
matches of the pinned needle in atdd-spec-0017.md: 0
```

Three mutations, one at a time, guard = `tests/assets/retractedClaims.test.ts`:

| id | mutation | result |
| -- | -------- | ------ |
| `P1` | `**Eleven** packs, one per round.` -> `**Twelve** packs, …` | `11 passed (11)` — **reddens NOTHING** |
| `P2` | -> `**Nine** packs, …` (inside the alternation, wrong value) | `1 failed / 10 passed` — **REDDENS** |
| `P3` | -> `**11** packs, …` (digit form, correct value) | `11 passed (11)` — correct |

All three reverted byte-identical (`dcc6487a735d9a26…` both sides). `P2` is the control: the guard
works *below* eleven, so the inertness is caused by the alternation ceiling and not by a broken
harness. The numeral is unpinned in exactly the way it was when it said "Three" and "Four" — and it
went inert at the round the count reached eleven, so the guard has never once checked the value it
now holds.

**Rework:** extend the alternation and `WORDS` past `ten`, and add the floor — this claim's
`actual()` is known, so requiring `matches.length > 0` is free. Then withdraw `:1450`'s row and
`:1706`'s "It is now measured with the rest", which were false for the whole of round 11.

### B3 — `US-0017-0002` and `US-0017-0003` assert over "the shipped set" from a hardcoded two-file list; a third shipped workflow passes both

**Artifact:** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:227` and `:263`;
`.qfai/evidence/atdd-spec-0017.md:374-380` and `:404` (`A4` — "The scope fix above");
`## Coverage obligations checklist` at `:535-537`.
**Severity:** Blocking.
**Traces to:** `.claude/skills/qfai-atdd/SKILL.md:282` / `:302` (a required `US` must be *covered*,
not annotated); `CR-20260814-0001` (an annotation whose scope is narrower than its claim);
`defect:coverage-scope`.

Round 10 found `US-0017-0004` reading one workflow while its annotation claims a property of an
adopter's lanes. The record's fix (`:378`) is `shippedJobs()`, which derives the file set — and it
was applied to that one row. Six of the eight annotated describes still name files literally:

```text
US-0017-0001  jobs()                                                  orchestrator only
US-0017-0002  const files = [ORCHESTRATOR, "qfai-validate.yml"]        :227
US-0017-0003  for (const file of [ORCHESTRATOR, "qfai-validate.yml"])  :263
US-0017-0004  shippedJobs()   x2                                       DERIVED
US-0017-0005  jobs() + toEqual([ORCHESTRATOR, "qfai-validate.yml"])
US-0017-0006  workflowText(ORCHESTRATOR)
US-0017-0008  workflowText("qfai-validate.yml") + jobs()
```

`US-0017-0002`'s own failure message is "every third-party action in **the shipped set** must be
pinned to a full SHA" — a claim over the set, asserted over a two-element literal.

**Measured.** I planted a third shipped workflow,
`packages/qfai/assets/init/root/.github/workflows/qfai-extra.yml`, carrying a floating
`uses: actions/checkout@v4` with **no** `persist-credentials: false`, a `node-version: "20"`
literal, and `run: pnpm build`, then ran the story file alone:

```text
OK    US-0017-0002 > pins every action to a full SHA and refuses to persist credentials
OK    US-0017-0003 > declares no workflow-level Node version literal in either shipped workflow
FAIL  US-0017-0004 > ships no lane that runs its own bundler build
FAIL  US-0017-0004 > invokes only the programs an adopter's lanes are allowed to invoke
FAIL  US-0017-0005 > ships exactly one orchestrator carrying every test lane
OK    US-0017-0006 / US-0017-0008
      Tests  3 failed | 7 passed (10)     EXIT 1
reverted: target exists = false ; git status --porcelain -- packages/qfai/assets == empty
```

An unpinned third-party action and an unhardened checkout shipped to an adopter, and a hard-coded
Node version, are **invisible** to the two rows whose whole subject they are. `US-0017-0004` and
`-0005` caught the file; `-0002` and `-0003` did not. So `A4` closed one row of the six that have
the defect, and the record presents it as "the scope fix".

**Rework:** route `US-0017-0002` and `US-0017-0003` through the derived file list, or state per row
in the Coverage Depth Matrix that the assertion's scope is the two named files and not the shipped
set. Either is acceptable; asserting a set property over a literal list is not.

### B4 — the Delta Rejected Guard's discharge is scoped by a number nothing supports, and half its conjunction is false

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:92-94`.
**Severity:** Blocking.
**Traces to:** `.qfai/specs/spec-0017/09_delta.md § Rejected` (the third candidate, "a row that
cannot fail looks like coverage"); `defect:record-accuracy`.

`:92-94` reads: "Over **the ninety-one forms four reviewers planted**, the option is not
reintroduced: every one of them is pinned in `tests/unit/buildCommand.test.ts` and refused by
`tests/unit/shippedLaneCommands.test.ts`."

**1. The number.** The corpus is `PLANTED` in
`packages/qfai/tests/unit/shippedLaneCommands.test.ts:32-98`:

```text
PLANTED entries: 62
```

The record's own narrative at `:88-90` enumerates **five plantings** — 11 + 20 + 40 + 20 + 50
= **141** forms, of which the four reviewers' are 20 + 40 + 20 + 50 = **130**. Neither 62 nor 130
nor 141 is 91. (`11 + 20 + 40 + 20 = 91` is the only arithmetic that reaches it, and it silently
drops round 10's fifty — a reviewer's planting — while counting round 8's, which `:104` implies was
this stage's.) So the discharge's scope cannot be checked against anything.

**2. The first conjunct is false.** Seven of the 62 exact forms do not occur in
`buildCommand.test.ts` at all — listed with the verdict `classifyBuildCommand` gives each:

```text
bash -eo pipefail -c "pnpm -C packages/qfai build"    -> heuristic
time -v make all                                      -> build
sudo "make" build                                     -> build
env pnpm build -v                                     -> heuristic
powershell -NoProfile -File scripts[BS]build.ps1      -> heuristic
.[BS]scripts[BS]build.cmd                             -> heuristic
docker build -t x .                                   -> build
```

(`[BS]` is a single backslash; this environment's shell strips one level of escaping.)
`time -v make all` has no analogue there at all — the file pins `time pnpm build`,
`time -p pnpm build` and `make all` separately, never the composed form the reviewer planted.

**3. Nothing derives the numeral.** Mutation `T6`, "Over the ninety-one forms four reviewers" to
"Over the four hundred forms four reviewers":

```text
24 passed (24)   reddens NOTHING
revert: dcc6487a735d9a26… -> dcc6487a735d9a26…   identical: true
```

**What survives:** the second conjunct. All 62 are refused (`refusals()` non-empty for every one),
and the classifier calls 47 `build` and 15 `heuristic` with **0 `none`** — and the E2E rejects both
verdicts, so no planted form escapes either instrument. The finding is that the *sentence* the
Delta Rejected Guard's discharge rests on states a scope the tree does not hold and a property one
of its two named files does not have.

**Rework:** delete the numeral (the corpus is the statement, exactly as `:917-922` argues for the
classifier's corpora) or derive it, and narrow the first conjunct to what is true — every planted
form is *classified* non-`none`, which is checkable, rather than *pinned as a case*, which is not.

### B5 — the allowlist's headline measurement is wrong in both halves

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:366-367`.
**Severity:** Blocking.
**Traces to:** `.claude/skills/qfai-atdd/SKILL.md:294`;
`references/test-case-depth-checklist.md` (an oracle claim must be measured);
`defect:record-accuracy`.

`:366` reads: "Measured: **55 of 55 planted builds refused, 6 of 6 shipped shapes accepted**, where
the classifier caught 6 of 50."

Measured by running `refusals()` over the two literals in the test file:

```text
PLANTED: 62; refused 62 of 62; escaped: []
SHIPPED:  8; accepted  8 of  8; falsely refused: []
```

Both figures in the bolded sentence are wrong (55 vs 62, 6 vs 8), and both are stated as a
measurement. Nothing derives them — mutation `T5`, "**55 of 55 planted builds refused, 6 of 6
shipped shapes accepted**" to "**3 of 3 … 1 of 1 …**":

```text
24 passed (24)   reddens NOTHING
revert: dcc6487a735d9a26… -> dcc6487a735d9a26…   identical: true
```

This is the one sentence a completion gate reads to decide whether the inverted instrument was
falsified at all, and it understates the corpus by seven and the accept side by two.

**Rework:** state 62 and 8, or delete the numerals and point at the two lists, which grow every
round for the same reason the classifier's corpora do.

### B6 — the committed Validate Hard Gate artifact is stale at HEAD again, and the record's `matchedFileCount` no longer reproduces

**Artifact:** `.qfai/report/validate.spec-0017.json` (tracked, force-added);
`.qfai/evidence/atdd-spec-0017.md:503-508`.
**Severity:** Blocking.
**Traces to:** `.claude/skills/qfai-atdd/SKILL.md:154` (cite the per-run directory or this spec's
`validate.spec-<id>.json` as the Validate Hard Gate evidence); `SKILL.md:305` ("Validation evidence
is missing or failing"); `defect:record-accuracy`.

`:503-508` records round 9's finding — the force-added artifact was four rounds old — and closes it
with "Re-run and re-added at round 9; `matchedFileCount` is 467."

I ran the scoped gate in a `git archive HEAD` shadow root (tracked symlinks re-materialised as
relative-target symlinks), which is the reproducible path and touches nothing:

```text
node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  counts: info=2 warning=0 error=2      EXIT 1
  shadow artifact matchedFileCount: 468

git show HEAD:.qfai/report/validate.spec-0017.json   -> matchedFileCount: 467
working tree (uncommitted, pre-existing)             -> matchedFileCount: 468

sha256 (first 16): worktree c2b823051056fd0d == shadow c2b823051056fd0d ; committed 4c337f91dde0ba7d
git diff -U0 -- .qfai/report/validate.spec-0017.json
  -      "matchedFileCount": 467,
  +      "matchedFileCount": 468,
```

The shadow run reproduces the working-tree file **byte for byte**, and the committed blob differs
from it by exactly that one field. So at `4b58eadd` the cited Hard Gate artifact does not
reproduce, and the record's numeral is wrong. The *verdict* is unaffected — `info=2 warning=0
error=2` with the same two findings reproduces, which is what matters for the gate's content — but
the record's whole argument for force-adding this file (`:497`, "an artifact exists to be checked,
and this one could not be") applies to it again.

Nothing derives the numeral. Mutation `S4`, "`matchedFileCount` is 467." to "… is 900.":

```text
24 passed (24)   reddens NOTHING
revert: dcc6487a735d9a26… -> dcc6487a735d9a26…   identical: true
```

**Rework:** re-run and re-`git add -f` the artifact in the apply commit, and re-state or derive the
numeral. Given this is the third round in which this exact field has been found stale, deriving it
is the cheaper option — it is one field of a tracked JSON.

---

### M1 — "Every count below is derived" is false for two rows, and the sentence excusing them is false by measurement

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1517-1520` (the paragraph above
`### Findings per round`) and `:1564`.
**Severity:** Major.
**Traces to:** item 7 of `§ Gaps / Open risks` (this record's own recurring class);
`defect:record-accuracy`.

`:1517` — "Every count below is **derived**: distinct finding identifiers appearing as a heading in
the report, counted from the packs on disk." `:1564` — "**The rule as written fits the
`completion-reviewer` reports and no others.**"

I implemented the stated rule (identifier at the start of a level-2-to-4 heading, optionally
backtick-wrapped) and ran it over all 27 numeral-bearing rows:

```text
rows compared = 27     the rule reproduces 25
MISMATCH review-20260821020000000/R03 (round 4, stage qa-gatekeeper):
   table = 6 ; rule gives 8  [B1, B2, M4, M4b, B6, B6b, E6, X1]
MISMATCH review-20260821080000000/R04 (round 7, P1d):
   table = 8 ; rule gives 0  (its ids are enumerated inline; the table says "(inline)")
```

The 25 that reproduce include **all four `implementation-reviewer` rows** (10, 10, 25, 26), **all
six `qa-gatekeeper` stage rows from round 5 on** (12, 10, 18, 22, 17, 16) and **five of six P1d
rows** (6, 3, 5, 3, 2) — fifteen non-`completion-reviewer` reports. So `:1564` is false as written,
and the paragraph at `:1517` is a universal that two rows falsify (the round-4 slot is the one item
7.11 already concedes, and it is still asserted here).

A permissive reading of the same rule — identifier anywhere in the heading — reproduces only 8 of
27, so it is not the reading either.

**Rework:** replace `:1564` with what is true — the rule reproduces 25 of 27 rows; the two
exceptions are round 4's stage report, where two of the eight heading identifiers are oracle-round
ids (`E6`, `X1`) rather than findings, and round 7's P1d, which uses no identifier headings — and
weaken `:1517` from "Every" to the same statement. `### Findings per round` also owes three new rows
this round, which is the thing that paragraph exists to make checkable.

### M2 — three of the numbers "sought in BOTH records" are restated a third time outside the pinned form, and all of them drift freely

**Artifact:** `.qfai/evidence/coverage-depth-spec-0017.md:73-74` and `:154`;
`.qfai/evidence/atdd-spec-0017.md:263` and `:1221`;
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts:165-171`, `:221-233`, `:421-438`.
**Severity:** Major.
**Traces to:** round 10 `A2` and `m2` (the "derived in one file, retyped in another" class);
`defect:vacuous-guard`.

`A2` (`:391-396`) reports that the `Status` totals, the `❌` partition and the predicate-version
sentence are now sought in both records. Each is sought only **in its pinned form**. Four
restatements sit outside it and none is read:

| id | site | mutation | result |
| -- | ---- | -------- | ------ |
| `T1` | `coverage-depth:73-74` — "the total is `✅ 3 / ⚠️ 1 / ❌ 5` rather than …" | to `✅ 5 / ⚠️ 1 / ❌ 3` | `24 passed` — **reddens NOTHING** |
| `T2` | `atdd:263` — "the build classifier, v12, extracted from the E2E" | to "v9" | `24 passed` — **reddens NOTHING** |
| `T3` | `atdd:1221` — "class B of the matrix's `❌` cells, all seven of them" | to "all ninety of them" | `24 passed` — **reddens NOTHING** |
| `T4` | `coverage-depth:154` — "the same gap for all seven cells" | to "all ninety cells" | `24 passed` — **reddens NOTHING** |

All four reverted byte-identical (`87ec8559a8e35dbb…` / `dcc6487a735d9a26…` on both sides).

`T1` matters most: the guard asserts the pinned-form occurrence list **equals**
`["coverage-depth-spec-0017.md", "atdd-spec-0017.md"]`, so a third *pinned* statement reddens — but
a third statement in different words does not, and one sits eighteen lines below the pinned one in
the same file. `T2` is round 7's literal-pin defect in a new place: `:263` names the version in
prose beside the file it belongs to, and only the "`vN` lives in `<path>`" spelling is read.
`T3` / `T4` are a fourth derived figure (class B's size, 7) restated in both records with nothing
reading either.

**Rework:** either widen the three pins to the sentences that actually carry these values, or stop
restating them — the argument the matrix makes at `:306-311` about the corpora ("one site, pointed
at rather than retyped") is the same argument.

### M3 — the story's own instrument says the shipped tree invokes ten programs; it invokes fifteen

**Artifact:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:18`.
**Severity:** Major.
**Traces to:** round 10 `A1` (a stale prose claim inside the instrument built to stop stale prose
claims); `defect:record-accuracy`.

The module docstring of the file `US-0017-0004` now rests on reads: "The shipped tree invokes **ten
programs**. Enumerating those, and refusing everything else, needs no corpus …".
`atdd-spec-0017.md:362` and the E2E's own comment both say **fifteen**. Measured, by running
`invocationsOf()` over every `run:` body in
`packages/qfai/assets/init/root/.github/workflows/**`:

```text
distinct INVOCATIONS: 34
distinct PROGRAMS   : 15
  corepack, cut, echo, exit, git, grep, node, npm, npx, pnpm, printf, read, tr, true, yarn
HARMLESS_PROGRAMS   : 9      ALLOWED_INVOCATIONS: 8 entries / 6 distinct programs
refusals over the shipped tree: 0
HARMLESS unused by the shipped tree: []   ALLOWED_INVOCATIONS unused: []
```

So the record's "fifteen programs … nine … six" is correct and the instrument's own docstring is
five short — and it is the docstring a reader consults to decide whether the allowlist is complete.
Neither number is derived: mutations `T7` (helper, "ten" to "forty") and `T8` (record, "fifteen" to
"forty") both gave `24 passed (24)`, **reddening nothing**, reverting byte-identical
(`c40dfff0dfbf90ef…`, `dcc6487a735d9a26…`).

**Rework:** correct the docstring to fifteen. Better: the sets are exported and the workflow
directory is readable, so `shippedLaneCommands.test.ts` can assert that the shipped tree's distinct
program count equals `HARMLESS_PROGRAMS.size` plus the distinct programs of `ALLOWED_INVOCATIONS` —
which also falsifies the "fails closed" claim if either list ever grows past what ships.

### M4 — the type gate is absent from the recorded quality-gate evidence

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1349-1359` (`### P7 quality gates`).
**Severity:** Major.
**Traces to:** `.claude/skills/qfai-atdd/SKILL.md:294` — "Repository quality gates
(format/lint/**type**/tests/pack) pass with evidence"; `SKILL.md:305`.

The block records `pnpm ci:lint`, `test:e2e`, `--project integration --project unit`, the ledger
guard, `pnpm verify:pack` and two `validate` runs. It records no type check, and `ci:lint` does not
contain one:

```text
ci:lint     = pnpm format:check && pnpm lint && pnpm lint:md && node ./scripts/check-bidi.mjs && ...
              (eleven members; no check-types)
check-types = tsc -b            <- only reachable via `pnpm check-types` or `pnpm ci:gate`
```

So four of the DoD's five named gates have evidence and the type gate has none, across eleven
rounds. I ran it: `pnpm check-types` -> **exit 0**. The gate passes; the *evidence* is missing,
which is what `SKILL.md:294` asks for and `:305` makes a not-done condition.

**Rework:** add `pnpm check-types  exit 0` to the P7 block. One line.

### M5 — `shippedLaneCommands.test.ts` is the one new test file outside `TRACKED`, so its count is half-checked

**Artifact:** `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:46-53` (`TRACKED`),
`:234-239` (`OWED`), `:252-276` (the `.each` / `.for` precondition);
`.qfai/evidence/atdd-spec-0017.md:261`.
**Severity:** Major.
**Traces to:** round 10 `A7` (three literals naming the same six files with nothing tying them
together); `defect:vacuous-guard`.

`A7`'s repair made one `TRACKED` list feed all three checks and asserted that the claimed set and
the tracked set are equal. But the set whose counts are actually checked is not `TRACKED` — test 2
iterates **every** recorded `vitest run … -> Tests N passed` row in the record and applies
`countCases` to each. `tests/unit/shippedLaneCommands.test.ts` is quoted there and is **absent from
`TRACKED`**, so:

- its recorded output *is* checked by `countCases`, whose validity depends on the file using no
  `.each` / `.for` — and test 3 iterates `TRACKED`, so that precondition is never checked for it;
- its `## Work performed` numeral at `:261` ("— 5 tests") is checked by nothing.

Measured, one mutation at a time:

| id | mutation | result |
| -- | -------- | ------ |
| `S1` | `atdd:261` "shippedLaneCommands.test.ts` — 5 tests." to "— 9 tests." | `24 passed` — **reddens NOTHING** |
| `S2` | the recorded output "-> Tests 5 passed (5)" to "9 passed (9)" (control) | `1 failed / 23 passed` — **REDDENS** |

Both reverted byte-identical. Every *other* new test file's Work-performed numeral is pinned; this
one is not, and it is the file the whole `US-0017-0004` re-argument rests on. The file happens to
use no `.each` / `.for` today, so the count is currently right — which is the same "correct and
unchecked" state the round-10 finding was about.

**Rework:** add `packages/qfai/tests/unit/shippedLaneCommands.test.ts` to `TRACKED` and give it a
matching `CLAIMS` entry, and make the precondition test iterate the union of `TRACKED` and the files
test 2 actually reads — the pairing `A7` introduced only holds if the two sets are the same set.

### M6 — "36 files across these packs" is 50, in the record and in the guard's own docstring

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1819`;
`packages/qfai/tests/assets/stageEvidenceCounts.test.ts:89`.
**Severity:** Major.
**Traces to:** `defect:record-accuracy`.

Both sites read "exactly one of the **36** files across these packs" / "one of the **36** pack files
holds 423 CRLF". Measured over the packs this stage names (`review-20260820200000000` onward):

```text
files across the named packs: 50
CRLF files: [ 'review-20260821080000000/R03_qa-gatekeeper.md: 423 CRLF' ]
```

The two load-bearing halves — one file, 423 CRLF, round 7's `R03` — reproduce exactly. The
denominator does not, and it is the number that makes "exactly one" mean something. It grows every
round, nothing derives it, and the copy in the guard's docstring is invisible to every guard for
the reason round 10's `A1` states.

**Rework:** delete the denominator or compute it. The guard already walks every pack file to seal
it, so the count is one line away from being derived.

### M7 — a twelfth entry for the recurring-class list, measured

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1222-1260` (`§ Gaps / Open risks` item 7).
**Severity:** Major.
**Traces to:** item 7 itself ("This is the canonical list"); `defect:record-accuracy`.

The list holds eleven entries and claims to be canonical. Here is a twelfth, found the way item 7
says the others were — by mutating an instrument rather than reading it:

> **12.** "It is now measured with the rest" (`:1706`), together with the derivation-table row that
> names `retractedClaims.test.ts` as the instrument deriving the pack-count numeral (`:1450`). The
> pin's alternation stops at `ten` and its assertion has no floor, so at eleven packs it matches
> nothing: `Eleven` to `Twelve` reddens nothing while `Eleven` to `Nine` reddens. A claim about how
> the record is written — "this numeral is measured" — standing in for the measurement, inside the
> guard written to stop exactly that, and going inert at the round the count it pins crossed a
> ceiling nobody had checked.

A second candidate, weaker and offered as one: **`:1564`'s "The rule as written fits the
`completion-reviewer` reports and no others"** — a claim about how twenty-nine reports are written,
used to excuse the table's two disagreements, and false by measurement (the rule reproduces 25 of
27 rows, fifteen of them not `completion-reviewer` reports). See `M1`.

Both differ from item 8's shape: item 8 is a *deletion* justified by a corpus's silence; these are
*derivation claims* justified by nothing, which is item 5 / 6 / 10's shape one level out.

**Rework:** add the twelfth (and decide on the second). The countermeasure paragraph at
`:1262-1265` also needs one more line: an oracle round on a pin whose needle is a **closed
enumeration** proves nothing about values outside the enumeration, which is how this one passed
every round it existed.

---

## MINOR

### m1 — the ledger cross-tabulation is correct and derived by nothing

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:21-22`, `:189`, `:529`.
**Severity:** Minor.
**Traces to:** item 7's own stated predictor — a number nothing derives goes stale on schedule.

"82 rows: 71 `Integration`, 11 `Unit`; **74 `refactor`, 6 `blocked`, 2 `todo`**", plus the
`Integration`-only 63 / 6 / 2 at `:189` and `:529`. Measured from `tdd/test-list.md` (strict
`TDD-NNNN` rows only; the legend table's `TDD-ID` row is excluded):

```text
82 TDD-NNNN rows
  6 Integration blocked
 63 Integration refactor
  2 Integration todo
 11 Unit refactor
```

Every figure is correct. None is derived — and `tdd/test-list.md` is a file `/qfai-implement` will
edit next, so all six expire on someone else's commit rather than on this stage's.
`retractedClaims.test.ts` excludes that file correctly (the Drift Protocol carve-out bars *editing*
it), but reading it to derive a number is not editing it, so `stageEvidenceCounts.test.ts` could.

### m2 — "fifteen programs. Nine … six" is correct and derived by nothing

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:362-364`.
**Severity:** Minor.
**Traces to:** the same predictor; supports `M3`.

Measured correct on a verified-clean asset tree (15 = 9 + 6; see `M3` for the full probe output).
Mutation `T8` ("fifteen" to "forty") reddened nothing, reverting byte-identical. All three constants
are exported and the shipped directory is readable, so all three are derivable; `M3` proposes the
assertion that would do it.

### m3 — the two records give different first-version sizes for the same partition (low confidence)

**Artifact:** `.qfai/evidence/coverage-depth-spec-0017.md:118`;
`.qfai/evidence/atdd-spec-0017.md:990`.
**Severity:** Minor. **Low confidence** — the two sentences may describe different moments, and I
could not distinguish them from history.
**Traces to:** `defect:record-accuracy`.

`coverage-depth:118` — "The first version of this section declared only the class SIZES
(`30 + 7 + 1`)." `atdd:990` — "the first partition read `30 + 12 + 1 = 43` against 38 cells,
double-counting `State transitions`". Traced:

```text
git show 58c29d9f:.qfai/evidence/coverage-depth-spec-0017.md
  Class A — ... (30 cells).   Class B — ... (7 cells).   Class C — ... (1 cell).
git log -S "30 + 12 + 1" -- .qfai/evidence/   ->  58c29d9f   (the string is INTRODUCED there,
                                                  not present in any prior revision)
```

So `:118` reproduces from the commit, and `:990`'s `30 + 12 + 1` describes a state that exists in no
revision — plausibly a within-commit draft that `M4` caught before it landed, which would make both
sentences true. That is why this is low confidence. What remains is the finding: one of the two is a
claim about a state no later reader can check, and `30 + 7 + 1` is exactly the *current* value,
which is the shape of a number back-filled from the present into a sentence about the past.

### m4 — the `PLANTED` provenance comments cannot be reconciled with the record's five plantings

**Artifact:** `packages/qfai/tests/unit/shippedLaneCommands.test.ts:33`, `:40`, `:83`.
**Severity:** Minor.
**Traces to:** `defect:record-accuracy`; supports `B4`.

Counted from the file:

```text
:33  "round 10, the implementation review's six"     ->  6 entries   (agrees)
:40  "round 10, the QA gate's fifty"                 -> 42 entries   (disagrees)
:83  "rounds 8 and 9, and the plain spellings"       -> 14 entries   (for 11 + 20 + 40 = 71 forms)
                                                        total 62
```

The list de-duplicated 141 planted forms down to 62 and the block comments still name the pre-dedup
counts, so a reader cannot tell whether twenty-plus forms were merged or dropped — and two of the
three comments are the numerals `B4`'s "ninety-one" would have to be reconciled against.

**Rework:** say that the list is the de-duplicated union of the five plantings and drop the
per-block numerals, which is the same argument the record makes at `:917-922` about the classifier's
corpora.

---

## Concurrent planting into the shipped asset tree, and whether my measurements survive it

The `qa-gatekeeper` running alongside me reported (its `A5`) that the `implementation-reviewer` was
planting into `packages/qfai/assets/init/root/.github/workflows/` during its measurements. Three of
my findings read that directory — `B3` (the plant experiment), `M3` (the program probe) and the two
shipped-tree zero counts under "What I could not break". I re-verified all of them after the report
resumed.

**The directory is unmodified at HEAD**, and I checked by content rather than by `git status` alone:

```text
git status --porcelain -- packages/qfai/assets      -> empty
ls .../workflows/                                   -> qfai-tests.yml, qfai-validate.yml   (only)
qfai-tests.yml     worktree 5f5ab906f13d7471dc7925904ae6913b50dbfb9c == HEAD
qfai-validate.yml  worktree 5af101c4905fc644e532d9ab59c5f1152563d37f == HEAD
```

`qfai-tests.yml`'s mtime is **11:30:49** — inside my session and before any of my directory-reading
measurements — while its blob equals HEAD. That is the signature of a plant-and-revert by another
agent, so the report is corroborated, and it also shows the revert was byte-clean.

**`M3` re-run on the verified-clean tree, unchanged:**

```text
distinct INVOCATIONS: 34      distinct PROGRAMS: 15
  corepack, cut, echo, exit, git, grep, node, npm, npx, pnpm, printf, read, tr, true, yarn
HARMLESS_PROGRAMS: 9    ALLOWED_INVOCATIONS: 8 entries / 6 distinct programs
refusals over the shipped tree: 0
```

**`B3` re-run on the verified-clean tree, with pre- and post-checks, unchanged:**

```text
PRE   ls .../workflows -> qfai-tests.yml, qfai-validate.yml ; git status(assets) empty
      (plant qfai-extra.yml)
OK    US-0017-0002 > pins every action to a full SHA and refuses to persist credentials
OK    US-0017-0003 > declares no workflow-level Node version literal in either shipped workflow
FAIL  US-0017-0004 > ships no lane that runs its own bundler build
FAIL  US-0017-0004 > invokes only the programs an adopter's lanes are allowed to invoke
FAIL  US-0017-0005 > ships exactly one orchestrator carrying every test lane
      Tests  3 failed | 7 passed (10)     EXIT 1
POST  target exists: false ; ls -> qfai-tests.yml, qfai-validate.yml ; git status(assets) empty
```

**So I stand behind all three**, and there is a structural reason beyond the re-run. `B3`'s
load-bearing fact is not the run at all — it is that
`spec0017LayeredCiScaffoldE2E.test.ts:227` and `:263` iterate a **two-element literal**, which is
true by reading the source at any revision. The run only demonstrates the consequence. And a foreign
plant could only ever *add* failures: my finding is that two rows **passed** while the thing they
forbid was present, so contamination cannot manufacture it — it could only have masked it. `M3`'s
claim is likewise a comparison between an exported constant and a directory, and both re-measured
identically.

The one measurement I cannot re-verify against the concurrent activity is the full-suite run behind
`B1` (1439 / 1209 at 11:36 and 11:37). A live foreign plant would have *reddened* rows rather than
changed the pass count, and both runs reported `exit 0` with zero failures, so no plant was live in
either. The callsite arithmetic corroborates it independently: `873 -> 875` gives `1437 + 2 = 1439`
without reading the asset tree at all.

---

## Evidence summary, and residual risks

**Present and reproducing:** the scoped gate (`error=2`, right content, exit 1) in a shadow root;
the unscoped `atdd` and `full` profiles with the record's exact per-spec tallies; `ci:lint` exit 0
(eleven members); `check-types` exit 0; the ledger guard at 8 scoped and 127-of-208 repo-wide; the
ledger cross-tabulation; the Coverage Depth Matrix's totals, `❌` partition, class properties and
per-`❌` justifications, all derived and all green; round 10's recorded seal; the seal-timing table's
row 10; the Delta Rejected Guard's substance; `DR-0017-0010`'s `Status` and both CRs' `open` status;
the handover's quotation of `tdd/test-list.md:107`; the shipped tree's 0 `upload-artifact` steps and
0 `check-workflow-hygiene` occurrences.

**Gaps:** `B1` both P7 suite totals and the e2e sequence's own invariant; `B2` the pack-count numeral
pin; `B3` the scope of `US-0017-0002` and `-0003`; `B4` the Delta discharge's scope numeral and its
first conjunct; `B5` the allowlist's headline measurement; `B6` the Hard Gate artifact and its
`matchedFileCount`; `M1` the derivation claims over `### Findings per round`; `M2` four unpinned
restatements of derived figures; `M3` the instrument's own program count; `M4` the type gate's
evidence; `M5` the half-checked sixth test file; `M6` the pack file-count; `M7` the twelfth
recurring-class entry.

**Not reproduced:** `pnpm verify:pack` (the record claims exit 0). I declined to run it because it
performs a real prepack/build and can deposit artefacts outside `tmp/`. Stated rather than assumed.

**Required gates:**

- `SKILL.md:293` — `validate --profile atdd --fail-on error --spec 0017` exits 1. Not satisfied, and
  honestly reported by the record as `error=2`.
- `SKILL.md:294` — format and lint pass with evidence; **type** passes with no evidence (`M4`);
  **tests** pass but the recorded totals are wrong (`B1`); **pack** not reproduced by me.
- `SKILL.md:282` / `:302` — `US-0017-0007` uncovered (disclosed, deliberate); `US-0017-0002` and
  `-0003` covered by assertions narrower than their stories (`B3`).
- `SKILL.md:298` — the pack is in flight and two sibling responses are untracked; the numeral pin
  over the pack count is inert (`B2`). Seal and force-add at the sealing step, then re-run
  `git status --porcelain --ignored` on the directory.
- `SKILL.md:103-115` — Stage Minimum Roles were not used for P2-P4. Disclosed at `:783-807`,
  irreparable retroactively, and it stands as a limit on what this evidence is worth.

**Residual risks:**

- A required CI leg (`test (e2e)`) is red at `4b58eadd` with the pack in its current state, because
  `tests/assets/**` runs in the `e2e` project and the derived round/response counts have moved
  (29 recorded, 31 on disk, 32 once this file lands). That is the guard working, and it must be
  closed in the apply commit rather than by relaxing the guard — round 5's precedent (`:1806-1811`)
  is that relaxing it was the worse error.
- `TDD-0069` and `TDD-0070` remain `todo`. `/qfai-implement` owns those cells and owes the
  `Evidence` rewrite in the same edit as the `Blocked-By` write. Nothing in this round changed that,
  and nothing in this round may.
- Three agents were measuring the same working tree concurrently. My own mutations were serialised
  and reverted, but a reviewer's clean run is not a guarantee about anyone else's; see the section
  above for what I re-verified and what I could not.

---

## The subject moved after my measurements, and what that changes

Between my last measurement and this sign-off, **five source files acquired uncommitted
modifications that are not mine**:

```text
12:02:52  packages/qfai/tests/helpers/buildCommand.ts             +77 / -12
12:03:13  packages/qfai/tests/helpers/shippedLaneCommands.ts      +107 / -10
12:03:20  packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts   +40 / -15
12:03:20  packages/qfai/tests/unit/shippedLaneCommands.test.ts    +77 / -0
12:03:39  packages/qfai/tests/assets/retractedClaims.test.ts      +34 / -12
```

These are **repairs, not plants** — `shippedWorkflowFiles()` extracted, backtick and
process-substitution spellings added to `commandsOf`, two new tests for seven wrapper constructs,
and a rewrite of the coordinate assertion. HEAD is still `4b58eadd`; none of it is committed.

**My measurements all predate them, and I can pin that rather than assert it.** At 11:52 I recorded
`git status --porcelain` and it held exactly two paths, both under `.qfai/report/` — no test or
helper file. Every measurement in `B1`-`B6`, `M1`-`M7` and `m1`-`m4` was taken before that reading,
and the two re-runs after it (`M3`'s probe and `B3`'s plant) reproduced their earlier results
identically. Corroborating counts: `PLANTED` holds **62** entries at HEAD **and** in the current
working tree, so `B4`/`B5`/`m4` are unaffected either way; the E2E file holds 10 `it` callsites at
HEAD and 10 now; `retractedClaims.test.ts` holds 11 and 11.

**One finding is already being repaired in that uncommitted work, and I am flagging it rather than
letting a reader discover it.** `B3`'s subject is gone from the working tree:

```text
grep -n 'ORCHESTRATOR, "qfai-validate.yml"' .../spec0017LayeredCiScaffoldE2E.test.ts
  232:      // Derived, not listed. This row said `[ORCHESTRATOR, "qfai-validate.yml"]` while ...
  586:        .toEqual([ORCHESTRATOR, "qfai-validate.yml"]);      <- US-0017-0005's topology assertion
```

So `US-0017-0002` and `-0003` now derive the file list. `B3` is nonetheless a real defect **at
`4b58eadd`, the revision under review**, and I am not withdrawing it: the repair is uncommitted, I
did not review it, and I did not re-run the plant against it. Treat `B3` as "found at the reviewed
revision, repair in flight, unverified". `B4`, `B5`, `M3`, `M5` and `m4` all touch files in that
list too, so the same caveat applies to whether their rework is already done — none of their
*measurements* changes, because all of them reproduce from HEAD.

**A reviewer's verdict is only about the revision it names.** Whoever seals this pack should record
that the working tree diverged from `4b58eadd` at 12:02-12:03, so a later reader can tell which
findings were answered by work this review never saw.

---

## Not completed

Stated plainly rather than filled in, because an honest gap is worth more than a plausible list.

- **`pnpm verify:pack` was not run.** The record claims exit 0 and I did not reproduce it, for the
  reason given above (it performs a real prepack/build and can deposit artefacts outside `tmp/`).
  The `pack` limb of `SKILL.md:294` is therefore unverified by me, in either direction.
- **I did not audit every numeral in both evidence files exhaustively.** I checked every count the
  review request named plus every figure in `## Final status`, `### P7 quality gates`,
  `### Findings per round`, `§ Review packs and their seals`, the Delta discharge, the
  `US-0017-0004` re-argument and the whole Coverage Depth Matrix. Numerals inside the historical
  narrative of superseded classifier versions (`v1`-`v11` defect counts, "15 defects over 59
  probes", "25 of 66", "45 of 207", "162 of 207", "0 of 17") I did **not** re-derive; they describe
  states that no longer exist and I could not have falsified them from the current tree.
- **Attack surfaces 1, 2, 3 and 4c of the review request are the `implementation-reviewer`'s
  domain and I did not attempt them** — breaking the allowlist's parser, refuting this round's four
  deletions, attacking the `stops`/`never` ordering change, and finding a fourth mutation against
  `retractedClaims.test.ts`'s coordinate model. I read the allowlist only far enough to audit the
  claims the *record* makes about it (`B4`, `B5`, `M3`). The uncommitted work described above
  suggests `R01` did attempt them and found holes; nothing in my report should be read as clearing
  the parser.
- **No minors were lost to the interruption.** `m1`-`m4` are the four I had measured, and each is
  written from a command output captured in this session, not from memory. I am not aware of a fifth
  in progress.

## Sign-off

**Verdict: REVISE.**

| family | ids | count |
| ------ | --- | ----: |
| Blocking | `B1` `B2` `B3` `B4` `B5` `B6` | 6 |
| Major | `M1` `M2` `M3` `M4` `M5` `M6` `M7` | 7 |
| Minor | `m1` `m2` `m3` `m4` | 4 |
| **total** | | **17** |

All 17 appear as level-3 headings in the form `### <id> — <summary>`, so `summary.json` derives from
the headings by the pack's stated rule.

**Revision:**

```text
git rev-parse --short HEAD   (start 11:22)   4b58eadd
git rev-parse --short HEAD   (finish)        4b58eadd      unchanged

git status --porcelain (finish):
 M .qfai/report/validate.log
 M .qfai/report/validate.spec-0017.json
 M packages/qfai/tests/assets/retractedClaims.test.ts
 M packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
 M packages/qfai/tests/helpers/buildCommand.ts
 M packages/qfai/tests/helpers/shippedLaneCommands.ts
 M packages/qfai/tests/unit/shippedLaneCommands.test.ts
```

The first two paths were already modified when I started and I never wrote to either. The five
`packages/qfai/tests/**` paths appeared at 12:02-12:03, are **not mine**, and are the subject of
§ "The subject moved after my measurements". I did not revert them and did not touch them: they hold
someone else's uncommitted work, and reverting a file with live edits in it is destructive whatever
the intent.

**This report was interrupted by a spend limit and resumed.** The seam is after `### M7` — parts
above it (the header, the gate table, `B1`-`B6`, `M1`-`M7`) were written before the interruption;
`## MINOR`, the concurrency assessment, the evidence summary, § "The subject moved after my
measurements", `## Not completed` and this sign-off were appended after it. Nothing above the seam
was re-derived or rewritten on resumption; the only new measurements taken after it are the three
re-verifications named in the concurrency section, all of which reproduced their pre-interruption
results.

- [x] Verdict is explicit — **REVISE**. `PASS` was not available: the stage's own completion gate
      (`SKILL.md:293`) exits 1.
- [x] Every finding cites a concrete artifact and line, with a command and a before/after.
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`.
- [x] Required gates and residual risks are recorded.
- [x] Read-only on the subject: ten mutations, each reverted in a `finally` with a printed sha256
      before/after, all ten byte-identical; one planted file, removed and verified absent twice.
- [x] Scratch confined to `tmp/r11-completion/`. Nothing committed, staged or pushed. The P1d gate
      was not re-opened.
