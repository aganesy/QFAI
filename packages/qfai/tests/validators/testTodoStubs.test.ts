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

  it("returns no issues when testFileGlobs is empty", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/a.test.ts",
      'import { it } from "vitest";\nit' + TODO + '("x");\n',
    );

    const issues = await validateTestTodoStubs(root, configWith({}, { testFileGlobs: [] }));
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

  it("is ignored in a Python docstring and comment, but not in the body", async () => {
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
