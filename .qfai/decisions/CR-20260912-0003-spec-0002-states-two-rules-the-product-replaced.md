# Change Request

- ID: `CR-20260912-0003`
- Title: `spec-0002 states two rules the product replaced: discussion fixes no direction, and prototyping.yaml is required`
- Raised by: `/qfai-implement orchestrator, repairing the spec-0002 execution ledger`
- Raised at: `2026-09-12T12:40:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Two statements in spec-0002 are contradicted by the product that is supposed to
satisfy them. Both were recorded on 2026-04-23, and neither was revisited when
the behaviour behind it changed.

### A. Discussion chooses no direction

`01_Spec.md` REQ-0012 says discussion performs no single-winner, selected
direction or design-system finalization. `03_Acceptance-Criteria.md`
AC-0002-0008 states it as a scenario: given a UI-bearing pack, a selected
direction or finalized design system is never a discussion completion
condition. `07_Decisions.md` DR-0002-0001 and DR-0002-0003 carry the same rule,
the second placing `selected-direction.yaml` and `design-system.yaml`
downstream of prototyping winner selection.

The product states a narrower rule. The user chooses the brand direction during
discussion; it is recorded at `01_Context.md#Design Direction`; `/qfai-sdd`
Phase 0 reads that field and stops without it; and planner-first now binds only
the screen explorations.
`packages/qfai/tests/assets/designDirectionInterview.test.ts` states the
narrowing in as many words — the rule used to forbid selecting any visual
winner, and it still holds for the screen explorations, which the prototype
loop ranks by iterating.

Nothing under `packages/qfai/src/` contains `planner-first`, and no validator
emits a violation for a pack that asserts a single final winner. The
`discussionDesignHardening` validator that would have was retired in v1.8.9
together with the exploration-sidecar family, which this spec's own ledger
notes record.

### B. `prototyping.yaml` is required of a UI-bearing pack

`01_Spec.md` REQ-0005 says UI-bearing discussion packs require
`prototyping.yaml` and non-ui packs do not. AC-0002-0010 states the scenario,
and TC-0002-0011 asks that README and skill wording match the active rule.

The shipped wording says the opposite, in one sentence three documents are
required to carry verbatim: UI-bearing discussion packs **may** include
`prototyping.yaml` as an optional recommendation artifact. The preflight agrees
— `tests/core/sddPreflight.test.ts` requires a UI-bearing pack missing the file
not to block, and requires a malformed one not to block either.

So a test that checks the wording against the product passes while
contradicting the acceptance criterion, and a test that enforced the criterion
would have to fail against the product.

## Proposed change

Reconcile each statement with the behaviour, in the direction the user chooses
from the options below, and sweep the ledger rows that rest on them.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                              | Cost                                                     | Risk                                                                                                      | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Narrow the spec to the product: REQ-0012 and AC-0002-0008 bind the screen explorations only; REQ-0005 and AC-0002-0010 say the artifact is optional | Edit four upstream statements; re-point four ledger rows | Records today's behaviour as intended. If either narrowing was a regression, it becomes the specification | ✅          |
| 2   | Restore the product to the spec: reinstate a winner check, and make `prototyping.yaml` a readiness blocker for UI-bearing packs                     | New validator work, and a breaking change for adopters   | Reverses a deliberate design move without the record of why it was made                                   |             |
| 3   | Retire the four obligations: withdraw REQ-0012, AC-0002-0008, REQ-0005's requiredness half and AC-0002-0010, and delete the rows resting on them    | Smallest edit                                            | Loses the record that the question was ever settled, so the next reader re-derives it                     |             |

Option 1 is recommended because the narrowing is documented in the tree and was
made on purpose: the direction interview asks the user rather than letting an
assistant invent a brand, and the optional artifact is stated identically in
three shipped documents and enforced by the preflight. What is missing is the
spec catching up, not the product going back.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                             |
| -------------------- | ------------ | -------------------------------------------------------------------------- |
| `spec-0002/TDD-0008` | `ledger-row` | `TC-0002-0008` asks that discussion completion not require a direction     |
| `spec-0002/TDD-0009` | `ledger-row` | `TC-0002-0009` asks that a pack asserting a single final winner be refused |
| `spec-0002/TDD-0010` | `ledger-row` | second row on `TC-0002-0009`                                               |
| `spec-0002/TDD-0012` | `ledger-row` | `TC-0002-0011` asks that the wording match the active requiredness rule    |

- Not blocked by this CR: `spec-0002/TDD-0001` and `spec-0002/TDD-0011`. Their
  obligations — pack readiness, and the non-UI sidecar skip — are untouched by
  either statement, and both rows name a test that discharges them today.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0002` — `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`
- Plans: `.qfai/specs/spec-0002/10_Plan.md`
- Tests: `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0010`, `spec-0002/TDD-0012`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`,
  `.qfai/specs/spec-0002/10_Plan.md`,
  `.qfai/specs/spec-0002/tdd/test-list.md`

## Decision needed from user

Which of the three options settles each statement? They may be settled
differently: option 1 for the direction rule and option 3 for the requiredness
rule is a coherent answer, since the second is a sentence the product already
states in three places and the first is a rule the product still partly keeps.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: the statements the chosen option names, plus the
   `06_Test-Cases.md` rows that read them, and the `10_Plan.md` row citing
   `TC-0002-0026`, which this spec's table does not declare.
2. Downstream ledger sweep: reset **or retire** these `tdd/test-list.md` rows.
   Which list each row takes depends on the option chosen; the split below is
   the one option 1 produces.
   - Reset to `todo`, recording this CR's ID in their `DR-ID` column:
     `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0012`
   - Retire (delete the row; its TC is no longer a coverage target):
     `spec-0002/TDD-0010` — `current preflight unit test pass`. Its test is
     `packages/qfai/tests/core/sddPreflight.test.ts`, which stays and is owned
     by `spec-0002/TDD-0001`, so nothing is deleted with the row. It is a
     second row on a test case stating one scenario, and its selector described
     a preflight behaviour no declared test case of this spec names.

## Resolution

Not yet resolved.
