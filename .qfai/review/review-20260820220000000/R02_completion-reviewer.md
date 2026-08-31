# R02 — completion-reviewer, round 2

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 2
- **Reviewed revision: `56daee8d`.** `git status --porcelain` was **empty** at start and empty at
  finish; HEAD did not move (`56daee8d` at both ends).
- **Audited evidence hash (stage review): `sha256:8f55d306a4ee1554887a1b1114225a22ab89dfabf8cbb15960f86856f8b8db42`**
  — four steps of `constitution/shared-skill-delegation-baseline.md#reviewer-response-template`,
  **Stage review** subject: `.qfai/evidence/atdd-spec-0017.md` whole minus `## Final status`
  (cut at line 480; `c4fdfb13e11b5646c93fe303fa36176040c551998e42d476ffb1260f729f0301`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`cc000b54d0e8fb20cdcb7d103137979e2887c823ab2bea83fa8e6a3f3c0093ea`), normalized, serialized as
  `path + NUL + sha256` sorted by path, hashed.
- Authored/edited under review: **none.**
- Mutations: **five oracle mutations to `.qfai/evidence/coverage-depth-spec-0017.md`, each planted
  alone and reverted in the same step with a sha256 comparison** (see M1). Baseline
  `cc000b54…0093ea`, final `cc000b54…0093ea`, and `sha256sum -c` over all four files I could have
  touched returned `OK` on every one. Scratch under `tmp/r02-round2/` only. `validate` ran against a
  `git archive HEAD` shadow root with all **83** tracked symlinks re-materialised from the index, so
  no `QFAI-LINK-001` fired and the tracked `.qfai/report/validate.log` was never written. No
  `git checkout` / `stash` / `reset`, no commit, no push.

## Verdict summary

**Four blocking, four major, five minor.** Round 1's thirteen findings were, with one exception,
applied properly, and I could not break most of the repairs. The exception is the one that matters
most, and it sits in the same section and is the same defect class as round 1's B1.

**Read B1 first.** The stage declined to author the branch-3 `DR-*` on the ground that
`07_Decisions.md` is a P5 input it may not patch. **That is not where a branch-3 `DR-*` goes.**
`qfai-implement/references/execution-ledger.md:355-358` has a heading titled "Where the Decision
Record is written" whose answer is `.qfai/decisions/DR-<id>-<slug>.md`, and whose next sentence is
"Do **not** write `07_Decisions.md` or `09_delta.md`." The Drift Protocol's minimal whitelist
(`drift-protocol.md:62-65`) permits **creating** exactly that artifact. So the DR was authorable,
P1d was runnable, and `TDD-0069` / `TDD-0070` are still deadlocked — while the evidence asserts they
are not.

## What I verified and could not break

Before the findings, because most of this round's work was confirmation:

1. **The 127 number is exact, and the guard does not over-report.** Reproduced by the guard
   (`node scripts/check-atdd-annotation-ledger.mjs` -> 127 unbacked, exit 1) and again
   independently, parsing every tracked file: 208 unique ledger claims; 127 unbacked in the guard's
   two directories; **126** across every `tests/**` directory, exactly as claimed; `spec-0012` alone
   at 28, exactly as claimed; `spec-0017` at zero. I then attacked the over-report hypothesis
   directly: the scanner's regex (`atddTraceability.ts:27`) accepts a **short** form
   `US-\d{4}(?:-\d{4})?` that the guard's does not, and the scanner accepts `.md` / `.feature`
   carriers (`atddTraceability.ts:1145`) that the guard's suffix list skips. Neither inflates the
   count: every ledger claim is long-form, every short-form occurrence in the tree is a fixture
   string under `tests/core/**`, and no `.feature` or `.md` carrier exists under either e2e
   directory. `CR-20260820-0011` is **not** overstated. (Latent divergence recorded as m4.)
2. **The `❌` per-cell contract is discharged.** Parsed the table mechanically: **38** depth `❌`
   cells and **5** `Status` `❌`, both exactly as declared. Then checked the partition as a set, not
   as a sum: classes A/B/C at 30/7/1 are **disjoint**, **complete**, and **no class member is a cell
   the table does not score `❌`**. Every one of the 38 has exactly one reason class and each class
   has a justification paragraph. Round 1's B3 is closed.
3. **`Totals by Status: ✅ 3 / ⚠️ 1 / ❌ 5`** (`coverage-depth-spec-0017.md:57`) matches the table's
   own `Status` column exactly.
4. **Every ledger number is exact.** 82 rows, 71 `Integration` / 11 `Unit`, 74 `refactor` / 6
   `blocked` / 2 `todo` overall, and `Integration` x {63 `refactor`, 6 `blocked`, 2 `todo`}.
   `TDD-0069` / `TDD-0070` are the two `todo` rows, both `Integration`, both `Blocked-By: -`, both
   `DR-ID: -`, and both `Test file` / `Selector` values match the evidence entries verbatim. Round
   1's B1 false universal is gone and `## Test volume estimate` now reads 63, not 71.
5. **The scoped gate is `error=2` and its content is what is claimed.** Shadow run:
   `info=2 warning=0 error=2`, `QFAI-ATDD-111` on exactly `US-0017-0007`, `QFAI-ATDD-112` on exactly
   `TC-0017-0016/0030/0032/0033/0034/0035/0069/0070`. No `QFAI-LINK-001`.
