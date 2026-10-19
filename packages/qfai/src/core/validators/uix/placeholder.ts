/**
 * The unfilled-slot test the discussion-pack checks share: a bare placeholder
 * token, a bracketed template prompt, or nothing at all.
 */

const PLACEHOLDER_RE = /^(?:tbd|todo|example|lorem|placeholder|n\/a|none)$/i;

/**
 * The shipped `04_Sources.md` template seeds every field with a bracketed
 * prompt (`- reference: [Source name or URL]`). Those are unfilled slots, not
 * project content, so they must fail the same way `TBD` does. A markdown link
 * (`[text](url)`) is not caught: it does not end at the closing bracket.
 */
const BRACKET_PLACEHOLDER_RE = /^\[[^\]]*\]$/;

export const LIST_VALUE_SEPARATOR = "; ";

export function isPlaceholder(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return true;
  }
  // A list-valued field is unfilled only when every one of its items is.
  return trimmed
    .split(LIST_VALUE_SEPARATOR)
    .every((part) => PLACEHOLDER_RE.test(part.trim()) || BRACKET_PLACEHOLDER_RE.test(part.trim()));
}
