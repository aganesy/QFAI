# R02 — completion-reviewer, round 3

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 3
- **Reviewed revision: `1473897a`.** `git status --porcelain` was **empty** at start and empty at
  finish; HEAD did not move (`1473897a` at both ends).
- **Audited evidence hash (stage review):
  `sha256:dc63c9df7f1adff05f0b58deb50ea521610564c2999bde8bd0e22181fede2068`** — four steps of
  `constitution/shared-skill-delegation-baseline.md:408-441`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` with the `## Final status` **section** removed (lines 558-582
  excised, lines 584-663 retained; normalized
  `dfec517953a5ac4a475abc0cb3615d8fdbd4e566770e76518043605628e3b900`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`a7415bbbae2cfafa0c45944a9ce7ded00a196170b3ca33b55afef2dfaa4a5c70`), serialized as
  `path + NUL + sha256` sorted by path, hashed.
  **The subject is now ambiguous and that is finding B6.** Round 2's reviewer took "minus
  `## Final status`" as a truncation ("cut at line 480"). At `1473897a` a section follows
  `## Final status`, so truncating instead yields
  `sha256:752a997622e0bc24d0b74cb9c2fd545a4f729490521e57e268e453cb4e0d5112` — a different aggregate
  for one tree. Gate item 10 cannot reproduce a hash whose subject has two readings.
- Authored/edited under review: **none.**
- Mutations: **two oracle mutations to `.qfai/evidence/coverage-depth-spec-0017.md`, each planted
  alone and reverted in the same step with a sha256 comparison** (see M3). Baseline
  `a7415bbb…4a5c70`, final `a7415bbb…4a5c70`, byte-identical; `git status --porcelain` empty after
  each. `validate` ran four times against a `git archive HEAD` shadow root with all **83** tracked
  symlinks re-materialised natively from the index (83 declared, 83 present), so no `QFAI-LINK-001`
  fired and the tracked `.qfai/report/validate.log` was never written. Scratch under
  `tmp/r03-completion/` only. No `git checkout` / `stash` / `reset`, no commit, no push.

## Verdict summary

**Seven blocking, five major, four minor.** The round-2 repairs I could check mechanically are, with
the exceptions below, real: every ledger number, every matrix number, both pack seals, the
`CR-20260820-0011` figures and the Work Orders table re-derive exactly. The `blocked`
re-classification of `TDD-0069` rests on a **real** unresolved Change Request (Question 3).

What did not survive is the same section that failed in rounds 1 and 2 — `## Ledger rows advanced`
now holds a branch for `TDD-0069` that its own prose retracts 35 lines later — plus a cluster of
numbers that were restated rather than re-derived, exactly as the request predicted, and **a pack
obligation nobody has discharged**: round 2's pack is missing the `summary.json` that
`QFAI-REVIEW-004` raises at `error`, has no recorded seal, and the seal fields are in the wrong
section of the record.

## What I re-derived and could not fault

Every number below was measured from the artifact, not read from a prior report.

1. **The ledger, parsed mechanically (82 rows of 9 cells, ids `TDD-0001`-`TDD-0082`, no gaps, no
   duplicates).** `Layer`: **71 `Integration` / 11 `Unit`**. `Status`: **74 `refactor` / 6 `blocked` /
   2 `todo`**. Cross-tab `Integration` x status: **63 `refactor` / 6 `blocked` / 2 `todo`**. All four
   figures at `atdd-spec-0017.md:21-22`, `:236`, `:300-301` are exact. The 6 `blocked` are
   `TDD-0016, 0030, 0032, 0033, 0034, 0035`, and **four** carry `Blocked-By: CR-20260820-0007`
   (`:511-512`, exact). The columns are `TDD-ID` / `TC-Refs` / `Layer` / `Test file` / `Selector` /
   `Status` / `DR-ID` / `Blocked-By` / `Evidence` — round 2's `m1` fix at `:553-556` is verbatim
   correct. `63 + 6 + 2 = 71` closes `:247`.
2. **The matrix, parsed mechanically.** 9 rows x 7 depth columns = 63 cells, tallying
   **12 OK / 13 WARN / 38 FAIL**. `Status`: **`3 / 1 / 5`** — `coverage-depth:57` and `atdd:360`
   exact. **38 depth failures plus 5 in `Status`** — `:114` exact. The partition table's 38 members
   are **complete**, **disjoint**, contain **no non-failing member**, and no member names a column
   that is not a depth column; class sizes **A 30 / B 7 / C 1** — `:139` exact. Round 2's `M1` is
   substantively closed (residual: M3).
3. **`CR-20260820-0011`'s figures, re-derived twice.** The guard reports 127 unbacked / exit 1
   repo-wide and `8 claim(s) backed (spec-0017)` / exit 0 scoped. Independently: **208** unique
   ledger claims, **127** unbacked, **81** backed, and the per-spec table (`0001 9` … `0016 7`,
   `0017 0`) matches **line for line**; it sums to 127 and covers **16** non-zero specs, exactly as
   the CR says.
4. **The scoped gate.** Shadow run: `info=2 warning=0 error=2`, `QFAI-ATDD-111` on exactly
   `US-0017-0007`, `QFAI-ATDD-112` on exactly `TC-0017-0016/0030/0032/0033/0034/0035/0069/0070` —
   the 6 `blocked` + 2 `todo` rows. No `QFAI-LINK-001`.
5. **Round 2's `B3` is fixed and the fix is right.** Repo-wide `--profile atdd`, tallying the
   finding's own `refs=`: `SPEC-0003 8`, `SPEC-0006 1`, `SPEC-0008 1`, **`SPEC-0015 1`**,
   `SPEC-0017 1` = 12; siblings 11. `:513-515` now reads `spec-0015` (**1**) and `8+1+1+1 = 11`
   closes against its own total.
6. **Both pack seals reproduce, and the manifest is now the hashed form.**
   `5c8cd42571c8baf5f2240515ee2fbd173892cecd09d53ace080900d5c74317e3` over the four files of
   `review-20260820200000000` with a **single** space; the superseded
   `d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9` over the same three reports as
   they stand today, which proves them untouched between the seals; and the two-space form yields
   exactly the `fa8d6e83…` the record quotes at `:655`. The block at `:659-662` is byte-identical to
   what I hashed. Round 2's `m3` is closed and this is the record's strongest passage.
