/**
 * Required-file resolution in `specLayout` must be case-exact and must not
 * count an entry it cannot actually read.
 *
 * Why the filesystem is faked here: `fs.access` delegates case folding to the
 * host, so on the Ubuntu-only test job a mis-cased required file is rejected
 * by BOTH the readdir-based probe and the old `access()` probe. A test run
 * against the real Linux filesystem therefore cannot tell the two apart and
 * would keep passing if the fix were reverted. Forcing `access` to resolve
 * for every path simulates NTFS/APFS, which is the environment the bug was
 * reported from, and makes the revert detectable on Linux CI.
 */

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type * as FsPromises from "node:fs/promises";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    default: actual,
    // Case-insensitive-filesystem stand-in: every path "exists".
    access: async (): Promise<void> => {},
  };
});

const { collectMissingLayeredRequiredFiles, collectSpecEntries } =
  await import("../../src/core/specLayout.js");

const V1421_SPEC_FILES = [
  "01_Spec.md",
  "02_User-stories.md",
  "03_Acceptance-Criteria.md",
  "04_Business-Rules.md",
  "05_Examples.md",
  "06_Test-Cases.md",
  "07_Decisions.md",
  "08_Open-questions.md",
  "09_delta.md",
];

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/**
 * Seed `.qfai/specs/spec-0001/` with the v1421 layered file set. `omit` is
 * skipped and `extra` is written afterwards, so a caller can swap one name
 * for a mis-cased variant without disturbing layout detection.
 */
async function seedSpec(options: { omit?: string; extra?: string } = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-speclayout-"));
  tempDirs.push(root);
  const specsRoot = path.join(root, ".qfai", "specs");
  const specDir = path.join(specsRoot, "spec-0001");
  await mkdir(specDir, { recursive: true });
  for (const name of V1421_SPEC_FILES) {
    if (name === options.omit) continue;
    await writeFile(path.join(specDir, name), `# ${name}\n`, "utf-8");
  }
  if (options.extra !== undefined) {
    await writeFile(path.join(specDir, options.extra), "# extra\n", "utf-8");
  }
  return specsRoot;
}

async function missingFor(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  expect(entries).toHaveLength(1);
  const entry = entries[0];
  if (entry === undefined) {
    // Returning [] here would let a broken seed pass every caller's
    // `toEqual([])` assertion and hide the real failure. Throw instead, which
    // also narrows the type for the lines below.
    throw new Error(`expected exactly one spec entry under ${specsRoot}`);
  }
  expect(entry.layout).toBe("layered");
  return collectMissingLayeredRequiredFiles(entry);
}

/**
 * Create a symlink, reporting whether the platform allowed it.
 *
 * Windows without Developer Mode or elevated rights rejects symlink creation
 * with EPERM. That is the only failure this suite may skip on — anything else
 * (a bad path, a full disk, a missing parent) is a real defect that must not be
 * swallowed into a silent pass on the Linux CI job.
 */
async function trySymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    await symlink(target, linkPath);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (process.platform === "win32" && (code === "EPERM" || code === "EACCES")) {
      return false;
    }
    throw error;
  }
}

describe("specLayout required-file resolution", () => {
  it("reports nothing missing when every required name matches exactly", async () => {
    expect(await missingFor(await seedSpec())).toEqual([]);
  });

  it("reports a mis-cased required file as missing even when the filesystem is case-insensitive", async () => {
    // `08_Open-questions.md` is not one of the v1421 style markers, so
    // swapping its case exercises the required-file probe without changing
    // which file set the entry is measured against.
    const specsRoot = await seedSpec({
      omit: "08_Open-questions.md",
      extra: "08_open-questions.md",
    });
    expect(await missingFor(specsRoot)).toEqual(["08_Open-questions.md"]);
  });

  it("reports a required file that is a dangling symlink as missing", async () => {
    const specsRoot = await seedSpec({ omit: "07_Decisions.md" });
    const linkPath = path.join(specsRoot, "spec-0001", "07_Decisions.md");
    // The behaviour is platform-independent, so skipping on a Windows host
    // that forbids symlinks still leaves it covered by the Linux CI job.
    if (!(await trySymlink(path.join(specsRoot, "spec-0001", "does-not-exist.md"), linkPath))) {
      return;
    }
    expect(await missingFor(specsRoot)).toEqual(["07_Decisions.md"]);
  });

  it("accepts a required file that is a symlink to a real file", async () => {
    const specsRoot = await seedSpec({ omit: "07_Decisions.md", extra: "07_Decisions.source.md" });
    const linkPath = path.join(specsRoot, "spec-0001", "07_Decisions.md");
    if (!(await trySymlink(path.join(specsRoot, "spec-0001", "07_Decisions.source.md"), linkPath))) {
      return;
    }
    expect(await missingFor(specsRoot)).toEqual([]);
  });
});
