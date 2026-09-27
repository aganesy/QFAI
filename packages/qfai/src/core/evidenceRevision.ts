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
 * `reviewArtifacts.ts` checks the `Revision:` field of a reviewer response
 * against it.
 *
 * **The `working-tree+` digest is lowercase and the rev is not.** A git rev is
 * whatever `git rev-parse` printed, and a human quoting an abbreviated one may
 * upper-case it. The content address is produced by the four-step procedure,
 * which fixes its notation, so accepting both cases there would let two
 * producers spell the same tree two ways, and an exact comparison would read
 * them as different revisions.
 */
export const REVISION_FORM_SOURCE = "(?:[0-9a-fA-F]{7,64}|working-tree\\+[0-9a-f]{64})";

/** {@link REVISION_FORM_SOURCE} anchored, for testing a whole value. */
export const REVISION_FORM = new RegExp(`^${REVISION_FORM_SOURCE}$`);
