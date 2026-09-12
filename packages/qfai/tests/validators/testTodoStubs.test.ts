/**
 * Tests for the spec-0004 test-todo stub validator.
 *
 * QFAI:SPEC-0004:TC-0004-0006 — it.todo / test.todo / describe.todo detected
 * QFAI:SPEC-0004:TC-0004-0006 — opt-out via config flag works
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import {
  atddAcceptanceLayerFilter,
  atddAcceptanceTestGlobs,
} from "../../src/core/atddTraceability.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../../src/core/atdd/scaffold.js";
import { scaffoldPlaceholderScannedFilter } from "../../src/core/validators/scaffoldPlaceholder.js";
import {
  STUB_SOURCE_FILE_PATTERN,
  validateTestTodoStubs,
} from "../../src/core/validators/testTodoStubs.js";

// Source-level split of the `*.todo(` token so this validator's own test
// file does not false-positive when scanned by validateTestTodoStubs. The
// validator regex looks for `\b(it|test|describe)\.todo\s*\(` in the raw
// source text, so we keep the dot in a constant and reassemble the token
// at runtime; the on-disk fixture content is identical.
const TODO = ".todo";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-testtodo-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function configWith(
  overrides: Partial<QfaiConfig["validation"]["testStrategy"]> = {},
  traceabilityOverrides: Partial<QfaiConfig["validation"]["traceability"]> = {},
): QfaiConfig {
  return {
    ...defaultConfig,
    validation: {
      ...defaultConfig.validation,
      testStrategy: {
        ...defaultConfig.validation.testStrategy,
        ...overrides,
      },
      traceability: {
        ...defaultConfig.validation.traceability,
        testFileGlobs: ["tests/**/*.test.ts"],
        testFileExcludeGlobs: [],
        ...traceabilityOverrides,
      },
    },
  };
}

