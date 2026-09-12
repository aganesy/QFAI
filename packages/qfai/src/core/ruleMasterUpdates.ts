/**
 * Which shipped rule masters a re-init may replace.
 *
 * `qfai init` copies `root/` create-only, so a file the project already has is
 * left alone. That is right for a file the project owns, and a rule master is
 * not one: it is QFAI's, and when its text changes in a release every project
 * that ran `init` before keeps the old wording. The population that misses the
 * change is the one already running an agent against the superseded rule.
 *
 * Overwriting unconditionally is not the answer either, because an adopter may
 * have edited a master and `init` cannot tell an edit from an older release's
 * text by reading the file alone.
 *
 * So it records what it wrote. A file whose bytes still match the last recorded
 * write is untouched and may be replaced; one whose bytes differ is the
 * adopter's and is reported instead. A master with no record at all is treated
 * as the adopter's — the conservative side, because the run that wrote it
 * predates this record and nothing distinguishes it from an edit.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetFile, hashAssistantAssetText } from "./assistantAssetProvenance.js";
import { hasErrnoCode } from "./fs/errno.js";

/** Where the record of what `init` last wrote lives, beside the masters. */
export const RULE_LOCK_BASENAME = ".qfai-rules.lock.json";

/**
 * What a re-init may do with one master.
 *
 * `written` and `current` need no write; the first is a file this run created,
 * the second one already holding the shipped text.
 */
export type RuleMasterVerdict = "written" | "current" | "update" | "keep";

export type RuleMasterPlan = {
  /** The master's basename, which is also its key in the record. */
  readonly name: string;
  readonly verdict: RuleMasterVerdict;
  /** The text this release ships, and the hash the record should end at. */
  readonly shippedHash: string;
  /**
   * The hash the project's copy holds, or `null` when it has none.
   *
   * Carried so the write can be pinned to it: the target may move between the
   * decision and the rename, and a write that ignored that would discard an
   * edit made in the window it was deciding.
   */
  readonly currentHash: string | null;
};

/** The recorded hashes, or an empty record when there is nothing readable. */
export async function readRuleLock(rulesDir: string): Promise<Record<string, string>> {
  let raw: string;
  try {
    raw = await readFile(path.join(rulesDir, RULE_LOCK_BASENAME), "utf-8");
  } catch (error: unknown) {
    // Absent, or the directory itself is not there yet. Both mean the same to
    // the verdict below: nothing recorded, so nothing may be replaced.
    if (hasErrnoCode(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) return {};
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A record nobody can read is a record of nothing, and the verdict that
    // follows from an empty one keeps every master the project has.
    return {};
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const hashes: Record<string, string> = {};
  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value === "string") hashes[name] = value;
  }
  return hashes;
}

/** Writes the record, sorted, so a re-init produces no spurious diff. */
export async function writeRuleLock(
  rulesDir: string,
  hashes: Readonly<Record<string, string>>,
): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(
    path.join(rulesDir, RULE_LOCK_BASENAME),
    `${JSON.stringify(sorted, null, 2)}\n`,
    "utf-8",
  );
}

/**
 * What this release would do with each master the project has, or would have.
 *
 * Reads only. The caller writes, so a dry run asks the same question and acts
 * on none of the answers.
 */
export async function planRuleMasterUpdates(
  shippedRulesDir: string,
  projectRulesDir: string,
): Promise<RuleMasterPlan[]> {
  const recorded = await readRuleLock(projectRulesDir);
  const plans: RuleMasterPlan[] = [];
  for (const name of await shippedMasterNames(shippedRulesDir)) {
    const shippedHash = hashAssistantAssetText(
      await readFile(path.join(shippedRulesDir, name), "utf-8"),
    );
    const currentHash = await hashAssistantAssetFile(path.join(projectRulesDir, name));
    plans.push({
      name,
      shippedHash,
      currentHash,
      verdict: verdictFor(shippedHash, currentHash, recorded[name]),
    });
  }
  return plans;
}

function verdictFor(
  shippedHash: string,
  currentHash: string | null,
  recordedHash: string | undefined,
): RuleMasterVerdict {
  // No readable file: the create-only copy in the same run wrote it, or nothing
  // did. Either way there is no adopter text to weigh.
  if (currentHash === null) return "written";
  if (currentHash === shippedHash) return "current";
  // The bytes are what the last recorded write left, so nobody has touched them
  // since, and the difference is the release moving rather than an edit.
  if (recordedHash !== undefined && recordedHash === currentHash) return "update";
  return "keep";
}

/** The `.md` files the package ships as masters, sorted. */
async function shippedMasterNames(shippedRulesDir: string): Promise<string[]> {
  const entries = await readdir(shippedRulesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name)
    .sort();
}
