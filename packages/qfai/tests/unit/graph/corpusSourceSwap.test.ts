/**
 * The corpus mirror checks a source file and then copies it. A file the path names after the check
 * is not the file that was checked, so the copy reads the object the check approved, and a source
 * replaced between the two is left out of that mirror rather than copied in its place.
 *
 * `lstat` is wrapped because the window is between two calls inside one walk: the wrapper lets the
 * check see the original file and then replaces it, which no fixture laid out in advance can do.
 * `vi.mock` is hoisted to module scope, so this case lives in its own file.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type * as NativeFs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { mirrorGraphCorpus } from "../../../src/core/graph/analysis.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";

const swap = vi.hoisted(() => ({
  source: "",
  replacement: "",
}));

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    lstat: async (target: Parameters<typeof fs.lstat>[0]) => {
      const stats = await fs.lstat(target);
      if (swap.source !== "" && String(target) === swap.source) {
        const replacement = swap.replacement;
        swap.source = "";
        await fs.rename(replacement, String(target));
      }
      return stats;
    },
  };
});

it("leaves a source replaced between its check and its copy out of the mirror", async () => {
  const fixture = await codeAnalysisFixture();
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-swap-"));
  try {
    const source = path.join(fixture.root, "checkout.ts");
    const replacement = path.join(elsewhere, "replacement.ts");
    await writeFile(replacement, "Replacement content.\n");
    swap.replacement = replacement;
    swap.source = source;

    await mirrorGraphCorpus(fixture.root, fixture.analysis);

    expect(swap.source).toBe("");
    const mirrored = await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8").catch(
      () => undefined,
    );
    expect(mirrored).toBeUndefined();

    // The next mirror checks the file the path now names and copies that one.
    await mirrorGraphCorpus(fixture.root, fixture.analysis);
    expect(await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8")).toBe(
      "Replacement content.\n",
    );
  } finally {
    swap.source = "";
    await fixture.dispose();
    await rm(elsewhere, { recursive: true, force: true });
  }
});
