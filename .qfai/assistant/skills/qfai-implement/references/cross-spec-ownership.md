# Cross-spec Code Ownership

What to do when implementing one spec correctly requires changing something
another spec's `done` rows certify.

## Why this needs a rule at all

`/qfai-implement` constrains execution to **one spec** and scopes every artifact
it writes — the ledger, the evidence file — to that spec. The codebase is not
partitioned at all, qfai defines no module → owning-spec index, and the Refactor
phase **mandates** duplication removal one line before this rule applies.

So the collision is the normal case, not an edge one. And both available
outcomes used to violate a shipped rule:

- change the file, and spec A's `done` rows now certify behaviour that was
  re-tested by nobody — `done` has no outbound edge, so those rows cannot be
  reopened;
- do not change it, and the Refactor phase's own instruction is unmet, and
  spec B ships a duplicate.

Neither left any trace under `.qfai/**`. `.qfai/assistant/constitution/drift-protocol.md`'s upstream list
contains no code or test artifacts, so the STOP → Change Request → owner-rerun
route never fired for them.

## The rule

**A production module another spec's ledger names in `Owning module` is that
spec's to certify.** So is a test file another spec's ledger names in
`Test file`, for the narrower case where the file being edited is itself that
spec's test. In both columns it is the `done` rows that carry the certification
— `.qfai/assistant/constitution/drift-protocol.md` reads the two columns the same way. Editing
such a file does not require permission — it requires a record and a re-review.

1. **Detect.** Before editing a production file **or a test file** — in **any
   phase**, not only Refactor, because Phase Red writes to a test file before
   Refactor is ever reached, and its seam step writes to a **production** file
   in that same phase, a route registered on an existing router or an export
   added to an existing module, on a path that can end there without reaching
   Green or Refactor at all — look the file up in every other spec's
   `tdd/test-list.md`, reading only the rows at `Status = done`. Those are the
   rows this rule protects: `done` has no outbound edge, so what they certify
   cannot be re-tested by reopening them, while a `todo` / `red` / `green` row
   has its run still ahead of it and needs no obligation. A `done` row matches
   in either of two ways, and either one means the edit is cross-spec.
   - **Direct.** The file is that row's `Owning module` — the only column that
     holds a production path (`execution-ledger.md`) — or, when the file being
     edited is itself a test, that row's `Test file`.
   - **Reverse dependency.** The row names the file in neither column, but a
     test it does name reaches it. Walk the reverse dependency closure of the
     file about to be edited out to the tests that exercise it
     (`relevant-test-suite.md`), then look those paths up in that row's
     `Test file`. This applies to **every `done` row that did not match
     directly**, declared or not: in the ordinary reverse-dependency shape
     `relevant-test-suite.md` describes — a shared module behind a service
     behind that service's test — the fallback leaves a row that declares
     `src/service.ts` unmatched exactly as it leaves an undeclared one, and `-`
     is legal **per row**, so a ledger's declared rows never clear its
     undeclared ones. An undeclared seam is a
     restriction, not a clearance — the same reading `execution-ledger.md` gives
     it for parallel dispatch. Detection never passes silently just because the
     column is absent.
   - **A shared test artifact is reached through the test graph.** A fixture,
     assertion helper or setup module another spec's tests import is named in no
     `Test file` cell of its own, and the walk above is over the **production**
     import graph (`relevant-test-suite.md`), which holds no edge that reaches
     it: the closure comes back **empty** rather than short, so nothing is left
     unresolved and the widening below never fires either — a weakened helper
     passed detection with no row matched. So when the file being edited is a
     test artifact, walk the **test** import graph backwards as well — the test
     modules that import it, direct and indirect, tests importing tests
     included — and look those paths up in `Test file`. When no test import
     graph can be resolved, that is an unresolvable edge like any other: widen
     to the package fallback below instead of concluding no row is affected.
   - **When the walk cannot be completed, widen.** Dynamic imports, DI or
     container wiring, reflection, generated code, or no import-graph tool at
     hand all leave the closure short of the tests that really reach the file.
     Take the **package fallback** `relevant-test-suite.md` defines for exactly
     that case — every test in the package containing the file being edited —
     and match `Test file` against that set instead. Incomplete resolution
     widens here for the same reason it widens there: an unresolvable edge is
     unknown reach, not absent reach.

   **Normalize before comparing.** `Owning module` legally holds a
   repo-relative path **or** a dotted module path (`execution-ledger.md`).
   Decide which form the cell holds **before** touching its dots — a value
   carrying `/` or ending in a source extension is a path — and read `.` as a
   separator **only** in the dotted form, so `src/foo.bar.ts` keeps its dot
   instead of collapsing onto `src/foo/bar.ts` and manufacturing a hit.
   **Path against path is compared whole**, extension included: `src/parser.ts`
   and `src/parser.py` are two modules two specs may own separately, and
   dropping the suffix makes editing either one hit the other. The
   extension-less, separator-normalized form is an **alias used only to line a
   dotted module up with a path** — `shirube.domain.notification` and
   `src/shirube/domain/notification.ts` are the same module and must match.

   **Strip the source root before comparing that alias.** The two forms are
   rooted differently: a dotted module path starts at a **source root**, a
   repo-relative path starts at the repository. Extension removal and separator
   conversion alone leave `shirube/domain/notification` against
   `src/shirube/domain/notification`, which never match though the example above
   declares them the same module — and a row missed that way is invisible to the
   dependency walk too whenever its test sits outside the edited file's package,
   so the package fallback does not recover it either. Drop the path's
   source-root prefix — `src/`, `lib/`, `app/`, or whatever the project's build
   config declares — and compare **whole segments**. Where the source roots are
   not knowable, take the same rule as a suffix test: the alias matches when the
   path's segment sequence **ends with** the dotted one, on a segment boundary
   (`notifications/x` never matches `...notification.x`). A suffix test can
   over-reach — a vendored copy sharing the same tail matches too — and that is
   the direction to err in here, for the same reason the walk widens above.

