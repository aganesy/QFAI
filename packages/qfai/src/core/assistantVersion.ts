import { lstat, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { ASSISTANT_DIR } from "./paths/assistantPaths.js";

/**
 * The file that records which qfai release wrote `.qfai/assistant/`.
 *
 * It holds the released version from the package manifest and nothing else,
 * so it is that version and not a second counter beside it. `qfai init` writes
 * it into a new tree, and rewrites it under `--force`.
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

/**
 * What the version file holds: a version; `none` when it is absent, empty or
 * unreadable; or `not-a-file` when the entry at its path is not a regular file,
 * which nothing will write over.
 */
export type AssistantVersionRecord =
  | { readonly kind: "version"; readonly version: string }
  | { readonly kind: "none" }
  | { readonly kind: "not-a-file" };

/** The running qfai and what the assistant tree records, when the two differ. */
export type AssistantVersionMismatch = {
  readonly running: string;
  readonly record: AssistantVersionRecord;
};

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * What `.qfai/assistant/VERSION` records, or `undefined` when there is no tree
 * to ask.
 */
export async function readAssistantVersion(
  root: string,
): Promise<AssistantVersionRecord | undefined> {
  if (!(await isDirectory(path.join(root, ...ASSISTANT_DIR.split("/"))))) return undefined;
  const file = assistantVersionPath(root);
  try {
    if (!(await lstat(file)).isFile()) return { kind: "not-a-file" };
    const version = (await readFile(file, "utf-8")).trim();
    return version.length > 0 ? { kind: "version", version } : { kind: "none" };
  } catch {
    return { kind: "none" };
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
  const record = await readAssistantVersion(root);
  if (record === undefined) return null;
  if (record.kind === "version" && record.version === running) return null;
  return { running, record };
}

/** The recorded version, or `null` when the file records none. */
export function recordedVersion(mismatch: AssistantVersionMismatch): string | null {
  return mismatch.record.kind === "version" ? mismatch.record.version : null;
}

/** One sentence naming the mismatch, for the start of a finding. */
export function describeAssistantVersionMismatch(mismatch: AssistantVersionMismatch): string {
  const { record, running } = mismatch;
  switch (record.kind) {
    case "version":
      return (
        `The assistant tree was written by qfai ${record.version} (${ASSISTANT_VERSION_FILE}), ` +
        `and the running qfai is ${running}.`
      );
    case "none":
      return (
        `${ASSISTANT_VERSION_FILE} records no version, so nothing says which qfai wrote the ` +
        `assistant tree; the running qfai is ${running}.`
      );
    case "not-a-file":
      return (
        `${ASSISTANT_VERSION_FILE} is not a regular file, so nothing says which qfai wrote the ` +
        `assistant tree; the running qfai is ${running}.`
      );
  }
}

/** The repair for the mismatch. */
export function assistantVersionRepair(mismatch: AssistantVersionMismatch): string {
  const { record, running } = mismatch;
  switch (record.kind) {
    case "version":
      return (
        "Run the install command (`npm ci` / `pnpm install`) in this working tree so the " +
        `installed qfai is the version this project uses. If that is ${running}, run ` +
        "qfai init --force to rewrite the assistant tree with it. Then run again, and do not " +
        "edit generated files to clear a finding before that."
      );
    case "none":
      return (
        `Run qfai init --force to rewrite the assistant tree with qfai ${running}, ` +
        "which also writes the version file, then run again."
      );
    case "not-a-file":
      return (
        `Remove the entry at ${ASSISTANT_VERSION_FILE}, then run qfai init --force to rewrite ` +
        `the assistant tree with qfai ${running}, which writes the version file, and run again.`
      );
  }
}
