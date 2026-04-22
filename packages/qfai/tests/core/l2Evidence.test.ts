import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

describe("screen contract evidence smoke", () => {
  it("screen contracts keep canonical sourceRef fields", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "contracts", "screenContracts.ts"),
      "utf-8",
    );
    expect(src).toContain("sourceRef");
  });
});
