/**
 * Doc convergence tests — spec-0037 TDD-0011, TDD-0021
 *
 * QFAI:SPEC-0037:TC-0037-0011
 * QFAI:SPEC-0037:TC-0037-0021
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateConvergenceDoc } from "../../../src/core/validators/docs/convergenceDoc.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-conv-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("doc convergence", () => {
  it("master doc exists", async () => {
    const steeringDir = await newTempDir();
    const content = [
      "# Convergence Document",
      "",
      "## Canonical Model",
      "",
      "The canonical model defines the 3-layer evaluation architecture.",
      "",
      "## Subsystem Maturity",
      "",
      "| Subsystem | Status |",
      "| --------- | ------ |",
      "| Browser QA | foundation-only |",
      "",
      "## Cross-Reference",
      "",
      "- Product: steering/product.md",
      "- Manifest: steering/manifest.md",
    ].join("\n");
    await writeFile(path.join(steeringDir, "convergence.md"), content, "utf-8");

    const result = await validateConvergenceDoc(steeringDir);

    expect(result.exists).toBe(true);
    expect(result.missingSections).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it("required structure sections", async () => {
    const steeringDir = await newTempDir();
    // Missing "cross-reference" section
    const content = [
      "# Convergence Document",
      "",
      "## Canonical Model",
      "",
      "Model definition here.",
      "",
      "## Subsystem Maturity",
      "",
      "Matrix here.",
    ].join("\n");
    await writeFile(path.join(steeringDir, "convergence.md"), content, "utf-8");

    const result = await validateConvergenceDoc(steeringDir);

    expect(result.exists).toBe(true);
    expect(result.missingSections).toContain("cross-reference");
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
