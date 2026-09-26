import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { assertPackagedGithubTopology } from "../../../../scripts/lib/pack-github-topology.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const initAssets = path.join(repoRoot, "packages/qfai/assets/init");
const shippedGithub = path.join(initAssets, "root/.github");

async function compositeActionPaths(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.name === "actions" || entry.name === "action.yml" || entry.name === "action.yaml") {
      found.push(path.relative(initAssets, child).split(path.sep).join("/"));
    }
    if (entry.isDirectory()) found.push(...(await compositeActionPaths(child)));
  }
  return found;
}

// QFAI:EX-0002-0015-05
it("keeps the own setup outside the shipped tree and makes pack verification reject other GitHub children", async () => {
  const verifyPack = await readFile(path.join(repoRoot, "scripts/verify-pack.mjs"), "utf-8");
  expect(verifyPack).toContain('from "./lib/pack-github-topology.mjs"');
  expect(verifyPack).toContain("assertPackagedGithubTopology(rootGithubDir)");
  expect(await compositeActionPaths(initAssets)).toEqual([]);
  expect(() => assertPackagedGithubTopology(shippedGithub)).not.toThrow();

  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf2-pack-boundary-"));
  try {
    for (const child of ["actions", "dependabot.yml", "ISSUE_TEMPLATE"]) {
      const copy = path.join(root, child, ".github");
      await cp(shippedGithub, copy, { recursive: true });
      const planted = path.join(copy, child);
      if (child === "dependabot.yml") {
        await writeFile(planted, "version: 2\n", "utf-8");
      } else {
        await mkdir(planted);
      }
      expect(() => assertPackagedGithubTopology(copy)).toThrow(
        `assets/init/root/.github/${child} must not exist (only workflows/ is permitted).`,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
