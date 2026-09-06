/**
 * Reading back the lock this writer just published: what counts as an answer.
 *
 * `confirmPublishedLock` re-reads the lock name because a disagreement is not
 * proof of dispossession — a reclaimer that judges a lock stale MOVES it, and
 * for the width of that move the name answers `ENOENT` although the same inode
 * comes straight back. The loop rides that window out.
 *
 * The width it was sized for is not a property of the move. It is a property of
 * how long the reclaimer waits to be SCHEDULED, and a CI runner sharing a box
 * with six other vitest projects moves it. At a 1s budget a run that outlasted
 * it was told `the provenance lock was replaced between publishing it and
 * reading it back` and failed — about a lock that had been restored under it,
 * on a documentation-only pull request (#1190).
 *
 * Both halves are pinned here, because widening the budget alone would also
 * slow down the case the budget exists to detect:
 *
 *   - an absence longer than the old budget is waited out, not reported;
 *   - an object that is somebody ELSE's is reported on the read that sees it,
 *     rather than after a budget spent re-reading the same foreign inode.
 *
 * The fault is injected through `node:fs/promises` rather than raced, because
 * the window is exactly what a test cannot schedule reliably — which is the
 * defect's own point.
 */
// QFAI:SPEC-0010:TC-0010-0012

import { createHash } from "node:crypto";
import type * as FsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readInstallProvenance, updateInstallProvenance } from "../../../src/shared/provenance.js";

const LOCK_DIR_NAME = ".install-provenance.lock.d";

type Forgery =
  /** Answer `ENOENT` for the lock name, as the move-and-restore window does. */
  | { kind: "absent"; remaining: number }
  /** Answer with an object that is not the staged one. */
  | { kind: "foreign" }
  | { kind: "off" };

const control = vi.hoisted(() => ({
  forgery: { kind: "off" } as Forgery,
  /** How many times the forgery answered for the lock name. */
  serves: 0,
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    lstat: async (
      target: Parameters<typeof actual.lstat>[0],
      options?: Parameters<typeof actual.lstat>[1],
    ) => {
      const spelled = String(target);
      if (control.forgery.kind !== "off" && spelled.endsWith(LOCK_DIR_NAME)) {
        if (control.forgery.kind === "foreign") {
          control.serves += 1;
          // `options` passed through, like every other delegation here: the
          // mock declares the parameter, so dropping it would make a future
          // `{ bigint: true }` caller silently get a different shape than the
          // real function would have returned.
          const real = await actual.lstat(target, options);
          // Same object in every respect but identity, so nothing but the
          // `dev`/`ino` comparison can be what rejects it.
          //
          // A SENTINEL rather than `real.ino + 1`: an NTFS inode is a 64-bit
          // file id — 68398419342451530 on the machine this was written on —
          // which is past `Number.MAX_SAFE_INTEGER`, so `+ 1` is a no-op and
          // the forgery silently forged nothing. It cost a green run of a case
          // that cannot pass.
          return Object.create(real, {
            ino: { value: real.ino === 1 ? 2 : 1, enumerable: true },
          }) as Awaited<ReturnType<typeof actual.lstat>>;
        }
        if (control.forgery.remaining > 0) {
          control.forgery.remaining -= 1;
          control.serves += 1;
          const error: NodeJS.ErrnoException = new Error(
            `ENOENT: no such file, lstat '${spelled}'`,
          );
          error.code = "ENOENT";
          throw error;
        }
      }
      return actual.lstat(target, options);
    },
  };
});

const roots: string[] = [];

beforeEach(() => {
  control.forgery = { kind: "off" };
  control.serves = 0;
});

afterEach(async () => {
  control.forgery = { kind: "off" };
  while (roots.length > 0) {
    const dir = roots.pop();
    if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prov-confirm-"));
  roots.push(dir);
  await mkdir(path.join(dir, ".qfai"), { recursive: true });
  return dir;
}

function entryTyped(): { sha256: string; installedByVersion: string; installedAt: string } {
  return {
    sha256: createHash("sha256").update("x").digest("hex"),
    installedByVersion: "1.0.0",
    installedAt: "2026-01-02T03:04:05.000Z",
  };
}

async function write(root: string, name: string): Promise<void> {
  await updateInstallProvenance(root, (current) => ({
    ...current,
    workflows: { ...current.workflows, [name]: entryTyped() },
  }));
}

describe("TC-0010-0012: confirming a freshly published provenance lock", () => {
  it("writes with no forgery in play (control)", async () => {
    const root = await tempRoot();

    await write(root, "qfai-plain.yml");

    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual(["qfai-plain.yml"]);
  });

  it("waits out an absence longer than the budget that used to bound it", async () => {
    const root = await tempRoot();
    // 20 answers at the 75ms poll is about 1.5s — past the 1s this was sized
    // at, and comfortably inside what it is sized at now. Counted in ANSWERS
    // rather than milliseconds so the fixture does not itself depend on how
    // busy the machine is; a slower machine makes the window wider, which is
    // the direction that keeps this honest.
    control.forgery = { kind: "absent", remaining: 20 };

    await write(root, "qfai-restored.yml");

    expect(control.serves, "the forgery must actually have been consumed").toBe(20);
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual([
      "qfai-restored.yml",
    ]);
  });

  it("reports a foreign object at the name, rather than accepting it", async () => {
    const root = await tempRoot();
    control.forgery = { kind: "foreign" };

    await expect(write(root, "qfai-lost.yml")).rejects.toThrow(
      /the provenance lock was replaced between publishing it and reading it back/,
    );
  });

  it("reports it on the read that sees it, not after a budget of re-reads", async () => {
    const root = await tempRoot();
    control.forgery = { kind: "foreign" };

    await expect(write(root, "qfai-lost.yml")).rejects.toThrow(/was replaced/);

    // A budget-bounded loop re-read the same foreign inode about fourteen
    // times before answering. Counting the reads rather than the elapsed time
    // is what makes this claim independent of the runner: one read for the
    // confirmation, and one for the release that hands the lock back before
    // the failure is raised.
    expect(control.serves).toBeLessThanOrEqual(3);
  });
});
