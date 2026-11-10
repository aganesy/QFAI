# Drift Protocol

This rule governs changes discovered after a specification or contract has been approved.

## Decision-register pages

Read listed decision pages in list order, followed by the root table, before
interpreting a request. A page row follows the same rules as a root row. New
rows are appended only to the root table, which has no line limit, and no row
moves between files. A missing, unsafe or unreadable member stops the reading
of the register; a partial register settles nothing.

## Core rule

A downstream skill does not edit an approved specification, policy, contract, or QFAI-owned rule on its own authority. It records the discrepancy and returns the affected artifact to its owner. A discussion pack is discovery material; the story tree and contracts are the current specification.

Upstream artifacts include the policy and business-flow trees under paths.specsDir, decisions.md,
open-questions.md, and every file under paths.contractsDir. Production code and tests that implement an approved
obligation may change in a later task, but the change must preserve that obligation or change it through its owner.
QFAI-owned files under .qfai/assistant/rule/ are updated through the package, then synchronized by init.

A decisions.md row is never edited, moved or removed: a changed obligation needs a
new row, even when an older row discusses the same topic. An open-questions.md
row is never edited; it is deleted when a decision settles it, or replaced by a
new row when it is deferred.

## Allowed exceptions (minimal whitelist)

- A project may add a local overlay beside a shipped rule. The overlay adds project guidance; it does not repeal a shipped rule.
- An owner skill may change its own upstream artifact once any critical decision the change needs has been answered. It then checks dependent tests before completion.

These exceptions do not authorize a downstream stage to rewrite an upstream row or a vendored rule.

## Drift classes

Intent drift means an approved obligation should change. Record the current obligation, the proposed behavior, realistic
options, their costs, and the recommendation. Defect drift means an artifact contradicts itself or cannot perform its
declared behavior. Record a reproduction: the command and output, or the two conflicting artifact excerpts. A defect
with one sound repair needs one proposed repair, without invented alternatives.

Both classes use the same decision and owner-rerun path.

## When drift is detected

1. Stop work on the affected obligation and its dependents. Other flows continue. Name the affected BF, US, AC, EX, BR, and contract references where they exist, plus the code or tests that consume the disputed artifact. Do not claim a repository-wide stop without a repository-wide dependency.
2. Prepare the proposed change for the SDD owner: the affected repository-relative paths, the drift class,
   the evidence or reproduction, the proposed change, the impacted items, and the owner rerun.
3. Decide the change. A change that contradicts a specification, a contract or a recorded decision, that cannot
   be taken back, or that rests on product intent nothing written states is a critical decision: put it to the
   user and wait for the answer. The owner takes any other change itself and lists it with its reason in its
   report. A decision becomes a decisions.md row only when it is hard to reverse, would surprise a reader
   without context, and was the result of a real trade-off; the row takes the short form of the `qfai-sdd`
   decisions template, and an option the user rejects is a `Declined:` row. Otherwise the stage report states it.

   When the user cannot be asked, write no row to either table: report the proposed change as the decision still
   needed and keep the affected items stopped.

4. Rerun the owner skill against the affected artifact. The owner names the decision, the input revision, and whether it is confirming existing content or changing it.
   A contract with a contract ID, such as `API-0002`, is selected by its full ID; a contract without one is selected by its repository-relative path.
   The owner updates the specification and its tests together, then validates the relevant flow.
5. Recheck every dependent BF, AC, and EX test obligation and every affected contract reference. Rewrite tests where their former expectation is invalid. Report any uncovered obligation. No execution ledger, TC row, or status reset substitutes for this check.
   Cite the DEC ID, when a row was written, in the stage report. A second open change on the same artifact waits for the first outcome and is restated if its premise changed.

No step edits a decision row afterwards. The decision table has no Status or Applied at field, and no standalone change file exists. A decision alone does not certify a change as applied.

### Multiple open changes

Open changes have independent affected sets. Their union is the set of work paused. A later change against the same artifact names the earlier decision and the premise it assumes. Report outstanding changes and their age so unresolved decisions remain visible.

## Reviewer-originated obligations

### Defect or new scope: decide this first

A defect is demonstrable from the deliverable or an existing obligation: incorrect behavior, missing input validation, data loss, or a failing required quality gate. It is blocking with the concrete artifact and evidence as provenance.

No repository gate scans for a security or data-integrity defect. Review is that
class's detector: `.qfai/assistant/agent/implementation-reviewer.md` checks each
change for missing validation on an input the code already treats as trusted,
credential or personal-data exposure, and an injection or traversal path opened
by the change. A finding the reviewer demonstrates traces to `defect:security`
and blocks like the other blocking classes.

New scope adds product behavior or a quality bar the approved story tree and contracts do not require. A reviewer records it as advisory and sends it to the SDD owner. It becomes binding only after the owner records the decision and updates the relevant BF, AC, EX, BR, or contract. An advisory does not create a test assertion by itself.

### Provenance and routing

Every reviewer finding names either the governing AC, BR, or full contract ID, a shared rule, a concrete deliverable defect,
a record defect, or new scope. Use full contract IDs, including every numeric segment. Do not shorten API, DB,
or UI references. A finding against a record names the record and stays advisory when the product and its evidence
remain sound. A false claim that work ran, or that a reviewer independently checked it, is an evidence defect and
remains blocking.

A finding that changes an approved obligation follows When drift is detected. An unrelated new question goes to open-questions.md through the SDD owner.

### The record-defect queue

A stage may classify a finding as a record defect only when its completion contract names a queue and requires it to be
drained. The reviewer records the incorrect statement and the artifact that proves what happened. The session agent
places it in the queue the stage names. Repair the record to match the run. If the run cannot be reconstructed honestly, treat the finding as a
blocking evidence defect. Completion waits for the queue to drain.

## Line endings in the artifacts under review

QFAI seeds `.gitattributes` for its .qfai tree and named integration files.
Review branch changes with the same comparison base and line-ending treatment
as the drift gate. Use `git diff --ignore-cr-at-eol` to distinguish an EOL-only
diff from changed content. When attributes change, apply `git add --renormalize`
only to reviewed paths. Content hashes read on-disk bytes, so normalize a CRLF
copy of a locked file before deciding its lock is wrong.

## Non-negotiable constraints

- Downstream stages do not patch upstream artifacts: the owner changes them as When drift is detected says.
  QFAI-DRIFT-003 is a warning that nothing was compared, because baseBranch does not resolve.
- An existing decisions.md row is never edited, moved or removed, and an existing open-questions.md row is never edited; new content is appended as a new row. The drift profile compares the base and the branch by row ID, on the three cells, so the order of rows means nothing.
- Vendored assistant rules are changed in the package and synchronized into projects by `npx qfai init --force`, which overwrites a local edit. A project rule lives in a `*.local.md` overlay beside the vendored one.
- When a critical decision cannot be put to the user, keep the affected items stopped and report the decision needed. Continue unrelated work.
