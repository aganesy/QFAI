# Change Request

- ID: `CR-20260913-0011`
- Title: `spec-0013 requires the template to ship the value its own lane fails`
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

`spec-0013` declares two things about one value, and they cannot both hold.

- **The template ships the empty list.** `REQ-0115`, `US-0013-0011`,
  `AC-0013-0018`, `BR-0013-0015`, `EX-0013-0015` and `TC-0013-0025` require
  every `screens[]` entry of the shipped `ui-contract.sample.yaml` to carry a
  literal `primary_tasks: []`. `BR-0013-0015` adds "The slot ships as an empty
  array (placeholder for authoring)", and step 1 of `10_Plan.md`'s `CHG-005`
  restates it.
- **The lane fails on the empty list.** `AC-0013-0019`, `BR-0013-0016`,
  `EX-0013-0016` and `TC-0013-0026` require the validate lane to fail at
  `error` on exactly that value, naming the file, the screen id and the rule
  token.

A template shipped the way the first set says hands its author a contract that
fails the second set's lane on first use. The pack contradicts itself, so the
disagreement needs no outside fact to show it.

The product has already resolved it one way. The template ships three authored
tasks on its sample screen, and the lane fails an empty list, so the product
satisfies the second set. Only the first set has to move.

## Reproduction

The two test cases, from `.qfai/specs/spec-0013/06_Test-Cases.md`:

