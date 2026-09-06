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
import { validateTestTodoStubs } from "../../src/core/validators/testTodoStubs.js";

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