2. **Record.** Add a `## Cross-spec obligations` entry to this spec's evidence
   file (fields below).
3. **Re-run, then re-review.** First re-run each `Blocked TDD-ID`'s `Selector`
   against the changed tree, read-only: nothing in the other spec's ledger or
   evidence moves, and the result is captured under `Obligation at risk`. Then
   run `completion-reviewer` against the affected specs' obligations as well as
   this one's, **with those fresh results as its input**. The reviewer audits
   phase-authored evidence; it executes nothing. Handed only the recorded GREEN,
   it would re-ratify a run that predates the edit — and a changed fixture,
   helper or setup breaks that selector without changing a line the reviewer
   reads. The reviewer is still the party that says whether the obligation
   holds; the re-run is what gives it something current to say it about.

   **A passing selector is not enough on a blocked row that carries a proof.**
   Weakening an assertion helper, a snapshot or an expected-value fixture leaves
   that row's selector passing while making it tautological, so a fresh GREEN
   re-approves a test that has lost its discriminating power. For each blocked
   row that has one, also re-run its **original** mutation against the changed
   artifact, capture the failure, revert, and re-run for the restored GREEN.
   Which record holds that mutation depends on the route the row took: an
   ordinary row's is its `Oracle proof` plan, and a row completed through
   `references/red-not-observable.md` has it in `Falsifiability command`, with
   `Falsifiability result` as the failure to reproduce. Not `Satisfied-by`:
   that cell names the sibling `TDD-NNNN`, production path and symbol, or
   artifact-plus-property the row leant on — never the mutation — so it cannot
   say which change to re-apply. Record both runs
   under `Obligation at risk` and hand them to the reviewer with the selector
   result. A mutation that no longer fails the test is the tautology this
   catches, and the row is not re-approved until it is repaired. Same rule, same
   reason as `../../qfai-atdd/references/shared-test-artifacts.md`, which
   imposes it on the stage-level side of the identical edit.

4. **Do not close over it.** An open entry is a completion prohibition
   (`qfai-implement/SKILL.md#completion-prohibition-conditions`).

## The evidence entry

Per affected spec, in the evidence file the row's `Layer` owns (`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` row):

| Field                | Meaning                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TDD-ID`             | the row in **this** spec whose work forced the change                                                                                                    |
| `Blocked spec`       | the spec whose `done` rows the file belongs to                                                                                                           |
| `Blocked TDD-IDs`    | the rows in that spec the detection step matched — the ones naming the file directly, and the ones whose `Test file` the reverse-dependency walk reached |
| `File`               | the exact path changed                                                                                                                                   |
| `Change required`    | what had to change, in one sentence                                                                                                                      |
| `Obligation at risk` | what that spec asserted about the file that is now unverified                                                                                            |
| `Resolution`         | `re-reviewed` (the reviewer confirmed it holds) or `CR-*`                                                                                                |

`Obligation at risk` is the load-bearing field. "Changed a shared helper" is not
a record; "spec-0004 TDD-0012 asserts this helper rejects an empty batch, and
that path is now routed through the new guard" is.

## When re-review is not enough

If the other spec's obligation genuinely no longer holds — the behaviour it
asserted has changed, not merely moved — that is upstream drift, and
`.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected` governs from step 1.
Record the CR id in `Resolution`. Re-review cannot ratify a behaviour change the
other spec never agreed to; only its owner can.

## What this does not do

It does not partition the codebase, and it does not give `done` an outbound
edge. Both are larger changes. What it does is make the collision **visible and
blocking** instead of silent — the two outcomes above are still the two
outcomes, but neither can now be taken without a record that names the
obligation it puts at risk.
