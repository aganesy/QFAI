# R02 — completion-reviewer, round 8

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 8 — **stage gates only**; P1d closed at round 7
- **Reviewed revision: `dbe00247`.** `git rev-parse --short HEAD` was `dbe00247` at start and at
  finish; `git status --porcelain` was **empty** at both. HEAD did not move.
- **Audited evidence hash (stage review):
  `sha256:8dc7229c0f22f3d2fa6da5374a363af811d1666d7675a2c2a79f7b32d7595a60`** — the four steps of
  `constitution/shared-skill-delegation-baseline.md:388-441`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status`
  (`c6d686491cb378d33a94b32844bd3c2d22922ba2f51112e4cb84a9c592c44c78`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`7d683d0602f372a87a0a8057339c2c138ec73a2a59564fc993424754c6c846af`), serialized as
  `path + NUL + sha256` sorted by path, hashed. `## Final status` is at `:992` and no `##` heading
  follows it, so truncating and excising remain byte-identical. **The coverage-depth hash moved from
  round 7 value `7a4ef207...`, so that file WAS opened this round** — round 7 `B5` first clause is
  closed.
- Authored/edited under review: **none.**
- **Mutations: none.** Every finding below is derivable read-only. The retracted-claims oracle was run
  by replicating the test's own `flatten` / `quotedSpans` / `occurrences` over the tracked files
  (`tmp/r8/retract_probe.mjs`) and its `sealOf` / `blobHash` verbatim (`tmp/r8/sealof.mjs`); nothing
  was planted, so there was nothing to revert. `validate` ran twice against a `git archive HEAD`
  shadow root at `tmp/r8/shadow` with all **83** tracked symlinks re-materialised as **relative-target
  symlinks** (`created=83 failed=0`, `checked=83 mismatched=0` against `git cat-file blob`); both
  run-logs landed inside the shadow and the tracked `.qfai/report/validate.log` is
  `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` before and after, equal to
  `git rev-parse HEAD:.qfai/report/validate.log`. Scratch under `tmp/r8/` only. No `git checkout` /
  `stash` / `reset`, no commit, no push.
- **No shadow artifact.** Relative-target symlinks produced no `QFAI-LINK-001`; every count below is
  raw, nothing excluded.

## Verdict summary

| # | finding | severity |
| --- | --- | --- |
| `B1` | the round-7 pack seal is reproducible only from **this** working tree; `stageEvidenceCounts.test.ts` reds a required CI leg from a clean checkout | blocking |
| `B2` | P1d PASS carried **two conditions on the edit that records it**; condition 1 is 3-of-6 unapplied, the sixth-pass row is missing, and the `### TDD-0070` entry still says the PASS is owed | blocking |
| `B3` | the `v8` paragraph is **v5 content with the label bumped**; v6 and v7 have no account in either evidence artifact | blocking |
| `B4` | the P7 sequence is right and **stops one commit short of the total the block certifies**; the paragraph round 7 required deleted was **duplicated** instead; the caption is five rounds stale | blocking |
| `B5` | `retractedClaims.test.ts`: **two of thirteen entries match nothing**, the every-entry-matches assertion is still absent (third round), and **six** refuted claims are live and unquoted — four named by line in round 7 | blocking |
| `B6` | the withdrawn Prettier claim is **still asserted as fact** twice in the same file, and appears in no evidence artifact | blocking |
| `M1` | round-7 `summary.json` records P1d at **3** where its own declared rule gives **8** — same slot, same wrong value as round 6, now sealed at HEAD | advisory |
| `M2` | round 7 `M1` unapplied: `X6`/`X7`/`X8` carry two meanings each and the status section counts them twice (20 stated, 17 distinct) | advisory |
| `M3` | round 7 `M2` unapplied: `:748` still says the refuted figure absence is pinned; that assertion was handed off | advisory |
| `M4` | round 7 `M4` unapplied, plus Gaps item 3 says **both** `todo` rows are parked on branch 3 — false for `TDD-0069` | advisory |
| `M5` | Delta Rejected Guard section covers rounds 1-2 artifacts only — **sixth** round, mandatory output | advisory |
| `M6` | `### Round 3 and round 4` still stops at round 4; rounds 5, 6 and 7 have finding counts nowhere | advisory |
| `M7` | round 7 `M3` half-applied; `:907-909` mis-attributes the pack numeral and the version to the wrong instrument | advisory |
| `m1`-`m16` | see MINOR | advisory |

**One thing changed that seven rounds could not: `## Ledger rows advanced` is substantively true.**
Read against `tdd/test-list.md:107-108`, `DR-0017-0010`, `CR-20260820-0012` and `## Final status`, the
lead sentence now agrees with the verdicts section, the duplicate paragraph is **gone** (verified by
needle grep, not by reading), and the section states plainly that neither cell is written and whose
they are. The blocking set below is about the sentences **around** that repair, and about a seal that
now only reproduces on one machine.

---

## What I re-derived and could not fault

Ran, in the working tree unless noted:

1. **The whole suite is GREEN.** `pnpm vitest run`: **5373 passed / 51 skipped (5424)**, 459 files
   passed / 8 skipped, exit 0.
2. **Both P7 legs, exactly as recorded.** `pnpm exec vitest run --project e2e` gives **1432 passed /
   16 skipped (1448)**, 84 files, exit 0. `--project integration --project unit` gives **1193 passed /
   19 skipped (1212)**, 171 files, exit 0. `:865-866` are the measured numbers.
3. **`ci:lint` exit 0 with eleven members**, counted from the root `package.json` chain
   (`format:check`, `lint`, `lint:md`, `check-bidi`, `check-instructions-size`,
   `check-review-profile-consistency`, `check-prompt-scanner-pair`, `check-workflow-hygiene`,
   `lint:shipping`, `lint:workflow-shape`, `check-pack-locations`). `check-types` exit 0.
4. **The scoped gate, in the shadow root: `info=2 warning=0 error=2`, exit 1**, and the membership is
   exactly what the record states — `QFAI-ATDD-111` = 1 US (`US-0017-0007`), `QFAI-ATDD-112` = 8 TCs
   (`0016`, `0030`, `0032`-`0035`, `0069`, `0070`).
5. **`--profile full`: `info=4 warning=404 error=4`.** All four members identified and all four match
   the record: `QFAI-REVIEW-004` / `-005` on `.qfai/review/review-20260821100000000/` (round 8 own
   in-flight pack), `QFAI-ATDD-111` **12 US across five specs** (0003 x8, 0006 x1, 0008 x1, 0015 x1,
   0017 x1 — so `:778-780` with 8+1+1+1 = 11 plus `US-0017-0007` = 12 is exact), `QFAI-ATDD-112`
   **15 TCs across four specs** (0003 x1, 0008 x4, 0015 x2, 0017 x8 — "this spec owns 1 and 8" exact).
6. **The eight pack seals.** Recomputed with the record own serialization
   (`git hash-object --no-filters`, single space, pack-relative paths in `LC_ALL=C` order, sha256 over
   the byte stream) and independently with the test `sealOf` verbatim. **All seven closed values
   recompute against the recorded ones**: `5c8cd425`, `305ffd65`, `257e793b`, `aaa2d2a6`, `5798d557`,
   `d99dff9c`, `ea0849f0`. Round 1 **superseded** `d8ac0a77` reproduces over its three reports as they
   stand now; the printed manifest reproduces line for line; the two-space variant reproduces
   `fa8d6e83`. Round 8 pack is correctly listed **IN FLIGHT** with no seal, and the test two rules
   (every older pack sealed, every recorded seal recomputes) admit that state. Eight `Review pack:`
   lines, eight directories at or after `FIRST_PACK`. **See `B1` for the one thing this does not
   survive.**
7. **The round / response / verdict counts are exact.** Counting `R0*.md` per pack: 2 + 4 + 3 + 3 + 3 +
   3 + 3 = **21 responses across 7 rounds**, and reading each report verdict line: **20 REVISE and one
   PASS**, the PASS being `review-20260821080000000/R04_qa-gatekeeper-p1d.md`. `:1026-1028` says
   exactly that. The round table seven revisions are each the revision that pack reviewers signed off
   at.
8. **The ledger, parsed mechanically** (82 data rows of 9 cells, header excluded): **71 `Integration` +
   11 `Unit` = 82**; **74 `refactor`, 6 `blocked`, 2 `todo`**; `Integration` cross-tab **63 / 6 / 2**;
   **four of the six** `blocked` rows carry `Blocked-By: CR-20260820-0007` (`TDD-0032`-`0035`).
   `:107` and `:108` are `TDD-0069` and `TDD-0070`, both `Status = todo`, `DR-ID = -`,
   `Blocked-By = -`, read cell by cell. **Nothing has been written ahead of the gate.**
