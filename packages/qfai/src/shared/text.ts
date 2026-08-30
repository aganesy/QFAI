/**
 * Text helpers for callers that compare file CONTENT for equality.
 *
 * This module gives that comparison basis a single NAMED definition — it is
 * not the only newline fold in the tree, and extracting it did not make it
 * so. See the consolidation note below for what is still separate.
 */

/**
 * Collapses CRLF sequences to LF so that two copies of one file compare
 * equal across a CRLF checkout.
 *
 * A lone `\r` is deliberately left alone: no file this is applied to
 * contains one, and rewriting it here would silently change what "identical
 * content" means for callers that never asked for it.
 *
 * Note for a future consolidation pass. `core/skillsIntegrity.ts` still
 * carries a private copy of `normalizeNewlines`, so `src/` holds TWO
 * content-equality normalizers, not one; the test tree holds further local
 * copies. The two production copies agree today, and they are not yet wired
 * together only because that module's ownership was out of scope when this
 * one was extracted — so a change to the fold here must be mirrored there
 * until they are.
 *
 * The roughly thirty OTHER `replace(/\r\n/g, "\n")` occurrences under `src/`
 * are mostly not candidates for this helper: nearly all are immediately
 * followed by `.split("\n")`, i.e. they fold newlines to tokenize lines, not
 * to decide whether two files carry identical content. Folding them in here
 * would give this function two unrelated reasons to change.
 */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
