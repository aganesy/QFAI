# Drift Protocol

This rule governs changes discovered after a specification or contract has been approved.

## Core rule

A downstream skill does not edit an approved specification, policy, contract, or QFAI-owned rule on its own authority. It records the discrepancy and returns the affected artifact to its owner. A discussion pack is discovery material; the story tree and contracts are the current specification.

Protected project artifacts include the policy and business-flow trees under paths.specsDir, decisions.md,
open-questions.md, and every file under paths.contractsDir. Production code and tests that implement an approved
obligation may change in a later task, but the change must preserve or deliberately reapprove that obligation.
QFAI-owned files under .qfai/assistant/rule/ are updated through the package, then synchronized by init.

A new change-request row in decisions.md is permitted without an earlier change request.
Existing rows are append-only records: a prior row may change its Status cell,
while its ID, Content, and Approach stay fixed. The sole ID-change exception is
explicit local renumbering of a unique branch-added decision absent from the
unique common ancestor of HEAD and a required local base. That operation changes
only its ID and provably branch-added exact references. Inherited row cells and
references stay fixed. A changed obligation needs a new row, even when an older
row discusses the same topic.

The sole Approach-change exception is the published decision prefix recovery
below. It preserves the target's ID, Content, Status and complete original
Approach suffix. It excludes inherited rows and open-question rows.

The sole row-removal exception is the merge-added identical decision copy
recovery below. It removes only proven raw-identical surplus copies of a
decision and keeps one original. It excludes open-question rows.

## Allowed exceptions (minimal whitelist)

- A project may add a local overlay beside a shipped rule. The overlay adds project guidance; it does not repeal a shipped rule.
- An owner skill may change its own upstream artifact after the required approval has been recorded. It then checks dependent tests before completion.

These exceptions do not authorize a downstream stage to rewrite an upstream row or a vendored rule.

A change that touches no protected file needs no change request. A bugfix whose
diff changes no file under `01_policy/`, `02_business-flow/` or
paths.contractsDir appends no `Change request:` row. A row naming a story file
the bugfix did not touch would state an upstream change that did not happen.

## Published decision prefix recovery

The SDD owner may prepend only an approved Evidence/Grounds prefix to a
published malformed decision added by the branch. Approval of this protocol
does not authorize any target. First obtain a separate new in-force recovery
change request naming the target and its repository-relative file.

1. Fix the explicit base commit and its unique common ancestor with current
   HEAD. The target ID must be absent from both. The documented published
   source commit must be an ancestor of current HEAD and expose the unique
   original row. Inherited records and open-question rows are excluded.
2. Read the original raw cell bytes. The row must be single-line valid UTF-8,
   with exactly one ASCII padding space at each Approach delimiter and no
   additional boundary whitespace. Hash the stored Approach bytes with
   SHA-256, excluding only the delimiter pipes and those two padding spaces.
   Do not decode escapes, trim text or normalize it. Ambiguous boundaries,
   additional padding or invalid UTF-8 stop recovery.
3. Confirm the original Residual risk and Rollback items already satisfy the
   required ordered, nonempty form. The new Approach must be exactly
   `- Evidence: <actual file references> - Grounds: `, including its trailing
   space, followed by the complete original Approach as a byte-identical
   suffix. Preserve the original wording, order, facts, authority and scope.
   The prefixed row must satisfy the existing form checks.
4. Record the target ID, published source commit, fixed base and common
   ancestor, old and new Approach digests, exact prefix, actual file evidence,
   approval authority, recovery reason, residual risk and rollback in the new
   request. The old digest must match the published source Approach; the new
   digest must match the exact prefix plus that source value. Record actual
   authority; do not invent a user answer or approval.
5. Immediately before writing, recheck the unique current target, its
   byte-identical ID, Content and Status, and its recorded old Approach digest.
   Unknown or unavailable provenance, inherited or duplicate targets, stale
   data or a change beyond the approved prefix stops recovery before writing.
   Apply only that prefix. Keep every other row byte-identical and run the existing
   validation without an exemption.
6. Rollback removes only the recorded prefix when the current new Approach
   digest still matches. Otherwise preserve the current row and stop. Removal
   restores the original Approach and its validation failure. Do not reset,
   amend or force push.

Status changes, supersession and a diagnostic's rewrite suggestion supply no
recovery authority and clear no form error. Inherited malformed records need a
separate owning change request; this operation cannot repair them. These are
owner instructions, not an automatic recovery command or a concurrency guarantee.

## Merge-added identical decision copy recovery

The SDD owner may manually remove only raw-identical surplus copies of a
decision row that an exact two-parent bad merge introduced. Approval of this
protocol authorizes no target. First append a separate new in-force change
request that names the exact `decisions.md` path and the decision ID.

1. Name the bad merge. It must be an available ancestor of current HEAD with
   exactly two parents, and it must expose the introduced surplus. Name both
   parents and their unique common ancestor. Each of the three must hold exactly
   one byte-identical original of the row. Fix the explicit base and its unique
   comparison ancestor; both must hold one original and no surplus selected for
   removal. A missing or non-ancestor merge, a third parent, a non-unique
   ancestor or a source that does not hold exactly one original stops recovery.
