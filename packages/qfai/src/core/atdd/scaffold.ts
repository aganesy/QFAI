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
    // Only an existing test file is kept. A directory or a dangling link at the
    // destination is not a test, and reporting it as one hides the collision.
    if (!(await lstat(destPath)).isFile()) {
      throw new Error(`${destPath} exists and is not a test file`, { cause: error });
    }
    // A test file the run cannot read is not one it can report as kept.
    await (await open(destPath, "r")).close();
    return { destPath, wrote: false };
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
