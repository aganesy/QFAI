# Evidence cell grammar

The one legal shape of a `test-list.md` `Evidence` cell, and what each half
binds to. The cell is a **pointer**, not the payload:
`execution-ledger.md#evidence-cell-contract` says why, and
`execution-ledger.md#evidence-cell-rules-enforced` lists the findings that
police it.

There is **one** legal shape, and it is capped at **240 characters**:

```
RED:<fail|falsifiability|n-a> GREEN:pass ORACLE:<proved|equivalent-mutant> [TIER:<T1|T2|T3>] REV:<revision> -> <anchor>
```

```
RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-0001.md#tdd-0027`
```

- `RED:` — how the failing observation was obtained. `falsifiability` is the
  argument recorded for a row whose RED cannot be observed directly
  (`red-not-observable.md`); `n-a` is a row that owes no RED at all — a
  documentation row, and nothing else. **`n-a` is not available on an
  ATDD-owned row**: `execution-ledger.md#atdd-owned-rows` says of `E2E` / `API`
  / `Integration` that "There is no waiver here", and routes the case that looks
  like one — a journey whose surface the same cycle just built — to
  `falsifiability`. The validator rejects it there per `Layer`.
- `GREEN:` — `pass` is the only legal value. A row that is not green does not
  carry evidence yet, and its `Status` says so.
- `ORACLE:` — whether the oracle was **proved** or established by an
  **equivalent-mutant** argument. This is the obligation the free-prose cell
  made invisible: under no fixed name, no gate could count its coverage.
- `TIER:` — **optional**, and reserved. Write it only when the project has
  adopted a tier vocabulary.
- `REV:` — the revision the run was taken at, in the two spellings
  `evidence-revision.md` defines and no others: a git rev (7-64 hex), or
  `working-tree+<sha256>` for an observation taken against an uncommitted
  tree. The reviewer-response gate reads the same two, so one value serves
  both.
- `-> <anchor>` — `.qfai/evidence/<implement|atdd>-<spec-id>.md#<tdd-nnnn>`:
  the evidence file this row's `Layer` owns, and **this row's own**
  `### TDD-NNNN` section in it. All three halves are checked **against the
  row**, not merely for shape: the stage is the one the `Layer` assigns
  (`implement` for the rows this skill runs itself, `atdd` for `E2E` / `API` /
  `Integration`), `<spec-id>` is **this** spec's, and the fragment is this
  row's `TDD-ID` lowercased — the slug of the section both skills require per
  row. An anchor into another spec's file, into the file of the stage that did
  not author the test, or at another row's section, is
  `TDDLIST_EVIDENCE_CELL_MALFORMED` — it names proof that was never taken for
  this row. The fragment is required — a pointer to the file alone does not
  say which item's proof to read. A row whose `TDD-ID` is missing or malformed
  has no fragment to bind to, so only the file is checked there;
  `TDDLIST_MISSING` / `TDDLIST_INVALID_ID` name that defect. Backticks around
  the anchor are allowed.

Nothing follows the anchor, with **one** exception: an `E2E` / `API` row that
completed before the ATDD evidence split carries the compatibility marker
`Pre-split-evidence: implement` after it, which `qfai-implement/SKILL.md`
completion item 10 requires and reads. It is legal in the grammar for that
reason — a `done` row cannot re-observe a RED, so it can neither drop the
marker nor earn a new anchor. The marker is what **licenses** the `implement-`
anchor there: item 10 judges an unmarked row by the current rule whatever its
status, so an `E2E` / `API` row naming the implement file **without** the
marker is the row that never produced its ATDD handoff, and is malformed.

The marker is legal in **exactly one** place: after an `implement-` anchor on
an `E2E` / `API` row. Item 10 scopes the marker pass to those two layers, so it
licenses nothing on an `Integration` row — that layer has no pre-split form to
grandfather — and it licenses nothing on a row already pointing at the file it
owns. Anywhere else it is `TDDLIST_EVIDENCE_CELL_MALFORMED`: item 10 reads the
marker to tell a legacy row from a current one, so a row that may carry it for
no reason is a row that may claim to be legacy.

Everything else the cell used to carry belongs in the evidence file the anchor
names. This is a move, not a deletion.