6. **The suites.** `spec0017LayeredCiScaffoldE2E.test.ts` -> 9 passed;
   `checkAtddAnnotationLedger.test.ts` -> 10 passed; `coverageDepthMatrix.test.ts` -> 4 passed. All
   three counts as claimed.
7. **The `US-0017-0003` behavioural assertion is not vacuous, and cannot be.** `runStep`
   (`spec0017LayeredCiScaffoldE2E.test.ts:97-132`) genuinely calls `spawnSync("bash", …)` with a
   stubbed `GITHUB_OUTPUT` and parses `key=value` back out. The test asserts
   `pinned.outputs["version"] === "23.4.1"` (`:291-297`) from a real execution against a real
   `.nvmrc`. A stub or a no-op harness makes that value `undefined` and the test **fails**; it passes
   only because the shipped step actually resolved the file. I did not need a mutation round to
   establish that — the assertion is non-vacuous by construction for the value it pins. This is the
   repair I most expected to break and could not.
8. **`E4b`'s "10 of 10" is exact.** Ran all ten forms against the two predicates as written
   (`spec0017LayeredCiScaffoldE2E.test.ts:346-347`): 10 of 10 match. Both controls hold — a comment
   naming `build` and the shipped `echo` placeholder each match nothing, because the scan strips
   `^\s*#` lines first.
9. **The Delta Rejected Guard confirmation is accurate and the guard passes.** `09_delta.md § Rejected`
   carries **three** candidates, as stated (`09_delta.md:145-170`). None is reintroduced:
   `06_Test-Cases.md` was not written, no SPLIT was proposed, and the `US-0017-0004` describe asserts
   no-lane-rebuilds rather than a baseline comparison. **The new script is the accepted shape, and I
   checked this against the actual DR rather than the evidence's summary of it**: `DR-0017-0004`
   (`07_Decisions.md:123-147`) rejects "a second, separate checker" over the same YAML and "a
   validator rule under `src/core/validators/**`"; `check-atdd-annotation-ledger.mjs` parses neither
   workflow YAML nor any spec artifact and sits in `scripts/`, so it collides with neither rejection.
   `07_Decisions.md` carries nine DRs (`DR-0017-0001` … `-0009`) and their rejected alternatives are
   as characterised.
10. **The Work Orders deviation table now matches the manifest exactly.** Checked all five phases of
    `agent-routing.yml:139-206` field by field: `coverage`, `red`, `implementation`, `evidence`,
    `review` — mandatory, conditional and blocking sets all correct, including `devops-ci-engineer`
    demoted back to conditional and `qa-strategist` / `delivery-planner` restored. Round 1's m3 is
    closed. (One labelling imprecision remains: m2.)
11. **Both review-pack seals reproduce.** See Question 5 — the strongest verification in the round.
12. **`pnpm ci:lint` exits 0** at `56daee8d`, eleven members, covering the new `.mjs` script and both
    new test files. (Not cited by the evidence: M4.)
13. **Withdrawing `US-0017-0007` was right.** See Question 3.
14. Round 1's B2, B5, M1, M4, m1, m2, m4 and R03's findings 1-5 are all applied as claimed; I
    spot-checked each and found no reintroduction.

---

## BLOCKING

### B1 — the branch-3 `DR-*` was authorable; the authorship gap the entries rest on does not exist

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:285-289`, `:476-478`
- **Contract**: `qfai-implement/references/execution-ledger.md:355-358` § "Where the Decision Record
  is written"; `constitution/drift-protocol.md:62-65` (allowed exceptions, minimal whitelist);
  `qfai-atdd/SKILL.md:392-400` (P1d); `red-provenance.md:254` (`exception` evidence shape);
  `red-provenance.md:411` (`exception` handed over "once the `DR-*` is written")
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d + `red-provenance.md#evidence-shape` / `defect:correctness`

The evidence says:

> **Branch 3 it is**, and branch 3 needs a `DR-*` this stage cannot author: `07_Decisions.md` is a
> P5 **input** here, exactly as it is for `/qfai-implement`, which is the authorship gap
> `CR-20260820-0007` is open on for nine other rows of this spec.

Both halves are false.

**A branch-3 `DR-*` does not live in `07_Decisions.md`.**
`qfai-implement/references/execution-ledger.md:355-358` carries a heading whose only job is to answer
this question:

```text
### Where the Decision Record is written

Write it to `.qfai/decisions/DR-<id>-<slug>.md`, beside the Change
Requests, using the same `DR-*` ID scheme those files declare. Do **not** write
`07_Decisions.md` or `09_delta.md`.
...
`.qfai/decisions/` is the one home that satisfies both: the
protocol whitelists **creating** a record there
...
Parking the row does not require that to have happened.
```

