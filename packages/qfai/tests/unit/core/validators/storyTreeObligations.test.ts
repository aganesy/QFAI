import { describe, expect, it, vi } from "vitest";

import * as storyTreeIds from "../../../../src/core/storyTree/ids.js";
import { buildStoryTreeModel } from "../../../../src/core/storyTree/tree.js";
import type { Issue } from "../../../../src/core/types.js";
import {
  validateStoryTreeObligationsModel,
  type StoryObligationProfile,
  type StoryTestFile,
} from "../../../../src/core/validators/storyTreeObligations.js";

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

function model(decisions?: string, examples?: string) {
  const entries = new Map(files);
  if (decisions) entries.set(`${specs}/decisions.md`, decisions);
  if (examples) entries.set(`${story}/03_Example.md`, examples);
  const decisionText = entries.get(`${specs}/decisions.md`);
  if (decisionText?.startsWith("|"))
    entries.set(`${specs}/decisions.md`, "# Decisions\n\n## Decisions\n\n" + decisionText);
  return buildStoryTreeModel(entries, { specsDir: specs, contractsDir: `${specs}/03_contract` });
}

function expectParsingWork(profile: StoryObligationProfile): void {
  const unitFile = "tests/unit/checkout.test.ts";
  const e2eFile = "tests/e2e/checkout.test.ts";
  const knownTag = ["QFAI", "EX-0001-0001-01"].join(":");
  const unknownTag = ["QFAI", "EX-0001-0001-99"].join(":");
  const attached = `// ${knownTag}\nit("pays", () => {});\n`;
  const unattached = `// ${knownTag}\nimport { it } from "vitest";\n\nit("pays", () => {});\n`;
  const missingBF: Issue = {
    code: "QFAI-STORY-006",
    severity: "error",
    category: "canonical",
    message: "BF-0001 is missing an E2E test annotation",
    file: `${specs}/02_business-flow/business-flow-0001/business-flow.md`,
    rule: "storyTree.testObligation",
    refs: ["BF-0001"],
  };
  const missingAC: Issue = {
    code: "QFAI-STORY-006",
    severity: "error",
    category: "canonical",
    message: "AC-0001-0001-01 is missing an integration or API test annotation",
    file: `${story}/02_Acceptance-Criteria.md`,
    rule: "storyTree.testObligation",
    refs: ["AC-0001-0001-01"],
  };
  const missingEX: Issue = {
    code: "QFAI-STORY-006",
    severity: "error",
    category: "canonical",
    message: "EX-0001-0001-01 is missing a test annotation",
    file: `${story}/03_Example.md`,
    rule: "storyTree.testObligation",
    refs: ["EX-0001-0001-01"],
  };
  const unknownEX: Issue = {
    code: "QFAI-STORY-008",
    severity: "error",
    category: "canonical",
    message: `Undeclared annotation EX-0001-0001-99 in ${unitFile}`,
    file: unitFile,
    rule: "storyTree.undeclaredAnnotation",
    refs: ["EX-0001-0001-99"],
  };
  const misplacedEX: Issue = {
    code: "QFAI-STORY-007",
    severity: "error",
    category: "canonical",
    message: `${knownTag} is misplaced in ${e2eFile}; EX requires a test outside E2E`,
    file: e2eFile,
    rule: "storyTree.misplacedAnnotation",
    refs: ["EX-0001-0001-01"],
  };
  const exemptEX: Issue = {
    code: "QFAI-STORY-009",
    severity: "info",
    category: "canonical",
    message: "EX-0001-0001-01 is exempted by DEC-0001",
    file: `${specs}/decisions.md`,
    rule: "storyTree.testException",
    refs: ["EX-0001-0001-01", "DEC-0001"],
  };
  const secondMissingEX: Issue = {
    ...missingEX,
    message: "EX-0001-0001-02 is missing a test annotation",
    refs: ["EX-0001-0001-02"],
  };
  const ordinary = model();
  const exception = model(
    "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n" +
      "| DEC-0001 | Test exception: EX-0001-0001-01, EX-0001-0001-99 | No test environment | DONE |\n",
    "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n" +
      "| EX-0001-0001-01 | AC-0001-0001-01 | paid |\n" +
      "| EX-0001-0001-02 | AC-0001-0001-01 | second payment |\n",
  );
  const selectedUnit: StoryTestFile = {
    file: unitFile,
    kind: null,
    selectedForExample: true,
    content: attached,
  };
  const scenarios: {
    name: string;
    test: StoryTestFile;
    tree: ReturnType<typeof model>;
    tddCalls: number;
    expected: Record<StoryObligationProfile, Issue[]>;
  }[] = [
    {
      name: "unknown EX remains diagnosed",
      test: { ...selectedUnit, content: `// ${unknownTag}\nit("pays", () => {});\n` },
      tree: ordinary,
      tddCalls: 1,
      expected: { atdd: [unknownEX, missingBF, missingAC], tdd: [unknownEX, missingEX] },
    },
    {
      name: "E2E EX remains misplaced and uncovered",
      test: { ...selectedUnit, file: e2eFile, kind: "e2e" },
      tree: ordinary,
      tddCalls: 0,
      expected: { atdd: [missingBF, missingAC], tdd: [misplacedEX, missingEX] },
    },
    {
      name: "unselected EX does not cover but unknown EX is still diagnosed",
      test: {
        ...selectedUnit,
        selectedForExample: false,
        content: `// ${knownTag}\n// ${unknownTag}\nit("pays", () => {});\n`,
      },
      tree: ordinary,
      tddCalls: 0,
      expected: { atdd: [unknownEX, missingBF, missingAC], tdd: [unknownEX, missingEX] },
    },
    {
      name: "a selected file with no EX leaves coverage open",
      test: { ...selectedUnit, content: 'it("pays", () => {});\n' },
      tree: ordinary,
      tddCalls: 0,
      expected: { atdd: [missingBF, missingAC], tdd: [missingEX] },
    },
    {
      name: "selected kind-null declaration covers its EX",
      test: selectedUnit,
      tree: ordinary,
      tddCalls: 1,
      expected: { atdd: [missingBF, missingAC], tdd: [] },
    },
    {
      name: "a header unattached to the declaration leaves EX uncovered",
      test: { ...selectedUnit, content: unattached },
      tree: ordinary,
      tddCalls: 1,
      expected: { atdd: [missingBF, missingAC], tdd: [missingEX] },
    },
    {
      name: "DONE exception exempts only its declared EX",
      test: { ...selectedUnit, content: unattached },
      tree: exception,
      tddCalls: 1,
      expected: { atdd: [exemptEX, missingBF, missingAC], tdd: [exemptEX, secondMissingEX] },
    },
  ];
  const countedParser = vi.spyOn(storyTreeIds, "parseCountedExampleAnnotations");
  try {
    for (const scenario of scenarios) {
      countedParser.mockClear();
      const findings = validateStoryTreeObligationsModel(scenario.tree, [scenario.test], profile);
      const calls = profile === "tdd" ? scenario.tddCalls : 0;
      expect(countedParser, `${profile}: ${scenario.name}`).toHaveBeenCalledTimes(calls);
      expect(countedParser.mock.calls, scenario.name).toEqual(
        calls === 1 ? [[scenario.test.content, scenario.test.file]] : [],
      );
      expect(findings, `${profile}: ${scenario.name}`).toEqual(scenario.expected[profile]);
    }
  } finally {
    countedParser.mockRestore();
  }
}

