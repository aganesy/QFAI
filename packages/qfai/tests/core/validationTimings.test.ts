import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { formatTimingOverruns, runValidate } from "../../src/cli/commands/validate.js";
import { validateProject } from "../../src/core/validate.js";

const MOCK_DOC = [
  "# discussion",
  "",
  "```html",
  '<div style="width: 48px; height: 48px">box</div>',
  "```",
  "",
].join("\n");

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-"));
  try {
    await mkdir(path.join(root, ".qfai", "discussion"), { recursive: true });
    await mkdir(path.join(root, ".qfai", "specs", "_policies"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "discussion", "pack.md"), MOCK_DOC, "utf-8");
    // A budget small enough that any real run overshoots it, so the
    // over-budget branch is exercised without depending on machine speed.
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["uiux:", "  htmlMockTimeout: 0.000001", ""].join("\n"),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("validation timings", () => {
  it("reports an exceeded UI/UX budget as timings instead of a finding", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root, undefined, { profile: "prototyping" });

      const codes = result.issues.map((issue) => issue.code);
      expect(codes).not.toContain("QFAI-MOCK-099");
      expect(codes).not.toContain("QFAI-UIUX-PERF");

      const timings = result.timings;
      expect(timings).toBeDefined();
      if (!timings) {
        return;
      }
      expect(timings.htmlMockBudgetMs).toBe(0.000001);
      expect(timings.uiuxBudgetMs).toBe(2000);
      expect(timings.htmlMockMs).toBeGreaterThan(timings.htmlMockBudgetMs);
      expect(timings.uiuxMs).toBeGreaterThanOrEqual(timings.htmlMockMs);
    });
  });

  it("leaves the severity counts free of timing findings", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root, undefined, { profile: "prototyping" });
      const timingIssues = result.issues.filter(
        (issue) =>
          issue.rule === "uiux.performanceBudget" || issue.rule === "htmlMock.performanceBudget",
      );

      expect(timingIssues).toEqual([]);
    });
  });
});

describe("formatTimingOverruns", () => {
  it("returns null when nothing is defined or nothing exceeds its budget", () => {
    expect(formatTimingOverruns(undefined)).toBeNull();
    expect(
      formatTimingOverruns({
        uiuxMs: 10,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
      }),
    ).toBeNull();
  });

  it("names only the group that overshot", () => {
    expect(
      formatTimingOverruns({
        uiuxMs: 2500.4,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
      }),
    ).toBe("timings: over budget uiux=2500ms (budget 2000ms)");
    expect(
      formatTimingOverruns({
        uiuxMs: 2500.4,
        uiuxBudgetMs: 2000,
        htmlMockMs: 2100.6,
        htmlMockBudgetMs: 2000,
      }),
    ).toBe("timings: over budget uiux=2500ms (budget 2000ms) htmlMock=2101ms (budget 2000ms)");
  });

  it("keeps the reported measurement above the budget it overshot", () => {
    // Rounding to whole milliseconds printed `uiux=2000ms (budget 2000ms)` —
    // a line that denies the over-budget branch that produced it.
    expect(
      formatTimingOverruns({
        uiuxMs: 2000.1,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
      }),
    ).toBe("timings: over budget uiux=2000.1ms (budget 2000ms)");
    expect(
      formatTimingOverruns({
        uiuxMs: 10,
        uiuxBudgetMs: 2000,
        htmlMockMs: 0.05,
        htmlMockBudgetMs: 0.000001,
      }),
    ).toBe("timings: over budget htmlMock=0.1ms (budget 0.000001ms)");
  });
});

describe("runValidate --format github", () => {
  it("surfaces an exceeded budget in the GitHub output too", async () => {
    await withProject(async (root) => {
      const chunks: string[] = [];
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation((chunk: string | Uint8Array) => {
          chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
          return true;
        });
      try {
        await runValidate({ root, strict: false, profile: "prototyping", format: "github" });
      } finally {
        writeSpy.mockRestore();
      }

      // The CI validate gate runs `--format github`; without this line the
      // overrun only lives in validate.json#timings.
      expect(chunks.join("")).toMatch(/::notice::timings: over budget htmlMock=/);
    });
  });
});
