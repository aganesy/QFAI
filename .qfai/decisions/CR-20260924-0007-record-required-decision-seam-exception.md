# Change Request

- ID: `CR-20260924-0007`
- Title: `Record the required decision seam exception in the implementation plan`
- Raised by: `qfai-implement`
- Raised at: `2026-09-24T09:46:02Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user` — explicit message: "このプロンプトを以て承認とします。"
- Approved at: `2026-09-24T11:30:50Z`
- Approved option: `-`
- Applied at: `2026-09-24T11:38:52Z`
- Superseded by: `-`

## Identifier

This record was raised as `CR-20260924-0001` and later held `CR-20260924-0005`. The main branch
gives both IDs to other records, so this one is `CR-20260924-0007`.

## Context

The `spec-0018` Plan calls the listed business rules and contract sections
consumers of `decide.ts` and states that every architectural element has three
consumers when it lands. Those references describe obligations, not dependent
production modules. The first implementation row introduces `decide.ts` with
zero production consumers. The spec and test case require the pure decision
function as an independently observable boundary, but the Plan does not record
this safety-floor exception with its requiring obligation.

## Reproduction

```text
.qfai/specs/spec-0018/10_Plan.md, Architectural elements:
  Each element is a module other code goes through, and each has at least three
  consumers when it lands. The usages below are rules, contract sections and
  interactions that exist now.

.qfai/assistant/agents/implementation-reviewer.md, consumer rule:
  Count independent consumers, not call sites ... a test does not depend on a
  production element, it exercises one.

.qfai/review/review-20260924182257625/R02_implementation-reviewer.md:
  The new `decide.ts` module has zero production consumers; only this row's test
  imports it. ... No safety-floor exception and requiring obligation are
  recorded together.
```

## Proposed change

In `.qfai/specs/spec-0018/10_Plan.md`, state that the table's usages trace
behavioural obligations and do not count as production consumers. Record the
narrow exception for `packages/qfai/src/core/workflow/decide.ts`: `01_Spec.md`
`## Design` requires the pure `decide(snapshot, input, facts)` boundary, and
`TC-0018-0001` observes it directly at L1 before the command adapter exists.
The exception permits its introduction by the first TDD row with fewer than
three independent production consumers. It does not exempt other helpers or
the completed U1 command adapter from their own review. Retain the U1
obligation to wire the command adapter through this function.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                               |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `spec-0018/TDD-0001` | `ledger-row` | Its production module is the exception under review, and its first reviewer returned REVISE. |

- Not blocked by this CR: other `spec-0018` rows remain at `todo` and do not
  establish this first module boundary. They retain their own review gates.
- Overlapping open CRs: none identified for `spec-0018/TDD-0001`.

## Impact scope

- Specs: `spec-0018`
- Plans: `.qfai/specs/spec-0018/10_Plan.md`
- Tests: `spec-0018/TDD-0001`; no test assertion change
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0018/10_Plan.md`, `.qfai/specs/spec-0018/09_delta.md`

## Decision needed from user

Approve the narrow Plan correction above and sweep the downstream ledger under
Drift Protocol step 5. Reset a row only if its TC, US or CON-API obligation
changes or disappears. The initial draft named `TDD-0001` for reset; that
instruction was corrected before application because this Plan clarification
changes no such obligation.

## Approved actions (owner skill rerun plan)

1. Run `/qfai-sdd spec-0018` in `re-derive` mode for the Plan correction
   above, and record this CR in `spec-0018/09_delta.md`. `UPDATE` is the
   existing spec's triage operation, not the Drift Protocol rerun mode.
2. Sweep the downstream ledger under Drift Protocol step 5. The correction
   changes no TC, US or CON-API obligation, so keep `spec-0018/TDD-0001` at
   `refactor` with its prior evidence. Retire no rows and change no test
   assertions. A reset would leave its retained GREEN test outside the
   permitted RED branches.
3. Resume `/qfai-implement spec-0018` at `TDD-0001` for a fresh independent
   implementation review attempt, preserving the failed first review in its
   evidence.

## Resolution

Approved by the user. The `re-derive` owner rerun corrected
`spec-0018/10_Plan.md` and recorded this CR in `spec-0018/09_delta.md`.
The downstream ledger sweep found no changed or removed TC, US or CON-API
obligation, so it made no ledger edit. `TDD-0001` retains its `refactor`
status and RED/GREEN evidence for a fresh implementation review attempt.
