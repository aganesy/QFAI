import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

describe("ui fidelity smoke", () => {
  it("report and evidence validator still reference uiFidelity", async () => {
    const reportSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "report.ts"),
      "utf-8",
    );
    const validatorSrc = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(reportSrc).toContain("uiFidelity");
    expect(validatorSrc).toContain("uiFidelity");
  });
});
