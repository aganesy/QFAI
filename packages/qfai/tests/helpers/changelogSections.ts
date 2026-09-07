/**
 * Which release section each line of a Keep a Changelog document belongs to.
 *
 * The language guard reports and allows Japanese per section rather than per
 * file, because the two halves of the document have opposite rules: the open
 * `## [Unreleased]` section is being written now and must be English, while a
 * released section is a record of what shipped and is the migration backlog.
 * One file-wide list cannot say both.
 */

/** Key for the lines above the first `## ` heading. */
export const CHANGELOG_PREAMBLE = "(preamble)";

/** A `## ` heading and its text, with any trailing whitespace removed. */
const H2_RE = /^##[ \t]+(.*\S)[ \t]*$/;

/**
 * The section heading owning each line of `text`, in file order.
 *
 * Index `i` of the result is the section of line `i + 1`, so a line number
 * from `findJapaneseTextLines` indexes it directly. A heading line belongs to
 * the section it opens.
 */
export function sectionOfEachLine(text: string): string[] {
  let current = CHANGELOG_PREAMBLE;
  return text.split(/\r?\n/).map((line) => {
    // The group is typed optional because a pattern need not reach it. This
    // one has no alternation and no optional group, so a match always carries
    // it. The guard below is what a later edit adding either would fall
    // through: the heading would not become the current section, and its lines
    // would be counted under the section above it.
    const heading = H2_RE.exec(line)?.[1];
    if (heading !== undefined) {
      current = heading;
    }
    return current;
  });
}
