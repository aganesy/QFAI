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

  it("always keeps the structural annotation carriers", () => {
    // This repository carries its own US annotations in
    // tests/e2e/qfai-traceability.md; testFileGlobs lists only .ts.
    const pattern = deriveAtddFilePattern(["packages/*/tests/**/*.test.ts"]);
    for (const ext of ["feature", "md", "markdown", "ts"]) {
      expect(pattern).toContain(ext);
    }
  });

  it("lifts a single extension out of a configured glob", () => {
    expect(deriveAtddFilePattern(["tests/**/*.py"])).toBe("**/*.{feature,markdown,md,py}");
  });

  it("lifts and merges a brace set", () => {
    expect(deriveAtddFilePattern(["tests/**/*.{py,pyi}"])).toBe(
      "**/*.{feature,markdown,md,py,pyi}",
    );
  });

  it("merges extensions across several globs, deduped and sorted", () => {
    expect(
      deriveAtddFilePattern(["tests/**/*.go", "internal/**/*_test.go", "spec/**/*.feature"]),
    ).toBe("**/*.{feature,go,markdown,md}");
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

/**
 * `paths.testsDir` is one value, so on a workspace it names at most one package's tests.
 *
 * `testFileGlobs` already names them all, and the scan lifts the directory half out of those globs
 * the way `deriveAtddFilePattern` lifts the extensions. Without it a workspace whose suite lives
 * under `packages/<name>/tests/` had every annotation in it read by nothing: the obligations were
 * reported covered by whatever prose carrier enumerated them, and no gate could see the difference.
 */
describe("the ATDD scan reads every test directory testFileGlobs names", () => {
  /** A tree whose only annotated test is under `packages/<pkg>/tests/e2e/`. */
  async function seedWorkspace(pkgPath: string): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-bases-"));
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      ["# 02 User stories", "", "## US-0001: title", "- Parent: CAP-0001", ""].join("\n"),
      "utf-8",
    );
    const testDir = path.join(root, ...pkgPath.split("/"), "tests", "e2e");
    await mkdir(testDir, { recursive: true });
    await writeFile(
      path.join(testDir, "journey.test.ts"),
      "// QFAI:SPEC-0001:US-0001\nit('walks the journey', () => {});\n",
      "utf-8",
    );
    return root;
  }

  function withGlobs(globs: string[]) {
    return {
      ...defaultConfig,
      validation: {
        ...defaultConfig.validation,
        traceability: { ...defaultConfig.validation.traceability, testFileGlobs: globs },
      },
    };
  }

  const uncovered = (issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>): boolean =>
    issues.some((entry) => entry.code === "QFAI-ATDD-111");

  it("counts a story annotated under a package's own tests directory", async () => {
    const root = await seedWorkspace("packages/pkg-a");
    try {
      const issues = await validateAtddCodeTraceability(
        root,
        withGlobs(["packages/*/tests/**/*.test.ts"]),
      );
      expect(uncovered(issues), "the story is annotated in a file the scan now reads").toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports the same tree when no configured glob names that directory", async () => {
    // The other direction of the same case. Coverage comes from the glob, not from reading
    // everywhere: `paths.testsDir` is `tests` and this tree has no `tests/e2e/` at the root.
    const root = await seedWorkspace("packages/pkg-a");
    try {
      const issues = await validateAtddCodeTraceability(root, withGlobs(["tests/**/*.test.ts"]));
      expect(uncovered(issues), "nothing configured names packages/pkg-a/tests").toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("expands the wildcard across every sibling package, not one of them", async () => {
    // The case a single value cannot answer. Two packages each hold one story's only annotation,
    // so a base that resolved `*` to one directory would leave the other story uncovered.
    const root = await seedWorkspace("packages/pkg-a");
    try {
      await mkdir(path.join(root, "packages", "pkg-b", "tests", "e2e"), { recursive: true });
      await writeFile(
        path.join(root, "packages", "pkg-b", "tests", "e2e", "second.test.ts"),
        "// QFAI:SPEC-0001:US-0002\nit('covers the second story', () => {});\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "02_User-stories.md"),
        [
          "# 02 User stories",
          "",
          "## US-0001: title",
          "- Parent: CAP-0001",
          "",
          "## US-0002: second",
          "- Parent: CAP-0001",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateAtddCodeTraceability(
        root,
        withGlobs(["packages/*/tests/**/*.test.ts"]),
      );
      expect(uncovered(issues), "both packages' annotations must be read").toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reads paths.testsDir when no glob names it", async () => {
    // The configured base is additive. A project that set `testsDir` and left the globs pointing
    // elsewhere is scanned exactly as it was before.
    const root = await seedWorkspace(".");
    try {
      const issues = await validateAtddCodeTraceability(
        root,
        withGlobs(["packages/*/tests/**/*.test.ts"]),
      );
      expect(uncovered(issues), "tests/e2e is still the first base").toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
