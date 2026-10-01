import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*|#|--)/;
const UNREAD_MARK = /\bQFAI:(?:SPEC-\d{4}(?::[A-Z]+-[\d-]+)?|US-[\d-]+|TC-[\d-]+|SC-[\d-]+)/g;

/**
 * A `QFAI:US-`, `QFAI:TC-`, `QFAI:SC-` or `QFAI:SPEC-` mark on a comment line. No check reads
 * these shapes, so the author believes a trace was recorded while nothing was. A string literal
 * is left alone: tests that exercise the old shapes carry them as data.
 */
export function unreadTraceMarks(file: string, content: string): Issue[] {
  const issues: Issue[] = [];
  content.split(/\r?\n/).forEach((line, index) => {
    if (!COMMENT_LINE.test(line)) return;
    for (const match of line.matchAll(UNREAD_MARK)) {
      issues.push(
        issue(
          "QFAI-STORY-014",
          `${match[0]} in ${file} is read by no check; annotate with QFAI:BF-, AC- or EX-`,
          "warning",
          file,
          "storyTree.unreadTraceMark",
          [match[0]],
          "canonical",
          undefined,
          { loc: { line: index + 1 } },
        ),
      );
    }
  });
  return issues;
}
