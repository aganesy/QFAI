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

- A stage may write evidence and reports in the locations its completion contract names. Such a write does not change an approved requirement.
- A project may add a local overlay beside a shipped rule. The overlay adds project guidance; it does not repeal a shipped rule.
- An owner skill may change its own upstream artifact after the required approval has been recorded. It then checks dependent tests and evidence before completion.
- The envelope-deviation writer may create its JSON record under .qfai/evidence/decision/. That record captures an operator answer; it does not itself authorize a protected file change.

These exceptions do not authorize a downstream stage to rewrite an upstream row or a vendored rule.

## Drift classes

Intent drift means an approved obligation should change. Record the current obligation, the proposed behavior, realistic
options, their costs, and the recommendation. Defect drift means an artifact contradicts itself or cannot perform its
declared behavior. Record a reproduction: the command and output, or the two conflicting artifact excerpts. A defect
with one sound repair needs one proposed repair, without invented alternatives.

Both classes use the same approval and owner-rerun path.

## When drift is detected

1. Stop work on the affected obligation and its dependents. Other flows continue. Name the affected BF, US, AC, EX, BR, and contract references where they exist, plus the code or tests that consume the disputed artifact. Do not claim a repository-wide stop without a repository-wide dependency.
2. Ask the SDD owner to append one DEC-NNNN row to decisions.md under paths.specsDir. Its four columns are ID, Content,
   Approach, and Status. Content starts with Change request: followed by the affected repository-relative paths or IDs,
   separated by commas. Approach records the drift class, evidence or reproduction, proposed change, impacted items,
   approval needed, and owner rerun. A pending request has Status TODO. The row may be written without prior
   authorization; the change to the protected artifact may not.
3. Obtain the operator's explicit answer. Record its provenance in the stage evidence and move the pending row to WIP
   only when the proposed change and affected set are approved as written. If the answer changes either, append a
   replacement row and mark the earlier row SUPERSEDED (by DEC-NNNN). A declined request becomes REJECTED. A WIP or DONE
   Change request: row is the in-force authorization that the drift gate reads; TODO is not authorization.
4. Rerun the owner skill against the affected artifact. The owner names the approved decision row, the input revision, and whether it is confirming existing content or changing it. A contract with a CON ID is selected by its full ID; a contract without one is selected by its repository-relative path. The owner updates the specification and its tests together, then validates the relevant flow.
5. Recheck every dependent BF, AC, and EX test obligation and every affected contract reference. Rewrite tests and evidence where their former expectation is invalid. Report any uncovered obligation. No execution ledger, TC row, or status reset substitutes for this check.
6. Complete the decision row by changing Status from WIP to DONE only after the owner artifact and dependent checks are complete. Record immutable completion evidence in the stage evidence file and cite the DEC ID. A second open request on the same artifact waits for the first outcome and is restated if its premise changed.

The decision table has no separate Applied at field and no standalone CR file. Approval alone does not certify a change as applied.

### Multiple open change requests

Open requests have independent affected sets. Their union is the set of work paused. A later request against the same artifact names the earlier DEC ID and the premise it assumes. Report outstanding requests and their age so unresolved decisions remain visible.

## Reviewer-originated obligations

### Defect or new scope: decide this first

A defect is demonstrable from the deliverable or an existing obligation: incorrect behavior, missing input validation, data loss, or a failing required quality gate. It is blocking with the concrete artifact and evidence as provenance.

New scope adds product behavior or a quality bar the approved story tree and contracts do not require. A reviewer records it as advisory and sends it to the SDD owner. It becomes binding only after the owner records the decision and updates the relevant BF, AC, EX, BR, or contract. An advisory does not create a test assertion by itself.

### Provenance and routing

Every reviewer finding names either the governing AC, BR, or full CON ID, a shared rule, a concrete deliverable defect,
a record defect, or new scope. Use full contract IDs, including every numeric segment. Do not shorten CON-API, CON-DB,
or CON-UI references. A finding against a record names the record and stays advisory when the product and its evidence
remain sound. A false claim that work ran, or that a reviewer independently checked it, is an evidence defect and
remains blocking.

A finding that changes an approved obligation follows When drift is detected. An unrelated new question goes to open-questions.md through the SDD owner.

### The record-defect queue

A stage may classify a finding as a record defect only when its completion contract names a queue and requires it to be
drained. The reviewer records the incorrect statement and the artifact that proves what happened. The orchestrator
places it in the queue the stage names. Repair the record to match the run; re-attest any reviewed bytes in a new sealed
review pack, leaving the earlier pack intact. If the run cannot be reconstructed honestly, treat the finding as a
blocking evidence defect. Completion waits for the queue to drain.

## Which evidence is committed

Commit durable decision rows, envelope-deviation records under .qfai/evidence/decision/, and the evidence files a stage's completion contract requires on a fresh clone. Run logs and reports that can be reproduced may remain ignored. A gitignore negation makes a path visible to Git; the owner still stages and commits the evidence.

## Line endings in the artifacts under review

QFAI seeds attributes for its .qfai tree and named integration files. Review branch changes with the same comparison base and line-ending treatment as the drift gate. An EOL-only diff does not establish changed behavior. Content hashes read on-disk bytes, so normalize a CRLF copy of a locked file before deciding its lock is wrong.

## Non-negotiable constraints

- Downstream stages do not patch protected upstream artifacts before an in-force Change request: decision row authorizes the path. The drift profile compares the branch against baseBranch and reports QFAI-DRIFT-001 for an unapproved protected change. The SDD owner may create the request row itself without a prior row.
- Existing decisions.md and open-questions.md rows retain their ID, Content, and Approach. A former row may change Status; new content is appended as a new row.
- Vendored assistant rules are changed in the package and synchronized into projects. A local edit that diverges from its provenance record is reported by the assistant asset gate.
- When approval is unavailable, keep the affected items stopped and report the decision needed. Continue unrelated work.
