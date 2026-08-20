/**
 * `assets/init` has to resolve from every layout this module ships in.
 *
 * `tsup` bundles with `splitting: false`, so the package's public entry is a
 * single `dist/index.mjs` at the package root — one level shallower than
 * `dist/cli/index.mjs` and `dist/shared/`. The candidate list covered only the
 * deeper two, so a caller reaching `validateProject` through the library entry
 * searched `<parent-of-package>/assets/init` and got `Template assets not
 * found` before any validator ran. The CLI was unaffected, which is why it went
 * unnoticed — and this repository consumes QFAI as an installed package, so the
 * post-publish path is a real one.
 */

import path from "node:path";

import { describe, expect, it } from "vitest";

import { initAssetsCandidates } from "../../../src/shared/assets.js";

const PACKAGE_ROOT = path.resolve("/pkg");
const EXPECTED = path.join(PACKAGE_ROOT, "assets", "init");

describe("initAssetsCandidates", () => {
  it.each([
    ["dist/index.mjs (public entry, bundled)", path.join(PACKAGE_ROOT, "dist")],
    ["dist/cli/index.mjs (CLI entry)", path.join(PACKAGE_ROOT, "dist", "cli")],
    ["dist/shared/ (unbundled build)", path.join(PACKAGE_ROOT, "dist", "shared")],
    ["src/shared/ (running from source)", path.join(PACKAGE_ROOT, "src", "shared")],
  ])("offers the package's own assets/init from %s", (_layout, baseDir) => {
    expect(initAssetsCandidates(baseDir)).toContain(EXPECTED);
  });

  it("orders candidates nearest-first, so an outer directory cannot win", () => {
    // Installed, the outer depths are not this package: from
    // `<project>/node_modules/qfai/dist`, the three-level candidate is
    // `<project>/assets/init`. A consuming project with an unrelated
    // `assets/init` would be adopted as the template root, and a
    // wrong-but-present directory is worse than a missing one — the shipped
    // roster reads empty and `QFAI-LINK-001` passes every broken wrapper.
    const project = path.resolve("/project");
    const installed = path.join(project, "node_modules", "qfai", "dist");
    const candidates = initAssetsCandidates(installed);
    expect(candidates[0]).toBe(path.join(project, "node_modules", "qfai", "assets", "init"));
    expect(candidates.indexOf(path.join(project, "assets", "init"))).toBeGreaterThan(0);
    // Nearest-first is the whole property: longest path first.
    expect(candidates.map((entry) => entry.length)).toEqual(
      [...candidates.map((entry) => entry.length)].sort((left, right) => right - left),
    );
  });
});
