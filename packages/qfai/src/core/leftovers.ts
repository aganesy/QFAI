import type { Dirent } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "./fs/errno.js";
import { formatReportPath } from "./init/reportPath.js";

/** Paths an earlier release wrote under the project root and this release no longer uses. */
const LEFTOVER_PATHS = [
  ".qfai/evidence/",
  ".qfai/review/",
  ".qfai/review_archive/",
  ".qfai/run/",
  ".qfai/assistant/.assets.lock.json",
  ".qfai/install-provenance.json",
] as const;

/**
 * Files and directories an earlier release shipped under `.qfai/assistant/` and
 * this release does not. `init` skips a file that exists and `init --force`
 * overwrites only what this release ships, so neither removes these.
 * A directory entry ends with `/`.
 */
const RETIRED_ASSISTANT_PATHS = [
  "rule/audited-evidence-hash.md",
  "skill/qfai-atdd/",
  "skill/qfai-discussion/templates/02_Inception-Deck.md",
  "skill/qfai-discussion/templates/10_Policy.md",
  "skill/qfai-discussion/templates/12_OQ-Resolution-Log.md",
  "skill/qfai-discussion/templates/13_Deferred.md",
  "skill/qfai-discussion/templates/14_Review-Request.md",
  "skill/qfai-discussion/templates/99_delta.md",
  "skill/qfai-discussion/templates/review/",
  "skill/qfai-implement/references/checkpoint-verification.md",
  "skill/qfai-implement/references/evidence-revision.md",
  "skill/qfai-implement/references/relevant-test-suite.md",
  "skill/qfai-implement/references/review-artifact-layout.md",
  "skill/qfai-implement/references/round-evidence.md",
  "skill/qfai-prototyping/references/evidence-requirements.md",
  "skill/qfai-prototyping/references/iterate-flags.md",
  "skill/qfai-run/references/payloads.md",
  "skill/qfai-sdd/templates/evidence/",
  "skill/qfai-verify/templates/verify-evidence.md",
  "step/atdd-author/",
  "step/atdd-credentials/",
  "step/atdd-scaffold/",
  "step/atdd-test-fix/",
  "step/common-evidence-record/",
  "step/common-steering-refresh/",
  "step/implement-checkpoint/",
  "step/prototyping-recover/",
] as const;

/** Discussion-pack files an earlier release wrote into each pack. */
const LEFTOVER_PACK_FILES = [
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;

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
  for (const relative of RETIRED_ASSISTANT_PATHS) {
    const listed = `.qfai/assistant/${relative}`;
    if (await present(path.join(root, ...listed.split("/")))) paths.push(listed);
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
