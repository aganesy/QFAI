import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const assetRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant",
);

async function asset(relative: string): Promise<string> {
  return (await readFile(path.join(assetRoot, relative), "utf-8")).replace(/\s*\n\s*/g, " ");
}

describe("Coverage Depth Matrix", () => {
  it("scores every flow obligation and its selected test", async () => {
    const checklist = await asset("skill/qfai-atdd/references/test-case-depth-checklist.md");
    expect(checklist).toContain(".qfai/evidence/coverage-depth-BF-NNNN.md");
    expect(checklist).toContain("one row per US, AC and EX");
    expect(checklist).toContain("BF-level E2E obligation");
    for (const cell of [
      "Normal",
      "Error",
      "Boundary",
      "Special",
      "State transition",
      "Combinatorial",
      "Oracle and test",
    ]) {
      expect(checklist).toContain(cell);
    }
  });

  it("keeps declared and observed failures in scope without adding unrelated cases", async () => {
    const checklist = await asset("skill/qfai-atdd/references/test-case-depth-checklist.md");
    expect(checklist).toContain("one declared by an active AC, EX, BR or contract");
    expect(checklist).toContain("one actually observed");
    expect(checklist).toContain(
      "A retired or superseded statement alone is not an active obligation",
    );
    expect(checklist).toContain("Do not demand an unrelated failure case from every row");
    expect(checklist).toContain("If the declarations contradict, record drift");
  });

  it("does not score a planned or missing assertion as coverage", async () => {
    const checklist = await asset("skill/qfai-atdd/references/test-case-depth-checklist.md");
    expect(checklist).toContain("A row with only a normal-path assertion is");
    expect(checklist).toContain("neither an annotation nor a planned assertion is a check");
    expect(checklist).toContain("A missing assertion stays");
    expect(checklist).toContain("until the selected test executes");
  });

  it("keeps EX gaps visible for implementation handoff", async () => {
    const checklist = await asset("skill/qfai-atdd/references/test-case-depth-checklist.md");
    const atdd = await asset("skill/qfai-atdd/SKILL.md");
    expect(checklist).toContain("EX rows remain in this flow's matrix");
    expect(checklist).toContain("ATDD names the gap and hands it over");
    expect(atdd).toContain("coverage-depth-BF-NNNN.md");
    expect(atdd).toContain("## Coverage Depth Matrix");
    expect(atdd).toContain("✅ N / ⚠️ N / ❌ N");
    expect(checklist).toContain("The reported totals must match those cells");
  });
});