async function writeTestFile(root: string, relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(root, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

describe("spec-0004 validateTestTodoStubs", () => {
  // TC-0004-0006 — it.todo / test.todo / describe.todo detected
  it("emits QFAI-TEST-001 for it" + TODO + " stubs", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/example.test.ts",
      [
        'import { describe, it } from "vitest";',
        "",
        'describe("feature", () => {',
        "  it" + TODO + '("not implemented yet");',
        "});",
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TEST-001");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe("tests/example.test.ts");
    expect(issues[0]?.loc?.line).toBe(4);
    expect(issues[0]?.rule).toBe("validation.testStrategy.forbidTestTodoStubs");
    expect(issues[0]?.message).toMatch(/it\.todo/);
    expect(issues[0]?.refs).toEqual(["it.todo"]);
  });

  it("emits QFAI-TEST-001 for test" + TODO + " stubs", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/a.test.ts",
      ['import { test } from "vitest";', "", "test" + TODO + '("later");', ""].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.refs).toEqual(["test.todo"]);
    expect(issues[0]?.file).toBe("tests/a.test.ts");
    expect(issues[0]?.loc?.line).toBe(3);
  });

  it("emits QFAI-TEST-001 for describe" + TODO + " stubs", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/b.test.ts",
      ['import { describe } from "vitest";', "", "describe" + TODO + '("missing suite");', ""].join(
        "\n",
      ),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.refs).toEqual(["describe.todo"]);
  });

  it("emits one issue per stub when multiple stubs live in one file", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/multi.test.ts",
      [
        'import { describe, it, test } from "vitest";',
        "",
        'describe("feature", () => {',
        "  it" + TODO + '("stub 1");',
        "  test" + TODO + '("stub 2");',
        "});",
        "",
        "describe" + TODO + '("suite stub");',
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(3);
    const kinds = issues.map((issue) => issue.refs?.[0]).sort();
    expect(kinds).toEqual(["describe.todo", "it.todo", "test.todo"]);
  });

  it("returns no issues when no stubs are present", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/clean.test.ts",
      [
        'import { describe, it, expect } from "vitest";',
        "",
        'describe("feature", () => {',
        '  it("passes", () => {',
        "    expect(1 + 1).toBe(2);",
        "  });",
        "});",
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toEqual([]);
  });

  // TC-0004-0006 — opt-out via config flag works
  it("returns no issues when forbidTestTodoStubs is false", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/optout.test.ts",
      'import { it } from "vitest";\nit' + TODO + '("skip");\n',
    );

    const issues = await validateTestTodoStubs(root, configWith({ forbidTestTodoStubs: false }));
    expect(issues).toEqual([]);
  });

  // `qfai init` ships `testFileGlobs: []`, so this is the state every fresh
  // project starts in: no file is scanned and QFAI-TEST-001 cannot fire. The
  // run must say so rather than read as a clean stub scan.
  it("emits QFAI-TEST-002 instead of a clean result when testFileGlobs is empty", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/a.test.ts",
      'import { it } from "vitest";\nit' + TODO + '("x");\n',
    );

    const issues = await validateTestTodoStubs(root, configWith({}, { testFileGlobs: [] }));

    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TEST-002"]);
    const finding = issues[0];
    expect(finding?.severity).toBe("info");
    // The file to edit is qfai.config.yaml. Filing it against `root` would let
    // normalizeIssuePaths render it as `.`, blaming the repository root in
    // validate.json / annotations / report hotspots, and no path-scoped waiver
    // on qfai.config.yaml would match it.
    expect(finding?.file).toBe("qfai.config.yaml");
    expect(finding?.rule).toBe("validation.traceability.testFileGlobs");
    expect(finding?.message).toContain("validation.traceability.testFileGlobs");
    expect(finding?.suggested_action).toContain("qfai-configure");
  });

  // The config loader accepts a whitespace-only entry, and fast-glob matches
  // nothing for it. A raw-length check read that as configured, so the scan ran
  // over zero files and reported nothing at all — the same silent non-result as
  // the empty array, reached through a value that looks configured.
  it("emits QFAI-TEST-002 when testFileGlobs holds only blank entries", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/a.test.ts",
      'import { it } from "vitest";\nit' + TODO + '("x");\n',
    );

    const issues = await validateTestTodoStubs(
      root,
      configWith({}, { testFileGlobs: ["   ", ""] }),
    );

    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TEST-002"]);
    expect(issues[0]?.file).toBe("qfai.config.yaml");
  });

  it("stays silent about empty testFileGlobs when the stub gate is off", async () => {
    const root = await newTempDir();

    const issues = await validateTestTodoStubs(
      root,
      configWith({ forbidTestTodoStubs: false }, { testFileGlobs: [] }),
    );
    expect(issues).toEqual([]);
  });

  it("ignores files outside testFileGlobs", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "src/outside.ts",
      'export const x = "it' + TODO + '(\\"sample\\")";\n',
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toEqual([]);
  });

  it("respects testFileExcludeGlobs", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/excluded/a.test.ts",
      'import { it } from "vitest";\nit' + TODO + '("x");\n',
    );
    await writeTestFile(
      root,
      "tests/included/b.test.ts",
      'import { it } from "vitest";\nit' + TODO + '("y");\n',
    );

    const issues = await validateTestTodoStubs(
      root,
      configWith({}, { testFileExcludeGlobs: ["tests/excluded/**"] }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toBe("tests/included/b.test.ts");
    expect(issues[0]?.loc?.line).toBe(2);
  });

  it("reports line numbers per stub", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/lines.test.ts",
      [
        'import { describe, it } from "vitest";',
        "",
        "",
        'describe("suite", () => {',
        "",
        "  it" + TODO + '("first");',
        "",
        "",
        "  it" + TODO + '("second");',
        "});",
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues.map((issue) => issue.file)).toEqual([
      "tests/lines.test.ts",
      "tests/lines.test.ts",
    ]);
    expect(issues.map((issue) => issue.loc?.line)).toEqual([6, 9]);
  });
});

