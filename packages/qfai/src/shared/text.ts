/**
 * Text helpers shared by the modules that must agree on how file content is
 * compared.
 */

/**
 * Collapses CRLF sequences to LF so that two copies of one file compare
 * equal across a CRLF checkout.
 *
 * A lone `\r` is deliberately left alone: no file this is applied to
 * contains one, and rewriting it here would silently change what "identical
 * content" means for callers that never asked for it.
 *
 * Note for a future consolidation pass: `core/skillsIntegrity.ts` still
 * carries its own private copy of this function. The two agree today; they
 * are not yet wired to a single definition because that module's ownership
 * was out of scope when this one was extracted.
 */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