```text
174: - Verify that the shipped `…/templates/contracts/ui-contract.sample.yaml` template parses with every
     `screens[]` entry carrying a `primary_tasks: []` slot, …
182: - Verify that the new QFAI-AUD-001 aligned validate lane FAILS at severity error when any `.qfai/contracts/ui/*.yaml` has `screens[].primary_tasks: []` on any entry, …
```

The same pair one layer down, from `.qfai/specs/spec-0013/04_Business-Rules.md`:

```text
111: - The shipped UI contract template `…/templates/contracts/ui-contract.sample.yaml` MUST carry a
     `primary_tasks: []` slot on every entry in `screens[]`. The slot ships as an empty array
     (placeholder for authoring); …
119: - Empty (`[]`) `primary_tasks` on any entry MUST FAIL the lane at severity error naming (a) the offending
     file path, (b) the offending screen `id`, (c) the rule `QFAI-AUD-001` (or canonical-aligned token).
```

What the template ships, from
`packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml`:

```text
17:     # primary_tasks: at least one entry required per screen (QFAI-AUD-001).
26:     primary_tasks:
27:       - id: t1
28:         label: Submit a new order
```

## Proposed change

State the first set the way the template ships and the lane accepts: every
`screens[]` entry of the shipped template carries the `primary_tasks` key,
holding at least one authored task.

| Statement                 | Changes to                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `REQ-0115` (`01_Spec.md`) | the template's entries carry the key with at least one authored task                  |
| `US-0013-0011`            | the same, in the story's wording                                                      |
| `AC-0013-0018`            | every `screens[]` entry carries the key holding at least one task                     |
| `BR-0013-0015`            | the same, without "The slot ships as an empty array (placeholder for authoring)"      |
| `EX-0013-0015`            | the example's entries hold an authored task rather than a literal `primary_tasks: []` |
| `TC-0013-0025`            | verify every entry carries the key holding at least one task                          |
| `10_Plan.md`, `CHG-005`   | step 1 says the template carries authored tasks per entry                             |

The guide's instruction to author at least one task per screen, which the same
statements carry beside the slot, is kept as it is. The second set,
`AC-0013-0019`, `BR-0013-0016`, `EX-0013-0016` and `TC-0013-0026`, is not
edited, and neither is the product.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                         |
| -------------------- | ------------ | -------------------------------------------------------------------------------------- |
| `spec-0013/TDD-0019` | `ledger-row` | The former `TC-0013-0025` aggregate row keeps the template slot value this CR changes. |
| `spec-0013/TDD-0022` | `ledger-row` | The former `US-0013-0011` aggregate row keeps the template slot value this CR changes. |

The old→new mapping is `TDD-0019 → 0019/0061` and `TDD-0022 →
0022/0077/0078/0079/0080`. The added `TDD-0061` and `TDD-0077` rows carry the
guide's instruction, which this CR expressly preserves. The other E2E sibling
rows cover the lane and preflight outcomes, which this CR does not restate.

- Not blocked by this CR: `spec-0013/TDD-0061` and `TDD-0077` (guide
  instruction), `TDD-0020/0062` and `TDD-0078/0079` (empty-task lane and
  preflight), and `TDD-0021/0063` and `TDD-0080` (non-empty lane and
  preflight). None reads the template's slot value this CR changes.
- Overlapping open CRs: `CR-20260913-0009` re-derives `spec-0013`'s ledger to
  its template, splitting every progressed row that runs several boundaries
  behind one `Selector`, `TDD-0019` and `TDD-0022` among them. **It is applied
  first, and this record assumes it has landed.** `CR-20260913-0003` and
  `CR-20260913-0008` name files this record names too, `06_Test-Cases.md`,
  `09_delta.md` and `tdd/test-list.md` among them. **They are applied in
  order**: `CR-20260913-0008`, then this record, which assumes it has landed,
  then `CR-20260913-0003`. If `CR-20260913-0009` or `CR-20260913-0008` is
  rejected, this record is restated before it is applied. The three blocked
  sets do not intersect.

## Impact scope

- Specs: `spec-0013`
- Plans: `.qfai/specs/spec-0013/10_Plan.md`
- Tests: the rows carrying `TC-0013-0025` —
  `packages/qfai/tests/integration/sddUiTemplate.test.ts`; the rows carrying
  `US-0013-0011` —
  `packages/qfai/tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts`; and,
  through the `/qfai-atdd spec-0013` pass in action 3, every other ATDD-owned
  `spec-0013` row still owed that no open Change Request blocks when that pass
  runs, with `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/10_Plan.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

## Decision needed from user

Approve stating the template's `primary_tasks` slot as the key holding at least
one authored task, in every `spec-0013` layer that states it as a literal empty
list?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013`, mode `re-derive`, over the statements the table under
   `## Proposed change` names. It records this Change Request as one row in
   `spec-0013/09_delta.md`'s `## Change Requests` table — `CR ID`,
   `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — not as a
   `## Triage` row.

   **`CR-20260913-0009` is applied first.** It re-derives `spec-0013`'s ledger
   to its template: the six columns it lacks, the `Integration` and `E2E` rows
   Phase 2b owes, and the split of all thirteen progressed rows that run
   several boundaries behind one `Selector`, with the resets those splits owe.
   `TDD-0019` is split into the template's slot and the guide's instruction.
   `TDD-0022` is split into the five boundaries `US-0013-0011`'s criteria name:
   the template's slot and the guide's instruction (`AC-0013-0018`), and the
   lane failing an empty list, the `/qfai-prototyping` preflight refusing it and
   the lane passing a populated one (`AC-0013-0019`). Each split keeps the
   template's slot on the existing `TDD-ID`. This rerun's Phase 2b therefore
   meets nothing to migrate, seed or split, and this record authorises no
   ledger write beyond action 2. A progressed row of that shape the rerun still
   meets is raised then as a request of its own and left as it is until that
   request is approved; nothing else in this plan waits on it.

2. Downstream ledger sweep, per boundary. This fix restates the template's slot
   and no other boundary of either obligation, so Phase 2b pairs each
   re-derived boundary with the row whose `Boundary` names it, appends none and
   retires none.
   - **`spec-0013/TDD-0019` and `spec-0013/TDD-0022` are reset to `todo`**,
     recording this CR's ID in `DR-ID`, wherever they have left `todo` by then.
     Each keeps the template's slot, whose obligation changes, and a recorded
     observation of the literal slot does not describe it.
     `CR-20260913-0009` returns both to `todo` and this record's blocked set
     keeps them unselected, so the reset is owed only to a row a run has moved
     since.
   - The rows `CR-20260913-0009` appends for the guide's instruction and for
     the lane and the preflight keep their obligations and are not reset, so
     this record writes no `DR-ID` on any of them.

3. **In this order**, once the rerun above has written the ledger:
   1. `/qfai-implement spec-0013` runs its Change Request preflight, which
      writes action 2's resets before the ledger is read for anything else. It
      advances none of the rows this record names: their handover for this
      cycle is the next step's to record. It makes no product edit.
   2. `/qfai-atdd spec-0013` makes the test edits. The rows carrying
      `TC-0013-0025` and `US-0013-0011` are `Integration` and `E2E` rows, whose
      tests that stage writes and `/qfai-implement` does not
      (`qfai-implement/SKILL.md`).
      - `TDD-0019`'s case in `sddUiTemplate.test.ts` asserts that each entry
        holds at least one task. Today it asserts only that the key holds a
        list, beside a comment allowing the empty placeholder this fix removes,
        under a header saying what the template puts in the key is not the
        test's subject. The comment and the header are corrected with it.
      - `TDD-0022`'s case in `spec0013UiContractPrimaryTasksE2E.test.ts` gets
        the same assertion, and the file's header stops describing an empty
        slot.

      Both cases keep their titles, which the two rows' `Selector` cells name.
      The rows `CR-20260913-0009` appends for `US-0013-0011` take, where no
      earlier pass has handed them over, a case that drives what each boundary
      names, so the preflight's row drives the `/qfai-prototyping` preflight
      itself rather than `runValidate`. The stage records the handover of the
      rows this record names. **That invocation is not limited to these rows**:
      it takes up every ATDD-owned `spec-0013` row still owed when it runs that
      no open Change Request blocks, as that stage's ordinary forward work. It
      writes their tests under `packages/qfai/tests/**`, their entries in
      `.qfai/evidence/atdd-spec-0013.md`, and a refreshed
      `.qfai/evidence/coverage-depth-spec-0013.md` through its reviewer gate.
      None of that edits an upstream path.

   3. `/qfai-implement spec-0013` resumes from that handover. This record makes
      no product edit.

## Resolution

Not yet resolved.
