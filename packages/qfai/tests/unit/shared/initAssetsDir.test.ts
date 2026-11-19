/**
 * `assets/init` resolves from every layout this module ships in, and never
 * from outside the package.
 *
 * `tsup` bundles with `splitting: false`, so the public entry is a single
 * `dist/index.mjs` one level shallower than `dist/cli/index.mjs` and
 * `dist/shared/`. Each of those layouts has to reach the package's own
 * templates.
 *
 * Installed at `<project>/node_modules/qfai`, the directories above the package
 * belong to the project and to other dependencies. An installation missing its
 * own templates used to fall through to `<project>/assets/init` when that
 * directory looked complete, rooting the template system in files QFAI does not
 * ship. It is reported as incomplete instead.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveInitAssetsDir } from "../../../src/shared/assets.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-"));
  roots.push(root);
  return root;
}

async function writeManifest(dir: string, name: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ name }), "utf8");
}

/** A complete `assets/init` tree: both halves `runInit` copies. */
async function writeInitAssets(dir: string): Promise<string> {
  const assets = path.join(dir, "assets", "init");
  await mkdir(path.join(assets, ".qfai", "assistant"), { recursive: true });
  await mkdir(path.join(assets, "root"), { recursive: true });
  await writeFile(path.join(assets, "root", "qfai.config.yaml"), "", "utf8");
  return assets;
}

/** `<project>/node_modules/qfai`, with or without its own templates. */
async function installedPackage(withAssets: boolean): Promise<{ project: string; pkg: string }> {
  const project = await tempRoot();
  await writeManifest(project, "consumer");
  const pkg = path.join(project, "node_modules", "qfai");
  await writeManifest(pkg, "qfai");
  await mkdir(path.join(pkg, "dist", "cli"), { recursive: true });
  await mkdir(path.join(pkg, "dist", "shared"), { recursive: true });
  await mkdir(path.join(pkg, "src", "shared"), { recursive: true });
  if (withAssets) await writeInitAssets(pkg);
  return { project, pkg };
}

describe("resolveInitAssetsDir", () => {
  it.each([
    ["dist/index.mjs (public entry, bundled)", ["dist"]],
    ["dist/cli/index.mjs (CLI entry)", ["dist", "cli"]],
    ["dist/shared/ (unbundled build)", ["dist", "shared"]],
    ["src/shared/ (running from source)", ["src", "shared"]],
  ])("finds the package's own assets/init from %s", async (_layout, segments) => {
    const { pkg } = await installedPackage(true);
    expect(resolveInitAssetsDir(path.join(pkg, ...segments))).toBe(
      path.join(pkg, "assets", "init"),
    );
  });

  it("reports an incomplete installation instead of using templates outside the package", async () => {
    const { project, pkg } = await installedPackage(false);
    // Complete-looking trees at every depth the old search reached.
    await writeInitAssets(project);
    await writeInitAssets(path.join(project, "node_modules"));

    for (const segments of [["dist"], ["dist", "cli"], ["dist", "shared"]]) {
      expect(() => resolveInitAssetsDir(path.join(pkg, ...segments))).toThrow(
        `the qfai installation at ${pkg} is incomplete`,
      );
    }
  });

  it("names each missing template file", async () => {
    const { pkg } = await installedPackage(false);
    await mkdir(path.join(pkg, "assets", "init", ".qfai", "assistant"), { recursive: true });

    expect(() => resolveInitAssetsDir(path.join(pkg, "dist"))).toThrow(
      path.join(pkg, "assets", "init", "root", "qfai.config.yaml"),
    );
  });

  it("refuses a module whose nearest package is not qfai", async () => {
    const root = await tempRoot();
    await writeInitAssets(root);
    await writeManifest(root, "qfai");
    const other = path.join(root, "vendor", "bundle");
    await writeManifest(other, "someone-else");
    await writeInitAssets(other);

    expect(() => resolveInitAssetsDir(path.join(other, "dist"))).toThrow(
      `${path.join(other, "package.json")} is not the qfai package`,
    );
  });
});
