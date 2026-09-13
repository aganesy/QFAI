# Change Request

- ID: `CR-20260913-0008`
- Title: `spec-0013 states the legacy-contract window without the sunset its own rule gives it`
- Raised by: `qfai-implement`
- Raised at: `2026-09-13T02:18:39Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`spec-0013` states one rule for UI contracts that predate the `primary_tasks`
slot, in three places, and one of them drops the condition the other two carry.

- `REQ-0117` makes a slot-less contract informational under a one-minor-release
  window, and names its sunset: `qfai 1.10.0`.
- `BR-0013-0016` makes it informational "until they are re-authored or until
  the next minor escalates the warning".
- `TC-0013-0027` makes it informational and non-blocking, with no condition at
  all.

The package is at `1.12.0`, so the window both conditions describe has closed,
and the product blocks: the covering case,
`legacy slot-less contracts emit QFAI-AUD-001 at severity=error (past sunset)`,
asserts that no `info` finding is produced. The requirement, the rule and the
product agree. The test case is the one statement that does not, because it
lost the condition.

The test file repeats that loss twice. Its header comment and the comment
directly above the legacy case both describe the pre-sunset behaviour,
informational and non-blocking, over a case asserting the opposite.

## Reproduction

From `.qfai/specs/spec-0013/01_Spec.md`:

```text
89: - REQ-0117: QFAI-AUD-001 deprecation-window downgrade for slot-less contracts — …
    key-absent → severity=info (informational, non-blocking) … one-minor-release deprecation window …
    (one minor release; sunset = qfai 1.10.0) …
```

From `.qfai/specs/spec-0013/04_Business-Rules.md`:

```text
120: - … Pre-existing UI contracts that lack the slot are treated under deprecation-window semantics
     (informational rather than blocking) until they are re-authored or until the next minor escalates the warning.
