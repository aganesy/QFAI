/**
 * Installed shipped-workflow drift reader for `qfai doctor`.
 *
 * Compares each GitHub Actions workflow the installed package ships against
 * the file of the same name in the adopter's `.github/workflows/`, and
 * reports the ones whose content no longer matches. This is the adopter's
 * only route by which a corrected template becomes visible, because the
 * shipped tree is copied create-only and no install path refreshes it.
 *
 * Comparison basis is the sha256 of the NEWLINE-NORMALIZED text on both
 * sides, as the shipped-workflows contract requires. Digesting raw bytes
 * instead would report every installed workflow as drifted on a CRLF
 * checkout — a false advisory for every Windows adopter.
 *
 * Read-only and fail-safe throughout: an absent directory, an unreadable
 * file, or a packaged tree that cannot be resolved yields no finding rather
 * than an error. A file that is absent from the adopter tree is likewise not
 * drift — QFAI has nothing to compare and reports nothing.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import type { DoctorCheck } from "../doctor.js";

/** Adopter-tree location of the installed workflows, as POSIX segments. */
const WORKFLOWS_DIR_SEGMENTS = [".github", "workflows"] as const;

/** The same location as the root-relative POSIX string carried in findings. */
const WORKFLOWS_DIR_RELATIVE = WORKFLOWS_DIR_SEGMENTS.join("/");

/**
 * Absolute path of the workflows directory inside the installed package, or
 * `undefined` when the packaged asset tree cannot be resolved at all —
 * `getInitAssetsDir` throws in that case, and an unresolvable operand is a
 * skip, not a drift report.
 */
export function resolvePackagedWorkflowsDir(): string | undefined {
  try {
    return path.join(getInitAssetsDir(), "root", ...WORKFLOWS_DIR_SEGMENTS);
  } catch {
    return undefined;
  }
}

function digestNormalizedText(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

/** Digest of one file's normalized text, or `undefined` when unreadable. */
async function digestFile(filePath: string): Promise<string | undefined> {
  try {
    return digestNormalizedText(await readFile(filePath, "utf-8"));
  } catch {
    return undefined;
  }
}

/** File names the installed package ships, or `[]` when unreadable. */
async function listPackagedWorkflowNames(packagedDir: string): Promise<string[]> {
  try {
    const entries = await readdir(packagedDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Builds the `workflows.integrity` check for the adopter tree at `root`, or
 * returns `undefined` when there is nothing to report.
 *
 * The finding severity is `info`: it must not change the process exit code
 * under any `--fail-on` value, because the population it informs is every
 * adopter running behind the current package, and no repair command exists
 * for them to run yet.
 *
 * `packagedWorkflowsDirOverride` substitutes the packaged operand so a test
 * can observe the comparison against a controlled tree instead of whatever
 * the running package happens to ship.
 */
export async function buildWorkflowsIntegrityCheck(
  root: string,
  packagedWorkflowsDirOverride?: string,
): Promise<DoctorCheck | undefined> {
  const packagedDir = packagedWorkflowsDirOverride ?? resolvePackagedWorkflowsDir();
  if (packagedDir === undefined) {
    return undefined;
  }

  const installedDir = path.join(root, ...WORKFLOWS_DIR_SEGMENTS);
  const modified: string[] = [];
  for (const name of await listPackagedWorkflowNames(packagedDir)) {
    const packagedDigest = await digestFile(path.join(packagedDir, name));
    const installedDigest = await digestFile(path.join(installedDir, name));
    if (packagedDigest === undefined || installedDigest === undefined) {
      continue;
    }
    if (packagedDigest !== installedDigest) {
      modified.push(`${WORKFLOWS_DIR_RELATIVE}/${name}`);
    }
  }

  if (modified.length === 0) {
    return undefined;
  }
  modified.sort((left, right) => left.localeCompare(right));

  return {
    id: "workflows.integrity",
    severity: "info",
    title: "Workflows integrity (.github/workflows)",
    message: modified.join(", "),
    details: {
      workflowsDir: WORKFLOWS_DIR_RELATIVE,
      modified,
    },
  };
}
