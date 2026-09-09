/**
 * `qfai init` takes away the README it used to write at
 * `.qfai/assistant/README.md`, and the filesystem can answer it with something
 * other than "gone" or "still there".
 *
 * The file is inert either way: `QFAI-LINK-001` reads two machine-readable
 * records now, so nothing depends on the removal succeeding. What matters is
 * that a run which cannot remove it says so and still installs the tree, and
 * that it never takes a file the project owns.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from
 * `init.test.ts`, where the real filesystem calls must run untouched.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { lstatSpy, rmSpy } = vi.hoisted(() => ({
  lstatSpy: vi.fn(),
  rmSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    rm: (...args: unknown[]) => rmSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { captureStdout } = await import("../helpers/stdout.js");

const MARKER_SEGMENTS = [".qfai", "assistant", "README.md"] as const;

/** A body carrying all three parts of the signature init used to write. */
const RETIRED_README = [
  "# QFAI assistant tree",
  "",
  "## Canonical entrypoint",
  "",
  "- .qfai/assistant/skills/",
  "",
].join("\n");

function markerPath(root: string): string {
  return path.join(root, ...MARKER_SEGMENTS);
}

function errno(code: string): NodeJS.ErrnoException {
  const error = new Error(`simulated ${code}`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

/** A tree holding the README an earlier release wrote, signature and all. */
async function withRetiredReadme(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-retired-readme-"));
  try {
    await mkdir(path.dirname(markerPath(root)), { recursive: true });
    await writeFile(markerPath(root), RETIRED_README, "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

// Every spy passes through by default; each test overrides only the call whose
// failure it is about.
beforeEach(() => {
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  rmSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.rm(...args));
});

describe("removing the README qfai init used to write", () => {
  it("takes the one carrying init's signature", async () => {
    await withRetiredReadme(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(await exists(markerPath(root))).toBe(false);
    });
  });

  it("leaves a README the project wrote", async () => {
    // Only the signature tells init's file from the project's, and it is read
    // here for the last time. Without it the removal would take notes nobody
    // asked it to touch.
    await withRetiredReadme(async (root) => {
      await writeFile(markerPath(root), "# our own notes\n", "utf-8");

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(await exists(markerPath(root))).toBe(true);
    });
  });

  it("writes nothing under --dry-run", async () => {
    await withRetiredReadme(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: true, yes: true }));

      expect(await exists(markerPath(root))).toBe(true);
    });
  });

  it("says so when the README's state cannot be read, instead of skipping in silence", async () => {
    // Absence is the ordinary case and says nothing. Any other answer means the
    // file may still be there, and a run that reported nothing would leave the
    // reader believing a document it still has was taken away.
    await withRetiredReadme(async (root) => {
      lstatSpy.mockImplementation(async (actual: FsPromises, target: unknown, ...rest: never[]) => {
        if (typeof target === "string" && target === markerPath(root)) {
          throw errno("EACCES");
        }
        return await actual.lstat(target as string, ...rest);
      });

      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(output).toContain("could not stat");
      expect(await exists(markerPath(root))).toBe(true);
    });
  });

  it("says so when the removal itself fails, and finishes the run", async () => {
    // The tree is installed either way. A stale document surviving is not a
    // failed install, and ending the run over one would be the worse trade.
    await withRetiredReadme(async (root) => {
      rmSpy.mockImplementation(async (actual: FsPromises, target: unknown, ...rest: never[]) => {
        if (typeof target === "string" && target === markerPath(root)) {
          throw errno("EPERM");
        }
        return await actual.rm(target as string, ...rest);
      });

      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(output).toContain("could not remove");
      expect(await exists(path.join(root, ".qfai", "install-provenance.json"))).toBe(true);
    });
  });

  it("leaves anything at that path that is not a regular file", async () => {
    // A directory or a symlink there is the project's, whatever it holds.
    await withRetiredReadme(async (root) => {
      await rm(markerPath(root));
      await mkdir(markerPath(root), { recursive: true });
      await writeFile(path.join(markerPath(root), "note.md"), "kept\n", "utf-8");

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(await exists(path.join(markerPath(root), "note.md"))).toBe(true);
    });
  });
});
