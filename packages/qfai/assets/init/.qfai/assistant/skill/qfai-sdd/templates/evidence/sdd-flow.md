# Evidence: /qfai-sdd BF-0001

Copy this template to `.qfai/evidence/sdd-BF-NNNN.md` for each flow changed by
`/qfai-sdd`. Replace the sample ID with the flow's ID. Keep the headings and
record a result for every gate; `PENDING` does not count as a pass.

## Objective

- Business flow: `BF-NNNN`
- Outcome: `<observable result>`

## Inputs and provenance

- Discussion requirement or import source: `<path>#<ID>`
- Existing policy, story, and contract references: `<paths or none>`

## Decisions and open questions

- Decision rows: `<DEC IDs or none>`
- Open-question rows: `<OQ IDs or none>`

## Pre-draft Grilling

Record one row for each affected design-writing stage before its first story-tree
mutation. If a contract change exposes another flow, record its new checkpoint
before the next mutation. A missing or skipped checkpoint leaves this evidence
at `REVISE`; a Work Orders Summary row does not replace this record.

| Phase | Session | Participants | Frontier | Recommendation | Disposition | Decision/OQ IDs | Ended at | Wrote at | Evidence |
| ----- | ------- | ------------ | -------- | -------------- | ----------- | --------------- | -------- | -------- | -------- |

## Artifacts changed

| Layer | IDs or paths                         |
| ----- | ------------------------------------ |
| BF    | `<BF ID>`                            |
| US    | `<US IDs>`                           |
| AC    | `<AC IDs>`                           |
| EX    | `<EX IDs>`                           |
| BR    | `<BR IDs and owning contract paths>` |

## Contract executability

- Executability: `<contract ID>` — `<scratch target and two-run command/results, or none>`

## Validation

- Command: `<qfai validate --profile sdd --fail-on error --flow BF-NNNN command>`
- Result: `<exit code, error count, warning count>`
- Run log: `<run ID and log location under paths.outDir>`

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |

## Reviewer results

| Reviewer | Verdict | Evidence |
| -------- | ------- | -------- |

## Open risks

- `<unresolved risk or none>`

## Final status

- Status: `PASS | REVISE`
- Reason: `<evidence-based reason>`
