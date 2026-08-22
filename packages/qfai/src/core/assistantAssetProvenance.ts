import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { open, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "./fs/errno.js";

/**
 * Provenance record for the vendored halves of the assistant tree.
 *
 * qfai ships its normative rules as markdown copied into the project
 * (`constitution/`, `catalog/`) and the validators that implement them through
 * npm. The copy is create-only, so the two halves separate the moment either
 * side moves: an upgraded toolkit keeps reading whatever constitution the
 * project first initialised with, and a local edit to that constitution is
 * indistinguishable from shipped policy — downstream reasoning then cites the
 * fork as if it were the release.
 *
 * This module records what qfai actually wrote, per file, so both cases become
 * observable: a file that still matches its recorded hash is a stale copy the
 * toolkit may refresh, and a file that matches neither the record nor the
 * installed release is a local fork that needs a merge decision.
 *
 * `manifest/` is deliberately outside the record. `qfai-configure` is the
 * shipped entrypoint for editing those declarative files, so a project editing
 * them is using the supported path and must not be reported for it.
 */
export const ASSISTANT_ASSETS_LOCK_BASENAME = ".assets.lock.json";

/**
 * Assistant layers qfai owns end to end and can therefore vouch for.
 */
export const GOVERNED_ASSISTANT_LAYERS = ["constitution", "catalog"] as const;

export type GovernedAssistantLayer = (typeof GOVERNED_ASSISTANT_LAYERS)[number];

/**
 * Maps a POSIX path relative to `.qfai/assistant/` to the sha256 of the
 * content qfai wrote at that path.
 */
export type AssistantAssetsLock = {
  files: Record<string, string>;
};

/**
 * A project's legal way to extend qfai policy without editing a file qfai
 * owns: `<layer>/<name>.local.md` is never shipped, never recorded and never
 * reported. Extending the catalog in place is what produces an unmergeable
 * fork; an overlay beside it is additive and survives every upgrade.
 *
 * The extension is pinned to `md`, not left open. `catalog/` also ships
 * `review-gate.rules.yml` and `spec_required_files.json`, and a pattern that
 * accepted any extension read `review-gate.local.yml` as an overlay — so a
 * non-markdown normative file added beside them dropped out of the record
 * entirely and out of `QFAI-ASSETS-005` with it.
 */
const LOCAL_OVERLAY_PATTERN = /\.local\.md$/i;

export function isLocalAssistantOverlay(relativePath: string): boolean {
  return LOCAL_OVERLAY_PATTERN.test(path.posix.basename(toPosix(relativePath)));
}

/**
 * Hash of one assistant asset.
 *
 * CRLF is normalised first: the same file checked out on Windows and on Linux
 * differs byte for byte through `core.autocrlf` alone, and a provenance record
 * that reports every Windows checkout as a local fork reports nothing at all.
 */
export function hashAssistantAssetText(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/**
 * Hash of the file at `filePath`, or `null` when no readable regular file is
 * there. Absence is a legitimate answer here — the caller compares three
 * possibly-missing hashes — so it is reported rather than thrown.
 *
 * The read is pinned to the inode that is opened, non-blocking where the
 * platform has it, and refused unless `fstat` on that handle says regular
 * file. A plain `readFile` on a governed path that a checkout left as a FIFO
 * blocks until a writer appears, which hung `qfai validate` and `qfai init`
 * with no diagnostic; a directory or a device node is not a governed asset
 * either. A symlink to a regular file is still followed — reading through one
 * is harmless, and the write paths are what must never do it.
 */
export async function hashAssistantAssetFile(filePath: string): Promise<string | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile()) {
      return null;
    }
    return hashAssistantAssetText(await handle.readFile("utf-8"));
  } catch {
    return null;
  } finally {
    try {
      await handle?.close();
    } catch {
      // The hash is already decided; a close fault must not replace it.
    }
  }
}

/**
 * Read-only, non-blocking where the platform defines it. Opening a FIFO for
 * reading otherwise waits for a writer. Windows has neither `O_NONBLOCK` nor
 * FIFOs in this sense.
 */
const OPEN_READ_FLAGS =
  typeof constants.O_NONBLOCK === "number"
    ? constants.O_RDONLY | constants.O_NONBLOCK
    : constants.O_RDONLY;

/**
 * POSIX paths, relative to the assistant root, of every governed file under
 * `assistantRoot`. Overlays are excluded: they are project property.
 */
