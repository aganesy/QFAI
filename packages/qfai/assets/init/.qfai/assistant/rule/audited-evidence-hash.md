# Audited Evidence Hash

A reviewer records an `Audited evidence hash` for the evidence it judged.
The hash addresses the review subject, not the source tree. The source tree
is named separately by `Reviewed revision`, as defined in
`../skill/qfai-implement/references/evidence-revision.md`.

## Subject

For an implementation review, select one `### EX-NNNN-NNNN-NN` section in
`.qfai/evidence/implement-BF-NNNN.md` and one `#### Round N` within it. The
subject includes the EX heading, its AC and EX identities, and the
phase-authored fields of that round that existed when the reviewer read it.
Use the field inventory in
`../skill/qfai-implement/references/round-evidence.md`:

- RED or falsifiability command, result, failure mode, test hash, and revision;
- GREEN command, result, oracle proof, and revision when GREEN has run;
- refactor verification command, result, and revision for completion review;
- shared-artifact re-verification and UI surface-artifact manifest when they
  apply.

An earlier RED reviewer hashes only RED or falsifiability evidence. A GREEN
reviewer also hashes GREEN evidence. A completion reviewer hashes the full
current round through refactor verification. Do not include fields written
by a reviewer after taking the subject: reviewer verdict, review pack path,
review pack seal, or the final status. Do not include a later round in an
earlier round's subject. A REVISE and its repair use a new round.

A stage-level review without an EX round hashes the stage evidence file,
excluding its reviewer-written verdict and final status. The review subject
must name the exact evidence file and scope in the response.

For a UI review, add every screenshot and HTML capture named in the round's
`Surface artifacts` manifest under `.qfai/evidence/`. Missing captures make
the subject incomplete; they are not represented by empty hashes. A reviewer
must re-take the hash if a capture changes. A file under the source revision
is already pinned by `Reviewed revision` and is not duplicated here.

## Normalization and digest

1. Extract the subject fields in their file order. Preserve their Markdown
   spelling, fenced command output, blank lines, and headings. Do not reorder
   fields or regenerate prose. For a stage-level subject, use the full file
   after removing the reviewer-written verdict and final-status section.
2. For each Markdown or HTML record, convert line endings to LF, strip
   trailing whitespace from each line, remove leading and trailing blank
   lines, and end with one LF. Hash every other file type as raw bytes.
3. For each record, serialize its repository-relative POSIX path, a NUL byte,
   and the lowercase SHA-256 hex digest of its normalized or raw bytes. Use
   the evidence file path for the extracted section. Sort records by path and
   join them with LF.
4. SHA-256 the resulting byte sequence and record its lowercase hex digest
   as `Audited evidence hash` in the reviewer response.

A reviewer response also records `Reviewed revision`. The evidence hash and
revision serve different purposes; neither replaces the other. The review
pack seal in `../skill/qfai-implement/references/evidence-revision.md` pins
the response and summary after they are written. Recompute a present
subject before accepting a PASS. If the subject changed, repeat the
reviewer's judgment over the current evidence and issue a new verdict.
