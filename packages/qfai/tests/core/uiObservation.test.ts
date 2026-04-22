import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

describe("runtime observation smoke", () => {
  it("runtime observation helper retains render evidence references", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "evidence", "runtimeObservation.ts"),
      "utf-8",
    );
    expect(src).toContain("renderEvidenceRefs");
  });
});
