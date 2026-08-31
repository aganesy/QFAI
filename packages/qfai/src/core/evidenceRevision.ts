/**
 * The revision spellings `evidence-revision.md` defines, and nothing else.
 *
 * A git rev — abbreviated or full — or `working-tree+` and the SHA-256 that
 * file's four-step content-address procedure produces for an uncommitted tree.
 * The length is the point: a short suffix is what a `git status --porcelain`
 * digest looks like, and that spelling is forbidden because it does not move
 * when the file under review is edited, which is the one thing the field
 * exists to detect.
 *
 * **Two gates read this and they must not disagree.**
 * `reviewArtifacts.ts` checks the `Revision:` field of a reviewer response;
 * `tddList.ts` embeds it as the `REV:` token of the `Evidence` pointer
 * grammar. Those two values are compared against each other for freshness, so
 * a spelling one accepts and the other rejects makes a legitimate observation
 * unrecordable: an uncommitted GREEN writes `working-tree+<hash>` into both,
 * and a ledger grammar that forbade `+` turned every such row into
 * `TDDLIST_EVIDENCE_CELL_MALFORMED` while the review gate called the identical
 * string correct.
 */
export const REVISION_FORM_SOURCE = "(?:[0-9a-fA-F]{7,64}|working-tree\\+[0-9a-fA-F]{64})";

/** {@link REVISION_FORM_SOURCE} anchored, for testing a whole value. */
export const REVISION_FORM = new RegExp(`^${REVISION_FORM_SOURCE}$`);