9. **The `Evidence`-cell handover at `:309-333` is exact.** All three quoted fragments are verbatim in
   `tdd/test-list.md:107` — "NOT BLOCKED by a CR - waiting on data that does not exist yet", "the
   workflow changes are unmerged and CI has not run them", "becomes implementable once the pull request
   has three green ci-pass runs to cite" — and all three are refuted for the reasons given.
10. **The matrix.** `3 / 1 / 5` from the table own `Status` column; **38** failing depth cells over
    7 x 9 = 63 (12 pass, 13 warn), plus 5 in `Status`. The partition table sums to **A 30 / B 7 /
    C 1 = 38**, is **complete and disjoint**, and the per-row failing depth counts (3, 1, 2, 6, 6, 6,
    7, 5, 2) reconcile to it cell by cell. Eight columns in the header, eight in the row parse.
11. **`CR-20260820-0011`: 208 / 127 / 81.** `check-atdd-annotation-ledger.mjs` repo-wide exits 1 with
    **127** unbacked of **208** ledger claims (208 counted independently from
    `tests/e2e/qfai-traceability.md`); `spec-0012` alone at **28**; **16** specs; `spec-0017` at zero.
    Scoped: **8 claims backed, exit 0**.
12. **The six rejected-alternative bullets are at their six lines** — `07_Decisions.md:133`, `:137`,
    `:203`, `:206`, `:242`, `:249`, each a "Decision, rejected alternative" — against **nine**
    `DR-0017-*` in the same file, which is exactly the transposition `:33-36` records. The `Rejected`
    section of `09_delta.md` carries three candidates.
13. **All six per-file test counts, and every recorded vitest output.** Counting statement-initial
    callsites with the test own rule: `checkAtddAnnotationLedger` 22, `buildCommand` 16,
    `coverageDepthMatrix` 5, `stageEvidenceCounts` 7, `retractedClaims` 6, E2E 9 — matching `:110`,
    `:188`, `:191`, `:193`, `:196`, `:199`, `:180` and the recorded outputs at `:211`, `:224`, `:226`,
    `:228`, `:230`. **8 annotated describes**, matching `:181`. None of the counted files uses `.each`,
    so the callsite rule precondition holds.
14. **The P7 per-commit sequence deltas are right.** Counting e2e-project callsites (both directories
    the project globs) with `git show` at each revision: `3f815725` 858, `c40b2358` 861, `cb91e089`
    864, `ac4700d1` 867 — **+3, +3, +3**, exactly the deltas 1422 to 1425 to 1428 to 1431 claims.
    First round in four where the derivation reproduces. See `B4` for what it stops short of.
15. **`DR-0017-0010` `Status` line is fixed** — "**PASS at P1d pass 6** (`9a37421c`) — five REVISE
    before it". That is P1d condition 2, discharged. Round 7 `B3` load-bearing site is closed, and it
    was the one P1d named twice.
16. **The duplicate handover paragraph is gone.** Searched by needle rather than by eye: "Neither
    ledger cell has been written" occurs **once**, at `:286`. Rounds 5, 6 and 7 each required this and
    it is finally applied.
17. **The pack-count numeral is now derived**, though not where the record says. `COUNTED_CLAIMS` in
    `retractedClaims.test.ts:135-148` matches the "N packs, one per round" shape against the
    directories on disk, so `:1057` "**Eight** packs" is measured. Round 7 `B2` derivation requirement
    is satisfied in substance.
18. **The evidence and review trees are both prettier-ignored** (`.prettierignore`) and
    `.prettierrc.json` sets `proseWrap: "preserve"` for markdown with `endOfLine: "lf"`. The withdrawal
    premise is correct: **the formatter neither touches nor reflows these files.** See `B6` for what
    the withdrawal did not reach.
19. **Nothing was laundered in the round-7 re-seal.** `git diff --stat 9882a1d4 dbe00247` over that
    pack is `summary.json` alone, 15 insertions.
20. **The Delta Rejected Guard substance holds, and I ran it myself.** No rejected option of the
    `09_delta.md` `Rejected` section or of the six `07_Decisions.md` alternatives is reintroduced by
    this round changes, and **no RE-OPEN is required for anything in it.** `M5` is a completeness
    defect in the section, not a collision.

---

## BLOCKING

### B1 — the round-7 pack seal reproduces only from this working tree; on a clean checkout `stageEvidenceCounts.test.ts` fails, in the required `test (e2e)` leg

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:1092-1093`, `:1120-1133`, `:1141-1143`;
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:71-91`, `:307-359`;
  `.qfai/review/review-20260821080000000/R03_qa-gatekeeper.md`; `.gitattributes:2`;
  `.github/workflows/ci.yml:303`, `:308`
