# Pre-draft Grilling

Before an SDD stage makes a design decision, the orchestrator gathers its routed authors' open decisions into one frontier and delegates a grilling session under `.qfai/assistant/rule/review-convergence.md#agent-to-agent-grilling-must`. The griller uses the `qfai-grilling` method. The orchestrator holds the result; it does not decide for the authors.

## Checkpoints

| Stage                | Decisions to settle before the write                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Triage and records   | Which existing BF or US expresses the request, which operation is justified, and which approval is needed.           |
| Policy and flows     | Which objective, principle, boundary, or process outcome belongs in each file.                                       |
| Stories and examples | Which actor outcome, failure, boundary, and concrete example is required.                                            |
| Contracts and rules  | Which contract owns each BR, whether its EX is already written, and whether the contract can realize the obligation. |

The checkpoint occurs before this invocation's first design mutation in that stage, even when the artifact already exists. A prototype made only to answer a grilling question is disposable evidence and is not a story-tree write. If a contract change expands the affected flow set, gather the newly exposed decisions and grill again before the next mutation.

## Roles and disposition

- Include every role routed to draft the stage's artifacts in one frontier. A reviewing role, or a separate instance of a drafting role, acts as griller. Keep authorship, grilling, and final review as distinct invocations.
- Read existing policy, decisions, open questions, discussion provenance, and current contracts before asking. Do not ask the user for facts already recorded there.
- The griller identifies options and failure cases, gives an evidence-based recommendation, and stops when a critical product decision needs the user. The orchestrator routes that question to the user; an agent's preference cannot supply approval.
- Settle a critical question before the affected author writes.
- Record each checkpoint in the SDD report, per affected flow, and each decision it settled, as `.qfai/assistant/step/common-grilling-record/STEP.md#checkpoints` and `.qfai/assistant/step/common-grilling-record/STEP.md#decision-rows` state. A skipped checkpoint fails the gate; it is not an implicit approval.

Pre-draft grilling settles a premise before drafting. The independent reviewer gate then checks the written artifact, its traceability, and its validation evidence. Both are required.