`drift-protocol.md:62-65` confirms it from the other side — the minimal whitelist permits
"**creating** a governance record under `.qfai/decisions/` — a Change Request … or an anomaly
Decision Record (`DR-<id>-<slug>.md`, where `<id>` follows the Decision Record ID scheme in the
spec's `07_Decisions.md`)". The ID scheme comes from `07_Decisions.md`; the **file** does not. Next
free id is `DR-0017-0010`.

**The stage already exercised this exact authority in this very round.** It wrote
`.qfai/decisions/CR-20260820-0011-the-e2e-annotation-ledger-certifies-127-stories-no-test-carries.md`
— same directory, same whitelist bullet, one artifact class over.

**`CR-20260820-0007` is a different gap.** I read it. Its title is "Five implement rows assert over
the **content** of decision records the implement skill is forbidden to write", and its
`Blocked set:` is `spec-0017 TDD-0032, TDD-0033, TDD-0034, TDD-0035, TDD-0052, TDD-0066, TDD-0067,
TDD-0074, TDD-0075` — nine rows, and **`TDD-0069` and `TDD-0070` are not among them**. That CR is
about rows whose *acceptance criteria* require upstream `DR-0017-*` prose to exist. A branch-3
provenance DR is not that: it records why an obligation is unobservable, and its sanctioned home is
outside the spec directory entirely. Citing it here imports a real prohibition into a place it does
not reach.

**Consequence.** P1d was runnable and was not run. Round 1's B1 asked for four things; items (1) a
`DR-*` per row and (2) a routed `qa-gatekeeper` PASS on it are **not delivered and were not
blocked**. Item (3) is half delivered — row identity and obligation reference are recorded, which is
correct and useful — and item (4) (parked, spec stays open, no waiver claimed) is delivered
correctly.

**Required fix.** Write `.qfai/decisions/DR-0017-0010-<slug>.md` (one record may cover both rows, or
one each) naming, per row, why branch 1 and branch 2 are both unavailable — the reasoning already at
`atdd-spec-0017.md:276-284` and `:302-306` is sound and transfers verbatim. Route `qa-gatekeeper` on
it per P1d and record the PASS in each entry **before** the gate runs, per `red-provenance.md:254`.
Add the `DR-ID` to both `## Ledger rows advanced` rows. Then delete the `07_Decisions.md` premise and
the `CR-20260820-0007` cross-reference at `:285-289` and `:476-478`. Do **not** write
`07_Decisions.md`; that prohibition is real and the stage is right about it — it is simply about a
different file than the one branch 3 needs.

### B2 — `## Ledger rows advanced` states that the deadlock is broken; step 3b says it is not

- **Artifact**: `.qfai/evidence/atdd-spec-0017.md:291-293`
- **Contract**: `qfai-implement/SKILL.md:116` (Phase Red step 3b); `red-provenance.md:254`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Read Set Contract + Stage Gate P1d / `defect:correctness`

The evidence says:

> `/qfai-implement` Phase Red step 3b now has an entry to read rather than an absent one, so the two
> rows are no longer deadlocked: the entry says "branch 3, DR pending, do not enter Phase Green",
> which parks the row instead of stopping the phase.

Step 3b, quoted from `qfai-implement/SKILL.md:116`:

```text
`exception` writes `todo -> exception` with the recorded `DR-*` **and only when the entry
carries the `qa-gatekeeper` PASS P1d took on that `DR-*`** ... an entry without it goes back
with a handoff note.
```

and, for anything else malformed:

```text
an entry that is absent, names no branch, or is malformed in any other way leaves the row at
`todo` and stops with a handoff note.
```

So the entry is **not** the absent entry — it names a branch, which is a genuine improvement on round
1 and I credit it — but it produces the **identical outcome**: the row stays at `todo` and step 3b
stops with a handoff note, because the entry carries neither the recorded `DR-*` nor the P1d PASS.
There is no "park" disposition in step 3b; that word is the stage's, not the contract's. And
`red-provenance.md:254` closes the loop: the `exception` audit subject **is** row identity plus "the
`DR-ID` and the DR artifact", so "a row without them has nothing reproducible for `qa-gatekeeper` to
hash" — P1d could not be routed on the entry as it stands even in principle. `red-provenance.md:411`
hands an `exception` row over "once the `DR-*` **is written**".

This is the second consecutive round in which `## Ledger rows advanced` — the section whose whole job
is discharging this obligation — carries a false statement about that obligation. Round 1's was "All
71 `Integration` rows are already at `refactor`". This one is "the two rows are no longer
deadlocked". Closes with B1.

### B3 — `spec-0015 (2)` is false, and the file's own addends contradict its stated total

- **Artifact**: `.qfai/evidence/atdd-spec-0017.md:458-461`
- **Contract**: `qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS (cross-spec obligations recorded, not
  waived); Evidence (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS / `defect:correctness`

The evidence says `spec-0003` (8 US), `spec-0006` (1), `spec-0008` (1) and `spec-0015` (**2**) "keep
`QFAI-ATDD-111` at 11 items repo-wide, plus `US-0017-0007` makes 12."

Measured, repo-wide `--profile atdd` against the shadow root, tallying the finding's own `refs=` list
by spec:

```text
8  SPEC-0003     1  SPEC-0006     1  SPEC-0008     1  SPEC-0015     1  SPEC-0017
```

`spec-0015` contributes **1** (`US-0015-0016`), not 2. The aggregate figures are both right — 11 for
the siblings, 12 with `US-0017-0007` — which is why the error survived: it is the breakdown that is
wrong, and it is wrong in a way **detectable by addition alone**, since `8 + 1 + 1 + 2 = 12 != 11`.
The number was inherited verbatim from round 1's `R03_qa-gatekeeper.md:361` and copied without being
re-derived; a reviewer's arithmetic is not evidence.

This sits in the § Gaps / Open risks item that discharges the cross-spec obligation, so it misstates
which sibling spec owes what. One-token fix.

### B4 — "pinned by a test so it cannot drift silently in either direction" is false

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:463-465`;
  `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts:145-155`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — evidence verifiable by a party that did
  not author it; `references/test-case-depth-checklist.md:78-87` anti-vacuity list
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) / `defect:correctness`

