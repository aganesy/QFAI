/**
 * The marker retirement unlinks a pathname, and two things can move under it.
 *
 * Earlier releases wrote `.qfai/assistant/README.md` and `QFAI-LINK-001` read
 * it to decide whether `qfai init` had run. It reads two records now, so the
 * README is removed — but only the copy init itself wrote, and only while it is
 * still that copy. Two windows: the file can be saved over between the read
 * that decides and the unlink that acts, and the `lstat` that decides whether
 * there is anything there at all can fail for a reason that is not absence.
 * Both used to end in a silent deletion or a silently skipped run.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from
 * `init.test.ts`, where the real filesystem calls must run untouched.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { lstatSpy, openSpy } = vi.hoisted(() => ({
  lstatSpy: vi.fn(),
  openSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    open: (...args: unknown[]) => openSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { captureStdout } = await import("../helpers/stdout.js");

const MARKER_SEGMENTS = [".qfai", "assistant", "README.md"] as const;

/** The README earlier releases wrote, signature and all. */
const OWNED = [
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

async function withSeededProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-marker-race-"));
  try {
    await mkdir(path.dirname(markerPath(root)), { recursive: true });
    await writeFile(markerPath(root), OWNED, "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function absent(target: string): Promise<boolean> {
  try {
    await stat(target);
    return false;
  } catch {
    return true;
  }
}

// Every spy passes through by default; each test overrides only the call whose
// race it is about.
beforeEach(() => {
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
});

describe("the assistant marker retirement under concurrent writes", () => {
  it("removes the copy it wrote when nothing moves under it", async () => {
    // The control for the two races below: without it, a retirement that never
    // fires would satisfy both of them.
    await withSeededProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(await absent(markerPath(root))).toBe(true);
    });
  });

  it("declines when the README is rewritten in place after it was read", async () => {
    // An editor that truncates and rewrites **keeps the inode**, so a check on
    // `dev`/`ino` alone reads the file as untouched and the unlink deletes
    // content this run never saw.
    await withSeededProject(async (root) => {
      const marker = markerPath(root);
      const arrived = "# assistant/\n\nWritten while init was running.\n";
      let reads = 0;
      openSpy.mockImplementation(async (actual: FsPromises, target: unknown, ...rest: never[]) => {
        // The retirement reads the README twice: once to decide, once to
        // confirm nothing moved. Between them, somebody saves over it.
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

  it("says so when the README's state cannot be read, instead of skipping in silence", async () => {
    // Only absence is the ordinary case. An ACL or a transient `EIO` reached
    // the same silent skip, so the run reported clean over a project still
    // holding a document that describes a check the tool no longer makes.
    await withSeededProject(async (root) => {
      const marker = markerPath(root);
      lstatSpy.mockImplementation((actual: FsPromises, target: unknown, ...rest: never[]) =>
        target === marker ? Promise.reject(errno("EIO")) : actual.lstat(target as string, ...rest),
      );

      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(await readFile(marker, "utf-8")).toBe(OWNED);
      expect(output).toContain("could not stat");
    });
  });

  it("treats an absent README as the ordinary case, with nothing to say", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-marker-race-"));
    try {
      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(await absent(markerPath(root))).toBe(true);
      expect(output).not.toContain("could not stat");
      expect(output).not.toContain("another process replaced");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
