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

The test file's header comment repeats that loss. It describes the pre-sunset
behaviour, informational and non-blocking, above a case asserting the opposite.

## Reproduction

From `.qfai/specs/spec-0013/01_Spec.md`:

```text
89: - REQ-0117: QFAI-AUD-001 deprecation-window downgrade for slot-less contracts — … key-absent → severity=info (informational, non-blocking) … one-minor-release deprecation window … (one minor release; sunset = qfai 1.10.0) …
```

From `.qfai/specs/spec-0013/04_Business-Rules.md`:

```text
120: - … Pre-existing UI contracts that lack the slot are treated under deprecation-window semantics (informational rather than blocking) until they are re-authored or until the next minor escalates the warning.
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
219:   it("legacy slot-less contracts emit QFAI-AUD-001 at severity=error (past sunset)", async () => {
226:       expect(audit001.filter((issue) => issue.severity === "info")).toEqual([]);
```

## Proposed change

Re-derive `TC-0013-0027` so its legacy sub-case carries the condition
`REQ-0117` and `BR-0013-0016` already state: informational until the window's
sunset, and blocking once it has passed. Correct the header comment of
`sddPrimaryTasksLane.test.ts` to describe the same rule.

`REQ-0117` and `BR-0013-0016` are not edited, and neither is the product.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                  |
| -------------------- | ------------ | --------------------------------------------------------------- |
| `spec-0013/TDD-0021` | `ledger-row` | Carries `TC-0013-0027`, whose legacy sub-case this fix restates |

- Not blocked by this CR: every other `spec-0013` row. `TDD-0020` shares the
  test file, and its obligation, the lane failing on an empty list, does not
  read the legacy window.
- Overlapping open CRs: `CR-20260913-0003` and `CR-20260913-0007` edit other
  statements of the same pack. The three blocked sets do not intersect.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: `spec-0013/TDD-0021` — `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`
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

1. `/qfai-sdd spec-0013`, mode `re-derive`, over `TC-0013-0027`, with one
   `09_delta.md` Triage row for this Change Request.
2. Downstream ledger sweep. Reset to `todo`, recording this CR's ID in `DR-ID`:
   `spec-0013/TDD-0021`. Its obligation gains a condition, and its recorded
   observation was taken against the unconditional wording. No row is retired.
3. Under `/qfai-implement`, with the row's repair, correct the header comment of
   `sddPrimaryTasksLane.test.ts` quoted above, which describes the pre-sunset
   behaviour over a case that asserts the post-sunset one.

## Resolution

Not yet resolved.
