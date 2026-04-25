/**
 * Tests for the spec-0017 test-todo stub validator.
 *
 * QFAI:SPEC-0017:TC-0017-0028 — it.todo / test.todo / describe.todo detected
 * QFAI:SPEC-0017:TC-0017-0029 — opt-out via config flag works
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateTestTodoStubs } from "../../src/core/validators/testTodoStubs.js";

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

describe("spec-0017 validateTestTodoStubs", () => {
  // TC-0017-0028 — it.todo / test.todo / describe.todo detected
  it("emits QFAI-TEST-0001 for it.todo(...)", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/example.test.ts",
      [
        'import { describe, it } from "vitest";',
        "",
        'describe("feature", () => {',
        '  it.todo("not implemented yet");',
        "});",
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TEST-0001");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe("tests/example.test.ts:4");
    expect(issues[0]?.rule).toBe("testStrategy.forbidTodoStubs");
    expect(issues[0]?.message).toMatch(/it\.todo/);
    expect(issues[0]?.refs).toEqual(["it.todo"]);
  });

  it("emits QFAI-TEST-0001 for test.todo(...)", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/a.test.ts",
      ['import { test } from "vitest";', "", 'test.todo("later");', ""].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.refs).toEqual(["test.todo"]);
    expect(issues[0]?.file).toBe("tests/a.test.ts:3");
  });

  it("emits QFAI-TEST-0001 for describe.todo(...)", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/b.test.ts",
      ['import { describe } from "vitest";', "", 'describe.todo("missing suite");', ""].join("\n"),
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
        '  it.todo("stub 1");',
        '  test.todo("stub 2");',
        "});",
        "",
        'describe.todo("suite stub");',
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

  // TC-0017-0029 — opt-out via config flag works
  it("returns no issues when forbidTestTodoStubs is false", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/optout.test.ts",
      'import { it } from "vitest";\nit.todo("skip");\n',
    );

    const issues = await validateTestTodoStubs(root, configWith({ forbidTestTodoStubs: false }));
    expect(issues).toEqual([]);
  });

  it("returns no issues when testFileGlobs is empty", async () => {
    const root = await newTempDir();
    await writeTestFile(root, "tests/a.test.ts", 'import { it } from "vitest";\nit.todo("x");\n');

    const issues = await validateTestTodoStubs(root, configWith({}, { testFileGlobs: [] }));
    expect(issues).toEqual([]);
  });

  it("ignores files outside testFileGlobs", async () => {
    const root = await newTempDir();
    await writeTestFile(root, "src/outside.ts", 'export const x = "it.todo(\\"sample\\")";\n');

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues).toEqual([]);
  });

  it("respects testFileExcludeGlobs", async () => {
    const root = await newTempDir();
    await writeTestFile(
      root,
      "tests/excluded/a.test.ts",
      'import { it } from "vitest";\nit.todo("x");\n',
    );
    await writeTestFile(
      root,
      "tests/included/b.test.ts",
      'import { it } from "vitest";\nit.todo("y");\n',
    );

    const issues = await validateTestTodoStubs(
      root,
      configWith({}, { testFileExcludeGlobs: ["tests/excluded/**"] }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toBe("tests/included/b.test.ts:2");
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
        '  it.todo("first");',
        "",
        "",
        '  it.todo("second");',
        "});",
        "",
      ].join("\n"),
    );

    const issues = await validateTestTodoStubs(root, configWith());
    expect(issues.map((issue) => issue.file)).toEqual([
      "tests/lines.test.ts:6",
      "tests/lines.test.ts:9",
    ]);
  });
});