describe("a stub token that is not executing code", () => {
  // The detector is a line regex, so prose about a stub and a fixture string
  // holding one both read as an executing stub. That is a false `error` on the
  // one gate qfai has against unimplemented tests — and now that
  // `--profile atdd` runs it, an acceptance test that merely *describes* the
  // construct blocks a completion gate it has nothing to do with.
  it("is ignored in a line comment, a block comment and a string literal", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/prose.test.ts",
      [
        "// it" + TODO + '("described, not executed");',
        "/*",
        " * describe" + TODO + '("still not executed");',
        " */",
        'const sample = "it' + TODO + '(\\"quoted\\")";',
        "const template = `test" + TODO + '("interpolated")`;',
        'it("real", () => expect(sample).toBeTruthy());',
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toEqual([]);
  });

  it("does not hide a real stub sharing a line with a comment", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/mixed.test.ts",
      ["  it" + TODO + '("real stub"); // it' + TODO + '("only mentioned")', ""].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.loc?.line).toBe(1);
    expect(issues[0]?.refs).toEqual(["it.todo"]);
  });

  it("is ignored in a Python docstring and in a comment", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/test_prose.py",
      [
        '"""',
        "pytest.skip('documented, not executed')",
        '"""',
        "",
        "# pytest.skip('commented out')",
        "def test_a():",
        "    assert True",
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(
      root,
      configWith({}, { testFileGlobs: ["tests/**/*"] }),
    );
    expect(issues.map((issue) => issue.code)).toEqual([]);
  });

  it("does not let an unterminated quote swallow a later stub", async () => {
    // A single-line span must end at the line break: a stray apostrophe in a
    // test title would otherwise blank the rest of the file.
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/apostrophe.test.ts",
      ["const re = /don't/;", "it" + TODO + '("real stub");', ""].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.loc?.line).toBe(2);
  });
});

