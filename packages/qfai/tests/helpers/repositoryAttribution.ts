import path from "node:path";

import fg from "fast-glob";

/**
 * Detects prose that attributes a concrete artifact id to "this repository".
 *
 * Every file under `assets/init/.qfai/assistant/` is copied verbatim by
 * `qfai init`, so "this repository" resolves to the *consuming* project.
 * Pairing that phrase with a concrete `spec-NNNN` / `TC-NNNN-NNNN` /
 * `CON-API-NNNN` id therefore asserts a fact about an artifact the consumer
 * does not have. The bare phrase is legitimate (`qfai-atdd`, `qfai-configure`
 * and `qfai-verify` all use it correctly), so the matcher fires only on the
 * phrase plus an id inside the same sentence.
 *
 * The matcher and the file list live here, in one module, because the guard in
 * `tests/assets/assets.test.ts` and its own regression suite must not be able
 * to drift apart: a matcher that is re-spelled per call site is a matcher that
 * silently stops matching.
 */

/**
 * Concrete artifact identifiers a consuming project will not have.
 *
 * `CON` deliberately uses the `CON-(?:API|DB|UI)-NNNN` shape defined by
 * `skills/qfai-sdd/references/contract-artifact-rules.md` ("Use prefixes
 * `CON-API-*`, `CON-DB-*`, and `CON-UI-*`"). The `CON-NNNN-NNNN` shape this
 * list used to carry does not exist anywhere in the repository, so that branch
 * could never fire and every contract misattribution walked past the guard.
 *
 * The second number group is optional for the same reason. `US`, `AC`, `BR` and
 * `TC` items are single-numbered — `skills/qfai-sdd/references/spec-traceability-rules.md`
 * defines them as `US-0001` / `AC-0001` / `BR-0001` / `TC-0001` — so requiring
 * `NNNN-NNNN` matched only the wider spelling and let `this repository's
 * TC-0001` through. Both spellings are accepted, longer first.
 */
const ARTIFACT_ID = String.raw`\`?(?:spec-\d{4}|(?:TC|AC|BR|US)-\d{4}(?:-\d{4})?|CON-(?:API|DB|UI)-\d{4})\`?`;

/**
 * Abbreviations whose trailing period does not end a sentence.
 *
 * Kept to the forms that actually occur in the shipped tree (`e.g.`, `i.e.`,
 * `etc.`) plus two neighbours from the same register. Without them
 * `this repository's active spec (e.g., spec-0006)` reads as two sentences and
 * the attribution slips through.
 */
const ABBREVIATIONS = ["e.g", "i.e", "etc", "vs", "cf"] as const;

/**
 * A period that really ends a sentence.
 *
 * Two exclusions, both load-bearing:
 * - `(?=\s|$)` — a period followed by a non-space is inside a token, not at a
 *   sentence end. That is what keeps `.qfai/specs/spec-0006` and
 *   `DESIGN.md.sample` scannable; the previous `[^.\n]` gap stopped dead on the
 *   leading dot of `.qfai` and could not see the id behind it.
 * - the abbreviation lookbehind — see {@link ABBREVIATIONS}.
 *
 * `?` and `!` are intentionally not boundaries: treating them as such would
 * only make the guard fire less often, and no shipped attribution needs it.
 */
const SENTENCE_END = String.raw`(?<!${ABBREVIATIONS.map((abbreviation) => abbreviation.replace(/\./g, String.raw`\.`)).join("|")})\.(?=\s|$)`;

/**
 * The rest of the same sentence and the same markdown block.
 *
 * `[^\n]` holds the block boundary because {@link normalizeSoftWraps} leaves a
 * newline only where one block ends and the next begins, and the {@link
 * SENTENCE_END} lookahead holds the sentence boundary. Those two are the whole
 * bound: the 80-character cap this used to carry was a third, arbitrary one
 * that stopped inside sentences it had no reason to leave, so an attribution
 * with a long qualifier — "this repository's currently active and
 * authoritative … specification … is spec-0006", 131 characters of one
 * sentence — matched neither direction.
 */
const GAP = String.raw`(?:(?!${SENTENCE_END})[^\n])*`;

/**
 * Both orders of the same claim.
 *
 * "`spec-0006` in this repository" reads exactly as "this repository's
 * `spec-0006`"; checking only one direction let the other spelling through a
 * guard that promises "never attributes".
 */
