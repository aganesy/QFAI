# Change Request

- ID: `CR-20260913-0007`
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

The product has already resolved it one way. The template ships two authored
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

The second set, `AC-0013-0019`, `BR-0013-0016`, `EX-0013-0016` and
`TC-0013-0026`, is not edited, and neither is the product.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                             |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `spec-0013/TDD-0019` | `ledger-row` | Carries `TC-0013-0025`, whose obligation this fix changes                                                                  |
| `spec-0013/TDD-0022` | `ledger-row` | Carries `US-0013-0011`, the story this fix restates; its `E2E` case still describes the empty slot and asserts only a list |

- Not blocked by this CR: `spec-0013/TDD-0020`. It carries `TC-0013-0026`,
  which is the half the product satisfies and which this fix leaves as it is.
  No other `spec-0013` row reads the template's slot value.
- Overlapping open CRs: `CR-20260913-0003` and `CR-20260913-0008` name files
  this record names too, `06_Test-Cases.md`, `09_delta.md` and
  `tdd/test-list.md` among them. **They are applied in order**:
  `CR-20260913-0008`, then this record, which assumes it has landed, then
  `CR-20260913-0003`. If `CR-20260913-0008` is rejected, this record is restated
  before it is applied. The three blocked sets do not intersect.

## Impact scope

- Specs: `spec-0013`
- Plans: `.qfai/specs/spec-0013/10_Plan.md`
- Tests: `spec-0013/TDD-0019` — `packages/qfai/tests/integration/sddUiTemplate.test.ts`;
  `spec-0013/TDD-0022` — `packages/qfai/tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts`
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

   `CR-20260913-0008`'s rerun, applied first, seeds at `todo` the thirteen
   `E2E` rows `spec-0013`'s ledger lacks for its stories. If this rerun still
   finds any, its Phase 2b seeds them; they are owed whatever this record
   decides, and they are listed so the approval covers them.

2. Downstream ledger sweep. Reset to `todo`, recording this CR's ID in `DR-ID`:
   `spec-0013/TDD-0019`. Its obligation changes, and its recorded observation is
   of the literal slot being replaced. The same rerun re-points it: its
   `Selector` resolves to no case today, so a reset alone returns it to `todo`
   still selecting nothing. `spec-0013/TDD-0022` is reset to `todo` with this
   CR's ID in `DR-ID` as well: the story it carries is restated. No row is
   retired.
3. Under `/qfai-implement`, the row's case in `sddUiTemplate.test.ts` asserts
   that each entry holds at least one task. It asserts only that the key holds
   a list today, with a comment allowing the empty placeholder this fix
   removes. `TDD-0022`'s case in `spec0013UiContractPrimaryTasksE2E.test.ts`
   gets the same assertion, and its header stops describing an empty slot.

## Resolution

Not yet resolved.
