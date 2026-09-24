import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillPath = path.join(packageRoot, "assets/init/.qfai/assistant/skill/qfai-atdd/SKILL.md");

describe("ATDD skill acceptance obligations", () => {
  it("assigns BF and AC tests to their required layers and leaves EX to implement", async () => {
    const content = await readFile(skillPath, "utf8");
    expect(content).toMatch(/Business flow\s*\|\s*E2E\s*\|\s*`QFAI:BF-NNNN`/);
    expect(content).toMatch(
      /Acceptance criterion\s*\|\s*Integration or API\s*\|\s*`QFAI:AC-NNNN-NNNN-NN`/,
    );
    expect(content).toMatch(/Example\s*\|\s*Every other test layer\s*\|\s*`QFAI:EX-NNNN-NNNN-NN`/);
    expect(content).toContain("An E2E test carries its flow annotation");
    expect(content).toContain("An integration or API test carries its AC annotation");
  });

  it("uses flow-scoped validation and flow evidence", async () => {
    const content = await readFile(skillPath, "utf8");
    expect(content).toContain("qfai validate --profile atdd --flow BF-NNNN --fail-on error");
    expect(content).toContain(".qfai/evidence/atdd-BF-NNNN.md");
    expect(content).toContain(".qfai/evidence/coverage-depth-BF-NNNN.md");
    expect(content).toMatch(/US, AC and\s+EX rows/);
  });

  it("requires observed behavior and independent review", async () => {
    const content = await readFile(skillPath, "utf8");
    expect(content).toMatch(/A load error or broken fixture is not a\s+RED proof/);
    expect(content).toContain("An author cannot certify their own tests");
    expect(content).toContain("completion reviewer checks flow coverage");
  });
});
