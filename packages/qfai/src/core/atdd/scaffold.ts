import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { atddTestKindDirs } from "../atddTraceability.js";
import { hasErrnoCode } from "../fs/errno.js";
import { isStoryTreeId } from "../storyTree/ids.js";
import { DEFAULT_SCAFFOLD_DIALECT, type ScaffoldDialect } from "./scaffoldDialect.js";

export type ScaffoldTarget =
  { id: string; kind: "AC"; storyId: string } | { id: string; kind: "BF" };

export function isScaffoldTarget(target: ScaffoldTarget): boolean {
  return target.kind === "AC"
    ? isStoryTreeId(target.id, "AC") &&
        isStoryTreeId(target.storyId, "US") &&
        target.id.slice(3, 12) === target.storyId.slice(3)
    : isStoryTreeId(target.id, "BF");
}

export function buildSkeleton(
  target: ScaffoldTarget,
  dialect: ScaffoldDialect = DEFAULT_SCAFFOLD_DIALECT,
): string {
  if (!isScaffoldTarget(target)) throw new TypeError(`Invalid scaffold target: ${target.id}`);
  return [
    `${dialect.commentPrefix} QFAI:${target.id}`,
    "",
    ...dialect.buildBody(target.id),
    "",
  ].join("\n");
}

export type EmitSkeletonResult = {
  destPath: string;
  wrote: boolean;
  /** The hidden staging file this run wrote and could not remove, if any. */
  leftBehind?: string;
};

/**
 * Write `body` at `destPath` unless a test is already there. The full body is
 * written to a hidden file beside `destPath` first and published by `link`,
 * which refuses a taken path, so a failed write leaves nothing at `destPath`
 * that a retry would keep as an existing test, and an existing test is never
 * replaced.
 *
 * Ceiling: where `link` fails for any other reason, such as a filesystem
 * without hard links (FAT32 and exFAT among them, whose error code varies by
 * platform), the body is written straight to `destPath` through an exclusive
 * create, so a write that fails there can still leave a partial file. A
 * no-replace rename exposed to Node lifts it.
 */
export async function emitSkeleton(
  target: ScaffoldTarget,
  destPath: string,
  body: string,
): Promise<EmitSkeletonResult> {
  if (!isScaffoldTarget(target)) throw new TypeError(`Invalid scaffold target: ${target.id}`);
  await mkdir(path.dirname(destPath), { recursive: true });
  // The name leaves out the destination's, so a name near the length limit still stages.
  const staged = path.join(
    path.dirname(destPath),
    `.qfai-scaffold-${randomBytes(6).toString("hex")}.tmp`,
  );
  let outcome: { wrote: boolean } | { error: unknown };
  try {
    outcome = { wrote: await publishStaged(staged, destPath, body) };
  } catch (error) {
    outcome = { error };
  }
  // Removal is best-effort, so it never replaces the publish result or its error.
  const leftBehind = await removeStaged(staged);
  if ("error" in outcome) throw outcome.error;
  const { wrote } = outcome;
  if (!wrote) await assertReadableTestFile(destPath);
  return leftBehind === undefined ? { destPath, wrote } : { destPath, wrote, leftBehind };
}

/**
 * Write the complete `body` to `staged` and publish it at `destPath`. Resolves
 * `false`, writing nothing at `destPath`, when an entry is already there. A
 * `link` that fails for any other reason falls back to an exclusive create
 * once `lstat` finds nothing at `destPath`.
 */
async function publishStaged(staged: string, destPath: string, body: string): Promise<boolean> {
  await writeFile(staged, body, { encoding: "utf8", flag: "wx" });
  try {
    await link(staged, destPath);
    return true;
  } catch (error) {
    if (isTaken(error) || (await entryExists(destPath))) return false;
  }
  try {
    await writeFile(destPath, body, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if (isTaken(error)) return false;
    throw error;
  }
}

/** The error a create raises when its path is already taken. */
function isTaken(error: unknown): boolean {
  return hasErrnoCode(error) && error.code === "EEXIST";
}

async function entryExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ENOENT") return false;
    throw error;
  }
}

/** Remove the staging file; return its path when it could not be removed. */
async function removeStaged(staged: string): Promise<string | undefined> {
  try {
    await rm(staged, { force: true });
    return undefined;
  } catch {
    return staged;
  }
}

/** Open errors that say the destination is a link or a directory rather than a file. */
const NOT_A_FILE_CODES = new Set(["ELOOP", "EISDIR", "ENOENT"]);

/**
 * Only an existing, readable test file is kept. A directory, a link or a FIFO
 * at the destination is not a test, and a file the run cannot read is not one
 * it can report as kept.
 *
 * Everything is judged through one descriptor, opened without following a
 * link and without blocking where the platform offers both. Where it does not,
 * the path's own `lstat` has to name the file the descriptor holds.
 */
async function assertReadableTestFile(destPath: string): Promise<void> {
  const notATest = (cause: unknown) =>
    new Error(`${destPath} exists and is not a test file`, { cause });
  // Windows defines neither flag, whatever the type declarations say.
  const optional: Partial<Record<"O_NOFOLLOW" | "O_NONBLOCK", number>> = constants;
  const flags = constants.O_RDONLY | (optional.O_NOFOLLOW ?? 0) | (optional.O_NONBLOCK ?? 0);
  let handle;
  try {
    handle = await open(destPath, flags);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (typeof code === "string" && NOT_A_FILE_CODES.has(code)) throw notATest(error);
    throw error;
  }
  try {
    const held = await handle.stat({ bigint: true });
    const named = await lstat(destPath, { bigint: true });
    if (!held.isFile() || !named.isFile() || held.ino !== named.ino || held.dev !== named.dev) {
      throw notATest(undefined);
    }
    await handle.read(Buffer.alloc(1), 0, 1, 0);
  } finally {
    await handle.close();
  }
}

export function scaffoldDestPath(
  root: string,
  target: ScaffoldTarget,
  testsDir: string = "tests",
  dialect: ScaffoldDialect = DEFAULT_SCAFFOLD_DIALECT,
): string {
  if (!isScaffoldTarget(target)) throw new TypeError(`Invalid scaffold target: ${target.id}`);
  const testsRoot = path.resolve(root, testsDir);
  const relative = path.relative(root, testsRoot).replace(/\\/g, "/");
  const homes = atddTestKindDirs(relative);
  const home = target.kind === "AC" ? homes.integration : homes.e2e;
  const directory = path.resolve(root, home.replace(/\/\*\*$/, ""));
  return path.join(
    directory,
    ...(target.kind === "AC" ? [target.storyId] : []),
    dialect.fileName(target.id),
  );
}
