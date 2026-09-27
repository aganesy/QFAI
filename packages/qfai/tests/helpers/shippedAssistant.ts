/**
 * Reading the assistant tree `qfai init` ships, for tests that assert what a shipped rule says.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { nextHeadingAt } from "./recordProse.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SHIPPED_ASSISTANT = path.join(packageRoot, "assets", "init", ".qfai", "assistant");

/** Whether the shipped assistant tree holds `relativePath`. */
export function shippedExists(relativePath: string): boolean {
  return existsSync(path.join(SHIPPED_ASSISTANT, relativePath));
}

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

/**
 * Every skill a built-in workflow plan names, held literally so a change to the set is a change to
 * the tests that read it.
 */
export const PLAN_SKILLS = [
  "qfai-sdd",
  "qfai-atdd",
  "qfai-implement",
  "qfai-verify",
  "qfai-discussion",
  "qfai-prototyping",
  "qfai-maintain",
] as const;

/** The YAML front matter of a shipped `SKILL.md`, parsed; `{}` when there is none. */
export function frontMatterOf(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  const body = match?.[1];
  const parsed: unknown = body === undefined ? null : parse(body);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed));
}

/**
 * The Operations table of an `orchestrated-mode.md`, read the way the workflow file contract defines
 * it: the first table under a heading exactly `## Operations`, its first column's header, and the
 * backticked ID each cell of that column holds.
 */
export function operationsOf(text: string): { header: string; ids: string[] } {
  const section = /^## Operations\s*$/m.test(text) ? sectionOf(text, "## Operations\n") : "";
  const rows = section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const [head, , ...body] = rows;
  return {
    header: head?.[0] ?? "",
    ids: body.map((cells) => /^`([^`]+)`$/.exec(cells[0] ?? "")?.[1] ?? `<${cells[0] ?? ""}>`),
  };
}

/** The first table row of `text` whose cells hold `token`, or `""`. */
export function rowOf(text: string, token: string): string {
  return text.split("\n").find((line) => line.startsWith("|") && line.includes(token)) ?? "";
}

/** Text with every run of whitespace collapsed to one space, so a pattern can span a wrapped line. */
export function flat(text: string): string {
  return text.replace(/\s+/g, " ");
}
