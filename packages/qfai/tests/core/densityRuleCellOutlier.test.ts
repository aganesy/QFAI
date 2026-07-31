import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDensityHints } from "../../src/core/validators/densityHints.js";

const HEADER = [
  "| BR-ID   | Title | AC-Refs | Rule | Notes | NFR-Refs |",
  "| ------- | ----- | ------- | ---- | ----- | -------- |",
];

const rule = (length: number): string => "a".repeat(length);

async function withSpec(
  businessRules: string,
  assertion: (issues: Awaited<ReturnType<typeof validateDensityHints>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-density-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
    await writeFile(path.join(specDir, "04_Business-Rules.md"), businessRules, "utf-8");
    assertion(await validateDensityHints(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-DENSITY-005 rule-cell outlier", () => {
  it("flags a Rule cell that dwarfs its siblings", async () => {
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        ...HEADER,
        `| BR-0001 | a | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0002 | b | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0003 | c | AC-0001 | ${rule(3000)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "QFAI-DENSITY-005");
        expect(finding?.severity).toBe("warning");
        expect(finding?.refs).toEqual(["BR-0003"]);
      },
    );
  });

  it("stays quiet when every rule is long, so no house style is imposed", async () => {
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        ...HEADER,
        `| BR-0001 | a | AC-0001 | ${rule(1500)} | - | - |`,
        `| BR-0002 | b | AC-0001 | ${rule(1600)} | - | - |`,
        `| BR-0003 | c | AC-0001 | ${rule(1400)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        expect(issues.some((entry) => entry.code === "QFAI-DENSITY-005")).toBe(false);
      },
    );
  });

  it("does not fire on short rules even at a high ratio", async () => {
    // 10 vs 300 is 30x the mean, but 300 characters is not an oversized rule.
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        ...HEADER,
        `| BR-0001 | a | AC-0001 | ${rule(10)} | - | - |`,
        `| BR-0002 | b | AC-0001 | ${rule(10)} | - | - |`,
        `| BR-0003 | c | AC-0001 | ${rule(300)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        expect(issues.some((entry) => entry.code === "QFAI-DENSITY-005")).toBe(false);
      },
    );
  });

  it("needs at least three rows before a sibling mean is meaningful", async () => {
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        ...HEADER,
        `| BR-0001 | a | AC-0001 | ${rule(10)} | - | - |`,
        `| BR-0002 | b | AC-0001 | ${rule(5000)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        expect(issues.some((entry) => entry.code === "QFAI-DENSITY-005")).toBe(false);
      },
    );
  });

  // Headers are hand-authored. A strict `indexOf("BR-ID")` skipped a table a
  // human reads as correct, and a skipped table is a check that silently never
  // runs on that file.
  it("accepts backticked, cased and padded header spellings", async () => {
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        "| `BR-ID` |  Title | AC-Refs |  `rule`  | Notes | NFR-Refs |",
        "| ------- | ----- | ------- | ---- | ----- | -------- |",
        `| BR-0001 | a | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0002 | b | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0003 | c | AC-0001 | ${rule(3000)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "QFAI-DENSITY-005");
        expect(finding?.refs).toEqual(["BR-0003"]);
      },
    );
  });

  // The same BR can be written into more than one table in a file. Reporting it
  // once keeps `refs` stable for anything keying on it downstream.
  it("reports a BR-ID once even when it is an outlier in two tables", async () => {
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        ...HEADER,
        `| BR-0002 | b | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0003 | c | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0001 | a | AC-0001 | ${rule(3000)} | - | - |`,
        "",
        "## Restated",
        "",
        ...HEADER,
        `| BR-0004 | d | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0005 | e | AC-0001 | ${rule(50)} | - | - |`,
        `| BR-0001 | a | AC-0001 | ${rule(3000)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "QFAI-DENSITY-005");
        expect(finding?.refs).toEqual(["BR-0001"]);
        expect(finding?.message.match(/BR-0001/g)).toHaveLength(1);
      },
    );
  });

  it("ignores a table without BR-ID and Rule columns", async () => {
    await withSpec(
      [
        "# 04 Business Rules",
        "",
        "| A | B |",
        "| --- | --- |",
        `| 1 | ${rule(5000)} |`,
        "",
        ...HEADER,
        `| BR-0001 | a | AC-0001 | ${rule(50)} | - | - |`,
        "",
      ].join("\n"),
      (issues) => {
        expect(issues.some((entry) => entry.code === "QFAI-DENSITY-005")).toBe(false);
      },
    );
  });
});
