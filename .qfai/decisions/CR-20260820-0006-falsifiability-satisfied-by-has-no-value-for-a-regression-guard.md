# Change Request

- ID: `CR-20260820-0006`
- Title: `The falsifiability path's Satisfied-by field has no honest value for a regression guard over pre-existing state`
- Raised by: `/qfai-implement orchestrator, spec-0017; raised while recording the trio the qa-gatekeeper required, not while trying to avoid it`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `ambiguity`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`
- Blocked set: `none — all thirteen rows carry the trio with an accurate value; what is open is whether the reference's vocabulary admits that value`

## The two classifications the reference offers

`references/red-not-observable.md` § "Classify first" is exhaustive by construction:

- **Obligation already satisfied by a sibling row** — "the new test exercises a predicate an earlier
  `done` row already made pass". Follow the falsifiability procedure.
- **Anything else** — "the test is wrong, the SUT is wrong, or the cause is unknown". Transition to
  `exception`.

Step 1 of the procedure then says: "Record `Satisfied-by: TDD-NNNN` — the row whose implementation
already satisfies this obligation."

## The case that is neither

Eleven of this spec's thirteen falsifiability rows are **regression guards over production state that
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
the obligation**, which for these eleven is a named pre-existing artifact rather than a `TDD-NNNN`.
That is a deviation from the reference's literal instruction, taken deliberately and in the open
rather than by writing a row id that would be false.

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
- Tests: `none of the thirteen rows changes; only what their Evidence cell is allowed to say`
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
   grammar; propagate to the installed `.qfai/` mirror by reinstall, not by hand-editing the mirror.
2. Downstream ledger sweep: **no rows are reset.** Every affected row is already `refactor` with a
   complete trio, and this CR changes only the vocabulary the trio may use. Enumerated for the
   avoidance of doubt, so a later sweep cannot claim these rows were in scope:
   - not reset: `TDD-0004`, `TDD-0018`, `TDD-0024`, `TDD-0025`, `TDD-0026`, `TDD-0031`, `TDD-0036`,
     `TDD-0038`, `TDD-0041`, `TDD-0042`, `TDD-0043`, `TDD-0068`, `TDD-0075`
   - If the approved option instead REJECTS the artifact-naming value, then the eleven rows whose
     `Satisfied-by` names an artifact must have that cell rewritten to the approved form. That is a
     cell edit, not a status reset — the `Evidence` cell is unconditionally editable under the drift
     protocol.
3. Cross-check after applying: re-grep the ledger for `Satisfied-by:` and confirm thirteen cells, the
   count this CR was raised against.

## Resolution

<!--
Filled in when Status leaves `open`. Record the reference edit that was made and the reinstall that
propagated it, plus the re-grep count from step 3.
-->
