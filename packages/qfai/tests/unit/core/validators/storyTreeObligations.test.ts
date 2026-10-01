import { describe, expect, it } from "vitest";

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
