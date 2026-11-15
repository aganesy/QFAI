import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatFamilyTimings,
  formatTimingOverruns,
  runValidate,
} from "../../src/cli/commands/validate.js";
import { labelCheckTimings, orderUiuxParts, validateProject } from "../../src/core/validate.js";
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
        uiuxPartsRun: "side-by-side",
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
  it("says the slowest validators ran one after another when --timings ran them so", () => {
    expect(
      formatTimingOverruns({
        uiuxMs: 10120.4,
        uiuxBudgetMs: 2000,
        htmlMockMs: 4,
        htmlMockBudgetMs: 2000,
        uiuxPartsRun: "one-after-another",
        uiuxParts: [
          { name: "UI definition consistency", ms: 8300.2 },
          { name: "design audit", ms: 1100.7 },
        ],
      }),
    ).toBe(
      "timings: over budget uiux=10120ms (budget 2000ms; slowest, one after another: UI definition consistency 8300ms, design audit 1101ms); a target, not a gate: no finding is raised",
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
        uiuxPartsRun: "side-by-side",
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
        uiuxPartsRun: "side-by-side",
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
      expect(parts).toHaveLength(6);
      expect(parts).toEqual([...parts].sort((left, right) => right - left));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the --timings line of each finding family", () => {
  // QFAI:EX-0001-0039-23
  it("lists the families slowest first, then the UI/UX checks and the parser load apart", () => {
    expect(
      formatFamilyTimings({
        sequential: labelCheckTimings(
          new Map([
            ["story-structure", { ms: 4021.4, families: new Set(["STORY"]) }],
            ["document-schema", { ms: 8071.2, families: new Set<string>() }],
            ["test-stubs", { ms: 2235, families: new Set(["TEST"]) }],
          ]),
        ),
        uiux: labelCheckTimings(
          new Map([
            ["design tokens", { ms: 5, families: new Set<string>() }],
            ["html mock", { ms: 876.3, families: new Set(["MOCK"]) }],
          ]),
        ),
        htmlMockLoadMs: 912.4,
        sharedMarkdownReadMs: 30.2,
      }),
    ).toBe(
      "timings: by family document-schema 8071ms, STORY 4021ms, TEST 2235ms; uiux one after another: MOCK 876ms, design tokens 5ms; of which shared Markdown read 30ms, html mock parser load 912ms",
    );
  });

  // QFAI:EX-0001-0039-23
  it("names a check by the code families it returned, and sums the checks that share one", () => {
    expect(
      labelCheckTimings(
        new Map([
          ["story-structure", { ms: 3, families: new Set(["STORY", "SPACK"]) }],
          ["stale-terms", { ms: 2, families: new Set(["STORY"]) }],
          ["story-test-obligations", { ms: 4, families: new Set(["STORY"]) }],
          ["contracts", { ms: 1, families: new Set<string>() }],
        ]),
      ),
    ).toEqual([
      { family: "STORY", ms: 6 },
      { family: "SPACK/STORY", ms: 3 },
      { family: "contracts", ms: 1 },
    ]);
  });

  // QFAI:EX-0001-0039-23
  it("prints no UI/UX part or parser load when neither ran, and no line when not asked", () => {
    expect(
      formatFamilyTimings({
        sequential: [
          { family: "CONTRACT", ms: 3 },
          { family: "LINK", ms: 3 },
        ],
        uiux: [],
        htmlMockLoadMs: 0,
        sharedMarkdownReadMs: 0,
      }),
    ).toBe("timings: by family CONTRACT 3ms, LINK 3ms");
    expect(formatFamilyTimings(undefined)).toBeNull();
  });

  // QFAI:EX-0001-0039-23
  it("takes each label from the findings a check returned, and adds the times only when asked", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-families-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      await mkdir(path.join(root, "tokens"), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "uiux:\n  designTokensDir: tokens\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, "tokens", "design-tokens.yaml"),
        "primitive:\n  color: [unclosed\n",
        "utf-8",
      );
      const asked = await validateProject(root, undefined, {
        profile: "prototyping",
        familyTimings: true,
      });
      const sequential = (asked.familyTimings?.sequential ?? []).map((entry) => entry.family);
      const uiux = (asked.familyTimings?.uiux ?? []).map((entry) => entry.family);
      expect(sequential).toContain("uiux");
      expect(sequential).toContain("integration-surface");
      expect(uiux).toHaveLength(6);
      expect(uiux).toContain("DT");
      expect(uiux).toContain("html mock");
      const ms = (asked.familyTimings?.sequential ?? []).map((entry) => entry.ms);
      expect(ms).toEqual([...ms].sort((left, right) => right - left));

      const unasked = await validateProject(root, undefined, { profile: "prototyping" });
      expect(unasked.familyTimings).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0001-0039-23
  it("runs the UI/UX checks one after another under --timings, with the same findings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-one-after-another-"));
    try {
      await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
      await mkdir(path.join(root, "tokens"), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "uiux:\n  designTokensDir: tokens\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, "tokens", "design-tokens.yaml"),
        "primitive:\n  color: [unclosed\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "spec", "mock.md"),
        "# mock\n\n```html\n<div>box</div>\n```\n",
        "utf-8",
      );
      const asked = await validateProject(root, undefined, {
        profile: "prototyping",
        familyTimings: true,
      });
      expect(asked.timings?.uiuxPartsRun).toBe("one-after-another");
      // One after another, the parts and the parser load add up to no more than the group's wall
      // clock. Side by side they did not: each part's clock also ran while the others worked.
      const group = asked.familyTimings?.sequential.find((entry) => entry.family === "uiux");
      const parts = (asked.timings?.uiuxParts ?? []).reduce((sum, part) => sum + part.ms, 0);
      expect(asked.timings?.uiuxParts).toHaveLength(6);
      expect(group).toBeDefined();
      const load = asked.familyTimings?.htmlMockLoadMs ?? -1;
      const read = asked.familyTimings?.sharedMarkdownReadMs ?? -1;
      expect(load).toBeGreaterThanOrEqual(0);
      expect(read).toBeGreaterThanOrEqual(0);
      expect(parts + load + read).toBeLessThanOrEqual(group?.ms ?? 0);

      const plain = await validateProject(root, undefined, { profile: "prototyping" });
      expect(plain.timings?.uiuxPartsRun).toBe("side-by-side");
      expect(plain.counts).toEqual(asked.counts);
      expect(plain.issues).toEqual(asked.issues);
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

  // QFAI:EX-0001-0039-23
  it("prints no line for a run the old-layout check stops", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-timings-old-layout-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      const result = await validateProject(root, undefined, { familyTimings: true });
      expect(result.issues.map((entry) => entry.code)).toContain("QFAI-LAYOUT-001");
      expect(result.familyTimings).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
