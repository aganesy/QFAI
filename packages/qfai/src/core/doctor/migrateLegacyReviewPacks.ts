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
  /** Packs whose `summary.json` gained `revision_form: "legacy"`. */
  marked: string[];
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
  options: { dryRun?: boolean; excludePacks?: readonly string[] } = {},
): Promise<LegacyPackMigration> {
  const reviewRoot = path.join(root, ".qfai", "review");
  const manifestPath = path.join(root, LEGACY_MANIFEST_REL);
  const existing = await readManifest(manifestPath);
  // Packs a caller has already moved out of the top level — or, under a
  // dry-run, would move. The archive pass in `runAutoremediate` runs first, so
  // a live run simply no longer sees them here; excluding them by name is what
  // makes the dry-run preview enumerate the same set instead of counting packs
  // the live run will have archived before this step ever looks.
  const excluded = new Set<string>(options.excludePacks ?? []);

  // **The first run is the snapshot, and only the first.** Re-classifying on
  // every invocation meant a pack written *after* the migration that forgot its
  // marker was recorded and then marked `legacy` — turning a blocking
  // `QFAI-REVIEW-007` into a warning, which is the opposite of what this
  // corroboration is for. Once the record exists, it is a historical fact and
  // this stops adding to it; a pack that belongs on it and is missing is added
  // by hand, which is a visible edit to a governance record.
  const alreadyMigrated = existing.length > 0 || (await manifestExists(manifestPath));
  const added: string[] = [];
  if (!alreadyMigrated) {
    for (const packName of await listPackNames(reviewRoot)) {
      if (excluded.has(packName)) continue;
      if (await declaresRevisionForm(path.join(reviewRoot, packName, "summary.json"))) continue;
      added.push(packName);
    }
  }

  // Both halves of the same fact, or neither is any use. The validator relaxes
  // only on `revision_form === "legacy"` **and** a manifest that agrees, so a
  // migration that wrote the manifest alone left every pack a blocking
  // `QFAI-REVIEW-007` — exactly the state it exists to clear.
  const marked: string[] = [];
  if (options.dryRun !== true) {
    if (added.length > 0) {
      const body = [...HEADER, ...[...existing, ...added].sort((a, b) => a.localeCompare(b)), ""];
      await writeFile(manifestPath, body.join("\n"), "utf-8");
    }
    // Only what the record lists: marking a pack it does not name would be the
    // same downgrade by another route.
    for (const packName of [...existing, ...added]) {
      if (await markPackLegacy(path.join(reviewRoot, packName, "summary.json"))) {
        marked.push(packName);
      }
    }
  } else {
    marked.push(...added);
  }

  return { added, marked, existing, manifestPath };
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

/** Whether the record exists at all, even empty: an empty one is still a snapshot taken. */
async function manifestExists(manifestPath: string): Promise<boolean> {
  try {
    await readFile(manifestPath, "utf-8");
    return true;
  } catch (error: unknown) {
    if (isEnoent(error)) return false;
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
/**
 * Add `revision_form: "legacy"` to a pack that declares no form.
 *
 * Only when the field is absent: a pack that already says `content-hash` was
 * written by a current producer and is not this migration's to reclassify, and
 * one that already says `legacy` needs nothing. An unreadable or unparseable
 * summary is left alone — there is nothing here that can safely rewrite it.
 */
async function markPackLegacy(summaryPath: string): Promise<boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(summaryPath, "utf-8"));
  } catch {
    return false;
  }
  if (typeof parsed !== "object" || parsed === null) return false;
  const record = parsed as Record<string, unknown>;
  if (typeof record.revision_form === "string" && record.revision_form.trim().length > 0) {
    return false;
  }
  const body = JSON.stringify({ ...record, revision_form: "legacy" }, null, 2);
  await writeFile(summaryPath, `${body}\n`, "utf-8");
  return true;
}

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
