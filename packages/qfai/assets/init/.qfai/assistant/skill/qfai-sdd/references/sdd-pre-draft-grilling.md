# Pre-draft Grilling

Before an SDD stage makes a design decision, the session agent gathers the stage's open decisions into one frontier.
When the frontier holds a design decision the repository cannot settle, the agent settles the frontier in a delegated grilling session under `.qfai/assistant/rule/review-convergence.md#agent-to-agent-grilling-must`, using the `qfai-grilling` method. It asks the user each critical decision the frontier holds.

When the request, the story tree, the contracts and the recorded decisions already settle every decision of the stage, the frontier is empty. Then no session is held and no griller starts. The stage writes what is settled, and its final report lists no adopted decision for the checkpoint.

## Checkpoints

| Stage                | Decisions to settle before the write                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Triage and records   | Which existing BF or US expresses the request, which operation is justified, and which approval is needed.           |
| Policy and flows     | Which objective, principle, boundary, or process outcome belongs in each file.                                       |
| Stories and examples | Which actor outcome, failure, boundary, and concrete example is required.                                            |
| Contracts and rules  | Which contract owns each BR, whether its EX is already written, and whether the contract can realize the obligation. |

The checkpoint occurs before this invocation's first design mutation in that stage, even when the artifact already exists. A prototype made only to answer a grilling question is disposable evidence and is not a story-tree write. If a contract change expands the affected flow set, gather the newly exposed decisions and grill again before the next mutation.

## Roles and disposition

- The session agent starts the griller.
- One frontier holds every decision the stage's drafts need. Keep grilling and the final review apart: the reviewer reviews no decision it recommended.
- Read existing policy, decisions, open questions, discussion provenance, and current contracts before asking. Do not ask the user for facts already recorded there.
- The session identifies options and failure cases and gives an evidence-based recommendation. A critical product decision goes to the user; an agent's preference cannot supply approval.
- Settle a critical question before the affected author writes.
- The stage's final report lists each decision a checkpoint adopted, with its reason. A skipped checkpoint fails the gate; it is not an implicit approval.

Each decision record carries the four labelled Approach items stated at the top of
`.qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md`.

Pre-draft grilling settles a premise before drafting. The independent reviewer gate then checks the written artifact, its traceability, and its validation evidence. Both are required.
