import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

describe("prototyping recommendation smoke", () => {
  it("current validator stack relies on prototyping evidence rather than a separate recommendation module", async () => {
    const src = await readFile(
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
    expect(src).toContain("prototyping.json");
    expect(src).toContain("mode");
  });
});
