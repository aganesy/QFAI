# Evidence Revision

## The field

Every observation names the source state it read. Use a git commit ID only for a clean tree. Use working-tree+<content hash> for an uncommitted or dirty tree. Record a separate revision for RED, the temporary falsifiability mutation, GREEN, refactor verification, and each review verdict. A later result does not retitle an earlier observation.

For a working-tree content hash, collect tracked and untracked files from the repository root with Git, including
additions and deletions. Exclude .qfai/evidence/ and .qfai/review/ because those records are written after the
observation. Resolve configured paths through qfai.config.yaml; the story tree remains inside the address. For each
path, record its repo-relative POSIX name, file kind, mode, and SHA-256 of its raw bytes. Record a deleted tracked path
as absent, and a symbolic link by its link target without following it. Reject a path that cannot be read. Sort records
by path, join them with LF, prefix the HEAD commit ID and a LF, then SHA-256 the resulting bytes. This digest is the
content hash in working-tree+<content hash>.

Do not use a timestamp as a revision. A clock value cannot distinguish two trees written in the same second and cannot tell which files a reviewer read.

## Review pack seal

The review pack is excluded from the source revision. Once a review attempt has its final response and summary.json,
seal every file inside that review-<timestamp> directory. For each file, record its repo-relative path, a NUL byte, and
SHA-256 of its bytes. Normalize Markdown and HTML first: LF line endings, no trailing whitespace on lines, no leading or
trailing blank lines, and one final newline. Hash other file types as raw bytes. Sort these records by path, join with
LF, and SHA-256 the joined bytes.

Write the pack path and seal outside the pack under the example's current round. A later attempt receives a new pack and a new seal. Recompute every recorded seal when the pack is present; a changed response, summary, or request invalidates its original verdict. A pack absent from a fresh clone leaves the committed path, seal, verdict, and reviewed revision to audit.

## Which tree an observation addresses

RED names the tree before the production behavior is added. A falsifiability revision names the temporary mutated tree before restoration. GREEN names the implementation before refactor. Refactor verification and the completion reviewers name the integrated tree after refactor. A rendered capture has its own artifact hash under the audited evidence procedure.

A verdict is stale when the state it claims to have reviewed differs from the state its subject requires, or when the
evidence fields or captures in its audited subject change. Repeat the affected observation and review on the new tree.
After a squash merge, keep the original revision as provenance; compare the resulting tree to the reviewed content and
re-attest a changed subject rather than replacing the historical revision.