This is the direct answer to the round's question 1, and the answer is that the assertion pins
nothing in the direction that matters. The test reads:

```ts
const wide = checkLedger(ledger, sources);
expect(wide.checked).toBeGreaterThanOrEqual(200);
expect(wide.unbacked.length).toBeGreaterThan(100);
```

`> 100` is a one-sided lower bound. Every one of these passes it: 101, 127, 150, 208. So the number
**can** drift silently — all the way to "every claim unbacked" — and the only movement it detects is
someone *fixing* 27 or more claims. The comment directly above it (`:148`) says "Pinned so the number
cannot drift silently in either direction", and the evidence restates that at `:465` as "this
repository's number is pinned by a test so it cannot drift silently in either direction". Both are
false, and the second is the governance claim.

The finding `CR-20260820-0011` records is real and correctly measured — I reproduced 127 twice. What
is wrong is the durability claim built on top of it, which is the same shape as round 1's finding 5 (a
gate cited for a property it does not have). **Required fix:** either assert the number
(`toBe(127)`, with the CR named as the reason it is expected to fall) or restate the claim as the
one-sided floor it actually is.

---

## MAJOR

### M1 — the matrix pinning test pins the partition's arithmetic, not its membership

- **Artifacts**: `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:113-122`;
  `.qfai/evidence/atdd-spec-0017.md:146-148`
- **Contract**: `references/test-case-depth-checklist.md:114-119` (a justification must name the
  cell); `qfai-atdd/SKILL.md` Mandatory Outputs 2
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY)

I was asked to assume this test vacuous until I broke it. I broke it — not on the totals, which are
solid, but on the enumeration the matrix itself calls "the enumeration that makes 'one per cell'
checkable rather than asserted" (`coverage-depth-spec-0017.md:9-10`).

Five rounds, each planted alone into `.qfai/evidence/coverage-depth-spec-0017.md` and reverted in the
same step with a sha256 comparison (baseline and final both `cc000b54…0093ea`):

```text
X1  class B's enumeration cut to two rows, "(7 cells)" untouched   *** REDDENS NOTHING ***
X2  class C renamed to a cell the table scores ⚠️, not ❌            *** REDDENS NOTHING ***
X3  class A's enumeration cut to `US-0017-0004 × {Normal}`,
      "(30 cells)" untouched                                       *** REDDENS NOTHING ***
X4  declared depth-cell count 38 -> 39 (sanity)                    REDDENS
X5  a sentence added to the prose (control)                        reddens nothing, correct
```

The test extracts only the **declared sizes**
(`/^\*\*Class [A-Z] — .*?\((\d+) cells?\)\.\*\*/gm`, `:114`) and checks they sum to the measured cell
count. The cross-product text that assigns cells to classes is never parsed. So `M4`'s claim — "a
reason class is resized, breaking the partition REDDENS" — is true only when the breakage is
arithmetic; a partition that is wrong while its sizes still sum is invisible.

**The contract is satisfied today** — I verified the partition is complete, disjoint and contains no
non-`❌` member (verified item 2) — so this is not blocking. What is wrong is
`atdd-spec-0017.md:146-148`, "the whole thing pinned by
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts`". The counts are pinned; the membership is
not, and the membership is the part that discharges the per-cell contract. Either parse the
enumeration into cell identities and compare the set against the table (about fifteen lines, and it
subsumes the three checks the test already has), or restate the claim as pinning the counts only.

Two smaller weaknesses in the same parser, worth knowing before relying on it: `parseMatrix`
(`:58`) maps **anything** that is not `✅` or `❌` to `⚠️`, so a blank or garbled cell silently scores
partial; and `tally[row.cells["Status"] ?? "⚠️"]` (`:72`) does the same for a missing `Status`.

### M2 — the class-B justification cross-references the wrong open risk

- **Artifact**: `.qfai/evidence/coverage-depth-spec-0017.md:133`
- **Contract**: `references/test-case-depth-checklist.md:114-119` — a justification names "the
  `DR-*` or `CR-*` that carries the decision when one exists"
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Mandatory Outputs 2 / `defect:correctness`

Class B — seven `❌` cells — closes with "the absence is recorded as **open risk 5**". Enumerating the
numbered list in `.qfai/evidence/atdd-spec-0017.md § Gaps / Open risks`: item **5** (`:463`) is "127
of 208 E2E ledger claims are backed by no test"; item **6** (`:466`) is "The E2E surface cannot
exercise a real workflow run … That is class B of the matrix's `❌` cells, all seven of them". Item 6
is the one meant, and it names class B explicitly, so the two records point at each other from one
side only. This is the sole cross-reference the class-B justification offers for seven cells.

### M3 — the `Status` column mixes two scopes, so the totals line is not a homogeneous aggregate

- **Artifacts**: `.qfai/evidence/coverage-depth-spec-0017.md:49`, `:57`, `:90-103`;
  `.qfai/evidence/atdd-spec-0017.md:11`
- **Contract**: `qfai-atdd/SKILL.md` Mandatory Outputs 2; Success Criteria
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Mandatory Outputs 2

This is my answer to question 6's second half and the one movement I would push back on. Round 1's M3
said the reframe "credits shipped-tree observables to own-tree obligations", and named `US-0017-0003`
as "the sharpest instance". The repair did both things M3's acceptable closure asked for — the
deviation is stated as a deviation, with the own-tree assertion cross-referenced per story
(`:90-103`) — and then **raised that same row's `Status` from `⚠️` to `✅`**.

The rise is on merit as an assertion (verified item 7). But `US-0017-0003`'s own Non-goals *rule out*
shipping the mechanism to adopters, and the matrix's own disclosure says so at `:79-81`. So the row
now scores `✅` on the strength of two assertions about the adopter's `qfai-validate.yml` — a surface
the story excludes — while its actual obligation ("the setup preamble to exist exactly once **in the
repository**") is asserted in `tests/scripts/workflowHygiene.test.ts` and scored nowhere in this
matrix. The matrix handles this correctly per row ("each row's cells should be read with that scope",
`:102-103`). What it does not do is carry that scope up to `Totals by Status: ✅ 3 / ⚠️ 1 / ❌ 5`, or
to `atdd-spec-0017.md:11` "**Eight of the nine are covered**". Four of the nine rows are scored
adopter-half-only and five whole-story, so the total sums two different measurements.

Cheap closure: mark the four own-tree rows' `Status` with the scope, or add the caveat at the totals
line. Do **not** re-score the row down — the assertion is real.

### M4 — no P7 evidence is cited for the round-2 additions

- **Artifact**: `.qfai/evidence/atdd-spec-0017.md:193-215` (`## Commands executed + key outputs`)
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7** (repo quality gates passed)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7

