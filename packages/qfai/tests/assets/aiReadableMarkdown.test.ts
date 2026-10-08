/**
 * The Markdown the package ships is sized and split the way the AI-readable
 * Markdown rule sets out, because an agent reads these files as instructions
 * and follows fewer of them as its context grows.
 *
 * Four clauses are checked over every Markdown file `qfai init` can write:
 *
 * - a file stays within 500 lines;
 * - a `SKILL.md` body stays within 20,000 characters;
 * - a reference over 100 lines opens with a `## Contents` section that lists
 *   its `##` headings in order;
 * - a reference does not point at another reference.
 *
 * What a pointer says about when to read its file is a judgement of wording and
 * stays with review.
 *
 * Two backlogs record what the tree does not yet meet; the one for line counts
 * is empty. Each entry is the exact state the file ships with, so a file may
 * leave a backlog and may not join one or move inside it: widening or
 * narrowing without updating the entry fails.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { countLines } from "../helpers/skillBudget.js";

const initRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);
const ASSISTANT_PREFIX = ".qfai/assistant/";

const MAX_LINES = 500;
const MAX_SKILL_BODY_CHARS = 20_000;
const CONTENTS_FROM_LINES = 100;

/**
 * Files over {@link MAX_LINES}, with the line count each ships with. No shipped
 * file is over the limit, so the backlog is empty and stays closed to new
 * entries.
 */
const LINE_BACKLOG: ReadonlyMap<string, number> = new Map<string, number>();

/**
 * References that name another reference, as the files each one names.
 *
 * SIMPLIFIED: the concrete-abstract cycle reference keeps its citation of the
 * triage reference's section on changing the story tree, because the
 * acceptance test for applying an adopted finding requires that citation to
 * resolve.
 * Lift when: that test reads the citation from the cycle step instead, and the
 * pointer is dropped from the reference. The entry is then removed.
 */
const REFERENCE_POINTERS: ReadonlyMap<string, readonly string[]> = new Map([
  [
    "skill/qfai-sdd/references/concrete-abstract-cycle.md",
    ["skill/qfai-sdd/references/sdd-triage.md"],
  ],
]);

const toPosix = (value: string): string => value.split(path.sep).join("/");

/** A shipped path with the assistant prefix dropped, so the lists stay readable. */
const short = (rel: string): string =>
  rel.startsWith(ASSISTANT_PREFIX) ? rel.slice(ASSISTANT_PREFIX.length) : rel;

const isReference = (rel: string): boolean => rel.split("/").includes("references");

interface Shipped {
  readonly rel: string;
  readonly text: string;
}

async function shippedMarkdown(): Promise<Shipped[]> {
  const files = await fg(["**/*.md"], { cwd: initRoot, dot: true, ignore: ["**/node_modules/**"] });
  const shipped = await Promise.all(
    files.sort().map(async (rel) => ({
      rel,
      text: await readFile(path.join(initRoot, rel), "utf-8"),
    })),
  );
  return shipped;
}

/** The opening marker of a fenced block, or `undefined` when the line is not one. */
function fenceMarker(line: string): string | undefined {
  return /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
}

interface Outline {
  /** Every `##` heading outside a fenced block, in order. */
  readonly headings: string[];
  /** The list items directly under the `## Contents` heading. */
  readonly contents: string[];
}

