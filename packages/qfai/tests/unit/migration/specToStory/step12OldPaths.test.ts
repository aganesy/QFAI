import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import type * as BoundedRead from "../../../../src/shared/boundedRead.js";

/** Work the next scan of a file runs just before it opens the file, as a swap between check and open would. */
const { beforeScan } = vi.hoisted(() => {
  const hook: { run: (() => Promise<void>) | null } = { run: null };
  return { beforeScan: hook };
});

vi.mock("../../../../src/shared/boundedRead.js", async () => {
  const actual = await vi.importActual<typeof BoundedRead>("../../../../src/shared/boundedRead.js");
  return {
    ...actual,
    scanBoundedRegularFile: async (
      ...args: Parameters<typeof actual.scanBoundedRegularFile>
    ): ReturnType<typeof actual.scanBoundedRegularFile> => {
      const run = beforeScan.run;
      beforeScan.run = null;
      if (run !== null) await run();
      return actual.scanBoundedRegularFile(...args);
    },
  };
});
import {
  MigrationInputError,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import {
  reportableName,
  scanOldPaths,
} from "../../../../src/migration/specToStory/step12OldPaths.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

/** A git work tree holding one tracked file that names a 1.x path, and a context for it. */
async function trackedProject(specsDir: string, contractsDir: string): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-step12-scan-"));
  roots.push(root);
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(
    path.join(root, "docs", "notes.md"),
    "Read .qfai/specs/_policies/04_Business-Flow.md\n",
  );
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  const config = structuredClone(defaultConfig);
  return {
    root,
    specsDir: path.join(root, specsDir),
    contractsDir: path.join(root, contractsDir),
    config,
  };
}

describe("step 12 project-file scan", () => {
  it("lists a tracked file that names a 1.x path", async () => {
    const context = await trackedProject(".qfai/spec", ".qfai/spec/03_contract");
    const scan = await scanOldPaths(context);
    expect(scan.items).toHaveLength(1);
    expect(scan.items[0]).toContain("old-path: docs/notes.md:1:");
  });

  it("reads a project's own files when its root is reached through a link", async () => {
    const context = await trackedProject(".qfai/spec", ".qfai/spec/03_contract");
    const holder = await mkdtemp(path.join(os.tmpdir(), "qfai-step12-link-"));
    roots.push(holder);
    const linked = path.join(holder, "project");
    await symlink(context.root, linked, "junction");
    const scan = await scanOldPaths({
      ...context,
      root: linked,
      specsDir: path.join(linked, ".qfai/spec"),
      contractsDir: path.join(linked, ".qfai/spec/03_contract"),
    });
    expect(scan.items).toHaveLength(1);
    expect(scan.items[0]).toContain("old-path: docs/notes.md:1:");
    expect(scan.scanned).toEqual(["files checked for 1.x paths: 1"]);
  });

  it("leaves out a file whose directory is swapped for a link outside the project before the open", async () => {
    const context = await trackedProject(".qfai/spec", ".qfai/spec/03_contract");
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-step12-swap-"));
    roots.push(outside);
    await writeFile(path.join(outside, "notes.md"), "Read .qfai/contracts\n");
    beforeScan.run = async () => {
      await rename(path.join(context.root, "docs"), path.join(context.root, "docs-moved"));
      await symlink(outside, path.join(context.root, "docs"), "junction");
    };
    const scan = await scanOldPaths(context);
    expect(beforeScan.run).toBeNull();
    expect(scan.items).toEqual([]);
    expect(scan.scanned).toEqual(["files checked for 1.x paths: 0"]);
  });

  it("leaves every tracked file out when a configured directory is the project root", async () => {
    const context = await trackedProject(".", ".qfai/spec/03_contract");
    const scan = await scanOldPaths(context);
    expect(scan.items).toEqual([]);
    expect(scan.scanned).toEqual(["files checked for 1.x paths: 0"]);
  });

  it("names a text file past 16 MiB as not checked and skips a binary file of any size", async () => {
    const context = await trackedProject(".qfai/spec", ".qfai/spec/03_contract");
    const huge = Buffer.alloc(16 * 1024 * 1024 + 1, "a");
    huge.write(".qfai/specs\n", 0);
    await writeFile(path.join(context.root, "docs", "huge.md"), huge);
    const binary = Buffer.alloc(16 * 1024 * 1024 + 1, "a");
    binary[1] = 0;
    await writeFile(path.join(context.root, "docs", "huge.bin"), binary);
    execFileSync("git", ["add", "."], { cwd: context.root });
    const scan = await scanOldPaths(context);
    expect(scan.items).toHaveLength(1);
    expect(scan.items[0]).toContain("old-path: docs/notes.md:1:");
    expect(scan.scanned).toEqual([
      "files checked for 1.x paths: 1",
      "not checked for 1.x paths, larger than 16 MiB: docs/huge.md",
    ]);
  });

  it("lists every line of a file with more matching lines than one call takes as arguments", async () => {
    const context = await trackedProject(".qfai/spec", ".qfai/spec/03_contract");
    // 500,000 arguments overflow the call stack, so spreading the hits into one push would throw.
    const lines = 500_000;
    await writeFile(path.join(context.root, "docs", "vendored.md"), ".qfai/specs\n".repeat(lines));
    execFileSync("git", ["add", "."], { cwd: context.root });
    const scan = await scanOldPaths(context);
    expect(scan.items).toHaveLength(lines + 1);
    expect(scan.items.at(-1)).toBe(
      `old-path: docs/vendored.md:${String(lines)}: still names 1.x paths: \`.qfai/specs\``,
    );
    expect(scan.scanned).toEqual(["files checked for 1.x paths: 2"]);
  });

  it("writes a control character of a file name as an escape and keeps other characters", () => {
    expect(reportableName("a\nb\u001b[31m.md")).toBe("a\\x0ab\\x1b[31m.md");
    expect(reportableName("café/α.md")).toBe("café/α.md");
  });

  it("ends the run as an input failure when git cannot be started", async () => {
    const context = await trackedProject(".qfai/spec", ".qfai/spec/03_contract");
    const empty = await mkdtemp(path.join(os.tmpdir(), "qfai-step12-nopath-"));
    roots.push(empty);
    const saved = { PATH: process.env.PATH, Path: process.env.Path };
    try {
      process.env.PATH = empty;
      if (process.env.Path !== undefined) process.env.Path = empty;
      await expect(scanOldPaths(context)).rejects.toBeInstanceOf(MigrationInputError);
    } finally {
      if (saved.PATH === undefined) delete process.env.PATH;
      else process.env.PATH = saved.PATH;
      if (saved.Path !== undefined) process.env.Path = saved.Path;
    }
  });
});