export async function collectGovernedAssistantFiles(assistantRoot: string): Promise<string[]> {
  const found: string[] = [];
  for (const layer of GOVERNED_ASSISTANT_LAYERS) {
    const layerDir = path.join(assistantRoot, layer);
    let entries: string[];
    try {
      entries = await readdir(layerDir);
    } catch (error: unknown) {
      if (isEnoent(error)) {
        continue;
      }
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.localeCompare(b))) {
      if (entry.startsWith(".") || isLocalAssistantOverlay(entry)) {
        continue;
      }
      found.push(`${layer}/${entry}`);
    }
  }
  return found;
}

/**
 * Governed-file hashes of the release currently installed.
 */
export async function buildShippedAssistantHashes(
  assistantAssetsRoot: string,
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const relative of await collectGovernedAssistantFiles(assistantAssetsRoot)) {
    const hash = await hashAssistantAssetFile(
      path.join(assistantAssetsRoot, ...relative.split("/")),
    );
    if (hash !== null) {
      hashes[relative] = hash;
    }
  }
  return hashes;
}

export function assistantAssetsLockPath(assistantRoot: string): string {
  return path.join(assistantRoot, ASSISTANT_ASSETS_LOCK_BASENAME);
}

/**
 * The recorded provenance, or `null` when the project has none.
 *
 * A malformed or unreadable lock reads as `null` rather than throwing: every
 * project initialised before this record existed has no lock, and a project
 * that corrupted one is in the same position as a project that never had one.
 * Refusing to validate in either case would trade a warning for a crash.
 */
export async function readAssistantAssetsLock(
  assistantRoot: string,
): Promise<AssistantAssetsLock | null> {
  let raw: string;
  try {
    raw = await readFile(assistantAssetsLockPath(assistantRoot), "utf-8");
  } catch {
    return null;
  }
  try {
    return parseAssistantAssetsLock(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseAssistantAssetsLock(value: unknown): AssistantAssetsLock | null {
  if (typeof value !== "object" || value === null || !("files" in value)) {
    return null;
  }
  const files = value.files;
  if (typeof files !== "object" || files === null || Array.isArray(files)) {
    return null;
  }
  const parsed: Record<string, string> = {};
  for (const [key, entry] of Object.entries(files)) {
    if (typeof entry === "string") {
      parsed[key] = entry;
    }
  }
  return { files: parsed };
}

/**
 * Writes the record by creating a fresh file beside it and renaming over the
 * path.
 *
 * A plain `writeFile` follows a symlink: a checkout that leaves
 * `.assets.lock.json` pointing anywhere — a file outside the repository, or
 * another governed file inside it — had that target overwritten with lock JSON
 * by an ordinary `qfai init`, no `--force` needed. `rename` replaces the link
 * itself, and the temporary is created with `wx` so it can never land on
 * something already there either.
 */
export async function writeAssistantAssetsLock(
  assistantRoot: string,
  lock: AssistantAssetsLock,
): Promise<void> {
  const ordered: Record<string, string> = {};
  for (const key of Object.keys(lock.files).sort((a, b) => a.localeCompare(b))) {
    const value = lock.files[key];
    if (value !== undefined) {
      ordered[key] = value;
    }
  }
  const target = assistantAssetsLockPath(assistantRoot);
  const staging = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(staging, `${JSON.stringify({ files: ordered }, null, 2)}\n`, {
      encoding: "utf-8",
      flag: "wx",
    });
    await rename(staging, target);
  } catch (error: unknown) {
    await rm(staging, { force: true }).catch(() => {
      // Best effort: the write fault below is the one worth reporting.
    });
    throw error;
  }
}

/**
 * How one vendored governed file stands against the installed release.
 *
 * - `shipped` — byte-identical to what this release ships.
 * - `stale` — still the content qfai wrote, but an older release wrote it.
 *   Refreshable without a merge decision.
 * - `forked` — matches neither the record nor the release: someone edited it,
 *   or it was written by a release whose provenance was never recorded.
 * - `unshipped` — present in the project but absent from the release, and not
 *   an overlay.
 * - `missing` — shipped by the release, but no readable regular file is at
 *   that path in the project: deleted, or replaced by a directory or a special
 *   file. Deleting a governed rule was the one way to make it stop applying
 *   without anything saying so.
 */
export type AssistantAssetStatus = "shipped" | "stale" | "forked" | "unshipped" | "missing";

export function classifyAssistantAsset(
  currentHash: string | null,
  shippedHash: string | undefined,
  recordedHash: string | undefined,
): AssistantAssetStatus {
  if (shippedHash === undefined) {
    return "unshipped";
  }
  if (currentHash === null) {
    return "missing";
  }
  if (currentHash === shippedHash) {
    return "shipped";
  }
  if (recordedHash !== undefined && currentHash === recordedHash) {
    return "stale";
  }
  return "forked";
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}
