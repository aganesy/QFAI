import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { link, lstat, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { loadConfig, resolvePath } from "../../core/config.js";
import {
  findUnsafeHostFileComponent,
  type PinnedFileRead,
  readPinnedRegularFileBytes,
} from "../../core/init/fsGuards.js";
import { error, info } from "../../core/logger.js";
import { isGitConflictOutput, mergeDocument } from "../../core/storyTree/sentenceMerge.js";
import { validateDocumentSchema } from "../../core/validators/documentSchema.js";
import { EXIT_CODES } from "../lib/exitCodes.js";

const execute = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;
const DOCUMENT = /\.(?:md|ya?ml)$/u;
/** An opening or closing marker; either one left behind means the file is not resolved. */
const CONFLICT_MARKER = /^(?:<{7,}|>{7,})(?: |\r?$)/mu;
const OWN_MARKER = /^(?:<<<<<<< ours|>>>>>>> theirs)\r?$/mu;
const REGULAR_FILE = new Set(["100644", "100755"]);
const SCHEMA_VIOLATION = "QFAI-DOCSCHEMA-001";
const UNSAFE_PATH =
  "its working file or a directory above it is a symbolic link, or a directory above it is not a directory";
/** The largest working file read, held whole in memory; a story-tree document is far smaller. */
const MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;
/** Why a document is left when its working file is saved or replaced while it is merged. */
const CHANGED = "the working file changed while it was merged";
/** Tries of a rename Windows refuses while another process briefly holds the file open. */
const RENAME_TRIES = 5;

type Stage = { mode: string; sha: string };
type Stages = { base?: Stage; ours?: Stage; theirs?: Stage };
type Outcome = { kind: "merged" | "unchanged" | "left"; message: string };

/**
 * `qfai sdd merge-docs`: merges each story-tree document git reports as unmerged, from the base,
 * ours and theirs stages of the index, writes the result to the working file, and runs the
 * document-schema check on the documents it merged or found already without conflict markers.
 *
 * @returns 0 when every document merged and conforms, 1 when one is left for a person or the
 *   check finds or cannot run, 2 when the command could not run
 */
export async function runSddMergeDocsCommand(options: { root: string }): Promise<number> {
  const root = path.resolve(options.root);
  try {
    const loaded = await loadConfig(root);
    if (loaded.issues.length) throw new Error("Correct qfai.config.yaml before merging documents.");
    const scope = (path.relative(root, resolvePath(root, loaded.config, "specsDir")) || ".")
      .split(path.sep)
      .join("/");
    const unmerged = readUnmerged(
      await gitText(root, ["--literal-pathspecs", "ls-files", "-u", "-z", "--", scope]),
    );
    if (unmerged.size === 0) {
      info(`qfai sdd merge-docs: no conflicted document under ${scope}; nothing to merge.`);
      return EXIT_CODES.ok;
    }
    const checked: string[] = [];
    const counts = { merged: 0, unchanged: 0, left: 0 };
    for (const [file, stages] of [...unmerged].sort(([a], [b]) => a.localeCompare(b))) {
      const outcome = await mergeOne(root, file, stages);
      info(`${file}: ${outcome.message}`);
      counts[outcome.kind] += 1;
      if (outcome.kind !== "left") checked.push(file);
    }
    const issues = (await validateDocumentSchema(root, loaded.config)).filter(
      (finding) =>
        finding.code !== SCHEMA_VIOLATION ||
        (finding.file !== undefined && checked.includes(finding.file)),
    );
    for (const finding of issues) info(`${finding.code} ${finding.message}`);
    const notRun = issues.some((finding) => finding.code !== SCHEMA_VIOLATION);
    info(
      `qfai sdd merge-docs: ${counts.merged} merged, ${counts.unchanged} already without conflict markers, ${counts.left} left for a person; document-schema check: ${notRun ? "did not run" : `${issues.length} finding(s)`}. Review the result, then stage it with git add.`,
    );
    return counts.left > 0 || issues.length > 0 ? EXIT_CODES.findings : EXIT_CODES.ok;
  } catch (failure) {
    error(`qfai sdd merge-docs: ${failure instanceof Error ? failure.message : String(failure)}`);
    return EXIT_CODES.inputError;
  }
}

async function mergeOne(root: string, file: string, stages: Stages): Promise<Outcome> {
  const left = (reason: string): Outcome => ({ kind: "left", message: `left as is; ${reason}` });
  if (stages.ours === undefined || stages.theirs === undefined) return left("one side deleted it");
  const present = [stages.base, stages.ours, stages.theirs].filter((stage) => stage !== undefined);
  if (present.some((stage) => !REGULAR_FILE.has(stage.mode)))
    return left("it is not a regular file");
  const segments = file.split("/");
  const target = path.join(root, ...segments);
  if ((await findUnsafeHostFileComponent(root, segments)) !== undefined) return left(UNSAFE_PATH);
  let pinned: PinnedFileRead | null;
  try {
    pinned = await readPinnedRegularFileBytes(target, MAX_DOCUMENT_BYTES);
  } catch (failure) {
    return left(
      `the working file could not be read: ${failure instanceof Error ? failure.message : String(failure)}`,
    );
  }
  if (pinned === null) return left("the working file is not a regular file of at most 16 MiB");
  const working = utf8Text(pinned.content);
  if (working === null) return left("the working file is not UTF-8 text");
  if (!CONFLICT_MARKER.test(working))
    return { kind: "unchanged", message: "left as is; the working file holds no conflict markers" };
  if (OWN_MARKER.test(working))
    return left("it holds the markers of an earlier merge-docs run; resolve it by hand");
  const texts = await Promise.all(
    [stages.base, stages.ours, stages.theirs].map((stage) =>
      stage === undefined ? Promise.resolve("") : readBlob(root, stage.sha),
    ),
  );
  const [base = "", ours = "", theirs = ""] = texts;
  if (texts.some((text) => text === null)) return left("it is not UTF-8 text");
  if (!(await isGitConflictOutput(working, base ?? "", ours ?? "", theirs ?? "")))
    return left(
      "the working file does not match Git's conflict output for its stages (a hand edit or a non-default conflict style)",
    );
  const merged = await mergeDocument(base ?? "", ours ?? "", theirs ?? "");
  if (merged === null) return left("a line in it reads as a merge marker");
  const replaced = await replacePinned(root, segments, pinned, merged.text);
  if (replaced !== null) return left(replaced);
  return merged.conflicts === 0
    ? { kind: "merged", message: "merged" }
    : left(`merged around ${merged.conflicts} conflict(s), left between markers`);
}

/** The text of UTF-8 bytes, with any byte order mark kept, or `null` when they are not UTF-8. */
function utf8Text(bytes: Buffer): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Replaces the working file with `text` without overwriting anything but the file that was read.
 * The working file is first renamed aside, so no later save through its name can reach it, and
 * checked there to be the same file holding the same bytes; the merged text, written to a
 * temporary file beside it, is then hard-linked into the name, which fails rather than overwrite
 * a file an editor saved there meanwhile. A file that is not the one read is put back. Node has
 * no compare-and-swap rename; these two steps stand in for one, and leave no moment at which a
 * save through the name is overwritten.
 *
 * Ceiling: a program that already holds the working file open and writes into it after it is set
 * aside writes into the copy that is then removed, and on a file system without hard links the
 * temporary file is renamed into the name only after the name is found empty, so a file created
 * there in that instant is overwritten. A story-tree document is edited by the person running the
 * merge, so neither is expected; a file system that supports `renameat2` exchange would lift both.
 * The replacement is a new file with the old file's mode, so its owner is whoever runs the command
 * and a hard link to the old file keeps the old text.
 *
 * @returns `null` once the file is replaced, or why it was left as is
 */
async function replacePinned(
  root: string,
  segments: string[],
  pinned: PinnedFileRead,
  text: string,
): Promise<string | null> {
  const target = path.join(root, ...segments);
  const stem = path.join(
    path.dirname(target),
    `.${path.basename(target)}.merge-docs-${randomBytes(6).toString("hex")}`,
  );
  const temporary = `${stem}.new`;
  const aside = `${stem}.old`;
  const handle = await open(temporary, "wx", pinned.mode);
  try {
    try {
      await handle.writeFile(text, "utf8");
      await handle.chmod(pinned.mode);
    } finally {
      await handle.close();
    }
    const moved = await retried(async () => {
      if ((await findUnsafeHostFileComponent(root, segments)) !== undefined) return UNSAFE_PATH;
      await rename(target, aside);
      return null;
    }).catch((failure: unknown) => {
      if (errorCode(failure) === "ENOENT") return CHANGED;
      throw failure;
    });
    if (moved !== null) return moved;
    if (!(await holdsRead(aside, pinned))) return await putBack(aside, target);
    let placed: boolean;
    try {
      placed = await placeWithoutOverwrite(temporary, target);
    } catch (failure) {
      await putBack(aside, target);
      throw failure;
    }
    await rm(aside, { force: true, maxRetries: RENAME_TRIES });
    return placed ? null : CHANGED;
  } finally {
    await rm(temporary, { force: true, maxRetries: RENAME_TRIES });
  }
}

/** Whether `file` is still the file that was read, holding the bytes that were read. */
async function holdsRead(file: string, pinned: PinnedFileRead): Promise<boolean> {
  const now = await readPinnedRegularFileBytes(file, MAX_DOCUMENT_BYTES).catch(() => null);
  return (
    now !== null &&
    now.dev === pinned.dev &&
    now.ino === pinned.ino &&
    now.content.equals(pinned.content)
  );
}

/**
 * Returns a file set aside to its name, unless a file was saved there meanwhile; then the set-aside
 * file is kept and named.
 *
 * @returns why the document is left as is
 */
async function putBack(aside: string, target: string): Promise<string> {
  if (!(await placeWithoutOverwrite(aside, target)))
    return `${CHANGED}; the file its name held before is kept as ${path.basename(aside)}`;
  await rm(aside, { force: true, maxRetries: RENAME_TRIES });
  return CHANGED;
}

/**
 * Gives `from` the name `to` only while nothing holds that name: a hard link, which fails when the
 * name exists, or, where the file system has no hard links, a rename once the name is found empty.
 *
 * @returns `true` once `to` names the file, `false` when another file holds the name
 */
async function placeWithoutOverwrite(from: string, to: string): Promise<boolean> {
  try {
    await link(from, to);
    return true;
  } catch (failure) {
    if (errorCode(failure) === "EEXIST") return false;
    if ((await lstat(to).catch(() => undefined)) !== undefined) return false;
    await retried(() => rename(from, to));
    return true;
  }
}

/**
 * Runs a rename, retrying the `EPERM` or `EACCES` Windows reports while an editor, an indexer or a
 * virus scanner briefly holds the file open, where writing through the name succeeded.
 */
async function retried<T>(step: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await step();
    } catch (failure) {
      const code = errorCode(failure);
      const transient = process.platform === "win32" && (code === "EPERM" || code === "EACCES");
      if (!transient || attempt >= RENAME_TRIES) throw failure;
      await delay(50 * attempt);
    }
  }
}

