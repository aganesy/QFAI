/**
 * The marker repair replaces a pathname, and three things can move under it.
 *
 * `.qfai/assistant/README.md` is what `QFAI-LINK-001` reads to decide whether
 * `qfai init` has run, and the repair that writes the marker into it does so by
 * staging a sidecar and renaming. Each step has a window: the staging pathname
 * can be taken by somebody else, the README can be rewritten in place after it
 * was read, and the `lstat` that decides whether there is anything to repair can
 * fail for a reason that is not absence. All three used to end in a silent
 * overwrite or a silently skipped repair.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from
 * `init.test.ts`, where the real filesystem calls must run untouched.
 */

import type * as fsPromises from "node:fs/promises";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { lstatSpy, openSpy, writeFileSpy } = vi.hoisted(() => ({
  lstatSpy: vi.fn(),
  openSpy: vi.fn(),
  writeFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    open: (...args: unknown[]) => openSpy(actual, ...args),
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { hasInitMarkerSignature } = await import("../../src/core/paths/assistantPaths.js");
const { captureStdout } = await import("../helpers/stdout.js");

const MARKER_SEGMENTS = [".qfai", "assistant", "README.md"] as const;

/** A README from before the signature existed — the state the repair is for. */
const LEGACY = "# assistant/\n\nProject notes that must survive.\n";

function markerPath(root: string): string {
  return path.join(root, ...MARKER_SEGMENTS);
}

function errno(code: string): NodeJS.ErrnoException {
  const error = new Error(`simulated ${code}`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

async function withSeededProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-marker-race-"));
  try {
    await mkdir(path.dirname(markerPath(root)), { recursive: true });
    await writeFile(markerPath(root), LEGACY, "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// Every spy passes through by default; each test overrides only the call whose
// race it is about.
beforeEach(() => {
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
  writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.writeFile(...args),
  );
});

describe("the assistant marker repair under concurrent writes", () => {
  it("stages through the handle it opened, never through the sidecar's name", async () => {
    // `wx` proves the sidecar was ours at creation and nothing more. Closing
    // that handle and re-opening the predictable name to write it gives the
    // proof away: a process that can write the directory may put a symlink
    // there in between, and the write follows it out of the project.
    await withSeededProject(async (root) => {
      const written: string[] = [];
      writeFileSpy.mockImplementation((actual: FsPromises, target: unknown, ...rest: never[]) => {
        if (typeof target === "string") written.push(target);
        return actual.writeFile(target as string, ...rest);
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(hasInitMarkerSignature(await readFile(markerPath(root), "utf-8"))).toBe(true);
      expect(written.filter((target) => target.includes(".qfai-repair-"))).toEqual([]);
    });
  });

  it("declines when the README is rewritten in place after it was read", async () => {
    // An editor that truncates and rewrites **keeps the inode**, so a check on
    // `dev`/`ino` alone read the file as untouched and the rename deleted the
    // new content, replacing it with a merge of the old.
    await withSeededProject(async (root) => {
      const marker = markerPath(root);
      const arrived = "# assistant/\n\nWritten while init was running.\n";
      let reads = 0;
      openSpy.mockImplementation(async (actual: FsPromises, target: unknown, ...rest: never[]) => {
        // The repair reads the README twice: once to merge, once to confirm
        // nothing moved. Between them, somebody saves over it.
        if (target === marker) {
          reads += 1;
          if (reads === 2) await actual.writeFile(marker, arrived, "utf-8");
        }
        return actual.open(target as string, ...rest);
      });

      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(await readFile(marker, "utf-8")).toBe(arrived);
      expect(output).toContain("another process replaced");
    });
  });

  it("declines rather than renaming a sidecar that is no longer the one it wrote", async () => {
    // The staging pathname is predictable. If it is somebody else's file by the
    // time of the swap, renaming it over the README installs content this
    // repair never wrote — and removing it deletes a file that is not ours.
    await withSeededProject(async (root) => {
      const marker = markerPath(root);
      const intruder = "not written by the repair\n";
      let swapped = false;
      lstatSpy.mockImplementation(async (actual: FsPromises, target: unknown, ...rest: never[]) => {
        if (typeof target === "string" && target.includes(".qfai-repair-") && !swapped) {
          swapped = true;
          // Renamed in from elsewhere rather than removed and rewritten in
          // place: a freed inode is routinely handed straight back on tmpfs,
          // and the replacement has to be a genuinely different file for the
          // identity check to be the thing under test.
          const staging = path.join(root, "intruder.tmp");
          await actual.writeFile(staging, intruder, "utf-8");
          await actual.rename(staging, target);
        }
        return actual.lstat(target as string, ...rest);
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      // The README is untouched, and the intruder's file is still theirs.
      expect(await readFile(marker, "utf-8")).toBe(LEGACY);
      const leftovers = (await readdir(path.dirname(marker))).filter((name) =>
        name.includes(".qfai-repair-"),
      );
      expect(leftovers).toHaveLength(1);
      expect(await readFile(path.join(path.dirname(marker), leftovers[0] ?? ""), "utf-8")).toBe(
        intruder,
      );
    });
  });

  it("says so when the README's state cannot be read, instead of skipping in silence", async () => {
    // Only absence is the template copy's case. An ACL or a transient `EIO`
    // reached the same silent skip, and the copy before it had already filed
    // the path as *skipped* — so the run reported clean over a project whose
    // integration surface still reads as never initialised.
    await withSeededProject(async (root) => {
      const marker = markerPath(root);
      lstatSpy.mockImplementation((actual: FsPromises, target: unknown, ...rest: never[]) =>
        target === marker ? Promise.reject(errno("EIO")) : actual.lstat(target as string, ...rest),
      );

      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(await readFile(marker, "utf-8")).toBe(LEGACY);
      expect(output).toContain("could not stat");
      expect(output).toContain("QFAI-LINK-001");
    });
  });

  it("treats an absent README as the template copy's case, with nothing to say", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-marker-race-"));
    try {
      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(hasInitMarkerSignature(await readFile(markerPath(root), "utf-8"))).toBe(true);
      expect(output).not.toContain("could not stat");
      expect((await lstat(markerPath(root))).isFile()).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
