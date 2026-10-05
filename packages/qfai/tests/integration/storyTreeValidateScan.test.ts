import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { readStoryTests, validateStoryTreeObligations } from "../../src/core/validators/storyTreeObligations.js";

describe("story-tree test scan", () => {
  it("fails closed when a configured test glob cannot be scanned", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-scan-"));
    try {
      const config = {
        ...defaultConfig,
        validation: {
          ...defaultConfig.validation,
          traceability: {
            ...defaultConfig.validation.traceability,
            testFileGlobs: [`tests/${String.fromCharCode(0)}/*.ts`],
          },
        },
      };
      const model = buildStoryTreeModel(new Map());
      const findings = await validateStoryTreeObligations(root, config, "atdd", model);

      expect(findings.map((finding) => finding.code)).toEqual(["QFAI-SCAN-002"]);
      expect(findings[0]?.severity).toBe("error");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  describe("configured test globs with boundary whitespace", () => {
    async function selectedFiles(
      testFileGlobs: string[],
      testFileExcludeGlobs: string[] = [],
    ): Promise<string[]> {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-glob-"));
      try {
        for (const file of ["tests/a.test.ts", "tests/ignored/b.test.ts", "tests/c.test.ts"]) {
          await mkdir(path.dirname(path.join(root, file)), { recursive: true });
          await writeFile(path.join(root, file), "export {};\n", "utf8");
        }
        const config = {
          ...defaultConfig,
          validation: {
            ...defaultConfig.validation,
            traceability: {
              ...defaultConfig.validation.traceability,
              testFileGlobs,
              testFileExcludeGlobs,
            },
          },
        };
        const { files } = await readStoryTests(root, config);
        return files
          .filter((file) => file.selectedForExample)
          .map((file) => path.relative(root, file.file).split(path.sep).join("/"))
          .sort();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }

    it("selects and excludes without padding, as the control", async () => {
      expect(await selectedFiles(["tests/**/*.test.ts", "!tests/ignored/**"])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
      ]);
    });

    it("reads a padded pattern and a padded exclusion like the unpadded ones", async () => {
      expect(await selectedFiles([" tests/**/*.test.ts ", " !tests/ignored/** "])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
      ]);
    });

    it("trims a padded testFileExcludeGlobs entry", async () => {
      expect(await selectedFiles(["tests/**/*.test.ts"], [" tests/ignored/** "])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
      ]);
    });

    it("selects nothing for a blank pattern and ignores a blank exclusion", async () => {
      expect(await selectedFiles(["   ", "!  "])).toEqual([]);
      expect(await selectedFiles(["tests/**/*.test.ts", " ! "], ["  "])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
        "tests/ignored/b.test.ts",
      ]);
    });

    it("keeps a leading extglob negation as a pattern, not an exclusion", async () => {
      expect(await selectedFiles(["!(ignored)/**/*.test.ts"])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
        "tests/ignored/b.test.ts",
      ]);
    });
  });
});
