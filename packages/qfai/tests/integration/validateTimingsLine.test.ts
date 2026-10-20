import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatFamilyTimings,
  formatTimingOverruns,
  runValidate,
} from "../../src/cli/commands/validate.js";
import { orderFamilyTimings, orderUiuxParts, validateProject } from "../../src/core/validate.js";
import { captureStdout } from "../helpers/stdout.js";

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
      { name: "html mock", ms: 100 },
      { name: "design audit", ms: 40 },
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

describe("the --timings line of each finding family", () => {
  // QFAI:EX-0001-0039-23
  it("lists the families slowest first, then the side-by-side group apart", () => {
    expect(
      formatFamilyTimings({
        sequential: orderFamilyTimings(
          new Map([
            ["STORY", 4021.4],
            ["DOCSCHEMA", 8071.2],
            ["TEST", 2235],
          ]),
        ),
        overlapping: orderFamilyTimings(
          new Map([
            ["DT", 5],
            ["MOCK", 876.3],
          ]),
        ),
      }),
    ).toBe(
      "timings: by family DOCSCHEMA 8071ms, STORY 4021ms, TEST 2235ms; side by side, overlapping: MOCK 876ms, DT 5ms",
    );
  });

  // QFAI:EX-0001-0039-23
  it("prints no side-by-side part when no group ran side by side, and no line when not asked", () => {
    expect(
      formatFamilyTimings({
        sequential: orderFamilyTimings(
          new Map([
            ["LINK", 3],
            ["CONTRACT", 3],
          ]),
        ),
        overlapping: [],
      }),
    ).toBe("timings: by family CONTRACT 3ms, LINK 3ms");
    expect(formatFamilyTimings(undefined)).toBeNull();
  });

  // QFAI:EX-0001-0039-23
  it("adds the family times to the result only when asked", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-families-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      const asked = await validateProject(root, undefined, {
        profile: "prototyping",
        familyTimings: true,
      });
      const sequential = asked.familyTimings?.sequential ?? [];
      const overlapping = asked.familyTimings?.overlapping ?? [];
      expect(sequential.map((entry) => entry.family)).toContain("LINK");
      expect(sequential.map((entry) => entry.ms)).toEqual(
        sequential.map((entry) => entry.ms).sort((left, right) => right - left),
      );
      expect(overlapping.map((entry) => entry.family).sort()).toEqual([
        "AGENT",
        "AUD",
        "CLASSIFICATION/DIRECTION/OQ/SCREEN/SIDECAR/THREELAYER/TREND",
        "CONSISTENCY",
        "DT",
        "FLOW",
        "MOCK",
        "RESEARCH",
      ]);

      const unasked = await validateProject(root, undefined, { profile: "prototyping" });
      expect(unasked.familyTimings).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0001-0039-23
  it("prints the line after fail-on under --timings, and leaves the default output without it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-text-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      const timed = await captureStdout(async () => {
        await runValidate({ root, strict: false, format: "text", failOn: "never", timings: true });
      });
      const lines = timed.trimEnd().split("\n");
      const at = lines.findIndex((line) => line.startsWith("timings: by family "));
      expect(at).toBeGreaterThan(lines.indexOf("fail-on: never"));
      expect(lines[at + 1]).toMatch(/^qfai validate: passed /);

      const plain = await captureStdout(async () => {
        await runValidate({ root, strict: false, format: "text", failOn: "never" });
      });
      expect(plain).not.toContain("timings: by family");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
