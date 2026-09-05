/**
 * ATDD coverage could not tell an executable test from a list of IDs.
 *
 * Satisfaction is a text match over `tests/{e2e,api,integration}/**`, and
 * `STRUCTURAL_ANNOTATION_EXTENSIONS` deliberately widens the scan past code so
 * a Gherkin feature or a markdown annotation ledger can carry the ID. Nothing
 * then asked which kind of file the match came from, so a bullet list
 * discharged `QFAI-ATDD-111` / `-112` / `-113` / `-115` exactly as an
 * acceptance test did — and `missing: {us: [], tc: [], conApi: [], conDb: []}`
 * was the only thing the summary artifact said about it.
 *
 * The distinction is now reported, not enforced: markdown stays a legitimate
 * carrier, `QFAI-ATDD-119` (`info`) names the obligations that have nothing
 * else, and `coveredByCarrierOnly` puts the same partition in
 * `summary.json` so `qfai report` and the completion reviewer can gate on it.
 *
 * The carrier kind is read off the file body, not off its extension: a
 * `.feature` with a `Scenario:` is a test, and a `.test.ts` holding only the
 * annotation comment is the same ledger under a different name. Judged at
 * "a test is declared", which is where a text scan can stop being honest —
 * whether that test is skipped is not asked.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

type Project = {
  /** `US-*` ids declared in `02_User-stories.md`. */
  us?: string[];
  /** `TC-ID | Level` rows for `06_Test-Cases.md`. */
  tcs?: Array<{ id: string; level: string }>;
  /** Relative path -> file body, written verbatim under the project root. */
  files?: Record<string, string>;
};

async function withProject(project: Project, task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-carrier-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      ["# US", "", ...(project.us ?? []).map((id) => `## ${id}: story`), ""].join("\n"),
      "utf-8",
    );
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...(project.tcs ?? []).map(
          (tc) => `| ${tc.id} | ${tc.level} | AC-0001 | EX-0001 | s | e |`,
        ),
        "",
      ].join("\n"),
      "utf-8",
    );
    for (const [relative, body] of Object.entries(project.files ?? {})) {
      const file = path.join(root, ...relative.split("/"));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>): string[] =>
  issues.map((entry) => entry.code);

/** An annotated E2E test with a declaration a runner would collect. */
const EXECUTABLE_US_0001_TEST = [
  "// QFAI:SPEC-0001:US-0001",
  'it("serves the story", () => {',
  "  expect(true).toBe(true);",
  "});",
  "",
].join("\n");

