/**
 * Reading shipped guidance one statement at a time, for tests that assert an obligation is stated.
 *
 * A keyword found anywhere in a file proves little: the word can sit in a sentence that says the
 * opposite, or in a different rule. Requiring every distinguishing term of the obligation inside
 * one statement binds them together without pinning the wording.
 */
import { expect } from "vitest";

import { flat } from "./shippedAssistant.js";

const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+\.)[ \t]/;
const TABLE_ROW = /^[ \t]*\|/;

/**
 * The statements of a Markdown text. Paragraphs, list items, table rows and headings are taken
 * apart first, so a statement never runs from one item into the next. A paragraph is then split
 * after each sentence. A table row stays whole, so a row's cells are read together. A list item
 * that follows a lead-in ending in a colon is read with that lead-in, so "No cycle runs when:" and
 * each condition under it form one statement.
 */
export function sentencesOf(text: string): string[] {
  const blocks = text.split(/\n\s*\n|\n(?=[ \t]*(?:[-*+]|\d+\.)[ \t])|\n(?=[ \t]*[|#])/);
  const statements: string[] = [];
  let leadIn = "";
  for (const block of blocks) {
    const body = flat(block).trim();
    if (body === "") continue;
    if (TABLE_ROW.test(block)) {
      statements.push(body);
      leadIn = "";
      continue;
    }
    const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z`"(*_[])/);
    if (LIST_ITEM.test(block)) {
      const [first = "", ...rest] = sentences;
      statements.push(leadIn === "" ? first : `${leadIn} ${first}`, ...rest);
      continue;
    }
    statements.push(...sentences);
    const last = sentences.at(-1) ?? "";
    leadIn = last.endsWith(":") ? last : "";
  }
  return statements.map((statement) => statement.trim()).filter((statement) => statement !== "");
}

/** Asserts that one statement of `text` matches every pattern, and returns that statement. */
export function expectSentence(text: string, what: string, ...patterns: RegExp[]): string {
  expect(
    patterns.length,
    `${what}: no pattern given, so any statement would match`,
  ).toBeGreaterThan(0);
  const found = sentencesOf(text).find((sentence) =>
    patterns.every((pattern) => pattern.test(sentence)),
  );
  expect(
    found,
    `${what}: no one statement matches ${patterns.map(String).join(" and ")}`,
  ).toBeDefined();
  return found ?? "";
}