// QFAI:EX-0004-0001-02
describe("story-tree test obligations", () => {
  // QFAI:EX-0001-0056-05
  it("leaves counted EX parsing unused in ATDD while retaining every diagnostic", () => {
    expectParsingWork("atdd");
  });

  // QFAI:EX-0001-0056-03
  // QFAI:EX-0001-0056-05
  // QFAI:EX-0001-0056-07
  // QFAI:EX-0001-0056-14
  it("parses only selected non-E2E files with raw EX annotations in TDD", () => {
    expectParsingWork("tdd");
  });

  it.each([
    ["atdd", "BF-0001", "an E2E test"],
    ["atdd", "AC-0001-0001-01", "an integration or API test"],
    ["tdd", "EX-0001-0001-01", "a test"],
  ] as const)(
    "names the missing annotation for %s / %s in natural English",
    (profile, id, target) => {
      const findings = validateStoryTreeObligationsModel(model(), [], profile);
      const finding = findings.find(
        (item) => item.code === "QFAI-STORY-006" && item.refs?.includes(id),
      );
      expect(finding?.message).toBe(`${id} is missing ${target} annotation`);
    },
  );

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
    expect(
      storyTreeIds.parseCountedExampleAnnotations(template.replaceAll("{tag}", tag), file),
    ).toEqual(counted ? [id] : []);
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

describe.each([
  "DONE",
  "TODO",
  "WIP",
  "REJECTED",
  "SUPERSEDED (by DEC-0002)",
  "PARTLY SUPERSEDED (by DEC-0002)",
] as const)("test exceptions with Status %s", (status) => {
  // QFAI:EX-0001-0056-06
  // QFAI:EX-0001-0056-07
  it.each([
    ["BF-0001", "atdd"],
    ["AC-0001-0001-01", "atdd"],
    ["EX-0001-0001-01", "tdd"],
  ] as const)("exempts only %s at DONE under %s", (id, profile) => {
    const decisions =
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n" +
      `| DEC-0001 | Test exception: ${id} | No test environment | ${status} |\n` +
      "| DEC-0002 | Successor decision | Keep obligations | DONE |\n";
    const current = model(decisions);
    const findings = validateStoryTreeObligationsModel(current, [], profile);
    expect(
      findings.filter((finding) => finding.code === "QFAI-STORY-006" && finding.refs?.includes(id)),
    ).toEqual(
      status === "DONE" ? [] : [expect.objectContaining({ severity: "error", refs: [id] })],
    );
    expect(findings.filter((finding) => finding.code === "QFAI-STORY-009")).toEqual(
      status === "DONE"
        ? [expect.objectContaining({ severity: "info", refs: [id, "DEC-0001"] })]
        : [],
    );
    if (id === "BF-0001") {
      expect(findings).toContainEqual(
        expect.objectContaining({ code: "QFAI-STORY-006", refs: ["AC-0001-0001-01"] }),
      );
    }
    if (id !== "EX-0001-0001-01") {
      expect(validateStoryTreeObligationsModel(current, [], "tdd")).toContainEqual(
        expect.objectContaining({ code: "QFAI-STORY-006", refs: ["EX-0001-0001-01"] }),
      );
    }
  });
});

// QFAI:EX-0001-0056-07
it.each(["BF-9999", "AC-9999-0001-01", "EX-0001-0001-99"] as const)(
  "a DONE exception naming undefined %s exempts nothing",
  (id) => {
    const decisions =
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n" +
      `| DEC-0001 | Test exception: ${id} | No test environment | DONE |\n`;
    for (const profile of ["atdd", "tdd"] as const) {
      const findings = validateStoryTreeObligationsModel(model(decisions), [], profile);
      expect(findings.filter((finding) => finding.code === "QFAI-STORY-006")).toEqual(
        validateStoryTreeObligationsModel(model(), [], profile).filter(
          (finding) => finding.code === "QFAI-STORY-006",
        ),
      );
      expect(findings.filter((finding) => finding.code === "QFAI-STORY-009")).toEqual([]);
      expect(findings.some((finding) => finding.refs?.includes(id))).toBe(false);
    }
  },
);
