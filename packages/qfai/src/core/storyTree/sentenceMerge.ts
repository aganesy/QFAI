import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;
/** Longer than any rule or setext underline a document holds, so no content line reads as one. */
const MARKER_SIZE = 40;
const RESERVED_MARKER = new RegExp(`^([<|=>])\\1{${MARKER_SIZE - 1}}`);
/** The token that stands for a line end while sentences are merged. */
const LINE_END = "␞ qfai merge-docs line end ␞";
/**
 * A sentence ends after `.`, `?` or `!` (and any closing quote, bracket or emphasis) followed by
 * blank space; a table cell ends after an unescaped `|`. The split keeps every character, so
 * joining the pieces gives the line back.
 */
const PIECE_BOUNDARY = /(?<=(?:[.!?][)\]"'`*_]*|(?<!\\)\|)[ \t]+)(?=\S)/u;

type Hunk =
  | { kind: "clean"; lines: string[] }
  | { kind: "conflict"; base: string[]; ours: string[]; theirs: string[] };

type Resolved = { lines: string[]; conflicts: number };

export type MergedDocument = { text: string; conflicts: number };

/**
 * Merges three versions of one story-tree document.
 *
 * A line merge runs first. Each region it cannot settle is merged again: row by row, keyed by
 * the first cell, when every line in it is a table row, and otherwise sentence by sentence. What
 * is still unsettled is written between standard conflict markers around the whole lines.
 *
 * @returns null when a line of the input could be read as a merge marker
 */
export async function mergeDocument(
  base: string,
  ours: string,
  theirs: string,
): Promise<MergedDocument | null> {
  const versions = [base, ours, theirs].map(toLines);
  if (versions.some((lines) => lines.some((line) => isReserved(line)))) return null;
  const [baseLines = [], ourLines = [], theirLines = []] = versions;
  const lines: string[] = [];
  let conflicts = 0;
  for (const hunk of await mergeFile(baseLines, ourLines, theirLines)) {
    if (hunk.kind === "clean") {
      lines.push(...hunk.lines);
      continue;
    }
    const resolved =
      (await mergeRows(hunk.base, hunk.ours, hunk.theirs)) ??
      (await mergeSentences(hunk.base, hunk.ours, hunk.theirs));
    lines.push(...resolved.lines);
    conflicts += resolved.conflicts;
  }
  return { text: lines.map((line) => `${line}\n`).join(""), conflicts };
}

function toLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function isReserved(line: string): boolean {
  return RESERVED_MARKER.test(line) || line.includes(LINE_END);
}

/** Merges a region of table rows key by key; null when it is not such a region. */
async function mergeRows(
  base: string[],
  ours: string[],
  theirs: string[],
): Promise<Resolved | null> {
  const baseRows = keyRows(base);
  const ourRows = keyRows(ours);
  const theirRows = keyRows(theirs);
  if (!baseRows || !ourRows || !theirRows) return null;
  const keys = [...ourRows.keys(), ...[...theirRows.keys()].filter((key) => !ourRows.has(key))];
  const lines: string[] = [];
  let conflicts = 0;
  for (const key of keys) {
    const resolved = await mergeUnit(baseRows.get(key), ourRows.get(key), theirRows.get(key));
    lines.push(...resolved.lines);
    conflicts += resolved.conflicts;
  }
  return { lines, conflicts };
}

/** Each row by its first cell; null when a line is not a row or two rows share a key. */
function keyRows(lines: string[]): Map<string, string> | null {
  const rows = new Map<string, string>();
  for (const line of lines) {
    const key = firstCell(line);
    if (key === null || rows.has(key)) return null;
    rows.set(key, line);
  }
  return rows;
}

function firstCell(line: string): string | null {
  const row = line.trim();
  if (!row.startsWith("|")) return null;
  const cell = /^\|((?:\\.|[^|\\])*)\|/u.exec(row)?.[1]?.trim();
  return cell ? cell : null;
}

async function mergeUnit(
  base: string | undefined,
  ours: string | undefined,
  theirs: string | undefined,
): Promise<Resolved> {
  const kept = (line: string | undefined): Resolved => ({
    lines: line === undefined ? [] : [line],
    conflicts: 0,
  });
  if (ours === theirs) return kept(ours);
  if (base === ours) return kept(theirs);
  if (base === theirs) return kept(ours);
  if (base !== undefined && ours !== undefined && theirs !== undefined)
    return mergeSentences([base], [ours], [theirs]);
  return {
    lines: conflictBlock(ours === undefined ? [] : [ours], theirs === undefined ? [] : [theirs]),
    conflicts: 1,
  };
}

async function mergeSentences(base: string[], ours: string[], theirs: string[]): Promise<Resolved> {
  return rejoin(await mergeFile(tokens(base), tokens(ours), tokens(theirs)));
}

function tokens(lines: string[]): string[] {
  return lines.flatMap((line) => [...(line === "" ? [] : line.split(PIECE_BOUNDARY)), LINE_END]);
}

/**
 * Joins merged sentence tokens into lines. A line an unsettled region touches is written in both
 * versions between conflict markers, and the block closes at the next line end both sides share.
 */
function rejoin(hunks: Hunk[]): Resolved {
  const lines: string[] = [];
  let conflicts = 0;
  let ourLine = "";
  let theirLine = "";
  let ourLines: string[] = [];
  let theirLines: string[] = [];
  let open = false;
  const close = (): void => {
    if (ourLines.join("\n") === theirLines.join("\n")) lines.push(...ourLines);
    else {
      lines.push(...conflictBlock(ourLines, theirLines));
      conflicts += 1;
    }
    ourLines = [];
    theirLines = [];
    open = false;
  };
  for (const hunk of hunks) {
    if (hunk.kind === "conflict") {
      open = true;
      for (const token of hunk.ours) {
        if (token === LINE_END) {
          ourLines.push(ourLine);
          ourLine = "";
        } else ourLine += token;
      }
      for (const token of hunk.theirs) {
        if (token === LINE_END) {
          theirLines.push(theirLine);
          theirLine = "";
        } else theirLine += token;
      }
      continue;
    }
    for (const token of hunk.lines) {
      if (token !== LINE_END) {
        ourLine += token;
        theirLine += token;
        continue;
      }
      if (open) {
        ourLines.push(ourLine);
        theirLines.push(theirLine);
        close();
      } else lines.push(ourLine);
      ourLine = "";
      theirLine = "";
    }
  }
  if (open) {
    if (ourLine !== "") ourLines.push(ourLine);
    if (theirLine !== "") theirLines.push(theirLine);
    close();
  } else if (ourLine !== "") lines.push(ourLine);
  return { lines, conflicts };
}

function conflictBlock(ours: string[], theirs: string[]): string[] {
  return ["<<<<<<< ours", ...ours, "=======", ...theirs, ">>>>>>> theirs"];
}

/** A three-way merge of line lists by `git merge-file`, split into settled and unsettled regions. */
async function mergeFile(base: string[], ours: string[], theirs: string[]): Promise<Hunk[]> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-merge-docs-"));
  try {
    const write = async (name: string, lines: string[]): Promise<string> => {
      const file = path.join(dir, name);
      await writeFile(file, lines.map((line) => `${line}\n`).join(""), "utf8");
      return file;
    };
    const files = [
      await write("ours", ours),
      await write("base", base),
      await write("theirs", theirs),
    ];
    const args = ["merge-file", "-p", "--diff3", `--marker-size=${MARKER_SIZE}`];
    const labels = ["-L", "ours", "-L", "base", "-L", "theirs"];
    return parseMerge(await runMergeFile([...args, ...labels, ...files], dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runMergeFile(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execute("git", args, { cwd, maxBuffer: MAX_BUFFER, encoding: "utf8" });
    return stdout;
  } catch (failure) {
    // git merge-file exits with the number of conflicts, at most 127; above that it failed.
    const code = failure instanceof Error && "code" in failure ? failure.code : undefined;
    const stdout = failure instanceof Error && "stdout" in failure ? failure.stdout : undefined;
    if (typeof code === "number" && code > 0 && code < 128 && typeof stdout === "string")
      return stdout;
    throw failure;
  }
}

function parseMerge(output: string): Hunk[] {
  const marker = (char: string, label = ""): string =>
    `${char.repeat(MARKER_SIZE)}${label ? ` ${label}` : ""}`;
  const hunks: Hunk[] = [];
  let clean: string[] = [];
  let conflict: { base: string[]; ours: string[]; theirs: string[] } | null = null;
  let side: "ours" | "base" | "theirs" = "ours";
  for (const line of toLines(output)) {
    if (conflict === null && line === marker("<", "ours")) {
      if (clean.length > 0) hunks.push({ kind: "clean", lines: clean });
      clean = [];
      conflict = { base: [], ours: [], theirs: [] };
      side = "ours";
    } else if (conflict !== null && line === marker("|", "base")) side = "base";
    else if (conflict !== null && line === marker("=")) side = "theirs";
    else if (conflict !== null && line === marker(">", "theirs")) {
      hunks.push({ kind: "conflict", ...conflict });
      conflict = null;
    } else if (conflict !== null) conflict[side].push(line);
    else clean.push(line);
  }
  if (conflict !== null) throw new Error("git merge-file left an unterminated conflict region");
  if (clean.length > 0) hunks.push({ kind: "clean", lines: clean });
  return hunks;
}
