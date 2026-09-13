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
import { validateProject } from "../../src/core/validate.js";
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

  // An invalid pattern is valid YAML, so it reaches the scanner and throws.
  // Treating that as "no finding" let `--fail-on error` pass over a gate that
  // could not run at all; `doctor.ts` already reports the same class as error.
  it.each([["\0"], ["tests/\0/*.test.ts"]])(
    "reports a glob scan that throws instead of passing silently (%j)",
    async (glob) => {
      await withTempRoot(async (root) => {
        await seedV1421Spec(root);

        const issues = await validateTraceability(root, configWith({ globs: [glob] }), {
          includeCodeReferences: true,
        });

        const finding = issues.find((entry) => entry.code === "QFAI-TRACE-124");
        expect(finding?.severity).toBe("error");
        expect(finding?.rule).toBe("traceability.layered.testFileGlobsScanFailed");
        // The pattern reaches the output escaped, never as the raw byte.
        const nul = String.fromCharCode(0);
        expect(finding?.message).not.toContain(nul);
        expect(finding?.refs?.join()).not.toContain(nul);
        expect(finding?.refs).toEqual([JSON.stringify(glob)]);
      });
    },
  );

  // Every validator that scans these globs has to turn the refusal into a
  // finding. One that let it through ended the run with no report at all.
  it.each(["tdd", "full"] as const)(
    "finishes a %s run over a glob the matcher refuses, and reports it",
    async (profile) => {
      await withTempRoot(async (root) => {
        await seedV1421Spec(root);
        const glob = JSON.stringify(`tests/${String.fromCharCode(0)}/*.test.ts`);
        await writeFile(
          path.join(root, "qfai.config.yaml"),
          `validation:\n  traceability:\n    scMustHaveTest: true\n    testFileGlobs: [${glob}]\n`,
          "utf-8",
        );

        const result = await validateProject(root, undefined, { profile });

        const codes = result.issues.map((entry) => entry.code);
        expect(codes).toContain("QFAI-TRACE-124");
        expect(codes).toContain("QFAI-TEST-002");
      });
    },
  );

  // `normalizeGlobs` drops blank entries, so a whitespace-only list scans with
  // nothing — the gate is unset, not misconfigured. Deciding emptiness on the
  // raw array reported this as "0 files matched", which sends the reader off to
  // fix globs that were never in play.
  it("treats a whitespace-only glob list as unset, not as a zero match", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);

      const issues = await validateTraceability(root, configWith({ globs: ["  ", "\t"] }), {
        includeCodeReferences: true,
      });

      const finding = issues.find((entry) => entry.code === "QFAI-TRACE-124");
      expect(finding?.severity).toBe("warning");
      expect(finding?.rule).toBe("traceability.layered.testFileGlobsUnset");
    });
  });

  // QFAI-TRACE-117 reports every SC as unreferenced when the globs match
  // nothing, so its findings are a consequence of QFAI-TRACE-124, not
  // independent ones. Emitting the cause first is what makes the report
  // actionable rather than a wall of downstream noise.
  it("reports the configuration cause before the SC findings it explains", async () => {
    await withTempRoot(async (root) => {
      await seedV1421Spec(root);

      const issues = await validateTraceability(
        root,
        configWith({ globs: ["tests/**/*.test.ts"] }),
        { includeCodeReferences: true },
      );

      const causeIndex = issues.findIndex((entry) => entry.code === "QFAI-TRACE-124");
      expect(causeIndex).toBeGreaterThanOrEqual(0);

      const firstConsequence = issues.findIndex((entry) => entry.code === "QFAI-TRACE-117");
      if (firstConsequence >= 0) {
        expect(causeIndex).toBeLessThan(firstConsequence);
      }
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
