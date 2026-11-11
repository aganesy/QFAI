# SDD Triage

Triage selects the smallest story-tree change that answers each incoming requirement. The source may be the discussion pack selected by preflight, an imported specification, or the user's explicit requirement. Treat the pack as reference material and resolve a conflict in an SDD-owned artifact.

## Contents

- Inputs
- Operation choice
- Decision and question rows
- Where a decision's result lives
- Critical decisions and no-question mode
- Retiring an EX, AC or BR
- ID allocation
- Conflicted story-tree documents
- Completion of triage

## Inputs

- The selected source and its requirement IDs, if present.
- Existing 01_policy/, 02_business-flow/, 03_contract/, decisions.md, and open-questions.md.
- .qfai/assistant/rule/change-classification.md for Primary and Tags.
- .qfai/assistant/rule/drift-protocol.md for rejected options and critical decisions.

Read the flow and story indexes plus concrete files. A subject match alone is insufficient: verify that the existing flow's purpose and observable outcomes can express the requirement.

## Operation choice

Choose one primary operation for each affected BF or US. UPDATE is the default when the existing item keeps its identity
and purpose. Its sub-operation is written UPDATE:APPEND, UPDATE:MODIFY, or UPDATE:REMOVE. CREATE is used when no existing item represents the new
outcome. DELETE, SPLIT, MERGE, and SUPERSEDE change identity or scope, and UPDATE:MODIFY and UPDATE:REMOVE change what
an existing item states: each is a critical decision, as Critical decisions and no-question mode says. A supporting contract update is named in the same decision's Approach or in a linked row; it is not a
second fictional flow.

Inspect the impact cascade: policy → BF → US → AC → EX → enforcing contract, then every other flow or contract that cites the changed item. Record companion changes. A shared BR remains in its authoritative contract, and no other contract cites it.

## Decision and question rows

Use <paths.specsDir>/decisions.md and <paths.specsDir>/open-questions.md, each with exactly ID, Content and Approach.
A new decisions.md row takes `DEC-yyyymmddhhMMss` and a new open-questions.md row `OQ-yyyymmddhhMMss`: the UTC
time the row is written, as 14 digits. When a row of the same register already holds that second, take the next
second no row holds. A legacy `DEC-NNNN` or `OQ-NNNN` row keeps its ID; a row the branch adds never takes that form.

A decisions.md row is appended once the decision is made and afterwards keeps its ID and is never removed or renumbered; only its wording may be restated. A
later decision that refers to an earlier row is a new row whose Approach opens with the earlier ID:
`Supersedes DEC-…` when it replaces it, `Narrows DEC-…` when it replaces part of it, and `Reopens DEC-…` when it
reopens a declined option. The earlier row stays as written. The order of rows in the file means nothing: a merge
may interleave the rows two branches appended. The base and the head are compared by row ID, on the three cells.

decisions.md records only decisions the user made, approvals of critical decisions and releases included, that
pass the recording test at the top of `templates/spec/decisions.md`: hard to reverse, surprising to a reader without
context, and the result of a real trade-off. A row is appended once the user has decided what it records. A decision
the agent took, a decision that fails the test and a finding it dropped append no row; the final report states them.
Anything not decided yet is an open-questions.md row.

A decision row's Approach takes the form stated at the top of `templates/spec/decisions.md`. What this file asks an Approach to state goes inside that form. Validation checks that form only on a legacy `DEC-NNNN` row.

An option the user rejects is a row whose Content opens `Declined:`, whatever the recording test says,
recording in Approach who declined it and when; it authorizes nothing. Retiring a story removes its directory, with no separate retired-story file. A legacy
row opening `Change request:` or `Declined change request:` is history and authorizes nothing.

An open-questions.md row exists exactly while its question is open, and is never edited. When a decision settles
a question, the same change appends the decision row, which names the OQ ID, and deletes the question row. To
defer a question already written, delete its row and append a new question row whose Approach names the next
decision point and says `Replaces OQ-…` with the deleted ID. An unanswered critical product decision is an
open-questions.md row whose Content opens Unadjudicated:, pending while the row exists.

A justified test exception opens a decision Content with Test exception:, names the exact BF, AC, or EX it
exempts, and puts the reason in Approach. It holds while the row exists, and a decision row is never removed; it never
exempts descendant items.

A test annotation may remain pending only when the user approved the test
deferral. Record the deferral as a `Test exception:` decision naming the exact AC. Its Approach states
the reason, untested scope, owner, next decision date and condition for restoring
the annotation.

The row records the exception decision; it does not mean test completion.
The existing info finding names the exempted AC and its decision without
claiming test execution or coverage. The exception never exempts descendant EX
obligations or authorizes changes to EX or BR scope. Do not silently substitute
an EX or prose rewrite for the specification change. Use the next
decision date for manual review; there is no automatic expiry and no automatic
warning.