describe("an annotation carrier is not an executable test", () => {
  it("names a US whose only carrier is a markdown bullet list", async () => {
    // The exact shape measured on qfai's own repository: one heading, one
    // bullet per ID, no runner construct anywhere in the file.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/qfai-traceability.md": "# QFAI E2E Traceability\n\n- QFAI:SPEC-0001:US-0001\n",
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const carrierOnly = issues.find((entry) => entry.code === "QFAI-ATDD-119");

        expect(carrierOnly?.severity).toBe("info");
        expect(carrierOnly?.refs).toEqual(["SPEC-0001:US-0001"]);
        // The old reading, still true and still not enough on its own.
        expect(codes(issues)).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("says nothing when an executable test carries the same annotation", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": EXECUTABLE_US_0001_TEST,
        },
      },
      async (root) => {
        const found = codes(await validateAtddCodeTraceability(root, defaultConfig));
        expect(found).not.toContain("QFAI-ATDD-119");
        expect(found).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("names a code-extension file that declares no test, so renaming the ledger changes nothing", async () => {
    // The loophole an extension check leaves open: the same bullet list saved
    // as `.test.ts` would clear both `missing` and `coveredByCarrierOnly`, and
    // the state this finding exists to name would be invisible again.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": "// QFAI:SPEC-0001:US-0001\n// TODO: write the test\n",
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const carrierOnly = issues.find((entry) => entry.code === "QFAI-ATDD-119");

        expect(carrierOnly?.refs).toEqual(["SPEC-0001:US-0001"]);
        expect(codes(issues)).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("counts a declared suite even when it is skipped, because skip state is not the claim", async () => {
    // `describe.skip` is a declaration a runner collects and reports. Calling
    // it prose would put this finding in the placeholder gate's territory and
    // promise an execution guarantee a text scan cannot make.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts":
            '// QFAI:SPEC-0001:US-0001\ndescribe.skip("US-0001", () => {});\n',
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("treats one executable carrier as enough, even beside a markdown one", async () => {
    // The partition is per obligation, not per file: a ledger listing every ID
    // must not turn a genuinely tested obligation into a finding.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/qfai-traceability.md": "- QFAI:SPEC-0001:US-0001\n",
          "tests/e2e/us-0001.test.ts": EXECUTABLE_US_0001_TEST,
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("reads a non-JS test declaration, so the check is not a JS-only rule", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/test_us_0001.py": "# QFAI:SPEC-0001:US-0001\ndef test_us_0001():\n    pass\n",
        },
      },
      async (root) => {
        const config = {
          ...defaultConfig,
          validation: {
            ...defaultConfig.validation,
            traceability: {
              ...defaultConfig.validation.traceability,
              testFileGlobs: ["tests/**/*.py"],
            },
          },
        };
        expect(codes(await validateAtddCodeTraceability(root, config))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("counts a Gherkin feature as code, because a runner executes it", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.feature":
            "Feature: story\n  # QFAI:SPEC-0001:US-0001\n  Scenario: it works\n",
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("does not read a declaration out of a comment, so a TODO is not a test", async () => {
    // The same loophole an extension check leaves open, reopened one level
    // down: matching the raw body let an annotation-only file mention the
    // shape it lacks and be counted for it.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            '// TODO: add test("serves the story", ...)',
            '/* describe("US-0001", () => {}) once the API lands */',
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("does not read a declaration out of a string literal either", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            "export const pending = \"it('serves the story')\";",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("does not count configuration and hook chains, which collect no test", async () => {
    // A Playwright file of fixtures and hooks runs nothing on its own, so
    // counting it would take every obligation in it out of the partition.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            "import { test } from '@playwright/test';",
            "test.describe.configure({ mode: 'parallel' });",
            "test.use({ locale: 'ja-JP' });",
            "test.beforeEach(async () => {});",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("still counts the modifier chains that do declare a suite", async () => {
    for (const declaration of [
      'test.describe.serial("US-0001", () => {});',
      'it.concurrent.each([1])("US-0001", () => {});',
      'Deno.test("US-0001", () => {});',
      'QUnit.test("US-0001", () => {});',
    ]) {
      await withProject(
        {
          us: ["US-0001"],
          files: {
            "tests/e2e/us-0001.test.ts": `// QFAI:SPEC-0001:US-0001\n${declaration}\n`,
          },
        },
        async (root) => {
          expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
            "QFAI-ATDD-119",
          );
        },
      );
    }
  });

  it("keeps reading code past a regex literal, whatever quoting it contains", async () => {
    // Blanking literals must not blank code: a backtick inside a regex would
    // open a template literal and swallow every line up to the next one,
    // turning a genuinely executable suite into a carrier-only finding.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            "const fence = /^\\s*```/;",
            'it("serves the story", () => {',
            '  expect(fence.test(1 / 2 + "```")).toBe(false);',
            "});",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("keeps reading code past a regex that follows a keyword, not only an operator", async () => {
    // `return` ends in an identifier character, so the character test alone
    // read the literal as division and let its backtick open a template.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            "function fence() {",
            "  return /^\\s*```/;",
            "}",
            'it("serves the story", () => {',
            "  expect(fence()).toBeInstanceOf(RegExp);",
            "});",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("does not count a container attribute or a bare pytest marker", async () => {
    // `[TestFixture]` and `@pytest.mark.integration` decorate a class or a
    // helper; neither names a unit the runner collects.
    for (const [file, body] of [
      ["tests/e2e/StoryFixture.cs", "[TestFixture]\npublic class StoryFixture { }\n"],
      ["tests/e2e/test_story.py", "@pytest.mark.integration\ndef make_client():\n    return 1\n"],
    ] as const) {
      await withProject(
        {
          us: ["US-0001"],
          files: { [file]: `// QFAI:SPEC-0001:US-0001\n${body}` },
        },
        async (root) => {
          const config = {
            ...defaultConfig,
            validation: {
              ...defaultConfig.validation,
              traceability: {
                ...defaultConfig.validation.traceability,
                testFileGlobs: ["tests/**/*.cs", "tests/**/*.py"],
              },
            },
          };
          const issues = await validateAtddCodeTraceability(root, config);
          expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
            "SPEC-0001:US-0001",
          ]);
        },
      );
    }
  });

  it("still counts the NUnit case attributes and a Go example function", async () => {
    for (const [file, body] of [
      ["tests/e2e/StoryTest.cs", '[TestCase("a")]\npublic void ServesTheStory(string s) { }\n'],
      [
        "tests/e2e/story_test.go",
        'func ExampleStory() {\n\tfmt.Println("ok")\n\t// Output: ok\n}\n',
      ],
    ] as const) {
      await withProject(
        {
          us: ["US-0001"],
          files: { [file]: `// QFAI:SPEC-0001:US-0001\n${body}` },
        },
        async (root) => {
          const config = {
            ...defaultConfig,
            validation: {
              ...defaultConfig.validation,
              traceability: {
                ...defaultConfig.validation.traceability,
                testFileGlobs: ["tests/**/*.cs", "tests/**/*.go"],
              },
            },
          };
          expect(codes(await validateAtddCodeTraceability(root, config))).not.toContain(
            "QFAI-ATDD-119",
          );
        },
      );
    }
  });

  it("takes a localised Gherkin dialect at its word rather than reporting it unwritten", async () => {
    // Cucumber resolves the keyword through `# language:`, and a keyword table
    // for every dialect is not this scan's job — so a non-English feature is
    // counted, which costs a finding rather than inventing one.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.feature": [
            "# language: ja",
            "機能: story",
            "  # QFAI:SPEC-0001:US-0001",
            "  シナリオ: 物語を返す",
            "    前提 ログイン済みの利用者",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("does not count a Gherkin Background as a scenario, because no runner collects it", async () => {
    // `Background:` is the preamble every scenario runs, so a feature holding
    // only one has nothing to execute the annotation against.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.feature": [
            "Feature: story",
            "  # QFAI:SPEC-0001:US-0001",
            "  Background:",
            "    Given a signed-in user",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("judges a .feature on scenarios alone, not on a call form read out of a step", async () => {
    // Dropping `Background` from the Gherkin pattern was not enough while the
    // xUnit call form still ran over the feature body: an ordinary step such as
    // `Given test(account) is open` matched `test(`, so a feature Cucumber
    // collects nothing from counted as executable.
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/us-0001.feature": [
            "Feature: story",
            "  # QFAI:SPEC-0001:US-0001",
            "  Background:",
            "    Given test(account) is open",
            "",
          ].join("\n"),
          // The over-correction pin: a feature that does declare a scenario is
          // still executable, steps and all.
          "tests/e2e/us-0002.feature": [
            "Feature: other story",
            "  # QFAI:SPEC-0001:US-0002",
            "  Background:",
            "    Given test(account) is open",
            "  Scenario: it works",
            "    Then the story is served",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("reads a Ruby test method declared without parentheses, as minitest collects it", async () => {
    // Ruby's parameter list is optional, so `def test_serves_story` is the
    // standard minitest form; requiring `(` reported a suite that does run as
    // unimplemented.
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/story_test.rb": [
            "# QFAI:SPEC-0001:US-0001",
            "class StoryTest < Minitest::Test",
            "  def test_serves_story",
            "    assert true",
            "  end",
            "end",
            "",
          ].join("\n"),
          // The over-correction pin: dropping the parentheses must not turn any
          // `def` into a declaration — a helper-only carrier is still prose.
          "tests/e2e/other_story_test.rb": [
            "# QFAI:SPEC-0001:US-0002",
            "class OtherStoryTest < Minitest::Test",
            "  def build_account",
            "    Account.new",
            "  end",
            "end",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const config = {
          ...defaultConfig,
          validation: {
            ...defaultConfig.validation,
            traceability: {
              ...defaultConfig.validation.traceability,
              testFileGlobs: ["tests/**/*.rb"],
            },
          },
        };
        const issues = await validateAtddCodeTraceability(root, config);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0002",
        ]);
      },
    );
  });

  it("reads JUnit 5's other collectable annotations, not only @Test", async () => {
    // A `@ParameterizedTest` method named `shouldServeTheStory` matches no
    // naming convention either, so missing the annotation reported a suite
    // the runner does execute as unimplemented.
    for (const annotation of ["@ParameterizedTest", "@RepeatedTest(3)", "@TestFactory"]) {
      await withProject(
        {
          us: ["US-0001"],
          files: {
            "tests/e2e/StoryTest.java": [
              "class StoryTest {",
              "  // QFAI:SPEC-0001:US-0001",
              `  ${annotation}`,
              "  void shouldServeTheStory() {}",
              "}",
              "",
            ].join("\n"),
          },
        },
        async (root) => {
          const config = {
            ...defaultConfig,
            validation: {
              ...defaultConfig.validation,
              traceability: {
                ...defaultConfig.validation.traceability,
                testFileGlobs: ["tests/**/*.java"],
              },
            },
          };
          expect(codes(await validateAtddCodeTraceability(root, config))).not.toContain(
            "QFAI-ATDD-119",
          );
        },
      );
    }
  });

  it("reads a carrier with its own language's forms, not with every language's", async () => {
    // One pattern set for every extension let PHPUnit's `test*` method
    // convention match a plain TypeScript helper named `testData`: a `.test.ts`
    // Vitest collects nothing from counted as executable and took its
    // obligation out of the partition.
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            "function testData() {",
            "  return { id: 1 };",
            "}",
            "",
          ].join("\n"),
          // The over-correction pin: the same convention, in the language that
          // owns it, still declares a test.
          "tests/e2e/StoryTest.php": [
            "<?php",
            "// QFAI:SPEC-0001:US-0002",
            "class StoryTest extends TestCase {",
            "  public function testServesTheStory() {}",
            "}",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const config = {
          ...defaultConfig,
          validation: {
            ...defaultConfig.validation,
            traceability: {
              ...defaultConfig.validation.traceability,
              testFileGlobs: ["tests/**/*.ts", "tests/**/*.php"],
            },
          },
        };
        const issues = await validateAtddCodeTraceability(root, config);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("counts a Go example only when an output comment makes it run", async () => {
    // `go doc testing`: an example with no output comment is compiled and never
    // executed, so the function on its own declares nothing a runner collects.
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/story_test.go": [
            "// QFAI:SPEC-0001:US-0001",
            "func ExampleStory() {",
            '\tfmt.Println("ok")',
            "}",
            "",
          ].join("\n"),
          // The over-correction pin: the same example, with the comment
          // `go test` needs before it runs one, is still executable.
          "tests/e2e/other_story_test.go": [
            "// QFAI:SPEC-0001:US-0002",
            "func ExampleOtherStory() {",
            '\tfmt.Println("ok")',
            "\t// Unordered output: ok",
            "}",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const config = {
          ...defaultConfig,
          validation: {
            ...defaultConfig.validation,
            traceability: {
              ...defaultConfig.validation.traceability,
              testFileGlobs: ["tests/**/*.go"],
            },
          },
        };
        const issues = await validateAtddCodeTraceability(root, config);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0001",
        ]);
      },
    );
  });

  it("reads a regex after a control statement's header as a literal, not as division", async () => {
    // A control header ends in `)`, which the character test read as the end of
    // a value — so the literal after it stayed unparsed and the backtick inside
    // opened a template that blanked the real declaration below.
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/us-0001.test.ts": [
            "// QFAI:SPEC-0001:US-0001",
            "function fence(enabled, value) {",
            "  if (enabled) /^\\s*```/.test(value);",
            "}",
            'it("serves the story", () => {',
            '  expect(fence(true, "x")).toBeUndefined();',
            "});",
            "",
          ].join("\n"),
          // The over-correction pin: a `)` that really does end a value still
          // divides, so the declaration beside it is not swallowed as a literal.
          "tests/e2e/us-0002.test.ts": [
            "// QFAI:SPEC-0001:US-0002",
            'const half = size(box) / 2; it("serves the other story", () => {}); const third = 9 / 3;',
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-119",
        );
      },
    );
  });

  it("reads Scenario Template as the Scenario Outline alias it is", async () => {
    // English Gherkin accepts `Scenario Template:` wherever it accepts
    // `Scenario Outline:`, and Cucumber collects the same scenarios from it.
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/us-0001.feature": [
            "Feature: story",
            "  # QFAI:SPEC-0001:US-0001",
            "  Scenario Template: it works for <role>",
            "    Then the story is served",
            "    Examples:",
            "      | role |",
            "      | user |",
            "",
          ].join("\n"),
          // The over-correction pin: a step that merely says the words is still
          // not a scenario declaration.
          "tests/e2e/us-0002.feature": [
            "Feature: other story",
            "  # QFAI:SPEC-0001:US-0002",
            "  Background:",
            "    Given a scenario template is on file",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-119")?.refs).toEqual([
          "SPEC-0001:US-0002",
        ]);
      },
    );
  });

  it("covers TC and CON-API on the same terms as US", async () => {
    await withProject(
      {
        tcs: [{ id: "TC-0001", level: "L3" }],
        files: {
          "tests/integration/qfai-traceability.md": "- QFAI:SPEC-0001:TC-0001\n",
          "tests/api/qfai-traceability.md": "- QFAI:CON-API-0001\n",
          ".qfai/contracts/api/orders.yaml":
            "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.1.0\npaths:\n  /orders:\n    get:\n      responses: {}\n",
        },
      },
      async (root) => {
        const result = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect(result.coveredByCarrierOnly.tc).toEqual(["SPEC-0001:TC-0001"]);
        expect(result.coveredByCarrierOnly.conApi).toEqual(["CON-API-0001"]);
        expect(result.missing.tc).toEqual([]);
        expect(result.missing.conApi).toEqual([]);
      },
    );
  });

  it("does not claim a Unit/Component TC, which owes no annotation at all", async () => {
    // `QFAI-ATDD-117` already owns L1/L2. Reporting them here too would name
    // the same TC under two exclusions with contradictory remedies.
    await withProject(
      {
        tcs: [{ id: "TC-0001", level: "L1" }],
        files: { "tests/integration/qfai-traceability.md": "- QFAI:SPEC-0001:TC-0001\n" },
      },
      async (root) => {
        const result = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect(result.coveredByCarrierOnly.tc).toEqual([]);
        expect(result.unitComponentTcIds).toEqual(["SPEC-0001:TC-0001"]);
      },
    );
  });

  it("persists the partition into the summary artifact, not only into the findings", async () => {
    // `missing: []` is what `qfai report`, the completion reviewer and
    // `qa-gatekeeper` read. Without a second field there, the finding exists
    // and every downstream consumer still sees "fully covered".
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/qfai-traceability.md": "- QFAI:SPEC-0001:US-0001\n",
          "tests/e2e/us-0002.test.ts": EXECUTABLE_US_0001_TEST.replace("US-0001", "US-0002"),
        },
      },
      async (root) => {
        await validateAtddCodeTraceability(root, defaultConfig);
        const parsed: unknown = JSON.parse(
          await readFile(
            path.join(root, ".qfai", "report", "atdd-traceability", "summary.json"),
            "utf-8",
          ),
        );
        expect(parsed).toMatchObject({
          missing: { us: [] },
          coveredByCarrierOnly: { us: ["SPEC-0001:US-0001"], tc: [], conApi: [], conDb: [] },
        });

        const markdown = await readFile(
          path.join(root, ".qfai", "report", "atdd-traceability", "summary.md"),
          "utf-8",
        );
        expect(markdown).toContain("## Covered By Annotation Carrier Only");
        expect(markdown).toContain("SPEC-0001:US-0001");
      },
    );
  });

  it("keeps a scoped run to its own spec's prose-only obligations", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: { "tests/e2e/qfai-traceability.md": "- QFAI:SPEC-0001:US-0001\n" },
      },
      async (root) => {
        const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
          specScope: new Set(["0002"]),
        });
        expect(codes(scoped)).not.toContain("QFAI-ATDD-119");
      },
    );
  });
});
