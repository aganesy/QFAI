# Change Request

- ID: `CR-20260820-0006`
- Title: `The falsifiability path's Satisfied-by field has no honest value for a regression guard over pre-existing state`
- Raised by: `/qfai-implement orchestrator, spec-0017; raised while recording the trio the qa-gatekeeper required, not while trying to avoid it`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `1 plus 4` — add the third classification, and name the seam sub-case
- Applied at: `2026-08-23T00:00:00Z` — red-not-observable.md gains the pre-existing-state classification, the widened Satisfied-by values, and the seam sub-case
- Superseded by: `-`
- Blocked set: `none — all twenty-one rows carry the trio with an accurate value; what is open is whether the reference's vocabulary admits those values`

## The two classifications the reference offers

`references/red-not-observable.md` § "Classify first" is exhaustive by construction:

- **Obligation already satisfied by a sibling row** — "the new test exercises a predicate an earlier
  `done` row already made pass". Follow the falsifiability procedure.
- **Anything else** — "the test is wrong, the SUT is wrong, or the cause is unknown". Transition to
  `exception`.

Step 1 of the procedure then says: "Record `Satisfied-by: TDD-NNNN` — the row whose implementation
already satisfies this obligation."

## The case that is neither

Twelve of this spec's twenty falsifiability rows are **regression guards over production state that
predates the row**. Concretely:

| row        | what already satisfied the obligation                                           |
| ---------- | ------------------------------------------------------------------------------- |
| `TDD-0036` | the `build` job already carried the exact name, no condition, every item        |
| `TDD-0038` | no verification item carried `continue-on-error`, in any form                   |
| `TDD-0041` | the test job's seven legs were already the layer split                          |
| `TDD-0042` | the verdict job was already keyed `ci-pass` with no name override               |
| `TDD-0043` | the topology already produced exactly the fourteen pinned check names           |
| `TDD-0068` | the runner configuration declared no retry setting to begin with                |
| `TDD-0024` | `package.json#files` already excluded `.github`                                 |
| `TDD-0026` | no bump configuration existed at any of the three candidate roots               |
| `TDD-0031` | the shared setup definition was never inside the shipped tree                   |
| `TDD-0018` | the lane already counted reachability rather than declaration                   |
| `TDD-0004` | the accepting direction — the change's own no-behaviour seam accepts everything |

None of these is "a sibling row". None is "the test is wrong, the SUT is wrong, or the cause is
unknown" either — the test is right, the SUT is right, and the cause is precisely known. So the
classification step routes them to `exception` by elimination, which is the one outcome that is
certainly wrong: an `exception` records an anomaly, and there is no anomaly. A correct test that
passes because the system is already correct is the **best** case, not an anomaly.

`TDD-0004` is a further variant worth naming separately: its satisfier is the **seam** the RED
procedure itself prescribes. An accepting-direction row cannot be reddened by a no-behaviour seam,
because a seam accepts everything. That is structural, not incidental — it will recur for every
accepting-direction row in every spec.

## Why this is a change request and not a note

Because the field is **load-bearing for a gate**. `qa-gatekeeper` reads the trio as the minimum
evidence for a row on this path, and a reviewer checking `Satisfied-by: TDD-NNNN` against the ledger
finds either a row that does not exist or a value that is not a row id. Whichever way an author
resolves that locally, the next author resolves it differently — which is the same
unverified-hand-maintenance failure `CR-20260814-0001` describes one level down.

Recorded in the interim, and visible in the ledger now: `Satisfied-by` names **what actually satisfies
the obligation**, which for twelve of them is a named pre-existing artifact rather than a `TDD-NNNN`, and for the other eight is the seam or an earlier change of this run.
That is a deviation from the reference's literal instruction, taken deliberately and in the open
rather than by writing a row id that would be false.

## Correction: twenty rows, not thirteen, and three deviation classes rather than one

