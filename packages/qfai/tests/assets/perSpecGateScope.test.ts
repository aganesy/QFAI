import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

describe("flow-scoped acceptance gates", () => {
  it("acceptance tests validate the selected BF", async () => {
    const content = await readFile(
      path.join(assistant, "step/implement-acceptance/STEP.md"),
      "utf8",
    );
    expect(content).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
    expect(content).toMatch(/no\s+error owned by this flow/);
  });
});