function errorCode(failure: unknown): unknown {
  return failure instanceof Error && "code" in failure ? failure.code : undefined;
}

/**
 * The index stages of each unmerged Markdown or YAML document, from `git ls-files -u -z`. Any other
 * unmerged file is not a document this command merges, so it is left to Git and not counted.
 */
function readUnmerged(output: string): Map<string, Stages> {
  const unmerged = new Map<string, Stages>();
  for (const entry of output.split("\0")) {
    const match = /^(\d+) ([0-9a-f]+) ([123])\t(.+)$/su.exec(entry);
    if (!match?.[1] || !match[2] || !match[4] || !DOCUMENT.test(match[4])) continue;
    const stage = { mode: match[1], sha: match[2] };
    const stages = unmerged.get(match[4]) ?? {};
    if (match[3] === "1") stages.base = stage;
    else if (match[3] === "2") stages.ours = stage;
    else stages.theirs = stage;
    unmerged.set(match[4], stages);
  }
  return unmerged;
}

/** A blob as text, or null when it is not valid UTF-8. */
async function readBlob(cwd: string, sha: string): Promise<string | null> {
  const { stdout } = await execute("git", ["cat-file", "blob", sha], {
    cwd,
    maxBuffer: MAX_BUFFER,
    encoding: "buffer",
  });
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  } catch {
    return null;
  }
}

async function gitText(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execute("git", args, { cwd, maxBuffer: MAX_BUFFER, encoding: "utf8" });
  return stdout;
}
