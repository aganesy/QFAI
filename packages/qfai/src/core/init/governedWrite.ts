import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import type { BigIntStats } from "node:fs";
import { copyFile, link, lstat, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { ASSISTANT_STAGING_PREFIX, hashAssistantAssetFile } from "../assistantAssetProvenance.js";
import { hasErrnoCode, isEnoent } from "../fs/errno.js";
import { warn } from "../logger.js";

/**
 * Copies to a sibling staging file before publishing complete bytes.
 * Replacement renames the directory entry, never following a target symlink.
 * An expected hash is rechecked immediately before publication; this narrows,
 * but cannot eliminate, the race with an editor. Create-only publication uses
 * an exclusive hard link and never overwrites a path created concurrently.
 */
export type GovernedWriteOutcome = "replaced" | "target-changed";

/**
 * Exported for `qfai init` and the migration's step 11, and for the regression
 * test that pins the `target-changed` branch. The branch is only
 * reachable through a race, so the test reaches it by handing in an
 * `expectedHash` the target does not hold — the same state the race leaves.
 */
export async function replaceGovernedAsset(
  source: string,
  dest: string,
  expectedHash?: string,
  mode: "replace" | "create-only" = "replace",
): Promise<GovernedWriteOutcome> {
  const directory = path.dirname(dest);
  await mkdir(directory, { recursive: true });
  const staging = path.join(directory, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`);
  if (mode === "create-only") {
    let handle: FileHandle;
    try {
      handle = await open(staging, "wx");
    } catch (cause: unknown) {
      throw new Error(
        `qfai init cannot create staging file ${JSON.stringify(staging)} for ${JSON.stringify(dest)}. Restore write access and inspect ownership before rerunning; preserve any occupied staging path and existing destination content.`,
        { cause },
      );
    }
    let identity: BigIntStats | undefined;
    let outcome: GovernedWriteOutcome = "replaced";
    let published = false;
    const failures: unknown[] = [];
    const ownsPath = async (target: string): Promise<boolean> => {
      const current = await lstat(target, { bigint: true });
      return (
        identity !== undefined &&
        current.isFile() &&
        current.dev === identity.dev &&
        current.ino === identity.ino
      );
    };
    try {
      identity = await handle.stat({ bigint: true });
      await handle.writeFile(await readFile(source));
      await handle.chmod((await stat(source)).mode & 0o7777);
      if (expectedHash !== undefined && (await hashAssistantAssetFile(dest)) !== expectedHash) {
        outcome = "target-changed";
      } else {
        if (!(await ownsPath(staging))) {
          throw new Error(
            `qfai init cannot publish ${JSON.stringify(dest)} because staging ownership changed at ${JSON.stringify(staging)}. Inspect ownership before retrying.`,
          );
        }
        await link(staging, dest);
        published = true;
        if (!(await ownsPath(dest))) outcome = "target-changed";
      }
    } catch (cause: unknown) {
      failures.push(cause);
    }
    let closed = true;
    try {
      await handle.close();
    } catch (cause: unknown) {
      closed = false;
      failures.push(cause);
    }
    let present = true;
    let removable = false;
    let inspectionNote = "";
    try {
      removable = await ownsPath(staging);
    } catch (cause: unknown) {
      if (isEnoent(cause)) present = false;
      else inspectionNote = ` Inspection failed: ${JSON.stringify(String(cause))}.`;
    }
    if (present && !removable) {
      warn(
        `NOTE: qfai init could not verify staging ownership at ${JSON.stringify(staging)}.${inspectionNote} Do not delete this occupied path. Restore access and inspect ownership before rerunning; keep any existing destination content at ${JSON.stringify(dest)}.`,
      );
    }
    if (removable && !closed) {
      warn(
        `NOTE: qfai init retained staging file ${JSON.stringify(staging)} because its handle could not be closed. Restore access and close the handle before removing only this verified staging file; keep any existing destination content at ${JSON.stringify(dest)}.`,
      );
    }
    if (removable && closed) {
      await rm(staging, { force: true }).catch(() => {
        const result = published ? "created" : "could not create";
        warn(
          `NOTE: qfai init ${result} ${JSON.stringify(dest)}, but could not remove staging file ${JSON.stringify(staging)}. Restore access, remove only this staging file, then rerun qfai init; keep any existing destination content.`,
        );
      });
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, "Governed asset creation and handle close failed.", {
        cause: failures.at(-1),
      });
    }
    if (failures.length === 1) throw failures[0];
    return outcome;
  }
  try {
    await copyFile(source, staging, constants.COPYFILE_EXCL);
    if (expectedHash !== undefined && (await hashAssistantAssetFile(dest)) !== expectedHash) {
      await rm(staging, { force: true }).catch(() => {
        // Best effort: the answer below is what the caller acts on.
      });
      return "target-changed";
    }
    await rename(staging, dest);
    return "replaced";
  } catch (error: unknown) {
    // An occupied staging path is not this run's to remove. `COPYFILE_EXCL`
    // refuses with `EEXIST` precisely because something is already there, and
    // a name collision does not transfer ownership of the bytes behind it —
    // removing them destroys whatever wrote them, which on a shared checkout
    // is another run's staged asset. Every other failure leaves behind at most
    // what this copy wrote, including a partial one, and that is this run's to
    // clear.
    if (!hasErrnoCode(error) || error.code !== "EEXIST") {
      await rm(staging, { force: true }).catch(() => {
        // Best effort; preserve the original replacement failure.
      });
    }
    throw error;
  }
}
