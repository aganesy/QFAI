import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

describe("recommendation artifact deprecation", () => {
  it("report markdown no longer emits recommendationArtifact sections", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "report.ts"),
      "utf-8",
    );
    expect(src).not.toContain("prototyping.recommendationArtifact");
  });
});
