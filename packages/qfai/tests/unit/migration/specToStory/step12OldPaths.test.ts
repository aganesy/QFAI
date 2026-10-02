import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
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

  it("leaves every tracked file out when a configured directory is the project root", async () => {
    const context = await trackedProject(".", ".qfai/spec/03_contract");
    const scan = await scanOldPaths(context);
    expect(scan.items).toEqual([]);
    expect(scan.scanned).toBe("files checked for 1.x paths: 0");
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
