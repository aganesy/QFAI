import { mkdir, open, readFile } from "node:fs/promises";
import path from "node:path";

import { atddTestKindDirs } from "../atddTraceability.js";
import { isStoryTreeId } from "../storyTree/ids.js";
import { DEFAULT_SCAFFOLD_DIALECT, type ScaffoldDialect } from "./scaffoldDialect.js";

export const SCAFFOLD_PLACEHOLDER_MARKER = "QFAI-SCAFFOLD-PLACEHOLDER";

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
  const prefix = dialect.commentPrefix;
  return [
    `${prefix} QFAI:${target.id}`,
    `${prefix} ${SCAFFOLD_PLACEHOLDER_MARKER} — replace this block with a real assertion.`,
    "",
    ...dialect.buildBody(target.id),
    "",
  ].join("\n");
}

export function isStillPlaceholder(body: string, id: string): boolean {
  return (
    body.includes(SCAFFOLD_PLACEHOLDER_MARKER) &&
    body.includes(`TODO: implement assertion for ${id}`)
  );
}

export type EmitSkeletonResult = {
  destPath: string;
  wrote: boolean;
  alreadyPlaceholder: boolean;
  alreadyProgressed: boolean;
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
    return { destPath, wrote: true, alreadyPlaceholder: false, alreadyProgressed: false };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(destPath, "utf8");
    const alreadyPlaceholder = isStillPlaceholder(existing, target.id);
    return { destPath, wrote: false, alreadyPlaceholder, alreadyProgressed: !alreadyPlaceholder };
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
