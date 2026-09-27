# Round Evidence

## Round block

Record one section headed ### EX-NNNN-NNNN-NN in .qfai/evidence/implement-BF-NNNN.md. Inside it, use #### Round N in increasing order, starting at 1. A blocking REVISE opens the next round for changed behavior or proof. A new attempt to review unchanged proof receives a separate review pack and a numbered attempt in the current round.

Each round records the exact test selector and test file, the acceptance criterion and example IDs, and the following phase observations as applicable:

- Round N: RED revision, RED command, RED result, RED failure mode, and RED assertion-stripped result.
- Round N: RED test hash and its file manifest when an acceptance test was handed over from the acceptance stage.
- Round N: Satisfied-by, Falsifiability revision, Falsifiability command, and Falsifiability result when existing behavior makes an ordinary RED unobservable.
- Round N: Replacement proof revision when a changed test takes a fresh proof.
- Round N: Revision, GREEN command, GREEN result, and Oracle proof.
- Round N: Refactor verify revision, command, and result.
- Round N: Review pack, Review pack seal, and reviewer verdict for each review attempt.

A value containing several lines belongs in a fenced block. The fence must be longer than any fence printed by the command output, so headings in that output cannot end the example section. Preserve the command and output verbatim.

## Review boundary

A RED gatekeeper judgment uses only the RED or falsifiability fields available at that point. A GREEN judgment also
reads the GREEN and oracle fields. Completion reviewers read those fields and the refactor verification, plus UI
captures where the example is UI affecting. Their own verdict and pack seal are written after the audited subject is
taken. The audited-evidence-hash rule defines the exact hash procedure.

Every reviewer verdict names its reviewed revision and audited evidence hash. A review of a changed test, implementation, fixture, or capture is repeated. A failed review remains in its original round; the correction and replacement proof are recorded in the next round.

## Interrupted work and shared artifacts

If work stops after an observation, keep its command, result, revision, and reason. On resumption, record the new source revision and repeat observations whose inputs moved. Do not relabel the earlier result as current.

When another example changes a shared acceptance artifact, record the affected EX IDs, old and new artifact hashes, the re-run command and result, and the re-taken oracle proof. Cross flow consumers receive their own revalidation. The new record is attached to the editing example or to the acceptance stage evidence when no editing example exists.
