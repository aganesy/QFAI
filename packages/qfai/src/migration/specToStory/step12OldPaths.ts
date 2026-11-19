import { execFileSync, spawn } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import { isInside } from "../../core/validators/utils.js";
import { isRecord } from "../../core/workflow/parse.js";
import { scanBoundedRegularFile } from "../../shared/boundedRead.js";
import { MigrationInputError, type MigrationContext } from "./harness.js";

/** What step 12 reports about the project files it reads: items for a person, and the scan's own lines. */
export type OldPathScan = { items: string[]; scanned: string[] };

const NOT_CHECKED = "not checked: the project is not a git repository";
const SYMBOLIC_LINK = "120000";
const SUBMODULE = "160000";
const COPILOT_FILE = ".github/copilot-instructions.md";

/**
 * The most bytes of one file the scan reads. A text file past it is
 * named as not checked rather than read whole. Lifting it means matching lines
 * across blocks, which no project has needed yet.
 */
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const TOO_LARGE = "larger than 16 MiB";
const UNREADABLE = "could not be read";

/** The most characters of git's standard error kept for its message. */
const STDERR_MAX_CHARACTERS = 64 * 1024;

/** A character that makes `_policies/` or `spec-NNNN` part of a longer name when it touches either. */
const NAME_CHARACTER = String.raw`[\p{L}\p{Nd}_-]`;
const POLICIES = new RegExp(String.raw`(?<!${NAME_CHARACTER})_policies/`, "u");
const SPEC_ID = new RegExp(String.raw`(?<!${NAME_CHARACTER})spec-\d{4}(?!${NAME_CHARACTER})`, "u");

type OldPath = { label: string; names: (line: string) => boolean };

function written(label: string): OldPath {
  return { label, names: (line) => line.includes(label) };
}

/** The 1.x paths, in the order an item lists them. */
const OLD_PATHS: readonly OldPath[] = [
  written(".qfai/specs"),
  written(".qfai/contracts"),
  written(".qfai/prototypes"),
  written(".qfai/assistant/skills"),
  written(".qfai/assistant/agents"),
  written(".qfai/assistant/prompts"),
  written(".qfai/evidence/decisions"),
  written(".qfai/report/specs-coverage"),
  { label: "_policies/", names: (line) => POLICIES.test(line) },
  { label: "spec-NNNN", names: (line) => SPEC_ID.test(line) },
  written("assistant/instructions"),
  written("01_Spec.md"),
];

type TrackedEntry = { mode: string; file: string };

function gitFailure(args: readonly string[], stderr: string, cause: unknown): MigrationInputError {
  // A git that cannot be started has no stderr: its own message says why.
  const own = cause instanceof Error ? cause.message : "";
  return new MigrationInputError(stderr.trim() || own || `git ${args.join(" ")} failed`, {
    cause,
  });
}

/** Runs git from an argument vector, in English so a missing work tree reads the same everywhere. */
function gitOutput(root: string, args: readonly string[]): string {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "C" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (!isRecord(error)) throw error;
    throw gitFailure(args, typeof error.stderr === "string" ? error.stderr : "", error);
  }
}

function outsideWorkTree(error: unknown): boolean {
  return error instanceof MigrationInputError && /not a git repository/i.test(error.message);
}

function insideWorkTree(root: string): boolean {
  try {
    return gitOutput(root, ["rev-parse", "--is-inside-work-tree"]).trim() === "true";
  } catch (error) {
    if (outsideWorkTree(error)) return false;
    throw error;
  }
}

/**
 * The tracked entries as git stores them, taken from git's listing as it
 * arrives, so the listing is never held whole.
 */