When specification changes are forbidden or the deferral is not approved, first
append an `Unadjudicated:` question row. Name the affected IDs, expected versus
actual behavior, implementation-change evidence, owner and required permission.
Stop dependent AC, EX and BR edits; independent authorized work may continue.

### Decision pages

The root may have one optional `## Decision pages` section before its unique
`## Decisions` section. Its body holds only unique direct
`- decisions/page-NNNN.md` entries with four digits; links, annotations, nested
paths, traversal and unrelated prose are invalid. A page has `# Decisions`,
one `## Decisions` section and one closed ID, Content, Approach table.
It has no page index or other section. The root retains its own three-column table.

Read pages in list order, followed by the root table. This is one
register: ID uniqueness, retirement references and the base-to-head comparison
include every row. Append new rows only to the root table, which has no line limit; never append a row to a
page. Never move a row between files. A root without a page list is read in full.
Read errors or an incomplete inventory stop allocation decisions.

Every entry in the decisions directory must be a listed direct page. Register
paths must be regular directories and files, without symbolic or hard links.
A formatter exclusion preserves reviewed bytes; it does not waive validation.

## Where a decision's result lives

Where a decision's result lives, write the current state only, and rewrite it in
place when the decision changes:

- No date, approver, quoted request or history: a decision row or the stage report holds those.
- One statement per concept, with at most one sentence of reason.
- `01_policy/` holds a result only when it binds more than one flow or the whole
  product.
- A non-functional requirement is a contract BR with a measurable threshold and
  an example. Only a product-wide one goes to `constraint.md`.
- A trivial edit adds no policy or constraint entry and no decision row.

## Critical decisions and no-question mode

Use the shared user-question protocol for each critical decision: CREATE, DELETE, SPLIT, MERGE, SUPERSEDE, and UPDATE:REMOVE,
an UPDATE:MODIFY that changes what an item existing before the stage states, and any other decision
`.qfai/assistant/rule/drift-protocol.md` calls critical. Present the target and rationale. Do not self-approve. A
request from the user in the session that names the operation and its effect is the answer, and no second question is
asked. Any other story-tree or contract change, such as an appended AC, EX or BR, the stage makes itself and lists in
its report.
In --auto, ask no question: append one `open-questions.md` row per pending operation naming it and its target, with its Content opening Unadjudicated:; stop before the dependent writes, and report every pending operation with its target as open.
Other changes may proceed only if they do not depend on a pending operation.

Clarifications follow the constitution's question budget. Critical-decision questions are decisions, so they do not consume that clarification budget. A pre-triage answer to continue is not an answer for an operation not yet classified.

A decisions.md row present before the stage started keeps its ID and its decision and is never removed, and an open-questions.md row is never edited.

## Retiring an EX, AC or BR

A retirement touches every place the ID is written. Do all of them in one change:

1. Put the UPDATE:REMOVE to the user as a critical decision, and add one `Retired: <ID>, <ID>…` row to `decisions.md` naming every retired ID.
2. Delete the EX row from 03_Example.md, the AC scenario from 02_Acceptance-Criteria.md, or the BR row from its contract.
3. Remove a retired EX from the Examples cell of every BR that cites it. A BR left with no example gets another example or is retired in the same row.
4. Remove each QFAI:EX annotation of a retired EX from the tests, or point it at the example the test now proves.
5. An AC left with no example gets one or is retired in the same row.
6. Retiring an AC also retires each EX whose AC-Ref names it, or moves that EX to another AC of the story by changing its AC-Ref, then applies steps 3 and 4 to each EX retired. Remove each QFAI:AC annotation of the retired AC from the tests, or point it at the AC the test now proves.
7. Never reuse a retired ID.

`npx qfai validate` reports what steps 3 to 6 left behind: a BR citing an unknown example (`QFAI-STORY-005`), a test annotation naming an undeclared ID (`QFAI-STORY-008`), and an AC with no example or an EX with an invalid AC-Ref (`QFAI-STORY-004`).

## ID allocation

Read all IDs of the kind in the relevant scope, including IDs named by decision rows, `Retired:` rows among them. The next ID is the highest plus one. BF spans the project. US is inside its BF. AC and EX are inside their US.
A contract number spans every contract kind, and a BR is numbered inside its contract.
Empty numeric scopes begin at 0001, and AC/EX tails begin at 01. Do not reuse an ID because its file was removed or a change was declined.
Take the number from `npx qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>` right before writing it: a US names its BF, an AC or EX its US, and a BR its contract.
It reads the working tree and the base ref's commit, a fetched ref such as `origin/main`, and prints the number after the highest of both, wherever a row sits. It writes nothing and does not see open pull requests.
A decisions.md or open-questions.md row takes its timestamp ID from the time it is written instead; no count and no other branch decides it.

