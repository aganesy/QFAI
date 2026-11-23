/**
 * The corpus mirror checks a source file and then copies it. A file the path names after the check
 * is not the file that was checked, so the copy reads the object the check approved, and a source
 * replaced between the two is left out of that mirror rather than copied in its place.
 *
 * `lstat` is wrapped because the window is between two calls inside one walk: the wrapper lets the
 * check see the original file and then replaces it, which no fixture laid out in advance can do.
 * `open` is wrapped to refuse a named file with `EACCES`, at the open or at the read: a file that
 * could not be read is not one that moved, and it still fails the mirror.
 * `vi.mock` is hoisted to module scope, so these cases live in their own file.
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
  denied: "",
  deniedAt: "open",
}));

const { accessDenied } = vi.hoisted(() => ({
  accessDenied: (target: string): Error =>
    Object.assign(new Error(`EACCES: permission denied, '${target}'`), { code: "EACCES" }),
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
    open: async (...args: Parameters<typeof fs.open>) => {
      const target = String(args[0]);
      if (target === swap.denied && swap.deniedAt === "open") throw accessDenied(target);
      const handle = await fs.open(...args);
      if (target === swap.denied) {
        handle.read = () => Promise.reject(accessDenied(target));
      }
      return handle;
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

it.each(["open", "read"])(
  "fails the mirror, naming the source, when the source cannot be read at the %s",
  async (at) => {
    const fixture = await codeAnalysisFixture();
    const source = path.join(fixture.root, "checkout.ts");
    try {
      swap.denied = source;
      swap.deniedAt = at;
      await expect(mirrorGraphCorpus(fixture.root, fixture.analysis)).rejects.toThrow(
        `Graph corpus source ${source} could not be read: EACCES`,
      );
      const mirrored = await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8").catch(
        () => undefined,
      );
      expect(mirrored).toBeUndefined();
    } finally {
      swap.denied = "";
      await fixture.dispose();
    }
  },
);
