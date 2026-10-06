# SDD Triage

Triage selects the smallest story-tree change that answers each incoming requirement. The source may be the discussion pack selected by preflight, an imported specification, or the user's explicit requirement. Treat the pack as reference material and resolve a conflict in an SDD-owned artifact.

## Inputs

- The selected source and its requirement IDs, if present.
- Existing 01_policy/, 02_business-flow/, 03_contract/, decisions.md, and open-questions.md.
- .qfai/assistant/rule/change-classification.md for Primary and Tags.
- .qfai/assistant/rule/drift-protocol.md for rejected options and approved change requests.

Read the flow and story indexes plus concrete files. A subject match alone is insufficient: verify that the existing flow's purpose and observable outcomes can express the requirement.

## Operation choice

Choose one primary operation for each affected BF or US. UPDATE is the default when the existing item keeps its identity
and purpose. Its sub-operation is written UPDATE:APPEND, UPDATE:MODIFY, or UPDATE:REMOVE. CREATE is used when no existing item represents the new
outcome. DELETE, SPLIT, MERGE, and SUPERSEDE change identity or scope and require explicit approval. UPDATE:REMOVE also
requires approval. A supporting contract update is named in the same decision's Approach or in a linked row; it is not a
second fictional flow.

Inspect the impact cascade: policy → BF → US → AC → EX → enforcing contract, then every other flow or contract that cites the changed item. Record companion changes. A shared BR remains in its authoritative contract, and no other contract cites it.

## Decision and question rows

Use <paths.specsDir>/decisions.md and <paths.specsDir>/open-questions.md, each with exactly ID, Content, Approach, Status. Append a row; later only Status may change, including to `PARTLY SUPERSEDED (by DEC-NNNN)` when a later row narrows a decision without replacing it.
Do not edit the first three cells or remove the row. Use the next highest ID in the table plus one. A retired item still reserves its BF or US ID.

decisions.md records only what the user decided: each change request the user approved or declined,
and each critical decision the user made. A row is appended once the user has decided what it records.
A decision the agent took, an approval-free change and a finding it dropped append no row; the final report lists the
decisions the agent took.

A decision row's Approach takes the form stated at the top of `templates/spec/decisions.md`. What this file asks an Approach to state goes inside that form.

A change request is a decision row whose Content begins Change request: and names the
repository-relative paths it changes; an ID there authorizes nothing. Its Approach names the operation and target BF or US, the source as
discussion-<id>#REQ-NNNN when there is one or the actual source path or user requirement otherwise,
the intended files and rationale with the change classification Primary and Tags, and who approved
it, when, and the option chosen. The row starts at WIP and moves to DONE once every change it names
is written. A declined change request is appended at REJECTED, recording in Approach who declined
it and when; it authorizes no edit. Retiring a story removes its directory under the
change request that names it, with no separate retired-story file.

An existing row at REJECTED is a rejected option. Open questions use OQ-NNNN rows; DEFERRED needs a
specific future decision point. An unanswered critical product decision is an open-questions.md row
whose Content opens Unadjudicated:, at TODO until decided. A justified test exception opens a
decision Content with Test exception:, names the exact BF, AC, or EX it exempts, and puts the reason
in Approach. It takes effect only at DONE; it never exempts descendant items.

## Approval and no-question mode

Use the shared user-question protocol for CREATE, DELETE, SPLIT, MERGE, SUPERSEDE, and UPDATE:REMOVE. Present the target and rationale. Do not self-approve. A request from the user in the session that names the operation and its effect is the approval, and no second question is asked.
In --auto, ask no question: append one `open-questions.md` row per pending operation naming it and its target, at TODO with its Content opening Unadjudicated:; stop before the dependent writes, and report every pending operation with its target as open.
Approval-free changes may proceed only if they do not depend on a pending operation.

Clarifications follow the constitution's question budget. Approval questions are decisions, so they do not consume that clarification budget. A pre-triage answer to continue is not approval for an operation not yet classified.

### A change to the story tree

A story-tree or contract file changes only on the user's approval:

1. Show the user the files the stage would change and the proposed change, and
   change nothing until the user answers. A request from the user in the
   session that names the change and its effect is that answer: the stage lists
   the files in its announcement, asks no second question, and records the
   request as the option chosen.
2. On approval, write the change and append one `decisions.md` row whose Content
   opens `Change request:` and names every story-tree and contract file it
   changed, and `decisions.md` when it appended any other row. Its Approach
   records who approved it, when, and the label of the option chosen.
3. Move the row to DONE once every change it names is written.

A row present before the stage started keeps its ID, Content and Approach.
Only a row this stage appended changes its Status.

## Retiring an EX, AC or BR

A retirement touches every place the ID is written. Do all of them in one change:

1. Get the user's approval of the UPDATE:REMOVE and append its `Change request:` decision row, whose Content names every retired ID.
2. Delete the EX row from 03_Example.md, the AC scenario from 02_Acceptance-Criteria.md, or the BR row from its contract.
3. Remove a retired EX from the Examples cell of every BR that cites it. A BR left with no example gets another example or is retired in the same row.
4. Remove each QFAI:EX annotation of a retired EX from the tests, or point it at the example the test now proves.
5. An AC left with no example gets one or is retired in the same row.
6. Retiring an AC also retires each EX whose AC-Ref names it, or moves that EX to another AC of the story by changing its AC-Ref, then applies steps 3 and 4 to each EX retired. Remove each QFAI:AC annotation of the retired AC from the tests, or point it at the AC the test now proves.
7. Never reuse a retired ID. The decision row keeps it counted.

`npx qfai validate` reports what steps 3 to 6 left behind: a BR citing an unknown example (`QFAI-STORY-005`), a test annotation naming an undeclared ID (`QFAI-STORY-008`), and an AC with no example or an EX with an invalid AC-Ref (`QFAI-STORY-004`).

## ID allocation

Read all IDs of the kind in the relevant scope, including IDs named by retirement rows. The next ID is the highest plus one. A project that also counts the IDs its open pull requests add takes the highest across the tree and those pull requests, so a gap above the tree's own highest is allowed. BF spans the project. US is inside its BF. AC and EX are inside their US.
A contract number spans every contract kind, and a BR is numbered inside its contract. DEC and OQ each span their table.
Empty numeric scopes begin at 0001, and AC/EX tails begin at 01. Do not reuse an ID because its file was removed or a row was rejected.

Two branches can take the same next ID. When a merge leaves one ID on two items:

1. The merge target's item keeps the ID. Renumber the incoming item, the one the merge brings in.
2. Give it the next ID of its scope.
   A renumbered BF or US takes its child IDs and its directory names with it, as a move to another BF does below.
3. Change every citation of the old ID in the same commit.
4. State the old ID, the new ID and the renamed record's subject or path in the commit message.
   A citation of the old ID elsewhere is then told apart from the item that kept it.

A `decisions.md` or `open-questions.md` row already on the target keeps its ID, Content and Approach.
A row the incoming branch added takes the next ID of its table.
An ID that two merged records already share is not renumbered:
ask the user for a change request row that states which record each citation meant.

A move to another BF changes the story's US ID and all child AC and EX IDs. Record the old IDs as retired, allocate new IDs in the destination scope, and update every citation before the move is complete.

## Completion of triage

Every requirement has a target, an approved or approval-free operation, and a recorded impact path. Every product ambiguity has an OQ. The next stage may write only the approved scope. A rejected option stays excluded until an explicit reopening decision is appended.
