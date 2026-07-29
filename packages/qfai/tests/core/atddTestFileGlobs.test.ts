import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { deriveAtddFilePattern } from "../../src/core/atddTraceability.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

describe("deriveAtddFilePattern", () => {
  it("falls back to the JS/TS set when nothing is configured", () => {
    expect(deriveAtddFilePattern([])).toBe(
      "**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}",
    );
  });

  it("lifts a single extension out of a configured glob", () => {
    expect(deriveAtddFilePattern(["tests/**/*.py"])).toBe("**/*.py");
  });

  it("lifts and merges a brace set", () => {
    expect(deriveAtddFilePattern(["tests/**/*.{py,pyi}"])).toBe("**/*.{py,pyi}");
  });

  it("merges extensions across several globs, deduped and sorted", () => {
    expect(
      deriveAtddFilePattern(["tests/**/*.go", "internal/**/*_test.go", "spec/**/*.feature"]),
    ).toBe("**/*.{feature,go}");
  });

  it("falls back when no glob carries a recoverable extension", () => {
    expect(deriveAtddFilePattern(["tests/**"])).toBe(
      "**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}",
    );
  });
});

describe("the ATDD scan honours testFileGlobs", () => {
  it("sees an annotated Python test that the hardcoded JS/TS glob missed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-globs-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
      await writeFile(
        path.join(specDir, "02_User-stories.md"),
        ["# 02 User stories", "", "## US-0001: title", "- Parent: CAP-0001", ""].join("\n"),
        "utf-8",
      );

      await mkdir(path.join(root, "tests", "e2e"), { recursive: true });
      await writeFile(
        path.join(root, "tests", "e2e", "test_journey.py"),
        "# QFAI:SPEC-0001:US-0001\ndef test_journey():\n    pass\n",
        "utf-8",
      );

      const pythonConfig = {
        ...defaultConfig,
        validation: {
          ...defaultConfig.validation,
          traceability: {
            ...defaultConfig.validation.traceability,
            testFileGlobs: ["tests/**/*.py"],
          },
        },
      };

      const issues = await validateAtddCodeTraceability(root, pythonConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-111")).toBe(false);

      // With the old hardcoded glob the same tree matched zero files.
      const jsOnly = await validateAtddCodeTraceability(root, defaultConfig);
      expect(jsOnly.some((entry) => entry.code === "QFAI-ATDD-111")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
