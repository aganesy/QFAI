import { copyFile, readFile, writeFile } from "node:fs/promises";
import type * as NativeFs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { inspectCurrentCodeAnalysis } from "../../../src/core/graph/analysis.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return { ...fs, copyFile: vi.fn(fs.copyFile) };
});

/** The mirror files copied into `analysis` since the spy was last cleared. */
function copiedInto(analysis: string): string[] {
  const active = path.resolve(analysis);
  return vi
    .mocked(copyFile)
    .mock.calls.map(([, target]) => path.resolve(String(target)))
    .filter((target) => target.startsWith(`${active}${path.sep}`))
    .map((target) => path.relative(active, target).split(path.sep).join("/"));
}

// Mutation: packages/qfai/src/core/graph/analysis.ts `if (await sameFile(source, target)) {` -> `if (false) {` fails "copies no code corpus file again when a repeated query finds it unchanged"
it("copies no code corpus file again when a repeated query finds it unchanged", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await expect(inspectCurrentCodeAnalysis(fixture.root, fixture.run)).resolves.toBe(true);
    expect(copiedInto(fixture.analysis)).toEqual(["checkout.ts"]);
    vi.mocked(copyFile).mockClear();
    await expect(inspectCurrentCodeAnalysis(fixture.root, fixture.run)).resolves.toBe(true);
    await expect(inspectCurrentCodeAnalysis(fixture.root, fixture.run)).resolves.toBe(true);
    expect(copiedInto(fixture.analysis)).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/analysis.ts `if (await sameFile(source, target)) {` -> `if (true) {` fails "copies an uncommitted edit into the code corpus on the next query"
it("copies an uncommitted edit into the code corpus on the next query", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "total.ts"), "export const total = 1;\n");
    await inspectCurrentCodeAnalysis(fixture.root, fixture.run);
    const changed = "export function checkout() { return 8; }\n";
    await writeFile(path.join(fixture.root, "checkout.ts"), changed);
    vi.mocked(copyFile).mockClear();
    await inspectCurrentCodeAnalysis(fixture.root, fixture.run);
    expect(copiedInto(fixture.analysis)).toEqual(["checkout.ts"]);
    expect(await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8")).toBe(changed);
  } finally {
    await fixture.dispose();
  }
});
