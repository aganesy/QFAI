/**
 * `QFAI-DPACK-012` (error): a file and line citation in the latest discussion
 * pack that cannot be opened where it says.
 *
 * A citation is a code span, or a `locator:` value, whose whole text is a
 * relative path ending in a file name with an extension, then `:` and a line
 * or a `start-end` range. Prose and fenced code blocks are not read, and
 * neither is anything holding `://`. Only the discussion profile runs this:
 * the code a pack cites changes in the stages after it. Whether the cited line supports the claim stays the reviewer's call;
 * this checks only that the file exists under the project root and holds the
 * line.
 */

import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { collectFiles } from "../fs.js";
import { maskFencedCodeBlocks } from "../ids.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const CODE = "QFAI-DPACK-012";

/** A file extension starts with a letter, so `127.0.0.1:8080` and `1.2:3` are not paths. */
const CITATION_RE = /^((?:[\w.$@~+-]+[/\\])*[\w.$@~+-]*\.[A-Za-z][A-Za-z0-9]*):(\d+)(?:-(\d+))?$/;
const CODE_SPAN_RE = /`([^`\n]+)`/g;
const LOCATOR_RE = /^\s*(?:-\s+)?locator:\s*["']?([^"'\s]+)["']?\s*$/;

type Citation = { text: string; file: string; start: number; end: number };

function readCitation(text: string): Citation | null {
  if (text.includes("://")) return null;
  const match = CITATION_RE.exec(text.trim());
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const start = Number(match[2]);
  return { text: text.trim(), file: match[1], start, end: Number(match[3] ?? start) };
}

/**
 * The citations of one line. A `locator:` value is read from the raw line,
 * since a research summary holds it inside a YAML fence; code spans are read
 * from the line with fenced blocks blanked, so an example in a fence is not one.
 */
function citationsOnLine(raw: string, unfenced: string): Citation[] {
  const found: Citation[] = [];
  const locator = LOCATOR_RE.exec(raw)?.[1];
  const fromLocator = locator === undefined ? null : readCitation(locator);
  if (fromLocator !== null) found.push(fromLocator);
  for (const span of unfenced.matchAll(CODE_SPAN_RE)) {
    const citation = readCitation(span[1] ?? "");
    if (citation !== null) found.push(citation);
  }
  return found;
}

/** Whether an error says only that a path is not there. */
function isAbsent(error: unknown): boolean {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP";
}

/** The names in each directory, read once per run. */
type Listings = Map<string, Promise<Set<string> | null>>;

function listing(listings: Listings, dir: string): Promise<Set<string> | null> {
  let names = listings.get(dir);
  if (names === undefined) {
    names = readdir(dir).then(
      (entries) => new Set(entries),
      (error: unknown) => {
        if (isAbsent(error)) return null;
        throw error;
      },
    );
    listings.set(dir, names);
  }
  return names;
}

/**
 * Whether each component of `parts` exists under `root` with that exact letter
 * case. A case-insensitive file system would open `Src/A.ts` as `src/a.ts`;
 * reading each directory's names makes the answer the same on every platform.
 */
async function existsWithExactCase(
  root: string,
  parts: readonly string[],
  listings: Listings,
): Promise<boolean> {
  let dir = root;
  for (const part of parts) {
    if (!(await listing(listings, dir))?.has(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

/**
 * The line count of a regular file under the root, or null when there is none.
 * A symbolic link that resolves outside the root counts as none.
 */
async function lineCount(
  root: string,
  relative: string,
  listings: Listings,
): Promise<number | null> {
  const parts = relative.split(/[/\\]/).filter((part) => part !== "" && part !== ".");
  if (parts.length === 0 || parts.includes("..")) return null;
  if (!(await existsWithExactCase(root, parts, listings))) return null;
  try {
    return await countLines(root, path.join(root, ...parts));
  } catch (error) {
    // A symbolic link whose target is gone is listed but cannot be opened.
    if (isAbsent(error)) return null;
    throw error;
  }
}

async function countLines(root: string, file: string): Promise<number | null> {
  const target = await realpath(file);
  const fromRoot = path.relative(await realpath(root), target);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) return null;
  if (!(await stat(target)).isFile()) return null;
  const text = (await readFile(target, "utf-8")).replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  return text.endsWith("\n") ? lines.length - 1 : lines.length;
}

function problem(citation: Citation, count: number | null): string | null {
  if (count === null) return "names no file under the project root";
  if (citation.start < 1 || citation.end < citation.start) return "names no line of the file";
  if (citation.end > count) return `is past the end of the file, which has ${count} lines`;
  return null;
}

export async function validateDiscussionCitations(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const packDir = await findLatestDiscussionPackDir(resolvePath(root, config, "discussionDir"));
  if (packDir === null) return [];
  const files = await collectFiles(packDir, { extensions: [".md"] });
  const issues: Issue[] = [];
  const listings: Listings = new Map();
  for (const file of files.sort()) {
    const text = await readFile(file, "utf-8");
    const lines = text.split(/\r?\n/);
    const unfenced = maskFencedCodeBlocks(text).split("\n");
    for (const [index, line] of lines.entries()) {
      for (const citation of citationsOnLine(line, unfenced[index] ?? "")) {
        const why = problem(citation, await lineCount(root, citation.file, listings));
        if (why === null) continue;
        issues.push(
          issue(
            CODE,
            `Line ${index + 1} cites ${citation.text}, which ${why}.`,
            "error",
            file,
            "discussionPack.citation",
            [citation.text],
            "change",
            "Cite the file by its path from the project root and a line it holds, or remove the citation.",
          ),
        );
      }
    }
  }
  return issues;
}
