import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("qa-gatekeeper evidence in the shipped implementation skill", () => {
  it("assigns RED and GREEN observation to the qa-gatekeeper", async () => {
    const skill = await readFile(
      path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/step/implement-tdd/STEP.md"),
      "utf-8",
    );
    expect(skill).toContain("The qa-gatekeeper checks the observed RED and GREEN evidence");
  });
});
