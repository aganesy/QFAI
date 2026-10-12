# SDD Triage

Triage selects the smallest story-tree change that answers each incoming requirement. The source may be the discussion pack selected by preflight, an imported specification, or the user's explicit requirement. Treat the pack as reference material and resolve a conflict in an SDD-owned artifact.

## Contents

- Inputs
- Operation choice
- Decision and question rows
- Published decision prefix recovery
- Approval and no-question mode
- Retiring an EX, AC or BR
- ID allocation
- Completion of triage

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
Do not edit the first three cells or remove the row, except for explicit branch-added decision renumbering under ID allocation below or the bounded published decision prefix recovery below. Inherited rows retain those cells. Use the next highest ID in the table plus one; for DEC, include every listed page and the root tail. A retired item still reserves its BF or US ID.

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

A test annotation may remain pending only when authority to change the
specification covers that state and the test deferral is approved. Record the
specification change in its own `Change request:` row. Record the deferral as a
`Test exception:` decision naming the exact AC at DONE. Its Approach states
the reason, untested scope, owner, next decision date and condition for restoring
the annotation.

DONE establishes the exception decision; it does not mean test completion.
The existing info finding names the exempted AC and its decision without
claiming test execution or coverage. The exception never exempts descendant EX
obligations or authorizes changes to EX or BR scope. Do not silently substitute
an EX or prose rewrite for an approved specification change. Use the next
decision date for manual review; there is no automatic expiry and no automatic
warning.

When specification changes are forbidden or either authority is missing, first
append an `Unadjudicated:` OQ at TODO. Name the affected IDs, expected versus
actual behavior, implementation-change evidence, owner and required permission.
Stop dependent AC, EX and BR edits; independent authorized work may continue.

### Decision pages

The root may have one optional `## Decision pages` section before its unique
`## Decisions` section. Its body holds only unique direct
`- decisions/page-NNNN.md` entries with four digits; links, annotations, nested
paths, traversal and unrelated prose are invalid. A page has `# Decisions`,
one `## Decisions` section and one closed ID, Content, Approach, Status table.
It has no page index or other section. The root retains its own four-column table.

Read pages in list order, followed by the root table. This is one logical
register: ID allocation, duplicate detection, retirement references and Status
permissions include every row. Append new rows only to the root table.
A root without a page list remains a valid legacy register and is read in full.
Read errors or an incomplete inventory stop permission and allocation decisions.

Each physical root and page has at most 500 lines, including comments, blanks,
the index and table wrappers. Oversized files are reported without truncation.
Every entry in the decisions directory must be a listed direct page. Register
paths must be regular directories and files, without symbolic or hard links.
A formatter exclusion preserves reviewed bytes; it does not waive validation.
Use consumers that support the complete register before adopting pages; older
consumers are not assumed to read them.

Physical relocation needs a separately adopted execution change request and a
reviewed raw-byte receipt for the exact source and target. Preserve every raw
row occurrence, cell, Status, order and line ending; keep the current root tail.
A historical DONE row is not approval to run a later relocation. Do not rotate
automatically, repair Status, remove duplicates or normalize inherited cells.
A read-only proposal or a migration projection grants no permission to write.

## Published decision prefix recovery

When an approved request names a published malformed decision added by the
branch, read `.qfai/assistant/rule/drift-protocol.md#published-decision-prefix-recovery`.
That rule defines the source, byte boundaries, exact prefix and stop conditions.
Approval of the generic protocol alone authorizes no target; append a separate
new target-specific recovery change request using `templates/change-request.md`.

Record the fixed base and unique common ancestor, absence of the target in both,
the published source commit's ancestry, raw Approach digests and the exact
approved prefix. Immediately before writing, recheck the unique current row,
its original ID, Content and Status, and its old digest. Preserve every original
Approach byte as the suffix and leave every other row unchanged. Recheck the
existing form and validation; status or supersession clears no malformed form.
Record actual results, including any stopped recovery, without claiming an
automatic repair. Inherited records and open-question rows remain excluded.
Rollback follows the recorded new-digest check and restores the original form
failure; it never resets, amends or force pushes.

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

A row present before the stage started keeps its ID, Content and Approach, except for explicit branch-added decision renumbering under ID allocation below or published decision prefix recovery above. Inherited rows keep those cells without exception.
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
A contract number spans every contract kind, and a BR is numbered inside its contract. DEC spans the complete ordered decision register; OQ spans its own table.
Empty numeric scopes begin at 0001, and AC/EX tails begin at 01. Do not reuse an ID because its file was removed or a row was rejected.

### Capacity before writing

AC and EX tails stay two digits, from 01 through 99. Before writing a planned
batch, report each affected kind and story, its high-water number H (0 when
empty), remaining capacity 99-H and the number of requested additions. Count
valid IDs in the tree and the complete decision register, including retired IDs, plus observed
published parallel heads and known reservations under the project's existing
method. Name the fixed observation and what it did not cover. A snapshot
reserves nothing and cannot cover unpublished concurrent work.