```

From `.qfai/specs/spec-0013/06_Test-Cases.md`:

```text
190: - … Pre-existing UI contracts that predate the slot are treated under deprecation-window semantics (informational, non-blocking) — covered as a boundary sub-case within the same test file.
```

From `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`:

```text
9:  *   - slot-absent (legacy) UI contracts -> QFAI-AUD-001 at severity=info
10:  *     under a one-minor-release deprecation window (sunset: qfai 1.10.0);
11:  *     non-blocking so legacy contracts can migrate without a hard break.
215:   // 2-stage emission: legacy UI contracts that pre-date the primary_tasks
216:   // slot (key-absent) emit QFAI-AUD-001 at severity=info under a one-minor
217:   // release deprecation window (sunset: qfai 1.10.0). Key-empty (slot
218:   // authored but `primary_tasks: []`) remains severity=error.
219:   it("legacy slot-less contracts emit QFAI-AUD-001 at severity=error (past sunset)", async () => {
226:       expect(audit001.filter((issue) => issue.severity === "info")).toEqual([]);
```

## Proposed change

Re-derive `TC-0013-0027` so its legacy sub-case carries the condition
`REQ-0117` and `BR-0013-0016` already state: informational until the window's
sunset, and blocking once it has passed. Correct the two comments of
`sddPrimaryTasksLane.test.ts` quoted above to describe the same rule.

**The condition adds no boundary to observe.** The lane has no window logic:
`validateDesignAudit` reports a slot-less contract at `error` with no version
check. No run can observe the informational side, so the restated sub-case
stays one boundary, a contract from before the slot blocking the lane.

`REQ-0117` and `BR-0013-0016` are not edited, and neither is the product.

## Blocked downstream items

| Item                                                                   | Kind         | Why it depends on the artifact                                              |
| ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `spec-0013/TDD-0021`                                                   | `ledger-row` | Carries `TC-0013-0027`, whose legacy sub-case this fix restates             |
| The two `spec-0013` rows `CR-20260913-0009` appends for `TC-0013-0027` | `ledger-row` | The same obligation. One of them owns the legacy sub-case this fix restates |

- Not blocked by this CR: every other `spec-0013` row. `TDD-0020` and the row
  `CR-20260913-0009` appends beside it carry `TC-0013-0026`. They share the
  test file, and their obligation, the lane and the preflight refusing an empty
  list, does not read the legacy window.
- Overlapping open CRs: `CR-20260913-0009` re-derives `spec-0013`'s ledger to
  its template, splitting every progressed row that runs several boundaries
  behind one `Selector`, `TDD-0021` among them. **It is applied first, and this
  record assumes it has landed**; if it is rejected, this record is restated
  before it is applied. `CR-20260913-0003` and `CR-20260913-0007` name files
  this record names too — `06_Test-Cases.md`, `09_delta.md` and
  `tdd/test-list.md`. This record is applied before both, and
  `CR-20260913-0007` and then `CR-20260913-0003` assume it has landed. The
  three blocked sets do not intersect.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: the rows carrying `TC-0013-0027` —
  `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`; and, through
  the `/qfai-atdd spec-0013` pass in action 3, every other ATDD-owned
  `spec-0013` row still owed that no open Change Request blocks when that pass
  runs, with `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

## Decision needed from user

Approve restating `TC-0013-0027`'s legacy sub-case with the sunset condition its
requirement and business rule already carry?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013`, mode `re-derive`, over `TC-0013-0027`. It records
   this Change Request as one row in `spec-0013/09_delta.md`'s
   `## Change Requests` table — `CR ID`, `Upstream artifact`, `Mode`,
   `Approved by`, `Applied at` — not as a `## Triage` row.

   **`CR-20260913-0009` is applied first.** It re-derives `spec-0013`'s ledger
   to its template: the six columns it lacks, the `Integration` and `E2E` rows
   Phase 2b owes, and the split of all thirteen progressed rows that run
   several boundaries behind one `Selector` — `TDD-0021`, `TDD-0029` and
   `TDD-0030` among them — with the resets those splits owe. It also removes
   `TDD-0021`'s case for an authored but empty list, which repeats the boundary
   of `TC-0013-0026` that `TDD-0020` keeps. This rerun's Phase 2b therefore
   meets nothing to migrate, seed or split, and this record authorises no
   ledger write beyond action 2. A progressed row of that shape the rerun still
   meets is raised then as a request of its own and left as it is until that
   request is approved; nothing else in this plan waits on it.

2. Downstream ledger sweep, per boundary. `CR-20260913-0009` has split
   `TDD-0021` by then: `TDD-0021` keeps the passing contract, and a row is
   appended for the preflight proceeding on it and another for a contract from
   before the slot. This fix restates the last of those boundaries and no
   other, so Phase 2b pairs each boundary with the row whose `Boundary` names
   it, appends none and retires none.
   - **The row for a contract from before the slot is reset to `todo`**,
     recording this CR's ID in `DR-ID`, wherever it has left `todo` by then.
     Its obligation gains the sunset condition, and an observation taken
     against the unconditional wording does not describe it. It is named by
     that rule rather than by a `TDD-ID`, which `CR-20260913-0009` allocates:
     the `spec-0013` row carrying `TC-0013-0027` whose `Boundary` is the
     legacy contract. `CR-20260913-0009` appends it at `todo` and this
     record's blocked set keeps it unselected, so the reset is owed only if a
     run has moved it since.
   - `TDD-0021` and the row for the preflight keep their obligations and are
     not reset, so this record writes no `DR-ID` on either.

3. **In this order**, once the rerun above has written the ledger:
   1. `/qfai-implement spec-0013` runs its Change Request preflight, which
      writes action 2's reset before the ledger is read for anything else. It
      advances none of the rows carrying `TC-0013-0027`: their handover for
      this cycle is the next step's to record. It makes no product edit.
   2. `/qfai-atdd spec-0013` makes the test edit. The rows carrying
      `TC-0013-0027` are `Integration` rows, whose tests that stage writes and
      `/qfai-implement` does not (`qfai-implement/SKILL.md`). It corrects the
      header comment of `sddPrimaryTasksLane.test.ts` and the comment above the
      legacy case, both quoted above, which describe the pre-sunset behaviour
      over a case that asserts the post-sunset one. No assertion changes. It
      records the handover of those rows. **That invocation is not limited to
      these rows**: it takes up every ATDD-owned `spec-0013` row still owed
      when it runs that no open Change Request blocks, as that stage's ordinary
      forward work. It writes their tests under `packages/qfai/tests/**`, their
      entries in `.qfai/evidence/atdd-spec-0013.md`, and a refreshed
      `.qfai/evidence/coverage-depth-spec-0013.md` through its reviewer gate.
      None of that edits an upstream path.
   3. `/qfai-implement spec-0013` resumes from that handover. This record makes
      no product edit.

## Resolution

Not yet resolved.
