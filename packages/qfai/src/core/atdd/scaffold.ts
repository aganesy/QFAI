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
};

/**
 * Write `body` at `destPath` unless a test is already there. The full body is
 * written to a hidden file beside `destPath` first and published by `link`,
 * which refuses a taken path, so a failed write leaves nothing at `destPath`
 * that a retry would keep as an existing test, and an existing test is never
 * replaced.
 *
 * Ceiling: on a filesystem without hard links the body is written straight to
 * `destPath` through an exclusive create, so a write that fails there can
 * still leave a partial file. A no-replace rename exposed to Node lifts it.
 */
export async function emitSkeleton(
  target: ScaffoldTarget,
  destPath: string,
  body: string,
): Promise<EmitSkeletonResult> {
  if (!isScaffoldTarget(target)) throw new TypeError(`Invalid scaffold target: ${target.id}`);
  await mkdir(path.dirname(destPath), { recursive: true });
  try {
    await publishNewFile(destPath, body);
    return { destPath, wrote: true };
  } catch (error) {
    if (!(hasErrnoCode(error) && error.code === "EEXIST")) throw error;
    await assertReadableTestFile(destPath);
    return { destPath, wrote: false };
  }
}

/** The `link` errors that mean the filesystem has no hard links, not that the path is taken. */
const NO_HARD_LINKS = new Set(["EPERM", "ENOSYS", "ENOTSUP", "EOPNOTSUPP", "EXDEV"]);

/** Put the complete `body` at `destPath`, failing with `EEXIST` when an entry is already there. */
async function publishNewFile(destPath: string, body: string): Promise<void> {
  // The name leaves out the destination's, so a name near the length limit still stages.
  const staged = path.join(
    path.dirname(destPath),
    `.qfai-scaffold-${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    await writeFile(staged, body, { encoding: "utf8", flag: "wx" });
    try {
      await link(staged, destPath);
    } catch (error) {
      if (!(hasErrnoCode(error) && NO_HARD_LINKS.has(error.code))) throw error;
      await writeFile(destPath, body, { encoding: "utf8", flag: "wx" });
    }
  } finally {
    await rm(staged, { force: true });
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
