/**
 * A `.gitignore` that shares its bytes with another hard-linked name.
 *
 * Every writer of the project's `.gitignore` wrote the file in place, so an update to the
 * managed block also changed the bytes visible through the other name, a file outside the
 * project included. The update must reach the project's `.gitignore` only: init, doctor's
 * repair and the graph ignore block each leave the other name as it was.
 */

import { link, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { QFAI_GITIGNORE_MARKER } from "../../src/core/gitignore.js";
import { ensureGraphGitignore, GRAPH_IGNORE_MARKER } from "../../src/core/graph/ignore.js";
import { runGraphProcess } from "../../src/core/graph/process.js";
import { runInit } from "../helpers/legacyInit.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SHARED = "node_modules/\n";

const scratchDirs: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const dir of scratchDirs.splice(0)) await removeTempTree(dir);
});

/** A project whose `.gitignore` is a second name of a file that lives outside it. */
async function linkedProject(): Promise<{ root: string; other: string }> {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-hardlink-"));
  scratchDirs.push(scratch);
  const root = path.join(scratch, "project");
  await mkdir(root);
  const other = path.join(scratch, "shared.gitignore");
  await writeFile(other, SHARED, "utf-8");
  await link(other, path.join(root, ".gitignore"));
  expect((await stat(other)).nlink).toBe(2);
  return { root, other };
}

async function expectOnlyTheProjectEntryChanged(
  root: string,
  other: string,
  marker: string,
): Promise<void> {
  expect(await readFile(path.join(root, ".gitignore"), "utf-8")).toContain(marker);
  expect(await readFile(other, "utf-8")).toBe(SHARED);
  expect((await stat(other)).nlink).toBe(1);
}

describe("a hard-linked .gitignore keeps its other name", () => {
  it("qfai init updates the project's .gitignore only", async () => {
    const { root, other } = await linkedProject();
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    await expectOnlyTheProjectEntryChanged(root, other, QFAI_GITIGNORE_MARKER);
  });

  it("qfai doctor --autoremediate repairs the project's .gitignore only", async () => {
    const { root, other } = await linkedProject();
    vi.stubEnv("CI", "false");
    vi.stubEnv("GITHUB_ACTIONS", "false");
    await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/specs\n");
    await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath: path.join(root, ".qfai", "report", "doctor.json"),
      autoremediate: true,
      yes: true,
    });
    await expectOnlyTheProjectEntryChanged(root, other, QFAI_GITIGNORE_MARKER);
  });

  it("the graph ignore block reaches the project's .gitignore only", async () => {
    const { root, other } = await linkedProject();
    expect((await runGraphProcess("git", ["init", "--quiet"], { cwd: root })).exitCode).toBe(0);
    expect((await ensureGraphGitignore(root, runGraphProcess)).files).toEqual([".gitignore"]);
    await expectOnlyTheProjectEntryChanged(root, other, GRAPH_IGNORE_MARKER);
  });
});
