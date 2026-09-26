# SDD Triage

Triage selects the smallest story-tree change that answers each incoming requirement. The source may be the discussion pack selected by preflight, an import-lite source, or the user's explicit requirement. Treat the pack as reference material and resolve a conflict in an SDD-owned artifact.

## Inputs

- The selected source and its requirement IDs, if present.
- Existing 01_policy/, 02_business-flow/, 03_contract/, decisions.md, and open-questions.md.
- .qfai/assistant/rule/change-classification.md for Primary and Tags.
- .qfai/assistant/rule/drift-protocol.md for rejected options and approved change requests.

Read the flow and story indexes plus concrete files. A subject match alone is insufficient: verify that the existing flow's purpose and observable outcomes can express the requirement.

## Operation choice

Choose one primary operation for each affected BF or US. UPDATE is the default when the existing item keeps its identity
and purpose. Its sub-operation is APPEND, MODIFY, or REMOVE. CREATE is used when no existing item represents the new
outcome. DELETE, SPLIT, MERGE, and SUPERSEDE change identity or scope and require explicit approval. UPDATE:REMOVE also
requires approval. A supporting contract update is named in the same decision's Approach or in a linked row; it is not a
second fictional flow.

Inspect the impact cascade: policy → BF → US → AC → EX → enforcing contract, then every other flow or contract that cites the changed item. Record companion changes. A shared BR remains in its authoritative contract; dependent contracts update rule refs.

## Decision and question rows

Use <paths.specsDir>/decisions.md and <paths.specsDir>/open-questions.md, each with exactly ID, Content, Approach, Status. Append a row; later only Status may change. Do not edit the first three cells or remove the row. Use the next highest ID in the table plus one. A retired item still reserves its BF or US ID.

A triage decision's Content names the operation, target BF or US, and discussion source as discussion-<id>#REQ-NNNN when
there is one. For other sources, name the actual source path or user requirement. Approach states the intended files and
rationale, including the change classification Primary and Tags. Status begins TODO if approval is needed, moves to WIP
when approved, and becomes REJECTED if declined. Complete applied decisions move to DONE. Do not treat a TODO row as
authorization.

A change request is a decision row whose Content begins Change request: and names the paths or IDs it may change. A rejected option is a decision row with Status REJECTED. Record a retired story in a decision row, not a separate retired-story file. Open questions use OQ-NNNN rows; DEFERRED needs a specific future decision point.

An unanswered critical product decision opens its Content with Unadjudicated: and stays TODO or WIP until decided. A justified test exception opens a decision Content with Test exception:, names the exact BF, AC, or EX it exempts, and puts the reason in Approach. It takes effect only at DONE; it never exempts descendant items.

## Approval and no-question mode

Use the shared user-question protocol for CREATE, DELETE, SPLIT, MERGE, SUPERSEDE, and UPDATE:REMOVE. Present the target and rationale. Do not self-approve. In --auto, ask no question, leave approval-required rows at TODO, stop before their dependent writes, and report every pending row with its operation and target. Approval-free changes may proceed only if they do not depend on a pending row.

Clarifications follow the constitution's question budget. Approval questions are decisions, so they do not consume that clarification budget. A pre-triage answer to continue is not approval for an operation not yet classified.

## Inside a workflow run

Under a QFAI work order, Stage 1 asks the operator nothing itself. The approval
pass changes by operation.

- **CREATE.** Stage 1 checks the `human_decision` the work order's
  `authorizationRefs` cite for its `new_story` slot, instead of asking. The
  check passes only when the record exists, answers this slot and this
  operation, and is not stale. An approval is stale when the scope digest it was
  given under changes, when the approved story text changes, or when a replan
  widens the scope. The clock alone never makes it stale.
- **A passing CREATE.** The attempt that writes the stage's change appends the
  triage row at TODO. Its Approach cites the record as
  `<runId>/<authorizationId>` and names its `answeredBy`. The row is then raised
  to WIP.
- **A missing, mismatched or stale CREATE approval.** Stage 1 appends no triage
  row and asks the operator nothing. The stage returns `awaiting_input` naming
  the row and the reason.
- **DELETE, SPLIT, MERGE, SUPERSEDE and UPDATE:REMOVE.** A routing-time CREATE
  approval approves none of them. Stage 1 opens the row's approval question as
  a `decision` question of its stage result, with outcome `awaiting_input`, and
  appends no row. The attempt that receives the answer through
  `authorizationRefs` appends the row at TODO, citing that `human_decision` and
  its `answeredBy`, and raises it to WIP.
- **An approval-free row**, such as an UPDATE:APPEND, cites no answer.

The table keeps exactly its four columns. The citation lives in Approach.

## ID allocation

Read all IDs of the kind in the relevant scope, including IDs named by retirement rows. The next ID is the highest plus one. BF spans the project. US is inside its BF. AC and EX are inside their US. BR spans all contracts. DEC and OQ each span their table. Empty numeric scopes begin at 0001, and AC/EX tails begin at 01. Do not reuse an ID because its file was removed or a row was rejected.

A move to another BF changes the story's US ID and all child AC and EX IDs. Record the old IDs as retired, allocate new IDs in the destination scope, and update every citation before the move is complete.

## Completion of triage

Every requirement has a target, an approved or approval-free operation, and a recorded impact path. Every product ambiguity has an OQ. The next stage may write only the approved scope. A rejected option stays excluded until an explicit reopening decision is appended.
