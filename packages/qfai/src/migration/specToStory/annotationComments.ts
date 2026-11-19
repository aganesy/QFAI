import { DECLARATION_MASK } from "../../core/testDeclarations.js";
import { maskJsNonCode } from "../../core/validators/jsSourceMask.js";

/**
 * A test of whether a span of `text` lies wholly inside a comment.
 *
 * An annotation is a comment. The same token in a string literal is test data,
 * an input or an expected value, and rewriting it changes what the test checks.
 * Comments and literals are told apart by the lexer and settings the story-tree
 * annotation scan uses, so the migration rewrites exactly what validation later
 * reads as an annotation.
 *
 * Both masks keep the length and line breaks of `text`, so an offset into
 * `text` is the same offset into each mask. A character is in a comment when
 * the mask that keeps comments keeps it and the mask that blanks them blanks it.
 */
export function commentSpanTest(text: string): (start: number, length: number) => boolean {
  const commentsKept = maskJsNonCode(text, { ...DECLARATION_MASK, comments: false });
  const codeOnly = maskJsNonCode(text, DECLARATION_MASK);
  return (start, length) => {
    for (let index = start; index < start + length; index += 1) {
      const character = text[index];
      if (character === undefined || /\s/.test(character)) return false;
      if (commentsKept[index] !== character || codeOnly[index] !== " ") return false;
    }
    return length > 0;
  };
}
