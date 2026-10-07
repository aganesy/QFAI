import { describe, expect, it } from "vitest";

import { parseCountedExampleAnnotations } from "../../../../src/core/storyTree/ids.js";
import { buildStoryTreeModel } from "../../../../src/core/storyTree/tree.js";
import { validateStoryTreeObligationsModel } from "../../../../src/core/validators/storyTreeObligations.js";

const specs = ".qfai/spec";
const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001`;
const files = new Map<string, string>([
  [`${specs}/02_business-flow/business-flow-0001/business-flow.md`, "# BF-0001: Checkout"],
  [`${story}/01_User-story.md`, "# US-0001-0001: Checkout"],
  [`${story}/02_Acceptance-Criteria.md`, "```gherkin\n# AC-0001-0001-01\nScenario: paid\n```"],
  [
    `${story}/03_Example.md`,
    "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | paid |",
  ],
  [`${specs}/decisions.md`, "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |"],
]);

function model(decisions?: string) {
  const entries = new Map(files);
  if (decisions) entries.set(`${specs}/decisions.md`, decisions);
  return buildStoryTreeModel(entries, { specsDir: specs, contractsDir: `${specs}/03_contract` });
}

// QFAI:EX-0004-0001-02
describe("story-tree test obligations", () => {
  it("requires BF in E2E and AC in integration or API", () => {
    const findings = validateStoryTreeObligationsModel(
      model(),
      [
        {
          file: "tests/integration/checkout.test.ts",
          kind: "integration",
          selectedForExample: true,
          content: `// ${["QFAI", "BF-0001"].join(":")}\n// ${["QFAI", "AC-0001-0001-01"].join(":")}`,
        },
      ],
      "atdd",
    );
    expect(
      findings.some((item) => item.message.includes("BF-0001") && item.message.includes("E2E")),
    ).toBe(true);
    expect(
      findings.some(
        (item) => item.message.includes("misplaced") && item.message.includes("BF-0001"),
      ),
    ).toBe(true);
    expect(
      findings.some(
        (item) => item.message.includes("AC-0001-0001-01") && item.message.includes("missing"),
      ),
    ).toBe(false);
  });

  it("requires EX in a configured test file and rejects an unknown annotation", () => {
    const findings = validateStoryTreeObligationsModel(
      model(),
      [
        {
          file: "tests/unit/checkout.test.ts",
          kind: null,
          selectedForExample: true,
          content: `// ${["QFAI", "EX-0001-0001-99"].join(":")}`,
        },
      ],
      "tdd",
    );
    expect(
      findings.some(
        (item) => item.message.includes("EX-0001-0001-01") && item.message.includes("missing"),
      ),
    ).toBe(true);
    expect(
      findings.some(
        (item) => item.code === "QFAI-STORY-008" && item.refs?.includes("EX-0001-0001-99"),
      ),
    ).toBe(true);
  });

  // QFAI:EX-0001-0056-14
  it("counts an EX annotation only directly before a test declaration", () => {
    const annotation = `// ${["QFAI", "EX-0001-0001-01"].join(":")}`;
    const missing = (content: string) =>
      validateStoryTreeObligationsModel(
        model(),
        [{ file: "tests/unit/checkout.test.ts", kind: null, selectedForExample: true, content }],
        "tdd",
      ).some((item) => item.code === "QFAI-STORY-006" && item.refs?.includes("EX-0001-0001-01"));

    const header = `${annotation}\nimport { it } from "vitest";\n\nit("pays", () => {});\n`;
    const inBody = `it("pays", () => {\n  ${annotation}\n  expect(1).toBe(1);\n});\n`;
    const beforeIt = `import { it } from "vitest";\n\n${annotation}\nit("pays", () => {});\n`;
    const beforeEach = `${annotation}\n// another comment\ndescribe.each([1])("%s", () => {});\n`;

    expect(missing(header)).toBe(true);
    expect(missing(inBody)).toBe(true);
    expect(missing(beforeIt)).toBe(false);
    expect(missing(beforeEach)).toBe(false);
  });

  // QFAI:EX-0001-0056-14
  it.each([
    ["a vitest call", "a.test.ts", "// {tag}\nit('pays', () => {});", true],
    ["a modified vitest call", "a.test.ts", "// {tag}\ntest.each([1])('%s', () => {});", true],
    ["a block comment line", "a.test.ts", "/* {tag} */\ndescribe.skip('pays', () => {});", true],
    [
      "a vitest call with type arguments",
      "a.test.ts",
      "// {tag}\nit.each<[string, (n: number) => void]>([])('%s', () => {});",
      true,
    ],
    ["a JSDoc line", "a.test.ts", "/**\n * {tag}\n */\nit('pays', () => {});", true],
    ["a Deno test call", "a.test.ts", "// {tag}\nDeno.test('pays', () => {});", true],
    [
      "a modified Deno test call",
      "a.test.ts",
      "// {tag}\nDeno.test.ignore('pays', () => {});",
      true,
    ],
    ["a QUnit test call", "a.test.js", "// {tag}\nQUnit.test('pays', () => {});", true],
    ["an RSpec block", "a_spec.rb", "# {tag}\nit('pays') do\nend", true],
    ["a Python test function", "test_a.py", "# {tag}\ndef test_pays():\n    pass", true],
    ["a Go test function", "a_test.go", "// {tag}\nfunc TestPays(t *testing.T) {}", true],
    [
      "a Go example with an output comment",
      "a_test.go",
      "// {tag}\nfunc ExamplePays() {\n\t// Output: paid\n}",
      true,
    ],
    ["a Gherkin scenario", "a.feature", "# {tag}\nScenario: pays", true],
    ["a Rust test attribute", "a.rs", "// {tag}\n#[test]\nfn pays() {}", true],
    ["a C# test attribute", "A.cs", "// {tag}\n[Fact]\npublic void Pays() {}", true],
    ["a JUnit test annotation", "A.java", "// {tag}\n@Test\nvoid pays() {}", true],
    [
      "a statement between the annotation and the test",
      "a.test.ts",
      "// {tag}\nsetup();\nit('pays', () => {});",
      false,
    ],
    [
      "code after a block comment on the same line",
      "a.test.ts",
      "/* {tag} */ setup();\nit('pays', () => {});",
      false,
    ],
    [
      "a decrement that starts with two dashes",
      "a.test.ts",
      "--{tag};\nit('pays', () => {});",
      false,
    ],
    [
      "a Go example with no output comment, which no runner executes",
      "a_test.go",
      "// {tag}\nfunc ExamplePays() {}",
      false,
    ],
    ["no declaration after the annotation", "a.test.ts", "// {tag}\nconst value = 1;", false],
    [
      "a pytest marker that may decorate a helper",
      "test_a.py",
      "# {tag}\n@pytest.mark.slow\ndef helper():\n    pass",
      false,
    ],
    [
      "an annotation and a declaration inside a template literal",
      "a.test.ts",
      "const sample = `\n// {tag}\ntest('pays', () => {});\n`;\nconst value = 1;",
      false,
    ],
    [
      "an annotation inside a template literal above a real declaration",
      "a.test.ts",
      "const sample = `\n// {tag}\n`;\nit('pays', () => {});",
      false,
    ],
    [
      "an annotation and a declaration inside a block comment",
      "a.test.ts",
      "/*\n// {tag}\nit('pays', () => {});\n*/\nconst value = 1;",
      false,
    ],
    [
      "an annotation inside a Python docstring",
      "test_a.py",
      '"""\n# {tag}\n"""\ndef test_pays():\n    pass',
      false,
    ],
    [
      "a string literal naming the annotation",
      "a.test.ts",
      "const note = '// {tag}';\nit('pays', () => {});",
      false,
    ],
    [
      "a test written after a template literal nested in a template literal",
      "a.test.ts",
      "const text = `a ${ok ? `b ${c}` : 'd'} e`;\n\n// {tag}\nit('pays', () => {});",
      true,
    ],
    ["a test class in a TypeScript file", "a.test.ts", "// {tag}\nclass TestOrder {}", true],
    ["a paren-less RSpec block", "a_spec.rb", "# {tag}\nit 'pays' do\nend", true],
    ["a Gherkin feature", "a.feature", "# {tag}\nFeature: Checkout", true],
  ] as const)("reads an annotation before %s", (_name, file, template, counted) => {
    const id = "EX-0001-0001-01";
    const tag = ["QFAI", id].join(":");
    expect(parseCountedExampleAnnotations(template.replaceAll("{tag}", tag), file)).toEqual(
      counted ? [id] : [],
    );
  });

  it("rejects an EX annotation in E2E and keeps its test obligation open", () => {
    const findings = validateStoryTreeObligationsModel(
      model(),
      [
        {
          file: "tests/e2e/checkout.test.ts",
          kind: "e2e",
          selectedForExample: true,
          content: `// ${["QFAI", "BF-0001"].join(":")}\n// ${["QFAI", "EX-0001-0001-01"].join(":")}`,
        },
      ],
      "tdd",
    );
    expect(
      findings.some(
        (item) => item.code === "QFAI-STORY-007" && item.refs?.includes("EX-0001-0001-01"),
      ),
    ).toBe(true);
    expect(
      findings.some(
        (item) => item.code === "QFAI-STORY-006" && item.refs?.includes("EX-0001-0001-01"),
      ),
    ).toBe(true);
  });

  it("applies a DONE exception only to its own item and emits an info finding", () => {
    const decisions =
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | Test exception: BF-0001 | Temporarily exempt | DONE |";
    const findings = validateStoryTreeObligationsModel(model(decisions), [], "atdd");
    expect(
      findings.some((item) => item.code === "QFAI-STORY-006" && item.refs?.includes("BF-0001")),
    ).toBe(false);
    expect(
      findings.some(
        (item) => item.code === "QFAI-STORY-006" && item.refs?.includes("AC-0001-0001-01"),
      ),
    ).toBe(true);
    expect(
      findings.some((item) => item.severity === "info" && item.message.includes("DEC-0001")),
    ).toBe(true);
  });

  it("does not let a WIP exception or an unknown exempted ID clear an obligation", () => {
    const decisions =
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | Test exception: BF-0001, AC-9999-0001-01 | Temporary | WIP |";
    const findings = validateStoryTreeObligationsModel(model(decisions), [], "atdd");
    expect(
      findings.some((item) => item.code === "QFAI-STORY-006" && item.refs?.includes("BF-0001")),
    ).toBe(true);
    expect(findings.some((item) => item.code === "QFAI-STORY-009")).toBe(false);
  });

  it("reports misplaced AC and unknown BF/AC annotations", () => {
    const findings = validateStoryTreeObligationsModel(
      model(),
      [
        {
          file: "tests/e2e/checkout.test.ts",
          kind: "e2e",
          selectedForExample: false,
          content: `// ${["QFAI", "BF-9999"].join(":")}\n// ${["QFAI", "AC-9999-0001-01"].join(":")}`,
        },
      ],
      "atdd",
    );
    expect(findings.filter((item) => item.code === "QFAI-STORY-008")).toHaveLength(2);
    expect(
      findings.some(
        (item) => item.code === "QFAI-STORY-007" && item.refs?.includes("AC-9999-0001-01"),
      ),
    ).toBe(true);
  });
});