**Added 2026-08-20, after round 5.** Both `qa-gatekeeper` and `completion-reviewer` found the same
error independently, and it is mine: this CR was filed at `8b0bcffe` against thirteen rows, and
`e4a7295c` — the B7 repair, landing after it — put the same three fields on seven more without
updating the CR. Step 3 below therefore told the operator to "confirm thirteen cells" against a tree
that correctly holds twenty, so a compliant tree would have failed the CR's own cross-check.

The twenty, and what each `Satisfied-by` actually names:

| class                                                       | rows                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **A — production state predating this spec** (12)           | `0024`, `0026`, `0036`, `0038`, `0041`, `0042`, `0043`, `0055`, `0056`, `0068`, `0080`, `0082` |
| **B — the no-behaviour seam, or the absence it leaves** (4) | `0004`, `0078`, `0079`, `0081`                                                                 |
| **C — an earlier change of THIS run** (4)                   | `0018`, `0025`, `0031`, `0075`                                                                 |

So **20 of 20 deviate** from `Satisfied-by: TDD-NNNN`, not eleven of thirteen as first written, and
they deviate in three different directions. `qa-gatekeeper` split them 13/4/3 and put `TDD-0025`
under class A; it belongs in C, because the `DR-0017-0003` it names was written on this branch by
`42dd70cb`, not before the spec. That is the only disagreement and it does not change the shape of
the finding.

**Why the three classes matter to the decision.** Option 1 as first written legalises class A only —
"pre-existing production state". It leaves B and C exactly as unexpressible as before:

- **Class B** is the structural case: an accepting-direction row cannot be reddened by the seam the
  RED procedure itself prescribes, and a document reduced to a placeholder satisfies every negative
  claim about it. That will recur in every spec, which is why option 4 asks for it by name.
- **Class C** is the most awkward, and it is the one no option covers. The satisfier is an earlier
  change **in the same run** — change 3's own production edit, change 4's placement, change 7 part 1.
  A sibling ROW is not responsible, so `TDD-NNNN` is still false; but "pre-existing" is false too,
  because the state was created minutes earlier by the same session. If the approved option is
  literal about class A, these four rows are left with no honest value at all.

Recommended, updated: **option 1 extended to name all three classes**, plus option 4. A `Satisfied-by`
grammar of "a `TDD-NNNN`, a `DR-NNNN`, a named artifact and the property it already had, the seam, or
an earlier change in this run identified by its change number" covers every case measured here and
leaves nothing to invent.

### And twenty-one, not twenty — the third filing of the same off-by-N

**Added 2026-08-20 after round 6.** Both reviewers counted the ledger and found **21**
`Satisfied-by:` cells against this CR's twenty. Traced:

```text
90a33ee5   TDD-0012 has no trio     total 20
76ade4dd   TDD-0012 gains its trio  total 21
```

`76ade4dd` is the commit that added the "twenty rows, not thirteen" correction above. So the same
commit that fixed 13 -> 20 created the 21st member, and the correction was stale the moment it
landed. Thirteen, then twenty, then twenty-one: three filings, three wrong counts, each one
introduced by the fix for the previous.

The cause is structural and worth naming rather than apologising for: a count maintained in prose
about a population the same commit is changing cannot be right. The cross-check in step 3 below is
now written as a rule rather than a number, so the next reader derives it instead of trusting it.

`TDD-0012` belongs to **class A** — production state predating the row. Its `Satisfied-by` names the
pre-existing `ci.yml` at the change-8 base, where the `lint` and `build` jobs carried neither a
condition nor a `needs` list, which is exactly what the row asserts. So the classification becomes:

| class                                                       | rows                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **A — production state predating this spec** (13)           | `0012`, `0024`, `0026`, `0036`, `0038`, `0041`, `0042`, `0043`, `0055`, `0056`, `0068`, `0080`, `0082` |
| **B — the no-behaviour seam, or the absence it leaves** (4) | `0004`, `0078`, `0079`, `0081`                                                                         |
| **C — an earlier change of THIS run** (4)                   | `0018`, `0025`, `0031`, `0075`                                                                         |

