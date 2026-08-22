/**
 * Unit: the canonical handoff is placed EXCLUSIVELY, and `--force`
 * never lets the canonical path go missing (TC-0015-0031,
 * AC-0015-0020).
 *
 * The existence probe and the placement are two syscalls apart, so both
 * cases here need a hook that runs *inside* that window — one process
 * creating `.qfai/handoff.yaml` after the probe, and a reader observing
 * the destination while a forced replacement is in flight. `vi.mock` is
 * hoisted to module scope, so these fs-instrumented cases live apart
 * from the other handoff-upgrade files rather than mocking fs for every
 * case in them.
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
      await actual.rename(from, to);
    },
  };
});

const { runHandoffUpgrade } = await import("../../../../src/cli/commands/handoffUpgrade.js");

let root: string;

beforeEach(async () => {
  hooks.afterWriteFile = null;
  hooks.beforeRename = null;
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-upgrade-race-"));
});

afterEach(async () => {
  hooks.afterWriteFile = null;
  hooks.beforeRename = null;
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
      if (!target.endsWith("handoff.yaml.tmp")) return;
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
      if (!from.endsWith("handoff.yaml.tmp")) return;
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
});
