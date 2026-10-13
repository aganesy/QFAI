import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { formatTimingOverruns } from "../../src/cli/commands/validate.js";
import { orderUiuxParts, validateProject } from "../../src/core/validate.js";

describe("the timings line of a UI/UX group over its budget", () => {
  // QFAI:AC-0001-0039-02
  // QFAI:EX-0001-0039-18
  it("names the two slowest validators of the group and says the budget is not a gate", () => {
    expect(
      formatTimingOverruns({
        uiuxMs: 10120.4,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
        uiuxParts: [
          { name: "UI definition consistency", ms: 8300.2 },
          { name: "design audit", ms: 1100.7 },
          { name: "html mock", ms: 3 },
        ],
      }),
    ).toBe(
      "timings: over budget uiux=10120ms (budget 2000ms; slowest, overlapping: UI definition consistency 8300ms, design audit 1101ms); a target, not a gate: no finding is raised",
    );
  });

  // QFAI:AC-0001-0039-02
  // QFAI:EX-0001-0039-18
  it("prints no line for a group within its budget, whatever its parts took", () => {
    expect(
      formatTimingOverruns({
        uiuxMs: 10,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
        uiuxParts: [{ name: "design audit", ms: 9 }],
      }),
    ).toBeNull();
  });

  // QFAI:AC-0001-0039-02
  // QFAI:EX-0001-0039-18
  it("names no validator when the result carries no parts", () => {
    expect(
      formatTimingOverruns({
        uiuxMs: 2500,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
        uiuxParts: [],
      }),
    ).toBe(
      "timings: over budget uiux=2500ms (budget 2000ms); a target, not a gate: no finding is raised",
    );
  });

  // QFAI:AC-0001-0039-02
  // QFAI:EX-0001-0039-18
  it("orders the parts slowest first and leaves the parser load out of the html mock part", () => {
    expect(
      orderUiuxParts(
        [
          { name: "design audit", ms: 40 },
          { name: "html mock", ms: 1000 },
          { name: "agent definition", ms: 300 },
        ],
        900,
      ),
    ).toEqual([
      { name: "agent definition", ms: 300 },
      { name: "design audit", ms: 40 },
      { name: "html mock", ms: 100 },
    ]);
  });

  // QFAI:AC-0001-0039-02
  // QFAI:EX-0001-0039-18
  it("reports every validator of the group, slowest first, in the validation result", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-parts-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  specsDir: .qfai/spec\n",
        "utf-8",
      );
      const result = await validateProject(root, undefined, { profile: "prototyping" });
      const parts = (result.timings?.uiuxParts ?? []).map((part) => part.ms);
      expect(parts).toHaveLength(8);
      expect(parts).toEqual([...parts].sort((left, right) => right - left));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