const ATTRIBUTIONS: readonly RegExp[] = [
  new RegExp(String.raw`this repository(?:'s)?${GAP}${ARTIFACT_ID}`, "i"),
  new RegExp(String.raw`${ARTIFACT_ID}${GAP}this repository`, "i"),
];

/** Lines that open a new markdown block rather than continuing the previous one. */
const BLOCK_START = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||```|~~~|<)/;

/**
 * Blocks that end at their own newline, so the next line cannot continue them.
 *
 * A subset of {@link BLOCK_START}, because the two questions are different. An
 * ATX heading, a table row and a fence marker are complete at end of line; a
 * list item or a block quote takes lazy continuation, so `- gamma\ndelta` is
 * one item and must still be joined. Testing only the *current* line let
 * `# Configure this repository` absorb a following `Use spec-0006 as a sample`
 * and report a heading plus an unrelated sample id as one attribution.
 */
const SINGLE_LINE_BLOCK = /^\s*(?:#{1,6}\s|\||```|~~~)/;

/**
 * Collapses soft wraps while preserving markdown block boundaries.
 *
 * The phrase and the id routinely straddle a soft line break, so the raw text
 * cannot be scanned line by line. Replacing *every* newline with a space is the
 * opposite error: it welds `# Configure this repository` onto a following
 * `- Use spec-0006 as a sample`, and since headings and list items rarely end
 * in a period, nothing downstream separates them again. Adding one legitimate
 * standalone sample id would then fail the guard.
 *
 * So: a line joins the previous one only when both are running prose. A blank
 * line, a heading, a list item, a table row, a quote or a fence starts a new
 * block, and the newline before it survives into the output as the boundary
 * {@link GAP} refuses to cross. The block already open is checked too — a
 * heading ends at its newline whatever follows it (see
 * {@link SINGLE_LINE_BLOCK}).
 */
export function normalizeSoftWraps(content: string): string {
  const blocks: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    const previous = blocks.at(-1);
    const continuesPrevious =
      previous !== undefined &&
      previous !== "" &&
      trimmed !== "" &&
      !BLOCK_START.test(line) &&
      !SINGLE_LINE_BLOCK.test(previous);
    if (continuesPrevious) {
      blocks[blocks.length - 1] = `${previous} ${trimmed}`;
    } else {
      blocks.push(trimmed);
    }
  }
  return blocks.join("\n");
}

/**
 * Returns the offending excerpt, or `null` when the text attributes nothing.
 *
 * Callers pass text that has already been through {@link normalizeSoftWraps};
 * {@link findRepositoryAttribution} does that for whole files.
 */
export function matchRepositoryAttribution(text: string): string | null {
  for (const attribution of ATTRIBUTIONS) {
    const found = attribution.exec(text);
    if (found !== null) {
      return found[0];
    }
  }
  return null;
}

/** Normalizes then matches. The pairing every file scan needs. */
export function findRepositoryAttribution(content: string): string | null {
  return matchRepositoryAttribution(normalizeSoftWraps(content));
}

/**
 * Every file `qfai init` copies out of `assistant/`, whatever its extension.
 *
 * `copyTemplateTree` walks the tree with no extension filter, so a guard scoped
 * to `**\/*.{md,yml,yaml}` contradicts its own premise: it skipped the shipped
 * `skills/qfai-prototyping/templates/DESIGN.md.sample` (markdown prose behind a
 * `.sample` suffix), the two catalog JSON files and the SQL contract template.
 * Binary files are dropped rather than decoded as UTF-8 — there are none today,
 * and one added later should not read as garbage prose.
 */
export async function listShippedAssistantFiles(assistantDir: string): Promise<string[]> {
  const files = await fg(["**/*"], {
    cwd: assistantDir,
    absolute: true,
    dot: true,
    onlyFiles: true,
  });
  return files.sort((left, right) => left.localeCompare(right));
}

/** True when the buffer looks binary, i.e. carries a NUL byte. */
export function isBinary(content: Buffer): boolean {
  return content.includes(0);
}

/** Formats one offender the way the guard reports it. */
export function formatAttributionOffender(
  repoRoot: string,
  filePath: string,
  excerpt: string,
): string {
  return `${path.relative(repoRoot, filePath)}: ${excerpt}`;
}
