import { execFileSync } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import { isRecord } from "../../core/workflow/parse.js";
import { MigrationInputError, type MigrationContext } from "./harness.js";

/** What step 12 reports about the project files it reads: items for a person, and the scan's own line. */
export type OldPathScan = { items: string[]; scanned: string };

const NOT_CHECKED = "not checked: the project is not a git repository";
const SYMBOLIC_LINK = "120000";
const SUBMODULE = "160000";
const COPILOT_FILE = ".github/copilot-instructions.md";

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
  written("assistant/steering"),
  written("assistant/instructions"),
  written("01_Spec.md"),
];

type TrackedEntry = { mode: string; file: string };

/** Runs git from an argument vector, in English so a missing work tree reads the same everywhere. */
function gitOutput(root: string, args: readonly string[]): string {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: Infinity,
      env: { ...process.env, LC_ALL: "C" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (!isRecord(error)) throw error;
    // A git that cannot be started has no stderr: its own message says why.
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const own = typeof error.message === "string" ? error.message : "";
    throw new MigrationInputError(stderr || own || `git ${args.join(" ")} failed`, {
      cause: error,
    });
  }
}

function outsideWorkTree(error: unknown): boolean {
  return error instanceof MigrationInputError && /not a git repository/i.test(error.message);
}

/** The tracked entries as git stores them, or `null` when the directory is outside a git work tree. */
function trackedEntries(root: string): TrackedEntry[] | null {
  try {
    if (gitOutput(root, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") return null;
  } catch (error) {
    if (outsideWorkTree(error)) return null;
    throw error;
  }
  // An unmerged path is listed once per stage; a link or submodule stage decides.
  const modes = new Map<string, string>();
  for (const record of gitOutput(root, ["ls-files", "-z", "-s"]).split("\0")) {
    const tab = record.indexOf("\t");
    if (tab < 0) continue;
    const file = record.slice(tab + 1);
    const mode = record.slice(0, record.indexOf(" "));
    if (!modes.has(file) || mode === SYMBOLIC_LINK || mode === SUBMODULE) modes.set(file, mode);
  }
  return [...modes].map(([file, mode]) => ({ mode, file }));
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

/** The text of a regular file in the working tree, or `null` for anything else or a binary file. */
async function readableText(root: string, file: string): Promise<string | null> {
  const target = path.join(root, file);
  try {
    if (!(await lstat(target)).isFile()) return null;
  } catch (error) {
    if (isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR")) return null;
    throw error;
  }
  const content = await readFile(target);
  return content.includes(0) ? null : content.toString("utf8");
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
 * line that still names a 1.x path. A git failure other than "not a git
 * repository" is an input failure.
 */
export async function scanOldPaths(context: MigrationContext): Promise<OldPathScan> {
  const tracked = trackedEntries(context.root);
  if (tracked === null) return { items: [], scanned: NOT_CHECKED };
  const prefixes = [
    ".qfai/",
    ...directoryPrefix(context.root, context.specsDir),
    ...directoryPrefix(context.root, context.contractsDir),
  ];
  const items: string[] = [];
  let checked = 0;
  for (const entry of tracked) {
    if (isExcluded(entry, prefixes)) continue;
    const text = await readableText(context.root, entry.file);
    if (text === null) continue;
    checked += 1;
    items.push(...oldPathItems(entry.file, text));
  }
  return { items, scanned: `files checked for 1.x paths: ${checked}` };
}