/** The `##` headings of a document and the list its `## Contents` section holds. */
function outline(text: string): Outline {
  const headings: string[] = [];
  const contents: string[] = [];
  let fence: string | undefined;
  let section: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    const marker = fenceMarker(line);
    if (fence !== undefined) {
      const closes =
        marker !== undefined &&
        marker.startsWith(fence.slice(0, 1)) &&
        marker.length >= fence.length &&
        /^ {0,3}(`+|~+)\s*$/.test(line);
      if (closes) fence = undefined;
      continue;
    }
    if (marker !== undefined) {
      fence = marker;
      continue;
    }
    const heading = /^## (.+?)\s*$/.exec(line)?.[1];
    if (heading !== undefined) {
      headings.push(heading);
      section = heading;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      if (/^# /.test(line)) section = undefined;
      continue;
    }
    const item = /^- (.+?)\s*$/.exec(line)?.[1];
    if (section === "Contents" && item !== undefined) contents.push(item);
  }
  return { headings, contents };
}

/** The text after the front matter, which is what the character limit counts. */
const skillBody = (text: string): string => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");

/** Every other reference a reference names by a path that resolves to one. */
function referencesNamedBy(file: Shipped, references: ReadonlySet<string>): string[] {
  const named = new Set<string>();
  for (const token of file.text.match(/[A-Za-z0-9_./-]+\.md\b/g) ?? []) {
    const candidates = [
      path.posix.join(path.posix.dirname(file.rel), token),
      path.posix.join(path.posix.dirname(path.posix.dirname(file.rel)), token),
      path.posix.normalize(token),
    ];
    for (const candidate of candidates) {
      if (references.has(candidate) && candidate !== file.rel) named.add(short(candidate));
    }
  }
  return [...named].sort();
}

describe("the shipped Markdown is sized and split for an agent that reads it", () => {
  it("scans the whole shipped tree", async () => {
    const shipped = await shippedMarkdown();
    const rels = shipped.map((file) => toPosix(file.rel));
    expect(rels.some((rel) => rel.endsWith("/SKILL.md"))).toBe(true);
    expect(rels.some((rel) => isReference(rel))).toBe(true);
  });

  it(`keeps every file within ${MAX_LINES} lines, apart from the recorded backlog`, async () => {
    const over: string[] = [];
    const seen = new Set<string>();
    for (const file of await shippedMarkdown()) {
      const lines = countLines(file.text);
      const key = short(file.rel);
      const recorded = LINE_BACKLOG.get(key);
      if (recorded === undefined) {
        if (lines > MAX_LINES) over.push(`${key}: ${lines} lines`);
        continue;
      }
      seen.add(key);
      if (lines !== recorded) over.push(`${key}: ${lines} lines, the backlog records ${recorded}`);
    }
    const stale = [...LINE_BACKLOG.keys()].filter((key) => !seen.has(key));
    expect(over, `over ${MAX_LINES} lines: move a section out into a reference`).toEqual([]);
    expect(stale, "a backlog entry names a file that is not shipped").toEqual([]);
  });

  it(`keeps every SKILL.md body within ${MAX_SKILL_BODY_CHARS} characters`, async () => {
    const over: string[] = [];
    for (const file of await shippedMarkdown()) {
      if (path.posix.basename(file.rel) !== "SKILL.md") continue;
      const chars = [...skillBody(file.text)].length;
      if (chars > MAX_SKILL_BODY_CHARS) over.push(`${short(file.rel)}: ${chars} characters`);
    }
    expect(over, "move a section out into the skill's references").toEqual([]);
  });

  it(`opens a reference over ${CONTENTS_FROM_LINES} lines with its contents`, async () => {
    const wrong: string[] = [];
    for (const file of await shippedMarkdown()) {
      if (!isReference(file.rel) || countLines(file.text) <= CONTENTS_FROM_LINES) continue;
      const { headings, contents } = outline(file.text);
      const [first, ...rest] = headings;
      if (first !== "Contents") {
        wrong.push(`${short(file.rel)}: does not open with a "## Contents" section`);
      } else if (JSON.stringify(contents) !== JSON.stringify(rest)) {
        wrong.push(`${short(file.rel)}: the contents list differs from its "##" headings`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("names no other reference from a reference, apart from the recorded backlog", async () => {
    const shipped = await shippedMarkdown();
    const references = new Set(shipped.map((file) => file.rel).filter(isReference));
    const measured = new Map<string, readonly string[]>();
    for (const file of shipped) {
      if (!references.has(file.rel)) continue;
      const named = referencesNamedBy(file, references);
      if (named.length > 0) measured.set(short(file.rel), named);
    }
    expect(Object.fromEntries(measured)).toEqual(Object.fromEntries(REFERENCE_POINTERS));
  });
});
