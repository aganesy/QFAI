import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { ASSISTANT_DIR } from "./paths/assistantPaths.js";

/**
 * The file that records which qfai release wrote `.qfai/assistant/`.
 *
 * It holds the released version from the package manifest and nothing else,
 * so it is that version and not a second counter beside it. `qfai init` writes
 * it where it is absent and rewrites it under `--force`, the same terms as the
 * shipped assistant files it describes.
 */
export const ASSISTANT_VERSION_FILE = `${ASSISTANT_DIR}/VERSION`;

/** The version `resolveToolVersion` reports when it cannot read one. */
const UNKNOWN_VERSION = "unknown";

export function assistantVersionPath(root: string): string {
  return path.join(root, ...ASSISTANT_VERSION_FILE.split("/"));
}

/** The bytes of the version file for `version`. */
export function assistantVersionText(version: string): string {
  return `${version}\n`;
}

/** Whether `version` is one a version file may record. */
export function isRecordableVersion(version: string): boolean {
  return version.length > 0 && version !== UNKNOWN_VERSION;
}

/** The running qfai and what the assistant tree records, when the two differ. */
export type AssistantVersionMismatch = {
  readonly running: string;
  /** `null` when the tree has no version file. */
  readonly recorded: string | null;
};

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * What `.qfai/assistant/VERSION` records: the version, `null` when the tree
 * exists and the file records none (absent, empty or unreadable), and
 * `undefined` when there is no tree to ask.
 */
export async function readAssistantVersion(root: string): Promise<string | null | undefined> {
  if (!(await isDirectory(path.join(root, ...ASSISTANT_DIR.split("/"))))) return undefined;
  try {
    const recorded = (await readFile(assistantVersionPath(root), "utf-8")).trim();
    return recorded.length > 0 ? recorded : null;
  } catch {
    return null;
  }
}

/**
 * The mismatch between the running qfai and the version the assistant tree
 * records, or `null` when they agree, when there is no tree, or when the
 * running version cannot be read.
 */
export async function compareAssistantVersion(
  root: string,
  running: string,
): Promise<AssistantVersionMismatch | null> {
  if (!isRecordableVersion(running)) return null;
  const recorded = await readAssistantVersion(root);
  if (recorded === undefined || recorded === running) return null;
  return { running, recorded };
}

/** One sentence naming the mismatch, for the start of a finding. */
export function describeAssistantVersionMismatch(mismatch: AssistantVersionMismatch): string {
  return mismatch.recorded === null
    ? `${ASSISTANT_VERSION_FILE} records no version, so nothing says which qfai wrote the ` +
        `assistant tree; the running qfai is ${mismatch.running}.`
    : `The assistant tree was written by qfai ${mismatch.recorded} (${ASSISTANT_VERSION_FILE}), ` +
        `and the running qfai is ${mismatch.running}.`;
}

/** The repair for the mismatch. */
export function assistantVersionRepair(mismatch: AssistantVersionMismatch): string {
  return mismatch.recorded === null
    ? `Run qfai init --force to rewrite the assistant tree with qfai ${mismatch.running}, ` +
        "which also writes the version file, then run again."
    : "Run the install command (`npm ci` / `pnpm install`) in this working tree so the " +
        `installed qfai is the version this project uses. If that is ${mismatch.running}, run ` +
        "qfai init --force to rewrite the assistant tree with it. Then run again, and do not " +
        "edit generated files to clear a finding before that.";
}
