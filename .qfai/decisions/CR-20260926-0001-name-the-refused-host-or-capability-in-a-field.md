# Change Request

- ID: `CR-20260926-0001`
- Title: `Name the refused host or capability in a field of the start refusal`
- Raised by: `qfai-implement orchestrator`
- Raised at: `2026-09-26T04:50:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

CLI-WF `## Host capability report` refuses an unknown host, or a report with any
capability `false`, at `start`: `fail-closed`, cause `unsupported-capability`,
naming the host or the capability.

CLI-WF `## Output` gives the error document as `{ code, message }`, with `cause`
added on `fail-closed`. Nothing but `message` can name the host or the
capability, and the same section says tests never assert message text.

`TC-0018-0187` expects each of its ten boundaries to name the host or the
capability. Its unit test can check the code, the cause and the empty event list,
and nothing that names the subject. The obligation has no oracle.

A run blocked later for the same cause already carries the subject in a field:
`halt.subjects` holds `["delegateSubAgent"]` after a failed first delegation.

## Proposed change

- CLI-WF `## Output`: a `fail-closed` refusal with cause `unsupported-capability`
  adds `subjects[]`, holding the unsupported host, or each capability the report
  gives as `false`.
- CLI-WF `## Host capability report`: the refusal names the host or the
  capability in `subjects`.
- No other refusal code and no other cause gains the field.

## Options (at least 3) and recommendation

| #   | Option                                                                              | Cost                                                    | Risk                                                                                                | Recommended |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Add `subjects[]` to the `unsupported-capability` start refusal, as `halt` names one | One optional field on one cause; two contract sentences | A reader expecting `subjects` on every `fail-closed` refusal finds it on one cause                  | ✅          |
| 2   | Carry `reasons[]` of `{ reason, subject }`, with reasons `host` and `capability`    | Two new reason values; `reasons[]` widens to a new code | `reasons[]` stops meaning a failed input check, which is all it means on the two codes that hold it |             |
| 3   | Keep the subject in `message` only, and record that decision                        | None in code; `TC-0018-0187` narrows to code and cause  | The ten boundaries stay indistinguishable to any test                                               |             |

## Blocked downstream items

| Item                                   | Kind         | Why it depends on the artifact                                 |
| -------------------------------------- | ------------ | -------------------------------------------------------------- |
| `spec-0018/TDD-0228` to `TDD-0237`     | `ledger-row` | Their assertion now includes the named subject                 |
| `spec-0018/TDD-0463`                   | `ledger-row` | The E2E journey asserts the subject the CLI prints             |
| `.qfai/contracts/cli/qfai-workflow.md` | `contract`   | `## Output` and `## Host capability report` name the new field |

- Every row keeps its obligation. `TC-0018-0187` already asks for the subject to
  be named; the field is what lets a test see it.
- Overlapping open CRs: none.

## Impact scope

- Specs: none. `TC-0018-0187` already states the obligation.
- Plans: none
- Tests: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`,
  `packages/qfai/tests/e2e/spec0018HostCapabilityE2E.test.ts`
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`

## Decision needed from user

Whether the start refusal names the refused host or capability in a field, and
which field.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for the two sentences above. Record this CR in the `09_delta.md` of
   every spec that references CLI-WF and in `_policies/10_delta.md`.
2. Implementation lane: `decide` adds `subjects` to the refusal; the unit and
   E2E tests assert it.
3. Downstream ledger sweep: no row is reset, seeded or retired.

## Resolution

Pending the user's decision.
