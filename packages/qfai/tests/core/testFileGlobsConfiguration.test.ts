/**
 * QFAI-TRACE-124 — `validation.traceability.testFileGlobs` configuration diagnosis.
 *
 * The check must be layout-independent. `validateTraceability` narrows to v1416
 * spec entries and only reaches the SC code-reference helper when that layout
 * declares SCs, so a diagnosis living inside that helper never fired for the
 * v1417 / v1421 layouts every current project uses — exactly the projects where
 * `scMustHaveTest: true` plus a glob list matching nothing yields a clean
 * `--fail-on error` run.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateTraceability } from "../../src/core/validators/traceability.js";

function configWith(overrides: { globs?: string[]; scMustHaveTest?: boolean }): QfaiConfig {
  return {
    ...defaultConfig,
    validation: {
      ...defaultConfig.validation,
      traceability: {
        ...defaultConfig.validation.traceability,
        scMustHaveTest: overrides.scMustHaveTest ?? true,
        testFileGlobs: overrides.globs ?? [],
      },
    },
  };
}

/** Minimal v1421 spec pack — the layout current projects actually use. */
async function seedV1421Spec(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
  await writeFile(path.join(specDir, "05_Examples.md"), "# 05 Examples\n", "utf-8");
}

async function withTempRoot<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-globs-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("testFileGlobs configuration diagnosis (QFAI-TRACE-124)", () => {
  it("reports zero-match globs on a v1421 spec pack", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);

      const issues = await validateTraceability(
        root,
        configWith({ globs: ["tests/**/*.test.ts"] }),
        { includeCodeReferences: true },
      );

      const finding = issues.find((entry) => entry.code === "QFAI-TRACE-124");
      expect(finding?.severity).toBe("error");
      expect(finding?.rule).toBe("traceability.layered.testFileGlobsNoMatch");
      expect(finding?.refs).toEqual(["tests/**/*.test.ts"]);
    });
  });

  it("reports unset globs as a warning on a v1421 spec pack", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);

      const issues = await validateTraceability(root, configWith({ globs: [] }), {
        includeCodeReferences: true,
      });

      const finding = issues.find((entry) => entry.code === "QFAI-TRACE-124");
      expect(finding?.severity).toBe("warning");
      expect(finding?.rule).toBe("traceability.layered.testFileGlobsUnset");
    });
  });

  it("stays silent when the globs match at least one file", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);
      await mkdir(path.join(root, "tests"), { recursive: true });
      await writeFile(path.join(root, "tests", "sample.test.ts"), "// no refs\n", "utf-8");

      const issues = await validateTraceability(
        root,
        configWith({ globs: ["tests/**/*.test.ts"] }),
        { includeCodeReferences: true },
      );

      expect(issues.some((entry) => entry.code === "QFAI-TRACE-124")).toBe(false);
    });
  });

  it("stays silent when scMustHaveTest is off — the gate is deliberately disabled", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);

      const issues = await validateTraceability(
        root,
        configWith({ globs: ["tests/**/*.test.ts"], scMustHaveTest: false }),
        { includeCodeReferences: true },
      );

      expect(issues.some((entry) => entry.code === "QFAI-TRACE-124")).toBe(false);
    });
  });

  it("stays silent on a project with no spec pack", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });

      const issues = await validateTraceability(
        root,
        configWith({ globs: ["tests/**/*.test.ts"] }),
        { includeCodeReferences: true },
      );

      expect(issues.some((entry) => entry.code === "QFAI-TRACE-124")).toBe(false);
    });
  });

  it("does not run when code references are out of scope", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);

      const issues = await validateTraceability(
        root,
        configWith({ globs: ["tests/**/*.test.ts"] }),
        { includeCodeReferences: false },
      );

      expect(issues.some((entry) => entry.code === "QFAI-TRACE-124")).toBe(false);
    });
  });
});