Read the IDs open pull requests add before taking a BF, US, AC, EX or BR ID. Fetch the base. Where a forge CLI is available, list the open pull requests once per session through its REST API, for example `gh api repos/{owner}/{repo}/pulls?state=open`, and reuse that listing for every ID the session takes.
Fetch each one's head ref, such as `refs/pull/<n>/head`, so a pull request from a fork is read too, and read the IDs it adds from `git diff <base>...<head>`. Take the highest across the base, the working tree and those heads, plus one. Without a forge CLI, read the base alone.
When merging the base into the branch, check each such ID the branch adds against the merged base. The base's item keeps its ID; the branch renumbers its own item and every reference to it, then runs the gates again.

### Register conflicts

The shipped `.gitattributes` merges `decisions.md`, its pages and
`open-questions.md` with `merge=union`. A forge may still show a conflict in
them. Resolve it by merging the fetched base locally, `git merge origin/<base>`:
the union merge keeps both sides' rows. Push the merge. Renumber no row, and
edit or move none, except to delete again a question row the union merge kept
although one side deleted it, since that deletion settled the question.

Two rows left with one ID come only from two rows written in the same second,
and the duplicate-ID check names that ID. The row the base holds keeps it. The
branch deletes its own row, which the base does not yet hold, appends it again
under a new timestamp ID, and updates the citations of it that the branch
added.

### Capacity before writing

AC and EX tails stay two digits, from 01 through 99. Before writing a planned
batch, report each affected kind and story, its high-water number H (0 when
empty), remaining capacity 99-H and the number of requested additions. Count
valid IDs in the tree and decisions, including retired IDs, plus observed
published parallel heads and known reservations under the project's existing
method. Name the fixed observation and what it did not cover. A snapshot
reserves nothing and cannot cover unpublished concurrent work. Read decisions as
the complete register: every listed page and the root table.

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
under the same BF and actual actor goal. The partition is a critical decision: the user
answers it, with its affected paths, before writing.

State the sibling's truthful cohesive scope and settle each criterion's owner;
do not invent a new product outcome, duplicate an obligation or weaken it.
A different actor, goal, flow or intended behavior is its own critical
decision. Additions that fit the original scope do not qualify. A missing
decision, insufficient destination capacity or no truthful partition stops
the dependent write. This prospective split places new overflow cases; moving
an existing case also needs the complete map below. These instructions decide
no future specific creation, move or split.

### Actual moves and incoming collisions

Before an actual AC/EX move the user decided or incoming collision repair, make a
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
coverage. Name the old moved IDs in a `Retired:` row, and never refill them.
Inherited published DEC ID, Content and Approach cells and their old-ID
references remain historical and unchanged; update only the active
references the move covers.

Keep unaffected published cases and IDs. Identify same-number branch cases by
fixed provenance and meaning, and change only the provably incoming item,
without blanket replacement. Unknown ownership, ambiguous collisions,
uncovered declarations, missing counted test links, changed assertions or an
incomplete map stops the move without a completion claim. This is a manual
decision and mapping procedure, not a move executor or mapping schema.

Two branches can take the same next ID. When a merge leaves one ID on two items:

1. The base's item keeps the ID, whichever way the merge runs. Renumber the incoming item, the one the branch added.
2. Give it the next ID of its scope.
   A renumbered BF or US takes its child IDs and its directory names with it, as a move to another BF does below.
3. Change every citation belonging to the incoming item in the same commit.
   For a decision, leave inherited references unchanged.
4. State the old ID, the new ID and the renamed record's subject or path in the commit message.
   A citation of the old ID elsewhere is then told apart from the item that kept it.

A `decisions.md` or `open-questions.md` row already on the target keeps its ID, Content and Approach.
No register row is renumbered; [Register conflicts](#register-conflicts) covers them.
An ID that two merged records already share is not renumbered:
ask the user, as a critical decision, which record each citation meant.

A move to another BF changes the story's US ID and all child AC and EX IDs. It is a critical decision, not the same-BF capacity exception. Apply the complete map above to the active citations and name the old IDs in a `Retired:` row; inherited DEC cells and their historical references stay unchanged.

## Conflicted story-tree documents

When a merge leaves story-tree documents conflicted, run `npx qfai sdd merge-docs`
before resolving them by hand. It merges each unmerged document from the index by
table row, keyed by the first cell, and by sentence, so edits to different sentences
of one long row no longer conflict as a whole line. What it cannot settle stays
between conflict markers; it then reports the document-schema findings of the result.
A document already edited by hand, or by an earlier run, is left as it is.
Review the result and stage it with `git add`; it stages nothing itself.

## Completion of triage

Every requirement has a target, an operation the user decided or the agent took, and a recorded impact path. Every product ambiguity has an OQ. The next stage may write only the triaged scope. A rejected option stays excluded until a decision row whose Approach opens `Reopens DEC-…` is appended.

The one exception: a change to shipped seed or sample data whose values no
story, BR or contract sets changes no story-tree file. Triage states that in one
line of its report and passes with no operation and no decision row, and the
later sdd steps then have nothing to write.