async function* trackedEntries(root: string): AsyncGenerator<TrackedEntry> {
  const args = ["ls-files", "-z", "-s"];
  const child = spawn("git", args, {
    cwd: root,
    env: { ...process.env, LC_ALL: "C" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    if (stderr.length < STDERR_MAX_CHARACTERS) stderr += chunk;
  });
  const ended = new Promise<{ code: number | null; error?: Error }>((resolve) => {
    child.once("error", (error) => resolve({ code: null, error }));
    child.once("close", (code) => resolve({ code }));
  });
  try {
    // An unmerged path is listed once per stage, its stages side by side; a link or submodule stage decides.
    let pending: TrackedEntry | null = null;
    let rest = Buffer.alloc(0);
    for await (const chunk of child.stdout) {
      const bytes = Buffer.concat([
        rest,
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
      ]);
      let start = 0;
      for (let end = bytes.indexOf(0); end >= 0; end = bytes.indexOf(0, start)) {
        const record = bytes.toString("utf8", start, end);
        start = end + 1;
        const tab = record.indexOf("\t");
        if (tab < 0) continue;
        const entry = { mode: record.slice(0, record.indexOf(" ")), file: record.slice(tab + 1) };
        if (pending?.file === entry.file) {
          if (entry.mode === SYMBOLIC_LINK || entry.mode === SUBMODULE) pending = entry;
          continue;
        }
        if (pending !== null) yield pending;
        pending = entry;
      }
      rest = bytes.subarray(start);
    }
    const { code, error } = await ended;
    if (error !== undefined || code !== 0) throw gitFailure(args, stderr, error);
    if (pending !== null) yield pending;
  } finally {
    // A scan that ends early leaves no git behind it.
    if (child.exitCode === null) child.kill();
  }
}

function directoryPrefix(root: string, directory: string): string[] {
  const relative = path.relative(root, directory);
  const outside = relative === ".." || relative.startsWith(`..${path.sep}`);
  if (outside || path.isAbsolute(relative)) return [];
  // The project root itself holds every tracked path, which the empty prefix matches.
  if (relative === "") return [""];
  return [`${relative.split(path.sep).join("/")}/`];
}

/** Whether the scan leaves `entry` out, by what git records about it. */
function isExcluded(entry: TrackedEntry, prefixes: readonly string[]): boolean {
  return (
    entry.mode === SYMBOLIC_LINK ||
    entry.mode === SUBMODULE ||
    entry.file === COPILOT_FILE ||
    prefixes.some((prefix) => entry.file.startsWith(prefix))
  );
}

/** A file's text, nothing to scan (no regular file, or binary), or why it was not checked. */
type FileRead =
  { kind: "text"; text: string } | { kind: "skip" } | { kind: "unchecked"; why: string };

function isAbsentPath(error: unknown): boolean {
  return isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR");
}

/**
 * Where `file` is in the working tree once its directory is resolved, or
 * `null` when that directory is absent or resolves outside `boundary`, the
 * canonical project root: a directory link to elsewhere does not carry the
 * scan out of the project.
 */
async function insidePath(boundary: string, file: string): Promise<string | null> {
  const target = path.join(boundary, file);
  let parent: string;
  try {
    parent = await realpath(path.dirname(target));
  } catch (error) {
    if (isAbsentPath(error)) return null;
    throw error;
  }
  return isInside(boundary, parent) ? path.join(parent, path.basename(target)) : null;
}

/**
 * Reads a regular file of the working tree inside `boundary` a block at a
 * time, and stops at its first NUL byte. The read checks the file it opened,
 * so what was inspected is what is read.
 */
async function readableText(boundary: string, file: string): Promise<FileRead> {
  const target = await insidePath(boundary, file);
  if (target === null) return { kind: "skip" };
  try {
    if (!(await lstat(target)).isFile()) return { kind: "skip" };
  } catch (error) {
    if (isAbsentPath(error)) return { kind: "skip" };
    throw error;
  }
  const blocks: Buffer[] = [];
  const outcome = await scanBoundedRegularFile(target, MAX_FILE_BYTES, (block) => {
    if (block.includes(0)) return "stop";
    blocks.push(Buffer.from(block));
    return "continue";
  });
  switch (outcome) {
    case "stopped":
      return { kind: "skip" };
    case "unfinished":
      return { kind: "unchecked", why: TOO_LARGE };
    case "refused":
      return { kind: "unchecked", why: UNREADABLE };
    case "read":
      return { kind: "text", text: Buffer.concat(blocks).toString("utf8") };
  }
}

/** A file name for one report line: a control character is written as an escape, so a name cannot split it. */
export function reportableName(file: string): string {
  return Array.from(file, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x20 || (code >= 0x7f && code <= 0x9f)
      ? `\\x${code.toString(16).padStart(2, "0")}`
      : character;
  }).join("");
}

function oldPathItems(file: string, text: string): string[] {
  const items: string[] = [];
  for (const [at, line] of text.split(/\r?\n/).entries()) {
    const labels = OLD_PATHS.filter((oldPath) => oldPath.names(line)).map(
      (oldPath) => `\`${oldPath.label}\``,
    );
    if (labels.length > 0) {
      items.push(
        `old-path: ${reportableName(file)}:${at + 1}: still names 1.x paths: ${labels.join(", ")}`,
      );
    }
  }
  return items;
}

/**
 * Reads every tracked project file the migration did not write and lists each
 * line that still names a 1.x path. A file it could not check in full is named
 * in the scan's own lines. A git failure other than "not a git repository" is
 * an input failure.
 */
export async function scanOldPaths(context: MigrationContext): Promise<OldPathScan> {
  if (!insideWorkTree(context.root)) return { items: [], scanned: [NOT_CHECKED] };
  const prefixes = [
    ".qfai/",
    ...directoryPrefix(context.root, context.specsDir),
    ...directoryPrefix(context.root, context.contractsDir),
  ];
  // Every read stays under the canonical root, so a project reached through a link still holds its own files.
  const boundary = await realpath(context.root);
  const items: string[] = [];
  const unchecked: string[] = [];
  let checked = 0;
  for await (const entry of trackedEntries(context.root)) {
    if (isExcluded(entry, prefixes)) continue;
    const read = await readableText(boundary, entry.file);
    if (read.kind === "skip") continue;
    if (read.kind === "unchecked") {
      unchecked.push(`not checked for 1.x paths, ${read.why}: ${reportableName(entry.file)}`);
      continue;
    }
    checked += 1;
    items.push(...oldPathItems(entry.file, read.text));
  }
  return { items, scanned: [`files checked for 1.x paths: ${String(checked)}`, ...unchecked] };
}