2. Read the complete stored UTF-8 raw row of every selected current occurrence:
   all four cells, delimiters, padding and line ending. Hash each with SHA-256,
   including the line ending. Do not trim, decode escapes or normalize endings.
   Nonidentical cells, padding or endings are a different collision and are
   outside this recovery.
3. Record in the request the path, the ID, the bad merge, both parents, the
   ancestor, the base and its comparison ancestor, the location of each
   occurrence, the raw hash, the retain/remove mapping, the actual authority,
   the residual risk and the rollback. Record actual authority; invent no
   answer. The request fixes input lineage only.
4. After the request is appended, have the evidence for the write reviewed
   independently and adopted. It fixes the actual write HEAD, base and
   comparison ancestor, the complete preimage and replacement bytes and hashes,
   the mapping and the current authority. The request does not name its own
   commit, so the actual write revision stays distinct from the lineage above.
   This adds no receipt grammar and no validator input.
5. Immediately before writing, recheck the refs, their availability, the path,
   the authority, the occurrence count, the mapping and the bytes. Stale,
   missing, ambiguous, conflicting or changed proof stops before writing.
   Changed observations need refreshed reviewed evidence. A changed target or
   operation needs a new request; do not rewrite the cells of an earlier one.
6. Remove only the mapped surplus occurrences. Keep one complete original, every
   distinct decision and reference, every unrelated current byte and the Git
   history. Do not change a Status, rewrite a reference or reorder other
   history. Open-question rows, nonidentical collisions, ordinary duplicate
   cleanup and surplus that the base or its comparison ancestor already holds
   are excluded.
7. Rollback restores the recorded complete preimage only while the current file
   is byte-identical to its owned replacement. Otherwise keep the current bytes,
   stop and name the unrestored path. Restoring brings back the duplicate
   failure. Do not reset, amend or force push.

The existing duplicate check, positional drift, consumed-DONE authorization and
valid Status-only rules keep applying without an exemption. Other drift that
the file already has stays diagnosed; it is not a prerequisite for this
correction. An actual required stage gate still stops dependent work. Correcting
the copies is not a whole-target PASS, and the request stays at WIP while a named
action or required check is unfinished. These are owner instructions, not a
command, an executor or a concurrency, atomicity or power-loss guarantee.

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
3. Obtain the user's explicit answer. Either answer makes the SDD owner append one DEC-NNNN row to decisions.md under
   paths.specsDir. Its four columns are ID, Content, Approach, and Status. Content starts with Change request: followed
   by the affected repository-relative paths, separated by commas. Only a path authorizes an edit; an ID written there
   authorizes nothing. Approach records the proposed change.
   - Approved: Approach also records who approved it, when, and the option chosen, and the row starts at WIP.
   - Declined: Approach also records who declined it and when, and the row is appended at REJECTED. It authorizes no
     edit, and the artifact stays as it is.

   When the user cannot be asked, write no row to either table: report the proposed change as the decision still
   needed and keep the affected items stopped. A WIP Change request: row is the in-force authorization that the drift gate reads.
   TODO is not authorization. A DONE row authorizes only on the branch that appended it or moved it from WIP. A row
   the base already holds at DONE records a change already applied and authorizes nothing at any Status, so setting it back to WIP
   reopens nothing and a later edit to the same path needs a row of its own.

4. Rerun the owner skill against the affected artifact. The owner names the approved decision row, the input revision, and whether it is confirming existing content or changing it.
   A contract with a contract ID, such as `API-0002`, is selected by its full ID; a contract without one is selected by its repository-relative path.
   The owner updates the specification and its tests together, then validates the relevant flow.
5. Recheck every dependent BF, AC, and EX test obligation and every affected contract reference. Rewrite tests where their former expectation is invalid. Report any uncovered obligation. No execution ledger, TC row, or status reset substitutes for this check.
6. Complete the decision row by changing Status from WIP to DONE only after the owner artifact and dependent checks are complete.
   A row has one Status, so DONE claims every action its Approach lists. While one of them is deferred, keep the row at WIP.
   Cite the DEC ID in the stage report.
   A second open request on the same artifact waits for the first outcome and is restated if its premise changed.

The decision table has no separate Applied at field and no standalone CR file. Approval alone does not certify a change as applied.

### Multiple open change requests

Open requests have independent affected sets. Their union is the set of work paused. A later request against the same artifact names the earlier DEC ID and the premise it assumes. Report outstanding requests and their age so unresolved decisions remain visible.

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
  QFAI-DRIFT-003 is a warning that nothing was compared, because baseBranch does not resolve.
- Existing decisions.md and open-questions.md rows retain their ID, Content, and Approach, except for the explicit branch-added decision renumbering, published decision prefix recovery and merge-added identical decision copy recovery above. Inherited rows retain those cells without exception. A former row may change Status; new content is appended as a new row.
- Vendored assistant rules are changed in the package and synchronized into projects by `npx qfai init --force`, which overwrites a local edit. A project rule lives in a `*.local.md` overlay beside the vendored one.
- When approval is unavailable, keep the affected items stopped and report the decision needed. Continue unrelated work.