## Options

1. **Add a third classification: "obligation already satisfied by pre-existing production state".**
   `Satisfied-by` accepts a `TDD-NNNN`, a `DR-NNNN`, or a named artifact plus the property it already
   had. Cost: the reference grows a branch, and the field stops being machine-checkable against the
   ledger. Benefit: it describes the majority case on this path, and a regression guard stops being
   pushed toward `exception`.
2. **Keep two classifications and widen the sibling one** to "a sibling row **or** any prior work that
   made the predicate true". Cost: "sibling row" stops meaning a row, so the field's name misleads.
   Cheaper edit, weaker result.
3. **Require every regression-guard row to name the row that last touched the satisfying artifact.**
   Cost: usually there is no such row in this spec — the artifact predates the spec — so this
   manufactures a citation. Rejected on the same ground the reference itself gives for item 4:
   "inventing an unrelated change to tick this box is worse than the gap it fills".
4. **Add the accepting-direction case as its own named sub-case**, independent of which option above
   is taken, since `Satisfied-by: the seam` will recur in every spec and the seam is not production
   code.

Recommended: option 1 plus option 4. Option 1 makes the common case expressible; option 4 stops the
structural case being re-derived by each author.

## Impact

- Specs: `none — this is a skill reference, not a spec`
- Plans: `none`
- Tests: `none of the twenty rows changes; only what their Evidence cell is allowed to say`
- Contracts: `none`
- Schema: `none`

Reference file that would change:
`packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/red-not-observable.md`
(and the installed mirror under `.qfai/`).

## Decision needed from user

Should `red-not-observable.md` gain a third classification for "obligation already satisfied by
pre-existing production state", with `Satisfied-by` allowed to name an artifact and its property
rather than a `TDD-NNNN` — and should the accepting-direction-versus-seam case be named explicitly
alongside it?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: edit `references/red-not-observable.md` under
   `packages/qfai/assets/init/**` to add the approved classification and the `Satisfied-by` value
   grammar; propagate to the installed `.qfai/` mirror by reinstall, not by hand-editing the
   mirror. **No mode applies, and the owner named here was wrong.**
   `references/red-not-observable.md` is packaged skill text under `packages/qfai/assets/init/**`,
   which the step-4 invocation table does not cover — the same reasoning three sibling CRs apply
   correctly. `/qfai-sdd` does not own it; the package source does, and the installed mirror
   follows by reinstall.
2. Downstream ledger sweep: **no rows are reset.** Every affected row is already `refactor` with a
   complete trio, and this CR changes only the vocabulary the trio may use. Enumerated for the
   avoidance of doubt, so a later sweep cannot claim these rows were in scope:
   - not reset, all twenty: `TDD-0004`, `TDD-0018`, `TDD-0024`, `TDD-0025`, `TDD-0026`, `TDD-0031`,
     `TDD-0036`, `TDD-0038`, `TDD-0041`, `TDD-0042`, `TDD-0043`, `TDD-0055`, `TDD-0056`, `TDD-0068`,
     `TDD-0075`, `TDD-0078`, `TDD-0079`, `TDD-0080`, `TDD-0081`, `TDD-0082`
   - If the approved option instead REJECTS the artifact-naming value, then the twelve rows whose
     `Satisfied-by` names an artifact must have that cell rewritten to the approved form. That is a
     cell edit, not a status reset — the `Evidence` cell is unconditionally editable under the drift
     protocol.
3. Cross-check after applying, as a RULE rather than a number: every `refactor` row whose
   `Evidence` cell contains `Satisfied-by:` must also contain `Falsifiability command:` and
   `Falsifiability result:`, and no such row may also carry a `RED command`. Three counts have been
   written into this CR and all three were stale within a commit — 13, then 20, then 21 — so the
   number is not the check. Derive it from the ledger.

## Resolution

<!--
Filled in when Status leaves `open`. Record the reference edit that was made and the reinstall that
propagated it, plus the re-grep count from step 3.
-->
