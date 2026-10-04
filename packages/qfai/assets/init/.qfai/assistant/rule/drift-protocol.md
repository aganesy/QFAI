# Drift Protocol

This rule governs changes discovered after a specification or contract has been approved.

## Core rule

A downstream skill does not edit an approved specification, policy, contract, or QFAI-owned rule on its own authority. It records the discrepancy and returns the affected artifact to its owner. A discussion pack is discovery material; the story tree and contracts are the current specification.

Protected project artifacts include the policy and business-flow trees under paths.specsDir, decisions.md,
open-questions.md, and every file under paths.contractsDir. Production code and tests that implement an approved
obligation may change in a later task, but the change must preserve or deliberately reapprove that obligation.
QFAI-owned files under .qfai/assistant/rule/ are updated through the package, then synchronized by init.

A new change-request row in decisions.md is permitted without an earlier change request. Existing rows are append-only records: a prior row may change its Status cell, while its ID, Content, and Approach stay fixed. A changed obligation needs a new row, even when an older row discusses the same topic.

## Allowed exceptions (minimal whitelist)

- A project may add a local overlay beside a shipped rule. The overlay adds project guidance; it does not repeal a shipped rule.
- An owner skill may change its own upstream artifact after the required approval has been recorded. It then checks dependent tests before completion.

These exceptions do not authorize a downstream stage to rewrite an upstream row or a vendored rule.

A change that touches no protected file needs no change request. A bugfix whose
diff changes no file under `01_policy/`, `02_business-flow/` or
paths.contractsDir appends no `Change request:` row. A row naming a story file
the bugfix did not touch would state an upstream change that did not happen.

## Drift classes

Intent drift means an approved obligation should change. Record the current obligation, the proposed behavior, realistic
options, their costs, and the recommendation. Defect drift means an artifact contradicts itself or cannot perform its
declared behavior. Record a reproduction: the command and output, or the two conflicting artifact excerpts. A defect
with one sound repair needs one proposed repair, without invented alternatives.

Both classes use the same approval and owner-rerun path.

## When drift is detected

1. Stop work on the affected obligation and its dependents. Other flows continue. Name the affected BF, US, AC, EX, BR, and contract references where they exist, plus the code or tests that consume the disputed artifact. Do not claim a repository-wide stop without a repository-wide dependency.
2. Prepare the change request for the SDD owner: the affected repository-relative paths, the drift class,
   the evidence or reproduction, the proposed change, the impacted items, and the owner rerun.
3. Obtain the user's explicit answer. Only on approval does the SDD owner append one DEC-NNNN row to decisions.md under
   paths.specsDir. Its four columns are ID, Content, Approach, and Status. Content starts with Change request: followed
   by the affected repository-relative paths, separated by commas. Only a path authorizes an edit; an ID written there
   authorizes nothing. Approach records the proposed change and who approved it, when,
   and the option chosen. The row starts at WIP. A declined request is appended at REJECTED, recording who declined it and when;
   it authorizes no edit, and the artifact stays as it is.
   When the user cannot be asked, write no row to either table: report the proposed change as the decision still
   needed and keep the affected items stopped. A WIP Change request: row is the in-force authorization that the drift gate reads.
   TODO is not authorization. A DONE row authorizes only on the branch that appended it or moved it from WIP. A DONE
   row the base already holds records a change already applied, so a later edit to the same path needs a row of its own.
4. Rerun the owner skill against the affected artifact. The owner names the approved decision row, the input revision, and whether it is confirming existing content or changing it.
   A contract with a contract ID, such as `API-0002`, is selected by its full ID; a contract without one is selected by its repository-relative path.
   The owner updates the specification and its tests together, then validates the relevant flow.
5. Recheck every dependent BF, AC, and EX test obligation and every affected contract reference. Rewrite tests where their former expectation is invalid. Report any uncovered obligation. No execution ledger, TC row, or status reset substitutes for this check.
6. Complete the decision row by changing Status from WIP to DONE only after the owner artifact and dependent checks are complete. Cite the DEC ID in the stage report. A second open request on the same artifact waits for the first outcome and is restated if its premise changed.

The decision table has no separate Applied at field and no standalone CR file. Approval alone does not certify a change as applied.

### Multiple open change requests

Open requests have independent affected sets. Their union is the set of work paused. A later request against the same artifact names the earlier DEC ID and the premise it assumes. Report outstanding requests and their age so unresolved decisions remain visible.

## Reviewer-originated obligations

### Defect or new scope: decide this first

A defect is demonstrable from the deliverable or an existing obligation: incorrect behavior, missing input validation, data loss, or a failing required quality gate. It is blocking with the concrete artifact and evidence as provenance.

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
drained. The reviewer records the incorrect statement and the artifact that proves what happened. The orchestrator
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

- Downstream stages do not patch protected upstream artifacts before an in-force Change request: decision row authorizes the path. The drift profile compares the branch against baseBranch and reports QFAI-DRIFT-001 for an unapproved protected change. The SDD owner may create the request row itself without a prior row.
- Existing decisions.md and open-questions.md rows retain their ID, Content, and Approach. A former row may change Status; new content is appended as a new row.
- Vendored assistant rules are changed in the package and synchronized into projects by `npx qfai init --force`, which overwrites a local edit. A project rule lives in a `*.local.md` overlay beside the vendored one.
- When approval is unavailable, keep the affected items stopped and report the decision needed. Continue unrelated work.