describe("the ATDD gate's file selection", () => {
  // The ATDD scan reads the project's own test globs as well as the three layer
  // directories under `paths.testsDir`, so a package's acceptance suite now
  // satisfies the coverage rules. The stub gate has to read the same files, or
  // a package test that never runs discharges an obligation and passes.
  const atddConfig = (globs: string[]): QfaiConfig => ({
    ...defaultConfig,
    validation: {
      ...defaultConfig.validation,
      traceability: {
        ...defaultConfig.validation.traceability,
        testFileGlobs: globs,
      },
    },
  });

  it("the ATDD gate reads a package's acceptance suite", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "packages/checkout/tests/integration/pay.test.ts",
      `it${TODO}("pays");\n`,
    );

    const issues = await validateTestTodoStubs(
      root,
      atddConfig(["packages/*/tests/**/*.test.ts"]),
      {
        globs: atddAcceptanceTestGlobs(
          root,
          atddConfig(["packages/*/tests/**/*.test.ts"]),
          "**/*.ts",
        ),
        fileFilter: atddAcceptanceLayerFilter(root, atddConfig(["packages/*/tests/**/*.test.ts"])),
      },
    );

    expect(issues.map((issue) => issue.code)).toContain("QFAI-TEST-001");
  });

  it("and leaves a package's unit suite to the gate that owns it", async () => {
    const root = await newTempDir();
    await writeTestFile(root, "packages/checkout/tests/unit/pure.test.ts", `it${TODO}("adds");\n`);

    const issues = await validateTestTodoStubs(
      root,
      atddConfig(["packages/*/tests/**/*.test.ts"]),
      {
        globs: atddAcceptanceTestGlobs(
          root,
          atddConfig(["packages/*/tests/**/*.test.ts"]),
          "**/*.ts",
        ),
        fileFilter: atddAcceptanceLayerFilter(root, atddConfig(["packages/*/tests/**/*.test.ts"])),
      },
    );

    // A unit test's stub is real and is somebody's problem. Blocking the ATDD
    // gate on it is the all-integration collapse in another form: the stage
    // owns three directories, and a stub outside them is not its finding.
    expect(issues.filter((issue) => issue.code === "QFAI-TEST-001")).toEqual([]);
  });

  // `D-SCAFFOLD-PLACEHOLDER` is what reports an unfilled skeleton, so this gate
  // stands aside for one — but only where that validator looks. It scans four
  // directories under `paths.testsDir`; this gate also reads a monorepo's
  // package-local acceptance suites, and a marked skeleton there was exempt
  // here and unseen by it.
  const scaffolded = (): string =>
    [`// ${SCAFFOLD_PLACEHOLDER_MARKER}`, "it.skip('TC-0001-0001: pays', () => {});", ""].join(
      "\n",
    );

  it("leaves a fixture an extension-broad project glob swept in", async () => {
    const root = await newTempDir();
    const config = atddConfig(["packages/*/tests/**/*"]);
    await writeTestFile(
      root,
      "packages/checkout/tests/integration/pay.test.ts",
      `it${TODO}("pays");\n`,
    );
    // A data file no stub dialect owns. Collected through the project's own
    // glob, it was reported as a language this validator cannot scan.
    await writeTestFile(root, "packages/checkout/tests/integration/data.json", "{}\n");

    const issues = await validateTestTodoStubs(root, config, {
      globs: atddAcceptanceTestGlobs(root, config, STUB_SOURCE_FILE_PATTERN),
      fileFilter: atddAcceptanceLayerFilter(root, config),
    });

    expect(issues.map((issue) => issue.code)).toContain("QFAI-TEST-001");
    expect(issues.filter((issue) => issue.code === "QFAI-TEST-002")).toEqual([]);
  });

  it("keeps an extension the project's globs name outright", async () => {
    const root = await newTempDir();
    const config = atddConfig(["packages/*/tests/**/*.zig"]);
    // A language this validator has no dialect for, named by the project. Drop
    // it and `QFAI-TEST-002` never fires, so a suite nothing can scan reads as
    // a clean one.
    await writeTestFile(root, "packages/checkout/tests/integration/pay.zig", 'test "pays" {}\n');

    const issues = await validateTestTodoStubs(root, config, {
      globs: atddAcceptanceTestGlobs(root, config, STUB_SOURCE_FILE_PATTERN),
      fileFilter: atddAcceptanceLayerFilter(root, config),
    });

    expect(issues.map((issue) => issue.code)).toContain("QFAI-TEST-002");
  });

  it("stands aside for a marked skeleton the placeholder validator scans", async () => {
    const root = await newTempDir();
    const config = atddConfig(["packages/*/tests/**/*.test.ts"]);
    await writeTestFile(root, "tests/integration/pay.test.ts", scaffolded());

    const issues = await validateTestTodoStubs(root, config, {
      globs: atddAcceptanceTestGlobs(root, config, "**/*.ts"),
      fileFilter: atddAcceptanceLayerFilter(root, config),
      placeholderScanned: scaffoldPlaceholderScannedFilter(root, config),
    });

    expect(issues.filter((issue) => issue.code === "QFAI-TEST-003")).toEqual([]);
  });

  it("reports a marked skeleton outside that scan rather than exempting it", async () => {
    const root = await newTempDir();
    const config = atddConfig(["packages/*/tests/**/*.test.ts"]);
    await writeTestFile(root, "packages/checkout/tests/integration/pay.test.ts", scaffolded());

    const issues = await validateTestTodoStubs(root, config, {
      globs: atddAcceptanceTestGlobs(root, config, "**/*.ts"),
      fileFilter: atddAcceptanceLayerFilter(root, config),
      placeholderScanned: scaffoldPlaceholderScannedFilter(root, config),
    });

    // Exempting it here would leave the file reported by neither validator, and
    // the ATDD gate green over a suite whose tests do not run.
    expect(issues.map((issue) => issue.code)).toContain("QFAI-TEST-003");
  });

  it("reports a marked file the placeholder validator's globs do not collect", async () => {
    const root = await newTempDir();
    const config = atddConfig(["packages/*/tests/**/*.test.ts"]);
    // `pay.ts` sits in a scanned directory and matches no scaffold basename
    // pattern, so `D-SCAFFOLD-PLACEHOLDER` never opens it. Standing aside on
    // the directory alone would leave the file reported by neither.
    await writeTestFile(root, "tests/integration/pay.ts", scaffolded());

    const issues = await validateTestTodoStubs(root, config, {
      globs: ["tests/integration/**/*.ts"],
      placeholderScanned: scaffoldPlaceholderScannedFilter(root, config),
    });

    expect(issues.map((issue) => issue.code)).toContain("QFAI-TEST-003");
  });
});
