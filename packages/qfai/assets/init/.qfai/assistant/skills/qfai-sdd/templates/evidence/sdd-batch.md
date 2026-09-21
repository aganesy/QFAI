# Evidence: /qfai-sdd batch (<timestamp>)

> Canonical layout for `.qfai/evidence/sdd-batch-<timestamp>.md`, written once by
> a `/qfai-sdd` run with no argument. It records the two phases that run once for
> the whole batch: Phase 0 Contracts-first and Phase 1 Outline. Each spec's
> `sdd-<spec-id>.md` cites this file for those phases instead of copying their
> rows. The two tables keep the columns and rules of
> `templates/evidence/sdd-spec.md`.

## Specs in this batch

- <spec-id>
- <spec-id>

## Pre-draft Grilling

> One row each for Phase 0 and Phase 1, under the rules of the per-spec
> template's section of the same name.

| Phase | Session | Ended at  | Wrote at  | Frontier                 | Evidence             |
| ----- | ------- | --------- | --------- | ------------------------ | -------------------- |
| 0     | run     | <ISO8601> | <ISO8601> | <n> settled, 0 escalated | #work-orders-summary |
| 1     | skipped | -         | <ISO8601> | empty: answered by <ref> | -                    |

## Work Orders Summary

> The work orders Phase 0 and Phase 1 settled, in the shared schema from
> `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#work-orders-summary`.

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1    | <role>           | <instance id>  | <task>     | <refs>       | <refs>        | PASS                         |
