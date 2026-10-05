import { constants } from "node:fs";
import { lstat, mkdir, open } from "node:fs/promises";
import path from "node:path";

import { atddTestKindDirs } from "../atddTraceability.js";
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

export async function emitSkeleton(
  target: ScaffoldTarget,
  destPath: string,
  body: string,
): Promise<EmitSkeletonResult> {
  if (!isScaffoldTarget(target)) throw new TypeError(`Invalid scaffold target: ${target.id}`);
  await mkdir(path.dirname(destPath), { recursive: true });
  try {
    const handle = await open(destPath, "wx");
    try {
      await handle.writeFile(body, "utf8");
    } finally {
      await handle.close();
    }
    return { destPath, wrote: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    await assertReadableTestFile(destPath);
    return { destPath, wrote: false };
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
