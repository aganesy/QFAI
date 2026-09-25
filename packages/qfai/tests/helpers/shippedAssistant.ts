/**
 * Reading the assistant tree `qfai init` ships, for tests that assert what a shipped rule says.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { nextHeadingAt } from "./recordProse.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SHIPPED_ASSISTANT = path.join(packageRoot, "assets", "init", ".qfai", "assistant");

/** A file under the shipped assistant tree, by its path relative to that tree. */
export function readShipped(relativePath: string): Promise<string> {
  return readFile(path.join(SHIPPED_ASSISTANT, relativePath), "utf-8");
}

/**
 * The section a heading opens, subsections included, up to the next heading of the same or a
 * higher level. `heading` matches the start of the heading line, so `## Stage 0` finds
 * `## Stage 0 - Steering completion refresh`. Headings inside a fence are not headings.
 */
export function sectionOf(text: string, heading: string): string {
  const level = headingLevel(heading);
  let start = text.startsWith(heading) ? 0 : nextHeadingAt(text, 0);
  while (start > 0 && !text.startsWith(heading, start)) start = nextHeadingAt(text, start);
  if (level === 0 || start === -1) return "";
  let end = nextHeadingAt(text, start);
  while (end !== -1 && headingLevel(text.slice(end)) > level) end = nextHeadingAt(text, end);
  return text.slice(start, end === -1 ? text.length : end);
}

function headingLevel(line: string): number {
  return /^#+/.exec(line)?.[0].length ?? 0;
}

/** The first table row of `text` whose cells hold `token`, or `""`. */
export function rowOf(text: string, token: string): string {
  return text.split("\n").find((line) => line.startsWith("|") && line.includes(token)) ?? "";
}

/** Text with every run of whitespace collapsed to one space, so a pattern can span a wrapped line. */
export function flat(text: string): string {
  return text.replace(/\s+/g, " ");
}