The command list records the three suites and the two validate runs and no repo quality gate. Round
1's `R03` confirmed `pnpm ci:lint` at `8fb48002`, which predates every round-2 artifact — a new
`scripts/*.mjs` (inside both `eslint` and `prettier`), two new test files, and the pack. **I ran it:
exit 0, eleven members**, including `format:check`, `lint`, `lint:md` and
`check-workflow-hygiene.mjs`. So the gate passes and this is an evidence gap rather than a defect —
cite the run.

---

## MINOR

### m1 — "the ledger's own `Notes`" names a column that does not exist

`.qfai/evidence/atdd-spec-0017.md:477-478` says the parked-not-blocked distinction "is recorded in the
ledger's own `Notes` as well as here". `tdd/test-list.md`'s columns are `TDD-ID`, `TC-Refs`, `Layer`,
`Test file`, `Selector`, `Status`, `DR-ID`, `Blocked-By`, `Evidence` — there is no `Notes`. The
`Evidence` cell records "NOT BLOCKED by a CR - waiting on data that does not exist yet", which carries
the not-blocked half but no branch determination and no "parked". And the stage did not write that
file (`:189`), so it could not have put anything there. Cite `Evidence` and drop "as well as here", or
drop the clause.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m2 — "the four P2-P4 roles" mislabels the phases they belong to

`.qfai/evidence/atdd-spec-0017.md:350`. Against `agent-routing.yml:139-206` and
`qfai-atdd/SKILL.md:384-406`: `test-design-analyst` and `qa-strategist` are the `coverage` phase,
which precedes P2; `delivery-planner` and `acceptance-test-engineer` are `red`, which is P1b-P1d; only
`acceptance-test-engineer` sits in `implementation` (P2-P4). "P1b-P4" is the accurate span. The table
above it is correct — this is the prose beneath it. Round 1's m3 was that the whole value of a
volunteered deviation is its completeness; the same applies to its labels. Also unmentioned: the
`evidence` phase's conditional `devops-ci-engineer` and `qa-gatekeeper` were not routed either
(`qa-gatekeeper` is blocking there when routed).
**Severity: advisory** | **Traces to:** `agent-routing.yml` `qfai-atdd` phases.

### m3 — the printed seal manifest is not the string that was hashed

`.qfai/evidence/atdd-spec-0017.md:525-530` prints the four `git hash-object` values with **two**
spaces before each path. The seal reproduces only with **one** space (see Question 5). Hashing the
displayed block verbatim yields `fa8d6e83…`, not the recorded `5c8cd425…`. The values are right and
the seal is right; the rendering misleads a recomputation. State the separator, or print it as hashed.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (review pack seal).

### m4 — the guard's annotation grammar is narrower than the scanner it stands in for

`scripts/check-atdd-annotation-ledger.mjs:32-34` uses `QFAI:SPEC-(\d{4}):(US-\d{4}-\d{4})` and reads
only `.ts/.tsx/.mts/.js/.mjs`. `atddTraceability.ts:27` accepts `US-\d{4}(?:-\d{4})?` with `\b`
anchors, and `:1145` accepts `.feature` / `.md` / `.markdown` as annotation carriers. **No effect on
127 today** — I verified every ledger claim is long-form, every short-form occurrence is a fixture
string outside the e2e trees, and no non-code carrier exists under either e2e directory. But the
guard's stated purpose is to stand in for a gate that reads a wider grammar, so a short-form or
`.feature`-carried annotation would read as unbacked. The guard also hard-codes `tests/e2e` (`:133`)
rather than resolving `paths.testsDir`. Advisory, and out of scope for this rework.
**Severity: advisory** | **Traces to:** `defect:code-quality`.

