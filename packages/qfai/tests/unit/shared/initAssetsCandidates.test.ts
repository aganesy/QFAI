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

  it("orders candidates deepest first so a shallower guess cannot win", () => {
    // Each is only accepted if it exists, so ordering matters only when more
    // than one does. Deepest-first keeps the historical resolution unchanged.
    const candidates = initAssetsCandidates(path.join(PACKAGE_ROOT, "dist", "cli"));
    expect(candidates.map((entry) => entry.length)).toEqual(
      [...candidates.map((entry) => entry.length)].sort((left, right) => left - right),
    );
  });
});