- **Contract**: `qfai-atdd/SKILL.md:294` (repository quality gates pass with evidence); `:298` (the
  seal is recomputed over the recorded path and compared with the **recorded** value); Not-done
  criteria; the record own account at `:1110-1118` of this exact failure mode
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:294` Success Criteria (repository quality
  gates) plus `:298` / `defect:correctness`

The `--no-filters` correction is the right diagnosis of the wrong half of the problem, and the value it
recorded cannot be reproduced by anyone else.

**Measured.** `.qfai/review/review-20260821080000000/R03_qa-gatekeeper.md` holds **423 CRLF and 345
lone LF** in the working tree. Its **committed blob** (`a5b8aaf8...`, from `git ls-files -s`) holds
**0 CRLF and 768 LF**: `.gitattributes:2` is `* text=auto eol=lf`, so git clean filter normalises the
file on the way in and `git status --porcelain` stays empty while the bytes on disk differ from the
object. It is the **only** file in all eight packs where `git hash-object` and
`git hash-object --no-filters` disagree — I checked all 36.

`stageEvidenceCounts.test.ts:87` reads working-tree bytes and hashes them. So:

```text
sealOf() verbatim, this working tree   -> ea0849f0b759bd8dc922f0dc5eaa8a788949e3639ee8e720c511200dcbab1451  == recorded
sealOf() verbatim, git archive HEAD    -> 3d56fd2edd484c0ffb8cd2b91fe2de93b1e1d65fd93d6a4c6d5a94fe740e2a92  != recorded
sha256 over the index blob hashes      -> 3d56fd2edd484c0ffb8cd2b91fe2de93b1e1d65fd93d6a4c6d5a94fe740e2a92
```

Every other pack agrees in both trees. A fresh checkout — which is what `.github/workflows/ci.yml:303`
(`runs-on: ubuntu-latest`) gives the `e2e` slice at `:308` — writes that report as LF-only, so the loop
at `:347-354` pushes

```text
review-20260821080000000: recorded ea0849f0b759…, recomputes 3d56fd2edd48…
```

and the assertion at `:355-358` fails. **The assets directory runs in the `e2e` project, which
`ci.yml` executes as a required matrix leg**, so this reds `test (e2e)` and then `ci-pass` on a second
job — the exact sequence `:876-880` narrates about the *first* version of this file, and which the
docstring at `:12-17` calls its own worst defect. **Third occurrence, same file.**

Two further consequences, both about what a seal is for:

1. **The recorded value is not auditable by anyone but this machine.** `:1141-1143` argues, correctly,
   that completion must recompare against the **recorded** value because the status section is outside
   every audit subject. That argument only has force if the recorded value is a function of the
   repository. It is now a function of one working tree line endings.
2. **`:1125-1126` premise is false as written** (see `m3`): "The first seven packs held LF-only files"
   — round 7 pack **is** the seventh, and the next sentence says it carries a CRLF report.

**Required fix.** Normalise that report to LF so its bytes equal its blob, then re-seal round 7 pack to
`3d56fd2edd484c0ffb8cd2b91fe2de93b1e1d65fd93d6a4c6d5a94fe740e2a92` and record `ea0849f0...` as
`superseded:` — the round-1 precedent at `:1135-1139` is exactly this case and says keeping the old
value is what makes the re-seal auditable. Or, if the bytes must stand, change the manifest rule at
`:1120-1122` to hash the **index** blob so the seal is a function of the repository rather than of a
checkout. Either way, run `vitest run tests/assets/stageEvidenceCounts.test.ts` against a
`git archive HEAD` tree before declaring the gate green, because the working tree cannot show you this.

### B2 — P1d PASS carried two conditions on the edit that records it; three of the six named sites are unapplied, the sixth-pass row is missing, and the `### TDD-0070` entry still says the PASS is owed

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:439-457`, `:472-474`, `:376-377`, `:811`,
  `:913-958`, `:989`; against `.qfai/review/review-20260821080000000/R04_qa-gatekeeper-p1d.md:13`,
  `:294-306`, `:352-360`
- **Contract**: `qfai-atdd/SKILL.md:322-325` (`## Ledger rows advanced` — the anchored `### TDD-NNNN`
  section is the payload); `qfai-implement/references/red-provenance.md:267` (the entry is the table row
  **plus** its anchored section); `qfai-implement/SKILL.md` step 3b (writes `exception` only when the
  entry carries the PASS); Evidence (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d plus `SKILL.md:322-325` /
  `defect:correctness`

The verdict line is "**PASS**, with two conditions on the edit that records it" (`R04:13`), and
`R04:294-306` names them:

```text
1. The six round-count sites. atdd:439, :458, :797, :973 and :1000 are all inside sentences
   asserting the PASS is still owed, so they must be rewritten anyway; write the count as five
   REVISEs across six passes, then this PASS, and add a sixth-pass row to the "P1d verdicts"
   section. :973 must stop saying a fourth re-route is owed ...
2. DR-0017-0010:10-12. The Status line ...
```

**Condition 2 is discharged** (verified item 15). **Condition 1 is 3 of 6:**

| P1d site (round-7 lines) | at HEAD | state |
| --- | --- | --- |
| `atdd:439` | `:1015-1016` "P1d returned `REVISE` five times before its pass-6 PASS" | **done** |
| `atdd:1000` | `:1016`, same sentence | **done** |
| `atdd:458` | `:472` "This is the row P1d **sustained across three passes**" | **unapplied** |
| `atdd:797` | `:811` "account P1d has **sustained four times running**" | **unapplied** |
| `atdd:973` | `:989` "**A fourth P1d re-route and a fifth stage round are owed.**" | **unapplied** |
| add a sixth-pass row to `### P1d's verdicts` | `:913-958` narrates first through **fifth** pass and stops | **unapplied** |

So the record still holds **four different values** for one quantity: three (`:472`), four (`:811`),
six (`:915`, `:1016`), and "a fourth re-route owed" (`:989`, plus `:376-377` "A re-route of P1d is owed
on the revision") — the last two contradicting `:1099-1101`, which says round 8 routes no P1d pass
because that gate closed.

**The load-bearing one is `:472-474`**, and it is worse than a stale count:

```text
:472-474  "Branch 3, `DR-0017-0010`, parked. This is the row P1d sustained across three passes:
           post-merge history cannot exist pre-merge, which is branch 3's own named example.
           The transition itself is still owed a P1d PASS — see 'P1d's verdicts' below."
```

That sits **inside `### TDD-0070`**, which `red-provenance.md:267` makes part of the row entry, and
step 3b writes `exception` **only when the entry carries the PASS**. The entry both records the PASS
(`:439-457`) and denies it (`:474`), 17 lines apart, and sends its reader to a section whose per-pass
narration has no sixth pass. P1d predicted this in writing (`R04:352-360`): "if the PASS-recording edit
does not also fix the six count sites and the DR Status line, TDD-0070 will carry exception while five
sentences ... say the PASS that authorised it is still outstanding. **That is a self-contradicting entry
under the step 3b rule, which would send the row back to todo with a handoff note.**"

**And the record discloses only one of the two conditions.** `:448-450` and `:456-457` record the
`Evidence`-cell condition and call it discharged — correctly; that is P1d Judgement 4. Nothing in
`### P1d's verdict: PASS, at the sixth pass` mentions the two conditions attached to the
`TDD-0070 -> exception` write at all. The one gate that has passed in eight rounds passed *with
conditions*, and the entry that carries the PASS does not say so.

**Required fix.** `:472`, `:811`, `:989`, `:376-377` and `:474` to the measured values in one edit; add
a **sixth pass** paragraph to `### P1d's verdicts`; and record both conditions and their status in
`:439-457`, so a step 3b reader learns from the entry that one is discharged and the other is not. Then
verify by grep, not by reading.

### B3 — the `v8` account is v5 content with the label bumped, and v6 and v7 have no account in either evidence artifact

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:621-627`, `:629-630`, `:640-641`;
  `.qfai/evidence/coverage-depth-spec-0017.md:192-204`, `:216-225`;
  `packages/qfai/tests/helpers/buildCommand.ts:4-30`;
  `git diff 9a37421c HEAD -- .qfai/evidence/atdd-spec-0017.md`
- **Contract**: `qfai-atdd/SKILL.md:342` (`## Work performed (what changed, where)`); `:361`
  (`## Execution logs`); Evidence (MANDATORY); round 6 `B5.3`, round 7 `B5`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

Round 7 `B5` found the paragraph describing "the three changes of **v5** as current" under a v5 heading
while `## Work performed` said v7. The repair changed **the label and nothing else**:

```text
git diff 9a37421c HEAD -- .qfai/evidence/atdd-spec-0017.md
  -`v5` lives in `packages/qfai/tests/helpers/buildCommand.ts` with its corpora in
  +`v8` lives in `packages/qfai/tests/helpers/buildCommand.ts` with its corpora in
```

`:621-627` now attributes to v8: "shell segments before verbs ...; **script bodies before names**,
resolved in the manifest the command directory selects ...; and three verdicts instead of two". Those
are **v5** three changes, and the record says so itself two files over — `coverage-depth:200-203`:
"**v5** shell segments, per-manifest script bodies, and a third `heuristic` verdict".
`buildCommand.ts:16-24` states v8 three: per-family grammar, **per-tool** passthrough verbs and
directory flags, and a spaced flag consuming its value unless it is a known boolean.

This is **worse than round 7 state**, not better. Then, the mislabel was self-detecting: a v5 heading
contradicted `## Work performed` v7. Now the label agrees with the helper and the content is wrong, so
it reads as authoritative. And the version history in `coverage-depth:192-204` runs v1-v5 and then jumps
to `:216` v8 — **v6 and v7 are gone from the record entirely**, though both existed in the tree, both
were measured by a reviewer (round 6 measured v6 at 20 missed / 2 false positives over 46 cases;
`buildCommand.ts:9-14` records v7 "Fifteen defects over fifty-nine probes"), and both are the reason v8
exists. Round 7 `B5` asked for the v6 paragraph to be **moved into the history list**; it was deleted.

Two smaller residuals in the same block: `:640-641` still names **one** build-spawning helper where
`buildCommand.ts:25-30` names three and makes the only-the-first clause load-bearing (round 7 `m5`,
unapplied); and the corpus enumeration at `:629-630` omits round 5 ten defects that
`coverage-depth:223-224` includes, and neither file names the round-6 or round-7 corpora (`m14`).

**Required fix.** Rewrite `:621-627` for v8 from `buildCommand.ts:16-24`, add v6 and v7 history lines to
`coverage-depth:192-204` with the measurement that broke each, and fix `:640-641` to the three helpers.
This is the largest code change of two rounds; the record account of what it does is false.

### B4 — the P7 sequence is correct and stops one commit short of the total the block certifies; the paragraph round 7 required deleted was duplicated instead; the caption is five rounds stale

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:857-861`, `:863-872`, `:874-875`, `:887`,
  `:890-899`, `:901-904`, `:906-909`; measured with `git show` at `3f815725`, `c40b2358`, `cb91e089`,
  `ac4700d1`, `9a37421c`, `9882a1d4`, `dbe00247`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Evidence (MANDATORY); round 3 `B4`, round 5
  `B1` / `M3`, round 6 `M1`, round 7 `B4`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

**The derivation itself is right, and I want that on the record** — it is the first time in four rounds.
Counting e2e-project callsites with `git show` at each named revision gives 858, 861, 864, 867: deltas
**+3, +3, +3**, exactly what 1422 to 1425 to 1428 to 1431 claims. Round 7 `B4` required split is applied
and applied correctly.

**Four defects around it.**

1. **The sequence does not reach the total the block certifies.** `:865` states **1432** for
   `test:e2e`; `:887` ends at `ac4700d1  1431`. The +1 is at `9882a1d4` (round 7 apply commit,
   callsites 867 to 868), which has no row. So the block asserts a total the sequence beside it cannot
   produce — endpoints right, derivation one step short, which is the same shape in a new guise.
2. **The paragraph round 7 required deleted was duplicated instead.** Round 7 `B4` said: delete
   `:887-888`. `:901-904` now repeats `:890-895` almost verbatim — both say the first derivation
   "credited round 5 with six tests where ... four", both say "three loop-guard tests were added at a
   revision whose diff for that file is empty", both cite 1186 + 2 = 1188 — and the sentence that was to
   be deleted is welded onto the end of the duplicate at `:903-904` ("Round 6 opened with
   `retractedClaims.test.ts`, three more under `e2e`: 1425 -> 1428"), mid-line, without a break.
   **An insertion where a deletion was required**, in the block rewritten to answer a finding about
   this block, and the very defect class `:291-294` reports as finally fixed nine hundred lines earlier.
3. **`:860-861` still reads "measured at the tree that carries every round-4 repair"**, in front of
   round-8 numbers. Round 3 `B4`, round 5 `B1` and round 7 `B4` each asked for the revision hash beside
   the totals. **Fifth round open** — and `:906` now asserts of those totals that they "carry a
   statement of when they were measured", which the stale caption makes false.
4. **`:874-875` still enumerates six projects** and then names `e2e` as a seventh in the next clause.
   `packages/qfai/vitest.workspace.ts` declares **seven** (`core`, `unit`, `validators`, `integration`,
   `e2e`, `cli`, `scripts`). Round 7 `B4` required this; unapplied.

**On the question I was asked — removing the causal account was the right call, with one loss.** The
causal table was the site of three consecutive wrong derivations, and every one failed the same way: a
prose *cause* (the matrix row-width round; `retractedClaims.test.ts` at 5 tests) was attributed to a
delta without being measured. The attribution was the error; the endpoints were always right, which is
why looking at the totals never caught it. A bare per-commit sequence has no attribution to get wrong
and I verified it in one command, so the change removes the defect at its source. The loss is real but
acceptable: the sequence no longer says *what* changed, so the oracle-family tallies at `:998-1002` can
no longer be reconciled against suite growth — and that loss is covered, because
`stageEvidenceCounts.test.ts` now derives the per-file counts, which is the checkable half of what the
table used to assert. What is **not** acceptable is defect 1: a sequence must reach the number it exists
to justify.

**Required fix.** Add the `9882a1d4` row (1431 to 1432) and a `dbe00247` row or a statement that HEAD
adds none; delete `:901-904` outright and verify with `git diff` that it is gone; put `dbe00247` beside
both totals in `:863-872` and rewrite `:860-861`; `:874` to seven projects.

### B5 — `retractedClaims.test.ts` is green with two dead needles, the every-entry-matches assertion is still absent, and six refuted claims are live and unquoted

- **Artifacts**: `packages/qfai/tests/assets/retractedClaims.test.ts:68-121`, `:343-355`, `:1-39`;
  `.qfai/evidence/atdd-spec-0017.md:141`, `:376`, `:472`, `:811`, `:989`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the file own stated purpose at `:4-9` —
  prose cannot be trusted to say whether prose was deleted, so the rule is enforced instead of
  announced; round 6 `B2` fix (a), round 7 `B6` fixes (a), (b), (d); P1d round-7 `A1`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

I replicated `flatten`, `quotedSpans` and `occurrences` over the five `GOVERNANCE` files
(`tmp/r8/retract_probe.mjs`), read-only, and ran the thirteen live entries plus twelve candidates.

**The mechanism is sound and I credit it.** Whole-document search with per-paragraph quote pairing,
zero-width substitution, emphasis stripping and lower-casing all work; every entry that matches is
quoted; the suite is green. **The coverage is not.**

**1. Two of the thirteen entries match nothing at all.**

```text
entry 11  "P1d has returned REVISE three times"    hits=0   DEAD
entry 13  "defeated by the formatter"              hits=0   DEAD
```

Both were **added this round** to answer round 7 `B6` and to record the Prettier withdrawal. Entry 11
was added while the sites it was for kept their **other** wording — `:472` "sustained across three
passes", `:811` "sustained four times running" — which are the sites round 7 `B3` named by line. So the
round added a needle for a phrasing that no longer exists and left the phrasings that do. That is the
Three-packs pattern round 7 identified as `B6` defect 3, **reproduced twice in the round that answered
it**.

**2. Round 7 `B6` fix (b) — assert that every entry matches at least one occurrence — is still not
there, and it is exactly what would have caught (1).** The sixth test (`:343-355`) checks
`RETRACTED.length > 8`, that each claim carries no emphasis markers, that each reason is non-empty, and
`GOVERNANCE.length > 4`. **It never checks that an entry matches anything.** Round 6 specified this
assertion, round 7 required it; **third round unapplied**, now with a measured demonstration rather than
an argument.

**3. Six refuted claims are live and unquoted**, and four were named by file and line in round 7:

```text
needle                                  site        verdict
"Rebuilt around the verb"               atdd:141    *** WOULD REDDEN ***
"sustained across three passes"         atdd:472    *** WOULD REDDEN ***
"sustained four times running"          atdd:811    *** WOULD REDDEN ***
"A fourth P1d re-route"                 atdd:989    *** WOULD REDDEN ***
"a fifth stage round are owed"          atdd:989    *** WOULD REDDEN ***
"a re-route of P1d is owed"             atdd:376    *** WOULD REDDEN ***
```

`atdd:141` — "Rebuilt around the verb and re-observed: **10 of 10 forms redden**" — is refuted by name
at `atdd:596` and by `coverage-depth:206-208`. Round 7 `B6` required the wording added; what was added
instead is entry 12, **"rebuilt the scan around"**, whose stated purpose is to be shorter than the
earlier entry so a one-word drift cannot escape it. The actual drift deletes **the scan**, so entry 12
does not match `atdd:141` either. Two attempts, both missing the site.

**4. The request procedural claim fails two of its three legs.** Verified by grep, as asked:

```text
zero remaining N-times phrases           FALSE  -> atdd:472 three passes, atdd:811 four times running
zero .exec in the derived-count guard    TRUE   -> stageEvidenceCounts.test.ts has none
zero unquoted refuted claims             FALSE  -> the six above
```

**5. Fix (d) is unapplied.** The docstring (`:1-39`) still does not disclose that the list tracks
**wordings** rather than claims — which is now demonstrable four ways in this finding.

**Required fix.** (a) Apply `B2`, then add "sustained across three passes", "sustained four times
running", "a re-route of P1d is owed" and "Rebuilt around the verb" to `RETRACTED`, and either retire
entry 11 or reword it to the phrasing that exists. (b) Assert that **every** entry matches at least one
occurrence across `GOVERNANCE` — one line over the result of `occurrences()`, and the only structural
defence against wording drift. (c) Add the phrase NOT BLOCKED by a CR (P1d `A1`; both occurrences are
quoted today, so it is free). (d) Disclose the wording-not-claim residual in the docstring.

### B6 — the withdrawn Prettier claim is still asserted as fact twice in the same file, and the withdrawal appears in no evidence artifact

- **Artifacts**: `packages/qfai/tests/assets/retractedClaims.test.ts:16-19`, `:278`, `:118-120`,
  `:171-174`; both evidence files (by absence); `.prettierignore`, `.prettierrc.json`
- **Contract**: `qfai-atdd/SKILL.md:361` (`## Execution logs`); Evidence (MANDATORY); the file own rule
  at `:4-9` — a refuted claim may appear only as a quotation
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

**The real cause is now explained, and correctly.** `:171-174` says the line-break note in an earlier
version of the docstring blamed Prettier and that this was false, because `.prettierignore` excludes the
evidence tree and `.prettierrc.json` sets proseWrap preserve for markdown, so the formatter neither
touches nor reflows these files; the breaks are hand-wrapped; and the claim came from round 6 report and
was adopted without checking. I verified every clause against `.prettierignore` (both the evidence and
the review trees are ignored, with only README negations) and `.prettierrc.json` (proseWrap preserve,
endOfLine lf). So yes: the guard docstring explains the real cause.

**The withdrawal is not complete.** The refuted claim still stands as a bare assertion, 155 lines above
its own retraction, in the file whose stated rule is that this may not happen:

```text
:16-19  The second matched needles containing spaces against text where Prettier had put
        newlines ... a guard whose premise is that prose cannot be trusted was defeated by
        running the formatter ci:lint enforces.
:278    because the needle had a space where Prettier had a newline.
```

Neither is quoted, and neither is reachable by the guard: `GOVERNANCE` (`:48-54`) does not include the
test own source, and even if it did, the needle "defeated by the formatter" does not match "defeated by
**running** the formatter" — **the same wording-drift escape as `B5`, inside the file that holds the
retraction.** That is why entry 13 measures `hits=0`.

**And no evidence artifact mentions it.** A case-insensitive grep for prettier, formatter, hand-wrapp
and proseWrap over `.qfai/evidence/atdd-spec-0017.md` and `.qfai/evidence/coverage-depth-spec-0017.md`
returns **nothing**. A completion gate reads the evidence; the only record that this stage asserted a
false cause and withdrew it lives in a test-helper docstring and in `review_request.md:41-42`.
`## Execution logs` has no family for this guard at all (`m13`), so the rewrite discriminating power is
visible to reviewers and not to the gate.

**Required fix.** Rewrite `:16-19` and `:278` to quote the refuted wording rather than assert it, reword
entry 13 to a phrase that occurs (or drop it, per `B5`), and record the withdrawal in
`## Execution logs` or `## Gaps` with the two configuration facts that refute it.

---

## MAJOR

### M1 — the round-7 `summary.json` records P1d at 3 where its own declared rule gives 8, and this round seal certifies it

- **Artifacts**: `.qfai/review/review-20260821080000000/summary.json`; against `R02`, `R03`, `R04` in
  the same pack
- **Contract**: `qfai-atdd/SKILL.md:298` (check that the status section says what that pack says)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:298` / `defect:correctness`

Counted by the rule the file itself declares (distinct finding identifiers of the B / M / L / N / A
shape):

```text
R02_completion-reviewer.md   B1-B6, M1-M7, m1-m8   = 21   recorded 21   OK
R03_qa-gatekeeper.md         B1-B11, A1-A7         = 18   recorded 18   OK
R04_qa-gatekeeper-p1d.md     M1, A1-A7             =  8   recorded  3
```

Round 7 `M7` reported this for the round-6 pack as B1, B2, M1, A1-A5 = 8 against a recorded 3. The same
slot, the same wrong value, in the pack sealed **at HEAD** — so this round seal event carried the defect
forward rather than catching it. The overall status FAIL, the P1d status PASS and the revision
`9a37421c` are all correct. **Required fix:** correct the count to 8, or state the rule the counts
actually follow; a pack edit means a re-seal, which `B1` already requires.

### M2 — round 7 `M1` unapplied: three mutation ids carry two meanings each and the status section counts them twice

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:665`, `:673-682`, `:734`, `:738-743`, `:999-1001`
- **Contract**: `qfai-atdd/SKILL.md:361`; the reason `:1002-1003` itself gives for renaming off the
  earlier id families
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The heading at `:665` lists `X6` as two members swapping classes, `X7` as a cell claimed by two classes,
`X8` as a table cell emptied. The heading at `:734` lists `X6` as a ninth all-failing depth column, `X7`
as the refuted accuracy figure restored, `X8` as the version drifting back. `:999-1001` then counts
**sixteen** for the first family and **four** for the second: 16 + 4 = 20 stated, **17 distinct**. The
heading at `:665` also claims `X1` through `X8`, eight ids, while listing six. Unchanged from round 7.
**Required fix:** renumber the second family and correct both totals.

### M3 — round 7 `M2` unapplied: `:748` still says the refuted figure absence is pinned

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:740`, `:744-748`; against
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:325-331`
- **Contract**: `qfai-atdd/SKILL.md:342`, `:361`; Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The matrix test comment at `:325-331` records, well and deliberately, that the absence assertion for the
refuted accuracy figure was **removed** and handed to `retractedClaims.test.ts`. `:748` still reads that
the refuted figure **absence** is pinned, and `:740` still lists `X7` (the refuted accuracy figure is
restored, REDDENS) under a family whose instrument no longer holds that check. The outcome still holds —
entry 6 of `RETRACTED` matches three quoted occurrences — but the account of which instrument holds it is
false, and a deliberate design change is undisclosed in the artifact a completion gate reads.
**Required fix:** rewrite `:744-748` to record the hand-off and re-attribute `X7`.

### M4 — Gaps item 3 understates `QFAI-ATDD-112` by seven and says both `todo` rows are on branch 3

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:774-776`, `:777-784`; against `:983`, `:302-307`,
  `:413`
- **Contract**: `qfai-atdd/SKILL.md:294`, `:300-306` (Not-done: validation evidence failing); round 4
  P1d `M1`, round 5 `M2`, round 6 `B6`, round 7 `M4`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality
  gates) / `defect:correctness`

Two defects in three lines. First, item 3 still presents **eight** as the whole `-112` obligation while
`build` runs the unscoped profile and needs **fifteen** across four specs. `:983` has it right; the
section a completion gate reads for surviving obligations does not. Round 7 `M4`, unapplied.

Second, and new: it says **the two `todo` rows are parked on branch 3 above**. Only `TDD-0070` is.
`TDD-0069` is `blocked` on `CR-20260820-0012` and takes **no** RED-provenance branch — which is
precisely what `:302-307` and `:413` say, and precisely the false statement `:302` reports as having
been corrected after standing for two rounds. It survives here in different words. **Required fix:** add
the repo-wide 15 with its per-spec split; correct the branch-3 attribution to `TDD-0070` alone.

### M5 — the Delta Rejected Guard section covers rounds 1-2 artifacts only; sixth round; mandatory output

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:31-50`
- **Contract**: `qfai-atdd/SKILL.md:145` (Delta Rejected Guard, Mandatory);
  `constitution/shared-skill-operating-baseline.md` Delta Rejected Guard section
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard

`:46-50` still reasons about `check-atdd-annotation-ledger.mjs` and about not writing
`06_Test-Cases.md`. Nothing about `buildCommand.ts` (rewritten twice since), `buildCommand.test.ts`,
`stageEvidenceCounts.test.ts`, `coverageDepthMatrix.test.ts`, `retractedClaims.test.ts` (now reading
five governance records) or option 5 of `CR-20260820-0012`. Round 4 `m3`, round 5 `M5`, round 6 `M3`,
round 7 `M5` — **sixth round**. **I ran the guard myself and the conclusion holds** (verified item 20):
no rejected option is reintroduced and **no RE-OPEN is required**. This is a completeness defect in a
mandatory output. **Required fix:** re-run the section against the current artifact set and record the
sentences.

### M6 — the round-3-and-4 table still stops at round 4, so rounds 5, 6 and 7 have finding counts nowhere

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:960-978`, `:971`; against the `summary.json` of
  rounds 5, 6 and 7
- **Contract**: `qfai-atdd/SKILL.md:298`; Evidence (MANDATORY); round 6 `M5`, round 7 `M6`, P1d round-7
  `A2`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY)

All three rounds of counts are on disk (17/17/3, 18/20/3, 21/18/3). `:1032-1040` carries verdicts
without findings, so `:960-978` is the only place findings are tabulated and it is **three** rounds
behind. `:971` still reports round 4 P1d as 3 blocking, which P1d corrected to 2 blocking plus 3 major
in round 6 and again in round 7. **Required fix:** extend and rename the table through round 7 and fix
`:971`.

### M7 — round 7 `M3` half-applied, and `:907-909` names the wrong instrument for two of its four claims

- **Artifacts**: `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:107-143`, `:187-193`,
  `:216-223`; `.qfai/evidence/atdd-spec-0017.md:907-909`, `:210-238`
- **Contract**: `qfai-atdd/SKILL.md:361`; Evidence (MANDATORY); round 6 `B5`, round 7 `M3`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:code-quality`

**Applied:** `retractedClaims.test.ts` is now in `CLAIMS` (`:138-142`), `COUNTED` (`:220`) and `OWED`
(`:191`), and its run is recorded at `:228-229` at 6 passed, which is what the file holds. Credit.

**Not applied:** `stageEvidenceCounts.test.ts` is still absent from `OWED`, so its own run is still
**permitted** to go unrecorded, and the commands section (`:210-238`) still records five files and not
it. And `:907-909` asserts that everything derivable about the artifacts — per-file test counts,
annotated describes, the recorded guard output, the named packs — is now checked by
`stageEvidenceCounts.test.ts`. Two of those are checked **elsewhere**: the pack-count **numeral** by
`retractedClaims.test.ts:135-148`, and the classifier version by `coverageDepthMatrix.test.ts:339-346`.
Naming the wrong instrument is the `M3` defect class again. **Required fix:** add
`stageEvidenceCounts.test.ts` to `OWED` and record its run; rewrite `:907-909` to name each instrument
for what it actually derives.

---

## MINOR

### m1 — `:302` says "Rounds 1 through 5" in the section that has been faulted seven times

Round 7 `B1.3` required six; rounds 6 and 7 both faulted this section, so it is **seven**. **Sixth**
round in which the count of rounds that faulted this section is wrong inside this section.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m2 — the correction table fourth row points at a phrase that no longer exists and was itself retracted

`:434` pairs the retracted statement "the exception P1d PASS as the blocker for both" with a rewritten-at
cell reading "Neither transition is authorised". That phrase occurs **nowhere** in the file except inside
this cell (grepped), and it is itself refuted now that P1d has passed. `:436-437` claims each retracted
statement is now stated where a reader meets it; row 4 sends the reader nowhere.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
`defect:correctness`.

### m3 — the no-filters paragraph premise contradicts its own next sentence

`:1125-1126` reads: the first seven packs held LF-only files, and round 7 pack carries one report with
CRLF line endings. Round 7 pack **is** the seventh. Measured across all 36 files in the eight packs:
exactly one has CRLF (`review-20260821080000000/R03_qa-gatekeeper.md`, 423 CRLF / 345 lone LF) and
exactly one has filtered and unfiltered hashes disagreeing. The substance — which pack, which flag,
which value — is right; the sentence should say **six**. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md:298`.

### m4 — `:829` says three blocking reviewers, contradicting the manifest and the table at `:511`

`agent-routing.yml` gives the atdd review phase `blocking_agents` of `qa-gatekeeper` and
`completion-reviewer`, with `implementation-reviewer` conditional. Round 3 `M4`, round 4 `m1`, round 5
`m1`, round 6 `m1`, round 7 `m1` — **sixth** round. **Severity: advisory** | **Traces to:**
`agent-routing.yml` atdd phases.

### m5 — `:836` still records the round-2 implementation reviewer at 15 findings

`review-20260820220000000/R01_implementation-reviewer.md` holds B1-B4, M1-M6 and m1-m9 = **19**. Round 3
`m2` through round 7 `m2` — **sixth** round. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m6 — the stated derivation of the round counts yields 27, not 21

`:1029-1030` says the numbers are derived from the `review-2026082*/R0*.md` glob. That glob also matches
`review-20260820140000000` and `review-20260820180000000`, which are `/qfai-implement` packs of 3
responses each, giving **27**. `stageEvidenceCounts.test.ts:35` gets this right with an explicit
`FIRST_PACK` boundary; the prose does not. The **number 21 is correct** (verified item 7); the recipe is
not, and a reader checking the claim gets a different answer. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md:298`.

### m7 — round 7 pack was sealed one commit after its last reviewer response, with `summary.json` added at the seal and no superseded value

`SKILL.md:298` fixes the seal at when the last reviewer response lands. Traced with
`git log --diff-filter=A`: the three round-7 reports landed in `9882a1d4`; `summary.json` and the seal
both landed in `dbe00247`. That is the **fifth** occurrence in seven closed packs (rounds 2, 5, 6 and 7
late by one or two commits; rounds 3 and 4 in the same commit as their reports), and `:1061-1064` /
`:1103-1105` still tell the round-3-and-4 version of the story that round 7 `m4` refuted. **I verified
nothing was laundered** (verified item 19), so this is an auditability gap. **Severity: advisory** |
**Traces to:** `qfai-atdd/SKILL.md:298` / `defect:code-quality`.

### m8 — `:874-875` enumerates six vitest projects; the workspace declares seven

Round 7 `B4` required it. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence
(MANDATORY).

### m9 — the twelve-runs figure at `:401` and `DR-0017-0010:89`

P1d measured **23** runs at round 7 (20 failure, 3 cancelled, none green). The load-bearing point holds
and the figure goes stale every commit — P1d marked it non-blocking (`A5`) and I agree; better to drop
the figure. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m10 — `:640-641` names one build-spawning helper where the docstring names three

Round 7 `m5`, unapplied. Folded into the `B3` required fix. **Severity: advisory** | **Traces to:**
`qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m11 — `:796` names a `W1` to `W3` family that the execution logs do not define

`## Execution logs` defines the ledger ratchet as `R1`-`R3` (`:705-719`) — the same three directions.
`:1001-1003` asserts every family is defined under that section, which round 5 `B7` established as the
rule. The `W` family is not. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:361`.

### m12 — the version pin is derived but still unanchored, so round 7 `B5.3` vacuity is only half closed

`coverageDepthMatrix.test.ts:339-346` derives the version from the helper docstring, which closes the
failure round 7 measured (a literal v6 holding the record stale) and is a real improvement. But the
assertion is still a bare `toContain` over the **whole file**, not anchored to the sentence naming
`buildCommand.ts`, which is what round 7 required. The record own convention adds a history line per
version, so the describing sentence can lag the history list and the pin will pass.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
`defect:code-quality`.

### m13 — no execution-log family for `retractedClaims.test.ts` or the row-width guard

Round 7 `m6`, unapplied. The two instruments most rebuilt across rounds 6-8 have no oracle round
recorded, and the whole-document / counted-claims rewrite of this round has none either — so the only
evidence that it discriminates is my replication in `B5`, which lives in a review pack rather than in
the evidence. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:361`.

### m14 — the corpus enumeration is two rounds behind in both evidence files

`:629-630` lists round 4 twenty regressions, v4 fifteen kept forms, the eighteen non-builds and every
run line; `coverage-depth:223-225` adds round 5 ten defects. Neither names round 6 forty-six-case corpus
(20 missed / 2 false positives) or round 7 fifty-nine-probe corpus (15 defects), which are the corpora
that broke v6 and v7 and which `buildCommand.ts:9-14` cites. Round 7 gatekeeper `A6`.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m15 — the phrase NOT BLOCKED by a CR is still absent from `RETRACTED`

P1d round-7 `A1`. Both occurrences in governance files are quoted today (`:315`, `:321`), so the entry is
free to add and closes the last claim-level gap on the handover instruction. **Severity: advisory** |
**Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m16 — this round own pack is the source of the two review-layout errors

`.qfai/review/review-20260821100000000/` at `dbe00247` holds only `review_request.md`, which raises
`QFAI-REVIEW-004` and `-005` at error severity under the full profile. This is a **sequencing note on my
own round**, not a gap: committing the request before the reviewers launch is what fixed round 1
moving-tree problem, and `:982-987` discloses it accurately. **Severity: advisory** | **Traces to:**
`defect:code-quality`.

---

## Rulings on the questions put to me

### The suite colour, and every figure in the P7 block

**GREEN, and the block figures are exact — but the block certifies a total its own derivation does not
reach.** Whole suite 5373 / 51, exit 0. `test:e2e` **1432 / 16** exit 0; integration plus unit
**1193 / 19** exit 0; `ci:lint` exit 0 with eleven members; `check-types` exit 0; the guard at 8 backed,
exit 0; the scoped gate `info=2 warning=0 error=2` with exact membership; the full profile `error=4` with
all four members identified. Third consecutive round where the record certifies the colour it has.

**The per-commit derivation reproduces**: +3, +3, +3 across `3f815725`, `c40b2358`, `cb91e089`,
`ac4700d1`, measured from e2e-project callsites with `git show`. What is wrong is that it ends at 1431
while `:865` says 1432, with no row for `9882a1d4` (`B4.1`); that `:901-904` is a duplicate of `:890-895`
carrying the sentence round 7 required deleted (`B4.2`); and that the caption is five rounds stale while
`:906` asserts it is a statement of when the totals were measured (`B4.3`).

**Was removing the causal account right, or a loss? Right, and I would not go back.** Three consecutive
derivations were wrong in the same way — a prose cause attributed to a delta without being measured — and
the endpoints were right every time, which is why the totals never caught it. A bare per-commit sequence
has nothing to attribute and I verified it in one command. The loss is that the sequence no longer says
*what* changed, so the oracle-family tallies at `:998-1002` can no longer be reconciled against suite
growth; that is covered, because `stageEvidenceCounts.test.ts` derives the per-file counts, which is the
checkable half of what the table used to assert. The uncovered half is `B4.1`: a sequence must reach the
number it exists to justify.

### `## Ledger rows advanced`, against the ledger, the DR, the CR and the status section

**True for the first time in eight rounds, on the question the section exists to answer.** The lead
sentence at `:278-279` — one row routed to branch 3, one `blocked`, and P1d has now authorised both
writes — agrees with `:439-457`, with the `DR-0017-0010` Status line, with `CR-20260820-0012`, and with
`## Final status:1012-1023`. The duplicate paragraph three rounds required deleted is **gone**, verified
by needle grep rather than by reading.

**And the record says which, explicitly and correctly.** `:286-289`: "**Neither ledger cell has been
written, and this table is the handover, not the ledger.** `tdd/test-list.md:107-108` has both rows
`todo` with `DR-ID: -` and `Blocked-By: -`; those cells are `/qfai-implement`s to write." I read both
rows cell by cell and that is exact. `## Final status:1012-1014` says the same. The `Evidence`-cell
condition at `:309-333` quotes all three refuted fragments verbatim from `:107` and is right about all
three.

**What is not discharged is the condition on the PASS itself** (`B2`): three of the six count sites P1d
named, the sixth-pass row, and `:474` telling a step 3b reader inside the `### TDD-0070` entry that the
PASS is still owed. That is not a question about the row — nothing analytical is owed on either row — it
is the arithmetic around it, and P1d wrote the failure mode down in advance.

### `## Final status`

**The seals are the best-verified part of this record and the one thing that will not survive a clone.**
All seven closed values recompute against the recorded ones from this working tree; round 1 superseded
value, the printed manifest and the two-space variant all reproduce; the in-flight pack is correctly
unsealed and the test two rules admit that state; eight packs named, eight on disk. The round, response
and verdict counts — 7, 21, 20 REVISE plus 1 PASS — are exact, and the pack-count numeral is now derived
(`retractedClaims.test.ts:135-148`), which is round 7 `B2` requirement met.

**The no-filters correction is the right diagnosis applied the wrong way** (`B1`). Only one file in eight
packs has CRLF and only there does the flag matter, so the *observation* is exactly right. But the value
recorded is a hash of this machine working-tree bytes, which git does not track: the committed blob is
LF-only, `git status` is clean, and a fresh `ubuntu-latest` checkout recomputes `3d56fd2e...` against a
recorded `ea0849f0...`. That fails `stageEvidenceCounts.test.ts` in the required `test (e2e)` leg — the
third time this file has red a required leg — and it makes the seal unverifiable by the audience a seal
exists for.

Residual: the round-7 `summary.json` misstates one of its three counts by its own rule (`M1`), and
`SKILL.md:298` makes that file the thing the status section is compared against.

### Every number re-derived

**Everything reproduces except the two flagged.** Reproduced exactly: 1432 / 16 and 1193 / 19, both exit
0, and 5373 / 51 whole-suite; `ci:lint` at eleven members; the full profile `error=4` with all four
members; the eight pack seals plus round 1 superseded value, the two-space variant and the printed
manifest; the unscoped `-111` at 8/1/1/1/1 = 12 across five specs and `-112` at 1/4/2/8 = 15 across four
with "this spec owns 1 and 8" exact; the ledger at 82 / 71 / 11, 74 / 6 / 2 and Integration 63 / 6 / 2
with four of six `blocked` on `CR-20260820-0007`; the matrix at 3 / 1 / 5, 38 plus 5 cells and
A30 / B7 / C1 complete and disjoint; `CR-20260820-0011` at 208 / 127 / 81 with spec-0012 at 28 and 16
specs; the scoped guard at 8 backed, exit 0; the six rejected-alternative bullets at their six lines
against nine DRs; **all six per-file test counts, every recorded vitest output and the 8 annotated
describes**; and the P7 sequence three deltas.

Wrong:

| figure | recorded | measured |
| --- | --- | --- |
| round-7 pack seal | `ea0849f0...` (`:1093`) | `3d56fd2e...` from the repository; `ea0849f0...` only from this working tree (`B1`) |
| the e2e endpoint of the sequence | `ac4700d1 1431` (`:887`) above 1432 (`:865`) | 1432 needs a `9882a1d4` row; the sequence has none (`B4`) |
| the P7 measurement caption | the tree that carries every round-4 repair (`:860-861`) | round-8 numbers, no revision recorded (`B4`) |
| P1d passes sustaining the row | three passes (`:472`), four times running (`:811`) | **six** (`:915`, `:1016`) (`B2`) |
| P1d re-routes owed | a fourth re-route and a fifth stage round (`:989`), a re-route is owed (`:376`) | **none**; the gate closed (`B2`) |
| the classifier three changes | v8 (`:621-627`) | **v5**, label bumped, content unchanged (`B3`) |
| rounds faulting the handover | Rounds 1 through 5 (`:302`) | **seven** (`m1`) |
| distinct falsification rounds | sixteen plus four (`:999-1001`) | **17**; three ids counted twice (`M2`) |
| the `-112` obligation | 8 rows of this spec (`:774`) | **15** across four specs for `build` (`M4`) |
| both `todo` rows branch | parked on branch 3 (`:776`) | `TDD-0070` only (`M4`) |
| round-2 R01 findings | 4 / 6 / 5 = 15 (`:836`) | **19** (`m5`) |
| round-7 P1d findings | 3 (`summary.json`) | **8** by the rule the file declares (`M1`) |
| ci-pass runs | twelve (`:401`, `DR:89`) | **23** at round 7 (`m9`) |
| the derivation recipe | the `review-2026082*/R0*.md` glob (`:1029`) | that glob gives 27 responses; 21 is right (`m6`) |

**Three of these were introduced inside the repair of a finding about that exact class:** the v8 label
over v5 content (round 7 `B5`); the duplicated P7 paragraph where a deletion was required (round 7 `B4`);
and two dead needles added to the guard that exists to stop dead claims (round 7 `B6`).

### The withdrawn Prettier claim

**The cause is now correctly explained and the withdrawal is incomplete.**
`retractedClaims.test.ts:171-174` states the real cause and every clause of it verifies against
`.prettierignore` and `.prettierrc.json`. But `:16-19` and `:278` still assert the refuted version as
fact, unquoted, in the file whose rule is that this may not happen; the `RETRACTED` entry for it matches
**nothing** because the needle says "defeated by the formatter" and the text says "defeated by
**running** the formatter"; and no evidence artifact mentions the claim or its withdrawal at all. See
`B6`.

### Completeness of the disclosed gaps

**The recorded gaps are accurate and I could not fault one of them.** The five unsatisfied stories and
the placeholder lanes (`:768-771`); `US-0017-0007` uncovered by choice (`:772-773`); the four places a
build is reached with the two opaque heuristic hits, pinned as a set (`:632-644`); 127 unbacked claims
held by a ratchet (`:785-796`); the E2E surface unable to exercise a run (`:797-800`); the vacuity
pattern recurring inside a vacuity repair (`:801-806`); Stage Minimum Roles unused for P2-P4 with the
manifest quoted (`:499-523`); the missing stage gatekeeper of round 3 (`:967`, `:973-978`); the full
profile at `error=4`, measured and exact (`:982-987`); the blocked-versus-exception gate asymmetry named
plainly (`:335-340`); and the authorisation state of both rows.

**Undisclosed and material, introduced or left by this round:**

1. **The round-7 seal is not reproducible from the repository and reds a required CI leg** (`B1`).
2. **The PASS carried two conditions and only one is disclosed**, while the `### TDD-0070` entry denies
   the PASS (`B2`).
3. **The v8 account is v5**, and v6 and v7 have no account anywhere (`B3`).
4. **The P7 sequence stops before the total it justifies**, and a required deletion became an insertion
   (`B4`).
5. **Two `RETRACTED` entries are dead**, the every-entry-matches assertion is still absent, and six
   refuted claims are live (`B5`).
6. **The Prettier withdrawal reaches neither its own file assertions nor any evidence artifact** (`B6`).
7. **The round-7 `summary.json` count is wrong inside a seal taken this round** (`M1`).
8. **The handover instruction at `:329-333` is enforced by nothing**, in either direction — disclosed as
   an instruction, not as an unguarded one. Round 7 raised this and it stands.

---

## Required fixes (blocking only)

1. **`B1`** — normalise `review-20260821080000000/R03_qa-gatekeeper.md` to LF and re-seal round 7 pack
   to `3d56fd2edd484c0ffb8cd2b91fe2de93b1e1d65fd93d6a4c6d5a94fe740e2a92`, recording `ea0849f0...` as
   `superseded:` per the round-1 precedent at `:1135-1139`; **or** change the manifest rule at
   `:1120-1122` to hash the index blob. Then run
   `vitest run tests/assets/stageEvidenceCounts.test.ts` against a `git archive HEAD` tree, not the
   working tree. Fix `:1125-1126` to six (`m3`).
2. **`B2`** — `:472`, `:811`, `:989`, `:376-377` and `:474` to the measured values in one edit; add a
   sixth-pass paragraph to `### P1d's verdicts`; record **both** of P1d conditions and their status in
   `:439-457`. Verify by grep.
3. **`B3`** — rewrite `:621-627` for v8 from `buildCommand.ts:16-24`; add v6 and v7 history lines to
   `coverage-depth:192-204` with the measurement that broke each; fix `:640-641` to three helpers.
4. **`B4`** — add the `9882a1d4` row (1431 to 1432); delete `:901-904` and verify with `git diff`;
   record `dbe00247` beside both totals and rewrite `:860-861`; `:874` to seven projects.
5. **`B5`** — add the four live wordings to `RETRACTED` and retire or reword the two dead entries;
   assert that **every** entry matches at least one occurrence across `GOVERNANCE`; add the NOT BLOCKED
   by a CR phrase; disclose the wording-not-claim residual in the docstring.
6. **`B6`** — quote rather than assert at `retractedClaims.test.ts:16-19` and `:278`; make entry 13
   match text that exists; record the withdrawal in an evidence artifact.

## Advisory / Change Request proposals

- Correct the round-7 `summary.json` P1d count (`M1`) — the re-seal `B1` requires is the moment to do it.
- Renumber the second X family and fix both totals (`M2`).
- Record the refuted-figure pin hand-off and re-attribute `X7` (`M3`).
- Add the repo-wide 15 for `-112` and correct the branch-3 attribution in Gaps item 3 (`M4`).
- Re-run the Delta Rejected Guard against the current artifact set (`M5`) — mandatory output, sixth
  round of artifacts uncovered, substance verified sound by me, no RE-OPEN required.
- Extend the finding-count table through round 7 and fix `:971` (`M6`).
- Add `stageEvidenceCounts.test.ts` to `OWED`, record its run, and name the right instrument at
  `:907-909` (`M7`).
- The sixth-round items: the three-blocking-reviewers label (`m4`) and the round-2 R01 count (`m5`).
- **A satisfiable guard for the handover instruction**, unchanged from round 7 and still not built: green
  whenever the row `Status` is `todo` **or** its `Evidence` cell no longer contains the NOT BLOCKED by a
  CR phrase, red only when `Status` is `blocked` **and** the cell still says it. Satisfiable at every
  point in time, inside this spec test tree and inside the DoD, so not a new product obligation.
- **A pack in flight breaks two gates, for the fourth round.** `QFAI-REVIEW-004` and `-005` fire on a
  pack whose contents cannot exist when the directory does. This is a product obligation upstream never
  asked for, so per `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations` it
  **must not gate this rework**; a `CR-*` against whichever skill owns `review-artifact-layout.md` is the
  place for it. Nothing in the blocking set depends on it.
- **Consider a line-ending check over the review and evidence trees.** `B1` exists because a tracked file
  can carry bytes git does not store while `git status` stays clean. That is a general hazard for any
  hash-over-working-tree-bytes guard in this repository, not just this seal. A proposal, not a blocking
  finding.

## Open risks / residuals

- **The suite is green whole and both required legs pass in this tree.** The one gate colour I cannot
  certify is CI, and `B1` says why: `stageEvidenceCounts.test.ts` fails from a clean checkout. That is a
  repository quality gate under `SKILL.md:294` and it blocks completion on its own.
- **`## Ledger rows advanced` is finally true**, and the residual is entirely in the sentences around it
  (`B2`). Nothing analytical is owed on either row; six textual edits and no gate re-route stand between
  eight rounds of work and the two writes P1d authorised.
- **Two guards protect wordings rather than claims**, still. `retractedClaims.test.ts` has two dead
  needles and no assertion that an entry matches anything (`B5`); `coverageDepthMatrix.test.ts:339-346`
  derives the version but does not anchor it (`m12`). Both fixes are one line.
- **The seal contract is otherwise in its best state**: seven closed seals, a monotone rule, the
  in-flight pack disclosed, the recorded-value rule stated correctly at `:1141-1143`, and the numeral
  derived. `B1` is about the input to that machinery, not the machinery.
- **The authorship-separation breach stands** and is unrepairable retroactively. Eight rounds of
  independent reviewers repair the gate, not the history.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; `check-atdd-annotation-ledger.mjs` closes that direction for `spec-0017` only and is not
  in `ci:lint`.
- **No oracle round was run against a mutated tracked file.** Every `B5` and `B1` result comes from
  replicating the predicates of the tests over the tree as committed, or from a `git archive` copy of it.
  The occurrences are read, not planted.
- **Concurrency.** I ran alongside whichever other reviewers this round routes. Own shadow root
  (`tmp/r8/shadow`) and own scratch (`tmp/r8/`); the tracked `.qfai/report/validate.log` was never
  written by me and any run-log pointer in the working tree may reflect another run.

## PENDING

- **The behavioural corpus of v8.** I did not execute the classifier: the helper is a TypeScript module
  under `packages/qfai/tests/`, a probe under `tmp/` per Article XI cannot resolve `vitest` from there,
  and placing a config inside `packages/qfai/` would be a mutation. So I make **no verdict** on whether
  v8 is correct, on the per-tool tables, on the boolean-flag list, or on whether the member-level pinning
  fails when a member is deleted. That is the domain of `qa-gatekeeper` and `implementation-reviewer` and
  my role contract routes it there. What I did check and can report is `B3`: the record **account** of v8
  is v5, and v6 and v7 have no account at all.

## Evidence checked

- `.qfai/review/review-20260821100000000/review_request.md`;
  `.qfai/review/review-20260821080000000/` all five files (`R02` whole, `R03` structure and identifier
  set, `R04` whole, the request, `summary.json`); all eight pack file listings with per-file blob hashes,
  filtered and unfiltered; `git log --diff-filter=A` per pack file; every report verdict line
- `.qfai/evidence/atdd-spec-0017.md` (whole, 1153 lines);
  `.qfai/evidence/coverage-depth-spec-0017.md` (whole, 354 lines, parsed mechanically)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically: 82 data rows of 9 cells; `:107-108`
  read cell by cell including both `Evidence` cells in full); `07_Decisions.md:133`, `:137`, `:203`,
  `:206`, `:242`, `:249` and its nine DRs; the `Rejected` section of `09_delta.md`
- `.qfai/decisions/DR-0017-0010-*.md:1-30` and `:80-95`; `CR-20260820-0012-*.md` and
  `CR-20260820-0011-*.md` via the guard `GOVERNANCE` set
- `.qfai/assistant/skills/qfai-atdd/SKILL.md:74`, `:145`, `:224`, `:280-370`;
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:280-310`, `:388-441`
- `packages/qfai/tests/assets/retractedClaims.test.ts` (whole);
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole);
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:290-360`;
  `packages/qfai/tests/helpers/buildCommand.ts:1-45`, `:111`, `:127`, `:251`;
  `packages/qfai/vitest.workspace.ts`; the root `package.json` (`ci:lint`, eleven members);
  `.prettierignore`; `.prettierrc.json`; `.markdownlint-cli2.jsonc`; `.gitattributes`;
  `.github/workflows/ci.yml:296-320`
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` at start and finish;
  `git ls-files -s` (83 tracked symlinks); a `git archive HEAD` shadow root with relative-target symlink
  re-materialisation (83 created, 83 verified against `git cat-file blob`); shadow-root
  `validate --profile atdd --fail-on error --spec 0017` (`info=2 warning=0 error=2`, no shadow artifact)
  and `--profile full` (`info=4 warning=404 error=4`) with the `-111` and `-112` membership extracted per
  spec; `pnpm ci:lint` (exit 0); `pnpm -C packages/qfai check-types` (exit 0);
  **`pnpm vitest run` (exit 0, 5373 / 51)**, `--project e2e` (exit 0, **1432 / 16**), and
  `--project integration --project unit` (exit 0, **1193 / 19**);
  `node scripts/check-atdd-annotation-ledger.mjs` with and without `--spec 0017` (127 unbacked of 208,
  exit 1; 8 backed, exit 0) plus an independent 208 count and a per-spec split; seal recomputation in two
  serializations plus the superseded manifest (`tmp/r8/seal.py`), an index-blob variant
  (`tmp/r8/seal_ci.py`) and the test own `sealOf` verbatim over both trees (`tmp/r8/sealof.mjs`);
  a per-file line-ending and filtered-versus-unfiltered hash census over all 36 pack files
  (`tmp/r8/lineendings.py`); e2e-project callsite counts at seven revisions (`tmp/r8/e2ecount.sh`);
  mechanical re-parses of the ledger cross-tab and of the matrix tally and partition; the
  retracted-claims oracle over the five governance files with 25 needles (`tmp/r8/retract_probe.mjs`);
  and the audit-hash procedure (`tmp/r8/audithash.py`)
- **Not re-run:** the resolver mutations `E6`-`E11`; the matrix falsification rounds; the behavioural
  corpora of the classifier (PENDING). No finding above rests on any of them.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares Severity and Traces to; no blocking finding traces to none
- [x] Required gates and residual risks are recorded, and one gate is declared **PENDING** rather than
      assumed
- [x] No mutation persisted: HEAD `dbe00247` at start and finish, `git status --porcelain` empty at both,
      `.qfai/report/validate.log` still `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` (equal to
      `git rev-parse HEAD:.qfai/report/validate.log`), both validate run-logs inside `tmp/r8/shadow`, and
      every oracle result derived by replicating the predicates of the tests over the tree as committed
      rather than by planting anything