### m5 — "the four `Status` rows presented as successes"

`.qfai/evidence/coverage-depth-spec-0017.md:266-267`. Three rows are `✅` (`-0002`, `-0003`, `-0009`);
the fourth (`US-0017-0001`) is `⚠️`. "Four … satisfied and five are not" is arithmetically fine
(`3 + 1` against `5`), but calling a `⚠️` row a row "presented as a success" reads across the very
distinction the tri-state exists for. Also cosmetic: `## The one row still scored ⚠️…` (`:228`) opens
a one-item bullet list and then jumps to a `###` heading mid-section.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Mandatory Outputs 2.

---

## Rulings on the questions put to me

### Question 3 — was withdrawing `US-0017-0007` right? Is there an adopter-observable fact about parallelism that would discriminate?

**Yes, withdrawal was right, and no such fact exists.** I tested this against the story text rather
than the evidence's summary of it. `02_User-stories.md:137-140` gives the story two halves: explicit
per-project pool / worker / concurrency / file-parallelism / hook-timeout settings, and agreement of
names across **three** slice surfaces — "vitest project names, the CI matrix slice list, and the
per-slice scripts". I inventoried the shipped asset tree: `packages/qfai/assets/init/` ships six files
plus the `.github/` and `.qfai/` trees, and contains **no vitest config, no knob file, no
`package.json`, and no per-slice scripts**. Two of the story's three named surfaces do not reach an
adopter, and a cross-surface name-agreement assertion needs at least two of them. The knob half has no
file at all. So nothing discriminates: any assertion would hold for a project with no parallelism
configuration whatever — precisely the defect round 1's B4 found.

Round 1 offered "the layer-to-lane names in `test-layers-ci-lanes.md` match the shipped lane job ids"
as an acceptable closure. Having checked it, **that suggestion was mis-targeted** and the stage was
right not to take it: `test-layers-ci-lanes.md` is `US-0017-0009`'s artifact, not one of
`US-0017-0007`'s three surfaces, so asserting it under `US-0017-0007`'s annotation would have
recreated the mis-attribution B4 was about.

Withdrawal also beats round 1's other offered closure ("keep the annotation, record the E2E
contribution as `none`"), which is worth stating because it means the stage chose better than the
option it was given: an annotation whose recorded contribution is `none` **still clears**
`QFAI-ATDD-111`, because the gate reads the ledger and not the note. That option would have left the
false certification standing and merely documented it. Removing the describe and the ledger line is the
only move that makes the gate report the truth, and the scoped gate returning to `error=2` is the
evidence that it did.

### Question 4 (branch 3) — is a branch-3 entry whose `DR-*` is *pending* a valid entry, or the absent entry step 3b stops on?

**Neither — and the distinction does not help, because both land in the same place.**

It is **not** the absent entry: it names a branch, records row identity and records the obligation
reference, and that is a real improvement on round 1. But it is a **malformed** one, and step 3b
assigns malformed and absent the same outcome. The clause that decides it is
`qfai-implement/SKILL.md:116`: `exception` writes `todo -> exception` "**and only when the entry
carries the `qa-gatekeeper` PASS P1d took on that `DR-*`** ... an entry without it goes back with a
handoff note", plus the catch-all "an entry that is absent, names no branch, or is **malformed in any
other way** leaves the row at `todo` and stops with a handoff note". The entry has no `DR-ID` and no
PASS, so it goes back with a handoff note.

`red-provenance.md:254` explains why this cannot be finessed: the `exception` audit subject **is** row
identity plus "the `DR-ID` and the DR artifact", so "a row without them has nothing reproducible for
`qa-gatekeeper` to hash". P1d could not have been routed on this entry even in principle. And
`red-provenance.md:411` hands an `exception` row over "once the `DR-*` **is written**".

So the deadlock is **not** broken — and, per B1, it did not have to persist: the DR was authorable all
along, in `.qfai/decisions/`. The stage's instinct not to invent provenance was right, and I would
REVISE a rework that manufactured a RED or a fabricated `DR-*` here. What it should have done instead
is write the record the protocol whitelists. There is also no "parks the row instead of stopping the
phase" state anywhere in the contract: `red-provenance.md:377-384` offers exactly two dispositions
("the waiver is obtained" / "the row is parked and the spec stays open"), and the second explicitly
requires the DR in hand — "Raise it with the `DR-*` in hand". The stage invented a third state between
"hand over" and "stop".

### Question 5 — the re-seal. Would that reasoning launder an illegitimate re-seal?

**The reasoning alone would. The record does not rest on the reasoning, and that is what saves it.**

I verified both seals. Recomputing `git hash-object` over the pack in `LC_ALL=C` path order reproduces
all four recorded values exactly (`atdd-spec-0017.md:526-529`), and the serialization that reproduces
the recorded aggregate is hash + a single space + name + LF per file, sha256 over the whole:

```text
4 files -> 5c8cd42571c8baf5f2240515ee2fbd173892cecd09d53ace080900d5c74317e3   recorded (second seal)
```

Then the decisive check. I recomputed the **first** seal over the same three files as they stand in the
tree today:

```text
3 files -> d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9
recorded:  d8ac0a77...58967c9
```

It reproduces. That is the whole answer: because both aggregates are recorded and both reproduce over
file sets whose intersection is byte-stable, **the three reports are provably unchanged between the two
seals**, and the re-seal provably added `summary.json` and nothing else. The claim is verified, not
argued.

Now the general question. The reasoning "completing a pack with an artifact its layout contract
requires is the legitimate case" **would** launder an illegitimate re-seal if it stood alone, because it
is a statement about intent and every re-seal can be narrated that way — including one that edited a
report and added a required file in the same pass, where the aggregate moves for two reasons and the
sentence names one. What makes it non-launderable here is structural and has nothing to do with the
narrative: **the superseded seal is recorded, so both are recomputable and the intersection is
checkable.** Had the stage recorded only `5c8cd425...` and described the first in prose, I could have
verified nothing, and the reasoning would have been exactly the laundering the recorded-versus-
recomputed rule exists to catch.

Advisory recommendation, therefore: make that the rule — a superseded seal must be recorded with its
**file list**, not just a digest prefix, so the intersection check is mechanical rather than dependent
on a reviewer guessing the serialization. Also fix m3, which nearly cost me this verification.

### Question 6 — one score up, one down, applied by the party the findings were against. On merit, or netting out?

**Both movements are on merit, individually. They do not net out — and they are not on the same axis,
which the framing "one up, one down" obscures.**

- `US-0017-0003` `Oracle strength` and `Status`, `⚠️` to `✅`: **on merit.** The old stated reason was
  demonstrably false, the missing assertion was available, and it is now written **behaviourally** and
  is non-vacuous by construction (verified item 7). Its resulting cell profile
  (`✅ ✅ ⚠️ ⚠️ ❌ ❌ ✅`) is **identical** to `US-0017-0009`'s, which scored `✅` before this round, so
  the rise is internally consistent rather than special-pleaded. My residual objection is about scope,
  not merit: M3.
- `US-0017-0004` `Oracle strength`, `✅` to `⚠️`: **on merit.** `test-case-depth-checklist.md:82` is
  exactly "No loop asserts over a collection that is empty by construction" (I checked the line), and
  the scan filters `job.steps[].run` across five lanes whose every step is an `echo`. Round 1's M2 and
  R03's finding 3 both required it off `✅`; `⚠️` satisfies both, and the stated reason ("an oracle for
  the assertion and not for the story") is the correct characterisation.

**But the axes differ, and that is the part worth stating.** The up-movement is on the `Status` column
and raises the headline; the down-movement is a depth cell on a row whose `Status` was already `❌`, so
it costs the headline nothing. The reported total (`✅ 3 / ⚠️ 1 / ❌ 5`) is therefore **strictly better
on the `Status` axis** than the `✅ 2 / ⚠️ 2 / ❌ 5` an independent reviewer measured — one row up, none
down. "Neither movement changes the `❌` count" (`coverage-depth-spec-0017.md:70`) is true, and is also
the one axis on which nothing moved.

To the stage's credit, this is **disclosed**, precisely and unprompted, at
`coverage-depth-spec-0017.md:66-70` and `atdd-spec-0017.md:324-330`: both name the gatekeeper's figure,
the new figure, and each of the two cells that moved. That is the right treatment and it is why this is
not a finding. What I would add is one clause: that the `Status` total is now one higher than the
independently measured figure and that no `Status` cell moved down, so the movement is one-directional
by construction rather than balanced.

---

## Sequencing note (not a finding)

`.qfai/evidence/atdd-spec-0017.md § Final status` records round 1's pack and seal and states "A round 2
gate is owed on the changes this record describes, and this stage does not claim its own repairs
reviewed." That is the correct posture, and `## Final status` is outside my audit subject by design. Per
my stop conditions an unfinalized completion record is a sequencing note, not a gap. Recorded here only
so the rework does not miss that this round's pack (`.qfai/review/review-20260820220000000/`) needs its
own seal **recorded** and then **separately recomputed**, and that the round-1 seal must stay recorded
rather than be replaced by it.

## Required fixes (blocking only)

1. **B1** — write the branch-3 `DR-*` to `.qfai/decisions/DR-0017-0010-<slug>.md` (the Drift Protocol
   whitelist permits creating it; the reasoning already at `atdd-spec-0017.md:276-284` and `:302-306`
   transfers verbatim), route `qa-gatekeeper` on it per P1d, record the PASS in each entry **before**
   the gate runs, and add the `DR-ID` to both `## Ledger rows advanced` rows. Delete the
   `07_Decisions.md` premise and the `CR-20260820-0007` cross-reference at `:285-289` and `:476-478`.
   Do **not** write `07_Decisions.md`.
2. **B2** — delete "the two rows are no longer deadlocked" and "parks the row instead of stopping the
   phase" (`:291-293`). Until B1 lands, state that step 3b returns the row with a handoff note per
   `qfai-implement/SKILL.md:116`; after B1 lands, state the handover as completed.
3. **B3** — `spec-0015 (2)` becomes `(1)` at `:459`, and check that `8 + 1 + 1 + 1 = 11` reads
   correctly against the sentence's own total.
