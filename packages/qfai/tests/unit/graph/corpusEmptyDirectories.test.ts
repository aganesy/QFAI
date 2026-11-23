/**
 * A corpus mirror creates no empty directory, so it leaves none behind either: a staged directory
 * whose source is gone, or whose source path now names an entry the mirror skips, is removed with
 * its files. An empty staged directory alone holds no input, so it is not a change to compare.
 */

import { link, lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { graphCorpusChanged, mirrorGraphCorpus } from "../../../src/core/graph/analysis.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";

async function exists(target: string): Promise<boolean> {
  return lstat(target).then(
    () => true,
    () => false,
  );
}

it("removes the staged directories of a source directory that is gone", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await mkdir(path.join(fixture.root, "src", "feature"), { recursive: true });
    await writeFile(path.join(fixture.root, "src", "feature", "cart.ts"), "export {};\n");
    await mirrorGraphCorpus(fixture.root, fixture.analysis);
    expect(await exists(path.join(fixture.analysis, "src", "feature", "cart.ts"))).toBe(true);

    await rm(path.join(fixture.root, "src"), { recursive: true });
    await mirrorGraphCorpus(fixture.root, fixture.analysis);

    expect(await exists(path.join(fixture.analysis, "src"))).toBe(false);
    expect(await exists(path.join(fixture.analysis, "checkout.ts"))).toBe(true);
    expect(await exists(path.join(fixture.analysis, ".codegraph", "codegraph.db"))).toBe(true);
  } finally {
    await fixture.dispose();
  }
});

it("removes the staged directory of a source directory replaced by a file the mirror skips", async () => {
  const fixture = await codeAnalysisFixture();
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-empty-dirs-"));
  try {
    await mkdir(path.join(fixture.root, "lib", "nested"), { recursive: true });
    await writeFile(path.join(fixture.root, "lib", "nested", "util.ts"), "export {};\n");
    await mirrorGraphCorpus(fixture.root, fixture.analysis);
    expect(await exists(path.join(fixture.analysis, "lib", "nested", "util.ts"))).toBe(true);

    await rm(path.join(fixture.root, "lib"), { recursive: true });
    const shared = path.join(elsewhere, "shared.ts");
    await writeFile(shared, "export const shared = 1;\n");
    await link(shared, path.join(fixture.root, "lib"));
    await mirrorGraphCorpus(fixture.root, fixture.analysis);

    expect(await exists(path.join(fixture.analysis, "lib"))).toBe(false);
  } finally {
    await fixture.dispose();
    await rm(elsewhere, { recursive: true, force: true });
  }
});

it("reports no change for an empty staged directory alone, and the next mirror removes it", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await mirrorGraphCorpus(fixture.root, fixture.analysis);
    await mkdir(path.join(fixture.analysis, "left", "behind"), { recursive: true });

    expect(await graphCorpusChanged(fixture.root, fixture.analysis)).toBe(false);
    await mirrorGraphCorpus(fixture.root, fixture.analysis);

    expect(await exists(path.join(fixture.analysis, "left"))).toBe(false);
  } finally {
    await fixture.dispose();
  }
});