7. **The Work Orders deviation table is exact, field by field**, against
   `agent-routing.yml:139-206`: `coverage` (mandatory `test-design-analyst`, `qa-strategist`;
   blocking `test-design-analyst`), `red` (mandatory `delivery-planner`,
   `acceptance-test-engineer`; conditional `qa-gatekeeper`; blocking `delivery-planner`,
   `qa-gatekeeper`), `implementation`, `evidence` (conditional `devops-ci-engineer`,
   `qa-gatekeeper`; blocking `qa-gatekeeper`), `review`. Round 2's item 10 holds. (One label error
   elsewhere in the record contradicts this table: M4.)
8. **The Delta Rejected Guard's substance holds.** `09_delta.md § Rejected` carries exactly
   **three** `- Candidate:` bullets, and each is correctly characterised at `:35-43`. No rejected
   option is reintroduced: `06_Test-Cases.md` was not written, no SPLIT was proposed, and
   `check-atdd-annotation-ledger.mjs` collides with neither of `DR-0017-0004`'s two rejections
   (`07_Decisions.md:133`, `:137`) — it parses no workflow YAML and no spec artifact. (The **count**
   of rejected alternatives is wrong: B3.)
9. **The ratchet is sound, including a direction the record does not claim.**
   `checkAtddAnnotationLedger.test.ts:330` pins `wide.checked` at **exactly** `toBe(208)` alongside
   `toBeLessThanOrEqual(127)`, so *adding* a claim reddens on both counts and removing one reddens on
   `checked`. The `:522-524` characterisation ("reddens on a new unbacked claim and stays green all
   the way down to zero") is accurate. Residual blind direction: a **compensated** substitution — one
   claim backfilled while another test's annotation is deleted — holds both figures. Narrow; not a
   finding.
10. **P7, at HEAD.** `pnpm ci:lint` **exit 0**, and `package.json:19` splits on `&&` into exactly
    **eleven** members. `pnpm -C packages/qfai test:e2e` -> **1418 passed / 16 skipped**, exit 0 —
    `:616` exact. `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` -> 9 passed; 8 `describe`s and 8
    `QFAI:` annotations, matching `:178` and `:234`. `tests/assets/coverageDepthMatrix.test.ts` -> 4
    passed. (The other two P7 numbers are wrong: B4.)
11. **The `blocked` ground is real.** I verified every link of `CR-20260820-0012`'s cycle
    statically and by measurement — see Question 3.
12. Round 2's `B1`, `B3`, `B4`, `M1`, `M2`, `M3`, `m1`, `m2`, `m3`, `m5` are applied; I checked each
    and found no reintroduction. `DR-0017-0010` correctly frames the transition as
    `/qfai-implement`'s to write (`DR:172-174`) — the DR is more careful than the evidence that
    summarises it, which is B1.

---

## BLOCKING

### B1 — `## Ledger rows advanced` holds a branch for `TDD-0069` that its own section retracts, and that the ledger does not carry

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:254`, `:258-261`, `:296-298`, `:322`, `:326-332`;
  `.qfai/specs/spec-0017/tdd/test-list.md:107`
- **Contract**: `qfai-atdd/references/red-provenance.md#evidence-shape` — the
  `## Ledger rows advanced` table "is an index: one row per `TDD-*`, holding the branch and an
  anchor", and "Exactly one form per row, never both and never neither";
  `qfai-implement/references/execution-ledger.md:185-187` (`blocked` needs `Blocked-By`);
  `execution-ledger.md#blocked-rows` (`blocked` is not `exception`)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1b/P1d +
  `red-provenance.md#evidence-shape` / `defect:correctness`

**This is the third consecutive round in which this one section carries a false statement of fact
about the obligation it exists to discharge.** Round 1: "All 71 `Integration` rows are already at
`refactor`". Round 2: "the two rows are no longer deadlocked". Round 3:

- `:254` — "**Two rows are routed to branch 3 and parked**";
- `:258-261` — the index table gives **both** rows branch `3 — exception` and `DR-ID: DR-0017-0010`;
- `:296-298` — 35 lines later, same section: "The DR is revised, **`TDD-0069` is re-classified to
  `blocked`**, and the cycle is filed as `CR-20260820-0012`."

Those cannot both be true. `blocked` is not branch 3 and not a branch at all: `red-provenance.md`
offers three (`observed-red`, `falsifiability`, `exception`), and `execution-ledger.md#blocked-rows`
says in as many words "It is **not** `exception`". So after the re-classification exactly **one** row
is on branch 3, and the index — the artifact `/qfai-implement` step 3b reads to decide the
transition — names the wrong branch and the wrong governance id for the other. A `blocked` row's
reference belongs in `Blocked-By`, and `TDDLIST_BLOCKED_MISSING_REF` errors without it; `DR-ID` is
the `exception` field.

**And the ledger carries neither status.** Parsed at `1473897a`: `TDD-0069` and `TDD-0070` are both
`Status = todo`, `DR-ID = -`, `Blocked-By = -`. "is re-classified" states as accomplished a cell the
stage did not write and says at `:189` it may not write. `DR-0017-0010:172-174` gets this exactly
right — "the transition is `/qfai-implement`'s to write, and it **should** write `todo -> blocked`
with `Blocked-By: CR-20260820-0012`" — so the DR is correct and the evidence's summary of it is not.

**The row's own subsection compounds it.** `### TDD-0069` still reads "**Branch 3 it is**, recorded
in `DR-0017-0010`" (`:322`) and "The row stays `todo` in the ledger until `/qfai-implement` writes
`todo -> exception`, which it may do **only** with the `qa-gatekeeper` PASS that P1d takes on the
`DR-*`" (`:326-328`). Neither applies to a `blocked` row: `todo -> blocked` needs a `Blocked-By`
reference and no reviewer PASS exists or is required for it.

**Required fix.** In the index table, give `TDD-0069` the disposition the DR decided — `blocked`,
`Blocked-By: CR-20260820-0012`, no `DR-ID` — and leave `TDD-0070` at `3 — exception` /
`DR-0017-0010`. Change `:254` to say one row is on branch 3 and one is proposed for `blocked`.
Restate `:296-298` as the recommendation the DR actually makes ("the DR records that
`/qfai-implement` should write `todo -> blocked`"), not as a completed re-classification. Rewrite
`:322-332` for the `blocked` disposition and state what step 3b will do with the row while it is
still `todo`.

### B2 — `## Final status` says `TDD-0070` "is parked at `exception`" when the gate that must PASS first returned REVISE

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:573`, `:574-576`; against `:280`, `:298`;
  `.qfai/specs/spec-0017/tdd/test-list.md:107-108`
- **Contract**: `qfai-implement/SKILL.md:116` (`exception` writes `todo -> exception` "**and only
  when the entry carries the `qa-gatekeeper` PASS P1d took on that `DR-*`**");
  `red-provenance.md:411` (handed over "once the `DR-*` is written");
  `qfai-atdd/SKILL.md:298` ("check that `## Final status` says what that pack says")
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d / `defect:correctness`

`## Final status` — the section that *is* the completion contract — states:

> - `TDD-0070` is parked at `exception` against `DR-0017-0010`, and branch 3 does not close a spec;
> - `TDD-0069` is parked at `blocked` on `CR-20260820-0012` …

Both are false as statements about state, and the first is false against this record's own text 275
lines earlier: `:280` records P1d's verdict as "**REVISE**, on `16f611c7`" and `:298` says "A
re-route of P1d is owed on the revision; **this stage does not claim it**." A row cannot be *at*
`exception` while the PASS that is the sole precondition for writing it does not exist. In the
ledger both rows are `todo` with `DR-ID: -` / `Blocked-By: -`.

This is the same defect as B1 landing in the one section a completion gate reads first, and it is
worse there: `## Final status` is excluded from the audit subject precisely so it can be trusted as
the status of record, and a reader who takes it at face value concludes the branch-3 handover
completed.

**Required fix.** `:573-576` must say what is true: `TDD-0070` is **proposed** for
`todo -> exception` against `DR-0017-0010` and a P1d re-route is owed on the revised DR; `TDD-0069`
is **proposed** for `todo -> blocked` on `CR-20260820-0012`; **both rows are at `todo` in the
ledger** and `/qfai-implement` writes both.

### B3 — "`07_Decisions.md` carries nine rejected alternatives" is false; it carries six

- **Artifact**: `.qfai/evidence/atdd-spec-0017.md:33`
- **Contract**: `constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`;
  `qfai-atdd/SKILL.md` Evidence (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard /
  `defect:correctness`

The § "Delta Rejected Guard — confirmation" opens:

> `09_delta.md § Rejected` carries three candidates and `07_Decisions.md` carries **nine** rejected
> alternatives.

Measured: `07_Decisions.md` carries **nine `DR-*` records** (`### DR-0017-0001` … `-0009`) and
exactly **six** `Decision, rejected alternative` bullets — lines `133`, `137` (`DR-0017-0004`),
`203`, `206` (`DR-0017-0006`), `242`, `249` (`DR-0017-0007`). **Six of the nine DRs record no
rejected alternative at all.** "Nine" is the DR count transposed onto the alternatives; it was
inherited from round 2's verification item 9, which said "nine DRs … and their rejected alternatives
are as characterised", and re-published as a count of alternatives without being re-derived. The
same failure mode, one artifact over, as the `spec-0015 (2)` the same round corrected.

It matters because the number is the denominator of the guard's own claim. "No rejected option is
reintroduced" over nine options is a wider assertion than the file supports, and the sentence is the
first thing a reader of this section sees. The **characterisation** at `:44-45` ("validator
placement, ledger timing and the own tree's validate copy") is correct and is exactly the three DRs
that carry alternatives — so this is a one-token fix: nine -> six, ideally with "across three of the
nine `DR-*`".

### B4 — the P7 gate evidence describes neither the artifacts under review nor their true size

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:108`, `:185`, `:205-206`, `:612-623`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Evidence (MANDATORY) — evidence verifiable by
  a party that did not author it
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

Three stated numbers are wrong and the block they sit in predates what it certifies.

**The guard's test count is stated as 10 in three places and is 19.**
`checkAtddAnnotationLedger.test.ts` holds **19** test blocks and runs **19 passed (19)** at
`1473897a`. The record says "ten tests" (`:108`), "10 tests" (`:185`) and "Tests 10 passed (10)"
(`:205-206`). At `56daee8d` it was 10; `21ea1ddc` added nine — including the six over the CLI entry
point this round's own request names — and no occurrence was updated.

**The suite total is wrong.** `:617-618` records
`vitest --project integration --project assets --project unit` at "1171 passed / 19 skipped". At
`1473897a`: **1174 passed / 19 skipped (1193)**, 170 files passed / 4 skipped, exit 0. This round's
request states 1174, so the correct figure was available and the record was not re-derived.

**And the block is stale by construction.** `git log -S` puts the whole
`### P7 quality gates, round 2` block, and the `1171`, in **`16f611c7`**. `21ea1ddc` then landed
**+489/-76 across four files** — `coverageDepthMatrix.test.ts`,
`spec0017LayeredCiScaffoldE2E.test.ts`, `checkAtddAnnotationLedger.test.ts` and
`check-atdd-annotation-ledger.mjs`. So the P7 evidence offered for the round-2 repairs was measured
**before three of the four artifacts that constitute them**. That is round 2's `M4` recurring one
level up: `M4` was "no P7 evidence is cited for the round-2 additions", the repair cited a run, and
the run predates the additions — with wrong numbers.

**Required fix.** Re-run all four P7 members at the revision under review and restate them; fix the
three `10 tests` occurrences; and name the revision each P7 figure was measured at, since a bare
number in this block has now been wrong twice for the same reason.

### B5 — round 2's pack is missing `summary.json`, has no recorded seal, and raises an `error` in the profile the required context runs

- **Artifacts**: `.qfai/review/review-20260820220000000/` (five files, no `summary.json`);
  `.qfai/evidence/atdd-spec-0017.md:584-663` (the round-2 section, which records no pack or seal for
  it)
- **Contract**: `qfai-implement/references/review-artifact-layout.md:9-12` (`summary.json`
  **required**) and `:21-31` (minimum shape, `revision_form` + `revision` mandatory);
  `qfai-atdd/SKILL.md:298` ("**Seal the P8 pack too**: when the last reviewer response lands, and
  before this stage writes its verdict"); `.github/workflows/ci.yml:409-427`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (review pack seal) +
  Stage Gate P7 / `defect:correctness`

Measured against the shadow root at `1473897a`:

```text
validate --profile tdd   --fail-on error   ->  info=5 warning=376 error=2   (QFAI-ATDD-111, -112)
validate --profile sdd   --fail-on error   ->  info=4 warning=26  error=0
validate --profile full  --fail-on error   ->  info=4 warning=404 error=5
```

The three extra `full`-profile errors are:

```text
[error] QFAI-REVIEW-004  review pack lacks summary.json   (.qfai/review/review-20260821000000000)
[error] QFAI-REVIEW-005  review pack has no Rxx_*.md      (.qfai/review/review-20260821000000000)
[error] QFAI-REVIEW-004  review pack lacks summary.json   (.qfai/review/review-20260820220000000)
```

Only these two packs are flagged; every earlier pack, including `review-20260820200000000`, has its
`summary.json`. The third-round pack's two are mine-in-progress and are a sequencing note (m3).
**The round-2 pack's is owed and missing.** Its last response (`R04`) landed at `a241b90e`, the stage
wrote its verdict and opened round 3, and `references/review-artifact-layout.md:9-12` requires the
file.

`.github/workflows/ci.yml:409-427` runs `validate --profile full --fail-on error --root .` inside
`build`, so this is an `error` in the required status context — currently masked only because the
`tdd` step at `:375-388` fails first. The record does not disclose it anywhere.

**And the pack has no seal.** `:627-628` records `Review pack:`
`.qfai/review/review-20260820200000000/` — **round 1's** pack — inside a section headed "Round 2".
Round 2's own pack has no `Review pack:` line and no `Review pack seal:` anywhere in the record. It
also cannot be sealed as it stands: an incomplete pack is exactly what forced the round-1 re-seal,
which this record documents at `:636-638`. The lesson was recorded and not applied one pack later.
Round 2's reviewer flagged this in advance ("this round's pack ... needs its own seal **recorded**
and then **separately recomputed**").

**Required fix.** Write `.qfai/review/review-20260820220000000/summary.json` to the
`review-artifact-layout.md:21-31` shape (five reviewers incl. `R04`, `overall_status: FAIL`,
`revision_form: "content-hash"`, `revision`), then seal that pack and record its path and seal, with
its **file list**, alongside round 1's — keeping round 1's rather than replacing it. Confirm the
`full`-profile `error` count after the write.

### B6 — the seal fields are outside `## Final status`, so they sit inside the audit subject and the subject now has two readings

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:558` (`## Final status`), `:584`
  (`## Round 2, and the P7 evidence for it`), `:627-628` (the seal fields)
- **Contract**: `qfai-atdd/SKILL.md:298` — "record it **outside the pack** in the stage evidence
  file's **`## Final status`** as `Review pack:` ... and `Review pack seal:` ... **That section is
  the one part excluded from the P8 audit subject, so writing it there does not stale the verdict**";
  `qfai-atdd/SKILL.md:345-365` (the mandated section list, which **ends** at `## Final status`)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:298` Success Criteria (review pack
  seal) / `defect:correctness`

The two fields the contract places in `## Final status` are at `:627-628`, inside a section the
mandated template does not declare and which sits **after** the section the template ends with. Two
consequences, both structural:

1. **The seal is now inside the P8 audit subject.** The single reason `SKILL.md:298` puts it in
   `## Final status` is that that section is excluded, "so writing it there does not stale the
   verdict". Where it now sits, recording or updating a seal moves the `Audited evidence hash` — the
   exact failure the placement rule prevents. Sealing round 2's pack (B5) will stale this round's
   verdicts.
2. **The subject has two readings and they disagree.** Round 2's reviewer implemented "minus
   `## Final status`" as a truncation. Excising the section (lines 558-582, keeping 584-663) gives
   `dc63c9df...fede2068`; truncating at it gives `752a9976...4e0d5112`. One tree, two audit hashes,
   and the truncating reading silently drops **106 lines** including the entire P7 block, the seal,
   and the serialization statement that makes the seal checkable.

**Required fix.** Move `Review pack:` / `Review pack seal:` and the seal's serialization paragraph
into `## Final status`; relocate the round-2 narrative before it so the record ends where
`SKILL.md:345-365` says; and state explicitly in the record which reading of "minus
`## Final status`" the audit subject uses.

### B7 — `E6`-`E11` cites six oracle rounds; five exist, and the stage evidence records three

- **Artifacts**: `.qfai/evidence/coverage-depth-spec-0017.md:282`;
  `.qfai/evidence/atdd-spec-0017.md:417-434`, `:597-598`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — verifiable by a party that did not author
  it; `references/test-case-depth-checklist.md:78-87`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

`coverage-depth-spec-0017.md:282`, justifying the row that rose to a pass:

> Rewritten to run the step, **six rounds redden (`E6`-`E11`)** with a comment control green.

`git grep E11` across every tracked file returns **two** hits: that sentence, and this round's own
request, which inherited it. **`E11` is recorded nowhere and was never run.** The real rounds are
five: `E6`, `E7`, `E8` by the stage (`atdd:429-433`) and `E9`, `E10` by round 2's `qa-gatekeeper`
(`R03_qa-gatekeeper.md:83-84`, `:548`, each marked "not measured by the stage").

Worse, the stage evidence's own § "E6-E8" (`:417-434`) still records **only three** rounds. `E9` and
`E10` appear nowhere in it; `:597-598` refers to them as "two rounds this stage had not measured"
with no ids, no targets and no results. So the `Execution logs` section — the record of the oracle
evidence behind the one score that **rose** this stage — is short by the two rounds that strengthen
it and cites one that does not exist. A reviewer asked to check `E6`-`E11`, as this round's request
asks, cannot: one sixth of the cited evidence is not there.

**Required fix.** Record `E9` and `E10` in § "Execution logs" with their targets and results, cite
`R03_qa-gatekeeper.md` as their author, and restate the range as `E6`-`E10` — or run an `E11` and
record it. Do not leave a range whose upper bound is unrecoverable.

---

## MAJOR

### M1 — `CR-20260820-0012`'s cycle says `error=0` needs `QFAI-ATDD-112` clear; at HEAD it needs five errors clear, three of them this stage's own

- **Artifact**: `.qfai/decisions/CR-20260820-0012-*.md:18-25`, `:40-42`, `:96-100`
- **Contract**: `drift-protocol.md#when-drift-is-detected` (a Change Request states the defect it
  records); `qfai-atdd/SKILL.md` Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `defect:correctness`

The cycle diagram reads `error=0 requires QFAI-ATDD-112 clear`. Measured at `1473897a`, that is true
of the **`tdd`** step (`error=2`, and the two rules are exactly `QFAI-ATDD-111` / `-112` — matching
R04's live `error=2 warning=372 info=5` at `16f611c7`), and **false of `build`**, which also runs
`--profile full --fail-on error --root .` at `ci.yml:409-427`, where `error=5`. The three extra are
the `QFAI-REVIEW-004` / `-005` findings of B5, two of them raised by packs this stage created.

So the CR's closing sentence — the four options "all have the same shape: break the dependency of
the _run_ on the _annotation_" — is not sufficient: breaking it leaves `build` red on three review
pack errors. The cycle **is real** and I sustain it (Question 3); what is overstated is the
single-cause framing, in the record whose whole subject is a mis-stated obstacle. Add the
`full`-step errors to the diagram, or scope the diagram to the `tdd` step by name.

### M2 — Option 1 attributes to `BR-0017-0053` a rationale the rule does not state, and drops the one input that is failing

- **Artifacts**: `.qfai/decisions/CR-20260820-0012-*.md:58-71`;
  `.qfai/specs/spec-0017/04_Business-Rules.md:102`; `05_Examples.md:84`;
  `.github/workflows/ci.yml:468-469`
- **Contract**: `drift-protocol.md#core-rule` (upstream SSOT; an option may not reinterpret an
  obligation into satisfiability)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard /
  `defect:correctness`

This answers the round's question 4, and the answer is **reinterpretation, not reading** — though
the CR routes it correctly.

Option 1 argues: "Read as the business rule intends — `BR-0017-0053` guards against a tuning change
landing on an unstable pipeline — what needs to be green is **the layered lane set the tuning
affects**: the seven test legs plus `detect` and the verdict's own derivation."

`BR-0017-0053` (`04_Business-Rules.md:102`) states its own rationale, and it is not that: "OC-80.
**Batching two projects into one pull request makes an emergent race unattributable.**" That warrants
the *one-change-per-PR* clause, not the three-greens clause. The imputed purpose is then used to
narrow the obligation.

And "aggregate-verdict" has a referent in this repository. `ci.yml:468-469` is headed "**6. Aggregate
gate (for branch protection)**" and the job is `ci-pass`, "the verdict reads `needs` from the
workflow context". Option 1's set — "the seven test legs plus `detect` and the verdict's own
derivation" — is `ci-pass`'s inputs **minus `build`**, and `build` is the single job that is failing
and the one that runs the self-validate. Excluding the failing input is what makes the obligation
satisfiable.

To the CR's credit it does **not** self-approve: it names the cost ("an upstream edit to
`05_Examples.md`, which is Drift Protocol territory and needs the `#when-drift-is-detected` path
rather than an inline edit") and its `Approved option` is `-`. That is the right posture. What needs
correcting before the user chooses is the warrant: state that `BR-0017-0053`'s recorded rationale is
about attributability, that "aggregate-verdict" names `ci-pass` in this repository, and that the
proposed set excludes `build` by construction.

### M3 — the matrix test pins membership but not class assignment, and its stated-size check is a substring match. Both broken.

- **Artifacts**: `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:171-181`;
  `.qfai/evidence/coverage-depth-spec-0017.md:139`, `:161-165`;
  `.qfai/evidence/atdd-spec-0017.md:146-148`, `:359-361`, `:492`
- **Contract**: `references/test-case-depth-checklist.md:114-119` (a justification must name the
  cell); `qfai-atdd/SKILL.md` Mandatory Outputs 2
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY)

Round 2's `M1` asked for either a membership check or a narrowed claim. The membership check was
written and it is genuine — I confirmed set equality both ways, disjointness and the no-non-failing
guard (verified item 2). Two rounds, each planted alone into
`.qfai/evidence/coverage-depth-spec-0017.md` and reverted in the same step with a sha256 comparison
(baseline and final both `a7415bbb...4a5c70`, `git status` empty after each):

```text
X1  class labels PERMUTED preserving sizes:
      line 134  B -> C  (US-0017-0002 / State transitions)
      line 137  C -> B  (US-0017-0001 / Boundary values)
    table untouched, membership set identical, sizes still A 30 / B 7 / C 1
                                                     *** 4 passed - REDDENS NOTHING ***

X2  line 139 stated size  "A 30, B 7, C 1"  ->  "A 30, B 70, C 1"
                                                     *** 4 passed - REDDENS NOTHING ***
```

`X1` matters because the reason class **is** the per-cell justification. After it, class C reads
`US-0017-0002` x `State transitions` while the class-C paragraph (`:161-165`) says
`US-0017-0001` x `Boundary values` and "the one failing cell in the table that no future work would
turn green" — a flat self-contradiction the test cannot see. `X2` is narrower and sharper: `:176-181`
uses `toContain` on the concatenation of class name and size, so `"B 7"` is a substring of `"B 70"`
and the sentence `:139` calls "Sizes, **derived from the table above**" is not derived. That is
precisely the "stated total nothing recomputes" defect the test's own header (`:1-13`) exists to
prevent.

**The record is correct today** — I verified the assignment matches every class paragraph — so this
is not blocking. What is overstated is `atdd:146-148`, "the whole thing pinned by
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — four tests, **all seven falsification
rounds reddening**", and `:359-361`, "derived from the table ... so the two cannot part again". Also
uncorrected: the `M1`-`M7` table at `:492` still reads "`M4` a reason class is resized, breaking the
partition — REDDENS", which round 2 showed is true only when the breakage is arithmetic, and **no
falsification round is recorded anywhere for the new membership check** — against this record's own
stated countermeasure at `:540-542` ("every new claim gets an oracle round before it is reported").

Cheap closure: a word-bounded regex for the sizes, and each class's member set asserted against a
literal (three lines). Then record the rounds.

### M4 — "Three blocking reviewers" contradicts the record's own Work Orders table and the manifest

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:586`, `:591-595`; against `:385` and
  `.qfai/assistant/manifest/agent-routing.yml:200-206`
- **Contract**: `agent-routing.yml` `qfai-atdd` / `review` phase
- **Severity: advisory** | **Traces to:** `agent-routing.yml` `qfai-atdd` phases

`:586` opens "**Three blocking reviewers** on `56daee8d`". For `qfai-atdd`'s `review` phase the
manifest reads `mandatory_agents: [completion-reviewer, qa-gatekeeper]`,
`conditional_agents: [implementation-reviewer]`,
`blocking_agents: [qa-gatekeeper, completion-reviewer]` — `implementation-reviewer` is **conditional
and not blocking** here, unlike in `qfai-implement` where it is (`:135`). The record's own table at
`:385` states this correctly ("conditional `implementation-reviewer`", blocking "both"), so the
record contradicts itself 200 lines apart. Round 2's `m2` was the same class — a routing label the
table beneath it already had right. Routing a third reviewer was the right call and every finding was
applied; the label is what is wrong.

### M5 — § `TDD-0069` is the entry step 3b reads, and it still carries the two reasons the revised DR retracted

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:313-320`; against
  `.qfai/decisions/DR-0017-0010-*.md:86-89`, `:123-134`
- **Contract**: `qfai-implement/SKILL.md:116` (step 3b verifies the row's entry in
  `.qfai/evidence/atdd-<spec-id>.md`); `red-provenance.md#evidence-shape`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d / `defect:correctness`

P1d's `B1` / `N1` / `B3` were applied to the **DR** and not propagated to the **evidence entry**,
which is the artifact step 3b actually reads. Two retracted claims still stand:

- `:316` — "it could not be made green on this branch at all, **because the workflow changes are
  unmerged**". `DR-0017-0010:86-89`: "'the workflow changes that produce an aggregate verdict are
  unmerged' **was false** as `TDD-0069`'s reason. `ci-pass` exists at `.github/workflows/ci.yml:469`
  and has run twelve times on this branch".
- `:319-320` — "Branch 2 ... Nothing satisfies this one — **there is no run history to mutate**".
  `DR-0017-0010:123-134`: "this record's first version **overstated** the case ... `EX-0017-0053`'s
  first clause ... _is_ satisfied by state that predates the row, and it is falsifiable ... so the
  row still lands on branch 3, but it lands there **because the obligation is a conjunction with one
  unreachable half**, not because 'there is nothing to falsify'."

R04's `N3` listed three stale statements in this file; `:326` and `:543` were fixed and these two —
the ones P1d's blocking findings were about — were not. Copy the DR's corrected paragraphs across,
and add the self-referential-gate obstacle, which appears in the DR and the CR but not in the entry.

---

## MINOR

### m1 — `## Final status`'s "who confirmed" has not moved in two rounds

`.qfai/evidence/atdd-spec-0017.md:579-582` reads "Confirmed by: **round 1's** two independent
blocking reviewers, both **REVISE**, on `8fb48002`", naming only `R02` / `R03` of
`review-20260820200000000`. Round 2's four reports and P1d's REVISE are recorded only in the
non-template section that follows (B6). The section's title is "Final status (PASS/FAIL) + **who
confirmed**", and `SKILL.md:298` requires a completion check that `## Final status` "says what that
pack says" — with only round 1's pack recorded, that check is satisfied against a two-round-old
state.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md:298` Success Criteria.

### m2 — the round-2 table understates `R01` by four findings

`:593` records `implementation-reviewer` at "4 blocking, 6 medium, **5 low**". `R01` carries 4
blocking, 6 medium headings (`M1`-`M6`), and **nine** low/nit items (`m1`-`m9`) under
`## Low / nit findings` — 19 findings, not 15. `R03`'s "3 blocking, 6 advisory" and my predecessor's
"4 blocking, 4 major, 5 minor" are both exact, so this is the one row that was not counted. This
round's request inherited the 15. It matters only because the table is the record's sole accounting
of what round 2 owed.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m3 — committing the request before the reviewers launch puts two `error`s into the required context

`1473897a` created `.qfai/review/review-20260821000000000/` holding only `review_request.md`, which
raises `QFAI-REVIEW-004` **and** `QFAI-REVIEW-005` at `error` under the `full` profile the `build` job
runs. The practice itself is right — it is what fixed round 1's moving-tree problem — but it means
every round now opens with two `error`-severity findings at HEAD until the pack is completed. Worth
one line of disclosure in the record, or a carve-out proposal. This one is a **sequencing note** on
my own round, not a gap.
**Severity: advisory** | **Traces to:** `defect:code-quality`.

### m4 — "class B covers only the four rows whose surface exists" reads against a partition the test can permute

`coverage-depth-spec-0017.md:157-159` distinguishes class A from class B by which rows have a
surface. That distinction is prose only: per M3's `X1`, class membership can be permuted with the
test green, so the sentence that makes classes A and B mean different things is unpinned while the
cell set is pinned. Same fix as M3; noted separately because this is the sentence that would go
false.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Mandatory Outputs 2.

---

## Rulings on the questions put to me

### Question 3 — is `CR-20260820-0012` a real unresolved Change Request, or a CR opened on itself to move a row out of a gate's reach?

**It is a real Change Request, and `blocked` is a legitimate ground — but the transition has not been
made, the record misdescribes it as made (B1, B2), and the reduction in scrutiny it causes is
undisclosed.**

Four independent reasons the CR is real, none of which rests on the stage's own say-so:

1. **The stage did not originate the filing.** R04's "Required to clear this gate", item 2: "If the
   honest answer is that the arrangement is defective, **file the Change Request** —
   `CR-20260820-0007` is the precedent for exactly this filing, and the DR is not a substitute for
   it." An independent gatekeeper named the artifact and the precedent.
2. **Its content is a defect I verified independently of the routing.** `ci.yml:375-388` runs
   `validate --profile tdd --fail-on error --root .` in `build`; that profile at `1473897a` returns
   `info=5 warning=376 error=2` on exactly `QFAI-ATDD-111` and `QFAI-ATDD-112` (R04 measured
   `error=2 warning=372 info=5` live at `16f611c7` — the same two rules); `QFAI-ATDD-112` names
   `SPEC-0017:TC-0017-0069` and `TC-0017-0070` **by id**; `ci-pass` (`ci.yml:468-469`) derives its
   verdict from `needs`, so it fails when `build` does. The cycle closes. It also generalises, as the
   CR says: any `TC` whose acceptance evidence is a property of this repository's CI runs inherits
   it.
3. **`blocked` is strictly more conservative on completion than `exception`.**
   `execution-ledger.md#blocked-rows`: `blocked` is "**completion-prohibiting**, exactly like
   `todo`", while `exception` "satisfies spec completion" in its accepted-risk form. The
   re-classification buys nothing toward closing the spec; the stage's status stays `FAIL` and the
   spec stays open either way. A CR opened to escape a gate would move the row toward closure, and
   this moves it away.
4. **The row genuinely "cannot be started"** in the clause's sense: nothing but approval of one of
   the CR's four options makes it startable, and `Status: open` / `Approved by: -` /
   `Approved option: -`.

R04's item 8 ruled `exception` right and `blocked` wrong, but on the **old** account ("waiting on CI
run history is none of the three"). Once the account changed to a defect filed as a CR, the middle
ground applies on its own terms. `DR-0017-0010:167-174` reasons this way explicitly and honestly,
including that it "is now arguable".

**The two qualifications, which the record owes a reader:**

- **It does remove a gate.** `qfai-implement/SKILL.md:116` lets `todo -> exception` be written
  "**only when the entry carries the `qa-gatekeeper` PASS P1d took on that `DR-*`**".
  `todo -> blocked` requires only a `Blocked-By` reference. So P1d's REVISE — which found
  `TDD-0069`'s account wrong on three counts — no longer gates `TDD-0069`; only its sibling stays
  under it. That is defensible on the grounds above, but it happened *as a consequence of applying
  that REVISE*, and a later reader sees one row that skipped a reviewer gate its twin had to pass.
  Say so.
- **Nothing has moved yet.** The ledger has `TDD-0069` at `todo` / `Blocked-By: -`. A `blocked` row
  without `Blocked-By` is not `blocked`; per `qfai-implement/SKILL.md:108` Phase Red still **selects**
  this row, reads the atdd entry, finds a disposition that is none of its three branches, and stops
  with a handoff note under the malformed catch-all. So the row is out of no gate's reach today — it
  is in the same place round 2 left it, for a different stated reason.

### Question 5 — is `## Final status` consistent with the four round-2 reports, and is the seal two moments?

**No, and partly.**

*Consistency:* `## Final status` is a **round-1 artifact carried through two rounds**. It names round
1's two reviewers and round 1's revision (m1); it asserts two ledger statuses neither the ledger nor
P1d supports (B2); and it omits P1d's REVISE, which is the finding that changed `TDD-0069`'s
disposition. The round-2 verdict table is accurate on `R02` and `R03` and understates `R01` by four
(m2). Against `SKILL.md:298`'s check — that `## Final status` "says what that pack says" — it passes
only because the pack recorded is round 1's.

*Two moments:* for **round 1's** pack, yes, and this is the record's best-verified claim. Both
aggregates are recorded (`:628`, `:643`), the serialization is stated (`:651-656`), and I reproduced
all four `git hash-object` values, the four-file seal `5c8cd425...`, the three-file superseded seal
`d8ac0a77...` over the reports **as they stand today** — which proves them untouched between the
seals — and the two-space `fa8d6e83...` the record cites as the misleading form. Round 2's `m3` is
closed and the printed block is byte-identical to what I hashed. The *recomputation* moment is
properly deferred to completion, which has not been declared.

For **round 2's** pack there is no first moment at all: no `summary.json`, no seal, no pointer (B5).
And the fields are in a section that is inside the audit subject, so recording round 2's seal will
stale this round's verdicts (B6). The two findings are one repair.

### Question 1, third part — `US-0017-0003` against `E6`-`E11`

Unanswerable as posed: `E11` does not exist (B7). Of the five rounds that do, `E6`-`E8` are the
stage's and `E9`-`E10` are round 2's `qa-gatekeeper`'s, recorded in `R03` and nowhere in the stage
evidence. I did not duplicate resolver mutation work — deep oracle re-execution on the shipped
workflow is `qa-gatekeeper`'s domain and no finding above rests on it. I do sustain, from reading
`spec0017LayeredCiScaffoldE2E.test.ts`, that the assertion executes the step under `bash` and reads a
published output, so it is non-vacuous by construction for the values it pins — round 2's item 7,
unchanged.

---

## Required fixes (blocking only)

1. **B1** — make the `## Ledger rows advanced` index say what the DR decided: `TDD-0069` to
   `blocked` / `Blocked-By: CR-20260820-0012` / no `DR-ID`; `TDD-0070` stays `3 — exception` /
   `DR-0017-0010`. Correct `:254`, restate `:296-298` as the DR's recommendation rather than a
   completed re-classification, and rewrite `:322-332` for the `blocked` disposition.
2. **B2** — `:573-576`: state that both rows are at `todo` in the ledger, that `TDD-0070` is
   *proposed* for `exception` with a P1d re-route owed on the revised DR, and that `TDD-0069` is
   *proposed* for `blocked`.
3. **B3** — `:33`: nine becomes **six** rejected alternatives, across three of the nine `DR-*`.
4. **B4** — re-run all four P7 members at the revision under review and restate them (`1174`, not
   `1171`); fix `10 tests` to `19` at `:108`, `:185`, `:205-206`; name the revision each P7 figure
   was measured at.
5. **B5** — write `review-20260820220000000/summary.json` to `review-artifact-layout.md:21-31`, seal
   that pack, record its path, seal and **file list** alongside round 1's, and re-check the
   `full`-profile `error` count.
6. **B6** — move `Review pack:` / `Review pack seal:` and the serialization paragraph into
   `## Final status`; relocate the round-2 narrative before it so the record ends where
   `SKILL.md:345-365` says; state which reading of the audit subject is in force.
7. **B7** — record `E9` / `E10` with targets and results and attribute them to `R03`, restating the
   range as `E6`-`E10`; or run and record an `E11`.

## Advisory / Change Request proposals

- **Pin the class assignment and derive the stated sizes** (M3): a word-bounded match for the sizes,
  and each class's member set against a literal. Belongs to this spec's own test.
- **Correct Option 1's warrant before the user chooses** (M2): `BR-0017-0053`'s recorded rationale is
  attributability, "aggregate-verdict" names `ci-pass` in this repository, and the proposed set
  excludes `build`. Belongs in `CR-20260820-0012`.
- **A pack in flight raises two errors** (m3). The "commit the request before the reviewers launch"
  practice is right and its interaction with `QFAI-REVIEW-004` / `-005` is not designed for. A `CR-*`
  against whichever skill owns `review-artifact-layout.md` would be the place — this is a product
  obligation upstream never asked for, so per `drift-protocol.md#reviewer-originated-obligations` it
  **must not gate this rework**.
- **Reconcile the guard's annotation grammar with the scanner's** — round 2's `m4`, still open, still
  belonging with `CR-20260820-0011`.

## Open risks / residuals

- **`build` will still be red after the ATDD errors clear.** Three `QFAI-REVIEW-*` errors sit behind
  them in the `full` profile, currently masked by the `tdd` step failing first. Two are this stage's
  packs. This is B5 and M1, and it is the residual most likely to be missed.
- **`TDD-0069` / `TDD-0070` are both still `todo`** with `DR-ID: -` and `Blocked-By: -`. No transition
  has been written and neither is closeable by this stage.
- **A P1d re-route is owed** on the revised `DR-0017-0010` for `TDD-0070`, and the record says so
  (`:298`) while `## Final status` contradicts it (B2).
- **The class-assignment half of the failing-cell partition can rot silently** (M3). Correct today;
  unpinned.
- **The authorship-separation breach stands** and is unrepairable retroactively. Three rounds of
  independent reviewers repair the gate, not the history.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing
  a markdown list; the guard closes that direction for `spec-0017` only and is not in `ci:lint`.
- **Concurrency.** I ran alongside whichever other reviewers this round routes. Own shadow root
  (`tmp/r03-completion/shadow`) and own scratch directory; the tracked `.qfai/report/validate.log`
  was never written by me and any run-log pointer in the working tree may reflect another run.

## Evidence checked

- `.qfai/review/review-20260821000000000/review_request.md`;
  `.qfai/review/review-20260820220000000/` all five files (R01-R04, request)
- `.qfai/evidence/atdd-spec-0017.md` (whole); `.qfai/evidence/coverage-depth-spec-0017.md` (whole)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically, 82 rows of 9 cells);
  `04_Business-Rules.md:102`; `05_Examples.md:84`; `07_Decisions.md` (all nine DRs, all six rejected
  alternatives); `09_delta.md § Rejected` (three candidates)
- `.qfai/decisions/DR-0017-0010-*.md`; `CR-20260820-0011-*.md`; `CR-20260820-0012-*.md`
- `.qfai/assistant/skills/qfai-atdd/SKILL.md:298`, `:345-365`;
  `references/red-provenance.md:242-262`, `:370-415`
- `.qfai/assistant/skills/qfai-implement/SKILL.md:105-125`;
  `references/execution-ledger.md:176-206`, `:310-375`; `references/review-artifact-layout.md:1-40`
- `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:395-441`
- `.qfai/assistant/manifest/agent-routing.yml:139-206`
- `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (whole);
  `tests/integration/scripts/checkAtddAnnotationLedger.test.ts` (whole);
  `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`; `.github/workflows/ci.yml:355-470`;
  `package.json:19-25`
- **Commands run.** `git rev-parse --short HEAD` / `git status --porcelain` (start, after every
  mutation, and finish); `git ls-files -s` (83 tracked symlinks); `git archive HEAD` shadow root with
  native symlink re-materialisation (83 of 83); `validate --root <shadow> --profile atdd --fail-on
  error --spec 0017` (`error=2`), the same repo-wide (12 `QFAI-ATDD-111` items tallied per spec), and
  `--profile tdd` (`error=2`) / `--profile sdd` (`error=0`) / `--profile full` (`error=5`);
  `pnpm ci:lint` (exit 0, eleven members); `pnpm -C packages/qfai test:e2e` (1418 / 16);
  `vitest run --project integration --project assets --project unit` (1174 / 19);
  `vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (9);
  `vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts` (19);
  `vitest run tests/assets/coverageDepthMatrix.test.ts` (4);
  `node scripts/check-atdd-annotation-ledger.mjs [--spec 0017]`; `git hash-object` over three packs
  with three seal serializations; `git log -S` for the P7 block, `1171`, and `E11`; two matrix oracle
  rounds `X1` / `X2` with byte-verified reverts; independent mechanical re-counts of the ledger
  cross-tab, the matrix tally and partition, the 208 / 127 / 81 figures and their per-spec table, and
  both audit-subject readings.
- **Not re-run:** resolver mutations `E6`-`E10` (`qa-gatekeeper`'s domain, not duplicated); the v3
  build predicate corpus (`implementation-reviewer`'s). No finding above rests on either.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`
- [x] Required gates and residual risks are recorded
- [x] No mutation persisted: HEAD `1473897a` unchanged, `git status --porcelain` empty at start and
      finish, and `.qfai/evidence/coverage-depth-spec-0017.md` sha256
      `a7415bbbae2cfafa0c45944a9ce7ded00a196170b3ca33b55afef2dfaa4a5c70` before and after both oracle
      rounds
