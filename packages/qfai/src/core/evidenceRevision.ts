/**
 * The one revision spelling a review pack may carry: a git rev, abbreviated or
 * full, as `git rev-parse` printed it.
 *
 * An uncommitted tree has no revision. A content hash of a working tree would
 * need a procedure every producer and reviewer reimplements, and no gate
 * recomputes it, so the work under review is committed first and the commit
 * names it.
 *
 * `reviewArtifacts.ts` checks the `revision` field of a pack's `summary.json`
 * against it.
 */
export const REVISION_FORM_SOURCE = "[0-9a-fA-F]{7,64}";

/** {@link REVISION_FORM_SOURCE} anchored, for testing a whole value. */
export const REVISION_FORM = new RegExp(`^${REVISION_FORM_SOURCE}$`);
