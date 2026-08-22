/**
 * Unit: the canonical handoff is placed EXCLUSIVELY, and `--force`
 * never lets the canonical path go missing (TC-0015-0031,
 * AC-0015-0020).
 *
 * The existence probe and the placement are two syscalls apart, so the
 * cases here need a hook that runs *inside* that window — one process
 * creating `.qfai/handoff.yaml` after the probe, and a reader observing
 * the destination while a forced replacement is in flight. The last two
 * cases additionally force `link` to fail, standing in for a filesystem
 * that rejects hard links: the fallback must stay exclusive rather than
 * degrade to a clobbering `rename`. `vi.mock` is hoisted to module
 * scope, so these fs-instrumented cases live apart from the other
 * handoff-upgrade files rather than mocking fs for every case in them.
 */
// QFAI:SPEC-0015:TC-0015-0031

import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { hooks } = vi.hoisted(() => ({
  hooks: {
    /** Runs after every `writeFile` — the staging step of the commit. */
    afterWriteFile: null as null | ((target: string) => Promise<void>),
    /** Runs before every `rename` — the publish step of the commit. */
    beforeRename: null as null | ((from: string, to: string) => Promise<void>),
    /** Runs after every `copyFile` — the backup step of a `--force` run. */
    afterCopyFile: null as null | ((from: string, to: string) => Promise<void>),
    /**
     * When set, `rename` fails with this errno instead of running —
     * standing in for a publish that dies on a full or failing disk.
     */
    renameErrno: null as null | string,
    /**
     * When set, `link` fails with this errno instead of running —
     * standing in for a filesystem that rejects hard links outright
     * (FAT, some network mounts).
     */
    linkErrno: null as null | string,
  },
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    writeFile: async (
      target: Parameters<FsPromises["writeFile"]>[0],
      data: Parameters<FsPromises["writeFile"]>[1],
      options?: Parameters<FsPromises["writeFile"]>[2],
    ): Promise<void> => {
      await actual.writeFile(target, data, options);
      if (hooks.afterWriteFile !== null) await hooks.afterWriteFile(String(target));
    },
    rename: async (
      from: Parameters<FsPromises["rename"]>[0],
      to: Parameters<FsPromises["rename"]>[1],
    ): Promise<void> => {
      if (hooks.beforeRename !== null) await hooks.beforeRename(String(from), String(to));
      if (hooks.renameErrno !== null) {
        const err: NodeJS.ErrnoException = new Error(`${hooks.renameErrno}: rename failed here`);
        err.code = hooks.renameErrno;
        throw err;
      }
      await actual.rename(from, to);
    },
    copyFile: async (
      from: Parameters<FsPromises["copyFile"]>[0],
      to: Parameters<FsPromises["copyFile"]>[1],
      mode?: Parameters<FsPromises["copyFile"]>[2],
    ): Promise<void> => {
      await actual.copyFile(from, to, mode);
      if (hooks.afterCopyFile !== null) await hooks.afterCopyFile(String(from), String(to));
    },
    link: async (
      from: Parameters<FsPromises["link"]>[0],
      to: Parameters<FsPromises["link"]>[1],
    ): Promise<void> => {
      if (hooks.linkErrno !== null) {
        const err: NodeJS.ErrnoException = new Error(
          `${hooks.linkErrno}: link is unsupported here`,
        );
        err.code = hooks.linkErrno;
        throw err;
      }
      await actual.link(from, to);
    },
  };
});

/**
 * True iff `p` is one of this command's staging siblings. The name
 * carries per-run entropy (a fixed `<dest>.tmp` would be a hard link to
 * the canonical file after a crashed run), so match on the prefix.
 */
function isStagingName(p: string): boolean {
  return path.basename(p).startsWith("handoff.yaml.tmp-");
}

const { runHandoffUpgrade } = await import("../../../../src/cli/commands/handoffUpgrade.js");

let root: string;

beforeEach(async () => {
  hooks.afterWriteFile = null;
  hooks.beforeRename = null;
  hooks.afterCopyFile = null;
  hooks.renameErrno = null;
  hooks.linkErrno = null;
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-upgrade-race-"));
});

afterEach(async () => {
  hooks.afterWriteFile = null;
  hooks.beforeRename = null;
  hooks.afterCopyFile = null;
  hooks.renameErrno = null;
  hooks.linkErrno = null;
  await rm(root, { recursive: true, force: true });
});