If requested additions exceed 99-H, stop before any partial allocation or
invalid declaration. Never fill gaps, reuse retired IDs or emit tail 100.
An empty scope has capacity 99. H = 98 allows one addition at tail 99, not two;
a retired 99 still exhausts the scope. Recheck newly published claims or
collisions before publication.

### Capacity partition

Only additions exceeding an actual AC or EX scope's remaining 99-H qualify for
a capacity-only story partition. Record the source story, affected kind, H,
remainder and requested count first. Prefer leaving every published case and ID
in place and putting a cohesive incoming group in a capacity-checked sibling
under the same BF and actual actor goal. An in-force owning change request must
explicitly approve this partition and its affected paths before writing.

State the sibling's truthful cohesive scope and settle each criterion's owner;
do not invent a new product outcome, duplicate an obligation or weaken it.
A different actor, goal, flow or intended behavior needs its existing owning
approval path. Additions that fit the original scope do not qualify. Missing
authority, insufficient destination capacity or no truthful partition stops
the dependent write. This prospective split places new overflow cases; moving
an existing case also needs the complete map below. These instructions approve
no future specific creation, move or split.

### Actual moves and incoming collisions

Before an approved actual AC/EX move or incoming collision repair, make a
complete one-to-one map of:

- the fixed source commit and declaration path;
- each original BF/US/AC/EX identity and its case meaning;
- destination story, AC/EX IDs and paths;
- every affected active BR citation and counted adjacent test declaration;
- unaffected cases and the input, expected outcome and executable assertion
  each mapped case preserves.

Check both scopes' retired-inclusive capacity. Each destination EX needs one
existing destination AC; each AC needs an EX. Preserve every moved EX's
owning BR link and counted test obligation. An ID change alone proves no
coverage. Retire old moved IDs in a new approved record and never refill them.
Inherited published DEC ID, Content and Approach cells and their old-ID
references remain historical and unchanged; update only approved active
references.

Keep unaffected published cases and IDs. Identify same-number branch cases by
fixed provenance and meaning, and change only the provably incoming item,
without blanket replacement. Unknown ownership, ambiguous collisions,
uncovered declarations, missing counted test links, changed assertions or an
incomplete map stops the move without a completion claim. This is a manual
approval and mapping procedure, not a relocation executor or mapping schema.

Two branches can take the same next ID. When a merge leaves one ID on two items:

1. The merge target's item keeps the ID. Renumber the incoming item, the one the merge brings in.
2. Give it the next ID of its scope.
   A renumbered BF or US takes its child IDs and its directory names with it, as a move to another BF does below.
3. Change every citation belonging to the incoming item in the same commit.
   For a decision, leave inherited references unchanged.
4. State the old ID, the new ID and the renamed record's subject or path in the commit message.
   A citation of the old ID elsewhere is then told apart from the item that kept it.

A `decisions.md` or `open-questions.md` row already on the target keeps its ID, Content and Approach.
A row the incoming branch added takes the next ID of its table.
An ID that two merged records already share is not renumbered:
ask the user for a change request row that states which record each citation meant.

For a unique decision added by the incoming branch, repair its ID before merging:

```text
qfai sdd renumber-decision --from <old-DEC-ID> --to <new-DEC-ID> --base <local-ref>
```

The explicit base and HEAD must resolve locally and have one common ancestor
that declares no source row. The base may already use that ID; the current
tree must declare it only once. Choose an unused destination above both story trees'
highest decision number, retired IDs included, within the four-digit grammar.
The command reserves no number and chooses no final number automatically.

Read the preview's fixed SHAs, IDs, relative paths and replacement lines or
counts. It writes nothing and dumps no original lines or full files. Each
invocation builds its own plan. Run with `--apply` to recheck that invocation's
fixed refs and original bytes before writing; changed refs after a preview can
produce a different plan. Preflight-only
`--format`, `--fail-on`, `--import` and `--assume` are not accepted here.
Only provably branch-added exact references change. Inherited references stay
fixed; ambiguous ownership, dirty or linked candidates, unsupported text or
failed reads stop the whole plan before writing. Unrelated links and dirty
files are not candidates. Apply rechecks original bytes before each write.
Rollback restores a changed file only if its bytes still match this invocation's
replacement, preserving concurrent changes and naming any unrestored path.
These checks guarantee neither atomic concurrency nor power-loss safety.

A move to another BF changes the story's US ID and all child AC and EX IDs. It follows the existing approval path, not the same-BF capacity exception. Apply the complete map above to approved active citations and retire old IDs in a new approved record; inherited DEC cells and their historical references stay unchanged.

## Completion of triage

Every requirement has a target, an approved or approval-free operation, and a recorded impact path. Every product ambiguity has an OQ. The next stage may write only the approved scope. A rejected option stays excluded until an explicit reopening decision is appended.
