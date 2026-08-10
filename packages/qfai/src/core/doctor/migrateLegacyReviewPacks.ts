import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";

const REVIEW_PACK_DIR_RE = /^review-(\d{17})$/iu;

/** The migration record `QFAI-REVIEW-007` reads. One pack name per line. */
export const LEGACY_MANIFEST_REL = path.join(".qfai", "review", ".legacy-packs");

const HEADER = [
  "# Review packs written before `revision_form` existed.",
  "# Generated once by `qfai doctor --autoremediate`; safe to re-run.",
  "# A pack listed here is not held to the strict `revision` form: the tree its",
  "# verdict described is no longer reconstructible, so there is no content hash",
  "# to migrate to. Packs written afterwards declare the form themselves.",
];

export type LegacyPackMigration = {
  /** Pack names added by this run. Empty on a repeat run. */
  added: string[];
  /** Pack names already recorded. */
  existing: string[];
  /** Absolute path of the manifest, whether or not it was written. */
  manifestPath: string;
};

/**
 * Record every review pack that predates `revision_form`, once.
 *
 * Without this, taking a version that requires the marker turns every pack
 * already on disk into a blocking `QFAI-REVIEW-007` — a repository that keeps
 * its review history fails `--fail-on error` on adoption, for a condition no
 * producer can go back and fix. The classification is exactly the one the
 * upgrade can still make: a pack that does not declare the form was written
 * before the form existed.
 *
 * **Idempotent, and additive only.** Re-running merges rather than replaces, so
 * a pack an operator recorded by hand is never dropped, and a pack written
 * *after* the migration that forgets its marker is not quietly excused — it is
 * absent from the record and stays an error, which is the whole point of the
 * corroboration.
 */
export async function migrateLegacyReviewPacks(
  root: string,
  options: { dryRun?: boolean } = {},
): Promise<LegacyPackMigration> {
  const reviewRoot = path.join(root, ".qfai", "review");
  const manifestPath = path.join(root, LEGACY_MANIFEST_REL);
  const existing = await readManifest(manifestPath);

  const added: string[] = [];
  for (const packName of await listPackNames(reviewRoot)) {
    if (existing.includes(packName)) continue;
    if (await declaresRevisionForm(path.join(reviewRoot, packName, "summary.json"))) continue;
    added.push(packName);
  }

  if (added.length > 0 && options.dryRun !== true) {
    const body = [...HEADER, ...[...existing, ...added].sort((a, b) => a.localeCompare(b)), ""];
    await writeFile(manifestPath, body.join("\n"), "utf-8");
  }

  return { added, existing, manifestPath };
}

async function listPackNames(reviewRoot: string): Promise<string[]> {
  try {
    const entries = await readdir(reviewRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && REVIEW_PACK_DIR_RE.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw error;
  }
}

async function readManifest(manifestPath: string): Promise<string[]> {
  try {
    const content = await readFile(manifestPath, "utf-8");
    return content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw error;
  }
}

/**
 * Whether the pack says which contract wrote it.
 *
 * An unreadable or unparseable `summary.json` answers "no", so the pack is
 * recorded: it cannot be a current producer's output, and leaving it out would
 * make the very packs that most need the record miss it.
 */
async function declaresRevisionForm(summaryPath: string): Promise<boolean> {
  try {
    const parsed: unknown = JSON.parse(await readFile(summaryPath, "utf-8"));
    if (typeof parsed !== "object" || parsed === null) return false;
    const value = (parsed as Record<string, unknown>).revision_form;
    return typeof value === "string" && value.trim().length > 0;
  } catch {
    return false;
  }
}