/** True iff a directory entry is readable at `p` right now. */
async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("handoff upgrade places the canonical file exclusively", () => {
  it("refuses a canonical handoff created after the existence probe", async () => {
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    const rival = "companyName: Rival Writer\nsignature: written-by-another-process\n";
    await writeFile(path.join(root, "legacy.yml"), "companyName: FreshCo\n", "utf-8");
    // Stand in for a concurrent writer: the probe already said "absent",
    // and the file appears while our staged copy is on disk. A plain
    // `rename` would replace it — exit 0, no backup, no warning.
    hooks.afterWriteFile = async (target) => {
      if (!isStagingName(target)) return;
      hooks.afterWriteFile = null;
      await writeFile(destAbs, rival, "utf-8");
    };
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    // The other writer's bytes are intact and byte-identical.
    await expect(readFile(destAbs, "utf-8")).resolves.toBe(rival);
    expect(errs.join("\n")).toMatch(/was created while this upgrade was running/);
    // No staged remnant survives the refusal.
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  it("keeps the canonical path readable throughout a --force replacement", async () => {
    const curated = "signature: hand-edited-canonical-DO-NOT-LOSE\n";
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(destAbs, curated, "utf-8");
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    // Sample the destination at the instant the staged file is
    // published. Backing the prior file up by MOVING it would leave
    // this window empty, and a concurrent reader (`qfai validate`, the
    // saas-package profile) would observe ENOENT on a consumed SSOT.
    const observed: boolean[] = [];
    hooks.beforeRename = async (from, to) => {
      if (!isStagingName(from)) return;
      observed.push(await exists(to));
    };
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    expect(observed).toEqual([true]);
    await expect(readFile(destAbs, "utf-8")).resolves.toMatch(/companyName: "Wrong Co"/);
    const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
      n.startsWith("handoff.yaml.backup-"),
    );
    expect(backups).toHaveLength(1);
    await expect(readFile(path.join(root, ".qfai", backups[0] ?? ""), "utf-8")).resolves.toBe(
      curated,
    );
  });

  // A filesystem that rejects hard links (FAT, some network mounts)
  // fails `link` with something other than EEXIST. Degrading that to a
  // plain `rename` would replace whatever appeared after the probe with
  // no refusal and no backup — precisely the clobber the exclusive
  // placement exists to prevent.
  it("refuses a rival file even when hard links are unavailable", async () => {
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    const rival = "companyName: Rival Writer\nsignature: written-by-another-process\n";
    await writeFile(path.join(root, "legacy.yml"), "companyName: FreshCo\n", "utf-8");
    hooks.linkErrno = "EPERM";
    hooks.afterWriteFile = async (target) => {
      if (!isStagingName(target)) return;
      hooks.afterWriteFile = null;
      await writeFile(destAbs, rival, "utf-8");
    };
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    await expect(readFile(destAbs, "utf-8")).resolves.toBe(rival);
    expect(errs.join("\n")).toMatch(/was created while this upgrade was running/);
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  it("still places the canonical file when hard links are unavailable", async () => {
    await writeFile(path.join(root, "legacy.yml"), "companyName: FreshCo\n", "utf-8");
    hooks.linkErrno = "EPERM";
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    await expect(readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8")).resolves.toMatch(
      /companyName: "FreshCo"/,
    );
    // The exclusive-create fallback still clears its staging sibling.
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  // The link-free fallback used to write the canonical payload straight
  // into the destination: a write that ran out of space or hit an I/O
  // error mid-stream left a TRUNCATED `.qfai/handoff.yaml` behind — a
  // partial canonical output on a path this command promises never to
  // emit partially. Reserving the name empty and publishing the finished
  // staged file over it keeps that promise on the failure path too.
  it("leaves no partial canonical file when the link-free fallback cannot publish", async () => {
    await writeFile(path.join(root, "legacy.yml"), "companyName: FreshCo\n", "utf-8");
    hooks.linkErrno = "EPERM";
    hooks.renameErrno = "ENOSPC";
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    expect(errs.join("\n")).toMatch(/failed to write canonical handoff/);
    // No truncated destination, no staging remnant.
    expect(await exists(path.join(root, ".qfai", "handoff.yaml"))).toBe(false);
    expect(await readdir(path.join(root, ".qfai"))).toEqual([]);
  });

  // `rename` replaces its target unconditionally. If another process
  // writes the canonical handoff while this run is copying it to the
  // backup, the backup holds only the PRE-copy version — so replacing
  // the destination would erase the rival's version from every path on
  // disk, breaking the "the replaced canonical handoff stays
  // recoverable" guarantee. Re-check before replacing, and refuse.
  it("refuses to replace a destination updated after the backup was taken", async () => {
    const curated = "signature: hand-edited-canonical-DO-NOT-LOSE\n";
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(destAbs, curated, "utf-8");
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    const rival = "signature: written-by-another-process\nnotes: strictly newer than the backup\n";
    hooks.afterCopyFile = async (_from, to) => {
      if (!path.basename(to).startsWith("handoff.yaml.backup-")) return;
      hooks.afterCopyFile = null;
      await writeFile(destAbs, rival, "utf-8");
    };
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    // The rival's bytes are intact and byte-identical.
    await expect(readFile(destAbs, "utf-8")).resolves.toBe(rival);
    expect(errs.join("\n")).toMatch(/was updated by another process/);
    // The stale backup is withdrawn with the staged file — leaving it
    // would advertise a recovery point for a version nobody lost.
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });
});