4. **B4** — either assert the 127 (`toBe(127)`, with `CR-20260820-0011` named as why it should fall) or
   restate `:463-465` and the comment at `checkAtddAnnotationLedger.test.ts:148` as the one-sided floor
   the assertion actually is.

## Advisory / Change Request proposals

- **The lane-name-to-map-name correspondence is unasserted.** `test-layers-ci-lanes.md` ships and so do
  the five lane job ids; nothing asserts they agree, and a rename on either side is silent. This belongs
  to `US-0017-0005` / `-0009`, not to the withdrawn `US-0017-0007`. It is a product obligation upstream
  never asked for, so per `drift-protocol.md#reviewer-originated-obligations` it is an advisory and
  **must not gate this rework**. Propose a `CR-*` if the owning spec wants it.
- **Record a superseded seal with its file list, not just a digest prefix** (Question 5). Makes the
  intersection check mechanical instead of dependent on a reviewer guessing the serialization. Belongs
  to whichever skill owns `references/review-artifact-layout.md`.
- **Reconcile the guard's annotation grammar with the scanner's** (m4). Belongs with
  `CR-20260820-0011`, since wiring the guard into `ci:lint` repo-wide is that CR's work.

## Open risks / residuals

- **`TDD-0069` / `TDD-0070` remain deadlocked** until B1 lands. Unlike round 1, the block is now
  removable by this stage: the DR has a sanctioned home.
- **The authorship-separation breach stands** and is unrepairable retroactively. Two independent
  blocking reviewers have now run twice, which repairs the gate and not the history.
- **The matrix `❌` enumeration can rot silently** (M1). Correct today; unpinned.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; `check-atdd-annotation-ledger.mjs` closes the direction that matters for `spec-0017`
  only, and is not in `ci:lint`.
- **Concurrency.** I ran alongside whichever other reviewer this round routes. I used my own shadow root
  (`tmp/r02-round2/shadow`) and my own scratch directory, and touched neither theirs nor the tracked
  `.qfai/report/validate.log`. Any run-log pointer in the working tree may reflect either run and should
  not be cited by either of us.

## Evidence checked

- `.qfai/review/review-20260820220000000/review_request.md`;
  `.qfai/review/review-20260820200000000/` all four files (R02, R03, request, `summary.json`)
- `.qfai/evidence/atdd-spec-0017.md`; `.qfai/evidence/coverage-depth-spec-0017.md`
- `.qfai/assistant/skills/qfai-atdd/SKILL.md:384-406`;
  `references/red-provenance.md:225-260`, `:360-415`;
  `references/test-case-depth-checklist.md:78-122`
- `.qfai/assistant/skills/qfai-implement/SKILL.md:108-125` (Phase Red steps 3a-3c, 5);
  `references/execution-ledger.md:340-375`
- `.qfai/assistant/constitution/drift-protocol.md:29-90`;
  `shared-skill-delegation-baseline.md:287-428` (reviewer response template, four-step audit hash)
- `.qfai/assistant/manifest/agent-routing.yml:139-206`
- `.qfai/specs/spec-0017/02_User-stories.md`; `06_Test-Cases.md`; `07_Decisions.md` (all nine DRs);
  `09_delta.md:130-190`; `tdd/test-list.md` (parsed mechanically, 82 rows)
- `.qfai/decisions/CR-20260820-0007-*.md`; `CR-20260820-0011-*.md`
- `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (whole);
  `tests/assets/coverageDepthMatrix.test.ts`;
  `tests/integration/scripts/checkAtddAnnotationLedger.test.ts`
- `scripts/check-atdd-annotation-ledger.mjs`;
  `packages/qfai/src/core/atddTraceability.ts:27-38`, `:1145-1180`
- `packages/qfai/assets/init/**` (asset inventory);
  `assets/init/root/.github/workflows/qfai-tests.yml`, `qfai-validate.yml`;
  `tests/e2e/qfai-traceability.md` (208 claims)
- **Commands run.** `git rev-parse --short HEAD` / `git status --porcelain` (start and finish);
  `git ls-files -s` (83 symlinks); `git archive HEAD` shadow root plus symlink re-materialisation from
  the index; `validate --root <shadow> --profile atdd --fail-on error --spec 0017` (`error=2`); the same
  repo-wide (12 `QFAI-ATDD-111` items, tallied per spec);
  `vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (9 passed);
  `vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts tests/assets/coverageDepthMatrix.test.ts`
  (14 passed); `node scripts/check-atdd-annotation-ledger.mjs [--spec 0017]` (8 backed / 127 unbacked);
  `pnpm ci:lint` (exit 0, eleven members); five matrix oracle rounds X1-X5 with byte-verified reverts;
  independent re-counts of the ledger cross-tab, the 208 / 127 / 126 annotation figures, the 38-cell
  partition, the `E4b` ten forms, and both pack seals.
- **Not re-run:** the full `test:e2e` suite and the repo-wide `--profile tdd` run. Deep oracle
  re-execution of `E1`-`E3` and `E6`-`E8` is `qa-gatekeeper`'s domain and I did not duplicate it; no
  finding above rests on any of them.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line ranges and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`
- [x] Required gates and residual risks are recorded
- [x] No mutation persisted: HEAD `56daee8d` unchanged, `git status --porcelain` empty at start and
      finish, and `sha256sum -c` returned `OK` for every file an oracle round touched
