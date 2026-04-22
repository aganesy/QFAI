import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

describe("spec coverage smoke", () => {
  it("current evidence/specCoverage helper keeps concrete artifact ref enforcement", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "evidence", "specCoverage.ts"),
      "utf-8",
    );
    expect(src).toContain("assertConcreteArtifactRef");
  });
});
