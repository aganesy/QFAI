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

Inspect the impact cascade: policy → BF → US → AC → EX → enforcing contract, then every other flow or contract that cites the changed item. Record companion changes. A shared BR remains in its authoritative contract, and no other contract cites it.

## Decision and question rows

Use <paths.specsDir>/decisions.md and <paths.specsDir>/open-questions.md, each with exactly ID, Content, Approach, Status. Append a row; later only Status may change. Do not edit the first three cells or remove the row. Use the next highest ID in the table plus one. A retired item still reserves its BF or US ID.

decisions.md records only what the user approved: each change request, and each critical decision
the user made. A row is appended once the user has approved what it records. A decision the agent
took, an approval-free change and a finding it dropped append no row; the final report lists the
decisions the agent took.

A change request is a decision row whose Content begins Change request: and names the paths or IDs
it changes. Its Approach names the operation and target BF or US, the source as
discussion-<id>#REQ-NNNN when there is one or the actual source path or user requirement otherwise,
the intended files and rationale with the change classification Primary and Tags, and who approved
it, when, and the option chosen. The row starts at WIP and moves to DONE once every change it names
is written. A declined change appends no row. Retiring a story removes its directory under the
change request that names it, with no separate retired-story file.

An existing row at REJECTED is a rejected option. Open questions use OQ-NNNN rows; DEFERRED needs a
specific future decision point. An unanswered critical product decision is an open-questions.md row
whose Content opens Unadjudicated:, at TODO until decided. A justified test exception opens a
decision Content with Test exception:, names the exact BF, AC, or EX it exempts, and puts the reason
in Approach. It takes effect only at DONE; it never exempts descendant items.

## Approval and no-question mode

Use the shared user-question protocol for CREATE, DELETE, SPLIT, MERGE, SUPERSEDE, and UPDATE:REMOVE. Present the target and rationale. Do not self-approve. In --auto, ask no question, append no row, stop before the dependent writes, and report every pending operation with its target. Approval-free changes may proceed only if they do not depend on a pending operation.

Clarifications follow the constitution's question budget. Approval questions are decisions, so they do not consume that clarification budget. A pre-triage answer to continue is not approval for an operation not yet classified.

### A change to the story tree

A story-tree or contract file changes only on the user's approval:

1. Show the user the files the stage would change and the proposed change, and
   change nothing until the user answers.
2. On approval, write the change and append one `decisions.md` row whose Content
   opens `Change request:` and names every story-tree and contract file it
   changed, and `decisions.md` when it appended any other row. Its Approach
   records who approved it, when, and the label of the option chosen.
3. Move the row to DONE once every change it names is written.

A row present before the stage started keeps its ID, Content and Approach.
Only a row this stage appended changes its Status.

## ID allocation

Read all IDs of the kind in the relevant scope, including IDs named by retirement rows. The next ID is the highest plus one. BF spans the project. US is inside its BF. AC and EX are inside their US.
A contract number spans every contract kind, and a BR is numbered inside its contract. DEC and OQ each span their table.
Empty numeric scopes begin at 0001, and AC/EX tails begin at 01. Do not reuse an ID because its file was removed or a row was rejected.

A move to another BF changes the story's US ID and all child AC and EX IDs. Record the old IDs as retired, allocate new IDs in the destination scope, and update every citation before the move is complete.

## Completion of triage

Every requirement has a target, an approved or approval-free operation, and a recorded impact path. Every product ambiguity has an OQ. The next stage may write only the approved scope. A rejected option stays excluded until an explicit reopening decision is appended.
