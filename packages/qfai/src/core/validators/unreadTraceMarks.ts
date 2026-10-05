import path from "node:path";

import type { Issue } from "../types.js";
import { maskJsNonCode, type JsMaskOptions } from "./jsSourceMask.js";
import { issue } from "./utils.js";

const UNREAD_MARK = /\bQFAI:(?:SPEC-\d{4}(?::[A-Z]+-[\d-]+)?|US-[\d-]+|TC-[\d-]+|SC-[\d-]+)/g;
const SLASH_FAMILY = new Set(["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"]);

/** `#` opens a comment everywhere but in the JavaScript family, where it opens a private field. */
function maskOptions(file: string): JsMaskOptions {
  const extension = path.extname(file).slice(1).toLowerCase();
  return SLASH_FAMILY.has(extension) ? {} : { hashComments: true, tripleQuoted: true };
}

/**
 * A `QFAI:US-`, `QFAI:TC-`, `QFAI:SC-` or `QFAI:SPEC-` mark in a comment. No check reads
 * these shapes, so the author believes a trace was recorded while nothing was. A string literal
 * is left alone: tests that exercise the old shapes carry them as data.
 *
 * A mark is in a comment when it is visible with the strings blanked and gone with the
 * comments blanked too. The mask keeps every offset, so one offset names a mark in both.
 */
export function unreadTraceMarks(file: string, content: string): Issue[] {
  const options = maskOptions(file);
  const withComments = maskJsNonCode(content, { ...options, comments: false });
  const code = maskJsNonCode(content, options);
  const issues: Issue[] = [];
  for (const match of withComments.matchAll(UNREAD_MARK)) {
    const start = match.index;
    if (code.startsWith(match[0], start)) continue;
    const line = content.slice(0, start).split("\n").length;
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
        { loc: { line } },
      ),
    );
  }
  return issues;
}
