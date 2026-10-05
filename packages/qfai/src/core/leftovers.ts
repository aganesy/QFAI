import type { Dirent } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "./fs/errno.js";
import { formatReportPath } from "./init/reportPath.js";

/** Paths an earlier release wrote under the project root and this release no longer uses. */
const LEFTOVER_PATHS = [
  ".qfai/evidence/",
  ".qfai/review/",
  ".qfai/run/",
  ".qfai/assistant/.assets.lock.json",
  ".qfai/install-provenance.json",
] as const;

/** Discussion-pack files an earlier release wrote into each pack. */
const LEFTOVER_PACK_FILES = [
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;

/**
 * A README an earlier release generated is listed only while its body still
 * opens the way the generated one did, so a README the project wrote for itself
 * at the same path stays out of the list.
 */
const GENERATED_WORKSPACE_README = (body: string): boolean =>
  body.startsWith("# .qfai (QFAI Workspace)");

const GENERATED_DISCUSSION_README = (body: string): boolean =>
  body.startsWith("# discussion") && body.includes("discussion-YYYYMMDDhhmmssSSS");

/** The generated READMEs are a few kilobytes; a larger file is not one. */
const GENERATED_README_MAX_BYTES = 64 * 1024;

/** Where the 1.x migration kept what it retired. */
export const MIGRATION_ARCHIVE_PATH = ".qfai/evidence/migration-spec-to-story/";

export const MIGRATION_ARCHIVE_NOTE =
  `${MIGRATION_ARCHIVE_PATH} may hold the only copy of content the 1.x migration retired; ` +
  "you decide whether to delete it.";

export type Leftovers = {
  /** Every leftover path present, repo-relative with `/`, the migration archive included. */
  paths: string[];
  /** Whether the migration archive is among them. */
  migrationArchive: boolean;
};

async function present(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR")) return false;
    throw error;
  }
}

/**
 * The pack directories under `discussionDir`. A path that is absent or not a
 * directory holds no pack; doctor's own path check reports that shape.
 */
async function packDirectories(discussionDir: string): Promise<Dirent[]> {
  try {
    return (await readdir(discussionDir, { withFileTypes: true })).filter((entry) =>
      entry.isDirectory(),
    );
  } catch (error) {
    if (isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR")) return [];
    throw error;
  }
}

/** Whether `file` is a small regular file whose body `generated` accepts. */
async function isGeneratedReadme(
  file: string,
  generated: (body: string) => boolean,
): Promise<boolean> {
  try {
    const stats = await lstat(file);
    if (!stats.isFile() || stats.size > GENERATED_README_MAX_BYTES) return false;
    return generated(await readFile(file, "utf-8"));
  } catch (error) {
    if (isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR")) return false;
    throw error;
  }
}

function toProjectPath(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/");
}

/**
 * The paths an earlier release left in the project that this release no longer uses.
 * Nothing is deleted: a leftover may hold the only copy of something, so the adopter decides.
 */
export async function findLeftovers(root: string, discussionDir: string): Promise<Leftovers> {
  const paths: string[] = [];
  for (const relative of LEFTOVER_PATHS) {
    if (await present(path.join(root, relative))) paths.push(relative);
  }
  const workspaceReadme = path.join(root, ".qfai", "README.md");
  if (await isGeneratedReadme(workspaceReadme, GENERATED_WORKSPACE_README)) {
    paths.push(toProjectPath(root, workspaceReadme));
  }
  const discussionReadme = path.join(discussionDir, "README.md");
  if (await isGeneratedReadme(discussionReadme, GENERATED_DISCUSSION_README)) {
    paths.push(toProjectPath(root, discussionReadme));
  }
  const migrationArchive = await present(path.join(root, MIGRATION_ARCHIVE_PATH));
  if (migrationArchive) paths.push(MIGRATION_ARCHIVE_PATH);
  const packs = await packDirectories(discussionDir);
  for (const pack of packs.sort((a, b) => a.name.localeCompare(b.name))) {
    for (const name of LEFTOVER_PACK_FILES) {
      const file = path.join(discussionDir, pack.name, name);
      if (await present(file)) paths.push(toProjectPath(root, file));
    }
  }
  return { paths, migrationArchive };
}

/** The leftover paths as summary lines, the migration archive on its own line. */
export function leftoverLines(leftovers: Leftovers): string[] {
  const listed = leftovers.paths.filter((entry) => entry !== MIGRATION_ARCHIVE_PATH);
  return [
    ...(listed.length > 0
      ? [
          "Left by an earlier release and no longer used; delete what you do not need:",
          ...listed.map((entry) => `  ${formatReportPath(entry)}`),
        ]
      : []),
    ...(leftovers.migrationArchive ? [MIGRATION_ARCHIVE_NOTE] : []),
  ];
}
